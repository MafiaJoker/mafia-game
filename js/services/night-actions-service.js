// services/night-actions-service.js
import gameModel from '../models/game-model.js';
import { PLAYER_ROLES } from '../utils/constants.js';
import EventEmitter from '../utils/event-emitter.js';

export class NightActionsService extends EventEmitter {
    constructor() {
        super();
    }

    // Проверка шерифа
    checkSheriff(targetPlayerId) {
        const target = gameModel.getPlayer(targetPlayerId);
        if (!target) return null;
        
        const isMafia = target.originalRole === PLAYER_ROLES.MAFIA || 
                         target.originalRole === PLAYER_ROLES.DON;
                         
        this.emit('sheriffCheck', {
            targetId: targetPlayerId,
            targetName: target.name,
            isMafia: isMafia
        });
        
        return {
            targetId: targetPlayerId,
            targetName: target.name,
            isMafia: isMafia
        };
    }

    // Проверка дона
    checkDon(targetPlayerId) {
        const target = gameModel.getPlayer(targetPlayerId);
        if (!target) return null;
        
        const isSheriff = target.originalRole === PLAYER_ROLES.SHERIFF;
        
        this.emit('donCheck', {
            targetId: targetPlayerId,
            targetName: target.name,
            isSheriff: isSheriff
        });
        
        return {
            targetId: targetPlayerId,
            targetName: target.name,
            isSheriff: isSheriff
        };
    }

    // Выстрел мафии
    mafiaShoot(targetPlayerId) {
        if (targetPlayerId === 0) {
            // Промах - просто уведомляем
            this.emit('mafiaShoot', { miss: true });
            return { miss: true };
        }
        
        const target = gameModel.getPlayer(targetPlayerId);
        if (!target || !target.isAlive || target.isEliminated) {
            return null;
        }
        
        this.emit('mafiaShoot', {
            targetId: targetPlayerId,
            targetName: target.name
        });
        
        return {
            targetId: targetPlayerId,
            targetName: target.name
        };
    }

    // Применение ночных действий
    applyNightActions() {
        // Обработка выстрела мафии
        if (gameModel.state.mafiaTarget && gameModel.state.mafiaTarget !== 0) {
            const target = gameModel.getPlayer(gameModel.state.mafiaTarget);
            
            if (target && target.isAlive && !target.isEliminated) {
                target.isAlive = false;
                gameModel.state.deadPlayers.push(gameModel.state.mafiaTarget);
                gameModel.state.nightKill = gameModel.state.mafiaTarget;
                
                // Сбрасываем все номинации для этого игрока
                gameModel.state.players.forEach(p => {
                    if (p.nominated === gameModel.state.mafiaTarget) {
                        p.nominated = null;
                    }
                });
                
                this.emit('playerKilled', {
                    targetId: target.id,
                    targetName: target.name
                });
            }
        }
        
        // Переход к следующему дню
        gameModel.state.round++;
        gameModel.state.phase = 'day';
        
        // Обработка статусов "молчания"
        gameModel.state.players.forEach(p => {
            if (p.silentNextRound) {
                p.isSilent = true;
                p.silentNextRound = false;
            } else if (p.isSilent) {
                p.isSilent = false;
            }
        });
        
        this.emit('nightActionsApplied', {
            round: gameModel.state.round
        });
        
        return {
            round: gameModel.state.round,
            killed: gameModel.state.nightKill
        };
    }
}

export default new NightActionsService();
