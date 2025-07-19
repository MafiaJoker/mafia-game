<template>
  <div class="events-calendar-view">
    <el-container>
      <el-header>
        <div class="calendar-header">
          <el-button 
            @click="$router.push('/')"
            :icon="ArrowLeft"
          >
            Назад к мероприятиям
          </el-button>
          <h1>Календарь мероприятий</h1>
          <div class="calendar-controls">
            <el-button 
              @click="previousMonth"
              :icon="ArrowLeft"
              circle
            />
            <span class="current-period">{{ formatMonthYear(currentDate) }}</span>
            <el-button 
              @click="nextMonth"
              :icon="ArrowRight"
              circle
            />
          </div>
        </div>
      </el-header>

      <el-main>
        <el-card class="calendar-card">
          <div class="calendar-grid">
            <!-- Заголовки дней недели -->
            <div class="weekdays-header">
              <div 
                v-for="day in weekdays" 
                :key="day"
                class="weekday-header"
              >
                {{ day }}
              </div>
            </div>

            <!-- Календарная сетка -->
            <div class="calendar-days">
              <div 
                v-for="day in calendarDays" 
                :key="day.date"
                class="calendar-day"
                :class="{
                  'other-month': !day.isCurrentMonth,
                  'today': day.isToday,
                  'has-events': day.events.length > 0
                }"
              >
                <div class="day-number">{{ day.dayNumber }}</div>
                
                <div v-if="day.events.length > 0" class="day-events">
                  <div 
                    v-for="event in day.events.slice(0, 5)" 
                    :key="event.id"
                    class="event-item"
                    :class="getEventTypeClass(event.event_type?.label)"
                    @click="openEvent(event)"
                  >
                    <div class="event-title">{{ event.label }}</div>
                    <div class="event-time">{{ formatTime(event.start_date) }}</div>
                  </div>
                  
                  <div 
                    v-if="day.events.length > 5" 
                    class="more-events"
                    @click="showDayEvents(day)"
                  >
                    +{{ day.events.length - 5 }} еще
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-main>
    </el-container>

    <!-- Диалог событий дня -->
    <el-dialog 
      v-model="showDayDialog" 
      :title="`События ${selectedDay?.date ? formatDate(selectedDay.date) : ''}`"
      width="600px"
    >
      <div v-if="selectedDay" class="day-events-list">
        <el-card 
          v-for="event in selectedDay.events" 
          :key="event.id"
          class="event-card"
          shadow="hover"
          @click="openEvent(event)"
        >
          <div class="event-header">
            <h4>{{ event.label }}</h4>
            <el-tag 
              v-if="event.event_type" 
              :type="getEventTypeTagType(event.event_type.label)"
              size="small"
            >
              {{ event.event_type.label }}
            </el-tag>
          </div>
          
          <div class="event-details">
            <div class="event-info">
              <el-icon><Clock /></el-icon>
              <span>{{ formatDateTime(event.start_date) }}</span>
            </div>
            
            <div v-if="event.description" class="event-description">
              {{ event.description }}
            </div>
            
            <div class="event-info">
              <el-icon><Location /></el-icon>
              <span>{{ event.tables?.length || 0 }} столов</span>
            </div>
          </div>
        </el-card>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEventsStore } from '@/stores/events'
import { ElMessage } from 'element-plus'
import { 
  ArrowLeft, 
  ArrowRight,
  Clock,
  Location
} from '@element-plus/icons-vue'

const router = useRouter()
const eventsStore = useEventsStore()

const currentDate = ref(new Date())
const showDayDialog = ref(false)
const selectedDay = ref(null)

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const events = computed(() => eventsStore.events || [])

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  // Первый день месяца
  const firstDay = new Date(year, month, 1)
  // Последний день месяца
  const lastDay = new Date(year, month + 1, 0)
  
  // Начинаем с понедельника предыдущей недели
  const startDate = new Date(firstDay)
  const dayOfWeek = firstDay.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startDate.setDate(startDate.getDate() - daysToSubtract)
  
  // Заканчиваем воскресеньем следующей недели
  const endDate = new Date(lastDay)
  const lastDayOfWeek = lastDay.getDay()
  const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek
  endDate.setDate(endDate.getDate() + daysToAdd)
  
  const days = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    const dayEvents = getEventsForDate(current)
    
    days.push({
      date: new Date(current),
      dayNumber: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isToday: isToday(current),
      events: dayEvents
    })
    
    current.setDate(current.getDate() + 1)
  }
  
  return days
})

const getEventsForDate = (date) => {
  return events.value.filter(event => {
    const eventDate = new Date(event.start_date)
    return eventDate.toDateString() === date.toDateString()
  })
}

