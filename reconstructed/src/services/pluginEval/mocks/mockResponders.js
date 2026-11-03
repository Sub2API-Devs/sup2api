/**
 * services/pluginEval/mocks/mockResponders.ts
 *
 * 2.1.316 新增：plugin eval 的 mocks/ 目录：每个 MCP 服务器的 _server.md、_tools.json 与 <tool>.md 应答者分层加载
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (16)
 * attribution: placement 16
 */
import { lstat, readdir, stat } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  union,
  string,
  E,
  M,
  lazy,
  array,
  record,
  u,
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

//@ chunk-qchp9vrd.js:31046-31057 placement
/**
 * 每层最多读取的目录数（256）。
 */
var MAX_LAYERS = 256;
//@ chunk-qchp9vrd.js:31057-31135 placement
/**
 * 判断路径是否为符号链接。
 */
async function isSymlink(e) {
  try {
    return (await lstat(e)).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-qchp9vrd.js:31135-31654 placement
/**
 * _tools.json 的 schema。
 */
var MAX_MOCK_FILE_BYTES = 1048576;
var SERVER_RESPONDER_FILE = "_server.md";
var TOOLS_JSON_FILE = "_tools.json";
var MAX_SERVERS_LISTED = 256;
var MOCK_NAME_RE = /^[A-Za-z0-9_-]+$/;
var echoValueSchema = DoctorLazy(() => {
  let e = union([string(), E(), M()]).transform(String);
  let n = lazy(() => union([e, array(e), record(string(), n)]));
  return n;
});
var responderFrontmatterSchema = DoctorLazy(() =>
  u({
    type: _enum(["fixed", "agent"]).default("fixed"),
    expect: record(string(), echoValueSchema()).optional(),
    error: M().optional(),
    tools: array(
      string().regex(MOCK_NAME_RE, 'tool names may contain only letters, digits, "_" and "-"'),
    ).optional(),
    abort_when: string().optional(),
  }).strict(),
);
var toolsJsonSchema = DoctorLazy(() =>
  u({
    tools: array(
      u({
        name: string().min(1),
        description: string().optional(),
        inputSchema: record(string(), unknown()).optional(),
      }),
    ),
  }),
);
//@ chunk-qchp9vrd.js:31654-31704 placement
/**
 * 空的模拟层级结构。
 */
function emptyMockLayers() {
  return {
    layers: new Map(),
    pins: new Map(),
  };
}
//@ chunk-qchp9vrd.js:31704-32587 placement
/**
 * 汇总各层 mocks/<server>/ 的应答者；无应答者时提示。
 */
async function loadMockServers(e, layers = emptyMockLayers()) {
  let r = [];
  let a = new Set();
  let s = [];
  for (let w of e) {
    let resolved = path.resolve(w);
    if (a.has(resolved)) continue;
    a.add(resolved);
    let y = layers.layers.get(resolved);
    if (!y) {
      y = (async () => {
        let T = [];
        return {
          raw: await loadMocksDir(path.join(w, "mocks"), T),
          notes: T,
        };
      })();
      layers.layers.set(resolved, y);
    }
    let { raw, notes } = await y;
    r.push(...notes);
    s.push(raw);
  }
  let h = new Map();
  for (let w of new Set(s.flatMap((b) => [...b.keys()]))) {
    let b = describeUncoveredAbortWhen(
      w,
      s.flatMap((y) => y.get(w) ?? []),
      r,
    );
    if (b.tools.size === 0) {
      r.push(`mocks: mocks/${w}/ has no <tool>.md responders in any layer \u2014 nothing is mocked for ${w}`);
      continue;
    }
    for (let y of new Set(b.tools.values())) {
      if (y.kind !== "agent") continue;
      let joined = path.join(path.dirname(path.dirname(y.sourceFile)), REPLAY_DIR_SUFFIX, w);
      let S = layers.pins.get(joined);
      if (S === undefined) {
        let T = [];
        S = loadMockReplayRecordings(joined, T).then((pinned) => ({
          pinned,
          notes: T,
        }));
        layers.pins.set(joined, S);
      }
      if (!(joined in b.recordings)) {
        let { pinned, notes } = await S;
        b.recordings[joined] = pinned;
        r.push(...notes);
      }
    }
    h.set(w, b);
  }
  return {
    servers: h,
    notes: r,
  };
}
//@ chunk-qchp9vrd.js:32587-33503 placement
async function loadMocksDir(e, n) {
  let r = new Map();
  let a;
  try {
    await checkRepoAuthoredPath(path.dirname(e), path.basename(e), "mocks/");
    a = sortByName(
      await readdir(e, {
        withFileTypes: true,
      }),
    );
  } catch (error) {
    if (isENOENT(error)) {
      if (await isDanglingSymlink(e))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "mocks/ is a symbolic link whose target does not exist",
          "mocks/: dangling symbolic link",
        );
      return r;
    }
    if (getErrnoCode(error) === "ENOTDIR") {
      if (await isDanglingSymlink(e))
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
  if (a.length > MAX_SERVERS_LISTED)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/ has ${a.length} entries (cap: ${MAX_SERVERS_LISTED})`,
      "mocks/: too many entries",
    );
  for (let s of a) {
    if (s.name.startsWith(".")) continue;
    let fileKind = await getFileKind(s, path.join(e, s.name), "unknown");
    if (fileKind !== "dir" && fileKind !== "symlink" && fileKind !== "unknown") continue;
    let mockServerDir = await loadMockServerDir(path.join(e, s.name), s.name, n);
    if (mockServerDir !== null) r.set(s.name, mockServerDir);
  }
  return r;
}
//@ chunk-qchp9vrd.js:33503-33575 placement
/**
 * 按名字排序目录项。
 */
function sortByName(e) {
  return e.sort((n, r) => (n.name < r.name ? -1 : n.name > r.name ? 1 : 0));
}
//@ chunk-qchp9vrd.js:33575-33707 placement
async function isDanglingSymlink(e) {
  try {
    if (!(await lstat(e)).isSymbolicLink()) return false;
  } catch {
    return false;
  }
  try {
    await stat(e);
    return false;
  } catch (error) {
    return isENOENT(error);
  }
}
//@ chunk-qchp9vrd.js:33707-35751 placement
/**
 * 读取 mocks/<server>/ 下的 _server.md、_tools.json 与各工具应答者。
 */
async function loadMockServerDir(baseDir, name, r) {
  let a;
  try {
    await checkRepoAuthoredPath(path.dirname(baseDir), name, `mocks/${formatGuardValueJson(name)}/`);
    a = sortByName(
      await readdir(baseDir, {
        withFileTypes: true,
      }),
    );
  } catch (error) {
    if (isENOENT(error) || (getErrnoCode(error) === "ENOTDIR" && (await isDanglingSymlink(baseDir))))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${formatGuardValueJson(name)} is a symbolic link whose target does not exist`,
        "mocks/<server>/: dangling symbolic link",
      );
    if (getErrnoCode(error) === "ENOTDIR") return null;
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/${formatGuardValueJson(name)}/ is unreadable (${getErrnoCode(error) ?? "unknown error"})`,
      "mocks/<server>/: unreadable",
    );
  }
  if (!MOCK_NAME_RE.test(name))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/${formatGuardValueJson(name)}/: name the directory after the server segment of the tool name (letters, digits, "_" and "-" only)`,
      "mocks: directory name not a tool-name segment",
    );
  if (a.length > MAX_SERVERS_LISTED)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `mocks/${name}/ has ${a.length} entries (cap: ${MAX_SERVERS_LISTED})`,
      "mocks/<server>/: too many entries",
    );
  let s = new Map();
  let h = null;
  let w = new Map();
  for (let b of a) {
    let joined = path.join(baseDir, b.name);
    if (b.name === TOOLS_JSON_FILE) {
      w = await loadMockToolsJson(joined, name);
      continue;
    }
    if (b.name.startsWith(".") || !b.name.endsWith(".md") || b.isDirectory()) continue;
    let base = path.basename(b.name, ".md");
    if (b.name !== SERVER_RESPONDER_FILE && !MOCK_NAME_RE.test(base))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `mocks/${name}/${formatGuardValueJson(b.name)}: name responder files after the tool (letters, digits, "_" and "-" only), e.g. list_issues.md`,
        "mocks: tool file name not a tool-name segment",
      );
    let { responder, tools } = await loadMockToolResponder(joined, baseDir, name);
    if (b.name === SERVER_RESPONDER_FILE) {
      if (responder.kind !== "agent")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${name}/${SERVER_RESPONDER_FILE}: only \`type: agent\` is meaningful here (one agent answering several tools); put a fixed answer in <tool>.md`,
          "mocks: _server.md not an agent",
        );
      if (tools.length === 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${name}/${SERVER_RESPONDER_FILE}: an agent answering several tools needs \`tools: [...]\``,
          "mocks: _server.md without tools",
        );
      if (responder.expect !== null && tools.length > 1)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `mocks/${name}/${SERVER_RESPONDER_FILE}: \`expect:\` here would guard all ${tools.length} tools it answers; put the guard on the one tool it is meant for as mocks/${name}/<tool>.md`,
          "mocks: expect on multi-tool _server.md",
        );
      h = {
        responder,
        tools,
      };
      continue;
    }
    s.set(base, responder);
  }
  if (s.size === 0 && h === null && w.size === 0) {
    r.push(`mocks: mocks/${name}/ has no <tool>.md responders \u2014 nothing is mocked for ${name}`);
    return null;
  }
  return {
    dir: baseDir,
    toolFiles: s,
    serverAgent: h,
    listings: w,
  };
}
//@ chunk-qchp9vrd.js:35751-37469 placement
async function loadMockToolResponder(e, baseDir, r) {
  let a = `mocks/${r}/${path.basename(e)}`;
  let s;
  let h;
  try {
    s = await readTextFile(e, MAX_MOCK_FILE_BYTES, a);
    if (s === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${a}: disappeared while loading`,
        "mocks: file vanished",
      );
    h = parseProseFrontmatter(s, e);
  } catch (error) {
    throw rebaseErrorPrefix(error, e, a);
  }
  let { fm, body } = h;
  let y = responderFrontmatterSchema().safeParse(fm);
  if (!y.success) {
    let x = y.error.issues[0];
    let j = x?.path.length ? x.path.join(".") : "frontmatter";
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${a}: ${j}: ${x?.message ?? "invalid"} (keys: type, expect, error, tools, abort_when)`,
      "mocks: invalid frontmatter",
    );
  }
  let R = y.data;
  let expect = R.expect ?? null;
  if (expect !== null) {
    let x = compileExpectGuards(expect);
    if (x.length > 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${a}: ${x[0]}`,
        "mocks: invalid expect",
      );
  }
  if (R.tools !== undefined && path.basename(e) !== SERVER_RESPONDER_FILE)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${a}: \`tools:\` belongs in ${SERVER_RESPONDER_FILE} (a <tool>.md answers the tool it is named after)`,
      "mocks: tools outside _server.md",
    );
  let tools = R.tools ?? [];
  let replaced = body.replace(/^\n+/, "").replace(/\s+$/, "");
  if (R.type === "agent") {
    if (R.error !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${a}: \`error:\` applies to fixed responders only`,
        "mocks: error on agent",
      );
    if (replaced === "" || hasToolTemplate(replaced))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${a}: an agent responder needs a description of the server it plays as its body${replaced === "" ? "" : " (it still holds the scaffolded placeholder)"}`,
        "mocks: empty agent prompt",
      );
    return {
      responder: {
        kind: "agent",
        prompt: replaced,
        abortWhen: R.abort_when?.trim() ? R.abort_when : null,
        expect,
        baseDir,
        sourceFile: e,
        sourceHash: sourceHash(s),
      },
      tools,
    };
  }
  if (R.abort_when !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${a}: \`abort_when:\` needs \`type: agent\`; a fixed responder guards its input with \`expect:\``,
      "mocks: abort_when on fixed",
    );
  if (hasToolTemplate(replaced))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${a}: still holds the scaffolded placeholder \u2014 write the tool's canned answer as the body`,
      "mocks: unfilled stub",
    );
  return {
    responder: {
      kind: "fixed",
      body: replaced,
      isError: R.error ?? false,
      expect,
      baseDir,
      sourceFile: e,
      sourceHash: sourceHash(s),
    },
    tools,
  };
}
//@ chunk-qchp9vrd.js:37469-37562 placement
/**
 * 取规范化内容的短哈希（16 位）。
 */
