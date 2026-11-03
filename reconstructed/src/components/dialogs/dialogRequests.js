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
function withHideWhile({ hideWhile: hideWhile = TMUX_SESSION, ...e }) {
  return { ...e, hideWhile: hideWhile };
}
//@ chunk-tc95s49z.js:266-358 placement
function fAi(a) {
  return async function (t, r, n) {
    if ($9t(r)) return requestDialogStream(a, t, r, n);
    return requestDialogOnce(a, t, r, n);
  };
}
//@ chunk-tc95s49z.js:358-438 placement
function $9t(a) {
  return typeof a === "object" && a !== null && Symbol.asyncIterator in a;
}
//@ chunk-tc95s49z.js:438-558 placement
function mergeHideWhile(a, e) {
  let t = e?.alsoHideWhile ?? [];
  return t.every((r) => a.includes(r)) ? a : [...a, ...t.filter((r) => !a.includes(r))];
}
/**
 * 发一个对话框请求：校验载荷、等待回复、校验结果；任何一步失败或取消都返回该种类的默认值。
 */
//@ chunk-tc95s49z.js:558-926 placement
async function requestDialogOnce(host, kind, payload, options) {
  let safeParse = kind.payload().safeParse(payload);
  if (!safeParse.success) return kind.default;
  let l;
  try {
    let { replied: replied } = host.request(
      {
        kind: kind.kind,
        payload: safeParse.data,
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
  let safeParse_2 = kind.result().safeParse(l.result);
  return safeParse_2.success ? safeParse_2.data : kind.default;
}
/**
 * 用异步迭代器提供载荷的对话框请求：首个载荷打开对话框，后续载荷实时更新，支持外部中止；回复后按结果 schema 校验，否则返回默认值；迭代器抛错时重新抛出。
 */
//@ chunk-tc95s49z.js:926-2012 placement
async function requestDialogStream(host, kind, payloads, options) {
  let n = payloads[Symbol.asyncIterator](),
    l = await n.next();
  if (l.done) return kind.default;
  let safeParse = kind.payload().safeParse(l.value);
  if (!safeParse.success) return (n.return?.(void 0), kind.default);
  let abortController = new AbortController(),
    c = () => abortController.abort();
  if (options?.signal)
    if (options.signal.aborted) abortController.abort();
    else options.signal.addEventListener("abort", c, { once: !0 });
  let { replied: replied, update: update } = host.request(
      {
        kind: kind.kind,
        payload: safeParse.data,
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
    ),
    d;
  (async () => {
    try {
      while (!abortController.signal.aborted) {
        let s = await n.next();
        if (s.done) return;
        if (abortController.signal.aborted) return;
        let safeParse = kind.payload().safeParse(s.value);
        if (!safeParse.success) continue;
        update(safeParse.data);
      }
    } catch (error) {
      ((d = error), abortController.abort());
    }
  })().catch(() => {});
  let u;
  try {
    u = await replied;
  } finally {
    (options?.signal?.removeEventListener("abort", c), n.return?.(void 0));
  }
  if (d !== void 0) throw d;
  if ("cancelled" in u) return kind.default;
  let safeParse_2 = kind.result().safeParse(u.result);
  return safeParse_2.success ? safeParse_2.data : kind.default;
}

export { withHideWhile, fAi, $9t };
