import type { SketchExample } from '../sketchExamples';

const smokeParticles: SketchExample = {
  label: 'Smoke particles',
  prompt: 'Create a soft smoke / fog particle effect rising from the bottom',
  code: `let particles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(10, 12, 18);

  if (frameCount % 2 === 0) {
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: width / 2 + random(-40, 40),
        y: height,
        vx: random(-0.5, 0.5),
        vy: random(-2, -0.8),
        r: random(20, 50),
        life: 1,
        decay: random(0.003, 0.008),
      });
    }
  }

  noStroke();
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx + sin(frameCount * 0.01 + p.y * 0.01) * 0.5;
    p.y += p.vy;
    p.r += 0.3;
    p.life -= p.decay;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    let a = p.life * 25;
    fill(180, 180, 200, a);
    ellipse(p.x, p.y, p.r);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default smokeParticles;
