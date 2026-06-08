import * as THREE from 'three';
import { generateBuilding } from './buildingGenerator.js';

function createRoadMesh(width, depth) {
  const geometry = new THREE.PlaneGeometry(width, depth);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#333333';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#222222';
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillRect(x, y, 3, 3);
  }

  ctx.fillStyle = '#ffffff';
  const dashWidth = 20;
  const dashHeight = 4;
  const gap = 20;
  for (let y = 0; y < 256; y += dashHeight + gap) {
    ctx.fillRect(124, y, dashWidth, dashHeight);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(Math.max(1, width / 10), Math.max(1, depth / 10));

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    metalness: 0.1
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function createGround(size) {
  const geometry = new THREE.PlaneGeometry(size, size);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#4a5568';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const gray = 60 + Math.random() * 30;
    ctx.fillStyle = `rgb(${gray}, ${gray + 10}, ${gray + 15})`;
    ctx.fillRect(x, y, 4, 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(size / 50, size / 50);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 1.0
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.1;
  mesh.receiveShadow = true;
  return mesh;
}

function createPark(width, depth) {
  const group = new THREE.Group();

  const groundGeom = new THREE.PlaneGeometry(width, depth);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#228b22';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const green = 80 + Math.random() * 60;
    ctx.fillStyle = `rgb(${green * 0.4}, ${green}, ${green * 0.3})`;
    ctx.fillRect(x, y, 3, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(width / 20, depth / 20);

  const groundMat = new THREE.MeshStandardMaterial({ map: texture });
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.05;
  ground.receiveShadow = true;
  group.add(ground);

  const treeCount = Math.floor((width * depth) / 200);
  const trees = [];
  for (let i = 0; i < treeCount; i++) {
    const tree = createTree();
    const tx = (Math.random() - 0.5) * (width - 10);
    const tz = (Math.random() - 0.5) * (depth - 10);
    tree.position.set(tx, 0, tz);
    const scale = 0.7 + Math.random() * 0.6;
    tree.scale.setScalar(scale);
    group.add(tree);
    trees.push({ mesh: tree, position: { x: tx, z: tz } });
  }

  return { mesh: group, trees: trees };
}

function createTree() {
  const group = new THREE.Group();

  const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.position.y = 2;
  trunk.castShadow = true;
  group.add(trunk);

  const foliageGeom = new THREE.SphereGeometry(2.5, 8, 8);
  const green = 0x228b22 + Math.floor(Math.random() * 0x224422);
  const foliageMat = new THREE.MeshStandardMaterial({ color: green, roughness: 0.8 });
  const foliage = new THREE.Mesh(foliageGeom, foliageMat);
  foliage.position.y = 5.5;
  foliage.castShadow = true;
  group.add(foliage);

  return group;
}

function createRiver(citySize, riverOffset) {
  const group = new THREE.Group();

  const riverWidth = 30;
  const riverLength = citySize * 1.2;
  const segments = 50;

  const curvePoints = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = (t - 0.5) * riverLength;
    const z = Math.sin(t * Math.PI * 3) * 15 + riverOffset;
    curvePoints.push(new THREE.Vector3(x, 0, z));
  }

  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const points = curve.getPoints(segments);

  const riverShape = new THREE.Shape();
  const leftPoints = [];
  const rightPoints = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
    
    const width = riverWidth * (0.7 + Math.sin(t * Math.PI * 2) * 0.3);
    leftPoints.push(new THREE.Vector2(point.x + normal.x * width / 2, point.z + normal.z * width / 2));
    rightPoints.unshift(new THREE.Vector2(point.x - normal.x * width / 2, point.z - normal.z * width / 2));
  }

  riverShape.moveTo(leftPoints[0].x, leftPoints[0].y);
  leftPoints.forEach(p => riverShape.lineTo(p.x, p.y));
  rightPoints.forEach(p => riverShape.lineTo(p.x, p.y));

  const riverGeom = new THREE.ShapeGeometry(riverShape);
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x1e90ff,
    transparent: true,
    opacity: 0.8,
    roughness: 0.1,
    metalness: 0.3
  });
  const river = new THREE.Mesh(riverGeom, riverMat);
  river.rotation.x = -Math.PI / 2;
  river.position.y = 0.02;
  group.add(river);

  const bankWidth = 4;
  for (let side = -1; side <= 1; side += 2) {
    const bankShape = new THREE.Shape();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const width = riverWidth * (0.7 + Math.sin(t * Math.PI * 2) * 0.3);
      if (side === -1) {
        bankShape.moveTo(
          point.x + normal.x * (width / 2),
          point.z + normal.z * (width / 2)
        );
        bankShape.lineTo(
          point.x + normal.x * (width / 2 + bankWidth),
          point.z + normal.z * (width / 2 + bankWidth)
        );
      } else {
        bankShape.moveTo(
          point.x - normal.x * (width / 2 + bankWidth),
          point.z - normal.z * (width / 2 + bankWidth)
        );
        bankShape.lineTo(
          point.x - normal.x * (width / 2),
          point.z - normal.z * (width / 2)
        );
      }
    }

    const bankGeom = new THREE.ShapeGeometry(bankShape);
    const bankMat = new THREE.MeshStandardMaterial({
      color: 0x556b2f,
      roughness: 1.0
    });
    const bank = new THREE.Mesh(bankGeom, bankMat);
    bank.rotation.x = -Math.PI / 2;
    bank.position.y = 0.03;
    group.add(bank);
  }

  return { mesh: group, curve: curve, width: riverWidth, points: points };
}

