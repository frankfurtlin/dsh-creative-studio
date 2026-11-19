"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const PRESET_CONFIG = Object.freeze({
  full: { source: "data/full-project.json", label: "全称", zoomGroup: "wordmark" },
  "symbol-o3-core": { source: "data/symbol-o3-core.json", label: "O3 核心", zoomGroup: "symbol" },
  "symbol-o3-micro": { source: "data/symbol-o3-micro.json", label: "O3 微型", zoomGroup: "symbol" },
});

const elements = {
  editorCanvas: $("#editorCanvas"),
  canvasViewport: $("#canvasViewport"),
  previewCanvas: $("#previewCanvas"),
  previewFrame: $("#previewFrame"),
  layerList: $("#layerList"),
  projectName: $("#projectName"),
  projectMeta: $("#projectMeta"),
  saveState: $("#saveState"),
  undoBtn: $("#undoBtn"),
  redoBtn: $("#redoBtn"),
  saveVersionBtn: $("#saveVersionBtn"),
  versionDialog: $("#versionDialog"),
  versionForm: $("#versionForm"),
  versionName: $("#versionName"),
  versionList: $("#versionList"),
  zoomRange: $("#zoomRange"),
  zoomOutBtn: $("#zoomOutBtn"),
  zoomValue: $("#zoomValue"),
  zoomInBtn: $("#zoomInBtn"),
  fitCanvasBtn: $("#fitCanvasBtn"),
  gridToggle: $("#gridToggle"),
  referenceToggle: $("#referenceToggle"),
  referenceOpacity: $("#referenceOpacity"),
  circleToggle: $("#circleToggle"),
  cursorReadout: $("#cursorReadout"),
  canvasReadout: $("#canvasReadout"),
  activeLayerReadout: $("#activeLayerReadout"),
  offsetReadout: $("#offsetReadout"),
  layerOffsetX: $("#layerOffsetX"),
  layerOffsetY: $("#layerOffsetY"),
  mappingReadout: $("#mappingReadout"),
  addLayerBtn: $("#addLayerBtn"),
  duplicateLayerBtn: $("#duplicateLayerBtn"),
  deleteLayerBtn: $("#deleteLayerBtn"),
  layerBlendMode: $("#layerBlendMode"),
  resetOffsetBtn: $("#resetOffsetBtn"),
  importReferenceBtn: $("#importReferenceBtn"),
  referenceFile: $("#referenceFile"),
  resetProjectBtn: $("#resetProjectBtn"),
  exportScale: $("#exportScale"),
  importProjectBtn: $("#importProjectBtn"),
  projectFile: $("#projectFile"),
  addAsteriskBtn: $("#addAsteriskBtn"),
  importVectorBtn: $("#importVectorBtn"),
  vectorFile: $("#vectorFile"),
  vectorControls: $("#vectorControls"),
  vectorX: $("#vectorX"),
  vectorY: $("#vectorY"),
  vectorWidth: $("#vectorWidth"),
  vectorHeight: $("#vectorHeight"),
  vectorAspectLock: $("#vectorAspectLock"),
  vectorAspectValue: $("#vectorAspectValue"),
  vectorRotation: $("#vectorRotation"),
  layersSection: $("#layersSection"),
  moveLayerSection: $("#moveLayerSection"),
  pixelToolsSection: $("#pixelToolsSection"),
  opticalControls: $("#opticalControls"),
  opticalPreset: $("#opticalPreset"),
  opticalPreserveSpacing: $("#opticalPreserveSpacing"),
  opticalScaleX: $("#opticalScaleX"),
  opticalScaleY: $("#opticalScaleY"),
  opticalTranslateX: $("#opticalTranslateX"),
  opticalTranslateY: $("#opticalTranslateY"),
  opticalSizeReadout: $("#opticalSizeReadout"),
  opticalSpacingReadout: $("#opticalSpacingReadout"),
  opticalLayoutReadout: $("#opticalLayoutReadout"),
  opticalSafetyReadout: $("#opticalSafetyReadout"),
  toast: $("#toast"),
};

const ui = {
  cellSize: 16,
  mode: "edit",
  tool: "draw",
  color: "white",
  previewBackground: "dark",
  circlePreview: false,
  gridVisible: true,
  referenceVisible: false,
  referenceOpacity: 0.42,
  drawing: false,
  strokeChanged: false,
  lastCell: null,
  activeZoomGroup: null,
  zoomByGroup: { wordmark: null, symbol: null },
};

let project = null;
let referenceImage = null;
let undoStack = [];
let redoStack = [];
let saveTimer = null;
let toastTimer = null;
let projectBaseline = null;

const ORIGINAL_SIX_ARM_ASTERISK = {
  name: "原创六臂星号",
  viewBox: [0, 0, 100, 100],
  path: "M 38.912 3 L 61.088 3 L 60.753 31.375 L 85.159 16.898 L 96.247 36.102 L 71.506 50 L 96.247 63.898 L 85.159 83.102 L 60.753 68.625 L 61.088 97 L 38.912 97 L 39.247 68.625 L 14.841 83.102 L 3.753 63.898 L 28.494 50 L 3.753 36.102 L 14.841 16.898 L 39.247 31.375 Z",
};

function deepClone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function projectContentSnapshot(value = project) {
  if (!value) return null;
  const comparable = deepClone(value);
  delete comparable.activeLayerId;
  if (comparable.reference) {
    delete comparable.reference.visible;
    delete comparable.reference.opacity;
  }
  return JSON.stringify(comparable);
}

function markProjectBaseline() {
  projectBaseline = projectContentSnapshot();
}

function hasProjectChanges() {
  return projectBaseline !== null && projectContentSnapshot() !== projectBaseline;
}

function createId(prefix = "layer") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeLayer(layer) {
  const normalized = {
    id: layer.id || createId(),
    name: layer.name || "未命名",
    type: layer.type || "pixel",
    blendMode: layer.blendMode === "erase" ? "erase" : "normal",
    visible: layer.visible !== false,
    locked: layer.locked === true,
    offsetX: Number(layer.offsetX || 0),
    offsetY: Number(layer.offsetY || 0),
  };
  if (normalized.type === "vector") {
    const width = Math.max(0.25, Number(layer.width || 6));
    const height = Math.max(0.25, Number(layer.height || 6));
    const storedRatio = Number(layer.aspectRatio);
    return {
      ...normalized,
      path: layer.path || "",
      viewBox: Array.isArray(layer.viewBox) ? layer.viewBox : [0, 0, 100, 100],
      x: Number(layer.x || 0),
      y: Number(layer.y || 0),
      width,
      height,
      lockAspectRatio: layer.lockAspectRatio !== false,
      aspectRatio: Number.isFinite(storedRatio) && storedRatio > 0 ? storedRatio : width / height,
      rotation: Number(layer.rotation || 0),
      color: layer.color || "white",
    };
  }
  return { ...normalized, cells: layer.cells || {} };
}

function normalizeOpticalAdjustment(adjustment) {
  if (!adjustment || !Array.isArray(adjustment.layerIds) || !adjustment.layerIds.length) return null;
  const numberOr = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    id: adjustment.id || "optical-adjustment",
    name: adjustment.name || "组合光学校正",
    layerIds: [...adjustment.layerIds],
    leftLayerIds: Array.isArray(adjustment.leftLayerIds) ? [...adjustment.leftLayerIds] : [],
    rightLayerIds: Array.isArray(adjustment.rightLayerIds) ? [...adjustment.rightLayerIds] : [],
    originX: numberOr(adjustment.originX, 0),
    originY: numberOr(adjustment.originY, 0),
    sourceWidth: numberOr(adjustment.sourceWidth, 17),
    scaleX: numberOr(adjustment.scaleX, 1),
    scaleY: numberOr(adjustment.scaleY, 1),
    translateX: numberOr(adjustment.translateX, 0),
    translateY: numberOr(adjustment.translateY, 0),
    preserveSpacing: adjustment.preserveSpacing !== false,
    preset: adjustment.preset || "custom",
    presets: Array.isArray(adjustment.presets) ? deepClone(adjustment.presets) : [],
  };
}

