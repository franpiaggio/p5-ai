import type { SketchExample } from '../sketchExamples';

const generativeFlowers: SketchExample = {
  label: 'Generative flower garden',
  prompt: 'Create a garden of procedurally generated flowers that bloom over time',
  code: `let flowers = [];
let ground;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  ground = height * 0.75;
  for (let i = 0; i < 25; i++) {
    flowers.push({
      x: random(40, width - 40),
      stemH: random(80, 200),
      petalHue: random(360),
      petalCount: floor(random(5, 12)),
      petalSize: random(15, 35),
      bloom: 0,
      bloomSpeed: random(0.005, 0.015),
      delay: random(60, 300),
      sway: random(TWO_PI),
      layers: floor(random(1, 4)),
    });
  }
  background(200, 20, 15);
}

function draw() {
  background(200, 20, 15, 8);

  // ground
  noStroke();
  fill(120, 40, 25);
  rect(0, ground, width, height - ground);

  // grass tufts
  stroke(120, 50, 35);
  strokeWeight(1.5);
  for (let i = 0; i < width; i += 6) {
    let gh = random(5, 20);
    let sway = sin(frameCount * 0.03 + i * 0.1) * 3;
    line(i, ground, i + sway, ground - gh);
  }

  for (let f of flowers) {
    if (frameCount > f.delay && f.bloom < 1) {
      f.bloom = min(1, f.bloom + f.bloomSpeed);
    }

    let swayX = sin(frameCount * 0.02 + f.sway) * 5;

    // stem
    stroke(120, 60, 40);
    strokeWeight(2.5);
    noFill();
    let stemTop = ground - f.stemH * f.bloom;
    beginShape();
    vertex(f.x, ground);
    quadraticVertex(f.x + swayX * 0.5, ground - f.stemH * 0.5, f.x + swayX, stemTop);
    endShape();

    // leaves
    if (f.bloom > 0.3) {
      let leafY = ground - f.stemH * 0.4 * f.bloom;
      let leafX = f.x + swayX * 0.3;
      fill(120, 55, 45, 70);
      noStroke();
      push();
      translate(leafX, leafY);
      rotate(0.3);
      ellipse(8, 0, 20 * f.bloom, 8 * f.bloom);
      pop();
      push();
      translate(leafX, leafY - 15);
      rotate(-0.4);
      ellipse(-8, 0, 18 * f.bloom, 7 * f.bloom);
      pop();
    }

    if (f.bloom <= 0) continue;

    // flower head
    let fx = f.x + swayX;
    let fy = stemTop;
    push();
    translate(fx, fy);

    for (let l = f.layers; l >= 1; l--) {
      let s = f.petalSize * (l / f.layers) * f.bloom;
      let h = (f.petalHue + l * 20) % 360;
      for (let p = 0; p < f.petalCount; p++) {
        let angle = (TWO_PI / f.petalCount) * p + l * 0.2;
        fill(h, 65, 85, 40);
        noStroke();
        push();
        rotate(angle);
        ellipse(s * 0.5, 0, s, s * 0.45);
        pop();
      }
    }

    // center
    fill(45, 80, 95, 80);
    noStroke();
    circle(0, 0, f.petalSize * 0.35 * f.bloom);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  ground = height * 0.75;
}`,
};

export default generativeFlowers;
