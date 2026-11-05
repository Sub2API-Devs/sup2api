/**
 * bridge/hearthBinding.ts
 *
 * 2.1.316 新增。解析 hearth 工作者绑定（项目线程回复的 MCP 挂载信息），校验 id、服务名与地址来源。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0rb4hcqt.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  TOOL_OR_SERVER_NAME_RE,
  HEARTHBOT,
  hearthMcpPath,
  HEARTH_TOOL_NAMES,
} from "../services/mcp/ccrMetaMcp.js";
import { logForDebugging } from "../utils/debug.js";
import { originIfValid, originOfUrl } from "../services/mcp/ccrMcpUrls.js";
import { parseMetaMcpTools } from "./metaMcpTools.js";
import { validateBridgeId } from "./sessionIdCompat.js";

//@ chunk-0rb4hcqt.js:388-421 placement
var HEARTH_BINDING_CHANGED_HINT = "hearth_binding_changed";
//@ chunk-0rb4hcqt.js:421-1944 placement
/**
 * 解析 hearth 工作者绑定（项目线程回复的 MCP 挂载信息），校验 id、服务名与地址来源。
 */
function decodeHearthWorkerBinding(record, options) {
  if (record === null || typeof record !== "object" || !("hearth" in record))
    return {
      binding: null,
      reason: "not_joined",
    };
  let hearth = record.hearth;
  if (hearth === null || typeof hearth !== "object")
    return {
      binding: null,
      reason: "not_joined",
    };
  let hearthObject = hearth;
  let channelId = typeof hearthObject.channel_id === "string" ? hearthObject.channel_id : "";
  let threadId = typeof hearthObject.thread_id === "string" ? hearthObject.thread_id : "";
  if (!TOOL_OR_SERVER_NAME_RE.test(channelId) || !TOOL_OR_SERVER_NAME_RE.test(threadId)) {
    logForDebugging("[bridge:projects] binding ids are malformed \u2014 no mount", {
      level: "warn",
    });
    return {
      binding: null,
      reason: "bad_ids",
    };
  }
  let mcpServer = hearthObject.mcp_server;
  if (mcpServer === null || typeof mcpServer !== "object")
    return {
      binding: null,
      reason: "bad_server_name",
    };
  let server = mcpServer;
  if (server.name !== HEARTHBOT) {
    logForDebugging("[bridge:projects] binding names an unexpected MCP server \u2014 no mount", {
      level: "warn",
    });
    return {
      binding: null,
      reason: "bad_server_name",
    };
  }
  if (server.type !== "http" || typeof server.url !== "string")
    return {
      binding: null,
      reason: "not_http",
    };
  let origin = originIfValid(options.apiBaseUrl);
  if (origin === null) {
    logForDebugging("[bridge:projects] api base is not an approved ingress origin \u2014 no mount", {
      level: "warn",
    });
    return {
      binding: null,
      reason: "untrusted_origin",
    };
  }
  let mountUrl = `${origin}${hearthMcpPath(options.sessionId)}`;
  let url;
  try {
    url = new URL(server.url);
  } catch {
    return {
      binding: null,
      reason: "url_mismatch",
    };
  }
  if (
    originOfUrl(url) !== origin ||
    url.pathname !== hearthMcpPath(options.sessionId) ||
    url.search !== "" ||
    url.hash !== "" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    logForDebugging(
      "[bridge:projects] binding url is not this session\u2019s hearthbot mount on our own api base \u2014 no mount",
      {
        level: "warn",
      },
    );
    return {
      binding: null,
      reason: "url_mismatch",
    };
  }
  let metaMcpTools = parseMetaMcpTools(server, HEARTHBOT);
  if (!metaMcpTools)
    return {
      binding: null,
      reason: "bad_tools",
    };
  let autoAllowTools = metaMcpTools.filter((metaMcpTool) => HEARTH_TOOL_NAMES.has(metaMcpTool));
  return {
    binding: {
      channelId,
      threadId,
      mountUrl,
      autoAllowTools,
    },
  };
}
//@ chunk-0rb4hcqt.js:1944-1990 placement
var HEARTH_SESSION_URL_PATTERN = /^(.*)\/v1\/code\/sessions\/([^/?#]+)$/;
//@ chunk-0rb4hcqt.js:1990-2152 placement
function parseBridgeSdkUrl(sdkUrl) {
  if (!sdkUrl) return null;
  let match = HEARTH_SESSION_URL_PATTERN.exec(sdkUrl);
  if (!match?.[1] || !match[2]) return null;
  try {
    validateBridgeId(match[2], "sessionId");
  } catch {
    return null;
  }
  return {
    apiBaseUrl: match[1],
    sessionId: match[2],
  };
}
export { decodeHearthWorkerBinding, HEARTH_BINDING_CHANGED_HINT, parseBridgeSdkUrl };
