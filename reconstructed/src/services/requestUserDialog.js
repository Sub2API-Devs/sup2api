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
import { randomUUID } from "crypto";
import { uiSignals } from "../state/uiSignals.js";
import { logForDebugging } from "../utils/debug.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string, array, _enum } from "../../vendor/zod/v4/classic/schemas.js";
import { getUserDialogTimeoutMs } from "./api/refusalFallback.js";

//@ chunk-hwmsct5x.js:193981-194030 placement
/**
 * 请求/名字合法格式：字母数字开头结尾，中间可含连字符，最长 64。
 */
var REQUEST_ID_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])$/i;
//@ chunk-hwmsct5x.js:194030-194085 placement
/**
 * 合法则返回该字符串，否则 undefined。
 */
function normalizeRequestId(e) {
  return e !== undefined && REQUEST_ID_REGEX.test(e) ? e : undefined;
}
//@ chunk-hwmsct5x.js:194122-194241 placement
/**
 * 去掉对象中的 declineMessage 字段后返回。
 */
function stripDeclineMessage(e) {
  if (typeof e === "object" && e !== null && "declineMessage" in e) {
    let { declineMessage, ...r } = e;
    return r;
  }
  return e;
}
//@ chunk-hwmsct5x.js:194241-194356 placement
/**
 * 标记屏幕上正在显示某种阻塞对话框。
 */
function markBlockingDialogShown(blockingDialogKind) {
  uiSignals.onScreenBlockingDialog.setState((n) =>
    n.surfaceMounted && n.kind === blockingDialogKind
      ? n
      : {
          surfaceMounted: true,
          kind: blockingDialogKind,
        },
  );
}
//@ chunk-hwmsct5x.js:194356-194476 placement
/**
 * 清除阻塞对话框显示状态。
 */
function clearBlockingDialog() {
  uiSignals.onScreenBlockingDialog.setState((e) =>
    e.surfaceMounted || e.kind !== null
      ? {
          surfaceMounted: false,
          kind: null,
        }
      : e,
  );
}
//@ chunk-hwmsct5x.js:194476-194571 placement
/**
 * 屏幕上是否已有其他类型的阻塞对话框（用于决定是否排队）。
 */
function otherDialogOnScreen(kind) {
  let state = uiSignals.onScreenBlockingDialog.getState();
  return state.surfaceMounted && state.kind !== kind;
}
//@ chunk-hwmsct5x.js:194571-194633 placement
/**
 * 订阅阻塞对话框状态变化。
 */
function onBlockingDialogChange(e) {
  return uiSignals.onScreenBlockingDialog.subscribe(e);
}
//@ chunk-hwmsct5x.js:194633-194794 placement
/**
 * 取消所有（或指定类型的）待处理用户对话请求：从表中删除、回调清理函数、以 cancelled 通知处理器，返回被取消的类型列表。
 */
function cancelPendingDialogs(e, n, kind) {
  let s = [];
  for (let [h, y] of [...e]) {
    if (kind !== undefined && y.kind !== kind) continue;
    e.delete(h);
    n(h);
    y.handler({
      behavior: "cancelled",
    });
    s.push(y.kind);
  }
  return s;
}
//@ chunk-hwmsct5x.js:194794-194897 placement
/**
 * 以 detached 结束所有待处理的用户对话请求，返回数量。
 */
function detachPendingDialogs(e) {
  let n = 0;
  for (let [r, s] of [...e]) {
    e.delete(r);
    s.handler({
      behavior: "detached",
    });
    n++;
  }
  return n;
}
//@ chunk-hwmsct5x.js:194897-195024 placement
/**
 * 判断对象是对话请求的终结响应（behavior 为 completed 或 cancelled）。
 */
function isDialogResponse(response) {
  if (!response || typeof response !== "object") return false;
  return "behavior" in response && (response.behavior === "completed" || response.behavior === "cancelled");
}
//@ chunk-hwmsct5x.js:195024-195539 placement
/**
 * 把一次用户对话请求经桥接转发给客户端：生成请求 id、登记响应处理（completed 时校验结果、cancelled、detached），发送失败时撤销；返回 requestId 与 retire 函数（未响应时取消请求）。
 */
