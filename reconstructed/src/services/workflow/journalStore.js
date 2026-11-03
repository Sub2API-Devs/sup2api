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
import { No } from "./journalEntries.js";
import { G$ } from "../../utils/agentId.js";
import { logForDebugging } from "../../utils/debug.js";
import { LocalFileJournal } from "./localFileJournal.js";
import { getSessionId } from "../../bootstrap/state.js";
import { sfn } from "../../utils/sessionStorage.js";

//@ chunk-41w44bgm.js:96223-96318 placement
var WORKFLOW_JOURNAL = "workflow-journal",
  WORKFLOW_SCRIPT = "workflow-script",
  Ni = /^[a-z0-9_-]+\.js$/,
  Fi = /^v\d+:[0-9a-f]{64}$/;
//@ chunk-41w44bgm.js:96318-96377 placement
function ps(e, n) {
  return Ni.test(e) && e.endsWith(`-${n}.js`);
}
/**
 * 校验并规范一条工作流 journal 条目（launched / started / result / failed），key 与 agentId 格式不对或类型未知返回 undefined。
 */
//@ chunk-41w44bgm.js:96377-97169 placement
function parseJournalEntry(e) {
  if (!isPlainObject(e)) return;
  if (e.type === "launched") {
    let T = No(e.hiddenScriptSha256);
    return T === void 0 ? { type: "launched" } : { type: "launched", hiddenScriptSha256: T };
  }
  let { key: key, agentId: agentId } = e,
    h = e.type === "failed" || e.type === "result";
  if (
    typeof key !== "string" ||
    !Fi.test(key) ||
    typeof agentId !== "string" ||
    !(G$(agentId) || (h && agentId === ""))
  )
    return;
  switch (e.type) {
    case "started": {
      let { remoteSessionId: remoteSessionId } = e;
      if (remoteSessionId === void 0) return { type: "started", key: key, agentId: agentId };
      return typeof remoteSessionId === "string" && G$(remoteSessionId)
        ? { type: "started", key: key, agentId: agentId, remoteSessionId: remoteSessionId }
        : void 0;
    }
    case "result":
      return {
        type: "result",
        key: key,
        agentId: agentId,
        result: e.result,
        ...(e.foreignArtifactContent === !0 && { foreignArtifactContent: !0 }),
        ...(Array.isArray(e.toolsUsed) && { toolsUsed: e.toolsUsed.filter((T) => typeof T === "string") }),
      };
    case "failed":
      return { type: "failed", key: key, agentId: agentId };
    default:
      return;
  }
}
//@ chunk-41w44bgm.js:97169-97247 placement
function to(e) {
  logForDebugging(`Failed to mirror workflow run to CCR: ${e}`, { level: "warn" });
}
/**
 * 创建本地文件日志，并在每次追加时把条目镜像到远程存储（失败只记录）。
 */
//@ chunk-41w44bgm.js:97247-97411 placement
function createMirroredJournal(e, n) {
  let r = new LocalFileJournal(e, n),
    h = getSessionId();
  return {
    load: () => r.load(),
    async append(T) {
      (await r.append(T),
        sfn()?.mirror(WORKFLOW_JOURNAL, { entry: T }, { sessionId: h, agentId: e }).catch(to));
    },
  };
}
//@ chunk-41w44bgm.js:97411-97420 placement
var ji = 2;
//@ chunk-41w44bgm.js:97420-97648 placement
async function appendLaunchMarkOnResume(e, n) {
  for (let r = 0; r < ji; r++) {
    if ((await e.load()).hiddenScriptSha256 !== void 0) return;
    await e.append(n);
  }
  if ((await e.load()).hiddenScriptSha256 === void 0)
    throw Error("the journal holds no mark after it was written");
}
/**
 * 打开带隐藏脚本哈希标记的 journal：写入 launched 标记（恢复时确保只写一次），首个标记镜像成功后，后续追加也镜像到会话存储。
 */
//@ chunk-41w44bgm.js:97648-98035 placement
async function openHiddenScriptJournal(e) {
  let { runId: runId } = e,
    r = { type: "launched", hiddenScriptSha256: e.hiddenScriptSha256 },
    h = new LocalFileJournal(runId, e.storageV5),
    T = { sessionId: getSessionId(), agentId: runId };
  await (e.isResume ? appendLaunchMarkOnResume(h, r) : h.append(r));
  let y =
    sfn()
      ?.mirror(WORKFLOW_JOURNAL, { entry: r }, T)
      .catch((A) => (to(A), !1)) ?? Promise.resolve(!1);
  return {
    load: () => h.load(),
    async append(A) {
      (await h.append(A),
        y.then((L) => {
          if (L) sfn()?.mirror(WORKFLOW_JOURNAL, { entry: A }, T).catch(to);
        }));
    },
  };
}

export {
  ps,
  WORKFLOW_SCRIPT,
  to,
  WORKFLOW_JOURNAL,
  parseJournalEntry,
  openHiddenScriptJournal,
  createMirroredJournal,
};
