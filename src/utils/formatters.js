// Функции форматирования данных

import { TEXT_TEMPLATES } from './uiConstants'

// Форматирование даты
export const formatDate = (dateString, format = 'short') => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  
  switch (format) {
    case 'short':
      return date.toLocaleDateString('ru-RU')
    case 'long':
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    case 'full':
      return date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    case 'time':
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    case 'datetime':
      return `${formatDate(dateString, 'short')} ${formatDate(dateString, 'time')}`
    default:
      return date.toLocaleDateString('ru-RU')
  }
}

// Форматирование времени (секунды -> MM:SS)
export const formatTime = (seconds) => {
  if (typeof seconds !== 'number' || seconds < 0) return '00:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Форматирование длительности (секунды -> человекочитаемый вид)
export const formatDuration = (seconds) => {
  if (typeof seconds !== 'number' || seconds < 0) return ''
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  const parts = []
  if (hours > 0) parts.push(`${hours} ч`)
  if (minutes > 0) parts.push(`${minutes} мин`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs} сек`)
  
  return parts.join(' ')
}

// Форматирование счета/баллов
export const formatScore = (score, precision = 1) => {
  if (typeof score !== 'number') return '0.0'
  return Number(score).toFixed(precision)
}

// Форматирование номера игрока
export const formatPlayerNumber = (number) => {
  if (typeof number === 'string') number = parseInt(number)
  if (isNaN(number)) return ''
  
  return number.toString().padStart(2, '0')
}

// Форматирование процентов
export const formatPercent = (value, total, precision = 0) => {
  if (!total || total === 0) return '0%'
  const percent = (value / total) * 100
  return `${percent.toFixed(precision)}%`
}

// Форматирование денег
export const formatMoney = (amount, currency = '₽') => {
  if (typeof amount !== 'number') return `0 ${currency}`
  
  const formatted = new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
  
  return `${formatted} ${currency}`
}

// Форматирование множественного числа
export const pluralize = (count, forms) => {
  // forms = ['игрок', 'игрока', 'игроков']
  if (!Array.isArray(forms) || forms.length < 3) return ''
  
  const n = Math.abs(count) % 100
  const n1 = n % 10
  
  if (n > 10 && n < 20) return forms[2]
  if (n1 > 1 && n1 < 5) return forms[1]
  if (n1 === 1) return forms[0]
  
  return forms[2]
}

// Форматирование с шаблоном
export const formatTemplate = (template, values) => {
  if (!template) return ''
  
  return template.replace(/{(\w+)}/g, (match, key) => {
    return values.hasOwnProperty(key) ? values[key] : match
  })
}

// Форматирование номера раунда
export const formatRound = (roundNumber) => {
  return formatTemplate(TEXT_TEMPLATES.ROUND_NUMBER, { number: roundNumber })
}

// Форматирование количества голосов
export const formatVoteCount = (count) => {
  const voteWord = pluralize(count, ['голос', 'голоса', 'голосов'])
  return `${count} ${voteWord}`
}

// Форматирование количества фолов
export const formatFoulCount = (count) => {
  const foulWord = pluralize(count, ['фол', 'фола', 'фолов'])
  return `${count} ${foulWord}`
}

// Форматирование списка имен
export const formatNamesList = (names, maxVisible = 3) => {
  if (!Array.isArray(names) || names.length === 0) return ''
  
  if (names.length <= maxVisible) {
    return names.join(', ')
  }
  
  const visible = names.slice(0, maxVisible).join(', ')
  const remaining = names.length - maxVisible
  const word = pluralize(remaining, ['другой', 'других', 'других'])
  
  return `${visible} и еще ${remaining} ${word}`
}

// Форматирование размера файла
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Б'
  
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`
}

// Форматирование телефона
export const formatPhone = (phone) => {
  if (!phone) return ''
  
  // Удаляем все нецифровые символы
  const cleaned = phone.replace(/\D/g, '')
  
  // Форматируем российский номер
  if (cleaned.length === 11 && cleaned[0] === '7') {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`
  }
  
  return phone
}

// Обрезание длинного текста
export const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength - suffix.length) + suffix
}

// Капитализация первой буквы
export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Форматирование инициалов
export const formatInitials = (fullName) => {
  if (!fullName) return ''
  
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  
  return parts
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

// Форматирование относительного времени
export const formatRelativeTime = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000) // разница в секундах
  
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`
  
  return formatDate(dateString)
}