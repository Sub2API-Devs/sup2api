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
import { relative, sep, join, join as join_2, resolve, isAbsolute, isAbsolute as isAbsolute_2 } from "path";
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
  kt,
  o,
  zodStrictObject,
  T,
  U,
  pe,
  oe,
  E,
  A,
  Ue,
  zg,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { formatZodValidationError } from "../../utils/toolErrors.js";
import { JL, readExactBytes } from "../../services/artifacts/artifactUrl.js";
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
import { Uv } from "../../services/compact/keptTools.js";
import {
  watchWithheldResults,
  releaseWithheldWatch,
  Hqs,
} from "../../plugins/functionHooks/toolCallHooks.js";
import { errorMessage, isAbortError } from "../../utils/errors.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { normalizeForDisplay, sanitizeDisplayText } from "../../utils/resultError.js";
import { Ph } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { maybeResizeAndDownsampleImageBlock } from "../../utils/imageResizer.js";
import { vY } from "../../utils/truncateGraphemes.js";
import { count } from "../../utils/collections.js";

//@ chunk-tmx5d02z.js:12695-12971 placement
function parseArtifactId(e) {
  let lower = e.trim().toLowerCase();
  if (ARTIFACT_SLUG_RE.test(lower)) return { id: lower };
  let r = parseArtifactUrlAnyCase(e.trim());
  if (r !== null && ARTIFACT_SLUG_RE.test(r.slug.toLowerCase())) return { id: r.slug.toLowerCase() };
  return {
    error: "artifact must be an artifact URL (https://claude.ai/code/artifact/<id>) or a bare artifact id",
  };
}
/**
 * 解析 artifact_call 参数中的 Artifact id（为空则无 id，格式错误返回 error）。
 */
//@ chunk-tmx5d02z.js:12971-13076 placement
function readArtifactIdArg(e) {
  if (e !== void 0 && e.trim() !== "") {
    let n = parseArtifactId(e);
    return "error" in n ? n : { id: n.id };
  }
  return { id: void 0 };
}
//@ chunk-tmx5d02z.js:13076-13130 placement
var APPIFACT_ARTIFACT = "APPIFACT_ARTIFACT",
  APPIFACT_ARTIFACT_URL = "APPIFACT_ARTIFACT_URL";
/**
 * artifact_call 页面调用的协议常量：动词集合（数据库读写、读文件、资源、publish/open）、调用 id 格式、结果大小上限与严格 schema。
 */
//@ chunk-tmx5d02z.js:13480-13868 placement
var fileReadResultSchema = DoctorLazy(() => u({ file_read: kt({ path: o(), saved_to: o() }) })),
  ARTIFACT_CALL = "artifact_call",
  MAX_CALL_RESULT_BYTES = 1048576,
  DB_READ_OPS = ["get", "list", "query"],
  DB_WRITE_OPS_LIST = ["set", "update", "delete", "batch"],
  DB_READ_OP_SET = new Set(DB_READ_OPS),
  FILE_READ_VERBS = ["read_file", "read_files", "list_files"],
  ASSET_VERBS = ["upload_asset", "read_asset"],
  MAX_CALL_ID_LENGTH = 32,
  ARTIFACT_CALL_VERBS = [
    ...DB_READ_OPS,
    ...DB_WRITE_OPS_LIST,
    ...FILE_READ_VERBS,
    ...ASSET_VERBS,
    "publish",
    "open",
  ],
  artifactCallSchema = DoctorLazy(() =>
    zodStrictObject({
      type: T(ARTIFACT_CALL),
      id: o().regex(CALL_ID_RE),
      verb: U(ARTIFACT_CALL_VERBS),
      args: pe(o(), oe()),
    }),
  ),
  CALL_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
//@ chunk-tmx5d02z.js:13868-13963 placement
function Fe(e) {
  let safeParse = artifactCallSchema().safeParse(e);
  return safeParse.success
    ? { frame: safeParse.data }
    : { invalid: formatZodValidationError(ARTIFACT_CALL, safeParse.error) };
}
/**
 * artifact_call 数据库动作的参数 schema：url、collection、doc_id、data、query、if_version，以及最多 100 条的 writes 批量写。
 */
