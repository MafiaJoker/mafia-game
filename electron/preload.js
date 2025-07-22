const { contextBridge, ipcRenderer } = require('electron')

// Экспонируем безопасный API для renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
  // Информация о приложении
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Обработка меню
  onMenuAction: (callback) => {
    const events = ['menu-new-event', 'menu-about', 'menu-preferences']
    events.forEach(event => {
      ipcRenderer.on(event, (_, data) => callback(event, data))
    })
  },
  
  // Telegram OAuth
  openTelegramOAuth: (botUsername, authUrl) => ipcRenderer.invoke('telegram-oauth-start', { botUsername, authUrl }),
  onTelegramOAuthCallback: (callback) => {
    ipcRenderer.on('telegram-oauth-callback', (_, data) => callback(data))
  },
  
  // Утилиты
  isElectron: () => true,
  
  // Удаление слушателей
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// Добавляем индикатор что приложение запущено в Electron
window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('electron-app')
})