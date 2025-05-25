import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiService } from '@/services/api.js'

export const useJudgesStore = defineStore('judges', () => {
    const judges = ref([])
    const loading = ref(false)

    const loadJudges = async () => {
	loading.value = true
	try {
	    judges.value = await apiService.getJudges()
	} catch (error) {
	    console.error('Ошибка загрузки ведущих:', error)
	    throw error
	} finally {
	    loading.value = false
	}
    }

    const getJudgeById = (judgeId) => {
	return judges.value.find(judge => judge.id === judgeId)
    }

    return {
	judges,
	loading,
	loadJudges,
	getJudgeById
    }
})
