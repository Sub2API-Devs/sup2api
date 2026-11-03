/**
 * keybindings/loadUserBindings.ts
 *
 * 并入旧版已有路径：加载用户快捷键。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/loadUserBindings.ts
 * pieces: chunk-4t8fx0s8.js (1), chunk-x1mwqya5.js (24)
 * attribution: callgraph-fingerprint 2, fingerprint 8, layout 9, file-local 1, placement 3, sole-consumer 1, affinity 1
 */
import { join, dirname } from "path";
import { readFileSync } from "fs";
import { readFile, stat } from "fs/promises";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, pe } from "../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { createSignal } from "../utils/signal.js";
import { logEvent } from "../services/analytics/index.js";
import { getClaudeConfigDir } from "../utils/envUtils.js";
import { STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { parseBindings } from "./parser.js";
import { DEFAULT_BINDINGS } from "./defaultBindings.js";
import { migrateDeprecatedActions, isValidBindingAction } from "./schema.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { isCustomizationDisabled } from "../utils/settings/customizationDisabled.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { jsonParse } from "../utils/slowOperations.js";
import { formatStorageError } from "../utils/storage/storageErrors.js";
import { logForDebugging } from "../utils/debug.js";
import { checkDuplicateKeysInJson, validateBindings, logKeybindingWarnings } from "./validate.js";
import { isENOENT, errorMessage } from "../utils/errors.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { Ok } from "../../vendor/chokidar/index.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { getActionDisplayText } from "./match.js";

/**
 * 宽松的 zod 结构：{context: string, bindings: Record<string, string|null>}，加载用户配置时只用它判断块形状（上下文与动作是否合法由 validate 另报）。
 */
//@ chunk-x1mwqya5.js:2941-3004 fingerprint = isKeybindingBlock (0.69)
var keybindingBlockSchema = DoctorLazy(() => u({ context: o(), bindings: pe(o(), o().nullable()) }));
//@ chunk-x1mwqya5.js:3004-3052 layout
function isKeybindingBlock(n) {
  return keybindingBlockSchema().safeParse(n).success;
}
/**
 * 判断 keybindings.json 的 bindings 是否为合法块数组。
 */
//@ chunk-x1mwqya5.js:3052-3103 file-local
function isKeybindingBlockArray(arr) {
  return Array.isArray(arr) && arr.every(isKeybindingBlock);
}
/**
 * 用户自定义快捷键总开关：GrowthBook tengu_keybinding_customization_release，默认 true。
 */
//@ chunk-x1mwqya5.js:9325-9394 fingerprint = isKeybindingCustomizationEnabled (1)
function isKeybindingCustomizationEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_keybinding_customization_release", !0);
}
//@ chunk-x1mwqya5.js:9394-9412 layout
var WATCH_STABILITY_THRESHOLD_MS = 500,
  WATCH_POLL_INTERVAL_MS = 200;
/**
 * 快捷键模块的进程级状态：当前绑定与警告、是否已从后端预热、文件监视器、每日一次的加载事件日期、已记录的回退提示、动作触发事件的节流表、变更信号 changed；支持 Symbol.dispose 关闭监视器。
 */
//@ chunk-x1mwqya5.js:9412-9749 layout
function createKeybindingsState() {
  let state = {
    bindings: null,
    warmedFromBackend: !1,
    warmAttempted: !1,
    warnings: [],
    watcher: null,
    initialized: !1,
    disposed: !1,
    lastCustomBindingsLogDate: null,
    loggedShortcutFallbacks: new Set(),
    actionFiredLoggedAt: new Map(),
    changed: createSignal(),
    [Symbol.dispose]() {
      if (((state.disposed = !0), state.watcher)) (state.watcher.close(), (state.watcher = null));
      state.changed.clear();
    },
  };
  return state;
}
//@ chunk-x1mwqya5.js:9749-9761 layout
var keybindingsState = createKeybindingsState();
/**
 * 每天最多发一次 tengu_custom_keybindings_loaded（带用户绑定条数）。
 */
