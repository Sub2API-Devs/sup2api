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
import { attachmentDigestOf } from "../../utils/uploadsDir.js";
import {
  exceedsPathVariantBudget,
  getPathAliasVariants,
  isSensitiveNameOrVariant,
  isSensitiveBasenameWithVariants,
  isCredentialConfigPath_2,
} from "../../utils/permissions/sensitivePaths.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  u,
  zodStrictObject,
  string,
  array,
  literal,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { SHA256_HEX_RE } from "../../utils/commitAttribution.js";
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
import { OffscreenFreeze, offscreenFreezeSlot } from "../../components/OffscreenFreeze.js";
import { isDiskless } from "../../bootstrap/state.js";
import { firstPartyServerIdFor, allowsFileUploadFor } from "./cliOwnedClients.js";
import { isOwnCcrMcpServer } from "../analytics/metadata.js";
import { FIRST_PARTY_UPLOAD_SERVERS } from "./fileReference/wrapFileReferenceTool.js";
import { isFirstPartyToolboxServer } from "./fileReference/fileReferencePolicy.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { MAX_FILES_PER_INPUT, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from "../../utils/sizeLimits.js";
import { takeFileGrants, keepFileGrants, dropFileGrants } from "./fileGrants.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { attachmentListText, filesApiUnavailableReason } from "../fileInputs/attachmentText.js";
import { policyDenyKind } from "../policyLimits/policyEvidence.js";
import { createUploadScreen } from "../fileInputs/uploadPut.js";
import { describeConnectError } from "./auth.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { mcpRuleMatchesTool } from "./serverIdentity.js";

//@ chunk-gwvwj681.js:6870-9527 placement
/**
 * 校验要附加的文件路径（经链接解析到别处、方向控制字符、总大小、变化、策略禁止等）。
 */
function validateFileInputPath(
  { path, code, resolved },
  { words: { nothingDone }, maxFileBytes, toolPermissionContext },
) {
  if (isAttachFailureKind(code)) return attachFailureMessage(path, code, maxFileBytes, nothingDone);
  switch (code) {
    case "path_rejected": {
      let a = normalize(path);
      return attachmentDigestOf(a) === undefined &&
        [path, a].some((h) => {
          let replaced = h.slice(parse(h).root.length).split(sep).join("/").replace(/^\/+/, "");
          return (
            !exceedsPathVariantBudget(replaced) &&
            ![replaced, ...getPathAliasVariants(replaced)].some(isAbsolute) &&
            (isSensitiveNameOrVariant(replaced) ||
              isSensitiveBasenameWithVariants(replaced) ||
              isCredentialConfigPath_2(replaced))
          );
        })
        ? {
            error: credentialFileRefusalMessage(
              path,
              {
                isRemoteMode: false,
              },
              nothingDone,
            ),
            code,
          }
        : {
            error: fileNotSharedMessage(path, toolPermissionContext, nothingDone),
            code,
          };
    }
    case "resolves_elsewhere": {
      let a = resolved !== undefined && /^[\x20\x21\x23-\x7e]+$/.test(resolved) ? resolved : undefined;
      return {
        error: `Cannot attach "${path}": it resolves to another path${a === undefined ? ", through a link or a name that is stored otherwise" : `, "${a}"`}. A file is attached only by the path it resolves to, so that the path that is approved names the file that is sent. If that is the file you mean, call again with ${a === undefined ? "the path it resolves to" : "that path"}. ${nothingDone}`,
        code,
      };
    }
    case "name_direction":
      return {
        error: `Cannot attach "${path}": its name contains a character that changes text direction. Rename it, or copy it under another name. ${nothingDone}`,
        code,
      };
    case "too_large_total":
      return {
        error: `Cannot attach "${path}": the files of this call are too large together. Attach fewer or smaller files. ${nothingDone}`,
        code,
      };
    case "changed":
      return {
        error: `"${path}" changed while it was being attached. ${nothingDone} Try again.`,
        code,
      };
    case "canceled":
      return {
        error: `Attaching files was interrupted. ${nothingDone}`,
        code,
      };
    case "policy_denied":
      return {
        error: `This organization's policy does not allow attaching files here. ${nothingDone}`,
        code,
      };
    case "repo_rules_unread":
      return {
        error: `This session's cloud environment could not read the repository's permission rules, so the files were not attached. ${nothingDone} Retrying won't help: tell the user that .claude/settings.json or .claude/settings.local.json may have to be fixed or removed.`,
        code,
      };
    case "uploads_off":
      return {
        error: `Attaching files here is no longer allowed in this session. Tell the user; do not retry. ${nothingDone}`,
        code,
      };
    case "rule_not_applicable":
    case "container_too_old":
    case "no_container":
    case "egress_blocked":
    case "essential_traffic":
      return {
        error: `Files cannot be attached in this session. ${nothingDone}`,
        code,
      };
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
      return {
        error: `The files could not be attached. ${nothingDone} Try again.`,
        code,
      };
    case "bad_answer":
    case "no_server_policy":
    case "policy_unread":
    case "put_url_refused":
    case "put_header_refused":
      return {
        error: `The files could not be attached. ${nothingDone}`,
        code,
      };
    default:
      return {
        error: `The files could not be attached. ${nothingDone}`,
        code: "unexpected",
      };
  }
}
//@ chunk-gwvwj681.js:9527-9758 placement
var MAX_ERROR_DETAIL_CHARS = 300;
var fileInputUploadAnswerSchema = DoctorLazy(() =>
  u({
    arguments: zodStrictObject({
      slug: string().min(1).max(256).optional(),
    }).optional(),
    files: array(
      u({
        sha256: string().regex(SHA256_HEX_RE),
        uri: string().min(1).max(2048),
        upload: u({
          url: string().min(1).max(2048),
          method: literal("PUT"),
          headers: record(string(), string()),
        }).optional(),
      }),
    ),
  }),
);
//@ chunk-gwvwj681.js:9758-9831 placement
/**
 * 检查调用参数是否符合 schema，返回错误描述。
 */
