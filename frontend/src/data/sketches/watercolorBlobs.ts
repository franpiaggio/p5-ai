import type { SketchExample } from '../sketchExamples';

const watercolorBlobs: SketchExample = {
  label: 'Watercolor blobs',
  prompt: 'Create soft organic watercolor blobs that bleed and blend together like wet paint on paper',
  code: `let blobs = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(40, 6, 96);
  generatePainting();
}

function generatePainting() {
  background(40, 6, 96);

  // paper texture
  for (let i = 0; i < 20000; i++) {
    stroke(35, 5, random(90, 98), 8);
    strokeWeight(1);
    point(random(width), random(height));
  }

  let baseHue = random(360);
  let numBlobs = floor(random(6, 14));

  for (let i = 0; i < numBlobs; i++) {
    let cx = random(width * 0.1, width * 0.9);
    let cy = random(height * 0.1, height * 0.9);
    let hue = (baseHue + random(-40, 40) + i * 25) % 360;
    if (hue < 0) hue += 360;
    let sat = random(35, 65);
    let bright = random(65, 90);
    let baseR = random(50, 150);

    // multiple layers for watercolor effect
    for (let layer = 0; layer < 40; layer++) {
      noStroke();
      fill(hue, sat + random(-10, 10), bright + random(-5, 5), 3);

      // wobbly shape using noise
      beginShape();
      let noiseSeed = random(1000);
      let vertices = 60;
      for (let v = 0; v < vertices; v++) {
        let angle = (TWO_PI / vertices) * v;
        let r = baseR * (0.6 + noise(
          noiseSeed + cos(angle) * 2,
          noiseSeed + sin(angle) * 2,
          layer * 0.05
        ) * 0.8);
        // spread out in layers
        r += layer * 1.5;
        let px = cx + cos(angle) * r + random(-3, 3);
        let py = cy + sin(angle) * r + random(-3, 3);
        curveVertex(px, py);
      }
      endShape(CLOSE);
    }

    // darker center
    for (let layer = 0; layer < 15; layer++) {
      fill(hue, sat + 10, bright - 15, 4);
      beginShape();
      let noiseSeed2 = random(1000);
      for (let v = 0; v < 40; v++) {
        let angle = (TWO_PI / 40) * v;
        let r = baseR * 0.4 * (0.7 + noise(
          noiseSeed2 + cos(angle),
          noiseSeed2 + sin(angle),
          layer * 0.1
        ) * 0.6);
        curveVertex(
          cx + cos(angle) * r + random(-2, 2),
          cy + sin(angle) * r + random(-2, 2)
        );
      }
      endShape(CLOSE);
    }
  }

  // paint drip edges
  for (let i = 0; i < 200; i++) {
    let x = random(width);
    let y = random(height);
    let c = get(floor(x), floor(y));
    if (brightness(c) < 90) {
      stroke(hue(c), saturation(c), brightness(c), 5);
      strokeWeight(random(1, 3));
      let dripLen = random(5, 30);
      line(x, y, x + random(-5, 5), y + dripLen);
    }
  }

  noLoop();
}

function mousePressed() {
  generatePainting();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generatePainting();
}`,
};

export default watercolorBlobs;
