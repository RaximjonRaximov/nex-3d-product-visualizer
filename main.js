import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import JSZip from 'https://esm.sh/jszip@3.10.1';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// DOM refs
const canvas = document.getElementById('webgl');
const loaderEl = document.getElementById('loader');
const materialList = document.getElementById('materialList');
const materialPanel = document.getElementById('materialPanel');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const loadSampleBtn = document.getElementById('loadSample');
const autoRotateToggle = document.getElementById('autoRotate');
const showGridToggle = document.getElementById('showGrid');
const bloomToggle = document.getElementById('bloomToggle');
const presetList = document.getElementById('presetList');
const quickPresets = document.getElementById('quickPresets');
const resetCameraBtn = document.getElementById('resetCamera');
const takeScreenshotBtn = document.getElementById('takeScreenshot');
const toggleFullscreenBtn = document.getElementById('toggleFullscreen');
const resetModelBtn = document.getElementById('resetModel');
const viewportBadge = document.getElementById('viewportBadge');
const modelStats = document.getElementById('modelStats');
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');
const toastContainer = document.getElementById('toastContainer');

let scene, camera, renderer, composer, controls, gridHelper, floor;
let currentModel = null;
let materials = [];
let selectedMaterialIndex = 0;
let animationId;
let envMap;

// Lighting references
let ambient, dirLight, fillLight, rimLight, rectLightKey, rectLightFill;

// Init
function init() {
  scene = new THREE.Scene();
  scene.background = null;

  const viewport = document.getElementById('viewport');
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(3.2, 2.0, 4.5);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Environment
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;

  // RectAreaLight init
  RectAreaLightUniformsLib.init();

  setupLights('studio');

  // Post-processing
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.25, 0.4, 0.9);
  bloomPass.enabled = bloomToggle.checked;
  composer.addPass(bloomPass);
  renderer.bloomPass = bloomPass;

  // Controls
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0, 0);

  // Grid and floor (light theme)
  const gridSize = 12;
  gridHelper = new THREE.GridHelper(gridSize, gridSize, 0x94a3b8, 0xe2e8f0);
  gridHelper.position.y = -1.2;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.45;
  scene.add(gridHelper);

  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.1 });
  floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), shadowMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.2;
  floor.receiveShadow = true;
  scene.add(floor);

  setModel(createDefaultModel());

  animate();
  loaderEl.classList.add('hidden');
  updateViewportBadge('Studio');
}

function setupLights(preset) {
  // Remove old
  if (ambient) scene.remove(ambient);
  if (dirLight) scene.remove(dirLight);
  if (fillLight) scene.remove(fillLight);
  if (rimLight) scene.remove(rimLight);
  if (rectLightKey) scene.remove(rectLightKey);
  if (rectLightFill) scene.remove(rectLightFill);

  const settings = {
    studio: { ambient: 1.0, exposure: 1.0, dirColor: 0xffffff, dirInt: 1.3, fillColor: 0x38bdf8, fillInt: 0.5, rimColor: 0xf59e0b, rimInt: 0.4, bloom: 0.35 },
    warm: { ambient: 0.85, exposure: 1.05, dirColor: 0xffedd5, dirInt: 1.2, fillColor: 0xf97316, fillInt: 0.45, rimColor: 0xf59e0b, rimInt: 0.55, bloom: 0.4 },
    cool: { ambient: 1.0, exposure: 1.0, dirColor: 0xe0f2fe, dirInt: 1.3, fillColor: 0x60a5fa, fillInt: 0.5, rimColor: 0x22d3ee, rimInt: 0.45, bloom: 0.3 },
    dark: { ambient: 0.35, exposure: 1.15, dirColor: 0x94a3b8, dirInt: 0.8, fillColor: 0x1e293b, fillInt: 0.3, rimColor: 0xf59e0b, rimInt: 0.8, bloom: 0.55 }
  }[preset] || settings.studio;

  renderer.toneMappingExposure = settings.exposure;
  if (composer && renderer.bloomPass) renderer.bloomPass.strength = settings.bloom;

  ambient = new THREE.AmbientLight(settings.dirColor, settings.ambient);
  scene.add(ambient);

  dirLight = new THREE.DirectionalLight(settings.dirColor, settings.dirInt);
  dirLight.position.set(4, 6, 4);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.bias = -0.0001;
  scene.add(dirLight);

  fillLight = new THREE.PointLight(settings.fillColor, settings.fillInt);
  fillLight.position.set(-3, 2, -3);
  scene.add(fillLight);

  rimLight = new THREE.PointLight(settings.rimColor, settings.rimInt);
  rimLight.position.set(3, 3, -3);
  scene.add(rimLight);

  // Rect area strip lights for soft reflections
  rectLightKey = new THREE.RectAreaLight(settings.dirColor, 1.2, 3, 1);
  rectLightKey.position.set(0, 3, 3);
  rectLightKey.lookAt(0, 0, 0);
  scene.add(rectLightKey);

  rectLightFill = new THREE.RectAreaLight(settings.fillColor, 0.6, 2, 2);
  rectLightFill.position.set(-3, 1, 0);
  rectLightFill.lookAt(0, 0, 0);
  scene.add(rectLightFill);
}

