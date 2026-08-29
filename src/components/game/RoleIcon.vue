<template>
  <CitizenIcon v-if="role === GameRolesEnum.civilian" />
  <SheriffIcon v-else-if="role === GameRolesEnum.sheriff" />
  <DonIcon v-else-if="role === GameRolesEnum.don" />
  <MafiaIcon v-else-if="role === GameRolesEnum.mafia" />
</template>

<script setup>
import CitizenIcon from './icons/CitizenIcon.vue'
import SheriffIcon from './icons/SheriffIcon.vue'
import DonIcon from './icons/DonIcon.vue'
import MafiaIcon from './icons/MafiaIcon.vue'
import { GameRolesEnum } from '@/utils/constants.js'

// Иконка роли по её коду: одна на колонку таблицы и на список телефона
defineProps({
  role: {
    type: String,
    default: GameRolesEnum.civilian
  }
})
</script>
