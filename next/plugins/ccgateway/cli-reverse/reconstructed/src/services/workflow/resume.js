/**
 * services/workflow/resume.ts
 *
 * 2.1.316 新增：工作流恢复
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kd2wbncj.js (9)
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

//@ chunk-kd2wbncj.js:90676-90725 placement
/**
 * 保存脚本探测与镜像记录的状态类。
 */
class WorkflowResumeState {
  probes = new Map();
  mirroredScripts = new Map();
}
//@ chunk-kd2wbncj.js:90725-90795 placement
/**
 * 路径是否位于本会话的镜像脚本目录下。
 */
function isMirroredScriptPath(course, runId) {
  let resolved = resolve(getCwd(), course);
  return (
    samePath(dirname(resolved), workflowScriptsDir()) && isWorkflowScriptFileFor(basename(resolved), runId)
  );
}
//@ chunk-kd2wbncj.js:90795-91120 placement
/**
 * 把工作流脚本镜像到远程存储：按文件名+内容的 sha256 去重，已镜像过相同内容则跳过；上传失败时清除记录以便重试。
 */
function mirrorWorkflowScript(runId, scriptPath, script, state) {
  if (!isMirroredScriptPath(scriptPath, runId)) return;
  let fileName = basename(scriptPath);
  let scriptHash = createHash("sha256").update(fileName).update("\x00").update(script).digest("hex");
  if (state.mirroredScripts.get(runId) === scriptHash) return;
  let port = storagePort();
  if (port === undefined) return;
  state.mirroredScripts.set(runId, scriptHash);
  port
    .mirror(
      WORKFLOW_SCRIPT,
      {
        fileName,
        script,
      },
      {
        sessionId: getSessionId(),
        agentId: runId,
      },
    )
    .catch((error) => {
      state.mirroredScripts.delete(runId);
      logJournalMirrorFailure(error);
    });
}
//@ chunk-kd2wbncj.js:91120-91288 placement
/**
 * 探测工作流运行是否可恢复（按运行 id 缓存探测结果，非 restore 结果用完即删）。
 */
function probeWorkflowResume(runId, scriptPath, storageRoot, agentCtx, state) {
  let existing = state.probes.get(runId);
  if (existing) return existing;
  let probe = probeResumeState(runId, scriptPath, storageRoot, agentCtx).then((result) => {
    if (result.kind !== "restore") state.probes.delete(runId);
    return result;
  });
  state.probes.set(runId, probe);
  return probe;
}
//@ chunk-kd2wbncj.js:91288-92594 placement
/**
 * 判断工作流运行能否恢复：本地 journal 完整且脚本在则 ready；否则从会话存储读取远程副本，解析 journal 条目与脚本，返回 restore / refused（无 journal、取不到等）。
 */
async function probeResumeState(runId, scriptPath, storageRoot, agentCtx) {
  let refuse = (message) => ({
    kind: "refused",
    message,
  });
  try {
    let isComplete = (await new LocalFileJournal(runId, storageRoot).restoreState()) === "complete";
    let isScriptGone =
      scriptPath !== undefined &&
      isMirroredScriptPath(scriptPath, runId) &&
      !(await pathExists(resolve(getCwd(), scriptPath)));
    if (isComplete && !isScriptGone)
      return {
        kind: "ready",
      };
    let agent = await storagePort()?.readAgent(runId, agentCtx);
    if (isComplete && !agent)
      return {
        kind: "ready",
      };
    if (agent === undefined)
      return refuse(
        `The journal for workflow run ${runId} is not on disk, and this session cannot fetch a remote copy, so there is nothing to resume. Fallback: Read the agent-<id>.jsonl files in ${subagentWorkflowDir(runId)} and hand-author a continuation script.`,
      );
    if (agent === null)
      return refuse(
        `Could not fetch the journal for workflow run ${runId} from the session store. Try the resume again.`,
      );
    let entries = [];
    let hasUnreadEntry = false;
    let script;
    for (let record of agent)
      if (record.type === WORKFLOW_JOURNAL) {
        let journalEntry = parseJournalEntry(record.entry);
        if (journalEntry !== undefined) entries.push(journalEntry);
        else hasUnreadEntry = true;
      } else if (
        record.type === WORKFLOW_SCRIPT &&
        typeof record.fileName === "string" &&
        isWorkflowScriptFileFor(record.fileName, runId) &&
        typeof record.script === "string" &&
        record.script.length <= MAX_SCRIPT_FILE_BYTES &&
        isAllPrintable(record.script)
      )
        script = {
          fileName: record.fileName,
          script: record.script,
        };
    if (isComplete)
      return script
        ? {
            kind: "restore",
            entries: undefined,
            script,
          }
        : {
            kind: "ready",
          };
    if (entries.length === 0)
      return refuse(
        `No journal found for workflow run ${runId}, so there is nothing to resume. To run the workflow from the start, call Workflow again without resumeFromRunId.`,
      );
    return {
      kind: "restore",
      entries,
      ...(hasUnreadEntry && {
        hasUnreadEntry: true,
      }),
      script,
    };
  } catch (error) {
    return refuse(`Could not read the journal for workflow run ${runId}: ${errorMessage(error)}`);
  }
}
//@ chunk-kd2wbncj.js:92594-92928 placement
/**
 * 恢复工作流时加载日志：优先用远程恢复的条目（被拒时返回拒绝原因），否则读本地文件日志；读取失败返回 refusal。
 */
