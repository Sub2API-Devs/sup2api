/**
 * tools/ArtifactTool/artifactCall.ts
 *
 * 2.1.316 新增。Artifact 调用（publish、upload_asset）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pjmrd77p.js (23)
 * attribution: placement 23
 */
import { relative, sep, join, resolve, isAbsolute } from "path";
import { realpath, open, readlink } from "fs/promises";
import { constants } from "fs";
import { randomUUID } from "crypto";
import {
  ARTIFACT_SLUG_RE,
  parseArtifactUrlAnyCase,
  ASSET_ID_RE,
  ARTIFACT_TOOL_NAME,
  ARTIFACT_DATA_TOOL_NAME,
  ArtifactInputError,
} from "./constants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  looseObject,
  stringSchema,
  zodStrictObject,
  literal,
  _enum,
  record,
  unknown,
  numberSchema,
  array,
  union,
  nullSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { formatZodValidationError } from "../../utils/toolErrors.js";
import { MAX_URL_SEGMENT_CHARS, readExactBytes } from "../../services/artifacts/artifactUrl.js";
import { MAX_ARTIFACT_BYTES } from "../../services/artifacts/frameFlags.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { MANIFEST_REQUEST_BUDGET } from "../../services/artifacts/publishInstanceFiles.js";
import { findToolByName, hasAfterResultCommitted } from "../../Tool.js";
import { isArtifactToolsetSplit } from "../../services/artifacts/artifactToolGates.js";
import { collapseArtifactAction } from "../../services/artifacts/artifactToolActions.js";
import { isArtifactAssetsEnabled } from "./actions/uploadAsset.js";
import { normalizeArtifactInput } from "../../services/artifacts/artifactInputNormalize.js";
import { isArtifactDbEnabled, isArtifactDbStrReplaceEnabled } from "../../services/artifacts/artifactDb.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import {
  runPreToolUseHooks,
  resolvePermissionDecisionForCall,
  runPostToolUseHooks,
  runPostToolUseFailureHooks,
} from "../../services/tools/toolHooks.js";
import { startPermissionRound, takePermissionRecord } from "../../utils/permissions/permissionRecord.js";
import { clearToolUsePermissionState } from "../../components/permissions/hooks.js";
import { isEmptyObject } from "../../utils/toolInputPlaceholder.js";
import { recordToolUsed } from "../../services/compact/keptTools.js";
import {
  watchWithheldResults,
  releaseWithheldWatch,
  withheldResultText,
} from "../../plugins/functionHooks/toolCallHooks.js";
import { errorMessage, isAbortError } from "../../utils/errors.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { normalizeForDisplay, sanitizeDisplayText } from "../../utils/resultError.js";
import { sniffImageMediaType } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { maybeResizeAndDownsampleImageBlock } from "../../utils/imageResizer.js";
import { MODEL_COPY_IMAGE_BYTES } from "../../utils/mediaLimits.js";
import { countWhere } from "../../utils/collections.js";

//@ chunk-pjmrd77p.js:13854-14130 placement
function parseArtifactId(value) {
  let lower = value.trim().toLowerCase();
  if (ARTIFACT_SLUG_RE.test(lower))
    return {
      id: lower,
    };
  let artifactUrlAnyCase = parseArtifactUrlAnyCase(value.trim());
  if (artifactUrlAnyCase !== null && ARTIFACT_SLUG_RE.test(artifactUrlAnyCase.slug.toLowerCase()))
    return {
      id: artifactUrlAnyCase.slug.toLowerCase(),
    };
  return {
    error: "artifact must be an artifact URL (https://claude.ai/code/artifact/<id>) or a bare artifact id",
  };
}
//@ chunk-pjmrd77p.js:14130-14235 placement
/**
 * 解析 artifact_call 参数中的 Artifact id（为空则无 id，格式错误返回 error）。
 */
function readArtifactIdArg(artifact) {
  if (artifact !== undefined && artifact.trim() !== "") {
    let artifactId = parseArtifactId(artifact);
    return "error" in artifactId
      ? artifactId
      : {
          id: artifactId.id,
        };
  }
  return {
    id: undefined,
  };
}
//@ chunk-pjmrd77p.js:14235-14289 placement
var APPIFACT_ARTIFACT = "APPIFACT_ARTIFACT";
var APPIFACT_ARTIFACT_URL = "APPIFACT_ARTIFACT_URL";
//@ chunk-pjmrd77p.js:14639-15027 placement
/**
 * artifact_call 页面调用的协议常量：动词集合（数据库读写、读文件、资源、publish/open）、调用 id 格式、结果大小上限与严格 schema。
 */
