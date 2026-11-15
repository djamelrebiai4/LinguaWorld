import {
  r as React,
  u as useThree,
  k as useKeyboardControls,
  V as Vector3,
  E as Euler,
  b as useFrame,
  p as PointerLockControls,
  l as useGLTF,
  o as Environment
} from './three-vendor-BrF7bqo1.js';
import {
  u as useRapier,
  g as Rapier,
  R as RigidBody,
  C as CapsuleCollider,
  P as Physics
} from './physics-vendor-HODa8zue.js';
import {
  G as collisionGroups,
  d as EffectComposer,
  a as SSAO
} from './CollisionConfig-_pz6FJXP.js';
import { d as audio, I as ObjectInteraction } from './index-C2Y9NDyy.js';

const h = React.createElement;

const CITY_PORTALS = [
  {
    id: 'house',
    targetLevel: 2,
    title: { ar: 'المنزل', en: 'the house' },
    position: { x: 140, z: -203 },
    radius: 24,
    spawn: { x: 0, y: 0, z: 0 },
    returnPosition: { x: 140, y: 0, z: -203 }
  },
  {
    id: 'classroom',
    targetLevel: 3,
    title: { ar: 'المدرسة', en: 'the school' },
    position: { x: -131, z: 281 },
    radius: 23,
    spawn: { x: 0, y: 0, z: 0 },
    returnPosition: { x: -131, y: 0, z: 281 }
  },
  {
    id: 'restaurant',
    targetLevel: 4,
    title: { ar: 'المطعم', en: 'the restaurant' },
    position: { x: 99, z: 170 },
    radius: 22,
    spawn: { x: 0, y: 0, z: 0 },
    returnPosition: { x: 99, y: 0, z: 170 }
  },
  {
    id: 'supermarket',
    targetLevel: 5,
    title: { ar: 'السوبرماركت', en: 'the supermarket' },
    position: { x: 83, z: 284 },
    radius: 24,
    spawn: { x: 0, y: 0, z: 0 },
    returnPosition: { x: 83, y: 0, z: 284 }
  }
];

const INTERIOR_EXITS = {
  2: { position: { x: 3, z: 16 }, radius: 8, returnPosition: CITY_PORTALS[0].returnPosition },
  3: { position: { x: 17, z: -14 }, radius: 10, returnPosition: CITY_PORTALS[1].returnPosition },
  4: { position: { x: -5, z: 25 }, radius: 10, returnPosition: CITY_PORTALS[2].returnPosition },
  5: { position: { x: 0, z: 42 }, radius: 11, returnPosition: CITY_PORTALS[3].returnPosition }
};

const LEVEL_NAMES = {
  2: { ar: 'المنزل', en: 'the house' },
  3: { ar: 'المدرسة', en: 'the school' },
  4: { ar: 'المطعم', en: 'the restaurant' },
  5: { ar: 'السوبرماركت', en: 'the supermarket' }
};

const LEVEL_STARTS = {
  1: { x: 30, y: 0, z: 95 },
  2: { x: 0, y: 0, z: 0 },
  3: { x: 0, y: 0, z: 0 },
  4: { x: 0, y: 0, z: 0 },
  5: { x: 0, y: 0, z: 0 }
};

const CITY_MAP = {
  width: 220,
  height: 260,
  left: 12,
  right: 208,
  top: 16,
  bottom: 244,
  minX: -230,
  maxX: 230,
  minZ: -255,
  maxZ: 335
};

function cityMapPoint(x, z) {
  return {
    x: CITY_MAP.left + (x - CITY_MAP.minX) *
      (CITY_MAP.right - CITY_MAP.left) / (CITY_MAP.maxX - CITY_MAP.minX),
    y: CITY_MAP.top + (CITY_MAP.maxZ - z) *
      (CITY_MAP.bottom - CITY_MAP.top) / (CITY_MAP.maxZ - CITY_MAP.minZ)
  };
}

