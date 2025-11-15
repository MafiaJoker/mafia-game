import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '@/services/api.js'
import { GAME_RULES } from '@/utils/gameConstants.js'

export const useGamePhasesStore = defineStore('gamePhases', () => {
    // State
    const gameId = ref(null)
    const bestMove = ref(null) // array of box_ids or null
    const phases = ref([])
    const currentPhaseId = ref(1)

    // Getters
    const currentPhase = computed(() => {
        return phases.value.find(phase => phase.phase_id === currentPhaseId.value) || null
    })

    const lastPhase = computed(() => {
        if (phases.value.length === 0) return null
        return phases.value[phases.value.length - 1]
    })

    // Получить всех убитых игроков до определенной фазы (включительно)
    const getKilledPlayersUpToPhase = computed(() => (phaseId) => {
        const killedBoxIds = []
        phases.value
            .filter(phase => phase.phase_id <= phaseId)
            .forEach(phase => {
                if (phase.killed_box_id) {
                    killedBoxIds.push(phase.killed_box_id)
                }
            })
        return killedBoxIds
    })

    // Получить всех удаленных игроков до определенной фазы (включительно)
    const getRemovedPlayersUpToPhase = computed(() => (phaseId) => {
        const removedBoxIds = []
        phases.value
            .filter(phase => phase.phase_id <= phaseId)
            .forEach(phase => {
                if (phase.removed_box_ids) {
                    removedBoxIds.push(...phase.removed_box_ids)
                }
            })
        return removedBoxIds
    })

    // Получить живых игроков на определенной фазе
    const getAlivePlayersAtPhase = computed(() => (phaseId) => {
        const killed = getKilledPlayersUpToPhase.value(phaseId)
        const removed = getRemovedPlayersUpToPhase.value(phaseId)
        const allDead = [...killed, ...removed]
        
        const aliveBoxIds = []
        for (let boxId = 1; boxId <= GAME_RULES.PLAYERS.MAX; boxId++) {
            if (!allDead.includes(boxId)) {
                aliveBoxIds.push(boxId)
            }
        }
        return aliveBoxIds
    })

    // Получить фолы игрока в определенной фазе
    const getPlayerFoulsAtPhase = computed(() => (boxId, phaseId) => {
        const phase = phases.value.find(p => p.phase_id === phaseId)
        if (!phase || !phase.fouls_summary) return 0
        
        const playerFouls = phase.fouls_summary.find(f => f.box_id === boxId)
        return playerFouls ? playerFouls.count_fouls : 0
    })

    // Actions
    const initializeGame = (gameIdValue) => {
        gameId.value = gameIdValue
        phases.value = []
        currentPhaseId.value = 1
        bestMove.value = null
        
        // Создаем первую фазу
        createNewPhase()
    }

    const createNewPhase = () => {
        const newPhase = {
            phase_id: currentPhaseId.value,
            don_checked_box_id: null,
            sheriff_checked_box_id: null,
            killed_box_id: null,
            removed_box_ids: null,
            ppk_box_id: null,
            voted_box_id: null,
            fouls_summary: [],
            voting_summary: []
        }

        // Инициализируем fouls_summary с 0 фолами для новой фазы
        // fouls_summary содержит фолы, поставленные именно в ТЕКУЩЕЙ фазе
        initializeFoulsSummary(newPhase)

        phases.value.push(newPhase)
    }

    const nextPhase = () => {
        currentPhaseId.value++
        createNewPhase()
    }

    const updateCurrentPhase = (updates) => {
        const phase = currentPhase.value
        if (phase) {
            Object.assign(phase, updates)
        }
    }

    const setDonCheck = (boxId) => {
        updateCurrentPhase({ don_checked_box_id: boxId })
    }

    const setSheriffCheck = (boxId) => {
        updateCurrentPhase({ sheriff_checked_box_id: boxId })
    }

    const setKilled = (boxId) => {
        updateCurrentPhase({ killed_box_id: boxId })
    }

    const addRemovedPlayer = (boxId) => {
        const phase = currentPhase.value
        if (phase) {
            if (!phase.removed_box_ids) {
                phase.removed_box_ids = []
            }
            if (!phase.removed_box_ids.includes(boxId)) {
                phase.removed_box_ids.push(boxId)
            }
        }
    }

    const setPPK = (boxId) => {
        updateCurrentPhase({ ppk_box_id: boxId })
    }

    const addFoul = (boxId) => {
        const phase = currentPhase.value
        console.log('addFoul called for boxId:', boxId)
        console.log('current phase:', phase)
        console.log('current fouls_summary:', phase?.fouls_summary)
        
        if (phase) {
            // Инициализируем fouls_summary если он не существует
            initializeFoulsSummary(phase)
            
            const playerFoul = phase.fouls_summary.find(f => f.box_id === boxId)
            if (playerFoul) {
                playerFoul.count_fouls++
                console.log('Updated foul for boxId', boxId, 'to:', playerFoul.count_fouls)
            } else {
                // Если игрок не найден, добавляем его
                phase.fouls_summary.push({
                    box_id: boxId,
                    count_fouls: 1
                })
                console.log('Added new foul entry for boxId:', boxId)
            }
        } else {
            console.log('Phase not available')
        }
    }

    const removeFoul = (boxId) => {
        const phase = currentPhase.value
        if (phase) {
            // Инициализируем fouls_summary если он не существует
            initializeFoulsSummary(phase)
            
            const playerFoul = phase.fouls_summary.find(f => f.box_id === boxId)
            if (playerFoul && playerFoul.count_fouls > 0) {
                playerFoul.count_fouls--
            }
        }
    }

    const resetFouls = (boxId) => {
        const phase = currentPhase.value
        if (phase) {
            // Инициализируем fouls_summary если он не существует
            initializeFoulsSummary(phase)
            
            const playerFoul = phase.fouls_summary.find(f => f.box_id === boxId)
            if (playerFoul) {
                playerFoul.count_fouls = 0
            }
        }
    }

    const getPlayerFouls = (boxId) => {
        // Возвращаем ОБЩЕЕ количество фолов игрока (все фазы)
        let totalFouls = 0
        
        phases.value.forEach(phase => {
            if (phase.fouls_summary) {
                const playerFoul = phase.fouls_summary.find(f => f.box_id === boxId)
                if (playerFoul) {
                    totalFouls += playerFoul.count_fouls
                }
            }
        })
        
        return totalFouls
    }

    // Вспомогательная функция для инициализации fouls_summary
    const initializeFoulsSummary = (phase) => {
        if (!phase.fouls_summary) {
            phase.fouls_summary = []
            
            // Инициализируем фолы с 0 для НОВОЙ фазы
            // fouls_summary содержит фолы, поставленные именно в ТЕКУЩЕЙ фазе
            for (let id = 1; id <= GAME_RULES.PLAYERS.MAX; id++) {
                phase.fouls_summary.push({
                    box_id: id,
                    count_fouls: 0  // Начинаем с 0 фолов в новой фазе
                })
            }
            console.log('Initialized fouls_summary for new phase (all 0):', phase.fouls_summary)
        }
    }

    const setBestMove = (boxIds) => {
        bestMove.value = boxIds ? [...boxIds] : null
    }

    // Синхронизация фолов из gameState в текущую фазу
    const syncFoulsFromGameState = (gameStatePlayers) => {
        const phase = currentPhase.value
        if (phase && gameStatePlayers) {
            // Инициализируем fouls_summary если он не существует
            if (!phase.fouls_summary) {
                phase.fouls_summary = []
            }

            // Синхронизируем фолы из gameState
            gameStatePlayers.forEach(player => {
                if (player.id && typeof player.fouls === 'number') {
                    let playerFoul = phase.fouls_summary.find(f => f.box_id === player.id)
                    if (!playerFoul) {
                        playerFoul = {
                            box_id: player.id,
                            count_fouls: player.fouls
                        }
                        phase.fouls_summary.push(playerFoul)
                    } else {
                        playerFoul.count_fouls = player.fouls
                    }
                }
            })

            // Добавляем недостающих игроков с 0 фолами
            for (let boxId = 1; boxId <= GAME_RULES.PLAYERS.MAX; boxId++) {
                if (!phase.fouls_summary.find(f => f.box_id === boxId)) {
                    phase.fouls_summary.push({
                        box_id: boxId,
                        count_fouls: 0
                    })
                }
            }

            // Сортируем по box_id
            phase.fouls_summary.sort((a, b) => a.box_id - b.box_id)
            
            console.log('Synchronized fouls from gameState:', phase.fouls_summary)
        }
    }

    const toggleBestMoveTarget = (boxId) => {
        if (!bestMove.value) {
            bestMove.value = []
        }
        
        const index = bestMove.value.indexOf(boxId)
        if (index !== -1) {
            bestMove.value.splice(index, 1)
        } else if (bestMove.value.length < 3) {
            bestMove.value.push(boxId)
        }
    }

    // Установить результат голосования
    const setVotedPlayer = (boxId) => {
        if (currentPhase.value) {
            currentPhase.value.voted_box_id = boxId
        }
    }

    const saveGamePhases = async () => {
        if (!gameId.value) return false

        try {
            // Используем только v1 API - обновляем текущую фазу
            await updateCurrentPhaseOnServer()
            return true
        } catch (error) {
            console.error('Ошибка сохранения фазы через v1 API:', error)
            return false
        }
    }

    const updateCurrentPhaseOnServer = async () => {
        if (!gameId.value || !currentPhase.value) return false

        try {
            // Подготавливаем данные согласно GamePhaseWithBestMoveSerializer
            const phase = currentPhase.value
            
            const phaseData = {
                don_checked_box_id: phase.don_checked_box_id || null,
                sheriff_checked_box_id: phase.sheriff_checked_box_id || null,
                killed_box_id: phase.killed_box_id || null,
                removed_box_ids: phase.removed_box_ids || null,
                voted_box_ids: Array.isArray(phase.voted_box_id) ? phase.voted_box_id : null,
                ppk_box_id: phase.ppk_box_id || null,
                // НЕ передаем fouls_summary - фолы обновляются только при явных действиях
                voting_summary: [], // Пустой список вместо null
                best_move: bestMove.value || null
            }
            
            await apiService.updateGamePhase(gameId.value, phaseData)
            
            // НЕ перезагружаем состояние после обновления текущей фазы
            // чтобы не потерять локальные изменения
            // await refreshGameStateFromServer()
            
            return true
        } catch (error) {
            console.error('Ошибка обновления текущей фазы игры:', error)
            return false
        }
    }

    const updateFoulsOnServer = async (changedPlayerId = null) => {
        if (!gameId.value || !currentPhase.value) return false

        try {
            const phase = currentPhase.value
            
            // Отправляем ВСЕ фолы, которые были поставлены в текущей фазе
            let foulsSummary = []
            
            // Создаем полный список всех игроков с фолами из текущей фазы
            for (let boxId = 1; boxId <= GAME_RULES.PLAYERS.MAX; boxId++) {
                const existingFoul = phase.fouls_summary?.find(f => f.box_id === boxId)
                
                // Отправляем количество фолов, поставленных в ТЕКУЩЕЙ фазе
                foulsSummary.push({
                    box_id: boxId,
                    count_fouls: existingFoul ? existingFoul.count_fouls : 0
                })
            }
            
            console.log('Отправляем все фолы текущей фазы:', foulsSummary)
            
            const phaseData = {
                don_checked_box_id: phase.don_checked_box_id || null,
                sheriff_checked_box_id: phase.sheriff_checked_box_id || null,
                killed_box_id: phase.killed_box_id || null,
                removed_box_ids: phase.removed_box_ids || null,
                voted_box_ids: Array.isArray(phase.voted_box_id) ? phase.voted_box_id : null,
                ppk_box_id: phase.ppk_box_id || null,
                fouls_summary: foulsSummary,
                voting_summary: [], 
                best_move: bestMove.value || null
            }
            
            await apiService.updateGamePhase(gameId.value, phaseData)
            
            return true
        } catch (error) {
            console.error('Ошибка обновления фолов:', error)
            return false
        }
    }

    const createPhaseOnServer = async () => {
        if (!gameId.value || !currentPhase.value) return false

        try {
            // Подготавливаем данные для v1 API
            const phase = currentPhase.value
            const phaseData = {
                don_checked_box_id: phase.don_checked_box_id || null,
                sheriff_checked_box_id: phase.sheriff_checked_box_id || null,
                killed_box_id: phase.killed_box_id || null,
                removed_box_ids: phase.removed_box_ids || [],
                ppk_box_id: phase.ppk_box_id || null,
                voted_box_id: phase.voted_box_id || null,
                // НЕ передаем fouls_summary - пусть сервер копирует из предыдущей фазы
                voting_summary: [], // Пустой список для новых фаз
                best_move: bestMove.value || []
            }
            
            await apiService.createGamePhase(gameId.value, phaseData)
            
            // Перезагружаем актуальное состояние игры с сервера
            await refreshGameStateFromServer()
            
            return true
        } catch (error) {
            console.error('Ошибка создания фазы игры:', error)
            return false
        }
    }

    const refreshGameStateFromServer = async () => {
        if (!gameId.value) return false
        
        try {
            // Вместо циклического импорта, используем прямой API вызов
            const gameData = await apiService.getGame(gameId.value)
            
            // Перезагружаем фазы из полученных данных
            const gameStatus = gameData?.status || gameData?.result
            await loadGamePhases(gameId.value, gameStatus, gameData)
            
            // Уведомляем об успешном обновлении фаз
            // (синхронизация игроков должна происходить в компонентах)
            
            return true
        } catch (error) {
            console.error('Ошибка обновления состояния игры с сервера:', error)
            return false
        }
    }

    const loadGamePhases = async (gameIdValue, gameStatus, gameStateData = null) => {
        try {
            gameId.value = gameIdValue
            
            // Используем переданные данные состояния игры
            if (gameStateData) {
                bestMove.value = gameStateData.best_move || null
                
                // Если приходит массив фаз (старый формат)
                if (gameStateData.phases && Array.isArray(gameStateData.phases)) {
                    phases.value = gameStateData.phases
                    currentPhaseId.value = phases.value.length > 0 ? 
                        Math.max(...phases.value.map(p => p.phase_id)) : 1
                    console.log('Фазы загружены как массив:', phases.value.length)
                }
                // Если приходит текущая фаза (новый формат)
                else if (gameStateData.phase_id) {
                    phases.value = [gameStateData] // создаём массив с одной текущей фазой
                    currentPhaseId.value = gameStateData.phase_id
                    console.log('Загружена текущая фаза:', gameStateData.phase_id)
                }
                else {
                    console.log('Фазы не найдены в состоянии игры, создаём первую')
                }
            } else {
                console.log('Данные состояния игры отсутствуют')
            }
            
            // Если нет фаз, создаем первую
            if (phases.value.length === 0) {
                createNewPhase()
            }
            
            return true
        } catch (error) {
            console.error('Ошибка загрузки фаз игры:', error)
            // Создаем первую фазу даже в случае ошибки
            if (phases.value.length === 0) {
                createNewPhase()
            }
            return false
        }
    }

    return {
        // State
        gameId,
        bestMove,
        phases,
        currentPhaseId,
        
        // Getters
        currentPhase,
        lastPhase,
        getKilledPlayersUpToPhase,
        getRemovedPlayersUpToPhase,
        getAlivePlayersAtPhase,
        getPlayerFoulsAtPhase,
        
        // Actions
        initializeGame,
        createNewPhase,
        nextPhase,
        updateCurrentPhase,
        updateFoulsOnServer,
        setDonCheck,
        setSheriffCheck,
        setKilled,
        addRemovedPlayer,
        setPPK,
        addFoul,
        removeFoul,
        resetFouls,
        getPlayerFouls,
        setBestMove,
        syncFoulsFromGameState,
        toggleBestMoveTarget,
        setVotedPlayer,
        saveGamePhases,
        updateCurrentPhaseOnServer,
        createPhaseOnServer,
        loadGamePhases,
        refreshGameStateFromServer
    }
})