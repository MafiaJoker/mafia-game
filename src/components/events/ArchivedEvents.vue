<template>
  <div class="archived-events">
    <el-skeleton :loading="loading" :rows="3" animated>
      <div v-if="events.length === 0" class="empty-state">
        <el-empty description="Нет архивных мероприятий">
          <template #image>
            <el-icon size="100" color="#c0c4cc">
              <Document />
            </el-icon>
          </template>
        </el-empty>
      </div>

      <div v-else class="archived-grid">
        <el-card
          v-for="event in events"
          :key="event.id"
          class="archived-card"
          shadow="hover"
          @click="$emit('viewEvent', event)"
          >
          <template #header>
            <div class="card-header">
              <h5 class="event-title">
                {{ event.label }}
                <el-tag
                  :type="getLanguageTagType(event.language)"
                  size="small"
                  class="ml-2"
                  >
                  {{ getLanguageLabel(event.language) }}
                </el-tag>
              </h5>
              <span class="event-date">{{ formatDate(event.start_date) }}</span>
            </div>
          </template>

          <div class="event-content">
            <p class="event-description">{{ event.description }}</p>

            <div class="event-meta">
              <el-tag 
                v-if="event.event_type"
                :style="{ 
                  backgroundColor: event.event_type.color || '#409eff', 
                  color: 'white',
                  border: 'none'
                }"
              >
                {{ event.event_type.label }}
              </el-tag>
              <el-tag type="info" effect="plain">
                Завершено
              </el-tag>
            </div>

            <div class="event-stats">
              <el-tag
                type="primary"
                effect="plain"
                round
                >
                {{ event.tables_count ?? 0 }} {{ getTableNoun(event.tables_count ?? 0) }}
              </el-tag>
            </div>
          </div>

          <template #footer>
            <div class="card-footer">
              <el-button
                type="primary"
                size="small"
                @click.stop="$emit('viewEvent', event)"
                >
                <el-icon><View /></el-icon>
                Детали
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click.stop="$emit('deleteEvent', event.id)"
                >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </template>
        </el-card>
      </div>
    </el-skeleton>
  </div>
</template>

<script setup>
  import {
      Document,
      View,
      Delete
  } from '@element-plus/icons-vue'

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
  .archived-events {
      min-height: 200px;
  }

  .empty-state {
      text-align: center;
      padding: 40px 20px;
  }

  .archived-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
  }

  .archived-card {
      cursor: pointer;
      transition: all 0.3s ease;
      opacity: 0.85;
  }

  .archived-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      opacity: 1;
  }

  .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
  }

  .event-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      flex: 1;
  }

  .event-date {
      font-size: 12px;
      color: #909399;
      white-space: nowrap;
  }

  .event-content {
      padding: 8px 0;
  }

  .event-description {
      margin: 0 0 12px 0;
      color: #606266;
      font-size: 14px;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
  }

  .event-meta {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
  }

  .event-stats {
      text-align: center;
  }

  .card-footer {
      display: flex;
      justify-content: space-between;
      gap: 8px;
  }

  .ml-2 {
      margin-left: 8px;
  }

  @media (max-width: 768px) {
      .archived-grid {
	  grid-template-columns: 1fr;
      }

      .card-header {
	  flex-direction: column;
	  align-items: flex-start;
	  gap: 8px;
      }

      .event-date {
	  align-self: flex-end;
      }
  }
</style>
