<template>
  <el-dialog
    v-model="visible"
    title="Редактировать стол"
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
        Сохранить изменения
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, reactive, computed, watch } from 'vue'
  import { apiService } from '@/services/api'
  import { ElMessage } from 'element-plus'

  const props = defineProps({
      modelValue: Boolean,
      eventId: String,
      table: Object
  })

  const emit = defineEmits(['update:modelValue', 'table-updated'])

  const formRef = ref()
  const loading = ref(false)

  const form = reactive({
      name: '',
      judge: '',
      seatingType: 'free'
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

	  const tableData = { ...form }
	  await apiService.updateTable(props.eventId, props.table.id, tableData)
	  
	  emit('table-updated')
	  handleClose()
	  
      } catch (error) {
	  console.error('Ошибка обновления стола:', error)
	  ElMessage.error('Ошибка при обновлении стола')
      } finally {
	  loading.value = false
      }
  }

  // Заполняем форму данными стола при открытии
  watch(() => props.table, (newTable) => {
      if (newTable) {
	  form.name = newTable.name || ''
	  form.judge = newTable.judge || ''
	  form.seatingType = newTable.seatingType || 'free'
      }
  }, { immediate: true })
</script>
