// Публичная рассадка: форма без входа, рассадку считает и хранит сервер.
// После генерации адрес становится ссылкой на рассадку, по ссылке форма
// заполняется сохраненными параметрами. В теле запроса фронт сообщает,
// откуда пришел посетитель: referrer, метки utm_* и id браузера

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ElInputNumber, ElMessage } from 'element-plus'
import SeatingView from '@/views/SeatingView.vue'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    createPublicSeating: vi.fn(),
    getPublicSeating: vi.fn()
  }
}))

const SEATING_ID = '7b2f7c8e-0a51-4c0e-9d0e-4a3e4c1f5b21'
const NEXT_SEATING_ID = 'c0a8012e-5d1f-4b8a-8f3e-2b6d7a9e4c10'
const CLIENT_ID = '3d6f0a2b-8c4e-4f1a-9b7d-5e2c1a0f8d36'
const DESKTOP_WIDTH = window.innerWidth

const Blank = { render: () => null }

const nicknames = (count, from = 1) => Array.from(
  { length: count },
  (_, index) => `Ник ${from + index}`
)

const game = (number, tableId, roster) => ({
  label: `Игра ${number}`,
  table_id: tableId,
  seats: roster.map((nickname, index) => ({ box_id: index + 1, nickname }))
})

// Ответ POST /seating и GET /seating/{id}: два стола, по игре на стол
const seatingResponse = (overrides = {}) => ({
  id: SEATING_ID,
  title: 'Тест',
  seed: 'сид-сервера',
  tables_count: 2,
  games_count: 2,
  players: nicknames(20),
  games: [
    game(1, 1, nicknames(10)),
    game(2, 2, nicknames(10, 11))
  ],
  text: 'Тест\n\nСтол 1\n\nИгра 1\n1. Ник 1',
  ...overrides
})

const httpError = (status, data = {}) => ({ response: { status, data } })

const mountPage = async (path = '/seating') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Blank },
      { path: '/seating/:id?', name: 'Seating', component: Blank }
    ]
  })
  router.push(path)
  await router.isReady()

  const wrapper = mount(SeatingView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

const button = (wrapper, label) => wrapper.findAll('button')
  .find(btn => btn.text() === label)

const click = async (wrapper, label) => {
  await button(wrapper, label).trigger('click')
  await flushPromises()
}

const inputNumbers = (wrapper) => wrapper.findAllComponents(ElInputNumber)
const titleInput = (wrapper) => wrapper.find('.title-input input')
const playersInput = (wrapper) => wrapper.find('.players-input textarea')
const seedInput = (wrapper) => wrapper.find('.seed-input input')

const fillForm = async (wrapper, { title, tables, games, players, seed } = {}) => {
  if (title !== undefined) await titleInput(wrapper).setValue(title)
  if (tables !== undefined) await inputNumbers(wrapper)[0].setValue(tables)
  if (games !== undefined) await inputNumbers(wrapper)[1].setValue(games)
  if (players !== undefined) await playersInput(wrapper).setValue(players)
  if (seed !== undefined) await seedInput(wrapper).setValue(seed)
}

const alertText = (wrapper, selector) => {
  const title = wrapper.find(`${selector} .el-alert__title`)
  return title.exists() ? title.text() : ''
}

const lastPayload = () => apiService.createPublicSeating.mock.lastCall[0]

const tableNames = (wrapper) => wrapper.findAll('.preview-table-name').map(name => name.text())

// localStorage в тестах - заглушка из setup.js: даем ей настоящую память
const storage = new Map()

// Ширина экрана у всех оберток общая: без автоотмонтирования ее смена
// перерисовывала бы страницы прошлых тестов
enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  storage.clear()
  localStorage.getItem.mockImplementation(key => storage.get(key) ?? null)
  localStorage.setItem.mockImplementation((key, value) => storage.set(key, String(value)))
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(CLIENT_ID)
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue() },
    configurable: true
  })
  apiService.createPublicSeating.mockResolvedValue(seatingResponse())
  apiService.getPublicSeating.mockResolvedValue(seatingResponse())
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  // Свое свойство документа прячет referrer самого документа - убираем его
  delete document.referrer
  window.innerWidth = DESKTOP_WIDTH
})

