/* GENERATED FILE — do not edit. 修改 src/client.js 后运行 `npm run build:client`。 */
/* dsh-creative-studio · client 半片（源码）
 *
 * 本文件是手写源码；仓库根目录的 client.js 由 `npm run build:client` 生成：
 *   src/client.js + vendor/media-desk/dist/client.js + vendor/guizang-design/lib/client.js
 * 生成的 client.js 不要手改。
 *
 * 外壳设计（v0.6）：
 *   · 侧栏只注册一条「创作台」（order 6，排在知识库(3)/华尔街之狼(5) 之后、Automation tasks(10) 之前）。
 *   · 主面板 = 左侧导航（内容 / 设计 / 素材 / Logo 四个工作台 + 各自的子视图）
 *     + 页面标题区 + 内容区。
 *   · 四个工作台仍然是原来的四个 UI：内容创作来自 vendor media-desk，设计来自
 *     vendor guizang-design（StudioPanel iframe），素材来自 /studio-elements（threeui），
 *     Logo 来自 /pixel-logo。子视图切换靠模拟点击它们内部导航完成，外壳不复制实现。
 *   · 两个 vendor client 由本文件在 apply 时以「受限 ctx」调用：它们的
 *     sidebar.panellist 注册被丢弃（否则会出现多条侧栏行），main / betterSidebar /
 *     theme / locale / uiWorkspace 全部保留，宿主代码与 UI 行为不变。
 */
