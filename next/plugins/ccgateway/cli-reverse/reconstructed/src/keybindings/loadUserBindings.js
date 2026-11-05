/**
 * keybindings/loadUserBindings.ts
 *
 * 并入旧版已有路径：加载用户快捷键。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/loadUserBindings.ts
 * pieces: chunk-m2f3rb0f.js (24), chunk-z0x4zh5m.js (1)
 * attribution: fingerprint 8, layout 9, file-local 1, placement 3, sole-consumer 1, affinity 1, callgraph-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname } from "path";
import { readFileSync } from "fs";
import { readFile, stat } from "fs/promises";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema, record } from "../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { createSignal } from "../utils/signal.js";
import { logEvent } from "../services/analytics/index.js";
import { getClaudeConfigDir } from "../utils/markdownConfigLoader.js";
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
import { chokidar_default } from "../../vendor/chokidar/index.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { getActionDisplayText } from "./match.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-m2f3rb0f.js:2939-3002 fingerprint (2.1.88 match: isKeybindingBlock, 0.691)
/**
 * 宽松的 zod 结构：{context: string, bindings: Record<string, string|null>}，加载用户配置时只用它判断块形状（上下文与动作是否合法由 validate 另报）。
 */
var keybindingBlockSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-m2f3rb0f.js:2939", () => {
  keybindingBlockSchema = DoctorLazy(() =>
    objectSchema({
      context: stringSchema(),
      bindings: record(stringSchema(), stringSchema().nullable()),
    }),
  );
});
//@ chunk-m2f3rb0f.js:3002-3050 layout
function isKeybindingBlock(block) {
  return keybindingBlockSchema().safeParse(block).success;
}
//@ chunk-m2f3rb0f.js:3050-3101 file-local
/**
 * 判断 keybindings.json 的 bindings 是否为合法块数组。
 */
function isKeybindingBlockArray(arr) {
  return Array.isArray(arr) && arr.every(isKeybindingBlock);
}
//@ chunk-m2f3rb0f.js:9323-9392 fingerprint (2.1.88 match: isKeybindingCustomizationEnabled, 1)
/**
 * 用户自定义快捷键总开关：GrowthBook tengu_keybinding_customization_release，默认 true。
 */
function isKeybindingCustomizationEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_keybinding_customization_release", true);
}
//@ chunk-m2f3rb0f.js:9392-9410 layout
var WATCH_STABILITY_THRESHOLD_MS = 500;
var WATCH_POLL_INTERVAL_MS = 200;
//@ chunk-m2f3rb0f.js:9410-9747 layout
/**
 * 快捷键模块的进程级状态：当前绑定与警告、是否已从后端预热、文件监视器、每日一次的加载事件日期、已记录的回退提示、动作触发事件的节流表、变更信号 changed；支持 Symbol.dispose 关闭监视器。
 */
function createKeybindingsState() {
  let state = {
    bindings: null,
    warmedFromBackend: false,
    warmAttempted: false,
    warnings: [],
    watcher: null,
    initialized: false,
    disposed: false,
    lastCustomBindingsLogDate: null,
    loggedShortcutFallbacks: new Set(),
    actionFiredLoggedAt: new Map(),
    changed: createSignal(),
    [Symbol.dispose]() {
      state.disposed = true;
      if (state.watcher) {
        state.watcher.close();
        state.watcher = null;
      }
      state.changed.clear();
    },
  };
  return state;
}
//@ chunk-m2f3rb0f.js:9747-9759 layout
var keybindingsState; // deferred: uses createKeybindingsState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-m2f3rb0f.js:9747", () => {
  keybindingsState = createKeybindingsState();
});
//@ chunk-m2f3rb0f.js:9759-9950 fingerprint (2.1.88 match: logCustomBindingsLoadedOncePerDay, 0.876)
/**
 * 每天最多发一次 tengu_custom_keybindings_loaded（带用户绑定条数）。
 */
