/**
 * remote/tools/sessionRepositoryTrust.ts
 *
 * 2.1.316 新增。会话仓库信任读取器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vp4ftqw2.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isRepositoryTrustGateEnabled } from "../../utils/teleport/repositoryTrustGate.js";
import { repositoryTrustFromMessageTags } from "./repositoryTrust.js";
import { createRefreshableValue } from "./toolHostsNotice.js";

//@ chunk-vp4ftqw2.js:269-476 placement
/**
 * 会话仓库信任读取器。
 */
function sessionRepositoryTrustReader({ sessionId, getAccessToken, fetchSession, initial, createOrigin }) {
  if (!isRepositoryTrustGateEnabled()) return;
  let asked = false;
  let toTrust = (messages) => repositoryTrustFromMessageTags(messages, asked);
  return createRefreshableValue({
    ...(initial && {
      initial: initial.then(toTrust),
    }),
    read: () =>
      fetchSession(sessionId, {
        accessToken: getAccessToken(),
      }).then(toTrust),
  });
}
export { sessionRepositoryTrustReader };
