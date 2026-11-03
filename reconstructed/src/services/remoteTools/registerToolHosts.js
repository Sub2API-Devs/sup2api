/**
 * services/remoteTools/registerToolHosts.ts
 *
 * 2.1.316 新增。启动时在满足远程工具服务开关时异步加载并注册工具宿主（tool hosts），失败只记日志。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0k89j1c1.js (1)
 * attribution: placement 1
 */
import { isRemoteToolForwardingSwitchOn } from "./servingGates.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { registerIsolationRuntime } from "../../utils/worktreeIsolation.js";

//@ chunk-0k89j1c1.js:334-580 placement
/**
 * 启动时在满足远程工具服务开关时异步加载并注册工具宿主（tool hosts），失败只记日志。
 */
function registerToolHosts() {
  let t;
  let o = false;
  let r = () => {
    if (isRemoteToolForwardingSwitchOn()) {
      o = true;
      import("./chunk-dtv8x2hx.js")
        .then(({ createRemoteToolHostsRuntime }) => {
          t = createRemoteToolHostsRuntime();
        })
        .catch((error) => {
          logError(toError(error));
          o = false;
        });
    }
  };
  let i = undefined;
  registerIsolationRuntime({
    get remote() {
      if (!o) r();
      return t;
    },
    ...(i !== undefined && {
      loopbackDev: i,
    }),
  });
  if (isRemoteToolForwardingSwitchOn()) r();
}
export { registerToolHosts };