function createDefaultModel() {
  const group = new THREE.Group();
  group.name = 'NEX Watch';

  const caseMat = new THREE.MeshPhysicalMaterial({
    color: 0xd1d5db,
    roughness: 0.25,
    metalness: 0.9,
    clearcoat: 0.6,
    name: 'Metall korpus'
  });

  const bezelMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    roughness: 0.12,
    metalness: 1.0,
    clearcoat: 0.85,
    name: 'Bezel'
  });

  const screenMat = new THREE.MeshPhysicalMaterial({
    color: 0x050505,
    roughness: 0.04,
    metalness: 0.3,
    clearcoat: 1.0,
    emissive: 0x0f172a,
    emissiveIntensity: 0.6,
    name: 'Ekran'
  });

  const strapMat = new THREE.MeshPhysicalMaterial({
    color: 0x1f2937,
    roughness: 0.85,
    metalness: 0.0,
    name: 'Remen'
  });

  const crownMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    roughness: 0.18,
    metalness: 0.95,
    name: 'Crown'
  });

  const buttonMat = new THREE.MeshPhysicalMaterial({
    color: 0x374151,
    roughness: 0.3,
    metalness: 0.6,
    name: 'Tugmalar'
  });

  // Case
  const caseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.18, 64), caseMat);
  caseMesh.rotation.x = Math.PI / 2;
  caseMesh.castShadow = true;
  caseMesh.receiveShadow = true;
  group.add(caseMesh);

  // Screen
  const screenMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.025, 64), screenMat);
  screenMesh.rotation.x = Math.PI / 2;
  screenMesh.position.z = 0.11;
  group.add(screenMesh);

  // Bezel ring
  const bezelMesh = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.045, 16, 120), bezelMat);
  bezelMesh.position.z = 0.01;
  bezelMesh.castShadow = true;
  group.add(bezelMesh);

  // Lugs
  const lugGeo = new THREE.BoxGeometry(0.35, 0.42, 0.1);
  const lugTop = new THREE.Mesh(lugGeo, caseMat);
  lugTop.position.set(0, 0.78, -0.06);
  lugTop.rotation.x = Math.PI / 14;
  lugTop.castShadow = true;
  group.add(lugTop);

  const lugBottom = new THREE.Mesh(lugGeo, caseMat);
  lugBottom.position.set(0, -0.78, -0.06);
  lugBottom.rotation.x = -Math.PI / 14;
  lugBottom.castShadow = true;
  group.add(lugBottom);

  // Strap
  const strapGeo = new THREE.CapsuleGeometry(0.18, 1.1, 4, 20);
  const strapTop = new THREE.Mesh(strapGeo, strapMat);
  strapTop.position.set(0, 1.45, -0.12);
  strapTop.scale.set(1.35, 1, 0.7);
  strapTop.castShadow = true;
  group.add(strapTop);

  const strapBottom = strapTop.clone();
  strapBottom.position.set(0, -1.45, -0.12);
  group.add(strapBottom);

  // Crown
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 32), crownMat);
  crown.rotation.z = Math.PI / 2;
  crown.position.set(0.64, 0.12, 0);
  crown.castShadow = true;
  group.add(crown);

  // Buttons
  const btnGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.09, 32);
  const btn1 = new THREE.Mesh(btnGeo, buttonMat);
  btn1.rotation.z = Math.PI / 2;
  btn1.position.set(0.64, -0.14, 0);
  group.add(btn1);

  const btn2 = new THREE.Mesh(btnGeo, buttonMat);
  btn2.rotation.z = Math.PI / 2;
  btn2.position.set(0.64, -0.32, 0);
  group.add(btn2);

  return group;
}

