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
  night_removed_box_ids: [],
  voted_box_ids: [],
  ppk_box_id: null,
  best_move: [],
  ...overrides
})

let wrapper

// Диалоги уезжают в body, а их теперь два: каждый ищем от своего корня
const dialogOf = (bodyClass) => new DOMWrapper(
  document.querySelector(bodyClass).closest('.el-dialog')
)
const nightDialog = () => dialogOf('.night-container')
const removeDialog = () => dialogOf('.voting-container')

const openDialog = async (phaseData = createPhaseData(), phaseId = 1) => {
  wrapper = mount(NightActionsDialog, {
    props: { modelValue: true, playersData: PLAYERS, phaseData, phaseId },
    attachTo: document.body
  })
  await flushPromises()
  return nightDialog()
}

// В футере ночи две кнопки: удаление слева, «Продолжить» справа
const footerButtons = (dialog) => dialog.findAll('.el-dialog__footer button')
const footerButton = (dialog) => footerButtons(dialog).at(-1)
const removeButton = (dialog) => footerButtons(dialog)[0]
const missButton = (dialog) => dialog.findAll('.action-btn-miss')[0]

// Подтверждение ночного действия: всплывашка живёт секунду в конце body
const toastText = () => Array.from(document.querySelectorAll('.el-message'))
  .map(message => message.textContent.trim())

// Галочка подтверждений стоит одна на все ночные действия
const toggleResults = async (dialog) => {
  await dialog.find('.settings-row input').setValue(false)
}

// Кнопки игроков в строке действия: отстрел, проверка дона, проверка шерифа,
// удаление ночью
const ROW = { kill: 0, don: 1, sheriff: 2, remove: 3 }

const rowButton = (dialog, row, boxId) => dialog.findAll('.action-row')[row]
  .findAll('.action-btn')
  .find(button => button.text() === String(boxId))

// Номера, которые строка вообще предлагает выбрать
const rowBoxIds = (dialog, row) => dialog.findAll('.action-row')[row]
  .findAll('.action-btn')
  .map(button => Number(button.text()))

// Последние данные круга, отданные диалогом наверх
const lastPhaseData = () => {
  const updates = wrapper.emitted('update:phaseData')
  return updates[updates.length - 1][0]
}

// Данными круга владеет родитель: возвращаем обновление обратно в проп
const applyPhaseData = async () => {
  await wrapper.setProps({ phaseData: lastPhaseData() })
  await flushPromises()
}

// Выбрать игрока в модалке удаления и подтвердить
const removeAtNight = async (dialog, boxIds) => {
  await removeButton(dialog).trigger('click')
  await flushPromises()
  for (const boxId of boxIds) {
    await removeDialog().findAll('.vote-btn')
      .find(button => button.text() === String(boxId))
      .trigger('click')
    await applyPhaseData()
  }
  await removeDialog().findAll('.el-dialog__footer button')
    .find(button => button.text() === 'Удалить выбранных')
    .trigger('click')
  await flushPromises()
}