//@ chunk-x1mwqya5.js:9761-9952 fingerprint = logCustomBindingsLoadedOncePerDay (0.876)
function logCustomBindingsLoadedOncePerDay(n, r) {
  let today = new Date().toISOString().slice(0, 10);
  if (n.lastCustomBindingsLogDate === today) return;
  ((n.lastCustomBindingsLogDate = today),
    logEvent("tengu_custom_keybindings_loaded", { user_binding_count: r }));
}
/**
 * 用户快捷键文件路径：<配置目录>/keybindings.json。
 */
//@ chunk-x1mwqya5.js:9952-10002 fingerprint = getKeybindingsPath (1)
function getKeybindingsPath() {
  return join(getClaudeConfigDir(), "keybindings.json");
}
//@ chunk-x1mwqya5.js:10002-10034 placement
var keybindingsStoreKey = STORAGE_SPACES.state("keybindings");
//@ chunk-x1mwqya5.js:10034-10062 placement
function getDefaultParsedBindings() {
  return parseBindings(DEFAULT_BINDINGS);
}
/**
 * 展开用户块，只保留动作为 null（解绑）或合法动作/command:* 的绑定。
 */
//@ chunk-x1mwqya5.js:10062-10139 placement
function parseValidUserBindings(n) {
  return parseBindings(migrateDeprecatedActions(n)).filter(
    (r) => r.action === null || isValidBindingAction(r.action),
  );
}
/**
 * 上报 keybinding_load_user_config 特性事件（ok 记成功、否则记失败原因）；suppressFeatureEvents 时不报。
 */
//@ chunk-x1mwqya5.js:10275-10411 sole-consumer
function reportUserConfigLoad(options, outcome) {
  if (options?.suppressFeatureEvents) return;
  if (outcome === "ok") logFeatureOk("keybinding_load_user_config");
  else logFeatureBad("keybinding_load_user_config", outcome);
}
/**
 * 自定义被关闭（GrowthBook 开关关掉或策略禁止 keybindings）时为 true。
 */
//@ chunk-x1mwqya5.js:10411-10456 affinity
function isKeybindingCustomizationBlocked() {
  return !isKeybindingCustomizationEnabled() || isCustomizationDisabled("keybindings");
}
/**
 * 同步取绑定（不记日志、不报警告）：默认绑定 + 合法的用户绑定；自定义被禁或特定模式下只返回默认绑定。
 */
//@ chunk-x1mwqya5.js:10456-10673 callgraph-fingerprint = loadKeybindingsSyncWithWarnings (0.257)
function loadKeybindingsSyncWithWarnings(n) {
  let defaultBindings = getDefaultParsedBindings();
  if (isKeybindingCustomizationBlocked()) return defaultBindings;
  if (isStorageV5Enabled() && n !== void 0) return defaultBindings;
  try {
    let content = readFileSync(getKeybindingsPath(), "utf-8"),
      parsed = jsonParse(content),
      l = typeof parsed === "object" && parsed !== null && "bindings" in parsed ? parsed.bindings : void 0;
    return isKeybindingBlockArray(l) ? [...defaultBindings, ...parseValidUserBindings(l)] : defaultBindings;
  } catch {
    return defaultBindings;
  }
}
/**
 * 异步加载：有后端存储时从后端读 keybindings 条目（读失败回退默认并报错）；否则读本地 keybindings.json。格式要求 {bindings:[...]}，结构不对时回退默认绑定并给出 parse_error；成功时默认绑定在前、用户绑定在后合并，附带重复键与校验警告。
 */
