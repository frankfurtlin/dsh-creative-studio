/**
 * dsh-creative-studio 浏览器验收脚本（v0.6 新外壳）。
 *
 * 覆盖设计走查后的全部优化点：
 *   · P0  统一左栏导航（内容 / 设计 / 素材 / Logo + 子视图），页面标题体系统一，
 *         内容工作台助手默认收起、可展开并记忆；
 *   · P1  设计空态 CTA 与统计卡跳转、素材 3 列密度 / 中文名 / 复制 / 中文搜索、
 *         复盘与排期层次、Logo 预览抽屉、移动端 44px 触控；
 *   · P2  说明文字改 title / 副标题、iframe 骨架屏与嵌入模式、Logo 保存说明、
 *         跨 tab「用于内容」带入、全局「＋新建」、键盘导航与 aria。
 *
 * 用法：node verification/verify-ui.mjs
 * 浏览器：优先用插件自己的 playwright；没有则用 PLAYWRIGHT_MODULE_DIR 或
 * 运行时家目录下 hermes-site 的安装（不写死某台机器的绝对路径）。
 */
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SHOTS = join(HERE, 'shots')
mkdirSync(SHOTS, { recursive: true })

const ORIGIN = process.env.DSH_ORIGIN || 'http://127.0.0.1:3080'

async function loadChromium() {
  try {
    const mod = await import('playwright')
    return mod.chromium
  } catch {
    const dir = process.env.PLAYWRIGHT_MODULE_DIR || join(homedir(), 'workspace/hermes-site/tools/node_modules')
    const require = createRequire(join(dir, 'noop.js'))
    return require('playwright').chromium
  }
}

function readToken() {
  if (process.env.TOKEN) return process.env.TOKEN
  const line = execSync(
    "journalctl -u deepseek-harness --no-pager | grep -o 'http://[^ ]*token=[A-Za-z0-9_-]*' | tail -1",
    { encoding: 'utf8' },
  ).trim()
  const match = line.match(/token=([A-Za-z0-9_-]+)/)
  if (!match) throw new Error('拿不到 DSH web 登录 token（可用 TOKEN=... 覆盖）')
  return match[1]
}

const passes = []
const failures = []
function check(ok, label, detail) {
  if (ok) passes.push(label)
  else failures.push(detail ? `${label} —— ${detail}` : label)
}

const chromium = await loadChromium()
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' })
const page = await context.newPage()
const consoleProblems = []
page.on('console', (msg) => {
  const text = msg.text()
  if (msg.type() === 'error') consoleProblems.push(`[${msg.type()}] ${text.slice(0, 300)}`)
})
page.on('pageerror', (error) => consoleProblems.push('[pageerror] ' + String(error).slice(0, 300)))

const shot = async (name) => {
  await page.screenshot({ path: join(SHOTS, name) })
}

function frameWith(pathPart) {
  return page.frames().find((frame) => frame.url().includes(pathPart))
}

async function waitFrame(pathPart, timeout = 15000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const frame = frameWith(pathPart)
    if (frame) return frame
    await page.waitForTimeout(250)
  }
  return null
}

async function openStudio() {
  await page.getByRole('button', { name: '创作台' }).first().click()
  await page.waitForSelector('.dsh-cs-root', { timeout: 20000 })
  await page.waitForTimeout(600)
}

async function clickView(label) {
  await page.locator('.dsh-cs-views .dsh-cs-view', { hasText: new RegExp(`^${label}$`) }).first().click()
  await page.waitForTimeout(700)
}

async function clickWorkspace(label) {
  await page.locator('.dsh-cs-wsbtn', { hasText: new RegExp(`^${label}$`) }).first().click()
  await page.waitForTimeout(600)
}

