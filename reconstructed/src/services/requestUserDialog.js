/**
 * services/requestUserDialog.ts
 *
 * 2.1.316 新增：请求用户对话框（可经 Remote Control 转发）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (17)
 * attribution: placement 17
 */
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { uiSignals } from "../state/uiSignals.js";
import { logForDebugging } from "../utils/debug.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, A, U } from "../../vendor/zod/v4/classic/schemas.js";
import { getUserDialogTimeoutMs } from "./api/refusalFallback.js";

//@ chunk-hwmsct5x.js:193981-194030 placement
var hXo = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])$/i;
//@ chunk-hwmsct5x.js:194030-194085 placement
function hi(e) {
  return e !== void 0 && hXo.test(e) ? e : void 0;
}
/**
 * 去掉对象中的 declineMessage 字段后返回。
 */
//@ chunk-hwmsct5x.js:194122-194241 placement
function stripDeclineMessage(e) {
  if (typeof e === "object" && e !== null && "declineMessage" in e) {
    let { declineMessage: declineMessage, ...r } = e;
    return r;
  }
  return e;
}
/**
 * 标记屏幕上正在显示某种阻塞对话框。
 */
//@ chunk-hwmsct5x.js:194241-194356 placement
function markBlockingDialogShown(e) {
  uiSignals.onScreenBlockingDialog.setState((n) =>
    n.surfaceMounted && n.kind === e ? n : { surfaceMounted: !0, kind: e },
  );
}
/**
 * 清除阻塞对话框显示状态。
 */
//@ chunk-hwmsct5x.js:194356-194476 placement
function clearBlockingDialog() {
  uiSignals.onScreenBlockingDialog.setState((e) =>
    e.surfaceMounted || e.kind !== null ? { surfaceMounted: !1, kind: null } : e,
  );
}
//@ chunk-hwmsct5x.js:194476-194571 placement
function lAt(e) {
  let state = uiSignals.onScreenBlockingDialog.getState();
  return state.surfaceMounted && state.kind !== e;
}
//@ chunk-hwmsct5x.js:194571-194633 placement
function G8r(e) {
  return uiSignals.onScreenBlockingDialog.subscribe(e);
}
/**
 * 取消所有（或指定类型的）待处理用户对话请求：从表中删除、回调清理函数、以 cancelled 通知处理器，返回被取消的类型列表。
 */
//@ chunk-hwmsct5x.js:194633-194794 placement
function cancelPendingDialogs(e, n, r) {
  let s = [];
  for (let [h, y] of [...e]) {
    if (r !== void 0 && y.kind !== r) continue;
    (e.delete(h), n(h), y.handler({ behavior: "cancelled" }), s.push(y.kind));
  }
  return s;
}
/**
 * 以 detached 结束所有待处理的用户对话请求，返回数量。
 */
//@ chunk-hwmsct5x.js:194794-194897 placement
function detachPendingDialogs(e) {
  let n = 0;
  for (let [r, s] of [...e]) (e.delete(r), s.handler({ behavior: "detached" }), n++);
  return n;
}
/**
 * 判断对象是对话请求的终结响应（behavior 为 completed 或 cancelled）。
 */
//@ chunk-hwmsct5x.js:194897-195024 placement
function isDialogResponse(e) {
  if (!e || typeof e !== "object") return !1;
  return "behavior" in e && (e.behavior === "completed" || e.behavior === "cancelled");
}
/**
 * 把一次用户对话请求经桥接转发给客户端：生成请求 id、登记响应处理（completed 时校验结果、cancelled、detached），发送失败时撤销；返回 requestId 与 retire 函数（未响应时取消请求）。
 */
//@ chunk-hwmsct5x.js:195024-195539 placement
function forwardDialogToBridge({
  bridge: bridge,
  dialog: dialog,
  payload: payload,
  toolUseId: toolUseId,
  onSettled: onSettled,
}) {
  let requestId = randomUUID_2(),
    answered = !1,
    onResponse = bridge.onResponse(requestId, dialog.kind, (R) => {
      switch (R.behavior) {
        case "completed": {
          answered = !0;
          let safeParse = dialog.result().safeParse(R.result);
          onSettled(
            safeParse.success
              ? { kind: "answered", result: stripDeclineMessage(safeParse.data) }
              : { kind: "malformed" },
          );
          return;
        }
        case "cancelled":
          ((answered = !0), onSettled({ kind: "cancelled" }));
          return;
        case "detached":
          onSettled({ kind: "detached" });
          return;
      }
    });
  if (!bridge.sendRequest(requestId, dialog.kind, payload, toolUseId)) {
    (bridge.cancelRequest(requestId), onResponse());
    return;
  }
  let E = !1;
  return {
    requestId: requestId,
    retire: () => {
      if (E) return;
      if (((E = !0), !answered)) bridge.cancelRequest(requestId);
      onResponse();
    },
  };
}
/**
 * 同时在本地与桥接客户端发起用户对话请求，先回答者为准：桥接回答/格式错误/取消都落到默认值处理，detached 时取消超时；可设置无人应答的停泊超时（屏幕有阻塞对话时顺延）；本地被认领时撤回桥接请求。返回结果与来源（local/bridge/timeout）。
 */
