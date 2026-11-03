/**
 * services/memoryStore/memoryFrontmatter.ts
 *
 * 2.1.316 新增：写入前处理记忆文档内容（前言、换行、BOM）；重写前言中的指定键等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a477qqne.js (51)
 * attribution: placement 51
 */
import { randomUUID } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, tc, U, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isTeamMemPath } from "../../memdir/teamMemPaths.js";
import { isAutoMemPath } from "../../memdir/paths.js";
import {
  FRONTMATTER_REGEX,
  STRICT_FRONTMATTER_REGEX,
  MAX_UNTRUSTED_FRONTMATTER_LINES,
  parseYamlLenient,
  fwe,
} from "../../utils/frontmatterParser.js";
import {
  parseMemoryFile,
  getMemoryMetadata,
  serializeMemoryFile,
  withMemoryMetadata,
  parseMemoryType,
} from "../../memdir/memoryTypes.js";
import { getSessionId } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { En, wi, mve } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { jsonStringify } from "../../utils/slowOperations.js";
import { parseYaml } from "../../utils/yaml.js";

/**
 * 记忆文档来源戳 schema 与 id 格式。
 */
//@ chunk-a477qqne.js:4131-4795 placement
var MEMORY_STAMP_SCHEMA = 16,
  jt = 64,
  re = /^[A-Za-z0-9_-]{1,128}$/,
  He = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/,
  zt = /^[0-9a-f]{64}$/,
  Bt = DoctorLazy(() =>
    u({
      session: o().regex(re),
      generation: o().regex(re).nullable(),
      turn: tc().nonnegative(),
      prompt: o().regex(re),
    }),
  ),
  Yt = DoctorLazy(() =>
    u({ account_path: o().min(1).max(1024), line_hash: o().regex(zt), at: o().min(1).max(64) }),
  ),
  Kt = DoctorLazy(() =>
    u({
      id: o().regex(He),
      minted: o().min(1).max(64).optional(),
      state: U(["legacy", "pending", "acked", "suppressed"]),
      consent: U(["on", "off"]),
      account: o().regex(re).nullable(),
      src: U(["typed", "inferred"]),
      typed: Bt().nullable(),
      scope: U(["person", "repo", "unknown"]),
      promoted: A(Yt()).max(MEMORY_STAMP_SCHEMA),
      ids: A(o().regex(He)).max(jt),
    }),
  ),
  CLAUDECODEITEM = "claudeCodeItem";
