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
import { Pje } from "../../utils/stripAnsi.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { Ue, A, oe, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { getPlatform } from "../../utils/platform.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { Wo } from "../../utils/json.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { Ops } from "../../utils/settings/types.js";
import { getErrnoCode, isENOENT, toError } from "../../utils/errors.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRemoteManagedSettingsSyncFromCache } from "../remoteManagedSettings/remoteSettingsCache.js";
import { CL } from "../../utils/fsJunctions.js";
import { expandPath } from "../../utils/path.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";

//@ chunk-70qr4vka.js:863-1173 placement
var ORG_TIP = "org-tip:",
  CUSTOM_TIP = "custom-tip-",
  b = 500,
  B = 200,
  S = 262144,
  TIP = "Tip",
  H = /^[A-Za-z0-9._-]{1,64}$/,
  X = 40,
  x = ["policySettings", "flagSettings", "userSettings"],
  K = [...REPO_DIR_SETTING_SOURCES],
  ORG_TIP_FILE = "org-tip:file:",
  J = new Set(["EAGAIN", "EBUSY", "EINTR", "EIO", "EMFILE", "ENFILE"]),
  Z = /[\p{Cc}\p{Cf}\u2028\u2029\u180e\ufe00-\ufe0f\u{e0100}-\u{e01ef}]/gu;
//@ chunk-70qr4vka.js:1173-1282 placement
function sanitizeTipText(e) {
  return Pje(e)
    .replace(/[\t\n\r\u2028\u2029]+/g, " ")
    .replace(Z, "")
    .replace(/ {2,}/g, " ")
    .trim();
}
//@ chunk-70qr4vka.js:1282-1354 placement
function q(e) {
  if (e === void 0) return TIP;
  let i = truncateToLength(sanitizeTipText(e), X);
  return i === "" ? TIP : i;
}
//@ chunk-70qr4vka.js:1354-1422 placement
var Q = DoctorLazy(() => Ue([A(oe()), u({ tips: A(oe()) }).transform((e) => e.tips)]));
/**
 * 读取组织提示文件（spinnerTipsOverride.tipsFile）：不跟随链接打开，要求普通文件且不超过大小上限，解析为提示数组（或 {tips:[…]}）；各种失败打点并返回空列表，可重试的错误标记 transient。
 */
