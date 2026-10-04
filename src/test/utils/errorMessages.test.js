// Ошибки ручек рассадки человеческим языком: ники публичной рассадки сервер
// называет позицией в списке, а человеку нужна строка поля

import { describe, it, expect } from 'vitest'
import {
  getSeatingErrorMessage,
  getPublicSeatingErrorMessage
} from '@/utils/errorMessages.js'

const badRequest = (data) => ({ response: { status: 400, data } })

describe('getSeatingErrorMessage: ники публичной рассадки', () => {
  it('длинные ники - строками поля и пределом сервера', () => {
    const error = badRequest({
      detail: 'too long player nicknames',
      extra: { too_long_player_indexes: [0, 2], max_nickname_length: 50 }
    })

    expect(getSeatingErrorMessage(error, { playerLines: [2, 4, 7] }))
      .toBe('Ники в строках 2, 7 длиннее 50 символов')
  })

  it('ник длиннее, чем сервер готов чистить, отбит сериализатором - тоже строкой поля', () => {
    const error = badRequest({
      detail: 'Validation failed for POST /api/v1/seating',
      extra: [{ message: 'String should have at most 100 characters', key: 'players.1' }]
    })

    expect(getSeatingErrorMessage(error, { playerLines: [1, 3] }))
      .toBe('Ник в строке 3 длиннее 50 символов')
  })

  it('без номеров строк позиция в списке и есть строка', () => {
    const error = badRequest({
      detail: 'empty player nicknames',
      extra: { empty_player_indexes: [0, 4] }
    })

    expect(getSeatingErrorMessage(error))
      .toBe('Ники в строках 1, 5 пустые — в них только невидимые символы')
  })

  it('длинный сид по-прежнему называет сидом', () => {
    const error = badRequest({
      detail: 'Validation failed for POST /api/v1/seating',
      extra: [{ message: 'String should have at most 64 characters', key: 'seed' }]
    })

    expect(getSeatingErrorMessage(error)).toBe('Сид не длиннее 64 символов')
  })
})

describe('getPublicSeatingErrorMessage', () => {
  it('404 - нет такой рассадки, а не мероприятия', () => {
    const error = { response: { status: 404, data: { detail: 'Not Found' } } }

    expect(getPublicSeatingErrorMessage(error)).toBe('Рассадка не найдена')
    expect(getSeatingErrorMessage(error)).toBe('Мероприятие не найдено. Обновите страницу')
  })

  it('без ответа сервера - про соединение', () => {
    expect(getPublicSeatingErrorMessage(new Error('Network Error')))
      .toBe('Сервер не отвечает. Проверьте соединение')
  })
})
