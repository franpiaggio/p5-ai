import type { SketchExample } from '../sketchExamples';

const neonTunnel: SketchExample = {
  label: 'Neon tunnel',
  prompt: 'Create an infinite neon tunnel effect with glowing hexagons zooming past',
  code: `function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(0, 0, 3);
  translate(width / 2, height / 2);

  let numRings = 30;
  noFill();

  for (let i = numRings; i > 0; i--) {
    let t = (i + frameCount * 0.05) % numRings;
    let scale = map(t, 0, numRings, 0.01, 1);
    let sz = max(width, height) * scale;
    let hue = (frameCount * 2 + i * 12) % 360;
    let alpha = map(t, 0, numRings, 80, 10);

    push();
    rotate(frameCount * 0.005 + i * 0.02);

    stroke(hue, 80, 90, alpha * 0.3);
    strokeWeight(8 * scale);
    hexagon(0, 0, sz / 2);

    stroke(hue, 60, 100, alpha);
    strokeWeight(2 * scale);
    hexagon(0, 0, sz / 2);
    pop();
  }
}

function hexagon(x, y, r) {
  beginShape();
  for (let i = 0; i <= 6; i++) {
    let a = (TAU / 6) * i - HALF_PI;
    vertex(x + cos(a) * r, y + sin(a) * r);
  }
  endShape();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default neonTunnel;
