import type { SketchExample } from '../sketchExamples';

const floatingLanterns: SketchExample = {
  label: 'Floating lanterns',
  prompt: 'Create a beautiful night sky scene with warm glowing lanterns floating upward, inspired by Thai lantern festivals',
  code: `let lanterns = [];
let embers = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  for (let i = 0; i < 40; i++) {
    spawnLantern(random(width), random(height));
  }
}

function spawnLantern(x, y) {
  lanterns.push({
    x: x,
    y: y,
    z: random(0.3, 1),
    vx: random(-0.3, 0.3),
    vy: random(-0.4, -1.2),
    sway: random(TWO_PI),
    swaySpeed: random(0.01, 0.03),
    swayAmp: random(10, 30),
    hue: random(15, 45),
    flicker: random(TWO_PI),
    size: random(25, 50),
  });
}

function draw() {
  // night sky gradient
  for (let y = 0; y < height; y++) {
    let t = y / height;
    let h = lerp(240, 260, t);
    let s = lerp(50, 30, t);
    let b = lerp(8, 3, t);
    stroke(h, s, b);
    line(0, y, width, y);
  }

  // stars
  noStroke();
  randomSeed(42);
  for (let i = 0; i < 150; i++) {
    let sx = random(width);
    let sy = random(height * 0.7);
    let twinkle = (sin(frameCount * 0.02 + i * 3) + 1) * 0.5;
    fill(0, 0, 100, 15 + twinkle * 30);
    circle(sx, sy, random(1, 2.5));
  }
  randomSeed(frameCount);

  // distant mountains/treeline
  noStroke();
  fill(250, 30, 5);
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 15) {
    let treeH = noise(x * 0.005) * 80 + 50;
    vertex(x, height - treeH);
  }
  vertex(width, height);
  endShape(CLOSE);

  // water reflection at bottom
  for (let y = height - 30; y < height; y++) {
    let t = (y - (height - 30)) / 30;
    stroke(240, 40, lerp(5, 3, t), 60);
    line(0, y, width, y);
  }

  // sort lanterns by z for depth
  lanterns.sort((a, b) => a.z - b.z);

  let time = frameCount * 0.01;

  for (let l of lanterns) {
    l.sway += l.swaySpeed;
    l.x += l.vx + sin(l.sway) * 0.3;
    l.y += l.vy * l.z;
    l.flicker += 0.1;

    let sx = l.x + sin(l.sway) * l.swayAmp * l.z;
    let size = l.size * l.z;
    let flickerBright = 70 + sin(l.flicker) * 15;

    // warm glow aura
    noStroke();
    for (let r = size * 4; r > 0; r -= 3) {
      let alpha = map(r, 0, size * 4, 8, 0.3) * l.z;
      fill(l.hue, 60, flickerBright, alpha);
      circle(sx, l.y, r);
    }

    // lantern body
    fill(l.hue, 50, flickerBright, 80 * l.z);
    stroke(l.hue + 5, 60, flickerBright - 20, 40 * l.z);
    strokeWeight(0.5);
    rect(sx - size * 0.4, l.y - size * 0.5, size * 0.8, size, size * 0.15);

    // flame inside
    noStroke();
    fill(40, 80, 100, 70 * l.z);
    ellipse(sx, l.y, size * 0.2, size * 0.3);
    fill(50, 50, 100, 50 * l.z);
    ellipse(sx, l.y - size * 0.05, size * 0.1, size * 0.15);

    // top rim
    stroke(l.hue + 5, 40, 50, 50 * l.z);
    strokeWeight(1);
    line(sx - size * 0.35, l.y - size * 0.5, sx + size * 0.35, l.y - size * 0.5);

    // water reflection
    if (l.y < height - 30) {
      noStroke();
      let refY = height - (height - l.y) * 0.1 + 10;
      let refAlpha = map(l.y, 0, height, 2, 8) * l.z;
      fill(l.hue, 40, flickerBright, refAlpha);
      ellipse(sx + sin(time * 2 + l.x) * 5, refY, size * 1.5, size * 0.3);
    }

    // emit embers
    if (random() < 0.05) {
      embers.push({
        x: sx,
        y: l.y - size * 0.5,
        vx: random(-0.5, 0.5),
        vy: random(-1.5, -0.5),
        life: 60,
        size: random(1, 3),
      });
    }

    // respawn if out of view
    if (l.y < -100 || l.x < -100 || l.x > width + 100) {
      l.x = random(width);
      l.y = height + random(50, 150);
      l.z = random(0.3, 1);
    }
  }

  // embers
  noStroke();
  for (let i = embers.length - 1; i >= 0; i--) {
    let e = embers[i];
    e.x += e.vx;
    e.y += e.vy;
    e.vy -= 0.01;
    e.life--;
    let alpha = map(e.life, 0, 60, 0, 60);
    fill(30, 80, 100, alpha);
    circle(e.x, e.y, e.size);
    if (e.life <= 0) embers.splice(i, 1);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default floatingLanterns;
