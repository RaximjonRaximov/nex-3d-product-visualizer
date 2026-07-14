import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('webgl');
const loaderEl = document.getElementById('loader');
const materialList = document.getElementById('materialList');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const loadSampleBtn = document.getElementById('loadSample');
const autoRotateToggle = document.getElementById('autoRotate');
const showGridToggle = document.getElementById('showGrid');
const resetCameraBtn = document.getElementById('resetCamera');
const takeScreenshotBtn = document.getElementById('takeScreenshot');
const toggleFullscreenBtn = document.getElementById('toggleFullscreen');
const resetModelBtn = document.getElementById('resetModel');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const toastContainer = document.getElementById('toastContainer');

let scene, camera, renderer, controls, gridHelper, shadowPlane;
let currentModel = null;
let materials = [];
let animationId;

// Scene setup
scene = new THREE.Scene();
scene.background = null;

camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.set(4, 2.5, 5.5);

renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Environment
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 8, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.bias = -0.0001;
scene.add(dirLight);

const fillLight = new THREE.PointLight(0x38bdf8, 0.8);
fillLight.position.set(-4, 2, -4);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xf59e0b, 0.6);
rimLight.position.set(4, 3, -2);
scene.add(rimLight);

// Floor / grid
const gridSize = 20;
gridHelper = new THREE.GridHelper(gridSize, gridSize, 0xcbd5e1, 0xe2e8f0);
gridHelper.position.y = -1.55;
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.5;
scene.add(gridHelper);

const shadowMat = new THREE.ShadowMaterial({ opacity: 0.12 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), shadowMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.55;
floor.receiveShadow = true;
scene.add(floor);

// Controls
controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;
controls.minDistance = 2;
controls.maxDistance = 12;
controls.target.set(0, 0.2, 0);

// Default product model
function createDefaultModel() {
  const group = new THREE.Group();
  group.name = 'NEX Speaker';

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.1,
    clearcoat: 0.2,
    name: 'Korpus'
  });

  const grilleMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.05,
    name: 'Ustki panjara'
  });

  const ringMat = new THREE.MeshPhysicalMaterial({
    color: 0x94a3b8,
    roughness: 0.15,
    metalness: 0.9,
    clearcoat: 0.8,
    name: 'Metall halqa'
  });

  const baseMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.6,
    thickness: 1.2,
    transparent: true,
    opacity: 0.9,
    name: 'Akril taglik'
  });

  const buttonMat = new THREE.MeshPhysicalMaterial({
    color: 0x4f46e5,
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0x4f46e5,
    emissiveIntensity: 0.2,
    name: 'Tugmalar'
  });

  // Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 2.2, 64), bodyMat);
  body.position.y = 0.2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Top grille
  const grille = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.15, 64), grilleMat);
  grille.position.y = 1.35;
  grille.castShadow = true;
  group.add(grille);

  // Ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.04, 16, 100), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.65;
  ring.castShadow = true;
  group.add(ring);

  // Acrylic base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.25, 64), baseMat);
  base.position.y = -1.42;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Buttons
  const btnGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 32);
  const btn1 = new THREE.Mesh(btnGeo, buttonMat);
  btn1.position.set(0, 1.43, 0.5);
  group.add(btn1);

  const btn2 = new THREE.Mesh(btnGeo, buttonMat);
  btn2.position.set(0.25, 1.43, 0.42);
  group.add(btn2);

  const btn3 = new THREE.Mesh(btnGeo, buttonMat);
  btn3.position.set(-0.25, 1.43, 0.42);
  group.add(btn3);

  return group;
}

function upgradeToPhysical(material) {
  if (material instanceof THREE.MeshPhysicalMaterial) return material;
  const physical = new THREE.MeshPhysicalMaterial();
  physical.copy(material);
  physical.name = material.name || 'Nomsiz material';
  return physical;
}

