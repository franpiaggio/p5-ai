import type { SketchExample } from '../sketchExamples';

const spiralGalaxy: SketchExample = {
  label: 'Spiral galaxy',
  prompt: 'Create a rotating spiral galaxy with thousands of stars',
  code: `let stars = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 3000; i++) {
    let arm = floor(random(3));
    let d = random(0.01, 1);
    let angle = d * 8 + (arm * TAU) / 3 + random(-0.3, 0.3);
    let r = d * min(width, height) * 0.4;
    stars.push({ angle, r, d, size: random(1, 3), hue: random(200, 280) });
  }
}

function draw() {
  background(0, 0, 5, 15);
  translate(width / 2, height / 2);
  let t = frameCount * 0.002;

  for (let s of stars) {
    let a = s.angle + t / (s.d + 0.1);
    let x = cos(a) * s.r;
    let y = sin(a) * s.r * 0.6;
    let bright = map(s.d, 0, 1, 100, 40);
    stroke(s.hue, 40, bright, 60);
    strokeWeight(s.size);
    point(x, y);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default spiralGalaxy;
