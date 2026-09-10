// Диалог слияния: предпросмотр считает сервер холостым прогоном той же ручки,
// поэтому проверяем не арифметику, а то, что диалог не даёт объединить вслепую

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElAutocomplete } from 'element-plus'
import UserMergeDialog from '@/components/users/UserMergeDialog.vue'
import PlayerSearchInput from '@/components/common/PlayerSearchInput.vue'
import { useAuthStore } from '@/stores/auth'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    mergeUsers: vi.fn()
  },
  initApiUrl: vi.fn()
}))

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const ADMIN_ID = 'admin-1'

const user = (index) => ({ id: `user-${index}`, nickname: `Игрок ${index}` })

const card = (index, overrides = {}) => ({
  id: `user-${index}`,
  nickname: `Игрок ${index}`,
  is_target: false,
  is_unregistered: false,
  has_telegram: false,
  played_games: 10 * index,
  mastered_games: index,
  roles: ['player'],
  ...overrides
})

const counters = (index, overrides = {}) => ({
  source_id: `user-${index}`,
  games: 0,
  mastered_games: 0,
  registrations: 0,
  invoices: 0,
  shifts: 0,
  tariffs: 0,
  avatars: 0,
  telegram: false,
  ...overrides
})

const report = (overrides = {}) => ({
  dry_run: true,
  merge_id: null,
  participants: [card(1, { is_target: true }), card(2)],
  result: card(1, { is_target: true, played_games: 30, mastered_games: 3 }),
  moved: [counters(2, { games: 20, registrations: 2 })],
  dropped: [counters(2, { tariffs: 1 })],
  roles_added: [],
  warnings: [],
  ...overrides
})

const httpError = (status, detail, extra = undefined) => ({
  response: { status, data: { status_code: status, detail, extra } }
})

const mountDialog = async (currentUserId = ADMIN_ID) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.user = { id: currentUserId, nickname: 'Админ', roles: ['admin'] }

  const wrapper = mount(UserMergeDialog, {
    props: { modelValue: true },
    global: { plugins: [pinia] }
  })
  await flushPromises()
  return wrapper
}

const button = (wrapper, label) => wrapper.findAll('button')
  .find(btn => btn.text() === label)

const confirmButton = (wrapper) => button(wrapper, 'Объединить')

// Подсказки живут в телепорте, поэтому дергаем поиск так же, как автокомплит
// Перед запросом поиск держит паузу настоящим таймером - её надо переждать
const SEARCH_PAUSE = 350

const startSearch = async (wrapper, found) => {
  apiService.getUsers.mockResolvedValue({ items: [found] })
  const autocomplete = wrapper.findComponent(PlayerSearchInput)
    .findComponent(ElAutocomplete)
  await autocomplete.setValue(found.nickname)
  autocomplete.props('fetchSuggestions')(found.nickname, () => {})
  return autocomplete
}

// Выбор из подсказок ответа сервера не ждет: админ кликает по тому, что видит
const addThroughSearch = async (wrapper, found) => {
  const autocomplete = await startSearch(wrapper, found)
  autocomplete.vm.$emit('select', found)
  await flushPromises()
}

const addParticipants = async (wrapper, users) => {
  for (const item of users) {
    wrapper.findComponent(PlayerSearchInput).vm.$emit('select', item)
    await flushPromises()
  }
}

const chooseTarget = async (wrapper, index) => {
  const radios = wrapper.findAll('.participant-card input[type="radio"]')
  await radios[index].setValue()
  await flushPromises()
}

