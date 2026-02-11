import type { SketchExample } from '../sketchExamples';

const depthFlowField3d: SketchExample = {
  label: '3D depth flow field',
  prompt: 'Create an aesthetic 3D-looking flow field with depth and color',
  code: `let particles = [];
const NUM = 2000;
const NS = 0.005;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(0, 0, 5);
  for (let i = 0; i < NUM; i++) {
    particles.push({
      pos: createVector(random(width), random(height)),
      z: random(1),
      hue: random(200, 300),
    });
  }
}

function draw() {
  background(0, 0, 5, 3);
  noFill();

  for (let p of particles) {
    let angle = noise(p.pos.x * NS, p.pos.y * NS, frameCount * 0.003) * TWO_PI * 4;
    let speed = map(p.z, 0, 1, 0.5, 3);
    p.pos.x += cos(angle) * speed;
    p.pos.y += sin(angle) * speed;

    let size = map(p.z, 0, 1, 1, 4);
    let alpha = map(p.z, 0, 1, 15, 70);
    stroke(p.hue, 60, 90, alpha);
    strokeWeight(size);
    point(p.pos.x, p.pos.y);

    if (p.pos.x < 0 || p.pos.x > width || p.pos.y < 0 || p.pos.y > height) {
      p.pos.set(random(width), random(height));
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default depthFlowField3d;
