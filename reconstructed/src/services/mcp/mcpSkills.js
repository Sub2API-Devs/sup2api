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
import { u, o, E, hu, Ue, A, T, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { escapeXmlAttribute } from "../../utils/permissions/checkRegistry.js";
import { recursivelySanitizeUnicode } from "../../utils/sanitization.js";
import { Us } from "../projects/threadRows.js";
import { ht } from "./cliOwnedClients.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { normalizeMimeType } from "../../utils/mcpOutputStorage.js";
import { oa } from "../../types/ids.js";
import { getConnectionTimeoutMs } from "./client.js";

//@ chunk-e6aww6q8.js:1630800-1630929 placement
function skillRootOfUri(e) {
  if (!e.endsWith("/SKILL.md")) return;
  let sliced = e.slice(0, -9);
  if (!/^[a-z][a-z0-9+.-]*:\/*[^/]/i.test(sliced)) return;
  return sliced;
}
//@ chunk-e6aww6q8.js:1630929-1630941 placement
var j6e = 512;
//@ chunk-e6aww6q8.js:1630941-1630954 placement
var xet = 2048;
/**
 * MCP 技能条目不合格的原因文案（URI 过长、frontmatter 过大、名字非法等）。
 */
//@ chunk-e6aww6q8.js:1630954-1632380 placement
var MCP_SKILL_ENTRY_PROBLEMS = {
    invalid_entry: "with an entry that is not a valid skill entry",
    uri_too_long: `with a URI longer than ${xet} bytes`,
    frontmatter_too_large: "with frontmatter larger than Claude Code reads",
    invalid_name: "with a name or last URI segment that is not a valid skill name",
    name_mismatch: "with a name that differs from the URI's last segment",
    invalid_manifest: "with a file list that omits SKILL.md, repeats a file, or leaves the skill directory",
    too_many_resources: `with more than ${j6e} files`,
    too_large: "larger than 16 MiB",
    skill_md_too_large: "with a SKILL.md over 1 MB",
    dynamic_declined: "generated dynamically (no file list to verify)",
    unshowable_uri:
      "with a directory URI that holds a hidden or control character, a double quote, an angle bracket, or a character that Unicode normalization rewrites (the server can percent-encode it)",
    placeholder_uri:
      "with a directory URI that holds a dollar sign, which a placeholder such as $ARGUMENTS in a skill's text uses (the server can write it as %24)",
    unparseable_uri:
      "with a directory URI whose scheme and host part a URL parser cannot read, for example a space in the host name, or a colon that is followed by text that is not a port number up to 65535 (the server can write that part as a valid URL)",
  },
  W6e = DoctorLazy(() =>
    u({ uri: o(), digest: o().regex(/^sha256:[0-9a-f]{64}$/), size: E().int().nonnegative() }),
  ),
  wtl = DoctorLazy(() =>
    u({ uri: o(), frontmatter: hu(isSkillEntryShape), resources: Ue([A(W6e()), T("dynamic")]) }),
  );
//@ chunk-e6aww6q8.js:1632380-1632575 placement
function isSkillEntryShape(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return !1;
  let n = Reflect.get(e, "name"),
    r = Reflect.get(e, "description");
  return typeof n === "string" && n.length > 0 && typeof r === "string";
}
//@ chunk-e6aww6q8.js:1632575-1632640 placement
function eZt(e) {
  try {
    return escapeXmlAttribute(e) !== e || recursivelySanitizeUnicode(e) !== e;
  } catch {
    return !0;
  }
}
//@ chunk-e6aww6q8.js:1632640-1632772 placement
function originPrefix(e) {
  let n = /^[a-z][a-z0-9+.-]*:(\/\/[^/?#]*)?/i.exec(e)?.[0] ?? "",
    r = oZt(n);
  return r === null ? void 0 : { url: r, length: n.length };
}
//@ chunk-e6aww6q8.js:1632772-1632809 placement
function i1r(e) {
  return oZt(e) !== null;
}
//@ chunk-e6aww6q8.js:1632809-1632845 placement
function oZt(e) {
  return URL.parse(e);
}
/**
 * 从读取结果中取出技能文件字节（文本或 base64 blob），URI 不符或大小超出时返回错误原因。
 */
//@ chunk-e6aww6q8.js:1632845-1633326 placement
function readSkillFileContents(e, n, r) {
  let s = e.length === 1 ? e[0] : void 0;
  if (!s || s.uri !== n) return { ok: !1, reason: "unexpected_contents" };
  if (typeof s.text === "string") {
    if (s.text.length > r) return { ok: !1, reason: "size_mismatch" };
    return { ok: !0, bytes: new TextEncoder().encode(s.text), from: "text" };
  }
  if (typeof s.blob === "string") {
    if (s.blob.length > 4 * Math.ceil(r / 3)) return { ok: !1, reason: "size_mismatch" };
    return { ok: !0, bytes: new Uint8Array(Buffer.from(s.blob, "base64")), from: "blob" };
  }
  return { ok: !1, reason: "unexpected_contents" };
}
//@ chunk-e6aww6q8.js:1633326-1633431 placement
function toInvokedMcpSkill(e, n, r) {
  let s = parseMcpSkillEntry(n);
  return s ? { skillName: typeof e === "string" ? e : s.uri, entry: s, texts: r } : void 0;
}
/**
 * 遍历消息历史，产出已调用的 MCP 技能（来自技能消息或 invoked_skills 附件）。
 */
//@ chunk-e6aww6q8.js:1633431-1633944 placement
function* invokedMcpSkills(e) {
  for (let n of Us([...e]))
    if (n.type === "user" && n.mcpSkill != null) {
      let r = n.isMeta ? n.message.content : [],
        s = typeof r === "string" ? [r] : r.flatMap((y) => (y.type === "text" ? [y.text] : [])),
        h = toInvokedMcpSkill(n.mcpSkill.name, n.mcpSkill, s);
      if (h) yield h;
    } else if (
      n.type === "attachment" &&
      n.attachment.type === "invoked_skills" &&
      Array.isArray(n.attachment.skills)
    ) {
      for (let skill of n.attachment.skills)
        if (
          typeof skill === "object" &&
          skill?.mcpSkill !== void 0 &&
          typeof skill.content === "string" &&
          skill.content
        ) {
          let s = toInvokedMcpSkill(skill.name, skill.mcpSkill, [skill.content]);
          if (s) yield s;
        }
    }
}
//@ chunk-e6aww6q8.js:1633944-1633990 placement
function iZt(e) {
  return [...new Map().values()];
}
/**
 * 按服务器名合并两组位置并去重（归属疑似错误，不属于 LSPTool；被 ReadMcpResourceTool、attachments 使用）。
 */
//@ chunk-e6aww6q8.js:1633990-1634149 placement = countUniqueFiles (0.712)
function countUniqueFiles(e, n, r = []) {
  let s = iZt(n);
  return [
    ...iZt(r).filter((loc) => !s.some((S) => S.serverName === loc.serverName && S.uri === loc.uri)),
    ...s,
  ].filter((y) => y.serverName === e);
}
//@ chunk-e6aww6q8.js:1634149-1634181 placement
function Ifn(e, n, r, s = []) {
  return;
}
//@ chunk-e6aww6q8.js:1634181-1634206 placement
function A4s(e) {
  return [];
}
//@ chunk-e6aww6q8.js:1634206-1634306 placement
function findInvokedMcpSkill(e, n, r) {
  let s;
  for (let h of invokedMcpSkills(e)) if (h.skillName === n && v3o(h.texts, r)) s = h.entry;
  return s;
}
//@ chunk-e6aww6q8.js:1634306-1634372 placement
function v3o(e, n) {
  return e.some(
    (r, s) =>
      e.slice(s).join(`

`) === n,
  );
}
/**
 * 技能文件读取失败时给模型的说明：MCP 技能关闭、或由技能获取器处理，否则按原因与相关技能生成提示。
 */
//@ chunk-e6aww6q8.js:1634372-1634701 placement
async function unreadSkillFileMessage(e) {
  let n = !aVt();
  if (n && e.reason === "unlisted")
    return "This file was not read, because MCP skills are turned off for now. While they are off, this app reads no file of a loaded skill.";
  return (
    (await (n ? void 0 : ht().skillsFetcher)?.settleFailedRead(e)) ??
    skillFileProblemText(e.uri, e.reason) + e.skills.map((skill) => K3n(skill.skillName)).join("")
  );
}
/**
 * 判断一个资源 URI 与已加载 MCP 技能的关系：在某技能资源列表中（listed）、位于技能根下但未列出、写法不同、无法解析，或与技能无关（outside）。
 */
//@ chunk-e6aww6q8.js:1634701-1635329 placement
function classifySkillResourceUri(uri, skills) {
  if (skills.length > 0 && !isUriWithinLimit(uri))
    return { case: "unlisted", skills: [...skills], reason: "uri_too_long" };
  let rows = [],
    matchedSkills = [];
  for (let S of skills) {
    let found = S.resources.find((resource) => resource.uri === uri);
    if (found !== void 0) (rows.push(found), matchedSkills.push(S));
  }
  if (rows.length > 0)
    return aVt()
      ? { case: "listed", rows: rows, skills: matchedSkills }
      : { case: "unlisted", skills: matchedSkills, reason: "unlisted" };
  let filtered = skills.filter((S) => uri.startsWith(`${S.root}/`));
  if (filtered.length > 0) return { case: "unlisted", skills: filtered, reason: "unlisted" };
  let filtered_2 = skills.filter((S) => isUrlUnderPrefix(uri, S.root));
  if (filtered_2.length > 0) return { case: "unlisted", skills: filtered_2, reason: "other_spelling" };
  return skills.length > 0 && !i1r(uri)
    ? { case: "unlisted", skills: [...skills], reason: "unparseable_uri" }
    : { case: "outside" };
}
/**
 * 规范化两边后判断 URL 是否位于某前缀之下（前缀补 /）。
 */
//@ chunk-e6aww6q8.js:1635329-1635386 placement
function isUrlUnderPrefix(e, n) {
  return normalizeUrlForCompare(e).startsWith(normalizeUrlForCompare(`${n}/`));
}
//@ chunk-e6aww6q8.js:1635386-1635557 placement = isPermittedRedirect (0.808)
function normalizeUrlForCompare(e) {
  let originalHostWithoutWww = originPrefix(e);
  if (originalHostWithoutWww === void 0) return e;
  let { url: url } = originalHostWithoutWww;
  return (
    (url.hostname = url.hostname.toLowerCase()),
    (url.username = ""),
    (url.password = ""),
    (url.port = ""),
    url.href + e.slice(originalHostWithoutWww.length)
  );
}
/**
 * 校验读取到的技能文件内容：大小与清单一致、sha256 摘要一致，按文本或 base64 blob 返回资源项。
 */
//@ chunk-e6aww6q8.js:1635557-1636084 placement
function verifySkillFile(contents, uri, rows) {
  let read = readSkillFileContents(contents, uri, Math.max(...rows.map((L) => L.size)));
  if (!read.ok) return read;
  if (rows.some((L) => L.size !== read.bytes.length)) return { ok: !1, reason: "size_mismatch" };
  let h = `sha256:${computeContentHash(read.bytes)}`;
  if (rows.some((L) => L.digest !== h)) return { ok: !1, reason: "digest_mismatch" };
  let mimeType = normalizeMimeType(contents[0]?.mimeType),
    base = { uri: uri, ...(mimeType !== void 0 && { mimeType: mimeType }) };
  if (read.from === "blob") {
    let str = Buffer.from(read.bytes).toString("base64");
    return { ok: !0, item: { ...base, blob: str } };
  }
  let textDecoder = new TextDecoder("utf-8", { fatal: !0, ignoreBOM: !0 });
  return { ok: !0, item: { ...base, text: textDecoder.decode(read.bytes) } };
}
/**
 * 列出技能目录下的直接子条目（文件或子目录）。
 */
//@ chunk-e6aww6q8.js:1636084-1636392 placement
function skillDirectoryEntries(e, n) {
  let r = `${e}/`,
    s = new Map();
  for (let { resources: resources } of n)
    for (let y of resources) {
      if (!y.uri.startsWith(r)) continue;
      let index = y.uri.indexOf("/", r.length);
      if (index === -1) s.set(y.uri, !1);
      else if (!s.has(y.uri.slice(0, index))) s.set(y.uri.slice(0, index), !0);
    }
  return s.size === 0 ? void 0 : Array.from(s, ([h, y]) => ({ uri: h, isDirectory: y }));
}
/**
 * MCP 技能文件未被使用的原因文案（地址不属于该技能、前缀不对等）。
 */
//@ chunk-e6aww6q8.js:1636392-1637966 placement
var MCP_SKILL_FILE_PROBLEMS = {
  not_found:
    "This file was not used, because the skill lists it but the server reports no file at this address. Loading the skill again may fix this. If it does not, the server's owner can fix this.",
  unlisted:
    "This file was not used, because its address does not name a file of this skill. If the skill changed, loading it again may fix this. If it does not, the server's owner can fix this.",
  other_spelling:
    "This file was not used, because its address begins with another spelling of the address of this skill. Write that part exactly as the skill writes it.",
  unparseable_uri:
    "This file was not used, because its address is not a valid URL. While a skill from this server is loaded, this app reads a file only at a valid URL. Write the address as the server or the skill gives it.",
  uri_too_long: `This file was not used, because its address is longer than ${xet} bytes. While a skill from this server is loaded, this app reads a file only at an address of ${xet} bytes or less.`,
  size_mismatch:
    "This file was not used, because its content does not match the size that the server listed for it. Loading the skill again may fix this. If it does not, the server's owner can fix this.",
  digest_mismatch:
    "This file was not used, because its content does not match the checksum that the server listed for it. Loading the skill again may fix this. If it does not, the server's owner can fix this.",
  unexpected_contents:
    "This file was not used, because the server's answer did not hold exactly this one file, in a form that this app can read. The server's owner can fix this.",
};
//@ chunk-e6aww6q8.js:1637966-1638019 placement
function K3n(e) {
  return ` The loaded skill is "${e}".`;
}
//@ chunk-e6aww6q8.js:1638019-1638131 placement
function skillFileProblemText(e, n) {
  return `${n === "uri_too_long" ? `An address of ${Buffer.byteLength(e)} bytes` : escapeXmlAttribute(e)}: ${MCP_SKILL_FILE_PROBLEMS[n]}`;
}
//@ chunk-e6aww6q8.js:1638131-1638330 placement
var isUriWithinLimit = (e) => Buffer.byteLength(e) <= xet,
  mcpSkillEntrySchema = DoctorLazy(() =>
    u({
      serverName: o(),
      uri: o().refine((e) => {
        let n = isUriWithinLimit(e) ? skillRootOfUri(e) : void 0;
        return n !== void 0 && !eZt(n);
      }),
      resources: A(W6e().refine((e) => isUriWithinLimit(e.uri))).max(j6e),
    }),
  );
//@ chunk-e6aww6q8.js:1638330-1638493 placement
function parseMcpSkillEntry(e) {
  let safeParse = mcpSkillEntrySchema().safeParse(e);
  if (safeParse.success) return safeParse.data;
  let safeParse_2 = mcpSkillEntrySchema().omit({ resources: !0 }).safeParse(e);
  return safeParse_2.success ? { ...safeParse_2.data, resources: [] } : void 0;
}
//@ chunk-4xrxmwxg.js:928-1011 placement
var i = DoctorLazy(() => u({ skills: A(oe()), nextCursor: o().nullish() })),
  s = DoctorLazy(() => u({ skill: oe() }));
/**
 * 向 MCP 服务器请求 skills/list 的一页。
 */
//@ chunk-4xrxmwxg.js:1011-1130 placement
function listMcpSkillPage(t, e) {
  return oa(t.client).request({ method: "skills/list", params: e === void 0 ? {} : { cursor: e } }, i(), {
    timeout: getConnectionTimeoutMs(),
  });
}
/**
 * 向 MCP 服务器请求 skills/get 获取指定技能。
 */
//@ chunk-4xrxmwxg.js:1130-1250 placement
function getMcpSkill(t, e, l) {
  return oa(t.client).request({ method: "skills/get", params: { uri: e } }, s(), {
    timeout: getConnectionTimeoutMs(),
    signal: l?.signal,
  });
}
//@ chunk-jxbwsn01.js:191-232 placement
var IO_MODELCONTEXTPROTOCOL_SKILLS = "io.modelcontextprotocol/skills";
//@ chunk-jxbwsn01.js:232-256 placement
function aVt() {
  return !1;
}

export {
  A4s,
  aVt,
  Ifn,
  countUniqueFiles,
  xet,
  K3n,
  isUrlUnderPrefix,
  i1r,
  skillDirectoryEntries,
  classifySkillResourceUri,
  unreadSkillFileMessage,
  verifySkillFile,
  findInvokedMcpSkill,
  MCP_SKILL_FILE_PROBLEMS,
  IO_MODELCONTEXTPROTOCOL_SKILLS,
};
