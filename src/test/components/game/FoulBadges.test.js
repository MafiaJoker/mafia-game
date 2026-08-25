// Тесты карусели фолов: клик считается от итога игрока за игру, а не от дельты круга

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import FoulBadges from '@/components/game/FoulBadges.vue'
import { createPendingFouls } from '@/utils/pendingFouls.js'
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

// Состояние игры, каким его вернёт сервер, приняв запрос от этого игрока
const savedState = (player, fouls) => {
  const saved = { ...player, fouls: player.fouls.map(foul => ({ ...foul })) }
  fouls.forEach(({ type, count }) => {
    saved.fouls.find(foul => foul.type === type).count = count
  })
  return gameState(saved)
}

// Хранилище отправленных фолов, общее для бейджей одного игрока
let pendingFouls

const mountBadges = (player) => {
  // По умолчанию сервер принимает запрос: отвечает состоянием этого же игрока,
  // а не фикстурой, которая разошлась бы с фолами теста
  apiService.updateGameFouls.mockImplementation((gameId, fouls) =>
    Promise.resolve(savedState(player, fouls))
  )
  return mountWith(player)
}

// Ещё один бейдж того же игрока, не трогающий текущий мок ответа
const mountWith = (player) => mount(FoulBadges, {
  props: { gameId: GAME_ID, player, foulTypes: FOUL_TYPES, pendingFouls }
})

const badgeAt = (wrapper, index) => wrapper.findAll('.foul-badge')[index]
const countAt = (wrapper, index) => badgeAt(wrapper, index).find('.foul-badge-count').text()

describe('FoulBadges', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    pendingFouls = createPendingFouls()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      // Иначе падение внутри mountBadges размонтирует обёртку прошлого теста
      // второй раз и превратит одну ошибку в каскад
      wrapper = null
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
      wrapper = mountBadges(createPlayer(2, 0))
      // Ответ не приходит, пока судья кликает
      apiService.updateGameFouls.mockReturnValue(new Promise(() => {}))

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
      wrapper = mountBadges(createPlayer(1, 0))
      const state = gameState(createPlayer(2, 0))
      apiService.updateGameFouls.mockResolvedValue(state)

      await badgeAt(wrapper, REGULAR).trigger('click')
      await flushPromises()

      expect(wrapper.emitted('saved')).toEqual([[state]])
    })

    it('показывает значение сервера, когда оно разошлось с оптимистичным', async () => {
      let resolveRequest
      wrapper = mountBadges(createPlayer(1, 0))
      apiService.updateGameFouls.mockReturnValue(new Promise(resolve => {
        resolveRequest = resolve
      }))

      // Судья кликнул один раз: 1 → 2, значение показано до ответа сервера
      await badgeAt(wrapper, REGULAR).trigger('click')
      expect(countAt(wrapper, REGULAR)).toBe('2')

      // А сервер вернул 3: тот же фол уже поставили из панели фолов в диалоге.
      // Отправленное значение должно уступить состоянию игры, а не победить его
      resolveRequest(gameState(createPlayer(3, 0)))
      await wrapper.setProps({ player: createPlayer(3, 0) })
      await flushPromises()

      expect(countAt(wrapper, REGULAR)).toBe('3')
      expect(wrapper.emitted('saved')).toHaveLength(1)
    })

    it('возвращает сохранённое значение, если сервер отказал', async () => {
      let rejectRequest
      wrapper = mountBadges(createPlayer(1, 0))
      apiService.updateGameFouls.mockReturnValue(new Promise((resolve, reject) => {
        rejectRequest = reject
      }))

      await badgeAt(wrapper, REGULAR).trigger('click')
      expect(countAt(wrapper, REGULAR)).toBe('2')

      rejectRequest(new Error('fouls return a box to a phase that has already been played'))
      await flushPromises()

      expect(countAt(wrapper, REGULAR)).toBe('1')
      expect(wrapper.emitted('saved')).toBeUndefined()
    })
  })

  // Одного игрока рендерят два бейджа сразу: в колонке «Фолы» таблицы
  // и в панели фолов диалога голосования
  describe('Два бейджа одного игрока', () => {
    it('второй бейдж считает клик от значения, отправленного первым', async () => {
      const player = createPlayer(1, 0)
      wrapper = mountBadges(player)
      const second = mountWith(player)
      apiService.updateGameFouls.mockReturnValue(new Promise(() => {}))

      await badgeAt(wrapper, REGULAR).trigger('click')
      // Ответа ещё нет, но второй бейдж уже показывает отправленное значение
      expect(countAt(second, REGULAR)).toBe('2')

      await badgeAt(second, REGULAR).trigger('click')

      expect(apiService.updateGameFouls.mock.calls.map(([, fouls]) => fouls[0].count))
        .toEqual([2, 3])

      second.unmount()
    })

    it('не применяет ответ, устаревший после клика по второму бейджу', async () => {
      let resolveFirst
      const player = createPlayer(1, 0)
      wrapper = mountBadges(player)
      const second = mountWith(player)
      apiService.updateGameFouls
        .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve }))
        .mockReturnValue(new Promise(() => {}))

      await badgeAt(wrapper, REGULAR).trigger('click')
      await badgeAt(second, REGULAR).trigger('click')

      // Ответ на первый клик пришёл после второго — он уже не про текущее значение
      resolveFirst(gameState(createPlayer(2, 0)))
      await flushPromises()

      expect(wrapper.emitted('saved')).toBeUndefined()
      expect(countAt(second, REGULAR)).toBe('3')

      second.unmount()
    })
  })
})
