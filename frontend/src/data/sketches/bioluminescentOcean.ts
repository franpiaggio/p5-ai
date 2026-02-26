import type { SketchExample } from '../sketchExamples';

const bioluminescentOcean: SketchExample = {
  label: 'Bioluminescent ocean',
  prompt: 'Create a dark ocean surface with glowing bioluminescent plankton reacting to mouse movement',
  code: `let plankton = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 800; i++) {
    plankton.push({
      x: random(width),
      y: random(height),
      size: random(1, 4),
      hue: random(160, 210),
      energy: 0,
      vx: random(-0.2, 0.2),
      vy: random(-0.2, 0.2),
    });
  }
}

function draw() {
  // dark ocean with subtle wave tint
  background(210, 60, 5, 25);

  // wave light at top
  noStroke();
  for (let x = 0; x < width; x += 4) {
    let waveY = 40 + sin(x * 0.01 + frameCount * 0.03) * 15;
    let alpha = map(waveY, 25, 55, 5, 0);
    fill(200, 30, 30, alpha);
    rect(x, 0, 4, waveY);
  }

  let mx = mouseX || width / 2;
  let my = mouseY || height / 2;

  for (let p of plankton) {
    // drift
    p.x += p.vx + sin(frameCount * 0.005 + p.y * 0.01) * 0.3;
    p.y += p.vy + cos(frameCount * 0.004 + p.x * 0.01) * 0.2;

    // wrap
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    // react to mouse proximity
    let d = dist(p.x, p.y, mx, my);
    if (d < 150) {
      p.energy = min(1, p.energy + map(d, 0, 150, 0.15, 0.01));
    }

    // natural glow pulse
    let pulse = (sin(frameCount * 0.03 + p.x * 0.01 + p.y * 0.01) + 1) * 0.5;
    p.energy = max(pulse * 0.15, p.energy);

    // decay
    p.energy *= 0.97;

    if (p.energy > 0.02) {
      let glow = p.energy;

      // outer glow
      noStroke();
      fill(p.hue, 60, 90, glow * 15);
      circle(p.x, p.y, p.size * 8 * glow);

      fill(p.hue, 50, 95, glow * 40);
      circle(p.x, p.y, p.size * 3 * glow);

      // bright core
      fill(p.hue, 30, 100, glow * 80);
      circle(p.x, p.y, p.size * glow);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default bioluminescentOcean;
