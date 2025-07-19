import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiService } from '@/services/api'

export const useTariffsStore = defineStore('tariffs', () => {
  const tariffs = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchTariffs() {
    loading.value = true
    error.value = null
    try {
      const response = await apiService.getTariffs()
      // Проверяем, является ли ответ объектом с полем items или массивом
      tariffs.value = response.items || response
      return { success: true }
    } catch (e) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  async function createTariff(tariffData) {
    loading.value = true
    error.value = null
    try {
      const newTariff = await apiService.createTariff(tariffData)
      tariffs.value.push(newTariff)
      return { success: true, data: newTariff }
    } catch (e) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  async function updateTariff(tariffId, tariffData) {
    loading.value = true
    error.value = null
    try {
      const updatedTariff = await apiService.updateTariff(tariffId, tariffData)
      const index = tariffs.value.findIndex(t => t.id === tariffId)
      if (index !== -1) {
        tariffs.value[index] = updatedTariff
      }
      return { success: true, data: updatedTariff }
    } catch (e) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  async function deleteTariff(tariffId) {
    loading.value = true
    error.value = null
    try {
      await apiService.deleteTariff(tariffId)
      tariffs.value = tariffs.value.filter(t => t.id !== tariffId)
      return { success: true }
    } catch (e) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  function getTariffById(id) {
    return tariffs.value.find(t => t.id === id)
  }

  return {
    tariffs,
    loading,
    error,
    fetchTariffs,
    createTariff,
    updateTariff,
    deleteTariff,
    getTariffById
  }
})