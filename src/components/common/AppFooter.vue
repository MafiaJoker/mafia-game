<template>
  <el-footer class="app-footer">
    <div class="footer-content">
      <div class="footer-info">
        <span class="version-info">
          v{{ version }} 
          <span v-if="commitHash" class="commit-hash">
            ({{ commitHash }})
          </span>
        </span>
        <span class="build-time" v-if="buildTime">
          Built {{ buildTime }}
        </span>
      </div>
      <div class="footer-links">
        <span>&copy; 2025 Mafia Game Helper</span>
      </div>
    </div>
  </el-footer>
</template>

<script setup>
  import { computed } from 'vue'
  
  const version = computed(() => {
    return import.meta.env.VITE_APP_VERSION || '1.0.0'
  })
  
  const commitHash = computed(() => {
    const hash = import.meta.env.VITE_APP_COMMIT_HASH
    return hash ? hash.substring(0, 7) : null
  })
  
  const buildTime = computed(() => {
    const time = import.meta.env.VITE_APP_BUILD_TIME
    if (!time) return null
    
    const date = new Date(time)
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  })
</script>

<style scoped>
  .app-footer {
    background-color: #f8f9fa;
    border-top: 1px solid #e4e7ed;
    padding: 16px 24px;
    min-height: auto;
  }

  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    font-size: 12px;
    color: #606266;
  }

  .footer-info {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .version-info {
    font-weight: 500;
  }

  .commit-hash {
    color: #909399;
    font-family: 'Courier New', monospace;
  }

  .build-time {
    color: #909399;
  }

  .footer-links {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  @media (max-width: 768px) {
    .footer-content {
      flex-direction: column;
      gap: 8px;
      text-align: center;
    }
  }
</style>