const isToday = (date) => {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

const formatMonthYear = (date) => {
  return date.toLocaleDateString('ru-RU', { 
    month: 'long', 
    year: 'numeric' 
  })
}

const formatDate = (date) => {
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const previousMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

const openEvent = (event) => {
  router.push(`/event/${event.id}`)
}

const showDayEvents = (day) => {
  selectedDay.value = day
  showDayDialog.value = true
}

const getEventTypeClass = (eventType) => {
  if (!eventType) return 'event-default'
  
  const type = eventType.toLowerCase()
  if (type.includes('турнир')) return 'event-tournament'
  if (type.includes('чемпионат')) return 'event-championship'
  if (type.includes('тренировка') || type.includes('тренинг')) return 'event-training'
  if (type.includes('соревнование')) return 'event-competition'
  if (type.includes('фестиваль')) return 'event-festival'
  if (type.includes('мастер-класс')) return 'event-masterclass'
  return 'event-default'
}

const getEventTypeTagType = (eventType) => {
  if (!eventType) return 'info'
  
  const type = eventType.toLowerCase()
  if (type.includes('турнир')) return 'danger'
  if (type.includes('чемпионат')) return 'warning'
  if (type.includes('тренировка') || type.includes('тренинг')) return 'success'
  if (type.includes('соревнование')) return ''
  if (type.includes('фестиваль')) return 'danger'
  if (type.includes('мастер-класс')) return 'info'
  return 'info'
}

onMounted(() => {
  eventsStore.loadEvents()
})
</script>

<style scoped>
.events-calendar-view {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 20px;
}

.calendar-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.calendar-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.current-period {
  font-size: 18px;
  font-weight: 500;
  min-width: 200px;
  text-align: center;
}

.calendar-card {
  margin: 20px;
}

.calendar-grid {
  width: 100%;
}

.weekdays-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 1px;
}

.weekday-header {
  padding: 12px;
  text-align: center;
  font-weight: 600;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background-color: #e9ecef;
}

.calendar-day {
  min-height: 130px;
  background-color: white;
  padding: 6px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.calendar-day:hover {
  background-color: #f8f9fa;
}

.calendar-day.other-month {
  background-color: #f8f9fa;
  color: #6c757d;
}

.calendar-day.today {
  background-color: #e3f2fd;
  border-color: #2196f3;
}

.calendar-day.has-events {
  border-left: 4px solid #409eff;
}

.day-number {
  font-weight: 600;
  margin-bottom: 3px;
  font-size: 12px;
  flex-shrink: 0;
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  overflow: hidden;
}

.event-item {
  background-color: #409eff;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 2px;
  width: 120px;
  min-height: 18px;
  display: block;
  box-sizing: border-box;
  font-weight: 500;
  line-height: 1.2;
  overflow: hidden;
}

.event-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
  opacity: 0.9;
}

.event-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  font-size: 10px;
  line-height: 1.1;
}

.event-time {
  font-size: 8px;
  opacity: 0.8;
  margin-top: 1px;
  white-space: nowrap;
  line-height: 1;
}

/* Цвета для разных типов мероприятий */
.event-tournament {
  background: linear-gradient(135deg, #e53e3e, #c53030);
}

.event-championship {
  background: linear-gradient(135deg, #dd6b20, #c05621);
}

.event-training {
  background: linear-gradient(135deg, #38a169, #2f855a);
}

.event-competition {
  background: linear-gradient(135deg, #805ad5, #6b46c1);
}

.event-festival {
  background: linear-gradient(135deg, #d53f8c, #b83280);
}

.event-masterclass {
  background: linear-gradient(135deg, #0987a0, #0987a0);
}

.event-default {
  background: linear-gradient(135deg, #3182ce, #2c5282);
}

.more-events {
  font-size: 10px;
  color: #666;
  cursor: pointer;
  text-align: center;
  padding: 2px;
}

.more-events:hover {
  color: #409eff;
}

.day-events-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

.event-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.event-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.event-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.event-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.event-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.event-description {
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

/* Адаптивность */
@media (max-width: 768px) {
  .calendar-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .calendar-controls {
    order: -1;
  }

  .calendar-day {
    min-height: 90px;
    padding: 4px;
  }

  .day-number {
    font-size: 11px;
    margin-bottom: 4px;
  }

  .event-item {
    font-size: 9px;
    padding: 2px 4px;
    width: 100px;
    min-height: 16px;
  }

  .event-title {
    font-size: 9px;
  }

  .event-time {
    font-size: 7px;
  }

  .weekday-header {
    padding: 8px 4px;
    font-size: 12px;
  }
}
</style>