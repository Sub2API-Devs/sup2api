/**
 * context/mailbox.tsx
 *
 * Mailbox 上下文读取 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/mailbox.tsx
 * pieces: chunk-xe7zq1p4.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { qt, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { Mailbox } from "../utils/mailbox.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-xe7zq1p4.js:12161-12179 placement
var fe = qt(void 0);
//@ chunk-xe7zq1p4.js:12179-12357 placement
function MailboxProvider(t0) {
  let i = w(3),
    { children: children } = t0,
    o;
  if (i[0] === MEMO_CACHE_SENTINEL) ((o = new Mailbox()), (i[0] = o));
  else o = i[0];
  let mailbox = o,
    c;
  if (i[1] !== children)
    ((c = e(fe.Provider, { value: mailbox, children: children })), (i[1] = children), (i[2] = c));
  else c = i[2];
  return c;
}
/**
 * 读取 Mailbox 上下文，不在 MailboxProvider 内时抛错。
 */
//@ chunk-xe7zq1p4.js:12357-12465 fingerprint = useMailbox (1)
function useMailbox() {
  let mailbox = Se(fe);
  if (!mailbox) {
    throw Error("useMailbox must be used within a MailboxProvider");
  }
  return mailbox;
}

export { useMailbox, MailboxProvider };