function createCityMap(language) {
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const svgElement = (name, attributes = {}) => {
    const element = document.createElementNS(svgNamespace, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  };
  const panel = document.createElement('section');
  panel.className = 'lw-city-map';
  panel.lang = language;
  panel.dir = language === 'ar' ? 'rtl' : 'ltr';
  panel.setAttribute('aria-label', language === 'ar' ? 'خريطة المدينة' : 'Town map');

  const header = document.createElement('div');
  header.className = 'lw-city-map-header';
  const heading = document.createElement('strong');
  heading.textContent = language === 'ar' ? 'خريطة المدينة' : 'Town map';
  const controls = document.createElement('div');
  controls.className = 'lw-city-map-controls';
  const makeMapButton = (className, label, iconMarkup) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = iconMarkup;
    return button;
  };
  const legendToggle = makeMapButton(
    'lw-city-map-action lw-city-map-legend-toggle',
    language === 'ar' ? 'إظهار مفتاح الخريطة' : 'Show map legend',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>'
  );
  legendToggle.setAttribute('aria-expanded', 'false');
  const enlargeToggle = makeMapButton(
    'lw-city-map-action lw-city-map-enlarge-toggle',
    language === 'ar' ? 'تكبير الخريطة' : 'Enlarge map',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><path d="M8 8 3 3m13 5 5-5M8 16l-5 5m13-5 5 5"/></svg>'
  );
  enlargeToggle.setAttribute('aria-pressed', 'false');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'lw-city-map-toggle';
  toggle.textContent = '−';
  toggle.setAttribute('aria-label', language === 'ar' ? 'طي الخريطة' : 'Collapse map');
  toggle.setAttribute('aria-expanded', 'true');
  controls.append(legendToggle, enlargeToggle, toggle);
  header.append(heading, controls);

  const body = document.createElement('div');
  body.className = 'lw-city-map-body';
  const map = svgElement('svg', {
    viewBox: `0 0 ${CITY_MAP.width} ${CITY_MAP.height}`,
    role: 'img',
    'aria-label': language === 'ar'
      ? 'خريطة طرق المدينة ومواقع المنزل والمدرسة والمطعم والسوبرماركت'
      : 'City map showing the house, school, restaurant, and supermarket'
  });
  map.appendChild(svgElement('rect', {
    x: 3, y: 3, width: CITY_MAP.width - 6, height: CITY_MAP.height - 6, rx: 12,
    class: 'lw-city-map-ground'
  }));
  const park = cityMapPoint(-201, 155);
  const parkEnd = cityMapPoint(-139, 105);
  map.appendChild(svgElement('rect', {
    x: park.x,
    y: park.y,
    width: parkEnd.x - park.x,
    height: parkEnd.y - park.y,
    rx: 5,
    class: 'lw-city-map-park'
  }));

  const streets = [
    { start: [30, -255], end: [30, 335], width: 15 },
    { start: [-220, 95], end: [220, 95], width: 14 },
    { start: [-185, -50], end: [185, -50], width: 11 },
    { start: [-140, -130], end: [160, -130], width: 11 },
    { start: [-215, 170], end: [135, 170], width: 12 },
    { start: [-155, 230], end: [145, 230], width: 12 },
    { start: [-150, 284], end: [115, 284], width: 14 },
    { start: [30, -203], end: [160, -203], width: 13 }
  ];
  streets.forEach(({ start, end, width }) => {
    const first = cityMapPoint(start[0], start[1]);
    const last = cityMapPoint(end[0], end[1]);
    const horizontal = start[1] === end[1];
    const roadWidth = width * (horizontal
      ? (CITY_MAP.bottom - CITY_MAP.top) / (CITY_MAP.maxZ - CITY_MAP.minZ)
      : (CITY_MAP.right - CITY_MAP.left) / (CITY_MAP.maxX - CITY_MAP.minX));
    const path = `M ${first.x} ${first.y} L ${last.x} ${last.y}`;
    map.appendChild(svgElement('path', {
      d: path,
      class: 'lw-city-map-road-edge',
      'stroke-width': roadWidth + 1.5
    }));
    map.appendChild(svgElement('path', {
      d: path,
      class: 'lw-city-map-road',
      'stroke-width': roadWidth
    }));
    map.appendChild(svgElement('path', {
      d: path,
      class: 'lw-city-map-road-marking',
      'stroke-width': 0.65
    }));
  });

  const markerColors = {
    house: '#d9b18f',
    classroom: '#86b9df',
    restaurant: '#f2a876',
    supermarket: '#ffd166'
  };
  CITY_PORTALS.forEach((portal) => {
    const position = cityMapPoint(portal.position.x, portal.position.z);
    const marker = svgElement('g', {
      class: `lw-city-map-marker${portal.id === 'supermarket' ? ' is-supermarket' : ''}`,
      transform: `translate(${position.x} ${position.y})`
    });
    const title = svgElement('title');
    title.textContent = portal.title[language];
    marker.append(title, svgElement('circle', {
      r: portal.id === 'supermarket' ? 5.3 : 4.2,
      fill: markerColors[portal.id]
    }));
    map.appendChild(marker);
  });

  const start = cityMapPoint(LEVEL_STARTS[1].x, LEVEL_STARTS[1].z);
  const playerMarker = svgElement('g', {
    class: 'lw-city-map-player',
    transform: `translate(${start.x} ${start.y})`
  });
  playerMarker.append(
    svgElement('circle', { r: 6.2, class: 'lw-city-map-player-halo' }),
    svgElement('path', { d: 'M 0 -7 L 4 4 L 0 2 L -4 4 Z' })
  );
  map.appendChild(playerMarker);

  const compass = document.createElement('span');
  compass.className = 'lw-city-map-compass';
  compass.textContent = language === 'ar' ? 'شمال' : 'North';
  const compassIcon = svgElement('svg', {
    viewBox: '0 0 24 24',
    'aria-hidden': 'true'
  });
  compassIcon.appendChild(svgElement('path', { d: 'M12 3 6 21l6-4 6 4-6-18Z' }));
  compass.prepend(compassIcon);

  const legend = document.createElement('div');
  legend.className = 'lw-city-map-legend';
  const legendItems = [
    { label: language === 'ar' ? 'أنت' : 'You', color: '#ffb36b', player: true },
    ...CITY_PORTALS.map((portal) => ({
      label: portal.title[language],
      color: markerColors[portal.id],
      id: portal.id
    }))
  ];
  legendItems.forEach(({ label, color, player, id }) => {
    const item = document.createElement('span');
    item.className = `lw-city-map-legend-item${id === 'supermarket' ? ' is-supermarket' : ''}`;
    const dot = document.createElement('i');
    dot.style.setProperty('--lw-map-marker', color);
    if (player) dot.classList.add('is-player');
    const text = document.createElement('bdi');
    text.textContent = label;
    item.append(dot, text);
    legend.appendChild(item);
  });

  body.append(map, compass, legend);
  panel.append(header, body);
  legendToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const expanded = panel.classList.toggle('is-legend-open');
    legendToggle.setAttribute('aria-expanded', String(expanded));
    legendToggle.setAttribute(
      'aria-label',
      expanded
        ? language === 'ar' ? 'إخفاء مفتاح الخريطة' : 'Hide map legend'
        : language === 'ar' ? 'إظهار مفتاح الخريطة' : 'Show map legend'
    );
  });
  const closeEnlargedMap = () => {
    panel.classList.remove('is-enlarged');
    document.body.classList.remove('map-overlay-open');
    enlargeToggle.setAttribute('aria-pressed', 'false');
  };
  enlargeToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const enlarged = panel.classList.toggle('is-enlarged');
    document.body.classList.toggle('map-overlay-open', enlarged);
    enlargeToggle.setAttribute('aria-pressed', String(enlarged));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('is-enlarged')) closeEnlargedMap();
  });
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const collapsed = panel.classList.toggle('is-collapsed');
    body.hidden = collapsed;
    toggle.textContent = collapsed ? '+' : '−';
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute(
      'aria-label',
      collapsed
        ? language === 'ar' ? 'توسيع الخريطة' : 'Expand map'
        : language === 'ar' ? 'طي الخريطة' : 'Collapse map'
    );
  });
  ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach((eventName) => {
    panel.addEventListener(eventName, (event) => event.stopPropagation());
  });

  return { panel, playerMarker };
}

const FirstPersonPlayer = React.forwardRef(function FirstPersonPlayer({
  joystickInput = { x: 0, y: 0 },
  initialPosition = { x: 0, y: 1, z: 0 },
  eyeHeight = 1.5,
  cameraLerp = 0.2,
  isPaused = false,
  isMobile = false
}, bodyRef) {
  const { camera } = useThree();
  const { world } = useRapier();
  const [, getKeys] = useKeyboardControls();
  const walkSpeed = 8;
  const runSpeed = 17.6;
  const jumpImpulse = 6;
  const groundRayLength = 1.05;
  const shiftPressed = React.useRef(false);
  const ready = React.useRef(false);
  const grounded = React.useRef(false);
  const movement = React.useRef(new Vector3());
  const forward = React.useRef(new Vector3());
  const right = React.useRef(new Vector3());
  const target = React.useRef(new Vector3());
  const rotation = React.useRef(new Euler(0, 0, 0, 'YXZ'));
  const groundRay = React.useRef(
    new Rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 })
  );
  const pointerLockRef = React.useRef();
  const stepTimer = React.useRef(1);

  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Shift') shiftPressed.current = true;
    };
    const onKeyUp = (event) => {
      if (event.key === 'Shift') shiftPressed.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const readyTimer = window.setTimeout(() => {
      ready.current = true;
    }, 160);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.clearTimeout(readyTimer);
    };
  }, []);

  React.useEffect(() => {
    if (!isMobile) return undefined;
    let active = false;
    let touch = null;
    const onTouchStart = (event) => {
      const current = event.changedTouches[0];
      if (current && current.clientX > window.innerWidth / 2) {
        active = true;
        touch = current;
      }
    };
    const onTouchMove = (event) => {
      if (!active || !touch) return;
      const current = Array.from(event.touches).find((item) => item.identifier === touch.identifier);
      if (!current) return;
      const deltaX = current.clientX - touch.clientX;
      const deltaY = current.clientY - touch.clientY;
      touch = current;
      rotation.current.setFromQuaternion(camera.quaternion);
      rotation.current.y -= deltaX * 0.005;
      rotation.current.x -= deltaY * 0.005;
      const limit = Math.PI / 2 - 0.05;
      rotation.current.x = Math.max(-limit, Math.min(limit, rotation.current.x));
      camera.quaternion.setFromEuler(rotation.current);
    };
    const onTouchEnd = (event) => {
      if (touch && !Array.from(event.touches).some((item) => item.identifier === touch.identifier)) {
        active = false;
        touch = null;
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [camera, isMobile]);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (isPaused) {
      if (body) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setGravityScale(0, true);
      }
      return;
    }
    if (!body) return;
    body.setGravityScale(1, true);
    if (!ready.current) return;

    const position = body.translation();
    groundRay.current.origin.x = position.x;
    groundRay.current.origin.y = position.y;
    groundRay.current.origin.z = position.z;
    grounded.current = world.castRay(groundRay.current, groundRayLength, true) !== null;

    const {
      forward: moveForward,
      backward: moveBackward,
      left: moveLeft,
      right: moveRight,
      jump
    } = getKeys();
    const sprint = shiftPressed.current || Math.abs(joystickInput.x) > 0.7 ||
      Math.abs(joystickInput.y) > 0.7;
    const speed = sprint ? runSpeed : walkSpeed;
    const forwardInput = (moveForward ? 1 : 0) - (moveBackward ? 1 : 0) - joystickInput.y;
    const sideInput = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0) + joystickInput.x;

    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();
    movement.current.set(0, 0, 0);
    movement.current.addScaledVector(forward.current, forwardInput);
    movement.current.addScaledVector(right.current, sideInput);
    if (movement.current.length() > 0.1) movement.current.normalize();
    else movement.current.set(0, 0, 0);
    movement.current.multiplyScalar(speed);

    const velocity = body.linvel();
    body.setLinvel({ x: movement.current.x, y: velocity.y, z: movement.current.z }, true);
    if ((Math.abs(sideInput) > 0.1 || Math.abs(forwardInput) > 0.1) && grounded.current) {
      stepTimer.current += delta;
      const interval = sprint ? 0.3 : 0.6;
      if (stepTimer.current >= interval) {
        audio.playSFX('footstep', 0.1);
        stepTimer.current = 0;
      }
    } else {
      stepTimer.current = 1;
    }
    if (jump && grounded.current) {
      body.applyImpulse({ x: 0, y: jumpImpulse, z: 0 }, true);
      grounded.current = false;
    }

    target.current.set(position.x, position.y + eyeHeight, position.z);
    camera.position.lerp(target.current, isMobile ? 1 : cameraLerp);
  });

  return h(React.Fragment, null,
    h(RigidBody, {
      ref: bodyRef,
      name: 'player',
      type: 'dynamic',
      colliders: false,
      position: [initialPosition.x, initialPosition.y + eyeHeight + 2, initialPosition.z],
      mass: 1,
      linearDamping: 1.5,
      angularDamping: 1.5,
      canSleep: false,
      lockRotations: true,
      ccd: true
    }, h(CapsuleCollider, { args: [0.8, 0.4] })),
    !isPaused && !isMobile
      ? h(PointerLockControls, { ref: pointerLockRef })
      : null
  );
});