function createStreetLight(position, isNight) {
  const group = new THREE.Group();

  const poleGeom = new THREE.CylinderGeometry(0.15, 0.2, 6, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
  const pole = new THREE.Mesh(poleGeom, poleMat);
  pole.position.y = 3;
  pole.castShadow = true;
  group.add(pole);

  const armGeom = new THREE.BoxGeometry(2, 0.1, 0.1);
  const arm = new THREE.Mesh(armGeom, poleMat);
  arm.position.set(1, 5.8, 0);
  group.add(arm);

  const fixtureGeom = new THREE.BoxGeometry(1.5, 0.2, 0.6);
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const fixture = new THREE.Mesh(fixtureGeom, fixtureMat);
  fixture.position.set(2, 5.5, 0);
  group.add(fixture);

  const light = new THREE.PointLight(0xffeeaa, isNight ? 2 : 0, 25);
  light.position.set(2, 5, 0);
  light.visible = isNight;
  group.add(light);

  group.position.set(position.x, 0, position.z);

  return { mesh: group, light: light };
}

export function generateCity(params) {
  const {
    cityRadius = 300,
    blockSize = 60,
    roadWidth = 12,
    buildingDensity = 0.7,
    avgHeight = 15,
    heightVariance = 10,
    greenRatio = 0.1,
    waterRatio = 0.05,
    isNight = false
  } = params;

  const group = new THREE.Group();
  const buildings = [];
  const parks = [];
  const streetLights = [];
  const roadSegments = [];
  const roadsData = [];

  const citySize = cityRadius * 2;

  const ground = createGround(citySize * 1.5);
  group.add(ground);

  const blocksPerSide = Math.floor(citySize / blockSize);
  const totalBlocks = blocksPerSide * blocksPerSide;
  const parkCount = Math.floor(totalBlocks * greenRatio);
  const hasRiver = Math.random() < waterRatio + 0.3;
  const riverOffset = hasRiver ? (Math.random() - 0.5) * cityRadius * 0.6 : null;

  let river = null;
  if (hasRiver) {
    river = createRiver(citySize, riverOffset);
    group.add(river.mesh);
  }

  const blockTypes = new Array(totalBlocks).fill('building');
  for (let i = 0; i < parkCount; i++) {
    let idx;
    do {
      idx = Math.floor(Math.random() * totalBlocks);
    } while (blockTypes[idx] !== 'building');
    blockTypes[idx] = 'park';
  }

  const blockWidth = blockSize - roadWidth;
  const blockDepth = blockSize - roadWidth;

  for (let bx = 0; bx < blocksPerSide; bx++) {
    for (let bz = 0; bz < blocksPerSide; bz++) {
      const blockIdx = bx * blocksPerSide + bz;
      const blockCenterX = (bx - blocksPerSide / 2 + 0.5) * blockSize;
      const blockCenterZ = (bz - blocksPerSide / 2 + 0.5) * blockSize;

      const distFromCenter = Math.sqrt(blockCenterX * blockCenterX + blockCenterZ * blockCenterZ);
      if (distFromCenter > cityRadius) continue;

      const isInRiver = hasRiver && Math.abs(blockCenterZ - riverOffset) < 25 && Math.random() < 0.7;
      if (isInRiver) continue;

      if (blockTypes[blockIdx] === 'park') {
        const park = createPark(blockWidth * 0.9, blockDepth * 0.9);
        park.mesh.position.set(blockCenterX, 0, blockCenterZ);
        group.add(park.mesh);
        parks.push({ ...park, centerX: blockCenterX, centerZ: blockCenterZ });
        continue;
      }

      if (Math.random() > buildingDensity) continue;

      const shapes = ['rectangle', 'rectangle', 'rectangle', 'L', 'T'];
      const styles = ['glass', 'brick', 'concrete'];
      
      const buildingsInBlock = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < buildingsInBlock; i++) {
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const style = styles[Math.floor(Math.random() * styles.length)];
        
        const heightFactor = 1 - (distFromCenter / cityRadius) * 0.5;
        const baseFloors = Math.max(1, Math.floor(avgHeight * heightFactor));
        const variance = Math.floor((Math.random() - 0.5) * heightVariance * 2);
        const floors = Math.max(1, Math.min(50, baseFloors + variance));

        const buildingWidth = 10 + Math.random() * (blockWidth * 0.4);
        const buildingDepth = 10 + Math.random() * (blockDepth * 0.4);

        const offsetX = (Math.random() - 0.5) * (blockWidth - buildingWidth - 5);
        const offsetZ = (Math.random() - 0.5) * (blockDepth - buildingDepth - 5);

        const building = generateBuilding({
          position: {
            x: blockCenterX + offsetX,
            z: blockCenterZ + offsetZ
          },
          shape: shape,
          floors: floors,
          style: style,
          baseWidth: buildingWidth,
          baseDepth: buildingDepth,
          isNight: isNight
        });

        group.add(building.mesh);
        buildings.push(building);
      }
    }
  }

  for (let bx = 0; bx <= blocksPerSide; bx++) {
    for (let bz = 0; bz <= blocksPerSide; bz++) {
      const x = (bx - blocksPerSide / 2) * blockSize - roadWidth / 2;
      const z = (bz - blocksPerSide / 2) * blockSize - roadWidth / 2;

      if (bx < blocksPerSide) {
        const distFromCenter = Math.abs((bz - blocksPerSide / 2) * blockSize);
        if (distFromCenter < cityRadius + blockSize) {
          const isInRiver = hasRiver && Math.abs(z - riverOffset) < 20;
          if (!isInRiver) {
            const road = createRoadMesh(blockSize, roadWidth);
            road.position.set(x + blockSize / 2, 0.01, z + roadWidth / 2);
            group.add(road);
            roadSegments.push(road);
            roadsData.push({
              type: 'horizontal',
              x: x + blockSize / 2,
              z: z + roadWidth / 2,
              length: blockSize,
              width: roadWidth
            });
          }
        }
      }

      if (bz < blocksPerSide) {
        const distFromCenter = Math.abs((bx - blocksPerSide / 2) * blockSize);
        if (distFromCenter < cityRadius + blockSize) {
          const isInRiver = hasRiver && Math.abs((z + blockSize / 2) - riverOffset) < 20 && 
                          Math.abs(x + roadWidth / 2) < cityRadius - 20;
          if (!isInRiver) {
            const road = createRoadMesh(roadWidth, blockSize);
            road.position.set(x + roadWidth / 2, 0.01, z + blockSize / 2);
            group.add(road);
            roadSegments.push(road);
            roadsData.push({
              type: 'vertical',
              x: x + roadWidth / 2,
              z: z + blockSize / 2,
              length: blockSize,
              width: roadWidth
            });
          }
        }
      }

      if (bx < blocksPerSide && bz < blocksPerSide) {
        const intersectionX = x + roadWidth / 2 + blockSize / 2;
        const intersectionZ = z + roadWidth / 2 + blockSize / 2;
        const distFromCenter = Math.sqrt(intersectionX * intersectionX + intersectionZ * intersectionZ);
        if (distFromCenter < cityRadius + blockSize) {
          const isInRiver = hasRiver && Math.abs(intersectionZ - riverOffset) < 20;
          if (!isInRiver) {
            const intersection = createRoadMesh(roadWidth, roadWidth);
            intersection.position.set(intersectionX, 0.015, intersectionZ);
            group.add(intersection);

            const corners = [
              { x: intersectionX - roadWidth / 2 + 1, z: intersectionZ - roadWidth / 2 + 1 },
              { x: intersectionX + roadWidth / 2 - 1, z: intersectionZ - roadWidth / 2 + 1 },
              { x: intersectionX - roadWidth / 2 + 1, z: intersectionZ + roadWidth / 2 - 1 },
              { x: intersectionX + roadWidth / 2 - 1, z: intersectionZ + roadWidth / 2 - 1 }
            ];

            corners.forEach(corner => {
              if (Math.random() > 0.3) {
                const streetLight = createStreetLight(corner, isNight);
                group.add(streetLight.mesh);
                streetLights.push(streetLight);
              }
            });
          }
        }
      }
    }
  }

  const totalArea = buildings.reduce((sum, b) => sum + b.totalArea, 0);
  const avgBuildingHeight = buildings.length > 0 
    ? buildings.reduce((sum, b) => sum + b.height, 0) / buildings.length 
    : 0;
  const maxBuildingHeight = buildings.length > 0 
    ? Math.max(...buildings.map(b => b.height)) 
    : 0;

  return {
    mesh: group,
    buildings: buildings,
    parks: parks,
    streetLights: streetLights,
    roadsData: roadsData,
    river: river,
    citySize: citySize,
    blockSize: blockSize,
    roadWidth: roadWidth,
    stats: {
      buildingCount: buildings.length,
      totalArea: totalArea,
      avgHeight: avgBuildingHeight,
      maxHeight: maxBuildingHeight,
      parkCount: parks.length
    }
  };
}

export function updateCityNightMode(cityData, isNight) {
  cityData.streetLights.forEach(sl => {
    sl.light.visible = isNight;
    sl.light.intensity = isNight ? 2 : 0;
  });
}
