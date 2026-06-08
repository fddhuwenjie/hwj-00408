import * as THREE from 'three';

const VEHICLE_COLORS = [0xff0000, 0x0000ff, 0xffffff, 0x000000, 0xffff00, 0x00ff00, 0xff00ff, 0x00ffff];

function createVehicle(isNight) {
  const group = new THREE.Group();

  const color = VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];
  const bodyGeom = new THREE.BoxGeometry(2.5, 1.2, 5);
  const bodyMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.6, roughness: 0.4 });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.y = 0.6;
  body.castShadow = true;
  group.add(body);

  const cabinGeom = new THREE.BoxGeometry(2, 0.9, 2.5);
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.7 });
  const cabin = new THREE.Mesh(cabinGeom, cabinMat);
  cabin.position.y = 1.5;
  cabin.position.z = -0.5;
  group.add(cabin);

  const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const wheelPositions = [
    { x: -1.1, y: 0.35, z: 1.5 },
    { x: 1.1, y: 0.35, z: 1.5 },
    { x: -1.1, y: 0.35, z: -1.5 },
    { x: 1.1, y: 0.35, z: -1.5 }
  ];

  wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeom, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(pos.x, pos.y, pos.z);
    group.add(wheel);
  });

  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
  const headlightGeom = new THREE.BoxGeometry(0.3, 0.2, 0.1);
  [-0.7, 0.7].forEach(x => {
    const headlight = new THREE.Mesh(headlightGeom, headlightMat);
    headlight.position.set(x, 0.8, 2.55);
    group.add(headlight);
  });

  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const taillightGeom = new THREE.BoxGeometry(0.3, 0.2, 0.1);
  [-0.7, 0.7].forEach(x => {
    const taillight = new THREE.Mesh(taillightGeom, taillightMat);
    taillight.position.set(x, 0.8, -2.55);
    group.add(taillight);
  });

  const leftHeadlight = new THREE.PointLight(0xffffcc, isNight ? 1.5 : 0, 20);
  leftHeadlight.position.set(-0.7, 0.8, 3);
  leftHeadlight.angle = Math.PI / 4;
  leftHeadlight.visible = isNight;
  group.add(leftHeadlight);

  const rightHeadlight = new THREE.PointLight(0xffffcc, isNight ? 1.5 : 0, 20);
  rightHeadlight.position.set(0.7, 0.8, 3);
  rightHeadlight.angle = Math.PI / 4;
  rightHeadlight.visible = isNight;
  group.add(rightHeadlight);

  return {
    mesh: group,
    headlights: [leftHeadlight, rightHeadlight],
    currentRoad: null,
    direction: 1,
    speed: 10,
    progress: 0,
    waiting: false,
    waitTime: 0
  };
}

export function createTrafficSystem(cityData) {
  const group = new THREE.Group();
  const vehicles = [];
  const roadsData = cityData.roadsData;
  const blockSize = cityData.blockSize;
  const roadWidth = cityData.roadWidth;

  return {
    mesh: group,
    vehicles: vehicles,
    roadsData: roadsData,
    blockSize: blockSize,
    roadWidth: roadWidth,
    speedMultiplier: 1,
    isNight: false
  };
}

export function generateVehicles(trafficSystem, count = 50) {
  const { mesh, vehicles, roadsData, blockSize, roadWidth } = trafficSystem;

  const horizontalRoads = roadsData.filter(r => r.type === 'horizontal');
  const verticalRoads = roadsData.filter(r => r.type === 'vertical');

  for (let i = 0; i < count; i++) {
    const vehicle = createVehicle(trafficSystem.isNight);

    const isHorizontal = Math.random() > 0.5;
    const roads = isHorizontal ? horizontalRoads : verticalRoads;

    if (roads.length === 0) continue;

    const road = roads[Math.floor(Math.random() * roads.length)];
    const direction = Math.random() > 0.5 ? 1 : -1;

    let x, z, rotationY;
    const laneOffset = direction > 0 ? -roadWidth * 0.25 : roadWidth * 0.25;

    if (isHorizontal) {
      const startX = road.x - road.length / 2;
      const endX = road.x + road.length / 2;
      const t = Math.random();
      x = startX + t * (endX - startX);
      z = road.z + laneOffset;
      rotationY = direction > 0 ? -Math.PI / 2 : Math.PI / 2;
      vehicle.progress = t;
    } else {
      const startZ = road.z - road.length / 2;
      const endZ = road.z + road.length / 2;
      const t = Math.random();
      z = startZ + t * (endZ - startZ);
      x = road.x + laneOffset;
      rotationY = direction > 0 ? 0 : Math.PI;
      vehicle.progress = t;
    }

    vehicle.mesh.position.set(x, 0.1, z);
    vehicle.mesh.rotation.y = rotationY;
    vehicle.currentRoad = road;
    vehicle.direction = direction;
    vehicle.isHorizontal = isHorizontal;
    vehicle.speed = 8 + Math.random() * 8;

    mesh.add(vehicle.mesh);
    vehicles.push(vehicle);
  }
}