describe('SeatingView: генерация', () => {
  it('отправляет форму, меняет адрес на ссылку рассадки и показывает ее по столам', async () => {
    const { wrapper, router } = await mountPage()

    await fillForm(wrapper, { title: '  Тест ', tables: 2, games: 2, players: nicknames(20).join('\n') })
    await click(wrapper, 'Сгенерировать')

    expect(apiService.createPublicSeating).toHaveBeenCalledWith({
      tables_count: 2,
      games_count: 2,
      title: 'Тест',
      players: nicknames(20),
      client_id: CLIENT_ID
    })
    expect(router.currentRoute.value.fullPath).toBe(`/seating/${SEATING_ID}`)
    expect(tableNames(wrapper)).toEqual(['Стол 1', 'Стол 2'])
    expect(wrapper.find('.preview-title').text()).toBe('Тест')
    expect(wrapper.find('.preview-seed').text()).toBe('Сид: сид-сервера')
    expect(wrapper.findAll('.seating-table tbody tr')[0].findAll('td').map(cell => cell.text()))
      .toEqual(['1', 'Ник 1'])
    expect(button(wrapper, 'Скопировать рассадку').exists()).toBe(true)
    expect(button(wrapper, 'Скопировать ссылку').exists()).toBe(true)
    expect(wrapper.find('.result-note').text())
      .toBe('Рассадка сохраняется, по ссылке её откроет любой')
  })

  it('пустые строки между никами не считает и не отправляет', async () => {
    const { wrapper } = await mountPage()

    await fillForm(wrapper, { players: '\nНик 1\n\n  Ник 2  \n' })

    expect(wrapper.find('.players-counter').text()).toBe('2 из 10')

    await click(wrapper, 'Сгенерировать')

    expect(lastPayload().players).toEqual(['Ник 1', 'Ник 2'])
  })

  it('без ников, названия и сида отправляет только столы и игры', async () => {
    const { wrapper } = await mountPage()

    await click(wrapper, 'Сгенерировать')

    expect(apiService.createPublicSeating).toHaveBeenCalledWith({
      tables_count: 1,
      games_count: 1,
      client_id: CLIENT_ID
    })
  })

  it('перегенерация: тот же запрос без сида и новый адрес', async () => {
    const { wrapper, router } = await mountPage()
    await fillForm(wrapper, { tables: 2, games: 2, players: nicknames(20).join('\n'), seed: 'мой-сид' })
    await click(wrapper, 'Сгенерировать')
    expect(lastPayload().seed).toBe('мой-сид')

    apiService.createPublicSeating.mockResolvedValue(seatingResponse({ id: NEXT_SEATING_ID, seed: 'новый' }))
    await click(wrapper, 'Перегенерировать')

    expect(apiService.createPublicSeating).toHaveBeenCalledTimes(2)
    expect(lastPayload()).not.toHaveProperty('seed')
    expect(lastPayload().players).toEqual(nicknames(20))
    expect(seedInput(wrapper).element.value).toBe('')
    expect(router.currentRoute.value.fullPath).toBe(`/seating/${NEXT_SEATING_ID}`)
    expect(wrapper.find('.preview-seed').text()).toBe('Сид: новый')
  })

  it('пока идет перегенерация, прежняя рассадка остается на экране', async () => {
    const { wrapper } = await mountPage(`/seating/${SEATING_ID}`)
    let respond
    apiService.createPublicSeating.mockReturnValue(new Promise(resolve => { respond = resolve }))

    await click(wrapper, 'Перегенерировать')

    expect(wrapper.find('.preview-seed').text()).toBe('Сид: сид-сервера')

    respond(seatingResponse({ id: NEXT_SEATING_ID, seed: 'новый' }))
    await flushPromises()

    expect(wrapper.find('.preview-seed').text()).toBe('Сид: новый')
  })

  it('правка формы прячет показанную рассадку и возвращает кнопку генерации', async () => {
    const { wrapper } = await mountPage()
    await click(wrapper, 'Сгенерировать')
    expect(wrapper.find('.seating-preview').exists()).toBe(true)

    await fillForm(wrapper, { title: 'Другое название' })

    expect(wrapper.find('.seating-preview').exists()).toBe(false)
    expect(button(wrapper, 'Сгенерировать').exists()).toBe(true)
  })
})

