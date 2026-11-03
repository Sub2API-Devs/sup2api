/**
 * screens/repl/LocalJsxHost.ts
 *
 * 2.1.316 新增。本地 JSX 命令宿主。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { createSignal } from "../../utils/signal.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { LOCAL_JSX_DIALOG } from "../../commands/rate-limit-options/index.js";

//@ chunk-18hwfzwa.js:183100-184170 placement
function requestLocalJsxDialog() {
  let h = createSignal(),
    x = createSignal(),
    D = createSignal(),
    L = new Map(),
    ee = 0,
    ke = 0;
  return {
    subscribe(Re) {
      ke += 1;
      let subscribe = h.subscribe(Re),
        He = !1;
      return () => {
        if (He) return;
        ((He = !0), (ke -= 1), subscribe());
      };
    },
    onCancel: x.subscribe,
    onUpdate: D.subscribe,
    reply(Re) {
      let Be = L.get(Re.id);
      if (!Be) return;
      (L.delete(Re.id), Be(Re));
    },
    request({ kind: Re, payload: Be, userInvoked: He, hideWhile: We, holdsTop: ze }, Xe) {
      ee += 1;
      let rt = `dialog-${ee}`,
        { promise: promise, resolve: resolve } = Promise.withResolvers(),
        It = Xe?.signal;
      if (It?.aborted || ke === 0)
        return (
          queueMicrotask(() => resolve({ id: rt, cancelled: !0 })),
          { id: rt, replied: promise, update: () => {} }
        );
      let Ot;
      if (
        (L.set(rt, (Et) => {
          if (It && Ot) It.removeEventListener("abort", Ot);
          resolve(Et);
        }),
        It)
      )
        ((Ot = () => {
          if (L.delete(rt)) (resolve({ id: rt, cancelled: !0 }), x.emit(rt));
        }),
          It.addEventListener("abort", Ot, { once: !0 }));
      return (
        h.emit({
          id: rt,
          kind: Re,
          payload: Be,
          place: Xe?.place,
          askOrder: Xe?.askOrder,
          shownAt: Xe?.armInputGrace ? Date.now() : void 0,
          succeeds: Xe?.succeeds,
          userInvoked: He,
          hideWhile: We,
          holdsTop: ze,
          onFirstReveal: Xe?.onFirstReveal,
          onClaimed: Xe?.onClaimed,
          countedAsk: Xe?.countedAsk,
        }),
        {
          id: rt,
          replied: promise,
          update: (Et) => {
            if (L.has(rt)) D.emit({ id: rt, payload: Et });
          },
        }
      );
    },
  };
}
//@ chunk-18hwfzwa.js:184170-184931 placement
class LocalJsxHost {
  #e;
  #t = new Map();
  #o = new Map();
  #n = createSignal();
  #s = 0;
  constructor(h) {
    this.#e = h;
  }
  subscribe = (h) => this.#n.subscribe(h);
  getSnapshot = () => this.#t;
  show(h, { commandName: x, immediate: D, hidesPrompt: L, retireAtTurnBoundary: ee, holdsQueue: ke = !0 }) {
    this.#s += 1;
    let Re = `local-jsx-${this.#s}`,
      abortController = new AbortController();
    if ((this.#r((We) => We.set(Re, h)), ee)) this.#o.set(Re, () => abortController.abort());
    let He = this.#e(
      LOCAL_JSX_DIALOG,
      { nodeId: Re, commandName: x, immediate: D, hidesPrompt: L, ...(!ke && { holdsQueue: !1 }) },
      { signal: abortController.signal },
    ).then(
      () => (
        this.#o.delete(Re),
        this.#r((We) => We.delete(Re)),
        abortController.signal.aborted ? "closed" : "dismissed"
      ),
    );
    return { nodeId: Re, closed: He, close: () => abortController.abort() };
  }
  closeCommandPanels() {
    for (let h of this.#o.values()) h();
  }
  get size() {
    return this.#t.size;
  }
  #r(h) {
    let x = new Map(this.#t);
    (h(x), (this.#t = x), this.#n.emit());
  }
}
//@ chunk-18hwfzwa.js:184931-185079 placement
async function clearMcpAuthCaches(h, x, D) {
  let mcpClientModule = require("./chunk-asne9cp8.js").mcpClientModule();
  (await mcpClientModule.clearServerCache(h, x), await mcpClientModule.removeMcpAuthCacheEntry(h, D));
}

export { requestLocalJsxDialog, LocalJsxHost, clearMcpAuthCaches };
