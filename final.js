let capture;
let hands;
let handLandmarks = []; 
let flowersArray = []; 
let flowerImages = []; 

let isProcessing = false; 
let statusMessage = "Initializing...";

// Per-hand tracking state
let handLastPoints = [null, null];

// Frame-sync and burst control references
let lastVideoTime = -1;
let openFrames = 0;
let lastBurstTime = 0;

// Landmark indices
const WRIST = 0;
const INDEX_TIP = 8;

// Configuration object updated with new burst parameters
const CONFIG = {
  minSpacing: 20,
  sizeMin: 55,
  sizeMax: 85,
  growMs: 400,         // Time to reach full size
  breatheMs: 1200,     // Breathing animation cycle speed
  breatheAmount: 0.05, // Subtle breathing scale fluctuation
  gravity: 0.35,       // Downward pull during burst
  drag: 0.98,          // Air resistance drag factor
  burstFrames: 4,      // Required consecutive open-palm frames to trigger
  burstCooldownMs: 800 // Delay between burst triggers
};

/** Map normalized landmarks to mirrored, object-fit: cover screen coords */
function toScreen(nx, ny) {
  if (!capture || !capture.width || !capture.height) {
    return { x: (1 - nx) * width, y: ny * height };
  }

  const cw = width;
  const ch = height;
  const vw = capture.width;
  const vh = capture.height;

  const scaleFactor = Math.max(cw / vw, ch / vh);
  const drawW = vw * scaleFactor;
  const drawH = vh * scaleFactor;
  const offsetX = (cw - drawW) / 2;
  const offsetY = (ch - drawH) / 2;

  return {
    x: offsetX + (1 - nx) * drawW, // Mirrored coordinates
    y: offsetY + ny * drawH
  };
}

// Helper function for random float ranges
function rand(min, max) {
  return min + Math.random() * (max - min);
}

