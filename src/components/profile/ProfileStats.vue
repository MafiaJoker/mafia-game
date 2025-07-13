<template>
  <div class="profile-stats">
    <h3 class="stats-title">
      <el-icon><DataAnalysis /></el-icon>
      Статистика
    </h3>
    
    <div class="stats-grid">
      <!-- Общие игры -->
      <div class="stat-card">
        <div class="stat-icon games">
          <el-icon><VideoPlay /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalGames }}</div>
          <div class="stat-label">Игр сыграно</div>
        </div>
      </div>

      <!-- Процент побед -->
      <div class="stat-card">
        <div class="stat-icon winrate">
          <el-icon><Trophy /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.winRate }}%</div>
          <div class="stat-label">Процент побед</div>
        </div>
      </div>

      <!-- Турниры -->
      <div class="stat-card">
        <div class="stat-icon tournaments">
          <el-icon><Medal /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.tournaments }}</div>
          <div class="stat-label">Турниров</div>
        </div>
      </div>

      <!-- Рейтинг -->
      <div class="stat-card">
        <div class="stat-icon rating">
          <el-icon><Star /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.rating }}</div>
          <div class="stat-label">Рейтинг</div>
        </div>
      </div>
    </div>

    <!-- Детальная статистика -->
    <div class="detailed-stats">
      <h4 class="detailed-title">Детальная статистика</h4>
      
      <div class="progress-stats">
        <div class="progress-item">
          <div class="progress-header">
            <span>Победы</span>
            <span class="progress-value">{{ stats.wins }}/{{ stats.totalGames }}</span>
          </div>
          <el-progress 
            :percentage="(stats.wins / stats.totalGames) * 100" 
            :stroke-width="8"
            status="success"
          />
        </div>

        <div class="progress-item">
          <div class="progress-header">
            <span>Поражения</span>
            <span class="progress-value">{{ stats.losses }}/{{ stats.totalGames }}</span>
          </div>
          <el-progress 
            :percentage="(stats.losses / stats.totalGames) * 100" 
            :stroke-width="8"
            status="exception"
          />
        </div>
      </div>

      <div class="best-role">
        <el-tag type="primary" size="large" effect="dark">
          <el-icon><User /></el-icon>
          Лучшая роль: {{ stats.bestRole }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { DataAnalysis, VideoPlay, Trophy, Medal, Star, User } from '@element-plus/icons-vue'

  const props = defineProps({
    stats: {
      type: Object,
      required: true
    }
  })
</script>

<style scoped>
  .profile-stats {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    height: fit-content;
  }

  .stats-title {
    margin: 0 0 20px 0;
    font-size: 20px;
    font-weight: 600;
    color: #303133;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stats-grid {
    display: grid;
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: 8px;
    background: #f8f9fa;
    transition: all 0.3s ease;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
  }

  .stat-icon.games {
    background: linear-gradient(135deg, #667eea, #764ba2);
  }

  .stat-icon.winrate {
    background: linear-gradient(135deg, #f093fb, #f5576c);
  }

  .stat-icon.tournaments {
    background: linear-gradient(135deg, #4facfe, #00f2fe);
  }

  .stat-icon.rating {
    background: linear-gradient(135deg, #43e97b, #38f9d7);
  }

  .stat-content {
    flex: 1;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #303133;
    line-height: 1;
  }

  .stat-label {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }

  .detailed-stats {
    border-top: 1px solid #e4e7ed;
    padding-top: 20px;
  }

  .detailed-title {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .progress-stats {
    margin-bottom: 20px;
  }

  .progress-item {
    margin-bottom: 16px;
  }

  .progress-item:last-child {
    margin-bottom: 0;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .progress-value {
    color: #909399;
    font-weight: 500;
  }

  .best-role {
    text-align: center;
  }

  .best-role .el-tag {
    padding: 8px 16px;
    font-size: 14px;
  }

  /* Адаптивность */
  @media (max-width: 768px) {
    .profile-stats {
      padding: 16px;
    }

    .stats-title {
      font-size: 18px;
      margin-bottom: 16px;
    }

    .stat-card {
      padding: 12px;
    }

    .stat-icon {
      width: 40px;
      height: 40px;
      font-size: 18px;
    }

    .stat-value {
      font-size: 20px;
    }
  }
</style>