describe('SeatingView: копирование', () => {
  it('«Скопировать рассадку» кладет в буфер текст ответа', async () => {
    const { wrapper } = await mountPage()
    await click(wrapper, 'Сгенерировать')

    await click(wrapper, 'Скопировать рассадку')

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(seatingResponse().text)
    expect(ElMessage.success).toHaveBeenCalledWith('Рассадка скопирована в буфер обмена')
  })

  it('«Скопировать ссылку» кладет в буфер адрес рассадки', async () => {
    const { wrapper } = await mountPage()
    await click(wrapper, 'Сгенерировать')

    await click(wrapper, 'Скопировать ссылку')

    expect(navigator.clipboard.writeText)
      .toHaveBeenCalledWith(`${window.location.origin}/seating/${SEATING_ID}`)
    expect(ElMessage.success).toHaveBeenCalledWith('Ссылка на рассадку скопирована')
  })
})

describe('SeatingView: рассадка по ссылке', () => {
  it('грузит рассадку по id из адреса, заполняет форму и показывает рассадку', async () => {
    const { wrapper } = await mountPage(`/seating/${SEATING_ID}`)

    expect(apiService.getPublicSeating).toHaveBeenCalledWith(SEATING_ID)
    expect(apiService.createPublicSeating).not.toHaveBeenCalled()
    expect(titleInput(wrapper).element.value).toBe('Тест')
    expect(inputNumbers(wrapper).map(input => input.props('modelValue'))).toEqual([2, 2])
    expect(playersInput(wrapper).element.value).toBe(nicknames(20).join('\n'))
    expect(seedInput(wrapper).element.value).toBe('сид-сервера')
    expect(tableNames(wrapper)).toEqual(['Стол 1', 'Стол 2'])
    expect(button(wrapper, 'Перегенерировать').exists()).toBe(true)
  })

  it('рассадку с никами по умолчанию открывает с пустым полем ников', async () => {
    apiService.getPublicSeating.mockResolvedValue(seatingResponse({ title: null, players: null }))

    const { wrapper } = await mountPage(`/seating/${SEATING_ID}`)

    expect(titleInput(wrapper).element.value).toBe('')
    expect(playersInput(wrapper).element.value).toBe('')
    expect(wrapper.find('.preview-title').text()).toBe('Рассадка')
  })

  it('перегенерация с открытой ссылки не просит ники заново', async () => {
    const { wrapper } = await mountPage(`/seating/${SEATING_ID}`)

    await click(wrapper, 'Перегенерировать')

    expect(apiService.createPublicSeating).toHaveBeenCalledWith({
      tables_count: 2,
      games_count: 2,
      title: 'Тест',
      players: nicknames(20),
      client_id: CLIENT_ID
    })
  })

  it('несуществующая рассадка - «Рассадка не найдена» и пустая форма', async () => {
    apiService.getPublicSeating.mockRejectedValue(httpError(404, { detail: 'seating not found' }))

    const { wrapper } = await mountPage(`/seating/${SEATING_ID}`)

    expect(alertText(wrapper, '.load-alert')).toBe('Рассадка не найдена')
    expect(titleInput(wrapper).element.value).toBe('')
    expect(inputNumbers(wrapper).map(input => input.props('modelValue'))).toEqual([1, 1])
    expect(playersInput(wrapper).element.value).toBe('')
    expect(wrapper.find('.seating-preview').exists()).toBe(false)
    expect(button(wrapper, 'Сгенерировать').exists()).toBe(true)
  })

  it('пункт меню «Рассадка» с открытой ссылки дает чистую форму', async () => {
    const { wrapper, router } = await mountPage(`/seating/${SEATING_ID}`)

    await router.push('/seating')
    await flushPromises()

    expect(titleInput(wrapper).element.value).toBe('')
    expect(playersInput(wrapper).element.value).toBe('')
    expect(wrapper.find('.seating-preview').exists()).toBe(false)
    expect(apiService.getPublicSeating).toHaveBeenCalledTimes(1)
  })

  it('ответ генерации после перехода на другую рассадку ничего не трогает', async () => {
    const { wrapper, router } = await mountPage()
    let respond
    apiService.createPublicSeating.mockReturnValue(new Promise(resolve => { respond = resolve }))
    apiService.getPublicSeating.mockResolvedValue(seatingResponse({ id: NEXT_SEATING_ID, seed: 'по-ссылке' }))

    await click(wrapper, 'Сгенерировать')
    await router.push(`/seating/${NEXT_SEATING_ID}`)
    await flushPromises()
    respond(seatingResponse())
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe(`/seating/${NEXT_SEATING_ID}`)
    expect(wrapper.find('.preview-seed').text()).toBe('Сид: по-ссылке')
  })
})

