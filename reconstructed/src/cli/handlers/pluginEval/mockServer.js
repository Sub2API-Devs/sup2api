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
import path from "path";
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
  EVAL_ABORTED_BY_MOCK,
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
async function runEvalMockServer(path, t) {
  if (!path) throw Error("missing spec path");
  let mockSpecFile = await readMockSpecFile(path);
  if (t !== undefined && createHash("sha256").update(mockSpecFile).digest("hex") !== t)
    throw Error(
      "spec file does not match the hash the harness launched this stand-in with \u2014 refusing to serve it",
    );
  let mockSpec = parseMockSpec(mockSpecFile);
  let n = respondToMockCall(mockSpec);
  let s = new BufferedStdioServerTransport();
  if (
    !(await appendLineToFile(
      mockSpec.callLogPath,
      jsonStringify({
        ready: mockSpec.nonce,
        server: mockSpec.server,
      }),
    ))
  )
    throw Error(
      "could not write the identity line to the run call log \u2014 refusing to serve unidentified",
    );
  await n.connect(s);
  process.stdin.on("end", () => void n.close());
  process.stdin.on("error", () => void n.close());
}
//@ chunk-vzw8h259.js:11407-12648 placement
function respondToMockCall(mockSpec) {
  let t = 0;
  let abortController = new AbortController();
  let relay = {
    spec: mockSpec,
    signal: abortController.signal,
  };
  let n = new Server(
    {
      name: `eval-mock/${mockSpec.server}`,
      version: "1",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );
  n.onclose = () => abortController.abort();
  n.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: mockSpec.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: "object",
        ...tool.inputSchema,
      },
    })),
  }));
  let resolved = Promise.resolve();
  n.setRequestHandler(CallToolRequestSchema, (c) => {
    let m = resolved.then(() => a(c.params));
    resolved = m.catch(() => {});
    return m;
  });
  async function a(params) {
    let toolName = params.name;
    let y = params.arguments ?? {};
    let now = Date.now();
    let responder = Object.hasOwn(mockSpec.responders, toolName) ? mockSpec.responders[toolName] : undefined;
    let f =
      responder === undefined
        ? {
            verdict: "tool_error",
            text: `no mock for ${mockSpec.server}/${toolName}`,
          }
        : await answerMockResponder(responder, y, relay, toolName);
    let b = {
      nonce: mockSpec.nonce,
      seq: t++,
      server: mockSpec.server,
      tool: toolName,
      responder: responder?.kind ?? "fixed",
      input: stringifyForTelemetry(y),
      verdict: f.verdict,
      output: extractToolInputForTelemetry(f.text),
      ms: Date.now() - now,
      ...(f.replay && {
        replay: f.replay,
      }),
    };
    if (!(await appendLineToFile(mockSpec.callLogPath, jsonStringify(b))) && f.verdict === "abort")
      process.stderr.write(`eval mock stand-in: could not write the abort record to the call log
`);
    switch (f.verdict) {
      case "ok":
        return {
          content: [
            {
              type: "text",
              text: unforgeable(f.text),
            },
          ],
        };
      case "tool_error":
        return {
          content: [
            {
              type: "text",
              text: unforgeable(f.text),
            },
          ],
          isError: true,
        };
      case "abort":
        return {
          content: [
            {
              type: "text",
              text: `${EVAL_ABORTED_BY_MOCK} ${mockSpec.nonce}: ${mockSpec.server}/${toolName} \u2014 ${f.text}`,
            },
          ],
          isError: true,
        };
    }
  }
  return n;
}
//@ chunk-vzw8h259.js:12648-13183 placement
/**
 * 回应一次 mock 工具调用：先按 expect 检查输入；agent 型交给宿主代理；fixed 型把输入代入固定正文，按 isError 返回 ok 或 tool_error。
 */
