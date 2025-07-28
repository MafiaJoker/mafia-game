<template>
  <div class="event-registrations">
    <div class="registrations-header">
      <h3>{{ $t('events.registrations.title') }}</h3>
      <div class="header-actions">
        <el-button
          type="primary"
          @click="showCreateDialog = true"
          :loading="registrationsStore.loading"
        >
          {{ $t('events.registrations.register_player') }}
        </el-button>
        <el-button
          @click="refreshRegistrations"
          :loading="registrationsStore.loading"
        >
          {{ $t('common.refresh') }}
        </el-button>
      </div>
    </div>

    <div class="registrations-stats">
      <el-card shadow="never" class="stats-card">
        <div class="stat-item">
          <span class="stat-label">{{ $t('events.registrations.total') }}:</span>
          <span class="stat-value">{{ registrationsStore.pagination.total }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('events.registrations.confirmed') }}:</span>
          <span class="stat-value confirmed">{{ registrationsStore.confirmedRegistrations.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('events.registrations.pending') }}:</span>
          <span class="stat-value pending">{{ registrationsStore.pendingRegistrations.length }}</span>
        </div>
      </el-card>
    </div>

    <el-table 
      :data="registrationsStore.registrations" 
      v-loading="registrationsStore.loading"
      stripe
    >
      <el-table-column 
        prop="user_nickname" 
        :label="$t('events.registrations.player_name')"
        width="200"
      />
      <el-table-column 
        prop="status" 
        :label="$t('events.registrations.status')"
        width="120"
      >
        <template #default="{ row }">
          <el-tag 
            :type="getStatusType(row.status)"
            size="small"
          >
            {{ $t(`events.registrations.status_${row.status}`) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column 
        prop="created_at" 
        :label="$t('events.registrations.registered_at')"
        width="180"
      >
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column 
        prop="confirmed_at" 
        :label="$t('events.registrations.confirmed_at')"
        width="180"
      >
        <template #default="{ row }">
          {{ row.confirmed_at ? formatDate(row.confirmed_at) : '-' }}
        </template>
      </el-table-column>
      <el-table-column 
        :label="$t('common.actions')"
        width="120"
        align="center"
      >
        <template #default="{ row }">
          <el-button
            type="danger"
            size="small"
            @click="confirmDelete(row)"
            :loading="registrationsStore.loading"
          >
            {{ $t('common.delete') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper" v-if="registrationsStore.pagination.total > 0">
      <el-pagination
        v-model:current-page="registrationsStore.pagination.currentPage"
        v-model:page-size="registrationsStore.pagination.pageSize"
        :total="registrationsStore.pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- Create Registration Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :title="$t('events.registrations.register_player')"
      width="400px"
    >
      <el-form :model="createForm" label-width="120px">
        <el-form-item :label="$t('events.registrations.select_player')">
          <el-select
            v-model="createForm.userId"
            filterable
            remote
            :remote-method="searchUsers"
            :loading="searchLoading"
            placeholder="Введите имя игрока"
            style="width: 100%"
          >
            <el-option
              v-for="user in availableUsers"
              :key="user.id"
              :label="user.nickname"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          @click="handleCreateRegistration"
          :disabled="!createForm.userId"
          :loading="registrationsStore.loading"
        >
          {{ $t('events.registrations.register') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRegistrationsStore } from '@/stores/registrations'
import { apiService } from '@/services/api'
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
const showCreateDialog = ref(false)
const searchLoading = ref(false)
const availableUsers = ref([])

const createForm = ref({
  userId: null
})

const getStatusType = (status) => {
  const statusTypes = {
    pending: '',
    confirmed: 'success',
    cancelled: 'danger'
  }
  return statusTypes[status] || ''
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('ru-RU')
}

const searchUsers = async (query) => {
  if (!query) {
    availableUsers.value = []
    return
  }
  
  searchLoading.value = true
  try {
    const users = await apiService.getUsers()
    availableUsers.value = users.filter(user => 
      user.nickname.toLowerCase().includes(query.toLowerCase())
    )
  } catch (error) {
    console.error('Failed to search users:', error)
  } finally {
    searchLoading.value = false
  }
}

const handleCreateRegistration = async () => {
  try {
    await registrationsStore.createRegistration(props.eventId, createForm.value.userId)
    showCreateDialog.value = false
    createForm.value.userId = null
    availableUsers.value = []
  } catch (error) {
    console.error('Failed to create registration:', error)
  }
}

const confirmDelete = async (registration) => {
  try {
    await ElMessageBox.confirm(
      t('events.registrations.delete_confirm', { name: registration.user_nickname }),
      t('common.warning'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    
    await registrationsStore.deleteRegistration(props.eventId, registration.id)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete registration:', error)
    }
  }
}

const refreshRegistrations = () => {
  registrationsStore.fetchEventRegistrations(props.eventId)
}

const handlePageChange = (page) => {
  registrationsStore.setPage(page)
  registrationsStore.fetchEventRegistrations(props.eventId)
}

const handleSizeChange = (size) => {
  registrationsStore.setPageSize(size)
  registrationsStore.fetchEventRegistrations(props.eventId)
}

// Watch for eventId changes
watch(() => props.eventId, (newEventId) => {
  if (newEventId) {
    registrationsStore.clearState()
    registrationsStore.fetchEventRegistrations(newEventId)
  }
}, { immediate: true })

onMounted(() => {
  if (props.eventId) {
    registrationsStore.fetchEventRegistrations(props.eventId)
  }
})
</script>

<style scoped>
.event-registrations {
  padding: 20px;
}

.registrations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.registrations-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.registrations-stats {
  margin-bottom: 20px;
}

.stats-card {
  border: 1px solid #e4e7ed;
}

.stats-card .el-card__body {
  display: flex;
  gap: 30px;
  padding: 15px 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.stat-value.confirmed {
  color: #67c23a;
}

.stat-value.pending {
  color: #e6a23c;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>