<template>
  <div class="seating-players">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><UserFilled /></el-icon>
            <span>Рассадка игроков</span>
          </div>
          <el-button type="primary" @click="handleSeatingComplete">
            Рассадка готова
          </el-button>
        </div>
      </template>

      <el-table
        :data="Array.from({ length: 10 }, (_, i) => i + 1)"
        stripe
        style="width: 100%"
        :border="true"
      >
        <el-table-column
          prop="position"
          label="№"
          width="80"
          align="center"
        />

        <el-table-column
          label="Игрок"
          min-width="300"
        >
          <template #default="{ row }">
            <el-input
              v-model="row.name"
              placeholder="Введите имя игрока"
              clearable
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { UserFilled } from '@element-plus/icons-vue'


const emit = defineEmits(['seating-complete'])

const handleSeatingComplete = () => {
  console.log('объект игроков',)
}
</script>

<style scoped>
.seating-players {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
