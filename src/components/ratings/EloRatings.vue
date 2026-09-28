<template>
  <div ref="rootRef" class="elo-ratings">
    <!-- Профиль задаёт выборку игр: по нему считаются и таблица, и график -->
    <el-card class="filters-card">
      <div class="elo-toolbar">
        <el-form :inline="true" class="filters-form" @submit.prevent>
          <el-form-item label="Профиль">
            <el-select
              v-model="profileId"
              placeholder="Профиль рейтинга"
              :loading="profilesLoading"
              :disabled="!profiles.length"
              class="profile-select"
              @change="reloadTable"
            >
              <el-option
                v-for="profile in profiles"
                :key="profile.id"
                :label="profile.name"
                :value="profile.id"
              />
            </el-select>
          </el-form-item>
        </el-form>

        <!-- Рейтинг меняется, когда сохраняют протокол игры, а игры без
             протокола подбирает ночная сверка: время последнего изменения
             объясняет, почему вчерашней игры в нём ещё нет -->
        <div v-if="profileMeta" class="profile-meta">{{ profileMeta }}</div>
      </div>
    </el-card>

    <el-card v-if="profilesLoading" v-loading="true" class="state-card" />

    <el-card v-else-if="blockingMessage" class="state-card">
      <el-empty :description="blockingMessage">
        <el-button v-if="profilesFailed" @click="loadProfiles">Повторить</el-button>
      </el-empty>
    </el-card>

    <div v-else class="elo-layout">
      <!-- График: по умолчанию свой, по клику на строку - выбранного игрока -->
      <EloPlayerTrace
        ref="traceRef"
        class="elo-trace"
        :style="traceStyle"
        :profile-id="profileId"
        :player="chartPlayer"
        :is-me="isChartMe"
        :can-show-mine="!!me && !isChartMe"
        @reset="selectedPlayer = null"
      />

      <el-card ref="tableCardRef" class="elo-table-card">
        <template v-if="rows.length || ratingsLoading">
          <!-- Телефон: место, ник и рейтинг в строке, тап открывает график -->
          <div v-if="isMobile" v-loading="ratingsLoading" class="rating-list">
            <div
              v-for="row in rows"
              :key="row.user.id"
              class="rating-row rating-line"
              :class="{ 'is-selected': isChartRow(row) }"
              role="button"
              tabindex="0"
              :aria-current="isChartRow(row) ? 'true' : undefined"
              @click="selectPlayer(row)"
              @keydown.enter.prevent="selectPlayer(row)"
              @keydown.space.prevent="selectPlayer(row)"
            >
              <span class="rating-position" :class="{ top: row.position <= 3 }">
                {{ row.position }}
              </span>
              <span class="rating-player">
                <span class="rating-name">
                  <span class="rating-nickname">{{ row.user.nickname }}</span>
                  <el-tag v-if="isMeRow(row)" size="small" effect="plain" round>вы</el-tag>
                </span>
                <span class="rating-subline">
                  {{ formatGamesCount(row.games_counter) }} ·
                  <span :class="['delta', deltaClass(row.delta)]">{{ formatDelta(row.delta) }}</span>
                  <template v-if="row.delta !== null && row.delta !== undefined"> за неделю</template>
                </span>
              </span>
              <el-tag type="success" effect="dark" class="rating-score">
                {{ row.rating }}
              </el-tag>
            </div>
          </div>

          <el-table
            v-else
            v-loading="ratingsLoading"
            :data="rows"
            :row-key="rowKey"
            :row-class-name="rowClassName"
            style="width: 100%"
            stripe
            @row-click="selectPlayer"
          >
            <!-- Пустую страницу объясняет блок под таблицей, а не «No Data» -->
            <template #empty><span /></template>

            <el-table-column
              prop="position"
              label="Место"
              :width="isTablet ? 70 : 76"
              align="center"
            />

            <el-table-column label="Игрок" :min-width="140">
              <template #default="{ row }">
                <div class="player-cell">
                  <!-- Ник - кнопка: строки таблицы в порядок табуляции не
                       попадают, а график должен открываться и с клавиатуры -->
                  <button
                    type="button"
                    class="player-button"
                    :aria-label="`${row.user.nickname}: показать график`"
                    :aria-current="isChartRow(row) ? 'true' : undefined"
                    @click.stop="selectPlayer(row)"
                  >{{ row.user.nickname }}</button>
                  <el-tag v-if="isMeRow(row)" size="small" effect="plain" round>вы</el-tag>
                </div>
              </template>
            </el-table-column>

            <!-- По рейтингу сервер строит порядок -->
            <el-table-column
              prop="rating"
              label="Рейтинг"
              :width="96"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  type="success"
                  :size="isTablet ? 'default' : 'large'"
                  effect="dark"
                >
                  {{ row.rating }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="delta" :width="136" align="center">
              <template #header>
                <span class="header-with-hint">
                  За неделю
                  <HintTooltip :text="DELTA_HINT" label="Что значит «За неделю»" />
                </span>
              </template>
              <template #default="{ row }">
                <span :class="['delta', deltaClass(row.delta)]">{{ formatDelta(row.delta) }}</span>
              </template>
            </el-table-column>

            <el-table-column
              prop="games_counter"
              label="Игр"
              :width="64"
              align="center"
            >
              <template #default="{ row }">
                <span class="games-value">{{ row.games_counter ?? 0 }}</span>
              </template>
            </el-table-column>
          </el-table>

          <!-- На телефоне нет заголовка колонки с подсказкой: что значит
               «новый», говорим под списком, когда слово в нём есть -->
          <p v-if="isMobile && hasNewcomers" class="list-note">{{ NEW_PLAYER_HINT }}</p>
        </template>

        <div v-else class="empty-state">
          <el-empty :description="tableEmptyDescription">
            <el-button v-if="ratingsFailed" @click="loadRatings">Повторить</el-button>
          </el-empty>
        </div>

        <div v-if="total > 0" class="table-footer">
          <span class="table-total">В таблице {{ playersLabel(total) }}</span>
          <el-pagination
            v-if="total > PAGE_SIZE"
            v-model:current-page="currentPage"
            :page-size="PAGE_SIZE"
            :total="total"
            :pager-count="isMobile ? 5 : 7"
            :size="isMobile ? 'small' : 'default'"
            layout="prev, pager, next"
            background
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useBreakpoints } from '@/composables/useBreakpoints'
import { formatDate, formatDay, formatGamesCount, formatSignedChange, pluralize } from '@/utils/formatters'
import { ELO_ERROR_DETAILS, getEloErrorDetail } from '@/utils/errorMessages'
import HintTooltip from '@/components/common/HintTooltip.vue'
import EloPlayerTrace from './EloPlayerTrace.vue'

