/**
 * services/mcp/mcpSkills.ts
 *
 * 2.1.316 新增：MCP 资源提供的技能（读取、校验技能条目与文件）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4xrxmwxg.js (3), chunk-e6aww6q8.js (29), chunk-jxbwsn01.js (2)
 * attribution: placement 34
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, E, hu, union, array, literal, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { escapeXmlAttribute as escapeXmlAttribute_2 } from "../../utils/permissions/checkRegistry.js";
import { recursivelySanitizeUnicode } from "../../utils/sanitization.js";
import { messagesSinceCompactBoundary } from "../projects/threadRows.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { normalizeMimeType } from "../../utils/mcpOutputStorage.js";
import { identityId2 } from "../../types/ids.js";
import { getConnectionTimeoutMs } from "./client.js";

//@ chunk-e6aww6q8.js:1630800-1630929 placement
function skillRootOfUri(e) {
  if (!e.endsWith("/SKILL.md")) return;
  let sliced = e.slice(0, -9);
  if (!/^[a-z][a-z0-9+.-]*:\/*[^/]/i.test(sliced)) return;
  return sliced;
}
//@ chunk-e6aww6q8.js:1630929-1630941 placement
/**
 * 单个技能最多包含的资源文件数（512）。
 */
var MAX_SKILL_RESOURCES = 512;
//@ chunk-e6aww6q8.js:1630941-1630954 placement
/**
 * 资源 URI 的最大字节数（2048）。
 */
var MAX_RESOURCE_URI_BYTES = 2048;
//@ chunk-e6aww6q8.js:1630954-1632380 placement
/**
 * 单个技能文件的 schema（uri、frontmatter、resources）。
 */
