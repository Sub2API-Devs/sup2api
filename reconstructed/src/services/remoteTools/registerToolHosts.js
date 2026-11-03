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
import { mei } from "../../utils/worktreeIsolation.js";

/**
 * 启动时在满足远程工具服务开关时异步加载并注册工具宿主（tool hosts），失败只记日志。
 */
//@ chunk-0k89j1c1.js:334-580 placement
function registerToolHosts() {
  let t,
    o = !1,
    r = () => {
      if (isRemoteToolForwardingSwitchOn())
        ((o = !0),
          import("./chunk-dtv8x2hx.js")
            .then(({ createRemoteToolHostsRuntime: createRemoteToolHostsRuntime }) => {
              t = createRemoteToolHostsRuntime();
            })
            .catch((e) => {
              (logError(toError(e)), (o = !1));
            }));
    },
    i = void 0;
  if (
    (mei({
      get remote() {
        if (!o) r();
        return t;
      },
      ...(i !== void 0 && { loopbackDev: i }),
    }),
    isRemoteToolForwardingSwitchOn())
  )
    r();
}

export { registerToolHosts };
