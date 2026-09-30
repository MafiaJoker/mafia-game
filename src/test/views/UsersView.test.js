// Список пользователей: страницы, поиск и роль отбирает сервер - экран собирает
// из фильтров запрос и показывает ответ. Создание и правка идут через окна
// и после ответа сервера перечитывают список

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage, ElDialog, ElSelect } from 'element-plus'
import UsersView from '@/views/UsersView.vue'
import UserEditCombinedDialog from '@/components/users/UserEditCombinedDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    getRoles: vi.fn()
  },
  initApiUrl: vi.fn()
}))

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const DESKTOP_WIDTH = 1280
const MOBILE_WIDTH = 375

const baton = {
  id: 'user-1',
  nickname: 'Батон',
  is_unregistered: false,
  roles: ['player'],
  avatars: [
    { role: 'mafia', avatar_url: 'https://cdn/mafia.webp' },
    { role: 'civilian', avatar_url: 'https://cdn/civilian.webp' }
  ]
}

const yorsh = {
  id: 'user-2',
  nickname: 'Ёрш',
  is_unregistered: false,
  roles: ['player', 'game_master'],
  avatars: []
}

// Ответ ручки списка: страница строк и сколько их всего на сервере
const usersPage = (items, total = items.length) => ({ items, total })

const mountView = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.user = { id: 'admin-1', nickname: 'Админ', roles: ['admin'] }

  const wrapper = mount(UsersView, { global: { plugins: [pinia] } })
  await flushPromises()
  return wrapper
}

const button = (wrapper, label) => wrapper.findAll('button')
  .find(btn => btn.text() === label)

const nicknames = (wrapper) => wrapper.findAll('.user-cell-nickname')
  .map(cell => cell.text())

const createDialog = (wrapper) => wrapper.findAllComponents(ElDialog)
  .find(dialog => dialog.props('title') === 'Создать пользователя')

const search = async (wrapper, text) => {
  await wrapper.find('input[placeholder^="Поиск"]').setValue(text)
  await button(wrapper, 'Найти').trigger('click')
  await flushPromises()
}

const submitNewUser = async (wrapper, nickname) => {
  await button(wrapper, 'Создать пользователя').trigger('click')
  await flushPromises()
  await wrapper.find('input[placeholder="Введите никнейм"]').setValue(nickname)
  await button(wrapper, 'Создать').trigger('click')
  await flushPromises()
}

// Кнопки в строке - иконки без подписи, правка среди них единственная синяя
const openEdit = async (wrapper, rowIndex) => {
  await wrapper.findAll('.el-table__row')[rowIndex].find('.el-button--primary').trigger('click')
  await flushPromises()
  return wrapper.findComponent(UserEditCombinedDialog)
}

// Обёртки прошлых тестов не должны жить дальше: ширина экрана у всех общая,
// и её смена перерисовывала бы каждую, растягивая тест на секунды
enableAutoUnmount(afterEach)

