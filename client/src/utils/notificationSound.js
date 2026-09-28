/**
 * High-volume notification sound synthesizer using Web Audio API.
 * Synthesizes a loud, crisp, pleasant multi-tone chime that plays reliably
 * without external audio asset downloads.
 */
let sharedAudioCtx = null;
let pendingChime = false;

// Unlock audio on first user gesture if browser blocked initial autoplay
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().then(() => {
        if (pendingChime) {
          pendingChime = false;
          playNotificationSound();
        }
      }).catch(() => {});
    }
  };
  window.addEventListener('pointerdown', unlockAudio, { once: false, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: false, passive: true });
}

export const isNotificationSoundMuted = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('oxonom_notification_muted') === 'true';
};

export const setNotificationSoundMuted = (muted) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('oxonom_notification_muted', muted ? 'true' : 'false');
  }
};

export const playNotificationSound = (force = false) => {
  try {
    if (!force && isNotificationSoundMuted()) {
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }

    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {
        pendingChime = true;
      });
    }

    const ctx = sharedAudioCtx;
    const now = ctx.currentTime;

    // Master volume set to 1.0 (maximum loud and clear)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.0, now);
    masterGain.connect(ctx.destination);

    // Chime notes: G5 (783.99 Hz), B5 (987.77 Hz), D6 (1174.66 Hz), G6 (1567.98 Hz)
    const notes = [
      { freq: 783.99, start: 0.00, dur: 0.35, vol: 0.8 },
      { freq: 987.77, start: 0.08, dur: 0.38, vol: 0.85 },
      { freq: 1174.66, start: 0.16, dur: 0.42, vol: 0.9 },
      { freq: 1567.98, start: 0.24, dur: 0.65, vol: 1.0 }
    ];

    notes.forEach(({ freq, start, dur, vol }) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const noteGain = ctx.createGain();

      // Fundamental sine wave
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now + start);

      // Warm triangle harmonic for loudness and presence
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, now + start);

      const noteStart = now + start;
      const noteEnd = noteStart + dur;

      // Fast punchy attack, sustained bell ring, smooth exponential release
      noteGain.gain.setValueAtTime(0.0001, noteStart);
      noteGain.gain.linearRampToValueAtTime(vol, noteStart + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      noteGain.connect(masterGain);

      osc1.start(noteStart);
      osc2.start(noteStart);

      osc1.stop(noteEnd + 0.05);
      osc2.stop(noteEnd + 0.05);
    });
  } catch (err) {
    console.warn('Notification audio playback error:', err);
  }
};
