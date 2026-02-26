import type { SketchExample } from '../sketchExamples';

const jellyfishSwarm: SketchExample = {
  label: 'Jellyfish swarm',
  prompt: 'Create translucent jellyfish floating in deep water with trailing tentacles',
  code: `let jellies = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 12; i++) {
    jellies.push({
      x: random(width),
      y: random(height),
      size: random(40, 100),
      hue: random(180, 280),
      phase: random(TWO_PI),
      speed: random(0.3, 0.8),
      drift: random(-0.3, 0.3),
      tentacles: floor(random(5, 9)),
    });
  }
}

function draw() {
  background(220, 80, 10, 15);

  // ambient particles
  noStroke();
  for (let i = 0; i < 30; i++) {
    let px = (noise(i * 100, frameCount * 0.002) * width * 1.2) - width * 0.1;
    let py = (noise(i * 200, frameCount * 0.003) * height * 1.2) - height * 0.1;
    fill(180, 40, 80, 8);
    circle(px, py, 3);
  }

  for (let j of jellies) {
    j.y -= j.speed;
    j.x += j.drift + sin(frameCount * 0.02 + j.phase) * 0.5;

    if (j.y < -j.size * 2) {
      j.y = height + j.size;
      j.x = random(width);
    }

    let pulse = sin(frameCount * 0.06 + j.phase);
    let bodyW = j.size * map(pulse, -1, 1, 0.7, 1);
    let bodyH = j.size * 0.6 * map(pulse, -1, 1, 1, 0.7);

    // glow
    noStroke();
    for (let g = 3; g > 0; g--) {
      fill(j.hue, 50, 80, 3);
      ellipse(j.x, j.y, bodyW + g * 20, bodyH + g * 20);
    }

    // bell
    fill(j.hue, 40, 90, 20);
    arc(j.x, j.y, bodyW, bodyH * 2, PI, TWO_PI, CHORD);

    fill(j.hue, 60, 95, 12);
    arc(j.x, j.y, bodyW * 0.7, bodyH * 1.4, PI, TWO_PI, CHORD);

    // tentacles
    noFill();
    for (let t = 0; t < j.tentacles; t++) {
      let tx = map(t, 0, j.tentacles - 1, j.x - bodyW * 0.35, j.x + bodyW * 0.35);
      stroke(j.hue, 50, 90, 15);
      strokeWeight(1.5);
      beginShape();
      for (let k = 0; k < 8; k++) {
        let seg = k * j.size * 0.15;
        let sx = tx + sin(frameCount * 0.04 + j.phase + t + k * 0.5) * (10 + k * 3);
        let sy = j.y + seg;
        curveVertex(sx, sy);
      }
      endShape();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default jellyfishSwarm;
