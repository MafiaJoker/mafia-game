// Тесты диалога рассадки: считает рассадку сервер, диалог ее показывает
// и создает игры тем же сидом, что судья увидел в превью

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ElAutocomplete, ElCheckbox, ElInputNumber } from 'element-plus'
import GenerateSeatingDialog from '@/components/events/GenerateSeatingDialog.vue'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    generateSeating: vi.fn()
  }
}))

const EVENT_ID = 'event-1'

const user = (index) => ({ id: `user-${index}`, nickname: `Игрок ${index}` })

// Рассадка на один стол: два места, чтобы ответ читался глазами
const seatingResponse = (seed = 'сид-сервера') => ({
  seed,
  games: [
    {
      id: null,
      label: 'Игра 1',
      table_id: 1,
      stage_id: null,
      seats: [
        { box_id: 1, user_id: 'user-1', nickname: 'Игрок 1' },
        { box_id: 2, user_id: 'user-2', nickname: 'Игрок 2' }
      ]
    },
    {
      id: null,
      label: 'Игра 2',
      table_id: 1,
      stage_id: null,
      seats: [
        { box_id: 1, user_id: 'user-2', nickname: 'Игрок 2' },
        { box_id: 2, user_id: 'user-1', nickname: 'Игрок 1' }
      ]
    }
  ]
})

const mountDialog = async () => {
  const wrapper = mount(GenerateSeatingDialog, {
    props: {
      modelValue: true,
      eventId: EVENT_ID,
      tableNameTemplate: 'Стол {}'
    }
  })
  await flushPromises()
  return wrapper
}

const button = (wrapper, label) => wrapper.findAll('button')
  .find(btn => btn.text() === label)

const autocomplete = (wrapper) => wrapper.findComponent(ElAutocomplete)

const seedInput = (wrapper) => wrapper.find('.seed-input input')

// Подсказки живут в телепорте, поэтому дергаем fetch-suggestions напрямую,
// как это делает автокомплит при вводе
const searchPlayers = async (wrapper, query, found) => {
  apiService.getUsers.mockResolvedValue({ items: found })
  await autocomplete(wrapper).setValue(query)
  await autocomplete(wrapper).props('fetchSuggestions')(query, () => {})
  await flushPromises()
}

const addFoundPlayer = async (wrapper, player) => {
  await searchPlayers(wrapper, player.nickname, [player])
  autocomplete(wrapper).vm.$emit('select', player)
  await flushPromises()
}

const playerRows = (wrapper) => wrapper.findAll('.player-row')

const errorText = (wrapper) => wrapper.find('.el-alert__title').exists()
  ? wrapper.find('.el-alert__title').text()
  : ''

