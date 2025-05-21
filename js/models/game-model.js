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
    // Загрузка состояния игры с сервера
    async loadGameState() {
	if (!this.currentGameInfo) return false;
	
	try {
            const { gameId } = this.currentGameInfo;
            console.log('Загрузка состояния игры с ID:', gameId);
            const gameState = await apiAdapter.getGameState(gameId);
            
            if (gameState) {
		console.log('Получено состояние с сервера:', gameState);
		
		// Полная замена локального состояния полученным с сервера
		this.state = {
                    round: gameState.round || 0,
                    phase: gameState.phase || GAME_PHASES.DISTRIBUTION,
                    isGameStarted: gameState.isGameStarted || false,
                    nominatedPlayers: gameState.nominatedPlayers || [],
                    votingResults: gameState.votingResults || {},
                    shootoutPlayers: gameState.shootoutPlayers || [],
                    deadPlayers: gameState.deadPlayers || [],
                    eliminatedPlayers: gameState.eliminatedPlayers || [],
                    nightKill: gameState.nightKill,
                    bestMoveUsed: gameState.bestMoveUsed || false,
                    noCandidatesRounds: gameState.noCandidatesRounds || 0,
                    mafiaTarget: gameState.mafiaTarget,
                    donTarget: gameState.donTarget,
                    sheriffTarget: gameState.sheriffTarget,
                    rolesVisible: gameState.rolesVisible || false
		};
		
		// Корректная инициализация игроков из полученных данных
		if (gameState.players && Array.isArray(gameState.players)) {
                    this.state.players = gameState.players.map(p => {
			const player = new Player(p.id);
			// Явно копируем все важные свойства
			player.name = p.name;
			player.role = p.role;
			player.originalRole = p.originalRole;
			player.fouls = p.fouls || 0;
			player.nominated = p.nominated;
			player.isAlive = p.isAlive !== undefined ? p.isAlive : true;
			player.isEliminated = p.isEliminated || false;
			player.isSilent = p.isSilent || false;
			player.silentNextRound = p.silentNextRound || false;
			return player;
                    });
		}
		
		// Правильное преобразование bestMoveTargets из массива в Set
		if (gameState.bestMoveTargets) {
                    this.state.bestMoveTargets = new Set(
			Array.isArray(gameState.bestMoveTargets) 
			    ? gameState.bestMoveTargets 
			    : []
                    );
		} else {
                    this.state.bestMoveTargets = new Set();
		}
		
		console.log('Состояние игры успешно загружено');
		this.emit('gameStateLoaded', this.state);
		return true;
            }
	} catch (error) {
            console.error('Ошибка загрузки состояния игры:', error);
	}
	
	console.warn('Не удалось загрузить состояние игры, будет использовано стандартное состояние');
	return false;
    }

    // Проверка корректности загруженного состояния
    validateGameState(gameState) {
	// Проверяем минимальный набор нужных полей
	if (!gameState || typeof gameState !== 'object') {
            console.error('Некорректное состояние игры:', gameState);
            return false;
	}
	
	// Проверяем, что в состоянии есть массив игроков
	if (!Array.isArray(gameState.players)) {
            console.error('В состоянии игры отсутствуют игроки:', gameState);
            return false;
	}
	
	// Проверяем фазу игры
	const validPhases = Object.values(GAME_PHASES);
	if (gameState.phase && !validPhases.includes(gameState.phase)) {
            console.error('Некорректная фаза игры:', gameState.phase);
            return false;
	}
	
	return true;
    }
    
    // Сохранение состояния игры на сервер
    async saveGameState() {
	if (!this.currentGameInfo) {
            console.error('Не удалось сохранить состояние: отсутствует информация о текущей игре');
            return false;
	}
	
	try {
            const { gameId } = this.currentGameInfo;
            console.log('Сохранение состояния игры с ID:', gameId, 'Текущий круг:', this.state.round);
            
            // Преобразуем Set bestMoveTargets в массив для сохранения
            const bestMoveTargetsArray = Array.from(this.state.bestMoveTargets);
            
            const stateToSave = {
		...this.state,
		bestMoveTargets: bestMoveTargetsArray
            };
            
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
