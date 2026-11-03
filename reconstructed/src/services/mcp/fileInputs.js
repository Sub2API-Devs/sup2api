/**
 * services/mcp/fileInputs.ts
 *
 * 2.1.316 新增：MCP 工具的文件输入（file inputs）：校验并上传本地文件作为工具参数、重试与会话恢复
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gwvwj681.js (19)
 * attribution: placement 19
 */
import { normalize, parse, sep, isAbsolute } from "path";
import {
  isAttachFailureKind,
  attachFailureMessage,
  credentialFileRefusalMessage,
  fileNotSharedMessage,
  screenUploadPath,
} from "../fileInputs/screenPath.js";
import { Dot } from "../../utils/uploadsDir.js";
import {
  QSn,
  getPathAliasVariants,
  _H,
  B$e,
  isCredentialConfigPath,
} from "../../utils/permissions/sensitivePaths.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, zodStrictObject, o, A, T, pe } from "../../../vendor/zod/v4/classic/schemas.js";
import { AS } from "../../utils/commitAttribution.js";
import { logError } from "../../utils/log.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../../utils/debug.js";
import { AUTHORIZE_UPLOAD } from "../mcpServe/fileInputs.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import {
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  McpAuthError,
  McpToolFileInputRejectedError,
  McpSessionExpiredError,
} from "./client.js";
import { truncateAtWord } from "../../utils/stringUtils.js";
import { validateFileEntries, describeSchemaViolation } from "./inputSchemaCheck.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { OffscreenFreeze, z } from "../../components/OffscreenFreeze.js";
import { isDiskless } from "../../bootstrap/state.js";
import { firstPartyServerIdFor, allowsFileUploadFor } from "./cliOwnedClients.js";
import { isOwnCcrMcpServer } from "../analytics/metadata.js";
import { FIRST_PARTY_UPLOAD_SERVERS } from "./fileReference/wrapFileReferenceTool.js";
import { isFirstPartyToolboxServer } from "./fileReference/fileReferencePolicy.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { Sbt, O1t, _un } from "../../utils/sizeLimits.js";
import { takeFileGrants, keepFileGrants, dropFileGrants } from "./fileGrants.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { attachmentListText, filesApiUnavailableReason } from "../fileInputs/attachmentText.js";
import { policyDenyKind } from "../policyLimits/policyEvidence.js";
import { createUploadScreen } from "../fileInputs/uploadPut.js";
import { describeConnectError } from "./auth.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { mcpRuleMatchesTool } from "./serverIdentity.js";

/**
 * 校验要附加的文件路径（经链接解析到别处、方向控制字符、总大小、变化、策略禁止等）。
 */
