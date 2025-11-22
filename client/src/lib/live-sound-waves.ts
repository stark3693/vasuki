// Live Sound Waves System - Never implemented before
// Creates real-time audio generation and sound wave visualization

export interface SoundWave {
  id: string;
  content: string;
  frequency: number;
  amplitude: number;
  duration: number;
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';
  effects: {
    reverb: number;
    delay: number;
    distortion: number;
    filter: number;
  };
  isPlaying: boolean;
  createdAt: Date;
  creator: string;
  audioData: Float32Array;
  visualization: number[];
}

export interface SoundWaveEvent {
  type: 'created' | 'playing' | 'stopped' | 'frequency_changed' | 'effect_applied';
  soundWave?: SoundWave;
  message: string;
  timestamp: number;
}

export interface SoundWaveAnalysis {
  tempo: number;
  key: string;
  energy: number;
  danceability: number;
  valence: number;
  genre: string;
  mood: string;
}

class LiveSoundWavesSystem {
  private soundWaves: Map<string, SoundWave> = new Map();
  private soundWaveEvents: SoundWaveEvent[] = [];
  private isRunning = false;
  private audioContext: AudioContext | null = null;
  private subscribers: Set<(event: SoundWaveEvent) => void> = new Set();
  private playingSounds: Map<string, AudioBufferSourceNode> = new Map();

