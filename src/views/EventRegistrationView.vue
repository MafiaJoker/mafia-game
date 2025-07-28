<template>
  <div class="event-registration-view">
    <el-container>
      <el-header>
        <div class="page-header">
          <el-button 
            @click="goBack"
            :icon="ArrowLeft"
          >
            {{ $t('common.back') }}
          </el-button>
          <h1>
            {{ event?.label ? $t('events.registration.page_title', { eventName: event.label }) : $t('events.registration.loading') }}
          </h1>
        </div>
      </el-header>

      <el-main>
        <el-row :gutter="20" justify="center">
          <el-col :lg="16" :xl="12">
            <!-- Event Info Card -->
            <el-card v-if="event" class="mb-4" shadow="never">
              <template #header>
                <div class="card-header">
                  <el-icon><InfoFilled /></el-icon>
                  <span>{{ $t('events.registration.event_info') }}</span>
                </div>
              </template>

              <div class="event-info">
                <div class="info-row" v-if="event.event_type">
                  <el-tag 
                    :style="{ 
                      backgroundColor: getEventTypeColor(), 
                      color: 'white',
                      border: 'none'
                    }"
                    size="large"
                  >
                    {{ event.event_type.label }}
                  </el-tag>
                </div>

                <div class="info-row" v-if="event.description">
                  <span class="label">{{ $t('events.description') }}:</span>
                  <span class="value">{{ event.description }}</span>
                </div>

                <div class="info-row">
                  <span class="label">{{ $t('events.start_date') }}:</span>
                  <span class="value">{{ formatDate(event.start_date) }}</span>
                </div>

                <div class="info-row" v-if="event.location">
                  <span class="label">{{ $t('events.location') }}:</span>
                  <span class="value">{{ event.location }}</span>
                </div>

                <div class="info-row">
                  <span class="label">{{ $t('events.language') }}:</span>
                  <span class="value">{{ getLanguageLabel(event.language) }}</span>
                </div>
              </div>
            </el-card>

            <!-- Registration Component -->
            <PlayerRegistration v-if="event" :event-id="event.id" />

            <!-- Loading State -->
            <el-skeleton v-else :rows="8" animated />
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiService } from '@/services/api'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import PlayerRegistration from '@/components/events/PlayerRegistration.vue'
import { ArrowLeft, InfoFilled } from '@element-plus/icons-vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const event = ref(null)

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const loadEvent = async () => {
  try {
    const eventId = props.id || route.params.id
    console.log('Loading event with ID:', eventId)
    event.value = await apiService.getEvent(eventId)
    console.log('Event loaded:', event.value)
  } catch (error) {
    console.error('Error loading event:', error)
    ElMessage.error(t('events.registration.load_error'))
    goBack()
  }
}

const goBack = () => {
  const eventId = props.id || route.params.id
  router.push(`/event/${eventId}`)
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getLanguageLabel = (language) => {
  const labels = {
    'ru': 'Русский',
    'en': 'English',
    'am': 'Հայերեն'
  }
  return labels[language] || 'Русский'
}

const getEventTypeColor = () => {
  if (!event.value?.event_type?.color) {
    return '#409eff'
  }
  
  let color = event.value.event_type.color
  if (!color.startsWith('#')) {
    color = '#' + color
  }
  
  return color
}

onMounted(() => {
  loadEvent()
})
</script>

<style scoped>
.event-registration-view {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 100%;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.event-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 500;
  color: #606266;
  min-width: 120px;
}

.value {
  color: #303133;
  flex: 1;
}

.mb-4 {
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .page-header {
    gap: 15px;
  }
  
  .page-header h1 {
    font-size: 18px;
  }
  
  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .label {
    min-width: auto;
  }
}
</style>