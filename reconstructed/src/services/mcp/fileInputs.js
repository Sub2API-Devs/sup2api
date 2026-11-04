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
  objectSchema,
  zodStrictObject,
  stringSchema,
  array,
  literal,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { SHA256_HEX_RE } from "../../utils/commitAttribution.js";
import { logError } from "../../utils/log.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
      let normalizedPath = normalize(path);
      return attachmentDigestOf(normalizedPath) === undefined &&
        [path, normalizedPath].some((candidate) => {
          let inputPath = candidate
            .slice(parse(candidate).root.length)
            .split(sep)
            .join("/")
            .replace(/^\/+/, "");
          return (
            !exceedsPathVariantBudget(inputPath) &&
            ![inputPath, ...getPathAliasVariants(inputPath)].some(isAbsolute) &&
            (isSensitiveNameOrVariant(inputPath) ||
              isSensitiveBasenameWithVariants(inputPath) ||
              isCredentialConfigPath_2(inputPath))
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
      let resolvedText =
        resolved !== undefined && /^[\x20\x21\x23-\x7e]+$/.test(resolved) ? resolved : undefined;
      return {
        error: `Cannot attach "${path}": it resolves to another path${resolvedText === undefined ? ", through a link or a name that is stored otherwise" : `, "${resolvedText}"`}. A file is attached only by the path it resolves to, so that the path that is approved names the file that is sent. If that is the file you mean, call again with ${resolvedText === undefined ? "the path it resolves to" : "that path"}. ${nothingDone}`,
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
  objectSchema({
    arguments: zodStrictObject({
      slug: stringSchema().min(1).max(256).optional(),
    }).optional(),
    files: array(
      objectSchema({
        sha256: stringSchema().regex(SHA256_HEX_RE),
        uri: stringSchema().min(1).max(2048),
        upload: objectSchema({
          url: stringSchema().min(1).max(2048),
          method: literal("PUT"),
          headers: record(stringSchema(), stringSchema()),
        }).optional(),
      }),
    ),
  }),
);
//@ chunk-gwvwj681.js:9758-9831 placement
/**
 * 检查调用参数是否符合 schema，返回错误描述。
 */
function schemaErrorForCall(input, schema, words) {
  let described = describeCallSchemaError(input, schema, words);
  return described !== undefined && "error" in described ? described : undefined;
}
//@ chunk-gwvwj681.js:9831-9969 placement
async function describeFileInputChange(request) {
  let upload = await resolveFileInputUpload(request);
  if (upload === undefined || "error" in upload) return upload ?? {};
  let outcome = await describeUploadOutcome(request, upload);
  return outcome.error === undefined
    ? {
        input: upload.input,
      }
    : outcome;
}
//@ chunk-gwvwj681.js:9969-10122 placement
async function resolveFileInputUpload(request) {
  let { input, schema, words } = request;
  let outcome;
  try {
    let described = describeCallSchemaError(input, schema, words);
    if (described === undefined) return;
    outcome = "error" in described ? described : await uploadFileInput(request, described);
  } catch (error) {
    logError(error);
    outcome = filesNotAttachedError(words);
  }
  return outcome;
}
//@ chunk-gwvwj681.js:10122-10587 placement
async function describeUploadOutcome(request, upload) {
  let { words } = request;
  let failure;
  try {
    let gateCode = request.gate();
    failure =
      gateCode === undefined
        ? await putFileInputs(request, upload.toSend)
        : validateFileInputPath(
            {
              path: upload.files[0].path,
              code: gateCode,
            },
            request,
          );
    if (failure?.code === "put_expired") {
      let reupload = await uploadFileInput(
        {
          ...request,
          input: upload.input,
        },
        {
          entries: [],
          paths: upload.files.map((file) => file.path),
        },
      );
      let changedFile =
        "error" in reupload
          ? undefined
          : upload.files.find((file, index) => !import_sortedIndex_2(file, reupload.files[index]));
      failure =
        "error" in reupload
          ? reupload
          : changedFile === undefined
            ? await putFileInputs(request, reupload.toSend)
            : validateFileInputPath(
                {
                  path: changedFile.path,
                  code: reupload.files.some((file) =>
                    import_sortedIndex_2(
                      {
                        ...file,
                        uri: changedFile.uri,
                      },
                      changedFile,
                    ),
                  )
                    ? "bad_answer"
                    : "changed",
                },
                request,
              );
    }
  } catch (error) {
    logError(error);
    failure = filesNotAttachedError(words);
  }
  return failure ?? {};
}
//@ chunk-gwvwj681.js:10587-11944 placement
async function uploadFileInput(request, { entries, paths }) {
  let { input, words, files, signal } = request;
  let path = paths[0];
  let gateCode = request.gate();
  if (gateCode !== undefined)
    return validateFileInputPath(
      {
        path,
        code: gateCode,
      },
      request,
    );
  let hashedFiles = [];
  for (let fileResult of await files.hash(paths, signal)) {
    if ("code" in fileResult) return validateFileInputPath(fileResult, request);
    hashedFiles.push(fileResult);
  }
  if (hashedFiles.length !== paths.length || hashedFiles.some((file, index) => file.path !== paths[index]))
    return validateFileInputPath(
      {
        path,
        code: "bad_answer",
      },
      request,
    );
  if (signal.aborted)
    return validateFileInputPath(
      {
        path,
        code: "canceled",
      },
      request,
    );
  let answer;
  try {
    answer = await request.authorize({
      for_tool: words.tool,
      ...(typeof input.slug === "string" && {
        slug: input.slug,
      }),
      files: hashedFiles.map(({ name, size, sha256 }) => ({
        name,
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
        request,
      );
    logForDebugging(`[file inputs] ${AUTHORIZE_UPLOAD} failed: ${errorMessage(error)}`, {
      level: "error",
    });
    let errorDetail =
      error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ||
      error instanceof McpAuthError
        ? truncateAtWord(errorMessage(error).trim(), MAX_ERROR_DETAIL_CHARS)
        : "";
    return {
      error: `The files could not be attached${errorDetail === "" ? "." : `: ${errorDetail}${/[.!?\u2026]$/.test(errorDetail) ? "" : "."}`} ${words.nothingDone}`,
      code: "authorize_failed",
    };
  }
  if (signal.aborted)
    return validateFileInputPath(
      {
        path,
        code: "canceled",
      },
      request,
    );
  let parsed = fileInputUploadAnswerSchema().safeParse(answer);
  if (
    !parsed.success ||
    parsed.data.files.length !== hashedFiles.length ||
    parsed.data.files.some((file, index) => file.sha256 !== hashedFiles[index].sha256)
  )
    return {
      error: `The files could not be attached. ${words.nothingDone}`,
      code: "authorize_bad_answer",
    };
  return {
    input: {
      ...parsed.data.arguments,
      ...input,
      [words.arg]: replaceLocalWithRef(entries, words, (index) => parsed.data.files[index].uri),
    },
    files: hashedFiles.map((file, index) => ({
      ...file,
      uri: parsed.data.files[index].uri,
    })),
    toSend: parsed.data.files.flatMap(({ upload, sha256 }, index) =>
      upload === undefined
        ? []
        : [
            {
              path: paths[index],
              sha256,
              url: upload.url,
              headers: upload.headers,
            },
          ],
    ),
  };
}
//@ chunk-gwvwj681.js:11944-12183 placement
async function putFileInputs(request, toSend) {
  let results = await request.files.put(toSend, request.signal);
  let found = results.find((result) => "code" in result);
  if (found !== undefined) return validateFileInputPath(found, request);
  return results.length !== toSend.length || request.signal.aborted
    ? validateFileInputPath(
        {
          path: toSend[0]?.path ?? "",
          code: request.signal.aborted ? "canceled" : "bad_answer",
        },
        request,
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
function describeCallSchemaError(input, schema, words) {
  let argValue = input[words.arg];
  if (argValue === undefined || argValue === null || (Array.isArray(argValue) && argValue.length === 0))
    return;
  let pathsOrError = validateFileEntries(argValue, words);
  if (!Array.isArray(pathsOrError)) return pathsOrError;
  let entries = [argValue].flat();
  let violation = describeSchemaViolation(input, schema, words);
  return violation === undefined
    ? {
        entries,
        paths: pathsOrError,
      }
    : {
        error: `Cannot call ${words.tool} with these arguments: ${violation.listed}.${violation.takes} ${words.nothingDone}`,
        code: "input_schema",
      };
}
//@ chunk-gwvwj681.js:12606-12720 placement
function replaceLocalWithRef(entries, { local, ref }, uriFor) {
  return entries.map((entry, index) => {
    if (!isPlainObject(entry)) return entry;
    let { [local]: local_2, ...rest } = entry;
    return {
      ...rest,
      [ref]: uriFor(index),
    };
  });
}
//@ chunk-gwvwj681.js:12720-13283 placement
function isFileInputsEnabled(toolRequest, session) {
  let freeze = OffscreenFreeze(toolRequest.meta);
  if (freeze === undefined) return;
  let { client } = toolRequest;
  let host = isDiskless() ? offscreenFreezeSlot.peek(session)?.host : undefined;
  let hostedServer = host?.servers.get(client.name);
  let isHostedMatch = isDiskless()
    ? hostedServer !== undefined &&
      client.config.type === "http" &&
      client.config.url === hostedServer.url &&
      host?.heldSinceBoot(client.name) === true
      ? hostedServer.server
      : undefined
    : client.config.scope === "claudeai" ||
        firstPartyServerIdFor(client.config) !== undefined ||
        isOwnCcrMcpServer(client.config)
      ? FIRST_PARTY_UPLOAD_SERVERS.find((server) => isFirstPartyToolboxServer(client, server))
      : undefined;
  if (isHostedMatch === undefined || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_walnut_tiller", true))
    return;
  return {
    fileInput: {
      tool: toolRequest.name,
      arg: freeze.arg,
      feature: "mcp_file_input_upload",
      local: freeze.local,
      ref: freeze.ref,
      refWord: freeze.ref,
      maxFiles: MAX_FILES_PER_INPUT,
      nothingDone: `${toolRequest.name} was not called.`,
    },
    server: isHostedMatch,
    host,
  };
}
//@ chunk-gwvwj681.js:13283-13492 placement
/**
 * 包装 MCP 工具的 validateInput：原校验通过且该工具启用了文件输入时，再检查文件引用参数是否合法，不合法返回错误（errorCode 2）并记遥测。
 */
async function validateToolFileInputs(request, validateInput, ...[input, context]) {
  let baseResult = validateInput
    ? await validateInput(input, context)
    : {
        result: true,
      };
  let fileInputInfo = baseResult.result ? isFileInputsEnabled(request, context.session) : undefined;
  let schemaError = fileInputInfo && schemaErrorForCall(input, request.schema, fileInputInfo.fileInput);
  if (schemaError === undefined) return baseResult;
  logFileInputNotAttached(schemaError.code);
  return {
    result: false,
    message: schemaError.error,
    errorCode: 2,
  };
}
//@ chunk-gwvwj681.js:13492-14066 placement
async function describeInputChanged(request) {
  let fileInputInfo = isFileInputsEnabled(request.listed, request.session);
  if (fileInputInfo === undefined) return request.input;
  let attachRequest = attachFileInputs(request, fileInputInfo);
  let { fileInput } = fileInputInfo;
  let grants = takeFileGrants(request.session, request.toolUseId);
  let isSameInput = grants !== undefined && import_sortedIndex_2(grants.input, request.input);
  let outcome;
  if (isSameInput)
    outcome = {
      ...(await describeUploadOutcome(attachRequest, grants)),
      input: request.input,
    };
  else if (grants !== undefined)
    outcome = {
      error: `The arguments of this call changed while it waited for approval. Call ${fileInput.tool} again, giving each file by its "${fileInput.local}". ${fileInput.nothingDone}`,
      code: "input_changed",
    };
  else outcome = await describeFileInputChange(attachRequest);
  if (outcome.error !== undefined) {
    logFileInputNotAttached(outcome.code);
    throw new McpToolFileInputRejectedError(outcome.error, outcome.code ?? "unexpected");
  }
  if (outcome.input === undefined) return request.input;
  logFeatureOk("mcp_file_input_upload");
  return outcome.input;
}
//@ chunk-gwvwj681.js:14066-14655 placement
function describeNoFilesNamed(request) {
  let fileInputInfo = isFileInputsEnabled(request.listed, request.session);
  let argValue = fileInputInfo && request.input[fileInputInfo.fileInput.arg];
  if (
    fileInputInfo === undefined ||
    !Array.isArray(argValue) ||
    !argValue.some((entry) => isPlainObject(entry) && fileInputInfo.fileInput.local in entry)
  )
    return;
  let prepareFor = async (input) => {
    let fileInputUpload = await resolveFileInputUpload(
      attachFileInputs(
        {
          ...request,
          input,
        },
        fileInputInfo,
      ),
    );
    if (fileInputUpload === undefined || "error" in fileInputUpload) {
      logFileInputNotAttached(fileInputUpload?.code);
      return {
        error: fileInputUpload?.error ?? `${fileInputInfo.fileInput.tool} names no files.`,
      };
    }
    let description = attachmentListText(fileInputUpload.files);
    keepFileGrants(request.session, request.toolUseId, fileInputUpload);
    return {
      input: fileInputUpload.input,
      description,
      release: async () => dropFileGrants(request.session, request.toolUseId),
    };
  };
  return {
    prepare: () => prepareFor(request.input),
    prepareAgain: ({ slug }) =>
      prepareFor(
        Object.hasOwn(request.input, "slug") || typeof slug !== "string" || slug === ""
          ? request.input
          : {
              ...request.input,
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
      let denyKind = policyDenyKind(server.policy);
      if (denyKind !== null)
        return denyKind === "cache_miss" || denyKind === "route_missing" ? "policy_unread" : "policy_denied";
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
        screen: async (path) => {
          try {
            return await screenUploadPath(path, toolPermissionContext);
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
    authorize: (authorizeRequest) =>
      logSessionRecovery(callTool, authorizeRequest, signal).catch((error) => {
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
function serverStatesPolicyFor(toolRef, { alwaysAllowRules, alwaysAskRules, alwaysDenyRules }) {
  let mcpToolName = buildMcpToolName(toolRef.serverName, toolRef.toolName);
  return [alwaysAllowRules, alwaysAskRules, alwaysDenyRules].some((ruleSet) =>
    (ruleSet.mcpServerPolicy ?? []).some(
      (rule) =>
        rule === mcpToolName ||
        mcpRuleMatchesTool(rule, {
          name: mcpToolName,
          mcpInfo: toolRef,
        }),
    ),
  );
}
//@ chunk-gwvwj681.js:15907-16251 placement
async function logSessionRecovery(callTool, authorizeRequest, signal) {
  try {
    return await callTool(AUTHORIZE_UPLOAD, authorizeRequest);
  } catch (error) {
    if (!(error instanceof McpSessionExpiredError)) throw error;
    logFeatureSad("mcp_session_recovery", error.expiryKind);
  }
  try {
    let answer = await callTool(AUTHORIZE_UPLOAD, authorizeRequest);
    logFeatureOk("mcp_session_recovery");
    return answer;
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
export { describeInputChanged, describeNoFilesNamed, serverStatesPolicyFor, validateToolFileInputs };
