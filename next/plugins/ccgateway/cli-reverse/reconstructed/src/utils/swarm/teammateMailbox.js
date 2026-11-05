/**
 * utils/swarm/teammateMailbox.ts
 *
 * 2.1.316 新增：队友邮箱
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { USER } from "./constants.js";
import { receiveAgentMessage, teammateMessageOrigin } from "../../plugins/functionHooks/sessionReceive.js";
import { logForDebugging } from "../debug.js";
import { jsonStringify } from "../slowOperations.js";

//@ chunk-5xgkngpb.js:3394429-3394874 placement
/**
 * 让邮箱消息经过接收 hook 过滤，已验证的用户消息直接放行。
 */
async function filterMailboxThroughReceiveHooks(entries, options) {
  let kept = [];
  for (let entry of entries) {
    let provenance = options.provenanceOf(entry);
    if (options.isPassedThrough?.(entry) === true || (provenance === "verified" && entry.from === USER)) {
      kept.push({
        ...entry,
        provenance,
      });
      continue;
    }
    let hookResult = await receiveAgentMessage(
      teammateMessageOrigin(entry, provenance === "verified"),
      entry.text,
      options.agentId,
    );
    if (hookResult.consumed !== undefined) {
      logForDebugging(
        `[TeammateMailbox] entry from ${jsonStringify(entry.from)} consumed by a session.receive hook (${hookResult.consumed}); not delivered`,
      );
      continue;
    }
    kept.push({
      ...entry,
      ...(hookResult.text !== entry.text && {
        text: hookResult.text,
      }),
      provenance,
    });
  }
  return kept;
}
export { filterMailboxThroughReceiveHooks };
