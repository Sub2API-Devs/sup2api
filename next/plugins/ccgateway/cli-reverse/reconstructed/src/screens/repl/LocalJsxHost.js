/**
 * screens/repl/LocalJsxHost.ts
 *
 * 2.1.316 新增。本地 JSX 命令宿主。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createSignal } from "../../utils/signal.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { LOCAL_JSX_DIALOG } from "../../commands/rate-limit-options/index.js";

//@ chunk-czq1j3j2.js:187897-188967 placement
function requestLocalJsxDialog() {
  let signal = createSignal();
  let signal_2 = createSignal();
  let signal_3 = createSignal();
  let pendingReplies = new Map();
  let dialogCount = 0;
  let subscriberCount = 0;
  return {
    subscribe(listener) {
      subscriberCount += 1;
      let unsubscribe = signal.subscribe(listener);
      let unsubscribed = false;
      return () => {
        if (unsubscribed) return;
        unsubscribed = true;
        subscriberCount -= 1;
        unsubscribe();
      };
    },
    onCancel: signal_2.subscribe,
    onUpdate: signal_3.subscribe,
    reply(reply) {
      let resolveReply = pendingReplies.get(reply.id);
      if (!resolveReply) return;
      pendingReplies.delete(reply.id);
      resolveReply(reply);
    },
    request({ kind, payload, userInvoked, hideWhile, holdsTop }, options) {
      dialogCount += 1;
      let id = `dialog-${dialogCount}`;
      let { promise, resolve } = Promise.withResolvers();
      let signal_4 = options?.signal;
      if (signal_4?.aborted || subscriberCount === 0) {
        queueMicrotask(() =>
          resolve({
            id,
            cancelled: true,
          }),
        );
        return {
          id,
          replied: promise,
          update: () => {},
        };
      }
      let onAbort;
      pendingReplies.set(id, (handleReply) => {
        if (signal_4 && onAbort) signal_4.removeEventListener("abort", onAbort);
        resolve(handleReply);
      });
      if (signal_4) {
        onAbort = () => {
          if (pendingReplies.delete(id)) {
            resolve({
              id,
              cancelled: true,
            });
            signal_2.emit(id);
          }
        };
        signal_4.addEventListener("abort", onAbort, {
          once: true,
        });
      }
      signal.emit({
        id,
        kind,
        payload,
        place: options?.place,
        askOrder: options?.askOrder,
        shownAt: options?.armInputGrace ? Date.now() : undefined,
        succeeds: options?.succeeds,
        userInvoked,
        hideWhile,
        holdsTop,
        onFirstReveal: options?.onFirstReveal,
        onClaimed: options?.onClaimed,
        countedAsk: options?.countedAsk,
      });
      return {
        id,
        replied: promise,
        update: (payload) => {
          if (pendingReplies.has(id))
            signal_3.emit({
              id,
              payload,
            });
        },
      };
    },
  };
}
//@ chunk-czq1j3j2.js:188967-189728 placement
class LocalJsxHost {
  #e;
  #t = new Map();
  #o = new Map();
  #n = createSignal();
  #r = 0;
  constructor(requestDialog) {
    this.#e = requestDialog;
  }
  subscribe = (listener) => this.#n.subscribe(listener);
  getSnapshot = () => this.#t;
  show(node, { commandName, immediate, hidesPrompt, retireAtTurnBoundary, holdsQueue = true }) {
    this.#r += 1;
    let nodeId = `local-jsx-${this.#r}`;
    let abortController = new AbortController();
    this.#s((panels) => panels.set(nodeId, node));
    if (retireAtTurnBoundary) this.#o.set(nodeId, () => abortController.abort());
    let closed = this.#e(
      LOCAL_JSX_DIALOG,
      {
        nodeId,
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
      this.#o.delete(nodeId);
      this.#s((panels) => panels.delete(nodeId));
      return abortController.signal.aborted ? "closed" : "dismissed";
    });
    return {
      nodeId,
      closed,
      close: () => abortController.abort(),
    };
  }
  closeCommandPanels() {
    for (let closePanel of this.#o.values()) closePanel();
  }
  get size() {
    return this.#t.size;
  }
  #s(updatePanels) {
    let nextPanels = new Map(this.#t);
    updatePanels(nextPanels);
    this.#t = nextPanels;
    this.#n.emit();
  }
}
//@ chunk-czq1j3j2.js:189728-189876 placement
async function clearMcpAuthCaches(serverName, serverConfig, storageV5) {
  let mcpClient = require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
  await mcpClient.clearServerCache(serverName, serverConfig);
  await mcpClient.removeMcpAuthCacheEntry(serverName, storageV5);
}
export { requestLocalJsxDialog, LocalJsxHost, clearMcpAuthCaches };
