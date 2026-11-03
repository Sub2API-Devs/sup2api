/**
 * components/fleet/sessionAttention.ts
 *
 * 2.1.316 新增：Fleet 视图中会话需要关注的原因（等待权限、计划审批、云环境失败等）归类与描述
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 15
 */
import {
  truncateWithEllipsis as truncateWithEllipsis_3,
  MAX_HEADLINE_LENGTH,
} from "../../services/sessionStatus/sessionStateClassifier.js";
import { createSignal } from "../../utils/signal.js";
import { sanitizeDisplayText, replaceControlChars } from "../../utils/resultError.js";
import { toWellFormedString, truncateToLength } from "../../utils/stringUtils.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { terminalOutcome, SEED_DETAIL } from "../../services/daemon/jobState.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { UNIQUENESS_REFINE_2 } from "../../tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { EXITPLANMODE } from "../../tools/ExitPlanModeTool/constants.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { describeCloudSession } from "../../utils/telemetry/memorySummary.js";

//@ chunk-e6aww6q8.js:1723680-1724267 placement
/**
 * 解析 AskUserQuestion 的输入：取问题与选项，生成 “answer: 问题 (选项…)” 摘要。
 */
function summarizePendingQuestions(e) {
  let n = typeof e === "object" && e !== null ? e : undefined;
  let questions = Array.isArray(n?.questions) ? n.questions : [];
  let s = [];
  let h = "";
  for (let question of questions) {
    let L = question;
    if (typeof L?.question !== "string") continue;
    h ||= L.question;
    let G = Array.isArray(L.options)
      ? L.options.flatMap((option) => {
          let Z = option;
          return typeof Z?.label === "string"
            ? [
                {
                  label: Z.label,
                  description: typeof Z.description === "string" ? Z.description : "",
                },
              ]
            : [];
        })
      : [];
    if (G.length > 0)
      s.push({
        question: L.question,
        options: G,
      });
  }
  let joined = s[0]?.options.map((option) => option.label).join(" \xB7 ");
  return {
    text: h ? truncateAttentionText(`answer: ${h}${joined ? ` (${joined})` : ""}`) : "answer question",
    questions: s.length > 0 ? s : undefined,
  };
}
//@ chunk-e6aww6q8.js:1724267-1724325 placement
/**
 * 函数 truncateAttentionText（压缩空白后按上限截断）。
 */
function truncateAttentionText(e) {
  return truncateWithEllipsis_3(e.replace(/\s+/g, " ").trim(), MAX_HEADLINE_LENGTH);
}
//@ chunk-e6aww6q8.js:1724325-1724393 placement
/**
 * 函数 looksLikeApproveLine（文本是否以 "approve …" 开头）。
 */
function looksLikeApproveLine(needs) {
  return needs !== undefined && /(?:^| \u00B7 )approve /.test(needs);
}
//@ chunk-e6aww6q8.js:1724393-1725885 placement
/**
 * Fleet 中"需要关注"种类（权限、对话框、elicitation、托管设置等）到显示文字的对照表。
 */
var ATTENTION_KIND_LABELS = [
  "elicitation",
  "sandbox",
  "managed-settings",
  "permission",
  "dialog",
  "elicitation-queued",
  "sandbox-queued",
];
var attentionRegistryStore = (() => {
  let signal = createSignal();
  let n = {
    sandbox: null,
    "sandbox-queued": null,
    permission: null,
    elicitation: null,
    "elicitation-queued": null,
    "managed-settings": null,
    dialog: null,
  };
  let r = null;
  let s = new Map();
  let opened = 0;
  let y = null;
  function S() {
    let ke;
    for (let we of s.values()) {
      if (we.order === y) return we.block;
      if (
        ke === undefined ||
        (we.onTop ? !ke.onTop || we.opened > ke.opened : !ke.onTop && we.order < ke.order)
      )
        ke = we;
    }
    return ke?.block ?? null;
  }
  let w = 8;
  let L = 240;
  let G = new Map();
  function q(ke) {
    return truncateWithEllipsis_3(
      ke
        .replace(/[^\x20-\x7e]/g, " ")
        .replace(/ {2,}/g, " ")
        .trim(),
      L,
    );
  }
  function Z(ke) {
    let we = ke.toolUseID === undefined ? undefined : G.get(ke.toolUseID);
    return we === undefined
      ? ke
      : {
          ...ke,
          text: truncateAttentionText(`${q(we)} \xB7 ${ke.text}`),
        };
  }
  function Se() {
    let ke = null;
    for (let we of ATTENTION_KIND_LABELS) {
      let Ee = n[we];
      if (Ee) {
        ke = Z(Ee);
        break;
      }
    }
    if (ke?.text === r?.text) return;
    r = ke;
    signal.emit(ke);
  }
  return {
    subscribe: signal.subscribe,
    current() {
      return r;
    },
    emit(ke, we = "permission") {
      let Ee =
        ke === null
          ? null
          : typeof ke === "string"
            ? {
                text: ke,
              }
            : ke;
      if (we === "permission" && Ee === null) {
        s.clear();
        y = null;
      }
      if (n[we]?.text === Ee?.text) return;
      n[we] = Ee;
      Se();
    },
    openAsk(ke, we) {
      opened += 1;
      s.set(ke.toolUseID, {
        block: ke,
        ...we,
        opened,
      });
      n.permission = S();
      Se();
    },
    showAsk(ke) {
      if (ke === y) return;
      y = ke;
      n.permission = S();
      Se();
    },
    closeAsk(ke) {
      if (!s.delete(ke)) return;
      n.permission = S();
      Se();
    },
    noteHookFailure(ke, we) {
      G.delete(ke);
      G.set(ke, we);
      if (G.size > w) {
        let toolUseID = n.permission?.toolUseID;
        for (let key of G.keys())
          if (key !== toolUseID) {
            G.delete(key);
            break;
          }
      }
      Se();
    },
    clearHookFailure(ke) {
      G.delete(ke);
    },
  };
})();
//@ chunk-e6aww6q8.js:1725885-1726095 placement
/**
 * 清理控制字符与零宽字素，按长度上限截断并加省略号。
 */