var fileReadResultSchema = DoctorLazy(() =>
  objectSchema({
    file_read: looseObject({
      path: stringSchema(),
      saved_to: stringSchema(),
    }),
  }),
);
var ARTIFACT_CALL = "artifact_call";
var MAX_CALL_RESULT_BYTES = 1048576;
var DB_READ_OPS = ["get", "list", "query"];
var DB_WRITE_OPS_LIST = ["set", "update", "delete", "batch"];
var DB_READ_OP_SET = new Set(DB_READ_OPS);
var FILE_READ_VERBS = ["read_file", "read_files", "list_files"];
var ASSET_VERBS = ["upload_asset", "read_asset"];
var MAX_CALL_ID_LENGTH = 32;
var ARTIFACT_CALL_VERBS = [
  ...DB_READ_OPS,
  ...DB_WRITE_OPS_LIST,
  ...FILE_READ_VERBS,
  ...ASSET_VERBS,
  "publish",
  "open",
];
var artifactCallSchema = DoctorLazy(() =>
  zodStrictObject({
    type: literal(ARTIFACT_CALL),
    id: stringSchema().regex(CALL_ID_RE),
    verb: _enum(ARTIFACT_CALL_VERBS),
    args: record(stringSchema(), unknown()),
  }),
);
var CALL_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
//@ chunk-pjmrd77p.js:15027-15122 placement
/**
 * 校验 artifact_call 的参数：成功返回 frame，失败返回格式化的校验错误。
 */
function parseArtifactCallArgs(args) {
  let parsed = artifactCallSchema().safeParse(args);
  return parsed.success
    ? {
        frame: parsed.data,
      }
    : {
        invalid: formatZodValidationError(ARTIFACT_CALL, parsed.error),
      };
}
//@ chunk-pjmrd77p.js:15122-15499 placement
/**
 * artifact_call 数据库动作的参数 schema：url、collection、doc_id、data、query、if_version，以及最多 100 条的 writes 批量写。
 */
var dbCallArgsSchema = DoctorLazy(() =>
  zodStrictObject({
    url: stringSchema().max(2048),
    collection: stringSchema().max(2048).optional(),
    doc_id: stringSchema().max(2048).optional(),
    data: record(stringSchema(), unknown()).optional(),
    query: record(stringSchema(), unknown()).optional(),
    if_version: numberSchema().int().positive().optional(),
    writes: array(
      zodStrictObject({
        op: stringSchema().max(16),
        collection: stringSchema().max(2048),
        doc_id: stringSchema().max(2048),
        data: record(stringSchema(), unknown()).optional(),
        if_version: numberSchema().int().positive().optional(),
      }),
    )
      .max(100)
      .optional(),
  }),
);
//@ chunk-pjmrd77p.js:15499-15607 placement
function stripIfVersion({ if_version: ifVersion, writes, ...rest }) {
  return writes === undefined
    ? rest
    : {
        ...rest,
        writes: writes.map(({ if_version: ifVersion, ...write }) => write),
      };
}
//@ chunk-pjmrd77p.js:15607-16567 placement
/**
 * artifact_call 各组参数 schema（asset 路径/批量、file_path、asset_id 与发布输入）。
 */
var ARTIFACT_CALL_SCHEMAS = DoctorLazy(() =>
  zodStrictObject({
    url: stringSchema().max(2048),
  }),
);
var assetPathReadSchema = DoctorLazy(() =>
  zodStrictObject({
    url: stringSchema().max(2048),
    path: stringSchema()
      .min(1)
      .max(512)
      .refine((path) => !ASSET_ID_RE.test(path), {
        message: "path looks like an asset id; read_file takes a published path",
      }),
  }),
);
var assetPathsReadSchema = DoctorLazy(() =>
  zodStrictObject({
    url: stringSchema().max(2048),
    paths: array(assetPathReadSchema().shape.path).min(1).max(MAX_CALL_ID_LENGTH),
  }),
);
var filePathReadSchema = DoctorLazy(() =>
  zodStrictObject({
    url: stringSchema().max(2048),
    file_path: stringSchema().min(1).max(4096),
  }),
);
var assetIdReadSchema = DoctorLazy(() =>
  zodStrictObject({
    url: stringSchema().max(2048),
    asset_id: stringSchema().regex(ASSET_ID_RE),
  }),
);
var publishInputSchema = DoctorLazy(() =>
  zodStrictObject({
    file_path: stringSchema().max(4096),
    root: stringSchema().min(1).max(1024).optional(),
    files: record(
      stringSchema().min(1).max(512),
      union([
        stringSchema().min(1).max(512),
        zodStrictObject({
          from: stringSchema().min(1).max(512),
          contentType: stringSchema().optional(),
        }),
        nullSchema(),
      ]),
    )
      .refine((files) => Object.keys(files).length < MAX_URL_SEGMENT_CHARS, {
        message: `files lists more than ${MAX_URL_SEGMENT_CHARS - 1} entries`,
      })
      .optional(),
    url: stringSchema().max(2048).optional(),
    title: stringSchema().max(512).optional(),
    favicon: stringSchema().min(1).max(32).optional(),
    icon: stringSchema().max(40).optional(),
    capabilities: record(stringSchema(), unknown()).optional(),
    contract: stringSchema().max(32).optional(),
    session_context: stringSchema().max(20000).optional(),
    description: stringSchema().max(1000).optional(),
  }),
);
//@ chunk-pjmrd77p.js:16567-16663 placement
/**
 * 生成失败结果对象（错误码、消息与可选原因码）。
 */
