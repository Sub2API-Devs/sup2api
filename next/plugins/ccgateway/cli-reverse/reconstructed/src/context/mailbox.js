/**
 * context/mailbox.tsx
 *
 * Mailbox 上下文读取 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/mailbox.tsx
 * pieces: chunk-swe0kb5q.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { createContext, useContext } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { Mailbox } from "../utils/mailbox.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-swe0kb5q.js:12181-12199 placement
var mailboxContext = createContext(undefined);
//@ chunk-swe0kb5q.js:12199-12377 placement
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
//@ chunk-swe0kb5q.js:12377-12485 fingerprint (2.1.88 match: useMailbox, 1)
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
export { MailboxProvider, useMailbox };
