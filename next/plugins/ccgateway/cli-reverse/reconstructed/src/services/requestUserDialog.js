/**
 * services/requestUserDialog.ts
 *
 * 2.1.316 新增：请求用户对话框（可经 Remote Control 转发）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { uiSignals } from "../state/uiSignals.js";
import { logForDebugging } from "../utils/debug.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema, array, _enum } from "../../vendor/zod/v4/classic/schemas.js";
import { getUserDialogTimeoutMs } from "./api/refusalFallback.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-vn3g7zt8.js:194369-194418 placement
/**
 * 请求/名字合法格式：字母数字开头结尾，中间可含连字符，最长 64。
 */
var REQUEST_ID_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])$/i;
//@ chunk-vn3g7zt8.js:194418-194473 placement
/**
 * 合法则返回该字符串，否则 undefined。
 */
function normalizeRequestId(requestId) {
  return requestId !== undefined && REQUEST_ID_REGEX.test(requestId) ? requestId : undefined;
}
//@ chunk-vn3g7zt8.js:194510-194629 placement
/**
 * 去掉对象中的 declineMessage 字段后返回。
 */
function stripDeclineMessage(message) {
  if (typeof message === "object" && message !== null && "declineMessage" in message) {
    let { declineMessage, ...rest } = message;
    return rest;
  }
  return message;
}
//@ chunk-vn3g7zt8.js:194629-194744 placement
/**
 * 标记屏幕上正在显示某种阻塞对话框。
 */
function markBlockingDialogShown(blockingDialogKind) {
  uiSignals.onScreenBlockingDialog.setState((current) =>
    current.surfaceMounted && current.kind === blockingDialogKind
      ? current
      : {
          surfaceMounted: true,
          kind: blockingDialogKind,
        },
  );
}
//@ chunk-vn3g7zt8.js:194744-194864 placement
/**
 * 清除阻塞对话框显示状态。
 */
function clearBlockingDialog() {
  uiSignals.onScreenBlockingDialog.setState((current) =>
    current.surfaceMounted || current.kind !== null
      ? {
          surfaceMounted: false,
          kind: null,
        }
      : current,
  );
}
//@ chunk-vn3g7zt8.js:194864-194959 placement
/**
 * 屏幕上是否已有其他类型的阻塞对话框（用于决定是否排队）。
 */
function otherDialogOnScreen(kind) {
  let state = uiSignals.onScreenBlockingDialog.getState();
  return state.surfaceMounted && state.kind !== kind;
}
//@ chunk-vn3g7zt8.js:194959-195021 placement
/**
 * 订阅阻塞对话框状态变化。
 */
function onBlockingDialogChange(listener) {
  return uiSignals.onScreenBlockingDialog.subscribe(listener);
}
//@ chunk-vn3g7zt8.js:195021-195182 placement
/**
 * 取消所有（或指定类型的）待处理用户对话请求：从表中删除、回调清理函数、以 cancelled 通知处理器，返回被取消的类型列表。
 */
function cancelPendingDialogs(dialogs, forgetDialog, kind) {
  let cancelledKinds = [];
  for (let [requestId, entry] of [...dialogs]) {
    if (kind !== undefined && entry.kind !== kind) continue;
    dialogs.delete(requestId);
    forgetDialog(requestId);
    entry.handler({
      behavior: "cancelled",
    });
    cancelledKinds.push(entry.kind);
  }
  return cancelledKinds;
}
//@ chunk-vn3g7zt8.js:195182-195285 placement
/**
 * 以 detached 结束所有待处理的用户对话请求，返回数量。
 */
function detachPendingDialogs(dialogs) {
  let detachedCount = 0;
  for (let [requestId, entry] of [...dialogs]) {
    dialogs.delete(requestId);
    entry.handler({
      behavior: "detached",
    });
    detachedCount++;
  }
  return detachedCount;
}
//@ chunk-vn3g7zt8.js:195285-195412 placement
/**
 * 判断对象是对话请求的终结响应（behavior 为 completed 或 cancelled）。
 */
function isDialogResponse(response) {
  if (!response || typeof response !== "object") return false;
  return "behavior" in response && (response.behavior === "completed" || response.behavior === "cancelled");
}
//@ chunk-vn3g7zt8.js:195412-195927 placement
/**
 * 把一次用户对话请求经桥接转发给客户端：生成请求 id、登记响应处理（completed 时校验结果、cancelled、detached），发送失败时撤销；返回 requestId 与 retire 函数（未响应时取消请求）。
 */