//@ chunk-tmx5d02z.js:13963-14340 placement
var dbCallArgsSchema = DoctorLazy(() =>
  zodStrictObject({
    url: o().max(2048),
    collection: o().max(2048).optional(),
    doc_id: o().max(2048).optional(),
    data: pe(o(), oe()).optional(),
    query: pe(o(), oe()).optional(),
    if_version: E().int().positive().optional(),
    writes: A(
      zodStrictObject({
        op: o().max(16),
        collection: o().max(2048),
        doc_id: o().max(2048),
        data: pe(o(), oe()).optional(),
        if_version: E().int().positive().optional(),
      }),
    )
      .max(100)
      .optional(),
  }),
);
//@ chunk-tmx5d02z.js:14340-14448 placement
function stripIfVersion({ if_version: if_version, writes: writes, ...r }) {
  return writes === void 0 ? r : { ...r, writes: writes.map(({ if_version: if_version, ...a }) => a) };
}
//@ chunk-tmx5d02z.js:14448-15408 placement
var ARTIFACT_CALL_SCHEMAS = DoctorLazy(() => zodStrictObject({ url: o().max(2048) })),
  Oe = DoctorLazy(() =>
    zodStrictObject({
      url: o().max(2048),
      path: o()
        .min(1)
        .max(512)
        .refine((e) => !ASSET_ID_RE.test(e), {
          message: "path looks like an asset id; read_file takes a published path",
        }),
    }),
  ),
  Mt = DoctorLazy(() =>
    zodStrictObject({ url: o().max(2048), paths: A(Oe().shape.path).min(1).max(MAX_CALL_ID_LENGTH) }),
  ),
  Nt = DoctorLazy(() => zodStrictObject({ url: o().max(2048), file_path: o().min(1).max(4096) })),
  Bt = DoctorLazy(() => zodStrictObject({ url: o().max(2048), asset_id: o().regex(ASSET_ID_RE) })),
  Ht = DoctorLazy(() =>
    zodStrictObject({
      file_path: o().max(4096),
      root: o().min(1).max(1024).optional(),
      files: pe(
        o().min(1).max(512),
        Ue([
          o().min(1).max(512),
          zodStrictObject({ from: o().min(1).max(512), contentType: o().optional() }),
          zg(),
        ]),
      )
        .refine((e) => Object.keys(e).length < JL, { message: `files lists more than ${JL - 1} entries` })
        .optional(),
      url: o().max(2048).optional(),
      title: o().max(512).optional(),
      favicon: o().min(1).max(32).optional(),
      icon: o().max(40).optional(),
      capabilities: pe(o(), oe()).optional(),
      contract: o().max(32).optional(),
      session_context: o().max(20000).optional(),
      description: o().max(1000).optional(),
    }),
  );
//@ chunk-tmx5d02z.js:15408-15504 placement
function O(e, n, r) {
  return { ok: !1, error: r === void 0 ? { code: e, message: n } : { code: e, message: n, reason: r } };
}
//@ chunk-tmx5d02z.js:15504-15716 placement
var PUBLISH_INCOMPLETE = { ok: !1, error: { code: "tool_error", message: "the publish did not complete" } },
  UPLOAD_INCOMPLETE = { ok: !1, error: { code: "tool_error", message: "the upload did not complete" } },
  APPIFACT_PUBLISH_DIR_RE = /^\.appifact-publish-[A-Za-z0-9]{6}$/,
  INDEX_HTML = "index.html";
//@ chunk-tmx5d02z.js:15716-15818 placement
function publishStagingDir(e, n) {
  let [r, ...i] = relative(n, e).split(sep);
  return r !== void 0 && i.length > 0 && APPIFACT_PUBLISH_DIR_RE.test(r) ? join_2(n, r) : null;
}
//@ chunk-tmx5d02z.js:15818-15968 placement
async function readStagedPage(e, n, r = !1) {
  try {
    let i = await realpath(n);
    return await readSingleLinkFile(resolve(n, e), (a) => {
      let c = publishStagingDir(a, i);
      return c !== null && (r || a === join_2(c, INDEX_HTML));
    });
  } catch {
    return null;
  }
}
/**
 * 以 O_NOFOLLOW 打开文件，要求普通单链接且不超过 Artifact 大小上限，经 /proc/self/fd 取真实路径并通过 n 校验后读出全部字节，返回 {path, sha256, size}；任何异常返回 null。
 */