function useWorldModel(modelPath, collisionPath, collisionNode, playerStart, onPositionsReady) {
  const { scene, materials } = useGLTF(modelPath, true);
  const { nodes } = useGLTF(collisionPath, true);
  const model = React.useMemo(() => {
    const clone = scene.clone();
    clone.traverse((object) => {
      if (object.isMesh) {
        const isCityModel = modelPath === '/Grounds/LinguaCity.glb';
        object.receiveShadow = isCityModel;
        object.castShadow = isCityModel &&
          !/ground|sea|street|canal|boundary|asphalt|sidewalk|road|grass|collision|^I_/i.test(object.name);
        if (materials.MazeMat) object.material = materials.MazeMat;
      }
      if (modelPath === '/Grounds/Restaurant.glb' &&
        (object.name === 'I_Male' || object.name === 'I_Female')) {
        object.visible = false;
      }
    });
    return clone;
  }, [scene, materials, modelPath]);

  React.useEffect(() => {
    onPositionsReady({ playerStart });
  }, [onPositionsReady, playerStart]);

  return h(React.Fragment, null,
    h('primitive', { object: model }),
    h(RigidBody, {
      type: 'fixed',
      colliders: 'trimesh',
      friction: 1,
      collisionGroups
    }, nodes[collisionNode]
      ? h('mesh', { geometry: nodes[collisionNode].geometry },
        h('meshBasicMaterial', { visible: false }))
      : null)
  );
}

function LevelWorld({ level, onPositionsReady, isPaused }) {
  if (level === 1) {
    return h(CityWorld, { onPositionsReady, isPaused });
  }
  if (level === 2) {
    return h(HouseWorld, { onPositionsReady });
  }
  if (level === 3) {
    return h(ClassroomWorld, { onPositionsReady });
  }
  if (level === 4) {
    return h(RestaurantWorld, { onPositionsReady });
  }
  if (level === 5) {
    return h(SupermarketWorld, { onPositionsReady });
  }
  return null;
}

function CityWorld({ onPositionsReady, isPaused }) {
  return h(React.Fragment, null,
    h('fog', { attach: 'fog', args: ['#c5d0cf', 260, 760] }),
    h('ambientLight', { intensity: 0.25, color: 0xffffff }),
    h('hemisphereLight', {
      skyColor: 0xa9d5ea,
      groundColor: 0x827464,
      intensity: 0.45
    }),
    h('directionalLight', {
      position: [-80, 150, 90],
      intensity: 1.7,
      color: 0xffedcf,
      castShadow: true,
      'shadow-mapSize-width': 2048,
      'shadow-mapSize-height': 2048,
      'shadow-camera-near': 1,
      'shadow-camera-far': 760,
      'shadow-camera-left': -320,
      'shadow-camera-right': 320,
      'shadow-camera-top': 380,
      'shadow-camera-bottom': -380,
      'shadow-bias': -0.00015
    }),
    useWorldModel(
      '/Grounds/LinguaCity.glb',
      '/Grounds/LinguaCity_Collision.glb',
      'city_Collision',
      LEVEL_STARTS[1],
      onPositionsReady
    ),
    h(CityVehicles, { isPaused })
  );
}

function HouseWorld({ onPositionsReady }) {
  return useWorldModel(
    '/Grounds/House.glb',
    '/Grounds/House_Collision.glb',
    'house_Collision',
    LEVEL_STARTS[2],
    onPositionsReady
  );
}

function ClassroomWorld({ onPositionsReady }) {
  return useWorldModel(
    '/Grounds/Classroom.glb',
    '/Grounds/Classroom_Collision.glb',
    'classroom_Collision',
    LEVEL_STARTS[3],
    onPositionsReady
  );
}

function RestaurantWorld({ onPositionsReady }) {
  return useWorldModel(
    '/Grounds/Restaurant.glb',
    '/Grounds/Restaurant_Collision.glb',
    'restaurant_Collision',
    LEVEL_STARTS[4],
    onPositionsReady
  );
}

function SupermarketWorld({ onPositionsReady }) {
  return useWorldModel(
    '/Grounds/Supermarket.glb',
    '/Grounds/Supermarket_Collision.glb',
    'supermarket_Collision',
    LEVEL_STARTS[5],
    onPositionsReady
  );
}