function logCustomBindingsLoadedOncePerDay(state, userBindingCount) {
  let today = new Date().toISOString().slice(0, 10);
  if (state.lastCustomBindingsLogDate === today) return;
  state.lastCustomBindingsLogDate = today;
  logEvent("tengu_custom_keybindings_loaded", {
    user_binding_count: userBindingCount,
  });
}
//@ chunk-m2f3rb0f.js:9950-10000 fingerprint (2.1.88 match: getKeybindingsPath, 1)
/**
 * 用户快捷键文件路径：<配置目录>/keybindings.json。
 */
function getKeybindingsPath() {
  return join(getClaudeConfigDir(), "keybindings.json");
}
//@ chunk-m2f3rb0f.js:10000-10032 placement
var keybindingsStoreKey; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-m2f3rb0f.js:10000", () => {
  keybindingsStoreKey = STORAGE_SPACES.state("keybindings");
});
//@ chunk-m2f3rb0f.js:10032-10060 placement
function getDefaultParsedBindings() {
  return parseBindings(DEFAULT_BINDINGS);
}
//@ chunk-m2f3rb0f.js:10060-10137 placement
/**
 * 展开用户块，只保留动作为 null（解绑）或合法动作/command:* 的绑定。
 */
function parseValidUserBindings(blocks) {
  return parseBindings(migrateDeprecatedActions(blocks)).filter(
    (binding) => binding.action === null || isValidBindingAction(binding.action),
  );
}
//@ chunk-m2f3rb0f.js:10273-10409 sole-consumer
/**
 * 上报 keybinding_load_user_config 特性事件（ok 记成功、否则记失败原因）；suppressFeatureEvents 时不报。
 */
function reportUserConfigLoad(options, outcome) {
  if (options?.suppressFeatureEvents) return;
  if (outcome === "ok") logFeatureOk("keybinding_load_user_config");
  else logFeatureBad("keybinding_load_user_config", outcome);
}
//@ chunk-m2f3rb0f.js:10409-10454 affinity
/**
 * 自定义被关闭（GrowthBook 开关关掉或策略禁止 keybindings）时为 true。
 */
function isKeybindingCustomizationBlocked() {
  return !isKeybindingCustomizationEnabled() || isCustomizationDisabled("keybindings");
}
//@ chunk-m2f3rb0f.js:10454-10671 callgraph-fingerprint (2.1.88 match: loadKeybindingsSyncWithWarnings, 0.257)
/**
 * 同步取绑定（不记日志、不报警告）：默认绑定 + 合法的用户绑定；自定义被禁或特定模式下只返回默认绑定。
 */
function loadKeybindingsSyncWithWarnings(options) {
  let defaultBindings = getDefaultParsedBindings();
  if (isKeybindingCustomizationBlocked()) return defaultBindings;
  if (isStorageV5Enabled() && options !== undefined) return defaultBindings;
  try {
    let content = readFileSync(getKeybindingsPath(), "utf-8");
    let parsed = jsonParse(content);
    let bindings =
      typeof parsed === "object" && parsed !== null && "bindings" in parsed ? parsed.bindings : undefined;
    return isKeybindingBlockArray(bindings)
      ? [...defaultBindings, ...parseValidUserBindings(bindings)]
      : defaultBindings;
  } catch {
    return defaultBindings;
  }
}
//@ chunk-m2f3rb0f.js:10671-12676 layout (2.1.88 match: loadKeybindings, 0.774)
/**
 * 异步加载：有后端存储时从后端读 keybindings 条目（读失败回退默认并报错）；否则读本地 keybindings.json。格式要求 {bindings:[...]}，结构不对时回退默认绑定并给出 parse_error；成功时默认绑定在前、用户绑定在后合并，附带重复键与校验警告。
 */
