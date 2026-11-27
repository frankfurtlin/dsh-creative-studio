/**
 * 像素 / 矢量 Logo 编辑器（原 ~/workspace/pixel-logo-lab，已归档到
 * plugins/_backup/pixel-logo-lab-20261118.tgz）的 host 半边。
 *
 * 原来它由一个 Python 静态服务器（server.py，127.0.0.1:4173）提供页面和 JSON 持久化 API；
 * 并进创作台后，静态资源从本插件 vendor/pixel-logo-lab 提供，数据和版本历史放在
 * $DSH_HOME/pixel-logo-lab（首次运行时用 vendor 里打包的 current-project.json 做种子）。
 * 接口语义与 server.py 保持一致，页面 app.js 里的 api/... 相对路径不用改。
 */

import { createReadStream } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = '/pixel-logo'
const ROOT = fileURLToPath(new URL('../vendor/pixel-logo-lab/', import.meta.url))
const BUNDLED_DATA = join(ROOT, 'data')
const MAX_BODY_BYTES = 12 * 1024 * 1024

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

function dataHome() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'pixel-logo-lab')
}

function paths() {
  const root = dataHome()
  return {
    root,
    current: join(root, 'current-project.json'),
    history: join(root, 'history'),
  }
}

async function ensureData() {
  const p = paths()
  await mkdir(p.history, { recursive: true })
  try {
    await stat(p.current)
  } catch {
    // 首次运行：把打包时的自动保存快照搬过来，用户打开面板就能看到上次的工程状态。
    try {
      await copyFile(join(BUNDLED_DATA, 'current-project.json'), p.current)
    } catch {
      /* 没有种子也不影响：读取时会回退到正式母版 */
    }
  }
  return p
}

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readJsonBody(req) {
  const length = Number(req.headers['content-length'] || 0)
  if (!Number.isFinite(length) || length <= 0 || length > MAX_BODY_BYTES) {
    throw new Error('Invalid request body size')
  }
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_BODY_BYTES) throw new Error('Invalid request body size')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function atomicWriteJson(file, payload) {
  await mkdir(dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  await rename(temp, file)
}

function safeVersionId(raw) {
  let decoded
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return null
  }
  if (!/^[0-9A-Za-z\u4e00-\u9fff._-]+\.json$/.test(decoded)) return null
  return decoded
}

