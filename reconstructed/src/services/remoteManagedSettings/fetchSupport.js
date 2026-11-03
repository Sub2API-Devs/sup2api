/**
 * services/remoteManagedSettings/fetchSupport.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7t4fmt2f.js (4)
 * attribution: placement 4
 */
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { Y_i } from "../../entrypoints/warmSpare/claimCredentials.js";
import { env } from "../../utils/env.js";
import { getCredentialRoad, onInteraction } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { setDisposableInterval } from "../../utils/errorLogSink.js";
import { Wts } from "../api/errorUtils.js";

/**
 * 判断远程托管设置请求使用的认证来源（托管设置、环境变量、文件描述符或无）。
 */
//@ chunk-7t4fmt2f.js:2229-2483 placement
function settingsAuthSource() {
  if (hasManagedSettings()) return Y_i();
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return "env_var";
  let e = getCredentialRoad("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR");
  if (e !== void 0) return e;
  if (env.ANTHROPIC_API_KEY) return "env_var";
  return getCredentialRoad("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR") ?? "none";
}
//@ chunk-7t4fmt2f.js:2597-2606 placement
var Jt = 3;
//@ chunk-7t4fmt2f.js:2606-2704 placement
function Xt() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_zippy_gosling", 0);
  return typeof e === "number" && Number.isFinite(e) ? e : 0;
}
/**
 * 定时轮询，但用户最近有交互时推迟执行（最多推迟 Jt 次），等下一次交互后立刻补跑；返回可 dispose 的句柄。
 */
//@ chunk-7t4fmt2f.js:2778-3115 placement
function startInteractionAwarePoll(onTick, intervalMs, options = {}) {
  let o = 0,
    u = null,
    p = null,
    h = setDisposableInterval(R, intervalMs, options);
  function y() {
    if ((u?.(), (u = null), p !== null)) (clearTimeout(p), (p = null));
  }
  function E() {
    ((o = 0), y(), onTick());
  }
  function R() {
    let S = Xt();
    if (!(S > 0 && Wts(S)) || o >= Jt) {
      E();
      return;
    }
    (o++,
      (u ??= onInteraction(() => {
        p ??= setTimeout(() => {
          (h[Symbol.dispose](), (h = setDisposableInterval(R, intervalMs, options)), E());
        }, 0);
      })));
  }
  return {
    [Symbol.dispose]: () => {
      (h[Symbol.dispose](), y());
    },
  };
}

export { settingsAuthSource, startInteractionAwarePoll };
