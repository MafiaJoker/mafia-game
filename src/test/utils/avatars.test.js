// Правила подготовки аватарки на клиенте: что показываем в компактных местах,
// что не пускаем на сервер и как ужимаем перед отправкой

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  AVATAR_FILE_ERRORS,
  getAvatarErrorMessage,
  getAvatarScale,
  pickPrimaryAvatar,
  prepareAvatarFile,
  validateAvatarFile
} from '@/utils/avatars'

const makeFile = (name, type, size) => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('pickPrimaryAvatar', () => {
  it('выбирает мирного жителя, даже если он не первый в списке', () => {
    const avatars = [
      { role: 'don', avatar_url: 'don.webp' },
      { role: 'civilian', avatar_url: 'civilian.webp' }
    ]

    expect(pickPrimaryAvatar(avatars)).toBe('civilian.webp')
  })

  it('без мирного берет следующую по порядку карусели ролей', () => {
    const avatars = [
      { role: 'sheriff', avatar_url: 'sheriff.webp' },
      { role: 'mafia', avatar_url: 'mafia.webp' }
    ]

    expect(pickPrimaryAvatar(avatars)).toBe('mafia.webp')
  })

  it('на пустом списке отдает null', () => {
    expect(pickPrimaryAvatar([])).toBeNull()
    expect(pickPrimaryAvatar(undefined)).toBeNull()
  })
})

describe('validateAvatarFile', () => {
  it('пропускает jpg, png и webp', () => {
    expect(validateAvatarFile(makeFile('a.jpg', 'image/jpeg', 1000))).toBeNull()
    expect(validateAvatarFile(makeFile('a.png', 'image/png', 1000))).toBeNull()
    expect(validateAvatarFile(makeFile('a.webp', 'image/webp', 1000))).toBeNull()
  })

  it('не пропускает pdf и называет формат, чтобы отказ был понятен', () => {
    expect(validateAvatarFile(makeFile('a.pdf', 'application/pdf', 1000)))
      .toContain('application/pdf')
  })

  it('называет heic: формат по умолчанию на iPhone, серверу он не подходит', () => {
    expect(validateAvatarFile(makeFile('IMG_0001.heic', 'image/heic', 1000)))
      .toContain('image/heic')
  })

  it('пропускает картинку, у которой браузер не определил тип', () => {
    expect(validateAvatarFile(makeFile('photo.JPG', '', 1000))).toBeNull()
    expect(validateAvatarFile(makeFile('photo.webp', '', 1000))).toBeNull()
  })

  it('без типа и с чужим расширением отказывает по расширению', () => {
    expect(validateAvatarFile(makeFile('archive.zip', '', 1000))).toContain('.zip')
  })

  it('не пропускает файл больше 5 МБ', () => {
    expect(validateAvatarFile(makeFile('a.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)))
      .toBe(AVATAR_FILE_ERRORS.SIZE)
  })
})

describe('getAvatarScale', () => {
  it('не увеличивает картинку меньше пределов', () => {
    expect(getAvatarScale(800, 600)).toBe(1)
  })

  it('фотку 4000x3000 ужимает до 1440x1080 - ограничивает короткая сторона', () => {
    const scale = getAvatarScale(4000, 3000)

    expect(Math.round(4000 * scale)).toBe(1440)
    expect(Math.round(3000 * scale)).toBe(1080)
  })

  it('панораму ограничивает по длинной стороне', () => {
    const scale = getAvatarScale(6000, 1000)

    expect(Math.round(6000 * scale)).toBe(2560)
  })
})

describe('prepareAvatarFile', () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap

  afterEach(() => {
    globalThis.createImageBitmap = originalCreateImageBitmap
    vi.restoreAllMocks()
  })

  it('без createImageBitmap отправляет оригинал', async () => {
    globalThis.createImageBitmap = undefined
    const file = makeFile('a.jpg', 'image/jpeg', 1000)

    expect(await prepareAvatarFile(file)).toBe(file)
  })

  it('картинку в пределах лимитов не перекодирует', async () => {
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({
      width: 800,
      height: 600,
      close: vi.fn()
    })
    const file = makeFile('a.jpg', 'image/jpeg', 1000)

    expect(await prepareAvatarFile(file)).toBe(file)
  })

  it('поворот применяет на клиенте: canvas стирает EXIF', async () => {
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({
      width: 800,
      height: 600,
      close: vi.fn()
    })
    const file = makeFile('a.jpg', 'image/jpeg', 1000)

    await prepareAvatarFile(file)

    expect(globalThis.createImageBitmap).toHaveBeenCalledWith(
      file,
      { imageOrientation: 'from-image' }
    )
  })

  it('большую фотку пережимает в avatar.jpg', async () => {
    globalThis.createImageBitmap = vi.fn()
      .mockResolvedValueOnce({ width: 4000, height: 3000, close: vi.fn() })
      .mockResolvedValueOnce({ width: 1440, height: 1080, close: vi.fn() })
    vi.spyOn(document, 'createElement').mockReturnValue({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (callback) => callback(new Blob(['resized'], { type: 'image/jpeg' }))
    })
    const file = makeFile('big.jpg', 'image/jpeg', 4 * 1024 * 1024)

    const prepared = await prepareAvatarFile(file)

    expect(prepared).not.toBe(file)
    expect(prepared.name).toBe('avatar.jpg')
    expect(prepared.type).toBe('image/jpeg')
  })

  it('если декодирование зависло - не держит загрузку, шлет оригинал', async () => {
    vi.useFakeTimers()
    globalThis.createImageBitmap = vi.fn(() => new Promise(() => {}))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const file = makeFile('a.jpg', 'image/jpeg', 1000)

    const pending = prepareAvatarFile(file)
    await vi.advanceTimersByTimeAsync(9000)

    expect(await pending).toBe(file)
    vi.useRealTimers()
  })

  it('если декодирование упало - отправляет оригинал', async () => {
    globalThis.createImageBitmap = vi.fn().mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const file = makeFile('a.jpg', 'image/jpeg', 1000)

    expect(await prepareAvatarFile(file)).toBe(file)
  })
})

describe('getAvatarErrorMessage', () => {
  it('429 объясняет, что сервер занят', () => {
    const message = getAvatarErrorMessage({ response: { status: 429 } }, 'fallback')

    expect(message).toContain('занят')
  })

  it('415 и 413 разбирает отдельно от общей ошибки', () => {
    expect(getAvatarErrorMessage({ response: { status: 415 } }, 'fallback'))
      .not.toBe('fallback')
    expect(getAvatarErrorMessage({ response: { status: 413 } }, 'fallback'))
      .not.toBe('fallback')
  })

  it('незнакомый статус отдает переданный текст', () => {
    expect(getAvatarErrorMessage({ response: { status: 500 } }, 'fallback'))
      .toBe('fallback')
  })
})