function DetailedCar({ vehicle, vehicleRef }) {
  const wheelRefs = React.useRef([]);
  const style = vehicle.style === 'van'
    ? { length: 5, cabinLength: 2.85, cabinX: -0.05, cabinHeight: 0.78, windowCount: 3 }
    : vehicle.style === 'hatchback'
      ? { length: 4.25, cabinLength: 2.2, cabinX: -0.22, cabinHeight: 0.6, windowCount: 2 }
      : { length: 4.55, cabinLength: 2.15, cabinX: -0.2, cabinHeight: 0.6, windowCount: 2 };
  const paint = () => h('meshPhysicalMaterial', {
    color: vehicle.color,
    metalness: 0.28,
    roughness: 0.34,
    clearcoat: 0.7,
    clearcoatRoughness: 0.24
  });
  const glass = () => h('meshPhysicalMaterial', {
    color: '#31505b',
    metalness: 0.18,
    roughness: 0.22,
    clearcoat: 0.8
  });
  const box = (key, position, size, material, rotation = [0, 0, 0]) =>
    h('mesh', { key, position, rotation, castShadow: true, receiveShadow: true },
      h('boxGeometry', { args: size }), material);
  const wheelNodes = [-1, 1].flatMap((side, sideIndex) =>
    [-1, 1].map((along, alongIndex) => {
      const index = sideIndex * 2 + alongIndex;
      return h('group', {
        key: `wheel-${side}-${along}`,
        ref: (node) => { wheelRefs.current[index] = node; },
        position: [along * (style.length * 0.31), 0.48, side * 0.96]
      },
      h('mesh', { scale: [0.2, 0.43, 0.43], castShadow: true },
        h('sphereGeometry', { args: [1, 16, 12] }),
        h('meshStandardMaterial', { color: '#202728', roughness: 0.92 })),
      h('mesh', {
        position: [0, 0, side * 0.19],
        rotation: [Math.PI / 2, 0, 0],
        castShadow: true
      },
      h('cylinderGeometry', { args: [0.22, 0.22, 0.07, 16] }),
      h('meshStandardMaterial', { color: '#b8c2bd', metalness: 0.76, roughness: 0.28 })));
    })
  );
  const windows = [-1, 1].flatMap((side) =>
    Array.from({ length: style.windowCount }, (_, index) => {
      const windowWidth = style.cabinLength / style.windowCount - 0.1;
      const x = style.cabinX - style.cabinLength / 2 +
        (index + 0.5) * style.cabinLength / style.windowCount;
      return h('mesh', {
        key: `window-${side}-${index}`,
        position: [x, 1.4 + (style.cabinHeight - 0.6) / 2, side * 0.72],
        castShadow: true
      },
      h('boxGeometry', { args: [windowWidth, 0.38, 0.035] }),
      glass());
    })
  );
  const windshieldY = 1.4 + (style.cabinHeight - 0.6) / 2;
  const windshields = [
    h('mesh', {
      key: 'front-windshield',
      position: [style.cabinX + style.cabinLength / 2 + 0.035, windshieldY, 0],
      rotation: [0, 0, -0.22],
      castShadow: true
    },
    h('boxGeometry', { args: [0.035, 0.4, 1.26] }),
    glass()),
    h('mesh', {
      key: 'rear-windshield',
      position: [style.cabinX - style.cabinLength / 2 - 0.035, windshieldY, 0],
      rotation: [0, 0, 0.22],
      castShadow: true
    },
    h('boxGeometry', { args: [0.035, 0.4, 1.26] }),
    glass())
  ];
  const doors = [-1, 1].flatMap((side) => [-0.55, 0.45].map((x) =>
    box(`door-seam-${side}-${x}`, [x, 0.93, side * 0.93], [0.025, 0.4, 0.025],
      h('meshStandardMaterial', { color: '#263a3c', roughness: 0.6 }))));
  const bodyParts = [
    h('mesh', {
      key: 'main-body',
      position: [0, 0.83, 0],
      scale: [style.length * 0.51, 0.42, 0.92],
      castShadow: true,
      receiveShadow: true
    }, h('sphereGeometry', { args: [1, 20, 14] }), paint()),
    h('mesh', {
      key: 'hood',
      position: [style.length * 0.29, 1.02, 0],
      scale: [0.96, 0.23, 0.88],
      castShadow: true
    }, h('sphereGeometry', { args: [1, 16, 12] }), paint()),
    h('mesh', {
      key: 'trunk',
      position: [-style.length * 0.35, 0.99, 0],
      scale: [0.72, 0.22, 0.87],
      castShadow: true
    }, h('sphereGeometry', { args: [1, 16, 12] }), paint()),
    h('mesh', {
      key: 'cabin',
      position: [style.cabinX, 1.35 + (style.cabinHeight - 0.6) / 2, 0],
      castShadow: true,
      receiveShadow: true
    },
    h('boxGeometry', { args: [style.cabinLength, style.cabinHeight, 1.42] }),
    paint()),
    h('mesh', {
      key: 'roof',
      position: [style.cabinX, 1.67 + (style.cabinHeight - 0.6) / 2, 0],
      scale: [style.cabinLength * 0.46, 0.11, 0.73],
      castShadow: true
    }, h('sphereGeometry', { args: [1, 16, 10] }), paint()),
    ...windows,
    ...windshields,
    ...doors,
    ...wheelNodes,
    ...[-1, 1].flatMap((side) => [
      box(`mirror-${side}`, [0.65, 1.35, side * 0.99], [0.24, 0.12, 0.16],
        h('meshStandardMaterial', { color: vehicle.color, metalness: 0.2, roughness: 0.38 })),
      box(`handle-${side}-front`, [0.2, 1.08, side * 0.95], [0.2, 0.045, 0.025],
        h('meshStandardMaterial', { color: '#d8d6ca', metalness: 0.7, roughness: 0.3 })),
      box(`handle-${side}-rear`, [-0.8, 1.08, side * 0.95], [0.2, 0.045, 0.025],
        h('meshStandardMaterial', { color: '#d8d6ca', metalness: 0.7, roughness: 0.3 }))
    ]),
    box('front-bumper', [style.length * 0.51, 0.58, 0], [0.16, 0.16, 1.62],
      h('meshStandardMaterial', { color: '#596263', metalness: 0.45, roughness: 0.4 })),
    box('rear-bumper', [-style.length * 0.51, 0.58, 0], [0.16, 0.16, 1.62],
      h('meshStandardMaterial', { color: '#596263', metalness: 0.45, roughness: 0.4 })),
    box('front-grille', [style.length * 0.51 + 0.015, 0.78, 0], [0.04, 0.25, 0.58],
      h('meshStandardMaterial', { color: '#202b2d', metalness: 0.35, roughness: 0.55 })),
    ...[0.72, 0.8, 0.88].map((y) =>
      box(`grille-bar-${y}`, [style.length * 0.51 + 0.04, y, 0], [0.025, 0.025, 0.44],
        h('meshStandardMaterial', { color: '#9da9a5', metalness: 0.72, roughness: 0.3 }))),
    ...[-1, 1].flatMap((side) => [
      box(`headlight-${side}`, [style.length * 0.49, 0.94, side * 0.58],
        [0.08, 0.2, 0.34],
        h('meshStandardMaterial', {
          color: '#fff2c7',
          emissive: '#e5bc69',
          emissiveIntensity: 0.3,
          roughness: 0.28
        })),
      box(`tail-light-${side}`, [-style.length * 0.49, 0.91, side * 0.58],
        [0.08, 0.22, 0.28],
        h('meshStandardMaterial', {
          color: '#bf493f',
          emissive: '#7c1915',
          emissiveIntensity: 0.2,
          roughness: 0.3
        }))
    ])
  ];

  if (vehicle.style === 'taxi') {
    bodyParts.push(box('taxi-sign', [-0.18, 1.82, 0], [0.62, 0.18, 0.34],
      h('meshStandardMaterial', {
        color: '#f4c343',
        emissive: '#8b6915',
        emissiveIntensity: 0.15,
        roughness: 0.42
      })));
  }

  useFrame((_, delta) => {
    if (!vehicle.wheelSpeed) return;
    wheelRefs.current.forEach((wheel) => {
      if (wheel) wheel.rotation.z -= vehicle.wheelSpeed * delta / 0.43;
    });
  });

  return h('group', {
    ref: vehicleRef,
    name: 'I_car',
    position: vehicle.position,
    rotation: [0, vehicle.rotation || 0, 0]
  }, ...bodyParts);
}

const PARKED_CARS = [
  { id: 'parked-sedan', position: [-75, 0, 91], rotation: 0, style: 'sedan', color: '#54879a' },
  { id: 'parked-hatchback', position: [152, 0, 99], rotation: Math.PI, style: 'hatchback', color: '#ddd8c9' },
  { id: 'parked-van', position: [33, 0, 18], rotation: -Math.PI / 2, style: 'van', color: '#bd6252' },
  { id: 'parked-taxi', position: [33, 0, -94], rotation: -Math.PI / 2, style: 'taxi', color: '#e1ad45' }
];

const MOVING_CARS = [
  {
    id: 'traffic-sedan',
    axis: 'x',
    lane: -54,
    min: -180,
    max: 180,
    direction: 1,
    speed: 6.5,
    start: -145,
    style: 'sedan',
    color: '#477d68'
  },
  {
    id: 'traffic-hatchback',
    axis: 'x',
    lane: -46,
    min: -180,
    max: 180,
    direction: -1,
    speed: 5.5,
    start: 130,
    style: 'hatchback',
    color: '#647eae'
  },
  {
    id: 'traffic-van',
    axis: 'x',
    lane: 227,
    min: -145,
    max: 135,
    direction: 1,
    speed: 5.2,
    start: -92,
    style: 'van',
    color: '#e4dfd1'
  },
  {
    id: 'traffic-taxi',
    axis: 'x',
    lane: 233,
    min: -145,
    max: 135,
    direction: -1,
    speed: 6,
    start: 95,
    style: 'taxi',
    color: '#c95f4c'
  }
];

