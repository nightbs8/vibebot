import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

// Configuration settings for the Vibe Bot
export const BOT_TOKEN = process.env.BOT_TOKEN || '';

// Audio settings
export const MAX_AUDIO_SIZE_MB = 10; // Maximum audio file size in MB
export const MAX_AUDIO_DURATION_MINUTES = 5; // Maximum audio duration in minutes

// Temporary file storage
export const TEMP_DIR = path.join(__dirname, '..', 'temp');

// Effects descriptions for user display
export const EFFECTS = {
  PITCH_UP: { id: 'pitch_up', name: '🔊 Pitch Up', description: 'Higher voice' },
  PITCH_DOWN: { id: 'pitch_down', name: '🔉 Pitch Down', description: 'Lower voice' },
  ECHO: { id: 'echo', name: '🔁 Echo', description: 'Add echo effect' },
  REVERB: { id: 'reverb', name: '🏛️ Reverb', description: 'Room/hall effect' },
  SPEED_UP: { id: 'speed_up', name: '⏩ Speed Up', description: 'Make it faster' },
  SLOW_DOWN: { id: 'slow_down', name: '⏪ Slow Down', description: 'Make it slower' },
  REVERSE: { id: 'reverse', name: '◀️ Reverse', description: 'Play backwards' },
  DISTORTION: { id: 'distortion', name: '📻 Distortion', description: 'Lo-Fi effect' },
  ROBOT: { id: 'robot', name: '🤖 Robot', description: 'Robot/Alien voice' },
  FIVE_D: { id: '5d', name: '🌌 5D Audio', description: 'Spatial audio effect' },
  BATHROOM: { id: 'bathroom', name: '🚿 Bathroom', description: 'Mid-low frequencies only' }
};

// Combined presets
export const PRESETS = {
  ALIEN_RADIO: { id: 'alien_radio', name: '👽 Alien Radio', effects: [EFFECTS.DISTORTION.id, EFFECTS.ROBOT.id] },
  SLOWED_REVERB: { id: 'slowed_reverb', name: '🌙 Slowed & Reverb', effects: [EFFECTS.SLOW_DOWN.id, EFFECTS.REVERB.id] },
  NIGHTCORE: { id: 'nightcore', name: '⚡ Nightcore', effects: [EFFECTS.SPEED_UP.id, EFFECTS.PITCH_UP.id] }
}; 