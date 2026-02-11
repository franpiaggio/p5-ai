import type { SketchExample } from '../sketchExamples';

const fireworksDisplay: SketchExample = {
  label: 'Fireworks display',
  prompt: 'Create a fireworks animation with colorful particle explosions',
  code: `let fireworks = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(0, 0, 5, 25);

  if (random() < 0.06) fireworks.push(makeRocket());

  for (let i = fireworks.length - 1; i >= 0; i--) {
    let fw = fireworks[i];
    if (!fw.exploded) {
      fw.vy += 0.05;
      fw.y += fw.vy;
      stroke(0, 0, 100);
      strokeWeight(2);
      point(fw.x, fw.y);
      if (fw.vy >= -1) {
        fw.exploded = true;
        for (let j = 0; j < 80; j++) {
          let a = random(TAU);
          let s = random(1, 6);
          fw.particles.push({ x: fw.x, y: fw.y, vx: cos(a) * s, vy: sin(a) * s, life: 1 });
        }
      }
    } else {
      let alive = false;
      for (let p of fw.particles) {
        p.vy += 0.04;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.life -= 0.012;
        if (p.life > 0) {
          alive = true;
          stroke(fw.hue, 80, map(p.life, 0, 1, 30, 100), p.life * 80);
          strokeWeight(map(p.life, 0, 1, 1, 3));
          point(p.x, p.y);
        }
      }
      if (!alive) fireworks.splice(i, 1);
    }
  }
}

function makeRocket() {
  return { x: random(width * 0.2, width * 0.8), y: height, vy: random(-14, -10), exploded: false, particles: [], hue: random(360) };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default fireworksDisplay;
