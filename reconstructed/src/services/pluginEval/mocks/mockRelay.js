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
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  mkdtemp,
  mkdtemp as mkdtemp_2,
  mkdtemp as mkdtemp_3,
  mkdtemp as mkdtemp_4,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
} from "fs/promises";
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import { tmpdir, tmpdir as tmpdir_2 } from "os";
import {
  randomBytes,
  randomBytes as randomBytes_2,
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
} from "crypto";
import { createServer } from "net";
import { ni, loadMockServers } from "./mockResponders.js";
import { listAncestorChain, findMockBaseDir } from "../graders.js";
import { collectPluginMcpServers } from "../caseDiscovery.js";
import {
  planMockStandIns,
  listUnlistedTools,
  $n,
  Vn,
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
import { Fi } from "../childEnvironment.js";
import { buildMcpToolName } from "../../mcp/mcpStringUtils.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, o, pe, oe } from "../../../../vendor/zod/v4/classic/schemas.js";
import { getPlatform } from "../../../utils/platform.js";
import { jsonStringify, jsonParse } from "../../../utils/slowOperations.js";
import { iLe, checkExpectGuards, substituteAgentInput } from "../../../cli/handlers/pluginEval/mockGuards.js";
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
function Ql() {
  return { declared: new Map(), layers: ni() };
}
//@ chunk-qchp9vrd.js:242378-242518 placement
var UNENUMERABLE_REASONS = {
  archive: "it is an archive the child extracts",
  manifest: "its manifest does not load",
  mcpb: "it declares them through an MCPB bundle",
};
//@ chunk-qchp9vrd.js:242518-243507 placement
async function enumerateMockedServersForRun(e, n, r, a, { allowRealServers: allowRealServers }) {
  let h = await loadMockServers(listAncestorChain(e.caseDir, findMockBaseDir(e.caseDir, n, r)), a.layers),
    w = `${allowRealServers ? "tolerant" : "strict"}
${e.pluginDirs.join(`
`)}`,
    b = a.declared.get(w);
  if (!b) {
    let T = [];
    ((b = { servers: collectPluginMcpServers(e.pluginDirs, allowRealServers ? T : void 0), unenumerable: T }),
      a.declared.set(w, b));
  }
  let servers = await b.servers,
    mapped = b.unenumerable.map(
      (T) =>
        `mocks: plugin ${T.dirName}'s MCP servers could not be enumerated here (${UNENUMERABLE_REASONS[T.reason]}); whatever it declares starts for REAL (--allow-real-servers), as you, outside the sandbox that confines shell tools`,
    );
  if (h.servers.size === 0 && allowRealServers) {
    let T = [...servers.keys()],
      N = [...h.notes, ...mapped];
    if (T.length > 0)
      N.push(
        `mocks: no mocks/ \u2014 the plugin's REAL server ${T.length === 1 ? "process" : "processes"} ${T.map((x) => `"${x}"`).join(", ")} ${T.length === 1 ? "starts" : "start"} (--allow-real-servers), as you, outside the sandbox that confines shell tools`,
      );
    return { servers: [], notes: N };
  }
  let S = planMockStandIns(h, servers, { allowRealServers: allowRealServers, unenumerable: b.unenumerable });
  return { servers: S.servers, notes: [...mapped, ...S.notes] };
}
//@ chunk-qchp9vrd.js:243507-243806 placement
function describeMockMode(e) {
  return e
    .map((n) => {
      let r = oc(n.loaded);
      if (n.withheld) return `${n.loaded.dirName}[not started: no mock]`;
      return `${n.loaded.dirName}${n.kind === "standalone" ? "[standalone]" : ""}(${[...n.loaded.tools].map(([a, s]) => `${a}=${s.kind}`).join(", ")}${r > 0 ? `; replay: ${r} pinned` : ""})`;
    })
    .join(", ");
}
//@ chunk-qchp9vrd.js:243806-243815 placement
var Xi = 4;
//@ chunk-qchp9vrd.js:243815-243842 placement
function Do(e) {
  return Xi * e;
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
/**
 * 写入本次运行的替身配置；托管 managed-mcp.json 独占时提示无法注册。
 */
//@ chunk-qchp9vrd.js:246338-248211 placement
async function writeRunMocks(e, n, r, a) {
  let s = $n(e, n),
    h = Yi() && doesEnterpriseMcpConfigExist(),
    w = h ? s.filter((R) => !R.withheld) : s;
  if (h && w.length > 0) throw new MockEnterpriseExclusiveError(w.map((R) => R.loaded.dirName));
  if (h && s.length > 0)
    logForDebugging(
      `eval mocks: managed-mcp.json has exclusive MCP control; ${s.length} withheld stand-in(s) not registered (plugin servers do not load in the child)`,
    );
  if (w.length === 0) return null;
  let b = null;
  if (Vn(w)) {
    if (a.service === null) throw Error("writeRunMocks: agent responders need the agent service");
    b = a.service.registerRun({ model: a.model, callBudget: Do(a.maxTurns) });
  }
  let y;
  try {
    y = buildRunMockFiles({
      servers: w,
      outDir: r.outDir,
      selfCommand: getSelfExecArgv(),
      env: {},
      agent: b?.relay ?? null,
    });
    let R = (S) =>
      isMcpServerBlockedAtConnectTime(S.registeredName, {
        ...y.stdioConfigs[S.registeredName],
        scope: "dynamic",
      });
    if (Yi()) {
      let mapped = w.filter((N) => N.withheld && R(N)).map((N) => N.registeredName);
      if (mapped.length > 0) throw new MockWithholdPolicyError(mapped);
      let mapped_2 = w.filter((N) => !N.withheld && R(N)).map((N) => N.registeredName);
      if (mapped_2.length > 0) throw new MockPolicyBlockedError(mapped_2);
    }
    if ((b?.attachSpecs(y.specs.map((spec) => spec.spec)), b !== null && Yi())) {
      let S = getSettingsForSource("policySettings")?.env ?? {},
        filtered = [...Fi].filter((N) => Object.keys(S).some((x) => x.toUpperCase() === N));
      if (filtered.length > 0) throw new MockManagedEnvError(filtered);
    }
    (await mkdir_5(path_17.join(r.outDir, "mocks"), { recursive: !0 }),
      await Promise.all([
        writeFile_3(y.configPath, y.configJson, { mode: 384 }),
        ...y.specs.map((spec) => writeFile_3(spec.path, spec.json, { mode: 384 })),
      ]));
  } catch (error) {
    throw (b?.dispose(), error);
  }
  return {
    configPath: y.configPath,
    callLogPath: y.callLogPath,
    nonce: y.nonce,
    mockedTools: listMockedToolNames(w),
    agentRun: b,
    agentCallBudget: Vn(w) ? Do(a.maxTurns) : 0,
    servers: w.map((R) => ({
      dirName: R.loaded.dirName,
      registeredName: R.registeredName,
      segment: R.segment,
      kind: R.kind,
      withheld: R.withheld === !0,
      tools: [...R.loaded.tools.keys()],
      toolFullNames: Object.fromEntries(
        [...R.loaded.tools.keys()].map((S) => [S, buildMcpToolName(R.registeredName, S)]),
      ),
      responderKinds: Object.fromEntries([...R.loaded.tools].map(([S, T]) => [S, T.kind])),
      replayPinned: oc(R.loaded),
      expects: Object.fromEntries([...R.loaded.tools].map(([S, T]) => [S, T.expect])),
    })),
  };
}
//@ chunk-qchp9vrd.js:248211-248234 placement
function Yi() {
  return !0;
}
//@ chunk-qchp9vrd.js:248234-248325 placement
function oc(e) {
  return Object.values(e.recordings).reduce((n, r) => n + Object.keys(r).length, 0);
}
//@ chunk-qchp9vrd.js:248514-248625 placement
var mockRelayRequestSchema = DoctorLazy(() =>
    u({ token: o(), registeredName: o(), tool: o(), input: pe(o(), oe()) }),
  ),
  MAX_MOCK_MESSAGE_BYTES = 1048576,
  MAX_MOCK_SERVERS = 40,
  MOCK_RELAY_TIMEOUT_MS = 30000,
  MAX_MOCK_LINE_BYTES = 16384;
/**
 * 创建 cc-eval-agent- 命名管道/套接字。
 */
//@ chunk-qchp9vrd.js:248625-250277 placement
async function createMockRelayPipe({ credentials: credentials }) {
  let n = new Map(),
    r = getPlatform() === "windows" ? null : await mkdtemp_4(path_18.join(tmpdir_2(), "cc-eval-agent-")),
    a = r === null ? `\\\\?\\pipe\\cc-eval-agent-${randomBytes_2(8).toString("hex")}` : path_18.join(r, "s"),
    s = new Set(),
    h = createServer((w) => {
      (s.add(w), w.once("close", () => s.delete(w)), readMockRelayRequest(w, n));
    });
  try {
    await new Promise((w, b) => {
      (h.once("error", b),
        h.listen(a, () => {
          (h.off("error", b), w());
        }));
    });
  } catch (error) {
    if ((await cc(h).catch(() => {}), r !== null))
      await rm_5(r, { recursive: !0, force: !0 }).catch(() => {});
    throw error;
  }
  return (
    h.on("error", (w) =>
      logForDebugging(`plugin eval: agent service error: ${errorMessage(w)}`, { level: "warn" }),
    ),
    h.unref(),
    {
      registerRun({ model: w, callBudget: b }) {
        let str = randomBytes_2(16).toString("hex"),
          R = {
            specs: new Map(),
            model: w,
            credentials: credentials,
            callBudget: b,
            abort: new AbortController(),
            history: new Map(),
            agentCalls: 0,
            aborted: null,
            costUsd: 0,
            answers: [],
            received: new Map(),
            inFlight: 0,
            recordings: [],
            replay: { hits: 0, misses: 0 },
            unreplayableServers: new Set(),
            queue: Promise.resolve(),
          };
        return (
          n.set(str, R),
          {
            relay: { socketPath: a, token: str },
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
              (R.abort.abort(), n.delete(str));
            },
          }
        );
      },
      async close() {
        for (let w of n.values()) w.abort.abort();
        n.clear();
        for (let w of s) w.destroy();
        s.clear();
        try {
          if ((await cc(h), r !== null)) await rm_5(r, { recursive: !0, force: !0 });
        } catch (error) {
          logForDebugging(`eval mocks: agent service teardown: ${errorMessage(error)}`, { level: "error" });
        }
      },
    }
  );
}
//@ chunk-qchp9vrd.js:250277-250334 placement
function cc(e) {
  return new Promise((n) => e.close(() => n()));
}
//@ chunk-qchp9vrd.js:250334-250961 placement
function readMockRelayRequest(e, n) {
  let alloc = Buffer.alloc(0),
    a = !1,
    s = (w) => {
      if (a) return;
      ((a = !0),
        e.end(`${jsonStringify(w)}
`));
    };
  (e.on("error", () => e.destroy()), e.setTimeout(MOCK_RELAY_TIMEOUT_MS, () => e.destroy()));
  let h = !1;
  e.on("data", (w) => {
    if (a || h) return;
    if (((alloc = Buffer.concat([alloc, w])), alloc.length > MAX_MOCK_MESSAGE_BYTES)) {
      ((h = !0),
        s({
          verdict: "abort",
          text: "mock relay request too large (a hook that rewrites this tool's input may have inflated it)",
        }));
      return;
    }
    let index = alloc.indexOf(10);
    if (index === -1) return;
    h = !0;
    let str = alloc.subarray(0, index).toString("utf8");
    (e.setTimeout(0),
      handleMockRelayRequest(str, n).then(s, (R) => {
        (logForDebugging(`plugin eval: mock relay failed: ${errorMessage(R)}`, { level: "warn" }),
          s({ verdict: "abort", text: `${iLe} (relay_internal) \u2014 see the eval debug log` }));
      }));
  });
}
//@ chunk-qchp9vrd.js:250961-251679 placement
async function handleMockRelayRequest(e, n) {
  let r;
  try {
    r = mockRelayRequestSchema().parse(jsonParse(e));
  } catch {
    return { verdict: "tool_error", text: "malformed mock relay request" };
  }
  let a = ng(n, r.token);
  if (a === void 0) return { verdict: "tool_error", text: "mock relay: no such run" };
  let s = a.specs.get(r.registeredName),
    h =
      s !== void 0 && Object.hasOwn(s.responders, r.tool) && s.responders[r.tool]?.kind === "agent"
        ? `${s.server}/${r.tool}`
        : null;
  if (h !== null) (a.received.set(h, (a.received.get(h) ?? 0) + 1), a.inFlight++);
  let w = a.queue
    .then(() => answerMockCall(a, r))
    .catch((b) => {
      if (a.aborted === null)
        a.aborted = {
          server: s?.server ?? "(no mocked server)",
          tool: truncateToLength(r.tool, fc),
          reason: `${iLe} (relay_internal) \u2014 see the eval debug log`,
        };
      throw b;
    })
    .finally(() => {
      if (h !== null) a.inFlight--;
    });
  return ((a.queue = w.catch(() => {})), w);
}
//@ chunk-qchp9vrd.js:251679-251740 placement
function ng(e, n) {
  for (let [r, a] of e) if (timingSafeEqualStrings(n, r)) return a;
  return;
}
//@ chunk-qchp9vrd.js:251740-252749 placement
async function answerMockCall(e, n) {
  if (e.aborted !== null) return { verdict: "abort", text: e.aborted.reason };
  if (e.abort.signal.aborted) return { verdict: "abort", text: "run ended" };
  let r = e.specs.get(n.registeredName);
  if ((e.agentCalls++, e.agentCalls > e.callBudget)) {
    let w = describeMockBudgetExceeded(e);
    return (
      (e.aborted = {
        server: r?.server ?? "(no mocked server)",
        tool: truncateToLength(n.tool, fc),
        reason: w,
      }),
      { verdict: "abort", text: w }
    );
  }
  let a = r !== void 0 && Object.hasOwn(r.responders, n.tool) ? r.responders[n.tool] : void 0;
  if (r === void 0 || a === void 0 || a.kind !== "agent")
    return { verdict: "tool_error", text: `no agent mock for ${n.registeredName}/${n.tool}` };
  let s = await answerMockCallWithReplay(e, r, a, n);
  if (
    (e.answers.push({
      server: r.server,
      tool: n.tool,
      inputKey: Zi(n.input),
      verdict: s.verdict,
      outputKey: qi(unforgeable(s.text), s.verdict),
    }),
    s.verdict === "abort" && e.aborted === null)
  )
    e.aborted = { server: r.server, tool: n.tool, reason: s.text };
  let h = e.history.get(r.server) ?? [];
  if (
    (h.push({ server: r.server, tool: n.tool, input: ag(n.input), verdict: s.verdict, output: pc(s.text) }),
    h.length > MAX_MOCK_SERVERS)
  )
    h.splice(0, h.length - MAX_MOCK_SERVERS);
  return (e.history.set(r.server, h), s);
}
/**
 * 按回放录制、固定回答或代理应答者回答一次调用，检查 expect 输入约束。
 */
//@ chunk-qchp9vrd.js:252749-254085 placement
async function answerMockCallWithReplay(e, n, r, a) {
  if (r.expect !== null) {
    let S = checkExpectGuards(a.input, r.expect);
    if (S !== null) return { verdict: "abort", text: `input violates expect: ${S}` };
  }
  let s = await substituteAgentInput(
    r.prompt,
    a.input,
    r.baseDir,
    readFixture,
    MAX_AGENT_INPUT_SUBSTITUTION_CHARS,
  );
  if (!s.ok)
    return (
      e.unreplayableServers.add(n.server),
      e.replay.misses++,
      { verdict: "tool_error", text: s.reason, replay: "miss" }
    );
  let h = e.history.get(n.server) ?? [],
    w = hashMockCallArgs({
      server: n.server,
      tool: a.tool,
      input: a.input,
      mockHash: r.replay.mockHash,
      prompt: s.text,
      history: h,
    }),
    b = await readMockRecording(r.replay.replayDir, a.tool, w, r.replay.pinned);
  if (b !== null) return (e.replay.hits++, { ...b, replay: "hit" });
  let y = await runMockResponderQuery({
    server: n.server,
    tool: a.tool,
    responder: r,
    prompt: s.text,
    input: a.input,
    history: h,
    model: e.model,
    credentials: e.credentials,
    signal: e.abort.signal,
  });
  if (Number.isFinite(y.costUsd) && y.costUsd > 0) e.costUsd += y.costUsd;
  let R = !1;
  if (
    !y.text.startsWith(iLe) &&
    !e.unreplayableServers.has(n.server) &&
    y.text.length <= MOCK_OUTPUT_MAX_CHARS &&
    e.recordings.length < ig
  ) {
    let S = {
        input: a.input,
        output: y.text,
        verdict: y.verdict,
        recordedAt: new Date().toISOString(),
        model: e.model,
      },
      T = `${jsonStringify(S, null, 2)}
`;
    if (Buffer.byteLength(T) <= MAX_MOCK_RECORDING_BYTES)
      (e.recordings.push({
        server: n.server,
        file: mockRecordingFileName(a.tool, w),
        json: T,
        answerHash: createHash_4("sha256")
          .update(
            `${y.verdict}
${y.text}`,
          )
          .digest("hex"),
        adoptDir: r.replay.replayDir,
      }),
        (R = !0));
  }
  if (!R) e.unreplayableServers.add(n.server);
  return (e.replay.misses++, { verdict: y.verdict, text: y.text, replay: "miss" });
}
//@ chunk-qchp9vrd.js:254085-254102 placement
var fc = 80,
  ig = 200;
//@ chunk-qchp9vrd.js:254102-254199 placement
function describeMockBudgetExceeded(e) {
  return `mock call budget exceeded (${e.callBudget} agent-answered calls this run)`;
}
//@ chunk-qchp9vrd.js:254199-254255 placement
function pc(e) {
  return e.length > MAX_MOCK_LINE_BYTES ? `${truncateToLength(e, MAX_MOCK_LINE_BYTES)}\u2026` : e;
}
//@ chunk-qchp9vrd.js:254255-254316 placement
function ag(e) {
  let n = jsonStringify(e) ?? "null";
  return n.length > MAX_MOCK_LINE_BYTES ? pc(n) : e;
}
//@ chunk-qchp9vrd.js:254316-254380 placement
function qi(e, n) {
  let trimmed = e.trim();
  return n === "tool_error" ? truncateMiddle_2(trimmed) : trimmed;
}
//@ chunk-qchp9vrd.js:254380-254443 placement
function Zi(e) {
  return createHash_4("sha256").update(canonicalJsonStringify(e)).digest("hex");
}

export {
  Ql,
  enumerateMockedServersForRun,
  describeMockMode,
  Xi,
  Do,
  createMockRelayPipe,
  writeRunMocks,
  MockPolicyBlockedError,
  MockWithholdPolicyError,
  MockEnterpriseExclusiveError,
  MockManagedEnvError,
  describeMissingToolsJsonEntry,
  Zi,
  qi,
};
