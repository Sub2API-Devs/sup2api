/**
 * cli/handlers/pluginScaffold.ts
 *
 * 2.1.316 新增：`claude plugin` 脚手架：生成插件目录、manifest、示例技能/命令与 bun 脚本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-12wyw8h8.js (14)
 * attribution: placement 14
 */
import { join, join as join_2, resolve, relative, sep, dirname } from "path";
import { mkdir, writeFile } from "fs/promises";
import { PluginManifestSchema } from "../../utils/plugins/schemas.js";
import { trimTrailingDotsSpaces, f3, MJ, SYNCED_DIR } from "../../utils/plugins/syncedItems.js";
import { checkReservedPluginName } from "../../utils/plugins/reservedPluginNames.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getErrnoCode } from "../../utils/errors.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";

/**
 * 插件清单 schema 地址与插件脚手架支持的组件类型。
 */
//@ chunk-12wyw8h8.js:26282-26413 placement
var PLUGIN_SCHEMA_URL = "https://anthropic.com/claude-code/plugin.schema.json",
  PLUGIN_COMPONENT_KINDS = ["skills", "agents", "hooks", "mcp", "lsp", "output-style", "channel"];
//@ chunk-12wyw8h8.js:26413-26881 placement
function pluginNameProblem(e) {
  let safeParse = PluginManifestSchema().shape.name.safeParse(e);
  if (!safeParse.success) return safeParse.error.issues[0]?.message ?? null;
  if (e.includes("/") || e.includes("\\") || e.includes("..") || e === ".")
    return 'Plugin name cannot contain path separators (/ or \\), ".." sequences, or be "."';
  if (!trimTrailingDotsSpaces(e) || f3(e) || MJ(e))
    return `Plugin name cannot be "${SYNCED_DIR}" or start with "." \u2014 those directories are never loaded as plugin adoptions`;
  let p = checkReservedPluginName(e);
  if (p?.severity === "error") return p.message;
  return null;
}
//@ chunk-12wyw8h8.js:26881-28004 placement
function pluginManifestTemplate(e) {
  let { name: n, description: description, author: author } = e,
    f = e.with ?? [],
    o = [],
    m = {
      $schema: PLUGIN_SCHEMA_URL,
      name: n,
      version: "0.1.0",
      description: description ?? "TODO: describe what this plugin provides",
    };
  if (author) m.author = author;
  if (
    ((m.skills = ["./"]),
    o.push({
      relPath: join_2(".claude-plugin", "plugin.json"),
      contents:
        jsonStringify(m, null, 2) +
        `
`,
    }),
    o.push({ relPath: "SKILL.md", contents: skillTemplate(n) }),
    f.includes("skills"))
  )
    o.push({ relPath: join_2("skills", "example", "SKILL.md"), contents: skillTemplate("example") });
  if (f.includes("agents")) o.push({ relPath: join_2("agents", "example.md"), contents: agentTemplate() });
  if (f.includes("hooks"))
    o.push(
      { relPath: join_2("hooks", "hooks.json"), contents: hooksJsonTemplate() },
      {
        relPath: join_2("hooks-handlers", "on-session-start.ts"),
        contents: sessionStartHookTemplate(),
        mode: 493,
      },
    );
  if (f.includes("mcp") && !f.includes("channel"))
    o.push({ relPath: ".mcp.json", contents: mcpJsonTemplate() });
  if (f.includes("lsp")) o.push({ relPath: ".lsp.json", contents: lspJsonTemplate() });
  if (f.includes("output-style"))
    o.push({ relPath: join_2("output-styles", `${n}.md`), contents: outputStyleTemplate(n) });
  if (f.includes("channel"))
    ((m.channels = [{ server: n, displayName: n }]),
      o.push(
        { relPath: ".mcp.json", contents: channelMcpJsonTemplate(n) },
        { relPath: "server.ts", contents: channelServerTemplate(n) },
        { relPath: "package.json", contents: channelPackageJsonTemplate(n) },
      ));
  return (
    (o[0].contents =
      jsonStringify(m, null, 2) +
      `
`),
    o
  );
}
/**
 * `claude plugin` 脚手架：生成插件目录、manifest、示例技能/命令与 bun 脚本模板。
 */
//@ chunk-12wyw8h8.js:28004-28600 placement
async function scaffoldPlugin(e, n, r) {
  let p = resolve(e);
  if (!r.force)
    try {
      await mkdir(join_2(p, ".claude-plugin"));
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST")
        return { ok: !1, error: `${join_2(p, ".claude-plugin")} already exists. Use --force to overwrite.` };
      if (getErrnoCode(error) !== "ENOENT") throw error;
    }
  let f = [];
  for (let o of n) {
    let m = resolve(p, o.relPath),
      u = relative(p, m);
    if (u.startsWith(".." + sep) || u === "..")
      return { ok: !1, error: `Refusing to write outside ${p}: ${o.relPath}` };
    if ((await mkdir(dirname(m), { recursive: !0 }), r.force)) await writeFileAtomic(m, o.contents, o.mode);
    else
      try {
        await writeFile(m, o.contents, { flag: "wx", mode: o.mode });
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        f.push(o.relPath);
      }
  }
  return { ok: !0, skipped: f };
}
/**
 * 生成插件技能 SKILL.md 模板。
 */
