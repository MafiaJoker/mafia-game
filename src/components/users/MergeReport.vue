<template>
  <!-- Разбор одного слияния: одинаковый в раскрытой строке таблицы и в
       карточке на телефоне -->
  <div class="merge-report">
    <div class="report-line">
      <span class="report-label">Основной</span>
      <span class="report-value">{{ personText(merge.target) }}</span>
    </div>

    <div class="report-line">
      <span class="report-label">Источники</span>
      <span class="report-value">
        <span v-for="source in merge.sources || []" :key="source.id" class="report-source">
          {{ personText(source) }}
        </span>
        <span v-if="!merge.sources?.length" class="report-source">{{ DASH }}</span>
      </span>
    </div>

    <div class="report-line">
      <span class="report-label">Запустил</span>
      <span class="report-value">
        {{ personText(merge.created_by, false) }} · {{ formatDateTime(merge.created_at) }}
      </span>
    </div>

    <div class="report-line">
      <span class="report-label">Завершено</span>
      <span class="report-value">{{ formatDateTime(merge.finished_at) }}</span>
    </div>

    <div v-if="merge.error_code" class="report-line">
      <span class="report-label">Код ошибки</span>
      <span class="report-value error">{{ merge.error_code }}</span>
    </div>

    <!-- report заполнен и у удачных слияний: это то, что осталось руками -->
    <div class="report-line">
      <span class="report-label">Отчёт</span>
      <pre v-if="merge.report" class="report-text">{{ merge.report }}</pre>
      <span v-else class="report-value">Ничего, что требует внимания</span>
    </div>
  </div>
</template>

<script setup>
import { formatDate } from '@/utils/formatters'

defineProps({
  merge: {
    type: Object,
    required: true
  }
})

// Снимок участников слияние дописывает в конце: у сорвавшегося его может не
// быть вовсе, и разбор такой строки не должен ронять рендер
const DASH = '—'

const personText = (person, withId = true) => {
  if (!person) return DASH
  return withId ? `${person.nickname} · ${person.id}` : person.nickname
}

// Слияние почти мгновенно и границу секунды переходит редко, поэтому время
// с миллисекундами: иначе «запущено» и «завершено» - одна и та же отметка.
// Незавершенное слияние оставляет дату пустой - показываем прочерк
const formatDateTime = (value) => (value ? formatDate(value, 'datetime-ms') : '—')
</script>

<style scoped>
.merge-report {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.report-line {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.report-label {
  flex: 0 0 110px;
  color: var(--el-text-color-secondary);
}

.report-value {
  min-width: 0;
  overflow-wrap: anywhere;
}

.report-source {
  display: block;
}

.report-value.error {
  color: var(--el-color-danger);
}

.report-text {
  margin: 0;
  min-width: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: inherit;
}

/* Телефон: подпись над значением, иначе на строку остается треть экрана */
@media (max-width: 767px) {
  .report-line {
    flex-direction: column;
    gap: 2px;
  }

  .report-label {
    flex: none;
  }
}
</style>