async function loadKeybindingsAsync(state, backend, options) {
  let defaultBindings = getDefaultParsedBindings();
  if (!isKeybindingCustomizationEnabled() || isCustomizationDisabled("keybindings"))
    return {
      bindings: defaultBindings,
      warnings: [],
    };
  let userPath = getKeybindingsPath();
  if (backend) {
    let readResult = await backend.read([keybindingsStoreKey]);
    if (!readResult.ok) {
      let error = readResult.error;
      let message = formatStorageError(error);
      logForDebugging(`[keybindings] Error loading ${userPath}: ${message}`);
      if (options?.suppressFeatureEvents)
        logFeatureSad("keybinding_load_user_config", "warm_backend_read_failed_fell_back");
      reportUserConfigLoad(options, "keybinding_config_parse_error");
      return {
        bindings: defaultBindings,
        warnings: [
          {
            type: "parse_error",
            severity: "error",
            message: `Failed to parse keybindings.json: ${message}`,
          },
        ],
      };
    }
    let item = readResult.value.items[0];
    if (!item.found) {
      reportUserConfigLoad(options, "ok");
      return {
        bindings: defaultBindings,
        warnings: [],
      };
    }
    return loadKeybindingsFromText(
      Buffer.from(item.value).toString("utf-8"),
      state,
      defaultBindings,
      userPath,
      options,
    );
  }
  try {
    let content = await readFile(userPath, "utf-8");
    let parsed = jsonParse(content);
    let userBlocks;
    if (typeof parsed === "object" && parsed !== null && "bindings" in parsed) userBlocks = parsed.bindings;
    else {
      logForDebugging(
        '[keybindings] Invalid keybindings.json: keybindings.json must have a "bindings" array',
      );
      reportUserConfigLoad(options, "keybinding_config_invalid_format");
      return {
        bindings: defaultBindings,
        warnings: [
          {
            type: "parse_error",
            severity: "error",
            message: 'keybindings.json must have a "bindings" array',
            suggestion: 'Use format: { "bindings": [ ... ] }',
          },
        ],
      };
    }
    if (!isKeybindingBlockArray(userBlocks)) {
      let errorMessage = !Array.isArray(userBlocks)
        ? '"bindings" must be an array'
        : "keybindings.json contains invalid block structure";
      let suggestion = !Array.isArray(userBlocks)
        ? 'Set "bindings" to an array of keybinding blocks'
        : 'Each block must have "context" (string) and "bindings" (object mapping keys to a string action or null)';
      logForDebugging(`[keybindings] Invalid keybindings.json: ${errorMessage}`);
      reportUserConfigLoad(options, "keybinding_config_invalid_structure");
      return {
        bindings: defaultBindings,
        warnings: [
          {
            type: "parse_error",
            severity: "error",
            message: errorMessage,
            suggestion,
          },
        ],
      };
    }
    let userParsed = parseValidUserBindings(userBlocks);
    logForDebugging(`[keybindings] Loaded ${userParsed.length} user bindings from ${userPath}`);
    let mergedBindings = [...defaultBindings, ...userParsed];
    logCustomBindingsLoadedOncePerDay(state, userParsed.length);
    let warnings = [...checkDuplicateKeysInJson(content), ...validateBindings(userBlocks, mergedBindings)];
    if (warnings.length > 0) {
      logForDebugging(`[keybindings] Found ${warnings.length} validation issue(s)`);
      logKeybindingWarnings(warnings);
    }
    reportUserConfigLoad(options, "ok");
    return {
      bindings: mergedBindings,
      warnings,
    };
  } catch (error) {
    if (isENOENT(error)) {
      reportUserConfigLoad(options, "ok");
      return {
        bindings: defaultBindings,
        warnings: [],
      };
    }
    logForDebugging(`[keybindings] Error loading ${userPath}: ${errorMessage(error)}`);
    reportUserConfigLoad(options, "keybinding_config_parse_error");
    return {
      bindings: defaultBindings,
      warnings: [
        {
          type: "parse_error",
          severity: "error",
          message: `Failed to parse keybindings.json: ${errorMessage(error)}`,
        },
      ],
    };
  }
}
//@ chunk-m2f3rb0f.js:12676-14029 fingerprint (2.1.88 match: loadKeybindings, 0.845)
/**
 * 从 JSON 文本解析用户绑定并与默认绑定合并（后端预热路径用），规则同 loadKeybindingsAsync。
 */
