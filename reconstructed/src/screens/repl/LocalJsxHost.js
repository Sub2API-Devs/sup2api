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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { LOCAL_JSX_DIALOG } from "../../commands/rate-limit-options/index.js";

//@ chunk-18hwfzwa.js:183100-184170 placement
function requestLocalJsxDialog() {
  let signal = createSignal();
  let signal_2 = createSignal();
  let signal_3 = createSignal();
  let L = new Map();
  let ee = 0;
  let ke = 0;
  return {
    subscribe(Re) {
      ke += 1;
      let Be = signal.subscribe(Re);
      let He = false;
      return () => {
        if (He) return;
        He = true;
        ke -= 1;
        Be();
      };
    },
    onCancel: signal_2.subscribe,
    onUpdate: signal_3.subscribe,
    reply(Re) {
      let Be = L.get(Re.id);
      if (!Be) return;
      L.delete(Re.id);
      Be(Re);
    },
    request({ kind, payload, userInvoked, hideWhile, holdsTop }, Xe) {
      ee += 1;
      let rt = `dialog-${ee}`;
      let { promise, resolve } = Promise.withResolvers();
      let signal_4 = Xe?.signal;
      if (signal_4?.aborted || ke === 0) {
        queueMicrotask(() =>
          resolve({
            id: rt,
            cancelled: true,
          }),
        );
        return {
          id: rt,
          replied: promise,
          update: () => {},
        };
      }
      let Ot;
      L.set(rt, (Et) => {
        if (signal_4 && Ot) signal_4.removeEventListener("abort", Ot);
        resolve(Et);
      });
      if (signal_4) {
        Ot = () => {
          if (L.delete(rt)) {
            resolve({
              id: rt,
              cancelled: true,
            });
            signal_2.emit(rt);
          }
        };
        signal_4.addEventListener("abort", Ot, {
          once: true,
        });
      }
      signal.emit({
        id: rt,
        kind,
        payload,
        place: Xe?.place,
        askOrder: Xe?.askOrder,
        shownAt: Xe?.armInputGrace ? Date.now() : undefined,
        succeeds: Xe?.succeeds,
        userInvoked,
        hideWhile,
        holdsTop,
        onFirstReveal: Xe?.onFirstReveal,
        onClaimed: Xe?.onClaimed,
        countedAsk: Xe?.countedAsk,
      });
      return {
        id: rt,
        replied: promise,
        update: (payload) => {
          if (L.has(rt))
            signal_3.emit({
              id: rt,
              payload,
            });
        },
      };
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
  constructor(requestDialog) {
    this.#e = requestDialog;
  }
  subscribe = (h) => this.#n.subscribe(h);
  getSnapshot = () => this.#t;
  show(h, { commandName, immediate, hidesPrompt, retireAtTurnBoundary, holdsQueue = true }) {
    this.#s += 1;
    let Re = `local-jsx-${this.#s}`;
    let abortController = new AbortController();
    this.#r((We) => We.set(Re, h));
    if (retireAtTurnBoundary) this.#o.set(Re, () => abortController.abort());
    let closed = this.#e(
      LOCAL_JSX_DIALOG,
      {
        nodeId: Re,
        commandName,
        immediate,
        hidesPrompt,
        ...(!holdsQueue && {
          holdsQueue: false,
        }),
      },
      {
        signal: abortController.signal,
      },
    ).then(() => {
      this.#o.delete(Re);
      this.#r((We) => We.delete(Re));
      return abortController.signal.aborted ? "closed" : "dismissed";
    });
    return {
      nodeId: Re,
      closed,
      close: () => abortController.abort(),
    };
  }
  closeCommandPanels() {
    for (let h of this.#o.values()) h();
  }
  get size() {
    return this.#t.size;
  }
  #r(h) {
    let x = new Map(this.#t);
    h(x);
    this.#t = x;
    this.#n.emit();
  }
}
//@ chunk-18hwfzwa.js:184931-185079 placement
async function clearMcpAuthCaches(h, x, storageV5) {
  let L = require("./chunk-asne9cp8.js").mcpClientModule();
  await L.clearServerCache(h, x);
  await L.removeMcpAuthCacheEntry(h, storageV5);
}
export { requestLocalJsxDialog, LocalJsxHost, clearMcpAuthCaches };