describe('UserMergeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiService.getUsers.mockResolvedValue({ items: [] })
    apiService.mergeUsers.mockResolvedValue(report())
  })

  it('ищет участников общим поиском и не предлагает уже добавленных', async () => {
    const wrapper = await mountDialog()

    await startSearch(wrapper, user(1))
    await new Promise(resolve => setTimeout(resolve, SEARCH_PAUSE))
    await flushPromises()
    await addThroughSearch(wrapper, user(1))

    expect(apiService.getUsers).toHaveBeenCalledWith({ nickname: 'Игрок 1' })
    expect(wrapper.text()).toContain('Игрок 1')
    expect(wrapper.findComponent(PlayerSearchInput).props('excludeIds')).toEqual(['user-1'])
    // Новых людей заводят на своем экране: тут их только объединяют
    expect(wrapper.findComponent(PlayerSearchInput).props('allowCreate')).toBe(false)
  })

  it('пока основной не выбран, не ходит на сервер и не даёт объединить', async () => {
    const wrapper = await mountDialog()

    await addParticipants(wrapper, [user(1), user(2)])

    expect(apiService.mergeUsers).not.toHaveBeenCalled()
    expect(confirmButton(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Отметьте основного')
  })

  it('выбор основного показывает предпросмотр холостым прогоном', async () => {
    const wrapper = await mountDialog()
    await addParticipants(wrapper, [user(1), user(2)])

    await chooseTarget(wrapper, 0)

    expect(apiService.mergeUsers).toHaveBeenCalledTimes(1)
    expect(apiService.mergeUsers).toHaveBeenCalledWith(
      'user-1',
      { sourceIds: ['user-2'], telegramOwnerId: null },
      { dryRun: true }
    )
    // Боевой прогон предпросмотр не запускает
    expect(apiService.mergeUsers.mock.calls.every(call => call[2].dryRun)).toBe(true)
    expect(wrapper.text()).toContain('После слияния')
    expect(wrapper.text()).toContain('Останется')
    expect(wrapper.text()).toContain('Будет удалён')
    expect(confirmButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('показывает, что переедет к основному и что удалится как дубль', async () => {
    const wrapper = await mountDialog()
    await addParticipants(wrapper, [user(1), user(2)])

    await chooseTarget(wrapper, 0)

    const text = wrapper.text()
    expect(text).toContain('Переедет:')
    expect(text).toContain('Игры: 20')
    expect(text).toContain('Регистрации: 2')
    expect(text).toContain('Удалится как дубль:')
    expect(text).toContain('Тарифы: 1')
  })

  it('шестого участника не берет: столько сервер за раз не сливает', async () => {
    const wrapper = await mountDialog()

    await addParticipants(wrapper, [user(1), user(2), user(3), user(4), user(5)])

    expect(wrapper.findComponent(PlayerSearchInput).exists()).toBe(false)
    expect(wrapper.text()).toContain('Больше 5 участников')
  })

  it('общая игра: показывает оба места и не даёт объединить', async () => {
    const wrapper = await mountDialog()
    apiService.mergeUsers.mockRejectedValue(httpError(400, 'participants share a game', {
      games: [{
        game_id: 'game-1',
        label: 'Игра 3',
        created_at: '2026-02-01T18:00:00Z',
        seats: [
          { user_id: 'user-1', box_id: 4, role: 'don', extra_points: 0.3, penalty_points: null, comment: null },
          { user_id: 'user-2', box_id: 7, role: 'civilian', extra_points: null, penalty_points: null, comment: 'опоздал' }
        ]
      }]
    }))
    await addParticipants(wrapper, [user(1), user(2)])

    await chooseTarget(wrapper, 0)

    const text = wrapper.text()
    expect(text).toContain('Общие игры')
    expect(text).toContain('Игра 3')
    expect(text).toContain('Бокс 4')
    expect(text).toContain('Бокс 7')
    expect(text).toContain('Дон')
    expect(text).toContain('опоздал')
    expect(confirmButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('привязок telegram несколько: спрашивает владельца и повторяет предпросмотр', async () => {
    const wrapper = await mountDialog()
    apiService.mergeUsers.mockRejectedValueOnce(
      httpError(400, 'telegram owner required', { candidate_ids: ['user-1', 'user-2'] })
    )
    await addParticipants(wrapper, [user(1), user(2)])

    await chooseTarget(wrapper, 0)

    expect(wrapper.text()).toContain('Чей telegram оставить')
    expect(confirmButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.findAll('.telegram-owners input[type="radio"]')[1].setValue()
    await flushPromises()

    expect(apiService.mergeUsers).toHaveBeenLastCalledWith(
      'user-1',
      { sourceIds: ['user-2'], telegramOwnerId: 'user-2' },
      { dryRun: true }
    )
    // Выбор остается на экране: его должно быть видно перед подтверждением
    expect(wrapper.text()).toContain('Чей telegram оставить')
    expect(confirmButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('свою учётку в источники не пускает и запрос не шлёт', async () => {
    const wrapper = await mountDialog('user-2')
    await addParticipants(wrapper, [user(1), user(2)])

    await chooseTarget(wrapper, 0)

    expect(apiService.mergeUsers).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Свою учётку нельзя сделать источником')
    expect(confirmButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('подтверждение шлёт боевой прогон и отдаёт отчёт наверх', async () => {
    const wrapper = await mountDialog()
    await addParticipants(wrapper, [user(1), user(2)])
    await chooseTarget(wrapper, 0)
    apiService.mergeUsers.mockResolvedValue(report({ dry_run: false, merge_id: 'merge-1' }))

    await confirmButton(wrapper).trigger('click')
    await flushPromises()

    expect(apiService.mergeUsers).toHaveBeenLastCalledWith(
      'user-1',
      { sourceIds: ['user-2'], telegramOwnerId: null },
      { dryRun: false }
    )
    const merged = wrapper.emitted('merged')
    expect(merged).toHaveLength(1)
    expect(merged[0][0].report.merge_id).toBe('merge-1')
    expect(merged[0][0].sources).toEqual([{ id: 'user-2', nickname: 'Игрок 2' }])
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([false])
  })

  it('сорвавшееся слияние оставляет диалог открытым и показывает код ошибки', async () => {
    const wrapper = await mountDialog()
    await addParticipants(wrapper, [user(1), user(2)])
    await chooseTarget(wrapper, 0)
    apiService.mergeUsers.mockRejectedValue(httpError(500, 'Internal Server Error', {
      error_code: 'integrity_error',
      merge_id: 'merge-9'
    }))

    await confirmButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.text()).toContain('данные не изменились')
    expect(wrapper.text()).toContain('integrity_error')
    expect(wrapper.text()).toContain('merge-9')
  })

  it('обрыв на прокси не обещает, что данные целы', async () => {
    const wrapper = await mountDialog()
    await addParticipants(wrapper, [user(1), user(2)])
    await chooseTarget(wrapper, 0)
    // 504 отдаёт прокси: до ручки запрос мог дойти и закоммититься
    apiService.mergeUsers.mockRejectedValue(httpError(504, 'Gateway Timeout'))

    await confirmButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('данные не изменились')
    expect(wrapper.text()).toContain('историю слияний')
  })

  it('предупреждения отчёта показывает, а не прячет', async () => {
    const wrapper = await mountDialog()
    apiService.mergeUsers.mockResolvedValue(report({
      warnings: [{ code: 'telegram_unlinked', extra: { user_id: 'user-2' } }]
    }))
    await addParticipants(wrapper, [user(1), user(2)])

    await chooseTarget(wrapper, 0)

    expect(wrapper.text()).toContain('войти через этот телеграм больше нельзя')
  })
})