// Номера, которые модалка удаления вообще предлагает выбрать
const removableBoxIds = async (dialog) => {
  await removeButton(dialog).trigger('click')
  await flushPromises()
  return removeDialog().findAll('.vote-btn').map(button => Number(button.text()))
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

  describe('Подтверждение действия', () => {
    it('называет отстрелянного игрока', async () => {
      const dialog = await openDialog()

      await rowButton(dialog, ROW.kill, 3).trigger('click')

      expect(toastText()).toContain('Убит игрок 3')
    })

    it('называет промах', async () => {
      const dialog = await openDialog()

      await missButton(dialog).trigger('click')

      expect(toastText()).toContain('Промах')
    })

    it('молчит про отстрел, когда галочка снята', async () => {
      const dialog = await openDialog()

      await toggleResults(dialog)
      await rowButton(dialog, ROW.kill, 3).trigger('click')

      expect(toastText()).toEqual([])
      // Данные круга галочка не трогает: она только про экран
      expect(lastPhaseData().killed_box_id).toBe(3)
    })

    it('молчит и про проверки, когда галочка снята', async () => {
      const dialog = await openDialog()

      await toggleResults(dialog)
      await rowButton(dialog, ROW.sheriff, 3).trigger('click')

      expect(toastText()).toEqual([])
    })
  })

  describe('Данные круга', () => {
    it('сохраняет выбранный отстрел', async () => {
      const dialog = await openDialog()

      await rowButton(dialog, ROW.kill, 3).trigger('click')

      expect(lastPhaseData().killed_box_id).toBe(3)
    })

    it('не трогает ЛХ при выборе жертвы', async () => {
      const dialog = await openDialog(createPhaseData({ best_move: [1, 2, 4] }))

      await rowButton(dialog, ROW.kill, 3).trigger('click')

      expect(lastPhaseData().best_move).toEqual([1, 2, 4])
    })

    it('сохраняет проверки дона и шерифа', async () => {
      const dialog = await openDialog(createPhaseData({ killed_box_id: 3 }))

      await rowButton(dialog, ROW.don, 2).trigger('click')
      // Данными круга владеет родитель, диалог собирает обновление из пропа
      await wrapper.setProps({ phaseData: lastPhaseData() })
      await rowButton(dialog, ROW.sheriff, 1).trigger('click')

      expect(lastPhaseData()).toMatchObject({
        killed_box_id: 3,
        don_checked_box_id: 2,
        sheriff_checked_box_id: 1
      })
    })
  })

  describe('Удаление игрока ночью', () => {
    it('живёт в модалке, а не занимает четвёртую строку ночи', async () => {
      const dialog = await openDialog()

      // Строк действий по-прежнему три: отстрел, дон, шериф
      expect(dialog.findAll('.action-row')).toHaveLength(3)
      expect(removeButton(dialog).text()).toBe('Удалить игрока')
    })

    it('пишет удалённого в ночное поле, а не в дневное', async () => {
      const dialog = await openDialog()

      await removeAtNight(dialog, [2])

      expect(lastPhaseData()).toMatchObject({
        night_removed_box_ids: [2],
        removed_box_ids: []
      })
    })

    it('называет удалённых на кнопке: модалка закрылась, а удаление осталось', async () => {
      const dialog = await openDialog()

      await removeAtNight(dialog, [2, 3])

      expect(removeButton(nightDialog()).text()).toBe('Удалено: 2, 3')
    })

    it('подтверждает удаление тостом', async () => {
      const dialog = await openDialog()

      await removeAtNight(dialog, [2])

      expect(toastText()).toContain('Удалён игрок 2')
    })

    it('молчит про удаление, когда галочка снята', async () => {
      const dialog = await openDialog()

      await toggleResults(dialog)
      await removeAtNight(dialog, [2])

      expect(toastText()).toEqual([])
      expect(lastPhaseData().night_removed_box_ids).toEqual([2])
    })

    it('не предлагает заголосованного в этом круге', async () => {
      const dialog = await openDialog(createPhaseData({ voted_box_ids: [2] }))

      expect(await removableBoxIds(dialog)).toEqual([1, 3])
    })

    // Бек отвергает круг, где игрок вышел и днём, и ночью, а круг уезжает
    // одним PATCH: 400 унесёт весь круг целиком
    it('не предлагает удалённого днём — ни на удаление, ни на отстрел', async () => {
      const dialog = await openDialog(createPhaseData({ removed_box_ids: [3] }))

      expect(rowBoxIds(dialog, ROW.kill)).toEqual([1, 2])
      expect(await removableBoxIds(dialog)).toEqual([1, 2])
    })

    it('предлагает отстрелянного: удалить его ночью можно', async () => {
      const dialog = await openDialog(createPhaseData({ killed_box_id: 3 }))

      await removeAtNight(dialog, [3])

      expect(lastPhaseData()).toMatchObject({
        killed_box_id: 3,
        night_removed_box_ids: [3]
      })
    })
  })
})
