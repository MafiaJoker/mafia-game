<template>
  <el-form 
    ref="formRef"
    :model="form" 
    :rules="rules" 
    label-width="140px"
    @submit.prevent="handleSubmit"
    >
    <el-form-item label="Название" prop="name">
      <el-input 
	v-model="form.name" 
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

    <el-form-item label="Дата" prop="date">
      <el-date-picker
	v-model="form.date"
	type="date"
	placeholder="Выберите дату"
	format="DD.MM.YYYY"
	value-format="YYYY-MM-DD"
	style="width: 100%"
	/>
    </el-form-item>

    <el-form-item label="Язык" prop="language">
      <el-select v-model="form.language" style="width: 100%">
	<el-option label="Русский" value="ru" />
	<el-option label="English" value="en" />
	<el-option label="Հայերեն" value="am" />
      </el-select>
    </el-form-item>

    <el-form-item label="Категория" prop="category">
      <el-select v-model="form.category" style="width: 100%">
	<el-option label="Фанки" value="funky" />
	<el-option label="Миникап" value="minicap" />
	<el-option label="Турнир" value="tournament" />
	<el-option label="Благотворительный турнир" value="charity_tournament" />
      </el-select>
    </el-form-item>

    <el-form-item label="Статус" prop="status">
      <el-select v-model="form.status" style="width: 100%">
	<el-option label="В планах" value="planned" />
	<el-option label="Активно" value="active" />
	<el-option label="Завершено" value="completed" />
      </el-select>
    </el-form-item>

    <el-form-item label="Ведущий" prop="judgeId">
      <el-select 
	v-model="form.judgeId" 
	placeholder="Выберите ведущего"
	style="width: 100%"
	clearable
	>
	<el-option
	  v-for="judge in judges"
	  :key="judge.id"
	  :label="judge.name"
	  :value="judge.id"
	  />
      </el-select>
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
  import { useJudgesStore } from '@/stores/judges'
  import { ElMessage } from 'element-plus'

  const emit = defineEmits(['event-created'])

  const eventsStore = useEventsStore()
  const judgesStore = useJudgesStore()

  const formRef = ref()
  const loading = ref(false)
  const judges = ref([])

  const form = reactive({
      name: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      language: 'ru',
      category: 'funky',
      status: 'planned',
      judgeId: null
  })

  const rules = {
      name: [
	  { required: true, message: 'Введите название мероприятия', trigger: 'blur' }
      ],
      date: [
	  { required: true, message: 'Выберите дату', trigger: 'change' }
      ],
      language: [
	  { required: true, message: 'Выберите язык', trigger: 'change' }
      ]
  }

  const generateDefaultValues = () => {
      // Генерируем название по умолчанию
      const funkyEvents = eventsStore.events.filter(event => event.category === 'funky')
      form.name = `Игровой вечер #${funkyEvents.length + 1}`

      // Генерируем описание
      const today = new Date()
      const currentMonth = today.getMonth()
      const currentYear = today.getFullYear()

      const currentMonthFunkyEvents = eventsStore.events.filter(event => {
	  if (event.category !== 'funky') return false

	  const eventDate = new Date(event.date)
	  return eventDate.getMonth() === currentMonth && 
	      eventDate.getFullYear() === currentYear
      })

      const gameNumber = currentMonthFunkyEvents.length + 1
      const monthNames = [
	  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
	  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
      ]

      form.description = `Игровой вечер #${gameNumber} за ${monthNames[currentMonth]} ${currentYear} года.`

      // Устанавливаем ведущего по умолчанию
      const defaultJudgeId = localStorage.getItem('defaultJudgeId')
      if (defaultJudgeId && judges.value.some(judge => judge.id == defaultJudgeId)) {
	  form.judgeId = parseInt(defaultJudgeId)
      }
  }

  const handleSubmit = async () => {
      if (!formRef.value) return

      try {
	  await formRef.value.validate()
	  loading.value = true

	  const eventData = { ...form }
	  const newEvent = await eventsStore.createEvent(eventData)

	  ElMessage.success('Мероприятие успешно создано!')
	  emit('event-created', newEvent)

	  // Сбрасываем форму и генерируем новые значения по умолчанию
	  formRef.value.resetFields()
	  generateDefaultValues()

      } catch (error) {
	  console.error('Ошибка создания мероприятия:', error)
	  ElMessage.error('Ошибка при создании мероприятия')
      } finally {
	  loading.value = false
      }
  }

  onMounted(async () => {
      judges.value = judgesStore.judges
      generateDefaultValues()
  })
</script>
