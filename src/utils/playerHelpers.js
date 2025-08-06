// Вспомогательные функции для работы с игроками

import { PLAYER_ROLES } from './constants'
import { GAME_RULES, SCORING } from './gameConstants'

// Получение роли игрока
export const getPlayerRole = (player) => {
  if (!player) return null
  return player.originalRole || player.role || null
}

// Проверка, жив ли игрок
export const isPlayerAlive = (player) => {
  if (!player) return false
  return player.status === 'alive' && !player.isEliminated && !player.isDead
}

// Проверка, может ли игрок говорить
export const canPlayerSpeak = (player) => {
  if (!player) return false
  return isPlayerAlive(player) && player.fouls < GAME_RULES.FOULS.SILENCE_THRESHOLD
}

// Проверка, может ли игрок голосовать
export const canPlayerVote = (player) => {
  return canPlayerSpeak(player) // Те же условия, что и для речи
}

// Получение отображаемого имени игрока
export const getPlayerDisplayName = (player) => {
  if (!player) return ''
  return player.nickname || player.name || `Игрок ${player.id}`
}

// Получение команды игрока (красная/черная)
export const getPlayerTeam = (role) => {
  if (!role) return null
  
  const blackTeamRoles = [
    'mafia', 'don',
    PLAYER_ROLES.MAFIA, PLAYER_ROLES.DON
  ]
  
  return blackTeamRoles.includes(role) ? 'black' : 'red'
}

// Проверка, является ли игрок мафией
export const isPlayerMafia = (player) => {
  const role = getPlayerRole(player)
  return getPlayerTeam(role) === 'black'
}

// Проверка, является ли игрок мирным
export const isPlayerCivilian = (player) => {
  const role = getPlayerRole(player)
  return getPlayerTeam(role) === 'red'
}

// Получение количества фолов игрока
export const getPlayerFouls = (player) => {
  return player?.fouls || 0
}

// Проверка, удален ли игрок за фолы
export const isPlayerEliminatedByFouls = (player) => {
  return getPlayerFouls(player) >= GAME_RULES.FOULS.ELIMINATION_THRESHOLD
}

// Проверка, лишен ли игрок права голоса
export const isPlayerSilenced = (player) => {
  const fouls = getPlayerFouls(player)
  return fouls >= GAME_RULES.FOULS.SILENCE_THRESHOLD && 
         fouls < GAME_RULES.FOULS.ELIMINATION_THRESHOLD
}

// Получение статуса игрока
export const getPlayerStatus = (player) => {
  if (!player) return 'unknown'
  
  if (player.isDead) return 'dead'
  if (player.isEliminated || isPlayerEliminatedByFouls(player)) return 'eliminated'
  if (isPlayerSilenced(player)) return 'silenced'
  if (player.status === 'alive') return 'alive'
  
  return player.status || 'unknown'
}

// Получение базовых очков за победу/поражение
export const getPlayerBaseScore = (player, gameResult) => {
  const role = getPlayerRole(player)
  const team = getPlayerTeam(role)
  
  // Определяем, победила ли команда игрока
  const isWinner = (team === 'red' && gameResult === 'civilians_win') ||
                   (team === 'black' && gameResult === 'mafia_win')
  
  if (isWinner) {
    // Базовые очки за победу в зависимости от роли
    switch (role) {
      case 'civilian':
      case PLAYER_ROLES.CIVILIAN:
        return SCORING.BASE_WIN_POINTS.CIVILIAN
      case 'sheriff':
      case PLAYER_ROLES.SHERIFF:
        return SCORING.BASE_WIN_POINTS.SHERIFF
      case 'mafia':
      case PLAYER_ROLES.MAFIA:
        return SCORING.BASE_WIN_POINTS.MAFIA
      case 'don':
      case PLAYER_ROLES.DON:
        return SCORING.BASE_WIN_POINTS.DON
      default:
        return 0
    }
  } else {
    // Базовые очки за поражение (обычно 0)
    return SCORING.BASE_LOSE_POINTS[role.toUpperCase()] || 0
  }
}

// Валидация ID игрока
export const isValidPlayerId = (id) => {
  const numId = typeof id === 'string' ? parseInt(id) : id
  return !isNaN(numId) && numId >= 1 && numId <= GAME_RULES.PLAYERS.MAX
}

// Сортировка игроков по номерам
export const sortPlayersByNumber = (players) => {
  if (!Array.isArray(players)) return []
  return [...players].sort((a, b) => (a.id || 0) - (b.id || 0))
}

// Фильтрация живых игроков
export const filterAlivePlayers = (players) => {
  if (!Array.isArray(players)) return []
  return players.filter(player => isPlayerAlive(player))
}

// Фильтрация игроков, которые могут голосовать
export const filterVotingPlayers = (players) => {
  if (!Array.isArray(players)) return []
  return players.filter(player => canPlayerVote(player))
}

// Подсчет игроков по командам
export const countPlayersByTeam = (players) => {
  const counts = { red: 0, black: 0, total: 0 }
  
  if (!Array.isArray(players)) return counts
  
  players.forEach(player => {
    if (isPlayerAlive(player)) {
      const team = getPlayerTeam(getPlayerRole(player))
      if (team === 'red') counts.red++
      else if (team === 'black') counts.black++
      counts.total++
    }
  })
  
  return counts
}

// Проверка условий победы
export const checkVictoryCondition = (players) => {
  const counts = countPlayersByTeam(players)
  
  // Победа мафии: черных >= красных
  if (counts.black >= counts.red && counts.black > 0) {
    return 'mafia_win'
  }
  
  // Победа мирных: черных = 0
  if (counts.black === 0 && counts.red > 0) {
    return 'civilians_win'
  }
  
  // Игра продолжается
  return null
}

// Получение игрока по ID
export const findPlayerById = (players, id) => {
  if (!Array.isArray(players)) return null
  return players.find(p => p.id === id || p.id === parseInt(id))
}

// Получение списка номинированных игроков
export const getNominatedPlayers = (players, nominatedIds) => {
  if (!Array.isArray(players) || !Array.isArray(nominatedIds)) return []
  return nominatedIds
    .map(id => findPlayerById(players, id))
    .filter(player => player && isPlayerAlive(player))
}