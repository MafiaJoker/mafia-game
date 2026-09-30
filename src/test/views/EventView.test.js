// Страница мероприятия: грузит его по id из адреса и раскладывает по вкладкам,
// столы с играми берёт из ответа сервера. Правку отправляет и перечитывает
// мероприятие, игру открывает по клику; не загрузилось - тост и назад к списку

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { ElMessage } from 'element-plus'
import EventView from '@/views/EventView.vue'
import EventFinances from '@/components/events/EventFinances.vue'
import EventPlayers from '@/components/events/EventPlayers.vue'
import EventResults from '@/components/events/EventResults.vue'
import { useAuthStore } from '@/stores/auth'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getEventTypes: vi.fn(),
    getEvent: vi.fn(),
    updateEvent: vi.fn(),
    createGame: vi.fn()
  },
  initApiUrl: vi.fn()
}))

const { route, router } = vi.hoisted(() => ({
  route: { params: {} },
  router: { push: vi.fn(), replace: vi.fn() }
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => route,
  useRouter: () => router
}))

// Стор авторизации тянет за собой настоящий роутер со всеми экранами
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const DESKTOP_WIDTH = 1280
const MOBILE_WIDTH = 375

const setViewport = (width) => {
  window.innerWidth = width
}

const EVENT_ID = '5b7c0a52-3f0e-4a8e-9d51-2c6f1e0b7a11'
const JUDGE = { id: 'judge-1', nickname: 'Судья Анна' }

const eventType = () => ({
  id: 'type-1',
  label: 'Турнир',
  color: '8e44ad',
  rule_system: { slug: 'fiim', label: 'ФИИМ', description: 'Правила ФИИМ' }
})

const game = (id, label) => ({
  id,
  label,
  started_at: '2026-10-05T16:00:00Z',
  result: 'finished_with_scores',
  game_master: JUDGE,
  stage_id: null
})

// Ответ GET /events/{id}: столы сервер собирает из игр,
// и игры первого стола приходят не по порядку
const eventDetail = () => ({
  id: EVENT_ID,
  label: 'Кубок осени',
  description: 'Финал сезона: десять игр по жребию',
  start_date: '2026-10-05',
  language: 'rus',
  table_name_template: 'Стол {}',
  event_type: eventType(),
  tables: [
    { table_name: 'Стол 1', game_masters: [JUDGE], games: [game('game-10', 'Игра 10'), game('game-9', 'Игра 9')] },
    { table_name: 'Стол 2', game_masters: [JUDGE], games: [game('game-1', 'Игра 1')] }
  ]
})

// Markdown-редактор в приложении регистрирует main.js, тесту хватит текста
const MdPreview = defineComponent({
  name: 'MdPreview',
  props: { modelValue: { type: String, default: '' } },
  setup: (props) => () => h('div', props.modelValue)
})

const MdEditor = defineComponent({
  name: 'MdEditor',
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  setup: (props) => () => h('textarea', { value: props.modelValue })
})

// Вкладки финансов, игроков и результатов и диалог рассадки проверяют свои тесты.
// Списки и календарь правки тесты не трогают, а в happy-dom каждый вход
// в правку с ними рисуется по полсекунды
const mountEvent = async ({ roles = ['game_master'] } = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = { id: 'user-1', nickname: 'Барон', roles }

  const wrapper = mount(EventView, {
    global: {
      plugins: [pinia],
      // «Назад» в шаблоне зовёт $router, а не useRouter
      mocks: { $router: router },
      components: { MdPreview, MdEditor },
      stubs: {
        EventFinances: true,
        EventPlayers: true,
        EventResults: true,
        GenerateSeatingDialog: true,
        ElSelect: true,
        ElDatePicker: true
      }
    }
  })
  await flushPromises()
  return wrapper
}

const button = (wrapper, label) => wrapper.findAll('button').find((btn) => btn.text() === label)

const tab = (wrapper, label) => wrapper.findAll('.el-tabs__item').find((item) => item.text() === label)

const formItem = (wrapper, label) => wrapper.findAll('.el-form-item')
  .find((item) => item.find('.el-form-item__label').text() === label)

const tableItem = (wrapper, name) => wrapper.findAll('.table-item')
  .find((item) => item.find('.table-name').text() === name)

// Имя стола вместе с его меткой, как их читает судья
const tableNames = (wrapper) => wrapper.findAll('.table-name')
  .map((name) => name.text().replace(/\s+/g, ' '))

