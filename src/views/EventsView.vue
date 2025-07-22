<template>
  <div class="events-view">
    <el-container>
      <el-header>
	<div class="header-content">
	  <h1>Мероприятия Мафии</h1>
	  <el-button 
	    type="warning" 
	    size="small"
	    @click="showTestDataGenerator = true"
	    v-if="isDevelopment"
	  >
	    <el-icon><Tools /></el-icon>
	    Генератор тестовых данных
	  </el-button>
	</div>
      </el-header>

      <el-main>

	<el-row :gutter="20">
	  <!-- Форма создания мероприятия -->
	  <el-col :lg="10" :md="12" :sm="24">
	    <el-card>
	      <template #header>
		<div class="card-header">
		  <el-icon><Plus /></el-icon>
		  <span>Создать новое мероприятие</span>
		</div>
	      </template>

	      <CreateEventForm @event-created="handleEventCreated" />
	    </el-card>
	  </el-col>

	  <!-- Список активных мероприятий -->
	  <el-col :lg="14" :md="12" :sm="24">
	    <el-card class="events-card">
	      <template #header>
		<div class="card-header">
		  <div class="header-left">
		    <el-icon><Calendar /></el-icon>
		    <span>Активные мероприятия</span>
		  </div>
		  <div class="header-right">
		    <el-button 
		      type="primary" 
		      size="small"
		      @click="openCalendar"
		      :icon="Calendar"
		    >
		      Календарь мероприятий
		    </el-button>
		    <el-input
		      v-model="searchTerm"
		      placeholder="Поиск..."
		      size="small"
		      style="width: 200px"
		      clearable
		      >
		      <template #prefix>
			<el-icon><Search /></el-icon>
		      </template>
		    </el-input>
		  </div>
		</div>
	      </template>

	      <div class="events-scroll-container">
		<EventsList 
		  :events="filteredActiveEvents" 
		  :loading="eventsStore.loading"
		  @delete-event="handleDeleteEvent"
		  />
	      </div>
	    </el-card>
	  </el-col>
	</el-row>

	<!-- Архивные мероприятия -->
	<el-card class="mt-4">
	  <template #header>
	    <div class="card-header">
	      <el-icon><Document /></el-icon>
	      <span>Архив мероприятий</span>
	    </div>
	  </template>

	  <ArchivedEvents 
	    :events="eventsStore.archivedEvents"
	    @delete-event="handleDeleteEvent"
	    />
	</el-card>
      </el-main>
    </el-container>

    <!-- Диалог генератора тестовых данных -->
    <el-dialog 
      v-model="showTestDataGenerator" 
      title="Генератор тестовых данных" 
      width="90%"
      :close-on-click-modal="false"
      >
      <TestDataGenerator />
    </el-dialog>

  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useEventsStore } from '@/stores/events'
  import CreateEventForm from '@/components/events/CreateEventForm.vue'
  import EventsList from '@/components/events/EventsList.vue'
  import ArchivedEvents from '@/components/events/ArchivedEvents.vue'
  import TestDataGenerator from '@/components/admin/TestDataGenerator.vue'
    import { ElMessage, ElMessageBox } from 'element-plus'
  import { 
      Plus, 
      Calendar, 
      Search, 
      Document,
      Tools
  } from '@element-plus/icons-vue'

  const router = useRouter()
  const eventsStore = useEventsStore()

  const searchTerm = ref('')
  const showTestDataGenerator = ref(false)
  
  // Показываем генератор только в режиме разработки
  const isDevelopment = import.meta.env.DEV

  const filteredActiveEvents = computed(() => {
      if (!searchTerm.value) return eventsStore.activeEvents

      const term = searchTerm.value.toLowerCase()
      return eventsStore.activeEvents.filter(event =>
	  event.label.toLowerCase().includes(term) ||
	      (event.description && event.description.toLowerCase().includes(term))
      )
  })

  const openCalendar = () => {
      router.push('/calendar')
  }

  const handleEventCreated = (event) => {
      // Уведомление уже показано в CreateEventForm
      // Можно добавить дополнительную логику, если нужно
  }


  const handleUpdateEvent = async (eventId, eventData) => {
      try {
	  await eventsStore.updateEvent(eventId, eventData)
	  ElMessage.success('Мероприятие обновлено!')
      } catch (error) {
	  ElMessage.error('Ошибка обновления мероприятия')
      }
  }

  const handleDeleteEvent = async (eventId) => {
      try {
	  await ElMessageBox.confirm(
	      'Вы уверены, что хотите удалить это мероприятие?',
	      'Подтверждение',
	      {
		  confirmButtonText: 'Да',
		  cancelButtonText: 'Отмена',
		  type: 'warning'
	      }
	  )

	  await eventsStore.deleteEvent(eventId)
	  ElMessage.success('Мероприятие удалено!')

      } catch (error) {
	  if (error !== 'cancel') {
	      ElMessage.error('Ошибка удаления мероприятия')
	  }
      }
  }


  onMounted(async () => {
      try {
	  await eventsStore.loadEvents()
      } catch (error) {
	  ElMessage.error('Ошибка загрузки данных')
      }
  })
</script>

<style scoped>
  .events-view {
      min-height: 100vh;
      background-color: #f5f7fa;
  }

  .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 100%;
      width: 100%;
  }


  .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      font-weight: 600;
  }

  .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
  }

  .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
  }


  .mb-4 {
      margin-bottom: 16px;
  }

  .mt-4 {
      margin-top: 16px;
  }

  .events-card {
      height: 600px;
      display: flex;
      flex-direction: column;
  }

  .events-card :deep(.el-card__body) {
      flex: 1;
      padding: 0;
      overflow: hidden;
  }

  .events-scroll-container {
      height: 100%;
      overflow-y: auto;
      padding: 20px;
  }

  /* Адаптивные высоты */
  @media (max-width: 768px) {
      .events-card {
          height: 400px;
      }
  }

  @media (min-width: 1200px) {
      .events-card {
          height: 700px;
      }
  }
</style>
