/**
 * tools/AgentTool/agentInputSchema.ts
 *
 * 2.1.316 新增：AgentTool 的错误类与输入模式（subagent_type、model、effort、name、isolation、cwd 等字段说明）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0m7em5b4.js (1), chunk-0tkmvwy0.js (7)
 * attribution: placement 8
 */
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, U, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { rhi, nhi, ohi, shi } from "./constants.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { env } from "../../utils/env.js";
import { EFFORT_LEVELS, getEffortEnvOverride } from "../../utils/effort.js";
import { isForkSubagentEnabled, forkGateForcesBackground } from "./forkSubagent.js";
import { TEAMMATE_NAME_PATTERN } from "../../utils/swarm/constants.js";
import { MAIN } from "../../utils/sessionPeers.js";
import { LD } from "../../utils/sessionAddresses.js";
import { permissionModeSchema } from "../../utils/permissions/browserToolNames.js";
import { isBackgroundAgentLaunchDisabled, VTn } from "./backgroundGates.js";
import { D0e } from "../../tasks/backgroundLaunchRules.js";
import { fYs, isRelativeEffortDisabled } from "./agentEffort.js";
import { parseAgentIdArg } from "../ObserverReportTool/ObserverReportTool.js";
import { hasUntouchableRecordSpellingStrictAsync } from "../../utils/fsOperations.js";

/**
 * AgentTypeError：subagent_type 不存在、歧义、被 deny 规则拒绝或插件代理加载失败。
 */
//@ chunk-0tkmvwy0.js:11923-11998 placement
class AgentTypeError extends Error {
  constructor(n) {
    super(n);
    this.name = "AgentTypeError";
  }
}
/**
 * RemoteAgentPreconditionError：isolation:"remote" 云端代理不可用（未登录、不合格、受限配置）。
 */
//@ chunk-0tkmvwy0.js:11998-12087 placement
class RemoteAgentPreconditionError extends Error {
  constructor(n) {
    super(n);
    this.name = "RemoteAgentPreconditionError";
  }
}
/**
 * 受 CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG 限制时禁止 isolation:"remote" 的错误文本。
 */
//@ chunk-0tkmvwy0.js:12087-12309 placement
var REMOTE_AGENT_RESTRICTED_CONFIG_ERROR =
  'Cannot launch cloud agent: this session limits what your own Claude Code files can do (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG), and a cloud session would not apply those limits. Set isolation to "worktree" instead.';
/**
 * AgentPreconditionError：启动子代理的前置条件不满足（深度/并发/预算/队友限制等），错误文本直接回给模型。
 */
//@ chunk-0tkmvwy0.js:12309-12391 placement
class AgentPreconditionError extends Error {
  constructor(n) {
    super(n);
    this.name = "AgentPreconditionError";
  }
}
/**
 * 校验 cwd 参数（或 agent.spawn 钩子设置的 cwd）是否允许，不允许抛 AgentPreconditionError。
 */
//@ chunk-0tkmvwy0.js:12391-12651 placement
async function assertAgentCwdAllowed(cwd, origin) {
  let s = await validateAgentCwd(cwd);
  if (s !== void 0)
    throw (
      logFeatureBad("subagent_launch", "subagent_cwd_refused"),
      new AgentPreconditionError(
        origin === "the call"
          ? `Cannot run the agent in another directory: ${s}. Start it without cwd.`
          : `A plugin's agent.spawn hook set cwd on this spawn: ${s}.`,
      )
    );
}
/**
 * 2000：同步子代理启动 2 秒后发 background_hint 进度（提示可转后台）；Go/xo/Qn/qo 为输入 schema 各层：base（description/prompt/subagent_type/model/effort/run_in_background）→ 加 name/team_name/mode/isolation/cwd → 去掉 cwd 并按开关裁剪 → 允许相对 effort（lower/higher）。
 */
