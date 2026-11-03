/**
 * tasks/MonitorMcpTask/MonitorMcpTask.ts
 *
 * 2.1.316 新增：MonitorMcpTask：监视 MCP 资源的后台任务类型。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (4)
 * attribution: placement 4
 */
import { stopMonitorTask } from "../MonitorTask/monitorDelivery.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { getTaskImplsByType } from "../../tasks.js";

//@ chunk-kxyd0g16.js:17488-17563 placement
var oo = {
  name: "MonitorMcpTask",
  type: "monitor_mcp",
  async kill(e, r) {
    registerMonitorMcpTask(e, r);
  },
};
//@ chunk-kxyd0g16.js:17563-17713 placement
function registerMonitorMcpTask(e, r, n) {
  stopMonitorTask(e, r, {
    ...n,
    onKilled: () => {
      n?.onKilled?.();
      let { streamedMonitorStops: streamedMonitorStops } = getTaskRunState(),
        f = streamedMonitorStops.get(e);
      streamedMonitorStops.delete(e);
      try {
        f?.();
      } catch (error) {
        logError(toError(error));
      }
    },
  });
}
//@ chunk-kxyd0g16.js:18019-18104 placement
class ro {
  dispatch = void 0;
  lookup(e) {
    return ((this.dispatch ??= getTaskImplsByType()), this.dispatch.get(e));
  }
}
//@ chunk-kxyd0g16.js:18104-18118 placement
var Zn = new ro();

export { oo, Zn };
