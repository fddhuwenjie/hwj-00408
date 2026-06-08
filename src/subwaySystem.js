import * as THREE from 'three';

const SUBWAY_DEPTH = -15;
const TUNNEL_RADIUS = 2;
const STATION_SIZE = 6;

const LINE_COLORS = [
  { name: '红线', color: 0xff3333, hex: '#ff3333' },
  { name: '蓝线', color: 0x3366ff, hex: '#3366ff' },
  { name: '绿线', color: 0x33cc33, hex: '#33cc33' }
];

const STATION_NAMES = [
  '中心广场', '商业街', '科技园', '大学城', '公园北', '河畔',
  '火车站', '体育馆', '博物馆', '金融中心', '居民区', '工业区',
  '机场', '医院', '图书馆', '大剧院', '购物中心', '会展中心'
];

function generateStationName(usedNames) {
  let name;
  do {
    name = STATION_NAMES[Math.floor(Math.random() * STATION_NAMES.length)];
  } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

function selectStationPositions(roadsData, stationCount, cityRadius) {
  const horizontalRoads = roadsData.filter(r => r.type === 'horizontal');
  const verticalRoads = roadsData.filter(r => r.type === 'vertical');
  
  const stations = [];
  const usedPositions = new Set();
  
  const allRoads = [...horizontalRoads, ...verticalRoads];
  
  for (let i = 0; i < stationCount; i++) {
    let attempts = 0;
    while (attempts < 50) {
      const road = allRoads[Math.floor(Math.random() * allRoads.length)];
      const t = 0.2 + Math.random() * 0.6;
      
      let x, z;
      if (road.type === 'horizontal') {
        x = road.x - road.length / 2 + t * road.length;
        z = road.z;
      } else {
        x = road.x;
        z = road.z - road.length / 2 + t * road.length;
      }
      
      const posKey = `${Math.floor(x / 10)},${Math.floor(z / 10)}`;
      const distFromCenter = Math.sqrt(x * x + z * z);
      
      if (!usedPositions.has(posKey) && distFromCenter < cityRadius * 0.9) {
        usedPositions.add(posKey);
        stations.push({ x, z, road });
        break;
      }
      attempts++;
    }
  }
  
  return stations;
}

function createTunnelCurve(startPoint, endPoint, depth) {
  const midX = (startPoint.x + endPoint.x) / 2;
  const midZ = (startPoint.z + endPoint.z) / 2;
  
  const curvePoints = [
    new THREE.Vector3(startPoint.x, depth, startPoint.z),
    new THREE.Vector3(midX, depth - 3, midZ),
    new THREE.Vector3(endPoint.x, depth, endPoint.z)
  ];
  
  return new THREE.QuadraticBezierCurve3(...curvePoints);
}

function createTunnelMesh(curve, color) {
  const tubeGeometry = new THREE.TubeGeometry(curve, 32, TUNNEL_RADIUS, 8, false);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    transparent: true,
    opacity: 0.6,
    roughness: 0.3,
    metalness: 0.7,
    emissive: color,
    emissiveIntensity: 0.3
  });
  const mesh = new THREE.Mesh(tubeGeometry, material);
  return mesh;
}

function createStationMarker(station, lineColor) {
  const group = new THREE.Group();
  
  const baseGeom = new THREE.BoxGeometry(STATION_SIZE, 0.3, STATION_SIZE);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8
  });
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.position.y = 0.15;
  base.receiveShadow = true;
  group.add(base);
  
  const indicatorGeom = new THREE.BoxGeometry(3, 0.5, 3);
  const indicatorMat = new THREE.MeshStandardMaterial({
    color: lineColor.color,
    emissive: lineColor.color,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.5
  });
  const indicator = new THREE.Mesh(indicatorGeom, indicatorMat);
  indicator.position.y = 0.55;
  group.add(indicator);
  
  const signGeom = new THREE.BoxGeometry(1.5, 2, 0.2);
  const signMat = new THREE.MeshStandardMaterial({
    color: lineColor.color,
    emissive: lineColor.color,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.8
  });
  const sign = new THREE.Mesh(signGeom, signMat);
  sign.position.y = 2;
  group.add(sign);
  
  group.position.set(station.x, 0, station.z);
  
  return { mesh: group, indicator, base };
}

function createStation3D(station, depth, lineColor, isTransfer = false) {
  const group = new THREE.Group();
  
  const stationBoxGeom = new THREE.BoxGeometry(STATION_SIZE * 1.5, 4, STATION_SIZE * 1.5);
  const stationBoxMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    transparent: true,
    opacity: 0.5,
    roughness: 0.5,
    metalness: 0.5
  });
  const stationBox = new THREE.Mesh(stationBoxGeom, stationBoxMat);
  stationBox.position.y = depth - 2;
  group.add(stationBox);
  
  const platformGeom = new THREE.BoxGeometry(STATION_SIZE * 1.2, 0.3, STATION_SIZE * 0.6);
  const platformMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.9
  });
  const platform = new THREE.Mesh(platformGeom, platformMat);
  platform.position.y = depth - 0.15;
  group.add(platform);
  
  if (isTransfer) {
    const lightColors = [lineColor.color, 0xffffff];
    lightColors.forEach((color, i) => {
      const light = new THREE.PointLight(color, 1.5, 20);
      light.position.set((i - 0.5) * 4, depth, 0);
      group.add(light);
    });
  } else {
    const light = new THREE.PointLight(lineColor.color, 1.5, 20);
    light.position.set(0, depth, 0);
    group.add(light);
  }
  
  const verticalShaftGeom = new THREE.CylinderGeometry(1.5, 1.5, Math.abs(depth), 16, 1, true);
  const verticalShaftMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    transparent: true,
    opacity: 0.3,
    roughness: 0.7,
    side: THREE.DoubleSide
  });
  const shaft = new THREE.Mesh(verticalShaftGeom, verticalShaftMat);
  shaft.position.y = depth / 2;
  group.add(shaft);
  
  group.position.set(station.x, 0, station.z);
  
  return { mesh: group, stationBox, platform };
}

