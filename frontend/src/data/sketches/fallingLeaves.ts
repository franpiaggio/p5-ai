import type { SketchExample } from '../sketchExamples';

const fallingLeaves: SketchExample = {
  label: 'Autumn leaves',
  prompt: 'Create falling autumn leaves drifting in the wind with natural tumbling motion',
  code: `let leaves = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 60; i++) {
    leaves.push(makeLeaf(random(width), random(-height, height)));
  }
}

function makeLeaf(x, y) {
  return {
    x, y,
    size: random(8, 20),
    rot: random(TAU),
    rotSpeed: random(-0.03, 0.03),
    vx: 0,
    vy: random(0.5, 2),
    wobble: random(TAU),
    wobbleSpeed: random(0.02, 0.05),
    hue: random(15, 50),
    sat: random(60, 90),
    bri: random(50, 85),
  };
}

function draw() {
  background(210, 15, 92, 10);

  let wind = sin(frameCount * 0.01) * 0.5;

  for (let leaf of leaves) {
    leaf.wobble += leaf.wobbleSpeed;
    leaf.vx = wind + sin(leaf.wobble) * 0.8;
    leaf.x += leaf.vx;
    leaf.y += leaf.vy;
    leaf.rot += leaf.rotSpeed;

    push();
    translate(leaf.x, leaf.y);
    rotate(leaf.rot);
    scale(abs(sin(leaf.wobble)) + 0.3, 1);

    noStroke();
    fill(leaf.hue, leaf.sat, leaf.bri, 70);
    beginShape();
    vertex(0, -leaf.size);
    bezierVertex(leaf.size * 0.5, -leaf.size * 0.3, leaf.size * 0.5, leaf.size * 0.3, 0, leaf.size);
    bezierVertex(-leaf.size * 0.5, leaf.size * 0.3, -leaf.size * 0.5, -leaf.size * 0.3, 0, -leaf.size);
    endShape(CLOSE);

    stroke(leaf.hue - 10, leaf.sat - 10, leaf.bri - 20, 40);
    strokeWeight(0.5);
    line(0, -leaf.size * 0.8, 0, leaf.size * 0.8);
    pop();

    if (leaf.y > height + 30) Object.assign(leaf, makeLeaf(random(width), random(-50, -10)));
    if (leaf.x > width + 30) leaf.x = -30;
    if (leaf.x < -30) leaf.x = width + 30;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default fallingLeaves;
