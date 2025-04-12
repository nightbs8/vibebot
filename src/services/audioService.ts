import { RenderingAudioContext, AudioProcessingEvent } from 'web-audio-engine';
import * as fs from 'fs-extra';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { TEMP_DIR } from '../config';

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

// Ensure temp directory exists
fs.ensureDirSync(TEMP_DIR);

export interface AudioProcessingResult {
  filePath: string;
  duration: number;
}

// Convert any audio format to WAV for processing
export const convertToWav = async (inputPath: string): Promise<string> => {
  const outputPath = path.join(TEMP_DIR, `${path.basename(inputPath, path.extname(inputPath))}_converted.wav`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .audioFrequency(44100)
      .audioChannels(2)
      .audioCodec('pcm_s16le')
      .on('end', () => resolve(outputPath))
      .on('error', (err: Error) => reject(err))
      .run();
  });
};

// Convert processed WAV back to MP3 for sharing
export const convertToMp3 = async (inputPath: string): Promise<string> => {
  const outputPath = path.join(TEMP_DIR, `${path.basename(inputPath, path.extname(inputPath))}_final.mp3`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .audioFrequency(44100)
      .audioChannels(2)
      .audioBitrate('192k')
      .on('end', () => resolve(outputPath))
      .on('error', (err: Error) => reject(err))
      .run();
  });
};

// Apply audio effects using web-audio-engine
export const applyEffects = async (
  inputPath: string, 
  effectIds: string[]
): Promise<AudioProcessingResult> => {
  const context = new RenderingAudioContext();
  const wavPath = await convertToWav(inputPath);
  
  try {
    // Load audio file
    const audioData = await fs.readFile(wavPath);
    const audioBuffer = await context.decodeAudioData(audioData.buffer);
    
    // Check for special effects that modify the buffer directly
    let modifiedBuffer = audioBuffer;
    const remainingEffects = [...effectIds];
    
    // Handle reverse effect
    if (remainingEffects.includes('reverse')) {
      modifiedBuffer = reverseAudioBuffer(context, modifiedBuffer);
      // Remove from the effects list since it's already applied
      const index = remainingEffects.indexOf('reverse');
      if (index !== -1) remainingEffects.splice(index, 1);
    }
    
    // Create source node
    const source = context.createBufferSource();
    source.buffer = modifiedBuffer;
    
    // Handle speed effects
    if (remainingEffects.includes('speed_up')) {
      source.playbackRate.value = 1.5;
      const index = remainingEffects.indexOf('speed_up');
      if (index !== -1) remainingEffects.splice(index, 1);
    } else if (remainingEffects.includes('slow_down')) {
      source.playbackRate.value = 0.7;
      const index = remainingEffects.indexOf('slow_down');
      if (index !== -1) remainingEffects.splice(index, 1);
    }
    
    // Create audio processing chain
    let currentNode: any = source;
    
    // Apply each effect in sequence
    for (const effectId of remainingEffects) {
      const effectNode = createEffectNode(context, effectId);
      if (effectNode) {
        currentNode.connect(effectNode);
        currentNode = effectNode;
      }
    }
    
    // Connect to destination
    currentNode.connect(context.destination);
    
    // Start playback and render
    source.start(0);
    await context.processTo(modifiedBuffer.duration / source.playbackRate.value);
    
    // Export the processed audio
    const processedAudioData = context.exportAsAudioData();
    const processedArrayBuffer = await context.encodeAudioData(processedAudioData);
    
    // Save processed audio to file
    const processedWavPath = path.join(TEMP_DIR, `${path.basename(inputPath, path.extname(inputPath))}_processed.wav`);
    await fs.writeFile(processedWavPath, Buffer.from(processedArrayBuffer));
    
    // Convert to MP3
    const mp3Path = await convertToMp3(processedWavPath);
    
    return {
      filePath: mp3Path,
      duration: modifiedBuffer.duration / source.playbackRate.value
    };
  } catch (error) {
    console.error('Error applying effects:', error);
    throw error;
  } finally {
    // Clean up temporary WAV file
    try {
      await fs.unlink(wavPath);
    } catch (e) {
      console.error('Error cleaning up temporary file:', e);
    }
  }
};

