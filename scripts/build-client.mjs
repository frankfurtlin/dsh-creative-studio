#!/usr/bin/env node
// 生成 client.js：把两个 vendor client 的 factory 源码内联进 src/client.js。
//
// 为什么需要这一步：DSH 一个包只能声明一个 client bundle（exports["./client"]），
// 而 dsh-media-desk / dsh-guizang-design 各带一份 browser bundle。做法是把它们
// `window.__ModuleLoader__.load({... factory})` 里的 factory 函数取出来，作为普通
// 函数内联进我们的 factory，然后在 apply 时用受限 ctx 调用它们的 apply()。
//
// 取 factory 的方式不是切字符串，而是用一个假的 `window.__ModuleLoader__` 执行
// 原文件、把 load() 的参数截下来，再用 Function.prototype.toString() 序列化。
// 这样对上游代码的格式变化（空格、注释、非压缩版）都不敏感。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const VENDORED = [
  {
    name: 'media-desk',
    varName: '__mediaDeskFactory',
    file: join(ROOT, 'vendor/media-desk/dist/client.js'),
  },
  {
    name: 'guizang-design',
    varName: '__guizangDesignFactory',
    file: join(ROOT, 'vendor/guizang-design/lib/client.js'),
  },
];

const MARKER = '/*__VENDORED_FACTORIES__*/';

// 品牌归一：两个 vendor bundle 里残留的第三方插件名（侧栏标签、better-sidebar tab、
// 页面标题/文案）统一换成「创作台」自己的叫法，避免界面上出现别人的产品名。
const BRAND_PATCHES = {
  'media-desk': [
    // zh 文案里被 esbuild 转义的「自媒体工作台」→「内容创作」
    ['\\u81EA\\u5A92\\u4F53\\u5DE5\\u4F5C\\u53F0', '\\u5185\\u5BB9\\u521B\\u4F5C'],
    ['Media Desk', 'Content Studio'],
    // 回归修复（2026-11-18）：界面残留的英文
    // 1) 排期页月卡的英文月份 → 1 月…12 月
    [
      '["January","February","March","April","May","June","July","August","September","October","November","December"]',
      '["1 月","2 月","3 月","4 月","5 月","6 月","7 月","8 月","9 月","10 月","11 月","12 月"]',
    ],
    // 2) 风格页「导出为 Skill」/「已导出 Skill」→ 技能（字典仍留旧 key，取不到就回退为中文原文）
    ['\\u5BFC\\u51FA\\u4E3A Skill', '\\u5BFC\\u51FA\\u4E3A\\u6280\\u80FD'],
    ['\\u5DF2\\u5BFC\\u51FA Skill', '\\u5DF2\\u5BFC\\u51FA\\u6280\\u80FD'],
    // 3) 设置里的语言选项 English → 英文
    ['label:()=>"English"', 'label:()=>"\\u82F1\\u6587"'],
  ],
  'guizang-design': [
    [
      "const LABEL = { zh: '歸藏设计', en: 'Guizang Design' }",
      "const LABEL = { zh: '创作台 · 设计', en: 'Creative Studio · Design' }",
    ],
  ],
};

function applyBrandPatches(entry, serialized) {
  const patches = BRAND_PATCHES[entry.name] || [];
  let text = serialized;
  for (const [from, to] of patches) {
    if (!text.includes(from)) {
      console.warn(`[build] ${entry.name}: 没找到品牌文案 ${JSON.stringify(from)}（上游可能改版）`);
      continue;
    }
    text = text.split(from).join(to);
  }
  return text;
}

function captureFactory(entry) {
  const source = readFileSync(entry.file, 'utf8');
  const loads = [];

  // 原文件是浏览器脚本，只依赖 window.__ModuleLoader__.load；用一个假的 window
  // 在 node 里跑一遍，把 load 的参数截下来即可，不执行 factory 本身。
  const run = new Function('window', source);
  run({
    __ModuleLoader__: {
      load(options) {
        loads.push(options);
      },
    },
  });

  if (loads.length !== 1) {
    throw new Error(`${entry.name}: 期望恰好一次 __ModuleLoader__.load，实际 ${loads.length} 次`);
  }
  const { id, factory } = loads[0];
  if (typeof factory !== 'function') {
    throw new Error(`${entry.name}: factory 不是函数（${typeof factory}）`);
  }

  const serialized = applyBrandPatches(entry, factory.toString());
  // 内联后必须能作为表达式单独通过语法检查。
  new Function('require', `return (${serialized});`);

  return { id, serialized };
}

function build() {
  const templatePath = join(ROOT, 'src/client.js');
  const template = readFileSync(templatePath, 'utf8');
  if (!template.includes(MARKER)) {
    throw new Error(`src/client.js 里找不到标记 ${MARKER}`);
  }

  const lines = ['    /* ---- 以下两个 factory 由 scripts/build-client.mjs 自动生成，勿手改 ---- */'];
  for (const entry of VENDORED) {
    const { id, serialized } = captureFactory(entry);
    lines.push(`    // vendored: ${id} ← ${entry.file.slice(ROOT.length + 1)}`);
    lines.push(`    var ${entry.varName} = ${serialized};`);
    lines.push('');
  }

  const output = template.split(MARKER).join(lines.join('\n'));

  // 生成物必须是合法脚本（不能有语法错误，也不能因为源码格式变化而漏出标记）。
  new Function(output); // 会在语法错误时抛 SyntaxError

  const target = join(ROOT, 'client.js');
  const banner =
    '/* GENERATED FILE — do not edit. 修改 src/client.js 后运行 `npm run build:client`。 */\n';
  writeFileSync(target, banner + output, 'utf8');

  console.log(`built ${target} (${output.length} chars)`);
  for (const entry of VENDORED) {
    console.log(`  inline ${entry.name}`);
  }
}

build();
