import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { AttackResult, AttackStep } from "@/lib/attackTraversal";
import { buildAttackResult } from "@/lib/attackTraversal";

type Pulse = { id: string; position: [number, number, number] };

function AttackPulse({ position }: { position: [number, number, number] }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    elapsed.current += delta;
    const progress = Math.min(elapsed.current / 0.9, 1);
    mesh.current?.scale.setScalar(1 + progress * 2.8);
    if (material.current) material.current.opacity = Math.max(0, 0.78 * (1 - progress));
  });
  return <mesh ref={mesh} position={position}><ringGeometry args={[0.68, 0.78, 48]} /><meshBasicMaterial ref={material} color="#ff4d6d" transparent opacity={0.78} side={THREE.DoubleSide} /></mesh>;
}

export function AttackSimulation({ steps, sourceId, onStepHit, onComplete, speed = 420 }: { steps: AttackStep[]; sourceId: string; onStepHit: (nodeId: string, fromId: string) => void; onComplete: (result: AttackResult) => void; speed?: number }) {
  const particle = useRef<THREE.Mesh>(null);
  const trails = useRef<Array<THREE.Mesh | null>>([]);
  const stepIndex = useRef(0);
  const elapsed = useRef(0);
  const completed = useRef(false);
  const [pulses, setPulses] = useState<Pulse[]>([]);

  useEffect(() => {
    stepIndex.current = 0;
    elapsed.current = 0;
    completed.current = false;
    setPulses([]);
    const initial = steps[0]?.fromPos;
    if (initial) particle.current?.position.set(...initial);
  }, [sourceId, steps]);

  useFrame((_, delta) => {
    if (completed.current) return;
    if (!steps.length) {
      completed.current = true;
      onComplete(buildAttackResult(sourceId, []));
      return;
    }
    const current = steps[stepIndex.current];
    if (!current) return;
    elapsed.current += delta * 1000;
    const progress = Math.min(elapsed.current / speed, 1);
    const eased = 1 - (1 - progress) ** 3;
    const point = new THREE.Vector3().lerpVectors(new THREE.Vector3(...current.fromPos), new THREE.Vector3(...current.toPos), eased);
    particle.current?.position.copy(point);
    trails.current.forEach((trail, index) => {
      if (!trail) return;
      const delayed = Math.max(0, progress - (index + 1) * 0.12);
      const trailPoint = new THREE.Vector3().lerpVectors(new THREE.Vector3(...current.fromPos), new THREE.Vector3(...current.toPos), 1 - (1 - delayed) ** 3);
      trail.position.copy(trailPoint);
    });
    if (progress < 1) return;
    onStepHit(current.toId, current.fromId);
    setPulses(previous => [...previous.slice(-8), { id: `${current.toId}-${stepIndex.current}`, position: current.toPos }]);
    stepIndex.current += 1;
    elapsed.current = 0;
    if (stepIndex.current >= steps.length) {
      completed.current = true;
      onComplete(buildAttackResult(sourceId, steps));
    }
  });

  return <group>
    <mesh ref={particle}><sphereGeometry args={[0.16, 18, 18]} /><meshStandardMaterial color="#ff4d6d" emissive="#ff4d6d" emissiveIntensity={2.1} /></mesh>
    {[0.56, 0.3, 0.12].map((opacity, index) => <mesh key={opacity} ref={mesh => { trails.current[index] = mesh; }}><sphereGeometry args={[0.1 - index * 0.018, 14, 14]} /><meshBasicMaterial color="#ff4d6d" transparent opacity={opacity} /></mesh>)}
    {pulses.map(pulse => <AttackPulse key={pulse.id} position={pulse.position} />)}
  </group>;
}
