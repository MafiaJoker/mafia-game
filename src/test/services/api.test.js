// api.js — единственная дверь фронта к бекенду: каждая ручка уходит своим
// методом на свой адрес с куками сессии, а ошибка сервера доходит до
// вызывающего целой — экраны читают из неё status и detail

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AxiosError } from 'axios'
import settle from 'axios/unsafe/core/settle.js'
import { apiService } from '@/services/api'

// Сеть подменена на уровне адаптера axios: экземпляр из api.js, его заголовки
// и интерцепторы настоящие. axios.create копирует адаптер из defaults в момент
// создания, поэтому транспорт ставится до того, как api.js создаст экземпляр
const transport = vi.hoisted(() => {
  // api.js пишет в консоль каждый запрос и ответ, начиная с импорта
  vi.spyOn(console, 'log').mockImplementation(() => {})
  return vi.fn()
})

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal()
  actual.default.defaults.adapter = transport
  return actual
})

// Ответ сервера в том виде, в каком его отдаёт настоящий адаптер: тело текстом,
// имена заголовков в нижнем регистре, а статус разбирает settle самого axios —
// 4xx и 5xx становятся AxiosError с response
const respond = (status, body = '', contentType = 'application/json') => (config) =>
  new Promise((resolve, reject) => settle(resolve, reject, {
    data: typeof body === 'string' ? body : JSON.stringify(body),
    status,
    statusText: '',
    headers: { 'content-type': contentType },
    config,
    request: {}
  }))

// Запросы так, как их увидел сервер. Запрос мимо транспорта ушёл бы в
// настоящую сеть, и в этом списке его бы не оказалось
const sent = () => transport.mock.calls.map(([config]) => ({
  method: config.method.toUpperCase(),
  url: config.url,
  params: config.params,
  body: config.data === undefined ? undefined : JSON.parse(config.data)
}))

const requests = () => transport.mock.calls.map(([config]) => config)

beforeEach(() => {
  vi.clearAllMocks()
  transport.mockImplementation(respond(200, {}))
})

