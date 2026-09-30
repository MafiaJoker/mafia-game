// Список мероприятий: страницы, поиск и фильтры применяет сервер - экран через стор
// передаёт их в запрос и рисует ответ как есть. Строка ведёт на страницу мероприятия,
// правка и удаление - прямо из списка, на телефоне вместо таблицы карточки

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElDialog, ElMessage, ElMessageBox, ElTable } from 'element-plus'
import { Delete, Edit, View } from '@element-plus/icons-vue'
import EventsView from '@/views/EventsView.vue'
import PaginationFilter from '@/components/common/PaginationFilter.vue'
import CreateEventForm from '@/components/events/CreateEventForm.vue'
import EditEventDialog from '@/components/events/EditEventDialog.vue'
import { apiService } from '@/services/api'

const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('@/services/api', () => ({
  apiService: {
    getEvents: vi.fn(),
    getEventTypes: vi.fn(),
    deleteEvent: vi.fn()
  },
  initApiUrl: vi.fn()
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => router
}))

const DESKTOP_WIDTH = 1280
const MOBILE_WIDTH = 375

const setViewport = (width) => {
  window.innerWidth = width
}

const TOURNAMENT = { id: 'type-1', label: 'Турнир', rule_system: { slug: 'fiim', label: 'ФИИМ' } }
const GAME_NIGHT = { id: 'type-2', label: 'Игровой вечер', rule_system: { slug: 'fiim', label: 'ФИИМ' } }

// Мероприятие в списке как у сервера: статуса и числа игр в нём нет. Дата
// приходит без времени, и экран читает её как полночь UTC: западнее UTC он
// покажет день раньше, поэтому проверки даты рассчитаны на пояс клуба
const CUP = { id: 'event-1', label: 'Кубок осени', language: 'rus', start_date: '2026-09-15', event_type: TOURNAMENT }
const FRIDAY = { id: 'event-2', label: 'Пятничная мафия', language: 'rus', start_date: '2026-09-25', event_type: GAME_NIGHT }

// Страница списка от сервера: элементы и общее число
const page = (items, total = items.length) => ({ items, total })

// Так PaginationFilter сообщает о фильтрах, пока их не трогали
const NO_FILTERS = { search: '', status: '', type: '', dateRange: null, page: 1, pageSize: 20 }

// Фильтр, форма и окно правки проверяются по тому, что экран им передал и что
// от них получил. Настоящие селекты и календари фильтра стоили бы ~¼ с на тест
const mountView = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(EventsView, {
    global: {
      plugins: [pinia],
      stubs: { PaginationFilter: true, CreateEventForm: true, EditEventDialog: true }
    }
  })
  await flushPromises()
  return wrapper
}

const bodyRows = (wrapper) => wrapper.findAll('.el-table__body tr')

const button = (node, label) => node.findAll('button').find((btn) => btn.text() === label)

// В строке таблицы у кнопок нет подписей - их различает только иконка
const iconButton = (node, icon) => node.findAll('button').find((btn) => btn.findComponent(icon).exists())

const dialog = (wrapper, title) => wrapper.findAllComponents(ElDialog)
  .find((item) => item.props('title') === title)

const changeFilters = async (wrapper, filters) => {
  wrapper.findComponent(PaginationFilter).vm.$emit('filter-change', { ...NO_FILTERS, ...filters })
  await flushPromises()
}

// Обёртки прошлых тестов не должны жить дальше: ширина экрана у всех общая,
// и её смена перерисовывала бы каждую, растягивая тест на секунды
enableAutoUnmount(afterEach)

