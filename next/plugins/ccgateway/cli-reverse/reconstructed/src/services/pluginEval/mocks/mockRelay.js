/**
 * services/pluginEval/mocks/mockRelay.ts
 *
 * 2.1.316 新增：plugin eval 模拟中继：本地管道服务器，把子会话的 MCP 调用转给替身（固定回答、回放、代理应答者）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (28)
 * attribution: placement 28
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { mkdir, writeFile, mkdtemp, rm as rm_2 } from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { randomBytes, createHash } from "crypto";
import { createServer } from "net";
import { emptyMockLayers, loadMockServers } from "./mockResponders.js";
import { listAncestorChain, findMockBaseDir } from "../graders.js";
import { collectPluginMcpServers } from "../caseDiscovery.js";
import {
  planMockStandIns,
  listUnlistedTools,
  filterForArm,
  usesAgentResponder,
  buildRunMockFiles,
  listMockedToolNames,
} from "./pluginMcpEnumeration.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../../utils/errors.js";
import { plural, truncateToLength } from "../../../utils/stringUtils.js";
import { doesEnterpriseMcpConfigExist, isMcpServerBlockedAtConnectTime } from "../../mcp/config.js";
import { logForDebugging } from "../../../utils/debug.js";
import { getSelfExecArgv } from "../../artifacts/artifactsMcpServer.js";
import { getSettingsForSource } from "../../../utils/settings/settings.js";
import { MCP_TIMING_ENV_VARS } from "../childEnvironment.js";
import { buildMcpToolName } from "../../mcp/mcpStringUtils.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { objectSchema, stringSchema, record, unknown } from "../../../../vendor/zod/v4/classic/schemas.js";
import { getPlatform } from "../../../utils/platform.js";
import { jsonStringify, jsonParse } from "../../../utils/slowOperations.js";
import {
  MOCK_RESPONDER_FAILED_TEXT,
  checkExpectGuards,
  substituteAgentInput,
} from "../../../cli/handlers/pluginEval/mockGuards.js";
import { timingSafeEqualStrings } from "../../../utils/sessionRecords.js";
import {
  unforgeable,
  readFixture,
  MAX_AGENT_INPUT_SUBSTITUTION_CHARS,
} from "../../../cli/handlers/pluginEval/mockServer.js";
import {
  hashMockCallArgs,
  readMockRecording,
  MAX_MOCK_RECORDING_BYTES,
  mockRecordingFileName,
} from "./mockRecordings.js";
import { runMockResponderQuery, MOCK_OUTPUT_MAX_CHARS } from "./agentMockResponder.js";
import { truncateMiddle as truncateMiddle_2 } from "../../../memdir/memoryTool.js";
import { canonicalJsonStringify } from "../canonicalJson.js";

//@ chunk-af1hzzme.js:243746-243797 placement
/**
 * 空的模拟状态（已声明服务器 + 层级）。
 */
