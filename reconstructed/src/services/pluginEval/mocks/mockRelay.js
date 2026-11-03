/**
 * services/pluginEval/mocks/mockRelay.ts
 *
 * 2.1.316 新增：plugin eval 模拟中继：本地管道服务器，把子会话的 MCP 调用转给替身（固定回答、回放、代理应答者）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (28)
 * attribution: placement 28
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
import { u, string, record, unknown } from "../../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-qchp9vrd.js:242327-242378 placement
/**
 * 空的模拟状态（已声明服务器 + 层级）。
 */
function emptyMockState() {
  return {
    declared: new Map(),
    layers: emptyMockLayers(),
  };
}
//@ chunk-qchp9vrd.js:242378-242518 placement
var UNENUMERABLE_REASONS = {
  archive: "it is an archive the child extracts",
  manifest: "its manifest does not load",
  mcpb: "it declares them through an MCPB bundle",
};
//@ chunk-qchp9vrd.js:242518-243507 placement
async function enumerateMockedServersForRun(e, root, evalDirSegments, a, { allowRealServers }) {
  let mockServers = await loadMockServers(
    listAncestorChain(e.caseDir, findMockBaseDir(e.caseDir, root, evalDirSegments)),
    a.layers,
  );
  let w = `${allowRealServers ? "tolerant" : "strict"}
${e.pluginDirs.join(`
`)}`;
  let b = a.declared.get(w);
  if (!b) {
    let T = [];
    b = {
      servers: collectPluginMcpServers(e.pluginDirs, allowRealServers ? T : undefined),
      unenumerable: T,
    };
    a.declared.set(w, b);
  }
  let servers = await b.servers;
  let mapped = b.unenumerable.map(
    (T) =>
      `mocks: plugin ${T.dirName}'s MCP servers could not be enumerated here (${UNENUMERABLE_REASONS[T.reason]}); whatever it declares starts for REAL (--allow-real-servers), as you, outside the sandbox that confines shell tools`,
  );
  if (mockServers.servers.size === 0 && allowRealServers) {
    let T = [...servers.keys()];
    let N = [...mockServers.notes, ...mapped];
    if (T.length > 0)
      N.push(
        `mocks: no mocks/ \u2014 the plugin's REAL server ${T.length === 1 ? "process" : "processes"} ${T.map((x) => `"${x}"`).join(", ")} ${T.length === 1 ? "starts" : "start"} (--allow-real-servers), as you, outside the sandbox that confines shell tools`,
      );
    return {
      servers: [],
      notes: N,
    };
  }
  let S = planMockStandIns(mockServers, servers, {
    allowRealServers,
    unenumerable: b.unenumerable,
  });
  return {
    servers: S.servers,
    notes: [...mapped, ...S.notes],
  };
}
//@ chunk-qchp9vrd.js:243507-243806 placement
function describeMockMode(e) {
  return e
    .map((n) => {
      let r = countRecordings(n.loaded);
      if (n.withheld) return `${n.loaded.dirName}[not started: no mock]`;
      return `${n.loaded.dirName}${n.kind === "standalone" ? "[standalone]" : ""}(${[...n.loaded.tools].map(([a, s]) => `${a}=${s.kind}`).join(", ")}${r > 0 ? `; replay: ${r} pinned` : ""})`;
    })
    .join(", ");
}
//@ chunk-qchp9vrd.js:243806-243815 placement
/**
 * 每回合调用预算系数（4）。
 */
var CALLS_PER_TURN = 4;
//@ chunk-qchp9vrd.js:243815-243842 placement
/**
 * 按回合数计算调用预算。
 */
