class RealEstateManager {
    constructor() {
        // 건물 목록 정의
        this.catalog = [
            { 
                id: 'house', name: '주택', baseCost: 200000, baseRent: 20000, 
                desc: '임대 +$20k', type: 'income' 
            },
            { 
                id: 'market', name: '마트', baseCost: 400000, baseRent: 40000, 
                desc: '임대 +$40k', type: 'income' 
            },
            { 
                id: 'studio', name: '오피스텔', baseCost: 600000, baseRent: 60000, 
                desc: '임대 +$60k', type: 'income' 
            },
            { 
                id: 'factory', name: '공장', baseCost: 1000000, baseRent: 100000, 
                desc: '임대 +$100k', type: 'income' 
            },
            { 
                id: 'firm', name: '증권사', baseCost: 1500000, baseRent: 150000, 
                desc: '수익률 +5%', type: 'buff_profit' 
            },
            { 
                id: 'data', name: '데이터센터', baseCost: 3500000, baseRent: 350000, 
                desc: 'VIEW 아이템', type: 'buff_item' 
            },
            { 
                id: 'hotel', name: '호텔', baseCost: 7500000, baseRent: 750000, 
                desc: '임대 +$750k', type: 'income' 
            },
            { 
                id: 'landmark', name: '랜드마크', baseCost: 10000000, baseRent: 1000000, 
                desc: '명예 +$1m', type: 'income' 
            }
        ];
        
        this.inventory = []; // 보유한 건물 ID 목록
        this.marketTrend = 1.0; // 부동산 경기 (0.8 ~ 1.5)
        this.marketEvent = null; // 현재 시장 이벤트 텍스트
        this.animatingBuildings = []; // 애니메이션 중인 건물 { index, yOffset, velocity }
        this.scrollOffset = 0; // 스크롤 위치
        this.skylineScrollOffset = 0; // 스카이라인 가로 스크롤 위치
    }

    reset() {
        this.inventory = [];
        this.marketTrend = 1.0;
        this.marketEvent = null;
        this.animatingBuildings = [];
        this.scrollOffset = 0;
        this.skylineScrollOffset = 0;
    }

    // 스테이지 종료 후 부동산 시장 변동 발생
    updateMarket() {
        const rand = Math.random();
        if (rand < 0.2) {
            this.marketTrend = 0.8;
            this.marketEvent = "📉 부동산 침체: 가격 및 수익 하락";
        } else if (rand > 0.8) {
            this.marketTrend = 1.3;
            this.marketEvent = "📈 신도시 개발 호재: 가격 폭등!";
        } else {
            this.marketTrend = 1.0;
            this.marketEvent = "➖ 부동산 시장 안정세";
        }
    }

    getCost(building) {
        return Math.floor(building.baseCost * this.marketTrend);
    }

    getRent(building) {
        return Math.floor(building.baseRent * this.marketTrend);
    }

    buy(player, buildingIndex) {
        const building = this.catalog[buildingIndex];
        const cost = this.getCost(building);

        if (player.balance >= cost) {
            player.balance -= cost;
            this.inventory.push(building.id);
            
            // 애니메이션 추가 (위에서 떨어짐)
            this.animatingBuildings.push({
                index: this.inventory.length - 1,
                yOffset: 600, // 화면 위쪽에서 시작
                velocity: 0
            });
            
            return true;
        }
        return false;
    }

    sell(player, buildingIndex) {
        const building = this.catalog[buildingIndex];
        const idx = this.inventory.indexOf(building.id);
        
        if (idx !== -1) {
            const cost = this.getCost(building); // 현재 시세로 판매
            player.balance += cost;
            this.inventory.splice(idx, 1); // 인벤토리에서 제거
            
            // 애니메이션 인덱스 조정 (삭제된 인덱스보다 뒤에 있는 것들 당기기)
            this.animatingBuildings = this.animatingBuildings.filter(a => a.index !== idx);
            this.animatingBuildings.forEach(a => {
                if (a.index > idx) a.index--;
            });
            
            return true;
        }
        return false;
    }

    countOwned(id) {
        return this.inventory.filter(x => x === id).length;
    }

    // 현재 보유 건물의 총 임대 수익 계산 (5초마다 호출)
    calculateRent() {
        let totalRent = 0;
        this.inventory.forEach(id => {
            const b = this.catalog.find(x => x.id === id);
            totalRent += this.getRent(b);
        });
        return totalRent;
    }

    // 다음 스테이지 시작 시 버프 효과 적용 (임대료 제외)
    applyEffects(player, gameItems) {
        let profitBonus = 0;

        this.inventory.forEach(id => {
            const b = this.catalog.find(x => x.id === id);
            if (b.type === 'buff_profit') {
                profitBonus += 0.05;
            }
            if (b.type === 'buff_item') {
                gameItems.view.count += 1;
            }
        });

        player.profitMultiplier = 1.0 + profitBonus;
        
        return { profitBonus };
    }

    // 보유 부동산 총 평가액
    getTotalValuation() {
        let total = 0;
        this.inventory.forEach(id => {
            const b = this.catalog.find(x => x.id === id);
            total += this.getCost(b); // 현재 시세 기준
        });
        return total;
    }

    // 애니메이션 업데이트 (중력 효과)
    updateAnimations(deltaTime) {
        for (let i = this.animatingBuildings.length - 1; i >= 0; i--) {
            const anim = this.animatingBuildings[i];
            
            // 중력 가속도 적용
            anim.velocity += 0.05 * deltaTime; 
            anim.yOffset -= anim.velocity * (deltaTime / 16);

            // 바닥 착지 및 바운스
            if (anim.yOffset <= 0) {
                if (Math.abs(anim.velocity) > 10) { // 일정 속도 이상이면 바운스
                    anim.yOffset = 0;
                    anim.velocity = -anim.velocity * 0.4; // 탄성 계수
                } else {
                    anim.yOffset = 0;
                    this.animatingBuildings.splice(i, 1); // 애니메이션 종료
                }
            }
        }
    }

    // 스카이라인 표시용 데이터 (종류별 그룹화)
    getSkylineData() {
        const grouped = [];
        const idMap = {};
        this.inventory.forEach((id, idx) => {
            if (idMap[id] === undefined) {
                idMap[id] = grouped.length;
                grouped.push({ id, count: 0, indices: [] });
            }
            grouped[idMap[id]].count++;
            grouped[idMap[id]].indices.push(idx);
        });
        return grouped;
    }
}