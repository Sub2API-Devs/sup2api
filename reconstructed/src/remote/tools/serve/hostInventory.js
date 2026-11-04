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
import { MAX_INVENTORY_TOOLS, MAX_NONNEGATIVE_INT, MAX_INVENTORY_JSON_BYTES } from "../protocolConstants.js";
import { withDeadline } from "../../../utils/sleep.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { jsonStringify } from "../../../utils/slowOperations.js";

//@ chunk-5mav84cq.js:587-679 placement
var INVENTORY_PROBE_COMMANDS = ["gcloud", "aws", "az", "gh", "brew", "apt", "sqlite3", "ffmpeg", "rg", "jq"];
var INVENTORY_PROBE_TIMEOUT_MS = 2000;
var BYTES_PER_GIB = 2n ** 30n;
//@ chunk-5mav84cq.js:679-761 placement
function isHostInventoryShared() {
  try {
    return isViolinRibEnabled() && hostProfileSharing("basic") !== "off";
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-5mav84cq.js:761-1539 placement
/**
 * 远程工具服务启动时收集主机工具清单（gcloud、brew、sqlite3、ffmpeg 等）。
 */
async function gatherHostInventory(cwd) {
  try {
    if (!isHostInventoryShared()) return;
    let [hostProfile, diskStats] = await Promise.all([
      gatherHostProfile({
        includeMcpServers: false,
        signal: AbortSignal.timeout(INVENTORY_PROBE_TIMEOUT_MS),
        alsoLookFor: INVENTORY_PROBE_COMMANDS,
        maxTools: MAX_INVENTORY_TOOLS,
      }),
      withDeadline(
        statfs(cwd, {
          bigint: true,
        }),
        INVENTORY_PROBE_TIMEOUT_MS,
      ).catch(() => {
        return;
      }),
    ]);
    if (hostProfile === undefined) {
      logFeatureBad("remote_tools_host_inventory", "unsupported_platform");
      return;
    }
    let diskFreeBytes = diskStats === undefined ? -1n : diskStats.bavail * diskStats.bsize;
    if (!hostProfile.complete) logFeatureSad("remote_tools_host_inventory", "deadline");
    else if (diskFreeBytes < 0n) logFeatureSad("remote_tools_host_inventory", "disk_unread");
    else logFeatureOk("remote_tools_host_inventory");
    let hostFacts = {
      ...(!hostProfile.complete && {
        incomplete: true,
      }),
      cpus: availableParallelism(),
      memory_gb: Math.round(totalmem() / Number(BYTES_PER_GIB)),
      ...(diskFreeBytes >= 0n && {
        disk_free_gb: Math.min(Number(diskFreeBytes / BYTES_PER_GIB), MAX_NONNEGATIVE_INT),
      }),
    };
    let tools = hostProfile.profile.tools;
    while (
      tools.length > 0 &&
      jsonStringify({
        tools,
        ...hostFacts,
      }).length > MAX_INVENTORY_JSON_BYTES
    )
      tools = tools.slice(0, -1);
    return {
      tools,
      ...hostFacts,
    };
  } catch (error) {
    logError(toError(error));
    logFeatureBad("remote_tools_host_inventory", "error");
    return;
  }
}
export { isHostInventoryShared, gatherHostInventory };
