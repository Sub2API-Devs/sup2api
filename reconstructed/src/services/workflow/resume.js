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
import { resolve, dirname, basename, join } from "path";
import { createHash } from "crypto";
import { mkdir } from "fs/promises";
import { getCwd } from "../../utils/cwd.js";
import { samePath } from "../../utils/file.js";
import { workflowScriptsDir, MAX_SCRIPT_FILE_BYTES } from "./scriptFile.js";
import {
  isWorkflowScriptFileFor,
  WORKFLOW_SCRIPT,
  logJournalMirrorFailure,
  WORKFLOW_JOURNAL,
  parseJournalEntry,
} from "./journalStore.js";
import { storagePort } from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { LocalFileJournal } from "./localFileJournal.js";
import { pathExists } from "../../utils/fsSafety/atomicWriteStaging.js";
import { subagentWorkflowDir } from "./snapshots.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { indexJournalEntries } from "./journalEntries.js";
import { writeNewFile } from "../../utils/atomicPublishWrite.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-41w44bgm.js:98035-98084 placement
/**
 * 保存脚本探测与镜像记录的状态类。
 */
class WorkflowResumeState {
  probes = new Map();
  mirroredScripts = new Map();
}
//@ chunk-41w44bgm.js:98084-98154 placement
/**
 * 路径是否位于本会话的镜像脚本目录下。
 */
function isMirroredScriptPath(e, n) {
  let r = resolve(getCwd(), e);
  return samePath(dirname(r), workflowScriptsDir()) && isWorkflowScriptFileFor(basename(r), n);
}
//@ chunk-41w44bgm.js:98154-98479 placement
/**
 * 把工作流脚本镜像到远程存储：按文件名+内容的 sha256 去重，已镜像过相同内容则跳过；上传失败时清除记录以便重试。
 */
function mirrorWorkflowScript(e, n, script, h) {
  if (!isMirroredScriptPath(n, e)) return;
  let T = basename(n);
  let y = createHash("sha256").update(T).update("\x00").update(script).digest("hex");
  if (h.mirroredScripts.get(e) === y) return;
  let A = storagePort();
  if (A === undefined) return;
  h.mirroredScripts.set(e, y);
  A.mirror(
    WORKFLOW_SCRIPT,
    {
      fileName: T,
      script,
    },
    {
      sessionId: getSessionId(),
      agentId: e,
    },
  ).catch((error) => {
    h.mirroredScripts.delete(e);
    logJournalMirrorFailure(error);
  });
}
//@ chunk-41w44bgm.js:98479-98647 placement
/**
 * 探测工作流运行是否可恢复（按运行 id 缓存探测结果，非 restore 结果用完即删）。
 */
function probeWorkflowResume(runId, scriptPath, storageRoot, agentCtx, T) {
  let y = T.probes.get(runId);
  if (y) return y;
  let A = probeResumeState(runId, scriptPath, storageRoot, agentCtx).then((L) => {
    if (L.kind !== "restore") T.probes.delete(runId);
    return L;
  });
  T.probes.set(runId, A);
  return A;
}
//@ chunk-41w44bgm.js:98647-99964 placement
/**
 * 判断工作流运行能否恢复：本地 journal 完整且脚本在则 ready；否则从会话存储读取远程副本，解析 journal 条目与脚本，返回 restore / refused（无 journal、取不到等）。
 */
