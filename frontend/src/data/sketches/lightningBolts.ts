import type { SketchExample } from '../sketchExamples';

const lightningBolts: SketchExample = {
  label: 'Lightning bolts',
  prompt: 'Create animated lightning bolts striking randomly',
  code: `let bolts = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(10, 10, 20, 60);

  if (random() < 0.03) {
    bolts.push({ x: random(width * 0.1, width * 0.9), life: 1, segments: makeBolt(random(width * 0.1, width * 0.9), 0, height * 0.8) });
  }

  for (let i = bolts.length - 1; i >= 0; i--) {
    let b = bolts[i];
    drawBolt(b.segments, b.life);
    b.life -= 0.04;
    if (b.life <= 0) bolts.splice(i, 1);
  }
}

function makeBolt(x, y1, y2) {
  let segs = [{ x1: x, y1 }];
  let cx = x;
  let step = (y2 - y1) / 12;
  for (let y = y1 + step; y <= y2; y += step) {
    cx += random(-40, 40);
    segs.push({ x1: cx, y1: y });
    if (random() < 0.25) {
      let bx = cx;
      for (let j = 0; j < 4; j++) {
        bx += random(-20, 20);
        segs.push({ x1: bx, y1: y + step * (j + 1) * 0.5, branch: true });
      }
    }
  }
  return segs;
}

function drawBolt(segs, life) {
  let mainSegs = segs.filter(s => !s.branch);
  strokeWeight(3 * life);
  stroke(180, 180, 255, life * 200);
  for (let i = 1; i < mainSegs.length; i++) {
    line(mainSegs[i - 1].x1, mainSegs[i - 1].y1, mainSegs[i].x1, mainSegs[i].y1);
  }
  strokeWeight(1.5 * life);
  stroke(150, 150, 255, life * 100);
  let branchSegs = segs.filter(s => s.branch);
  for (let i = 1; i < branchSegs.length; i++) {
    line(branchSegs[i - 1].x1, branchSegs[i - 1].y1, branchSegs[i].x1, branchSegs[i].y1);
  }
  // Flash
  if (life > 0.9) {
    background(200, 200, 255, (life - 0.9) * 400);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default lightningBolts;
