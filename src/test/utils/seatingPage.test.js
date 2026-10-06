// seating.html - HTML страницы /seating для поисковиков и превью ссылок:
// index.html сборки со своими заголовком, описанием и текстом страницы
// внутри #app. Не нашлось в index.html, что менять, - сборка падает

import { describe, it, expect } from 'vitest'
import {
  renderSeatingPageHtml,
  SEATING_PAGE_URL,
  SEATING_PAGE_TITLE,
  SEATING_PAGE_DESCRIPTION,
  SEATING_PAGE_HEADING,
  SEATING_PAGE_SUBTITLE,
  SEATING_GUIDE,
  SEATING_FAQ
} from '@/utils/seatingPage.js'

// index.html в том виде, в каком его выпускает vite build
const INDEX_HTML = `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8">
    <title>Мафия Helper - Помощник для игры в Мафию</title>
    <meta name="description" content="Приложение для ведения игр в Мафию">
    <script type="module" crossorigin src="/assets/index-abc.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-abc.css">
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`

// Разбираем в <template>: его содержимое инертно, и стили по ссылкам из
// index.html тест не пытается скачать
const renderPage = () => {
  const template = document.createElement('template')
  template.innerHTML = renderSeatingPageHtml(INDEX_HTML)
  return template.content
}

const attr = (page, selector, name) => page.querySelector(selector)?.getAttribute(name)

const texts = (root, selector) => [...root.querySelectorAll(selector)]
  .map(element => element.textContent)

describe('renderSeatingPageHtml', () => {
  it('заголовок и описание - страницы рассадки, а не приложения', () => {
    const page = renderPage()

    expect(page.querySelector('title').textContent).toBe(SEATING_PAGE_TITLE)
    expect(attr(page, 'meta[name="description"]', 'content')).toBe(SEATING_PAGE_DESCRIPTION)
  })

  it('канонический адрес и превью ссылки для мессенджеров', () => {
    const page = renderPage()

    expect(attr(page, 'link[rel="canonical"]', 'href')).toBe(SEATING_PAGE_URL)
    expect(attr(page, 'meta[property="og:url"]', 'content')).toBe(SEATING_PAGE_URL)
    expect(attr(page, 'meta[property="og:title"]', 'content')).toBe(SEATING_PAGE_TITLE)
    expect(attr(page, 'meta[property="og:description"]', 'content'))
      .toBe(SEATING_PAGE_DESCRIPTION)
  })

  it('текст страницы - внутри #app: его видно без JS', () => {
    const app = renderPage().querySelector('#app')

    expect(app.querySelector('h1').textContent).toBe(SEATING_PAGE_HEADING)
    expect(app.querySelector('h1 + p').textContent).toBe(SEATING_PAGE_SUBTITLE)
    expect(texts(app, 'li')).toEqual(SEATING_GUIDE.points)
    expect(texts(app, 'h3')).toEqual(SEATING_FAQ.items.map(item => item.question))
    expect(texts(app, 'h3 + p')).toEqual(SEATING_FAQ.items.map(item => item.answer))
  })

  it('скрипты и стили сборки на месте: приложение запустится как с index.html', () => {
    const page = renderPage()

    expect(attr(page, 'script[type="module"]', 'src')).toBe('/assets/index-abc.js')
    expect(attr(page, 'link[rel="stylesheet"]', 'href')).toBe('/assets/index-abc.css')
  })

  it.each([
    ['без <title>', INDEX_HTML.replace(/<title>.*<\/title>/, '')],
    ['без описания', INDEX_HTML.replace(/<meta name="description"[^>]*>/, '')],
    ['без пустого #app', INDEX_HTML.replace('<div id="app"></div>', '<div id="root"></div>')]
  ])('index.html %s - ошибка сборки, а не страница без текста', (_, indexHtml) => {
    expect(() => renderSeatingPageHtml(indexHtml)).toThrow('seating.html')
  })
})