function errorResult(code, message, reason) {
  return {
    ok: false,
    error:
      reason === undefined
        ? {
            code,
            message,
          }
        : {
            code,
            message,
            reason,
          },
  };
}
//@ chunk-pjmrd77p.js:16663-16875 placement
var PUBLISH_INCOMPLETE = {
  ok: false,
  error: {
    code: "tool_error",
    message: "the publish did not complete",
  },
};
var UPLOAD_INCOMPLETE = {
  ok: false,
  error: {
    code: "tool_error",
    message: "the upload did not complete",
  },
};
var APPIFACT_PUBLISH_DIR_RE = /^\.appifact-publish-[A-Za-z0-9]{6}$/;
var INDEX_HTML = "index.html";
//@ chunk-pjmrd77p.js:16875-16977 placement
function publishStagingDir(path, cwd) {
  let [firstSegment, ...restSegments] = relative(cwd, path).split(sep);
  return firstSegment !== undefined && restSegments.length > 0 && APPIFACT_PUBLISH_DIR_RE.test(firstSegment)
    ? join(cwd, firstSegment)
    : null;
}
//@ chunk-pjmrd77p.js:16977-17127 placement
async function readStagedPage(path, cwd, allowRoot = false) {
  try {
    let realCwd = await realpath(cwd);
    return await readSingleLinkFile(resolve(cwd, path), (realFilePath) => {
      let stagingDir = publishStagingDir(realFilePath, realCwd);
      return stagingDir !== null && (allowRoot || realFilePath === join(stagingDir, INDEX_HTML));
    });
  } catch {
    return null;
  }
}
//@ chunk-pjmrd77p.js:17127-17503 placement
/**
 * 以 O_NOFOLLOW 打开文件，要求普通单链接且不超过 Artifact 大小上限，经 /proc/self/fd 取真实路径并通过 n 校验后读出全部字节，返回 {path, sha256, size}；任何异常返回 null。
 */
