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
import {
  AsyncLocalStorage,
  AsyncLocalStorage as AsyncLocalStorage_2,
  AsyncLocalStorage as AsyncLocalStorage_3,
  AsyncLocalStorage as AsyncLocalStorage_4,
  AsyncLocalStorage as AsyncLocalStorage_5,
  AsyncLocalStorage as AsyncLocalStorage_6,
  AsyncLocalStorage as AsyncLocalStorage_7,
  AsyncLocalStorage as AsyncLocalStorage_8,
} from "async_hooks";
import { getOpenQuoteAt, getBareVariableName, stripTrailingPathGlob } from "./expansionAnalysis.js";
import { uniq } from "../../utils/collections.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";

/**
 * 构造危险删除的 ask 结果：safetyCheck 原因、不可被分类器批准、circuitBreaker = dangerousRemoval、无建议。
 */
//@ chunk-e6aww6q8.js:1064812-1065012 placement
function dangerousRemovalAsk(e, n, r) {
  return {
    behavior: "ask",
    message: n,
    decisionReason: {
      type: "safetyCheck",
      reason: `Dangerous ${e} operation ${r}`,
      classifierApprovable: !1,
      circuitBreaker: "dangerousRemoval",
    },
    suggestions: [],
  };
}
/**
 * 检查 rm 的目标是否来自可能为空的变量展开，提示改用字面路径或 ${VAR:?}。
 */
//@ chunk-e6aww6q8.js:1065012-1068959 placement
function checkDangerousRemoval(e, n) {
  let { command: command, target: target, invocation: invocation, reparsed: reparsed } = e,
    S = [],
    w = [],
    replaced = target.replace(
      /\$(?:\{([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*!])(?::?-(?:["']{2}|"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?)?)?\}|([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*!]))/g,
      (ke, we, Ee, Ae, Ie) => {
        let Me = we ?? Ae;
        S.push(Me);
        let We = `\${${Me}:?}`;
        if (Ee !== void 0) (S.push(Ee), (We = `\${${Me}:-\${${Ee}:?}}`));
        if (getOpenQuoteAt(target, Ie) === null) We = `"${We}"`;
        return (w.push({ name: Me, written: ke, guarded: We }), We);
      },
    ),
    G = S.length === 0 ? ["VAR"] : uniq(S),
    joined = G.map((ke) => `$${ke}`).join(" or "),
    Z = (ke) => {
      let we = ke ? "`" : "";
      if (e.rootChild !== void 0) {
        if (reparsed)
          return ke
            ? `use a literal absolute path: when ${joined} is empty this ${command} removes /${e.rootChild}, and the ${command} is parsed again before it runs (it is inside a quoted string or after eval), so a pasted guard's quotes would not protect it`
            : `use a literal path: when ${joined} is empty this removes /${e.rootChild}, and the ${command} is parsed again before it runs`;
        return ke
          ? `rewrite it as ${we}${replaced}${we}, which makes the shell stop with an error instead of removing /${e.rootChild} when ${joined} is unset or empty (it is not set in the environment this command inherits), or use a literal absolute path`
          : `rewrite it as ${replaced} or use a literal path: when ${joined} is empty this removes /${e.rootChild}`;
      }
      let joined_2 = G.filter((We) => SYSTEM_DIR_ENV_VARS.has(We.toUpperCase()))
        .map((We) => `$${We}`)
        .join(" or ");
      if (joined_2 !== "")
        return ke
          ? `use a literal absolute path: ${joined_2} is normally set, so a guard on it would not stop this ${command}`
          : `use a literal path: ${joined_2} is normally set, so a guard would not stop this`;
      let Ae = (We) => /^(?:[0-9]+|[@*!])$/.test(We),
        filtered = G.filter(Ae);
      if (filtered.length > 0) {
        let joined = w
            .filter((lt) => !Ae(lt.name) && !reparsed)
            .map(({ written: written, guarded: guarded }) => `${we}${written}${we} as ${we}${guarded}${we}`)
            .join(" and "),
          ze =
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
      let reduced = w.reduce((We, ze) => We.replace(ze.guarded, ""), replaced);
      if (w.length === 0 || reduced.includes("$"))
        return ke
          ? "use a literal absolute path: this check cannot verify part of this target"
          : "use a literal path: this check cannot verify part of this target";
      return ke
        ? `rewrite it as ${we}${replaced}${we}, which makes the shell stop with an error instead of running ${command} when ${joined} is unset or empty, or use a literal absolute path`
        : `rewrite it as ${replaced} or use a literal path`;
    },
    Se = n ? " (inside a command substitution)" : "";
  if (e.derived !== void 0) {
    let { value: ke, becomes: becomes } = e.derived,
      Ee = getBareVariableName(stripTrailingPathGlob(target)) ?? G[0];
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
      (e.rootChild === void 0 ? "becomes `/`, `/*` or a top-level path. " : `becomes \`/${e.rootChild}\`. `) +
      `This requires explicit approval and cannot be auto-allowed by permission rules.

` +
      (e.rootChild === void 0
        ? `This check does not fire on a target that cannot expand to the filesystem root: ${Z(!0)}.`
        : `This check does not fire on a target that cannot expand to a top-level directory: ${Z(!0)}.`),
    `on possibly-empty variable path${n ? " inside command substitution" : ""}: ${target} in \`${invocation}\` (${Z(!1)})`,
  );
}
/**
 * 指向系统或用户关键目录的环境变量集合（HOME、XDG_*、APPDATA、SYSTEMROOT、PROGRAMFILES、PWD 等），用于危险删除判断。
 */
//@ chunk-e6aww6q8.js:1068959-1069313 placement
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
  ]),
  TENGU_BRIGHT_LAKE = "tengu_bright_lake";
