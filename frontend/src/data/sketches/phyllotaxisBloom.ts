import type { SketchExample } from '../sketchExamples';

const phyllotaxisBloom: SketchExample = {
  label: 'Phyllotaxis bloom',
  prompt: 'Create a sunflower-like phyllotaxis pattern using the golden angle with blooming animation',
  code: `let count = 0;
const GOLDEN_ANGLE = 137.508;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(0, 0, 8);
}

function draw() {
  background(0, 0, 8, 3);
  translate(width / 2, height / 2);

  let maxR = min(width, height) * 0.42;
  let total = min(count, 800);

  for (let i = 0; i < total; i++) {
    let angle = i * radians(GOLDEN_ANGLE);
    let r = sqrt(i) * (maxR / sqrt(total));
    let x = cos(angle) * r;
    let y = sin(angle) * r;

    let frac = i / total;
    let hue = (frac * 280 + frameCount * 0.3) % 360;
    let sat = 60 + sin(i * 0.1 + frameCount * 0.02) * 20;
    let bright = 70 + frac * 25;
    let size = map(r, 0, maxR, 14, 4);

    // breathing
    let pulse = sin(frameCount * 0.03 + i * 0.02) * 0.15 + 1;
    size *= pulse;

    noStroke();
    fill(hue, sat, bright, 75);
    circle(x, y, size);

    // inner highlight
    fill(hue, sat - 20, bright + 15, 40);
    circle(x - size * 0.1, y - size * 0.1, size * 0.5);
  }

  if (count < 800) count += 4;

  // center
  fill(45, 70, 80, 60);
  circle(0, 0, 15);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(0, 0, 8);
}`,
};

export default phyllotaxisBloom;
