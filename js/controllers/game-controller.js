// js/controllers/game-controller.js
import gameModel from '../models/game-model.js';
import gameView from '../views/game-view.js';
import timerService from '../utils/timer-service.js';

// Импорт специализированных контроллеров
import gameFlowController from './game/game-flow-controller.js';
import playerActionsController from './game/player-actions-controller.js';
import votingController from './game/voting-controller.js';
import nightActionsController from './game/night-actions-controller.js';
import bestMoveController from './game/best-move-controller.js';

// Импорт сервисов
import gameRulesService from '../services/game-rules-service.js';
import gameStateManager from '../services/game-state-manager.js';

export class GameController {
    constructor() {
        this.gameFlowController = gameFlowController;
        this.playerActionsController = playerActionsController;
        this.votingController = votingController;
        this.nightActionsController = nightActionsController;
        this.bestMoveController = bestMoveController;
        
        this.setupControllerEvents();
        this.setupModelEvents();
        this.setupTimerEvents();
	this.setupEventListeners();
    }

    setupControllerEvents() {
        // События игрового процесса
        this.gameFlowController.on('gameInitialized', () => {
            this.setupEventListeners();
            gameView.initModalHandlers();
            this.updatePlayers();
        });
        
        this.gameFlowController.on('gameLoaded', () => {
            this.setupEventListeners();
            gameView.initModalHandlers();
            this.updatePlayers();
        });

        this.gameFlowController.on('gameStarted', () => {
            this.votingController.updateNominatedPlayers();
            this.updatePlayers();
        });
        
        this.gameFlowController.on('gameEnded', () => {
            this.updatePlayers();
        });

	this.gameFlowController.on('updatePlayers', () => {
            console.log('Принудительное обновление списка игроков');
            this.updatePlayers();
	});
	
        // События действий с игроками
        this.playerActionsController.on('playerEliminated', () => {
            this.updatePlayers();
            this.checkGameEnd();
        });
        
        this.playerActionsController.on('playerSilenced', () => {
            this.updatePlayers();
        });
        
        this.playerActionsController.on('playerNominated', () => {
            this.votingController.updateNominatedPlayers();
            this.updatePlayers();
        });
        
        this.playerActionsController.on('playerFoulChanged', () => {
            this.updatePlayers();
        });
        
	this.playerActionsController.on('playerRoleChanged', ({ playerId, newRole }) => {
            console.log(`Роль игрока ${playerId} изменена на ${newRole}`);
            this.updatePlayers();
	});
        
	this.playerActionsController.on('canStartGameChanged', (canStart) => {
            console.log(`Можно начать игру: ${canStart}`);
            gameView.elements.startGame.classList.toggle('d-none', !canStart);
	});
	
        // События голосования
        this.votingController.on('checkGameEnd', () => {
            this.checkGameEnd();
        });
        
        this.votingController.on('playerEliminated', () => {
            this.updatePlayers();
            this.checkGameEnd();
        });
        
        this.votingController.on('eliminatePlayer', (playerId) => {
            this.playerActionsController.eliminatePlayer(playerId);
        });

        // События ночных действий
        this.nightActionsController.on('updatePlayers', () => {
            this.updatePlayers();
        });
        
        this.nightActionsController.on('updateNominations', () => {
            this.votingController.updateNominatedPlayers();
        });
        
        this.nightActionsController.on('checkBestMove', () => {
            return this.bestMoveController.checkForBestMove();
        });
        
        this.nightActionsController.on('checkGameEnd', () => {
            this.checkGameEnd();
        });
        
        this.nightActionsController.on('updateGameStatus', (status) => {
            this.gameFlowController.updateGameStatus(status);
        });

        // События лучшего хода
        this.bestMoveController.on('updatePlayers', () => {
            this.updatePlayers();
        });
        
        this.bestMoveController.on('checkGameEnd', () => {
            this.checkGameEnd();
        });
        
        this.bestMoveController.on('updateNominations', () => {
            this.votingController.updateNominatedPlayers();
        });

	this.gameFlowController.on('showScoreInterface', () => {
	    this.showScoreInterface();
	});

	this.gameFlowController.on('showFinalScores', () => {
	    this.showFinalScores();
	});
    }

    async showScoreInterface() {
	const { ScoreManager } = await import('../components/score-manager.js');
	const scoreManager = new ScoreManager();
	
	// Добавляем интерфейс в контейнер
	const container = document.querySelector('.container.main');
	if (container) {
            container.appendChild(scoreManager.element);
	}
    }

    showFinalScores() {
	// Показываем финальную таблицу с результатами игры
	const finalScoresHtml = this.generateFinalScoresHtml();
	gameView.showGameStatus(finalScoresHtml, 'success');
    }

    generateFinalScoresHtml() {
	let html = '<h4>Итоговые результаты игры</h4><table class="table table-sm"><thead><tr><th>Место</th><th>Игрок</th><th>Роль</th><th>Баллы</th></tr></thead><tbody>';
	
	// Сортируем игроков по общему количеству баллов
	const sortedPlayers = [...gameModel.state.players].sort((a, b) => {
            return gameModel.getTotalPlayerScore(b.id) - gameModel.getTotalPlayerScore(a.id);
	});
	
	sortedPlayers.forEach((player, index) => {
            const totalScore = gameModel.getTotalPlayerScore(player.id);
            html += `<tr>
            <td>${index + 1}</td>
            <td>${player.name}</td>
            <td>${player.originalRole}</td>
            <td><strong>${totalScore.toFixed(1)}</strong></td>
        </tr>`;
	});
	
	html += '</tbody></table>';
	return html;
    }
    