function callBudgetForTurns(maxTurns) {
  return CALLS_PER_TURN * maxTurns;
}
//@ chunk-qchp9vrd.js:243842-244104 placement
function describeMissingToolsJsonEntry(e) {
  return listUnlistedTools(e).map(
    (n) =>
      `${n.server}: no _tools.json entry for ${n.tools.join(", ")} \u2014 served with a permissive schema and no description; save the server's tools/list response as mocks/${n.server}/_tools.json so the model sees the real tool`,
  );
}
//@ chunk-qchp9vrd.js:244104-244634 placement
class MockManagedEnvError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  names;
  constructor(e) {
    super(
      `mocks: managed settings set ${e.join(", ")} for every session \u2014 the eval child would apply ${plural(e.length, "it", "them")} over the defaults agent mocks are answered under, and each agent-mock run would fail as not served by its mocks. Remove ${plural(e.length, "it", "them")} from managed settings for eval hosts, use fixed (canned) mocks for these tools, or run with --mocks off.`,
      "mocks: managed env pins an MCP knob agent mocks depend on",
    );
    this.names = e;
    this.name = "MockManagedEnvError";
  }
}
//@ chunk-qchp9vrd.js:244634-245095 placement
class MockPolicyBlockedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  registeredNames;
  constructor(e) {
    let n = e.length;
    super(
      `mocks: the managed MCP server policy (allowedMcpServers / deniedMcpServers) blocks the mock ${plural(n, "stand-in")} ${e.map((r) => `"${r}"`).join(", ")} \u2014 the eval child would silently drop ${plural(n, "it", "them")}. Allowlist the stand-in command for eval runs, or run with --mocks off.`,
      "mocks: stand-in blocked by managed MCP policy",
    );
    this.registeredNames = e;
    this.name = "MockPolicyBlockedError";
  }
}
//@ chunk-qchp9vrd.js:245095-245751 placement
class MockWithholdPolicyError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  registeredNames;
  constructor(e) {
    let n = e.length;
    super(
      `mocks: the managed MCP server policy (allowedMcpServers / deniedMcpServers) drops the empty ${plural(n, "stand-in")} record mode registers to keep ${e.map((r) => `"${r}"`).join(", ")} from starting, so ${plural(n, "it", "they")} cannot be withheld here. Allowlist the stand-in command for eval runs, or pass --allow-real-servers to let the plugin's real ${plural(n, "server")} run instead (as you, outside the sandbox; the same policy then applies to ${plural(n, "it", "them")} in the child).`,
      "mocks: withheld stand-in blocked by managed MCP policy",
    );
    this.registeredNames = e;
    this.name = "MockWithholdPolicyError";
  }
}
//@ chunk-qchp9vrd.js:245751-246338 placement
class MockEnterpriseExclusiveError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  mockDirs;
  constructor(e) {
    super(
      `mocks: this machine's managed-mcp.json gives the organization exclusive control of MCP servers, so the eval child cannot register the mock ${plural(e.length, "stand-in")} for ${e.map((n) => `mocks/${n}/`).join(", ")} (nor the plugin's own servers) \u2014 mocks cannot be served here; run the suite on a machine without managed-mcp.json, or with --mocks off (the plugin's servers still will not load under exclusive control)`,
      "mocks: managed-mcp.json exclusive control blocks stand-ins",
    );
    this.mockDirs = e;
    this.name = "MockEnterpriseExclusiveError";
  }
}
//@ chunk-qchp9vrd.js:246338-248211 placement
/**
 * 写入本次运行的替身配置；托管 managed-mcp.json 独占时提示无法注册。
 */
