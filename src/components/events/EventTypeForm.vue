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
    label: ''
  })

  const rules = {
    label: [
      { required: true, message: 'Название обязательно', trigger: 'blur' },
      { min: 2, max: 100, message: 'Длина от 2 до 100 символов', trigger: 'blur' }
    ]
  }


  // Заполняем форму при редактировании
  watch(() => props.eventType, (newEventType) => {
    if (newEventType) {
      Object.assign(form, {
        label: newEventType.label || ''
      })
      isEdit.value = true
    } else {
      resetForm()
      isEdit.value = false
    }
  }, { immediate: true })

  const resetForm = () => {
    Object.assign(form, {
      label: ''
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
</style>