describe('SeatingView: ошибки', () => {
  it('нехватку ников пересказывает словами диалога мероприятия, рассадки нет', async () => {
    apiService.createPublicSeating.mockRejectedValue(httpError(400, {
      detail: 'wrong players count',
      extra: { required_players_count: 20, actual_players_count: 19 }
    }))
    const { wrapper, router } = await mountPage()

    await fillForm(wrapper, { tables: 2, games: 2, players: nicknames(19).join('\n') })
    await click(wrapper, 'Сгенерировать')

    expect(alertText(wrapper, '.seating-alert'))
      .toBe('Игроков 19, а нужно ровно 20 — по 10 на каждый стол')
    expect(wrapper.find('.seating-preview').exists()).toBe(false)
    expect(router.currentRoute.value.fullPath).toBe('/seating')
  })

  it('повторы ников называет по именам', async () => {
    apiService.createPublicSeating.mockRejectedValue(httpError(400, {
      detail: 'duplicate players',
      extra: { duplicate_players: ['Вася', 'Петя'] }
    }))
    const { wrapper } = await mountPage()

    await click(wrapper, 'Сгенерировать')

    expect(alertText(wrapper, '.seating-alert'))
      .toBe('Ники повторяются (без учета регистра): Вася, Петя')
  })

  it('пустой после чистки ник называет строкой поля, а не позицией в списке', async () => {
    apiService.createPublicSeating.mockRejectedValue(httpError(400, {
      detail: 'empty player nicknames',
      extra: { empty_player_indexes: [1] }
    }))
    const { wrapper } = await mountPage()

    await fillForm(wrapper, { players: 'Ник 1\n\n​\nНик 3' })
    await click(wrapper, 'Сгенерировать')

    expect(alertText(wrapper, '.seating-alert'))
      .toBe('Ник в строке 3 пустой — в нем только невидимые символы')
  })

  it('на 429 просит подождать минуту', async () => {
    apiService.createPublicSeating.mockRejectedValue(httpError(429, { detail: 'Too Many Requests' }))
    const { wrapper } = await mountPage()

    await click(wrapper, 'Сгенерировать')

    expect(alertText(wrapper, '.seating-alert'))
      .toBe('Слишком много рассадок подряд, попробуйте через минуту')
  })

  it('неудачная перегенерация оставляет прежнюю рассадку и говорит, что не так', async () => {
    const { wrapper, router } = await mountPage(`/seating/${SEATING_ID}`)
    apiService.createPublicSeating.mockRejectedValue(httpError(429))

    await click(wrapper, 'Перегенерировать')

    expect(alertText(wrapper, '.result-card .seating-alert'))
      .toBe('Слишком много рассадок подряд, попробуйте через минуту')
    expect(wrapper.find('.preview-seed').text()).toBe('Сид: сид-сервера')
    expect(router.currentRoute.value.fullPath).toBe(`/seating/${SEATING_ID}`)
  })
})

