import type { SketchExample } from '../sketchExamples';

const ripplePond: SketchExample = {
  label: 'Ripple pond',
  prompt: 'Create a water ripple simulation with rings that expand outward on click or touch',
  code: `let ripples = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(200, 30, 15);

  if (frameCount % 90 === 0) {
    ripples.push({ x: random(width * 0.2, width * 0.8), y: random(height * 0.2, height * 0.8), r: 0, life: 1 });
  }

  noFill();
  for (let i = ripples.length - 1; i >= 0; i--) {
    let rip = ripples[i];
    rip.r += 2;
    rip.life -= 0.005;

    if (rip.life <= 0) {
      ripples.splice(i, 1);
      continue;
    }

    for (let w = 0; w < 3; w++) {
      let offset = w * 15;
      let alpha = rip.life * 40 * map(w, 0, 3, 1, 0.3);
      stroke(190, 30, 60, alpha);
      strokeWeight(map(rip.life, 0, 1, 0.5, 2));

      beginShape();
      for (let a = 0; a <= TAU; a += 0.1) {
        let n = noise(cos(a) * 2 + rip.x * 0.01, sin(a) * 2 + rip.y * 0.01, frameCount * 0.02);
        let rad = rip.r - offset + n * 8;
        if (rad > 0) vertex(rip.x + cos(a) * rad, rip.y + sin(a) * rad);
      }
      endShape(CLOSE);
    }
  }
}

function mousePressed() {
  ripples.push({ x: mouseX, y: mouseY, r: 0, life: 1 });
}

function touchStarted() {
  if (touches.length > 0) {
    ripples.push({ x: touches[0].x, y: touches[0].y, r: 0, life: 1 });
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default ripplePond;
