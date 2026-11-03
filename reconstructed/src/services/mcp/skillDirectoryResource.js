/**
 * services/mcp/skillDirectoryResource.ts
 *
 * 2.1.316 新增：MCP 技能目录资源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9ycd12hk.js (6)
 * attribution: placement 6
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { INODE_DIRECTORY } from "./mcpCallConstants.js";
import { buildTool } from "../tools/permissionCheckGuard.js";
import { SFe } from "../../utils/permissions/permissionSetup.js";
import { READ_MCP_RESOURCE_DIR_TOOL_NAME, Wui, Gui } from "../../tools/ReadMcpResourceDirTool/prompt.js";
import {
  aVt,
  Ifn,
  countUniqueFiles,
  xet,
  K3n,
  isUrlUnderPrefix,
  i1r,
  skillDirectoryEntries,
} from "./mcpSkills.js";
import { ensureConnectedClient_2, mapInTurns } from "./client.js";
import { Hfn } from "./withheldResources.js";
import { recordPluginUsage } from "../../utils/telemetry/pluginTelemetry.js";
import { recordPluginActivity } from "../../utils/pluginActivity.js";
import { AbortError } from "../../utils/errors.js";
import { logMCPError } from "../../utils/log.js";
import { READMCPRESOURCETOOL } from "../../tools/ReadMcpResourceTool/prompt.js";
import { createListingSanitizer, listingTruncatedNote } from "../../tools/WebFetchTool/sanitizeListing.js";
import {
  stripCombiningRepeated,
  recursivelySanitizeUnicode,
  stripIgnorables,
} from "../../utils/sanitization.js";
import { plural } from "../../utils/stringUtils.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { escapeXmlAttribute } from "../../utils/permissions/checkRegistry.js";

//@ chunk-9ycd12hk.js:3769-3820 placement
function E() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-9ycd12hk.js:3820-3878 placement
function F() {
  return E().mcpSdkErrorClassificationModule();
}
//@ chunk-9ycd12hk.js:3878-3920 placement
function B() {
  return E().mcpClientModule();
}
//@ chunk-9ycd12hk.js:3920-3969 placement
function w() {
  return E().mcpDirectoryReadModule();
}
//@ chunk-9ycd12hk.js:3969-7229 placement
var listDirectoryResourceInputSchema = DoctorLazy(() =>
    u({
      server: o().describe("The MCP server name"),
      uri: o().describe("The directory resource URI to list"),
    }),
  ),
  W = DoctorLazy(() =>
    u({
      resources: A(
        u({
          uri: o().describe("Child resource URI"),
          name: o().describe("Child resource name"),
          mimeType: o().optional().describe("Child MIME type"),
        }),
      ).describe(
        `Direct children of the directory resource. Subdirectories appear with mimeType "${INODE_DIRECTORY}".`,
      ),
      error: o().optional().describe("Human-readable error when the server could not list the directory"),
    }),
  ),
  L = "Directory listing is not enabled in this build.",
  H5 = buildTool({
    isConcurrencySafe() {
      return !0;
    },
    isReadOnly() {
      return !0;
    },
    toAutoClassifierInput(e) {
      return `${e.server} ${e.uri}`;
    },
    suppressesAlwaysAllowRule() {
      return SFe();
    },
    shouldDefer: !0,
    name: READ_MCP_RESOURCE_DIR_TOOL_NAME,
    aliases: ["ReadMcpResourceDir"],
    searchHint: "list the children of an MCP directory resource",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    async description() {
      return Wui;
    },
    async prompt() {
      return Gui;
    },
    get inputSchema() {
      return listDirectoryResourceInputSchema();
    },
    get outputSchema() {
      return W();
    },
    create(e) {
      return {
        async checkPermissions(s) {
          if (!SFe()) return { behavior: "allow", updatedInput: s };
          if (!aVt())
            return {
              behavior: "deny",
              message: L,
              decisionReason: { type: "other", reason: "directory listing off" },
            };
          return {
            behavior: "passthrough",
            message: `${READ_MCP_RESOURCE_DIR_TOOL_NAME} requires permission.`,
          };
        },
        async call(s, { signal: l }) {
          let turnMcpClients = e.turnMcpClients,
            { server: server, uri: uri } = s,
            a = ensureConnectedClient_2(turnMcpClients, server);
          if ((Hfn(a, e.agentId), !aVt())) return { data: { resources: [], error: L } };
          if (!w().serverDeclaresDirectoryRead(a.capabilities))
            return {
              data: { resources: [], error: `Server "${a.name}" does not support directory listing.` },
            };
          if (a.config.pluginSource)
            (recordPluginUsage(a.config.pluginSource),
              recordPluginActivity(a.config.pluginSource, "mcp", { kind: "mcp-server", name: a.name }));
          let i = Ifn(a.name, uri, e.messages(), e.inheritedMcpSkillMessages());
          if (i !== void 0) return { data: { resources: [], error: i } };
          let M = listSkillDirectory(
            uri,
            countUniqueFiles(a.name, e.messages(), e.inheritedMcpSkillMessages()),
          );
          if (M !== void 0) return { data: M };
          let ensureConnectedClient = await B().ensureConnectedClient(a, {
            signal: l,
            context: "MCP resource directory read",
          });
          Hfn(ensureConnectedClient, e.agentId);
          let c;
          try {
            c = await w().readMcpDirectory(ensureConnectedClient, uri, l);
          } catch (error) {
            if (l.aborted) throw new AbortError();
            let r = F();
            if (r.isMcpNotADirectoryError(error))
              return (
                logMCPError(
                  a.name,
                  `resources/directory/read returned ${r.getMcpErrorCode(error)} \u2014 not a directory`,
                ),
                {
                  data: {
                    resources: [],
                    error: `Not a directory resource: ${uri}. If it is a file resource, use ${READMCPRESOURCETOOL} instead.`,
                  },
                }
              );
            throw error;
          }
          let R = createListingSanitizer(),
            b = createListingSanitizer(),
            flat = (
              await mapInTurns(c, (h) => {
                if (!R([h.uri, h.name, h.mimeType])) return [];
                let r = {
                  uri: stripCombiningRepeated(h.uri),
                  name: recursivelySanitizeUnicode(h.name),
                  mimeType: h.mimeType !== void 0 ? recursivelySanitizeUnicode(h.mimeType) : void 0,
                };
                return b([r.uri, r.name, r.mimeType]) ? [r] : [];
              })
            ).flat();
          if (flat.length < c.length)
            return (
              logMCPError(a.name, listingTruncatedNote("directory entries", c.length, c.length)),
              { data: { resources: [], error: `The listing of ${uri} is too large to read.` } }
            );
          return { data: { resources: flat } };
        },
      };
    },
    renderToolUseMessage(e) {
      if (!e.uri || !e.server) return null;
      return `List directory resource "${e.uri}" from server "${e.server}"`;
    },
    userFacingName() {
      return "readMcpResourceDir";
    },
    mapToolResultToToolResultBlockParam(e, s) {
      if (e.error) return { tool_use_id: s, type: "tool_result", content: e.error };
      let joined = e.resources.map(
          (resource) => `${resource.name}${resource.mimeType === INODE_DIRECTORY ? "/" : ""}`,
        ).join(`
`),
        n =
          e.resources.length > 0
            ? `Directory listing (${e.resources.length} ${plural(e.resources.length, "entry", "entries")}):
${joined}`
            : "Directory is empty.";
      return {
        tool_use_id: s,
        type: "tool_result",
        content: `${n}

${jsonStringify(e)}`,
      };
    },
  });
/**
 * 列出已加载 MCP 技能目录下的条目：地址过长、写法与技能根不同、不是合法 URL、或不属于任何技能目录时给出说明性错误；否则返回子文件/子目录资源列表（目录标为 inode/directory）。
 */