//@ chunk-gwvwj681.js:6870-9527 placement
function validateFileInputPath(
  { path: path, code: code, resolved: resolved },
  { words: { nothingDone: r }, maxFileBytes: maxFileBytes, toolPermissionContext: toolPermissionContext },
) {
  if (isAttachFailureKind(code)) return attachFailureMessage(path, code, maxFileBytes, r);
  switch (code) {
    case "path_rejected": {
      let a = normalize(path);
      return Dot(a) === void 0 &&
        [path, a].some((h) => {
          let replaced = h.slice(parse(h).root.length).split(sep).join("/").replace(/^\/+/, "");
          return (
            !QSn(replaced) &&
            ![replaced, ...getPathAliasVariants(replaced)].some(isAbsolute) &&
            (_H(replaced) || B$e(replaced) || isCredentialConfigPath(replaced))
          );
        })
        ? { error: credentialFileRefusalMessage(path, { isRemoteMode: !1 }, r), code: code }
        : { error: fileNotSharedMessage(path, toolPermissionContext, r), code: code };
    }
    case "resolves_elsewhere": {
      let a = resolved !== void 0 && /^[\x20\x21\x23-\x7e]+$/.test(resolved) ? resolved : void 0;
      return {
        error: `Cannot attach "${path}": it resolves to another path${a === void 0 ? ", through a link or a name that is stored otherwise" : `, "${a}"`}. A file is attached only by the path it resolves to, so that the path that is approved names the file that is sent. If that is the file you mean, call again with ${a === void 0 ? "the path it resolves to" : "that path"}. ${r}`,
        code: code,
      };
    }
    case "name_direction":
      return {
        error: `Cannot attach "${path}": its name contains a character that changes text direction. Rename it, or copy it under another name. ${r}`,
        code: code,
      };
    case "too_large_total":
      return {
        error: `Cannot attach "${path}": the files of this call are too large together. Attach fewer or smaller files. ${r}`,
        code: code,
      };
    case "changed":
      return { error: `"${path}" changed while it was being attached. ${r} Try again.`, code: code };
    case "canceled":
      return { error: `Attaching files was interrupted. ${r}`, code: code };
    case "policy_denied":
      return { error: `This organization's policy does not allow attaching files here. ${r}`, code: code };
    case "repo_rules_unread":
      return {
        error: `This session's cloud environment could not read the repository's permission rules, so the files were not attached. ${r} Retrying won't help: tell the user that .claude/settings.json or .claude/settings.local.json may have to be fixed or removed.`,
        code: code,
      };
    case "uploads_off":
      return {
        error: `Attaching files here is no longer allowed in this session. Tell the user; do not retry. ${r}`,
        code: code,
      };
    case "rule_not_applicable":
    case "container_too_old":
    case "no_container":
    case "egress_blocked":
    case "essential_traffic":
      return { error: `Files cannot be attached in this session. ${r}`, code: code };
    case "policy_pending":
    case "container_unreachable":
    case "no_answer":
    case "put_hash_mismatch":
    case "put_refused":
    case "put_already_used":
    case "put_expired":
    case "put_size_mismatch":
    case "put_busy":
    case "put_failed":
    case "put_bad_answer":
    case "put_network":
      return { error: `The files could not be attached. ${r} Try again.`, code: code };
    case "bad_answer":
    case "no_server_policy":
    case "policy_unread":
    case "put_url_refused":
    case "put_header_refused":
      return { error: `The files could not be attached. ${r}`, code: code };
    default:
      return { error: `The files could not be attached. ${r}`, code: "unexpected" };
  }
}
//@ chunk-gwvwj681.js:9527-9758 placement
var MAX_ERROR_DETAIL_CHARS = 300,
  fileInputUploadAnswerSchema = DoctorLazy(() =>
    u({
      arguments: zodStrictObject({ slug: o().min(1).max(256).optional() }).optional(),
      files: A(
        u({
          sha256: o().regex(AS),
          uri: o().min(1).max(2048),
          upload: u({ url: o().min(1).max(2048), method: T("PUT"), headers: pe(o(), o()) }).optional(),
        }),
      ),
    }),
  );