function emptyMockState() {
  return {
    declared: new Map(),
    layers: emptyMockLayers(),
  };
}
//@ chunk-af1hzzme.js:243797-243937 placement
var UNENUMERABLE_REASONS = {
  archive: "it is an archive the child extracts",
  manifest: "its manifest does not load",
  mcpb: "it declares them through an MCPB bundle",
};
//@ chunk-af1hzzme.js:243937-244926 placement
async function enumerateMockedServersForRun(
  caseContext,
  pluginDir,
  suiteSegments,
  cache,
  { allowRealServers },
) {
  let mockServers = await loadMockServers(
    listAncestorChain(caseContext.caseDir, findMockBaseDir(caseContext.caseDir, pluginDir, suiteSegments)),
    cache.layers,
  );
  let cacheKey = `${allowRealServers ? "tolerant" : "strict"}
${caseContext.pluginDirs.join(`
`)}`;
  let declaredEntry = cache.declared.get(cacheKey);
  if (!declaredEntry) {
    let unenumerableNotes = [];
    declaredEntry = {
      servers: collectPluginMcpServers(
        caseContext.pluginDirs,
        allowRealServers ? unenumerableNotes : undefined,
      ),
      unenumerable: unenumerableNotes,
    };
    cache.declared.set(cacheKey, declaredEntry);
  }
  let servers = await declaredEntry.servers;
  let mapped = declaredEntry.unenumerable.map(
    (unenumerableServer) =>
      `mocks: plugin ${unenumerableServer.dirName}'s MCP servers could not be enumerated here (${UNENUMERABLE_REASONS[unenumerableServer.reason]}); whatever it declares starts for REAL (--allow-real-servers), as you, outside the sandbox that confines shell tools`,
  );
  if (mockServers.servers.size === 0 && allowRealServers) {
    let realServerNames = [...servers.keys()];
    let allNotes = [...mockServers.notes, ...mapped];
    if (realServerNames.length > 0)
      allNotes.push(
        `mocks: no mocks/ \u2014 the plugin's REAL server ${realServerNames.length === 1 ? "process" : "processes"} ${realServerNames.map((serverName) => `"${serverName}"`).join(", ")} ${realServerNames.length === 1 ? "starts" : "start"} (--allow-real-servers), as you, outside the sandbox that confines shell tools`,
      );
    return {
      servers: [],
      notes: allNotes,
    };
  }
  let plan = planMockStandIns(mockServers, servers, {
    allowRealServers,
    unenumerable: declaredEntry.unenumerable,
  });
  return {
    servers: plan.servers,
    notes: [...mapped, ...plan.notes],
  };
}
//@ chunk-af1hzzme.js:244926-245225 placement
function describeMockMode(servers) {
  return servers
    .map((server) => {
      let pinnedCount = countRecordings(server.loaded);
      if (server.withheld) return `${server.loaded.dirName}[not started: no mock]`;
      return `${server.loaded.dirName}${server.kind === "standalone" ? "[standalone]" : ""}(${[...server.loaded.tools].map(([tool, recording]) => `${tool}=${recording.kind}`).join(", ")}${pinnedCount > 0 ? `; replay: ${pinnedCount} pinned` : ""})`;
    })
    .join(", ");
}
//@ chunk-af1hzzme.js:245225-245234 placement
/**
 * 每回合调用预算系数（4）。
 */
var CALLS_PER_TURN = 4;
//@ chunk-af1hzzme.js:245234-245261 placement
/**
 * 按回合数计算调用预算。
 */
