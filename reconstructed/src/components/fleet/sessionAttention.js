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
  truncateWithEllipsis as truncateWithEllipsis_2,
  Hg,
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

/**
 * 解析 AskUserQuestion 的输入：取问题与选项，生成 “answer: 问题 (选项…)” 摘要。
 */
//@ chunk-e6aww6q8.js:1723680-1724267 placement
function summarizePendingQuestions(e) {
  let n = typeof e === "object" && e !== null ? e : void 0,
    r = Array.isArray(n?.questions) ? n.questions : [],
    s = [],
    h = "";
  for (let w of r) {
    let L = w;
    if (typeof L?.question !== "string") continue;
    h ||= L.question;
    let G = Array.isArray(L.options)
      ? L.options.flatMap((option) => {
          let Z = option;
          return typeof Z?.label === "string"
            ? [{ label: Z.label, description: typeof Z.description === "string" ? Z.description : "" }]
            : [];
        })
      : [];
    if (G.length > 0) s.push({ question: L.question, options: G });
  }
  let y = s[0]?.options.map((w) => w.label).join(" \xB7 ");
  return {
    text: h ? c6(`answer: ${h}${y ? ` (${y})` : ""}`) : "answer question",
    questions: s.length > 0 ? s : void 0,
  };
}
//@ chunk-e6aww6q8.js:1724267-1724325 placement
function c6(e) {
  return truncateWithEllipsis_2(e.replace(/\s+/g, " ").trim(), Hg);
}
//@ chunk-e6aww6q8.js:1724325-1724393 placement
function N6s(e) {
  return e !== void 0 && /(?:^| \u00B7 )approve /.test(e);
}
/**
 * Fleet 中"需要关注"种类（权限、对话框、elicitation、托管设置等）到显示文字的对照表。
 */
