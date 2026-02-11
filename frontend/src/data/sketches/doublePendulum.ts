import type { SketchExample } from '../sketchExamples';

const doublePendulum: SketchExample = {
  label: 'Double pendulum',
  prompt: 'Create chaotic double pendulums with colorful trails showing sensitive dependence on initial conditions',
  code: `let pends = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  let len = min(width, height) * 0.15;

  for (let i = 0; i < 3; i++) {
    pends.push({
      a1: PI / 2 + (i - 1) * 0.01,
      a2: PI / 2,
      v1: 0, v2: 0,
      l1: len, l2: len,
      m1: 10, m2: 10,
      trail: [],
      hue: i * 120,
    });
  }
}

function draw() {
  background(0, 0, 5, 15);
  translate(width / 2, height * 0.3);

  let g = 1;

  for (let p of pends) {
    let { a1, a2, v1, v2, l1, l2, m1, m2 } = p;

    let num1 = -g * (2 * m1 + m2) * sin(a1);
    let num2 = -m2 * g * sin(a1 - 2 * a2);
    let num3 = -2 * sin(a1 - a2) * m2;
    let num4 = v2 * v2 * l2 + v1 * v1 * l1 * cos(a1 - a2);
    let den = l1 * (2 * m1 + m2 - m2 * cos(2 * a1 - 2 * a2));
    let acc1 = (num1 + num2 + num3 * num4) / den;

    let n1 = 2 * sin(a1 - a2);
    let n2 = v1 * v1 * l1 * (m1 + m2);
    let n3 = g * (m1 + m2) * cos(a1);
    let n4 = v2 * v2 * l2 * m2 * cos(a1 - a2);
    let den2 = l2 * (2 * m1 + m2 - m2 * cos(2 * a1 - 2 * a2));
    let acc2 = (n1 * (n2 + n3 + n4)) / den2;

    p.v1 += acc1;
    p.v2 += acc2;
    p.a1 += p.v1;
    p.a2 += p.v2;
    p.v1 *= 0.9999;
    p.v2 *= 0.9999;

    let x1 = l1 * sin(p.a1);
    let y1 = l1 * cos(p.a1);
    let x2 = x1 + l2 * sin(p.a2);
    let y2 = y1 + l2 * cos(p.a2);

    p.trail.push({ x: x2, y: y2 });
    if (p.trail.length > 500) p.trail.shift();

    noFill();
    strokeWeight(1.5);
    for (let i = 1; i < p.trail.length; i++) {
      stroke(p.hue, 60, 80, map(i, 0, p.trail.length, 2, 50));
      line(p.trail[i - 1].x, p.trail[i - 1].y, p.trail[i].x, p.trail[i].y);
    }

    stroke(0, 0, 60, 40);
    strokeWeight(2);
    line(0, 0, x1, y1);
    line(x1, y1, x2, y2);

    noStroke();
    fill(p.hue, 60, 90, 70);
    ellipse(x2, y2, 10);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default doublePendulum;
