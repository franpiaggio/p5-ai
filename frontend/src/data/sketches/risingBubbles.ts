import type { SketchExample } from '../sketchExamples';

const risingBubbles: SketchExample = {
  label: 'Rising bubbles',
  prompt: 'Create a relaxing animation of bubbles rising with subtle physics',
  code: `let bubbles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let i = 0; i < 40; i++) bubbles.push(makeBubble());
}

function makeBubble() {
  return {
    x: random(width),
    y: random(height, height + 200),
    r: random(8, 40),
    speed: random(0.5, 2),
    wobble: random(TAU),
    wobbleSpeed: random(0.01, 0.04),
  };
}

function draw() {
  background(10, 20, 40);

  for (let b of bubbles) {
    b.y -= b.speed;
    b.wobble += b.wobbleSpeed;
    let wx = sin(b.wobble) * 20;

    noFill();
    stroke(120, 180, 255, 60);
    strokeWeight(1.5);
    ellipse(b.x + wx, b.y, b.r * 2);

    // Highlight
    noStroke();
    fill(200, 230, 255, 40);
    ellipse(b.x + wx - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.5);

    if (b.y + b.r < 0) {
      b.y = height + b.r;
      b.x = random(width);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default risingBubbles;
