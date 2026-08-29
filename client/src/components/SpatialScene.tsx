import { Html, Line, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useEffect, useMemo, useState } from "react";
import type { SpatialCluster, SpatialGraphNode } from "@/lib/spatialProjection";
import { AttackSimulation } from "@/components/AttackSimulation";
import { attackEdgeKey, buildAttackPath, type AttackResult } from "@/lib/attackTraversal";

export type SceneNode = {
  id: string;
  label: string;
  kind: string;
  riskWeight: number;
  position: [number, number, number];
  meta: string;
};

export type SceneEdge = {
  source: string;
  target: string;
};

export type AttackState = { active: boolean; sourceNodeId: string | null };

type SpatialSceneProps = {
  clusters: SpatialCluster[];
  graphNodes: SpatialGraphNode[];
  edges: SceneEdge[];
  view: "enterprise" | "domain" | "ecosystem" | "artefact";
  selectedId?: string;
  onSelect: (id: string) => void;
  attackState?: AttackState;
  onAttackComplete?: (result: AttackResult) => void;
};

const cameraPositions: Record<SpatialSceneProps["view"], [number, number, number]> = {
  enterprise: [0, 0.7, 18],
  domain: [0, 0.5, 15],
  ecosystem: [0, 0.2, 14],
  artefact: [0, 0, 15],
};

function nodeColor(weight: number) {
  if (weight >= 7) return "#ff8a3d";
  if (weight >= 5) return "#f0b428";
  if (weight >= 3) return "#64a0ff";
  return "#a8bdd4";
}