function sourceHash(e) {
  return createHash("sha256")
    .update(
      e.replaceAll(
        `\r
`,
        `
`,
      ),
    )
    .digest("hex")
    .slice(0, 16);
}
//@ chunk-qchp9vrd.js:37562-37632 placement
var MOCK_TOOL_TEMPLATE = "TODO: replace with the canned result this tool should return";
//@ chunk-qchp9vrd.js:37632-37669 placement
/**
 * 判断文本里是否还留着工具模板占位。
 */
function hasToolTemplate(e) {
  return e.includes(MOCK_TOOL_TEMPLATE);
}
//@ chunk-qchp9vrd.js:37669-38303 placement
/**
 * 解析 _tools.json（工具名、描述、输入模式）。
 */
async function loadMockToolsJson(e, n) {
  let r = `mocks/${n}/${TOOLS_JSON_FILE}`;
  let a = await readTextFile(e, MAX_MOCK_FILE_BYTES, r).catch((error) => {
    throw rebaseErrorPrefix(error, e, r);
  });
  let s = new Map();
  if (a === null) return s;
  let h;
  try {
    h = jsonParse(a);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: not valid JSON (${error instanceof Error ? error.message : String(error)})`,
      "mocks: _tools.json invalid",
    );
  }
  let w = typeof h === "object" && h !== null && "result" in h ? h.result : h;
  let b = toolsJsonSchema().safeParse(w);
  if (!b.success)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: expected a saved tools/list response ({"tools": [{"name", "description", "inputSchema"}]})`,
      "mocks: _tools.json shape",
    );
  for (let tool of b.data.tools)
    s.set(tool.name, {
      name: tool.name,
      description: tool.description ?? "",
      inputSchema: tool.inputSchema ?? {
        type: "object",
      },
    });
  return s;
}
//@ chunk-qchp9vrd.js:38303-39231 placement
function describeUncoveredAbortWhen(e, n, r) {
  let a = new Map();
  let s = n.map((w) => w.serverAgent).findLast((w) => w !== null) ?? null;
  if (s !== null) for (let tool of s.tools) a.set(tool, s.responder);
  for (let w of n) for (let [b, y] of w.toolFiles) a.set(b, y);
  if (s !== null)
    for (let tool of s.tools) {
      let b = a.get(tool);
      if (b !== undefined && b !== s.responder)
        r.push(
          `mocks: ${path.relative(path.dirname(path.dirname(s.responder.sourceFile)), s.responder.sourceFile)} will not see ${tool} \u2014 answered by ${path.relative(path.dirname(path.dirname(path.dirname(path.dirname(b.sourceFile)))), b.sourceFile)}, so its abort_when does not cover that tool`,
        );
    }
  let listings = new Map(n.flatMap((w) => [...w.listings]));
  for (let w of new Set(a.values()))
    if (
      w.kind === "agent" &&
      w.abortWhen === null &&
      /\b(abort|fail)\b[^.]{0,40}\b(eval|run)\b/i.test(w.prompt)
    )
      r.push(
        `mocks: ${e}/${path.basename(w.sourceFile)} mentions failing the run in its prose but has no abort_when: \u2014 only abort_when can abort`,
      );
  return {
    dirName: e,
    tools: a,
    listings,
    recordings: {},
  };
}
//@ chunk-qchp9vrd.js:39231-39417 placement
function rebaseErrorPrefix(error, n, r) {
  let base = path.basename(n);
  if (
    error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    error.message.startsWith(base) &&
    !error.message.startsWith(r)
  )
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}${error.message.slice(base.length)}`,
      error.telemetryMessage,
    );
  return error;
}
export { isSymlink, MAX_LAYERS, MOCK_TOOL_TEMPLATE, emptyMockLayers, loadMockServers };
