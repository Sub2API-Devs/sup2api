/**
 * services/memoryStore/memoryFrontmatter.ts
 *
 * 2.1.316 新增：写入前处理记忆文档内容（前言、换行、BOM）；重写前言中的指定键等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b3a6nm9h.js (51)
 * attribution: placement 51
 */
import { randomUUID } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, int, _enum, array } from "../../../vendor/zod/v4/classic/schemas.js";
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
import {
  import_sortedIndex_2,
  import_reject,
  import_isPlainObject,
} from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { jsonStringify } from "../../utils/slowOperations.js";
import { parseYaml } from "../../utils/yaml.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-b3a6nm9h.js:4164-4828 placement
/**
 * claudeCodeItem 元数据的 schema。
 */
var MAX_PROMOTED_ENTRIES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_IDS;
var SHORT_TOKEN_RE;
var UUID_RE;
var SHA256_HEX_RE;
var typedTurnSchema;
var promotedSchema;
var claudeCodeItemSchema;
var CLAUDECODEITEM;
deferInit("chunk-b3a6nm9h.js:4164", () => {
  MAX_PROMOTED_ENTRIES = 16;
  MAX_IDS = 64;
  SHORT_TOKEN_RE = /^[A-Za-z0-9_-]{1,128}$/;
  UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
  SHA256_HEX_RE = /^[0-9a-f]{64}$/;
  typedTurnSchema = DoctorLazy(() =>
    objectSchema({
      session: stringSchema().regex(SHORT_TOKEN_RE),
      generation: stringSchema().regex(SHORT_TOKEN_RE).nullable(),
      turn: int().nonnegative(),
      prompt: stringSchema().regex(SHORT_TOKEN_RE),
    }),
  );
  promotedSchema = DoctorLazy(() =>
    objectSchema({
      account_path: stringSchema().min(1).max(1024),
      line_hash: stringSchema().regex(SHA256_HEX_RE),
      at: stringSchema().min(1).max(64),
    }),
  );
  claudeCodeItemSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema().regex(UUID_RE),
      minted: stringSchema().min(1).max(64).optional(),
      state: _enum(["legacy", "pending", "acked", "suppressed"]),
      consent: _enum(["on", "off"]),
      account: stringSchema().regex(SHORT_TOKEN_RE).nullable(),
      src: _enum(["typed", "inferred"]),
      typed: typedTurnSchema().nullable(),
      scope: _enum(["person", "repo", "unknown"]),
      promoted: array(promotedSchema()).max(MAX_PROMOTED_ENTRIES),
      ids: array(stringSchema().regex(UUID_RE)).max(MAX_IDS),
    }),
  );
  CLAUDECODEITEM = "claudeCodeItem";
});
//@ chunk-b3a6nm9h.js:4828-4882 placement
/**
 * 取记忆前言里的 claudeCodeItem 对象。
 */
function claudeCodeItemMeta(frontmatter) {
  let itemMetadata = frontmatter.metadata[CLAUDECODEITEM];
  return isPlainObject(itemMetadata) ? itemMetadata : {};
}
//@ chunk-b3a6nm9h.js:4882-5175 placement
function readItemMetadata(frontmatter) {
  let rawMetadata = claudeCodeItemMeta(frontmatter);
  if (rawMetadata.id === undefined) return;
  let parsed = claudeCodeItemSchema().safeParse({
    id: rawMetadata.id,
    ...(rawMetadata.minted !== undefined && {
      minted: rawMetadata.minted,
    }),
    state: rawMetadata.state,
    consent: rawMetadata.consent,
    account: rawMetadata.account ?? null,
    src: rawMetadata.src,
    typed: rawMetadata.typed ?? null,
    scope: rawMetadata.scope,
    promoted: arrayOrEmpty(rawMetadata.promoted),
    ids: rawMetadata.ids ?? [],
  });
  return parsed.success ? parsed.data : undefined;
}
//@ chunk-b3a6nm9h.js:5175-5253 placement
/**
 * 把单值或数组统一成数组（空返回空数组）。
 */
function arrayOrEmpty(promoted) {
  if (promoted === undefined || promoted === null) return [];
  return Array.isArray(promoted) ? promoted : [promoted];
}
//@ chunk-b3a6nm9h.js:5253-5532 placement
function serializeItemMetadata(item) {
  return {
    id: item.id,
    ...(item.minted !== undefined && {
      minted: item.minted,
    }),
    state: item.state,
    consent: item.consent,
    ...(item.account !== null && {
      account: item.account,
    }),
    src: item.src,
    ...(item.typed !== null && {
      typed: item.typed,
    }),
    scope: item.scope,
    ...(item.promoted.length > 0 && {
      promoted: item.promoted,
    }),
    ...(item.ids.length > 0 && {
      ids: item.ids,
    }),
  };
}
//@ chunk-b3a6nm9h.js:5532-5586 placement
/**
 * 匹配缩进行（续行）的正则。
 */
