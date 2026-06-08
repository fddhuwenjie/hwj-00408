import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { generateCity, updateCityNightMode } from './cityLayout.js';
import { updateBuildingNightMode } from './buildingGenerator.js';
import { createDayNightSystem, updateDayNightSystem } from './dayNightSystem.js';
import { createTrafficSystem, generateVehicles, updateTraffic, updateTrafficNightMode } from './trafficSystem.js';
import { createMinimap } from './minimap.js';

const params = {
  cityRadius: 300,
  blockSize: 45,
  roadWidth: 10,
  buildingDensity: 0.9,
  avgHeight: 15,
  heightVariance: 15,
  greenRatio: 0.08,
  waterRatio: 0.06,
  timeOfDay: 0.3,
  autoTime: false,
  autoTimeSpeed: 0.02,
  vehicleCount: 100,
  vehicleSpeed: 1,
  regenerate: () => regenerateCity(),
  toggleBuildingInfo: () => {}
};

let scene, camera, renderer, controls;
let cityData, dayNightSystem, trafficSystem, minimap;
let raycaster, mouse;
let selectedBuilding = null;
let lastSelectedBuilding = null;

const clock = new THREE.Clock();

function init() {
  const container = document.getElementById('canvas-container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(300, 200, 300);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = 20;
  controls.maxDistance = 800;
  controls.target.set(0, 20, 0);

  dayNightSystem = createDayNightSystem(scene);
  dayNightSystem.scene = scene;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  setupGUI();
  setupEventListeners();
  regenerateCity();
  animate();
}

function setupGUI() {
  const gui = new GUI({ title: '城市生成器控制' });

  const cityFolder = gui.addFolder('城市参数');
  cityFolder.add(params, 'cityRadius', 100, 500, 10).name('城市半径').onChange(regenerateCity);
  cityFolder.add(params, 'blockSize', 40, 100, 5).name('街区大小').onChange(regenerateCity);
  cityFolder.add(params, 'roadWidth', 6, 24, 2).name('道路宽度').onChange(regenerateCity);
  cityFolder.add(params, 'buildingDensity', 0.1, 1.0, 0.05).name('建筑密度').onChange(regenerateCity);
  cityFolder.add(params, 'avgHeight', 1, 30, 1).name('平均高度').onChange(regenerateCity);
  cityFolder.add(params, 'heightVariance', 0, 25, 1).name('高度方差').onChange(regenerateCity);
  cityFolder.add(params, 'greenRatio', 0, 0.5, 0.01).name('绿化率').onChange(regenerateCity);
  cityFolder.add(params, 'waterRatio', 0, 0.3, 0.01).name('水域比例').onChange(regenerateCity);
  cityFolder.open();

  const timeFolder = gui.addFolder('时间控制');
  timeFolder.add(params, 'timeOfDay', 0, 1, 0.001).name('时间').listen();
  timeFolder.add(params, 'autoTime').name('自动时间');
  timeFolder.add(params, 'autoTimeSpeed', 0.001, 0.1, 0.001).name('时间速度');
  timeFolder.open();

  const trafficFolder = gui.addFolder('交通设置');
  trafficFolder.add(params, 'vehicleCount', 0, 200, 5).name('车辆数量').onChange(updateVehicles);
  trafficFolder.add(params, 'vehicleSpeed', 0.1, 3, 0.1).name('车速倍率').onChange(v => {
    if (trafficSystem) trafficSystem.speedMultiplier = v;
  });
  trafficFolder.open();

  gui.add(params, 'regenerate').name('重新生成城市');

  const info = gui.addFolder('操作说明');
  info.add({ info: '左键拖拽: 旋转视角' }, 'info').name('操作说明').disable();
  info.add({ info: '滚轮: 缩放' }, 'info').name('滚轮缩放').disable();
  info.add({ info: '右键拖拽: 平移' }, 'info').name('右键平移').disable();
  info.add({ info: '点击建筑: 查看信息' }, 'info').name('点击查看信息').disable();
  info.open();
}

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('click', onMouseClick);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const buildingMeshes = cityData.buildings.map(b => b.buildingMesh);
  const intersects = raycaster.intersectObjects(buildingMeshes, false);

  if (intersects.length > 0) {
    const buildingMesh = intersects[0].object;
    const buildingData = buildingMesh.userData.buildingData;
    
    if (buildingData) {
      showBuildingInfo(buildingData);
      highlightBuilding(buildingData);
    }
  } else {
    hideBuildingInfo();
    clearHighlight();
  }
}