function layoutRing<T extends { id: string; label: string; kind: string; riskWeight: number }>(items: T[], meta: (item: T) => string): SceneNode[] {
  return items.slice(0, 12).map((item, index, all) => {
    if (index === 0) {
      return { id: item.id, label: item.label, kind: item.kind, riskWeight: item.riskWeight, position: [0, 0, 0], meta: meta(item) };
    }
    const angle = ((index - 1) / Math.max(all.length - 1, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = 4.6 + (index % 2) * 0.65;
    return {
      id: item.id,
      label: item.label,
      kind: item.kind,
      riskWeight: item.riskWeight,
      position: [Math.cos(angle) * radius, Math.sin(angle) * 3.3, Math.sin(angle) * 1.1],
      meta: meta(item),
    };
  });
}

function CameraRig({ view }: { view: SpatialSceneProps["view"] }) {
  const { camera } = useThree();
  const target = useMemo(() => new Vector3(...cameraPositions[view]), [view]);
  useFrame(() => {
    camera.position.lerp(target, 0.055);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function SpatialNode({ node, selected, underAttack, onSelect }: { node: SceneNode; selected: boolean; underAttack: boolean; onSelect: () => void }) {
  const radius = 0.46 + Math.min(node.riskWeight, 8) * 0.055;
  const color = nodeColor(node.riskWeight);
  return (
    <group position={node.position}>
      <mesh onClick={event => { event.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 0.62 : 0.22} roughness={0.28} metalness={0.45} />
      </mesh>
      {selected ? <mesh>
        <ringGeometry args={[radius * 1.32, radius * 1.43, 48]} />
        <meshBasicMaterial color="#ffcb6b" transparent opacity={0.86} side={2} />
      </mesh> : null}
      {underAttack ? <mesh rotation={[0, 0, Math.PI / 4]}><ringGeometry args={[radius * 1.58, radius * 1.68, 48]} /><meshBasicMaterial color="#ff4d6d" transparent opacity={0.78} side={2} /></mesh> : null}
      <Html center>
        <button type="button" onClick={onSelect} className={`spatial-node-label ${selected ? "spatial-node-label--selected" : ""}`} aria-label={`Focus ${node.label}`}>
          <span>{node.kind}</span>
          <strong>{node.label}</strong>
          <small>{node.meta}</small>
        </button>
      </Html>
    </group>
  );
}

function SceneContents({ clusters, graphNodes, edges, view, selectedId, onSelect, attackState, onAttackComplete }: SpatialSceneProps) {
  const nodes = useMemo(() => {
    if (view === "enterprise") {
      return layoutRing(
        clusters.map(cluster => ({ ...cluster, kind: "cluster" })),
        cluster => `${cluster.assetCount} observed assets · ${cluster.vulnerableCount} quantum-vulnerable`
      );
    }
    return layoutRing(graphNodes, node => `${node.kind} · ${node.findingKeys.length || 1} evidence link${node.findingKeys.length === 1 ? "" : "s"}`);
  }, [clusters, graphNodes, view]);
  const nodeMap = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);
  const visibleEdges = useMemo(() => edges.filter(edge => nodeMap.has(edge.source) && nodeMap.has(edge.target)).slice(0, 30), [edges, nodeMap]);
  const attackSteps = useMemo(() => attackState?.active && attackState.sourceNodeId ? buildAttackPath(attackState.sourceNodeId, visibleEdges, nodeMap) : [], [attackState?.active, attackState?.sourceNodeId, visibleEdges, nodeMap]);
  const [attackedNodes, setAttackedNodes] = useState<string[]>([]);
  const [attackedEdges, setAttackedEdges] = useState<string[]>([]);
  useEffect(() => { setAttackedNodes(attackState?.active && attackState.sourceNodeId ? [attackState.sourceNodeId] : []); setAttackedEdges([]); }, [attackState?.active, attackState?.sourceNodeId]);

  return (
    <>
      <color attach="background" args={["#07080f"]} />
      <fog attach="fog" args={["#07080f", 11, 27]} />
      <ambientLight intensity={1.05} />
      <pointLight position={[0, 5, 8]} intensity={48} color="#64a0ff" distance={24} />
      <pointLight position={[-8, -3, 5]} intensity={26} color="#ff8a3d" distance={20} />
      <pointLight position={[7, 2, 0]} intensity={14} color="#5544cc" distance={17} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.35, 0]}>
        <planeGeometry args={[32, 32]} />
        <meshStandardMaterial color="#0b1024" metalness={0.74} roughness={0.68} />
      </mesh>
      <gridHelper args={[30, 30, "#2a3050", "#10172e"]} position={[0, -4.3, 0]} />
      {visibleEdges.map(edge => {
        const source = nodeMap.get(edge.source)!;
        const target = nodeMap.get(edge.target)!;
        const active = selectedId === edge.source || selectedId === edge.target;
        const underAttack = attackedEdges.includes(attackEdgeKey(edge.source, edge.target));
        return <Line key={`${edge.source}:${edge.target}`} points={[source.position, target.position]} color={underAttack ? "#ff4d6d" : active ? "#f0b428" : "#3d5588"} lineWidth={underAttack ? 2.3 : active ? 1.7 : 0.65} transparent opacity={underAttack ? 1 : active ? 0.96 : 0.32} />;
      })}
      {nodes.map(node => <SpatialNode key={node.id} node={node} selected={node.id === selectedId} underAttack={attackedNodes.includes(node.id)} onSelect={() => onSelect(node.id)} />)}
      {attackState?.active && attackState.sourceNodeId ? <AttackSimulation key={`${attackState.sourceNodeId}-${attackSteps.length}`} sourceId={attackState.sourceNodeId} steps={attackSteps} onStepHit={(nodeId, fromId) => { setAttackedNodes(previous => previous.includes(nodeId) ? previous : [...previous, nodeId]); setAttackedEdges(previous => [...previous, attackEdgeKey(fromId, nodeId)]); }} onComplete={result => onAttackComplete?.(result)} /> : null}
      <CameraRig view={view} />
      <OrbitControls enablePan={false} minDistance={7} maxDistance={23} autoRotate={view === "enterprise" && !selectedId} autoRotateSpeed={0.17} />
    </>
  );
}

export function SpatialScene(props: SpatialSceneProps) {
  return (
    <Canvas dpr={[1, 1.6]} gl={{ antialias: true, alpha: false }} className="h-full w-full" aria-label="Interactive ECDAT spatial environment">
      <PerspectiveCamera makeDefault position={cameraPositions.enterprise} fov={41} />
      <SceneContents {...props} />
    </Canvas>
  );
}
