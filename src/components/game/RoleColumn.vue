<template>
  <el-table-column
    width="90"
    align="left"
  >
    <template #header>
      <div class="role-header">
        <span>Роль</span>
        <el-tooltip
          :content="rolesVisible ? 'Скрыть роли' : 'Отобразить роли'"
          placement="top"
        >
          <el-icon
            class="eye-icon"
            @click="toggleRolesVisibility"
            style="cursor: pointer; margin-left: 4px;"
          >
            <View v-if="rolesVisible" />
            <Hide v-else />
          </el-icon>
        </el-tooltip>
      </div>
    </template>
    <template #default="{ row }">
      <div class="icon-container" :style="clickable ? 'cursor: pointer;' : ''" @click="handleClick(row)">
        <div v-if="rolesVisible">
          <CitizenIcon v-if="row.role === GameRolesEnum.civilian" />
          <SheriffIcon v-else-if="row.role === GameRolesEnum.sheriff" />
          <DonIcon v-else-if="row.role === GameRolesEnum.don" />
          <MafiaIcon v-else-if="row.role === GameRolesEnum.mafia" />
        </div>
        <div v-else>
          <el-icon :size="20" style="color: #909399;">
            <Hide />
          </el-icon>
        </div>
      </div>
    </template>
  </el-table-column>
</template>

<script setup>
import {ref, watch} from 'vue'
import { View, Hide } from '@element-plus/icons-vue'
import CitizenIcon from './icons/CitizenIcon.vue'
import SheriffIcon from './icons/SheriffIcon.vue'
import DonIcon from './icons/DonIcon.vue'
import MafiaIcon from './icons/MafiaIcon.vue'
import { GameRolesEnum } from '@/utils/constants.js'

const props = defineProps({
  clickable: {
    type: Boolean,
    default: false
  },
  isDefaultHidden: {
    type: Boolean
  }
})

const emit = defineEmits(['role-click'])

const rolesVisible = ref(!props.isDefaultHidden)

// Следим за сменой isDefaultHidden
watch(() => props.isDefaultHidden, () => {
  rolesVisible.value = !props.isDefaultHidden
})

const toggleRolesVisibility = () => {
  rolesVisible.value = !rolesVisible.value
}

const handleClick = (row) => {
  if (props.clickable) {
    emit('role-click', row)
  }
}
</script>

<style scoped>
.role-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.eye-icon {
  transition: color 0.3s;
}

.eye-icon:hover {
  color: #409eff;
}

.icon-container {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
