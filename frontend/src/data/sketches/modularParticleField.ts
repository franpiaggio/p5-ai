import type { SketchExample } from '../sketchExamples';

const paletteJs = `// palette.js — exports a color helper. Imported by particle.js.
export function nodeColor(t) {
  const hue = (200 + 120 * Math.sin(t)) % 360;
  return color(hue, 65, 100);
}`;

const particleJs = `// particle.js — imports nodeColor, exports the Particle class.
import { nodeColor } from './palette.js';

export class Particle {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D().mult(random(0.3, 1.2));
    this.size = random(8, 22);
    this.seed = random(1000);
  }
  update() {
    this.pos.add(this.vel);
    if (this.pos.x < 0 || this.pos.x > width) this.vel.x *= -1;
    if (this.pos.y < 0 || this.pos.y > height) this.vel.y *= -1;
  }
  draw() {
    noStroke();
    fill(nodeColor(frameCount * 0.02 + this.seed));
    circle(this.pos.x, this.pos.y, this.size);
  }
}`;

const sketchJs = `// sketch.js — entry point. Imports Particle; setup()/draw() are
// re-exposed to p5's global mode automatically.
import { Particle } from './particle.js';

let particles = [];
const COUNT = 45;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100);
  for (let i = 0; i < COUNT; i++) particles.push(new Particle());
}

function draw() {
  background(230, 45, 9);
  for (const p of particles) {
    p.update();
    p.draw();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`;

const modularParticleField: SketchExample = {
  label: 'Modular particle field',
  prompt: 'A drifting particle field split across ES module files with real import/export',
  code: sketchJs,
  files: [
    { name: 'palette.js', content: paletteJs },
    { name: 'particle.js', content: particleJs },
    { name: 'sketch.js', content: sketchJs },
  ],
};

export default modularParticleField;
