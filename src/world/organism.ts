import { clamp, mulberry32 } from '../lib/math';

/**
 * A deterministic, branching organism shared by the 3D world and the Echo
 * Print. Branches grow from a ring on the ground toward the light; each vertex
 * carries a reveal threshold so `uGrowth` can unroll the structure over time.
 */
export interface OrganismData {
  /** Line-segment pairs: xyz, xyz, ... */
  positions: Float32Array;
  /** 0..1 reveal threshold per vertex. */
  progress: Float32Array;
  /** 1 on terminal vertices, 0 elsewhere. */
  tips: Float32Array;
  branchCount: number;
  segmentCount: number;
}

interface Branch {
  points: Array<[number, number, number]>;
  tip: boolean;
}

const GROUND = -2.35;
const MAX_HEIGHT = 6.4;

function generateBranches(seed: number): Branch[] {
  const rand = mulberry32((seed ^ 0x85ebca6b) >>> 0);
  const branches: Branch[] = [];
  const count = 300;

  const addBranch = (origin: [number, number, number], height: number, spread: number) => {
    const segments = 7 + Math.floor(rand() * 3);
    const angle = rand() * Math.PI * 2;
    const lean = 0.35 + rand() * 1.65;
    const rise = height * (0.72 + rand() * 0.4);
    const swirl = (rand() - 0.5) * 1.5;
    const lateralAngle = angle + swirl * 0.55;
    const skew = (rand() - 0.5) * spread;

    const points: Array<[number, number, number]> = [];
    for (let i = 0; i <= segments; i++) {
      const p = i / segments;
      const ease = p * p * (3 - 2 * p);
      const radial = Math.sin(p * Math.PI * 0.8) * lean * p;
      const x =
        origin[0] +
        Math.cos(lateralAngle) * radial +
        Math.cos(lateralAngle + Math.PI / 2) * skew * p;
      const z =
        origin[2] +
        Math.sin(lateralAngle) * radial +
        Math.sin(lateralAngle + Math.PI / 2) * skew * p;
      const y =
        origin[1] +
        rise * ease +
        Math.sin(p * Math.PI * 2 + rand() * 0.4) * 0.06 * (1 - p);
      points.push([x, y, z]);
    }

    branches.push({ points, tip: true });
  };

  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 1.25 + Math.pow(rand(), 0.62) * 3.25;
    const inner = 1 - radius / 4.6;
    const height = 1.6 + inner * 3.1 + rand() * 1.7;

    addBranch(
      [Math.cos(angle) * radius, GROUND, Math.sin(angle) * radius],
      height,
      0.55 + rand() * 0.7,
    );

    // Side twigs make the silhouette read as a living structure rather than
    // a bundle of independent lines. They are rarer and shorter.
    if (rand() < 0.3) {
      const t = 0.42 + rand() * 0.34;
      const baseAngle = angle + (rand() < 0.5 ? -1 : 1) * (0.7 + rand() * 0.8);
      const twigRadius = radius + Math.sin(t * Math.PI * 0.8) * 0.8;
      addBranch(
        [
          Math.cos(baseAngle) * twigRadius,
          GROUND + height * t,
          Math.sin(baseAngle) * twigRadius,
        ],
        0.6 + rand() * 1.25,
        0.35,
      );
    }
  }

  return branches;
}

export function generateOrganism(seed: number): OrganismData {
  const branches = generateBranches(seed);
  const vertexCount = branches.reduce((sum, b) => sum + Math.max(0, b.points.length - 1) * 2, 0);
  const positions = new Float32Array(vertexCount * 3);
  const progress = new Float32Array(vertexCount);
  const tips = new Float32Array(vertexCount);

  let v = 0;
  let segmentCount = 0;
  for (const branch of branches) {
    const points = branch.points;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const aProgress = clamp((a[1] - GROUND) / MAX_HEIGHT, 0, 1) * 0.96 + 0.02;
      const bProgress = clamp((b[1] - GROUND) / MAX_HEIGHT, 0, 1) * 0.96 + 0.02;

      positions[v * 3 + 0] = a[0];
      positions[v * 3 + 1] = a[1];
      positions[v * 3 + 2] = a[2];
      progress[v] = aProgress;
      tips[v] = 0;
      v++;

      positions[v * 3 + 0] = b[0];
      positions[v * 3 + 1] = b[1];
      positions[v * 3 + 2] = b[2];
      progress[v] = bProgress;
      tips[v] = branch.tip && i === points.length - 2 ? 1 : 0;
      v++;
      segmentCount++;
    }
  }

  return {
    positions,
    progress,
    tips,
    branchCount: branches.length,
    segmentCount,
  };
}
