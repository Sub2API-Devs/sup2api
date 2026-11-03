/**
 * tools/SelfHostedRunnerTool/selfHostedRunnerTools.ts
 *
 * 2.1.316 新增：自托管环境管理工具集（内部）：查看环境聚合与队列、列出 runner/会话/密钥、本地 runner 健康与指标、重排卡住会话、试运行本地 runner、读日志
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3yy90gv7.js (19)
 * attribution: placement 19
 */
import { resolve, dirname } from "path";
import { mkdir, writeFile, open } from "fs/promises";
import { spawn } from "child_process";
import { o, zodStrictObject, u, pe, oe, A, E, M, Ue } from "../../../vendor/zod/v4/classic/schemas.js";
import { Lee } from "../../utils/unsafePathGlyphs.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  SELF_HOSTED_RUNNER_GET_POOL,
  ENV_STATE_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_LIST_SESSIONS,
  LIST_SESSIONS_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_LIST_RUNNERS,
  LIST_RUNNERS_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_LIST_SECRETS,
  LIST_SECRETS_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_READ_HEALTH,
  RUNNER_HEALTH_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_READ_METRICS,
  RUNNER_METRICS_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_REQUEUE_SESSION,
  REQUEUE_SESSION_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_SPAWN_LOCAL,
  SPAWN_RUNNER_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_TAIL_LOG,
  RUNNER_LOGS_TOOL_DESCRIPTION,
} from "../../services/selfHostedRunner/runnerToolNames.js";
import {
  runnerApiRequest,
  withUi,
  toolResultBlock,
  describeArgs,
  DEFAULT_RUNNER_PORT,
  runnerApiBaseUrl,
} from "../../services/selfHostedRunner/runnerApi.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { errorMessage } from "../../utils/errors.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { isStandaloneExecutable } from "../../utils/slowOperations.js";
import { withLaunchValuesOfHybridConnection } from "../../utils/managedEnvApply.js";
import { moveKeeperPid } from "../../utils/toolCgroup.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";

//@ chunk-3yy90gv7.js:4937-5748 placement
var TAGGED_ID_UNREADABLE_RULE =
    "it holds a character that the operator could not read as written, such as a control, invisible or direction-changing character, a line break, or a space other than the plain one. If it is a stray character, as from a paste, pass the value without it. If it is part of a real path, do not drop or replace it, which would name another file: where it lies in the path of the working directory itself, pass the path relative to that directory, as in ./runner-setup/runner.log; otherwise ask the operator to rename or move the file; if you cannot tell which, ask the operator",
  Q =
    'an id holds only the letters A to Z and a to z, digits, "_" and "-", between 1 and 256 of them. Pass the id alone, as the server or the operator gave it, without quotes, spaces or other text around it',
  V = /^[a-zA-Z0-9_-]{1,256}$/;
//@ chunk-3yy90gv7.js:5748-5795 placement
function S() {
  return o().refine((e) => !Lee(e), TAGGED_ID_UNREADABLE_RULE);
}
//@ chunk-3yy90gv7.js:5795-5844 placement
function l() {
  return o().refine((e) => V.test(e), Q);
}
/**
 * 读取自托管环境聚合与队列数的工具定义。
 */
