// models/game-model.js
import { Player } from './player-model.js';
import { GAME_PHASES, DEFAULT_PLAYERS_COUNT, NO_CANDIDATES_MAX_ROUNDS } from '../utils/constants.js';
import EventEmitter from '../utils/event-emitter.js';
import apiAdapter from '../adapter.js';
import gameStateManager from '../services/game-state-manager.js';

export class GameModel extends EventEmitter {
    constructor() {
        super();
        this.state = {
            round: 0,
            phase: GAME_PHASES.DISTRIBUTION,
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
            rolesVisible: false
        };

        
	// Информация о текущей игре в системе мероприятий
	this.currentGameInfo = null;
	
        this.initPlayers();
    }

    initPlayers() {
        this.state.players = [];
        for (let i = 1; i <= DEFAULT_PLAYERS_COUNT; i++) {
            this.state.players.push(new Player(i));
        }
    }
    
    toggleRolesVisibility() {
        this.state.rolesVisible = !this.state.rolesVisible;
        this.emit('rolesVisibilityChanged', this.state.rolesVisible);
    }

    getPlayer(playerId) {
        return this.state.players.find(p => p.id === playerId);
    }

    changePlayerRole(playerId) {
        if (this.state.phase !== GAME_PHASES.DISTRIBUTION) return;
        
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
        return this.state.players.filter(p => p.role === 'Мафия').length === 2 &&
               this.state.players.filter(p => p.role === 'Дон').length === 1 &&
               this.state.players.filter(p => p.role === 'Шериф').length === 1;
    }

    // Новые методы для работы с API

    // Загрузка состояния игры с сервера
    async loadGameState() {
        if (!this.currentGameInfo) {
            console.error('currentGameInfo не установлен');
            return false;
        }
        
        const { gameId } = this.currentGameInfo;
        const gameState = await gameStateManager.loadState(gameId);
        
        if (gameState) {
            // Применяем загруженное состояние
            this.state = {
                ...this.state,
                ...gameState,
                gameId: undefined
            };
            
            // Создаем экземпляры игроков
            if (gameState.players && Array.isArray(gameState.players)) {
                const { Player } = await import('./player-model.js');
                this.state.players = gameState.players.map(p => {
                    const player = new Player(p.id);
                    Object.assign(player, p);
                    return player;
                });
            }
            
            this.emit('gameStateLoaded', this.state);
            return true;
        }
        
        return false;
    }

    // Запуск автосохранения при старте игры
    startAutoSave() {
        if (this.currentGameInfo) {
            gameStateManager.startAutoSave(this.currentGameInfo.gameId);
        }
    }

    stopAutoSave() {
        gameStateManager.stopAutoSave();
    }

    // Сохранение состояния игры на сервер
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

    // Обновление информации об игре
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
            
            // Сохраняем обновленное состояние игры
            await this.saveGameState();
            
            return true;
	} catch (error) {
            console.error('Ошибка обновления статуса игры:', error);
            return false;
	}
    }
    
    // Здесь будут остальные методы модели
    // ...
}

export default new GameModel();
