/**
 * tools/ReadMcpResourceTool/ReadMcpResourceTool.ts
 *
 * ReadMcpResource 工具：按 server+uri 读取 MCP 资源，二进制存文件，错误转可读提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ReadMcpResourceTool/ReadMcpResourceTool.ts
 * pieces: chunk-zmp9ej5f.js (5)
 * attribution: sole-consumer 3, affinity 1, fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { greedyShoreEnabled } from "../../utils/permissions/permissionSetup.js";
import { READMCPRESOURCETOOL, READ_MCP_RESOURCE_DESCRIPTION, READ_MCP_RESOURCE_PROMPT } from "./prompt.js";
import { findServersByName } from "../../services/mcp/normalization.js";
import {
  fetchMcpSkillsForClient,
  classifySkillResourceUri,
  noopSkillFetch,
  countUniqueFiles,
  unreadSkillFileMessage,
  verifySkillFile,
} from "../../services/mcp/mcpSkills.js";
import { autoModeAutoAllows } from "../../services/mcp/skillDirectoryResource.js";
import { ensureConnectedClient_2 } from "../../services/mcp/client.js";
import { throwIfWithheldResources } from "../../services/mcp/withheldResources.js";
import { recordPluginUsage } from "../../utils/telemetry/pluginTelemetry.js";
import { recordPluginActivity } from "../../utils/pluginActivity.js";
import { readMcpResource } from "../../services/mcp/mcpWireUtils.js";
import { AbortError } from "../../utils/errors.js";
import { logMCPError } from "../../utils/log.js";
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../ReadMcpResourceDirTool/prompt.js";
import { LISTMCPRESOURCESTOOL } from "../ListMcpResourcesTool/prompt.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  persistBinaryContent,
  binaryNotSavedNotice,
  getBinaryBlobSavedMessage,
} from "../../utils/mcpOutputStorage.js";
import { toolResultStoreOrNull } from "../../utils/toolResultStorage.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-zmp9ej5f.js:9203-9254 sole-consumer
function requireMcpModules() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js");
}
//@ chunk-zmp9ej5f.js:9254-9312 sole-consumer
function getMcpErrorClassification() {
  return requireMcpModules().mcpSdkErrorClassificationModule();
}
//@ chunk-zmp9ej5f.js:9312-9354 sole-consumer
function getMcpClientModule() {
  return requireMcpModules().mcpClientModule();
}
//@ chunk-zmp9ej5f.js:9354-9403 affinity
function getMcpDirectoryReadModule() {
  return requireMcpModules().mcpDirectoryReadModule();
}
//@ chunk-zmp9ej5f.js:9403-13367 fingerprint (2.1.88 match: ReadMcpResourceTool, 0.371)
/**
 * ReadMcpResource 工具（别名 ReadMcpResource）。输入 server+uri。权限：SFe() 为假时直接 allow，否则 passthrough。call：插件来源的服务器记一次插件使用；检查 MCP Skill 访问限制；连接后 resources/read，MethodNotFound/ResourceNotFound 转成可读错误（提示重新 list 或改用目录读取工具）；二进制 blob 存成文件并返回路径说明。 ReadMcpResource 输入 schema（server、uri）与输出 schema（contents[{uri,mimeType,text,blobSavedTo}]、error）。
 */
var readMcpResourceInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var readMcpResourceOutputSchema;
var ReadMcpResourceTool;
deferInit("chunk-zmp9ej5f.js:9403", () => {
  readMcpResourceInputSchema = DoctorLazy(() =>
    objectSchema({
      server: stringSchema().describe("The MCP server name"),
      uri: stringSchema().describe("The resource URI to read"),
    }),
  );
  readMcpResourceOutputSchema = DoctorLazy(() =>
    objectSchema({
      contents: array(
        objectSchema({
          uri: stringSchema().describe("Resource URI"),
          mimeType: stringSchema().optional().describe("MIME type of the content"),
          text: stringSchema().optional().describe("Text content of the resource"),
          blobSavedTo: stringSchema().optional().describe("Path where binary blob content was saved"),
        }),
      ),
      error: stringSchema()
        .optional()
        .describe("Human-readable error when the server could not read the resource"),
    }),
  );
  ReadMcpResourceTool = buildTool({
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
    name: READMCPRESOURCETOOL,
    aliases: ["ReadMcpResource"],
    searchHint: "read a specific MCP resource by URI",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    async description() {
      return READ_MCP_RESOURCE_DESCRIPTION;
    },
    async prompt() {
      return READ_MCP_RESOURCE_PROMPT;
    },
    get inputSchema() {
      return readMcpResourceInputSchema();
    },
    get outputSchema() {
      return readMcpResourceOutputSchema();
    },
    create(toolContext) {
      return {
        async checkPermissions(input) {
          if (!greedyShoreEnabled())
            return {
              behavior: "allow",
              updatedInput: input,
            };
          let [serverClient] = findServersByName(toolContext.turnMcpClients, input.server);
          let skills =
            serverClient === undefined
              ? []
              : await fetchMcpSkillsForClient(
                  serverClient,
                  toolContext.messages(),
                  toolContext.inheritedMcpSkillMessages(),
                );
          if (
            classifySkillResourceUri(input.uri, skills).case === "listed" &&
            !autoModeAutoAllows(toolContext.permissions())
          )
            return {
              behavior: "allow",
              updatedInput: input,
            };
          return {
            behavior: "passthrough",
            message: `${READMCPRESOURCETOOL} requires permission.`,
          };
        },
        async call(input, { signal }) {
          let { turnMcpClients, storageV5 } = toolContext;
          let { server, uri } = input;
          let connectedClient = ensureConnectedClient_2(turnMcpClients, server);
          throwIfWithheldResources(connectedClient, toolContext.agentId);
          if (connectedClient.config.pluginSource) {
            recordPluginUsage(connectedClient.config.pluginSource);
            recordPluginActivity(connectedClient.config.pluginSource, "mcp", {
              kind: "mcp-server",
              name: connectedClient.name,
            });
          }
          let skillFetchNote = noopSkillFetch(
            connectedClient.name,
            uri,
            toolContext.messages(),
            toolContext.inheritedMcpSkillMessages(),
          );
          if (skillFetchNote !== undefined)
            return {
              data: {
                contents: [],
                error: skillFetchNote,
              },
            };
          let connected = await getMcpClientModule().ensureConnectedClient(connectedClient, {
            signal,
            context: "MCP resource read",
          });
          throwIfWithheldResources(connected, toolContext.agentId);
          let skillResource = classifySkillResourceUri(
            uri,
            countUniqueFiles(connected.name, toolContext.messages(), toolContext.inheritedMcpSkillMessages()),
          );
          let skillUnreadResult = async (skills, reason) => ({
            contents: [],
            error: await unreadSkillFileMessage({
              connected,
              skills,
              uri,
              reason,
              signal,
            }),
          });
          if (skillResource.case === "unlisted")
            return {
              data: await skillUnreadResult(skillResource.skills, skillResource.reason),
            };
          let resourceResult;
          try {
            resourceResult = await readMcpResource(connected, uri, {
              signal,
            });
          } catch (error) {
            if (signal.aborted) throw new AbortError();
            let mcpErrorClassification = getMcpErrorClassification();
            if (mcpErrorClassification.isMcpMethodNotFoundError(error)) {
              logMCPError(
                connectedClient.name,
                "resources/read returned -32601 MethodNotFound \u2014 server advertises resources but does not implement reads",
              );
              return {
                data: {
                  contents: [],
                  error: `Server "${connectedClient.name}" advertises resource support but does not implement resource reads.`,
                },
              };
            }
            if (mcpErrorClassification.isMcpResourceNotFoundError(error)) {
              logMCPError(
                connectedClient.name,
                `resources/read returned ${mcpErrorClassification.getMcpErrorCode(error)} \u2014 resource not found`,
              );
              getMcpClientModule().invalidateMcpResourceListCaches(connected);
              if (skillResource.case === "listed")
                return {
                  data: await skillUnreadResult(skillResource.skills, "not_found"),
                };
              let directoryReadDeclared = getMcpDirectoryReadModule().serverDeclaresDirectoryRead(
                connected.capabilities,
              )
                ? ` If the URI is a directory resource, use ${READ_MCP_RESOURCE_DIR_TOOL_NAME} instead.`
                : "";
              return {
                data: {
                  contents: [],
                  error: `Resource not found: ${uri} \u2014 it may have been deleted or the URI is stale. Re-run ${LISTMCPRESOURCESTOOL} to refresh.${directoryReadDeclared}`,
                },
              };
            }
            throw error;
          }
          let contents = resourceResult.contents;
          if (skillResource.case === "listed") {
            let verification = verifySkillFile(resourceResult.contents, uri, skillResource.rows);
            if (!verification.ok)
              return {
                data: await skillUnreadResult(skillResource.skills, verification.reason),
              };
            logFeatureOk("skill_mcp_read");
            contents = [verification.item];
          }
          return {
            data: {
              contents: await Promise.all(
                contents.map(async (content, i) => {
                  if ("text" in content)
                    return {
                      uri: content.uri,
                      mimeType: content.mimeType,
                      text: content.text,
                    };
                  if (!("blob" in content) || typeof content.blob !== "string")
                    return {
                      uri: content.uri,
                      mimeType: content.mimeType,
                    };
                  let persistId = `mcp-resource-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
                  let persisted = await persistBinaryContent(
                    Buffer.from(content.blob, "base64"),
                    content.mimeType,
                    persistId,
                    undefined,
                    storageV5,
                  );
                  if ("error" in persisted) {
                    if (toolResultStoreOrNull() !== undefined)
                      return {
                        uri: content.uri,
                        mimeType: content.mimeType,
                        text: binaryNotSavedNotice(
                          content.mimeType,
                          Buffer.byteLength(content.blob, "base64"),
                        ),
                      };
                    return {
                      uri: content.uri,
                      mimeType: content.mimeType,
                      text: `Binary content could not be saved to disk: ${persisted.error}`,
                    };
                  }
                  return {
                    uri: content.uri,
                    mimeType: content.mimeType,
                    blobSavedTo: persisted.filepath,
                    text: getBinaryBlobSavedMessage(
                      persisted.filepath,
                      content.mimeType,
                      persisted.size,
                      `[Resource from ${connectedClient.name} at ${content.uri}] `,
                    ),
                  };
                }),
              ),
            },
          };
        },
      };
    },
    renderToolUseMessage(input) {
      if (!input.uri || !input.server) return null;
      return `Read resource "${input.uri}" from server "${input.server}"`;
    },
    userFacingName() {
      return "readMcpResource";
    },
    mapToolResultToToolResultBlockParam(result, toolUseID) {
      if (result.error)
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: result.error,
        };
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: jsonStringify(result),
      };
    },
  });
});
export { ReadMcpResourceTool };
