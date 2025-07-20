<template>
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

    <el-form-item label="Количество столов" prop="tables_count">
      <el-input-number
	v-model="form.tables_count"
	:min="1"
	:max="20"
	controls-position="right"
	style="width: 100%"
	/>
    </el-form-item>

    <el-form-item>
      <el-button
	type="primary"
	@click="handleSubmit"
	:loading="loading"
	style="width: 100%"
	>
	Создать мероприятие
      </el-button>
    </el-form-item>
  </el-form>
</template>

<script setup>
  import { ref, reactive, onMounted } from 'vue'
  import { useEventsStore } from '@/stores/events'
  import { useEventTypesStore } from '@/stores/eventTypes'
  import { ElMessage } from 'element-plus'

  const emit = defineEmits(['event-created'])

  const eventsStore = useEventsStore()
  const eventTypesStore = useEventTypesStore()
  const eventTypes = ref([])

  const formRef = ref()
  const loading = ref(false)

  const form = reactive({
      label: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      language: 'rus',
      event_type_id: '',
      tables_count: 1,
      table_name_template: 'Стол {}'
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
      tables_count: [
	  { required: true, message: 'Укажите количество столов', trigger: 'blur' },
	  { type: 'number', min: 1, max: 20, message: 'Количество столов должно быть от 1 до 20', trigger: 'blur' }
      ]
  }

  const generateDefaultValues = () => {
      // Генерируем название по умолчанию
      const eventsCount = eventsStore.events.length
      form.label = `Игровой вечер #${eventsCount + 1}`

      // Генерируем описание
      const today = new Date()
      const currentMonth = today.getMonth()
      const currentYear = today.getFullYear()

      const monthNames = [
	  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
	  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
      ]

      form.description = `Игровой вечер за ${monthNames[currentMonth]} ${currentYear} года.`

      // Устанавливаем первый доступный тип события
      if (eventTypes.value.length > 0) {
          form.event_type_id = eventTypes.value[0].id
      }
  }

  const handleSubmit = async () => {
      if (!formRef.value) return

      try {
	  await formRef.value.validate()
	  loading.value = true

	  const { tables_count, ...eventData } = form
	  // Ожидаем ответ от сервера перед любыми действиями
	  const newEvent = await eventsStore.createEvent(eventData)

	  // Проверяем, что событие успешно создано
	  if (newEvent && newEvent.id) {
	      ElMessage.success('Мероприятие успешно создано!')
	      emit('event-created', newEvent)

	      // Сбрасываем форму и генерируем новые значения по умолчанию
	      formRef.value.resetFields()
	      generateDefaultValues()
	  } else {
	      ElMessage.error('Не удалось создать мероприятие')
	  }

      } catch (error) {
	  console.error('Ошибка создания мероприятия:', error)
	  ElMessage.error(error.response?.data?.message || 'Ошибка при создании мероприятия')
      } finally {
	  loading.value = false
      }
  }

  onMounted(async () => {
      try {
          await eventTypesStore.loadEventTypes()
          eventTypes.value = eventTypesStore.eventTypes
          generateDefaultValues()
      } catch (error) {
          console.error('Ошибка загрузки типов событий:', error)
      }
  })
</script>
