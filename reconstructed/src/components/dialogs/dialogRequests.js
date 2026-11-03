/**
 * components/dialogs/dialogRequests.ts
 *
 * 2.1.316 新增：对话框请求（hideWhile、异步迭代 payload）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tc95s49z.js (7)
 * attribution: placement 7
 */

//@ chunk-tc95s49z.js:191-207 placement = TMUX_SESSION (1)
var TMUX_SESSION = ["panel"];
//@ chunk-tc95s49z.js:207-266 placement
function withHideWhile({ hideWhile = TMUX_SESSION, ...e }) {
  return {
    ...e,
    hideWhile,
  };
}
//@ chunk-tc95s49z.js:266-358 placement
/**
 * 把对话框请求函数包一层：输入是异步可迭代时走流式请求，否则交给默认实现。
 */
function requestDialogOnce(host) {
  return async function (kind, r, options) {
    if (isAsyncIterable(r)) return requestDialogStream(host, kind, r, options);
    return requestDialogOnce_2(host, kind, r, options);
  };
}
//@ chunk-tc95s49z.js:358-438 placement
/**
 * 判断是否为异步可迭代对象（Symbol.asyncIterator 存在）。
 */
function isAsyncIterable(a) {
  return typeof a === "object" && a !== null && Symbol.asyncIterator in a;
}
//@ chunk-tc95s49z.js:438-558 placement
function mergeHideWhile(hideWhile, options) {
  let alsoHideWhile = options?.alsoHideWhile ?? [];
  return alsoHideWhile.every((r) => hideWhile.includes(r))
    ? hideWhile
    : [...hideWhile, ...alsoHideWhile.filter((r) => !hideWhile.includes(r))];
}
//@ chunk-tc95s49z.js:558-926 placement
/**
 * 发一个对话框请求：校验载荷、等待回复、校验结果；任何一步失败或取消都返回该种类的默认值。
 */
async function requestDialogOnce_2(host, kind, payload, options) {
  let n = kind.payload().safeParse(payload);
  if (!n.success) return kind.default;
  let l;
  try {
    let { replied } = host.request(
      {
        kind: kind.kind,
        payload: n.data,
        userInvoked: kind.userInvoked,
        hideWhile: mergeHideWhile(kind.hideWhile, options),
        holdsTop: kind.holdsTop,
      },
      options,
    );
    l = await replied;
  } catch {
    return kind.default;
  }
  if ("cancelled" in l) return kind.default;
  let i = kind.result().safeParse(l.result);
  return i.success ? i.data : kind.default;
}
//@ chunk-tc95s49z.js:926-2012 placement
/**
 * 用异步迭代器提供载荷的对话框请求：首个载荷打开对话框，后续载荷实时更新，支持外部中止；回复后按结果 schema 校验，否则返回默认值；迭代器抛错时重新抛出。
 */
async function requestDialogStream(host, kind, payloads, options) {
  let n = payloads[Symbol.asyncIterator]();
  let l = await n.next();
  if (l.done) return kind.default;
  let i = kind.payload().safeParse(l.value);
  if (!i.success) {
    n.return?.(undefined);
    return kind.default;
  }
  let abortController = new AbortController();
  let c = () => abortController.abort();
  if (options?.signal)
    if (options.signal.aborted) abortController.abort();
    else
      options.signal.addEventListener("abort", c, {
        once: true,
      });
  let { replied, update } = host.request(
    {
      kind: kind.kind,
      payload: i.data,
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
  let d;
  (async () => {
    try {
      while (!abortController.signal.aborted) {
        let s = await n.next();
        if (s.done) return;
        if (abortController.signal.aborted) return;
        let y = kind.payload().safeParse(s.value);
        if (!y.success) continue;
        update(y.data);
      }
    } catch (error) {
      d = error;
      abortController.abort();
    }
  })().catch(() => {});
  let u;
  try {
    u = await replied;
  } finally {
    options?.signal?.removeEventListener("abort", c);
    n.return?.(undefined);
  }
  if (d !== undefined) throw d;
  if ("cancelled" in u) return kind.default;
  let p = kind.result().safeParse(u.result);
  return p.success ? p.data : kind.default;
}
export { withHideWhile, requestDialogOnce, isAsyncIterable };
