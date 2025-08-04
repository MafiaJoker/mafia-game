<template>
  <div class="events-list">
    <el-skeleton :loading="loading" :rows="5" animated>
      <div v-if="events.length === 0" class="empty-state">
        <el-empty description="Нет доступных мероприятий">
          <el-button type="primary">Создать мероприятие</el-button>
        </el-empty>
      </div>

      <div v-else class="events-container">
        <div
          v-for="event in events"
          :key="event.id"
          class="event-item"
          @click="navigateToEvent(event)"
          >
          <el-button 
            class="event-delete-btn"
            link
            size="small"
            @click.stop="$emit('deleteEvent', event.id)"
            >
            <el-icon><Close /></el-icon>
          </el-button>
          
          <div class="event-content">
            <div class="event-header">
              <h4 class="event-title">
                {{ event.label }}
                <el-tag
                  :type="getLanguageTagType(event.language)"
                  size="small"
                  class="ml-2"
                  >
                  {{ getLanguageLabel(event.language) }}
                </el-tag>
                <el-tag
                  size="small"
                  class="ml-1"
                  v-if="event.event_type"
                  :style="{ 
                    backgroundColor: event.event_type.color || '#409eff', 
                    color: 'white',
                    border: 'none'
                  }"
                  >
                  {{ event.event_type.label }}
                </el-tag>
              </h4>
            </div>

            <p class="event-description">{{ event.description }}</p>

            <div class="event-footer">
              <div class="event-info">
                <span class="event-date">{{ formatDate(event.start_date) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-skeleton>
  </div>
</template>

<script setup>
  import { useRouter } from 'vue-router'
  import { Delete, Close } from '@element-plus/icons-vue'

  const router = useRouter()

  defineProps({
      events: {
	  type: Array,
	  default: () => []
      },
      loading: {
	  type: Boolean,
	  default: false
      }
  })

  defineEmits(['deleteEvent'])

  const getLanguageLabel = (language) => {
      const labels = {
	  'rus': 'RU',
	  'eng': 'EN',
	  'arm': 'AM'
      }
      return labels[language] || 'RU'
  }

  const getLanguageTagType = (language) => {
      const types = {
	  'rus': 'info',
	  'eng': 'success',
	  'arm': 'warning'
      }
      return types[language] || 'info'
  }



  const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('ru-RU', {
	  day: '2-digit',
	  month: 'long',
	  year: 'numeric'
      })
  }

  const navigateToEvent = (event) => {
      router.push(`/event/${event.id}`)
  }
</script>

<style scoped>
  .events-list {
      height: 100%;
  }

  .events-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
  }

  .event-item {
      position: relative;
      cursor: pointer;
      transition: all 0.3s ease;
      border-radius: 8px;
      border: 1px solid #ebeef5;
      background-color: #fff;
      padding: 16px;
  }

  .event-item:hover {
      background-color: #f5f7fa;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: #409eff;
  }

  .event-item:hover .event-delete-btn {
      opacity: 1;
  }

  .event-delete-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      opacity: 0;
      transition: opacity 0.3s ease;
      padding: 4px;
      min-width: auto;
      width: 24px;
      height: 24px;
      z-index: 1;
  }

  .event-delete-btn:hover {
      color: #f56c6c;
      background-color: #fee;
  }

  .event-content {
      width: 100%;
  }

  .event-header {
      margin-bottom: 8px;
  }

  .event-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
  }

  .event-description {
      margin: 8px 0;
      color: #606266;
      font-size: 14px;
      line-height: 1.5;
  }

  .event-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
  }

  .event-info {
      display: flex;
      align-items: center;
      gap: 12px;
  }

  .event-date {
      font-size: 13px;
      color: #909399;
  }


  .ml-1 {
      margin-left: 4px;
  }

  .ml-2 {
      margin-left: 8px;
  }

  .empty-state {
      text-align: center;
      padding: 40px 20px;
  }

  @media (max-width: 768px) {
      .event-item {
	  padding: 12px;
      }

      .event-title {
	  font-size: 16px;
      }

      .event-footer {
	  flex-direction: column;
	  gap: 8px;
	  align-items: flex-start;
      }

      .event-info {
	  width: 100%;
	  justify-content: space-between;
      }
  }
</style>
