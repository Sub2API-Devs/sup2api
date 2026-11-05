/**
 * services/pluginEval/mocks/mockResponders.ts
 *
 * 2.1.316 新增：plugin eval 的 mocks/ 目录：每个 MCP 服务器的 _server.md、_tools.json 与 <tool>.md 应答者分层加载
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstat, readdir, stat } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  union,
  stringSchema,
  numberSchema,
  booleanSchema,
  lazy,
  array,
  record,
  objectSchema,
  _enum,
  unknown,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { REPLAY_DIR_SUFFIX, loadMockReplayRecordings } from "./mockRecordings.js";
import {
  checkRepoAuthoredPath,
  formatGuardValueJson,
  compileExpectGuards,
} from "../../../cli/handlers/pluginEval/mockGuards.js";
import {
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../../utils/errors.js";
import { getFileKind } from "../../../utils/fileKind.js";
import { readTextFile, parseProseFrontmatter } from "../caseSchema.js";
import { jsonParse } from "../../../utils/slowOperations.js";
import { deferInit, beginDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 2 modules closed by ../caseSchema.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/services/pluginEval/caseSchema.js");
//@ chunk-af1hzzme.js:32386-32397 placement
/**
 * 每层最多读取的目录数（256）。
 */
var MAX_LAYERS = 256;
//@ chunk-af1hzzme.js:32397-32475 placement
/**
 * 判断路径是否为符号链接。
 */
async function isSymlink(filePath) {
  try {
    return (await lstat(filePath)).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-af1hzzme.js:32475-32994 placement
/**
 * _tools.json 的 schema。
 */
var MAX_MOCK_FILE_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SERVER_RESPONDER_FILE;
var TOOLS_JSON_FILE;
var MAX_SERVERS_LISTED;
var MOCK_NAME_RE;
var echoValueSchema;
var responderFrontmatterSchema;
var toolsJsonSchema;
deferInit("chunk-af1hzzme.js:32475", () => {
  MAX_MOCK_FILE_BYTES = 1048576;
  SERVER_RESPONDER_FILE = "_server.md";
  TOOLS_JSON_FILE = "_tools.json";
  MAX_SERVERS_LISTED = 256;
  MOCK_NAME_RE = /^[A-Za-z0-9_-]+$/;
  echoValueSchema = DoctorLazy(() => {
    let echoScalar = union([stringSchema(), numberSchema(), booleanSchema()]).transform(String);
    let echoValue = lazy(() => union([echoScalar, array(echoScalar), record(stringSchema(), echoValue)]));
    return echoValue;
  });
  responderFrontmatterSchema = DoctorLazy(() =>
    objectSchema({
      type: _enum(["fixed", "agent"]).default("fixed"),
      expect: record(stringSchema(), echoValueSchema()).optional(),
      error: booleanSchema().optional(),
      tools: array(
        stringSchema().regex(MOCK_NAME_RE, 'tool names may contain only letters, digits, "_" and "-"'),
      ).optional(),
      abort_when: stringSchema().optional(),
    }).strict(),
  );
  toolsJsonSchema = DoctorLazy(() =>
    objectSchema({
      tools: array(
        objectSchema({
          name: stringSchema().min(1),
          description: stringSchema().optional(),
          inputSchema: record(stringSchema(), unknown()).optional(),
        }),
      ),
    }),
  );
});
//@ chunk-af1hzzme.js:32994-33044 placement
/**
 * 空的模拟层级结构。
 */
function emptyMockLayers() {
  return {
    layers: new Map(),
    pins: new Map(),
  };
}
//@ chunk-af1hzzme.js:33044-33927 placement
/**
 * 汇总各层 mocks/<server>/ 的应答者；无应答者时提示。
 */
async function loadMockServers(plugins, layers = emptyMockLayers()) {
  let notes = [];
  let seen = new Set();
  let rawLayers = [];
  for (let pluginDirs of plugins) {
    let resolved = path.resolve(pluginDirs);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    let layerPromise = layers.layers.get(resolved);
    if (!layerPromise) {
      layerPromise = (async () => {
        let layerNotes = [];
        return {
          raw: await loadMocksDir(path.join(pluginDirs, "mocks"), layerNotes),
          notes: layerNotes,
        };
      })();
      layers.layers.set(resolved, layerPromise);
    }
    let { raw, notes: notes_2 } = await layerPromise;
    notes.push(...notes_2);
    rawLayers.push(raw);
  }
  let servers = new Map();
  for (let dirName of new Set(rawLayers.flatMap((layer) => [...layer.keys()]))) {
    let server = describeUncoveredAbortWhen(
      dirName,
      rawLayers.flatMap((layer) => layer.get(dirName) ?? []),
      notes,
    );
    if (server.tools.size === 0) {
      notes.push(
        `mocks: mocks/${dirName}/ has no <tool>.md responders in any layer \u2014 nothing is mocked for ${dirName}`,
      );
      continue;
    }
    for (let responder of new Set(server.tools.values())) {
      if (responder.kind !== "agent") continue;
      let recordingsDir = path.join(
        path.dirname(path.dirname(responder.sourceFile)),
        REPLAY_DIR_SUFFIX,
        dirName,
      );
      let pinnedPromise = layers.pins.get(recordingsDir);
      if (pinnedPromise === undefined) {
        let pinNotes = [];
        pinnedPromise = loadMockReplayRecordings(recordingsDir, pinNotes).then((pinned) => ({
          pinned,
          notes: pinNotes,
        }));
        layers.pins.set(recordingsDir, pinnedPromise);
      }
      if (!(recordingsDir in server.recordings)) {
        let { pinned, notes: notes_2 } = await pinnedPromise;
        server.recordings[recordingsDir] = pinned;
        notes.push(...notes_2);
      }
    }
    servers.set(dirName, server);
  }
  return {
    servers,
    notes,
  };
}
//@ chunk-af1hzzme.js:33927-34843 placement
async function loadMocksDir(mocksDir, notes) {
  let servers = new Map();
  let entries;
  try {
    await checkRepoAuthoredPath(path.dirname(mocksDir), path.basename(mocksDir), "mocks/");
    entries = sortByName(
      await readdir(mocksDir, {
        withFileTypes: true,
      }),
    );
  } catch (error) {
    if (isENOENT(error)) {
      if (await isDanglingSymlink(mocksDir))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "mocks/ is a symbolic link whose target does not exist",
          "mocks/: dangling symbolic link",
        );
      return servers;
    }
    if (getErrnoCode(error) === "ENOTDIR") {
      if (await isDanglingSymlink(mocksDir))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "mocks/ is a symbolic link whose target does not exist",
          "mocks/: dangling symbolic link",
        );
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "mocks is not a directory",
        "mocks/: not a directory",
      );
    }
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/ is unreadable (${getErrnoCode(error) ?? "unknown error"})`,
      "mocks/: unreadable",
    );
  }
  if (entries.length > MAX_SERVERS_LISTED)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/ has ${entries.length} entries (cap: ${MAX_SERVERS_LISTED})`,
      "mocks/: too many entries",
    );
  for (let entry of entries) {
    if (entry.name.startsWith(".")) continue;
    let fileKind = await getFileKind(entry, path.join(mocksDir, entry.name), "unknown");
    if (fileKind !== "dir" && fileKind !== "symlink" && fileKind !== "unknown") continue;
    let mockServerDir = await loadMockServerDir(path.join(mocksDir, entry.name), entry.name, notes);
    if (mockServerDir !== null) servers.set(entry.name, mockServerDir);
  }
  return servers;
}
//@ chunk-af1hzzme.js:34843-34915 placement
/**
 * 按名字排序目录项。
 */
