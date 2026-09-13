import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { KeyboardControls, Sky, Text, useKeyboardControls } from '@react-three/drei';
import { Shield } from 'lucide-react';
import * as THREE from 'three';

export type WorldEnemy = {
  id: number;
  x: number;
  z: number;
  kind: 'shadow' | 'hunter' | 'boss';
  name: string;
  hp: number;
  maxHp: number;
  alive: boolean;
};

export type WorldPlayer = { x: number; z: number };

export enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
}

const keyMap = [
  { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
  { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
  { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
  { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
];

const forest = [
  [-13, -8, 1.1],
  [-10, 9, 0.9],
  [-5, -10, 0.8],
  [8, -9, 1.15],
  [13, -4, 0.9],
  [12, 9, 1.25],
  [-13, 7, 0.8],
  [3, 10, 1],
] as const;

const ruins = [
  [-8, -2, 0],
  [8, -1, 0.6],
  [-7, 5, -0.2],
  [7, 5, 0.2],
] as const;

function Tree({ x, z, scale }: { x: number; z: number; scale: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 2.5, 7]} />
        <meshStandardMaterial color="#5a362f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.45, 0]} castShadow>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial color="#185a53" roughness={0.85} />
      </mesh>
      <mesh position={[0.1, 3.05, 0]} castShadow>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial color="#2f8570" roughness={0.85} />
      </mesh>
      <mesh position={[-0.32, 2.55, 0.62]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#f4a64b" emissive="#7c3a16" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function Ruin({ x, z, rotation }: { x: number; z: number; rotation: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[3.8, 1.4, 2.3]} />
        <meshStandardMaterial color="#4e5068" roughness={1} />
      </mesh>
      <mesh position={[0.1, 1.7, 0]} rotation={[0, 0.1, 0.05]} castShadow>
        <boxGeometry args={[3.2, 0.18, 2]} />
        <meshStandardMaterial color="#77748e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.65, 1.19]}>
        <boxGeometry args={[0.78, 0.9, 0.04]} />
        <meshStandardMaterial color="#151d38" emissive="#321e53" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-1.2, 0.8, 1.19]}>
        <boxGeometry args={[0.42, 0.48, 0.04]} />
        <meshStandardMaterial color="#89d7dd" emissive="#3b899a" emissiveIntensity={1.1} />
      </mesh>
    </group>
  );
}

function PlayerModel({ position, attackPulse, awakeningPulse }: { position: WorldPlayer; attackPulse: number; awakeningPulse: number }) {
  const group = useRef<THREE.Group>(null);
  const sword = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const previousAttack = useRef(attackPulse);
  const attackStarted = useRef(0);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, position.x, 0.22);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, position.z, 0.22);
    group.current.position.y = 0.05 + Math.sin(clock.elapsedTime * 5) * 0.025;
    if (attackPulse !== previousAttack.current) {
      previousAttack.current = attackPulse;
      attackStarted.current = clock.elapsedTime;
    }
    const attackProgress = clock.elapsedTime - attackStarted.current;
    if (sword.current) {
      const slash = attackProgress < 0.45 ? Math.sin(Math.min(1, attackProgress / 0.45) * Math.PI) : 0;
      sword.current.rotation.z = -0.9 + slash * 1.8;
      sword.current.rotation.y = -0.25 - slash * 0.25;
    }
    if (glow.current) {
      glow.current.intensity = 1.5 + Math.sin(clock.elapsedTime * 4) * 0.35 + (awakeningPulse > 0 ? 4 : 0);
    }
  });

  return (
    <group ref={group} position={[position.x, 0, position.z]}>
      <pointLight ref={glow} position={[0, 1.9, 0]} color="#7de6ff" distance={4} intensity={1.5} />
      <mesh position={[0, 1.15, 0]} castShadow>
        <capsuleGeometry args={[0.34, 0.85, 6, 12]} />
        <meshStandardMaterial color="#2d426f" metalness={0.2} roughness={0.55} />
      </mesh>
      <mesh position={[0, 2.02, 0]} castShadow>
        <icosahedronGeometry args={[0.4, 1]} />
        <meshStandardMaterial color="#e8f2ff" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.08, 0.18]} rotation={[-0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.46, 0.12, 0.42]} />
        <meshStandardMaterial color="#1b264e" metalness={0.4} roughness={0.35} />
      </mesh>
      <group ref={sword} position={[0.52, 1.18, 0]} rotation={[0, -0.25, -0.9]}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[0.11, 1.3, 0.16]} />
          <meshStandardMaterial color="#d9f8ff" emissive="#55dcff" emissiveIntensity={1.8} metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.42, 0.12, 0.18]} />
          <meshStandardMaterial color="#e9a04f" metalness={0.5} roughness={0.35} />
        </mesh>
      </group>
      <Text position={[0, 2.75, 0]} fontSize={0.21} color="#e7f5ff" anchorX="center" outlineWidth={0.025} outlineColor="#10162d">
        ÉCLAIREUR
      </Text>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.75, 0.9, 32]} />
        <meshBasicMaterial color="#62e8fa" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function EnemyModel({ enemy, selected, onSelect }: { enemy: WorldEnemy; selected: boolean; onSelect: () => void }) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, enemy.x, 0.15);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, enemy.z, 0.15);
    group.current.position.y = 0.1 + Math.sin(clock.elapsedTime * 3 + enemy.id) * 0.06;
    group.current.rotation.y += enemy.kind === 'boss' ? 0.008 : 0.015;
  });

  const accent = enemy.kind === 'boss' ? '#f04f6a' : enemy.kind === 'hunter' ? '#49cee2' : '#a179ff';
  const size = enemy.kind === 'boss' ? 1.35 : enemy.kind === 'hunter' ? 0.82 : 0.68;

  return (
    <group ref={group} position={[enemy.x, 0, enemy.z]} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <pointLight position={[0, 1.5, 0]} color={accent} distance={3.2} intensity={selected ? 2.3 : 0.8} />
      <mesh position={[0, size, 0]} castShadow>
        <icosahedronGeometry args={[size, enemy.kind === 'boss' ? 1 : 0]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={selected ? 1.1 : 0.3} roughness={0.42} metalness={0.18} />
      </mesh>
      <mesh position={[0, size * 1.9, 0]} castShadow>
        <coneGeometry args={[size * 0.48, size * 0.65, 6]} />
        <meshStandardMaterial color="#171b3b" emissive="#382657" emissiveIntensity={0.45} />
      </mesh>
      <Text position={[0, size * 2.65, 0]} fontSize={enemy.kind === 'boss' ? 0.25 : 0.17} color="#ffffff" anchorX="center" outlineWidth={0.025} outlineColor="#11162d">
        {enemy.name}
      </Text>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.15, size * 1.27, 24]} />
        <meshBasicMaterial color={selected ? '#ffe08a' : accent} transparent opacity={selected ? 0.9 : 0.3} />
      </mesh>
    </group>
  );
}

