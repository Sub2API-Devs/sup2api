/**
 * utils/messages/ultrathinkOrigin.ts
 *
 * 判定消息是否来自外部来源（原生 Origin 行、is_meta、client_platform、initiator 等）供 ultrathink 判定用（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9sx87q0n.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hasNonHumanOrigin } from "../messageProvenance.js";
import { isDefinedHumanClientPlatform, isClaudeCodeCliPlatform } from "../../bridge/inboundMessageOrigin.js";
import { isTextNotTyped } from "../../entrypoints/sdk/coreSchemas.js";
import { originKindForWakeup } from "../promptSource.js";

//@ chunk-9sx87q0n.js:342-816 placement
/**
 * 判定一条消息是否来自外部来源（origin、is_meta、seeded_summon、client_composed、inbound_origin、未知 client_platform、initiator 等），供 ultrathink 判定。
 */
function isPersonTurn(message) {
  let clientPlatform = "client_platform" in message ? message.client_platform : undefined;
  return !(
    hasNonHumanOrigin(
      "origin" in message ? message.origin : undefined,
      "isSynthetic" in message && Boolean(message.isSynthetic),
    ) ||
    ("is_meta" in message && message.is_meta === true) ||
    ("seeded_summon" in message && message.seeded_summon === true) ||
    ("client_composed" in message && message.client_composed === true) ||
    ("inbound_origin" in message && message.inbound_origin !== undefined) ||
    (clientPlatform !== undefined &&
      !(
        typeof clientPlatform === "string" &&
        (isDefinedHumanClientPlatform(clientPlatform) || isClaudeCodeCliPlatform(clientPlatform))
      )) ||
    isTextNotTyped(message) ||
    originKindForWakeup(
      "initiator" in message && typeof message.initiator === "string" ? message.initiator : undefined,
    ) !== undefined
  );
}
export { isPersonTurn };
