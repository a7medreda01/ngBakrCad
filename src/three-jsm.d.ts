// Three.js JSM module type declarations
// These are needed because @types/three doesn't include JSM example declarations
declare module 'three/examples/jsm/controls/OrbitControls.js' {
  export { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
}
declare module 'three/examples/jsm/loaders/STLLoader.js' {
  export { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
}
declare module 'three/examples/jsm/loaders/OBJLoader.js' {
  export { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
}
declare module 'three/examples/jsm/loaders/PLYLoader.js' {
  export { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
}
declare module 'three/examples/jsm/controls/OrbitControls' {
  import { Camera, EventDispatcher, MOUSE, TOUCH, Vector3 } from 'three';
  export class OrbitControls extends EventDispatcher {
    object: Camera;
    domElement: HTMLElement | Document;
    enabled: boolean;
    target: Vector3;
    minDistance: number;
    maxDistance: number;
    enableDamping: boolean;
    dampingFactor: number;
    constructor(object: Camera, domElement?: HTMLElement);
    update(): void;
    reset(): void;
    dispose(): void;
  }
}
declare module 'three/examples/jsm/loaders/STLLoader' {
  import { Loader, BufferGeometry } from 'three';
  export class STLLoader extends Loader {
    load(url: string, onLoad: (geometry: BufferGeometry) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void;
    parse(data: ArrayBuffer | string): BufferGeometry;
  }
}
declare module 'three/examples/jsm/loaders/OBJLoader' {
  import { Loader, Group } from 'three';
  export class OBJLoader extends Loader {
    load(url: string, onLoad: (group: Group) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void;
    parse(data: string): Group;
  }
}
declare module 'three/examples/jsm/loaders/PLYLoader' {
  import { Loader, BufferGeometry } from 'three';
  export class PLYLoader extends Loader {
    load(url: string, onLoad: (geometry: BufferGeometry) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void;
    parse(data: ArrayBuffer | string): BufferGeometry;
  }
}