//@ chunk-tmx5d02z.js:15968-16344 placement
async function readSingleLinkFile(e, n) {
  try {
    let r = await open(e, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      let stats = await r.stat({ bigint: !0 });
      if (!stats.isFile() || stats.nlink !== 1n || stats.size > BigInt(MAX_ARTIFACT_BYTES)) return null;
      let a = await readlink(`/proc/self/fd/${r.fd}`);
      if (!n(a)) return null;
      let c = await readExactBytes(r, Number(stats.size));
      return c === null ? null : { path: a, sha256: computeContentHash(c), size: c.length };
    } finally {
      await r.close();
    }
  } catch {
    return null;
  }
}
/**
 * 校验发布暂存目录中的 files 来源：必须在同一暂存目录内、不含绝对路径或 ..，逐个安全读取并累计大小不超过请求预算，返回 {dir, admitted}。
 */
//@ chunk-tmx5d02z.js:16344-16802 placement
async function admitStagedFiles(e, n, r, i, a) {
  try {
    let c = publishStagingDir(e, await realpath(a));
    if (c === null || (await realpath(resolve(a, r))) !== c) return null;
    let s = n,
      l = new Map();
    for (let [b, h] of Object.entries(i ?? {})) {
      if (h === null) continue;
      let z = typeof h === "string" ? h : h.from;
      if (isAbsolute_2(z) || z.split(/[\\/]/).includes("..")) return null;
      let m = await readSingleLinkFile(resolve(c, z), (y) => y.startsWith(c + sep));
      if (m === null || (s += m.size) > MANIFEST_REQUEST_BUDGET) return null;
      l.set(b.normalize("NFC"), { path: m.path, sha256: m.sha256 });
    }
    return { dir: c, admitted: l };
  } catch {
    return null;
  }
}
//@ chunk-tmx5d02z.js:16802-18604 placement
function runArtifactCall(e, n) {
  if (n.verb === "open") {
    let safeParse = ARTIFACT_CALL_SCHEMAS().safeParse(n.args);
    if (!safeParse.success) return { invalid: formatZodValidationError(ARTIFACT_CALL, safeParse.error) };
    let b = findToolByName(e, ARTIFACT_TOOL_NAME);
    return b === void 0
      ? { unavailable: "the Artifact tool is not available in this session" }
      : { tool: b, input: { action: "open", url: safeParse.data.url } };
  }
  if (n.verb === "read_file" || n.verb === "list_files") {
    let safeParse = (n.verb === "read_file" ? Oe() : ARTIFACT_CALL_SCHEMAS()).safeParse(n.args);
    if (!safeParse.success) return { invalid: formatZodValidationError(ARTIFACT_CALL, safeParse.error) };
    let b = findToolByName(e, ARTIFACT_TOOL_NAME);
    if (b === void 0) return { unavailable: "the Artifact tool is not available in this session" };
    let h = { ...safeParse.data, action: n.verb };
    return { tool: b, input: isArtifactToolsetSplit() ? collapseArtifactAction(h) : h };
  }
  if (n.verb === "upload_asset" || n.verb === "read_asset") {
    let safeParse = (n.verb === "upload_asset" ? Nt() : Bt()).safeParse(n.args);
    if (!safeParse.success) return { invalid: formatZodValidationError(ARTIFACT_CALL, safeParse.error) };
    if (!isArtifactAssetsEnabled())
      return {
        unavailable:
          "the Artifact tool's asset verbs are off in this session: tell the user assets cannot be uploaded or downloaded here",
      };
    let b = findToolByName(e, ARTIFACT_TOOL_NAME);
    if (b === void 0) return { unavailable: "the Artifact tool is not available in this session" };
    let h = { ...safeParse.data, action: n.verb };
    return { tool: b, input: isArtifactToolsetSplit() ? collapseArtifactAction(h) : h };
  }
  if (n.verb === "publish") {
    let l = normalizeArtifactInput(n.args),
      safeParse = Ht().safeParse(l === null ? n.args : l.input);
    if (!safeParse.success) return { invalid: formatZodValidationError(ARTIFACT_CALL, safeParse.error) };
    let h = findToolByName(e, ARTIFACT_TOOL_NAME);
    return h === void 0
      ? { unavailable: "the Artifact tool is not available in this session" }
      : { tool: h, input: { ...safeParse.data } };
  }
  let safeParse = dbCallArgsSchema().safeParse(n.args);
  if (!safeParse.success) return { invalid: formatZodValidationError(ARTIFACT_CALL, safeParse.error) };
  if (!isArtifactDbEnabled())
    return { unavailable: "the Artifact tool's database verbs are off in this session" };
  let i = getLiveState();
  i.frozenDbStrReplace ??= isArtifactDbStrReplaceEnabled();
  let a = i.frozenDbStrReplace ? safeParse.data : stripIfVersion(safeParse.data),
    c = findToolByName(e, ARTIFACT_DATA_TOOL_NAME);
  if (c !== void 0) return { tool: c, input: { ...a, action: n.verb } };
  let s = findToolByName(e, ARTIFACT_TOOL_NAME);
  if (s === void 0) return { unavailable: "the Artifact tool is not available in this session" };
  return {
    tool: s,
    input: { ...a, action: DB_READ_OP_SET.has(n.verb) ? "read_db" : "write_db", db_op: n.verb },
  };
}
/**
 * read_files 动作：对 paths 中每个路径依次执行 read_file 发布调用，汇总保存位置，返回 {files_read}；任一失败返回该路径的错误。
 */
