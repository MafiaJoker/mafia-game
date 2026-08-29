// Тесты общей строки поиска игрока: одна точка на рассадку игры и на
// генерацию рассадки мероприятия

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ElAutocomplete } from 'element-plus'
import PlayerSearchInput from '@/components/common/PlayerSearchInput.vue'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getUsers: vi.fn(),
    createUser: vi.fn()
  }
}))

const user = (index) => ({ id: `user-${index}`, nickname: `Игрок ${index}` })

const mountInput = (props = {}) => {
  const wrapper = mount(PlayerSearchInput, {
    props: {
      modelValue: '',
      ...props,
      'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value })
    }
  })
  return wrapper
}

const autocomplete = (wrapper) => wrapper.findComponent(ElAutocomplete)

// Автокомплит зовет fetch-suggestions сам, но подсказки живут в телепорте,
// поэтому дергаем его напрямую и ловим то, что он получил бы
const search = async (wrapper, text) => {
  await autocomplete(wrapper).setValue(text)
  const shown = []
  await autocomplete(wrapper).props('fetchSuggestions')(text, (items) => shown.push(...items))
  await flushPromises()
  return shown
}

const createButton = (wrapper) => wrapper.findAll('button')
  .find(btn => btn.text() === 'Создать')

describe('PlayerSearchInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiService.getUsers.mockResolvedValue({ items: [user(1), user(2)] })
  })

  it('ищет по нику и прячет уже занятых игроков', async () => {
    const wrapper = mountInput({ excludeIds: ['user-2'] })

    const shown = await search(wrapper, 'Игрок')

    expect(apiService.getUsers).toHaveBeenCalledWith({ nickname: 'Игрок' })
    expect(shown.map(item => item.nickname)).toEqual(['Игрок 1'])
  })

  it('ищет только среди игроков мероприятия, когда задано', async () => {
    const wrapper = mountInput({ eventId: 'event-1' })

    await search(wrapper, 'Игрок')

    expect(apiService.getUsers).toHaveBeenCalledWith({
      nickname: 'Игрок',
      event_id: 'event-1'
    })
  })

  it('отдает наверх выбранного из подсказок игрока', async () => {
    const wrapper = mountInput()

    await search(wrapper, 'Игрок 1')
    autocomplete(wrapper).vm.$emit('select', { id: 'user-1', nickname: 'Игрок 1' })
    await flushPromises()

    expect(wrapper.emitted('select')).toEqual([[{ id: 'user-1', nickname: 'Игрок 1' }]])
    expect(createButton(wrapper)).toBeUndefined()
  })

  it('заводит игрока, которого не нашли', async () => {
    const wrapper = mountInput()
    apiService.getUsers.mockResolvedValue({ items: [] })
    apiService.createUser.mockResolvedValue({ id: 'user-new' })

    await search(wrapper, 'Новичок')
    await createButton(wrapper).trigger('click')
    await flushPromises()

    expect(apiService.createUser).toHaveBeenCalledWith({ nickname: 'Новичок' })
    expect(wrapper.emitted('select')).toEqual([[{ id: 'user-new', nickname: 'Новичок' }]])
  })

  it('вместо дубля берет тезку из подсказок', async () => {
    const wrapper = mountInput()

    await search(wrapper, 'Игрок 1')
    await createButton(wrapper).trigger('click')
    await flushPromises()

    expect(apiService.createUser).not.toHaveBeenCalled()
    expect(wrapper.emitted('select')).toEqual([[{ id: 'user-1', nickname: 'Игрок 1' }]])
  })

  it('заводит игрока по Enter, когда подсказки не подошли', async () => {
    const wrapper = mountInput()
    apiService.getUsers.mockResolvedValue({ items: [] })
    apiService.createUser.mockResolvedValue({ id: 'user-new' })

    await search(wrapper, 'Новичок')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(apiService.createUser).toHaveBeenCalledWith({ nickname: 'Новичок' })
  })

  it('на Enter после стрелок выбор остается за автокомплитом', async () => {
    const wrapper = mountInput()

    await search(wrapper, 'Игрок')
    await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(apiService.createUser).not.toHaveBeenCalled()
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('рассказывает наверх о неудачном создании', async () => {
    const wrapper = mountInput()
    apiService.getUsers.mockResolvedValue({ items: [] })
    apiService.createUser.mockRejectedValue(new Error('нет связи'))

    await search(wrapper, 'Новичок')
    await createButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.emitted('error')).toEqual([['Не удалось создать игрока. Попробуйте снова']])
    // Кнопка на месте: попытку можно повторить
    expect(createButton(wrapper)).toBeDefined()
  })

  it('очищенное поле забывает выбранного игрока', async () => {
    const wrapper = mountInput()

    await search(wrapper, 'Игрок 1')
    autocomplete(wrapper).vm.$emit('select', { id: 'user-1', nickname: 'Игрок 1' })
    await flushPromises()
    autocomplete(wrapper).vm.$emit('clear')
    await wrapper.setProps({ modelValue: '' })

    expect(wrapper.emitted('clear')).toHaveLength(1)

    // Тезку теперь снова можно завести: старый выбор не мешает
    apiService.getUsers.mockResolvedValue({ items: [] })
    await search(wrapper, 'Игрок 1')

    expect(createButton(wrapper)).toBeDefined()
  })
})
