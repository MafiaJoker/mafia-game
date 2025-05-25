<template>
  <el-dialog
    v-model="visible"
    title="Новая игра"
    width="400px"
    :before-close="handleClose"
    >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
      <el-form-item label="Название" prop="name">
        <el-input v-model="form.name" placeholder="Например: Игра #1" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">Отмена</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="loading">
        Создать игру
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, reactive, computed } from 'vue'
  import { apiService } from '@/services/api'
  import { ElMessage } from 'element-plus'

  const props = defineProps({
      modelValue: Boolean,
      eventId: Number,
      tableId: Number
  })

  const emit = defineEmits(['update:modelValue', 'game-created'])

  const formRef = ref()
  const loading = ref(false)

  const form = reactive({
      name: ''
  })

  const rules = {
      name: [
	  { required: true, message: 'Введите название игры', trigger: 'blur' }
      ]
  }

  const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
  })

  const handleClose = () => {
      visible.value = false
      formRef.value?.resetFields()
  }

  const handleSubmit = async () => {
      if (!formRef.value) return

      try {
	  await formRef.value.validate()
	  loading.value = true

	  const gameData = { ...form }
	  const newGame = await apiService.createGame(props.eventId, props.tableId, gameData)
	  
	  emit('game-created', newGame)
	  handleClose()
	  
      } catch (error) {
	  console.error('Ошибка создания игры:', error)
	  ElMessage.error('Ошибка при создании игры')
      } finally {
	  loading.value = false
      }
  }
</script>
