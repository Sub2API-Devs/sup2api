/**
 * tools/ArtifactTool/artifactUrl.ts
 *
 * 2.1.316 新增：Artifact 工具的 URL 处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-xzmy9dn4.js:324201-324290 placement
/**
 * 匹配 artifact 查看器路径的正则。
 */
var regExp = new RegExp(`^${VIEWER_PREFIX_RE}`);
var ARTIFACTS_PATH_REGEX = /^\/(?:public\/)?artifacts\//;
var LOOPBACK_IPV4_REGEX = /^127(?:\.\d{1,3}){3}$/;
//@ chunk-xzmy9dn4.js:324290-325242 placement
/**
 * 为遥测分类一个 url 参数的形状：空、子路径、合法、非规范、大小写错、桩协议、裸 id、缺协议、非 https、claude.site/claude.ai 聊天链接、查看器路径 id 错、用户内容域、回环主机、其他主机等。
 */
function classifyArtifactUrlShape(value) {
  if (value.trim() === "") return "empty";
  let canonical = canonicalizeArtifactUrlInput(value);
  if (artifactUrlSubPath(value) !== undefined || artifactUrlSubPath(canonical) !== undefined)
    return "subpath";
  if (parseArtifactUrl(value) !== null) return "valid";
  if (parseArtifactUrl(canonical) !== null) return "noncanonical";
  if (parseArtifactUrlAnyCase(value) !== null) return "wrong_case";
  if (value.startsWith(ARTIFACT_STUB_URL_PREFIX)) return "stub_scheme";
  let parsed;
  try {
    parsed = new URL(canonical);
  } catch {
    if (ARTIFACT_SLUG_RE.test(value.toLowerCase()) || decodeBase58Uuid(value) !== null) return "bare_id";
    if (parseArtifactUrlAnyCase(`https://${value}`) !== null) return "missing_scheme";
    return "not_a_url";
  }
  if (parsed.protocol !== "https:") return /^[a-z]:$/.test(parsed.protocol) ? "not_a_url" : "other_scheme";
  let hostname = parsed.hostname;
  if (hostname === "claude.site" || hostname.endsWith(".claude.site")) return "chat_artifact_link";
  if (hostname === "claude.ai" || hostname.endsWith(".claude.ai")) {
    if (regExp.test(parsed.pathname)) return "viewer_path_bad_id";
    return ARTIFACTS_PATH_REGEX.test(parsed.pathname) ? "chat_artifact_link" : "claude_ai_other_path";
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
//@ chunk-xzmy9dn4.js:325242-325279 placement
/**
 * Artifact 输入里属于 URL 的字段名。
 */
var URL_FIELD_NAMES = ["url", "type_url", "from_url"];
//@ chunk-xzmy9dn4.js:325279-325336 placement
/**
 * 非 null 对象原样返回，否则空对象。
 */
function objectOrEmpty(value) {
  return typeof value === "object" && value !== null ? value : {};
}
//@ chunk-xzmy9dn4.js:325336-325716 placement
/**
 * 分类 Artifact 工具输入中的 url 类字段：找出第一个格式无效的字段及其形状；url 与 from_url 指向同一 Artifact 时报 same_artifact；否则为 unexplained。
 */
function classifyArtifactUrlInput(input) {
  let record = objectOrEmpty(input);
  let action = artifactActionLabel(record);
  let firstField = "none";
  for (let field of URL_FIELD_NAMES) {
    let fieldValue = record[field];
    if (typeof fieldValue !== "string") continue;
    if (firstField === "none") firstField = field;
    let shape = classifyArtifactUrlShape(fieldValue);
    if (shape !== "valid")
      return {
        field,
        shape,
        action,
      };
  }
  if (
    typeof record.url === "string" &&
    typeof record.from_url === "string" &&
    parseArtifactUrl(record.url)?.slug === parseArtifactUrl(record.from_url)?.slug
  )
    return {
      field: "from_url",
      shape: "same_artifact",
      action,
    };
  return {
    field: firstField,
    shape: "unexplained",
    action,
  };
}
//@ chunk-xzmy9dn4.js:325716-326203 placement
/**
 * 输入校验因 url 不合法（errorCode 4）失败时，记录 artifact_url_input 埋点：出错字段、形状、动作、是否无人值守与路径族。
 */
function logArtifactUrlInputError(input, error, context) {
  if (error.errorCode !== 4) return;
  let classification;
  let parsed = null;
  try {
    classification = classifyArtifactUrlInput(input);
    let fieldValue = classification.field === "none" ? undefined : objectOrEmpty(input)[classification.field];
    parsed = typeof fieldValue === "string" ? parseArtifactUrl_2(fieldValue) : null;
  } catch (error) {
    logForDebugging(
      `artifact url telemetry: classifier threw: ${error instanceof Error ? error.message : typeof error}`,
      {
        level: "error",
      },
    );
    classification = {
      field: "none",
      shape: "classifier_error",
      action: artifactActionLabel(input),
    };
  }
  logFeatureSad("artifact_url_input", classification.shape, {
    field: fromEnum(classification.field),
    action: fromEnum(classification.action),
    unattended: context.unattended,
    path_family: fromEnum(parsed?.family ?? "none"),
    names_artifact: parsed !== null && parsed.artifact !== null,
  });
}
export { logArtifactUrlInputError };
