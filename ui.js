class UIManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
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

        const allValues = candles.flatMap(c => [c.low, c.high]);
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min || 1;
        
        // UI 레이아웃에 맞춰 차트 영역 조정 (Bet 버튼 위까지만 표시)
        const bottomPadding = w < 600 ? 170 : 200;
        const topPadding = 50;
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
        
        this.ctx.fillStyle = CONFIG.COLORS.TEXT;
        this.ctx.font = "20px Arial";
        this.ctx.textAlign = "left";
        
        if (timer < 10000) {
            this.ctx.fillStyle = Math.floor(timer / 250) % 2 === 0 ? '#ff4757' : '#ffffff';
        } else {
            this.ctx.fillStyle = '#ffffff';
        }
        this.ctx.fillText(`TIME: ${(timer / 1000).toFixed(1)}`, 20, 40);
        
        const profit = player.profit;
        let profitText = `수익: ${Math.floor(profit).toLocaleString()}`;
        this.ctx.fillStyle = profit >= 0 ? '#ff4757' : '#5352ed';
        if (profit === 0) this.ctx.fillStyle = '#fff';
        this.ctx.fillText(profitText, 20, 70);
        
        const totalAsset = player.balance + player.invested;
        this.ctx.textAlign = "right";
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`목표: ${player.target.toLocaleString()}`, this.canvas.width - 20, 40);
        this.ctx.fillText(`자산: ${Math.floor(totalAsset).toLocaleString()}`, this.canvas.width - 20, 70);

        let posText = "NEUTRAL";
        if (player.position === 1) posText = "LONG ▲";
        if (player.position === -1) posText = "SHORT ▼";
        
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = "center";
        this.ctx.font = "bold 24px Arial";
        this.ctx.fillText(posText, this.canvas.width / 2, 50);
        
        let newsY = 150;

        if (combo > 1) {
            newsY = 210;
            this.ctx.save();
            if (combo >= 2) {
                this.ctx.fillStyle = '#ff4757';
                this.ctx.font = "bold 20px Arial";
                this.ctx.shadowColor = "#ff4757";
                this.ctx.shadowBlur = 15;
                this.ctx.fillText("🔥 FEVER MODE x2 🔥", this.canvas.width / 2, 135);
            }
            this.ctx.fillStyle = '#ffeb3b';
            this.ctx.font = "bold 30px Arial";
            this.ctx.shadowColor = "#ff9800";
            this.ctx.shadowBlur = 10;
            this.ctx.fillText(`${combo} COMBO!`, this.canvas.width / 2, 100);
            this.ctx.restore();

            if (comboTimer > 0) {
                const barW = 200;
                const barH = 8;
                const bx = this.canvas.width / 2 - barW / 2;
                const by = 160;
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
            this.ctx.font = "bold 28px Arial";
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
            this.ctx.font = "bold 20px Arial";
            this.ctx.textAlign = "right";
            this.ctx.fillText(`SLOW MODE ${(items.slow.timer/1000).toFixed(1)}`, this.canvas.width - 90, 130);
        }

        // 2. VIEW 모드 (예측 화살표)
        if (items.view.timer > 0) {
            const trend = chart.getTrend();
            let text = "➡️";
            if (trend === 1) text = "↗️ UP";
            if (trend === -1) text = "↘️ DOWN";
            
            this.ctx.fillStyle = '#a55eea';
            this.ctx.font = "bold 30px Arial";
            this.ctx.textAlign = "right";
            this.ctx.fillText(text, this.canvas.width - 90, 170);
        }
    }

    updateBetButton(player) {
        const btn = document.getElementById('btn-bet');
        if(!btn) return;
        btn.innerHTML = `BET<br>${player.betScale * 100}%`;
    }
}