// js/services/game-state-manager.js
import apiAdapter from '../adapter.js';
import EventEmitter from '../utils/event-emitter.js';

export class GameStateManager extends EventEmitter {
    constructor() {
        super();
        this.autoSaveInterval = null;
        this.isDirty = false;
    }
    
    async saveState(gameId, state) {
        try {
            console.log('Сохранение состояния для игры ID:', gameId);
            
            const validatedState = this.validateState(state);
            if (!validatedState.isValid) {
                throw new Error(`Некорректное состояние игры: ${validatedState.errors.join(', ')}`);
            }
            
            // Преобразуем Set bestMoveTargets в массив для сохранения
            const stateToSave = {
                ...state,
                bestMoveTargets: Array.from(state.bestMoveTargets || [])
            };
            
            await apiAdapter.saveGameState(gameId, stateToSave);
            console.log('Состояние игры успешно сохранено');
            
            this.isDirty = false;
            this.emit('stateSaved', gameId);
            return true;
        } catch (error) {
            console.error('Ошибка сохранения состояния игры:', error);
            this.emit('saveError', error);
            return false;
        }
    }
    
    async loadState(gameId) {
        try {
            console.log('Загрузка состояния для игры ID:', gameId);
            
            const gameState = await apiAdapter.getGameState(gameId);
            console.log('Ответ от сервера:', gameState);
            
            if (gameState && gameState.round !== undefined) {
                // Преобразуем bestMoveTargets из массива в Set
                if (gameState.bestMoveTargets && Array.isArray(gameState.bestMoveTargets)) {
                    gameState.bestMoveTargets = new Set(gameState.bestMoveTargets);
                } else {
                    gameState.bestMoveTargets = new Set();
                }
                
                console.log('Состояние игры успешно загружено');
                this.emit('stateLoaded', gameId, gameState);
                return gameState;
            } else {
                console.log('Состояние игры не найдено или пустое');
                return null;
            }
        } catch (error) {
            console.error('Ошибка загрузки состояния игры:', error);
            this.emit('loadError', error);
            return null;
        }
    }
    
    validateState(state) {
        const errors = [];
        
        // Проверка обязательных полей
        if (typeof state.round !== 'number') {
            errors.push('round должен быть числом');
        }
                
        if (!Array.isArray(state.players)) {
            errors.push('players должен быть массивом');
        } else if (state.players.length === 0) {
            errors.push('должен быть хотя бы один игрок');
        }
        
        // Проверка игроков
        state.players?.forEach((player, index) => {
            if (!player.id) {
                errors.push(`игрок ${index} должен иметь id`);
            }
            if (!player.name) {
                errors.push(`игрок ${index} должен иметь имя`);
            }
        });
                
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    markDirty() {
        this.isDirty = true;
        this.emit('stateChanged');
    }
    
    startAutoSave(gameId, intervalMs = 30000) {
        this.stopAutoSave();
        
        this.autoSaveInterval = setInterval(async () => {
            if (this.isDirty) {
                console.log('Автосохранение состояния игры...');
                // Получаем текущее состояние из gameModel
                const gameModel = await import('../models/game-model.js');
                await this.saveState(gameId, gameModel.default.state);
            }
        }, intervalMs);
        
        this.emit('autoSaveStarted', intervalMs);
    }
    
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            this.emit('autoSaveStopped');
        }
    }
}

export default new GameStateManager();
