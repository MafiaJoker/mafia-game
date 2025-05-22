// js/controllers/game/game-flow-controller.js
import gameModel from '../../models/game-model.js';
import gameView from '../../views/game-view.js';
import timerService from '../../utils/timer-service.js';
import { GAME_PHASES } from '../../utils/constants.js';
import localization from '../../utils/localization.js';
import EventEmitter from '../../utils/event-emitter.js';
import toastManager from '../../utils/toast-manager.js';

export class GameFlowController extends EventEmitter {
    constructor() {
        super();
    }

    async initGame() {
        try {
            console.log('Инициализация игры...');
            
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = parseInt(urlParams.get('eventId'));
            const tableId = parseInt(urlParams.get('tableId'));
            const gameId = parseInt(urlParams.get('gameId'));
            
            console.log('Параметры URL:', { eventId, tableId, gameId });
            
            if (eventId && tableId && gameId) {
                console.log('Загрузка существующей игры...');
                const eventModel = await import('../../models/event-model.js');
                await eventModel.default.loadEvents();
                
                const event = eventModel.default.getEventById(eventId);
                if (event) {
                    const table = event.tables.find(t => t.id === tableId);
                    if (table && table.games) {
                        const game = table.games.find(g => g.id === gameId);
                        if (game) {
                            await this.loadExistingGame(game, event, table);
                            return;
                        }
                    }
                }
                
                console.error('Не удалось найти игру с указанными параметрами');
                toastManager.error('Игра не найдена');
                return;
            }
            
            console.log('Инициализация новой игры...');
            this.emit('gameInitialized');
        } catch (error) {
            console.error('Ошибка инициализации игры:', error);
            gameView.showGameStatus('Не удалось инициализировать игру. Пожалуйста, обновите страницу.', 'danger');
        }
    }

    async loadExistingGame(game, event, table) {
        gameModel.currentGameInfo = {
            eventId: event.id,
            tableId: table.id,
            gameId: game.id
        };
        
        console.log('Загрузка игры:', game.name, 'Статус:', game.status);
        
        const stateLoaded = await gameModel.loadGameState();
        
        if (stateLoaded) {
            console.log('Состояние игры загружено с сервера');
            this.updateUIFromState();
            
            if (game.status === "finished") {
                this.endGame();
                this.showGameEndMessage(game.result);
            }
        } else {
            console.log('Состояние игры не найдено, используем базовое состояние');
            this.setupGameByStatus(game);
        }
        
        this.emit('gameLoaded', game);
    }

    setupGameByStatus(game) {
        if (game.status === "in_progress") {
            gameModel.state.round = game.currentRound || 1;
            gameModel.state.phase = "day";
            gameModel.state.isGameStarted = true;
            
            gameView.updateGamePhase("day");
            gameView.updateRound(gameModel.state.round);
            gameView.elements.ppkButton.classList.remove('d-none');
            gameView.elements.eliminatePlayerButton.classList.remove('d-none');
        } else if (game.status === "finished") {
            gameModel.state.round = game.currentRound || 0;
            gameModel.state.phase = "end";
            gameModel.state.isGameStarted = false;
            
            gameView.updateGamePhase("end");
            gameView.updateRound(gameModel.state.round);
            this.endGame();
            this.showGameEndMessage(game.result);
        } else {
            gameModel.state.phase = "distribution";
            gameModel.state.isGameStarted = false;
            gameView.updateGamePhase("distribution");
        }
    }

    updateUIFromState() {
        gameView.updateGamePhase(gameModel.state.phase);
        gameView.updateRound(gameModel.state.round);
        
        if (gameModel.state.isGameStarted) {
            gameView.elements.ppkButton.classList.remove('d-none');
            gameView.elements.eliminatePlayerButton.classList.remove('d-none');
        }
    }

    initDistribution() {
        gameModel.state.phase = GAME_PHASES.DISTRIBUTION;
        gameView.updateGamePhase(GAME_PHASES.DISTRIBUTION);
        this.emit('distributionStarted');
    }

    async startGame() {
        const gameRulesService = await import('../../services/game-rules-service.js');
        
        if (!gameRulesService.default.canStartGame(gameModel.state.players)) {
            toastManager.error('Необходимо распределить 2 мафии, 1 дона и 1 шерифа!');
            return;
        }
        
        gameModel.state.isGameStarted = true;
        gameModel.state.phase = GAME_PHASES.DAY;
        
        gameView.updateGamePhase(GAME_PHASES.DAY);
        gameView.elements.ppkButton.classList.remove('d-none');
        gameView.elements.eliminatePlayerButton.classList.remove('d-none');

        await this.updateGameStatus("in_progress");
        await gameModel.saveGameState();
        
        timerService.reset();
        
        this.emit('gameStarted');
    }

    endGame() {
        gameModel.state.isGameStarted = false;
        gameView.disableGameControls();
        gameView.elements.ppkButton.classList.add('d-none');
        gameView.elements.eliminatePlayerButton.classList.add('d-none');
        
        gameModel.state.players.forEach(p => {
            p.role = p.originalRole;
        });
        
        timerService.stop();
        this.emit('gameEnded');
    }

    async updateGameStatus(status, result = null) {
        if (!gameModel.currentGameInfo) return false;
        
        try {
            const { eventId, tableId, gameId } = gameModel.currentGameInfo;
            const apiAdapter = await import('../../adapter.js');
            
            const gameData = {
                status: status,
                currentRound: gameModel.state.round
            };
            
            if (result) {
                gameData.result = result;
            }
            
            await apiAdapter.default.updateGame(eventId, tableId, gameId, gameData);
            return true;
        } catch (error) {
            console.error('Ошибка обновления статуса игры:', error);
            return false;
        }
    }

    showGameEndMessage(result) {
        let message, type;
        
        switch (result) {
            case 'mafia_win':
                message = localization.t('gameStatus', 'mafiaWin');
                type = 'danger';
                break;
            case 'city_win':
                message = localization.t('gameStatus', 'cityWin');
                type = 'success';
                break;
            case 'draw':
                message = localization.t('gameStatus', 'draw');
                type = 'warning';
                break;
        }
        
        if (message) {
            gameView.showGameStatus(message, type);
        }
    }
}

export default new GameFlowController();
