// js/models/game-model.js
import { Player } from './player-model.js';
import { 
    GAME_STATUSES, 
    GAME_SUBSTATUS,
    DEFAULT_PLAYERS_COUNT, 
    NO_CANDIDATES_MAX_ROUNDS 
} from '../utils/constants.js';
import EventEmitter from '../utils/event-emitter.js';
import apiAdapter from '../adapter.js';
import gameStateManager from '../services/game-state-manager.js';

export class GameModel extends EventEmitter {
    constructor() {
        super();
        this.state = {
            round: 0,
            
            // Новая система статусов (убрали phase полностью)
            gameStatus: GAME_STATUSES.CREATED,
            gameSubstatus: null,
            
            isGameStarted: false,
            players: [],
            nominatedPlayers: [],
            votingResults: {},
            shootoutPlayers: [],
            deadPlayers: [],
            eliminatedPlayers: [],
            nightKill: null,
            bestMoveUsed: false,
            noCandidatesRounds: 0,
            mafiaTarget: null,
            donTarget: null,
            sheriffTarget: null,
            bestMoveTargets: new Set(),
            rolesVisible: false,
            
            // Система баллов
            scores: {},
            isCriticalRound: false
        };

        this.currentGameInfo = null;
        this.initPlayers();
    }

    initPlayers() {
        this.state.players = [];
        for (let i = 1; i <= DEFAULT_PLAYERS_COUNT; i++) {
            this.state.players.push(new Player(i));
            this.state.scores[i] = { baseScore: 0, additionalScore: 0 };
        }
    }

    // Методы для работы со статусами
    setGameStatus(newStatus, substatus = null) {
        const oldStatus = this.state.gameStatus;
        const oldSubstatus = this.state.gameSubstatus;
        
        this.state.gameStatus = newStatus;
        this.state.gameSubstatus = substatus;
        
        console.log(`Статус игры изменен: ${oldStatus}(${oldSubstatus}) -> ${newStatus}(${substatus})`);
        
        this.emit('gameStatusChanged', {
            oldStatus,
            oldSubstatus,
            newStatus,
            newSubstatus: substatus
        });
        
        return true;
    }

    setGameSubstatus(newSubstatus) {
        const oldSubstatus = this.state.gameSubstatus;
        this.state.gameSubstatus = newSubstatus;
        
        console.log(`Подстатус игры изменен: ${oldSubstatus} -> ${newSubstatus}`);
        
        this.emit('gameSubstatusChanged', {
            oldSubstatus,
            newSubstatus
        });
        
        return true;
    }

    // Проверяем, можно ли перейти к следующему статусу
    canTransitionTo(targetStatus, targetSubstatus = null) {
        const current = this.state.gameStatus;
        
        const allowedTransitions = {
            [GAME_STATUSES.CREATED]: [
                GAME_STATUSES.SEATING_READY,
                GAME_STATUSES.ROLE_DISTRIBUTION
            ],
            [GAME_STATUSES.SEATING_READY]: [
                GAME_STATUSES.ROLE_DISTRIBUTION,
                GAME_STATUSES.CREATED
            ],
            [GAME_STATUSES.ROLE_DISTRIBUTION]: [
                GAME_STATUSES.IN_PROGRESS,
                GAME_STATUSES.SEATING_READY
            ],
            [GAME_STATUSES.IN_PROGRESS]: [
                GAME_STATUSES.FINISHED_NO_SCORES
            ],
            [GAME_STATUSES.FINISHED_NO_SCORES]: [
                GAME_STATUSES.FINISHED_WITH_SCORES,
                GAME_STATUSES.IN_PROGRESS
            ],
            [GAME_STATUSES.FINISHED_WITH_SCORES]: []
        };

        return allowedTransitions[current]?.includes(targetStatus) || false;
    }

    // Проверяем, находимся ли в фазе раздачи ролей
    isInRoleDistribution() {
        return this.state.gameStatus === GAME_STATUSES.ROLE_DISTRIBUTION;
    }

    // Проверяем, идет ли игра
    isGameInProgress() {
        return this.state.gameStatus === GAME_STATUSES.IN_PROGRESS;
    }

    // Проверяем, можно ли голосовать
    canVote() {
        return this.state.gameStatus === GAME_STATUSES.IN_PROGRESS && 
            this.state.gameSubstatus === GAME_SUBSTATUS.VOTING;
    }

    // Проверяем, ночь ли сейчас
    isNight() {
        return this.state.gameStatus === GAME_STATUSES.IN_PROGRESS && 
            this.state.gameSubstatus === GAME_SUBSTATUS.NIGHT;
    }

