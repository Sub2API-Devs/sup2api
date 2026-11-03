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
import { j, Q, ce, yt, P } from "../../vendor/react/cjs/react.production.js";
import { useMailbox } from "../context/mailbox.js";
import { useStoreSelector } from "./useStoreSelector.js";

//@ chunk-18hwfzwa.js:1665839-1665843 placement
j();
//@ chunk-18hwfzwa.js:1665843-1666058 fingerprint = useMailboxBridge (0.742)
function useMailboxBridge(h) {
  let mailbox = useMailbox(),
    isLoading = useStoreSelector(h, (Re) => Re.isLoading),
    getSnapshot = Q(() => mailbox.subscribe.bind(mailbox), [mailbox]),
    revision = ce(() => mailbox.revision, [mailbox]),
    ke = yt(getSnapshot, revision);
  P(() => {
    if (isLoading) return;
    let msg = mailbox.poll();
    if (msg) h.submitIncomingPrompt(msg.content);
  }, [isLoading, ke, mailbox, h]);
}

export { useMailboxBridge };
