// Aegis Orbit — tuning constants and the palette, in one place so the balance
// of the game can be read (and changed) without hunting through the logic.

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

// The planet sits a little below centre so the HUD keeps the top of the screen.
export const CENTER_X = VIEW_WIDTH / 2;
export const CENTER_Y = 380;
export const PLANET_RADIUS = 54;
export const ORBIT_RADIUS = 112;

// The shield is an arc on the orbit ring: how wide it is, and how fast it may swing.
export const SHIELD_ARC = 1.12; // radians, about 64 degrees
export const SHIELD_TURN_KEYBOARD = 3.4; // radians per second on the arrow keys
export const SHIELD_TURN_MOUSE = 11; // radians per second chasing the pointer

export const PLANET_MAX_HP = 100;

// Pulse: the shockwave that clears the screen. Blocking rocks charges it a
// little, catching energy orbs charges it a lot.
export const PULSE_MAX = 100;
export const PULSE_PER_ORB = 25;
export const PULSE_PER_BLOCK = 4;

export const COMBO_WINDOW = 3.5; // seconds before the combo cools off
export const COMBO_PER_STEP = 8; // blocks per multiplier step, up to x8

export const REPAIR_EVERY = [24, 36]; // seconds between repair cores, low..high
export const REPAIR_HP = 12;

// One coherent palette: deep space, a teal planet, a cyan shield, amber energy.
export const COLORS = {
  spaceTop: '#04060f',
  spaceBottom: '#0a1330',
  nebulaViolet: 'rgba(88, 60, 180, 0.16)',
  nebulaTeal: 'rgba(20, 120, 140, 0.14)',
  planetLight: '#7fe7d2',
  planetMid: '#1f9e8f',
  planetDark: '#0b4f5e',
  planetHurt: '#e2543e',
  shield: '#54e0ff',
  shieldReady: '#ffd75e',
  rock: '#9a7d63',
  rockDark: '#5d4836',
  rockCrack: '#2e2119',
  orb: '#ffcf4d',
  repair: '#5eff8a',
  text: '#eaf6ff',
  textDim: '#8fb4c9',
  danger: '#ff5d47',
};
