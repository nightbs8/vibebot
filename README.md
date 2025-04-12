# Vibe Bot 🎧

A Telegram bot that allows users to upload voice messages or audio files, apply fun and creative audio effects, and then share the modified audio back in Telegram.

## Features

- **Audio Upload:**
  - Supports Telegram voice messages (.ogg) and audio files (.mp3, .wav, etc.)
  - Handles files up to 10 MB
  - Automatically converts input audio to a workable format

- **Audio Effects:**
  - Select from a list of effects
  - Chain multiple effects together
  - Apply preset combinations of effects

- **Available Effects:**
  - 🔊 Pitch Up/Down
  - 🔁 Echo / Delay
  - 🏛️ Reverb (room/hall effect)
  - ⏩ Speed Up / Slow Down
  - ◀️ Reverse
  - 📻 Distortion / Lo-Fi
  - 🤖 Robot / Alien Voice
  - 🌌 5D Audio
  - 🚿 Bathroom effect (mid-low frequencies only)

- **Preset Combinations:**
  - 👽 Alien Radio (Distortion + Robot)
  - 🌙 Slowed & Reverb
  - ⚡ Nightcore (Speed Up + Pitch Up)

## Tech Stack

- Node.js
- TypeScript
- [GrammY](https://grammy.dev/) - Telegram Bot Framework
- [web-audio-engine](https://github.com/mohayonao/web-audio-engine) - Web Audio API polyfill for Node.js
- FFmpeg - Audio conversion

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vibe-bot.git
   cd vibe-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your Telegram Bot Token:
   ```
   BOT_TOKEN=your_telegram_bot_token
   ```

   > Get a bot token from [@BotFather](https://t.me/BotFather) on Telegram.

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the bot:
   ```bash
   npm start
   ```

## Development

For development with automatic restarts:

```bash
npm run dev
```

## Bot Commands

- `/start` - Welcome message and introduction
- `/effects` - List all available audio effects
- `/presets` - Show preset effect combinations
- `/clear` - Clear current audio and selected effects

## User Flow

1. User sends a voice message or audio file to the bot
2. Bot presents a menu of available effects
3. User selects one or more effects to apply
4. Bot processes the audio and returns the modified version
5. User can apply different effects or upload a new audio file

## License

MIT 