//@ chunk-70qr4vka.js:1422-2844 placement
async function readTipsFile(path) {
  try {
    let i = getPlatform() === "windows" ? 0 : constants.O_NOFOLLOW | constants.O_NONBLOCK,
      handle = await open(await realpath(path), constants.O_RDONLY | i),
      n;
    try {
      let stats = await handle.stat();
      if (!stats.isFile())
        return (
          logFeatureBad("tips_org_tips_file_load", "not_regular_file"),
          logForDebugging(`spinnerTipsOverride.tipsFile ${path} is not a regular file; ignoring it`, {
            level: "warn",
          }),
          { entries: [], transient: !1 }
        );
      if (stats.size > S)
        return (
          logFeatureBad("tips_org_tips_file_load", "too_large"),
          logForDebugging(`spinnerTipsOverride.tipsFile ${path} is larger than ${S} bytes; ignoring it`, {
            level: "warn",
          }),
          { entries: [], transient: !1 }
        );
      let buffer = Buffer.alloc(S + 1),
        { bytesRead: bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead > S)
        return (logFeatureBad("tips_org_tips_file_load", "too_large"), { entries: [], transient: !1 });
      n = Wo(buffer.toString("utf8", 0, bytesRead));
    } finally {
      await handle.close();
    }
    let safeParse = Q().safeParse(jsonParse(n)),
      d = safeParse.success ? Ops().parse(safeParse.data) : void 0;
    if (d === void 0)
      return (
        logFeatureBad("tips_org_tips_file_load", "wrong_shape"),
        logForDebugging(
          `spinnerTipsOverride.tipsFile ${path} must be a JSON array of tips (or {"tips": [...]}); ignoring it`,
          { level: "warn" },
        ),
        { entries: [], transient: !1 }
      );
    return (logFeatureOk("tips_org_tips_file_load"), { entries: d, transient: !1 });
  } catch (error) {
    let r = getErrnoCode(error),
      n = isENOENT(error)
        ? "not_found"
        : r === "ELOOP" || r === "EISDIR"
          ? "not_regular_file"
          : error instanceof SyntaxError
            ? "parse_failed"
            : "read_failed";
    return (
      logFeatureBad("tips_org_tips_file_load", n),
      logForDebugging(
        isENOENT(error)
          ? `spinnerTipsOverride.tipsFile ${path} does not exist; no file tips loaded`
          : `spinnerTipsOverride.tipsFile ${path} could not be read: ${toError(error).message}`,
        { level: "warn" },
      ),
      { entries: [], transient: r !== void 0 && J.has(r) }
    );
  }
}
//@ chunk-70qr4vka.js:2844-3030 placement
class TipsFileCache {
  #e = new Map();
  get size() {
    return this.#e.size;
  }
  read(e) {
    let i = this.#e.get(e);
    if (i) return i;
    let r = readTipsFile(e).then((n) => {
      if (n.transient) this.#e.delete(e);
      return n;
    });
    return (this.#e.set(e, r), r);
  }
}
//@ chunk-70qr4vka.js:3030-3054 placement
var ee = new HostScoped(() => new TipsFileCache());
//@ chunk-70qr4vka.js:3054-3284 placement
function isRemoteTipsFileIgnored() {
  if (getRemoteManagedSettingsSyncFromCache()?.spinnerTipsOverride?.tipsFile)
    return (
      logForDebugging(
        "spinnerTipsOverride.tipsFile from remote managed settings is ignored; ship inline tips or install the file path via managed-settings.json",
        { level: "warn" },
      ),
      !0
    );
  return !1;
}
/**
 * 校验提示文件路径：必须是绝对路径或 ~/ 路径，不能是网络（UNC）路径；展开后返回，无效时写警告并返回 undefined。
 */
//@ chunk-70qr4vka.js:3284-3740 placement
function resolveTipsFilePath(e) {
  if (!e) return;
  if (!isAbsolute(e) && e !== "~" && !e.startsWith("~/")) {
    logForDebugging(`spinnerTipsOverride.tipsFile must be an absolute or ~/ path (got "${e}"); ignoring it`, {
      level: "warn",
    });
    return;
  }
  if (CL(e)) {
    logForDebugging(
      "spinnerTipsOverride.tipsFile must be a local path, not a network (UNC) path; ignoring it",
      { level: "warn" },
    );
    return;
  }
  try {
    let i = expandPath(e);
    return CL(i) ? void 0 : i;
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
    let n = getSettingsForSource(r)?.spinnerTipsOverride;
    if (n) i.push({ source: r, override: n });
  }
  return i;
}
//@ chunk-70qr4vka.js:3875-3947 placement
function C(e, i) {
  return e.find((r) => r.override[i] !== void 0)?.override[i];
}
/**
 * 判断受信设置是否要求排除默认提示，且确实提供了自定义提示（文件或内联）。
 */
//@ chunk-70qr4vka.js:3947-4099 placement
function excludesDefaultTips() {
  let e = collectTipOverrides(x);
  if (C(e, "excludeDefault") !== !0) return !1;
  return e.some((i) => !!i.override.tipsFile) || e.some((i) => (i.override.tips?.length ?? 0) > 0);
}
/**
 * 汇总自定义 spinner 提示：受信来源（用户/托管）的内联提示与提示文件，项目设置里只接受纯字符串提示；清洗、长度与重复检查后生成提示对象（带冷却与优先级），返回提示列表与受信提示数量。
 */
//@ chunk-70qr4vka.js:4099-5493 placement
async function loadCustomTips(session) {
  let trustedOverrides = collectTipOverrides(x),
    projectOverrides = collectTipOverrides(K);
  if (trustedOverrides.length === 0 && projectOverrides.length === 0) return { tips: [], trustedCount: 0 };
  let label = q(C(trustedOverrides, "label")),
    found = trustedOverrides.find((s) => !!s.override.tipsFile),
    d = found?.source,
    f = resolveTipsFilePath(
      d === "policySettings" && isRemoteTipsFileIgnored() ? void 0 : found?.override.tipsFile,
    );
  for (let { source: source, override: override } of projectOverrides)
    if (override.tipsFile || override.label !== void 0)
      logForDebugging(
        `spinnerTipsOverride.tipsFile/label in ${source} are ignored; set them in user or managed settings`,
        { level: "warn" },
      );
  let c = f ? (await ee.of(session).read(f)).entries : [],
    _ = new Set(),
    tips = [],
    addTip = (s, o, a, T, M) => {
      if (tips.length >= B) return;
      let h = sanitizeTipText(o);
      if (h === "") {
        logForDebugging(`spinnerTipsOverride: tip "${s}" is empty after sanitizing; dropped`, {
          level: "warn",
        });
        return;
      }
      if (h.length > b) {
        logForDebugging(`spinnerTipsOverride: tip "${s}" is longer than ${b} characters; dropped`, {
          level: "warn",
        });
        return;
      }
      if (_.has(s)) {
        logForDebugging(`spinnerTipsOverride: duplicate tip id "${s}"; keeping the first`, { level: "warn" });
        return;
      }
      (_.add(s),
        tips.push({
          id: s,
          label: M,
          content: async () => h,
          cooldownSessions: a,
          priority: T,
          isRelevant: async () => !0,
          providerAgnostic: !0,
        }));
    },
    R = 0;
  for (let { source: source, override: override } of trustedOverrides) {
    for (let a of override.tips ?? []) addTipEntry(a, `${CUSTOM_TIP}${R++}`, label, addTip);
    if (source === d) c.forEach((a, T) => addTipEntry(a, `${ORG_TIP_FILE}${T}`, label, addTip));
  }
  let trustedCount = tips.length;
  for (let { source: source, override: override } of projectOverrides)
    for (let a of override.tips ?? []) {
      let T = `${CUSTOM_TIP}${R++}`;
      if (typeof a === "string") addTipEntry(a, T, TIP, addTip);
      else
        logForDebugging(
          `spinnerTipsOverride: object tip entries in ${source} are ignored; only plain strings are read from project settings`,
          { level: "warn" },
        );
    }
  return { tips: tips, trustedCount: trustedCount };
}
/**
 * 解析一条提示配置：字符串直接加入；对象需有 text 与合法 id，冷却次数与优先级取整并限制范围后加入。
 */
//@ chunk-70qr4vka.js:5493-6127 placement
function addTipEntry(e, i, r, n) {
  if (typeof e === "string") {
    n(i, e, 0, 0, r);
    return;
  }
  if (typeof e.text !== "string") {
    logForDebugging('spinnerTipsOverride: tip object without a "text" string; dropped', { level: "warn" });
    return;
  }
  if (typeof e.id !== "string" || !H.test(e.id)) {
    logForDebugging(
      'spinnerTipsOverride: tip object needs an "id" of 1-64 letters, digits, ".", "_" or "-"; dropped',
      { level: "warn" },
    );
    return;
  }
  let l =
      typeof e.cooldownSessions === "number" &&
      Number.isInteger(e.cooldownSessions) &&
      e.cooldownSessions >= 0
        ? Math.min(e.cooldownSessions, 1000)
        : 0,
    d =
      typeof e.priority === "number" && Number.isFinite(e.priority)
        ? Math.max(-10, Math.min(10, Math.trunc(e.priority)))
        : 0;
  n(`${ORG_TIP}${e.id}`, e.text, l, d, r);
}

export { loadCustomTips, excludesDefaultTips, ORG_TIP, CUSTOM_TIP };
