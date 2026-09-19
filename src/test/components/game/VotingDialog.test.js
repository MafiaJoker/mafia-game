// Тесты диалога голосования: ноль не подсвечен как поданный голос,
// а счётчик распределённых голосов стоит над списком кандидатур

import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import VotingDialog from '@/components/game/dialogs/VotingDialog.vue'
import { createPendingFouls } from '@/utils/pendingFouls.js'

// Панель фолов в диалоге сохраняет фолы через ручку - тесты её не трогают
vi.mock('@/services/api.js', () => ({
  apiService: {
    updateGameFouls: vi.fn()
  }
}))

const PLAYERS = Array.from({ length: 10 }, (_, index) => ({
  box_id: index + 1,
  nickname: `Игрок ${index + 1}`,
  is_in_game: true,
  fouls: []
}))

let wrapper

// Кандидатов диалог набирает в момент открытия, поэтому монтируем закрытым
const openDialog = async (nominatedPlayers) => {
  wrapper = mount(VotingDialog, {
    props: {
      modelValue: false,
      gameId: 'game-1',
      nominatedPlayers,
      playersData: PLAYERS,
      phaseData: {},
      foulTypes: [{ foul_type: 'regular', removal_threshold: 4 }],
      pendingFouls: createPendingFouls()
    },
    attachTo: document.body
  })
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  return new DOMWrapper(document.querySelector('.voting-container').closest('.el-dialog'))
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

const candidateRows = (dialog) => dialog.findAll('.candidate-row')

// Текст кнопки - число голосов
const voteButton = (buttons, votes) => buttons.find(button => button.text() === String(votes))
const rowButton = (row, votes) => voteButton(row.findAll('.vote-btn'), votes)

// Числа на подсвеченных кнопках
const highlightedVotes = (buttons) => buttons
  .filter(button => button.classes().includes('el-button--primary'))
  .map(button => Number(button.text()))

// В футере «Отмена» и «Продолжить»
const continueButton = (dialog) => dialog.findAll('.el-dialog__footer button').at(-1)

describe('VotingDialog', () => {
  describe('Подсветка кнопок голосов', () => {
    it('пока голосов нет, не подсвечена ни одна кнопка - и ноль тоже', async () => {
      const dialog = await openDialog([1, 2, 3])

      expect(candidateRows(dialog)).toHaveLength(3)
      candidateRows(dialog).forEach(row => {
        expect(highlightedVotes(row.findAll('.vote-btn'))).toEqual([])
      })
    })

    it('подсвечивает поданные голоса, а ноль остаётся без подсветки', async () => {
      const dialog = await openDialog([1, 2, 3])
      const row = candidateRows(dialog)[0]

      await rowButton(row, 3).trigger('click')

      expect(highlightedVotes(row.findAll('.vote-btn'))).toEqual([1, 2, 3])
    })

    it('нажатый ноль снимает подсветку целиком', async () => {
      const dialog = await openDialog([1, 2, 3])
      const row = candidateRows(dialog)[0]

      await rowButton(row, 3).trigger('click')
      await rowButton(row, 0).trigger('click')

      expect(highlightedVotes(row.findAll('.vote-btn'))).toEqual([])
    })

    it('в голосовании за подъём всех кандидатур ноль тоже не подсвечен', async () => {
      const dialog = await openDialog([1, 2])
      // Ничья 5:5 в голосовании и та же ничья в перестрелке ведут к подъёму всех
      for (let round = 1; round <= 2; round++) {
        const [first, second] = candidateRows(dialog)
        await rowButton(first, 5).trigger('click')
        await rowButton(second, 5).trigger('click')
        await continueButton(dialog).trigger('click')
        await flushPromises()
      }

      expect(candidateRows(dialog)).toHaveLength(0)
      expect(highlightedVotes(dialog.findAll('.vote-btn-large'))).toEqual([])

      await voteButton(dialog.findAll('.vote-btn-large'), 6).trigger('click')

      expect(highlightedVotes(dialog.findAll('.vote-btn-large'))).toEqual([1, 2, 3, 4, 5, 6])
    })
  })

  describe('Счётчик распределённых голосов', () => {
    it('стоит над списком кандидатур и считает поданные голоса', async () => {
      const dialog = await openDialog([1, 2, 3, 4, 5, 6])
      const counter = dialog.find('.voting-counter')
      const firstRow = candidateRows(dialog)[0].element

      // Под длинным списком счётчик уходил за край экрана
      expect(counter.element.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING)
        .toBeTruthy()
      expect(counter.text()).toContain('0 / 10')

      await rowButton(candidateRows(dialog)[5], 4).trigger('click')

      expect(dialog.find('.voting-counter').text()).toContain('4 / 10')
    })
  })
})