function normalizeProject(input) {
  const normalized = deepClone(input);
  normalized.schemaVersion = 1;
  normalized.width = Math.max(8, Number(normalized.width || 48));
  normalized.height = Math.max(8, Number(normalized.height || 20));
  normalized.capHeight = Number(normalized.capHeight || normalized.height);
  normalized.background = normalized.background || "#0c0c0c";
  normalized.palette = {
    white: "#ffffff",
    black: "#000000",
    accent: "#55d6be",
    ...(normalized.palette || {}),
  };
  normalized.layers = (normalized.layers || []).map(normalizeLayer);
  if (!normalized.layers.length) normalized.layers.push(createPixelLayer("图层 1"));
  if (!normalized.layers.some((layer) => layer.id === normalized.activeLayerId)) {
    normalized.activeLayerId = normalized.layers.at(-1).id;
  }
  normalized.reference = normalized.reference || null;
  normalized.opticalAdjustment = normalizeOpticalAdjustment(normalized.opticalAdjustment);
  return normalized;
}

function createPixelLayer(name) {
  return {
    id: createId(),
    name,
    type: "pixel",
    blendMode: "normal",
    visible: true,
    locked: false,
    offsetX: 0,
    offsetY: 0,
    cells: {},
  };
}

function activeLayer() {
  return project.layers.find((layer) => layer.id === project.activeLayerId) || project.layers.at(-1);
}

function isOpticalCompositionProject() {
  return project?.metadata?.editingMode === "optical-composition";
}

function activeOpticalAdjustment() {
  return project?.opticalAdjustment || null;
}

function opticalAdjustmentForLayer(layer) {
  const adjustment = activeOpticalAdjustment();
  if (!adjustment) return null;
  if (adjustment.layerIds.includes(layer.id)) return adjustment;
  if (!adjustment.preserveSpacing) return null;
  const sideShift = (adjustment.sourceWidth * (adjustment.scaleX - 1)) / 2;
  if (adjustment.leftLayerIds.includes(layer.id)) {
    return {
      originX: 0,
      originY: 0,
      scaleX: 1,
      scaleY: 1,
      translateX: -sideShift,
      translateY: 0,
    };
  }
  if (adjustment.rightLayerIds.includes(layer.id)) {
    return {
      originX: 0,
      originY: 0,
      scaleX: 1,
      scaleY: 1,
      translateX: sideShift,
      translateY: 0,
    };
  }
  return null;
}

function paletteColor(name, override = null) {
  if (override === "white") return "#ffffff";
  if (override === "black") return "#000000";
  if (override) return override;
  return project.palette[name] || name || "#ffffff";
}

function keyToPoint(key) {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

function pushUndo() {
  undoStack.push(JSON.stringify(project));
  if (undoStack.length > 100) undoStack.shift();
  redoStack.length = 0;
  updateUndoRedo();
}

function mutate(callback, { record = true, save = true } = {}) {
  if (record) pushUndo();
  callback();
  renderAll();
  if (save) scheduleSave();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(project));
  project = normalizeProject(JSON.parse(undoStack.pop()));
  afterProjectLoad({ resetHistory: false, fit: false });
  scheduleSave();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(project));
  project = normalizeProject(JSON.parse(redoStack.pop()));
  afterProjectLoad({ resetHistory: false, fit: false });
  scheduleSave();
}

function updateUndoRedo() {
  elements.undoBtn.disabled = undoStack.length === 0;
  elements.redoBtn.disabled = redoStack.length === 0;
}

function setSaveState(text, className = "") {
  elements.saveState.textContent = text;
  elements.saveState.className = `save-state ${className}`.trim();
}

function scheduleSave() {
  setSaveState("保存中", "saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveCurrentProject, 420);
}

async function saveCurrentProject() {
  localStorage.setItem("pixel-logo-lab-project", JSON.stringify(project));
  try {
    const response = await fetch("api/project", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error("服务器保存失败");
    setSaveState("已同步");
  } catch (error) {
    setSaveState("仅本机", "error");
  }
}

function zoomGroupForPreset(preset) {
  if (PRESET_CONFIG[preset]?.zoomGroup) return PRESET_CONFIG[preset].zoomGroup;
  if (String(preset || "").startsWith("symbol-o3-")) return "symbol";
  return "wordmark";
}

function zoomGroupForProject(candidate = project) {
  return zoomGroupForPreset(candidate?.metadata?.preset);
}

async function loadInitialProject() {
  try {
    const response = await fetch("api/project", { cache: "no-store" });
    if (!response.ok) throw new Error("工程接口不可用");
    project = normalizeProject(await response.json());
  } catch (error) {
    const cached = localStorage.getItem("pixel-logo-lab-project");
    if (cached) {
      project = normalizeProject(JSON.parse(cached));
      setSaveState("本机工程", "error");
    } else {
      const response = await fetch("data/full-project.json", { cache: "no-store" });
      project = normalizeProject(await response.json());
    }
  }
  afterProjectLoad();
  await loadVersions();
}

function afterProjectLoad({ resetHistory = true, fit = true, setBaseline = resetHistory } = {}) {
  const zoomGroup = zoomGroupForProject(project);
  const rememberedZoom = ui.zoomByGroup[zoomGroup];
  ui.activeZoomGroup = zoomGroup;
  elements.projectName.value = project.name;
  ui.referenceVisible = Boolean(project.reference?.visible);
  ui.referenceOpacity = Number(project.reference?.opacity ?? 0.42);
  elements.referenceToggle.checked = ui.referenceVisible;
  elements.referenceOpacity.value = Math.round(ui.referenceOpacity * 100);
  if (resetHistory) {
    undoStack = [];
    redoStack = [];
  }
  if (setBaseline) markProjectBaseline();
  loadReferenceImage();
  renderAll();
  if (fit) {
    requestAnimationFrame(() => {
      if (Number.isFinite(rememberedZoom)) setCellSize(rememberedZoom);
      else fitCanvas();
    });
  }
}

function setCellSize(value) {
  const minimum = Number(elements.zoomRange.min) || 1;
  const maximum = Number(elements.zoomRange.max) || 28;
  ui.cellSize = Math.max(minimum, Math.min(maximum, Math.round(Number(value) || 16)));
  elements.zoomRange.value = ui.cellSize;
  elements.zoomValue.value = `${ui.cellSize}px`;
  elements.zoomOutBtn.disabled = ui.cellSize <= minimum;
  elements.zoomInBtn.disabled = ui.cellSize >= maximum;
  if (ui.activeZoomGroup) ui.zoomByGroup[ui.activeZoomGroup] = ui.cellSize;
  renderEditor();
}

function stepCanvasZoom(delta) {
  const previousSize = ui.cellSize;
  const minimum = Number(elements.zoomRange.min) || 1;
  const maximum = Number(elements.zoomRange.max) || 28;
  const nextSize = Math.max(minimum, Math.min(maximum, previousSize + delta));
  if (nextSize === previousSize) return;

  const viewportRect = elements.canvasViewport.getBoundingClientRect();
  const pointerX = viewportRect.left + viewportRect.width / 2;
  const pointerY = viewportRect.top + viewportRect.height / 2;
  const canvasRect = elements.editorCanvas.getBoundingClientRect();
  const anchorX = (pointerX - canvasRect.left) / previousSize;
  const anchorY = (pointerY - canvasRect.top) / previousSize;
  setCellSize(nextSize);

  requestAnimationFrame(() => {
    const nextRect = elements.editorCanvas.getBoundingClientRect();
    elements.canvasViewport.scrollLeft += nextRect.left + anchorX * nextSize - pointerX;
    elements.canvasViewport.scrollTop += nextRect.top + anchorY * nextSize - pointerY;
  });
}

function fitCanvas() {
  if (!project || !elements.canvasViewport) return;
  const width = Math.max(160, elements.canvasViewport.clientWidth - 56);
  const height = Math.max(120, elements.canvasViewport.clientHeight - 56);
  const fitted = Math.floor(Math.min(width / project.width, height / project.height));
  if (fitted < 3) {
    ui.gridVisible = false;
    elements.gridToggle.checked = false;
  }
  setCellSize(fitted);
}

function zoomCanvasFromWheel(event) {
  if (!event.metaKey) return;
  event.preventDefault();
  const direction = Math.sign(event.deltaY);
  if (!direction) return;

  const previousSize = ui.cellSize;
  const nextSize = Math.max(1, Math.min(28, previousSize - direction));
  if (nextSize === previousSize) return;

  const canvasRect = elements.editorCanvas.getBoundingClientRect();
  const anchorX = (event.clientX - canvasRect.left) / previousSize;
  const anchorY = (event.clientY - canvasRect.top) / previousSize;
  const pointerX = event.clientX;
  const pointerY = event.clientY;
  setCellSize(nextSize);

  requestAnimationFrame(() => {
    const nextRect = elements.editorCanvas.getBoundingClientRect();
    elements.canvasViewport.scrollLeft += nextRect.left + anchorX * nextSize - pointerX;
    elements.canvasViewport.scrollTop += nextRect.top + anchorY * nextSize - pointerY;
  });
}

function loadReferenceImage() {
  referenceImage = null;
  if (!project.reference?.src) {
    renderAll();
    return;
  }
  const image = new Image();
  image.onload = () => {
    referenceImage = image;
    renderEditor();
  };
  image.onerror = () => showToast("原稿参考图加载失败");
  image.src = project.reference.src;
}

function renderAll() {
  if (!project) return;
  renderEditor();
  renderLayersPanel();
  renderPreviews();
  renderMetadata();
  renderOpticalControls();
  renderVectorControls();
  updateUndoRedo();
}

function renderMetadata() {
  const layer = activeLayer();
  if (document.activeElement !== elements.projectName) elements.projectName.value = project.name;
  $$('[data-preset]').forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === project.metadata?.preset);
  });
  elements.projectMeta.textContent = `${fontLabel(project.metadata?.font)} · ${project.width}×${project.height} 逻辑网格`;
  elements.canvasReadout.textContent = `${project.width} × ${project.height}`;
  elements.activeLayerReadout.textContent = `图层：${layer.name}`;
  const fractionalOffset = layer.type === "vector";
  elements.layerOffsetX.step = fractionalOffset ? "0.0001" : "1";
  elements.layerOffsetY.step = fractionalOffset ? "0.0001" : "1";
  elements.layerOffsetX.value = fractionalOffset ? formatPreciseValue(layer.offsetX) : String(Math.round(layer.offsetX));
  elements.layerOffsetY.value = fractionalOffset ? formatPreciseValue(layer.offsetY) : String(Math.round(layer.offsetY));
  elements.layerOffsetX.disabled = layer.locked;
  elements.layerOffsetY.disabled = layer.locked;
  const offsetXLabel = fractionalOffset ? formatPreciseValue(layer.offsetX) : String(Math.round(layer.offsetX));
  const offsetYLabel = fractionalOffset ? formatPreciseValue(layer.offsetY) : String(Math.round(layer.offsetY));
  elements.offsetReadout.textContent = `偏移 ΔX ${offsetXLabel}, ΔY ${offsetYLabel}`;
  elements.layerBlendMode.value = layer.blendMode;
  elements.mappingReadout.textContent = project.reference
    ? `${project.metadata?.source || "原稿参考"} · 每格 ${Number(project.reference.logicalCellSize || 0).toFixed(2)} 源像素`
    : "尚未导入原稿参考";
}

