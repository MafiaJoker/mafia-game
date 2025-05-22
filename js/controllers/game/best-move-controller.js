// js/controllers/game/best-move-controller.js
import gameModel from '../../models/game-model.js';
import gameView from '../../views/game-view.js';
import EventEmitter from '../../utils/event-emitter.js';

export class BestMoveController extends EventEmitter {
    constructor() {
        super();
    }

    checkForBestMove() {
        // Проверка на первого убитого для лучшего хода
        if (gameModel.state.deadPlayers.length === 1 && 
            gameModel.state.eliminatedPlayers.length === 0 && 
            gameModel.state.round === 1 &&
            !gameModel.state.bestMoveUsed) {
            
            this.showBestMove(gameModel.state.deadPlayers[0]);
            return true;
        } else {
            this.emit('checkGameEnd');
            this.emit('updateNominations');
            return false;
        }
    }
    
    showBestMove(playerId) {
        const player = gameModel.getPlayer(playerId);
        if (!player) return false;
        
        console.log("Показываем лучший ход для игрока:", player);
        gameModel.state.bestMoveTargets = new Set();
        gameView.showBestMoveSection(player);
        return true;
    }
    
    toggleBestMoveTarget(playerId, button) {
        if (gameModel.state.bestMoveTargets.has(playerId)) {
            gameModel.state.bestMoveTargets.delete(playerId);
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-primary');
        } else if (gameModel.state.bestMoveTargets.size < 3) {
            gameModel.state.bestMoveTargets.add(playerId);
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-success');
        }
        
        gameView.updateBestMoveSelection(gameModel.state.bestMoveTargets.size);
    }

    confirmBestMove() {
        gameModel.state.bestMoveUsed = true;
        gameView.hideBestMoveSection();
        
        this.emit('updatePlayers');
        this.emit('checkGameEnd');
        this.emit('updateNominations');
    }
}

export default new BestMoveController();
