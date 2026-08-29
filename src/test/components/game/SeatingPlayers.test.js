// Тесты рассадки игры: строка поиска общая, а стол знает, кого куда посадили

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SeatingPlayers from '@/components/game/SeatingPlayers.vue'
import PlayerSearchInput from '@/components/common/PlayerSearchInput.vue'
import { GAME_ERROR_MESSAGES } from '@/utils/errorMessages.js'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    createGamePlayers: vi.fn()
  }
}))

// Таблица Element Plus вешает MutationObserver на проксированный узел,
// а реализация happy-dom на таком объекте падает
global.MutationObserver = class MutationObserver {
  observe() {}
  disconnect() {}
  takeRecords() { return [] }
}

const GAME_ID = 'game-1'

const player = (boxId) => ({ id: `user-${boxId}`, nickname: `Игрок ${boxId}` })

let wrapper

const mountSeating = async () => {
  wrapper = mount(SeatingPlayers, {
    props: { gameId: GAME_ID },
    attachTo: document.body
  })
  // Таблица Element Plus дорисовывает строки после монтирования
  await flushPromises()
  return wrapper
}

const searchInputs = () => wrapper.findAllComponents(PlayerSearchInput)

const seatPlayer = async (boxId) => {
  searchInputs()[boxId - 1].vm.$emit('select', player(boxId))
  await flushPromises()
}

const button = (label) => wrapper.findAll('button').find(btn => btn.text() === label)

const errorText = () => wrapper.find('.el-alert__title').exists()
  ? wrapper.find('.el-alert__title').text()
  : ''

describe('SeatingPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiService.getUsers.mockResolvedValue({ items: [] })
    apiService.createGamePlayers.mockResolvedValue({})
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('сажает выбранного игрока на его место', async () => {
    await mountSeating()

    await seatPlayer(1)

    expect(searchInputs()[0].props('modelValue')).toBe('Игрок 1')
    // Занятого игрока другим местам больше не предлагают
    expect(searchInputs()[1].props('excludeIds')).toEqual(['user-1'])
  })

  it('переводит курсор на следующее место', async () => {
    await mountSeating()

    await seatPlayer(1)

    const nextInput = searchInputs()[1].find('input').element
    expect(document.activeElement).toBe(nextInput)
  })

  it('освобождает место, когда поле очистили', async () => {
    await mountSeating()

    await seatPlayer(1)
    searchInputs()[0].vm.$emit('clear')
    await flushPromises()

    expect(searchInputs()[1].props('excludeIds')).toEqual([])
  })

  it('не отправляет неполную рассадку', async () => {
    await mountSeating()

    await seatPlayer(1)
    await button('Рассадка готова').trigger('click')
    await flushPromises()

    expect(apiService.createGamePlayers).not.toHaveBeenCalled()
    expect(errorText()).toBe(GAME_ERROR_MESSAGES.NOT_TEN_PLAYERS)
  })

  it('отправляет рассадку, когда стол собран', async () => {
    await mountSeating()

    for (let boxId = 1; boxId <= 10; boxId++) {
      await seatPlayer(boxId)
    }
    await button('Рассадка готова').trigger('click')
    await flushPromises()

    expect(apiService.createGamePlayers).toHaveBeenCalledWith(
      GAME_ID,
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(boxId => ({
        user_id: `user-${boxId}`,
        box_id: boxId
      }))
    )
    expect(wrapper.emitted('seating-complete')).toHaveLength(1)
  })

  it('показывает ошибку, если игроков не приняли', async () => {
    await mountSeating()
    apiService.createGamePlayers.mockRejectedValue({
      response: { status: 400, data: { detail: 'only ten boxes is allowed' } }
    })

    for (let boxId = 1; boxId <= 10; boxId++) {
      await seatPlayer(boxId)
    }
    await button('Рассадка готова').trigger('click')
    await flushPromises()

    expect(errorText()).toBe(GAME_ERROR_MESSAGES.NOT_TEN_PLAYERS)
    expect(wrapper.emitted('seating-complete')).toBeUndefined()
  })
})
