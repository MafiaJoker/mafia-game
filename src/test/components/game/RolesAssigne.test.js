// Тесты фазы раздачи ролей: роли правятся и во время договорки,
// а расклад проверяется только на старте игры

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import RolesAssigne from '@/components/game/RolesAssigne.vue'
import { GameRolesEnum } from '@/utils/constants.js'
import { GAME_ERROR_MESSAGES } from '@/utils/errorMessages.js'
import { apiService } from '@/services/api.js'

vi.mock('@/services/api.js', () => ({
  apiService: {
    createGamePlayers: vi.fn()
  }
}))

// Таблица Element Plus вешает MutationObserver на проксированный узел,
// а реализация happy-dom на таком объекте падает
global.MutationObserver = class MutationObserver {
  observe() {}
  disconnect() {}
  takeRecords() { return [] }
}

const GAME_ID = 'game-1'

const player = (boxId, role) => ({
  id: `player-${boxId}`,
  nickname: `Игрок ${boxId}`,
  box_id: boxId,
  role
})

// Полный расклад: 1 дон, 1 шериф, 2 мафии и 6 мирных
const fullRoles = () => [
  player(1, GameRolesEnum.don),
  player(2, GameRolesEnum.sheriff),
  player(3, GameRolesEnum.mafia),
  player(4, GameRolesEnum.mafia),
  ...[5, 6, 7, 8, 9, 10].map(boxId => player(boxId, GameRolesEnum.civilian))
]

// Чистый расклад: все роли еще свободны
const allCivilians = () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  .map(boxId => player(boxId, GameRolesEnum.civilian))

// Не хватает второй мафии - с таким раскладом игру начинать нельзя
const incompleteRoles = () => {
  const roles = fullRoles()
  roles[3] = player(4, GameRolesEnum.civilian)
  return roles
}

const mountRoles = async (rolesData) => {
  const wrapper = mount(RolesAssigne, {
    props: {
      gameId: GAME_ID,
      rolesData,
      // v-model:roles-data, как во вьюхе игры
      'onUpdate:rolesData': (updated) => wrapper.setProps({ rolesData: updated })
    }
  })
  // Таблица Element Plus дорисовывает строки после монтирования
  await flushPromises()
  return wrapper
}

const button = (wrapper, label) => wrapper.findAll('button')
  .find(btn => btn.text() === label)

const roleCell = (wrapper, boxId) => wrapper.findAll('.icon-container')[boxId - 1]

// Скрытая роль рисуется общей иконкой el-icon вместо картинки роли
const isRoleHidden = (wrapper, boxId) => roleCell(wrapper, boxId).find('.el-icon').exists()

const startNegotiation = async (wrapper) => {
  await button(wrapper, 'Начать договорку').trigger('click')
  await flushPromises()
}

const errorText = (wrapper) => wrapper.find('.el-alert__title').exists()
  ? wrapper.find('.el-alert__title').text()
  : ''

describe('RolesAssigne', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiService.createGamePlayers.mockResolvedValue({})
  })

  it('стартует договорку с неполным раскладом', async () => {
    const wrapper = await mountRoles(incompleteRoles())

    await startNegotiation(wrapper)

    expect(wrapper.emitted('negotiation-started')).toHaveLength(1)
    expect(errorText(wrapper)).toBe('')
    expect(button(wrapper, 'Начать игру')).toBeDefined()
    // Кнопка была нужна только чтобы разблокировать роли
    expect(button(wrapper, 'Вернуться к раздаче')).toBeUndefined()
  })

  it('прячет роли на старте договорки, но открывает их глазком', async () => {
    const wrapper = await mountRoles(fullRoles())

    expect(isRoleHidden(wrapper, 1)).toBe(false)

    await startNegotiation(wrapper)
    expect(isRoleHidden(wrapper, 1)).toBe(true)

    await wrapper.find('.eye-icon').trigger('click')
    expect(isRoleHidden(wrapper, 1)).toBe(false)
  })

  it('не крутит роль, пока она скрыта', async () => {
    const wrapper = await mountRoles(fullRoles())

    await startNegotiation(wrapper)
    await roleCell(wrapper, 1).trigger('click')

    expect(wrapper.emitted('update:rolesData')).toBeUndefined()
  })

  it('меняет роль во время договорки', async () => {
    const wrapper = await mountRoles(fullRoles())

    await startNegotiation(wrapper)
    await wrapper.find('.eye-icon').trigger('click')
    // Дон -> мафия и шериф разобраны, поэтому по кругу выпадает мирный
    await roleCell(wrapper, 1).trigger('click')

    expect(wrapper.props('rolesData')[0].role).toBe(GameRolesEnum.civilian)
  })

  it('ставит шерифа последним в карусели ролей', async () => {
    const wrapper = await mountRoles(allCivilians())

    const cycledRoles = []
    for (let click = 0; click < 4; click++) {
      await roleCell(wrapper, 1).trigger('click')
      await flushPromises()
      cycledRoles.push(wrapper.props('rolesData')[0].role)
    }

    expect(cycledRoles).toEqual([
      GameRolesEnum.don,
      GameRolesEnum.mafia,
      GameRolesEnum.sheriff,
      GameRolesEnum.civilian
    ])
  })

  it('не начинает игру с неполным раскладом', async () => {
    const wrapper = await mountRoles(incompleteRoles())

    await startNegotiation(wrapper)
    await button(wrapper, 'Начать игру').trigger('click')
    await flushPromises()

    expect(apiService.createGamePlayers).not.toHaveBeenCalled()
    expect(errorText(wrapper)).toBe(GAME_ERROR_MESSAGES.INVALID_ROLES)
    expect(wrapper.emitted('game-started')).toBeUndefined()
  })

  it('отправляет роли, когда расклад собран', async () => {
    const wrapper = await mountRoles(incompleteRoles())

    await startNegotiation(wrapper)
    await button(wrapper, 'Начать игру').trigger('click')
    await flushPromises()

    // Дополняем расклад: мирный на четвертом боксе становится мафией
    await wrapper.find('.eye-icon').trigger('click')
    await roleCell(wrapper, 4).trigger('click')
    // Ошибка расклада гаснет, как только судья взялся за роли
    expect(errorText(wrapper)).toBe('')

    await button(wrapper, 'Начать игру').trigger('click')
    await flushPromises()

    expect(apiService.createGamePlayers).toHaveBeenCalledWith(
      GAME_ID,
      fullRoles().map(({ id, role, box_id }) => ({ user_id: id, role, box_id }))
    )
    expect(wrapper.emitted('game-started')).toHaveLength(1)
  })
})
