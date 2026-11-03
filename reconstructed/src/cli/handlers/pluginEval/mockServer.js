/**
 * cli/handlers/pluginEval/mockServer.ts
 *
 * 2.1.316 新增（门面模块 runEvalMockServer）。插件评测时的 mock 模型/工具服务器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vzw8h259.js (14)
 * attribution: placement 14
 */
import { createHash } from "crypto";
import path, { default as path_2, default as path_3 } from "path";
import { open } from "fs/promises";
import { constants } from "fs";
import { BufferedStdioServerTransport } from "../../../services/mcp/stdioServer.js";
import { jsonStringify, jsonParse } from "../../../utils/slowOperations.js";
import { Server } from "../../../../vendor/@modelcontextprotocol/sdk/dist/esm/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "../../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import {
  Brn,
  checkExpectGuards,
  relayAgentMockCall,
  substituteAgentInput,
  checkRepoAuthoredPath,
  MAX_FIXTURE_BYTES,
  MOCK_SPEC_SCHEMA,
} from "./mockGuards.js";
import { getPlatform } from "../../../utils/platform.js";
import { isENOENT, getErrnoCode, errorMessage } from "../../../utils/errors.js";
import { truncateToLength } from "../../../utils/stringUtils.js";

//@ chunk-vzw8h259.js:10847-11407 placement
async function runEvalMockServer(e, t) {
  if (!e) throw Error("missing spec path");
  let r = await readMockSpecFile(e);
  if (t !== void 0 && createHash("sha256").update(r).digest("hex") !== t)
    throw Error(
      "spec file does not match the hash the harness launched this stand-in with \u2014 refusing to serve it",
    );
  let i = Se(r),
    n = respondToMockCall(i),
    s = new BufferedStdioServerTransport();
  if (!(await appendLineToFile(i.callLogPath, jsonStringify({ ready: i.nonce, server: i.server }))))
    throw Error(
      "could not write the identity line to the run call log \u2014 refusing to serve unidentified",
    );
  (await n.connect(s),
    process.stdin.on("end", () => void n.close()),
    process.stdin.on("error", () => void n.close()));
}
//@ chunk-vzw8h259.js:11407-12648 placement
function respondToMockCall(e) {
  let t = 0,
    abortController = new AbortController(),
    i = { spec: e, signal: abortController.signal },
    n = new Server({ name: `eval-mock/${e.server}`, version: "1" }, { capabilities: { tools: {} } });
  ((n.onclose = () => abortController.abort()),
    n.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: e.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: { type: "object", ...tool.inputSchema },
      })),
    })));
  let resolved = Promise.resolve();
  n.setRequestHandler(CallToolRequestSchema, (c) => {
    let m = resolved.then(() => a(c.params));
    return ((resolved = m.catch(() => {})), m);
  });
  async function a(c) {
    let m = c.name,
      y = c.arguments ?? {},
      now = Date.now(),
      l = Object.hasOwn(e.responders, m) ? e.responders[m] : void 0,
      f =
        l === void 0
          ? { verdict: "tool_error", text: `no mock for ${e.server}/${m}` }
          : await answerMockResponder(l, y, i, m),
      b = {
        nonce: e.nonce,
        seq: t++,
        server: e.server,
        tool: m,
        responder: l?.kind ?? "fixed",
        input: stringifyForTelemetry(y),
        verdict: f.verdict,
        output: extractToolInputForTelemetry(f.text),
        ms: Date.now() - now,
        ...(f.replay && { replay: f.replay }),
      };
    if (!(await appendLineToFile(e.callLogPath, jsonStringify(b))) && f.verdict === "abort")
      process.stderr.write(`eval mock stand-in: could not write the abort record to the call log
`);
    switch (f.verdict) {
      case "ok":
        return { content: [{ type: "text", text: unforgeable(f.text) }] };
      case "tool_error":
        return { content: [{ type: "text", text: unforgeable(f.text) }], isError: !0 };
      case "abort":
        return {
          content: [{ type: "text", text: `${Brn} ${e.nonce}: ${e.server}/${m} \u2014 ${f.text}` }],
          isError: !0,
        };
    }
  }
  return n;
}
/**
 * 回应一次 mock 工具调用：先按 expect 检查输入；agent 型交给宿主代理；fixed 型把输入代入固定正文，按 isError 返回 ok 或 tool_error。
 */
