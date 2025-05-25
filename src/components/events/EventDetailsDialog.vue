<template>
  <el-dialog
    v-model="visible"
    :title="event?.name || 'Детали мероприятия'"
    width="80%"
    :before-close="handleClose"
    >
    <div v-if="event" class="event-details">
      <!-- Информация о мероприятии -->
      <el-row :gutter="20" class="mb-4">
        <el-col :md="16">
          <div class="event-badges mb-3">
            <el-tag 
              :type="getStatusTagType(event.status)" 
              class="mr-2"
              >
              {{ getStatusLabel(event.status) }}
            </el-tag>
            <el-tag type="info">
              {{ getCategoryLabel(event.category) }}
            </el-tag>
          </div>
          
          <h6 class="section-title">Описание:</h6>
          <p>{{ event.description || 'Описание отсутствует' }}</p>
        </el-col>
        
        <el-col :md="8">
          <el-card class="info-card">
            <div class="info-item">
              <el-icon><Calendar /></el-icon>
              <div>
                <div class="info-label">Дата проведения</div>
                <div class="info-value">{{ formatDate(event.date) }}</div>
              </div>
            </div>
            
            <div class="info-item">
              <el-icon><Message /></el-icon>
              <div>
                <div class="info-label">Язык</div>
                <div class="info-value">{{ getLanguageLabel(event.language) }}</div>
              </div>
            </div>
            
            <div class="info-item">
              <el-icon><User /></el-icon>
              <div>
                <div class="info-label">Столы</div>
                <div class="info-value">
                  {{ event.tables.length }} {{ getTableNoun(event.tables.length) }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Управление статусом -->
      <div class="status-controls mb-4">
        <h6 class="section-title">Статус мероприятия:</h6>
        <el-radio-group 
          :model-value="event.status" 
          @change="handleStatusChange"
          >
          <el-radio-button label="planned">В планах</el-radio-button>
          <el-radio-button label="active">Активно</el-radio-button>
          <el-radio-button label="completed">Завершено</el-radio-button>
        </el-radio-group>
      </div>

      <!-- Список столов -->
      <div class="tables-section">
        <div class="section-header">
          <h6 class="section-title">Игровые столы</h6>
          <el-button 
            v-if="event.status !== 'completed'"
            type="primary" 
            size="small"
            @click="showCreateTable = true"
            >
            <el-icon><Plus /></el-icon>
            Добавить стол
          </el-button>
        </div>
        
        <TablesGrid 
          :tables="event.tables"
          :event-id="event.id"
          :readonly="event.status === 'completed'"
          @table-updated="handleTableUpdated"
          @table-deleted="handleTableDeleted"
          />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">Закрыть</el-button>
        <el-button 
          type="primary" 
          @click="navigateToEvent"
          >
          Перейти к мероприятию
        </el-button>
        <el-button 
          type="danger" 
          @click="handleDelete"
          >
          Удалить мероприятие
        </el-button>
      </div>
    </template>

    <!-- Диалог создания стола -->
    <CreateTableDialog
      v-model="showCreateTable"
      :event-id="event?.id"
      @table-created="handleTableCreated"
      />
  </el-dialog>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import TablesGrid from './TablesGrid.vue'
  import CreateTableDialog from './CreateTableDialog.vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { 
      Calendar, 
      Message, 
      User, 
      Plus 
  } from '@element-plus/icons-vue'

  const props = defineProps({
      modelValue: Boolean,
      event: Object
  })

  const emit = defineEmits(['update:modelValue', 'updateEvent', 'deleteEvent'])

  const router = useRouter()
  const showCreateTable = ref(false)

  const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
  })

  // Те же вспомогательные функции, что и в EventsList
  const getStatusLabel = (status) => {
      const labels = {
	  'planned': 'В планах',
	  'active': 'Активно', 
	  'completed': 'Завершено'
      }
      return labels[status] || 'Неизвестно'
  }

  const getStatusTagType = (status) => {
      const types = {
	  'planned': '',
	  'active': 'success',
	  'completed': 'info'
      }
      return types[status] || ''
  }

  const getCategoryLabel = (category) => {
      const labels = {
	  'funky': 'Фанки',
	  'minicap': 'Миникап', 
	  'tournament': 'Турнир',
	  'charity_tournament': 'Благотворительный'
      }
      return labels[category] || 'Фанки'
  }

  const getLanguageLabel = (language) => {
      const labels = {
	  'ru': 'Русский',
	  'en': 'English',
	  'am': 'Հայերեն'
      }
      return labels[language] || 'Русский'
  }

  const getTableNoun = (count) => {
      const n = Math.abs(count) % 100
      if (n >= 5 && n <= 20) return 'столов'
      
      const lastDigit = n % 10
      if (lastDigit === 1) return 'стол'
      if (lastDigit >= 2 && lastDigit <= 4) return 'стола'
      return 'столов'
  }

  const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('ru-RU', {
	  day: '2-digit',
	  month: 'long', 
	  year: 'numeric'
      })
  }

  const handleClose = () => {
      visible.value = false
  }

  const handleStatusChange = async (newStatus) => {
      if (newStatus === 'completed') {
	  try {
	      await ElMessageBox.confirm(
		  'Вы уверены, что хотите завершить мероприятие? После завершения нельзя будет добавлять столы и игры.',
		  'Подтверждение',
		  {
		      confirmButtonText: 'Да',
		      cancelButtonText: 'Отмена',
		      type: 'warning'
		  }
	      )
	  } catch {
	      return // Отмена
	  }
      }
      
      emit('updateEvent', props.event.id, { status: newStatus })
  }

  const handleTableCreated = (table) => {
      ElMessage.success('Стол успешно создан!')
      showCreateTable.value = false
      // Обновляем событие
      emit('updateEvent', props.event.id, {})
  }

  const handleTableUpdated = () => {
      emit('updateEvent', props.event.id, {})
  }

  const handleTableDeleted = () => {
      emit('updateEvent', props.event.id, {})
  }

  const navigateToEvent = () => {
      router.push(`/event/${props.event.id}`)
      handleClose()
  }

  const handleDelete = () => {
      emit('deleteEvent', props.event.id)
  }
</script>

<style scoped>
  .event-details {
      padding: 16px 0;
  }

  .event-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
  }

  .section-title {
      margin: 0 0 12px 0;
      font-weight: 600;
      color: #303133;
  }

  .info-card {
      background-color: #f5f7fa;
  }

  .info-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
  }

  .info-item:last-child {
      margin-bottom: 0;
  }

  .info-label {
      font-weight: 600;
      color: #606266;
      font-size: 14px;
  }

  .info-value {
      color: #303133;
      font-size: 14px;
  }

  .status-controls {
      padding: 16px 0;
      border-top: 1px solid #ebeef5;
      border-bottom: 1px solid #ebeef5;
  }

  .tables-section {
      margin-top: 24px;
  }

  .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
  }

  .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
  }

  .mb-3 {
      margin-bottom: 12px;
  }

  .mb-4 {
      margin-bottom: 16px;
  }

  .mr-2 {
      margin-right: 8px;
  }
</style>
