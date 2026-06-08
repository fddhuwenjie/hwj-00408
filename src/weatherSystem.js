import * as THREE from 'three';

const WEATHER_TYPES = {
  sunny: { name: '晴天', skyMultiplier: 1.0, fogMultiplier: 1.0 },
  rainy: { name: '雨天', skyMultiplier: 0.5, fogMultiplier: 0.8 },
  snowy: { name: '雪天', skyMultiplier: 0.7, fogMultiplier: 0.7 },
  foggy: { name: '雾天', skyMultiplier: 0.6, fogMultiplier: 0.3 }
};

const TRANSITION_DURATION = 2.0;
const MAX_RAIN_PARTICLES = 8000;
const MAX_SNOW_PARTICLES = 4000;
const MAX_RIPPLES = 200;

function createRainParticles(count, cityRadius) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count);
  
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * cityRadius * 2;
    positions[i * 3 + 1] = Math.random() * cityRadius * 0.8 + 50;
    positions[i * 3 + 2] = (Math.random() - 0.5) * cityRadius * 2;
    velocities[i] = 80 + Math.random() * 60;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
  
  const material = new THREE.PointsMaterial({
    color: 0xaaaaff,
    size: 0.3,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true
  });
  
  const particles = new THREE.Points(geometry, material);
  particles.frustumCulled = false;
  
  return { mesh: particles, count, velocities };
}

function createSnowParticles(count, cityRadius) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * cityRadius * 2;
    positions[i * 3 + 1] = Math.random() * cityRadius * 0.8 + 50;
    positions[i * 3 + 2] = (Math.random() - 0.5) * cityRadius * 2;
    velocities[i] = 5 + Math.random() * 8;
    sizes[i] = 0.4 + Math.random() * 0.6;
    phases[i] = Math.random() * Math.PI * 2;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
  
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });
  
  const particles = new THREE.Points(geometry, material);
  particles.frustumCulled = false;
  
  return { mesh: particles, count, velocities, sizes, phases };
}

function createRippleEffect(cityRadius) {
  const group = new THREE.Group();
  const ripples = [];
  
  for (let i = 0; i < MAX_RIPPLES; i++) {
    const geometry = new THREE.RingGeometry(0.1, 0.3, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const ripple = new THREE.Mesh(geometry, material);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.y = 0.02;
    ripple.visible = false;
    group.add(ripple);
    ripples.push({
      mesh: ripple,
      active: false,
      life: 0,
      maxLife: 1,
      x: 0,
      z: 0
    });
  }
  
  return { mesh: group, ripples };
}

function createSnowAccumulation(cityData) {
  const group = new THREE.Group();
  const snowMaterials = [];
  
  cityData.buildings.forEach(building => {
    const height = building.height;
    const baseWidth = building.baseWidth || 15;
    const baseDepth = building.baseDepth || 15;
    
    const snowGeom = new THREE.PlaneGeometry(baseWidth * 0.95, baseDepth * 0.95);
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      roughness: 0.9,
      metalness: 0.1
    });
    const snow = new THREE.Mesh(snowGeom, snowMat);
    snow.rotation.x = -Math.PI / 2;
    snow.position.copy(building.mesh.position);
    snow.position.y = height + 0.1;
    group.add(snow);
    snowMaterials.push(snowMat);
  });
  
  const groundSnowGeom = new THREE.PlaneGeometry(
    cityData.citySize * 1.4,
    cityData.citySize * 1.4
  );
  const groundSnowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    roughness: 1.0
  });
  const groundSnow = new THREE.Mesh(groundSnowGeom, groundSnowMat);
  groundSnow.rotation.x = -Math.PI / 2;
  groundSnow.position.y = 0.01;
  group.add(groundSnow);
  snowMaterials.push(groundSnowMat);
  
  return { mesh: group, snowMaterials, groundSnowMat };
}

export function createWeatherSystem(scene, cityData, dayNightSystem) {
  const group = new THREE.Group();
  
  const cityRadius = cityData ? cityData.citySize / 2 : 300;
  
  const rainParticles = createRainParticles(MAX_RAIN_PARTICLES, cityRadius);
  const snowParticles = createSnowParticles(MAX_SNOW_PARTICLES, cityRadius);
  const rippleSystem = createRippleEffect(cityRadius);
  const snowAccumulation = cityData ? createSnowAccumulation(cityData) : null;
  
  group.add(rainParticles.mesh);
  group.add(snowParticles.mesh);
  group.add(rippleSystem.mesh);
  if (snowAccumulation) {
    group.add(snowAccumulation.mesh);
  }
  
  let currentWeather = 'sunny';
  let targetWeather = 'sunny';
  let transitionProgress = 1;
  let weatherIntensity = 0;
  let windSpeed = 0.5;
  
  let time = 0;
  
  return {
    mesh: group,
    rainParticles,
    snowParticles,
    rippleSystem,
    snowAccumulation,
    currentWeather,
    targetWeather,
    transitionProgress,
    weatherIntensity,
    windSpeed,
    dayNightSystem,
    cityRadius,
    time
  };
}

