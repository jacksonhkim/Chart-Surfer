class Player {
    constructor(initialBalance, initialTarget) {
        this.balance = initialBalance;
        this.target = initialTarget;
        this.position = 0; // 0: None, 1: Long, -1: Short
        this.betScale = 1.0; // 기본 배팅 100%
        this.invested = 0;
        this.entryPrice = 0;
        this.profit = 0;
    }

    reset(balance, target) {
        this.balance = balance;
        this.target = target;
        this.position = 0;
        this.invested = 0;
        this.entryPrice = 0;
        this.profit = 0;
    }

    calculateProfit(currentPrice) {
        if (this.position !== 0) {
            const diff = (currentPrice - this.entryPrice) / this.entryPrice;
            this.profit = this.invested * diff * this.position;
        } else {
            this.profit = 0;
        }
    }
}