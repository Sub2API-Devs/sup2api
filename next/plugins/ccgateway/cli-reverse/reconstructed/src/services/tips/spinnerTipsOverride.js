/**
 * services/tips/spinnerTipsOverride.ts
 *
 * 2.1.316 新增：Spinner 提示覆盖
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rphmmbbk.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { constants } from "fs";
import { open, realpath } from "fs/promises";
import { isAbsolute } from "path";
import { REPO_DIR_SETTING_SOURCES, isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { sanitizeAnsiText } from "../../utils/stripAnsi.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { union, array, unknown, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rphmmbbk.js:862-1172 placement
/**
 * Spinner 提示覆盖的常量：提示前缀、长度/条数/文件大小上限、可信设置来源、可重试 errno 与不可见字符集。
 */
var ORG_TIP; // deferred: uses EDITABLE_SETTING_SOURCES (../../utils/settings/constants.js) of its import cycle while loading; runs once the cycle is complete
var CUSTOM_TIP;
var MAX_TIP_CHARS;
var MAX_CUSTOM_TIPS;
var MAX_TIPS_FILE_BYTES;
var TIP_ID_REGEX;
var TIP_ID_RE;
var MAX_LABEL_CHARS;
var REPO_OVERRIDE_SOURCES;
var RETRYABLE_TIPS_FILE_ERRNOS;
var DEFAULT_TIP_LABEL;
var RETRYABLE_ERRNOS;
var NOTE_INVISIBLE_CHARS_RE;
deferInit("chunk-rphmmbbk.js:862", () => {
  ORG_TIP = "org-tip:";
  CUSTOM_TIP = "custom-tip-";
  MAX_TIP_CHARS = 500;
  MAX_CUSTOM_TIPS = 200;
  MAX_TIPS_FILE_BYTES = 262144;
  TIP_ID_REGEX = "Tip";
  TIP_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
  MAX_LABEL_CHARS = 40;
  REPO_OVERRIDE_SOURCES = ["policySettings", "flagSettings", "userSettings"];
  RETRYABLE_TIPS_FILE_ERRNOS = [...REPO_DIR_SETTING_SOURCES];
  DEFAULT_TIP_LABEL = "org-tip:file:";
  RETRYABLE_ERRNOS = new Set(["EAGAIN", "EBUSY", "EINTR", "EIO", "EMFILE", "ENFILE"]);
  NOTE_INVISIBLE_CHARS_RE = /[\p{Cc}\p{Cf}\u2028\u2029\u180e\ufe00-\ufe0f\u{e0100}-\u{e01ef}]/gu;
});
//@ chunk-rphmmbbk.js:1172-1281 placement
function sanitizeTipText(text) {
  return sanitizeAnsiText(text)
    .replace(/[\t\n\r\u2028\u2029]+/g, " ")
    .replace(NOTE_INVISIBLE_CHARS_RE, "")
    .replace(/ {2,}/g, " ")
    .trim();
}
//@ chunk-rphmmbbk.js:1281-1352 placement
/**
 * 规范化提示标签：清掉不可见字符、截断到上限，空则回退为 Tip。
 */
function tipLabel(text) {
  if (text === undefined) return TIP_ID_REGEX;
  let label = truncateToLength(sanitizeTipText(text), MAX_LABEL_CHARS);
  return label === "" ? TIP_ID_REGEX : label;
}
//@ chunk-rphmmbbk.js:1352-1420 placement
/**
 * 提示文件内容 schema：纯数组，或对象里的 tips 数组。
 */
var tipsFileSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rphmmbbk.js:1352", () => {
  tipsFileSchema = DoctorLazy(() =>
    union([
      array(unknown()),
      objectSchema({
        tips: array(unknown()),
      }).transform((parsed) => parsed.tips),
    ]),
  );
});
//@ chunk-rphmmbbk.js:1420-2843 placement
/**
 * 读取组织提示文件（spinnerTipsOverride.tipsFile）：不跟随链接打开，要求普通文件且不超过大小上限，解析为提示数组（或 {tips:[…]}）；各种失败打点并返回空列表，可重试的错误标记 transient。
 */
