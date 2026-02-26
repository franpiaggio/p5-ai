import type { SketchExample } from '../sketchExamples';

const breathingLight: SketchExample = {
  label: 'Breathing light',
  prompt: 'Create a meditative breathing light orb that slowly pulses with organic, calming energy and radiating halos',
  code: `let particles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  for (let i = 0; i < 200; i++) {
    particles.push({
      angle: random(TWO_PI),
      dist: random(20, 200),
      speed: random(0.002, 0.008),
      size: random(1, 4),
      phase: random(TWO_PI),
      hue: random(170, 260),
    });
  }
}

function draw() {
  background(230, 25, 5, 30);

  translate(width / 2, height / 2);

  let t = frameCount * 0.008;

  // breathing rhythm (4-7-8 pattern inspired)
  let cycle = t % (TWO_PI * 2);
  let breathe;
  if (cycle < PI) {
    breathe = sin(cycle) * 0.4 + 0.6; // inhale
  } else if (cycle < PI * 1.5) {
    breathe = 1; // hold
  } else {
    breathe = cos((cycle - PI * 1.5) * 1.3) * 0.4 + 0.6; // exhale
  }

  // outer atmospheric rings
  noFill();
  for (let i = 0; i < 8; i++) {
    let ringR = (150 + i * 40) * breathe;
    let alpha = map(i, 0, 8, 8, 1);
    let hue = (210 + i * 10 + t * 5) % 360;
    stroke(hue, 30, 70, alpha);
    strokeWeight(1 + sin(t + i * 0.5) * 0.5);
    circle(0, 0, ringR * 2);
  }

  // radiating light rays
  for (let i = 0; i < 12; i++) {
    let angle = (TWO_PI / 12) * i + t * 0.1;
    let rayLen = (100 + sin(t * 1.5 + i * 0.8) * 40) * breathe;

    stroke(220, 20, 80, 5);
    strokeWeight(8 * breathe);
    let rx = cos(angle) * rayLen;
    let ry = sin(angle) * rayLen;
    line(0, 0, rx, ry);
  }

  // main orb glow layers
  noStroke();
  for (let r = 300 * breathe; r > 0; r -= 3) {
    let t2 = r / (300 * breathe);
    let hue = lerp(200, 260, t2);
    let sat = lerp(20, 50, t2);
    let bright = lerp(90, 30, t2);
    let alpha = lerp(1, 0, pow(t2, 0.5)) * 5;
    fill(hue + sin(t + t2 * 5) * 10, sat, bright, alpha);
    circle(0, 0, r * 2);
  }

  // inner organic shape
  noStroke();
  let innerR = 60 * breathe;
  for (let layer = 0; layer < 5; layer++) {
    let lr = innerR * (1 - layer * 0.15);
    let hue = lerp(200, 180, layer / 5) + sin(t * 2) * 10;
    let alpha = lerp(40, 80, layer / 5);
    fill(hue, 30, 95, alpha);

    beginShape();
    for (let a = 0; a < TWO_PI; a += 0.05) {
      let noiseR = lr + noise(cos(a) + 1, sin(a) + 1, t * 0.5 + layer) * lr * 0.3;
      vertex(cos(a) * noiseR, sin(a) * noiseR);
    }
    endShape(CLOSE);
  }

  // bright core
  fill(190, 15, 100, 60 * breathe);
  circle(0, 0, 30 * breathe);
  fill(0, 0, 100, 80 * breathe);
  circle(0, 0, 12 * breathe);

  // orbiting particles
  for (let p of particles) {
    p.angle += p.speed;
    let d = p.dist * breathe + sin(t * 2 + p.phase) * 20;
    let px = cos(p.angle + sin(t + p.phase) * 0.2) * d;
    let py = sin(p.angle + cos(t * 0.7 + p.phase) * 0.2) * d;

    let alpha = (sin(t * 3 + p.phase) + 1) * 15 + 5;
    noStroke();
    fill(p.hue + sin(t) * 20, 30, 90, alpha * breathe);
    circle(px, py, p.size * breathe);
  }

  // subtle text prompt
  if (breathe > 0.95) {
    fill(210, 10, 80, 8);
    noStroke();
    textAlign(CENTER);
    textSize(14);
    text('breathe', 0, 250);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default breathingLight;