function callBudgetForTurns(maxTurns) {
  return CALLS_PER_TURN * maxTurns;
}
//@ chunk-af1hzzme.js:245261-245523 placement
function describeMissingToolsJsonEntry(mocks) {
  return listUnlistedTools(mocks).map(
    (unlisted) =>
      `${unlisted.server}: no _tools.json entry for ${unlisted.tools.join(", ")} \u2014 served with a permissive schema and no description; save the server's tools/list response as mocks/${unlisted.server}/_tools.json so the model sees the real tool`,
  );
}
//@ chunk-af1hzzme.js:245523-246053 placement
class MockManagedEnvError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  names;
  constructor(names) {
    super(
      `mocks: managed settings set ${names.join(", ")} for every session \u2014 the eval child would apply ${plural(names.length, "it", "them")} over the defaults agent mocks are answered under, and each agent-mock run would fail as not served by its mocks. Remove ${plural(names.length, "it", "them")} from managed settings for eval hosts, use fixed (canned) mocks for these tools, or run with --mocks off.`,
      "mocks: managed env pins an MCP knob agent mocks depend on",
    );
    this.names = names;
    this.name = "MockManagedEnvError";
  }
}
//@ chunk-af1hzzme.js:246053-246514 placement
class MockPolicyBlockedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  registeredNames;
  constructor(names) {
    let count = names.length;
    super(
      `mocks: the managed MCP server policy (allowedMcpServers / deniedMcpServers) blocks the mock ${plural(count, "stand-in")} ${names.map((name) => `"${name}"`).join(", ")} \u2014 the eval child would silently drop ${plural(count, "it", "them")}. Allowlist the stand-in command for eval runs, or run with --mocks off.`,
      "mocks: stand-in blocked by managed MCP policy",
    );
    this.registeredNames = names;
    this.name = "MockPolicyBlockedError";
  }
}
//@ chunk-af1hzzme.js:246514-247170 placement
class MockWithholdPolicyError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  registeredNames;
  constructor(names) {
    let count = names.length;
    super(
      `mocks: the managed MCP server policy (allowedMcpServers / deniedMcpServers) drops the empty ${plural(count, "stand-in")} record mode registers to keep ${names.map((name) => `"${name}"`).join(", ")} from starting, so ${plural(count, "it", "they")} cannot be withheld here. Allowlist the stand-in command for eval runs, or pass --allow-real-servers to let the plugin's real ${plural(count, "server")} run instead (as you, outside the sandbox; the same policy then applies to ${plural(count, "it", "them")} in the child).`,
      "mocks: withheld stand-in blocked by managed MCP policy",
    );
    this.registeredNames = names;
    this.name = "MockWithholdPolicyError";
  }
}
//@ chunk-af1hzzme.js:247170-247757 placement
class MockEnterpriseExclusiveError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  mockDirs;
  constructor(mockDirs) {
    super(
      `mocks: this machine's managed-mcp.json gives the organization exclusive control of MCP servers, so the eval child cannot register the mock ${plural(mockDirs.length, "stand-in")} for ${mockDirs.map((dirName) => `mocks/${dirName}/`).join(", ")} (nor the plugin's own servers) \u2014 mocks cannot be served here; run the suite on a machine without managed-mcp.json, or with --mocks off (the plugin's servers still will not load under exclusive control)`,
      "mocks: managed-mcp.json exclusive control blocks stand-ins",
    );
    this.mockDirs = mockDirs;
    this.name = "MockEnterpriseExclusiveError";
  }
}
//@ chunk-af1hzzme.js:247757-249630 placement
/**
 * 写入本次运行的替身配置；托管 managed-mcp.json 独占时提示无法注册。
 */
async function writeRunMocks(servers, arm, evalTempDir, options) {
  let armServers = filterForArm(servers, arm);
  let enterpriseExclusive = alwaysTrue() && doesEnterpriseMcpConfigExist();
  let registered = enterpriseExclusive ? armServers.filter((server) => !server.withheld) : armServers;
  if (enterpriseExclusive && registered.length > 0)
    throw new MockEnterpriseExclusiveError(registered.map((server) => server.loaded.dirName));
  if (enterpriseExclusive && armServers.length > 0)
    logForDebugging(
      `eval mocks: managed-mcp.json has exclusive MCP control; ${armServers.length} withheld stand-in(s) not registered (plugin servers do not load in the child)`,
    );
  if (registered.length === 0) return null;
  let agentRun = null;
  if (usesAgentResponder(registered)) {
    if (options.service === null) throw Error("writeRunMocks: agent responders need the agent service");
    agentRun = options.service.registerRun({
      model: options.model,
      callBudget: callBudgetForTurns(options.maxTurns),
    });
  }
  let mockFiles;
  try {
    mockFiles = buildRunMockFiles({
      servers: registered,
      outDir: evalTempDir.outDir,
      selfCommand: getSelfExecArgv(),
      env: {},
      agent: agentRun?.relay ?? null,
    });
    let isBlockedAtConnect = (server) =>
      isMcpServerBlockedAtConnectTime(server.registeredName, {
        ...mockFiles.stdioConfigs[server.registeredName],
        scope: "dynamic",
      });
    if (alwaysTrue()) {
      let names = registered
        .filter((server) => server.withheld && isBlockedAtConnect(server))
        .map((serverName) => serverName.registeredName);
      if (names.length > 0) throw new MockWithholdPolicyError(names);
      let names_2 = registered
        .filter((server) => !server.withheld && isBlockedAtConnect(server))
        .map((serverName) => serverName.registeredName);
      if (names_2.length > 0) throw new MockPolicyBlockedError(names_2);
    }
    agentRun?.attachSpecs(mockFiles.specs.map((spec) => spec.spec));
    if (agentRun !== null && alwaysTrue()) {
      let env = getSettingsForSource("policySettings")?.env ?? {};
      let names = [...MCP_TIMING_ENV_VARS].filter((envName) =>
        Object.keys(env).some((key) => key.toUpperCase() === envName),
      );
      if (names.length > 0) throw new MockManagedEnvError(names);
    }
    await mkdir(path.join(evalTempDir.outDir, "mocks"), {
      recursive: true,
    });
    await Promise.all([
      writeFile(mockFiles.configPath, mockFiles.configJson, {
        mode: 384,
      }),
      ...mockFiles.specs.map((spec) =>
        writeFile(spec.path, spec.json, {
          mode: 384,
        }),
      ),
    ]);
  } catch (error) {
    agentRun?.dispose();
    throw error;
  }
  return {
    configPath: mockFiles.configPath,
    callLogPath: mockFiles.callLogPath,
    nonce: mockFiles.nonce,
    mockedTools: listMockedToolNames(registered),
    agentRun,
    agentCallBudget: usesAgentResponder(registered) ? callBudgetForTurns(options.maxTurns) : 0,
    servers: registered.map((server) => ({
      dirName: server.loaded.dirName,
      registeredName: server.registeredName,
      segment: server.segment,
      kind: server.kind,
      withheld: server.withheld === true,
      tools: [...server.loaded.tools.keys()],
      toolFullNames: Object.fromEntries(
        [...server.loaded.tools.keys()].map((key) => [key, buildMcpToolName(server.registeredName, key)]),
      ),
      responderKinds: Object.fromEntries(
        [...server.loaded.tools].map(([toolName, responderInfo]) => [toolName, responderInfo.kind]),
      ),
      replayPinned: countRecordings(server.loaded),
      expects: Object.fromEntries(
        [...server.loaded.tools].map(([toolName, responderInfo]) => [toolName, responderInfo.expect]),
      ),
    })),
  };
}
//@ chunk-af1hzzme.js:249630-249653 placement
/**
 * 恒真（占位）。
 */
