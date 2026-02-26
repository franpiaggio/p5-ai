import type { SketchExample } from '../sketchExamples';

const glitchWaves: SketchExample = {
  label: 'Glitch wave art',
  prompt: 'Create generative glitch art with distorted color bands and digital artifacts',
  code: `let bands = [];
let glitchTimer = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pixelDensity(1);
  generateBands();
}

function generateBands() {
  bands = [];
  let y = 0;
  while (y < height) {
    let h = random(3, 40);
    bands.push({
      y: y,
      h: h,
      hue: random(360),
      sat: random(40, 90),
      bright: random(50, 95),
      offset: 0,
      targetOffset: 0,
      noiseY: random(1000),
      speed: random(0.01, 0.04),
    });
    y += h;
  }
}

function draw() {
  background(0, 0, 5);

  glitchTimer--;
  let glitching = glitchTimer > 0;

  // periodically trigger glitch burst
  if (random() < 0.02) {
    glitchTimer = floor(random(5, 20));
    // randomize some band offsets
    for (let b of bands) {
      if (random() < 0.4) {
        b.targetOffset = random(-100, 100);
      }
    }
  }

  if (!glitching && random() < 0.1) {
    for (let b of bands) {
      b.targetOffset *= 0.8;
    }
  }

  loadPixels();

  for (let b of bands) {
    b.offset = lerp(b.offset, b.targetOffset, 0.2);
    let wave = sin(frameCount * b.speed + b.noiseY) * 20;
    let shift = b.offset + wave;

    let c = color(
      (b.hue + frameCount * 0.2) % 360,
      b.sat,
      b.bright
    );
    let r = red(c), g = green(c), bl = blue(c);

    for (let dy = 0; dy < b.h && b.y + dy < height; dy++) {
      let py = floor(b.y + dy);
      for (let px = 0; px < width; px++) {
        let srcX = floor(px - shift);

        // color channel separation on glitch
        let rShift = glitching ? floor(random(-3, 3)) : 0;
        let bShift = glitching ? floor(random(-3, 3)) : 0;

        let noise1 = noise(px * 0.01, py * 0.01 + frameCount * 0.005);
        let blend = noise1;

        let fr = lerp(r, r * blend * 1.2, 0.5);
        let fg = lerp(g, g * blend, 0.5);
        let fb = lerp(bl, bl * blend * 1.1, 0.5);

        // scanline effect
        if (py % 3 === 0) {
          fr *= 0.85;
          fg *= 0.85;
          fb *= 0.85;
        }

        let idx = 4 * (py * width + px);
        pixels[idx] = constrain(fr + (glitching && random() < 0.01 ? 255 : 0), 0, 255);
        pixels[idx + 1] = constrain(fg, 0, 255);
        pixels[idx + 2] = constrain(fb + (glitching && random() < 0.01 ? 200 : 0), 0, 255);
        pixels[idx + 3] = 255;
      }
    }
  }

  updatePixels();

  // random block artifacts
  if (glitching) {
    for (let i = 0; i < 5; i++) {
      let bx = random(width);
      let by = random(height);
      let bw = random(20, 150);
      let bh = random(2, 15);
      noStroke();
      fill(random(360), random(50, 90), random(70, 100), random(40, 80));
      rect(bx, by, bw, bh);
    }
  }
}

function mousePressed() {
  glitchTimer = 30;
  for (let b of bands) {
    b.targetOffset = random(-200, 200);
    b.hue = random(360);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateBands();
}`,
};

export default glitchWaves;
