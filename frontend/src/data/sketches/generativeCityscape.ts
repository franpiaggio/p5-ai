import type { SketchExample } from '../sketchExamples';

const generativeCityscape: SketchExample = {
  label: 'Nighttime cityscape',
  prompt: 'Create a procedural city skyline at night with twinkling windows and a glowing moon',
  code: `let buildings = [];
let stars = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  generateCity();
}

function generateCity() {
  buildings = [];
  stars = [];
  randomSeed(42);

  for (let i = 0; i < 150; i++) {
    stars.push({ x: random(width), y: random(height * 0.5), size: random(1, 3), phase: random(TAU) });
  }

  for (let x = 0; x < width;) {
    let w = random(20, 60);
    let h = random(80, height * 0.6);
    let wins = [];
    for (let wy = height - h + 15; wy < height - 10; wy += 12) {
      for (let wx = x + 5; wx < x + w - 5; wx += 10) {
        if (random() > 0.3) {
          wins.push({ x: wx, y: wy, on: random() > 0.25, phase: random(TAU), hue: random() > 0.7 ? random(30, 60) : random(40, 55) });
        }
      }
    }
    buildings.push({ x, w, h, hue: random(200, 260), wins });
    x += w + random(-2, 8);
  }
}

function draw() {
  background(230, 50, 6);

  noStroke();
  for (let s of stars) {
    let b = 50 + sin(frameCount * 0.03 + s.phase) * 30;
    fill(0, 0, b, 50);
    ellipse(s.x, s.y, s.size);
  }

  // Moon
  fill(50, 10, 100, 20);
  ellipse(width * 0.8, height * 0.15, 80);
  fill(50, 10, 95, 40);
  ellipse(width * 0.8, height * 0.15, 60);

  for (let b of buildings) {
    noStroke();
    fill(b.hue, 30, 10, 90);
    rect(b.x, height - b.h, b.w, b.h);

    for (let win of b.wins) {
      if (win.on) {
        let flicker = sin(frameCount * 0.02 + win.phase) > -0.8 ? 1 : 0.3;
        fill(win.hue, 60, 80 * flicker, 70);
        rect(win.x, win.y, 6, 8);
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateCity();
}`,
};

export default generativeCityscape;
