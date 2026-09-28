<template>
  <div
    ref="rootRef"
    class="elo-trace-chart"
    tabindex="0"
    role="slider"
    aria-label="График рейтинга"
    aria-orientation="horizontal"
    aria-valuemin="1"
    :aria-valuemax="points.length"
    :aria-valuenow="currentGame.index + 1"
    :aria-valuetext="describe(currentGame)"
    :aria-describedby="summaryId"
    @focus="handleFocus"
    @blur="activeIndex = null"
    @keydown="handleKeydown"
  >
    <svg
      ref="svgRef"
      class="chart-svg"
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      aria-hidden="true"
    >
      <!-- Игровые дни - полосы через одну: сколько точек в полосе, столько
           игр сыграно в этот день -->
      <rect
        v-for="band in shadedBands"
        :key="`day-${band.start}`"
        class="day-band"
        :x="band.x"
        :y="MARGIN.top"
        :width="band.width"
        :height="plotHeight"
      />

      <!-- Сетка на круглых значениях. Линия стартового рейтинга темнее: выше
           неё игрок набрал, ниже - растерял -->
      <line
        v-for="tick in yTicks"
        :key="`grid-${tick.value}`"
        class="grid-line"
        :class="{ 'is-start': tick.value === startRating }"
        :x1="MARGIN.left"
        :x2="width - MARGIN.right"
        :y1="tick.y"
        :y2="tick.y"
      />
      <text
        v-for="tick in yTicks"
        :key="`y-${tick.value}`"
        class="tick-label"
        :x="MARGIN.left - 8"
        :y="tick.y"
        text-anchor="end"
        dominant-baseline="middle"
      >{{ tick.value }}</text>
      <text
        v-for="tick in xTicks"
        :key="`x-${tick.start}`"
        class="tick-label"
        :x="tick.x"
        :y="height - MARGIN.bottom + 18"
        text-anchor="middle"
      >{{ tick.label }}</text>

      <line
        v-if="active"
        class="crosshair"
        :x1="active.x"
        :x2="active.x"
        :y1="MARGIN.top"
        :y2="height - MARGIN.bottom"
      />

      <path class="line" :d="linePath" />
      <circle
        v-for="dot in dots"
        :key="dot.index"
        class="dot"
        :cx="dot.x"
        :cy="dot.y"
        r="4"
      />
      <!-- Подписано только последнее значение: остальные - в подсказке -->
      <text
        class="end-label"
        :x="lastDot.x + 10"
        :y="lastDot.y"
        dominant-baseline="middle"
      >{{ lastDot.value }}</text>
      <circle
        v-if="active"
        class="dot"
        :cx="active.x"
        :cy="active.y"
        r="5"
      />

      <!-- Ловушка указателя на всю высоту: читатель целится в дату, а не в
           линию толщиной 2px, и перекрестие само встаёт на игру под ним.
           Вертикальный свайп браузер забирает себе на прокрутку и шлёт
           pointercancel: подсказка уходит вместе с пальцем -->
      <rect
        class="hit-area"
        :x="MARGIN.left"
        :y="MARGIN.top"
        :width="plotWidth"
        :height="plotHeight"
        @pointerdown="handlePointer"
        @pointermove="handlePointer"
        @pointerleave="handlePointerLeave"
        @pointercancel="activeIndex = null"
      />
    </svg>

    <!-- Что значит полоса - день, месяц или год - зависит от длины истории -->
    <div class="chart-legend">Полоса — {{ period.legend }}</div>

    <div v-if="active" class="chart-tooltip" :style="tooltipStyle">
      <div class="tooltip-value">
        {{ active.value }}
        <span class="tooltip-delta">{{ formatSignedChange(active.delta, 1) }}</span>
      </div>
      <div>{{ formatDay(active.point.played_at, TOOLTIP_DATE) }}</div>
      <div v-if="active.gamesOfDay > 1">игра {{ active.gameOfDay }} из {{ active.gamesOfDay }} за день</div>
    </div>

    <span :id="summaryId" class="visually-hidden">{{ summary }}</span>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, useId } from 'vue'
import { formatDay, formatGamesCount, formatSignedChange, pluralize } from '@/utils/formatters'

const props = defineProps({
  // Точки следа игрока по порядку игр: { played_at, rating, delta } - рейтинг
  // после игры и изменение за неё. Пустой след график не рисует - что сказать
  // вместо него, решает карточка
  points: {
    type: Array,
    required: true,
    validator: (points) => points.length > 0
  },
  height: {
    type: Number,
    default: 240
  }
})

