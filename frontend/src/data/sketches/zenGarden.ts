import type { SketchExample } from '../sketchExamples';

const zenGarden: SketchExample = {
  label: 'Zen sand garden',
  prompt: 'Create a peaceful zen rock garden with raked sand patterns flowing around stones',
  code: `let stones = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  // place stones
  let attempts = 0;
  while (stones.length < 5 && attempts < 200) {
    let s = {
      x: random(width * 0.15, width * 0.85),
      y: random(height * 0.15, height * 0.85),
      r: random(20, 50),
    };
    let valid = true;
    for (let other of stones) {
      if (dist(s.x, s.y, other.x, other.y) < s.r + other.r + 60) {
        valid = false;
        break;
      }
    }
    if (valid) stones.push(s);
    attempts++;
  }

  noLoop();
}

function draw() {
  // sand base
  background(38, 15, 88);

  // subtle sand texture
  loadPixels();
  for (let i = 0; i < pixels.length; i += 4) {
    let grain = random(-6, 6);
    pixels[i] += grain;
    pixels[i + 1] += grain;
    pixels[i + 2] += grain;
  }
  updatePixels();

  // raked lines
  let spacing = 8;
  for (let baseY = -50; baseY < height + 50; baseY += spacing) {
    noFill();
    stroke(35, 12, 75, 35);
    strokeWeight(1);

    beginShape();
    for (let x = -10; x <= width + 10; x += 4) {
      let y = baseY + noise(x * 0.003, baseY * 0.01) * 10;

      // deflect around stones
      for (let s of stones) {
        let d = dist(x, y, s.x, s.y);
        let influence = s.r + 40;
        if (d < influence) {
          let angle = atan2(y - s.y, x - s.x);
          let push = map(d, 0, influence, s.r + 20, 0);
          y += sin(angle) * push * 0.3;
          // curve around
          let tangent = angle + HALF_PI;
          y += cos(tangent) * push * 0.1;
        }
      }

      curveVertex(x, y);
    }
    endShape();
  }

  // circular raking around stones
  for (let s of stones) {
    for (let ring = 1; ring <= 4; ring++) {
      let r = s.r + 10 + ring * spacing;
      noFill();
      stroke(35, 12, 72, 30);
      strokeWeight(1);
      beginShape();
      for (let a = 0; a <= TWO_PI + 0.1; a += 0.05) {
        let wobble = noise(cos(a) * 2 + s.x, sin(a) * 2 + s.y, ring) * 5;
        let px = s.x + cos(a) * (r + wobble);
        let py = s.y + sin(a) * (r + wobble);
        curveVertex(px, py);
      }
      endShape();
    }
  }

  // draw stones
  for (let s of stones) {
    // shadow
    noStroke();
    fill(35, 15, 60, 20);
    ellipse(s.x + 4, s.y + 4, s.r * 2.1, s.r * 1.7);

    // stone body
    fill(30, 8, 45);
    ellipse(s.x, s.y, s.r * 2, s.r * 1.6);

    // highlight
    fill(30, 5, 55, 40);
    ellipse(s.x - s.r * 0.2, s.y - s.r * 0.15, s.r * 1.2, s.r * 0.8);

    // specular
    fill(40, 3, 65, 25);
    ellipse(s.x - s.r * 0.3, s.y - s.r * 0.25, s.r * 0.5, s.r * 0.3);
  }
}

function mousePressed() {
  stones = [];
  let attempts = 0;
  while (stones.length < 5 && attempts < 200) {
    let s = {
      x: random(width * 0.15, width * 0.85),
      y: random(height * 0.15, height * 0.85),
      r: random(20, 50),
    };
    let valid = true;
    for (let other of stones) {
      if (dist(s.x, s.y, other.x, other.y) < s.r + other.r + 60) {
        valid = false;
        break;
      }
    }
    if (valid) stones.push(s);
    attempts++;
  }
  loop();
  redraw();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redraw();
}`,
};

export default zenGarden;