//@ chunk-e6aww6q8.js:1724393-1725885 placement
var ATTENTION_KIND_LABELS = [
    "elicitation",
    "sandbox",
    "managed-settings",
    "permission",
    "dialog",
    "elicitation-queued",
    "sandbox-queued",
  ],
  KE = (() => {
    let e = createSignal(),
      n = {
        sandbox: null,
        "sandbox-queued": null,
        permission: null,
        elicitation: null,
        "elicitation-queued": null,
        "managed-settings": null,
        dialog: null,
      },
      r = null,
      s = new Map(),
      h = 0,
      y = null;
    function S() {
      let ke;
      for (let we of s.values()) {
        if (we.order === y) return we.block;
        if (
          ke === void 0 ||
          (we.onTop ? !ke.onTop || we.opened > ke.opened : !ke.onTop && we.order < ke.order)
        )
          ke = we;
      }
      return ke?.block ?? null;
    }
    let w = 8,
      L = 240,
      G = new Map();
    function q(ke) {
      return truncateWithEllipsis_2(
        ke
          .replace(/[^\x20-\x7e]/g, " ")
          .replace(/ {2,}/g, " ")
          .trim(),
        L,
      );
    }
    function Z(ke) {
      let we = ke.toolUseID === void 0 ? void 0 : G.get(ke.toolUseID);
      return we === void 0 ? ke : { ...ke, text: c6(`${q(we)} \xB7 ${ke.text}`) };
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
      ((r = ke), e.emit(ke));
    }
    return {
      subscribe: e.subscribe,
      current() {
        return r;
      },
      emit(ke, we = "permission") {
        let Ee = ke === null ? null : typeof ke === "string" ? { text: ke } : ke;
        if (we === "permission" && Ee === null) (s.clear(), (y = null));
        if (n[we]?.text === Ee?.text) return;
        ((n[we] = Ee), Se());
      },
      openAsk(ke, we) {
        ((h += 1), s.set(ke.toolUseID, { block: ke, ...we, opened: h }), (n.permission = S()), Se());
      },
      showAsk(ke) {
        if (ke === y) return;
        ((y = ke), (n.permission = S()), Se());
      },
      closeAsk(ke) {
        if (!s.delete(ke)) return;
        ((n.permission = S()), Se());
      },
      noteHookFailure(ke, we) {
        if ((G.delete(ke), G.set(ke, we), G.size > w)) {
          let Ee = n.permission?.toolUseID;
          for (let Ae of G.keys())
            if (Ae !== Ee) {
              G.delete(Ae);
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
/**
 * 清理控制字符与零宽字素，按长度上限截断并加省略号。
 */
//@ chunk-e6aww6q8.js:1725885-1726095 placement
function sanitizeAttentionText(e) {
  if (typeof e !== "string") return "";
  let n = sanitizeDisplayText(replaceControlChars(toWellFormedString(truncateToLength(e, 4 * Hg)))),
    r = e.length > 4 * Hg || n.length > Hg - 2,
    s = "";
  for (let { segment: segment } of getGraphemeSegmenter().segment(r ? truncateToLength(n, Hg - 2) : n))
    s += bunStringWidth(segment) === 0 ? " " : segment;
  return sanitizeDisplayText(r ? `${s} \u2026` : s);
}
//@ chunk-e6aww6q8.js:1726095-1726119 placement
function $6s() {
  return !1;
}
//@ chunk-e6aww6q8.js:1726119-1726150 placement
async function F6s(e) {
  return [];
}
/**
 * 云会话列表遍历中途失败，携带已获取的行。
 */
//@ chunk-e6aww6q8.js:1726150-1726264 placement
class CloudListPartialError extends Error {
  rows;
  constructor(e, n) {
    super("the cloud list walk failed part way", { cause: n });
    this.rows = e;
  }
}
//@ chunk-e6aww6q8.js:1726264-1726289 placement
class P1o extends Error {}
/**
 * 为 Fleet 视图描述会话需要用户处理的事项（审批计划、批准工具、阻塞等）。
 */
//@ chunk-e6aww6q8.js:1726289-1727689 placement
function describeSessionAttention(e) {
  let { state: state, tempo: tempo, reason: reason } = describeSessionFailure(e),
    h = e.config?.sources,
    y = sanitizeAttentionText(Array.isArray(h) ? h.find((Ie) => Ie?.type === "git_repository")?.url : void 0),
    S = sanitizeAttentionText(e.title),
    w = e.external_metadata?.post_turn_summary,
    L = QK(w?.status_detail) || QK(e.external_metadata?.task_summary),
    G = terminalOutcome(state) === "success" && w?.reply === void 0 ? QK(w?.recent_action) : "",
    q = QK(w?.needs_action),
    Z = e.config?.outcomes,
    Se = Array.isArray(Z) ? Z.find((Ie) => Ie?.type === "git_repository")?.git_info : void 0,
    ke = e.worker_status === "requires_action" ? e.external_metadata?.pending_action : void 0,
    we =
      [ke?.display_tool_name, ke?.tool_name]
        .map(sanitizeAttentionText)
        .find((Ie) => /^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(Ie)) ?? "a tool",
    Ee = sanitizeAttentionText(ke?.action_description),
    Ae =
      tempo === "blocked"
        ? ke?.tool_name === ASKUSERQUESTION
          ? summarizePendingQuestions(UNIQUENESS_REFINE_2(ke.input)).text
          : ke?.tool_name === EXITPLANMODE
            ? "approve plan"
            : typeof ke?.tool_name === "string" && Ee !== ""
              ? c6(ke.tool_name.startsWith("dialog:") ? `awaiting input: ${Ee}` : `approve ${we}: ${Ee}`)
              : c6(q ? `awaiting input: ${q}` : "awaiting input")
        : void 0;
  return {
    state: state,
    detail:
      reason ||
      L ||
      c6(
        [Se?.repo, Array.isArray(Se?.branches) ? Se.branches[0] : void 0]
          .map(QK)
          .filter((Ie) => Ie !== "")
          .join(" \xB7 "),
      ) ||
      "no summary yet",
    tempo: tempo,
    needs: Ae,
    output: G ? { result: G } : null,
    children: null,
    linkScanOffset: 0,
    template: "remote",
    respawnFlags: [],
    name: S || void 0,
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
/**
 * 把尚未出现在列表里的 remote-pending 会话追加进来；内容不变时返回原数组。
 */
//@ chunk-e6aww6q8.js:1727689-1727973 placement
function mergePendingRemoteJobs(e, n) {
  let r = new Set(n.map((y) => sessionIdBody(y.state.sessionId))),
    filtered = e.filter(
      (y) => y.id.startsWith("remote-pending-") && !r.has(sessionIdBody(y.state.sessionId)),
    ),
    h = [...n, ...filtered];
  return e.length === h.length &&
    e.every(
      (y, S) =>
        y.id === h[S].id && y.activity === h[S].activity && !0 && shallowJobStateEqual(y.state, h[S].state),
    )
    ? e
    : h;
}
/**
 * 浅比较会话状态（对象值用 Bun.deepEquals）。
 */
//@ chunk-e6aww6q8.js:1727973-1728205 placement
function shallowJobStateEqual(e, n) {
  let keys = Object.keys(e);
  if (keys.length !== Object.keys(n).length) return !1;
  return keys.every((s) => {
    let h = e[s],
      y = n[s];
    if (h === y) return !0;
    return typeof h === "object" && typeof y === "object" && h !== null && y !== null && Bun.deepEquals(h, y);
  });
}
//@ chunk-e6aww6q8.js:1728205-1728285 placement
function w9o(e) {
  return e.status === "paused" && e.worker_status === "requires_action";
}
/**
 * 为 Fleet 视图描述一个会话失败的原因（如云环境启动失败）。
 */
//@ chunk-e6aww6q8.js:1728285-1729506 placement
function describeSessionFailure(e) {
  let startup_failure = describeCloudSession(e).startup_failure;
  if (startup_failure !== void 0) {
    let r = e.external_metadata?.last_init_error?.message,
      s = typeof r === "string" && r.length > 4000 && !startup_failure.endsWith("\u2026");
    return {
      state: "failed",
      tempo: "idle",
      reason:
        sanitizeAttentionText(s ? `${startup_failure} \u2026` : startup_failure) ||
        "the cloud environment failed to start",
    };
  }
  if (e.worker_status === "requires_action")
    return { state: w9o(e) ? "blocked" : "working", tempo: "blocked" };
  if (e.worker_status === "idle" || e.status === "paused")
    switch (e.status_bucket) {
      case "blocked":
        return { state: "blocked", tempo: "blocked" };
      case "failed":
        return {
          state: "failed",
          tempo: "idle",
          reason: QK(e.external_metadata?.post_turn_summary?.status_detail) || "the last turn failed",
        };
      case "working":
        return { state: "working", tempo: "active" };
      case "completed":
        return { state: "done", tempo: "idle" };
      default:
        return e.worker_status === "idle"
          ? { state: "done", tempo: "idle" }
          : { state: "stopped", tempo: "idle", reason: "paused \xB7 reply to resume" };
    }
  if (e.worker_status === "running" && e.connection_status === "disconnected")
    return { state: "stopped", tempo: "idle", reason: "lost contact with the cloud environment" };
  if (
    e.worker_status === void 0 ||
    e.worker_status === null ||
    e.worker_status === "WORKER_STATUS_UNSPECIFIED"
  )
    return { state: "working", tempo: "active", reason: SEED_DETAIL };
  return { state: "working", tempo: "active" };
}
//@ chunk-e6aww6q8.js:1729506-1729603 placement
function QK(e) {
  let n = sanitizeAttentionText(e);
  return /[\p{L}\p{N}]/u.test(n) && !n.startsWith("[ede_diagnostic]") ? n : "";
}

export {
  KE,
  c6,
  $6s,
  CloudListPartialError,
  P1o,
  sanitizeAttentionText,
  F6s,
  describeSessionAttention,
  mergePendingRemoteJobs,
  N6s,
  summarizePendingQuestions,
};
