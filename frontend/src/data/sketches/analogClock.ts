import type { SketchExample } from '../sketchExamples';

const analogClock: SketchExample = {
  label: 'Analog clock',
  prompt: 'Create a minimal analog clock visualization',
  code: `function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(15);
  translate(width / 2, height / 2);
  let r = min(width, height) * 0.35;

  // Hour marks
  stroke(255, 30);
  strokeWeight(1);
  for (let i = 0; i < 12; i++) {
    let a = (i / 12) * TAU - HALF_PI;
    let inner = i % 3 === 0 ? r * 0.82 : r * 0.88;
    line(cos(a) * inner, sin(a) * inner, cos(a) * r * 0.95, sin(a) * r * 0.95);
  }

  // Minute marks
  stroke(255, 12);
  for (let i = 0; i < 60; i++) {
    let a = (i / 60) * TAU - HALF_PI;
    line(cos(a) * r * 0.92, sin(a) * r * 0.92, cos(a) * r * 0.95, sin(a) * r * 0.95);
  }

  let h = hour() % 12, m = minute(), s = second();
  let ms = millis() % 1000;
  let smoothS = s + ms / 1000;

  // Hour hand
  let ha = ((h + m / 60) / 12) * TAU - HALF_PI;
  stroke(255);
  strokeWeight(4);
  strokeCap(ROUND);
  line(0, 0, cos(ha) * r * 0.5, sin(ha) * r * 0.5);

  // Minute hand
  let ma = ((m + smoothS / 60) / 60) * TAU - HALF_PI;
  strokeWeight(2.5);
  line(0, 0, cos(ma) * r * 0.72, sin(ma) * r * 0.72);

  // Second hand
  let sa = (smoothS / 60) * TAU - HALF_PI;
  stroke(220, 60, 60);
  strokeWeight(1);
  line(0, 0, cos(sa) * r * 0.8, sin(sa) * r * 0.8);

  // Center dot
  noStroke();
  fill(220, 60, 60);
  ellipse(0, 0, 6);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default analogClock;
