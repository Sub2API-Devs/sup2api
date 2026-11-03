/**
 * tools/ArtifactTool/artifactCall.ts
 *
 * 2.1.316 新增。Artifact 调用（publish、upload_asset）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tmx5d02z.js (23)
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
  u,
  looseObject,
  string,
  zodStrictObject,
  literal,
  _enum,
  record,
  unknown,
  E,
  array,
  union,
  zg,
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
import { Ph } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { maybeResizeAndDownsampleImageBlock } from "../../utils/imageResizer.js";
import { MODEL_COPY_IMAGE_BYTES } from "../../utils/truncateGraphemes.js";
import { count } from "../../utils/collections.js";

//@ chunk-tmx5d02z.js:12695-12971 placement
function parseArtifactId(e) {
  let lower = e.trim().toLowerCase();
  if (ARTIFACT_SLUG_RE.test(lower))
    return {
      id: lower,
    };
  let artifactUrlAnyCase = parseArtifactUrlAnyCase(e.trim());
  if (artifactUrlAnyCase !== null && ARTIFACT_SLUG_RE.test(artifactUrlAnyCase.slug.toLowerCase()))
    return {
      id: artifactUrlAnyCase.slug.toLowerCase(),
    };
  return {
    error: "artifact must be an artifact URL (https://claude.ai/code/artifact/<id>) or a bare artifact id",
  };
}
//@ chunk-tmx5d02z.js:12971-13076 placement
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
//@ chunk-tmx5d02z.js:13076-13130 placement
var APPIFACT_ARTIFACT = "APPIFACT_ARTIFACT";
var APPIFACT_ARTIFACT_URL = "APPIFACT_ARTIFACT_URL";
//@ chunk-tmx5d02z.js:13480-13868 placement
/**
 * artifact_call 页面调用的协议常量：动词集合（数据库读写、读文件、资源、publish/open）、调用 id 格式、结果大小上限与严格 schema。
 */
