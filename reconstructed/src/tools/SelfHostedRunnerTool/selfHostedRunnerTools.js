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
import {
  stringSchema,
  zodStrictObject,
  objectSchema,
  record,
  unknown,
  array,
  numberSchema,
  booleanSchema,
  union,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { hasUnsafePathGlyphsOrSurrogate } from "../../utils/unsafePathGlyphs.js";
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
/**
 * 带标签 id 不可读（含控制/不可见字符）时的说明文本。
 */
var TAGGED_ID_UNREADABLE_RULE =
  "it holds a character that the operator could not read as written, such as a control, invisible or direction-changing character, a line break, or a space other than the plain one. If it is a stray character, as from a paste, pass the value without it. If it is part of a real path, do not drop or replace it, which would name another file: where it lies in the path of the working directory itself, pass the path relative to that directory, as in ./runner-setup/runner.log; otherwise ask the operator to rename or move the file; if you cannot tell which, ask the operator";
var TAGGED_ID_RULE_TEXT =
  'an id holds only the letters A to Z and a to z, digits, "_" and "-", between 1 and 256 of them. Pass the id alone, as the server or the operator gave it, without quotes, spaces or other text around it';
var TAGGED_ID_READABLE_RE = /^[a-zA-Z0-9_-]{1,256}$/;
//@ chunk-3yy90gv7.js:5748-5795 placement
/**
 * 不含控制字符的路径或字符串 schema（状态过滤、日志路径等）。
 */
function pathLikeStringSchema() {
  return stringSchema().refine((value) => !hasUnsafePathGlyphsOrSurrogate(value), TAGGED_ID_UNREADABLE_RULE);
}
//@ chunk-3yy90gv7.js:5795-5844 placement
/**
 * 带标签 id（ccpool_…）的字符串 schema。
 */
function taggedIdSchema() {
  return stringSchema().refine((value) => TAGGED_ID_READABLE_RE.test(value), TAGGED_ID_RULE_TEXT);
}
//@ chunk-3yy90gv7.js:5844-6728 placement
/**
 * 环境聚合结果的 schema（pool 与等价说明）。
 */
var EnvironmentSummaryInputSchema = DoctorLazy(() =>
  zodStrictObject({
    pool_id: taggedIdSchema().describe("Tagged environment id (ccpool_\u2026)."),
  }),
);
var environmentSummaryOutputSchema = DoctorLazy(() =>
  objectSchema({
    pool: record(stringSchema(), unknown()),
    equivalent: objectSchema({
      ui: stringSchema(),
    }),
  }),
);
var EnvironmentSummaryTool = buildTool({
  name: SELF_HOSTED_RUNNER_GET_POOL,
  searchHint: "read self-hosted environment aggregates and queue counts",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
  get inputSchema() {
    return EnvironmentSummaryInputSchema();
  },
  get outputSchema() {
    return environmentSummaryOutputSchema();
  },
  isReadOnly() {
    return true;
  },
  isConcurrencySafe() {
    return true;
  },
  async description() {
    return ENV_STATE_TOOL_DESCRIPTION;
  },
  async prompt() {
    return ENV_STATE_TOOL_DESCRIPTION;
  },
  create(toolContext) {
    return {
      async call({ pool_id: poolId }, callOptions) {
        let requestPath = `/v1/code/runners/self-hosted/pools/${encodeURIComponent(poolId)}`;
        let response = await runnerApiRequest(
          "GET",
          requestPath,
          undefined,
          callOptions.signal,
          toolContext.credentials,
        );
        return {
          data: {
            pool: response.pool ?? response,
            equivalent: withUi(
              "Admin settings \u2192 Cloud environments \u2192 Self-hosted environments \u2192 (environment) \u2014 header stat tiles",
            ),
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return toolResultBlock(toolUseId, result);
  },
  renderToolUseMessage(input) {
    return describeArgs(input);
  },
});
//@ chunk-3yy90gv7.js:6728-7805 placement
/**
 * 环境会话列表结果的 schema。
 */
var ListEnvironmentSessionsInputSchema = DoctorLazy(() =>
  zodStrictObject({
    pool_id: taggedIdSchema().describe("Tagged environment id (ccpool_\u2026)."),
    status_filter: pathLikeStringSchema()
      .optional()
      .describe('Optional server-side status filter (e.g. "queued").'),
  }),
);
var environmentSessionsOutputSchema = DoctorLazy(() =>
  objectSchema({
    sessions: array(record(stringSchema(), unknown())),
    equivalent: objectSchema({
      ui: stringSchema(),
    }),
  }),
);
var ListEnvironmentSessionsTool = buildTool({
  name: SELF_HOSTED_RUNNER_LIST_SESSIONS,
  searchHint: "list queued/assigned sessions in a self-hosted environment",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
  get inputSchema() {
    return ListEnvironmentSessionsInputSchema();
  },
  get outputSchema() {
    return environmentSessionsOutputSchema();
  },
  isReadOnly() {
    return true;
  },
  isConcurrencySafe() {
    return true;
  },
  async description() {
    return LIST_SESSIONS_TOOL_DESCRIPTION;
  },
  async prompt() {
    return LIST_SESSIONS_TOOL_DESCRIPTION;
  },
  create(toolContext) {
    return {
      async call({ pool_id: poolId, status_filter: statusFilter }, callOptions) {
        let statusQuery = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
        let requestPath = `/v1/code/runners/self-hosted/pools/${encodeURIComponent(poolId)}/sessions${statusQuery}`;
        return {
          data: {
            sessions:
              (
                await runnerApiRequest(
                  "GET",
                  requestPath,
                  undefined,
                  callOptions.signal,
                  toolContext.credentials,
                )
              ).sessions ?? [],
            equivalent: withUi(
              "Admin settings \u2192 Cloud environments \u2192 Self-hosted environments \u2192 (environment) \u2192 Activity tab \u2192 Sessions",
            ),
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return toolResultBlock(toolUseId, result);
  },
  renderToolUseMessage(input) {
    return describeArgs(input);
  },
});
//@ chunk-3yy90gv7.js:7805-8722 placement
/**
 * runner 列表结果的 schema。
 */
var ListRunnersInputSchema = DoctorLazy(() =>
  zodStrictObject({
    pool_id: taggedIdSchema().describe("Tagged environment id (ccpool_\u2026)."),
  }),
);
var runnersOutputSchema = DoctorLazy(() =>
  objectSchema({
    runners: array(record(stringSchema(), unknown())),
    equivalent: objectSchema({
      ui: stringSchema(),
    }),
  }),
);
var ListRunnersTool = buildTool({
  name: SELF_HOSTED_RUNNER_LIST_RUNNERS,
  searchHint: "list registered self-hosted runners for an environment",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
  get inputSchema() {
    return ListRunnersInputSchema();
  },
  get outputSchema() {
    return runnersOutputSchema();
  },
  isReadOnly() {
    return true;
  },
  isConcurrencySafe() {
    return true;
  },
  async description() {
    return LIST_RUNNERS_TOOL_DESCRIPTION;
  },
  async prompt() {
    return LIST_RUNNERS_TOOL_DESCRIPTION;
  },
  create(toolContext) {
    return {
      async call({ pool_id: poolId }, callOptions) {
        let requestPath = `/v1/code/runners/self-hosted/runners?pool_id=${encodeURIComponent(poolId)}`;
        return {
          data: {
            runners:
              (
                await runnerApiRequest(
                  "GET",
                  requestPath,
                  undefined,
                  callOptions.signal,
                  toolContext.credentials,
                )
              ).runners ?? [],
            equivalent: withUi(
              "Admin settings \u2192 Cloud environments \u2192 Self-hosted environments \u2192 (environment) \u2192 Activity tab \u2192 Runners",
            ),
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return toolResultBlock(toolUseId, result);
  },
  renderToolUseMessage(input) {
    return describeArgs(input);
  },
});
//@ chunk-3yy90gv7.js:8722-9649 placement
/**
 * 环境密钥列表结果的 schema。
 */
var ListEnvironmentSecretsInputSchema = DoctorLazy(() =>
  zodStrictObject({
    pool_id: taggedIdSchema().describe("Tagged environment id (ccpool_\u2026)."),
  }),
);
var secretsOutputSchema = DoctorLazy(() =>
  objectSchema({
    secrets: array(record(stringSchema(), unknown())),
    equivalent: objectSchema({
      ui: stringSchema(),
    }),
  }),
);
var ListEnvironmentSecretsTool = buildTool({
  name: SELF_HOSTED_RUNNER_LIST_SECRETS,
  searchHint: "list self-hosted environment secrets (metadata only)",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
  get inputSchema() {
    return ListEnvironmentSecretsInputSchema();
  },
  get outputSchema() {
    return secretsOutputSchema();
  },
  isReadOnly() {
    return true;
  },
  isConcurrencySafe() {
    return true;
  },
  async description() {
    return LIST_SECRETS_TOOL_DESCRIPTION;
  },
  async prompt() {
    return LIST_SECRETS_TOOL_DESCRIPTION;
  },
  create(toolContext) {
    return {
      async call({ pool_id: poolId }, callOptions) {
        let requestPath = `/v1/code/runners/self-hosted/pools/${encodeURIComponent(poolId)}/secrets`;
        return {
          data: {
            secrets:
              (
                await runnerApiRequest(
                  "GET",
                  requestPath,
                  undefined,
                  callOptions.signal,
                  toolContext.credentials,
                )
              ).secrets ?? [],
            equivalent: withUi(
              "Admin settings \u2192 Cloud environments \u2192 Self-hosted environments \u2192 (environment) \u2192 Configuration tab \u2192 Environment keys",
            ),
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return toolResultBlock(toolUseId, result);
  },
  renderToolUseMessage(input) {
    return describeArgs(input);
  },
});
//@ chunk-3yy90gv7.js:9649-10529 placement
/**
 * runner 健康探测结果的 schema。
 */
var ProbeRunnerHealthInputSchema = DoctorLazy(() =>
  zodStrictObject({
    health_port: numberSchema()
      .int()
      .optional()
      .describe(`Default ${DEFAULT_RUNNER_PORT}. 0 means disabled.`),
  }),
);
var probeHealthOutputSchema = DoctorLazy(() =>
  objectSchema({
    health: record(stringSchema(), unknown()).optional(),
    disabled: booleanSchema().optional(),
    unreachable: booleanSchema().optional(),
    error: stringSchema().optional(),
  }),
);
var ProbeRunnerHealthTool = buildTool({
  name: SELF_HOSTED_RUNNER_READ_HEALTH,
  searchHint: "probe local self-hosted runner /healthz endpoint",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
  get inputSchema() {
    return ProbeRunnerHealthInputSchema();
  },
  get outputSchema() {
    return probeHealthOutputSchema();
  },
  isReadOnly() {
    return true;
  },
  isConcurrencySafe() {
    return true;
  },
  async description() {
    return RUNNER_HEALTH_TOOL_DESCRIPTION;
  },
  async prompt() {
    return RUNNER_HEALTH_TOOL_DESCRIPTION;
  },
  create() {
    return {
      async call({ health_port: healthPort = DEFAULT_RUNNER_PORT }) {
        if (healthPort === 0)
          return {
            data: {
              disabled: true,
            },
          };
        try {
          return {
            data: {
              health: (
                await externalHttp.get(`http://127.0.0.1:${healthPort}/healthz`, {
                  timeout: 2000,
                  validateStatus: () => true,
                })
              ).data,
            },
          };
        } catch (error) {
          return {
            data: {
              unreachable: true,
              error: errorMessage(error),
            },
          };
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return toolResultBlock(toolUseId, result);
  },
  renderToolUseMessage(input) {
    return describeArgs(input);
  },
});
//@ chunk-3yy90gv7.js:10529-10810 placement
/**
 * 读取 runner 指标的输入 schema。
 */
var RUNNER_METRIC_PREFIX = "claude_code_self_hosted_runner_";
var runnerMetricsInputSchema = DoctorLazy(() =>
  zodStrictObject({
    health_port: numberSchema()
      .int()
      .optional()
      .describe(`Default ${DEFAULT_RUNNER_PORT}. 0 means disabled.`),
  }),
);
var runnerMetricsOutputSchema = DoctorLazy(() =>
  objectSchema({
    gauges: record(stringSchema(), union([numberSchema(), stringSchema()])).optional(),
    raw: stringSchema().optional(),
    disabled: booleanSchema().optional(),
    unreachable: booleanSchema().optional(),
    error: stringSchema().optional(),
  }),
);
//@ chunk-3yy90gv7.js:10810-11283 placement
function parseRunnerMetrics(metricsText) {
  let gauges = {};
  for (let line of metricsText.split(`
`)) {
    if (line.startsWith("#") || !line.startsWith(RUNNER_METRIC_PREFIX)) continue;
    let match = line.match(/^(\S+?)(\{[^}]*\})?\s+(\S+)\s*$/);
    if (!match) continue;
    let sliced = match[1].slice(RUNNER_METRIC_PREFIX.length);
    if (sliced.endsWith("_bucket") || sliced === "session_idle_seconds" || sliced === "poll_errors_total")
      continue;
    let labelText = match[2] ?? "";
    let metricValue = Number(match[3]);
    if (sliced === "locked_account") {
      let lockedEmail = labelText.match(/email="([^"]*)"/)?.[1];
      if (lockedEmail) gauges.locked_account_email = lockedEmail;
    }
    if (!Number.isNaN(metricValue)) {
      let existingValue = gauges[sliced];
      gauges[sliced] = typeof existingValue === "number" ? existingValue + metricValue : metricValue;
    }
  }
  return gauges;
}
//@ chunk-3yy90gv7.js:11283-12009 placement
var READ_RUNNER_METRICS_TOOL = buildTool({
  name: SELF_HOSTED_RUNNER_READ_METRICS,
  searchHint: "read self-hosted runner Prometheus gauges from /metrics",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
  get inputSchema() {
    return runnerMetricsInputSchema();
  },
  get outputSchema() {
    return runnerMetricsOutputSchema();
  },
  isReadOnly() {
    return true;
  },
  isConcurrencySafe() {
    return true;
  },
  async description() {
    return RUNNER_METRICS_TOOL_DESCRIPTION;
  },
  async prompt() {
    return RUNNER_METRICS_TOOL_DESCRIPTION;
  },
  create() {
    return {
      async call({ health_port: healthPort = DEFAULT_RUNNER_PORT }) {
        if (healthPort === 0)
          return {
            data: {
              disabled: true,
            },
          };
        try {
          let response = await externalHttp.get(`http://127.0.0.1:${healthPort}/metrics`, {
            timeout: 2000,
            responseType: "text",
            validateStatus: () => true,
          });
          let metricsText = redactSecretsInText(String(response.data));
          return {
            data: {
              gauges: parseRunnerMetrics(metricsText),
              raw: metricsText,
            },
          };
        } catch (error) {
          return {
            data: {
              unreachable: true,
              error: errorMessage(error),
            },
          };
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return toolResultBlock(toolUseId, result);
  },
  renderToolUseMessage(input) {
    return describeArgs(input);
  },
});
//@ chunk-3yy90gv7.js:12009-13830 placement
/**
 * 重新排队会话的结果 schema。
 */
var RequeueSessionInputSchema = DoctorLazy(() =>
  zodStrictObject({
    session_id: taggedIdSchema().describe("Tagged session id (ccsess_\u2026)."),
    runner_id: taggedIdSchema().describe(
      "Tagged runner id (ccrunner_\u2026) the caller observed failing. Server verifies this still matches the session assignment; mismatch returns Conflict. For a stuck session with no runner assigned, pass any runner id of this environment, such as one of the excluded_runner_ids of the session; the server does not compare it.",
    ),
  }),
);
var requeueSessionOutputSchema = DoctorLazy(() =>
  objectSchema({
    excluded_count: numberSchema().optional(),
    equivalent: objectSchema({
      ui: stringSchema(),
    }),
  }),
);
var RequeueSessionTool = buildTool({
  name: SELF_HOSTED_RUNNER_REQUEUE_SESSION,
  searchHint: "requeue a stuck self-hosted runner session onto another runner",
  enablesCodeExecution: true,
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
  get inputSchema() {
    return RequeueSessionInputSchema();
  },
  get outputSchema() {
    return requeueSessionOutputSchema();
  },
  isReadOnly() {
    return false;
  },
  ignoresWholeToolAllowRule() {
    return true;
  },
  suppressesAlwaysAllowRule() {
    return true;
  },
  toAutoClassifierInput(input) {
    return `requeue session=${input.session_id} off runner=${input.runner_id}`;
  },
  async description() {
    return REQUEUE_SESSION_TOOL_DESCRIPTION;
  },
  async prompt() {
    return REQUEUE_SESSION_TOOL_DESCRIPTION;
  },
  create(toolContext) {
    return {
      async checkPermissions(input) {
        if (toolContext.permissions().mode === "auto")
          return {
            behavior: "passthrough",
            message: "Requeueing a runner session requires classifier review.",
          };
        return {
          behavior: "ask",
          message: `Requeue session ${input.session_id} off runner ${input.runner_id}? This re-launches the session on another runner in the environment.`,
        };
      },
      async call({ session_id: sessionId, runner_id: runnerId }, callOptions) {
        let requestPath = `/v1/code/runners/self-hosted/sessions/${encodeURIComponent(sessionId)}/requeue`;
        return {
          data: {
            excluded_count: (
              await runnerApiRequest(
                "POST",
                requestPath,
                {
                  runner_id: runnerId,
                },
                callOptions.signal,
                toolContext.credentials,
              )
            ).excluded_count,
            equivalent: withUi(
              "Admin settings \u2192 Cloud environments \u2192 Self-hosted environments \u2192 (environment) \u2192 Activity tab \u2192 Sessions \u2192 (session) \u2192 Retry",
            ),
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return toolResultBlock(toolUseId, result);
  },
  renderToolUseMessage(input) {
    return describeArgs(input);
  },
});
//@ chunk-3yy90gv7.js:13965-14819 placement
/**
 * 本地 runner 的默认日志路径。
 */
var RUNNER_SETUP_WORKSPACE = "./runner-setup/workspace";
var DEFAULT_RUNNER_LOG_PATH = "./runner-setup/runner.log";
var DEFAULT_RUNNER_PID_PATH = "./runner-setup/runner.pid";
var PATH_CONTROL_CHAR_REASON =
  "the path holds a control character, a tab or a line break, so the operator could not read it as written; use a path without such characters, or ask the operator to rename or move the file";
var secretFileInputSchema = DoctorLazy(() =>
  zodStrictObject({
    secret_file_path: stringSchema()
      .refine(isPrintablePathLike, PATH_CONTROL_CHAR_REASON)
      .describe("Path to the environment secret the operator saved from the Admin UI."),
    capacity: numberSchema().int().positive().optional().describe("Default 1."),
    base_dir: stringSchema()
      .refine(isPrintablePathLike, PATH_CONTROL_CHAR_REASON)
      .optional()
      .describe(
        `Always passed to the runner (its built-in default of /workspace is unwritable on laptops). Default: ${RUNNER_SETUP_WORKSPACE}`,
      ),
    health_port: numberSchema()
      .int()
      .optional()
      .describe(`Default ${DEFAULT_RUNNER_PORT}. 0 disables /healthz.`),
    log_path: stringSchema()
      .refine(isPrintablePathLike, PATH_CONTROL_CHAR_REASON)
      .optional()
      .describe(`Default: ${DEFAULT_RUNNER_LOG_PATH}`),
  }),
);
var spawnLocalRunnerOutputSchema = DoctorLazy(() =>
  objectSchema({
    pid: numberSchema(),
    pid_file: stringSchema(),
    log_path: stringSchema(),
    health_port: numberSchema(),
    command: stringSchema(),
  }),
);
//@ chunk-3yy90gv7.js:14819-15046 placement
function buildRunnerSpawnArgs(input) {
  return [
    "self-hosted-runner",
    "--environment-secret-file",
    input.secret_file_path,
    "--capacity",
    String(input.capacity),
    "--base-dir",
    input.base_dir,
    "--api-url",
    runnerApiBaseUrl(),
    "--health-port",
    String(input.health_port),
    "--log-file",
    input.log_path,
  ];
}
//@ chunk-3yy90gv7.js:15046-15126 placement = shellQuote (1)
/**
 * （误归 deepLink）POSIX shell 单引号转义（安全字符不加引号）。
 */
function shellQuote(s) {
  return /^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`;
}
//@ chunk-3yy90gv7.js:15126-16976 placement
/**
 * 启动本地 runner 试运行（需分类器审核）。
 */
var SPAWN_LOCAL_RUNNER_TOOL = buildTool({
  name: SELF_HOSTED_RUNNER_SPAWN_LOCAL,
  searchHint: "start a local self-hosted runner process for try-it-out",
  enablesCodeExecution: true,
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
  get inputSchema() {
    return secretFileInputSchema();
  },
  get outputSchema() {
    return spawnLocalRunnerOutputSchema();
  },
  isReadOnly() {
    return false;
  },
  ignoresWholeToolAllowRule() {
    return true;
  },
  suppressesAlwaysAllowRule() {
    return true;
  },
  toAutoClassifierInput(input) {
    return `spawn runner: secret=${input.secret_file_path} base_dir=${input.base_dir ?? RUNNER_SETUP_WORKSPACE}`;
  },
  async description() {
    return SPAWN_RUNNER_TOOL_DESCRIPTION;
  },
  async prompt() {
    return SPAWN_RUNNER_TOOL_DESCRIPTION;
  },
  create(toolContext) {
    return {
      async checkPermissions(input) {
        if (toolContext.permissions().mode === "auto")
          return {
            behavior: "passthrough",
            message: "Spawning a local runner requires classifier review.",
          };
        return {
          behavior: "ask",
          message: `Start a detached self-hosted runner with the environment secret file ${input.secret_file_path} (base dir ${input.base_dir ?? RUNNER_SETUP_WORKSPACE})? The runner will execute that environment's queued sessions on this machine and will keep running after this session ends.`,
        };
      },
      async call({
        secret_file_path: secretFilePath,
        capacity = 1,
        base_dir: baseDir = RUNNER_SETUP_WORKSPACE,
        health_port: healthPort = DEFAULT_RUNNER_PORT,
        log_path: logPath = DEFAULT_RUNNER_LOG_PATH,
      }) {
        let baseDirPath = resolve(baseDir);
        let logFilePath = resolve(logPath);
        let secretFilePath_2 = resolve(secretFilePath);
        await mkdir(baseDirPath, {
          recursive: true,
        });
        await mkdir(dirname(logFilePath), {
          recursive: true,
        });
        let runnerSpawnArgs = buildRunnerSpawnArgs({
          secret_file_path: secretFilePath_2,
          capacity,
          base_dir: baseDirPath,
          health_port: healthPort,
          log_path: logFilePath,
        });
        let execPath = process.execPath;
        let nodeArgs = isStandaloneExecutable() ? [] : [process.argv[1]];
        let child = spawn(execPath, [...nodeArgs, ...runnerSpawnArgs], {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
          env: withLaunchValuesOfHybridConnection(process.env),
        });
        moveKeeperPid(child.pid);
        let promise = await new Promise((resolve) => {
          child.once("spawn", () => resolve(null));
          child.once("error", resolve);
        });
        child.unref();
        let pid = child.pid;
        if (promise || pid === undefined)
          throw Error(
            `Failed to spawn runner${promise ? ` (${promise.message})` : " (no pid)"}. Command: ${[shellQuote(execPath), ...nodeArgs.map(shellQuote), ...runnerSpawnArgs.map(shellQuote)].join(" ")}`,
          );
        let pidPath = resolve(DEFAULT_RUNNER_PID_PATH);
        await mkdir(dirname(pidPath), {
          recursive: true,
        });
        await writeFile(pidPath, String(pid));
        let command = [
          shellQuote(execPath),
          ...nodeArgs.map(shellQuote),
          ...runnerSpawnArgs.map(shellQuote),
        ].join(" ");
        return {
          data: {
            pid,
            pid_file: pidPath,
            log_path: logFilePath,
            health_port: healthPort,
            command,
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return toolResultBlock(toolUseId, result);
  },
  renderToolUseMessage(input) {
    return describeArgs(input);
  },
});
//@ chunk-3yy90gv7.js:16976-17034 placement
/**
 * 判断值可打印且不含制表符与换行（路径字段校验）。
 */
function isPrintablePathLike(value) {
  return isAllPrintable(value) && !/[\t\n\u2028\u2029]/.test(value);
}
//@ chunk-3yy90gv7.js:17070-18192 placement
/**
 * 读取 runner 日志的输入 schema（日志路径与字节数）。
 */
var DEFAULT_LOG_TAIL_BYTES = 65536;
var readRunnerLogInputSchema = DoctorLazy(() =>
  zodStrictObject({
    log_path: pathLikeStringSchema().describe("Path to the runner's --log-file."),
    bytes: numberSchema()
      .int()
      .positive()
      .optional()
      .describe(`How many trailing bytes to read. Default ${DEFAULT_LOG_TAIL_BYTES}.`),
  }),
);
var readRunnerLogOutputSchema = DoctorLazy(() =>
  objectSchema({
    lines: stringSchema(),
    bytes_read: numberSchema(),
    error: stringSchema().optional(),
  }),
);
var ReadRunnerLogTool = buildTool({
  name: SELF_HOSTED_RUNNER_TAIL_LOG,
  searchHint: "tail self-hosted runner log file with secret redaction",
  backgrounding: "never",
  maxResultSizeChars: 200000,
  shouldDefer: true,
  get inputSchema() {
    return readRunnerLogInputSchema();
  },
  get outputSchema() {
    return readRunnerLogOutputSchema();
  },
  isReadOnly() {
    return true;
  },
  isConcurrencySafe() {
    return true;
  },
  async description() {
    return RUNNER_LOGS_TOOL_DESCRIPTION;
  },
  async prompt() {
    return RUNNER_LOGS_TOOL_DESCRIPTION;
  },
  getPath(input) {
    return input.log_path;
  },
  create() {
    return {
      async call({ log_path: logPath, bytes = DEFAULT_LOG_TAIL_BYTES }) {
        try {
          let handle = await open(logPath, "r");
          try {
            let { size } = await handle.stat();
            let max = Math.max(0, size - bytes);
            let readLength = size - max;
            let buffer = Buffer.alloc(readLength);
            await handle.read(buffer, 0, readLength, max);
            return {
              data: {
                lines: redactSecretsInText(buffer.toString("utf8")),
                bytes_read: readLength,
              },
            };
          } finally {
            await handle.close();
          }
        } catch (error) {
          return {
            data: {
              lines: "",
              bytes_read: 0,
              error: errorMessage(error),
            },
          };
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: result.error
        ? `error: ${result.error}`
        : `(last ${result.bytes_read} bytes, redacted)
${result.lines}`,
    };
  },
  renderToolUseMessage(input) {
    return describeArgs(input);
  },
});
//@ chunk-3yy90gv7.js:18192-18219 placement
/**
 * 自托管 runner 相关的全部工具列表。
 */
var SELF_HOSTED_RUNNER_TOOLS = [
  EnvironmentSummaryTool,
  ListRunnersTool,
  ListEnvironmentSessionsTool,
  ListEnvironmentSecretsTool,
  SPAWN_LOCAL_RUNNER_TOOL,
  ProbeRunnerHealthTool,
  READ_RUNNER_METRICS_TOOL,
  ReadRunnerLogTool,
  RequeueSessionTool,
];
export { SELF_HOSTED_RUNNER_TOOLS };