function upgradeToPhysical(material) {
  if (material instanceof THREE.MeshPhysicalMaterial) {
    material.name = material.name || 'Nomsiz material';
    fixMaterialTextures(material);
    return material;
  }

  const physical = new THREE.MeshPhysicalMaterial({ name: material.name || 'Nomsiz material' });

  // Safe property copy for any MeshMaterial
  const copyProps = [
    'map', 'normalMap', 'bumpMap', 'bumpScale', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'lightMap',
    'displacementMap', 'displacementScale', 'displacementBias',
    'opacity', 'transparent', 'side', 'visible', 'userData'
  ];
  copyProps.forEach(prop => {
    if (material[prop] !== undefined) physical[prop] = material[prop];
  });

  if (material.color) {
    physical.color = material.color.clone();
    // Avoid white-on-white default materials from OBJ/FBX without textures
    if (
      physical.color.getHex() === 0xffffff &&
      !physical.map &&
      (material instanceof THREE.MeshPhongMaterial || material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshBasicMaterial)
    ) {
      physical.color.set(0x475569);
    }
  }
  if (material.emissive) physical.emissive = material.emissive.clone();

  if (material.normalScale && material.normalScale.clone) {
    physical.normalScale = material.normalScale.clone();
  } else {
    physical.normalScale = new THREE.Vector2(1, 1);
  }

  physical.roughness = typeof material.roughness === 'number' ? material.roughness : 0.5;
  physical.metalness = typeof material.metalness === 'number' ? material.metalness : 0.1;

  // Transparency / transmission hints
  if (material.transmission !== undefined) physical.transmission = material.transmission;
  if (material.clearcoat !== undefined) physical.clearcoat = material.clearcoat;

  fixMaterialTextures(physical);
  return physical;
}

function fixMaterialTextures(material) {
  const srgbMaps = ['map', 'emissiveMap'];
  srgbMaps.forEach(key => {
    if (material[key] && material[key].isTexture) {
      material[key].colorSpace = THREE.SRGBColorSpace;
    }
  });
}

function setModel(model) {
  if (currentModel) {
    scene.remove(currentModel);
    disposeModel(currentModel);
  }

  currentModel = model;
  scene.add(model);

  // Center and scale
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim ? 2.2 / maxDim : 1;
  model.scale.setScalar(scale);
  model.position.sub(center.clone().multiplyScalar(scale));
  model.position.y += 0.1;

  // Floor alignment
  const bottom = box.min.y * scale + model.position.y;
  gridHelper.position.y = bottom - 0.05;
  floor.position.y = bottom - 0.05;

  collectMaterials(model);
  selectedMaterialIndex = 0;
  buildMaterialList();
  updateModelStats(model);
  toast('Mahsulot yuklandi: ' + (model.name || '3D model'), 'success');
}

function disposeModel(model) {
  model.traverse(child => {
    if (child.isMesh) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => {
        if (!m) return;
        Object.values(m).forEach(v => {
          if (v && typeof v.dispose === 'function') v.dispose();
        });
        if (m.dispose) m.dispose();
      });
    }
  });
}

