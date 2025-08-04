import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '@/services/api.js'
import { ElMessage } from 'element-plus'

export const useRegistrationsStore = defineStore('registrations', () => {
  // State
  const registrations = ref([])
  const myRegistration = ref(null)
  const loading = ref(false)
  const pagination = ref({
    currentPage: 1,
    pageSize: 20,
    total: 0
  })

  // Getters
  const pendingRegistrations = computed(() => 
    registrations.value.filter(reg => reg.status === 'pending')
  )
  
  const confirmedRegistrations = computed(() => 
    registrations.value.filter(reg => reg.status === 'confirmed')
  )
  
  const isRegistered = computed(() => 
    myRegistration.value && myRegistration.value.status !== 'cancelled'
  )

  const myRegistrationStatus = computed(() => 
    myRegistration.value?.status || null
  )

  // Actions
  const fetchEventRegistrations = async (eventId, params = {}) => {
    loading.value = true
    try {
      const response = await apiService.getEventRegistrations(eventId, {
        currentPage: pagination.value.currentPage,
        pageSize: pagination.value.pageSize,
        ...params
      })
      
      // Обрабатываем ответ API с новой структурой объекта user
      const items = response.items || []
      registrations.value = items.map(reg => ({
        ...reg,
        // Сохраняем совместимость с существующим кодом
        user_id: reg.user?.id || reg.user_id,
        user_nickname: reg.user?.nickname || reg.user_nickname
      }))
      pagination.value.total = response.total || 0
      pagination.value.currentPage = params.currentPage || pagination.value.currentPage
      
      return response
    } catch (error) {
      console.error('Failed to fetch event registrations:', error)
      ElMessage.error('Не удалось загрузить список регистраций')
      throw error
    } finally {
      loading.value = false
    }
  }

  const fetchMyRegistration = async (eventId) => {
    try {
      const response = await apiService.getMyRegistration(eventId)
      myRegistration.value = response
      return response
    } catch (error) {
      if (error.response?.status === 404) {
        myRegistration.value = null
        return null
      }
      console.error('Failed to fetch my registration:', error)
      throw error
    }
  }

  const registerForEvent = async (eventId) => {
    loading.value = true
    try {
      await apiService.registerForEvent(eventId)
      await fetchMyRegistration(eventId)
      ElMessage.success('Заявка на участие подана')
    } catch (error) {
      console.error('Failed to register for event:', error)
      const message = error.response?.data?.detail || 'Не удалось подать заявку на участие'
      ElMessage.error(message)
      throw error
    } finally {
      loading.value = false
    }
  }

  const cancelRegistration = async (eventId) => {
    loading.value = true
    try {
      await apiService.cancelMyRegistration(eventId)
      myRegistration.value = null
      ElMessage.success('Заявка отменена')
    } catch (error) {
      console.error('Failed to cancel registration:', error)
      const message = error.response?.data?.detail || 'Не удалось отменить заявку'
      ElMessage.error(message)
      throw error
    } finally {
      loading.value = false
    }
  }

  const createRegistration = async (eventId, userId) => {
    loading.value = true
    try {
      await apiService.createRegistration(eventId, { user_id: userId })
      await fetchEventRegistrations(eventId)
      ElMessage.success('Игрок зарегистрирован')
    } catch (error) {
      console.error('Failed to create registration:', error)
      const message = error.response?.data?.detail || 'Не удалось зарегистрировать игрока'
      ElMessage.error(message)
      throw error
    } finally {
      loading.value = false
    }
  }

  const deleteRegistration = async (eventId, registrationId) => {
    loading.value = true
    try {
      await apiService.deleteRegistration(eventId, registrationId)
      await fetchEventRegistrations(eventId)
      ElMessage.success('Регистрация отменена')
    } catch (error) {
      console.error('Failed to cancel registration:', error)
      const message = error.response?.data?.detail || 'Не удалось отменить регистрацию'
      ElMessage.error(message)
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateRegistrationStatus = async (eventId, registrationId, status) => {
    loading.value = true
    try {
      await apiService.updateRegistrationStatus(eventId, registrationId, status)
      await fetchEventRegistrations(eventId)
      
      const statusMessages = {
        'confirmed': 'Заявка подтверждена',
        'cancelled': 'Заявка отклонена',
        'pending': 'Заявка переведена в ожидание'
      }
      
      ElMessage.success(statusMessages[status] || 'Статус заявки обновлен')
    } catch (error) {
      console.error('Failed to update registration status:', error)
      const message = error.response?.data?.detail || 'Не удалось обновить статус заявки'
      ElMessage.error(message)
      throw error
    } finally {
      loading.value = false
    }
  }

  const setPage = (page) => {
    pagination.value.currentPage = page
  }

  const setPageSize = (size) => {
    pagination.value.pageSize = size
    pagination.value.currentPage = 1
  }

  const clearState = () => {
    registrations.value = []
    myRegistration.value = null
    pagination.value = {
      currentPage: 1,
      pageSize: 20,
      total: 0
    }
  }

  return {
    // State
    registrations,
    myRegistration,
    loading,
    pagination,
    
    // Getters
    pendingRegistrations,
    confirmedRegistrations,
    isRegistered,
    myRegistrationStatus,
    
    // Actions
    fetchEventRegistrations,
    fetchMyRegistration,
    registerForEvent,
    cancelRegistration,
    createRegistration,
    deleteRegistration,
    updateRegistrationStatus,
    setPage,
    setPageSize,
    clearState
  }
})