//@ chunk-a477qqne.js:4795-4849 placement
function T7n(e) {
  let n = e.metadata[CLAUDECODEITEM];
  return isPlainObject(n) ? n : {};
}
//@ chunk-a477qqne.js:4849-5142 placement
function readItemMetadata(e) {
  let n = T7n(e);
  if (n.id === void 0) return;
  let safeParse = Kt().safeParse({
    id: n.id,
    ...(n.minted !== void 0 && { minted: n.minted }),
    state: n.state,
    consent: n.consent,
    account: n.account ?? null,
    src: n.src,
    typed: n.typed ?? null,
    scope: n.scope,
    promoted: Ut(n.promoted),
    ids: n.ids ?? [],
  });
  return safeParse.success ? safeParse.data : void 0;
}
//@ chunk-a477qqne.js:5142-5220 placement
function Ut(e) {
  if (e === void 0 || e === null) return [];
  return Array.isArray(e) ? e : [e];
}
//@ chunk-a477qqne.js:5220-5499 placement
function serializeItemMetadata(e) {
  return {
    id: e.id,
    ...(e.minted !== void 0 && { minted: e.minted }),
    state: e.state,
    consent: e.consent,
    ...(e.account !== null && { account: e.account }),
    src: e.src,
    ...(e.typed !== null && { typed: e.typed }),
    scope: e.scope,
    ...(e.promoted.length > 0 && { promoted: e.promoted }),
    ...(e.ids.length > 0 && { ids: e.ids }),
  };
}
//@ chunk-a477qqne.js:5499-5553 placement
var Vt = /^(\s*)modified\s*:/,
  B = /^\s*(#|$)/,
  Se = /^\s+\S/;
//@ chunk-a477qqne.js:5553-5598 placement
function tt(e, n, r) {
  return prepareMemoryContent(e, n, r).content;
}
/**
 * 写入前处理记忆文档内容（前言、换行、BOM）。
 */
//@ chunk-a477qqne.js:5598-6838 placement
function prepareMemoryContent(e, n, r) {
  let s = isTeamMemPath(e);
  if (!(e.endsWith(".md") && (isAutoMemPath(e) || !1))) return { content: n, item: void 0 };
  let d = !s;
  if (r !== void 0 && d && n !== Q(n)) {
    let included = n.includes(`\r
`),
      startsWith = n.startsWith("\uFEFF"),
      v = prepareMemoryContent(e, Q(n), r),
      I = included
        ? v.content.replaceAll(
            `
`,
            `\r
`,
          )
        : v.content;
    return { ...v, content: startsWith && !I.startsWith("\uFEFF") ? "\uFEFF" + I : I };
  }
  if (r !== void 0 && d && r.prior !== void 0 && !FRONTMATTER_REGEX.test(n))
    return { content: n, item: void 0, refusal: Ve(), refusalKind: "header" };
  let l = n;
  if (!FRONTMATTER_REGEX.test(l)) return { content: n, item: void 0 };
  let iso = new Date().toISOString(),
    y = d ? parseMemoryFile(l, e, { quoteLossyValues: !0 }) : null;
  if (r !== void 0 && y !== null) {
    let M = stampMemoryWrite(l, y, r, iso);
    if (M !== void 0) return { content: M.content ?? stampNewMemoryContent(e, l, y, iso), item: M.item };
  }
  if (r === void 0) return { content: stampNewMemoryContent(e, l, y, iso), item: void 0 };
  if (d && r.prior !== void 0) {
    let M = r.previous === null ? void 0 : parseMemoryFile(r.previous, e, { quoteLossyValues: !0 });
    return M !== void 0 &&
      r.previous !== null &&
      restampMemoryContent(r.previous, M, { id: r.prior.id, ...r.prior.fields }, iso) !== void 0
      ? { content: n, item: void 0, refusal: Ve(), refusalKind: "header" }
      : { content: stampNewMemoryContent(e, l, y, iso), item: void 0 };
  }
  let w = withoutFrontmatterKeys(l, W, { topLevel: !1 });
  if (w === void 0) return { content: n, item: void 0, refusal: ot(), refusalKind: "item_keys" };
  if (r.claimsRecordedId === !0) return { content: n, item: void 0, refusal: Gt(), refusalKind: "copied_id" };
  return { content: stampNewMemoryContent(e, w, qt(w, e), iso), item: void 0 };
}
//@ chunk-a477qqne.js:6838-6892 placement
function qt(e, n) {
  return parseMemoryFile(e, n, { quoteLossyValues: !0 });
}
//@ chunk-a477qqne.js:6892-6915 placement
function Ve() {
  return "";
}
//@ chunk-a477qqne.js:6915-6938 placement
function Gt() {
  return "";
}
//@ chunk-a477qqne.js:6938-6961 placement
function nt() {
  return "";
}
//@ chunk-a477qqne.js:6961-6984 placement
function ot() {
  return "";
}
/**
 * 给新记忆内容加来源会话与修改时间。
 */
//@ chunk-a477qqne.js:6984-7433 placement
function stampNewMemoryContent(e, n, r, s) {
  let i = r !== null && getMemoryMetadata(r.frontmatter, "originSessionId") === null ? r : null;
  if (i !== null) {
    if (i.rewriteHazard === void 0)
      return serializeMemoryFile(
        withMemoryMetadata(i.frontmatter, { originSessionId: getSessionId(), modified: s }),
        i.body,
      );
    logForDebugging(`stampNewMemoryContent: not stamping provenance on ${e} \u2014 ${i.rewriteHazard}`, {
      level: "warn",
    });
  }
  let d = parseMemoryFrontmatter(n, s);
  if (d === null)
    return (
      logForDebugging(`stampNewMemoryContent: not dating ${e} \u2014 no faithful place for a modified line`, {
        level: "warn",
      }),
      n
    );
  return d;
}
//@ chunk-a477qqne.js:7433-7500 placement
function Q(e) {
  return e.replace(/^\uFEFF/, "").replaceAll(
    `\r
`,
    `
`,
  );
}
//@ chunk-a477qqne.js:7500-7537 placement
var TYPEDTURN = "typedTurn",
  W = [CLAUDECODEITEM, TYPEDTURN],
  Xt = [CLAUDECODEITEM];
/**
 * 写入时更新记忆前言（保留原值、记录写者）。
 */
//@ chunk-a477qqne.js:7537-8361 placement
function stampMemoryWrite(e, n, r, s) {
  let { previous: previous, writer: writer, consent: consent, account: account, prior: prior } = r,
    w =
      previous === null || !FRONTMATTER_REGEX.test(Q(previous))
        ? void 0
        : parseMemoryFile(Q(previous), void 0, { quoteLossyValues: !0 }),
    M =
      w === void 0 ||
      !En(
        pickComparableFields(w),
        pickComparableFields(parseMemoryFile(Q(e), void 0, { quoteLossyValues: !0 })),
      ),
    S;
  if (prior !== void 0) {
    if (
      ((S = { ...prior.fields, id: prior.id, ...(!prior.trusted && { src: "inferred", typed: null }) }),
      S.scope === "unknown" && prior.trusted)
    )
      S = { ...S, scope: getMemoryScope(n.frontmatter) };
    if (M) {
      if (
        ((S =
          S.src === "typed" && writer.src === "typed"
            ? { ...S, typed: writer.typed }
            : { ...S, src: "inferred", typed: null }),
        consent === "off")
      )
        S = { ...S, consent: "off" };
    }
  } else {
    let I = previous === null || r.mintAsNew === !0;
    S = {
      id: randomUUID(),
      minted: s,
      state: I ? "pending" : "legacy",
      consent: consent,
      account: account,
      src: previous === null ? writer.src : "inferred",
      typed: previous === null && writer.src === "typed" ? writer.typed : null,
      scope: getMemoryScope(n.frontmatter),
      promoted: [],
      ids: [],
    };
  }
  let v = restampMemoryContent(e, n, S, s);
  return v === "unchanged" ? { content: void 0, item: S } : v === void 0 ? void 0 : { content: v, item: S };
}
/**
 * 必要时更新记忆前言，否则返回 unchanged。
 */
//@ chunk-a477qqne.js:8361-8843 placement
function restampMemoryContent(e, n, r, s) {
  let i = {
    originSessionId: getMemoryMetadata(n.frontmatter, "originSessionId") ?? getSessionId(),
    modified: s,
  };
  if (n.rewriteHazard === void 0) {
    if (
      En(T7n(n.frontmatter), serializeItemMetadata(r)) &&
      getMemoryMetadata(n.frontmatter, TYPEDTURN) === null &&
      !hasManagedMetadataKeys(e) &&
      !hasEmptyListKeys(e)
    )
      return "unchanged";
    let l = En(parseMemoryFile(e).frontmatter, n.frontmatter) ? rewriteFrontmatterKeys(e, r, i) : void 0;
    if (
      l !== void 0 &&
      ((M) =>
        countCharInString(
          STRICT_FRONTMATTER_REGEX.exec(M)?.[0] ?? "",
          `
`,
        ) <= MAX_UNTRUSTED_FRONTMATTER_LINES)(l)
    )
      return l;
    let y = serializeMemoryFile(
        withMemoryMetadata(n.frontmatter, {
          [CLAUDECODEITEM]: Uo(serializeItemMetadata(r), ve),
          [TYPEDTURN]: null,
          ...i,
        }),
        n.body,
      ),
      w = insertMetadataLines(y, r);
    return isMetadataUnchanged(w, parseMemoryFile(y), r) ? w : (l ?? rewriteFrontmatterKeys(e, r, i));
  }
  return rewriteFrontmatterKeys(e, r, i);
}
//@ chunk-a477qqne.js:8843-9125 placement
function isMetadataUnchanged(e, n, r) {
  let frontmatter = parseMemoryFile(e).frontmatter;
  if (!isPlainFrontmatter(e)) return !1;
  let i = (d) => wi(d, (l, h) => [...W, "originSessionId", "modified", "node_type"].includes(h));
  return (
    En(readItemMetadata(frontmatter), r) &&
    frontmatter.name === n.frontmatter.name &&
    frontmatter.description === n.frontmatter.description &&
    En(i(frontmatter.metadata), i(n.frontmatter.metadata))
  );
}
//@ chunk-a477qqne.js:9125-9159 placement
var ve = ["typed", "promoted", "ids"];
//@ chunk-a477qqne.js:9159-9247 placement
function it(e, n) {
  let r = serializeItemMetadata(e);
  return ve.flatMap((s) => (r[s] === void 0 ? [] : [n + s + ": " + jsonStringify(r[s])]));
}
/**
 * 在前言中查找元数据块。
 */
//@ chunk-a477qqne.js:9247-9642 placement
function findMetadataBlock(e) {
  let lastIndex = e.findLastIndex((i, d) => d > 0 && i.trim() === "---"),
    index = e.findIndex((i, d) => d > 0 && d < lastIndex && Ie.test(i));
  if (index === -1) return;
  let regExp = new RegExp(`^(\\s+)(["']?)` + CLAUDECODEITEM + "\\2\\s*:\\s*$");
  for (let i = index + 1; i < lastIndex; i++) {
    let d = e[i];
    if (!B.test(d) && F(d) === 0) return;
    let match = regExp.exec(d);
    if (match === null) continue;
    let h = i + 1;
    while (h < lastIndex && (B.test(e[h]) || F(e[h]) > match[1].length)) h++;
    while (h > i + 1 && B.test(e[h - 1])) h--;
    return [i, h];
  }
  return;
}
//@ chunk-a477qqne.js:9642-9894 placement
function insertMetadataLines(e, n) {
  let r = FRONTMATTER_REGEX.exec(e)?.[0];
  if (r === void 0) return e;
  let parts = r.split(`
`),
    i = findMetadataBlock(parts);
  if (i === void 0) return e;
  let [d, l] = i,
    h = l > d + 1 ? " ".repeat(F(parts[d + 1])) : " ".repeat(F(parts[d]) + 2);
  return (
    [...parts.slice(0, l), ...it(n, h), ...parts.slice(l)].join(`
`) + e.slice(r.length)
  );
}
//@ chunk-a477qqne.js:9894-10050 placement
function hasEmptyListKeys(e) {
  let parts = (FRONTMATTER_REGEX.exec(e)?.[0] ?? "").split(`
`),
    r = findMetadataBlock(parts);
  return r !== void 0 && parts.slice(r[0] + 1, r[1]).some((s) => /^\s*(typed|promoted|ids)\s*:\s*$/.test(s));
}
//@ chunk-a477qqne.js:10050-10251 placement
function pickComparableFields(e) {
  let n = wi(e.frontmatter.metadata, (r, s) => W.includes(s) || s === "originSessionId" || s === "modified");
  return { name: e.frontmatter.name, description: e.frontmatter.description, metadata: n, body: e.body };
}
//@ chunk-a477qqne.js:10251-10363 placement
function hasManagedMetadataKeys(e) {
  return (FRONTMATTER_REGEX.exec(e)?.[0] ?? "")
    .split(
      `
`,
    )
    .some((r) => W.some((s) => new RegExp("^" + s + "\\s*:").test(r)));
}
//@ chunk-a477qqne.js:10363-10453 placement
var Ie = /^(["']?)metadata\1\s*:\s*(&\S+\s*)?(!\S+\s*)?(#.*)?$/,
  nn = /^(["']?)metadata\1\s*:/;
//@ chunk-a477qqne.js:10453-10487 placement
function HJs(e) {
  return regExp_2.test(e);
}
//@ chunk-a477qqne.js:10487-10575 placement
var regExp_2 = new RegExp(
  `^[ \\t]*(-[ \\t]+)*((&|!)\\S*[ \\t]+)*["']?` + CLAUDECODEITEM + `["']?[ \\t]*:`,
  "m",
);
//@ chunk-a477qqne.js:10575-10715 placement
function hasNestedKey(e, n) {
  if (Array.isArray(e)) return e.some((r) => hasNestedKey(r, n));
  if (!mve(e)) return !1;
  return Object.entries(e).some(([r, s]) => r === n || hasNestedKey(s, n));
}
//@ chunk-a477qqne.js:10715-10935 placement
function countOccurrences(e, n) {
  let r = (s) => s.split(n).length - 1;
  if (typeof e === "string") return r(e);
  if (Array.isArray(e)) return e.reduce((s, i) => s + countOccurrences(i, n), 0);
  if (!mve(e)) return 0;
  return Object.entries(e).reduce((s, [i, d]) => s + r(i) + countOccurrences(d, n), 0);
}
//@ chunk-a477qqne.js:10935-10979 placement
function sn(e, n) {
  return e.split(n).length - 1;
}
//@ chunk-a477qqne.js:10979-11178 placement
function hasYamlAliases(e) {
  let n = (s) =>
      new Set(
        [...e.matchAll(new RegExp("(^|[\\s[{,:-])\\" + s + "([^\\s,[\\]{}]+)", "gm"))].map((i) => i[2]),
      ),
    r = n("&");
  return [...n("*")].some((s) => r.has(s)) || /(^|\s)<<[ \t]*:/m.test(e);
}
/**
 * 规范化前言（BOM、分隔线）。
 */
//@ chunk-a477qqne.js:11178-11827 placement
function normalizeFrontmatter(e) {
  if (e.startsWith("\uFEFF")) {
    let w = normalizeFrontmatter(e.slice(1));
    return w === void 0 ? void 0 : "\uFEFF" + w;
  }
  if (!/^---/.test(e)) return e;
  let n = parseFrontmatterObject(e);
  if (!(n !== void 0 && /^---[ \t]*\r?\n/.test(e) && FRONTMATTER_REGEX.test(e) && !hasLooseFrontmatter(e)))
    return Je(e) || hasRiskyQuotedEscapes(e) ? void 0 : e;
  let s = e.match(STRICT_FRONTMATTER_REGEX)?.[0] ?? "";
  if (hasNestedKey(n, CLAUDECODEITEM) && hasYamlAliases(s)) return;
  let i = withoutFrontmatterKeys(e, Xt, { topLevel: !1 }),
    d = i === void 0 ? void 0 : parseFrontmatterObject(i),
    l = parseFrontmatterObject(e, { lenient: !1 }) === void 0,
    h = (w) => w.metadata ?? {},
    y = i?.match(STRICT_FRONTMATTER_REGEX)?.[0] ?? "";
  return d !== void 0 &&
    !hasNestedKey(d, CLAUDECODEITEM) &&
    sn(y, CLAUDECODEITEM) === countOccurrences(d, CLAUDECODEITEM) &&
    !(countOccurrences(d, CLAUDECODEITEM) > 0 && (y.includes("\\") || hasYamlAliases(y))) &&
    !(l && (Je(i?.match(STRICT_FRONTMATTER_REGEX)?.[0] ?? "") || hasRiskyQuotedEscapes(s))) &&
    En(Uo(d, "metadata"), Uo(n, "metadata")) &&
    En(h(d), mve(n.metadata) ? Uo(n.metadata, CLAUDECODEITEM) : h(n))
    ? i
    : void 0;
}
//@ chunk-a477qqne.js:11827-11864 placement
function Je(e) {
  return e.includes(CLAUDECODEITEM);
}
//@ chunk-a477qqne.js:11864-11993 placement
function hasRiskyQuotedEscapes(e) {
  return e
    .split(/\r\n?|\n/)
    .some((n) => n.includes('"') && (/\\[xuU][0-9A-Fa-f]/.test(n) || n.trimEnd().endsWith("\\")));
}
//@ chunk-a477qqne.js:11993-12182 placement
function parseFrontmatterObject(e, { lenient: n = !0 } = {}) {
  let r = e.match(STRICT_FRONTMATTER_REGEX)?.[1];
  if (r === void 0) return;
  if (!n)
    try {
      let i = parseYaml(r);
      return mve(i) ? i : void 0;
    } catch {
      return;
    }
  let s = parseYamlLenient(r);
  return s.ok && mve(s.value) ? s.value : void 0;
}
//@ chunk-a477qqne.js:12182-12290 placement
function isPlainFrontmatter(e) {
  let n = parseFrontmatterObject(e);
  return n !== void 0 && ![...W, "originSessionId", "modified"].some((r) => n[r] !== void 0);
}
//@ chunk-a477qqne.js:12290-12412 placement
function hasLooseFrontmatter(e) {
  let n = FRONTMATTER_REGEX.exec(e)?.[1];
  if (n === void 0) return !1;
  let r = e.match(STRICT_FRONTMATTER_REGEX)?.[1];
  return r === void 0 || n.trim() !== r.trim();
}
/**
 * 重写前言中的指定键。
 */
//@ chunk-a477qqne.js:12412-13485 placement
function rewriteFrontmatterKeys(e, n, r) {
  let match = FRONTMATTER_REGEX.exec(e);
  if (match === null || hasLooseFrontmatter(e)) return;
  let i = match[0],
    d = stripFrontmatterKeys(
      i.split(`
`),
      [...W, "originSessionId", "modified"],
    ),
    lastIndex = d.findLastIndex((x, z) => z > 0 && x.trim() === "---");
  if (lastIndex === -1) return;
  let metadata = parseMemoryFile(
    d.join(`
`) + e.slice(i.length),
  ).frontmatter.metadata;
  if ([...W, "originSessionId", "modified"].some((x) => metadata[x] !== void 0)) return;
  let index = d.findIndex((x, z) => z > 0 && z < lastIndex && Ie.test(x));
  if (index === -1) return;
  let w = index + 1,
    M;
  while (w < lastIndex) {
    let x = d[w];
    if (x.trim() === "" || /^\s*#/.test(x)) {
      w++;
      continue;
    }
    if (F(x) === 0) break;
    ((M ??= F(x)), w++);
  }
  let repeat = " ".repeat(M ?? 2),
    v = (x, z) =>
      fwe(x)
        .trimEnd()
        .split(
          `
`,
        )
        .map((we) => z + we),
    I = [
      ...v({ [CLAUDECODEITEM]: Uo(serializeItemMetadata(n), ve) }, repeat),
      ...it(n, repeat + "  "),
      ...v(r, repeat),
    ],
    T =
      [...d.slice(0, w), ...I, ...d.slice(w)].join(`
`) + e.slice(i.length);
  if (!isPlainFrontmatter(T)) return;
  let frontmatter = parseMemoryFile(T).frontmatter,
    R = {
      item: readItemMetadata(frontmatter),
      turn: frontmatter.metadata[TYPEDTURN],
      originSessionId: frontmatter.metadata.originSessionId,
      modified: frontmatter.metadata.modified,
    },
    L = { item: n, turn: void 0, ...r },
    frontmatter_2 = parseMemoryFile(e).frontmatter,
    O = (x) => wi(x, (z, we) => [...W, "originSessionId", "modified"].includes(we));
  return En(R, L) &&
    frontmatter.name === frontmatter_2.name &&
    frontmatter.description === frontmatter_2.description &&
    En(O(frontmatter.metadata), O(frontmatter_2.metadata))
    ? T
    : void 0;
}
//@ chunk-a477qqne.js:13485-13536 placement
function F(e) {
  return e.length - e.trimStart().length;
}
/**
 * 删除前言中的指定键。
 */
//@ chunk-a477qqne.js:13536-14045 placement
function stripFrontmatterKeys(e, n, { topLevel: r = !0 } = {}) {
  let regExp = new RegExp(`^(\\s*)(["']?)(` + n.join("|") + ")\\2\\s*:"),
    i = [],
    d = !1,
    l;
  for (let h = 0; h < e.length; h++) {
    let y = e[h],
      w = F(y),
      matches = /^\s*#/.test(y);
    if (h > 0 && w === 0 && y.trim() !== "" && !matches) ((d = Ie.test(y)), (l = void 0));
    else if (d && l === void 0 && y.trim() !== "" && !matches) l = w;
    if (!(regExp.exec(y) !== null && ((r && w === 0) || (d && w === l))) || h === 0 || h === e.length - 1) {
      i.push(y);
      continue;
    }
    let I = h;
    for (let P = h + 1; P < e.length - 1; P++) {
      let T = e[P];
      if (B.test(T)) continue;
      if (F(T) > w || (F(T) === w && /^\s*-(\s|$)/.test(T))) {
        I = P;
        continue;
      }
      break;
    }
    h = I;
  }
  return i;
}
/**
 * 去掉前言中的保留键。
 */
//@ chunk-a477qqne.js:14045-14404 placement
function withoutFrontmatterKeys(e, n = W, { topLevel: r = !0 } = {}) {
  let s = FRONTMATTER_REGEX.exec(e)?.[0];
  if (s === void 0) return e;
  if (hasLooseFrontmatter(e)) {
    let parts = (e.match(STRICT_FRONTMATTER_REGEX)?.[0] ?? e).split(`
`);
    return stripFrontmatterKeys(parts, n, { topLevel: r }).length === parts.length ? e : void 0;
  }
  let i =
      stripFrontmatterKeys(
        s.split(`
`),
        n,
        { topLevel: r },
      ).join(`
`) + e.slice(s.length),
    metadata = parseMemoryFile(i).frontmatter.metadata,
    l = r ? {} : frontmatterLines(i);
  return n.some((y) => metadata[y] !== void 0 && (r || !En(metadata[y], l[y]))) ? void 0 : i;
}
/**
 * 前言的行。
 */
//@ chunk-a477qqne.js:14404-14704 placement
function frontmatterLines(e) {
  let n = FRONTMATTER_REGEX.exec(e)?.[0];
  if (n === void 0) return {};
  let parts = n.split(`
`),
    s = [],
    i = !1;
  for (let [d, l] of parts.entries()) {
    let h = F(l);
    if (d > 0 && h === 0 && l.trim() !== "" && !/^\s*#/.test(l)) i = nn.test(l);
    if (!i || d === parts.length - 1 || l.trim() === "---") s.push(l);
  }
  return parseMemoryFile(
    s.join(`
`) + e.slice(n.length),
  ).frontmatter.metadata;
}
//@ chunk-a477qqne.js:14704-14923 placement
function getMemoryScope(e) {
  switch (parseMemoryType(e.metadata.type)) {
    case "user":
      return "person";
    case "project":
    case "reference":
      return "repo";
    case "feedback": {
      let n = getMemoryMetadata(e, "scope");
      return n === "person" || n === "repo" ? n : "unknown";
    }
    default:
      return "unknown";
  }
}
/**
 * 解析记忆前言（name、description、metadata）。
 */
//@ chunk-a477qqne.js:14923-15690 placement
function parseMemoryFrontmatter(e, n) {
  let match = e.match(FRONTMATTER_REGEX),
    match_2 = e.match(STRICT_FRONTMATTER_REGEX);
  if (match === null || match_2 === null || match[1].trim() !== match_2[1].trim()) return null;
  let i = parseMemoryFile(e),
    { name: d, description: description, metadata: metadata } = i.frontmatter;
  if (d === null && description === null && Object.keys(metadata).length === 0) return null;
  let y = match_2[0].length,
    parts = e.slice(0, y).split(`
`),
    M = e.slice(0, y).includes(`\r
`)
      ? "\r"
      : "",
    S = (C, O = "") => `${C}modified: ${n}${O}${M}`,
    flattened = parts.flatMap((C, O) => (O > 0 && O < parts.length - 1 && Vt.test(C) ? [O] : []));
  if (flattened.length > 1 || (flattened.length === 0 && "modified" in metadata)) return null;
  let I = flattened[0],
    P =
      I !== void 0
        ? [...parts.slice(0, I), S(...splitModifiedLine(N(parts[I]))), ...parts.slice(I + 1)]
        : findMetadataInsertion(parts, S);
  if (P === null) return null;
  let T =
      P.join(`
`) + e.slice(y),
    b = parseMemoryFile(T),
    match_3 = T.match(STRICT_FRONTMATTER_REGEX);
  return En(b.frontmatter, { ...i.frontmatter, metadata: { ...metadata, modified: n } }) &&
    b.body === i.body &&
    match_3 !== null &&
    T.slice(match_3[0].length) === e.slice(y)
    ? T
    : null;
}
//@ chunk-a477qqne.js:15690-15731 placement
function N(e) {
  return e.replace(/\r$/, "");
}
//@ chunk-a477qqne.js:15731-15870 placement
function splitModifiedLine(e) {
  let [, n, r] = e.match(/^(\s*)modified\s*:([\s\S]*)$/);
  return [n, /^["']/.test(r.trimStart()) ? "" : (r.match(/([ \t]+#.*)$/)?.[1] ?? "")];
}
//@ chunk-a477qqne.js:15870-15929 placement
function et(e, n, r) {
  return [...e.slice(0, n), r, ...e.slice(n)];
}
/**
 * 找到插入 metadata 的位置。
 */
//@ chunk-a477qqne.js:15929-16300 placement
function findMetadataInsertion(e, n) {
  let index = e.findIndex((h, y) => y > 0 && /^metadata:/.test(N(h))),
    index_2 = e.findIndex((h, y) => y > 0 && /^metadata:\s*(#.*)?$/.test(N(h)));
  if (index !== -1 && index_2 === -1) return null;
  if (index_2 === -1) {
    let lastIndex = e.findLastIndex((y) => N(y).trim() === "---");
    return lastIndex > 0 ? et(e, lastIndex, n("")) : null;
  }
  let i = skipContinuationLines(e, index_2),
    l =
      e
        .slice(index_2 + 1, i)
        .find((h) => Se.test(N(h)) && !B.test(N(h)))
        ?.match(/^(\s+)/)?.[1] ?? "  ";
  return et(e, i, n(l));
}
//@ chunk-a477qqne.js:16300-16515 placement
function skipContinuationLines(e, n) {
  let r = n + 1;
  while (r < e.length - 1) {
    if (Se.test(N(e[r]))) {
      r++;
      continue;
    }
    if (B.test(N(e[r]))) {
      let s = r + 1;
      while (s < e.length - 1 && B.test(N(e[s]))) s++;
      if (s < e.length - 1 && Se.test(N(e[s]))) {
        r = s;
        continue;
      }
    }
    break;
  }
  return r;
}

export { prepareMemoryContent, nt, tt, normalizeFrontmatter, T7n, CLAUDECODEITEM, HJs };
