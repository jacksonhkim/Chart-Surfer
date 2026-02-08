class ChartManager {
    constructor() {
        this.candles = []; // { open, high, low, close }
        this.maxCandles = 50; // 캔들 개수
        this.price = 10000;   // 시작가
        
        this.velocity = 0;    // 방향성
        this.volatility = 0;  // 변동성
        this.patternTimer = 0;
        this.news = null;     // 뉴스 이벤트
        this.stage = 1;       // 스테이지 난이도
        
        this.tickTimer = 0;
        this.tickInterval = 2;
        
        this.globalTickCount = 0; // 캔들 고유 번호 카운터
        // 시간 관리 (09:00 시작)
        this.currentTime = new Date();
        this.currentTime.setHours(9, 0, 0, 0);

        // 초기 데이터
        for(let i=0; i<this.maxCandles; i++) {
            this.candles.push({ 
                open: this.price, 
                close: this.price, 
                high: this.price, 
                low: this.price,
                time: this.formatTime(this.currentTime),
                tick: this.globalTickCount++
            });
            this.addTime();
        }
    }

    addTime() {
        this.currentTime.setMinutes(this.currentTime.getMinutes() + 10); // 10분 단위 증가
    }

    setStage(stage) {
        this.stage = stage;
    }

    formatTime(date) {
        const h = date.getHours().toString().padStart(2, '0');
        const m = date.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    }

    setSlow(isSlow) {
        this.tickInterval = isSlow ? 10 : 2; // 5배 느리게 (기본 2 -> 10)
    }

    getTrend() {
        // 현재 속도(velocity)를 기반으로 추세 반환 (1: 상승, -1: 하락, 0: 횡보)
        if (this.velocity > 1.0) return 1;
        if (this.velocity < -1.0) return -1;
        return 0;
    }

    update() {
        this.tickTimer++;
        if (this.tickTimer < this.tickInterval) return;
        this.tickTimer = 0;

        if (this.news) {
            // 초대형 악재(Crash) 로직 처리
            if (this.news.type === 'crash') {
                if (this.news.isCrashActionPending) {
                    // 한 캔들에 45% ~ 60% 폭락
                    const crashAmount = this.price * (0.45 + Math.random() * 0.15);
                    this.velocity = -crashAmount;
                    this.news.isCrashActionPending = false; // 1회성 동작 후 해제
                } else {
                    this.velocity = 0; // 폭락 후에는 잠시 멈춤 (패닉 상태)
                }
            }
            this.news.timer--;
            if (this.news.timer <= 0) {
                this.news = null;
                this.setPattern();
            }
        } else {
            if (this.patternTimer <= 0) {
                this.setPattern();
            }
            this.patternTimer--;
        }

        const open = this.price;
        const noise = (Math.random() - 0.5) * this.volatility;
        const change = this.velocity + noise;
        this.price += change;
        if (this.price < 10) this.price = 10; // 주가가 0 이하로 가는 것 방지
        const close = this.price;
        
        const high = Math.max(open, close) + Math.random() * (this.volatility * 0.5);
        const low = Math.min(open, close) - Math.random() * (this.volatility * 0.5);

        this.candles.push({ 
            open, 
            close, 
            high, 
            low,
            time: this.formatTime(this.currentTime),
            tick: this.globalTickCount++
        });
        this.addTime();
        if(this.candles.length > this.maxCandles) this.candles.shift();
    }

    setPattern() {
        const types = ['flat', 'bull', 'bear', 'volatile', 'fear', 'greed', 'rebound'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.patternTimer = 120 + Math.random() * 120; 

        const mult = 1 + (this.stage - 1) * 0.1;

        switch(type) {
            case 'flat':
                this.velocity = 0; this.volatility = 5 * mult; break;
            case 'bull':
                this.velocity = 3.5; this.volatility = 10 * mult; break;
            case 'bear':
                this.velocity = -3.5; this.volatility = 10 * mult; break;
            case 'volatile':
                this.velocity = 0; this.volatility = 30 * mult; break;
            case 'fear':
                this.velocity = -5.0; this.volatility = 25 * mult; break;
            case 'greed':
                this.velocity = 5.0; this.volatility = 15 * mult; break;
            case 'rebound':
                this.velocity = 2.0; this.volatility = 20 * mult; break;
        }
    }

    triggerNews(type) {
        const isGood = type === 'good';
        const isCrash = type === 'crash';
        
        const bullTexts = [
            "속보: 초대형 호재! 급등! 🚀",
            "속보: 신기술 개발 성공! 💎",
            "속보: 기관 대량 매수 포착! 🐳",
            "속보: 시장 전망 상향 조정! 📈"
        ];
        
        const bearTexts = [
            "속보: 악재 발생! 폭락! 📉",
            "속보: 대규모 해킹 피해! ☠️",
            "속보: 규제 강화 발표! 🏛️",
            "속보: 주요 주주 대량 매도! 💸"
        ];
        
        const crashTexts = [
            "속보: 블랙 스완! 시장 붕괴! 📉",
            "속보: 거래소 파산! 뱅크런! 🏦",
            "속보: 대공황 시작! 탈출하라! 😱"
        ];
        
        let text;
        if (isCrash) {
            text = crashTexts[Math.floor(Math.random() * crashTexts.length)];
        } else {
            const textList = isGood ? bullTexts : bearTexts;
            text = textList[Math.floor(Math.random() * textList.length)];
        }

        this.news = {
            type: isGood ? 'bull' : (isCrash ? 'crash' : 'bear'),
            text: text,
            timer: 50,
            isCrashActionPending: isCrash // 폭락 대기 플래그
        };
        const mult = 1 + (this.stage - 1) * 0.1;
        
        if (isCrash) {
            this.velocity = 0; // update()에서 처리
            this.volatility = 50 * mult; // 폭락 후 높은 변동성
        } else {
            this.velocity = isGood ? 6.0 : -6.0;
            this.volatility = 20 * mult;
        }
    }

    // 차트 데이터만 제공하고 그리기는 UI에서 담당하도록 분리할 수도 있지만,
    // 현재 구조상 ChartManager가 그리기 로직을 가지고 있는 것이 캡슐화에 유리합니다.
    // 다만, UI.js로 옮기는 것이 더 순수한 MVC 패턴에 가깝습니다.
    // 여기서는 기존 로직 유지를 위해 데이터를 반환하는 getter를 추가합니다.
    
    getChartData() {
        return { candles: this.candles, maxCandles: this.maxCandles };
    }

    reset() {
        this.candles = [];
        this.price = 10000;
        this.velocity = 0;
        this.volatility = 0;
        this.patternTimer = 0;
        this.news = null;
        this.stage = 1;
        this.tickTimer = 0;
        this.globalTickCount = 0;
        this.currentTime = new Date();
        this.currentTime.setHours(9, 0, 0, 0);

        for(let i=0; i<this.maxCandles; i++) {
            this.candles.push({ 
                open: this.price, 
                close: this.price, 
                high: this.price, 
                low: this.price,
                time: this.formatTime(this.currentTime),
                tick: this.globalTickCount++
            });
            this.addTime();
        }
    }
}