//@ chunk-12wyw8h8.js:28600-28931 placement
function skillTemplate(e) {
  return `---
name: ${e}
description: TODO \u2014 describe WHEN Claude should use this. Include trigger phrases users
  might say ("do X", "set up Y", "review Z"). Be specific; this string is what Claude
  matches the user's request against.
---

# ${e}

TODO: what this skill does, and the steps Claude should take.
`;
}
//@ chunk-12wyw8h8.js:28931-29111 placement
function agentTemplate() {
  return `---
name: example
description: TODO \u2014 when should Claude delegate to this subagent?
tools:
  - Read
  - Grep
---

TODO: system prompt for the subagent.
`;
}
//@ chunk-12wyw8h8.js:29111-29271 placement
function hooksJsonTemplate() {
  return (
    jsonStringify(
      {
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: "command",
                  command: 'bun "${CLAUDE_PLUGIN_ROOT}/hooks-handlers/on-session-start.ts"',
                },
              ],
            },
          ],
        },
      },
      null,
      2,
    ) +
    `
`
  );
}
/**
 * 生成 SessionStart 钩子处理脚本模板。
 */
//@ chunk-12wyw8h8.js:29271-29635 placement
function sessionStartHookTemplate() {
  return `#!/usr/bin/env bun
// SessionStart hook handler. Reads the event from stdin, writes a JSON result
// to stdout. Swap "bun" for "node" or "python3" in hooks/hooks.json if your
// users' environment lacks bun.
const input = await new Response(Bun.stdin.stream()).text()
const event = JSON.parse(input)
process.stdout.write(JSON.stringify({}))
`;
}
//@ chunk-12wyw8h8.js:29635-29813 placement
function mcpJsonTemplate() {
  return (
    jsonStringify(
      {
        mcpServers: {
          "example-remote": { type: "http", url: "https://example.com/mcp" },
          "example-local": { command: "npx", args: ["<your-mcp-server-package>"] },
        },
      },
      null,
      2,
    ) +
    `
`
  );
}
//@ chunk-12wyw8h8.js:29813-29954 placement
function lspJsonTemplate() {
  return (
    jsonStringify(
      {
        example: {
          command: "example-language-server",
          args: ["--stdio"],
          extensionToLanguage: { ".example": "example" },
        },
      },
      null,
      2,
    ) +
    `
`
  );
}
/**
 * 生成插件输出样式模板。
 */
//@ chunk-12wyw8h8.js:29954-30314 placement
function outputStyleTemplate(e) {
  return `---
name: ${e}
description: TODO \u2014 one line shown in the Output style picker in /config
force-for-plugin: true
keep-coding-instructions: true
---

TODO: the style prompt. This is appended to Claude's system prompt while the
style is active. With force-for-plugin: true, the style applies automatically
when this plugin is enabled.
`;
}
//@ chunk-12wyw8h8.js:30314-30463 placement
function channelMcpJsonTemplate(e) {
  return (
    jsonStringify(
      {
        mcpServers: {
          [e]: {
            command: "bun",
            args: ["run", "--cwd", "${CLAUDE_PLUGIN_ROOT}", "--shell=bun", "--silent", "start"],
          },
        },
      },
      null,
      2,
    ) +
    `
`
  );
}
//@ chunk-12wyw8h8.js:30463-30670 placement
function channelPackageJsonTemplate(e) {
  return (
    jsonStringify(
      {
        name: `claude-channel-${e}`,
        version: "0.1.0",
        type: "module",
        scripts: { start: "bun install --no-summary && bun server.ts" },
        dependencies: { "@modelcontextprotocol/sdk": "^1.0.0" },
      },
      null,
      2,
    ) +
    `
`
  );
}
/**
 * 生成 channel 插件的 bun server.ts 示例源码（MCP 服务器骨架），name 用于服务名。
 */
//@ chunk-12wyw8h8.js:30670-32781 placement
function channelServerTemplate(name) {
  return `#!/usr/bin/env bun
/**
 * ${name} channel server \u2014 stdio MCP server implementing the channel contract.
 * See https://code.claude.com/docs/en/channels-reference.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const mcp = new Server(
  { name: '${name}', version: '0.1.0' },
  {
    capabilities: {
      tools: {},
      // Required: presence of this key registers the channel notification
      // listener on Claude's side.
      experimental: { 'claude/channel': {} },
    },
    instructions:
      "Events from ${name} arrive as <channel source=\\"${name}\\" ...>. Anything " +
      "you want the sender to see must go through the reply tool \u2014 your " +
      "transcript output never reaches the channel.",
  },
)

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'reply',
      description: 'Send a message back to the ${name} channel.',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
    },
  ],
}))

mcp.setRequestHandler(CallToolRequestSchema, async req => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>
  if (req.params.name === 'reply') {
    // TODO: deliver args.text to the external service.
    return { content: [{ type: 'text', text: 'sent' }] }
  }
  return { content: [{ type: 'text', text: 'unknown tool' }], isError: true }
})

// TODO: when the external service has an inbound event, push it to Claude:
//
//   await mcp.notification({
//     method: 'notifications/claude/channel',
//     params: {
//       content: 'the event body',
//       meta: { chat_id: '...', sender: '...' },
//     },
//   })
//
// Each meta key becomes an attribute on the <channel> tag. Keys must be
// identifiers (letters/digits/underscores) \u2014 others are silently dropped.

await mcp.connect(new StdioServerTransport())
`;
}

export { pluginNameProblem, PLUGIN_COMPONENT_KINDS, pluginManifestTemplate, scaffoldPlugin };