export function setWeather(weatherSystem, weatherType) {
  if (!WEATHER_TYPES[weatherType]) return false;
  if (weatherSystem.targetWeather === weatherType) return true;
  
  weatherSystem.targetWeather = weatherType;
  weatherSystem.transitionProgress = 0;
  return true;
}

export function setWindSpeed(weatherSystem, speed) {
  weatherSystem.windSpeed = Math.max(0, Math.min(1, speed));
}

export function updateWeatherSystem(weatherSystem, deltaTime, timeOfDay = 0.5) {
  weatherSystem.time += deltaTime;
  
  if (weatherSystem.transitionProgress < 1) {
    weatherSystem.transitionProgress = Math.min(1, weatherSystem.transitionProgress + deltaTime / TRANSITION_DURATION);
    
    const t = weatherSystem.transitionProgress;
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    
    if (weatherSystem.targetWeather === weatherSystem.currentWeather) {
      weatherSystem.weatherIntensity = easeT;
    } else {
      weatherSystem.weatherIntensity = 1 - easeT;
      
      if (easeT >= 1) {
        weatherSystem.currentWeather = weatherSystem.targetWeather;
        weatherSystem.weatherIntensity = 1;
      }
    }
  }
  
  updateRainParticles(weatherSystem, deltaTime);
  updateSnowParticles(weatherSystem, deltaTime);
  updateRipples(weatherSystem, deltaTime);
  updateSnowAccumulation(weatherSystem);
  updateMaterialProperties(weatherSystem, timeOfDay);
  
  return {
    currentWeather: weatherSystem.currentWeather,
    targetWeather: weatherSystem.targetWeather,
    intensity: weatherSystem.weatherIntensity,
    isTransitioning: weatherSystem.transitionProgress < 1
  };
}

function updateRainParticles(weatherSystem, deltaTime) {
  const { rainParticles, windSpeed, cityRadius, weatherIntensity, currentWeather, targetWeather } = weatherSystem;
  
  const showRain = currentWeather === 'rainy' || targetWeather === 'rainy';
  const targetOpacity = (currentWeather === 'rainy' ? weatherIntensity : (1 - weatherIntensity)) * 
                        (currentWeather === 'rainy' || targetWeather === 'rainy' ? 1 : 0);
  
  rainParticles.mesh.material.opacity = showRain ? targetOpacity * 0.7 : 0;
  
  if (!showRain) return;
  
  const positions = rainParticles.mesh.geometry.attributes.position.array;
  const effectiveSpeed = windSpeed * 2 + 0.5;
  
  const activeCount = Math.floor(rainParticles.count * weatherIntensity * (0.3 + windSpeed * 0.7));
  
  for (let i = 0; i < activeCount; i++) {
    const velocity = rainParticles.velocities[i] * effectiveSpeed;
    
    positions[i * 3 + 1] -= velocity * deltaTime;
    positions[i * 3] += windSpeed * 30 * deltaTime;
    positions[i * 3 + 2] += windSpeed * 15 * deltaTime;
    
    if (positions[i * 3 + 1] < 0) {
      positions[i * 3 + 1] = cityRadius * 0.8 + 50;
      positions[i * 3] = (Math.random() - 0.5) * cityRadius * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * cityRadius * 2;
      
      if (Math.random() < 0.1) {
        triggerRipple(weatherSystem, positions[i * 3], positions[i * 3 + 2]);
      }
    }
  }
  
  for (let i = activeCount; i < rainParticles.count; i++) {
    positions[i * 3 + 1] = 1000;
  }
  
  rainParticles.mesh.geometry.attributes.position.needsUpdate = true;
}

