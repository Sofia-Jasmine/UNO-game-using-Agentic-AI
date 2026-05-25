export class Card {
    constructor(color, type, value, isWild, isAction) {
        this.color = color;
        this.type = type;
        this.value = value;
        this.isWild = isWild;
        this.isAction = isAction;
    }
}

export class Deck {
    constructor() {
        this.cards = [];
        this.discardPile = [];
        this._generateDeck();
        this.shuffle();
    }

    _generateDeck() {
        const colors = ['Red', 'Yellow', 'Green', 'Blue'];
        const actions = ['Skip', 'Reverse', 'Draw Two'];

        colors.forEach(color => {
            this.cards.push(new Card(color, 'Number', 0, false, false));
            for (let v = 1; v <= 9; v++) {
                this.cards.push(new Card(color, 'Number', v, false, false));
                this.cards.push(new Card(color, 'Number', v, false, false));
            }
            actions.forEach(action => {
                this.cards.push(new Card(color, action, null, false, true));
                this.cards.push(new Card(color, action, null, false, true));
            });
        });

        for (let i = 0; i < 4; i++) {
            this.cards.push(new Card(null, 'Wild', null, true, true));
            this.cards.push(new Card(null, 'Wild Draw Four', null, true, true));
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        if (this.cards.length === 0) {
            this._reshuffleDiscardPile();
        }
        if (this.cards.length === 0) return null;
        return this.cards.pop();
    }

    discard(card) {
        this.discardPile.push(card);
    }

    _reshuffleDiscardPile() {
        if (this.discardPile.length <= 1) return;
        const topCard = this.discardPile.pop();
        this.cards = this.discardPile;
        this.discardPile = [topCard];
        this.shuffle();
    }
}

export class Hand {
    constructor() {
        this.cards = [];
    }
    
    addCard(card) {
        this.cards.push(card);
    }
    
    removeCard(card) {
        const index = this.cards.indexOf(card);
        if (index > -1) {
            this.cards.splice(index, 1);
            return true;
        }
        return false;
    }
    
    getValidPlayableCards(rulesEngine) {
        return this.cards.filter(card => rulesEngine.isValidMove(card));
    }
}
