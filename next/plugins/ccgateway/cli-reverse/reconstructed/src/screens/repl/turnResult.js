/**
 * screens/repl/turnResult.ts
 *
 * 2.1.316 新增。回合结果处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (6)
 * attribution: placement 6
 */
import { sumByAlias } from "../../services/artifacts/frameApi.js";
import { identityAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isSdkHostOrigin } from "../../cli/print/lowLatencySubmit.js";
import { isAsyncIterable } from "../../components/dialogs/dialogRequests.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { requestUserDialogRaced } from "../../services/requestUserDialog.js";
import { isAbortedTerminalReason, isErrorTerminalReason } from "../../entrypoints/sdk/coreSchemas.js";
import { getTrailingApiErrorInfo } from "../../utils/messages.js";
import { filterDisplayableErrors } from "../../remote/sdkMessageAdapter.js";

//@ chunk-czq1j3j2.js:1509134-1509182 placement
function sumToolCounts(counts) {
  return counts && counts.length ? sumByAlias(counts, identityAlias) : 0;
}
//@ chunk-czq1j3j2.js:1509182-1509194 placement
var sumScores = sumToolCounts;
//@ chunk-czq1j3j2.js:1509232-1509642 placement
/**
 * 包装对话框请求：适合时转给 Remote Control 桥回答。
 */
function routeDialogOverBridge(dialog, scope) {
  return async function (descriptor, payload, options) {
    let dialog_2 = scope.bridge?.dialog;
    if (
      options?.localOnly ||
      dialog_2 === undefined ||
      !isSdkHostOrigin(descriptor.kind, "remote_control") ||
      !dialog_2.supportsKind(descriptor.kind) ||
      isAsyncIterable(payload) ||
      !isPlainObject(payload)
    )
      return dialog(descriptor, payload, options);
    let answer = await requestUserDialogRaced({
      requestDialog: dialog,
      dialog: descriptor,
      payload,
      signal: options?.signal ?? new AbortController().signal,
      bridge: dialog_2,
      parkTimeoutMs: 0,
      localOpts: options,
    });
    if (answer.source === "bridge") options?.onAnsweredOverBridge?.();
    return answer.result;
  };
}
//@ chunk-czq1j3j2.js:1509642-1509984 placement
/**
 * 回合结束分类：stopped / completed / {failure, errorKind}。
 */
function classifyTurnEnd({ result: terminal, messages, stopped, threw }) {
  if (stopped || isAbortedTerminalReason(terminal?.terminal_reason)) return "stopped";
  if (
    !(terminal === undefined ? threw : terminal.is_error || isErrorTerminalReason(terminal.terminal_reason))
  )
    return "completed";
  let trailing = trailingApiError(messages);
  return {
    failure:
      [trailing?.reason, ...resultErrorTexts(terminal)]
        .flatMap(
          (line) =>
            line?.split(`
`) ?? [],
        )
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? "Turn failed",
    errorKind: trailing?.errorKind,
  };
}
//@ chunk-czq1j3j2.js:1509984-1510109 placement
/**
 * 最后一条是助手消息时取末尾 API 错误信息。
 */
function trailingApiError(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let type = messages[idx]?.type;
    if (type === "user") return;
    if (type === "assistant") return getTrailingApiErrorInfo(messages);
  }
  return;
}
//@ chunk-czq1j3j2.js:1510109-1510225 placement
/**
 * 结果中的错误文本列表。
 */
function resultErrorTexts(result) {
  if (result === undefined) return [];
  let record = result;
  return [
    ...(typeof record.result === "string" ? [record.result] : []),
    ...filterDisplayableErrors(record.errors),
  ];
}
export { classifyTurnEnd, sumScores, routeDialogOverBridge };