//@ chunk-hwmsct5x.js:195539-196883 placement
async function requestUserDialogRaced(options) {
  let {
    requestDialog: requestDialog,
    dialog: dialog,
    payload: payload,
    signal: signal,
    bridge: bridge,
    parkTimeoutMs: parkTimeoutMs,
  } = options;
  if (signal.aborted) return { result: dialog.default, source: "local" };
  let abortController = new AbortController(),
    E = () => abortController.abort(signal.reason);
  signal.addEventListener("abort", E, { once: !0 });
  let R,
    parkTimer,
    resolveRemote = () => {},
    promise = new Promise((J) => {
      resolveRemote = J;
    }),
    forwarded = forwardDialogToBridge({
      bridge: bridge,
      dialog: dialog,
      payload: payload,
      onSettled: (J) => {
        switch (J.kind) {
          case "answered":
            resolveRemote({ result: J.result, source: "bridge" });
            return;
          case "malformed":
            (logForDebugging(
              `[bridge] request_user_dialog ${dialog.kind}: unreadable result from client, settling as default`,
              { level: "warn" },
            ),
              resolveRemote({ result: dialog.default, source: "bridge" }));
            return;
          case "cancelled":
            resolveRemote({ result: dialog.default, source: "bridge" });
            return;
          case "detached":
            (clearTimeout(parkTimer), R?.());
            return;
        }
      },
    }),
    H = () => {
      (clearTimeout(parkTimer), R?.(), forwarded?.retire());
    },
    j = {
      ...options.localOpts,
      localOnly: !0,
      signal: abortController.signal,
      onClaimed: () => {
        (H(), options.localOpts?.onClaimed?.());
      },
    };
  if (forwarded === void 0) {
    let J = await requestDialog(dialog, payload, j);
    return (signal.removeEventListener("abort", E), { result: J, source: "local" });
  }
  options.onForwarded?.(forwarded.requestId);
  let armParkTimer = () => {
    if (parkTimeoutMs <= 0) return;
    parkTimer = setTimeout(
      (J, Z, Q, ne) => {
        if (lAt(J)) {
          ne();
          return;
        }
        Q({ result: Z, source: "timeout" });
      },
      parkTimeoutMs,
      dialog.kind,
      dialog.default,
      resolveRemote,
      armParkTimer,
    );
  };
  if ((armParkTimer(), parkTimeoutMs > 0)) {
    let J = lAt(dialog.kind);
    R = G8r(() => {
      let Z = lAt(dialog.kind);
      if (J && !Z) (clearTimeout(parkTimer), armParkTimer());
      J = Z;
    });
  }
  let localPromise = requestDialog(dialog, payload, j).then((J) => ({ result: J, source: "local" })),
    winner = await Promise.race([localPromise, promise]);
  if ((H(), signal.removeEventListener("abort", E), winner.source !== "local")) abortController.abort();
  return winner;
}
/**
 * 拒绝回退提示对话的声明：载荷（原模型、回退模型、拒绝类别、指导文本、相关已流出消息 uuid）与结果（retry_fallback/edit_prompt/cancelled），默认 cancelled。
 */
//@ chunk-hwmsct5x.js:196883-197450 placement
var REFUSAL_FALLBACK_DIALOG = withHideWhile({
  kind: "refusal_fallback_prompt",
  payload: DoctorLazy(() =>
    u({
      originalModel: o(),
      fallbackModel: o(),
      apiRefusalCategory: o().nullable().optional(),
      guidanceText: o().optional(),
      retractedMessageUuids: A(o())
        .optional()
        .describe(
          "Wire uuids of the already-streamed messages this refusal concerns. Evict on RESOLUTION (your own response \u2014 any choice \u2014 or control_cancel_request retirement), never on receipt; a turn torn down mid-dialog keeps the partials. Eviction is idempotent.",
        ),
    }),
  ),
  result: DoctorLazy(() => U(["retry_fallback", "edit_prompt", "cancelled"])),
  default: "cancelled",
});
//@ chunk-hwmsct5x.js:227224-227281 placement
var pb = 300000,
  AXo = { "60s": 60000, "5m": 300000, "10m": 600000 };
/**
 * 把对话框超时选项（60s/5m/10m/never）换算为毫秒，never 为 0。
 */
//@ chunk-hwmsct5x.js:227281-227390 placement
function getTimeoutMsForChoice(e) {
  switch (e) {
    case "60s":
    case "5m":
    case "10m":
      return AXo[e];
    case "never":
      return 0;
    case void 0:
      return;
  }
}
//@ chunk-hwmsct5x.js:227390-227408 placement
var mb = 2147483647;
//@ chunk-hwmsct5x.js:227408-227506 placement
function lci(e) {
  if (e === void 0 || Number.isNaN(e)) return getUserDialogTimeoutMs();
  return e <= 0 || e === 1 / 0 ? 0 : Math.min(e, mb);
}

export {
  REFUSAL_FALLBACK_DIALOG,
  clearBlockingDialog,
  markBlockingDialogShown,
  AXo,
  requestUserDialogRaced,
  isDialogResponse,
  cancelPendingDialogs,
  detachPendingDialogs,
  hXo,
  lci,
  hi,
  stripDeclineMessage,
  getTimeoutMsForChoice,
  pb,
  lAt,
  G8r,
  forwardDialogToBridge,
};