//@ chunk-0tkmvwy0.js:12651-16660 placement
var BACKGROUND_HINT_DELAY_MS = 2000,
  baseAgentInputSchema = DoctorLazy(() =>
    u({
      description: o().describe(rhi),
      prompt: o().describe(nhi),
      subagent_type: o().optional().describe("The type of specialized agent to use for this task"),
      model: U(ohi)
        .optional()
        .describe(
          `Optional model override for this agent. Takes precedence over the agent definition's model frontmatter and the configured default subagent model. If omitted, uses the agent definition's model, else the default (inherits from the parent unless a default subagent model is configured). Ignored for subagent_type: "fork" \u2014 forks always inherit the parent model.` +
            (isCoordinatorMode_2()
              ? env.CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL
                ? " Unavailable on this session: this parameter is ignored \u2014 do not set it."
                : " Set this only when EXPLICITLY asked by the user for a specific model, never because the task seems small, simple, or cheap; otherwise omit it so the worker uses the default (the session model, unless a default subagent model is configured)."
              : ""),
        ),
      effort: U(EFFORT_LEVELS)
        .optional()
        .describe(
          "Reasoning effort for this agent. Set this ONLY when the user, or instructions such as CLAUDE.md or a skill, explicitly ask that this agent or delegated work run at a specific effort level, never on your own judgment; otherwise omit it and the agent runs at its usual effort." +
            (isForkSubagentEnabled()
              ? ' Ignored for subagent_type: "fork": a fork runs at your own effort.'
              : ""),
        ),
      run_in_background: M()
        .optional()
        .describe(
          "Agents run in the background by default; you will be notified when one completes. Set to false only when your very next action depends on this agent's result and nothing else could usefully happen while it runs \u2014 otherwise leave it in the background so the user can hand you other work.",
        ),
    }),
  ),
  fullAgentInputSchema = DoctorLazy(() => {
    let n = u({
      name: o()
        .regex(TEAMMATE_NAME_PATTERN, {
          message:
            "name must start with a letter or digit and contain only letters, digits, underscores, or hyphens (max 64 chars)",
        })
        .refine((e) => e !== MAIN, {
          message: `"${MAIN}" is reserved \u2014 SendMessage routes it to the main conversation`,
        })
        .refine((e) => !LD(e), {
          message:
            'name must not be a reserved name ("main", "team-lead", "user" or ' +
            '"system", in any spelling) or have the shape of an agent id \u2014 ' +
            "those already address an agent directly",
        })
        .optional()
        .describe(shi),
      team_name: o().optional().describe("Deprecated; ignored. The session has a single implicit team."),
      mode: permissionModeSchema()
        .optional()
        .describe(
          "Deprecated; ignored. Subagents inherit the parent session's permission mode; agent-definition frontmatter may override it.",
        ),
    });
    return baseAgentInputSchema()
      .merge(n)
      .extend({
        isolation: U(["worktree", "remote"])
          .optional()
          .describe(
            'Isolation mode. "worktree" creates a temporary git worktree so the agent works on an isolated copy of the repo. "remote" launches the agent in a remote cloud environment (always runs in background; availability is gated).',
          ),
        cwd: o()
          .optional()
          .describe(
            'Absolute path to run the agent in. Overrides the working directory for all filesystem and shell operations within this agent. Mutually exclusive with isolation: "worktree".',
          ),
      });
  }),
  agentInputSchema = DoctorLazy(() => {
    let omit = fullAgentInputSchema().omit({ cwd: !0 }),
      e = isBackgroundAgentLaunchDisabled() || forkGateForcesBackground(),
      s = e || VTn() ? void 0 : D0e()?.parameterDescription,
      f = e
        ? omit.omit({ run_in_background: !0 })
        : s === void 0
          ? omit
          : omit.extend({ run_in_background: M().optional().describe(s) }),
      y = env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE ? f.omit({ model: !0 }) : f;
    return getEffortEnvOverride() !== void 0 ? y.omit({ effort: !0 }) : y;
  }),
  agentInputSchemaWithRelativeEffort = DoctorLazy(() =>
    agentInputSchema().extend({
      effort: U([...fYs, ...EFFORT_LEVELS])
        .optional()
        .describe(
          'Reasoning effort for this agent. "lower" or "higher" is one step from the effort the agent would otherwise run at (normally yours), on whatever model it would otherwise use. Pass "lower" when the brief is mechanical and checkable against itself \u2014 bounded search, grep-and-report, a pattern you spelled out. Pass "higher" when one well-specified piece needs more reasoning than the work around it. Omit when neither clearly applies. Name a level (' +
            EFFORT_LEVELS.join(", ") +
            ') ONLY when the user, or instructions such as CLAUDE.md or a skill, explicitly ask for that level. "lower" and "higher" are ignored for subagent_type: "fork", isolation: "remote", and teammates.',
        ),
    }),
  );
/**
 * 返回 Agent 当前输入 schema：tengu_snappy_pelican（或 CLAUDE_CODE_SNAPPY_PELICAN）开启且无模型强制时用含相对 effort 的版本，否则用常规版本。
 */
//@ chunk-0tkmvwy0.js:16660-16698 placement
function getAgentInputSchema() {
  return isRelativeEffortDisabled() ? agentInputSchemaWithRelativeEffort() : agentInputSchema();
}
/**
 * 校验观察者报告的 cwd/代理参数：须为本地路径、无 ..、每段可检查。
 */
//@ chunk-0m7em5b4.js:3624-3783 placement
async function validateAgentCwd(e) {
  return (
    parseAgentIdArg(e) ??
    (typeof e === "string" && (await hasUntouchableRecordSpellingStrictAsync(e))
      ? 'cwd must be a local path with no ".." in it, whose every part can be examined'
      : void 0)
  );
}

export {
  assertAgentCwdAllowed,
  AgentPreconditionError,
  AgentTypeError,
  RemoteAgentPreconditionError,
  REMOTE_AGENT_RESTRICTED_CONFIG_ERROR,
  BACKGROUND_HINT_DELAY_MS,
  getAgentInputSchema,
};
