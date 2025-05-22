// js/controllers/game/player-actions-controller.js
import gameModel from '../../models/game-model.js';
import gameView from '../../views/game-view.js';
import { MAX_FOULS } from '../../utils/constants.js';
import EventEmitter from '../../utils/event-emitter.js';

export class PlayerActionsController extends EventEmitter {
    constructor() {
        super();
    }

    async eliminatePlayer(playerId) {
        const player = gameModel.getPlayer(playerId);
        if (player) {
            player.eliminate();
            gameModel.state.eliminatedPlayers.push(playerId);
            
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
	console.log(`Попытка изменить роль игрока ${playerId}, статус игры: ${gameModel.state.gameStatus}`);
	
	// Используем новый метод проверки статуса
	if (!gameModel.isInRoleDistribution()) {
            console.log('Не в режиме раздачи ролей, изменение роли отклонено');
            return;
	}
	
	const player = gameModel.getPlayer(playerId);
	if (!player) {
            console.log(`Игрок ${playerId} не найден`);
            return;
	}
	
	const existingRoles = gameModel.state.players.map(p => p.role);
	const oldRole = player.role;
	const newRole = player.changeRole(existingRoles);
	
	console.log(`Роль игрока ${playerId} изменена с ${oldRole} на ${newRole}`);
	
	this.emit('playerRoleChanged', { playerId, newRole });
	
	const canStartGame = gameModel.canStartGame();
	console.log(`Проверка возможности начать игру: ${canStartGame}`);
	this.emit('canStartGameChanged', canStartGame);
	
	return newRole;
    }

    showEliminatePlayerModal() {
        gameView.showEliminatePlayerModal(gameModel.state.players);
    }
}

export default new PlayerActionsController();
