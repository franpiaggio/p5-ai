import type { SketchExample } from '../sketchExamples';

const rainWithSplashes: SketchExample = {
  label: 'Rain in a forest',
  prompt: 'Create a rain animation with depth of field over a procedural forest',
  code: `let gotas = [];
let salpicaduras = [];
let arboles;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  arboles = createGraphics(width, height);
  arboles.colorMode(HSB, 360, 100, 100, 100);
  dibujarBosque();

  for (let i = 0; i < 400; i++) {
    gotas.push({
      x: random(width),
      y: random(-height, height),
      z: random(0, 1),
      vel: random(4, 10),
      largo: random(10, 30),
      grosor: random(1, 3),
      hue: random(200, 230),
      sat: random(50, 80)
    });
  }
}

function dibujarBosque() {
  arboles.background(220, 30, 8);

  arboles.noStroke();
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      let n = noise(x * 0.005, y * 0.005);
      let alpha = map(n, 0, 1, 0, 15);
      arboles.fill(180, 20, 30, alpha);
      arboles.rect(x, y, 4, 4);
    }
  }

  for (let i = 0; i < 25; i++) {
    let x = random(width);
    dibujarArbolCompleto(x, 0.2);
  }

  for (let i = 0; i < 15; i++) {
    let x = random(width);
    dibujarArbolCompleto(x, 0.55);
  }

  for (let i = 0; i < 8; i++) {
    let x = random(width);
    dibujarArbolCompleto(x, 1);
  }
}

function dibujarArbolCompleto(x, cercania) {
  let grosorBase = map(cercania, 0.2, 1, 8, 35);
  let grosorTop = grosorBase * 0.3;

  let alturaVisible = height + random(50, 200);

  let hue = 25 + random(-10, 10);
  let sat = map(cercania, 0.2, 1, 15, 35);
  let bri = map(cercania, 0.2, 1, 12, 25);
  let alpha = map(cercania, 0.2, 1, 40, 95);

  let blur = map(cercania, 0.2, 1, 5, 1);

  let segmentos = floor(alturaVisible / 15);
  let xActual = x;
  let anchoActual = grosorBase;

  for (let s = 0; s < segmentos; s++) {
    let y1 = height - (s * 15);
    let y2 = height - ((s + 1) * 15);

    let progreso = s / segmentos;
    anchoActual = lerp(grosorBase, grosorTop, progreso);

    let noiseVal = noise(x * 0.01, s * 0.1) - 0.5;
    let irregularidad = noiseVal * map(cercania, 0.2, 1, 3, 12);
    let xSiguiente = x + irregularidad;

    for (let b = 0; b < blur; b++) {
      let offsetX = random(-blur, blur) * (1 - cercania);
      let alphaBlur = alpha / (b * 0.5 + 1);

      arboles.stroke(hue + random(-5, 5), sat, bri + random(-3, 3), alphaBlur);
      arboles.strokeWeight(anchoActual);
      arboles.line(xActual + offsetX, y1, xSiguiente + offsetX, y2);
    }

    if (cercania > 0.4 && random() > 0.6) {
      let numLineas = floor(map(cercania, 0.4, 1, 1, 4));
      for (let t = 0; t < numLineas; t++) {
        let tx = xActual + random(-anchoActual * 0.4, anchoActual * 0.4);
        let tLargo = random(10, 30);
        arboles.stroke(hue, sat + 5, bri - 5, alpha * 0.5);
        arboles.strokeWeight(random(0.5, 2));
        arboles.line(tx, y1, tx + random(-2, 2), y1 - tLargo);
      }
    }

    if (random() > 0.92 && cercania > 0.3) {
      let nudoX = xActual + random(-anchoActual * 0.3, anchoActual * 0.3);
      let nudoTam = random(3, 8) * cercania;
      arboles.noStroke();
      arboles.fill(hue - 5, sat + 10, bri - 5, alpha * 0.7);
      arboles.ellipse(nudoX, y1, nudoTam * 1.5, nudoTam);
    }

    if (y1 < height * 0.85 && random() > 0.7) {
      let lado = random() > 0.5 ? 1 : -1;
      let anguloRama = lado * random(0.3, 0.9) - PI/2;
      let largoRama = random(20, 80) * cercania;
      dibujarRama(xActual, y1, anguloRama, largoRama, 4, cercania);
    }

    xActual = xSiguiente;
  }

  if (cercania > 0.3) {
    dibujarCopa(x, -random(20, 100), cercania);
  }
}

function dibujarRama(x, y, angulo, largo, profundidad, cercania) {
  if (profundidad <= 0 || largo < 3) return;

  let imprecision = map(cercania, 0.2, 1, 6, 2);
  let blur = map(cercania, 0.2, 1, 4, 1);

  let xFin = x + cos(angulo) * largo + random(-imprecision, imprecision);
  let yFin = y + sin(angulo) * largo + random(-imprecision, imprecision);

  let hue = 25 + noise(x * 0.01, y * 0.01) * 15;
  let sat = map(cercania, 0.2, 1, 12, 30);
  let bri = map(cercania, 0.2, 1, 15, 28);
  let alpha = map(cercania, 0.2, 1, 30, 90);

  for (let b = 0; b < blur; b++) {
    let offsetX = random(-blur, blur) * (1 - cercania);
    let alphaBlur = alpha / (b * 0.5 + 1);

    arboles.stroke(hue, sat, bri, alphaBlur);
    arboles.strokeWeight(map(profundidad, 1, 4, 0.5, cercania * 4));
    arboles.line(x + offsetX, y, xFin + offsetX, yFin);
  }

  if (profundidad <= 2) {
    let numHojas = floor(map(cercania, 0.2, 1, 8, 4));
    for (let h = 0; h < numHojas; h++) {
      let hx = xFin + random(-12, 12);
      let hy = yFin + random(-12, 12);
      let tamHoja = map(cercania, 0.2, 1, 2, 6);

      arboles.noStroke();
      let hueHoja = map(cercania, 0.2, 1, 160, 120) + random(-20, 20);
      let alphaHoja = map(cercania, 0.2, 1, 15, 50);
      arboles.fill(hueHoja, sat + 20, bri + 20, alphaHoja);
      arboles.ellipse(hx, hy, tamHoja, tamHoja * 0.7);
    }
  }

  if (profundidad > 1) {
    let noiseFactor = noise(x * 0.02, y * 0.02);
    let anguloVar = map(noiseFactor, 0, 1, 0.3, 0.6);
    let largoFactor = random(0.6, 0.75);

    dibujarRama(xFin, yFin, angulo - anguloVar, largo * largoFactor, profundidad - 1, cercania);
    dibujarRama(xFin, yFin, angulo + anguloVar, largo * largoFactor, profundidad - 1, cercania);
  }
}

function dibujarCopa(x, y, cercania) {
  let numMasas = floor(map(cercania, 0.2, 1, 15, 8));
  let blur = map(cercania, 0.2, 1, 6, 2);

  for (let i = 0; i < numMasas; i++) {
    let mx = x + random(-60, 60) * cercania;
    let my = y + random(-50, 80);
    let tam = random(15, 40) * cercania;

    let hue = map(cercania, 0.2, 1, 165, 125) + random(-15, 15);
    let sat = map(cercania, 0.2, 1, 15, 45);
    let bri = map(cercania, 0.2, 1, 18, 35);
    let alpha = map(cercania, 0.2, 1, 20, 60);

    arboles.noStroke();
    for (let b = 0; b < blur; b++) {
      let alphaBlur = alpha / (b * 0.4 + 1);
      arboles.fill(hue, sat, bri, alphaBlur);
      arboles.ellipse(
        mx + random(-blur * 2, blur * 2),
        my + random(-blur * 2, blur * 2),
        tam + random(-5, 5),
        tam * 0.8 + random(-5, 5)
      );
    }
  }
}

function draw() {
  image(arboles, 0, 0);

  fill(220, 30, 8, 20);
  noStroke();
  rect(0, 0, width, height);

  gotas.sort((a, b) => a.z - b.z);

  for (let gota of gotas) {
    let escala = map(gota.z, 0, 1, 0.3, 1.5);
    let alpha = map(gota.z, 0, 1, 20, 90);
    let blur = map(gota.z, 0, 1, 8, 1);
    let velFinal = gota.vel * escala;
    let brillo = map(gota.vel, 4, 10, 40, 80);

    for (let b = 0; b < blur; b++) {
      let offsetX = random(-blur, blur);
      let alphaBlur = alpha / (b + 1);
      stroke(gota.hue, gota.sat, brillo, alphaBlur);
      strokeWeight(gota.grosor * escala);
      line(gota.x + offsetX, gota.y, gota.x + offsetX, gota.y + gota.largo * escala);
    }

    gota.y += velFinal;

    if (gota.y > height) {
      let numSalpicaduras = floor(map(gota.z, 0, 1, 2, 6));
      for (let j = 0; j < numSalpicaduras; j++) {
        salpicaduras.push({
          x: gota.x,
          y: height,
          z: gota.z,
          vx: random(-2, 2) * escala,
          vy: random(-3, -1) * escala,
          vida: 255,
          tamano: random(2, 4) * escala,
          hue: gota.hue
        });
      }
      gota.y = random(-100, -10);
      gota.x = random(width);
      gota.z = random(0, 1);
      gota.hue = random(200, 230);
      gota.sat = random(50, 80);
    }
  }

  noStroke();
  for (let i = salpicaduras.length - 1; i >= 0; i--) {
    let s = salpicaduras[i];
    let alpha = map(s.vida, 0, 255, 0, 80) * s.z;
    let blur = map(s.z, 0, 1, 5, 1);

    for (let b = 0; b < blur; b++) {
      let alphaBlur = alpha / (b + 1);
      fill(s.hue, 60, 70, alphaBlur);
      ellipse(s.x + random(-blur, blur), s.y + random(-blur, blur), s.tamano);
    }

    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.15;
    s.vida -= 8;

    if (s.vida <= 0) {
      salpicaduras.splice(i, 1);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  arboles = createGraphics(width, height);
  arboles.colorMode(HSB, 360, 100, 100, 100);
  dibujarBosque();
}`,
};

export default rainWithSplashes;
