<template>
  <div class="tables-grid">
    <div v-if="tables.length === 0" class="no-tables">
      <el-empty description="У этого мероприятия еще нет столов" />
    </div>

    <div v-else class="tables-container">
      <el-card 
        v-for="table in tables"
        :key="table.id"
        class="table-card"
        shadow="hover"
        >
        <template #header>
          <div class="table-header">
            <h6 class="table-name">{{ table.name }}</h6>
            <div v-if="!readonly" class="table-actions">
              <el-button 
                type="primary" 
                size="small" 
                circle
                @click="editTable(table)"
                >
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                circle
                @click="deleteTable(table.id)"
                >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </template>

        <div class="table-content">
          <div class="table-info">
            <div class="info-row">
              <span class="info-label">Тип рассадки:</span>
              <el-tag 
                :type="table.seatingType === 'free' ? 'success' : 'primary'"
                size="small"
                >
                {{ table.seatingType === 'free' ? 'Свободная' : 'Заданная' }}
              </el-tag>
            </div>
            
            <div v-if="table.judge" class="info-row">
              <span class="info-label">Судья:</span>
              <span class="info-value">{{ table.judge }}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Игры:</span>
              <el-tag type="info" size="small">
                {{ table.games?.length || 0 }} {{ getGameNoun(table.games?.length || 0) }}
              </el-tag>
            </div>
          </div>

          <div class="table-footer">
            <el-button 
              type="primary" 
              size="small"
              @click="openTable(table)"
              style="width: 100%"
              >
              <el-icon><Grid /></el-icon>
              Открыть стол
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- Диалог редактирования стола -->
    <EditTableDialog
      v-model="showEditDialog"
      :event-id="eventId"
      :table="editingTable"
      @table-updated="handleTableUpdated"
      />
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import EditTableDialog from './EditTableDialog.vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { apiService } from '@/services/api'
  import { 
      Edit, 
      Delete, 
      Grid 
  } from '@element-plus/icons-vue'

  const props = defineProps({
      tables: {
	  type: Array,
	  default: () => []
      },
      eventId: {
	  type: Number,
	  required: true
      },
      readonly: {
	  type: Boolean,
	  default: false
      }
  })

  const emit = defineEmits(['table-updated', 'table-deleted'])

  const router = useRouter()
  const showEditDialog = ref(false)
  const editingTable = ref(null)

  const getGameNoun = (count) => {
      const n = Math.abs(count) % 100
      if (n >= 5 && n <= 20) return 'игр'
      
      const lastDigit = n % 10
      if (lastDigit === 1) return 'игра'
      if (lastDigit >= 2 && lastDigit <= 4) return 'игры'
      return 'игр'
  }

  const editTable = (table) => {
      editingTable.value = table
      showEditDialog.value = true
  }

  const deleteTable = async (tableId) => {
      try {
	  await ElMessageBox.confirm(
	      'Вы уверены, что хотите удалить этот стол?',
	      'Подтверждение',
	      {
		  confirmButtonText: 'Да',
		  cancelButtonText: 'Отмена',
		  type: 'warning'
	      }
	  )

	  await apiService.deleteTable(props.eventId, tableId)
	  emit('table-deleted', tableId)
	  ElMessage.success('Стол удален!')
	  
      } catch (error) {
	  if (error !== 'cancel') {
	      ElMessage.error('Ошибка при удалении стола')
	  }
      }
  }

  const openTable = (table) => {
      router.push(`/event/${props.eventId}?table=${table.id}`)
  }

  const handleTableUpdated = () => {
      emit('table-updated')
      showEditDialog.value = false
      ElMessage.success('Стол обновлен!')
  }
</script>

<style scoped>
  .tables-grid {
      min-height: 200px;
  }

  .no-tables {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
  }

  .tables-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
  }

  .table-card {
      transition: all 0.3s ease;
  }

  .table-card:hover {
      transform: translateY(-2px);
  }

  .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
  }

  .table-name {
      margin: 0;
      font-weight: 600;
      color: #303133;
  }

  .table-actions {
      display: flex;
      gap: 8px;
  }

  .table-content {
      padding: 8px 0;
  }

  .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
  }

  .info-row:last-child {
      margin-bottom: 0;
  }

  .info-label {
      font-size: 14px;
      color: #606266;
      font-weight: 500;
  }

  .info-value {
      font-size: 14px;
      color: #303133;
  }

  .table-footer {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #ebeef5;
  }

  @media (max-width: 768px) {
      .tables-container {
	  grid-template-columns: 1fr;
      }
  }
</style>
