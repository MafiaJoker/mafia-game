<template>
  <div class="events-view">
    <el-container>
      <el-header>
	<div class="header-content">
	  <h1>Мероприятия Мафии</h1>
	  <div class="judge-selector">
	    <el-select
	      v-model="selectedJudge"
	      placeholder="Выберите ведущего"
	      size="small"
	      style="width: 200px"
	      >
	      <el-option
		v-for="judge in judges"
		:key="judge.id"
		:label="judge.name"
		:value="judge.id"
		/>
	    </el-select>
	  </div>
	</div>
      </el-header>

      <el-main>
	<!-- Активные игры текущего ведущего -->
	<el-card v-if="selectedJudge" class="mb-4">
	  <template #header>
	    <div class="card-header">
	      <el-icon><VideoPlay /></el-icon>
	      <span>Ваши активные игры</span>
	    </div>
	  </template>

	  <ActiveGames :judge-id="selectedJudge" />
	</el-card>

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
	    <el-card>
	      <template #header>
		<div class="card-header">
		  <el-icon><Calendar /></el-icon>
		  <span>Активные мероприятия</span>
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
	      </template>

	      <EventsList 
		:events="filteredActiveEvents" 
		:loading="eventsStore.loading"
		@view-event="handleViewEvent"
		@delete-event="handleDeleteEvent"
		/>
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
	    @view-event="handleViewEvent"
	    @delete-event="handleDeleteEvent"
	    />
	</el-card>
      </el-main>
    </el-container>

    <!-- Модальное окно деталей мероприятия -->
    <EventDetailsDialog
      v-model="showEventDetails"
      :event="selectedEvent"
      @update-event="handleUpdateEvent"
      @delete-event="handleDeleteEvent"
      />
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useEventsStore } from '@/stores/events'
  import { useJudgesStore } from '@/stores/judges'
  import CreateEventForm from '@/components/events/CreateEventForm.vue'
  import EventsList from '@/components/events/EventsList.vue'
  import ArchivedEvents from '@/components/events/ArchivedEvents.vue'
  import ActiveGames from '@/components/events/ActiveGames.vue'
  import EventDetailsDialog from '@/components/events/EventDetailsDialog.vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { 
      Plus, 
      Calendar, 
      Search, 
      Document, 
      VideoPlay 
  } from '@element-plus/icons-vue'

  const eventsStore = useEventsStore()
  const judgesStore = useJudgesStore()

  const searchTerm = ref('')
  const selectedJudge = ref(localStorage.getItem('defaultJudgeId') || null)
  const judges = ref([])
  const showEventDetails = ref(false)
  const selectedEvent = ref(null)

  const filteredActiveEvents = computed(() => {
      if (!searchTerm.value) return eventsStore.activeEvents

      const term = searchTerm.value.toLowerCase()
      return eventsStore.activeEvents.filter(event =>
	  event.name.toLowerCase().includes(term) ||
	      (event.description && event.description.toLowerCase().includes(term))
      )
  })

  const handleEventCreated = (event) => {
      ElMessage.success('Мероприятие успешно создано!')
  }

  const handleViewEvent = (event) => {
      selectedEvent.value = event
      showEventDetails.value = true
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

	  if (selectedEvent.value?.id === eventId) {
	      showEventDetails.value = false
	  }
      } catch (error) {
	  if (error !== 'cancel') {
	      ElMessage.error('Ошибка удаления мероприятия')
	  }
      }
  }

  watch(selectedJudge, (newJudge) => {
      if (newJudge) {
	  localStorage.setItem('defaultJudgeId', newJudge)
      }
  })

  onMounted(async () => {
      try {
	  await Promise.all([
	      eventsStore.loadEvents(),
	      judgesStore.loadJudges()
	  ])
	  judges.value = judgesStore.judges
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
  }

  .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
  }

  .judge-selector {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
  }

  .mb-4 {
      margin-bottom: 16px;
  }

  .mt-4 {
      margin-top: 16px;
  }
</style>
