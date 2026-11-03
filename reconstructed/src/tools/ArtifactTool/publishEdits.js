/**
 * tools/ArtifactTool/publishEdits.ts
 *
 * 2.1.316 新增：Artifact 发布的 edits（查找替换）应用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (14), chunk-y9np9srf.js (20)
 * attribution: placement 34
 */
import { lstat, lstat as lstat_2, lstat as lstat_3 } from "fs/promises";
import { constants, constants as constants_2, constants as constants_3 } from "fs";
import { E, Ka } from "../../../vendor/zod/v4/classic/schemas.js";
import { isWellFormedString } from "../../utils/stringUtils.js";
import { env } from "../../utils/env.js";
import { detectLineEndingsForString as detectLineEndingsForString_2 } from "../../utils/fileRead.js";
import { detectLineEndingsForString, runWithFileWriteContext } from "../../utils/file.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { FILE_EDIT_TOOL_NAME } from "../FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { expandPathOrNull } from "../../utils/path.js";
import { gv } from "./prompt.js";
import { encodeControlChars } from "../../utils/sanitization.js";
import {
  getDenyRuleForTool,
  getFileEditPermissionOutcome,
  AWt,
  shouldClassifyEdits,
} from "../../utils/permissions/permissions.js";
import { FileEditTool } from "../FileEditTool/FileEditTool.js";
import { walkPermissionCheckPaths } from "../../utils/fsOperations.js";
import {
  checkWritePermissionForTool,
  leafSymlinkWriteRefusal,
  isClaudeSettingsPath,
} from "../../utils/permissions/filesystem.js";
import { getErrnoCode } from "../../utils/errors.js";
import { isPerforceReadOnlyFile, PERFORCE_READ_ONLY_MESSAGE } from "../FileEditTool/perforce.js";
import { checkWorktreeIsolation_2 } from "../../utils/worktreeIsolation.js";
import { secretWarning } from "../../services/memoryStore/memoryKeys.js";
import { lintMemoryFilePath, wSt } from "../../memdir/memoryWriteLint.js";
import { sse, getAutoModeClassifierRole } from "../../utils/permissions/serverClassifier/arbiter.js";
import { isClassifierRoutedCircuitBreaker } from "../../types/permissions.js";
import { getMainLoopModel } from "../../utils/permissions/toolPermissionContext.js";
import { registerAgent } from "../../utils/telemetry/perfettoTracing.js";
import { hasToolHookMatching } from "../../utils/hooks.js";
import { hooksModuleMayCover } from "../../services/artifacts/hookCoverage.js";
import { openFileNoFollow } from "../../utils/fsSafety/hardenedRead.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { readExactBytes } from "../../services/artifacts/artifactUrl.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { fileHistoryTrackEdit } from "../../utils/fileHistory.js";
import { logForDebugging } from "../../utils/debug.js";
import { __, Gie } from "../../utils/remoteFileState.js";
import { getLspServerManager } from "../../services/lsp/manager.js";
import {
  clearDeliveredDiagnosticsForFile,
  clearPendingDiagnosticsForFile,
} from "../../services/lsp/LSPDiagnosticRegistry.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";