function collectMaterials(model) {
  const materialMap = new Map();
  materials = [];

  model.traverse(child => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      const newMats = mats.map(mat => {
        if (!mat) return mat;
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
}

function updateModelStats(model) {
  let meshCount = 0, vertexCount = 0, triangleCount = 0;
  model.traverse(child => {
    if (child.isMesh && child.geometry) {
      meshCount++;
      const pos = child.geometry.attributes.position;
      if (pos) vertexCount += pos.count;
      if (child.geometry.index) {
        triangleCount += child.geometry.index.count / 3;
      } else {
        triangleCount += pos.count / 3;
      }
    }
  });

  modelStats.innerHTML = `
    <span><strong>Meshlar:</strong> ${meshCount}</span>
    <span><strong>Vertexlar:</strong> ${vertexCount.toLocaleString()}</span>
    <span><strong>Uchburchaklar:</strong> ${Math.floor(triangleCount).toLocaleString()}</span>
    <span><strong>Material:</strong> ${materials.length}</span>
  `;
}

function buildMaterialList() {
  materialList.innerHTML = '';

  if (materials.length === 0) {
    materialList.innerHTML = '<p class="empty-text">Material topilmadi.</p>';
    return;
  }

  materials.forEach((material, index) => {
    const card = document.createElement('div');
    card.className = `material-card ${index === selectedMaterialIndex ? 'selected' : ''}`;
    card.dataset.index = index;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-pressed', index === selectedMaterialIndex ? 'true' : 'false');
    card.setAttribute('aria-label', `Material ${material.name || index + 1}ni tanlash`);

    card.addEventListener('click', () => selectMaterial(index));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') selectMaterial(index);
    });

    const header = document.createElement('div');
    header.className = 'material-header';

    const name = document.createElement('span');
    name.className = 'material-name';
    name.textContent = material.name || `Material ${index + 1}`;

    const preview = document.createElement('div');
    preview.className = 'material-preview';
    preview.id = `mat-preview-${index}`;
    preview.style.backgroundColor = '#' + material.color.getHexString();

    header.appendChild(name);
    header.appendChild(preview);
    card.appendChild(header);

    const controls = document.createElement('div');
    controls.className = 'material-controls';

    controls.appendChild(createControlRow(
      createColorControl('Rang', material.color, (c) => {
        material.color.set(c);
        preview.style.backgroundColor = c;
      }),
      createRangeControl('Shaffoflik', 0, 1, 0.01, material.opacity, (v) => {
        material.opacity = v;
        material.transparent = v < 1;
        material.needsUpdate = true;
      })
    ));

    controls.appendChild(createControlRow(
      createRangeControl('Metallik', 0, 1, 0.01, material.metalness, (v) => { material.metalness = v; }),
      createRangeControl('Qoplama', 0, 1, 0.01, material.roughness, (v) => { material.roughness = v; })
    ));

    controls.appendChild(createControlRow(
      createRangeControl('Shisha effekti', 0, 1, 0.01, material.transmission || 0, (v) => { material.transmission = v; material.needsUpdate = true; }),
      createRangeControl('Ustki yorqinlik', 0, 1, 0.01, material.clearcoat || 0, (v) => { material.clearcoat = v; material.needsUpdate = true; })
    ));

    const textureMaps = [
      { key: 'map', label: 'Albedo', srgb: true },
      { key: 'normalMap', label: 'Normal' },
      { key: 'roughnessMap', label: 'Roughness' },
      { key: 'metalnessMap', label: 'Metalness' },
      { key: 'aoMap', label: 'AO' },
      { key: 'emissiveMap', label: 'Emissive', srgb: true },
      { key: 'alphaMap', label: 'Alpha' }
    ];

    const textureMapsEl = document.createElement('div');
    textureMapsEl.className = 'texture-maps';

    textureMaps.forEach(({ key, label, srgb }) => {
      const textureRow = document.createElement('div');
      textureRow.className = 'texture-row';

      const keyLabel = document.createElement('span');
      keyLabel.className = 'texture-key';
      keyLabel.textContent = label;

      const textureInput = document.createElement('input');
      textureInput.type = 'file';
      textureInput.accept = 'image/*';
      textureInput.id = `texture-${index}-${key}`;

      const hasTexture = !!material[key];
      const textureLabel = document.createElement('label');
      textureLabel.className = 'texture-label';
      textureLabel.htmlFor = textureInput.id;
      textureLabel.textContent = hasTexture ? (material[key].name || 'Yuklangan') : 'Yuklash';
      if (hasTexture) textureLabel.title = material[key].name || '';

      const removeBtn = document.createElement('button');
      removeBtn.className = 'texture-remove';
      removeBtn.textContent = 'X';
      if (hasTexture) removeBtn.classList.add('visible');
      removeBtn.setAttribute('aria-label', `${label} teksturani olib tashlash`);

      textureInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        new THREE.TextureLoader().load(url, (texture) => {
          texture.name = file.name;
          if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
          else texture.colorSpace = THREE.LinearSRGBColorSpace;
          if (key === 'normalMap' || key === 'alphaMap') {
            texture.colorSpace = THREE.NoColorSpace;
          }
          texture.needsUpdate = true;
          if (material[key]) material[key].dispose();
          material[key] = texture;
          material.needsUpdate = true;
          textureLabel.textContent = file.name;
          textureLabel.title = file.name;
          removeBtn.classList.add('visible');
          toast(`${label} tekstura qo‘llandi`, 'success');
        }, undefined, () => {
          toast(`${label} tekstura yuklanmadi`, 'error');
        });
      });

      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (material[key]) {
          material[key].dispose();
          material[key] = null;
          material.needsUpdate = true;
        }
        textureInput.value = '';
        textureLabel.textContent = 'Yuklash';
        textureLabel.title = '';
        removeBtn.classList.remove('visible');
        toast(`${label} tekstura olib tashlandi`, 'info');
      });

      textureRow.appendChild(keyLabel);
      textureRow.appendChild(textureInput);
      textureRow.appendChild(textureLabel);
      textureRow.appendChild(removeBtn);
      textureMapsEl.appendChild(textureRow);
    });

    controls.appendChild(textureMapsEl);

    card.appendChild(controls);
    materialList.appendChild(card);
  });

  // Store reference to preview elements for quick presets
  materialList._previews = materials.map((m, i) => ({
    material: m,
    preview: document.getElementById(`mat-preview-${i}`)
  }));
}

