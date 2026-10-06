// Страница рассадки /seating - единственная, на которую приводит поиск.
// Тексты здесь общие: их показывает SeatingView, а сборка (vite.config.mjs)
// кладет те же тексты в seating.html - его nginx отдает на /seating. Пустой
// index.html до запуска JS ничего не говорит ни Яндексу, ни превью ссылки
// в мессенджере: те JS не выполняют.
// Модуль читает и конфиг сборки, поэтому импорты - только относительные, без @

import { DEFAULT_PLAYERS_COUNT, SEATING_SEED_HINT } from './constants.js'

export const SEATING_PAGE_URL = 'https://app.jokermafia.am/seating'

export const SEATING_PAGE_TITLE = 'Рассадка для мафии онлайн — генератор рассадки на турнир'

export const SEATING_PAGE_DESCRIPTION = 'Бесплатный генератор рассадки для спортивной мафии '
  + 'без регистрации: места и столы распределяются поровну, рассадку можно отправить '
  + 'текстом или ссылкой.'

export const SEATING_PAGE_HEADING = 'Рассадка для мафии'

export const SEATING_PAGE_SUBTITLE = 'Бесплатный генератор рассадки игроков по столам на вечер '
  + 'или турнир по спортивной мафии, без регистрации. Задайте число столов и игр, по желанию — '
  + 'название и ники, а готовую рассадку отправьте текстом в мессенджер или ссылкой.'

// Обещаем только то, что алгоритм сервера держит при любых столах и играх
// (бекенд, docs/design/issue_182_seating.md)
export const SEATING_GUIDE = {
  title: 'Как устроена рассадка',
  points: [
    `Каждый тур все игроки садятся за столы по ${DEFAULT_PLAYERS_COUNT} человек: играют все, `
      + 'и игр у всех поровну.',
    `Пока у игрока не больше ${DEFAULT_PLAYERS_COUNT} игр, он ни разу не сядет на одно и то же `
      + 'место. Если игр больше, каждое место выпадает ему поровну — с разницей не больше '
      + 'одного раза.',
    'Если столов несколько, игрок играет за каждым столом поровну — с разницей не больше '
      + 'одной игры.'
  ]
}

export const SEATING_FAQ = {
  title: 'Частые вопросы',
  items: [
    {
      question: 'Сколько нужно игроков?',
      answer: `По ${DEFAULT_PLAYERS_COUNT} на каждый стол: на один стол — 10 игроков, на два — 20. `
        + 'Ники вводятся по одному на строку и не должны повторяться. Можно и без них — тогда '
        + 'в рассадке будут «Игрок 1», «Игрок 2» и так далее.'
    },
    {
      question: 'Сколько игр указать?',
      answer: 'Всего игр на всех столах вместе, и это число должно делиться на количество '
        + 'столов. Например, 2 стола и 10 игр — это 5 туров: каждый игрок сыграет 5 игр.'
    },
    {
      question: 'Как отправить рассадку игрокам?',
      answer: '«Скопировать рассадку» — готовый текст для мессенджера, «Скопировать ссылку» — '
        + 'адрес, по которому рассадку откроет любой, без входа и регистрации.'
    },
    {
      question: 'Зачем нужен сид?',
      answer: SEATING_SEED_HINT
    },
    {
      question: 'Почему не перемешать список самому?',
      answer: 'Если каждый тур перемешивать игроков заново, кто-нибудь почти наверняка сядет '
        + 'на одно место дважды, а кто-то может просидеть все игры за одним столом. '
        + 'Генератор такого не допускает.'
    }
  ]
}

const escapeHtml = (text) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

// Пока грузится JS, текст страницы стоит там же, где его потом нарисует
// SeatingView: отступ сверху - шапка приложения и поля страницы.
// #app на компьютере высотой в экран (App.vue), и хвост текста уходил бы
// на белый фон - пока текст на месте, #app растет вместе с ним
const STATIC_STYLE = [
  '#app:has(>.seating-static){height:auto;min-height:100vh}',
  '.seating-static{max-width:1320px;margin:0 auto;padding:80px 20px 40px;'
    + 'font-size:14px;line-height:1.6;color:#606266}',
  '.seating-static>*{max-width:720px}',
  '.seating-static h1{margin:0 0 4px;font-size:24px;line-height:1.3;color:#303133}',
  '.seating-static h2{margin:32px 0 8px;font-size:18px;color:#303133}',
  '.seating-static h3{margin:16px 0 4px;font-size:15px;color:#303133}',
  '.seating-static ul{padding-left:20px}',
  '@media (max-width:1023px){.seating-static{padding:68px 12px 32px}}',
  '@media (max-width:767px){.seating-static{padding:64px 8px 24px}'
    + '.seating-static h1{font-size:20px}}'
].join('')

const headTags = () => [
  `<link rel="canonical" href="${SEATING_PAGE_URL}">`,
  '<meta property="og:type" content="website">',
  '<meta property="og:site_name" content="Мафия Helper">',
  '<meta property="og:locale" content="ru_RU">',
  `<meta property="og:url" content="${SEATING_PAGE_URL}">`,
  `<meta property="og:title" content="${escapeHtml(SEATING_PAGE_TITLE)}">`,
  `<meta property="og:description" content="${escapeHtml(SEATING_PAGE_DESCRIPTION)}">`,
  `<style>${STATIC_STYLE}</style>`
]

const staticBody = () => [
  '<div class="seating-static">',
  `<h1>${escapeHtml(SEATING_PAGE_HEADING)}</h1>`,
  `<p>${escapeHtml(SEATING_PAGE_SUBTITLE)}</p>`,
  `<h2>${escapeHtml(SEATING_GUIDE.title)}</h2>`,
  '<ul>',
  ...SEATING_GUIDE.points.map(point => `<li>${escapeHtml(point)}</li>`),
  '</ul>',
  `<h2>${escapeHtml(SEATING_FAQ.title)}</h2>`,
  ...SEATING_FAQ.items.flatMap(item => [
    `<h3>${escapeHtml(item.question)}</h3>`,
    `<p>${escapeHtml(item.answer)}</p>`
  ]),
  '</div>'
]

// Меняем в index.html ровно то, что ожидаем там найти. Не нашли - сборка
// падает: иначе seating.html молча уехал бы без заголовка или текста
const replaceOrThrow = (html, pattern, replacement) => {
  if (!pattern.test(html)) {
    throw new Error(`seating.html: в index.html не найдено ${pattern}`)
  }
  return html.replace(pattern, () => replacement)
}

// seating.html из index.html сборки: те же скрипты и стили, но свои заголовок,
// описание, канонический адрес и превью, а внутри #app - текст страницы.
// Приложение при запуске заменит его собой
export const renderSeatingPageHtml = (indexHtml) => {
  let html = replaceOrThrow(
    indexHtml,
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(SEATING_PAGE_TITLE)}</title>`
  )
  html = replaceOrThrow(
    html,
    /<meta name="description" content="[^"]*">/,
    [
      `<meta name="description" content="${escapeHtml(SEATING_PAGE_DESCRIPTION)}">`,
      ...headTags()
    ].join('\n    ')
  )
  return replaceOrThrow(
    html,
    /<div id="app"><\/div>/,
    `<div id="app">\n${staticBody().join('\n')}\n</div>`
  )
}