function alwaysTrue() {
  return true;
}
//@ chunk-af1hzzme.js:249653-249744 placement
/**
 * 统计运行中的录制总条数。
 */
function countRecordings(loaded) {
  return Object.values(loaded.recordings).reduce((acc, recording) => acc + Object.keys(recording).length, 0);
}
//@ chunk-af1hzzme.js:249933-250044 placement
var mockRelayRequestSchema = DoctorLazy(() =>
  objectSchema({
    token: stringSchema(),
    registeredName: stringSchema(),
    tool: stringSchema(),
    input: record(stringSchema(), unknown()),
  }),
);
var MAX_MOCK_MESSAGE_BYTES = 1048576;
var MAX_MOCK_SERVERS = 40;
var MOCK_RELAY_TIMEOUT_MS = 30000;
var MAX_MOCK_LINE_BYTES = 16384;
//@ chunk-af1hzzme.js:250044-251696 placement
/**
 * 创建 cc-eval-agent- 命名管道/套接字。
 */
async function createMockRelayPipe({ credentials }) {
  let runsByToken = new Map();
  let tempDir = getPlatform() === "windows" ? null : await mkdtemp(path.join(tmpdir(), "cc-eval-agent-"));
  let socketPath =
    tempDir === null
      ? `\\\\?\\pipe\\cc-eval-agent-${randomBytes(8).toString("hex")}`
      : path.join(tempDir, "s");
  let sockets = new Set();
  let server = createServer((socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    readMockRelayRequest(socket, runsByToken);
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(socketPath, () => {
        server.off("error", reject);
        resolve();
      });
    });
  } catch (error) {
    await closeStream(server).catch(() => {});
    if (tempDir !== null)
      await rm_2(tempDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
    throw error;
  }
  server.on("error", (error) =>
    logForDebugging(`plugin eval: agent service error: ${errorMessage(error)}`, {
      level: "warn",
    }),
  );
  server.unref();
  return {
    registerRun({ model, callBudget }) {
      let str = randomBytes(16).toString("hex");
      let run = {
        specs: new Map(),
        model,
        credentials,
        callBudget,
        abort: new AbortController(),
        history: new Map(),
        agentCalls: 0,
        aborted: null,
        costUsd: 0,
        answers: [],
        received: new Map(),
        inFlight: 0,
        recordings: [],
        replay: {
          hits: 0,
          misses: 0,
        },
        unreplayableServers: new Set(),
        queue: Promise.resolve(),
      };
      runsByToken.set(str, run);
      return {
        relay: {
          socketPath,
          token: str,
        },
        attachSpecs(specs) {
          for (let spec of specs) run.specs.set(spec.registeredName, spec);
        },
        state: {
          get aborted() {
            return run.aborted;
          },
          get costUsd() {
            return run.costUsd;
          },
          get agentCalls() {
            return run.agentCalls;
          },
          get answered() {
            return run.answers.length;
          },
          get answers() {
            return run.answers;
          },
          relaysReceived(server, tool) {
            return run.received.get(`${server}/${tool}`) ?? 0;
          },
          get recordings() {
            return run.recordings;
          },
          get replay() {
            return run.replay;
          },
          get inFlight() {
            return run.inFlight;
          },
        },
        async settled() {
          await run.queue;
        },
        dispose() {
          run.abort.abort();
          runsByToken.delete(str);
        },
      };
    },
    async close() {
      for (let run of runsByToken.values()) run.abort.abort();
      runsByToken.clear();
      for (let socket of sockets) socket.destroy();
      sockets.clear();
      try {
        await closeStream(server);
        if (tempDir !== null)
          await rm_2(tempDir, {
            recursive: true,
            force: true,
          });
      } catch (error) {
        logForDebugging(`eval mocks: agent service teardown: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    },
  };
}
//@ chunk-af1hzzme.js:251696-251753 placement
/**
 * 关闭流并等待完成。
 */
function closeStream(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}
//@ chunk-af1hzzme.js:251753-252380 placement
function readMockRelayRequest(socket, runsByToken) {
  let buffer = Buffer.alloc(0);
  let replied = false;
  let reply = (response) => {
    if (replied) return;
    replied = true;
    socket.end(`${jsonStringify(response)}
`);
  };
  socket.on("error", () => socket.destroy());
  socket.setTimeout(MOCK_RELAY_TIMEOUT_MS, () => socket.destroy());
  let handled = false;
  socket.on("data", (chunk) => {
    if (replied || handled) return;
    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length > MAX_MOCK_MESSAGE_BYTES) {
      handled = true;
      reply({
        verdict: "abort",
        text: "mock relay request too large (a hook that rewrites this tool's input may have inflated it)",
      });
      return;
    }
    let index = buffer.indexOf(10);
    if (index === -1) return;
    handled = true;
    let raw = buffer.subarray(0, index).toString("utf8");
    socket.setTimeout(0);
    handleMockRelayRequest(raw, runsByToken).then(reply, (error) => {
      logForDebugging(`plugin eval: mock relay failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      reply({
        verdict: "abort",
        text: `${MOCK_RESPONDER_FAILED_TEXT} (relay_internal) \u2014 see the eval debug log`,
      });
    });
  });
}
//@ chunk-af1hzzme.js:252380-253097 placement
async function handleMockRelayRequest(raw, runsByToken) {
  let request;
  try {
    request = mockRelayRequestSchema().parse(jsonParse(raw));
  } catch {
    return {
      verdict: "tool_error",
      text: "malformed mock relay request",
    };
  }
  let tokenEntry = findTokenEntry(runsByToken, request.token);
  if (tokenEntry === undefined)
    return {
      verdict: "tool_error",
      text: "mock relay: no such run",
    };
  let spec = tokenEntry.specs.get(request.registeredName);
  let agentCallKey =
    spec !== undefined &&
    Object.hasOwn(spec.responders, request.tool) &&
    spec.responders[request.tool]?.kind === "agent"
      ? `${spec.server}/${request.tool}`
      : null;
  if (agentCallKey !== null) {
    tokenEntry.received.set(agentCallKey, (tokenEntry.received.get(agentCallKey) ?? 0) + 1);
    tokenEntry.inFlight++;
  }
  let answerPromise = tokenEntry.queue
    .then(() => answerMockCall(tokenEntry, request))
    .catch((error) => {
      if (tokenEntry.aborted === null)
        tokenEntry.aborted = {
          server: spec?.server ?? "(no mocked server)",
          tool: truncateToLength(request.tool, MAX_TOOL_NAME_CHARS),
          reason: `${MOCK_RESPONDER_FAILED_TEXT} (relay_internal) \u2014 see the eval debug log`,
        };
      throw error;
    })
    .finally(() => {
      if (agentCallKey !== null) tokenEntry.inFlight--;
    });
  tokenEntry.queue = answerPromise.catch(() => {});
  return answerPromise;
}
//@ chunk-af1hzzme.js:253097-253158 placement
/**
 * 按 token 查找条目（恒定时间比较）。
 */