function highlightBuilding(buildingData) {
  clearHighlight();
  selectedBuilding = buildingData;
  buildingData.buildingMesh.material.forEach(mat => {
    if (mat.emissive) {
      mat.emissive.setHex(0x4488ff);
      mat.emissiveIntensity = 0.3;
    }
  });
}

function clearHighlight() {
  if (lastSelectedBuilding) {
    lastSelectedBuilding.buildingMesh.material.forEach(mat => {
      if (mat.emissive) {
        const originalEmissive = mat.userData.originalEmissive || 0x000000;
        mat.emissive.setHex(originalEmissive);
        mat.emissiveIntensity = 1.0;
      }
    });
  }
  lastSelectedBuilding = selectedBuilding;
}

function showBuildingInfo(buildingData) {
  const infoPanel = document.getElementById('building-info');
  document.getElementById('info-title').textContent = `#${buildingData.type}`;
  document.getElementById('info-floors').textContent = buildingData.floors + ' 层';
  document.getElementById('info-height').textContent = buildingData.height.toFixed(1) + ' m';
  document.getElementById('info-area').textContent = buildingData.totalArea.toFixed(0) + ' m²';
  document.getElementById('info-type').textContent = buildingData.type;
  document.getElementById('info-style').textContent = buildingData.styleName;
  infoPanel.style.display = 'block';
}

function hideBuildingInfo() {
  document.getElementById('building-info').style.display = 'none';
}

function updateStats() {
  if (!cityData) return;
  document.getElementById('stat-buildings').textContent = cityData.stats.buildingCount;
  document.getElementById('stat-area').textContent = cityData.stats.totalArea.toFixed(0) + ' m²';
  document.getElementById('stat-avg-height').textContent = cityData.stats.avgHeight.toFixed(1) + ' m';
  document.getElementById('stat-max-height').textContent = cityData.stats.maxHeight.toFixed(1) + ' m';
}

function regenerateCity() {
  if (cityData && cityData.mesh) {
    scene.remove(cityData.mesh);
    clearHighlight();
    lastSelectedBuilding = null;
    selectedBuilding = null;
  }

  if (trafficSystem && trafficSystem.mesh) {
    scene.remove(trafficSystem.mesh);
  }

  const isNight = dayNightSystem ? dayNightSystem.isNight : false;

  cityData = generateCity({
    cityRadius: params.cityRadius,
    blockSize: params.blockSize,
    roadWidth: params.roadWidth,
    buildingDensity: params.buildingDensity,
    avgHeight: params.avgHeight,
    heightVariance: params.heightVariance,
    greenRatio: params.greenRatio,
    waterRatio: params.waterRatio,
    isNight: isNight
  });

  scene.add(cityData.mesh);

  trafficSystem = createTrafficSystem(cityData);
  trafficSystem.isNight = isNight;
  scene.add(trafficSystem.mesh);
  generateVehicles(trafficSystem, params.vehicleCount);

  minimap = createMinimap(camera, cityData, 'minimap-canvas');

  updateStats();

  controls.target.set(0, 20, 0);
  camera.position.set(params.cityRadius * 1.2, params.cityRadius * 0.8, params.cityRadius * 1.2);
  controls.maxDistance = params.cityRadius * 3;
}

function updateVehicles() {
  if (!trafficSystem) return;

  trafficSystem.vehicles.forEach(v => {
    trafficSystem.mesh.remove(v.mesh);
  });
  trafficSystem.vehicles = [];

  generateVehicles(trafficSystem, params.vehicleCount);
}

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  if (params.autoTime) {
    params.timeOfDay = (params.timeOfDay + params.autoTimeSpeed * deltaTime) % 1;
  }

  const dayNightResult = updateDayNightSystem(dayNightSystem, params.timeOfDay, params.cityRadius);

  if (dayNightResult.nightChanged && cityData) {
    updateCityNightMode(cityData, dayNightResult.isNight);
    cityData.buildings.forEach(b => updateBuildingNightMode(b, dayNightResult.isNight));
    if (trafficSystem) {
      updateTrafficNightMode(trafficSystem, dayNightResult.isNight);
    }
  }

  if (trafficSystem) {
    updateTraffic(trafficSystem, deltaTime);
  }

  if (minimap) {
    minimap.draw();
  }

  controls.update();
  renderer.render(scene, camera);
}

init();