function loadKeybindingsFromText(text, state, defaultBindings, userPath, options) {
  try {
    let parsed = jsonParse(text);
    let userBlocks;
    if (typeof parsed === "object" && parsed !== null && "bindings" in parsed) userBlocks = parsed.bindings;
    else {
      logForDebugging(
        '[keybindings] Invalid keybindings.json: keybindings.json must have a "bindings" array',
      );
      reportUserConfigLoad(options, "keybinding_config_invalid_format");
      return {
        bindings: defaultBindings,
        warnings: [
          {
            type: "parse_error",
            severity: "error",
            message: 'keybindings.json must have a "bindings" array',
            suggestion: 'Use format: { "bindings": [ ... ] }',
          },
        ],
      };
    }
    if (!isKeybindingBlockArray(userBlocks)) {
      let errorMessage = !Array.isArray(userBlocks)
        ? '"bindings" must be an array'
        : "keybindings.json contains invalid block structure";
      let suggestion = !Array.isArray(userBlocks)
        ? 'Set "bindings" to an array of keybinding blocks'
        : 'Each block must have "context" (string) and "bindings" (object mapping keys to a string action or null)';
      logForDebugging(`[keybindings] Invalid keybindings.json: ${errorMessage}`);
      reportUserConfigLoad(options, "keybinding_config_invalid_structure");
      return {
        bindings: defaultBindings,
        warnings: [
          {
            type: "parse_error",
            severity: "error",
            message: errorMessage,
            suggestion,
          },
        ],
      };
    }
    let userParsed = parseValidUserBindings(userBlocks);
    logForDebugging(`[keybindings] Loaded ${userParsed.length} user bindings from ${userPath}`);
    let mergedBindings = [...defaultBindings, ...userParsed];
    logCustomBindingsLoadedOncePerDay(state, userParsed.length);
    let warnings = [...checkDuplicateKeysInJson(text), ...validateBindings(userBlocks, mergedBindings)];
    if (warnings.length > 0) {
      logForDebugging(`[keybindings] Found ${warnings.length} validation issue(s)`);
      logKeybindingWarnings(warnings);
    }
    reportUserConfigLoad(options, "ok");
    return {
      bindings: mergedBindings,
      warnings,
    };
  } catch (error) {
    logForDebugging(`[keybindings] Error loading ${userPath}: ${errorMessage(error)}`);
    reportUserConfigLoad(options, "keybinding_config_parse_error");
    return {
      bindings: defaultBindings,
      warnings: [
        {
          type: "parse_error",
          severity: "error",
          message: `Failed to parse keybindings.json: ${errorMessage(error)}`,
        },
      ],
    };
  }
}
//@ chunk-m2f3rb0f.js:14029-14372 layout
/**
 * 交互会话启动时从后端存储预热绑定（只尝试一次；有警告则不写入状态，留给同步加载报告）。
 */
async function warmKeybindingsFromBackend(state, backend) {
  if (state.bindings) return state.bindings;
  if (state.warmAttempted) return;
  if (getIsNonInteractiveSession()) return;
  if (isKeybindingCustomizationBlocked()) return;
  let result = await loadKeybindingsAsync(state, backend, {
    suppressFeatureEvents: true,
  });
  state.warmAttempted = true;
  if (result.warnings.length > 0) return result.bindings;
  if (!state.bindings) {
    state.bindings = result.bindings;
    state.warnings = [];
    state.warmedFromBackend = true;
    logFeatureOk("keybinding_load_user_config");
  }
  return state.bindings;
}
//@ chunk-m2f3rb0f.js:14372-14523 layout
/**
 * 预热得到的绑定只用一次：若此后自定义被禁则清空状态，返回是否需要重新加载。
 */
function invalidateWarmedBindings(state) {
  if (!state.warmedFromBackend) return false;
  if (isKeybindingCustomizationBlocked()) {
    state.bindings = null;
    state.warnings = [];
    state.warmedFromBackend = false;
    return true;
  }
  state.warmedFromBackend = false;
  return false;
}
//@ chunk-m2f3rb0f.js:14523-14602 layout
function getKeybindings(state) {
  if (state.bindings && !invalidateWarmedBindings(state)) return state.bindings;
  return loadKeybindingsSync(state).bindings;
}
//@ chunk-m2f3rb0f.js:14602-16471 layout (2.1.88 match: loadKeybindings, 0.798)
/**
 * 同步加载本地 keybindings.json 并写入状态（KeybindingSetup 首次渲染用）；规则同异步版，文件不存在视为成功（只有默认绑定）。
 */
