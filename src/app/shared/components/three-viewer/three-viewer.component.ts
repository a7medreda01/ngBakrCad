import { Component, ElementRef, ViewChild, Input, OnChanges, SimpleChanges, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

@Component({
  selector: 'app-three-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './three-viewer.component.html',
  styleUrl: './three-viewer.component.scss'
})
export class ThreeViewerComponent implements OnChanges, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;
  
  @Input() fileUrl: string | null = null;
  @Input() fileType = 'stl';

  readonly isLoading = signal(false);
  readonly loadProgress = signal(0);
  readonly isWireframe = signal(false);
  readonly isMeasuring = signal(false);
  readonly measurementResult = signal<string | null>(null);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private currentMesh: THREE.Mesh | THREE.Group | null = null;
  private animationFrameId?: number;

  // Measurement tool state
  private measurementPoints: THREE.Vector3[] = [];
  private measurementMarkers: THREE.Mesh[] = [];
  private measurementLine: THREE.Line | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fileUrl']) {
      if (this.fileUrl) {
        if (!this.scene) {
          this.initThree();
        }
        this.loadModel();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer?.dispose();
    if (this.canvasContainer?.nativeElement) {
      this.canvasContainer.nativeElement.removeEventListener('click', this.onCanvasClick.bind(this));
    }
  }

  private initThree(): void {
    // If already initialized, just reset the camera and controls
    if (this.scene) {
      if (this.currentMesh) {
        this.scene.remove(this.currentMesh);
        this.currentMesh = null;
      }
      this.clearMeasurements();
      return;
    }

    const container = this.canvasContainer.nativeElement;
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xF5F6F8);

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

    // Lights
    const ambientLight = new THREE.AmbientLight(0x666666);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(1, 1, 1).normalize();
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x555555, 0.5);
    dirLight2.position.set(-1, -1, -1).normalize();
    this.scene.add(dirLight2);

    // Helper Grid
    const gridHelper = new THREE.GridHelper(200, 50, 0x2D8DB3, 0xE5E7EB);
    gridHelper.position.y = -50;
    this.scene.add(gridHelper);

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
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh = null;
    }
    this.clearMeasurements();

    const type = this.fileType.toLowerCase();

    if (type === 'stl') {
      const loader = new STLLoader();
      loader.load(
        this.fileUrl,
        (geometry: any) => {
          geometry.computeVertexNormals();
          const material = new THREE.MeshPhongMaterial({
            color: 0x90caf9,
            specular: 0x222222,
            shininess: 120,
            side: THREE.DoubleSide,
            wireframe: this.isWireframe()
          });
          const mesh = new THREE.Mesh(geometry, material);
          this.centerAndScaleMesh(mesh);
        },
        (xhr: any) => {
          if (xhr.total > 0) {
            this.loadProgress.set(Math.round((xhr.loaded / xhr.total) * 100));
          }
        },
        (err: any) => {
          console.error('فشل تحميل ملف STL:', err);
          this.isLoading.set(false);
        }
      );
    } else if (type === 'ply') {
      const loader = new PLYLoader();
      loader.load(
        this.fileUrl,
        (geometry: any) => {
          // PLY files often lack vertex normals; compute them for correct shading
          geometry.computeVertexNormals();
          const material = new THREE.MeshPhongMaterial({
            color: 0xa5d6a7,
            specular: 0x333333,
            shininess: 80,
            side: THREE.DoubleSide,
            wireframe: this.isWireframe()
          });
          const mesh = new THREE.Mesh(geometry, material);
          this.centerAndScaleMesh(mesh);
        },
        (xhr: any) => {
          if (xhr.total && xhr.total > 0) {
            this.loadProgress.set(Math.round((xhr.loaded / xhr.total) * 100));
          }
        },
        (err: any) => {
          console.error('فشل تحميل ملف PLY:', err);
          this.isLoading.set(false);
        }
      );
    } else if (type === 'obj') {
      const loader = new OBJLoader();
      loader.load(
        this.fileUrl,
        (object: any) => {
          object.traverse((child: any) => {
            if (child instanceof THREE.Mesh) {
              child.material = new THREE.MeshPhongMaterial({
                color: 0xffcc80,
                specular: 0x111111,
                shininess: 200,
                wireframe: this.isWireframe()
              });
            }
          });
          this.centerAndScaleMesh(object);
        },
        (xhr: any) => {
          if (xhr.total > 0) {
            this.loadProgress.set(Math.round((xhr.loaded / xhr.total) * 100));
          }
        },
        (err: any) => {
          console.error('فشل تحميل ملف OBJ:', err);
          this.isLoading.set(false);
        }
      );
    } else {
      console.error('نوع ملف غير مدعوم للمعاينة:', type);
      this.isLoading.set(false);
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
    this.currentMesh = mesh;
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
    if (this.currentMesh) {
      this.currentMesh.traverse((child: any) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
          child.material.wireframe = this.isWireframe();
        }
      });
    }
  }

  resetCamera(): void {
    if (this.controls) {
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
    if (!this.isMeasuring() || !this.currentMesh) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.currentMesh, true);

    if (intersects.length > 0) {
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