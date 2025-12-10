// Web Audio API Context
let audioCtx: AudioContext | null = null;

// Audio Nodes for Synthesis
let synthSource: AudioBufferSourceNode | null = null;
let synthFilter: BiquadFilterNode | null = null;
let synthGain: GainNode | null = null;
let synthLfo: OscillatorNode | null = null;
let synthLfoGain: GainNode | null = null;

// Audio Nodes for Sample (MP3)
let pourBuffer: AudioBuffer | null = null;
let sampleSource: AudioBufferSourceNode | null = null;
let sampleGain: GainNode | null = null;

// URL for the custom MP3 sound
// We use a specific pouring sound URL. If this fails to load (CORS/Network), it falls back to synthesis.
const CUSTOM_POUR_URL = 'https://assets.mixkit.co/active_storage/sfx/1192/1192-preview.mp3';

// internal mute state (default unmuted)
let isMuted = false;

export const SoundManager = {
  init: () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Attempt to load the custom sound
    // This runs asynchronously. Until it loads, the game uses synthesis.
    if (audioCtx && !pourBuffer) {
        fetch(CUSTOM_POUR_URL)
            .then(response => {
                if (!response.ok) throw new Error("Network response was not ok");
                return response.arrayBuffer();
            })
            .then(arrayBuffer => audioCtx!.decodeAudioData(arrayBuffer))
            .then(decodedAudio => {
                pourBuffer = decodedAudio;
                console.log("Custom pour sound loaded successfully!");
            })
            .catch(error => {
                console.warn("Could not load custom sound, falling back to synthesis:", error);
                // We just don't set pourBuffer, so startPouring will use synthesis
            });
    }
  },

  // Kept for compatibility if App calls it, though UI button is removed
  toggleMute: () => {
    isMuted = !isMuted;
    if (audioCtx && isMuted) {
      audioCtx.suspend();
    } else if (audioCtx && !isMuted) {
      audioCtx.resume();
    }
    return isMuted;
  },

  playBGM: () => {
    // Removed external BGM to ensure offline functionality and prevent network errors.
  },

  stopBGM: () => {
    // No-op since BGM is removed
  },

  startPouring: (drinkType: 'SODA' | 'COFFEE' = 'SODA') => {
    if (!audioCtx || isMuted) return;
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Prioritize MP3 if loaded, otherwise use synthesis
    if (pourBuffer) {
        SoundManager.startSamplePouring();
    } else {
        SoundManager.startSyntheticPouring(drinkType);
    }
  },

  startSamplePouring: () => {
      if (!audioCtx || !pourBuffer) return;
      
      // Stop previous if exists
      if (sampleSource) {
          try { sampleSource.stop(); } catch(e) {}
      }

      sampleSource = audioCtx.createBufferSource();
      sampleSource.buffer = pourBuffer;
      sampleSource.loop = true;
      
      sampleGain = audioCtx.createGain();
      sampleGain.gain.setValueAtTime(0, audioCtx.currentTime);
      // Fast attack for responsiveness
      sampleGain.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 0.1);
      
      sampleSource.connect(sampleGain);
      sampleGain.connect(audioCtx.destination);
      
      sampleSource.start(0);
  },

  startSyntheticPouring: (drinkType: 'SODA' | 'COFFEE') => {
    if (!audioCtx) return;

    // 1. Generate Brown Noise (Smoother than white noise)
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; 
    }

    synthSource = audioCtx.createBufferSource();
    synthSource.buffer = buffer;
    synthSource.loop = true;

    // 2. Dynamic Filtering
    synthFilter = audioCtx.createBiquadFilter();
    synthFilter.type = 'lowpass';
    // Frequency tuned for liquid sound
    // Soda is fizzier (higher freq), Coffee is thicker (lower freq)
    synthFilter.frequency.value = drinkType === 'SODA' ? 1200 : 800; 
    synthFilter.Q.value = 3; 

    // 3. LFO to modulate filter (adds the "glug" texture)
    synthLfo = audioCtx.createOscillator();
    synthLfo.type = 'sine';
    synthLfo.frequency.value = 12; 
    
    synthLfoGain = audioCtx.createGain();
    synthLfoGain.gain.value = 400; 

    synthLfo.connect(synthLfoGain);
    synthLfoGain.connect(synthFilter.frequency);

    // 4. Output Gain
    synthGain = audioCtx.createGain();
    synthGain.gain.setValueAtTime(0, audioCtx.currentTime);
    synthGain.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.1);

    // Connect Graph
    synthSource.connect(synthFilter);
    synthFilter.connect(synthGain);
    synthGain.connect(audioCtx.destination);

    synthSource.start();
    synthLfo.start();
  },

  stopPouring: () => {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const stopTime = now + 0.15;

    // Stop Sample if playing
    if (sampleSource && sampleGain) {
        sampleGain.gain.cancelScheduledValues(now);
        sampleGain.gain.setValueAtTime(sampleGain.gain.value, now);
        sampleGain.gain.linearRampToValueAtTime(0, stopTime);
        sampleSource.stop(stopTime);
        
        // Cleanup sample nodes
        const oldSource = sampleSource;
        const oldGain = sampleGain;
        sampleSource = null;
        sampleGain = null;
        
        setTimeout(() => {
            // Disconnect if needed, though GC handles it usually
        }, 200);
    }

    // Stop Synthesis if playing
    if (synthGain && synthSource) {
        synthGain.gain.cancelScheduledValues(now);
        synthGain.gain.setValueAtTime(synthGain.gain.value, now);
        synthGain.gain.linearRampToValueAtTime(0, stopTime);
        
        synthSource.stop(stopTime);
        if (synthLfo) synthLfo.stop(stopTime);

        // Cleanup references
        setTimeout(() => {
            synthSource = null;
            synthFilter = null;
            synthGain = null;
            synthLfo = null;
            synthLfoGain = null;
        }, 200);
    }
  },
  
  playPop: () => {
      if(!audioCtx || isMuted) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
  },
  
  playWin: () => {
      if(!audioCtx || isMuted) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine'; 
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          gain.gain.setValueAtTime(0, now + i * 0.1);
          gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
          
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.5);
      });
  }
};