const PAGE_SIZE = 20

// Промежутки сетки: между карточками на планшете и телефоне и от края
// области прокрутки до липкого графика на компьютере
const COMPACT_GAP = 12
const STICKY_GAP = 20

// Изменение рейтинга - за последние 7 дней, считая сегодняшний. Сервер
// включает в период оба его конца, поэтому начало - шесть дней назад.
// Рейтинг меняется только в играх, так что это сумма изменений за игры недели
const DELTA_DAYS = 7

const NEW_PLAYER_HINT = '«новый» — неделю назад игрок ещё не прошёл калибровку'
const DELTA_HINT = `Как изменился рейтинг за последние 7 дней, считая сегодняшний. ${NEW_PLAYER_HINT}`

const NO_GAMES_MESSAGE = 'В этом рейтинге пока нет игр. '
  + 'Таблица появится после первой игры'

const { isMobile, isTablet, isDesktop, isCompact } = useBreakpoints()
const authStore = useAuthStore()

const profiles = ref([])
const profileId = ref(null)
const profilesLoading = ref(true)
const profilesFailed = ref(false)

const rows = ref([])
const total = ref(0)
const currentPage = ref(1)
const ratingsLoading = ref(false)
// Причина пустой таблицы: detail ELO-ручки, 'failed' - сбой, null - всё хорошо
const ratingsProblem = ref(null)

