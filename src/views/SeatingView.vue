<template>
  <div class="seating-view">
    <div class="seating-container">
      <div class="seating-heading">
        <h1 class="seating-title">{{ SEATING_PAGE_HEADING }}</h1>
        <p class="seating-subtitle">{{ SEATING_PAGE_SUBTITLE }}</p>
      </div>

      <el-alert
        v-if="loadError"
        :title="loadError"
        type="error"
        :closable="false"
        show-icon
        class="load-alert"
      />

      <div class="seating-layout">
        <el-card class="seating-card form-card" shadow="never">
          <template #header>
            <span class="card-title">Параметры</span>
          </template>

          <el-form
            :model="form"
            label-position="top"
            class="seating-form"
            :disabled="loadingSeating"
            @submit.prevent
          >
            <el-form-item label="Название (необязательно)">
              <el-input
                v-model="form.title"
                class="title-input"
                placeholder="Например, «Клуб X, отбор»"
                :maxlength="SEATING_TITLE_MAX_LENGTH"
                clearable
              />
            </el-form-item>

            <div class="counts-row">
              <el-form-item label="Столов">
                <el-input-number
                  v-model="form.tablesCount"
                  class="tables-input"
                  :min="1"
                  :max="SEATING_MAX_TABLES_COUNT"
                  :precision="0"
                  value-on-clear="min"
                />
              </el-form-item>
              <el-form-item label="Игр">
                <el-input-number
                  v-model="form.gamesCount"
                  class="games-input"
                  :min="1"
                  :max="SEATING_MAX_GAMES_COUNT"
                  :precision="0"
                  value-on-clear="min"
                />
              </el-form-item>
              <div class="field-hint counts-hint" :class="{ 'is-warning': !gamesDivisible }">
                Всего игр на всех столах, делится на количество столов
              </div>
            </div>

            <el-form-item class="players-item">
              <template #label>
                <span class="players-label">
                  <span>Ники (необязательно)</span>
                  <span class="players-counter" :class="playersCounterClass">
                    {{ players.length }} из {{ requiredPlayersCount }}
                  </span>
                </span>
              </template>
              <el-input
                v-model="form.players"
                type="textarea"
                class="players-input"
                :autosize="{ minRows: 4, maxRows: 12 }"
                :placeholder="PLAYERS_PLACEHOLDER"
              />
              <div class="field-hint">
                По одному на строку, по {{ DEFAULT_PLAYERS_COUNT }} на каждый стол.
                Пусто — игроки будут «Игрок 1» … «Игрок {{ requiredPlayersCount }}»
              </div>
            </el-form-item>

            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  Сид (необязательно)
                  <el-tooltip placement="top" :content="SEATING_SEED_HINT">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input
                v-model="form.seed"
                class="seed-input"
                placeholder="Пусто — сервер придумает сид сам"
                :maxlength="SEATING_SEED_MAX_LENGTH"
                clearable
              />
            </el-form-item>
          </el-form>

          <!-- Рассадки на экране нет: ошибка и кнопка - у формы -->
          <template v-if="!seating">
            <el-alert
              v-if="errorMessage"
              :title="errorMessage"
              type="error"
              :closable="false"
              class="seating-alert"
            />
            <el-button
              type="primary"
              class="generate-button"
              :loading="generating"
              :disabled="loadingSeating"
              @click="generateSeating"
            >
              Сгенерировать
            </el-button>
          </template>
        </el-card>

        <el-card v-if="seating" ref="resultCard" class="seating-card result-card" shadow="never">
          <el-alert
            v-if="errorMessage"
            :title="errorMessage"
            type="error"
            :closable="false"
            class="seating-alert"
          />

          <div class="result-actions">
            <el-button type="primary" :icon="CopyDocument" @click="copySeatingText">
              Скопировать рассадку
            </el-button>
            <el-button :icon="Link" @click="copySeatingLink">
              Скопировать ссылку
            </el-button>
            <el-button :icon="Refresh" :loading="generating" @click="regenerateSeating">
              Перегенерировать
            </el-button>
          </div>
          <p class="result-note">Рассадка сохраняется, по ссылке её откроет любой</p>

          <SeatingPreview
            :games="seating.games"
            :seed="seating.seed"
            :title="seating.title || 'Рассадка'"
          />
        </el-card>

        <el-card
          v-else-if="loadingSeating || generating"
          class="seating-card result-card"
          shadow="never"
        >
          <el-skeleton :rows="8" animated />
        </el-card>

        <!-- Компьютер: правая колонка не пустует, пока рассадки нет -->
        <el-card v-else-if="isDesktop" class="seating-card result-card" shadow="never">
          <el-empty
            class="result-empty"
            description="Задайте столы и игры и нажмите «Сгенерировать»"
          />
        </el-card>
      </div>

      <!-- Для пришедших из поиска. Тот же текст сборка кладет в seating.html -->
      <section class="seating-about">
        <h2 class="about-title">{{ SEATING_GUIDE.title }}</h2>
        <ul class="about-list">
          <li v-for="point in SEATING_GUIDE.points" :key="point">{{ point }}</li>
        </ul>

        <h2 class="about-title">{{ SEATING_FAQ.title }}</h2>
        <div v-for="item in SEATING_FAQ.items" :key="item.question" class="faq-item">
          <h3 class="faq-question">{{ item.question }}</h3>
          <p>{{ item.answer }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { QuestionFilled, CopyDocument, Link, Refresh } from '@element-plus/icons-vue'
import { apiService } from '@/services/api'
import SeatingPreview from '@/components/common/SeatingPreview.vue'
import { useBreakpoints } from '@/composables/useBreakpoints'
import { useClipboard } from '@/composables/useClipboard'
import {
  DEFAULT_PLAYERS_COUNT,
  SEATING_MAX_TABLES_COUNT,
  SEATING_MAX_GAMES_COUNT,
  SEATING_SEED_MAX_LENGTH,
  SEATING_TITLE_MAX_LENGTH,
  SEATING_SEED_HINT
} from '@/utils/constants.js'
import { getPublicSeatingErrorMessage } from '@/utils/errorMessages.js'
import { getSeatingClientId, pickUtmTags } from '@/utils/seatingVisitor.js'
import {
  SEATING_PAGE_HEADING,
  SEATING_PAGE_SUBTITLE,
  SEATING_GUIDE,
  SEATING_FAQ
} from '@/utils/seatingPage.js'

const PLAYERS_PLACEHOLDER = 'По одному нику на строку, например:\nАлиса\nБорис\nВера'

const route = useRoute()
const router = useRouter()
const { isCompact, isDesktop } = useBreakpoints()
const { copyToClipboard } = useClipboard()

const emptyForm = () => ({
  title: '',
  tablesCount: 1,
  gamesCount: 1,
  players: '',
  seed: ''
})

const form = reactive(emptyForm())
const seating = ref(null)
const generating = ref(false)
const loadingSeating = ref(false)
// Ошибка генерации - у кнопки, которую нажали; ошибка открытия ссылки -
// над страницей, ее должно быть видно сразу
const errorMessage = ref('')
const loadError = ref('')
const resultCard = ref(null)

// Метки utm_* - из адреса, с которым открыли страницу. Запоминаем сразу:
// после генерации адрес сменится на /seating/<id>, и меток в нем не будет
const utm = pickUtmTags(route.query)

// Ники - по одному на строку. Пустые строки не в счет: их оставляют между
// столами и в конце вставленного списка. Номер строки поля помним, чтобы
// ошибку сервера про ник показать строкой, а не позицией в списке
const parsedPlayers = computed(() => form.players.split('\n')
  .map((line, index) => ({ nickname: line.trim(), line: index + 1 }))
  .filter(player => player.nickname))

const players = computed(() => parsedPlayers.value.map(player => player.nickname))

const requiredPlayersCount = computed(() => DEFAULT_PLAYERS_COUNT * (form.tablesCount || 1))

const playersCounterClass = computed(() => {
  if (!players.value.length) return ''
  return players.value.length === requiredPlayersCount.value ? 'is-complete' : 'is-mismatch'
})

const gamesDivisible = computed(() => !form.tablesCount || form.gamesCount % form.tablesCount === 0)

// Правка формы прячет показанную рассадку: та отвечала прежним параметрам.
// Сама страница меняет форму через fillForm - заполняет ее по ссылке,
// отпускает сид перед перегенерацией, - и такие правки рассадку не прячут.
// Наблюдатель синхронный, чтобы сработать, пока флаг поднят
let fillingForm = false

watch(
  () => [form.title, form.tablesCount, form.gamesCount, form.players, form.seed],
  () => {
    if (!fillingForm) seating.value = null
  },
  { flush: 'sync' }
)

const fillForm = (values) => {
  fillingForm = true
  try {
    Object.assign(form, values)
  } finally {
    fillingForm = false
  }
}

// Сохраненная рассадка возвращает форму целиком: ники - те, что ввели (после
// чистки на сервере), а «Игрок N» по умолчанию в поле не попадают
const formFromSeating = (saved) => ({
  title: saved.title || '',
  tablesCount: saved.tables_count,
  gamesCount: saved.games_count,
  players: (saved.players || []).join('\n'),
  seed: saved.seed || ''
})

// Источник посетителя - для статистики сервера. Пустое не отправляем
const visitorFields = () => {
  const fields = {}
  if (document.referrer) fields.referrer = document.referrer
  if (utm) fields.utm = utm
  const clientId = getSeatingClientId()
  if (clientId) fields.client_id = clientId
  return fields
}

const seatingPayload = () => {
  const payload = {
    tables_count: form.tablesCount,
    games_count: form.gamesCount,
    ...visitorFields()
  }
  const title = form.title.trim()
  if (title) payload.title = title
  if (players.value.length) payload.players = players.value
  const seed = form.seed.trim()
  if (seed) payload.seed = seed
  return payload
}

// Ответ, пришедший после ухода со страницы или после перехода на другую
// рассадку, уже никому не нужен: он затер бы то, что открыли следом
let requestToken = 0
let unmounted = false

onBeforeUnmount(() => {
  unmounted = true
})

const isStale = (token) => unmounted || token !== requestToken

// На телефоне и планшете рассадка под формой - показываем ее сразу, чтобы
// не искать прокруткой. На компьютере она и так рядом, в правой колонке.
// Кадр ждем ради поля ников: оно растет под вставленный список уже после
// отрисовки, и рассадка съезжает ниже
const revealResult = async () => {
  if (!isCompact.value) return
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(resolve))
  resultCard.value?.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

const generateSeating = async () => {
  const token = ++requestToken
  const playerLines = parsedPlayers.value.map(player => player.line)
  generating.value = true
  errorMessage.value = ''
  loadError.value = ''
  try {
    const created = await apiService.createPublicSeating(seatingPayload())
    if (isStale(token)) return
    seating.value = created
    // Новая рассадка - новый адрес, старая ссылка показывает прежнюю.
    // replace, а не push: «Назад» уводит со страницы, а не по рассадкам
    router.replace({ name: 'Seating', params: { id: created.id } })
    revealResult()
  } catch (error) {
    if (isStale(token)) return
    console.error('Ошибка при генерации рассадки:', error)
    errorMessage.value = getPublicSeatingErrorMessage(error, { playerLines })
  } finally {
    if (!isStale(token)) generating.value = false
  }
}

// Другая рассадка - это другой сид, поэтому заданный сид отпускаем
const regenerateSeating = () => {
  fillForm({ seed: '' })
  return generateSeating()
}

// Новая навигация по странице: все, что было на экране, - от прежнего адреса
const resetPage = () => {
  ++requestToken
  generating.value = false
  loadingSeating.value = false
  errorMessage.value = ''
  loadError.value = ''
  seating.value = null
  fillForm(emptyForm())
}

const loadSeating = async (seatingId) => {
  resetPage()
  const token = requestToken
  loadingSeating.value = true
  try {
    const saved = await apiService.getPublicSeating(seatingId)
    if (isStale(token)) return
    fillForm(formFromSeating(saved))
    seating.value = saved
    revealResult()
  } catch (error) {
    if (isStale(token)) return
    console.error('Ошибка при загрузке рассадки:', error)
    loadError.value = getPublicSeatingErrorMessage(error)
  } finally {
    if (!isStale(token)) loadingSeating.value = false
  }
}

// /seating и /seating/<id> - одна страница, смена адреса ее не пересоздает.
// Свой же router.replace после генерации пропускаем: эта рассадка уже на
// экране. Уход на другую страницу (у нее тоже бывает params.id) - не наше дело
watch(
  () => [route.name, route.params.id],
  ([name, seatingId]) => {
    if (name !== 'Seating') return
    if (seatingId && seatingId === seating.value?.id) return
    if (seatingId) loadSeating(seatingId)
    else resetPage()
  },
  { immediate: true }
)

const copySeatingText = () => copyToClipboard(
  seating.value.text,
  'Рассадка скопирована в буфер обмена'
)

const seatingLink = (seatingId) => new URL(
  router.resolve({ name: 'Seating', params: { id: seatingId } }).href,
  window.location.origin
).href

const copySeatingLink = () => copyToClipboard(
  seatingLink(seating.value.id),
  'Ссылка на рассадку скопирована'
)
</script>

<style scoped>
.seating-view {
  padding: 20px;
}

.seating-container {
  max-width: 1280px;
  margin: 0 auto;
}

.seating-heading {
  margin-bottom: 16px;
}

.seating-title {
  margin: 0 0 4px;
  font-size: 24px;
  color: #303133;
}

.seating-subtitle {
  max-width: 720px;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #606266;
}

.load-alert {
  margin-bottom: 16px;
}

/* Компьютер: форма слева, рассадка справа - видно и то и другое.
   Форма узкая: ширина нужнее таблице «место x игра» */
.seating-layout {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.seating-card {
  border-radius: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.field-hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  margin-top: 4px;
}

.field-hint.is-warning {
  color: #e6a23c;
}

/* Столы и игры - в одну строку, подсказка про делимость - под обоими */
.counts-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 12px;
  margin-bottom: 18px;
}

.counts-row .el-form-item {
  margin-bottom: 0;
}

.counts-row .el-input-number {
  width: 100%;
}

.counts-hint {
  grid-column: 1 / -1;
}

.players-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  width: 100%;
}

