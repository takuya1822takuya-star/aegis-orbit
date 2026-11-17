// Aegis Orbit — boot and the screen machine. This file wires the pieces
// together: the canvas, the input, the sound, the world and the renderer,
// and it owns which screen is up (title, playing, paused, over). The rules
// live in world.js and the drawing in render.js.
//
// Opened with ?shot=<name>&seed=<n> the page renders one posed, frozen
// scene instead of playing; shots.js poses it and shots.json lists the
// scenes the screenshots were taken from.

import { VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { Input } from './input.js';
import { SoundFX } from './audio.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { poseShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;
const ctx = canvas.getContext('2d');

const sound = new SoundFX();
const input = new Input(canvas);
const world = new World(sound);
const renderer = new Renderer(ctx);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') ?? 7) || 7;

let screen = 'title';
let last = performance.now();

function resetWorld() {
  world.reset((Date.now() % 2147483646) + 1);
}

function startGame() {
  sound.unlock();
  resetWorld();
  screen = 'playing';
}

if (shotName !== null) {
  world.reset(shotSeed);
  screen = poseShot(world, shotName);
} else {
  resetWorld();
  // A calm field behind the title: a few slow bodies that never arrive,
  // because the title screen does not run the simulation.
  world.addBody('rock', -2.4, 520, 0);
  world.addBody('rock', 0.6, 640, 0);
  world.addBody('orb', 2.5, 470, 0);
  world.addBody('rock', 1.8, 720, 0);
}

function frame(nowMs) {
  const now = nowMs / 1000;
  const dt = Math.min((nowMs - last) / 1000, 0.05);
  last = nowMs;

  if (shotName !== null) {
    // A frozen scene: render the pose with a fixed clock, identically always.
    // 2.6s is a moment when both blinking prompts (the title's launch line and
    // the HUD's pulse-ready line) are in their visible phase.
    renderer.draw(world, screen, 2.6);
    requestAnimationFrame(frame);
    return;
  }

  if (screen === 'title') {
    world.shieldAngle += dt * 0.15;
    if (input.wasPressed('Enter') || input.wasClicked()) startGame();
  } else if (screen === 'playing') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      screen = 'paused';
    } else {
      const turn =
        (input.held('ArrowRight') || input.held('KeyD') ? 1 : 0) -
        (input.held('ArrowLeft') || input.held('KeyA') ? 1 : 0);
      world.update(dt, {
        turn,
        pointerAngle: input.pointerSeen ? input.pointerAngle() : null,
      });
      if (input.wasPressed('Space') || input.wasClicked()) world.firePulse();
      if (world.over) screen = 'over';
    }
  } else if (screen === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasPressed('Enter')) {
      screen = 'playing';
    }
  } else if (screen === 'over') {
    // The explosion settles: particles drift on, the shake and flash fade.
    world.updateParticles(dt);
    world.updatePopups(dt);
    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
    if (world.hurtFlash > 0) world.hurtFlash = Math.max(0, world.hurtFlash - dt * 2.4);
    if (input.wasPressed('Enter') || input.wasClicked()) startGame();
  }

  if (input.wasPressed('KeyM')) sound.toggleMute();

  renderer.draw(world, screen, now);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// A small handle for automated play-testing: the world, the screen, a start.
window.__aegis = { world, start: startGame, get screen() { return screen; } };
