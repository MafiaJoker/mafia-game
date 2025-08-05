<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="Редактировать мероприятие"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="140px"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="Название" prop="label">
        <el-input
          v-model="form.label"
          placeholder="Игровой вечер #1"
        />
      </el-form-item>

      <el-form-item label="Описание" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="Описание мероприятия"
        />
      </el-form-item>

      <el-form-item label="Дата" prop="start_date">
        <el-date-picker
          v-model="form.start_date"
          type="date"
          placeholder="Выберите дату"
          format="DD.MM.YYYY"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="Язык" prop="language">
        <el-select v-model="form.language" style="width: 100%">
          <el-option label="Русский" value="rus" />
          <el-option label="English" value="eng" />
          <el-option label="Հայերեն" value="arm" />
        </el-select>
      </el-form-item>

      <el-form-item label="Категория" prop="event_type_id" v-if="eventTypes.length > 0">
        <el-select v-model="form.event_type_id" style="width: 100%" placeholder="Выберите категорию">
          <el-option 
            v-for="eventType in eventTypes" 
            :key="eventType.id" 
            :label="eventType.label" 
            :value="eventType.id" 
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Шаблон столов" prop="table_name_template">
        <el-input
          v-model="form.table_name_template"
          placeholder="Стол {}"
        />
      </el-form-item>

      <el-form-item label="Статус" prop="status">
        <el-select v-model="form.status" style="width: 100%">
          <el-option label="Запланировано" value="planned" />
          <el-option label="Активно" value="active" />
          <el-option label="Завершено" value="completed" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="$emit('update:visible', false)">Отмена</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">
          Сохранить изменения
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, reactive, watch, onMounted } from 'vue'
  import { useEventsStore } from '@/stores/events'
  import { useEventTypesStore } from '@/stores/eventTypes'
  import { ElMessage } from 'element-plus'

  const props = defineProps({
    visible: {
      type: Boolean,
      default: false
    },
    event: {
      type: Object,
      default: null
    }
  })

  const emit = defineEmits(['update:visible', 'event-updated'])

  const eventsStore = useEventsStore()
  const eventTypesStore = useEventTypesStore()
  const eventTypes = ref([])

  const formRef = ref()
  const loading = ref(false)

  const form = reactive({
    label: '',
    description: '',
    start_date: '',
    language: 'rus',
    event_type_id: '',
    table_name_template: 'Стол {}',
    status: 'planned'
  })

  const rules = {
    label: [
      { required: true, message: 'Введите название мероприятия', trigger: 'blur' }
    ],
    start_date: [
      { required: true, message: 'Выберите дату', trigger: 'change' }
    ],
    language: [
      { required: true, message: 'Выберите язык', trigger: 'change' }
    ],
    status: [
      { required: true, message: 'Выберите статус', trigger: 'change' }
    ]
  }

  // Заполняем форму данными события при изменении props.event
  watch(() => props.event, (newEvent) => {
    if (newEvent) {
      form.label = newEvent.label || ''
      form.description = newEvent.description || ''
      form.start_date = newEvent.start_date || ''
      form.language = newEvent.language || 'rus'
      form.event_type_id = newEvent.event_type_id || ''
      form.table_name_template = newEvent.table_name_template || 'Стол {}'
      form.status = newEvent.status || 'planned'
    }
  }, { immediate: true })

  const handleSubmit = async () => {
    if (!formRef.value || !props.event) return

    try {
      await formRef.value.validate()
      loading.value = true

      const updatedEvent = await eventsStore.updateEvent(props.event.id, form)

      if (updatedEvent) {
        ElMessage.success('Мероприятие успешно обновлено!')
        emit('event-updated', updatedEvent)
        emit('update:visible', false)
      } else {
        ElMessage.error('Не удалось обновить мероприятие')
      }

    } catch (error) {
      console.error('Ошибка обновления мероприятия:', error)
      ElMessage.error(error.response?.data?.message || 'Ошибка при обновлении мероприятия')
    } finally {
      loading.value = false
    }
  }

  onMounted(async () => {
    try {
      await eventTypesStore.loadEventTypes()
      eventTypes.value = eventTypesStore.eventTypes
    } catch (error) {
      console.error('Ошибка загрузки типов событий:', error)
    }
  })
</script>

<style scoped>
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
</style>