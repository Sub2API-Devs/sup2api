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
import { u, string, int, _enum, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isTeamMemPath } from "../../memdir/teamMemPaths.js";
import { isAutoMemPath } from "../../memdir/paths.js";
import {
  FRONTMATTER_REGEX,
  STRICT_FRONTMATTER_REGEX,
  MAX_UNTRUSTED_FRONTMATTER_LINES,
  parseYamlLenient,
  serializeFrontmatter,
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

//@ chunk-a477qqne.js:4131-4795 placement
/**
 * claudeCodeItem 元数据的 schema。
 */
var MEMORY_STAMP_SCHEMA = 16;
var MAX_IDS = 64;
var SHORT_TOKEN_RE = /^[A-Za-z0-9_-]{1,128}$/;
var UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
var SHA256_HEX_RE = /^[0-9a-f]{64}$/;
var typedTurnSchema = DoctorLazy(() =>
  u({
    session: string().regex(SHORT_TOKEN_RE),
    generation: string().regex(SHORT_TOKEN_RE).nullable(),
    turn: int().nonnegative(),
    prompt: string().regex(SHORT_TOKEN_RE),
  }),
);
var promotedSchema = DoctorLazy(() =>
  u({
    account_path: string().min(1).max(1024),
    line_hash: string().regex(SHA256_HEX_RE),
    at: string().min(1).max(64),
  }),
);
var claudeCodeItemSchema = DoctorLazy(() =>
  u({
    id: string().regex(UUID_RE),
    minted: string().min(1).max(64).optional(),
    state: _enum(["legacy", "pending", "acked", "suppressed"]),
    consent: _enum(["on", "off"]),
    account: string().regex(SHORT_TOKEN_RE).nullable(),
    src: _enum(["typed", "inferred"]),
    typed: typedTurnSchema().nullable(),
    scope: _enum(["person", "repo", "unknown"]),
    promoted: array(promotedSchema()).max(MEMORY_STAMP_SCHEMA),
    ids: array(string().regex(UUID_RE)).max(MAX_IDS),
  }),
);
var CLAUDECODEITEM = "claudeCodeItem";
//@ chunk-a477qqne.js:4795-4849 placement
/**
 * 取记忆前言里的 claudeCodeItem 对象。
 */
function claudeCodeItemMeta(frontmatter) {
  let n = frontmatter.metadata[CLAUDECODEITEM];
  return isPlainObject(n) ? n : {};
}
//@ chunk-a477qqne.js:4849-5142 placement
function readItemMetadata(frontmatter) {
  let n = claudeCodeItemMeta(frontmatter);
  if (n.id === undefined) return;
  let r = claudeCodeItemSchema().safeParse({
    id: n.id,
    ...(n.minted !== undefined && {
      minted: n.minted,
    }),
    state: n.state,
    consent: n.consent,
    account: n.account ?? null,
    src: n.src,
    typed: n.typed ?? null,
    scope: n.scope,
    promoted: arrayOrEmpty(n.promoted),
    ids: n.ids ?? [],
  });
  return r.success ? r.data : undefined;
}
//@ chunk-a477qqne.js:5142-5220 placement
/**
 * 把单值或数组统一成数组（空返回空数组）。
 */
function arrayOrEmpty(promoted) {
  if (promoted === undefined || promoted === null) return [];
  return Array.isArray(promoted) ? promoted : [promoted];
}
//@ chunk-a477qqne.js:5220-5499 placement
function serializeItemMetadata(e) {
  return {
    id: e.id,
    ...(e.minted !== undefined && {
      minted: e.minted,
    }),
    state: e.state,
    consent: e.consent,
    ...(e.account !== null && {
      account: e.account,
    }),
    src: e.src,
    ...(e.typed !== null && {
      typed: e.typed,
    }),
    scope: e.scope,
    ...(e.promoted.length > 0 && {
      promoted: e.promoted,
    }),
    ...(e.ids.length > 0 && {
      ids: e.ids,
    }),
  };
}
//@ chunk-a477qqne.js:5499-5553 placement
/**
 * 匹配缩进行（续行）的正则。
 */
var MODIFIED_LINE_RE = /^(\s*)modified\s*:/;
var COMMENT_OR_EMPTY_RE = /^\s*(#|$)/;
var INDENTED_LINE_RE = /^\s+\S/;
//@ chunk-a477qqne.js:5553-5598 placement
/**
 * 预处理记忆内容并取正文。
 */
function prepareContent(e, n, r) {
  return prepareMemoryContent(e, n, r).content;
}
//@ chunk-a477qqne.js:5598-6838 placement
/**
 * 写入前处理记忆文档内容（前言、换行、BOM）。
 */
function prepareMemoryContent(e, n, context) {
  let s = isTeamMemPath(e);
  if (!(e.endsWith(".md") && (isAutoMemPath(e) || false)))
    return {
      content: n,
      item: undefined,
    };
  let d = !s;
  if (context !== undefined && d && n !== normalizeLineEndings(n)) {
    let included = n.includes(`\r
`);
    let S = n.startsWith("\uFEFF");
    let memoryContent = prepareMemoryContent(e, normalizeLineEndings(n), context);
    let I = included
      ? memoryContent.content.replaceAll(
          `
`,
          `\r
`,
        )
      : memoryContent.content;
    return {
      ...memoryContent,
      content: S && !I.startsWith("\uFEFF") ? "\uFEFF" + I : I,
    };
  }
  if (context !== undefined && d && context.prior !== undefined && !FRONTMATTER_REGEX.test(n))
    return {
      content: n,
      item: undefined,
      refusal: emptyRefusalHeader(),
      refusalKind: "header",
    };
  let l = n;
  if (!FRONTMATTER_REGEX.test(l))
    return {
      content: n,
      item: undefined,
    };
  let modified = new Date().toISOString();
  let y = d
    ? parseMemoryFile(l, e, {
        quoteLossyValues: true,
      })
    : null;
  if (context !== undefined && y !== null) {
    let M = stampMemoryWrite(l, y, context, modified);
    if (M !== undefined)
      return {
        content: M.content ?? stampNewMemoryContent(e, l, y, modified),
        item: M.item,
      };
  }
  if (context === undefined)
    return {
      content: stampNewMemoryContent(e, l, y, modified),
      item: undefined,
    };
  if (d && context.prior !== undefined) {
    let M =
      context.previous === null
        ? undefined
        : parseMemoryFile(context.previous, e, {
            quoteLossyValues: true,
          });
    return M !== undefined &&
      context.previous !== null &&
      restampMemoryContent(
        context.previous,
        M,
        {
          id: context.prior.id,
          ...context.prior.fields,
        },
        modified,
      ) !== undefined
      ? {
          content: n,
          item: undefined,
          refusal: emptyRefusalHeader(),
          refusalKind: "header",
        }
      : {
          content: stampNewMemoryContent(e, l, y, modified),
          item: undefined,
        };
  }
  let w = withoutFrontmatterKeys(l, CLAUDECODE_KEYS, {
    topLevel: false,
  });
  if (w === undefined)
    return {
      content: n,
      item: undefined,
      refusal: emptyRefusalMissingItem(),
      refusalKind: "item_keys",
    };
  if (context.claimsRecordedId === true)
    return {
      content: n,
      item: undefined,
      refusal: emptyRefusalCopiedId(),
      refusalKind: "copied_id",
    };
  return {
    content: stampNewMemoryContent(e, w, parseMemoryFileLoose(w, e), modified),
    item: undefined,
  };
}
//@ chunk-a477qqne.js:6838-6892 placement
/**
 * 宽松解析记忆文件（保留有损值的引用形式）。
 */
function parseMemoryFileLoose(e, n) {
  return parseMemoryFile(e, n, {
    quoteLossyValues: true,
  });
}
//@ chunk-a477qqne.js:6892-6915 placement
/**
 * 空的 header 类拒绝说明。
 */
function emptyRefusalHeader() {
  return "";
}
//@ chunk-a477qqne.js:6915-6938 placement
/**
 * 空的 copied_id 类拒绝说明。
 */
function emptyRefusalCopiedId() {
  return "";
}
//@ chunk-a477qqne.js:6938-6961 placement
/**
 * 空的 item_keys 类拒绝说明。
 */
function emptyRefusalItemKeys() {
  return "";
}
//@ chunk-a477qqne.js:6961-6984 placement
/**
 * 空的缺项类拒绝说明。
 */
function emptyRefusalMissingItem() {
  return "";
}
//@ chunk-a477qqne.js:6984-7433 placement
/**
 * 给新记忆内容加来源会话与修改时间。
 */
function stampNewMemoryContent(e, n, r, s) {
  let i = r !== null && getMemoryMetadata(r.frontmatter, "originSessionId") === null ? r : null;
  if (i !== null) {
    if (i.rewriteHazard === undefined)
      return serializeMemoryFile(
        withMemoryMetadata(i.frontmatter, {
          originSessionId: getSessionId(),
          modified: s,
        }),
        i.body,
      );
    logForDebugging(`stampNewMemoryContent: not stamping provenance on ${e} \u2014 ${i.rewriteHazard}`, {
      level: "warn",
    });
  }
  let memoryFrontmatter = parseMemoryFrontmatter(n, s);
  if (memoryFrontmatter === null) {
    logForDebugging(`stampNewMemoryContent: not dating ${e} \u2014 no faithful place for a modified line`, {
      level: "warn",
    });
    return n;
  }
  return memoryFrontmatter;
}
//@ chunk-a477qqne.js:7433-7500 placement
/**
 * 统一 BOM 与换行。
 */
function normalizeLineEndings(e) {
  return e.replace(/^\uFEFF/, "").replaceAll(
    `\r
`,
    `
`,
  );
}
//@ chunk-a477qqne.js:7500-7537 placement
/**
 * 只含 claudeCodeItem 的键列表。
 */
var TYPEDTURN = "typedTurn";
var CLAUDECODE_KEYS = [CLAUDECODEITEM, TYPEDTURN];
var CLAUDECODE_ITEM_KEYS = [CLAUDECODEITEM];
//@ chunk-a477qqne.js:7537-8361 placement
/**
 * 写入时更新记忆前言（保留原值、记录写者）。
 */
function stampMemoryWrite(e, n, r, modified) {
  let { previous, writer, consent, account, prior } = r;
  let w =
    previous === null || !FRONTMATTER_REGEX.test(normalizeLineEndings(previous))
      ? undefined
      : parseMemoryFile(normalizeLineEndings(previous), undefined, {
          quoteLossyValues: true,
        });
  let M =
    w === undefined ||
    !En(
      pickComparableFields(w),
      pickComparableFields(
        parseMemoryFile(normalizeLineEndings(e), undefined, {
          quoteLossyValues: true,
        }),
      ),
    );
  let S;
  if (prior !== undefined) {
    S = {
      ...prior.fields,
      id: prior.id,
      ...(!prior.trusted && {
        src: "inferred",
        typed: null,
      }),
    };
    if (S.scope === "unknown" && prior.trusted)
      S = {
        ...S,
        scope: getMemoryScope(n.frontmatter),
      };
    if (M) {
      S =
        S.src === "typed" && writer.src === "typed"
          ? {
              ...S,
              typed: writer.typed,
            }
          : {
              ...S,
              src: "inferred",
              typed: null,
            };
      if (consent === "off")
        S = {
          ...S,
          consent: "off",
        };
    }
  } else {
    let I = previous === null || r.mintAsNew === true;
    S = {
      id: randomUUID(),
      minted: modified,
      state: I ? "pending" : "legacy",
      consent,
      account,
      src: previous === null ? writer.src : "inferred",
      typed: previous === null && writer.src === "typed" ? writer.typed : null,
      scope: getMemoryScope(n.frontmatter),
      promoted: [],
      ids: [],
    };
  }
  let v = restampMemoryContent(e, n, S, modified);
  return v === "unchanged"
    ? {
        content: undefined,
        item: S,
      }
    : v === undefined
      ? undefined
      : {
          content: v,
          item: S,
        };
}
//@ chunk-a477qqne.js:8361-8843 placement
/**
 * 必要时更新记忆前言，否则返回 unchanged。
 */
function restampMemoryContent(e, n, r, modified) {
  let i = {
    originSessionId: getMemoryMetadata(n.frontmatter, "originSessionId") ?? getSessionId(),
    modified,
  };
  if (n.rewriteHazard === undefined) {
    if (
      En(claudeCodeItemMeta(n.frontmatter), serializeItemMetadata(r)) &&
      getMemoryMetadata(n.frontmatter, TYPEDTURN) === null &&
      !hasManagedMetadataKeys(e) &&
      !hasEmptyListKeys(e)
    )
      return "unchanged";
    let l = En(parseMemoryFile(e).frontmatter, n.frontmatter) ? rewriteFrontmatterKeys(e, r, i) : undefined;
    if (
      l !== undefined &&
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
        [CLAUDECODEITEM]: Uo(serializeItemMetadata(r), ITEM_METADATA_KEYS),
        [TYPEDTURN]: null,
        ...i,
      }),
      n.body,
    );
    let w = insertMetadataLines(y, r);
    return isMetadataUnchanged(w, parseMemoryFile(y), r) ? w : (l ?? rewriteFrontmatterKeys(e, r, i));
  }
  return rewriteFrontmatterKeys(e, r, i);
}
//@ chunk-a477qqne.js:8843-9125 placement
function isMetadataUnchanged(e, memoryFile, r) {
  let frontmatter = parseMemoryFile(e).frontmatter;
  if (!isPlainFrontmatter(e)) return false;
  let i = (metadata) =>
    wi(metadata, (l, h) => [...CLAUDECODE_KEYS, "originSessionId", "modified", "node_type"].includes(h));
  return (
    En(readItemMetadata(frontmatter), r) &&
    frontmatter.name === memoryFile.frontmatter.name &&
    frontmatter.description === memoryFile.frontmatter.description &&
    En(i(frontmatter.metadata), i(memoryFile.frontmatter.metadata))
  );
}
//@ chunk-a477qqne.js:9125-9159 placement
/**
 * item 元数据里需要序列化的键。
 */
