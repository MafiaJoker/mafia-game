<template>
  <div class="role-badge" :class="'role-badge--' + role">
    <component :is="roleIcon" :size="size" class="role-icon-svg" />
  </div>
</template>

<script setup>
import IconDon from '@/components/icons/IconDon.vue'
import IconSheriff from '@/components/icons/IconSheriff.vue'
import IconMafia from '@/components/icons/IconMafia.vue'
import IconCivilian from '@/components/icons/IconCivilian.vue'

const props = defineProps({
  role: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 14
  }
})

const roleComponentMap = {
  don: IconDon,
  sheriff: IconSheriff,
  mafia: IconMafia,
  civilian: IconCivilian
}

const roleIcon = computed(() => roleComponentMap[props.role] || IconCivilian)
</script>

<style scoped>
/* Роль считывается цветом, а не рисунком иконки: команда - заливкой
   (красные vs чёрные), а дон и шериф выделены золотой окантовкой внутри
   своей команды. Плашка лежит поверх произвольного видео, поэтому у бейджа
   есть и тёмное кольцо, и светлая окантовка - он читается и на светлом
   кадре, и на тёмном */
.role-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.55), 0 1px 4px rgba(0, 0, 0, 0.6);
  z-index: 2;
}

.role-badge--civilian {
  background: #c62828;
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.role-badge--sheriff {
  background: #c62828;
  border: 2px solid #ffd740;
}

.role-badge--mafia {
  background: #17181a;
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.role-badge--don {
  background: #17181a;
  border: 2px solid #ffd740;
  color: #ffd740;
}

.role-icon-svg {
  flex-shrink: 0;
}
</style>