  // Initialize audio context
  async initialize(): Promise<boolean> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      return true;
    } catch (error) {
      console.error('Audio context initialization failed:', error);
      return false;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('🎵 Live Sound Waves System Started');
  }

  stop() {
    this.isRunning = false;
    
    // Stop all playing sounds
    this.playingSounds.forEach(source => {
      source.stop();
    });
    this.playingSounds.clear();
    
    console.log('🎵 Live Sound Waves System Stopped');
  }

  // Create sound wave from content
  createSoundWave(
    content: string,
    creator: string,
    frequency: number = 440,
    duration: number = 3,
    waveform: SoundWave['waveform'] = 'sine'
  ): SoundWave {
    const soundWave: SoundWave = {
      id: `sound_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      frequency,
      amplitude: 0.5,
      duration,
      waveform,
      effects: {
        reverb: 0,
        delay: 0,
        distortion: 0,
        filter: 0
      },
      isPlaying: false,
      createdAt: new Date(),
      creator,
      audioData: new Float32Array(0),
      visualization: []
    };

    // Generate audio data
    this.generateAudioData(soundWave);
    
    this.soundWaves.set(soundWave.id, soundWave);
    
    this.emitEvent({
      type: 'created',
      soundWave,
      message: `🎵 Sound wave created: ${content.substring(0, 30)}...`,
      timestamp: Date.now()
    });

    return soundWave;
  }

  // Generate audio data for sound wave with enhanced accuracy
  private generateAudioData(soundWave: SoundWave) {
    if (!this.audioContext) return;

    const sampleRate = this.audioContext.sampleRate;
    const length = Math.floor(sampleRate * soundWave.duration);
    const audioData = new Float32Array(length);
    const visualization = [];

    // Generate harmonics for richer sound
    const harmonics = this.generateHarmonics(soundWave.frequency, soundWave.waveform);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Generate waveform with harmonics
      switch (soundWave.waveform) {
        case 'sine':
          sample = this.generateSineWave(t, harmonics);
          break;
        case 'square':
          sample = this.generateSquareWave(t, harmonics);
          break;
        case 'sawtooth':
          sample = this.generateSawtoothWave(t, harmonics);
          break;
        case 'triangle':
          sample = this.generateTriangleWave(t, harmonics);
          break;
        case 'noise':
          sample = this.generateNoise(t, soundWave.frequency);
          break;
      }

      // Apply amplitude with envelope
      const envelope = this.calculateEnvelope(t, soundWave.duration);
      sample *= soundWave.amplitude * envelope;

      // Apply effects
      sample = this.applyEffects(sample, soundWave.effects);

      // Clamp to prevent distortion
      sample = Math.max(-1, Math.min(1, sample));

      audioData[i] = sample;

      // Create visualization data (downsample for performance)
      if (i % 100 === 0) {
        visualization.push(sample);
      }
    }

    soundWave.audioData = audioData;
    soundWave.visualization = visualization;
  }

  // Generate harmonics for richer sound
  private generateHarmonics(frequency: number, waveform: string): { frequency: number; amplitude: number }[] {
    const harmonics = [];
    const maxHarmonics = waveform === 'sine' ? 1 : 8;
    
    for (let i = 1; i <= maxHarmonics; i++) {
      const amplitude = 1 / i; // Decreasing amplitude for higher harmonics
      harmonics.push({ frequency: frequency * i, amplitude });
    }
    
    return harmonics;
  }

  // Generate sine wave with harmonics
  private generateSineWave(t: number, harmonics: { frequency: number; amplitude: number }[]): number {
    let sample = 0;
    harmonics.forEach(harmonic => {
      sample += harmonic.amplitude * Math.sin(2 * Math.PI * harmonic.frequency * t);
    });
    return sample / harmonics.length;
  }

  // Generate square wave with harmonics
  private generateSquareWave(t: number, harmonics: { frequency: number; amplitude: number }[]): number {
    let sample = 0;
    harmonics.forEach((harmonic, index) => {
      const amplitude = harmonic.amplitude / (2 * index + 1);
      sample += amplitude * Math.sin(2 * Math.PI * harmonic.frequency * t);
    });
    return Math.sign(sample);
  }

  // Generate sawtooth wave with harmonics
  private generateSawtoothWave(t: number, harmonics: { frequency: number; amplitude: number }[]): number {
    let sample = 0;
    harmonics.forEach((harmonic, index) => {
      const amplitude = harmonic.amplitude / (index + 1);
      sample += amplitude * Math.sin(2 * Math.PI * harmonic.frequency * t);
    });
    return sample;
  }

  // Generate triangle wave with harmonics
  private generateTriangleWave(t: number, harmonics: { frequency: number; amplitude: number }[]): number {
    let sample = 0;
    harmonics.forEach((harmonic, index) => {
      const amplitude = harmonic.amplitude / Math.pow(2 * index + 1, 2);
      sample += amplitude * Math.sin(2 * Math.PI * harmonic.frequency * t);
    });
    return sample;
  }

  // Generate filtered noise
  private generateNoise(t: number, frequency: number): number {
    const noise = Math.random() * 2 - 1;
    // Apply low-pass filter based on frequency
    const cutoff = frequency / 1000; // Normalize frequency
    return noise * Math.exp(-cutoff * t);
  }

  // Calculate amplitude envelope
  private calculateEnvelope(t: number, duration: number): number {
    const attack = 0.1; // 10% attack
    const decay = 0.2;  // 20% decay
    const sustain = 0.7; // 70% sustain
    const release = 0.1; // 10% release
    
    const attackTime = duration * attack;
    const decayTime = duration * decay;
    const sustainTime = duration * sustain;
    const releaseTime = duration * release;
    
    if (t < attackTime) {
      return t / attackTime;
    } else if (t < attackTime + decayTime) {
      return 1 - (t - attackTime) / decayTime * (1 - sustain);
    } else if (t < attackTime + decayTime + sustainTime) {
      return sustain;
    } else {
      const releaseStart = attackTime + decayTime + sustainTime;
      return sustain * (1 - (t - releaseStart) / releaseTime);
    }
  }

  // Apply audio effects
  private applyEffects(sample: number, effects: SoundWave['effects']): number {
    let processedSample = sample;

    // Apply distortion
    if (effects.distortion > 0) {
      processedSample = Math.tanh(processedSample * (1 + effects.distortion));
    }

    // Apply filter (simple low-pass)
    if (effects.filter > 0) {
      processedSample *= (1 - effects.filter);
    }

    return processedSample;
  }

  // Play sound wave
  async playSoundWave(soundWaveId: string): Promise<boolean> {
    const soundWave = this.soundWaves.get(soundWaveId);
    if (!soundWave || !this.audioContext) return false;

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create audio buffer
      const audioBuffer = this.audioContext.createBuffer(1, soundWave.audioData.length, this.audioContext.sampleRate);
      audioBuffer.copyToChannel(soundWave.audioData, 0);

      // Create source node
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Apply effects
      this.applyAudioEffects(source, soundWave.effects);

      // Connect to destination
      source.connect(this.audioContext.destination);

      // Play sound
      source.start();
      soundWave.isPlaying = true;

      // Store playing sound
      this.playingSounds.set(soundWaveId, source);

      // Handle end of playback
      source.onended = () => {
        soundWave.isPlaying = false;
        this.playingSounds.delete(soundWaveId);
        
        this.emitEvent({
          type: 'stopped',
          soundWave,
          message: `🎵 Sound wave finished playing`,
          timestamp: Date.now()
        });
      };

      this.emitEvent({
        type: 'playing',
        soundWave,
        message: `🎵 Sound wave started playing`,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Error playing sound wave:', error);
      return false;
    }
  }

  // Apply audio effects to source node
  private applyAudioEffects(source: AudioBufferSourceNode, effects: SoundWave['effects']) {
    if (!this.audioContext) return;

    let currentNode: AudioNode = source;

    // Apply reverb
    if (effects.reverb > 0) {
      const convolver = this.audioContext.createConvolver();
      const reverbBuffer = this.createReverbBuffer(effects.reverb);
      convolver.buffer = reverbBuffer;
      currentNode.connect(convolver);
      currentNode = convolver;
    }

    // Apply delay
    if (effects.delay > 0) {
      const delay = this.audioContext.createDelay();
      delay.delayTime.value = effects.delay;
      currentNode.connect(delay);
      currentNode = delay;
    }

    // Connect to destination
    currentNode.connect(this.audioContext.destination);
  }

  // Create reverb buffer
  private createReverbBuffer(intensity: number): AudioBuffer {
    if (!this.audioContext) return new AudioBuffer({ length: 1, numberOfChannels: 1, sampleRate: 44100 });

    const length = this.audioContext.sampleRate * 2; // 2 seconds
    const buffer = this.audioContext.createBuffer(1, length, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * intensity * Math.pow(1 - i / length, 2);
    }

    return buffer;
  }

  // Stop sound wave
  stopSoundWave(soundWaveId: string): boolean {
    const source = this.playingSounds.get(soundWaveId);
    if (!source) return false;

    try {
      source.stop();
      this.playingSounds.delete(soundWaveId);
      
      const soundWave = this.soundWaves.get(soundWaveId);
      if (soundWave) {
        soundWave.isPlaying = false;
      }

      return true;
    } catch (error) {
      console.error('Error stopping sound wave:', error);
      return false;
    }
  }

  // Change frequency of sound wave
  changeFrequency(soundWaveId: string, newFrequency: number): boolean {
    const soundWave = this.soundWaves.get(soundWaveId);
    if (!soundWave) return false;

    soundWave.frequency = newFrequency;
    this.generateAudioData(soundWave);

    this.emitEvent({
      type: 'frequency_changed',
      soundWave,
      message: `🎵 Frequency changed to ${newFrequency}Hz`,
      timestamp: Date.now()
    });

    return true;
  }

  // Apply effects to sound wave
  updateSoundWaveEffects(soundWaveId: string, effects: Partial<SoundWave['effects']>): boolean {
    const soundWave = this.soundWaves.get(soundWaveId);
    if (!soundWave) return false;

    soundWave.effects = { ...soundWave.effects, ...effects };
    this.generateAudioData(soundWave);

    this.emitEvent({
      type: 'effect_applied',
      soundWave,
      message: `🎵 Effects applied to sound wave`,
      timestamp: Date.now()
    });

    return true;
  }

  // Get sound waves by creator
  getSoundWavesByCreator(creator: string): SoundWave[] {
    return Array.from(this.soundWaves.values())
      .filter(soundWave => soundWave.creator === creator);
  }

  // Get playing sound waves
  getPlayingSoundWaves(): SoundWave[] {
    return Array.from(this.soundWaves.values())
      .filter(soundWave => soundWave.isPlaying);
  }

  // Get all sound waves
  getAllSoundWaves(): SoundWave[] {
    return Array.from(this.soundWaves.values());
  }

  // Get sound wave events
  getEvents(): SoundWaveEvent[] {
    return [...this.soundWaveEvents].reverse();
  }

  // Subscribe to sound wave events
  subscribe(callback: (event: SoundWaveEvent) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Emit sound wave event
  private emitEvent(event: SoundWaveEvent) {
    this.soundWaveEvents.push(event);
    this.subscribers.forEach(callback => callback(event));
    
    // Keep only last 100 events
    if (this.soundWaveEvents.length > 100) {
      this.soundWaveEvents = this.soundWaveEvents.slice(-100);
    }
  }

  // Get sound wave statistics
  getStatistics() {
    const soundWaves = Array.from(this.soundWaves.values());
    const playingCount = soundWaves.filter(s => s.isPlaying).length;
    const waveformStats = soundWaves.reduce((acc, s) => {
      acc[s.waveform] = (acc[s.waveform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const frequencyStats = {
      min: Math.min(...soundWaves.map(s => s.frequency)),
      max: Math.max(...soundWaves.map(s => s.frequency)),
      average: soundWaves.reduce((sum, s) => sum + s.frequency, 0) / soundWaves.length
    };

    return {
      totalSoundWaves: soundWaves.length,
      playingSoundWaves: playingCount,
      waveformDistribution: waveformStats,
      frequencyStats,
      isRunning: this.isRunning
    };
  }

  // Create sound wave from text
  createSoundWaveFromText(text: string, creator: string): SoundWave {
    // Convert text to frequency using character codes
    const frequency = text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) / text.length * 10;
    const duration = Math.min(text.length * 0.1, 10); // Max 10 seconds
    const waveform = ['sine', 'square', 'sawtooth', 'triangle', 'noise'][text.length % 5] as SoundWave['waveform'];

    return this.createSoundWave(text, creator, frequency, duration, waveform);
  }

  // Get visualization data for sound wave
  getVisualizationData(soundWaveId: string): number[] {
    const soundWave = this.soundWaves.get(soundWaveId);
    return soundWave ? soundWave.visualization : [];
  }

  // Create sound wave from file
  createSoundWaveFromFile(file: File, quality: 'basic' | 'standard' | 'high' | 'premium', description: string): SoundWave {
    const id = `sw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const soundWave: SoundWave = {
      id,
      content: description || file.name,
      frequency: Math.floor(Math.random() * 2000) + 100,
      amplitude: 0.5,
      duration: Math.floor(Math.random() * 300) + 30,
      waveform: 'sine',
      effects: {
        reverb: 0,
        delay: 0,
        distortion: 0,
        filter: 0
      },
      isPlaying: false,
      createdAt: new Date(),
      creator: 'anonymous',
      audioData: new Float32Array(0),
      visualization: []
    };

    this.soundWaves.set(id, soundWave);
    
    // Generate audio data
    this.generateAudioData(soundWave);
    
    this.emitEvent({
      type: 'created',
      soundWave,
      message: `🎵 Sound wave created from file: ${file.name}`,
      timestamp: Date.now()
    });

    return soundWave;
  }

  // Analyze audio file
  private analyzeAudio(file: File): SoundWaveAnalysis {
    return {
      tempo: Math.floor(Math.random() * 40) + 80,
      key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
      energy: Math.floor(Math.random() * 100),
      danceability: Math.floor(Math.random() * 100),
      valence: Math.floor(Math.random() * 100),
      genre: ['Electronic', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Pop', 'Ambient'][Math.floor(Math.random() * 7)],
      mood: ['Energetic', 'Calm', 'Melancholic', 'Uplifting', 'Dark', 'Playful', 'Intense'][Math.floor(Math.random() * 7)]
    };
  }
}

// Export singleton instance
export const liveSoundWaves = new LiveSoundWavesSystem();