function MovingCar({ vehicle, isPaused }) {
  const groupRef = React.useRef(null);
  const distance = React.useRef(vehicle.direction > 0
    ? vehicle.start - vehicle.min
    : vehicle.max - vehicle.start);
  const span = vehicle.max - vehicle.min;
  const rotation = vehicle.direction > 0 ? 0 : Math.PI;
  const position = vehicle.axis === 'x'
    ? [vehicle.start, 0, vehicle.lane]
    : [vehicle.lane, 0, vehicle.start];

  useFrame((_, delta) => {
    if (isPaused || !groupRef.current) return;
    distance.current = (distance.current + vehicle.speed * delta) % span;
    const along = vehicle.direction > 0
      ? vehicle.min + distance.current
      : vehicle.max - distance.current;
    if (vehicle.axis === 'x') groupRef.current.position.x = along;
    else groupRef.current.position.z = along;
  });

  return h(DetailedCar, {
    vehicle: {
      ...vehicle,
      position,
      rotation,
      wheelSpeed: vehicle.speed * vehicle.direction
    },
    vehicleRef: groupRef
  });
}

function CityVehicles({ isPaused }) {
  return h(React.Fragment, null,
    PARKED_CARS.map((vehicle) => h(DetailedCar, { key: vehicle.id, vehicle })),
    MOVING_CARS.map((vehicle) =>
      h(MovingCar, { key: vehicle.id, vehicle, isPaused }))
  );
}

const WORLD_NPCS = {
  1: [
    {
      id: 'max',
      npcKey: 'max',
      name: { ar: 'ماكس بيكر', en: 'Max Becker' },
      model: 'Ranger',
      path: [{ x: 27, z: 91 }, { x: 36, z: 91 }, { x: 36, z: 100 }, { x: 27, z: 100 }],
      speed: 1.2,
      walkAnimation: 'Walking_A'
    },
    {
      id: 'city-roamer-1',
      name: { ar: 'مقيم في المدينة', en: 'Town resident' },
      model: 'Rogue',
      path: [{ x: 17, z: 93 }, { x: 24, z: 93 }, { x: 24, z: 99 }, { x: 17, z: 99 }],
      speed: 1.05,
      walkAnimation: 'Walking_B'
    },
    {
      id: 'city-roamer-2',
      name: { ar: 'مقيم في المدينة', en: 'Town resident' },
      model: 'Mage',
      path: [{ x: 38, z: 106 }, { x: 45, z: 106 }, { x: 45, z: 112 }, { x: 38, z: 112 }],
      speed: 1.1,
      walkAnimation: 'Walking_C'
    }
  ],
  2: [{
    id: 'herr_weber',
    npcKey: 'herr_weber',
    name: { ar: 'السيد هاينريش فيبر', en: 'Herr Heinrich Weber' },
    model: 'Knight',
    path: [{ x: -2, z: 4 }, { x: 2, z: 4 }, { x: 2, z: 8 }, { x: -2, z: 8 }],
    speed: 0.75,
    walkAnimation: 'Walking_B'
  }, {
    id: 'house-visitor',
    name: { ar: 'زائر', en: 'Visitor' },
    model: 'Rogue',
    path: [{ x: 4, z: 3 }, { x: 7, z: 3 }, { x: 7, z: 7 }, { x: 4, z: 7 }],
    speed: 0.65,
    walkAnimation: 'Walking_C',
    activityAnimation: 'Interact',
    stopDuration: 2.4
  }],
  3: [{
    id: 'lukas',
    npcKey: 'lukas',
    name: { ar: 'لوكاس فاغنر', en: 'Lukas Wagner' },
    model: 'Mage',
    path: [{ x: -3, z: -2 }, { x: 3, z: -2 }, { x: 3, z: 2 }, { x: -3, z: 2 }],
    speed: 0.85,
    walkAnimation: 'Walking_A',
    activityAnimation: 'Interact',
    stopDuration: 2
  }, {
    id: 'classmate-1',
    name: { ar: 'طالب', en: 'Student' },
    model: 'Ranger',
    path: [{ x: -7, z: -4 }, { x: -4, z: -4 }, { x: -4, z: 1 }, { x: -7, z: 1 }],
    speed: 0.6,
    walkAnimation: 'Walking_B',
    activityAnimation: 'Use_Item',
    stopDuration: 3
  }],
  4: [{
    id: 'sophie',
    npcKey: 'sophie',
    name: { ar: 'صوفي مولر', en: 'Sophie Müller' },
    model: 'Rogue',
    path: [{ x: -3, z: 1 }, { x: 2, z: 1 }, { x: 2, z: 5 }, { x: -3, z: 5 }],
    speed: 0.8,
    walkAnimation: 'Walking_C',
    activityAnimation: 'Use_Item',
    stopDuration: 2.2
  }, {
    id: 'karim',
    npcKey: 'karim',
    name: { ar: 'كريم يلماز', en: 'Karim Yilmaz' },
    model: 'Knight',
    path: [{ x: 6, z: 4 }, { x: 8, z: 4 }, { x: 8, z: 7 }, { x: 6, z: 7 }],
    speed: 0.55,
    walkAnimation: 'Walking_B',
    activityAnimation: 'Use_Item',
    stopDuration: 3.6,
    initialWait: 1.4
  }, {
    id: 'maria',
    npcKey: 'maria',
    name: { ar: 'ماريا فيشر', en: 'Maria Fischer' },
    model: 'Ranger',
    path: [{ x: -6, z: 2 }, { x: 4, z: 2 }, { x: 4, z: 7 }, { x: -6, z: 7 }],
    speed: 0.9,
    walkAnimation: 'Walking_A',
    activityAnimation: 'Interact',
    stopDuration: 1.8
  }, {
    id: 'restaurant-diner',
    name: { ar: 'زبون', en: 'Diner' },
    model: 'Mage',
    path: [{ x: 9, z: 2 }, { x: 10, z: 2 }, { x: 10, z: 5 }, { x: 9, z: 5 }],
    speed: 0.4,
    walkAnimation: 'Walking_C',
    activityAnimation: 'Use_Item',
    stopDuration: 4,
    initialWait: 2
  }, {
    id: 'restaurant-leaving-guest',
    name: { ar: 'مغادر', en: 'Leaving guest' },
    model: 'Barbarian',
    path: [{ x: 8, z: 8 }, { x: 8, z: 13 }, { x: 3, z: 19 }, { x: -5, z: 25 }],
    speed: 0.8,
    walkAnimation: 'Walking_B',
    leaveAfterRoute: true,
    initialWait: 5
  }],
  5: [{
    id: 'hanna',
    npcKey: 'hanna',
    name: { ar: 'هانا شنايدر', en: 'Hanna Schneider' },
    model: 'Barbarian',
    path: [{ x: -3, z: 2 }, { x: 3, z: 2 }, { x: 3, z: 7 }, { x: -3, z: 7 }],
    speed: 0.8,
    walkAnimation: 'Walking_B',
    activityAnimation: 'Interact',
    stopDuration: 2
  }, {
    id: 'leon',
    npcKey: 'leon',
    name: { ar: 'ليون هارتمان', en: 'Leon Hartmann' },
    model: 'Rogue',
    path: [{ x: -7, z: 5 }, { x: -4, z: 5 }, { x: -4, z: 10 }, { x: -7, z: 10 }],
    speed: 0.55,
    walkAnimation: 'Walking_C',
    activityAnimation: 'PickUp',
    stopDuration: 3.4,
    initialWait: 1.2
  }, {
    id: 'aylin',
    npcKey: 'aylin',
    name: { ar: 'أيلين دمير', en: 'Aylin Demir' },
    model: 'Mage',
    path: [{ x: 5, z: 10 }, { x: 8, z: 10 }, { x: 8, z: 15 }, { x: 5, z: 15 }],
    speed: 0.6,
    walkAnimation: 'Walking_A',
    activityAnimation: 'PickUp',
    stopDuration: 3,
    initialWait: 2.5
  }, {
    id: 'supermarket-shopper',
    name: { ar: 'متسوق', en: 'Shopper' },
    model: 'Knight',
    path: [{ x: 10, z: 8 }, { x: 12, z: 8 }, { x: 12, z: 13 }, { x: 10, z: 13 }],
    speed: 0.5,
    walkAnimation: 'Walking_B',
    activityAnimation: 'PickUp',
    stopDuration: 3.2,
    initialWait: 3
  }, {
    id: 'supermarket-leaving-shopper',
    name: { ar: 'متسوق مغادر', en: 'Leaving shopper' },
    model: 'Ranger',
    path: [{ x: -9, z: 10 }, { x: -9, z: 17 }, { x: -4, z: 25 }, { x: 0, z: 42 }],
    speed: 0.9,
    walkAnimation: 'Walking_C',
    leaveAfterRoute: true,
    initialWait: 6
  }]
};

