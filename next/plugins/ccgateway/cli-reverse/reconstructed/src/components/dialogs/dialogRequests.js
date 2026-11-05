/**
 * components/dialogs/dialogRequests.ts
 *
 * 2.1.316 新增：对话框请求（hideWhile、异步迭代 payload）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1524p9jf.js (7)
 * attribution: placement 7
 */

//@ chunk-1524p9jf.js:191-207 placement (2.1.88 match: TMUX_SESSION, 1)
var TMUX_SESSION = ["panel"];
//@ chunk-1524p9jf.js:207-266 placement
function withHideWhile({ hideWhile = TMUX_SESSION, ...rest }) {
  return {
    ...rest,
    hideWhile,
  };
}
//@ chunk-1524p9jf.js:266-358 placement
/**
 * 把对话框请求函数包一层：输入是异步可迭代时走流式请求，否则交给默认实现。
 */
function requestDialogOnce(host) {
  return async function (kind, payload, options) {
    if (isAsyncIterable(payload)) return requestDialogStream(host, kind, payload, options);
    return requestDialogOnce_2(host, kind, payload, options);
  };
}
//@ chunk-1524p9jf.js:358-438 placement
/**
 * 判断是否为异步可迭代对象（Symbol.asyncIterator 存在）。
 */
function isAsyncIterable(value) {
  return typeof value === "object" && value !== null && Symbol.asyncIterator in value;
}
//@ chunk-1524p9jf.js:438-558 placement
function mergeHideWhile(hideWhile, options) {
  let alsoHideWhile = options?.alsoHideWhile ?? [];
  return alsoHideWhile.every((condition) => hideWhile.includes(condition))
    ? hideWhile
    : [...hideWhile, ...alsoHideWhile.filter((condition) => !hideWhile.includes(condition))];
}
//@ chunk-1524p9jf.js:558-926 placement
/**
 * 发一个对话框请求：校验载荷、等待回复、校验结果；任何一步失败或取消都返回该种类的默认值。
 */
async function requestDialogOnce_2(host, kind, payload, options) {
  let parsed = kind.payload().safeParse(payload);
  if (!parsed.success) return kind.default;
  let reply;
  try {
    let { replied } = host.request(
      {
        kind: kind.kind,
        payload: parsed.data,
        userInvoked: kind.userInvoked,
        hideWhile: mergeHideWhile(kind.hideWhile, options),
        holdsTop: kind.holdsTop,
      },
      options,
    );
    reply = await replied;
  } catch {
    return kind.default;
  }
  if ("cancelled" in reply) return kind.default;
  let resultParsed = kind.result().safeParse(reply.result);
  return resultParsed.success ? resultParsed.data : kind.default;
}
//@ chunk-1524p9jf.js:926-2012 placement
/**
 * 用异步迭代器提供载荷的对话框请求：首个载荷打开对话框，后续载荷实时更新，支持外部中止；回复后按结果 schema 校验，否则返回默认值；迭代器抛错时重新抛出。
 */
async function requestDialogStream(host, kind, payloads, options) {
  let iterator = payloads[Symbol.asyncIterator]();
  let first = await iterator.next();
  if (first.done) return kind.default;
  let parsed = kind.payload().safeParse(first.value);
  if (!parsed.success) {
    iterator.return?.(undefined);
    return kind.default;
  }
  let abortController = new AbortController();
  let abort = () => abortController.abort();
  if (options?.signal)
    if (options.signal.aborted) abortController.abort();
    else
      options.signal.addEventListener("abort", abort, {
        once: true,
      });
  let { replied, update } = host.request(
    {
      kind: kind.kind,
      payload: parsed.data,
      userInvoked: kind.userInvoked,
      hideWhile: mergeHideWhile(kind.hideWhile, options),
      holdsTop: kind.holdsTop,
    },
    {
      signal: abortController.signal,
      place: options?.place,
      askOrder: options?.askOrder,
      armInputGrace: options?.armInputGrace,
      succeeds: options?.succeeds,
      onFirstReveal: options?.onFirstReveal,
      onClaimed: options?.onClaimed,
      countedAsk: options?.countedAsk,
    },
  );
  let pumpError;
  (async () => {
    try {
      while (!abortController.signal.aborted) {
        let next = await iterator.next();
        if (next.done) return;
        if (abortController.signal.aborted) return;
        let parsed = kind.payload().safeParse(next.value);
        if (!parsed.success) continue;
        update(parsed.data);
      }
    } catch (error) {
      pumpError = error;
      abortController.abort();
    }
  })().catch(() => {});
  let reply;
  try {
    reply = await replied;
  } finally {
    options?.signal?.removeEventListener("abort", abort);
    iterator.return?.(undefined);
  }
  if (pumpError !== undefined) throw pumpError;
  if ("cancelled" in reply) return kind.default;
  let finalParsed = kind.result().safeParse(reply.result);
  return finalParsed.success ? finalParsed.data : kind.default;
}
export { withHideWhile, isAsyncIterable, requestDialogOnce };
