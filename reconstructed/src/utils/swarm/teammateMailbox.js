/**
 * utils/swarm/teammateMailbox.ts
 *
 * 2.1.316 新增：队友邮箱
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { USER } from "./constants.js";
import { receiveAgentMessage, teammateMessageOrigin } from "../../plugins/functionHooks/sessionReceive.js";
import { logForDebugging } from "../debug.js";
import { jsonStringify } from "../slowOperations.js";

//@ chunk-e6aww6q8.js:3309320-3309765 placement
/**
 * 让邮箱消息经过接收 hook 过滤，已验证的用户消息直接放行。
 */
async function filterMailboxThroughReceiveHooks(e, n) {
  let r = [];
  for (let s of e) {
    let h = n.provenanceOf(s);
    if (n.isPassedThrough?.(s) === true || (h === "verified" && s.from === USER)) {
      r.push({
        ...s,
        provenance: h,
      });
      continue;
    }
    let S = await receiveAgentMessage(teammateMessageOrigin(s, h === "verified"), s.text, n.agentId);
    if (S.consumed !== undefined) {
      logForDebugging(
        `[TeammateMailbox] entry from ${jsonStringify(s.from)} consumed by a session.receive hook (${S.consumed}); not delivered`,
      );
      continue;
    }
    r.push({
      ...s,
      ...(S.text !== s.text && {
        text: S.text,
      }),
      provenance: h,
    });
  }
  return r;
}
export { filterMailboxThroughReceiveHooks };