// Reverses an audio buffer (for reverse effect)
const reverseAudioBuffer = (context: RenderingAudioContext, buffer: any): any => {
  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const newBuffer = context.createBuffer(numberOfChannels, length, buffer.sampleRate);
  
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const originalData = buffer.getChannelData(channel);
    const newData = newBuffer.getChannelData(channel);
    
    for (let i = 0; i < length; i++) {
      newData[i] = originalData[length - 1 - i];
    }
  }
  
  return newBuffer;
};

// Create an effect node based on effect ID
const createEffectNode = (context: RenderingAudioContext, effectId: string): any => {
  switch (effectId) {
    case 'pitch_up':
      return createPitchShiftNode(context, 1.5);
    
    case 'pitch_down':
      return createPitchShiftNode(context, 0.7);
    
    case 'echo':
      return createEchoNode(context);
    
    case 'reverb':
      return createReverbNode(context);
    
    case 'speed_up':
      // Speed up is handled by adjusting the playback rate
      // This is handled separately when creating the source node
      return null;
    
    case 'slow_down':
      // Slow down is handled by adjusting the playback rate
      // This is handled separately when creating the source node
      return null;
    
    case 'reverse':
      // Reverse is handled by reversing the audio buffer
      // This is handled separately when loading the audio
      return null;
    
    case 'distortion':
      return createDistortionNode(context);
    
    case 'robot':
      return createRobotVoiceNode(context);
    
    case '5d':
      return create5DAudioNode(context);
    
    case 'bathroom':
      return createBathroomNode(context);
    
    default:
      return null;
  }
};

// Effect node implementations

const createPitchShiftNode = (context: RenderingAudioContext, pitchFactor: number) => {
  // For pitch shifting without changing speed, we need to create a custom node
  // This is a simplified implementation using a basic pitch shift algorithm
  const scriptNode = context.createScriptProcessor(4096, 2, 2);
  
  scriptNode.onaudioprocess = (audioProcessingEvent: AudioProcessingEvent) => {
    const inputBuffer = audioProcessingEvent.inputBuffer;
    const outputBuffer = audioProcessingEvent.outputBuffer;
    
    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      const inputData = inputBuffer.getChannelData(channel);
      const outputData = outputBuffer.getChannelData(channel);
      
      // Simple pitch shifting via resampling
      for (let i = 0; i < outputBuffer.length; i++) {
        const readIndex = i * pitchFactor;
        if (readIndex < inputBuffer.length) {
          // Linear interpolation between samples
          const readIndexFloor = Math.floor(readIndex);
          const readIndexCeil = Math.min(readIndexFloor + 1, inputBuffer.length - 1);
          const t = readIndex - readIndexFloor;
          
          outputData[i] = (1 - t) * inputData[readIndexFloor] + t * inputData[readIndexCeil];
        } else {
          outputData[i] = 0;
        }
      }
    }
  };
  
  return scriptNode;
};

const createEchoNode = (context: RenderingAudioContext) => {
  const delay = context.createDelay();
  const feedback = context.createGain();
  const filter = context.createBiquadFilter();
  const mixer = context.createGain();
  
  delay.delayTime.value = 0.3;
  feedback.gain.value = 0.5;
  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  
  // Create echo effect routing: input -> delay -> feedback loop -> mixer
  delay.connect(feedback);
  feedback.connect(filter);
  filter.connect(delay);
  delay.connect(mixer);
  
  // Create a wrapper node to handle input/output
  const inputNode = context.createGain();
  const outputNode = context.createGain();
  
  inputNode.connect(delay);
  inputNode.connect(outputNode); // Direct sound
  mixer.connect(outputNode); // Echo
  
  // Return the input node with the output node attached
  return inputNode;
};