async function readTipsFile(path) {
  try {
    let extraFlags = getPlatform() === "windows" ? 0 : constants.O_NOFOLLOW | constants.O_NONBLOCK;
    let handle = await open(await realpath(path), constants.O_RDONLY | extraFlags);
    let content;
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
      content = stripBom(buffer.toString("utf8", 0, bytesRead));
    } finally {
      await handle.close();
    }
    let parsed = tipsFileSchema().safeParse(jsonParse(content));
    let entries = parsed.success ? skillsSettingsSchema().parse(parsed.data) : undefined;
    if (entries === undefined) {
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
      entries,
      transient: false,
    };
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    let failureCode = isENOENT(error)
      ? "not_found"
      : errnoCode === "ELOOP" || errnoCode === "EISDIR"
        ? "not_regular_file"
        : error instanceof SyntaxError
          ? "parse_failed"
          : "read_failed";
    logFeatureBad("tips_org_tips_file_load", failureCode);
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
      transient: errnoCode !== undefined && RETRYABLE_ERRNOS.has(errnoCode),
    };
  }
}
//@ chunk-rphmmbbk.js:2843-3030 placement
class TipsFileCache {
  #e = new Map();
  get size() {
    return this.#e.size;
  }
  read(path) {
    let cached = this.#e.get(path);
    if (cached) return cached;
    let pending = readTipsFile(path).then((tipsFile) => {
      if (tipsFile.transient) this.#e.delete(path);
      return tipsFile;
    });
    this.#e.set(path, pending);
    return pending;
  }
}
//@ chunk-rphmmbbk.js:3030-3054 placement
var tipsFileCacheSlots; // deferred: uses TipsFileCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rphmmbbk.js:3030", () => {
  tipsFileCacheSlots = new HostScoped(() => new TipsFileCache());
});
//@ chunk-rphmmbbk.js:3054-3284 placement
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
//@ chunk-rphmmbbk.js:3284-3740 placement
/**
 * 校验提示文件路径：必须是绝对路径或 ~/ 路径，不能是网络（UNC）路径；展开后返回，无效时写警告并返回 undefined。
 */
function resolveTipsFilePath(rawPath) {
  if (!rawPath) return;
  if (!isAbsolute(rawPath) && rawPath !== "~" && !rawPath.startsWith("~/")) {
    logForDebugging(
      `spinnerTipsOverride.tipsFile must be an absolute or ~/ path (got "${rawPath}"); ignoring it`,
      {
        level: "warn",
      },
    );
    return;
  }
  if (isUncOrDeviceSpelling(rawPath)) {
    logForDebugging(
      "spinnerTipsOverride.tipsFile must be a local path, not a network (UNC) path; ignoring it",
      {
        level: "warn",
      },
    );
    return;
  }
  try {
    let expandedPath = expandPath(rawPath);
    return isUncOrDeviceSpelling(expandedPath) ? undefined : expandedPath;
  } catch (error) {
    logForDebugging(
      `spinnerTipsOverride.tipsFile "${rawPath}" is not a usable path: ${toError(error).message}`,
      {
        level: "warn",
      },
    );
    return;
  }
}
//@ chunk-rphmmbbk.js:3740-3875 placement
function collectTipOverrides(sources) {
  let overrides = [];
  for (let source of sources) {
    if (!isSettingSourceEnabled(source)) continue;
    let spinnerTipsOverride = getSettingsForSource(source)?.spinnerTipsOverride;
    if (spinnerTipsOverride)
      overrides.push({
        source,
        override: spinnerTipsOverride,
      });
  }
  return overrides;
}
//@ chunk-rphmmbbk.js:3875-3947 placement
/**
 * 在若干设置层里查找某个覆盖键的值。
 */
