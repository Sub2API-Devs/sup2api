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
import { objectSchema, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { INODE_DIRECTORY } from "./mcpCallConstants.js";
import { buildTool } from "../tools/permissionCheckGuard.js";
import { greedyShoreEnabled } from "../../utils/permissions/permissionSetup.js";
import {
  READ_MCP_RESOURCE_DIR_TOOL_NAME,
  READ_MCP_RESOURCE_DIR_DESCRIPTION,
  READ_MCP_RESOURCE_DIR_PROMPT,
} from "../../tools/ReadMcpResourceDirTool/prompt.js";
import {
  alwaysFalse,
  noopSkillFetch,
  countUniqueFiles,
  MAX_RESOURCE_URI_BYTES,
  loadedSkillNote,
  isUrlUnderPrefix,
  isParsableUri,
  skillDirectoryEntries,
} from "./mcpSkills.js";
import { ensureConnectedClient_2, mapInTurns } from "./client.js";
import { throwIfWithheldResources } from "./withheldResources.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-9ycd12hk.js:3769-3820 placement
/**
 * 懒加载 MCP 相关模块集合。
 */
function mcpModules() {
  return require("./emitTripwireEvent.lazy.js");
}
//@ chunk-9ycd12hk.js:3820-3878 placement
/**
 * 取 MCP SDK 错误分类模块。
 */
function mcpErrorClassificationModule() {
  return mcpModules().mcpSdkErrorClassificationModule();
}
//@ chunk-9ycd12hk.js:3878-3920 placement
/**
 * 取 MCP 客户端模块。
 */
function mcpClientModule() {
  return mcpModules().mcpClientModule();
}
//@ chunk-9ycd12hk.js:3920-3969 placement
/**
 * 取 MCP 目录读取模块。
 */
function mcpDirectoryReadModule() {
  return mcpModules().mcpDirectoryReadModule();
}
//@ chunk-9ycd12hk.js:3969-7229 placement
/**
 * 列出目录资源的工具定义。
 */
var listDirectoryResourceInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var directoryListingResultSchema;
var DIRECTORY_LISTING_DISABLED_TEXT;
var listDirectoryResourceTool;
deferInit("chunk-9ycd12hk.js:3969", () => {
  listDirectoryResourceInputSchema = DoctorLazy(() =>
    objectSchema({
      server: stringSchema().describe("The MCP server name"),
      uri: stringSchema().describe("The directory resource URI to list"),
    }),
  );
  directoryListingResultSchema = DoctorLazy(() =>
    objectSchema({
      resources: array(
        objectSchema({
          uri: stringSchema().describe("Child resource URI"),
          name: stringSchema().describe("Child resource name"),
          mimeType: stringSchema().optional().describe("Child MIME type"),
        }),
      ).describe(
        `Direct children of the directory resource. Subdirectories appear with mimeType "${INODE_DIRECTORY}".`,
      ),
      error: stringSchema()
        .optional()
        .describe("Human-readable error when the server could not list the directory"),
    }),
  );
  DIRECTORY_LISTING_DISABLED_TEXT = "Directory listing is not enabled in this build.";
  listDirectoryResourceTool = buildTool({
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    toAutoClassifierInput(input) {
      return `${input.server} ${input.uri}`;
    },
    suppressesAlwaysAllowRule() {
      return greedyShoreEnabled();
    },
    shouldDefer: true,
    name: READ_MCP_RESOURCE_DIR_TOOL_NAME,
    aliases: ["ReadMcpResourceDir"],
    searchHint: "list the children of an MCP directory resource",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    async description() {
      return READ_MCP_RESOURCE_DIR_DESCRIPTION;
    },
    async prompt() {
      return READ_MCP_RESOURCE_DIR_PROMPT;
    },
    get inputSchema() {
      return listDirectoryResourceInputSchema();
    },
    get outputSchema() {
      return directoryListingResultSchema();
    },
    create(context) {
      return {
        async checkPermissions(updatedInput) {
          if (!greedyShoreEnabled())
            return {
              behavior: "allow",
              updatedInput,
            };
          if (!alwaysFalse())
            return {
              behavior: "deny",
              message: DIRECTORY_LISTING_DISABLED_TEXT,
              decisionReason: {
                type: "other",
                reason: "directory listing off",
              },
            };
          return {
            behavior: "passthrough",
            message: `${READ_MCP_RESOURCE_DIR_TOOL_NAME} requires permission.`,
          };
        },
        async call(input, { signal }) {
          let turnMcpClients = context.turnMcpClients;
          let { server, uri } = input;
          let connectedClient = ensureConnectedClient_2(turnMcpClients, server);
          throwIfWithheldResources(connectedClient, context.agentId);
          if (!alwaysFalse())
            return {
              data: {
                resources: [],
                error: DIRECTORY_LISTING_DISABLED_TEXT,
              },
            };
          if (!mcpDirectoryReadModule().serverDeclaresDirectoryRead(connectedClient.capabilities))
            return {
              data: {
                resources: [],
                error: `Server "${connectedClient.name}" does not support directory listing.`,
              },
            };
          if (connectedClient.config.pluginSource) {
            recordPluginUsage(connectedClient.config.pluginSource);
            recordPluginActivity(connectedClient.config.pluginSource, "mcp", {
              kind: "mcp-server",
              name: connectedClient.name,
            });
          }
          let refusal = noopSkillFetch(
            connectedClient.name,
            uri,
            context.messages(),
            context.inheritedMcpSkillMessages(),
          );
          if (refusal !== undefined)
            return {
              data: {
                resources: [],
                error: refusal,
              },
            };
          let skillListing = listSkillDirectory(
            uri,
            countUniqueFiles(connectedClient.name, context.messages(), context.inheritedMcpSkillMessages()),
          );
          if (skillListing !== undefined)
            return {
              data: skillListing,
            };
          let liveClient = await mcpClientModule().ensureConnectedClient(connectedClient, {
            signal,
            context: "MCP resource directory read",
          });
          throwIfWithheldResources(liveClient, context.agentId);
          let entries;
          try {
            entries = await mcpDirectoryReadModule().readMcpDirectory(liveClient, uri, signal);
          } catch (error) {
            if (signal.aborted) throw new AbortError();
            let classification = mcpErrorClassificationModule();
            if (classification.isMcpNotADirectoryError(error)) {
              logMCPError(
                connectedClient.name,
                `resources/directory/read returned ${classification.getMcpErrorCode(error)} \u2014 not a directory`,
              );
              return {
                data: {
                  resources: [],
                  error: `Not a directory resource: ${uri}. If it is a file resource, use ${READMCPRESOURCETOOL} instead.`,
                },
              };
            }
            throw error;
          }
          let listingSanitizer = createListingSanitizer();
          let listingSanitizer_2 = createListingSanitizer();
          let children = (
            await mapInTurns(entries, (resource) => {
              if (!listingSanitizer([resource.uri, resource.name, resource.mimeType])) return [];
              let child = {
                uri: stripCombiningRepeated(resource.uri),
                name: recursivelySanitizeUnicode(resource.name),
                mimeType:
                  resource.mimeType !== undefined ? recursivelySanitizeUnicode(resource.mimeType) : undefined,
              };
              return listingSanitizer_2([child.uri, child.name, child.mimeType]) ? [child] : [];
            })
          ).flat();
          if (children.length < entries.length) {
            logMCPError(
              connectedClient.name,
              listingTruncatedNote("directory entries", entries.length, entries.length),
            );
            return {
              data: {
                resources: [],
                error: `The listing of ${uri} is too large to read.`,
              },
            };
          }
          return {
            data: {
              resources: children,
            },
          };
        },
      };
    },
    renderToolUseMessage(input) {
      if (!input.uri || !input.server) return null;
      return `List directory resource "${input.uri}" from server "${input.server}"`;
    },
    userFacingName() {
      return "readMcpResourceDir";
    },
    mapToolResultToToolResultBlockParam(output, toolUseId) {
      if (output.error)
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: output.error,
        };
      let joined = output.resources.map(
        (resource) => `${resource.name}${resource.mimeType === INODE_DIRECTORY ? "/" : ""}`,
      ).join(`
`);
      let text =
        output.resources.length > 0
          ? `Directory listing (${output.resources.length} ${plural(output.resources.length, "entry", "entries")}):
${joined}`
          : "Directory is empty.";
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: `${text}

${jsonStringify(output)}`,
      };
    },
  });
});
//@ chunk-9ycd12hk.js:7229-8592 placement
/**
 * 列出已加载 MCP 技能目录下的条目：地址过长、写法与技能根不同、不是合法 URL、或不属于任何技能目录时给出说明性错误；否则返回子文件/子目录资源列表（目录标为 inode/directory）。
 */
