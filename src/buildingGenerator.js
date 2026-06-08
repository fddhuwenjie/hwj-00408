import * as THREE from 'three';

const FLOOR_HEIGHT = 3.5;
const WINDOW_SIZE = 1.5;
const WINDOW_GAP = 1.0;

const FACADE_STYLES = {
  glass: {
    name: '玻璃幕墙',
    color: 0x88b8d8,
    emissive: 0x224466,
    roughness: 0.1,
    metalness: 0.9,
    windowColor: 0xffffaa,
    windowEmissive: 0xffcc44
  },
  brick: {
    name: '砖块纹理',
    color: 0x8b4513,
    emissive: 0x000000,
    roughness: 0.9,
    metalness: 0.1,
    windowColor: 0xffffcc,
    windowEmissive: 0xffaa33
  },
  concrete: {
    name: '混凝土',
    color: 0x888888,
    emissive: 0x000000,
    roughness: 0.8,
    metalness: 0.0,
    windowColor: 0xffffee,
    windowEmissive: 0xffdd88
  }
};

const BUILDING_TYPES = ['商业楼', '办公楼', '住宅楼', '综合楼', '酒店'];

function createFacadeTexture(style, windowsX, windowsY, isNight) {
  const canvas = document.createElement('canvas');
  const width = 256;
  const height = 256;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const styleConfig = FACADE_STYLES[style];

  if (style === 'brick') {
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#6b3510';
    for (let y = 0; y < height; y += 16) {
      const offset = (y / 16) % 2 === 0 ? 0 : 16;
      for (let x = offset; x < width; x += 32) {
        ctx.fillRect(x, y, 30, 14);
      }
    }
  } else if (style === 'concrete') {
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const gray = 120 + Math.random() * 40;
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.fillRect(x, y, 2, 2);
    }
  } else {
    ctx.fillStyle = '#88b8d8';
    ctx.fillRect(0, 0, width, height);
  }

  const windowWidth = width / windowsX;
  const windowHeight = height / windowsY;

  for (let y = 0; y < windowsY; y++) {
    for (let x = 0; x < windowsX; x++) {
      const wx = x * windowWidth + 2;
      const wy = y * windowHeight + 2;
      const ww = windowWidth - 4;
      const wh = windowHeight - 4;

      const lit = isNight && Math.random() > 0.3;

      if (lit) {
        const brightness = 150 + Math.random() * 105;
        ctx.fillStyle = `rgb(${brightness}, ${brightness * 0.85}, ${brightness * 0.5})`;
        ctx.shadowColor = '#ffcc44';
        ctx.shadowBlur = 5;
      } else {
        if (style === 'glass') {
          ctx.fillStyle = '#4488aa';
        } else {
          ctx.fillStyle = '#334455';
        }
        ctx.shadowBlur = 0;
      }

      ctx.fillRect(wx, wy, ww, wh);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = style === 'glass' ? '#222222' : '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(wx, wy, ww, wh);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function generateFootprint(shape, baseWidth, baseDepth) {
  const points = [];
  const w = baseWidth;
  const d = baseDepth;

  switch (shape) {
    case 'rectangle':
      points.push(new THREE.Vector2(-w / 2, -d / 2));
      points.push(new THREE.Vector2(w / 2, -d / 2));
      points.push(new THREE.Vector2(w / 2, d / 2));
      points.push(new THREE.Vector2(-w / 2, d / 2));
      break;
    case 'L':
      points.push(new THREE.Vector2(-w / 2, -d / 2));
      points.push(new THREE.Vector2(w / 2, -d / 2));
      points.push(new THREE.Vector2(w / 2, -d / 6));
      points.push(new THREE.Vector2(-w / 6, -d / 6));
      points.push(new THREE.Vector2(-w / 6, d / 2));
      points.push(new THREE.Vector2(-w / 2, d / 2));
      break;
    case 'T':
      points.push(new THREE.Vector2(-w / 2, -d / 2));
      points.push(new THREE.Vector2(w / 2, -d / 2));
      points.push(new THREE.Vector2(w / 2, -d / 6));
      points.push(new THREE.Vector2(w / 6, -d / 6));
      points.push(new THREE.Vector2(w / 6, d / 2));
      points.push(new THREE.Vector2(-w / 6, d / 2));
      points.push(new THREE.Vector2(-w / 6, -d / 6));
      points.push(new THREE.Vector2(-w / 2, -d / 6));
      break;
  }

  return points;
}

function calculateFootprintArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

export function generateBuilding(params) {
  const {
    position = { x: 0, z: 0 },
    shape = 'rectangle',
    floors = 10,
    style = 'glass',
    baseWidth = 15,
    baseDepth = 15,
    isNight = false
  } = params;

  const group = new THREE.Group();
  const height = floors * FLOOR_HEIGHT;
  const footprintPoints = generateFootprint(shape, baseWidth, baseDepth);
  const footprintArea = calculateFootprintArea(footprintPoints);
  const windowsX = Math.max(3, Math.floor(baseWidth / (WINDOW_SIZE + WINDOW_GAP)));
  const windowsY = Math.max(1, Math.floor(FLOOR_HEIGHT / (WINDOW_SIZE + WINDOW_GAP)));

  const facadeTexture = createFacadeTexture(style, windowsX, windowsY, isNight);
  const roofTexture = createFacadeTexture('concrete', 4, 4, false);

  const styleConfig = FACADE_STYLES[style];

  const facadeMaterial = new THREE.MeshStandardMaterial({
    map: facadeTexture,
    color: styleConfig.color,
    emissive: styleConfig.emissive,
    roughness: styleConfig.roughness,
    metalness: styleConfig.metalness
  });

  const roofMaterial = new THREE.MeshStandardMaterial({
    map: roofTexture,
    color: 0x666666,
    roughness: 0.9,
    metalness: 0.1
  });

  const materials = [
    facadeMaterial,
    facadeMaterial,
    roofMaterial,
    roofMaterial,
    facadeMaterial,
    facadeMaterial
  ];

  const buildingShape = new THREE.Shape(footprintPoints);
  const extrudeSettings = {
    steps: 1,
    depth: height,
    bevelEnabled: false
  };

  const geometry = new THREE.ExtrudeGeometry(buildingShape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  const yOffset = -geometry.boundingBox.min.y;
  geometry.translate(0, yOffset, 0);

  const buildingMesh = new THREE.Mesh(geometry, materials);
  buildingMesh.position.y = 0;
  buildingMesh.castShadow = true;
  buildingMesh.receiveShadow = true;
  group.add(buildingMesh);

  const windowLights = [];
  if (isNight) {
    for (let floor = 0; floor < floors; floor++) {
      for (let x = 0; x < windowsX; x++) {
        for (let z = 0; z < windowsY; z++) {
          if (Math.random() > 0.7) {
            const lightColor = styleConfig.windowEmissive;
            const intensity = 0.5 + Math.random() * 0.5;
            const windowLight = new THREE.PointLight(lightColor, intensity, 8);
            
            const px = (x - windowsX / 2 + 0.5) * (WINDOW_SIZE + WINDOW_GAP);
            const py = floor * FLOOR_HEIGHT + z * (WINDOW_SIZE + WINDOW_GAP) + WINDOW_SIZE / 2 + 1;
            const pz = baseDepth / 2 - 0.5;
            
            windowLight.position.set(px, py, pz);
            windowLight.visible = isNight;
            group.add(windowLight);
            windowLights.push(windowLight);
          }
        }
      }
    }
  }

  if (floors > 20 && Math.random() > 0.5) {
    const antennaGeom = new THREE.CylinderGeometry(0.1, 0.1, 8, 8);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9 });
    const antenna = new THREE.Mesh(antennaGeom, antennaMat);
    antenna.position.y = height + 4;
    antenna.castShadow = true;
    group.add(antenna);

    const beaconLight = new THREE.PointLight(0xff0000, 1, 15);
    beaconLight.position.y = height + 8;
    beaconLight.visible = isNight;
    group.add(beaconLight);
    windowLights.push(beaconLight);
  }

  group.position.set(position.x, 0, position.z);

  const buildingData = {
    mesh: group,
    buildingMesh: buildingMesh,
    floors: floors,
    height: height,
    style: style,
    styleName: styleConfig.name,
    footprintArea: footprintArea,
    totalArea: footprintArea * floors,
    type: BUILDING_TYPES[Math.floor(Math.random() * BUILDING_TYPES.length)],
    windowLights: windowLights,
    position: { ...position }
  };

  buildingMesh.userData = { buildingData, type: 'building' };

  return buildingData;
}

export function updateBuildingNightMode(buildingData, isNight) {
  buildingData.windowLights.forEach(light => {
    light.visible = isNight;
  });
}

export { FACADE_STYLES, FLOOR_HEIGHT };
