class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.input = new InputHandler();
        this.chart = new ChartManager(); // 차트 매니저 생성
        this.sound = new SoundManager(); // 사운드 매니저 생성
        this.player = new Player(1000000, 1500000); // 플레이어 생성
        this.ui = new UIManager(this.canvas); // UI 매니저 생성
        this.realEstate = new RealEstateManager(); // 부동산 매니저 생성
        
        // High Score 로드
        this.highScore = parseInt(localStorage.getItem('arcadeTraderHighScore')) || 0;

        // Level & EXP 로드
        this.level = parseInt(localStorage.getItem('cs_level')) || 1;
        this.exp = parseInt(localStorage.getItem('cs_exp')) || 0;
        this.reqExp = this.calculateReqExp(this.level); // 레벨업 필요 경험치
        
        // 튜토리얼 상태 초기화 (새로고침 시에도 튜토리얼 표시)
        localStorage.removeItem('chartSurferTutorial');

        this.sessionExp = 0; // 이번 게임 세션에서 획득한 경험치
        this.levelUpTimer = 0; // 레벨업 텍스트 표시 타이머
        this.itemCapIncreaseTimer = 0; // 아이템 한도 증가 이펙트 타이머
        this.particles = [];   // 파티클 시스템
        this.moneyParticles = []; // 돈다발 파티클 시스템
        this.floatingTexts = []; // 플로팅 텍스트 시스템
        this.floatingTextQueue = []; // 알림 메시지 큐 (순차 노출용)
        this.floatingTextSpawnTimer = 0; // 알림 메시지 노출 간격 타이머
        this.rentalTimer = 0; // 임대 수익 타이머

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
        this.actionReleased = true; // 버튼 해제 감지용
        this.closeReleased = true;
        
        // 아이템 시스템
        this.items = {
            slow: { count: 3, timer: 0 },
            view: { count: 3, timer: 0 }
        };

        // 화면 리사이징 대응
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 버전 정보 표시
        document.getElementById('version-display').innerText = `v${CONFIG.VERSION}`;

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
                if (this.inputCooldown <= 0 && (this.input.keys.action || this.input.keys.buy || this.input.keys.sell)) {
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
                if (!this.input.keys.action) this.actionReleased = true;
                if (this.inputCooldown <= 0 && this.input.keys.action && this.actionReleased) {
                    this.goToRealEstate(); // 바로 다음 스테이지가 아니라 부동산 상점으로 이동
                }
                break;
            case STATE.REAL_ESTATE:
                if (!this.input.keys.action) this.actionReleased = true;
                if (!this.input.keys.close) this.closeReleased = true;

                // 부동산 상점 입력 처리
                if (this.inputCooldown <= 0 && this.input.keys.close && this.closeReleased) {
                    this.nextStage();
                }

                // 스크롤 처리
                if (this.input.keys.scroll !== 0 || this.input.keys.scrollX !== 0) {
                    // 마우스 위치에 따라 스크롤 대상 분기 (하단 150px은 스카이라인 영역)
                    if (this.input.keys.y > this.canvas.height - 150) {
                        // 스카이라인 가로 스크롤
                        // 가로 스크롤(터치/패드) 우선, 없으면 세로 휠 사용
                        let delta = this.input.keys.scrollX !== 0 ? this.input.keys.scrollX : this.input.keys.scroll;
                        this.realEstate.skylineScrollOffset += delta;
                        
                        const skylineData = this.realEstate.getSkylineData();
                        const skylineWidth = 50 + skylineData.length * 60;
                        const maxSkylineScroll = Math.max(0, skylineWidth - this.canvas.width);
                        this.realEstate.skylineScrollOffset = Math.max(0, Math.min(this.realEstate.skylineScrollOffset, maxSkylineScroll));
                    } else {
                        // 상점 목록 세로 스크롤
                        this.realEstate.scrollOffset += this.input.keys.scroll;
                        
                        // 스크롤 범위 제한
                        const viewHeight = 230; // 2행 고정 높이 (110*2 + 10)
                        const contentHeight = Math.ceil(this.realEstate.catalog.length / 2) * 120; // 행당 120px
                        const maxScroll = Math.max(0, contentHeight - viewHeight);
                        this.realEstate.scrollOffset = Math.max(0, Math.min(this.realEstate.scrollOffset, maxScroll));
                    }
                    
                    this.input.keys.scroll = 0; // 스크롤 값 초기화
                    this.input.keys.scrollX = 0;
                }

                // 터치/클릭 입력 처리
                if (this.inputCooldown <= 0 && this.input.keys.action && this.actionReleased) {
                    const action = this.ui.checkRealEstateInput(this.input.keys.x, this.input.keys.y, this.realEstate);
                    if (action) {
                        if (action.type === 'buy') this.buyBuilding(action.index);
                        if (action.type === 'sell') this.sellBuilding(action.index);
                        if (action.type === 'next') this.nextStage();
                        this.inputCooldown = 300; // 중복 입력 방지 시간 늘림
                    }
                }

                // 애니메이션 업데이트
                this.realEstate.updateAnimations(deltaTime);
                break;
        }
    }

    draw() {
        this.ui.ctx.save(); // 카메라 효과 시작

        // 1. 화면 흔들림 효과 (Shake Effect)
        const isCrash = this.chart.news && this.chart.news.type === 'crash';
        if (isCrash) {
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
            case STATE.REAL_ESTATE:
                this.ui.drawRealEstate(this.realEstate, this.player);
                break;
        }

        this.ui.ctx.restore(); // 카메라 효과 종료
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
        
        // 레벨 및 경험치 초기화 (요청사항: 매 게임 1레벨 시작)
        this.level = 1;
        this.exp = 0;
        this.reqExp = this.calculateReqExp(this.level);
        localStorage.setItem('cs_level', this.level);
        localStorage.setItem('cs_exp', this.exp);

        // 차트 데이터 초기화 (버그 수정)
        this.chart.reset();
        this.realEstate.reset(); // 부동산 초기화

        this.stage = 1;
        this.chart.setStage(this.stage);
        this.sessionExp = 0; // 세션 경험치 초기화
        this.levelUpTimer = 0;
        this.itemCapIncreaseTimer = 0;
        this.particles = [];
        this.moneyParticles = [];
        this.floatingTexts = [];
        this.floatingTextQueue = [];
        this.floatingTextSpawnTimer = 0;
        this.rentalTimer = 5000; // 5초 후 첫 임대 수익
        
        // 레벨 보상 적용 (자본금, 아이템)
        const bonus = this.getLevelBonus();
        
        // 플레이어 상태 초기화 (버그 수정)
        const startBalance = Math.floor(1000000 * bonus.balanceMult);
        const startTarget = 100000; // 목표 수익 초기화 (10만불 순수익 목표)
        this.player.reset(startBalance, startTarget);

        this.stageTime = 90000;
        this.combo = 0;
        this.comboTimer = 0;
        this.items.slow = { count: bonus.itemCount, timer: 0 };
        this.items.view = { count: bonus.itemCount, timer: 0 };
        
        this.warningSoundTimer = 0;
        this.timer = this.stageTime; // 타이머 초기화 (카운트다운)
        console.log(`Game Started (v${CONFIG.VERSION})`);
    }

    resetGame() {
        this.currentState = STATE.TITLE;
        document.getElementById('title-screen').classList.remove('hidden');
        document.getElementById('mobile-controls').classList.add('hidden'); // 버튼 숨김
        this.sound.stopBGM(); // BGM 정지
        this.inputCooldown = 500; // 타이틀 화면 진입 시 짧은 쿨다운 (오입력 방지)

        // 튜토리얼 다시 보기 위해 기록 삭제
        localStorage.removeItem('chartSurferTutorial');
    }

    completeMission() {
        // 포지션 강제 청산하여 수익 실현
        if (this.player.position !== 0) {
            this.closePosition(this.chart.price);
        }
        
        // 부동산 시장 변동 발생
        this.realEstate.updateMarket();
        
        this.currentState = STATE.MISSION_COMPLETE;
        this.inputCooldown = 1000; // 화면 전환 쿨다운 (1초)
        this.actionReleased = false; // 입력 해제 대기
    }

    goToRealEstate() {
        this.currentState = STATE.REAL_ESTATE;
        // 모바일 컨트롤 숨김 (상점 전용 UI 사용)
        document.getElementById('mobile-controls').classList.add('hidden');
        this.inputCooldown = 500; // 화면 전환 쿨다운 (0.5초)
        this.actionReleased = false; // 입력 해제 대기
        this.closeReleased = false;
    }

    nextStage() {
        // 부동산 효과 적용 (임대 수익, 버프 등)
        const effects = this.realEstate.applyEffects(this.player, this.items);

        // 모바일 컨트롤 다시 표시
        document.getElementById('mobile-controls').classList.remove('hidden');

        this.stage++;
        this.chart.setStage(this.stage);
        this.player.target = Math.floor(this.player.target * 1.2); // 목표 수익 1.2배 증가 (난이도 완화)
        this.player.stageProfit = 0; // 스테이지 누적 수익 초기화
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

        // 경험치는 게임 중 실시간 획득하므로 여기서는 별도 처리 안 함
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
        
        // 레벨업 이펙트 업데이트 (파티클 & 타이머)
        if (this.levelUpTimer > 0) this.levelUpTimer -= deltaTime;
        if (this.itemCapIncreaseTimer > 0) this.itemCapIncreaseTimer -= deltaTime;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // 중력 적용
            p.life -= deltaTime / 1000;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // 돈다발 파티클 업데이트
        for (let i = this.moneyParticles.length - 1; i >= 0; i--) {
            const p = this.moneyParticles[i];
            const floor = this.canvas.height - 20 - (p.offsetY || 0); // 바닥 높이 (랜덤 오프셋 적용)

            if (p.y < floor) {
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.vr;
                p.vy += 0.15; // 중력 가속도 적용 (점점 빠르게)
            } else {
                p.y = floor; // 바닥에 고정
                p.vy = 0;
                p.vx *= 0.9; // 바닥 마찰력
                p.vr *= 0.9; // 회전 마찰력
                p.rotation += p.vr;
            }

            p.life -= deltaTime / 1000;
            if (p.life <= 0) {
                this.moneyParticles.splice(i, 1);
            }
        }

        // 플로팅 텍스트 업데이트
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 1.5; // 위로 천천히 이동
            ft.life -= deltaTime / 1000;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        // 알림 메시지 큐 처리 (순차 노출)
        if (this.floatingTextSpawnTimer > 0) this.floatingTextSpawnTimer -= deltaTime;
        if (this.floatingTextSpawnTimer <= 0 && this.floatingTextQueue.length > 0) {
            const item = this.floatingTextQueue.shift();
            if (item.type === 'text') {
                this._spawnFloatingText(item.data.text, item.data.color);
            } else if (item.type === 'levelup') {
                this._activateLevelUpEffect(item.data.capIncreased);
            }
            this.floatingTextSpawnTimer = 800; // 0.8초 간격으로 노출
        }

        // 임대 수익 타이머 (5초마다 발생)
        this.rentalTimer -= deltaTime;
        if (this.rentalTimer <= 0) {
            this.rentalTimer = 5000;
            // 보유한 건물이 있을 때만 임대 수익 계산 (예외 처리)
            if (this.realEstate.inventory.length > 0) {
                const rent = this.realEstate.calculateRent();
                if (rent > 0) {
                    this.player.balance += rent;
                    this.player.stageProfit += rent; // 임대 수익도 목표 달성에 반영
                    this.queueNotification('text', { text: `임대 수익 +$${rent.toLocaleString()}`, color: '#f1c40f' }, 1); // 우선순위 1 (낮음)
                }
            }
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
        // 오직 +수익(stageProfit)만 집계하여 목표와 비교
        if (this.player.stageProfit >= this.player.target) {
            this.completeMission();
        }
    }
    
    buyBuilding(index) {
        if (this.realEstate.buy(this.player, index)) {
            this.sound.playBuy(); // 구매 성공음
            this.queueNotification('text', { text: "건물 매입 성공!", color: "#f1c40f" }, 1);
        } else {
            this.sound.playWarning(); // 잔고 부족
        }
    }

    sellBuilding(index) {
        if (this.realEstate.sell(this.player, index)) {
            this.sound.playSell(); // 판매 효과음
            this.queueNotification('text', { text: "건물 매도 완료", color: "#5352ed" }, 1);
        } else {
            this.sound.playWarning(); // 보유하지 않음
        }
    }

    toggleBetScale() {
        // 10% -> 25% -> 50% -> 100% 순환
        // 레벨에 따라 최대 베팅 비율 제한 (레버리지 해금)
        const maxScale = this.getLevelBonus().maxScale;
        const allScales = [0.1, 0.25, 0.5, 1.0];
        const scales = allScales.filter(s => s <= maxScale);

        let idx = scales.indexOf(this.player.betScale);
        if (idx === -1 || idx === scales.length - 1) {
            this.player.betScale = scales[0];
        } else {
            this.player.betScale = scales[idx + 1];
        }
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
            // 레벨 보너스: 콤보/피버 유지 시간 증가
            duration += this.getLevelBonus().comboTime;

            this.comboTimer = duration;
            this.maxComboTime = duration;
            
            // 콤보 보너스 (기본 10%씩 증가)
            let multiplier = 1 + (this.combo * 0.1);

            // 피버 모드 (2콤보 이상): 수익 2배 뻥튀기
            if (this.combo >= 2) {
                multiplier *= 2;
            }
            
            // 부동산 효과 (수익률 보너스) 적용
            multiplier *= this.player.profitMultiplier;
            finalProfit *= multiplier;
            
            // 목표 달성을 위한 순수익 집계 (오직 +수익만)
            if (finalProfit > 0) {
                this.player.stageProfit += finalProfit;
            }

            // 실시간 경험치 획득 (수익의 1%)
            const expGain = Math.floor(finalProfit * 0.01);
            if (expGain > 0) {
                this.addExp(expGain);
            }

            // 돈다발 이펙트 발동
            this.triggerMoneyEffect(finalProfit);

            // 대박 수익(10만불 이상) 시 플로팅 텍스트 표시
            if (finalProfit >= 100000) {
                this.queueNotification('text', { text: `+ $${Math.floor(finalProfit).toLocaleString()}`, color: '#2ecc71' }, 2); // 우선순위 2 (중간)
            }
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
        ctx.fillText(`Final Asset: $${Math.floor(totalAsset).toLocaleString()}`, this.canvas.width/2, this.canvas.height/2 + 10);
        
        ctx.fillStyle = '#ff4757'; // High Score 강조
        ctx.fillText(`High Score: $${Math.floor(this.highScore).toLocaleString()}`, this.canvas.width/2, this.canvas.height/2 + 50);
        
        // Level & EXP 표시
        ctx.fillStyle = '#f1c40f';
        ctx.font = '20px Arial';
        ctx.fillText(`LV. ${this.level}  (+${this.sessionExp} EXP)`, this.canvas.width/2, this.canvas.height/2 + 90);
        
        // EXP Bar Background
        const barW = 200;
        const barH = 10;
        const bx = this.canvas.width/2 - barW/2;
        const by = this.canvas.height/2 + 105;
        ctx.fillStyle = '#555';
        ctx.fillRect(bx, by, barW, barH);
        
        // EXP Bar Fill
        const ratio = Math.min(1, this.exp / this.reqExp);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(bx, by, barW * ratio, barH);

        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText("Click to Retry", this.canvas.width/2, this.canvas.height/2 + 150);
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
        ctx.fillText(`Next Stage: Target $${Math.floor(this.player.target * 1.5).toLocaleString()}`, this.canvas.width/2, this.canvas.height/2 + 30);
        ctx.fillText("Click to Continue", this.canvas.width/2, this.canvas.height/2 + 70);
        
        // 부동산 상점 안내
        ctx.fillStyle = '#f1c40f';
        ctx.font = '16px Arial';
        ctx.fillText("(Press Action to Enter Real Estate Market)", this.canvas.width/2, this.canvas.height/2 + 110);
    }

    // --- Progression System ---
    getLevelBonus() {
        return {
            // 레벨당 시작 자본금 1% 증가 (100레벨 시 2배)
            balanceMult: 1 + (this.level - 1) * 0.01,
            // 모든 배팅 비율 해금 (10%, 25%, 50%, 100%)
            maxScale: 1.0,
            // 레벨당 콤보 유지 시간 0.1초 증가
            comboTime: (this.level - 1) * 100,
            // 10레벨마다 아이템 개수 1개씩 증가 (기본 3개)
            itemCount: 3 + Math.floor((this.level - 1) / 10)
        };
    }

    calculateReqExp(level) {
        // 1~100 레벨 밸런싱 공식 (2차 함수 형태)
        return Math.floor(2000 * level * (1 + level * 0.05));
    }

    addExp(amount) {
        const prevCap = 3 + Math.floor((this.level - 1) / 10); // 레벨업 전 아이템 한도

        this.exp += amount;
        this.sessionExp += amount; // 세션 누적
        let leveledUp = false;

        while (this.exp >= this.reqExp) {
            this.exp -= this.reqExp;
            this.level++;
            this.reqExp = this.calculateReqExp(this.level);
            leveledUp = true;
        }

        if (leveledUp) {
            const newCap = 3 + Math.floor((this.level - 1) / 10); // 레벨업 후 아이템 한도
            this.queueNotification('levelup', { capIncreased: newCap > prevCap }, 3); // 우선순위 3 (가장 높음)
        }
        localStorage.setItem('cs_level', this.level);
        localStorage.setItem('cs_exp', this.exp);
    }

    // 레벨업 이펙트 실제 실행 (큐에서 호출됨)
    _activateLevelUpEffect(capIncreased) {
        this.levelUpTimer = 2000; // 2초간 텍스트 표시
        this.sound.playLevelUp(); // 효과음 재생
        // 파티클 생성 (폭죽 효과)
        for(let i=0; i<60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 4;
            this.particles.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0 + Math.random(), // 1~2초 수명
                color: `hsl(${Math.random() * 50 + 40}, 100%, 60%)` // 황금색 계열
            });
        }

        if (capIncreased) {
            this.itemCapIncreaseTimer = 4000; // 4초간 아이템 버튼 반짝임
        }
    }

    triggerMoneyEffect(amount = 0) {
        if (amount < 50000) return; // 5만불 미만은 이펙트 생략 (게임 방해 방지)

        // 수익금에 따라 파티클 개수와 크기 조절
        const baseCount = 10; // 기본 10개 (요청사항 반영)
        // $5,000 당 1개 추가 (기존 $10,000 대비 2배 민감하게 반응하여 대박 느낌 강화)
        const extraCount = Math.floor(amount / 5000);
        const count = Math.min(200, baseCount + extraCount); // 최대 200개 제한
        
        // 크기: 100만불 수익 시 최대 2.5배까지 커짐
        const baseScale = 1 + Math.min(1.5, amount / 1000000);

        for(let i=0; i<count; i++) {
            this.moneyParticles.push({
                x: Math.random() * this.canvas.width,
                y: -Math.random() * 300 - 50, // 화면 위쪽에서 랜덤하게 시작
                vx: (Math.random() - 0.5) * 4, // 좌우 흔들림
                vy: Math.random() * 4 + 3,     // 낙하 속도
                rotation: Math.random() * Math.PI * 2,
                vr: (Math.random() - 0.5) * 0.2, // 회전 속도
                life: 6.0, // 수명 증가 (바닥에 쌓이는 시간 확보)
                scale: baseScale * (0.8 + Math.random() * 0.4), // 크기
                offsetY: Math.random() * 60 // 바닥 착지 지점 랜덤 오프셋 (쌓이는 느낌)
            });
        }
    }

    // 알림 메시지 큐 등록 (우선순위: 3=High, 2=Mid, 1=Low)
    queueNotification(type, data, priority = 1) {
        this.floatingTextQueue.push({ type, data, priority });
        this.floatingTextQueue.sort((a, b) => b.priority - a.priority); // 우선순위 내림차순 정렬
    }

    // 플로팅 텍스트 실제 생성 (큐에서 호출됨)
    _spawnFloatingText(text, color) {
        this.floatingTexts.push({
            text: text,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2, // 화면 중앙에서 시작
            life: 2.0, // 2초간 지속
            color: color
        });
    }
}

// 게임 인스턴스 생성
window.onload = () => {
    const game = new Game();
};