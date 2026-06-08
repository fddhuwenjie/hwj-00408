import * as THREE from 'three';

const SKY_COLORS = {
  night: new THREE.Color(0x0a0a1a),
  dawn: new THREE.Color(0xff7755),
  day: new THREE.Color(0x87ceeb),
  dusk: new THREE.Color(0xff6644)
};

const FOG_COLORS = {
  night: new THREE.Color(0x0a0a1a),
  dawn: new THREE.Color(0xffaa88),
  day: new THREE.Color(0xb0e0e6),
  dusk: new THREE.Color(0xff9966)
};

const AMBIENT_INTENSITY = {
  night: 0.1,
  dawn: 0.3,
  day: 0.6,
  dusk: 0.3
};

const SUN_INTENSITY = {
  night: 0,
  dawn: 0.8,
  day: 1.5,
  dusk: 0.8
};

function lerpColor(color1, color2, t) {
  return new THREE.Color().lerpColors(color1, color2, t);
}

export function createDayNightSystem(scene) {
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 4096;
  sunLight.shadow.mapSize.height = 4096;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 2000;
  sunLight.shadow.camera.left = -500;
  sunLight.shadow.camera.right = 500;
  sunLight.shadow.camera.top = 500;
  sunLight.shadow.camera.bottom = -500;
  sunLight.shadow.bias = -0.0001;
  scene.add(sunLight);

  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x335522, 0.4);
  scene.add(hemisphereLight);

  const moonLight = new THREE.DirectionalLight(0xaaaaff, 0.0);
  scene.add(moonLight);

  scene.fog = new THREE.Fog(0x87ceeb, 200, 1000);

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(15, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );
  sunMesh.visible = false;
  scene.add(sunMesh);

  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xeeeeee })
  );
  moonMesh.visible = false;
  scene.add(moonMesh);

  return {
    sunLight,
    ambientLight,
    hemisphereLight,
    moonLight,
    sunMesh,
    moonMesh,
    currentTime: 0.5,
    isNight: false
  };
}

export function updateDayNightSystem(system, timeOfDay, cityRadius = 300) {
  system.currentTime = timeOfDay;

  const angle = timeOfDay * Math.PI * 2 - Math.PI / 2;
  const orbitRadius = cityRadius * 2;
  const sunHeight = Math.sin(angle) * orbitRadius;
  const sunDistance = Math.cos(angle) * orbitRadius;

  system.sunLight.position.set(sunDistance, sunHeight, orbitRadius * 0.5);
  system.sunMesh.position.copy(system.sunLight.position);

  const moonAngle = angle + Math.PI;
  const moonHeight = Math.sin(moonAngle) * orbitRadius;
  const moonDistance = Math.cos(moonAngle) * orbitRadius;
  system.moonLight.position.set(moonDistance, moonHeight, orbitRadius * 0.5);
  system.moonMesh.position.copy(system.moonLight.position);

  let skyColor, fogColor, sunIntensity, ambientIntensity, moonIntensity;
  let isNight = false;

  if (timeOfDay < 0.2) {
    const t = timeOfDay / 0.2;
    skyColor = lerpColor(SKY_COLORS.night, SKY_COLORS.dawn, t);
    fogColor = lerpColor(FOG_COLORS.night, FOG_COLORS.dawn, t);
    sunIntensity = SUN_INTENSITY.night + (SUN_INTENSITY.dawn - SUN_INTENSITY.night) * t;
    ambientIntensity = AMBIENT_INTENSITY.night + (AMBIENT_INTENSITY.dawn - AMBIENT_INTENSITY.night) * t;
    moonIntensity = 0.3 * (1 - t);
    isNight = t < 0.5;
  } else if (timeOfDay < 0.35) {
    const t = (timeOfDay - 0.2) / 0.15;
    skyColor = lerpColor(SKY_COLORS.dawn, SKY_COLORS.day, t);
    fogColor = lerpColor(FOG_COLORS.dawn, FOG_COLORS.day, t);
    sunIntensity = SUN_INTENSITY.dawn + (SUN_INTENSITY.day - SUN_INTENSITY.dawn) * t;
    ambientIntensity = AMBIENT_INTENSITY.dawn + (AMBIENT_INTENSITY.day - AMBIENT_INTENSITY.dawn) * t;
    moonIntensity = 0;
    isNight = false;
  } else if (timeOfDay < 0.7) {
    skyColor = SKY_COLORS.day;
    fogColor = FOG_COLORS.day;
    sunIntensity = SUN_INTENSITY.day;
    ambientIntensity = AMBIENT_INTENSITY.day;
    moonIntensity = 0;
    isNight = false;
  } else if (timeOfDay < 0.85) {
    const t = (timeOfDay - 0.7) / 0.15;
    skyColor = lerpColor(SKY_COLORS.day, SKY_COLORS.dusk, t);
    fogColor = lerpColor(FOG_COLORS.day, FOG_COLORS.dusk, t);
    sunIntensity = SUN_INTENSITY.day + (SUN_INTENSITY.dusk - SUN_INTENSITY.day) * t;
    ambientIntensity = AMBIENT_INTENSITY.day + (AMBIENT_INTENSITY.dusk - AMBIENT_INTENSITY.day) * t;
    moonIntensity = 0.3 * t;
    isNight = t > 0.5;
  } else {
    const t = (timeOfDay - 0.85) / 0.15;
    skyColor = lerpColor(SKY_COLORS.dusk, SKY_COLORS.night, t);
    fogColor = lerpColor(FOG_COLORS.dusk, FOG_COLORS.night, t);
    sunIntensity = SUN_INTENSITY.dusk + (SUN_INTENSITY.night - SUN_INTENSITY.dusk) * t;
    ambientIntensity = AMBIENT_INTENSITY.dusk + (AMBIENT_INTENSITY.night - AMBIENT_INTENSITY.dusk) * t;
    moonIntensity = 0.3;
    isNight = true;
  }

  system.sunLight.intensity = Math.max(0, sunIntensity);
  system.sunLight.color.setHSL(0.1, 0.8, 0.5 + sunHeight / orbitRadius * 0.3);
  system.ambientLight.intensity = ambientIntensity;
  system.ambientLight.color.copy(skyColor).multiplyScalar(0.5);
  system.moonLight.intensity = moonIntensity;

  system.hemisphereLight.color.copy(skyColor);
  system.hemisphereLight.groundColor.setHex(0x224422);
  system.hemisphereLight.intensity = ambientIntensity * 0.8;

  system.scene.background = skyColor;
  system.scene.fog.color.copy(fogColor);
  system.scene.fog.near = isNight ? 100 : 200;
  system.scene.fog.far = isNight ? 600 : 1000;

  system.sunMesh.visible = sunHeight > -cityRadius * 0.5;
  system.moonMesh.visible = moonHeight > -cityRadius * 0.5;

  if (system.sunMesh.visible) {
    const sunBrightness = Math.max(0, (sunHeight + cityRadius * 0.5) / (cityRadius * 1.5));
    system.sunMesh.material.color.setHSL(0.1, 1, 0.5 + sunBrightness * 0.3);
    system.sunMesh.material.color.multiplyScalar(1 + sunBrightness);
  }

  const nightChanged = system.isNight !== isNight;
  system.isNight = isNight;

  return { isNight, nightChanged, skyColor };
}