//@ chunk-e6aww6q8.js:1069313-1069389 placement
function Z7() {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_BRIGHT_LAKE, !0);
  return e !== !1 || source !== "payload";
}
//@ chunk-e6aww6q8.js:1069389-1069453 placement
function DH(e) {
  logEventUnlessSuppressed("tengu_bash_dangerous_rm_shape", { shape: fromEnum(e) });
}
//@ chunk-e6aww6q8.js:1069453-1069469 placement
var c2t = new AsyncLocalStorage_2();
//@ chunk-e6aww6q8.js:1069469-1069506 placement
function R0e(e) {
  return c2t.run(!0, e);
}
/**
 * 不在静默作用域内时才记遥测事件（Bash 危险命令形状等）。
 */
//@ chunk-e6aww6q8.js:1069506-1069559 placement = getAgentContext (1)
function logEventUnlessSuppressed(...e) {
  if (c2t.getStore() === void 0) logEvent(...e);
}
/**
 * 危险删除原因文案片段与分类用正则（变量为空时删除 /、驱动器根、挂载盘路径），以及挂载卷路径正则。
 */
//@ chunk-e6aww6q8.js:1069559-1070063 placement
var EMPTY_EXPANSION_HINT = "use a literal path: when the expansion is empty this removes /",
  DRIVE_ROOT_PREFIX = "on drive root: ",
  MOUNTED_DRIVE_PREFIX = "on mounted drive path: ",
  PLACEHOLDER_ROOT_CHILD_RE = new RegExp(
    String.raw`^Dangerous rm(?:dir)? operation on possibly-empty variable path: \$\{\u2026\}\S* \(${EMPTY_EXPANSION_HINT}[A-Za-z0-9+]+\)$`,
  ),
  BACKSLASH_ONLY_RE = new RegExp(String.raw`^Dangerous rm(?:dir)? operation ${DRIVE_ROOT_PREFIX}\\+$`),
  MOUNTED_DRIVE_REASON_RE = new RegExp(`^Dangerous rm(?:dir)? operation ${MOUNTED_DRIVE_PREFIX}/`),
  MOUNTED_VOLUME_PATH_RE =
    /^\/(?:system\/)?volumes(?:\/[^/]+){0,2}$|^\/mnt\/(?:[^/]+|[a-z]\/[^/]+)$|^\/(?:run\/)?media(?:\/[^/]+){0,3}$/i;
/**
 * 分类危险删除目标的特殊形态：占位根子目录、仅反斜杠、挂载盘路径。
 */
//@ chunk-e6aww6q8.js:1070063-1070212 placement
function classifyRemovalReason(e) {
  if (PLACEHOLDER_ROOT_CHILD_RE.test(e)) return "placeholder_root_child";
  if (BACKSLASH_ONLY_RE.test(e)) return "backslash_only";
  if (MOUNTED_DRIVE_REASON_RE.test(e)) return "mounted_drive_path";
  return;
}

export {
  Z7,
  DH,
  logEventUnlessSuppressed,
  checkDangerousRemoval,
  classifyRemovalReason,
  dangerousRemovalAsk,
  R0e,
  EMPTY_EXPANSION_HINT,
  DRIVE_ROOT_PREFIX,
  MOUNTED_VOLUME_PATH_RE,
  MOUNTED_DRIVE_PREFIX,
};
