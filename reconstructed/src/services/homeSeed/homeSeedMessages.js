/**
 * services/homeSeed/homeSeedMessages.ts
 *
 * 2.1.316 新增：home seed（推送本地设置到云会话）结果提示文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mxpjbr4y.js (4)
 * attribution: placement 4
 */
import { RULES_NOT_IN_FORCE, SETTINGS_STAY, formatHomeSeedLeftBehindLine } from "./planHomeSeed.js";
import { SEED_UNAUTHORIZED_REASON } from "./writeHomeSettings.js";
import { leftBehindSummary, userSettingsDisplayPath, START_NEW_SESSION_HINT } from "./runHomeSeed.js";
import { formatFailureDetails_3, Y5s } from "../../utils/teleport/dirSyncRules.js";
import { plural } from "../../utils/stringUtils.js";
import { tildify } from "../../utils/path.js";

/**
 * 返回云会话权限规则提示行（deny/ask 规则不在云端生效等）；与 Write UI 无关，归属疑似错误。
 */
//@ chunk-mxpjbr4y.js:27091-27164 placement = isResultTruncated (1)
function isResultTruncated(e, n, r) {
  return [e === "create" ? `${RULES_NOT_IN_FORCE}: ${n}${r}` : `${SETTINGS_STAY}: ${n}`];
}
//@ chunk-mxpjbr4y.js:27164-27872 placement
var HOME_SEED_FAILURE_TEXT = {
    lane_full: "the session has reached its limit of uploaded files",
    unavailable: "sending your settings is not available",
    unauthorized: SEED_UNAUTHORIZED_REASON,
    failed: "sending your settings failed",
  },
  zt = "the cloud could not confirm where your settings came from (this machine's clock may be wrong)",
  $t = {
    device_key_unavailable:
      "this machine could not prove it is the computer the session is bound to (you are signed out, or its device key is missing or unreadable)",
    compliance_restricted: "your organization's compliance policy does not allow sending your settings",
    switched_off_by_anthropic: "sending your settings was turned off by Anthropic for now",
    direct_sync_off: "sending your settings is turned off for your organization",
  };
//@ chunk-mxpjbr4y.js:27872-28011 placement
function homeSeedSummary(e) {
  if (e.kind === "empty" && e.reason === "nothing_to_send") return leftBehindSummary(e);
  return e.reason === "user_settings_disabled" ? "debug" : "warning";
}
/**
 * 把把设置推送到云端会话（home seed）的结果转为提示行：未绑定、规则不可读、超时、已截断等。
 */
//@ chunk-mxpjbr4y.js:28011-29455 placement
function homeSeedNoticeLines(e, n, r) {
  let ceil = Math.ceil(r / 1000);
  switch (e.reason) {
    case "unbound":
      return [];
    case "rules_unreadable": {
      if (e.settings === "settings_unreadable")
        return isResultTruncated(
          n,
          `${userSettingsDisplayPath(e.configHome)} has errors (see /status) or links to a missing file`,
          "; fix it and start a new cloud session",
        );
      let _ = e.unreadableSettingsFiles.length,
        s = formatFailureDetails_3(e.unreadableSettingsFiles);
      return s === ""
        ? isResultTruncated(n, Y5s([]), "")
        : isResultTruncated(
            n,
            `${s} ${plural(_, "has", "have")} errors`,
            `; once ${plural(_, "it is", "they are")} fixed, start a new cloud session`,
          );
    }
    case "failed":
      return isResultTruncated(
        n,
        "preparing your settings failed (see the debug log)",
        START_NEW_SESSION_HINT,
      );
    case "too_slow":
      return isResultTruncated(
        n,
        `preparing your settings took over ${ceil} ${plural(ceil, "second")}`,
        START_NEW_SESSION_HINT,
      );
    case "home_unvettable":
      return e.cause === "too_many_links"
        ? isResultTruncated(
            n,
            `your memory files and what they @import, or the links under ${tildify(e.configHome)}, are too many to check`,
            "; remove some and start a new cloud session",
          )
        : isResultTruncated(
            n,
            `a link, an unreadable folder or an @import under ${tildify(e.configHome)} could not be checked`,
            "",
          );
    case "nothing_to_send": {
      let _ =
        e.kind === "empty"
          ? formatHomeSeedLeftBehindLine(e, {
              launch: n === "create" ? "create" : "reopen_sent_nothing",
              settingsFile: userSettingsDisplayPath(e.configHome),
            })
          : null;
      return _ === null ? [] : [_];
    }
    case "user_settings_disabled":
      return [
        "Settings from this machine were not sent to the cloud session: this launch does not load your user settings (--setting-sources, or an SDK settingSources list, without user)",
      ];
    case "flag_off":
    case "no_consent":
    case "aborted":
    case "no_project_files":
    case "self_hosted_runner":
      return [];
  }
}

export { homeSeedNoticeLines, homeSeedSummary, HOME_SEED_FAILURE_TEXT, zt, $t };