function WorldController({ player, onPlayerMove }: { player: WorldPlayer; onPlayerMove: (next: WorldPlayer) => void }) {
  const [subscribe, get] = useKeyboardControls<Controls>();
  const positionRef = useRef(player);
  const lastSync = useRef(0);

  useEffect(() => {
    return subscribe(
      (state) => state.forward || state.back || state.left || state.right,
      () => undefined,
    );
  }, [subscribe]);

  useFrame((state, delta) => {
    const controls = get();
    const x = Number(controls.right) - Number(controls.left);
    const z = Number(controls.back) - Number(controls.forward);
    if (!x && !z) return;
    const length = Math.max(1, Math.hypot(x, z));
    positionRef.current = {
      x: THREE.MathUtils.clamp(positionRef.current.x + (x / length) * delta * 7, -14, 14),
      z: THREE.MathUtils.clamp(positionRef.current.z + (z / length) * delta * 7, -10, 10),
    };
    if (state.clock.elapsedTime - lastSync.current > 0.07) {
      lastSync.current = state.clock.elapsedTime;
      onPlayerMove(positionRef.current);
    }
  });

  useEffect(() => {
    positionRef.current = player;
  }, [player]);

  return null;
}

function CameraRig({ player }: { player: WorldPlayer }) {
  useFrame(({ camera }) => {
    const target = new THREE.Vector3(player.x + 5.5, 6.8, player.z + 8.2);
    camera.position.lerp(target, 0.06);
    camera.lookAt(player.x, 0.65, player.z);
  });
  return null;
}

function Terrain() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[38, 28]} />
        <meshStandardMaterial color="#172445" roughness={1} />
      </mesh>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 22]} />
        <meshStandardMaterial color="#2b3f59" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.01, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 22]} />
        <meshStandardMaterial color="#46526a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.03, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 22]} />
        <meshStandardMaterial color="#6c7186" roughness={1} />
      </mesh>
      {forest.map(([x, z, scale]) => <Tree key={`${x}-${z}`} x={x} z={z} scale={scale} />)}
      {ruins.map(([x, z, rotation]) => <Ruin key={`${x}-${z}`} x={x} z={z} rotation={rotation} />)}
      <mesh position={[0, 0.2, -3.5]} receiveShadow>
        <torusGeometry args={[2.3, 0.18, 10, 40]} />
        <meshStandardMaterial color="#6e80a2" emissive="#263969" emissiveIntensity={0.5} metalness={0.35} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.45, -3.5]}>
        <cylinderGeometry args={[2.15, 2.15, 0.18, 40]} />
        <meshStandardMaterial color="#162a4a" emissive="#264e82" emissiveIntensity={1.1} transparent opacity={0.9} />
      </mesh>
      <Text position={[0, 0.7, -3.5]} fontSize={0.27} color="#79ecff" anchorX="center" rotation={[-Math.PI / 2, 0, 0]}>
        FAILLE
      </Text>
    </>
  );
}

