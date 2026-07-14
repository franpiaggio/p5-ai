import type { SketchExample } from '../sketchExamples';

const paletteJs = `// palette.js — shared color helper used by particle.js.
// Files load as globals in order, so nodeColor() is available everywhere.
function nodeColor(t) {
  const hue = (200 + 120 * sin(t)) % 360;
  return color(hue, 65, 100);
}`;

const particleJs = `// particle.js — a single drifting node. Uses nodeColor() from palette.js.
class Particle {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D().mult(random(0.3, 1.1));
    this.seed = random(1000);
  }
  update() {
    this.pos.add(this.vel);
    if (this.pos.x < 0 || this.pos.x > width) this.vel.x *= -1;
    if (this.pos.y < 0 || this.pos.y > height) this.vel.y *= -1;
  }
  draw() {
    noStroke();
    fill(nodeColor(frameCount * 0.01 + this.seed));
    circle(this.pos.x, this.pos.y, 7);
  }
}`;

const sketchJs = `// sketch.js — entry point.
// Loads after palette.js and particle.js, so Particle and nodeColor exist.
let particles = [];
const COUNT = 80;
const LINK_DIST = 120;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < COUNT; i++) particles.push(new Particle());
}

function draw() {
  background(225, 45, 8);

  // Draw links between nearby nodes.
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      const d = dist(a.pos.x, a.pos.y, b.pos.x, b.pos.y);
      if (d < LINK_DIST) {
        stroke(210, 30, 100, map(d, 0, LINK_DIST, 35, 0));
        strokeWeight(1);
        line(a.pos.x, a.pos.y, b.pos.x, b.pos.y);
      }
    }
  }

  for (const p of particles) {
    p.update();
    p.draw();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`;

const constellationNetwork: SketchExample = {
  label: 'Constellation network',
  prompt: 'A drifting particle constellation with lines connecting nearby nodes, split across files',
  code: sketchJs,
  files: [
    { name: 'palette.js', content: paletteJs },
    { name: 'particle.js', content: particleJs },
    { name: 'sketch.js', content: sketchJs },
  ],
};

export default constellationNetwork;
