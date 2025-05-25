<template>
  <div class="judge-selector">
    <div class="judge-label">Ведущий:</div>
    <el-select
      v-model="selectedJudge"
      placeholder="Выберите ведущего"
      size="small"
      style="width: 180px"
      @change="handleJudgeChange"
      >
      <el-option
        v-for="judge in judges"
        :key="judge.id"
        :label="judge.name"
        :value="judge.id"
	/>
    </el-select>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useJudgesStore } from '@/stores/judges'

  const judgesStore = useJudgesStore()

  const selectedJudge = ref(localStorage.getItem('defaultJudgeId') || null)
  const judges = ref([])

  const handleJudgeChange = (judgeId) => {
      if (judgeId) {
	  localStorage.setItem('defaultJudgeId', judgeId)
      } else {
	  localStorage.removeItem('defaultJudgeId')
      }
  }

  onMounted(async () => {
      try {
	  await judgesStore.loadJudges()
	  judges.value = judgesStore.judges
	  
	  // Проверяем, что сохраненный ведущий еще существует
	  if (selectedJudge.value) {
	      const judgeExists = judges.value.some(j => j.id == selectedJudge.value)
	      if (!judgeExists) {
		  selectedJudge.value = null
		  localStorage.removeItem('defaultJudgeId')
	      }
	  }
      } catch (error) {
	  console.error('Ошибка загрузки ведущих:', error)
      }
  })
</script>

<style scoped>
  .judge-selector {
      display: flex;
      align-items: center;
      gap: 8px;
  }

  .judge-label {
      font-size: 14px;
      color: #606266;
      white-space: nowrap;
  }

  @media (max-width: 768px) {
      .judge-label {
	  display: none;
      }
  }
</style>
