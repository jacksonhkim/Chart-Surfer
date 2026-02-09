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
            action: false,   // Click/Touch
            scroll: 0,       // Scroll Delta
            x: 0,            // Pointer X
            y: 0             // Pointer Y
        };

        this.initListeners();
    }

    initListeners() {
        // PC Keyboard
        window.addEventListener('keydown', (e) => this.handleKey(e, true));
        window.addEventListener('keyup', (e) => this.handleKey(e, false));

        // Mouse Wheel
        window.addEventListener('wheel', (e) => { this.keys.scroll += e.deltaY; });

        const updatePos = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            this.keys.x = clientX;
            this.keys.y = clientY;
        };

        let lastTouchY = 0;
        // Mobile Touch / Mouse Click (Global Action)
        window.addEventListener('touchstart', (e) => { 
            this.keys.action = true; 
            updatePos(e); 
            lastTouchY = e.touches[0].clientY;
        });
        window.addEventListener('touchend', () => { this.keys.action = false; });
        window.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            this.keys.scroll += (lastTouchY - currentY); // Drag up = Scroll down
            lastTouchY = currentY;
            updatePos(e);
        });

        window.addEventListener('mousedown', (e) => { this.keys.action = true; updatePos(e); });
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
        
        // 애니메이션 재생 함수
        const playAnim = () => {
            el.classList.remove('btn-clicked');
            void el.offsetWidth; // 리플로우 강제 (애니메이션 리셋)
            el.classList.add('btn-clicked');
        };

        el.addEventListener('touchstart', (e) => { e.preventDefault(); setKey(true); playAnim(); });
        el.addEventListener('touchend', (e) => { e.preventDefault(); setKey(false); });
        el.addEventListener('mousedown', (e) => { e.stopPropagation(); setKey(true); playAnim(); });
        el.addEventListener('mouseup', (e) => { e.stopPropagation(); setKey(false); });
        el.addEventListener('mouseleave', (e) => { setKey(false); });
    }
}