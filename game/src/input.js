// Keyboard and pointer state for the game. The rest of the game reads held
// keys, one-shot presses (an edge: true only on the frame the key went down)
// and the pointer's angle around the planet, and never touches DOM events
// itself.

import { CENTER_X, CENTER_Y } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.pointerX = CENTER_X + 200;
    this.pointerY = CENTER_Y;
    this.pointerSeen = false;
    this.clicked = false;

    window.addEventListener('keydown', (event) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    canvas.addEventListener('pointermove', (event) => {
      const point = this.toGamePoint(event);
      this.pointerX = point.x;
      this.pointerY = point.y;
      this.pointerSeen = true;
    });
    canvas.addEventListener('pointerdown', (event) => {
      const point = this.toGamePoint(event);
      this.pointerX = point.x;
      this.pointerY = point.y;
      this.pointerSeen = true;
      this.clicked = true;
    });
  }

  /** A client event's position in the game's own 1280x720 coordinates. */
  toGamePoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  /** The angle of the pointer around the planet, for the shield to chase. */
  pointerAngle() {
    return Math.atan2(this.pointerY - CENTER_Y, this.pointerX - CENTER_X);
  }

  held(code) {
    return this.keys.has(code);
  }

  /** True once per physical press; reading it consumes it. */
  wasPressed(code) {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  /** True once per pointer press; reading it consumes it. */
  wasClicked() {
    const was = this.clicked;
    this.clicked = false;
    return was;
  }

  /** Drop stale one-shot presses at the end of a frame. */
  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}
