import type { SketchExample } from '../sketchExamples';

const kaleidoscopePainter: SketchExample = {
  label: 'Kaleidoscope painter',
  prompt: 'Create an interactive kaleidoscope that mirrors mouse drawing',
  code: `const SEGMENTS = 8;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(10);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  if (!mouseIsPressed) return;
  translate(width / 2, height / 2);

  let mx = mouseX - width / 2;
  let my = mouseY - height / 2;
  let px = pmouseX - width / 2;
  let py = pmouseY - height / 2;

  let hue = (frameCount * 2) % 360;
  stroke(hue, 70, 90, 60);
  strokeWeight(3);

  for (let i = 0; i < SEGMENTS; i++) {
    let angle = (i / SEGMENTS) * TAU;
    push();
    rotate(angle);
    line(mx, my, px, py);
    scale(1, -1);
    line(mx, my, px, py);
    pop();
  }
}

function mousePressed() {
  if (mouseButton === RIGHT) background(10);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default kaleidoscopePainter;
