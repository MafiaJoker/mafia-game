// js/controllers/game/night-actions-controller.js
import gameModel from '../../models/game-model.js';
import gameView from '../../views/game-view.js';
import nightActionsService from '../../services/night-actions-service.js';
import { GAME_STATUSES, GAME_SUBSTATUS } from '../../utils/constants.js';
import EventEmitter from '../../utils/event-emitter.js';

export class NightActionsController extends EventEmitter {
    constructor() {
        super();
        this.setupNightListeners();
    }

    setupNightListeners() {
        nightActionsService.on('sheriffCheck', (result) => {
            gameView.updateSheriffCheckResult(result);
        });
        
        nightActionsService.on('donCheck', (result) => {
            gameView.updateDonCheckResult(result);
        });
        
        nightActionsService.on('nightActionsApplied', (result) => {
            // Обновляем UI для нового дня (обсуждение)
            gameView.updateGameStatus(gameModel.state.gameStatus, gameModel.state.gameSubstatus);
            gameView.updateRound(result.round);
            
            console.log("Ночные действия применены, round:", result.round);
            console.log("Убитые игроки:", gameModel.state.deadPlayers);
            console.log("Исключенные игроки:", gameModel.state.eliminatedPlayers);
            
            const bestMoveShown = this.emit('checkBestMove');
            
            if (!bestMoveShown) {
                this.emit('updatePlayers');
                this.emit('updateNominations');
            }
        });
    }

    goToNight() {
        gameModel.setGameSubstatus(GAME_SUBSTATUS.NIGHT);
        gameView.updateGameStatus(gameModel.state.gameStatus, gameModel.state.gameSubstatus);
        
        // Сброс ночных целей
        gameModel.state.mafiaTarget = null;
        gameModel.state.donTarget = null;
        gameModel.state.sheriffTarget = null;
        gameModel.state.nominatedPlayers = [];

        // Очистка всех номинаций
        gameModel.state.players.forEach(p => {
            p.nominated = null;
        });

        this.emit('updatePlayers');
        gameView.renderNightActions(gameModel.state.players);
    }

    selectMafiaTarget(playerId) {
        gameModel.state.mafiaTarget = playerId;
        gameView.renderNightActions(gameModel.state.players);
    }

    selectDonTarget(playerId) {
        gameModel.state.donTarget = playerId;
        const checkResult = nightActionsService.checkDon(playerId);
        gameView.renderNightActions(gameModel.state.players);
    }

    selectSheriffTarget(playerId) {
        gameModel.state.sheriffTarget = playerId;
        const checkResult = nightActionsService.checkSheriff(playerId);
        gameView.renderNightActions(gameModel.state.players);
    }
    
    async confirmNight() {
	// Просто применяем ночные действия - вся остальная логика в обработчике события
	nightActionsService.applyNightActions();
	
	// Очистка результатов предыдущих ночных проверок
	gameView.elements.donResult.classList.add('d-none');
	gameView.elements.sheriffResult.classList.add('d-none');
    }
    
    // async confirmNight() {
    //     const nightResult = nightActionsService.applyNightActions();
        
    //     // Переходим к обсуждению нового дня
    //     gameView.updateGameStatus(gameModel.state.gameStatus, gameModel.state.gameSubstatus);

    //     // Обновляем статус игры при изменении круга
    //     this.emit('updateGameStatus', "in_progress");
        
    //     // Очистка результатов предыдущих ночных проверок
    //     gameView.elements.donResult.classList.add('d-none');
    //     gameView.elements.sheriffResult.classList.add('d-none');

    // 	const gameController = await import('../game-controller.js');
    // 	const bestMoveShown = gameController.default.bestMoveController.checkForBestMove();
	
    // 	if (!bestMoveShown) {
    //         this.emit('updatePlayers');
    //         this.emit('checkGameEnd');
    //         this.emit('updateNominations');
    // 	}
    // }
}

export default new NightActionsController();