function collectMaterials(model) {
  const materialMap = new Map();
  materials = [];

  model.traverse(child => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      const newMats = mats.map(mat => {
        if (!materialMap.has(mat)) {
          const physical = upgradeToPhysical(mat);
          materialMap.set(mat, physical);
          materials.push(physical);
        }
        return materialMap.get(mat);
      });
      child.material = Array.isArray(child.material) ? newMats : newMats[0];
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return materials;
}

function setModel(model) {
  if (currentModel) {
    scene.remove(currentModel);
    // Dispose old materials and geometries to avoid leaks
    currentModel.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {
          Object.values(m).forEach(v => {
            if (v && v.dispose) v.dispose();
          });
        });
      }
    });
  }

  currentModel = model;
  scene.add(model);

  // Center model
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2.5 / maxDim;
  model.scale.setScalar(scale);

  model.position.sub(center.clone().multiplyScalar(scale));
  model.position.y += 0.2;

  // Adjust grid floor
  const bottom = box.min.y * scale + model.position.y;
  gridHelper.position.y = bottom - 0.05;
  floor.position.y = bottom - 0.05;

  collectMaterials(model);
  buildMaterialList();
  toast('Mahsulot yuklandi. Materialni sozlash mumkin.', 'success');
}

function buildMaterialList() {
  materialList.innerHTML = '';

  if (materials.length === 0) {
    materialList.innerHTML = '<p class="empty-text">Mahsulot yuklang, materialni sozlash mumkin bo‘ladi.</p>';
    return;
  }

  materials.forEach((material, index) => {
    const card = document.createElement('div');
    card.className = 'material-card';

    const header = document.createElement('div');
    header.className = 'material-header';

    const name = document.createElement('span');
    name.className = 'material-name';
    name.textContent = material.name || `Material ${index + 1}`;

    const preview = document.createElement('div');
    preview.className = 'material-preview';
    preview.style.backgroundColor = '#' + material.color.getHexString();

    header.appendChild(name);
    header.appendChild(preview);
    card.appendChild(header);

    const row1 = document.createElement('div');
    row1.className = 'control-row';

    row1.appendChild(createControlGroup('Rang', 'color', material.color.getHexString(), (val) => {
      material.color.set(val);
      preview.style.backgroundColor = val;
    }));

    row1.appendChild(createControlGroup('Shaffoflik', 'range', material.opacity, (val) => {
      material.opacity = parseFloat(val);
      material.transparent = material.opacity < 1;
      material.needsUpdate = true;
    }, { min: 0, max: 1, step: 0.01 }));

    card.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = 'control-row';

    row2.appendChild(createControlGroup('Metallik', 'range', material.metalness, (val) => {
      material.metalness = parseFloat(val);
    }, { min: 0, max: 1, step: 0.01 }));

    row2.appendChild(createControlGroup('Qoplama', 'range', material.roughness, (val) => {
      material.roughness = parseFloat(val);
    }, { min: 0, max: 1, step: 0.01 }));

    card.appendChild(row2);

    const row3 = document.createElement('div');
    row3.className = 'control-row';

    row3.appendChild(createControlGroup('Shisha effekti', 'range', material.transmission || 0, (val) => {
      material.transmission = parseFloat(val);
      material.needsUpdate = true;
    }, { min: 0, max: 1, step: 0.01 }));

    row3.appendChild(createControlGroup('Ustki yorqinlik', 'range', material.clearcoat || 0, (val) => {
      material.clearcoat = parseFloat(val);
      material.needsUpdate = true;
    }, { min: 0, max: 1, step: 0.01 }));

    card.appendChild(row3);

    // Texture upload
    const textureRow = document.createElement('div');
    textureRow.className = 'texture-row';

    const textureInput = document.createElement('input');
    textureInput.type = 'file';
    textureInput.accept = 'image/*';
    textureInput.id = `texture-${index}`;

    const textureLabel = document.createElement('label');
    textureLabel.className = 'texture-label';
    textureLabel.htmlFor = textureInput.id;
    textureLabel.textContent = material.map ? 'Tekstura yuklangan' : 'Tekstura yuklash';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'texture-remove';
    removeBtn.textContent = 'O‘chirish';
    if (material.map) removeBtn.classList.add('visible');

    textureInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      new THREE.TextureLoader().load(url, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        if (material.map) material.map.dispose();
        material.map = texture;
        material.needsUpdate = true;
        textureLabel.textContent = file.name;
        removeBtn.classList.add('visible');
        toast('Tekstura qo‘llandi', 'success');
      }, undefined, () => {
        toast('Tekstura yuklanmadi', 'error');
      });
    });

    removeBtn.addEventListener('click', () => {
      if (material.map) {
        material.map.dispose();
        material.map = null;
        material.needsUpdate = true;
      }
      textureInput.value = '';
      textureLabel.textContent = 'Tekstura yuklash';
      removeBtn.classList.remove('visible');
      toast('Tekstura olib tashlandi', 'info');
    });

    textureRow.appendChild(textureInput);
    textureRow.appendChild(textureLabel);
    textureRow.appendChild(removeBtn);
    card.appendChild(textureRow);

    materialList.appendChild(card);
  });
}

