<template>
  <el-dialog
    v-model="visible"
    title="Новый стол"
    width="500px"
    :before-close="handleClose"
    >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
      <el-form-item label="Название" prop="name">
        <el-input v-model="form.name" placeholder="Например: Стол 1" />
      </el-form-item>

      <el-form-item label="Судья" prop="judge">
        <el-input v-model="form.judge" placeholder="Имя судьи" />
      </el-form-item>

      <el-form-item label="Тип рассадки" prop="seatingType">
        <el-radio-group v-model="form.seatingType">
          <el-radio value="free">Свободная рассадка</el-radio>
          <el-radio value="fixed">Заданная рассадка</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">Отмена</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="loading">
        Создать стол
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
      eventId: String
  })

  const emit = defineEmits(['update:modelValue', 'table-created'])

  const formRef = ref()
  const loading = ref(false)

  const form = reactive({
      name: '',
      judge: '',
      seatingType: 'free',
      capacity: 10
  })

  const rules = {
      name: [
	  { required: true, message: 'Введите название стола', trigger: 'blur' }
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

	  // Создаем виртуальный стол локально
	  const newTable = {
	      table_name: form.name,
	      game_masters: form.judge ? [{
		  id: `temp-${Date.now()}`,
		  nickname: form.judge,
		  first_name: form.judge,
		  last_name: ''
	      }] : [],
	      games: [],
	      isVirtual: true // Флаг для обозначения временного стола
	  }
	  
	  emit('table-created', newTable)
	  ElMessage.success('Временный стол создан. Для сохранения создайте игру на этом столе.')
	  handleClose()
	  
      } catch (error) {
	  console.error('Ошибка создания стола:', error)
	  ElMessage.error('Ошибка при создании стола')
      } finally {
	  loading.value = false
      }
  }
</script>
