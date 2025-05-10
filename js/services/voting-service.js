// services/voting-service.js
import gameModel from '../models/game-model.js';
import EventEmitter from '../utils/event-emitter.js';

export class VotingService extends EventEmitter {
    constructor() {
        super();
    }

    // Начать голосование
    startVoting() {
        if (gameModel.state.nominatedPlayers.length === 0) return false;
        
        gameModel.state.phase = 'voting';
        gameModel.state.votingResults = {};
        
        this.emit('votingStarted', gameModel.state.nominatedPlayers);
        
        return true;
    }

    // Регистрация голосов
    registerVotes(playerId, votes) {
	if (votes === 0) {
            delete gameModel.state.votingResults[playerId];
	} else {
            gameModel.state.votingResults[playerId] = votes;
	}
        
        this.emit('votesRegistered', {
            playerId: playerId,
            votes: votes,
            results: gameModel.state.votingResults
        });
        
        return gameModel.state.votingResults;
    }

    // Подтверждение результатов голосования
    confirmVoting() {
        if (Object.keys(gameModel.state.votingResults).length === 0) return null;
        
        // Находим игрока(ов) с наибольшим количеством голосов
        let maxVotes = 0;
        let playersWithMaxVotes = [];
        
        Object.entries(gameModel.state.votingResults).forEach(([playerId, votes]) => {
            if (votes > maxVotes) {
                maxVotes = votes;
                playersWithMaxVotes = [parseInt(playerId)];
            } else if (votes === maxVotes) {
                playersWithMaxVotes.push(parseInt(playerId));
            }
        });

        // Перестрелка или удаление
        if (playersWithMaxVotes.length > 1) {
            const isSameShootout = playersWithMaxVotes.length === gameModel.state.shootoutPlayers.length && 
                  playersWithMaxVotes.every(id => gameModel.state.shootoutPlayers.includes(id));
                  
            if (!isSameShootout) {
                // Новая перестрелка
                gameModel.state.shootoutPlayers = playersWithMaxVotes;
                gameModel.state.votingResults = {};
                gameModel.state.nominatedPlayers = playersWithMaxVotes;
                
                this.emit('shootoutStarted', playersWithMaxVotes);
                
                return {
                    result: 'shootout',
                    players: playersWithMaxVotes
                };
            }
            
            // Если перестрелка та же, нужно решать - поднимать или нет
            const alivePlayers = gameModel.state.players.filter(p => p.isAlive && !p.isEliminated).length;
            
            if (playersWithMaxVotes.length >= alivePlayers / 2) {
                // Слишком много игроков для поднятия
                gameModel.state.noCandidatesRounds++;
                
                this.emit('tooManyPlayersToEliminate', {
                    count: playersWithMaxVotes.length,
                    totalAlive: alivePlayers
                });
                
                return {
                    result: 'tooMany',
                    count: playersWithMaxVotes.length,
                    totalAlive: alivePlayers
                };
            }
            
            // Запрашиваем голосование за поднятие
            this.emit('multipleEliminationVoting', playersWithMaxVotes);
            
            return {
                result: 'multipleElimination',
                players: playersWithMaxVotes
            };
        }
        
        // Единственный игрок с максимумом голосов
        if (playersWithMaxVotes.length === 1) {
            const eliminatedId = playersWithMaxVotes[0];
            const player = gameModel.getPlayer(eliminatedId);
            
            if (player) {
                player.eliminate();
                gameModel.state.eliminatedPlayers.push(eliminatedId);
                
                // Сбрасываем все номинации для этого игрока
                gameModel.state.players.forEach(p => {
                    if (p.nominated === eliminatedId) {
                        p.nominated = null;
                    }
                });
                
                gameModel.state.noCandidatesRounds = 0;
                
                this.emit('playerEliminated', {
                    playerId: eliminatedId,
                    playerName: player.name
                });
            }
        }
        
        // Сброс состояния перестрелки
        gameModel.state.shootoutPlayers = [];
        
        // Сброс данных голосования
        gameModel.state.nominatedPlayers = [];
        gameModel.state.votingResults = {};
        
        this.emit('votingCompleted');
        
        return {
            result: 'eliminated',
            players: playersWithMaxVotes
        };
    }

    // Подтверждение множественного удаления
    confirmMultipleElimination(players, votes, totalPlayers) {
        if (votes > totalPlayers / 2) {
            // Удаляем всех игроков
            players.forEach(playerId => {
                const player = gameModel.getPlayer(playerId);
                if (player) {
                    player.eliminate();
                    gameModel.state.eliminatedPlayers.push(playerId);
                    
                    // Сбрасываем все номинации для этого игрока
                    gameModel.state.players.forEach(p => {
                        if (p.nominated === playerId) {
                            p.nominated = null;
                        }
                    });
                }
            });
            
            this.emit('multiplePlayersEliminated', players);
            
            return {
                result: 'eliminated',
                players: players
            };
        } else {
            // Недостаточно голосов
            gameModel.state.noCandidatesRounds++;
            
            this.emit('insufficientVotes');
            
            return {
                result: 'insufficientVotes'
            };
        }
    }

    // Сброс голосования
    resetVoting() {
        gameModel.state.votingResults = {};
        this.emit('votingReset');
        return true;
    }
}

export default new VotingService();
