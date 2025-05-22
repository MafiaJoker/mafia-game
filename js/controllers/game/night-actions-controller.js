// js/controllers/game/night-actions-controller.js
import gameModel from '../../models/game-model.js';
import gameView from '../../views/game-view.js';
import nightActionsService from '../../services/night-actions-service.js';
import { GAME_PHASES } from '../../utils/constants.js';
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
            gameView.updateGamePhase(GAME_PHASES.DAY);
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
        gameModel.state.phase = GAME_PHASES.NIGHT;
        gameView.updateGamePhase(GAME_PHASES.NIGHT);
        
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
        const nightResult = nightActionsService.applyNightActions();
        gameView.updateGamePhase(GAME_PHASES.DAY);

        // Обновляем статус игры при изменении круга
        this.emit('updateGameStatus', "in_progress");
        
        // Очистка результатов предыдущих ночных проверок
        gameView.elements.donResult.classList.add('d-none');
        gameView.elements.sheriffResult.classList.add('d-none');
        
        this.emit('checkBestMove');
        this.emit('updatePlayers');
        this.emit('checkGameEnd');
        this.emit('updateNominations');
    }
}

export default new NightActionsController();