describe('apiService: метод и адрес каждой ручки', () => {
  it('мероприятия: список с фильтрами в query, карточка, создание, правка и удаление', async () => {
    await apiService.getEvents({ pageSize: 20, currentPage: 2, searchString: 'Кубок' })
    await apiService.getEvent('ev-1')
    await apiService.createEvent({ label: 'Кубок осени' })
    await apiService.updateEvent('ev-1', { label: 'Кубок зимы' })
    await apiService.deleteEvent('ev-1')

    expect(sent()).toEqual([
      { method: 'GET', url: '/events', params: { pageSize: 20, currentPage: 2, searchString: 'Кубок' } },
      { method: 'GET', url: '/events/ev-1' },
      { method: 'POST', url: '/events', body: { label: 'Кубок осени' } },
      { method: 'PATCH', url: '/events/ev-1', body: { label: 'Кубок зимы' } },
      { method: 'DELETE', url: '/events/ev-1' }
    ])
  })

  it('пользователи: страница списка в query, создание, правка чужого и своего профиля', async () => {
    await apiService.getUsers({ pageSize: 20, currentPage: 3, nickname: 'Бат' })
    await apiService.createUser({ nickname: 'Батон' })
    await apiService.updateUser('user-1', { nickname: 'Батон' })
    await apiService.getCurrentUser()
    await apiService.updateCurrentUser({ nickname: 'Жора' })

    expect(sent()).toEqual([
      { method: 'GET', url: '/users', params: { pageSize: 20, currentPage: 3, nickname: 'Бат' } },
      { method: 'POST', url: '/users', body: { nickname: 'Батон' } },
      { method: 'PUT', url: '/users/user-1', body: { nickname: 'Батон' } },
      { method: 'GET', url: '/users/me' },
      { method: 'PATCH', url: '/users/me', body: { nickname: 'Жора' } }
    ])
  })

  it('типы мероприятий: список, создание, правка и удаление', async () => {
    await apiService.getEventTypes()
    await apiService.createEventType({ label: 'Рейтинговая игра' })
    await apiService.updateEventType('type-1', { label: 'Турнир' })
    await apiService.deleteEventType('type-1')

    expect(sent()).toEqual([
      { method: 'GET', url: '/event-types' },
      { method: 'POST', url: '/event-types', body: { label: 'Рейтинговая игра' } },
      { method: 'PATCH', url: '/event-types/type-1', body: { label: 'Турнир' } },
      { method: 'DELETE', url: '/event-types/type-1' }
    ])
  })

  it('заявки мероприятия: список с фильтром в адресе, запись игрока, отмена PATCH-ем', async () => {
    await apiService.getEventRegistrations('ev-1', { currentPage: 1, pageSize: 20, status: 'pending' })
    await apiService.createRegistration('ev-1', 'user-7')
    await apiService.deleteRegistration('ev-1', 'reg-1')

    expect(sent()).toEqual([
      { method: 'GET', url: '/events/ev-1/registrations?currentPage=1&pageSize=20&status=pending' },
      // Голый id игрока ручка сама заворачивает в тело
      { method: 'POST', url: '/events/ev-1/registrations', body: { user_id: 'user-7' } },
      // DELETE у заявок на бекенде нет: удаление — это перевод в отменённые
      { method: 'PATCH', url: '/events/ev-1/registrations/reg-1', body: { status: 'cancelled' } }
    ])
  })

  it('тарифы: список, создание, правка и удаление', async () => {
    await apiService.getTariffs()
    await apiService.createTariff({ label: 'Абонемент', price: 20000 })
    await apiService.updateTariff('tariff-1', { price: 25000 })
    await apiService.deleteTariff('tariff-1')

    expect(sent()).toEqual([
      { method: 'GET', url: '/tariffs' },
      { method: 'POST', url: '/tariffs', body: { label: 'Абонемент', price: 20000 } },
      { method: 'PUT', url: '/tariffs/tariff-1', body: { price: 25000 } },
      { method: 'DELETE', url: '/tariffs/tariff-1' }
    ])
  })

  it('вход через Telegram, вход тестового пользователя и выход', async () => {
    const telegram = { id: 42, first_name: 'Жора', auth_date: 1759190400, hash: 'f00d' }

    await apiService.telegramLogin(telegram)
    await apiService.testUserLogin()
    await apiService.logout()

    expect(sent()).toEqual([
      { method: 'PUT', url: '/auth/telegram', body: telegram },
      { method: 'PUT', url: '/auth/token', body: { id: expect.any(String), role: 'cashier' } },
      { method: 'DELETE', url: '/auth/logout' }
    ])
  })
})

