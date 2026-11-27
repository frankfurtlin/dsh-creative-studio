/**
 * 「设计元素」—— 创作台第 4 个 tab。
 *
 * 组件库原本是独立项目 ~/workspace/threeui-demo（Vite + React，dev 服务挂在
 * /threeui/）。并进创作台后，页面按构建产物 vendor/threeui 提供，路由前缀
 * /studio-elements，语义与原来的静态服务一致：HTML、JS/CSS、落地页、书本 PNG 都
 * 直接读文件，不依赖任何外部进程。
 *
 * 只有静态文件，没有 API：组件清单在构建时就烤进 bundle（src/catalog.js）。
 */

import { createReadStream, existsSync, realpathSync, statSync } from 'node:fs'
import { extname, normalize, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = '/studio-elements'
const ROOT = fileURLToPath(new URL('../vendor/threeui/', import.meta.url))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.hdr': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
}

function notFound(res) {
  res.statusCode = 404
  res.setHeader('content-type', 'text/plain; charset=utf-8')
  res.end('not found')
}

// 只允许读 ROOT 里的真实文件：拒绝 ..、点文件，以及指向目录外的符号链接
function safeFile(rel) {
  if (!rel || rel.split('/').some((part) => part.startsWith('.') && part !== '.')) return null
  let base
  try {
    base = realpathSync(ROOT)
  } catch {
    return null
  }
  const file = normalize(join(base, rel))
  if (!file.startsWith(base + sep) || !existsSync(file)) return null
  const real = realpathSync(file)
  return real.startsWith(base + sep) && statSync(real).isFile() ? real : null
}

function send(req, res, file) {
  const ext = extname(file).toLowerCase()
  const type = MIME[ext] || 'application/octet-stream'
  const stat = statSync(file)
  // /assets/ 下的文件名带内容哈希，可以长缓存；其余（页面、落地页、书本 PNG）短缓存，
  // 重建组件库后刷新就能看到新版本。
  const cache = file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=60'
  res.writeHead(200, { 'content-type': type, 'content-length': stat.size, 'cache-control': cache })
  if (req.method === 'HEAD') return res.end()
  createReadStream(file).pipe(res)
}

/**
 * 注册 /studio-elements 前缀。鉴权与别的插件路由一致：Web 服务不会替插件鉴权，
 * 所以每个请求先过一遍 Host/Origin + 登录凭证检查。
 */
export function applyElements(ctx) {
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
          const denied = rejection(req)
          if (denied) {
            res.statusCode = denied
            res.setHeader('content-type', 'text/plain; charset=utf-8')
            res.end('未授权')
            return
          }

          const method = req.method || 'GET'
          if (method !== 'GET' && method !== 'HEAD') return notFound(res)

          let pathname
          try {
            pathname = decodeURIComponent(new URL(req.url || '/', 'http://local').pathname)
          } catch {
            return notFound(res)
          }
          if (pathname === BASE) {
            res.statusCode = 302
            res.setHeader('location', `${BASE}/`)
            res.end()
            return
          }

          const rest = pathname.startsWith(`${BASE}/`) ? pathname.slice(BASE.length) : pathname
          const file = safeFile(rest === '/' ? '/index.html' : rest)
          if (file) return send(req, res, file)

          // 没有扩展名的路径交回页面本身（应用是 hash 路由，正常不会走到这里）
          if (!extname(rest)) {
            const index = safeFile('/index.html')
            if (index) return send(req, res, index)
          }
          notFound(res)
        },
      }),
    'dsh-creative-studio: /studio-elements routes',
  )
}
