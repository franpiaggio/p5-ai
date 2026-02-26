import type { SketchExample } from '../sketchExamples';

const noiseColorField: SketchExample = {
  label: 'Noise color field',
  prompt: 'Create an atmospheric generative painting with overlapping translucent noise-driven color fields',
  code: `let layers = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  generateLayers();
  background(30, 10, 95);
}

function generateLayers() {
  layers = [];
  let baseHue = random(360);
  for (let i = 0; i < 6; i++) {
    layers.push({
      hue: (baseHue + i * 35 + random(-10, 10)) % 360,
      sat: random(30, 70),
      bright: random(60, 90),
      seedX: random(1000),
      seedY: random(1000),
      scale: random(0.002, 0.006),
      speed: random(0.003, 0.008),
      threshold: random(0.35, 0.55),
    });
  }
}

function draw() {
  let t = frameCount * 0.001;

  loadPixels();
  let step = 3;
  for (let x = 0; x < width; x += step) {
    for (let y = 0; y < height; y += step) {
      // base warm tone
      let h = 30;
      let s = 8;
      let b = 95;

      for (let layer of layers) {
        let n = noise(
          x * layer.scale + layer.seedX + t * layer.speed,
          y * layer.scale + layer.seedY,
          t * layer.speed * 2
        );

        if (n > layer.threshold) {
          let blend = map(n, layer.threshold, 1, 0, 0.35);
          h = lerp(h, layer.hue, blend);
          s = lerp(s, layer.sat, blend);
          b = lerp(b, layer.bright, blend);
        }
      }

      // convert HSB to RGB manually for pixel array
      let c = color(h, s, b);
      let r = red(c);
      let g = green(c);
      let bl = blue(c);

      for (let dx = 0; dx < step && x + dx < width; dx++) {
        for (let dy = 0; dy < step && y + dy < height; dy++) {
          let idx = 4 * ((y + dy) * width + (x + dx));
          pixels[idx] = r;
          pixels[idx + 1] = g;
          pixels[idx + 2] = bl;
          pixels[idx + 3] = 255;
        }
      }
    }
  }
  updatePixels();

  // subtle grain overlay
  loadPixels();
  for (let i = 0; i < pixels.length; i += 4) {
    let grain = random(-8, 8);
    pixels[i] += grain;
    pixels[i + 1] += grain;
    pixels[i + 2] += grain;
  }
  updatePixels();
}

function mousePressed() {
  generateLayers();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default noiseColorField;
