// Шапка игровых диалогов: на телефоне и планшете диалог закрывает собой шапку
// игры вместе с таймером, поэтому таймер дублируется в шапке диалога

import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DialogTimerHeader from '@/components/game/dialogs/DialogTimerHeader.vue'

let wrapper

// useBreakpoints читает ширину в onMounted, то есть уже после первой отрисовки
const mountAtWidth = async (width) => {
  window.innerWidth = width
  wrapper = mount(DialogTimerHeader, { props: { title: 'Перестрелка' } })
  await flushPromises()
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
})

describe('DialogTimerHeader', () => {
  it('показывает заголовок диалога', async () => {
    expect((await mountAtWidth(375)).text()).toContain('Перестрелка')
  })

  it('на телефоне показывает таймер', async () => {
    expect((await mountAtWidth(375)).find('.game-timer').exists()).toBe(true)
  })

  it('на планшете показывает таймер', async () => {
    expect((await mountAtWidth(800)).find('.game-timer').exists()).toBe(true)
  })

  it('на компьютере таймера нет - виден таймер в шапке игры над диалогом', async () => {
    expect((await mountAtWidth(1366)).find('.game-timer').exists()).toBe(false)
  })
})