var MCP_SKILL_ENTRY_PROBLEMS = {
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
var skillEntrySchema = DoctorLazy(() =>
  u({
    uri: string(),
    digest: string().regex(/^sha256:[0-9a-f]{64}$/),
    size: E().int().nonnegative(),
  }),
);
var skillFileSchema = DoctorLazy(() =>
  u({
    uri: string(),
    frontmatter: hu(isSkillEntryShape),
    resources: union([array(skillEntrySchema()), literal("dynamic")]),
  }),
);
//@ chunk-e6aww6q8.js:1632380-1632575 placement
function isSkillEntryShape(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return false;
  let n = Reflect.get(e, "name");
  let r = Reflect.get(e, "description");
  return typeof n === "string" && n.length > 0 && typeof r === "string";
}
//@ chunk-e6aww6q8.js:1632575-1632640 placement
/**
 * 判断技能 URI 是否含需转义或需规范化的字符。
 */
function hasUnsafeSkillUri(e) {
  try {
    return escapeXmlAttribute_2(e) !== e || recursivelySanitizeUnicode(e) !== e;
  } catch {
    return true;
  }
}
//@ chunk-e6aww6q8.js:1632640-1632772 placement
function originPrefix(e) {
  let n = /^[a-z][a-z0-9+.-]*:(\/\/[^/?#]*)?/i.exec(e)?.[0] ?? "";
  let urlOrNull = parseUrlOrNull(n);
  return urlOrNull === null
    ? undefined
    : {
        url: urlOrNull,
        length: n.length,
      };
}
//@ chunk-e6aww6q8.js:1632772-1632809 placement
/**
 * 判断 URI 能否被解析。
 */
function isParsableUri(uri) {
  return parseUrlOrNull(uri) !== null;
}
//@ chunk-e6aww6q8.js:1632809-1632845 placement
/**
 * 解析 URL，失败返回 null。
 */
function parseUrlOrNull(e) {
  return URL.parse(e);
}
//@ chunk-e6aww6q8.js:1632845-1633326 placement
/**
 * 从读取结果中取出技能文件字节（文本或 base64 blob），URI 不符或大小超出时返回错误原因。
 */
function readSkillFileContents(contents, uri, r) {
  let s = contents.length === 1 ? contents[0] : undefined;
  if (!s || s.uri !== uri)
    return {
      ok: false,
      reason: "unexpected_contents",
    };
  if (typeof s.text === "string") {
    if (s.text.length > r)
      return {
        ok: false,
        reason: "size_mismatch",
      };
    return {
      ok: true,
      bytes: new TextEncoder().encode(s.text),
      from: "text",
    };
  }
  if (typeof s.blob === "string") {
    if (s.blob.length > 4 * Math.ceil(r / 3))
      return {
        ok: false,
        reason: "size_mismatch",
      };
    return {
      ok: true,
      bytes: new Uint8Array(Buffer.from(s.blob, "base64")),
      from: "blob",
    };
  }
  return {
    ok: false,
    reason: "unexpected_contents",
  };
}
//@ chunk-e6aww6q8.js:1633326-1633431 placement
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
//@ chunk-e6aww6q8.js:1633431-1633944 placement
/**
 * 遍历消息历史，产出已调用的 MCP 技能（来自技能消息或 invoked_skills 附件）。
 */
function* invokedMcpSkills(e) {
  for (let n of messagesSinceCompactBoundary([...e]))
    if (n.type === "user" && n.mcpSkill != null) {
      let content = n.isMeta ? n.message.content : [];
      let texts =
        typeof content === "string" ? [content] : content.flatMap((y) => (y.type === "text" ? [y.text] : []));
      let invokedMcpSkill = toInvokedMcpSkill(n.mcpSkill.name, n.mcpSkill, texts);
      if (invokedMcpSkill) yield invokedMcpSkill;
    } else if (
      n.type === "attachment" &&
      n.attachment.type === "invoked_skills" &&
      Array.isArray(n.attachment.skills)
    ) {
      for (let skill of n.attachment.skills)
        if (
          typeof skill === "object" &&
          skill?.mcpSkill !== undefined &&
          typeof skill.content === "string" &&
          skill.content
        ) {
          let invokedMcpSkill = toInvokedMcpSkill(skill.name, skill.mcpSkill, [skill.content]);
          if (invokedMcpSkill) yield invokedMcpSkill;
        }
    }
}
//@ chunk-e6aww6q8.js:1633944-1633990 placement
/**
 * 把 Map 的值去重成数组。
 */
function uniqueValues(e) {
  return [...new Map().values()];
}
//@ chunk-e6aww6q8.js:1633990-1634149 placement = countUniqueFiles (0.712)
/**
 * 按服务器名合并两组位置并去重（归属疑似错误，不属于 LSPTool；被 ReadMcpResourceTool、attachments 使用）。
 */
function countUniqueFiles(name, n, r = []) {
  let s = uniqueValues(n);
  return [
    ...uniqueValues(r).filter((loc) => !s.some((S) => S.serverName === loc.serverName && S.uri === loc.uri)),
    ...s,
  ].filter((y) => y.serverName === name);
}
//@ chunk-e6aww6q8.js:1634149-1634181 placement
/**
 * 空实现（保留签名）。
 */
function noopSkillFetch(name, uri, r, s = []) {
  return;
}
//@ chunk-e6aww6q8.js:1634181-1634206 placement
/**
 * 恒返回空数组。
 */
function emptyList(messages) {
  return [];
}
//@ chunk-e6aww6q8.js:1634206-1634306 placement
function findInvokedMcpSkill(e, skillName, content) {
  let s;
  for (let h of invokedMcpSkills(e))
    if (h.skillName === skillName && textsSuffixMatches(h.texts, content)) s = h.entry;
  return s;
}
//@ chunk-e6aww6q8.js:1634306-1634372 placement
/**
 * 判断文本数组的某个后缀是否等于给定字符串。
 */
function textsSuffixMatches(texts, n) {
  return texts.some(
    (r, s) =>
      texts.slice(s).join(`

`) === n,
  );
}
//@ chunk-e6aww6q8.js:1634372-1634701 placement
/**
 * 技能文件读取失败时给模型的说明：MCP 技能关闭、或由技能获取器处理，否则按原因与相关技能生成提示。
 */
async function unreadSkillFileMessage(e) {
  let n = !alwaysFalse();
  if (n && e.reason === "unlisted")
    return "This file was not read, because MCP skills are turned off for now. While they are off, this app reads no file of a loaded skill.";
  return (
    (await (n ? undefined : getCliOwnedState().skillsFetcher)?.settleFailedRead(e)) ??
    skillFileProblemText(e.uri, e.reason) + e.skills.map((skill) => loadedSkillNote(skill.skillName)).join("")
  );
}
//@ chunk-e6aww6q8.js:1634701-1635329 placement
/**
 * 判断一个资源 URI 与已加载 MCP 技能的关系：在某技能资源列表中（listed）、位于技能根下但未列出、写法不同、无法解析，或与技能无关（outside）。
 */
function classifySkillResourceUri(uri, skills) {
  if (skills.length > 0 && !isUriWithinLimit(uri))
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
  let filtered_2 = skills.filter((skill) => isUrlUnderPrefix(uri, skill.root));
  if (filtered_2.length > 0)
    return {
      case: "unlisted",
      skills: filtered_2,
      reason: "other_spelling",
    };
  return skills.length > 0 && !isParsableUri(uri)
    ? {
        case: "unlisted",
        skills: [...skills],
        reason: "unparseable_uri",
      }
    : {
        case: "outside",
      };
}
//@ chunk-e6aww6q8.js:1635329-1635386 placement
/**
 * 规范化两边后判断 URL 是否位于某前缀之下（前缀补 /）。
 */
function isUrlUnderPrefix(e, root) {
  return normalizeUrlForCompare(e).startsWith(normalizeUrlForCompare(`${root}/`));
}
//@ chunk-e6aww6q8.js:1635386-1635557 placement = isPermittedRedirect (0.808)
function normalizeUrlForCompare(e) {
  let originalHostWithoutWww = originPrefix(e);
  if (originalHostWithoutWww === undefined) return e;
  let { url } = originalHostWithoutWww;
  url.hostname = url.hostname.toLowerCase();
  url.username = "";
  url.password = "";
  url.port = "";
  return url.href + e.slice(originalHostWithoutWww.length);
}
//@ chunk-e6aww6q8.js:1635557-1636084 placement
/**
 * 校验读取到的技能文件内容：大小与清单一致、sha256 摘要一致，按文本或 base64 blob 返回资源项。
 */
function verifySkillFile(contents, uri, rows) {
  let read = readSkillFileContents(contents, uri, Math.max(...rows.map((L) => L.size)));
  if (!read.ok) return read;
  if (rows.some((L) => L.size !== read.bytes.length))
    return {
      ok: false,
      reason: "size_mismatch",
    };
  let h = `sha256:${computeContentHash(read.bytes)}`;
  if (rows.some((L) => L.digest !== h))
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
//@ chunk-e6aww6q8.js:1636084-1636392 placement
/**
 * 列出技能目录下的直接子条目（文件或子目录）。
 */
function skillDirectoryEntries(uri, skills) {
  let r = `${uri}/`;
  let s = new Map();
  for (let { resources } of skills)
    for (let resource of resources) {
      if (!resource.uri.startsWith(r)) continue;
      let index = resource.uri.indexOf("/", r.length);
      if (index === -1) s.set(resource.uri, false);
      else if (!s.has(resource.uri.slice(0, index))) s.set(resource.uri.slice(0, index), true);
    }
  return s.size === 0
    ? undefined
    : Array.from(s, ([h, y]) => ({
        uri: h,
        isDirectory: y,
      }));
}
//@ chunk-e6aww6q8.js:1636392-1637966 placement
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
  uri_too_long: `This file was not used, because its address is longer than ${MAX_RESOURCE_URI_BYTES} bytes. While a skill from this server is loaded, this app reads a file only at an address of ${MAX_RESOURCE_URI_BYTES} bytes or less.`,
  size_mismatch:
    "This file was not used, because its content does not match the size that the server listed for it. Loading the skill again may fix this. If it does not, the server's owner can fix this.",
  digest_mismatch:
    "This file was not used, because its content does not match the checksum that the server listed for it. Loading the skill again may fix this. If it does not, the server's owner can fix this.",
  unexpected_contents:
    "This file was not used, because the server's answer did not hold exactly this one file, in a form that this app can read. The server's owner can fix this.",
};
//@ chunk-e6aww6q8.js:1637966-1638019 placement
/**
 * 生成 “The loaded skill is \"…\"” 的说明。
 */
function loadedSkillNote(skillName) {
  return ` The loaded skill is "${skillName}".`;
}
//@ chunk-e6aww6q8.js:1638019-1638131 placement
function skillFileProblemText(uri, reason) {
  return `${reason === "uri_too_long" ? `An address of ${Buffer.byteLength(uri)} bytes` : escapeXmlAttribute_2(uri)}: ${MCP_SKILL_FILE_PROBLEMS[reason]}`;
}
//@ chunk-e6aww6q8.js:1638131-1638330 placement
var isUriWithinLimit = (uri) => Buffer.byteLength(uri) <= MAX_RESOURCE_URI_BYTES;
var mcpSkillEntrySchema = DoctorLazy(() =>
  u({
    serverName: string(),
    uri: string().refine((e) => {
      let n = isUriWithinLimit(e) ? skillRootOfUri(e) : undefined;
      return n !== undefined && !hasUnsafeSkillUri(n);
    }),
    resources: array(skillEntrySchema().refine((e) => isUriWithinLimit(e.uri))).max(MAX_SKILL_RESOURCES),
  }),
);
//@ chunk-e6aww6q8.js:1638330-1638493 placement
function parseMcpSkillEntry(e) {
  let n = mcpSkillEntrySchema().safeParse(e);
  if (n.success) return n.data;
  let r = mcpSkillEntrySchema()
    .omit({
      resources: true,
    })
    .safeParse(e);
  return r.success
    ? {
        ...r.data,
        resources: [],
      }
    : undefined;
}
//@ chunk-4xrxmwxg.js:928-1011 placement
/**
 * 单个技能响应的 schema。
 */
var skillsListSchema = DoctorLazy(() =>
  u({
    skills: array(unknown()),
    nextCursor: string().nullish(),
  }),
);
var singleSkillSchema = DoctorLazy(() =>
  u({
    skill: unknown(),
  }),
);
//@ chunk-4xrxmwxg.js:1011-1130 placement
/**
 * 向 MCP 服务器请求 skills/list 的一页。
 */
function listMcpSkillPage(t, e) {
  return identityId2(t.client).request(
    {
      method: "skills/list",
      params:
        e === undefined
          ? {}
          : {
              cursor: e,
            },
    },
    skillsListSchema(),
    {
      timeout: getConnectionTimeoutMs(),
    },
  );
}
//@ chunk-4xrxmwxg.js:1130-1250 placement
/**
 * 向 MCP 服务器请求 skills/get 获取指定技能。
 */
function getMcpSkill(t, uri, l) {
  return identityId2(t.client).request(
    {
      method: "skills/get",
      params: {
        uri,
      },
    },
    singleSkillSchema(),
    {
      timeout: getConnectionTimeoutMs(),
      signal: l?.signal,
    },
  );
}
//@ chunk-jxbwsn01.js:191-232 placement
var IO_MODELCONTEXTPROTOCOL_SKILLS = "io.modelcontextprotocol/skills";
//@ chunk-jxbwsn01.js:232-256 placement
/**
 * 恒返回 false 的开关占位。
 */
function alwaysFalse() {
  return false;
}
export {
  emptyList,
  alwaysFalse,
  noopSkillFetch,
  countUniqueFiles,
  MAX_RESOURCE_URI_BYTES,
  loadedSkillNote,
  isUrlUnderPrefix,
  isParsableUri,
  skillDirectoryEntries,
  classifySkillResourceUri,
  unreadSkillFileMessage,
  verifySkillFile,
  findInvokedMcpSkill,
  MCP_SKILL_FILE_PROBLEMS,
  IO_MODELCONTEXTPROTOCOL_SKILLS,
};