.players-counter {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.players-counter.is-complete {
  color: #67c23a;
}

.players-counter.is-mismatch {
  color: #e6a23c;
}

/* Подпись поля ников растягивается на всю ширину: счетчик - у правого края */
.players-item :deep(.el-form-item__label) {
  display: flex;
  width: 100%;
  padding-right: 0;
}

.label-with-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.hint-icon {
  color: #909399;
  cursor: help;
}

.seating-alert {
  margin-bottom: 12px;
}

.generate-button {
  width: 100%;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.result-actions .el-button {
  margin-left: 0;
}

.result-note {
  margin: 8px 0 16px;
  font-size: 12px;
  color: #909399;
}

.result-empty {
  padding: 48px 0;
}

/* Текст под рассадкой - узкой колонкой, как подзаголовок: так легче читать */
.seating-about {
  max-width: 720px;
  margin-top: 32px;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
}

.about-title {
  margin: 32px 0 8px;
  font-size: 18px;
  color: #303133;
}

.about-title:first-child {
  margin-top: 0;
}

.about-list {
  padding-left: 20px;
}

.faq-question {
  margin: 16px 0 4px;
  font-size: 15px;
  color: #303133;
}

/* Планшет и телефон: одна колонка, рассадка под формой */
@media (max-width: 1023px) {
  .seating-view {
    padding: 12px;
  }

  .seating-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  /* Шапка приложения прилипает к верху: прокрутка к рассадке не прячет
     ее начало под шапку */
  .result-card {
    scroll-margin-top: 68px;
  }
}

/* Телефон: кнопки во всю ширину, пальцем в них легко попасть */
@media (max-width: 767px) {
  .seating-view {
    padding: 8px;
  }

  .seating-title {
    font-size: 20px;
  }

  .seating-subtitle {
    font-size: 13px;
  }

  .result-actions .el-button {
    flex: 1 1 100%;
    min-height: 44px;
  }

  .generate-button {
    min-height: 44px;
  }
}
</style>