//@ chunk-gwvwj681.js:9758-9831 placement
function H(e, n, i) {
  let r = describeCallSchemaError(e, n, i);
  return r !== void 0 && "error" in r ? r : void 0;
}
//@ chunk-gwvwj681.js:9831-9969 placement
async function describeFileInputChange(e) {
  let n = await resolveFileInputUpload(e);
  if (n === void 0 || "error" in n) return n ?? {};
  let i = await describeUploadOutcome(e, n);
  return i.error === void 0 ? { input: n.input } : i;
}
//@ chunk-gwvwj681.js:9969-10122 placement
async function resolveFileInputUpload(e) {
  let { input: input, schema: schema, words: words } = e,
    s;
  try {
    let c = describeCallSchemaError(input, schema, words);
    if (c === void 0) return;
    s = "error" in c ? c : await uploadFileInput(e, c);
  } catch (error) {
    (logError(error), (s = filesNotAttachedError(words)));
  }
  return s;
}
//@ chunk-gwvwj681.js:10122-10587 placement
async function describeUploadOutcome(e, n) {
  let { words: words } = e,
    r;
  try {
    let gate = e.gate();
    if (
      ((r =
        gate === void 0
          ? await putFileInputs(e, n.toSend)
          : validateFileInputPath({ path: n.files[0].path, code: gate }, e)),
      r?.code === "put_expired")
    ) {
      let c = await uploadFileInput(
          { ...e, input: n.input },
          { entries: [], paths: n.files.map((file) => file.path) },
        ),
        a = "error" in c ? void 0 : n.files.find((file, F) => !En(file, c.files[F]));
      r =
        "error" in c
          ? c
          : a === void 0
            ? await putFileInputs(e, c.toSend)
            : validateFileInputPath(
                {
                  path: a.path,
                  code: c.files.some((file) => En({ ...file, uri: a.uri }, a)) ? "bad_answer" : "changed",
                },
                e,
              );
    }
  } catch (error) {
    (logError(error), (r = filesNotAttachedError(words)));
  }
  return r ?? {};
}
//@ chunk-gwvwj681.js:10587-11944 placement
async function uploadFileInput(e, { entries: entries, paths: paths }) {
  let { input: input, words: words, files: files, signal: signal } = e,
    h = paths[0],
    gate = e.gate();
  if (gate !== void 0) return validateFileInputPath({ path: h, code: gate }, e);
  let y = [];
  for (let _ of await files.hash(paths, signal)) {
    if ("code" in _) return validateFileInputPath(_, e);
    y.push(_);
  }
  if (y.length !== paths.length || y.some((_, I) => _.path !== paths[I]))
    return validateFileInputPath({ path: h, code: "bad_answer" }, e);
  if (signal.aborted) return validateFileInputPath({ path: h, code: "canceled" }, e);
  let O;
  try {
    O = await e.authorize({
      for_tool: words.tool,
      ...(typeof input.slug === "string" && { slug: input.slug }),
      files: y.map(({ name: _, size: size, sha256: sha256 }) => ({ name: _, size: size, sha256: sha256 })),
    });
  } catch (error) {
    if (signal.aborted) return validateFileInputPath({ path: h, code: "canceled" }, e);
    logForDebugging(`[file inputs] ${AUTHORIZE_UPLOAD} failed: ${errorMessage(error)}`, { level: "error" });
    let I =
      error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ||
      error instanceof McpAuthError
        ? truncateAtWord(errorMessage(error).trim(), MAX_ERROR_DETAIL_CHARS)
        : "";
    return {
      error: `The files could not be attached${I === "" ? "." : `: ${I}${/[.!?\u2026]$/.test(I) ? "" : "."}`} ${words.nothingDone}`,
      code: "authorize_failed",
    };
  }
  if (signal.aborted) return validateFileInputPath({ path: h, code: "canceled" }, e);
  let safeParse = fileInputUploadAnswerSchema().safeParse(O);
  if (
    !safeParse.success ||
    safeParse.data.files.length !== y.length ||
    safeParse.data.files.some((file, I) => file.sha256 !== y[I].sha256)
  )
    return { error: `The files could not be attached. ${words.nothingDone}`, code: "authorize_bad_answer" };
  return {
    input: {
      ...safeParse.data.arguments,
      ...input,
      [words.arg]: replaceLocalWithRef(entries, words, (_) => safeParse.data.files[_].uri),
    },
    files: y.map((_, I) => ({ ..._, uri: safeParse.data.files[I].uri })),
    toSend: safeParse.data.files.flatMap(({ upload: upload, sha256: sha256 }, b) =>
      upload === void 0 ? [] : [{ path: paths[b], sha256: sha256, url: upload.url, headers: upload.headers }],
    ),
  };
}
//@ chunk-gwvwj681.js:11944-12183 placement
async function putFileInputs(e, n) {
  let put = await e.files.put(n, e.signal),
    found = put.find((s) => "code" in s);
  if (found !== void 0) return validateFileInputPath(found, e);
  return put.length !== n.length || e.signal.aborted
    ? validateFileInputPath({ path: n[0]?.path ?? "", code: e.signal.aborted ? "canceled" : "bad_answer" }, e)
    : void 0;
}
//@ chunk-gwvwj681.js:12183-12283 placement
function filesNotAttachedError({ nothingDone: nothingDone }) {
  return { error: `The files could not be attached. ${nothingDone}`, code: "unexpected" };
}
//@ chunk-gwvwj681.js:12283-12606 placement
function describeCallSchemaError(e, n, i) {
  let r = e[i.arg];
  if (r === void 0 || r === null || (Array.isArray(r) && r.length === 0)) return;
  let s = validateFileEntries(r, i);
  if (!Array.isArray(s)) return s;
  let flat = [r].flat(),
    a = describeSchemaViolation(e, n, i);
  return a === void 0
    ? { entries: flat, paths: s }
    : {
        error: `Cannot call ${i.tool} with these arguments: ${a.listed}.${a.takes} ${i.nothingDone}`,
        code: "input_schema",
      };
}
//@ chunk-gwvwj681.js:12606-12720 placement
function replaceLocalWithRef(e, { local: local, ref: ref }, r) {
  return e.map((s, c) => {
    if (!isPlainObject(s)) return s;
    let { [local]: a, ...h } = s;
    return { ...h, [ref]: r(c) };
  });
}
//@ chunk-gwvwj681.js:12720-13283 placement
function isFileInputsEnabled(e, n) {
  let i = OffscreenFreeze(e.meta);
  if (i === void 0) return;
  let { client: client } = e,
    s = isDiskless() ? z.peek(n)?.host : void 0,
    c = s?.servers.get(client.name),
    a = isDiskless()
      ? c !== void 0 &&
        client.config.type === "http" &&
        client.config.url === c.url &&
        s?.heldSinceBoot(client.name) === !0
        ? c.server
        : void 0
      : client.config.scope === "claudeai" ||
          firstPartyServerIdFor(client.config) !== void 0 ||
          isOwnCcrMcpServer(client.config)
        ? FIRST_PARTY_UPLOAD_SERVERS.find((h) => isFirstPartyToolboxServer(client, h))
        : void 0;
  if (a === void 0 || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_walnut_tiller", !0)) return;
  return {
    fileInput: {
      tool: e.name,
      arg: i.arg,
      feature: "mcp_file_input_upload",
      local: i.local,
      ref: i.ref,
      refWord: i.ref,
      maxFiles: Sbt,
      nothingDone: `${e.name} was not called.`,
    },
    server: a,
    host: s,
  };
}
/**
 * 包装 MCP 工具的 validateInput：原校验通过且该工具启用了文件输入时，再检查文件引用参数是否合法，不合法返回错误（errorCode 2）并记遥测。
 */
//@ chunk-gwvwj681.js:13283-13492 placement
async function validateToolFileInputs(e, n, ...[i, r]) {
  let s = n ? await n(i, r) : { result: !0 },
    c = s.result ? isFileInputsEnabled(e, r.session) : void 0,
    a = c && H(i, e.schema, c.fileInput);
  if (a === void 0) return s;
  return (logFileInputNotAttached(a.code), { result: !1, message: a.error, errorCode: 2 });
}
//@ chunk-gwvwj681.js:13492-14066 placement
async function describeInputChanged(e) {
  let n = isFileInputsEnabled(e.listed, e.session);
  if (n === void 0) return e.input;
  let i = attachFileInputs(e, n),
    { fileInput: fileInput } = n,
    s = takeFileGrants(e.session, e.toolUseId),
    c = s !== void 0 && En(s.input, e.input),
    a;
  if (c) a = { ...(await describeUploadOutcome(i, s)), input: e.input };
  else if (s !== void 0)
    a = {
      error: `The arguments of this call changed while it waited for approval. Call ${fileInput.tool} again, giving each file by its "${fileInput.local}". ${fileInput.nothingDone}`,
      code: "input_changed",
    };
  else a = await describeFileInputChange(i);
  if (a.error !== void 0)
    throw (
      logFileInputNotAttached(a.code),
      new McpToolFileInputRejectedError(a.error, a.code ?? "unexpected")
    );
  if (a.input === void 0) return e.input;
  return (logFeatureOk("mcp_file_input_upload"), a.input);
}
//@ chunk-gwvwj681.js:14066-14655 placement
function describeNoFilesNamed(e) {
  let n = isFileInputsEnabled(e.listed, e.session),
    i = n && e.input[n.fileInput.arg];
  if (n === void 0 || !Array.isArray(i) || !i.some((s) => isPlainObject(s) && n.fileInput.local in s)) return;
  let r = async (s) => {
    let c = await resolveFileInputUpload(attachFileInputs({ ...e, input: s }, n));
    if (c === void 0 || "error" in c)
      return (logFileInputNotAttached(c?.code), { error: c?.error ?? `${n.fileInput.tool} names no files.` });
    let a = attachmentListText(c.files);
    return (
      keepFileGrants(e.session, e.toolUseId, c),
      { input: c.input, description: a, release: async () => dropFileGrants(e.session, e.toolUseId) }
    );
  };
  return {
    prepare: () => r(e.input),
    prepareAgain: ({ slug: slug }) =>
      r(
        Object.hasOwn(e.input, "slug") || typeof slug !== "string" || slug === ""
          ? e.input
          : { ...e.input, slug: slug },
      ),
  };
}
/**
 * 为 MCP 调用附加文件（缓存未命中、路由缺失、策略不可读等）。
 */
//@ chunk-gwvwj681.js:14655-15709 placement
function attachFileInputs(
  {
    listed: listed,
    input: input,
    toolPermissionContext: toolPermissionContext,
    callTool: callTool,
    signal: signal,
  },
  { fileInput: fileInput, server: server, host: host },
) {
  return {
    input: input,
    schema: listed.schema,
    words: fileInput,
    maxFileBytes: O1t,
    toolPermissionContext: toolPermissionContext,
    gate: () => {
      let F = policyDenyKind(server.policy);
      if (F !== null) return F === "cache_miss" || F === "route_missing" ? "policy_unread" : "policy_denied";
      if (!allowsFileUploadFor(listed.client.config)) return "uploads_off";
      return (
        filesApiUnavailableReason() ??
        (host?.ruleItCannotApply(toolPermissionContext) === void 0
          ? host === void 0 ||
            serverStatesPolicyFor(
              { serverName: listed.client.name, toolName: listed.name },
              toolPermissionContext,
            )
            ? void 0
            : "no_server_policy"
          : "rule_not_applicable")
      );
    },
    files:
      host?.files ??
      createUploadScreen({
        screen: async (F) => {
          try {
            return await screenUploadPath(F, toolPermissionContext);
          } catch (error) {
            logForDebugging(
              `[file inputs] a path was rejected: ${error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? error.telemetryMessage : "not readable"}`,
            );
            return;
          }
        },
        maxFileBytes: O1t,
        maxTotalBytes: _un,
        uploadPathPrefix: server.uploadPathPrefix,
        namesResolvedPaths: !0,
      }),
    authorize: (F) =>
      logSessionRecovery(callTool, F, signal).catch((y) => {
        throw y instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ||
          y instanceof McpAuthError ||
          (y instanceof Error &&
            (y.name === "McpError" || y.name === "ProtocolError") &&
            "code" in y &&
            typeof y.code === "number")
          ? y
          : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              describeConnectError(y, listed.client.config),
              "MCP tool file input: the ask of the server failed",
            );
      }),
    signal: signal,
  };
}
/**
 * 判断权限规则中是否有针对该 MCP 工具的服务器级策略条目。
 */
