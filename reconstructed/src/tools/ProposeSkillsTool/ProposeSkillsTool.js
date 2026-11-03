/**
 * tools/ProposeSkillsTool/ProposeSkillsTool.ts
 *
 * 2.1.316 新增：ProposeSkills 工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2rkp9ne9.js (65), chunk-3e7edr38.js (1)
 * attribution: placement 66
 */
import { resolve, join } from "path";
import { stripSyncedSkillPrefix } from "../../skills/syncedSkills.js";
import { listedSkillOwnershipOf } from "../../services/skillsSync/listedSkillOwnership.js";
import { skillNameMatches, stripSkillNamespacePrefix } from "../../utils/plugins/loadPluginCommands.js";
import { findCommand, withNamedFolderYieldsRestored, getCommands, getCommandName } from "../../commands.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isSyncedSkill, isHostCatalogSkill } from "../../utils/commandPredicates.js";
import { isWellFormedString, plural, countCharInString } from "../../utils/stringUtils.js";
import { MAX_SCOPE_RESPONSE_BYTES } from "../../services/plugins/accountSync/pluginsScopeGate.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  isDiskless,
  getSkillsSyncVetoed,
  isCcsTenant,
  getProjectRootOrNull,
  hasRegisteredSyncedPluginDirs,
  getSyncedPluginDirs,
} from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AbortError,
} from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { count, uniq } from "../../utils/collections.js";
import { stripLineNumberPrefix, addLineNumbers, getFileModificationTimeAsync } from "../../utils/file.js";
import { isObjectBlock } from "../../utils/toolResultStorage.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, array, string, _enum, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { MODEL_FACING_MESSAGE_KEY } from "../ArtifactTool/publishEdits.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { isSpawnedByClaudeCodeSession } from "../../utils/claudeSubprocessEnv.js";
import { isCcsRemoteCowork, isRemoteCowork, isClaudeAiChatCowork } from "../../utils/entrypointKinds.js";
import { env } from "../../utils/env.js";
import { truncateWithNotice, collapseLineBreaks } from "../../utils/truncationNotice.js";
import {
  withheldSkillPlaceholders,
  isWithheldSkill,
  startPendingDownload,
  listedSkillText,
  isSyncedSkillPlaceholder,
  isSkillDownloadPending,
} from "../../utils/claudeAiSync/skillsSync.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";
import { areSkillsConvertedAsPlugins } from "../../utils/permissions/permissionRulePayload.js";
import { marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { SYNCED } from "../../utils/telemetry/pluginTelemetry.js";
import { normalizeLineBreaks } from "../../utils/messages/forwardedTurnSanitize.js";
import { indexOfKmp } from "../../utils/hooks/hookHelpers.js";
import { raceWithAbortSignal, withDeadline } from "../../utils/sleep.js";
import { expandPath } from "../../utils/path.js";
import { getDefaultFileReadingLimits } from "../FileReadTool/limits.js";
import {
  stripBomAndCarriageReturn,
  matchesContentHash,
  isFullFileView,
} from "../../utils/remoteFileState.js";
import { getFsImplementation } from "../../utils/fsOperations.js";

//@ chunk-2rkp9ne9.js:12369-12420 placement
/**
 * 技能展示名：取未限定名，没有时去掉同步前缀。
 */
function skillDisplayName(e) {
  return e.unqualifiedName ?? stripSyncedSkillPrefix(e.name);
}
//@ chunk-2rkp9ne9.js:12420-12510 placement
/**
 * 判断技能名是否匹配给定名字（考虑展示名与源码来源）。
 */
function isSkillNameMatch(e, n) {
  let r = skillDisplayName(e);
  let s = listedSkillOwnershipOf(r);
  return skillNameMatches(s?.listedName ?? r, n, s?.savedFromAChat ?? true);
}
//@ chunk-2rkp9ne9.js:12510-12635 placement
function findSkillsByName(e, n) {
  let command = findCommand(e, n);
  let s = stripSkillNamespacePrefix(e);
  let filtered = getValueFromInput(n).filter((h) => h === command || isSkillNameMatch(h, s));
  return {
    skills: filtered,
    foundByLookup: filtered.some((h) => h === command),
  };
}
//@ chunk-2rkp9ne9.js:12635-12746 placement
function findOwnSkillsByName(name, n) {
  return getValueFromInput(n).filter((r) => {
    let ownership = listedSkillOwnershipOf(skillDisplayName(r))?.ownership;
    return (ownership === undefined || ownership === "own") && isSkillNameMatch(r, name);
  });
}
//@ chunk-2rkp9ne9.js:12746-12853 placement
var SKILL_OWNERSHIP_DESCRIPTIONS = {
  anthropic: "built in",
  org: "one of the organization's skills",
  shared: "a skill shared with the user",
};
//@ chunk-2rkp9ne9.js:12853-13049 placement
function findNotOwnedSkill(target, commands) {
  let r;
  for (let skill of findSkillsByName(target, commands).skills) {
    let ownership = listedSkillOwnershipOf(skillDisplayName(skill))?.ownership;
    let h = ownership && SKILL_OWNERSHIP_DESCRIPTIONS[ownership];
    if (h === undefined) return;
    r ??= {
      skill,
      whose: h,
    };
  }
  return r !== undefined && getFeatureValue_CACHED_MAY_BE_STALE("tengu_reflective_donut", false) === true
    ? r
    : undefined;
}
//@ chunk-2rkp9ne9.js:13049-13119 placement = getValueFromInput (1)
function getValueFromInput(input) {
  return input.flatMap((n) => (n.type === "prompt" && isSyncedSkill(n) ? [n] : []));
}
//@ chunk-2rkp9ne9.js:13119-13170 placement
/**
 * 需要检测的不可见字符（零宽空格、BOM、行/段分隔符）。
 */
var INVISIBLE_CHARS = ["\u200B", "\uFEFF", "\u2028", "\u2029"];
var MIN_KEPT_PERCENT = 90;
//@ chunk-2rkp9ne9.js:13170-14190 placement
/**
 * 比较现有 SKILL.md 与提议版本：统计正文行数/字节数中被保留的部分、是否有 frontmatter、换行符与不可见字符、占位符是否被删、是否新增技能加载头行、描述是否一致，并给出分档值供遥测与保留检查使用。
 */
function compareSkillLines(current, proposed, description) {
  let currentDoc = splitFrontmatter(current);
  let m = splitFrontmatter(proposed);
  let h = splitMeaningfulLines(m.body);
  let proposedLineCounts = new Map();
  for (let T of h) proposedLineCounts.set(T, (proposedLineCounts.get(T) ?? 0) + 1);
  let f = splitMeaningfulLines(currentDoc.body);
  let k = 0;
  let _ = 0;
  let P = 0;
  let I = false;
  let L = false;
  for (let T of f) {
    let N = Buffer.byteLength(T, "utf8");
    k += N;
    let x = hasDynamicSkillSyntax(T);
    I ||= x;
    let R = proposedLineCounts.get(T) ?? 0;
    if (R > 0) {
      proposedLineCounts.set(T, R - 1);
      _++;
      P += N;
    } else if (x) L = true;
  }
  let b = f.length;
  let w = isWellFormedString(current) && !current.includes("\uFFFD");
  let any = currentDoc.frontmatter.some((T) => T.includes("---"));
  let y = w && currentDoc.hasFrontmatter && !any && b >= 1;
  let B =
    proposed.startsWith(`---
`) || proposed.startsWith("---\r");
  let any_2 = m.frontmatter.some((T) => T.includes("-") && !T.includes(":"));
  return {
    applies: y,
    currentHasFrontmatter: currentDoc.hasFrontmatter,
    proposedHasFrontmatter: m.hasFrontmatter && B && !any_2,
    proposedHasCr: proposed.includes("\r"),
    proposedHasInvisible: INVISIBLE_CHARS.some((T) => proposed.includes(T)),
    total: b,
    totalBytes: k,
    kept: _,
    keptBytes: P,
    proposedLines: h.length,
    currentHasPlaceholder: y && I,
    placeholderDropped: y && L,
    proposalAddsLoadLine: y && [...proposedLineCounts].some(([T, N]) => N > 0 && isSkillLoadHeaderLine(T)),
    keptBand: y ? keptPercentBand(_, b) : -1,
    keptBytesBand: y ? keptPercentBand(P, k) : -1,
    missingBand: y ? missingCountBand(b - _) : -1,
    sizeBand: y ? sizeRatioBand(h.length, b) : -1,
    descriptionState:
      w && currentDoc.hasFrontmatter ? describeDescriptionState(currentDoc.frontmatter, description) : -1,
  };
}
//@ chunk-2rkp9ne9.js:14190-14350 placement
function droppedSkillLines(e, n) {
  let r = new Map();
  for (let s of splitMeaningfulLines(splitFrontmatter(n).body)) r.set(s, (r.get(s) ?? 0) + 1);
  return splitMeaningfulLines(splitFrontmatter(e).body).filter((s) => {
    let m = r.get(s) ?? 0;
    r.set(s, m - 1);
    return m <= 0;
  });
}
//@ chunk-2rkp9ne9.js:14350-14427 placement
/**
 * 判断数值是否为 50 到 100 的整数（保留比例阈值）。
 */
function isValidKeptPercent(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= 50 && e <= 100;
}
//@ chunk-2rkp9ne9.js:14427-14694 placement
function passesKeptLinesCheck(lines, n) {
  let { total, totalBytes, kept, keptBytes, proposedLines } = lines;
  if (
    !isValidKeptPercent(n) ||
    !lines.applies ||
    !lines.proposedHasFrontmatter ||
    lines.proposedHasCr ||
    lines.proposedHasInvisible ||
    kept * 100 < total * n
  )
    return false;
  return (
    keptBytes * 100 >= totalBytes * n &&
    proposedLines * 100 >= total * MIN_KEPT_PERCENT &&
    !lines.placeholderDropped &&
    !lines.proposalAddsLoadLine
  );
}
//@ chunk-2rkp9ne9.js:14694-14814 placement
function hasDynamicSkillSyntax(e) {
  return (
    e.includes("$") || e.includes("!`") || e.includes("```!") || e.includes("\uFFFE") || e.includes("\uFFFF")
  );
}
//@ chunk-2rkp9ne9.js:14814-15002 placement
function isSkillLoadHeaderLine(e) {
  let n = 0;
  while (n < e.length && UNICODE_SPACE_CHARS.includes(e[n])) n++;
  return (
    e.startsWith("Base directory for this skill: ", n) ||
    e.startsWith("ARGUMENTS: ", n) ||
    e.startsWith("Skill arguments: ", n)
  );
}
//@ chunk-2rkp9ne9.js:15002-15117 placement
var UNICODE_SPACE_CHARS =
  "\t\v\f \x85\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000";
//@ chunk-2rkp9ne9.js:15117-15230 placement
function splitLines(e) {
  return (e.startsWith("\uFEFF") ? e.slice(1) : e)
    .replaceAll(
      `\r
`,
      `
`,
    )
    .replaceAll(
      "\r",
      `
`,
    ).split(`
`);
}
//@ chunk-2rkp9ne9.js:15230-15325 placement
/**
 * 去掉行尾空格与制表符。
 */
function rtrimLine(e) {
  let n = e.length;
  while (n > 0 && (e[n - 1] === " " || e[n - 1] === "\t")) n--;
  return e.slice(0, n);
}
//@ chunk-2rkp9ne9.js:15325-15376 placement
/**
 * 去掉空行后的行列表，用于比较现有与提议的技能正文。
 */
function splitMeaningfulLines(body) {
  return body.map(rtrimLine).filter((n) => n !== "");
}
//@ chunk-2rkp9ne9.js:15376-15406 placement
/**
 * 取文本正文的规范化行集合。
 */
function bodyLines(e) {
  return splitMeaningfulLines(splitLines(e));
}
//@ chunk-2rkp9ne9.js:15406-15694 placement
function splitFrontmatter(e) {
  let n = splitLines(e);
  let index = n.findIndex((m) => rtrimLine(m) !== "");
  if (index === -1)
    return {
      hasFrontmatter: false,
      frontmatter: [],
      body: [],
    };
  let s = n[index] === "---" ? n.indexOf("---", index + 1) : -1;
  if (s <= index + 1)
    return {
      hasFrontmatter: false,
      frontmatter: [],
      body: n,
    };
  return {
    hasFrontmatter: true,
    frontmatter: n.slice(index + 1, s),
    body: n.slice(s + 1),
  };
}
//@ chunk-2rkp9ne9.js:15694-15779 placement
/**
 * 把保留比例映射到分档值（100/95/90/75/50/25/0）。
 */
function keptPercentBand(e, n) {
  if (e === n) return 100;
  return [95, 90, 75, 50, 25].find((r) => e * 100 >= r * n) ?? 0;
}
//@ chunk-2rkp9ne9.js:15779-15826 placement
/**
 * 把缺失行数映射到分档值。
 */
function missingCountBand(e) {
  return e <= 1 ? e : e <= 5 ? 2 : e <= 20 ? 6 : 21;
}
//@ chunk-2rkp9ne9.js:15826-15910 placement
/**
 * 把体积比映射到分档值，供遥测与保留检查使用。
 */
function sizeRatioBand(e, n) {
  let r = e * 100;
  return r < 50 * n ? 0 : r < 90 * n ? 50 : r <= 110 * n ? 90 : r <= 200 * n ? 111 : 201;
}
//@ chunk-2rkp9ne9.js:15910-16183 placement
function describeDescriptionState(frontmatter, n) {
  let replaced = n.replace(/[\t\n\v\f\r ]/g, " ").replace(/^ +| +$/g, "");
  let replaced_2 = replaced.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  let mapped = frontmatter.map(rtrimLine);
  if (mapped.includes(`description: "${replaced_2}"`) || mapped.includes(`description: ${replaced}`))
    return 0;
  return mapped.some((h) => h.startsWith("description:")) ? 1 : 2;
}
//@ chunk-2rkp9ne9.js:16183-16266 placement
/**
 * 读取 tengu_glittery_fern 的保留比例阈值，无效时返回 0。
 */
function readKeptPercentSetting() {
  try {
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_glittery_fern", 0);
    return isValidKeptPercent(featureValue_CACHED_MAY_BE_STALE) ? featureValue_CACHED_MAY_BE_STALE : 0;
  } catch {
    return 0;
  }
}
//@ chunk-2rkp9ne9.js:16266-17009 placement
/**
 * 汇总一次提议的"保留行"检查：根据读取状态（read/stale/未读）、是否读到其他字节、保留比例阈值得出 arm（passed/failed/stale/…）与 verdict，并附带行统计。
 */
function evaluateKeptLines({
  checkKind,
  status,
  current: r,
  proposal,
  sawOtherBytes,
  lastShownProposal,
  heldLines,
  keepPercent,
}) {
  let k = r !== undefined && Buffer.byteLength(r, "utf8") <= MAX_SCOPE_RESPONSE_BYTES ? r : undefined;
  let _ = compareSkillLinesSafe(k, proposal);
  let P =
    lastShownProposal === undefined ? EMPTY_KEPT_LINES_STATS : compareSkillLinesSafe(k, lastShownProposal);
  let I = P.applies && P.kept === P.total && P.proposedLines === P.total && P.descriptionState === 0;
  let L = !I;
  let b =
    status === "read"
      ? "read"
      : status === "stale" && L
        ? "stale"
        : k === undefined
          ? "no_text"
          : !_.applies
            ? "not_applicable"
            : sawOtherBytes && L
              ? "other_bytes_read"
              : keepPercent === 0
                ? "off"
                : passesKeptLinesCheck(_, keepPercent)
                  ? "passed"
                  : "failed";
  return {
    checkKind,
    readStatus: status,
    sawOtherBytes: sawOtherBytes && k !== undefined,
    currentIsLastShownProposal: I,
    lastShown:
      lastShownProposal === undefined
        ? "none"
        : lastShownProposal.isFromThisTurn
          ? "this_turn"
          : "earlier_turn",
    unseenMissingBand:
      k !== undefined && _.applies && heldLines !== undefined
        ? unseenMissingLinesBand(k, proposal.skillMd, heldLines)
        : -1,
    verdict: b === "passed" ? "kept" : status,
    arm: b,
    keepPercent,
    lines: _,
  };
}
//@ chunk-2rkp9ne9.js:17009-17963 placement
/**
 * 为每个保留行检查结果上报 tengu_propose_skills_kept_lines 遥测。
 */
function logKeptLinesEvents(e, n) {
  try {
    for (let r of e) {
      let { lines } = r;
      logEvent("tengu_propose_skills_kept_lines", {
        check_kind: fromEnum(r.checkKind),
        read_status: fromEnum(r.readStatus),
        saw_other_bytes: r.sawOtherBytes,
        current_is_last_shown_proposal: r.currentIsLastShownProposal,
        last_shown: fromEnum(r.lastShown),
        unseen_missing_band: r.unseenMissingBand,
        verdict: fromEnum(r.verdict),
        arm: fromEnum(r.arm),
        keep_percent: r.keepPercent,
        would_pass_100: passesKeptLinesCheck(lines, 100),
        would_pass_90: passesKeptLinesCheck(lines, 90),
        would_pass_50: passesKeptLinesCheck(lines, 50),
        current_has_placeholder: lines.currentHasPlaceholder,
        placeholder_dropped: lines.placeholderDropped,
        proposal_adds_load_line: lines.proposalAddsLoadLine,
        kept_band: lines.keptBand,
        kept_bytes_band: lines.keptBytesBand,
        missing_band: lines.missingBand,
        size_band: lines.sizeBand,
        description_state: lines.descriptionState,
        proposed_has_frontmatter: lines.proposedHasFrontmatter,
        proposed_has_cr: lines.proposedHasCr,
        proposed_has_invisible: lines.proposedHasInvisible,
        session_disk: fromEnum(isDiskless() ? "no_disk" : "disk"),
        phase: fromEnum(n),
      });
    }
  } catch (error) {
    logForDebugging(`propose_skills: some kept-lines events not sent: ${errorMessage(error)}`);
  }
}
//@ chunk-2rkp9ne9.js:17963-18278 placement
/**
 * 保留行统计的空结果。
 */
var EMPTY_KEPT_LINES_STATS = {
  applies: false,
  currentHasFrontmatter: false,
  proposedHasFrontmatter: false,
  proposedHasCr: false,
  proposedHasInvisible: false,
  total: 0,
  totalBytes: 0,
  kept: 0,
  keptBytes: 0,
  proposedLines: 0,
  currentHasPlaceholder: false,
  placeholderDropped: false,
  proposalAddsLoadLine: false,
  keptBand: -1,
  keptBytesBand: -1,
  missingBand: -1,
  sizeBand: -1,
  descriptionState: -1,
};
//@ chunk-2rkp9ne9.js:18278-18431 placement
function compareSkillLinesSafe(e, { skillMd, description }) {
  try {
    return compareSkillLines(e ?? "", skillMd, description);
  } catch (error) {
    logForDebugging(`propose_skills: the kept-lines comparison threw: ${errorMessage(error)}`);
    logError(error);
    return EMPTY_KEPT_LINES_STATS;
  }
}
//@ chunk-2rkp9ne9.js:18431-18767 placement
/**
 * 计算提议中缺失且未被看到的行数区间；无法读取时返回 -1。
 */
function unseenMissingLinesBand(e, skillMd, heldLines) {
  try {
    let s = droppedSkillLines(e, skillMd);
    if (s.length === 0) return 0;
    let m = heldLines();
    if (m === undefined) return -1;
    let h = new Set(bodyLines(skillMd));
    return missingCountBand(count(s, (g) => !m.has(g) && !h.has(g)));
  } catch (error) {
    logForDebugging(
      `propose_skills: could not count the dropped lines missing from the conversation, so unseen_missing_band is logged as -1; the verdict stands: ${errorMessage(error)}`,
    );
    logError(error);
    return -1;
  }
}
//@ chunk-2rkp9ne9.js:18767-19017 placement
function collectConversationLines(e) {
  let n = new Set();
  for (let r of e) {
    let s =
      r.type === "attachment"
        ? (r.rendered ?? []).map(({ content }) => content)
        : r.type === "user" || r.type === "assistant"
          ? [r.message.content]
          : [];
    for (let m of s.flatMap(contentToStrings))
      for (let h of bodyLines(m)) {
        n.add(h);
        n.add(stripLineNumberPrefix(h));
      }
  }
  return n;
}
//@ chunk-2rkp9ne9.js:19017-19341 placement
/**
 * 把消息内容（字符串或内容块数组）提取为字符串列表。
 */
function contentToStrings(content) {
  if (typeof content === "string") return [content];
  if (!Array.isArray(content)) return [];
  return content.flatMap((n) => {
    if (!isObjectBlock(n)) return [];
    switch (n.type) {
      case "text":
        return "text" in n && typeof n.text === "string" ? [n.text] : [];
      case "tool_result":
        return "content" in n ? contentToStrings(n.content) : [];
      case "tool_use":
        return "input" in n ? collectInputStrings(n.input) : [];
      default:
        return [];
    }
  });
}
//@ chunk-2rkp9ne9.js:19341-19467 placement
function collectInputStrings(e) {
  if (typeof e === "string") return [e];
  if (typeof e !== "object" || e === null) return [];
  return Object.values(e).flatMap(collectInputStrings);
}
//@ chunk-2rkp9ne9.js:19467-19521 placement
/**
 * 技能描述的最大字符数（1024）。
 */
var MAX_SKILL_DESCRIPTION_CHARS = 1024;
var OPEN_ANGLE_BRACKET_RE = /[<\uFE64\uFF1C]/;
var CLOSE_ANGLE_BRACKET_RE = /[>\uFE65\uFF1E]/;
//@ chunk-2rkp9ne9.js:19521-19592 placement
/**
 * 判断描述里是否出现 <...> 形式的标签。
 */
function hasTagLikeMarkup(e) {
  let n = e.search(OPEN_ANGLE_BRACKET_RE);
  return n !== -1 && CLOSE_ANGLE_BRACKET_RE.test(e.slice(n + 2));
}
//@ chunk-2rkp9ne9.js:19592-19681 placement
/**
 * 匹配 SKILL.md 的 YAML frontmatter 块。
 */
var YAML_FRONTMATTER_RE = /^(\uFEFF?(?:[ \t]*\r?\n)*---[ \t]*\r?\n)([\s\S]*?)(?=\r?\n---[ \t]*(?:\r?\n|$))/;
//@ chunk-2rkp9ne9.js:19681-19840 placement
function hasSkillInstructions(e) {
  let match = YAML_FRONTMATTER_RE.exec(e);
  return (
    (match ? e.slice(match[0].length).replace(/^\r?\n---[^\n]*/, "") : e).trim() !== "" &&
    e.replace(/^---\n[\s\S]*?\n---\n+/, "").trim() !== ""
  );
}
//@ chunk-2rkp9ne9.js:19840-26874 placement
/**
 * propose_skills 工具：从反复出现的流程中提出新技能或改进已有技能，交给用户在审核卡片上保存；只在远程 cowork/技能同步等环境启用；校验名称、描述与 SKILL.md，改进已有技能前要求先完整读过其 SKILL.md。
 */
var MAX_SKILL_NAME_CHARS = 64;
var RESERVED_SKILL_NAME_WORDS = ["claude", "anthropic"];
var proposeSkillsInputSchema = DoctorLazy(() =>
  u({
    proposals: array(
      u({
        name: string()
          .min(1)
          .describe(
            'kebab-case skill slug; must not contain "claude" or "anthropic"; at most 64 characters for a new skill',
          ),
        kind: _enum(["new", "improvement"]),
        target: string()
          .optional()
          .describe(
            "Name of the existing skill to update. Required when kind is 'improvement'; omit for 'new'.",
          ),
        description: string()
          .max(MAX_SKILL_DESCRIPTION_CHARS, {
            message: `description is longer than ${MAX_SKILL_DESCRIPTION_CHARS} characters, the most a saved skill's description can hold. Call again with one short sentence saying when to use the skill.`,
          })
          .refine((e) => !hasTagLikeMarkup(e), {
            message:
              "description contains angle brackets (less-than and greater-than signs), which a saved skill's description cannot include. Call again with the same sentence reworded without them.",
          })
          .describe(
            "One short sentence saying when to use this skill: aim for under 200 characters, never more than 1024, and no angle brackets. Shown on the review card and saved as the skill's description, which is what decides when the skill is used. For an improvement, reuse the existing skill's description unless the change alters when the skill applies.",
          ),
        evidence: array(string()).optional().describe("memory file paths where this procedure was observed"),
        skillMd: string()
          .refine(hasSkillInstructions, {
            message:
              "skillMd has no instructions, so the review card cannot save it. Call again with the complete SKILL.md: its frontmatter between two lines of ---, then the instructions below it. If the user wants the skill deleted or emptied, do not propose it: tell them that they can delete one of their own skills themselves, from their list of skills on claude.ai.",
            params: {
              [MODEL_FACING_MESSAGE_KEY]: true,
            },
          })
          .describe(
            "The complete SKILL.md exactly as it should be saved: frontmatter plus the full body. When the user saves, the body below the frontmatter becomes the skill's entire instructions and the name and description come from the fields above; other frontmatter keys are not kept. For an improvement this replaces the existing skill's SKILL.md entirely, so read that skill's current SKILL.md first and include everything worth keeping, not only the changes.",
          ),
      })
        .refine((e) => e.kind !== "improvement" || !!e.target, {
          message: "target is required when kind is 'improvement'",
          path: ["target"],
        })
        .superRefine((e, n) => {
          if (e.kind !== "new") return;
          if (Array.from(e.name).length > MAX_SKILL_NAME_CHARS)
            n.addIssue({
              code: "custom",
              path: ["name"],
              message: `name is longer than ${MAX_SKILL_NAME_CHARS} characters, the most a saved skill's name can hold. Call again with a shorter kebab-case slug.`,
            });
          let lower = e.name.normalize("NFKC").toLowerCase();
          if (RESERVED_SKILL_NAME_WORDS.some((s) => lower.includes(s)))
            n.addIssue({
              code: "custom",
              path: ["name"],
              message: `name contains "claude" or "anthropic", which a saved skill's name cannot include. Call again with a name that leaves those words out.`,
            });
        }),
    )
      .min(1)
      .max(3),
  }),
);
var proposeSkillsOutputSchema = DoctorLazy(() =>
  u({
    proposalCount: E().describe("Number of proposals shown on the review card"),
  }),
);
var ProposeSkillsTool = buildTool({
  name: PROPOSE_SKILLS,
  backgrounding: "never",
  maxResultSizeChars: 1000,
  searchHint: "propose skills from recurring procedures for the user to review and save",
  get inputSchema() {
    return proposeSkillsInputSchema();
  },
  get outputSchema() {
    return proposeSkillsOutputSchema();
  },
  isEnabled() {
    if (isSpawnedByClaudeCodeSession()) return false;
    if (isCcsRemoteCowork()) return env.CLAUDE_CODE_SYNC_SKILLS && !getSkillsSyncVetoed();
    if (!isRemoteCowork() && !env.CLAUDE_CODE_SKILL_PROPOSALS) return false;
    if (
      !env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE &&
      !(isCcsTenant() && env.CLAUDE_CODE_SKILL_PROPOSALS && env.CLAUDE_CODE_SYNC_SKILLS)
    )
      return false;
    if (!env.CLAUDE_CODE_SKILL_PROPOSALS && env.CLAUDE_CODE_ENVIRONMENT_KIND !== undefined) return false;
    if (env.CLAUDE_CODE_SKILL_PROPOSALS) return !getSkillsSyncVetoed();
    return env.CLAUDE_CODE_SYNC_SKILLS && !getSkillsSyncVetoed();
  },
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  toAutoClassifierInput(e) {
    return (e.proposals ?? []).map((n) =>
      n.kind === "improvement" && n.target
        ? `${n.name ?? ""} (improves ${n.target}): ${n.description ?? ""}`
        : `${n.name ?? ""}: ${n.description ?? ""}`,
    ).join(`
`);
  },
  async description() {
    return PROPOSE_SKILLS_DESCRIPTION;
  },
  async prompt() {
    return PROPOSE_SKILLS_PROMPT;
  },
  renderToolUseMessage(e) {
    let sliced = (e.proposals ?? []).filter((s) => s?.name).slice(0, 3);
    if (sliced.length === 0) return "";
    let mapped = sliced.map((s) => {
      let m = truncateWithNotice(collapseLineBreaks(s.name ?? ""), 80);
      return s.kind === "improvement" && s.target
        ? `${m} (improves ${truncateWithNotice(collapseLineBreaks(s.target), 80)})`
        : m;
    });
    return `Propose ${sliced.length} ${plural(sliced.length, "skill")}: ${mapped.join(", ")}`;
  },
  create(e) {
    return {
      async validateInput({ proposals }, r) {
        let s = [];
        let state = createReadCheckState();
        let proposalTargetCounts = createProposalTargetCounts();
        let keepPercent = readKeptPercentSetting();
        let f = [];
        try {
          let commands = withNamedFolderYieldsRestored(
            await getCommands(getProjectRootOrNull(), e.storageV5),
          );
          let proposals_2 = proposals.filter((proposal) => {
            let proposalRefusals = collectProposalRefusals([proposal], commands);
            if (proposalRefusals !== undefined) s.push(proposalRefusals);
            return proposalRefusals === undefined;
          });
          let I = [...commands, ...withheldSkillPlaceholders()];
          let proposalTargets = resolveProposalTargets(proposals_2, I, proposalTargetCounts);
          let earlierProposals = collectEarlierProposals(proposalTargets, e, I);
          let heldLines = onceExport(() => collectConversationLinesSafe(e.messages));
          if (isDiskless())
            await resolveSkillProposals(
              state,
              proposals_2,
              proposalTargets,
              e.messages(),
              r.signal,
              keepPercent,
              earlierProposals,
              f,
            );
          for (let proposalTarget of proposalTargets) {
            let skillFileForReadCheck = getSkillFileForReadCheck(proposalTarget.skill);
            if (
              skillFileForReadCheck === undefined ||
              !isSkillReadIncomplete(
                e.readFileState.get(skillFileForReadCheck.path),
                skillFileForReadCheck.contentLength,
                r,
              )
            )
              continue;
            let B = evaluateKeptLines({
              checkKind: proposalTarget.kind,
              status: "unread",
              current: proposalTarget.skill.getLoadedSkillMd?.(),
              proposal: proposalTarget,
              sawOtherBytes: false,
              lastShownProposal: earlierProposals.get(proposalTarget.skill),
              heldLines,
              keepPercent,
            });
            f.push(B);
            if (B.verdict !== "kept")
              recordUnreadOrStaleTarget(state, proposalTarget, skillFileForReadCheck.path, "unread");
          }
        } catch (error) {
          logForDebugging(`propose_skills: skipping input checks: ${errorMessage(error)}`);
          if (isDiskless())
            s.push(
              "The proposal could not be checked against the user's skills. Call again once; if it still cannot be checked, tell the user it cannot be shown now.",
            );
          if (s.length === 0)
            return {
              result: true,
            };
          logEvent("tengu_propose_skills_read_check", {
            ...proposalTargetCounts,
            failed: true,
          });
          return {
            result: false,
            message: s.join(" "),
            errorCode: 2,
          };
        }
        let k = [...s, ...buildReadCheckMessages(state)];
        if (k.length === 0) {
          if (isDiskless()) logKeptLinesEvents(f, "validate");
          return {
            result: true,
          };
        }
        logEvent("tengu_propose_skills_read_check", {
          ...proposalTargetCounts,
          updates_refused: state.refusedUpdates.size,
          new_proposals_refused: state.refusedNewNames.size,
        });
        logKeptLinesEvents(f, "validate");
        return {
          result: false,
          message: k.join(" "),
          errorCode: s.length > 0 ? 2 : state.refusedNewNames.size > 0 ? 3 : 1,
        };
      },
      async call({ proposals }, r) {
        let state = createReadCheckState();
        let proposalTargetCounts = createProposalTargetCounts();
        let keepPercent = readKeptPercentSetting();
        let g = [];
        try {
          let k = withNamedFolderYieldsRestored(await getCommands(getProjectRootOrNull(), e.storageV5));
          let proposalTargets = resolveProposalTargets(proposals, k, proposalTargetCounts);
          let earlierProposals = collectEarlierProposals(isDiskless() ? [] : proposalTargets, e, k);
          let heldLines = onceExport(() => collectConversationLinesSafe(e.messages));
          let results = await Promise.all(
            proposalTargets.map((proposalTarget) =>
              readSkillFileAfterDownload(proposalTarget.skill, e.storageV5, r.signal),
            ),
          );
          for (let [b, outcome] of proposalTargets.entries()) {
            if (isDiskless()) continue;
            let S = results[b];
            if (S === undefined) {
              proposalTargetCounts.skill_checks_without_a_file_to_read++;
              continue;
            }
            let y = e.readFileState.get(S.path);
            let skillFileWhole = await readSkillFileWhole(S.path);
            let whole = skillFileWhole?.whole;
            let T;
            let N = (D) => (T ??= isFileModifiedSince(S.path, D));
            let x = await classifySkillReadStatus(y, S.contentLength, r, skillFileWhole, N);
            let R = evaluateKeptLines({
              checkKind: outcome.kind,
              status: x,
              current: whole,
              proposal: outcome,
              sawOtherBytes:
                x === "unread" &&
                whole !== undefined &&
                y !== undefined &&
                !y.contentNotInModelContext &&
                (await N(y)),
              lastShownProposal: earlierProposals.get(outcome.skill),
              heldLines,
              keepPercent,
            });
            g.push(R);
            if (R.verdict === "unread" || R.verdict === "stale")
              recordUnreadOrStaleTarget(state, outcome, S.path, R.verdict);
          }
          proposalTargetCounts.updates_refused = state.refusedUpdates.size;
          proposalTargetCounts.new_proposals_refused = state.refusedNewNames.size;
        } catch (error) {
          logError(error);
          proposalTargetCounts.failed = true;
          Object.assign(state, createReadCheckState());
          g.length = 0;
        }
        logEvent("tengu_propose_skills_read_check", proposalTargetCounts);
        logKeptLinesEvents(g, "call");
        let readCheckMessages = buildReadCheckMessages(state);
        if (readCheckMessages.length > 0)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `<tool_use_error>${readCheckMessages.join(" ")}</tool_use_error>`,
            "propose_skills: the read check refused the proposal",
            "skill_read_check_refused",
          );
        logEvent("tengu_propose_skills", {
          proposal_count: proposals.length,
          improvement_count: count(proposals, (k) => k.kind === "improvement"),
        });
        return {
          data: {
            proposalCount: proposals.length,
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam({ proposalCount }, toolUseId) {
    let r = isClaudeAiChatCowork()
      ? " The card renders at this point in your reply and anything you write next appears below it, so refer to it as the card above."
      : "";
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: `Shown ${proposalCount} skill proposal(s) to the user for review.${r} Continue with the next phase; do not wait for them to respond.`,
    };
  },
});
//@ chunk-2rkp9ne9.js:26874-26925 placement
/**
 * 取名字最后一段冒号后的部分（去掉命名空间前缀）。
 */
function afterLastColon(name) {
  return name.slice(name.lastIndexOf(":") + 1);
}
//@ chunk-2rkp9ne9.js:26925-27014 placement = getValueFromInput (1)
function getValueFromInput_2(e, commands) {
  return commands.some(
    (r) =>
      r.type === "prompt" &&
      isSyncedSkill(r) &&
      (skillDisplayName(r) === e || stripSyncedSkillPrefix(getCommandName(r)) === e),
  );
}
//@ chunk-2rkp9ne9.js:27014-27061 placement = ADMIN_TRUSTED_SOURCES (0.758)
var ADMIN_TRUSTED_SOURCES = new Set(["plugin", "bundled", "builtin"]);
//@ chunk-2rkp9ne9.js:27061-27377 placement
/**
 * 查找用户自己上传的、与目标名匹配的插件技能。
 */
function findOwnUploadedPluginSkills(e, commands) {
  if (!areSkillsConvertedAsPlugins()) return [];
  let r = stripSkillNamespacePrefix(e);
  let lower = r.trim().toLowerCase();
  return commands.flatMap((m) =>
    m.type === "prompt" &&
    m.source === "plugin" &&
    m.loadedFrom === "plugin" &&
    m.pluginInfo?.marketplaceKind === "account_uploads" &&
    marketplaceSuffix(m.pluginInfo.repository) === SYNCED &&
    (m.name.toLowerCase() === lower || skillNameMatches(m.aliases?.[0] ?? afterLastColon(m.name), r, true))
      ? [m]
      : [],
  );
}
//@ chunk-2rkp9ne9.js:27377-27505 placement
function isStaleSyncedPluginSkill(e) {
  if (e.pluginSource === undefined || !hasRegisteredSyncedPluginDirs()) return false;
  let n = resolve(e.pluginSource.pluginPath);
  return !getSyncedPluginDirs().some((r) => resolve(r) === n);
}
//@ chunk-2rkp9ne9.js:27505-27805 placement
/**
 * 生成拒绝更新非用户自有技能的说明，建议改为以新名字提议 new 类型。
 */
function notOwnSkillRefusal(target, name, r, s) {
  let m = name === target ? "" : ` (${name})`;
  return `${target}${m} is ${r}, not one of the user's own skills, so the review card cannot update it. To customize it for the user, propose kind "new" under a name of its own \u2014 not ${s} \u2014 with a description that says when to use it instead of ${name}.`;
}
//@ chunk-2rkp9ne9.js:27805-29840 placement
/**
 * 为每个提议生成拒绝理由：改进的目标是插件交付的自有技能（无盘会话不能更新、副本过期）、内置/组织/共享技能（应改提新技能）；新技能名与自有技能或插件技能重名等。
 */
function collectProposalRefusals(proposals, commands) {
  let refusals = [];
  for (let proposal of proposals)
    if (proposal.kind === "improvement" && proposal.target) {
      let ownUploadedPluginSkills = findOwnUploadedPluginSkills(proposal.target, commands);
      let h = ownUploadedPluginSkills.find(isStaleSyncedPluginSkill) ?? ownUploadedPluginSkills[0];
      if (h !== undefined) {
        if (isDiskless())
          refusals.push(
            `${proposal.target} is ${h.name}, one of the user's own skills, delivered as a plugin, and cannot be updated from this session. ${NEW_SKILL_NAME_HINT}`,
          );
        else if (isStaleSyncedPluginSkill(h))
          refusals.push(
            `${proposal.target} is ${h.name}, one of the user's own skills, and the copy this session loaded is out of date: its plugin changed or was removed on claude.ai since. Tell the user, and propose the improvement again once the session has reloaded its plugins (usually at their next message), reading its SKILL.md then.`,
          );
        continue;
      }
      let notOwnedSkill = findNotOwnedSkill(proposal.target, commands);
      if (notOwnedSkill !== undefined) {
        refusals.push(
          notOwnSkillRefusal(
            proposal.target,
            notOwnedSkill.skill.name,
            notOwnedSkill.whose,
            skillDisplayName(notOwnedSkill.skill),
          ),
        );
        continue;
      }
      let command = findCommand(proposal.target, commands);
      if (
        command?.type !== "prompt" ||
        (!isHostCatalogSkill(command) &&
          (command.loadedFrom === "syncedSkills" || !ADMIN_TRUSTED_SOURCES.has(command.source))) ||
        getValueFromInput_2(afterLastColon(proposal.target), commands)
      )
        continue;
      refusals.push(
        notOwnSkillRefusal(
          proposal.target,
          command.name,
          command.source === "plugin" ? "a plugin's skill" : "built in",
          command.source === "plugin"
            ? (command.aliases?.[0] ?? afterLastColon(command.name))
            : (command.unqualifiedName ?? command.name),
        ),
      );
    } else if (proposal.kind === "new") {
      let m = findOwnUploadedPluginSkills(proposal.name, commands)[0];
      if (m !== undefined) {
        refusals.push(
          isDiskless()
            ? `${proposal.name} is the name of ${m.name}, one of the user's own skills, delivered as a plugin, which cannot be updated from this session; a new skill saved under it would replace that skill. Propose this under a name of its own, or tell the user.`
            : `${proposal.name} is the name of ${m.name}, one of the user's own skills, so a new skill saved under it would replace that skill. To change it, read its SKILL.md and propose kind "improvement" with target ${m.name}; otherwise propose this under a name of its own.`,
        );
        continue;
      }
      let command = findCommand(proposal.name, commands);
      if (
        command?.type !== "prompt" ||
        command.source !== "plugin" ||
        getValueFromInput_2(afterLastColon(proposal.name), commands)
      )
        continue;
      let g =
        command.name === proposal.name
          ? "the name of a plugin skill in this session"
          : `the name the plugin skill ${command.name} already answers to`;
      refusals.push(
        `${proposal.name} is ${g}, so a new skill saved under it would compete with that skill for the name. Propose it under a name of its own, with a description that says when to use it instead of ${command.name}.`,
      );
    }
  return refusals.length === 0 ? undefined : refusals.join(" ");
}
//@ chunk-2rkp9ne9.js:29840-29962 placement
function createReadCheckState() {
  return {
    unread: [],
    stale: [],
    keptElsewhere: [],
    replacedByNew: [],
    refusedUpdates: new Set(),
    refusedNewNames: new Set(),
  };
}
//@ chunk-2rkp9ne9.js:29962-30249 placement
function createProposalTargetCounts() {
  return {
    update_targets: 0,
    update_targets_found_by_name_only: 0,
    update_targets_matching_no_account_skill: 0,
    update_targets_own_plugin_skill: 0,
    updates_refused: 0,
    new_names_matching_an_own_or_unknown_skill: 0,
    new_proposals_refused: 0,
    skill_checks_without_a_file_to_read: 0,
    failed: false,
  };
}
//@ chunk-2rkp9ne9.js:30249-31025 placement
/**
 * 把提议展开为要检查的目标：improvement 按目标名找到已有技能（含用户上传的插件技能），new 找到会被同名覆盖的自有/未知技能；同时累计各类目标计数。
 */
function resolveProposalTargets(proposals, n, proposalTargetCounts) {
  return proposals.flatMap((proposal) => {
    let { skillMd, description } = proposal;
    if (proposal.kind === "improvement" && proposal.target) {
      let target = proposal.target;
      let skillsByName = findSkillsByName(target, n);
      let ownUploadedPluginSkills = findOwnUploadedPluginSkills(target, n);
      let I = [
        ...skillsByName.skills.filter(
          (skill) =>
            skill.hiddenBehindPlugin?.replacement === undefined ||
            skill.hiddenBehindPlugin.heldBack ||
            !ownUploadedPluginSkills.some(
              (ownUploadedPluginSkill) =>
                ownUploadedPluginSkill.name === skill.hiddenBehindPlugin?.replacement,
            ),
        ),
        ...ownUploadedPluginSkills,
      ];
      proposalTargetCounts.update_targets++;
      if (ownUploadedPluginSkills.length > 0) proposalTargetCounts.update_targets_own_plugin_skill++;
      else if (skillsByName.skills.length === 0)
        proposalTargetCounts.update_targets_matching_no_account_skill++;
      else if (!skillsByName.foundByLookup) proposalTargetCounts.update_targets_found_by_name_only++;
      return I.map((skill) => ({
        kind: "update",
        written: target,
        skill,
        skillMd,
        description,
      }));
    }
    let g = [...findOwnSkillsByName(proposal.name, n), ...findOwnUploadedPluginSkills(proposal.name, n)];
    if (g.length > 0) proposalTargetCounts.new_names_matching_an_own_or_unknown_skill++;
    return g.map((skill) => ({
      kind: "new",
      written: proposal.name,
      skill,
      skillMd,
      description,
    }));
  });
}
//@ chunk-2rkp9ne9.js:31025-31838 placement
/**
 * 从会话消息中收集先前对同名技能的提议，供比较与去重。
 */
function collectEarlierProposals(e, n, r) {
  let s = new Map();
  if (e.length === 0) return s;
  try {
    let m = n.messages();
    let h = new Set(
      m
        .flatMap((f) => (f.type === "user" && typeof f.message.content !== "string" ? f.message.content : []))
        .flatMap((f) =>
          isObjectBlock(f) && f.type === "tool_result" && f.is_error !== true ? [f.tool_use_id] : [],
        ),
    );
    let flattened = m.flatMap((f, k) =>
      f.type === "assistant" && Array.isArray(f.message.content)
        ? f.message.content.map((block) => ({
            block,
            isFromThisTurn: k >= n.turnStartIndex,
          }))
        : [],
    );
    for (let { block, isFromThisTurn } of flattened) {
      if (
        !isObjectBlock(block) ||
        block.type !== "tool_use" ||
        block.name !== PROPOSE_SKILLS ||
        !h.has(block.id)
      )
        continue;
      let _ = proposeSkillsInputSchema().safeParse(block.input);
      let proposals = _.success ? _.data.proposals : [];
      for (let I of resolveProposalTargets(proposals, r, createProposalTargetCounts())) {
        let { skillMd, description } = I;
        s.set(I.skill, {
          skillMd,
          description,
          isFromThisTurn,
        });
      }
    }
  } catch (error) {
    logForDebugging(
      `propose_skills: earlier proposals not looked up, so none counts: ${errorMessage(error)}`,
    );
    logError(error);
    s.clear();
  }
  return s;
}
//@ chunk-2rkp9ne9.js:31838-32026 placement
function collectConversationLinesSafe(messages) {
  try {
    return collectConversationLines(messages());
  } catch (error) {
    logForDebugging(
      `propose_skills: could not read the conversation, so unseen_missing_band is logged as -1; the read check is unaffected: ${errorMessage(error)}`,
    );
    logError(error);
    return;
  }
}
//@ chunk-2rkp9ne9.js:32026-32668 placement
/**
 * 记录未读完或磁盘已更新的目标技能：分别记入被拒更新或被拒新名，并生成原因。
 */
function recordUnreadOrStaleTarget(state, outcome, path, s) {
  if (outcome.kind === "update") {
    state.refusedUpdates.add(outcome.written);
    state[s].push(`${outcome.written} (${path})`);
    return;
  }
  state.refusedNewNames.add(outcome.written);
  let m = s === "unread" ? "has not been read in full yet" : "on disk is newer than the copy read";
  state.replacedByNew.push(
    `The new proposal ${outcome.written} would be saved under the name of the listed skill ${outcome.skill.name} (${path}), whose SKILL.md ${m}. If that skill is the user's own, saving this proposal replaces its SKILL.md entirely. Read that whole file ${s === "unread" ? "first" : "again"}, then call again with a complete SKILL.md that keeps everything worth keeping, or call again under a different name.`,
  );
}
//@ chunk-2rkp9ne9.js:32668-32770 placement
var MAX_SKILL_TEXT_CHARS = 50000;
var NEW_SKILL_NAME_HINT =
  "Tell the user; propose it as a new skill under another name only if they want that.";
//@ chunk-2rkp9ne9.js:32770-35187 placement
async function resolveSkillProposals(e, n, proposalTargets, s, signal, keepPercent, earlierProposals, f) {
  let k = new Set(proposalTargets.flatMap((w) => (w.kind === "update" ? [w.written] : [])));
  for (let { kind, target } of n)
    if (kind === "improvement" && target && !k.has(target)) {
      e.refusedUpdates.add(target);
      e.keptElsewhere.push(
        `${collapseLineBreaks(normalizeLineBreaks(target))} is not among the user's skills that this session lists right now, so it cannot be updated yet. Call again once; if it is still not listed, tell the user, and propose it as a new skill under another name only if they want that.`,
      );
    }
  let _ = uniq(proposalTargets.map((w) => skillDisplayName(w.skill)));
  let P = new Map(await Promise.all(_.map(async (w) => [w, await downloadAndReadSkillFile(w, signal)])));
  let I = conversationToolResultsInclude(s, CURRENT_SKILL_MD_OPEN_TAG);
  let L = new Set();
  let b = 0;
  for (let w of proposalTargets) {
    let S = skillDisplayName(w.skill);
    let y = P.get(S);
    let B = y === undefined ? undefined : formatCurrentSkillMd(y);
    let K = B !== undefined && conversationToolResultsInclude(s, B);
    let T = evaluateKeptLines({
      checkKind: w.kind,
      status: K ? "read" : "unread",
      current: !K && isWithheldSkill(S) ? undefined : y,
      proposal: w,
      sawOtherBytes: !K && I,
      lastShownProposal: earlierProposals.get(w.skill),
      heldLines: undefined,
      keepPercent,
    });
    f.push(T);
    if (T.verdict !== "unread") continue;
    let N = w.kind === "update";
    (N ? e.refusedUpdates : e.refusedNewNames).add(w.written);
    let x = collapseLineBreaks(normalizeLineBreaks(w.written));
    let R = N
      ? `${x} cannot be updated yet: its current SKILL.md`
      : `The new proposal ${x} would be saved under the name of the listed skill ${w.skill.name}, replacing its SKILL.md entirely if that skill is the user's own, and that SKILL.md`;
    let D = N ? "propose it as a new skill under another name" : "call again under a different name";
    if (isWithheldSkill(S))
      e.keptElsewhere.push(
        N
          ? `${x} cannot be updated from here: the skill is switched off for this session. ${NEW_SKILL_NAME_HINT}`
          : `${R} cannot be read: that skill is switched off for this session. Instead, ${D}.`,
      );
    else if (B === undefined)
      e.keptElsewhere.push(
        `${R} could not be read. Call again once; if it still cannot be read, ${N ? "tell the user the skill cannot be updated right now" : D}.`,
      );
    else if (L.has(S)) e.keptElsewhere.push(`${R} is not in this conversation: it is the one shown above.`);
    else if (B.length > MAX_SKILL_TEXT_CHARS)
      e.keptElsewhere.push(
        N
          ? `${x} cannot be updated from here: its current SKILL.md is too long to show. ${NEW_SKILL_NAME_HINT}`
          : `${R} is too long to show here. Instead, ${D}.`,
      );
    else if (b + B.length > MAX_SKILL_TEXT_CHARS)
      e.keptElsewhere.push(
        `${R} is not in this conversation, and there is no room left to show it here. Propose this one in a call of its own.`,
      );
    else {
      L.add(S);
      b += B.length;
      e.keptElsewhere.push(
        `${R} is not in this conversation. A saved proposal replaces the whole file, so here it is, each line after its number and a tab, which are not part of the file; call again with a complete SKILL.md that keeps everything worth keeping, or ${D}.${B}`,
      );
    }
  }
}
//@ chunk-2rkp9ne9.js:35187-35217 placement
/**
 * <current_skill_md> 开标签。
 */
var CURRENT_SKILL_MD_OPEN_TAG = `
<current_skill_md>
`;
//@ chunk-2rkp9ne9.js:35217-35311 placement = getSnippetForPatch (0.297)
/**
 * 把 SKILL.md 内容加行号并包进 <current_skill_md> 标签（技能同步提示用；归属疑似错误）。
 */
function formatCurrentSkillMd(e) {
  let formattedSnippet = addLineNumbers({
    content: normalizeLineBreaks(e),
    startLine: 1,
  });
  return `${CURRENT_SKILL_MD_OPEN_TAG}${formattedSnippet}
</current_skill_md>
`;
}
//@ chunk-2rkp9ne9.js:35311-35634 placement
function conversationToolResultsInclude(e, n) {
  return e.some(
    (r) =>
      r.type === "user" &&
      typeof r.message.content !== "string" &&
      r.message.content.some(
        (s) =>
          isObjectBlock(s) &&
          s.type === "tool_result" &&
          (typeof s.content === "string"
            ? indexOfKmp(s.content, n, 0) !== -1
            : Array.isArray(s.content) &&
              s.content.some(
                (m) =>
                  isObjectBlock(m) &&
                  m.type === "text" &&
                  typeof m.text === "string" &&
                  indexOfKmp(m.text, n, 0) !== -1,
              )),
      ),
  );
}
//@ chunk-2rkp9ne9.js:35634-35721 placement
/**
 * 等技能下载完成后再读取文件，失败时静默。
 */
async function downloadAndReadSkillFile(e, n) {
  await raceWithAbortSignal(startPendingDownload(e), n, () => new AbortError()).catch(() => {
    return;
  });
  return listedSkillText(e);
}
//@ chunk-2rkp9ne9.js:35721-36249 placement
/**
 * 根据未读、过期、保存在别处等检查结果组装给模型的提示消息。
 */
function buildReadCheckMessages({ unread, stale, keptElsewhere, replacedByNew }) {
  if (keptElsewhere.length > 0)
    return [
      keptElsewhere.join(`
`),
    ];
  let m = unread.length + stale.length;
  if (m === 0) return replacedByNew;
  return [
    `${[...(unread.length > 0 ? [`Existing SKILL.md not read in full yet for ${unread.join(", ")}.`] : []), ...(stale.length > 0 ? [`SKILL.md on disk is newer than the copy read for ${stale.join(", ")}.`] : [])].join(" ")} A saved proposal replaces a skill's SKILL.md entirely \u2014 read ${m === 1 ? "that whole file" : "those whole files"} ${unread.length === 0 ? "again" : "first"}, then propose the complete updated SKILL.md.`,
    ...replacedByNew,
  ];
}
//@ chunk-2rkp9ne9.js:36249-36513 placement
function getSkillFileForReadCheck(e) {
  if (isDiskless()) return;
  if (e.loadedFrom === "plugin")
    return e.pluginSource === undefined
      ? undefined
      : {
          path: expandPath(e.pluginSource.filePath),
          contentLength: e.contentLength,
        };
  if (!e.skillRoot || isSyncedSkillPlaceholder(e)) return;
  return {
    path: expandPath(join(e.skillRoot, "SKILL.md")),
    contentLength: e.contentLength,
  };
}
//@ chunk-2rkp9ne9.js:36513-36525 placement
/**
 * 技能下载等待的超时时间（5 秒）。
 */
var SKILL_DOWNLOAD_TIMEOUT_MS = 5000;
//@ chunk-2rkp9ne9.js:36525-36809 placement
/**
 * 占位同步技能先启动下载并等待，再读取其文件内容。
 */
async function readSkillFileAfterDownload(skill, storageV5, signal) {
  if (!skill.skillRoot || !isSyncedSkillPlaceholder(skill)) return getSkillFileForReadCheck(skill);
  let s = skillDisplayName(skill);
  if (isSkillDownloadPending(s)) return;
  if (
    !(
      await withDeadline(
        raceWithAbortSignal(startPendingDownload(s), signal, () => new AbortError()),
        SKILL_DOWNLOAD_TIMEOUT_MS,
      ).catch(() => {
        return;
      })
    )?.ok
  )
    return;
  let found = (await getCommands(getProjectRootOrNull(), storageV5)).find(
    (f) =>
      f.type === "prompt" && isSyncedSkill(f) && skillDisplayName(f) === s && !isSyncedSkillPlaceholder(f),
  );
  return found?.type === "prompt" ? getSkillFileForReadCheck(found) : undefined;
}
//@ chunk-2rkp9ne9.js:36809-37052 placement
function isSkillReadIncomplete(e, n, r) {
  if (e === undefined || e.contentNotInModelContext || e.isPartialView) return true;
  if ((e.offset ?? 1) <= 1) return false;
  let defaultFileReadingLimits = getDefaultFileReadingLimits();
  let maxTokens = r.fileReadingLimits?.maxTokens ?? defaultFileReadingLimits.maxTokens;
  let maxSizeBytes = r.fileReadingLimits?.maxSizeBytes ?? defaultFileReadingLimits.maxSizeBytes;
  return n <= maxTokens && n <= maxSizeBytes;
}
//@ chunk-2rkp9ne9.js:37052-37418 placement
/**
 * 判断技能文件的读取状态：未读、已读或已过期（磁盘内容比读到的新）。
 */
async function classifySkillReadStatus(e, contentLength, r, skillFileWhole, m) {
  if (e === undefined || isSkillReadIncomplete(e, contentLength, r)) return "unread";
  if ((e.offset ?? 1) > 1) return (await m(e)) ? "stale" : "read";
  let h = await m(e);
  let g = skillFileWhole?.whole === undefined ? undefined : stripBomAndCarriageReturn(skillFileWhole.whole);
  let f = g !== undefined && matchesContentHash(e, g);
  if (isFullFileView(e)) {
    if (!h) return "read";
    return skillFileWhole === undefined || f ? "read" : "stale";
  }
  if (f) return "read";
  let k =
    g !== undefined &&
    e.limit !== undefined &&
    countCharInString(
      g,
      `
`,
    ) +
      1 <
      e.limit;
  return !h && k ? "read" : "unread";
}
//@ chunk-2rkp9ne9.js:37418-37543 placement
async function isFileModifiedSince(path, n) {
  try {
    return (await getFileModificationTimeAsync(path)) > n.timestamp;
  } catch (error) {
    logForDebugging(`propose_skills: cannot stat ${path}: ${errorMessage(error)}`);
    return false;
  }
}
//@ chunk-2rkp9ne9.js:37543-37737 placement
async function readSkillFileWhole(path) {
  try {
    let fileBytes = await getFsImplementation().readFileBytes(path, MAX_SCOPE_RESPONSE_BYTES + 1);
    return {
      whole:
        fileBytes.length === 0 || fileBytes.length > MAX_SCOPE_RESPONSE_BYTES
          ? undefined
          : fileBytes.toString("utf8"),
    };
  } catch (error) {
    logForDebugging(`propose_skills: cannot read ${path}: ${errorMessage(error)}`);
    return;
  }
}
//@ chunk-3e7edr38.js:231-1609 placement
/**
 * ProposeSkills 工具的一句话描述。
 */
var PROPOSE_SKILLS = "propose_skills";
var PROPOSE_SKILLS_DESCRIPTION =
  "Show the user a review card of proposed skills to save \u2014 render-only, nothing is written";
var PROPOSE_SKILLS_PROMPT = `Surface recurring multi-step procedures from this session as skill proposals. Render-only \u2014 calling this shows a review card in the conversation; it does not write any files or create the skill. The user reviews and saves from the card. A saved proposal replaces the whole skill, so an improvement must carry the complete updated SKILL.md, never a partial edit.

Call once with all proposals (max 3). Use it when the user asks to turn a workflow or procedure into a skill, or when the same multi-step procedure has recurred and a skill would clearly save future work. Do not call it for one-off tasks, and do not re-propose skills the user has already seen.

An improvement can only update one of the user's own skills, including one of theirs that this session lists as a plugin skill because they uploaded it to claude.ai; the tool tells you when a target is not theirs. Another plugin's skill or a built-in one can't be updated from the card. To customize one of those with this tool, propose it as a new skill under a name of its own \u2014 not the original's name, even without its plugin prefix \u2014 with a description that says when to use it instead of the original: both stay listed, and the description decides which one is used.`;
export { PROPOSE_SKILLS };
