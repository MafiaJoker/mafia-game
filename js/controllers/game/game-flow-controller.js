// js/controllers/game/game-flow-controller.js
import gameModel from '../../models/game-model.js';
import gameView from '../../views/game-view.js';
import timerService from '../../utils/timer-service.js';
import { 
    GAME_PHASES, 
    GAME_STATUSES, 
    GAME_SUBSTATUS,
    GAME_STATUS_NAMES,
    GAME_SUBSTATUS_NAMES
} from '../../utils/constants.js';
import localization from '../../utils/localization.js';
import EventEmitter from '../../utils/event-emitter.js';
import toastManager from '../../utils/toast-manager.js';

export class GameFlowController extends EventEmitter {
    constructor() {
        super();
        this.setupGameStatusListeners();
    }

    setupGameStatusListeners() {
        gameModel.on('gameStatusChanged', (data) => {
            this.updateUIForStatus(data.newStatus, data.newSubstatus);
        });

        gameModel.on('gameSubstatusChanged', (data) => {
            this.updateUIForSubstatus(data.newSubstatus);
        });
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
            gameModel.setGameStatus(GAME_STATUSES.CREATED);
            this.emit('gameInitialized');
        } catch (error) {
            console.error('Ошибка инициализации игры:', error);
            gameView.showGameStatus('Не удалось инициализировать игру. Пожалуйста, обновите страницу.', 'danger');
        }
    }

    initDistribution() {
	console.log('Инициализация раздачи ролей');
	this.startRoleDistribution();
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
                this.handleFinishedGame(game);
            }
        } else {
            console.log('Состояние игры не найдено, используем базовое состояние');
            this.setupGameByStatus(game);
        }
        
        this.emit('gameLoaded', game);
    }

    setupGameByStatus(game) {
        if (game.status === "in_progress") {
            gameModel.setGameStatus(GAME_STATUSES.IN_PROGRESS, GAME_SUBSTATUS.DISCUSSION);
            gameModel.state.round = game.currentRound || 1;
            gameModel.state.phase = "day";
            gameModel.state.isGameStarted = true;
            
            this.updateUIForStatus(GAME_STATUSES.IN_PROGRESS, GAME_SUBSTATUS.DISCUSSION);
        } else if (game.status === "finished") {
            this.handleFinishedGame(game);
        } else {
            gameModel.setGameStatus(GAME_STATUSES.CREATED);
            this.updateUIForStatus(GAME_STATUSES.CREATED);
        }
    }

    handleFinishedGame(game) {
        // Определяем, есть ли уже выставленные баллы
        const hasScores = Object.values(gameModel.state.scores || {}).some(score => 
            score.baseScore > 0 || score.additionalScore > 0
        );
        
        const status = hasScores ? GAME_STATUSES.FINISHED_WITH_SCORES : GAME_STATUSES.FINISHED_NO_SCORES;
        gameModel.setGameStatus(status);
        
        gameModel.state.round = game.currentRound || 0;
        gameModel.state.phase = "end";
        gameModel.state.isGameStarted = false;
        
        this.updateUIForStatus(status);
        this.showGameEndMessage(game.result);
    }

    updateUIFromState() {
        this.updateUIForStatus(gameModel.state.gameStatus, gameModel.state.gameSubstatus);
        gameView.updateRound(gameModel.state.round);
    }

    updateUIForStatus(status, substatus = null) {
        console.log(`Обновление UI для статуса: ${status}(${substatus})`);
        
        // Обновляем отображение статуса
        this.updateStatusDisplay(status, substatus);
        
        // Показываем/скрываем элементы управления в зависимости от статуса
        this.updateControlsVisibility(status, substatus);
        
        // Обновляем фазу игры для совместимости со старым кодом
        this.updateLegacyPhase(status, substatus);
    }

    updateStatusDisplay(status, substatus) {
        const statusText = GAME_STATUS_NAMES[status] || status;
        const substatusText = substatus ? ` - ${GAME_SUBSTATUS_NAMES[substatus] || substatus}` : '';
        
        gameView.showGameStatus(`${statusText}${substatusText}`, 'info');
    }

    updateControlsVisibility(status, substatus) {
	// Сначала скрываем все контролы
	this.hideAllControls();
	
	console.log('Обновление видимости контролов для статуса:', status);
	
	switch (status) {
        case GAME_STATUSES.CREATED:
            console.log('Показываем кнопку "Раздать роли"');
            gameView.elements.startDistribution.classList.remove('d-none');
            break;
            
        case GAME_STATUSES.SEATING_READY:
            this.showSeatingControls();
            break;
            
        case GAME_STATUSES.ROLE_DISTRIBUTION:
            console.log('Показываем кнопки раздачи ролей и начала игры');
            this.showRoleDistributionControls();
            break;
            
        case GAME_STATUSES.IN_PROGRESS:
            this.showInProgressControls(substatus);
            break;
            
        case GAME_STATUSES.FINISHED_NO_SCORES:
            this.showFinishedNoScoresControls();
            break;
            
        case GAME_STATUSES.FINISHED_WITH_SCORES:
            this.showFinishedWithScoresControls();
            break;
	}
    }

    hideAllControls() {
        const elements = gameView.elements;
        elements.startDistribution.classList.add('d-none');
        elements.startGame.classList.add('d-none');
        elements.startVoting.classList.add('d-none');
        elements.goToNight.classList.add('d-none');
        elements.ppkButton.classList.add('d-none');
        elements.eliminatePlayerButton.classList.add('d-none');
        elements.votingSection.classList.add('d-none');
        elements.nightSection.classList.add('d-none');
        elements.bestMoveSection.classList.add('d-none');
    }

    showSeatingControls() {
        // Показываем кнопки для перехода к раздаче ролей или возврата
        const customControls = this.createCustomButton('Начать раздачу ролей', () => {
            this.startRoleDistribution();
        });
        gameView.elements.gameActions.appendChild(customControls);
    }

    showRoleDistributionControls() {
        gameView.elements.startDistribution.classList.remove('d-none');
        gameView.elements.startGame.classList.remove('d-none');
    }

    showInProgressControls(substatus) {
        gameView.elements.ppkButton.classList.remove('d-none');
        gameView.elements.eliminatePlayerButton.classList.remove('d-none');
        
        switch (substatus) {
            case GAME_SUBSTATUS.DISCUSSION:
            case GAME_SUBSTATUS.CRITICAL_DISCUSSION:
                this.showDiscussionControls(substatus === GAME_SUBSTATUS.CRITICAL_DISCUSSION);
                break;
                
            case GAME_SUBSTATUS.VOTING:
                gameView.elements.votingSection.classList.remove('d-none');
                break;
                
            case GAME_SUBSTATUS.SUSPECTS_SPEECH:
                this.showSuspectsSpeechControls();
                break;
                
            case GAME_SUBSTATUS.FAREWELL_MINUTE:
                this.showFarewellControls();
                break;
                
            case GAME_SUBSTATUS.NIGHT:
                gameView.elements.nightSection.classList.remove('d-none');
                break;
        }
    }

    showDiscussionControls(isCritical = false) {
        const buttonText = isCritical ? 'Начать голосование (критический круг)' : 'Начать голосование';
        const voteButton = this.createCustomButton(buttonText, () => {
            this.startVoting();
        });
        
        const nightButton = this.createCustomButton('В ночь', () => {
            this.goToNight();
        });
        
        gameView.elements.gameActions.appendChild(voteButton);
        gameView.elements.gameActions.appendChild(nightButton);
    }

    showSuspectsSpeechControls() {
        const button = this.createCustomButton('К прощальной минуте', () => {
            gameModel.setGameSubstatus(GAME_SUBSTATUS.FAREWELL_MINUTE);
        });
        gameView.elements.gameActions.appendChild(button);
    }

    showFarewellControls() {
        const button = this.createCustomButton('В ночь', () => {
            this.goToNight();
        });
        gameView.elements.gameActions.appendChild(button);
    }

    showFinishedNoScoresControls() {
        const button = this.createCustomButton('Выставить баллы', () => {
            this.showScoreInterface();
        });
        gameView.elements.gameActions.appendChild(button);
    }

    showFinishedWithScoresControls() {
        // Показываем итоговую таблицу с баллами
        this.showFinalScores();
    }

    createCustomButton(text, onClick) {
        const button = document.createElement('button');
        button.className = 'btn btn-primary me-2 mb-2';
        button.textContent = text;
        button.onclick = onClick;
        return button;
    }

    updateLegacyPhase(status, substatus) {
        // Обновляем старую систему фаз для совместимости
        if (status === GAME_STATUSES.ROLE_DISTRIBUTION) {
            gameModel.state.phase = GAME_PHASES.DISTRIBUTION;
            gameView.updateGamePhase(GAME_PHASES.DISTRIBUTION);
        } else if (status === GAME_STATUSES.IN_PROGRESS) {
            switch (substatus) {
                case GAME_SUBSTATUS.DISCUSSION:
                case GAME_SUBSTATUS.CRITICAL_DISCUSSION:
                case GAME_SUBSTATUS.SUSPECTS_SPEECH:
                case GAME_SUBSTATUS.FAREWELL_MINUTE:
                    gameModel.state.phase = GAME_PHASES.DAY;
                    gameView.updateGamePhase(GAME_PHASES.DAY);
                    break;
                case GAME_SUBSTATUS.VOTING:
                    gameModel.state.phase = GAME_PHASES.VOTING;
                    gameView.updateGamePhase(GAME_PHASES.VOTING);
                    break;
                case GAME_SUBSTATUS.NIGHT:
                    gameModel.state.phase = GAME_PHASES.NIGHT;
                    gameView.updateGamePhase(GAME_PHASES.NIGHT);
                    break;
            }
        }
    }

    // Методы переходов между статусами
    startSeating() {
        if (gameModel.canTransitionTo(GAME_STATUSES.SEATING_READY)) {
            gameModel.setGameStatus(GAME_STATUSES.SEATING_READY);
        }
    }

    startRoleDistribution() {
	console.log('Запуск раздачи ролей, текущий статус:', gameModel.state.gameStatus);
	if (gameModel.canTransitionTo(GAME_STATUSES.ROLE_DISTRIBUTION)) {
            gameModel.setGameStatus(GAME_STATUSES.ROLE_DISTRIBUTION);
            console.log('Статус изменен на ROLE_DISTRIBUTION');
	} else {
            console.error('Невозможно перейти к раздаче ролей из текущего статуса:', gameModel.state.gameStatus);
	}
    }

    async startGame() {
	console.log('Попытка начать игру...');
	console.log('Текущий статус игры:', gameModel.state.gameStatus);
	console.log('Игроки:', gameModel.state.players.map(p => ({ id: p.id, role: p.role })));
	
	const gameRulesService = await import('../../services/game-rules-service.js');
	
	if (!gameRulesService.default.canStartGame(gameModel.state.players)) {
            console.error('Роли распределены неправильно');
            const mafiaCount = gameModel.state.players.filter(p => p.role === 'Мафия').length;
            const donCount = gameModel.state.players.filter(p => p.role === 'Дон').length;
            const sheriffCount = gameModel.state.players.filter(p => p.role === 'Шериф').length;
            console.log('Текущее распределение ролей:', { mafiaCount, donCount, sheriffCount });
            
            // Попробуйте импортировать toastManager по-другому
            try {
		const toastManager = await import('../../utils/toast-manager.js');
		toastManager.default.error('Необходимо распределить 2 мафии, 1 дона и 1 шерифа!');
            } catch (error) {
		console.error('Ошибка импорта toastManager:', error);
		alert('Необходимо распределить 2 мафии, 1 дона и 1 шерифа!');
            }
            return;
	}
	
	console.log('Проверка возможности перехода к IN_PROGRESS...');
	if (gameModel.canTransitionTo(GAME_STATUSES.IN_PROGRESS)) {
            console.log('Переход разрешен, начинаем игру...');
            gameModel.setGameStatus(GAME_STATUSES.IN_PROGRESS, GAME_SUBSTATUS.DISCUSSION);
            gameModel.state.isGameStarted = true;
            gameModel.state.round = 1;

            try {
		await this.updateGameStatus("in_progress");
		await gameModel.saveGameState();
		console.log('Игра успешно начата');
            } catch (error) {
		console.error('Ошибка при сохранении статуса игры:', error);
            }
            
            timerService.reset();
            
            this.emit('gameStarted');
	} else {
            console.error('Невозможно перейти к IN_PROGRESS из текущего статуса:', gameModel.state.gameStatus);
	}
    }

    startVoting() {
        if (gameModel.state.gameStatus === GAME_STATUSES.IN_PROGRESS) {
            // Проверяем, критический ли круг
            const isCritical = gameModel.isCriticalRound();
            if (isCritical && gameModel.state.gameSubstatus !== GAME_SUBSTATUS.CRITICAL_DISCUSSION) {
                gameModel.setGameSubstatus(GAME_SUBSTATUS.CRITICAL_DISCUSSION);
                return;
            }
            
            gameModel.setGameSubstatus(GAME_SUBSTATUS.VOTING);
            this.emit('votingStarted');
        }
    }

    goToNight() {
        if (gameModel.state.gameStatus === GAME_STATUSES.IN_PROGRESS) {
            gameModel.setGameSubstatus(GAME_SUBSTATUS.NIGHT);
            this.emit('nightStarted');
        }
    }

    finishGame(result) {
        if (gameModel.canTransitionTo(GAME_STATUSES.FINISHED_NO_SCORES)) {
            gameModel.setGameStatus(GAME_STATUSES.FINISHED_NO_SCORES);
            gameModel.state.isGameStarted = false;
            
            // Устанавливаем базовые баллы в зависимости от результата
            this.setBaseScores(result);
            
            timerService.stop();
            this.emit('gameFinished', result);
        }
    }

    setBaseScores(result) {
        gameModel.state.players.forEach(player => {
            let baseScore = 0;
            
            const isWinner = (result === 'city_win' && (player.originalRole === 'Мирный' || player.originalRole === 'Шериф')) ||
                           (result === 'mafia_win' && (player.originalRole === 'Мафия' || player.originalRole === 'Дон'));
            
            if (result === 'draw') {
                baseScore = 0.5; // При ничьей всем по 0.5 балла
            } else if (isWinner) {
                baseScore = 1; // Победители получают 1 балл
            } else {
                baseScore = 0; // Проигравшие получают 0 баллов
            }
            
            gameModel.setPlayerScore(player.id, baseScore, 0);
        });
    }

    showScoreInterface() {
        // Показываем интерфейс для выставления дополнительных баллов
        this.emit('showScoreInterface');
    }

    finishScoring() {
        if (gameModel.canTransitionTo(GAME_STATUSES.FINISHED_WITH_SCORES)) {
            gameModel.setGameStatus(GAME_STATUSES.FINISHED_WITH_SCORES);
            this.emit('scoringFinished');
        }
    }

    showFinalScores() {
        // Показываем финальную таблицу с баллами
        this.emit('showFinalScores');
    }

    // Остальные методы...
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