function loadKeybindingsSync(state) {
  if (state.bindings && !invalidateWarmedBindings(state))
    return {
      bindings: state.bindings,
      warnings: state.warnings,
    };
  state.warmedFromBackend = false;
  let defaultBindings = getDefaultParsedBindings();
  if (!isKeybindingCustomizationEnabled() || isCustomizationDisabled("keybindings")) {
    state.bindings = defaultBindings;
    state.warnings = [];
    return {
      bindings: state.bindings,
      warnings: state.warnings,
    };
  }
  let userPath = getKeybindingsPath();
  try {
    let content = readFileSync(userPath, "utf-8");
    let parsed = jsonParse(content);
    let userBlocks;
    if (typeof parsed === "object" && parsed !== null && "bindings" in parsed) userBlocks = parsed.bindings;
    else {
      logFeatureBad("keybinding_load_user_config", "keybinding_config_invalid_format");
      state.bindings = defaultBindings;
      state.warnings = [
        {
          type: "parse_error",
          severity: "error",
          message: 'keybindings.json must have a "bindings" array',
          suggestion: 'Use format: { "bindings": [ ... ] }',
        },
      ];
      return {
        bindings: state.bindings,
        warnings: state.warnings,
      };
    }
    if (!isKeybindingBlockArray(userBlocks)) {
      let errorMessage = !Array.isArray(userBlocks)
        ? '"bindings" must be an array'
        : "keybindings.json contains invalid block structure";
      let suggestion = !Array.isArray(userBlocks)
        ? 'Set "bindings" to an array of keybinding blocks'
        : 'Each block must have "context" (string) and "bindings" (object mapping keys to a string action or null)';
      logFeatureBad("keybinding_load_user_config", "keybinding_config_invalid_structure");
      state.bindings = defaultBindings;
      state.warnings = [
        {
          type: "parse_error",
          severity: "error",
          message: errorMessage,
          suggestion,
        },
      ];
      return {
        bindings: state.bindings,
        warnings: state.warnings,
      };
    }
    let userParsed = parseValidUserBindings(userBlocks);
    logForDebugging(`[keybindings] Loaded ${userParsed.length} user bindings from ${userPath}`);
    state.bindings = [...defaultBindings, ...userParsed];
    logCustomBindingsLoadedOncePerDay(state, userParsed.length);
    let duplicateKeyWarnings = checkDuplicateKeysInJson(content);
    state.warnings = [...duplicateKeyWarnings, ...validateBindings(userBlocks, state.bindings)];
    if (state.warnings.length > 0) {
      logForDebugging(`[keybindings] Found ${state.warnings.length} validation issue(s)`);
      logKeybindingWarnings(state.warnings);
    }
    logFeatureOk("keybinding_load_user_config");
    return {
      bindings: state.bindings,
      warnings: state.warnings,
    };
  } catch (error) {
    if (isENOENT(error)) {
      logFeatureOk("keybinding_load_user_config");
      state.bindings = defaultBindings;
      state.warnings = [];
      return {
        bindings: state.bindings,
        warnings: state.warnings,
      };
    }
    logForDebugging(`[keybindings] Error loading ${userPath}: ${errorMessage(error)}`);
    logFeatureBad("keybinding_load_user_config", "keybinding_config_parse_error");
    state.bindings = defaultBindings;
    state.warnings = [
      {
        type: "parse_error",
        severity: "error",
        message: `Failed to parse keybindings.json: ${errorMessage(error)}`,
      },
    ];
    return {
      bindings: state.bindings,
      warnings: state.warnings,
    };
  }
}
//@ chunk-m2f3rb0f.js:16471-17398 fingerprint (2.1.88 match: initializeKeybindingWatcher, 0.794)
/**
 * 启动 keybindings.json 的 chokidar 监视（轮询 2 秒、写入稳定 500ms）：add/change 时异步重载并发 changed 信号，unlink 时回到默认绑定；目录不存在或自定义被禁时不监视。
 */
