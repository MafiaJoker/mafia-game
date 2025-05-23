// js/controllers/game/game-flow-controller.js
import gameModel from '../../models/game-model.js';
import gameView from '../../views/game-view.js';
import timerService from '../../utils/timer-service.js';
import { 
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
            // Для новой игры начинаем с статуса SEATING_READY вместо CREATED
            gameModel.setGameStatus(GAME_STATUSES.SEATING_READY);
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
            gameModel.state.isGameStarted = true;
            
            this.updateUIForStatus(GAME_STATUSES.IN_PROGRESS, GAME_SUBSTATUS.DISCUSSION);
	} else if (game.status === "finished") {
            this.handleFinishedGame(game);
	} else {
            // Для не начатых игр ставим статус SEATING_READY
            gameModel.setGameStatus(GAME_STATUSES.SEATING_READY);
            this.updateUIForStatus(GAME_STATUSES.SEATING_READY);
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
            console.log('Показываем кнопку перехода к рассадке');
            // Вместо кнопки "Раздать роли" показываем кнопку "Подготовить рассадку"
            const seatingButton = this.createCustomButton('Подготовить рассадку', () => {
		this.startSeating();
            });
            gameView.elements.gameActions.appendChild(seatingButton);
            break;
            
	case GAME_STATUSES.SEATING_READY:
            this.showSeatingControls();
            break;
            
	case GAME_STATUSES.ROLE_DISTRIBUTION:
            console.log('Показываем контролы раздачи ролей');
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

	// Удаляем все кастомные кнопки
	this.clearCustomButtons();
    }
    
    // Добавляем метод для очистки кастомных кнопок
    clearCustomButtons() {
	const customButtons = gameView.elements.gameActions.querySelectorAll('button:not([id])');
	customButtons.forEach(button => button.remove());
    }

    showSeatingControls() {
        // Показываем кнопки для перехода к раздаче ролей или возврата
        const customControls = this.createCustomButton('Начать раздачу ролей', () => {
            this.startRoleDistribution();
        });
        gameView.elements.gameActions.appendChild(customControls);
    }

    showRoleDistributionControls() {
	// НЕ показываем кнопку "Раздать роли" в режиме раздачи ролей
	// gameView.elements.startDistribution.classList.remove('d-none');
	
	// Добавляем кнопку отмены раздачи ролей
	const cancelButton = this.createCustomButton('Отменить раздачу ролей', () => {
            this.cancelRoleDistribution();
	});
	cancelButton.classList.add('btn-secondary');
	cancelButton.classList.remove('btn-primary');
	gameView.elements.gameActions.appendChild(cancelButton);
	
	// Кнопка "Начать игру" будет показана только когда роли правильно розданы
	const canStart = gameModel.canStartGame();
	gameView.elements.startGame.classList.toggle('d-none', !canStart);
    }

    cancelRoleDistribution() {
	// Сбрасываем все роли на "Мирный"
	gameModel.state.players.forEach(player => {
            player.role = 'Мирный';
            player.originalRole = 'Мирный';
	});
	
	// Возвращаемся к статусу "Рассадка готова", а не "Создано"
	gameModel.setGameStatus(GAME_STATUSES.SEATING_READY);
	
	// Скрываем кнопку "Начать игру"
	gameView.elements.startGame.classList.add('d-none');
	
	this.emit('updatePlayers');
    }

    showInProgressControls(substatus) {
	gameView.elements.ppkButton.classList.remove('d-none');
	gameView.elements.eliminatePlayerButton.classList.remove('d-none');
	
	// Добавляем кнопку отмены игры рядом с ППК
	const cancelButton = this.createCustomButton('Отменить игру', () => {
            this.showCancelGameModal();
	});
	cancelButton.classList.add('btn-outline-warning');
	cancelButton.classList.remove('btn-primary');
	gameView.elements.gameActions.appendChild(cancelButton);
	
	switch (substatus) {
        case GAME_SUBSTATUS.DISCUSSION:
        case GAME_SUBSTATUS.CRITICAL_DISCUSSION:
            this.showDiscussionControls(substatus === GAME_SUBSTATUS.CRITICAL_DISCUSSION);
            break;
            
        case GAME_SUBSTATUS.VOTING:
            this.showVotingControls();
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

    showVotingControls() {
	gameView.elements.votingSection.classList.remove('d-none');
	
	// Добавляем кнопку отмены голосования
	const cancelVotingButton = this.createCustomButton('Отменить голосование', () => {
            this.cancelVoting();
	});
	cancelVotingButton.classList.add('btn-outline-secondary');
	cancelVotingButton.classList.remove('btn-primary');
	gameView.elements.gameActions.appendChild(cancelVotingButton);
    }

    cancelVoting() {
	// Возвращаемся к обсуждению
	const isCritical = gameModel.isCriticalRound();
	const newSubstatus = isCritical ? GAME_SUBSTATUS.CRITICAL_DISCUSSION : GAME_SUBSTATUS.DISCUSSION;
	
	gameModel.setGameSubstatus(newSubstatus);
	
	// Сбрасываем результаты голосования
	gameModel.state.votingResults = {};
	gameModel.state.shootoutPlayers = [];
	
	this.emit('votingCancelled');
    }

    showCancelGameModal() {
	// Создаем модальное окно для отмены игры
	const modal = this.createCancelGameModal();
	document.body.appendChild(modal);
	
	const bootstrapModal = new bootstrap.Modal(modal);
	bootstrapModal.show();
	
	// Удаляем модальное окно после закрытия
	modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
	});
    }

    createCancelGameModal() {
	const modal = document.createElement('div');
	modal.className = 'modal fade';
	modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-warning text-dark">
                    <h5 class="modal-title">Отмена игры</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Причина отмены:</label>
                        <select class="form-select" id="cancellationReason">
                            <option value="player_misbehavior">Нарушение правил игроком</option>
                            <option value="technical_issues">Технические проблемы</option>
                            <option value="insufficient_players">Недостаточно игроков</option>
                            <option value="other">Другая причина</option>
                        </select>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Номер игрока (если применимо):</label>
                        <select class="form-select" id="playerSlot">
                            <option value="">Не указано</option>
                            ${gameModel.state.players.map(p => 
                                `<option value="${p.id}">${p.id}: ${p.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Комментарий:</label>
                        <textarea class="form-control" id="cancellationComment" rows="3"></textarea>
                    </div>
                    
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="withRestart">
                        <label class="form-check-label" for="withRestart">
                            Перерасдача (начать заново с рассадки)
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                    <button type="button" class="btn btn-warning" id="confirmCancellation">Отменить игру</button>
                </div>
            </div>
        </div>
    `;
	
	// Обработчик подтверждения отмены
	modal.querySelector('#confirmCancellation').addEventListener('click', async () => {
            const reason = modal.querySelector('#cancellationReason').value;
            const playerSlot = modal.querySelector('#playerSlot').value || null;
            const comment = modal.querySelector('#cancellationComment').value;
            const withRestart = modal.querySelector('#withRestart').checked;
            
            await this.cancelGame(reason, playerSlot, comment, withRestart);
            
            bootstrap.Modal.getInstance(modal).hide();
	});
	
	return modal;
    }

    async cancelGame(reason, playerSlot, comment, withRestart) {
	const success = await gameModel.cancelGame(reason, playerSlot, comment, withRestart);
	
	if (success) {
            if (withRestart) {
		// Показываем сообщение и кнопку для перерасдачи
		this.showCancellationWithRestartControls();
            } else {
		// Просто показываем сообщение об отмене
		this.showCancellationControls();
            }
            
            this.emit('gameCancelled', { reason, playerSlot, comment, withRestart });
	}
    }

    showCancellationControls() {
	gameView.showGameStatus('Игра отменена', 'warning');
	this.hideAllControls();
	
	const message = this.createCustomButton('Игра отменена', () => {});
	message.disabled = true;
	message.classList.add('btn-warning');
	gameView.elements.gameActions.appendChild(message);
    }

    showCancellationWithRestartControls() {
	gameView.showGameStatus('Игра отменена. Возможна перерасдача.', 'warning');
	this.hideAllControls();
	
	const restartButton = this.createCustomButton('Начать перерасдачу', async () => {
            await this.restartAfterCancellation();
	});
	restartButton.classList.add('btn-success');
	gameView.elements.gameActions.appendChild(restartButton);
    }

    async restartAfterCancellation() {
	const success = await gameModel.restartAfterCancellation();
	
	if (success) {
            gameView.showGameStatus('Игра перезапущена. Рассадка готова.', 'success');
            this.emit('gameRestarted');
            this.emit('updatePlayers');
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

    updateUIForSubstatus(substatus) {
        // Обновляем UI для изменения подстатуса
        this.updateControlsVisibility(gameModel.state.gameStatus, substatus);
    }

    // Методы переходов между статусами
    startSeating() {
	if (gameModel.canTransitionTo(GAME_STATUSES.SEATING_READY)) {
            gameModel.setGameStatus(GAME_STATUSES.SEATING_READY);
            console.log('Статус изменен на SEATING_READY');
	} else {
            console.error('Невозможно перейти к рассадке из текущего статуса:', gameModel.state.gameStatus);
	}
    }

    startRoleDistribution() {
        console.log('Запуск раздачи ролей, текущий статус:', gameModel.state.gameStatus);
        if (gameModel.canTransitionTo(GAME_STATUSES.ROLE_DISTRIBUTION)) {
            gameModel.setGameStatus(GAME_STATUSES.ROLE_DISTRIBUTION);
            console.log('Статус изменен на ROLE_DISTRIBUTION');

	    this.emit('updatePlayers');
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

    endGame() {
        // Отключаем все игровые контролы
        gameView.disableGameControls();
        
        // Останавливаем автосохранение
        gameModel.stopAutoSave();
        
        this.emit('gameEnded');
    }
}

export default new GameFlowController();