const createReverbNode = (context: RenderingAudioContext) => {
  const convolver = context.createConvolver();
  
  // Create a simple impulse response for reverb
  const rate = context.sampleRate;
  const length = rate * 3; // 3 seconds
  const impulse = context.createBuffer(2, length, rate);
  
  for (let channel = 0; channel < 2; channel++) {
    const impulseL = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
  }
  
  convolver.buffer = impulse;
  
  // Create mixer for dry/wet balance
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const output = context.createGain();
  
  dryGain.gain.value = 0.4; // 60% dry
  wetGain.gain.value = 0.6; // 40% wet
  
  // Create routing
  const input = context.createGain();
  input.connect(dryGain);
  input.connect(convolver);
  convolver.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);
  
  return input;
};

const createDistortionNode = (context: RenderingAudioContext) => {
  const distortion = context.createWaveShaper();
  
  // Create distortion curve
  const amount = 20;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
  }
  
  distortion.curve = curve;
  distortion.oversample = '4x';
  
  return distortion;
};

const createRobotVoiceNode = (context: RenderingAudioContext) => {
  // Robot voice effect using ring modulation
  const oscillator = context.createOscillator();
  const modulationGain = context.createGain();
  const input = context.createGain();
  const output = context.createGain();
  
  oscillator.frequency.value = 50; // Modulation frequency
  oscillator.type = 'square';
  modulationGain.gain.value = 1.0;
  
  // Fix: Using a script processor node to connect oscillator to gain parameter
  const modulator = context.createScriptProcessor(4096, 1, 1);
  modulator.onaudioprocess = (e: AudioProcessingEvent) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < e.outputBuffer.length; i++) {
      output[i] = 1.0; // Constant value for modulation
    }
  };
  
  oscillator.connect(modulator);
  modulator.connect(modulationGain);
  input.connect(modulationGain);
  modulationGain.connect(output);
  
  oscillator.start(0);
  
  return input;
};

const create5DAudioNode = (context: RenderingAudioContext) => {
  // 5D audio effect: combination of stereo widening, EQ, and reverb
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);
  const leftDelay = context.createDelay();
  const rightDelay = context.createDelay();
  const leftFilter = context.createBiquadFilter();
  const rightFilter = context.createBiquadFilter();
  
  leftDelay.delayTime.value = 0.015; // 15ms delay
  rightDelay.delayTime.value = 0.01; // 10ms delay
  
  leftFilter.type = 'highpass';
  leftFilter.frequency.value = 200;
  rightFilter.type = 'highpass';
  rightFilter.frequency.value = 300;
  
  // Create the effect routing
  const input = context.createGain();
  input.connect(splitter);
  
  // Left channel processing
  splitter.connect(leftDelay, 0);
  leftDelay.connect(leftFilter);
  leftFilter.connect(merger, 0, 0);
  
  // Right channel processing
  splitter.connect(rightDelay, 1);
  rightDelay.connect(rightFilter);
  rightFilter.connect(merger, 0, 1);
  
  // Add reverb
  const reverb = createReverbNode(context);
  merger.connect(reverb);
  
  return input;
};

const createBathroomNode = (context: RenderingAudioContext) => {
  // Bathroom effect: bandpass filter + reverb
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800; // Focus on mid-low frequencies
  filter.Q.value = 0.5;
  
  // Add reverb
  const reverb = createReverbNode(context);
  filter.connect(reverb);
  
  return filter;
};

// Clean up temporary files
export const cleanupTempFiles = async (): Promise<void> => {
  try {
    const files = await fs.readdir(TEMP_DIR);
    await Promise.all(
      files.map(file => fs.unlink(path.join(TEMP_DIR, file)))
    );
  } catch (error) {
    console.error('Error cleaning up temporary files:', error);
  }
}; 