//@ chunk-tmx5d02z.js:18604-19149 placement
async function readFilesCall(e, n, r) {
  let safeParse = Mt().safeParse(e.args);
  if (!safeParse.success) return O("invalid_args", formatZodValidationError(ARTIFACT_CALL, safeParse.error));
  let a = [],
    c = [];
  for (let path of safeParse.data.paths) {
    let l = await runArtifactPublish(
      { ...e, verb: "read_file", args: { url: safeParse.data.url, path: path } },
      n,
      r,
      c,
    );
    if (!l.ok) return O(l.error.code, `${jsonStringify(path)}: ${l.error.message}`, l.error.reason);
    let safeParse_2 = fileReadResultSchema().safeParse(l.result);
    if (!safeParse_2.success)
      return O("tool_error", `${jsonStringify(path)}: the read did not say where it saved the file`);
    let { content: content, content_scrubbed: content_scrubbed, ...m } = safeParse_2.data.file_read;
    a.push(m);
  }
  for (let s of c) s();
  return { ok: !0, result: { files_read: a } };
}
/**
 * Artifact 发布调用：读取文件、上传资源并发布。
 */
//@ chunk-tmx5d02z.js:19149-22956 placement
async function runArtifactPublish(e, n, r, i) {
  if (e.verb === "read_files") return readFilesCall(e, n, r);
  let { toolUseContext: toolUseContext, canUseTool: canUseTool, parentMessage: parentMessage } = n,
    l = runArtifactCall(toolUseContext.options.tools, e);
  if ("unavailable" in l) return O("unavailable", l.unavailable);
  if ("invalid" in l) return O("invalid_args", l.invalid);
  let b, h;
  if (e.verb === "publish") {
    let { file_path: file_path, root: root, files: files } = l.input,
      K =
        root === void 0 && files !== void 0 ? null : await readStagedPage(file_path, n.cwd, root !== void 0),
      H = K === null || root === void 0 ? void 0 : await admitStagedFiles(K.path, K.size, root, files, n.cwd);
    if (K === null || H === null)
      return O(
        "invalid_args",
        root === void 0 && files === void 0
          ? "file_path must be a page the script wrote in its own publish directory under the working directory"
          : `file_path and every local source in files must be a regular file the script wrote inside its own publish folder (files.dir(); root must be that folder, and files cannot be sent without it), named by a relative path with no "..", at most ${MAX_ARTIFACT_BYTES >> 20} MiB each and ${MANIFEST_REQUEST_BUDGET >> 20} MiB in one publish`,
      );
    if (((b = K), (l.input.file_path = K.path), H !== void 0)) ((l.input.root = H.dir), (h = H.admitted));
  }
  if (e.verb === "upload_asset") {
    let w = await readStagedPage(String(l.input.file_path), n.cwd, !0);
    if (w === null)
      return O(
        "invalid_args",
        `file_path must be a regular file the script wrote inside its own publish folder (files.dir(); copy a file from elsewhere into it first), at most ${MAX_ARTIFACT_BYTES >> 20} MiB`,
      );
    ((b = w), (l.input.file_path = w.path));
  }
  let z = e.verb === "upload_asset" ? UPLOAD_INCOMPLETE : PUBLISH_INCOMPLETE,
    { tool: tool } = l,
    y = `artifact_repl_${randomUUID()}`,
    S = { value: !1 },
    x = {
      ...toolUseContext,
      toolUseId: y,
      permissionPhase: void 0,
      autoModeClassified: void 0,
      ...!1,
      ...(n.abortController && { abortController: n.abortController }),
      ...(b && { publishSourceSha256: b.sha256, publishSourceVerified: S }),
      ...(h && { publishFilesSha256: h }),
    },
    safeParse = tool.inputSchema.safeParse(l.input);
  if (!safeParse.success) return O("invalid_args", formatZodValidationError(tool.name, safeParse.error));
  let v = (w) => tool.validateInput?.(w, x),
    M = await v(safeParse.data);
  if (M?.result === !1) return O("validation", M.message);
  let k = safeParse.data,
    j,
    R;
  for await (let w of runPreToolUseHooks(
    toolUseContext,
    tool,
    k,
    y,
    parentMessage.message.id,
    parentMessage.requestId,
    void 0,
    void 0,
    v,
  ))
    if (w.type === "hookPermissionResult") j = w.hookPermissionResult;
    else if (w.type === "hookUpdatedInput") k = w.updatedInput;
    else if (w.type === "stopReason") R = w.stopReason;
    else if (w.type === "stop")
      return b !== void 0 ? z : O("denied", w.stopReason ?? R ?? "Blocked by PreToolUse hook");
  let P = startPermissionRound(toolUseContext, y, tool.name),
    D = await resolvePermissionDecisionForCall(
      j,
      tool,
      k,
      { ...x, permissionRound: P },
      canUseTool,
      parentMessage,
      y,
    ).catch((w) => {
      throw (takePermissionRecord(toolUseContext, y, P), w);
    }),
    G = takePermissionRecord(toolUseContext, y, P) ?? {};
  if (D.decision.behavior !== "allow") {
    if (
      (clearToolUsePermissionState(toolUseContext.session, y),
      toolUseContext.onPermissionDenial?.(tool, y, D.input),
      b !== void 0)
    )
      return z;
    return O(
      "denied",
      D.decision.behavior === "deny" ? (D.decision.message ?? "Permission denied") : "Permission denied",
    );
  }
  let W =
    D.decision.updatedInput !== void 0 && !isEmptyObject(D.decision.updatedInput)
      ? D.decision.updatedInput
      : D.input;
  if (!r())
    return (
      clearToolUsePermissionState(toolUseContext.session, y),
      O("unavailable", "the caller went away before the call ran")
    );
  let now = Date.now();
  (Uv(tool.name), n.onToolCalled?.(tool.name));
  try {
    let w = await tool.call(
        W,
        { ...x, permissionPhase: G, innerCall: !0 },
        canUseTool,
        parentMessage,
        void 0,
        { userModified: D.decision.userModified ?? !1 },
      ),
      B = w.data,
      X = watchWithheldResults(y),
      K = !1;
    try {
      for await (let H of runPostToolUseHooks(
        toolUseContext,
        tool,
        y,
        parentMessage.message.id,
        W,
        w.data,
        parentMessage.requestId,
        void 0,
        void 0,
        Date.now() - now,
      ))
        if ("updatedToolOutput" in H && tool.outputSchema?.safeParse(H.updatedToolOutput)?.success !== !1)
          B = H.updatedToolOutput;
    } finally {
      K = releaseWithheldWatch(y, X);
    }
    if (K) return O("tool_error", Hqs(tool.name));
    if (e.verb === "read_file") {
      let safeParse = fileReadResultSchema().safeParse(B);
      if (safeParse.success && "title" in safeParse.data.file_read) {
        let { title: title, ...St } = safeParse.data.file_read;
        B = { ...B, file_read: St };
      }
    }
    if (e.verb === "read_file" && w.afterResultCommitted && fileReadResultSchema().safeParse(w.data).success)
      if (i) i.push(w.afterResultCommitted);
      else w.afterResultCommitted();
    return { ok: !0, result: B };
  } catch (error) {
    for await (let B of runPostToolUseFailureHooks(
      toolUseContext,
      tool,
      y,
      parentMessage.message.id,
      W,
      errorMessage(error),
      isAbortError(error),
      parentMessage.requestId,
      void 0,
      void 0,
      Date.now() - now,
    ));
    if (b !== void 0 && !S.value) return z;
    if (
      e.verb === "publish" &&
      error instanceof ArtifactInputError &&
      error.reasonCode?.startsWith("path_pin_") === !0 &&
      hasAfterResultCommitted(error)
    )
      error.afterResultCommitted();
    return O(
      "tool_error",
      errorMessage(error),
      error instanceof ArtifactInputError ? error.reasonCode : void 0,
    );
  } finally {
    clearToolUsePermissionState(toolUseContext.session, y);
  }
}
//@ chunk-tmx5d02z.js:22956-23459 placement
var SEE = "see",
  IMAGE = "image",
  He = 4,
  Q = 4,
  _e = 2000,
  Me = 750000,
  Yt = 700000,
  je = "not a PNG or JPEG",
  me = `at most ${Q} images per result`,
  Zt = `at most ${He} claude.see() calls per result`,
  Qt = "not a valid see line",
  Z = "could not be processed",
  en = DoctorLazy(() => zodStrictObject({ type: T(SEE), id: o(), text: o() })),
  tn = DoctorLazy(() =>
    zodStrictObject({ type: T(IMAGE), id: o(), media_type: o(), data: o(), label: o().optional() }),
  ),
  he = (e) => e === "image/png" || e === "image/jpeg",
  ge = (e) => ({ ok: !1, error: { code: "refused", message: e } }),
  Ve = (e) => (typeof e === "object" && e !== null && "type" in e ? e.type : void 0);
