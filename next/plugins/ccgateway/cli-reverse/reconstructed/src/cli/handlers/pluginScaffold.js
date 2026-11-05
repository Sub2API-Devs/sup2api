/**
 * cli/handlers/pluginScaffold.ts
 *
 * 2.1.316 新增：`claude plugin` 脚手架：生成插件目录、manifest、示例技能/命令与 bun 脚本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h30gsc89.js (14)
 * attribution: placement 14
 */
import { join, resolve, relative, sep, dirname } from "path";
import { mkdir, writeFile } from "fs/promises";
import { PluginManifestSchema } from "../../utils/plugins/schemas.js";
import {
  trimTrailingDotsSpaces,
  isSyncedDirName,
  isHiddenFoldName,
  SYNCED_DIR,
} from "../../utils/plugins/syncedItems.js";
import { checkReservedPluginName } from "../../utils/plugins/reservedPluginNames.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getErrnoCode } from "../../utils/errors.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";

//@ chunk-h30gsc89.js:23153-23284 placement
/**
 * 插件清单 schema 地址与插件脚手架支持的组件类型。
 */
var PLUGIN_SCHEMA_URL = "https://anthropic.com/claude-code/plugin.schema.json";
var PLUGIN_COMPONENT_KINDS = ["skills", "agents", "hooks", "mcp", "lsp", "output-style", "channel"];
//@ chunk-h30gsc89.js:23284-23752 placement
function pluginNameProblem(name) {
  let parsed = PluginManifestSchema().shape.name.safeParse(name);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? null;
  if (name.includes("/") || name.includes("\\") || name.includes("..") || name === ".")
    return 'Plugin name cannot contain path separators (/ or \\), ".." sequences, or be "."';
  if (!trimTrailingDotsSpaces(name) || isSyncedDirName(name) || isHiddenFoldName(name))
    return `Plugin name cannot be "${SYNCED_DIR}" or start with "." \u2014 those directories are never loaded as plugin adoptions`;
  let reserved = checkReservedPluginName(name);
  if (reserved?.severity === "error") return reserved.message;
  return null;
}
//@ chunk-h30gsc89.js:23752-24875 placement
function pluginManifestTemplate(options) {
  let { name, description, author } = options;
  let components = options.with ?? [];
  let files = [];
  let manifest = {
    $schema: PLUGIN_SCHEMA_URL,
    name,
    version: "0.1.0",
    description: description ?? "TODO: describe what this plugin provides",
  };
  if (author) manifest.author = author;
  manifest.skills = ["./"];
  files.push({
    relPath: join(".claude-plugin", "plugin.json"),
    contents:
      jsonStringify(manifest, null, 2) +
      `
`,
  });
  files.push({
    relPath: "SKILL.md",
    contents: skillTemplate(name),
  });
  if (components.includes("skills"))
    files.push({
      relPath: join("skills", "example", "SKILL.md"),
      contents: skillTemplate("example"),
    });
  if (components.includes("agents"))
    files.push({
      relPath: join("agents", "example.md"),
      contents: agentTemplate(),
    });
  if (components.includes("hooks"))
    files.push(
      {
        relPath: join("hooks", "hooks.json"),
        contents: hooksJsonTemplate(),
      },
      {
        relPath: join("hooks-handlers", "on-session-start.ts"),
        contents: sessionStartHookTemplate(),
        mode: 493,
      },
    );
  if (components.includes("mcp") && !components.includes("channel"))
    files.push({
      relPath: ".mcp.json",
      contents: mcpJsonTemplate(),
    });
  if (components.includes("lsp"))
    files.push({
      relPath: ".lsp.json",
      contents: lspJsonTemplate(),
    });
  if (components.includes("output-style"))
    files.push({
      relPath: join("output-styles", `${name}.md`),
      contents: outputStyleTemplate(name),
    });
  if (components.includes("channel")) {
    manifest.channels = [
      {
        server: name,
        displayName: name,
      },
    ];
    files.push(
      {
        relPath: ".mcp.json",
        contents: channelMcpJsonTemplate(name),
      },
      {
        relPath: "server.ts",
        contents: channelServerTemplate(name),
      },
      {
        relPath: "package.json",
        contents: channelPackageJsonTemplate(name),
      },
    );
  }
  files[0].contents =
    jsonStringify(manifest, null, 2) +
    `
`;
  return files;
}
//@ chunk-h30gsc89.js:24875-25471 placement
/**
 * `claude plugin` 脚手架：生成插件目录、manifest、示例技能/命令与 bun 脚本模板。
 */
