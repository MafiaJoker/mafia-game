// Роли аккаунта (не игровые): подписи и цвета тегов в одном месте -
// их показывают и список пользователей, и профиль
const USER_ROLE_LABELS = {
  admin: 'Администратор',
  judge: 'Судья',
  guest: 'Гость',
  player: 'Игрок',
  game_master: 'Ведущий',
  unregistered_player: 'Незарег. игрок',
  cashier: 'Кассир'
}

const USER_ROLE_TAG_TYPES = {
  admin: 'danger',
  judge: 'warning',
  guest: 'info',
  player: 'primary',
  game_master: 'warning',
  unregistered_player: '',
  cashier: 'success'
}

export const getUserRoleLabel = (role) => USER_ROLE_LABELS[role] || role

export const getUserRoleType = (role) => USER_ROLE_TAG_TYPES[role] ?? 'info'