function findOverride(overrides, key) {
  return overrides.find((override) => override.override[key] !== undefined)?.override[key];
}
//@ chunk-rphmmbbk.js:3947-4099 placement
/**
 * 判断受信设置是否要求排除默认提示，且确实提供了自定义提示（文件或内联）。
 */
function excludesDefaultTips() {
  let overrides = collectTipOverrides(REPO_OVERRIDE_SOURCES);
  if (findOverride(overrides, "excludeDefault") !== true) return false;
  return (
    overrides.some((overrideEntry) => !!overrideEntry.override.tipsFile) ||
    overrides.some((overrideEntry) => (overrideEntry.override.tips?.length ?? 0) > 0)
  );
}
//@ chunk-rphmmbbk.js:4099-5493 placement
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
  let seenIds = new Set();
  let tips = [];
  let addTip = (id, text, cooldownSessions, priority, label) => {
    if (tips.length >= MAX_CUSTOM_TIPS) return;
    let cleanText = sanitizeTipText(text);
    if (cleanText === "") {
      logForDebugging(`spinnerTipsOverride: tip "${id}" is empty after sanitizing; dropped`, {
        level: "warn",
      });
      return;
    }
    if (cleanText.length > MAX_TIP_CHARS) {
      logForDebugging(
        `spinnerTipsOverride: tip "${id}" is longer than ${MAX_TIP_CHARS} characters; dropped`,
        {
          level: "warn",
        },
      );
      return;
    }
    if (seenIds.has(id)) {
      logForDebugging(`spinnerTipsOverride: duplicate tip id "${id}"; keeping the first`, {
        level: "warn",
      });
      return;
    }
    seenIds.add(id);
    tips.push({
      id,
      label,
      content: async () => cleanText,
      cooldownSessions,
      priority,
      isRelevant: async () => true,
      providerAgnostic: true,
    });
  };
  let tipCounter = 0;
  for (let { source: source_2, override } of trustedOverrides) {
    for (let tipEntry of override.tips ?? [])
      addTipEntry(tipEntry, `${CUSTOM_TIP}${tipCounter++}`, label, addTip);
    if (source_2 === source)
      entries.forEach((entry, index) => addTipEntry(entry, `${DEFAULT_TIP_LABEL}${index}`, label, addTip));
  }
  let trustedCount = tips.length;
  for (let { source, override } of projectOverrides)
    for (let tipEntry of override.tips ?? []) {
      let tipId = `${CUSTOM_TIP}${tipCounter++}`;
      if (typeof tipEntry === "string") addTipEntry(tipEntry, tipId, TIP_ID_REGEX, addTip);
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
//@ chunk-rphmmbbk.js:5493-6127 placement
/**
 * 解析一条提示配置：字符串直接加入；对象需有 text 与合法 id，冷却次数与优先级取整并限制范围后加入。
 */
function addTipEntry(entry, tipId, label, addTip) {
  if (typeof entry === "string") {
    addTip(tipId, entry, 0, 0, label);
    return;
  }
  if (typeof entry.text !== "string") {
    logForDebugging('spinnerTipsOverride: tip object without a "text" string; dropped', {
      level: "warn",
    });
    return;
  }
  if (typeof entry.id !== "string" || !TIP_ID_RE.test(entry.id)) {
    logForDebugging(
      'spinnerTipsOverride: tip object needs an "id" of 1-64 letters, digits, ".", "_" or "-"; dropped',
      {
        level: "warn",
      },
    );
    return;
  }
  let cooldownSessions =
    typeof entry.cooldownSessions === "number" &&
    Number.isInteger(entry.cooldownSessions) &&
    entry.cooldownSessions >= 0
      ? Math.min(entry.cooldownSessions, 1000)
      : 0;
  let priority =
    typeof entry.priority === "number" && Number.isFinite(entry.priority)
      ? Math.max(-10, Math.min(10, Math.trunc(entry.priority)))
      : 0;
  addTip(`${ORG_TIP}${entry.id}`, entry.text, cooldownSessions, priority, label);
}
export { ORG_TIP, CUSTOM_TIP, excludesDefaultTips, loadCustomTips };
