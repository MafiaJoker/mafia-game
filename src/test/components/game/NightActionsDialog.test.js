// Тесты ночного диалога: лучший ход спрашиваем только за первый отстрел,
// а подпись кнопки не выдаёт факт отстрела проснувшимся игрокам

import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import NightActionsDialog from '@/components/game/dialogs/NightActionsDialog.vue'
import { GameRolesEnum } from '@/utils/constants.js'

const PLAYERS = [
  { box_id: 1, is_in_game: true, role: GameRolesEnum.civilian },
  { box_id: 2, is_in_game: true, role: GameRolesEnum.sheriff },
  { box_id: 3, is_in_game: true, role: GameRolesEnum.mafia }
]

const createPhaseData = (overrides = {}) => ({
  don_checked_box_id: null,
  sheriff_checked_box_id: null,
  killed_box_id: null,
  removed_box_ids: [],
  voted_box_ids: [],
  ppk_box_id: null,
  best_move: [],
  ...overrides
})

let wrapper

// Диалог уезжает в body, поэтому его содержимое ищем по документу
const openDialog = async (phaseData = createPhaseData(), phaseId = 1) => {
  wrapper = mount(NightActionsDialog, {
    props: { modelValue: true, playersData: PLAYERS, phaseData, phaseId },
    attachTo: document.body
  })
  await flushPromises()
  return new DOMWrapper(document.body)
}

const footerButton = (dialog) => dialog.find('.el-dialog__footer button')
const missButton = (dialog) => dialog.findAll('.action-btn-miss')[0]

// Кнопки игроков в строке действия: отстрел, проверка дона, проверка шерифа
const rowButton = (dialog, row, boxId) => dialog.findAll('.action-row')[row]
  .findAll('.action-btn')
  .find(button => button.text() === String(boxId))

// Последние данные круга, отданные диалогом наверх
const lastPhaseData = () => {
  const updates = wrapper.emitted('update:phaseData')
  return updates[updates.length - 1][0]
}

describe('NightActionsDialog', () => {
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    document.body.innerHTML = ''
  })

  describe('Подпись кнопки', () => {
    it('не меняется от отстрела в первую ночь', async () => {
      const dialog = await openDialog(createPhaseData({ killed_box_id: 3 }))

      expect(footerButton(dialog).text()).toBe('Продолжить')
    })

    it('остаётся прежней в остальных кругах', async () => {
      const dialog = await openDialog(createPhaseData({ killed_box_id: 3 }), 2)

      expect(footerButton(dialog).text()).toBe('Продолжить')
    })
  })

  describe('Лучший ход', () => {
    it('спрашиваем за отстрел в первую ночь', async () => {
      const dialog = await openDialog(createPhaseData({ killed_box_id: 3 }))

      await footerButton(dialog).trigger('click')

      expect(wrapper.emitted('show-best-move')).toHaveLength(1)
      expect(wrapper.emitted('next-round')).toBeUndefined()
    })

    it('не спрашиваем после промаха: круг закрывается сразу', async () => {
      const dialog = await openDialog(createPhaseData())

      await footerButton(dialog).trigger('click')

      expect(wrapper.emitted('show-best-move')).toBeUndefined()
      expect(wrapper.emitted('next-round')).toHaveLength(1)
    })

    it('не спрашиваем за отстрел в следующих кругах', async () => {
      const dialog = await openDialog(createPhaseData({ killed_box_id: 3 }), 2)

      await footerButton(dialog).trigger('click')

      expect(wrapper.emitted('show-best-move')).toBeUndefined()
      expect(wrapper.emitted('next-round')).toHaveLength(1)
    })

    it('очищает уже введённый ЛХ, если судья передумал и нажал «Промах»', async () => {
      const dialog = await openDialog(createPhaseData({ killed_box_id: 3, best_move: [1, 2, 4] }))

      await missButton(dialog).trigger('click')

      expect(lastPhaseData()).toMatchObject({
        killed_box_id: null,
        best_move: []
      })
    })
  })

  describe('Данные круга', () => {
    it('сохраняет выбранный отстрел', async () => {
      const dialog = await openDialog()

      await rowButton(dialog, 0, 3).trigger('click')

      expect(lastPhaseData().killed_box_id).toBe(3)
    })

    it('не трогает ЛХ при выборе жертвы', async () => {
      const dialog = await openDialog(createPhaseData({ best_move: [1, 2, 4] }))

      await rowButton(dialog, 0, 3).trigger('click')

      expect(lastPhaseData().best_move).toEqual([1, 2, 4])
    })

    it('сохраняет проверки дона и шерифа', async () => {
      const dialog = await openDialog(createPhaseData({ killed_box_id: 3 }))

      await rowButton(dialog, 1, 2).trigger('click')
      // Данными круга владеет родитель, диалог собирает обновление из пропа
      await wrapper.setProps({ phaseData: lastPhaseData() })
      await rowButton(dialog, 2, 1).trigger('click')

      expect(lastPhaseData()).toMatchObject({
        killed_box_id: 3,
        don_checked_box_id: 2,
        sheriff_checked_box_id: 1
      })
    })
  })
})