function bindNpcAnimation(clip, nodes) {
  if (!clip) return [];
  return clip.tracks.map((track) => {
    const property = ['.quaternion', '.position', '.scale']
      .find((suffix) => track.name.endsWith(suffix));
    if (!property) return null;
    const node = nodes.get(track.name.slice(0, -property.length));
    return node ? { node, property, interpolant: track.createInterpolant() } : null;
  }).filter(Boolean);
}

function applyNpcAnimation(tracks, time, duration) {
  if (!duration) return;
  const clipTime = time % duration;
  tracks.forEach(({ node, property, interpolant }) => {
    const value = interpolant.evaluate(clipTime);
    if (property === '.quaternion') node.quaternion.fromArray(value);
    else if (property === '.position') node.position.fromArray(value);
    else node.scale.fromArray(value);
  });
}

function NPCCharacter({
  npc,
  movementAnimations,
  idleAnimations,
  onPosition,
  playerBody,
  isPaused,
  isEngaged
}) {
  const { scene } = useGLTF(`/Grounds/NPC/${npc.model}.glb`, true);
  const groupRef = React.useRef(null);
  const routeIndex = React.useRef(1);
  const waitTime = React.useRef(npc.initialWait ?? 0.5);
  const animationTime = React.useRef(0);
  const animationMode = React.useRef(null);
  const hasLeft = React.useRef(false);
  const model = React.useMemo(() => scene.clone(true), [scene]);
  const nodes = React.useMemo(() => {
    const lookup = new Map();
    model.traverse((node) => {
      if (node.name) lookup.set(node.name, node);
      if (node.isMesh || node.isSkinnedMesh) {
        node.castShadow = true;
        node.receiveShadow = false;
      }
    });
    model.traverse((node) => {
      if (!node.isSkinnedMesh) return;
      const skeleton = node.skeleton.clone();
      skeleton.bones = skeleton.bones.map((bone) => lookup.get(bone.name));
      node.bind(skeleton, node.bindMatrix);
    });
    return lookup;
  }, [model]);
  const walkClip = movementAnimations.find((clip) => clip.name === npc.walkAnimation) ||
    movementAnimations.find((clip) => clip.name === 'Walking_A');
  const idleClip = idleAnimations.find((clip) => clip.name === 'Idle_A') ||
    idleAnimations.find((clip) => clip.name === 'Idle_B');
  const activityClip = npc.activityAnimation
    ? idleAnimations.find((clip) => clip.name === npc.activityAnimation)
    : null;
  const interactClip = idleAnimations.find((clip) => clip.name === 'Interact');
  const walkTracks = React.useMemo(
    () => bindNpcAnimation(walkClip, nodes),
    [walkClip, nodes]
  );
  const idleTracks = React.useMemo(
    () => bindNpcAnimation(idleClip, nodes),
    [idleClip, nodes]
  );
  const activityTracks = React.useMemo(
    () => bindNpcAnimation(activityClip, nodes),
    [activityClip, nodes]
  );
  const interactTracks = React.useMemo(
    () => bindNpcAnimation(interactClip, nodes),
    [interactClip, nodes]
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || hasLeft.current) return;

    let walking = false;
    if (!isPaused && !isEngaged && npc.path.length > 1) {
      if (waitTime.current > 0) {
        waitTime.current = Math.max(0, waitTime.current - delta);
      } else {
        const target = npc.path[routeIndex.current];
        const dx = target.x - group.position.x;
        const dz = target.z - group.position.z;
        const distance = Math.hypot(dx, dz);

        if (distance < 0.2) {
          if (npc.leaveAfterRoute && routeIndex.current === npc.path.length - 1) {
            hasLeft.current = true;
            group.visible = false;
            onPosition(npc.id, null, null);
            return;
          }
          routeIndex.current = (routeIndex.current + 1) % npc.path.length;
          waitTime.current = npc.stopDuration ?? 1.1;
        } else {
          const step = Math.min(distance, npc.speed * delta);
          group.position.x += (dx / distance) * step;
          group.position.z += (dz / distance) * step;
          group.rotation.y = Math.atan2(dx, dz);
          walking = true;
        }
      }
    }

    if (isEngaged) {
      const player = playerBody.current && playerBody.current.translation();
      if (player) {
        const dx = player.x - group.position.x;
        const dz = player.z - group.position.z;
        if (Math.hypot(dx, dz) > 0.01) group.rotation.y = Math.atan2(dx, dz);
      }
    }

    onPosition(npc.id, group.position.x, group.position.z);
    if (isPaused) return;
    const mode = isEngaged
      ? 'interact'
      : walking
        ? 'walk'
        : npc.activityAnimation
          ? 'activity'
          : 'idle';
    if (animationMode.current !== mode) {
      animationMode.current = mode;
      animationTime.current = 0;
    }
    animationTime.current += delta;
    const clip = mode === 'walk'
      ? walkClip
      : mode === 'interact'
        ? interactClip
        : mode === 'activity'
          ? activityClip
          : idleClip;
    const tracks = mode === 'walk'
      ? walkTracks
      : mode === 'interact'
        ? interactTracks
        : mode === 'activity'
          ? activityTracks
          : idleTracks;
    applyNpcAnimation(tracks, animationTime.current, clip && clip.duration);
  });

  return h('group', {
    ref: groupRef,
    position: [npc.path[0].x, 0, npc.path[0].z]
  },
    h('primitive', { object: model }));
}