function findTokenEntry(entries, token) {
  for (let [candidateToken, value] of entries)
    if (timingSafeEqualStrings(token, candidateToken)) return value;
  return;
}
//@ chunk-af1hzzme.js:253158-254166 placement
async function answerMockCall(run, call) {
  if (run.aborted !== null)
    return {
      verdict: "abort",
      text: run.aborted.reason,
    };
  if (run.abort.signal.aborted)
    return {
      verdict: "abort",
      text: "run ended",
    };
  let spec = run.specs.get(call.registeredName);
  run.agentCalls++;
  if (run.agentCalls > run.callBudget) {
    let reason = describeMockBudgetExceeded(run);
    run.aborted = {
      server: spec?.server ?? "(no mocked server)",
      tool: truncateToLength(call.tool, MAX_TOOL_NAME_CHARS),
      reason,
    };
    return {
      verdict: "abort",
      text: reason,
    };
  }
  let responder =
    spec !== undefined && Object.hasOwn(spec.responders, call.tool) ? spec.responders[call.tool] : undefined;
  if (spec === undefined || responder === undefined || responder.kind !== "agent")
    return {
      verdict: "tool_error",
      text: `no agent mock for ${call.registeredName}/${call.tool}`,
    };
  let answer = await answerMockCallWithReplay(run, spec, responder, call);
  run.answers.push({
    server: spec.server,
    tool: call.tool,
    inputKey: canonicalHash(call.input),
    verdict: answer.verdict,
    outputKey: outputKey(unforgeable(answer.text), answer.verdict),
  });
  if (answer.verdict === "abort" && run.aborted === null)
    run.aborted = {
      server: spec.server,
      tool: call.tool,
      reason: answer.text,
    };
  let entries = run.history.get(spec.server) ?? [];
  entries.push({
    server: spec.server,
    tool: call.tool,
    input: truncateInput(call.input),
    verdict: answer.verdict,
    output: truncateLine(answer.text),
  });
  if (entries.length > MAX_MOCK_SERVERS) entries.splice(0, entries.length - MAX_MOCK_SERVERS);
  run.history.set(spec.server, entries);
  return answer;
}
//@ chunk-af1hzzme.js:254166-255502 placement
/**
 * 按回放录制、固定回答或代理应答者回答一次调用，检查 expect 输入约束。
 */
