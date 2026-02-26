import type { SketchExample } from '../sketchExamples';

const coralReef: SketchExample = {
  label: 'Growing coral reef',
  prompt: 'Create an underwater coral reef that grows organically with branching colorful corals',
  code: `let corals = [];
let bubbles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(200, 60, 15);

  // seed corals along the bottom
  for (let i = 0; i < 12; i++) {
    corals.push({
      x: random(50, width - 50),
      y: height - 20,
      branches: [],
      hue: random([0, 15, 30, 170, 280, 320]),
      maxDepth: floor(random(4, 7)),
      growSpeed: random(0.3, 0.8),
      grown: 0,
    });
  }
}

function draw() {
  // water background
  background(200, 60, 15, 5);

  // light rays from top
  noStroke();
  for (let i = 0; i < 5; i++) {
    let rx = width * 0.2 + i * width * 0.15;
    let sway = sin(frameCount * 0.01 + i) * 30;
    fill(180, 20, 40, 2);
    beginShape();
    vertex(rx + sway - 30, 0);
    vertex(rx + sway + 30, 0);
    vertex(rx + sway * 0.5 + 60, height);
    vertex(rx + sway * 0.5 - 60, height);
    endShape(CLOSE);
  }

  // sand floor
  noStroke();
  fill(40, 30, 35);
  rect(0, height - 25, width, 25);
  for (let x = 0; x < width; x += 3) {
    let h = noise(x * 0.02) * 10;
    fill(40, 25, 30 + noise(x * 0.05) * 10);
    ellipse(x, height - 25, 6, h);
  }

  // grow and draw corals
  for (let c of corals) {
    c.grown = min(1, c.grown + c.growSpeed * 0.005);
    drawBranch(c.x, c.y, -HALF_PI, 40 * c.grown, c.maxDepth, c.hue, 4, c);
  }

  // bubbles
  if (random() < 0.1) {
    bubbles.push({
      x: random(width),
      y: height,
      size: random(3, 8),
      speed: random(0.5, 1.5),
    });
  }

  noFill();
  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];
    b.y -= b.speed;
    b.x += sin(frameCount * 0.03 + b.x) * 0.5;
    stroke(180, 20, 80, 30);
    strokeWeight(0.5);
    circle(b.x, b.y, b.size);
    if (b.y < -10) bubbles.splice(i, 1);
  }
}

function drawBranch(x, y, angle, len, depth, hue, weight, coral) {
  if (depth <= 0 || len < 5) return;

  let x2 = x + cos(angle) * len;
  let y2 = y + sin(angle) * len;

  let sway = sin(frameCount * 0.02 + x * 0.01) * 2 / (7 - depth);
  x2 += sway;

  stroke((hue + depth * 10) % 360, 60, 70 + depth * 5, 60);
  strokeWeight(weight);
  line(x, y, x2, y2);

  // polyp tip
  if (depth <= 2) {
    noStroke();
    fill((hue + 30) % 360, 70, 90, 40);
    circle(x2, y2, weight * 2);
  }

  let spread = random(0.3, 0.6);
  let shrink = random(0.6, 0.8);
  drawBranch(x2, y2, angle - spread, len * shrink, depth - 1, hue, weight * 0.7, coral);
  drawBranch(x2, y2, angle + spread, len * shrink, depth - 1, hue, weight * 0.7, coral);
  if (random() < 0.3) {
    drawBranch(x2, y2, angle + random(-0.2, 0.2), len * shrink * 0.8, depth - 1, hue, weight * 0.6, coral);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default coralReef;
