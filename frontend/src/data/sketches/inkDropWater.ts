import type { SketchExample } from '../sketchExamples';

const inkDropWater: SketchExample = {
  label: 'Ink drops in water',
  prompt: 'Create ink drops falling into water and slowly diffusing with organic tendrils',
  code: `let drops = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(45, 5, 97);
}

function draw() {
  // slow fade to paper white
  background(45, 5, 97, 2);

  // periodically add drops
  if (frameCount % 120 === 0 || frameCount === 1) {
    addDrop(random(width * 0.2, width * 0.8), random(height * 0.2, height * 0.8));
  }

  for (let drop of drops) {
    drop.age++;
    if (drop.age > 500) continue;

    let spread = drop.age * 0.3;

    // organic tendrils
    for (let t of drop.tendrils) {
      t.angle += noise(t.seed, drop.age * 0.01) * 0.2 - 0.1;
      t.len += 0.5 * (1 - drop.age / 500);
      t.x = drop.x + cos(t.angle) * t.len;
      t.y = drop.y + sin(t.angle) * t.len;

      let alpha = map(drop.age, 0, 500, 25, 2);
      let weight = map(drop.age, 0, 500, 3, 0.5);
      stroke(drop.hue, drop.sat, drop.bright, alpha);
      strokeWeight(weight);
      line(t.prevX, t.prevY, t.x, t.y);
      t.prevX = t.x;
      t.prevY = t.y;

      // sub-tendrils
      if (drop.age % 20 === 0 && t.len > 20 && t.children < 2) {
        t.children++;
        drop.tendrils.push({
          x: t.x,
          y: t.y,
          prevX: t.x,
          prevY: t.y,
          angle: t.angle + random(-1, 1),
          len: 0,
          seed: random(1000),
          children: 2,
        });
      }
    }

    // central bloom
    let bloomAlpha = map(drop.age, 0, 500, 20, 1);
    noStroke();
    fill(drop.hue, drop.sat * 0.7, drop.bright, bloomAlpha);
    circle(drop.x, drop.y, spread * 0.5);

    fill(drop.hue, drop.sat, drop.bright * 0.6, bloomAlpha * 0.5);
    circle(drop.x, drop.y, spread * 0.3);
  }

  // cleanup old drops
  drops = drops.filter(d => d.age <= 500);
}

function addDrop(x, y) {
  let hue = random([0, 30, 200, 260, 320]);
  let tendrils = [];
  let numTendrils = floor(random(8, 16));
  for (let i = 0; i < numTendrils; i++) {
    let angle = (TWO_PI / numTendrils) * i + random(-0.3, 0.3);
    tendrils.push({
      x: x,
      y: y,
      prevX: x,
      prevY: y,
      angle: angle,
      len: 0,
      seed: random(1000),
      children: 0,
    });
  }
  drops.push({
    x: x,
    y: y,
    hue: hue,
    sat: random(60, 90),
    bright: random(30, 60),
    age: 0,
    tendrils: tendrils,
  });
}

function mousePressed() {
  addDrop(mouseX, mouseY);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default inkDropWater;