async function initializeKeybindingWatcher(state) {
  if (state.initialized || state.disposed) return;
  if (!isKeybindingCustomizationEnabled() || isCustomizationDisabled("keybindings")) {
    logForDebugging("[keybindings] Skipping file watcher - user customization disabled");
    return;
  }
  let userPath = getKeybindingsPath();
  let watchDir = dirname(userPath);
  try {
    if (!(await stat(watchDir)).isDirectory()) {
      logForDebugging(`[keybindings] Not watching: ${watchDir} is not a directory`);
      logFeatureSad("keybinding_watcher_init", "watch_dir_inaccessible");
      return;
    }
  } catch {
    logForDebugging(`[keybindings] Not watching: ${watchDir} does not exist`);
    logFeatureSad("keybinding_watcher_init", "watch_dir_inaccessible");
    return;
  }
  state.initialized = true;
  logForDebugging(`[keybindings] Watching for changes to ${userPath}`);
  state.watcher = chokidar_default.watch(userPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: WATCH_STABILITY_THRESHOLD_MS,
      pollInterval: WATCH_POLL_INTERVAL_MS,
    },
    ignorePermissionErrors: true,
    usePolling: true,
    interval: 2000,
    atomic: true,
  });
  state.watcher.on("add", (path) => handleChange(state, path));
  state.watcher.on("change", (path) => handleChange(state, path));
  state.watcher.on("unlink", (path) => handleDelete(state, path));
  state.watcher.on("error", (error) =>
    logForDebugging(`[keybindings] watcher error: ${errorMessage(error)}`, {
      level: "warn",
    }),
  );
  registerCleanup(state);
  logFeatureOk("keybinding_watcher_init");
}
//@ chunk-m2f3rb0f.js:17398-17706 fingerprint (2.1.88 match: handleChange, 0.678)
/**
 * 文件变化：重新加载，写入状态并通知订阅者（热重载）。
 */
async function handleChange(state, path) {
  logForDebugging(`[keybindings] Detected change to ${path}`);
  try {
    let result = await loadKeybindingsAsync(state);
    state.bindings = result.bindings;
    state.warnings = result.warnings;
    state.warmedFromBackend = false;
    state.changed.emit(result);
    logFeatureOk("keybinding_hot_reload");
  } catch (error) {
    logForDebugging(`[keybindings] Error reloading: ${errorMessage(error)}`);
    logFeatureSad("keybinding_hot_reload", "keybinding_reload_failed");
  }
}
//@ chunk-m2f3rb0f.js:17706-17869 fingerprint (2.1.88 match: handleDelete, 0.833)
/**
 * 文件被删除：回到默认绑定并通知订阅者。
 */
function handleDelete(state, path) {
  logForDebugging(`[keybindings] Detected deletion of ${path}`);
  let defaultBindings = getDefaultParsedBindings();
  state.bindings = defaultBindings;
  state.warnings = [];
  state.warmedFromBackend = false;
  state.changed.emit({
    bindings: defaultBindings,
    warnings: [],
  });
}
//@ chunk-z0x4zh5m.js:23784-23838 callgraph-fingerprint (2.1.88 match: loadKeybindingsSync, 0.511)
function getChatActionDisplayText(action) {
  return getActionDisplayText(action, "Chat", keybindingsState.bindings ?? loadKeybindingsSyncWithWarnings());
}
export {
  keybindingsState,
  getKeybindings,
  loadKeybindingsSync,
  isKeybindingCustomizationEnabled,
  getChatActionDisplayText,
  warmKeybindingsFromBackend,
  getKeybindingsPath,
  keybindingsStoreKey,
  isKeybindingBlockArray,
  loadKeybindingsSyncWithWarnings,
  initializeKeybindingWatcher,
};
