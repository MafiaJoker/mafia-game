// services/voting-service.js
import gameModel from '../models/game-model.js';
import { GAME_SUBSTATUS } from '../utils/constants.js';
import EventEmitter from '../utils/event-emitter.js';

export class VotingService extends EventEmitter {
    constructor() {
        super();
    }

    startVoting() {
        if (gameModel.state.nominatedPlayers.length === 0) return false;
        
        gameModel.setGameSubstatus(GAME_SUBSTATUS.VOTING);
        gameModel.state.votingResults = {};
        
        this.emit('votingStarted', gameModel.state.nominatedPlayers);
        
        return true;
    }

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

    // Остальные методы остаются без изменений...
    confirmVoting() {
        if (Object.keys(gameModel.state.votingResults).length === 0) return null;
        
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

        if (playersWithMaxVotes.length > 1) {
            const isSameShootout = playersWithMaxVotes.length === gameModel.state.shootoutPlayers.length && 
                  playersWithMaxVotes.every(id => gameModel.state.shootoutPlayers.includes(id));
                  
            if (!isSameShootout) {
                gameModel.state.shootoutPlayers = playersWithMaxVotes;
                gameModel.state.votingResults = {};
                gameModel.state.nominatedPlayers = playersWithMaxVotes;
                
                this.emit('shootoutStarted', playersWithMaxVotes);
                
                return {
                    result: 'shootout',
                    players: playersWithMaxVotes
                };
            }
            
            const alivePlayers = gameModel.state.players.filter(p => p.isAlive && !p.isEliminated).length;
            
            if (playersWithMaxVotes.length >= alivePlayers / 2) {
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
            
            this.emit('multipleEliminationVoting', playersWithMaxVotes);
            
            return {
                result: 'multipleElimination',
                players: playersWithMaxVotes
            };
        }
        
        if (playersWithMaxVotes.length === 1) {
            const eliminatedId = playersWithMaxVotes[0];
            const player = gameModel.getPlayer(eliminatedId);
            
            if (player) {
                player.eliminate();
                gameModel.state.eliminatedPlayers.push(eliminatedId);
                
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
        
        gameModel.state.shootoutPlayers = [];
        gameModel.state.nominatedPlayers = [];
        gameModel.state.votingResults = {};
        
        this.emit('votingCompleted');
        
        return {
            result: 'eliminated',
            players: playersWithMaxVotes
        };
    }

    // Остальные методы остаются без изменений
}

export default new VotingService();