function forwardDialogToBridge({ bridge, dialog, payload, toolUseId, onSettled }) {
  let requestId = randomUUID();
  let answered = false;
  let S = bridge.onResponse(requestId, dialog.kind, (R) => {
    switch (R.behavior) {
      case "completed": {
        answered = true;
        let L = dialog.result().safeParse(R.result);
        onSettled(
          L.success
            ? {
                kind: "answered",
                result: stripDeclineMessage(L.data),
              }
            : {
                kind: "malformed",
              },
        );
        return;
      }
      case "cancelled":
        answered = true;
        onSettled({
          kind: "cancelled",
        });
        return;
      case "detached":
        onSettled({
          kind: "detached",
        });
        return;
    }
  });
  if (!bridge.sendRequest(requestId, dialog.kind, payload, toolUseId)) {
    bridge.cancelRequest(requestId);
    S();
    return;
  }
  let E = false;
  return {
    requestId,
    retire: () => {
      if (E) return;
      E = true;
      if (!answered) bridge.cancelRequest(requestId);
      S();
    },
  };
}
//@ chunk-hwmsct5x.js:195539-196883 placement
/**
 * 同时在本地与桥接客户端发起用户对话请求，先回答者为准：桥接回答/格式错误/取消都落到默认值处理，detached 时取消超时；可设置无人应答的停泊超时（屏幕有阻塞对话时顺延）；本地被认领时撤回桥接请求。返回结果与来源（local/bridge/timeout）。
 */
async function requestUserDialogRaced(options) {
  let { requestDialog, dialog, payload, signal, bridge, parkTimeoutMs } = options;
  if (signal.aborted)
    return {
      result: dialog.default,
      source: "local",
    };
  let abortController = new AbortController();
  let E = () => abortController.abort(signal.reason);
  signal.addEventListener("abort", E, {
    once: true,
  });
  let R;
  let parkTimer;
  let resolveRemote = () => {};
  let promise = new Promise((resolve) => {
    resolveRemote = resolve;
  });
  let forwarded = forwardDialogToBridge({
    bridge,
    dialog,
    payload,
    onSettled: (J) => {
      switch (J.kind) {
        case "answered":
          resolveRemote({
            result: J.result,
            source: "bridge",
          });
          return;
        case "malformed":
          logForDebugging(
            `[bridge] request_user_dialog ${dialog.kind}: unreadable result from client, settling as default`,
            {
              level: "warn",
            },
          );
          resolveRemote({
            result: dialog.default,
            source: "bridge",
          });
          return;
        case "cancelled":
          resolveRemote({
            result: dialog.default,
            source: "bridge",
          });
          return;
        case "detached":
          clearTimeout(parkTimer);
          R?.();
          return;
      }
    },
  });
  let H = () => {
    clearTimeout(parkTimer);
    R?.();
    forwarded?.retire();
  };
  let j = {
    ...options.localOpts,
    localOnly: true,
    signal: abortController.signal,
    onClaimed: () => {
      H();
      options.localOpts?.onClaimed?.();
    },
  };
  if (forwarded === undefined) {
    let result = await requestDialog(dialog, payload, j);
    signal.removeEventListener("abort", E);
    return {
      result,
      source: "local",
    };
  }
  options.onForwarded?.(forwarded.requestId);
  let armParkTimer = () => {
    if (parkTimeoutMs <= 0) return;
    parkTimer = setTimeout(
      (J, result, Q, ne) => {
        if (otherDialogOnScreen(J)) {
          ne();
          return;
        }
        Q({
          result,
          source: "timeout",
        });
      },
      parkTimeoutMs,
      dialog.kind,
      dialog.default,
      resolveRemote,
      armParkTimer,
    );
  };
  armParkTimer();
  if (parkTimeoutMs > 0) {
    let J = otherDialogOnScreen(dialog.kind);
    R = onBlockingDialogChange(() => {
      let Z = otherDialogOnScreen(dialog.kind);
      if (J && !Z) {
        clearTimeout(parkTimer);
        armParkTimer();
      }
      J = Z;
    });
  }
  let localPromise = requestDialog(dialog, payload, j).then((result) => ({
    result,
    source: "local",
  }));
  let winner = await Promise.race([localPromise, promise]);
  H();
  signal.removeEventListener("abort", E);
  if (winner.source !== "local") abortController.abort();
  return winner;
}
//@ chunk-hwmsct5x.js:196883-197450 placement
/**
 * 拒绝回退提示对话的声明：载荷（原模型、回退模型、拒绝类别、指导文本、相关已流出消息 uuid）与结果（retry_fallback/edit_prompt/cancelled），默认 cancelled。
 */