const gameNames = (wrapper) => wrapper.findAll('.game-name').map((name) => name.text())

// Обёртки прошлых тестов не должны жить дальше: ширина экрана у всех общая,
// и её смена перерисовывала бы каждую, растягивая тест на секунды
enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  setViewport(DESKTOP_WIDTH)
  route.params = { id: EVENT_ID }
  apiService.getEventTypes.mockResolvedValue([eventType()])
  // Каждый запрос - свежий ответ: экран сортирует игры прямо в нём
  apiService.getEvent.mockImplementation(async () => eventDetail())
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  // Экран на каждой загрузке выводит мероприятие в консоль: в выводе тестов это только шум
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  setViewport(DESKTOP_WIDTH)
})

describe('EventView: загрузка и вкладки', () => {
  it('грузит мероприятие по id из адреса и показывает название, категорию и описание', async () => {
    const wrapper = await mountEvent()

    // id - UUID, и уходит он как есть, без попытки сделать из него число
    expect(apiService.getEvent).toHaveBeenCalledWith(EVENT_ID)
    expect(wrapper.find('h1').text()).toBe('Кубок осени')
    const tags = wrapper.findAll('.el-tag__content').map((tag) => tag.text())
    expect(tags).toContain('Турнир')
    expect(tags).toContain('ФИИМ')
    expect(wrapper.findComponent(MdPreview).props('modelValue')).toBe('Финал сезона: десять игр по жребию')
  })

  it('пять вкладок - и у игрока без прав судьи; открыта «Информация»', async () => {
    const wrapper = await mountEvent({ roles: ['player'] })

    expect(wrapper.findAll('.el-tabs__item').map((item) => item.text()))
      .toEqual(['Информация', 'Столы', 'Финансы', 'Игроки', 'Результаты'])
    expect(tab(wrapper, 'Информация').classes()).toContain('is-active')
    for (const child of [EventFinances, EventPlayers, EventResults]) {
      expect(wrapper.findComponent(child).props('event').id).toBe(EVENT_ID)
    }
  })

  it('ссылки на OBS - только судье: на вечер и на каждую игру стола', async () => {
    const obsButtons = (wrapper) => wrapper.findAll('button')
      .map((btn) => btn.text())
      .filter((text) => text.includes('OBS'))

    const player = await mountEvent({ roles: ['player'] })
    expect(obsButtons(player)).toEqual([])

    const judge = await mountEvent({ roles: ['game_master'] })
    expect(obsButtons(judge)).toEqual(['Ссылка на OBS', 'Копировать ссылку на OBS', 'Копировать ссылку на OBS'])
  })

  it('мероприятие не загрузилось - говорит об этом и возвращает к списку', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    apiService.getEvent.mockRejectedValue(new Error('Request failed with status code 404'))

    await mountEvent()

    expect(ElMessage.error).toHaveBeenCalledWith('Ошибка загрузки мероприятия: Request failed with status code 404')
    expect(router.push).toHaveBeenCalledWith('/')
  })
})

