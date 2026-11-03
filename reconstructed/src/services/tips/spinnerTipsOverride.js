/**
 * services/tips/spinnerTipsOverride.ts
 *
 * 2.1.316 新增：Spinner 提示覆盖
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-70qr4vka.js (14)
 * attribution: placement 14
 */
import { constants } from "fs";
import { open, realpath } from "fs/promises";
import { isAbsolute } from "path";
import { REPO_DIR_SETTING_SOURCES, isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { sanitizeAnsiText } from "../../utils/stripAnsi.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { union, array, unknown, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { getPlatform } from "../../utils/platform.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { stripBom } from "../../utils/json.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { skillsSettingsSchema } from "../../utils/settings/types.js";
import { getErrnoCode, isENOENT, toError } from "../../utils/errors.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRemoteManagedSettingsSyncFromCache } from "../remoteManagedSettings/remoteSettingsCache.js";
import { isUncOrDeviceSpelling } from "../../utils/fsJunctions.js";
import { expandPath } from "../../utils/path.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";

//@ chunk-70qr4vka.js:863-1173 placement
/**
 * Spinner 提示覆盖的常量：提示前缀、长度/条数/文件大小上限、可信设置来源、可重试 errno 与不可见字符集。
 */
var ORG_TIP = "org-tip:";
var CUSTOM_TIP = "custom-tip-";
var MAX_TIP_CHARS = 500;
var MAX_CUSTOM_TIPS = 200;
var MAX_TIPS_FILE_BYTES = 262144;
var TIP_ID_REGEX = "Tip";
var MAX_TIP_LABEL_CHARS = /^[A-Za-z0-9._-]{1,64}$/;
var TRUSTED_OVERRIDE_SOURCES = 40;
var REPO_OVERRIDE_SOURCES = ["policySettings", "flagSettings", "userSettings"];
var RETRYABLE_TIPS_FILE_ERRNOS = [...REPO_DIR_SETTING_SOURCES];
var ORG_TIP_FILE = "org-tip:file:";
var INVISIBLE_CHARS_REGEX = new Set(["EAGAIN", "EBUSY", "EINTR", "EIO", "EMFILE", "ENFILE"]);
var TIP_MAX_NOTE_CHARS = /[\p{Cc}\p{Cf}\u2028\u2029\u180e\ufe00-\ufe0f\u{e0100}-\u{e01ef}]/gu;
//@ chunk-70qr4vka.js:1173-1282 placement
function sanitizeTipText(e) {
  return sanitizeAnsiText(e)
    .replace(/[\t\n\r\u2028\u2029]+/g, " ")
    .replace(TIP_MAX_NOTE_CHARS, "")
    .replace(/ {2,}/g, " ")
    .trim();
}
//@ chunk-70qr4vka.js:1282-1354 placement
/**
 * 规范化提示标签：清掉不可见字符、截断到上限，空则回退为 Tip。
 */
function tipLabel(override) {
  if (override === undefined) return TIP_ID_REGEX;
  let i = truncateToLength(sanitizeTipText(override), TRUSTED_OVERRIDE_SOURCES);
  return i === "" ? TIP_ID_REGEX : i;
}
//@ chunk-70qr4vka.js:1354-1422 placement
/**
 * 提示文件内容 schema：纯数组，或对象里的 tips 数组。
 */
var tipsFileSchema = DoctorLazy(() =>
  union([
    array(unknown()),
    u({
      tips: array(unknown()),
    }).transform((e) => e.tips),
  ]),
);
//@ chunk-70qr4vka.js:1422-2844 placement
/**
 * 读取组织提示文件（spinnerTipsOverride.tipsFile）：不跟随链接打开，要求普通文件且不超过大小上限，解析为提示数组（或 {tips:[…]}）；各种失败打点并返回空列表，可重试的错误标记 transient。
 */
async function readTipsFile(path) {
  try {
    let i = getPlatform() === "windows" ? 0 : constants.O_NOFOLLOW | constants.O_NONBLOCK;
    let handle = await open(await realpath(path), constants.O_RDONLY | i);
    let n;
    try {
      let stats = await handle.stat();
      if (!stats.isFile()) {
        logFeatureBad("tips_org_tips_file_load", "not_regular_file");
        logForDebugging(`spinnerTipsOverride.tipsFile ${path} is not a regular file; ignoring it`, {
          level: "warn",
        });
        return {
          entries: [],
          transient: false,
        };
      }
      if (stats.size > MAX_TIPS_FILE_BYTES) {
        logFeatureBad("tips_org_tips_file_load", "too_large");
        logForDebugging(
          `spinnerTipsOverride.tipsFile ${path} is larger than ${MAX_TIPS_FILE_BYTES} bytes; ignoring it`,
          {
            level: "warn",
          },
        );
        return {
          entries: [],
          transient: false,
        };
      }
      let buffer = Buffer.alloc(MAX_TIPS_FILE_BYTES + 1);
      let { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead > MAX_TIPS_FILE_BYTES) {
        logFeatureBad("tips_org_tips_file_load", "too_large");
        return {
          entries: [],
          transient: false,
        };
      }
      n = stripBom(buffer.toString("utf8", 0, bytesRead));
    } finally {
      await handle.close();
    }
    let l = tipsFileSchema().safeParse(jsonParse(n));
    let d = l.success ? skillsSettingsSchema().parse(l.data) : undefined;
    if (d === undefined) {
      logFeatureBad("tips_org_tips_file_load", "wrong_shape");
      logForDebugging(
        `spinnerTipsOverride.tipsFile ${path} must be a JSON array of tips (or {"tips": [...]}); ignoring it`,
        {
          level: "warn",
        },
      );
      return {
        entries: [],
        transient: false,
      };
    }
    logFeatureOk("tips_org_tips_file_load");
    return {
      entries: d,
      transient: false,
    };
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    let n = isENOENT(error)
      ? "not_found"
      : errnoCode === "ELOOP" || errnoCode === "EISDIR"
        ? "not_regular_file"
        : error instanceof SyntaxError
          ? "parse_failed"
          : "read_failed";
    logFeatureBad("tips_org_tips_file_load", n);
    logForDebugging(
      isENOENT(error)
        ? `spinnerTipsOverride.tipsFile ${path} does not exist; no file tips loaded`
        : `spinnerTipsOverride.tipsFile ${path} could not be read: ${toError(error).message}`,
      {
        level: "warn",
      },
    );
    return {
      entries: [],
      transient: errnoCode !== undefined && INVISIBLE_CHARS_REGEX.has(errnoCode),
    };
  }
}
//@ chunk-70qr4vka.js:2844-3030 placement
class TipsFileCache {
  #e = new Map();
  get size() {
    return this.#e.size;
  }
  read(path) {
    let i = this.#e.get(path);
    if (i) return i;
    let r = readTipsFile(path).then((tipsFile) => {
      if (tipsFile.transient) this.#e.delete(path);
      return tipsFile;
    });
    this.#e.set(path, r);
    return r;
  }
}
//@ chunk-70qr4vka.js:3030-3054 placement
var tipsFileCacheSlots = new HostScoped(() => new TipsFileCache());
//@ chunk-70qr4vka.js:3054-3284 placement
function isRemoteTipsFileIgnored() {
  if (getRemoteManagedSettingsSyncFromCache()?.spinnerTipsOverride?.tipsFile) {
    logForDebugging(
      "spinnerTipsOverride.tipsFile from remote managed settings is ignored; ship inline tips or install the file path via managed-settings.json",
      {
        level: "warn",
      },
    );
    return true;
  }
  return false;
}
//@ chunk-70qr4vka.js:3284-3740 placement
/**
 * 校验提示文件路径：必须是绝对路径或 ~/ 路径，不能是网络（UNC）路径；展开后返回，无效时写警告并返回 undefined。
 */
function resolveTipsFilePath(e) {
  if (!e) return;
  if (!isAbsolute(e) && e !== "~" && !e.startsWith("~/")) {
    logForDebugging(`spinnerTipsOverride.tipsFile must be an absolute or ~/ path (got "${e}"); ignoring it`, {
      level: "warn",
    });
    return;
  }
  if (isUncOrDeviceSpelling(e)) {
    logForDebugging(
      "spinnerTipsOverride.tipsFile must be a local path, not a network (UNC) path; ignoring it",
      {
        level: "warn",
      },
    );
    return;
  }
  try {
    let i = expandPath(e);
    return isUncOrDeviceSpelling(i) ? undefined : i;
  } catch (error) {
    logForDebugging(`spinnerTipsOverride.tipsFile "${e}" is not a usable path: ${toError(error).message}`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-70qr4vka.js:3740-3875 placement
function collectTipOverrides(e) {
  let i = [];
  for (let r of e) {
    if (!isSettingSourceEnabled(r)) continue;
    let spinnerTipsOverride = getSettingsForSource(r)?.spinnerTipsOverride;
    if (spinnerTipsOverride)
      i.push({
        source: r,
        override: spinnerTipsOverride,
      });
  }
  return i;
}
//@ chunk-70qr4vka.js:3875-3947 placement
/**
 * 在若干设置层里查找某个覆盖键的值。
 */
function findOverride(e, i) {
  return e.find((r) => r.override[i] !== undefined)?.override[i];
}
//@ chunk-70qr4vka.js:3947-4099 placement
/**
 * 判断受信设置是否要求排除默认提示，且确实提供了自定义提示（文件或内联）。
 */
function excludesDefaultTips() {
  let tipOverrides = collectTipOverrides(REPO_OVERRIDE_SOURCES);
  if (findOverride(tipOverrides, "excludeDefault") !== true) return false;
  return (
    tipOverrides.some((tipOverride) => !!tipOverride.override.tipsFile) ||
    tipOverrides.some((tipOverride) => (tipOverride.override.tips?.length ?? 0) > 0)
  );
}
//@ chunk-70qr4vka.js:4099-5493 placement
/**
 * 汇总自定义 spinner 提示：受信来源（用户/托管）的内联提示与提示文件，项目设置里只接受纯字符串提示；清洗、长度与重复检查后生成提示对象（带冷却与优先级），返回提示列表与受信提示数量。
 */
async function loadCustomTips(session) {
  let trustedOverrides = collectTipOverrides(REPO_OVERRIDE_SOURCES);
  let projectOverrides = collectTipOverrides(RETRYABLE_TIPS_FILE_ERRNOS);
  if (trustedOverrides.length === 0 && projectOverrides.length === 0)
    return {
      tips: [],
      trustedCount: 0,
    };
  let label = tipLabel(findOverride(trustedOverrides, "label"));
  let found = trustedOverrides.find((trustedOverride) => !!trustedOverride.override.tipsFile);
  let source = found?.source;
  let tipsFilePath = resolveTipsFilePath(
    source === "policySettings" && isRemoteTipsFileIgnored() ? undefined : found?.override.tipsFile,
  );
  for (let { source, override } of projectOverrides)
    if (override.tipsFile || override.label !== undefined)
      logForDebugging(
        `spinnerTipsOverride.tipsFile/label in ${source} are ignored; set them in user or managed settings`,
        {
          level: "warn",
        },
      );
  let entries = tipsFilePath ? (await tipsFileCacheSlots.of(session).read(tipsFilePath)).entries : [];
  let _ = new Set();
  let tips = [];
  let addTip = (s, o, cooldownSessions, priority, label) => {
    if (tips.length >= MAX_CUSTOM_TIPS) return;
    let h = sanitizeTipText(o);
    if (h === "") {
      logForDebugging(`spinnerTipsOverride: tip "${s}" is empty after sanitizing; dropped`, {
        level: "warn",
      });
      return;
    }
    if (h.length > MAX_TIP_CHARS) {
      logForDebugging(`spinnerTipsOverride: tip "${s}" is longer than ${MAX_TIP_CHARS} characters; dropped`, {
        level: "warn",
      });
      return;
    }
    if (_.has(s)) {
      logForDebugging(`spinnerTipsOverride: duplicate tip id "${s}"; keeping the first`, {
        level: "warn",
      });
      return;
    }
    _.add(s);
    tips.push({
      id: s,
      label,
      content: async () => h,
      cooldownSessions,
      priority,
      isRelevant: async () => true,
      providerAgnostic: true,
    });
  };
  let R = 0;
  for (let { source: source_2, override } of trustedOverrides) {
    for (let a of override.tips ?? []) addTipEntry(a, `${CUSTOM_TIP}${R++}`, label, addTip);
    if (source_2 === source)
      entries.forEach((entry, T) => addTipEntry(entry, `${ORG_TIP_FILE}${T}`, label, addTip));
  }
  let trustedCount = tips.length;
  for (let { source, override } of projectOverrides)
    for (let a of override.tips ?? []) {
      let T = `${CUSTOM_TIP}${R++}`;
      if (typeof a === "string") addTipEntry(a, T, TIP_ID_REGEX, addTip);
      else
        logForDebugging(
          `spinnerTipsOverride: object tip entries in ${source} are ignored; only plain strings are read from project settings`,
          {
            level: "warn",
          },
        );
    }
  return {
    tips,
    trustedCount,
  };
}
//@ chunk-70qr4vka.js:5493-6127 placement
/**
 * 解析一条提示配置：字符串直接加入；对象需有 text 与合法 id，冷却次数与优先级取整并限制范围后加入。
 */
function addTipEntry(e, i, label, addTip) {
  if (typeof e === "string") {
    addTip(i, e, 0, 0, label);
    return;
  }
  if (typeof e.text !== "string") {
    logForDebugging('spinnerTipsOverride: tip object without a "text" string; dropped', {
      level: "warn",
    });
    return;
  }
  if (typeof e.id !== "string" || !MAX_TIP_LABEL_CHARS.test(e.id)) {
    logForDebugging(
      'spinnerTipsOverride: tip object needs an "id" of 1-64 letters, digits, ".", "_" or "-"; dropped',
      {
        level: "warn",
      },
    );
    return;
  }
  let l =
    typeof e.cooldownSessions === "number" && Number.isInteger(e.cooldownSessions) && e.cooldownSessions >= 0
      ? Math.min(e.cooldownSessions, 1000)
      : 0;
  let d =
    typeof e.priority === "number" && Number.isFinite(e.priority)
      ? Math.max(-10, Math.min(10, Math.trunc(e.priority)))
      : 0;
  addTip(`${ORG_TIP}${e.id}`, e.text, l, d, label);
}
export { loadCustomTips, excludesDefaultTips, ORG_TIP, CUSTOM_TIP };