//@ chunk-tmx5d02z.js:23459-23508 placement
function Je(e) {
  let n = Ve(e);
  return n === SEE || n === IMAGE;
}
//@ chunk-tmx5d02z.js:23508-23616 placement
function truncateDisplayText(e) {
  let n = truncateToLength(e, _e);
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
    dropped: e.length - n.length,
  };
}
/**
 * 解析页面发来的一行图片：校验 id、大小上限与声明/实际媒体类型（只接受支持的图片格式），返回清洗后的标签、类型与字节；否则返回 refused 原因。
 */
//@ chunk-tmx5d02z.js:23616-24012 placement
function parseImageLine(e, n) {
  let safeParse = tn().safeParse(e);
  if (!safeParse.success || !n.test(safeParse.data.id)) return { refused: "not a valid image line" };
  let { media_type: media_type, data: a, label: label } = safeParse.data;
  if (a.length > Math.ceil(Me / 3) * 4) return { refused: `larger than ${Me} bytes` };
  if (!he(media_type)) return { refused: je };
  let buffer = Buffer.from(a, "base64"),
    l = Ph(buffer);
  if (!he(l)) return { refused: je };
  return {
    label: sanitizeDisplayText(label ?? "", { maxCodeUnits: 80 }) || "image",
    media_type: l,
    bytes: buffer,
  };
}
/**
 * 图片压缩为 PNG/JPEG base64，失败或过大返回 {refused}。归属存疑（某工具的图片收集）。
 */