async function answerMockResponder(responder, input, relay, toolName = "") {
  if (responder.expect !== null) {
    let n = checkExpectGuards(input, responder.expect);
    if (n !== null)
      return {
        verdict: "abort",
        text: `input violates expect: ${n}`,
      };
  }
  switch (responder.kind) {
    case "agent": {
      if (!relay || relay.spec.agent === null)
        return {
          verdict: "tool_error",
          text: "agent mock responder called without a harness relay",
        };
      return relayAgentMockCall(
        relay.spec.agent,
        {
          registeredName: relay.spec.registeredName,
          tool: toolName,
          input,
        },
        relay.signal,
      );
    }
    case "fixed": {
      let n = await substituteAgentInput(responder.body, input, responder.baseDir, readFixture);
      if (!n.ok)
        return {
          verdict: "tool_error",
          text: n.reason,
        };
      return {
        verdict: responder.isError ? "tool_error" : "ok",
        text: n.text,
      };
    }
  }
}
//@ chunk-vzw8h259.js:13183-13638 placement
async function readFixture(e) {
  try {
    await checkRepoAuthoredPath(path.dirname(e), path.basename(e), "mock fixture");
    let handle = await open(e, constants.O_RDONLY | (getPlatform() === "windows" ? 0 : constants.O_NONBLOCK));
    try {
      let stats = await handle.stat();
      if (!stats.isFile())
        return {
          problem: "is not a regular file",
        };
      if (stats.size > MAX_FIXTURE_BYTES)
        return {
          problem: `is ${stats.size} bytes, over the ${MAX_FIXTURE_BYTES}-byte fixture limit`,
        };
      return (await readExactly(handle, stats.size)).toString("utf8");
    } finally {
      await handle.close();
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
var MAX_AGENT_INPUT_SUBSTITUTION_CHARS = 16384;
var MAX_AGENT_INPUT_CHARS = 16384;
//@ chunk-vzw8h259.js:13660-13724 placement = extractToolInputForTelemetry (1)
function extractToolInputForTelemetry(input) {
  return input.length > MAX_AGENT_INPUT_CHARS
    ? `${truncateToLength(input, MAX_AGENT_INPUT_CHARS)}\u2026[truncated]`
    : input;
}
//@ chunk-vzw8h259.js:13724-13779 placement
function stringifyForTelemetry(e) {
  let t = jsonStringify(e) ?? "";
  return t.length > MAX_AGENT_INPUT_CHARS ? extractToolInputForTelemetry(t) : e;
}
//@ chunk-vzw8h259.js:13779-14105 placement
/**
 * 以追加方式打开文件（非 Windows 带 O_NONBLOCK）写入一行；目标不是普通文件或写入失败返回 false。
 */
async function appendLineToFile(path, line) {
  try {
    let r =
      constants.O_WRONLY |
      constants.O_APPEND |
      constants.O_CREAT |
      (getPlatform() === "windows" ? 0 : constants.O_NONBLOCK);
    let i = await open(path, r, 384);
    try {
      if (!(await i.stat()).isFile()) return false;
      let buffer = Buffer.from(
        `${line}
`,
        "utf8",
      );
      let s = 0;
      while (s < buffer.length) {
        let { bytesWritten } = await i.write(buffer, s);
        if (bytesWritten <= 0) return false;
        s += bytesWritten;
      }
      return true;
    } finally {
      await i.close();
    }
  } catch {
    return false;
  }
}
//@ chunk-vzw8h259.js:14105-14268 placement
async function readExactly(handle, size) {
  let r = Buffer.alloc(size);
  let i = 0;
  while (i < size) {
    let { bytesRead } = await handle.read({
      buffer: r,
      offset: i,
      position: i,
    });
    if (bytesRead <= 0) break;
    i += bytesRead;
  }
  return r.subarray(0, i);
}
//@ chunk-vzw8h259.js:14268-14340 placement
function unforgeable(text) {
  return UNFORGEABLE_LINE_PATTERN.test(text.trimStart()) ? `${UNFORGEABLE_PREFIX}${text.trimStart()}` : text;
}
//@ chunk-vzw8h259.js:14340-14468 placement
var UNFORGEABLE_PREFIX = "| ";
var UNFORGEABLE_LINE_PATTERN = new RegExp(
  `^(?:${EVAL_ABORTED_BY_MOCK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|MCP server "|MCP error -32000: Connection closed)`,
);
//@ chunk-vzw8h259.js:14468-14508 placement
function parseMockSpec(mockSpecFile) {
  return MOCK_SPEC_SCHEMA().parse(jsonParse(mockSpecFile));
}
//@ chunk-vzw8h259.js:14508-14523 placement
var MAX_FIXTURE_FILE_BYTES = 4194304;
//@ chunk-vzw8h259.js:14523-14943 placement
/**
 * 读取 mock 规格文件：先确认路径在仓库内且由仓库作者提供，必须是普通文件且不超过大小上限。
 */
async function readMockSpecFile(path_2) {
  await checkRepoAuthoredPath(path.dirname(path_2), path.basename(path_2), "mock spec");
  let handle = await open(
    path_2,
    constants.O_RDONLY | (getPlatform() === "windows" ? 0 : constants.O_NONBLOCK),
  );
  try {
    let stats = await handle.stat();
    if (!stats.isFile()) throw Error("spec path is not a regular file \u2014 refusing to read it");
    if (stats.size > MAX_FIXTURE_FILE_BYTES)
      throw Error("spec file is over the size limit the harness writes \u2014 refusing to read it");
    return (await readExactly(handle, stats.size)).toString("utf8");
  } finally {
    await handle.close();
  }
}
export { unforgeable, readFixture, MAX_AGENT_INPUT_SUBSTITUTION_CHARS };
