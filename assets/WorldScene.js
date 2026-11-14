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
      if (modelPath === '/Grounds/Restaurant.glb' &&
        (object.name === 'I_Male' || object.name === 'I_Female')) {
        object.visible = false;
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
  const firstScene = React.useRef(true);
  const pendingSpawn = React.useRef(null);
  const currentPortal = React.useRef(null);
  const currentNpc = React.useRef(null);
  const npcPositions = React.useRef(new Map());
  const loadingRef = React.useRef(false);
  const readyLevel = React.useRef(null);
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
      if (event.repeat || event.key.toLowerCase() !== 'f') return;
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
    prompt.className = 'lw-world-portal-prompt';
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

    return () => {
      prompt.removeEventListener('pointerdown', stopPropagation);
      prompt.removeEventListener('mousedown', stopPropagation);
      button.removeEventListener('click', activate);
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
