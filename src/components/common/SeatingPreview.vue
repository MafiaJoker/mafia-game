<template>
  <div class="seating-preview">
    <div class="preview-header">
      <span class="preview-title">{{ title }}</span>
      <span v-if="seed" class="preview-seed">Сид: {{ seed }}</span>
    </div>

    <div v-for="table in previewTables" :key="table.tableId" class="preview-table">
      <div class="preview-table-name">{{ table.tableName }}</div>

      <!-- Телефон: таблица «место x игра» шире экрана, поэтому каждая игра -
           своя карточка с местами сверху вниз -->
      <div v-if="isMobile" class="preview-games">
        <div v-for="game in table.games" :key="game.label" class="preview-game">
          <div class="preview-game-label">{{ game.label }}</div>
          <ol class="preview-seats">
            <li v-for="seat in game.seats" :key="seat.boxId" class="preview-seat">
              <span class="seat-number">{{ seat.boxId }}</span>
              <span class="seat-nickname">{{ seat.nickname }}</span>
            </li>
          </ol>
        </div>
      </div>

      <div v-else class="preview-scroll">
        <table class="seating-table">
          <thead>
            <tr>
              <th class="seat-column">Место</th>
              <th v-for="game in table.games" :key="game.label">{{ game.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in table.rows" :key="row.boxId">
              <td class="seat-column">{{ row.boxId }}</td>
              <td v-for="(nickname, index) in row.nicknames" :key="index">
                {{ nickname }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBreakpoints } from '@/composables/useBreakpoints'
import { DEFAULT_PLAYERS_COUNT, DEFAULT_TABLE_NAME_TEMPLATE } from '@/utils/constants.js'

// Рассадка от сервера - список игр с местами. Ответ рассадки мероприятия и
// публичной рассадки устроен одинаково, поэтому и рисуется одинаково
const props = defineProps({
  games: {
    type: Array,
    required: true
  },
  seed: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: 'Рассадка'
  },
  tableNameTemplate: {
    type: String,
    default: DEFAULT_TABLE_NAME_TEMPLATE
  }
})

const { isMobile } = useBreakpoints()

const BOX_IDS = Array.from({ length: DEFAULT_PLAYERS_COUNT }, (_, index) => index + 1)

// Рассадка приходит списком игр, а читают ее по столам
const previewTables = computed(() => {
  const gamesByTable = new Map()
  props.games.forEach(game => {
    if (!gamesByTable.has(game.table_id)) gamesByTable.set(game.table_id, [])
    gamesByTable.get(game.table_id).push(game)
  })

  return [...gamesByTable.keys()].sort((a, b) => a - b).map(tableId => {
    // Места по порядку боксов: пропущенный бокс остается пустым местом,
    // а не сдвигает соседей вверх
    const games = gamesByTable.get(tableId).map(game => ({
      label: game.label,
      seats: BOX_IDS.map(boxId => ({
        boxId,
        nickname: game.seats.find(seat => seat.box_id === boxId)?.nickname || ''
      }))
    }))
    return {
      tableId,
      tableName: tableName(tableId),
      games,
      rows: BOX_IDS.map((boxId, index) => ({
        boxId,
        nicknames: games.map(game => game.seats[index].nickname)
      }))
    }
  })
})

const tableName = (tableId) => {
  const template = props.tableNameTemplate || DEFAULT_TABLE_NAME_TEMPLATE
  return template.includes('{}')
    ? template.replace('{}', tableId)
    : DEFAULT_TABLE_NAME_TEMPLATE.replace('{}', tableId)
}
</script>

<style scoped>
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-bottom: 12px;
}

.preview-title {
  font-weight: 600;
  color: #303133;
  overflow-wrap: anywhere;
}

.preview-seed {
  font-size: 12px;
  color: #909399;
  overflow-wrap: anywhere;
}

.preview-table {
  margin-bottom: 16px;
}

.preview-table:last-child {
  margin-bottom: 0;
}

.preview-table-name {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 6px;
}

.preview-scroll {
  overflow-x: auto;
}

/* Игры не влезли в ширину - полоса прокрутки под таблицей видна всегда и
   ее легко ухватить. Системная полоса в Chrome на Windows 11 и в macOS
   накладная: тонкая и прячется, пока на нее не навести. Своя полоса в
   Chrome, Edge и Safari не накладная, а появляется, только когда таблица
   и правда шире места (overflow-x: auto) */
.preview-scroll::-webkit-scrollbar {
  height: 12px;
}

.preview-scroll::-webkit-scrollbar-track {
  background-color: #f0f2f5;
  border-radius: 6px;
}

.preview-scroll::-webkit-scrollbar-thumb {
  background-color: #c0c4cc;
  border: 2px solid #f0f2f5;
  border-radius: 6px;
}

.preview-scroll::-webkit-scrollbar-thumb:hover,
.preview-scroll::-webkit-scrollbar-thumb:active {
  background-color: #909399;
}

/* Firefox этих псевдоэлементов не знает и красит полосу по scrollbar-color.
   Chrome понимает и то и другое, но scrollbar-color отключил бы у него
   стили выше - поэтому только там, где ::-webkit-scrollbar нет */
@supports not selector(::-webkit-scrollbar) {
  .preview-scroll {
    scrollbar-width: auto;
    scrollbar-color: #c0c4cc #f0f2f5;
  }
}

/* Рамки - у ячеек, а не общие: в слитых рамках прилипшая колонка мест
   теряла бы свои линии при прокрутке */
.seating-table {
  border-collapse: separate;
  border-spacing: 0;
  border-top: 1px solid #e4e7ed;
  font-size: 13px;
  min-width: 100%;
}

.seating-table th,
.seating-table td {
  border-right: 1px solid #e4e7ed;
  border-bottom: 1px solid #e4e7ed;
  padding: 4px 10px;
  text-align: left;
  white-space: nowrap;
  background-color: #fff;
}

.seating-table th {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

/* Игр больше, чем влезает в ширину: таблица прокручивается вбок, а номер
   места остается на виду */
.seating-table .seat-column {
  position: sticky;
  left: 0;
  z-index: 1;
  width: 60px;
  border-left: 1px solid #e4e7ed;
  color: #909399;
  text-align: center;
}

/* Карточки игр на телефоне: по две в ряд, длинный ник переносится
   внутри своей карточки и соседей не раздвигает */
.preview-games {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.preview-game {
  min-width: 0;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background-color: #fff;
  overflow: hidden;
}

.preview-game-label {
  padding: 6px 10px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.preview-seats {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.preview-seat {
  display: flex;
  gap: 8px;
  padding: 3px 10px;
  font-size: 13px;
  line-height: 1.4;
}

.seat-number {
  flex-shrink: 0;
  min-width: 18px;
  text-align: right;
  color: #909399;
  font-variant-numeric: tabular-nums;
}

.seat-nickname {
  min-width: 0;
  color: #303133;
  overflow-wrap: anywhere;
}
</style>
