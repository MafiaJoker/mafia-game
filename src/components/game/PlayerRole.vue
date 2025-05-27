<template>
  <div class="player-role">
    <el-button 
      v-if="editable"
      :type="getRoleButtonType(player.role)"
      size="small"
      circle
      @click="$emit('changeRole', player.id)"
      >
      <el-icon>
        <component :is="getRoleIcon(player.role)" />
      </el-icon>
    </el-button>
    
    <div v-else-if="visible" class="role-display">
      <el-icon :color="getRoleColor(player.role)">
        <component :is="getRoleIcon(player.role)" />
      </el-icon>
      <span class="role-text">{{ getRoleText(player.role) }}</span>
    </div>
    
    <div v-else class="role-hidden">
      <el-icon><Hide /></el-icon>
    </div>
  </div>
</template>

<script setup>
  import { PLAYER_ROLES } from '@/utils/constants'
  import { 
      User, 
      Orange, 
      Aim, 
      Hide 
  } from '@element-plus/icons-vue'

  defineProps({
      player: {
	  type: Object,
	  required: true
      },
      visible: {
	  type: Boolean,
	  default: false
      },
      editable: {
	  type: Boolean,
	  default: false
      }
  })

  defineEmits(['changeRole'])

  const getRoleIcon = (role) => {
      switch (role) {
      case PLAYER_ROLES.CIVILIAN: return User
      case PLAYER_ROLES.SHERIFF: return Orange
      case PLAYER_ROLES.MAFIA: return Aim
      case PLAYER_ROLES.DON: return Aim
      default: return User
      }
  }

  const getRoleColor = (role) => {
      switch (role) {
      case PLAYER_ROLES.CIVILIAN: return '#67c23a'
      case PLAYER_ROLES.SHERIFF: return '#409eff'
      case PLAYER_ROLES.MAFIA: return '#f56c6c'
      case PLAYER_ROLES.DON: return '#e6a23c'
      default: return '#909399'
      }
  }

  const getRoleButtonType = (role) => {
      switch (role) {
      case PLAYER_ROLES.CIVILIAN: return 'success'
      case PLAYER_ROLES.SHERIFF: return 'primary'
      case PLAYER_ROLES.MAFIA: return 'danger'
      case PLAYER_ROLES.DON: return 'warning'
      default: return 'info'
      }
  }

  const getRoleText = (role) => {
      switch (role) {
      case PLAYER_ROLES.CIVILIAN: return 'М'
      case PLAYER_ROLES.SHERIFF: return 'Ш'
      case PLAYER_ROLES.MAFIA: return 'М'
      case PLAYER_ROLES.DON: return 'Д'
      default: return '?'
      }
  }
</script>

<style scoped>
  .player-role {
      display: flex;
      justify-content: center;
      align-items: center;
  }

  .role-display {
      display: flex;
      align-items: center;
      gap: 4px;
  }

  .role-text {
      font-weight: bold;
      font-size: 12px;
  }

  .role-hidden {
      color: #c0c4cc;
  }
</style>