// Кого показывает график: null - самого себя
const selectedPlayer = ref(null)
const rootRef = ref(null)
const traceRef = ref(null)
const tableCardRef = ref(null)

// Высота области прокрутки на компьютере: в неё должен влезать липкий график
const scrollAreaHeight = ref(0)
let scrollAreaObserver = null

// Быстро листают страницы или меняют профиль - ответы приходят вразнобой.
// Применяем только ответ на последний запрос
let ratingsToken = 0

const selectedProfile = computed(() => (
  profiles.value.find((profile) => profile.id === profileId.value) || null
))

const playersLabel = (count) => `${count} ${pluralize(count, ['игрок', 'игрока', 'игроков'])}`

// Дата без времени ('2026-09-21') days дней назад по часам пользователя:
// toISOString дал бы дату по UTC, и в первые часы суток по Москве это был бы
// ещё вчерашний день
const daysAgo = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-')
}

const isNewcomer = (delta) => delta === null || delta === undefined

// null - неделю назад игрок ещё не прошёл калибровку: не играл вовсе или
// сыграл мало. Это не «не изменился», поэтому не ноль, а отдельное слово
const formatDelta = (delta) => (isNewcomer(delta) ? 'новый' : formatSignedChange(delta))

const deltaClass = (delta) => {
  if (isNewcomer(delta)) return 'is-new'
  if (delta > 0) return 'is-up'
  if (delta < 0) return 'is-down'
  return 'is-flat'
}

const hasNewcomers = computed(() => rows.value.some((row) => isNewcomer(row.delta)))

const profileMeta = computed(() => {
  const profile = selectedProfile.value
  if (!profile) return ''

  const parts = [
    profile.updated_at ? `Обновлён ${formatDate(profile.updated_at, 'long')}` : 'Игр пока нет'
  ]
  // Сезонный профиль считает историю не с начала времён
  if (profile.date_from) parts.push(`игры с ${formatDay(profile.date_from)}`)
  return parts.join(' · ')
})

// Состояния, в которых ни таблице, ни графику нечего показать
const blockingMessage = computed(() => {
  if (profilesFailed.value) return 'Не удалось загрузить ELO-рейтинг'
  if (!profiles.value.length) return 'ELO-рейтинг пока не настроен'
  if (ratingsProblem.value === ELO_ERROR_DETAILS.PROFILE_NOT_FOUND) {
    return 'Профиль рейтинга не найден. Обновите страницу'
  }
  if (!selectedProfile.value?.games_count) return NO_GAMES_MESSAGE
  return null
})

const ratingsFailed = computed(() => ratingsProblem.value === 'failed')

// В таблице только откалиброванные и игравшие недавно: сыгравший пару игр в
// неё ещё не попал, а давно не игравший из неё выпал
const tableEmptyDescription = computed(() => (
  ratingsFailed.value
    ? 'Не удалось загрузить таблицу'
    : 'В таблице пока никого нет: место в ней появляется после калибровочных игр, '
      + 'а тех, кто давно не играл, она не показывает'
))

const me = computed(() => (
  authStore.user ? { id: authStore.user.id, nickname: authStore.user.nickname } : null
))

const chartPlayer = computed(() => selectedPlayer.value || me.value)

const isChartMe = computed(() => !!me.value && chartPlayer.value?.id === me.value.id)

const isMeRow = (row) => row.user.id === me.value?.id

// Чей график открыт, видно и в таблице
const isChartRow = (row) => row.user.id === chartPlayer.value?.id

const rowKey = (row) => row.user.id

const rowClassName = ({ row }) => (isChartRow(row) ? 'elo-table-row is-selected' : 'elo-table-row')

// Компьютер: график прилипает к верху области прокрутки. На невысоком экране
// карточка в неё не влезает, и её низ прятался бы за краем: высоту карточки
// ограничиваем областью, лишнее прокручивается внутри неё
const traceStyle = computed(() => (
  isDesktop.value && scrollAreaHeight.value
    ? { maxHeight: `${scrollAreaHeight.value - 2 * STICKY_GAP}px`, overflowY: 'auto' }
    : null
))

