<template>
  <div class="events-calendar-view" :class="{ 'is-mobile': isMobile, 'is-tablet': isTablet }">
    <el-container>
      <el-header>
        <div class="calendar-header">
          <el-button 
            v-if="isMobile"
            :icon="ArrowLeft"
            circle
            aria-label="Назад к мероприятиям"
            @click="$router.push('/')"
          />
          <el-button 
            v-else
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
              aria-label="Предыдущий месяц"
            />
            <span class="current-period">{{ formatMonthYear(currentDate) }}</span>
            <el-button 
              @click="nextMonth"
              :icon="ArrowRight"
              circle
              aria-label="Следующий месяц"
            />
          </div>
        </div>
      </el-header>

      <el-main>
        <!-- Телефон: сетка на семь колонок в 360px не читается - повестка по дням -->
        <div v-if="isMobile" class="agenda">
          <el-empty
            v-if="agendaDays.length === 0"
            description="В этом месяце мероприятий нет"
          />

          <div v-for="day in agendaDays" :key="day.date" class="agenda-day">
            <div class="agenda-day-header" :class="{ today: day.isToday }">
              <span class="agenda-day-number">{{ day.dayNumber }}</span>
              <span class="agenda-day-name">{{ formatWeekday(day.date) }}</span>
              <el-tag v-if="day.isToday" size="small" type="primary">Сегодня</el-tag>
            </div>

            <div class="agenda-events">
              <div
                v-for="event in day.events"
                :key="event.id"
                class="agenda-event"
                @click="openEvent(event)"
              >
                <span
                  class="agenda-event-color"
                  :style="{ backgroundColor: getEventTypeColor(event.event_type) }"
                ></span>
                <div class="agenda-event-body">
                  <div class="agenda-event-title">{{ event.label }}</div>
                  <div class="agenda-event-meta">
                    <span>{{ formatTime(event.start_date) }}</span>
                    <span v-if="event.event_type">· {{ event.event_type.label }}</span>
                    <span v-if="event.tables?.length">· {{ event.tables.length }} {{ getTableNoun(event.tables.length) }}</span>
                  </div>
                </div>
                <el-icon class="agenda-event-arrow"><ArrowRight /></el-icon>
              </div>
            </div>
          </div>
        </div>

        <el-card v-else class="calendar-card">
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
                  <el-tooltip
                    v-for="event in day.events.slice(0, visibleEventsPerDay)"
                    :key="event.id"
                    :content="getEventChipTooltip(event)"
                    :disabled="!getEventChipTooltip(event)"
                    placement="top"
                  >
                    <div
                      class="event-item"
                      :class="getEventTypeClass(event.event_type)"
                      :style="{ backgroundColor: getEventTypeColor(event.event_type) }"
                      @click="openEvent(event)"
                    >
                      <div class="event-title">{{ event.label }}</div>
                      <div class="event-time">{{ formatTime(event.start_date) }}</div>
                    </div>
                  </el-tooltip>
                  
                  <div 
                    v-if="day.events.length > visibleEventsPerDay" 
                    class="more-events"
                    @click="showDayEvents(day)"
                  >
                    +{{ day.events.length - visibleEventsPerDay }} еще
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
            <div v-if="event.event_type" class="event-header-tags">
              <el-tag
                :type="getEventTypeTagType(event.event_type.label)"
                size="small"
              >
                {{ event.event_type.label }}
              </el-tag>
              <el-tag
                v-if="event.event_type.rule_system"
                size="small"
                type="info"
                effect="plain"
              >
                {{ event.event_type.rule_system.label }}
              </el-tag>
            </div>
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
import { useBreakpoints } from '@/composables/useBreakpoints'
import { ElMessage } from 'element-plus'
import { 
  ArrowLeft, 
  ArrowRight,
  Clock,
  Location
} from '@element-plus/icons-vue'

const router = useRouter()
const eventsStore = useEventsStore()
const { isMobile, isTablet } = useBreakpoints()

const currentDate = ref(new Date())
const showDayDialog = ref(false)
const selectedDay = ref(null)

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// В ячейке планшета помещается три плашки, дальше - «+N еще»
const visibleEventsPerDay = computed(() => (isTablet.value ? 3 : 5))

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

// Повестка телефона: только дни текущего месяца, в которых что-то есть
const agendaDays = computed(() => (
  calendarDays.value.filter(day => day.isCurrentMonth && day.events.length > 0)
))

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