const MARGIN = { top: 16, right: 48, bottom: 28, left: 44 }
// Ширина до первого замера и там, где мерить нечем
const DEFAULT_WIDTH = 600
// Пока точки не сливаются в бусы, рисуем каждую; дальше - только линию
const MAX_DOTS = 24
// Ширина подписи оси на глаз - знак шрифта 11px с запасом на кириллицу - и
// просвет между соседними подписями: ближе они налезают друг на друга
const LABEL_CHAR_WIDTH = 7
const LABEL_GAP = 12
// Полоса уже этого в среднем рябит, как штрихкод, - тогда полосой берётся
// период крупнее
const MIN_BAND_WIDTH = 8
// Половина ширины подсказки: ближе к краю её не сдвигаем, чтобы не обрезалась
const TOOLTIP_HALF_WIDTH = 84
// Шаги сетки - круглые числа
const Y_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]
const Y_INTERVALS = 4

const AXIS_DATE = { day: '2-digit', month: '2-digit' }
const AXIS_DATE_WITH_YEAR = { day: '2-digit', month: '2-digit', year: '2-digit' }
const TOOLTIP_DATE = { day: 'numeric', month: 'short', year: 'numeric' }
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

// Чем может быть полоса, от мелкого к крупному. Ключ - начало даты игры
// ('2026-09-19'): день целиком, месяц или год
const PERIODS = [
  { unit: 'day', length: 10, legend: 'игровой день' },
  { unit: 'month', length: 7, legend: 'месяц' },
  { unit: 'year', length: 4, legend: 'год' }
]

const rootRef = ref(null)
const svgRef = ref(null)
const width = ref(DEFAULT_WIDTH)
const activeIndex = ref(null)

// Игры листаются стрелками, как ползунок. Роль slider говорит это экранному
// диктору: он отдаёт стрелки графику и читает выбранную игру из
// aria-valuetext, а сводку по всему графику - из описания
const summaryId = useId()

// Ширину меряем в пикселях, а не растягиваем viewBox: иначе вместе с линией
// растянулись бы и подписи
let resizeObserver = null

