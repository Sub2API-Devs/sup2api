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
import { hu, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { M4s, O4s } from "./mcpAccountKey.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

/**
 * MCP URL elicitation 对话框类型定义（默认取消）。
 */
//@ chunk-7dan15rc.js:374-584 placement
var MCP_URL_ELICITATION_DIALOG = withHideWhile({
  kind: "mcp_url_elicitation",
  payload: DoctorLazy(() =>
    hu((e) => typeof e === "object" && e !== null && "serverName" in e && "params" in e),
  ),
  result: DoctorLazy(() => hu((e) => typeof e === "object" && e !== null)),
  default: { action: "cancel" },
});
/**
 * 预置发现缓存开关的读取函数（首次调用时读取并缓存特性值）。
 */
//@ chunk-7dan15rc.js:584-710 placement
function primeDiscoveryCacheFlag() {
  if (M4s()) return;
  let e = !1,
    t;
  O4s(() => {
    if (!e)
      ((e = !0),
        (t = getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_discovery_cache_enable", null) ?? void 0));
    return t;
  });
}
/**
 * MCP elicitation 对话框与"等待 elicitation"对话框的类型定义。
 */
//@ chunk-sahc08q8.js:300-726 placement
var MCP_ELICITATION_DIALOG = withHideWhile({
    kind: "mcp_elicitation",
    payload: DoctorLazy(() =>
      hu((t) => typeof t === "object" && t !== null && "serverName" in t && "params" in t),
    ),
    result: DoctorLazy(() => hu((t) => typeof t === "object" && t !== null)),
    default: { action: "cancel" },
    holdsTop: !0,
  }),
  MCP_ELICITATION_WAITING_DIALOG = withHideWhile({
    kind: "mcp_elicitation_waiting",
    payload: DoctorLazy(() =>
      hu((t) => typeof t === "object" && t !== null && "serverName" in t && "params" in t),
    ),
    result: DoctorLazy(() => U(["dismiss", "retry", "cancel", "cancelled"])),
    default: "cancelled",
  });
//@ chunk-sahc08q8.js:726-775 placement
function oLo(t) {
  return t === MCP_ELICITATION_DIALOG.kind || t === MCP_ELICITATION_WAITING_DIALOG.kind;
}

export {
  MCP_ELICITATION_DIALOG,
  oLo,
  MCP_ELICITATION_WAITING_DIALOG,
  MCP_URL_ELICITATION_DIALOG,
  primeDiscoveryCacheFlag,
};
