# Petal Wand

**[Live Demo](https://petal-wand-bjpf.vercel.app/)**

Petal Wand is an interactive web-based garden controlled by real-time hand gestures using your webcam. 

Built with JavaScript, p5.js, and MediaPipe Hands, this application tracks your hand movements to create a dynamic visual garden. Plant vibrant flowers by pointing your index finger, or scatter the garden using an open-palm gesture!

---

## Features

* Gesture Planting: Plant flowers by pointing your index finger.
* Gesture Scattering: Burst and scatter planted flowers using an open palm.
* Smart Randomization: Generates random flowers while avoiding adjacent duplicates.
* Organic Animations: Smooth pop-in growth combined with subtle breathing and rotation effects.
* Physics-Based Effects: Natural scattering powered by gravity and air resistance drag.
* Multi-Hand Support: Detects and responds to up to two hands simultaneously.
* Webcam Integration: Real-time, low-latency landmark tracking.

---

## How to Play

1. Grant Camera Access: Allow your web browser to access your webcam.
2. Planting Flowers: Raise your index finger vertically upward while keeping your other fingers folded. Move your fingertip across the screen to draw a trail of blooming flowers.
3. Scattering Flowers: Open your palm with all fingers extended and hold it for a moment to send the flowers flying.
4. Have Fun: Experiment with continuous trails, double-handed planting, and explosive bursts!

Note: Ensure good lighting and keep your index finger clearly extended for accurate gesture tracking.

---

## How It Works

1. Video Capture & Tracking: The webcam stream is processed by MediaPipe Hands, which identifies 21 spatial landmarks for each hand.
2. Gesture Recognition: 
   * Pointing: Triggered when the index fingertip is above its joint while the middle, ring, and pinky fingers are curled down.
   * Open Palm: Triggered when all four non-thumb fingertips are extended straight up.
3. Canvas Rendering: p5.js updates the screen each frame to handle:
   * Translating hand landmarks into canvas coordinates (with mirror effect applied).
   * Spawning flowers with unique scales, rotations, and smooth growth curves.
   * Calculating physics vectors (velocity, gravity, and drag) for burst effects.

---

## Tech Stack

* Language: JavaScript (ES6+)
* Canvas & Animation: p5.js
* Hand Tracking: MediaPipe Hands
* Markup & Styling: HTML5 / CSS3

---

## Project Structure

```text
Petal-Wand/
│
├── index.html        # Main html entry point
├── style.css         # Layout & canvas styling
├── final.js          # Core application & gesture logic
│
└── Flowers/          # Flower PNG image assets
    ├── f1.png
    ├── f2.png
    ├── f3.png
    └── ...