//@ chunk-3yy90gv7.js:5844-6728 placement
var EnvironmentSummaryInputSchema = DoctorLazy(() =>
    zodStrictObject({ pool_id: l().describe("Tagged environment id (ccpool_\u2026).") }),
  ),
  X = DoctorLazy(() => u({ pool: pe(o(), oe()), equivalent: u({ ui: o() }) })),
  C = buildTool({
    name: SELF_HOSTED_RUNNER_GET_POOL,
    searchHint: "read self-hosted environment aggregates and queue counts",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    shouldDefer: !0,
    get inputSchema() {
      return EnvironmentSummaryInputSchema();
    },
    get outputSchema() {
      return X();
    },
    isReadOnly() {
      return !0;
    },
    isConcurrencySafe() {
      return !0;
    },
    async description() {
      return ENV_STATE_TOOL_DESCRIPTION;
    },
    async prompt() {
      return ENV_STATE_TOOL_DESCRIPTION;
    },
    create(e) {
      return {
        async call({ pool_id: t }, r) {
          let s = `/v1/code/runners/self-hosted/pools/${encodeURIComponent(t)}`,
            n = await runnerApiRequest("GET", s, void 0, r.signal, e.credentials);
          return {
            data: {
              pool: n.pool ?? n,
              equivalent: withUi(
                "Admin settings \u2192 Cloud environments \u2192 Self-hosted environments \u2192 (environment) \u2014 header stat tiles",
              ),
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, t) {
      return toolResultBlock(t, e);
    },
    renderToolUseMessage(e) {
      return describeArgs(e);
    },
  });
//@ chunk-3yy90gv7.js:6728-7805 placement
var ListEnvironmentSessionsInputSchema = DoctorLazy(() =>
    zodStrictObject({
      pool_id: l().describe("Tagged environment id (ccpool_\u2026)."),
      status_filter: S().optional().describe('Optional server-side status filter (e.g. "queued").'),
    }),
  ),
  ee = DoctorLazy(() => u({ sessions: A(pe(o(), oe())), equivalent: u({ ui: o() }) })),
  P = buildTool({
    name: SELF_HOSTED_RUNNER_LIST_SESSIONS,
    searchHint: "list queued/assigned sessions in a self-hosted environment",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    shouldDefer: !0,
    get inputSchema() {
      return ListEnvironmentSessionsInputSchema();
    },
    get outputSchema() {
      return ee();
    },
    isReadOnly() {
      return !0;
    },
    isConcurrencySafe() {
      return !0;
    },
    async description() {
      return LIST_SESSIONS_TOOL_DESCRIPTION;
    },
    async prompt() {
      return LIST_SESSIONS_TOOL_DESCRIPTION;
    },
    create(e) {
      return {
        async call({ pool_id: t, status_filter: r }, s) {
          let n = r ? `?status=${encodeURIComponent(r)}` : "",
            a = `/v1/code/runners/self-hosted/pools/${encodeURIComponent(t)}/sessions${n}`;
          return {
            data: {
              sessions: (await runnerApiRequest("GET", a, void 0, s.signal, e.credentials)).sessions ?? [],
              equivalent: withUi(
                "Admin settings \u2192 Cloud environments \u2192 Self-hosted environments \u2192 (environment) \u2192 Activity tab \u2192 Sessions",
              ),
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, t) {
      return toolResultBlock(t, e);
    },
    renderToolUseMessage(e) {
      return describeArgs(e);
    },
  });
//@ chunk-3yy90gv7.js:7805-8722 placement
var ListRunnersInputSchema = DoctorLazy(() =>
    zodStrictObject({ pool_id: l().describe("Tagged environment id (ccpool_\u2026).") }),
  ),
  re = DoctorLazy(() => u({ runners: A(pe(o(), oe())), equivalent: u({ ui: o() }) })),
  D = buildTool({
    name: SELF_HOSTED_RUNNER_LIST_RUNNERS,
    searchHint: "list registered self-hosted runners for an environment",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    shouldDefer: !0,
    get inputSchema() {
      return ListRunnersInputSchema();
    },
    get outputSchema() {
      return re();
    },
    isReadOnly() {
      return !0;
    },
    isConcurrencySafe() {
      return !0;
    },
    async description() {
      return LIST_RUNNERS_TOOL_DESCRIPTION;
    },
    async prompt() {
      return LIST_RUNNERS_TOOL_DESCRIPTION;
    },
    create(e) {
      return {
        async call({ pool_id: t }, r) {
          let s = `/v1/code/runners/self-hosted/runners?pool_id=${encodeURIComponent(t)}`;
          return {
            data: {
              runners: (await runnerApiRequest("GET", s, void 0, r.signal, e.credentials)).runners ?? [],
              equivalent: withUi(
                "Admin settings \u2192 Cloud environments \u2192 Self-hosted environments \u2192 (environment) \u2192 Activity tab \u2192 Runners",
              ),
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, t) {
      return toolResultBlock(t, e);
    },
    renderToolUseMessage(e) {
      return describeArgs(e);
    },
  });
//@ chunk-3yy90gv7.js:8722-9649 placement
var ListEnvironmentSecretsInputSchema = DoctorLazy(() =>
    zodStrictObject({ pool_id: l().describe("Tagged environment id (ccpool_\u2026).") }),
  ),
  se = DoctorLazy(() => u({ secrets: A(pe(o(), oe())), equivalent: u({ ui: o() }) })),
  k = buildTool({
    name: SELF_HOSTED_RUNNER_LIST_SECRETS,
    searchHint: "list self-hosted environment secrets (metadata only)",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    shouldDefer: !0,
    get inputSchema() {
      return ListEnvironmentSecretsInputSchema();
    },
    get outputSchema() {
      return se();
    },
    isReadOnly() {
      return !0;
    },
    isConcurrencySafe() {
      return !0;
    },
    async description() {
      return LIST_SECRETS_TOOL_DESCRIPTION;
    },
    async prompt() {
      return LIST_SECRETS_TOOL_DESCRIPTION;
    },
    create(e) {
      return {
        async call({ pool_id: t }, r) {
          let s = `/v1/code/runners/self-hosted/pools/${encodeURIComponent(t)}/secrets`;
          return {
            data: {
              secrets: (await runnerApiRequest("GET", s, void 0, r.signal, e.credentials)).secrets ?? [],
              equivalent: withUi(
                "Admin settings \u2192 Cloud environments \u2192 Self-hosted environments \u2192 (environment) \u2192 Configuration tab \u2192 Environment keys",
              ),
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, t) {
      return toolResultBlock(t, e);
    },
    renderToolUseMessage(e) {
      return describeArgs(e);
    },
  });
//@ chunk-3yy90gv7.js:9649-10529 placement
var ProbeRunnerHealthInputSchema = DoctorLazy(() =>
    zodStrictObject({
      health_port: E().int().optional().describe(`Default ${DEFAULT_RUNNER_PORT}. 0 means disabled.`),
    }),
  ),
  ie = DoctorLazy(() =>
    u({
      health: pe(o(), oe()).optional(),
      disabled: M().optional(),
      unreachable: M().optional(),
      error: o().optional(),
    }),
  ),
  x = buildTool({
    name: SELF_HOSTED_RUNNER_READ_HEALTH,
    searchHint: "probe local self-hosted runner /healthz endpoint",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    shouldDefer: !0,
    get inputSchema() {
      return ProbeRunnerHealthInputSchema();
    },
    get outputSchema() {
      return ie();
    },
    isReadOnly() {
      return !0;
    },
    isConcurrencySafe() {
      return !0;
    },
    async description() {
      return RUNNER_HEALTH_TOOL_DESCRIPTION;
    },
    async prompt() {
      return RUNNER_HEALTH_TOOL_DESCRIPTION;
    },
    create() {
      return {
        async call({ health_port: e = DEFAULT_RUNNER_PORT }) {
          if (e === 0) return { data: { disabled: !0 } };
          try {
            return {
              data: {
                health: (
                  await externalHttp.get(`http://127.0.0.1:${e}/healthz`, {
                    timeout: 2000,
                    validateStatus: () => !0,
                  })
                ).data,
              },
            };
          } catch (error) {
            return { data: { unreachable: !0, error: errorMessage(error) } };
          }
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, t) {
      return toolResultBlock(t, e);
    },
    renderToolUseMessage(e) {
      return describeArgs(e);
    },
  });
//@ chunk-3yy90gv7.js:10529-10810 placement
var RUNNER_METRIC_PREFIX = "claude_code_self_hosted_runner_",
  ue = DoctorLazy(() =>
    zodStrictObject({
      health_port: E().int().optional().describe(`Default ${DEFAULT_RUNNER_PORT}. 0 means disabled.`),
    }),
  ),
  ce = DoctorLazy(() =>
    u({
      gauges: pe(o(), Ue([E(), o()])).optional(),
      raw: o().optional(),
      disabled: M().optional(),
      unreachable: M().optional(),
      error: o().optional(),
    }),
  );
//@ chunk-3yy90gv7.js:10810-11283 placement
function parseRunnerMetrics(e) {
  let t = {};
  for (let r of e.split(`
`)) {
    if (r.startsWith("#") || !r.startsWith(RUNNER_METRIC_PREFIX)) continue;
    let match = r.match(/^(\S+?)(\{[^}]*\})?\s+(\S+)\s*$/);
    if (!match) continue;
    let sliced = match[1].slice(RUNNER_METRIC_PREFIX.length);
    if (sliced.endsWith("_bucket") || sliced === "session_idle_seconds" || sliced === "poll_errors_total")
      continue;
    let a = match[2] ?? "",
      i = Number(match[3]);
    if (sliced === "locked_account") {
      let c = a.match(/email="([^"]*)"/)?.[1];
      if (c) t.locked_account_email = c;
    }
    if (!Number.isNaN(i)) {
      let c = t[sliced];
      t[sliced] = typeof c === "number" ? c + i : i;
    }
  }
  return t;
}
//@ chunk-3yy90gv7.js:11283-12009 placement
var READ_RUNNER_METRICS_TOOL = buildTool({
  name: SELF_HOSTED_RUNNER_READ_METRICS,
  searchHint: "read self-hosted runner Prometheus gauges from /metrics",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: !0,
  get inputSchema() {
    return ue();
  },
  get outputSchema() {
    return ce();
  },
  isReadOnly() {
    return !0;
  },
  isConcurrencySafe() {
    return !0;
  },
  async description() {
    return RUNNER_METRICS_TOOL_DESCRIPTION;
  },
  async prompt() {
    return RUNNER_METRICS_TOOL_DESCRIPTION;
  },
  create() {
    return {
      async call({ health_port: e = DEFAULT_RUNNER_PORT }) {
        if (e === 0) return { data: { disabled: !0 } };
        try {
          let t = await externalHttp.get(`http://127.0.0.1:${e}/metrics`, {
              timeout: 2000,
              responseType: "text",
              validateStatus: () => !0,
            }),
            r = redactSecretsInText(String(t.data));
          return { data: { gauges: parseRunnerMetrics(r), raw: r } };
        } catch (error) {
          return { data: { unreachable: !0, error: errorMessage(error) } };
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, t) {
    return toolResultBlock(t, e);
  },
  renderToolUseMessage(e) {
    return describeArgs(e);
  },
});
/**
 * 把卡住的会话重新排队到其他 runner 的工具定义。
 */
//@ chunk-3yy90gv7.js:12009-13830 placement
var RequeueSessionInputSchema = DoctorLazy(() =>
    zodStrictObject({
      session_id: l().describe("Tagged session id (ccsess_\u2026)."),
      runner_id: l().describe(
        "Tagged runner id (ccrunner_\u2026) the caller observed failing. Server verifies this still matches the session assignment; mismatch returns Conflict. For a stuck session with no runner assigned, pass any runner id of this environment, such as one of the excluded_runner_ids of the session; the server does not compare it.",
      ),
    }),
  ),
  de = DoctorLazy(() => u({ excluded_count: E().optional(), equivalent: u({ ui: o() }) })),
  j = buildTool({
    name: SELF_HOSTED_RUNNER_REQUEUE_SESSION,
    searchHint: "requeue a stuck self-hosted runner session onto another runner",
    enablesCodeExecution: !0,
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    shouldDefer: !0,
    get inputSchema() {
      return RequeueSessionInputSchema();
    },
    get outputSchema() {
      return de();
    },
    isReadOnly() {
      return !1;
    },
    ignoresWholeToolAllowRule() {
      return !0;
    },
    suppressesAlwaysAllowRule() {
      return !0;
    },
    toAutoClassifierInput(e) {
      return `requeue session=${e.session_id} off runner=${e.runner_id}`;
    },
    async description() {
      return REQUEUE_SESSION_TOOL_DESCRIPTION;
    },
    async prompt() {
      return REQUEUE_SESSION_TOOL_DESCRIPTION;
    },
    create(e) {
      return {
        async checkPermissions(t) {
          if (e.permissions().mode === "auto")
            return {
              behavior: "passthrough",
              message: "Requeueing a runner session requires classifier review.",
            };
          return {
            behavior: "ask",
            message: `Requeue session ${t.session_id} off runner ${t.runner_id}? This re-launches the session on another runner in the environment.`,
          };
        },
        async call({ session_id: t, runner_id: r }, s) {
          let n = `/v1/code/runners/self-hosted/sessions/${encodeURIComponent(t)}/requeue`;
          return {
            data: {
              excluded_count: (await runnerApiRequest("POST", n, { runner_id: r }, s.signal, e.credentials))
                .excluded_count,
              equivalent: withUi(
                "Admin settings \u2192 Cloud environments \u2192 Self-hosted environments \u2192 (environment) \u2192 Activity tab \u2192 Sessions \u2192 (session) \u2192 Retry",
              ),
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, t) {
      return toolResultBlock(t, e);
    },
    renderToolUseMessage(e) {
      return describeArgs(e);
    },
  });
//@ chunk-3yy90gv7.js:13965-14819 placement
var RUNNER_SETUP_WORKSPACE = "./runner-setup/workspace",
  U = "./runner-setup/runner.log",
  Se = "./runner-setup/runner.pid",
  I =
    "the path holds a control character, a tab or a line break, so the operator could not read it as written; use a path without such characters, or ask the operator to rename or move the file",
  Te = DoctorLazy(() =>
    zodStrictObject({
      secret_file_path: o()
        .refine(w, I)
        .describe("Path to the environment secret the operator saved from the Admin UI."),
      capacity: E().int().positive().optional().describe("Default 1."),
      base_dir: o()
        .refine(w, I)
        .optional()
        .describe(
          `Always passed to the runner (its built-in default of /workspace is unwritable on laptops). Default: ${RUNNER_SETUP_WORKSPACE}`,
        ),
      health_port: E().int().optional().describe(`Default ${DEFAULT_RUNNER_PORT}. 0 disables /healthz.`),
      log_path: o().refine(w, I).optional().describe(`Default: ${U}`),
    }),
  ),
  ge = DoctorLazy(() => u({ pid: E(), pid_file: o(), log_path: o(), health_port: E(), command: o() }));
//@ chunk-3yy90gv7.js:14819-15046 placement
function buildRunnerSpawnArgs(e) {
  return [
    "self-hosted-runner",
    "--environment-secret-file",
    e.secret_file_path,
    "--capacity",
    String(e.capacity),
    "--base-dir",
    e.base_dir,
    "--api-url",
    runnerApiBaseUrl(),
    "--health-port",
    String(e.health_port),
    "--log-file",
    e.log_path,
  ];
}
/**
 * （误归 deepLink）POSIX shell 单引号转义（安全字符不加引号）。
 */
//@ chunk-3yy90gv7.js:15046-15126 placement = shellQuote (1)
function shellQuote(s) {
  return /^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`;
}
/**
 * 启动本地 runner 试运行（需分类器审核）。
 */
//@ chunk-3yy90gv7.js:15126-16976 placement
var SPAWN_LOCAL_RUNNER_TOOL = buildTool({
  name: SELF_HOSTED_RUNNER_SPAWN_LOCAL,
  searchHint: "start a local self-hosted runner process for try-it-out",
  enablesCodeExecution: !0,
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: !0,
  get inputSchema() {
    return Te();
  },
  get outputSchema() {
    return ge();
  },
  isReadOnly() {
    return !1;
  },
  ignoresWholeToolAllowRule() {
    return !0;
  },
  suppressesAlwaysAllowRule() {
    return !0;
  },
  toAutoClassifierInput(e) {
    return `spawn runner: secret=${e.secret_file_path} base_dir=${e.base_dir ?? RUNNER_SETUP_WORKSPACE}`;
  },
  async description() {
    return SPAWN_RUNNER_TOOL_DESCRIPTION;
  },
  async prompt() {
    return SPAWN_RUNNER_TOOL_DESCRIPTION;
  },
  create(e) {
    return {
      async checkPermissions(t) {
        if (e.permissions().mode === "auto")
          return { behavior: "passthrough", message: "Spawning a local runner requires classifier review." };
        return {
          behavior: "ask",
          message: `Start a detached self-hosted runner with the environment secret file ${t.secret_file_path} (base dir ${t.base_dir ?? RUNNER_SETUP_WORKSPACE})? The runner will execute that environment's queued sessions on this machine and will keep running after this session ends.`,
        };
      },
      async call({
        secret_file_path: t,
        capacity: r = 1,
        base_dir: s = RUNNER_SETUP_WORKSPACE,
        health_port: n = DEFAULT_RUNNER_PORT,
        log_path: a = U,
      }) {
        let i = resolve(s),
          c = resolve(a),
          W = resolve(t);
        (await mkdir(i, { recursive: !0 }), await mkdir(dirname(c), { recursive: !0 }));
        let y = buildRunnerSpawnArgs({
            secret_file_path: W,
            capacity: r,
            base_dir: i,
            health_port: n,
            log_path: c,
          }),
          execPath = process.execPath,
          R = isStandaloneExecutable() ? [] : [process.argv[1]],
          f = spawn(execPath, [...R, ...y], {
            detached: !0,
            stdio: "ignore",
            windowsHide: !0,
            env: withLaunchValuesOfHybridConnection(process.env),
          });
        moveKeeperPid(f.pid);
        let promise = await new Promise((L) => {
          (f.once("spawn", () => L(null)), f.once("error", L));
        });
        f.unref();
        let pid = f.pid;
        if (promise || pid === void 0)
          throw Error(
            `Failed to spawn runner${promise ? ` (${promise.message})` : " (no pid)"}. Command: ${[shellQuote(execPath), ...R.map(shellQuote), ...y.map(shellQuote)].join(" ")}`,
          );
        let z = resolve(Se);
        (await mkdir(dirname(z), { recursive: !0 }), await writeFile(z, String(pid)));
        let joined = [shellQuote(execPath), ...R.map(shellQuote), ...y.map(shellQuote)].join(" ");
        return { data: { pid: pid, pid_file: z, log_path: c, health_port: n, command: joined } };
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, t) {
    return toolResultBlock(t, e);
  },
  renderToolUseMessage(e) {
    return describeArgs(e);
  },
});
//@ chunk-3yy90gv7.js:16976-17034 placement
function w(e) {
  return isAllPrintable(e) && !/[\t\n\u2028\u2029]/.test(e);
}
/**
 * 读取 runner 日志尾部（脱敏密钥）。
 */
//@ chunk-3yy90gv7.js:17070-18192 placement
var DEFAULT_LOG_TAIL_BYTES = 65536,
  Re = DoctorLazy(() =>
    zodStrictObject({
      log_path: S().describe("Path to the runner's --log-file."),
      bytes: E()
        .int()
        .positive()
        .optional()
        .describe(`How many trailing bytes to read. Default ${DEFAULT_LOG_TAIL_BYTES}.`),
    }),
  ),
  be = DoctorLazy(() => u({ lines: o(), bytes_read: E(), error: o().optional() })),
  F = buildTool({
    name: SELF_HOSTED_RUNNER_TAIL_LOG,
    searchHint: "tail self-hosted runner log file with secret redaction",
    backgrounding: "never",
    maxResultSizeChars: 200000,
    shouldDefer: !0,
    get inputSchema() {
      return Re();
    },
    get outputSchema() {
      return be();
    },
    isReadOnly() {
      return !0;
    },
    isConcurrencySafe() {
      return !0;
    },
    async description() {
      return RUNNER_LOGS_TOOL_DESCRIPTION;
    },
    async prompt() {
      return RUNNER_LOGS_TOOL_DESCRIPTION;
    },
    getPath(e) {
      return e.log_path;
    },
    create() {
      return {
        async call({ log_path: e, bytes: t = DEFAULT_LOG_TAIL_BYTES }) {
          try {
            let r = await open(e, "r");
            try {
              let { size: size } = await r.stat(),
                max = Math.max(0, size - t),
                a = size - max,
                alloc = Buffer.alloc(a);
              return (
                await r.read(alloc, 0, a, max),
                { data: { lines: redactSecretsInText(alloc.toString("utf8")), bytes_read: a } }
              );
            } finally {
              await r.close();
            }
          } catch (error) {
            return { data: { lines: "", bytes_read: 0, error: errorMessage(error) } };
          }
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, t) {
      return {
        tool_use_id: t,
        type: "tool_result",
        content: e.error
          ? `error: ${e.error}`
          : `(last ${e.bytes_read} bytes, redacted)
${e.lines}`,
      };
    },
    renderToolUseMessage(e) {
      return describeArgs(e);
    },
  });
//@ chunk-3yy90gv7.js:18192-18219 placement
var Vt = [C, D, P, k, SPAWN_LOCAL_RUNNER_TOOL, x, READ_RUNNER_METRICS_TOOL, F, j];