//@ chunk-9ycd12hk.js:7229-8592 placement
function listSkillDirectory(uri, skills) {
  if (skills.length > 0 && Buffer.byteLength(uri) > xet)
    return {
      resources: [],
      error: `An address of ${Buffer.byteLength(uri)} bytes: This directory was not read, because its address is longer than ${xet} bytes. While a skill from this server is loaded, this app reads a directory only at an address of ${xet} bytes or less.${skills.map((n) => K3n(n.skillName)).join("")}`,
    };
  if (!skills.some((n) => uri === n.root || uri.startsWith(`${n.root}/`))) {
    let filtered = skills.filter((m) => isUrlUnderPrefix(`${uri}/`, m.root));
    if (filtered.length > 0)
      return {
        resources: [],
        error: `${escapeXmlAttribute(uri)}: This directory was not read, because its address begins with another spelling of the address of a loaded skill. Write that part exactly as the skill writes it.${filtered.map((m) => K3n(m.skillName)).join("")}`,
      };
    return skills.length > 0 && !i1r(uri)
      ? {
          resources: [],
          error: `${escapeXmlAttribute(uri)}: This directory was not read, because its address is not a valid URL. While a skill from this server is loaded, this app reads a directory only at a valid URL. Write the address as the server or the skill gives it.${skills.map((m) => K3n(m.skillName)).join("")}`,
        }
      : void 0;
  }
  let entries = skillDirectoryEntries(uri, skills);
  if (entries === void 0)
    return {
      resources: [],
      error: `${escapeXmlAttribute(uri)} is not a directory of any skill loaded from this server: no loaded skill lists a file under it. If it is a file, use ${READMCPRESOURCETOOL} instead.`,
    };
  return {
    resources: entries.map((n) => ({
      uri: stripCombiningRepeated(n.uri),
      name: stripIgnorables(n.uri.slice(n.uri.lastIndexOf("/") + 1)),
      ...(n.isDirectory && { mimeType: INODE_DIRECTORY }),
    })),
  };
}

export { H5 };
