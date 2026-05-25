export class GameState {
    constructor(players) {
        this.players = players;
        this.currentPlayerIndex = 0;
        this.direction = 1;
        this.topDiscardCard = null;
        this.currentActiveColor = null;
    }

    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
        return this.currentPlayerIndex;
    }

    reverseDirection() {
        this.direction *= -1;
    }

    updateTopCard(card, activeColor = null) {
        this.topDiscardCard = card;
        if (card.isWild) {
            this.currentActiveColor = activeColor;
        } else {
            this.currentActiveColor = card.color;
        }
    }
}
