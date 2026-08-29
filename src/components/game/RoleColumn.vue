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
      <div class="icon-container" :style="isClickable ? 'cursor: pointer;' : ''" @click="handleClick(row)">
        <div v-if="rolesVisible">
          <RoleIcon :role="row.role" />
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
import {ref, computed, watch} from 'vue'
import { View, Hide } from '@element-plus/icons-vue'
import RoleIcon from './RoleIcon.vue'

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

// По скрытой роли не кликаем: судья сначала открывает роли глазком
const isClickable = computed(() => props.clickable && rolesVisible.value)

// Следим за сменой isDefaultHidden
watch(() => props.isDefaultHidden, () => {
  rolesVisible.value = !props.isDefaultHidden
})

const toggleRolesVisibility = () => {
  rolesVisible.value = !rolesVisible.value
}

const handleClick = (row) => {
  if (isClickable.value) {
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

/* Планшет и телефон: роль переключают пальцем, цель не меньше 40px */
@media (max-width: 1023px) {
  .icon-container {
    width: 40px;
    height: 40px;
    margin: -8px 0 -8px -8px;
  }

  .eye-icon {
    font-size: 20px;
    padding: 6px;
    margin: -6px 0 -6px -2px;
  }
}
</style>
