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
          @click="$emit('viewEvent', event)"
          >
          <div class="event-content">
            <div class="event-header">
              <h4 class="event-title">
                {{ event.name }}
                <el-tag 
                  :type="getLanguageTagType(event.language)" 
                  size="small"
                  class="ml-2"
                  >
                  {{ getLanguageLabel(event.language) }}
                </el-tag>
                <el-tag 
                  :type="getStatusTagType(event.status)" 
                  size="small"
                  class="ml-1"
                  >
                  {{ getStatusLabel(event.status) }}
                </el-tag>
                <el-tag 
                  type="info" 
                  size="small"
                  class="ml-1"
                  >
                  {{ getCategoryLabel(event.category) }}
                </el-tag>
              </h4>
            </div>
            
            <p class="event-description">{{ event.description }}</p>
            
            <div class="event-footer">
              <div class="event-info">
                <el-tag 
                  type="primary" 
                  effect="plain" 
                  round
                  >
                  {{ event.tables.length }} {{ getTableNoun(event.tables.length) }}
                </el-tag>
                <span class="event-date">{{ formatDate(event.date) }}</span>
              </div>
              
              <div class="event-actions">
                <el-button 
                  type="danger" 
                  size="small" 
                  circle
                  @click.stop="$emit('deleteEvent', event.id)"
                  >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-skeleton>
  </div>
</template>

<script setup>
  import { Delete } from '@element-plus/icons-vue'

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

  defineEmits(['viewEvent', 'deleteEvent'])

  const getLanguageLabel = (language) => {
      const labels = {
	  'ru': 'RU',
	  'en': 'EN', 
	  'am': 'AM'
      }
      return labels[language] || 'RU'
  }

  const getLanguageTagType = (language) => {
      const types = {
	  'ru': '',
	  'en': 'success',
	  'am': 'warning'
      }
      return types[language] || ''
  }

  const getStatusLabel = (status) => {
      const labels = {
	  'planned': 'В планах',
	  'active': 'Активно',
	  'completed': 'Завершено'
      }
      return labels[status] || 'Неизвестно'
  }

  const getStatusTagType = (status) => {
      const types = {
	  'planned': '',
	  'active': 'success',
	  'completed': 'info'
      }
      return types[status] || ''
  }

  const getCategoryLabel = (category) => {
      const labels = {
	  'funky': 'Фанки',
	  'minicap': 'Миникап',
	  'tournament': 'Турнир',
	  'charity_tournament': 'Благотворительный'
      }
      return labels[category] || 'Фанки'
  }

  const getTableNoun = (count) => {
      const n = Math.abs(count) % 100
      if (n >= 5 && n <= 20) return 'столов'
      
      const lastDigit = n % 10
      if (lastDigit === 1) return 'стол'
      if (lastDigit >= 2 && lastDigit <= 4) return 'стола'
      return 'столов'
  }

  const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('ru-RU', {
	  day: '2-digit',
	  month: 'long',
	  year: 'numeric'
      })
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

  .event-actions {
      display: flex;
      gap: 8px;
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
