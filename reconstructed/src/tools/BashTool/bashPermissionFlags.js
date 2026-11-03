/**
 * tools/BashTool/bashPermissionFlags.ts
 *
 * 2.1.316 新增：Bash 权限相关开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { ge } from "../../utils/identity.js";

//@ chunk-e6aww6q8.js:1016950-1017012 placement
function kqt() {
  return readFlagWithOverride("tengu_delightful_goblet", { safe: !1 });
}
//@ chunk-e6aww6q8.js:1017012-1017159 placement
var TENGU_SPLENDID_HORIZON = "tengu_splendid_horizon",
  q7 = { enabled: !0, showDialog: !0, denyOnHostCard: !0, timeoutMs: 120000, maxDialogTimeouts: 3 },
  QPo = 5000,
  JPo = 3600000,
  ZPo = 100;
/**
 * 读取 tengu_splendid_horizon 配置的危险 rm 超时策略：是否启用（可被环境变量关闭）、是否显示对话框、主机卡片是否拒绝、超时与最大对话框超时次数（越界取默认）。
 */
//@ chunk-e6aww6q8.js:1017159-1017811 placement
function getDangerousRmTimeoutConfig() {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    TENGU_SPLENDID_HORIZON,
    {},
  );
  return {
    enabled: env.CLAUDE_CODE_DISABLE_DANGEROUS_RM_TIMEOUT
      ? !1
      : typeof e?.enabled === "boolean" && source === "payload"
        ? e.enabled
        : q7.enabled,
    showDialog: typeof e?.showDialog === "boolean" ? e.showDialog : q7.showDialog,
    denyOnHostCard: typeof e?.denyOnHostCard === "boolean" ? e.denyOnHostCard : q7.denyOnHostCard,
    timeoutMs:
      typeof e?.timeoutMs === "number" &&
      Number.isFinite(e.timeoutMs) &&
      e.timeoutMs >= QPo &&
      e.timeoutMs <= JPo
        ? e.timeoutMs
        : q7.timeoutMs,
    maxDialogTimeouts:
      typeof e?.maxDialogTimeouts === "number" &&
      Number.isInteger(e.maxDialogTimeouts) &&
      e.maxDialogTimeouts >= 0 &&
      e.maxDialogTimeouts <= ZPo
        ? e.maxDialogTimeouts
        : q7.maxDialogTimeouts,
  };
}
//@ chunk-e6aww6q8.js:1017811-1017821 placement
var Khe = 0;
//@ chunk-e6aww6q8.js:1017821-1017847 placement
function bqt() {
  return Khe;
}
//@ chunk-e6aww6q8.js:1017847-1017880 placement
function P5s() {
  return ((Khe += 1), Khe);
}
//@ chunk-e6aww6q8.js:1017880-1017916 placement
function rwt() {
  ((Khe = 0), ($Ge.expired = !1));
}
//@ chunk-e6aww6q8.js:1017916-1017961 placement
var $Ge = ge({ expired: !1 }, (e) => {
  e.expired = !1;
});
//@ chunk-e6aww6q8.js:1017961-1017995 placement
function I5s() {
  return $Ge.expired;
}
//@ chunk-e6aww6q8.js:1017995-1018035 placement
function O5s({ expired: expired }) {
  $Ge.expired = expired;
}

export { getDangerousRmTimeoutConfig, bqt, rwt, kqt, I5s, P5s, O5s };