describe('SeatingView: откуда пришел посетитель', () => {
  it('отправляет referrer, метки utm_* адреса открытия и id браузера', async () => {
    Object.defineProperty(document, 'referrer', {
      value: 'https://t.me/mafia_club',
      configurable: true
    })
    const { wrapper } = await mountPage('/seating?utm_source=test&utm_campaign=autumn&ref=ignored')

    await click(wrapper, 'Сгенерировать')

    expect(lastPayload()).toMatchObject({
      referrer: 'https://t.me/mafia_club',
      utm: { utm_source: 'test', utm_campaign: 'autumn' },
      client_id: CLIENT_ID
    })
    expect(storage.get('seating_client_id')).toBe(CLIENT_ID)
  })

  it('метки помнит и после смены адреса на ссылку рассадки, id браузера - тот же', async () => {
    const { wrapper, router } = await mountPage('/seating?utm_source=test')
    await click(wrapper, 'Сгенерировать')
    expect(router.currentRoute.value.query).toEqual({})

    await click(wrapper, 'Перегенерировать')

    expect(lastPayload().utm).toEqual({ utm_source: 'test' })
    expect(lastPayload().client_id).toBe(CLIENT_ID)
    expect(globalThis.crypto.randomUUID).toHaveBeenCalledTimes(1)
  })

  it('id браузера, записанный раньше, берет из localStorage', async () => {
    storage.set('seating_client_id', NEXT_SEATING_ID)
    const { wrapper } = await mountPage()

    await click(wrapper, 'Сгенерировать')

    expect(lastPayload().client_id).toBe(NEXT_SEATING_ID)
    expect(globalThis.crypto.randomUUID).not.toHaveBeenCalled()
  })

  it('без referrer и меток этих полей не отправляет', async () => {
    const { wrapper } = await mountPage()

    await click(wrapper, 'Сгенерировать')

    expect(lastPayload()).not.toHaveProperty('referrer')
    expect(lastPayload()).not.toHaveProperty('utm')
  })

  it('без localStorage id браузера не отправляет', async () => {
    localStorage.getItem.mockImplementation(() => {
      throw new DOMException('localStorage is disabled', 'SecurityError')
    })
    const { wrapper } = await mountPage()

    await click(wrapper, 'Сгенерировать')

    expect(lastPayload()).not.toHaveProperty('client_id')
  })

  it('без crypto.randomUUID (небезопасный origin) id браузера не отправляет', async () => {
    vi.stubGlobal('crypto', {})
    const { wrapper } = await mountPage()

    await click(wrapper, 'Сгенерировать')

    expect(lastPayload()).not.toHaveProperty('client_id')
    expect(storage.has('seating_client_id')).toBe(false)
  })
})

describe('SeatingView на телефоне', () => {
  beforeEach(() => {
    window.innerWidth = 375
  })

  it('рассадка - карточками игр, а не широкой таблицей', async () => {
    const { wrapper } = await mountPage(`/seating/${SEATING_ID}`)

    expect(wrapper.find('.seating-table').exists()).toBe(false)
    expect(wrapper.findAll('.preview-game-label').map(label => label.text()))
      .toEqual(['Игра 1', 'Игра 2'])
  })
})