//@ chunk-y9np9srf.js:410-439 placement
var MODEL_FACING_MESSAGE_KEY = "modelFacingMessage";
//@ chunk-y9np9srf.js:439-475 placement
function coercedNumberSchema(e = E()) {
  return Ka(coerceNumberString, e);
}
//@ chunk-y9np9srf.js:475-620 placement
function coerceNumberString(e) {
  if (typeof e === "string") {
    let trimmed = e.trim();
    if (/^[-+]?\d+(\.\d+)?$/.test(trimmed)) {
      let t = Number(trimmed);
      if (Number.isFinite(t)) return t;
    }
  }
  return e;
}
//@ chunk-y9np9srf.js:620-631 placement
var MAX_PUBLISH_EDITS = 64;
//@ chunk-y9np9srf.js:631-1006 placement
function applyFindReplace(e, n) {
  let t = e;
  for (let s = 0; s < n.length; s++) {
    let { find: find, replace: replace } = n[s];
    if (!isWellFormedString(find) || !isWellFormedString(replace))
      return { ok: !1, reason: "malformed", op: s };
    let d = find === "" ? -1 : t.indexOf(find);
    if (d === -1) return { ok: !1, reason: "not_found", op: s };
    if (t.indexOf(find, d + 1) !== -1) return { ok: !1, reason: "ambiguous", op: s };
    t = t.slice(0, d) + replace + t.slice(d + find.length);
  }
  if (t === e) return { ok: !1, reason: "noop" };
  return { ok: !0, content: t };
}
//@ chunk-y9np9srf.js:1006-1046 placement
var PUBLISH_EDIT_LIMITS = MAX_PUBLISH_EDITS,
  T6r = 65536,
  m = 268435456,
  g = 100;
//@ chunk-y9np9srf.js:1046-1109 placement
function isPublishEditsEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_PUBLISH_EDITS ?? !0;
}
//@ chunk-y9np9srf.js:1109-2266 placement
function publishEditsDescription(e) {
  let n = e.core
      ? "publish: small changes Claude makes to the file at `file_path` in this same call, instead of editing the file with Edit and publishing after."
      : "publish: small changes to make to the file at `file_path` in this same call, instead of editing the file with Edit and publishing after.",
    t = e.typesOn
      ? " Use it on a page (add `url` to update an artifact from another conversation) or on one data file of an artifact made from a type (its `url`, with that file as `file_path`)."
      : " Use it on a page (add `url` to update an artifact from another conversation).",
    s = [...(e.typesOn ? ["`type_url`"] : []), ...(e.multiFileOn ? ["`files`"] : [])],
    o =
      s.length === 0
        ? ""
        : ` Not allowed with ${s.length === 1 ? s[0] : `${s.slice(0, -1).join(", ")} or ${s.at(-1)}`}.`;
  return `${n}${t}${o} Each old_str is text copied exactly from the file as it now stands and must occur in it exactly once; new_str takes its place (empty deletes it). The edits apply in order, all or none: the file is published with them and then saved with them on disk, so it stays the source for later changes; on a miss nothing is changed or published, and the result says which edit failed and why.`;
}
//@ chunk-y9np9srf.js:2266-3621 placement
var EDIT_FIELD_DESCRIPTIONS = "Text copied exactly from the file; must occur once.",
  sai = "Its replacement; empty deletes old_str.",
  iai =
    " For a small change to a page published from a file in this conversation, Claude can send the change as `edits` on the publish call itself (old_str/new_str pairs copied exactly from the file as it now stands) instead of editing the file first.",
  aai =
    "The files you sent are still on disk. For the next small change to this file, send it as `edits` on a publish of the same file_path (old_str/new_str pairs copied exactly from the file as it now stands): that one call changes the file and what is published together, with no Read and no Edit. To change several files, or to rewrite most of the page, Edit the files and publish them in the same response; if an Edit reports that it did not apply, correct it and publish again. If the file's text is no longer in this conversation, Read it first.",
  lai =
    "Once that file has these edits too, the next small change to it can go as `edits` on a publish of the same file_path (old_str/new_str pairs copied exactly from the file as it then stands). To change several files, or to rewrite most of the page, Edit the files and publish them in the same response; if an Edit reports that it did not apply, correct it and publish again. If the file's text is no longer in this conversation, Read it first.";
//@ chunk-y9np9srf.js:3621-3871 placement
function validateEdits(e) {
  let n = 0;
  for (let t = 0; t < e.length; t++) {
    let { old_str: old_str, new_str: new_str } = e[t];
    if (old_str === "") return { reason: "empty_old_str", edit: t };
    if (new_str.includes("\x00")) return { reason: "malformed", edit: t };
    if (((n += old_str.length + new_str.length), n > T6r)) return { reason: "too_large" };
  }
  return;
}
/**
 * 把 publish 的 edits（old_str/new_str）应用到文件：必须唯一出现、大小与工作量受限，返回新内容或失败原因。
 */
