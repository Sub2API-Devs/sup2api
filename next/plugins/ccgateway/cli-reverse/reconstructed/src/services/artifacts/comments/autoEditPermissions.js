/**
 * services/artifacts/comments/autoEditPermissions.ts
 *
 * 2.1.316 新增：自动编辑的写权限判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0df0kb9z.js (10)
 * attribution: placement 11
 */
import {
  stripBomAndCarriageReturn,
  isFullFileView,
  matchesContentHash,
} from "../../../utils/remoteFileState.js";
import {
  MUSICAL_SYMBOL_RE,
  HTML_ESCAPE_RE,
  NAMED_ENTITY_MAP,
  INVALID_CODE_POINT,
  SIMPLE_ESCAPE_MAP,
  LEFT_ANGLE_VARIANTS_RE,
  RIGHT_ANGLE_VARIANTS_RE,
  TEXT_ESCAPE_RE,
} from "./autoEditPatch.js";
import { foldConfusableCharacters } from "../../../utils/confusables.js";
import {
  getDenyRuleForTool,
  findAskRuleForTool,
  toolAlwaysAllowedRule,
} from "../../../utils/permissions/permissions.js";
import { FileEditTool } from "../../../tools/FileEditTool/FileEditTool.js";
import { walkPermissionCheckPaths } from "../../../utils/fsOperations.js";
import {
  leafSymlinkWriteRefusal,
  checkWritePermissionForTool,
  checkReadPermissionForTool,
} from "../../../utils/permissions/filesystem.js";
import { ARTIFACT_TOOL_NAME } from "../../../tools/ArtifactTool/constants.js";
import { FileReadTool } from "../../../tools/FileReadTool/FileReadTool.js";
import { getLiveState } from "../../liveReplica/liveReplica.js";

//@ chunk-0df0kb9z.js:28070-28384 placement
function applyFindReplaceEdits(text, edits) {
  let current = text;
  let applied = [];
  for (let edit of edits) {
    let { find, replace } = edit;
    if (
      replace === "" &&
      !find.endsWith(`
`) &&
      current.includes(
        find +
          `
`,
      )
    ) {
      find += `
`;
      replace = `
`;
    }
    if (find === replace) continue;
    let index = current.indexOf(find);
    if (index === -1 || current.indexOf(find, index + 1) !== -1) return;
    current = current.slice(0, index) + replace + current.slice(index + find.length);
    applied.push({
      oldString: find,
      newString: replace,
    });
  }
  return applied.length === 0 || current === text ? undefined : applied;
}
//@ chunk-0df0kb9z.js:28384-28593 placement
/**
 * 把自动编辑读到的文件内容写进文件读取状态（标记不在模型上下文中）；已有同内容且更新的记录时不覆盖。
 */
