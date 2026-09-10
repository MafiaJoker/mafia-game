// Тесты общей строки поиска игрока: одна точка на рассадку игры и на
// генерацию рассадки мероприятия

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
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

// Паузу перед запросом компонент держит сам, в тестах она только мешает
const mountInput = (props = {}) => {
  const wrapper = mount(PlayerSearchInput, {
    props: {
      modelValue: '',
      debounce: 0,
      ...props,
      'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value })
    }
  })
  return wrapper
}

const autocomplete = (wrapper) => wrapper.findComponent(ElAutocomplete)

const fetchSuggestions = (wrapper) => autocomplete(wrapper).props('fetchSuggestions')

const nicknames = (items) => items.map(item => item.nickname)

// Паузу перед запросом компонент держит настоящим таймером, а flushPromises
// внутри работает через setImmediate и умеет его обогнать. Свой таймер той же
// длины встаёт в очередь следом за компонентским - значит тот уже сработал
const settle = async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
  await flushPromises()
}

// Автокомплит зовет fetch-suggestions сам, но подсказки живут в телепорте,
// поэтому дергаем его напрямую и ловим то, что он получил бы
const search = async (wrapper, text) => {
  await autocomplete(wrapper).setValue(text)
  const shown = []
  fetchSuggestions(wrapper)(text, (items) => shown.push(...items))
  await settle()
  return shown
}

const createButton = (wrapper) => wrapper.findAll('button')
  .find(btn => btn.text() === 'Создать')

// Незакрытая обертка уносит в следующий тест свой отложенный запрос
enableAutoUnmount(afterEach)

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

  it('отвечает сразу, а не после сервера: пустой список не мигает попапом', async () => {
    const wrapper = mountInput()
    apiService.getUsers.mockResolvedValue({ items: [] })

    const calls = []
    fetchSuggestions(wrapper)('Никого', (items) => calls.push(items))

    // Автокомплит держит список открытым, пока идет загрузка, поэтому первый
    // ответ уходит синхронно - показывать пока нечего, и открывать нечего
    expect(calls).toEqual([[]])

    await settle()
    expect(calls).toEqual([[], []])
  })

  it('пока ищет заново, показывает прошлые находки, подходящие под набранное', async () => {
    const wrapper = mountInput()
    await search(wrapper, 'Игрок')

    const calls = []
    fetchSuggestions(wrapper)('Игрок 1', (items) => calls.push(nicknames(items)))

    // Список не закрывается и не мигает, но «Игрок 2» из него ушел сразу:
    // выбрать чужого, пока летит запрос, нельзя
    expect(calls[0]).toEqual(['Игрок 1'])
    await settle()
  })

  it('на другой поиск подсказки прошлого не показывает вовсе', async () => {
    const wrapper = mountInput()
    await search(wrapper, 'Игрок')
    apiService.getUsers.mockResolvedValue({ items: [{ id: 'user-9', nickname: 'Петя' }] })

    const calls = []
    fetchSuggestions(wrapper)('Петя', (items) => calls.push(nicknames(items)))

    expect(calls[0]).toEqual([])
    await settle()
    expect(calls.at(-1)).toEqual(['Петя'])
  })

  it('опоздавший ответ не перезатирает свежий список', async () => {
    const wrapper = mountInput()
    let answerFirst
    apiService.getUsers
      .mockImplementationOnce(() => new Promise((resolve) => {
        answerFirst = () => resolve({ items: [user(1)] })
      }))
      .mockResolvedValueOnce({ items: [user(2)] })

    const calls = []
    const collect = (items) => calls.push(nicknames(items))

    fetchSuggestions(wrapper)('Первый', collect)
    await settle()
    fetchSuggestions(wrapper)('Второй', collect)
    await settle()
    answerFirst()
    await settle()

    expect(apiService.getUsers).toHaveBeenCalledTimes(2)
    expect(calls.at(-1)).toEqual(['Игрок 2'])
  })

  it('печать не сыплет запросами: уходит только последний набранный текст', async () => {
    const wrapper = mountInput()
    const ignore = () => {}

    fetchSuggestions(wrapper)('Иг', ignore)
    fetchSuggestions(wrapper)('Игрок', ignore)
    await settle()

    expect(apiService.getUsers).toHaveBeenCalledTimes(1)
    expect(apiService.getUsers).toHaveBeenCalledWith({ nickname: 'Игрок' })
  })

  it('к подсказке цепляет аватарку игрока: мирный житель в приоритете', async () => {
    apiService.getUsers.mockResolvedValue({
      items: [
        {
          ...user(1),
          avatars: [
            { role: 'don', avatar_url: 'https://cdn/don.webp' },
            { role: 'civilian', avatar_url: 'https://cdn/civilian.webp' }
          ]
        },
        { ...user(2), avatars: [] }
      ]
    })
    const wrapper = mountInput()

    const shown = await search(wrapper, 'Игрок')

    expect(shown[0].avatar).toBe('https://cdn/civilian.webp')
    expect(shown[1].avatar).toBeNull()
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

  it('по Enter выбирает тезку из подсказок', async () => {
    const wrapper = mountInput()

    await search(wrapper, 'Игрок 1')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(wrapper.emitted('select')).toEqual([[{ id: 'user-1', nickname: 'Игрок 1' }]])
  })

  it('по Enter нового игрока не заводит: только кнопкой', async () => {
    const wrapper = mountInput()
    apiService.getUsers.mockResolvedValue({ items: [] })

    await search(wrapper, 'Новичок')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(apiService.createUser).not.toHaveBeenCalled()
    expect(wrapper.emitted('select')).toBeUndefined()
    // Кнопка на месте: завести игрока по-прежнему можно осознанным кликом
    expect(createButton(wrapper)).toBeDefined()
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
