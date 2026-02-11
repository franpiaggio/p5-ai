import type { SketchExample } from '../sketchExamples';

const auroraBorelais: SketchExample = {
  label: 'Aurora Borealis',
  prompt: 'Create a northern lights animation with flowing curtains of color over a starry sky',
  code: `function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 8);

  // Stars
  noStroke();
  randomSeed(42);
  for (let i = 0; i < 200; i++) {
    let sx = random(width);
    let sy = random(height * 0.6);
    let b = random(30, 80) + sin(frameCount * 0.05 + i) * 15;
    fill(0, 0, b, 60);
    ellipse(sx, sy, random(1, 3));
  }

  // Aurora curtains
  for (let layer = 0; layer < 5; layer++) {
    let baseY = height * 0.15 + layer * 25;
    let hue = map(layer, 0, 5, 120, 280);

    for (let w = 0; w < 6; w++) {
      let alpha = map(w, 0, 6, 18, 4);
      stroke(hue + w * 8, 60, 80, alpha);
      strokeWeight(3);
      noFill();
      beginShape();
      for (let x = 0; x <= width; x += 5) {
        let n = noise(x * 0.003, layer * 0.5 + w * 0.1, frameCount * 0.008);
        let y = baseY + n * height * 0.35 + w * 4;
        vertex(x, y);
      }
      endShape();
    }
  }

  // Treeline silhouette
  noStroke();
  fill(230, 40, 4);
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 6) {
    let n = noise(x * 0.008, 100);
    let h = height - n * 80 - 30;
    if (noise(x * 0.03) > 0.45) h -= random(10, 40);
    vertex(x, h);
  }
  vertex(width, height);
  endShape(CLOSE);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default auroraBorelais;
