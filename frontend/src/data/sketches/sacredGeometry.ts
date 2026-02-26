import type { SketchExample } from '../sketchExamples';

const sacredGeometry: SketchExample = {
  label: 'Sacred geometry mandala',
  prompt: 'Create a meditative sacred geometry mandala with rotating golden ratio patterns, flower of life, and pulsing energy',
  code: `let phi = (1 + Math.sqrt(5)) / 2;
let layers = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  for (let i = 0; i < 8; i++) {
    layers.push({
      petals: floor(random([6, 8, 12, 16])),
      radius: 40 + i * 45,
      rotSpeed: (i % 2 === 0 ? 1 : -1) * 0.001 * (8 - i),
      hue: (i * 45 + 200) % 360,
      phase: i * 0.5,
    });
  }
}

function draw() {
  background(240, 15, 8, 20);

  translate(width / 2, height / 2);
  let t = frameCount * 0.01;
  let breathe = sin(t * 0.5) * 0.15 + 1;

  // outer glow
  noStroke();
  for (let r = 350; r > 0; r -= 5) {
    fill(260, 30, 60, map(r, 0, 350, 3, 0));
    circle(0, 0, r * 2 * breathe);
  }

  // flower of life base
  stroke(50, 20, 60, 15);
  strokeWeight(0.5);
  noFill();
  let baseR = 60 * breathe;
  circle(0, 0, baseR * 2);
  for (let a = 0; a < 6; a++) {
    let angle = a * PI / 3 + t * 0.1;
    circle(cos(angle) * baseR, sin(angle) * baseR, baseR * 2);
  }

  // rotating mandala layers
  for (let layer of layers) {
    push();
    rotate(t * layer.rotSpeed);
    let r = layer.radius * breathe;
    let pulse = sin(t * 2 + layer.phase) * 0.3 + 0.7;
    let hue = (layer.hue + t * 5) % 360;

    for (let i = 0; i < layer.petals; i++) {
      let angle = (TWO_PI / layer.petals) * i;
      push();
      rotate(angle);

      // petal shape
      stroke(hue, 50, 80, 30 * pulse);
      strokeWeight(1);
      noFill();
      beginShape();
      for (let p = 0; p <= 1; p += 0.05) {
        let pr = r * sin(p * PI) * 0.4;
        let px = r * 0.3 + p * r * 0.7;
        let py = pr * sin(p * PI + t);
        vertex(px, py);
      }
      endShape();
      beginShape();
      for (let p = 0; p <= 1; p += 0.05) {
        let pr = r * sin(p * PI) * 0.4;
        let px = r * 0.3 + p * r * 0.7;
        let py = -pr * sin(p * PI + t);
        vertex(px, py);
      }
      endShape();

      // energy dots at tips
      let dotSize = 3 * pulse;
      fill(hue, 40, 95, 60 * pulse);
      noStroke();
      circle(r, 0, dotSize);

      pop();
    }

    // connecting ring
    noFill();
    stroke(hue, 30, 70, 20 * pulse);
    strokeWeight(0.5);
    circle(0, 0, r * 2);

    pop();
  }

  // golden spiral overlay
  stroke(45, 60, 90, 25);
  strokeWeight(1);
  noFill();
  beginShape();
  for (let a = 0; a < TWO_PI * 4; a += 0.05) {
    let spiralR = 5 * pow(phi, a / (TWO_PI * 0.5)) * breathe * 0.3;
    let sa = a + t * 0.2;
    if (spiralR < 350) {
      vertex(cos(sa) * spiralR, sin(sa) * spiralR);
    }
  }
  endShape();

  // center seed of life
  noStroke();
  for (let r = 20; r > 0; r -= 2) {
    fill(45, 40, 100, map(r, 0, 20, 50, 5) * breathe);
    circle(0, 0, r * breathe);
  }

  // floating particles
  for (let i = 0; i < 50; i++) {
    let angle = noise(i * 10, t * 0.3) * TWO_PI * 2;
    let dist = noise(i * 20, t * 0.2) * 300 * breathe;
    let px = cos(angle) * dist;
    let py = sin(angle) * dist;
    let alpha = noise(i * 30, t * 0.5) * 40;
    fill(45, 30, 100, alpha);
    circle(px, py, 2);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default sacredGeometry;
