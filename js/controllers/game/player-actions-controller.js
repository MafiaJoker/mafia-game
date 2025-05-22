// js/controllers/game/player-actions-controller.js
import gameModel from '../../models/game-model.js';
import gameView from '../../views/game-view.js';
import { MAX_FOULS } from '../../utils/constants.js';
import EventEmitter from '../../utils/event-emitter.js';
import gameRulesService from '../../services/game-rules-service.js';

export class PlayerActionsController extends EventEmitter {
    constructor() {
        super();
    }

    async eliminatePlayer(playerId) {
        const player = gameModel.getPlayer(playerId);
        if (player) {
            player.eliminate();
            gameModel.state.eliminatedPlayers.push(playerId);
            
            // Сбрасываем все номинации для этого игрока
            gameModel.state.players.forEach(p => {
                if (p.nominated === playerId) {
                    p.nominated = null;
                }
            });
            
            await gameModel.saveGameState();
            this.emit('playerEliminated', playerId);
        }
    }

    setSilentNow(playerId) {
        const player = gameModel.getPlayer(playerId);
        if (player) {
            player.setSilentNow();
            this.emit('playerSilenced', { playerId, type: 'now' });
        }
    }

    setSilentNextRound(playerId) {
        const player = gameModel.getPlayer(playerId);
        if (player) {
            player.setSilentNextRound();
            this.emit('playerSilenced', { playerId, type: 'next' });
        }
    }

    nominatePlayer(nominatorId, nominatedId) {
        const nominator = gameModel.getPlayer(nominatorId);
        
        if (nominatedId) {
            nominator.nominated = nominatedId;
        } else {
            nominator.nominated = null;
        }
        
        this.emit('playerNominated', { nominatorId, nominatedId });
    }

    incrementFoul(playerId) {
        const player = gameModel.getPlayer(playerId);
        if (player) {
            if (player.fouls < MAX_FOULS.BEFORE_SILENCE || 
                (player.fouls === MAX_FOULS.BEFORE_SILENCE && (player.isSilent || player.silentNextRound)) ||
                player.fouls >= MAX_FOULS.BEFORE_ELIMINATION) {
                player.incrementFoul();
                this.emit('playerFoulChanged', { playerId, fouls: player.fouls });
            }
        }
    }

    resetFouls(playerId) {
        const player = gameModel.getPlayer(playerId);
        if (player) {
            player.fouls = 0;
            this.emit('playerFoulChanged', { playerId, fouls: 0 });
        }
    }

    changePlayerRole(playerId) {

        
        if (!gameRulesService.canChangeRoles(gameModel.state.phase)) {
            return;
        }
        
        const player = gameModel.getPlayer(playerId);
        if (!player) return;
        
        const existingRoles = gameModel.state.players.map(p => p.role);
        const newRole = player.changeRole(existingRoles);
        
        this.emit('playerRoleChanged', { playerId, newRole });
        
        const canStartGame = gameRulesService.canStartGame(gameModel.state.players);
        this.emit('canStartGameChanged', canStartGame);
        
        return newRole;
    }

    showEliminatePlayerModal() {
        gameView.showEliminatePlayerModal(gameModel.state.players);
    }
}

export default new PlayerActionsController();