function fontLabel(font) {
  const raw = font || "";
  const custom = raw.match(/^Custom (\d+)-cell symbol grid$/);
  if (custom) return `自定义 ${custom[1]} 格符号网格`;
  if (!raw || raw === "Pixel grid") return "像素网格";
  const cap = raw.match(/^Logical cap height (\d+)$/);
  if (cap) return `大写逻辑高度 ${cap[1]}`;
  return raw;
}

function renderLayersPanel() {
  elements.layerList.innerHTML = "";
  [...project.layers].reverse().forEach((layer) => {
    const item = document.createElement("div");
    item.className = `layer-item ${layer.id === project.activeLayerId ? "active" : ""}`;
    const visibility = document.createElement("button");
    visibility.textContent = layer.visible ? "◉" : "○";
    visibility.title = layer.visible ? "隐藏图层" : "显示图层";
    visibility.addEventListener("click", (event) => {
      event.stopPropagation();
      mutate(() => (layer.visible = !layer.visible));
    });

    const label = document.createElement("button");
    label.className = "layer-name";
    const layerType = layer.type === "vector" ? "矢量" : `${Object.keys(layer.cells).length} 格`;
    const composite = layer.blendMode === "erase" ? " · 挖空" : "";
    label.innerHTML = `<span>${escapeHtml(layer.name)}</span><span class="layer-meta">${layerType}${composite}</span>`;
    label.addEventListener("click", () => {
      project.activeLayerId = layer.id;
      renderAll();
    });
    label.addEventListener("dblclick", () => {
      const name = prompt("图层名称", layer.name);
      if (name?.trim()) mutate(() => (layer.name = name.trim()));
    });

    const lock = document.createElement("button");
    lock.textContent = layer.locked ? "锁" : "开";
    lock.title = layer.locked ? "解除锁定" : "锁定图层";
    lock.addEventListener("click", (event) => {
      event.stopPropagation();
      mutate(() => (layer.locked = !layer.locked));
    });
    item.append(visibility, label, lock);
    item.addEventListener("click", () => {
      project.activeLayerId = layer.id;
      renderAll();
    });
    elements.layerList.append(item);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderEditor() {
  const canvas = elements.editorCanvas;
  const cell = ui.cellSize;
  canvas.width = project.width * cell;
  canvas.height = project.height * cell;
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.fillStyle = ui.mode === "clean" && ui.previewBackground === "light" ? "#f3f3ef" : project.background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (ui.mode === "edit" && ui.referenceVisible && referenceImage && project.reference?.crop) {
    const crop = project.reference.crop;
    context.save();
    context.globalAlpha = ui.referenceOpacity;
    context.imageSmoothingEnabled = true;
    context.drawImage(
      referenceImage,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    context.restore();
  }

  renderLayers(context, cell, { clipToCanvas: true, eraseColor: context.fillStyle });

  if (ui.mode === "edit" && ui.gridVisible) drawGrid(context, cell);
}

function drawGrid(context, cell) {
  context.save();
  context.lineWidth = 1;
  for (let x = 0; x <= project.width; x += 1) {
    context.strokeStyle = x % 5 === 0 ? "rgba(85,214,190,0.24)" : "rgba(255,255,255,0.10)";
    context.beginPath();
    context.moveTo(x * cell + 0.5, 0);
    context.lineTo(x * cell + 0.5, project.height * cell);
    context.stroke();
  }
  for (let y = 0; y <= project.height; y += 1) {
    context.strokeStyle = y % 5 === 0 ? "rgba(85,214,190,0.24)" : "rgba(255,255,255,0.10)";
    context.beginPath();
    context.moveTo(0, y * cell + 0.5);
    context.lineTo(project.width * cell, y * cell + 0.5);
    context.stroke();
  }
  context.restore();
}

function applyOpticalContextTransform(context, adjustment, outputScale) {
  if (!adjustment) return;
  context.translate(
    (adjustment.originX + adjustment.translateX) * outputScale,
    (adjustment.originY + adjustment.translateY) * outputScale,
  );
  context.scale(adjustment.scaleX, adjustment.scaleY);
  context.translate(-adjustment.originX * outputScale, -adjustment.originY * outputScale);
}

function transformOpticalPoint(x, y, adjustment) {
  if (!adjustment) return { x, y };
  return {
    x: adjustment.originX + adjustment.translateX + (x - adjustment.originX) * adjustment.scaleX,
    y: adjustment.originY + adjustment.translateY + (y - adjustment.originY) * adjustment.scaleY,
  };
}

function transformOpticalBounds(bounds, adjustment) {
  if (!bounds || !adjustment) return bounds;
  const corners = [
    transformOpticalPoint(bounds.minX, bounds.minY, adjustment),
    transformOpticalPoint(bounds.maxX, bounds.minY, adjustment),
    transformOpticalPoint(bounds.minX, bounds.maxY, adjustment),
    transformOpticalPoint(bounds.maxX, bounds.maxY, adjustment),
  ];
  return {
    minX: Math.min(...corners.map((point) => point.x)),
    minY: Math.min(...corners.map((point) => point.y)),
    maxX: Math.max(...corners.map((point) => point.x)),
    maxY: Math.max(...corners.map((point) => point.y)),
  };
}

function baseLayerBounds(layer) {
  if (layer.type === "vector") {
    return {
      minX: layer.x + layer.offsetX,
      minY: layer.y + layer.offsetY,
      maxX: layer.x + layer.offsetX + layer.width,
      maxY: layer.y + layer.offsetY + layer.height,
    };
  }
  const keys = Object.keys(layer.cells);
  if (!keys.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  keys.forEach((key) => {
    const point = keyToPoint(key);
    const x = point.x + layer.offsetX;
    const y = point.y + layer.offsetY;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + 1);
    maxY = Math.max(maxY, y + 1);
  });
  return { minX, minY, maxX, maxY };
}

function layerVisibleBounds(layer) {
  return transformOpticalBounds(baseLayerBounds(layer), opticalAdjustmentForLayer(layer));
}

function mergeBounds(boundsList, fallback = null) {
  const valid = boundsList.filter(Boolean);
  if (!valid.length) return fallback;
  return {
    minX: Math.min(...valid.map((bounds) => bounds.minX)),
    minY: Math.min(...valid.map((bounds) => bounds.minY)),
    maxX: Math.max(...valid.map((bounds) => bounds.maxX)),
    maxY: Math.max(...valid.map((bounds) => bounds.maxY)),
  };
}

function boundsForLayerIds(layerIds, { includeErase = false } = {}) {
  const ids = new Set(layerIds);
  return mergeBounds(
    project.layers
      .filter((layer) => layer.visible && ids.has(layer.id) && (includeErase || layer.blendMode !== "erase"))
      .map(layerVisibleBounds),
  );
}

function renderPixelLayer(context, layer, scale, colorOverride) {
  context.fillStyle = paletteColor(colorOverride || "white", colorOverride);
  if (typeof Path2D === "undefined") {
    Object.entries(layer.cells).forEach(([key, colorName]) => {
      const point = keyToPoint(key);
      context.fillStyle = paletteColor(colorName, colorOverride);
      context.fillRect(
        (point.x + layer.offsetX) * scale,
        (point.y + layer.offsetY) * scale,
        scale,
        scale,
      );
    });
    return;
  }
  const pathsByColor = new Map();
  Object.entries(layer.cells).forEach(([key, colorName]) => {
    const resolvedColor = paletteColor(colorName, colorOverride);
    if (!pathsByColor.has(resolvedColor)) pathsByColor.set(resolvedColor, new Path2D());
    const point = keyToPoint(key);
    pathsByColor.get(resolvedColor).rect(
      (point.x + layer.offsetX) * scale,
      (point.y + layer.offsetY) * scale,
      scale,
      scale,
    );
  });
  pathsByColor.forEach((path, color) => {
    context.fillStyle = color;
    context.fill(path);
  });
}

function renderLayers(context, scale, options = {}) {
  const { colorOverride = null, eraseColor = null } = options;
  project.layers.forEach((layer) => {
    if (!layer.visible) return;
    const isErase = layer.blendMode === "erase";
    const layerColorOverride = isErase ? eraseColor || "black" : colorOverride;
    context.save();
    if (isErase && !eraseColor) context.globalCompositeOperation = "destination-out";
    applyOpticalContextTransform(context, opticalAdjustmentForLayer(layer), scale);
    if (layer.type === "vector") {
      renderVectorLayer(context, layer, scale, layerColorOverride);
    } else {
      renderPixelLayer(context, layer, scale, layerColorOverride);
    }
    context.restore();
  });
}

function renderVectorLayer(context, layer, scale, colorOverride = null) {
  if (!layer.path || typeof Path2D === "undefined") return;
  const [vx, vy, vw, vh] = layer.viewBox;
  const path = new Path2D(layer.path);
  context.save();
  const centerX = (layer.x + layer.offsetX + layer.width / 2) * scale;
  const centerY = (layer.y + layer.offsetY + layer.height / 2) * scale;
  context.translate(centerX, centerY);
  context.rotate((layer.rotation * Math.PI) / 180);
  context.scale((layer.width * scale) / vw, (layer.height * scale) / vh);
  context.translate(-vx - vw / 2, -vy - vh / 2);
  context.fillStyle = paletteColor(layer.color, colorOverride);
  context.fill(path);
  context.restore();
}

function getVisibleBounds() {
  return mergeBounds(
    project.layers
      .filter((layer) => layer.visible && layer.blendMode !== "erase")
      .map(layerVisibleBounds),
    { minX: 0, minY: 0, maxX: project.width, maxY: project.height },
  );
}

function renderPreviews() {
  renderPreview(elements.previewCanvas, 280);
  $$('[data-preview-size]').forEach((canvas) => renderPreview(canvas, Number(canvas.dataset.previewSize)));
}

function renderPreview(canvas, size) {
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, size, size);
  const transparentBackground = ui.previewBackground === "transparent";
  const background = ui.previewBackground === "light" ? "#f3f3ef" : project.background;
  context.save();
  if (ui.circlePreview) {
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    context.clip();
  }
  if (!transparentBackground) {
    context.fillStyle = background;
    context.fillRect(0, 0, size, size);
  }
  const useExactCanvas = project.metadata?.previewMode === "pixel-exact-canvas" && !ui.circlePreview;
  const bounds = useExactCanvas
    ? { minX: 0, minY: 0, maxX: project.width, maxY: project.height }
    : getVisibleBounds();
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const safe = useExactCanvas ? 1 : ui.circlePreview ? 0.68 : 0.78;
  const scale = Math.min((size * safe) / contentWidth, (size * safe) / contentHeight);
  const drawWidth = contentWidth * scale;
  const drawHeight = contentHeight * scale;
  const originX = (size - drawWidth) / 2 - bounds.minX * scale;
  const originY = (size - drawHeight) / 2 - bounds.minY * scale;
  context.translate(originX, originY);
  context.imageSmoothingEnabled = size <= 64;
  renderLayers(context, scale, {
    colorOverride: ui.previewBackground === "light" ? "black" : null,
    eraseColor: transparentBackground ? null : background,
  });
  context.restore();

  if (ui.circlePreview) {
    context.strokeStyle = ui.previewBackground === "light" ? "rgba(0,0,0,.28)" : "rgba(255,255,255,.24)";
    context.lineWidth = Math.max(1, size / 180);
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    context.stroke();
  }
}

function editorCellFromEvent(event) {
  const rect = elements.editorCanvas.getBoundingClientRect();
  return {
    x: Math.floor(((event.clientX - rect.left) / rect.width) * project.width),
    y: Math.floor(((event.clientY - rect.top) / rect.height) * project.height),
  };
}

function applyPixelAt(cell, erase = false) {
  const layer = activeLayer();
  if (layer.type !== "pixel" || layer.locked) return false;
  const localX = cell.x - layer.offsetX;
  const localY = cell.y - layer.offsetY;
  if (localX < 0 || localY < 0 || localX >= project.width || localY >= project.height) return false;
  const key = `${localX},${localY}`;
  if (erase || ui.tool === "erase") {
    if (!(key in layer.cells)) return false;
    delete layer.cells[key];
  } else {
    if (layer.cells[key] === ui.color) return false;
    layer.cells[key] = ui.color;
  }
  return true;
}

function beginDrawing(event) {
  if (ui.mode !== "edit" || event.button > 2) return;
  if (isOpticalCompositionProject()) {
    showToast("补偿工程只开放 O3 组合参数");
    return;
  }
  const layer = activeLayer();
  if (layer.type !== "pixel") {
    showToast("矢量图层请使用位移与尺寸控制");
    return;
  }
  if (layer.locked) {
    showToast("当前图层已锁定");
    return;
  }
  event.preventDefault();
  elements.editorCanvas.setPointerCapture(event.pointerId);
  pushUndo();
  ui.drawing = true;
  ui.strokeChanged = false;
  ui.lastCell = null;
  continueDrawing(event);
}

function continueDrawing(event) {
  const cell = editorCellFromEvent(event);
  elements.cursorReadout.textContent = `格坐标 ${cell.x}, ${cell.y}`;
  if (!ui.drawing) return;
  if (ui.lastCell && ui.lastCell.x === cell.x && ui.lastCell.y === cell.y) return;
  ui.lastCell = cell;
  const changed = applyPixelAt(cell, event.buttons === 2 || event.button === 2);
  if (changed) {
    ui.strokeChanged = true;
    renderEditor();
    renderPreviews();
    renderLayersPanel();
  }
}

function endDrawing(event) {
  if (!ui.drawing) return;
  ui.drawing = false;
  ui.lastCell = null;
  if (!ui.strokeChanged) {
    undoStack.pop();
    updateUndoRedo();
  } else {
    scheduleSave();
  }
  if (event?.pointerId && elements.editorCanvas.hasPointerCapture(event.pointerId)) {
    elements.editorCanvas.releasePointerCapture(event.pointerId);
  }
}

function moveActiveLayer(dx, dy) {
  const layer = activeLayer();
  if (layer.locked) return showToast("当前图层已锁定");
  mutate(() => {
    layer.offsetX += dx;
    layer.offsetY += dy;
  });
}

function addBuiltInAsterisk() {
  const bounds = getVisibleBounds();
  const size = Math.max(3.5, Math.min(5, project.height * 0.24));
  const x = Math.min(project.width - size - 0.5, bounds.maxX - size * 0.2);
  const y = Math.max(0.5, bounds.minY - size * 0.28);
  mutate(() => {
    const layer = normalizeLayer({
      id: createId("vector"),
      name: ORIGINAL_SIX_ARM_ASTERISK.name,
      type: "vector",
      path: ORIGINAL_SIX_ARM_ASTERISK.path,
      viewBox: ORIGINAL_SIX_ARM_ASTERISK.viewBox,
      x,
      y,
      width: size,
      height: size,
      color: "white",
    });
    project.layers.push(layer);
    project.activeLayerId = layer.id;
  });
}

function reorderActiveLayer(action) {
  const index = project.layers.findIndex((layer) => layer.id === project.activeLayerId);
  if (index < 0) return;
  let target = index;
  if (action === "top") target = project.layers.length - 1;
  if (action === "up") target = Math.min(project.layers.length - 1, index + 1);
  if (action === "down") target = Math.max(0, index - 1);
  if (action === "bottom") target = 0;
  if (target === index) return;
  mutate(() => {
    const [layer] = project.layers.splice(index, 1);
    project.layers.splice(target, 0, layer);
  });
}

function renderVectorControls() {
  if (!elements.vectorControls) return;
  if (isOpticalCompositionProject()) {
    elements.vectorControls.hidden = true;
    return;
  }
  const layer = activeLayer();
  const isVector = layer.type === "vector";
  elements.vectorControls.hidden = !isVector;
  if (!isVector) return;
  elements.vectorX.value = formatPreciseValue(layer.x);
  elements.vectorY.value = formatPreciseValue(layer.y);
  elements.vectorWidth.value = formatPreciseValue(layer.width);
  elements.vectorHeight.value = formatPreciseValue(layer.height);
  elements.vectorAspectLock.checked = layer.lockAspectRatio;
  elements.vectorAspectValue.value = `${layer.aspectRatio.toFixed(3)} : 1`;
  elements.vectorRotation.value = formatTransformValue(layer.rotation);
}

function renderOpticalControls() {
  const enabled = isOpticalCompositionProject() && activeOpticalAdjustment();
  elements.opticalControls.hidden = !enabled;
  elements.layersSection.hidden = Boolean(enabled);
  elements.moveLayerSection.hidden = Boolean(enabled);
  elements.pixelToolsSection.hidden = Boolean(enabled);
  elements.editorCanvas.classList.toggle("composition-canvas", Boolean(enabled));
  if (!enabled) return;

  const adjustment = activeOpticalAdjustment();
  const options = [
    '<option value="custom">自定义参数</option>',
    ...adjustment.presets.map((preset) => (
      `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.label)}</option>`
    )),
  ];
  elements.opticalPreset.innerHTML = options.join("");
  elements.opticalPreset.value = adjustment.presets.some((preset) => preset.id === adjustment.preset)
    ? adjustment.preset
    : "custom";
  elements.opticalPreserveSpacing.checked = adjustment.preserveSpacing;
  elements.opticalScaleX.value = formatTransformValue(adjustment.scaleX * 100);
  elements.opticalScaleY.value = formatTransformValue(adjustment.scaleY * 100);
  elements.opticalTranslateX.value = formatTransformValue(adjustment.translateX);
  elements.opticalTranslateY.value = formatTransformValue(adjustment.translateY);

  const middleBounds = boundsForLayerIds(adjustment.layerIds);
  const leftBounds = boundsForLayerIds(adjustment.leftLayerIds);
  const rightBounds = boundsForLayerIds(adjustment.rightLayerIds);
  if (!middleBounds) return;
  const width = middleBounds.maxX - middleBounds.minX;
  const height = middleBounds.maxY - middleBounds.minY;
  elements.opticalSizeReadout.textContent = `O3 输出 ${width.toFixed(2)} × ${height.toFixed(2)} 格`;
  const leftGap = leftBounds ? middleBounds.minX - leftBounds.maxX : NaN;
  const rightGap = rightBounds ? rightBounds.minX - middleBounds.maxX : NaN;
  elements.opticalSpacingReadout.textContent = Number.isFinite(leftGap) && Number.isFinite(rightGap)
    ? `左右间距 ${leftGap.toFixed(2)} / ${rightGap.toFixed(2)} 格`
    : "左右间距不可用";
  const sideShift = (adjustment.sourceWidth * (adjustment.scaleX - 1)) / 2;
  const signedShift = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  elements.opticalLayoutReadout.textContent = adjustment.preserveSpacing
    ? `两侧联动 ${signedShift(-sideShift)} / ${signedShift(sideShift)} 格`
    : "两侧固定，不补偿横向字距";
  const allBounds = getVisibleBounds();
  const leftSafety = allBounds.minX;
  const rightSafety = project.width - allBounds.maxX;
  const topSafety = allBounds.minY;
  const bottomSafety = project.height - allBounds.maxY;
  const safe = leftSafety >= 0 && rightSafety >= 0 && topSafety >= 0 && bottomSafety >= 0;
  elements.opticalSafetyReadout.textContent = safe
    ? `画布余量 左 ${leftSafety.toFixed(2)} / 右 ${rightSafety.toFixed(2)} · 上 ${topSafety.toFixed(2)} / 下 ${bottomSafety.toFixed(2)} 格`
    : "组合已超出编辑画布，导出时会自动扩展边界";
  elements.opticalSafetyReadout.classList.toggle("warning-copy", !safe);
}

function applyOpticalPreset(presetId) {
  const adjustment = activeOpticalAdjustment();
  const preset = adjustment?.presets.find((candidate) => candidate.id === presetId);
  if (!adjustment || !preset) return;
  mutate(() => {
    adjustment.scaleX = Number(preset.scaleX);
    adjustment.scaleY = Number(preset.scaleY);
    adjustment.translateX = Number(preset.translateX || 0);
    adjustment.translateY = Number(preset.translateY || 0);
    adjustment.preset = preset.id;
  });
}

function updateOpticalAdjustment(field, rawValue) {
  const adjustment = activeOpticalAdjustment();
  if (!adjustment) return;
  const input = Number(rawValue);
  if (!Number.isFinite(input)) return;
  const isScale = field === "scaleX" || field === "scaleY";
  const value = isScale
    ? Math.max(0.9, Math.min(1.12, input / 100))
    : Math.max(-2, Math.min(2, input));
  mutate(() => {
    adjustment[field] = value;
    adjustment.preset = "custom";
  });
}

function formatTransformValue(value) {
  return String(Number(Number(value).toFixed(3)));
}

function formatPreciseValue(value) {
  return Number(value).toFixed(4);
}

function resizeVectorLayer(layer, dimension, rawValue) {
  const nextValue = Math.max(0.25, Number(rawValue));
  if (!Number.isFinite(nextValue)) return;
  const centerX = layer.x + layer.width / 2;
  const centerY = layer.y + layer.height / 2;
  const ratio = Number.isFinite(layer.aspectRatio) && layer.aspectRatio > 0
    ? layer.aspectRatio
    : layer.width / layer.height;

  if (dimension === "width") {
    layer.width = nextValue;
    if (layer.lockAspectRatio) layer.height = nextValue / ratio;
  } else {
    layer.height = nextValue;
    if (layer.lockAspectRatio) layer.width = nextValue * ratio;
  }

  if (layer.lockAspectRatio) {
    layer.x = centerX - layer.width / 2;
    layer.y = centerY - layer.height / 2;
  } else {
    layer.aspectRatio = layer.width / layer.height;
  }
}

async function importVectorFile(file) {
  const source = await file.text();
  const documentNode = new DOMParser().parseFromString(source, "image/svg+xml");
  if (documentNode.querySelector("parsererror")) throw new Error("无法读取 SVG");
  const svg = documentNode.documentElement;
  const viewBox = (svg.getAttribute("viewBox") || `0 0 ${svg.getAttribute("width") || 100} ${svg.getAttribute("height") || 100}`)
    .split(/[ ,]+/)
    .map(Number);
  const paths = [...svg.querySelectorAll("path[d]")];
  if (!paths.length) throw new Error("SVG 中没有 path 元素");
  const baseSize = Math.min(8, project.height * 0.35);
  mutate(() => {
    paths.forEach((pathNode, index) => {
      const ratio = (viewBox[2] || 100) / (viewBox[3] || 100);
      const layer = normalizeLayer({
        id: createId("vector"),
        name: paths.length === 1 ? file.name.replace(/\.svg$/i, "") : `${file.name} ${index + 1}`,
        type: "vector",
        path: pathNode.getAttribute("d"),
        viewBox,
        x: project.width / 2 - (baseSize * ratio) / 2,
        y: project.height / 2 - baseSize / 2,
        width: baseSize * ratio,
        height: baseSize,
        color: "white",
      });
      project.layers.push(layer);
      project.activeLayerId = layer.id;
    });
  });
}

async function importReferenceFile(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const capHeight = Number(prompt("请输入大写字母逻辑高度（Jersey 20 填 20）", project.capHeight || 20));
  if (!Number.isFinite(capHeight) || capHeight < 4 || capHeight > 128) return;
  const mapped = mapImageToProject(image, dataUrl, capHeight);
  if (!confirm(`检测到 ${mapped.width}×${mapped.height} 逻辑格。确定以导入结果建立新工程吗？`)) return;
  pushUndo();
  project = normalizeProject(mapped);
  loadReferenceImage();
  renderAll();
  requestAnimationFrame(fitCanvas);
  scheduleSave();
}

function mapImageToProject(image, dataUrl, capHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;
  const luminanceAt = (x, y) => {
    const offset = (y * canvas.width + x) * 4;
    return (data.data[offset] + data.data[offset + 1] + data.data[offset + 2]) / 3;
  };
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (luminanceAt(x, y) < 180) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX) throw new Error("未检测到明亮字形");
  const logicalCellSize = (maxY - minY + 1) / capHeight;
  const width = Math.ceil((maxX - minX + 1) / logicalCellSize) + 2;
  const cells = {};
  for (let y = 0; y < capHeight; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(canvas.width - 1, Math.round(minX + (x + 0.5) * logicalCellSize));
      const sourceY = Math.min(canvas.height - 1, Math.round(minY + (y + 0.5) * logicalCellSize));
      const luminance = luminanceAt(sourceX, sourceY);
      if (luminance >= 180) cells[`${x},${y}`] = "white";
      else if (luminance <= 3) cells[`${x},${y}`] = "black";
    }
  }
  const layer = createPixelLayer("导入的合成图");
  layer.cells = cells;
  return {
    schemaVersion: 1,
    name: fileBaseName("导入的主题演讲 Logo"),
    width,
    height: capHeight,
    capHeight,
    activeLayerId: layer.id,
    background: "#0c0c0c",
    palette: deepClone(project.palette),
    layers: [layer],
    reference: {
      src: dataUrl,
      visible: true,
      opacity: 0.42,
      crop: { x: minX, y: minY, width: width * logicalCellSize, height: capHeight * logicalCellSize },
      sourceWidth: canvas.width,
      sourceHeight: canvas.height,
      logicalCellSize,
    },
    metadata: { source: "导入的图片", font: `大写逻辑高度 ${capHeight}` },
  };
}

function fileBaseName(value) {
  return String(value).replace(/\.[^.]+$/, "");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function resolvedExportBounds() {
  if (project.metadata?.exportOverflow !== "expand") {
    return { minX: 0, minY: 0, maxX: project.width, maxY: project.height };
  }
  const visible = getVisibleBounds();
  return {
    minX: Math.floor(Math.min(0, visible.minX)),
    minY: Math.floor(Math.min(0, visible.minY)),
    maxX: Math.ceil(Math.max(project.width, visible.maxX)),
    maxY: Math.ceil(Math.max(project.height, visible.maxY)),
  };
}

function exportPng(markColor) {
  const scale = Number(elements.exportScale.value);
  const bounds = resolvedExportBounds();
  const canvas = document.createElement("canvas");
  canvas.width = (bounds.maxX - bounds.minX) * scale;
  canvas.height = (bounds.maxY - bounds.minY) * scale;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.translate(-bounds.minX * scale, -bounds.minY * scale);
  renderLayers(context, scale, {
    colorOverride: markColor,
    eraseColor: null,
  });
  canvas.toBlob(
    (blob) => downloadBlob(blob, `${safeFilename(project.name)}-${markColor}-transparent-${scale}x.png`),
    "image/png",
  );
}

function opticalSvgTransform(adjustment) {
  if (!adjustment) return "";
  const format = (value) => String(Number(Number(value).toFixed(6)));
  return [
    `translate(${format(adjustment.originX + adjustment.translateX)} ${format(adjustment.originY + adjustment.translateY)})`,
    `scale(${format(adjustment.scaleX)} ${format(adjustment.scaleY)})`,
    `translate(${format(-adjustment.originX)} ${format(-adjustment.originY)})`,
  ].join(" ");
}

function exportSvg() {
  const pieces = [];
  const erasePieces = [];
  const bounds = resolvedExportBounds();
  const viewWidth = bounds.maxX - bounds.minX;
  const viewHeight = bounds.maxY - bounds.minY;
  project.layers.forEach((layer) => {
    if (!layer.visible) return;
    const target = layer.blendMode === "erase" ? erasePieces : pieces;
    const adjustment = opticalAdjustmentForLayer(layer);
    const adjustmentTransform = opticalSvgTransform(adjustment);
    if (layer.type === "vector") {
      const [vx, vy, vw, vh] = layer.viewBox;
      const translateX = layer.x + layer.offsetX + layer.width / 2;
      const translateY = layer.y + layer.offsetY + layer.height / 2;
      const transform = [
        `translate(${translateX} ${translateY})`,
        `rotate(${layer.rotation})`,
        `scale(${layer.width / vw} ${layer.height / vh})`,
        `translate(${-vx - vw / 2} ${-vy - vh / 2})`,
      ].join(" ");
      const vectorPath = `<path d="${escapeXml(layer.path)}" fill="${layer.blendMode === "erase" ? "#000" : paletteColor(layer.color)}" shape-rendering="geometricPrecision" transform="${transform}"/>`;
      target.push(adjustmentTransform ? `<g transform="${adjustmentTransform}">${vectorPath}</g>` : vectorPath);
      return;
    }
    const rects = Object.entries(layer.cells).map(([key, color]) => {
      const point = keyToPoint(key);
      const x = point.x + layer.offsetX;
      const y = point.y + layer.offsetY;
      return `<rect x="${x}" y="${y}" width="1" height="1" fill="${layer.blendMode === "erase" ? "#000" : paletteColor(color)}"/>`;
    }).join("");
    target.push(
      adjustmentTransform
        ? `<g transform="${adjustmentTransform}" shape-rendering="geometricPrecision">${rects}</g>`
        : rects,
    );
  });
  const mask = erasePieces.length
    ? `<defs><mask id="knockout" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse"><rect x="${bounds.minX}" y="${bounds.minY}" width="${viewWidth}" height="${viewHeight}" fill="#fff"/>${erasePieces.join("")}</mask></defs>`
    : "";
  const content = erasePieces.length ? `<g mask="url(#knockout)">${pieces.join("")}</g>` : pieces.join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.minX} ${bounds.minY} ${viewWidth} ${viewHeight}" shape-rendering="crispEdges">${mask}${content}</svg>`;
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${safeFilename(project.name)}.svg`);
}

function exportJson() {
  downloadBlob(
    new Blob([JSON.stringify(project, null, 2) + "\n"], { type: "application/json" }),
    `${safeFilename(project.name)}.json`,
  );
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function safeFilename(value) {
  return String(value).trim().replace(/[^0-9A-Za-z\u4e00-\u9fff_-]+/g, "-").replace(/^-+|-+$/g, "") || "pixel-logo";
}

function downloadBlob(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`已导出 ${filename}`);
}

async function saveNamedVersion(name) {
  try {
    const response = await fetch("api/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, project }),
    });
    if (!response.ok) throw new Error("无法保存版本");
    markProjectBaseline();
    showToast(`已保存版本：${name}`);
    await loadVersions();
  } catch (error) {
    showToast(error.message);
  }
}

async function loadVersions() {
  try {
    const response = await fetch("api/versions", { cache: "no-store" });
    if (!response.ok) throw new Error();
    const payload = await response.json();
    renderVersions(payload.versions || []);
  } catch (error) {
    elements.versionList.innerHTML = '<p class="muted-copy">版本服务未启动。</p>';
  }
}

function renderVersions(versions) {
  elements.versionList.innerHTML = "";
  if (!versions.length) {
    elements.versionList.innerHTML = '<p class="muted-copy">尚未保存命名版本。</p>';
    return;
  }
  versions.forEach((version) => {
    const item = document.createElement("div");
    item.className = "version-item";
    const info = document.createElement("div");
    info.innerHTML = `<strong>${escapeHtml(version.name)}</strong><time>${formatDate(version.savedAt)}</time>`;
    const actions = document.createElement("div");
    actions.className = "version-actions";
    const restore = document.createElement("button");
    restore.textContent = "恢复";
    restore.addEventListener("click", () => restoreVersion(version.id));
    const remove = document.createElement("button");
    remove.textContent = "删除";
    remove.addEventListener("click", () => deleteVersion(version.id));
    actions.append(restore, remove);
    item.append(info, actions);
    elements.versionList.append(item);
  });
}

async function restoreVersion(id) {
  const response = await fetch(`api/versions/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!response.ok) return showToast("无法读取该版本");
  project = normalizeProject(await response.json());
  afterProjectLoad();
  scheduleSave();
  showToast("版本已恢复");
}

