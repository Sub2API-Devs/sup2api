/**
 * services/selfHostedRunner/reviewTokenGuard.ts
 *
 * 2.1.316 新增：自托管 runner 下 review 会话令牌的防护判断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dbe4a9af.js (1)
 * attribution: placement 1
 */
import { disableCoreDumps } from "../../utils/processHardening.js";

/**
 * 自托管 BYOC 环境中的审阅会话禁用核心转储。
 */
//@ chunk-dbe4a9af.js:227-427 placement
function disableCoreDumpsForReview() {
  if (
    process.env.CLAUDE_CODE_REMOTE_SESSION_ORIGIN === "review" &&
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc" &&
    process.env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE === "self_hosted"
  )
    disableCoreDumps(() => {});
}