function WorldExplorer({
  joystickInput,
  currentLevel,
  onLevelComplete,
  onObjectClick,
  isPaused,
  isMobile
}) {
  const playerBody = React.useRef(null);
  const [positions, setPositions] = React.useState(null);
  const [level, setLevel] = React.useState(currentLevel);
  const [isLoading, setIsLoading] = React.useState(false);
  const [nearbyPortal, setNearbyPortal] = React.useState(null);
  const [nearbyNpc, setNearbyNpc] = React.useState(null);
  const [engagedNpcKey, setEngagedNpcKey] = React.useState(null);
  const [npcSpeech, setNpcSpeech] = React.useState(null);
  const firstScene = React.useRef(true);
  const pendingSpawn = React.useRef(null);
  const currentPortal = React.useRef(null);
  const currentNpc = React.useRef(null);
  const npcPositions = React.useRef(new Map());
  const speechBubbleElement = React.useRef(null);
  const interactionPromptElement = React.useRef(null);
  const interactionPromptNpcId = React.useRef(null);
  const cityMapElement = React.useRef(null);
  const cityMapPlayerMarker = React.useRef(null);
  const speechSequence = React.useRef(0);
  const chatOpen = React.useRef(false);
  const screenPosition = React.useMemo(() => new Vector3(), []);
  const mapDirection = React.useMemo(() => new Vector3(), []);
  const loadingRef = React.useRef(false);
  const readyLevel = React.useRef(null);
  const { camera, gl } = useThree();
  const { animations: movementAnimations } = useGLTF('/Grounds/NPC/Movement.glb', true);
  const { animations: idleAnimations } = useGLTF('/Grounds/NPC/General.glb', true);
  const activeNpcs = WORLD_NPCS[level] || [];
  const language = localStorage.getItem('lw_support_language') === 'en' ? 'en' : 'ar';

  const updateNpcPosition = React.useCallback((id, x, z) => {
    if (typeof x !== 'number' || typeof z !== 'number') {
      npcPositions.current.delete(id);
      return;
    }
    let position = npcPositions.current.get(id);
    if (!position) {
      position = { x, z };
      npcPositions.current.set(id, position);
    } else {
      position.x = x;
      position.z = z;
    }
  }, []);

  React.useEffect(() => {
    if (currentLevel !== null && currentLevel !== level) setLevel(currentLevel);
  }, [currentLevel]);

  React.useEffect(() => {
    if (level !== 1) return undefined;
    const cityMap = createCityMap(language);
    document.body.appendChild(cityMap.panel);
    cityMapElement.current = cityMap.panel;
    cityMapPlayerMarker.current = cityMap.playerMarker;
    return () => {
      cityMap.panel.remove();
      if (cityMapElement.current === cityMap.panel) cityMapElement.current = null;
      if (cityMapPlayerMarker.current === cityMap.playerMarker) {
        cityMapPlayerMarker.current = null;
      }
    };
  }, [language, level]);

  React.useEffect(() => {
    const location = {};
    window.GermanWorldLocation = location;
    return () => {
      if (window.GermanWorldLocation === location) {
        delete window.GermanWorldLocation;
      }
    };
  }, []);

  React.useEffect(() => {
    const onNpcSpeech = (event) => {
      const { npcKey, text } = event.detail || {};
      const target = activeNpcs.find((npc) => npc.npcKey === npcKey);
      if (!target || typeof text !== 'string' || !text.trim()) return;
      speechSequence.current += 1;
      setNpcSpeech({
        npcId: target.id,
        text: text.trim().slice(0, 240),
        sequence: speechSequence.current
      });
    };
    const onChatState = (event) => {
      chatOpen.current = Boolean(event.detail && event.detail.open);
      setEngagedNpcKey(chatOpen.current ? event.detail.npcKey : null);
      if (interactionPromptElement.current) {
        interactionPromptElement.current.style.display = chatOpen.current ? 'none' : '';
      }
      if (cityMapElement.current) {
        cityMapElement.current.style.display = chatOpen.current ? 'none' : '';
      }
    };
    window.addEventListener('german-npc-speech', onNpcSpeech);
    window.addEventListener('german-npc-chat-state', onChatState);
    return () => {
      window.removeEventListener('german-npc-speech', onNpcSpeech);
      window.removeEventListener('german-npc-chat-state', onChatState);
    };
  }, [activeNpcs]);

  React.useEffect(() => {
    if (!npcSpeech) return undefined;
    const bubble = document.createElement('div');
    bubble.className = 'lw-npc-speech-bubble';
    bubble.setAttribute('role', 'status');
    bubble.setAttribute('aria-live', 'polite');
    const text = document.createElement('bdi');
    text.lang = 'de';
    text.dir = 'ltr';
    text.textContent = npcSpeech.text;
    bubble.appendChild(text);
    document.body.appendChild(bubble);
    speechBubbleElement.current = bubble;

    const timeout = window.setTimeout(() => {
      setNpcSpeech((current) => current && current.sequence === npcSpeech.sequence ? null : current);
    }, 6500);
    return () => {
      window.clearTimeout(timeout);
      bubble.remove();
      if (speechBubbleElement.current === bubble) speechBubbleElement.current = null;
    };
  }, [npcSpeech]);

  React.useEffect(() => {
    setNpcSpeech(null);
  }, [level]);

  useFrame(() => {
    const player = playerBody.current && playerBody.current.translation();
    if (level === 1 && player && cityMapPlayerMarker.current) {
      const position = cityMapPoint(player.x, player.z);
      camera.getWorldDirection(mapDirection);
      const heading = Math.atan2(mapDirection.x, -mapDirection.z) * 180 / Math.PI;
      cityMapPlayerMarker.current.setAttribute(
        'transform',
        `translate(${position.x} ${position.y}) rotate(${heading})`
      );
    }

    const canvas = gl.domElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const positionElement = (element, npcId, height) => {
      if (!element || !npcId) return;
      const position = npcPositions.current.get(npcId);
      if (!position) {
        element.style.display = 'none';
        return;
      }
      screenPosition.set(position.x, height, position.z).project(camera);
      const visible = screenPosition.z >= -1 && screenPosition.z <= 1
        && screenPosition.x >= -1.15 && screenPosition.x <= 1.15
        && screenPosition.y >= -1.15 && screenPosition.y <= 1.15;
      if (!visible) {
        element.style.display = 'none';
        return;
      }
      element.style.display = 'block';
      element.style.left = `${rect.left + (screenPosition.x + 1) * rect.width / 2}px`;
      element.style.top = `${rect.top + (1 - screenPosition.y) * rect.height / 2}px`;
    };

    const prompt = interactionPromptElement.current;
    if (prompt && interactionPromptNpcId.current) {
      if (chatOpen.current) prompt.style.display = 'none';
      else positionElement(prompt, interactionPromptNpcId.current, 1.35);
    }
    if (npcSpeech && speechBubbleElement.current) {
      positionElement(speechBubbleElement.current, npcSpeech.npcId, 2.25);
    }
  });

  const changeLevel = React.useCallback((nextLevel, markComplete = true) => {
    if (loadingRef.current || nextLevel === level) return;
    loadingRef.current = true;
    window.dispatchEvent(new CustomEvent('level-loading-start'));
    window.setTimeout(() => {
      if (markComplete && level && onLevelComplete) onLevelComplete(level);
      setIsLoading(true);
      setLevel(nextLevel);
    }, 100);
  }, [level, onLevelComplete]);

  const onPositionsReady = React.useCallback((data) => {
    if (readyLevel.current === level) return;
    readyLevel.current = level;
    setPositions(data);
    window.dispatchEvent(new CustomEvent('level-loading-end'));
    if (firstScene.current) {
      firstScene.current = false;
      return;
    }
    const spawn = pendingSpawn.current || data.playerStart;
    pendingSpawn.current = null;
    if (playerBody.current) {
      playerBody.current.setTranslation({ x: spawn.x, y: spawn.y, z: spawn.z }, true);
      playerBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    loadingRef.current = false;
    setIsLoading(false);
  }, [level]);

  useFrame(() => {
    if (!positions || !playerBody.current || isLoading || isPaused) return;
    const player = playerBody.current.translation();
    const gameLocation = window.GermanWorldLocation;
    if (gameLocation) {
      gameLocation.level = level;
      gameLocation.x = player.x;
      gameLocation.z = player.z;
    }
    if (level === 1 && cityMapPlayerMarker.current) {
      const mapPosition = cityMapPoint(player.x, player.z);
      cityMapPlayerMarker.current.setAttribute(
        'transform',
        `translate(${mapPosition.x} ${mapPosition.y})`
      );
    }
    let match = null;
    let closestNpc = null;
    let closestNpcDistance = 4.5;

    activeNpcs.forEach((npc) => {
      if (!npc.npcKey) return;
      const position = npcPositions.current.get(npc.id);
      if (!position) return;
      const distance = Math.hypot(player.x - position.x, player.z - position.z);
      if (distance < closestNpcDistance) {
        closestNpc = npc;
        closestNpcDistance = distance;
      }
    });

    if (!closestNpc && level === 1) {
      match = CITY_PORTALS.find((portal) => {
        const dx = player.x - portal.position.x;
        const dz = player.z - portal.position.z;
        return dx * dx + dz * dz <= portal.radius * portal.radius;
      }) || null;
    } else if (!closestNpc) {
      const exit = INTERIOR_EXITS[level];
      if (exit) {
        const dx = player.x - exit.position.x;
        const dz = player.z - exit.position.z;
        if (dx * dx + dz * dz <= exit.radius * exit.radius) {
          match = {
            id: `exit-${level}`,
            targetLevel: 1,
            title: LEVEL_NAMES[level],
            returnPosition: exit.returnPosition,
            isExit: true
          };
        }
      }
    }

    const nextNpcId = closestNpc ? closestNpc.id : null;
    if (currentNpc.current !== nextNpcId) {
      currentNpc.current = nextNpcId;
      setNearbyNpc(closestNpc);
    }
    const nextId = match ? match.id : null;
    if (currentPortal.current !== nextId) {
      currentPortal.current = nextId;
      setNearbyPortal(match);
    }
  });

  const enterPortal = React.useCallback((portal) => {
    if (!portal || loadingRef.current) return;
    pendingSpawn.current = portal.isExit ? portal.returnPosition : portal.spawn;
    currentPortal.current = null;
    setNearbyPortal(null);
    changeLevel(portal.targetLevel, false);
  }, [changeLevel]);

  const talkToNpc = React.useCallback((npc) => {
    if (!npc || !npc.npcKey) return;
    const openConversation = window.GermanLife && window.GermanLife.openNPCConversation;
    if (typeof openConversation !== 'function') {
      console.error(`NPC conversation is unavailable for "${npc.npcKey}".`);
      return;
    }
    if (document.pointerLockElement) document.exitPointerLock();
    openConversation(npc.npcKey);
  }, []);

  React.useEffect(() => {
    if ((nearbyPortal || nearbyNpc) && document.pointerLockElement) document.exitPointerLock();
  }, [nearbyPortal, nearbyNpc]);

  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (chatOpen.current || event.repeat || event.key.toLowerCase() !== 'f') return;
      if (!nearbyNpc && !nearbyPortal) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (nearbyNpc) talkToNpc(nearbyNpc);
      else enterPortal(nearbyPortal);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enterPortal, nearbyNpc, nearbyPortal, talkToNpc]);

  const portalText = nearbyPortal
    ? nearbyPortal.isExit
      ? language === 'en'
        ? `Return to the city from ${nearbyPortal.title.en}`
        : `العودة إلى المدينة من ${nearbyPortal.title.ar}`
      : language === 'en'
        ? `Enter ${nearbyPortal.title[language]}`
        : `ادخل إلى ${nearbyPortal.title[language]}`
    : '';
  const buttonText = language === 'en' ? 'Enter' : 'دخول';
  const npcText = nearbyNpc
    ? language === 'en'
      ? `Talk with ${nearbyNpc.name.en}`
      : `تحدث مع ${nearbyNpc.name.ar}`
    : '';
  const npcButtonText = language === 'en' ? 'Talk' : 'تحدث';

  React.useEffect(() => {
    if (!nearbyNpc && !nearbyPortal) return undefined;

    const prompt = document.createElement('div');
    prompt.id = 'lw-world-interaction-prompt';
    prompt.className = `lw-world-portal-prompt${nearbyNpc ? ' is-npc-prompt' : ''}`;
    prompt.setAttribute('role', 'status');
    prompt.setAttribute('aria-live', 'polite');

    const text = document.createElement('span');
    text.className = 'lw-world-portal-text';
    text.textContent = nearbyNpc ? npcText : portalText;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lw-world-portal-button';
    const buttonLabel = document.createElement('span');
    buttonLabel.textContent = nearbyNpc ? npcButtonText : buttonText;
    const key = document.createElement('kbd');
    key.textContent = 'F';
    button.append(buttonLabel, key);
    text.dir = language === 'ar' ? 'rtl' : 'ltr';
    buttonLabel.dir = 'auto';

    const stopPropagation = (event) => event.stopPropagation();
    const activate = () => {
      if (nearbyNpc) talkToNpc(nearbyNpc);
      else enterPortal(nearbyPortal);
    };
    prompt.addEventListener('pointerdown', stopPropagation);
    prompt.addEventListener('mousedown', stopPropagation);
    button.addEventListener('click', activate);
    prompt.append(text, button);
    document.body.appendChild(prompt);
    interactionPromptElement.current = prompt;
    interactionPromptNpcId.current = nearbyNpc ? nearbyNpc.id : null;
    const beacon = nearbyNpc && document.getElementById('de-npc-world-beacon');
    if (beacon) beacon.style.display = 'none';

    return () => {
      prompt.removeEventListener('pointerdown', stopPropagation);
      prompt.removeEventListener('mousedown', stopPropagation);
      button.removeEventListener('click', activate);
      if (interactionPromptElement.current === prompt) interactionPromptElement.current = null;
      if (interactionPromptNpcId.current === (nearbyNpc && nearbyNpc.id)) {
        interactionPromptNpcId.current = null;
      }
      if (beacon) beacon.style.display = '';
      prompt.remove();
    };
  }, [
    buttonText,
    enterPortal,
    nearbyNpc,
    nearbyPortal,
    npcButtonText,
    npcText,
    portalText,
    talkToNpc
  ]);

  return h(React.Fragment, null,
    positions
      ? h(FirstPersonPlayer, {
        ref: playerBody,
        joystickInput,
        initialPosition: positions.playerStart,
        isPaused: isPaused || isLoading,
        isMobile
      })
      : null,
    h(LevelWorld, { level, onPositionsReady, isPaused: isPaused || isLoading }),
    activeNpcs.map((npc) => h(NPCCharacter, {
      key: npc.id,
      npc,
      movementAnimations,
      idleAnimations,
      onPosition: updateNpcPosition,
      playerBody,
      isPaused: isPaused || isLoading,
      isEngaged: npc.id === (nearbyNpc && nearbyNpc.id) || npc.npcKey === engagedNpcKey
    })),
  );
}

