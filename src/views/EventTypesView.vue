<template>
  <div class="event-types-view">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>Категории мероприятий</h1>
          <el-button 
            type="primary"
            :icon="Plus"
            @click="showCreateDialog = true"
          >
            Создать категорию
          </el-button>
        </div>
      </el-header>

      <el-main>
        <!-- Фильтры и пагинация -->
        <PaginationFilter
          :total-items="totalTypes"
          items-label="категорий"
          search-placeholder="Поиск по названию..."
          :default-page-size="20"
          @filter-change="handleFilterChange"
        />

        <!-- Таблица категорий -->
        <el-card>
          <el-table 
            :data="paginatedTypes" 
            :loading="loading"
            style="width: 100%"
          >
            <el-table-column 
              prop="label" 
              label="Название" 
              min-width="200"
              sortable
            />
            
            <el-table-column
              prop="color"
              label="Цвет"
              width="100"
              align="center"
            >
              <template #default="scope">
                <div
                  v-if="scope.row.color"
                  class="color-preview"
                  :style="{ backgroundColor: scope.row.color }"
                />
              </template>
            </el-table-column>

            <el-table-column
              prop="is_ranked"
              label="Рейтинговая"
              width="120"
              align="center"
              sortable
            >
              <template #default="scope">
                <el-tag :type="scope.row.is_ranked ? 'success' : 'info'">
                  {{ scope.row.is_ranked ? 'Да' : 'Нет' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column
              label="Действия" 
              width="150"
              align="center"
              fixed="right"
            >
              <template #default="scope">
                <el-button-group>
                  <el-button 
                    size="small"
                    type="primary"
                    @click="handleEdit(scope.row)"
                    :icon="Edit"
                  />
                  <el-button
                    size="small"
                    type="danger"
                    @click="handleDelete(scope.row)"
                    :icon="Delete"
                  />
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </el-container>

    <!-- Диалог создания/редактирования категории -->
    <el-dialog 
      v-model="showDialog" 
      :title="dialogTitle" 
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="Название" prop="label">
          <el-input
            v-model="formData.label"
            placeholder="Введите название категории"
          />
        </el-form-item>

        <el-form-item label="Цвет" prop="color">
          <el-color-picker
            v-model="formData.color"
            :predefine="predefineColors"
          />
        </el-form-item>

        <el-form-item label="Рейтинговая" prop="is_ranked">
          <el-switch v-model="formData.is_ranked" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showDialog = false">Отмена</el-button>
        <el-button 
          type="primary" 
          @click="handleSubmit"
          :loading="submitting"
        >
          {{ isEdit ? 'Сохранить' : 'Создать' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { apiService } from '@/services/api'
import PaginationFilter from '@/components/common/PaginationFilter.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { UI_MESSAGES } from '@/utils/uiConstants'

// Состояние
const loading = ref(false)
const submitting = ref(false)
const showDialog = ref(false)
const showCreateDialog = ref(false)
const allTypes = ref([])
const filteredTypes = ref([])
const paginatedTypes = ref([])
const totalTypes = ref(0)
const isEdit = ref(false)
const editingId = ref(null)
const formRef = ref()

// Форма
const formData = reactive({
  label: '',
  color: '#409EFF',
  is_ranked: false
})

// Предустановленные цвета
const predefineColors = [
  '#409EFF',
  '#67C23A',
  '#E6A23C',
  '#F56C6C',
  '#909399',
  '#00CED1',
  '#FF6347',
  '#9370DB',
  '#20B2AA',
  '#FF1493'
]

// Правила валидации
const rules = {
  label: [
    { required: true, message: 'Введите название категории', trigger: 'blur' },
    { min: 3, max: 100, message: 'Длина должна быть от 3 до 100 символов', trigger: 'blur' }
  ]
}

// Фильтры
const filters = ref({
  search: '',
  page: 1,
  pageSize: 20
})

// Вычисляемые свойства
const dialogTitle = computed(() => isEdit.value ? 'Редактировать категорию' : 'Создать категорию')

// Методы
const loadTypes = async () => {
  loading.value = true
  try {
    const response = await apiService.getEventTypes()
    console.log('Event types response:', response)
    
    // Обрабатываем структуру ответа от API
    if (response && Array.isArray(response)) {
      allTypes.value = response
    } else if (response && response.items && Array.isArray(response.items)) {
      // API возвращает объект с пагинацией
      allTypes.value = response.items
    } else {
      console.warn('Unexpected response structure:', response)
      allTypes.value = []
    }
    
    applyFilters()
  } catch (error) {
    console.error('Error loading event types:', error)
    ElMessage.error(UI_MESSAGES.ERRORS.LOAD_FAILED)
    allTypes.value = []
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  let result = [...allTypes.value]
  
  // Поиск
  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    result = result.filter(type =>
      type.label.toLowerCase().includes(searchLower)
    )
  }
  
  filteredTypes.value = result
  totalTypes.value = result.length
  
  // Пагинация
  const start = (filters.value.page - 1) * filters.value.pageSize
  const end = start + filters.value.pageSize
  paginatedTypes.value = result.slice(start, end)
}

const handleFilterChange = (newFilters) => {
  filters.value = newFilters
  applyFilters()
}

const handleEdit = (type) => {
  isEdit.value = true
  editingId.value = type.id
  Object.assign(formData, {
    label: type.label,
    color: type.color || '#409EFF',
    is_ranked: type.is_ranked || false
  })
  showDialog.value = true
}

const handleDelete = async (type) => {
  try {
    await ElMessageBox.confirm(
      `Вы уверены, что хотите удалить категорию "${type.label}"?`,
      'Подтверждение',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning'
      }
    )

    await apiService.deleteEventType(type.id)
    ElMessage.success('Категория удалена')
    await loadTypes()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(UI_MESSAGES.ERRORS.DELETE_FAILED)
    }
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate()
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value) {
      await apiService.updateEventType(editingId.value, formData)
      ElMessage.success('Категория обновлена')
    } else {
      await apiService.createEventType(formData)
      ElMessage.success('Категория создана')
    }

    showDialog.value = false
    resetForm()
    await loadTypes()
  } catch (error) {
    // Проверяем специфичную ошибку для рейтинговых категорий
    if (error.response?.status === 400) {
      try {
        const errorData = await error.response.json()
        if (errorData.detail === 'only one ranked event type available') {
          ElMessage.error('Может быть только одна рейтинговая категория')
          return
        }
      } catch (parseError) {
        // Если не удалось распарсить JSON, используем стандартное сообщение
      }
    }
    ElMessage.error(UI_MESSAGES.ERRORS.SAVE_FAILED)
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  isEdit.value = false
  editingId.value = null
  Object.assign(formData, {
    label: '',
    color: '#409EFF',
    is_ranked: false
  })
  formRef.value?.resetFields()
}

// Хуки
onMounted(() => {
  loadTypes()
})

// Открытие диалога создания
watch(showCreateDialog, (val) => {
  if (val) {
    resetForm()
    showDialog.value = true
    showCreateDialog.value = false
  }
})
</script>

<style scoped>
.event-types-view {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  width: 100%;
}

.color-preview {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    padding: 16px 0;
  }
  
  .header-content h1 {
    margin: 0;
  }
}
</style>