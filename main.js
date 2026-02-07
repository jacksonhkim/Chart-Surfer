class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.input = new InputHandler();
        this.chart = new ChartManager(); // 차트 매니저 생성
        this.sound = new SoundManager(); // 사운드 매니저 생성
        this.player = new Player(1000000, 1500000); // 플레이어 생성
        this.ui = new UIManager(this.canvas); // UI 매니저 생성
        
        // High Score 로드
        this.highScore = parseInt(localStorage.getItem('arcadeTraderHighScore')) || 0;

        this.currentState = STATE.TITLE;
        this.lastTime = 0;
        
        this.stage = 1;         // 현재 스테이지
        this.stageTime = 90000; // 스테이지 제한 시간 90초
        this.betButtonDebounce = false; // 버튼 중복 입력 방지
        this.combo = 0;         // 콤보 시스템
        this.comboTimer = 0;    // 콤보 유지 시간
        this.maxComboTime = 0;  // 게이지 표시용 최대 시간
        this.timer = 0;
        this.warningSoundTimer = 0;
        this.inputCooldown = 0; // 화면 전환 시 입력 방지 타이머
        
        // 아이템 시스템
        this.items = {
            slow: { count: 3, timer: 0 },
            view: { count: 3, timer: 0 }
        };

        // 화면 리사이징 대응
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 게임 루프 시작
        requestAnimationFrame((ts) => this.loop(ts));
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // --- Game Loop ---
    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((ts) => this.loop(ts));
    }

    update(deltaTime) {
        // 입력 쿨다운 감소
        if (this.inputCooldown > 0) {
            this.inputCooldown -= deltaTime;
        }

        switch (this.currentState) {
            case STATE.TITLE:
                this.chart.update();
                if (this.input.keys.action || this.input.keys.buy || this.input.keys.sell) {
                    this.startGame();
                }
                break;
            case STATE.TUTORIAL:
                this.chart.update();
                // 쿨다운이 끝난 후에만 입력 허용 (스킵 방지)
                if (this.inputCooldown <= 0 && (this.input.keys.action || this.input.keys.buy || this.input.keys.sell)) {
                    this.enterGame();
                }
                break;
            case STATE.PLAYING:
                this.updateGameLogic(deltaTime);
                break;
            case STATE.RESULT:
                if (this.input.keys.action) {
                    this.resetGame();
                }
                break;
            case STATE.MISSION_COMPLETE:
                if (this.input.keys.action) {
                    this.nextStage();
                }
                break;
        }
    }

    draw() {
        // 화면 흔들림 효과 (Shake Effect)
        const isCrash = this.chart.news && this.chart.news.type === 'crash';
        if (isCrash) {
            this.ui.ctx.save();
            const intensity = 10; // 흔들림 강도
            const dx = (Math.random() - 0.5) * intensity;
            const dy = (Math.random() - 0.5) * intensity;
            this.ui.ctx.translate(dx, dy);
        }

        this.ui.clear(this.combo, this.chart);

        switch (this.currentState) {
            case STATE.TITLE:
                this.ui.drawChart(this.chart);
                // 타이틀 화면 어둡게 처리
                const ctx = this.canvas.getContext('2d');
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                // 흔들림 고려하여 크게 그림
                ctx.fillRect(-50, -50, this.canvas.width + 100, this.canvas.height + 100);
                break;
            case STATE.TUTORIAL:
                this.ui.drawChart(this.chart);
                const tCtx = this.canvas.getContext('2d');
                tCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                // 배경을 더 어둡게 처리
                tCtx.fillRect(-50, -50, this.canvas.width + 100, this.canvas.height + 100);
                break;
            case STATE.PLAYING:
                this.ui.drawChart(this.chart);
                this.ui.drawHUD(this);
                break;
            case STATE.RESULT:
                this.drawResult();
                break;
            case STATE.MISSION_COMPLETE:
                this.drawMissionComplete();
                break;
        }

        if (isCrash) {
            this.ui.ctx.restore();
        }
    }

    // --- Logic Methods ---

    startGame() {
        // 튜토리얼 확인 (최초 1회)
        if (!localStorage.getItem('chartSurferTutorial')) {
            this.currentState = STATE.TUTORIAL;
            document.getElementById('title-screen').classList.add('hidden');
            document.getElementById('tutorial-screen').classList.remove('hidden');
            this.sound.init(); 
            this.inputCooldown = 1000; // 튜토리얼 진입 시 1초간 입력 무시
            return;
        }
        this.enterGame();
    }

    enterGame() {
        localStorage.setItem('chartSurferTutorial', 'true'); // 튜토리얼 확인 처리
        this.currentState = STATE.PLAYING;
        document.getElementById('title-screen').classList.add('hidden');
        document.getElementById('tutorial-screen').classList.add('hidden');
        document.getElementById('mobile-controls').classList.remove('hidden'); // 버튼 표시
        this.ui.updateBetButton(this.player); // 버튼 초기화
        
        this.sound.init();     // 오디오 컨텍스트 시작 (사용자 제스처 필요)
        this.sound.startBGM(); // BGM 시작
        
        this.stage = 1;
        this.chart.setStage(this.stage);
        this.player.balance = 1000000;
        this.player.target = 1500000;
        this.stageTime = 90000;
        this.combo = 0;
        this.comboTimer = 0;
        this.items.slow = { count: 3, timer: 0 };
        this.items.view = { count: 3, timer: 0 };
        
        this.warningSoundTimer = 0;
        this.timer = this.stageTime; // 타이머 초기화 (카운트다운)
        console.log("Game Started");
    }

    resetGame() {
        this.currentState = STATE.TITLE;
        document.getElementById('title-screen').classList.remove('hidden');
        document.getElementById('mobile-controls').classList.add('hidden'); // 버튼 숨김
        this.sound.stopBGM(); // BGM 정지
    }

    completeMission() {
        this.currentState = STATE.MISSION_COMPLETE;
        // 포지션 강제 청산하여 수익 실현
        if (this.player.position !== 0) {
            this.closePosition(this.chart.price);
        }
    }

    nextStage() {
        this.stage++;
        this.chart.setStage(this.stage);
        this.player.target = Math.floor(this.player.target * 1.5); // 목표 금액 1.5배 증가
        this.stageTime = Math.max(30000, this.stageTime - 5000);
        this.timer = this.stageTime;
        this.currentState = STATE.PLAYING;
    }

    gameOver() {
        this.currentState = STATE.RESULT;
        
        // 최종 자산 계산 (평가 손익 포함)
        const totalAsset = this.player.balance + this.player.invested + this.player.profit;
        
        // 최고 점수 갱신
        if (totalAsset > this.highScore) {
            this.highScore = totalAsset;
            localStorage.setItem('arcadeTraderHighScore', Math.floor(this.highScore));
        }
    }

    updateGameLogic(deltaTime) {
        // 타임 어택: 시간 감소
        this.timer -= deltaTime;

        // 콤보 타이머 감소 (콤보 유지 시간)
        if (this.combo > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.combo = 0; // 시간 초과로 콤보 초기화
                this.comboTimer = 0;
            }
        }
        
        // 10초 이하 경고음 (1초 간격)
        if (this.timer <= 10000 && this.timer > 0) {
            this.warningSoundTimer -= deltaTime;
            if (this.warningSoundTimer <= 0) {
                this.sound.playWarning();
                this.warningSoundTimer = 1000;
            }
        }

        if (this.timer <= 0) {
            this.timer = 0;
            this.gameOver(); // 시간 초과 시 게임 오버 처리
        }
        
        // 차트 업데이트 (매 프레임)
        this.chart.update();

        // 랜덤 뉴스 이벤트 발생 (약 0.2% 확률/프레임 -> 평균 8초마다)
        if (!this.chart.news && Math.random() < 0.002) {
            const rand = Math.random();
            let type;
            if (rand < 0.05) type = 'crash'; // 5% 확률로 초대형 악재
            else if (rand < 0.525) type = 'good';
            else type = 'bad';

            this.chart.triggerNews(type);
            this.sound.playNews(type === 'good');
        }
        
        // 아이템 로직
        // 1. SLOW
        if (this.input.keys.item1 && this.items.slow.count > 0 && this.items.slow.timer <= 0) {
            this.items.slow.count--;
            this.items.slow.timer = 5000; // 5초 지속
            this.input.keys.item1 = false; // 중복 방지
        }
        if (this.items.slow.timer > 0) {
            this.items.slow.timer -= deltaTime;
            this.chart.setSlow(true);
        } else {
            this.chart.setSlow(false);
        }

        // 2. VIEW (Predict)
        if (this.input.keys.item2 && this.items.view.count > 0 && this.items.view.timer <= 0) {
            this.items.view.count--;
            this.items.view.timer = 5000; // 5초 지속
            this.input.keys.item2 = false;
        }
        if (this.items.view.timer > 0) {
            this.items.view.timer -= deltaTime;
        }

        // 3. 매매 로직 구현
        const currentPrice = this.chart.price;        
        if (this.input.keys.bet && !this.betButtonDebounce) {
            this.toggleBetScale();
            this.betButtonDebounce = true;
        }
        if (!this.input.keys.bet) {
            this.betButtonDebounce = false;
        }

        // 포지션 진입 / 청산
        if (this.input.keys.buy) {
            if (this.player.position !== 1) {
                this.enterPosition(1, currentPrice); // Long 전환
            }
        } else if (this.input.keys.sell) {
            if (this.player.position !== -1) {
                this.enterPosition(-1, currentPrice); // Short 전환
            }
        } else if (this.input.keys.close) {
            if (this.player.position !== 0) {
                this.closePosition(currentPrice); // 포지션 종료
            }
        }

        this.player.calculateProfit(currentPrice);

        // 목표 달성 체크
        const totalAsset = this.player.balance + this.player.invested;
        if (totalAsset >= this.player.target) {
            this.completeMission();
        }
    }
    
    toggleBetScale() {
        // 10% -> 25% -> 50% -> 100% 순환
        const scales = [0.1, 0.25, 0.5, 1.0];
        let idx = scales.indexOf(this.player.betScale);
        idx = (idx + 1) % scales.length;
        this.player.betScale = scales[idx];
        this.sound.playBet(); // 효과음
        
        // 버튼 텍스트 업데이트
        this.updateBetButton();
    }

    updateBetButton() {
        const btn = document.getElementById('btn-bet');
        if(btn) btn.innerHTML = `BET<br>${this.player.betScale * 100}%`;
        // 기존의 구체적인 금액 계산 로직 제거
        // 단순하게 %만 표시
    }

    enterPosition(type, price) {
        // 기존 포지션이 있다면 청산 후 진입
        if (this.player.position !== 0) {
            this.closePosition(price);
        }
        
        // 투입 금액 계산 (현재 잔고 기준)
        const investAmount = Math.floor(this.player.balance * this.player.betScale);
        if (investAmount <= 0) return; // 잔고 부족

        this.player.balance -= investAmount; // 잔고에서 차감
        this.player.invested = investAmount;
        this.player.position = type;
        this.player.entryPrice = price;
        this.ui.updateBetButton(this.player); // 잔고 변경 반영
        type === 1 ? this.sound.playBuy() : this.sound.playSell(); // 효과음
    }

    closePosition(price) {
        // 수익 여부 확인
        const isProfit = this.player.profit > 0;
        let finalProfit = this.player.profit;

        if (isProfit) {
            this.combo++;

            // 콤보 유지 시간 설정 (3콤보부터 시간 단축)
            // 기본 10초. 3콤보부터 1초씩 감소. 최소 2초.
            let duration = 10000;
            if (this.combo >= 3) {
                duration = Math.max(2000, 10000 - (this.combo - 2) * 1000);
            }
            this.comboTimer = duration;
            this.maxComboTime = duration;
            
            // 콤보 보너스 (기본 10%씩 증가)
            let multiplier = 1 + (this.combo * 0.1);

            // 피버 모드 (2콤보 이상): 수익 2배 뻥튀기
            if (this.combo >= 2) {
                multiplier *= 2;
            }
            finalProfit *= multiplier;
        } else {
            this.combo = 0;
            this.comboTimer = 0;
        }

        // 수익 실현 (보너스 포함)
        this.player.balance += this.player.invested + finalProfit;
        
        // 상태 초기화
        this.sound.playClose(isProfit); // 효과음 (수익 여부에 따라 다름)
        this.player.invested = 0;
        this.player.position = 0;
        this.player.profit = 0;
        this.player.entryPrice = 0;
        this.ui.updateBetButton(this.player); // 잔고 변경 반영
    }

    drawResult() {
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '40px Arial';
        ctx.fillText("GAME OVER", this.canvas.width/2, this.canvas.height/2 - 50);
        
        const totalAsset = this.player.balance + this.player.invested + this.player.profit;
        ctx.font = '24px Arial';
        ctx.fillText(`Final Asset: ${Math.floor(totalAsset).toLocaleString()}`, this.canvas.width/2, this.canvas.height/2 + 10);
        
        ctx.fillStyle = '#ff4757'; // High Score 강조
        ctx.fillText(`High Score: ${Math.floor(this.highScore).toLocaleString()}`, this.canvas.width/2, this.canvas.height/2 + 50);

        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText("Click to Retry", this.canvas.width/2, this.canvas.height/2 + 100);
    }

    drawMissionComplete() {
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.fillStyle = '#ff4757'; // 강조색
        ctx.textAlign = 'center';
        ctx.font = 'bold 40px Arial';
        ctx.fillText("MISSION COMPLETE!", this.canvas.width/2, this.canvas.height/2 - 20);
        
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText(`Next Stage: Target ${Math.floor(this.player.target * 1.5).toLocaleString()}`, this.canvas.width/2, this.canvas.height/2 + 30);
        ctx.fillText("Click to Continue", this.canvas.width/2, this.canvas.height/2 + 70);
    }
}

// 게임 인스턴스 생성
window.onload = () => {
    const game = new Game();
};