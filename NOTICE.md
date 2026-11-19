# NOTICE —— 上游项目与许可证归属

`dsh-creative-studio`（创作台）把下面几个项目的代码源码级并入本包，
`vendor/` 下是对应版本的原样拷贝（除下述改动外，运行逻辑未修改）。

## dsh-media-desk（自媒体工作台）

- 版本：`2.7.1`
- 上游仓库：https://github.com/woniuniuniu/dsh-media-desk
- 作者 / 版权：woniuniuniu
- 许可证：MIT（随包保留 `vendor/media-desk/LICENSE`）
- 本包内位置：`vendor/media-desk/`
- 用途：`/media-desk/*` 后端路由（状态、文件、模型调用、导出），以及「自媒体工作台」面板 UI
  （灵感 / 内容 / 排期 / 复盘 / 风格）与 better-sidebar 右侧 tab。

## dsh-guizang-design（歸藏设计）

- 版本：`0.1.4`
- 作者 / 版权：op7418
- 许可证：AGPL-3.0-only（随包保留 `vendor/guizang-design/LICENSE`）
- 本包内位置：`vendor/guizang-design/`
- 用途：`/guizang-design/*` 展示库页面与 API、5 个 skill（`guizang-ppt-skill`、
  `guizang-social-card-skill`、`guizang-page-skill`、`humanizer-zh`、`guizang-voice`）、
  `guizang_library_add` / `guizang_voice` 两个工具、作品库与语气档案持久化。
- 因为内嵌了 AGPL-3.0 代码，`dsh-creative-studio` 整体按 **AGPL-3.0-only** 分发
  （`package.json` 的 `license` 字段）。

## pixel-logo-lab（像素 / 矢量 Logo 编辑器）

- 来源：本机项目 `/root/workspace/pixel-logo-lab`（Web3 Odyssey 的内部工具，作者与版权归本项目所有者）；
  原目录已归档为 `/root/workspace/plugins/_backup/pixel-logo-lab-20261118.tgz`
- 版本：无 npm 包；页面取自该项目 2026-11 的快照（`index.html`、`app.js`、`styles.css`、
  `assets/fonts/`、`data/` 下三份母版与自动保存快照）
- 许可证：该项目没有 LICENSE 文件，仅在本机自用，不对外分发
- 本包内位置：`vendor/pixel-logo-lab/`（静态页面与资源）、`lib/pixel-logo.js`（API 与静态服务）
- 用途：创作台第三个 tab「Logo」——`/pixel-logo/*` 编辑器页面，以及
  `/pixel-logo/api/project`、`/pixel-logo/api/versions` 持久化 API。
- 改动：原 `server.py`（Python 标准库 HTTP 服务）的语义用 Node 复刻到 `lib/pixel-logo.js`；
  数据目录从项目内 `data/` 改为 `$DSH_HOME/pixel-logo-lab/`，首次运行时用打包的
  `data/current-project.json` 做种子；2026-11-18 界面文案中文化（标题、工程信息、图层默认名、
  错误/导入提示等，保留 PNG/SVG/JSON 等格式名与 O3/W3O/Logo 品牌词），图层名称行改为居中。原独立部署已于 2026-11-18 下线并删除
  （systemd 服务与 Caddy `/pixel` 路由都已移除），插件面板是唯一入口。


## threeui-demo（设计元素组件库）

- 来源：本机自主项目（`@designcodeio/threeui` 的组件画廊）。源码已整体迁入本包
  `threeui-src/`（含 git 历史与报告生成脚本），原工作区目录 `/root/workspace/threeui-demo`
  已于 2026-11-18 删除；独立部署（`threeui-demo.service` + `/threeui/` 反代）同日下线
- 上游组件库：`@designcodeio/threeui` 1.2.0（MIT），103 个导出组件
- 本包内位置：`vendor/threeui/` —— 该项目的 **Vite 构建产物**（源码在 `threeui-src/`，此处只放产物）：
  `index.html`、`assets/`（React + three.js bundle）、`landing-pages/`、`sketchbook/`、
  `japanese-tower.html`、`landscape.html`、`spark-badge.html`、`synthralos-halftone.html`
- 用途：创作台第四个 tab「设计元素」，静态服务在 `lib/elements.js`（前缀 `/studio-elements`）
- 改动（在 `threeui-src/` 里改，重新构建后再覆盖 `vendor/threeui/`）：
  1. `src/App.jsx` 的 base 从写死 `/threeui` 改为运行时推导（已知前缀 + `import.meta.url`
     的 `/assets/` 位置），同一份源码既能挂 `/studio-elements/`，也能挂任意前缀；
  2. 品牌归一：标题 `<title>设计元素 · 创作台</title>`、侧栏 `ThreeUI Gallery` → `设计元素`、
     `@designcodeio/threeui · MIT` 一行换成「创作台组件库 · 103 个」，控制台前缀 `[elements]`；
  3. 构建命令：`npm run build`（base 已在 `vite.config.js` 里设为 `/studio-elements/`，产物落在 `build/elements-dist`）。
