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
import { I0r } from "../../services/skillsSync/listedSkillOwnership.js";
import { skillNameMatches, stripSkillNamespacePrefix } from "../../utils/plugins/loadPluginCommands.js";
import { findCommand, withNamedFolderYieldsRestored, getCommands, getCommandName } from "../../commands.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isSyncedSkill, isHostCatalogSkill } from "../../utils/commandPredicates.js";
import { isWellFormedString, plural, countCharInString } from "../../utils/stringUtils.js";
import { By } from "../../services/plugins/accountSync/pluginsScopeGate.js";
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
import { bl } from "../../utils/toolResultStorage.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, o, U, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { MODEL_FACING_MESSAGE_KEY } from "../ArtifactTool/publishEdits.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { isSpawnedByClaudeCodeSession } from "../../utils/claudeSubprocessEnv.js";
import { isCcsRemoteCowork, isRemoteCowork, isClaudeAiChatCowork } from "../../utils/entrypointKinds.js";
import { env } from "../../utils/env.js";
import { truncateWithNotice, gQe } from "../../utils/truncationNotice.js";
import {
  iqs,
  v3n,
  startPendingDownload,
  tqs,
  isSyncedSkillPlaceholder,
  nqs,
} from "../../utils/claudeAiSync/skillsSync.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";
import { B2 } from "../../utils/permissions/permissionRulePayload.js";
import { marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { SYNCED } from "../../utils/telemetry/pluginTelemetry.js";
import { t4e } from "../../utils/messages/forwardedTurnSanitize.js";
import { indexOfKmp } from "../../utils/hooks/hookHelpers.js";
import { raceWithAbortSignal, withDeadline } from "../../utils/sleep.js";
import { expandPath } from "../../utils/path.js";
import { getDefaultFileReadingLimits } from "../FileReadTool/limits.js";
import { __, y1, isFullFileView } from "../../utils/remoteFileState.js";
import { getFsImplementation } from "../../utils/fsOperations.js";

//@ chunk-2rkp9ne9.js:12369-12420 placement
function M(e) {
  return e.unqualifiedName ?? stripSyncedSkillPrefix(e.name);
}
//@ chunk-2rkp9ne9.js:12420-12510 placement
function de(e, n) {
  let r = M(e),
    s = I0r(r);
  return skillNameMatches(s?.listedName ?? r, n, s?.savedFromAChat ?? !0);
}
//@ chunk-2rkp9ne9.js:12510-12635 placement
function findSkillsByName(e, n) {
  let r = findCommand(e, n),
    s = stripSkillNamespacePrefix(e),
    filtered = getValueFromInput(n).filter((h) => h === r || de(h, s));
  return { skills: filtered, foundByLookup: filtered.some((h) => h === r) };
}
//@ chunk-2rkp9ne9.js:12635-12746 placement
function findOwnSkillsByName(e, n) {
  return getValueFromInput(n).filter((r) => {
    let s = I0r(M(r))?.ownership;
    return (s === void 0 || s === "own") && de(r, e);
  });
}
//@ chunk-2rkp9ne9.js:12746-12853 placement
var SKILL_OWNERSHIP_DESCRIPTIONS = {
  anthropic: "built in",
  org: "one of the organization's skills",
  shared: "a skill shared with the user",
};
//@ chunk-2rkp9ne9.js:12853-13049 placement
function findNotOwnedSkill(e, n) {
  let r;
  for (let skill of findSkillsByName(e, n).skills) {
    let m = I0r(M(skill))?.ownership,
      h = m && SKILL_OWNERSHIP_DESCRIPTIONS[m];
    if (h === void 0) return;
    r ??= { skill: skill, whose: h };
  }
  return r !== void 0 && getFeatureValue_CACHED_MAY_BE_STALE("tengu_reflective_donut", !1) === !0
    ? r
    : void 0;
}
//@ chunk-2rkp9ne9.js:13049-13119 placement = getValueFromInput (1)
function getValueFromInput(input) {
  return input.flatMap((n) => (n.type === "prompt" && isSyncedSkill(n) ? [n] : []));
}
//@ chunk-2rkp9ne9.js:13119-13170 placement
var Ke = ["\u200B", "\uFEFF", "\u2028", "\u2029"],
  De = 90;
/**
 * 比较现有 SKILL.md 与提议版本：统计正文行数/字节数中被保留的部分、是否有 frontmatter、换行符与不可见字符、占位符是否被删、是否新增技能加载头行、描述是否一致，并给出分档值供遥测与保留检查使用。
 */
//@ chunk-2rkp9ne9.js:13170-14190 placement
function compareSkillLines(current, proposed, r) {
  let currentDoc = splitFrontmatter(current),
    m = splitFrontmatter(proposed),
    h = z(m.body),
    proposedLineCounts = new Map();
  for (let T of h) proposedLineCounts.set(T, (proposedLineCounts.get(T) ?? 0) + 1);
  let f = z(currentDoc.body),
    k = 0,
    _ = 0,
    P = 0,
    I = !1,
    L = !1;
  for (let T of f) {
    let byteLength = Buffer.byteLength(T, "utf8");
    k += byteLength;
    let x = hasDynamicSkillSyntax(T);
    I ||= x;
    let R = proposedLineCounts.get(T) ?? 0;
    if (R > 0) (proposedLineCounts.set(T, R - 1), _++, (P += byteLength));
    else if (x) L = !0;
  }
  let b = f.length,
    w = isWellFormedString(current) && !current.includes("\uFFFD"),
    any = currentDoc.frontmatter.some((T) => T.includes("---")),
    y = w && currentDoc.hasFrontmatter && !any && b >= 1,
    B =
      proposed.startsWith(`---
`) || proposed.startsWith("---\r"),
    any_2 = m.frontmatter.some((T) => T.includes("-") && !T.includes(":"));
  return {
    applies: y,
    currentHasFrontmatter: currentDoc.hasFrontmatter,
    proposedHasFrontmatter: m.hasFrontmatter && B && !any_2,
    proposedHasCr: proposed.includes("\r"),
    proposedHasInvisible: Ke.some((T) => proposed.includes(T)),
    total: b,
    totalBytes: k,
    kept: _,
    keptBytes: P,
    proposedLines: h.length,
    currentHasPlaceholder: y && I,
    placeholderDropped: y && L,
    proposalAddsLoadLine: y && [...proposedLineCounts].some(([T, N]) => N > 0 && isSkillLoadHeaderLine(T)),
    keptBand: y ? me(_, b) : -1,
    keptBytesBand: y ? me(P, k) : -1,
    missingBand: y ? te(b - _) : -1,
    sizeBand: y ? Ue(h.length, b) : -1,
    descriptionState:
      w && currentDoc.hasFrontmatter ? describeDescriptionState(currentDoc.frontmatter, r) : -1,
  };
}
//@ chunk-2rkp9ne9.js:14190-14350 placement
function droppedSkillLines(e, n) {
  let r = new Map();
  for (let s of z(splitFrontmatter(n).body)) r.set(s, (r.get(s) ?? 0) + 1);
  return z(splitFrontmatter(e).body).filter((s) => {
    let m = r.get(s) ?? 0;
    return (r.set(s, m - 1), m <= 0);
  });
}
//@ chunk-2rkp9ne9.js:14350-14427 placement
function Z(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= 50 && e <= 100;
}
//@ chunk-2rkp9ne9.js:14427-14694 placement
function passesKeptLinesCheck(e, n) {
  let {
    total: total,
    totalBytes: totalBytes,
    kept: kept,
    keptBytes: keptBytes,
    proposedLines: proposedLines,
  } = e;
  if (
    !Z(n) ||
    !e.applies ||
    !e.proposedHasFrontmatter ||
    e.proposedHasCr ||
    e.proposedHasInvisible ||
    kept * 100 < total * n
  )
    return !1;
  return (
    keptBytes * 100 >= totalBytes * n &&
    proposedLines * 100 >= total * De &&
    !e.placeholderDropped &&
    !e.proposalAddsLoadLine
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
function ee(e) {
  let n = e.length;
  while (n > 0 && (e[n - 1] === " " || e[n - 1] === "\t")) n--;
  return e.slice(0, n);
}
//@ chunk-2rkp9ne9.js:15325-15376 placement
function z(e) {
  return e.map(ee).filter((n) => n !== "");
}
//@ chunk-2rkp9ne9.js:15376-15406 placement
function V(e) {
  return z(splitLines(e));
}
//@ chunk-2rkp9ne9.js:15406-15694 placement
function splitFrontmatter(e) {
  let n = splitLines(e),
    index = n.findIndex((m) => ee(m) !== "");
  if (index === -1) return { hasFrontmatter: !1, frontmatter: [], body: [] };
  let s = n[index] === "---" ? n.indexOf("---", index + 1) : -1;
  if (s <= index + 1) return { hasFrontmatter: !1, frontmatter: [], body: n };
  return { hasFrontmatter: !0, frontmatter: n.slice(index + 1, s), body: n.slice(s + 1) };
}
//@ chunk-2rkp9ne9.js:15694-15779 placement
function me(e, n) {
  if (e === n) return 100;
  return [95, 90, 75, 50, 25].find((r) => e * 100 >= r * n) ?? 0;
}
//@ chunk-2rkp9ne9.js:15779-15826 placement
function te(e) {
  return e <= 1 ? e : e <= 5 ? 2 : e <= 20 ? 6 : 21;
}
//@ chunk-2rkp9ne9.js:15826-15910 placement
function Ue(e, n) {
  let r = e * 100;
  return r < 50 * n ? 0 : r < 90 * n ? 50 : r <= 110 * n ? 90 : r <= 200 * n ? 111 : 201;
}
//@ chunk-2rkp9ne9.js:15910-16183 placement
function describeDescriptionState(e, n) {
  let replaced = n.replace(/[\t\n\v\f\r ]/g, " ").replace(/^ +| +$/g, ""),
    replaced_2 = replaced.replaceAll("\\", "\\\\").replaceAll('"', '\\"'),
    mapped = e.map(ee);
  if (mapped.includes(`description: "${replaced_2}"`) || mapped.includes(`description: ${replaced}`))
    return 0;
  return mapped.some((h) => h.startsWith("description:")) ? 1 : 2;
}
//@ chunk-2rkp9ne9.js:16183-16266 placement
function ne() {
  try {
    let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_glittery_fern", 0);
    return Z(e) ? e : 0;
  } catch {
    return 0;
  }
}
/**
 * 汇总一次提议的"保留行"检查：根据读取状态（read/stale/未读）、是否读到其他字节、保留比例阈值得出 arm（passed/failed/stale/…）与 verdict，并附带行统计。
 */
//@ chunk-2rkp9ne9.js:16266-17009 placement
function evaluateKeptLines({
  checkKind: checkKind,
  status: status,
  current: r,
  proposal: proposal,
  sawOtherBytes: sawOtherBytes,
  lastShownProposal: lastShownProposal,
  heldLines: heldLines,
  keepPercent: keepPercent,
}) {
  let k = r !== void 0 && Buffer.byteLength(r, "utf8") <= By ? r : void 0,
    _ = compareSkillLinesSafe(k, proposal),
    P = lastShownProposal === void 0 ? EMPTY_KEPT_LINES_STATS : compareSkillLinesSafe(k, lastShownProposal),
    I = P.applies && P.kept === P.total && P.proposedLines === P.total && P.descriptionState === 0,
    L = !I,
    b =
      status === "read"
        ? "read"
        : status === "stale" && L
          ? "stale"
          : k === void 0
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
    checkKind: checkKind,
    readStatus: status,
    sawOtherBytes: sawOtherBytes && k !== void 0,
    currentIsLastShownProposal: I,
    lastShown:
      lastShownProposal === void 0 ? "none" : lastShownProposal.isFromThisTurn ? "this_turn" : "earlier_turn",
    unseenMissingBand:
      k !== void 0 && _.applies && heldLines !== void 0
        ? unseenMissingLinesBand(k, proposal.skillMd, heldLines)
        : -1,
    verdict: b === "passed" ? "kept" : status,
    arm: b,
    keepPercent: keepPercent,
    lines: _,
  };
}
/**
 * 为每个保留行检查结果上报 tengu_propose_skills_kept_lines 遥测。
 */
//@ chunk-2rkp9ne9.js:17009-17963 placement
function logKeptLinesEvents(e, n) {
  try {
    for (let r of e) {
      let { lines: lines } = r;
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
/**
 * 保留行统计的空结果。
 */
//@ chunk-2rkp9ne9.js:17963-18278 placement
var EMPTY_KEPT_LINES_STATS = {
  applies: !1,
  currentHasFrontmatter: !1,
  proposedHasFrontmatter: !1,
  proposedHasCr: !1,
  proposedHasInvisible: !1,
  total: 0,
  totalBytes: 0,
  kept: 0,
  keptBytes: 0,
  proposedLines: 0,
  currentHasPlaceholder: !1,
  placeholderDropped: !1,
  proposalAddsLoadLine: !1,
  keptBand: -1,
  keptBytesBand: -1,
  missingBand: -1,
  sizeBand: -1,
  descriptionState: -1,
};
//@ chunk-2rkp9ne9.js:18278-18431 placement
function compareSkillLinesSafe(e, { skillMd: skillMd, description: description }) {
  try {
    return compareSkillLines(e ?? "", skillMd, description);
  } catch (error) {
    return (
      logForDebugging(`propose_skills: the kept-lines comparison threw: ${errorMessage(error)}`),
      logError(error),
      EMPTY_KEPT_LINES_STATS
    );
  }
}
/**
 * 计算提议中缺失且未被看到的行数区间；无法读取时返回 -1。
 */
//@ chunk-2rkp9ne9.js:18431-18767 placement
function unseenMissingLinesBand(e, n, r) {
  try {
    let s = droppedSkillLines(e, n);
    if (s.length === 0) return 0;
    let m = r();
    if (m === void 0) return -1;
    let h = new Set(V(n));
    return te(count(s, (g) => !m.has(g) && !h.has(g)));
  } catch (error) {
    return (
      logForDebugging(
        `propose_skills: could not count the dropped lines missing from the conversation, so unseen_missing_band is logged as -1; the verdict stands: ${errorMessage(error)}`,
      ),
      logError(error),
      -1
    );
  }
}
//@ chunk-2rkp9ne9.js:18767-19017 placement
function collectConversationLines(e) {
  let n = new Set();
  for (let r of e) {
    let s =
      r.type === "attachment"
        ? (r.rendered ?? []).map(({ content: content }) => content)
        : r.type === "user" || r.type === "assistant"
          ? [r.message.content]
          : [];
    for (let m of s.flatMap(contentToStrings))
      for (let h of V(m)) (n.add(h), n.add(stripLineNumberPrefix(h)));
  }
  return n;
}
/**
 * 把消息内容（字符串或内容块数组）提取为字符串列表。
 */
//@ chunk-2rkp9ne9.js:19017-19341 placement
function contentToStrings(e) {
  if (typeof e === "string") return [e];
  if (!Array.isArray(e)) return [];
  return e.flatMap((n) => {
    if (!bl(n)) return [];
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
var be = 1024,
  Xe = /[<\uFE64\uFF1C]/,
  Je = /[>\uFE65\uFF1E]/;
//@ chunk-2rkp9ne9.js:19521-19592 placement
function Ge(e) {
  let search = e.search(Xe);
  return search !== -1 && Je.test(e.slice(search + 2));
}
//@ chunk-2rkp9ne9.js:19592-19681 placement
var Qe = /^(\uFEFF?(?:[ \t]*\r?\n)*---[ \t]*\r?\n)([\s\S]*?)(?=\r?\n---[ \t]*(?:\r?\n|$))/;
//@ chunk-2rkp9ne9.js:19681-19840 placement
function hasSkillInstructions(e) {
  let match = Qe.exec(e);
  return (
    (match ? e.slice(match[0].length).replace(/^\r?\n---[^\n]*/, "") : e).trim() !== "" &&
    e.replace(/^---\n[\s\S]*?\n---\n+/, "").trim() !== ""
  );
}
/**
 * propose_skills 工具：从反复出现的流程中提出新技能或改进已有技能，交给用户在审核卡片上保存；只在远程 cowork/技能同步等环境启用；校验名称、描述与 SKILL.md，改进已有技能前要求先完整读过其 SKILL.md。
 */
//@ chunk-2rkp9ne9.js:19840-26874 placement
var MAX_SKILL_NAME_CHARS = 64,
  RESERVED_SKILL_NAME_WORDS = ["claude", "anthropic"],
  proposeSkillsInputSchema = DoctorLazy(() =>
    u({
      proposals: A(
        u({
          name: o()
            .min(1)
            .describe(
              'kebab-case skill slug; must not contain "claude" or "anthropic"; at most 64 characters for a new skill',
            ),
          kind: U(["new", "improvement"]),
          target: o()
            .optional()
            .describe(
              "Name of the existing skill to update. Required when kind is 'improvement'; omit for 'new'.",
            ),
          description: o()
            .max(be, {
              message: `description is longer than ${be} characters, the most a saved skill's description can hold. Call again with one short sentence saying when to use the skill.`,
            })
            .refine((e) => !Ge(e), {
              message:
                "description contains angle brackets (less-than and greater-than signs), which a saved skill's description cannot include. Call again with the same sentence reworded without them.",
            })
            .describe(
              "One short sentence saying when to use this skill: aim for under 200 characters, never more than 1024, and no angle brackets. Shown on the review card and saved as the skill's description, which is what decides when the skill is used. For an improvement, reuse the existing skill's description unless the change alters when the skill applies.",
            ),
          evidence: A(o()).optional().describe("memory file paths where this procedure was observed"),
          skillMd: o()
            .refine(hasSkillInstructions, {
              message:
                "skillMd has no instructions, so the review card cannot save it. Call again with the complete SKILL.md: its frontmatter between two lines of ---, then the instructions below it. If the user wants the skill deleted or emptied, do not propose it: tell them that they can delete one of their own skills themselves, from their list of skills on claude.ai.",
              params: { [MODEL_FACING_MESSAGE_KEY]: !0 },
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
  ),
  proposeSkillsOutputSchema = DoctorLazy(() =>
    u({ proposalCount: E().describe("Number of proposals shown on the review card") }),
  ),
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
      if (isSpawnedByClaudeCodeSession()) return !1;
      if (isCcsRemoteCowork()) return env.CLAUDE_CODE_SYNC_SKILLS && !getSkillsSyncVetoed();
      if (!isRemoteCowork() && !env.CLAUDE_CODE_SKILL_PROPOSALS) return !1;
      if (
        !env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE &&
        !(isCcsTenant() && env.CLAUDE_CODE_SKILL_PROPOSALS && env.CLAUDE_CODE_SYNC_SKILLS)
      )
        return !1;
      if (!env.CLAUDE_CODE_SKILL_PROPOSALS && env.CLAUDE_CODE_ENVIRONMENT_KIND !== void 0) return !1;
      if (env.CLAUDE_CODE_SKILL_PROPOSALS) return !getSkillsSyncVetoed();
      return env.CLAUDE_CODE_SYNC_SKILLS && !getSkillsSyncVetoed();
    },
    isConcurrencySafe() {
      return !0;
    },
    isReadOnly() {
      return !0;
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
      return $si;
    },
    async prompt() {
      return Fsi;
    },
    renderToolUseMessage(e) {
      let sliced = (e.proposals ?? []).filter((s) => s?.name).slice(0, 3);
      if (sliced.length === 0) return "";
      let mapped = sliced.map((s) => {
        let m = truncateWithNotice(gQe(s.name ?? ""), 80);
        return s.kind === "improvement" && s.target
          ? `${m} (improves ${truncateWithNotice(gQe(s.target), 80)})`
          : m;
      });
      return `Propose ${sliced.length} ${plural(sliced.length, "skill")}: ${mapped.join(", ")}`;
    },
    create(e) {
      return {
        async validateInput({ proposals: n }, r) {
          let s = [],
            m = createReadCheckState(),
            h = createProposalTargetCounts(),
            g = ne(),
            f = [];
          try {
            let _ = withNamedFolderYieldsRestored(await getCommands(getProjectRootOrNull(), e.storageV5)),
              filtered = n.filter((S) => {
                let y = collectProposalRefusals([S], _);
                if (y !== void 0) s.push(y);
                return y === void 0;
              }),
              I = [..._, ...iqs()],
              L = resolveProposalTargets(filtered, I, h),
              b = collectEarlierProposals(L, e, I),
              w = onceExport(() => collectConversationLinesSafe(e.messages));
            if (isDiskless()) await resolveSkillProposals(m, filtered, L, e.messages(), r.signal, g, b, f);
            for (let S of L) {
              let y = getSkillFileForReadCheck(S.skill);
              if (y === void 0 || !isSkillReadIncomplete(e.readFileState.get(y.path), y.contentLength, r))
                continue;
              let B = evaluateKeptLines({
                checkKind: S.kind,
                status: "unread",
                current: S.skill.getLoadedSkillMd?.(),
                proposal: S,
                sawOtherBytes: !1,
                lastShownProposal: b.get(S.skill),
                heldLines: w,
                keepPercent: g,
              });
              if ((f.push(B), B.verdict !== "kept")) recordUnreadOrStaleTarget(m, S, y.path, "unread");
            }
          } catch (error) {
            if (
              (logForDebugging(`propose_skills: skipping input checks: ${errorMessage(error)}`), isDiskless())
            )
              s.push(
                "The proposal could not be checked against the user's skills. Call again once; if it still cannot be checked, tell the user it cannot be shown now.",
              );
            if (s.length === 0) return { result: !0 };
            return (
              logEvent("tengu_propose_skills_read_check", { ...h, failed: !0 }),
              { result: !1, message: s.join(" "), errorCode: 2 }
            );
          }
          let k = [...s, ...buildReadCheckMessages(m)];
          if (k.length === 0) {
            if (isDiskless()) logKeptLinesEvents(f, "validate");
            return { result: !0 };
          }
          return (
            logEvent("tengu_propose_skills_read_check", {
              ...h,
              updates_refused: m.refusedUpdates.size,
              new_proposals_refused: m.refusedNewNames.size,
            }),
            logKeptLinesEvents(f, "validate"),
            {
              result: !1,
              message: k.join(" "),
              errorCode: s.length > 0 ? 2 : m.refusedNewNames.size > 0 ? 3 : 1,
            }
          );
        },
        async call({ proposals: n }, r) {
          let s = createReadCheckState(),
            m = createProposalTargetCounts(),
            h = ne(),
            g = [];
          try {
            let k = withNamedFolderYieldsRestored(await getCommands(getProjectRootOrNull(), e.storageV5)),
              _ = resolveProposalTargets(n, k, m),
              P = collectEarlierProposals(isDiskless() ? [] : _, e, k),
              I = onceExport(() => collectConversationLinesSafe(e.messages)),
              results = await Promise.all(_.map((b) => lt(b.skill, e.storageV5, r.signal)));
            for (let [b, w] of _.entries()) {
              if (isDiskless()) continue;
              let S = results[b];
              if (S === void 0) {
                m.skill_checks_without_a_file_to_read++;
                continue;
              }
              let y = e.readFileState.get(S.path),
                B = await readSkillFileWhole(S.path),
                K = B?.whole,
                T,
                N = (D) => (T ??= isFileModifiedSince(S.path, D)),
                x = await classifySkillReadStatus(y, S.contentLength, r, B, N),
                R = evaluateKeptLines({
                  checkKind: w.kind,
                  status: x,
                  current: K,
                  proposal: w,
                  sawOtherBytes:
                    x === "unread" &&
                    K !== void 0 &&
                    y !== void 0 &&
                    !y.contentNotInModelContext &&
                    (await N(y)),
                  lastShownProposal: P.get(w.skill),
                  heldLines: I,
                  keepPercent: h,
                });
              if ((g.push(R), R.verdict === "unread" || R.verdict === "stale"))
                recordUnreadOrStaleTarget(s, w, S.path, R.verdict);
            }
            ((m.updates_refused = s.refusedUpdates.size), (m.new_proposals_refused = s.refusedNewNames.size));
          } catch (error) {
            (logError(error), (m.failed = !0), Object.assign(s, createReadCheckState()), (g.length = 0));
          }
          (logEvent("tengu_propose_skills_read_check", m), logKeptLinesEvents(g, "call"));
          let f = buildReadCheckMessages(s);
          if (f.length > 0)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `<tool_use_error>${f.join(" ")}</tool_use_error>`,
              "propose_skills: the read check refused the proposal",
              "skill_read_check_refused",
            );
          return (
            logEvent("tengu_propose_skills", {
              proposal_count: n.length,
              improvement_count: count(n, (k) => k.kind === "improvement"),
            }),
            { data: { proposalCount: n.length } }
          );
        },
      };
    },
    mapToolResultToToolResultBlockParam({ proposalCount: e }, n) {
      let r = isClaudeAiChatCowork()
        ? " The card renders at this point in your reply and anything you write next appears below it, so refer to it as the card above."
        : "";
      return {
        tool_use_id: n,
        type: "tool_result",
        content: `Shown ${e} skill proposal(s) to the user for review.${r} Continue with the next phase; do not wait for them to respond.`,
      };
    },
  });
//@ chunk-2rkp9ne9.js:26874-26925 placement
function q(e) {
  return e.slice(e.lastIndexOf(":") + 1);
}
//@ chunk-2rkp9ne9.js:26925-27014 placement = getValueFromInput (1)
function getValueFromInput_2(e, n) {
  return n.some(
    (r) =>
      r.type === "prompt" &&
      isSyncedSkill(r) &&
      (M(r) === e || stripSyncedSkillPrefix(getCommandName(r)) === e),
  );
}
//@ chunk-2rkp9ne9.js:27014-27061 placement = ADMIN_TRUSTED_SOURCES (0.758)
var ADMIN_TRUSTED_SOURCES = new Set(["plugin", "bundled", "builtin"]);
/**
 * 查找用户自己上传的、与目标名匹配的插件技能。
 */
//@ chunk-2rkp9ne9.js:27061-27377 placement
function findOwnUploadedPluginSkills(e, n) {
  if (!B2()) return [];
  let r = stripSkillNamespacePrefix(e),
    lower = r.trim().toLowerCase();
  return n.flatMap((m) =>
    m.type === "prompt" &&
    m.source === "plugin" &&
    m.loadedFrom === "plugin" &&
    m.pluginInfo?.marketplaceKind === "account_uploads" &&
    marketplaceSuffix(m.pluginInfo.repository) === SYNCED &&
    (m.name.toLowerCase() === lower || skillNameMatches(m.aliases?.[0] ?? q(m.name), r, !0))
      ? [m]
      : [],
  );
}
//@ chunk-2rkp9ne9.js:27377-27505 placement
function isStaleSyncedPluginSkill(e) {
  if (e.pluginSource === void 0 || !hasRegisteredSyncedPluginDirs()) return !1;
  let n = resolve(e.pluginSource.pluginPath);
  return !getSyncedPluginDirs().some((r) => resolve(r) === n);
}
/**
 * 生成拒绝更新非用户自有技能的说明，建议改为以新名字提议 new 类型。
 */
//@ chunk-2rkp9ne9.js:27505-27805 placement
function notOwnSkillRefusal(e, n, r, s) {
  let m = n === e ? "" : ` (${n})`;
  return `${e}${m} is ${r}, not one of the user's own skills, so the review card cannot update it. To customize it for the user, propose kind "new" under a name of its own \u2014 not ${s} \u2014 with a description that says when to use it instead of ${n}.`;
}
/**
 * 为每个提议生成拒绝理由：改进的目标是插件交付的自有技能（无盘会话不能更新、副本过期）、内置/组织/共享技能（应改提新技能）；新技能名与自有技能或插件技能重名等。
 */
//@ chunk-2rkp9ne9.js:27805-29840 placement
function collectProposalRefusals(proposals, commands) {
  let refusals = [];
  for (let proposal of proposals)
    if (proposal.kind === "improvement" && proposal.target) {
      let m = findOwnUploadedPluginSkills(proposal.target, commands),
        h = m.find(isStaleSyncedPluginSkill) ?? m[0];
      if (h !== void 0) {
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
      let g = findNotOwnedSkill(proposal.target, commands);
      if (g !== void 0) {
        refusals.push(notOwnSkillRefusal(proposal.target, g.skill.name, g.whose, M(g.skill)));
        continue;
      }
      let f = findCommand(proposal.target, commands);
      if (
        f?.type !== "prompt" ||
        (!isHostCatalogSkill(f) &&
          (f.loadedFrom === "syncedSkills" || !ADMIN_TRUSTED_SOURCES.has(f.source))) ||
        getValueFromInput_2(q(proposal.target), commands)
      )
        continue;
      refusals.push(
        notOwnSkillRefusal(
          proposal.target,
          f.name,
          f.source === "plugin" ? "a plugin's skill" : "built in",
          f.source === "plugin" ? (f.aliases?.[0] ?? q(f.name)) : (f.unqualifiedName ?? f.name),
        ),
      );
    } else if (proposal.kind === "new") {
      let m = findOwnUploadedPluginSkills(proposal.name, commands)[0];
      if (m !== void 0) {
        refusals.push(
          isDiskless()
            ? `${proposal.name} is the name of ${m.name}, one of the user's own skills, delivered as a plugin, which cannot be updated from this session; a new skill saved under it would replace that skill. Propose this under a name of its own, or tell the user.`
            : `${proposal.name} is the name of ${m.name}, one of the user's own skills, so a new skill saved under it would replace that skill. To change it, read its SKILL.md and propose kind "improvement" with target ${m.name}; otherwise propose this under a name of its own.`,
        );
        continue;
      }
      let h = findCommand(proposal.name, commands);
      if (h?.type !== "prompt" || h.source !== "plugin" || getValueFromInput_2(q(proposal.name), commands))
        continue;
      let g =
        h.name === proposal.name
          ? "the name of a plugin skill in this session"
          : `the name the plugin skill ${h.name} already answers to`;
      refusals.push(
        `${proposal.name} is ${g}, so a new skill saved under it would compete with that skill for the name. Propose it under a name of its own, with a description that says when to use it instead of ${h.name}.`,
      );
    }
  return refusals.length === 0 ? void 0 : refusals.join(" ");
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
    failed: !1,
  };
}
/**
 * 把提议展开为要检查的目标：improvement 按目标名找到已有技能（含用户上传的插件技能），new 找到会被同名覆盖的自有/未知技能；同时累计各类目标计数。
 */
//@ chunk-2rkp9ne9.js:30249-31025 placement
function resolveProposalTargets(proposals, n, r) {
  return proposals.flatMap((s) => {
    let { skillMd: skillMd, description: description } = s;
    if (s.kind === "improvement" && s.target) {
      let target = s.target,
        k = findSkillsByName(target, n),
        _ = findOwnUploadedPluginSkills(target, n),
        I = [
          ...k.skills.filter(
            (skill) =>
              skill.hiddenBehindPlugin?.replacement === void 0 ||
              skill.hiddenBehindPlugin.heldBack ||
              !_.some((b) => b.name === skill.hiddenBehindPlugin?.replacement),
          ),
          ..._,
        ];
      if ((r.update_targets++, _.length > 0)) r.update_targets_own_plugin_skill++;
      else if (k.skills.length === 0) r.update_targets_matching_no_account_skill++;
      else if (!k.foundByLookup) r.update_targets_found_by_name_only++;
      return I.map((L) => ({
        kind: "update",
        written: target,
        skill: L,
        skillMd: skillMd,
        description: description,
      }));
    }
    let g = [...findOwnSkillsByName(s.name, n), ...findOwnUploadedPluginSkills(s.name, n)];
    if (g.length > 0) r.new_names_matching_an_own_or_unknown_skill++;
    return g.map((f) => ({
      kind: "new",
      written: s.name,
      skill: f,
      skillMd: skillMd,
      description: description,
    }));
  });
}
/**
 * 从会话消息中收集先前对同名技能的提议，供比较与去重。
 */
//@ chunk-2rkp9ne9.js:31025-31838 placement
function collectEarlierProposals(e, n, r) {
  let s = new Map();
  if (e.length === 0) return s;
  try {
    let messages = n.messages(),
      h = new Set(
        messages
          .flatMap((f) =>
            f.type === "user" && typeof f.message.content !== "string" ? f.message.content : [],
          )
          .flatMap((f) => (bl(f) && f.type === "tool_result" && f.is_error !== !0 ? [f.tool_use_id] : [])),
      ),
      flattened = messages.flatMap((f, k) =>
        f.type === "assistant" && Array.isArray(f.message.content)
          ? f.message.content.map((_) => ({ block: _, isFromThisTurn: k >= n.turnStartIndex }))
          : [],
      );
    for (let { block: block, isFromThisTurn: isFromThisTurn } of flattened) {
      if (!bl(block) || block.type !== "tool_use" || block.name !== PROPOSE_SKILLS || !h.has(block.id))
        continue;
      let safeParse = proposeSkillsInputSchema().safeParse(block.input),
        P = safeParse.success ? safeParse.data.proposals : [];
      for (let I of resolveProposalTargets(P, r, createProposalTargetCounts())) {
        let { skillMd: skillMd, description: description } = I;
        s.set(I.skill, { skillMd: skillMd, description: description, isFromThisTurn: isFromThisTurn });
      }
    }
  } catch (error) {
    (logForDebugging(
      `propose_skills: earlier proposals not looked up, so none counts: ${errorMessage(error)}`,
    ),
      logError(error),
      s.clear());
  }
  return s;
}
//@ chunk-2rkp9ne9.js:31838-32026 placement
function collectConversationLinesSafe(e) {
  try {
    return collectConversationLines(e());
  } catch (error) {
    (logForDebugging(
      `propose_skills: could not read the conversation, so unseen_missing_band is logged as -1; the read check is unaffected: ${errorMessage(error)}`,
    ),
      logError(error));
    return;
  }
}
/**
 * 记录未读完或磁盘已更新的目标技能：分别记入被拒更新或被拒新名，并生成原因。
 */
//@ chunk-2rkp9ne9.js:32026-32668 placement
function recordUnreadOrStaleTarget(state, outcome, r, s) {
  if (outcome.kind === "update") {
    (state.refusedUpdates.add(outcome.written), state[s].push(`${outcome.written} (${r})`));
    return;
  }
  state.refusedNewNames.add(outcome.written);
  let m = s === "unread" ? "has not been read in full yet" : "on disk is newer than the copy read";
  state.replacedByNew.push(
    `The new proposal ${outcome.written} would be saved under the name of the listed skill ${outcome.skill.name} (${r}), whose SKILL.md ${m}. If that skill is the user's own, saving this proposal replaces its SKILL.md entirely. Read that whole file ${s === "unread" ? "first" : "again"}, then call again with a complete SKILL.md that keeps everything worth keeping, or call again under a different name.`,
  );
}
//@ chunk-2rkp9ne9.js:32668-32770 placement
var MAX_SKILL_TEXT_CHARS = 50000,
  NEW_SKILL_NAME_HINT = "Tell the user; propose it as a new skill under another name only if they want that.";
//@ chunk-2rkp9ne9.js:32770-35187 placement
async function resolveSkillProposals(e, n, r, s, m, h, g, f) {
  let k = new Set(r.flatMap((w) => (w.kind === "update" ? [w.written] : [])));
  for (let { kind: kind, target: target } of n)
    if (kind === "improvement" && target && !k.has(target))
      (e.refusedUpdates.add(target),
        e.keptElsewhere.push(
          `${gQe(t4e(target))} is not among the user's skills that this session lists right now, so it cannot be updated yet. Call again once; if it is still not listed, tell the user, and propose it as a new skill under another name only if they want that.`,
        ));
  let _ = uniq(r.map((w) => M(w.skill))),
    P = new Map(await Promise.all(_.map(async (w) => [w, await it(w, m)]))),
    I = conversationToolResultsInclude(s, CURRENT_SKILL_MD_OPEN_TAG),
    L = new Set(),
    b = 0;
  for (let w of r) {
    let S = M(w.skill),
      y = P.get(S),
      B = y === void 0 ? void 0 : formatCurrentSkillMd(y),
      K = B !== void 0 && conversationToolResultsInclude(s, B),
      T = evaluateKeptLines({
        checkKind: w.kind,
        status: K ? "read" : "unread",
        current: !K && v3n(S) ? void 0 : y,
        proposal: w,
        sawOtherBytes: !K && I,
        lastShownProposal: g.get(w.skill),
        heldLines: void 0,
        keepPercent: h,
      });
    if ((f.push(T), T.verdict !== "unread")) continue;
    let N = w.kind === "update";
    (N ? e.refusedUpdates : e.refusedNewNames).add(w.written);
    let x = gQe(t4e(w.written)),
      R = N
        ? `${x} cannot be updated yet: its current SKILL.md`
        : `The new proposal ${x} would be saved under the name of the listed skill ${w.skill.name}, replacing its SKILL.md entirely if that skill is the user's own, and that SKILL.md`,
      D = N ? "propose it as a new skill under another name" : "call again under a different name";
    if (v3n(S))
      e.keptElsewhere.push(
        N
          ? `${x} cannot be updated from here: the skill is switched off for this session. ${NEW_SKILL_NAME_HINT}`
          : `${R} cannot be read: that skill is switched off for this session. Instead, ${D}.`,
      );
    else if (B === void 0)
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
    else
      (L.add(S),
        (b += B.length),
        e.keptElsewhere.push(
          `${R} is not in this conversation. A saved proposal replaces the whole file, so here it is, each line after its number and a tab, which are not part of the file; call again with a complete SKILL.md that keeps everything worth keeping, or ${D}.${B}`,
        ));
  }
}
/**
 * <current_skill_md> 开标签。
 */
//@ chunk-2rkp9ne9.js:35187-35217 placement
var CURRENT_SKILL_MD_OPEN_TAG = `
<current_skill_md>
`;
/**
 * 把 SKILL.md 内容加行号并包进 <current_skill_md> 标签（技能同步提示用；归属疑似错误）。
 */
//@ chunk-2rkp9ne9.js:35217-35311 placement = getSnippetForPatch (0.297)
function formatCurrentSkillMd(e) {
  let formattedSnippet = addLineNumbers({ content: t4e(e), startLine: 1 });
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
          bl(s) &&
          s.type === "tool_result" &&
          (typeof s.content === "string"
            ? indexOfKmp(s.content, n, 0) !== -1
            : Array.isArray(s.content) &&
              s.content.some(
                (m) =>
                  bl(m) && m.type === "text" && typeof m.text === "string" && indexOfKmp(m.text, n, 0) !== -1,
              )),
      ),
  );
}
//@ chunk-2rkp9ne9.js:35634-35721 placement
async function it(e, n) {
  return (
    await raceWithAbortSignal(startPendingDownload(e), n, () => new AbortError()).catch(() => {
      return;
    }),
    tqs(e)
  );
}
/**
 * 根据未读、过期、保存在别处等检查结果组装给模型的提示消息。
 */
//@ chunk-2rkp9ne9.js:35721-36249 placement
function buildReadCheckMessages({
  unread: unread,
  stale: stale,
  keptElsewhere: keptElsewhere,
  replacedByNew: replacedByNew,
}) {
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
    return e.pluginSource === void 0
      ? void 0
      : { path: expandPath(e.pluginSource.filePath), contentLength: e.contentLength };
  if (!e.skillRoot || isSyncedSkillPlaceholder(e)) return;
  return { path: expandPath(join(e.skillRoot, "SKILL.md")), contentLength: e.contentLength };
}
//@ chunk-2rkp9ne9.js:36513-36525 placement
var at = 5000;
//@ chunk-2rkp9ne9.js:36525-36809 placement
async function lt(e, n, r) {
  if (!e.skillRoot || !isSyncedSkillPlaceholder(e)) return getSkillFileForReadCheck(e);
  let s = M(e);
  if (nqs(s)) return;
  if (
    !(
      await withDeadline(
        raceWithAbortSignal(startPendingDownload(s), r, () => new AbortError()),
        at,
      ).catch(() => {
        return;
      })
    )?.ok
  )
    return;
  let found = (await getCommands(getProjectRootOrNull(), n)).find(
    (f) => f.type === "prompt" && isSyncedSkill(f) && M(f) === s && !isSyncedSkillPlaceholder(f),
  );
  return found?.type === "prompt" ? getSkillFileForReadCheck(found) : void 0;
}
//@ chunk-2rkp9ne9.js:36809-37052 placement
function isSkillReadIncomplete(e, n, r) {
  if (e === void 0 || e.contentNotInModelContext || e.isPartialView) return !0;
  if ((e.offset ?? 1) <= 1) return !1;
  let s = getDefaultFileReadingLimits(),
    m = r.fileReadingLimits?.maxTokens ?? s.maxTokens,
    h = r.fileReadingLimits?.maxSizeBytes ?? s.maxSizeBytes;
  return n <= m && n <= h;
}
/**
 * 判断技能文件的读取状态：未读、已读或已过期（磁盘内容比读到的新）。
 */
//@ chunk-2rkp9ne9.js:37052-37418 placement
async function classifySkillReadStatus(e, n, r, s, m) {
  if (e === void 0 || isSkillReadIncomplete(e, n, r)) return "unread";
  if ((e.offset ?? 1) > 1) return (await m(e)) ? "stale" : "read";
  let h = await m(e),
    g = s?.whole === void 0 ? void 0 : __(s.whole),
    f = g !== void 0 && y1(e, g);
  if (isFullFileView(e)) {
    if (!h) return "read";
    return s === void 0 || f ? "read" : "stale";
  }
  if (f) return "read";
  let k =
    g !== void 0 &&
    e.limit !== void 0 &&
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
async function isFileModifiedSince(e, n) {
  try {
    return (await getFileModificationTimeAsync(e)) > n.timestamp;
  } catch (error) {
    return (logForDebugging(`propose_skills: cannot stat ${e}: ${errorMessage(error)}`), !1);
  }
}
//@ chunk-2rkp9ne9.js:37543-37737 placement
async function readSkillFileWhole(e) {
  try {
    let fileBytes = await getFsImplementation().readFileBytes(e, By + 1);
    return { whole: fileBytes.length === 0 || fileBytes.length > By ? void 0 : fileBytes.toString("utf8") };
  } catch (error) {
    logForDebugging(`propose_skills: cannot read ${e}: ${errorMessage(error)}`);
    return;
  }
}
//@ chunk-3e7edr38.js:231-1609 placement
var PROPOSE_SKILLS = "propose_skills",
  $si = "Show the user a review card of proposed skills to save \u2014 render-only, nothing is written",
  Fsi = `Surface recurring multi-step procedures from this session as skill proposals. Render-only \u2014 calling this shows a review card in the conversation; it does not write any files or create the skill. The user reviews and saves from the card. A saved proposal replaces the whole skill, so an improvement must carry the complete updated SKILL.md, never a partial edit.

Call once with all proposals (max 3). Use it when the user asks to turn a workflow or procedure into a skill, or when the same multi-step procedure has recurred and a skill would clearly save future work. Do not call it for one-off tasks, and do not re-propose skills the user has already seen.

An improvement can only update one of the user's own skills, including one of theirs that this session lists as a plugin skill because they uploaded it to claude.ai; the tool tells you when a target is not theirs. Another plugin's skill or a built-in one can't be updated from the card. To customize one of those with this tool, propose it as a new skill under a name of its own \u2014 not the original's name, even without its plugin prefix \u2014 with a description that says when to use it instead of the original: both stay listed, and the description decides which one is used.`;

export { PROPOSE_SKILLS };
