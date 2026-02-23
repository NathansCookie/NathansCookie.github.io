// hero-globe.js — Three.js loader for hero GLB model
console.log('hero-globe.js: Module loading...');

import * as THREE from 'https://esm.sh/three@0.154.0';
import { GLTFLoader } from 'https://esm.sh/three@0.154.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://esm.sh/three@0.154.0/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'https://esm.sh/three@0.154.0/examples/jsm/controls/OrbitControls.js';

console.log('hero-globe.js: Imports complete, initializing Three.js...');

const container = document.getElementById('three-root');
if (!container) throw new Error('three-root container not found');

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.domElement.style.display = 'block';
container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(0, 0, 4.5);

// Lighting
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(5, 10, 7.5);
scene.add(dir);

// Controls (allow drag-to-rotate, but keep auto-rotate on)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;
controls.enableDamping = true;

// Loaders
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
// Point to Draco CDN decoder
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
gltfLoader.setDRACOLoader(dracoLoader);

const MODEL_PATHS = [
  '3D assets/rotating_vector_globe.glb',
  '3D assets/rotating_vector_globe.gltf'
];

let modelRoot = null;

function setMaterialOptions(obj) {
  obj.traverse((c) => {
    if (c.isMesh) {
      if (c.material) {
        // ensure visibility on all renderers
        if (Array.isArray(c.material)) {
          c.material.forEach(m => { m.side = THREE.DoubleSide; m.needsUpdate = true; });
        } else {
          c.material.side = THREE.DoubleSide;
          c.material.needsUpdate = true;
        }
      }
    }
  });
}

function attemptLoad(index = 0) {
  if (index >= MODEL_PATHS.length) {
    console.warn('No GLB/GLTF model found; leaving fallback.');
    showFallback();
    return;
  }

  const path = encodeURI(MODEL_PATHS[index]);
  console.log('hero-globe: attempting to load', path);
  gltfLoader.load(path, (gltf) => {
    modelRoot = gltf.scene || gltf.scenes[0];
    if (!modelRoot) return showFallback();

    console.log('hero-globe: loaded model', path);

    // Inspect materials and repair/replace if textures missing
    modelRoot.traverse((node) => {
      if (!node.isMesh) return;
      const mat = node.material;
      const hasMap = !!(mat && (mat.map || mat.normalMap || mat.emissiveMap || mat.aoMap));
      console.log('hero-globe: mesh', node.name || node.uuid, 'materialType=', mat?.type, 'hasMap=', hasMap);

      // If the material has no color map, but contains a color, keep it but convert to standard
      try {
        const newMatProps = {};
        if (mat && mat.map) newMatProps.map = mat.map;
        if (mat && mat.normalMap) newMatProps.normalMap = mat.normalMap;
        if (mat && mat.emissiveMap) newMatProps.emissiveMap = mat.emissiveMap;
        if (mat && mat.color) newMatProps.color = mat.color.clone ? mat.color.clone() : new THREE.Color(0xffffff);
        // fallback roughness/metalness
        newMatProps.metalness = (mat && typeof mat.metalness === 'number') ? mat.metalness : 0.05;
        newMatProps.roughness = (mat && typeof mat.roughness === 'number') ? mat.roughness : 0.8;
        newMatProps.side = THREE.DoubleSide;

        // Create a MeshStandardMaterial so lighting and PBR behave predictably
        const replacement = new THREE.MeshStandardMaterial(newMatProps);
        node.material.dispose && node.material.dispose();
        node.material = replacement;
      } catch (e) {
        console.warn('hero-globe: material repair failed', e);
      }
    });

    setMaterialOptions(modelRoot);

    // center & scale nicely
    const box = new THREE.Box3().setFromObject(modelRoot);
    const size = box.getSize(new THREE.Vector3()).length();
    const target = 9; // visual target size (doubled)
    const s = (size > 0) ? (target / size) : 1;
    modelRoot.scale.setScalar(s);
    box.setFromObject(modelRoot);
    const center = box.getCenter(new THREE.Vector3());
    modelRoot.position.sub(center);

    scene.add(modelRoot);
  }, undefined, (err) => {
    const errMsg = err?.message || String(err) || 'Unknown error';
    console.error(`hero-globe: Model load FAILED for "${path}": ${errMsg}`);
    console.error('Full error:', err);
    attemptLoad(index + 1);
  });
}

function showFallback() {
  // fallback: show error message
  const msg = document.createElement('div');
  msg.className = 'error-message';
  msg.innerHTML = '⚠ Model failed to load<br><small>Check console for details</small>';
  container.appendChild(msg);
  console.error('hero-globe: No model loaded — showing fallback error');
}

function resize() {
  const rect = container.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

// Pointer interactions to pause auto-rotate
container.addEventListener('mouseenter', () => controls.autoRotate = false);
container.addEventListener('mouseleave', () => controls.autoRotate = true);

// Animation loop
const clock = new THREE.Clock();
function renderLoop() {
  requestAnimationFrame(renderLoop);
  controls.update();
  renderer.render(scene, camera);
}
renderLoop();

// Start loading
console.log('hero-globe.js: Starting model load attempt...');
attemptLoad();
console.log('hero-globe.js: Load initiated.');

export {};