async function answerMockCallWithReplay(run, spec, responder, call) {
  if (responder.expect !== null) {
    let violation = checkExpectGuards(call.input, responder.expect);
    if (violation !== null)
      return {
        verdict: "abort",
        text: `input violates expect: ${violation}`,
      };
  }
  let substituted = await substituteAgentInput(
    responder.prompt,
    call.input,
    responder.baseDir,
    readFixture,
    MAX_AGENT_INPUT_SUBSTITUTION_CHARS,
  );
  if (!substituted.ok) {
    run.unreplayableServers.add(spec.server);
    run.replay.misses++;
    return {
      verdict: "tool_error",
      text: substituted.reason,
      replay: "miss",
    };
  }
  let history = run.history.get(spec.server) ?? [];
  let inputHash = hashMockCallArgs({
    server: spec.server,
    tool: call.tool,
    input: call.input,
    mockHash: responder.replay.mockHash,
    prompt: substituted.text,
    history,
  });
  let mockRecording = await readMockRecording(
    responder.replay.replayDir,
    call.tool,
    inputHash,
    responder.replay.pinned,
  );
  if (mockRecording !== null) {
    run.replay.hits++;
    return {
      ...mockRecording,
      replay: "hit",
    };
  }
  let reply = await runMockResponderQuery({
    server: spec.server,
    tool: call.tool,
    responder,
    prompt: substituted.text,
    input: call.input,
    history,
    model: run.model,
    credentials: run.credentials,
    signal: run.abort.signal,
  });
  if (Number.isFinite(reply.costUsd) && reply.costUsd > 0) run.costUsd += reply.costUsd;
  let recorded = false;
  if (
    !reply.text.startsWith(MOCK_RESPONDER_FAILED_TEXT) &&
    !run.unreplayableServers.has(spec.server) &&
    reply.text.length <= MOCK_OUTPUT_MAX_CHARS &&
    run.recordings.length < MAX_RECORDINGS_PER_CALL
  ) {
    let recordable = {
      input: call.input,
      output: reply.text,
      verdict: reply.verdict,
      recordedAt: new Date().toISOString(),
      model: run.model,
    };
    let recordJson = `${jsonStringify(recordable, null, 2)}
`;
    if (Buffer.byteLength(recordJson) <= MAX_MOCK_RECORDING_BYTES) {
      run.recordings.push({
        server: spec.server,
        file: mockRecordingFileName(call.tool, inputHash),
        json: recordJson,
        answerHash: createHash("sha256")
          .update(
            `${reply.verdict}
${reply.text}`,
          )
          .digest("hex"),
        adoptDir: responder.replay.replayDir,
      });
      recorded = true;
    }
  }
  if (!recorded) run.unreplayableServers.add(spec.server);
  run.replay.misses++;
  return {
    verdict: reply.verdict,
    text: reply.text,
    replay: "miss",
  };
}
//@ chunk-af1hzzme.js:255502-255519 placement
/**
 * 单次调用最多固定的录制条数（200）。
 */
