import { Bot, session, GrammyError, HttpError, Context } from 'grammy';
import { BOT_TOKEN, TEMP_DIR } from './config';
import * as fs from 'fs-extra';
import {
  handleStart,
  handleEffects,
  handlePresets,
  handleClear,
  handleAudio,
  handleEffectSelection,
  handleActionSelection,
  SessionData,
  BotContext
} from './handlers/messageHandler';
import { cleanupTempFiles } from './services/audioService';

// Ensure the bot token is set
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is not set. Please set it as an environment variable.');
  process.exit(1);
}

// Ensure temp directory exists
fs.ensureDirSync(TEMP_DIR);

// Create bot instance
const bot = new Bot<BotContext>(BOT_TOKEN);

// Set up session middleware
bot.use(session({
  initial: (): SessionData => ({
    selectedEffects: [],
    processingHistory: [],
    isVoiceMessage: false
  })
}));

// Command handlers
bot.command('start', handleStart);
bot.command('effects', handleEffects);
bot.command('presets', handlePresets);
bot.command('clear', handleClear);

// Handle audio messages (voice or audio file)
bot.on('message:voice', handleAudio);
bot.on('message:audio', handleAudio);

// Handle callback queries for effect selection and actions
bot.callbackQuery(/^(effect:|preset:|reset_effects|apply_effects)/, handleEffectSelection);
bot.callbackQuery(/^(new_effects|upload_new)$/, handleActionSelection);

// Error handler
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e);
  } else {
    console.error('Unknown error:', e);
  }
});

// Handle graceful shutdown
process.once('SIGINT', () => {
  bot.stop();
  cleanupTempFiles().then(() => {
    console.log('Bot stopped and temporary files cleaned up');
    process.exit(0);
  });
});

process.once('SIGTERM', () => {
  bot.stop();
  cleanupTempFiles().then(() => {
    console.log('Bot stopped and temporary files cleaned up');
    process.exit(0);
  });
});

// Start the bot
console.log('🤖 Starting Vibe Bot...');
bot.start().then(() => {
  console.log('✅ Bot is running!');
}).catch((err) => {
  console.error('❌ Failed to start bot:', err);
}); 