var fileReadResultSchema = DoctorLazy(() =>
  u({
    file_read: looseObject({
      path: string(),
      saved_to: string(),
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
    id: string().regex(CALL_ID_RE),
    verb: _enum(ARTIFACT_CALL_VERBS),
    args: record(string(), unknown()),
  }),
);
var CALL_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
//@ chunk-tmx5d02z.js:13868-13963 placement
/**
 * 校验 artifact_call 的参数：成功返回 frame，失败返回格式化的校验错误。
 */
function parseArtifactCallArgs(e) {
  let n = artifactCallSchema().safeParse(e);
  return n.success
    ? {
        frame: n.data,
      }
    : {
        invalid: formatZodValidationError(ARTIFACT_CALL, n.error),
      };
}
//@ chunk-tmx5d02z.js:13963-14340 placement
/**
 * artifact_call 数据库动作的参数 schema：url、collection、doc_id、data、query、if_version，以及最多 100 条的 writes 批量写。
 */
var dbCallArgsSchema = DoctorLazy(() =>
  zodStrictObject({
    url: string().max(2048),
    collection: string().max(2048).optional(),
    doc_id: string().max(2048).optional(),
    data: record(string(), unknown()).optional(),
    query: record(string(), unknown()).optional(),
    if_version: E().int().positive().optional(),
    writes: array(
      zodStrictObject({
        op: string().max(16),
        collection: string().max(2048),
        doc_id: string().max(2048),
        data: record(string(), unknown()).optional(),
        if_version: E().int().positive().optional(),
      }),
    )
      .max(100)
      .optional(),
  }),
);
//@ chunk-tmx5d02z.js:14340-14448 placement
function stripIfVersion({ if_version: ifVersion, writes, ...r }) {
  return writes === undefined
    ? r
    : {
        ...r,
        writes: writes.map(({ if_version: ifVersion, ...a }) => a),
      };
}
//@ chunk-tmx5d02z.js:14448-15408 placement
/**
 * artifact_call 各组参数 schema（asset 路径/批量、file_path、asset_id 与发布输入）。
 */
var ARTIFACT_CALL_SCHEMAS = DoctorLazy(() =>
  zodStrictObject({
    url: string().max(2048),
  }),
);
var assetPathReadSchema = DoctorLazy(() =>
  zodStrictObject({
    url: string().max(2048),
    path: string()
      .min(1)
      .max(512)
      .refine((e) => !ASSET_ID_RE.test(e), {
        message: "path looks like an asset id; read_file takes a published path",
      }),
  }),
);
var assetPathsReadSchema = DoctorLazy(() =>
  zodStrictObject({
    url: string().max(2048),
    paths: array(assetPathReadSchema().shape.path).min(1).max(MAX_CALL_ID_LENGTH),
  }),
);
var filePathReadSchema = DoctorLazy(() =>
  zodStrictObject({
    url: string().max(2048),
    file_path: string().min(1).max(4096),
  }),
);
var assetIdReadSchema = DoctorLazy(() =>
  zodStrictObject({
    url: string().max(2048),
    asset_id: string().regex(ASSET_ID_RE),
  }),
);
var publishInputSchema = DoctorLazy(() =>
  zodStrictObject({
    file_path: string().max(4096),
    root: string().min(1).max(1024).optional(),
    files: record(
      string().min(1).max(512),
      union([
        string().min(1).max(512),
        zodStrictObject({
          from: string().min(1).max(512),
          contentType: string().optional(),
        }),
        zg(),
      ]),
    )
      .refine((e) => Object.keys(e).length < MAX_URL_SEGMENT_CHARS, {
        message: `files lists more than ${MAX_URL_SEGMENT_CHARS - 1} entries`,
      })
      .optional(),
    url: string().max(2048).optional(),
    title: string().max(512).optional(),
    favicon: string().min(1).max(32).optional(),
    icon: string().max(40).optional(),
    capabilities: record(string(), unknown()).optional(),
    contract: string().max(32).optional(),
    session_context: string().max(20000).optional(),
    description: string().max(1000).optional(),
  }),
);
//@ chunk-tmx5d02z.js:15408-15504 placement
/**
 * 生成失败结果对象（错误码、消息与可选原因码）。
 */
function errorResult(code, message, r) {
  return {
    ok: false,
    error:
      r === undefined
        ? {
            code,
            message,
          }
        : {
            code,
            message,
            reason: r,
          },
  };
}
//@ chunk-tmx5d02z.js:15504-15716 placement
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
//@ chunk-tmx5d02z.js:15716-15818 placement
function publishStagingDir(e, n) {
  let [r, ...i] = relative(n, e).split(sep);
  return r !== undefined && i.length > 0 && APPIFACT_PUBLISH_DIR_RE.test(r) ? join(n, r) : null;
}
//@ chunk-tmx5d02z.js:15818-15968 placement
async function readStagedPage(e, cwd, r = false) {
  try {
    let i = await realpath(cwd);
    return await readSingleLinkFile(resolve(cwd, e), (a) => {
      let c = publishStagingDir(a, i);
      return c !== null && (r || a === join(c, INDEX_HTML));
    });
  } catch {
    return null;
  }
}
//@ chunk-tmx5d02z.js:15968-16344 placement
/**
 * 以 O_NOFOLLOW 打开文件，要求普通单链接且不超过 Artifact 大小上限，经 /proc/self/fd 取真实路径并通过 n 校验后读出全部字节，返回 {path, sha256, size}；任何异常返回 null。
 */
async function readSingleLinkFile(e, n) {
  try {
    let r = await open(e, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      let stats = await r.stat({
        bigint: true,
      });
      if (!stats.isFile() || stats.nlink !== 1n || stats.size > BigInt(MAX_ARTIFACT_BYTES)) return null;
      let a = await readlink(`/proc/self/fd/${r.fd}`);
      if (!n(a)) return null;
      let exactBytes = await readExactBytes(r, Number(stats.size));
      return exactBytes === null
        ? null
        : {
            path: a,
            sha256: computeContentHash(exactBytes),
            size: exactBytes.length,
          };
    } finally {
      await r.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-tmx5d02z.js:16344-16802 placement
/**
 * 校验发布暂存目录中的 files 来源：必须在同一暂存目录内、不含绝对路径或 ..，逐个安全读取并累计大小不超过请求预算，返回 {dir, admitted}。
 */
async function admitStagedFiles(path, n, root, files, cwd) {
  try {
    let c = publishStagingDir(path, await realpath(cwd));
    if (c === null || (await realpath(resolve(cwd, root))) !== c) return null;
    let s = n;
    let l = new Map();
    for (let [key, value] of Object.entries(files ?? {})) {
      if (value === null) continue;
      let z = typeof value === "string" ? value : value.from;
      if (isAbsolute(z) || z.split(/[\\/]/).includes("..")) return null;
      let singleLinkFile = await readSingleLinkFile(resolve(c, z), (y) => y.startsWith(c + sep));
      if (singleLinkFile === null || (s += singleLinkFile.size) > MANIFEST_REQUEST_BUDGET) return null;
      l.set(key.normalize("NFC"), {
        path: singleLinkFile.path,
        sha256: singleLinkFile.sha256,
      });
    }
    return {
      dir: c,
      admitted: l,
    };
  } catch {
    return null;
  }
}
//@ chunk-tmx5d02z.js:16802-18604 placement
function runArtifactCall(tools, n) {
  if (n.verb === "open") {
    let l = ARTIFACT_CALL_SCHEMAS().safeParse(n.args);
    if (!l.success)
      return {
        invalid: formatZodValidationError(ARTIFACT_CALL, l.error),
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
            url: l.data.url,
          },
        };
  }
  if (n.verb === "read_file" || n.verb === "list_files") {
    let l = (n.verb === "read_file" ? assetPathReadSchema() : ARTIFACT_CALL_SCHEMAS()).safeParse(n.args);
    if (!l.success)
      return {
        invalid: formatZodValidationError(ARTIFACT_CALL, l.error),
      };
    let toolByName = findToolByName(tools, ARTIFACT_TOOL_NAME);
    if (toolByName === undefined)
      return {
        unavailable: "the Artifact tool is not available in this session",
      };
    let h = {
      ...l.data,
      action: n.verb,
    };
    return {
      tool: toolByName,
      input: isArtifactToolsetSplit() ? collapseArtifactAction(h) : h,
    };
  }
  if (n.verb === "upload_asset" || n.verb === "read_asset") {
    let l = (n.verb === "upload_asset" ? filePathReadSchema() : assetIdReadSchema()).safeParse(n.args);
    if (!l.success)
      return {
        invalid: formatZodValidationError(ARTIFACT_CALL, l.error),
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
    let h = {
      ...l.data,
      action: n.verb,
    };
    return {
      tool: toolByName,
      input: isArtifactToolsetSplit() ? collapseArtifactAction(h) : h,
    };
  }
  if (n.verb === "publish") {
    let l = normalizeArtifactInput(n.args);
    let b = publishInputSchema().safeParse(l === null ? n.args : l.input);
    if (!b.success)
      return {
        invalid: formatZodValidationError(ARTIFACT_CALL, b.error),
      };
    let toolByName = findToolByName(tools, ARTIFACT_TOOL_NAME);
    return toolByName === undefined
      ? {
          unavailable: "the Artifact tool is not available in this session",
        }
      : {
          tool: toolByName,
          input: {
            ...b.data,
          },
        };
  }
  let r = dbCallArgsSchema().safeParse(n.args);
  if (!r.success)
    return {
      invalid: formatZodValidationError(ARTIFACT_CALL, r.error),
    };
  if (!isArtifactDbEnabled())
    return {
      unavailable: "the Artifact tool's database verbs are off in this session",
    };
  let liveState = getLiveState();
  liveState.frozenDbStrReplace ??= isArtifactDbStrReplaceEnabled();
  let a = liveState.frozenDbStrReplace ? r.data : stripIfVersion(r.data);
  let toolByName = findToolByName(tools, ARTIFACT_DATA_TOOL_NAME);
  if (toolByName !== undefined)
    return {
      tool: toolByName,
      input: {
        ...a,
        action: n.verb,
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
      ...a,
      action: DB_READ_OP_SET.has(n.verb) ? "read_db" : "write_db",
      db_op: n.verb,
    },
  };
}
//@ chunk-tmx5d02z.js:18604-19149 placement
/**
 * read_files 动作：对 paths 中每个路径依次执行 read_file 发布调用，汇总保存位置，返回 {files_read}；任一失败返回该路径的错误。
 */
async function readFilesCall(e, n, r) {
  let i = assetPathsReadSchema().safeParse(e.args);
  if (!i.success) return errorResult("invalid_args", formatZodValidationError(ARTIFACT_CALL, i.error));
  let a = [];
  let c = [];
  for (let path of i.data.paths) {
    let l = await runArtifactPublish(
      {
        ...e,
        verb: "read_file",
        args: {
          url: i.data.url,
          path,
        },
      },
      n,
      r,
      c,
    );
    if (!l.ok) return errorResult(l.error.code, `${jsonStringify(path)}: ${l.error.message}`, l.error.reason);
    let b = fileReadResultSchema().safeParse(l.result);
    if (!b.success)
      return errorResult(
        "tool_error",
        `${jsonStringify(path)}: the read did not say where it saved the file`,
      );
    let { content, content_scrubbed: contentScrubbed, ...m } = b.data.file_read;
    a.push(m);
  }
  for (let s of c) s();
  return {
    ok: true,
    result: {
      files_read: a,
    },
  };
}
//@ chunk-tmx5d02z.js:19149-22956 placement
/**
 * Artifact 发布调用：读取文件、上传资源并发布。
 */
async function runArtifactPublish(e, n, r, i) {
  if (e.verb === "read_files") return readFilesCall(e, n, r);
  let { toolUseContext, canUseTool, parentMessage } = n;
  let l = runArtifactCall(toolUseContext.options.tools, e);
  if ("unavailable" in l) return errorResult("unavailable", l.unavailable);
  if ("invalid" in l) return errorResult("invalid_args", l.invalid);
  let b;
  let h;
  if (e.verb === "publish") {
    let { file_path: filePath, root, files } = l.input;
    let K =
      root === undefined && files !== undefined
        ? null
        : await readStagedPage(filePath, n.cwd, root !== undefined);
    let H =
      K === null || root === undefined
        ? undefined
        : await admitStagedFiles(K.path, K.size, root, files, n.cwd);
    if (K === null || H === null)
      return errorResult(
        "invalid_args",
        root === undefined && files === undefined
          ? "file_path must be a page the script wrote in its own publish directory under the working directory"
          : `file_path and every local source in files must be a regular file the script wrote inside its own publish folder (files.dir(); root must be that folder, and files cannot be sent without it), named by a relative path with no "..", at most ${MAX_ARTIFACT_BYTES >> 20} MiB each and ${MANIFEST_REQUEST_BUDGET >> 20} MiB in one publish`,
      );
    b = K;
    l.input.file_path = K.path;
    if (H !== undefined) {
      l.input.root = H.dir;
      h = H.admitted;
    }
  }
  if (e.verb === "upload_asset") {
    let stagedPage = await readStagedPage(String(l.input.file_path), n.cwd, true);
    if (stagedPage === null)
      return errorResult(
        "invalid_args",
        `file_path must be a regular file the script wrote inside its own publish folder (files.dir(); copy a file from elsewhere into it first), at most ${MAX_ARTIFACT_BYTES >> 20} MiB`,
      );
    b = stagedPage;
    l.input.file_path = stagedPage.path;
  }
  let z = e.verb === "upload_asset" ? UPLOAD_INCOMPLETE : PUBLISH_INCOMPLETE;
  let { tool } = l;
  let toolUseID = `artifact_repl_${randomUUID()}`;
  let S = {
    value: false,
  };
  let x = {
    ...toolUseContext,
    toolUseId: toolUseID,
    permissionPhase: undefined,
    autoModeClassified: undefined,
    ...false,
    ...(n.abortController && {
      abortController: n.abortController,
    }),
    ...(b && {
      publishSourceSha256: b.sha256,
      publishSourceVerified: S,
    }),
    ...(h && {
      publishFilesSha256: h,
    }),
  };
  let L = tool.inputSchema.safeParse(l.input);
  if (!L.success) return errorResult("invalid_args", formatZodValidationError(tool.name, L.error));
  let validateInput = (w) => tool.validateInput?.(w, x);
  let M = await validateInput(L.data);
  if (M?.result === false) return errorResult("validation", M.message);
  let toolInput = L.data;
  let hookPermissionResult;
  let R;
  for await (let w of runPreToolUseHooks(
    toolUseContext,
    tool,
    toolInput,
    toolUseID,
    parentMessage.message.id,
    parentMessage.requestId,
    undefined,
    undefined,
    validateInput,
  ))
    if (w.type === "hookPermissionResult") hookPermissionResult = w.hookPermissionResult;
    else if (w.type === "hookUpdatedInput") toolInput = w.updatedInput;
    else if (w.type === "stopReason") R = w.stopReason;
    else if (w.type === "stop")
      return b !== undefined ? z : errorResult("denied", w.stopReason ?? R ?? "Blocked by PreToolUse hook");
  let permissionRound = startPermissionRound(toolUseContext, toolUseID, tool.name);
  let D = await resolvePermissionDecisionForCall(
    hookPermissionResult,
    tool,
    toolInput,
    {
      ...x,
      permissionRound,
    },
    canUseTool,
    parentMessage,
    toolUseID,
  ).catch((error) => {
    takePermissionRecord(toolUseContext, toolUseID, permissionRound);
    throw error;
  });
  let permissionPhase = takePermissionRecord(toolUseContext, toolUseID, permissionRound) ?? {};
  if (D.decision.behavior !== "allow") {
    clearToolUsePermissionState(toolUseContext.session, toolUseID);
    toolUseContext.onPermissionDenial?.(tool, toolUseID, D.input);
    if (b !== undefined) return z;
    return errorResult(
      "denied",
      D.decision.behavior === "deny" ? (D.decision.message ?? "Permission denied") : "Permission denied",
    );
  }
  let toolInput_2 =
    D.decision.updatedInput !== undefined && !isEmptyObject(D.decision.updatedInput)
      ? D.decision.updatedInput
      : D.input;
  if (!r()) {
    clearToolUsePermissionState(toolUseContext.session, toolUseID);
    return errorResult("unavailable", "the caller went away before the call ran");
  }
  let now = Date.now();
  recordToolUsed(tool.name);
  n.onToolCalled?.(tool.name);
  try {
    let w = await tool.call(
      toolInput_2,
      {
        ...x,
        permissionPhase,
        innerCall: true,
      },
      canUseTool,
      parentMessage,
      undefined,
      {
        userModified: D.decision.userModified ?? false,
      },
    );
    let B = w.data;
    let X = watchWithheldResults(toolUseID);
    let K = false;
    try {
      for await (let H of runPostToolUseHooks(
        toolUseContext,
        tool,
        toolUseID,
        parentMessage.message.id,
        toolInput_2,
        w.data,
        parentMessage.requestId,
        undefined,
        undefined,
        Date.now() - now,
      ))
        if ("updatedToolOutput" in H && tool.outputSchema?.safeParse(H.updatedToolOutput)?.success !== false)
          B = H.updatedToolOutput;
    } finally {
      K = releaseWithheldWatch(toolUseID, X);
    }
    if (K) return errorResult("tool_error", withheldResultText(tool.name));
    if (e.verb === "read_file") {
      let H = fileReadResultSchema().safeParse(B);
      if (H.success && "title" in H.data.file_read) {
        let { title, ...St } = H.data.file_read;
        B = {
          ...B,
          file_read: St,
        };
      }
    }
    if (e.verb === "read_file" && w.afterResultCommitted && fileReadResultSchema().safeParse(w.data).success)
      if (i) i.push(w.afterResultCommitted);
      else w.afterResultCommitted();
    return {
      ok: true,
      result: B,
    };
  } catch (error) {
    for await (let B of runPostToolUseFailureHooks(
      toolUseContext,
      tool,
      toolUseID,
      parentMessage.message.id,
      toolInput_2,
      errorMessage(error),
      isAbortError(error),
      parentMessage.requestId,
      undefined,
      undefined,
      Date.now() - now,
    ));
    if (b !== undefined && !S.value) return z;
    if (
      e.verb === "publish" &&
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
    clearToolUsePermissionState(toolUseContext.session, toolUseID);
  }
}
//@ chunk-tmx5d02z.js:22956-23459 placement
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
    id: string(),
    text: string(),
  }),
);
var seeImageSchema = DoctorLazy(() =>
  zodStrictObject({
    type: literal(IMAGE),
    id: string(),
    media_type: string(),
    data: string(),
    label: string().optional(),
  }),
);
var isSupportedImageMediaType = (e) => e === "image/png" || e === "image/jpeg";
var refusedResult = (message) => ({
  ok: false,
  error: {
    code: "refused",
    message,
  },
});
var seeEntryKind = (e) => (typeof e === "object" && e !== null && "type" in e ? e.type : undefined);
//@ chunk-tmx5d02z.js:23459-23508 placement
/**
 * 判断条目是否是 see 或 image 类型。
 */
function isSeeEntry(e) {
  let n = seeEntryKind(e);
  return n === SEE_KIND || n === IMAGE;
}
//@ chunk-tmx5d02z.js:23508-23616 placement
function truncateDisplayText(text) {
  let n = truncateToLength(text, MAX_SEE_TEXT_CHARS);
  return {
    text: n
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
    dropped: text.length - n.length,
  };
}
//@ chunk-tmx5d02z.js:23616-24012 placement
/**
 * 解析页面发来的一行图片：校验 id、大小上限与声明/实际媒体类型（只接受支持的图片格式），返回清洗后的标签、类型与字节；否则返回 refused 原因。
 */
function parseImageLine(e, n) {
  let r = seeImageSchema().safeParse(e);
  if (!r.success || !n.test(r.data.id))
    return {
      refused: "not a valid image line",
    };
  let { media_type: mediaType, data: a, label } = r.data;
  if (a.length > Math.ceil(MAX_SEE_IMAGE_BYTES / 3) * 4)
    return {
      refused: `larger than ${MAX_SEE_IMAGE_BYTES} bytes`,
    };
  if (!isSupportedImageMediaType(mediaType))
    return {
      refused: NOT_PNG_OR_JPEG,
    };
  let buffer = Buffer.from(a, "base64");
  let l = Ph(buffer);
  if (!isSupportedImageMediaType(l))
    return {
      refused: NOT_PNG_OR_JPEG,
    };
  return {
    label:
      sanitizeDisplayText(label ?? "", {
        maxCodeUnits: 80,
      }) || "image",
    media_type: l,
    bytes: buffer,
  };
}
//@ chunk-tmx5d02z.js:24012-24504 placement = buildImageContentBlocks (0.455)
/**
 * 图片压缩为 PNG/JPEG base64，失败或过大返回 {refused}。归属存疑（某工具的图片收集）。
 */
async function encodeImageForAttachment(data, mediaType, limits) {
  let i = await maybeResizeAndDownsampleImageBlock({
    data,
    mediaType,
    limits,
    allowWebp: false,
  }).catch(() => {
    return;
  });
  if (i === undefined)
    return {
      refused: UNPROCESSABLE_SEE,
    };
  let { block } = i;
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
  let s = Ph(buffer);
  if (!isSupportedImageMediaType(s))
    return {
      refused: UNPROCESSABLE_SEE,
    };
  if (buffer.length > MODEL_COPY_IMAGE_BYTES)
    return {
      refused: "too large after recompression",
    };
  return {
    media_type: s,
    data: block.source.data,
    size: buffer.length,
  };
}
//@ chunk-tmx5d02z.js:24504-25985 placement
/**
 * 收集文本与图片（最多 4 张），attach 时转成内容块。归属存疑。
 */
function createImageCollector(e) {
  let n = [];
  let r = [];
  let i = 0;
  let a = new Map();
  let c = (message) => {
    a.set(message, (a.get(message) ?? 0) + 1);
    return refusedResult(message);
  };
  return {
    take(s) {
      if (seeEntryKind(s) === SEE_KIND) {
        let b = seeLineSchema().safeParse(s);
        if (!b.success || !e.test(b.data.id)) return c(BAD_SEE_LINE);
        if (n.length >= MAX_SEE_CALLS) return c(TOO_MANY_SEE_CALLS_REFUSAL);
        n.push(truncateDisplayText(b.data.text));
        return {
          ok: true,
          result: {
            index: n.length,
          },
        };
      }
      if (r.length >= MAX_SEE_IMAGES) {
        i++;
        return refusedResult(TOO_MANY_IMAGES_REFUSAL);
      }
      if (n.length === 0)
        n.push({
          text: "",
          dropped: 0,
        });
      let l = {
        ...parseImageLine(s, e),
        group: n.length - 1,
      };
      r.push(l);
      return "refused" in l
        ? refusedResult(l.refused)
        : {
            ok: true,
            result: {
              index: r.length,
            },
          };
    },
    kept: () => ({
      texts: count(n, (s) => s.text !== ""),
      images: count(r, (s) => "bytes" in s),
    }),
    textChars: () => n.reduce((acc, l) => acc + l.text.length, 0),
    async attach(limits) {
      let l = [];
      let mapped = n.map(() => []);
      let mapped_2 = n.map(() => []);
      let z = (S, refused) => void l.push(`image ${S} refused: ${refused}`);
      let m = 0;
      for (let [S, x] of r.entries()) {
        let L = S + 1;
        if ("refused" in x) {
          z(L, x.refused);
          continue;
        }
        if (limits === undefined) continue;
        let v = await encodeImageForAttachment(x.bytes, x.media_type, limits);
        if ("refused" in v) {
          z(L, v.refused);
          continue;
        }
        if (m + v.size > MAX_SEE_TOTAL_IMAGE_BYTES) {
          z(L, "over the 700 KB total");
          continue;
        }
        m += v.size;
        mapped[x.group]?.push(`image ${L}: ${x.label}`);
        mapped_2[x.group]?.push({
          media_type: v.media_type,
          data: v.data,
        });
      }
      if (i > 0) {
        let S = MAX_SEE_IMAGES + 1;
        l.push(
          i === 1
            ? `image ${S} refused: ${TOO_MANY_IMAGES_REFUSAL}`
            : `images ${S} to ${MAX_SEE_IMAGES + i} refused: ${TOO_MANY_IMAGES_REFUSAL}`,
        );
      }
      for (let [S, x] of a) l.push(`${x} claude.see() ${x === 1 ? "call" : "calls"} refused: ${S}`);
      let y = [];
      if (limits !== undefined)
        for (let [S, x] of n.entries()) {
          let filtered = [x.text === "" ? undefined : `see ${S + 1}: ${x.text}`, ...(mapped[S] ?? [])].filter(
            (v) => v !== undefined,
          );
          if (filtered.length > 0)
            y.push({
              dropped: x.text === "" ? 0 : x.dropped,
              body: filtered.join(`
`),
              images: mapped_2[S] ?? [],
            });
        }
      return {
        lines: l,
        groups: y,
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
