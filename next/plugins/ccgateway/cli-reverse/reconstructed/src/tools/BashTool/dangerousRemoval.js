/**
 * tools/BashTool/dangerousRemoval.ts
 *
 * 2.1.316 新增：危险删除（变量展开路径的 rm）检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 10
 */
import { AsyncLocalStorage } from "async_hooks";
import { getOpenQuoteAt, getBareVariableName, stripTrailingPathGlob } from "./expansionAnalysis.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1060063-1060263 placement
/**
 * 构造危险删除的 ask 结果：safetyCheck 原因、不可被分类器批准、circuitBreaker = dangerousRemoval、无建议。
 */
function dangerousRemovalAsk(command, message, detail) {
  return {
    behavior: "ask",
    message,
    decisionReason: {
      type: "safetyCheck",
      reason: `Dangerous ${command} operation ${detail}`,
      classifierApprovable: false,
      circuitBreaker: "dangerousRemoval",
    },
    suggestions: [],
  };
}
//@ chunk-5xgkngpb.js:1060263-1064214 placement
/**
 * 检查 rm 的目标是否来自可能为空的变量展开，提示改用字面路径或 ${VAR:?}。
 */
function checkDangerousRemoval(dangerousVariableRemoval, inSubstitution) {
  let { command, target, invocation, reparsed } = dangerousVariableRemoval;
  let varNames = [];
  let rewrites = [];
  let replaced = target.replace(
    /\$(?:\{([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*!])(?::?-(?:["']{2}|"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?)?)?\}|([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*!]))/g,
    (written, bracedName, defaultName, plainName, offset) => {
      let name = bracedName ?? plainName;
      varNames.push(name);
      let guard = `\${${name}:?}`;
      if (defaultName !== undefined) {
        varNames.push(defaultName);
        guard = `\${${name}:-\${${defaultName}:?}}`;
      }
      if (getOpenQuoteAt(target, offset) === null) guard = `"${guard}"`;
      rewrites.push({
        name,
        written,
        guarded: guard,
      });
      return guard;
    },
  );
  let names = varNames.length === 0 ? ["VAR"] : normalizeCaseForComparison_2(varNames);
  let joined = names.map((name) => `$${name}`).join(" or ");
  let explainGuard = (hasBacktick) => {
    let quote = hasBacktick ? "`" : "";
    if (dangerousVariableRemoval.rootChild !== undefined) {
      if (reparsed)
        return hasBacktick
          ? `use a literal absolute path: when ${joined} is empty this ${command} removes /${dangerousVariableRemoval.rootChild}, and the ${command} is parsed again before it runs (it is inside a quoted string or after eval), so a pasted guard's quotes would not protect it`
          : `use a literal path: when ${joined} is empty this removes /${dangerousVariableRemoval.rootChild}, and the ${command} is parsed again before it runs`;
      return hasBacktick
        ? `rewrite it as ${quote}${replaced}${quote}, which makes the shell stop with an error instead of removing /${dangerousVariableRemoval.rootChild} when ${joined} is unset or empty (it is not set in the environment this command inherits), or use a literal absolute path`
        : `rewrite it as ${replaced} or use a literal path: when ${joined} is empty this removes /${dangerousVariableRemoval.rootChild}`;
    }
    let joined_2 = names
      .filter((name) => SYSTEM_DIR_ENV_VARS.has(name.toUpperCase()))
      .map((name) => `$${name}`)
      .join(" or ");
    if (joined_2 !== "")
      return hasBacktick
        ? `use a literal absolute path: ${joined_2} is normally set, so a guard on it would not stop this ${command}`
        : `use a literal path: ${joined_2} is normally set, so a guard would not stop this`;
    let isPositional = (name) => /^(?:[0-9]+|[@*!])$/.test(name);
    let filtered = names.filter(isPositional);
    if (filtered.length > 0) {
      let joined = rewrites
        .filter((rewrite) => !isPositional(rewrite.name) && !reparsed)
        .map(({ written, guarded }) => `${quote}${written}${quote} as ${quote}${guarded}${quote}`)
        .join(" and ");
      let advice =
        `bind ${filtered.map((name) => `$${name}`).join(" or ")}` +
        (joined === "" ? "" : ` and rewrite its ${joined}`);
      return hasBacktick
        ? `${advice} (in an inline \`sh -c\` script, single-quote the script so this shell does not expand the positional) or use a literal absolute path`
        : `${advice} or use a literal path`;
    }
    if (reparsed)
      return hasBacktick
        ? `use a literal absolute path: this ${command} is parsed again before it runs (it is inside a quoted string or after eval), so a pasted guard's quotes would not protect it`
        : `use a literal path: the ${command} is parsed again before it runs`;
    let reduced = rewrites.reduce((acc, rewrite) => acc.replace(rewrite.guarded, ""), replaced);
    if (rewrites.length === 0 || reduced.includes("$"))
      return hasBacktick
        ? "use a literal absolute path: this check cannot verify part of this target"
        : "use a literal path: this check cannot verify part of this target";
    return hasBacktick
      ? `rewrite it as ${quote}${replaced}${quote}, which makes the shell stop with an error instead of running ${command} when ${joined} is unset or empty, or use a literal absolute path`
      : `rewrite it as ${replaced} or use a literal path`;
  };
  let substitutionSuffix = inSubstitution ? " (inside a command substitution)" : "";
  if (dangerousVariableRemoval.derived !== undefined) {
    let { value: sourceValue, becomes } = dangerousVariableRemoval.derived;
    let name = getBareVariableName(stripTrailingPathGlob(target)) ?? names[0];
    return dangerousRemovalAsk(
      command,
      `Dangerous ${command} operation detected in \`${invocation}\`${substitutionSuffix}. This command sets $${name} from \`${sourceValue}\`, which ${becomes}, so this ${command} can remove that directory. A \`\${${name}:?}\` guard does not help, because $${name} is not empty. This requires explicit approval and cannot be auto-allowed by permission rules.

Use a literal absolute path instead.`,
      `on possibly-empty variable path${inSubstitution ? " inside command substitution" : ""}: ${target} in \`${invocation}\` (use a literal path: $${name} is set in this command from ${sourceValue}, which ${becomes})`,
    );
  }
  return dangerousRemovalAsk(
    command,
    `Dangerous ${command} operation detected in \`${invocation}\`${substitutionSuffix}. The target '${target}' is a shell variable expansion: when ${joined} is unset or empty it ` +
      (dangerousVariableRemoval.rootChild === undefined
        ? "becomes `/`, `/*` or a top-level path. "
        : `becomes \`/${dangerousVariableRemoval.rootChild}\`. `) +
      `This requires explicit approval and cannot be auto-allowed by permission rules.

` +
      (dangerousVariableRemoval.rootChild === undefined
        ? `This check does not fire on a target that cannot expand to the filesystem root: ${explainGuard(true)}.`
        : `This check does not fire on a target that cannot expand to a top-level directory: ${explainGuard(true)}.`),
    `on possibly-empty variable path${inSubstitution ? " inside command substitution" : ""}: ${target} in \`${invocation}\` (${explainGuard(false)})`,
  );
}
//@ chunk-5xgkngpb.js:1064214-1064568 placement
/**
 * 指向系统或用户关键目录的环境变量集合（HOME、XDG_*、APPDATA、SYSTEMROOT、PROGRAMFILES、PWD 等），用于危险删除判断。
 */
var SYSTEM_DIR_ENV_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TENGU_BRIGHT_LAKE;
deferInit("chunk-5xgkngpb.js:1064214", () => {
  SYSTEM_DIR_ENV_VARS = new Set([
    "HOME",
    "USERPROFILE",
    "HOMEPATH",
    "HOMEDRIVE",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "XDG_CACHE_HOME",
    "XDG_STATE_HOME",
    "APPDATA",
    "LOCALAPPDATA",
    "SYSTEMDRIVE",
    "SYSTEMROOT",
    "WINDIR",
    "PROGRAMFILES",
    "PROGRAMW6432",
    "PROGRAMDATA",
    "ALLUSERSPROFILE",
    "PUBLIC",
    "HOMESHARE",
    "XDG_RUNTIME_DIR",
    "PWD",
    "OLDPWD",
    "TMPDIR",
    "TMP",
    "TEMP",
  ]);
  TENGU_BRIGHT_LAKE = "tengu_bright_lake";
});
//@ chunk-5xgkngpb.js:1064568-1064644 placement
/**
 * 读取 tengu_bright_lake 配置：除非载荷里显式为 false，否则危险 rm 检查启用。
 */
function isDangerousRmEnabled() {
  let { value: config, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_BRIGHT_LAKE, true);
  return config !== false || source !== "payload";
}
//@ chunk-5xgkngpb.js:1064644-1064708 placement
/**
 * 上报 “tengu_bash_dangerous_rm_shape” 事件，记录危险 rm 的命令形状。
 */
function logDangerousRmShape(shape) {
  logEventUnlessSuppressed("tengu_bash_dangerous_rm_shape", {
    shape: fromEnum(shape),
  });
}
//@ chunk-5xgkngpb.js:1064708-1064724 placement
/**
 * 标记“静默遥测作用域”的 AsyncLocalStorage；在作用域内 logEventUnlessSuppressed 不写事件。
 */
var suppressedTelemetryStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1064708", () => {
  suppressedTelemetryStorage = new AsyncLocalStorage();
});
//@ chunk-5xgkngpb.js:1064724-1064761 placement
/**
 * 在静默遥测作用域内运行回调（其中的事件不上报）。
 */