function listSkillDirectory(uri, skills) {
  if (skills.length > 0 && Buffer.byteLength(uri) > MAX_RESOURCE_URI_BYTES)
    return {
      resources: [],
      error: `An address of ${Buffer.byteLength(uri)} bytes: This directory was not read, because its address is longer than ${MAX_RESOURCE_URI_BYTES} bytes. While a skill from this server is loaded, this app reads a directory only at an address of ${MAX_RESOURCE_URI_BYTES} bytes or less.${skills.map((skill) => loadedSkillNote(skill.skillName)).join("")}`,
    };
  if (!skills.some((skill) => uri === skill.root || uri.startsWith(`${skill.root}/`))) {
    let filtered = skills.filter((skill) => isUrlUnderPrefix(`${uri}/`, skill.root));
    if (filtered.length > 0)
      return {
        resources: [],
        error: `${escapeXmlAttribute(uri)}: This directory was not read, because its address begins with another spelling of the address of a loaded skill. Write that part exactly as the skill writes it.${filtered.map((skill) => loadedSkillNote(skill.skillName)).join("")}`,
      };
    return skills.length > 0 && !isParsableUri(uri)
      ? {
          resources: [],
          error: `${escapeXmlAttribute(uri)}: This directory was not read, because its address is not a valid URL. While a skill from this server is loaded, this app reads a directory only at a valid URL. Write the address as the server or the skill gives it.${skills.map((skill) => loadedSkillNote(skill.skillName)).join("")}`,
        }
      : undefined;
  }
  let entries = skillDirectoryEntries(uri, skills);
  if (entries === undefined)
    return {
      resources: [],
      error: `${escapeXmlAttribute(uri)} is not a directory of any skill loaded from this server: no loaded skill lists a file under it. If it is a file, use ${READMCPRESOURCETOOL} instead.`,
    };
  return {
    resources: entries.map((entry) => ({
      uri: stripCombiningRepeated(entry.uri),
      name: stripIgnorables(entry.uri.slice(entry.uri.lastIndexOf("/") + 1)),
      ...(entry.isDirectory && {
        mimeType: INODE_DIRECTORY,
      }),
    })),
  };
}
export { listDirectoryResourceTool };