async function scaffoldPlugin(dir, files, options) {
  let rootDir = resolve(dir);
  if (!options.force)
    try {
      await mkdir(join(rootDir, ".claude-plugin"));
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST")
        return {
          ok: false,
          error: `${join(rootDir, ".claude-plugin")} already exists. Use --force to overwrite.`,
        };
      if (getErrnoCode(error) !== "ENOENT") throw error;
    }
  let skipped = [];
  for (let file of files) {
    let path = resolve(rootDir, file.relPath);
    let relativePath = relative(rootDir, path);
    if (relativePath.startsWith(".." + sep) || relativePath === "..")
      return {
        ok: false,
        error: `Refusing to write outside ${rootDir}: ${file.relPath}`,
      };
    await mkdir(dirname(path), {
      recursive: true,
    });
    if (options.force) await writeFileAtomic(path, file.contents, file.mode);
    else
      try {
        await writeFile(path, file.contents, {
          flag: "wx",
          mode: file.mode,
        });
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        skipped.push(file.relPath);
      }
  }
  return {
    ok: true,
    skipped,
  };
}
//@ chunk-h30gsc89.js:25471-25802 placement
/**
 * 生成插件技能 SKILL.md 模板。
 */
function skillTemplate(name) {
  return `---
name: ${name}
description: TODO \u2014 describe WHEN Claude should use this. Include trigger phrases users
  might say ("do X", "set up Y", "review Z"). Be specific; this string is what Claude
  matches the user's request against.
---

# ${name}

TODO: what this skill does, and the steps Claude should take.
`;
}
//@ chunk-h30gsc89.js:25802-25982 placement
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
//@ chunk-h30gsc89.js:25982-26142 placement
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
//@ chunk-h30gsc89.js:26142-26506 placement
/**
 * 生成 SessionStart 钩子处理脚本模板。
 */
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
//@ chunk-h30gsc89.js:26506-26684 placement
function mcpJsonTemplate() {
  return (
    jsonStringify(
      {
        mcpServers: {
          "example-remote": {
            type: "http",
            url: "https://example.com/mcp",
          },
          "example-local": {
            command: "npx",
            args: ["<your-mcp-server-package>"],
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
//@ chunk-h30gsc89.js:26684-26825 placement
function lspJsonTemplate() {
  return (
    jsonStringify(
      {
        example: {
          command: "example-language-server",
          args: ["--stdio"],
          extensionToLanguage: {
            ".example": "example",
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
//@ chunk-h30gsc89.js:26825-27185 placement
/**
 * 生成插件输出样式模板。
 */
function outputStyleTemplate(name) {
  return `---
name: ${name}
description: TODO \u2014 one line shown in the Output style picker in /config
force-for-plugin: true
keep-coding-instructions: true
---

TODO: the style prompt. This is appended to Claude's system prompt while the
style is active. With force-for-plugin: true, the style applies automatically
when this plugin is enabled.
`;
}
//@ chunk-h30gsc89.js:27185-27334 placement
function channelMcpJsonTemplate(name) {
  return (
    jsonStringify(
      {
        mcpServers: {
          [name]: {
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
//@ chunk-h30gsc89.js:27334-27541 placement
function channelPackageJsonTemplate(name) {
  return (
    jsonStringify(
      {
        name: `claude-channel-${name}`,
        version: "0.1.0",
        type: "module",
        scripts: {
          start: "bun install --no-summary && bun server.ts",
        },
        dependencies: {
          "@modelcontextprotocol/sdk": "^1.0.0",
        },
      },
      null,
      2,
    ) +
    `
`
  );
}
//@ chunk-h30gsc89.js:27541-29652 placement
/**
 * 生成 channel 插件的 bun server.ts 示例源码（MCP 服务器骨架），name 用于服务名。
 */
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
