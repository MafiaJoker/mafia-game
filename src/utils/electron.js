// Утилиты для работы с Electron

// Проверка, запущено ли приложение в Electron
export const isElectron = () => {
  return window?.electronAPI !== undefined
}

// API для взаимодействия с Electron
export const electronAPI = window?.electronAPI || null

// Получение версии приложения
export const getAppVersion = async () => {
  if (!isElectron()) return null
  try {
    return await electronAPI.getAppVersion()
  } catch (error) {
    console.error('Failed to get app version:', error)
    return null
  }
}

// Получение платформы
export const getPlatform = async () => {
  if (!isElectron()) return null
  try {
    return await electronAPI.getPlatform()
  } catch (error) {
    console.error('Failed to get platform:', error)
    return null
  }
}

// Подписка на события меню
export const onMenuAction = (callback) => {
  if (!isElectron()) return
  electronAPI.onMenuAction(callback)
}

// Telegram OAuth функции для Electron
export const openTelegramOAuth = async (botUsername, authUrl) => {
  if (!isElectron()) return null
  try {
    return await electronAPI.openTelegramOAuth(botUsername, authUrl)
  } catch (error) {
    console.error('Failed to open Telegram OAuth:', error)
    return { success: false, error: error.message }
  }
}

export const onTelegramOAuthCallback = (callback) => {
  if (!isElectron()) return
  electronAPI.onTelegramOAuthCallback(callback)
}


// Класс для управления Electron функциональностью
export class ElectronManager {
  constructor() {
    this.isElectron = isElectron()
    this.platform = null
    this.version = null
  }

  async init() {
    if (!this.isElectron) return

    this.platform = await getPlatform()
    this.version = await getAppVersion()

    // Добавляем класс к body для стилизации под конкретную платформу
    if (this.platform) {
      document.body.classList.add(`platform-${this.platform}`)
    }
  }

  setupMenuHandlers(router) {
    if (!this.isElectron) return

    onMenuAction((event, data) => {
      switch (event) {
        case 'menu-new-event':
          router.push('/')
          break
        case 'menu-about':
          // Можно показать модальное окно "О программе"
          console.log('About dialog requested')
          break
        case 'menu-preferences':
          // Можно показать страницу настроек
          console.log('Preferences requested')
          break
      }
    })
  }

}