// Ease-out-back easing function for pop-in elasticity
function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function preload() {
  for (let i = 1; i <= 10; i++) {
    let img = loadImage(`Flowers/f${i}.png`);
    flowerImages.push(img);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Cap device pixel ratio at 2 for crisp canvas rendering on high-DPI screens
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

  capture = createCapture(VIDEO, () => {
    statusMessage = "Webcam active. Loading MediaPipe...";
  });
  capture.size(1280, 720);
  capture.hide();

  try {
    hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 2,           
      modelComplexity: 1,        
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults(gotHands);
    statusMessage = "Waiting for webcam permission...";
  } catch (e) {
    statusMessage = "Error loading MediaPipe scripts.";
    console.error(e);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function gotHands(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    handLandmarks = results.multiHandLandmarks; 
  } else {
    handLandmarks = []; 
  }
  isProcessing = false;
}

function draw() {
  background(0);

  if (capture && capture.loadedmetadata) {
    const videoElt = capture.elt;

    // Only re-detect when there's actually a new camera frame.
    if (videoElt.currentTime !== lastVideoTime) {
      lastVideoTime = videoElt.currentTime;

      if (!isProcessing && hands) {
        isProcessing = true; 
        hands.send({ image: videoElt });
      }
    }

    // Object-fit: cover drawing calculations
    const vw = capture.width;
    const vh = capture.height;
    const scaleFactor = Math.max(width / vw, height / vh);
    const drawW = vw * scaleFactor;
    const drawH = vh * scaleFactor;
    const offsetX = (width - drawW) / 2;
    const offsetY = (height - drawH) / 2;

    push();
    translate(offsetX + drawW, offsetY);
    scale(-1, 1);
    image(capture, 0, 0, drawW, drawH);
    pop();
  } else {
    fill(255);
    textSize(24);
    textAlign(CENTER, CENTER);
    text(statusMessage, width / 2, height / 2);
  }

  // Advance and draw one frame for all flowers
  const now = millis();
  step(flowersArray, now);

  if (handLandmarks.length > 0) {
    // Draw skeletons for all detected hands
    handLandmarks.forEach((lm) => drawCustomSkeleton(lm));

    const anyOpen = handLandmarks.some((lm) => isOpenHand(lm));
    openFrames = anyOpen ? openFrames + 1 : 0;

    const cooling = now - lastBurstTime < CONFIG.burstCooldownMs;

    if (openFrames >= CONFIG.burstFrames && !cooling) {
      const openHand = handLandmarks.find((lm) => isOpenHand(lm));
      if (openHand) {
        const origin = toScreen(openHand[WRIST].x, openHand[WRIST].y);
        burst(flowersArray, origin.x, origin.y);
        lastBurstTime = now;
        handLastPoints = [null, null];
      }
    } else if (!anyOpen) {
      // Plant from each pointing hand independently
      handLandmarks.forEach((lm, i) => {
        if (i > 1) return;
        if (!isPointing(lm)) {
          handLastPoints[i] = null;
          return;
        }

        const tip = toScreen(lm[INDEX_TIP].x, lm[INDEX_TIP].y);

        handLastPoints[i] = plant(
          flowersArray,
          tip.x,
          tip.y,
          flowerImages,
          handLastPoints[i]
        );
      });
    }

    // Clear tracking references for undetected hands
    for (let i = handLandmarks.length; i < 2; i++) {
      handLastPoints[i] = null;
    }
  } else {
    openFrames = 0;
    handLastPoints = [null, null];
  }
}

/** Advance animation states and render garden flowers without fading */
function step(garden, t) {
  for (let i = garden.length - 1; i >= 0; i--) {
    const f = garden[i];
    let scale = 1;

    if (f.state === "planted") {
      const grow = Math.min(1, (t - f.born) / CONFIG.growMs);
      const breathe = 1 + Math.sin(t / CONFIG.breatheMs + f.phase) * CONFIG.breatheAmount;
      scale = easeOutBack(grow) * breathe;
      f.rot += f.spin * 0.15;
    } else {
      f.x += f.vx;
      f.y += f.vy;
      f.vy += CONFIG.gravity;
      f.vx *= CONFIG.drag;
      f.vy *= CONFIG.drag;
      f.rot += f.spin;

      if (f.isOffScreen()) {
        garden.splice(i, 1);
        continue;
      }
    }

    const s = f.size * scale;
    f.display(s);
  }
}

/** Plant a flower at (x, y) if spacing threshold is met */
function plant(garden, x, y, images, lastPoint) {
  if (images.length === 0) return lastPoint;
  
  if (lastPoint && Math.hypot(lastPoint.x - x, lastPoint.y - y) < CONFIG.minSpacing) {
    return lastPoint;
  }

let randomImage = images[(Math.random() * images.length) | 0];

if (garden.length > 0) {
  while (randomImage === garden[garden.length - 1].img) {
    randomImage = images[(Math.random() * images.length) | 0];
  }
}

  garden.push(
    new Flower(
      x,
      y,
      randomImage,
      rand(CONFIG.sizeMin, CONFIG.sizeMax),
      rand(0, Math.PI * 2),
      rand(-0.04, 0.04)
    )
  );

  return { x, y };
}

/** Firework-style burst function originating from wrist location */
function burst(garden, originX, originY) {
  for (const f of garden) {
    if (f.state === "burst") continue;
    const angle = Math.atan2(f.y - originY, f.x - originX) + rand(-0.3, 0.3);
    const power = rand(6, 15);
    f.state = "burst";
    f.vx = Math.cos(angle) * power;
    f.vy = Math.sin(angle) * power - 3;
    f.spin = rand(-0.12, 0.12);
  }
}

/** Visualizer hand skeleton */
function drawCustomSkeleton(landmarks) {
  let connections = [
    [0,1],[1,2],[2,3],[3,4],        // Thumb
    [0,5],[5,6],[6,7],[7,8],        // Index
    [5,9],[9,10],[10,11],[11,12],   // Middle
    [9,13],[13,14],[14,15],[15,16], // Ring
    [13,17],[17,18],[18,19],[19,20],// Pinky
    [0,17]                          // Palm base
  ];

  stroke(255);
  strokeWeight(2);

  for (let edge of connections) {
    let pt1 = toScreen(landmarks[edge[0]].x, landmarks[edge[0]].y);
    let pt2 = toScreen(landmarks[edge[1]].x, landmarks[edge[1]].y);

    line(pt1.x, pt1.y, pt2.x, pt2.y);
  }

  fill(255);
  noStroke();
  for (let pt of landmarks) {
    let screenPt = toScreen(pt.x, pt.y);
    circle(screenPt.x, screenPt.y, 4);
  }
}

/** Open palm: all four non-thumb fingers extended above PIP joints */
function isOpenHand(lm) {
  const FINGERS = [
    [8, 6],   // Index [tip, pip]
    [12, 10], // Middle [tip, pip]
    [16, 14], // Ring [tip, pip]
    [20, 18], // Pinky [tip, pip]
  ];
  return FINGERS.every(([tip, pip]) => lm[tip].y < lm[pip].y - 0.04);
}

/** Pointing: index extended upward, middle/ring/pinky curled downward */
function isPointing(lm) {
  const indexUp = lm[8].y < lm[6].y - 0.03;
  const othersDown = lm[12].y > lm[10].y && lm[16].y > lm[14].y && lm[20].y > lm[18].y;
  return indexUp && othersDown;
}

class Flower {
  constructor(x, y, img, size, rot, spin) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.size = size;
    this.rot = rot;
    this.spin = spin;
    
    this.born = millis();
    this.phase = rand(0, Math.PI * 2);
    
    this.vx = 0;
    this.vy = 0;
    this.state = "planted";
  }

  isOffScreen() {
    return (
      this.x < -100 || 
      this.x > width + 100 || 
      this.y < -100 || 
      this.y > height + 100
    );
  }

  display(computedSize) {
    if (this.img) {
      push();
      translate(this.x, this.y);
      rotate(this.rot); 
      imageMode(CENTER);
      image(this.img, 0, 0, computedSize, computedSize);
      pop();
    }
  }
}