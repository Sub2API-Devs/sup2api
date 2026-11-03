/**
 * services/artifacts/comments/autoEditPermissions.ts
 *
 * 2.1.316 新增：自动编辑的写权限判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-eavynfj6.js (11)
 * attribution: placement 11
 */
import { __, isFullFileView, y1 } from "../../../utils/remoteFileState.js";
import { Re, K, Ee, Pe, we, Be, Se, regExp, V, re, ve, Ie, Me, Le } from "./autoEditPatch.js";
import {
  confusableTagScrubPattern,
  createTagNeutralizer,
  foldConfusableCharacters,
} from "../../../utils/confusables.js";
import { stripCombiningRepeated } from "../../../utils/sanitization.js";
import {
  getDenyRuleForTool,
  getAskRuleForTool,
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

//@ chunk-eavynfj6.js:26912-27226 placement
function applyFindReplaceEdits(e, t) {
  let o = e,
    n = [];
  for (let i of t) {
    let { find: find, replace: replace } = i;
    if (
      replace === "" &&
      !find.endsWith(`
`) &&
      o.includes(
        find +
          `
`,
      )
    )
      ((find += `
`),
        (replace = `
`));
    if (find === replace) continue;
    let index = o.indexOf(find);
    if (index === -1 || o.indexOf(find, index + 1) !== -1) return;
    ((o = o.slice(0, index) + replace + o.slice(index + find.length)),
      n.push({ oldString: find, newString: replace }));
  }
  return n.length === 0 || o === e ? void 0 : n;
}
/**
 * 把自动编辑读到的文件内容写进文件读取状态（标记不在模型上下文中）；已有同内容且更新的记录时不覆盖。
 */
//@ chunk-eavynfj6.js:27226-27435 placement
function recordAutoEditRead(e, t, o, n) {
  let i = __(o),
    r = e.get(t);
  if (r !== void 0 && isFullFileView(r) && y1(r, i) && Math.floor(n) <= r.timestamp) return;
  e.set(t, {
    content: i,
    timestamp: Math.floor(n),
    offset: void 0,
    limit: void 0,
    contentNotInModelContext: !0,
  });
}
/**
 * 判断文本里是否藏有 harness 标签：逐轮尝试反斜杠/尖括号同形字替换、HTML 转义解码、去组合字符与同形字折叠后检测，超过轮数或膨胀过大时保守地返回结果。
 */
//@ chunk-eavynfj6.js:27435-27726 placement
function containsHarnessTags(e) {
  let t = (Re ??= confusableTagScrubPattern(K, () => Ee)),
    o = (Pe ??= createTagNeutralizer([{ tags: K, tail: ({ name: i }) => `[-_]*(?![${i}])` }])),
    n = e;
  for (let i = 0; ; i++) {
    if (matchesTagPattern(n, t, o)) return !0;
    if (i === we) return !1;
    let r = Z(decodeHtmlEscapes(Z(n)));
    if (r !== n && matchesTagPattern(r, t, o)) return !0;
    let s = foldConfusableCharacters(stripCombiningRepeated(r).replace(Be, ""));
    if (s === n) return !1;
    if (s.length > 2 * e.length) return !0;
    n = s;
  }
}
//@ chunk-eavynfj6.js:27726-27822 placement
function Z(e) {
  return e.replace(Se, (t) => String.fromCodePoint((t.codePointAt(0) ?? 917536) - 917504));
}
//@ chunk-eavynfj6.js:27822-28641 placement
function decodeHtmlEscapes(e) {
  if (!e.includes("&") && !e.includes("\\") && !e.includes("%")) return e;
  return e.replace(regExp, (t, o, n, i, r, s, ...l) => {
    let f = r ?? s;
    if (f !== void 0) {
      let E = V.get(f.toLowerCase());
      if (E !== void 0) return E;
      let b = /^(?:amp|lt|gt|laquo|raquo)/i.exec(f)?.[0];
      return b === void 0 ? re : (V.get(b.toLowerCase()) ?? "") + f.slice(b.length) + ";";
    }
    let [a, u, d, h, A, y, p, C, x, _, c, m] = l
        .slice(0, 12)
        .map((E) => (typeof E === "string" ? E : void 0)),
      k = l[12];
    if (
      typeof k === "number" &&
      !/[;\s]$/.test(t) &&
      (n ?? i ?? p ?? C ?? c) !== void 0 &&
      isConfusableHexDigit(e, k + t.length, n !== void 0)
    )
      return t;
    if (a !== void 0 && u !== void 0) return String.fromCharCode(parseInt(a, 16), parseInt(u, 16));
    if (x !== void 0) return ve.get(x) ?? x;
    if (m !== void 0) return safeDecodeURIComponent(m);
    let g = o ?? i ?? d ?? h ?? A ?? y ?? p ?? c,
      w =
        n !== void 0
          ? parseInt(n, 10)
          : C !== void 0
            ? parseInt(C, 8)
            : g !== void 0
              ? parseInt(g, 16)
              : void 0;
    if (w === void 0) return _ ?? "";
    return Ye(w);
  });
}
//@ chunk-eavynfj6.js:28641-28789 placement
function isConfusableHexDigit(e, t, o) {
  let codePoint = e.codePointAt(t);
  if (codePoint === void 0 || codePoint < 128) return !1;
  let i = foldConfusableCharacters(String.fromCodePoint(codePoint));
  return (o ? /^[0-9]$/ : /^[0-9a-f]$/i).test(i);
}
//@ chunk-eavynfj6.js:28789-28869 placement
function Ye(e) {
  return e <= 1114111 && (e < 55296 || e > 57343) ? String.fromCodePoint(e) : re;
}
//@ chunk-eavynfj6.js:28869-29006 placement
function safeDecodeURIComponent(e) {
  try {
    return decodeURIComponent(e);
  } catch {
    return e.replace(/%([0-9a-fA-F]{2})/g, (t, o) => String.fromCharCode(parseInt(o, 16)));
  }
}
//@ chunk-eavynfj6.js:29006-29238 placement
function matchesTagPattern(e, t, o) {
  let n = e.includes("\\") ? e.replaceAll("\\", " ") : e,
    replaced = n.replace(Ie, "<").replace(Me, ">"),
    replaced_2 = replaced.replace(Le, "l"),
    s = [n];
  if (replaced !== n) s.push(replaced);
  if (replaced_2 !== replaced) s.push(replaced_2);
  return s.some((l) => l.search(t) !== -1 || o.openerOffsets(l).length > 0);
}
//@ chunk-eavynfj6.js:29238-29721 placement
function getEditPermissionVerdict(e, t) {
  if (t.mode === "plan") return "would_ask";
  if (getDenyRuleForTool(t, FileEditTool) !== null || getAskRuleForTool(t, FileEditTool) !== null)
    return "would_ask";
  let o = { file_path: e, old_string: "a", new_string: "b", replace_all: !1 },
    n = walkPermissionCheckPaths(e);
  if (leafSymlinkWriteRefusal(e, n) !== null) return "would_ask";
  let i = checkWritePermissionForTool(FileEditTool, o, t, n);
  if (i.behavior === "allow") return "allowed";
  if (i.behavior !== "ask") return "would_ask";
  let r = i.decisionReason?.type;
  if (r === "rule" || r === "safetyCheck" || r === "mode") return "would_ask";
  return t.mode === "bypassPermissions" || toolAlwaysAllowedRule(t, FileEditTool) !== null
    ? "allowed"
    : "would_ask";
}
//@ chunk-eavynfj6.js:29721-30239 placement
function canWriteWithoutPrompt(e, t, o) {
  if (o.mode === "plan") return !1;
  let n = { name: ARTIFACT_TOOL_NAME };
  if (getDenyRuleForTool(o, n) !== null || getAskRuleForTool(o, n) !== null) return !1;
  if (getDenyRuleForTool(o, FileReadTool) !== null || getAskRuleForTool(o, FileReadTool) !== null) return !1;
  let i = checkReadPermissionForTool(FileReadTool, { file_path: e }, o);
  if (i.behavior === "deny") return !1;
  if (i.behavior === "ask" && i.decisionReason?.type === "rule") return !1;
  if (i.behavior !== "allow" && o.mode !== "bypassPermissions") return !1;
  let r = getLiveState();
  if (r.routineRepublishedPaths.has(e) || r.commentRepublishedPaths.has(e)) return !1;
  let s = r.shareStatus.bySlug.get(t);
  return s === void 0 || (!s.isSharedLive && s.probeFailed !== !0);
}

export {
  containsHarnessTags,
  getEditPermissionVerdict,
  canWriteWithoutPrompt,
  applyFindReplaceEdits,
  recordAutoEditRead,
};