- 重建步骤：改完源项目后重跑上面的构建，把 `build/elements-dist/` 整个覆盖到
  `vendor/threeui/`，刷新 DSH 页面即可（静态文件是现读的，宿主路由不用重启）。
  一条命令（在 `threeui-src/` 下，首次先 `npm install`）：
  `npm run build && rsync -a --delete build/elements-dist/ ../vendor/threeui/`。

## 合并方式（对上游代码的改动）

1. 上游两个包的完整源码/资源拷贝进 `vendor/`，保持原目录结构（host 用 `import.meta.url`
   计算相对资源路径，结构不能变）。
2. host 半片：`lib/index.js` 分别调用两者的 `apply(ctx)`，不做任何改写。
3. client 半片：`scripts/build-client.mjs` 用假的 `window.__ModuleLoader__` 执行上游
   client bundle，序列化其 `factory` 后内联进本包的 `client.js`；运行这些 `factory` 时传入
   受限 ctx，只过滤掉它们对 `sidebar.panellist` 的注册（侧栏只保留「创作台」一行），
   其余能力原样透传。
4. 品牌归一（v0.2.1）：界面与提示词里的上游名称/logo/版本号换成「创作台」。
   - client 半片：`scripts/build-client.mjs` 的 `BRAND_PATCHES` 在序列化后的 factory 字符串上
     重写品牌字符串（「自媒体工作台 / Media Desk / 歸藏设计 / Guizang Design」→ 创作台品牌）；
   - 展示库页面：`vendor/guizang-design/gallery/` 的 `brand.svg`（新 logo）、`index.html`、
     `i18n.js`、`style.css`（隐藏卡片下方的 `/guizang-*` 命令行）；
   - host 文案：`vendor/media-desk/src/{ai,en,export,learn,seed}.js`、
     `vendor/guizang-design/lib/{tools,skills,voice,library}.js`。
5. 数据目录：设计侧的作品库 / 语气档案改为 `$DSH_HOME/creative-studio`
   （由 `vendor/guizang-design/lib/library.js` 的 `dataDir()` 决定；本机做此改名时尚无旧数据）。
   内容创作侧数据仍在 `$DSH_HOME/media-desk`，迁移后已有的灵感、内容、排期继续可用。
6. 上游 skill 的真实 id（`guizang-ppt-skill` 等）保持不变：它们与各 `SKILL.md` 的
   frontmatter 绑定，改名会破坏 skill 调用；界面不再显示这些 id。
7. Logo 编辑器（v0.3.0）：页面与资源拷进 `vendor/pixel-logo-lab/`，Python `server.py`
   的静态服务与 JSON API 复刻为 `lib/pixel-logo.js`（前缀 `/pixel-logo`），
   数据放在 `$DSH_HOME/pixel-logo-lab/`。
8. 设计元素（v0.5.0）：threeui-demo 的构建产物拷进 `vendor/threeui/`，新增
   `lib/elements.js` 提供 `/studio-elements/*` 静态路由（路径守卫、SPA 回退、哈希资源长缓存），
   client 半片加第四个 tab 与 `ELEMENTS_THEME_CSS`（浅色外壳覆盖，组件舞台保持深底）。
9. 中文回归（v0.4.2）：media-desk 面板里残留的英文界面文案（日历月份、风格页「导出为 Skill」、
   设置语言 chip「English」）由 `scripts/build-client.mjs` 的 `BRAND_PATCHES['media-desk']`
   在序列化后重写（vendor 源码不动）；设计页 `i18n.js` 的 zh 词条把「skill」改为「技能」。
   品牌、格式名、API 路径、作品数据保持原样。
9. 除上述改动外，未修改上游的运行逻辑。

## 上游升级

覆盖 `vendor/<name>/` 为新版本（保留上游 `package.json`），执行 `npm run build:client`
重新生成 `client.js`，再跑 `node verification/verify-ui.mjs`。

Logo 编辑器没有上游包：`vendor/pixel-logo-lab/` 就是当前源码；如果要回到更早的版本，
从归档 `/root/workspace/plugins/_backup/pixel-logo-lab-20261118.tgz` 里取页面与母版，
并同步 `lib/pixel-logo.js` 里对应的接口变化。
