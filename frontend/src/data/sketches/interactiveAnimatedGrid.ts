import type { SketchExample } from '../sketchExamples';

const interactiveAnimatedGrid: SketchExample = {
  label: 'Interactive animated grid',
  prompt: 'Create an animated grid of rotating squares that react to the mouse',
  code: `const COLS = 20;
const ROWS = 20;

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(15);
  let w = width / COLS;
  let h = height / ROWS;

  noFill();
  stroke(255);
  strokeWeight(1);

  let mx = mouseX || width / 2;
  let my = mouseY || height / 2;

  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < ROWS; j++) {
      let x = i * w + w / 2;
      let y = j * h + h / 2;
      let d = dist(x, y, mx, my);
      let maxD = sqrt(width * width + height * height) / 2;
      let offset = map(d, 0, maxD, 0, TWO_PI);
      let s = map(sin(frameCount * 0.05 + offset), -1, 1, 2, min(w, h) * 0.8);

      push();
      translate(x, y);
      rotate(frameCount * 0.02 + offset);
      rectMode(CENTER);
      rect(0, 0, s, s);
      pop();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default interactiveAnimatedGrid;
