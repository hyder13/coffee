// Web Audio API Context
let audioCtx: AudioContext | null = null;

// Audio Nodes for Sample-based Playback
let pourSource: AudioBufferSourceNode | null = null;
let pourGain: GainNode | null = null;
let pourBuffer: AudioBuffer | null = null; // Store the decoded audio data

// Audio Nodes for Synthesis Fallback
let synthSource: AudioBufferSourceNode | null = null;
let synthFilter: BiquadFilterNode | null = null;
let synthGain: GainNode | null = null;
let synthLfo: OscillatorNode | null = null;
let synthLfoGain: GainNode | null = null;

let bgmAudio: HTMLAudioElement | null = null;
let isMuted = false;

// Using Google Actions Sounds for better reliability
const BGM_URL = 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg'; 
// Real water pouring sample
const POUR_SAMPLE_URL = 'https://actions.google.com/sounds/v1/water/liquid_pouring.ogg';

export const SoundManager = {
  init: () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Initialize BGM
    if (!bgmAudio) {
      bgmAudio = new Audio(BGM_URL);
      bgmAudio.loop = true;
      bgmAudio.volume = 0.2; // Lower volume for ambience
    }

    // Preload Pouring Sound
    if (!pourBuffer) {
        fetch(POUR_SAMPLE_URL)
            .then(response => {
                if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
                return response.arrayBuffer();
            })
            .then(arrayBuffer => audioCtx!.decodeAudioData(arrayBuffer))
            .then(decodedAudio => {
                console.log('Pour sound loaded successfully');
                pourBuffer = decodedAudio;
            })
            .catch(e => console.error("Error loading pour sound, will use synthesis fallback:", e));
    }
  },

  toggleMute: () => {
    isMuted = !isMuted;
    if (bgmAudio) {
      bgmAudio.muted = isMuted;
    }
    if (audioCtx && isMuted) {
      audioCtx.suspend();
    } else if (audioCtx && !isMuted) {
      audioCtx.resume();
    }
    return isMuted;
  },

  playBGM: () => {
    if (bgmAudio && !isMuted) {
      bgmAudio.play().catch(e => console.log('Audio autoplay blocked', e));
    }
  },

  stopBGM: () => {
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
    }
  },

  startPouring: (drinkType: 'SODA' | 'COFFEE' = 'SODA') => {
    if (!audioCtx || isMuted) return;
    
    // Resume context if needed (common browser policy fix)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // FALLBACK: If external sample isn't loaded yet, use synthesis
    if (!pourBuffer) {
        SoundManager.startSyntheticPouring();
        return;
    }

    // --- Sample Based Playback ---
    try {
        pourSource = audioCtx.createBufferSource();
        pourSource.buffer = pourBuffer;
        pourSource.loop = true; 

        // Adjust pitch
        pourSource.playbackRate.value = drinkType === 'SODA' ? 1.0 : 0.85;

        // Gain
        pourGain = audioCtx.createGain();
        pourGain.gain.setValueAtTime(0, audioCtx.currentTime);
        pourGain.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 0.1); 

        pourSource.connect(pourGain);
        pourGain.connect(audioCtx.destination);
        pourSource.start();
    } catch (e) {
        console.error("Error playing sample:", e);
        // Fallback if playback fails
        SoundManager.startSyntheticPouring(); 
    }
  },

  startSyntheticPouring: () => {
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

    // 2. Dynamic Filtering (UPDATED for better mobile audibility)
    synthFilter = audioCtx.createBiquadFilter();
    synthFilter.type = 'lowpass';
    // Increased frequency to 1200Hz so it's brighter and easier to hear on phones
    synthFilter.frequency.value = 1200; 
    synthFilter.Q.value = 3; 

    // 3. LFO to modulate filter
    synthLfo = audioCtx.createOscillator();
    synthLfo.type = 'sine';
    synthLfo.frequency.value = 12; 
    
    synthLfoGain = audioCtx.createGain();
    synthLfoGain.gain.value = 400; 

    synthLfo.connect(synthLfoGain);
    synthLfoGain.connect(synthFilter.frequency);

    // 4. Output Gain (UPDATED: louder)
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

    // Stop Sample
    if (pourGain && pourSource) {
        pourGain.gain.cancelScheduledValues(now);
        pourGain.gain.setValueAtTime(pourGain.gain.value, now);
        pourGain.gain.linearRampToValueAtTime(0, stopTime);
        pourSource.stop(stopTime);
        const oldSource = pourSource;
        setTimeout(() => { if(oldSource) oldSource.disconnect(); }, 200);
        pourSource = null;
        pourGain = null;
    }

    // Stop Synthesis
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