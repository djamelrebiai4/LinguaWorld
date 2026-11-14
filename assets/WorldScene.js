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
        const isCityModel = modelPath === '/Grounds/City.glb';
        object.receiveShadow = isCityModel;
        object.castShadow = isCityModel && !/ground|sea|street|canal|boundary/i.test(object.name);
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

function LevelWorld({ level, onPositionsReady }) {
  if (level === 1) {
    return h(CityWorld, { onPositionsReady });
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

function CityWorld({ onPositionsReady }) {
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
      '/Grounds/City.glb',
      '/Grounds/City_Collision.glb',
      'city_Collision',
      LEVEL_STARTS[1],
      onPositionsReady
    ),
    h(CityStreetscape)
  );
}

function StreetLamp({ position }) {
  const metal = '#263b3b';
  return h('group', { position },
    h('mesh', { position: [0, 0.18, 0], castShadow: true },
      h('cylinderGeometry', { args: [0.24, 0.32, 0.36, 10] }),
      h('meshStandardMaterial', { color: '#354747', roughness: 0.72, metalness: 0.25 })),
    h('mesh', { position: [0, 2.65, 0], castShadow: true },
      h('cylinderGeometry', { args: [0.075, 0.12, 4.7, 10] }),
      h('meshStandardMaterial', { color: metal, roughness: 0.55, metalness: 0.42 })),
    h('mesh', { position: [0.48, 4.87, 0], rotation: [0, 0, Math.PI / 2], castShadow: true },
      h('cylinderGeometry', { args: [0.055, 0.07, 1.05, 8] }),
      h('meshStandardMaterial', { color: metal, roughness: 0.55, metalness: 0.42 })),
    h('mesh', { position: [0.92, 4.65, 0], castShadow: true },
      h('boxGeometry', { args: [0.48, 0.12, 0.38] }),
      h('meshStandardMaterial', { color: '#253638', roughness: 0.6, metalness: 0.3 })),
    h('mesh', { position: [0.92, 4.49, 0], castShadow: true },
      h('boxGeometry', { args: [0.31, 0.2, 0.24] }),
      h('meshStandardMaterial', {
        color: '#f4c985',
        emissive: '#e8a653',
        emissiveIntensity: 0.3,
        roughness: 0.35
      }))
  );
}

function StreetPlanter({ position }) {
  const leaves = [
    [-0.62, 0.78, -0.22, 0.34],
    [-0.2, 0.92, 0.18, 0.42],
    [0.25, 0.8, -0.18, 0.36],
    [0.62, 0.9, 0.22, 0.39]
  ];
  return h('group', { position },
    h('mesh', { position: [0, 0.28, 0], castShadow: true, receiveShadow: true },
      h('boxGeometry', { args: [2.05, 0.56, 1.02] }),
      h('meshStandardMaterial', { color: '#8f7664', roughness: 0.82 })),
    h('mesh', { position: [0, 0.59, 0], receiveShadow: true },
      h('boxGeometry', { args: [1.84, 0.1, 0.82] }),
      h('meshStandardMaterial', { color: '#423d32', roughness: 1 })),
    ...leaves.map(([x, y, z, size], index) => h('mesh', {
      key: index,
      position: [x, y, z],
      scale: [size, size * 1.2, size],
      castShadow: true
    },
    h('dodecahedronGeometry', { args: [1, 1] }),
    h('meshStandardMaterial', {
      color: index % 2 ? '#547b57' : '#66875c',
      roughness: 0.9
    })))
  );
}

function StreetBench({ position, rotation = 0 }) {
  const wood = '#936849';
  const metal = '#354443';
  const slat = (x, y, z, dimensions) => h('mesh', {
    position: [x, y, z],
    castShadow: true,
    receiveShadow: true
  },
  h('boxGeometry', { args: dimensions }),
  h('meshStandardMaterial', { color: wood, roughness: 0.78 }));
  const support = (x, y, z, dimensions) => h('mesh', {
    position: [x, y, z],
    castShadow: true
  },
  h('boxGeometry', { args: dimensions }),
  h('meshStandardMaterial', { color: metal, roughness: 0.58, metalness: 0.38 }));

  return h('group', { position, rotation: [0, rotation, 0] },
    ...[-0.72, 0.72].flatMap((x) => [
      support(x, 0.26, 0, [0.1, 0.52, 0.82]),
      support(x, 0.69, -0.31, [0.09, 0.78, 0.1])
    ]),
    ...[-0.28, -0.09, 0.1, 0.29].map((z) =>
      slat(0, 0.53, z, [1.62, 0.075, 0.14])),
    ...[-0.24, -0.04, 0.16, 0.36].map((y) =>
      slat(0, y + 0.78, -0.34, [1.62, 0.13, 0.075]))
  );
}

