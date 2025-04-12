declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    input(input: string): FfmpegCommand;
    output(output: string): FfmpegCommand;
    audioFrequency(frequency: number): FfmpegCommand;
    audioChannels(channels: number): FfmpegCommand;
    audioCodec(codec: string): FfmpegCommand;
    audioBitrate(bitrate: string): FfmpegCommand;
    on(event: string, callback: (...args: any[]) => void): FfmpegCommand;
    run(): FfmpegCommand;
  }

  function ffmpeg(input?: string): FfmpegCommand;
  
  namespace ffmpeg {
    function setFfmpegPath(path: string): void;
    function setFfprobePath(path: string): void;
  }

  export = ffmpeg;
} 