var REFUSAL_FALLBACK_DIALOG = withHideWhile({
  kind: "refusal_fallback_prompt",
  payload: DoctorLazy(() =>
    u({
      originalModel: string(),
      fallbackModel: string(),
      apiRefusalCategory: string().nullable().optional(),
      guidanceText: string().optional(),
      retractedMessageUuids: array(string())
        .optional()
        .describe(
          "Wire uuids of the already-streamed messages this refusal concerns. Evict on RESOLUTION (your own response \u2014 any choice \u2014 or control_cancel_request retirement), never on receipt; a turn torn down mid-dialog keeps the partials. Eviction is idempotent.",
        ),
    }),
  ),
  result: DoctorLazy(() => _enum(["retry_fallback", "edit_prompt", "cancelled"])),
  default: "cancelled",
});
//@ chunk-hwmsct5x.js:227224-227281 placement
/**
 * 对话框默认超时（5 分钟），以及 60s/5m/10m 选项对应的毫秒表。
 */
var DEFAULT_DIALOG_TIMEOUT_MS = 300000;
var TIMEOUT_CHOICE_MS = {
  "60s": 60000,
  "5m": 300000,
  "10m": 600000,
};
//@ chunk-hwmsct5x.js:227281-227390 placement
/**
 * 把对话框超时选项（60s/5m/10m/never）换算为毫秒，never 为 0。
 */
function getTimeoutMsForChoice(dialogExpiry) {
  switch (dialogExpiry) {
    case "60s":
    case "5m":
    case "10m":
      return TIMEOUT_CHOICE_MS[dialogExpiry];
    case "never":
      return 0;
    case undefined:
      return;
  }
}
//@ chunk-hwmsct5x.js:227390-227408 placement
var MAX_DIALOG_TIMEOUT_MS = 2147483647;
//@ chunk-hwmsct5x.js:227408-227506 placement
/**
 * 把请求里的超时值规范化：未给/NaN 用默认；非正或无穷视为不超时；其余封顶。
 */
function clampDialogTimeoutMs(parkTimeoutMs) {
  if (parkTimeoutMs === undefined || Number.isNaN(parkTimeoutMs)) return getUserDialogTimeoutMs();
  return parkTimeoutMs <= 0 || parkTimeoutMs === 1 / 0 ? 0 : Math.min(parkTimeoutMs, MAX_DIALOG_TIMEOUT_MS);
}
export {
  REFUSAL_FALLBACK_DIALOG,
  clearBlockingDialog,
  markBlockingDialogShown,
  TIMEOUT_CHOICE_MS,
  requestUserDialogRaced,
  isDialogResponse,
  cancelPendingDialogs,
  detachPendingDialogs,
  REQUEST_ID_REGEX,
  clampDialogTimeoutMs,
  normalizeRequestId,
  stripDeclineMessage,
  getTimeoutMsForChoice,
  DEFAULT_DIALOG_TIMEOUT_MS,
  otherDialogOnScreen,
  onBlockingDialogChange,
  forwardDialogToBridge,
};