function sanitizeAttentionText(e) {
  if (typeof e !== "string") return "";
  let n = sanitizeDisplayText(
    replaceControlChars(toWellFormedString(truncateToLength(e, 4 * MAX_HEADLINE_LENGTH))),
  );
  let r = e.length > 4 * MAX_HEADLINE_LENGTH || n.length > MAX_HEADLINE_LENGTH - 2;
  let s = "";
  for (let { segment } of getGraphemeSegmenter().segment(
    r ? truncateToLength(n, MAX_HEADLINE_LENGTH - 2) : n,
  ))
    s += bunStringWidth(segment) === 0 ? " " : segment;
  return sanitizeDisplayText(r ? `${s} \u2026` : s);
}
//@ chunk-e6aww6q8.js:1726095-1726119 placement
/**
 * 函数 returnFalseAttention（恒 false）。
 */
function returnFalseAttention() {
  return false;
}
//@ chunk-e6aww6q8.js:1726119-1726150 placement
/**
 * 函数 emptyMergedJobs（恒返回空数组）。
 */
async function emptyMergedJobs(e) {
  return [];
}
//@ chunk-e6aww6q8.js:1726150-1726264 placement
/**
 * 云会话列表遍历中途失败，携带已获取的行。
 */
class CloudListPartialError_2 extends Error {
  rows;
  constructor(rows, cause) {
    super("the cloud list walk failed part way", {
      cause,
    });
    this.rows = rows;
  }
}
//@ chunk-e6aww6q8.js:1726264-1726289 placement
/**
 * 类 CloudListPartialError（云会话列表中途失败，携带已取到的行）。
 */
class CloudListPartialError extends Error {}
//@ chunk-e6aww6q8.js:1726289-1727689 placement
/**
 * 为 Fleet 视图描述会话需要用户处理的事项（审批计划、批准工具、阻塞等）。
 */
function describeSessionAttention(e) {
  let { state, tempo, reason } = describeSessionFailure(e);
  let sources = e.config?.sources;
  let y = sanitizeAttentionText(
    Array.isArray(sources) ? sources.find((source) => source?.type === "git_repository")?.url : undefined,
  );
  let S = sanitizeAttentionText(e.title);
  let postTurnSummary = e.external_metadata?.post_turn_summary;
  let L =
    sanitizeStatusDetail(postTurnSummary?.status_detail) ||
    sanitizeStatusDetail(e.external_metadata?.task_summary);
  let G =
    terminalOutcome(state) === "success" && postTurnSummary?.reply === undefined
      ? sanitizeStatusDetail(postTurnSummary?.recent_action)
      : "";
  let q = sanitizeStatusDetail(postTurnSummary?.needs_action);
  let outcomes = e.config?.outcomes;
  let gitInfo = Array.isArray(outcomes)
    ? outcomes.find((outcome) => outcome?.type === "git_repository")?.git_info
    : undefined;
  let pendingAction = e.worker_status === "requires_action" ? e.external_metadata?.pending_action : undefined;
  let we =
    [pendingAction?.display_tool_name, pendingAction?.tool_name]
      .map(sanitizeAttentionText)
      .find((Ie) => /^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(Ie)) ?? "a tool";
  let Ee = sanitizeAttentionText(pendingAction?.action_description);
  let needs =
    tempo === "blocked"
      ? pendingAction?.tool_name === ASKUSERQUESTION
        ? summarizePendingQuestions(UNIQUENESS_REFINE_2(pendingAction.input)).text
        : pendingAction?.tool_name === EXITPLANMODE
          ? "approve plan"
          : typeof pendingAction?.tool_name === "string" && Ee !== ""
            ? truncateAttentionText(
                pendingAction.tool_name.startsWith("dialog:")
                  ? `awaiting input: ${Ee}`
                  : `approve ${we}: ${Ee}`,
              )
            : truncateAttentionText(q ? `awaiting input: ${q}` : "awaiting input")
      : undefined;
  return {
    state,
    detail:
      reason ||
      L ||
      truncateAttentionText(
        [gitInfo?.repo, Array.isArray(gitInfo?.branches) ? gitInfo.branches[0] : undefined]
          .map(sanitizeStatusDetail)
          .filter((Ie) => Ie !== "")
          .join(" \xB7 "),
      ) ||
      "no summary yet",
    tempo,
    needs,
    output: G
      ? {
          result: G,
        }
      : null,
    children: null,
    linkScanOffset: 0,
    template: "remote",
    respawnFlags: [],
    name: S || undefined,
    intent: sanitizeAttentionText(e.id),
    sessionId: e.id,
    cwd: y || "remote",
    originCwd: y || "remote",
    createdAt: e.created_at,
    updatedAt: e.last_event_at ?? e.created_at,
    firstTerminalAt: null,
    backend: "remote",
  };
}
//@ chunk-e6aww6q8.js:1727689-1727973 placement
/**
 * 把尚未出现在列表里的 remote-pending 会话追加进来；内容不变时返回原数组。
 */