async function readSingleLinkFile(filePath, acceptPath) {
  try {
    let handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      let stats = await handle.stat({
        bigint: true,
      });
      if (!stats.isFile() || stats.nlink !== 1n || stats.size > BigInt(MAX_ARTIFACT_BYTES)) return null;
      let realPath = await readlink(`/proc/self/fd/${handle.fd}`);
      if (!acceptPath(realPath)) return null;
      let exactBytes = await readExactBytes(handle, Number(stats.size));
      return exactBytes === null
        ? null
        : {
            path: realPath,
            sha256: computeContentHash(exactBytes),
            size: exactBytes.length,
          };
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-pjmrd77p.js:17503-17962 placement
/**
 * 校验发布暂存目录中的 files 来源：必须在同一暂存目录内、不含绝对路径或 ..，逐个安全读取并累计大小不超过请求预算，返回 {dir, admitted}。
 */
async function admitStagedFiles(path, totalBytes, root, files, cwd) {
  try {
    let stagingDir = publishStagingDir(path, await realpath(cwd));
    if (stagingDir === null || (await realpath(resolve(cwd, root))) !== stagingDir) return null;
    let runningBytes = totalBytes;
    let admitted = new Map();
    for (let [key, value] of Object.entries(files ?? {})) {
      if (value === null) continue;
      let relativePath = typeof value === "string" ? value : value.from;
      if (isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) return null;
      let singleLinkFile = await readSingleLinkFile(resolve(stagingDir, relativePath), (path) =>
        path.startsWith(stagingDir + sep),
      );
      if (singleLinkFile === null || (runningBytes += singleLinkFile.size) > MANIFEST_REQUEST_BUDGET)
        return null;
      admitted.set(key.normalize("NFC"), {
        path: singleLinkFile.path,
        sha256: singleLinkFile.sha256,
      });
    }
    return {
      dir: stagingDir,
      admitted,
    };
  } catch {
    return null;
  }
}
//@ chunk-pjmrd77p.js:17962-19764 placement
function runArtifactCall(tools, call) {
  if (call.verb === "open") {
    let parsed = ARTIFACT_CALL_SCHEMAS().safeParse(call.args);
    if (!parsed.success)
      return {
        invalid: formatZodValidationError(ARTIFACT_CALL, parsed.error),
      };
    let toolByName = findToolByName(tools, ARTIFACT_TOOL_NAME);
    return toolByName === undefined
      ? {
          unavailable: "the Artifact tool is not available in this session",
        }
      : {
          tool: toolByName,
          input: {
            action: "open",
            url: parsed.data.url,
          },
        };
  }
  if (call.verb === "read_file" || call.verb === "list_files") {
    let parsed = (call.verb === "read_file" ? assetPathReadSchema() : ARTIFACT_CALL_SCHEMAS()).safeParse(
      call.args,
    );
    if (!parsed.success)
      return {
        invalid: formatZodValidationError(ARTIFACT_CALL, parsed.error),
      };
    let toolByName = findToolByName(tools, ARTIFACT_TOOL_NAME);
    if (toolByName === undefined)
      return {
        unavailable: "the Artifact tool is not available in this session",
      };
    let withAction = {
      ...parsed.data,
      action: call.verb,
    };
    return {
      tool: toolByName,
      input: isArtifactToolsetSplit() ? collapseArtifactAction(withAction) : withAction,
    };
  }
  if (call.verb === "upload_asset" || call.verb === "read_asset") {
    let parsed = (call.verb === "upload_asset" ? filePathReadSchema() : assetIdReadSchema()).safeParse(
      call.args,
    );
    if (!parsed.success)
      return {
        invalid: formatZodValidationError(ARTIFACT_CALL, parsed.error),
      };
    if (!isArtifactAssetsEnabled())
      return {
        unavailable:
          "the Artifact tool's asset verbs are off in this session: tell the user assets cannot be uploaded or downloaded here",
      };
    let toolByName = findToolByName(tools, ARTIFACT_TOOL_NAME);
    if (toolByName === undefined)
      return {
        unavailable: "the Artifact tool is not available in this session",
      };
    let withAction = {
      ...parsed.data,
      action: call.verb,
    };
    return {
      tool: toolByName,
      input: isArtifactToolsetSplit() ? collapseArtifactAction(withAction) : withAction,
    };
  }
  if (call.verb === "publish") {
    let normalized = normalizeArtifactInput(call.args);
    let parsed = publishInputSchema().safeParse(normalized === null ? call.args : normalized.input);
    if (!parsed.success)
      return {
        invalid: formatZodValidationError(ARTIFACT_CALL, parsed.error),
      };
    let toolByName = findToolByName(tools, ARTIFACT_TOOL_NAME);
    return toolByName === undefined
      ? {
          unavailable: "the Artifact tool is not available in this session",
        }
      : {
          tool: toolByName,
          input: {
            ...parsed.data,
          },
        };
  }
  let parsed = dbCallArgsSchema().safeParse(call.args);
  if (!parsed.success)
    return {
      invalid: formatZodValidationError(ARTIFACT_CALL, parsed.error),
    };
  if (!isArtifactDbEnabled())
    return {
      unavailable: "the Artifact tool's database verbs are off in this session",
    };
  let liveState = getLiveState();
  liveState.frozenDbStrReplace ??= isArtifactDbStrReplaceEnabled();
  let input = liveState.frozenDbStrReplace ? parsed.data : stripIfVersion(parsed.data);
  let toolByName = findToolByName(tools, ARTIFACT_DATA_TOOL_NAME);
  if (toolByName !== undefined)
    return {
      tool: toolByName,
      input: {
        ...input,
        action: call.verb,
      },
    };
  let toolByName_2 = findToolByName(tools, ARTIFACT_TOOL_NAME);
  if (toolByName_2 === undefined)
    return {
      unavailable: "the Artifact tool is not available in this session",
    };
  return {
    tool: toolByName_2,
    input: {
      ...input,
      action: DB_READ_OP_SET.has(call.verb) ? "read_db" : "write_db",
      db_op: call.verb,
    },
  };
}
//@ chunk-pjmrd77p.js:19764-20309 placement
/**
 * read_files 动作：对 paths 中每个路径依次执行 read_file 发布调用，汇总保存位置，返回 {files_read}；任一失败返回该路径的错误。
 */
async function readFilesCall(call, context, isStillWanted) {
  let parsed = assetPathsReadSchema().safeParse(call.args);
  if (!parsed.success)
    return errorResult("invalid_args", formatZodValidationError(ARTIFACT_CALL, parsed.error));
  let filesRead = [];
  let cleanups = [];
  for (let path of parsed.data.paths) {
    let result = await runArtifactPublish(
      {
        ...call,
        verb: "read_file",
        args: {
          url: parsed.data.url,
          path,
        },
      },
      context,
      isStillWanted,
      cleanups,
    );
    if (!result.ok)
      return errorResult(
        result.error.code,
        `${jsonStringify(path)}: ${result.error.message}`,
        result.error.reason,
      );
    let parsedRead = fileReadResultSchema().safeParse(result.result);
    if (!parsedRead.success)
      return errorResult(
        "tool_error",
        `${jsonStringify(path)}: the read did not say where it saved the file`,
      );
    let { content, content_scrubbed: contentScrubbed, ...rest } = parsedRead.data.file_read;
    filesRead.push(rest);
  }
  for (let cleanup of cleanups) cleanup();
  return {
    ok: true,
    result: {
      files_read: filesRead,
    },
  };
}
//@ chunk-pjmrd77p.js:20309-24187 placement
/**
 * Artifact 发布调用：读取文件、上传资源并发布。
 */
async function runArtifactPublish(call, context, isStillWanted, cleanups) {
  if (call.verb === "read_files") return readFilesCall(call, context, isStillWanted);
  let { toolUseContext, canUseTool, parentMessage } = context;
  let resolution = runArtifactCall(toolUseContext.options.tools, call);
  if ("unavailable" in resolution) return errorResult("unavailable", resolution.unavailable);
  if ("invalid" in resolution) return errorResult("invalid_args", resolution.invalid);
  let stagedPage;
  let admittedFiles;
  if (call.verb === "publish") {
    let { file_path: filePath, root, files } = resolution.input;
    let page =
      root === undefined && files !== undefined
        ? null
        : await readStagedPage(filePath, context.cwd, root !== undefined);
    let filesAdmission =
      page === null || root === undefined
        ? undefined
        : await admitStagedFiles(page.path, page.size, root, files, context.cwd);
    if (page === null || filesAdmission === null)
      return errorResult(
        "invalid_args",
        root === undefined && files === undefined
          ? "file_path must be a page the script wrote in its own publish directory under the working directory"
          : `file_path and every local source in files must be a regular file the script wrote inside its own publish folder (files.dir(); root must be that folder, and files cannot be sent without it), named by a relative path with no "..", at most ${MAX_ARTIFACT_BYTES >> 20} MiB each and ${MANIFEST_REQUEST_BUDGET >> 20} MiB in one publish`,
      );
    stagedPage = page;
    resolution.input.file_path = page.path;
    if (filesAdmission !== undefined) {
      resolution.input.root = filesAdmission.dir;
      admittedFiles = filesAdmission.admitted;
    }
  }
  if (call.verb === "upload_asset") {
    let stagedPage_2 = await readStagedPage(String(resolution.input.file_path), context.cwd, true);
    if (stagedPage_2 === null)
      return errorResult(
        "invalid_args",
        `file_path must be a regular file the script wrote inside its own publish folder (files.dir(); copy a file from elsewhere into it first), at most ${MAX_ARTIFACT_BYTES >> 20} MiB`,
      );
    stagedPage = stagedPage_2;
    resolution.input.file_path = stagedPage_2.path;
  }
  let incompleteResult = call.verb === "upload_asset" ? UPLOAD_INCOMPLETE : PUBLISH_INCOMPLETE;
  let { tool } = resolution;
  let toolUseId = `artifact_repl_${randomUUID()}`;
  let verifiedFlag = {
    value: false,
  };
  let innerToolUseContext = {
    ...toolUseContext,
    toolUseId,
    permissionPhase: undefined,
    autoModeClassified: undefined,
    ...(codeModeAccepted() && {
      autoModeDenialLimitRun: undefined,
      autoModeScriptCheckDeferred: undefined,
    }),
    ...(context.abortController && {
      abortController: context.abortController,
    }),
    ...(stagedPage && {
      publishSourceSha256: stagedPage.sha256,
      publishSourceVerified: verifiedFlag,
    }),
    ...(admittedFiles && {
      publishFilesSha256: admittedFiles,
    }),
  };
  let parsedInput = tool.inputSchema.safeParse(resolution.input);
  if (!parsedInput.success)
    return errorResult("invalid_args", formatZodValidationError(tool.name, parsedInput.error));
  let validateInput = (candidate) => tool.validateInput?.(candidate, innerToolUseContext);
  let validation = await validateInput(parsedInput.data);
  if (validation?.result === false) return errorResult("validation", validation.message);
  let toolInput = parsedInput.data;
  let hookPermissionResult;
  let stopReason;
  for await (let hookResult of runPreToolUseHooks(
    toolUseContext,
    tool,
    toolInput,
    toolUseId,
    parentMessage.message.id,
    parentMessage.requestId,
    undefined,
    undefined,
    validateInput,
  ))
    if (hookResult.type === "hookPermissionResult") hookPermissionResult = hookResult.hookPermissionResult;
    else if (hookResult.type === "hookUpdatedInput") toolInput = hookResult.updatedInput;
    else if (hookResult.type === "stopReason") stopReason = hookResult.stopReason;
    else if (hookResult.type === "stop")
      return stagedPage !== undefined
        ? incompleteResult
        : errorResult("denied", hookResult.stopReason ?? stopReason ?? "Blocked by PreToolUse hook");
  let permissionRound = startPermissionRound(toolUseContext, toolUseId, tool.name);
  let permissionResult = await resolvePermissionDecisionForCall(
    hookPermissionResult,
    tool,
    toolInput,
    {
      ...innerToolUseContext,
      permissionRound,
    },
    canUseTool,
    parentMessage,
    toolUseId,
  ).catch((error) => {
    takePermissionRecord(toolUseContext, toolUseId, permissionRound);
    throw error;
  });
  let permissionPhase = takePermissionRecord(toolUseContext, toolUseId, permissionRound) ?? {};
  if (permissionResult.decision.behavior !== "allow") {
    clearToolUsePermissionState(toolUseContext.session, toolUseId);
    toolUseContext.onPermissionDenial?.(tool, toolUseId, permissionResult.input);
    if (stagedPage !== undefined) return incompleteResult;
    return errorResult(
      "denied",
      permissionResult.decision.behavior === "deny"
        ? (permissionResult.decision.message ?? "Permission denied")
        : "Permission denied",
    );
  }
  let toolInput_2 =
    permissionResult.decision.updatedInput !== undefined &&
    !isEmptyObject(permissionResult.decision.updatedInput)
      ? permissionResult.decision.updatedInput
      : permissionResult.input;
  if (!isStillWanted()) {
    clearToolUsePermissionState(toolUseContext.session, toolUseId);
    return errorResult("unavailable", "the caller went away before the call ran");
  }
  let now = Date.now();
  recordToolUsed(tool.name);
  context.onToolCalled?.(tool.name);
  try {
    let toolResult = await tool.call(
      toolInput_2,
      {
        ...innerToolUseContext,
        permissionPhase,
        innerCall: true,
      },
      canUseTool,
      parentMessage,
      undefined,
      {
        userModified: permissionResult.decision.userModified ?? false,
      },
    );
    let data = toolResult.data;
    let withheldWatch = watchWithheldResults(toolUseId);
    let delivered = false;
    try {
      for await (let hookResult of runPostToolUseHooks(
        toolUseContext,
        tool,
        toolUseId,
        parentMessage.message.id,
        toolInput_2,
        toolResult.data,
        parentMessage.requestId,
        undefined,
        undefined,
        Date.now() - now,
      ))
        if (
          "updatedToolOutput" in hookResult &&
          tool.outputSchema?.safeParse(hookResult.updatedToolOutput)?.success !== false
        )
          data = hookResult.updatedToolOutput;
    } finally {
      delivered = releaseWithheldWatch(toolUseId, withheldWatch);
    }
    if (delivered) return errorResult("tool_error", withheldResultText(tool.name));
    if (call.verb === "read_file") {
      let validateInput = fileReadResultSchema().safeParse(data);
      if (validateInput.success && "title" in validateInput.data.file_read) {
        let { title, ...stagedPage } = validateInput.data.file_read;
        data = {
          ...data,
          file_read: stagedPage,
        };
      }
    }
    if (
      call.verb === "read_file" &&
      toolResult.afterResultCommitted &&
      fileReadResultSchema().safeParse(toolResult.data).success
    )
      if (cleanups) cleanups.push(toolResult.afterResultCommitted);
      else toolResult.afterResultCommitted();
    return {
      ok: true,
      result: data,
    };
  } catch (error) {
    for await (let hookPermissionResult of runPostToolUseFailureHooks(
      toolUseContext,
      tool,
      toolUseId,
      parentMessage.message.id,
      toolInput_2,
      errorMessage(error),
      isAbortError(error),
      parentMessage.requestId,
      undefined,
      undefined,
      Date.now() - now,
    ));
    if (stagedPage !== undefined && !verifiedFlag.value) return incompleteResult;
    if (
      call.verb === "publish" &&
      error instanceof ArtifactInputError &&
      error.reasonCode?.startsWith("path_pin_") === true &&
      hasAfterResultCommitted(error)
    )
      error.afterResultCommitted();
    return errorResult(
      "tool_error",
      errorMessage(error),
      error instanceof ArtifactInputError ? error.reasonCode : undefined,
    );
  } finally {
    clearToolUsePermissionState(toolUseContext.session, toolUseId);
  }
}
//@ chunk-pjmrd77p.js:24187-24692 placement
/**
 * see 语句的常量：类型名、数量与大小上限、拒绝说明文案，以及 see 行/图片的 schema 与判定函数。
 */
var SEE_KIND = "see";
var IMAGE = "image";
var MAX_SEE_CALLS = 4;
var MAX_SEE_IMAGES = 4;
var MAX_SEE_TEXT_CHARS = 2000;
var MAX_SEE_IMAGE_BYTES = 750000;
var MAX_SEE_TOTAL_IMAGE_BYTES = 700000;
var NOT_PNG_OR_JPEG = "not a PNG or JPEG";
var TOO_MANY_IMAGES_REFUSAL = `at most ${MAX_SEE_IMAGES} images per result`;
var TOO_MANY_SEE_CALLS_REFUSAL = `at most ${MAX_SEE_CALLS} claude.see() calls per result`;
var BAD_SEE_LINE = "not a valid see line";
var UNPROCESSABLE_SEE = "could not be processed";
var seeLineSchema = DoctorLazy(() =>
  zodStrictObject({
    type: literal(SEE_KIND),
    id: stringSchema(),
    text: stringSchema(),
  }),
);
var seeImageSchema = DoctorLazy(() =>
  zodStrictObject({
    type: literal(IMAGE),
    id: stringSchema(),
    media_type: stringSchema(),
    data: stringSchema(),
    label: stringSchema().optional(),
  }),
);
var isSupportedImageMediaType = (mediaType) => mediaType === "image/png" || mediaType === "image/jpeg";
var refusedResult = (message) => ({
  ok: false,
  error: {
    code: "refused",
    message,
  },
});
var seeEntryKind = (value) =>
  typeof value === "object" && value !== null && "type" in value ? value.type : undefined;
//@ chunk-pjmrd77p.js:24692-24741 placement
/**
 * 判断条目是否是 see 或 image 类型。
 */
function isSeeEntry(value) {
  let kind = seeEntryKind(value);
  return kind === SEE_KIND || kind === IMAGE;
}
//@ chunk-pjmrd77p.js:24741-24848 placement
function truncateDisplayText(text) {
  let kept = truncateToLength(text, MAX_SEE_TEXT_CHARS);
  return {
    text: kept
      .split(
        `
`,
      )
      .map(normalizeForDisplay)
      .join(
        `
`,
      )
      .trim(),
    dropped: text.length - kept.length,
  };
}
//@ chunk-pjmrd77p.js:24848-25244 placement
/**
 * 解析页面发来的一行图片：校验 id、大小上限与声明/实际媒体类型（只接受支持的图片格式），返回清洗后的标签、类型与字节；否则返回 refused 原因。
 */
function parseImageLine(line, idPattern) {
  let parsed = seeImageSchema().safeParse(line);
  if (!parsed.success || !idPattern.test(parsed.data.id))
    return {
      refused: "not a valid image line",
    };
  let { media_type: mediaType, data, label } = parsed.data;
  if (data.length > Math.ceil(MAX_SEE_IMAGE_BYTES / 3) * 4)
    return {
      refused: `larger than ${MAX_SEE_IMAGE_BYTES} bytes`,
    };
  if (!isSupportedImageMediaType(mediaType))
    return {
      refused: NOT_PNG_OR_JPEG,
    };
  let buffer = Buffer.from(data, "base64");
  let actualType = sniffImageMediaType(buffer);
  if (!isSupportedImageMediaType(actualType))
    return {
      refused: NOT_PNG_OR_JPEG,
    };
  return {
    label:
      sanitizeDisplayText(label ?? "", {
        maxCodeUnits: 80,
      }) || "image",
    media_type: actualType,
    bytes: buffer,
  };
}
//@ chunk-pjmrd77p.js:25244-25736 placement (2.1.88 match: buildImageContentBlocks, 0.454)
/**
 * 图片压缩为 PNG/JPEG base64，失败或过大返回 {refused}。归属存疑（某工具的图片收集）。
 */
async function encodeImageForAttachment(data, mediaType, limits) {
  let resized = await maybeResizeAndDownsampleImageBlock({
    data,
    mediaType,
    limits,
    allowWebp: false,
  }).catch(() => {
    return;
  });
  if (resized === undefined)
    return {
      refused: UNPROCESSABLE_SEE,
    };
  let { block } = resized;
  if (block.type === "text") {
    let replaced = block.text.replace(/^\[|\]$/g, "");
    return {
      refused:
        sanitizeDisplayText(replaced, {
          maxCodeUnits: 200,
        }) || UNPROCESSABLE_SEE,
    };
  }
  if (block.source.type !== "base64")
    return {
      refused: UNPROCESSABLE_SEE,
    };
  let buffer = Buffer.from(block.source.data, "base64");
  let actualType = sniffImageMediaType(buffer);
  if (!isSupportedImageMediaType(actualType))
    return {
      refused: UNPROCESSABLE_SEE,
    };
  if (buffer.length > MODEL_COPY_IMAGE_BYTES)
    return {
      refused: "too large after recompression",
    };
  return {
    media_type: actualType,
    data: block.source.data,
    size: buffer.length,
  };
}
//@ chunk-pjmrd77p.js:25736-27220 placement
/**
 * 收集文本与图片（最多 4 张），attach 时转成内容块。归属存疑。
 */
function createImageCollector(idPattern) {
  let groups = [];
  let images = [];
  let overflowImages = 0;
  let refusedSeeCounts = new Map();
  let refuse = (message) => {
    refusedSeeCounts.set(message, (refusedSeeCounts.get(message) ?? 0) + 1);
    return refusedResult(message);
  };
  return {
    take(entry) {
      if (seeEntryKind(entry) === SEE_KIND) {
        let parsed = seeLineSchema().safeParse(entry);
        if (!parsed.success || !idPattern.test(parsed.data.id)) return refuse(BAD_SEE_LINE);
        if (groups.length >= MAX_SEE_CALLS) return refuse(TOO_MANY_SEE_CALLS_REFUSAL);
        groups.push(truncateDisplayText(parsed.data.text));
        return {
          ok: true,
          result: {
            index: groups.length,
          },
        };
      }
      if (images.length >= MAX_SEE_IMAGES) {
        overflowImages++;
        return refusedResult(TOO_MANY_IMAGES_REFUSAL);
      }
      if (groups.length === 0)
        groups.push({
          text: "",
          dropped: 0,
        });
      let image = {
        ...parseImageLine(entry, idPattern),
        group: groups.length - 1,
      };
      images.push(image);
      return "refused" in image
        ? refusedResult(image.refused)
        : {
            ok: true,
            result: {
              index: images.length,
            },
          };
    },
    kept: () => ({
      texts: countWhere(groups, (group) => group.text !== ""),
      images: countWhere(images, (image) => "bytes" in image),
    }),
    textChars: () => groups.reduce((acc, group) => acc + group.text.length, 0),
    async attach(limits) {
      let refusals = [];
      let mapped = groups.map(() => []);
      let mapped_2 = groups.map(() => []);
      let noteRefusal = (index, refused) => void refusals.push(`image ${index} refused: ${refused}`);
      let totalBytes = 0;
      for (let [index, image] of images.entries()) {
        let displayIndex = index + 1;
        if ("refused" in image) {
          noteRefusal(displayIndex, image.refused);
          continue;
        }
        if (limits === undefined) continue;
        let encoded = await encodeImageForAttachment(image.bytes, image.media_type, limits);
        if ("refused" in encoded) {
          noteRefusal(displayIndex, encoded.refused);
          continue;
        }
        if (totalBytes + encoded.size > MAX_SEE_TOTAL_IMAGE_BYTES) {
          noteRefusal(displayIndex, "over the 700 KB total");
          continue;
        }
        totalBytes += encoded.size;
        mapped[image.group]?.push(`image ${displayIndex}: ${image.label}`);
        mapped_2[image.group]?.push({
          media_type: encoded.media_type,
          data: encoded.data,
        });
      }
      if (overflowImages > 0) {
        let firstRefused = MAX_SEE_IMAGES + 1;
        refusals.push(
          overflowImages === 1
            ? `image ${firstRefused} refused: ${TOO_MANY_IMAGES_REFUSAL}`
            : `images ${firstRefused} to ${MAX_SEE_IMAGES + overflowImages} refused: ${TOO_MANY_IMAGES_REFUSAL}`,
        );
      }
      for (let [index, count] of refusedSeeCounts)
        refusals.push(`${count} claude.see() ${count === 1 ? "call" : "calls"} refused: ${index}`);
      let output = [];
      if (limits !== undefined)
        for (let [index, group] of groups.entries()) {
          let filtered = [
            group.text === "" ? undefined : `see ${index + 1}: ${group.text}`,
            ...(mapped[index] ?? []),
          ].filter((part) => part !== undefined);
          if (filtered.length > 0)
            output.push({
              dropped: group.text === "" ? 0 : group.dropped,
              body: filtered.join(`
`),
              images: mapped_2[index] ?? [],
            });
        }
      return {
        lines: refusals,
        groups: output,
      };
    },
  };
}
export {
  createImageCollector,
  CALL_ID_RE,
  errorResult,
  MAX_CALL_RESULT_BYTES,
  isSeeEntry,
  parseArtifactCallArgs,
  runArtifactPublish,
  APPIFACT_ARTIFACT,
  APPIFACT_ARTIFACT_URL,
  readArtifactIdArg,
  MAX_SEE_TEXT_CHARS,
};
