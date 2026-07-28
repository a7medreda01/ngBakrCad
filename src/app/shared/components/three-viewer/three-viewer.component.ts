import { Component, ElementRef, ViewChild, Input, OnChanges, SimpleChanges, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

export interface FileInput {
  url: string;
  type: string;
  label?: string;
  color?: number;
}

@Component({
  selector: 'app-three-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './three-viewer.component.html',
  styleUrl: './three-viewer.component.scss'
})
export class ThreeViewerComponent implements OnChanges, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;

  // Support both single file and multiple files
  @Input() fileUrl: string | null = null;
  @Input() fileType = 'stl';
  @Input() fileUrls: FileInput[] = [];  // New: array of files

  readonly isLoading = signal(false);
  readonly loadProgress = signal(0);
  readonly isWireframe = signal(false);
  readonly isMeasuring = signal(false);
  readonly measurementResult = signal<string | null>(null);
  readonly loadedFiles = signal<FileInput[]>([]);  // Track which files are loaded

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private loadedMeshes: Map<string, THREE.Mesh | THREE.Group> = new Map();  // Track multiple meshes
  private animationFrameId?: number;
  private headLight!: THREE.DirectionalLight; // follows the camera, see initThree/animate

  // Bumped every time a new load starts. Any async loader callback that
  // resolves after a newer load has already started checks this and
  // discards its result instead of touching the (already-replaced) scene.
  // This is what fixes: meshes silently missing, and isLoading getting
  // stuck true forever (which hides the canvas) when fileUrls changes
  // again while a previous batch is still in flight, or when one file in
  // a batch errors out.
  private loadGeneration = 0;

  // Measurement tool state
  private measurementPoints: THREE.Vector3[] = [];
  private measurementMarkers: THREE.Mesh[] = [];
  private measurementLine: THREE.Line | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  ngOnChanges(changes: SimpleChanges): void {
    // Handle new multi-file approach
    if (changes['fileUrls'] && this.fileUrls?.length > 0) {
      if (!this.scene) {
        this.initThree();
      }
      this.loadMultipleModels();
    }
    // Fallback to single file for backward compatibility
    else if (changes['fileUrl']) {
      if (this.fileUrl) {
        if (!this.scene) {
          this.initThree();
        }
        this.loadModel();
      }
    }
  }

  ngOnDestroy(): void {
    // Invalidate any in-flight loaders so they don't touch a destroyed scene.
    this.loadGeneration++;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    // Clean up all meshes
    this.loadedMeshes.forEach(mesh => {
      if (this.scene) {
        this.scene.remove(mesh);
      }
    });
    this.loadedMeshes.clear();
    this.renderer?.dispose();
    if (this.canvasContainer?.nativeElement) {
      this.canvasContainer.nativeElement.removeEventListener('click', this.onCanvasClick.bind(this));
    }
  }

  private initThree(): void {
    // If already initialized, just reset the camera and controls
    if (this.scene) {
      // Remove all loaded meshes
      this.loadedMeshes.forEach(mesh => {
        this.scene.remove(mesh);
      });
      this.loadedMeshes.clear();
      this.clearMeasurements();
      return;
    }

    const container = this.canvasContainer.nativeElement;

    // Scene — exocad webview uses a dark, slightly desaturated indigo backdrop
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x3a3268);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 0, 150);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    // Clear old canvases
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Lights — tuned for the warm gold/clay look of exocad webview.
    // A dominant key light creates strong contact shadows in the interdental
    // grooves, with soft fill/hemisphere light keeping shadows from going
    // fully black. Kept warm-neutral (no strong blue tint) so it doesn't
    // shift the gold base color of the material.
    // Ground color brightened from near-black to a warm mid-tone — this is
    // what lights any surface facing downward (e.g. the underside of the
    // arch when the camera is rotated to look up from below). With a dark
    // ground color those surfaces were receiving almost no light at all.
    const hemiLight = new THREE.HemisphereLight(0xfff3df, 0x4a3f66, 0.55);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff2da, 1.35);
    keyLight.position.set(60, 90, 110);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // Small, tight highlight light near the camera axis — this is what
    // produces the soft specular glints on the tooth cusps in the
    // reference render, rather than a fully matte surface.
    const specLight = new THREE.DirectionalLight(0xffffff, 0.4);
    specLight.position.set(10, 20, 140);
    this.scene.add(specLight);

    const fillLight = new THREE.DirectionalLight(0xffe9c4, 0.3);
    fillLight.position.set(-60, -10, 50);
    this.scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xfff6e6, 0.2);
    backLight.position.set(-20, 50, -90);
    this.scene.add(backLight);

    // Mirrors keyLight from below, so surfaces facing downward (visible
    // when the user rotates the model to view it from underneath) get a
    // proper key light too, instead of relying only on the dim hemisphere
    // ground contribution.
    const underLight = new THREE.DirectionalLight(0xfff2da, 0.7);
    underLight.position.set(-40, -90, 80);
    this.scene.add(underLight);

    // Headlight that always travels with the camera. Whatever surface is
    // currently facing the viewer is guaranteed to be lit, regardless of
    // how far the model is rotated — this is what actually fixes "dark
    // when viewed from underneath" for any orientation, not just the ones
    // the fixed lights above happen to cover. Updated every frame in
    // animate().
    this.headLight = new THREE.DirectionalLight(0xffffff, 0.55);
    this.scene.add(this.headLight);
    this.scene.add(this.headLight.target);

    // Ground reflection plane-like subtle ambient
    const planeGeo = new THREE.PlaneGeometry(1000, 1000);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const ground = new THREE.Mesh(planeGeo, planeMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -120;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Resize Listener
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Register click handler for measurements
    container.addEventListener('click', this.onCanvasClick.bind(this));

    this.animate();
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    if (this.controls) {
      this.controls.update();
    }

    // Keep the headlight glued to the camera so whatever surface is
    // currently facing the viewer is always lit, no matter which way the
    // model has been rotated (fixes dark undersides when viewing from
    // below).
    if (this.headLight && this.camera && this.controls) {
      this.headLight.position.copy(this.camera.position);
      this.headLight.target.position.copy(this.controls.target);
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private onWindowResize(): void {
    if (!this.canvasContainer) return;
    const container = this.canvasContainer.nativeElement;

    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private loadModel(): void {
    if (!this.fileUrl) return;

    this.isLoading.set(true);
    this.loadProgress.set(0);

    // Remove old model and measurements
    this.loadedMeshes.forEach(mesh => {
      this.scene.remove(mesh);
    });
    this.loadedMeshes.clear();
    this.clearMeasurements();

    const generation = ++this.loadGeneration;
    const type = this.fileType.toLowerCase();

    this.loadModelByType(this.fileUrl, type, ThreeViewerComponent.DEFAULT_COLORS[0], 'mesh-0', generation, () => {
      if (generation !== this.loadGeneration) return;
      this.fitCameraToAllMeshes();
      this.isLoading.set(false);
    });
  }

  private loadMultipleModels(): void {
    if (!this.fileUrls || this.fileUrls.length === 0) return;

    this.isLoading.set(true);
    this.loadProgress.set(0);

    // Remove old models and measurements
    this.loadedMeshes.forEach(mesh => {
      this.scene.remove(mesh);
    });
    this.loadedMeshes.clear();
    this.clearMeasurements();

    // Snapshot the generation + file list at call-time. Completion tracking
    // below relies ONLY on this local snapshot, never on `this.fileUrls`
    // (which may be replaced by Angular before these async loads resolve).
    const generation = ++this.loadGeneration;
    const filesToLoad = this.fileUrls;
    const expectedCount = filesToLoad.length;
    let settledCount = 0; // counts both successes AND failures

    const onOneSettled = () => {
      if (generation !== this.loadGeneration) return; // a newer load superseded this one
      settledCount++;
      if (settledCount >= expectedCount) {
        this.fitCameraToAllMeshes();
        this.isLoading.set(false);
      }
    };

    filesToLoad.forEach((file, index) => {
      // NOTE: file.color from the caller is intentionally ignored here.
      // Some callers of this component still pass an explicit `color`
      // per file (leftover from an earlier per-arch color scheme), which
      // was silently overriding our gold palette whenever fileUrls was
      // used instead of the single fileUrl input. We always want the
      // uniform exocad-style gold look, so the internal palette wins.
      const color = ThreeViewerComponent.DEFAULT_COLORS[index % ThreeViewerComponent.DEFAULT_COLORS.length];
      this.loadModelByType(file.url, file.type.toLowerCase(), color, `mesh-${index}`, generation, onOneSettled);
    });

    this.loadedFiles.set(filesToLoad);
  }

  // Warm gold/beige palette matching exocad webview's uniform scan color.
  // Kept as tight variants of the same hue (not per-arch colors) so upper
  // and lower jaws read as one continuous, uniformly toned model.
  private static readonly DEFAULT_COLORS = [0xE0C08A, 0xD9B87D, 0xE6CB96, 0xDCC28C, 0xE8D2A3];

  private loadModelByType(
    fileUrl: string,
    type: string,
    color: number,
    meshKey: string,
    generation: number,
    onSettled: () => void
  ): void {
    if (type === 'stl') {
      const loader = new STLLoader();
      loader.load(
        fileUrl,
        (geometry: any) => {
          geometry.computeVertexNormals();
          // Non-standard "color" binary STL variant (originally from
          // Magics) can carry a color per facet, which three's STLLoader
          // exposes as geometry.attributes.color, same as PLY. Use it when
          // present so the file shows its real captured color; otherwise
          // fall back to the uniform gold tone.
          const hasVertexColors = !!geometry.attributes?.color;
          const material = hasVertexColors
            ? this.createVertexColorMaterial()
            : this.createNaturalMaterial(color);
          const mesh = new THREE.Mesh(geometry, material);
          this.addMeshToScene(mesh, meshKey, generation, hasVertexColors);
          onSettled();
        },
        (xhr: any) => {
          if (generation === this.loadGeneration && xhr.total > 0) {
            this.loadProgress.set(Math.round((xhr.loaded / xhr.total) * 100));
          }
        },
        (err: any) => {
          console.error(`فشل تحميل ملف STL (${meshKey}):`, err);
          onSettled();
        }
      );
    } else if (type === 'ply') {
      const loader = new PLYLoader();
      loader.load(
        fileUrl,
        (geometry: any) => {
          geometry.computeVertexNormals();
          // exocad/intraoral-scanner PLY exports often carry a real captured
          // color per vertex (pink gum tissue, natural tooth shade, etc).
          // When that data is present we render it as-is instead of forcing
          // the uniform gold tone, so the model looks like the real scan.
          const hasVertexColors = !!geometry.attributes?.color;
          const material = hasVertexColors
            ? this.createVertexColorMaterial()
            : this.createNaturalMaterial(color);
          const mesh = new THREE.Mesh(geometry, material);
          this.addMeshToScene(mesh, meshKey, generation, hasVertexColors);
          onSettled();
        },
        (xhr: any) => {
          if (generation === this.loadGeneration && xhr.total && xhr.total > 0) {
            this.loadProgress.set(Math.round((xhr.loaded / xhr.total) * 100));
          }
        },
        (err: any) => {
          console.error(`فشل تحميل ملف PLY (${meshKey}):`, err);
          onSettled();
        }
      );
    } else if (type === 'obj') {
      const loader = new OBJLoader();
      loader.load(
        fileUrl,
        (object: any) => {
          object.traverse((child: any) => {
            if (child instanceof THREE.Mesh) {
              child.material = this.createNaturalMaterial(color);
            }
          });
          this.addMeshToScene(object, meshKey, generation);
          onSettled();
        },
        (xhr: any) => {
          if (generation === this.loadGeneration && xhr.total > 0) {
            this.loadProgress.set(Math.round((xhr.loaded / xhr.total) * 100));
          }
        },
        (err: any) => {
          console.error(`فشل تحميل ملف OBJ (${meshKey}):`, err);
          onSettled();
        }
      );
    } else {
      console.error(`نوع ملف غير مدعوم للمعاينة (${meshKey}):`, type);
      onSettled();
    }
  }

  // Matte clay-like finish: no clearcoat/sheen so light doesn't bloom into a
  // glossy/metallic look, but enough roughness + the strong key light (see
  // initThree) to carve out visible shadow in the interdental grooves,
  // matching the exocad webview render style.
  //
  // vertexColors is explicitly false: for files WITHOUT real captured
  // color data, some loaders can still attach a leftover/garbage color
  // attribute. We deliberately ignore it here so those files always
  // render in the uniform gold tone.
  private createNaturalMaterial(color: number): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color,
      vertexColors: false,
      roughness: 0.5,
      metalness: 0,
      // A thin, soft clearcoat — enough to catch a gentle highlight on the
      // tooth cusps like the reference image, without going glassy/plastic.
      clearcoat: 0.15,
      clearcoatRoughness: 0.3,
      reflectivity: 0.2,
      sheen: 0,
      side: THREE.DoubleSide,
      wireframe: this.isWireframe()
    });
  }

  // Used for PLY scans that carry real per-vertex color (natural tooth
  // shade + pink gum tissue, as captured by the intraoral scanner). Base
  // color stays white so the vertex colors show through unmodified; only
  // roughness/clearcoat are set to keep the same soft, slightly glossy
  // finish as the gold material.
  private createVertexColorMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.5,
      metalness: 0,
      clearcoat: 0.15,
      clearcoatRoughness: 0.3,
      reflectivity: 0.2,
      sheen: 0,
      side: THREE.DoubleSide,
      wireframe: this.isWireframe()
    });
  }

  private addMeshToScene(mesh: THREE.Mesh | THREE.Group, meshKey: string, generation: number, preserveVertexColors = false): void {
    // A newer load has already started (fileUrls changed again mid-flight) —
    // discard this stale result instead of adding it to the current scene.
    if (generation !== this.loadGeneration) {
      this.disposeMesh(mesh);
      return;
    }

    // Strip any embedded per-vertex color data for files that should render
    // in the uniform gold tone, so it can never visually override the solid
    // material color. Files explicitly loaded with real scan color
    // (preserveVertexColors) keep their color attribute intact.
    if (!preserveVertexColors) {
      mesh.traverse((child: any) => {
        if (child instanceof THREE.Mesh && child.geometry?.attributes?.color) {
          child.geometry.deleteAttribute('color');
        }
      });
      if ((mesh as any).geometry?.attributes?.color) {
        (mesh as any).geometry.deleteAttribute('color');
      }
    }

    this.scene.add(mesh);
    this.loadedMeshes.set(meshKey, mesh);
  }

  private disposeMesh(mesh: THREE.Mesh | THREE.Group): void {
    mesh.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }

  private fitCameraToAllMeshes(): void {
    if (this.loadedMeshes.size === 0) return;

    // Force world matrices to be current before measuring. Without this,
    // a mesh added to the scene and measured in the very same tick (before
    // any render has happened) can be measured against a stale/identity
    // matrix — this was the main cause of small STL files being framed
    // wrongly (and appearing to "not show") until the reset button forced
    // a recompute.
    this.scene.updateMatrixWorld(true);

    // Calculate bounding box for all meshes
    const allBox = new THREE.Box3();
    this.loadedMeshes.forEach(mesh => {
      const meshBox = new THREE.Box3().setFromObject(mesh);
      if (!meshBox.isEmpty()) {
        allBox.union(meshBox);
      }
    });

    if (allBox.isEmpty()) return;

    const size = new THREE.Vector3();
    allBox.getSize(size);
    const center = new THREE.Vector3();
    allBox.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    cameraZ *= 2.2;
    cameraZ = Math.max(cameraZ, 10);

    this.camera.near = Math.max(cameraZ / 100, 0.01);
    this.camera.far = cameraZ * 20;
    this.camera.updateProjectionMatrix();

    this.camera.position.set(center.x, center.y, center.z + cameraZ);
    this.camera.lookAt(center);

    if (this.controls) {
      this.controls.target.copy(center);
      this.controls.update();
    }
  }

  private centerAndScaleMesh(mesh: THREE.Mesh | THREE.Group): void {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // توسيط الموديل عند نقطة الأصل (0,0,0)
    mesh.position.sub(center);

    this.scene.add(mesh);
    this.loadedMeshes.set('single-mesh', mesh);
    this.isLoading.set(false);

    // ─── حساب صحيح لمسافة الكاميرا عشان الموديل يبان كامل جوه الفريم ───
    const maxDim = Math.max(size.x, size.y, size.z) || 1; // تحسبًا لقيمة صفرية
    const fov = this.camera.fov * (Math.PI / 180); // FOV بالـ Radians
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    cameraZ *= 1.8; // هامش إضافي حوالين الموديل
    cameraZ = Math.max(cameraZ, 10); // حد أدنى يمنع كاميرا قريبة جدًا

    // تحديث Near/Far planes ديناميكيًا عشان الموديل ميتقصش لو كبير أو صغير جدًا
    this.camera.near = Math.max(cameraZ / 100, 0.01);
    this.camera.far = cameraZ * 10;
    this.camera.updateProjectionMatrix();

    this.camera.position.set(0, 0, cameraZ);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    if (this.controls) {
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  toggleWireframe(): void {
    this.isWireframe.set(!this.isWireframe());
    this.loadedMeshes.forEach(mesh => {
      mesh.traverse((child: any) => {
        if (child instanceof THREE.Mesh && child.material) {
          child.material.wireframe = this.isWireframe();
        }
      });
    });
  }

  resetCamera(): void {
    // Recompute proper framing around whatever is actually loaded, rather
    // than just snapping back to the default (0,0,150) pose captured when
    // OrbitControls was constructed. This also acts as a manual recovery
    // path if a mesh was ever framed incorrectly on load.
    if (this.loadedMeshes.size > 0) {
      this.fitCameraToAllMeshes();
    } else if (this.controls) {
      this.controls.reset();
    }
  }

  toggleFullscreen(): void {
    const el = this.canvasContainer.nativeElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  toggleMeasuring(): void {
    this.isMeasuring.set(!this.isMeasuring());
    if (!this.isMeasuring()) {
      this.clearMeasurements();
    }
  }

  private onCanvasClick(event: MouseEvent): void {
    if (!this.isMeasuring()) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check intersection with all meshes
    let intersects: any[] = [];
    this.loadedMeshes.forEach(mesh => {
      const meshIntersects = this.raycaster.intersectObject(mesh, true);
      intersects = intersects.concat(meshIntersects);
    });

    if (intersects.length > 0) {
      // Sort by distance and get the closest
      intersects.sort((a, b) => a.distance - b.distance);
      const point = intersects[0].point;
      this.addMeasurementPoint(point);
    }
  }

  private addMeasurementPoint(point: THREE.Vector3): void {
    if (this.measurementPoints.length >= 2) {
      this.clearMeasurements();
    }

    this.measurementPoints.push(point);

    // Create marker sphere
    const markerGeom = new THREE.SphereGeometry(1.5, 32, 32);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xe11d48 });
    const marker = new THREE.Mesh(markerGeom, markerMat);
    marker.position.copy(point);
    this.scene.add(marker);
    this.measurementMarkers.push(marker);

    if (this.measurementPoints.length === 2) {
      // Draw line between points
      const points = [this.measurementPoints[0], this.measurementPoints[1]];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xe11d48, linewidth: 2 });
      this.measurementLine = new THREE.Line(lineGeom, lineMat);
      this.scene.add(this.measurementLine);

      // Calculate distance
      const distance = this.measurementPoints[0].distanceTo(this.measurementPoints[1]);
      this.measurementResult.set(`${distance.toFixed(2)} mm`);
    } else {
      this.measurementResult.set(null);
    }
  }

  clearMeasurements(): void {
    this.measurementPoints = [];
    this.measurementMarkers.forEach(m => this.scene.remove(m));
    this.measurementMarkers = [];
    if (this.measurementLine) {
      this.scene.remove(this.measurementLine);
      this.measurementLine = null;
    }
    this.measurementResult.set(null);
  }

  downloadFile(): void {
    if (this.fileUrl) {
      const link = document.createElement('a');
      link.href = this.fileUrl;
      link.download = `cad-design-${Date.now()}.${this.fileType}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}