/**
 * services/mcp/elicitationDialogs.ts
 *
 * 2.1.316 新增：MCP elicitation 对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7dan15rc.js (2), chunk-sahc08q8.js (2)
 * attribution: placement 4
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { hu, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { hasCacheKillSwitch, setCacheKillSwitch } from "./mcpAccountKey.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-7dan15rc.js:374-584 placement
/**
 * MCP URL elicitation 对话框类型定义（默认取消）。
 */
var MCP_URL_ELICITATION_DIALOG = withHideWhile({
  kind: "mcp_url_elicitation",
  payload: DoctorLazy(() =>
    hu((e) => typeof e === "object" && e !== null && "serverName" in e && "params" in e),
  ),
  result: DoctorLazy(() => hu((e) => typeof e === "object" && e !== null)),
  default: {
    action: "cancel",
  },
});
//@ chunk-7dan15rc.js:584-710 placement
/**
 * 预置发现缓存开关的读取函数（首次调用时读取并缓存特性值）。
 */
function primeDiscoveryCacheFlag() {
  if (hasCacheKillSwitch()) return;
  let e = false;
  let t;
  setCacheKillSwitch(() => {
    if (!e) {
      e = true;
      t = getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_discovery_cache_enable", null) ?? undefined;
    }
    return t;
  });
}
//@ chunk-sahc08q8.js:300-726 placement
/**
 * MCP elicitation 对话框与"等待 elicitation"对话框的类型定义。
 */
var MCP_ELICITATION_DIALOG = withHideWhile({
  kind: "mcp_elicitation",
  payload: DoctorLazy(() =>
    hu((t) => typeof t === "object" && t !== null && "serverName" in t && "params" in t),
  ),
  result: DoctorLazy(() => hu((t) => typeof t === "object" && t !== null)),
  default: {
    action: "cancel",
  },
  holdsTop: true,
});
var MCP_ELICITATION_WAITING_DIALOG = withHideWhile({
  kind: "mcp_elicitation_waiting",
  payload: DoctorLazy(() =>
    hu((t) => typeof t === "object" && t !== null && "serverName" in t && "params" in t),
  ),
  result: DoctorLazy(() => _enum(["dismiss", "retry", "cancel", "cancelled"])),
  default: "cancelled",
});
//@ chunk-sahc08q8.js:726-775 placement
/**
 * 判断对话框类型是否属于 MCP elicitation。
 */
function isElicitationDialogKind(blockingDialogKind) {
  return (
    blockingDialogKind === MCP_ELICITATION_DIALOG.kind ||
    blockingDialogKind === MCP_ELICITATION_WAITING_DIALOG.kind
  );
}
export {
  MCP_ELICITATION_DIALOG,
  isElicitationDialogKind,
  MCP_ELICITATION_WAITING_DIALOG,
  MCP_URL_ELICITATION_DIALOG,
  primeDiscoveryCacheFlag,
};