function FallbackWorld({
  player,
  enemies,
  selectedEnemy,
  onEnemySelect,
}: {
  player: WorldPlayer;
  enemies: WorldEnemy[];
  selectedEnemy: number | null;
  onEnemySelect: (id: number) => void;
}) {
  const mapX = (x: number) => `${((x + 15) / 30) * 100}%`;
  const mapZ = (z: number) => `${((z + 11) / 22) * 100}%`;
  return (
    <div className="world-fallback">
      <div className="fallback-sky" />
      <div className="fallback-moon" />
      <div className="fallback-ruin ruin-one" />
      <div className="fallback-ruin ruin-two" />
      <div className="fallback-road" />
      {forest.map(([x, z, scale]) => <div key={`${x}-${z}`} className="fallback-tree" style={{ left: mapX(x), top: mapZ(z), transform: `scale(${scale})` }} />)}
      {enemies.filter((enemy) => enemy.alive).map((enemy) => (
        <button key={enemy.id} className={`fallback-enemy ${enemy.kind} ${selectedEnemy === enemy.id ? 'targeted' : ''}`} style={{ left: mapX(enemy.x), top: mapZ(enemy.z) }} onClick={() => onEnemySelect(enemy.id)}>
          <span>{enemy.kind === 'boss' ? 'R' : enemy.kind === 'hunter' ? 'T' : 'O'}</span>
          <b>{enemy.name}</b>
          <i style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
        </button>
      ))}
      <div className="fallback-player" style={{ left: mapX(player.x), top: mapZ(player.z) }}>
        <span><Shield size={19} /></span>
        <b>ÉCLAIREUR</b>
      </div>
      <div className="fallback-webgl-note">Mode de secours · le navigateur ne fournit pas WebGL</div>
    </div>
  );
}

export function World3D({
  player,
  enemies,
  selectedEnemy,
  attackPulse,
  awakeningPulse,
  onPlayerMove,
  onEnemySelect,
}: {
  player: WorldPlayer;
  enemies: WorldEnemy[];
  selectedEnemy: number | null;
  attackPulse: number;
  awakeningPulse: number;
  onPlayerMove: (next: WorldPlayer) => void;
  onEnemySelect: (id: number) => void;
}) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    let supported = false;
    try {
      supported = Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      supported = false;
    }
    setWebglAvailable(supported);
  }, []);

  if (webglAvailable === null) {
    return <div className="world-loading">Chargement du monde 3D…</div>;
  }

  if (!webglAvailable) {
    return <FallbackWorld player={player} enemies={enemies} selectedEnemy={selectedEnemy} onEnemySelect={onEnemySelect} />;
  }

  return (
    <div className="world-3d">
      <KeyboardControls map={keyMap}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [5.5, 6.8, 8.2], fov: 48 }}
          fallback={<FallbackWorld player={player} enemies={enemies} selectedEnemy={selectedEnemy} onEnemySelect={onEnemySelect} />}
        >
          <color attach="background" args={['#111a36']} />
          <fog attach="fog" args={['#111a36', 15, 36]} />
          <ambientLight intensity={0.8} color="#9bb4d9" />
          <directionalLight castShadow position={[-6, 12, 5]} intensity={2.2} color="#fff1cf" shadow-mapSize={[1024, 1024]} />
          <pointLight position={[0, 3, -3]} color="#5ee7ff" intensity={5} distance={12} />
          <Sky distance={450000} sunPosition={[-5, 3, -6]} inclination={0.54} azimuth={0.25} turbidity={10} rayleigh={2} />
          <Terrain />
          {enemies.filter((enemy) => enemy.alive).map((enemy) => (
            <EnemyModel key={enemy.id} enemy={enemy} selected={selectedEnemy === enemy.id} onSelect={() => onEnemySelect(enemy.id)} />
          ))}
          <PlayerModel position={player} attackPulse={attackPulse} awakeningPulse={awakeningPulse} />
          <WorldController player={player} onPlayerMove={onPlayerMove} />
          <CameraRig player={player} />
        </Canvas>
      </KeyboardControls>
    </div>
  );
}