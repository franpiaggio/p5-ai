import type { SketchExample } from '../sketchExamples';

const rainOnWindow: SketchExample = {
  label: 'Rain on window',
  prompt: 'Create a realistic rain on a window effect with droplets sliding down, merging, and blurry city lights behind the glass',
  code: `let drops = [];
let cityLights = [];
let trailLayer;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  trailLayer = createGraphics(width, height);
  trailLayer.colorMode(HSB, 360, 100, 100, 100);

  // city lights (blurry bokeh behind glass)
  for (let i = 0; i < 60; i++) {
    cityLights.push({
      x: random(width),
      y: random(height * 0.3, height),
      size: random(30, 120),
      hue: random([random(20, 50), random(180, 220), random(0, 15)]),
      brightness: random(30, 70),
      flicker: random(TWO_PI),
    });
  }
}

function draw() {
  // dark rainy background
  background(220, 20, 10);

  // blurry city lights
  noStroke();
  for (let l of cityLights) {
    l.flicker += 0.02;
    let bright = l.brightness + sin(l.flicker) * 10;
    for (let r = l.size; r > 0; r -= 4) {
      fill(l.hue, 40, bright, map(r, 0, l.size, 6, 0.5));
      circle(l.x, l.y, r);
    }
  }

  // foggy glass overlay
  noStroke();
  fill(220, 10, 15, 35);
  rect(0, 0, width, height);

  // spawn new drops
  if (random() < 0.4) {
    drops.push({
      x: random(width),
      y: -10,
      speed: random(1, 4),
      size: random(2, 5),
      trail: [],
      wobble: random(TWO_PI),
      maxTrail: floor(random(10, 30)),
    });
  }

  // small static droplets on glass
  if (frameCount === 1) {
    for (let i = 0; i < 200; i++) {
      let x = random(width);
      let y = random(height);
      let s = random(1, 3);
      trailLayer.noStroke();
      trailLayer.fill(200, 10, 80, 20);
      trailLayer.circle(x, y, s);
    }
  }

  // fade trail layer slowly
  trailLayer.noStroke();
  trailLayer.fill(220, 20, 10, 2);
  trailLayer.rect(0, 0, width, height);

  // update drops
  for (let i = drops.length - 1; i >= 0; i--) {
    let d = drops[i];

    // wobble sideways
    d.wobble += 0.1;
    d.x += sin(d.wobble) * 0.3;

    // occasionally pause
    let gravity = d.speed;
    if (random() < 0.02) gravity *= 0.1;

    d.y += gravity;

    // store trail
    d.trail.push({ x: d.x, y: d.y });
    if (d.trail.length > d.maxTrail) d.trail.shift();

    // draw trail on trail layer
    for (let j = 0; j < d.trail.length; j++) {
      let tp = d.trail[j];
      let alpha = map(j, 0, d.trail.length, 2, 12);
      let sz = map(j, 0, d.trail.length, d.size * 0.3, d.size * 0.8);
      trailLayer.noStroke();
      trailLayer.fill(200, 5, 60, alpha);
      trailLayer.circle(tp.x, tp.y, sz);
    }

    // main drop with light refraction
    noStroke();

    // drop shadow
    fill(220, 20, 8, 30);
    circle(d.x + 1, d.y + 1, d.size * 2.5);

    // drop body
    fill(210, 10, 85, 40);
    circle(d.x, d.y, d.size * 2);

    // light highlight
    fill(0, 0, 100, 50);
    circle(d.x - d.size * 0.2, d.y - d.size * 0.2, d.size * 0.6);

    // refracted light from city
    for (let l of cityLights) {
      let dist2 = (d.x - l.x) ** 2 + (d.y - l.y) ** 2;
      if (dist2 < (l.size * 3) ** 2) {
        fill(l.hue, 30, 70, 8);
        circle(d.x, d.y, d.size * 3);
        break;
      }
    }

    if (d.y > height + 20) drops.splice(i, 1);
  }

  image(trailLayer, 0, 0);

  // condensation effect at bottom
  noStroke();
  for (let x = 0; x < width; x += 3) {
    let fogH = noise(x * 0.01, frameCount * 0.001) * 60;
    fill(210, 10, 20, 15);
    rect(x, height - fogH, 3, fogH);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  trailLayer = createGraphics(width, height);
  trailLayer.colorMode(HSB, 360, 100, 100, 100);
}`,
};

export default rainOnWindow;