const measure = () => {
  const measured = rootRef.value?.clientWidth
  if (measured) width.value = measured
}

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(rootRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

// Другой игрок - старая подсказка к нему уже не относится
watch(() => props.points, () => {
  activeIndex.value = null
})

const plotWidth = computed(() => Math.max(width.value - MARGIN.left - MARGIN.right, 1))
const plotHeight = computed(() => Math.max(props.height - MARGIN.top - MARGIN.bottom, 1))

const values = computed(() => props.points.map((point) => point.rating))

// Рейтинг до первой игры. Старт задают настройки профиля, и у игроков он
// может быть разным; сервер его не отдаёт, но у первой точки есть и рейтинг
// после игры, и изменение за неё
const startRating = computed(() => {
  const [first] = props.points
  return Math.round(first.rating - first.delta)
})

// Шкала всегда включает старт: рост и падение видны относительно него.
// Деления отсчитываются от старта, поэтому его линия всегда на делении
const yDomain = computed(() => {
  const start = startRating.value
  const low = Math.min(start, ...values.value)
  const high = Math.max(start, ...values.value)
  // Запас, чтобы крайние точки не легли на край графика
  const padding = Math.max((high - low) * 0.1, 5)
  const span = high - low + padding * 2
  const step = Y_STEPS.find((candidate) => span / candidate <= Y_INTERVALS) ?? Y_STEPS[Y_STEPS.length - 1]
  return {
    min: start - Math.ceil((start - low + padding) / step) * step,
    max: start + Math.ceil((high + padding - start) / step) * step,
    step
  }
})

// По горизонтали у каждой игры своя ячейка равной ширины, точка - в её
// середине. Время по оси не откладывается: за вечер играют несколько игр,
// и на оси времени они встали бы одна над другой
const slotWidth = computed(() => plotWidth.value / props.points.length)

const xOf = (index) => MARGIN.left + (index + 0.5) * slotWidth.value

// Подряд идущие игры одного периода: дня, месяца или года - по длине ключа
const groupBy = (length) => {
  const groups = []
  props.points.forEach((point, index) => {
    const key = String(point.played_at).slice(0, length)
    const current = groups[groups.length - 1]
    if (current?.key === key) {
      current.end = index
    } else {
      groups.push({ key, start: index, end: index })
    }
  })
  return groups.map((group) => ({
    ...group,
    x: MARGIN.left + group.start * slotWidth.value,
    width: (group.end - group.start + 1) * slotWidth.value
  }))
}

// Дни нужны всегда: подсказка говорит, какая это игра за день
const days = computed(() => groupBy(PERIODS[0].length))

// Полоса - самый мелкий период, при котором она в среднем не уже
// MIN_BAND_WIDTH: сезон игр по вечерам делится на дни, год - на месяцы
const period = computed(() => {
  for (const level of PERIODS) {
    const groups = level.unit === 'day' ? days.value : groupBy(level.length)
    if (plotWidth.value / groups.length >= MIN_BAND_WIDTH) return { ...level, groups }
  }
  const largest = PERIODS[PERIODS.length - 1]
  return { ...largest, groups: groupBy(largest.length) }
})

// Полосы через одну: соседние периоды не сливаются
const shadedBands = computed(() => period.value.groups.filter((_, order) => order % 2 === 0))

const yOf = (value) => {
  const { min, max } = yDomain.value
  return MARGIN.top + ((max - value) / (max - min)) * plotHeight.value
}

const yTicks = computed(() => {
  const { min, max, step } = yDomain.value
  const ticks = []
  for (let value = min; value <= max; value += step) {
    ticks.push({ value, y: yOf(value) })
  }
  return ticks
})

// Подпись - под серединой своего периода. Периоды, чья подпись налезла бы
// на прошлую, остаются без подписи: их отделяет полоса. Месяц подписан годом,
// когда год сменился, - иначе после декабря не понять, какой это январь
const xTicks = computed(() => {
  const { unit, groups } = period.value
  const years = new Set(groups.map((group) => group.key.slice(0, 4)))
  const dayFormat = years.size > 1 ? AXIS_DATE_WITH_YEAR : AXIS_DATE
  const ticks = []
  let labeledYear = null

  groups.forEach((group) => {
    const x = group.x + group.width / 2
    const year = group.key.slice(0, 4)
    let label = group.key
    if (unit === 'day') {
      label = formatDay(group.key, dayFormat)
    } else if (unit === 'month') {
      const month = MONTHS[Number(group.key.slice(5, 7)) - 1]
      label = year === labeledYear ? month : `${month} ${year}`
    }
    const previous = ticks[ticks.length - 1]
    const room = previous && (previous.label.length + label.length) * LABEL_CHAR_WIDTH / 2 + LABEL_GAP
    if (previous && x - previous.x < room) return
    labeledYear = year
    ticks.push({ start: group.start, x, label })
  })

  return ticks
})

const linePath = computed(() => props.points
  .map((point, index) => `${index ? 'L' : 'M'}${xOf(index).toFixed(1)},${yOf(point.rating).toFixed(1)}`)
  .join(' '))

const dotAt = (index) => ({
  index,
  value: values.value[index],
  x: xOf(index),
  y: yOf(values.value[index])
})

const lastDot = computed(() => dotAt(props.points.length - 1))

const dots = computed(() => (
  props.points.length <= MAX_DOTS
    ? props.points.map((_, index) => dotAt(index))
    : [lastDot.value]
))

// Изменение за игру - из следа, а не разность соседних точек: точки
// округлены до целого, и игра с +0.8 выглядела бы как «±0»
const gameAt = (index) => {
  const day = days.value.find((candidate) => index <= candidate.end)
  return {
    ...dotAt(index),
    point: props.points[index],
    delta: props.points[index].delta,
    gameOfDay: index - day.start + 1,
    gamesOfDay: day.end - day.start + 1
  }
}

const active = computed(() => {
  if (activeIndex.value === null || !props.points.length) return null
  return gameAt(Math.min(activeIndex.value, props.points.length - 1))
})

// Игра, которую сейчас называет диктор: выбранная, а без выбора - последняя
const currentGame = computed(() => active.value || gameAt(props.points.length - 1))

const tooltipStyle = computed(() => {
  const { x, y } = active.value
  const left = Math.min(Math.max(x, TOOLTIP_HALF_WIDTH), width.value - TOOLTIP_HALF_WIDTH)
  // Точка в верхней половине - подсказка под ней, в нижней - над ней
  const below = y < props.height / 2
  return {
    left: `${left}px`,
    top: `${below ? y + 14 : y - 14}px`,
    transform: `translate(-50%, ${below ? '0' : '-100%'})`
  }
})

const summary = computed(() => {
  const count = values.value.length
  const dayCount = days.value.length
  return `${formatGamesCount(count)} за ${dayCount} ${pluralize(dayCount, ['день', 'дня', 'дней'])}, `
    + `от ${Math.min(...values.value)} до ${Math.max(...values.value)}, `
    + `после последней игры ${values.value[count - 1]}. Стрелки влево и вправо листают игры`
})

// То же, что в подсказке, словами - для экранного диктора
const describe = ({ value, delta, point, gameOfDay, gamesOfDay }) => {
  const game = gamesOfDay > 1 ? `, игра ${gameOfDay} из ${gamesOfDay} за день` : ''
  return `${formatDay(point.played_at, TOOLTIP_DATE)}${game}: рейтинг ${value}, ${formatSignedChange(delta, 1)}`
}

// Под указателем - ячейка той игры, чья точка в её середине
const indexAt = (clientX) => {
  const left = svgRef.value.getBoundingClientRect().left
  const slot = Math.floor((clientX - left - MARGIN.left) / slotWidth.value)
  return Math.min(props.points.length - 1, Math.max(0, slot))
}

const handlePointer = (event) => {
  activeIndex.value = indexAt(event.clientX)
}

// Мышь ушла - подсказка прячется. Палец отпустили - остаётся, пока не тапнут
// мимо графика: иначе её не успеть прочитать
const handlePointerLeave = (event) => {
  if (event.pointerType === 'mouse') activeIndex.value = null
}

// С клавиатуры начинаем с последней игры - она самая интересная. Фокус от
// клика мышью мимо линии - по легенде или подписи оси - подсказку не
// открывает: указатель на графике её не ведёт, и она осталась бы висеть
const handleFocus = () => {
  if (!rootRef.value?.matches(':focus-visible')) return
  if (activeIndex.value === null && props.points.length) {
    activeIndex.value = props.points.length - 1
  }
}

const KEY_STEPS = {
  ArrowLeft: (current) => current - 1,
  ArrowRight: (current) => current + 1,
  Home: () => 0,
  End: (_, count) => count - 1
}

const handleKeydown = (event) => {
  const count = props.points.length
  const step = KEY_STEPS[event.key]
  if (!count || !step) return
  event.preventDefault()
  const next = step(activeIndex.value ?? count - 1, count)
  activeIndex.value = Math.min(count - 1, Math.max(0, next))
}
</script>

<style scoped>
.elo-trace-chart {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 4px;
  outline: none;
  /* Вертикальный свайп листает страницу, горизонтальный - игры, а щипок
     увеличивает страницу, как везде */
  touch-action: pan-y pinch-zoom;
}

.elo-trace-chart:focus-visible {
  box-shadow: 0 0 0 2px var(--el-color-primary-light-5);
}

.chart-svg {
  display: block;
}

/* Заливка дня - ступень от белого фона карточки: сетка поверх неё видна */
.day-band {
  fill: #f4f6f9;
}

.chart-legend {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}

.grid-line {
  stroke: #ebeef5;
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.grid-line.is-start {
  stroke: #c0c4cc;
}

.tick-label {
  font-size: 11px;
  fill: #909399;
  font-variant-numeric: tabular-nums;
}

.crosshair {
  stroke: #c0c4cc;
  stroke-width: 1;
  shape-rendering: crispEdges;
}

/* Тёмная ступень основного синего: #409eff на белом не дотягивает до 3:1 */
.line {
  fill: none;
  stroke: #337ecc;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

/* Белое кольцо отделяет точку от линии, на которой она сидит */
.dot {
  fill: #337ecc;
  stroke: #fff;
  stroke-width: 2;
}

.end-label {
  font-size: 12px;
  font-weight: 600;
  fill: #303133;
}

.hit-area {
  fill: transparent;
  cursor: crosshair;
  touch-action: pan-y pinch-zoom;
}

.chart-tooltip {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  padding: 8px 10px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background-color: #fff;
  box-shadow: var(--el-box-shadow-light);
  font-size: 12px;
  line-height: 1.5;
  color: #606266;
  white-space: nowrap;
}

.tooltip-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.tooltip-delta {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #606266;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