function slugify(value) {
  const slug = value.replace(/[^0-9A-Za-z\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '')
  return slug.slice(0, 48) || 'snapshot'
}

function versionStamp(date) {
  const iso = date.toISOString() // 2026-11-18T01:02:03.456Z
  const sec = iso.slice(0, 19).replace(/[-:]/g, '').replace('.', '')
  return `${sec}${String(date.getMilliseconds() * 1000).padStart(6, '0')}Z`
}

async function sendFile(req, res, file) {
  const type = MIME[extname(file).toLowerCase()]
  if (!type) return json(res, 404, { error: '不支持的文件类型' })
  let info
  try {
    info = await stat(file)
  } catch {
    return json(res, 404, { error: '文件不存在' })
  }
  if (info.isDirectory()) {
    const index = join(file, 'index.html')
    try {
      info = await stat(index)
    } catch {
      return json(res, 404, { error: '文件不存在' })
    }
    file = index
  }
  res.statusCode = 200
  res.setHeader('content-type', type)
  res.setHeader('cache-control', 'no-store, no-cache, must-revalidate')
  res.setHeader('pragma', 'no-cache')
  res.setHeader('x-content-type-options', 'nosniff')
  res.setHeader('content-length', info.size)
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  createReadStream(file).pipe(res)
}

async function routeApi(req, res, rest) {
  const method = req.method || 'GET'
  const p = await ensureData()

  if (rest === '/api/project') {
    if (method === 'GET') {
      let file = p.current
      try {
        await stat(file)
      } catch {
        file = join(BUNDLED_DATA, 'full-project.json')
      }
      try {
        return json(res, 200, JSON.parse(await readFile(file, 'utf8')))
      } catch (error) {
        return json(res, 500, { error: error.message })
      }
    }
    if (method === 'PUT') {
      try {
        const project = await readJsonBody(req)
        if (!project || typeof project !== 'object' || project.schemaVersion !== 1) {
          throw new Error('Unsupported project schema')
        }
        await atomicWriteJson(p.current, project)
        return json(res, 200, { ok: true })
      } catch (error) {
        return json(res, 400, { error: error.message })
      }
    }
    return json(res, 404, { error: 'Not found' })
  }

  if (rest === '/api/versions') {
    if (method === 'GET') {
      await mkdir(p.history, { recursive: true })
      let names = []
      try {
        names = await readdir(p.history)
      } catch {
        names = []
      }
      const entries = []
      for (const name of names) {
        if (!name.endsWith('.json')) continue
        const file = join(p.history, name)
        let info
        try {
          info = await stat(file)
        } catch {
          continue
        }
        let project = null
        try {
          project = JSON.parse(await readFile(file, 'utf8'))
        } catch {
          continue
        }
        entries.push({
          id: name,
          name: project.versionName || project.name || name.replace(/\.json$/, ''),
          savedAt: project.savedAt || new Date(info.mtimeMs).toISOString(),
          mtime: info.mtimeMs,
        })
      }
      entries.sort((a, b) => b.mtime - a.mtime)
      return json(res, 200, {
        versions: entries.map(({ mtime, ...item }) => item),
      })
    }
    if (method === 'POST') {
      let project
      let name
      try {
        const payload = await readJsonBody(req)
        if (!payload || typeof payload !== 'object' || !payload.project || typeof payload.project !== 'object') {
          throw new Error('Project payload is required')
        }
        project = payload.project
        if (project.schemaVersion !== 1) throw new Error('Unsupported project schema')
        name = String(payload.name || 'Snapshot').trim() || 'Snapshot'
      } catch (error) {
        return json(res, 400, { error: error.message })
      }
      const now = new Date()
      const id = `${versionStamp(now)}-${slugify(name)}.json`
      const saved = JSON.parse(JSON.stringify(project))
      saved.versionName = name
      saved.savedAt = now.toISOString()
      await atomicWriteJson(join(p.history, id), saved)
      return json(res, 201, { id, name, savedAt: saved.savedAt })
    }
    return json(res, 404, { error: 'Not found' })
  }

  if (rest.startsWith('/api/versions/')) {
    const id = safeVersionId(rest.slice('/api/versions/'.length))
    if (!id) return json(res, 400, { error: 'Invalid version id' })
    const file = join(p.history, id)
    if (method === 'GET') {
      try {
        return json(res, 200, JSON.parse(await readFile(file, 'utf8')))
      } catch {
        return json(res, 404, { error: 'Version not found' })
      }
    }
    if (method === 'DELETE') {
      try {
        await unlink(file)
        return json(res, 200, { ok: true })
      } catch {
        return json(res, 404, { error: 'Version not found' })
      }
    }
    return json(res, 404, { error: 'Not found' })
  }

  return json(res, 404, { error: 'Not found' })
}

/**
 * 注册 /pixel-logo 前缀（页面 + API）。鉴权与别的插件路由一致：Web 服务不会替插件鉴权，
 * 所以每个请求先过一遍 Host/Origin + 登录凭证检查。
 */
export function applyPixelLogo(ctx) {
  const rejection = (req) => {
    const connection = ctx.get('connection')
    if (typeof connection?.requestRejection !== 'function') return 403
    return connection.requestRejection({ headers: req.headers })
  }

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: BASE,
        handler: async (req, res) => {
          try {
            const denied = rejection(req)
            if (denied) return json(res, denied, { error: '未授权' })

            const url = new URL(req.url || '/', 'http://local')
            const pathname = url.pathname
            if (pathname === BASE) {
              res.statusCode = 302
              res.setHeader('location', `${BASE}/`)
              res.end()
              return
            }
            const rest = pathname.startsWith(`${BASE}/`) ? pathname.slice(BASE.length) : pathname
            if (rest.startsWith('/api/')) return await routeApi(req, res, rest)

            const method = req.method || 'GET'
            if (method !== 'GET' && method !== 'HEAD') return json(res, 404, { error: 'Not found' })

            let rel
            try {
              rel = decodeURIComponent(rest === '/' ? '/index.html' : rest)
            } catch {
              return json(res, 400, { error: '路径无效' })
            }
            const file = resolve(ROOT, `.${rel}`)
            if (!file.startsWith(resolve(ROOT) + sep)) return json(res, 404, { error: 'Not found' })
            return await sendFile(req, res, file)
          } catch (error) {
            if (res.headersSent) {
              res.end()
              return
            }
            json(res, error.status || 500, { error: error.message })
          }
        },
      }),
    'dsh-creative-studio: /pixel-logo routes',
  )
}
