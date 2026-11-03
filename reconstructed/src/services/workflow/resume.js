/**
 * services/workflow/resume.ts
 *
 * 2.1.316 新增：工作流恢复
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41w44bgm.js (9)
 * attribution: placement 9
 */
import {
  resolve,
  resolve as resolve_2,
  dirname,
  dirname as dirname_2,
  basename,
  join,
  join as join_2,
} from "path";
import { createHash, createHash as createHash_2 } from "crypto";
import { mkdir, mkdir as mkdir_2 } from "fs/promises";
import { getCwd } from "../../utils/cwd.js";
import { samePath } from "../../utils/file.js";
import { OAt, gx } from "./scriptFile.js";
import { ps, WORKFLOW_SCRIPT, to, WORKFLOW_JOURNAL, parseJournalEntry } from "./journalStore.js";
import { sfn } from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { LocalFileJournal } from "./localFileJournal.js";
import { pathExists } from "../../utils/fsSafety/atomicWriteStaging.js";
import { Iz } from "./snapshots.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { indexJournalEntries } from "./journalEntries.js";
import { writeNewFile } from "../../utils/atomicPublishWrite.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-41w44bgm.js:98035-98084 placement
class oFt {
  probes = new Map();
  mirroredScripts = new Map();
}
//@ chunk-41w44bgm.js:98084-98154 placement
function ws(e, n) {
  let r = resolve_2(getCwd(), e);
  return samePath(dirname_2(r), OAt()) && ps(basename(r), n);
}
/**
 * 把工作流脚本镜像到远程存储：按文件名+内容的 sha256 去重，已镜像过相同内容则跳过；上传失败时清除记录以便重试。
 */
//@ chunk-41w44bgm.js:98154-98479 placement
function mirrorWorkflowScript(e, n, r, h) {
  if (!ws(n, e)) return;
  let T = basename(n),
    digest = createHash_2("sha256").update(T).update("\x00").update(r).digest("hex");
  if (h.mirroredScripts.get(e) === digest) return;
  let A = sfn();
  if (A === void 0) return;
  (h.mirroredScripts.set(e, digest),
    A.mirror(WORKFLOW_SCRIPT, { fileName: T, script: r }, { sessionId: getSessionId(), agentId: e }).catch(
      (L) => {
        (h.mirroredScripts.delete(e), to(L));
      },
    ));
}
/**
 * 探测工作流运行是否可恢复（按运行 id 缓存探测结果，非 restore 结果用完即删）。
 */
//@ chunk-41w44bgm.js:98479-98647 placement
function probeWorkflowResume(e, n, r, h, T) {
  let y = T.probes.get(e);
  if (y) return y;
  let A = probeResumeState(e, n, r, h).then((L) => {
    if (L.kind !== "restore") T.probes.delete(e);
    return L;
  });
  return (T.probes.set(e, A), A);
}
/**
 * 判断工作流运行能否恢复：本地 journal 完整且脚本在则 ready；否则从会话存储读取远程副本，解析 journal 条目与脚本，返回 restore / refused（无 journal、取不到等）。
 */