async function writeRunMocks(e, n, evalTempDir, a) {
  let s = filterForArm(e, n);
  let h = alwaysTrue() && doesEnterpriseMcpConfigExist();
  let w = h ? s.filter((R) => !R.withheld) : s;
  if (h && w.length > 0) throw new MockEnterpriseExclusiveError(w.map((R) => R.loaded.dirName));
  if (h && s.length > 0)
    logForDebugging(
      `eval mocks: managed-mcp.json has exclusive MCP control; ${s.length} withheld stand-in(s) not registered (plugin servers do not load in the child)`,
    );
  if (w.length === 0) return null;
  let b = null;
  if (usesAgentResponder(w)) {
    if (a.service === null) throw Error("writeRunMocks: agent responders need the agent service");
    b = a.service.registerRun({
      model: a.model,
      callBudget: callBudgetForTurns(a.maxTurns),
    });
  }
  let y;
  try {
    y = buildRunMockFiles({
      servers: w,
      outDir: evalTempDir.outDir,
      selfCommand: getSelfExecArgv(),
      env: {},
      agent: b?.relay ?? null,
    });
    let R = (S) =>
      isMcpServerBlockedAtConnectTime(S.registeredName, {
        ...y.stdioConfigs[S.registeredName],
        scope: "dynamic",
      });
    if (alwaysTrue()) {
      let mapped = w.filter((N) => N.withheld && R(N)).map((N) => N.registeredName);
      if (mapped.length > 0) throw new MockWithholdPolicyError(mapped);
      let mapped_2 = w.filter((N) => !N.withheld && R(N)).map((N) => N.registeredName);
      if (mapped_2.length > 0) throw new MockPolicyBlockedError(mapped_2);
    }
    b?.attachSpecs(y.specs.map((spec) => spec.spec));
    if (b !== null && alwaysTrue()) {
      let env = getSettingsForSource("policySettings")?.env ?? {};
      let filtered = [...MCP_TIMING_ENV_VARS].filter((N) =>
        Object.keys(env).some((key) => key.toUpperCase() === N),
      );
      if (filtered.length > 0) throw new MockManagedEnvError(filtered);
    }
    await mkdir(path.join(evalTempDir.outDir, "mocks"), {
      recursive: true,
    });
    await Promise.all([
      writeFile(y.configPath, y.configJson, {
        mode: 384,
      }),
      ...y.specs.map((spec) =>
        writeFile(spec.path, spec.json, {
          mode: 384,
        }),
      ),
    ]);
  } catch (error) {
    b?.dispose();
    throw error;
  }
  return {
    configPath: y.configPath,
    callLogPath: y.callLogPath,
    nonce: y.nonce,
    mockedTools: listMockedToolNames(w),
    agentRun: b,
    agentCallBudget: usesAgentResponder(w) ? callBudgetForTurns(a.maxTurns) : 0,
    servers: w.map((R) => ({
      dirName: R.loaded.dirName,
      registeredName: R.registeredName,
      segment: R.segment,
      kind: R.kind,
      withheld: R.withheld === true,
      tools: [...R.loaded.tools.keys()],
      toolFullNames: Object.fromEntries(
        [...R.loaded.tools.keys()].map((key) => [key, buildMcpToolName(R.registeredName, key)]),
      ),
      responderKinds: Object.fromEntries([...R.loaded.tools].map(([S, T]) => [S, T.kind])),
      replayPinned: countRecordings(R.loaded),
      expects: Object.fromEntries([...R.loaded.tools].map(([S, T]) => [S, T.expect])),
    })),
  };
}
//@ chunk-qchp9vrd.js:248211-248234 placement
/**
 * 恒真（占位）。
 */
function alwaysTrue() {
  return true;
}
//@ chunk-qchp9vrd.js:248234-248325 placement
/**
 * 统计运行中的录制总条数。
 */
function countRecordings(loaded) {
  return Object.values(loaded.recordings).reduce((acc, recording) => acc + Object.keys(recording).length, 0);
}
//@ chunk-qchp9vrd.js:248514-248625 placement
var mockRelayRequestSchema = DoctorLazy(() =>
  u({
    token: string(),
    registeredName: string(),
    tool: string(),
    input: record(string(), unknown()),
  }),
);
var MAX_MOCK_MESSAGE_BYTES = 1048576;
var MAX_MOCK_SERVERS = 40;
var MOCK_RELAY_TIMEOUT_MS = 30000;
var MAX_MOCK_LINE_BYTES = 16384;
//@ chunk-qchp9vrd.js:248625-250277 placement
/**
 * 创建 cc-eval-agent- 命名管道/套接字。
 */