function recordAutoEditRead(readFileState, path, content, mtimeMs) {
  let stripped = stripBomAndCarriageReturn(content);
  let existing = readFileState.get(path);
  if (
    existing !== undefined &&
    isFullFileView(existing) &&
    matchesContentHash(existing, stripped) &&
    Math.floor(mtimeMs) <= existing.timestamp
  )
    return;
  readFileState.set(path, {
    content: stripped,
    timestamp: Math.floor(mtimeMs),
    offset: undefined,
    limit: undefined,
    contentNotInModelContext: true,
  });
}
//@ chunk-0df0kb9z.js:28884-28980 placement
function decodeMusicalSymbols(text) {
  return text.replace(MUSICAL_SYMBOL_RE, (symbol) =>
    String.fromCodePoint((symbol.codePointAt(0) ?? 917536) - 917504),
  );
}
//@ chunk-0df0kb9z.js:28980-29799 placement
function decodeHtmlEscapes(text) {
  if (!text.includes("&") && !text.includes("\\") && !text.includes("%")) return text;
  return text.replace(HTML_ESCAPE_RE, (full, named, dec, hex, name1, name2, ...namedGroups) => {
    let entity = name1 ?? name2;
    if (entity !== undefined) {
      let mapped = NAMED_ENTITY_MAP.get(entity.toLowerCase());
      if (mapped !== undefined) return mapped;
      let legacy = /^(?:amp|lt|gt|laquo|raquo)/i.exec(entity)?.[0];
      return legacy === undefined
        ? INVALID_CODE_POINT
        : (NAMED_ENTITY_MAP.get(legacy.toLowerCase()) ?? "") + entity.slice(legacy.length) + ";";
    }
    let [group1, group2, group3, group4, group5, group6, group7, group8, group9, group10, group11, group12] =
      namedGroups.slice(0, 12).map((group) => (typeof group === "string" ? group : undefined));
    let codepoint = namedGroups[12];
    if (
      typeof codepoint === "number" &&
      !/[;\s]$/.test(full) &&
      (dec ?? hex ?? group7 ?? group8 ?? group11) !== undefined &&
      isConfusableHexDigit(text, codepoint + full.length, dec !== undefined)
    )
      return full;
    if (group1 !== undefined && group2 !== undefined)
      return String.fromCharCode(parseInt(group1, 16), parseInt(group2, 16));
    if (group9 !== undefined) return SIMPLE_ESCAPE_MAP.get(group9) ?? group9;
    if (group12 !== undefined) return safeDecodeURIComponent(group12);
    let decoded = named ?? hex ?? group3 ?? group4 ?? group5 ?? group6 ?? group7 ?? group11;
    let out =
      dec !== undefined
        ? parseInt(dec, 10)
        : group8 !== undefined
          ? parseInt(group8, 8)
          : decoded !== undefined
            ? parseInt(decoded, 16)
            : undefined;
    if (out === undefined) return group10 ?? "";
    return codePointToString(out);
  });
}
//@ chunk-0df0kb9z.js:29799-29947 placement
function isConfusableHexDigit(text, index, codePoint) {
  let codePoint_2 = text.codePointAt(index);
  if (codePoint_2 === undefined || codePoint_2 < 128) return false;
  let folded = foldConfusableCharacters(String.fromCodePoint(codePoint_2));
  return (codePoint ? /^[0-9]$/ : /^[0-9a-f]$/i).test(folded);
}
//@ chunk-0df0kb9z.js:29947-30027 placement
function codePointToString(cp) {
  return cp <= 1114111 && (cp < 55296 || cp > 57343) ? String.fromCodePoint(cp) : INVALID_CODE_POINT;
}
//@ chunk-0df0kb9z.js:30027-30164 placement
function safeDecodeURIComponent(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text.replace(/%([0-9a-fA-F]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
}
//@ chunk-0df0kb9z.js:30164-30396 placement
function matchesTagPattern(text, pattern, opener) {
  let unescaped = text.includes("\\") ? text.replaceAll("\\", " ") : text;
  let replaced = unescaped.replace(LEFT_ANGLE_VARIANTS_RE, "<").replace(RIGHT_ANGLE_VARIANTS_RE, ">");
  let replaced_2 = replaced.replace(TEXT_ESCAPE_RE, "l");
  let candidates = [unescaped];
  if (replaced !== unescaped) candidates.push(replaced);
  if (replaced_2 !== replaced) candidates.push(replaced_2);
  return candidates.some((line) => line.search(pattern) !== -1 || opener.openerOffsets(line).length > 0);
}
//@ chunk-0df0kb9z.js:30396-30879 placement
function getEditPermissionVerdict(path, context) {
  if (context.mode === "plan") return "would_ask";
  if (
    getDenyRuleForTool(context, FileEditTool) !== null ||
    findAskRuleForTool(context, FileEditTool) !== null
  )
    return "would_ask";
  let input = {
    file_path: path,
    old_string: "a",
    new_string: "b",
    replace_all: false,
  };
  let paths = walkPermissionCheckPaths(path);
  if (leafSymlinkWriteRefusal(path, paths) !== null) return "would_ask";
  let verdict = checkWritePermissionForTool(FileEditTool, input, context, paths);
  if (verdict.behavior === "allow") return "allowed";
  if (verdict.behavior !== "ask") return "would_ask";
  let reasonType = verdict.decisionReason?.type;
  if (reasonType === "rule" || reasonType === "safetyCheck" || reasonType === "mode") return "would_ask";
  return context.mode === "bypassPermissions" || toolAlwaysAllowedRule(context, FileEditTool) !== null
    ? "allowed"
    : "would_ask";
}
//@ chunk-0df0kb9z.js:30879-31397 placement
function canWriteWithoutPrompt(path, slug, context) {
  if (context.mode === "plan") return false;
  let toolRef = {
    name: ARTIFACT_TOOL_NAME,
  };
  if (getDenyRuleForTool(context, toolRef) !== null || findAskRuleForTool(context, toolRef) !== null)
    return false;
  if (
    getDenyRuleForTool(context, FileReadTool) !== null ||
    findAskRuleForTool(context, FileReadTool) !== null
  )
    return false;
  let verdict = checkReadPermissionForTool(
    FileReadTool,
    {
      file_path: path,
    },
    context,
  );
  if (verdict.behavior === "deny") return false;
  if (verdict.behavior === "ask" && verdict.decisionReason?.type === "rule") return false;
  if (verdict.behavior !== "allow" && context.mode !== "bypassPermissions") return false;
  let liveState = getLiveState();
  if (liveState.routineRepublishedPaths.has(path) || liveState.commentRepublishedPaths.has(path))
    return false;
  let share = liveState.shareStatus.bySlug.get(slug);
  return share === undefined || (!share.isSharedLive && share.probeFailed !== true);
}
export {
  getEditPermissionVerdict,
  canWriteWithoutPrompt,
  applyFindReplaceEdits,
  recordAutoEditRead,
  matchesTagPattern,
  decodeMusicalSymbols,
  decodeHtmlEscapes,
};