function runWithoutTelemetry(fn) {
  return suppressedTelemetryStorage.run(true, fn);
}
//@ chunk-5xgkngpb.js:1064761-1064814 placement
/**
 * 不在静默作用域内时才记遥测事件（Bash 危险命令形状等）。
 */
function logEventUnlessSuppressed(...args) {
  if (suppressedTelemetryStorage.getStore() === undefined) logEvent(...args);
}
//@ chunk-5xgkngpb.js:1064814-1065318 placement
/**
 * 危险删除原因文案片段与分类用正则（变量为空时删除 /、驱动器根、挂载盘路径），以及挂载卷路径正则。
 */
var EMPTY_EXPANSION_HINT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DRIVE_ROOT_PREFIX;
var MOUNTED_DRIVE_PREFIX;
var PLACEHOLDER_ROOT_CHILD_RE;
var BACKSLASH_ONLY_RE;
var MOUNTED_DRIVE_REASON_RE;
var MOUNTED_VOLUME_PATH_RE;
deferInit("chunk-5xgkngpb.js:1064814", () => {
  EMPTY_EXPANSION_HINT = "use a literal path: when the expansion is empty this removes /";
  DRIVE_ROOT_PREFIX = "on drive root: ";
  MOUNTED_DRIVE_PREFIX = "on mounted drive path: ";
  PLACEHOLDER_ROOT_CHILD_RE = new RegExp(
    String.raw`^Dangerous rm(?:dir)? operation on possibly-empty variable path: \$\{\u2026\}\S* \(${EMPTY_EXPANSION_HINT}[A-Za-z0-9+]+\)$`,
  );
  BACKSLASH_ONLY_RE = new RegExp(String.raw`^Dangerous rm(?:dir)? operation ${DRIVE_ROOT_PREFIX}\\+$`);
  MOUNTED_DRIVE_REASON_RE = new RegExp(`^Dangerous rm(?:dir)? operation ${MOUNTED_DRIVE_PREFIX}/`);
  MOUNTED_VOLUME_PATH_RE =
    /^\/(?:system\/)?volumes(?:\/[^/]+){0,2}$|^\/mnt\/(?:[^/]+|[a-z]\/[^/]+)$|^\/(?:run\/)?media(?:\/[^/]+){0,3}$/i;
});
//@ chunk-5xgkngpb.js:1065318-1065467 placement
/**
 * 分类危险删除目标的特殊形态：占位根子目录、仅反斜杠、挂载盘路径。
 */
function classifyRemovalReason(reason) {
  if (PLACEHOLDER_ROOT_CHILD_RE.test(reason)) return "placeholder_root_child";
  if (BACKSLASH_ONLY_RE.test(reason)) return "backslash_only";
  if (MOUNTED_DRIVE_REASON_RE.test(reason)) return "mounted_drive_path";
  return;
}
export {
  isDangerousRmEnabled,
  dangerousRemovalAsk,
  EMPTY_EXPANSION_HINT,
  DRIVE_ROOT_PREFIX,
  MOUNTED_VOLUME_PATH_RE,
  MOUNTED_DRIVE_PREFIX,
  runWithoutTelemetry,
  classifyRemovalReason,
  logDangerousRmShape,
  checkDangerousRemoval,
  logEventUnlessSuppressed,
};
