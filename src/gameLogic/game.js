import { Deck, Hand } from './models';
import { GameState } from './gameState';
import { RulesEngine } from './rulesEngine';

export class UnoGame {
    constructor(numPlayers = 2) {
        this.deck = new Deck();
        this.players = Array.from({ length: numPlayers }, () => new Hand());
        this.gameState = new GameState(this.players);
        this.rulesEngine = new RulesEngine(this.gameState, this.deck);
    }

    startGame() {
        for (let i = 0; i < 7; i++) {
            this.players.forEach(p => p.addCard(this.deck.draw()));
        }
        
        let firstCard = this.deck.draw();
        while (firstCard && firstCard.isAction) {
            this.deck.cards.unshift(firstCard);
            firstCard = this.deck.draw();
        }
        if (firstCard) {
            this.gameState.updateTopCard(firstCard);
            this.deck.discard(firstCard);
        }
    }
}