//@ chunk-y9np9srf.js:3871-4560 placement
function applyPublishEdits(e, n, t = {}) {
  let s = validateEdits(n);
  if (s !== void 0) return { ok: !1, ...s };
  if (n.length * e.length > m) return { ok: !1, reason: "too_much_work" };
  let o = detectLineEndingsForString_2(e) === "CRLF",
    a = (l) =>
      o
        ? l.replaceAll(
            `\r
`,
            `
`,
          )
        : l,
    d = a(e),
    mapped = n.map((l) => ({ find: a(l.old_str), replace: a(l.new_str) })),
    r = applyFindReplace(d, mapped);
  if (!r.ok)
    switch (r.reason) {
      case "noop":
        return { ok: !1, reason: "noop" };
      case "ambiguous": {
        let l = d;
        for (let u = 0; u < r.op; u++) {
          let { find: find, replace: replace } = mapped[u],
            index = l.indexOf(find);
          l = l.slice(0, index) + replace + l.slice(index + find.length);
        }
        return { ok: !1, reason: "ambiguous", edit: r.op, count: b(l, mapped[r.op].find) };
      }
      default:
        return { ok: !1, reason: r.reason, edit: r.op };
    }
  if (t.json === !0 && p(d) && !p(r.content)) return { ok: !1, reason: "json_invalid" };
  return o ? { ...r, content: detectLineEndingsForString(r.content, "CRLF") } : r;
}
//@ chunk-y9np9srf.js:4560-4651 placement
function b(e, n) {
  let t = 0;
  for (let index = e.indexOf(n); index !== -1 && t < g; index = e.indexOf(n, index + 1)) t++;
  return t;
}
//@ chunk-y9np9srf.js:4651-4701 placement
function p(e) {
  try {
    return (jsonParse(e), !0);
  } catch {
    return !1;
  }
}
//@ chunk-y9np9srf.js:4701-5977 placement
function describeEditFailure(e, n, t) {
  switch (e.reason) {
    case "empty_old_str":
      return `edits[${e.edit}] old_str is empty`;
    case "malformed":
      return `edits[${e.edit}] has a NUL character in new_str, or a broken character (an unpaired surrogate) in old_str or new_str`;
    case "too_large":
      return `old_str and new_str add up to more than ${T6r} characters over all the edits; make a change that large with Edit and publish without edits`;
    case "too_much_work":
      return `${n} edits on a file of ${t} characters is more than one publish call will apply; send at most ${Math.max(1, Math.floor(m / Math.max(1, t)))} edits per call for a file this size, over as many calls as the change needs`;
    case "not_found":
      return `edits[${e.edit}] old_str does not occur in the file`;
    case "ambiguous":
      return `edits[${e.edit}] old_str occurs ${e.count >= g ? "at least " : ""}${e.count} times in the file; include more of the surrounding text so that it occurs once`;
    case "noop":
      return "the edits leave the file unchanged (it already reads that way); publish the file without edits if it should go out as it is";
    case "json_invalid":
      return "after these edits the file would no longer be valid JSON, which the page that reads it needs; correct the edit that breaks it (a missing comma, quote or bracket) and send this publish again with all of its edits";
  }
}
//@ chunk-y9np9srf.js:5977-6045 placement
function x(e) {
  return e.reason === "not_found" || e.reason === "ambiguous";
}
//@ chunk-y9np9srf.js:6045-6435 placement
function editsFailedMessage(e, n, t, s) {
  let o = `No edits were applied and nothing was published: ${describeEditFailure(e, n.length, t.length)}.`;
  if (!x(e)) return o;
  let a = `${o} The file's current text follows; copy old_str from it exactly and send the publish again.

${t}`;
  if (a.length <= s) return a;
  return `${o} The file is too long to show here: Read the file at file_path, copy old_str from it exactly and send the publish again.`;
}
//@ chunk-y9np9srf.js:6435-6482 placement
function editsBaseKey(e) {
  return `\x00edits-base\x00${e}`;
}
//@ chunk-y9np9srf.js:6482-6727 placement
var EDIT_PERMISSION_ASK_TEXT =
  "Applying `edits` changes the file at file_path, and an Edit permission check requires approval here: nothing was published and the file is unchanged. Retry the publish so it can be asked, or Edit the file and publish it without edits.";