function createControlRow(left, right) {
  const row = document.createElement('div');
  row.className = 'control-row';
  row.appendChild(left);
  row.appendChild(right);
  return row;
}

function createColorControl(label, colorObj, onChange) {
  const group = document.createElement('div');
  group.className = 'control-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.type = 'color';
  input.value = '#' + colorObj.getHexString();
  input.addEventListener('input', (e) => onChange(e.target.value));

  group.appendChild(labelEl);
  group.appendChild(input);
  return group;
}

function createRangeControl(label, min, max, step, value, onChange) {
  const group = document.createElement('div');
  group.className = 'control-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  input.addEventListener('input', (e) => onChange(parseFloat(e.target.value)));

  group.appendChild(labelEl);
  group.appendChild(input);
  return group;
}

function selectMaterial(index) {
  selectedMaterialIndex = index;
  document.querySelectorAll('.material-card').forEach((card, i) => {
    card.classList.toggle('selected', i === index);
    card.setAttribute('aria-pressed', i === index ? 'true' : 'false');
  });
}

function applyQuickPreset(name) {
  const material = materials[selectedMaterialIndex];
  if (!material) {
    toast('Avval material tanlang', 'error');
    return;
  }

  const presets = {
    plastic: { color: 0xffffff, roughness: 0.6, metalness: 0, transmission: 0, clearcoat: 0.1, transparent: false, opacity: 1 },
    metal: { color: 0xc0c0c0, roughness: 0.15, metalness: 1, transmission: 0, clearcoat: 0.7, transparent: false, opacity: 1 },
    glass: { color: 0xa5f3fc, roughness: 0.05, metalness: 0, transmission: 0.9, clearcoat: 1, transparent: true, opacity: 0.85 },
    fabric: { color: 0x334155, roughness: 0.95, metalness: 0, transmission: 0, clearcoat: 0, transparent: false, opacity: 1 },
    carbon: { color: 0x111827, roughness: 0.35, metalness: 0.15, transmission: 0, clearcoat: 0.6, transparent: false, opacity: 1 }
  };

  const p = presets[name];
  if (!p) return;

  material.color.setHex(p.color);
  material.roughness = p.roughness;
  material.metalness = p.metalness;
  material.transmission = p.transmission;
  material.clearcoat = p.clearcoat;
  material.opacity = p.opacity;
  material.transparent = p.transparent;
  material.needsUpdate = true;

  // Rebuild UI to reflect changes
  buildMaterialList();
  toast(`${name[0].toUpperCase() + name.slice(1)} preset qo‘llandi`, 'success');
}

// File loading
const formatNames = {
  glb: 'GLB',
  gltf: 'GLTF',
  obj: 'OBJ',
  fbx: 'FBX',
  stl: 'STL',
  ply: 'PLY',
  dae: 'DAE',
  '3mf': '3MF'
};

const modelExtPriority = ['glb', 'gltf', 'obj', 'fbx', 'dae', '3mf', 'stl', 'ply'];

function getExt(filename) {
  return filename.split('.').pop().toLowerCase();
}

function getBasename(filename) {
  return filename.replace(/\\/g, '/').split('/').pop();
}

function fileNameWithoutExt(name) {
  const parts = name.split('.');
  parts.pop();
  return parts.join('.');
}

