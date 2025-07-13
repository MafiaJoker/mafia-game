<template>
  <div class="auth-layout">
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">
            <el-icon size="48" color="#409eff"><Trophy /></el-icon>
            <h1 class="app-name">Mafia Game Helper</h1>
          </div>
        </div>
        
        <div class="auth-content">
          <slot />
        </div>
        
        <div class="auth-footer">
          <p>&copy; 2024 Joker Mafia. Все права защищены.</p>
        </div>
      </div>
      
      <div class="auth-background">
        <div class="background-pattern"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { Trophy } from '@element-plus/icons-vue'
</script>

<style scoped>
  .auth-layout {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: relative;
    overflow: hidden;
  }

  .auth-container {
    width: 100%;
    max-width: 480px;
    padding: 20px;
    position: relative;
    z-index: 1;
  }

  .auth-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .auth-header {
    background: #f5f7fa;
    padding: 32px 24px;
    text-align: center;
    border-bottom: 1px solid #ebeef5;
  }

  .logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .app-name {
    font-size: 24px;
    color: #303133;
    margin: 0;
    font-weight: 600;
  }

  .auth-content {
    padding: 32px 40px;
  }

  .auth-footer {
    padding: 16px;
    text-align: center;
    background: #f5f7fa;
    border-top: 1px solid #ebeef5;
  }

  .auth-footer p {
    margin: 0;
    color: #909399;
    font-size: 12px;
  }

  .auth-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 0;
    pointer-events: none;
  }

  .background-pattern {
    position: absolute;
    width: 200%;
    height: 200%;
    top: -50%;
    left: -50%;
    background-image: 
      radial-gradient(circle at 20% 40%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 60%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 50% 90%, rgba(255, 255, 255, 0.08) 0%, transparent 50%);
    animation: float 20s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    33% { transform: translate(-20px, -20px) rotate(1deg); }
    66% { transform: translate(20px, -10px) rotate(-1deg); }
  }

  @media (max-width: 640px) {
    .auth-container {
      max-width: 100%;
      padding: 0;
    }

    .auth-card {
      border-radius: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .auth-content {
      flex: 1;
      padding: 24px;
    }
  }
</style>