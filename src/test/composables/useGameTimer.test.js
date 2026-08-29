// Тесты общего состояния таймера: ход времени, режимы и пробел живут в одном
// месте, чтобы таймер в шапке игры и таймер в шапке диалога были одним таймером

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useGameTimer } from '@/composables/useGameTimer'
import { COUNTDOWN_PHASES } from '@/utils/constants.js'

const timer = useGameTimer()

const pressSpace = () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
}

beforeEach(() => {
  vi.useFakeTimers()
  timer.reset()
  timer.activate()
})

afterEach(() => {
  timer.deactivate()
  timer.reset()
  vi.useRealTimers()
})

describe('useGameTimer', () => {
  it('считает время вперед, пока запущен', async () => {
    expect(timer.formattedTime.value).toBe('00:00')

    await vi.advanceTimersByTimeAsync(3000)

    expect(timer.formattedTime.value).toBe('00:03')
  })

  it('по клику останавливается со сбросом, следующим - запускается', async () => {
    await vi.advanceTimersByTimeAsync(5000)

    timer.toggle()

    expect(timer.isRunning.value).toBe(false)
    expect(timer.formattedTime.value).toBe('00:00')

    await vi.advanceTimersByTimeAsync(3000)
    expect(timer.formattedTime.value).toBe('00:00')

    timer.toggle()
    await vi.advanceTimersByTimeAsync(2000)

    expect(timer.isRunning.value).toBe(true)
    expect(timer.formattedTime.value).toBe('00:02')
  })

  it('пробел переключает таймер один раз, сколько бы экземпляров ни было', async () => {
    // Шапка игры и шапка открытого диалога зовут композабл каждая
    useGameTimer()
    timer.activate()

    await vi.advanceTimersByTimeAsync(4000)
    expect(timer.formattedTime.value).toBe('00:04') // секунда идет за секунду

    pressSpace()

    expect(timer.isRunning.value).toBe(false)
  })

  it('в обратном отсчете переходит с договорки на свободную рассадку и встает', async () => {
    timer.startCountdown()

    expect(timer.formattedTime.value).toBe('01:00')

    await vi.advanceTimersByTimeAsync(59_000)
    expect(timer.formattedTime.value).toBe('00:01')

    // 60-я секунда договорки, следующий тик уводит в переход с желтой вспышкой
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(500)

    expect(timer.countdownPhase.value).toBe(COUNTDOWN_PHASES.FREE_SEATING)
    expect(timer.formattedTime.value).toBe('00:40')

    await vi.advanceTimersByTimeAsync(41_000)

    expect(timer.isRunning.value).toBe(false)
    expect(timer.formattedTime.value).toBe('00:00')
  })

  it('reset возвращает к прямому отсчету с нуля - новый круг и новая игра', async () => {
    timer.startCountdown()
    await vi.advanceTimersByTimeAsync(5000)

    timer.reset()

    expect(timer.countdownPhase.value).toBe(COUNTDOWN_PHASES.MAFIA_NEGOTIATION)
    expect(timer.isRunning.value).toBe(true)
    expect(timer.formattedTime.value).toBe('00:00')

    await vi.advanceTimersByTimeAsync(1000)
    expect(timer.formattedTime.value).toBe('00:01')
  })

  it('после ухода с экрана игры время не идет и пробел ничего не переключает', async () => {
    timer.deactivate()

    await vi.advanceTimersByTimeAsync(5000)
    pressSpace()

    expect(timer.formattedTime.value).toBe('00:00')
    expect(timer.isRunning.value).toBe(true)
  })
})
