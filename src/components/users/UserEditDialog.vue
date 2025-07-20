<template>
  <el-dialog
    v-model="visible"
    title="Редактирование пользователя"
    width="500px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
    >
      <el-form-item label="Никнейм" prop="nickname">
        <el-input
          v-model="form.nickname"
          placeholder="Введите никнейм пользователя"
          clearable
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">Отмена</el-button>
        <el-button
          type="primary"
          @click="handleConfirm"
          :loading="loading"
        >
          Сохранить
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formRef = ref(null)
const loading = ref(false)
const form = ref({
  nickname: ''
})

const rules = {
  nickname: [
    { required: true, message: 'Никнейм обязателен', trigger: 'blur' },
    { min: 2, max: 50, message: 'Никнейм должен быть от 2 до 50 символов', trigger: 'blur' }
  ]
}

watch(() => props.user, (newUser) => {
  if (newUser) {
    form.value = {
      nickname: newUser.nickname || ''
    }
  }
}, { immediate: true })

const handleClose = () => {
  visible.value = false
  formRef.value?.resetFields()
}

const handleConfirm = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true
    
    emit('confirm', {
      userId: props.user.id,
      nickname: form.value.nickname
    })
    
    handleClose()
  } catch (error) {
    console.error('Form validation failed:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>