function sortByName(entries) {
  return entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
}
//@ chunk-af1hzzme.js:34915-35047 placement
async function isDanglingSymlink(path) {
  try {
    if (!(await lstat(path)).isSymbolicLink()) return false;
  } catch {
    return false;
  }
  try {
    await stat(path);
    return false;
  } catch (error) {
    return isENOENT(error);
  }
}
//@ chunk-af1hzzme.js:35047-37091 placement
/**
 * 读取 mocks/<server>/ 下的 _server.md、_tools.json 与各工具应答者。
 */
async function loadMockServerDir(serverDir, serverName, notes) {
  let entries;
  try {
    await checkRepoAuthoredPath(
      path.dirname(serverDir),
      serverName,
      `mocks/${formatGuardValueJson(serverName)}/`,
    );
    entries = sortByName(
      await readdir(serverDir, {
        withFileTypes: true,
      }),
    );
  } catch (error) {
    if (isENOENT(error) || (getErrnoCode(error) === "ENOTDIR" && (await isDanglingSymlink(serverDir))))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${formatGuardValueJson(serverName)} is a symbolic link whose target does not exist`,
        "mocks/<server>/: dangling symbolic link",
      );
    if (getErrnoCode(error) === "ENOTDIR") return null;
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/${formatGuardValueJson(serverName)}/ is unreadable (${getErrnoCode(error) ?? "unknown error"})`,
      "mocks/<server>/: unreadable",
    );
  }
  if (!MOCK_NAME_RE.test(serverName))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/${formatGuardValueJson(serverName)}/: name the directory after the server segment of the tool name (letters, digits, "_" and "-" only)`,
      "mocks: directory name not a tool-name segment",
    );
  if (entries.length > MAX_SERVERS_LISTED)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/${serverName}/ has ${entries.length} entries (cap: ${MAX_SERVERS_LISTED})`,
      "mocks/<server>/: too many entries",
    );
  let toolFiles = new Map();
  let serverAgent = null;
  let listings = new Map();
  for (let entry of entries) {
    let filePath = path.join(serverDir, entry.name);
    if (entry.name === TOOLS_JSON_FILE) {
      listings = await loadMockToolsJson(filePath, serverName);
      continue;
    }
    if (entry.name.startsWith(".") || !entry.name.endsWith(".md") || entry.isDirectory()) continue;
    let base = path.basename(entry.name, ".md");
    if (entry.name !== SERVER_RESPONDER_FILE && !MOCK_NAME_RE.test(base))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${serverName}/${formatGuardValueJson(entry.name)}: name responder files after the tool (letters, digits, "_" and "-" only), e.g. list_issues.md`,
        "mocks: tool file name not a tool-name segment",
      );
    let { responder, tools } = await loadMockToolResponder(filePath, serverDir, serverName);
    if (entry.name === SERVER_RESPONDER_FILE) {
      if (responder.kind !== "agent")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${serverName}/${SERVER_RESPONDER_FILE}: only \`type: agent\` is meaningful here (one agent answering several tools); put a fixed answer in <tool>.md`,
          "mocks: _server.md not an agent",
        );
      if (tools.length === 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${serverName}/${SERVER_RESPONDER_FILE}: an agent answering several tools needs \`tools: [...]\``,
          "mocks: _server.md without tools",
        );
      if (responder.expect !== null && tools.length > 1)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${serverName}/${SERVER_RESPONDER_FILE}: \`expect:\` here would guard all ${tools.length} tools it answers; put the guard on the one tool it is meant for as mocks/${serverName}/<tool>.md`,
          "mocks: expect on multi-tool _server.md",
        );
      serverAgent = {
        responder,
        tools,
      };
      continue;
    }
    toolFiles.set(base, responder);
  }
  if (toolFiles.size === 0 && serverAgent === null && listings.size === 0) {
    notes.push(
      `mocks: mocks/${serverName}/ has no <tool>.md responders \u2014 nothing is mocked for ${serverName}`,
    );
    return null;
  }
  return {
    dir: serverDir,
    toolFiles,
    serverAgent,
    listings,
  };
}
//@ chunk-af1hzzme.js:37091-38809 placement
async function loadMockToolResponder(filePath, baseDir, serverName) {
  let label = `mocks/${serverName}/${path.basename(filePath)}`;
  let text;
  let parsed;
  try {
    text = await readTextFile(filePath, MAX_MOCK_FILE_BYTES, label);
    if (text === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${label}: disappeared while loading`,
        "mocks: file vanished",
      );
    parsed = parseProseFrontmatter(text, filePath);
  } catch (error) {
    throw rebaseErrorPrefix(error, filePath, label);
  }
  let { fm, body } = parsed;
  let frontmatter = responderFrontmatterSchema().safeParse(fm);
  if (!frontmatter.success) {
    let issue = frontmatter.error.issues[0];
    let keyPath = issue?.path.length ? issue.path.join(".") : "frontmatter";
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: ${keyPath}: ${issue?.message ?? "invalid"} (keys: type, expect, error, tools, abort_when)`,
      "mocks: invalid frontmatter",
    );
  }
  let data = frontmatter.data;
  let expect = data.expect ?? null;
  if (expect !== null) {
    let expectProblems = compileExpectGuards(expect);
    if (expectProblems.length > 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${label}: ${expectProblems[0]}`,
        "mocks: invalid expect",
      );
  }
  if (data.tools !== undefined && path.basename(filePath) !== SERVER_RESPONDER_FILE)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: \`tools:\` belongs in ${SERVER_RESPONDER_FILE} (a <tool>.md answers the tool it is named after)`,
      "mocks: tools outside _server.md",
    );
  let tools = data.tools ?? [];
  let text_2 = body.replace(/^\n+/, "").replace(/\s+$/, "");
  if (data.type === "agent") {
    if (data.error !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${label}: \`error:\` applies to fixed responders only`,
        "mocks: error on agent",
      );
    if (text_2 === "" || hasToolTemplate(text_2))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${label}: an agent responder needs a description of the server it plays as its body${text_2 === "" ? "" : " (it still holds the scaffolded placeholder)"}`,
        "mocks: empty agent prompt",
      );
    return {
      responder: {
        kind: "agent",
        prompt: text_2,
        abortWhen: data.abort_when?.trim() ? data.abort_when : null,
        expect,
        baseDir,
        sourceFile: filePath,
        sourceHash: sourceHash(text),
      },
      tools,
    };
  }
  if (data.abort_when !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: \`abort_when:\` needs \`type: agent\`; a fixed responder guards its input with \`expect:\``,
      "mocks: abort_when on fixed",
    );
  if (hasToolTemplate(text_2))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: still holds the scaffolded placeholder \u2014 write the tool's canned answer as the body`,
      "mocks: unfilled stub",
    );
  return {
    responder: {
      kind: "fixed",
      body: text_2,
      isError: data.error ?? false,
      expect,
      baseDir,
      sourceFile: filePath,
      sourceHash: sourceHash(text),
    },
    tools,
  };
}
//@ chunk-af1hzzme.js:38809-38902 placement
/**
 * 取规范化内容的短哈希（16 位）。
 */
