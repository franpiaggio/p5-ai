import type { SketchExample } from '../sketchExamples';

const firefliesNight: SketchExample = {
  label: 'Fireflies at night',
  prompt: 'Create fireflies glowing and drifting through a dark meadow at night',
  code: `let fireflies = [];
let stars = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 60; i++) {
    fireflies.push({
      x: random(width),
      y: random(height * 0.3, height * 0.85),
      vx: random(-0.5, 0.5),
      vy: random(-0.3, 0.3),
      phase: random(TWO_PI),
      freq: random(0.02, 0.05),
      size: random(3, 6),
      hue: random(50, 70),
    });
  }
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: random(width),
      y: random(height * 0.5),
      brightness: random(30, 80),
      twinkle: random(TWO_PI),
    });
  }
}

function draw() {
  // night sky gradient
  for (let y = 0; y < height; y++) {
    let t = y / height;
    let h = lerp(240, 160, t);
    let b = lerp(8, 3, t);
    stroke(h, 40, b);
    line(0, y, width, y);
  }

  // stars
  noStroke();
  for (let s of stars) {
    let bright = s.brightness * (0.5 + 0.5 * sin(frameCount * 0.03 + s.twinkle));
    fill(50, 10, bright);
    circle(s.x, s.y, 1.5);
  }

  // ground silhouette
  noStroke();
  fill(120, 50, 5);
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 20) {
    let y = height * 0.85 - noise(x * 0.005) * 40 - noise(x * 0.02) * 15;
    vertex(x, y);
  }
  vertex(width, height);
  endShape(CLOSE);

  // grass blades
  stroke(120, 40, 12);
  strokeWeight(1);
  for (let x = 0; x < width; x += 8) {
    let baseY = height * 0.85 - noise(x * 0.005) * 40 - noise(x * 0.02) * 15;
    let sway = sin(frameCount * 0.02 + x * 0.05) * 4;
    line(x, baseY, x + sway, baseY - random(8, 20));
  }

  // fireflies
  for (let f of fireflies) {
    f.x += f.vx + sin(frameCount * 0.01 + f.phase) * 0.3;
    f.y += f.vy + cos(frameCount * 0.008 + f.phase) * 0.2;

    // gentle boundary
    if (f.x < -20) f.x = width + 20;
    if (f.x > width + 20) f.x = -20;
    if (f.y < height * 0.2) f.vy += 0.01;
    if (f.y > height * 0.85) f.vy -= 0.01;
    f.vx *= 0.99;
    f.vy *= 0.99;

    let glow = (sin(frameCount * f.freq + f.phase) + 1) * 0.5;
    glow = pow(glow, 2);

    // glow halo
    noStroke();
    for (let r = 4; r > 0; r--) {
      fill(f.hue, 80, 95, glow * 6);
      circle(f.x, f.y, f.size * r * 3);
    }

    // bright center
    fill(f.hue, 60, 100, glow * 90);
    circle(f.x, f.y, f.size * glow);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default firefliesNight;