//@ chunk-x1mwqya5.js:10673-12678 layout = loadKeybindings (0.774)
async function loadKeybindingsAsync(state, backend, options) {
  let defaultBindings = getDefaultParsedBindings();
  if (!isKeybindingCustomizationEnabled() || isCustomizationDisabled("keybindings"))
    return { bindings: defaultBindings, warnings: [] };
  let userPath = getKeybindingsPath();
  if (backend) {
    let readResult = await backend.read([keybindingsStoreKey]);
    if (!readResult.ok) {
      let error = readResult.error,
        k = formatStorageError(error);
      if ((logForDebugging(`[keybindings] Error loading ${userPath}: ${k}`), options?.suppressFeatureEvents))
        logFeatureSad("keybinding_load_user_config", "warm_backend_read_failed_fell_back");
      return (
        reportUserConfigLoad(options, "keybinding_config_parse_error"),
        {
          bindings: defaultBindings,
          warnings: [
            { type: "parse_error", severity: "error", message: `Failed to parse keybindings.json: ${k}` },
          ],
        }
      );
    }
    let h = readResult.value.items[0];
    if (!h.found) return (reportUserConfigLoad(options, "ok"), { bindings: defaultBindings, warnings: [] });
    return loadKeybindingsFromText(
      Buffer.from(h.value).toString("utf-8"),
      state,
      defaultBindings,
      userPath,
      options,
    );
  }
  try {
    let content = await readFile(userPath, "utf-8"),
      parsed = jsonParse(content),
      userBlocks;
    if (typeof parsed === "object" && parsed !== null && "bindings" in parsed) userBlocks = parsed.bindings;
    else
      return (
        logForDebugging(
          '[keybindings] Invalid keybindings.json: keybindings.json must have a "bindings" array',
        ),
        reportUserConfigLoad(options, "keybinding_config_invalid_format"),
        {
          bindings: defaultBindings,
          warnings: [
            {
              type: "parse_error",
              severity: "error",
              message: 'keybindings.json must have a "bindings" array',
              suggestion: 'Use format: { "bindings": [ ... ] }',
            },
          ],
        }
      );
    if (!isKeybindingBlockArray(userBlocks)) {
      let C = !Array.isArray(userBlocks)
          ? '"bindings" must be an array'
          : "keybindings.json contains invalid block structure",
        N = !Array.isArray(userBlocks)
          ? 'Set "bindings" to an array of keybinding blocks'
          : 'Each block must have "context" (string) and "bindings" (object mapping keys to a string action or null)';
      return (
        logForDebugging(`[keybindings] Invalid keybindings.json: ${C}`),
        reportUserConfigLoad(options, "keybinding_config_invalid_structure"),
        {
          bindings: defaultBindings,
          warnings: [{ type: "parse_error", severity: "error", message: C, suggestion: N }],
        }
      );
    }
    let userParsed = parseValidUserBindings(userBlocks);
    logForDebugging(`[keybindings] Loaded ${userParsed.length} user bindings from ${userPath}`);
    let mergedBindings = [...defaultBindings, ...userParsed];
    logCustomBindingsLoadedOncePerDay(state, userParsed.length);
    let warnings = [...checkDuplicateKeysInJson(content), ...validateBindings(userBlocks, mergedBindings)];
    if (warnings.length > 0)
      (logForDebugging(`[keybindings] Found ${warnings.length} validation issue(s)`),
        logKeybindingWarnings(warnings));
    return (reportUserConfigLoad(options, "ok"), { bindings: mergedBindings, warnings: warnings });
  } catch (error) {
    if (isENOENT(error))
      return (reportUserConfigLoad(options, "ok"), { bindings: defaultBindings, warnings: [] });
    return (
      logForDebugging(`[keybindings] Error loading ${userPath}: ${errorMessage(error)}`),
      reportUserConfigLoad(options, "keybinding_config_parse_error"),
      {
        bindings: defaultBindings,
        warnings: [
          {
            type: "parse_error",
            severity: "error",
            message: `Failed to parse keybindings.json: ${errorMessage(error)}`,
          },
        ],
      }
    );
  }
}
/**
 * 从 JSON 文本解析用户绑定并与默认绑定合并（后端预热路径用），规则同 loadKeybindingsAsync。
 */
