/**
 * tools/ReadMcpResourceTool/ReadMcpResourceTool.ts
 *
 * ReadMcpResource 工具：按 server+uri 读取 MCP 资源，二进制存文件，错误转可读提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ReadMcpResourceTool/ReadMcpResourceTool.ts
 * pieces: chunk-9ycd12hk.js (5)
 * attribution: sole-consumer 3, affinity 1, fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { greedyShoreEnabled } from "../../utils/permissions/permissionSetup.js";
import { READMCPRESOURCETOOL, READ_MCP_RESOURCE_DESCRIPTION, READ_MCP_RESOURCE_PROMPT } from "./prompt.js";
import { ensureConnectedClient_2 } from "../../services/mcp/client.js";
import { throwIfWithheldResources } from "../../services/mcp/withheldResources.js";
import { recordPluginUsage } from "../../utils/telemetry/pluginTelemetry.js";
import { recordPluginActivity } from "../../utils/pluginActivity.js";
import {
  noopSkillFetch,
  classifySkillResourceUri,
  countUniqueFiles,
  unreadSkillFileMessage,
  verifySkillFile,
} from "../../services/mcp/mcpSkills.js";
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

//@ chunk-9ycd12hk.js:8592-8643 sole-consumer
function requireMcpModules() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-9ycd12hk.js:8643-8701 sole-consumer
function getMcpErrorClassification() {
  return requireMcpModules().mcpSdkErrorClassificationModule();
}
//@ chunk-9ycd12hk.js:8701-8743 sole-consumer
function getMcpClientModule() {
  return requireMcpModules().mcpClientModule();
}
//@ chunk-9ycd12hk.js:8743-8792 affinity
function getMcpDirectoryReadModule() {
  return requireMcpModules().mcpDirectoryReadModule();
}
//@ chunk-9ycd12hk.js:8792-12553 fingerprint = ReadMcpResourceTool (0.373)
/**
 * ReadMcpResource 工具（别名 ReadMcpResource）。输入 server+uri。权限：SFe() 为假时直接 allow，否则 passthrough。call：插件来源的服务器记一次插件使用；检查 MCP Skill 访问限制；连接后 resources/read，MethodNotFound/ResourceNotFound 转成可读错误（提示重新 list 或改用目录读取工具）；二进制 blob 存成文件并返回路径说明。 ReadMcpResource 输入 schema（server、uri）与输出 schema（contents[{uri,mimeType,text,blobSavedTo}]、error）。
 */
var readMcpResourceInputSchema = DoctorLazy(() =>
  u({
    server: string().describe("The MCP server name"),
    uri: string().describe("The resource URI to read"),
  }),
);
var readMcpResourceOutputSchema = DoctorLazy(() =>
  u({
    contents: array(
      u({
        uri: string().describe("Resource URI"),
        mimeType: string().optional().describe("MIME type of the content"),
        text: string().optional().describe("Text content of the resource"),
        blobSavedTo: string().optional().describe("Path where binary blob content was saved"),
      }),
    ),
    error: string().optional().describe("Human-readable error when the server could not read the resource"),
  }),
);
var ReadMcpResourceTool = buildTool({
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
  create(e) {
    return {
      async checkPermissions(updatedInput) {
        if (!greedyShoreEnabled())
          return {
            behavior: "allow",
            updatedInput,
          };
        return {
          behavior: "passthrough",
          message: `${READMCPRESOURCETOOL} requires permission.`,
        };
      },
      async call(input, { signal }) {
        let { turnMcpClients, storageV5 } = e;
        let { server, uri } = input;
        let connectedClient = ensureConnectedClient_2(turnMcpClients, server);
        throwIfWithheldResources(connectedClient, e.agentId);
        if (connectedClient.config.pluginSource) {
          recordPluginUsage(connectedClient.config.pluginSource);
          recordPluginActivity(connectedClient.config.pluginSource, "mcp", {
            kind: "mcp-server",
            name: connectedClient.name,
          });
        }
        let M = noopSkillFetch(connectedClient.name, uri, e.messages(), e.inheritedMcpSkillMessages());
        if (M !== undefined)
          return {
            data: {
              contents: [],
              error: M,
            },
          };
        let y = await getMcpClientModule().ensureConnectedClient(connectedClient, {
          signal,
          context: "MCP resource read",
        });
        throwIfWithheldResources(y, e.agentId);
        let c = classifySkillResourceUri(
          uri,
          countUniqueFiles(y.name, e.messages(), e.inheritedMcpSkillMessages()),
        );
        let R = async (skills, reason) => ({
          contents: [],
          error: await unreadSkillFileMessage({
            connected: y,
            skills,
            uri,
            reason,
            signal,
          }),
        });
        if (c.case === "unlisted")
          return {
            data: await R(c.skills, c.reason),
          };
        let b;
        try {
          b = await readMcpResource(y, uri, {
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
            getMcpClientModule().invalidateMcpResourceListCaches(y);
            if (c.case === "listed")
              return {
                data: await R(c.skills, "not_found"),
              };
            let I = getMcpDirectoryReadModule().serverDeclaresDirectoryRead(y.capabilities)
              ? ` If the URI is a directory resource, use ${READ_MCP_RESOURCE_DIR_TOOL_NAME} instead.`
              : "";
            return {
              data: {
                contents: [],
                error: `Resource not found: ${uri} \u2014 it may have been deleted or the URI is stale. Re-run ${LISTMCPRESOURCESTOOL} to refresh.${I}`,
              },
            };
          }
          throw error;
        }
        let contents = b.contents;
        if (c.case === "listed") {
          let r = verifySkillFile(b.contents, uri, c.rows);
          if (!r.ok)
            return {
              data: await R(c.skills, r.reason),
            };
          logFeatureOk("skill_mcp_read");
          contents = [r.item];
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
                      text: binaryNotSavedNotice(content.mimeType, Buffer.byteLength(content.blob, "base64")),
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
  renderToolUseMessage(e) {
    if (!e.uri || !e.server) return null;
    return `Read resource "${e.uri}" from server "${e.server}"`;
  },
  userFacingName() {
    return "readMcpResource";
  },
  mapToolResultToToolResultBlockParam(e, toolUseID) {
    if (e.error)
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: e.error,
      };
    return {
      tool_use_id: toolUseID,
      type: "tool_result",
      content: jsonStringify(e),
    };
  },
});
export { ReadMcpResourceTool };
