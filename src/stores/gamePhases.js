import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '@/services/api.js'

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
        for (let boxId = 1; boxId <= 10; boxId++) {
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
            fouls_summary: []
        }

        // Инициализируем фолы для всех игроков
        for (let boxId = 1; boxId <= 10; boxId++) {
            newPhase.fouls_summary.push({
                box_id: boxId,
                count_fouls: 0
            })
        }

        // Копируем фолы из предыдущей фазы если она есть
        if (phases.value.length > 0) {
            const prevPhase = phases.value[phases.value.length - 1]
            if (prevPhase.fouls_summary) {
                prevPhase.fouls_summary.forEach(prevFoul => {
                    const currentFoul = newPhase.fouls_summary.find(f => f.box_id === prevFoul.box_id)
                    if (currentFoul) {
                        currentFoul.count_fouls = prevFoul.count_fouls
                    }
                })
            }
        }

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
        if (phase && phase.fouls_summary) {
            const playerFoul = phase.fouls_summary.find(f => f.box_id === boxId)
            if (playerFoul) {
                playerFoul.count_fouls++
            }
        }
    }

    const removeFoul = (boxId) => {
        const phase = currentPhase.value
        if (phase && phase.fouls_summary) {
            const playerFoul = phase.fouls_summary.find(f => f.box_id === boxId)
            if (playerFoul && playerFoul.count_fouls > 0) {
                playerFoul.count_fouls--
            }
        }
    }

    const setBestMove = (boxIds) => {
        bestMove.value = boxIds ? [...boxIds] : null
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

    const saveGamePhases = async () => {
        if (!gameId.value) return false

        try {
            const payload = {
                best_move: bestMove.value,
                phases: phases.value
            }
            
            await apiService.saveGamePhasesAtomic(gameId.value, payload)
            return true
        } catch (error) {
            console.error('Ошибка сохранения фаз игры:', error)
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
                fouls_summary: phase.fouls_summary || [],
                voting_summary: [], // Пока не используется
                best_move: bestMove.value || []
            }
            
            await apiService.createGamePhase(gameId.value, phaseData)
            return true
        } catch (error) {
            console.error('Ошибка создания фазы игры:', error)
            return false
        }
    }

    const loadGamePhases = async (gameIdValue, gameStatus) => {
        try {
            gameId.value = gameIdValue
            
            // Загружаем состояние игры только если игра в процессе
            if (gameStatus === 'in_progress') {
                try {
                    const data = await apiService.getGameState(gameIdValue)
                    
                    if (data && data.phases) {
                        bestMove.value = data.best_move || null
                        phases.value = data.phases || []
                        currentPhaseId.value = phases.value.length > 0 ? 
                            Math.max(...phases.value.map(p => p.phase_id)) : 1
                    }
                } catch (error) {
                    console.log('Не удалось загрузить фазы из состояния игры:', error)
                }
            } else {
                console.log(`Игра не в статусе "in_progress" (текущий: ${gameStatus}), пропускаем загрузку состояния`)
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
        setDonCheck,
        setSheriffCheck,
        setKilled,
        addRemovedPlayer,
        setPPK,
        addFoul,
        removeFoul,
        setBestMove,
        toggleBestMoveTarget,
        saveGamePhases,
        createPhaseOnServer,
        loadGamePhases
    }
})