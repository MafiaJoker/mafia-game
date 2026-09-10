// История слияний: своих фильтров у ручки нет, поэтому проверяем то, что она
// умеет - страницы и сортировку - и что снимок ников виден после удаления

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ElTable } from 'element-plus'
import UserMergeHistory from '@/components/users/UserMergeHistory.vue'
import PaginationFilter from '@/components/common/PaginationFilter.vue'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: { getUserMerges: vi.fn() },
  initApiUrl: vi.fn()
}))

const merge = (index, overrides = {}) => ({
  id: `merge-${index}`,
  status: 'done',
  created_at: '2026-03-01T10:00:00.617Z',
  finished_at: '2026-03-01T10:00:00.692Z',
  target: { id: 'user-1', nickname: 'Батон' },
  sources: [{ id: 'user-2', nickname: 'Батон-дубль' }],
  created_by: { id: 'admin-1', nickname: 'Админ' },
  error_code: null,
  report: null,
  ...overrides
})

const page = (items, total = items.length) => ({ items, limit: 20, offset: 0, total })

const DESKTOP_WIDTH = 1280
const MOBILE_WIDTH = 375

const setViewport = (width) => {
  window.innerWidth = width
}

const mountHistory = async () => {
  const wrapper = mount(UserMergeHistory)
  await flushPromises()
  return wrapper
}

describe('UserMergeHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setViewport(DESKTOP_WIDTH)
    apiService.getUserMerges.mockResolvedValue(page([merge(1)], 42))
  })

  afterEach(() => {
    setViewport(DESKTOP_WIDTH)
  })

  it('грузит первую страницу тем порядком, которым отдаёт ручка', async () => {
    await mountHistory()

    expect(apiService.getUserMerges).toHaveBeenCalledWith({
      currentPage: 1,
      pageSize: 20,
      orderBy: 'created_at',
      sortOrder: 'desc'
    })
  })

  it('показывает, кто кого и в кого слил', async () => {
    const wrapper = await mountHistory()

    const text = wrapper.text()
    expect(text).toContain('Админ')
    expect(text).toContain('Батон-дубль')
    expect(text).toContain('Батон')
    expect(text).toContain('Выполнено')
  })

  it('время показывает с миллисекундами: слияние почти мгновенное', async () => {
    const wrapper = await mountHistory()

    expect(wrapper.text()).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}\.\d{3}/)
  })

  it('строку без снимка участников показывает прочерками, а не падением', async () => {
    // Снимок слияние дописывает в конце: у сорвавшегося его может не быть
    apiService.getUserMerges.mockResolvedValue(page([
      merge(1, { status: 'failed', target: null, sources: null, created_by: null })
    ], 1))

    const wrapper = await mountHistory()

    expect(wrapper.findComponent(ElTable).exists()).toBe(true)
    expect(wrapper.text()).toContain('Ошибка')
    expect(wrapper.text()).toContain('—')
  })

  it('строке с ошибкой ставит свой статус', async () => {
    apiService.getUserMerges.mockResolvedValue(page([
      merge(1, { status: 'failed', error_code: 'integrity_error' })
    ]))

    const wrapper = await mountHistory()

    expect(wrapper.text()).toContain('Ошибка')
  })

  it('искать по истории ручка не умеет - мертвого поля поиска нет', async () => {
    const wrapper = await mountHistory()

    expect(wrapper.findComponent(PaginationFilter).props('showSearch')).toBe(false)
    expect(wrapper.find('.filter-row').exists()).toBe(false)
  })

  it('сортировку из шапки таблицы отдаёт серверу', async () => {
    const wrapper = await mountHistory()

    wrapper.findComponent(ElTable).vm.$emit('sort-change', {
      prop: 'target_nickname',
      order: 'ascending'
    })
    await flushPromises()

    expect(apiService.getUserMerges).toHaveBeenLastCalledWith({
      currentPage: 1,
      pageSize: 20,
      orderBy: 'target_nickname',
      sortOrder: 'asc'
    })
  })

  it('снятая сортировка возвращает порядок ручки по умолчанию', async () => {
    const wrapper = await mountHistory()

    wrapper.findComponent(ElTable).vm.$emit('sort-change', { prop: 'status', order: null })
    await flushPromises()

    expect(apiService.getUserMerges).toHaveBeenLastCalledWith(
      expect.objectContaining({ orderBy: 'created_at', sortOrder: 'desc' })
    )
  })

  it('страницу и её размер листает сервер', async () => {
    const wrapper = await mountHistory()

    wrapper.findComponent(PaginationFilter).vm.$emit('filter-change', {
      search: '', status: '', type: '', dateRange: null, page: 3, pageSize: 50
    })
    await flushPromises()

    expect(apiService.getUserMerges).toHaveBeenLastCalledWith({
      currentPage: 3,
      pageSize: 50,
      orderBy: 'created_at',
      sortOrder: 'desc'
    })
  })

  it('разворачивает отчёт слияния', async () => {
    apiService.getUserMerges.mockResolvedValue(page([
      merge(1, { status: 'failed', error_code: 'unexpected', report: 'Traceback: всё плохо' })
    ]))
    const wrapper = await mountHistory()

    await wrapper.find('.el-table__expand-icon').trigger('click')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Traceback: всё плохо')
    expect(text).toContain('unexpected')
    // Ники удалённых источников - снимок: показываем текстом вместе с id
    expect(text).toContain('user-2')
  })

  it('на телефоне вместо таблицы список карточек и своя сортировка', async () => {
    setViewport(MOBILE_WIDTH)

    const wrapper = await mountHistory()

    expect(wrapper.findComponent(ElTable).exists()).toBe(false)
    expect(wrapper.find('.merge-list').exists()).toBe(true)

    await wrapper.find('.sort-row button').trigger('click')
    await flushPromises()

    expect(apiService.getUserMerges).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortOrder: 'asc' })
    )
  })

  it('пустую историю показывает заглушкой, а не пустым экраном', async () => {
    apiService.getUserMerges.mockResolvedValue(page([], 0))

    const wrapper = await mountHistory()

    expect(wrapper.text()).toContain('Слияний ещё не было')
  })
})
