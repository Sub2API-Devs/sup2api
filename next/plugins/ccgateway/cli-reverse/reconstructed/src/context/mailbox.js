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
import { createContext, useContext } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { Mailbox } from "../utils/mailbox.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-xe7zq1p4.js:12161-12179 placement
var mailboxContext = createContext(undefined);
//@ chunk-xe7zq1p4.js:12179-12357 placement
function MailboxProvider(props) {
  let $ = useMemoCache(3);
  let { children } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = new Mailbox();
    $[0] = t1;
  } else t1 = $[0];
  let mailbox = t1;
  let t2;
  if ($[1] !== children) {
    t2 = jsxProd_default(mailboxContext.Provider, {
      value: mailbox,
      children,
    });
    $[1] = children;
    $[2] = t2;
  } else t2 = $[2];
  return t2;
}
//@ chunk-xe7zq1p4.js:12357-12465 fingerprint (2.1.88 match: useMailbox, 1)
/**
 * 读取 Mailbox 上下文，不在 MailboxProvider 内时抛错。
 */
function useMailbox() {
  let mailbox = useContext(mailboxContext);
  if (!mailbox) {
    throw Error("useMailbox must be used within a MailboxProvider");
  }
  return mailbox;
}
export { useMailbox, MailboxProvider };
