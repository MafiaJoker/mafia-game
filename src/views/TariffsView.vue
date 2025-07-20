<template>
  <div class="tariffs-view">
    <el-container>
      <el-header>
        <div class="page-header">
          <h1>Управление тарифами</h1>
          <el-button 
            type="primary" 
            @click="showCreateDialog = true"
            :icon="Plus"
          >
            Создать тариф
          </el-button>
        </div>
      </el-header>

      <el-main>
        <el-card>
          <el-table 
            :data="tariffs" 
            style="width: 100%"
            v-loading="loading"
            empty-text="Нет тарифов"
          >
            <el-table-column prop="label" label="Название" min-width="200" />
            <el-table-column prop="price" label="Цена" width="150">
              <template #default="{ row }">
                {{ formatPrice(row.price) }} {{ getCurrencySymbol(row.iso_4217_code) }}
              </template>
            </el-table-column>
            <el-table-column prop="iso_4217_code" label="Валюта" width="100" align="center" />
            <el-table-column label="Действия" width="180" align="center" fixed="right">
              <template #default="{ row }">
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="editTariff(row)"
                  :icon="Edit"
                  circle
                />
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="deleteTariff(row)"
                  :icon="Delete"
                  circle
                />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </el-container>

    <!-- Create/Edit Dialog -->
    <el-dialog 
      v-model="showCreateDialog" 
      :title="editingTariff ? 'Редактировать тариф' : 'Создать тариф'"
      width="500px"
      @close="handleDialogClose"
    >
      <el-form 
        ref="tariffFormRef"
        :model="tariffForm" 
        :rules="rules"
        label-width="140px"
      >
        <el-form-item label="Название" prop="label">
          <el-input v-model="tariffForm.label" placeholder="Введите название тарифа" />
        </el-form-item>
        
        <el-form-item label="Цена" prop="price">
          <el-input-number 
            v-model="tariffForm.price" 
            :min="0" 
            :step="100"
            :precision="2"
          />
        </el-form-item>
        
        <el-form-item label="Валюта" prop="iso_4217_code">
          <el-select v-model="tariffForm.iso_4217_code" placeholder="Выберите валюту">
            <el-option label="₽ Российский рубль (RUB)" value="RUB" />
            <el-option label="$ Доллар США (USD)" value="USD" />
            <el-option label="€ Евро (EUR)" value="EUR" />
            <el-option label="֏ Армянский драм (AMD)" value="AMD" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">Отмена</el-button>
        <el-button 
          type="primary" 
          @click="saveTariff"
          :loading="saving"
        >
          {{ editingTariff ? 'Сохранить' : 'Создать' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'

const loading = ref(false)
const saving = ref(false)
const tariffs = ref([])
const showCreateDialog = ref(false)
const editingTariff = ref(null)
const tariffFormRef = ref()

const tariffForm = ref({
  label: '',
  price: 0,
  iso_4217_code: 'RUB'
})

const rules = {
  label: [
    { required: true, message: 'Введите название тарифа', trigger: 'blur' }
  ],
  price: [
    { required: true, message: 'Введите цену', trigger: 'blur' },
    { type: 'number', min: 0, message: 'Цена не может быть отрицательной', trigger: 'blur' }
  ],
  iso_4217_code: [
    { required: true, message: 'Выберите валюту', trigger: 'blur' }
  ]
}

const loadTariffs = async () => {
  loading.value = true
  try {
    const response = await apiService.getTariffs()
    // Проверяем, является ли ответ объектом с полем items или массивом
    if (Array.isArray(response)) {
      tariffs.value = response
    } else if (response && response.items) {
      tariffs.value = response.items
    } else {
      tariffs.value = []
    }
  } catch (error) {
    console.error('Error loading tariffs:', error)
    ElMessage.error('Ошибка загрузки тарифов')
    tariffs.value = []
  } finally {
    loading.value = false
  }
}

const editTariff = (tariff) => {
  editingTariff.value = tariff
  tariffForm.value = { ...tariff }
  showCreateDialog.value = true
}

const saveTariff = async () => {
  const valid = await tariffFormRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    if (editingTariff.value) {
      await apiService.updateTariff(editingTariff.value.id, tariffForm.value)
      ElMessage.success('Тариф обновлен')
    } else {
      await apiService.createTariff(tariffForm.value)
      ElMessage.success('Тариф создан')
    }
    
    showCreateDialog.value = false
    await loadTariffs()
  } catch (error) {
    console.error('Error saving tariff:', error)
    ElMessage.error('Ошибка сохранения тарифа')
  } finally {
    saving.value = false
  }
}

const deleteTariff = async (tariff) => {
  try {
    await ElMessageBox.confirm(
      `Вы уверены, что хотите удалить тариф "${tariff.name}"?`,
      'Подтверждение удаления',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning'
      }
    )

    await apiService.deleteTariff(tariff.id)
    ElMessage.success('Тариф удален')
    await loadTariffs()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Error deleting tariff:', error)
      ElMessage.error('Ошибка удаления тарифа')
    }
  }
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price)
}

const getCurrencySymbol = (code) => {
  const symbols = {
    'RUB': '₽',
    'USD': '$',
    'EUR': '€',
    'AMD': '֏'
  }
  return symbols[code] || code
}

// Reset form when dialog closes
const handleDialogClose = () => {
  tariffForm.value = {
    label: '',
    price: 0,
    iso_4217_code: 'RUB'
  }
  editingTariff.value = null
  tariffFormRef.value?.resetFields()
}

onMounted(() => {
  loadTariffs()
})
</script>

<style scoped>
.tariffs-view {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.ml-2 {
  margin-left: 8px;
}
</style>