/**
 * hooks/useMailboxBridge.ts
 *
 * 把 mailbox 消息桥接到当前回合（提交为提示）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useMailboxBridge.ts
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-czq1j3j2.js:1703141-1703145 placement
init_react_production();
//@ chunk-czq1j3j2.js:1711880-1712095 fingerprint (2.1.88 match: useMailboxBridge, 0.743)
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
