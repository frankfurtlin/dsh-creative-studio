/* dsh-creative-studio · client 半片（源码）
 *
 * 本文件是手写源码；仓库根目录的 client.js 由 `npm run build:client` 生成：
 *   src/client.js + vendor/media-desk/dist/client.js + vendor/guizang-design/lib/client.js
 * 生成的 client.js 不要手改。
 *
 * 结构：
 *   · 侧栏只注册一条「创作台」（order 6）。
 *   · 主面板 = 顶部 tab 条 + 两个 pane，pane 里的组件来自两个 vendor client 注册在
 *     `main` 槽里的 entry（`ctx.slots.entriesOfSlot('main')`），按 key 取：
 *     'media-desk' / 'guizang-design'。
 *   · 两个 vendor client 由本文件在 apply 时以「受限 ctx」调用：它们的
 *     sidebar.panellist 注册被丢弃（否则会出现三条侧栏行），main / betterSidebar /
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
    var STORAGE_KEY = 'dsh-creative-studio:tab';

    var TABS = [
      {
        id: 'media-desk',
        title: '内容创作',
        hint: '灵感、内容、排期、复盘、风格',
      },
      {
        id: 'guizang-design',
        title: '设计',
        hint: '网页 PPT、图文卡片、网页排版、去 AI 味',
      },
      {
        id: 'studio-elements',
        title: '设计元素',
        hint: '组件库：落地页、书本、场景、背景场、控件',
        kind: 'iframe',
        src: '/studio-elements/',
        // 宿主路由只在 DSH 启动时注册；还没重启过就先别把 404 页面塞进 iframe
        probe: '/studio-elements/',
      },
      {
        id: 'pixel-logo',
        title: 'Logo',
        hint: '像素 / 矢量 Logo 编辑器',
        kind: 'iframe',
        src: '/pixel-logo/',
      },
    ];

    var CONTEXT = null; // apply 时拿到的 client ctx

/*__VENDORED_FACTORIES__*/

    /* ---------------------------------------------------------------- 样式 */

    // 创作台浅色规范（v1）。三个 tab 共用同一套 token：
    //   bg/surface/raised   #f5f5f3 / #fbfbf9 / #ffffff
    //   line 三档            #e3e3df / #ededeb / #cdcdc7
    //   ink 三档             #141414 / #4d4d49 / #787874
    //   accent               #1f7a68（交互/选中），primary 按钮用墨黑 #141414
    //   圆角                  控件 8px、卡片 12px、面板 16px
    //   字体                  Inter + Noto Sans SC；等宽 JetBrains Mono
    // 同时把 media-desk 用到的 DSH 语义 token 钉在容器上，保证它永远是浅色，
    // 不跟随宿主明暗主题。
    var STYLE_TEXT = [
      '.dsh-cs-root{',
      '--cs-bg:#f5f5f3;--cs-surface:#fbfbf9;--cs-raised:#ffffff;',
      '--cs-line:#e3e3df;--cs-line-subtle:#ededeb;--cs-line-strong:#cdcdc7;',
      '--cs-ink:#141414;--cs-ink-2:#4d4d49;--cs-ink-3:#787874;',
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
      'position:relative;display:flex;flex-direction:column;width:100%;height:100%;min-height:0;overflow:hidden;',
      'background:var(--cs-bg);color:var(--cs-ink);font-family:var(--cs-font);font-size:14px;line-height:22px;',
      '-webkit-font-smoothing:antialiased}',
      '.dsh-cs-bar{flex:none;display:flex;align-items:center;gap:10px;height:46px;padding:0 12px;',
      'border-bottom:1px solid var(--cs-line);background:var(--cs-surface)}',
      '.dsh-cs-brand{flex:none;display:inline-flex;align-items:center;gap:7px;color:var(--cs-ink)}',
      '.dsh-cs-brand svg{opacity:.9}',
      '.dsh-cs-brand span{font-size:13px;font-weight:600;letter-spacing:.01em;white-space:nowrap}',
      '.dsh-cs-sep{flex:none;width:1px;height:18px;margin:0 8px 0 2px;background:var(--cs-line)}',
      '.dsh-cs-tabs{display:flex;align-items:center;gap:2px;padding:2px;border-radius:10px;background:var(--cs-hover)}',
      '.dsh-cs-tab{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;',
      'border:0;border-radius:var(--cs-r-sm);background:transparent;color:var(--cs-ink-2);',
      'font:inherit;font-size:13px;line-height:1;cursor:pointer;white-space:nowrap}',
      '.dsh-cs-tab:hover{color:var(--cs-ink);background:var(--cs-hover)}',
      '.dsh-cs-tab:focus-visible{outline:2px solid var(--cs-accent);outline-offset:1px}',
      '.dsh-cs-tab.is-on{background:var(--cs-raised);color:var(--cs-ink);',
      'box-shadow:0 1px 2px rgba(20,20,20,.08),inset 0 0 0 1px var(--cs-line)}',
      '.dsh-cs-tab svg{flex:none;opacity:.9}',
      '.dsh-cs-spacer{flex:1 1 auto;min-width:8px}',
      '.dsh-cs-hint{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      'font-family:var(--cs-mono);font-size:11px;line-height:16px;letter-spacing:.02em;color:var(--cs-ink-3)}',
      '.dsh-cs-back{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;',
      'border:0;border-radius:var(--cs-r-sm);background:transparent;color:var(--cs-ink-2);cursor:pointer}',
      '.dsh-cs-back:hover{background:var(--cs-hover);color:var(--cs-ink)}',
      '.dsh-cs-back:focus-visible{outline:2px solid var(--cs-accent);outline-offset:1px}',
      '.dsh-cs-body{position:relative;flex:1 1 auto;min-height:0;background:var(--cs-bg)}',
      '.dsh-cs-pane{position:absolute;inset:0;min-height:0;overflow:hidden;background:var(--cs-bg)}',
      '.dsh-cs-pane[hidden]{display:none}',
      '.dsh-cs-frame{display:block;width:100%;height:100%;border:0;background:var(--cs-bg)}',
      '.dsh-cs-empty{display:flex;align-items:center;justify-content:center;height:100%;font-size:13px;color:var(--cs-ink-3)}',
      '.dsh-cs-error{margin:16px;padding:14px 16px;border:1px solid var(--cs-line);border-radius:var(--cs-r-md);',
      'background:var(--cs-raised);color:var(--cs-ink);font-size:13px;line-height:20px;white-space:pre-wrap}',
      '.dsh-cs-error strong{display:block;margin-bottom:4px}',
      '@media (max-width: 720px){.dsh-cs-hint{display:none}}',
      '@media (max-width: 520px){.dsh-cs-brand span{display:none}.dsh-cs-sep{margin-right:8px}}',
    ].join('');

    // 设计页（/guizang-design/ iframe）的浅色覆盖：中立色、字体、圆角。
    // 卡片上的瑞士风彩色是内容，不动。
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
      'html[data-cs-studio] .nav-count{border-radius:999px}',
      'html[data-cs-studio] .thumb,html[data-cs-studio] .work-open{border-radius:8px}',
      'html[data-cs-studio] .btn,html[data-cs-studio] .ibtn,html[data-cs-studio] .pill,',
      'html[data-cs-studio] .state,html[data-cs-studio] .search,html[data-cs-studio] .search input{',
      'border-radius:8px}',
      'html[data-cs-studio] .stat{border-radius:12px}',
      'html[data-cs-studio] .eyebrow,html[data-cs-studio] .sec-head,html[data-cs-studio] .rail-foot{',
      'font-family:var(--font-mono);letter-spacing:.04em}',
    ].join('');

    // Logo 编辑器（/pixel-logo/ iframe）的浅色外壳覆盖。
    // 画布与预览 canvas 里的深底来自作品数据（project.background），属于内容，
    // 保留原样，否则白色像素会看不见。
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
    ].join('');

    // 设计元素（/studio-elements/ iframe）的浅色外壳覆盖。
    // 组件库原本是深色画廊（独立项目时的配色）；并进创作台后，侧栏/顶栏/卡片/按钮
    // 换成创作台浅色规范，但组件舞台（.cell .boxx、.focus-frame）保持深底——
    // 那是 WebGL 演示的画布，属于内容。
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
    ].join('');

    // 内容创作右栏「灵感卡」：卡片内容整体居中排布。
    // 上游是左对齐的表单式排版（标题/正文贴左、控件拉满），这里只调整对齐方式，
    // 不改结构与交互。
    var MEDIA_CARD_CSS = [
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
    ].join('');

    // 同源 iframe：把上面的覆盖样式注入进去，并让设计页始终停在浅色 scheme。
    function attachStudioTheme(frame, kind) {
      var observer = null;
      var disposed = false;
      var css = kind === 'pixel-logo' ? LOGO_THEME_CSS
        : kind === 'studio-elements' ? ELEMENTS_THEME_CSS
        : DESIGN_THEME_CSS;

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

        if (kind !== 'pixel-logo' && kind !== 'studio-elements') {
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
        // 重新挂到末尾，保证晚于页面自带样式表
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

      // 页面里的 JS 会在 load 之后继续渲染，稍后再补一次
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

    function TabIcon(props) {
      if (props.id === 'media-desk') {
        return makeSvg(14, [
          h('path', { key: 'bulb', d: 'M8 2.4a3.4 3.4 0 0 1 1.9 6.2c-.5.35-.8.9-.8 1.5v.3H6.9v-.3c0-.6-.3-1.15-.8-1.5A3.4 3.4 0 0 1 8 2.4Z' }),
          h('path', { key: 'base', d: 'M6.7 13.1h2.6' }),
        ]);
      }
      if (props.id === 'pixel-logo') {
        return makeSvg(14, [
          h('rect', { key: 'p1', x: 2.2, y: 2.2, width: 4.6, height: 4.6, rx: 1 }),
          h('rect', { key: 'p2', x: 9.2, y: 2.2, width: 4.6, height: 4.6, rx: 1 }),
          h('rect', { key: 'p3', x: 2.2, y: 9.2, width: 4.6, height: 4.6, rx: 1 }),
          h('rect', { key: 'p4', x: 9.2, y: 9.2, width: 4.6, height: 4.6, rx: 1 }),
        ]);
      }
      return makeSvg(14, [
        h('path', { key: 'pen', d: 'M3 13l1-3.4 7.2-7.2a1.3 1.3 0 0 1 1.9 1.9L5.9 11.5 3 13Z' }),
        h('path', { key: 'nib', d: 'M10.2 3.6l2.2 2.2' }),
      ]);
    }

    function BackIcon() {
      return makeSvg(15, [h('path', { key: 'arrow', d: 'M9.8 4.2 6 8l3.8 3.8' })]);
    }

    /* ---------------------------------------------------------------- 工具 */

    function findTab(id) {
      for (var i = 0; i < TABS.length; i += 1) {
        if (TABS[i].id === id) return TABS[i];
      }
      return null;
    }

    function readTab() {
      try {
        var saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved && findTab(saved)) return saved;
      } catch (error) {
        /* localStorage 不可用时退回默认 tab */
      }
      return TABS[0].id;
    }

    function isRenderable(value) {
      if (typeof value === 'function') return true;
      if (value && typeof value === 'object' && typeof React.isValidElementType === 'function') {
        return React.isValidElementType(value);
      }
      return false;
    }

    function backToChat() {
      try {
        if (CONTEXT && CONTEXT.layout) CONTEXT.layout.selectPanel(null);
      } catch (error) {
        console.warn('[dsh-creative-studio] 返回对话失败', error);
      }
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
          this.state.error && this.state.error.message
            ? this.state.error.message
            : String(this.state.error);
        return h(
          'div',
          { className: 'dsh-cs-error' },
          h('strong', null, (this.props.title || '面板') + ' 暂时无法显示'),
          h('div', null, 'DSH 控制台里有完整堆栈。原始信息：' + message),
        );
      }
    }

    /* ------------------------------------------------------------- 单个 pane */

    function TabPane(props) {
      var tab = findTab(props.id) || { title: props.id };
      var paneRef = React.useRef(null);
      // 带 probe 的 iframe tab：先探一下路由在不在（插件 host 代码只在 DSH 启动时加载，
      // 加完 tab 还没重启服务时，直接塞 iframe 只会看到 404）。探不到就显示一句人话。
      var probeState = React.useState(tab.probe ? 'checking' : 'ready');
      React.useEffect(
        function () {
          if (!tab.probe) return undefined;
          var cancelled = false;
          fetch(tab.probe, { method: 'HEAD', cache: 'no-store' })
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
        [tab.probe],
      );
      var content;

      // 两个工作台都靠 iframe 承载（Logo 是我们自己建的，设计是 vendor 组件建的）。
      // 同源，所以把浅色覆盖样式直接注入 iframe 文档；用 MutationObserver 兜底
      // vendor 晚挂载 iframe 的情况。
      var themed = tab.kind === 'iframe' || tab.id === 'guizang-design';
      React.useEffect(function () {
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
            disposers.push(attachStudioTheme(frame, tab.id));
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
      }, [tab.id, themed]);

      if (tab.kind === 'iframe' && tab.probe && probeState[0] !== 'ready') {
        // 探测中就等一小会儿再挂 iframe，免得先闪一下 404 的页面
        content = h(
          'div',
          { className: 'dsh-cs-empty' },
          probeState[0] === 'checking'
            ? '正在加载「' + tab.title + '」…'
            : '「' + tab.title + '」页面还没启用：新路由要重启 DSH 才会注册，重启后刷新本页即可。',
        );
      } else if (tab.kind === 'iframe') {
        content = h('iframe', {
          className: 'dsh-cs-frame',
          src: tab.src,
          title: tab.title,
          allow: 'fullscreen',
        });
      } else {
        var entry = useMainEntry(props.id);
        var Component = entry && isRenderable(entry.component) ? entry.component : null;
        content = Component
          ? h(PaneBoundary, { title: tab.title }, h(Component))
          : h('div', { className: 'dsh-cs-empty' }, '面板加载中…');
      }

      return h(
        'div',
        {
          ref: paneRef,
          className: 'dsh-cs-pane',
          role: 'tabpanel',
          hidden: !props.active,
          'aria-hidden': props.active ? 'false' : 'true',
        },
        content,
      );
    }

    /* -------------------------------------------------------------- 主面板 */

    function CreativeStudioPage() {
      var state = React.useState(readTab);
      var activeId = state[0];
      var setActiveId = state[1];

      // 记录访问过的 tab：只有进过一次才挂载，之后 display:none 保留状态。
      var visited = React.useRef({});
      visited.current[activeId] = true;

      var activeTab = findTab(activeId) || TABS[0];

      var onSelect = React.useCallback(function (id) {
        if (!findTab(id)) return;
        setActiveId(function (prev) {
          return prev === id ? prev : id;
        });
        try {
          window.localStorage.setItem(STORAGE_KEY, id);
        } catch (error) {
          /* ignore */
        }
      }, []);

      var panes = [];
      for (var i = 0; i < TABS.length; i += 1) {
        var tab = TABS[i];
        if (!visited.current[tab.id]) continue;
        panes.push(h(TabPane, { key: tab.id, id: tab.id, active: tab.id === activeId }));
      }

      var tabButtons = TABS.map(function (tab) {
        var on = tab.id === activeId;
        return h(
          'button',
          {
            key: tab.id,
            type: 'button',
            role: 'tab',
            'aria-selected': on ? 'true' : 'false',
            className: 'dsh-cs-tab' + (on ? ' is-on' : ''),
            title: tab.hint,
            onClick: function () {
              onSelect(tab.id);
            },
          },
          h(TabIcon, { id: tab.id }),
          h('span', null, tab.title),
        );
      });

      return h(
        'div',
        { className: 'dsh-cs-root' },
        h(
          'div',
          { className: 'dsh-cs-bar' },
          h(
            'div',
            { className: 'dsh-cs-brand', title: '创作台 · dsh-creative-studio' },
            h(CreativeIcon, { size: 15 }),
            h('span', null, '创作台'),
          ),
          h('div', { className: 'dsh-cs-sep', 'aria-hidden': 'true' }),
          h('div', { className: 'dsh-cs-tabs', role: 'tablist', 'aria-label': '创作台' }, tabButtons),
          h('div', { className: 'dsh-cs-spacer' }),
          h('span', { className: 'dsh-cs-hint' }, activeTab.hint),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-cs-back',
              title: '返回对话',
              'aria-label': '返回对话',
              onClick: backToChat,
            },
            h(BackIcon),
          ),
        ),
        h('div', { className: 'dsh-cs-body' }, panes),
      );
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

    function bootVendored(ctx) {
      var vendorCtx = createVendorCtx(ctx);

      var mediaDesk = __mediaDeskFactory(require);
      if (mediaDesk && typeof mediaDesk.apply === 'function') {
        mediaDesk.apply(vendorCtx);
      } else {
        console.error('[dsh-creative-studio] media-desk client 没有 apply 导出');
      }

      var guizang = __guizangDesignFactory(require);
      if (guizang && typeof guizang.apply === 'function') {
        guizang.apply(vendorCtx);
      } else {
        console.error('[dsh-creative-studio] guizang-design client 没有 apply 导出');
      }
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
        style.textContent = STYLE_TEXT + MEDIA_CARD_CSS;
        document.head.appendChild(style);

        try {
          bootVendored(ctx);
        } catch (error) {
          console.error('[dsh-creative-studio] vendor client 启动失败', error);
        }

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
        };
      }, 'dsh-creative-studio: ui mounts');
    }

    exports.isPlugin = true;
    exports.inject = ['slots', 'layout'];
    exports.apply = apply;

    return module.exports;
  },
});
