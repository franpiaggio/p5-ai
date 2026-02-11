import type { SketchExample } from '../sketchExamples';

const particleFlowField: SketchExample = {
  label: 'Particle flow field',
  prompt: 'Create an animated flow field with particles following Perlin noise',
  code: `let particles = [];
const NUM = 1000;
const NOISE_SCALE = 0.01;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(20);
  for (let i = 0; i < NUM; i++) {
    particles.push(createVector(random(width), random(height)));
  }
}

function draw() {
  background(20, 10);
  stroke(255, 40);
  strokeWeight(1.5);

  for (let p of particles) {
    let angle = noise(p.x * NOISE_SCALE, p.y * NOISE_SCALE, frameCount * 0.005) * TWO_PI * 2;
    p.x += cos(angle) * 1.5;
    p.y += sin(angle) * 1.5;
    point(p.x, p.y);

    if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
      p.x = random(width);
      p.y = random(height);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default particleFlowField;
