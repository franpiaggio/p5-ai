import type { SketchExample } from '../sketchExamples';

const lissajousCurves: SketchExample = {
  label: 'Lissajous curves',
  prompt: 'Create animated Lissajous curves with trailing colors',
  code: `let t = 0;
let trail = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(10);
}

function draw() {
  background(10, 8);
  translate(width / 2, height / 2);

  let a = 3, b = 4;
  let r = min(width, height) * 0.35;
  let x = sin(a * t + PI / 4) * r;
  let y = sin(b * t) * r;

  trail.push({ x, y, hue: (frameCount * 2) % 360 });
  if (trail.length > 500) trail.shift();

  noFill();
  strokeWeight(2);
  for (let i = 1; i < trail.length; i++) {
    let alpha = map(i, 0, trail.length, 5, 80);
    stroke(trail[i].hue, 70, 90, alpha);
    line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
  }

  fill(0, 0, 100);
  noStroke();
  ellipse(x, y, 8);

  t += 0.015;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default lissajousCurves;