//@ chunk-y9np9srf.js:6727-7994 placement
function editsWrittenNote(e, n, t) {
  let s = n === "page" ? "the published page" : "what was published";
  if (t === void 0)
    return e === 1
      ? `The edit was written to the file after it was published, so the file matches ${s}.`
      : `The ${e} edits were written to the file after it was published, so the file matches ${s}.`;
  let o = e === 1,
    a = `Published \u2014 ${n === "page" ? "the page" : "the artifact"} now has ${o ? "the edit" : `the ${e} edits`}, but the file at file_path does not`;
  if (t === "write_failed")
    return `${a}: writing it back failed, and the file may be partly written. Read it before anything else, restore it to the published text (${s}, ${o ? "the edit" : "the edits"} included), and only then publish it again; publishing it as it is could put damaged content ${n === "page" ? "on the page" : "in the artifact"}.`;
  return `${a} (${t === "changed_during_publish" ? "it changed on disk while the publish ran, so it was left as it is" : t === "not_writable" ? "it could not be opened for writing (read-only), so it was left as it is" : "it has other names on disk (a hard link), so it was left as it is"}). Apply the same ${o ? "edit" : "edits"} to that file with Edit before you publish it again${t === "hard_linked" ? ", and publish it without `edits` while it has other names" : ""}; publishing it as it is would revert ${o ? "it" : "them"}.`;
}
//@ chunk-y9np9srf.js:7994-8234 placement
function encodeLikeOriginal(e, n) {
  if (e[0] === 255 && e[1] === 254)
    return Buffer.concat([Buffer.from([255, 254]), Buffer.from(n, "utf16le")]);
  let t = e[0] === 239 && e[1] === 187 && e[2] === 191;
  return Buffer.concat([...(t ? [Buffer.from([239, 187, 191])] : []), Buffer.from(n, "utf8")]);
}
/**
 * 同一响应中先前的 Edit/Write 未生效时拒绝发布的说明：未发布、已有 Artifact 不变，先处理该修改再重新发布。
 */
//@ chunk-8wvtd8sr.js:313449-313768 placement
function sameTurnEditFailedMessage(e) {
  return `The Edit or Write of ${e} sent earlier in the same response as this publish did not apply (its own result says why), so nothing was published and any existing artifact is unchanged. Settle that change first (correct it, or leave the file as it is if the change was declined), then publish again.`;
}
/**
 * 找出同一回复中先于本次发布、写同一文件且失败的 Edit/Write 调用对应的路径（之后成功的 Write 会覆盖），没有返回 null。
 */
