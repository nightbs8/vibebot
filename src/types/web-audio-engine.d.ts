/// <reference types="node" />

declare module 'web-audio-engine' {
  export class RenderingAudioContext {
    sampleRate: number;
    destination: AudioDestinationNode;
    currentTime: number;

    createBufferSource(): AudioBufferSourceNode;
    createGain(): GainNode;
    createDelay(): DelayNode;
    createBiquadFilter(): BiquadFilterNode;
    createConvolver(): ConvolverNode;
    createWaveShaper(): WaveShaperNode;
    createBuffer(numOfChannels: number, length: number, sampleRate: number): AudioBuffer;
    createOscillator(): OscillatorNode;
    createChannelSplitter(numberOfOutputs: number): ChannelSplitterNode;
    createChannelMerger(numberOfInputs: number): ChannelMergerNode;
    createScriptProcessor(bufferSize: number, numberOfInputChannels: number, numberOfOutputChannels: number): ScriptProcessorNode;

    decodeAudioData(audioData: ArrayBuffer): Promise<AudioBuffer>;
    processTo(time: number | string): Promise<void>;
    exportAsAudioData(): AudioData;
    encodeAudioData(audioData: AudioData, opts?: EncodeOptions): Promise<ArrayBuffer>;
    close(): Promise<void>;
  }

  export class StreamAudioContext extends RenderingAudioContext {
    pipe(destination: any): any;
    resume(): void;
    suspend(): void;
  }

  export class OfflineAudioContext extends RenderingAudioContext {
    constructor(numberOfChannels: number, length: number, sampleRate: number);
    startRendering(): Promise<AudioBuffer>;
  }

  export class WebAudioContext extends RenderingAudioContext {
    constructor(opts?: { context?: any; destination?: any; numberOfChannels?: number; blockSize?: number });
    resume(): void;
    suspend(): void;
  }

  export interface AudioData {
    numberOfChannels?: number;
    length?: number;
    sampleRate: number;
    channelData: Float32Array[];
  }

  export interface EncodeOptions {
    bitDepth?: number;
    float?: boolean;
    type?: string;
  }

  export interface AudioBuffer {
    sampleRate: number;
    length: number;
    duration: number;
    numberOfChannels: number;
    getChannelData(channel: number): Float32Array;
  }

  export interface AudioNode {
    connect(destination: AudioNode | AudioParam, output?: number, input?: number): AudioNode;
    disconnect(): void;
  }

  export interface AudioParam {
    value: number;
    setValueAtTime(value: number, time: number): AudioParam;
    linearRampToValueAtTime(value: number, time: number): AudioParam;
    exponentialRampToValueAtTime(value: number, time: number): AudioParam;
  }

  export interface AudioBufferSourceNode extends AudioNode {
    buffer: AudioBuffer | null;
    loop: boolean;
    loopStart: number;
    loopEnd: number;
    playbackRate: AudioParam;
    start(when?: number, offset?: number, duration?: number): void;
    stop(when?: number): void;
    onended: () => void;
  }

  export interface GainNode extends AudioNode {
    gain: AudioParam;
  }

  export interface DelayNode extends AudioNode {
    delayTime: AudioParam;
  }

  export interface BiquadFilterNode extends AudioNode {
    type: BiquadFilterType;
    frequency: AudioParam;
    detune: AudioParam;
    Q: AudioParam;
    gain: AudioParam;
  }

  export interface ConvolverNode extends AudioNode {
    buffer: AudioBuffer | null;
    normalize: boolean;
  }

  export interface WaveShaperNode extends AudioNode {
    curve: Float32Array | null;
    oversample: OverSampleType;
  }

  export interface OscillatorNode extends AudioNode {
    frequency: AudioParam;
    detune: AudioParam;
    type: OscillatorType;
    start(when?: number): void;
    stop(when?: number): void;
  }

  export interface ChannelSplitterNode extends AudioNode {}

  export interface ChannelMergerNode extends AudioNode {}

  export interface ScriptProcessorNode extends AudioNode {
    onaudioprocess: (event: AudioProcessingEvent) => void;
  }

  export interface AudioProcessingEvent {
    inputBuffer: AudioBuffer;
    outputBuffer: AudioBuffer;
  }

  export interface AudioDestinationNode extends AudioNode {}

  export type BiquadFilterType = 'lowpass' | 'highpass' | 'bandpass' | 'lowshelf' | 'highshelf' | 'peaking' | 'notch' | 'allpass';
  export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';
  export type OverSampleType = 'none' | '2x' | '4x';

  export const decoder: {
    get(type: string): Function;
    set(type: string, decodeFn: (audioData: ArrayBuffer, opts?: any) => Promise<AudioData>): void;
    decode(audioData: ArrayBuffer, opts?: any): Promise<AudioData>;
  };

  export const encoder: {
    get(type: string): Function;
    set(type: string, encodeFn: (audioData: AudioData, opts?: any) => Promise<ArrayBuffer>): void;
    encode(audioData: AudioData, opts?: any): Promise<ArrayBuffer>;
  };
} 