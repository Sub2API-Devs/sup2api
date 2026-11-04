/**
 * hooks/useMailboxBridge.ts
 *
 * 把 mailbox 消息桥接到当前回合（提交为提示）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useMailboxBridge.ts
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 1, fingerprint 1
 */
import {
  init_react_production,
  useMemo,
  useCallback,
  useSyncExternalStore,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { useMailbox } from "../context/mailbox.js";
import { useStoreSelector } from "./useStoreSelector.js";

//@ chunk-18hwfzwa.js:1665839-1665843 placement
init_react_production();
//@ chunk-18hwfzwa.js:1665843-1666058 fingerprint (2.1.88 match: useMailboxBridge, 0.742)
function useMailboxBridge(onSubmitMessage) {
  let mailbox = useMailbox();
  let isLoading = useStoreSelector(onSubmitMessage, (state) => state.isLoading);
  let subscribe = useMemo(() => mailbox.subscribe.bind(mailbox), [mailbox]);
  let getSnapshot = useCallback(() => mailbox.revision, [mailbox]);
  let revision = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => {
    if (isLoading) return;
    let msg = mailbox.poll();
    if (msg) onSubmitMessage.submitIncomingPrompt(msg.content);
  }, [isLoading, revision, mailbox, onSubmitMessage]);
}
export { useMailboxBridge };
