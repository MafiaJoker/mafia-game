// Копирование в буфер обмена: тост об успехе - только после удавшейся
// записи. Отказ браузера (или отсутствие буфера на небезопасном origin) -
// тост об ошибке, а не ложное «скопировано»

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ElMessage } from 'element-plus'
import { useClipboard } from '@/composables/useClipboard'

const setClipboard = (clipboard) => {
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true })
}

beforeEach(() => {
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useClipboard', () => {
  it('кладет текст в буфер и сообщает об успехе', async () => {
    const writeText = vi.fn().mockResolvedValue()
    setClipboard({ writeText })
    const { copyToClipboard } = useClipboard()

    const copied = await copyToClipboard('Стол 1', 'Рассадка скопирована')

    expect(copied).toBe(true)
    expect(writeText).toHaveBeenCalledWith('Стол 1')
    expect(ElMessage.success).toHaveBeenCalledWith('Рассадка скопирована')
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('браузер отказал в записи - говорит об этом и не рапортует об успехе', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')) })
    const { copyToClipboard } = useClipboard()

    const copied = await copyToClipboard('Стол 1', 'Рассадка скопирована')

    expect(copied).toBe(false)
    expect(ElMessage.error).toHaveBeenCalledWith('Браузер не дал доступ к буферу обмена')
    expect(ElMessage.success).not.toHaveBeenCalled()
  })

  it('буфера нет вовсе (http на LAN-адресе) - та же ошибка, а не падение', async () => {
    setClipboard(undefined)
    const { copyToClipboard } = useClipboard()

    const copied = await copyToClipboard('https://example.test/game/1/dies', 'OBS ссылка скопирована!')

    expect(copied).toBe(false)
    expect(ElMessage.error).toHaveBeenCalledWith('Браузер не дал доступ к буферу обмена')
    expect(ElMessage.success).not.toHaveBeenCalled()
  })
})