//@ chunk-8wvtd8sr.js:313768-314231 placement
function findFailedSameTurnEdit(e, n) {
  let sameTurnErroredToolUseIds = e.sameTurnErroredToolUseIds;
  if (sameTurnErroredToolUseIds === void 0 || sameTurnErroredToolUseIds.size === 0) return null;
  let r = new Map();
  for (let h of e.sameTurnToolUses ?? [])
    for (let y of h.message.content) {
      if (
        y.type !== "tool_use" ||
        (y.name !== FILE_EDIT_TOOL_NAME && y.name !== FILE_WRITE_TOOL_NAME) ||
        !isPlainObject(y.input)
      )
        continue;
      let p = y.input.file_path ?? y.input.path ?? y.input.file,
        w = typeof p === "string" ? expandPathOrNull(p) : null;
      if (w === null || !n.includes(w)) continue;
      if (sameTurnErroredToolUseIds.has(y.id)) r.set(w, !0);
      else if (y.name === FILE_WRITE_TOOL_NAME) r.set(w, !1);
    }
  return n.find((h) => r.get(h) === !0) ?? null;
}
//@ chunk-8wvtd8sr.js:352268-352363 placement
function Ns(e, n = "write_denied") {
  return { kind: "deny", decision: { ...e, message: e.message + gv }, sad: n };
}
//@ chunk-8wvtd8sr.js:352363-354927 placement
async function checkPublishEditPermission(e, n, s, r) {
  let h = encodeControlChars(e),
    y = getDenyRuleForTool(n, FileEditTool);
  if (y !== null)
    return Ns({
      behavior: "deny",
      message: `Permission to edit ${h} has been denied, so it can't be published with edits.`,
      decisionReason: { type: "rule", rule: y },
    });
  let p = { file_path: e, old_string: "a", new_string: "b", replace_all: !1 },
    w = walkPermissionCheckPaths(e),
    A = checkWritePermissionForTool(FileEditTool, p, n, w);
  if (A.behavior === "deny") return Ns(A);
  let S = leafSymlinkWriteRefusal(e, w);
  if (S !== null) return Ns(S);
  if (w.spellings.some(isClaudeSettingsPath))
    return Ns({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: it is a Claude Code settings file. Edit it with Edit, then publish it without edits.`,
      decisionReason: { type: "other", reason: "Claude Code settings file" },
    });
  let R;
  try {
    R = await lstat_3(e);
  } catch (error) {
    return Ns({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: the file could not be examined (${getErrnoCode(error) ?? "error"}). Edit the file, then publish it without edits.`,
      decisionReason: { type: "other", reason: "Write target not examined" },
    });
  }
  if (!R.isFile())
    return Ns({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: it is not a regular file.`,
      decisionReason: { type: "other", reason: "Write target not a file" },
    });
  if (R.nlink > 1)
    return Ns({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: the file has other names on disk (a hard link), and writing it in place would change them all. Edit the file, then publish it without edits.`,
      decisionReason: { type: "other", reason: "Write target is a hard link" },
    });
  if (isPerforceReadOnlyFile(R.mode))
    return Ns({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: ${PERFORCE_READ_ONLY_MESSAGE}`,
      decisionReason: { type: "other", reason: "Write target read-only" },
    });
  let T = s === void 0 ? null : checkWorktreeIsolation_2(e, s);
  if (T !== null)
    return Ns({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: ${T}`,
      decisionReason: { type: "other", reason: "Outside worktree isolation" },
    });
  for (let L of r) {
    let V = secretWarning(e, L) ?? lintMemoryFilePath(e, L, "interactive");
    if (V !== null)
      return Ns({
        behavior: "deny",
        message: `Refusing to apply edits to ${h}: ${V}`,
        decisionReason: { type: "other", reason: "Memory file write check" },
      });
  }
  if (s !== void 0 && hasEditPreToolHook(e, s))
    return Ns({
      behavior: "deny",
      message: `Refusing to apply edits to ${h}: a hook is configured for file edits in this session, so a publish can't apply edits here. Edit the file, then publish it without edits.`,
      decisionReason: { type: "other", reason: "PreToolUse hook for file edits" },
    });
  let P = getFileEditPermissionOutcome(A, n, s);
  if (P.kind === "unseen")
    return Ns(
      {
        behavior: "deny",
        message: `Refusing to apply edits to ${h}: the automatic permission check that decides this publish cannot see the edits. Make the change with Edit, then publish the file without edits.`,
        decisionReason: { type: "other", reason: "Automatic check cannot see the edits" },
      },
      "write_unshown",
    );
  return P;
}
/**
 * 判断发布内嵌 edits 的询问能否交给自动模式分类器处理（安全检查可批准、工作目录类，或模型支持）。
 */