    // Проверяем критический ли сейчас круг
    isCriticalRound() {
        if (!this.isGameInProgress()) return false;
        
        const alivePlayers = this.state.players.filter(p => p.isAlive && !p.isEliminated);
        const mafiaCount = alivePlayers.filter(p => 
            p.originalRole === 'Мафия' || p.originalRole === 'Дон'
        ).length;
        const civilianCount = alivePlayers.length - mafiaCount;
        
        return mafiaCount >= civilianCount - 1;
    }

    // Остальные методы остаются без изменений...
    toggleRolesVisibility() {
        this.state.rolesVisible = !this.state.rolesVisible;
        this.emit('rolesVisibilityChanged', this.state.rolesVisible);
    }

    getPlayer(playerId) {
        return this.state.players.find(p => p.id === playerId);
    }

    changePlayerRole(playerId) {
        if (!this.isInRoleDistribution()) return;
        
        const player = this.getPlayer(playerId);
        if (!player) return;
        
        const existingRoles = this.state.players.map(p => p.role);
        player.changeRole(existingRoles);
        
        this.emit('playerRoleChanged', player);
        
        const canStartGame = this.canStartGame();
        this.emit('canStartGameChanged', canStartGame);
        
        return player.role;
    }

    canStartGame() {
	const mafiaCount = this.state.players.filter(p => p.role === 'Мафия').length;
	const donCount = this.state.players.filter(p => p.role === 'Дон').length;
	const sheriffCount = this.state.players.filter(p => p.role === 'Шериф').length;
	
	console.log(`Проверка ролей: Мафия=${mafiaCount}, Дон=${donCount}, Шериф=${sheriffCount}`);
	
	return mafiaCount === 2 && donCount === 1 && sheriffCount === 1;
    }

    // Методы для работы с баллами
    setPlayerScore(playerId, baseScore, additionalScore = 0) {
        if (!this.state.scores[playerId]) {
            this.state.scores[playerId] = { baseScore: 0, additionalScore: 0 };
        }
        
        this.state.scores[playerId].baseScore = baseScore;
        this.state.scores[playerId].additionalScore = additionalScore;
        
        this.emit('playerScoreChanged', { playerId, baseScore, additionalScore });
    }

    getPlayerScore(playerId) {
        return this.state.scores[playerId] || { baseScore: 0, additionalScore: 0 };
    }

    getTotalPlayerScore(playerId) {
        const score = this.getPlayerScore(playerId);
        return score.baseScore + score.additionalScore;
    }

    // Методы работы с API остаются без изменений
    async loadGameState() {
        if (!this.currentGameInfo) {
            console.error('currentGameInfo не установлен');
            return false;
        }
        
        const { gameId } = this.currentGameInfo;
        const gameState = await gameStateManager.loadState(gameId);
        
        if (gameState) {
            this.state = {
                ...this.state,
                ...gameState,
                gameId: undefined
            };
            
            if (gameState.players && Array.isArray(gameState.players)) {
                const { Player } = await import('./player-model.js');
                this.state.players = gameState.players.map(p => {
                    const player = new Player(p.id);
                    Object.assign(player, p);
                    return player;
                });
            }
            
            if (!this.state.scores) {
                this.state.scores = {};
                this.state.players.forEach(p => {
                    this.state.scores[p.id] = { baseScore: 0, additionalScore: 0 };
                });
            }
            
            this.emit('gameStateLoaded', this.state);
            return true;
        }
        
        return false;
    }

    startAutoSave() {
        if (this.currentGameInfo) {
            gameStateManager.startAutoSave(this.currentGameInfo.gameId);
        }
    }

    stopAutoSave() {
        gameStateManager.stopAutoSave();
    }

    async saveGameState() {
        if (!this.currentGameInfo) {
            console.warn('Информация о текущей игре отсутствует');
            return false;
        }
        
        const { gameId } = this.currentGameInfo;
        const success = await gameStateManager.saveState(gameId, this.state);
        
        if (success) {
            this.emit('gameStateSaved', gameId);
        }
        
        return success;
    }

    async updateGameStatus(status, result = null) {
        if (!this.currentGameInfo) return false;
        
        try {
            const { eventId, tableId, gameId } = this.currentGameInfo;
            
            const gameData = {
                status: status,
                currentRound: this.state.round
            };
            
            if (result) {
                gameData.result = result;
            }
            
            await apiAdapter.updateGame(eventId, tableId, gameId, gameData);
            await this.saveGameState();
            
            return true;
        } catch (error) {
            console.error('Ошибка обновления статуса игры:', error);
            return false;
        }
    }
}

export default new GameModel();
