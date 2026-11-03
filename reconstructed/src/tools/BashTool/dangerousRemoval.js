/**
 * tools/BashTool/dangerousRemoval.ts
 *
 * 2.1.316 新增：危险删除（变量展开路径的 rm）检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import { AsyncLocalStorage } from "async_hooks";
import { getOpenQuoteAt, getBareVariableName, stripTrailingPathGlob } from "./expansionAnalysis.js";
import { uniq } from "../../utils/collections.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-e6aww6q8.js:1064812-1065012 placement
/**
 * 构造危险删除的 ask 结果：safetyCheck 原因、不可被分类器批准、circuitBreaker = dangerousRemoval、无建议。
 */
function dangerousRemovalAsk(command, message, r) {
  return {
    behavior: "ask",
    message,
    decisionReason: {
      type: "safetyCheck",
      reason: `Dangerous ${command} operation ${r}`,
      classifierApprovable: false,
      circuitBreaker: "dangerousRemoval",
    },
    suggestions: [],
  };
}
//@ chunk-e6aww6q8.js:1065012-1068959 placement
/**
 * 检查 rm 的目标是否来自可能为空的变量展开，提示改用字面路径或 ${VAR:?}。
 */
function checkDangerousRemoval(dangerousVariableRemoval, n) {
  let { command, target, invocation, reparsed } = dangerousVariableRemoval;
  let S = [];
  let w = [];
  let replaced = target.replace(
    /\$(?:\{([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*!])(?::?-(?:["']{2}|"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?)?)?\}|([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*!]))/g,
    (written, we, Ee, Ae, Ie) => {
      let Me = we ?? Ae;
      S.push(Me);
      let We = `\${${Me}:?}`;
      if (Ee !== undefined) {
        S.push(Ee);
        We = `\${${Me}:-\${${Ee}:?}}`;
      }
      if (getOpenQuoteAt(target, Ie) === null) We = `"${We}"`;
      w.push({
        name: Me,
        written,
        guarded: We,
      });
      return We;
    },
  );
  let G = S.length === 0 ? ["VAR"] : uniq(S);
  let joined = G.map((ke) => `$${ke}`).join(" or ");
  let Z = (ke) => {
    let we = ke ? "`" : "";
    if (dangerousVariableRemoval.rootChild !== undefined) {
      if (reparsed)
        return ke
          ? `use a literal absolute path: when ${joined} is empty this ${command} removes /${dangerousVariableRemoval.rootChild}, and the ${command} is parsed again before it runs (it is inside a quoted string or after eval), so a pasted guard's quotes would not protect it`
          : `use a literal path: when ${joined} is empty this removes /${dangerousVariableRemoval.rootChild}, and the ${command} is parsed again before it runs`;
      return ke
        ? `rewrite it as ${we}${replaced}${we}, which makes the shell stop with an error instead of removing /${dangerousVariableRemoval.rootChild} when ${joined} is unset or empty (it is not set in the environment this command inherits), or use a literal absolute path`
        : `rewrite it as ${replaced} or use a literal path: when ${joined} is empty this removes /${dangerousVariableRemoval.rootChild}`;
    }
    let joined_2 = G.filter((We) => SYSTEM_DIR_ENV_VARS.has(We.toUpperCase()))
      .map((We) => `$${We}`)
      .join(" or ");
    if (joined_2 !== "")
      return ke
        ? `use a literal absolute path: ${joined_2} is normally set, so a guard on it would not stop this ${command}`
        : `use a literal path: ${joined_2} is normally set, so a guard would not stop this`;
    let Ae = (name) => /^(?:[0-9]+|[@*!])$/.test(name);
    let filtered = G.filter(Ae);
    if (filtered.length > 0) {
      let joined = w
        .filter((lt) => !Ae(lt.name) && !reparsed)
        .map(({ written, guarded }) => `${we}${written}${we} as ${we}${guarded}${we}`)
        .join(" and ");
      let ze =
        `bind ${filtered.map((lt) => `$${lt}`).join(" or ")}` +
        (joined === "" ? "" : ` and rewrite its ${joined}`);
      return ke
        ? `${ze} (in an inline \`sh -c\` script, single-quote the script so this shell does not expand the positional) or use a literal absolute path`
        : `${ze} or use a literal path`;
    }
    if (reparsed)
      return ke
        ? `use a literal absolute path: this ${command} is parsed again before it runs (it is inside a quoted string or after eval), so a pasted guard's quotes would not protect it`
        : `use a literal path: the ${command} is parsed again before it runs`;
    let reduced = w.reduce((acc, ze) => acc.replace(ze.guarded, ""), replaced);
    if (w.length === 0 || reduced.includes("$"))
      return ke
        ? "use a literal absolute path: this check cannot verify part of this target"
        : "use a literal path: this check cannot verify part of this target";
    return ke
      ? `rewrite it as ${we}${replaced}${we}, which makes the shell stop with an error instead of running ${command} when ${joined} is unset or empty, or use a literal absolute path`
      : `rewrite it as ${replaced} or use a literal path`;
  };
  let Se = n ? " (inside a command substitution)" : "";
  if (dangerousVariableRemoval.derived !== undefined) {
    let { value: ke, becomes } = dangerousVariableRemoval.derived;
    let Ee = getBareVariableName(stripTrailingPathGlob(target)) ?? G[0];
    return dangerousRemovalAsk(
      command,
      `Dangerous ${command} operation detected in \`${invocation}\`${Se}. This command sets $${Ee} from \`${ke}\`, which ${becomes}, so this ${command} can remove that directory. A \`\${${Ee}:?}\` guard does not help, because $${Ee} is not empty. This requires explicit approval and cannot be auto-allowed by permission rules.

Use a literal absolute path instead.`,
      `on possibly-empty variable path${n ? " inside command substitution" : ""}: ${target} in \`${invocation}\` (use a literal path: $${Ee} is set in this command from ${ke}, which ${becomes})`,
    );
  }
  return dangerousRemovalAsk(
    command,
    `Dangerous ${command} operation detected in \`${invocation}\`${Se}. The target '${target}' is a shell variable expansion: when ${joined} is unset or empty it ` +
      (dangerousVariableRemoval.rootChild === undefined
        ? "becomes `/`, `/*` or a top-level path. "
        : `becomes \`/${dangerousVariableRemoval.rootChild}\`. `) +
      `This requires explicit approval and cannot be auto-allowed by permission rules.

` +
      (dangerousVariableRemoval.rootChild === undefined
        ? `This check does not fire on a target that cannot expand to the filesystem root: ${Z(true)}.`
        : `This check does not fire on a target that cannot expand to a top-level directory: ${Z(true)}.`),
    `on possibly-empty variable path${n ? " inside command substitution" : ""}: ${target} in \`${invocation}\` (${Z(false)})`,
  );
}
//@ chunk-e6aww6q8.js:1068959-1069313 placement
/**
 * 指向系统或用户关键目录的环境变量集合（HOME、XDG_*、APPDATA、SYSTEMROOT、PROGRAMFILES、PWD 等），用于危险删除判断。
 */
var SYSTEM_DIR_ENV_VARS = new Set([
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
var TENGU_BRIGHT_LAKE = "tengu_bright_lake";
//@ chunk-e6aww6q8.js:1069313-1069389 placement
/**
 * 读取 tengu_bright_lake 配置：除非载荷里显式为 false，否则危险 rm 检查启用。
 */
function isDangerousRmEnabled() {
  let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_BRIGHT_LAKE, true);
  return e !== false || source !== "payload";
}
//@ chunk-e6aww6q8.js:1069389-1069453 placement
/**
 * 上报 “tengu_bash_dangerous_rm_shape” 事件，记录危险 rm 的命令形状。
 */
function logDangerousRmShape(e) {
  logEventUnlessSuppressed("tengu_bash_dangerous_rm_shape", {
    shape: fromEnum(e),
  });
}
//@ chunk-e6aww6q8.js:1069453-1069469 placement
/**
 * 标记“静默遥测作用域”的 AsyncLocalStorage；在作用域内 logEventUnlessSuppressed 不写事件。
 */
var suppressedTelemetryStorage = new AsyncLocalStorage();
//@ chunk-e6aww6q8.js:1069469-1069506 placement
/**
 * 在静默遥测作用域内运行回调（其中的事件不上报）。
 */
function runWithoutTelemetry(e) {
  return suppressedTelemetryStorage.run(true, e);
}
//@ chunk-e6aww6q8.js:1069506-1069559 placement = getAgentContext (1)
/**
 * 不在静默作用域内时才记遥测事件（Bash 危险命令形状等）。
 */
function logEventUnlessSuppressed(...e) {
  if (suppressedTelemetryStorage.getStore() === undefined) logEvent(...e);
}
//@ chunk-e6aww6q8.js:1069559-1070063 placement
/**
 * 危险删除原因文案片段与分类用正则（变量为空时删除 /、驱动器根、挂载盘路径），以及挂载卷路径正则。
 */
var EMPTY_EXPANSION_HINT = "use a literal path: when the expansion is empty this removes /";
var DRIVE_ROOT_PREFIX = "on drive root: ";
var MOUNTED_DRIVE_PREFIX = "on mounted drive path: ";
var PLACEHOLDER_ROOT_CHILD_RE = new RegExp(
  String.raw`^Dangerous rm(?:dir)? operation on possibly-empty variable path: \$\{\u2026\}\S* \(${EMPTY_EXPANSION_HINT}[A-Za-z0-9+]+\)$`,
);
var BACKSLASH_ONLY_RE = new RegExp(String.raw`^Dangerous rm(?:dir)? operation ${DRIVE_ROOT_PREFIX}\\+$`);
var MOUNTED_DRIVE_REASON_RE = new RegExp(`^Dangerous rm(?:dir)? operation ${MOUNTED_DRIVE_PREFIX}/`);
var MOUNTED_VOLUME_PATH_RE =
  /^\/(?:system\/)?volumes(?:\/[^/]+){0,2}$|^\/mnt\/(?:[^/]+|[a-z]\/[^/]+)$|^\/(?:run\/)?media(?:\/[^/]+){0,3}$/i;
//@ chunk-e6aww6q8.js:1070063-1070212 placement
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
  logDangerousRmShape,
  logEventUnlessSuppressed,
  checkDangerousRemoval,
  classifyRemovalReason,
  dangerousRemovalAsk,
  runWithoutTelemetry,
  EMPTY_EXPANSION_HINT,
  DRIVE_ROOT_PREFIX,
  MOUNTED_VOLUME_PATH_RE,
  MOUNTED_DRIVE_PREFIX,
};