function mergePendingRemoteJobs(e, n) {
  let r = new Set(n.map((y) => sessionIdBody(y.state.sessionId)));
  let filtered = e.filter(
    (y) => y.id.startsWith("remote-pending-") && !r.has(sessionIdBody(y.state.sessionId)),
  );
  let h = [...n, ...filtered];
  return e.length === h.length &&
    e.every(
      (y, S) =>
        y.id === h[S].id && y.activity === h[S].activity && true && shallowJobStateEqual(y.state, h[S].state),
    )
    ? e
    : h;
}
//@ chunk-e6aww6q8.js:1727973-1728205 placement
/**
 * 浅比较会话状态（对象值用 Bun.deepEquals）。
 */
function shallowJobStateEqual(state, state_2) {
  let keys = Object.keys(state);
  if (keys.length !== Object.keys(state_2).length) return false;
  return keys.every((s) => {
    let h = state[s];
    let y = state_2[s];
    if (h === y) return true;
    return typeof h === "object" && typeof y === "object" && h !== null && y !== null && Bun.deepEquals(h, y);
  });
}
//@ chunk-e6aww6q8.js:1728205-1728285 placement
function isPausedNeedingAction(e) {
  return e.status === "paused" && e.worker_status === "requires_action";
}
//@ chunk-e6aww6q8.js:1728285-1729506 placement
/**
 * 为 Fleet 视图描述一个会话失败的原因（如云环境启动失败）。
 */
function describeSessionFailure(e) {
  let startupFailure = describeCloudSession(e).startup_failure;
  if (startupFailure !== undefined) {
    let message = e.external_metadata?.last_init_error?.message;
    let s = typeof message === "string" && message.length > 4000 && !startupFailure.endsWith("\u2026");
    return {
      state: "failed",
      tempo: "idle",
      reason:
        sanitizeAttentionText(s ? `${startupFailure} \u2026` : startupFailure) ||
        "the cloud environment failed to start",
    };
  }
  if (e.worker_status === "requires_action")
    return {
      state: isPausedNeedingAction(e) ? "blocked" : "working",
      tempo: "blocked",
    };
  if (e.worker_status === "idle" || e.status === "paused")
    switch (e.status_bucket) {
      case "blocked":
        return {
          state: "blocked",
          tempo: "blocked",
        };
      case "failed":
        return {
          state: "failed",
          tempo: "idle",
          reason:
            sanitizeStatusDetail(e.external_metadata?.post_turn_summary?.status_detail) ||
            "the last turn failed",
        };
      case "working":
        return {
          state: "working",
          tempo: "active",
        };
      case "completed":
        return {
          state: "done",
          tempo: "idle",
        };
      default:
        return e.worker_status === "idle"
          ? {
              state: "done",
              tempo: "idle",
            }
          : {
              state: "stopped",
              tempo: "idle",
              reason: "paused \xB7 reply to resume",
            };
    }
  if (e.worker_status === "running" && e.connection_status === "disconnected")
    return {
      state: "stopped",
      tempo: "idle",
      reason: "lost contact with the cloud environment",
    };
  if (
    e.worker_status === undefined ||
    e.worker_status === null ||
    e.worker_status === "WORKER_STATUS_UNSPECIFIED"
  )
    return {
      state: "working",
      tempo: "active",
      reason: SEED_DETAIL,
    };
  return {
    state: "working",
    tempo: "active",
  };
}
//@ chunk-e6aww6q8.js:1729506-1729603 placement
function sanitizeStatusDetail(e) {
  let n = sanitizeAttentionText(e);
  return /[\p{L}\p{N}]/u.test(n) && !n.startsWith("[ede_diagnostic]") ? n : "";
}
export {
  attentionRegistryStore,
  truncateAttentionText,
  returnFalseAttention,
  CloudListPartialError_2,
  CloudListPartialError,
  sanitizeAttentionText,
  emptyMergedJobs,
  describeSessionAttention,
  mergePendingRemoteJobs,
  looksLikeApproveLine,
  summarizePendingQuestions,
};