var ITEM_METADATA_KEYS = ["typed", "promoted", "ids"];
//@ chunk-a477qqne.js:9159-9247 placement
/**
 * 生成 item 元数据的前言行。
 */
function metadataLines(e, n) {
  let r = serializeItemMetadata(e);
  return ITEM_METADATA_KEYS.flatMap((s) => (r[s] === undefined ? [] : [n + s + ": " + jsonStringify(r[s])]));
}
//@ chunk-a477qqne.js:9247-9642 placement
/**
 * 在前言中查找元数据块。
 */
function findMetadataBlock(lines) {
  let lastIndex = lines.findLastIndex((i, d) => d > 0 && i.trim() === "---");
  let index = lines.findIndex((i, d) => d > 0 && d < lastIndex && METADATA_BLOCK_RE.test(i));
  if (index === -1) return;
  let regExp = new RegExp(`^(\\s+)(["']?)` + CLAUDECODEITEM + "\\2\\s*:\\s*$");
  for (let i = index + 1; i < lastIndex; i++) {
    let d = lines[i];
    if (!COMMENT_OR_EMPTY_RE.test(d) && leadingSpaces(d) === 0) return;
    let match = regExp.exec(d);
    if (match === null) continue;
    let h = i + 1;
    while (h < lastIndex && (COMMENT_OR_EMPTY_RE.test(lines[h]) || leadingSpaces(lines[h]) > match[1].length))
      h++;
    while (h > i + 1 && COMMENT_OR_EMPTY_RE.test(lines[h - 1])) h--;
    return [i, h];
  }
  return;
}
//@ chunk-a477qqne.js:9642-9894 placement
function insertMetadataLines(e, n) {
  let r = FRONTMATTER_REGEX.exec(e)?.[0];
  if (r === undefined) return e;
  let lines = r.split(`
`);
  let metadataBlock = findMetadataBlock(lines);
  if (metadataBlock === undefined) return e;
  let [d, l] = metadataBlock;
  let h = l > d + 1 ? " ".repeat(leadingSpaces(lines[d + 1])) : " ".repeat(leadingSpaces(lines[d]) + 2);
  return (
    [...lines.slice(0, l), ...metadataLines(n, h), ...lines.slice(l)].join(`
`) + e.slice(r.length)
  );
}
//@ chunk-a477qqne.js:9894-10050 placement
function hasEmptyListKeys(e) {
  let lines = (FRONTMATTER_REGEX.exec(e)?.[0] ?? "").split(`
`);
  let metadataBlock = findMetadataBlock(lines);
  return (
    metadataBlock !== undefined &&
    lines
      .slice(metadataBlock[0] + 1, metadataBlock[1])
      .some((line) => /^\s*(typed|promoted|ids)\s*:\s*$/.test(line))
  );
}
//@ chunk-a477qqne.js:10050-10251 placement
function pickComparableFields(e) {
  let metadata = wi(
    e.frontmatter.metadata,
    (r, s) => CLAUDECODE_KEYS.includes(s) || s === "originSessionId" || s === "modified",
  );
  return {
    name: e.frontmatter.name,
    description: e.frontmatter.description,
    metadata,
    body: e.body,
  };
}
//@ chunk-a477qqne.js:10251-10363 placement
function hasManagedMetadataKeys(e) {
  return (FRONTMATTER_REGEX.exec(e)?.[0] ?? "")
    .split(
      `
`,
    )
    .some((line) => CLAUDECODE_KEYS.some((s) => new RegExp("^" + s + "\\s*:").test(line)));
}
//@ chunk-a477qqne.js:10363-10453 placement
/**
 * 匹配 metadata: 起始行（可带值）。
 */
