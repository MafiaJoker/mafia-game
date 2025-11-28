import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { apiService } from '@/services/api.js'
import { GAME_RULES } from '@/utils/gameConstants.js'
import { LRUCache } from '@/utils/lruCache.js'

// LRU cache to store game states (max 100 games)
const gameStatesCache = new LRUCache(100)

// Create default state for a game
const createDefaultState = () => reactive({
    bestMove: null,
    phases: [],
    currentPhaseId: 1
})

export const useGamePhasesStore = defineStore('gamePhases', () => {
    // Current game ID tracking
    const gameId = ref(null)

    // Get current game state from cache
    const getCurrentState = () => {
        if (!gameId.value) {
            return createDefaultState()
        }

        let state = gameStatesCache.get(gameId.value)
        if (!state) {
            state = createDefaultState()
            gameStatesCache.set(gameId.value, state)
        } else {
            // Update access time
            gameStatesCache.touch(gameId.value)
        }

        return state
    }

    // Reactive state accessors
    const bestMove = computed({
        get: () => getCurrentState().bestMove,
        set: (value) => {
            const state = getCurrentState()
            state.bestMove = value
        }
    })

    const phases = computed({
        get: () => getCurrentState().phases,
        set: (value) => {
            const state = getCurrentState()
            state.phases = value
        }
    })

    const currentPhaseId = computed({
        get: () => getCurrentState().currentPhaseId,
        set: (value) => {
            const state = getCurrentState()
            state.currentPhaseId = value
        }
    })

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

        // Check if state already exists in cache
        let state = gameStatesCache.get(gameIdValue)
        if (!state) {
            // Create new state for this game
            state = createDefaultState()
            gameStatesCache.set(gameIdValue, state)

            // Создаем первую фазу
            createNewPhase()
        } else {
            // Update access time for existing game
            gameStatesCache.touch(gameIdValue)
        }
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
        
        console.log(`getPlayerFouls(${boxId}): checking ${phases.value.length} phases`)
        
        phases.value.forEach((phase, index) => {
            if (phase.fouls_summary) {
                const playerFoul = phase.fouls_summary.find(f => f.box_id === boxId)
                if (playerFoul) {
                    console.log(`  Phase ${index + 1}: player ${boxId} has ${playerFoul.count_fouls} fouls`)
                    totalFouls += playerFoul.count_fouls
                }
            } else {
                console.log(`  Phase ${index + 1}: no fouls_summary`)
            }
        })
        
        console.log(`getPlayerFouls(${boxId}): total = ${totalFouls}`)
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

    // Синхронизация фолов из gameState в текущую фазу с использованием last_phase_fouls
    const syncFoulsFromGameState = (gameStatePlayers, lastPhaseFouls = null) => {
        const phase = currentPhase.value
        if (phase) {
            // Инициализируем fouls_summary если он не существует
            initializeFoulsSummary(phase)

            // Если есть last_phase_fouls, используем их для установки фолов текущей фазы
            if (lastPhaseFouls && Array.isArray(lastPhaseFouls)) {
                lastPhaseFouls.forEach(foul => {
                    if (foul.box_id && typeof foul.count_fouls === 'number') {
                        let playerFoul = phase.fouls_summary.find(f => f.box_id === foul.box_id)
                        if (playerFoul) {
                            playerFoul.count_fouls = foul.count_fouls
                        }
                    }
                })
                console.log('Synchronized fouls from last_phase_fouls:', phase.fouls_summary)
            } else {
                console.log('No last_phase_fouls data, keeping initialized zeros')
            }
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

    const updateFoulsOnServer = async (changedPlayerId = null, lastPhaseFouls = null) => {
        if (!gameId.value || !currentPhase.value) return false

        try {
            const phase = currentPhase.value
            
            console.log('updateFoulsOnServer called with lastPhaseFouls:', lastPhaseFouls)
            console.log('current phase fouls_summary:', phase.fouls_summary)
            
            // Используем last_phase_fouls как базу для PUT запроса
            let foulsSummary = []
            
            // Если есть last_phase_fouls, используем их как основу
            if (lastPhaseFouls && Array.isArray(lastPhaseFouls)) {
                // Копируем last_phase_fouls - это то, что было в фазе при загрузке
                lastPhaseFouls.forEach(foul => {
                    foulsSummary.push({
                        box_id: foul.box_id,
                        count_fouls: foul.count_fouls
                    })
                })
                
                // Обновляем значения из локальной фазы (для новых фолов)
                if (phase.fouls_summary) {
                    phase.fouls_summary.forEach(localFoul => {
                        const existingFoul = foulsSummary.find(f => f.box_id === localFoul.box_id)
                        if (existingFoul) {
                            // Если в локальной фазе больше фолов, используем это значение
                            if (localFoul.count_fouls > existingFoul.count_fouls) {
                                existingFoul.count_fouls = localFoul.count_fouls
                            }
                        } else {
                            // Добавляем игрока если его не было в last_phase_fouls
                            foulsSummary.push({
                                box_id: localFoul.box_id,
                                count_fouls: localFoul.count_fouls
                            })
                        }
                    })
                }
                
                // Добавляем недостающих игроков с 0 фолами
                for (let boxId = 1; boxId <= GAME_RULES.PLAYERS.MAX; boxId++) {
                    if (!foulsSummary.find(f => f.box_id === boxId)) {
                        foulsSummary.push({
                            box_id: boxId,
                            count_fouls: 0
                        })
                    }
                }
            } else {
                // Если нет last_phase_fouls, используем локальные данные
                for (let boxId = 1; boxId <= GAME_RULES.PLAYERS.MAX; boxId++) {
                    const existingFoul = phase.fouls_summary?.find(f => f.box_id === boxId)
                    foulsSummary.push({
                        box_id: boxId,
                        count_fouls: existingFoul ? existingFoul.count_fouls : 0
                    })
                }
            }
            
            // Сортируем по box_id для консистентности
            foulsSummary.sort((a, b) => a.box_id - b.box_id)
            
            console.log('Отправляем фолы на сервер (с учетом last_phase_fouls):', foulsSummary)
            
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
            
            // Загружаем полное состояние игры если игра активна
            let gameStateData = null
            if (gameData && (gameData.status === 'in_progress' || gameData.result)) {
                try {
                    gameStateData = await apiService.getGameState(gameId.value)
                } catch (error) {
                    console.warn('Не удалось загрузить состояние игры:', error)
                }
            }
            
            // Перезагружаем фазы из полученных данных
            const gameStatus = gameData?.status || gameData?.result
            await loadGamePhases(gameId.value, gameStatus, gameStateData || gameData)
            
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

            // Get or create state for this game
            let state = gameStatesCache.get(gameIdValue)
            if (!state) {
                state = createDefaultState()
                gameStatesCache.set(gameIdValue, state)
            } else {
                gameStatesCache.touch(gameIdValue)
            }

            // Используем переданные данные состояния игры
            if (gameStateData) {
                state.bestMove = gameStateData.best_move || null

                // Если приходит массив фаз (старый формат)
                if (gameStateData.phases && Array.isArray(gameStateData.phases)) {
                    state.phases = gameStateData.phases
                    state.currentPhaseId = state.phases.length > 0 ?
                        Math.max(...state.phases.map(p => p.phase_id)) : 1
                    console.log('Фазы загружены как массив:', state.phases.length)
                }
                // Если приходит текущая фаза (новый формат)
                else if (gameStateData.phase_id) {
                    state.phases = [gameStateData] // создаём массив с одной текущей фазой
                    state.currentPhaseId = gameStateData.phase_id
                    console.log('Загружена текущая фаза:', gameStateData.phase_id)
                }
                else {
                    console.log('Фазы не найдены в состоянии игры, создаём первую')
                }
            } else {
                console.log('Данные состояния игры отсутствуют')
            }

            // Если нет фаз, создаем первую
            if (state.phases.length === 0) {
                createNewPhase()
            }

            return true
        } catch (error) {
            console.error('Ошибка загрузки фаз игры:', error)
            // Создаем первую фазу даже в случае ошибки
            const state = getCurrentState()
            if (state.phases.length === 0) {
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