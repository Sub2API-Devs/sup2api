/**
 * remote/tools/sessionRepositoryTrust.ts
 *
 * 2.1.316 新增。会话仓库信任读取器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vgetxrm1.js (1)
 * attribution: placement 1
 */
import { dce } from "../../utils/teleport/repositoryTrustGate.js";
import { Xti } from "./repositoryTrust.js";
import { createRefreshableValue } from "./toolHostsNotice.js";

/**
 * 会话仓库信任读取器。
 */
//@ chunk-vgetxrm1.js:269-476 placement
function sessionRepositoryTrustReader({
  sessionId: sessionId,
  getAccessToken: getAccessToken,
  fetchSession: fetchSession,
  initial: initial,
  createOrigin: createOrigin,
}) {
  if (!dce()) return;
  let n = !1,
    r = (o) => Xti(o, n);
  return createRefreshableValue({
    ...(initial && { initial: initial.then(r) }),
    read: () => fetchSession(sessionId, { accessToken: getAccessToken() }).then(r),
  });
}

export { sessionRepositoryTrustReader };
