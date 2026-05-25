import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import { UnoGame } from './gameLogic/game';
import { AIPlayer } from './gameLogic/aiPlayer';

function useForceUpdate() {
    const [, setTick] = useState(0);
    return useCallback(() => {
        setTick(tick => tick + 1);
    }, []);
}

// Reusable Premium Card Component
const Card = ({ card, onClick, isPlayable, style = {} }) => {
    const getCardClass = () => {
        if (!card) return 'uno-card dark';
        const color = card.color ? card.color.toLowerCase() : 'dark';
        return `uno-card ${color} ${isPlayable ? 'playable' : 'unplayable'}`;
    };

    const getCardLabel = () => {
        if (!card) return '';
        if (card.type === 'Number') return card.value;
        if (card.type === 'Wild Draw Four') return '+4';
        if (card.type === 'Draw Two') return '+2';
        if (card.type === 'Reverse') return '↻';
        if (card.type === 'Skip') return '⊘';
        return '★';
    };

    return (
        <div className={getCardClass()} onClick={onClick} style={style}>
            <div className="card-mini-label">{getCardLabel()}</div>
            <div className="card-oval"></div>
            <div className="card-content">{getCardLabel()}</div>
            <div className="card-mini-label bottom">{getCardLabel()}</div>
        </div>
    );
};

