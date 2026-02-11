import type { SketchExample } from '../sketchExamples';

const pendulumWave: SketchExample = {
  label: 'Pendulum wave',
  prompt: 'Create a row of pendulums with increasing periods that form mesmerizing wave patterns',
  code: `let pendulums = [];
let numPendulums = 20;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < numPendulums; i++) {
    pendulums.push({
      period: map(i, 0, numPendulums - 1, 1, 2),
      length: min(width, height) * 0.35,
    });
  }
}

function draw() {
  background(0, 0, 8);
  let spacing = width / (numPendulums + 1);

  for (let i = 0; i < pendulums.length; i++) {
    let p = pendulums[i];
    let x = spacing * (i + 1);
    let pivotY = height * 0.1;

    let angle = sin(frameCount * 0.03 * p.period) * PI / 3;
    let bobX = x + sin(angle) * p.length;
    let bobY = pivotY + cos(angle) * p.length;

    let hue = map(i, 0, numPendulums, 0, 300);

    stroke(0, 0, 30, 40);
    strokeWeight(1);
    line(x, pivotY, bobX, bobY);

    noStroke();
    fill(hue, 70, 90, 15);
    ellipse(bobX, bobY, 40);
    fill(hue, 70, 90, 80);
    ellipse(bobX, bobY, 20);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default pendulumWave;