var METADATA_BLOCK_RE = /^(["']?)metadata\1\s*:\s*(&\S+\s*)?(!\S+\s*)?(#.*)?$/;
var METADATA_START_RE = /^(["']?)metadata\1\s*:/;
//@ chunk-a477qqne.js:10453-10487 placement
/**
 * 判断文本是否匹配前言正则。
 */
function matchesFrontmatter(e) {
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
  if (!mve(e)) return false;
  return Object.entries(e).some(([key, value]) => key === n || hasNestedKey(value, n));
}
//@ chunk-a477qqne.js:10715-10935 placement
function countOccurrences_2(e, n) {
  let r = (s) => s.split(n).length - 1;
  if (typeof e === "string") return r(e);
  if (Array.isArray(e)) return e.reduce((acc, i) => acc + countOccurrences_2(i, n), 0);
  if (!mve(e)) return 0;
  return Object.entries(e).reduce((acc, [i, d]) => acc + r(i) + countOccurrences_2(d, n), 0);
}
//@ chunk-a477qqne.js:10935-10979 placement
/**
 * 统计子串出现次数。
 */
function countOccurrences(e, n) {
  return e.split(n).length - 1;
}
//@ chunk-a477qqne.js:10979-11178 placement
function hasYamlAliases(e) {
  let n = (s) =>
    new Set([...e.matchAll(new RegExp("(^|[\\s[{,:-])\\" + s + "([^\\s,[\\]{}]+)", "gm"))].map((i) => i[2]));
  let r = n("&");
  return [...n("*")].some((s) => r.has(s)) || /(^|\s)<<[ \t]*:/m.test(e);
}
//@ chunk-a477qqne.js:11178-11827 placement
/**
 * 规范化前言（BOM、分隔线）。
 */
function normalizeFrontmatter(e) {
  if (e.startsWith("\uFEFF")) {
    let w = normalizeFrontmatter(e.slice(1));
    return w === undefined ? undefined : "\uFEFF" + w;
  }
  if (!/^---/.test(e)) return e;
  let frontmatterObject = parseFrontmatterObject(e);
  if (!(
    frontmatterObject !== undefined &&
    /^---[ \t]*\r?\n/.test(e) &&
    FRONTMATTER_REGEX.test(e) &&
    !hasLooseFrontmatter(e)
  ))
    return mentionsItemKey(e) || hasRiskyQuotedEscapes(e) ? undefined : e;
  let s = e.match(STRICT_FRONTMATTER_REGEX)?.[0] ?? "";
  if (hasNestedKey(frontmatterObject, CLAUDECODEITEM) && hasYamlAliases(s)) return;
  let i = withoutFrontmatterKeys(e, CLAUDECODE_ITEM_KEYS, {
    topLevel: false,
  });
  let d = i === undefined ? undefined : parseFrontmatterObject(i);
  let l =
    parseFrontmatterObject(e, {
      lenient: false,
    }) === undefined;
  let h = (w) => w.metadata ?? {};
  let y = i?.match(STRICT_FRONTMATTER_REGEX)?.[0] ?? "";
  return d !== undefined &&
    !hasNestedKey(d, CLAUDECODEITEM) &&
    countOccurrences(y, CLAUDECODEITEM) === countOccurrences_2(d, CLAUDECODEITEM) &&
    !(countOccurrences_2(d, CLAUDECODEITEM) > 0 && (y.includes("\\") || hasYamlAliases(y))) &&
    !(l && (mentionsItemKey(i?.match(STRICT_FRONTMATTER_REGEX)?.[0] ?? "") || hasRiskyQuotedEscapes(s))) &&
    En(Uo(d, "metadata"), Uo(frontmatterObject, "metadata")) &&
    En(
      h(d),
      mve(frontmatterObject.metadata) ? Uo(frontmatterObject.metadata, CLAUDECODEITEM) : h(frontmatterObject),
    )
    ? i
    : undefined;
}
//@ chunk-a477qqne.js:11827-11864 placement
/**
 * 判断文本里是否含 claudeCodeItem 键。
 */
function mentionsItemKey(e) {
  return e.includes(CLAUDECODEITEM);
}
//@ chunk-a477qqne.js:11864-11993 placement
function hasRiskyQuotedEscapes(e) {
  return e
    .split(/\r\n?|\n/)
    .some((line) => line.includes('"') && (/\\[xuU][0-9A-Fa-f]/.test(line) || line.trimEnd().endsWith("\\")));
}
//@ chunk-a477qqne.js:11993-12182 placement
function parseFrontmatterObject(e, { lenient: n = true } = {}) {
  let r = e.match(STRICT_FRONTMATTER_REGEX)?.[1];
  if (r === undefined) return;
  if (!n)
    try {
      let yaml = parseYaml(r);
      return mve(yaml) ? yaml : undefined;
    } catch {
      return;
    }
  let yamlLenient = parseYamlLenient(r);
  return yamlLenient.ok && mve(yamlLenient.value) ? yamlLenient.value : undefined;
}
//@ chunk-a477qqne.js:12182-12290 placement
function isPlainFrontmatter(e) {
  let frontmatterObject = parseFrontmatterObject(e);
  return (
    frontmatterObject !== undefined &&
    ![...CLAUDECODE_KEYS, "originSessionId", "modified"].some((r) => frontmatterObject[r] !== undefined)
  );
}
//@ chunk-a477qqne.js:12290-12412 placement
function hasLooseFrontmatter(e) {
  let n = FRONTMATTER_REGEX.exec(e)?.[1];
  if (n === undefined) return false;
  let r = e.match(STRICT_FRONTMATTER_REGEX)?.[1];
  return r === undefined || n.trim() !== r.trim();
}
//@ chunk-a477qqne.js:12412-13485 placement
/**
 * 重写前言中的指定键。
 */
function rewriteFrontmatterKeys(e, n, r) {
  let match = FRONTMATTER_REGEX.exec(e);
  if (match === null || hasLooseFrontmatter(e)) return;
  let i = match[0];
  let d = stripFrontmatterKeys(
    i.split(`
`),
    [...CLAUDECODE_KEYS, "originSessionId", "modified"],
  );
  let lastIndex = d.findLastIndex((x, z) => z > 0 && x.trim() === "---");
  if (lastIndex === -1) return;
  let metadata = parseMemoryFile(
    d.join(`
`) + e.slice(i.length),
  ).frontmatter.metadata;
  if ([...CLAUDECODE_KEYS, "originSessionId", "modified"].some((x) => metadata[x] !== undefined)) return;
  let index = d.findIndex((x, z) => z > 0 && z < lastIndex && METADATA_BLOCK_RE.test(x));
  if (index === -1) return;
  let w = index + 1;
  let M;
  while (w < lastIndex) {
    let x = d[w];
    if (x.trim() === "" || /^\s*#/.test(x)) {
      w++;
      continue;
    }
    if (leadingSpaces(x) === 0) break;
    M ??= leadingSpaces(x);
    w++;
  }
  let S = " ".repeat(M ?? 2);
  let v = (x, z) =>
    serializeFrontmatter(x)
      .trimEnd()
      .split(
        `
`,
      )
      .map((line) => z + line);
  let I = [
    ...v(
      {
        [CLAUDECODEITEM]: Uo(serializeItemMetadata(n), ITEM_METADATA_KEYS),
      },
      S,
    ),
    ...metadataLines(n, S + "  "),
    ...v(r, S),
  ];
  let T =
    [...d.slice(0, w), ...I, ...d.slice(w)].join(`
`) + e.slice(i.length);
  if (!isPlainFrontmatter(T)) return;
  let frontmatter = parseMemoryFile(T).frontmatter;
  let R = {
    item: readItemMetadata(frontmatter),
    turn: frontmatter.metadata[TYPEDTURN],
    originSessionId: frontmatter.metadata.originSessionId,
    modified: frontmatter.metadata.modified,
  };
  let L = {
    item: n,
    turn: undefined,
    ...r,
  };
  let frontmatter_2 = parseMemoryFile(e).frontmatter;
  let O = (metadata) =>
    wi(metadata, (z, we) => [...CLAUDECODE_KEYS, "originSessionId", "modified"].includes(we));
  return En(R, L) &&
    frontmatter.name === frontmatter_2.name &&
    frontmatter.description === frontmatter_2.description &&
    En(O(frontmatter.metadata), O(frontmatter_2.metadata))
    ? T
    : undefined;
}
//@ chunk-a477qqne.js:13485-13536 placement
/**
 * 计算行首缩进宽度。
 */
function leadingSpaces(e) {
  return e.length - e.trimStart().length;
}
//@ chunk-a477qqne.js:13536-14045 placement
/**
 * 删除前言中的指定键。
 */
function stripFrontmatterKeys(e, n, { topLevel: r = true } = {}) {
  let regExp = new RegExp(`^(\\s*)(["']?)(` + n.join("|") + ")\\2\\s*:");
  let i = [];
  let d = false;
  let l;
  for (let idx = 0; idx < e.length; idx++) {
    let y = e[idx];
    let w = leadingSpaces(y);
    let matches = /^\s*#/.test(y);
    if (idx > 0 && w === 0 && y.trim() !== "" && !matches) {
      d = METADATA_BLOCK_RE.test(y);
      l = undefined;
    } else if (d && l === undefined && y.trim() !== "" && !matches) l = w;
    if (
      !(regExp.exec(y) !== null && ((r && w === 0) || (d && w === l))) ||
      idx === 0 ||
      idx === e.length - 1
    ) {
      i.push(y);
      continue;
    }
    let I = idx;
    for (let idx_2 = idx + 1; idx_2 < e.length - 1; idx_2++) {
      let T = e[idx_2];
      if (COMMENT_OR_EMPTY_RE.test(T)) continue;
      if (leadingSpaces(T) > w || (leadingSpaces(T) === w && /^\s*-(\s|$)/.test(T))) {
        I = idx_2;
        continue;
      }
      break;
    }
    idx = I;
  }
  return i;
}
//@ chunk-a477qqne.js:14045-14404 placement
/**
 * 去掉前言中的保留键。
 */
function withoutFrontmatterKeys(e, n = CLAUDECODE_KEYS, { topLevel: r = true } = {}) {
  let s = FRONTMATTER_REGEX.exec(e)?.[0];
  if (s === undefined) return e;
  if (hasLooseFrontmatter(e)) {
    let lines = (e.match(STRICT_FRONTMATTER_REGEX)?.[0] ?? e).split(`
`);
    return stripFrontmatterKeys(lines, n, {
      topLevel: r,
    }).length === lines.length
      ? e
      : undefined;
  }
  let i =
    stripFrontmatterKeys(
      s.split(`
`),
      n,
      {
        topLevel: r,
      },
    ).join(`
`) + e.slice(s.length);
  let metadata = parseMemoryFile(i).frontmatter.metadata;
  let l = r ? {} : frontmatterLines(i);
  return n.some((y) => metadata[y] !== undefined && (r || !En(metadata[y], l[y]))) ? undefined : i;
}
//@ chunk-a477qqne.js:14404-14704 placement
/**
 * 前言的行。
 */
function frontmatterLines(e) {
  let n = FRONTMATTER_REGEX.exec(e)?.[0];
  if (n === undefined) return {};
  let lines = n.split(`
`);
  let s = [];
  let i = false;
  for (let [d, l] of lines.entries()) {
    let h = leadingSpaces(l);
    if (d > 0 && h === 0 && l.trim() !== "" && !/^\s*#/.test(l)) i = METADATA_START_RE.test(l);
    if (!i || d === lines.length - 1 || l.trim() === "---") s.push(l);
  }
  return parseMemoryFile(
    s.join(`
`) + e.slice(n.length),
  ).frontmatter.metadata;
}
//@ chunk-a477qqne.js:14704-14923 placement
function getMemoryScope(frontmatter) {
  switch (parseMemoryType(frontmatter.metadata.type)) {
    case "user":
      return "person";
    case "project":
    case "reference":
      return "repo";
    case "feedback": {
      let memoryMetadata = getMemoryMetadata(frontmatter, "scope");
      return memoryMetadata === "person" || memoryMetadata === "repo" ? memoryMetadata : "unknown";
    }
    default:
      return "unknown";
  }
}
//@ chunk-a477qqne.js:14923-15690 placement
/**
 * 解析记忆前言（name、description、metadata）。
 */
function parseMemoryFrontmatter(e, n) {
  let match = e.match(FRONTMATTER_REGEX);
  let match_2 = e.match(STRICT_FRONTMATTER_REGEX);
  if (match === null || match_2 === null || match[1].trim() !== match_2[1].trim()) return null;
  let memoryFile = parseMemoryFile(e);
  let { name: d, description, metadata } = memoryFile.frontmatter;
  if (d === null && description === null && Object.keys(metadata).length === 0) return null;
  let y = match_2[0].length;
  let lines = e.slice(0, y).split(`
`);
  let M = e.slice(0, y).includes(`\r
`)
    ? "\r"
    : "";
  let S = (C, O = "") => `${C}modified: ${n}${O}${M}`;
  let flattened = lines.flatMap((line, O) =>
    O > 0 && O < lines.length - 1 && MODIFIED_LINE_RE.test(line) ? [O] : [],
  );
  if (flattened.length > 1 || (flattened.length === 0 && "modified" in metadata)) return null;
  let I = flattened[0];
  let P =
    I !== undefined
      ? [...lines.slice(0, I), S(...splitModifiedLine(stripTrailingCR(lines[I]))), ...lines.slice(I + 1)]
      : findMetadataInsertion(lines, S);
  if (P === null) return null;
  let T =
    P.join(`
`) + e.slice(y);
  let memoryFile_2 = parseMemoryFile(T);
  let match_3 = T.match(STRICT_FRONTMATTER_REGEX);
  return En(memoryFile_2.frontmatter, {
    ...memoryFile.frontmatter,
    metadata: {
      ...metadata,
      modified: n,
    },
  }) &&
    memoryFile_2.body === memoryFile.body &&
    match_3 !== null &&
    T.slice(match_3[0].length) === e.slice(y)
    ? T
    : null;
}
//@ chunk-a477qqne.js:15690-15731 placement
/**
 * 去掉行尾的 \r。
 */
function stripTrailingCR(e) {
  return e.replace(/\r$/, "");
}
//@ chunk-a477qqne.js:15731-15870 placement
function splitModifiedLine(e) {
  let [, n, r] = e.match(/^(\s*)modified\s*:([\s\S]*)$/);
  return [n, /^["']/.test(r.trimStart()) ? "" : (r.match(/([ \t]+#.*)$/)?.[1] ?? "")];
}
//@ chunk-a477qqne.js:15870-15929 placement
/**
 * 在指定位置插入一行。
 */
function insertAt(e, n, r) {
  return [...e.slice(0, n), r, ...e.slice(n)];
}
//@ chunk-a477qqne.js:15929-16300 placement
/**
 * 找到插入 metadata 的位置。
 */
function findMetadataInsertion(lines, n) {
  let index = lines.findIndex((h, y) => y > 0 && /^metadata:/.test(stripTrailingCR(h)));
  let index_2 = lines.findIndex((h, y) => y > 0 && /^metadata:\s*(#.*)?$/.test(stripTrailingCR(h)));
  if (index !== -1 && index_2 === -1) return null;
  if (index_2 === -1) {
    let lastIndex = lines.findLastIndex((y) => stripTrailingCR(y).trim() === "---");
    return lastIndex > 0 ? insertAt(lines, lastIndex, n("")) : null;
  }
  let i = skipContinuationLines(lines, index_2);
  let l =
    lines
      .slice(index_2 + 1, i)
      .find((h) => INDENTED_LINE_RE.test(stripTrailingCR(h)) && !COMMENT_OR_EMPTY_RE.test(stripTrailingCR(h)))
      ?.match(/^(\s+)/)?.[1] ?? "  ";
  return insertAt(lines, i, n(l));
}
//@ chunk-a477qqne.js:16300-16515 placement
function skipContinuationLines(e, n) {
  let r = n + 1;
  while (r < e.length - 1) {
    if (INDENTED_LINE_RE.test(stripTrailingCR(e[r]))) {
      r++;
      continue;
    }
    if (COMMENT_OR_EMPTY_RE.test(stripTrailingCR(e[r]))) {
      let s = r + 1;
      while (s < e.length - 1 && COMMENT_OR_EMPTY_RE.test(stripTrailingCR(e[s]))) s++;
      if (s < e.length - 1 && INDENTED_LINE_RE.test(stripTrailingCR(e[s]))) {
        r = s;
        continue;
      }
    }
    break;
  }
  return r;
}
export {
  prepareMemoryContent,
  emptyRefusalItemKeys,
  prepareContent,
  normalizeFrontmatter,
  claudeCodeItemMeta,
  CLAUDECODEITEM,
  matchesFrontmatter,
};