function createControlGroup(label, type, value, onChange, opts = {}) {
  const group = document.createElement('div');
  group.className = 'control-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.type = type;
  if (type === 'range') {
    input.min = opts.min ?? 0;
    input.max = opts.max ?? 1;
    input.step = opts.step ?? 0.01;
    input.value = value;
  } else if (type === 'color') {
    input.value = value;
  }

  input.addEventListener('input', (e) => onChange(e.target.value));

  group.appendChild(labelEl);
  group.appendChild(input);
  return group;
}

// File loading
const gltfLoader = new GLTFLoader();

function loadFile(file) {
  const url = URL.createObjectURL(file);
  const isGltf = file.name.toLowerCase().endsWith('.gltf');

  loaderEl.classList.remove('hidden');

  gltfLoader.load(url, (gltf) => {
    URL.revokeObjectURL(url);
    setModel(gltf.scene);
    loaderEl.classList.add('hidden');
  }, undefined, (err) => {
    URL.revokeObjectURL(url);
    loaderEl.classList.add('hidden');
    toast('Faylni yuklab bo‘lmadi: ' + (err.message || 'Noto‘g‘ri format'), 'error');
  });
}

// UI events
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) loadFile(file);
});

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

loadSampleBtn.addEventListener('click', () => {
  loaderEl.classList.remove('hidden');
  setTimeout(() => {
    setModel(createDefaultModel());
    loaderEl.classList.add('hidden');
  }, 300);
});

autoRotateToggle.addEventListener('change', (e) => {
  controls.autoRotate = e.target.checked;
});

showGridToggle.addEventListener('change', (e) => {
  gridHelper.visible = e.target.checked;
  floor.visible = e.target.checked;
});

resetCameraBtn.addEventListener('click', () => {
  controls.reset();
  camera.position.set(4, 2.5, 5.5);
  controls.target.set(0, 0.2, 0);
  toast('Kamera tiklandi', 'info');
});

takeScreenshotBtn.addEventListener('click', () => {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = `nex-screenshot-${Date.now()}.png`;
  link.click();
  toast('Skrinshot yuklandi', 'success');
});

toggleFullscreenBtn.addEventListener('click', () => {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    el.requestFullscreen?.().then(() => toast('To‘liq ekran rejimi', 'info')).catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
});

resetModelBtn.addEventListener('click', () => {
  loadSampleBtn.click();
});

menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// Toast
function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// Resize
window.addEventListener('resize', () => {
  const wrapper = document.querySelector('.canvas-wrapper');
  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// Animation
function animate() {
  animationId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Start
function start() {
  const wrapper = document.querySelector('.canvas-wrapper');
  renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
  camera.aspect = wrapper.clientWidth / wrapper.clientHeight;
  camera.updateProjectionMatrix();

  setModel(createDefaultModel());
  loaderEl.classList.add('hidden');
  animate();
}

window.addEventListener('load', start);
if (document.readyState === 'complete') start();