describe('EventsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setViewport(DESKTOP_WIDTH)
    apiService.getEvents.mockResolvedValue(page([CUP, FRIDAY]))
    apiService.getEventTypes.mockResolvedValue(page([TOURNAMENT, GAME_NIGHT]))
    apiService.deleteEvent.mockResolvedValue(undefined)
    vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
    vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setViewport(DESKTOP_WIDTH)
  })

  it('при открытии просит первую страницу по 20 без пустых фильтров и отдаёт типы в фильтр', async () => {
    const wrapper = await mountView()

    expect(apiService.getEvents).toHaveBeenCalledTimes(1)
    expect(apiService.getEvents).toHaveBeenCalledWith({ pageSize: 20, currentPage: 1 })
    expect(wrapper.findComponent(PaginationFilter).props('typeOptions')).toEqual([
      { value: 'type-1', label: 'Турнир' },
      { value: 'type-2', label: 'Игровой вечер' }
    ])
  })

  it('рисует мероприятия из ответа: название, тип с системой правил и дату', async () => {
    const wrapper = await mountView()

    const rows = bodyRows(wrapper)
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Кубок осени')
    expect(rows[0].text()).toContain('Турнир')
    expect(rows[0].text()).toContain('ФИИМ')
    expect(rows[0].text()).toContain('15.09.2026')
    expect(rows[1].text()).toContain('Пятничная мафия')
    expect(rows[1].text()).toContain('Игровой вечер')
  })

  it('клик по строке и кнопка просмотра открывают страницу мероприятия', async () => {
    const wrapper = await mountView()

    await bodyRows(wrapper)[1].trigger('click')
    expect(router.push).toHaveBeenLastCalledWith('/event/event-2')

    await iconButton(bodyRows(wrapper)[0], View).trigger('click')
    expect(router.push).toHaveBeenLastCalledWith('/event/event-1')
    // кнопка гасит клик по своей строке: переход один, а не два
    expect(router.push).toHaveBeenCalledTimes(2)
  })

  it('поиск и фильтры уходят в запрос, а список показывает ответ сервера как есть', async () => {
    const wrapper = await mountView()
    apiService.getEvents.mockResolvedValue(page([CUP]))

    await changeFilters(wrapper, {
      search: 'Кубок',
      status: 'active',
      type: 'type-1',
      dateRange: ['2026-09-01', '2026-09-30']
    })

    expect(apiService.getEvents).toHaveBeenLastCalledWith({
      pageSize: 20,
      currentPage: 1,
      searchString: 'Кубок',
      status: 'active',
      event_type_id: 'type-1',
      start_date_from: '2026-09-01',
      start_date_to: '2026-09-30'
    })
    const rows = bodyRows(wrapper)
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('Кубок осени')
  })

  it('пагинация: сколько всего - знает сервер, страница и её размер уходят в запрос', async () => {
    apiService.getEvents.mockResolvedValue(page([CUP, FRIDAY], 45))
    const wrapper = await mountView()

    // в ответе две строки, но мероприятий 45 - страницы считаются по серверу
    expect(wrapper.findComponent(PaginationFilter).props('totalItems')).toBe(45)

    await changeFilters(wrapper, { page: 3 })
    expect(apiService.getEvents).toHaveBeenLastCalledWith({ pageSize: 20, currentPage: 3 })

    await changeFilters(wrapper, { pageSize: 50 })
    expect(apiService.getEvents).toHaveBeenLastCalledWith({ pageSize: 50, currentPage: 1 })
  })

  it('«Создать мероприятие» открывает форму, а созданное закрывает её и обновляет список', async () => {
    const wrapper = await mountView()

    await button(wrapper, 'Создать мероприятие').trigger('click')
    await flushPromises()
    expect(dialog(wrapper, 'Создать мероприятие').props('modelValue')).toBe(true)

    apiService.getEvents.mockClear()
    wrapper.findComponent(CreateEventForm).vm.$emit('event-created', { id: 'event-3' })
    await flushPromises()

    expect(dialog(wrapper, 'Создать мероприятие').props('modelValue')).toBe(false)
    expect(apiService.getEvents).toHaveBeenCalledTimes(1)
  })

  it('правка открывает окно с этим мероприятием, не уходя со списка, а сохранение обновляет список', async () => {
    const wrapper = await mountView()

    await iconButton(bodyRows(wrapper)[1], Edit).trigger('click')
    await flushPromises()

    const editDialog = wrapper.findComponent(EditEventDialog)
    expect(editDialog.props('visible')).toBe(true)
    expect(editDialog.props('event')).toMatchObject({ id: 'event-2', label: 'Пятничная мафия' })
    expect(router.push).not.toHaveBeenCalled()

    apiService.getEvents.mockClear()
    editDialog.vm.$emit('event-updated', { ...FRIDAY, label: 'Пятничная мафия #2' })
    await flushPromises()

    expect(editDialog.props('visible')).toBe(false)
    expect(apiService.getEvents).toHaveBeenCalledTimes(1)
  })

  it('удаляет только после подтверждения и затем перечитывает список', async () => {
    const confirm = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValueOnce('cancel')
    const wrapper = await mountView()

    await iconButton(bodyRows(wrapper)[0], Delete).trigger('click')
    await flushPromises()

    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('Кубок осени'), 'Подтверждение', expect.any(Object)
    )
    // отказ - не ошибка: ничего не удалено и ругаться не на что
    expect(apiService.deleteEvent).not.toHaveBeenCalled()
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()

    confirm.mockResolvedValueOnce('confirm')
    apiService.getEvents.mockResolvedValue(page([FRIDAY]))
    await iconButton(bodyRows(wrapper)[0], Delete).trigger('click')
    await flushPromises()

    expect(apiService.deleteEvent).toHaveBeenCalledWith('event-1')
    expect(ElMessage.success).toHaveBeenCalledWith('Мероприятие удалено')
    const rows = bodyRows(wrapper)
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('Пятничная мафия')
  })

  it('сбой загрузки не выдаёт прежний список за результат нового поиска', async () => {
    const wrapper = await mountView()
    apiService.getEvents.mockRejectedValue(new Error('Network Error'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await changeFilters(wrapper, { search: 'Кубок' })

    expect(bodyRows(wrapper)).toHaveLength(0)
    expect(wrapper.findComponent(PaginationFilter).props('totalItems')).toBe(0)
  })

  it('на телефоне вместо таблицы карточки: карточка ведёт на мероприятие, «Изменить» - в правку', async () => {
    setViewport(MOBILE_WIDTH)
    const wrapper = await mountView()

    expect(wrapper.findComponent(ElTable).exists()).toBe(false)
    const cards = wrapper.findAll('.event-card')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('Кубок осени')
    expect(cards[0].text()).toContain('Турнир')
    expect(cards[0].text()).toContain('15.09.2026')

    await cards[1].trigger('click')
    expect(router.push).toHaveBeenCalledWith('/event/event-2')

    router.push.mockClear()
    await button(cards[0], 'Изменить').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(EditEventDialog).props()).toMatchObject({ visible: true, event: { id: 'event-1' } })
    expect(router.push).not.toHaveBeenCalled()
  })
})
