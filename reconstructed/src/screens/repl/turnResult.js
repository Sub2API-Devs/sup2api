/**
 * screens/repl/turnResult.ts
 *
 * 2.1.316 新增。回合结果处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { isSdkHostOrigin } from "../../cli/print/lowLatencySubmit.js";
import { isAsyncIterable } from "../../components/dialogs/dialogRequests.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { requestUserDialogRaced } from "../../services/requestUserDialog.js";
import { isAbortedTerminalReason, isErrorTerminalReason } from "../../entrypoints/sdk/coreSchemas.js";
import { getTrailingApiErrorInfo } from "../../utils/messages.js";
import { filterDisplayableErrors } from "../../remote/sdkMessageAdapter.js";

//@ chunk-18hwfzwa.js:1467830-1468240 placement
/**
 * 包装对话框请求：适合时转给 Remote Control 桥回答。
 */
function routeDialogOverBridge(h, x) {
  return async function (L, ee, ke) {
    let dialog = x.bridge?.dialog;
    if (
      ke?.localOnly ||
      dialog === undefined ||
      !isSdkHostOrigin(L.kind, "remote_control") ||
      !dialog.supportsKind(L.kind) ||
      isAsyncIterable(ee) ||
      !isPlainObject(ee)
    )
      return h(L, ee, ke);
    let Be = await requestUserDialogRaced({
      requestDialog: h,
      dialog: L,
      payload: ee,
      signal: ke?.signal ?? new AbortController().signal,
      bridge: dialog,
      parkTimeoutMs: 0,
      localOpts: ke,
    });
    if (Be.source === "bridge") ke?.onAnsweredOverBridge?.();
    return Be.result;
  };
}
//@ chunk-18hwfzwa.js:1468240-1468582 placement
/**
 * 回合结束分类：stopped / completed / {failure, errorKind}。
 */
function classifyTurnEnd({ result: h, messages, stopped, threw }) {
  if (stopped || isAbortedTerminalReason(h?.terminal_reason)) return "stopped";
  if (!(h === undefined ? threw : h.is_error || isErrorTerminalReason(h.terminal_reason))) return "completed";
  let ke = trailingApiError(messages);
  return {
    failure:
      [ke?.reason, ...resultErrorTexts(h)]
        .flatMap(
          (Be) =>
            Be?.split(`
`) ?? [],
        )
        .map((Be) => Be.trim())
        .find((Be) => Be.length > 0) ?? "Turn failed",
    errorKind: ke?.errorKind,
  };
}
//@ chunk-18hwfzwa.js:1468582-1468707 placement
/**
 * 最后一条是助手消息时取末尾 API 错误信息。
 */
function trailingApiError(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let D = messages[idx]?.type;
    if (D === "user") return;
    if (D === "assistant") return getTrailingApiErrorInfo(messages);
  }
  return;
}
//@ chunk-18hwfzwa.js:1468707-1468823 placement
/**
 * 结果中的错误文本列表。
 */
function resultErrorTexts(h) {
  if (h === undefined) return [];
  let x = h;
  return [...(typeof x.result === "string" ? [x.result] : []), ...filterDisplayableErrors(x.errors)];
}
export { classifyTurnEnd, routeDialogOverBridge };