export function updateTraffic(trafficSystem, deltaTime) {
  const { vehicles, roadsData, blockSize, roadWidth, speedMultiplier, isNight } = trafficSystem;

  vehicles.forEach(vehicle => {
    if (!vehicle.currentRoad) return;

    if (vehicle.waiting) {
      vehicle.waitTime -= deltaTime;
      if (vehicle.waitTime <= 0) {
        vehicle.waiting = false;
      }
      return;
    }

    const moveSpeed = vehicle.speed * speedMultiplier * deltaTime;
    vehicle.progress += moveSpeed / vehicle.currentRoad.length * vehicle.direction;

    if (vehicle.progress >= 1 || vehicle.progress <= 0) {
      const turnChance = Math.random();

      if (turnChance < 0.6) {
        const perpendicularRoads = roadsData.filter(r => {
          if (vehicle.isHorizontal) {
            return r.type === 'vertical' &&
              Math.abs(r.x - vehicle.mesh.position.x) < blockSize / 2 &&
              Math.abs(r.z - vehicle.mesh.position.z) < roadWidth;
          } else {
            return r.type === 'horizontal' &&
              Math.abs(r.z - vehicle.mesh.position.z) < blockSize / 2 &&
              Math.abs(r.x - vehicle.mesh.position.x) < roadWidth;
          }
        });

        if (perpendicularRoads.length > 0) {
          const newRoad = perpendicularRoads[Math.floor(Math.random() * perpendicularRoads.length)];
          const newDirection = Math.random() > 0.5 ? 1 : -1;

          const laneOffset = newDirection > 0 ? -roadWidth * 0.25 : roadWidth * 0.25;
          
          if (vehicle.isHorizontal) {
            vehicle.mesh.position.x = newRoad.x + laneOffset;
            vehicle.mesh.position.z = newRoad.z;
            vehicle.mesh.rotation.y = newDirection > 0 ? 0 : Math.PI;
          } else {
            vehicle.mesh.position.z = newRoad.z + laneOffset;
            vehicle.mesh.position.x = newRoad.x;
            vehicle.mesh.rotation.y = newDirection > 0 ? -Math.PI / 2 : Math.PI / 2;
          }

          vehicle.currentRoad = newRoad;
          vehicle.isHorizontal = !vehicle.isHorizontal;
          vehicle.direction = newDirection;
          vehicle.progress = newDirection > 0 ? 0 : 1;
          return;
        }
      }

      vehicle.direction *= -1;
      vehicle.progress = vehicle.direction > 0 ? 0 : 1;
      vehicle.waiting = true;
      vehicle.waitTime = 0.5 + Math.random() * 1;
    }

    const road = vehicle.currentRoad;
    const laneOffset = vehicle.direction > 0 ? -roadWidth * 0.25 : roadWidth * 0.25;

    if (vehicle.isHorizontal) {
      const startX = road.x - road.length / 2;
      const endX = road.x + road.length / 2;
      vehicle.mesh.position.x = startX + vehicle.progress * (endX - startX);
      vehicle.mesh.position.z = road.z + laneOffset;
    } else {
      const startZ = road.z - road.length / 2;
      const endZ = road.z + road.length / 2;
      vehicle.mesh.position.z = startZ + vehicle.progress * (endZ - startZ);
      vehicle.mesh.position.x = road.x + laneOffset;
    }

    vehicle.headlights.forEach(light => {
      light.visible = isNight;
      light.intensity = isNight ? 1.5 : 0;
    });
  });
}

export function updateTrafficNightMode(trafficSystem, isNight) {
  trafficSystem.isNight = isNight;
  trafficSystem.vehicles.forEach(vehicle => {
    vehicle.headlights.forEach(light => {
      light.visible = isNight;
      light.intensity = isNight ? 1.5 : 0;
    });
  });
}