async function deleteVersion(id) {
  if (!confirm("删除这个命名版本？")) return;
  const response = await fetch(`api/versions/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) return showToast("删除失败");
  await loadVersions();
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch (error) {
    return value || "";
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

async function switchPreset(preset) {
  const config = PRESET_CONFIG[preset];
  if (!config) return false;
  const { source, label } = config;
  if (project.metadata?.preset === preset && !hasProjectChanges()) return true;
  if (
    hasProjectChanges()
    && !confirm(`当前工程有尚未保存为版本的修改。\n如需保留，请先取消并点击“保存版本”。\n确定放弃修改并切换到${label}吗？`)
  ) {
    renderMetadata();
    return false;
  }
  try {
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) throw new Error();
    project = normalizeProject(await response.json());
    afterProjectLoad();
    scheduleSave();
    return true;
  } catch (error) {
    showToast(`${label}样板读取失败`);
    renderMetadata();
    return false;
  }
}

function bindEvents() {
  elements.undoBtn.addEventListener("click", undo);
  elements.redoBtn.addEventListener("click", redo);
  elements.saveVersionBtn.addEventListener("click", () => {
    elements.versionName.value = "";
    elements.versionDialog.showModal();
    setTimeout(() => elements.versionName.focus(), 0);
  });
  elements.versionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = elements.versionName.value.trim();
    if (!name) return;
    elements.versionDialog.close();
    saveNamedVersion(name);
  });
  elements.projectName.addEventListener("input", () => {
    project.name = elements.projectName.value;
    scheduleSave();
  });
  elements.projectName.addEventListener("change", renderMetadata);

  elements.zoomRange.addEventListener("input", () => {
    setCellSize(elements.zoomRange.value);
  });
  elements.zoomOutBtn.addEventListener("click", () => stepCanvasZoom(-1));
  elements.zoomInBtn.addEventListener("click", () => stepCanvasZoom(1));
  elements.fitCanvasBtn.addEventListener("click", fitCanvas);
  elements.canvasViewport.addEventListener("wheel", zoomCanvasFromWheel, { passive: false });
  elements.gridToggle.addEventListener("change", () => {
    ui.gridVisible = elements.gridToggle.checked;
    renderEditor();
  });
  elements.referenceToggle.addEventListener("change", () => {
    ui.referenceVisible = elements.referenceToggle.checked;
    if (project.reference) project.reference.visible = ui.referenceVisible;
    renderEditor();
    scheduleSave();
  });
  elements.referenceOpacity.addEventListener("input", () => {
    ui.referenceOpacity = Number(elements.referenceOpacity.value) / 100;
    if (project.reference) project.reference.opacity = ui.referenceOpacity;
    renderEditor();
    scheduleSave();
  });
  elements.circleToggle.addEventListener("change", () => {
    ui.circlePreview = elements.circleToggle.checked;
    renderPreviews();
  });

  $$('[data-mode]').forEach((button) => {
    button.addEventListener("click", () => {
      ui.mode = button.dataset.mode;
      $$('[data-mode]').forEach((item) => item.classList.toggle("active", item === button));
      renderEditor();
    });
  });
  $$('[data-tool]').forEach((button) => {
    button.addEventListener("click", () => {
      ui.tool = button.dataset.tool;
      $$('[data-tool]').forEach((item) => item.classList.toggle("active", item === button));
    });
  });
  $$('[data-color]').forEach((button) => {
    button.addEventListener("click", () => {
      ui.color = button.dataset.color;
      $$('[data-color]').forEach((item) => item.classList.toggle("active", item === button));
    });
  });
  $$('[data-preview-bg]').forEach((button) => {
    button.addEventListener("click", () => {
      ui.previewBackground = button.dataset.previewBg;
      $$('[data-preview-bg]').forEach((item) => item.classList.toggle("active", item === button));
      elements.previewFrame.className = `preview-frame ${ui.previewBackground}`;
      renderPreviews();
      if (ui.mode === "clean") renderEditor();
    });
  });

  elements.editorCanvas.addEventListener("pointerdown", beginDrawing);
  elements.editorCanvas.addEventListener("pointermove", continueDrawing);
  elements.editorCanvas.addEventListener("pointerup", endDrawing);
  elements.editorCanvas.addEventListener("pointercancel", endDrawing);
  elements.editorCanvas.addEventListener("pointerleave", (event) => {
    if (!ui.drawing) elements.cursorReadout.textContent = "格坐标 —";
  });
  elements.editorCanvas.addEventListener("contextmenu", (event) => event.preventDefault());

  elements.addLayerBtn.addEventListener("click", () => {
    mutate(() => {
      const layer = createPixelLayer(`图层 ${project.layers.length + 1}`);
      project.layers.push(layer);
      project.activeLayerId = layer.id;
    });
  });
  elements.duplicateLayerBtn.addEventListener("click", () => {
    mutate(() => {
      const clone = deepClone(activeLayer());
      clone.id = createId(clone.type === "vector" ? "vector" : "layer");
      clone.name = `${clone.name} copy`;
      const index = project.layers.findIndex((layer) => layer.id === project.activeLayerId);
      project.layers.splice(index + 1, 0, clone);
      project.activeLayerId = clone.id;
    });
  });
  elements.deleteLayerBtn.addEventListener("click", () => {
    if (project.layers.length === 1) return showToast("工程至少需要一个图层");
    if (!confirm(`删除图层“${activeLayer().name}”？`)) return;
    mutate(() => {
      const index = project.layers.findIndex((layer) => layer.id === project.activeLayerId);
      project.layers.splice(index, 1);
      project.activeLayerId = project.layers[Math.max(0, index - 1)].id;
    });
  });
  $$('[data-order]').forEach((button) => button.addEventListener("click", () => reorderActiveLayer(button.dataset.order)));
  $$('[data-nudge]').forEach((button) => {
    button.addEventListener("click", () => {
      const [dx, dy] = button.dataset.nudge.split(",").map(Number);
      moveActiveLayer(dx, dy);
    });
  });
  ["layerOffsetX", "layerOffsetY"].forEach((name) => {
    const input = elements[name];
    input.addEventListener("change", () => {
      const layer = activeLayer();
      if (layer.locked) return renderMetadata();
      const parsed = Number(input.value);
      if (!Number.isFinite(parsed)) return renderMetadata();
      const value = layer.type === "vector" ? Number(parsed.toFixed(4)) : Math.round(parsed);
      mutate(() => {
        if (name === "layerOffsetX") layer.offsetX = value;
        if (name === "layerOffsetY") layer.offsetY = value;
      });
    });
  });
  elements.resetOffsetBtn.addEventListener("click", () => {
    const layer = activeLayer();
    mutate(() => {
      layer.offsetX = 0;
      layer.offsetY = 0;
    });
  });
  elements.layerBlendMode.addEventListener("change", () => {
    const layer = activeLayer();
    mutate(() => {
      layer.blendMode = elements.layerBlendMode.value;
    });
  });

  elements.importReferenceBtn.addEventListener("click", () => elements.referenceFile.click());
  elements.referenceFile.addEventListener("change", async () => {
    const [file] = elements.referenceFile.files;
    if (!file) return;
    try {
      await importReferenceFile(file);
    } catch (error) {
      showToast(error.message || "导入失败");
    }
    elements.referenceFile.value = "";
  });
  elements.resetProjectBtn.addEventListener("click", async () => {
    if (!confirm("恢复本工程初始映射？当前未保存修改会丢失。")) return;
    const source = project.metadata?.resetSource || "data/full-project.json";
    const response = await fetch(source, { cache: "no-store" });
    project = normalizeProject(await response.json());
    afterProjectLoad();
    scheduleSave();
  });
  $$('[data-preset]').forEach((button) => {
    button.addEventListener("click", () => switchPreset(button.dataset.preset));
  });
  if (elements.importVectorBtn) {
    elements.addAsteriskBtn.addEventListener("click", addBuiltInAsterisk);
    elements.importVectorBtn.addEventListener("click", () => elements.vectorFile.click());
    elements.vectorFile.addEventListener("change", async () => {
      const [file] = elements.vectorFile.files;
      if (!file) return;
      try {
        await importVectorFile(file);
      } catch (error) {
        showToast(error.message || "SVG 导入失败");
      }
      elements.vectorFile.value = "";
    });
  }

  elements.vectorAspectLock.addEventListener("change", () => {
    const layer = activeLayer();
    if (layer.type !== "vector") return;
    mutate(() => {
      layer.lockAspectRatio = elements.vectorAspectLock.checked;
      layer.aspectRatio = layer.width / layer.height;
    });
  });

  ["vectorX", "vectorY", "vectorWidth", "vectorHeight", "vectorRotation"].forEach((name) => {
    const input = elements[name];
    if (!input) return;
    input.addEventListener("change", () => {
      const layer = activeLayer();
      if (layer.type !== "vector") return;
      mutate(() => {
        if (name === "vectorX") layer.x = Number(Number(input.value).toFixed(4));
        if (name === "vectorY") layer.y = Number(Number(input.value).toFixed(4));
        if (name === "vectorWidth") resizeVectorLayer(layer, "width", input.value);
        if (name === "vectorHeight") resizeVectorLayer(layer, "height", input.value);
        if (name === "vectorRotation") layer.rotation = Number(input.value);
      });
    });
  });

  elements.opticalPreset.addEventListener("change", () => {
    if (elements.opticalPreset.value !== "custom") applyOpticalPreset(elements.opticalPreset.value);
  });
  elements.opticalPreserveSpacing.addEventListener("change", () => {
    const adjustment = activeOpticalAdjustment();
    if (!adjustment) return;
    mutate(() => {
      adjustment.preserveSpacing = elements.opticalPreserveSpacing.checked;
    });
  });
  [
    ["opticalScaleX", "scaleX"],
    ["opticalScaleY", "scaleY"],
    ["opticalTranslateX", "translateX"],
    ["opticalTranslateY", "translateY"],
  ].forEach(([elementName, field]) => {
    elements[elementName].addEventListener("change", () => {
      updateOpticalAdjustment(field, elements[elementName].value);
    });
  });

  $$('[data-export]').forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.export;
      if (type === "png-white") exportPng("white");
      if (type === "png-black") exportPng("black");
      if (type === "svg") exportSvg();
      if (type === "json") exportJson();
    });
  });
  elements.importProjectBtn.addEventListener("click", () => elements.projectFile.click());
  elements.projectFile.addEventListener("change", async () => {
    const [file] = elements.projectFile.files;
    if (!file) return;
    try {
      const imported = normalizeProject(JSON.parse(await file.text()));
      project = imported;
      afterProjectLoad();
      scheduleSave();
    } catch (error) {
      showToast("工程 JSON 无法读取");
    }
    elements.projectFile.value = "";
  });

  document.addEventListener("keydown", (event) => {
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
    }
    if (modifier && event.key.toLowerCase() === "s") {
      event.preventDefault();
      elements.saveVersionBtn.click();
    }
    if (
      !isOpticalCompositionProject()
      && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      && !event.target.matches("input, select, textarea")
    ) {
      event.preventDefault();
      const moves = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      moveActiveLayer(...moves[event.key]);
    }
  });
}

bindEvents();
loadInitialProject().catch((error) => {
  console.error(error);
  showToast("工程加载失败");
});
