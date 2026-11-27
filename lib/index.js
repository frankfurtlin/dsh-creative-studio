// dsh-creative-studio · Host 半片
//
// 原 dsh-media-desk 与 dsh-guizang-design 的 Host 代码已原样迁移到 vendor/ 下，
// 保留上游目录结构，所以它们内部按 import.meta.url 算出来的相对路径继续成立：
//   vendor/media-desk/src/host.js   → ../assets
//   vendor/guizang-design/lib/index.js → ../skills、../own-skills、../gallery、../examples
// 另外，原 ~/workspace/pixel-logo-lab（Python 小服务）的页面与 JSON 持久化 API 也并了进来，
// 见 ./pixel-logo.js，静态资源在 vendor/pixel-logo-lab。
//
// 本文件只做一件事：把这三个 Host 半边挂到同一个插件上，并合并它们需要的服务。
import mediaDesk from '../vendor/media-desk/src/host.js'
import * as design from '../vendor/guizang-design/lib/index.js'
import { applyPixelLogo } from './pixel-logo.js'
import { applyElements } from './elements.js'

export const name = 'dsh-creative-studio'

// media-desk 要 webServer + connection；歸藏设计要 webServer + skills + tools；
// pixel-logo 要 webServer + connection（与 media-desk 重叠）
export const inject = [...new Set([...(mediaDesk.inject || []), ...(design.inject || []), 'webServer', 'connection'])]

export function apply(ctx) {
  console.log('[dsh-creative-studio] host 半片加载：vendor dsh-media-desk 2.7.1 + dsh-guizang-design 0.1.4 + pixel-logo-lab')
  mediaDesk.apply(ctx)
  design.apply(ctx)
  applyPixelLogo(ctx)
  applyElements(ctx)
}
