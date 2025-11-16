<template>
  <div class="not-found-view">
    <div class="not-found-card">
      <div class="not-found-icon">
        <el-icon :size="80">
          <WarningFilled />
        </el-icon>
      </div>

      <h1 class="not-found-title">404</h1>
      <h2 class="not-found-subtitle">{{ $t('notFound.title') }}</h2>

      <p class="not-found-description">
        {{ $t('notFound.description') }}
      </p>

      <el-space :size="12" class="not-found-actions">
        <el-button type="primary" @click="goToEvents" :icon="Trophy">
          {{ $t('notFound.toEvents') }}
        </el-button>
        <el-button @click="goBack" :icon="ArrowLeft">
          {{ $t('notFound.goBack') }}
        </el-button>
      </el-space>
    </div>
  </div>
</template>

<script setup>
import { WarningFilled, Trophy, ArrowLeft } from '@element-plus/icons-vue'

const router = useRouter()

const goToEvents = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.not-found-view {
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.not-found-card {
  background: white;
  border-radius: 8px;
  padding: 48px 40px;
  text-align: center;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.not-found-icon {
  color: #409eff;
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

.not-found-title {
  font-size: 72px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 8px 0;
  line-height: 1;
  letter-spacing: -2px;
}

.not-found-subtitle {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

.not-found-description {
  font-size: 16px;
  color: #606266;
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.not-found-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .not-found-card {
    padding: 32px 24px;
  }

  .not-found-icon {
    font-size: 56px;
  }

  .not-found-title {
    font-size: 56px;
  }

  .not-found-subtitle {
    font-size: 20px;
  }

  .not-found-description {
    font-size: 14px;
  }

  .not-found-actions {
    flex-direction: column;
    width: 100%;
  }

  .not-found-actions :deep(.el-button) {
    width: 100%;
  }
}
</style>
