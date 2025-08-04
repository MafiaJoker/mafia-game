import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useGameStore } from './game'
import { useGamePhasesStore } from './gamePhases'
import { PLAYER_ROLES, GAME_SUBSTATUS } from '@/utils/constants'

export const useNightActionsStore = defineStore('nightActions', () => {
    const gameStore = useGameStore()
    const gamePhasesStore = useGamePhasesStore()
    
    // State for tests
    const nightKill = ref(null)
    const sheriffCheck = ref(null)
    const donCheck = ref(null)

    const checkSheriff = (targetPlayerId) => {
	const target = gameStore.currentPlayer(targetPlayerId)
	if (!target) return null
	
	const isMafia = target.originalRole === PLAYER_ROLES.MAFIA || 
              target.originalRole === PLAYER_ROLES.DON
        
	return {
	    targetId: targetPlayerId,
	    targetName: target.name,
	    isMafia: isMafia
	}
    }

    const checkDon = (targetPlayerId) => {
	const target = gameStore.currentPlayer(targetPlayerId)
	if (!target) return null
	
	const isSheriff = target.originalRole === PLAYER_ROLES.SHERIFF
	
	return {
	    targetId: targetPlayerId,
	    targetName: target.name,
	    isSheriff: isSheriff
	}
    }

    const confirmNight = async () => {
        
        // 1. Сохраняем ночные действия в текущую фазу
        if (gameStore.gameState.mafiaTarget && gameStore.gameState.mafiaTarget !== 0) {
            gamePhasesStore.setKilled(gameStore.gameState.mafiaTarget)
        }
        
        if (gameStore.gameState.donTarget) {
            gamePhasesStore.setDonCheck(gameStore.gameState.donTarget)
        }
        
        if (gameStore.gameState.sheriffTarget) {
            gamePhasesStore.setSheriffCheck(gameStore.gameState.sheriffTarget)
        }
        
        // Синхронизируем фолы в текущую фазу
        gamePhasesStore.syncFoulsFromGameState(gameStore.gameState.players)
        
        // 2. Применяем стрельбу мафии к игрокам
        if (gameStore.gameState.mafiaTarget && gameStore.gameState.mafiaTarget !== 0) {
            const target = gameStore.currentPlayer(gameStore.gameState.mafiaTarget)
            
            if (target && target.isAlive && !target.isEliminated) {
                target.isAlive = false
                gameStore.gameState.deadPlayers.push(gameStore.gameState.mafiaTarget)
                gameStore.gameState.nightKill = gameStore.gameState.mafiaTarget
                
                // Убираем номинации убитого игрока
                gameStore.gameState.players.forEach(p => {
                    if (p.nominated === gameStore.gameState.mafiaTarget) {
                        p.nominated = null
                    }
                })
            }
        }
        
        // 3. НЕ создаем новую фазу здесь - она будет создана после подтверждения лучшего хода
        // Раунд остается тем же до создания новой фазы
        
        // 5. Сохраняем текущую фазу с ночными действиями на сервер
        await gamePhasesStore.updateCurrentPhaseOnServer()
        
        // 5.1. Синхронизируем статусы игроков с фазами
        gameStore.syncPlayersWithPhases()
        
        // 5.2. Проверяем условия победы после ночных действий
        const victoryResult = gameStore.checkVictoryConditions()
        if (victoryResult) {
            // Игра закончилась
            return {
                result: 'victory',
                winner: victoryResult,
                round: gameStore.gameState.round,
                killed: gameStore.gameState.nightKill
            }
        }
        
        // 6. Сбрасываем ночные действия для следующей ночи
        gameStore.gameState.mafiaTarget = null
        gameStore.gameState.donTarget = null
        gameStore.gameState.sheriffTarget = null

        if (gameStore.checkBestMove()) {
            // Если показали лучший ход, НЕ создаем новую фазу - она будет создана после подтверждения ЛХ
            return {
                round: gameStore.gameState.round,
                killed: gameStore.gameState.nightKill
            }
        }
        
        // Если лучший ход НЕ активирован - создаем новую фазу и переходим к следующему дню
        gamePhasesStore.nextPhase()
        await gamePhasesStore.createPhaseOnServer()
        
        // Синхронизируем раунд с фазами
        gameStore.gameState.round = gamePhasesStore.currentPhaseId
        
        // Сбрасываем флаг голосования для нового раунда
        gameStore.gameState.votingHappenedThisRound = false
        
        // Синхронизируем статусы игроков с фазами
        gameStore.syncPlayersWithPhases()
        
        // Устанавливаем статус обсуждения для нового дня
        gameStore.setGameStatus(gameStore.gameState.gameStatus, GAME_SUBSTATUS.DISCUSSION)
        
        // Применяем эффекты молчания
        gameStore.gameState.players.forEach(p => {
            if (p.silentNextRound) {
                p.isSilent = true
                p.silentNextRound = false
            } else if (p.isSilent) {
                p.isSilent = false
            }
        })
        
        // Проверяем лучший ход
        if (gameStore.gameState.deadPlayers.length === 1 && 
                gameStore.gameState.eliminatedPlayers.length === 0 && 
                gameStore.gameState.round === 1 &&  // Проверяем в первом раунде (до создания новой фазы)
                !gameStore.gameState.bestMoveUsed) {
            gameStore.gameState.showBestMove = true
        }
        
        return {
            round: gameStore.gameState.round,
            killed: gameStore.gameState.nightKill
        }
    }

    // Methods for tests
    const setNightKill = (playerId) => {
	nightKill.value = playerId
	gameStore.setNightKill(playerId)
    }

    const setSheriffCheck = (playerId) => {
	sheriffCheck.value = playerId
    }

    const getSheriffCheckResult = (players) => {
	if (!sheriffCheck.value) return null
	
	const target = players.find(p => p.id === sheriffCheck.value)
	if (!target) return null
	
	return {
	    targetId: sheriffCheck.value,
	    role: target.role
	}
    }

    return {
	checkSheriff,
	checkDon,
	confirmNight,
	setNightKill,
	setSheriffCheck,
	getSheriffCheckResult
    }
})