function CityStreetscape() {
  const lamps = [
    [43, 0, 120],
    [77, 0, 151],
    [121, 0, 171],
    [40, 0, 284],
    [-157, 0, 279],
    [160, 0, -227]
  ];
  const planters = [
    [45, 0, 114],
    [74, 0, 139],
    [80, 0, 135],
    [118, 0, 139],
    [43, 0, 209],
    [123, 0, 209],
    [-153, 0, 235],
    [-110, 0, 235],
    [121, 0, -218],
    [158, 0, -218]
  ];
  const benches = [
    { position: [38, 0, 125], rotation: Math.PI / 2 },
    { position: [77, 0, 164], rotation: Math.PI / 2 },
    { position: [126, 0, 281], rotation: Math.PI / 2 },
    { position: [-158, 0, 264], rotation: Math.PI / 2 },
    { position: [159, 0, -232], rotation: Math.PI / 2 }
  ];

  return h(React.Fragment, null,
    lamps.map((position) => h(StreetLamp, { key: `lamp-${position[0]}-${position[1]}`, position })),
    planters.map((position) =>
      h(StreetPlanter, { key: `planter-${position[0]}-${position[1]}`, position })),
    benches.map((bench, index) => h(StreetBench, { key: `bench-${index}`, ...bench }))
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
  }],
  3: [{
    id: 'lukas',
    npcKey: 'lukas',
    name: { ar: 'لوكاس فاغنر', en: 'Lukas Wagner' },
    model: 'Mage',
    path: [{ x: -3, z: -2 }, { x: 3, z: -2 }, { x: 3, z: 2 }, { x: -3, z: 2 }],
    speed: 0.85,
    walkAnimation: 'Walking_A'
  }],
  4: [{
    id: 'sophie',
    npcKey: 'sophie',
    name: { ar: 'صوفي مولر', en: 'Sophie Müller' },
    model: 'Rogue',
    path: [{ x: -3, z: 1 }, { x: 2, z: 1 }, { x: 2, z: 5 }, { x: -3, z: 5 }],
    speed: 0.8,
    walkAnimation: 'Walking_C'
  }],
  5: [{
    id: 'hanna',
    npcKey: 'hanna',
    name: { ar: 'هانا شنايدر', en: 'Hanna Schneider' },
    model: 'Barbarian',
    path: [{ x: -3, z: 2 }, { x: 3, z: 2 }, { x: 3, z: 7 }, { x: -3, z: 7 }],
    speed: 0.8,
    walkAnimation: 'Walking_B'
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

function NPCCharacter({ npc, movementAnimations, idleAnimations, onPosition, isPaused }) {
  const { scene } = useGLTF(`/Grounds/NPC/${npc.model}.glb`, true);
  const groupRef = React.useRef(null);
  const routeIndex = React.useRef(1);
  const waitTime = React.useRef(0.5);
  const animationTime = React.useRef(0);
  const animationMode = React.useRef(null);
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
  const walkTracks = React.useMemo(
    () => bindNpcAnimation(walkClip, nodes),
    [walkClip, nodes]
  );
  const idleTracks = React.useMemo(
    () => bindNpcAnimation(idleClip, nodes),
    [idleClip, nodes]
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    let walking = false;
    if (!isPaused && npc.path.length > 1) {
      if (waitTime.current > 0) {
        waitTime.current = Math.max(0, waitTime.current - delta);
      } else {
        const target = npc.path[routeIndex.current];
        const dx = target.x - group.position.x;
        const dz = target.z - group.position.z;
        const distance = Math.hypot(dx, dz);

        if (distance < 0.2) {
          routeIndex.current = (routeIndex.current + 1) % npc.path.length;
          waitTime.current = 1.1;
        } else {
          const step = Math.min(distance, npc.speed * delta);
          group.position.x += (dx / distance) * step;
          group.position.z += (dz / distance) * step;
          group.rotation.y = Math.atan2(dx, dz);
          walking = true;
        }
      }
    }

    onPosition(npc.id, group.position.x, group.position.z);
    if (isPaused) return;
    if (animationMode.current !== walking) {
      animationMode.current = walking;
      animationTime.current = 0;
    }
    animationTime.current += delta;
    const clip = walking ? walkClip : idleClip;
    const tracks = walking ? walkTracks : idleTracks;
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
  const [npcSpeech, setNpcSpeech] = React.useState(null);
  const firstScene = React.useRef(true);
  const pendingSpawn = React.useRef(null);
  const currentPortal = React.useRef(null);
  const currentNpc = React.useRef(null);
  const npcPositions = React.useRef(new Map());
  const speechBubbleElement = React.useRef(null);
  const interactionPromptElement = React.useRef(null);
  const interactionPromptNpcId = React.useRef(null);
  const speechSequence = React.useRef(0);
  const chatOpen = React.useRef(false);
  const screenPosition = React.useMemo(() => new Vector3(), []);
  const loadingRef = React.useRef(false);
  const readyLevel = React.useRef(null);
  const { camera, gl } = useThree();
  const { animations: movementAnimations } = useGLTF('/Grounds/NPC/Movement.glb', true);
  const { animations: idleAnimations } = useGLTF('/Grounds/NPC/General.glb', true);
  const activeNpcs = WORLD_NPCS[level] || [];

  const updateNpcPosition = React.useCallback((id, x, z) => {
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
      if (interactionPromptElement.current) {
        interactionPromptElement.current.style.display = chatOpen.current ? 'none' : '';
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

  const language = localStorage.getItem('lw_support_language') === 'en' ? 'en' : 'ar';
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
    h(LevelWorld, { level, onPositionsReady }),
    activeNpcs.map((npc) => h(NPCCharacter, {
      key: npc.id,
      npc,
      movementAnimations,
      idleAnimations,
      onPosition: updateNpcPosition,
      isPaused: isPaused || isLoading
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
  return h(React.Fragment, null,
    h(ObjectInteraction, { onObjectClick, isPaused, isMobile }),
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
