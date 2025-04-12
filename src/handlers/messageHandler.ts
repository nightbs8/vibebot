import { Context, SessionFlavor, InputFile } from 'grammy';
import * as fs from 'fs-extra';
import * as path from 'path';
import fetch from 'node-fetch';
import { EFFECTS, PRESETS, TEMP_DIR, MAX_AUDIO_SIZE_MB, BOT_TOKEN } from '../config';
import { applyEffects, AudioProcessingResult } from '../services/audioService';

// Define session structure
export interface SessionData {
  audioPath?: string;
  audioTitle?: string;
  isVoiceMessage?: boolean;
  selectedEffects: string[];
  processingHistory: {
    originalPath: string;
    effectIds: string[];
    resultPath: string;
  }[];
}

export type BotContext = Context & SessionFlavor<SessionData>;

// Ensure temp directory exists
fs.ensureDirSync(TEMP_DIR);

// Handle start command
export const handleStart = async (ctx: BotContext): Promise<void> => {
  ctx.session.selectedEffects = [];
  ctx.session.processingHistory = [];
  
  await ctx.reply(
    '<b>📥 Upload audio or send voice message</b>\n\n' +
    'You can use these commands:\n' +
    '/effects - See available audio effects\n' +
    '/presets - See effect combinations\n' +
    '/clear - Clear current audio and effects',
    { parse_mode: 'HTML' }
  );
};

// Handle effects command
export const handleEffects = async (ctx: BotContext): Promise<void> => {
  const effectsList = Object.values(EFFECTS)
    .map(effect => `${effect.name} - ${effect.description}`)
    .join('\n');
  
  await ctx.reply(
    '🎛 Available Effects:\n\n' +
    effectsList + '\n\n' +
    'To apply an effect, send me an audio file or voice message first!'
  );
};

// Handle presets command
export const handlePresets = async (ctx: BotContext): Promise<void> => {
  const presetsList = Object.values(PRESETS)
    .map(preset => `${preset.name} - Combines: ${preset.effects.map(e => {
      const effect = Object.values(EFFECTS).find(ef => ef.id === e);
      return effect ? effect.name : e;
    }).join(' + ')}`)
    .join('\n');
  
  await ctx.reply(
    '✨ Effect Presets:\n\n' +
    presetsList + '\n\n' +
    'To apply a preset, send me an audio file or voice message first!'
  );
};