describe('apiService: запрос и ответ', () => {
  it('отдаёт вызывающему разобранное тело ответа, а не обёртку axios', async () => {
    const event = { id: 'ev-1', label: 'Кубок осени' }
    transport.mockImplementation(respond(200, event))

    await expect(apiService.getEvent('ev-1')).resolves.toEqual(event)
  })

  it('шлёт куки сессии с каждым запросом, а тело — JSON-ом', async () => {
    await apiService.getEvents()
    await apiService.createEvent({ label: 'Кубок осени' })

    const [list, create] = requests()
    expect(list.withCredentials).toBe(true)
    expect(create.withCredentials).toBe(true)
    expect(create.headers.getContentType()).toBe('application/json')
    expect(create.data).toBe('{"label":"Кубок осени"}')
  })

  it('тестовый вход подписан Basic-заголовком, остальные запросы токена не несут', async () => {
    await apiService.testUserLogin()
    await apiService.getCurrentUser()

    const [login, me] = requests()
    expect(login.headers.get('Authorization')).toBe('Basic e37bd08d')
    // Сессия живёт в куках: своего токена у фронта нет
    expect(me.headers.has('Authorization')).toBe(false)
  })

  // С дефолтным application/json axios превратил бы форму в JSON-строку,
  // а 10 секунд мало для фото с телефона на мобильном интернете
  it('аватар уходит формой с файлом и минутным таймаутом', async () => {
    const photo = new File(['jpeg'], 'me.jpg', { type: 'image/jpeg' })

    await apiService.uploadMyAvatar('sheriff', photo)

    const [upload] = requests()
    expect(upload.method).toBe('put')
    expect(upload.url).toBe('/users/me/avatars/sheriff')
    expect(upload.data).toBeInstanceOf(FormData)
    expect(upload.data.get('data').name).toBe('me.jpg')
    expect(upload.timeout).toBe(60000)
  })

  // responseType не задан нарочно: текст рассадки приходит как есть,
  // а тело ошибки axios всё так же разбирает как JSON
  it('рассадку текстом отдаёт как есть', async () => {
    const seating = 'Игра 1\nСтол 1: 1. Батон 2. Жора'
    transport.mockImplementation(respond(200, seating, 'text/plain; charset=utf-8'))

    await expect(apiService.exportSeating('ev-1')).resolves.toBe(seating)
    expect(sent()).toEqual([{ method: 'GET', url: '/events/ev-1/seating/export' }])
  })
})

describe('apiService: ошибки доходят до вызывающего', () => {
  // Интерцептор ответа пишет каждую ошибку в console.error: здесь они ожидаемы
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    console.error.mockRestore()
  })

  // Тела ошибок такие, как их отдаёт Litestar бекенда: detail и, где есть, extra
  it.each([
    [400, 'валидация', () => apiService.createEvent({}), {
      status_code: 400,
      detail: 'Validation failed for POST /api/v1/events',
      extra: [{ message: 'Field required', key: 'label', source: 'body' }]
    }],
    [401, 'сессия истекла', () => apiService.getCurrentUser(),
      { status_code: 401, detail: 'Unauthorized' }],
    [404, 'рассадки ещё нет', () => apiService.exportSeating('ev-1'),
      { status_code: 404, detail: 'no seating found for this event' }],
    [409, 'у мероприятия есть игры', () => apiService.deleteEvent('ev-1'),
      { status_code: 409, detail: 'event with an active game could not be deleted' }],
    [500, 'сбой сервера', () => apiService.getEvents(),
      { status_code: 500, detail: 'Internal Server Error' }]
  ])('%i, %s: промис отвергается, а статус и тело ошибки целы', async (status, reason, call, body) => {
    transport.mockImplementation(respond(status, body))

    await expect(call()).rejects.toMatchObject({ response: { status, data: body } })
  })

  it('сетевой сбой отвергает промис без response: по нему экраны пишут «нет связи»', async () => {
    transport.mockImplementation((config) =>
      Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {})))

    const error = await apiService.getEvents().catch(caught => caught)

    // Такой же сбой дал бы и настоящий XHR без бекенда: убеждаемся, что это подмена
    expect(transport).toHaveBeenCalledTimes(1)
    expect(error.code).toBe('ERR_NETWORK')
    expect(error.response).toBeUndefined()
  })

  it('logout пробрасывает ошибку выхода, а не глотает её', async () => {
    transport.mockImplementation(respond(500, { status_code: 500, detail: 'Internal Server Error' }))

    await expect(apiService.logout()).rejects.toMatchObject({ response: { status: 500 } })
  })

  // Адрес API смотрит не туда, и сервер отдал страницу фронта со статусом 200
  it('HTML вместо JSON отвергает понятной ошибкой с адресом ручки', async () => {
    transport.mockImplementation(respond(200, '<!DOCTYPE html><html></html>', 'text/html; charset=utf-8'))

    await expect(apiService.getEvents()).rejects.toThrow('API endpoint returned HTML instead of JSON: /events')
  })
})