//@ chunk-x1mwqya5.js:12678-14031 fingerprint = loadKeybindings (0.845)
function loadKeybindingsFromText(text, state, defaultBindings, userPath, options) {
  try {
    let parsed = jsonParse(text),
      userBlocks;
    if (typeof parsed === "object" && parsed !== null && "bindings" in parsed) userBlocks = parsed.bindings;
    else
      return (
        logForDebugging(
          '[keybindings] Invalid keybindings.json: keybindings.json must have a "bindings" array',
        ),
        reportUserConfigLoad(options, "keybinding_config_invalid_format"),
        {
          bindings: defaultBindings,
          warnings: [
            {
              type: "parse_error",
              severity: "error",
              message: 'keybindings.json must have a "bindings" array',
              suggestion: 'Use format: { "bindings": [ ... ] }',
            },
          ],
        }
      );
    if (!isKeybindingBlockArray(userBlocks)) {
      let x = !Array.isArray(userBlocks)
          ? '"bindings" must be an array'
          : "keybindings.json contains invalid block structure",
        C = !Array.isArray(userBlocks)
          ? 'Set "bindings" to an array of keybinding blocks'
          : 'Each block must have "context" (string) and "bindings" (object mapping keys to a string action or null)';
      return (
        logForDebugging(`[keybindings] Invalid keybindings.json: ${x}`),
        reportUserConfigLoad(options, "keybinding_config_invalid_structure"),
        {
          bindings: defaultBindings,
          warnings: [{ type: "parse_error", severity: "error", message: x, suggestion: C }],
        }
      );
    }
    let userParsed = parseValidUserBindings(userBlocks);
    logForDebugging(`[keybindings] Loaded ${userParsed.length} user bindings from ${userPath}`);
    let mergedBindings = [...defaultBindings, ...userParsed];
    logCustomBindingsLoadedOncePerDay(state, userParsed.length);
    let warnings = [...checkDuplicateKeysInJson(text), ...validateBindings(userBlocks, mergedBindings)];
    if (warnings.length > 0)
      (logForDebugging(`[keybindings] Found ${warnings.length} validation issue(s)`),
        logKeybindingWarnings(warnings));
    return (reportUserConfigLoad(options, "ok"), { bindings: mergedBindings, warnings: warnings });
  } catch (error) {
    return (
      logForDebugging(`[keybindings] Error loading ${userPath}: ${errorMessage(error)}`),
      reportUserConfigLoad(options, "keybinding_config_parse_error"),
      {
        bindings: defaultBindings,
        warnings: [
          {
            type: "parse_error",
            severity: "error",
            message: `Failed to parse keybindings.json: ${errorMessage(error)}`,
          },
        ],
      }
    );
  }
}
/**
 * 交互会话启动时从后端存储预热绑定（只尝试一次；有警告则不写入状态，留给同步加载报告）。
 */
//@ chunk-x1mwqya5.js:14031-14374 layout
async function warmKeybindingsFromBackend(state, backend) {
  if (state.bindings) return state.bindings;
  if (state.warmAttempted) return;
  if (getIsNonInteractiveSession()) return;
  if (isKeybindingCustomizationBlocked()) return;
  let result = await loadKeybindingsAsync(state, backend, { suppressFeatureEvents: !0 });
  if (((state.warmAttempted = !0), result.warnings.length > 0)) return result.bindings;
  if (!state.bindings)
    ((state.bindings = result.bindings),
      (state.warnings = []),
      (state.warmedFromBackend = !0),
      logFeatureOk("keybinding_load_user_config"));
  return state.bindings;
}
/**
 * 预热得到的绑定只用一次：若此后自定义被禁则清空状态，返回是否需要重新加载。
 */
//@ chunk-x1mwqya5.js:14374-14525 layout
function invalidateWarmedBindings(n) {
  if (!n.warmedFromBackend) return !1;
  if (isKeybindingCustomizationBlocked())
    return ((n.bindings = null), (n.warnings = []), (n.warmedFromBackend = !1), !0);
  return ((n.warmedFromBackend = !1), !1);
}
//@ chunk-x1mwqya5.js:14525-14604 layout
function getKeybindings(n) {
  if (n.bindings && !invalidateWarmedBindings(n)) return n.bindings;
  return loadKeybindingsSync(n).bindings;
}
/**
 * 同步加载本地 keybindings.json 并写入状态（KeybindingSetup 首次渲染用）；规则同异步版，文件不存在视为成功（只有默认绑定）。
 */
