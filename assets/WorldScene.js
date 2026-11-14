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
        object.receiveShadow = false;
        object.castShadow = false;
        if (materials.MazeMat) object.material = materials.MazeMat;
      }
    });
    return clone;
  }, [scene, materials]);

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
  return useWorldModel(
    '/Grounds/City.glb',
    '/Grounds/City_Collision.glb',
    'city_Collision',
    LEVEL_STARTS[1],
    onPositionsReady
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
  const firstScene = React.useRef(true);
  const pendingSpawn = React.useRef(null);
  const currentPortal = React.useRef(null);
  const loadingRef = React.useRef(false);
  const readyLevel = React.useRef(null);

  React.useEffect(() => {
    if (currentLevel !== null && currentLevel !== level) setLevel(currentLevel);
  }, [currentLevel]);

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

    if (level === 1) {
      match = CITY_PORTALS.find((portal) => {
        const dx = player.x - portal.position.x;
        const dz = player.z - portal.position.z;
        return dx * dx + dz * dz <= portal.radius * portal.radius;
      }) || null;
    } else {
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

  React.useEffect(() => {
    if (nearbyPortal && document.pointerLockElement) document.exitPointerLock();
  }, [nearbyPortal]);

  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat || event.key.toLowerCase() !== 'f' || !nearbyPortal) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      enterPortal(nearbyPortal);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enterPortal, nearbyPortal]);

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
    nearbyPortal
      ? h('div', {
        className: 'lw-world-portal-prompt',
        role: 'status',
        'aria-live': 'polite',
        onPointerDown: (event) => event.stopPropagation(),
        onMouseDown: (event) => event.stopPropagation()
      },
      h('span', { className: 'lw-world-portal-text' }, portalText),
      h('button', {
        type: 'button',
        className: 'lw-world-portal-button',
        onClick: () => enterPortal(nearbyPortal)
      }, h('span', null, buttonText),
      h('kbd', null, 'F')))
      : null
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