try {
  await page.goto(`${ORIGIN}/?token=${readToken()}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('nav button', { timeout: 30000 })
  await page.waitForTimeout(3500)

  // 清掉可能残留的导航/助手记忆，保证默认值可验证
  await page.evaluate(() => {
    try {
      localStorage.removeItem('dsh-creative-studio:nav')
      localStorage.removeItem('dsh-creative-studio:assistant')
      localStorage.removeItem('dsh-creative-studio:preview')
    } catch (error) {
      void error
    }
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3500)

  /* ---------------------------------------------------------------- 侧栏 */
  await openStudio()
  const sidebarRows = await page.locator('nav button').evaluateAll((els) =>
    els.filter((el) => el.offsetParent !== null).map((el) => (el.getAttribute('aria-label') || el.innerText || '').trim()).filter(Boolean),
  )
  check(sidebarRows.includes('创作台'), '侧栏出现「创作台」', '可见行：' + sidebarRows.join(' / '))
  check(!sidebarRows.includes('内容创作') && !sidebarRows.includes('歸藏设计'), '侧栏没有两个旧入口', sidebarRows.join(' / '))

  // 插件页：原两个包已卸载，只剩创作台
  await page.getByRole('button', { name: '插件' }).first().click()
  // 插件页先出骨架屏（aria-busy）再出列表，等第一行开关出现再读文本
  await page.getByRole('switch').first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(800)
  const pluginText = await page.locator('body').innerText()
  check(/dsh-creative-studio/.test(pluginText), '插件页仍有 dsh-creative-studio')
  check(!/dsh-media-desk|dsh-guizang-design/.test(pluginText), '插件页没有 dsh-media-desk / dsh-guizang-design')
  await openStudio()

  /* ------------------------------------------------------- 外壳默认状态 */
  const shells = await page.locator('.dsh-cs-wsbtn').allInnerTexts()
  check(
    shells.map((item) => item.trim()).join('|') === '内容|设计|素材|Logo',
    '左栏四个工作台：内容 / 设计 / 素材 / Logo',
    JSON.stringify(shells),
  )
  const headTitle = (await page.locator('.dsh-cs-head h1').first().innerText()).trim()
  const headDesc = (await page.locator('.dsh-cs-head p').first().innerText()).trim()
  check(headTitle === '灵感', '默认标题为「灵感」', headTitle)
  check(headDesc.length > 6, '标题区有副标题说明', headDesc)
  check(await page.getByRole('button', { name: '内容工作台设置' }).isVisible(), '内容工作台头部有设置按钮')
  const mediaNavDisplay = await page.locator('.md-root .md-nav').first().evaluate((el) => getComputedStyle(el).display)
  check(mediaNavDisplay === 'none', 'media-desk 自带导航已隐藏（由外壳接管）', mediaNavDisplay)
  check(await page.locator('.dsh-cs-fab').isVisible(), '助手默认收起，右下有「助手」按钮')
  check((await page.locator('.md-dock').count()) === 0, '助手默认收起时抽屉没有挂载')
  await shot('01-sidebar.png')

  // 齿轮 → media desk 设置弹窗
  await page.locator('.md-root .md-topbar button[aria-label="设置"]').first().waitFor({ state: 'attached', timeout: 20000 })
  await page.getByRole('button', { name: '内容工作台设置' }).click()
  await page.locator('.md-root .md-dialog').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
  check(
    (await page.locator('.md-root .md-dialog').count()) > 0 &&
      /设置语言/.test((await page.locator('.md-root .md-dialog').first().innerText()).replace(/\s+/g, '')),
    '点头部设置按钮打开内容工作台设置',
  )
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // 新建菜单
  await page.locator('.dsh-cs-head button[aria-haspopup="menu"]').click()
  await page.waitForTimeout(300)
  check((await page.locator('[role="menuitem"]').count()) === 5, '「＋新建」菜单有 5 个入口')
  check((await page.locator('.dsh-cs-head button[aria-haspopup="menu"]').getAttribute('aria-expanded')) === 'true', '新建按钮 aria-expanded=true')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)

  /* -------------------------------------------------------- 排期 / 复盘 */
  await clickView('排期')
  await page.waitForTimeout(900)
  const month = (await page.locator('.md-cal-month').first().innerText()).replace(/\s+/g, '')
  check(/2026/.test(month) && /11月/.test(month), '排期月卡显示「2026 / 11 月」中文月份', month)
  const calCells = await page.locator('.md-cal-cell').count()
  check(calCells === 35, '排期日历为 35 格（5 周）', String(calCells))
  await shot('02-schedule.png')

  await clickView('复盘')
  await page.waitForTimeout(900)
  check((await page.locator('.md-metric').count()) === 3, '复盘页有 3 个核心指标', String(await page.locator('.md-metric').count()))
  check(/示例数据/.test(await page.locator('.md-root').innerText()), '复盘页标注「示例数据」')
  await shot('03-review.png')

  /* ------------------------------------------------------------- 设计 */
  await clickWorkspace('设计')
  await page.waitForTimeout(1200)
  const design = await waitFrame('/guizang-design/')
  check(Boolean(design), '设计工作台 iframe 加载')
  const designState = await design.evaluate(() => ({
    embed: document.documentElement.getAttribute('data-cs-embed'),
    view: document.documentElement.getAttribute('data-cs-view'),
    rail: document.querySelector('.rail') ? getComputedStyle(document.querySelector('.rail')).display : null,
    title: document.title,
    injected: Boolean(document.getElementById('dsh-cs-theme')),
    bg: getComputedStyle(document.body).backgroundColor,
    font: getComputedStyle(document.body).fontFamily,
  }))
  check(designState.embed === '1', '设计页进入嵌入模式（data-cs-embed=1）', JSON.stringify(designState))
  check(designState.rail === 'none', '设计页自带 rail 已隐藏')
  check(designState.injected && designState.bg === 'rgb(245, 245, 243)' && /Inter/.test(designState.font), '设计页沿用浅色规范', JSON.stringify(designState))
  const stats = await design.evaluate(() =>
    Array.from(document.querySelectorAll('.stats .stat')).map((el) => ({ href: el.getAttribute('href'), tag: el.tagName })),
  )
  check(stats.length === 4 && stats.every((item) => item.tag === 'A' && item.href), '统计卡可点击（作品/专栏/工作流/语气档案）', JSON.stringify(stats))
  await shot('04-design-home.png')

  await clickView('我的作品')
  await page.waitForTimeout(1100)
  const worksState = await design.evaluate(() => {
    const empty = document.querySelector('.empty')
    const cta = document.querySelector('[data-empty-start]')
    const head = document.querySelector('.head')
    return {
      view: document.documentElement.getAttribute('data-cs-view'),
      display: empty ? getComputedStyle(empty).display : null,
      align: empty ? getComputedStyle(empty).alignItems : null,
      cta: cta ? cta.textContent.trim() : null,
      head: head ? getComputedStyle(head).display : null,
    }
  })
  check(worksState.view === 'works', '子视图切到我的作品（data-cs-view=works）', JSON.stringify(worksState))
  check(worksState.display === 'flex' && worksState.align === 'center', '作品空态居中', JSON.stringify(worksState))
  check(/做第一份作品/.test(worksState.cta || ''), '空态有 CTA「做第一份作品」', worksState.cta)
  check(worksState.head === 'none', '我的作品页隐藏重复的 iframe 标题', worksState.head)
  await shot('05-design-works.png')

  /* ---------------------------------------------------- 跨 tab 带入内容 */
  await page.evaluate(() => {
    window.postMessage({ type: 'dsh-cs:use-work', title: '自动化验收作品', skill: 'guizang-ppt-skill' }, window.location.origin)
  })
  await page.waitForTimeout(1200)
  const handoffVisible = await page.locator('.dsh-cs-handoff').isVisible()
  check(handoffVisible, '设计「用于内容」后出现带入条')
  await shot('06-handoff.png')
  if (handoffVisible) {
    await page.getByRole('button', { name: '用它写一条内容' }).click()
    await page.waitForTimeout(900)
    const deadline = Date.now() + 8000
    let value = ''
    while (Date.now() < deadline && !value) {
      const box = page.locator('.md-dock textarea')
      if (await box.count()) value = await box.first().inputValue()
      if (!value) await page.waitForTimeout(250)
    }
    check(/自动化验收作品/.test(value), '带入后助手打开并写入草稿', value.slice(0, 60))
    check((await page.locator('.md-root.has-dock').count()) > 0, '带入后助手抽屉已展开')
    await shot('07-handoff-composer.png')
  }

  /* ------------------------------------------------------------- 素材 */
  await clickWorkspace('素材')
  await page.waitForTimeout(800)
  const elements = await waitFrame('/studio-elements/')
  check(Boolean(elements), '素材工作台 iframe 加载')
  await page.waitForTimeout(1200)
  const elementsState = await elements.evaluate(() => {
    const sidebar = document.querySelector('.sidebar')
    const grid = document.querySelector('.grid')
    const first = document.querySelector('.cell')
    return {
      sidebar: sidebar ? getComputedStyle(sidebar).display : null,
      cells: document.querySelectorAll('.cell').length,
      copies: document.querySelectorAll('.copy-name').length,
      firstZh: first?.querySelector('.nm-zh')?.textContent?.trim(),
      firstEn: first?.querySelector('.nm-en')?.textContent?.trim(),
      cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
    }
  })
  check(elementsState.sidebar === 'none', '素材页自带左侧索引已隐藏', JSON.stringify(elementsState))
  check(elementsState.cells === 103, '素材库列出 103 个组件', String(elementsState.cells))
  check(elementsState.copies === 103, '每个组件都有复制按钮', String(elementsState.copies))
  check(elementsState.firstZh === '琥珀半调' && elementsState.firstEn === 'AmberHalftone', '卡片显示中文名 + 英文 API 名', JSON.stringify(elementsState))
  check(elementsState.cols >= 3, '素材卡片至少 3 列（923px 内容宽）', String(elementsState.cols))
  const search = page.getByRole('searchbox', { name: '搜索素材组件' })
  await search.fill('按钮')
  await page.waitForTimeout(900)
  check((await elements.locator('.cell').count()) === 14, '中文搜索「按钮」返回 14 个组件', String(await elements.locator('.cell').count()))
  await shot('08-elements-search.png')
  await search.fill('')
  await page.waitForTimeout(600)
  await shot('09-elements.png')

  /* ------------------------------------------------------------- Logo */
  await clickWorkspace('Logo')
  await page.waitForTimeout(800)
  const logo = await waitFrame('/pixel-logo/')
  check(Boolean(logo), 'Logo 编辑器 iframe 加载')
  await page.waitForTimeout(1000)
  const logoState = await logo.evaluate(() => {
    const brand = document.querySelector('.brand-block')
    const topbar = document.querySelector('.topbar')
    const canvas = document.querySelector('#editorCanvas')
    const right = document.querySelector('.right-sidebar')
    return {
      brand: brand ? getComputedStyle(brand).display : null,
      topbarH: topbar ? Math.round(topbar.getBoundingClientRect().height) : 0,
      saveTitle: document.querySelector('#saveVersionBtn')?.getAttribute('title') || '',
      syncTitle: document.querySelector('#saveState')?.getAttribute('title') || '',
      canvasW: canvas ? Math.round(canvas.getBoundingClientRect().width) : 0,
      right: right ? getComputedStyle(right).display : null,
      preview: document.documentElement.getAttribute('data-cs-preview'),
      injected: Boolean(document.getElementById('dsh-cs-theme')),
      bg: getComputedStyle(document.body).backgroundColor,
    }
  })
  check(logoState.brand === 'none', 'Logo 页隐藏与外壳重复的品牌块', JSON.stringify(logoState))
  check(logoState.topbarH <= 64, 'Logo 顶栏保持单行工具栏', String(logoState.topbarH))
  check(logoState.injected && logoState.bg === 'rgb(245, 245, 243)', 'Logo 页沿用浅色规范', JSON.stringify(logoState))
  check(/回滚/.test(logoState.saveTitle) && /自动保存/.test(logoState.syncTitle), 'Logo 保存概念有 title 说明', JSON.stringify(logoState))
  check(logoState.right === 'none' && logoState.preview === 'off', 'Logo 预览列默认收起', JSON.stringify(logoState))
  check(logoState.canvasW > 600, '收起预览后画布获得更大宽度', String(logoState.canvasW))
  await shot('10-logo.png')
  await page.getByRole('button', { name: '预览' }).click()
  await page.waitForTimeout(700)
  const previewOpen = await logo.evaluate(() => {
    const right = document.querySelector('.right-sidebar')
    const box = right?.getBoundingClientRect()
    return { display: right ? getComputedStyle(right).display : null, width: box ? Math.round(box.width) : 0, left: box ? Math.round(box.left) : 0 }
  })
  check(previewOpen.display === 'flex' && previewOpen.width === 320, '点「预览」展开 320px 预览抽屉', JSON.stringify(previewOpen))
  await shot('11-logo-preview.png')
  await page.getByRole('button', { name: '预览' }).click()
  await page.waitForTimeout(500)

  // 窄窗 / 浏览器缩放下的完整性：vendor 在 ≤1080 / ≤720px 会把左栏工具面板换行到画布
  // 下面（看起来像「Logo 显示不全」），外壳强制两栏并允许工具栏换行，不再裁切。
  const wideViewport = page.viewportSize()
  await page.setViewportSize({ width: 900, height: 700 })
  await page.waitForTimeout(1200)
  const narrow = await logo.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const box = el.getBoundingClientRect()
      return { display: getComputedStyle(el).display, w: Math.round(box.width), h: Math.round(box.height), top: Math.round(box.top) }
    }
    const toolbar = document.querySelector('.workspace-toolbar')
    return {
      shell: pick('.app-shell'),
      left: pick('.left-sidebar'),
      canvas: pick('#editorCanvas'),
      toolbarOverflow: toolbar ? Math.round(toolbar.scrollWidth - toolbar.clientWidth) : null,
    }
  })
  check(narrow.left && narrow.left.display !== 'none' && narrow.left.w >= 150, '窄窗下 Logo 左侧工具面板仍然可见', JSON.stringify(narrow))
  check(narrow.canvas && narrow.canvas.w >= 240, '窄窗下 Logo 画布仍可用', JSON.stringify(narrow))
  check(narrow.toolbarOverflow <= 2, '窄窗下 Logo 工具栏没有被裁切', String(narrow.toolbarOverflow))
  await shot('11b-logo-narrow.png')
  await page.setViewportSize(wideViewport)
  await page.waitForTimeout(800)

  /* --------------------------------------------------------- API / 主题 */
  const api = await page.evaluate(async () => {
    const get = async (url) => {
      const res = await fetch(url)
      return { status: res.status, text: await res.text() }
    }
    const media = await get('/media-desk/state')
    const catalog = await get('/guizang-design/api/catalog?lang=zh')
    const elements = await get('/studio-elements/')
    const logo = await get('/pixel-logo/data/full-project.json')
    let version = ''
    try {
      version = JSON.parse(catalog.text).version || ''
    } catch (error) {
      void error
    }
    return {
      media: media.status,
      catalog: catalog.status,
      version,
      elements: elements.status,
      elementsHasRoot: /id="root"/.test(elements.text),
      logo: logo.status,
    }
  })
  check(api.media === 200, 'GET /media-desk/state 可用', String(api.media))
  check(api.catalog === 200 && api.version === '0.1.4', 'GET /guizang-design/api/catalog 版本 0.1.4', JSON.stringify(api))
  check(api.elements === 200 && api.elementsHasRoot, 'GET /studio-elements/ 返回组件库页面', JSON.stringify(api))
  check(api.logo === 200, 'GET /pixel-logo/data/full-project.json 可用', String(api.logo))

  const theme = await page.locator('.dsh-cs-root').evaluate((el) => {
    const style = getComputedStyle(el)
    return { bg: style.backgroundColor, font: style.fontFamily }
  })
  check(theme.bg === 'rgb(245, 245, 243)', '创作台外壳底色 #f5f5f3', JSON.stringify(theme))
  check(/Inter/.test(theme.font), '外壳使用 Inter 字体栈', theme.font)

  // Logo 自动保存 + 版本快照往返（保留迁移前的接口回归）
  const logoApi = await page.evaluate(async () => {
    const project = await fetch('/pixel-logo/api/project').then((r) => r.json())
    const saved = await fetch('/pixel-logo/api/project', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(project),
    })
    const savedBody = await saved.json().catch(() => ({}))
    const created = await fetch('/pixel-logo/api/versions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project, name: '验收快照' }),
    })
    const snapshot = await created.json().catch(() => ({}))
    const listed = await fetch('/pixel-logo/api/versions').then((r) => r.json())
    const removed = snapshot.id ? await fetch('/pixel-logo/api/versions/' + encodeURIComponent(snapshot.id), { method: 'DELETE' }) : { status: 0 }
    const after = await fetch('/pixel-logo/api/versions').then((r) => r.json())
    return {
      save: saved.status,
      saveOk: savedBody.ok === true,
      create: created.status,
      listed: (listed.versions || []).some((item) => item.id === snapshot.id),
      removed: removed.status,
      gone: !(after.versions || []).some((item) => item.id === snapshot.id),
    }
  })
  check(logoApi.save === 200 && logoApi.saveOk, 'Logo 自动保存 PUT /pixel-logo/api/project 可用', JSON.stringify(logoApi))
  check(logoApi.create === 201 && logoApi.listed && logoApi.removed === 200 && logoApi.gone, 'Logo 版本快照可创建 / 列出 / 删除', JSON.stringify(logoApi))

  /* ------------------------------------------------------------- a11y */
  await clickWorkspace('内容')
  await page.waitForTimeout(500)
  const a11y = await page.evaluate(() => {
    const nav = document.querySelector('.dsh-cs-nav')
    const ws = document.querySelector('.dsh-cs-wsbtn')
    return {
      navRole: nav?.getAttribute('role'),
      expanded: ws?.getAttribute('aria-expanded'),
      current: document.querySelectorAll('.dsh-cs-view[aria-current="page"]').length,
      menu: document.querySelector('.dsh-cs-head [aria-haspopup="menu"]')?.getAttribute('aria-haspopup'),
    }
  })
  check(a11y.navRole === 'navigation', '左栏是 navigation landmark', JSON.stringify(a11y))
  check(a11y.expanded === 'true', '工作台按钮带 aria-expanded', JSON.stringify(a11y))
  check(a11y.current >= 1, '当前子视图带 aria-current=page', JSON.stringify(a11y))
  check(a11y.menu === 'menu', '新建按钮带 aria-haspopup=menu', JSON.stringify(a11y))

  // 键盘：上下键在左栏移动焦点
  await page.locator('.dsh-cs-wsbtn').first().focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(200)
  const focusedText = await page.evaluate(() => document.activeElement?.textContent?.trim() || '')
  check(/设计/.test(focusedText), '左栏支持 ArrowDown 键盘导航', focusedText)

  /* --------------------------------------------------------- 记忆与移动 */
  await clickWorkspace('内容')
  await clickView('灵感')
  await page.waitForTimeout(500)
  const fab = page.locator('.dsh-cs-fab')
  if (await fab.isVisible()) await fab.click()
  await page.waitForTimeout(1200)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  await openStudio()
  const afterReload = await page.evaluate(() => ({
    title: document.querySelector('.dsh-cs-head h1')?.textContent?.trim(),
    dock: Boolean(document.querySelector('.md-root.has-dock')),
    fab: Boolean(document.querySelector('.dsh-cs-fab')),
  }))
  check(afterReload.title === '灵感', '刷新后仍记住内容/灵感', JSON.stringify(afterReload))
  check(afterReload.dock === true && afterReload.fab === false, '刷新后记住助手展开状态', JSON.stringify(afterReload))

  // 再收起助手：标题区按钮 → 抽屉关闭、右下按钮回来
  const headAssistant = page.locator('.dsh-cs-head button').filter({ hasText: '助手' }).first()
  if (await headAssistant.isVisible()) await headAssistant.click()
  await page.waitForTimeout(1200)
  const collapsed = await page.evaluate(() => ({
    dock: Boolean(document.querySelector('.md-root.has-dock')),
    fab: Boolean(document.querySelector('.dsh-cs-fab')),
  }))
  check(collapsed.dock === false && collapsed.fab === true, '助手可以再次收起并回到右下按钮', JSON.stringify(collapsed))

  // 移动端
  await page.setViewportSize({ width: 430, height: 900 })
  await page.waitForTimeout(900)
  const mobile = await page.evaluate(() => {
    const ws = document.querySelector('.dsh-cs-wsbtn')
    const sub = document.querySelector('.dsh-cs-subnav')
    const view = sub?.querySelector('.dsh-cs-view')
    return {
      wsH: ws ? Math.round(ws.getBoundingClientRect().height) : 0,
      subnav: sub ? getComputedStyle(sub).display : null,
      viewH: view ? Math.round(view.getBoundingClientRect().height) : 0,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    }
  })
  check(mobile.wsH >= 44, '移动端工作台按钮 ≥44px', JSON.stringify(mobile))
  check(mobile.subnav === 'flex' && mobile.viewH >= 44, '移动端子视图横向条 ≥44px', JSON.stringify(mobile))
  check(mobile.overflow <= 2, '移动端没有横向溢出', String(mobile.overflow))
  await shot('12-mobile.png')

  /* ------------------------------------------------------------ 控制台 */
  const ignorable = /experimental-inspector|dsh-passwords|gateway\/api\/messages|ERR_ABORTED|Failed to load resource|status of 40[14]/
  const own = consoleProblems.filter((line) => !ignorable.test(line))
  check(own.length === 0, '控制台没有插件相关报错', own.slice(0, 4).join(' | '))
} catch (error) {
  failures.push('脚本异常：' + (error && error.message ? error.message : String(error)))
  try {
    await shot('99-failure.png')
  } catch (shotError) {
    void shotError
  }
} finally {
  await browser.close()
}

console.log('\n=== dsh-creative-studio 浏览器验收（v0.6 新外壳）===')
for (const line of passes) console.log('  PASS  ' + line)
for (const line of failures) console.log('  FAIL  ' + line)
console.log(`\n${passes.length} passed, ${failures.length} failed；截图目录：${SHOTS}`)
if (failures.length) process.exitCode = 1
