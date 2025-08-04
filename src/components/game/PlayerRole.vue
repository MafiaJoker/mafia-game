<template>
  <div class="player-role">
    <div 
      v-if="editable"
      class="role-editable"
      @click="$emit('changeRole', player.id)"
      >
      <component :is="getRoleIcon(player.role)" :color="getRoleColor(player.role)" />
    </div>
    
    <div v-else-if="visible" class="role-display">
      <component :is="getRoleIcon(player.role)" :color="getRoleColor(player.role)" />
    </div>
    
    <div v-else class="role-hidden">
      <el-icon><Hide /></el-icon>
    </div>
  </div>
</template>

<script setup>
  import { PLAYER_ROLES } from '@/utils/constants'
  import { Hide } from '@element-plus/icons-vue'
  import CitizenIcon from './icons/CitizenIcon.vue'
  import SheriffIcon from './icons/SheriffIcon.vue'
  import MafiaIcon from './icons/MafiaIcon.vue'
  import DonIcon from './icons/DonIcon.vue'

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
      if (!role) return CitizenIcon // Для null ролей показываем иконку мирного
      switch (role) {
      case PLAYER_ROLES.CIVILIAN: return CitizenIcon
      case PLAYER_ROLES.SHERIFF: return SheriffIcon
      case PLAYER_ROLES.MAFIA: return MafiaIcon
      case PLAYER_ROLES.DON: return DonIcon
      default: return CitizenIcon
      }
  }

  const getRoleColor = (role) => {
      if (!role) return '#909399' // Для null ролей серый цвет
      switch (role) {
      case PLAYER_ROLES.CIVILIAN: return '#909399' // серый
      case PLAYER_ROLES.SHERIFF: return '#f56c6c' // красный
      case PLAYER_ROLES.MAFIA: return '#000000' // черный
      case PLAYER_ROLES.DON: return '#000000' // черный
      default: return '#909399'
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
      justify-content: center;
      min-height: 24px;
  }

  .role-editable {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 24px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s;
  }

  .role-editable:hover {
      background-color: #f5f7fa;
  }

  .role-hidden {
      color: #c0c4cc;
  }
</style>
