// js/services/game-rules-service.js
import { GAME_PHASES, NO_CANDIDATES_MAX_ROUNDS } from '../utils/constants.js';

export class GameRulesService {
    canStartGame(players) {
        const mafiaCount = players.filter(p => p.role === 'Мафия').length;
        const donCount = players.filter(p => p.role === 'Дон').length;
        const sheriffCount = players.filter(p => p.role === 'Шериф').length;
        
        return mafiaCount === 2 && donCount === 1 && sheriffCount === 1;
    }
    
    canChangeRoles(currentPhase) {
        return currentPhase === GAME_PHASES.DISTRIBUTION;
    }
    
    checkWinConditions(players, noCandidatesRounds = 0) {
        const mafiaCount = players.filter(p => 
            (p.originalRole === 'Мафия' || p.originalRole === 'Дон') && 
                p.isAlive && !p.isEliminated).length;
        
        const civilianCount = players.filter(p => 
            (p.originalRole === 'Мирный' || p.originalRole === 'Шериф') && 
                p.isAlive && !p.isEliminated).length;
        
        if (mafiaCount === 0) {
            return { winner: 'city', reason: 'all_mafia_eliminated' };
        } else if (mafiaCount >= civilianCount) {
            return { winner: 'mafia', reason: 'mafia_majority' };
        } else if (noCandidatesRounds >= NO_CANDIDATES_MAX_ROUNDS) {
            return { winner: 'draw', reason: 'no_candidates' };
        }
        
        return { winner: null, reason: null };
    }
    
    calculateVotingResults(votes, players) {
        if (Object.keys(votes).length === 0) return null;
        
        let maxVotes = 0;
        let playersWithMaxVotes = [];
        
        Object.entries(votes).forEach(([playerId, voteCount]) => {
            if (voteCount > maxVotes) {
                maxVotes = voteCount;
                playersWithMaxVotes = [parseInt(playerId)];
            } else if (voteCount === maxVotes) {
                playersWithMaxVotes.push(parseInt(playerId));
            }
        });

        return {
            maxVotes,
            playersWithMaxVotes,
            isShootout: playersWithMaxVotes.length > 1
        };
    }
    
    shouldShowBestMove(gameState) {
        return gameState.deadPlayers.length === 1 && 
               gameState.eliminatedPlayers.length === 0 && 
               gameState.round === 1 &&
               !gameState.bestMoveUsed;
    }
    
    getMinimumCandidates(round, totalPlayers) {
        if (round === 0 && totalPlayers === 10) {
            return 2; // Первый день при 10 игроках
        }
        return 1; // Остальные случаи
    }
}

export default new GameRulesService();