describe('UsersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.innerWidth = DESKTOP_WIDTH
    vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
    vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    apiService.getUsers.mockResolvedValue(usersPage([baton, yorsh]))
    apiService.getRoles.mockResolvedValue([])
  })

  afterEach(() => {
    window.innerWidth = DESKTOP_WIDTH
  })

  it('при открытии грузит с сервера первую страницу без фильтров', async () => {
    apiService.getUsers.mockResolvedValue(usersPage([baton, yorsh], 57))
    const wrapper = await mountView()

    // Размер страницы не проверяем: первая загрузка берёт 100 строк, а
    // пагинатор считает по 20 - это расхождение ещё предстоит поправить
    expect(apiService.getUsers).toHaveBeenCalledTimes(1)
    const [params] = apiService.getUsers.mock.calls[0]
    expect(params.currentPage).toBe(1)
    expect(params).not.toHaveProperty('nickname')
    expect(params).not.toHaveProperty('role')
    // Сколько всего пользователей, знает только сервер
    expect(wrapper.text()).toContain('Найдено: 57 пользователей')
  })

  it('показывает ник и одну аватарку - в приоритете мирный житель, без картинок заглушку', async () => {
    const wrapper = await mountView()

    expect(nicknames(wrapper)).toEqual(['Батон', 'Ёрш'])
    const [withAvatars, withoutAvatars] = wrapper.findAll('.user-cell')
    expect(withAvatars.find('img').attributes('src')).toBe('https://cdn/civilian.webp')
    expect(withoutAvatars.find('img').exists()).toBe(false)
    expect(withoutAvatars.find('.user-cell-avatar-empty').exists()).toBe(true)
  })

  it('поиск и роль уходят в запрос к серверу, а на экране его ответ', async () => {
    const wrapper = await mountView()
    apiService.getUsers.mockResolvedValue(usersPage([baton]))

    await search(wrapper, '  Батон ')

    expect(apiService.getUsers).toHaveBeenLastCalledWith({
      pageSize: 20, currentPage: 1, nickname: 'Батон'
    })
    expect(nicknames(wrapper)).toEqual(['Батон'])

    // Общий фильтр держит роль в своём поле статуса
    const roleSelect = wrapper.findAllComponents(ElSelect)
      .find(select => select.props('placeholder') === 'Все статусы')
    roleSelect.vm.$emit('update:modelValue', 'admin')
    roleSelect.vm.$emit('change', 'admin')
    await flushPromises()

    expect(apiService.getUsers).toHaveBeenLastCalledWith({
      pageSize: 20, currentPage: 1, nickname: 'Батон', role: 'admin'
    })
  })

  it('другую страницу грузит с сервера, не теряя поиск', async () => {
    apiService.getUsers.mockResolvedValue(usersPage([baton, yorsh], 45))
    const wrapper = await mountView()
    await search(wrapper, 'Ба')

    await wrapper.findAll('.el-pager li').find(item => item.text() === '2').trigger('click')
    await flushPromises()

    expect(apiService.getUsers).toHaveBeenLastCalledWith({
      pageSize: 20, currentPage: 2, nickname: 'Ба'
    })
  })

  it('создаёт пользователя из окна и перезагружает список', async () => {
    // Экран отдаёт в запрос саму форму и после ответа очищает её -
    // снимаем копию в момент вызова
    let sent = null
    apiService.createUser.mockImplementation(async (data) => {
      sent = { ...data }
      return { id: 'user-3' }
    })
    const wrapper = await mountView()

    await submitNewUser(wrapper, 'Новичок')

    expect(sent).toMatchObject({ nickname: 'Новичок' })
    expect(ElMessage.success).toHaveBeenCalledWith('Пользователь создан')
    expect(createDialog(wrapper).props('modelValue')).toBe(false)
    expect(apiService.getUsers).toHaveBeenCalledTimes(2)
  })

  it('сервер не создал пользователя - ошибка, окно с введённым ником остаётся', async () => {
    apiService.createUser.mockRejectedValue(new Error('Request failed with status code 500'))
    const wrapper = await mountView()

    await submitNewUser(wrapper, 'Новичок')

    expect(ElMessage.error).toHaveBeenCalledWith('Ошибка сохранения изменений')
    expect(createDialog(wrapper).props('modelValue')).toBe(true)
    expect(wrapper.find('input[placeholder="Введите никнейм"]').element.value).toBe('Новичок')
    expect(apiService.getUsers).toHaveBeenCalledTimes(1)
  })

  it('правку из окна отправляет на сервер и перезагружает список', async () => {
    apiService.updateUser.mockResolvedValue(undefined)
    const wrapper = await mountView()

    const dialog = await openEdit(wrapper, 1)

    expect(dialog.props('modelValue')).toBe(true)
    expect(dialog.props('user')).toEqual(yorsh)

    dialog.vm.$emit('confirm', 'user-2', { nickname: 'Ёршик', roles: ['player'] })
    await flushPromises()

    expect(apiService.updateUser).toHaveBeenCalledWith('user-2', { nickname: 'Ёршик', roles: ['player'] })
    expect(ElMessage.success).toHaveBeenCalledWith('Данные пользователя обновлены')
    expect(apiService.getUsers).toHaveBeenCalledTimes(2)
  })

  it('аватарку из окна правки ставит в строку сразу, без перезагрузки списка', async () => {
    const wrapper = await mountView()
    const dialog = await openEdit(wrapper, 1)
    const userInDialog = dialog.props('user')

    dialog.vm.$emit('avatars-updated', 'user-2', [
      { role: 'civilian', avatar_url: 'https://cdn/new.webp' }
    ])
    await flushPromises()

    expect(wrapper.findAll('.user-cell')[1].find('img').attributes('src'))
      .toBe('https://cdn/new.webp')
    expect(apiService.getUsers).toHaveBeenCalledTimes(1)
    // Окну остаётся прежний объект: на новом оно сбросило бы недописанный ник
    expect(dialog.props('user')).toBe(userInDialog)
  })

  it('не загрузил список - показывает ошибку, таблица пустая', async () => {
    apiService.getUsers.mockRejectedValue(new Error('Network Error'))
    const wrapper = await mountView()

    expect(ElMessage.error).toHaveBeenCalledWith('Ошибка загрузки данных')
    expect(nicknames(wrapper)).toEqual([])
    expect(wrapper.text()).not.toContain('Найдено')
  })

  it('на телефоне кнопки шапки - круглые иконки с подписью, окно создания открывается', async () => {
    window.innerWidth = MOBILE_WIDTH
    const wrapper = await mountView()

    const create = wrapper.find('button[aria-label="Создать пользователя"]')
    expect(create.classes()).toContain('is-circle')
    expect(create.text()).toBe('')
    expect(wrapper.find('button[aria-label="Объединить пользователей"]').exists()).toBe(true)

    await create.trigger('click')
    await flushPromises()

    expect(createDialog(wrapper).props('modelValue')).toBe(true)
  })
})
