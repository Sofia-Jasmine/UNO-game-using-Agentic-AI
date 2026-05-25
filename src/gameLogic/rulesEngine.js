export class RulesEngine {
    constructor(gameState, deck) {
        this.gameState = gameState;
        this.deck = deck;
    }

    isValidMove(card) {
        const topCard = this.gameState.topDiscardCard;
        const activeColor = this.gameState.currentActiveColor;

        if (!topCard) return true;
        if (card.isWild) return true;
        if (card.color === activeColor) return true;
        if (card.type === 'Number' && topCard.type === 'Number' && card.value === topCard.value) return true;
        if (card.isAction && !card.isWild && card.type === topCard.type) return true;

        return false;
    }

    applyCardEffect(card) {
        const gs = this.gameState;
        if (card.type === 'Skip') {
            gs.nextPlayer();
        } else if (card.type === 'Reverse') {
            gs.reverseDirection();
            if (gs.players.length === 2) {
                gs.nextPlayer();
            }
        } else if (card.type === 'Draw Two') {
            const nextIdx = (gs.currentPlayerIndex + gs.direction + gs.players.length) % gs.players.length;
            for (let i = 0; i < 2; i++) {
                const drawn = this.deck.draw();
                if (drawn) gs.players[nextIdx].addCard(drawn);
            }
            gs.nextPlayer();
        } else if (card.type === 'Wild Draw Four') {
            const nextIdx = (gs.currentPlayerIndex + gs.direction + gs.players.length) % gs.players.length;
            for (let i = 0; i < 4; i++) {
                const drawn = this.deck.draw();
                if (drawn) gs.players[nextIdx].addCard(drawn);
            }
            gs.nextPlayer();
        }
    }

    playCard(playerIndex, card, wildColor = null) {
        if (playerIndex !== this.gameState.currentPlayerIndex) return false;
        
        const hand = this.gameState.players[playerIndex];
        if (!hand.cards.includes(card)) return false;
        if (!this.isValidMove(card)) return false;

        hand.removeCard(card);
        this.deck.discard(card);
        this.gameState.updateTopCard(card, wildColor);
        
        if (card.isAction) {
            this.applyCardEffect(card);
        }
        
        this.gameState.nextPlayer();
        return true;
    }

    checkWinCondition(hand) {
        return hand.cards.length === 0;
    }
}
