import type { SketchExample } from '../sketchExamples';

const gravityBouncingBalls: SketchExample = {
  label: 'Gravity bouncing balls',
  prompt: 'Create colorful balls bouncing with gravity and friction',
  code: `let balls = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let i = 0; i < 30; i++) {
    balls.push({
      x: random(width),
      y: random(height / 2),
      vx: random(-3, 3),
      vy: 0,
      r: random(10, 30),
      hue: random(360),
    });
  }
  colorMode(HSB, 360, 100, 100);
}

function draw() {
  background(15);

  for (let b of balls) {
    b.vy += 0.4;
    b.x += b.vx;
    b.y += b.vy;

    if (b.y + b.r > height) {
      b.y = height - b.r;
      b.vy *= -0.75;
    }
    if (b.x - b.r < 0 || b.x + b.r > width) b.vx *= -0.9;
    b.x = constrain(b.x, b.r, width - b.r);

    noStroke();
    fill(b.hue, 70, 90);
    ellipse(b.x, b.y, b.r * 2);
    fill(b.hue, 40, 100, 0.3);
    ellipse(b.x, height - 2, b.r * 2 * 0.8, b.r * 0.3);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default gravityBouncingBalls;
