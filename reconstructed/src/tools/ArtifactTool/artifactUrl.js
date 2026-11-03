/**
 * tools/ArtifactTool/artifactUrl.ts
 *
 * 2.1.316 新增：Artifact 工具的 URL 处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (6)
 * attribution: placement 6
 */
import {
  VIEWER_PREFIX_RE,
  canonicalizeArtifactUrlInput,
  artifactUrlSubPath,
  parseArtifactUrl,
  parseArtifactUrlAnyCase,
  ARTIFACT_STUB_URL_PREFIX,
  ARTIFACT_SLUG_RE,
} from "./constants.js";
import { decodeBase58Uuid } from "../../utils/messages.js";
import { artifactActionLabel } from "./askTelemetry.js";
import { parseArtifactUrl as parseArtifactUrl_2 } from "../../services/artifacts/artifactUrl.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-8wvtd8sr.js:321931-322020 placement
/**
 * 匹配 artifact 查看器路径的正则。
 */
var regExp = new RegExp(`^${VIEWER_PREFIX_RE}`);
var ARTIFACTS_PATH_REGEX = /^\/(?:public\/)?artifacts\//;
var LOOPBACK_IPV4_REGEX = /^127(?:\.\d{1,3}){3}$/;
//@ chunk-8wvtd8sr.js:322020-322972 placement
/**
 * 为遥测分类一个 url 参数的形状：空、子路径、合法、非规范、大小写错、桩协议、裸 id、缺协议、非 https、claude.site/claude.ai 聊天链接、查看器路径 id 错、用户内容域、回环主机、其他主机等。
 */
function classifyArtifactUrlShape(e) {
  if (e.trim() === "") return "empty";
  let n = canonicalizeArtifactUrlInput(e);
  if (artifactUrlSubPath(e) !== undefined || artifactUrlSubPath(n) !== undefined) return "subpath";
  if (parseArtifactUrl(e) !== null) return "valid";
  if (parseArtifactUrl(n) !== null) return "noncanonical";
  if (parseArtifactUrlAnyCase(e) !== null) return "wrong_case";
  if (e.startsWith(ARTIFACT_STUB_URL_PREFIX)) return "stub_scheme";
  let s;
  try {
    s = new URL(n);
  } catch {
    if (ARTIFACT_SLUG_RE.test(e.toLowerCase()) || decodeBase58Uuid(e) !== null) return "bare_id";
    if (parseArtifactUrlAnyCase(`https://${e}`) !== null) return "missing_scheme";
    return "not_a_url";
  }
  if (s.protocol !== "https:") return /^[a-z]:$/.test(s.protocol) ? "not_a_url" : "other_scheme";
  let hostname = s.hostname;
  if (hostname === "claude.site" || hostname.endsWith(".claude.site")) return "chat_artifact_link";
  if (hostname === "claude.ai" || hostname.endsWith(".claude.ai")) {
    if (regExp.test(s.pathname)) return "viewer_path_bad_id";
    return ARTIFACTS_PATH_REGEX.test(s.pathname) ? "chat_artifact_link" : "claude_ai_other_path";
  }
  if (hostname === "claudeusercontent.com" || hostname.endsWith(".claudeusercontent.com"))
    return "usercontent_host";
  if (
    hostname === "localhost" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0" ||
    LOOPBACK_IPV4_REGEX.test(hostname)
  )
    return "loopback_host";
  return "other_host";
}
//@ chunk-8wvtd8sr.js:322972-323009 placement
/**
 * Artifact 输入里属于 URL 的字段名。
 */
var URL_FIELD_NAMES = ["url", "type_url", "from_url"];
//@ chunk-8wvtd8sr.js:323009-323066 placement
/**
 * 非 null 对象原样返回，否则空对象。
 */
function objectOrEmpty(e) {
  return typeof e === "object" && e !== null ? e : {};
}
//@ chunk-8wvtd8sr.js:323066-323446 placement
/**
 * 分类 Artifact 工具输入中的 url 类字段：找出第一个格式无效的字段及其形状；url 与 from_url 指向同一 Artifact 时报 same_artifact；否则为 unexplained。
 */
function classifyArtifactUrlInput(e) {
  let n = objectOrEmpty(e);
  let action = artifactActionLabel(n);
  let r = "none";
  for (let h of URL_FIELD_NAMES) {
    let y = n[h];
    if (typeof y !== "string") continue;
    if (r === "none") r = h;
    let p = classifyArtifactUrlShape(y);
    if (p !== "valid")
      return {
        field: h,
        shape: p,
        action,
      };
  }
  if (
    typeof n.url === "string" &&
    typeof n.from_url === "string" &&
    parseArtifactUrl(n.url)?.slug === parseArtifactUrl(n.from_url)?.slug
  )
    return {
      field: "from_url",
      shape: "same_artifact",
      action,
    };
  return {
    field: r,
    shape: "unexplained",
    action,
  };
}
//@ chunk-8wvtd8sr.js:323446-323933 placement
/**
 * 输入校验因 url 不合法（errorCode 4）失败时，记录 artifact_url_input 埋点：出错字段、形状、动作、是否无人值守与路径族。
 */
function logArtifactUrlInputError(e, n, s) {
  if (n.errorCode !== 4) return;
  let r;
  let h = null;
  try {
    r = classifyArtifactUrlInput(e);
    let y = r.field === "none" ? undefined : objectOrEmpty(e)[r.field];
    h = typeof y === "string" ? parseArtifactUrl_2(y) : null;
  } catch (error) {
    logForDebugging(
      `artifact url telemetry: classifier threw: ${error instanceof Error ? error.message : typeof error}`,
      {
        level: "error",
      },
    );
    r = {
      field: "none",
      shape: "classifier_error",
      action: artifactActionLabel(e),
    };
  }
  logFeatureSad("artifact_url_input", r.shape, {
    field: fromEnum(r.field),
    action: fromEnum(r.action),
    unattended: s.unattended,
    path_family: fromEnum(h?.family ?? "none"),
    names_artifact: h !== null && h.artifact !== null,
  });
}
export { logArtifactUrlInputError };
