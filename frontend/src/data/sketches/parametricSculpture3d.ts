import type { SketchExample } from '../sketchExamples';

const parametricSculpture3d: SketchExample = {
  label: 'Parametric sculpture 3D',
  prompt: 'Create a 3D WEBGL parametric mathematical sculpture that morphs and rotates with iridescent colors',
  code: `let points = [];
let resU = 80;
let resV = 40;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
}

function parametric(u, v, t) {
  // morphing between different parametric surfaces
  let morph = (sin(t * 0.3) + 1) * 0.5;

  // surface 1: Klein-bottle-like shape
  let r = 80;
  let x1 = r * (cos(u) * (2 + cos(v)) + sin(u * 2) * 0.3);
  let y1 = r * (sin(u) * (2 + cos(v)));
  let z1 = r * (sin(v) + sin(u) * 0.5);

  // surface 2: exotic torus knot
  let p2 = 2, q2 = 3;
  let tr = r * 0.6;
  let tube = r * 0.35;
  let x2 = (tr + tube * cos(q2 * u)) * cos(p2 * u);
  let y2 = (tr + tube * cos(q2 * u)) * sin(p2 * u);
  let z2 = tube * sin(q2 * u) + sin(v) * r * 0.3;

  return {
    x: lerp(x1, x2, morph),
    y: lerp(y1, y2, morph),
    z: lerp(z1, z2, morph),
  };
}

function draw() {
  background(240, 20, 5);

  let t = frameCount * 0.01;

  // camera orbit
  let camDist = 450 + sin(t * 0.5) * 50;
  let camAngle = t * 0.2;
  let camY = sin(t * 0.3) * 100;
  camera(
    cos(camAngle) * camDist, camY, sin(camAngle) * camDist,
    0, 0, 0,
    0, 1, 0
  );

  ambientLight(40);
  pointLight(255, 200, 200, 300, -200, 300);
  pointLight(150, 150, 255, -300, 200, -300);

  // draw parametric surface as triangle strips
  noFill();

  for (let i = 0; i < resU; i++) {
    let u0 = map(i, 0, resU, 0, TWO_PI);
    let u1 = map(i + 1, 0, resU, 0, TWO_PI);

    beginShape(TRIANGLE_STRIP);
    for (let j = 0; j <= resV; j++) {
      let v = map(j, 0, resV, 0, TWO_PI);

      let p0 = parametric(u0, v, t);
      let p1 = parametric(u1, v, t);

      // iridescent color based on surface position
      let hue0 = (u0 / TWO_PI * 360 + v / TWO_PI * 120 + t * 20) % 360;
      let hue1 = (u1 / TWO_PI * 360 + v / TWO_PI * 120 + t * 20) % 360;

      // normal estimation for shading
      let eps = 0.01;
      let pu = parametric(u0 + eps, v, t);
      let pv = parametric(u0, v + eps, t);
      let nx = (pu.y - p0.y) * (pv.z - p0.z) - (pu.z - p0.z) * (pv.y - p0.y);
      let ny = (pu.z - p0.z) * (pv.x - p0.x) - (pu.x - p0.x) * (pv.z - p0.z);
      let nz = (pu.x - p0.x) * (pv.y - p0.y) - (pu.y - p0.y) * (pv.x - p0.x);
      let nl = sqrt(nx * nx + ny * ny + nz * nz) || 1;
      let shade = abs(ny / nl) * 40 + 50;

      stroke(hue0, 60, shade, 70);
      strokeWeight(0.8);
      vertex(p0.x, p0.y, p0.z);

      stroke(hue1, 60, shade, 70);
      vertex(p1.x, p1.y, p1.z);
    }
    endShape();
  }

  // glowing center
  push();
  noStroke();
  let coreGlow = sin(t * 2) * 0.3 + 0.7;
  fill(280, 30, 100, 10 * coreGlow);
  sphere(40);
  fill(280, 20, 100, 20 * coreGlow);
  sphere(20);
  pop();

  // floating sparkles
  noStroke();
  for (let i = 0; i < 30; i++) {
    let sa = t * 0.5 + i * 2.1;
    let sr = 200 + sin(t + i * 3) * 80;
    let sx = cos(sa) * sr;
    let sy = sin(sa * 0.7 + i) * sr * 0.5;
    let sz = sin(sa) * sr;
    let alpha = (sin(t * 3 + i * 5) + 1) * 10;
    push();
    translate(sx, sy, sz);
    fill(0, 0, 100, alpha);
    sphere(1.5);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default parametricSculpture3d;