//@ chunk-x1mwqya5.js:14604-16473 layout = loadKeybindings (0.798)
function loadKeybindingsSync(state) {
  if (state.bindings && !invalidateWarmedBindings(state))
    return { bindings: state.bindings, warnings: state.warnings };
  state.warmedFromBackend = !1;
  let defaultBindings = getDefaultParsedBindings();
  if (!isKeybindingCustomizationEnabled() || isCustomizationDisabled("keybindings"))
    return (
      (state.bindings = defaultBindings),
      (state.warnings = []),
      { bindings: state.bindings, warnings: state.warnings }
    );
  let userPath = getKeybindingsPath();
  try {
    let s = readFileSync(userPath, "utf-8"),
      parsed = jsonParse(s),
      userBlocks;
    if (typeof parsed === "object" && parsed !== null && "bindings" in parsed) userBlocks = parsed.bindings;
    else
      return (
        logFeatureBad("keybinding_load_user_config", "keybinding_config_invalid_format"),
        (state.bindings = defaultBindings),
        (state.warnings = [
          {
            type: "parse_error",
            severity: "error",
            message: 'keybindings.json must have a "bindings" array',
            suggestion: 'Use format: { "bindings": [ ... ] }',
          },
        ]),
        { bindings: state.bindings, warnings: state.warnings }
      );
    if (!isKeybindingBlockArray(userBlocks)) {
      let k = !Array.isArray(userBlocks)
          ? '"bindings" must be an array'
          : "keybindings.json contains invalid block structure",
        _ = !Array.isArray(userBlocks)
          ? 'Set "bindings" to an array of keybinding blocks'
          : 'Each block must have "context" (string) and "bindings" (object mapping keys to a string action or null)';
      return (
        logFeatureBad("keybinding_load_user_config", "keybinding_config_invalid_structure"),
        (state.bindings = defaultBindings),
        (state.warnings = [{ type: "parse_error", severity: "error", message: k, suggestion: _ }]),
        { bindings: state.bindings, warnings: state.warnings }
      );
    }
    let userParsed = parseValidUserBindings(userBlocks);
    (logForDebugging(`[keybindings] Loaded ${userParsed.length} user bindings from ${userPath}`),
      (state.bindings = [...defaultBindings, ...userParsed]),
      logCustomBindingsLoadedOncePerDay(state, userParsed.length));
    let duplicateKeyWarnings = checkDuplicateKeysInJson(s);
    if (
      ((state.warnings = [...duplicateKeyWarnings, ...validateBindings(userBlocks, state.bindings)]),
      state.warnings.length > 0)
    )
      (logForDebugging(`[keybindings] Found ${state.warnings.length} validation issue(s)`),
        logKeybindingWarnings(state.warnings));
    return (
      logFeatureOk("keybinding_load_user_config"),
      { bindings: state.bindings, warnings: state.warnings }
    );
  } catch (error) {
    if (isENOENT(error))
      return (
        logFeatureOk("keybinding_load_user_config"),
        (state.bindings = defaultBindings),
        (state.warnings = []),
        { bindings: state.bindings, warnings: state.warnings }
      );
    return (
      logForDebugging(`[keybindings] Error loading ${userPath}: ${errorMessage(error)}`),
      logFeatureBad("keybinding_load_user_config", "keybinding_config_parse_error"),
      (state.bindings = defaultBindings),
      (state.warnings = [
        {
          type: "parse_error",
          severity: "error",
          message: `Failed to parse keybindings.json: ${errorMessage(error)}`,
        },
      ]),
      { bindings: state.bindings, warnings: state.warnings }
    );
  }
}
/**
 * 启动 keybindings.json 的 chokidar 监视（轮询 2 秒、写入稳定 500ms）：add/change 时异步重载并发 changed 信号，unlink 时回到默认绑定；目录不存在或自定义被禁时不监视。
 */
