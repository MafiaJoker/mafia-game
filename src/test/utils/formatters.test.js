// Общие форматтеры рейтинга: одно и то же число таблица, список и график
// обязаны писать одинаково

import { describe, it, expect } from 'vitest'
import { formatGamesCount, formatSignedChange } from '@/utils/formatters'

describe('formatGamesCount', () => {
  it('склоняет слово по числу', () => {
    expect([1, 2, 5, 11, 21, 22, 111].map((count) => formatGamesCount(count)))
      .toEqual(['1 игра', '2 игры', '5 игр', '11 игр', '21 игра', '22 игры', '111 игр'])
  })

  it('в винительном падеже - «сыграть 1 игру»', () => {
    expect([1, 3, 5, 21].map((count) => formatGamesCount(count, { accusative: true })))
      .toEqual(['1 игру', '3 игры', '5 игр', '21 игру'])
  })

  it('пустое число игр - ноль', () => {
    expect(formatGamesCount(null)).toBe('0 игр')
    expect(formatGamesCount(undefined)).toBe('0 игр')
  })
})

describe('formatSignedChange', () => {
  it('рост с плюсом, падение с типографским минусом', () => {
    expect(formatSignedChange(12)).toBe('+12')
    expect(formatSignedChange(-5)).toBe('−5')
  })

  it('ноль - «±0», и тот, что остался после округления', () => {
    expect(formatSignedChange(0)).toBe('±0')
    expect(formatSignedChange(0.04, 1)).toBe('±0')
    expect(formatSignedChange(-0.04, 1)).toBe('±0')
  })

  it('дробное изменение - с заданной точностью', () => {
    expect(formatSignedChange(6.28, 1)).toBe('+6.3')
    expect(formatSignedChange(-12, 1)).toBe('−12.0')
  })
})