async function createMockRelayPipe({ credentials }) {
  let n = new Map();
  let r = getPlatform() === "windows" ? null : await mkdtemp(path.join(tmpdir(), "cc-eval-agent-"));
  let a = r === null ? `\\\\?\\pipe\\cc-eval-agent-${randomBytes(8).toString("hex")}` : path.join(r, "s");
  let s = new Set();
  let server = createServer((w) => {
    s.add(w);
    w.once("close", () => s.delete(w));
    readMockRelayRequest(w, n);
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(a, () => {
        server.off("error", reject);
        resolve();
      });
    });
  } catch (error) {
    await closeStream(server).catch(() => {});
    if (r !== null)
      await rm_2(r, {
        recursive: true,
        force: true,
      }).catch(() => {});
    throw error;
  }
  server.on("error", (w) =>
    logForDebugging(`plugin eval: agent service error: ${errorMessage(w)}`, {
      level: "warn",
    }),
  );
  server.unref();
  return {
    registerRun({ model, callBudget }) {
      let str = randomBytes(16).toString("hex");
      let R = {
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
      n.set(str, R);
      return {
        relay: {
          socketPath: a,
          token: str,
        },
        attachSpecs(S) {
          for (let T of S) R.specs.set(T.registeredName, T);
        },
        state: {
          get aborted() {
            return R.aborted;
          },
          get costUsd() {
            return R.costUsd;
          },
          get agentCalls() {
            return R.agentCalls;
          },
          get answered() {
            return R.answers.length;
          },
          get answers() {
            return R.answers;
          },
          relaysReceived(S, T) {
            return R.received.get(`${S}/${T}`) ?? 0;
          },
          get recordings() {
            return R.recordings;
          },
          get replay() {
            return R.replay;
          },
          get inFlight() {
            return R.inFlight;
          },
        },
        async settled() {
          await R.queue;
        },
        dispose() {
          R.abort.abort();
          n.delete(str);
        },
      };
    },
    async close() {
      for (let w of n.values()) w.abort.abort();
      n.clear();
      for (let w of s) w.destroy();
      s.clear();
      try {
        await closeStream(server);
        if (r !== null)
          await rm_2(r, {
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
//@ chunk-qchp9vrd.js:250277-250334 placement
/**
 * 关闭流并等待完成。
 */
function closeStream(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}
//@ chunk-qchp9vrd.js:250334-250961 placement
function readMockRelayRequest(e, n) {
  let r = Buffer.alloc(0);
  let a = false;
  let s = (w) => {
    if (a) return;
    a = true;
    e.end(`${jsonStringify(w)}
`);
  };
  e.on("error", () => e.destroy());
  e.setTimeout(MOCK_RELAY_TIMEOUT_MS, () => e.destroy());
  let h = false;
  e.on("data", (w) => {
    if (a || h) return;
    r = Buffer.concat([r, w]);
    if (r.length > MAX_MOCK_MESSAGE_BYTES) {
      h = true;
      s({
        verdict: "abort",
        text: "mock relay request too large (a hook that rewrites this tool's input may have inflated it)",
      });
      return;
    }
    let index = r.indexOf(10);
    if (index === -1) return;
    h = true;
    let str = r.subarray(0, index).toString("utf8");
    e.setTimeout(0);
    handleMockRelayRequest(str, n).then(s, (error) => {
      logForDebugging(`plugin eval: mock relay failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      s({
        verdict: "abort",
        text: `${MOCK_RESPONDER_FAILED_TEXT} (relay_internal) \u2014 see the eval debug log`,
      });
    });
  });
}
//@ chunk-qchp9vrd.js:250961-251679 placement
async function handleMockRelayRequest(e, n) {
  let r;
  try {
    r = mockRelayRequestSchema().parse(jsonParse(e));
  } catch {
    return {
      verdict: "tool_error",
      text: "malformed mock relay request",
    };
  }
  let tokenEntry = findTokenEntry(n, r.token);
  if (tokenEntry === undefined)
    return {
      verdict: "tool_error",
      text: "mock relay: no such run",
    };
  let s = tokenEntry.specs.get(r.registeredName);
  let h =
    s !== undefined && Object.hasOwn(s.responders, r.tool) && s.responders[r.tool]?.kind === "agent"
      ? `${s.server}/${r.tool}`
      : null;
  if (h !== null) {
    tokenEntry.received.set(h, (tokenEntry.received.get(h) ?? 0) + 1);
    tokenEntry.inFlight++;
  }
  let w = tokenEntry.queue
    .then(() => answerMockCall(tokenEntry, r))
    .catch((error) => {
      if (tokenEntry.aborted === null)
        tokenEntry.aborted = {
          server: s?.server ?? "(no mocked server)",
          tool: truncateToLength(r.tool, MAX_TOOL_NAME_CHARS),
          reason: `${MOCK_RESPONDER_FAILED_TEXT} (relay_internal) \u2014 see the eval debug log`,
        };
      throw error;
    })
    .finally(() => {
      if (h !== null) tokenEntry.inFlight--;
    });
  tokenEntry.queue = w.catch(() => {});
  return w;
}
//@ chunk-qchp9vrd.js:251679-251740 placement
/**
 * 按 token 查找条目（恒定时间比较）。
 */
function findTokenEntry(e, token) {
  for (let [r, a] of e) if (timingSafeEqualStrings(token, r)) return a;
  return;
}
//@ chunk-qchp9vrd.js:251740-252749 placement
async function answerMockCall(tokenEntry, n) {
  if (tokenEntry.aborted !== null)
    return {
      verdict: "abort",
      text: tokenEntry.aborted.reason,
    };
  if (tokenEntry.abort.signal.aborted)
    return {
      verdict: "abort",
      text: "run ended",
    };
  let r = tokenEntry.specs.get(n.registeredName);
  tokenEntry.agentCalls++;
  if (tokenEntry.agentCalls > tokenEntry.callBudget) {
    let w = describeMockBudgetExceeded(tokenEntry);
    tokenEntry.aborted = {
      server: r?.server ?? "(no mocked server)",
      tool: truncateToLength(n.tool, MAX_TOOL_NAME_CHARS),
      reason: w,
    };
    return {
      verdict: "abort",
      text: w,
    };
  }
  let a = r !== undefined && Object.hasOwn(r.responders, n.tool) ? r.responders[n.tool] : undefined;
  if (r === undefined || a === undefined || a.kind !== "agent")
    return {
      verdict: "tool_error",
      text: `no agent mock for ${n.registeredName}/${n.tool}`,
    };
  let s = await answerMockCallWithReplay(tokenEntry, r, a, n);
  tokenEntry.answers.push({
    server: r.server,
    tool: n.tool,
    inputKey: canonicalHash(n.input),
    verdict: s.verdict,
    outputKey: outputKey(unforgeable(s.text), s.verdict),
  });
  if (s.verdict === "abort" && tokenEntry.aborted === null)
    tokenEntry.aborted = {
      server: r.server,
      tool: n.tool,
      reason: s.text,
    };
  let h = tokenEntry.history.get(r.server) ?? [];
  h.push({
    server: r.server,
    tool: n.tool,
    input: truncateInput(n.input),
    verdict: s.verdict,
    output: truncateLine(s.text),
  });
  if (h.length > MAX_MOCK_SERVERS) h.splice(0, h.length - MAX_MOCK_SERVERS);
  tokenEntry.history.set(r.server, h);
  return s;
}
//@ chunk-qchp9vrd.js:252749-254085 placement
/**
 * 按回放录制、固定回答或代理应答者回答一次调用，检查 expect 输入约束。
 */
async function answerMockCallWithReplay(e, n, r, a) {
  if (r.expect !== null) {
    let S = checkExpectGuards(a.input, r.expect);
    if (S !== null)
      return {
        verdict: "abort",
        text: `input violates expect: ${S}`,
      };
  }
  let s = await substituteAgentInput(
    r.prompt,
    a.input,
    r.baseDir,
    readFixture,
    MAX_AGENT_INPUT_SUBSTITUTION_CHARS,
  );
  if (!s.ok) {
    e.unreplayableServers.add(n.server);
    e.replay.misses++;
    return {
      verdict: "tool_error",
      text: s.reason,
      replay: "miss",
    };
  }
  let history = e.history.get(n.server) ?? [];
  let w = hashMockCallArgs({
    server: n.server,
    tool: a.tool,
    input: a.input,
    mockHash: r.replay.mockHash,
    prompt: s.text,
    history,
  });
  let mockRecording = await readMockRecording(r.replay.replayDir, a.tool, w, r.replay.pinned);
  if (mockRecording !== null) {
    e.replay.hits++;
    return {
      ...mockRecording,
      replay: "hit",
    };
  }
  let y = await runMockResponderQuery({
    server: n.server,
    tool: a.tool,
    responder: r,
    prompt: s.text,
    input: a.input,
    history,
    model: e.model,
    credentials: e.credentials,
    signal: e.abort.signal,
  });
  if (Number.isFinite(y.costUsd) && y.costUsd > 0) e.costUsd += y.costUsd;
  let R = false;
  if (
    !y.text.startsWith(MOCK_RESPONDER_FAILED_TEXT) &&
    !e.unreplayableServers.has(n.server) &&
    y.text.length <= MOCK_OUTPUT_MAX_CHARS &&
    e.recordings.length < MAX_RECORDINGS_PER_CALL
  ) {
    let S = {
      input: a.input,
      output: y.text,
      verdict: y.verdict,
      recordedAt: new Date().toISOString(),
      model: e.model,
    };
    let T = `${jsonStringify(S, null, 2)}
`;
    if (Buffer.byteLength(T) <= MAX_MOCK_RECORDING_BYTES) {
      e.recordings.push({
        server: n.server,
        file: mockRecordingFileName(a.tool, w),
        json: T,
        answerHash: createHash("sha256")
          .update(
            `${y.verdict}
${y.text}`,
          )
          .digest("hex"),
        adoptDir: r.replay.replayDir,
      });
      R = true;
    }
  }
  if (!R) e.unreplayableServers.add(n.server);
  e.replay.misses++;
  return {
    verdict: y.verdict,
    text: y.text,
    replay: "miss",
  };
}
//@ chunk-qchp9vrd.js:254085-254102 placement
/**
 * 单次调用最多固定的录制条数（200）。
 */
var MAX_TOOL_NAME_CHARS = 80;
var MAX_RECORDINGS_PER_CALL = 200;
//@ chunk-qchp9vrd.js:254102-254199 placement
function describeMockBudgetExceeded(e) {
  return `mock call budget exceeded (${e.callBudget} agent-answered calls this run)`;
}
//@ chunk-qchp9vrd.js:254199-254255 placement
/**
 * 行内容超长时截断。
 */
function truncateLine(e) {
  return e.length > MAX_MOCK_LINE_BYTES ? `${truncateToLength(e, MAX_MOCK_LINE_BYTES)}\u2026` : e;
}
//@ chunk-qchp9vrd.js:254255-254316 placement
/**
 * 输入 JSON 超长时截断。
 */
function truncateInput(e) {
  let n = jsonStringify(e) ?? "null";
  return n.length > MAX_MOCK_LINE_BYTES ? truncateLine(n) : e;
}
//@ chunk-qchp9vrd.js:254316-254380 placement
/**
 * 生成输出键（tool_error 时中间截断）。
 */
function outputKey(e, verdict) {
  let trimmed = e.trim();
  return verdict === "tool_error" ? truncateMiddle_2(trimmed) : trimmed;
}
//@ chunk-qchp9vrd.js:254380-254443 placement
/**
 * 计算值的规范 JSON 哈希。
 */
function canonicalHash(e) {
  return createHash("sha256").update(canonicalJsonStringify(e)).digest("hex");
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
