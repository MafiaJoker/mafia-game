// Блок игровых аватарок: один компонент на профиль и на модалку админа.
// Файл уходит сразу при выборе, кнопка «Сохранить» его не касается.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import UserAvatarsEditor from '@/components/users/UserAvatarsEditor.vue'
import { apiService } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiService: {
    uploadMyAvatar: vi.fn(),
    deleteMyAvatar: vi.fn(),
    uploadUserAvatar: vi.fn(),
    deleteUserAvatar: vi.fn()
  }
}))

vi.mock('@/utils/avatars', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    // Предресайз проверяется отдельно, здесь он только мешает
    prepareAvatarFile: vi.fn(file => Promise.resolve(file))
  }
})

const USER_ID = 'a1b2c3d4-0000-0000-0000-000000000000'

const makeFile = (name = 'photo.jpg', type = 'image/jpeg', size = 1024) => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const mountEditor = (props = {}) => mount(UserAvatarsEditor, {
  props: { target: USER_ID, avatars: [], ...props }
})

const selectFile = async (wrapper, role, file) => {
  const input = wrapper.find(`[data-testid="avatar-input-${role}"]`)
  Object.defineProperty(input.element, 'files', {
    value: file ? [file] : [],
    configurable: true
  })
  await input.trigger('change')
  await flushPromises()
}