function geometryToGroup(geometry, format, modelFile) {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x475569,
    roughness: 0.5,
    metalness: 0.1,
    name: format.toUpperCase() + ' material'
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = fileNameWithoutExt(modelFile.name) || '3D model';
  group.userData.format = format;
  group.add(mesh);
  return group;
}

function normalizePath(p) {
  return decodeURIComponent(p).toLowerCase().replace(/\\/g, '/').replace(/^\.\/?/, '').replace(/^\//, '');
}

function createResourceManager(files) {
  const byPath = new Map();
  const byName = new Map();
  const urlCache = new Map();

  files.forEach(file => {
    const name = file.name || '';
    const relPath = file.webkitRelativePath || name;
    byName.set(getBasename(name).toLowerCase(), file);
    byPath.set(normalizePath(relPath), file);
    // Also allow matching without top-level folder
    const segments = normalizePath(relPath).split('/');
    if (segments.length > 1) {
      byPath.set(segments.slice(1).join('/'), file);
    }
  });

  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const clean = normalizePath(url).split('#')[0].split('?')[0];
    let file = byPath.get(clean) || byName.get(getBasename(clean).toLowerCase());
    if (!file && clean.includes('/')) {
      file = byName.get(getBasename(clean).toLowerCase());
    }
    if (file) {
      if (!urlCache.has(file)) urlCache.set(file, URL.createObjectURL(file));
      return urlCache.get(file);
    }
    return url;
  });

  return { manager, revokeAll: () => { urlCache.forEach(u => URL.revokeObjectURL(u)); urlCache.clear(); } };
}

function findModelFile(files) {
  const sorted = [...files].sort((a, b) => {
    const ai = modelExtPriority.indexOf(getExt(a.name));
    const bi = modelExtPriority.indexOf(getExt(b.name));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return sorted.find(f => modelExtPriority.includes(getExt(f.name))) || null;
}

function findFile(files, filename) {
  const target = getBasename(filename).toLowerCase();
  return files.find(f => f.name.toLowerCase() === filename.toLowerCase() ||
    getBasename(f.name).toLowerCase() === target ||
    normalizePath(f.webkitRelativePath || f.name) === normalizePath(filename));
}

async function unzipFile(zipFile) {
  const zip = await JSZip.loadAsync(zipFile);
  const files = [];
  await Promise.all(Object.entries(zip.files).map(async ([path, entry]) => {
    if (entry.dir) return;
    const blob = await entry.async('blob');
    const name = getBasename(path);
    const mime = name.endsWith('.png') ? 'image/png'
      : name.endsWith('.jpg') || name.endsWith('.jpeg') ? 'image/jpeg'
      : 'application/octet-stream';
    const file = new File([blob], name, { type: mime });
    file._zipPath = path; // preserve nested path for matching
    files.push(file);
  }));
  return files;
}

async function loadOBJ(objFile, files, manager, onDone, onError) {
  try {
    const objText = await objFile.text();
    const mtllibRegex = /^mtllib\s+(.+)$/gim;
    const mtllibs = [...objText.matchAll(mtllibRegex)].map(m => m[1].trim());

    let materialCreator = null;
    if (mtllibs.length) {
      const mtlFiles = mtllibs.map(name => findFile(files, name)).filter(Boolean);
      if (mtlFiles.length) {
        const mtlLoader = new MTLLoader(manager);
        const mtlTexts = await Promise.all(mtlFiles.map(f => f.text()));
        materialCreator = mtlLoader.parse(mtlTexts.join('\n'), '');
        if (materialCreator.preload) materialCreator.preload();
      }
    }

    const objLoader = new OBJLoader(manager);
    if (materialCreator) objLoader.setMaterials(materialCreator);
    const object = objLoader.parse(objText);
    onDone(object);
  } catch (err) {
    onError(err);
  }
}

async function handleFiles(files) {
  if (files.length === 0) return;

  if (files.length === 1 && getExt(files[0].name) === 'zip') {
    loaderEl.classList.remove('hidden');
    try {
      files = await unzipFile(files[0]);
      loaderEl.classList.add('hidden');
    } catch (err) {
      loaderEl.classList.add('hidden');
      toast('ZIP arxivni ochib bo‘lmadi: ' + (err?.message || ''), 'error');
      return;
    }
  }

  const modelFile = findModelFile(files);
  if (!modelFile) {
    toast('3D model fayli topilmadi. Iltimos, fayllarni yoki ZIP arxivni qayta yuklang.', 'error');
    return;
  }

  const ext = getExt(modelFile.name);
  const { manager } = createResourceManager(files);
  const modelUrl = URL.createObjectURL(modelFile);
  loaderEl.classList.remove('hidden');

  const onDone = (group) => {
    URL.revokeObjectURL(modelUrl);
    setModel(group);
    loaderEl.classList.add('hidden');
    toast(`${formatNames[ext] || ext.toUpperCase()} model yuklandi`, 'success');
  };

  const onError = (err) => {
    URL.revokeObjectURL(modelUrl);
    loaderEl.classList.add('hidden');
    toast('Faylni yuklab bo‘lmadi: ' + (err?.message || 'Noto‘g‘ri format'), 'error');
  };

  if (ext === 'glb' || ext === 'gltf') {
    new GLTFLoader(manager).load(modelUrl, (gltf) => onDone(gltf.scene), undefined, onError);
  } else if (ext === 'obj') {
    loadOBJ(modelFile, files, manager, onDone, onError);
  } else if (ext === 'fbx') {
    new FBXLoader(manager).load(modelUrl, (fbx) => onDone(fbx), undefined, onError);
  } else if (ext === 'stl') {
    new STLLoader(manager).load(modelUrl, (geometry) => onDone(geometryToGroup(geometry, 'stl', modelFile)), undefined, onError);
  } else if (ext === 'ply') {
    new PLYLoader(manager).load(modelUrl, (geometry) => onDone(geometryToGroup(geometry, 'ply', modelFile)), undefined, onError);
  } else if (ext === 'dae') {
    new ColladaLoader(manager).load(modelUrl, (collada) => onDone(collada.scene), undefined, onError);
  } else if (ext === '3mf') {
    new ThreeMFLoader(manager).load(modelUrl, (obj) => onDone(obj), undefined, onError);
  } else {
    URL.revokeObjectURL(modelUrl);
    loaderEl.classList.add('hidden');
    toast(`${ext.toUpperCase()} formati brauzerda qo‘llab-quvvatlanmaydi. Faylni GLB yoki FBX ga aylantiring.`, 'error');
  }
}

// UI events
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  handleFiles(Array.from(e.target.files));
});

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  handleFiles(Array.from(e.dataTransfer.files));
});

