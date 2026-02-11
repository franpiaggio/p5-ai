import type { SketchExample } from '../sketchExamples';

const concentricPulseRings: SketchExample = {
  label: 'Concentric pulse rings',
  prompt: 'Create expanding concentric rings that pulse outward from center',
  code: `let rings = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(0, 0, 5);
  translate(width / 2, height / 2);

  if (frameCount % 20 === 0) {
    rings.push({ r: 0, hue: (frameCount * 3) % 360, life: 1 });
  }

  noFill();
  for (let i = rings.length - 1; i >= 0; i--) {
    let ring = rings[i];
    ring.r += 3;
    ring.life -= 0.005;

    if (ring.life <= 0) {
      rings.splice(i, 1);
      continue;
    }

    let alpha = ring.life * 70;
    strokeWeight(map(ring.life, 0, 1, 0.5, 3));
    stroke(ring.hue, 60, 90, alpha);
    ellipse(0, 0, ring.r * 2);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default concentricPulseRings;
