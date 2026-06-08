import * as THREE from 'three';

export function createMinimap(camera, cityData, containerId = 'minimap-canvas') {
  const canvas = document.getElementById(containerId);
  if (!canvas) return null;

  const size = 200;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const citySize = cityData.citySize;
  const halfSize = citySize / 2;

  const scale = size / citySize;

  function worldToMinimap(x, z) {
    return {
      x: (x + halfSize) * scale,
      y: size - (z + halfSize) * scale
    };
  }

  function draw() {
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);

    if (cityData.river) {
      ctx.beginPath();
      cityData.river.points.forEach((point, i) => {
        const pos = worldToMinimap(point.x, point.z);
        if (i === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      });
      ctx.strokeStyle = '#1e90ff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    ctx.fillStyle = '#333333';
    cityData.roadsData.forEach(road => {
      const roadScale = road.width * scale;
      if (road.type === 'horizontal') {
        const start = worldToMinimap(road.x - road.length / 2, road.z);
        const end = worldToMinimap(road.x + road.length / 2, road.z);
        ctx.fillRect(start.x, start.y - roadScale / 2, end.x - start.x, roadScale);
      } else {
        const start = worldToMinimap(road.x, road.z - road.length / 2);
        const end = worldToMinimap(road.x, road.z + road.length / 2);
        ctx.fillRect(start.x - roadScale / 2, start.y, roadScale, end.y - start.y);
      }
    });

    cityData.parks.forEach(park => {
      const pos = worldToMinimap(park.centerX, park.centerZ);
      const parkWidth = (cityData.blockSize - cityData.roadWidth) * 0.9 * scale;
      ctx.fillStyle = '#228b22';
      ctx.fillRect(pos.x - parkWidth / 2, pos.y - parkWidth / 2, parkWidth, parkWidth);
    });

    ctx.fillStyle = '#666666';
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 0.5;
    cityData.buildings.forEach(building => {
      const pos = worldToMinimap(building.position.x, building.position.z);
      const buildingSize = Math.max(3, Math.min(10, building.height * scale * 0.3));
      ctx.fillRect(pos.x - buildingSize / 2, pos.y - buildingSize / 2, buildingSize, buildingSize);
      ctx.strokeRect(pos.x - buildingSize / 2, pos.y - buildingSize / 2, buildingSize, buildingSize);
    });

    const camPos = worldToMinimap(camera.position.x, camera.position.z);
    
    ctx.save();
    ctx.translate(camPos.x, camPos.y);
    ctx.rotate(-camera.rotation.y);
    
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-5, 5);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fillStyle = '#ff4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);

    const frustumSize = 100;
    const viewSize = frustumSize * scale;
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(camPos.x - viewSize / 2, camPos.y - viewSize / 2, viewSize, viewSize);
  }

  return { draw, canvas };
}