describe('EventView: правка мероприятия', () => {
  it('отправляет новые название и описание и перечитывает мероприятие', async () => {
    // Экран ждёт мероприятие в ответе. Бек на PATCH /events/{id} отвечает 204
    // без тела, и на нём экран сейчас показывает ошибку, хотя правка сохранена.
    // Форма живая и после сохранения перезаполняется: запоминаем, что ушло
    let sent
    apiService.updateEvent.mockImplementation(async (eventId, data) => {
      sent = { ...data }
      return { ...eventDetail(), ...data }
    })
    const wrapper = await mountEvent()

    await button(wrapper, 'Редактировать').trigger('click')
    const labelInput = formItem(wrapper, 'Название').find('input')
    expect(labelInput.element.value).toBe('Кубок осени')
    await labelInput.setValue('Кубок осени. Финал')
    wrapper.findComponent(MdEditor).vm.$emit('update:modelValue', 'Десять игр, судья Анна')
    apiService.getEvent.mockImplementation(async () => ({
      ...eventDetail(),
      label: 'Кубок осени. Финал',
      description: 'Десять игр, судья Анна'
    }))
    await button(wrapper, 'Сохранить').trigger('click')
    await flushPromises()

    expect(apiService.updateEvent).toHaveBeenCalledTimes(1)
    expect(apiService.updateEvent.mock.calls[0][0]).toBe(EVENT_ID)
    // Категорию сервер отдаёт объектом, а принимает её id
    expect(sent).toMatchObject({
      label: 'Кубок осени. Финал',
      description: 'Десять игр, судья Анна',
      event_type_id: 'type-1'
    })
    expect(apiService.getEvent).toHaveBeenCalledTimes(2)
    expect(button(wrapper, 'Редактировать')).toBeDefined()
    expect(wrapper.find('h1').text()).toBe('Кубок осени. Финал')
  })

  it('отмена ничего не отправляет и откатывает черновик', async () => {
    const wrapper = await mountEvent()

    await button(wrapper, 'Редактировать').trigger('click')
    await formItem(wrapper, 'Название').find('input').setValue('Черновик')
    wrapper.findComponent(MdEditor).vm.$emit('update:modelValue', 'Черновик описания')
    await button(wrapper, 'Отмена').trigger('click')

    expect(apiService.updateEvent).not.toHaveBeenCalled()
    expect(button(wrapper, 'Редактировать')).toBeDefined()
    expect(wrapper.find('h1').text()).toBe('Кубок осени')
    // Описание в просмотре читает форму: без отката там остался бы черновик
    expect(wrapper.findComponent(MdPreview).props('modelValue')).toBe('Финал сезона: десять игр по жребию')
  })
})

describe('EventView: столы и игры', () => {
  it('показывает столы и игры выбранного стола по номеру, клик по игре открывает её', async () => {
    const wrapper = await mountEvent()

    await tab(wrapper, 'Столы').trigger('click')
    expect(tab(wrapper, 'Столы').classes()).toContain('is-active')
    expect(tableNames(wrapper)).toEqual(['Стол 1', 'Стол 2'])
    // Первый стол выбран сразу; «Игра 10» идёт после «Игра 9», а не как строка
    expect(gameNames(wrapper)).toEqual(['Игра 9', 'Игра 10'])

    await tableItem(wrapper, 'Стол 2').trigger('click')
    expect(gameNames(wrapper)).toEqual(['Игра 1'])

    await wrapper.find('.game-item').trigger('click')
    expect(router.push).toHaveBeenCalledWith('/game/game-1')
  })

  it('«Добавить стол» заводит временный стол, а «Новая игра» создаёт на нём первую игру', async () => {
    const wrapper = await mountEvent()
    await tab(wrapper, 'Столы').trigger('click')

    await button(wrapper, 'Добавить стол').trigger('click')
    // На сервере стола нет, пока на нём нет игр
    expect(tableNames(wrapper)).toEqual(['Стол 1', 'Стол 2', 'Стол 3 Временный'])

    apiService.createGame.mockResolvedValue({ id: 'game-new' })
    apiService.getEvent.mockImplementation(async () => {
      const saved = eventDetail()
      saved.tables.push({ table_name: 'Стол 3', game_masters: [JUDGE], games: [game('game-new', 'Игра #1')] })
      return saved
    })
    await button(wrapper, 'Новая игра').trigger('click')
    await flushPromises()

    expect(apiService.createGame).toHaveBeenCalledWith({ label: 'Игра #1', event_id: EVENT_ID, table_id: 3 })
    expect(tableNames(wrapper)).toEqual(['Стол 1', 'Стол 2', 'Стол 3'])
    expect(gameNames(wrapper)).toEqual(['Игра #1'])
  })
})

describe('EventView: навигация', () => {
  it('«Назад к мероприятиям» ведёт на главную', async () => {
    const wrapper = await mountEvent()

    await button(wrapper, 'Назад к мероприятиям').trigger('click')

    expect(router.push).toHaveBeenCalledWith('/')
  })

  it('на телефоне «назад» - иконка с подписью для экранного диктора, у столов - короткие кнопки', async () => {
    setViewport(MOBILE_WIDTH)
    const wrapper = await mountEvent()

    const back = wrapper.find('button[aria-label="Назад к мероприятиям"]')
    expect(back.text()).toBe('')
    await back.trigger('click')
    expect(router.push).toHaveBeenCalledWith('/')

    expect(button(wrapper, 'Рассадка')).toBeDefined()
    expect(button(wrapper, 'Копировать текст')).toBeDefined()
    expect(button(wrapper, 'Сгенерировать рассадку')).toBeUndefined()
  })
})
