export interface SketchExample {
  label: string;
  prompt: string;
  code: string;
}

import {
  particleFlowField,
  depthFlowField3d,
  interactiveAnimatedGrid,
  artisticSdfMetaballs,
  animated10PrintPattern,
  selfPlayingPong,
  rainWithSplashes,
  starfieldHyperspace,
  animatedFractalTree,
  waveInterferencePattern,
  spiralGalaxy,
  gravityBouncingBalls,
  lissajousCurves,
  conwaysGameOfLife,
  flockingBoids,
  recursiveMazeGenerator,
  fireworksDisplay,
  retroPlasmaEffect,
  analogClock,
  kaleidoscopePainter,
  simpleClothSimulation,
  matrixDigitalRain,
  perlinNoiseTerrain,
  orbitingSolarSystem,
  risingBubbles,
  lightningBolts,
  voronoiDiagram,
  smokeParticles,
  concentricPulseRings,
  pendulumWave,
  auroraBorelais,
  generativeCityscape,
  morphingPolygons,
  neonTunnel,
  fallingLeaves,
  moirePattern,
  ripplePond,
  magneticFieldLines,
  doublePendulum,
} from './sketches';

export const SKETCH_EXAMPLES: SketchExample[] = [
  particleFlowField,
  depthFlowField3d,
  interactiveAnimatedGrid,
  artisticSdfMetaballs,
  animated10PrintPattern,
  selfPlayingPong,
  rainWithSplashes,
  starfieldHyperspace,
  animatedFractalTree,
  waveInterferencePattern,
  spiralGalaxy,
  gravityBouncingBalls,
  lissajousCurves,
  conwaysGameOfLife,
  flockingBoids,
  recursiveMazeGenerator,
  fireworksDisplay,
  retroPlasmaEffect,
  analogClock,
  kaleidoscopePainter,
  simpleClothSimulation,
  matrixDigitalRain,
  perlinNoiseTerrain,
  orbitingSolarSystem,
  risingBubbles,
  lightningBolts,
  voronoiDiagram,
  smokeParticles,
  concentricPulseRings,
  pendulumWave,
  auroraBorelais,
  generativeCityscape,
  morphingPolygons,
  neonTunnel,
  fallingLeaves,
  moirePattern,
  ripplePond,
  magneticFieldLines,
  doublePendulum,
];

/** Pick a random example. Rotates through so the same one doesn't repeat back-to-back. */
let lastIdx = -1;
export function getRandomExample(): SketchExample {
  let idx = Math.floor(Math.random() * SKETCH_EXAMPLES.length);
  if (idx === lastIdx && SKETCH_EXAMPLES.length > 1) {
    idx = (idx + 1) % SKETCH_EXAMPLES.length;
  }
  lastIdx = idx;
  return SKETCH_EXAMPLES[idx];
}
