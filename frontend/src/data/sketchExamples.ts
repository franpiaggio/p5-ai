import type { Library } from '../types';

/** A file inside a multi-file example. `content` of the file named `sketch.js`
 * must match the example's top-level `code` (the entry point / thumbnail source). */
export interface ExampleFile {
  name: string;
  content: string;
}

export interface SketchExample {
  label: string;
  prompt: string;
  /** Entry-point (sketch.js) source. Always set — used for thumbnails and as the
   * single-file fallback when `files` is absent. */
  code: string;
  /** Optional multi-file set (includes sketch.js). When present, the sketch loads
   * as multiple files instead of a single sketch.js. */
  files?: ExampleFile[];
  /** Optional CDN libraries this example needs. */
  libraries?: Library[];
}

/** An example plus its stable, URL-safe identifier used in the /example/:slug
 * route. The slug is assigned centrally in SKETCH_EXAMPLES (below) rather than in
 * each sketch file. Never derive it from `label` at runtime — changing a label
 * must not break shared links. */
export interface SketchExampleEntry extends SketchExample {
  slug: string;
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
  jellyfishSwarm,
  generativeFlowers,
  firefliesNight,
  hypnoticSpiral,
  bioluminescentOcean,
  geometricRose,
  stainedGlass,
  dandelionSeeds,
  inkDropWater,
  coralReef,
  phyllotaxisBloom,
  lorenzAttractor,
  circlePacking,
  noiseColorField,
  reactionDiffusion,
  glitchWaves,
  zenGarden,
  watercolorBlobs,
  sacredGeometry,
  rainOnWindow,
  floatingLanterns,
  crystalCave3d,
  cherryBlossomWind,
  parametricSculpture3d,
  breathingLight,
  infinityMirror3d,
  constellationNetwork,
} from './sketches';

export const SKETCH_EXAMPLES: SketchExampleEntry[] = [
  { slug: 'constellation-network', ...constellationNetwork },
  { slug: 'particle-flow-field', ...particleFlowField },
  { slug: 'depth-flow-field-3d', ...depthFlowField3d },
  { slug: 'interactive-animated-grid', ...interactiveAnimatedGrid },
  { slug: 'artistic-sdf-metaballs', ...artisticSdfMetaballs },
  { slug: 'animated-10-print-pattern', ...animated10PrintPattern },
  { slug: 'self-playing-pong', ...selfPlayingPong },
  { slug: 'rain-with-splashes', ...rainWithSplashes },
  { slug: 'starfield-hyperspace', ...starfieldHyperspace },
  { slug: 'animated-fractal-tree', ...animatedFractalTree },
  { slug: 'wave-interference-pattern', ...waveInterferencePattern },
  { slug: 'spiral-galaxy', ...spiralGalaxy },
  { slug: 'gravity-bouncing-balls', ...gravityBouncingBalls },
  { slug: 'lissajous-curves', ...lissajousCurves },
  { slug: 'conways-game-of-life', ...conwaysGameOfLife },
  { slug: 'flocking-boids', ...flockingBoids },
  { slug: 'recursive-maze-generator', ...recursiveMazeGenerator },
  { slug: 'fireworks-display', ...fireworksDisplay },
  { slug: 'retro-plasma-effect', ...retroPlasmaEffect },
  { slug: 'analog-clock', ...analogClock },
  { slug: 'kaleidoscope-painter', ...kaleidoscopePainter },
  { slug: 'simple-cloth-simulation', ...simpleClothSimulation },
  { slug: 'matrix-digital-rain', ...matrixDigitalRain },
  { slug: 'perlin-noise-terrain', ...perlinNoiseTerrain },
  { slug: 'orbiting-solar-system', ...orbitingSolarSystem },
  { slug: 'rising-bubbles', ...risingBubbles },
  { slug: 'lightning-bolts', ...lightningBolts },
  { slug: 'voronoi-diagram', ...voronoiDiagram },
  { slug: 'smoke-particles', ...smokeParticles },
  { slug: 'concentric-pulse-rings', ...concentricPulseRings },
  { slug: 'pendulum-wave', ...pendulumWave },
  { slug: 'aurora-borelais', ...auroraBorelais },
  { slug: 'generative-cityscape', ...generativeCityscape },
  { slug: 'morphing-polygons', ...morphingPolygons },
  { slug: 'neon-tunnel', ...neonTunnel },
  { slug: 'falling-leaves', ...fallingLeaves },
  { slug: 'moire-pattern', ...moirePattern },
  { slug: 'ripple-pond', ...ripplePond },
  { slug: 'magnetic-field-lines', ...magneticFieldLines },
  { slug: 'double-pendulum', ...doublePendulum },
  { slug: 'jellyfish-swarm', ...jellyfishSwarm },
  { slug: 'generative-flowers', ...generativeFlowers },
  { slug: 'fireflies-night', ...firefliesNight },
  { slug: 'hypnotic-spiral', ...hypnoticSpiral },
  { slug: 'bioluminescent-ocean', ...bioluminescentOcean },
  { slug: 'geometric-rose', ...geometricRose },
  { slug: 'stained-glass', ...stainedGlass },
  { slug: 'dandelion-seeds', ...dandelionSeeds },
  { slug: 'ink-drop-water', ...inkDropWater },
  { slug: 'coral-reef', ...coralReef },
  { slug: 'phyllotaxis-bloom', ...phyllotaxisBloom },
  { slug: 'lorenz-attractor', ...lorenzAttractor },
  { slug: 'circle-packing', ...circlePacking },
  { slug: 'noise-color-field', ...noiseColorField },
  { slug: 'reaction-diffusion', ...reactionDiffusion },
  { slug: 'glitch-waves', ...glitchWaves },
  { slug: 'zen-garden', ...zenGarden },
  { slug: 'watercolor-blobs', ...watercolorBlobs },
  { slug: 'sacred-geometry', ...sacredGeometry },
  { slug: 'rain-on-window', ...rainOnWindow },
  { slug: 'floating-lanterns', ...floatingLanterns },
  { slug: 'crystal-cave-3d', ...crystalCave3d },
  { slug: 'cherry-blossom-wind', ...cherryBlossomWind },
  { slug: 'parametric-sculpture-3d', ...parametricSculpture3d },
  { slug: 'breathing-light', ...breathingLight },
  { slug: 'infinity-mirror-3d', ...infinityMirror3d },
];

/** Look up an example by its stable slug (for the /example/:slug route). */
export function getExampleBySlug(slug: string): SketchExampleEntry | undefined {
  return SKETCH_EXAMPLES.find((e) => e.slug === slug);
}

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