describe('UserAvatarsEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  })

  it('показывает слот на каждую игровую роль', () => {
    const wrapper = mountEditor()

    expect(wrapper.find('[data-testid="avatar-slot-civilian"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="avatar-slot-mafia"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="avatar-slot-don"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="avatar-slot-sheriff"]').exists()).toBe(true)
  })

  it('кнопка загрузки - это label, который открывает поле штатно', () => {
    const wrapper = mountEditor()
    const label = wrapper.find('[data-testid="avatar-upload-civilian"]')
    const input = wrapper.find('[data-testid="avatar-input-civilian"]')

    // Программного click по полю в компоненте нет: часть браузеров такое
    // окно открывает, но событие выбора странице не отдает
    expect(label.element.tagName).toBe('LABEL')
    expect(input.attributes('type')).toBe('file')
    // Поле лежит внутри подписи - именно так label его и активирует
    expect(label.find('[data-testid="avatar-input-civilian"]').exists()).toBe(true)
  })

  it('пока идет загрузка, выбрать другой файл нельзя', async () => {
    let resolveUpload
    apiService.uploadUserAvatar.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve }))
    const wrapper = mountEditor()

    await selectFile(wrapper, 'civilian', makeFile())

    expect(wrapper.find('[data-testid="avatar-input-mafia"]').attributes('disabled')).toBeDefined()
    resolveUpload({ role: 'civilian', avatar_url: 'https://cdn/civilian.webp' })
    await flushPromises()
    expect(wrapper.find('[data-testid="avatar-input-mafia"]').attributes('disabled')).toBeUndefined()
  })

  it('уже загруженную аватарку показывает картинкой, пустой слот - заглушкой', () => {
    const wrapper = mountEditor({
      avatars: [{ role: 'civilian', avatar_url: 'https://cdn/civilian.webp' }]
    })

    const filled = wrapper.find('[data-testid="avatar-slot-civilian"] img')
    expect(filled.attributes('src')).toBe('https://cdn/civilian.webp')
    expect(wrapper.find('[data-testid="avatar-slot-mafia"] img').exists()).toBe(false)
    // Заменить, но не удалить: удалять в пустом слоте нечего
    expect(wrapper.find('[data-testid="avatar-delete-civilian"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="avatar-delete-mafia"]').exists()).toBe(false)
  })

  it('pdf на сервер не уходит', async () => {
    const wrapper = mountEditor()

    await selectFile(wrapper, 'civilian', makeFile('scan.pdf', 'application/pdf'))

    expect(apiService.uploadUserAvatar).not.toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalled()
  })

  it('картинка больше 5 МБ на сервер не уходит', async () => {
    const wrapper = mountEditor()

    await selectFile(wrapper, 'civilian', makeFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024))

    expect(apiService.uploadUserAvatar).not.toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalled()
  })

  it('отказ остается в слоте: тост живет три секунды и его пропускают', async () => {
    const wrapper = mountEditor()

    // heic - формат по умолчанию на iPhone, серверу он не подходит
    await selectFile(wrapper, 'don', makeFile('IMG_0001.heic', 'image/heic'))

    const slot = wrapper.find('[data-testid="avatar-slot-don"]')
    expect(slot.text()).toContain('JPG, PNG или WebP')
  })

  it('следующая попытка стирает прошлый отказ', async () => {
    apiService.uploadUserAvatar.mockResolvedValue({
      role: 'don',
      avatar_url: 'https://cdn/don.webp'
    })
    const wrapper = mountEditor()

    await selectFile(wrapper, 'don', makeFile('IMG_0001.heic', 'image/heic'))
    await selectFile(wrapper, 'don', makeFile())

    expect(wrapper.find('[data-testid="avatar-slot-don"]').text())
      .not.toContain('JPG, PNG или WebP')
  })

  it('ссылка есть, а картинка не открылась - слот говорит об этом, а не молчит', async () => {
    const wrapper = mountEditor({
      avatars: [{ role: 'civilian', avatar_url: 'https://cdn/civilian.webp' }]
    })

    await wrapper.find('[data-testid="avatar-slot-civilian"] img').trigger('error')

    const slot = wrapper.find('[data-testid="avatar-slot-civilian"]')
    expect(slot.find('img').exists()).toBe(false)
    expect(slot.text()).toContain('не открывается')
    // Удалить по-прежнему можно: файл на сервере есть
    expect(wrapper.find('[data-testid="avatar-delete-civilian"]').exists()).toBe(true)
  })

  it('окно закрылось без файла - слот об этом говорит, а не молчит', async () => {
    const wrapper = mountEditor()

    await selectFile(wrapper, 'mafia', null)

    expect(wrapper.find('[data-testid="avatar-slot-mafia"]').text()).toContain('Файл не выбран')
    expect(apiService.uploadUserAvatar).not.toHaveBeenCalled()
  })

  it('загружает файл за указанного пользователя и отдает наверх ответ ручки', async () => {
    apiService.uploadUserAvatar.mockResolvedValue({
      role: 'mafia',
      avatar_url: 'https://cdn/new-mafia.webp'
    })
    const wrapper = mountEditor({
      avatars: [{ role: 'civilian', avatar_url: 'https://cdn/civilian.webp' }]
    })
    const file = makeFile()

    await selectFile(wrapper, 'mafia', file)

    expect(apiService.uploadUserAvatar).toHaveBeenCalledWith(USER_ID, 'mafia', file)
    expect(wrapper.emitted('update:avatars')[0][0]).toEqual([
      { role: 'civilian', avatar_url: 'https://cdn/civilian.webp' },
      { role: 'mafia', avatar_url: 'https://cdn/new-mafia.webp' }
    ])
  })

  it('в своем профиле идет в ручку «me»', async () => {
    apiService.uploadMyAvatar.mockResolvedValue({
      role: 'don',
      avatar_url: 'https://cdn/don.webp'
    })
    const wrapper = mountEditor({ target: 'me' })

    await selectFile(wrapper, 'don', makeFile())

    expect(apiService.uploadMyAvatar).toHaveBeenCalled()
    expect(apiService.uploadUserAvatar).not.toHaveBeenCalled()
  })

  it('на 429 показывает, что сервер занят, и не ретраит', async () => {
    apiService.uploadUserAvatar.mockRejectedValue({ response: { status: 429 } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mountEditor()

    await selectFile(wrapper, 'civilian', makeFile())

    expect(apiService.uploadUserAvatar).toHaveBeenCalledTimes(1)
    expect(ElMessage.error).toHaveBeenCalledWith(expect.stringContaining('занят'))
    expect(wrapper.emitted('update:avatars')).toBeUndefined()
  })

  it('удаляет только после подтверждения', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
    apiService.deleteUserAvatar.mockResolvedValue(undefined)
    const wrapper = mountEditor({
      avatars: [
        { role: 'civilian', avatar_url: 'https://cdn/civilian.webp' },
        { role: 'don', avatar_url: 'https://cdn/don.webp' }
      ]
    })

    await wrapper.find('[data-testid="avatar-delete-civilian"]').trigger('click')
    await flushPromises()

    expect(ElMessageBox.confirm).toHaveBeenCalled()
    expect(apiService.deleteUserAvatar).toHaveBeenCalledWith(USER_ID, 'civilian')
    expect(wrapper.emitted('update:avatars')[0][0]).toEqual([
      { role: 'don', avatar_url: 'https://cdn/don.webp' }
    ])
  })

  it('отмена подтверждения запрос не шлет', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel')
    const wrapper = mountEditor({
      avatars: [{ role: 'civilian', avatar_url: 'https://cdn/civilian.webp' }]
    })

    await wrapper.find('[data-testid="avatar-delete-civilian"]').trigger('click')
    await flushPromises()

    expect(apiService.deleteUserAvatar).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:avatars')).toBeUndefined()
  })
})
