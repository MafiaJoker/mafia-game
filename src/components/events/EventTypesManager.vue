<template>
  <div class="event-types-manager">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><Collection /></el-icon>
            <span>Управление категориями событий</span>
          </div>
          <el-button 
            type="primary" 
            @click="showCreateDialog = true"
            >
            <el-icon><Plus /></el-icon>
            Добавить категорию
          </el-button>
        </div>
      </template>

      <!-- Таблица категорий -->
      <el-table 
        :data="eventTypesStore.sortedEventTypes" 
        :loading="eventTypesStore.loading"
        v-loading="eventTypesStore.loading"
        stripe
        >
        <el-table-column prop="label" label="Название" min-width="150" />
        <el-table-column label="Действия" width="140" align="center">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              size="small" 
              @click="editEventType(row)"
              >
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="confirmDelete(row)"
              >
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Пустое состояние -->
      <el-empty 
        v-if="!eventTypesStore.loading && eventTypesStore.eventTypes.length === 0"
        description="Категории событий не найдены"
        >
        <el-button type="primary" @click="showCreateDialog = true">
          Создать первую категорию
        </el-button>
      </el-empty>
    </el-card>

    <!-- Диалог создания/редактирования -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingEventType ? 'Редактировать категорию' : 'Создать категорию'"
      width="600px"
      :close-on-click-modal="false"
      >
      <EventTypeForm
        :event-type="editingEventType"
        :loading="submitLoading"
        @submit="handleSubmit"
        @cancel="closeDialog"
        />
    </el-dialog>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useEventTypesStore } from '@/stores/eventTypes'
  import EventTypeForm from './EventTypeForm.vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { 
    Collection, 
    Plus, 
    Edit, 
    Delete 
  } from '@element-plus/icons-vue'

  const eventTypesStore = useEventTypesStore()
  
  const showCreateDialog = ref(false)
  const editingEventType = ref(null)
  const submitLoading = ref(false)

  const editEventType = (eventType) => {
    editingEventType.value = eventType
    showCreateDialog.value = true
  }

  const closeDialog = () => {
    showCreateDialog.value = false
    editingEventType.value = null
  }

  const handleSubmit = async (formData) => {
    submitLoading.value = true
    try {
      if (editingEventType.value) {
        await eventTypesStore.updateEventType(editingEventType.value.id, formData)
        ElMessage.success('Категория обновлена!')
      } else {
        await eventTypesStore.createEventType(formData)
        ElMessage.success('Категория создана!')
      }
      closeDialog()
    } catch (error) {
      ElMessage.error('Ошибка при сохранении категории')
    } finally {
      submitLoading.value = false
    }
  }

  const confirmDelete = async (eventType) => {
    try {
      await ElMessageBox.confirm(
        `Вы уверены, что хотите удалить категорию "${eventType.label}"?`,
        'Подтверждение удаления',
        {
          confirmButtonText: 'Удалить',
          cancelButtonText: 'Отмена',
          type: 'warning'
        }
      )

      const success = await eventTypesStore.deleteEventType(eventType.id)
      if (success) {
        ElMessage.success('Категория удалена!')
      } else {
        ElMessage.error('Ошибка удаления категории')
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('Ошибка удаления категории')
      }
    }
  }

  onMounted(async () => {
    try {
      await eventTypesStore.loadEventTypes()
    } catch (error) {
      ElMessage.error('Ошибка загрузки категорий')
    }
  })
</script>

<style scoped>
  .event-types-manager {
    padding: 20px;
    background-color: #f5f7fa;
    min-height: 100vh;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .event-types-manager {
      padding: 10px;
    }

    .card-header {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
    }
  }
</style>