function sourceHash(text) {
  return createHash("sha256")
    .update(
      text.replaceAll(
        `\r
`,
        `
`,
      ),
    )
    .digest("hex")
    .slice(0, 16);
}
//@ chunk-af1hzzme.js:38902-38972 placement
var MOCK_TOOL_TEMPLATE = "TODO: replace with the canned result this tool should return";
//@ chunk-af1hzzme.js:38972-39009 placement
/**
 * 判断文本里是否还留着工具模板占位。
 */
function hasToolTemplate(text) {
  return text.includes(MOCK_TOOL_TEMPLATE);
}
//@ chunk-af1hzzme.js:39009-39643 placement
/**
 * 解析 _tools.json（工具名、描述、输入模式）。
 */
async function loadMockToolsJson(filePath, serverName) {
  let label = `mocks/${serverName}/${TOOLS_JSON_FILE}`;
  let text = await readTextFile(filePath, MAX_MOCK_FILE_BYTES, label).catch((error) => {
    throw rebaseErrorPrefix(error, filePath, label);
  });
  let tools = new Map();
  if (text === null) return tools;
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: not valid JSON (${error instanceof Error ? error.message : String(error)})`,
      "mocks: _tools.json invalid",
    );
  }
  let resultValue =
    typeof parsed === "object" && parsed !== null && "result" in parsed ? parsed.result : parsed;
  let validated = toolsJsonSchema().safeParse(resultValue);
  if (!validated.success)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: expected a saved tools/list response ({"tools": [{"name", "description", "inputSchema"}]})`,
      "mocks: _tools.json shape",
    );
  for (let tool of validated.data.tools)
    tools.set(tool.name, {
      name: tool.name,
      description: tool.description ?? "",
      inputSchema: tool.inputSchema ?? {
        type: "object",
      },
    });
  return tools;
}
//@ chunk-af1hzzme.js:39643-40571 placement
function describeUncoveredAbortWhen(serverSegment, layers, notes) {
  let tools = new Map();
  let serverAgent = layers.map((layer) => layer.serverAgent).findLast((layer) => layer !== null) ?? null;
  if (serverAgent !== null) for (let tool of serverAgent.tools) tools.set(tool, serverAgent.responder);
  for (let layer of layers) for (let [toolName, responder] of layer.toolFiles) tools.set(toolName, responder);
  if (serverAgent !== null)
    for (let tool of serverAgent.tools) {
      let otherResponder = tools.get(tool);
      if (otherResponder !== undefined && otherResponder !== serverAgent.responder)
        notes.push(
          `mocks: ${path.relative(path.dirname(path.dirname(serverAgent.responder.sourceFile)), serverAgent.responder.sourceFile)} will not see ${tool} \u2014 answered by ${path.relative(path.dirname(path.dirname(path.dirname(path.dirname(otherResponder.sourceFile)))), otherResponder.sourceFile)}, so its abort_when does not cover that tool`,
        );
    }
  let listings = new Map(layers.flatMap((layer) => [...layer.listings]));
  for (let responder of new Set(tools.values()))
    if (
      responder.kind === "agent" &&
      responder.abortWhen === null &&
      /\b(abort|fail)\b[^.]{0,40}\b(eval|run)\b/i.test(responder.prompt)
    )
      notes.push(
        `mocks: ${serverSegment}/${path.basename(responder.sourceFile)} mentions failing the run in its prose but has no abort_when: \u2014 only abort_when can abort`,
      );
  return {
    dirName: serverSegment,
    tools,
    listings,
    recordings: {},
  };
}
//@ chunk-af1hzzme.js:40571-40757 placement
function rebaseErrorPrefix(error, filePath, label) {
  let base = path.basename(filePath);
  if (
    error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    error.message.startsWith(base) &&
    !error.message.startsWith(label)
  )
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}${error.message.slice(base.length)}`,
      error.telemetryMessage,
    );
  return error;
}
export { isSymlink, MAX_LAYERS, MOCK_TOOL_TEMPLATE, emptyMockLayers, loadMockServers };