//@ chunk-8wvtd8sr.js:355436-355640 placement
function editAskClassifierRoutable(e, n, s) {
  if (!sse(getAutoModeClassifierRole(n.mode))) return !1;
  if (e?.type === "safetyCheck") return e.classifierApprovable || isClassifierRoutedCircuitBreaker(e);
  if (e?.type === "workingDir") return !0;
  if (s === void 0) return !0;
  let r = getMainLoopModel(s);
  return AWt(r) || shouldClassifyEdits(r);
}
/**
 * 判断在自动模式下对该文件的 Edit 是否会无需用户查看就放行（用于决定内嵌 edits 是否需要询问）。
 */
//@ chunk-8wvtd8sr.js:355640-355854 placement
function editWouldBeUnseen(e, n, s) {
  if (!sse(getAutoModeClassifierRole(n.mode))) return !1;
  if (getDenyRuleForTool(n, FileEditTool) !== null) return !1;
  let r = walkPermissionCheckPaths(e),
    h = checkWritePermissionForTool(
      FileEditTool,
      { file_path: e, old_string: "a", new_string: "b", replace_all: !1 },
      n,
      r,
    );
  return h.behavior !== "deny" && getFileEditPermissionOutcome(h, n, s).kind === "unseen";
}
/**
 * 判断是否有会作用于该文件 Edit/Write 的 PreToolUse hook（含会话 hook 与 hooks 模块），用于决定发布内嵌 edits 时是否需要走 hook。
 */
//@ chunk-8wvtd8sr.js:355854-356206 placement
function hasEditPreToolHook(e, n) {
  let s = registerAgent(n, "PreToolUse", n.session.id),
    r = (h, y) =>
      hasToolHookMatching({
        hookEvent: "PreToolUse",
        toolName: h,
        toolInput: y,
        tools: n.options.tools,
        toolAliases: n.options.toolAliases,
        sessionHooks: n.sessionHooksRegistry,
        sessionId: s,
        exceptInternal: !0,
      });
  return (
    r(FileEditTool.name, { file_path: e, old_string: "", new_string: "" }) ||
    r(FILE_WRITE_TOOL_NAME, { file_path: e, content: "" }) ||
    hooksModuleMayCover(n, [FileEditTool.name, FILE_WRITE_TOOL_NAME])
  );
}
//@ chunk-8wvtd8sr.js:356238-356320 placement
var bv = new Set(["ELOOP", "ENXIO", "EISDIR"]),
  kv = new Set(["EACCES", "EPERM", "EROFS"]);
/**
 * 把 edits 结果写回本地源文件：以读写方式打开，核对大小、inode 身份与内容哈希未变（否则 changed_during_publish），拒绝多硬链接，原地覆写并截断、fsync，返回 {kind, mtimeMs?}。
 */
//@ chunk-8wvtd8sr.js:356320-357363 placement
async function writeBackEditedFile(request) {
  let { path: path, read: read, identity: identity, bytes: bytes, onWritten: onWritten } = request;
  return runWithFileWriteContext(path, async () => {
    let p = await openFileNoFollow(path, constants_3.O_RDWR | READ_LIMITS);
    if (!p.ok) {
      let { error: error } = p,
        S = error.kind === "fs" ? getErrnoCode(error.error) : error.kind;
      if (error.kind === "absent" || (error.kind === "fs" && bv.has(S ?? "")))
        return { kind: "changed_during_publish" };
      if (error.kind === "fs" && kv.has(S ?? "")) return { kind: "not_writable", code: S };
      return { kind: "write_failed", code: S };
    }
    let w = p.value;
    try {
      let stats = await w.stat({ bigint: !0 });
      if (
        !stats.isFile() ||
        stats.size !== BigInt(read.size) ||
        (identity !== void 0 && (stats.dev !== identity.dev || stats.ino !== identity.ino))
      )
        return { kind: "changed_during_publish" };
      let S = await readExactBytes(w, read.size);
      if (S === null || computeContentHash(S) !== read.sha256) return { kind: "changed_during_publish" };
      if (stats.nlink > 1n) return { kind: "hard_linked" };
      let R = 0;
      while (R < bytes.length) {
        let { bytesWritten: bytesWritten } = await w.write(bytes, R, bytes.length - R, R);
        if (bytesWritten <= 0) return { kind: "write_failed", code: "short_write" };
        R += bytesWritten;
      }
      (await w.truncate(bytes.length), await w.sync().catch(() => {}));
      let stats_2 = await w.stat();
      return (onWritten?.(stats_2.mtimeMs), { kind: "written", mtimeMs: stats_2.mtimeMs });
    } catch (error) {
      return { kind: "write_failed", code: getErrnoCode(error) };
    } finally {
      await w.close().catch(() => {});
    }
  });
}
/**
 * 为发布内嵌 edits 写回的文件记录文件历史检查点（失败只记调试日志）。
 */
