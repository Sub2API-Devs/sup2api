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
import {
  objectSchema,
  array,
  stringSchema,
  _enum,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

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
//@ chunk-2rkp9ne9.js:12369-12420 placement
/**
 * 技能展示名：取未限定名，没有时去掉同步前缀。
 */
function skillDisplayName(skill) {
  return skill.unqualifiedName ?? stripSyncedSkillPrefix(skill.name);
}
//@ chunk-2rkp9ne9.js:12420-12510 placement
/**
 * 判断技能名是否匹配给定名字（考虑展示名与源码来源）。
 */
function isSkillNameMatch(skill, targetName) {
  let displayName = skillDisplayName(skill);
  let ownership = listedSkillOwnershipOf(displayName);
  return skillNameMatches(
    ownership?.listedName ?? displayName,
    targetName,
    ownership?.savedFromAChat ?? true,
  );
}
//@ chunk-2rkp9ne9.js:12510-12635 placement
function findSkillsByName(target, commands) {
  let command = findCommand(target, commands);
  let targetName = stripSkillNamespacePrefix(target);
  let filtered = getValueFromInput(commands).filter(
    (skillCommand) => skillCommand === command || isSkillNameMatch(skillCommand, targetName),
  );
  return {
    skills: filtered,
    foundByLookup: filtered.some((skillCommand) => skillCommand === command),
  };
}
//@ chunk-2rkp9ne9.js:12635-12746 placement
function findOwnSkillsByName(targetName, commands) {
  return getValueFromInput(commands).filter((command) => {
    let ownership = listedSkillOwnershipOf(skillDisplayName(command))?.ownership;
    return (ownership === undefined || ownership === "own") && isSkillNameMatch(command, targetName);
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
  let firstOwnedElsewhere;
  for (let skill of findSkillsByName(target, commands).skills) {
    let ownership = listedSkillOwnershipOf(skillDisplayName(skill))?.ownership;
    let ownershipDescription = ownership && SKILL_OWNERSHIP_DESCRIPTIONS[ownership];
    if (ownershipDescription === undefined) return;
    firstOwnedElsewhere ??= {
      skill,
      whose: ownershipDescription,
    };
  }
  return firstOwnedElsewhere !== undefined &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_reflective_donut", false) === true
    ? firstOwnedElsewhere
    : undefined;
}
//@ chunk-2rkp9ne9.js:13049-13119 placement (2.1.88 match: getValueFromInput, 1)
function getValueFromInput(input) {
  return input.flatMap((command) => (command.type === "prompt" && isSyncedSkill(command) ? [command] : []));
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
  let proposedDoc = splitFrontmatter(proposed);
  let proposedLines = splitMeaningfulLines(proposedDoc.body);
  let proposedLineCounts = new Map();
  for (let line of proposedLines) proposedLineCounts.set(line, (proposedLineCounts.get(line) ?? 0) + 1);
  let currentLines = splitMeaningfulLines(currentDoc.body);
  let totalBytes = 0;
  let keptCount = 0;
  let keptBytes = 0;
  let hasPlaceholder = false;
  let placeholderDropped = false;
  for (let line of currentLines) {
    let lineBytes = Buffer.byteLength(line, "utf8");
    totalBytes += lineBytes;
    let isDynamic = hasDynamicSkillSyntax(line);
    hasPlaceholder ||= isDynamic;
    let remainingCopies = proposedLineCounts.get(line) ?? 0;
    if (remainingCopies > 0) {
      proposedLineCounts.set(line, remainingCopies - 1);
      keptCount++;
      keptBytes += lineBytes;
    } else if (isDynamic) placeholderDropped = true;
  }
  let totalLines = currentLines.length;
  let cleanString = isWellFormedString(current) && !current.includes("\uFFFD");
  let any = currentDoc.frontmatter.some((frontmatterLine) => frontmatterLine.includes("---"));
  let applies = cleanString && currentDoc.hasFrontmatter && !any && totalLines >= 1;
  let startsWithFrontmatter =
    proposed.startsWith(`---
`) || proposed.startsWith("---\r");
  let any_2 = proposedDoc.frontmatter.some(
    (frontmatterLine) => frontmatterLine.includes("-") && !frontmatterLine.includes(":"),
  );
  return {
    applies,
    currentHasFrontmatter: currentDoc.hasFrontmatter,
    proposedHasFrontmatter: proposedDoc.hasFrontmatter && startsWithFrontmatter && !any_2,
    proposedHasCr: proposed.includes("\r"),
    proposedHasInvisible: INVISIBLE_CHARS.some((invisibleChar) => proposed.includes(invisibleChar)),
    total: totalLines,
    totalBytes,
    kept: keptCount,
    keptBytes,
    proposedLines: proposedLines.length,
    currentHasPlaceholder: applies && hasPlaceholder,
    placeholderDropped: applies && placeholderDropped,
    proposalAddsLoadLine:
      applies && [...proposedLineCounts].some(([line, count]) => count > 0 && isSkillLoadHeaderLine(line)),
    keptBand: applies ? keptPercentBand(keptCount, totalLines) : -1,
    keptBytesBand: applies ? keptPercentBand(keptBytes, totalBytes) : -1,
    missingBand: applies ? missingCountBand(totalLines - keptCount) : -1,
    sizeBand: applies ? sizeRatioBand(proposedLines.length, totalLines) : -1,
    descriptionState:
      cleanString && currentDoc.hasFrontmatter
        ? describeDescriptionState(currentDoc.frontmatter, description)
        : -1,
  };
}
//@ chunk-2rkp9ne9.js:14190-14350 placement
function droppedSkillLines(current, proposed) {
  let counts = new Map();
  for (let line of splitMeaningfulLines(splitFrontmatter(proposed).body))
    counts.set(line, (counts.get(line) ?? 0) + 1);
  return splitMeaningfulLines(splitFrontmatter(current).body).filter((line) => {
    let remaining = counts.get(line) ?? 0;
    counts.set(line, remaining - 1);
    return remaining <= 0;
  });
}
//@ chunk-2rkp9ne9.js:14350-14427 placement
/**
 * 判断数值是否为 50 到 100 的整数（保留比例阈值）。
 */
function isValidKeptPercent(percent) {
  return typeof percent === "number" && Number.isInteger(percent) && percent >= 50 && percent <= 100;
}
//@ chunk-2rkp9ne9.js:14427-14694 placement
function passesKeptLinesCheck(lines, minKeptPercent) {
  let { total, totalBytes, kept, keptBytes, proposedLines } = lines;
  if (
    !isValidKeptPercent(minKeptPercent) ||
    !lines.applies ||
    !lines.proposedHasFrontmatter ||
    lines.proposedHasCr ||
    lines.proposedHasInvisible ||
    kept * 100 < total * minKeptPercent
  )
    return false;
  return (
    keptBytes * 100 >= totalBytes * minKeptPercent &&
    proposedLines * 100 >= total * MIN_KEPT_PERCENT &&
    !lines.placeholderDropped &&
    !lines.proposalAddsLoadLine
  );
}
//@ chunk-2rkp9ne9.js:14694-14814 placement
function hasDynamicSkillSyntax(line) {
  return (
    line.includes("$") ||
    line.includes("!`") ||
    line.includes("```!") ||
    line.includes("\uFFFE") ||
    line.includes("\uFFFF")
  );
}
//@ chunk-2rkp9ne9.js:14814-15002 placement
function isSkillLoadHeaderLine(line) {
  let startIndex = 0;
  while (startIndex < line.length && UNICODE_SPACE_CHARS.includes(line[startIndex])) startIndex++;
  return (
    line.startsWith("Base directory for this skill: ", startIndex) ||
    line.startsWith("ARGUMENTS: ", startIndex) ||
    line.startsWith("Skill arguments: ", startIndex)
  );
}
//@ chunk-2rkp9ne9.js:15002-15117 placement
var UNICODE_SPACE_CHARS =
  "\t\v\f \x85\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000";
//@ chunk-2rkp9ne9.js:15117-15230 placement
function splitLines(text) {
  return (text.startsWith("\uFEFF") ? text.slice(1) : text)
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
function rtrimLine(line) {
  let endIndex = line.length;
  while (endIndex > 0 && (line[endIndex - 1] === " " || line[endIndex - 1] === "\t")) endIndex--;
  return line.slice(0, endIndex);
}
//@ chunk-2rkp9ne9.js:15325-15376 placement
/**
 * 去掉空行后的行列表，用于比较现有与提议的技能正文。
 */
function splitMeaningfulLines(body) {
  return body.map(rtrimLine).filter((line) => line !== "");
}
//@ chunk-2rkp9ne9.js:15376-15406 placement
/**
 * 取文本正文的规范化行集合。
 */
function bodyLines(text) {
  return splitMeaningfulLines(splitLines(text));
}
//@ chunk-2rkp9ne9.js:15406-15694 placement
function splitFrontmatter(text) {
  let lines = splitLines(text);
  let index = lines.findIndex((line) => rtrimLine(line) !== "");
  if (index === -1)
    return {
      hasFrontmatter: false,
      frontmatter: [],
      body: [],
    };
  let closingIndex = lines[index] === "---" ? lines.indexOf("---", index + 1) : -1;
  if (closingIndex <= index + 1)
    return {
      hasFrontmatter: false,
      frontmatter: [],
      body: lines,
    };
  return {
    hasFrontmatter: true,
    frontmatter: lines.slice(index + 1, closingIndex),
    body: lines.slice(closingIndex + 1),
  };
}
//@ chunk-2rkp9ne9.js:15694-15779 placement
/**
 * 把保留比例映射到分档值（100/95/90/75/50/25/0）。
 */
function keptPercentBand(kept, total) {
  if (kept === total) return 100;
  return [95, 90, 75, 50, 25].find((band) => kept * 100 >= band * total) ?? 0;
}
//@ chunk-2rkp9ne9.js:15779-15826 placement
/**
 * 把缺失行数映射到分档值。
 */
function missingCountBand(missingCount) {
  return missingCount <= 1 ? missingCount : missingCount <= 5 ? 2 : missingCount <= 20 ? 6 : 21;
}
//@ chunk-2rkp9ne9.js:15826-15910 placement
/**
 * 把体积比映射到分档值，供遥测与保留检查使用。
 */
function sizeRatioBand(proposedLines, currentLines) {
  let scaledProposed = proposedLines * 100;
  return scaledProposed < 50 * currentLines
    ? 0
    : scaledProposed < 90 * currentLines
      ? 50
      : scaledProposed <= 110 * currentLines
        ? 90
        : scaledProposed <= 200 * currentLines
          ? 111
          : 201;
}
//@ chunk-2rkp9ne9.js:15910-16183 placement
function describeDescriptionState(frontmatter, description) {
  let replaced = description.replace(/[\t\n\v\f\r ]/g, " ").replace(/^ +| +$/g, "");
  let replaced_2 = replaced.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  let mapped = frontmatter.map(rtrimLine);
  if (mapped.includes(`description: "${replaced_2}"`) || mapped.includes(`description: ${replaced}`))
    return 0;
  return mapped.some((line) => line.startsWith("description:")) ? 1 : 2;
}
//@ chunk-2rkp9ne9.js:16183-16266 placement
/**
 * 读取 tengu_glittery_fern 的保留比例阈值，无效时返回 0。
 */
function readKeptPercentSetting() {
  try {
    let percent = getFeatureValue_CACHED_MAY_BE_STALE("tengu_glittery_fern", 0);
    return isValidKeptPercent(percent) ? percent : 0;
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
  current,
  proposal,
  sawOtherBytes,
  lastShownProposal,
  heldLines,
  keepPercent,
}) {
  let currentText =
    current !== undefined && Buffer.byteLength(current, "utf8") <= MAX_SCOPE_RESPONSE_BYTES
      ? current
      : undefined;
  let lines = compareSkillLinesSafe(currentText, proposal);
  let lastShownLines =
    lastShownProposal === undefined
      ? EMPTY_KEPT_LINES_STATS
      : compareSkillLinesSafe(currentText, lastShownProposal);
  let currentIsLastShownProposal =
    lastShownLines.applies &&
    lastShownLines.kept === lastShownLines.total &&
    lastShownLines.proposedLines === lastShownLines.total &&
    lastShownLines.descriptionState === 0;
  let lastShownDiffers = !currentIsLastShownProposal;
  let arm =
    status === "read"
      ? "read"
      : status === "stale" && lastShownDiffers
        ? "stale"
        : currentText === undefined
          ? "no_text"
          : !lines.applies
            ? "not_applicable"
            : sawOtherBytes && lastShownDiffers
              ? "other_bytes_read"
              : keepPercent === 0
                ? "off"
                : passesKeptLinesCheck(lines, keepPercent)
                  ? "passed"
                  : "failed";
  return {
    checkKind,
    readStatus: status,
    sawOtherBytes: sawOtherBytes && currentText !== undefined,
    currentIsLastShownProposal,
    lastShown:
      lastShownProposal === undefined
        ? "none"
        : lastShownProposal.isFromThisTurn
          ? "this_turn"
          : "earlier_turn",
    unseenMissingBand:
      currentText !== undefined && lines.applies && heldLines !== undefined
        ? unseenMissingLinesBand(currentText, proposal.skillMd, heldLines)
        : -1,
    verdict: arm === "passed" ? "kept" : status,
    arm,
    keepPercent,
    lines,
  };
}
//@ chunk-2rkp9ne9.js:17009-17963 placement
/**
 * 为每个保留行检查结果上报 tengu_propose_skills_kept_lines 遥测。
 */
function logKeptLinesEvents(entries, phase) {
  try {
    for (let entry of entries) {
      let { lines } = entry;
      logEvent("tengu_propose_skills_kept_lines", {
        check_kind: fromEnum(entry.checkKind),
        read_status: fromEnum(entry.readStatus),
        saw_other_bytes: entry.sawOtherBytes,
        current_is_last_shown_proposal: entry.currentIsLastShownProposal,
        last_shown: fromEnum(entry.lastShown),
        unseen_missing_band: entry.unseenMissingBand,
        verdict: fromEnum(entry.verdict),
        arm: fromEnum(entry.arm),
        keep_percent: entry.keepPercent,
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
        phase: fromEnum(phase),
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
function compareSkillLinesSafe(current, { skillMd, description }) {
  try {
    return compareSkillLines(current ?? "", skillMd, description);
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
function unseenMissingLinesBand(current, skillMd, heldLines) {
  try {
    let dropped = droppedSkillLines(current, skillMd);
    if (dropped.length === 0) return 0;
    let held = heldLines();
    if (held === undefined) return -1;
    let bodySet = new Set(bodyLines(skillMd));
    return missingCountBand(count(dropped, (line) => !held.has(line) && !bodySet.has(line)));
  } catch (error) {
    logForDebugging(
      `propose_skills: could not count the dropped lines missing from the conversation, so unseen_missing_band is logged as -1; the verdict stands: ${errorMessage(error)}`,
    );
    logError(error);
    return -1;
  }
}
//@ chunk-2rkp9ne9.js:18767-19017 placement
function collectConversationLines(messages) {
  let lines = new Set();
  for (let message of messages) {
    let contents =
      message.type === "attachment"
        ? (message.rendered ?? []).map(({ content }) => content)
        : message.type === "user" || message.type === "assistant"
          ? [message.message.content]
          : [];
    for (let text of contents.flatMap(contentToStrings))
      for (let line of bodyLines(text)) {
        lines.add(line);
        lines.add(stripLineNumberPrefix(line));
      }
  }
  return lines;
}
//@ chunk-2rkp9ne9.js:19017-19341 placement
/**
 * 把消息内容（字符串或内容块数组）提取为字符串列表。
 */
function contentToStrings(content) {
  if (typeof content === "string") return [content];
  if (!Array.isArray(content)) return [];
  return content.flatMap((block) => {
    if (!isObjectBlock(block)) return [];
    switch (block.type) {
      case "text":
        return "text" in block && typeof block.text === "string" ? [block.text] : [];
      case "tool_result":
        return "content" in block ? contentToStrings(block.content) : [];
      case "tool_use":
        return "input" in block ? collectInputStrings(block.input) : [];
      default:
        return [];
    }
  });
}
//@ chunk-2rkp9ne9.js:19341-19467 placement
function collectInputStrings(value) {
  if (typeof value === "string") return [value];
  if (typeof value !== "object" || value === null) return [];
  return Object.values(value).flatMap(collectInputStrings);
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
function hasTagLikeMarkup(text) {
  let openIndex = text.search(OPEN_ANGLE_BRACKET_RE);
  return openIndex !== -1 && CLOSE_ANGLE_BRACKET_RE.test(text.slice(openIndex + 2));
}
//@ chunk-2rkp9ne9.js:19592-19681 placement
/**
 * 匹配 SKILL.md 的 YAML frontmatter 块。
 */
var YAML_FRONTMATTER_RE = /^(\uFEFF?(?:[ \t]*\r?\n)*---[ \t]*\r?\n)([\s\S]*?)(?=\r?\n---[ \t]*(?:\r?\n|$))/;
//@ chunk-2rkp9ne9.js:19681-19840 placement
function hasSkillInstructions(markdown) {
  let match = YAML_FRONTMATTER_RE.exec(markdown);
  return (
    (match ? markdown.slice(match[0].length).replace(/^\r?\n---[^\n]*/, "") : markdown).trim() !== "" &&
    markdown.replace(/^---\n[\s\S]*?\n---\n+/, "").trim() !== ""
  );
}
//@ chunk-2rkp9ne9.js:19840-26874 placement
/**
 * propose_skills 工具：从反复出现的流程中提出新技能或改进已有技能，交给用户在审核卡片上保存；只在远程 cowork/技能同步等环境启用；校验名称、描述与 SKILL.md，改进已有技能前要求先完整读过其 SKILL.md。
 */
var MAX_SKILL_NAME_CHARS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RESERVED_SKILL_NAME_WORDS;
var proposeSkillsInputSchema;
var proposeSkillsOutputSchema;
var ProposeSkillsTool;
deferInit("chunk-2rkp9ne9.js:19840", () => {
  MAX_SKILL_NAME_CHARS = 64;
  RESERVED_SKILL_NAME_WORDS = ["claude", "anthropic"];
  proposeSkillsInputSchema = DoctorLazy(() =>
    objectSchema({
      proposals: array(
        objectSchema({
          name: stringSchema()
            .min(1)
            .describe(
              'kebab-case skill slug; must not contain "claude" or "anthropic"; at most 64 characters for a new skill',
            ),
          kind: _enum(["new", "improvement"]),
          target: stringSchema()
            .optional()
            .describe(
              "Name of the existing skill to update. Required when kind is 'improvement'; omit for 'new'.",
            ),
          description: stringSchema()
            .max(MAX_SKILL_DESCRIPTION_CHARS, {
              message: `description is longer than ${MAX_SKILL_DESCRIPTION_CHARS} characters, the most a saved skill's description can hold. Call again with one short sentence saying when to use the skill.`,
            })
            .refine((description) => !hasTagLikeMarkup(description), {
              message:
                "description contains angle brackets (less-than and greater-than signs), which a saved skill's description cannot include. Call again with the same sentence reworded without them.",
            })
            .describe(
              "One short sentence saying when to use this skill: aim for under 200 characters, never more than 1024, and no angle brackets. Shown on the review card and saved as the skill's description, which is what decides when the skill is used. For an improvement, reuse the existing skill's description unless the change alters when the skill applies.",
            ),
          evidence: array(stringSchema())
            .optional()
            .describe("memory file paths where this procedure was observed"),
          skillMd: stringSchema()
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
          .refine((proposal) => proposal.kind !== "improvement" || !!proposal.target, {
            message: "target is required when kind is 'improvement'",
            path: ["target"],
          })
          .superRefine((proposal, ctx) => {
            if (proposal.kind !== "new") return;
            if (Array.from(proposal.name).length > MAX_SKILL_NAME_CHARS)
              ctx.addIssue({
                code: "custom",
                path: ["name"],
                message: `name is longer than ${MAX_SKILL_NAME_CHARS} characters, the most a saved skill's name can hold. Call again with a shorter kebab-case slug.`,
              });
            let lower = proposal.name.normalize("NFKC").toLowerCase();
            if (RESERVED_SKILL_NAME_WORDS.some((reservedWord) => lower.includes(reservedWord)))
              ctx.addIssue({
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
  proposeSkillsOutputSchema = DoctorLazy(() =>
    objectSchema({
      proposalCount: numberSchema().describe("Number of proposals shown on the review card"),
    }),
  );
  ProposeSkillsTool = buildTool({
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
    toAutoClassifierInput(input) {
      return (input.proposals ?? []).map((proposal) =>
        proposal.kind === "improvement" && proposal.target
          ? `${proposal.name ?? ""} (improves ${proposal.target}): ${proposal.description ?? ""}`
          : `${proposal.name ?? ""}: ${proposal.description ?? ""}`,
      ).join(`
`);
    },
    async description() {
      return PROPOSE_SKILLS_DESCRIPTION;
    },
    async prompt() {
      return PROPOSE_SKILLS_PROMPT;
    },
    renderToolUseMessage(input) {
      let sliced = (input.proposals ?? []).filter((proposal) => proposal?.name).slice(0, 3);
      if (sliced.length === 0) return "";
      let mapped = sliced.map((proposal) => {
        let nameText = truncateWithNotice(collapseLineBreaks(proposal.name ?? ""), 80);
        return proposal.kind === "improvement" && proposal.target
          ? `${nameText} (improves ${truncateWithNotice(collapseLineBreaks(proposal.target), 80)})`
          : nameText;
      });
      return `Propose ${sliced.length} ${plural(sliced.length, "skill")}: ${mapped.join(", ")}`;
    },
    create(toolContext) {
      return {
        async validateInput({ proposals }, callOptions) {
          let validationErrors = [];
          let state = createReadCheckState();
          let proposalTargetCounts = createProposalTargetCounts();
          let keepPercent = readKeptPercentSetting();
          let keptLinesEntries = [];
          try {
            let commands = withNamedFolderYieldsRestored(
              await getCommands(getProjectRootOrNull(), toolContext.storageV5),
            );
            let proposals_2 = proposals.filter((proposal) => {
              let proposalRefusals = collectProposalRefusals([proposal], commands);
              if (proposalRefusals !== undefined) validationErrors.push(proposalRefusals);
              return proposalRefusals === undefined;
            });
            let allCommands = [...commands, ...withheldSkillPlaceholders()];
            let proposalTargets = resolveProposalTargets(proposals_2, allCommands, proposalTargetCounts);
            let earlierProposals = collectEarlierProposals(proposalTargets, toolContext, allCommands);
            let heldLines = onceExport(() => collectConversationLinesSafe(toolContext.messages));
            if (isDiskless())
              await resolveSkillProposals(
                state,
                proposals_2,
                proposalTargets,
                toolContext.messages(),
                callOptions.signal,
                keepPercent,
                earlierProposals,
                keptLinesEntries,
              );
            for (let target of proposalTargets) {
              let skillFileForReadCheck = getSkillFileForReadCheck(target.skill);
              if (
                skillFileForReadCheck === undefined ||
                !isSkillReadIncomplete(
                  toolContext.readFileState.get(skillFileForReadCheck.path),
                  skillFileForReadCheck.contentLength,
                  callOptions,
                )
              )
                continue;
              let linesEntry = evaluateKeptLines({
                checkKind: target.kind,
                status: "unread",
                current: target.skill.getLoadedSkillMd?.(),
                proposal: target,
                sawOtherBytes: false,
                lastShownProposal: earlierProposals.get(target.skill),
                heldLines,
                keepPercent,
              });
              keptLinesEntries.push(linesEntry);
              if (linesEntry.verdict !== "kept")
                recordUnreadOrStaleTarget(state, target, skillFileForReadCheck.path, "unread");
            }
          } catch (error) {
            logForDebugging(`propose_skills: skipping input checks: ${errorMessage(error)}`);
            if (isDiskless())
              validationErrors.push(
                "The proposal could not be checked against the user's skills. Call again once; if it still cannot be checked, tell the user it cannot be shown now.",
              );
            if (validationErrors.length === 0)
              return {
                result: true,
              };
            logEvent("tengu_propose_skills_read_check", {
              ...proposalTargetCounts,
              failed: true,
            });
            return {
              result: false,
              message: validationErrors.join(" "),
              errorCode: 2,
            };
          }
          let allMessages = [...validationErrors, ...buildReadCheckMessages(state)];
          if (allMessages.length === 0) {
            if (isDiskless()) logKeptLinesEvents(keptLinesEntries, "validate");
            return {
              result: true,
            };
          }
          logEvent("tengu_propose_skills_read_check", {
            ...proposalTargetCounts,
            updates_refused: state.refusedUpdates.size,
            new_proposals_refused: state.refusedNewNames.size,
          });
          logKeptLinesEvents(keptLinesEntries, "validate");
          return {
            result: false,
            message: allMessages.join(" "),
            errorCode: validationErrors.length > 0 ? 2 : state.refusedNewNames.size > 0 ? 3 : 1,
          };
        },
        async call({ proposals }, callOptions) {
          let state = createReadCheckState();
          let proposalTargetCounts = createProposalTargetCounts();
          let keepPercent = readKeptPercentSetting();
          let keptLinesEntries = [];
          try {
            let commands = withNamedFolderYieldsRestored(
              await getCommands(getProjectRootOrNull(), toolContext.storageV5),
            );
            let proposalTargets = resolveProposalTargets(proposals, commands, proposalTargetCounts);
            let earlierProposals = collectEarlierProposals(
              isDiskless() ? [] : proposalTargets,
              toolContext,
              commands,
            );
            let heldLines = onceExport(() => collectConversationLinesSafe(toolContext.messages));
            let results = await Promise.all(
              proposalTargets.map((proposalTarget) =>
                readSkillFileAfterDownload(proposalTarget.skill, toolContext.storageV5, callOptions.signal),
              ),
            );
            for (let [proposalIndex, outcome] of proposalTargets.entries()) {
              if (isDiskless()) continue;
              let target = results[proposalIndex];
              if (target === undefined) {
                proposalTargetCounts.skill_checks_without_a_file_to_read++;
                continue;
              }
              let readState = toolContext.readFileState.get(target.path);
              let skillFileWhole = await readSkillFileWhole(target.path);
              let whole = skillFileWhole?.whole;
              let modifiedSinceRead;
              let trackedTimestamp = (timestamp) =>
                (modifiedSinceRead ??= isFileModifiedSince(target.path, timestamp));
              let readStatus = await classifySkillReadStatus(
                readState,
                target.contentLength,
                callOptions,
                skillFileWhole,
                trackedTimestamp,
              );
              let linesEntry = evaluateKeptLines({
                checkKind: outcome.kind,
                status: readStatus,
                current: whole,
                proposal: outcome,
                sawOtherBytes:
                  readStatus === "unread" &&
                  whole !== undefined &&
                  readState !== undefined &&
                  !readState.contentNotInModelContext &&
                  (await trackedTimestamp(readState)),
                lastShownProposal: earlierProposals.get(outcome.skill),
                heldLines,
                keepPercent,
              });
              keptLinesEntries.push(linesEntry);
              if (linesEntry.verdict === "unread" || linesEntry.verdict === "stale")
                recordUnreadOrStaleTarget(state, outcome, target.path, linesEntry.verdict);
            }
            proposalTargetCounts.updates_refused = state.refusedUpdates.size;
            proposalTargetCounts.new_proposals_refused = state.refusedNewNames.size;
          } catch (error) {
            logError(error);
            proposalTargetCounts.failed = true;
            Object.assign(state, createReadCheckState());
            keptLinesEntries.length = 0;
          }
          logEvent("tengu_propose_skills_read_check", proposalTargetCounts);
          logKeptLinesEvents(keptLinesEntries, "call");
          let readCheckMessages = buildReadCheckMessages(state);
          if (readCheckMessages.length > 0)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `<tool_use_error>${readCheckMessages.join(" ")}</tool_use_error>`,
              "propose_skills: the read check refused the proposal",
              "skill_read_check_refused",
            );
          logEvent("tengu_propose_skills", {
            proposal_count: proposals.length,
            improvement_count: count(proposals, (proposal) => proposal.kind === "improvement"),
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
      let coworkNote = isClaudeAiChatCowork()
        ? " The card renders at this point in your reply and anything you write next appears below it, so refer to it as the card above."
        : "";
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: `Shown ${proposalCount} skill proposal(s) to the user for review.${coworkNote} Continue with the next phase; do not wait for them to respond.`,
      };
    },
  });
});
//@ chunk-2rkp9ne9.js:26874-26925 placement
/**
 * 取名字最后一段冒号后的部分（去掉命名空间前缀）。
 */
function afterLastColon(name) {
  return name.slice(name.lastIndexOf(":") + 1);
}
//@ chunk-2rkp9ne9.js:26925-27014 placement (2.1.88 match: getValueFromInput, 1)
function getValueFromInput_2(target, commands) {
  return commands.some(
    (command) =>
      command.type === "prompt" &&
      isSyncedSkill(command) &&
      (skillDisplayName(command) === target || stripSyncedSkillPrefix(getCommandName(command)) === target),
  );
}
//@ chunk-2rkp9ne9.js:27014-27061 placement (2.1.88 match: ADMIN_TRUSTED_SOURCES, 0.758)
var ADMIN_TRUSTED_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2rkp9ne9.js:27014", () => {
  ADMIN_TRUSTED_SOURCES = new Set(["plugin", "bundled", "builtin"]);
});
//@ chunk-2rkp9ne9.js:27061-27377 placement
/**
 * 查找用户自己上传的、与目标名匹配的插件技能。
 */
function findOwnUploadedPluginSkills(target, commands) {
  if (!areSkillsConvertedAsPlugins()) return [];
  let targetName = stripSkillNamespacePrefix(target);
  let lower = targetName.trim().toLowerCase();
  return commands.flatMap((command) =>
    command.type === "prompt" &&
    command.source === "plugin" &&
    command.loadedFrom === "plugin" &&
    command.pluginInfo?.marketplaceKind === "account_uploads" &&
    marketplaceSuffix(command.pluginInfo.repository) === SYNCED &&
    (command.name.toLowerCase() === lower ||
      skillNameMatches(command.aliases?.[0] ?? afterLastColon(command.name), targetName, true))
      ? [command]
      : [],
  );
}
//@ chunk-2rkp9ne9.js:27377-27505 placement
function isStaleSyncedPluginSkill(command) {
  if (command.pluginSource === undefined || !hasRegisteredSyncedPluginDirs()) return false;
  let pluginPath = resolve(command.pluginSource.pluginPath);
  return !getSyncedPluginDirs().some((dir) => resolve(dir) === pluginPath);
}
//@ chunk-2rkp9ne9.js:27505-27805 placement
/**
 * 生成拒绝更新非用户自有技能的说明，建议改为以新名字提议 new 类型。
 */
function notOwnSkillRefusal(target, name, ownership, displayName) {
  let nameSuffix = name === target ? "" : ` (${name})`;
  return `${target}${nameSuffix} is ${ownership}, not one of the user's own skills, so the review card cannot update it. To customize it for the user, propose kind "new" under a name of its own \u2014 not ${displayName} \u2014 with a description that says when to use it instead of ${name}.`;
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
      let ownSkill = ownUploadedPluginSkills.find(isStaleSyncedPluginSkill) ?? ownUploadedPluginSkills[0];
      if (ownSkill !== undefined) {
        if (isDiskless())
          refusals.push(
            `${proposal.target} is ${ownSkill.name}, one of the user's own skills, delivered as a plugin, and cannot be updated from this session. ${NEW_SKILL_NAME_HINT}`,
          );
        else if (isStaleSyncedPluginSkill(ownSkill))
          refusals.push(
            `${proposal.target} is ${ownSkill.name}, one of the user's own skills, and the copy this session loaded is out of date: its plugin changed or was removed on claude.ai since. Tell the user, and propose the improvement again once the session has reloaded its plugins (usually at their next message), reading its SKILL.md then.`,
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
      let ownSkill = findOwnUploadedPluginSkills(proposal.name, commands)[0];
      if (ownSkill !== undefined) {
        refusals.push(
          isDiskless()
            ? `${proposal.name} is the name of ${ownSkill.name}, one of the user's own skills, delivered as a plugin, which cannot be updated from this session; a new skill saved under it would replace that skill. Propose this under a name of its own, or tell the user.`
            : `${proposal.name} is the name of ${ownSkill.name}, one of the user's own skills, so a new skill saved under it would replace that skill. To change it, read its SKILL.md and propose kind "improvement" with target ${ownSkill.name}; otherwise propose this under a name of its own.`,
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
      let aliasRole =
        command.name === proposal.name
          ? "the name of a plugin skill in this session"
          : `the name the plugin skill ${command.name} already answers to`;
      refusals.push(
        `${proposal.name} is ${aliasRole}, so a new skill saved under it would compete with that skill for the name. Propose it under a name of its own, with a description that says when to use it instead of ${command.name}.`,
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
function resolveProposalTargets(proposals, commands, proposalTargetCounts) {
  return proposals.flatMap((proposal) => {
    let { skillMd, description } = proposal;
    if (proposal.kind === "improvement" && proposal.target) {
      let target = proposal.target;
      let skillsByName = findSkillsByName(target, commands);
      let ownUploadedPluginSkills = findOwnUploadedPluginSkills(target, commands);
      let skillsToUpdate = [
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
      return skillsToUpdate.map((skill) => ({
        kind: "update",
        written: target,
        skill,
        skillMd,
        description,
      }));
    }
    let ownSkills = [
      ...findOwnSkillsByName(proposal.name, commands),
      ...findOwnUploadedPluginSkills(proposal.name, commands),
    ];
    if (ownSkills.length > 0) proposalTargetCounts.new_names_matching_an_own_or_unknown_skill++;
    return ownSkills.map((skill) => ({
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
function collectEarlierProposals(proposalTargets, toolContext, commands) {
  let earlier = new Map();
  if (proposalTargets.length === 0) return earlier;
  try {
    let messages = toolContext.messages();
    let answeredToolUseIds = new Set(
      messages
        .flatMap((message) =>
          message.type === "user" && typeof message.message.content !== "string"
            ? message.message.content
            : [],
        )
        .flatMap((block) =>
          isObjectBlock(block) && block.type === "tool_result" && block.is_error !== true
            ? [block.tool_use_id]
            : [],
        ),
    );
    let flattened = messages.flatMap((message, messageIndex) =>
      message.type === "assistant" && Array.isArray(message.message.content)
        ? message.message.content.map((block) => ({
            block,
            isFromThisTurn: messageIndex >= toolContext.turnStartIndex,
          }))
        : [],
    );
    for (let { block, isFromThisTurn } of flattened) {
      if (
        !isObjectBlock(block) ||
        block.type !== "tool_use" ||
        block.name !== PROPOSE_SKILLS ||
        !answeredToolUseIds.has(block.id)
      )
        continue;
      let parsedInput = proposeSkillsInputSchema().safeParse(block.input);
      let proposals = parsedInput.success ? parsedInput.data.proposals : [];
      for (let target of resolveProposalTargets(proposals, commands, createProposalTargetCounts())) {
        let { skillMd, description } = target;
        earlier.set(target.skill, {
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
    earlier.clear();
  }
  return earlier;
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
function recordUnreadOrStaleTarget(state, outcome, path, status) {
  if (outcome.kind === "update") {
    state.refusedUpdates.add(outcome.written);
    state[status].push(`${outcome.written} (${path})`);
    return;
  }
  state.refusedNewNames.add(outcome.written);
  let statusText =
    status === "unread" ? "has not been read in full yet" : "on disk is newer than the copy read";
  state.replacedByNew.push(
    `The new proposal ${outcome.written} would be saved under the name of the listed skill ${outcome.skill.name} (${path}), whose SKILL.md ${statusText}. If that skill is the user's own, saving this proposal replaces its SKILL.md entirely. Read that whole file ${status === "unread" ? "first" : "again"}, then call again with a complete SKILL.md that keeps everything worth keeping, or call again under a different name.`,
  );
}
//@ chunk-2rkp9ne9.js:32668-32770 placement
var MAX_SKILL_TEXT_CHARS = 50000;
var NEW_SKILL_NAME_HINT =
  "Tell the user; propose it as a new skill under another name only if they want that.";
//@ chunk-2rkp9ne9.js:32770-35187 placement
async function resolveSkillProposals(
  state,
  proposals,
  proposalTargets,
  messages,
  signal,
  keepPercent,
  earlierProposals,
  entries,
) {
  let updatedTargets = new Set(
    proposalTargets.flatMap((target) => (target.kind === "update" ? [target.written] : [])),
  );
  for (let { kind, target } of proposals)
    if (kind === "improvement" && target && !updatedTargets.has(target)) {
      state.refusedUpdates.add(target);
      state.keptElsewhere.push(
        `${collapseLineBreaks(normalizeLineBreaks(target))} is not among the user's skills that this session lists right now, so it cannot be updated yet. Call again once; if it is still not listed, tell the user, and propose it as a new skill under another name only if they want that.`,
      );
    }
  let displayNames = uniq(proposalTargets.map((target) => skillDisplayName(target.skill)));
  let currentByDisplayName = new Map(
    await Promise.all(
      displayNames.map(async (displayName) => [
        displayName,
        await downloadAndReadSkillFile(displayName, signal),
      ]),
    ),
  );
  let sawOtherSkillText = conversationToolResultsInclude(messages, CURRENT_SKILL_MD_OPEN_TAG);
  let alreadyShown = new Set();
  let shownChars = 0;
  for (let target of proposalTargets) {
    let displayName = skillDisplayName(target.skill);
    let currentSkillMd = currentByDisplayName.get(displayName);
    let currentText = currentSkillMd === undefined ? undefined : formatCurrentSkillMd(currentSkillMd);
    let wasRead = currentText !== undefined && conversationToolResultsInclude(messages, currentText);
    let linesEntry = evaluateKeptLines({
      checkKind: target.kind,
      status: wasRead ? "read" : "unread",
      current: !wasRead && isWithheldSkill(displayName) ? undefined : currentSkillMd,
      proposal: target,
      sawOtherBytes: !wasRead && sawOtherSkillText,
      lastShownProposal: earlierProposals.get(target.skill),
      heldLines: undefined,
      keepPercent,
    });
    entries.push(linesEntry);
    if (linesEntry.verdict !== "unread") continue;
    let isUpdate = target.kind === "update";
    (isUpdate ? state.refusedUpdates : state.refusedNewNames).add(target.written);
    let writtenName = collapseLineBreaks(normalizeLineBreaks(target.written));
    let prefixText = isUpdate
      ? `${writtenName} cannot be updated yet: its current SKILL.md`
      : `The new proposal ${writtenName} would be saved under the name of the listed skill ${target.skill.name}, replacing its SKILL.md entirely if that skill is the user's own, and that SKILL.md`;
    let alternativeText = isUpdate
      ? "propose it as a new skill under another name"
      : "call again under a different name";
    if (isWithheldSkill(displayName))
      state.keptElsewhere.push(
        isUpdate
          ? `${writtenName} cannot be updated from here: the skill is switched off for this session. ${NEW_SKILL_NAME_HINT}`
          : `${prefixText} cannot be read: that skill is switched off for this session. Instead, ${alternativeText}.`,
      );
    else if (currentText === undefined)
      state.keptElsewhere.push(
        `${prefixText} could not be read. Call again once; if it still cannot be read, ${isUpdate ? "tell the user the skill cannot be updated right now" : alternativeText}.`,
      );
    else if (alreadyShown.has(displayName))
      state.keptElsewhere.push(`${prefixText} is not in this conversation: it is the one shown above.`);
    else if (currentText.length > MAX_SKILL_TEXT_CHARS)
      state.keptElsewhere.push(
        isUpdate
          ? `${writtenName} cannot be updated from here: its current SKILL.md is too long to show. ${NEW_SKILL_NAME_HINT}`
          : `${prefixText} is too long to show here. Instead, ${alternativeText}.`,
      );
    else if (shownChars + currentText.length > MAX_SKILL_TEXT_CHARS)
      state.keptElsewhere.push(
        `${prefixText} is not in this conversation, and there is no room left to show it here. Propose this one in a call of its own.`,
      );
    else {
      alreadyShown.add(displayName);
      shownChars += currentText.length;
      state.keptElsewhere.push(
        `${prefixText} is not in this conversation. A saved proposal replaces the whole file, so here it is, each line after its number and a tab, which are not part of the file; call again with a complete SKILL.md that keeps everything worth keeping, or ${alternativeText}.${currentText}`,
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
//@ chunk-2rkp9ne9.js:35217-35311 placement (2.1.88 match: getSnippetForPatch, 0.297)
/**
 * 把 SKILL.md 内容加行号并包进 <current_skill_md> 标签（技能同步提示用；归属疑似错误）。
 */
function formatCurrentSkillMd(skillMd) {
  let formattedSnippet = addLineNumbers({
    content: normalizeLineBreaks(skillMd),
    startLine: 1,
  });
  return `${CURRENT_SKILL_MD_OPEN_TAG}${formattedSnippet}
</current_skill_md>
`;
}
//@ chunk-2rkp9ne9.js:35311-35634 placement
function conversationToolResultsInclude(messages, needle) {
  return messages.some(
    (message) =>
      message.type === "user" &&
      typeof message.message.content !== "string" &&
      message.message.content.some(
        (block) =>
          isObjectBlock(block) &&
          block.type === "tool_result" &&
          (typeof block.content === "string"
            ? indexOfKmp(block.content, needle, 0) !== -1
            : Array.isArray(block.content) &&
              block.content.some(
                (contentPart) =>
                  isObjectBlock(contentPart) &&
                  contentPart.type === "text" &&
                  typeof contentPart.text === "string" &&
                  indexOfKmp(contentPart.text, needle, 0) !== -1,
              )),
      ),
  );
}
//@ chunk-2rkp9ne9.js:35634-35721 placement
/**
 * 等技能下载完成后再读取文件，失败时静默。
 */
async function downloadAndReadSkillFile(displayName, signal) {
  await raceWithAbortSignal(startPendingDownload(displayName), signal, () => new AbortError()).catch(() => {
    return;
  });
  return listedSkillText(displayName);
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
  let incompleteCount = unread.length + stale.length;
  if (incompleteCount === 0) return replacedByNew;
  return [
    `${[...(unread.length > 0 ? [`Existing SKILL.md not read in full yet for ${unread.join(", ")}.`] : []), ...(stale.length > 0 ? [`SKILL.md on disk is newer than the copy read for ${stale.join(", ")}.`] : [])].join(" ")} A saved proposal replaces a skill's SKILL.md entirely \u2014 read ${incompleteCount === 1 ? "that whole file" : "those whole files"} ${unread.length === 0 ? "again" : "first"}, then propose the complete updated SKILL.md.`,
    ...replacedByNew,
  ];
}
//@ chunk-2rkp9ne9.js:36249-36513 placement
function getSkillFileForReadCheck(command) {
  if (isDiskless()) return;
  if (command.loadedFrom === "plugin")
    return command.pluginSource === undefined
      ? undefined
      : {
          path: expandPath(command.pluginSource.filePath),
          contentLength: command.contentLength,
        };
  if (!command.skillRoot || isSyncedSkillPlaceholder(command)) return;
  return {
    path: expandPath(join(command.skillRoot, "SKILL.md")),
    contentLength: command.contentLength,
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
async function readSkillFileAfterDownload(command, storageV5, signal) {
  if (!command.skillRoot || !isSyncedSkillPlaceholder(command)) return getSkillFileForReadCheck(command);
  let displayName = skillDisplayName(command);
  if (isSkillDownloadPending(displayName)) return;
  if (
    !(
      await withDeadline(
        raceWithAbortSignal(startPendingDownload(displayName), signal, () => new AbortError()),
        SKILL_DOWNLOAD_TIMEOUT_MS,
      ).catch(() => {
        return;
      })
    )?.ok
  )
    return;
  let command_2 = (await getCommands(getProjectRootOrNull(), storageV5)).find(
    (command) =>
      command.type === "prompt" &&
      isSyncedSkill(command) &&
      skillDisplayName(command) === displayName &&
      !isSyncedSkillPlaceholder(command),
  );
  return command_2?.type === "prompt" ? getSkillFileForReadCheck(command_2) : undefined;
}
//@ chunk-2rkp9ne9.js:36809-37052 placement
function isSkillReadIncomplete(readState, contentLength, toolContext) {
  if (readState === undefined || readState.contentNotInModelContext || readState.isPartialView) return true;
  if ((readState.offset ?? 1) <= 1) return false;
  let defaultFileReadingLimits = getDefaultFileReadingLimits();
  let maxTokens = toolContext.fileReadingLimits?.maxTokens ?? defaultFileReadingLimits.maxTokens;
  let maxSizeBytes = toolContext.fileReadingLimits?.maxSizeBytes ?? defaultFileReadingLimits.maxSizeBytes;
  return contentLength <= maxTokens && contentLength <= maxSizeBytes;
}
//@ chunk-2rkp9ne9.js:37052-37418 placement
/**
 * 判断技能文件的读取状态：未读、已读或已过期（磁盘内容比读到的新）。
 */
async function classifySkillReadStatus(
  readState,
  contentLength,
  toolContext,
  skillFileWhole,
  isModifiedSince,
) {
  if (readState === undefined || isSkillReadIncomplete(readState, contentLength, toolContext))
    return "unread";
  if ((readState.offset ?? 1) > 1) return (await isModifiedSince(readState)) ? "stale" : "read";
  let modified = await isModifiedSince(readState);
  let wholeContent =
    skillFileWhole?.whole === undefined ? undefined : stripBomAndCarriageReturn(skillFileWhole.whole);
  let matchesWhole = wholeContent !== undefined && matchesContentHash(readState, wholeContent);
  if (isFullFileView(readState)) {
    if (!modified) return "read";
    return skillFileWhole === undefined || matchesWhole ? "read" : "stale";
  }
  if (matchesWhole) return "read";
  let coversWholeFile =
    wholeContent !== undefined &&
    readState.limit !== undefined &&
    countCharInString(
      wholeContent,
      `
`,
    ) +
      1 <
      readState.limit;
  return !modified && coversWholeFile ? "read" : "unread";
}
//@ chunk-2rkp9ne9.js:37418-37543 placement
async function isFileModifiedSince(path, readState) {
  try {
    return (await getFileModificationTimeAsync(path)) > readState.timestamp;
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
export { PROPOSE_SKILLS, ProposeSkillsTool };
