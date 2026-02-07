class InputHandler {
    constructor() {
        this.keys = {
            buy: false,      // D
            sell: false,     // A
            close: false,    // S or Space
            leverage: false, // Space
            bet: false,      // Tab or Click
            item1: false,    // 1 (Slow)
            item2: false,    // 2 (View)
            action: false    // Click/Touch
        };

        this.initListeners();
    }

    initListeners() {
        // PC Keyboard
        window.addEventListener('keydown', (e) => this.handleKey(e, true));
        window.addEventListener('keyup', (e) => this.handleKey(e, false));

        // Mobile Touch / Mouse Click (Global Action)
        window.addEventListener('touchstart', () => { this.keys.action = true; });
        window.addEventListener('touchend', () => { this.keys.action = false; });
        window.addEventListener('mousedown', () => { this.keys.action = true; });
        window.addEventListener('mouseup', () => { this.keys.action = false; });
        
        // UI Buttons
        this.bindButton('btn-bet', 'bet');
        this.bindButton('btn-buy', 'buy');
        this.bindButton('btn-sell', 'sell');
        this.bindButton('btn-close', 'close');
        this.bindButton('btn-item-slow', 'item1');
        this.bindButton('btn-item-view', 'item2');
    }

    handleKey(e, isDown) {
        switch(e.code) {
            case 'KeyA': this.keys.sell = isDown; break;
            case 'KeyD': this.keys.buy = isDown; break;
            case 'KeyS': case 'Space': this.keys.close = isDown; break;
            case 'Tab': this.keys.bet = isDown; if(isDown) e.preventDefault(); break;
            case 'Digit1': this.keys.item1 = isDown; break;
            case 'Digit2': this.keys.item2 = isDown; break;
        }
    }
    
    bindButton(id, key) {
        const el = document.getElementById(id);
        if(!el) return;
        const setKey = (val) => { this.keys[key] = val; };
        el.addEventListener('touchstart', (e) => { e.preventDefault(); setKey(true); });
        el.addEventListener('touchend', (e) => { e.preventDefault(); setKey(false); });
        el.addEventListener('mousedown', (e) => { e.stopPropagation(); setKey(true); });
        el.addEventListener('mouseup', (e) => { e.stopPropagation(); setKey(false); });
        el.addEventListener('mouseleave', (e) => { setKey(false); });
    }
}