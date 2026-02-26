import type { SketchExample } from '../sketchExamples';

const hypnoticSpiral: SketchExample = {
  label: 'Hypnotic spiral',
  prompt: 'Create a mesmerizing rotating spiral optical illusion with shifting colors',
  code: `function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(0, 0, 5);
  translate(width / 2, height / 2);

  let maxR = min(width, height) * 0.45;
  let arms = 6;
  let twist = 12;
  let t = frameCount * 0.02;

  // draw spiral arms
  for (let arm = 0; arm < arms; arm++) {
    let armOffset = (TWO_PI / arms) * arm;

    for (let r = 5; r < maxR; r += 2) {
      let frac = r / maxR;
      let angle = armOffset + frac * twist + t;
      let x = cos(angle) * r;
      let y = sin(angle) * r;

      let hue = (frac * 360 + frameCount * 2 + arm * 60) % 360;
      let thickness = map(frac, 0, 1, 8, 2);
      let alpha = map(frac, 0, 1, 70, 30);

      noStroke();
      fill(hue, 70, 90, alpha);
      circle(x, y, thickness);
    }
  }

  // center glow
  for (let g = 5; g > 0; g--) {
    let hue = (frameCount * 2) % 360;
    fill(hue, 50, 100, 8);
    circle(0, 0, g * 30);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default hypnoticSpiral;
