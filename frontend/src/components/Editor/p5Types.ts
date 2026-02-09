// p5.js global mode type declarations for Monaco semantic highlighting.
// This lets Monaco's TS language service recognize p5.js globals as functions,
// enabling proper semantic coloring (function token instead of plain identifier).

export const P5_TYPE_DEFS = `
// --- Canvas & Environment ---
declare function createCanvas(w: number, h: number, renderer?: any): any;
declare function resizeCanvas(w: number, h: number, noRedraw?: boolean): void;
declare function background(...args: any[]): void;
declare function clear(): void;
declare function pixelDensity(val?: number): number;
declare function frameRate(fps?: number): number;
declare function fullscreen(val?: boolean): boolean;
declare function cursor(type?: string | number, x?: number, y?: number): void;
declare function noCursor(): void;
declare function noCanvas(): void;

// --- Drawing ---
declare function point(x: number, y: number, z?: number): void;
declare function line(x1: number, y1: number, x2: number, y2: number): void;
declare function rect(x: number, y: number, w: number, h: number, r?: number): void;
declare function square(x: number, y: number, s: number, tl?: number): void;
declare function ellipse(x: number, y: number, w: number, h?: number): void;
declare function circle(x: number, y: number, d: number): void;
declare function arc(x: number, y: number, w: number, h: number, start: number, stop: number, mode?: any): void;
declare function triangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void;
declare function quad(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): void;
declare function bezier(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): void;
declare function curve(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): void;

// --- Vertex ---
declare function beginShape(kind?: any): void;
declare function endShape(mode?: any): void;
declare function vertex(x: number, y: number, z?: number): void;
declare function curveVertex(x: number, y: number): void;
declare function bezierVertex(x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): void;
declare function quadraticVertex(cx: number, cy: number, x3: number, y3: number): void;
declare function beginContour(): void;
declare function endContour(): void;

// --- Color ---
declare function fill(...args: any[]): void;
declare function noFill(): void;
declare function stroke(...args: any[]): void;
declare function noStroke(): void;
declare function strokeWeight(weight: number): void;
declare function strokeCap(cap: any): void;
declare function strokeJoin(join: any): void;
declare function colorMode(mode: any, ...args: any[]): void;
declare function color(...args: any[]): any;
declare function lerpColor(c1: any, c2: any, amt: number): any;
declare function red(c: any): number;
declare function green(c: any): number;
declare function blue(c: any): number;
declare function alpha(c: any): number;
declare function hue(c: any): number;
declare function saturation(c: any): number;
declare function brightness(c: any): number;
declare function lightness(c: any): number;

// --- Transform ---
declare function translate(x: number, y: number, z?: number): void;
declare function rotate(angle: number): void;
declare function rotateX(angle: number): void;
declare function rotateY(angle: number): void;
declare function rotateZ(angle: number): void;
declare function scale(s: number | number[], y?: number, z?: number): void;
declare function shearX(angle: number): void;
declare function shearY(angle: number): void;
declare function push(): void;
declare function pop(): void;
declare function applyMatrix(...args: any[]): void;
declare function resetMatrix(): void;

// --- Math ---
declare function abs(n: number): number;
declare function ceil(n: number): number;
declare function constrain(n: number, low: number, high: number): number;
declare function dist(x1: number, y1: number, x2: number, y2: number): number;
declare function exp(n: number): number;
declare function floor(n: number): number;
declare function lerp(start: number, stop: number, amt: number): number;
declare function log(n: number): number;
declare function mag(a: number, b: number): number;
declare function map(value: number, start1: number, stop1: number, start2: number, stop2: number, withinBounds?: boolean): number;
declare function max(...args: any[]): number;
declare function min(...args: any[]): number;
declare function norm(value: number, start: number, stop: number): number;
declare function pow(n: number, e: number): number;
declare function round(n: number, decimals?: number): number;
declare function sq(n: number): number;
declare function sqrt(n: number): number;
declare function random(min?: number | any[], max?: number): number;
declare function randomSeed(seed: number): void;
declare function randomGaussian(mean?: number, sd?: number): number;
declare function noise(x: number, y?: number, z?: number): number;
declare function noiseDetail(lod: number, falloff?: number): void;
declare function noiseSeed(seed: number): void;

// --- Trigonometry ---
declare function sin(angle: number): number;
declare function cos(angle: number): number;
declare function tan(angle: number): number;
declare function asin(value: number): number;
declare function acos(value: number): number;
declare function atan(value: number): number;
declare function atan2(y: number, x: number): number;
declare function degrees(radians: number): number;
declare function radians(degrees: number): number;
declare function angleMode(mode: any): void;

// --- Typography ---
declare function text(str: string | number, x: number, y: number, x2?: number, y2?: number): void;
declare function textFont(font: any, size?: number): void;
declare function textSize(size?: number): number;
declare function textWidth(str: string): number;
declare function textAscent(): number;
declare function textDescent(): number;
declare function textAlign(horizAlign: any, vertAlign?: any): void;
declare function textLeading(leading?: number): number;
declare function textStyle(style: any): void;
declare function textWrap(wrapStyle: any): void;
declare function loadFont(path: string, callback?: Function): any;

// --- Image ---
declare function image(img: any, x: number, y: number, w?: number, h?: number): void;
declare function loadImage(path: string, success?: Function, failure?: Function): any;
declare function createImage(w: number, h: number): any;
declare function loadPixels(): void;
declare function updatePixels(): void;
declare function get(x?: number, y?: number, w?: number, h?: number): any;
declare function set(x: number, y: number, c: any): void;
declare function tint(...args: any[]): void;
declare function noTint(): void;
declare function imageMode(mode: any): void;
declare function blend(...args: any[]): void;
declare function filter(filterType: any, filterParam?: number): void;
declare function copy(...args: any[]): void;
declare function save(filename?: string): void;
declare function saveCanvas(canvas?: any, filename?: string, extension?: string): void;
declare function saveFrames(filename: string, extension: string, duration: number, framerate: number, callback?: Function): void;

// --- Input ---
declare var mouseX: number;
declare var mouseY: number;
declare var pmouseX: number;
declare var pmouseY: number;
declare var mouseButton: any;
declare var mouseIsPressed: boolean;
declare var key: string;
declare var keyCode: number;
declare var keyIsPressed: boolean;
declare var touches: any[];
declare function keyIsDown(code: number): boolean;

// --- Events (user-defined) ---
declare function setup(): void;
declare function draw(): void;
declare function preload(): void;
declare function mousePressed(event?: any): void;
declare function mouseReleased(event?: any): void;
declare function mouseClicked(event?: any): void;
declare function mouseMoved(event?: any): void;
declare function mouseDragged(event?: any): void;
declare function mouseWheel(event?: any): void;
declare function doubleClicked(event?: any): void;
declare function keyPressed(event?: any): void;
declare function keyReleased(event?: any): void;
declare function keyTyped(event?: any): void;
declare function touchStarted(event?: any): void;
declare function touchMoved(event?: any): void;
declare function touchEnded(event?: any): void;
declare function windowResized(): void;

// --- Environment ---
declare var width: number;
declare var height: number;
declare var windowWidth: number;
declare var windowHeight: number;
declare var displayWidth: number;
declare var displayHeight: number;
declare var frameCount: number;
declare var deltaTime: number;
declare var focused: boolean;
declare var pixels: number[];
declare var drawingContext: CanvasRenderingContext2D;

// --- Constants ---
declare var PI: number;
declare var TWO_PI: number;
declare var HALF_PI: number;
declare var QUARTER_PI: number;
declare var TAU: number;
declare var DEGREES: any;
declare var RADIANS: any;
declare var HSB: any;
declare var HSL: any;
declare var RGB: any;
declare var CENTER: any;
declare var LEFT: any;
declare var RIGHT: any;
declare var TOP: any;
declare var BOTTOM: any;
declare var BASELINE: any;
declare var CORNER: any;
declare var CORNERS: any;
declare var RADIUS: any;
declare var CLOSE: any;
declare var OPEN: any;
declare var CHORD: any;
declare var PIE: any;
declare var SQUARE: any;
declare var PROJECT: any;
declare var ROUND: any;
declare var MITER: any;
declare var BEVEL: any;
declare var WEBGL: any;
declare var P2D: any;
declare var POINTS: any;
declare var LINES: any;
declare var TRIANGLES: any;
declare var TRIANGLE_FAN: any;
declare var TRIANGLE_STRIP: any;
declare var QUAD_STRIP: any;
declare var QUADS: any;
declare var BOLD: any;
declare var BOLDITALIC: any;
declare var ITALIC: any;
declare var NORMAL: any;
declare var WORD: any;
declare var CHAR: any;

// --- 3D ---
declare function createVector(x?: number, y?: number, z?: number): any;
declare function box(w?: number, h?: number, d?: number): void;
declare function sphere(r?: number, detailX?: number, detailY?: number): void;
declare function cylinder(r?: number, h?: number, detailX?: number, detailY?: number): void;
declare function cone(r?: number, h?: number, detailX?: number, detailY?: number): void;
declare function torus(r?: number, tr?: number, detailX?: number, detailY?: number): void;
declare function plane(w?: number, h?: number): void;
declare function orbitControl(sensitivityX?: number, sensitivityY?: number, sensitivityZ?: number): void;
declare function camera(...args: any[]): void;
declare function perspective(fovy?: number, aspect?: number, near?: number, far?: number): void;
declare function ortho(left?: number, right?: number, bottom?: number, top?: number, near?: number, far?: number): void;
declare function ambientLight(...args: any[]): void;
declare function directionalLight(...args: any[]): void;
declare function pointLight(...args: any[]): void;
declare function spotLight(...args: any[]): void;
declare function specularMaterial(...args: any[]): void;
declare function ambientMaterial(...args: any[]): void;
declare function emissiveMaterial(...args: any[]): void;
declare function normalMaterial(): void;
declare function shininess(shine: number): void;
declare function texture(tex: any): void;
declare function model(m: any): void;
declare function loadModel(path: string, normalize?: boolean, success?: Function, failure?: Function): any;
declare function loadShader(vertFile: string, fragFile: string, callback?: Function): any;
declare function createShader(vertSrc: string, fragSrc: string): any;
declare function shader(s: any): void;
declare function resetShader(): void;

// --- Utility ---
declare function print(...args: any[]): void;
declare function println(...args: any[]): void;
declare function millis(): number;
declare function second(): number;
declare function minute(): number;
declare function hour(): number;
declare function day(): number;
declare function month(): number;
declare function year(): number;
declare function createGraphics(w: number, h: number, renderer?: any): any;
declare function blendMode(mode: any): void;
declare function rectMode(mode: any): void;
declare function ellipseMode(mode: any): void;
declare function smooth(): void;
declare function noSmooth(): void;
declare function noLoop(): void;
declare function loop(): void;
declare function redraw(n?: number): void;
declare function isLooping(): boolean;
declare function erase(...args: any[]): void;
declare function noErase(): void;
declare function describe(text: string, display?: any): void;
declare function shuffle(array: any[], modify?: boolean): any[];
declare function append(array: any[], value: any): any[];
declare function arrayCopy(src: any[], srcPosition: number, dst: any[], dstPosition: number, length: number): void;
declare function concat(a: any[], b: any[]): any[];
declare function reverse(list: any[]): any[];
declare function shorten(list: any[]): any[];
declare function sort(list: any[], count?: number): any[];
declare function splice(list: any[], value: any, position: number): any[];
declare function subset(list: any[], start: number, count?: number): any[];

// --- Sound (basic) ---
declare function loadSound(path: string, success?: Function, failure?: Function): any;
`;