//@ chunk-vzw8h259.js:12648-13183 placement
async function answerMockResponder(responder, input, relay, toolName = "") {
  if (responder.expect !== null) {
    let n = checkExpectGuards(input, responder.expect);
    if (n !== null) return { verdict: "abort", text: `input violates expect: ${n}` };
  }
  switch (responder.kind) {
    case "agent": {
      if (!relay || relay.spec.agent === null)
        return { verdict: "tool_error", text: "agent mock responder called without a harness relay" };
      return relayAgentMockCall(
        relay.spec.agent,
        { registeredName: relay.spec.registeredName, tool: toolName, input: input },
        relay.signal,
      );
    }
    case "fixed": {
      let n = await substituteAgentInput(responder.body, input, responder.baseDir, readFixture);
      if (!n.ok) return { verdict: "tool_error", text: n.reason };
      return { verdict: responder.isError ? "tool_error" : "ok", text: n.text };
    }
  }
}
//@ chunk-vzw8h259.js:13183-13638 placement
async function readFixture(e) {
  try {
    await checkRepoAuthoredPath(path.dirname(e), path.basename(e), "mock fixture");
    let t = await open(e, constants.O_RDONLY | (getPlatform() === "windows" ? 0 : constants.O_NONBLOCK));
    try {
      let stats = await t.stat();
      if (!stats.isFile()) return { problem: "is not a regular file" };
      if (stats.size > MAX_FIXTURE_BYTES)
        return { problem: `is ${stats.size} bytes, over the ${MAX_FIXTURE_BYTES}-byte fixture limit` };
      return (await readExactly(t, stats.size)).toString("utf8");
    } finally {
      await t.close();
    }
  } catch (error) {
    return {
      problem: isENOENT(error)
        ? "no such fixture"
        : `could not be read (${getErrnoCode(error) ?? errorMessage(error)})`,
    };
  }
}
//@ chunk-vzw8h259.js:13638-13660 placement
var MAX_AGENT_INPUT_SUBSTITUTION_CHARS = 16384,
  j = 16384;
//@ chunk-vzw8h259.js:13660-13724 placement = extractToolInputForTelemetry (1)
function extractToolInputForTelemetry(input) {
  return input.length > j ? `${truncateToLength(input, j)}\u2026[truncated]` : input;
}
//@ chunk-vzw8h259.js:13724-13779 placement
function stringifyForTelemetry(e) {
  let t = jsonStringify(e) ?? "";
  return t.length > j ? extractToolInputForTelemetry(t) : e;
}
/**
 * 以追加方式打开文件（非 Windows 带 O_NONBLOCK）写入一行；目标不是普通文件或写入失败返回 false。
 */
//@ chunk-vzw8h259.js:13779-14105 placement
async function appendLineToFile(path, line) {
  try {
    let r =
        constants.O_WRONLY |
        constants.O_APPEND |
        constants.O_CREAT |
        (getPlatform() === "windows" ? 0 : constants.O_NONBLOCK),
      i = await open(path, r, 384);
    try {
      if (!(await i.stat()).isFile()) return !1;
      let buffer = Buffer.from(
          `${line}
`,
          "utf8",
        ),
        s = 0;
      while (s < buffer.length) {
        let { bytesWritten: bytesWritten } = await i.write(buffer, s);
        if (bytesWritten <= 0) return !1;
        s += bytesWritten;
      }
      return !0;
    } finally {
      await i.close();
    }
  } catch {
    return !1;
  }
}
//@ chunk-vzw8h259.js:14105-14268 placement
async function readExactly(handle, size) {
  let alloc = Buffer.alloc(size),
    i = 0;
  while (i < size) {
    let { bytesRead: bytesRead } = await handle.read({ buffer: alloc, offset: i, position: i });
    if (bytesRead <= 0) break;
    i += bytesRead;
  }
  return alloc.subarray(0, i);
}
//@ chunk-vzw8h259.js:14268-14340 placement
function unforgeable(e) {
  return UNFORGEABLE_LINE_PATTERN.test(e.trimStart()) ? `${UNFORGEABLE_PREFIX}${e.trimStart()}` : e;
}
//@ chunk-vzw8h259.js:14340-14468 placement
var UNFORGEABLE_PREFIX = "| ",
  UNFORGEABLE_LINE_PATTERN = new RegExp(
    `^(?:${Brn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|MCP server "|MCP error -32000: Connection closed)`,
  );
//@ chunk-vzw8h259.js:14468-14508 placement
function Se(e) {
  return MOCK_SPEC_SCHEMA().parse(jsonParse(e));
}
//@ chunk-vzw8h259.js:14508-14523 placement
var Ee = 4194304;
/**
 * 读取 mock 规格文件：先确认路径在仓库内且由仓库作者提供，必须是普通文件且不超过大小上限。
 */
//@ chunk-vzw8h259.js:14523-14943 placement
async function readMockSpecFile(path_2) {
  await checkRepoAuthoredPath(path.dirname(path_2), path.basename(path_2), "mock spec");
  let t = await open(path_2, constants.O_RDONLY | (getPlatform() === "windows" ? 0 : constants.O_NONBLOCK));
  try {
    let stats = await t.stat();
    if (!stats.isFile()) throw Error("spec path is not a regular file \u2014 refusing to read it");
    if (stats.size > Ee)
      throw Error("spec file is over the size limit the harness writes \u2014 refusing to read it");
    return (await readExactly(t, stats.size)).toString("utf8");
  } finally {
    await t.close();
  }
}

export { unforgeable, readFixture, MAX_AGENT_INPUT_SUBSTITUTION_CHARS };
