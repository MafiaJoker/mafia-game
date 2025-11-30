<template>
  <div class="roles-assigne">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><User /></el-icon>
            <span>Раздача ролей</span>
          </div>
        </div>
      </template>

      <GameTable :data="rolesData">
        <el-table-column
          label="Роль"
          width="60"
          align="left"
        >
          <template #default="{ row }">
            {{ row.role }}
          </template>
        </el-table-column>

        <el-table-column
          label="Игрок"
          min-width="200"
        >
          <template #default="{ row }">
            {{ row.player }}
          </template>
        </el-table-column>
      </GameTable>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { User } from '@element-plus/icons-vue'
import GameTable from './GameTable.vue'

// Временные данные для отображения таблицы
const rolesData = ref([])
</script>

<style scoped>
.roles-assigne {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