// Handle clear command
export const handleClear = async (ctx: BotContext): Promise<void> => {
  // Remove temporary audio file if it exists
  if (ctx.session.audioPath && fs.existsSync(ctx.session.audioPath)) {
    try {
      await fs.unlink(ctx.session.audioPath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
  
  // Reset session
  ctx.session.audioPath = undefined;
  ctx.session.audioTitle = undefined;
  ctx.session.selectedEffects = [];
  
  await ctx.reply('🧹 All cleared! Send me a new audio file or voice message to start over.');
};

// Handle audio file or voice message
export const handleAudio = async (ctx: BotContext): Promise<void> => {
  const message = ctx.message;
  if (!message) return;
  
  const isVoice = !!message.voice;
  const isAudio = !!message.audio;
  
  if (!isVoice && !isAudio) return;
  
  // Get file info
  const fileInfo = isVoice ? message.voice : message.audio;
  
  if (!fileInfo) return;
  
  // Check file size
  const fileSizeMB = fileInfo.file_size ? fileInfo.file_size / (1024 * 1024) : 0;
  if (fileSizeMB > MAX_AUDIO_SIZE_MB) {
    await ctx.reply(`⚠️ Audio file is too large (${fileSizeMB.toFixed(1)} MB). Maximum allowed size is ${MAX_AUDIO_SIZE_MB} MB.`);
    return;
  }
  
  // Start downloading
  await ctx.reply('📥 Downloading audio...');
  
  try {
    // Get file URL
    const fileId = fileInfo.file_id;
    const fileUrl = await ctx.api.getFile(fileId);
    
    if (!fileUrl.file_path) {
      await ctx.reply('❌ Failed to get file information. Please try again.');
      return;
    }
    
    // Download the file
    const fullFileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileUrl.file_path}`;
    const response = await fetch(fullFileUrl);
    
    if (!response.ok) {
      await ctx.reply('❌ Failed to download file. Please try again.');
      return;
    }
    
    // Save the file
    const fileName = isVoice ? 
      `voice_${Date.now()}${path.extname(fileUrl.file_path)}` : 
      isAudio && message.audio?.file_name ? 
        `${message.audio.file_name}` : 
        `audio_${Date.now()}${path.extname(fileUrl.file_path)}`;
    
    const filePath = path.join(TEMP_DIR, fileName);
    const buffer = await response.buffer();
    await fs.writeFile(filePath, buffer);
    
    // Save to session
    ctx.session.audioPath = filePath;
    ctx.session.audioTitle = isAudio && message.audio?.title ? message.audio.title : fileName;
    ctx.session.isVoiceMessage = isVoice;
    ctx.session.selectedEffects = [];
    
    // Prepare effect selection keyboard
    await showEffectMenu(ctx);
  } catch (error) {
    console.error('Error handling audio:', error);
    await ctx.reply('❌ An error occurred while processing your audio. Please try again.');
  }
};

// Show effect selection menu
export const showEffectMenu = async (ctx: BotContext): Promise<void> => {
  if (!ctx.session.audioPath) {
    await ctx.reply('⚠️ No audio file loaded. Please send me a voice message or audio file first!');
    return;
  }
  
  // Create keyboard with effects
  const keyboard = [];
  
  // Add effects
  const effectButtons = Object.values(EFFECTS).map(effect => ({
    text: effect.name,
    callback_data: `effect:${effect.id}`
  }));
  
  // Split into rows of 2 buttons
  for (let i = 0; i < effectButtons.length; i += 2) {
    keyboard.push(effectButtons.slice(i, i + 2));
  }
  
  // Add presets
  const presetButtons = Object.values(PRESETS).map(preset => ({
    text: preset.name,
    callback_data: `preset:${preset.id}`
  }));
  
  // Split presets into rows of 2 buttons
  for (let i = 0; i < presetButtons.length; i += 2) {
    keyboard.push(presetButtons.slice(i, i + 2));
  }
  
  // Add action buttons
  keyboard.push([
    { text: '🔄 Reset Effects', callback_data: 'reset_effects' },
    { text: '✅ Apply Effects', callback_data: 'apply_effects' }
  ]);
  
  const selectedEffects = ctx.session.selectedEffects.map(effectId => {
    const effect = Object.values(EFFECTS).find(e => e.id === effectId);
    return effect ? effect.name : effectId;
  }).join(', ');
  
  const message = ctx.session.audioTitle ?
    `🎵 <b>Audio:</b> ${ctx.session.audioTitle}\n\n` :
    '🎵 <b>Audio ready!</b>\n\n';
  
  await ctx.reply(
    message +
    `${selectedEffects.length ? `🎚 <b>Selected effects:</b> ${selectedEffects}\n\n` : ''}` +
    'Select effects to apply:',
    {
      reply_markup: { inline_keyboard: keyboard },
      parse_mode: 'HTML'
    }
  );
};

// Handle effect selection
export const handleEffectSelection = async (ctx: BotContext): Promise<void> => {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData) return;
  
  console.log('Effect callback received:', callbackData); // Add logging for debugging
  
  // Get the current effect list
  const effectsList = ctx.session.selectedEffects || [];
  
  if (callbackData.startsWith('effect:')) {
    // Single effect selection
    const effectId = callbackData.split(':')[1];
    
    // Add or remove effect (toggle)
    const index = effectsList.indexOf(effectId);
    if (index === -1) {
      effectsList.push(effectId);
    } else {
      effectsList.splice(index, 1);
    }
    
    // Update session
    ctx.session.selectedEffects = effectsList;
    
    // Show updated menu
    await ctx.answerCallbackQuery();
    await showEffectMenu(ctx);
  } else if (callbackData.startsWith('preset:')) {
    // Preset selection
    const presetId = callbackData.split(':')[1];
    const preset = Object.values(PRESETS).find(p => p.id === presetId);
    
    if (preset) {
      // Set effects to the preset effects
      ctx.session.selectedEffects = [...preset.effects];
      
      // Show updated menu
      await ctx.answerCallbackQuery(`Applied preset: ${preset.name}`);
      await showEffectMenu(ctx);
    } else {
      await ctx.answerCallbackQuery('Preset not found');
    }
  } else if (callbackData === 'reset_effects') {
    // Reset effects
    ctx.session.selectedEffects = [];
    
    // Show updated menu
    await ctx.answerCallbackQuery('Effects reset');
    await showEffectMenu(ctx);
  } else if (callbackData === 'apply_effects') {
    // Apply effects
    await ctx.answerCallbackQuery('Processing your audio...');
    await processAudio(ctx);
  }
};

// Process audio with selected effects
export const processAudio = async (ctx: BotContext): Promise<void> => {
  if (!ctx.session.audioPath || !ctx.session.selectedEffects.length) {
    await ctx.reply('⚠️ Please select at least one effect to apply.');
    return;
  }
  
  await ctx.reply('⚙️ Processing your audio with the selected effects...');
  
  try {
    const result = await applyEffects(ctx.session.audioPath, ctx.session.selectedEffects);
    
    // Save result to history
    ctx.session.processingHistory = ctx.session.processingHistory || [];
    ctx.session.processingHistory.push({
      originalPath: ctx.session.audioPath,
      effectIds: [...ctx.session.selectedEffects],
      resultPath: result.filePath
    });
    
    // Send back the processed audio
    await sendProcessedAudio(ctx, result);
    
    // Show options for further actions
    await showActionMenu(ctx);
  } catch (error) {
    console.error('Error processing audio:', error);
    await ctx.reply('❌ An error occurred while processing your audio. Please try again.');
  }
};

// Send processed audio back to user
const sendProcessedAudio = async (ctx: BotContext, result: AudioProcessingResult): Promise<void> => {
  try {
    // Create a list of applied effects for the caption
    const appliedEffects = ctx.session.selectedEffects.map(effectId => {
      const effect = Object.values(EFFECTS).find(e => e.id === effectId);
      return effect ? effect.name : effectId;
    }).join(', ');
    
    // Create InputFile from the local file path
    const inputFile = new InputFile(result.filePath);
    
    // Check if the original message was a voice message
    const isVoiceMessage = ctx.session.isVoiceMessage === true;
    
    if (isVoiceMessage) {
      // Send as voice message with no caption
      await ctx.replyWithVoice(inputFile);
    } else {
      // Send as audio message with caption about effects
      await ctx.replyWithAudio(inputFile, { 
        caption: `🎵 Here's your vibed audio with: ${appliedEffects}\n\nCreated with @vibify_audio_bot`
      });
    }
  } catch (error) {
    console.error('Error sending processed audio:', error);
    await ctx.reply('❌ An error occurred while sending your processed audio. Please try again.');
  }
};

// Show menu for further actions
const showActionMenu = async (ctx: BotContext): Promise<void> => {
  const keyboard = [
    [
      { text: '🔄 Apply different effects', callback_data: 'new_effects' },
      { text: '🆕 Upload new audio', callback_data: 'upload_new' }
    ]
  ];
  
  await ctx.reply(
    '✅ What would you like to do next?',
    { reply_markup: { inline_keyboard: keyboard } }
  );
};

// Handle action menu selection
export const handleActionSelection = async (ctx: BotContext): Promise<void> => {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData) return;
  
  console.log('Action callback received:', callbackData); // Add logging for debugging
  
  if (callbackData === 'new_effects') {
    // Reset effects but keep the audio
    ctx.session.selectedEffects = [];
    
    // Show effect menu again
    await ctx.answerCallbackQuery('Loading effects menu...');
    await showEffectMenu(ctx);
  } else if (callbackData === 'upload_new') {
    // Clear session and prompt for new upload
    await ctx.answerCallbackQuery('Ready for new upload!');
    await handleClear(ctx);
    await ctx.reply('🎵 Please send me a new voice message or audio file!');
  }
}; 