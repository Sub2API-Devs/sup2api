/**
 * hooks/notifs/specs/configNotices.ts
 *
 * 2.1.316 新增。启动通知：配置类。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 */
import { oauthExpiryWarning } from "../../../components/LogoV2/Notices.js";
import { plural } from "../../../utils/stringUtils.js";
import { getHostState } from "../../../utils/hostEnvironment.js";
import { getDisplayPath } from "../../../utils/file.js";
import { reservedNameReason } from "../../../skills/reservedSkillNames.js";
import { MAX_NAME_WARNINGS, INVALID_NAME_MESSAGE } from "../../../skills/loadSkillsDir.js";

//@ chunk-czq1j3j2.js:1787148-1787446 placement
var oauthExpiryWarningNoticeSpec = {
  id: "oauth-expiry-warning",
  compute: () => {
    let warning = oauthExpiryWarning();
    if (!warning || warning.daysLeft > 1) return null;
    return {
      key: "oauth-expiry-warning",
      segments: [
        {
          text: `Your login expires in ${warning.daysLeft} ${plural(warning.daysLeft, "day")}`,
          color: "warning",
        },
        {
          text: " \xB7 run /login to renew",
          dim: true,
        },
      ],
      priority: "high",
      timeoutMs: 15000,
    };
  },
};
//@ chunk-czq1j3j2.js:1787446-1788022 placement
/**
 * 启动通知"reserved-skill-names"：有技能/工作流因使用保留名而未加载时，提示怎样改名后重启，多个时附剩余数量。
 */
var RESERVED_SKILL_NAMES_TIMEOUT_MS = 15000;
var reservedSkillNamesNoticeSpec = {
  id: "reserved-skill-names",
  compute: () => {
    let refused = getHostState().refusedReservedSkillNames();
    let first = refused[0];
    if (first === undefined) return null;
    let pathLabel = first.path ? getDisplayPath(first.path) : undefined;
    let message =
      first.change === "frontmatter-name"
        ? `edit the name: line in ${pathLabel ?? `"${first.name}"`}`
        : first.change === "workflow-name"
          ? `rename workflow "${first.name}"`
          : `rename ${pathLabel ?? `"${first.name}"`}`;
    let moreSuffix = refused.length > 1 ? ` \xB7 ${refused.length - 1} more` : "";
    return {
      key: "reserved-skill-names",
      kind: "warning",
      segments: [
        {
          text: `Not loaded: ${message}, then restart \u2014 its name ${reservedNameReason(first.name)}`,
          color: "warning",
        },
        ...(moreSuffix
          ? [
              {
                text: moreSuffix,
                dim: true,
              },
            ]
          : []),
      ],
      priority: "high",
      timeoutMs: RESERVED_SKILL_NAMES_TIMEOUT_MS,
    };
  },
};
//@ chunk-czq1j3j2.js:1788022-1788413 placement
/**
 * 启动通知规格：有技能或命令名称因冲突被拒用时，提示用 --debug 查看并改名后重启（显示时长常量）。
 */
var NAMES_NOT_SHOWN_TIMEOUT_MS = 15000;
var namesNotShownNoticeSpec = {
  id: "names-not-shown",
  compute: () => {
    let size = getHostState().namesNotShown.size;
    if (size === 0) return null;
    return {
      key: "names-not-shown",
      kind: "warning",
      segments: [
        {
          text: `${size === 1 ? "1 skill or command name" : `${size}${size === MAX_NAME_WARNINGS ? " or more" : ""} skill or command names`} refused: run with --debug to see which ([names]), rename, then restart \u2014 ${INVALID_NAME_MESSAGE}`,
          color: "warning",
        },
      ],
      priority: "high",
      timeoutMs: NAMES_NOT_SHOWN_TIMEOUT_MS,
    };
  },
};
export { oauthExpiryWarningNoticeSpec, reservedSkillNamesNoticeSpec, namesNotShownNoticeSpec };