window.__ModuleLoader__.load({
  id: 'dsh-creative-studio',
  factory: function (require) {
    'use strict';

    var module = { exports: {} };
    var exports = module.exports;
    var React = require('react');
    var h = React.createElement;

    var PANEL_ID = 'creative-studio';
    var PANEL_ORDER = 6;

    var LS_NAV = 'dsh-creative-studio:nav';
    var LS_ASSISTANT = 'dsh-creative-studio:assistant';
    var LS_PREVIEW = 'dsh-creative-studio:logo-preview';

    /* 四个工作台 = 四条主面板。tab 是 main 槽 / iframe 的键，沿用旧值，避免动 vendor。 */
    var WORKSPACES = [
      {
        id: 'content',
        tab: 'media-desk',
        title: '内容',
        desc: '从一句灵感到一篇成稿，都在这里',
        icon: 'bulb',
        kind: 'react',
        views: [
          { id: 'inspiration', title: '灵感', desc: '随手记一句，让 AI 帮你补全' },
          { id: 'content', title: '内容', desc: '成稿、配图与发布前检查' },
          { id: 'schedule', title: '排期', desc: '按天安排，发布不撞车' },
          { id: 'review', title: '复盘', desc: '数据和反馈，决定下一批选题' },
          { id: 'style', title: '风格', desc: '声音、语气与写作标准' },
        ],
      },
      {
        id: 'design',
        tab: 'guizang-design',
        title: '设计',
        desc: '网页 PPT、图文卡片、网页排版、去 AI 味',
        icon: 'pen',
        kind: 'component',
        views: [
          { id: 'home', title: '概览', desc: '一套设计做所有内容：四个技能入口与最近作品' },
          { id: 'works', title: '我的作品', desc: '登记过的成品，可以复用、做同款或交给内容创作' },
          { id: 'workflows', title: '工作流', desc: '跨技能组合的内容生产流程' },
          { id: 'voice', title: '语气档案', desc: '从你的文章和修改里学习写作习惯' },
          { id: 'examples', title: '官方示例', desc: '官方整理的可参考案例' },
        ],
      },
      {
        id: 'elements',
        tab: 'studio-elements',
        title: '素材',
        desc: '103 个可复用组件：场景、背景、控件与按钮',
        icon: 'grid',
        kind: 'iframe',
        src: '/studio-elements/',
        // 宿主路由只在 DSH 启动时注册；还没重启过就先别把 404 页面塞进 iframe
        probe: '/studio-elements/',
        views: [
          { id: '全部', title: '全部', desc: '103 个可复用组件，按类型筛选或直接搜索' },
          { id: 'UI 控件', title: '控件', desc: '输入、开关、面板等界面控件' },
          { id: '按钮', title: '按钮', desc: '带材质与动效的按钮' },
          { id: 'CTA', title: 'CTA', desc: '引导点击的卡片与行动区' },
          { id: '落地页', title: '落地页', desc: '完整的单页示例' },
          { id: '场景', title: '场景', desc: '书架、画廊等空间场景' },
          { id: '背景/场', title: '背景', desc: '粒子、流体、网格等背景场' },
          { id: '文字', title: '文字', desc: '标题、字标与滚动文字' },
          { id: '研究', title: '研究', desc: '材质、布料、球体等视觉实验' },
          { id: '集合', title: '集合', desc: '成组出现的组件合集' },
          { id: '其他', title: '其他', desc: '还没归类的组件' },
        ],
      },
      {
        id: 'logo',
        tab: 'pixel-logo',
        title: 'Logo',
        desc: '像素 / 矢量标识编辑器 · 改动自动保存到本机，保存版本可回滚',
        icon: 'pixel',
        kind: 'iframe',
        src: '/pixel-logo/',
        views: [{ id: 'editor', title: 'Logo', desc: '像素 / 矢量标识编辑器 · 改动自动保存到本机，保存版本可回滚' }],
      },
    ];

    var CONTEXT = null;
    var PANE_REFS = {};
    var CURRENT_VIEW = {};
    var VIEW_TOKENS = {};
    var SYNC_VIEW = null; // 由页面组件注册：iframe 内部导航变化时回写外壳状态

    var ASSISTANT_DEFAULT = 'closed';
    var VIEW_LABEL = {
      inspiration: '灵感',
      content: '内容',
      schedule: '排期',
      review: '复盘',
      style: '风格',
    };

    /* ---- vendor factory 已外置，见 vendor/media-desk/assets/vendor-factories.js ---- */

    /* ---------------------------------------------------------------- 样式 */

    // 创作台浅色规范（v2）。所有工作台共用一套 token：
    //   bg/surface/raised   #f5f5f3 / #fbfbf9 / #ffffff
    //   line 三档            #e3e3df / #ededeb / #cdcdc7
    //   ink 三档             #141414 / #4d4d49 / #787874
    //   accent               #1f7a68（交互/选中），主按钮用墨黑 #141414
    //   圆角                  控件 8px、卡片 12px、面板 16px
    //   字体                  Inter + Noto Sans SC；等宽 JetBrains Mono
    var STYLE_TEXT = [
      '.dsh-cs-root{',
      '--cs-bg:#f5f5f3;--cs-surface:#fbfbf9;--cs-raised:#ffffff;',
      '--cs-line:#e3e3df;--cs-line-subtle:#ededeb;--cs-line-strong:#cdcdc7;',
      '--cs-ink:#141414;--cs-ink-2:#4d4d49;--cs-ink-3:#787874;--cs-ink-4:#9a9a96;',
      '--cs-accent:#1f7a68;--cs-accent-soft:rgba(31,122,104,.10);',
      '--cs-hover:rgba(20,20,20,.05);--cs-active:rgba(20,20,20,.09);',
      '--cs-font:"Inter","Noto Sans SC",-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif;',
      '--cs-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;',
      '--cs-r-sm:8px;--cs-r-md:12px;--cs-r-lg:16px;',
      '--dsw-alias-bg-base:#fbfbf9;--dsw-alias-bg-layer-2:#ffffff;',
      '--dsw-alias-label-primary:#141414;--dsw-alias-label-secondary:#4d4d49;',
      '--dsw-alias-label-tertiary:#787874;--dsw-alias-label-caption:#9a9a96;',
      '--dsw-alias-label-primary-inverted:#fbfbf9;',
      '--dsw-alias-button-primary-fill:#141414;--dsw-alias-button-primary-hover:#2d2d29;',
      '--dsw-alias-border-l2:#e3e3df;--dsw-alias-border-l4:#cdcdc7;',
      '--dsw-alias-interactive-bg-hover:rgba(20,20,20,.05);',
      '--dsw-alias-interactive-bg-active:rgba(20,20,20,.09);',
      '--dsw-alias-link:#1f7a68;',
      '--dsw-font-family:var(--cs-font);',
      '--dsw-radius-xs:4px;--dsw-radius-sm:8px;--dsw-radius-md:12px;',
      '--dsw-radius-lg:16px;--dsw-radius-xl:20px;--dsw-radius-panel:16px;',
      'position:relative;display:flex;width:100%;height:100%;min-height:0;overflow:hidden;',
      'background:var(--cs-bg);color:var(--cs-ink);font-family:var(--cs-font);font-size:14px;line-height:22px;',
      '-webkit-font-smoothing:antialiased}',

      /* ---------------- 左栏 ---------------- */
      '.dsh-cs-nav{flex:none;display:flex;flex-direction:column;width:232px;min-height:0;',
      'border-right:1px solid var(--cs-line);background:var(--cs-surface)}',
      '.dsh-cs-brand{flex:none;display:flex;align-items:center;gap:8px;height:56px;padding:0 16px;',
      'border-bottom:1px solid var(--cs-line-subtle);color:var(--cs-ink)}',
      '.dsh-cs-brand svg{opacity:.9}',
      '.dsh-cs-brand strong{font-size:13.5px;font-weight:600;letter-spacing:.01em;white-space:nowrap}',
      '.dsh-cs-brand-sub{font-family:var(--cs-mono);font-size:10px;letter-spacing:.08em;color:var(--cs-ink-4);',
      'text-transform:uppercase;white-space:nowrap}',
      '.dsh-cs-navlist{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:10px 8px 16px}',
      '.dsh-cs-ws{margin-bottom:2px}',
      '.dsh-cs-wsbtn{display:flex;align-items:center;gap:9px;width:100%;height:36px;padding:0 9px;',
      'border:0;border-radius:var(--cs-r-sm);background:transparent;color:var(--cs-ink-2);',
      'font:inherit;font-size:13px;line-height:1;cursor:pointer;text-align:left}',
      '.dsh-cs-wsbtn:hover{background:var(--cs-hover);color:var(--cs-ink)}',
      '.dsh-cs-wsbtn:focus-visible{outline:2px solid var(--cs-accent);outline-offset:-1px}',
      '.dsh-cs-wsbtn svg{flex:none;opacity:.85}',
      '.dsh-cs-wsbtn .dsh-cs-ws-label{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsh-cs-ws[data-open="true"]>.dsh-cs-wsbtn{color:var(--cs-ink);font-weight:600}',
      '.dsh-cs-chev{flex:none;transition:transform .16s ease;opacity:.5}',
      '.dsh-cs-ws[data-open="true"] .dsh-cs-chev{transform:rotate(90deg)}',
      '.dsh-cs-ws.is-single .dsh-cs-chev{display:none}',
      '.dsh-cs-views{display:none;padding:2px 0 6px 12px}',
      '.dsh-cs-ws[data-open="true"] .dsh-cs-views{display:block}',
      '.dsh-cs-view{position:relative;display:flex;align-items:center;width:100%;height:30px;padding:0 10px 0 20px;',
      'border:0;border-radius:6px;background:transparent;color:var(--cs-ink-3);font:inherit;font-size:12.5px;',
      'line-height:1;cursor:pointer;text-align:left;white-space:nowrap}',
      '.dsh-cs-view:hover{background:var(--cs-hover);color:var(--cs-ink)}',
      '.dsh-cs-view:focus-visible{outline:2px solid var(--cs-accent);outline-offset:-1px}',
      '.dsh-cs-view[aria-current="page"]{background:var(--cs-active);color:var(--cs-ink);font-weight:500}',
      '.dsh-cs-view[aria-current="page"]::before{content:"";position:absolute;left:8px;top:50%;width:4px;height:4px;',
      'margin-top:-2px;border-radius:50%;background:var(--cs-accent)}',
      '.dsh-cs-root[data-cs-shell="drawer"] .dsh-cs-nav{padding-left:48px}',
      '.dsh-cs-navfoot{flex:none;padding:10px 10px 12px;border-top:1px solid var(--cs-line-subtle)}',
      '.dsh-cs-navfoot .dsh-cs-ghost{width:100%;justify-content:flex-start}',

      /* ---------------- 主区 ---------------- */
      '.dsh-cs-main{flex:1 1 auto;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden}',
      '.dsh-cs-head{flex:none;display:flex;align-items:flex-start;gap:12px;padding:14px 20px 13px;',
      'border-bottom:1px solid var(--cs-line);background:var(--cs-bg)}',
      '.dsh-cs-titleblock{min-width:0;flex:1 1 auto}',
      '.dsh-cs-crumb{display:block;margin-bottom:3px;font-family:var(--cs-mono);font-size:10.5px;line-height:14px;',
      'letter-spacing:.08em;text-transform:uppercase;color:var(--cs-ink-4)}',
      '.dsh-cs-title{margin:0;font-size:17px;line-height:24px;font-weight:600;letter-spacing:-.01em;color:var(--cs-ink)}',
      '.dsh-cs-desc{margin:2px 0 0;font-size:12.5px;line-height:18px;color:var(--cs-ink-3);',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsh-cs-actions{flex:none;display:flex;align-items:center;gap:8px;padding-top:2px;position:relative}',
      '.dsh-cs-btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 11px;',
      'border:1px solid var(--cs-line);border-radius:var(--cs-r-sm);background:var(--cs-raised);',
      'color:var(--cs-ink-2);font:inherit;font-size:12.5px;line-height:1;cursor:pointer;white-space:nowrap}',
      '.dsh-cs-btn:hover{background:#f2f2ee;border-color:var(--cs-line-strong);color:var(--cs-ink)}',
      '.dsh-cs-btn:focus-visible{outline:2px solid var(--cs-accent);outline-offset:1px}',
      '.dsh-cs-btn[aria-pressed="true"]{border-color:var(--cs-accent);background:var(--cs-accent-soft);color:#155e51}',
      '.dsh-cs-btn.is-primary{border-color:#141414;background:#141414;color:#fbfbf9}',
      '.dsh-cs-btn.is-primary:hover{background:#2d2d29;border-color:#2d2d29;color:#fbfbf9}',
      '.dsh-cs-btn.is-icon{width:32px;padding:0;justify-content:center}',
      '.dsh-cs-search{display:flex;align-items:center;gap:6px;height:32px;padding:0 9px;max-width:300px;',
      'border:1px solid var(--cs-line);border-radius:var(--cs-r-sm);background:var(--cs-raised);color:var(--cs-ink-3)}',
      '.dsh-cs-search:focus-within{border-color:var(--cs-accent)}',
      '.dsh-cs-search input{width:150px;border:0;background:transparent;color:var(--cs-ink);font:inherit;',
      'font-size:12.5px;line-height:1;outline:none}',
      '.dsh-cs-search input::placeholder{color:var(--cs-ink-4)}',
      '.dsh-cs-body{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;background:var(--cs-bg)}',
      '.dsh-cs-pane{position:absolute;inset:0;min-height:0;overflow:hidden;background:var(--cs-bg)}',
      '.dsh-cs-pane[hidden]{display:none}',
      '.dsh-cs-frame{display:block;width:100%;height:100%;border:0;background:var(--cs-bg)}',
      '.dsh-cs-empty{display:flex;align-items:center;justify-content:center;height:100%;padding:24px;',
      'font-size:13px;line-height:20px;color:var(--cs-ink-3);text-align:center}',
      '.dsh-cs-error{margin:16px;padding:14px 16px;border:1px solid var(--cs-line);border-radius:var(--cs-r-md);',
      'background:var(--cs-raised);color:var(--cs-ink);font-size:13px;line-height:20px;white-space:pre-wrap}',
      '.dsh-cs-error strong{display:block;margin-bottom:4px}',

      /* ---------------- 新建菜单 ---------------- */
      '.dsh-cs-menu{position:absolute;right:0;top:40px;z-index:60;width:252px;padding:6px;',
      'border:1px solid var(--cs-line);border-radius:var(--cs-r-md);background:var(--cs-raised);',
      'box-shadow:0 12px 32px rgba(20,20,20,.14)}',
      '.dsh-cs-menu-item{display:flex;align-items:flex-start;gap:10px;width:100%;padding:8px 10px;border:0;',
      'border-radius:6px;background:transparent;color:var(--cs-ink);font:inherit;text-align:left;cursor:pointer}',
      '.dsh-cs-menu-item:hover,.dsh-cs-menu-item:focus-visible{background:var(--cs-hover);outline:none}',
      '.dsh-cs-menu-item svg{flex:none;margin-top:2px;opacity:.7}',
      '.dsh-cs-menu-text{min-width:0}',
      '.dsh-cs-menu-text b{display:block;font-size:13px;font-weight:500;line-height:18px}',
      '.dsh-cs-menu-text span{display:block;font-size:11.5px;line-height:16px;color:var(--cs-ink-3)}',
      '.dsh-cs-menu-sep{height:1px;margin:4px 6px;background:var(--cs-line-subtle)}',

      /* ---------------- 骨架屏 ---------------- */
      '.dsh-cs-skel{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;gap:12px;padding:28px 32px;',
      'background:var(--cs-bg)}',
      '.dsh-cs-skel-bar{height:12px;border-radius:6px;',
      'background:linear-gradient(100deg,#ecece8 30%,#f7f7f4 50%,#ecece8 70%);background-size:220% 100%;',
      'animation:dsh-cs-shimmer 1.4s ease-in-out infinite}',
      '.dsh-cs-skel-card{height:120px;border-radius:var(--cs-r-md);',
      'background:linear-gradient(100deg,#f0f0ec 30%,#fafaf7 50%,#f0f0ec 70%);background-size:220% 100%;',
      'animation:dsh-cs-shimmer 1.4s ease-in-out infinite}',
      '@keyframes dsh-cs-shimmer{from{background-position:120% 0}to{background-position:-20% 0}}',

      /* ---------------- 跨 tab 带入 ---------------- */
      '.dsh-cs-handoff{flex:none;display:flex;align-items:center;gap:10px;padding:8px 20px;',
      'border-bottom:1px solid var(--cs-line);background:var(--cs-accent-soft);color:#155e51;font-size:12.5px}',
      '.dsh-cs-handoff strong{font-weight:600}',
      '.dsh-cs-handoff .dsh-cs-spacer{flex:1 1 auto}',
      '.dsh-cs-handoff button{flex:none}',

      /* ---------------- 助手收起时的浮起入口 ---------------- */
      '.dsh-cs-fab{position:absolute;right:112px;bottom:18px;z-index:20;display:inline-flex;align-items:center;gap:7px;',
      'height:40px;padding:0 14px;border:1px solid var(--cs-line);border-radius:999px;background:var(--cs-raised);',
      'color:var(--cs-ink);font:inherit;font-size:12.5px;cursor:pointer;',
      'box-shadow:0 6px 20px rgba(20,20,20,.12)}',
      '.dsh-cs-fab:hover{border-color:var(--cs-line-strong);background:#f7f7f4}',
      '.dsh-cs-fab:focus-visible{outline:2px solid var(--cs-accent);outline-offset:2px}',
      '.dsh-cs-fab svg{opacity:.8}',

      /* ---------------- 助手默认收起：媒体工作台 dock ---------------- */
      '.dsh-cs-root[data-assistant="closed"] .dsh-cs-pane[data-pane="media-desk"] .md-dock{display:none}',
      '.dsh-cs-root[data-assistant="closed"] .dsh-cs-pane[data-pane="media-desk"] .md-nav{display:none}',
      '.dsh-cs-pane[data-pane="media-desk"] [data-dsh-cs-hidden]{display:none!important}',
      '.dsh-cs-pane[data-pane="media-desk"] .md-topbar{display:none!important}',
      '.dsh-cs-pane[data-pane="media-desk"] .md-main{padding-top:0}',

      /* ---------------- 移动端：左栏变顶部工作台条，子视图变第二行 ---------------- */
      '.dsh-cs-subnav{display:none}',
      '@media (max-width: 860px){',
      '.dsh-cs-root{flex-direction:column}',
      '.dsh-cs-nav{width:auto;flex-direction:row;align-items:center;border-right:0;padding-left:48px;',
      'border-bottom:1px solid var(--cs-line)}',
      '.dsh-cs-brand{display:none}',
      '.dsh-cs-brand strong{font-size:13px}',
      '.dsh-cs-brand-sub{display:none}',
      '.dsh-cs-navlist{display:flex;flex:1 1 auto;align-items:center;gap:2px;padding:4px 8px;overflow-x:auto;overflow-y:hidden}',
      '.dsh-cs-ws{flex:none;margin:0}',
      '.dsh-cs-wsbtn{height:36px;padding:0 10px;font-size:13px}',
      '.dsh-cs-chev{display:none}',
      '.dsh-cs-views{display:none!important}',
      '.dsh-cs-navfoot{display:none}',
      '.dsh-cs-head{flex-wrap:wrap;padding:12px 14px 10px;gap:10px}',
      '.dsh-cs-title{font-size:16px;line-height:22px}',
      '.dsh-cs-desc{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.dsh-cs-actions{padding-top:0}',
      '.dsh-cs-search input{width:104px}',
      '.dsh-cs-subnav{display:flex;flex:none;gap:4px;padding:6px 12px;overflow-x:auto;',
      'border-bottom:1px solid var(--cs-line);background:var(--cs-surface)}',
      '.dsh-cs-subnav .dsh-cs-view{width:auto;flex:none;height:44px;padding:0 12px;border:1px solid transparent;border-radius:999px}',
      '.dsh-cs-nav .dsh-cs-wsbtn{height:44px}',
      '.dsh-cs-subnav .dsh-cs-view[aria-current="page"]{background:var(--cs-raised);border-color:var(--cs-line);',
      'box-shadow:0 1px 2px rgba(20,20,20,.06)}',
      '.dsh-cs-subnav .dsh-cs-view[aria-current="page"]::before{display:none}',
      '.dsh-cs-handoff{padding:8px 14px;flex-wrap:wrap}',
      '.dsh-cs-menu{position:fixed;right:12px;top:96px;width:calc(100vw - 24px);max-width:300px}',
      '.dsh-cs-fab{right:12px;bottom:88px}',
      '}',
      '@media (max-width: 520px){',
      '.dsh-cs-brand span{display:none}',
      '.dsh-cs-search{display:none}',
      '.dsh-cs-actions .dsh-cs-btn span{display:none}',
      '.dsh-cs-actions .dsh-cs-btn{width:32px;padding:0;justify-content:center}',
      '.dsh-cs-actions .dsh-cs-btn.is-primary{width:auto;padding:0 10px}',
      '.dsh-cs-actions .dsh-cs-btn.is-primary span{display:inline}',
      '}',
    ].join('');

    // 设计页（/guizang-design/ iframe）的浅色覆盖 + 嵌入模式。
    // 嵌入模式：隐藏它自带的左 rail / 品牌 / 页脚版本号，子导航由创作台外壳提供；
    // 概览页保留它的大标题（是内容），其它页的 head 与外壳标题重复，隐藏。
    var DESIGN_THEME_CSS = [
      'html[data-cs-studio]{color-scheme:light;',
      '--paper:#fbfbf9;--paper-2:#ffffff;--grey-1:#f5f5f3;--grey-2:#e3e3df;--grey-3:#ededeb;',
      '--ink:#141414;--text-primary:#141414;--text-body:#2a2a27;--text-secondary:#4d4d49;',
      '--text-helper:#787874;--text-placeholder:#a3a3a0;',
      '--line:#e3e3df;--line-strong:#cdcdc7;--line-subtle:#ededeb;--accent:#1f7a68;',
      '--font-sans:"Inter","Noto Sans SC",-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif;',
      '--font-display:var(--font-sans);',
      '--font-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace}',
      'html[data-cs-studio] body{background:var(--grey-1);color:var(--text-body);font-family:var(--font-sans)}',
      'html[data-cs-studio] .rail,html[data-cs-studio] .panel,html[data-cs-studio] .column,',
      'html[data-cs-studio] .flow,html[data-cs-studio] .table,html[data-cs-studio] .empty,',
      'html[data-cs-studio] .viewer,html[data-cs-studio] .toast{border-radius:12px}',
      'html[data-cs-studio] .banner,html[data-cs-studio] .work{border-radius:12px}',
      'html[data-cs-studio] .stats{border-radius:12px;overflow:hidden}',
      'html[data-cs-studio] .nav a,html[data-cs-studio] .nav a.on{border-radius:8px}',
      'html[data-cs-embed] .pill[aria-pressed="true"]{border-color:var(--accent);background:rgba(31,122,104,.10);color:#155e51}',
      'html[data-cs-studio] .nav-count{border-radius:999px}',
      'html[data-cs-studio] .thumb,html[data-cs-studio] .work-open{border-radius:8px}',
      'html[data-cs-studio] .btn,html[data-cs-studio] .ibtn,html[data-cs-studio] .pill,',
      'html[data-cs-studio] .state,html[data-cs-studio] .search,html[data-cs-studio] .search input{border-radius:8px}',
      'html[data-cs-studio] .stat{border-radius:12px}',
      'html[data-cs-studio] .eyebrow,html[data-cs-studio] .sec-head,html[data-cs-studio] .rail-foot{',
      'font-family:var(--font-mono);letter-spacing:.04em}',
      // —— 嵌入模式 ——
      'html[data-cs-embed] .shell{display:block;min-height:100vh}',
      'html[data-cs-embed] .rail{display:none!important}',
      'html[data-cs-embed] .main{max-width:none;padding:28px 36px 64px}',
      'html[data-cs-embed] .head .eyebrow{display:none}',
      'html[data-cs-embed] .head h1{font-size:2.2rem;margin-top:0}',
      'html[data-cs-embed] .head{margin-bottom:28px}',
      'html[data-cs-embed][data-cs-view]:not([data-cs-view="home"]) .head{display:none}',
      'html[data-cs-embed] .stats{margin-top:4px}',
      'html[data-cs-embed] .stat{cursor:pointer;text-decoration:none;color:inherit}',
      'html[data-cs-embed] .stat:hover{background:var(--paper-2)}',
      'html[data-cs-embed] .stat::after{content:"↗";position:absolute;top:12px;right:14px;font-size:12px;color:var(--text-helper,#787874);opacity:0;transition:opacity .15s ease}',
      'html[data-cs-embed] .stat:hover::after{opacity:1}',
      // 空态 CTA 与「用于内容」按钮
      'html[data-cs-studio] .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:32px 24px;text-align:center}',
      'html[data-cs-studio] .empty .empty-cta{display:inline-flex;gap:8px;align-items:center;margin-top:2px}',
      'html[data-cs-studio] .work-foot{gap:6px}',
      'html[data-cs-studio] .work-foot .btn.ghost{color:var(--text-secondary)}',
      // 概览页统计可点：0 值弱化，避免“空数据大数字”
      'html[data-cs-embed] .stat .val{font-variant-numeric:tabular-nums}',
    ].join('');

    // Logo 编辑器（/pixel-logo/ iframe）的浅色外壳覆盖 + 嵌入模式。
    // 画布与预览 canvas 里的深底来自作品数据（project.background），属于内容，保留原样。
    var LOGO_THEME_CSS = [
      'html[data-cs-studio]{color-scheme:light;',
      '--bg:#f5f5f3;--panel:#fbfbf9;--panel-raised:#ffffff;',
      '--line:#e3e3df;--line-strong:#cdcdc7;--line-subtle:#ededeb;',
      '--text:#141414;--muted:#787874;',
      '--accent:#1f7a68;--accent-ink:#ffffff;--danger:#b4342b;',
      '--checker-a:#f7f7f4;--checker-b:#e3e3df;--radius:8px;',
      '--font-sans:"Inter","Noto Sans SC",-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif;',
      '--font-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace}',
      'html[data-cs-studio] html,html[data-cs-studio] body{background:var(--bg);color:var(--text);font-family:var(--font-sans)}',
      'html[data-cs-studio] button{background:var(--panel-raised);border-color:var(--line);color:var(--text)}',
      'html[data-cs-studio] button:hover:not(:disabled){background:#f2f2ee;border-color:var(--line-strong)}',
      'html[data-cs-studio] button:focus-visible,html[data-cs-studio] input:focus-visible,',
      'html[data-cs-studio] select:focus-visible{outline-color:var(--accent)}',
      'html[data-cs-studio] input,html[data-cs-studio] select{background:var(--panel-raised);color:var(--text);border-color:var(--line)}',
      'html[data-cs-studio] .topbar{background:var(--panel);border-bottom-color:var(--line)}',
      'html[data-cs-studio] .brand-mark{background:#141414;color:#fbfbf9;border-color:#141414;border-radius:10px}',
      'html[data-cs-studio] h1{color:var(--text)}',
      'html[data-cs-studio] h2{color:var(--muted);font-family:var(--font-mono);font-size:11px;letter-spacing:.06em}',
      'html[data-cs-studio] .preset-switcher{background:#f0f0ec;border-color:var(--line)}',
      'html[data-cs-studio] .preset-switcher button.active{background:#141414;color:#fbfbf9}',
      'html[data-cs-studio] .primary-button{background:#141414;border-color:#141414;color:#fbfbf9}',
      'html[data-cs-studio] .primary-button:hover:not(:disabled){background:#2d2d29;border-color:#2d2d29}',
      'html[data-cs-studio] .save-state.saving{color:#a05a10}',
      'html[data-cs-studio] .save-state.error{color:var(--danger)}',
      'html[data-cs-studio] .sidebar{background:var(--panel)}',
      'html[data-cs-studio] .layer-item:hover{background:#f2f2ee}',
      'html[data-cs-studio] .layer-item.active{border-color:var(--accent);background:var(--accent-soft)}',
      'html[data-cs-studio] .tool-button.active,html[data-cs-studio] .segmented-control button.active{',
      'border-color:var(--accent);background:var(--accent-soft);color:#155e51}',
      'html[data-cs-studio] .segmented-control{background:#f0f0ec;border-color:var(--line)}',
      'html[data-cs-studio] .workspace{background:#efefec}',
      'html[data-cs-studio] .workspace-toolbar,html[data-cs-studio] .workspace-status{',
      'background:#f7f7f4;border-color:var(--line)}',
      'html[data-cs-studio] .canvas-viewport{background-color:#e9e9e5;',
      'background-image:linear-gradient(#dededa 1px,transparent 1px),',
      'linear-gradient(90deg,#dededa 1px,transparent 1px)}',
      'html[data-cs-studio] #editorCanvas{border-color:#d6d6d0;box-shadow:0 12px 32px rgba(20,20,20,.14)}',
      'html[data-cs-studio] .preview-frame{border-color:var(--line)}',
      'html[data-cs-studio] .size-previews canvas{border-color:var(--line)}',
      'html[data-cs-studio] .warning-copy{color:#a05a10}',
      'html[data-cs-studio] .version-item{border-color:var(--line)}',
      'html[data-cs-studio] dialog{background:var(--panel-raised);color:var(--text);border-color:var(--line-strong)}',
      'html[data-cs-studio] dialog::backdrop{background:rgba(20,20,20,.32)}',
      'html[data-cs-studio] .toast{background:#141414;color:#fbfbf9;border-color:#141414}',
      // —— 嵌入模式：外壳已显示标题，隐藏 vendor 顶栏里的品牌块；顶栏只当工具栏用 ——
      'html[data-cs-embed] .topbar{display:flex;justify-content:space-between;align-items:center;height:auto;min-height:60px;gap:12px}',
      'html[data-cs-embed] .brand-block{display:none}',
      'html[data-cs-embed] .topbar{padding:10px 18px}',
      'html[data-cs-embed] .project-control{min-width:0;flex:1 1 auto;justify-content:flex-start}',
      'html[data-cs-embed] .project-control{margin-left:0}',
      'html[data-cs-embed] .command-bar{margin-left:auto}',
      // 右栏改成浮在画布右侧的预览抽屉：宽度够时不再把画布挤窄，窄屏也能用。
      // vendor 在 ≤1080 / ≤720px 会把三栏改成换行、单列堆叠（工具面板被挤到画布下面，
      // 看起来像「Logo 编辑器显示不全」）。嵌入模式下强制保持「工具栏 + 画布」两栏，
      // 工具栏窄一点但始终可见；预览仍是浮层抽屉。
      'html[data-cs-embed] .app-shell{position:relative;display:grid!important;',
      'height:calc(100vh - 60px)!important;min-height:0!important;',
      'grid-template-columns:220px minmax(0,1fr)!important}',
      'html[data-cs-embed] .left-sidebar{display:block!important;height:100%;min-height:0;overflow-y:auto}',
      // 窄窗时工具栏按钮不换行会被裁掉（「适配」「网格」看不全），允许换到下一行
      'html[data-cs-embed] .workspace-toolbar{flex-wrap:wrap;row-gap:6px;height:auto!important;min-height:48px;padding:6px 12px}',
      'html[data-cs-embed] .workspace-status{flex-wrap:wrap;row-gap:4px;height:auto!important;min-height:28px}',
      'html[data-cs-embed] .workspace{min-height:0!important;order:0!important}',
      '@media (max-width:560px){html[data-cs-embed] .app-shell{grid-template-columns:180px minmax(0,1fr)!important}}',
      'html[data-cs-embed] .right-sidebar{position:absolute;top:0;right:0;bottom:0;width:320px;z-index:30;',
      'display:flex;flex-direction:column;gap:0;padding:12px 14px 110px;overflow:auto;',
      'border-left:1px solid var(--line);background:var(--panel);box-shadow:-12px 0 32px rgba(20,20,20,.10)}',
      'html[data-cs-preview="off"] .right-sidebar{display:none!important}',
    ].join('');

    // 素材（/studio-elements/ iframe）的浅色外壳覆盖 + 嵌入模式。
    // 组件库原本是深色画廊；这里侧栏/顶栏/卡片/按钮换成创作台浅色规范，
    // 组件舞台（.cell .boxx、.focus-frame）保持深底——那是 WebGL 演示的画布，属于内容。
    var ELEMENTS_THEME_CSS = [
      'html[data-cs-studio]{color-scheme:light;',
      '--bg:#f5f5f3;--panel:#fbfbf9;--panel-2:#ffffff;--line:#e3e3df;',
      '--text:#141414;--muted:#787874;--accent:#1f7a68;--accent-2:#1f7a68;--radius:8px;',
      'background:#f5f5f3;color:#141414;',
      'font-family:"Inter","Noto Sans SC",-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif}',
      'html[data-cs-studio] .sidebar{border-right-color:#e3e3df;background:#fbfbf9}',
      'html[data-cs-studio] .search input{border-color:#e3e3df;background:#ffffff;color:#141414}',
      'html[data-cs-studio] .search input:focus{border-color:#1f7a68}',
      'html[data-cs-studio] .cats button:hover{border-color:#cdcdc7;color:#141414}',
      'html[data-cs-studio] .cats button.on{background:rgba(31,122,104,.10);border-color:#1f7a68;color:#1f7a68}',
      'html[data-cs-studio] .list button:hover{background:#f0f0ed;color:#141414}',
      'html[data-cs-studio] .list button.on{background:rgba(31,122,104,.10);color:#1f7a68}',
      'html[data-cs-studio] .list .idx{color:#9a9a96}',
      'html[data-cs-studio] .topbar{background:#fbfbf9;border-bottom-color:#e3e3df}',
      'html[data-cs-studio] .mode button{border-color:#e3e3df;color:#787874}',
      'html[data-cs-studio] .mode button:hover{color:#141414}',
      'html[data-cs-studio] .mode button.on{background:#141414;border-color:#141414;color:#fbfbf9}',
      'html[data-cs-studio] .budget input{border-color:#e3e3df;background:#ffffff;color:#141414}',
      'html[data-cs-studio] .cell{border-color:#e3e3df;background:#ffffff}',
      'html[data-cs-studio] .cell .bar{border-bottom-color:#e3e3df;color:#787874}',
      'html[data-cs-studio] .cell .bar .nm{color:#141414}',
      'html[data-cs-studio] .cell .bar button{border-color:#e3e3df;color:#787874}',
      'html[data-cs-studio] .cell .bar button:hover{color:#1f7a68;border-color:#1f7a68}',
      'html[data-cs-studio] .idle{background:#0d1014;color:#8b95a3}',
      'html[data-cs-studio] .idle:hover{color:#1f7a68;background:#101419}',
      'html[data-cs-studio] .idle .dot{border-color:#2a313a;border-top-color:#1f7a68}',
      // —— 嵌入模式：隐藏自带左索引与重复标题，网格由外壳页面宽度决定 ——
      'html[data-cs-embed] .app{grid-template-columns:minmax(0,1fr)}',
      'html[data-cs-embed] .sidebar{display:none!important}',
      'html[data-cs-embed] .main{width:100%}',
      'html[data-cs-embed] .topbar{padding:10px 20px;min-height:52px}',
      'html[data-cs-embed] .topbar h2,html[data-cs-embed] .topbar .meta{display:none}',
      'html[data-cs-embed] .budget{display:none}',
      'html[data-cs-embed] .mode{margin-left:auto}',
      'html[data-cs-embed] .stage{padding:18px 20px 28px}',
      'html[data-cs-embed] .grid{grid-template-columns:repeat(auto-fill,minmax(264px,1fr));gap:12px}',
      // 中文名：卡片标题是主标题，英文 API 名退到副行
      'html[data-cs-embed] .cell .bar{flex-wrap:wrap;row-gap:2px}',
      'html[data-cs-embed] .cell .bar .nm{font-weight:600;letter-spacing:.01em}',
      'html[data-cs-embed] .cell .bar .nm-en{flex-basis:100%;font-size:10.5px;color:#9a9a96;letter-spacing:.02em}',
      // 悬停操作：复制名称
      'html[data-cs-embed] .cell .bar .copy-name{opacity:0;transition:opacity .15s}',
      'html[data-cs-embed] .cell:hover .copy-name,html[data-cs-embed] .cell .copy-name:focus-visible{opacity:1}',
      // 深色预览容器：给白卡片里一个明确的舞台边界
      'html[data-cs-embed] .cell .boxx{background:#0d1014;border-top:1px solid #232a33}',
      '@media (max-width:860px){',
      'html[data-cs-embed] .grid{grid-template-columns:minmax(0,1fr)}',
      'html[data-cs-embed] .topbar{padding:8px 14px}',
      'html[data-cs-embed] .stage{padding:12px 12px 24px}',
      'html[data-cs-embed] .budget{display:none}',
      '}',
    ].join('');

    // 内容创作：右栏灵感卡居中 + 复盘/排期信息层次。
    // media-desk 是打包产物，这里只做展示层的覆盖，不改结构与交互。
    var MEDIA_EXTRA_CSS = [
      '.dsh-cs-pane .md-root .md-idea-card{text-align:center}',
      '.dsh-cs-pane .md-root .md-idea-card .md-idea-label{display:block;text-align:center}',
      '.dsh-cs-pane .md-root .md-idea-card .md-idea-text,',
      '.dsh-cs-pane .md-root .md-idea-card .md-idea-body{text-align:center}',
      '.dsh-cs-pane .md-root .md-idea-card .md-style-pick{justify-content:center}',
      '.dsh-cs-pane .md-root .md-idea-card .md-style-pick>span{flex:none;text-align:center}',
      '.dsh-cs-pane .md-root .md-idea-card .md-format-seg{flex:0 1 168px}',
      '.dsh-cs-pane .md-root .md-idea-card .md-style-pick select{flex:0 1 168px;text-align:center;text-align-last:center}',
      '.dsh-cs-pane .md-root .md-idea-card .md-go-row{justify-content:center}',
      '.dsh-cs-pane .md-root .md-idea-card .md-go-row .md-go{flex:0 0 auto;width:176px}',
      '.dsh-cs-pane .md-root .md-idea-card .md-idea-hint{text-align:center}',
      // 复盘：hero 去饱和、指标更大、示例数据标签更明确
      '.dsh-cs-pane .md-root .md-i-hero{background:var(--cs-raised);border-color:var(--cs-line)}',
      '.dsh-cs-pane .md-root .md-i-hero .md-i-line{letter-spacing:-.01em}',
      '.dsh-cs-pane .md-root .md-metrics .md-metric b{font-size:22px;line-height:28px;font-variant-numeric:tabular-nums}',
      '.dsh-cs-pane .md-root .md-i-sample{border:1px solid var(--cs-line);border-radius:999px;padding:2px 8px;',
      'font-size:10.5px;color:var(--cs-ink-3);background:var(--cs-bg)}',
      // 排期：月历标题层级 + 待排期栏更像“队列”
      '.dsh-cs-pane .md-root .md-cal-num{font-variant-numeric:tabular-nums}',
      '.dsh-cs-pane .md-root .md-rail-col .md-next{border-color:var(--cs-line-strong)}',
      '.dsh-cs-pane .md-root .md-tray .md-tray-scroll{gap:2px}',
      '.dsh-cs-pane .md-root .md-tray .md-tile-head h2{letter-spacing:.01em}',
    ].join('');

    var EMBED_CSS = {
      'guizang-design': DESIGN_THEME_CSS,
      'studio-elements': ELEMENTS_THEME_CSS,
      'pixel-logo': LOGO_THEME_CSS,
    };

    // 同源 iframe：注入覆盖样式、嵌入标记，并把当前子视图 / 预览开关同步进去。
    function attachStudioTheme(frame, tabId) {
      var observer = null;
      var disposed = false;
      var css = EMBED_CSS[tabId] || '';

      function inject() {
        if (disposed) return;
        var doc = null;
        try {
          doc = frame.contentDocument;
        } catch (error) {
          return;
        }
        if (!doc || !doc.documentElement) return;

        var root = doc.documentElement;
        root.setAttribute('data-cs-studio', 'light');
        root.setAttribute('data-cs-embed', '1');
        if (CURRENT_VIEW[tabId]) root.setAttribute('data-cs-view', CURRENT_VIEW[tabId]);
        if (tabId === 'pixel-logo') root.setAttribute('data-cs-preview', readPreview() ? 'on' : 'off');

        if (tabId === 'guizang-design') {
          if (root.getAttribute('data-scheme') !== 'light') root.setAttribute('data-scheme', 'light');
          if (!observer && typeof MutationObserver === 'function') {
            observer = new MutationObserver(function () {
              if (root.getAttribute('data-scheme') !== 'light') root.setAttribute('data-scheme', 'light');
            });
            observer.observe(root, { attributes: true, attributeFilter: ['data-scheme'] });
          }
        }

        var head = doc.head || root;
        var style = doc.getElementById('dsh-cs-theme');
        if (!style) {
          style = doc.createElement('style');
          style.id = 'dsh-cs-theme';
          head.appendChild(style);
        }
        style.textContent = css;
        head.appendChild(style);
      }

      function onLoad() {
        inject();
      }

      frame.addEventListener('load', onLoad);
      try {
        if (frame.contentDocument && frame.contentDocument.readyState === 'complete') inject();
      } catch (error) {
        /* 不是同源或还没加载好，等 load */
      }

      var timer = setTimeout(inject, 600);

      return function () {
        disposed = true;
        clearTimeout(timer);
        if (observer) observer.disconnect();
        frame.removeEventListener('load', onLoad);
      };
    }

    /* ---------------------------------------------------------------- 图标 */

    function makeSvg(size, children) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        children,
      );
    }

    function CreativeIcon(props) {
      var size = props && props.size ? props.size : 16;
      return makeSvg(size, [
        h('rect', { key: 'frame', x: 2.5, y: 2.5, width: 11, height: 11, rx: 2.5 }),
        h('path', { key: 'sparkle', d: 'M8 5.1l.85 1.9L10.8 8l-1.95.95L8 11l-.85-2.05L5.2 8l1.95-1L8 5.1Z' }),
      ]);
    }

    function WsIcon(props) {
      var id = props.id;
      if (id === 'content') {
        return makeSvg(15, [
          h('path', { key: 'bulb', d: 'M8 2.4a3.4 3.4 0 0 1 1.9 6.2c-.5.35-.8.9-.8 1.5v.3H6.9v-.3c0-.6-.3-1.15-.8-1.5A3.4 3.4 0 0 1 8 2.4Z' }),
          h('path', { key: 'base', d: 'M6.7 13.1h2.6' }),
        ]);
      }
      if (id === 'design') {
        return makeSvg(15, [
          h('path', { key: 'pen', d: 'M3 13l1-3.4 7.2-7.2a1.3 1.3 0 0 1 1.9 1.9L5.9 11.5 3 13Z' }),
          h('path', { key: 'nib', d: 'M10.2 3.6l2.2 2.2' }),
        ]);
      }
      if (id === 'elements') {
        return makeSvg(15, [
          h('rect', { key: 'a', x: 2.2, y: 2.2, width: 5, height: 5, rx: 1.2 }),
          h('rect', { key: 'b', x: 8.8, y: 2.2, width: 5, height: 5, rx: 1.2 }),
          h('rect', { key: 'c', x: 2.2, y: 8.8, width: 5, height: 5, rx: 1.2 }),
          h('rect', { key: 'd', x: 8.8, y: 8.8, width: 5, height: 5, rx: 1.2 }),
        ]);
      }
      return makeSvg(15, [
        h('rect', { key: 'p1', x: 2.4, y: 2.4, width: 4.2, height: 4.2, rx: 1 }),
        h('rect', { key: 'p2', x: 9.4, y: 2.4, width: 4.2, height: 4.2, rx: 1 }),
        h('rect', { key: 'p3', x: 2.4, y: 9.4, width: 4.2, height: 4.2, rx: 1 }),
        h('rect', { key: 'p4', x: 9.4, y: 9.4, width: 4.2, height: 4.2, rx: 1 }),
      ]);
    }

    function BackIcon() {
      return makeSvg(15, [h('path', { key: 'arrow', d: 'M9.8 4.2 6 8l3.8 3.8' })]);
    }

    function ChevIcon() {
      return makeSvg(12, [h('path', { key: 'chev', d: 'M6 3.4 9.6 8 6 12.6' })]);
    }

    function PlusIcon() {
      return makeSvg(13, [h('path', { key: 'plus', d: 'M8 3.2v9.6M3.2 8h9.6' })]);
    }

    function SparkIcon() {
      return makeSvg(14, [
        h('path', { key: 'a', d: 'M8 2.6l1.15 2.9 2.9 1.15-2.9 1.15L8 10.7 6.85 7.8 3.95 6.65l2.9-1.15L8 2.6Z' }),
        h('path', { key: 'b', d: 'M12.2 10.6l.55 1.35 1.35.55-1.35.55-.55 1.35-.55-1.35-1.35-.55 1.35-.55.55-1.35Z' }),
      ]);
    }

    function PanelIcon() {
      return makeSvg(14, [
        h('rect', { key: 'box', x: 2.3, y: 2.8, width: 11.4, height: 10.4, rx: 2 }),
        h('path', { key: 'split', d: 'M9.6 2.8v10.4' }),
      ]);
    }

    function SearchIcon() {
      return makeSvg(13, [
        h('circle', { key: 'c', cx: 7.1, cy: 7.1, r: 3.6 }),
        h('path', { key: 'l', d: 'M10.2 10.2 13 13' }),
      ]);
    }

    function CloseIcon() {
      return makeSvg(12, [h('path', { key: 'x', d: 'M3.6 3.6l8.8 8.8M12.4 3.6l-8.8 8.8' })]);
    }

    function GearIcon() {
      return makeSvg(14, [
        h('circle', { key: 'c', cx: 8, cy: 8, r: 2.4 }),
        h('path', { key: 'g', d: 'M8 2.6v1.4M8 12v1.4M2.6 8h1.4M12 8h1.4M4.2 4.2l1 1M10.8 10.8l1 1M11.8 4.2l-1 1M5.2 10.8l-1 1' }),
      ]);
    }

    /* ---------------------------------------------------------------- 状态 */

    function findWs(id) {
      for (var i = 0; i < WORKSPACES.length; i += 1) {
        if (WORKSPACES[i].id === id) return WORKSPACES[i];
      }
      return null;
    }

    function findWsByTab(tab) {
      for (var i = 0; i < WORKSPACES.length; i += 1) {
        if (WORKSPACES[i].tab === tab) return WORKSPACES[i];
      }
      return null;
    }

    function findView(ws, id) {
      if (!ws) return null;
      for (var i = 0; i < ws.views.length; i += 1) {
        if (ws.views[i].id === id) return ws.views[i];
      }
      return null;
    }

    function defaultView(ws) {
      return ws && ws.views.length ? ws.views[0].id : '';
    }

    function readNav() {
      var fallback = { ws: WORKSPACES[0].id, views: {} };
      try {
        var raw = window.localStorage.getItem(LS_NAV);
        if (!raw) return fallback;
        var saved = JSON.parse(raw);
        var ws = findWs(saved && saved.ws) || WORKSPACES[0];
        var views = {};
        for (var i = 0; i < WORKSPACES.length; i += 1) {
          var item = WORKSPACES[i];
          var wanted = saved && saved.views ? saved.views[item.id] : null;
          views[item.id] = findView(item, wanted) ? wanted : defaultView(item);
        }
        return { ws: ws.id, views: views };
      } catch (error) {
        return fallback;
      }
    }

    function persistNav(wsId, viewId) {
      try {
        var nav = readNav();
        nav.ws = wsId;
        nav.views[wsId] = viewId;
        window.localStorage.setItem(LS_NAV, JSON.stringify(nav));
      } catch (error) {
        /* localStorage 不可用时只影响记忆 */
      }
    }

    function readAssistant() {
      try {
        var saved = window.localStorage.getItem(LS_ASSISTANT);
        if (saved === 'open' || saved === 'closed') return saved;
      } catch (error) {
        /* ignore */
      }
      return ASSISTANT_DEFAULT;
    }

    function persistAssistant(state) {
      try {
        window.localStorage.setItem(LS_ASSISTANT, state);
      } catch (error) {
        /* ignore */
      }
    }

    function readPreview() {
      try {
        return window.localStorage.getItem(LS_PREVIEW) === 'on';
      } catch (error) {
        return false;
      }
    }

    function persistPreview(on) {
      try {
        window.localStorage.setItem(LS_PREVIEW, on ? 'on' : 'off');
      } catch (error) {
        /* ignore */
      }
    }

    function paneEl(tabId) {
      return PANE_REFS[tabId] || null;
    }

    function paneDoc(tabId) {
      var pane = paneEl(tabId);
      if (!pane) return null;
      var frame = pane.querySelector('iframe');
      if (!frame) return null;
      try {
        return frame.contentDocument || null;
      } catch (error) {
        return null;
      }
    }

    function backToChat() {
      try {
        if (CONTEXT && CONTEXT.layout) CONTEXT.layout.selectPanel(null);
      } catch (error) {
        console.warn('[dsh-creative-studio] 返回对话失败', error);
      }
    }

    function isRenderable(value) {
      if (typeof value === 'function') return true;
      if (value && typeof value === 'object' && typeof React.isValidElementType === 'function') {
        return React.isValidElementType(value);
      }
      return false;
    }

    /* ------------------------------------------------ 读取 main 槽里的组件 */

    function findMainEntry(key) {
      var ctx = CONTEXT;
      if (!ctx || !ctx.slots) return null;
      var slots = ctx.slots;
      var list = [];
      try {
        if (typeof slots.entriesOfSlot === 'function') list = slots.entriesOfSlot('main') || [];
        else if (typeof slots.entries === 'function') list = slots.entries('main') || [];
      } catch (error) {
        console.warn('[dsh-creative-studio] 读取 main 槽失败', error);
        return null;
      }
      for (var i = 0; i < list.length; i += 1) {
        var entry = list[i];
        if (entry && entry.options && entry.options.key === key) return entry;
      }
      return null;
    }

    // apply 时两个 vendor client 已经同步注册完 main 槽，这里通常能直接拿到；订阅 +
    // 轮询只是兜底，防止将来加载顺序变化。
    function useMainEntry(key) {
      var state = React.useState(function () {
        return findMainEntry(key);
      });
      var entry = state[0];
      var setEntry = state[1];

      React.useEffect(function () {
        if (entry) return undefined;
        var ctx = CONTEXT;
        var off = null;
        var timer = null;

        var stop = function () {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          if (off) {
            var dispose = off;
            off = null;
            try {
              dispose();
            } catch (error) {
              /* ignore */
            }
          }
        };

        var sync = function () {
          var found = findMainEntry(key);
          if (!found) return;
          setEntry(function (prev) {
            return prev === found ? prev : found;
          });
          stop();
        };

        try {
          if (ctx && ctx.slots && typeof ctx.slots.subscribe === 'function') {
            off = ctx.slots.subscribe('main', sync);
          }
        } catch (error) {
          console.warn('[dsh-creative-studio] 订阅 main 槽失败', error);
        }
        timer = setInterval(sync, 300);
        sync();

        return stop;
      }, [key, entry]);

      return entry;
    }

    /* ------------------------------------------------------------ 错误边界 */

    class PaneBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }

      static getDerivedStateFromError(error) {
        return { error: error };
      }

      componentDidCatch(error, info) {
        console.error('[dsh-creative-studio] 内嵌面板渲染失败：', this.props.title, error, info);
      }

      render() {
        if (!this.state.error) return this.props.children;
        var message =
          this.state.error && this.state.error.message ? this.state.error.message : String(this.state.error);
        return h(
          'div',
          { className: 'dsh-cs-error' },
          h('strong', null, (this.props.title || '面板') + ' 暂时无法显示'),
          h('div', null, 'DSH 控制台里有完整堆栈。原始信息：' + message),
        );
      }
    }

    /* ------------------------------------------------------- 子视图同步 */

    // 把外壳选中的子视图同步给 vendor UI：模拟点击它们自己的导航。
    // 找不到目标（iframe 还在加载 / 面板还没挂载）就退避重试，最多 ~2.4s。
    function markMediaChrome(pane) {
      if (!pane) return;
      var buttons = pane.querySelectorAll('.md-topbar button');
      for (var i = 0; i < buttons.length; i += 1) {
        var label = (buttons[i].textContent || '').trim() || buttons[i].getAttribute('aria-label') || '';
        if (label === '助手' && !buttons[i].__dshCsHidden) {
          buttons[i].__dshCsHidden = true;
          buttons[i].setAttribute('data-dsh-cs-hidden', 'duplicate-assistant');
        }
      }
    }

    // media-desk 的助手抽屉有自己的开关（顶栏那个「助手」按钮），CSS 只是把它藏起来。
    // 外壳的助手状态要真正驱动它：不一致时替用户点一下那个按钮。
    function mediaDockButton(pane) {
      if (!pane) return null;
      var buttons = pane.querySelectorAll('.md-topbar button');
      for (var i = 0; i < buttons.length; i += 1) {
        var caption = (buttons[i].textContent || '').trim() || buttons[i].getAttribute('aria-label') || '';
        if (caption === '助手') return buttons[i];
      }
      return null;
    }

    function openMediaSettings(attempt) {
      var pane = paneEl('media-desk');
      if (!pane) return;
      var btn = pane.querySelector('.md-topbar button[aria-label="设置"]');
      if (btn) {
        btn.click();
        return;
      }
      if ((attempt || 0) < 25) {
        window.setTimeout(function () { openMediaSettings((attempt || 0) + 1); }, 200);
      }
    }

    function mediaHasDock(pane) {
      var root = pane && pane.querySelector('.md-root');
      return !!(root && root.classList.contains('has-dock'));
    }

    var DOCK_TOKEN = 0;

    function syncMediaDock(open) {
      DOCK_TOKEN += 1;
      dockStep(open, 0, DOCK_TOKEN);
    }

    function dockStep(open, attempt, token) {
      if (token !== DOCK_TOKEN) return;
      var pane = paneEl('media-desk');
      if (!pane) {
        if (attempt < 20) {
          setTimeout(function () { dockStep(open, attempt + 1, token); }, 250);
        }
        return;
      }
      markMediaChrome(pane);
      var openNow = mediaHasDock(pane);
      var btn = null;
      if (openNow) {
        // 抽屉打开时，顶栏那个「助手」按钮会消失，收起要用抽屉自己的关闭按钮
        btn = pane.querySelector('.md-dock button[aria-label="收起对话"]') || pane.querySelector('.md-dock .md-dock-head button');
      } else {
        btn = mediaDockButton(pane);
      }
      if (!btn) {
        if (attempt < 20) {
          setTimeout(function () { dockStep(open, attempt + 1, token); }, 250);
        }
        return;
      }
      if (openNow === open) {
        // 状态已经对了，再确认一次，防止 vendor 自己晚一步重置
        if (attempt < 6) {
          setTimeout(function () { dockStep(open, attempt + 1, token); }, 400);
        }
        return;
      }
      btn.click();
      if (attempt < 20) {
        setTimeout(function () { dockStep(open, attempt + 1, token); }, 300);
      }
    }

    function applyView(tab, viewId) {
      if (!tab || !viewId) return;
      CURRENT_VIEW[tab] = viewId;
      var token = (VIEW_TOKENS[tab] || 0) + 1;
      VIEW_TOKENS[tab] = token;
      runApply(tab, viewId, 0, token);
    }

    function runApply(tab, viewId, attempt, token) {
      if (VIEW_TOKENS[tab] !== token) return;
      var ok = false;

      if (tab === 'media-desk') {
        var pane = paneEl(tab);
        if (pane) {
          markMediaChrome(pane);
          var nav = pane.querySelector('.md-nav');
          if (nav) {
            var label = VIEW_LABEL[viewId] || viewId;
            var buttons = nav.querySelectorAll('button');
            for (var i = 0; i < buttons.length; i += 1) {
              if ((buttons[i].textContent || '').trim() === label) {
                if (!buttons[i].classList.contains('is-on')) buttons[i].click();
                ok = true;
                break;
              }
            }
          }
        }
      } else if (tab === 'guizang-design') {
        var ddoc = paneDoc(tab);
        if (ddoc && ddoc.documentElement) {
          ddoc.documentElement.setAttribute('data-cs-view', viewId);
          var link = ddoc.querySelector('nav.nav a[data-view="' + viewId + '"]');
          if (link) {
            if (!link.classList.contains('on')) link.click();
            ok = true;
          } else if (ddoc.querySelector('.main')) {
            // 页面还没渲染出导航（脚本加载中），继续等
            ok = false;
          }
        }
      } else if (tab === 'studio-elements') {
        var edoc = paneDoc(tab);
        if (edoc && edoc.documentElement) {
          edoc.documentElement.setAttribute('data-cs-cat', viewId);
          var chips = edoc.querySelectorAll('.cats button');
          for (var j = 0; j < chips.length; j += 1) {
            if ((chips[j].textContent || '').trim() === viewId) {
              if (!chips[j].classList.contains('on')) chips[j].click();
              ok = true;
              break;
            }
          }
        }
      } else {
        ok = true; // Logo 只有一个视图
      }

      if (!ok && attempt < 12) {
        setTimeout(function () {
          runApply(tab, viewId, attempt + 1, token);
        }, 200);
      }
    }

    /* ------------------------------------------------------------ 单个 pane */

    function TabPane(props) {
      var ws = findWsByTab(props.id) || WORKSPACES[0];
      var tab = props.id;
      var paneRef = React.useRef(null);
      var readyState = React.useState(ws.kind === 'react');
      var ready = readyState[0];
      var setReady = readyState[1];
      var probeState = React.useState(ws.probe ? 'checking' : 'ready');

      React.useEffect(
        function () {
          PANE_REFS[tab] = paneRef.current;
          return function () {
            if (PANE_REFS[tab] === paneRef.current) delete PANE_REFS[tab];
          };
        },
        [tab],
      );

      React.useEffect(
        function () {
          if (!ws.probe) return undefined;
          var cancelled = false;
          fetch(ws.probe, { method: 'HEAD', cache: 'no-store' })
            .then(function (res) {
              if (!cancelled) probeState[1](res.ok ? 'ready' : 'missing');
            })
            .catch(function () {
              if (!cancelled) probeState[1]('missing');
            });
          return function () {
            cancelled = true;
          };
        },
        [ws.probe],
      );

      // iframe 加载完成后收起骨架屏：轮询 + load 事件双保险（vendor 的 iframe 是异步挂的）。
      React.useEffect(
        function () {
          if (ws.kind === 'react') {
            setReady(true);
            return undefined;
          }
          var disposed = false;
          var timer = null;
          var bound = null;

          var clear = function () {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
            if (bound) {
              bound.removeEventListener('load', onLoad);
              bound = null;
            }
          };
          var onLoad = function () {
            if (!disposed) setReady(true);
          };
          var check = function () {
            if (disposed) return;
            var pane = paneRef.current;
            var frame = pane ? pane.querySelector('iframe') : null;
            if (!frame) return;
            if (bound !== frame) {
              if (bound) bound.removeEventListener('load', onLoad);
              bound = frame;
              frame.addEventListener('load', onLoad);
            }
            try {
              if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
                setReady(true);
                clear();
              }
            } catch (error) {
              /* ignore */
            }
          };
          check();
          timer = setInterval(check, 300);
          return function () {
            disposed = true;
            clear();
          };
        },
        [ws.kind],
      );

      // 主题 + 嵌入样式注入：vendor 可能在作用域内再挂 iframe（设计页），用 MutationObserver 兜底。
      var themed = ws.kind === 'iframe' || tab === 'guizang-design';
      React.useEffect(
        function () {
          if (!themed) return undefined;
          var host = paneRef.current;
          if (!host) return undefined;
          var disposers = [];

          function attachAll() {
            var frames = host.querySelectorAll('iframe');
            for (var i = 0; i < frames.length; i += 1) {
              var frame = frames[i];
              if (frame.__dshCsThemed) continue;
              frame.__dshCsThemed = true;
              disposers.push(attachStudioTheme(frame, tab));
            }
          }

          attachAll();
          var observer = null;
          if (typeof MutationObserver === 'function') {
            observer = new MutationObserver(attachAll);
            observer.observe(host, { childList: true, subtree: true });
          }
          return function () {
            if (observer) observer.disconnect();
            for (var i = 0; i < disposers.length; i += 1) {
              try {
                disposers[i]();
              } catch (error) {
                /* ignore */
              }
            }
          };
        },
        [tab, themed],
      );

      var content;

      if (ws.kind === 'iframe' && ws.probe && probeState[0] !== 'ready') {
        content = h(
          'div',
          { className: 'dsh-cs-empty' },
          probeState[0] === 'checking'
            ? '正在加载「' + ws.title + '」…'
            : '「' + ws.title + '」页面还没启用：新路由要重启 DSH 才会注册，重启后刷新本页即可。',
        );
      } else if (ws.kind === 'iframe') {
        content = h('iframe', {
          className: 'dsh-cs-frame',
          src: ws.src,
          title: ws.title,
          allow: 'fullscreen',
        });
      } else {
        var entry = useMainEntry(tab);
        var Component = entry && isRenderable(entry.component) ? entry.component : null;
        content = Component
          ? h(PaneBoundary, { title: ws.title }, h(Component))
          : h('div', { className: 'dsh-cs-empty' }, '面板加载中…');
      }

      var skeleton = null;
      if (!ready) {
        skeleton = h(
          'div',
          { className: 'dsh-cs-skel', 'aria-hidden': 'true' },
          h('div', { className: 'dsh-cs-skel-bar', style: { width: '28%' } }),
          h('div', { className: 'dsh-cs-skel-bar', style: { width: '52%', height: 22 } }),
          h('div', { className: 'dsh-cs-skel-card' }),
          h('div', { className: 'dsh-cs-skel-card', style: { height: 180 } }),
        );
      }

      return h(
        'div',
        {
          ref: paneRef,
          className: 'dsh-cs-pane',
          'data-pane': tab,
          role: 'tabpanel',
          'aria-label': ws.title,
          hidden: !props.active,
          'aria-hidden': props.active ? 'false' : 'true',
        },
        content,
        skeleton,
      );
    }

    /* -------------------------------------------------------------- 主面板 */

    function CreativeStudioPage() {
      var navState = React.useState(readNav);
      var nav = navState[0];
      var setNav = navState[1];

      // 2026-11-20：vendor 两个 client 不再在插件 apply 时同步启动，改成进入本页才拉。
      // 首屏因此少下载约 270KB；加载完成后 vendor 会注册 main 槽，useMainEntry 的
      // 订阅/轮询会自动把 iframe 挂上。
      React.useEffect(function () {
        ensureVendorsBooted();
      }, []);

      var assistantState = React.useState(readAssistant);
      var assistant = assistantState[0];
      var setAssistant = assistantState[1];

      var previewState = React.useState(readPreview);
      var preview = previewState[0];
      var setPreview = previewState[1];

      var menuState = React.useState(false);
      var menuOpen = menuState[0];
      var setMenuOpen = menuState[1];

      var queryState = React.useState('');
      var elementQuery = queryState[0];
      var setElementQuery = queryState[1];

      var handoffState = React.useState(null);
      var handoff = handoffState[0];
      var setHandoff = handoffState[1];

      var visited = React.useRef({});
      var actionsRef = React.useRef(null);

      var ws = findWs(nav.ws) || WORKSPACES[0];
      var view = findView(ws, nav.views[ws.id]) || ws.views[0];
      visited.current[ws.tab] = true;

      var selectWorkspace = React.useCallback(function (wsId) {
        var next = findWs(wsId);
        if (!next) return;
        setNav(function (prev) {
          var saved = {};
          for (var key in prev.views) saved[key] = prev.views[key];
          if (!findView(next, saved[next.id])) saved[next.id] = defaultView(next);
          persistNav(next.id, saved[next.id]);
          return { ws: next.id, views: saved };
        });
      }, []);

      var selectView = React.useCallback(
        function (wsId, viewId) {
          var target = findWs(wsId);
          if (!target || !findView(target, viewId)) return;
          setNav(function (prev) {
            var saved = {};
            for (var key in prev.views) saved[key] = prev.views[key];
            saved[wsId] = viewId;
            persistNav(wsId, viewId);
            return { ws: wsId, views: saved };
          });
        },
        [],
      );

      // DSH 在窄窗把左侧栏收成抽屉，会有一个悬浮汉堡压住我们的品牌/第一行；
      // 检测到汉堡时给左栏补 48px 内边距（抽屉关掉后自动恢复）。
      React.useEffect(function () {
        function sync() {
          var root = document.querySelector('.dsh-cs-root');
          if (!root) return;
          var handle = document.querySelector('button[aria-label="打开侧边栏"]');
          var rect = handle ? handle.getBoundingClientRect() : null;
          var drawer = Boolean(rect && rect.width > 0 && rect.bottom > 0);
          var next = drawer ? 'drawer' : 'desktop';
          if (root.getAttribute('data-cs-shell') !== next) root.setAttribute('data-cs-shell', next);
        }
        sync();
        window.addEventListener('resize', sync);
        var timer = window.setInterval(sync, 1500);
        return function () {
          window.removeEventListener('resize', sync);
          window.clearInterval(timer);
        };
      }, []);

      // 切换子视图时同步给 vendor UI
      React.useEffect(
        function () {
          applyView(ws.tab, view.id);
        },
        [ws.tab, view.id],
      );

      // 设计页内部点「查看全部」之类的 #/ 链接时，把外壳标题也带过去
      React.useEffect(
        function () {
          SYNC_VIEW = function (tab, viewId) {
            var target = findWsByTab(tab);
            if (!target || !findView(target, viewId)) return;
            setNav(function (prev) {
              if (prev.views[target.id] === viewId && prev.ws === target.id) return prev;
              var saved = {};
              for (var key in prev.views) saved[key] = prev.views[key];
              saved[target.id] = viewId;
              persistNav(target.id, viewId);
              return { ws: target.id, views: saved };
            });
          };
          var timer = setInterval(function () {
            if (ws.tab !== 'guizang-design') return;
            var doc = paneDoc('guizang-design');
            if (!doc) return;
            var hash = (doc.location.hash || '').replace(/^#\/?/, '').split('?')[0] || 'home';
            if (findView(ws, hash) && hash !== view.id) {
              SYNC_VIEW('guizang-design', hash);
            }
          }, 600);
          return function () {
            clearInterval(timer);
            SYNC_VIEW = null;
          };
        },
        [ws.tab, ws.id, view.id],
      );

      // 素材搜索：把外壳输入框的值写进 threeui 的搜索框（它自己是受控的 React input）
      React.useEffect(
        function () {
          if (ws.tab !== 'studio-elements') return undefined;
          var timer = setTimeout(function () {
            var doc = paneDoc('studio-elements');
            if (!doc) return;
            var input = doc.querySelector('.search input');
            if (!input) return;
            if (input.value === elementQuery) return;
            var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, elementQuery);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }, 160);
          return function () {
            clearTimeout(timer);
          };
        },
        [elementQuery, ws.tab],
      );

      // Logo 预览列开关
      React.useEffect(
        function () {
          persistPreview(preview);
          var doc = paneDoc('pixel-logo');
          if (doc && doc.documentElement) {
            doc.documentElement.setAttribute('data-cs-preview', preview ? 'on' : 'off');
          }
        },
        [preview],
      );

      // 助手开合：驱动 media-desk 自己的抽屉（它默认是开的，外壳默认收起）
      React.useEffect(
        function () {
          if (ws.tab !== 'media-desk') return;
          syncMediaDock(assistant === 'open');
          var late = window.setTimeout(function () { syncMediaDock(assistant === 'open'); }, 1200);
          return function () { window.clearTimeout(late); };
        },
        [assistant, ws.tab],
      );

      // 设计页发来的「用于内容」：切到内容/灵感，并显示带入条
      React.useEffect(
        function () {
          function onMessage(event) {
            if (event.origin !== window.location.origin) return;
            var data = event.data;
            if (!data || data.type !== 'dsh-cs:use-work') return;
            setHandoff({ title: String(data.title || '未命名作品'), skill: data.skill || '' });
            selectView('content', 'inspiration');
          }
          window.addEventListener('message', onMessage);
          return function () {
            window.removeEventListener('message', onMessage);
          };
        },
        [selectView],
      );

      // ⌘[ / Ctrl+[ 返回对话（和标题栏提示一致）
      React.useEffect(
        function () {
          function onKey(event) {
            if (!(event.metaKey || event.ctrlKey) || event.key !== '[') return;
            event.preventDefault();
            backToChat();
          }
          window.addEventListener('keydown', onKey);
          return function () {
            window.removeEventListener('keydown', onKey);
          };
        },
        [],
      );

      // 菜单：点外面 / Escape 关闭
      React.useEffect(
        function () {
          if (!menuOpen) return undefined;
          function onDown(event) {
            if (actionsRef.current && !actionsRef.current.contains(event.target)) setMenuOpen(false);
          }
          function onKey(event) {
            if (event.key === 'Escape') setMenuOpen(false);
          }
          document.addEventListener('mousedown', onDown);
          document.addEventListener('keydown', onKey);
          return function () {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
          };
        },
        [menuOpen],
      );

      function toggleAssistant() {
        setAssistant(function (prev) {
          var next = prev === 'open' ? 'closed' : 'open';
          persistAssistant(next);
          return next;
        });
      }

      function go(wsId, viewId, options) {
        selectWorkspace(wsId);
        if (viewId) selectView(wsId, viewId);
        setMenuOpen(false);
        if (options && options.focusIdea) {
          setTimeout(focusIdeaInput, 420);
        }
      }

      function useHandoff() {
        if (!handoff) return;
        var text = '为《' + handoff.title + '》写一条内容';
        setHandoff(null);
        setAssistant('open');
        persistAssistant('open');
        syncMediaDock(true);
        window.setTimeout(function () {
          writeComposerWhenReady(text, 0);
        }, 500);
      }

      var panes = [];
      for (var i = 0; i < WORKSPACES.length; i += 1) {
        var item = WORKSPACES[i];
        if (!visited.current[item.tab]) continue;
        panes.push(
          h(TabPane, {
            key: item.tab,
            id: item.tab,
            active: item.tab === ws.tab,
          }),
        );
      }

      var wsButtons = WORKSPACES.map(function (entry) {
        var open = entry.id === ws.id;
        var single = entry.views.length === 1;
        var children = [
          h(
            'button',
            {
              key: 'btn',
              type: 'button',
              className: 'dsh-cs-wsbtn',
              'aria-expanded': single ? undefined : open ? 'true' : 'false',
              'aria-controls': single ? undefined : 'dsh-cs-views-' + entry.id,
              'aria-current': open ? 'page' : undefined,
              onClick: function () {
                selectWorkspace(entry.id);
              },
            },
            h(WsIcon, { id: entry.id }),
            h('span', { className: 'dsh-cs-ws-label' }, entry.title),
            single ? null : h('span', { className: 'dsh-cs-chev' }, h(ChevIcon)),
          ),
        ];
        if (!single) {
          children.push(
            h(
              'div',
              { key: 'views', className: 'dsh-cs-views', id: 'dsh-cs-views-' + entry.id, role: 'group', 'aria-label': entry.title },
              entry.views.map(function (v) {
                var on = entry.id === ws.id && v.id === view.id;
                return h(
                  'button',
                  {
                    key: v.id,
                    type: 'button',
                    className: 'dsh-cs-view',
                    'aria-current': on ? 'page' : undefined,
                    title: v.desc,
                    onClick: function () {
                      selectView(entry.id, v.id);
                    },
                  },
                  v.title,
                );
              }),
            ),
          );
        }
        return h(
          'div',
          {
            key: entry.id,
            className: 'dsh-cs-ws' + (single ? ' is-single' : ''),
            'data-open': open ? 'true' : 'false',
          },
          children,
        );
      });

      var viewChips = ws.views.map(function (v) {
        var on = v.id === view.id;
        return h(
          'button',
          {
            key: v.id,
            type: 'button',
            className: 'dsh-cs-view',
            'aria-current': on ? 'page' : undefined,
            title: v.desc,
            onClick: function () {
              selectView(ws.id, v.id);
            },
          },
          v.title,
        );
      });

      var headActions = [];

      if (ws.id === 'content') {
        headActions.push(
          h(
            'button',
            {
              key: 'settings',
              type: 'button',
              className: 'dsh-cs-btn is-icon',
              title: '内容工作台设置',
              'aria-label': '内容工作台设置',
              onClick: function () {
                openMediaSettings(0);
              },
            },
            h(GearIcon),
          ),
        );
      }

      if (ws.id === 'content' && assistant === 'open') {
        headActions.push(
          h(
            'button',
            {
              key: 'assistant',
              type: 'button',
              className: 'dsh-cs-btn',
              'aria-pressed': assistant === 'open' ? 'true' : 'false',
              title: assistant === 'open' ? '收起助手（把宽度还给正文）' : '展开助手',
              onClick: toggleAssistant,
            },
            h(SparkIcon),
            h('span', null, '助手'),
          ),
        );
      }

      if (ws.id === 'logo') {
        headActions.push(
          h(
            'button',
            {
              key: 'preview',
              type: 'button',
              className: 'dsh-cs-btn',
              'aria-pressed': preview ? 'true' : 'false',
              title: preview ? '收起右侧预览，把宽度还给画布' : '展开右侧预览',
              onClick: function () {
                setPreview(function (prev) {
                  return !prev;
                });
              },
            },
            h(PanelIcon),
            h('span', null, '预览'),
          ),
        );
      }

      if (ws.id === 'elements') {
        headActions.push(
          h(
            'label',
            { key: 'search', className: 'dsh-cs-search', title: '搜索组件' },
            h(SearchIcon),
            h('input', {
              type: 'search',
              value: elementQuery,
              placeholder: '搜索组件…',
              'aria-label': '搜索素材组件',
              onChange: function (event) {
                setElementQuery(event.target.value);
              },
            }),
          ),
        );
      }

      headActions.push(
        h(
          'button',
          {
            key: 'new',
            type: 'button',
            className: 'dsh-cs-btn is-primary',
            'aria-haspopup': 'menu',
            'aria-expanded': menuOpen ? 'true' : 'false',
            title: '新建',
            onClick: function () {
              setMenuOpen(function (prev) {
                return !prev;
              });
            },
          },
          h(PlusIcon),
          h('span', null, '新建'),
        ),
      );

      var menu = null;
      if (menuOpen) {
        var items = [
          { key: 'idea', icon: 'bulb', label: '记一条灵感', desc: '随手记下，让 AI 帮你补全', ws: 'content', view: 'inspiration', focusIdea: true },
          { key: 'draft', icon: 'pen', label: '写一条内容', desc: '从选题到成稿、配图', ws: 'content', view: 'content' },
          { key: 'ppt', icon: 'grid', label: '做一份网页 PPT', desc: '横向翻页的演讲页', ws: 'design', view: 'home' },
          { key: 'logo', icon: 'pixel', label: '打开 Logo 编辑器', desc: '像素 / 矢量标识', ws: 'logo', view: 'editor' },
          { key: 'elements', icon: 'grid', label: '浏览素材库', desc: '103 个可复用组件', ws: 'elements', view: '全部' },
        ];
        menu = h(
          'div',
          { className: 'dsh-cs-menu', role: 'menu', 'aria-label': '新建' },
          items.map(function (item) {
            return h(
              'button',
              {
                key: item.key,
                type: 'button',
                className: 'dsh-cs-menu-item',
                role: 'menuitem',
                onClick: function () {
                  go(item.ws, item.view, { focusIdea: item.focusIdea });
                },
              },
              h(WsIcon, { id: item.icon }),
              h(
                'span',
                { className: 'dsh-cs-menu-text' },
                h('b', null, item.label),
                h('span', null, item.desc),
              ),
            );
          }),
        );
      }

      var handoffBar = null;
      if (handoff) {
        handoffBar = h(
          'div',
          { className: 'dsh-cs-handoff', role: 'status' },
          h(SparkIcon),
          h('span', null, '已从设计带入《', h('strong', null, handoff.title), '》'),
          h('span', { className: 'dsh-cs-spacer' }),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-cs-btn',
              onClick: useHandoff,
            },
            '用它写一条内容',
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-cs-btn is-icon',
              title: '关闭',
              'aria-label': '关闭带入提示',
              onClick: function () {
                setHandoff(null);
              },
            },
            h(CloseIcon),
          ),
        );
      }

      var fab =
        ws.id === 'content' && assistant === 'closed'
          ? h(
            'button',
            {
              key: 'fab',
              type: 'button',
              className: 'dsh-cs-fab',
              title: '展开助手',
              onClick: function () {
                setAssistant('open');
                persistAssistant('open');
              },
            },
            h(SparkIcon),
            h('span', null, '助手'),
          )
          : null;

      var crumb = view.title === ws.title ? null : ws.title;

      return h(
        'div',
        { className: 'dsh-cs-root', 'data-assistant': assistant, 'data-workspace': ws.id },
        h(
          'aside',
          { className: 'dsh-cs-nav', role: 'navigation', 'aria-label': '创作台导航' },
          h(
            'div',
            { className: 'dsh-cs-brand', title: '创作台 · dsh-creative-studio' },
            h(CreativeIcon, { size: 15 }),
            h('strong', null, '创作台'),
            h('span', { className: 'dsh-cs-brand-sub' }, 'studio'),
          ),
          h(
            'div',
            {
              className: 'dsh-cs-navlist',
              onKeyDown: function (event) {
                if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                var list = Array.prototype.slice.call(event.currentTarget.querySelectorAll('.dsh-cs-wsbtn'));
                var index = list.indexOf(document.activeElement);
                if (index < 0) return;
                event.preventDefault();
                var next = event.key === 'ArrowDown' ? index + 1 : index - 1;
                if (next < 0) next = list.length - 1;
                if (next >= list.length) next = 0;
                list[next].focus({ preventScroll: true });
              },
            },
            wsButtons,
          ),
          h(
            'div',
            { className: 'dsh-cs-navfoot' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-cs-btn dsh-cs-ghost',
                title: '返回对话（⌘[）',
                onClick: backToChat,
              },
              h(BackIcon),
              h('span', null, '返回对话'),
            ),
          ),
        ),
        h(
          'section',
          { className: 'dsh-cs-main' },
          h(
            'header',
            { className: 'dsh-cs-head' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-cs-btn is-icon',
                title: '返回对话',
                'aria-label': '返回对话',
                onClick: backToChat,
                style: { marginTop: 1 },
              },
              h(BackIcon),
            ),
            h(
              'div',
              { className: 'dsh-cs-titleblock' },
              crumb ? h('span', { className: 'dsh-cs-crumb' }, crumb) : null,
              h('h1', { className: 'dsh-cs-title', id: 'dsh-cs-page-title' }, view.title),
              h('p', { className: 'dsh-cs-desc', title: view.desc }, view.desc),
            ),
            h('div', { className: 'dsh-cs-actions', ref: actionsRef }, headActions, menu),
          ),
          h('nav', { className: 'dsh-cs-subnav', 'aria-label': ws.title + '子视图' }, viewChips),
          handoffBar,
          h('div', { className: 'dsh-cs-body', 'aria-labelledby': 'dsh-cs-page-title' }, panes, fab),
        ),
      );
    }

    /* ------------------------------------------------------------ 写入输入框 */

    function setNativeValue(el, value) {
      var proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function findMediaInputs() {
      var pane = paneEl('media-desk');
      if (!pane) return null;
      var idea = pane.querySelector('input[placeholder*="记下一个灵感"]');
      var composer = pane.querySelector('textarea');
      return { idea: idea, composer: composer };
    }

    function focusIdeaInput() {
      var fields = findMediaInputs();
      if (!fields) return;
      var target = fields.idea || fields.composer;
      if (target) {
        target.focus({ preventScroll: true });
        try {
          target.setSelectionRange(target.value.length, target.value.length);
        } catch (error) {
          /* ignore */
        }
      }
    }

    function writeComposer(text) {
      var fields = findMediaInputs();
      if (!fields) return false;
      var target = fields.composer || fields.idea;
      if (!target) return false;
      setNativeValue(target, text);
      target.focus({ preventScroll: true });
      try {
        target.setSelectionRange(text.length, text.length);
      } catch (error) {
        /* ignore */
      }
      return true;
    }

    // 助手抽屉是懒挂载的：打开后 textarea 才出现，写入要等它真的在 DOM 里
    function writeComposerWhenReady(text, attempt) {
      if (writeComposer(text)) return;
      if (attempt < 20) {
        setTimeout(function () { writeComposerWhenReady(text, (attempt || 0) + 1); }, 250);
      }
    }

    /* ------------------------------------------------- 启动 vendor client 半边 */

    // vendor client 原本各注册一条侧栏行；合并后只保留「创作台」，因此给它们一个
    // 受限 ctx：sidebar.panellist 的注册/注入被丢弃，其余能力原样转发。
    function createVendorCtx(ctx) {
      var noop = function () {};

      var slotsFacade = new Proxy(ctx.slots, {
        get: function (target, prop) {
          if (prop === 'inject') {
            return function (name, callback) {
              if (name === 'sidebar.panellist') return noop;
              return target.inject(name, callback);
            };
          }
          if (prop === 'register') {
            return function (info, component) {
              if (info && info.name === 'sidebar.panellist') return noop;
              return target.register(info, component);
            };
          }
          var value = target[prop];
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });

      return new Proxy(ctx, {
        get: function (target, prop) {
          if (prop === 'slots') return slotsFacade;
          var value = target[prop];
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    }

    function bootVendored(ctx, factories) {
      var vendorCtx = createVendorCtx(ctx);

      var mediaDesk = factories.mediaDesk && factories.mediaDesk(require);
      if (mediaDesk && typeof mediaDesk.apply === 'function') {
        mediaDesk.apply(vendorCtx);
      } else {
        console.error('[dsh-creative-studio] media-desk client 没有 apply 导出');
      }

      var guizang = factories.guizang && factories.guizang(require);
      if (guizang && typeof guizang.apply === 'function') {
        guizang.apply(vendorCtx);
      } else {
        console.error('[dsh-creative-studio] guizang-design client 没有 apply 导出');
      }
    }

    /* ---------------------------------------- vendor 按需加载（2026-11-20） */

    // 这两个 factory 合计约 270KB，原先内联在 client.js 里，会跟着插件在 DSH 启动时
    // 一起下载。现在外置到 /media-desk/assets/vendor-factories.js，用户第一次打开
    // 「创作台」时才拉。
    var VENDOR_FACTORIES_URL = '/media-desk/assets/vendor-factories.js';
    var VENDOR_STATE = { promise: null, booting: null, booted: false };

    function loadVendorFactories() {
      if (window.__DSH_CS_FACTORIES__) {
        return Promise.resolve(window.__DSH_CS_FACTORIES__);
      }
      if (VENDOR_STATE.promise) return VENDOR_STATE.promise;

      VENDOR_STATE.promise = new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = VENDOR_FACTORIES_URL;
        script.async = true;
        script.onload = function () {
          if (window.__DSH_CS_FACTORIES__) resolve(window.__DSH_CS_FACTORIES__);
          else reject(new Error('已加载但没有导出 __DSH_CS_FACTORIES__'));
        };
        script.onerror = function () {
          VENDOR_STATE.promise = null;
          reject(new Error('vendor-factories.js 加载失败'));
        };
        document.head.appendChild(script);
      });
      return VENDOR_STATE.promise;
    }

    function ensureVendorsBooted() {
      if (VENDOR_STATE.booted || !CONTEXT) return Promise.resolve(VENDOR_STATE.booted);
      if (VENDOR_STATE.booting) return VENDOR_STATE.booting;

      VENDOR_STATE.booting = loadVendorFactories()
        .then(function (factories) {
          bootVendored(CONTEXT, factories || {});
          VENDOR_STATE.booted = true;
          return true;
        })
        .catch(function (error) {
          VENDOR_STATE.booting = null;
          console.error('[dsh-creative-studio] vendor client 懒加载失败', error);
          return false;
        });
      return VENDOR_STATE.booting;
    }

    /* ---------------------------------------------------------------- apply */

    function apply(ctx) {
      CONTEXT = ctx;
      var disposers = [];

      try {
        var slots = ctx.slots;
        disposers.push(
          slots.inject('sidebar.panellist', function () {
            return slots.register(
              {
                name: 'sidebar.panellist',
                id: PANEL_ID,
                order: PANEL_ORDER,
                label: function () {
                  return '创作台';
                },
              },
              CreativeIcon,
            );
          }),
        );
        disposers.push(
          slots.inject('main', function () {
            return slots.register(
              {
                name: 'main',
                key: PANEL_ID,
              },
              CreativeStudioPage,
            );
          }),
        );
      } catch (error) {
        console.warn('[dsh-creative-studio] 侧栏/主面板注册失败', error);
      }

      ctx.effect(function () {
        var style = document.createElement('style');
        style.setAttribute('data-dsh-creative-studio', 'style');
        style.textContent = STYLE_TEXT + MEDIA_EXTRA_CSS;
        document.head.appendChild(style);

        // vendor client 改为懒加载：不在这里启动，等用户第一次进入「创作台」
        // 时由 CreativeStudioPage 的 effect 调 ensureVendorsBooted()。

        return function () {
          if (style.parentNode) style.parentNode.removeChild(style);
          for (var i = 0; i < disposers.length; i += 1) {
            try {
              disposers[i]();
            } catch (error) {
              /* ignore */
            }
          }
          disposers.length = 0;
          CONTEXT = null;
          PANE_REFS = {};
        };
      }, 'dsh-creative-studio: ui mounts');
    }

    exports.isPlugin = true;
    exports.inject = ['slots', 'layout'];
    exports.apply = apply;

    return module.exports;
  },
});
