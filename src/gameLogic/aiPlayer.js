export class OpponentModel {
    constructor(opponentId) {
        this.opponentId = opponentId;
        this.lackingColors = new Set();
    }
    registerOpponentDraw(activeColor) {
        if (activeColor) this.lackingColors.add(activeColor);
    }
    registerOpponentPlay(card) {
        if (card.color && this.lackingColors.has(card.color)) {
            this.lackingColors.delete(card.color);
        }
    }
}

export class HeuristicScorer {
    constructor() {
        this.weights = {
            sameColor: 15,
            highNumberMul: 2,
            actionCard: 20,
            actionUrgentBonus: 30,
            wildCard: -25,
            wildUrgent: 50,
            colorVulnerability: 40,
            colorDensityBonus: 5
        };
    }
    scoreCard(card, hand, gameState, opponentModel = null) {
        let score = 0;
        const nextIdx = (gameState.currentPlayerIndex + gameState.direction + gameState.players.length) % gameState.players.length;
        const oppHandSize = gameState.players[nextIdx].cards.length;
        const isOppWinning = oppHandSize <= 2;

        if (card.isWild) {
            score += isOppWinning ? this.weights.wildUrgent : this.weights.wildCard;
            return score;
        }

        if (card.color && card.color === gameState.currentActiveColor) score += this.weights.sameColor;
        if (card.type === 'Number' && card.value !== null) score += (card.value * this.weights.highNumberMul);
        if (card.isAction && !card.isWild) {
            score += this.weights.actionCard;
            if (isOppWinning) score += this.weights.actionUrgentBonus;
        }

        if (opponentModel && card.color) {
            if (opponentModel.lackingColors.has(card.color) && card.color !== gameState.currentActiveColor) {
                score += this.weights.colorVulnerability;
            }
        }

        if (card.color) {
            const count = hand.cards.filter(c => c.color === card.color).length;
            score += (count * this.weights.colorDensityBonus);
        }

        return score;
    }
}

export class AIPlayer {
    constructor(playerIndex, difficulty = 'Hard') {
        this.playerIndex = playerIndex;
        this.difficulty = difficulty;
        this.scorer = new HeuristicScorer();
        this.opponentModels = {};
    }

    getOpponentModel(index) {
        if (!this.opponentModels[index]) this.opponentModels[index] = new OpponentModel(index);
        return this.opponentModels[index];
    }

    selectCard(hand, gameState, rulesEngine) {
        const validCards = hand.getValidPlayableCards(rulesEngine);
        if (validCards.length === 0) return null;

        if (this.difficulty === 'Easy') {
            return validCards[Math.floor(Math.random() * validCards.length)];
        }

        let bestCard = null;
        let bestScore = -Infinity;
        const nextIdx = (this.playerIndex + gameState.direction + gameState.players.length) % gameState.players.length;
        const oppModel = this.difficulty === 'Hard' ? this.getOpponentModel(nextIdx) : null;

        for (const card of validCards) {
            const score = this.scorer.scoreCard(card, hand, gameState, oppModel);
            if (score > bestScore) {
                bestScore = score;
                bestCard = card;
            }
        }
        return bestCard || validCards[0];
    }

    chooseWildColor(hand) {
        const counts = { Red: 0, Yellow: 0, Green: 0, Blue: 0 };
        hand.cards.forEach(c => {
            if (c.color) counts[c.color]++;
        });
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    observeDraw(playerIndex, gameState) {
        if (this.difficulty === 'Hard' && playerIndex !== this.playerIndex) {
            this.getOpponentModel(playerIndex).registerOpponentDraw(gameState.currentActiveColor);
        }
    }

    observePlay(playerIndex, card) {
        if (this.difficulty === 'Hard' && playerIndex !== this.playerIndex) {
            this.getOpponentModel(playerIndex).registerOpponentPlay(card);
        }
    }
}
