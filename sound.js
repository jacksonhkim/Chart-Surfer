class SoundManager {
    constructor() {
        this.ctx = null;
        this.isBgmPlaying = false;
        this.bgmTimer = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, startTime = 0, vol = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    playBet() { this.playTone(800, 'square', 0.05, 0, 0.05); }
    
    playBuy() { 
        this.playTone(400, 'triangle', 0.1);
        this.playTone(600, 'triangle', 0.2, 0.1);
    }
    
    playSell() { 
        this.playTone(600, 'triangle', 0.1);
        this.playTone(400, 'triangle', 0.2, 0.1);
    }
    
    playClose(isProfit) {
        if (isProfit) {
            this.playTone(880, 'sine', 0.1);
            this.playTone(1108, 'sine', 0.1, 0.1); // C#6
            this.playTone(1318, 'sine', 0.3, 0.2); // E6
        } else {
            this.playTone(150, 'sawtooth', 0.3, 0, 0.1);
        }
    }

    playNews(isGood) {
        if (isGood) {
            // 호재: 밝은 상승음
            this.playTone(523, 'sine', 0.1, 0);   // C5
            this.playTone(659, 'sine', 0.1, 0.1); // E5
            this.playTone(784, 'sine', 0.1, 0.2); // G5
            this.playTone(1046, 'sine', 0.4, 0.3); // C6
        } else {
            // 악재: 급박한 경고음
            this.playTone(800, 'sawtooth', 0.1, 0, 0.1);
            this.playTone(600, 'sawtooth', 0.4, 0.1, 0.1);
        }
    }

    playWarning() {
        if (!this.ctx) return;
        this.playTone(880, 'square', 0.1, 0, 0.05);
        this.playTone(587, 'square', 0.1, 0.1, 0.05);
    }

    startBGM() {
        if (!this.ctx) return;
        this.stopBGM();
        this.isBgmPlaying = true;
        
        const tempo = 120;
        const stepTime = 60 / tempo / 4; // 16th notes
        let nextNoteTime = this.ctx.currentTime;
        let step = 0;

        // Cyberpunk Bass Sequence
        const sequence = [
            55, 0, 55, 0, 65.41, 0, 55, 0,
            73.42, 0, 55, 0, 82.41, 0, 49, 0
        ];

        const scheduler = () => {
            if (!this.isBgmPlaying) return;

            while (nextNoteTime < this.ctx.currentTime + 0.1) {
                const freq = sequence[step % sequence.length];
                
                if (freq > 0) {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    const filter = this.ctx.createBiquadFilter();
                    
                    osc.type = 'sawtooth';
                    osc.frequency.value = freq;
                    filter.type = 'lowpass';
                    filter.Q.value = 5;
                    
                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(this.ctx.destination);
                    
                    const t = nextNoteTime;
                    osc.start(t);
                    osc.stop(t + 0.2);
                    
                    gain.gain.setValueAtTime(0.15, t);
                    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                    
                    filter.frequency.setValueAtTime(200, t);
                    filter.frequency.exponentialRampToValueAtTime(800, t + 0.05);
                    filter.frequency.exponentialRampToValueAtTime(200, t + 0.15);
                }
                nextNoteTime += stepTime;
                step++;
            }
            this.bgmTimer = requestAnimationFrame(scheduler);
        };
        scheduler();
    }

    stopBGM() {
        this.isBgmPlaying = false;
        if (this.bgmTimer) {
            cancelAnimationFrame(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}