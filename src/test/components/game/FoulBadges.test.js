// Тесты карусели фолов: клик считается от итога игрока за игру, а не от дельты круга

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import FoulBadges from '@/components/game/FoulBadges.vue'
import { apiService } from '@/services/api.js'

vi.mock('@/services/api.js', () => ({
  apiService: {
    updateGameFouls: vi.fn()
  }
}))

const GAME_ID = 'game-1'

// iMafia: обычные фолы с порогом 4 и техфолы с порогом 2
const FOUL_TYPES = [
  { foul_type: 'regular', removal_threshold: 4 },
  { foul_type: 'tech', removal_threshold: 2 }
]

const REGULAR = 0
const TECH = 1

const createPlayer = (regular = 0, tech = 0, isInGame = true) => ({
  box_id: 3,
  is_in_game: isInGame,
  fouls: [
    { type: 'regular', count: regular },
    { type: 'tech', count: tech }
  ]
})

const gameState = (player) => ({ players: [player], result: 'in_progress' })

const mountBadges = (player) => mount(FoulBadges, {
  props: { gameId: GAME_ID, player, foulTypes: FOUL_TYPES }
})

const badgeAt = (wrapper, index) => wrapper.findAll('.foul-badge')[index]
const countAt = (wrapper, index) => badgeAt(wrapper, index).find('.foul-badge-count').text()

describe('FoulBadges', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    apiService.updateGameFouls.mockResolvedValue(gameState(createPlayer()))
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Отображение', () => {
    it('показывает итог фолов игрока за игру', () => {
      wrapper = mountBadges(createPlayer(2, 1))

      expect(countAt(wrapper, REGULAR)).toBe('2')
      expect(countAt(wrapper, TECH)).toBe('1')
    })

    it('подсвечивает бейдж за один фол до удаления', () => {
      wrapper = mountBadges(createPlayer(3, 0))

      expect(badgeAt(wrapper, REGULAR).classes()).toContain('is-warning')
      expect(badgeAt(wrapper, TECH).classes()).not.toContain('is-warning')
    })
  })

  describe('Карусель', () => {
    it('отправляет итог, а не дельту круга', async () => {
      wrapper = mountBadges(createPlayer(1, 0))

      await badgeAt(wrapper, REGULAR).trigger('click')

      expect(apiService.updateGameFouls).toHaveBeenCalledWith(GAME_ID, [
        { box_id: 3, type: 'regular', count: 2 }
      ])
    })

    it('на пороге удаления возвращает к нулю, а не к фолам начала круга', async () => {
      wrapper = mountBadges(createPlayer(4, 0))

      await badgeAt(wrapper, REGULAR).trigger('click')

      expect(apiService.updateGameFouls).toHaveBeenCalledWith(GAME_ID, [
        { box_id: 3, type: 'regular', count: 0 }
      ])
    })

    it('сбрасывает техфол на своём пороге', async () => {
      wrapper = mountBadges(createPlayer(0, 2))

      await badgeAt(wrapper, TECH).trigger('click')

      expect(apiService.updateGameFouls).toHaveBeenCalledWith(GAME_ID, [
        { box_id: 3, type: 'tech', count: 0 }
      ])
    })

    it('считает быстрые клики от отправленного значения, не дожидаясь ответа', async () => {
      // Ответ не приходит, пока судья кликает
      apiService.updateGameFouls.mockReturnValue(new Promise(() => {}))
      wrapper = mountBadges(createPlayer(2, 0))

      await badgeAt(wrapper, REGULAR).trigger('click')
      await badgeAt(wrapper, REGULAR).trigger('click')
      await badgeAt(wrapper, REGULAR).trigger('click')

      expect(apiService.updateGameFouls.mock.calls.map(([, fouls]) => fouls[0].count))
        .toEqual([3, 4, 0])
      expect(countAt(wrapper, REGULAR)).toBe('0')
    })
  })

  describe('Выбывшие игроки', () => {
    it('позволяет откатить фолы выбывшему по фолам', async () => {
      wrapper = mountBadges(createPlayer(4, 0, false))

      expect(badgeAt(wrapper, REGULAR).classes()).not.toContain('is-disabled')
      await badgeAt(wrapper, REGULAR).trigger('click')

      expect(apiService.updateGameFouls).toHaveBeenCalledWith(GAME_ID, [
        { box_id: 3, type: 'regular', count: 0 }
      ])
    })

    it('не даёт ставить фолы выбывшему без фолов', async () => {
      wrapper = mountBadges(createPlayer(0, 0, false))

      expect(badgeAt(wrapper, REGULAR).classes()).toContain('is-disabled')
      await badgeAt(wrapper, REGULAR).trigger('click')

      expect(apiService.updateGameFouls).not.toHaveBeenCalled()
    })
  })

  describe('Ответ сервера', () => {
    it('отдаёт наружу состояние игры из ответа ручки', async () => {
      const state = gameState(createPlayer(2, 0))
      apiService.updateGameFouls.mockResolvedValue(state)
      wrapper = mountBadges(createPlayer(1, 0))

      await badgeAt(wrapper, REGULAR).trigger('click')
      await flushPromises()

      expect(wrapper.emitted('saved')).toEqual([[state]])
    })

    it('показывает фолы из состояния игры, когда их применил родитель', async () => {
      apiService.updateGameFouls.mockResolvedValue(gameState(createPlayer(2, 0)))
      wrapper = mountBadges(createPlayer(1, 0))

      await badgeAt(wrapper, REGULAR).trigger('click')
      await wrapper.setProps({ player: createPlayer(2, 0) })
      await flushPromises()

      expect(countAt(wrapper, REGULAR)).toBe('2')
    })

    it('возвращает сохранённое значение, если сервер отказал', async () => {
      let rejectRequest
      apiService.updateGameFouls.mockReturnValue(new Promise((resolve, reject) => {
        rejectRequest = reject
      }))
      wrapper = mountBadges(createPlayer(1, 0))

      await badgeAt(wrapper, REGULAR).trigger('click')
      expect(countAt(wrapper, REGULAR)).toBe('2')

      rejectRequest(new Error('fouls return a box to a phase that has already been played'))
      await flushPromises()

      expect(countAt(wrapper, REGULAR)).toBe('1')
      expect(wrapper.emitted('saved')).toBeUndefined()
    })
  })
})