export default function App() {
    const forceUpdate = useForceUpdate();
    
    // Core Engine Refs
    const gameRef = useRef(null);
    const aisRef = useRef([]); 
    const renderKeyRef = useRef(0);
    
    const [theme, setTheme] = useState('dark');
    const [scene, setScene] = useState('splash'); // 'splash', 'lobby', 'game'
    const [playerCount, setPlayerCount] = useState(2); 
    
    const [gameState, setGameState] = useState({
        humanScore: 0,
        aiScore: 0,
        difficulty: 'Hard',
        actionLog: "Match Started! Good Luck.",
        isWildModalOpen: false,
        pendingWildCard: null,
        gameOverModal: null
    });

    const patchState = (updates) => setGameState(prev => ({...prev, ...updates}));

    useEffect(() => {
        document.body.className = `theme-${theme}`;
    }, [theme]);

    const startNewGame = useCallback((diff = gameState.difficulty, count = playerCount) => {
        const game = new UnoGame(count);
        game.startGame();
        gameRef.current = game;
        
        const ais = [];
        for (let i = 1; i < count; i++) {
            ais.push(new AIPlayer(i, diff));
        }
        aisRef.current = ais;
        
        renderKeyRef.current += 1;
        
        patchState({
            difficulty: diff,
            actionLog: `Game Started! ${count} Player FFA.`,
            gameOverModal: null
        });
        forceUpdate();
    }, [gameState.difficulty, playerCount, forceUpdate]);

    useEffect(() => {
        startNewGame();
        // eslint-disable-next-line
    }, []);

    const executeAiTurn = useCallback(() => {
        const game = gameRef.current;
        const currentIdx = game?.gameState?.currentPlayerIndex;
        if (!game || currentIdx === 0) return; 

        const ai = aisRef.current.find(a => a.playerIndex === currentIdx);
        if (!ai) return;

        setTimeout(() => {
            if (game.gameState.currentPlayerIndex !== currentIdx) return;
            
            const hand = game.players[currentIdx];
            const cardToPlay = ai.selectCard(hand, game.gameState, game.rulesEngine);

            if (cardToPlay) {
                let wildColor = null;
                if (cardToPlay.isWild) wildColor = ai.chooseWildColor(hand);

                aisRef.current.forEach(otherAi => {
                    if (otherAi.playerIndex !== currentIdx) {
                        otherAi.observePlay(currentIdx, cardToPlay, game.gameState.currentActiveColor);
                    }
                });

                game.rulesEngine.playCard(currentIdx, cardToPlay, wildColor);
                renderKeyRef.current += 1;
                
                const typeText = cardToPlay.type === 'Number' ? cardToPlay.value : cardToPlay.type;
                const cardName = `${wildColor || cardToPlay.color || ''} ${typeText}`;
                patchState({ actionLog: `AI ${currentIdx} played: ${cardName}` });
                
                checkWinConditions();
            } else {
                const drawn = game.deck.draw();
                if (drawn) {
                    hand.addCard(drawn);
                    aisRef.current.forEach(otherAi => {
                        if (otherAi.playerIndex !== currentIdx) {
                            otherAi.observeDraw(currentIdx, game.gameState);
                        }
                    });
                }
                game.gameState.nextPlayer();
                patchState({ actionLog: `AI ${currentIdx} drew a card.` });
                checkWinConditions(); 
            }
        }, 1200); 
    }, [forceUpdate]);

    const checkWinConditions = useCallback(() => {
        const game = gameRef.current;
        if (!game) return;

        for (let i = 0; i < game.players.length; i++) {
            if (game.players[i].cards.length === 0) {
                if (i === 0) {
                    patchState({ humanScore: gameState.humanScore + 1, gameOverModal: { winner: 'Human' } });
                } else {
                    patchState({ aiScore: gameState.aiScore + 1, gameOverModal: { winner: `AI ${i}` } });
                }
                forceUpdate();
                return;
            }
        }

        forceUpdate();

        if (game.gameState.currentPlayerIndex !== 0) {
            executeAiTurn();
        }
    }, [gameState.humanScore, gameState.aiScore, executeAiTurn, forceUpdate]);

    const handleHumanPlayClick = (card) => {
        const game = gameRef.current;
        if (game.gameState.currentPlayerIndex !== 0) return;

        // Check if card is actually playable according to rules
        const validCards = game.players[0].getValidPlayableCards(game.rulesEngine);
        if (!validCards.includes(card)) return;

        if (card.isWild) {
            patchState({ isWildModalOpen: true, pendingWildCard: card });
            return;
        }

        applyHumanPlay(card, null);
    };

    const applyHumanPlay = (card, wildColor) => {
        const game = gameRef.current;
        aisRef.current.forEach(ai => ai.observePlay(0, card, game.gameState.currentActiveColor));
        const success = game.rulesEngine.playCard(0, card, wildColor);
        
        if (success) {
            renderKeyRef.current += 1;
            const typeText = card.type === 'Number' ? card.value : card.type;
            const cardName = `${wildColor || card.color || ''} ${typeText}`;
            patchState({ isWildModalOpen: false, pendingWildCard: null, actionLog: `You played: ${cardName}` });
            checkWinConditions();
        }
    };

    const handleHumanDraw = () => {
        const game = gameRef.current;
        if (game.gameState.currentPlayerIndex !== 0) return;

        const drawn = game.deck.draw();
        if (drawn) {
            game.players[0].addCard(drawn);
            aisRef.current.forEach(ai => ai.observeDraw(0, game.gameState));
        }
        
        game.gameState.nextPlayer();
        patchState({ actionLog: `You drew a card.` });
        checkWinConditions();
    };

    const getColorHash = (col) => {
        if (col === 'Red') return 'var(--uno-red)';
        if (col === 'Blue') return 'var(--uno-blue)';
        if (col === 'Green') return 'var(--uno-green)';
        if (col === 'Yellow') return 'var(--uno-yellow)';
        return 'transparent';
    };

    // ==========================================
    // RENDER SCREENS
    // ==========================================

    const renderSplash = () => (
        <div className="splash-screen fadeIn">
            <h1 className="splash-title">SmartPlay</h1>
            <p className="splash-subtitle">Next-Gen Agentic UNO</p>
            <button className="primary-btn mt-5" onClick={() => setScene('lobby')}>ENTER ARENA</button>
            <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
    );

    const renderLobby = () => (
        <div className="lobby-screen scaleIn">
            <div className="lobby-card glass">
                <h2 className="lobby-header">Match Settings</h2>
                
                <p className="pile-label">Opponents</p>
                <div className="picker-group">
                    {[2, 3, 4].map(num => (
                        <button 
                            key={num} 
                            className={`picker-btn ${playerCount === num ? 'active' : ''}`}
                            onClick={() => setPlayerCount(num)}
                        >{num === 2 ? 'Duel (1 AI)' : `${num-1} AI Players`}</button>
                    ))}
                </div>
                
                <p className="pile-label">AI Intelligence</p>
                <div className="picker-group">
                    {['Easy', 'Medium', 'Hard'].map(diff => (
                        <button 
                            key={diff} 
                            className={`picker-btn ${gameState.difficulty === diff ? 'active' : ''}`}
                            onClick={() => patchState({ difficulty: diff })}
                        >{diff}</button>
                    ))}
                </div>

                <button className="primary-btn mt-5 pulse-glow" onClick={() => {
                    setScene('game');
                    startNewGame(gameState.difficulty, playerCount);
                }}>START MATCH</button>
                
                <div style={{marginTop: 30}}>
                    <button className="picker-btn" onClick={() => setScene('splash')}>BACK</button>
                </div>
            </div>
            <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
    );

    const renderGame = () => {
        if (!gameRef.current) return <div/>;

        const game = gameRef.current;
        const humanHand = game.players[0];
        const topCard = game.gameState.topDiscardCard;
        const isHumanTurn = game.gameState.currentPlayerIndex === 0;
        const activeColor = game.gameState.currentActiveColor;

        const validCards = isHumanTurn ? humanHand.getValidPlayableCards(game.rulesEngine) : [];
        const opponents = game.players.slice(1).map((hand, i) => ({ hand, index: i + 1 }));
        
        return (
            <div className="game-screen fadeIn">
                <div className="header-panel glass">
                    <div className="score-hud">
                        <div className="score-badge">WIN STREAK: {gameState.humanScore}</div>
                        <h2 style={{fontSize: '1rem', margin: 0, fontWeight: 300, opacity: 0.6}}>Difficulty: {gameState.difficulty}</h2>
                    </div>
                    <div style={{display: 'flex', gap: 10}}>
                        <ThemeToggle theme={theme} setTheme={setTheme} />
                        <button className="picker-btn" onClick={() => setScene('lobby')}>QUIT</button>
                    </div>
                </div>

                <div className="action-bar">
                    <div className={`status-pill glass ${isHumanTurn ? 'pulse-active' : ''}`}>
                        {isHumanTurn ? "● YOUR ACTION REQUIRED" : `AI ${game.gameState.currentPlayerIndex} IS ANALYZING...`} 
                        <span style={{opacity: 0.5, marginLeft: 10}}>|</span>
                        <span style={{marginLeft: 10}}>{gameState.actionLog}</span>
                    </div>
                </div>

                <div className="table-layout">
                    {/* DIAMOND LAYOUT FOR OPPONENTS */}
                    {opponents.map((opp, idx) => {
                        let positionStyle = {};
                        if (playerCount === 2) {
                            positionStyle = { top: '40px', left: '50%', transform: 'translateX(-50%)' };
                        } else if (playerCount === 3) {
                            positionStyle = idx === 0 ? { top: '40px', left: '25%', transform: 'translateX(-50%)' } : { top: '40px', right: '25%', transform: 'translateX(50%)' };
                        } else if (playerCount === 4) {
                            if (idx === 0) positionStyle = { left: '100px', top: '50%', transform: 'translateY(-50%)' };
                            else if (idx === 1) positionStyle = { top: '40px', left: '50%', transform: 'translateX(-50%)' };
                            else if (idx === 2) positionStyle = { right: '100px', top: '50%', transform: 'translateY(-50%)' };
                        }

                        const isSelfTurn = game.gameState.currentPlayerIndex === opp.index;

                        return (
                            <div key={opp.index} className={`ai-hand-zone ${isSelfTurn ? 'ai-active' : ''}`} style={positionStyle}>
                                <div className="opp-avatar">AI {opp.index}</div>
                                <div className="opp-cards-summary">
                                    <div className="card-back-sm"></div>
                                    <span style={{fontWeight: 900}}>{opp.hand.cards.length}</span>
                                </div>
                            </div>
                        );
                    })}

                    {/* CENTER BOARD AREA */}
                    <div className="center-board">
                        <div className="piles-container">
                            <div className="pile-group">
                                <span className="pile-label">Draw Pile</span>
                                <div className="deck-pile" onClick={handleHumanDraw} style={{ opacity: isHumanTurn ? 1 : 0.5, cursor: isHumanTurn ? 'pointer' : 'default' }}>
                                    <div className="deck-inner">UNO</div>
                                </div>
                            </div>

                            <div className="pile-group">
                                <span className="pile-label">Discard Pile</span>
                                {topCard && (
                                    <div key={renderKeyRef.current} className="top-discard-anim">
                                        <Card card={topCard} isPlayable={false} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{display: 'flex', gap: 20, alignItems: 'center'}}>
                            <div style={{
                                width: 24, height: 24, borderRadius: '50%', 
                                background: getColorHash(activeColor),
                                border: '2px solid white',
                                boxShadow: '0 0 15px ' + getColorHash(activeColor)
                            }}></div>
                            <span style={{fontWeight: 800, letterSpacing: 2, fontSize: '0.8rem'}}>TARGET: {activeColor || 'WILD'}</span>
                            <span style={{fontSize: '1.5rem', opacity: 0.5}}>{game.gameState.direction === 1 ? '↻' : '↺'}</span>
                        </div>
                    </div>
                </div>

                {/* HUMAN PLAYER HAND at BOTTOM */}
                <div className="human-hand-zone">
                    <p className="pile-label" style={{marginBottom: 10}}>Your Arsenal ({humanHand.cards.length} Cards)</p>
                    <div className="cards-container fanned-hand">
                        {humanHand.cards.map((card, i) => {
                            const isPlayable = isHumanTurn && validCards.includes(card);
                            const total = humanHand.cards.length;
                            const angle = total > 1 ? (i / (total - 1) - 0.5) * 30 : 0;
                            const yOffset = Math.pow(Math.abs(angle / 15), 2) * 15;

                            return (
                                <Card 
                                    key={i} 
                                    card={card}
                                    isPlayable={isPlayable}
                                    onClick={() => handleHumanPlayClick(card)}
                                    style={{ 
                                        transform: `rotate(${angle}deg) translateY(${yOffset}px)`,
                                        zIndex: i 
                                    }}
                                />
                            )
                        })}
                    </div>
                </div>

                {/* MODALS */}
                {gameState.isWildModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content glass scaleIn">
                            <h2 className="lobby-header">Select Power Color</h2>
                            <div className="color-grid">
                                {['Red', 'Blue', 'Green', 'Yellow'].map(c => (
                                    <button 
                                        key={c} 
                                        className="color-choice" 
                                        style={{ backgroundColor: getColorHash(c) }}
                                        onClick={() => applyHumanPlay(gameState.pendingWildCard, c)}
                                    ></button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {gameState.gameOverModal && (
                    <div className="modal-overlay">
                        <div className="modal-content glass scaleIn">
                            <h1 style={{fontSize: '6rem', margin: 0}}>{gameState.gameOverModal.winner === 'Human' ? '🏆' : '💀'}</h1>
                            <h2 className="lobby-header">{gameState.gameOverModal.winner === 'Human' ? 'ARENA CONQUERED!' : 'AGENT SURVIVAL FAILED'}</h2>
                            <p style={{opacity: 0.6, marginBottom: 30}}>{gameState.gameOverModal.winner === 'Human' ? 'You outsmarted the neural network.' : 'The AI has predicted your every move.'}</p>
                            <button className="primary-btn" onClick={() => startNewGame()}>REMATCH</button>
                            <div style={{marginTop: 20}}>
                                <button className="picker-btn" onClick={() => setScene('lobby')}>LOBBY</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="app-wrapper">
            {scene === 'splash' && renderSplash()}
            {scene === 'lobby' && renderLobby()}
            {scene === 'game' && renderGame()}
        </div>
    );
}

const ThemeToggle = ({theme, setTheme}) => (
    <button 
        className="theme-toggle glass" 
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
        {theme === 'light' ? '🌙' : '☀️'}
    </button>
);