// Нижний край шапки приложения на экране, 0 - если она уехала. На компьютере
// шапка стоит над областью прокрутки, на планшете и телефоне прокручивается
// сам документ, и шапка уезжает вместе с ним: её не угадываем, а меряем
const headerBottom = () => Math.max(
  0,
  document.querySelector('.app-header')?.getBoundingClientRect().bottom ?? 0
)

// Прокрутка к началу карточки. На компьютере отступ от края области
// прокрутки задан в стилях, на планшете и телефоне к нему добавляется шапка,
// если она на экране
const scrollToStart = (element) => {
  element.style.scrollMarginTop = isCompact.value ? `${headerBottom() + COMPACT_GAP}px` : ''
  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const isInView = (element) => {
  const rect = element.getBoundingClientRect()
  return rect.top >= headerBottom() && rect.bottom <= window.innerHeight
}

const selectPlayer = (row) => {
  selectedPlayer.value = { id: row.user.id, nickname: row.user.nickname }
  // На планшете и телефоне график над таблицей - подводим к нему, если он
  // виден не целиком
  const trace = traceRef.value?.$el
  if (isCompact.value && trace && !isInView(trace)) scrollToStart(trace)
}

const loadRatings = async () => {
  const token = ++ratingsToken
  ratingsLoading.value = true
  ratingsProblem.value = null
  try {
    const data = await apiService.getEloRatings({
      profile_id: profileId.value,
      currentPage: currentPage.value,
      pageSize: PAGE_SIZE,
      start_date: daysAgo(DELTA_DAYS - 1)
    })
    if (token !== ratingsToken) return
    const items = data?.items || []
    total.value = data?.total || 0
    // Таблица укоротилась, пока её листали, - кто-то из неё выпал: этой
    // страницы уже нет, уходим на последнюю
    const lastPage = Math.max(1, Math.ceil(total.value / PAGE_SIZE))
    if (!items.length && currentPage.value > lastPage) {
      currentPage.value = lastPage
      return loadRatings()
    }
    rows.value = items
  } catch (error) {
    if (token !== ratingsToken) return
    console.error('Failed to load ELO ratings:', error)
    // Число игроков не трогаем: пагинация остаётся, и страницу можно
    // повторить или уйти на другую
    rows.value = []
    ratingsProblem.value = getEloErrorDetail(error) || 'failed'
    if (ratingsProblem.value === 'failed') {
      ElMessage.error('Не удалось загрузить ELO-рейтинг')
    }
  } finally {
    if (token === ratingsToken) ratingsLoading.value = false
  }
}

// Пагинация под таблицей, а новая страница начинается сверху: туда и ведём,
// если начало таблицы уже не видно
const handlePageChange = async () => {
  await loadRatings()
  const card = tableCardRef.value?.$el
  if (card && card.getBoundingClientRect().top < headerBottom()) scrollToStart(card)
}

// Таблицу просим, только если в профиле есть игры: иначе ответ заранее известен
const reloadTable = () => {
  ratingsToken++
  currentPage.value = 1
  rows.value = []
  total.value = 0
  ratingsProblem.value = null
  ratingsLoading.value = false
  if (selectedProfile.value?.games_count) loadRatings()
}

const loadProfiles = async () => {
  profilesLoading.value = true
  profilesFailed.value = false
  try {
    profiles.value = (await apiService.getEloProfiles()) || []
    // Сервер ставит профиль по умолчанию первым, но надёжнее спросить флаг
    const preferred = profiles.value.find((profile) => profile.is_default) || profiles.value[0]
    profileId.value = preferred?.id ?? null
  } catch (error) {
    console.error('Failed to load ELO profiles:', error)
    profiles.value = []
    profileId.value = null
    profilesFailed.value = true
  } finally {
    profilesLoading.value = false
  }
  reloadTable()
}

onMounted(() => {
  loadProfiles()

  // Область прокрутки на компьютере - el-main приложения между шапкой и
  // подвалом (App.vue)
  const scrollArea = rootRef.value?.closest('.app-main')
  if (!scrollArea || typeof ResizeObserver === 'undefined') return
  scrollAreaObserver = new ResizeObserver(() => {
    scrollAreaHeight.value = scrollArea.clientHeight
  })
  scrollAreaObserver.observe(scrollArea)
})

onBeforeUnmount(() => {
  scrollAreaObserver?.disconnect()
})
</script>

<style scoped>
.filters-card {
  margin-bottom: 20px;
}

.elo-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 24px;
}