function forwardDialogToBridge({ bridge, dialog, payload, toolUseId, onSettled }) {
  let requestId = randomUUID();
  let answered = false;
  let unsubscribe = bridge.onResponse(requestId, dialog.kind, (response) => {
    switch (response.behavior) {
      case "completed": {
        answered = true;
        let parsed = dialog.result().safeParse(response.result);
        onSettled(
          parsed.success
            ? {
                kind: "answered",
                result: stripDeclineMessage(parsed.data),
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
    unsubscribe();
    return;
  }
  let retired = false;
  return {
    requestId,
    retire: () => {
      if (retired) return;
      retired = true;
      if (!answered) bridge.cancelRequest(requestId);
      unsubscribe();
    },
  };
}
//@ chunk-vn3g7zt8.js:195927-197273 placement
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
  let onAbort = () => abortController.abort(signal.reason);
  signal.addEventListener("abort", onAbort, {
    once: true,
  });
  let stopWatchingDialogs;
  let parkTimer;
  let resolveRemote = () => {};
  let promise = new Promise((resolve) => {
    resolveRemote = resolve;
  });
  let forwarded = forwardDialogToBridge({
    bridge,
    dialog,
    payload,
    onSettled: (settled) => {
      switch (settled.kind) {
        case "answered":
          resolveRemote({
            result: settled.result,
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
          stopWatchingDialogs?.();
          return;
      }
    },
  });
  let cleanup = () => {
    clearTimeout(parkTimer);
    stopWatchingDialogs?.();
    forwarded?.retire();
  };
  let localOpts = {
    ...options.localOpts,
    localOnly: true,
    signal: abortController.signal,
    onClaimed: () => {
      cleanup();
      options.localOpts?.onClaimed?.();
    },
  };
  if (forwarded === undefined) {
    let result = await requestDialog(dialog, payload, localOpts);
    signal.removeEventListener("abort", onAbort);
    return {
      result,
      source: "local",
    };
  }
  options.onForwarded?.(forwarded.requestId);
  let armParkTimer = () => {
    if (parkTimeoutMs <= 0) return;
    parkTimer = setTimeout(
      (dialogKind, result, settle, rearmParkTimer) => {
        if (otherDialogOnScreen(dialogKind)) {
          rearmParkTimer();
          return;
        }
        settle({
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
    let dialogWasOnScreen = otherDialogOnScreen(dialog.kind);
    stopWatchingDialogs = onBlockingDialogChange(() => {
      let dialogIsOnScreen = otherDialogOnScreen(dialog.kind);
      if (dialogWasOnScreen && !dialogIsOnScreen) {
        clearTimeout(parkTimer);
        armParkTimer();
      }
      dialogWasOnScreen = dialogIsOnScreen;
    });
  }
  let localPromise = requestDialog(dialog, payload, localOpts).then((result) => ({
    result,
    source: "local",
  }));
  let winner = await Promise.race([localPromise, promise]);
  cleanup();
  signal.removeEventListener("abort", onAbort);
  if (winner.source !== "local") abortController.abort();
  return winner;
}
//@ chunk-vn3g7zt8.js:197273-197840 placement
/**
 * 拒绝回退提示对话的声明：载荷（原模型、回退模型、拒绝类别、指导文本、相关已流出消息 uuid）与结果（retry_fallback/edit_prompt/cancelled），默认 cancelled。
 */
var REFUSAL_FALLBACK_DIALOG; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-vn3g7zt8.js:197273", () => {
  REFUSAL_FALLBACK_DIALOG = withHideWhile({
    kind: "refusal_fallback_prompt",
    payload: DoctorLazy(() =>
      objectSchema({
        originalModel: stringSchema(),
        fallbackModel: stringSchema(),
        apiRefusalCategory: stringSchema().nullable().optional(),
        guidanceText: stringSchema().optional(),
        retractedMessageUuids: array(stringSchema())
          .optional()
          .describe(
            "Wire uuids of the already-streamed messages this refusal concerns. Evict on RESOLUTION (your own response \u2014 any choice \u2014 or control_cancel_request retirement), never on receipt; a turn torn down mid-dialog keeps the partials. Eviction is idempotent.",
          ),
      }),
    ),
    result: DoctorLazy(() => _enum(["retry_fallback", "edit_prompt", "cancelled"])),
    default: "cancelled",
  });
});
//@ chunk-vn3g7zt8.js:230737-230794 placement
/**
 * 对话框默认超时（5 分钟），以及 60s/5m/10m 选项对应的毫秒表。
 */
var DEFAULT_DIALOG_TIMEOUT_MS = 300000;
var TIMEOUT_CHOICE_MS = {
  "60s": 60000,
  "5m": 300000,
  "10m": 600000,
};
//@ chunk-vn3g7zt8.js:230794-230903 placement
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
//@ chunk-vn3g7zt8.js:230903-230921 placement
var MAX_DIALOG_TIMEOUT_MS = 2147483647;
//@ chunk-vn3g7zt8.js:230921-231019 placement
/**
 * 把请求里的超时值规范化：未给/NaN 用默认；非正或无穷视为不超时；其余封顶。
 */
function clampDialogTimeoutMs(parkTimeoutMs) {
  if (parkTimeoutMs === undefined || Number.isNaN(parkTimeoutMs)) return getUserDialogTimeoutMs();
  return parkTimeoutMs <= 0 || parkTimeoutMs === 1 / 0 ? 0 : Math.min(parkTimeoutMs, MAX_DIALOG_TIMEOUT_MS);
}
export {
  clampDialogTimeoutMs,
  stripDeclineMessage,
  REFUSAL_FALLBACK_DIALOG,
  REQUEST_ID_REGEX,
  otherDialogOnScreen,
  onBlockingDialogChange,
  normalizeRequestId,
  isDialogResponse,
  cancelPendingDialogs,
  detachPendingDialogs,
  clearBlockingDialog,
  markBlockingDialogShown,
  TIMEOUT_CHOICE_MS,
  requestUserDialogRaced,
  forwardDialogToBridge,
  getTimeoutMsForChoice,
  DEFAULT_DIALOG_TIMEOUT_MS,
};
