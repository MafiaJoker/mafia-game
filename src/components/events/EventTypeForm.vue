<template>
  <el-form 
    ref="formRef"
    :model="form" 
    :rules="rules" 
    label-width="120px"
    @submit.prevent="handleSubmit"
    >
    <el-form-item label="Название" prop="label">
      <el-input 
        v-model="form.label" 
        placeholder="Введите название категории"
        maxlength="100"
        show-word-limit
        />
    </el-form-item>

    <el-form-item label="Цвет" prop="color">
      <div class="color-picker-container">
        <el-color-picker 
          v-model="form.color" 
          :predefine="predefinedColors"
          show-alpha
          size="large"
        />
        <div class="color-preview" :style="{ backgroundColor: form.color }">
          <span class="preview-text">{{ form.label || 'Пример' }}</span>
        </div>
      </div>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="handleSubmit" :loading="loading">
        {{ isEdit ? 'Обновить' : 'Создать' }}
      </el-button>
      <el-button @click="$emit('cancel')">Отмена</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup>
  import { ref, reactive, watch } from 'vue'
  import { ElMessage } from 'element-plus'

  const props = defineProps({
    eventType: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['submit', 'cancel'])

  const formRef = ref()
  const isEdit = ref(!!props.eventType)

  const form = reactive({
    label: '',
    color: '#409eff'
  })

  const predefinedColors = [
    '#e53e3e', // Красный - турниры
    '#dd6b20', // Оранжевый - чемпионаты  
    '#38a169', // Зелёный - тренировки
    '#805ad5', // Фиолетовый - соревнования
    '#d53f8c', // Розовый - фестивали
    '#0987a0', // Бирюзовый - мастер-классы
    '#3182ce', // Синий - по умолчанию
    '#718096', // Серый
    '#f56565', // Светло-красный
    '#ed8936', // Светло-оранжевый
    '#48bb78', // Светло-зелёный
    '#9f7aea'  // Светло-фиолетовый
  ]

  const rules = {
    label: [
      { required: true, message: 'Название обязательно', trigger: 'blur' },
      { min: 2, max: 100, message: 'Длина от 2 до 100 символов', trigger: 'blur' }
    ],
    color: [
      { required: true, message: 'Выберите цвет', trigger: 'change' }
    ]
  }


  // Заполняем форму при редактировании
  watch(() => props.eventType, (newEventType) => {
    if (newEventType) {
      Object.assign(form, {
        label: newEventType.label || '',
        color: newEventType.color || '#409eff'
      })
      isEdit.value = true
    } else {
      resetForm()
      isEdit.value = false
    }
  }, { immediate: true })

  const resetForm = () => {
    Object.assign(form, {
      label: '',
      color: '#409eff'
    })
    formRef.value?.clearValidate()
  }

  const handleSubmit = async () => {
    try {
      await formRef.value.validate()
      emit('submit', { ...form })
    } catch (error) {
      ElMessage.error('Проверьте правильность заполнения формы')
    }
  }

  defineExpose({
    resetForm
  })
</script>

<style scoped>
  .el-form {
    max-width: 500px;
  }

  .color-picker-container {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .color-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 120px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid #dcdfe6;
    transition: all 0.3s ease;
  }

  .preview-text {
    color: white;
    font-size: 12px;
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    padding: 0 8px;
    text-align: center;
  }

  .color-preview:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
</style>