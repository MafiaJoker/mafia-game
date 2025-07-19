<template>
  <div class="profile-tariff">
    <h3 class="tariff-title">
      <el-icon><CreditCard /></el-icon>
      Мои тарифы
    </h3>
    
    <div v-if="userTariffs && userTariffs.length > 0" class="tariffs-list">
      <div 
        v-for="tariffAssoc in userTariffs" 
        :key="`${tariffAssoc.tariff.id}-${tariffAssoc.eventType.id}`"
        class="tariff-card"
      >
        <div class="tariff-header">
          <h4 class="tariff-name">{{ tariffAssoc.tariff.label }}</h4>
          <el-tag type="info" size="small">{{ tariffAssoc.eventType.label }}</el-tag>
        </div>
        
        <div class="tariff-price">
          {{ formatPrice(tariffAssoc.tariff.price) }} {{ getCurrencySymbol(tariffAssoc.tariff.iso_4217_code) }}
        </div>
      </div>
    </div>

    <div v-else class="no-tariff">
      <el-empty description="У вас нет активных тарифов">
        <el-button type="primary" @click="$router.push('/tariffs')">
          Посмотреть тарифы
        </el-button>
      </el-empty>
    </div>

    <div class="tariff-actions">
      <el-button 
        type="primary" 
        @click="$router.push('/tariffs')"
        :icon="ShoppingCart"
      >
        Управление тарифами
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { CreditCard, ShoppingCart } from '@element-plus/icons-vue'

const props = defineProps({
  userTariffs: {
    type: Array,
    default: () => []
  }
})

const formatPrice = (price) => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parseFloat(price))
}

const getCurrencySymbol = (code) => {
  const symbols = {
    'RUB': '₽',
    'USD': '$',
    'EUR': '€',
    'AMD': '֏'
  }
  return symbols[code] || code
}
</script>

<style scoped>
.profile-tariff {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.tariff-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tariffs-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.tariff-card {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.tariff-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tariff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tariff-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.tariff-price {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
}

.no-tariff {
  margin: 20px 0;
}

.tariff-actions {
  text-align: center;
}

/* Адаптивность */
@media (max-width: 768px) {
  .profile-tariff {
    padding: 16px;
  }

  .tariff-title {
    font-size: 18px;
    margin-bottom: 16px;
  }

  .tariff-name {
    font-size: 16px;
  }
}
</style>