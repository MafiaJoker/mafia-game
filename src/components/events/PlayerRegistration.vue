<template>
  <div class="player-registration">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <h3>{{ $t('events.registration.my_registration') }}</h3>
        </div>
      </template>

      <div v-if="registrationsStore.loading" class="loading-state">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="!registrationsStore.isRegistered" class="not-registered">
        <el-empty 
          :description="$t('events.registration.not_registered')"
          :image-size="80"
        >
          <el-button
            type="primary"
            @click="handleRegister"
            :loading="registrationsStore.loading"
            size="large"
          >
            {{ $t('events.registration.register_button') }}
          </el-button>
        </el-empty>
      </div>

      <div v-else class="registered-state">
        <div class="registration-info">
          <div class="status-row">
            <span class="label">{{ $t('events.registration.status') }}:</span>
            <el-tag 
              :type="getStatusType(registrationsStore.myRegistrationStatus)"
              size="large"
            >
              {{ $t(`events.registration.status_${registrationsStore.myRegistrationStatus}`) }}
            </el-tag>
          </div>

          <div class="info-row" v-if="registrationsStore.myRegistration.created_at">
            <span class="label">{{ $t('events.registration.registered_at') }}:</span>
            <span class="value">{{ formatDate(registrationsStore.myRegistration.created_at) }}</span>
          </div>

          <div class="info-row" v-if="registrationsStore.myRegistration.confirmed_at">
            <span class="label">{{ $t('events.registration.confirmed_at') }}:</span>
            <span class="value">{{ formatDate(registrationsStore.myRegistration.confirmed_at) }}</span>
          </div>

          <div class="status-description">
            <el-alert
              v-if="registrationsStore.myRegistrationStatus === 'pending'"
              :title="$t('events.registration.pending_description')"
              type="warning"
              :closable="false"
              show-icon
            />
            <el-alert
              v-else-if="registrationsStore.myRegistrationStatus === 'confirmed'"
              :title="$t('events.registration.confirmed_description')"
              type="success"
              :closable="false"
              show-icon
            />
            <el-alert
              v-else-if="registrationsStore.myRegistrationStatus === 'cancelled'"
              :title="$t('events.registration.cancelled_description')"
              type="info"
              :closable="false"
              show-icon
            />
          </div>
        </div>

        <div class="actions" v-if="registrationsStore.myRegistrationStatus !== 'cancelled'">
          <el-button
            type="danger"
            @click="confirmCancel"
            :loading="registrationsStore.loading"
          >
            {{ $t('events.registration.cancel_button') }}
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRegistrationsStore } from '@/stores/registrations'
import { ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps({
  eventId: {
    type: String,
    required: true
  }
})

const registrationsStore = useRegistrationsStore()

const getStatusType = (status) => {
  const statusTypes = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'info'
  }
  return statusTypes[status] || ''
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleRegister = async () => {
  try {
    await registrationsStore.registerForEvent(props.eventId)
  } catch (error) {
    console.error('Failed to register for event:', error)
  }
}

const confirmCancel = async () => {
  try {
    await ElMessageBox.confirm(
      t('events.registration.cancel_confirm'),
      t('common.warning'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    
    await registrationsStore.cancelRegistration(props.eventId)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to cancel registration:', error)
    }
  }
}

// Watch for eventId changes
watch(() => props.eventId, (newEventId) => {
  if (newEventId) {
    registrationsStore.fetchMyRegistration(newEventId)
  }
}, { immediate: true })

onMounted(() => {
  if (props.eventId) {
    registrationsStore.fetchMyRegistration(props.eventId)
  }
})
</script>

<style scoped>
.player-registration {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.loading-state {
  padding: 20px 0;
}

.not-registered {
  text-align: center;
  padding: 20px 0;
}

.registered-state {
  padding: 10px 0;
}

.registration-info {
  margin-bottom: 20px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
}

.info-row:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.label {
  font-weight: 500;
  color: #606266;
  min-width: 120px;
}

.value {
  color: #303133;
}

.status-description {
  margin-top: 15px;
}

.actions {
  text-align: center;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}

@media (max-width: 768px) {
  .player-registration {
    padding: 15px;
  }
  
  .status-row,
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