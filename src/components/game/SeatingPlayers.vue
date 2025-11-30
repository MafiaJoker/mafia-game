<template>
  <div class="seating-players">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><UserFilled /></el-icon>
            <span>Рассадка игроков</span>
          </div>
        </div>
      </template>

      <el-table
        :data="players"
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
import { ref } from 'vue'
import { UserFilled } from '@element-plus/icons-vue'

// Создаем массив из 10 игроков
const players = ref([
  { position: 1, name: '' },
  { position: 2, name: '' },
  { position: 3, name: '' },
  { position: 4, name: '' },
  { position: 5, name: '' },
  { position: 6, name: '' },
  { position: 7, name: '' },
  { position: 8, name: '' },
  { position: 9, name: '' },
  { position: 10, name: '' }
])
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
