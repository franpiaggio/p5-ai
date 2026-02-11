import type { SketchExample } from '../sketchExamples';

const moirePattern: SketchExample = {
  label: 'Moire interference',
  prompt: 'Create a moire pattern with two overlapping sets of concentric circles that drift apart',
  code: `function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);

  let cx1 = width / 2;
  let cy1 = height / 2;
  let cx2 = width / 2 + sin(frameCount * 0.02) * 80;
  let cy2 = height / 2 + cos(frameCount * 0.015) * 80;

  stroke(255, 30);
  strokeWeight(1);
  noFill();

  let maxR = dist(0, 0, width, height);
  let spacing = 8;

  for (let r = spacing; r < maxR; r += spacing) {
    ellipse(cx1, cy1, r * 2);
    ellipse(cx2, cy2, r * 2);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default moirePattern;