var MODIFIED_LINE_RE = /^(\s*)modified\s*:/;
var COMMENT_OR_EMPTY_RE = /^\s*(#|$)/;
var INDENTED_LINE_RE = /^\s+\S/;
//@ chunk-b3a6nm9h.js:5586-5631 placement
/**
 * 预处理记忆内容并取正文。
 */
function prepareContent(filePath, content, context) {
  return prepareMemoryContent(filePath, content, context).content;
}
//@ chunk-b3a6nm9h.js:5631-6871 placement
/**
 * 写入前处理记忆文档内容（前言、换行、BOM）。
 */
function prepareMemoryContent(filePath, content, context) {
  let isTeamMem = isTeamMemPath(filePath);
  if (!(filePath.endsWith(".md") && (isAutoMemPath(filePath) || false)))
    return {
      content,
      item: undefined,
    };
  let isPersonalMem = !isTeamMem;
  if (context !== undefined && isPersonalMem && content !== normalizeLineEndings(content)) {
    let included = content.includes(`\r
`);
    let hadBom = content.startsWith("\uFEFF");
    let memoryContent = prepareMemoryContent(filePath, normalizeLineEndings(content), context);
    let restoredContent = included
      ? memoryContent.content.replaceAll(
          `
`,
          `\r
`,
        )
      : memoryContent.content;
    return {
      ...memoryContent,
      content: hadBom && !restoredContent.startsWith("\uFEFF") ? "\uFEFF" + restoredContent : restoredContent,
    };
  }
  if (
    context !== undefined &&
    isPersonalMem &&
    context.prior !== undefined &&
    !FRONTMATTER_REGEX.test(content)
  )
    return {
      content,
      item: undefined,
      refusal: emptyRefusalHeader(),
      refusalKind: "header",
    };
  let text = content;
  if (!FRONTMATTER_REGEX.test(text))
    return {
      content,
      item: undefined,
    };
  let modified = new Date().toISOString();
  let memoryFile = isPersonalMem
    ? parseMemoryFile(text, filePath, {
        quoteLossyValues: true,
      })
    : null;
  if (context !== undefined && memoryFile !== null) {
    let stamped = stampMemoryWrite(text, memoryFile, context, modified);
    if (stamped !== undefined)
      return {
        content: stamped.content ?? stampNewMemoryContent(filePath, text, memoryFile, modified),
        item: stamped.item,
      };
  }
  if (context === undefined)
    return {
      content: stampNewMemoryContent(filePath, text, memoryFile, modified),
      item: undefined,
    };
  if (isPersonalMem && context.prior !== undefined) {
    let previousFile =
      context.previous === null
        ? undefined
        : parseMemoryFile(context.previous, filePath, {
            quoteLossyValues: true,
          });
    return previousFile !== undefined &&
      context.previous !== null &&
      restampMemoryContent(
        context.previous,
        previousFile,
        {
          id: context.prior.id,
          ...context.prior.fields,
        },
        modified,
      ) !== undefined
      ? {
          content,
          item: undefined,
          refusal: emptyRefusalHeader(),
          refusalKind: "header",
        }
      : {
          content: stampNewMemoryContent(filePath, text, memoryFile, modified),
          item: undefined,
        };
  }
  let strippedText = withoutFrontmatterKeys(text, CLAUDECODE_KEYS, {
    topLevel: false,
  });
  if (strippedText === undefined)
    return {
      content,
      item: undefined,
      refusal: emptyRefusalMissingItem(),
      refusalKind: "item_keys",
    };
  if (context.claimsRecordedId === true)
    return {
      content,
      item: undefined,
      refusal: emptyRefusalCopiedId(),
      refusalKind: "copied_id",
    };
  return {
    content: stampNewMemoryContent(
      filePath,
      strippedText,
      parseMemoryFileLoose(strippedText, filePath),
      modified,
    ),
    item: undefined,
  };
}
//@ chunk-b3a6nm9h.js:6871-6925 placement
/**
 * 宽松解析记忆文件（保留有损值的引用形式）。
 */
function parseMemoryFileLoose(text, filePath) {
  return parseMemoryFile(text, filePath, {
    quoteLossyValues: true,
  });
}
//@ chunk-b3a6nm9h.js:6925-6948 placement
/**
 * 空的 header 类拒绝说明。
 */
function emptyRefusalHeader() {
  return "";
}
//@ chunk-b3a6nm9h.js:6948-6971 placement
/**
 * 空的 copied_id 类拒绝说明。
 */
function emptyRefusalCopiedId() {
  return "";
}
//@ chunk-b3a6nm9h.js:6971-6994 placement
/**
 * 空的 item_keys 类拒绝说明。
 */
function emptyRefusalItemKeys() {
  return "";
}
//@ chunk-b3a6nm9h.js:6994-7017 placement
/**
 * 空的缺项类拒绝说明。
 */
function emptyRefusalMissingItem() {
  return "";
}
//@ chunk-b3a6nm9h.js:7017-7466 placement
/**
 * 给新记忆内容加来源会话与修改时间。
 */
function stampNewMemoryContent(filePath, content, memoryFile, modified) {
  let existingFile =
    memoryFile !== null && getMemoryMetadata(memoryFile.frontmatter, "originSessionId") === null
      ? memoryFile
      : null;
  if (existingFile !== null) {
    if (existingFile.rewriteHazard === undefined)
      return serializeMemoryFile(
        withMemoryMetadata(existingFile.frontmatter, {
          originSessionId: getSessionId(),
          modified,
        }),
        existingFile.body,
      );
    logForDebugging(
      `stampNewMemoryContent: not stamping provenance on ${filePath} \u2014 ${existingFile.rewriteHazard}`,
      {
        level: "warn",
      },
    );
  }
  let memoryFrontmatter = parseMemoryFrontmatter(content, modified);
  if (memoryFrontmatter === null) {
    logForDebugging(
      `stampNewMemoryContent: not dating ${filePath} \u2014 no faithful place for a modified line`,
      {
        level: "warn",
      },
    );
    return content;
  }
  return memoryFrontmatter;
}
//@ chunk-b3a6nm9h.js:7466-7533 placement
/**
 * 统一 BOM 与换行。
 */
function normalizeLineEndings(text) {
  return text.replace(/^\uFEFF/, "").replaceAll(
    `\r
`,
    `
`,
  );
}
//@ chunk-b3a6nm9h.js:7533-7570 placement
/**
 * 只含 claudeCodeItem 的键列表。
 */
var TYPEDTURN; // deferred: uses MAX_PROMOTED_ENTRIES of its import cycle while loading; runs once the cycle is complete
var CLAUDECODE_KEYS;
var CLAUDECODE_ITEM_KEYS;
deferInit("chunk-b3a6nm9h.js:7533", () => {
  TYPEDTURN = "typedTurn";
  CLAUDECODE_KEYS = [CLAUDECODEITEM, TYPEDTURN];
  CLAUDECODE_ITEM_KEYS = [CLAUDECODEITEM];
});
//@ chunk-b3a6nm9h.js:7570-8394 placement
/**
 * 写入时更新记忆前言（保留原值、记录写者）。
 */
function stampMemoryWrite(content, memoryFile, context, modified) {
  let { previous, writer, consent, account, prior } = context;
  let previousFile =
    previous === null || !FRONTMATTER_REGEX.test(normalizeLineEndings(previous))
      ? undefined
      : parseMemoryFile(normalizeLineEndings(previous), undefined, {
          quoteLossyValues: true,
        });
  let bodyChanged =
    previousFile === undefined ||
    !import_sortedIndex_2(
      pickComparableFields(previousFile),
      pickComparableFields(
        parseMemoryFile(normalizeLineEndings(content), undefined, {
          quoteLossyValues: true,
        }),
      ),
    );
  let item;
  if (prior !== undefined) {
    item = {
      ...prior.fields,
      id: prior.id,
      ...(!prior.trusted && {
        src: "inferred",
        typed: null,
      }),
    };
    if (item.scope === "unknown" && prior.trusted)
      item = {
        ...item,
        scope: getMemoryScope(memoryFile.frontmatter),
      };
    if (bodyChanged) {
      item =
        item.src === "typed" && writer.src === "typed"
          ? {
              ...item,
              typed: writer.typed,
            }
          : {
              ...item,
              src: "inferred",
              typed: null,
            };
      if (consent === "off")
        item = {
          ...item,
          consent: "off",
        };
    }
  } else {
    let isNew = previous === null || context.mintAsNew === true;
    item = {
      id: randomUUID(),
      minted: modified,
      state: isNew ? "pending" : "legacy",
      consent,
      account,
      src: previous === null ? writer.src : "inferred",
      typed: previous === null && writer.src === "typed" ? writer.typed : null,
      scope: getMemoryScope(memoryFile.frontmatter),
      promoted: [],
      ids: [],
    };
  }
  let result = restampMemoryContent(content, memoryFile, item, modified);
  return result === "unchanged"
    ? {
        content: undefined,
        item,
      }
    : result === undefined
      ? undefined
      : {
          content: result,
          item,
        };
}
//@ chunk-b3a6nm9h.js:8394-8876 placement
/**
 * 必要时更新记忆前言，否则返回 unchanged。
 */
function restampMemoryContent(originalContent, memoryFile, item, modified) {
  let freshMetadata = {
    originSessionId: getMemoryMetadata(memoryFile.frontmatter, "originSessionId") ?? getSessionId(),
    modified,
  };
  if (memoryFile.rewriteHazard === undefined) {
    if (
      import_sortedIndex_2(claudeCodeItemMeta(memoryFile.frontmatter), serializeItemMetadata(item)) &&
      getMemoryMetadata(memoryFile.frontmatter, TYPEDTURN) === null &&
      !hasManagedMetadataKeys(originalContent) &&
      !hasEmptyListKeys(originalContent)
    )
      return "unchanged";
    let rewritten = import_sortedIndex_2(parseMemoryFile(originalContent).frontmatter, memoryFile.frontmatter)
      ? rewriteFrontmatterKeys(originalContent, item, freshMetadata)
      : undefined;
    if (
      rewritten !== undefined &&
      ((text) =>
        countCharInString(
          STRICT_FRONTMATTER_REGEX.exec(text)?.[0] ?? "",
          `
`,
        ) <= MAX_UNTRUSTED_FRONTMATTER_LINES)(rewritten)
    )
      return rewritten;
    let serialized = serializeMemoryFile(
      withMemoryMetadata(memoryFile.frontmatter, {
        [CLAUDECODEITEM]: omitAlias(serializeItemMetadata(item), ITEM_METADATA_KEYS),
        [TYPEDTURN]: null,
        ...freshMetadata,
      }),
      memoryFile.body,
    );
    let inserted = insertMetadataLines(serialized, item);
    return isMetadataUnchanged(inserted, parseMemoryFile(serialized), item)
      ? inserted
      : (rewritten ?? rewriteFrontmatterKeys(originalContent, item, freshMetadata));
  }
  return rewriteFrontmatterKeys(originalContent, item, freshMetadata);
}
//@ chunk-b3a6nm9h.js:8876-9158 placement
function isMetadataUnchanged(text, memoryFile, item) {
  let frontmatter = parseMemoryFile(text).frontmatter;
  if (!isPlainFrontmatter(text)) return false;
  let pickManagedMetadata = (metadata) =>
    import_reject(metadata, (value, key) =>
      [...CLAUDECODE_KEYS, "originSessionId", "modified", "node_type"].includes(key),
    );
  return (
    import_sortedIndex_2(readItemMetadata(frontmatter), item) &&
    frontmatter.name === memoryFile.frontmatter.name &&
    frontmatter.description === memoryFile.frontmatter.description &&
    import_sortedIndex_2(
      pickManagedMetadata(frontmatter.metadata),
      pickManagedMetadata(memoryFile.frontmatter.metadata),
    )
  );
}
//@ chunk-b3a6nm9h.js:9158-9192 placement
/**
 * item 元数据里需要序列化的键。
 */
var ITEM_METADATA_KEYS = ["typed", "promoted", "ids"];
//@ chunk-b3a6nm9h.js:9192-9280 placement
/**
 * 生成 item 元数据的前言行。
 */
function metadataLines(item, indent) {
  let serialized = serializeItemMetadata(item);
  return ITEM_METADATA_KEYS.flatMap((key) =>
    serialized[key] === undefined ? [] : [indent + key + ": " + jsonStringify(serialized[key])],
  );
}
//@ chunk-b3a6nm9h.js:9280-9675 placement
/**
 * 在前言中查找元数据块。
 */
function findMetadataBlock(lines) {
  let lastIndex = lines.findLastIndex((line, lineIndex) => lineIndex > 0 && line.trim() === "---");
  let index = lines.findIndex(
    (line, lineIndex) => lineIndex > 0 && lineIndex < lastIndex && METADATA_BLOCK_RE.test(line),
  );
  if (index === -1) return;
  let regExp = new RegExp(`^(\\s+)(["']?)` + CLAUDECODEITEM + "\\2\\s*:\\s*$");
  for (let lineIndex = index + 1; lineIndex < lastIndex; lineIndex++) {
    let line = lines[lineIndex];
    if (!COMMENT_OR_EMPTY_RE.test(line) && leadingSpaces(line) === 0) return;
    let match = regExp.exec(line);
    if (match === null) continue;
    let blockEnd = lineIndex + 1;
    while (
      blockEnd < lastIndex &&
      (COMMENT_OR_EMPTY_RE.test(lines[blockEnd]) || leadingSpaces(lines[blockEnd]) > match[1].length)
    )
      blockEnd++;
    while (blockEnd > lineIndex + 1 && COMMENT_OR_EMPTY_RE.test(lines[blockEnd - 1])) blockEnd--;
    return [lineIndex, blockEnd];
  }
  return;
}
//@ chunk-b3a6nm9h.js:9675-9927 placement
function insertMetadataLines(text, item) {
  let frontmatterText = FRONTMATTER_REGEX.exec(text)?.[0];
  if (frontmatterText === undefined) return text;
  let lines = frontmatterText.split(`
`);
  let metadataBlock = findMetadataBlock(lines);
  if (metadataBlock === undefined) return text;
  let [blockStart, blockEnd] = metadataBlock;
  let indent =
    blockEnd > blockStart + 1
      ? " ".repeat(leadingSpaces(lines[blockStart + 1]))
      : " ".repeat(leadingSpaces(lines[blockStart]) + 2);
  return (
    [...lines.slice(0, blockEnd), ...metadataLines(item, indent), ...lines.slice(blockEnd)].join(`
`) + text.slice(frontmatterText.length)
  );
}
//@ chunk-b3a6nm9h.js:9927-10083 placement
function hasEmptyListKeys(text) {
  let lines = (FRONTMATTER_REGEX.exec(text)?.[0] ?? "").split(`
`);
  let metadataBlock = findMetadataBlock(lines);
  return (
    metadataBlock !== undefined &&
    lines
      .slice(metadataBlock[0] + 1, metadataBlock[1])
      .some((line) => /^\s*(typed|promoted|ids)\s*:\s*$/.test(line))
  );
}
//@ chunk-b3a6nm9h.js:10083-10284 placement
function pickComparableFields(memoryFile) {
  let metadata = import_reject(
    memoryFile.frontmatter.metadata,
    (value, key) => CLAUDECODE_KEYS.includes(key) || key === "originSessionId" || key === "modified",
  );
  return {
    name: memoryFile.frontmatter.name,
    description: memoryFile.frontmatter.description,
    metadata,
    body: memoryFile.body,
  };
}
//@ chunk-b3a6nm9h.js:10284-10396 placement
function hasManagedMetadataKeys(text) {
  return (FRONTMATTER_REGEX.exec(text)?.[0] ?? "")
    .split(
      `
`,
    )
    .some((line) => CLAUDECODE_KEYS.some((key) => new RegExp("^" + key + "\\s*:").test(line)));
}
//@ chunk-b3a6nm9h.js:10396-10486 placement
/**
 * 匹配 metadata: 起始行（可带值）。
 */
var METADATA_BLOCK_RE = /^(["']?)metadata\1\s*:\s*(&\S+\s*)?(!\S+\s*)?(#.*)?$/;
var METADATA_START_RE = /^(["']?)metadata\1\s*:/;
//@ chunk-b3a6nm9h.js:10486-10520 placement
/**
 * 判断文本是否匹配前言正则。
 */
function matchesFrontmatter(text) {
  return regExp_2.test(text);
}
//@ chunk-b3a6nm9h.js:10520-10608 placement
var regExp_2; // deferred: uses MAX_PROMOTED_ENTRIES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b3a6nm9h.js:10520", () => {
  regExp_2 = new RegExp(
    `^[ \\t]*(-[ \\t]+)*((&|!)\\S*[ \\t]+)*["']?` + CLAUDECODEITEM + `["']?[ \\t]*:`,
    "m",
  );
});
//@ chunk-b3a6nm9h.js:10608-10748 placement
function hasNestedKey(value, key) {
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  if (!import_isPlainObject(value)) return false;
  return Object.entries(value).some(([key_2, value]) => key_2 === key || hasNestedKey(value, key));
}
//@ chunk-b3a6nm9h.js:10748-10968 placement
function countOccurrences_2(value, needle) {
  let countIn = (text) => text.split(needle).length - 1;
  if (typeof value === "string") return countIn(value);
  if (Array.isArray(value)) return value.reduce((acc, item) => acc + countOccurrences_2(item, needle), 0);
  if (!import_isPlainObject(value)) return 0;
  return Object.entries(value).reduce(
    (acc, [key, value]) => acc + countIn(key) + countOccurrences_2(value, needle),
    0,
  );
}
//@ chunk-b3a6nm9h.js:10968-11012 placement
/**
 * 统计子串出现次数。
 */
function countOccurrences(text, needle) {
  return text.split(needle).length - 1;
}
//@ chunk-b3a6nm9h.js:11012-11211 placement
function hasYamlAliases(text) {
  let aliasNames = (marker) =>
    new Set(
      [...text.matchAll(new RegExp("(^|[\\s[{,:-])\\" + marker + "([^\\s,[\\]{}]+)", "gm"))].map(
        (match) => match[2],
      ),
    );
  let declaredAnchors = aliasNames("&");
  return (
    [...aliasNames("*")].some((aliasName) => declaredAnchors.has(aliasName)) || /(^|\s)<<[ \t]*:/m.test(text)
  );
}
//@ chunk-b3a6nm9h.js:11211-11860 placement
/**
 * 规范化前言（BOM、分隔线）。
 */
function normalizeFrontmatter(text) {
  if (text.startsWith("\uFEFF")) {
    let normalized = normalizeFrontmatter(text.slice(1));
    return normalized === undefined ? undefined : "\uFEFF" + normalized;
  }
  if (!/^---/.test(text)) return text;
  let frontmatterObject = parseFrontmatterObject(text);
  if (!(
    frontmatterObject !== undefined &&
    /^---[ \t]*\r?\n/.test(text) &&
    FRONTMATTER_REGEX.test(text) &&
    !hasLooseFrontmatter(text)
  ))
    return mentionsItemKey(text) || hasRiskyQuotedEscapes(text) ? undefined : text;
  let strictFrontmatter = text.match(STRICT_FRONTMATTER_REGEX)?.[0] ?? "";
  if (hasNestedKey(frontmatterObject, CLAUDECODEITEM) && hasYamlAliases(strictFrontmatter)) return;
  let stripped = withoutFrontmatterKeys(text, CLAUDECODE_ITEM_KEYS, {
    topLevel: false,
  });
  let strippedObject = stripped === undefined ? undefined : parseFrontmatterObject(stripped);
  let strictParseFailed =
    parseFrontmatterObject(text, {
      lenient: false,
    }) === undefined;
  let metadataOf = (object) => object.metadata ?? {};
  let strippedFrontmatter = stripped?.match(STRICT_FRONTMATTER_REGEX)?.[0] ?? "";
  return strippedObject !== undefined &&
    !hasNestedKey(strippedObject, CLAUDECODEITEM) &&
    countOccurrences(strippedFrontmatter, CLAUDECODEITEM) ===
      countOccurrences_2(strippedObject, CLAUDECODEITEM) &&
    !(
      countOccurrences_2(strippedObject, CLAUDECODEITEM) > 0 &&
      (strippedFrontmatter.includes("\\") || hasYamlAliases(strippedFrontmatter))
    ) &&
    !(
      strictParseFailed &&
      (mentionsItemKey(stripped?.match(STRICT_FRONTMATTER_REGEX)?.[0] ?? "") ||
        hasRiskyQuotedEscapes(strictFrontmatter))
    ) &&
    import_sortedIndex_2(omitAlias(strippedObject, "metadata"), omitAlias(frontmatterObject, "metadata")) &&
    import_sortedIndex_2(
      metadataOf(strippedObject),
      import_isPlainObject(frontmatterObject.metadata)
        ? omitAlias(frontmatterObject.metadata, CLAUDECODEITEM)
        : metadataOf(frontmatterObject),
    )
    ? stripped
    : undefined;
}
//@ chunk-b3a6nm9h.js:11860-11897 placement
/**
 * 判断文本里是否含 claudeCodeItem 键。
 */
function mentionsItemKey(text) {
  return text.includes(CLAUDECODEITEM);
}
//@ chunk-b3a6nm9h.js:11897-12026 placement
function hasRiskyQuotedEscapes(text) {
  return text
    .split(/\r\n?|\n/)
    .some((line) => line.includes('"') && (/\\[xuU][0-9A-Fa-f]/.test(line) || line.trimEnd().endsWith("\\")));
}
//@ chunk-b3a6nm9h.js:12026-12215 placement
function parseFrontmatterObject(text, { lenient = true } = {}) {
  let body = text.match(STRICT_FRONTMATTER_REGEX)?.[1];
  if (body === undefined) return;
  if (!lenient)
    try {
      let yaml = parseYaml(body);
      return import_isPlainObject(yaml) ? yaml : undefined;
    } catch {
      return;
    }
  let yamlLenient = parseYamlLenient(body);
  return yamlLenient.ok && import_isPlainObject(yamlLenient.value) ? yamlLenient.value : undefined;
}
//@ chunk-b3a6nm9h.js:12215-12323 placement
function isPlainFrontmatter(text) {
  let frontmatterObject = parseFrontmatterObject(text);
  return (
    frontmatterObject !== undefined &&
    ![...CLAUDECODE_KEYS, "originSessionId", "modified"].some((key) => frontmatterObject[key] !== undefined)
  );
}
//@ chunk-b3a6nm9h.js:12323-12445 placement
function hasLooseFrontmatter(text) {
  let looseBody = FRONTMATTER_REGEX.exec(text)?.[1];
  if (looseBody === undefined) return false;
  let strictBody = text.match(STRICT_FRONTMATTER_REGEX)?.[1];
  return strictBody === undefined || looseBody.trim() !== strictBody.trim();
}
//@ chunk-b3a6nm9h.js:12445-13518 placement
/**
 * 重写前言中的指定键。
 */
function rewriteFrontmatterKeys(text, item, metadata) {
  let match = FRONTMATTER_REGEX.exec(text);
  if (match === null || hasLooseFrontmatter(text)) return;
  let frontmatterText = match[0];
  let lines = stripFrontmatterKeys(
    frontmatterText.split(`
`),
    [...CLAUDECODE_KEYS, "originSessionId", "modified"],
  );
  let lastIndex = lines.findLastIndex((line, lineIndex) => lineIndex > 0 && line.trim() === "---");
  if (lastIndex === -1) return;
  let metadata_2 = parseMemoryFile(
    lines.join(`
`) + text.slice(frontmatterText.length),
  ).frontmatter.metadata;
  if ([...CLAUDECODE_KEYS, "originSessionId", "modified"].some((key) => metadata_2[key] !== undefined))
    return;
  let index = lines.findIndex(
    (line, lineIndex) => lineIndex > 0 && lineIndex < lastIndex && METADATA_BLOCK_RE.test(line),
  );
  if (index === -1) return;
  let insertAt = index + 1;
  let childIndent;
  while (insertAt < lastIndex) {
    let line = lines[insertAt];
    if (line.trim() === "" || /^\s*#/.test(line)) {
      insertAt++;
      continue;
    }
    if (leadingSpaces(line) === 0) break;
    childIndent ??= leadingSpaces(line);
    insertAt++;
  }
  let indent = " ".repeat(childIndent ?? 2);
  let indentedLines = (object, prefix) =>
    serializeFrontmatter(object)
      .trimEnd()
      .split(
        `
`,
      )
      .map((line) => prefix + line);
  let addedLines = [
    ...indentedLines(
      {
        [CLAUDECODEITEM]: omitAlias(serializeItemMetadata(item), ITEM_METADATA_KEYS),
      },
      indent,
    ),
    ...metadataLines(item, indent + "  "),
    ...indentedLines(metadata, indent),
  ];
  let result =
    [...lines.slice(0, insertAt), ...addedLines, ...lines.slice(insertAt)].join(`
`) + text.slice(frontmatterText.length);
  if (!isPlainFrontmatter(result)) return;
  let frontmatter = parseMemoryFile(result).frontmatter;
  let actualMetadata = {
    item: readItemMetadata(frontmatter),
    turn: frontmatter.metadata[TYPEDTURN],
    originSessionId: frontmatter.metadata.originSessionId,
    modified: frontmatter.metadata.modified,
  };
  let wantedMetadata = {
    item,
    turn: undefined,
    ...metadata,
  };
  let frontmatter_2 = parseMemoryFile(text).frontmatter;
  let pickManagedMetadata = (metadata) =>
    import_reject(metadata, (value, key) =>
      [...CLAUDECODE_KEYS, "originSessionId", "modified"].includes(key),
    );
  return import_sortedIndex_2(actualMetadata, wantedMetadata) &&
    frontmatter.name === frontmatter_2.name &&
    frontmatter.description === frontmatter_2.description &&
    import_sortedIndex_2(
      pickManagedMetadata(frontmatter.metadata),
      pickManagedMetadata(frontmatter_2.metadata),
    )
    ? result
    : undefined;
}
//@ chunk-b3a6nm9h.js:13518-13569 placement
/**
 * 计算行首缩进宽度。
 */
function leadingSpaces(line) {
  return line.length - line.trimStart().length;
}
//@ chunk-b3a6nm9h.js:13569-14078 placement
/**
 * 删除前言中的指定键。
 */
function stripFrontmatterKeys(lines, keys, { topLevel = true } = {}) {
  let regExp = new RegExp(`^(\\s*)(["']?)(` + keys.join("|") + ")\\2\\s*:");
  let kept = [];
  let inMetadataBlock = false;
  let metadataIndent;
  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx];
    let lineIndent = leadingSpaces(line);
    let matches = /^\s*#/.test(line);
    if (idx > 0 && lineIndent === 0 && line.trim() !== "" && !matches) {
      inMetadataBlock = METADATA_BLOCK_RE.test(line);
      metadataIndent = undefined;
    } else if (inMetadataBlock && metadataIndent === undefined && line.trim() !== "" && !matches)
      metadataIndent = lineIndent;
    if (
      !(
        regExp.exec(line) !== null &&
        ((topLevel && lineIndent === 0) || (inMetadataBlock && lineIndent === metadataIndent))
      ) ||
      idx === 0 ||
      idx === lines.length - 1
    ) {
      kept.push(line);
      continue;
    }
    let removeUntil = idx;
    for (let idx_2 = idx + 1; idx_2 < lines.length - 1; idx_2++) {
      let innerLine = lines[idx_2];
      if (COMMENT_OR_EMPTY_RE.test(innerLine)) continue;
      if (
        leadingSpaces(innerLine) > lineIndent ||
        (leadingSpaces(innerLine) === lineIndent && /^\s*-(\s|$)/.test(innerLine))
      ) {
        removeUntil = idx_2;
        continue;
      }
      break;
    }
    idx = removeUntil;
  }
  return kept;
}
//@ chunk-b3a6nm9h.js:14078-14437 placement
/**
 * 去掉前言中的保留键。
 */
function withoutFrontmatterKeys(text, keys = CLAUDECODE_KEYS, { topLevel = true } = {}) {
  let frontmatterText = FRONTMATTER_REGEX.exec(text)?.[0];
  if (frontmatterText === undefined) return text;
  if (hasLooseFrontmatter(text)) {
    let lines = (text.match(STRICT_FRONTMATTER_REGEX)?.[0] ?? text).split(`
`);
    return stripFrontmatterKeys(lines, keys, {
      topLevel,
    }).length === lines.length
      ? text
      : undefined;
  }
  let stripped =
    stripFrontmatterKeys(
      frontmatterText.split(`
`),
      keys,
      {
        topLevel,
      },
    ).join(`
`) + text.slice(frontmatterText.length);
  let metadata = parseMemoryFile(stripped).frontmatter.metadata;
  let nestedMetadata = topLevel ? {} : frontmatterLines(stripped);
  return keys.some(
    (key) =>
      metadata[key] !== undefined && (topLevel || !import_sortedIndex_2(metadata[key], nestedMetadata[key])),
  )
    ? undefined
    : stripped;
}
//@ chunk-b3a6nm9h.js:14437-14737 placement
/**
 * 前言的行。
 */
function frontmatterLines(text) {
  let frontmatterText = FRONTMATTER_REGEX.exec(text)?.[0];
  if (frontmatterText === undefined) return {};
  let lines = frontmatterText.split(`
`);
  let kept = [];
  let inMetadata = false;
  for (let [lineIndex, line] of lines.entries()) {
    let indent = leadingSpaces(line);
    if (lineIndex > 0 && indent === 0 && line.trim() !== "" && !/^\s*#/.test(line))
      inMetadata = METADATA_START_RE.test(line);
    if (!inMetadata || lineIndex === lines.length - 1 || line.trim() === "---") kept.push(line);
  }
  return parseMemoryFile(
    kept.join(`
`) + text.slice(frontmatterText.length),
  ).frontmatter.metadata;
}
//@ chunk-b3a6nm9h.js:14737-14956 placement
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
//@ chunk-b3a6nm9h.js:14956-15723 placement
/**
 * 解析记忆前言（name、description、metadata）。
 */
function parseMemoryFrontmatter(text, modifiedLine) {
  let match = text.match(FRONTMATTER_REGEX);
  let match_2 = text.match(STRICT_FRONTMATTER_REGEX);
  if (match === null || match_2 === null || match[1].trim() !== match_2[1].trim()) return null;
  let memoryFile = parseMemoryFile(text);
  let { name, description, metadata } = memoryFile.frontmatter;
  if (name === null && description === null && Object.keys(metadata).length === 0) return null;
  let frontmatterLength = match_2[0].length;
  let lines = text.slice(0, frontmatterLength).split(`
`);
  let crlf = text.slice(0, frontmatterLength).includes(`\r
`)
    ? "\r"
    : "";
  let makeModifiedLine = (indent, comment = "") => `${indent}modified: ${modifiedLine}${comment}${crlf}`;
  let flattened = lines.flatMap((line, lineIndex) =>
    lineIndex > 0 && lineIndex < lines.length - 1 && MODIFIED_LINE_RE.test(line) ? [lineIndex] : [],
  );
  if (flattened.length > 1 || (flattened.length === 0 && "modified" in metadata)) return null;
  let modifiedLineIndex = flattened[0];
  let updatedLines =
    modifiedLineIndex !== undefined
      ? [
          ...lines.slice(0, modifiedLineIndex),
          makeModifiedLine(...splitModifiedLine(stripTrailingCR(lines[modifiedLineIndex]))),
          ...lines.slice(modifiedLineIndex + 1),
        ]
      : findMetadataInsertion(lines, makeModifiedLine);
  if (updatedLines === null) return null;
  let result =
    updatedLines.join(`
`) + text.slice(frontmatterLength);
  let memoryFile_2 = parseMemoryFile(result);
  let match_3 = result.match(STRICT_FRONTMATTER_REGEX);
  return import_sortedIndex_2(memoryFile_2.frontmatter, {
    ...memoryFile.frontmatter,
    metadata: {
      ...metadata,
      modified: modifiedLine,
    },
  }) &&
    memoryFile_2.body === memoryFile.body &&
    match_3 !== null &&
    result.slice(match_3[0].length) === text.slice(frontmatterLength)
    ? result
    : null;
}
//@ chunk-b3a6nm9h.js:15723-15764 placement
/**
 * 去掉行尾的 \r。
 */
function stripTrailingCR(line) {
  return line.replace(/\r$/, "");
}
//@ chunk-b3a6nm9h.js:15764-15903 placement
function splitModifiedLine(line) {
  let [, indent, rest] = line.match(/^(\s*)modified\s*:([\s\S]*)$/);
  return [indent, /^["']/.test(rest.trimStart()) ? "" : (rest.match(/([ \t]+#.*)$/)?.[1] ?? "")];
}
//@ chunk-b3a6nm9h.js:15903-15962 placement
/**
 * 在指定位置插入一行。
 */
function insertAt(lines, index, line) {
  return [...lines.slice(0, index), line, ...lines.slice(index)];
}
//@ chunk-b3a6nm9h.js:15962-16333 placement
/**
 * 找到插入 metadata 的位置。
 */
function findMetadataInsertion(lines, makeLines) {
  let index = lines.findIndex((line, lineIndex) => lineIndex > 0 && /^metadata:/.test(stripTrailingCR(line)));
  let blockStart = lines.findIndex(
    (line, lineIndex) => lineIndex > 0 && /^metadata:\s*(#.*)?$/.test(stripTrailingCR(line)),
  );
  if (index !== -1 && blockStart === -1) return null;
  if (blockStart === -1) {
    let index = lines.findLastIndex((line) => stripTrailingCR(line).trim() === "---");
    return index > 0 ? insertAt(lines, index, makeLines("")) : null;
  }
  let blockEnd = skipContinuationLines(lines, blockStart);
  let childIndent =
    lines
      .slice(blockStart + 1, blockEnd)
      .find(
        (line) =>
          INDENTED_LINE_RE.test(stripTrailingCR(line)) && !COMMENT_OR_EMPTY_RE.test(stripTrailingCR(line)),
      )
      ?.match(/^(\s+)/)?.[1] ?? "  ";
  return insertAt(lines, blockEnd, makeLines(childIndent));
}
//@ chunk-b3a6nm9h.js:16333-16548 placement
function skipContinuationLines(lines, blockStart) {
  let lineIndex = blockStart + 1;
  while (lineIndex < lines.length - 1) {
    if (INDENTED_LINE_RE.test(stripTrailingCR(lines[lineIndex]))) {
      lineIndex++;
      continue;
    }
    if (COMMENT_OR_EMPTY_RE.test(stripTrailingCR(lines[lineIndex]))) {
      let nextContentIndex = lineIndex + 1;
      while (
        nextContentIndex < lines.length - 1 &&
        COMMENT_OR_EMPTY_RE.test(stripTrailingCR(lines[nextContentIndex]))
      )
        nextContentIndex++;
      if (
        nextContentIndex < lines.length - 1 &&
        INDENTED_LINE_RE.test(stripTrailingCR(lines[nextContentIndex]))
      ) {
        lineIndex = nextContentIndex;
        continue;
      }
    }
    break;
  }
  return lineIndex;
}
export {
  prepareMemoryContent,
  normalizeFrontmatter,
  claudeCodeItemMeta,
  CLAUDECODEITEM,
  matchesFrontmatter,
  emptyRefusalItemKeys,
  prepareContent,
};