async function loadResumeJournal(runId, scriptPath, storageV5, signal, state) {
  let probe = await probeWorkflowResume(runId, scriptPath, storageV5, signal, state);
  if (probe.kind === "refused")
    return {
      refusal: probe.message,
    };
  if (probe.kind === "restore" && probe.entries !== undefined)
    return {
      ...indexJournalEntries(probe.entries),
      ...(probe.hasUnreadEntry && {
        hasUnreadLine: true,
      }),
    };
  try {
    return await new LocalFileJournal(runId, storageV5).load();
  } catch (error) {
    return {
      refusal: `Could not read the journal for workflow run ${runId}: ${errorMessage(error)}`,
    };
  }
}
//@ chunk-kd2wbncj.js:92928-93075 placement
/**
 * 若恢复结果附带脚本且给定路径正是恢复脚本的写回位置，返回该脚本内容。
 */
function restoredScriptFor(restoreResult, scriptPath) {
  if (restoreResult.kind !== "restore" || restoreResult.script === undefined) return;
  let restoredScriptPath = join(workflowScriptsDir(), restoreResult.script.fileName);
  return samePath(resolve(getCwd(), scriptPath), restoredScriptPath)
    ? restoreResult.script.script
    : undefined;
}
//@ chunk-kd2wbncj.js:93075-93274 placement
/**
 * 确保恢复所需的脚本与日志已写回：拒绝时返回原因，已就绪返回 null，否则只写一次并返回写入结果。
 */
async function ensureResumeRestored(runId, scriptPath, storageRoot, signal, resumeProbes) {
  let probeResult = await probeWorkflowResume(runId, scriptPath, storageRoot, signal, resumeProbes);
  if (probeResult.kind === "refused") return probeResult.message;
  if (probeResult.kind === "ready") return null;
  probeResult.written ??= writeRestoredJournal(runId, storageRoot, probeResult).finally(() =>
    resumeProbes.probes.delete(runId),
  );
  return probeResult.written;
}
//@ chunk-kd2wbncj.js:93274-93721 placement
/**
 * 把恢复得到的工作流脚本写回本地脚本目录（已存在则忽略），并在本地日志未完整时写入恢复的条目；失败返回错误文字，成功返回 null。
 */
async function writeRestoredJournal(runId, storageRoot, { entries, script }) {
  if (script) {
    let scriptsDir = workflowScriptsDir();
    try {
      await mkdir(scriptsDir, {
        recursive: true,
        mode: 448,
      });
      await writeNewFile(join(scriptsDir, script.fileName), script.script, 384);
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST")
        logForDebugging(`Failed to restore a workflow script: ${error}`, {
          level: "warn",
        });
    }
  }
  if (entries === undefined) return null;
  let journal = new LocalFileJournal(runId, storageRoot);
  try {
    if ((await journal.restoreState()) === "complete") return null;
    await journal.writeRestored(entries);
  } catch (error) {
    return `Could not restore the journal for workflow run ${runId}: ${errorMessage(error)}`;
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