//@ chunk-x1mwqya5.js:16473-17400 fingerprint = initializeKeybindingWatcher (0.794)
async function initializeKeybindingWatcher(n) {
  if (n.initialized || n.disposed) return;
  if (!isKeybindingCustomizationEnabled() || isCustomizationDisabled("keybindings")) {
    logForDebugging("[keybindings] Skipping file watcher - user customization disabled");
    return;
  }
  let userPath = getKeybindingsPath(),
    watchDir = dirname(userPath);
  try {
    if (!(await stat(watchDir)).isDirectory()) {
      (logForDebugging(`[keybindings] Not watching: ${watchDir} is not a directory`),
        logFeatureSad("keybinding_watcher_init", "watch_dir_inaccessible"));
      return;
    }
  } catch {
    (logForDebugging(`[keybindings] Not watching: ${watchDir} does not exist`),
      logFeatureSad("keybinding_watcher_init", "watch_dir_inaccessible"));
    return;
  }
  ((n.initialized = !0),
    logForDebugging(`[keybindings] Watching for changes to ${userPath}`),
    (n.watcher = Ok.watch(userPath, {
      persistent: !0,
      ignoreInitial: !0,
      awaitWriteFinish: {
        stabilityThreshold: WATCH_STABILITY_THRESHOLD_MS,
        pollInterval: WATCH_POLL_INTERVAL_MS,
      },
      ignorePermissionErrors: !0,
      usePolling: !0,
      interval: 2000,
      atomic: !0,
    })),
    n.watcher.on("add", (s) => handleChange(n, s)),
    n.watcher.on("change", (s) => handleChange(n, s)),
    n.watcher.on("unlink", (s) => handleDelete(n, s)),
    n.watcher.on("error", (s) =>
      logForDebugging(`[keybindings] watcher error: ${errorMessage(s)}`, { level: "warn" }),
    ),
    registerCleanup(n),
    logFeatureOk("keybinding_watcher_init"));
}
/**
 * 文件变化：重新加载，写入状态并通知订阅者（热重载）。
 */
//@ chunk-x1mwqya5.js:17400-17708 fingerprint = handleChange (0.678)
async function handleChange(n, r) {
  logForDebugging(`[keybindings] Detected change to ${r}`);
  try {
    let e = await loadKeybindingsAsync(n);
    ((n.bindings = e.bindings),
      (n.warnings = e.warnings),
      (n.warmedFromBackend = !1),
      n.changed.emit(e),
      logFeatureOk("keybinding_hot_reload"));
  } catch (error) {
    (logForDebugging(`[keybindings] Error reloading: ${errorMessage(error)}`),
      logFeatureSad("keybinding_hot_reload", "keybinding_reload_failed"));
  }
}
/**
 * 文件被删除：回到默认绑定并通知订阅者。
 */
//@ chunk-x1mwqya5.js:17708-17871 fingerprint = handleDelete (0.833)
function handleDelete(n, r) {
  logForDebugging(`[keybindings] Detected deletion of ${r}`);
  let defaultBindings = getDefaultParsedBindings();
  ((n.bindings = defaultBindings),
    (n.warnings = []),
    (n.warmedFromBackend = !1),
    n.changed.emit({ bindings: defaultBindings, warnings: [] }));
}
//@ chunk-4t8fx0s8.js:21206-21260 callgraph-fingerprint = loadKeybindingsSync (0.512)
function getChatActionDisplayText(e) {
  return getActionDisplayText(e, "Chat", keybindingsState.bindings ?? loadKeybindingsSyncWithWarnings());
}

export {
  isKeybindingCustomizationEnabled,
  getKeybindingsPath,
  keybindingsStoreKey,
  keybindingsState,
  getChatActionDisplayText,
  loadKeybindingsSyncWithWarnings,
  loadKeybindingsSync,
  getKeybindings,
  warmKeybindingsFromBackend,
  isKeybindingBlockArray,
  initializeKeybindingWatcher,
};
