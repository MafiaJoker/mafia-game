// models/game-model.js
import { Player } from './player-model.js';
import { GAME_PHASES, DEFAULT_PLAYERS_COUNT, NO_CANDIDATES_MAX_ROUNDS } from '../utils/constants.js';
import EventEmitter from '../utils/event-emitter.js';
import apiAdapter from '../adapter.js';

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
	console.log('=== НАЧАЛО ЗАГРУЗКИ СОСТОЯНИЯ ИГРЫ ===');
	
	if (!this.currentGameInfo) {
            console.error('currentGameInfo не установлен');
            return false;
	}
	
	try {
            const { gameId } = this.currentGameInfo;
            console.log('Загрузка состояния для игры ID:', gameId);
            console.log('API adapter:', apiAdapter);
            
            // Проверяем, что API adapter доступен
            if (!apiAdapter) {
		console.error('API adapter не найден');
		return false;
            }
            
            console.log('Отправляем запрос на сервер...');
            const gameState = await apiAdapter.getGameState(gameId);
            console.log('Ответ от сервера:', gameState);
            
            if (gameState && gameState.round !== undefined) {
		console.log('Состояние игры получено, применяем...');
		
		// Преобразуем полученное состояние в формат, понятный для модели
		this.state = {
                    ...this.state,
                    ...gameState,
                    // Удаляем id игры из состояния, так как оно уже хранится в currentGameInfo
                    gameId: undefined
		};
		
		// Если есть игроки, создаем экземпляры класса Player
		if (gameState.players && Array.isArray(gameState.players)) {
                    console.log('Создаем игроков из состояния, количество:', gameState.players.length);
                    this.state.players = gameState.players.map(p => {
			const player = new Player(p.id);
			Object.assign(player, p);
			return player;
                    });
		}
		
		// Преобразуем bestMoveTargets из массива в Set
		if (gameState.bestMoveTargets && Array.isArray(gameState.bestMoveTargets)) {
                    this.state.bestMoveTargets = new Set(gameState.bestMoveTargets);
		} else {
                    this.state.bestMoveTargets = new Set();
		}
		
		console.log('Состояние игры успешно применено');
		this.emit('gameStateLoaded', this.state);
		return true;
            } else {
		console.log('Состояние игры не найдено или пустое, gameState:', gameState);
		return false;
            }
	} catch (error) {
            console.error('Ошибка загрузки состояния игры:', error);
            return false;
	}
    }

    // Сохранение состояния игры на сервер
    async saveGameState() {
	if (!this.currentGameInfo) {
            console.warn('Информация о текущей игре отсутствует');
            return false;
	}
	
	try {
            const { gameId } = this.currentGameInfo;
            console.log('Сохранение состояния для игры ID:', gameId);
            
            // Преобразуем Set bestMoveTargets в массив для сохранения
            const bestMoveTargetsArray = Array.from(this.state.bestMoveTargets);
            
            const stateToSave = {
		...this.state,
		bestMoveTargets: bestMoveTargetsArray
            };
            
            console.log('Сохраняемое состояние:', stateToSave);
            
            await apiAdapter.saveGameState(gameId, stateToSave);
            console.log('Состояние игры успешно сохранено');
            return true;
	} catch (error) {
            console.error('Ошибка сохранения состояния игры:', error);
            return false;
	}
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