async function probeResumeState(runId, scriptPath, storageRoot, agentCtx) {
  let T = (message) => ({
    kind: "refused",
    message,
  });
  try {
    let y = (await new LocalFileJournal(runId, storageRoot).restoreState()) === "complete";
    let A =
      scriptPath !== undefined &&
      isMirroredScriptPath(scriptPath, runId) &&
      !(await pathExists(resolve(getCwd(), scriptPath)));
    if (y && !A)
      return {
        kind: "ready",
      };
    let agent = await storagePort()?.readAgent(runId, agentCtx);
    if (y && !agent)
      return {
        kind: "ready",
      };
    if (agent === undefined)
      return T(
        `The journal for workflow run ${runId} is not on disk, and this session cannot fetch a remote copy, so there is nothing to resume. Fallback: Read the agent-<id>.jsonl files in ${subagentWorkflowDir(runId)} and hand-author a continuation script.`,
      );
    if (agent === null)
      return T(
        `Could not fetch the journal for workflow run ${runId} from the session store. Try the resume again.`,
      );
    let j = [];
    let he = false;
    let ke;
    for (let te of agent)
      if (te.type === WORKFLOW_JOURNAL) {
        let journalEntry = parseJournalEntry(te.entry);
        if (journalEntry !== undefined) j.push(journalEntry);
        else he = true;
      } else if (
        te.type === WORKFLOW_SCRIPT &&
        typeof te.fileName === "string" &&
        isWorkflowScriptFileFor(te.fileName, runId) &&
        typeof te.script === "string" &&
        te.script.length <= MAX_SCRIPT_FILE_BYTES &&
        isAllPrintable(te.script)
      )
        ke = {
          fileName: te.fileName,
          script: te.script,
        };
    if (y)
      return ke
        ? {
            kind: "restore",
            entries: undefined,
            script: ke,
          }
        : {
            kind: "ready",
          };
    if (j.length === 0)
      return T(
        `No journal found for workflow run ${runId}, so there is nothing to resume. To run the workflow from the start, call Workflow again without resumeFromRunId.`,
      );
    return {
      kind: "restore",
      entries: j,
      ...(he && {
        hasUnreadEntry: true,
      }),
      script: ke,
    };
  } catch (error) {
    return T(`Could not read the journal for workflow run ${runId}: ${errorMessage(error)}`);
  }
}
//@ chunk-41w44bgm.js:99964-100298 placement
/**
 * 恢复工作流时加载日志：优先用远程恢复的条目（被拒时返回拒绝原因），否则读本地文件日志；读取失败返回 refusal。
 */
async function loadResumeJournal(e, n, storageV5, signal, T) {
  let y = await probeWorkflowResume(e, n, storageV5, signal, T);
  if (y.kind === "refused")
    return {
      refusal: y.message,
    };
  if (y.kind === "restore" && y.entries !== undefined)
    return {
      ...indexJournalEntries(y.entries),
      ...(y.hasUnreadEntry && {
        hasUnreadLine: true,
      }),
    };
  try {
    return await new LocalFileJournal(e, storageV5).load();
  } catch (error) {
    return {
      refusal: `Could not read the journal for workflow run ${e}: ${errorMessage(error)}`,
    };
  }
}
//@ chunk-41w44bgm.js:100298-100445 placement
/**
 * 若恢复结果附带脚本且给定路径正是恢复脚本的写回位置，返回该脚本内容。
 */
function restoredScriptFor(e, scriptPath) {
  if (e.kind !== "restore" || e.script === undefined) return;
  let r = join(workflowScriptsDir(), e.script.fileName);
  return samePath(resolve(getCwd(), scriptPath), r) ? e.script.script : undefined;
}
//@ chunk-41w44bgm.js:100445-100644 placement
/**
 * 确保恢复所需的脚本与日志已写回：拒绝时返回原因，已就绪返回 null，否则只写一次并返回写入结果。
 */
async function ensureResumeRestored(resumeFromRunId, scriptPath, storageV5, signal, T) {
  let y = await probeWorkflowResume(resumeFromRunId, scriptPath, storageV5, signal, T);
  if (y.kind === "refused") return y.message;
  if (y.kind === "ready") return null;
  y.written ??= writeRestoredJournal(resumeFromRunId, storageV5, y).finally(() =>
    T.probes.delete(resumeFromRunId),
  );
  return y.written;
}
//@ chunk-41w44bgm.js:100644-101091 placement
/**
 * 把恢复得到的工作流脚本写回本地脚本目录（已存在则忽略），并在本地日志未完整时写入恢复的条目；失败返回错误文字，成功返回 null。
 */
async function writeRestoredJournal(e, n, { entries, script }) {
  if (script) {
    let y = workflowScriptsDir();
    try {
      await mkdir(y, {
        recursive: true,
        mode: 448,
      });
      await writeNewFile(join(y, script.fileName), script.script, 384);
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST")
        logForDebugging(`Failed to restore a workflow script: ${error}`, {
          level: "warn",
        });
    }
  }
  if (entries === undefined) return null;
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
  WorkflowResumeState,
  probeWorkflowResume,
  restoredScriptFor,
  ensureResumeRestored,
  mirrorWorkflowScript,
};