const formatWeekday = (date) => {
  return date.toLocaleDateString('ru-RU', { weekday: 'long' })
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

const getTableNoun = (count) => {
  const n = Math.abs(count) % 100
  if (n >= 5 && n <= 20) return 'столов'

  const lastDigit = n % 10
  if (lastDigit === 1) return 'стол'
  if (lastDigit >= 2 && lastDigit <= 4) return 'стола'
  return 'столов'
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
  // Если у типа события есть цвет из API, используем его
  if (eventType?.color) {
    return 'event-custom'
  }
  
  // Fallback на старую логику, если цвета нет
  if (!eventType) return 'event-default'
  
  const type = eventType.label?.toLowerCase() || ''
  if (type.includes('турнир')) return 'event-tournament'
  if (type.includes('чемпионат')) return 'event-championship'
  if (type.includes('тренировка') || type.includes('тренинг')) return 'event-training'
  if (type.includes('соревнование')) return 'event-competition'
  if (type.includes('фестиваль')) return 'event-festival'
  if (type.includes('мастер-класс')) return 'event-masterclass'
  return 'event-default'
}

const getEventTypeColor = (eventType) => {
  // Возвращаем цвет из API если есть
  if (eventType?.color) {
    let color = eventType.color
    // Если цвет не начинается с #, добавляем его
    if (!color.startsWith('#')) {
      color = '#' + color
    }
    return color
  }
  
  // Fallback цвета для старых типов
  const type = eventType?.label?.toLowerCase() || ''
  if (type.includes('турнир')) return '#e53e3e'
  if (type.includes('чемпионат')) return '#dd6b20'
  if (type.includes('тренировка') || type.includes('тренинг')) return '#38a169'
  if (type.includes('соревнование')) return '#805ad5'
  if (type.includes('фестиваль')) return '#d53f8c'
  if (type.includes('мастер-класс')) return '#0987a0'
  return '#3182ce'
}

// Тултип чипа события: категория и система правил
const getEventChipTooltip = (event) => {
  if (!event.event_type) return ''
  const parts = [event.event_type.label]
  if (event.event_type.rule_system) {
    parts.push(event.event_type.rule_system.label)
  }
  return parts.join(' · ')
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
  gap: 12px;
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
  text-transform: capitalize;
}

.calendar-card {
  margin: 20px;
}

.calendar-grid {
  width: 100%;
}

.weekdays-header {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
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
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 1px;
  background-color: #e9ecef;
}

.calendar-day {
  height: 130px;
  min-height: 130px;
  max-height: 130px;
  background-color: white;
  padding: 6px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
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
  width: 100%;
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

.event-custom {
  /* Цвет будет задан через style */
  color: white;
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

.event-header-tags {
  display: flex;
  align-items: center;
  gap: 4px;
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

/* Планшет и телефон: шапка переносится, карточка без внешних полей */
@media (max-width: 1023px) {
  .events-calendar-view {
    min-height: auto;
  }

  .calendar-header {
    flex-wrap: wrap;
    padding: 0;
  }

  .calendar-header h1 {
    flex: 1;
    font-size: 20px;
    text-align: center;
  }

  .calendar-controls {
    flex: 1 0 100%;
    justify-content: center;
    gap: 12px;
  }

  .calendar-card {
    margin: 0;
  }
}

/* Планшет: семь колонок делят ширину поровну, плашки во всю ячейку */
@media (min-width: 768px) and (max-width: 1023px) {
  .weekday-header {
    padding: 8px 4px;
    font-size: 12px;
  }

  .calendar-day {
    height: 112px;
    min-height: 112px;
    max-height: 112px;
    padding: 4px;
  }

  .calendar-day.has-events {
    border-left-width: 3px;
  }

  .event-item {
    padding: 2px 4px;
  }
}

/* Телефон: шапка в две строки, повестка вместо сетки */
@media (max-width: 767px) {
  .calendar-header {
    gap: 8px 12px;
  }

  .calendar-header h1 {
    flex: 1;
    min-width: 0;
    font-size: 18px;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .current-period {
    min-width: 0;
    flex: 1;
    font-size: 17px;
  }

  .event-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}

.agenda {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.agenda-day-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
  padding: 0 2px;
}

.agenda-day-number {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
}

.agenda-day-header.today .agenda-day-number {
  color: #409eff;
}

.agenda-day-name {
  font-size: 13px;
  color: #909399;
  text-transform: capitalize;
}

.agenda-events {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agenda-event {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background-color: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  cursor: pointer;
}

.agenda-event:active {
  background-color: #f5f7fa;
}

.agenda-event-color {
  flex-shrink: 0;
  width: 4px;
  align-self: stretch;
  border-radius: 2px;
}

.agenda-event-body {
  flex: 1;
  min-width: 0;
}

.agenda-event-title {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
  line-height: 1.3;
}

.agenda-event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}

.agenda-event-arrow {
  color: #c0c4cc;
  flex-shrink: 0;
}
</style>