//@ chunk-8wvtd8sr.js:357363-357542 placement
async function trackEditHistory(e, n, s) {
  await fileHistoryTrackEdit(e.getFileHistoryState, e.applyFileHistoryOp, n, s).catch((r) => {
    logForDebugging(
      `Artifact edits write-back: file history checkpoint failed (${getErrnoCode(r) ?? "error"})`,
    );
  });
}
/**
 * 写回文件后更新 readFileState（新内容与时间戳，保留部分视图标记）。
 */
//@ chunk-8wvtd8sr.js:357542-357769 placement
function refreshReadFileState(e, n, s, r) {
  let h = e.readFileState.get(n);
  e.readFileState.set(n, {
    content: __(s),
    timestamp: Math.floor(r),
    offset: void 0,
    limit: void 0,
    ...(h?.isPartialView === !0 && { isPartialView: !0 }),
    ...(!Gie(h) && { contentNotInModelContext: !0 }),
  });
}
/**
 * 发布内嵌 edits 改了文件后通知 LSP：清除该文件已送达/待送达的诊断，发送 change 与 save 通知，并记录文件修改。
 */
//@ chunk-8wvtd8sr.js:357769-358086 placement
function notifyLspOfEdit(e, n, s, r) {
  let h = getLspServerManager();
  if (h)
    (clearDeliveredDiagnosticsForFile(e.session, n),
      clearPendingDiagnosticsForFile(e.session, n),
      h.changeFile(n, r).catch((y) => {
        logForDebugging(`LSP: Failed to notify server of file change for ${n}: ${y.message}`, {
          level: "error",
        });
      }),
      h.saveFile(n).catch((y) => {
        logForDebugging(`LSP: Failed to notify server of file save for ${n}: ${y.message}`, {
          level: "error",
        });
      }));
  wSt(n, s, r);
}
//@ chunk-8wvtd8sr.js:358086-358165 placement
function Jp(e) {
  return e.mcpInfo?.serverName === REMOTE_DEVICES && e.mcpInfo.serverType !== "sdk";
}
//@ chunk-8wvtd8sr.js:358165-358250 placement
var X = null,
  Rr = null,
  Zt = null,
  Ri = null,
  Qp = null,
  Cv = null,
  $v = require("./chunk-chsmq3nc.js");

export {
  editAskClassifierRoutable,
  coerceNumberString,
  MODEL_FACING_MESSAGE_KEY,
  coercedNumberSchema,
  lai,
  aai,
  X,
  Zt,
  validateEdits,
  editsFailedMessage,
  Ri,
  checkPublishEditPermission,
  Rr,
  T6r,
  PUBLISH_EDIT_LIMITS,
  Qp,
  findFailedSameTurnEdit,
  sameTurnEditFailedMessage,
  editsWrittenNote,
  EDIT_PERMISSION_ASK_TEXT,
  applyPublishEdits,
  encodeLikeOriginal,
  editsBaseKey,
  Jp,
  trackEditHistory,
  writeBackEditedFile,
  refreshReadFileState,
  notifyLspOfEdit,
  editWouldBeUnseen,
  Cv,
  $v,
  MAX_PUBLISH_EDITS,
  applyFindReplace,
  EDIT_FIELD_DESCRIPTIONS,
  sai,
  publishEditsDescription,
  isPublishEditsEnabled,
  iai,
};