function schemaErrorForCall(e, schema, fileInput) {
  let r = describeCallSchemaError(e, schema, fileInput);
  return r !== undefined && "error" in r ? r : undefined;
}
//@ chunk-gwvwj681.js:9831-9969 placement
async function describeFileInputChange(e) {
  let fileInputUpload = await resolveFileInputUpload(e);
  if (fileInputUpload === undefined || "error" in fileInputUpload) return fileInputUpload ?? {};
  let i = await describeUploadOutcome(e, fileInputUpload);
  return i.error === undefined
    ? {
        input: fileInputUpload.input,
      }
    : i;
}
//@ chunk-gwvwj681.js:9969-10122 placement
async function resolveFileInputUpload(e) {
  let { input, schema, words } = e;
  let s;
  try {
    let c = describeCallSchemaError(input, schema, words);
    if (c === undefined) return;
    s = "error" in c ? c : await uploadFileInput(e, c);
  } catch (error) {
    logError(error);
    s = filesNotAttachedError(words);
  }
  return s;
}
//@ chunk-gwvwj681.js:10122-10587 placement
async function describeUploadOutcome(e, n) {
  let { words } = e;
  let r;
  try {
    let s = e.gate();
    r =
      s === undefined
        ? await putFileInputs(e, n.toSend)
        : validateFileInputPath(
            {
              path: n.files[0].path,
              code: s,
            },
            e,
          );
    if (r?.code === "put_expired") {
      let c = await uploadFileInput(
        {
          ...e,
          input: n.input,
        },
        {
          entries: [],
          paths: n.files.map((file) => file.path),
        },
      );
      let a = "error" in c ? undefined : n.files.find((file, F) => !En(file, c.files[F]));
      r =
        "error" in c
          ? c
          : a === undefined
            ? await putFileInputs(e, c.toSend)
            : validateFileInputPath(
                {
                  path: a.path,
                  code: c.files.some((file) =>
                    En(
                      {
                        ...file,
                        uri: a.uri,
                      },
                      a,
                    ),
                  )
                    ? "bad_answer"
                    : "changed",
                },
                e,
              );
    }
  } catch (error) {
    logError(error);
    r = filesNotAttachedError(words);
  }
  return r ?? {};
}
//@ chunk-gwvwj681.js:10587-11944 placement
async function uploadFileInput(e, { entries, paths }) {
  let { input, words, files, signal } = e;
  let path = paths[0];
  let F = e.gate();
  if (F !== undefined)
    return validateFileInputPath(
      {
        path,
        code: F,
      },
      e,
    );
  let y = [];
  for (let _ of await files.hash(paths, signal)) {
    if ("code" in _) return validateFileInputPath(_, e);
    y.push(_);
  }
  if (y.length !== paths.length || y.some((_, I) => _.path !== paths[I]))
    return validateFileInputPath(
      {
        path,
        code: "bad_answer",
      },
      e,
    );
  if (signal.aborted)
    return validateFileInputPath(
      {
        path,
        code: "canceled",
      },
      e,
    );
  let O;
  try {
    O = await e.authorize({
      for_tool: words.tool,
      ...(typeof input.slug === "string" && {
        slug: input.slug,
      }),
      files: y.map(({ name: _, size, sha256 }) => ({
        name: _,
        size,
        sha256,
      })),
    });
  } catch (error) {
    if (signal.aborted)
      return validateFileInputPath(
        {
          path,
          code: "canceled",
        },
        e,
      );
    logForDebugging(`[file inputs] ${AUTHORIZE_UPLOAD} failed: ${errorMessage(error)}`, {
      level: "error",
    });
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
  if (signal.aborted)
    return validateFileInputPath(
      {
        path,
        code: "canceled",
      },
      e,
    );
  let S = fileInputUploadAnswerSchema().safeParse(O);
  if (
    !S.success ||
    S.data.files.length !== y.length ||
    S.data.files.some((file, I) => file.sha256 !== y[I].sha256)
  )
    return {
      error: `The files could not be attached. ${words.nothingDone}`,
      code: "authorize_bad_answer",
    };
  return {
    input: {
      ...S.data.arguments,
      ...input,
      [words.arg]: replaceLocalWithRef(entries, words, (_) => S.data.files[_].uri),
    },
    files: y.map((_, I) => ({
      ..._,
      uri: S.data.files[I].uri,
    })),
    toSend: S.data.files.flatMap(({ upload, sha256 }, b) =>
      upload === undefined
        ? []
        : [
            {
              path: paths[b],
              sha256,
              url: upload.url,
              headers: upload.headers,
            },
          ],
    ),
  };
}
//@ chunk-gwvwj681.js:11944-12183 placement
async function putFileInputs(e, toSend) {
  let i = await e.files.put(toSend, e.signal);
  let found = i.find((s) => "code" in s);
  if (found !== undefined) return validateFileInputPath(found, e);
  return i.length !== toSend.length || e.signal.aborted
    ? validateFileInputPath(
        {
          path: toSend[0]?.path ?? "",
          code: e.signal.aborted ? "canceled" : "bad_answer",
        },
        e,
      )
    : undefined;
}
//@ chunk-gwvwj681.js:12183-12283 placement
function filesNotAttachedError({ nothingDone }) {
  return {
    error: `The files could not be attached. ${nothingDone}`,
    code: "unexpected",
  };
}
//@ chunk-gwvwj681.js:12283-12606 placement
function describeCallSchemaError(e, n, i) {
  let r = e[i.arg];
  if (r === undefined || r === null || (Array.isArray(r) && r.length === 0)) return;
  let s = validateFileEntries(r, i);
  if (!Array.isArray(s)) return s;
  let entries = [r].flat();
  let a = describeSchemaViolation(e, n, i);
  return a === undefined
    ? {
        entries,
        paths: s,
      }
    : {
        error: `Cannot call ${i.tool} with these arguments: ${a.listed}.${a.takes} ${i.nothingDone}`,
        code: "input_schema",
      };
}
//@ chunk-gwvwj681.js:12606-12720 placement
function replaceLocalWithRef(entries, { local, ref }, r) {
  return entries.map((s, c) => {
    if (!isPlainObject(s)) return s;
    let { [local]: a, ...h } = s;
    return {
      ...h,
      [ref]: r(c),
    };
  });
}
//@ chunk-gwvwj681.js:12720-13283 placement
function isFileInputsEnabled(listed, session) {
  let i = OffscreenFreeze(listed.meta);
  if (i === undefined) return;
  let { client } = listed;
  let host = isDiskless() ? offscreenFreezeSlot.peek(session)?.host : undefined;
  let c = host?.servers.get(client.name);
  let a = isDiskless()
    ? c !== undefined &&
      client.config.type === "http" &&
      client.config.url === c.url &&
      host?.heldSinceBoot(client.name) === true
      ? c.server
      : undefined
    : client.config.scope === "claudeai" ||
        firstPartyServerIdFor(client.config) !== undefined ||
        isOwnCcrMcpServer(client.config)
      ? FIRST_PARTY_UPLOAD_SERVERS.find((h) => isFirstPartyToolboxServer(client, h))
      : undefined;
  if (a === undefined || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_walnut_tiller", true)) return;
  return {
    fileInput: {
      tool: listed.name,
      arg: i.arg,
      feature: "mcp_file_input_upload",
      local: i.local,
      ref: i.ref,
      refWord: i.ref,
      maxFiles: MAX_FILES_PER_INPUT,
      nothingDone: `${listed.name} was not called.`,
    },
    server: a,
    host,
  };
}
//@ chunk-gwvwj681.js:13283-13492 placement
/**
 * 包装 MCP 工具的 validateInput：原校验通过且该工具启用了文件输入时，再检查文件引用参数是否合法，不合法返回错误（errorCode 2）并记遥测。
 */
async function validateToolFileInputs(e, n, ...[i, r]) {
  let s = n
    ? await n(i, r)
    : {
        result: true,
      };
  let c = s.result ? isFileInputsEnabled(e, r.session) : undefined;
  let a = c && schemaErrorForCall(i, e.schema, c.fileInput);
  if (a === undefined) return s;
  logFileInputNotAttached(a.code);
  return {
    result: false,
    message: a.error,
    errorCode: 2,
  };
}
//@ chunk-gwvwj681.js:13492-14066 placement
async function describeInputChanged(e) {
  let n = isFileInputsEnabled(e.listed, e.session);
  if (n === undefined) return e.input;
  let i = attachFileInputs(e, n);
  let { fileInput } = n;
  let s = takeFileGrants(e.session, e.toolUseId);
  let c = s !== undefined && En(s.input, e.input);
  let a;
  if (c)
    a = {
      ...(await describeUploadOutcome(i, s)),
      input: e.input,
    };
  else if (s !== undefined)
    a = {
      error: `The arguments of this call changed while it waited for approval. Call ${fileInput.tool} again, giving each file by its "${fileInput.local}". ${fileInput.nothingDone}`,
      code: "input_changed",
    };
  else a = await describeFileInputChange(i);
  if (a.error !== undefined) {
    logFileInputNotAttached(a.code);
    throw new McpToolFileInputRejectedError(a.error, a.code ?? "unexpected");
  }
  if (a.input === undefined) return e.input;
  logFeatureOk("mcp_file_input_upload");
  return a.input;
}
//@ chunk-gwvwj681.js:14066-14655 placement
function describeNoFilesNamed(e) {
  let n = isFileInputsEnabled(e.listed, e.session);
  let i = n && e.input[n.fileInput.arg];
  if (n === undefined || !Array.isArray(i) || !i.some((s) => isPlainObject(s) && n.fileInput.local in s))
    return;
  let r = async (input) => {
    let fileInputUpload = await resolveFileInputUpload(
      attachFileInputs(
        {
          ...e,
          input,
        },
        n,
      ),
    );
    if (fileInputUpload === undefined || "error" in fileInputUpload) {
      logFileInputNotAttached(fileInputUpload?.code);
      return {
        error: fileInputUpload?.error ?? `${n.fileInput.tool} names no files.`,
      };
    }
    let description = attachmentListText(fileInputUpload.files);
    keepFileGrants(e.session, e.toolUseId, fileInputUpload);
    return {
      input: fileInputUpload.input,
      description,
      release: async () => dropFileGrants(e.session, e.toolUseId),
    };
  };
  return {
    prepare: () => r(e.input),
    prepareAgain: ({ slug }) =>
      r(
        Object.hasOwn(e.input, "slug") || typeof slug !== "string" || slug === ""
          ? e.input
          : {
              ...e.input,
              slug,
            },
      ),
  };
}
//@ chunk-gwvwj681.js:14655-15709 placement
/**
 * 为 MCP 调用附加文件（缓存未命中、路由缺失、策略不可读等）。
 */
function attachFileInputs(
  { listed, input, toolPermissionContext, callTool, signal },
  { fileInput, server, host },
) {
  return {
    input,
    schema: listed.schema,
    words: fileInput,
    maxFileBytes: MAX_FILE_BYTES,
    toolPermissionContext,
    gate: () => {
      let F = policyDenyKind(server.policy);
      if (F !== null) return F === "cache_miss" || F === "route_missing" ? "policy_unread" : "policy_denied";
      if (!allowsFileUploadFor(listed.client.config)) return "uploads_off";
      return (
        filesApiUnavailableReason() ??
        (host?.ruleItCannotApply(toolPermissionContext) === undefined
          ? host === undefined ||
            serverStatesPolicyFor(
              {
                serverName: listed.client.name,
                toolName: listed.name,
              },
              toolPermissionContext,
            )
            ? undefined
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
        maxFileBytes: MAX_FILE_BYTES,
        maxTotalBytes: MAX_TOTAL_BYTES,
        uploadPathPrefix: server.uploadPathPrefix,
        namesResolvedPaths: true,
      }),
    authorize: (F) =>
      logSessionRecovery(callTool, F, signal).catch((error) => {
        throw error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ||
          error instanceof McpAuthError ||
          (error instanceof Error &&
            (error.name === "McpError" || error.name === "ProtocolError") &&
            "code" in error &&
            typeof error.code === "number")
          ? error
          : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              describeConnectError(error, listed.client.config),
              "MCP tool file input: the ask of the server failed",
            );
      }),
    signal,
  };
}
//@ chunk-gwvwj681.js:15709-15907 placement
/**
 * 判断权限规则中是否有针对该 MCP 工具的服务器级策略条目。
 */
function serverStatesPolicyFor(e, { alwaysAllowRules, alwaysAskRules, alwaysDenyRules }) {
  let mcpToolName = buildMcpToolName(e.serverName, e.toolName);
  return [alwaysAllowRules, alwaysAskRules, alwaysDenyRules].some((c) =>
    (c.mcpServerPolicy ?? []).some(
      (a) =>
        a === mcpToolName ||
        mcpRuleMatchesTool(a, {
          name: mcpToolName,
          mcpInfo: e,
        }),
    ),
  );
}
//@ chunk-gwvwj681.js:15907-16251 placement
async function logSessionRecovery(callTool, n, signal) {
  try {
    return await callTool(AUTHORIZE_UPLOAD, n);
  } catch (error) {
    if (!(error instanceof McpSessionExpiredError)) throw error;
    logFeatureSad("mcp_session_recovery", error.expiryKind);
  }
  try {
    let r = await callTool(AUTHORIZE_UPLOAD, n);
    logFeatureOk("mcp_session_recovery");
    return r;
  } catch (error) {
    if (error instanceof McpSessionExpiredError)
      logFeatureBad("mcp_session_recovery", "session_retry_exhausted");
    else if (!signal.aborted) logFeatureBad("mcp_session_recovery", "retry_failed_other");
    throw error;
  }
}
//@ chunk-gwvwj681.js:16251-16460 placement
function logFileInputNotAttached(code) {
  logForDebugging(`[file inputs] not attached: ${code ?? "unexpected"}`);
  if (code === "input_schema" || code === "resolves_elsewhere") logFeatureSad("mcp_file_input_upload", code);
  else if (code !== "canceled") logFeatureBad("mcp_file_input_upload", code ?? "unexpected");
}