//@ chunk-41w44bgm.js:98647-99964 placement
async function probeResumeState(runId, scriptPath, storageRoot, agentCtx) {
  let T = (y) => ({ kind: "refused", message: y });
  try {
    let y = (await new LocalFileJournal(runId, storageRoot).restoreState()) === "complete",
      A =
        scriptPath !== void 0 &&
        ws(scriptPath, runId) &&
        !(await pathExists(resolve_2(getCwd(), scriptPath)));
    if (y && !A) return { kind: "ready" };
    let L = await sfn()?.readAgent(runId, agentCtx);
    if (y && !L) return { kind: "ready" };
    if (L === void 0)
      return T(
        `The journal for workflow run ${runId} is not on disk, and this session cannot fetch a remote copy, so there is nothing to resume. Fallback: Read the agent-<id>.jsonl files in ${Iz(runId)} and hand-author a continuation script.`,
      );
    if (L === null)
      return T(
        `Could not fetch the journal for workflow run ${runId} from the session store. Try the resume again.`,
      );
    let j = [],
      he = !1,
      ke;
    for (let te of L)
      if (te.type === WORKFLOW_JOURNAL) {
        let me = parseJournalEntry(te.entry);
        if (me !== void 0) j.push(me);
        else he = !0;
      } else if (
        te.type === WORKFLOW_SCRIPT &&
        typeof te.fileName === "string" &&
        ps(te.fileName, runId) &&
        typeof te.script === "string" &&
        te.script.length <= gx &&
        isAllPrintable(te.script)
      )
        ke = { fileName: te.fileName, script: te.script };
    if (y) return ke ? { kind: "restore", entries: void 0, script: ke } : { kind: "ready" };
    if (j.length === 0)
      return T(
        `No journal found for workflow run ${runId}, so there is nothing to resume. To run the workflow from the start, call Workflow again without resumeFromRunId.`,
      );
    return { kind: "restore", entries: j, ...(he && { hasUnreadEntry: !0 }), script: ke };
  } catch (error) {
    return T(`Could not read the journal for workflow run ${runId}: ${errorMessage(error)}`);
  }
}
/**
 * 恢复工作流时加载日志：优先用远程恢复的条目（被拒时返回拒绝原因），否则读本地文件日志；读取失败返回 refusal。
 */
//@ chunk-41w44bgm.js:99964-100298 placement
async function loadResumeJournal(e, n, r, h, T) {
  let y = await probeWorkflowResume(e, n, r, h, T);
  if (y.kind === "refused") return { refusal: y.message };
  if (y.kind === "restore" && y.entries !== void 0)
    return { ...indexJournalEntries(y.entries), ...(y.hasUnreadEntry && { hasUnreadLine: !0 }) };
  try {
    return await new LocalFileJournal(e, r).load();
  } catch (error) {
    return { refusal: `Could not read the journal for workflow run ${e}: ${errorMessage(error)}` };
  }
}
/**
 * 若恢复结果附带脚本且给定路径正是恢复脚本的写回位置，返回该脚本内容。
 */
//@ chunk-41w44bgm.js:100298-100445 placement
function restoredScriptFor(e, n) {
  if (e.kind !== "restore" || e.script === void 0) return;
  let r = join_2(OAt(), e.script.fileName);
  return samePath(resolve_2(getCwd(), n), r) ? e.script.script : void 0;
}
/**
 * 确保恢复所需的脚本与日志已写回：拒绝时返回原因，已就绪返回 null，否则只写一次并返回写入结果。
 */
//@ chunk-41w44bgm.js:100445-100644 placement
async function ensureResumeRestored(e, n, r, h, T) {
  let y = await probeWorkflowResume(e, n, r, h, T);
  if (y.kind === "refused") return y.message;
  if (y.kind === "ready") return null;
  return ((y.written ??= writeRestoredJournal(e, r, y).finally(() => T.probes.delete(e))), y.written);
}
/**
 * 把恢复得到的工作流脚本写回本地脚本目录（已存在则忽略），并在本地日志未完整时写入恢复的条目；失败返回错误文字，成功返回 null。
 */
//@ chunk-41w44bgm.js:100644-101091 placement
async function writeRestoredJournal(e, n, { entries: entries, script: script }) {
  if (script) {
    let y = OAt();
    try {
      (await mkdir_2(y, { recursive: !0, mode: 448 }),
        await writeNewFile(join_2(y, script.fileName), script.script, 384));
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST")
        logForDebugging(`Failed to restore a workflow script: ${error}`, { level: "warn" });
    }
  }
  if (entries === void 0) return null;
  let T = new LocalFileJournal(e, n);
  try {
    if ((await T.restoreState()) === "complete") return null;
    await T.writeRestored(entries);
  } catch (error) {
    return `Could not restore the journal for workflow run ${e}: ${errorMessage(error)}`;
  }
  return null;
}

export {
  loadResumeJournal,
  oFt,
  probeWorkflowResume,
  restoredScriptFor,
  ensureResumeRestored,
  mirrorWorkflowScript,
};
