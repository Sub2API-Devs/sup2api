/**
 * services/workflow/journalStore.ts
 *
 * 2.1.316 新增：工作流日志存储
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41w44bgm.js (8)
 * attribution: placement 8
 */
import { isPlainObject } from "../../utils/isPlainObject.js";
import { textOrUnreadable } from "./journalEntries.js";
import { isSafeIdSegment } from "../../utils/agentId.js";
import { logForDebugging } from "../../utils/debug.js";
import { LocalFileJournal } from "./localFileJournal.js";
import { getSessionId } from "../../bootstrap/state.js";
import { storagePort } from "../../utils/sessionStorage.js";

//@ chunk-41w44bgm.js:96223-96318 placement
/**
 * 工作流 journal 存储用的常量：两个存储键，以及脚本文件名与脚本引用正则。
 */
var WORKFLOW_JOURNAL = "workflow-journal";
var WORKFLOW_SCRIPT = "workflow-script";
var WORKFLOW_SCRIPT_FILE_REGEX = /^[a-z0-9_-]+\.js$/;
var WORKFLOW_SCRIPT_REF_REGEX = /^v\d+:[0-9a-f]{64}$/;
//@ chunk-41w44bgm.js:96318-96377 placement
/**
 * 判断文件名是否是给定工作流的脚本文件。
 */
function isWorkflowScriptFileFor(fileName, runId) {
  return WORKFLOW_SCRIPT_FILE_REGEX.test(fileName) && fileName.endsWith(`-${runId}.js`);
}
//@ chunk-41w44bgm.js:96377-97169 placement
/**
 * 校验并规范一条工作流 journal 条目（launched / started / result / failed），key 与 agentId 格式不对或类型未知返回 undefined。
 */
function parseJournalEntry(entry) {
  if (!isPlainObject(entry)) return;
  if (entry.type === "launched") {
    let sha = textOrUnreadable(entry.hiddenScriptSha256);
    return sha === undefined
      ? {
          type: "launched",
        }
      : {
          type: "launched",
          hiddenScriptSha256: sha,
        };
  }
  let { key, agentId } = entry;
  let isTerminalType = entry.type === "failed" || entry.type === "result";
  if (
    typeof key !== "string" ||
    !WORKFLOW_SCRIPT_REF_REGEX.test(key) ||
    typeof agentId !== "string" ||
    !(isSafeIdSegment(agentId) || (isTerminalType && agentId === ""))
  )
    return;
  switch (entry.type) {
    case "started": {
      let { remoteSessionId } = entry;
      if (remoteSessionId === undefined)
        return {
          type: "started",
          key,
          agentId,
        };
      return typeof remoteSessionId === "string" && isSafeIdSegment(remoteSessionId)
        ? {
            type: "started",
            key,
            agentId,
            remoteSessionId,
          }
        : undefined;
    }
    case "result":
      return {
        type: "result",
        key,
        agentId,
        result: entry.result,
        ...(entry.foreignArtifactContent === true && {
          foreignArtifactContent: true,
        }),
        ...(Array.isArray(entry.toolsUsed) && {
          toolsUsed: entry.toolsUsed.filter((toolName) => typeof toolName === "string"),
        }),
      };
    case "failed":
      return {
        type: "failed",
        key,
        agentId,
      };
    default:
      return;
  }
}
//@ chunk-41w44bgm.js:97169-97247 placement
/**
 * 镜像工作流运行到 CCR 失败时记一条警告。
 */
function logJournalMirrorFailure(error) {
  logForDebugging(`Failed to mirror workflow run to CCR: ${error}`, {
    level: "warn",
  });
}
//@ chunk-41w44bgm.js:97247-97411 placement
/**
 * 创建本地文件日志，并在每次追加时把条目镜像到远程存储（失败只记录）。
 */
function createMirroredJournal(workflowRunId, storageV5) {
  let journal = new LocalFileJournal(workflowRunId, storageV5);
  let sessionId = getSessionId();
  return {
    load: () => journal.load(),
    async append(entry) {
      await journal.append(entry);
      storagePort()
        ?.mirror(
          WORKFLOW_JOURNAL,
          {
            entry,
          },
          {
            sessionId,
            agentId: workflowRunId,
          },
        )
        .catch(logJournalMirrorFailure);
    },
  };
}
//@ chunk-41w44bgm.js:97411-97420 placement
/**
 * 恢复时补写 launched 标记的最多尝试次数。
 */
var LAUNCH_MARK_APPEND_ATTEMPTS = 2;
//@ chunk-41w44bgm.js:97420-97648 placement
async function appendLaunchMarkOnResume(journal, markEntry) {
  for (let j = 0; j < LAUNCH_MARK_APPEND_ATTEMPTS; j++) {
    if ((await journal.load()).hiddenScriptSha256 !== undefined) return;
    await journal.append(markEntry);
  }
  if ((await journal.load()).hiddenScriptSha256 === undefined)
    throw Error("the journal holds no mark after it was written");
}
//@ chunk-41w44bgm.js:97648-98035 placement
/**
 * 打开带隐藏脚本哈希标记的 journal：写入 launched 标记（恢复时确保只写一次），首个标记镜像成功后，后续追加也镜像到会话存储。
 */
async function openHiddenScriptJournal(options) {
  let { runId } = options;
  let markEntry = {
    type: "launched",
    hiddenScriptSha256: options.hiddenScriptSha256,
  };
  let journal = new LocalFileJournal(runId, options.storageV5);
  let mirrorScope = {
    sessionId: getSessionId(),
    agentId: runId,
  };
  await (options.isResume ? appendLaunchMarkOnResume(journal, markEntry) : journal.append(markEntry));
  let firstMirror =
    storagePort()
      ?.mirror(
        WORKFLOW_JOURNAL,
        {
          entry: markEntry,
        },
        mirrorScope,
      )
      .catch((error) => {
        logJournalMirrorFailure(error);
        return false;
      }) ?? Promise.resolve(false);
  return {
    load: () => journal.load(),
    async append(entry) {
      await journal.append(entry);
      firstMirror.then((mirrored) => {
        if (mirrored)
          storagePort()
            ?.mirror(
              WORKFLOW_JOURNAL,
              {
                entry,
              },
              mirrorScope,
            )
            .catch(logJournalMirrorFailure);
      });
    },
  };
}
export {
  isWorkflowScriptFileFor,
  WORKFLOW_SCRIPT,
  logJournalMirrorFailure,
  WORKFLOW_JOURNAL,
  parseJournalEntry,
  openHiddenScriptJournal,
  createMirroredJournal,
};