loadSampleBtn.addEventListener('click', () => {
  loaderEl.classList.remove('hidden');
  setTimeout(() => {
    setModel(createDefaultModel());
    loaderEl.classList.add('hidden');
  }, 300);
});

autoRotateToggle.addEventListener('change', (e) => { controls.autoRotate = e.target.checked; });
showGridToggle.addEventListener('change', (e) => {
  gridHelper.visible = e.target.checked;
  floor.visible = e.target.checked;
});
bloomToggle.addEventListener('change', (e) => {
  if (renderer.bloomPass) {
    renderer.bloomPass.enabled = e.target.checked;
  }
});

presetList.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const env = btn.dataset.env;
  setupLights(env);
  updateViewportBadge(env === 'studio' ? 'Studio' : env === 'warm' ? 'Issiq' : env === 'cool' ? 'Sovuq' : 'Tun');
  toast('Yoritgich presetsi o‘zgartirildi', 'info');
});

quickPresets.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  applyQuickPreset(btn.dataset.preset);
});

resetCameraBtn.addEventListener('click', () => {
  controls.reset();
  camera.position.set(3.2, 2.0, 4.5);
  controls.target.set(0, 0, 0);
  toast('Kamera tiklandi', 'info');
});

takeScreenshotBtn.addEventListener('click', () => {
  composer.render();
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = `nex-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

navToggle.addEventListener('click', () => {
  const open = !siteNav.classList.toggle('open');
  navToggle.classList.toggle('active', siteNav.classList.contains('open'));
  navToggle.setAttribute('aria-expanded', siteNav.classList.contains('open'));
});

siteNav.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    siteNav.classList.remove('open');
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Viewport badge
function updateViewportBadge(text) {
  viewportBadge.textContent = text;
}

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
  }, 3200);
}

// Resize
window.addEventListener('resize', () => {
  const viewport = document.getElementById('viewport');
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
});

// Animation
function animate() {
  animationId = requestAnimationFrame(animate);
  controls.update();
  composer.render();
}

// Start
init();