    setupModelEvents() {
        gameModel.on('rolesVisibilityChanged', (visible) => {
            this.updatePlayers();
        });
    }

    setupTimerEvents() {
        timerService.on('tick', (time) => {
            gameView.updateTimer(time);
        });
        
        timerService.on('reset', (time) => {
            gameView.updateTimer(time);
        });
    }

    async initGame() {
        await this.gameFlowController.initGame();
    }

    updatePlayers() {
        const callbacks = {
            onRoleChange: (playerId) => this.playerActionsController.changePlayerRole(playerId),
            onSilentNow: (playerId) => this.playerActionsController.setSilentNow(playerId),
            onSilentNext: (playerId) => this.playerActionsController.setSilentNextRound(playerId),
            onEliminate: (playerId) => this.playerActionsController.eliminatePlayer(playerId),
            onNominate: (nominatorId, nominatedId) => this.playerActionsController.nominatePlayer(nominatorId, nominatedId),
            onIncrementFoul: (playerId) => this.playerActionsController.incrementFoul(playerId),
            onResetFouls: (playerId) => this.playerActionsController.resetFouls(playerId)
        };
        
        gameView.renderPlayers(gameModel.state.players, gameModel.state, callbacks);
    }

    checkGameEnd() {
        const result = gameRulesService.checkWinConditions(
            gameModel.state.players, 
            gameModel.state.noCandidatesRounds
        );
        
        if (result.winner) {
            switch (result.winner) {
                case 'mafia':
                    this.declareMafiaWin();
                    break;
                case 'city':
                    this.declareCityWin();
                    break;
                case 'draw':
                    this.declareDraw();
                    break;
            }
            return true;
        }
        
        return false;
    }

    async declareMafiaWin() {
        await this.gameFlowController.updateGameStatus("finished", "mafia_win");
        this.gameFlowController.showGameEndMessage('mafia_win');
        this.gameFlowController.endGame();
    }

    async declareCityWin() {
        await this.gameFlowController.updateGameStatus("finished", "city_win");
        this.gameFlowController.showGameEndMessage('city_win');
        this.gameFlowController.endGame();
    }

    async declareDraw() {
        await this.gameFlowController.updateGameStatus("finished", "draw");
        this.gameFlowController.showGameEndMessage('draw');
        this.gameFlowController.endGame();
    }
    
    setupEventListeners() {
        // Основные игровые действия
        gameView.elements.startDistribution.addEventListener('click', () => 
            this.gameFlowController.initDistribution());
        gameView.elements.startGame.addEventListener('click', () => 
            this.gameFlowController.startGame());
        
        // Голосование
        gameView.elements.startVoting.addEventListener('click', () => 
            this.votingController.startVoting());
        gameView.elements.confirmVoting.addEventListener('click', () => 
            this.votingController.confirmVoting());
        gameView.elements.resetVoting.addEventListener('click', () => 
            this.votingController.resetVoting());
        
        // Ночные действия
        gameView.elements.goToNight.addEventListener('click', () => 
            this.nightActionsController.goToNight());
        gameView.elements.confirmNight.addEventListener('click', () => 
            this.nightActionsController.confirmNight());
        
        // Лучший ход
        gameView.elements.confirmBestMove.addEventListener('click', () => 
            this.bestMoveController.confirmBestMove());
        
        // Таймер
        gameView.elements.startTimer.addEventListener('click', () => timerService.start());
        gameView.elements.stopTimer.addEventListener('click', () => timerService.stop());
        gameView.elements.resetTimer.addEventListener('click', () => timerService.reset());

        // ППК
        gameView.elements.ppkButton.addEventListener('click', () => gameView.showPpkControls());
        gameView.elements.cancelPpk.addEventListener('click', () => gameView.hidePpkControls());
        gameView.elements.mafiaWin.addEventListener('click', () => this.declareMafiaWin());
        gameView.elements.cityWin.addEventListener('click', () => this.declareCityWin());

        // Удаление игрока
        gameView.elements.eliminatePlayerButton.addEventListener('click', () => 
            this.playerActionsController.showEliminatePlayerModal());
        
        // Переключение видимости ролей
        document.querySelector('.row.mb-2.fw-bold .col-2.text-center')
            .addEventListener('click', () => gameModel.toggleRolesVisibility());
    }

    // Методы для обратной совместимости с gameView
    selectMafiaTarget(playerId) {
        this.nightActionsController.selectMafiaTarget(playerId);
    }

    selectDonTarget(playerId) {
        this.nightActionsController.selectDonTarget(playerId);
    }

    selectSheriffTarget(playerId) {
        this.nightActionsController.selectSheriffTarget(playerId);
    }

    toggleBestMoveTarget(playerId, button) {
        this.bestMoveController.toggleBestMoveTarget(playerId, button);
    }

    eliminatePlayer(playerId) {
        this.playerActionsController.eliminatePlayer(playerId);
    }
}

export default new GameController();