export function createSubwaySystem(cityData) {
  const group = new THREE.Group();
  const subwayViewGroup = new THREE.Group();
  
  const { roadsData, citySize } = cityData;
  const cityRadius = citySize / 2;
  const usedStationNames = new Set();
  
  const lineCount = 2 + Math.floor(Math.random() * 2);
  const lines = [];
  
  const allStationPositions = selectStationPositions(
    roadsData, 
    lineCount * 6, 
    cityRadius
  );
  
  const transferStations = new Map();
  
  for (let lineIdx = 0; lineIdx < lineCount; lineIdx++) {
    const lineColor = LINE_COLORS[lineIdx];
    const stationCount = 5 + Math.floor(Math.random() * 4);
    
    const lineStations = [];
    const startIdx = lineIdx * Math.floor(allStationPositions.length / lineCount);
    
    for (let i = 0; i < stationCount && i < allStationPositions.length; i++) {
      const posIdx = (startIdx + i * 2) % allStationPositions.length;
      const pos = allStationPositions[posIdx];
      
      const posKey = `${Math.floor(pos.x)},${Math.floor(pos.z)}`;
      let stationName;
      
      if (transferStations.has(posKey)) {
        const existing = transferStations.get(posKey);
        stationName = existing.name;
        existing.lines.push(lineIdx);
        existing.isTransfer = true;
      } else {
        stationName = generateStationName(usedStationNames);
        transferStations.set(posKey, {
          name: stationName,
          lines: [lineIdx],
          isTransfer: false
        });
      }
      
      lineStations.push({
        ...pos,
        name: stationName,
        lineIndex: lineIdx,
        stationIndex: i
      });
    }
    
    lines.push({
      color: lineColor,
      stations: lineStations,
      index: lineIdx
    });
  }
  
  const tunnelMeshes = [];
  const stationMarkers = [];
  const station3Ds = [];
  const allStations = [];
  
  lines.forEach(line => {
    for (let i = 0; i < line.stations.length - 1; i++) {
      const start = line.stations[i];
      const end = line.stations[i + 1];
      const curve = createTunnelCurve(start, end, SUBWAY_DEPTH);
      const tunnel = createTunnelMesh(curve, line.color.color);
      tunnel.userData = { type: 'subwayTunnel', lineIndex: line.index };
      subwayViewGroup.add(tunnel);
      tunnelMeshes.push(tunnel);
    }
    
    line.stations.forEach(station => {
      const posKey = `${Math.floor(station.x)},${Math.floor(station.z)}`;
      const transferInfo = transferStations.get(posKey);
      
      const marker = createStationMarker(station, line.color);
      marker.mesh.userData = {
        type: 'subwayStation',
        station: {
          ...station,
          lines: transferInfo.lines,
          isTransfer: transferInfo.isTransfer,
          name: transferInfo.name,
          lineName: line.color.name,
          lineColor: line.color.hex
        }
      };
      group.add(marker.mesh);
      stationMarkers.push(marker);
      
      const station3D = createStation3D(station, SUBWAY_DEPTH, line.color, transferInfo.isTransfer);
      station3D.mesh.userData = { type: 'subwayStation3D' };
      subwayViewGroup.add(station3D.mesh);
      station3Ds.push(station3D);
      
      allStations.push({
        ...station,
        lines: transferInfo.lines,
        isTransfer: transferInfo.isTransfer,
        name: transferInfo.name,
        lineName: line.color.name,
        lineColor: line.color.hex,
        marker: marker.mesh,
        station3D: station3D.mesh
      });
    });
  });
  
  group.add(subwayViewGroup);
  subwayViewGroup.visible = false;
  
  return {
    mesh: group,
    subwayViewGroup,
    lines,
    tunnelMeshes,
    stationMarkers,
    station3Ds,
    stations: allStations,
    subwayViewEnabled: false,
    SUBWAY_DEPTH
  };
}

export function toggleSubwayView(subwaySystem, cityData) {
  subwaySystem.subwayViewEnabled = !subwaySystem.subwayViewEnabled;
  subwaySystem.subwayViewGroup.visible = subwaySystem.subwayViewEnabled;
  
  if (cityData && cityData.mesh) {
    cityData.mesh.traverse(child => {
      if (child.isMesh) {
        if (subwaySystem.subwayViewEnabled) {
          if (!child.userData.originalOpacity) {
            child.userData.originalOpacity = child.material.opacity || 1;
            child.userData.originalTransparent = child.material.transparent || false;
          }
          child.material.transparent = true;
          child.material.opacity = 0.2;
        } else {
          if (child.userData.originalOpacity !== undefined) {
            child.material.opacity = child.userData.originalOpacity;
            child.material.transparent = child.userData.originalTransparent;
          }
        }
      }
    });
  }
  
  return subwaySystem.subwayViewEnabled;
}

export function getStationInfo(station) {
  const lineNames = station.lines.map(idx => LINE_COLORS[idx]?.name || '未知线路').join('、');
  
  return {
    name: station.name,
    lineName: station.lineName,
    lineColor: station.lineColor,
    isTransfer: station.isTransfer,
    transferLines: station.isTransfer ? lineNames : null,
    position: { x: station.x.toFixed(1), z: station.z.toFixed(1) }
  };
}

export { LINE_COLORS, SUBWAY_DEPTH };
