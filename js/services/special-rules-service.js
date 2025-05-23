import gameModel from '../models/game-model.js';
import { GAME_SUBSTATUS } from '../utils/constants.js';

export class SpecialRulesService {
    
    // Проверяем, можно ли говорить игрокам, которые должны молчать
    canSpeakOnCriticalRound(playerId) {
        const player = gameModel.getPlayer(playerId);
        if (!player || !player.isSilent) return false;
        
        const currentSubstatus = gameModel.state.gameSubstatus;
        
        // На угадайке или во время речи подозреваемых молчащие могут говорить 30 секунд
        return [
            GAME_SUBSTATUS.CRITICAL_DISCUSSION,
            GAME_SUBSTATUS.SUSPECTS_SPEECH
        ].includes(currentSubstatus);
    }
    
    // Получаем время, которое игрок может говорить на особых фазах
    getSpeechTimeForSilentPlayer(playerId) {
        if (this.canSpeakOnCriticalRound(playerId)) {
            return 30; // 30 секунд
        }
        return 0;
    }
    
    // Проверяем, нужно ли отменить голосование из-за удаления
    shouldCancelVotingOnElimination(eliminatedPlayerId) {
        const currentSubstatus = gameModel.state.gameSubstatus;
        
        return [
            GAME_SUBSTATUS.DISCUSSION,
            GAME_SUBSTATUS.CRITICAL_DISCUSSION,
            GAME_SUBSTATUS.VOTING,
            GAME_SUBSTATUS.SUSPECTS_SPEECH
        ].includes(currentSubstatus);
    }
    
    // Проверяем, нужно ли пропустить голосование на следующем кругу
    shouldSkipNextVoting(eliminatedPlayerId) {
        const currentSubstatus = gameModel.state.gameSubstatus;
        
        return currentSubstatus === GAME_SUBSTATUS.FAREWELL_MINUTE;
    }
}

export default new SpecialRulesService();
