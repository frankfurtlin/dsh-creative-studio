/**
 * dsh-creative-studio 浏览器验收脚本（源码级迁移后）。
 *
 * 覆盖：
 *   1. 侧栏只有「创作台」，原「内容创作」「歸藏设计」条目不存在；
 *   2. 插件页里两个原插件已不在安装列表；
 *   3. 创作台默认「内容创作」tab，.md-root 渲染，且宿主 /media-desk/* 可用；
 *   4. 「设计」tab 的同源 iframe 渲染展示库，/guizang-design/* 路由 + 版本号来自 vendor；
 *   5. 切回后 pane 保活；窄屏 430px 两个 tab 不溢出；刷新后记住最近 tab；
 *   6. 控制台没有 dsh-creative-studio 的未捕获报错。
 *
 * 用法：node verification/verify-ui.mjs
 * 浏览器：优先用插件自己的 playwright；没有则退回 hermes-site 的 playwright + 本地 chromium。
 */
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { mkdirSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SHOTS = join(HERE, 'shots')
mkdirSync(SHOTS, { recursive: true })

const ORIGIN = process.env.DSH_ORIGIN || 'http://127.0.0.1:3080'
const HOME = process.env.HOME || '/root'

async function loadChromium() {
  try {
    const mod = await import('playwright')
    return mod.chromium
  } catch {
    const require = createRequire('/root/workspace/hermes-site/tools/node_modules/')
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

const failures = []
const passes = []
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
  if (msg.type() === 'error' || /dsh-creative-studio/.test(text)) {
    consoleProblems.push(`[${msg.type()}] ${text.slice(0, 400)}`)
  }
})
page.on('pageerror', (error) => consoleProblems.push('[pageerror] ' + String(error).slice(0, 400)))

try {
  await page.goto(`${ORIGIN}/?token=${readToken()}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('nav button', { timeout: 30000 })
  await page.waitForTimeout(4000)

  // 1. 侧栏
  const visibleSidebar = await page.locator('nav button').evaluateAll((els) =>
    els
      .filter((el) => el.offsetParent !== null)
      .map((el) => (el.getAttribute('aria-label') || el.innerText || '').trim())
      .filter(Boolean),
  )
  await page.screenshot({ path: join(SHOTS, '01-sidebar.png') })
  check(visibleSidebar.includes('创作台'), '侧栏出现「创作台」', '可见行：' + visibleSidebar.join(' / '))
  check(!visibleSidebar.includes('内容创作'), '侧栏没有重复的内容入口', '可见行：' + visibleSidebar.join(' / '))
  check(!visibleSidebar.includes('歸藏设计'), '侧栏没有「歸藏设计」', '可见行：' + visibleSidebar.join(' / '))

  // 2. 插件页：两个原插件已不在已安装列表
  await page.getByRole('button', { name: '插件' }).first().click()
  // 插件列表要等后端 list_plugins 返回；固定 sleep 在机器忙时会太短（曾导致误报）
  await page.getByRole('switch').first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(800)
  const pluginRows = await page.getByRole('switch').evaluateAll((els) =>
    els.map((el) => el.getAttribute('aria-label') || '').join(' | '),
  )
  await page.screenshot({ path: join(SHOTS, '02-plugins-page.png') })
  check(!/dsh-media-desk/.test(pluginRows), '插件页不再有 dsh-media-desk', pluginRows.slice(0, 400))
  check(!/dsh-guizang-design|歸藏设计/.test(pluginRows), '插件页不再有 dsh-guizang-design', pluginRows.slice(0, 400))
  check(/dsh-creative-studio/.test(pluginRows), '插件页仍有 dsh-creative-studio', pluginRows.slice(0, 400))

  // 3. 创作台默认 tab + 宿主 /media-desk/*
  await page.getByRole('button', { name: '创作台' }).first().click()
  await page.waitForTimeout(1500)
  const tabs = await page.getByRole('tab').evaluateAll((els) =>
    els.map((el) => ({ label: el.innerText.trim(), selected: el.getAttribute('aria-selected') })),
  )
  check(tabs.length === 4, '创作台里有 4 个 tab', JSON.stringify(tabs))
  check(
    tabs.some((t) => t.label.includes('内容创作') && t.selected === 'true'),
    '默认停在「内容创作」tab',
    JSON.stringify(tabs),
  )


  // 3a. 「设计元素」tab：threeui 组件库（iframe /studio-elements/）
  check(
    tabs.some((t) => t.label.includes('设计元素')),
    '有「设计元素」tab',
    JSON.stringify(tabs.map((t) => t.label)),
  )
  await page.getByRole('tab', { name: '设计元素', exact: true }).click()
  const elementsLocator = page.frameLocator('iframe[src*="/studio-elements/"]')
  await elementsLocator.locator('.sidebar .list button').first().waitFor({ state: 'visible', timeout: 30000 })
  const elementsFrameObj = page.frames().find((item) => item.url().includes('/studio-elements/'))
  const elementsState = elementsFrameObj
    ? await elementsFrameObj.evaluate(() => {
        const root = getComputedStyle(document.documentElement)
        const style = document.getElementById('dsh-cs-theme')
        const stage = document.querySelector('.cell .boxx')
        return {
          title: document.title,
          brand: document.querySelector('.brand h1')?.innerText || '',
          components: document.querySelectorAll('.sidebar .list button').length,
          theme: document.documentElement.getAttribute('data-cs-studio'),
          injected: Boolean(style),
          bg: root.getPropertyValue('--bg').trim(),
          accent: root.getPropertyValue('--accent').trim(),
          bodyBg: getComputedStyle(document.body).backgroundColor,
          stage: stage ? getComputedStyle(stage).backgroundColor : '',
        }
      })
    : null
  check(Boolean(elementsState && /设计元素/.test(elementsState.title)), '设计元素页标题为「设计元素 · 创作台」', JSON.stringify(elementsState))
  check(Boolean(elementsState && elementsState.components === 103), '组件库列出 103 个组件', String(elementsState && elementsState.components))
  check(Boolean(elementsState && /设计元素/.test(elementsState.brand)), '侧栏品牌已换成「设计元素」', String(elementsState && elementsState.brand))
  check(Boolean(elementsState && elementsState.injected && elementsState.theme === 'light'), '设计元素 iframe 已注入创作台主题', JSON.stringify(elementsState))
  check(Boolean(elementsState && elementsState.bg === '#f5f5f3' && elementsState.accent === '#1f7a68'), '设计元素外壳换成 #f5f5f3 / #1f7a68', JSON.stringify(elementsState))
  check(Boolean(elementsState && elementsState.stage === 'rgb(8, 9, 11)'), '组件舞台保持深底（内容色不覆盖）', String(elementsState && elementsState.stage))

  // 点开一个组件：聚焦模式里再嵌一层 iframe（组件自己的页面）
  await elementsLocator.locator('.search input').fill('Sketchbook')
  await elementsLocator.locator('.sidebar .list button').first().click()
  await page.waitForTimeout(2500)
  const nested = elementsFrameObj
    ? await elementsFrameObj.evaluate(() => Array.from(document.querySelectorAll('iframe')).map((f) => f.getAttribute('src') || ''))
    : []
  check(nested.length > 0, '点开组件后挂载了组件自己的 iframe', JSON.stringify(nested))
  check(nested.every((src) => src.startsWith('/studio-elements/')), '组件 iframe 资产走 /studio-elements/ 前缀', JSON.stringify(nested.slice(0, 3)))
  await page.screenshot({ path: join(SHOTS, '03a-studio-elements-tab.png') })

  // 回到「内容创作」，后面的检查沿用原来的路径
  await page.getByRole('tab', { name: '内容创作' }).click()
  await page.waitForTimeout(800)

  const mediaRoot = page.locator('.md-root').first()
  await mediaRoot.waitFor({ state: 'visible', timeout: 20000 })
  check(await mediaRoot.isVisible(), '内容创作面板已渲染（.md-root 可见）')

  const mediaApi = await page.evaluate(async () => {
    const stateRes = await fetch('media-desk/state')
    const stateText = await stateRes.text()
    const assetRes = await fetch('media-desk/assets/aurora.jpg')
    return {
      stateStatus: stateRes.status,
      stateOk: /"state"/.test(stateText) && /"model"/.test(stateText),
      assetStatus: assetRes.status,
      assetType: assetRes.headers.get('content-type') || '',
    }
  })
  check(mediaApi.stateStatus === 200 && mediaApi.stateOk, 'GET /media-desk/state 返回状态 JSON', JSON.stringify(mediaApi))
  check(
    mediaApi.assetStatus === 200 && /image/.test(mediaApi.assetType),
    'GET /media-desk/assets/aurora.jpg 返回图片',
    JSON.stringify(mediaApi),
  )
  await page.screenshot({ path: join(SHOTS, '03-media-desk-tab.png') })

  // 3b. 右栏灵感卡：内容居中（2026-11-18 反馈）
  await page.locator('.md-root article.md-card').first().click()
  await page.waitForTimeout(1500)
  const ideaCard = page.locator('.md-idea-card').first()
  await ideaCard.waitFor({ state: 'visible', timeout: 15000 })
  const ideaAlign = await ideaCard.evaluate((card) => {
    const pick = (selector) => {
      const el = card.querySelector(selector)
      if (!el) return null
      const style = getComputedStyle(el)
      return { textAlign: style.textAlign, justify: style.justifyContent }
    }
    return {
      card: getComputedStyle(card).textAlign,
      label: pick('.md-idea-label'),
      text: pick('.md-idea-text'),
      row: pick('.md-go-row'),
      seg: pick('.md-format-seg'),
    }
  })
  check(
    ideaAlign.card === 'center' &&
      ideaAlign.label && ideaAlign.label.textAlign === 'center' &&
      ideaAlign.text && ideaAlign.text.textAlign === 'center' &&
      ideaAlign.row && ideaAlign.row.justify === 'center' &&
      ideaAlign.seg && ideaAlign.seg.justify === 'normal',
    '内容创作右栏灵感卡内容居中',
    JSON.stringify(ideaAlign),
  )
  const ideaBox = await ideaCard.boundingBox()
  if (ideaBox) {
    await page.screenshot({
      path: join(SHOTS, '03b-idea-card-centered.png'),
      clip: { x: ideaBox.x - 6, y: ideaBox.y - 6, width: ideaBox.width + 12, height: ideaBox.height + 12 },
    })
  }
  // 关掉灵感详情，避免它盖住顶部导航影响后续巡检
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)

  // 4. 设计 tab：iframe + 宿主 /guizang-design/*
  await page.getByRole('tab', { name: '设计', exact: true }).click()
  const frame = page.locator('iframe[src*="/guizang-design/"]').first()
  await frame.waitFor({ state: 'visible', timeout: 20000 })
  check(await frame.isVisible(), '设计 tab 的 /guizang-design/ iframe 可见')
  const frameBody = page.frameLocator('iframe[src*="/guizang-design/"]').locator('body')
  await frameBody.getByText('用一套设计做所有内容').first().waitFor({ timeout: 25000 })
  check(true, '设计页正文出现「用一套设计做所有内容」')

  const designApi = await page.evaluate(async () => {
    const catalogRes = await fetch('/guizang-design/api/catalog?lang=zh')
    const catalog = await catalogRes.json().catch(() => null)
    const exampleRes = await fetch('/guizang-design/examples/manifest.json')
    const pageRes = await fetch('/guizang-design/')
    const pageText = await pageRes.text()
    return {
      catalogStatus: catalogRes.status,
      version: catalog && catalog.version,
      skills: catalog && Array.isArray(catalog.skills) ? catalog.skills.length : null,
      exampleStatus: exampleRes.status,
      pageStatus: pageRes.status,
      pageHasShell: /<title>创作台 · 设计<\/title>/.test(pageText) && pageText.includes('gz-swiss.css'),
    }
  })
  check(designApi.catalogStatus === 200 && designApi.version === '0.1.4', 'GET /guizang-design/api/catalog 版本 0.1.4（来自 vendor package.json）', JSON.stringify(designApi))
  // 品牌：外壳只体现「创作台」，设计页里没有第三方插件名/logo
  const brandText = (await page.locator('.dsh-cs-brand').innerText()).trim()
  check(brandText === '创作台', '外壳顶栏显示自有品牌「创作台」', brandText)

  const designText = await frameBody.innerText()
  const designFrame = page.frames().find((item) => item.url().includes('/guizang-design/'))
  const designTitle = designFrame ? await designFrame.evaluate(() => document.title) : ''
  check(!/歸藏设计|Guizang Design|dsh-guizang-design/.test(designText), '设计页正文不含第三方插件名', designText.slice(0, 200))
  check(!/v0\.1\.4/.test(designText), '设计页页脚不显示上游插件版本', designText.slice(0, 200))
  check(/创作台/.test(designText), '设计页侧栏品牌已换成「创作台」', designText.slice(0, 120))
  check(!/guizang-/.test(designText), '设计页不露出第三方 skill id', designText.slice(0, 200))
  check(/创作台/.test(designTitle), '设计页 <title> 已换成「创作台」', designTitle)

  const pageText = await page.locator('body').innerText()
  check(!/自媒体工作台|歸藏设计|dsh-media-desk|dsh-guizang-design/.test(pageText), '主界面可见文本不含第三方插件名', pageText.slice(0, 200))


  check(designApi.exampleStatus === 200, 'GET /guizang-design/examples/manifest.json 可用', JSON.stringify(designApi))
  check(designApi.pageStatus === 200 && designApi.pageHasShell, 'GET /guizang-design/ 返回展示库页面外壳', String(designApi.pageStatus))
  check(!(await mediaRoot.isVisible()), '切到设计后内容创作被隐藏（保活不重挂）')
  await page.screenshot({ path: join(SHOTS, '04-design-tab.png') })

  // 5. 切回保活
  await page.getByRole('tab', { name: '内容创作' }).click()
  await page.waitForTimeout(1200)
  check(await mediaRoot.isVisible(), '切回后内容创作仍在（pane 保活）')
  check(!(await frame.isVisible()), '切回后设计 iframe 被隐藏')
  // 5. Logo tab：/pixel-logo/ 编辑器 + 宿主 API
  await page.getByRole('tab', { name: 'Logo' }).click()
  const logoFrame = page.locator('iframe[src*="/pixel-logo/"]').first()
  await logoFrame.waitFor({ state: 'visible', timeout: 20000 })
  check(await logoFrame.isVisible(), 'Logo tab 的 /pixel-logo/ iframe 可见')

  // iframe 元素出现不代表文档已执行完：等编辑器自己的画布节点，避免首帧竞态。
  await page
    .frameLocator('iframe[src*="/pixel-logo/"]')
    .locator('#editorCanvas')
    .waitFor({ state: 'attached', timeout: 30000 })
  const logoFrameObj = page.frames().find((item) => item.url().includes('/pixel-logo/'))
  const logoTitle = logoFrameObj ? await logoFrameObj.evaluate(() => document.title) : ''
  check(/像素 Logo 实验室/.test(logoTitle), 'Logo 编辑器页面加载完成（中文化标题）', logoTitle)

  const canvasBox = logoFrameObj
    ? await logoFrameObj.evaluate(() => {
        const canvas = document.querySelector('#editorCanvas')
        if (!canvas) return null
        return { width: canvas.width, height: canvas.height, visible: canvas.offsetWidth > 0 || canvas.offsetHeight > 0 }
      })
    : null
  check(Boolean(canvasBox && canvasBox.visible && canvasBox.width > 0), 'Logo 画布已渲染', JSON.stringify(canvasBox))

  const logoApi = await page.evaluate(async () => {
    const projectRes = await fetch('/pixel-logo/api/project')
    const project = await projectRes.json().catch(() => null)
    const presetRes = await fetch('/pixel-logo/data/full-project.json')
    const cssRes = await fetch('/pixel-logo/styles.css')
    const cssText = await cssRes.text()
    return {
      projectStatus: projectRes.status,
      schema: project && project.schemaVersion,
      presetStatus: presetRes.status,
      cssStatus: cssRes.status,
      cssOk: cssText.includes('.editor') || cssText.includes('.canvas'),
    }
  })
  check(
    logoApi.projectStatus === 200 && logoApi.schema === 1,
    'GET /pixel-logo/api/project 返回工程 JSON',
    JSON.stringify(logoApi),
  )
  check(logoApi.presetStatus === 200, 'GET /pixel-logo/data/full-project.json 返回母版', JSON.stringify(logoApi))
  check(logoApi.cssStatus === 200 && logoApi.cssOk, 'GET /pixel-logo/styles.css 返回样式表', JSON.stringify(logoApi))

  const autosave = await page.evaluate(async () => {
    const project = await fetch('/pixel-logo/api/project').then((r) => r.json())
    const res = await fetch('/pixel-logo/api/project', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(project),
    })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, ok: body.ok === true }
  })
  check(autosave.status === 200 && autosave.ok, 'PUT /pixel-logo/api/project 自动保存可用', JSON.stringify(autosave))

  const versionRoundTrip = await page.evaluate(async () => {
    const project = await fetch('/pixel-logo/api/project').then((r) => r.json())
    const created = await fetch('/pixel-logo/api/versions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project, name: '验收快照' }),
    })
    const saved = await created.json().catch(() => ({}))
    const listed = await fetch('/pixel-logo/api/versions').then((r) => r.json())
    const removed = saved.id
      ? await fetch('/pixel-logo/api/versions/' + encodeURIComponent(saved.id), { method: 'DELETE' })
      : { status: 0 }
    const listedAfter = await fetch('/pixel-logo/api/versions').then((r) => r.json())
    return {
      createStatus: created.status,
      id: saved.id || '',
      listed: (listed.versions || []).some((item) => item.id === saved.id),
      deleteStatus: removed.status,
      gone: !(listedAfter.versions || []).some((item) => item.id === saved.id),
    }
  })
  check(
    versionRoundTrip.createStatus === 201 && versionRoundTrip.listed && versionRoundTrip.deleteStatus === 200 && versionRoundTrip.gone,
    'Logo 版本快照可创建 / 列出 / 删除',
    JSON.stringify(versionRoundTrip),
  )
  await page.screenshot({ path: join(SHOTS, '04b-logo-tab.png') })
  check(!(await mediaRoot.isVisible()), '切到 Logo 后内容创作被隐藏')
  check(!(await frame.isVisible()), '切到 Logo 后设计 iframe 被隐藏')

  // 6b. 三个 tab 的统一浅色规范（外壳 + 两个 iframe 注入）
  const shellTheme = await page.locator('.dsh-cs-root').evaluate((el) => {
    const root = getComputedStyle(el)
    const bar = getComputedStyle(el.querySelector('.dsh-cs-bar'))
    return {
      bg: root.backgroundColor,
      color: root.color,
      font: root.fontFamily,
      bar: bar.backgroundColor,
    }
  })
  check(shellTheme.bg === 'rgb(245, 245, 243)', '创作台外壳底色为浅色 #f5f5f3', JSON.stringify(shellTheme))
  check(shellTheme.bar === 'rgb(251, 251, 249)', '创作台顶栏底色为 #fbfbf9', JSON.stringify(shellTheme))
  check(/Inter/.test(shellTheme.font), '创作台外壳使用 Inter 字体栈', shellTheme.font)

  const designFrameObj = page.frames().find((item) => item.url().includes('/guizang-design/'))
  const designTheme = designFrameObj
    ? await designFrameObj.evaluate(() => {
        const banner = document.querySelector('.banner')
        const style = document.getElementById('dsh-cs-theme')
        return {
          theme: document.documentElement.getAttribute('data-cs-studio'),
          scheme: document.documentElement.getAttribute('data-scheme'),
          injected: Boolean(style),
          bg: getComputedStyle(document.body).backgroundColor,
          color: getComputedStyle(document.body).color,
          font: getComputedStyle(document.body).fontFamily,
          bannerRadius: banner ? getComputedStyle(banner).borderRadius : '',
          btnRadius: document.querySelector('.btn') ? getComputedStyle(document.querySelector('.btn')).borderRadius : '',
        }
      })
    : null
  check(Boolean(designTheme && designTheme.injected), '设计 iframe 已注入创作台主题', JSON.stringify(designTheme))
  check(Boolean(designTheme && designTheme.theme === 'light' && designTheme.scheme === 'light'), '设计页锁定浅色 scheme', JSON.stringify(designTheme))
  check(Boolean(designTheme && designTheme.bg === 'rgb(245, 245, 243)'), '设计页底色 #f5f5f3', JSON.stringify(designTheme))
  check(Boolean(designTheme && /Inter/.test(designTheme.font)), '设计页使用 Inter 字体栈', String(designTheme && designTheme.font))
  check(Boolean(designTheme && designTheme.bannerRadius === '12px' && designTheme.btnRadius === '8px'), '设计页卡片 12px / 按钮 8px 圆角', JSON.stringify(designTheme))

  const logoTheme = logoFrameObj
    ? await logoFrameObj.evaluate(() => {
        const topbar = document.querySelector('.topbar')
        const injected = document.getElementById('dsh-cs-theme')
        return {
          theme: document.documentElement.getAttribute('data-cs-studio'),
          injected: Boolean(injected),
          bodyBg: getComputedStyle(document.body).backgroundColor,
          bodyColor: getComputedStyle(document.body).color,
          font: getComputedStyle(document.body).fontFamily,
          topbarBg: topbar ? getComputedStyle(topbar).backgroundColor : '',
          topbarRadius: topbar ? getComputedStyle(topbar).borderRadius : '',
          buttonRadius: document.querySelector('button') ? getComputedStyle(document.querySelector('button')).borderRadius : '',
          canvasBg: document.querySelector('#editorCanvas') ? getComputedStyle(document.querySelector('#editorCanvas')).backgroundColor : '',
        }
      })
    : null
  check(Boolean(logoTheme && logoTheme.injected && logoTheme.theme === 'light'), 'Logo 编辑器已注入浅色外壳', JSON.stringify(logoTheme))
  check(Boolean(logoTheme && logoTheme.bodyBg === 'rgb(245, 245, 243)'), 'Logo 编辑器底色 #f5f5f3', JSON.stringify(logoTheme))
  check(Boolean(logoTheme && logoTheme.topbarBg === 'rgb(251, 251, 249)'), 'Logo 顶栏底色 #fbfbf9', JSON.stringify(logoTheme))
  check(Boolean(logoTheme && logoTheme.buttonRadius === '8px'), 'Logo 按钮圆角 8px', JSON.stringify(logoTheme))
  check(Boolean(logoTheme && /Inter/.test(logoTheme.font)), 'Logo 编辑器使用 Inter 字体栈', String(logoTheme && logoTheme.font))
  await page.screenshot({ path: join(SHOTS, '04c-logo-theme.png') })

  // 6d. Logo 页中文化与图层文字居中（2026-11-18 反馈）
  const logoCopy = logoFrameObj
    ? await logoFrameObj.evaluate(() => {
        const row = document.querySelector('.layer-item .layer-name')
        const meta = document.querySelector('#projectMeta')
        const head = document.querySelector('h1')
        const texts = []
        const walk = (el) => {
          for (const node of el.childNodes) {
            if (node.nodeType === 3) {
              const text = node.textContent.trim()
              if (/[A-Za-z]{2,}/.test(text)) texts.push(text.slice(0, 80))
            } else if (node.nodeType === 1) walk(node)
          }
        }
        walk(document.body)
        return {
          head: head ? head.innerText.trim() : '',
          meta: meta ? meta.innerText.trim() : '',
          layerText: row ? row.innerText.replace(/\s+/g, ' ').trim() : '',
          layerAlign: row ? getComputedStyle(row).textAlign : '',
          layerJustify: row ? getComputedStyle(row).justifyContent : '',
          english: [...new Set(texts)],
        }
      })
    : null
  check(
    Boolean(logoCopy && logoCopy.head === '像素 Logo 实验室' && /逻辑网格/.test(logoCopy.meta)),
    'Logo 页标题与工程信息已中文化',
    JSON.stringify(logoCopy && { head: logoCopy.head, meta: logoCopy.meta }),
  )
  check(
    Boolean(logoCopy && /[\u4e00-\u9fa5]/.test(logoCopy.layerText) && /\d+ 格/.test(logoCopy.layerText)),
    'Logo 图层名称文案正常',
    String(logoCopy && logoCopy.layerText),
  )
  check(
    Boolean(logoCopy && logoCopy.layerAlign === 'center' && logoCopy.layerJustify === 'center'),
    'Logo 图层名称文字居中',
    JSON.stringify(logoCopy && { align: logoCopy.layerAlign, justify: logoCopy.layerJustify }),
  )
  const leftoverEnglish = (logoCopy ? logoCopy.english : []).filter(
    (text) => !/PNG|SVG|JSON|Logo|O3|W3O|px|^\d|WEB|ODYSSEY/.test(text),
  )
  check(leftoverEnglish.length === 0, 'Logo 页可见文案已中文化（仅保留格式名/品牌名）', JSON.stringify(leftoverEnglish))

  // 6e. 回归巡检：其他页面里的同类问题（2026-11-18 用户反馈「都回归一下」）
  await page.getByRole('tab', { name: '内容创作' }).click()
  await page.waitForTimeout(1200)
  const mediaNav = async (name) => {
    await page.locator('.md-root nav button', { hasText: name }).first().click()
    await page.waitForTimeout(900)
    return page.locator('.md-root').innerText()
  }
  await mediaNav('排期')
  const monthText = (await page.locator('.md-cal-month').first().innerText()).replace(/\s+/g, ' ').trim()
  check(
    /月/.test(monthText) && !/January|February|March|April|May|June|July|August|September|October|November|December/.test(monthText),
    '排期页月份已中文化（不再出现 November）',
    monthText,
  )
  await page.screenshot({ path: join(SHOTS, '10-regression-schedule.png') })
  const styleText = await mediaNav('风格')
  check(
    /导出为技能/.test(styleText) && !/\bSkill\b/.test(styleText),
    '风格页「导出为技能」已中文化',
    styleText.slice(-260),
  )
  const gearButton = page.locator('.md-root button[title*="设置"], .md-root [aria-label*="设置"]').first()
  await gearButton.click()
  await page.waitForTimeout(800)
  const langOptions = await page.locator('.md-root').evaluate((root) =>
    [...root.querySelectorAll('button')]
      .map((b) => b.innerText.trim())
      .filter((t) => t === '中文' || t === '英文' || t === 'English' || t.startsWith('跟随')),
  )
  check(
    langOptions.includes('中文') && langOptions.includes('英文') && !langOptions.includes('English'),
    '设置里的语言选项已中文化（英文，不再是 English）',
    JSON.stringify(langOptions),
  )
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  await page.getByRole('tab', { name: '设计', exact: true }).click()
  await page.waitForTimeout(2500)
  const designNav = page.frameLocator('iframe[src*="/guizang-design/"]')
  const designViews = { home: '概览', works: '我的作品', workflows: '内容生产工作流', voice: '语气档案', examples: '官方示例' }
  const designViewLen = {}
  let designAllText = ''
  for (const [view, label] of Object.entries(designViews)) {
    await designNav.locator(`nav.nav a[data-view="${view}"]`).click()
    let text = ''
    for (let i = 0; i < 12; i += 1) {
      await page.waitForTimeout(400)
      text = await designNav.locator('.main').innerText().catch(() => '')
      if (text.trim().length > 40) break
    }
    designViewLen[label] = text.trim().length
    designAllText += '\n' + text
  }
  check(
    Object.values(designViewLen).every((len) => len > 40),
    '设计页五个视图都有内容（点击导航不空白）',
    JSON.stringify(designViewLen),
  )
  check(!/\bskills?\b/i.test(designAllText) && /技能/.test(designAllText), '设计页可见文案里的 skill 已改成「技能」', designAllText.slice(0, 200))
  await page.screenshot({ path: join(SHOTS, '10b-regression-design.png') })


  // 7. 窄屏
  await page.setViewportSize({ width: 430, height: 900 })
  await page.waitForTimeout(1500)
  const narrowTabs = await page.getByRole('tab').evaluateAll((els) =>
    els.map((el) => {
      const rect = el.getBoundingClientRect()
      return { label: el.innerText.trim(), left: rect.left, right: rect.right, width: rect.width }
    }),
  )
  check(narrowTabs.length === 4, '窄屏下仍是四个 tab', JSON.stringify(narrowTabs))
  check(
    narrowTabs.every((tab) => tab.left >= 0 && tab.right <= 430 && tab.width > 40),
    '窄屏下 tab 完整落在视口内',
    JSON.stringify(narrowTabs),
  )
  await page.getByRole('tab', { name: '设计', exact: true }).click()
  await page.waitForTimeout(2500)
  check(await frame.isVisible(), '窄屏下切到设计 tab 仍正常')
  await page.screenshot({ path: join(SHOTS, '06-narrow-viewport.png') })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('tab', { name: '内容创作' }).click()
  await page.waitForTimeout(1000)

  // 8. 刷新后记忆上次 tab
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('nav button', { timeout: 30000 })
  await page.waitForTimeout(3000)
  await page.getByRole('button', { name: '创作台' }).first().click()
  await page.waitForTimeout(1500)
  const selectedAfterReload = await page
    .getByRole('tab', { selected: true })
    .evaluateAll((els) => els.map((el) => el.innerText.trim()))
  check(
    selectedAfterReload.some((label) => label.includes('内容创作')),
    '刷新后记住上次所在 tab',
    JSON.stringify(selectedAfterReload),
  )
} catch (error) {
  failures.push('脚本异常：' + (error && error.message ? error.message : String(error)))
  await page.screenshot({ path: join(SHOTS, '99-failure.png') }).catch(() => {})
} finally {
  const ourErrors = consoleProblems.filter((line) => /dsh-creative-studio|pageerror/.test(line))
  if (ourErrors.length) failures.push('控制台有插件相关报错：\n  ' + ourErrors.slice(0, 5).join('\n  '))

  await browser.close()
  console.log('\n=== dsh-creative-studio 浏览器验收 ===')
  for (const line of passes) console.log('  PASS  ' + line)
  for (const line of failures) console.log('  FAIL  ' + line)
  console.log(`\n${passes.length} passed, ${failures.length} failed；截图目录：${SHOTS}`)
  if (failures.length) process.exitCode = 1
}
