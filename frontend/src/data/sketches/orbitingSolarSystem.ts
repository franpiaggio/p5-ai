import type { SketchExample } from '../sketchExamples';

const orbitingSolarSystem: SketchExample = {
  label: 'Orbiting solar system',
  prompt: 'Create a miniature solar system with orbiting planets and moons',
  code: `const planets = [
  { r: 60, size: 8, speed: 0.02, color: [200, 120, 50], moons: [] },
  { r: 100, size: 12, speed: 0.012, color: [220, 180, 100], moons: [{ r: 20, size: 3, speed: 0.06 }] },
  { r: 160, size: 10, speed: 0.008, color: [80, 140, 220], moons: [{ r: 16, size: 2, speed: 0.08 }, { r: 24, size: 2.5, speed: -0.05 }] },
  { r: 220, size: 7, speed: 0.005, color: [200, 80, 80], moons: [{ r: 14, size: 2, speed: 0.07 }] },
  { r: 300, size: 18, speed: 0.003, color: [210, 180, 140], moons: [] },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(5);
  translate(width / 2, height / 2);

  // Sun
  noStroke();
  fill(255, 220, 80);
  ellipse(0, 0, 30);
  fill(255, 220, 80, 30);
  ellipse(0, 0, 50);

  // Orbits and planets
  for (let p of planets) {
    stroke(255, 8);
    noFill();
    ellipse(0, 0, p.r * 2);

    let a = frameCount * p.speed;
    let px = cos(a) * p.r;
    let py = sin(a) * p.r;

    noStroke();
    fill(...p.color);
    ellipse(px, py, p.size);

    for (let m of p.moons) {
      let ma = frameCount * m.speed;
      let mx = px + cos(ma) * m.r;
      let my = py + sin(ma) * m.r;
      fill(180);
      ellipse(mx, my, m.size);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default orbitingSolarSystem;