//@ chunk-tmx5d02z.js:24012-24504 placement = buildImageContentBlocks (0.455)
async function encodeImageForAttachment(e, n, r) {
  let i = await maybeResizeAndDownsampleImageBlock({ data: e, mediaType: n, limits: r, allowWebp: !1 }).catch(
    () => {
      return;
    },
  );
  if (i === void 0) return { refused: Z };
  let { block: block } = i;
  if (block.type === "text") {
    let replaced = block.text.replace(/^\[|\]$/g, "");
    return { refused: sanitizeDisplayText(replaced, { maxCodeUnits: 200 }) || Z };
  }
  if (block.source.type !== "base64") return { refused: Z };
  let buffer = Buffer.from(block.source.data, "base64"),
    s = Ph(buffer);
  if (!he(s)) return { refused: Z };
  if (buffer.length > vY) return { refused: "too large after recompression" };
  return { media_type: s, data: block.source.data, size: buffer.length };
}
/**
 * 收集文本与图片（最多 4 张），attach 时转成内容块。归属存疑。
 */
//@ chunk-tmx5d02z.js:24504-25985 placement
function createImageCollector(e) {
  let n = [],
    r = [],
    i = 0,
    a = new Map(),
    c = (s) => (a.set(s, (a.get(s) ?? 0) + 1), ge(s));
  return {
    take(s) {
      if (Ve(s) === SEE) {
        let safeParse = en().safeParse(s);
        if (!safeParse.success || !e.test(safeParse.data.id)) return c(Qt);
        if (n.length >= He) return c(Zt);
        return (n.push(truncateDisplayText(safeParse.data.text)), { ok: !0, result: { index: n.length } });
      }
      if (r.length >= Q) return (i++, ge(me));
      if (n.length === 0) n.push({ text: "", dropped: 0 });
      let l = { ...parseImageLine(s, e), group: n.length - 1 };
      return (r.push(l), "refused" in l ? ge(l.refused) : { ok: !0, result: { index: r.length } });
    },
    kept: () => ({ texts: count(n, (s) => s.text !== ""), images: count(r, (s) => "bytes" in s) }),
    textChars: () => n.reduce((s, l) => s + l.text.length, 0),
    async attach(s) {
      let l = [],
        mapped = n.map(() => []),
        mapped_2 = n.map(() => []),
        z = (S, x) => void l.push(`image ${S} refused: ${x}`),
        m = 0;
      for (let [S, x] of r.entries()) {
        let L = S + 1;
        if ("refused" in x) {
          z(L, x.refused);
          continue;
        }
        if (s === void 0) continue;
        let v = await encodeImageForAttachment(x.bytes, x.media_type, s);
        if ("refused" in v) {
          z(L, v.refused);
          continue;
        }
        if (m + v.size > Yt) {
          z(L, "over the 700 KB total");
          continue;
        }
        ((m += v.size),
          mapped[x.group]?.push(`image ${L}: ${x.label}`),
          mapped_2[x.group]?.push({ media_type: v.media_type, data: v.data }));
      }
      if (i > 0) {
        let S = Q + 1;
        l.push(i === 1 ? `image ${S} refused: ${me}` : `images ${S} to ${Q + i} refused: ${me}`);
      }
      for (let [S, x] of a) l.push(`${x} claude.see() ${x === 1 ? "call" : "calls"} refused: ${S}`);
      let y = [];
      if (s !== void 0)
        for (let [S, x] of n.entries()) {
          let filtered = [x.text === "" ? void 0 : `see ${S + 1}: ${x.text}`, ...(mapped[S] ?? [])].filter(
            (v) => v !== void 0,
          );
          if (filtered.length > 0)
            y.push({
              dropped: x.text === "" ? 0 : x.dropped,
              body: filtered.join(`
`),
              images: mapped_2[S] ?? [],
            });
        }
      return { lines: l, groups: y };
    },
  };
}

export {
  createImageCollector,
  CALL_ID_RE,
  O,
  MAX_CALL_RESULT_BYTES,
  Je,
  Fe,
  runArtifactPublish,
  APPIFACT_ARTIFACT,
  APPIFACT_ARTIFACT_URL,
  readArtifactIdArg,
  _e,
};