describe('GenerateSeatingDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiService.getUsers.mockResolvedValue({ items: [] })
    apiService.generateSeating.mockResolvedValue(seatingResponse())
  })

  it('по умолчанию собирает состав руками', async () => {
    const wrapper = await mountDialog()

    expect(wrapper.findComponent(ElCheckbox).props('modelValue')).toBe(false)
    expect(wrapper.find('.players-block').exists()).toBe(true)
    expect(wrapper.find('.players-counter').text()).toBe('Добавлено 0 из 10')
  })

  it('фиксирует добавленного игрока и открывает поле для следующего', async () => {
    const wrapper = await mountDialog()

    await addFoundPlayer(wrapper, user(1))

    // Строка добавленного игрока плюс пустая строка под следующего
    expect(playerRows(wrapper)).toHaveLength(2)
    expect(playerRows(wrapper)[0].find('input').element.value).toBe('Игрок 1')
    expect(wrapper.find('.players-counter').text()).toBe('Добавлено 1 из 10')
    expect(autocomplete(wrapper).props('modelValue')).toBe('')
  })

  it('заводит игрока на лету, когда такого еще нет', async () => {
    const wrapper = await mountDialog()
    apiService.createUser.mockResolvedValue({ id: 'user-new' })

    await searchPlayers(wrapper, 'Новичок', [])
    await button(wrapper, 'Создать').trigger('click')
    await flushPromises()

    expect(apiService.createUser).toHaveBeenCalledWith({ nickname: 'Новичок' })
    expect(playerRows(wrapper)[0].find('input').element.value).toBe('Новичок')
  })

  it('убирает игрока из состава', async () => {
    const wrapper = await mountDialog()

    await addFoundPlayer(wrapper, user(1))
    await button(wrapper, 'Удалить').trigger('click')

    expect(playerRows(wrapper)).toHaveLength(1)
    expect(wrapper.find('.players-counter').text()).toBe('Добавлено 0 из 10')
  })

  it('просит рассадку у сервера и рисует ее по столам', async () => {
    const wrapper = await mountDialog()
    await addFoundPlayer(wrapper, user(1))
    await addFoundPlayer(wrapper, user(2))

    await wrapper.findAllComponents(ElInputNumber)[1].setValue(2)
    await seedInput(wrapper).setValue('мой-сид')
    await button(wrapper, 'Показать рассадку').trigger('click')
    await flushPromises()

    expect(apiService.generateSeating).toHaveBeenCalledWith(EVENT_ID, {
      tables_count: 1,
      games_count: 2,
      seed: 'мой-сид',
      player_ids: ['user-1', 'user-2']
    })
    expect(wrapper.find('.preview-table-name').text()).toBe('Стол 1')
    expect(wrapper.find('.preview-seed').text()).toBe('Сид: сид-сервера')
    expect(wrapper.findAll('.seating-table th').map(cell => cell.text()))
      .toEqual(['Место', 'Игра 1', 'Игра 2'])
    expect(wrapper.findAll('.seating-table tbody tr')[0].findAll('td').map(cell => cell.text()))
      .toEqual(['1', 'Игрок 1', 'Игрок 2'])
  })

  it('создает игры сидом показанной рассадки', async () => {
    const wrapper = await mountDialog()
    await addFoundPlayer(wrapper, user(1))

    await button(wrapper, 'Показать рассадку').trigger('click')
    await flushPromises()
    await button(wrapper, 'Создать игры').trigger('click')
    await flushPromises()

    expect(apiService.generateSeating).toHaveBeenLastCalledWith(
      EVENT_ID,
      {
        tables_count: 1,
        games_count: 1,
        seed: 'сид-сервера',
        player_ids: ['user-1']
      },
      true
    )
    expect(wrapper.emitted('created')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([false])
  })

  it('перегенерация отпускает заданный сид', async () => {
    const wrapper = await mountDialog()

    await seedInput(wrapper).setValue('мой-сид')
    await button(wrapper, 'Показать рассадку').trigger('click')
    await flushPromises()
    await button(wrapper, 'Перегенерировать').trigger('click')
    await flushPromises()

    expect(seedInput(wrapper).element.value).toBe('')
    expect(apiService.generateSeating).toHaveBeenLastCalledWith(EVENT_ID, {
      tables_count: 1,
      games_count: 1,
      player_ids: []
    })
  })

  it('берет состав из регистраций, когда галочка нажата', async () => {
    const wrapper = await mountDialog()

    await wrapper.findComponent(ElCheckbox).setValue(true)
    expect(wrapper.find('.players-block').exists()).toBe(false)

    await button(wrapper, 'Показать рассадку').trigger('click')
    await flushPromises()

    expect(apiService.generateSeating).toHaveBeenCalledWith(EVENT_ID, {
      tables_count: 1,
      games_count: 1
    })
  })

  it('пересказывает ошибку сервера по-человечески', async () => {
    const wrapper = await mountDialog()
    apiService.generateSeating.mockRejectedValue({
      response: {
        status: 400,
        data: {
          detail: 'wrong players count',
          extra: { required_players_count: 10, actual_players_count: 3 }
        }
      }
    })

    await button(wrapper, 'Показать рассадку').trigger('click')
    await flushPromises()

    expect(errorText(wrapper))
      .toBe('Игроков 3, а нужно ровно 10 — по 10 на каждый стол')
    expect(wrapper.find('.seating-preview').exists()).toBe(false)
  })

  it('переводит валидацию сериализатора', async () => {
    const wrapper = await mountDialog()
    apiService.generateSeating.mockRejectedValue({
      response: {
        status: 400,
        data: {
          detail: 'Validation failed for POST /api/v1/events/event-1/seating',
          extra: [{ message: 'Value error, games_count must be divisible by tables_count' }]
        }
      }
    })

    await button(wrapper, 'Показать рассадку').trigger('click')
    await flushPromises()

    expect(errorText(wrapper))
      .toBe('Количество игр должно делиться на количество столов')
  })

  it('называет нехватку регистраций своими словами', async () => {
    const wrapper = await mountDialog()
    apiService.generateSeating.mockRejectedValue({
      response: {
        status: 400,
        data: {
          detail: 'wrong players count',
          extra: { required_players_count: 20, actual_players_count: 12 }
        }
      }
    })

    await wrapper.findComponent(ElCheckbox).setValue(true)
    await button(wrapper, 'Показать рассадку').trigger('click')
    await flushPromises()

    expect(errorText(wrapper))
      .toBe('Подтвержденных регистраций 12, а нужно ровно 20 — по 10 игроков на стол')
  })
})