export default function WorldScene({
  joystickInput,
  currentLevel,
  onLevelComplete,
  teleportCount,
  onTeleport,
  onObjectClick,
  isPaused,
  isMobile
}) {
  const handleObjectClick = React.useCallback((objectName) => {
    if (typeof objectName === 'string' && objectName.startsWith('I_')) {
      const vocabularyKey = objectName.slice(2).split('|')[0]
        .replace(/_/g, ' ')
        .trim()
        .toLowerCase();
      window.dispatchEvent(new CustomEvent('german-world-object-click', {
        detail: { key: vocabularyKey }
      }));
    }

    if (onObjectClick) onObjectClick(objectName);
  }, [onObjectClick]);

  return h(React.Fragment, null,
    h(ObjectInteraction, { onObjectClick: handleObjectClick, isPaused, isMobile }),
    h('ambientLight', { intensity: 0.1, color: 0xffffff }),
    h('hemisphereLight', { skyColor: 0x87ceeb, groundColor: 0x8b8b8b, intensity: 0.2 }),
    h('directionalLight', { position: [10, 20, 10], intensity: 0.1, color: 0xfff0a0 }),
    h(Environment, { preset: 'city' }),
    h(React.Suspense, { fallback: null },
      h(Physics, { gravity: [0, -9.81, 0], debug: false },
        h(WorldExplorer, {
          joystickInput,
          currentLevel,
          onLevelComplete,
          onObjectClick,
          isPaused,
          isMobile
        }))),
    !isMobile
      ? h(EffectComposer, { disableNormalPass: true },
        h(SSAO, { aoRadius: 2, intensity: 2, color: 'black' }))
      : null
  );
}