//@ chunk-gwvwj681.js:15709-15907 placement
function serverStatesPolicyFor(
  e,
  { alwaysAllowRules: alwaysAllowRules, alwaysAskRules: alwaysAskRules, alwaysDenyRules: alwaysDenyRules },
) {
  let s = buildMcpToolName(e.serverName, e.toolName);
  return [alwaysAllowRules, alwaysAskRules, alwaysDenyRules].some((c) =>
    (c.mcpServerPolicy ?? []).some((a) => a === s || mcpRuleMatchesTool(a, { name: s, mcpInfo: e })),
  );
}
//@ chunk-gwvwj681.js:15907-16251 placement
async function logSessionRecovery(e, n, i) {
  try {
    return await e(AUTHORIZE_UPLOAD, n);
  } catch (error) {
    if (!(error instanceof McpSessionExpiredError)) throw error;
    logFeatureSad("mcp_session_recovery", error.expiryKind);
  }
  try {
    let r = await e(AUTHORIZE_UPLOAD, n);
    return (logFeatureOk("mcp_session_recovery"), r);
  } catch (error) {
    if (error instanceof McpSessionExpiredError)
      logFeatureBad("mcp_session_recovery", "session_retry_exhausted");
    else if (!i.aborted) logFeatureBad("mcp_session_recovery", "retry_failed_other");
    throw error;
  }
}
//@ chunk-gwvwj681.js:16251-16460 placement
function logFileInputNotAttached(e) {
  if (
    (logForDebugging(`[file inputs] not attached: ${e ?? "unexpected"}`),
    e === "input_schema" || e === "resolves_elsewhere")
  )
    logFeatureSad("mcp_file_input_upload", e);
  else if (e !== "canceled") logFeatureBad("mcp_file_input_upload", e ?? "unexpected");
}
