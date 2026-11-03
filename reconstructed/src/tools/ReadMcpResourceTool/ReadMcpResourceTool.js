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
import { u, o, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { SFe } from "../../utils/permissions/permissionSetup.js";
import { READMCPRESOURCETOOL, READ_MCP_RESOURCE_DESCRIPTION, READ_MCP_RESOURCE_PROMPT } from "./prompt.js";
import { ensureConnectedClient_2 } from "../../services/mcp/client.js";
import { Hfn } from "../../services/mcp/withheldResources.js";
import { recordPluginUsage } from "../../utils/telemetry/pluginTelemetry.js";
import { recordPluginActivity } from "../../utils/pluginActivity.js";
import {
  Ifn,
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
import { dy } from "../../utils/toolResultStorage.js";
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
/**
 * ReadMcpResource 工具（别名 ReadMcpResource）。输入 server+uri。权限：SFe() 为假时直接 allow，否则 passthrough。call：插件来源的服务器记一次插件使用；检查 MCP Skill 访问限制；连接后 resources/read，MethodNotFound/ResourceNotFound 转成可读错误（提示重新 list 或改用目录读取工具）；二进制 blob 存成文件并返回路径说明。 ReadMcpResource 输入 schema（server、uri）与输出 schema（contents[{uri,mimeType,text,blobSavedTo}]、error）。
 */
//@ chunk-9ycd12hk.js:8792-12553 fingerprint = ReadMcpResourceTool (0.373)
var readMcpResourceInputSchema = DoctorLazy(() =>
    u({ server: o().describe("The MCP server name"), uri: o().describe("The resource URI to read") }),
  ),
  readMcpResourceOutputSchema = DoctorLazy(() =>
    u({
      contents: A(
        u({
          uri: o().describe("Resource URI"),
          mimeType: o().optional().describe("MIME type of the content"),
          text: o().optional().describe("Text content of the resource"),
          blobSavedTo: o().optional().describe("Path where binary blob content was saved"),
        }),
      ),
      error: o().optional().describe("Human-readable error when the server could not read the resource"),
    }),
  ),
  ReadMcpResourceTool = buildTool({
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
        async checkPermissions(s) {
          if (!SFe()) return { behavior: "allow", updatedInput: s };
          return { behavior: "passthrough", message: `${READMCPRESOURCETOOL} requires permission.` };
        },
        async call(s, { signal: l }) {
          let { turnMcpClients: turnMcpClients, storageV5: storageV5 } = e,
            { server: server, uri: uri } = s,
            i = ensureConnectedClient_2(turnMcpClients, server);
          if ((Hfn(i, e.agentId), i.config.pluginSource))
            (recordPluginUsage(i.config.pluginSource),
              recordPluginActivity(i.config.pluginSource, "mcp", { kind: "mcp-server", name: i.name }));
          let M = Ifn(i.name, uri, e.messages(), e.inheritedMcpSkillMessages());
          if (M !== void 0) return { data: { contents: [], error: M } };
          let ensureConnectedClient = await getMcpClientModule().ensureConnectedClient(i, {
            signal: l,
            context: "MCP resource read",
          });
          Hfn(ensureConnectedClient, e.agentId);
          let c = classifySkillResourceUri(
              uri,
              countUniqueFiles(ensureConnectedClient.name, e.messages(), e.inheritedMcpSkillMessages()),
            ),
            R = async (r, T) => ({
              contents: [],
              error: await unreadSkillFileMessage({
                connected: ensureConnectedClient,
                skills: r,
                uri: uri,
                reason: T,
                signal: l,
              }),
            });
          if (c.case === "unlisted") return { data: await R(c.skills, c.reason) };
          let b;
          try {
            b = await readMcpResource(ensureConnectedClient, uri, { signal: l });
          } catch (error) {
            if (l.aborted) throw new AbortError();
            let T = getMcpErrorClassification();
            if (T.isMcpMethodNotFoundError(error))
              return (
                logMCPError(
                  i.name,
                  "resources/read returned -32601 MethodNotFound \u2014 server advertises resources but does not implement reads",
                ),
                {
                  data: {
                    contents: [],
                    error: `Server "${i.name}" advertises resource support but does not implement resource reads.`,
                  },
                }
              );
            if (T.isMcpResourceNotFoundError(error)) {
              if (
                (logMCPError(
                  i.name,
                  `resources/read returned ${T.getMcpErrorCode(error)} \u2014 resource not found`,
                ),
                getMcpClientModule().invalidateMcpResourceListCaches(ensureConnectedClient),
                c.case === "listed")
              )
                return { data: await R(c.skills, "not_found") };
              let I = getMcpDirectoryReadModule().serverDeclaresDirectoryRead(
                ensureConnectedClient.capabilities,
              )
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
            if (!r.ok) return { data: await R(c.skills, r.reason) };
            (logFeatureOk("skill_mcp_read"), (contents = [r.item]));
          }
          return {
            data: {
              contents: await Promise.all(
                contents.map(async (r, T) => {
                  if ("text" in r) return { uri: r.uri, mimeType: r.mimeType, text: r.text };
                  if (!("blob" in r) || typeof r.blob !== "string")
                    return { uri: r.uri, mimeType: r.mimeType };
                  let I = `mcp-resource-${Date.now()}-${T}-${Math.random().toString(36).slice(2, 8)}`,
                    v = await persistBinaryContent(
                      Buffer.from(r.blob, "base64"),
                      r.mimeType,
                      I,
                      void 0,
                      storageV5,
                    );
                  if ("error" in v) {
                    if (dy() !== void 0)
                      return {
                        uri: r.uri,
                        mimeType: r.mimeType,
                        text: binaryNotSavedNotice(r.mimeType, Buffer.byteLength(r.blob, "base64")),
                      };
                    return {
                      uri: r.uri,
                      mimeType: r.mimeType,
                      text: `Binary content could not be saved to disk: ${v.error}`,
                    };
                  }
                  return {
                    uri: r.uri,
                    mimeType: r.mimeType,
                    blobSavedTo: v.filepath,
                    text: getBinaryBlobSavedMessage(
                      v.filepath,
                      r.mimeType,
                      v.size,
                      `[Resource from ${i.name} at ${r.uri}] `,
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
    mapToolResultToToolResultBlockParam(e, s) {
      if (e.error) return { tool_use_id: s, type: "tool_result", content: e.error };
      return { tool_use_id: s, type: "tool_result", content: jsonStringify(e) };
    },
  });

export { ReadMcpResourceTool };
