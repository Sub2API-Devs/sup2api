/**
 * remote/tools/serve/hostInventory.ts
 *
 * 2.1.316 新增。远程工具服务启动时收集主机工具清单（gcloud、brew、sqlite3、ffmpeg 等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5mav84cq.js (3)
 * attribution: placement 3
 */
import { statfs } from "fs/promises";
import { availableParallelism, totalmem } from "os";
import { isViolinRibEnabled } from "../../../services/analytics/violinRibGate.js";
import { hostProfileSharing, gatherHostProfile } from "../../../utils/toolchainDetection.js";
import { logError } from "../../../utils/log.js";
import { toError } from "../../../utils/errors.js";
import { xXr, PXr, IXr } from "../protocolConstants.js";
import { withDeadline } from "../../../utils/sleep.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { jsonStringify } from "../../../utils/slowOperations.js";

//@ chunk-5mav84cq.js:587-679 placement
var c = ["gcloud", "aws", "az", "gh", "brew", "apt", "sqlite3", "ffmpeg", "rg", "jq"],
  s = 2000,
  a = 2n ** 30n;
//@ chunk-5mav84cq.js:679-761 placement
function isHostInventoryShared() {
  try {
    return isViolinRibEnabled() && hostProfileSharing("basic") !== "off";
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
/**
 * 远程工具服务启动时收集主机工具清单（gcloud、brew、sqlite3、ffmpeg 等）。
 */
//@ chunk-5mav84cq.js:761-1539 placement
async function gatherHostInventory(t) {
  try {
    if (!isHostInventoryShared()) return;
    let [e, r] = await Promise.all([
      gatherHostProfile({
        includeMcpServers: !1,
        signal: AbortSignal.timeout(s),
        alsoLookFor: c,
        maxTools: xXr,
      }),
      withDeadline(statfs(t, { bigint: !0 }), s).catch(() => {
        return;
      }),
    ]);
    if (e === void 0) {
      logFeatureBad("remote_tools_host_inventory", "unsupported_platform");
      return;
    }
    let n = r === void 0 ? -1n : r.bavail * r.bsize;
    if (!e.complete) logFeatureSad("remote_tools_host_inventory", "deadline");
    else if (n < 0n) logFeatureSad("remote_tools_host_inventory", "disk_unread");
    else logFeatureOk("remote_tools_host_inventory");
    let i = {
        ...(!e.complete && { incomplete: !0 }),
        cpus: availableParallelism(),
        memory_gb: Math.round(totalmem() / Number(a)),
        ...(n >= 0n && { disk_free_gb: Math.min(Number(n / a), PXr) }),
      },
      tools = e.profile.tools;
    while (tools.length > 0 && jsonStringify({ tools: tools, ...i }).length > IXr) tools = tools.slice(0, -1);
    return { tools: tools, ...i };
  } catch (error) {
    (logError(toError(error)), logFeatureBad("remote_tools_host_inventory", "error"));
    return;
  }
}

export { isHostInventoryShared };