var MAX_TOOL_NAME_CHARS = 80;
var MAX_RECORDINGS_PER_CALL = 200;
//@ chunk-af1hzzme.js:255519-255616 placement
function describeMockBudgetExceeded(run) {
  return `mock call budget exceeded (${run.callBudget} agent-answered calls this run)`;
}
//@ chunk-af1hzzme.js:255616-255671 placement
/**
 * 行内容超长时截断。
 */
function truncateLine(text) {
  return text.length > MAX_MOCK_LINE_BYTES ? `${truncateToLength(text, MAX_MOCK_LINE_BYTES)}\u2026` : text;
}
//@ chunk-af1hzzme.js:255671-255732 placement
/**
 * 输入 JSON 超长时截断。
 */
function truncateInput(input) {
  let json = jsonStringify(input) ?? "null";
  return json.length > MAX_MOCK_LINE_BYTES ? truncateLine(json) : input;
}
//@ chunk-af1hzzme.js:255732-255796 placement
/**
 * 生成输出键（tool_error 时中间截断）。
 */
function outputKey(text, verdict) {
  let trimmed = text.trim();
  return verdict === "tool_error" ? truncateMiddle_2(trimmed) : trimmed;
}
//@ chunk-af1hzzme.js:255796-255859 placement
/**
 * 计算值的规范 JSON 哈希。
 */
function canonicalHash(value) {
  return createHash("sha256").update(canonicalJsonStringify(value)).digest("hex");
}
export {
  emptyMockState,
  enumerateMockedServersForRun,
  describeMockMode,
  CALLS_PER_TURN,
  callBudgetForTurns,
  createMockRelayPipe,
  writeRunMocks,
  MockPolicyBlockedError,
  MockWithholdPolicyError,
  MockEnterpriseExclusiveError,
  MockManagedEnvError,
  describeMissingToolsJsonEntry,
  canonicalHash,
  outputKey,
};
