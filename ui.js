class UIManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // 밤하늘 별 데이터 초기화
        this.stars = [];
        for(let i=0; i<50; i++) {
            this.stars.push({
                x: Math.random(), // 상대 좌표 (0~1)
                y: Math.random() * 0.6, // 화면 상단 60%
                size: Math.random() * 2 + 1,
                alpha: 0.5 + Math.random() * 0.5
            });
        }
        
        // 배경 도시 실루엣 데이터
        this.bgSilhouette = [];
        for(let i=0; i<20; i++) {
            this.bgSilhouette.push({
                x: Math.random(), // 상대 좌표
                w: 0.05 + Math.random() * 0.05, // 상대 너비
                h: 50 + Math.random() * 100 // 절대 높이 (픽셀)
            });
        }
    }

    clear(combo, chart) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 초대형 악재: 붉은색 섬광 (깜빡임)
        if (chart && chart.news && chart.news.type === 'crash') {
            const time = Date.now() * 0.02;
            const r = 80 + Math.abs(Math.sin(time)) * 80; // 80 ~ 160 (어두운 빨강 ~ 밝은 빨강)
            this.ctx.fillStyle = `rgb(${r}, 0, 0)`;
            this.ctx.fillRect(-50, -50, w + 100, h + 100);
        } else if (combo >= 2) {
            // 피버 모드: 화려한 배경
            const time = Date.now() * 0.005;
            const r = 40 + Math.sin(time) * 20;
            const b = 40 + Math.cos(time) * 20;
            this.ctx.fillStyle = `rgb(${r}, 10, ${b})`;
            this.ctx.fillRect(-50, -50, w + 100, h + 100);
        } else {
            // 기본 배경: 그라데이션 + 그리드 패턴
            const gradient = this.ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
            gradient.addColorStop(0, '#2c3e50'); // 중앙: 짙은 남색
            gradient.addColorStop(1, '#000000'); // 외곽: 검정
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(-50, -50, w + 100, h + 100);

            // 격자무늬 (Grid) 그리기
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            const gridSize = 60;
            for (let x = 0; x <= w; x += gridSize) {
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, h);
            }
            for (let y = 0; y <= h; y += gridSize) {
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(w, y);
            }
            this.ctx.stroke();
        }
    }

    drawChart(chartManager) {
        const { candles, maxCandles } = chartManager.getChartData();
        const w = this.canvas.width;
        const h = this.canvas.height;
        const isMobile = w < 600;

        const allValues = candles.flatMap(c => [c.low, c.high]);
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min || 1;
        
        // UI 레이아웃에 맞춰 차트 영역 조정 (Bet 버튼 위까지만 표시)
        const bottomPadding = isMobile ? 160 : 200;
        const topPadding = isMobile ? 90 : 50; // 상단 HUD 공간 확보
        const drawH = h - topPadding - bottomPadding;
        
        const candleWidth = (w / maxCandles) * 0.7;
        const step = w / maxCandles;

        // X축 라인 (시간 위 하얀색 가로 선)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, h - bottomPadding);
        this.ctx.lineTo(w, h - bottomPadding);
        this.ctx.stroke();

        candles.forEach((c, i) => {
            const x = i * step + (step - candleWidth) / 2;
            const yOpen = h - bottomPadding - ((c.open - min) / range) * drawH;
            const yClose = h - bottomPadding - ((c.close - min) / range) * drawH;
            const yHigh = h - bottomPadding - ((c.high - min) / range) * drawH;
            const yLow = h - bottomPadding - ((c.low - min) / range) * drawH;

            const isBull = c.close >= c.open;
            this.ctx.fillStyle = isBull ? CONFIG.COLORS.BULL : CONFIG.COLORS.BEAR;
            this.ctx.strokeStyle = isBull ? CONFIG.COLORS.BULL : CONFIG.COLORS.BEAR;

            this.ctx.beginPath();
            this.ctx.moveTo(x + candleWidth/2, yHigh);
            this.ctx.lineTo(x + candleWidth/2, yLow);
            this.ctx.stroke();

            const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1);
            this.ctx.fillRect(x, Math.min(yOpen, yClose), candleWidth, bodyHeight);

            // X축 시간 표시 (10개 캔들 간격, 캔들 고유 번호 기준)
            if (c.tick % 10 === 0) {
                this.ctx.fillStyle = '#aaa';
                this.ctx.font = '11px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(c.time, x + candleWidth / 2, h - bottomPadding + 20);
            }
        });

        const lastC = candles[candles.length-1];
        const lastP = lastC.close;
        const lastX = w - 10;
        const lastY = h - bottomPadding - ((lastP - min) / range) * drawH;
        
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(lastX, lastY, 6, 0, Math.PI*2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px Courier New';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(Math.floor(lastP).toLocaleString(), w - 20, lastY - 20);
    }

    drawHUD(game) {
        const { player, timer, combo, comboTimer, maxComboTime, chart, items } = game;
        const w = this.canvas.width;
        const isMobile = w < 600;
        const isSmallMobile = w < 380; // 아이폰 미니 등 대응
        
        // 모바일 최적화 변수
        const fontSize = isSmallMobile ? 11 : (isMobile ? 13 : 20);
        const lineHeight = isSmallMobile ? 15 : (isMobile ? 18 : 30);
        let leftY = isSmallMobile ? 25 : (isMobile ? 30 : 40);

        this.ctx.fillStyle = CONFIG.COLORS.TEXT;
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.textAlign = "left";
        
        if (timer < 10000) {
            this.ctx.fillStyle = Math.floor(timer / 250) % 2 === 0 ? '#ff4757' : '#ffffff';
        } else {
            this.ctx.fillStyle = '#ffffff';
        }
        this.ctx.fillText(`TIME: ${(timer / 1000).toFixed(1)}`, 20, leftY);

        // 레벨 표시
        leftY += lineHeight;
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillText(`LV. ${game.level}`, 20, leftY);

        // 경험치 바 (HUD)
        const barW = isSmallMobile ? 50 : (isMobile ? 60 : 80);
        const barH = 6;
        const barX = 20;
        const barY = leftY + 4;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // 배경
        this.ctx.fillRect(barX, barY, barW, barH);
        const expRatio = Math.min(1, Math.max(0, game.exp / game.reqExp));
        this.ctx.fillStyle = '#f1c40f'; // 게이지 채우기
        this.ctx.fillRect(barX, barY, barW * expRatio, barH);
        
        // 보유 자산 표시 (자본금 확인용)
        leftY += lineHeight + 8; // 간격 추가 (게이지 바와 겹침 방지)
        const totalAsset = player.balance + player.invested;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`보유 자산: $${Math.floor(totalAsset).toLocaleString()}`, 20, leftY);

        // 평가 손익
        leftY += lineHeight;
        const profit = player.profit;
        let profitText = `평가 손익: $${Math.floor(profit).toLocaleString()}`;
        this.ctx.fillStyle = profit >= 0 ? '#ff4757' : '#5352ed';
        if (profit === 0) this.ctx.fillStyle = '#fff';
        this.ctx.fillText(profitText, 20, leftY);
        
        // 우측 상단 (목표)
        let rightY = isSmallMobile ? 25 : (isMobile ? 30 : 40);
        this.ctx.textAlign = "right";
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`목표 수익: $${player.target.toLocaleString()}`, this.canvas.width - 20, rightY);
        rightY += lineHeight;
        this.ctx.fillText(`달성 수익: $${Math.floor(player.stageProfit).toLocaleString()}`, this.canvas.width - 20, rightY);

        let posText = "NEUTRAL";
        if (player.position === 1) posText = "LONG ▲";
        if (player.position === -1) posText = "SHORT ▼";
        
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = "center";
        this.ctx.font = `bold ${isSmallMobile ? 16 : (isMobile ? 18 : 24)}px Arial`;
        this.ctx.fillText(posText, this.canvas.width / 2, isSmallMobile ? 35 : (isMobile ? 40 : 50));
        
        let newsY = isSmallMobile ? 110 : (isMobile ? 130 : 150);

        if (combo > 1) {
            newsY = isSmallMobile ? 160 : (isMobile ? 180 : 210);
            this.ctx.save();
            if (combo >= 2) {
                this.ctx.fillStyle = '#ff4757';
                this.ctx.font = `bold ${isSmallMobile ? 14 : (isMobile ? 16 : 20)}px Arial`;
                this.ctx.shadowColor = "#ff4757";
                this.ctx.shadowBlur = 15;
                this.ctx.fillText("🔥 FEVER MODE x2 🔥", this.canvas.width / 2, isSmallMobile ? 100 : (isMobile ? 115 : 135));
            }
            this.ctx.fillStyle = '#ffeb3b';
            this.ctx.font = `bold ${isSmallMobile ? 20 : (isMobile ? 24 : 30)}px Arial`;
            this.ctx.shadowColor = "#ff9800";
            this.ctx.shadowBlur = 10;
            this.ctx.fillText(`${combo} COMBO!`, this.canvas.width / 2, isSmallMobile ? 80 : (isMobile ? 90 : 100));
            this.ctx.restore();

            if (comboTimer > 0) {
                const barW = 200;
                const barH = 8;
                const bx = this.canvas.width / 2 - barW / 2;
                const by = isSmallMobile ? 125 : (isMobile ? 140 : 160);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.fillRect(bx, by, barW, barH);
                const ratio = Math.max(0, comboTimer / maxComboTime);
                this.ctx.fillStyle = '#ffeb3b';
                this.ctx.fillRect(bx, by, barW * ratio, barH);
            }
        }

        if (chart.news) {
            this.ctx.save();
            this.ctx.fillStyle = chart.news.type === 'bull' ? '#ff4757' : '#5352ed';
            this.ctx.font = `bold ${isSmallMobile ? 16 : (isMobile ? 20 : 28)}px Arial`;
            this.ctx.textAlign = "center";
            this.ctx.fillText(chart.news.text, this.canvas.width / 2, newsY);
            this.ctx.restore();
        }

        // 아이템 UI 업데이트 (버튼 텍스트)
        const btnSlow = document.getElementById('count-slow');
        const btnView = document.getElementById('count-view');
        if (btnSlow) btnSlow.innerText = items.slow.count;
        if (btnView) btnView.innerText = items.view.count;

        // 아이템 효과 표시
        // 1. SLOW 모드 표시
        if (items.slow.timer > 0) {
            this.ctx.fillStyle = '#00d2d3';
            this.ctx.font = `bold ${isSmallMobile ? 14 : (isMobile ? 16 : 20)}px Arial`;
            this.ctx.textAlign = "right";
            this.ctx.fillText(`SLOW MODE ${(items.slow.timer/1000).toFixed(1)}`, this.canvas.width - (isMobile ? 70 : 90), isSmallMobile ? 95 : (isMobile ? 110 : 130));
        }

        // 2. VIEW 모드 (예측 화살표)
        if (items.view.timer > 0) {
            const trend = chart.getTrend();
            let text = "➡️";
            if (trend === 1) text = "↗️ UP";
            if (trend === -1) text = "↘️ DOWN";
            
            this.ctx.fillStyle = '#a55eea';
            this.ctx.font = `bold ${isSmallMobile ? 20 : (isMobile ? 24 : 30)}px Arial`;
            this.ctx.textAlign = "right";
            this.ctx.fillText(text, this.canvas.width - (isMobile ? 70 : 90), isSmallMobile ? 120 : (isMobile ? 140 : 170));
        }

        // 레벨업 이펙트 (텍스트 & 파티클)
        if (game.levelUpTimer > 0) {
            this.ctx.save();
            this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
            const scale = 1 + Math.sin(Date.now() * 0.01) * 0.1; // 두근거리는 효과
            this.ctx.scale(scale, scale);
            
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = "bold 60px Arial";
            this.ctx.textAlign = "center";
            this.ctx.shadowColor = "#e67e22";
            this.ctx.shadowBlur = 20;
            this.ctx.fillText("LEVEL UP!", 0, 0);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeText("LEVEL UP!", 0, 0);
            this.ctx.restore();
        }

        // 파티클 그리기
        game.particles.forEach(p => {
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;

        // 돈다발 파티클 그리기
        game.moneyParticles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.min(1, Math.max(0, p.life)); // 페이드 아웃 적용
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            if (p.scale) this.ctx.scale(p.scale, p.scale); // 크기 조절
            
            // 지폐 모양 (초록색 직사각형)
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.fillRect(-15, -8, 30, 16);
            this.ctx.strokeStyle = '#27ae60';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(-15, -8, 30, 16);
            
            // 중앙 $ 표시
            this.ctx.fillStyle = '#145a32';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('$', 0, 1);
            
            this.ctx.restore();
        });

        // 플로팅 텍스트 그리기
        game.floatingTexts.forEach(ft => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, Math.min(1, ft.life));
            this.ctx.fillStyle = ft.color;
            this.ctx.font = "bold 40px Arial";
            this.ctx.textAlign = "center";
            this.ctx.shadowColor = "rgba(0,0,0,0.5)";
            this.ctx.shadowBlur = 10;
            // 텍스트 외곽선 및 채우기
            this.ctx.strokeStyle = "#fff";
            this.ctx.lineWidth = 2;
            this.ctx.strokeText(ft.text, ft.x, ft.y);
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.restore();
        });

        // 아이템 한도 증가 이펙트 (DOM 요소 제어)
        const btnSlowEl = document.getElementById('btn-item-slow');
        const btnViewEl = document.getElementById('btn-item-view');
        
        if (btnSlowEl && btnViewEl) {
            if (game.itemCapIncreaseTimer > 0) {
                const time = Date.now() * 0.01;
                const alpha = 0.6 + 0.4 * Math.sin(time * 2); // 깜빡임
                const color = `rgba(255, 215, 0, ${alpha})`; // Gold
                const scale = 1 + 0.05 * Math.sin(time * 2); // 두근거림
                
                const styleBoxShadow = `0 0 20px ${color}, inset 0 0 10px ${color}`;
                
                btnSlowEl.style.boxShadow = styleBoxShadow;
                btnSlowEl.style.borderColor = 'gold';
                btnSlowEl.style.transform = `scale(${scale})`;
                
                btnViewEl.style.boxShadow = styleBoxShadow;
                btnViewEl.style.borderColor = 'gold';
                btnViewEl.style.transform = `scale(${scale})`;
            } else if (btnSlowEl.style.borderColor === 'gold') {
                // 이펙트 종료 시 스타일 초기화
                [btnSlowEl, btnViewEl].forEach(btn => {
                    btn.style.boxShadow = '';
                    btn.style.borderColor = '';
                    btn.style.transform = '';
                });
            }
        }
    }

    updateBetButton(player) {
        const btn = document.getElementById('btn-bet');
        if(!btn) return;
        btn.innerHTML = `BET<br>${player.betScale * 100}%`;
    }

    drawRealEstate(manager, player) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const isSmallMobile = w < 380;
        
        // 1. 배경 (밤하늘 그라데이션)
        const gradient = this.ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#0f2027');
        gradient.addColorStop(1, '#203a43');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, w, h);
        
        // 2. 별 그리기
        this.ctx.fillStyle = '#ffffff';
        this.stars.forEach(star => {
            this.ctx.globalAlpha = star.alpha;
            this.ctx.fillRect(star.x * w, star.y * h, star.size, star.size);
        });
        this.ctx.globalAlpha = 1.0;

        // 3. 달 그리기
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.shadowColor = '#f1c40f';
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.arc(w - 80, 80, 30, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // 4. 배경 도시 실루엣 (원경)
        this.ctx.fillStyle = '#1e272e';
        this.bgSilhouette.forEach(b => {
            this.ctx.fillRect(b.x * w, h - 100 - b.h, b.w * w, b.h + 100);
        });

        // 5. 땅
        this.ctx.fillStyle = '#3f4448';
        this.ctx.fillRect(0, h - 100, w, 100); // 땅
        
        // 6. 보유 건물 스카이라인 (근경)
        const skylineData = manager.getSkylineData();
        skylineData.forEach((group, index) => {
            const bx = 50 + index * 60 - manager.skylineScrollOffset;
            const by = h - 100; // 건물 위치
            
            const bHeight = this.getBuildingHeight(group.id);

            // 정착된(애니메이션 중이 아닌) 건물 개수 확인
            let settledCount = 0;
            group.indices.forEach(originalIdx => {
                const isAnimating = manager.animatingBuildings.some(a => a.index === originalIdx);
                if (!isAnimating) {
                    settledCount++;
                }
            });
            
            // 건물 그리기 (기본 - 정착된 건물이 있을 때만)
            if (settledCount > 0) {
                this.drawBuilding(bx, by, 40, bHeight, group.id);
            }

            // 수량 표시 (xN)
            if (group.count > 1) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`x${group.count}`, bx + 20, by - bHeight - 10);
            }

            // 애니메이션 중인 건물 그리기 (그룹 내 개별 인스턴스 확인)
            group.indices.forEach(originalIdx => {
                const anim = manager.animatingBuildings.find(a => a.index === originalIdx);
                if (anim) {
                    const drawY = by - Math.max(0, anim.yOffset);
                    this.drawBuilding(bx, drawY, 40, bHeight, group.id);
                }
            });
        });

        // 스카이라인 가로 스크롤바
        const skylineWidth = 50 + skylineData.length * 60;
        if (skylineWidth > w) {
            const sbH = 4;
            const sbY = h - 105; // 땅 바로 위
            const sbMaxScroll = skylineWidth - w;
            const sbRatio = w / skylineWidth;
            const sbW = Math.max(30, w * sbRatio);
            const sbProgress = Math.min(1, Math.max(0, manager.skylineScrollOffset / sbMaxScroll));
            const sbX = sbProgress * (w - sbW);

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            if (this.ctx.roundRect) {
                this.ctx.roundRect(sbX, sbY, sbW, sbH, 2);
            } else {
                this.ctx.rect(sbX, sbY, sbW, sbH);
            }
            this.ctx.fill();
        }

        // 상점 UI
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 30px Arial';
        this.ctx.fillText("부동산 상점", w/2, 50);
        
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillText(`현금: $${Math.floor(player.balance).toLocaleString()}`, w/2, 85);
        
        // 부동산 자산 현황 표시
        const valuation = manager.getTotalValuation();
        this.ctx.fillText(`부동산 가치: $${valuation.toLocaleString()}`, w/2, 115);
        
        this.ctx.fillStyle = manager.marketTrend > 1.0 ? '#ff4757' : (manager.marketTrend < 1.0 ? '#5352ed' : '#fff');
        this.ctx.fillText(manager.marketEvent, w/2, 145);

        // 건물 목록 카드
        const startY = 180;
        const footerH = 70;
        const listEndY = h - footerH;
        const cardH = 110; // 카드 높이
        const gap = 10;
        const margin = isSmallMobile ? 10 : 20; // 작은 화면에서 여백 축소
        const cardW = (w - (margin * 2) - gap) / 2; // 2열 그리드 너비 계산

        // 리스트 영역 클리핑 (스크롤 시 헤더/푸터 침범 방지)
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, startY, w, listEndY - startY);
        this.ctx.clip();

        manager.catalog.forEach((item, i) => {
            // 그리드 좌표 계산
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = margin + col * (cardW + gap);
            const y = startY + row * (cardH + gap) - manager.scrollOffset;

            const cost = manager.getCost(item);
            const canBuy = player.balance >= cost;
            const ownedCount = manager.countOwned(item.id);
            const canSell = ownedCount > 0;
            
            // 카드 배경
            this.ctx.fillStyle = canBuy ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 0, 0, 0.15)';
            this.ctx.fillRect(x, y, cardW, cardH);
            this.ctx.strokeStyle = canBuy ? '#fff' : '#555';
            this.ctx.strokeRect(x, y, cardW, cardH);
            
            // 건물 미리보기 아이콘 (위치 및 크기 조정: 좌측 하단)
            const previewH = 45;
            this.drawBuilding(x + 25, y + 105, 35, previewH, item.id);

            // 텍스트 정보
            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = '#fff';
            this.ctx.font = `bold ${isSmallMobile ? 14 : 16}px Arial`;
            this.ctx.fillText(item.name, x + 10, y + 25);
            
            this.ctx.font = `${isSmallMobile ? 10 : 12}px Arial`;
            this.ctx.fillStyle = '#aaa';
            this.ctx.fillText(item.desc, x + 10, y + 45);
            
            this.ctx.textAlign = 'right';
            this.ctx.fillStyle = canBuy ? '#f1c40f' : '#555';
            this.ctx.font = `bold ${isSmallMobile ? 12 : 14}px Arial`;
            this.ctx.fillText(`$${(cost/10000).toFixed(0)}만`, x + cardW - 10, y + 25);
            
            // 등락 표시 (기준가 대비)
            const diffRate = Math.round((manager.marketTrend - 1.0) * 100);
            let trendText = diffRate === 0 ? "-" : (diffRate > 0 ? `▲${diffRate}` : `▼${Math.abs(diffRate)}`);
            let trendColor = diffRate === 0 ? '#aaa' : (diffRate > 0 ? '#ff4757' : '#5352ed');
            
            this.ctx.font = `${isSmallMobile ? 10 : 12}px Arial`;
            this.ctx.fillStyle = trendColor;
            this.ctx.fillText(`${trendText}%`, x + cardW - 10, y + 45);

            // 매수/매도 버튼 그리기
            const btnW = isSmallMobile ? 45 : 50;
            const btnH = isSmallMobile ? 28 : 30;
            const btnY = y + 70;
            
            // 보유 수량 표시 (매수 버튼 위로 이동)
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = `bold ${isSmallMobile ? 10 : 11}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`보유: ${ownedCount}`, x + cardW - 10 - btnW/2, btnY - 5);

            // 매수 버튼 (우측)
            this.ctx.fillStyle = canBuy ? '#2ecc71' : '#555';
            this.ctx.fillRect(x + cardW - 10 - btnW, btnY, btnW, btnH);
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("매수", x + cardW - 10 - btnW/2, btnY + 20);

            // 매도 버튼 (좌측)
            this.ctx.fillStyle = canSell ? '#e74c3c' : '#555';
            this.ctx.fillRect(x + cardW - 15 - btnW * 2, btnY, btnW, btnH);
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText("매도", x + cardW - 15 - btnW * 1.5, btnY + 20);
        });
        
        this.ctx.restore(); // 클리핑 해제

        // 스크롤바 그리기
        const viewHeight = listEndY - startY;
        const contentHeight = Math.ceil(manager.catalog.length / 2) * (cardH + gap);
        
        if (contentHeight > viewHeight) {
            const scrollBarW = 4;
            const scrollBarX = w - scrollBarW - 4;
            const maxScroll = contentHeight - viewHeight;
            const scrollRatio = viewHeight / contentHeight;
            const scrollBarH = Math.max(30, viewHeight * scrollRatio);
            const scrollProgress = Math.min(1, Math.max(0, manager.scrollOffset / maxScroll));
            const scrollBarY = startY + scrollProgress * (viewHeight - scrollBarH);
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            if (this.ctx.roundRect) {
                this.ctx.roundRect(scrollBarX, scrollBarY, scrollBarW, scrollBarH, 2);
            } else {
                this.ctx.rect(scrollBarX, scrollBarY, scrollBarW, scrollBarH);
            }
            this.ctx.fill();
        }

        // 다음 스테이지 버튼 (하단 고정)
        const btnH = 50;
        const btnY = h - 70;
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.fillRect(40, btnY, w - 80, btnH);
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText("NEXT STAGE >>", w/2, btnY + 32);
    }

    // 부동산 상점 입력 판정
    checkRealEstateInput(x, y, manager) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // 1. 건물 카드 영역 확인
        const listStartY = 180; // drawRealEstate와 동일하게 맞춤
        const listEndY = h - 70;
        const cardH = 110;
        const gap = 10;
        const margin = 20;
        const isSmallMobile = w < 380;
        const cardW = (w - (margin * 2) - gap) / 2;
        const btnW = isSmallMobile ? 45 : 50;
        const btnH = 30;
        
        // 1. 다음 스테이지 버튼 확인 (우선 순위 높음, 리스트 영역 밖)
        // 터치 편의성을 위해 y 영역을 화면 끝까지 확장
        const footerBtnY = h - 70;
        if (y >= footerBtnY && x > 40 && x < w - 40) {
            return { type: 'next' };
        }

        // 리스트 영역 밖의 클릭은 무시 (스크롤 영역)
        if (y < listStartY || y > listEndY) return null;

        for(let i=0; i<manager.catalog.length; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const xPos = margin + col * (cardW + gap);
            const yPos = listStartY + row * (cardH + gap) - manager.scrollOffset;
            const btnY = yPos + 70;
            
            // 터치 영역 확장 (Hitbox Padding)
            const hitPadding = 10;

            // 매수 버튼 영역 (우측)
            if (x > xPos + cardW - 10 - btnW - hitPadding && 
                x < xPos + cardW - 10 + hitPadding && 
                y > btnY - hitPadding && 
                y < btnY + btnH + hitPadding) {
                return { type: 'buy', index: i };
            }
            // 매도 버튼 영역 (좌측)
            if (x > xPos + cardW - 15 - btnW * 2 - hitPadding && 
                x < xPos + cardW - 15 - btnW + hitPadding && 
                y > btnY - hitPadding && 
                y < btnY + btnH + hitPadding) {
                return { type: 'sell', index: i };
            }
        }
        
        return null;
    }

    getBuildingHeight(id) {
        switch(id) {
            case 'landmark': return 150;
            case 'hotel': return 130;
            case 'airport': return 60;
            case 'data': return 80;
            case 'harbor': return 50;
            case 'firm': return 100;
            case 'factory': return 70;
            case 'studio': return 60;
            case 'market': return 40;
            case 'house': return 40;
            default: return 40;
        }
    }

    // 건물 그리기 헬퍼 함수
    drawBuilding(x, y, w, h, type) {
        this.ctx.save();
        
        switch(type) {
            case 'house':
                // 벽체 (따뜻한 벽돌색)
                this.ctx.fillStyle = '#e58e26';
                this.ctx.fillRect(x + w*0.1, y - h*0.6, w*0.8, h*0.6);
                
                // 문
                this.ctx.fillStyle = '#5d4037';
                this.ctx.fillRect(x + w*0.4, y - h*0.25, w*0.2, h*0.25);
                // 문 손잡이
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.beginPath();
                this.ctx.arc(x + w*0.55, y - h*0.12, 1.5, 0, Math.PI*2);
                this.ctx.fill();

                // 창문
                this.ctx.fillStyle = '#81d4fa';
                this.ctx.fillRect(x + w*0.15, y - h*0.45, w*0.2, h*0.2);
                this.ctx.fillRect(x + w*0.65, y - h*0.45, w*0.2, h*0.2);

                // 지붕 (처마 그림자 포함)
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - h*0.6);
                this.ctx.lineTo(x + w/2, y - h);
                this.ctx.lineTo(x + w, y - h*0.6);
                this.ctx.fillStyle = '#c0392b';
                this.ctx.fill();
                break;
            
            case 'market':
                // 몸체 (흰색/회색 톤)
                this.ctx.fillStyle = '#ecf0f1';
                this.ctx.fillRect(x, y - h*0.7, w, h*0.7);
                
                // 상단 브랜드 띠 (녹색)
                this.ctx.fillStyle = '#27ae60';
                this.ctx.fillRect(x, y - h*0.7, w, h*0.15);

                // 유리창 (파란색)
                this.ctx.fillStyle = '#3498db';
                this.ctx.fillRect(x + w*0.1, y - h*0.4, w*0.25, h*0.3); // 좌측 창
                this.ctx.fillRect(x + w*0.65, y - h*0.4, w*0.25, h*0.3); // 우측 창
                
                // 출입문 (짙은 색)
                this.ctx.fillStyle = '#2c3e50';
                this.ctx.fillRect(x + w*0.4, y - h*0.3, w*0.2, h*0.3);

                // 차양막 (빨간색 포인트)
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.fillRect(x, y - h*0.45, w, h*0.05);

                // 간판 텍스트
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 9px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText("MART", x + w/2, y - h*0.58);
                break;
                
            case 'studio':
                // 몸체 (모던 그레이)
                this.ctx.fillStyle = '#bdc3c7';
                this.ctx.fillRect(x, y - h, w, h);
                
                // 측면 음영
                this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
                this.ctx.fillRect(x + w*0.8, y - h, w*0.2, h);

                // 창문 그리드
                this.ctx.fillStyle = '#dff9fb';
                const rows = 4;
                const cols = 2;
                const padX = w * 0.15;
                const padY = h * 0.1;
                const winW = (w - padX * (cols + 1)) / cols;
                const winH = (h - padY * (rows + 1)) / rows;

                for(let r=0; r<rows; r++) {
                    for(let c=0; c<cols; c++) {
                        this.ctx.fillRect(
                            x + padX + c*(winW + padX), 
                            y - h + padY + r*(winH + padY), 
                            winW, winH
                        );
                    }
                }
                
                // 옥상 구조물
                this.ctx.fillStyle = '#7f8c8d';
                this.ctx.fillRect(x + w*0.2, y - h - h*0.05, w*0.6, h*0.05);
                break;
                
            case 'factory':
                // 몸체 (산업용 회색)
                this.ctx.fillStyle = '#57606f';
                this.ctx.fillRect(x, y - h*0.6, w, h*0.6);
                
                // 창문 (노란 조명)
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.fillRect(x + w*0.1, y - h*0.35, w*0.2, h*0.15);
                this.ctx.fillRect(x + w*0.4, y - h*0.35, w*0.2, h*0.15);
                this.ctx.fillRect(x + w*0.7, y - h*0.35, w*0.2, h*0.15);

                // 굴뚝 (우측)
                this.ctx.fillStyle = '#2f3542';
                this.ctx.fillRect(x + w*0.75, y - h*0.9, w*0.15, h*0.3);
                
                // 연기 (피어오르는 효과)
                this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
                this.ctx.beginPath();
                this.ctx.arc(x + w*0.82, y - h*1.0, 3, 0, Math.PI*2);
                this.ctx.arc(x + w*0.88, y - h*1.15, 5, 0, Math.PI*2);
                this.ctx.arc(x + w*0.92, y - h*1.35, 7, 0, Math.PI*2);
                this.ctx.fill();

                // 톱니 지붕
                this.ctx.fillStyle = '#747d8c';
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - h*0.6);
                this.ctx.lineTo(x + w*0.25, y - h*0.8); // 첫 번째 봉우리
                this.ctx.lineTo(x + w*0.25, y - h*0.6);
                this.ctx.lineTo(x + w*0.5, y - h*0.8);  // 두 번째 봉우리
                this.ctx.lineTo(x + w*0.5, y - h*0.6);
                this.ctx.lineTo(x + w, y - h*0.6);      // 나머지 평평하게
                this.ctx.lineTo(x, y - h*0.6);
                this.ctx.fill();
                break;

            case 'firm':
                // 증권사 (고층 빌딩 느낌)
                // 메인 바디 (유리 커튼월)
                const fGrad = this.ctx.createLinearGradient(x, y - h, x + w, y);
                fGrad.addColorStop(0, '#2980b9');
                fGrad.addColorStop(0.5, '#3498db');
                fGrad.addColorStop(1, '#2980b9');
                this.ctx.fillStyle = fGrad;
                this.ctx.fillRect(x + w*0.1, y - h, w*0.8, h);
                
                // 창문 그리드 (세로선 강조)
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                for(let i=1; i<4; i++) {
                    this.ctx.fillRect(x + w*0.1 + (w*0.8 * i/4), y - h, 1, h);
                }
                // 가로선 (층 구분)
                for(let i=1; i<8; i++) {
                    this.ctx.fillRect(x + w*0.1, y - h + (h * i/8), w*0.8, 1);
                }

                // 상단 장식 (안테나/구조물)
                this.ctx.fillStyle = '#7f8c8d';
                this.ctx.fillRect(x + w*0.15, y - h - h*0.05, w*0.7, h*0.05);
                this.ctx.beginPath();
                this.ctx.moveTo(x + w*0.5, y - h - h*0.05);
                this.ctx.lineTo(x + w*0.5, y - h - h*0.15);
                this.ctx.strokeStyle = '#95a5a6';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();

                // 전광판 (Ticker) - 건물 중간쯤에 배치
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(x + w*0.1, y - h*0.6, w*0.8, h*0.1);
                // 전광판 내용
                this.ctx.fillStyle = '#2ecc71'; // Green arrow
                this.ctx.beginPath();
                this.ctx.moveTo(x + w*0.2, y - h*0.58);
                this.ctx.lineTo(x + w*0.25, y - h*0.52);
                this.ctx.lineTo(x + w*0.3, y - h*0.58);
                this.ctx.fill();
                this.ctx.fillStyle = '#e74c3c'; // Red arrow
                this.ctx.beginPath();
                this.ctx.moveTo(x + w*0.7, y - h*0.52);
                this.ctx.lineTo(x + w*0.75, y - h*0.58);
                this.ctx.lineTo(x + w*0.8, y - h*0.52);
                this.ctx.fill();

                // 입구
                this.ctx.fillStyle = '#2c3e50';
                this.ctx.fillRect(x + w*0.05, y - h*0.05, w*0.9, h*0.05);
                break;
                
            case 'harbor':
                // 컨테이너 박스 적재
                // 1층
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.fillRect(x, y - h*0.25, w*0.45, h*0.25);
                this.ctx.fillStyle = '#3498db';
                this.ctx.fillRect(x + w*0.5, y - h*0.25, w*0.45, h*0.25);
                // 2층
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.fillRect(x + w*0.25, y - h*0.5, w*0.45, h*0.25);
                
                // 크레인
                this.ctx.strokeStyle = '#2c3e50';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x + w*0.8, y);
                this.ctx.lineTo(x + w*0.8, y - h*0.8);
                this.ctx.lineTo(x + w*0.4, y - h*0.8);
                this.ctx.stroke();
                break;

            case 'data':
                // 몸체 (인더스트리얼 다크)
                this.ctx.fillStyle = '#34495e';
                this.ctx.fillRect(x, y - h, w, h);
                
                // 강화 코너 기둥
                this.ctx.fillStyle = '#2c3e50';
                this.ctx.fillRect(x, y - h, w*0.15, h);
                this.ctx.fillRect(x + w*0.85, y - h, w*0.15, h);

                // 서버 통풍구 및 상태등
                const dRows = 5;
                const dH = h * 0.8 / dRows;
                for(let i=0; i<dRows; i++) {
                    const py = y - h * 0.9 + i * dH;
                    // 통풍구
                    this.ctx.fillStyle = '#222';
                    this.ctx.fillRect(x + w*0.25, py, w*0.5, dH * 0.6);
                    
                    // 상태 LED (랜덤 깜빡임)
                    const blink = Math.sin(Date.now() * 0.01 + i * 10) > 0;
                    this.ctx.fillStyle = blink ? '#2ecc71' : '#c0392b';
                    this.ctx.fillRect(x + w*0.8, py + dH*0.2, 3, 3);
                }
                break;
                
            case 'airport':
                // 관제탑
                this.ctx.fillStyle = '#bdc3c7';
                this.ctx.fillRect(x + w*0.35, y - h*0.8, w*0.3, h*0.8);
                // 상단 유리
                this.ctx.fillStyle = '#3498db';
                this.ctx.fillRect(x + w*0.25, y - h, w*0.5, h*0.25);
                // 터미널 건물 (하단)
                this.ctx.fillStyle = '#95a5a6';
                this.ctx.fillRect(x, y - h*0.3, w, h*0.3);
                break;

            case 'hotel':
                // 호텔 (격자 창문)
                this.ctx.fillStyle = '#8e44ad';
                this.ctx.fillRect(x, y - h, w, h);
                this.ctx.fillStyle = '#f1c40f';
                
                // 창문 (비율 조정)
                const hWinW = w * 0.2;
                const hWinH = h * 0.08;
                const hGapY = h * 0.2;

                for(let i=0; i<2; i++) {
                    for(let j=0; j<4; j++) {
                        this.ctx.fillRect(x + w*0.2 + i*w*0.4, y - h*0.85 + j*hGapY, hWinW, hWinH);
                    }
                }
                // 간판
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 8px Arial';
                this.ctx.textAlign = 'center'; // 중앙 정렬
                this.ctx.fillText("HOTEL", x + w/2, y - h - 5);
                break;

            case 'landmark':
                // 골드 그라데이션
                const lGrad = this.ctx.createLinearGradient(x, y - h, x + w, y);
                lGrad.addColorStop(0, '#f1c40f');
                lGrad.addColorStop(0.5, '#f39c12');
                lGrad.addColorStop(1, '#f1c40f');
                
                // 1. 기단부
                this.ctx.fillStyle = '#d35400';
                this.ctx.fillRect(x, y - h*0.15, w, h*0.15);
                
                // 2. 중층부
                this.ctx.fillStyle = lGrad;
                this.ctx.fillRect(x + w*0.1, y - h*0.6, w*0.8, h*0.45);
                
                // 3. 상층부
                this.ctx.fillRect(x + w*0.2, y - h*0.9, w*0.6, h*0.3);
                
                // 4. 첨탑
                this.ctx.beginPath();
                this.ctx.moveTo(x + w*0.2, y - h*0.9);
                this.ctx.lineTo(x + w*0.5, y - h);
                this.ctx.lineTo(x + w*0.8, y - h*0.9);
                this.ctx.fillStyle = '#e67e22';
                this.ctx.fill();
                
                // 5. 장식 라인 (수직)
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.fillRect(x + w*0.45, y - h*0.85, w*0.1, h*0.8);
                
                // 6. 항공 장애등 (빛나는 효과)
                this.ctx.shadowColor = '#fff';
                this.ctx.shadowBlur = 10;
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(x + w*0.5, y - h, 2, 0, Math.PI*2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
                break;
        }
        
        this.ctx.restore();
    }
}