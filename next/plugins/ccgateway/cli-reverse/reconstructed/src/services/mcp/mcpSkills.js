/**
 * services/mcp/mcpSkills.ts
 *
 * 2.1.316 新增：MCP 资源提供的技能（读取、校验技能条目与文件）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (30), chunk-5z459rz9.js (3), chunk-ng0fxkj9.js (2)
 * attribution: placement 34, layout 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  numberSchema,
  custom as custom_2,
  union,
  array,
  literal,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { escapeXmlAttribute as escapeXmlAttribute_2 } from "../../utils/permissions/checkRegistry.js";
import { recursivelySanitizeUnicode } from "../../utils/sanitization.js";
import { messagesSinceCompactBoundary } from "../projects/threadRows.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { normalizeMimeType } from "../../utils/mcpOutputStorage.js";
import { identityId2 } from "../../types/ids.js";
import { getConnectionTimeoutMs } from "./client.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ng0fxkj9.js:191-232 placement
var IO_MODELCONTEXTPROTOCOL_SKILLS = "io.modelcontextprotocol/skills";
//@ chunk-ng0fxkj9.js:232-256 placement
/**
 * 恒返回 false 的开关占位。
 */
function alwaysFalse() {
  return false;
}
//@ chunk-5xgkngpb.js:1698506-1698635 placement
function skillRootOfUri(uri) {
  if (!uri.endsWith("/SKILL.md")) return;
  let sliced = uri.slice(0, -9);
  if (!/^[a-z][a-z0-9+.-]*:\/*[^/]/i.test(sliced)) return;
  return sliced;
}
//@ chunk-5xgkngpb.js:1698635-1698647 placement
/**
 * 单个技能最多包含的资源文件数（512）。
 */
var MAX_SKILL_RESOURCES = 512;
//@ chunk-5xgkngpb.js:1698647-1698660 placement
/**
 * 资源 URI 的最大字节数（2048）。
 */
var MAX_RESOURCE_URI_BYTES = 2048;
//@ chunk-5xgkngpb.js:1698660-1700086 placement
/**
 * 单个技能文件的 schema（uri、frontmatter、resources）。
 */
var MCP_SKILL_ENTRY_PROBLEMS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var skillEntrySchema;
var skillFileSchema;
deferInit("chunk-5xgkngpb.js:1698660", () => {
  MCP_SKILL_ENTRY_PROBLEMS = {
    invalid_entry: "with an entry that is not a valid skill entry",
    uri_too_long: `with a URI longer than ${MAX_RESOURCE_URI_BYTES} bytes`,
    frontmatter_too_large: "with frontmatter larger than Claude Code reads",
    invalid_name: "with a name or last URI segment that is not a valid skill name",
    name_mismatch: "with a name that differs from the URI's last segment",
    invalid_manifest: "with a file list that omits SKILL.md, repeats a file, or leaves the skill directory",
    too_many_resources: `with more than ${MAX_SKILL_RESOURCES} files`,
    too_large: "larger than 16 MiB",
    skill_md_too_large: "with a SKILL.md over 1 MB",
    dynamic_declined: "generated dynamically (no file list to verify)",
    unshowable_uri:
      "with a directory URI that holds a hidden or control character, a double quote, an angle bracket, or a character that Unicode normalization rewrites (the server can percent-encode it)",
    placeholder_uri:
      "with a directory URI that holds a dollar sign, which a placeholder such as $ARGUMENTS in a skill's text uses (the server can write it as %24)",
    unparseable_uri:
      "with a directory URI whose scheme and host part a URL parser cannot read, for example a space in the host name, or a colon that is followed by text that is not a port number up to 65535 (the server can write that part as a valid URL)",
  };
  skillEntrySchema = DoctorLazy(() =>
    objectSchema({
      uri: stringSchema(),
      digest: stringSchema().regex(/^sha256:[0-9a-f]{64}$/),
      size: numberSchema().int().nonnegative(),
    }),
  );
  skillFileSchema = DoctorLazy(() =>
    objectSchema({
      uri: stringSchema(),
      frontmatter: custom_2(isSkillEntryShape),
      resources: union([array(skillEntrySchema()), literal("dynamic")]),
    }),
  );
});
//@ chunk-5xgkngpb.js:1700086-1700281 placement
function isSkillEntryShape(entry) {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return false;
  let name = Reflect.get(entry, "name");
  let description = Reflect.get(entry, "description");
  return typeof name === "string" && name.length > 0 && typeof description === "string";
}
//@ chunk-5xgkngpb.js:1700281-1700346 placement
/**
 * 判断技能 URI 是否含需转义或需规范化的字符。
 */
function hasUnsafeSkillUri(uri) {
  try {
    return escapeXmlAttribute_2(uri) !== uri || recursivelySanitizeUnicode(uri) !== uri;
  } catch {
    return true;
  }
}
//@ chunk-5xgkngpb.js:1700346-1700478 placement
function originPrefix(uri) {
  let prefix = /^[a-z][a-z0-9+.-]*:(\/\/[^/?#]*)?/i.exec(uri)?.[0] ?? "";
  let urlOrNull = parseUrlOrNull(prefix);
  return urlOrNull === null
    ? undefined
    : {
        url: urlOrNull,
        length: prefix.length,
      };
}
//@ chunk-5xgkngpb.js:1700478-1700515 placement
/**
 * 判断 URI 能否被解析。
 */
function isParsableUri(text) {
  return parseUrlOrNull(text) !== null;
}
//@ chunk-5xgkngpb.js:1700515-1700551 placement
/**
 * 解析 URL，失败返回 null。
 */
function parseUrlOrNull(text) {
  return URL.parse(text);
}
//@ chunk-5xgkngpb.js:1700551-1701032 placement
/**
 * 从读取结果中取出技能文件字节（文本或 base64 blob），URI 不符或大小超出时返回错误原因。
 */
function readSkillFileContents(contents, uri, maxSize) {
  let only = contents.length === 1 ? contents[0] : undefined;
  if (!only || only.uri !== uri)
    return {
      ok: false,
      reason: "unexpected_contents",
    };
  if (typeof only.text === "string") {
    if (only.text.length > maxSize)
      return {
        ok: false,
        reason: "size_mismatch",
      };
    return {
      ok: true,
      bytes: new TextEncoder().encode(only.text),
      from: "text",
    };
  }
  if (typeof only.blob === "string") {
    if (only.blob.length > 4 * Math.ceil(maxSize / 3))
      return {
        ok: false,
        reason: "size_mismatch",
      };
    return {
      ok: true,
      bytes: new Uint8Array(Buffer.from(only.blob, "base64")),
      from: "blob",
    };
  }
  return {
    ok: false,
    reason: "unexpected_contents",
  };
}
//@ chunk-5xgkngpb.js:1701032-1701137 placement
function toInvokedMcpSkill(name, mcpSkill, texts) {
  let mcpSkillEntry = parseMcpSkillEntry(mcpSkill);
  return mcpSkillEntry
    ? {
        skillName: typeof name === "string" ? name : mcpSkillEntry.uri,
        entry: mcpSkillEntry,
        texts,
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:1701137-1701831 placement
/**
 * 遍历消息历史，产出已调用的 MCP 技能（来自技能消息或 invoked_skills 附件）。
 */
function* invokedMcpSkills(messages, inputMessages) {
  for (let message of messagesSinceCompactBoundary([...messages]))
    if (message.type === "user" && message.mcpSkill != null) {
      let content = message.isMeta ? message.message.content : [];
      let texts =
        typeof content === "string"
          ? [content]
          : content.flatMap((block) => (block.type === "text" ? [block.text] : []));
      let invokedMcpSkill = toInvokedMcpSkill(message.mcpSkill.name, message.mcpSkill, texts);
      if (invokedMcpSkill) yield invokedMcpSkill;
      else inputMessages?.(message.mcpSkill.name);
    } else if (
      message.type === "attachment" &&
      message.attachment.type === "invoked_skills" &&
      Array.isArray(message.attachment.skills)
    ) {
      for (let skill of message.attachment.skills)
        if (
          typeof skill === "object" &&
          skill?.mcpSkill !== undefined &&
          typeof skill.content === "string" &&
          skill.content
        ) {
          let invokedMcpSkill = toInvokedMcpSkill(skill.name, skill.mcpSkill, [skill.content]);
          if (invokedMcpSkill) yield invokedMcpSkill;
          else inputMessages?.(skill.name);
        }
      let mcpSkillEntries = message.attachment.mcpSkillEntries;
      for (let entries of Array.isArray(mcpSkillEntries) ? mcpSkillEntries : []) {
        let invokedMcpSkill = toInvokedMcpSkill(entries?.name, entries?.mcpSkill, []);
        if (invokedMcpSkill) yield invokedMcpSkill;
        else inputMessages?.(entries?.name);
      }
    }
}
//@ chunk-5xgkngpb.js:1701831-1701877 placement
/**
 * 官方行为，保留：实现是 [...new Map().values()]（少了构造参数），恒返回空数组；唯一调用方 countUniqueFiles 因此永远只统计 extraFiles。疑似打包丢实参的 bug，忠实还原不改代码。
 */
function uniqueValues(ignored) {
  return [...new Map().values()];
}
//@ chunk-5xgkngpb.js:1701877-1702036 placement (2.1.88 match: countUniqueFiles, 0.714)
/**
 * 按服务器名合并两组位置并去重（归属疑似错误，不属于 LSPTool；被 ReadMcpResourceTool、attachments 使用）。
 */
function countUniqueFiles(name, files, extraFiles = []) {
  let unique = uniqueValues(files);
  return [
    ...uniqueValues(extraFiles).filter(
      (loc) => !unique.some((file) => file.serverName === loc.serverName && file.uri === loc.uri),
    ),
    ...unique,
  ].filter((file) => file.serverName === name);
}
//@ chunk-5xgkngpb.js:1702036-1702074 layout
async function fetchMcpSkillsForClient(client, messages, additional = []) {
  return [];
}
//@ chunk-5xgkngpb.js:1702074-1702106 placement
/**
 * 空实现（保留签名）。
 */
function noopSkillFetch(name, uri, maxSize, extraFiles = []) {
  return;
}
//@ chunk-5xgkngpb.js:1702106-1702131 placement
/**
 * 恒返回空数组。
 */
function emptyList_2(messages) {
  return [];
}
//@ chunk-5xgkngpb.js:1702131-1702231 placement
function findInvokedMcpSkill(messages, skillName, content) {
  let found;
  for (let skill of invokedMcpSkills(messages))
    if (skill.skillName === skillName && textsSuffixMatches(skill.texts, content)) found = skill.entry;
  return found;
}
//@ chunk-5xgkngpb.js:1702231-1702297 placement
/**
 * 判断文本数组的某个后缀是否等于给定字符串。
 */
function textsSuffixMatches(texts, content) {
  return texts.some(
    (text, index) =>
      texts.slice(index).join(`

`) === content,
  );
}
//@ chunk-5xgkngpb.js:1702297-1702626 placement
/**
 * 技能文件读取失败时给模型的说明：MCP 技能关闭、或由技能获取器处理，否则按原因与相关技能生成提示。
 */
async function unreadSkillFileMessage(failure) {
  let skillsOn = !alwaysFalse();
  if (skillsOn && failure.reason === "unlisted")
    return "This file was not read, because MCP skills are turned off for now. While they are off, this app reads no file of a loaded skill.";
  return (
    (await (skillsOn ? undefined : getCliOwnedState().skillsFetcher)?.settleFailedRead(failure)) ??
    skillFileProblemText(failure.uri, failure.reason) +
      failure.skills.map((skill) => loadedSkillNote(skill.skillName)).join("")
  );
}
//@ chunk-5xgkngpb.js:1702626-1703346 placement
/**
 * 判断一个资源 URI 与已加载 MCP 技能的关系：在某技能资源列表中（listed）、位于技能根下但未列出、写法不同、无法解析，或与技能无关（outside）。
 */
function classifySkillResourceUri(uri, skills) {
  if (skills.length === 0)
    return {
      case: "outside",
    };
  if (!isUriWithinLimit(uri))
    return {
      case: "unlisted",
      skills: [...skills],
      reason: "uri_too_long",
    };
  let rows = [];
  let matchedSkills = [];
  for (let skill of skills) {
    let found = skill.resources.find((resource) => resource.uri === uri);
    if (found !== undefined) {
      rows.push(found);
      matchedSkills.push(skill);
    }
  }
  if (rows.length > 0)
    return alwaysFalse()
      ? {
          case: "listed",
          rows,
          skills: matchedSkills,
        }
      : {
          case: "unlisted",
          skills: matchedSkills,
          reason: "unlisted",
        };
  let filtered = skills.filter((skill) => uri.startsWith(`${skill.root}/`));
  if (filtered.length > 0)
    return {
      case: "unlisted",
      skills: filtered,
      reason: "unlisted",
    };
  if (alwaysFalse())
    return {
      case: "unlisted",
      skills: [...skills],
      reason: "outside_loaded_skills",
    };
  let filtered_2 = skills.filter((skill) => isUrlUnderPrefix(uri, skill.root));
  if (filtered_2.length > 0)
    return {
      case: "unlisted",
      skills: filtered_2,
      reason: "other_spelling",
    };
  return isParsableUri(uri)
    ? {
        case: "outside",
      }
    : {
        case: "unlisted",
        skills: [...skills],
        reason: "unparseable_uri",
      };
}
//@ chunk-5xgkngpb.js:1703346-1703403 placement
/**
 * 规范化两边后判断 URL 是否位于某前缀之下（前缀补 /）。
 */
function isUrlUnderPrefix(url, root) {
  return normalizeUrlForCompare(url).startsWith(normalizeUrlForCompare(`${root}/`));
}
//@ chunk-5xgkngpb.js:1703403-1703574 placement (2.1.88 match: isPermittedRedirect, 0.808)
function normalizeUrlForCompare(url) {
  let originalHostWithoutWww = originPrefix(url);
  if (originalHostWithoutWww === undefined) return url;
  let { url: url_2 } = originalHostWithoutWww;
  url_2.hostname = url_2.hostname.toLowerCase();
  url_2.username = "";
  url_2.password = "";
  url_2.port = "";
  return url_2.href + url.slice(originalHostWithoutWww.length);
}
//@ chunk-5xgkngpb.js:1703574-1704101 placement
/**
 * 校验读取到的技能文件内容：大小与清单一致、sha256 摘要一致，按文本或 base64 blob 返回资源项。
 */
function verifySkillFile(contents, uri, rows) {
  let read = readSkillFileContents(contents, uri, Math.max(...rows.map((row) => row.size)));
  if (!read.ok) return read;
  if (rows.some((row) => row.size !== read.bytes.length))
    return {
      ok: false,
      reason: "size_mismatch",
    };
  let digest = `sha256:${computeContentHash(read.bytes)}`;
  if (rows.some((row) => row.digest !== digest))
    return {
      ok: false,
      reason: "digest_mismatch",
    };
  let mimeType = normalizeMimeType(contents[0]?.mimeType);
  let base = {
    uri,
    ...(mimeType !== undefined && {
      mimeType,
    }),
  };
  if (read.from === "blob") {
    let blob = Buffer.from(read.bytes).toString("base64");
    return {
      ok: true,
      item: {
        ...base,
        blob,
      },
    };
  }
  let textDecoder = new TextDecoder("utf-8", {
    fatal: true,
    ignoreBOM: true,
  });
  return {
    ok: true,
    item: {
      ...base,
      text: textDecoder.decode(read.bytes),
    },
  };
}
//@ chunk-5xgkngpb.js:1704101-1704409 placement
/**
 * 列出技能目录下的直接子条目（文件或子目录）。
 */
function skillDirectoryEntries(uri, skills) {
  let dirPrefix = `${uri}/`;
  let children = new Map();
  for (let { resources } of skills)
    for (let resource of resources) {
      if (!resource.uri.startsWith(dirPrefix)) continue;
      let index = resource.uri.indexOf("/", dirPrefix.length);
      if (index === -1) children.set(resource.uri, false);
      else if (!children.has(resource.uri.slice(0, index))) children.set(resource.uri.slice(0, index), true);
    }
  return children.size === 0
    ? undefined
    : Array.from(children, ([uri, isDirectory]) => ({
        uri,
        isDirectory,
      }));
}
//@ chunk-5xgkngpb.js:1704409-1706579 placement
/**
 * MCP 技能文件未被使用的原因文案（地址不属于该技能、前缀不对等）。
 */
var MCP_SKILL_FILE_PROBLEMS = {
  not_found:
    "This file was not used, because the skill lists it but the server reports no file at this address. Loading the skill again may fix this. If it does not, the server's owner can fix this.",
  unlisted:
    "This file was not used, because its address does not name a file of this skill. If the skill changed, loading it again may fix this. If it does not, the server's owner can fix this.",
  other_spelling:
    "This file was not used, because its address begins with another spelling of the address of this skill. Write that part exactly as the skill writes it.",
  unparseable_uri:
    "This file was not used, because its address is not a valid URL. While a skill from this server is loaded, this app reads a file only at a valid URL. Write the address as the server or the skill gives it.",
  outside_loaded_skills: `This resource was not read, because no skill that is loaded from this server lists this address. While a skill from this server is loaded, this tool reads from this server only the files that a loaded skill lists. For a file of a loaded skill, copy the address after "at" in that skill's first sentence, character for character, without the full stop. Then add "/" and the file's path. If this conversation does not hold that sentence, load that skill here: its first sentence then gives the address. To read a file of another skill of this server, load that skill first.`,
  uri_too_long: `This file was not used, because its address is longer than ${MAX_RESOURCE_URI_BYTES} bytes. While a skill from this server is loaded, this app reads a file only at an address of ${MAX_RESOURCE_URI_BYTES} bytes or less.`,
  size_mismatch:
    "This file was not used, because its content does not match the size that the server listed for it. Loading the skill again may fix this. If it does not, the server's owner can fix this.",
  digest_mismatch:
    "This file was not used, because its content does not match the checksum that the server listed for it. Loading the skill again may fix this. If it does not, the server's owner can fix this.",
  unexpected_contents:
    "This file was not used, because the server's answer did not hold exactly this one file, in a form that this app can read. The server's owner can fix this.",
};
//@ chunk-5xgkngpb.js:1706579-1706625 placement
/**
 * 生成 “The loaded skill is \"…\"” 的说明。
 */
function loadedSkillNote(skillName) {
  return ` The skill is "${skillName}".`;
}
//@ chunk-5xgkngpb.js:1706625-1706737 placement
function skillFileProblemText(uri, reason) {
  return `${reason === "uri_too_long" ? `An address of ${Buffer.byteLength(uri)} bytes` : escapeXmlAttribute_2(uri)}: ${MCP_SKILL_FILE_PROBLEMS[reason]}`;
}
//@ chunk-5xgkngpb.js:1706737-1706936 placement
var isUriWithinLimit; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var mcpSkillEntrySchema;
deferInit("chunk-5xgkngpb.js:1706737", () => {
  isUriWithinLimit = (uri) => Buffer.byteLength(uri) <= MAX_RESOURCE_URI_BYTES;
  mcpSkillEntrySchema = DoctorLazy(() =>
    objectSchema({
      serverName: stringSchema(),
      uri: stringSchema().refine((uri) => {
        let root = isUriWithinLimit(uri) ? skillRootOfUri(uri) : undefined;
        return root !== undefined && !hasUnsafeSkillUri(root);
      }),
      resources: array(skillEntrySchema().refine((resource) => isUriWithinLimit(resource.uri))).max(
        MAX_SKILL_RESOURCES,
      ),
    }),
  );
});
//@ chunk-5xgkngpb.js:1706936-1707099 placement
function parseMcpSkillEntry(entry) {
  let parseResult = mcpSkillEntrySchema().safeParse(entry);
  if (parseResult.success) return parseResult.data;
  let withoutResources = mcpSkillEntrySchema()
    .omit({
      resources: true,
    })
    .safeParse(entry);
  return withoutResources.success
    ? {
        ...withoutResources.data,
        resources: [],
      }
    : undefined;
}
//@ chunk-5z459rz9.js:1012-1095 placement
/**
 * 单个技能响应的 schema。
 */
var skillsListSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var singleSkillSchema;
deferInit("chunk-5z459rz9.js:1012", () => {
  skillsListSchema = DoctorLazy(() =>
    objectSchema({
      skills: array(unknown()),
      nextCursor: stringSchema().nullish(),
    }),
  );
  singleSkillSchema = DoctorLazy(() =>
    objectSchema({
      skill: unknown(),
    }),
  );
});
//@ chunk-5z459rz9.js:1095-1214 placement
/**
 * 向 MCP 服务器请求 skills/list 的一页。
 */
function listMcpSkillPage(connection, cursor) {
  return identityId2(connection.client).request(
    {
      method: "skills/list",
      params:
        cursor === undefined
          ? {}
          : {
              cursor,
            },
    },
    skillsListSchema(),
    {
      timeout: getConnectionTimeoutMs(),
    },
  );
}
//@ chunk-5z459rz9.js:1214-1334 placement
/**
 * 向 MCP 服务器请求 skills/get 获取指定技能。
 */
function getMcpSkill(connection, uri, options) {
  return identityId2(connection.client).request(
    {
      method: "skills/get",
      params: {
        uri,
      },
    },
    singleSkillSchema(),
    {
      timeout: getConnectionTimeoutMs(),
      signal: options?.signal,
    },
  );
}
export {
  IO_MODELCONTEXTPROTOCOL_SKILLS,
  noopSkillFetch,
  classifySkillResourceUri,
  countUniqueFiles,
  verifySkillFile,
  MCP_SKILL_FILE_PROBLEMS,
  findInvokedMcpSkill,
  emptyList_2,
  alwaysFalse,
  fetchMcpSkillsForClient,
  MAX_RESOURCE_URI_BYTES,
  loadedSkillNote,
  skillDirectoryEntries,
  unreadSkillFileMessage,
  getMcpSkill,
  listMcpSkillPage,
};
