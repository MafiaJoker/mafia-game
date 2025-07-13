<template>
  <div class="profile-history">
    <div class="history-header">
      <h4 class="history-title">
        <el-icon><Clock /></el-icon>
        История игр
      </h4>
      <el-button size="small" type="primary" plain :icon="Download">
        Экспорт
      </el-button>
    </div>

    <div class="history-content">
      <el-table 
        :data="history" 
        stripe 
        class="history-table"
        empty-text="История игр пуста"
      >
        <el-table-column prop="date" label="Дата" width="120">
          <template #default="{ row }">
            <div class="date-cell">
              <el-icon><Calendar /></el-icon>
              {{ formatDate(row.date) }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="tournament" label="Турнир" min-width="150">
          <template #default="{ row }">
            <div class="tournament-cell">
              <el-tag size="small" effect="plain">
                {{ row.tournament }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="role" label="Роль" width="120">
          <template #default="{ row }">
            <el-tag 
              :type="getRoleType(row.role)" 
              size="small"
              effect="dark"
            >
              <el-icon><User /></el-icon>
              {{ row.role }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="result" label="Результат" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="row.result === 'Победа' ? 'success' : 'danger'" 
              size="small"
              effect="dark"
            >
              <el-icon v-if="row.result === 'Победа'"><Check /></el-icon>
              <el-icon v-else><Close /></el-icon>
              {{ row.result }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="duration" label="Длительность" width="120">
          <template #default="{ row }">
            <div class="duration-cell">
              <el-icon><Timer /></el-icon>
              {{ row.duration }}
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Действия" width="80" fixed="right">
          <template #default="{ row }">
            <el-button 
              size="small" 
              type="primary" 
              text 
              :icon="View"
              @click="viewGame(row.id)"
            >
              Подробно
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Пагинация (для будущего использования) -->
      <div v-if="history.length > 10" class="history-pagination">
        <el-pagination
          layout="prev, pager, next"
          :total="history.length"
          :page-size="10"
          :current-page="1"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ElMessage } from 'element-plus'
  import { 
    Clock, 
    Download, 
    Calendar, 
    User, 
    Check, 
    Close, 
    Timer, 
    View 
  } from '@element-plus/icons-vue'

  const props = defineProps({
    history: {
      type: Array,
      required: true
    }
  })

  // Форматирование даты
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  // Определение типа тега для роли
  const getRoleType = (role) => {
    const roleTypes = {
      'Мирный житель': '',
      'Шериф': 'warning',
      'Мафия': 'danger',
      'Дон': 'danger'
    }
    return roleTypes[role] || ''
  }

  // Просмотр детальной информации об игре
  const viewGame = (gameId) => {
    ElMessage.info(`Просмотр игры #${gameId} будет реализован позже`)
  }
</script>

<style scoped>
  .profile-history {
    height: 100%;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .history-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .history-content {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
  }

  .history-table {
    background: white;
    border-radius: 8px;
    overflow: hidden;
  }

  .date-cell,
  .duration-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #606266;
    font-size: 13px;
  }

  .tournament-cell {
    display: flex;
    align-items: center;
  }

  .history-pagination {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }

  /* Кастомизация таблицы */
  .history-table :deep(.el-table__header) {
    background-color: #f5f7fa;
  }

  .history-table :deep(.el-table__header th) {
    background-color: #f5f7fa;
    color: #303133;
    font-weight: 600;
  }

  .history-table :deep(.el-table__row:hover td) {
    background-color: #f0f9ff;
  }

  .history-table :deep(.el-table__row.el-table__row--striped td) {
    background-color: #fafafa;
  }

  .history-table :deep(.el-table__row.el-table__row--striped:hover td) {
    background-color: #f0f9ff;
  }

  /* Адаптивность */
  @media (max-width: 768px) {
    .history-header {
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }

    .history-content {
      padding: 12px;
    }

    .history-table {
      font-size: 12px;
    }

    .history-table :deep(.el-table__cell) {
      padding: 8px 4px;
    }

    .date-cell,
    .duration-cell {
      font-size: 12px;
    }
  }

  @media (max-width: 480px) {
    .history-table :deep(.el-table__cell) {
      padding: 6px 2px;
    }
  }
</style>