.filters-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.profile-select {
  width: 260px;
}

.profile-meta {
  font-size: 13px;
  color: #909399;
}

.state-card {
  min-height: 160px;
}

/* Компьютер: таблица и график рядом. График прилипает к верху окна, чтобы
   клик по строке внизу длинной таблицы не уводил его из виду */
.elo-layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 20px;
  align-items: start;
}

.elo-table-card {
  grid-column: 1;
  grid-row: 1;
  scroll-margin-top: 20px;
}

.elo-trace {
  grid-column: 2;
  grid-row: 1;
  position: sticky;
  top: 20px;
}

.player-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

/* Ник выглядит текстом строки, но это кнопка: до неё доходят табом. Рамка
   фокуса - внутри кнопки: ячейка таблицы обрезает всё, что выходит за неё
   сверху и снизу. Поля по бокам дают рамке отступ от букв, а отрицательные
   отступы возвращают ник на место */
.player-button {
  min-width: 0;
  margin: 0 -4px;
  padding: 0 4px;
  border: none;
  background: none;
  font: inherit;
  font-weight: 500;
  color: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
  border-radius: 4px;
}

.games-value {
  font-weight: 600;
  color: #606266;
}

/* Знак несёт смысл сам, цвет лишь помогает; оттенки темнее стандартных
   зелёного и красного Element Plus - тем на белом не хватает контраста */
.delta {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.delta.is-up {
  color: #2f7d32;
}

.delta.is-down {
  color: #c0392b;
}

.delta.is-flat,
.delta.is-new {
  font-weight: 500;
  color: #73767a;
}

.header-with-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

/* Строка открывает график игрока - показываем это курсором */
:deep(.elo-table-row) {
  cursor: pointer;
}

/* Чей график открыт, видно и в таблице. Перебивает полосатость строк */
:deep(.elo-table-row.is-selected > td.el-table__cell) {
  background-color: var(--el-color-primary-light-9) !important;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

.table-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}

.table-total {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

/* Планшет и телефон: график над таблицей, в одну колонку */
@media (max-width: 1023px) {
  .filters-card {
    margin-bottom: 12px;
  }

  .elo-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .elo-table-card,
  .elo-trace {
    grid-column: 1;
    grid-row: auto;
  }

  .elo-trace {
    position: static;
  }
}

/* Телефон. Подписи полей над полями - общее правило .filters-form в global.css */
@media (max-width: 767px) {
  .elo-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .profile-meta {
    font-size: 12px;
  }

  .elo-table-card :deep(.el-card__body) {
    padding: 0 12px;
  }

  .empty-state {
    padding: 24px 0;
  }

  .table-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    margin: 8px 0 12px;
  }

  .table-total {
    font-size: 13px;
    text-align: center;
  }

  .table-footer :deep(.el-pagination) {
    justify-content: center;
  }
}

/* Список на телефоне. Строка, место и игрок - общие правила списка рейтинга
   в global.css, здесь только то, чего нет у вкладки «По очкам» */
.rating-list {
  min-height: 80px;
}

.rating-row.is-selected {
  background-color: var(--el-color-primary-light-9);
}

.rating-name {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.rating-score {
  flex-shrink: 0;
  font-weight: 600;
}

.list-note {
  margin: 8px 4px 0;
  font-size: 12px;
  line-height: 1.4;
  color: #909399;
}
</style>