function updateSnowParticles(weatherSystem, deltaTime) {
  const { snowParticles, windSpeed, cityRadius, weatherIntensity, currentWeather, targetWeather, time } = weatherSystem;
  
  const showSnow = currentWeather === 'snowy' || targetWeather === 'snowy';
  const targetOpacity = (currentWeather === 'snowy' ? weatherIntensity : (1 - weatherIntensity)) *
                        (currentWeather === 'snowy' || targetWeather === 'snowy' ? 1 : 0);
  
  snowParticles.mesh.material.opacity = showSnow ? targetOpacity * 0.9 : 0;
  
  if (!showSnow) return;
  
  const positions = snowParticles.mesh.geometry.attributes.position.array;
  const effectiveSpeed = windSpeed * 1.5 + 0.3;
  
  const activeCount = Math.floor(snowParticles.count * weatherIntensity * (0.4 + windSpeed * 0.6));
  
  for (let i = 0; i < activeCount; i++) {
    const velocity = snowParticles.velocities[i] * effectiveSpeed;
    const phase = snowParticles.phases[i] + time * 2;
    const swayAmount = Math.sin(phase) * 2 + Math.sin(phase * 0.7) * 1;
    
    positions[i * 3 + 1] -= velocity * deltaTime;
    positions[i * 3] += swayAmount * deltaTime + windSpeed * 20 * deltaTime;
    positions[i * 3 + 2] += Math.cos(phase * 0.5) * deltaTime;
    
    if (positions[i * 3 + 1] < 0.5) {
      positions[i * 3 + 1] = cityRadius * 0.8 + 50;
      positions[i * 3] = (Math.random() - 0.5) * cityRadius * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * cityRadius * 2;
    }
  }
  
  for (let i = activeCount; i < snowParticles.count; i++) {
    positions[i * 3 + 1] = 1000;
  }
  
  snowParticles.mesh.geometry.attributes.position.needsUpdate = true;
}

function triggerRipple(weatherSystem, x, z) {
  const { rippleSystem, cityRadius } = weatherSystem;
  
  for (let ripple of rippleSystem.ripples) {
    if (!ripple.active) {
      ripple.active = true;
      ripple.life = 0;
      ripple.maxLife = 0.8 + Math.random() * 0.4;
      ripple.x = x;
      ripple.z = z;
      ripple.mesh.position.set(x, 0.02, z);
      ripple.mesh.visible = true;
      ripple.mesh.scale.set(1, 1, 1);
      ripple.mesh.material.opacity = 0.6;
      break;
    }
  }
}

function updateRipples(weatherSystem, deltaTime) {
  const { rippleSystem, weatherIntensity, currentWeather } = weatherSystem;
  
  const showRipples = currentWeather === 'rainy';
  
  rippleSystem.ripples.forEach(ripple => {
    if (ripple.active && showRipples) {
      ripple.life += deltaTime;
      
      if (ripple.life >= ripple.maxLife) {
        ripple.active = false;
        ripple.mesh.visible = false;
        return;
      }
      
      const t = ripple.life / ripple.maxLife;
      const scale = 1 + t * 8;
      ripple.mesh.scale.set(scale, scale, scale);
      ripple.mesh.material.opacity = (1 - t) * 0.6 * weatherIntensity;
    } else {
      ripple.mesh.visible = false;
    }
  });
}

function updateSnowAccumulation(weatherSystem) {
  const { snowAccumulation, weatherIntensity, currentWeather, targetWeather } = weatherSystem;
  
  if (!snowAccumulation) return;
  
  const showSnow = currentWeather === 'snowy' || targetWeather === 'snowy';
  const targetOpacity = (currentWeather === 'snowy' ? weatherIntensity : (1 - weatherIntensity)) * 0.8;
  
  snowAccumulation.snowMaterials.forEach(mat => {
    mat.opacity = showSnow ? targetOpacity : 0;
  });
}

function updateMaterialProperties(weatherSystem, timeOfDay) {
  const { currentWeather, weatherIntensity, rainParticles, snowParticles, dayNightSystem } = weatherSystem;
  
  if (currentWeather === 'rainy') {
    const intensity = weatherIntensity * 0.7;
    rainParticles.mesh.material.color.setRGB(
      0.6 + intensity * 0.2,
      0.7 + intensity * 0.2,
      0.9 + intensity * 0.1
    );
    
    if (dayNightSystem && dayNightSystem.sunLight) {
      const originalIntensity = dayNightSystem.sunLight.userData.originalIntensity || 1;
      dayNightSystem.sunLight.intensity = originalIntensity * (1 - intensity * 0.4);
      dayNightSystem.sunLight.material && (dayNightSystem.sunLight.material.opacity = 1 - intensity * 0.3);
    }
  } else if (currentWeather === 'snowy') {
    snowParticles.mesh.material.color.setRGB(1, 1, 1);
  }
}

export function getWeatherLightMultiplier(weatherSystem) {
  const { currentWeather, weatherIntensity } = weatherSystem;
  const weatherConfig = WEATHER_TYPES[currentWeather] || WEATHER_TYPES.sunny;
  return weatherConfig.skyMultiplier * (1 - weatherIntensity * 0.2) + weatherIntensity * 0.2;
}

export function getWeatherFogMultiplier(weatherSystem) {
  const { currentWeather, weatherIntensity } = weatherSystem;
  const weatherConfig = WEATHER_TYPES[currentWeather] || WEATHER_TYPES.sunny;
  return weatherConfig.fogMultiplier;
}

export function isWeatherDark(weatherSystem) {
  return weatherSystem.currentWeather === 'rainy' || weatherSystem.currentWeather === 'foggy';
}

export { WEATHER_TYPES };
