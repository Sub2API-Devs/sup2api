/**
 * utils/settings/types.ts
 *
 * settings.json 的完整 zod schema（约 187 个顶层键）、权限/沙箱/MCP 白名单子 schema、托管设置的宽容解析。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/types.ts
 * pieces: chunk-5nte8cwj.js (1), chunk-dcmhvw5a.js (67)
 * attribution: fingerprint 8, placement 1, layout 59
 */
import { win32, posix } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  record,
  stringSchema,
  objectSchema,
  array,
  preprocess,
  _enum,
  booleanSchema,
  union,
  numberSchema,
  literal,
  unknown,
  undefinedSchema,
  ZodCatch,
  nullSchema,
  ZodOptional,
  ZodPipe,
  ZodObject,
  ZodType,
  custom,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { coerceString } from "../../../vendor/zod/v4/classic/compat.js";
import { allowPermissionRuleSchema, permissionRuleSchema } from "./permissionValidation.js";
import { normalizePermissionModeAlias, EXTERNAL_PERMISSION_MODES } from "../../types/permissions.js";
import {
  buildPermissionModesForGroups,
  enabledSettingsFeatureGroups,
  SPELLCHECK_PROGRAMS,
  buildSettingsShapeForGroups,
  coerceBooleanString,
} from "../spellcheck.js";
import {
  MarketplaceSourceStrictSchema,
  PluginIdSchema,
  MarketplaceSourceSchemaLazy,
  MarketplacePolicySourceSchema,
  PerKeyLazySchema,
  isValidRegex,
  parseGithubOwnerWildcard,
  hasGithubWildcard,
} from "../plugins/schemas.js";
import { count } from "../collections.js";
import { isDeviceNamespacePath, isMacSpecialPath } from "../pathClassification.js";
import { isNetworkMountRoot } from "../networkPaths.js";
import { MAX_TIMER_DELAY_MS } from "../timerDelayClamp.js";
import { isWellFormedString, plural } from "../stringUtils.js";
import {
  TRANSPORT_LABELS,
  GLOBAL_CONFIG_FIELD_KINDS,
  CONFIG_BACKEND_LABELS,
  AUTO_CONNECT_LABELS,
  CONFIG_SOURCE_LABELS,
  EDITOR_MODES,
  NOTIFICATION_CHANNELS,
  DISABLE_REASON_LABELS,
} from "../config.js";
import { env } from "../env.js";
import { deferredOptional, createDeferredOptional } from "../../../vendor/zod/v4/classic/deferredOptional.js";
import {
  isValidServerName,
  ManagedMcpServerSchema,
  MANAGED_MCP_SERVERS_SHAPE_MESSAGE,
  parseManagedMcpServers,
} from "../../services/mcp/types.js";
import { SERVER_NAME_RULE_MESSAGE } from "../../schemas/hookEntryValidation.js";
import { HooksSchema } from "../../schemas/hooks.js";
import {
  isApiProviderKind,
  API_PROVIDER_KINDS,
  isAnthropicProviderId,
} from "../permissions/autoModeRulesPrompt.js";
import {
  sandboxFilesystemSettingsSchema,
  AWS_CREDENTIAL_ENV_NAMES,
  credentialRulePathSchema,
  INVALID_PAIR_SENTINEL,
  credentialEnvRuleSchema,
  CredentialRuleSchema,
  credentialRuleModeSchema,
} from "./settingsSourceTrust.js";
import { CACHE_TTL_VALUES } from "../env/envRegistry.js";
import { EFFORT_LEVELS } from "../effort.js";
import { import_reject, import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { MANAGED_RESTRICTION_KEYS, asArray } from "./managedRestrictionKeys.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { semverModuleForDesktop, MIN_DESKTOP_VERSION } from "../desktopDeepLink.js";
import { semverGt } from "../semver.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:222126-222212 placement
/**
 * POLICY_HELPER_ON_FAILURE：policyHelper 失败处理取值；POLICY_HELPER_LOG_LEVELS：policyHelper 日志级别取值；policyHelperScriptRefSchema：policyHelper 脚本引用 schema（同一声明共 3 个绑定）。
 */
var POLICY_HELPER_ON_FAILURE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var POLICY_HELPER_LOG_LEVELS;
var policyHelperScriptRefSchema;
deferInit("chunk-dcmhvw5a.js:222126", () => {
  POLICY_HELPER_ON_FAILURE = ["accept", "hold", "refuse"];
  POLICY_HELPER_LOG_LEVELS = ["off", "basic", "full"];
  policyHelperScriptRefSchema = DoctorLazy(() => record(stringSchema(), coerceString()));
});
//@ chunk-dcmhvw5a.js:222212-225428 fingerprint (2.1.88 match: PermissionsSchema, 0.81)
function PermissionsSchema(groups) {
  return objectSchema({
    allow: array(allowPermissionRuleSchema())
      .optional()
      .describe("List of permission rules for allowed operations"),
    deny: array(permissionRuleSchema()).optional().describe("List of permission rules for denied operations"),
    ask: array(permissionRuleSchema())
      .optional()
      .describe("List of permission rules that should always prompt for confirmation"),
    defaultMode: preprocess(
      normalizePermissionModeAlias,
      _enum([...EXTERNAL_PERMISSION_MODES, ...buildPermissionModesForGroups(groups)]),
    )
      .optional()
      .describe(
        "Default permission mode when Claude Code needs access ('manual' is accepted as an alias for 'default')",
      ),
    disableBypassPermissionsMode: _enum(["disable"])
      .optional()
      .describe("Disable the ability to bypass permission prompts"),
    blockReadsOutsideWorkingDirectories: booleanSchema()
      .optional()
      .describe(
        'Refuse file-tool reads (Read, Grep, Glob, LSP) outside the working directories in every permission mode; true in any settings source wins. No allow rule lifts it. Also set when the user picks "block" on the one-time auto-mode prompt for a read outside the working directories.',
      ),
    blockWritesOutsideWorkingDirectories: booleanSchema()
      .optional()
      .describe(
        "Refuse file-tool writes (Write, Edit, NotebookEdit) outside the working directories in every permission mode; true in any settings source wins. No allow rule lifts it. Files that Claude Code keeps for the session are not refused: its plan files, scratchpad and background job folder, and the auto-memory of this project, unless a repository settings file points it elsewhere. Nothing runs them unless the model asks. Also refuses file-tool writes to Claude Code settings files, inside the working directories too, and takes EnterWorktree and ExitWorktree, which move the working directory, out of the tools on offer. Does not limit shell commands, MCP tools, the programs that hooks run, or the memory tools. Cloud sessions (Claude Code on the web), whose file tools run in a container that is itself the boundary, may not apply it.",
      ),
    blockReadsExemptPaths: array(stringSchema().catch(""))
      .optional()
      .catch(undefined)
      .describe(
        'For the program that starts Claude Code: read only from --settings and from settings that program sends while the session runs; ignored in user, project, local and managed settings. Absolute paths, each a folder with all below it or one file, that blockReadsOutsideWorkingDirectories lets through beside the working directories. It allows nothing: an allow rule, the permission mode or the user still decides each read, as with that setting off, and a shell command that hands such a path to a program is still asked about unless a Read allow rule covers it. The paths do not become working directories, so blockWritesOutsideWorkingDirectories refuses writes to them, and they are not told to MCP servers or to the model. Each path counts as written: a link in it is not followed and a pattern is not expanded, so list every spelling that a read may arrive by. Ignored: an entry that starts with ~, has a ".." segment or has white space at either end (as written or once normalized), a relative or network path, and the root of a filesystem. Does not change what sandboxed commands may read (sandbox.filesystem.allowRead does).',
      ),
    disableAutoMode: _enum(["disable"]).optional().describe("Disable auto mode"),
    additionalDirectories: array(stringSchema())
      .optional()
      .describe("Additional directories to include in the permission scope"),
  }).passthrough();
}
//@ chunk-dcmhvw5a.js:225428-230167 fingerprint (2.1.88 match: AllowedMcpServerEntrySchema, 0.418)
/**
 * tipEntrySchema：提示条目 schema；skillsSettingsSchema：技能设置 schema；agentsSettingsSchema：代理设置 schema（同一声明共 11 个绑定）。
 */
var PermissionsSettingsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var tipEntrySchema;
var skillsSettingsSchema;
var agentsSettingsSchema;
var hooksSettingsSchema;
var mcpSettingsSchema;
var outputStylesSettingsSchema;
var allowedMcpServersSchema;
var deniedMcpServersSchema;
var modelPricingSchema;
var sandboxSettingsSchema;
var CONTROL_CHARS_RE;
deferInit("chunk-dcmhvw5a.js:225428", () => {
  PermissionsSettingsSchema = DoctorLazy(() => PermissionsSchema(enabledSettingsFeatureGroups()));
  tipEntrySchema = DoctorLazy(() =>
    union([
      stringSchema(),
      objectSchema({})
        .passthrough()
        .describe(
          '{ id: stable id (letters, digits, ".", "_", "-"; max 64), text: the tip (max 500 characters, one line), cooldownSessions?: sessions to wait before showing it again (default 0), priority?: tie-break weight among never-shown tips (default 0) }',
        ),
    ]),
  );
  skillsSettingsSchema = DoctorLazy(() =>
    preprocess(
      (v) =>
        Array.isArray(v)
          ? v.filter(
              (option) =>
                typeof option === "string" ||
                (!!option && typeof option === "object" && !Array.isArray(option)),
            )
          : [],
      array(tipEntrySchema()),
    ),
  );
  agentsSettingsSchema = DoctorLazy(() =>
    objectSchema({
      source: MarketplaceSourceStrictSchema().describe("Where to fetch the marketplace from"),
      installLocation: stringSchema()
        .optional()
        .describe("Local cache path where marketplace manifest is stored (auto-generated if not provided)"),
      autoUpdate: booleanSchema()
        .optional()
        .describe("Whether to automatically update this marketplace and its installed plugins on startup"),
      pluginDigests: record(stringSchema(), array(stringSchema()).catch([]))
        .optional()
        .catch(undefined)
        .describe(
          'Managed settings only: the plugins of this marketplace that an organization delivers with its own tier, by plugin name, each with the digests of its releases. A plugin also enabled and listed in prependPlugins or appendPlugins by managed settings the session vouches for loads its hooks module only from a folder that proves one of them, and is then seated in that tier; any other copy does not load. A digest is sha256- and the base64 SHA-256 of, for every regular file in the folder in UTF-16 code unit order of its path, not normalized, "f PATH" NUL BYTE-LENGTH NUL BYTES, with / in paths; .git, .in_use, .orphaned_at, .claude-plugin-link and .links_materialized at the root are left out. The plugin keeps its manifest at .claude-plugin/plugin.json and names one module in hooks/hooks.json. A string of any other form, or a list that is empty or of any other shape, matches no folder. A symbolic link, or a surface module, proves nothing. A proved plugin ships bundled with no install step: the digest covers the whole folder, node_modules included. A checkout whose line endings were converted proves nothing.',
        ),
    }),
  );
  hooksSettingsSchema = DoctorLazy(() => {
    let tokenCount = () => numberSchema().min(0).max(1e4);
    return objectSchema({
      input: tokenCount(),
      output: tokenCount(),
      cacheRead: tokenCount(),
      cacheWrite: tokenCount(),
    });
  });
  mcpSettingsSchema = DoctorLazy(() => numberSchema().gt(0).lte(10).optional());
  outputStylesSettingsSchema = DoctorLazy(() =>
    objectSchema({
      model: stringSchema().describe(
        'Model to select, taken verbatim: an alias ("opus"), an Anthropic model ID, or a provider-format ID (Vertex, Bedrock, gateway). Same values --model accepts.',
      ),
      label: stringSchema().optional().describe("Row title. Defaults to the model name."),
      description: stringSchema().optional().describe("Row subtitle. Defaults to a generic description."),
      behavesAs: stringSchema()
        .optional()
        .describe(
          "For a model this version of Claude Code does not know: the ID of a model it does know " +
            '(e.g. "claude-opus-4-8") whose client-side handling \u2014 prompt profile, capability and effort ' +
            "defaults \u2014 applies to it. Changes neither the row's label nor the model ID sent. Without it, " +
            "a model-catalog row for a model this version does not know is not offered until Claude Code is updated.",
        ),
    }),
  );
  allowedMcpServersSchema = DoctorLazy(() =>
    objectSchema({
      serverName: stringSchema()
        .regex(/^[a-zA-Z0-9_-]+$/, "Server name can only contain letters, numbers, hyphens, and underscores")
        .optional()
        .describe("Name of the MCP server that users are allowed to configure"),
      serverCommand: array(stringSchema())
        .min(1, "Server command must have at least one element (the command)")
        .optional()
        .describe("Command array [command, ...args] to match exactly for allowed stdio servers"),
      serverUrl: stringSchema()
        .optional()
        .describe(
          'URL pattern with wildcard support (e.g., "https://*.example.com/*") for allowed remote MCP servers',
        ),
    }).refine(
      (entry) =>
        count(
          [entry.serverName !== undefined, entry.serverCommand !== undefined, entry.serverUrl !== undefined],
          Boolean,
        ) === 1,
      {
        message: 'Entry must have exactly one of "serverName", "serverCommand", or "serverUrl"',
      },
    ),
  );
  deniedMcpServersSchema = DoctorLazy(() =>
    objectSchema({
      serverName: stringSchema()
        .min(1, "Server name must be non-empty")
        .refine((name) => name.trim().length > 0, {
          message: "Server name must not be whitespace-only",
        })
        .refine((name) => name === name.trim(), {
          message:
            "Server name has leading or trailing whitespace and will never match (names are compared verbatim)",
        })
        .optional()
        .describe("Name of the MCP server that is explicitly blocked"),
      serverCommand: array(stringSchema())
        .min(1, "Server command must have at least one element (the command)")
        .optional()
        .describe("Command array [command, ...args] to match exactly for blocked stdio servers"),
      serverUrl: stringSchema()
        .optional()
        .describe(
          'URL pattern with wildcard support (e.g., "https://*.example.com/*") for blocked remote MCP servers',
        ),
    }).refine(
      (entry) =>
        count(
          [entry.serverName !== undefined, entry.serverCommand !== undefined, entry.serverUrl !== undefined],
          Boolean,
        ) === 1,
      {
        message: 'Entry must have exactly one of "serverName", "serverCommand", or "serverUrl"',
      },
    ),
  );
  modelPricingSchema = DoctorLazy(() =>
    objectSchema({
      marketplace: stringSchema(),
      plugin: stringSchema(),
    }),
  );
  sandboxSettingsSchema = DoctorLazy(() =>
    preprocess((value) => {
      if (typeof value !== "string" || !PluginIdSchema().safeParse(value).success) return value;
      let index = value.indexOf("@");
      return {
        marketplace: value.slice(index + 1),
        plugin: value.slice(0, index),
      };
    }, modelPricingSchema()),
  );
  CONTROL_CHARS_RE = /[\x00-\x1f\x7f-\x9f\u2028\u2029]|\p{DI}/u;
});
//@ chunk-dcmhvw5a.js:230167-230258 layout
/**
 * looksLikeUncPath：反斜杠形式像 UNC 路径。
 */
function looksLikeUncPath(path) {
  let replaced = path.replaceAll("/", "\\");
  if (isDeviceNamespacePath(replaced)) return false;
  return /^\\{2}[^\\]/.test(replaced);
}
//@ chunk-dcmhvw5a.js:230258-230332 layout
/**
 * isNetworkOrMacSpecialPath：网络路径或 macOS 特殊路径。
 */
function isNetworkOrMacSpecialPath(path) {
  return isNetworkMountRoot(path) || /^\/network\/servers(\/|$)/i.test(path) || isMacSpecialPath(path);
}
//@ chunk-dcmhvw5a.js:230332-230411 layout
/**
 * isKernelPseudoPath：/proc、/dev/fd 等内核伪路径。
 */
function isKernelPseudoPath(path) {
  return /^\/(proc|dev\/(fd|stdin|stdout|stderr))(\/|$)/i.test(path);
}
//@ chunk-dcmhvw5a.js:230411-231166 layout
/**
 * 校验 helper 路径是规范形式：Windows 上不含 . / ..、双分隔符、尾随点或空格、盘符外的冒号、设备命名空间，按规则拒绝 UNC 与盘符相对路径；POSIX 上拒绝网络自动挂载根与 /proc、/dev/fd 等。
 */
function isNormalizedHelperPath(path, platform, rules = {}) {
  if (platform === "win32") {
    let path_2 = path.replaceAll("/", "\\");
    if (isDeviceNamespacePath(path_2)) return false;
    let isUnc = looksLikeUncPath(path_2);
    if (rules.rejectUnc && isUnc) return false;
    if (rules.rejectDriveRelative) {
      if (!/^[A-Za-z]:\\/.test(path_2) && !isUnc && /^(\\|[A-Za-z]:)/.test(path_2)) return false;
    }
    if (win32.normalize(path_2) !== path_2) return false;
    let parts = path_2.split("\\");
    if (parts.some((part) => part === "." || part === "..")) return false;
    if (
      parts.some(
        (part, index) =>
          /[. ]$/.test(part) || (part.includes(":") && !(index === 0 && /^[A-Za-z]:$/.test(part))),
      )
    )
      return false;
    let uncPrefixed = path_2.startsWith("\\\\") ? path_2.slice(2) : path_2;
    if (/\\{2}/.test(uncPrefixed)) return false;
    return !path_2.endsWith("\\") || /^([A-Za-z]:)?\\$/.test(path_2);
  }
  if (rules.rejectNetworkRoot && isNetworkOrMacSpecialPath(path)) return false;
  if (rules.rejectMagicLinkRoot && isKernelPseudoPath(path)) return false;
  if (posix.normalize(path) !== path) return false;
  if (path.split("/").some((segment) => segment === "." || segment === "..")) return false;
  if (/\/{2}/.test(path)) return false;
  return !path.endsWith("/") || path === "/";
}
//@ chunk-dcmhvw5a.js:231166-231190 layout
/**
 * POLICY_HELPER_EXECUTABLE_RE：policyHelper 可执行文件后缀。
 */
var POLICY_HELPER_EXECUTABLE_RE = /\.(exe|ps1)$/i;
//@ chunk-dcmhvw5a.js:231190-231230 layout
/**
 * isPowerShellScript：.ps1 脚本。
 */
function isPowerShellScript(path) {
  return /\.ps1$/i.test(path);
}
//@ chunk-dcmhvw5a.js:231230-231280 layout
/**
 * hasPowerShellGlobChars：.ps1 里含 glob 字符。
 */
function hasPowerShellGlobChars(path) {
  return isPowerShellScript(path) && /[[\]`*?]/.test(path);
}
//@ chunk-dcmhvw5a.js:231280-231627 layout
/**
 * policyHelper 条目 schema 的辅助：.ps1 通配字符提示、路径字段、null 视为缺省的包装、带上限的整数 schema、可为 null 的字段名。
 */
var PS1_WILDCARD_MESSAGE =
  'a .ps1 path must not contain "[", "]", "`", "*", or "?" on Windows (PowerShell resolves them as wildcard syntax)';
var helperPathSchema = () => stringSchema().describe("Absolute path to the helper executable");
var nullableOptional = (schema) =>
  preprocess((value) => (value === null ? undefined : value), schema.optional()).optional();
var MAX_HELPER_MS = MAX_TIMER_DELAY_MS;
var clampedIntSchema = (minValue) =>
  numberSchema()
    .int()
    .min(minValue)
    .transform((value) => Math.min(value, MAX_HELPER_MS));
var NULLABLE_ENTRY_FIELDS = ["path", "script", "defaultSettings"];
//@ chunk-dcmhvw5a.js:231627-231780 layout
function isAllNullEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  let record = entry;
  return (
    NULLABLE_ENTRY_FIELDS.some((field) => record[field] === null) &&
    NULLABLE_ENTRY_FIELDS.every((field) => record[field] === null || record[field] === undefined)
  );
}
//@ chunk-dcmhvw5a.js:231780-232632 layout
/**
 * policyHelper 条目的基础结构（路径、超时、刷新间隔）与 outputBehavior 字段说明。
 */
var MAX_QUOTED_NAME_CHARS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var HELPER_BASE_SCHEMA;
var outputBehaviorSchema;
deferInit("chunk-dcmhvw5a.js:231780", () => {
  MAX_QUOTED_NAME_CHARS = 64;
  HELPER_BASE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      path: helperPathSchema(),
      timeoutMs: nullableOptional(clampedIntSchema(1000)),
      refreshIntervalMs: nullableOptional(union([literal(0), clampedIntSchema(60000)])),
    }),
  );
  outputBehaviorSchema = () =>
    _enum(["replace", "merge"]).describe(
      "How the helper's managedSettings compose with the settings of the source that delivered this entry: 'replace' (default) \u2014 the output is the policy; 'merge' \u2014 the output is deep-merged over that source's own settings the way merged managed sources compose (helper scalars win, arrays union, objects merge \u2014 except fallbackModel, forceLoginOrgUUID, gatewayInternalNetworks, sandbox.filesystem.allowRead, sandbox.credentials.awsPairs, sandbox.ripgrep and the restriction allowlists such as allowedMcpServers, allowedProviders, availableModels and allowedHttpHookUrls, which are the helper's whole value when it emits one; tighten a permission with a deny), so a failed helper costs only the delta",
    );
});
//@ chunk-dcmhvw5a.js:232632-232683 layout
function isPolicyHelperOnFailure(value) {
  return value === "continue" || value === "refuse";
}
//@ chunk-dcmhvw5a.js:232683-236920 layout
/**
 * policyHelpers 条目各字段的 schema：onFailure（continue/refuse）、retries（上限 5）、interpreter（sh/pwsh）、内联 script 的约束，以及路径/脚本组合错误文本。
 */
var onFailureSchema = () =>
  preprocess(
    (value) => (value === undefined || isPolicyHelperOnFailure(value) ? value : "refuse"),
    _enum(["continue", "refuse"]).describe(
      `What happens when this entry's helper fails at startup (bad path, missing file or interpreter, non-zero exit, timeout, oversize or invalid output) and no static settings payload (this entry's own, the linux entry's on WSL, or the map's "default") applies in its place: 'refuse' \u2014 Claude Code does not start, naming the failure; 'continue' \u2014 Claude Code starts without the helper's output, on the delivering source's own settings, with a /status notice. Default: 'refuse' when the entry comes from MDM or the managed settings file, 'continue' when it comes from remote managed settings. Any other value is treated as 'refuse', with a /status notice. The install and update commands start no session and are never refused over a remote entry: they report the refusal in /status. An entry whose other fields fail validation runs no helper; from MDM or the managed settings file, any value but 'continue' on it then refuses to start Claude Code until the entry is fixed, unless a static settings payload (the entry's own, kept when it validates, the linux entry's for a wsl one, or the map's "default") serves in its place. From remote, a non-interactive session runs the helper off settings verified this session without the interactive approval, so 'refuse' there too means the helper ran and failed; a launch whose remote settings could not be verified this session (offline, fetch failed) starts without the helper regardless; and a failure first reached after the session has started (settings verified or approved mid-session, which on a machine that only ever runs non-interactively is every launch) ends a session no person watches (non-interactive, a background session no client is attached to, or a teammate session) as the refused start would have, and leaves a watched interactive one (a terminal, with or without remote control, or an attached background session) running under a /status notice with its next start refused. Background refresh failures always keep the last good output whatever this says`,
    ),
  );
var MAX_HELPER_RETRIES = 5;
var retriesSchema = () =>
  numberSchema()
    .int()
    .min(0)
    .transform((value) => Math.min(value, MAX_HELPER_RETRIES))
    .describe(
      "How many more times to run this entry's helper when a run fails to execute \u2014 it could not be launched, exited non-zero, or was stopped at timeoutMs \u2014 before that counts as a failure (a non-negative integer; default 0, a single attempt; above 5 is treated as 5). Attempts are separated by a short randomized backoff (from 250 ms, doubling per attempt, at most 4 s each) and each attempt gets the full timeoutMs, so a start that waits on the helper can wait up to (retries + 1) \xD7 timeoutMs plus the backoff. Output the helper did produce and that was refused \u2014 oversized, not a JSON object, an invalid envelope, or settings that fail validation \u2014 is not retried, and neither is an invalid path. Applies alike at startup and on each background refresh; only once the attempts are used up do the entry's failure rules (a static settings payload in its place, onFailure, the refresh notice) apply, naming the last attempt's failure",
    );
var interpreterSchema = (platform) =>
  (platform === "windows"
    ? literal("pwsh", {
        message: "interpreter must be 'pwsh' on windows ('sh' is not supported there)",
      })
    : literal("sh", {
        message: "interpreter must be 'sh' on macos/linux/wsl",
      })
  ).describe(
    "Fixed interpreter for `script`: 'sh' (/bin/sh) on macos/linux/wsl entries; 'pwsh' (PowerShell at its fixed install locations, never PATH) on the windows entry",
  );
var PATH_OR_SCRIPT_MESSAGE = "exactly one of path/script must be configured";
var SCRIPT_NEEDS_INTERPRETER_MESSAGE = '"script" and "interpreter" must be configured together';
var WINDOWS_SCRIPT_ASCII_MESSAGE =
  "script must be ASCII-only on Windows (PowerShell decodes stdin with the console OEM code page); spell non-ASCII characters as escapes, e.g. [char]0x00E9";
var scriptSchema = (platform) =>
  stringSchema({
    message: "script must be a string",
  })
    .min(1, {
      message: "script must not be empty",
    })
    .max(65536, {
      message: "script must be at most 65536 characters",
    })
    .refine((script) => !script.includes("\x00"), {
      message: "script must not contain NUL bytes",
    })
    .refine((script) => isWellFormedString(script), {
      message: "script must be valid UTF-8 (no lone surrogates)",
    })
    .refine((script) => platform !== "windows" || !/[\u0080-\uffff]/.test(script), {
      message: WINDOWS_SCRIPT_ASCII_MESSAGE,
    })
    .describe("Inline helper script, delivered to the fixed interpreter over stdin (never written to disk)");
//@ chunk-dcmhvw5a.js:236920-237074 layout
/**
 * 校验内联 helper（script 与 interpreter），返回第一条错误或 null。
 */
function validateInlineHelper(config, platform) {
  let result = objectSchema({
    script: scriptSchema(platform),
    interpreter: interpreterSchema(platform),
  }).safeParse(config);
  return result.success ? null : result.error.issues[0]?.message || "invalid inline helper config";
}
//@ chunk-dcmhvw5a.js:237074-237115 layout (2.1.88 match: SUPPORTED_PLATFORMS, 0.811)
var SUPPORTED_PLATFORMS = ["macos", "linux", "windows", "wsl"];
//@ chunk-dcmhvw5a.js:237115-237167 layout
/**
 * platformSpellings：平台名的等价写法（wsl 兼容 linux）。
 */
function platformSpellings(platform) {
  return platform === "wsl" ? ["wsl", "linux"] : [platform];
}
//@ chunk-dcmhvw5a.js:237167-237219 layout
function posixPlatformFamily(platform) {
  return platform === "windows" ? "win32" : "posix";
}
//@ chunk-dcmhvw5a.js:237219-237409 layout
function pathRulesForOs(platform) {
  return {
    rejectDriveRelative: platform === "windows",
    rejectUnc: platform === "windows",
    rejectNetworkRoot: platform !== "windows",
    rejectMagicLinkRoot: platform !== "windows",
    requireWin32ExecutableSuffix: platform === "windows",
  };
}
//@ chunk-dcmhvw5a.js:237409-238532 layout
/**
 * 按目标系统生成 helper 路径 schema：长度上限、无控制/不可见字符、绝对路径、Windows 须为 .exe/.ps1 且 .ps1 无通配字符，并须为规范形式。
 */
function helperPathSchemaFor(os) {
  let platform = posixPlatformFamily(os);
  let rules = pathRulesForOs(os);
  return stringSchema()
    .max(1024, {
      message: "path must be at most 1024 characters",
    })
    .refine((path) => !CONTROL_CHARS_RE.test(path), {
      message:
        "path must not contain control, line/paragraph-separator, or invisible (default-ignorable) characters",
    })
    .refine((path) => (platform === "win32" ? win32 : posix).isAbsolute(path), {
      message: "path must be absolute",
    })
    .refine(
      (path) =>
        !(platform === "win32" && rules.requireWin32ExecutableSuffix) ||
        POLICY_HELPER_EXECUTABLE_RE.test(path),
      {
        message: "path must end in .exe or .ps1 on Windows",
      },
    )
    .refine((path) => platform !== "win32" || !hasPowerShellGlobChars(path), {
      message: PS1_WILDCARD_MESSAGE,
    })
    .refine((path) => isNormalizedHelperPath(path, platform, rules), {
      message:
        platform === "win32"
          ? 'path must be in normalized form: no "." or ".." segments, no doubled or trailing separators, no component ending in "." or a space, no ":" outside the drive letter, no device-namespace (\\\\?\\) prefix, no drive-relative (\\dir or C:name) or UNC (\\\\server\\share) form'
          : 'path must be in normalized form: no "." or ".." segments, no doubled or trailing separators, and not under a network automount root (/net/<host>, /Network/Servers, or macOS /.vol /.file /.nofollow /.resolve) or a kernel magic-link root (/proc, /dev/fd)',
    })
    .describe("Absolute path to the helper executable");
}
//@ chunk-dcmhvw5a.js:238532-240013 layout
/**
 * policyHelpers 静态载荷校验：不得含 policyHelper(s)、条目字段、helper 输出信封字段或平台键，并给出对应提示。
 */
var POLICY_HELPER_KEYS; // deferred: uses SUPPORTED_PLATFORMS of its import cycle while loading; runs once the cycle is complete
var HELPER_ENTRY_FIELDS;
var HELPER_ENVELOPE_FIELDS;
var STATIC_PAYLOAD_SCHEMA;
var EMPTY_ENTRY_MESSAGE;
deferInit("chunk-dcmhvw5a.js:238532", () => {
  POLICY_HELPER_KEYS = [...SUPPORTED_PLATFORMS, "default"];
  HELPER_ENTRY_FIELDS = [
    "path",
    "script",
    "interpreter",
    "outputBehavior",
    "onFailure",
    "retries",
    "timeoutMs",
    "refreshIntervalMs",
    "defaultSettings",
  ];
  HELPER_ENVELOPE_FIELDS = ["managedSettings", "appendSystemPrompt"];
  STATIC_PAYLOAD_SCHEMA = DoctorLazy(() =>
    record(stringSchema(), unknown()).superRefine((payload, ctx) => {
      for (let key of ["policyHelper", "policyHelpers"])
        if (payload[key] !== undefined && payload[key] !== null)
          ctx.addIssue({
            code: "custom",
            message: `must not contain "${key}" \u2014 the default payload is applied as managed settings and cannot configure further policy helpers`,
          });
      for (let field of HELPER_ENTRY_FIELDS)
        if (payload[field] !== undefined && payload[field] !== null)
          ctx.addIssue({
            code: "custom",
            message: `must not contain "${field}" \u2014 a static payload is a managed-settings object, not a policyHelpers entry; entry fields (${HELPER_ENTRY_FIELDS.join("/")}) belong on the per-OS entries (policyHelpers.${SUPPORTED_PLATFORMS.join("/")})`,
          });
      for (let field of HELPER_ENVELOPE_FIELDS)
        if (payload[field] !== undefined && payload[field] !== null)
          ctx.addIssue({
            code: "custom",
            message: `must not contain "${field}" \u2014 a static payload is the managedSettings SUBTREE, not the helper's stdout envelope; paste the object your helper emits UNDER "managedSettings", not the envelope around it`,
          });
      for (let key of POLICY_HELPER_KEYS)
        if (payload[key] !== undefined && payload[key] !== null)
          ctx.addIssue({
            code: "custom",
            message: `must not contain "${key}" \u2014 a static payload is the VALUE of a policyHelpers key (a managed-settings object), never another policyHelpers map; don't paste the map or its "${key}" line inside the slot`,
          });
    }),
  );
  EMPTY_ENTRY_MESSAGE =
    'Entry must carry "path" (a helper executable) or "script" + "interpreter" (an inline helper), and/or "defaultSettings" (a static settings payload)';
});
//@ chunk-dcmhvw5a.js:240013-240219 layout
function entryShapeError(entry) {
  let { path, script, interpreter, defaultSettings } = entry;
  if (path !== undefined && script !== undefined) return PATH_OR_SCRIPT_MESSAGE;
  if ((script === undefined) !== (interpreter === undefined)) return SCRIPT_NEEDS_INTERPRETER_MESSAGE;
  if (path === undefined && script === undefined && defaultSettings === undefined) return EMPTY_ENTRY_MESSAGE;
  return null;
}
//@ chunk-dcmhvw5a.js:240219-240582 layout
/**
 * 按平台构造 policyHelpers 条目 schema：path、script、interpreter、outputBehavior、onFailure、retries、defaultSettings，并检查 path/script/defaultSettings 的组合。
 */
function policyHelperEntrySchema(os, defaultSettingsSchema) {
  return HELPER_BASE_SCHEMA()
    .omit({
      path: true,
    })
    .extend({
      path: nullableOptional(helperPathSchemaFor(os)),
      script: nullableOptional(scriptSchema(os)),
      interpreter: nullableOptional(interpreterSchema(os)),
      outputBehavior: nullableOptional(outputBehaviorSchema()),
      onFailure: nullableOptional(onFailureSchema()),
      retries: nullableOptional(retriesSchema()),
      defaultSettings: preprocess(
        (value) => (value === null ? undefined : value),
        defaultSettingsSchema.optional(),
      ).optional(),
    })
    .check((ctx) => {
      if (ctx.issues.length > 0) return;
      let shapeError = entryShapeError(ctx.value);
      if (shapeError !== null)
        ctx.issues.push({
          code: "custom",
          message: shapeError,
          input: ctx.value,
        });
    });
}
//@ chunk-dcmhvw5a.js:240582-240614 layout
var linuxPolicyHelperSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:240582", () => {
  linuxPolicyHelperSchema = DoctorLazy(() => policyHelperEntrySchema("linux", STATIC_PAYLOAD_SCHEMA()));
});
//@ chunk-dcmhvw5a.js:240614-240672 layout
function policyHelperEntrySchemaFor(os, defaultSettingsSchema = STATIC_PAYLOAD_SCHEMA()) {
  return os === "default" ? STATIC_PAYLOAD_SCHEMA() : policyHelperEntrySchema(os, defaultSettingsSchema);
}
//@ chunk-dcmhvw5a.js:240672-240862 fingerprint (2.1.88 match: CUSTOMIZATION_SURFACES, 0.945)
/**
 * 插件专属定制限制：_E 是 strictPluginOnlyCustomization 的 schema（逐项过滤，非数组原样放行）；oJt 是允许的定制组件名单 ["skills","agents","hooks","mcp"]，名单外会在校验时给出 unknown-surface 的说明。
 */
var SkillOverridesSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SKILL_OVERRIDE_COMPONENTS;
deferInit("chunk-dcmhvw5a.js:240672", () => {
  SkillOverridesSchema = DoctorLazy(() =>
    objectSchema(
      Object.fromEntries(
        POLICY_HELPER_KEYS.map((key) => [
          key,
          preprocess((value) => {
            if (value === null) return;
            if (key !== "default" && isAllNullEntry(value)) return;
            return value;
          }, policyHelperEntrySchemaFor(key).optional()).optional(),
        ]),
      ),
    ),
  );
  SKILL_OVERRIDE_COMPONENTS = ["skills", "agents", "hooks", "mcp"];
});
//@ chunk-dcmhvw5a.js:240862-241035 layout
function filteredSurfacesSchema(onFiltered) {
  return preprocess(
    (value) => {
      if (!Array.isArray(value)) return value;
      let filtered = value.filter((x) => SKILL_OVERRIDE_COMPONENTS.includes(x));
      if (filtered.length < value.length) onFiltered?.(value.length - filtered.length);
      return filtered;
    },
    union([booleanSchema(), array(_enum(SKILL_OVERRIDE_COMPONENTS))]),
  );
}
//@ chunk-dcmhvw5a.js:241035-241078 layout
function triStateSchema() {
  return union([array(stringSchema()), booleanSchema(), undefinedSchema()]);
}
//@ chunk-dcmhvw5a.js:241078-242189 layout
/**
 * configVariantSchema：配置变体 schema；configVariantUnionSchema：配置变体联合 schema（同一声明共 2 个绑定）。
 */
var INVALID_ENTRY_STRIPPED; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var configVariantSchema;
var configVariantUnionSchema;
deferInit("chunk-dcmhvw5a.js:241078", () => {
  INVALID_ENTRY_STRIPPED = Object.freeze({
    type: "invalid-entry-stripped",
  });
  configVariantSchema = DoctorLazy(() =>
    union([
      objectSchema({
        type: literal("regex").describe(
          'Config variant. This client understands "regex": matches turn output and builds a URL from named capture groups. Entries with other variants are preserved but skipped at runtime.',
        ),
        pattern: stringSchema().describe(
          "Regex matched against turn output (tool results and assistant text)",
        ),
        url: stringSchema().describe(
          "Link target. {name} placeholders are filled from named regex capture groups, e.g. (?<id>...) -> {id}. Values are URL-encoded; the origin must be literal in the template. The scheme must be https, http, or a recognized editor or workspace deep-link scheme: vscode, vscode-insiders, cursor, windsurf, zed, jetbrains, idea, slack, linear, notion, figma.",
        ),
        label: stringSchema()
          .optional()
          .describe(
            "Badge text. {name} placeholders filled from named capture groups; defaults to the full match.",
          ),
      }).passthrough(),
      objectSchema({
        type: stringSchema().describe(
          "Config variant discriminator for entries this client does not understand; the entry is preserved as-is and skipped at runtime.",
        ),
      }).passthrough(),
    ]),
  );
  configVariantUnionSchema = () =>
    numberSchema().int().min(TRANSPORT_LABELS).max(GLOBAL_CONFIG_FIELD_KINDS).optional().catch(undefined);
});
//@ chunk-dcmhvw5a.js:242189-314583 fingerprint (2.1.88 match: SettingsSchema, 0.419)
/**
 * settings.json 的完整 zod schema（约 187 个顶层键：认证 helper、env、permissions、hooks、model、sandbox、插件/市场、遥测相关等）。strictPolicyHelperKeys 时 policyHelper 键严格校验。
 */
function SettingsSchema(featureGroups, { strictPolicyHelperKeys = false } = {}) {
  function marketplaceSchema(keyName) {
    return record(stringSchema(), agentsSettingsSchema()).check((ctx) => {
      for (let [key, entry] of Object.entries(ctx.value))
        if (entry.source.source === "settings" && entry.source.name !== key)
          ctx.issues.push({
            code: "custom",
            input: entry.source.name,
            path: [key, "source", "name"],
            message: `Settings-sourced marketplace name must match its ${keyName} key (got key "${key}" but source.name "${entry.source.name}")`,
          });
    });
  }
  let optionalKey = (schema, coerce) =>
    strictPolicyHelperKeys
      ? preprocess((ctx) => {
          if (ctx === null) return;
          return coerce ? coerce(ctx) : ctx;
        }, schema)
      : schema.catch(undefined);
  return {
    $schema: () => stringSchema().optional().describe("JSON Schema reference for Claude Code settings"),
    apiKeyHelper: () =>
      stringSchema().optional().describe("Path to a script that outputs authentication values"),
    proxyAuthHelper: () =>
      stringSchema()
        .optional()
        .describe("Shell command that outputs a Proxy-Authorization header value (EAP)"),
    awsCredentialExport: () =>
      stringSchema().optional().describe("Path to a script that exports AWS credentials"),
    awsAuthRefresh: () =>
      stringSchema().optional().describe("Path to a script that refreshes AWS authentication"),
    gcpAuthRefresh: () =>
      stringSchema()
        .optional()
        .describe("Command to refresh GCP authentication (e.g., gcloud auth application-default login)"),
    processWrapper: () =>
      stringSchema()
        .optional()
        .describe(
          "Corporate launcher argv prefix for the background-agent supervisor, the sessions and workers it hosts, and the other covered background processes listed in the Claude Code corporate-launcher documentation. Equivalent to the CLAUDE_CODE_PROCESS_WRAPPER environment variable, which takes precedence when set. Honored from managed settings, a --settings/SDK-supplied settings file, and user settings, in that precedence order; project and local settings are ignored.",
        ),
    policyHelper: () =>
      optionalKey(HELPER_BASE_SCHEMA().optional(), (value) =>
        value && typeof value === "object" && !Array.isArray(value) && value.path === null
          ? undefined
          : value,
      ).describe(
        "Executable that computes managed settings at startup. Honored only from admin-controlled policy sources.",
      ),
    policyHelpers: () =>
      optionalKey(SkillOverridesSchema().optional()).describe(
        `@internal Per-OS variant of policyHelper, keyed by platform: macos, linux, windows, wsl, plus an optional "default" entry that is a STATIC settings payload (a JSON object of managed settings, not a helper). Each per-OS entry carries a helper \u2014 a "path", or an inline "script" + "interpreter" delivered to a fixed interpreter over stdin, either with timeoutMs/refreshIntervalMs \u2014 its own static "defaultSettings" payload, or both; an entry may be payload-only. Selection for a platform walks its chain (the platform's own entry; on wsl the linux entry next): the first helper on the chain wins over policyHelper; if no helper is configured \u2014 or the selected helper fails at startup or refresh \u2014 the first payload applies (the chain's "defaultSettings" in platform-specific-first order, then the top-level "default", applied with no process spawned; unrecognized platforms reach only "default"); with no payload either, policyHelper. Honored from admin-controlled policy sources, and from remote managed settings \u2014 a payload of plain policy as delivered, like any other remote key; a helper, or a payload carrying anything the managed-settings approval dialog lists, only once the settings are verified this session and approved there (policyHelper itself is never honored from remote).`,
      ),
    ...(env.CLAUDE_CODE_ENABLE_XAA && {
      xaaIdp: () =>
        objectSchema({
          issuer: stringSchema().url().describe("IdP issuer URL for OIDC discovery"),
          clientId: stringSchema().describe("Claude Code's client_id registered at the IdP"),
          callbackPort: numberSchema()
            .int()
            .positive()
            .optional()
            .describe(
              "Fixed loopback callback port for the IdP OIDC login. Only needed if the IdP does not honor RFC 8252 port-any matching.",
            ),
        })
          .optional()
          .describe("XAA (SEP-990) IdP connection. Configure once; all XAA-enabled MCP servers reuse this."),
    }),
    fileSuggestion: () =>
      objectSchema({
        type: literal("command"),
        command: stringSchema(),
      })
        .optional()
        .describe("Custom file suggestion configuration for @ mentions"),
    respectGitignore: () =>
      booleanSchema()
        .optional()
        .describe(
          "Whether file picker should respect .gitignore files (default: true). Note: .ignore files are always respected.",
        ),
    breakReminder: () =>
      objectSchema({
        enabled: booleanSchema()
          .optional()
          .describe(
            "Show a friendly nudge after sustained continuous use (default false). Must be true for the reminder to fire.",
          ),
        intervalMinutes: numberSchema()
          .int()
          .positive()
          .optional()
          .describe(
            "Minutes of continuous use before the reminder fires (default 30). Re-fires every interval until you take a break.",
          ),
        breakThresholdMinutes: numberSchema()
          .int()
          .positive()
          .optional()
          .describe("Minutes of inactivity that count as a break and reset the timer (default 10)"),
        message: stringSchema()
          .optional()
          .describe("Custom reminder text. Leave unset for a rotating set of friendly nudges."),
      })
        .optional()
        .describe(
          "@internal Opt-in break reminder. When enabled, shows a dismissible nudge after sustained continuous use. Never blocks \u2014 just a friendly heads-up.",
        ),
    quietHours: () =>
      objectSchema({
        enabled: booleanSchema()
          .optional()
          .describe(
            "Show a one-time nudge when you start or keep using the CLI inside your quiet-hours window (default false).",
          ),
        start: stringSchema()
          .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Expected 24-hour local time "HH:MM" (e.g. "22:00")')
          .optional()
          .describe('Start of the quiet-hours window, 24-hour local time "HH:MM".'),
        end: stringSchema()
          .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Expected 24-hour local time "HH:MM" (e.g. "07:00")')
          .optional()
          .describe(
            'End of the quiet-hours window, 24-hour local time "HH:MM". May be earlier than start for an overnight range.',
          ),
      })
        .optional()
        .describe(
          "@internal Opt-in quiet hours. When enabled, shows a single soft nudge per session while inside the configured local-time window. Never blocks.",
        ),
    cleanupPeriodDays: () =>
      numberSchema()
        .int()
        .positive()
        .optional()
        .describe(
          "Number of days to retain chat transcripts before automatic cleanup (default: 30). Minimum 1. Use a large value for long retention; use --no-session-persistence to disable transcript writes entirely.",
        ),
    desktopSessionCleanupPeriodDays: () =>
      numberSchema()
        .int()
        .nonnegative()
        .optional()
        .describe(
          "Retention ceiling in days for session transcripts created or last written by a desktop-host surface (Claude Desktop, Cowork), which are otherwise exempt from the cleanupPeriodDays sweep. 0 (the default) means no ceiling: such transcripts are kept until deleted another way. Unlike cleanupPeriodDays, 0 is allowed because this setting never disables writes \u2014 it only bounds an exemption from deletion. The ceiling is a hard cap: it also bounds an active archive grace, so the grace window of a release marker never keeps files past the ceiling. Ignored when cleanupPeriodDays is managed by org policy. A ceiling at or below cleanupPeriodDays effectively disables the exemption: those transcripts age out on the regular cleanupPeriodDays schedule, so the effective retention is whichever of the two periods is longer.",
        ),
    syncClaudeAiSkills: () =>
      booleanSchema()
        .optional()
        .describe(
          "Set to false to turn off syncing of the skills you have enabled on claude.ai. In your user settings (or managed settings): nothing more is downloaded, previously synced skills (~/.claude/skills/synced) can no longer be run, are hidden from every session started afterwards, and are moved to ~/.claude/skills/.trash at the next launch (deleted after cleanupPeriodDays; re-downloaded, not restored, if you re-enable). In .claude/settings.local.json or --settings: downloads stop and synced skills are blocked and hidden for sessions in that workspace or invocation only (nothing is moved). Not read from project settings (.claude/settings.json). Only false is honored \u2014 the feature is enabled server-side for your account, so setting true does not turn it on early. While it is on, synced skills are available in every session, re-synced about every 10 minutes while a session is in use and a quarter as often otherwise, and removed when you disable them on claude.ai. Only applies when signed in with your Claude account.",
        ),
    syncClaudeAiPlugins: () =>
      booleanSchema()
        .optional()
        .describe(
          "Set to false to turn off syncing of the plugins you have enabled on claude.ai. In your user settings (or managed settings): nothing more is downloaded, previously synced plugins (~/.claude/plugins/synced) are hidden from every session started afterwards and moved to ~/.claude/plugins/.trash at the next launch (deleted after cleanupPeriodDays; re-downloaded, not restored, if you re-enable). In .claude/settings.local.json or --settings: downloads stop and synced plugins are hidden for sessions in that workspace or invocation only (nothing is moved). Not read from project settings (.claude/settings.json). Only false is honored \u2014 the feature is enabled server-side for your account, so setting true does not turn it on early. While it is on, synced plugins load in every session like plugins you installed yourself (a plugin you installed with the same name takes precedence), are re-synced at each launch, and are removed when you disable them on claude.ai. Only applies when signed in with your Claude account.",
        ),
    skillListingMaxDescChars: () =>
      numberSchema()
        .int()
        .positive()
        .optional()
        .describe(
          "Per-skill description character cap in the skill listing sent to Claude (default: 1536). Descriptions longer than this are truncated. Raise to opt in to higher per-turn context cost.",
        ),
    skillListingBudgetFraction: () =>
      numberSchema()
        .gt(0)
        .lte(1)
        .optional()
        .describe(
          "Fraction of the context window (in characters) reserved for the skill listing sent to Claude (default: 0.01 = 1%). When the listing exceeds this, descriptions are shortened to fit. Raise to opt in to higher per-turn context cost.",
        ),
    wslInheritsWindowsSettings: () =>
      booleanSchema()
        .optional()
        .describe(
          "When set to true in either admin-only Windows source \u2014 the HKLM SOFTWARE/Policies/ClaudeCode registry key or C:/Program Files/ClaudeCode/managed-settings.json \u2014 WSL reads managed settings from the full Windows policy chain (HKLM, C:/Program Files/ClaudeCode via DrvFs, HKCU) in addition to /etc/claude-code. Windows sources take priority. The flag is also required in HKCU itself for HKCU policy to apply on WSL (double opt-in: admin enables the chain, user confirms HKCU). On native Windows the flag has no effect.",
        ),
    env: () =>
      deferredOptional(() => policyHelperScriptRefSchema()).describe(
        "Environment variables to set for Claude Code sessions",
      ),
    attribution: () => {
      let objectSchema_2 = objectSchema({
        commit: stringSchema()
          .optional()
          .describe(
            "Attribution text for git commits, including any trailers. Empty string hides attribution.",
          ),
        pr: stringSchema()
          .optional()
          .describe("Attribution text for pull request descriptions. Empty string hides attribution."),
        sessionUrl: booleanSchema()
          .optional()
          .describe(
            "Whether to append the claude.ai session link to commits and PRs created from web or Remote Control sessions (default: true). Set to false to omit the Claude-Session trailer and PR-body link.",
          ),
        ...false,
      }).passthrough();
      return union([booleanSchema(), objectSchema_2], {
        error: (ctx) => {
          let filtered = (ctx.errors ?? []).flat().filter((issue) => issue.path.length > 0);
          if (filtered.length > 0)
            return filtered
              .map((issue) => `${issue.path.join(".")}: ${issue.message.replace(/^Invalid input: /, "")}`)
              .join("; ");
          return `Expected false, true, or an object such as { "commit": "", "pr": "" }, but received ${Array.isArray(ctx.input) ? "array" : ctx.input === null ? "null" : typeof ctx.input}`;
        },
      })
        .transform((value) => {
          if (typeof value !== "boolean") return value;
          return value
            ? {}
            : {
                commit: "",
                pr: "",
                sessionUrl: false,
              };
        })
        .pipe(objectSchema_2)
        .optional()
        .describe(
          'Customize attribution text for commits and PRs. Each field defaults to the standard Claude Code attribution if not set. Set to false to hide all attribution, the same as { "commit": "", "pr": "", "sessionUrl": false }. Setting it to true is the same as leaving it out. Older Claude Code versions reject true or false here, so use the object form in settings files shared across versions.',
        );
    },
    attributionProject: () =>
      stringSchema()
        .optional()
        .describe(
          `The claude.ai Project this session names for your organization's usage reports: the Project's UUID, or its ID starting with "claude_proj_". An empty string names none and stops lower-precedence files from naming one; the organization default still applies. Sent only when Claude Code uses your claude.ai login, connects directly to the Anthropic API, is not in a cloud session, and CLAUDE_CODE_ATTRIBUTION_HEADER is not 0. CLAUDE_CODE_ATTRIBUTION_PROJECT takes precedence over it. Set in managed settings, it overrides people's own settings files. A project's .claude/settings.json and settings.local.json count only once the folder is trusted; for runs in a folder nobody has trusted, such as CI, use CLAUDE_CODE_ATTRIBUTION_PROJECT.`,
        ),
    attributionProjectPolicy: () =>
      objectSchema({
        default: stringSchema()
          .optional()
          .describe(
            'The Project used when neither CLAUDE_CODE_ATTRIBUTION_PROJECT nor attributionProject names one: its UUID, or its ID starting with "claude_proj_".',
          ),
      })
        .optional()
        .describe(
          "Your organization's default for attributionProject. Only honored from managed settings (server-managed, MDM / OS policy, or managed-settings.json); ignored in user, project, local and --settings sources.",
        ),
    includeCoAuthoredBy: () =>
      booleanSchema()
        .optional()
        .describe(
          "Deprecated: Use attribution instead. Whether to include Claude's co-authored by attribution in commits and PRs (defaults to true)",
        ),
    ...false,
    ...false,
    includeGitInstructions: () =>
      booleanSchema()
        .optional()
        .describe(
          "Include built-in commit and PR workflow instructions in Claude's system prompt (default: true)",
        ),
    permissions: () =>
      deferredOptional(() => PermissionsSchema(featureGroups)).describe(
        "Tool usage permissions configuration",
      ),
    model: () => stringSchema().optional().describe("Override the default model used by Claude Code"),
    fallbackModel: () =>
      array(stringSchema())
        .optional()
        .describe(
          'Fallback model(s) tried in order when the primary model is overloaded or unavailable. Each element accepts a model name or alias; "default" expands to the default model. CLI --fallback-model takes precedence.',
        ),
    availableModels: () =>
      array(stringSchema())
        .optional()
        .describe(
          'Allowlist of models that users can select. Accepts family aliases ("opus" allows any opus version), version prefixes ("opus-4-5" allows that version and any model ID that extends it, so "claude-opus-5" also allows "claude-opus-5-5"), and full model IDs. If undefined, all models are available. If empty array, only the default model is available. Typically set in managed settings by enterprise administrators.',
        ),
    enforceAvailableModels: () =>
      booleanSchema()
        .optional()
        .describe(
          "When true and availableModels is a non-empty array, the Default model selection is also constrained: if the default model for the user tier is not in availableModels, Default resolves to the first allowed availableModels entry instead. Has no effect when availableModels is unset or an empty array. Typically set in managed settings by enterprise administrators.",
        ),
    availableModelsMatch: () =>
      _enum(["prefix", "exact"])
        .optional()
        .describe(
          'How availableModels entries match model IDs. "prefix" (the default) lets an entry also allow any model ID that extends it, so "claude-opus-5" allows "claude-opus-5-5". "exact" keeps that matching but stops a model ID entry from allowing other versions: "claude-opus-5" allows Opus 5 and its dated and -fast IDs, but not Opus 5.5 or a later release until it is listed, and a -latest ID needs a -latest entry. Family aliases ("opus") still allow the whole family; aliases whose model depends on the release or settings (best, opusplan, default) are ignored. With "exact" and a list that names at least one model, the Default option also uses only a listed model; if none can be used, Claude Code will not start. Haiku background models, and hooks and other helper requests that pick their own model, are not restricted (deniedModels covers them; allowManagedHooksOnly limits hooks). Read from managed settings only.',
        ),
    deniedModels: () =>
      array(stringSchema())
        .optional()
        .describe(
          'Models users cannot select, even when availableModels allows them. A family alias ("opus") blocks that family. A model ID blocks that version in every spelling: dates, -fast and provider prefixes are ignored, so "claude-opus-5-5" blocks every Opus 5.5 ID but not Opus 5. An ID with no minor version ("claude-opus-5") also blocks later minor versions, as it allows them in availableModels. Aliases whose model depends on the release or settings (best, opusplan, default) are ignored. The Default option steps down past a blocked model; if the Default has no allowed model to step down to, Claude Code will not start. Read from managed settings only.',
        ),
    modelOverrides: () =>
      record(stringSchema(), stringSchema())
        .optional()
        .describe(
          'Override mapping from Anthropic model ID (e.g. "claude-opus-4-6") to provider-specific model ID (e.g. a Bedrock inference profile ARN). Typically set in managed settings by enterprise administrators.',
        ),
    modelPicker: () =>
      objectSchema({
        options: array(outputStylesSettingsSchema()).describe("Rows to show in the /model picker, in order."),
        replaceBuiltInOptions: booleanSchema()
          .optional()
          .describe(
            "When true, the picker shows only the Default row and these options \u2014 the built-in " +
              "lineup, gateway-discovered models and ANTHROPIC_CUSTOM_MODEL_OPTION are hidden. When false or unset, these options are added after the built-in lineup.",
          ),
      })
        .optional()
        .describe(
          "Curate the /model picker: an ordered list of models with your own labels, independent of the built-in lineup and of Claude Code releases. availableModels still applies to these rows. Honored from managed, --settings/SDK, and user settings only (not from a project checkout); the highest-precedence of those that defines modelPicker wins outright (no merging across sources). Typically set in managed settings by enterprise administrators.",
        ),
    modelPricing: () =>
      objectSchema({
        multiplier: mcpSettingsSchema(),
        overrides: record(stringSchema(), hooksSettingsSchema()).optional(),
      })
        .optional()
        .describe(
          "Price usage at your organization's contracted rates instead of list price. " +
            "Affects every spend figure Claude Code reports \u2014 /cost, the status line, the SDK total_cost_usd, " +
            "--max-budget-usd, and the OpenTelemetry cost metric and events \u2014 which remain USD estimates, not an invoice " +
            '(the per-Mtok price labels in /model stay at list). "overrides" maps a model ID to its USD-per-million-token rates (input, output, cacheRead, ' +
            "cacheWrite \u2014 all four required, each 0 to 10000; cacheWrite prices both 5-minute and 1-hour cache writes). " +
            "A matching row is charged exactly as written; fast-mode and US-data-residency surcharges are not added on top. " +
            'A key Claude Code itself uses for a built-in model \u2014 its ID such as "claude-sonnet-4-6", or its ' +
            "first-party, Bedrock (any or no region prefix), Vertex or Foundry ID \u2014 covers every dated and provider form " +
            "of that model; any other key \u2014 a gateway model alias, or a spelling Claude Code does not itself use \u2014 " +
            'matches that model ID only (case-insensitive), and such an exact match wins over a built-in row. On Bedrock an application inference profile is matched by its backing model. An invalid row or multiplier is reported and skipped; the rest still apply. "multiplier" in (0, 10] scales every computed cost, overridden or not (0.85 = 85% of the price, 1.2 = 120%). Only honored from managed settings (server-managed, MDM / OS policy, or managed-settings.json), ' +
            "or \u2014 when none of those sets it \u2014 when supplied by a host application that manages the model " +
            "provider; ignored in user, project, local and --settings sources.",
        ),
    ...false,
    enableAllProjectMcpServers: () =>
      booleanSchema().optional().describe("Whether to automatically approve all MCP servers in the project"),
    enabledMcpjsonServers: () =>
      array(stringSchema()).optional().describe("List of approved MCP servers from .mcp.json"),
    disabledMcpjsonServers: () =>
      array(stringSchema()).optional().describe("List of rejected MCP servers from .mcp.json"),
    disableClaudeAiConnectors: () =>
      booleanSchema()
        .optional()
        .describe(
          "When true in any settings source, claude.ai MCP cloud connectors are not auto-fetched or connected, and a claudeai-proxy server passed explicitly (e.g. via --mcp-config or the SDK mcpServers option) does not connect either. Any-source-true wins: a project can opt out, but a project-level false cannot override a user-level true.",
        ),
    skillOverrides: () =>
      record(stringSchema(), _enum(["on", "name-only", "user-invocable-only", "off"]))
        .optional()
        .describe(
          'Per-skill listing overrides keyed by skill name. "name-only" lists the skill without its description; "user-invocable-only" hides it from the model but keeps /name; "off" hides it from both. Absent = on.',
        ),
    disableBundledSkills: () =>
      booleanSchema()
        .optional()
        .describe(
          "Disable the skills and workflows that ship with Claude Code: bundled skills and workflows are removed entirely; built-in slash commands stay typable but are hidden from the model. Plugins, .claude/skills/, and .claude/commands/ are unaffected. Equivalent to CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1.",
        ),
    managedMcpServers: () =>
      deferredOptional(() =>
        record(
          stringSchema().refine(isValidServerName, {
            error: SERVER_NAME_RULE_MESSAGE,
          }),
          ManagedMcpServerSchema(),
          {
            error: MANAGED_MCP_SERVERS_SHAPE_MESSAGE,
          },
        ),
      ).describe(
        `MCP servers the organization provides to every user, keyed by server name, each with the .mcp.json entry shape; only "http" and "sse" servers are accepted (nothing that names a program to run, no \${VAR} references). Honored from managed settings only; users cannot remove them, deniedMcpServers still applies, and they need no allowedMcpServers entry. Not read in Claude Desktop's Code tab on a third-party deployment or in Cowork sessions, where Claude Desktop supplies and locks the session's MCP servers itself.`,
      ),
    allowedMcpServers: () =>
      deferredOptional(() => array(allowedMcpServersSchema())).describe(
        "Enterprise allowlist of the MCP servers users may use. Governs servers users add (user, project and local config, --mcp-config, agent frontmatter, plugins, claude.ai connectors); servers the organization itself delivers (managedMcpServers, and managed-mcp.json entries with no ${VAR} in their command, args, url or header values) are allowed without being listed; a managed-mcp.json entry with ${VAR} in any of those must match this list. If undefined, all servers are allowed. If empty array, users can use no servers of their own. Denylist takes precedence - if a server is on both lists, it is denied.",
      ),
    deniedMcpServers: () =>
      deferredOptional(() => array(deniedMcpServersSchema())).describe(
        "Enterprise denylist of MCP servers that are explicitly blocked. If a server is on the denylist, it will be blocked across all scopes including enterprise. Denylist takes precedence over allowlist - if a server is on both lists, it is denied.",
      ),
    hooks: () =>
      deferredOptional(() => HooksSchema()).describe("Custom commands to run before/after tool executions"),
    worktree: () =>
      objectSchema({
        symlinkDirectories: array(stringSchema())
          .optional()
          .describe(
            'Directories to symlink from main repository to worktrees to avoid disk bloat. Must be explicitly configured - no directories are symlinked by default. Common examples: "node_modules", ".cache", ".bin"',
          ),
        sparsePaths: array(stringSchema())
          .optional()
          .describe(
            "Directories to include when creating worktrees, via git sparse-checkout (cone mode). " +
              "Dramatically faster in large monorepos \u2014 only the listed paths are written to disk.",
          ),
        baseRef: _enum(["fresh", "head"])
          .optional()
          .describe(
            "Which ref new worktrees branch from. 'fresh' (default) branches from origin/<default-branch> for a clean tree. 'head' branches from your current local HEAD so unpushed commits and feature-branch state are present. Applies to --worktree, EnterWorktree, and agent isolation.",
          ),
        bgIsolation: _enum(["worktree", "none"])
          .optional()
          .catch(undefined)
          .describe(
            "Isolation mode for background sessions in this repo. 'worktree' (default) blocks Edit/Write in the main checkout until EnterWorktree is called. 'none' lets background jobs edit the working copy directly.",
          ),
        location: stringSchema()
          .optional()
          .catch(undefined)
          .describe(
            "Directory under which Claude Code Desktop creates the worktrees of SSH sessions that run on this machine (an absolute path or one starting with ~/), instead of <project>/.claude/worktrees. Read by the desktop app from the SSH host user settings; a location chosen in the desktop app's SSH connection settings takes precedence. The CLI (--worktree, EnterWorktree, agent isolation) does not read it yet.",
          ),
      })
        .optional()
        .describe(
          "Git worktree configuration: the CLI --worktree flag, EnterWorktree and agent isolation, plus the location Claude Code Desktop uses for SSH-session worktrees on this machine.",
        ),
    disableAllHooks: () =>
      booleanSchema()
        .optional()
        .describe(
          "Disable all hooks and statusLine execution: the hooks defined in settings files and by installed plugins. Features built into Claude Code are not hooks in this sense and keep working; each has its own switch.",
        ),
    disableAgentView: () =>
      booleanSchema()
        .optional()
        .describe(
          "Disable agent view (`claude agents`, `--bg`, /background, the on-demand daemon). Typically set in managed settings. Equivalent to CLAUDE_CODE_DISABLE_AGENT_VIEW=1.",
        ),
    disableRemoteControl: () =>
      booleanSchema()
        .optional()
        .describe(
          "Disable Remote Control (claude.ai/code, `claude remote-control`, `--remote-control`/`--rc`, auto-start, and the in-session toggle). Typically set in managed settings.",
        ),
    disableWorkflows: () =>
      booleanSchema()
        .optional()
        .describe(
          "Disable the Workflows feature. Code Review on pull requests and /ultrareview run in Anthropic's cloud and are not stopped by this setting, except an /ultrareview that has to restart partway through. A machine that runs a review itself refuses it when that machine's own administrator set this, or CLAUDE_CODE_DISABLE_WORKFLOWS in an `env` block, in its managed settings (MDM, the managed-settings file or an administrator's policy helper). Set in the environment before Claude Code starts, CLAUDE_CODE_DISABLE_WORKFLOWS disables Workflows. Beyond the cases above it stops a review only when the review's own session starts with it set.",
        ),
    disableArtifact: () =>
      booleanSchema()
        .optional()
        .describe(
          "Deprecated: use enableArtifact: false. Still honored \u2014 true disables the Artifact tool; false is ignored.",
        ),
    enableArtifact: () =>
      booleanSchema()
        .optional()
        .describe(
          "Turn the Artifact tool on or off. Off in any of managed, --settings, or user settings wins; project and local settings can only turn it off. Unset defaults to on once the feature is available.",
        ),
    enableWorkflows: () =>
      booleanSchema()
        .optional()
        .describe(
          "Enable or disable the Workflows feature for this user. Unset = default by plan once the feature is available.",
        ),
    workflowSizeGuideline: () =>
      _enum(["unrestricted", "small", "medium", "large"])
        .optional()
        .describe(
          'Advisory size guideline for the dynamic workflows Claude writes: "small" aims for fewer than 5 agents, "medium" fewer than 10, "large" fewer than 50, and "unrestricted" sends no guideline. Unset defaults to "medium", or "small" on Pro plans. A value here \u2014 including from managed settings \u2014 takes precedence over the "Dynamic workflow size" choice in /config, and that /config row is hidden while a settings file provides the key. This is a guideline, not an enforced limit.',
        ),
    workflowKeywordTriggerEnabled: () =>
      booleanSchema()
        .optional()
        .describe(
          'Enable the "ultracode" keyword trigger: including the keyword in a prompt opts that turn into the Workflow tool. Set to false to disable the trigger. Default: true.',
        ),
    disableSkillShellExecution: () =>
      booleanSchema()
        .optional()
        .describe(
          "Disable inline shell execution in skills and custom slash commands from user, project, or plugin sources. Commands are replaced with a placeholder instead of being run.",
        ),
    defaultShell: () =>
      _enum(["bash", "powershell"])
        .optional()
        .describe(
          "Default shell for input-box ! commands. Defaults to 'bash' on all platforms (no Windows auto-flip).",
        ),
    bashEditDiffEnabled: () =>
      booleanSchema()
        .optional()
        .describe(
          "Whether the Bash tool shows a diff of the files a Bash command changed (PostToolUse Bash hooks get the changed-file list in tool_response). Set to false to turn that off. Default: off, except in auto and bypassPermissions modes when the Bash tool handles file edits or the model's configuration turns it on. Only user, flag or policy settings can turn it on in other modes.",
        ),
    bashOutputMaxChars: () =>
      numberSchema()
        .int()
        .positive()
        .optional()
        .catch(undefined)
        .describe(
          "How many characters of a successful Bash or PowerShell command's output Claude receives inline (default 30000; values clamp to 4000-128000). Output past this is saved to a file and Claude receives a short preview plus the path. When set, this also replaces BASH_MAX_OUTPUT_LENGTH, which on its own only sizes the read-back window.",
        ),
    taskOutputMaxChars: () =>
      numberSchema()
        .int()
        .positive()
        .optional()
        .catch(undefined)
        .describe(
          "Deprecated: no longer has any effect (the TaskOutput tool was removed). Read a background task's output file with the Read tool instead.",
        ),
    respondToBashCommands: () =>
      booleanSchema()
        .optional()
        .describe(
          "Whether Claude responds after an input-box ! bash command runs. Set to false to add the command output to context without a response. Default: true.",
        ),
    allowManagedHooksOnly: () =>
      booleanSchema()
        .optional()
        .describe(
          "When true (and set in managed settings), only hooks from managed settings and from plugins that managed settings enable run. User, project, and local hooks and the hooks of plugins the user installed are ignored. Features built into Claude Code are not hooks in this sense and keep working.",
        ),
    allowedHttpHookUrls: () =>
      array(stringSchema())
        .optional()
        .describe(
          'Allowlist of URL patterns that HTTP hooks may target. Supports * as a wildcard (e.g. "https://hooks.example.com/*"). When set, HTTP hooks with non-matching URLs are blocked. If undefined, all URLs are allowed. If empty array, no HTTP hooks are allowed. Arrays merge across settings sources (same semantics as allowedMcpServers).',
        ),
    httpHookAllowedEnvVars: () =>
      array(stringSchema())
        .optional()
        .describe(
          "Allowlist of environment variable names HTTP hooks may interpolate into headers. When set, each hook's effective allowedEnvVars is the intersection with this list. If undefined, no restriction is applied. Arrays merge across settings sources (same semantics as allowedMcpServers).",
        ),
    allowManagedPermissionRulesOnly: () =>
      booleanSchema()
        .optional()
        .describe(
          "When true (and set in managed settings), permission rules from user, project, local, and --settings files and allow rules from --allowedTools are ignored; only managed settings can add allow rules through settings. " +
            "The allowed-tools frontmatter of skills and custom commands from user, project, and --add-dir sources, and of plugins no managed setting vouches for, is ignored too. Plugins keep theirs only on an admin-backed channel: host-delivered --plugin-dir plugins (in Claude Desktop, only while this is not set by the organization's own managed settings), the official marketplace registered from its unpinned anthropics source, claude.ai-synced plugins Anthropic attests, the saved login organization's claude.ai-hosted marketplaces, marketplaces whose registered source managed extraKnownMarketplaces declares or an exact or owner-pinned (owner/*) strictKnownMarketplaces entry names at the path it pins (an npm marketplace source only when the registration and the declared entry pin the same registry, and a settings marketplace source only when every nested npm plugin entry pins one on a bare package name \u2014 unpinned, the package resolves through the member's own npm config, and a non-bare spelling packs as an exotic spec the pin does not bind, so nothing an entry names is what was fetched), and npm-direct (package@npm) plugins whose recorded resolution a registry-pinned managed npm strictKnownMarketplaces entry names (host and path patterns and enabledPlugins ids do not vouch); managed and bundled skills keep theirs. " +
            "--disallowedTools, skill disallowed-tools, and other deny and ask rules from the command line or the current session still apply.",
        ),
    allowManagedMcpServersOnly: () =>
      booleanSchema()
        .optional()
        .describe(
          "When true (and set in managed settings), allowedMcpServers is only read from managed settings. deniedMcpServers still merges from all sources, so users can deny servers for themselves. Users can still add their own MCP servers, but only the admin-defined allowlist applies.",
        ),
    allowAllClaudeAiMcps: () =>
      booleanSchema()
        .optional()
        .describe(
          "When true (and set in managed settings), claude.ai cloud MCP connectors load alongside managed-mcp.json instead of being suppressed by its exclusive-control lockdown. Default off preserves the lockdown. Read from managed settings only.",
        ),
    allowClaudeInChromeWithManagedMcp: () =>
      booleanSchema()
        .optional()
        .describe(
          "When true (and set in device managed settings: MDM, the managed-settings.json file, or a policy helper those configure), the built-in Claude in Chrome MCP server can run alongside managed-mcp.json instead of being blocked by its exclusive-control lockdown. deniedMcpServers and the organization's Claude in Chrome setting still block it. Default off preserves the lockdown.",
        ),
    strictPluginOnlyCustomization: () =>
      filteredSurfacesSchema()
        .optional()
        .catch(undefined)
        .describe(
          'When set in managed settings, blocks non-plugin customization sources for the listed surfaces. Array form locks specific surfaces (e.g. ["skills", "hooks"]); `true` locks all four; `false` is an explicit no-op. Blocked: ~/.claude/{surface}/, .claude/{surface}/ (project), settings.json hooks, .mcp.json. NOT blocked: managed (policySettings) sources, plugin-provided customizations. ' +
            "Composes with strictKnownMarketplaces for end-to-end admin control \u2014 plugins gated by " +
            "marketplace allowlist, everything else blocked here.",
        ),
    statusLine: () =>
      objectSchema({
        type: literal("command"),
        command: stringSchema(),
        padding: numberSchema().optional(),
        refreshInterval: numberSchema()
          .min(1)
          .optional()
          .catch(undefined)
          .describe("Re-run the status line command every N seconds in addition to event-driven updates"),
        hideVimModeIndicator: booleanSchema()
          .optional()
          .describe(
            "Hide the built-in `-- INSERT --` / `-- VISUAL --` indicator below the prompt. Use this when your status line script renders `vim.mode` itself.",
          ),
      })
        .optional()
        .describe("Custom status line display configuration"),
    prUrlTemplate: () =>
      stringSchema()
        .optional()
        .describe(
          'URL template for PR links in the footer link badges and inline messages. The detected git PR is rendered as the first footer-link badge. Placeholders: {host} {owner} {repo} {number} {url}. Example: "https://reviews.example.com/{owner}/{repo}/pull/{number}"',
        ),
    footerLinksRegexes: () =>
      array(configVariantSchema().catch(INVALID_ENTRY_STRIPPED))
        .transform((entries) => entries.filter((entry) => entry !== INVALID_ENTRY_STRIPPED))
        .optional()
        .catch(undefined)
        .describe(
          "Extra clickable footer badges that appear when a regex matches turn output (tool results and assistant responses). Read from user, flag, and managed settings only; ignored in project .claude/settings.json and local .claude/settings.local.json. At most 5 badges render; the oldest is displaced by newer matches and /clear removes them. Use to surface IDs printed by project CLIs as session links.",
        ),
    subagentStatusLine: () =>
      objectSchema({
        type: literal("command"),
        command: stringSchema(),
      })
        .optional()
        .describe(
          "Custom per-subagent status line shown in the agent panel; receives row context as JSON on stdin",
        ),
    enabledPlugins: () =>
      record(stringSchema(), triStateSchema())
        .optional()
        .describe(
          'Enabled plugins using plugin-id@marketplace-id format. Example: { "formatter@anthropic-tools": true }. Also supports extended format with version constraints. Settings precedence is user < project < local < flag < policy, so to disable a plugin that project settings enable, set it to false in .claude/settings.local.json \u2014 setting false in ~/.claude/settings.json is overridden by the project.',
        ),
    prependPlugins: () =>
      array(stringSchema())
        .optional()
        .catch(undefined)
        .describe(
          "Managed plugins (plugin@marketplace ids that managed enabledPlugins sets true) whose hooks run first, outermost, in the listed order: the first id listed sees every event before any other plugin and every result after it. Managed plugins not listed here or in appendPlugins follow the listed ones; user, project and marketplace plugins come after those; then appendPlugins; then the built-in plugins. The bundled cc-plugin-sec-default@builtin seats itself outermost (on a machine with managed settings and for Team and Enterprise organizations) unless this list is set, in which case list it where it should sit or leave it out. Name it there as sec-default@builtin, the id every release reads, for as long as any machine in the organization may run a release from before its rename; a release that knows the new id reads either. Any other id that is not an enabled managed plugin is skipped; an id listed in both keys is prepended. Only honored from managed settings (or, on a machine with none, from user settings for your own plugins); ignored in project, local and --settings sources.",
        ),
    appendPlugins: () =>
      array(stringSchema())
        .optional()
        .catch(undefined)
        .describe(
          "Managed plugins (plugin@marketplace ids that managed enabledPlugins sets true) whose hooks run last among plugins, innermost, in the listed order: the last id listed sits just above the built-in plugins and sees each event as every other plugin left it. Only honored from managed settings (or, on a machine with none, from user settings for your own plugins); ignored in project, local and --settings sources.",
        ),
    extraKnownMarketplaces: () =>
      deferredOptional(() => marketplaceSchema("extraKnownMarketplaces")).describe(
        "Additional marketplaces to make available for this repository. Typically used in repository .claude/settings.json to ensure team members have required plugin sources.",
      ),
    additionalMarketplaces: () =>
      deferredOptional(() => marketplaceSchema("additionalMarketplaces")).describe(
        "Alias for extraKnownMarketplaces: this key is read exactly as if it were spelled " +
          "extraKnownMarketplaces. Do not set both in one file \u2014 if both appear, this key is ignored " +
          "with a warning. Claude Code may rewrite this key as extraKnownMarketplaces when it updates the file. Clients older than this alias ignore it, so prefer extraKnownMarketplaces while older Claude Code versions still share the same settings.",
      ),
    strictKnownMarketplaces: () =>
      deferredOptional(() => array(MarketplaceSourceSchemaLazy())).describe(
        'Enterprise strict list of allowed marketplace sources. When set in managed settings, ONLY these sources can be added as marketplaces. Entries match exactly, except that a github entry may use the owner-wildcard form {"source":"github","repo":"owner/*"} to allow every repository under that owner. The check happens BEFORE downloading, so blocked sources never touch the filesystem. ' +
          "Note: this is a policy gate only \u2014 it does NOT register marketplaces. " +
          "To pre-register allowed marketplaces for users, also set extraKnownMarketplaces.",
      ),
    allowedMarketplaces: () =>
      deferredOptional(() => array(MarketplaceSourceSchemaLazy())).describe(
        "Alias for strictKnownMarketplaces (managed settings only): this key is read exactly as if it " +
          "were spelled strictKnownMarketplaces. Do not set both in one file \u2014 if both appear, this key " +
          "is ignored with a warning. Clients older than this alias ignore it, so keep using strictKnownMarketplaces when the allowlist must also bind older Claude Code versions.",
      ),
    blockedMarketplaces: () =>
      deferredOptional(() => array(MarketplacePolicySourceSchema())).describe(
        'Enterprise blocklist of marketplace sources. When set in managed settings, these sources are blocked from being added as marketplaces. Entries match exactly, except that a github entry may use the owner-wildcard form {"source":"github","repo":"owner/*"} to block every repository under that owner. The check happens BEFORE downloading, so blocked sources never touch the filesystem.',
      ),
    disableCommandPluginSources: () =>
      booleanSchema()
        .optional()
        .describe(
          "Controls the `command` plugin source, whose plugin directory is produced by running a marketplace-declared command on this machine. true: command-sourced plugins are never installed, updated, or re-resolved (the command never runs). false: explicitly allowed. " +
            "Unset: follows allowManagedHooksOnly \u2014 an org that restricts hook execution to managed " +
            "settings gets command sources disabled too. Only honored from managed settings.",
        ),
    ...false,
    disableSideloadFlags: () =>
      booleanSchema()
        .optional()
        .describe(
          "When true (and set in managed settings), rejects the --plugin-dir, --plugin-url, --agents, and non-sdk --mcp-config CLI flags at startup. Closes the CLI-flag bypass of strictKnownMarketplaces. Pair with allowedMcpServers for per-server MCP control; this setting does not gate other MCP entry points (SDK setMcpServers, claude mcp add, .mcp.json). Also blocks surfaces that spawn the CLI with these flags internally (see settings documentation). Only honored from managed settings; ignored in user/project/local settings.",
        ),
    pluginSuggestionMarketplaces: () =>
      array(stringSchema())
        .optional()
        .describe(
          "Marketplace names whose plugins may surface as contextual install suggestions (relevance-based tips). No marketplace-declared suggestions surface without this allowlist; the built-in first-party frontend-design tip is unaffected. Only honored when set in managed settings (policy scope); the key is ignored in user, project, and local settings. A name only takes effect when the marketplace is registered on the machine AND its registered source is also declared in managed settings, either as the extraKnownMarketplaces entry for that name or as an entry of strictKnownMarketplaces. A marketplace registered from a different source under an allowlisted name is ignored. The official marketplace is exempt from the source requirement: allowlisting its name alone suffices, since that name can only register from the official Anthropic source.",
        ),
    forceLoginMethod: () =>
      _enum(["claudeai", "console", "gateway"])
        .optional()
        .catch(undefined)
        .describe(
          'Force a specific login method: "claudeai" for Claude Pro/Max, "console" for Console billing, "gateway" for the Cloud gateway OIDC device flow',
        ),
    forceLoginGatewayUrl: () =>
      stringSchema()
        .min(1)
        .optional()
        .catch(undefined)
        .describe(
          'Cloud gateway URL to pre-fill during login, alongside forceLoginMethod: "gateway". Honored from admin-controlled managed settings (MDM / managed-settings.json / policy helper) and, on a machine with none of those, from your own user settings; ignored in project, local, flag, and remote-delivered settings.',
        ),
    gatewayInternalNetworks: () =>
      array(stringSchema())
        .optional()
        .catch([UNREADABLE_SETTING_MARKER])
        .meta({
          default: undefined,
        })
        .describe(
          "IPv4 CIDR blocks (at most 4, each /8 to /32, not overlapping) your Cloud gateway sits in: the public block your organization numbers its internal network from, which lets /login reach a gateway there. A block must lie entirely outside private space, where /login accepts a gateway without this key. /login accepts a gateway inside a listed block over a direct connection only, and only when this machine's own address on that connection is inside the same block, so /login must happen from a machine whose own address is inside the block (not through a proxy, VPN pool, container or NAT segment outside it). A bar against copied settings files, not proof of location. Honored only from admin-controlled managed settings (MDM / managed-settings.json / policy helper); ignored in user, project, and remote-delivered settings.",
        ),
    parentSettingsBehavior: () =>
      _enum(["first-wins", "merge"])
        .optional()
        .describe(
          `Controls whether the SDK parent tier (Options.managedSettings / --managed-settings) layers under this admin tier. "first-wins" (the default, except in a gateway session Claude Desktop's Code ` +
            'tab launched, where "merge" is): parent is dropped \u2014 admin tiers ' +
            `are the only policy source. "merge": parent's restrictive-only-filtered settings union under the admin winner. Has no effect when no admin tier exists (parent applies as the sole policy tier, still filtered restrictive-only).`,
        ),
    managedSourcesBehavior: () =>
      _enum(["first-wins", "merge"])
        .optional()
        .describe(
          'Controls how the managed settings sources compose. "first-wins" (default): the highest-priority source present (server-managed > MDM (managed plist / HKLM) > managed-settings.json) is the managed tier alone. "merge": every present source deep-merges with fixed ' +
            "precedence server-managed > MDM > managed-settings.json \u2014 scalars " +
            "take the highest source's value (a restrictive boolean or enum \u2014 " +
            "the allowManaged*Only locks, the disable* switches, the sandbox " +
            "lock family \u2014 takes the strictest value any source sets) and " +
            "arrays union, except fallbackModel, the restriction allowlists allowedMcpServers, allowedProviders, availableModels, strictKnownMarketplaces and allowedChannelPlugins, and sandbox.credentials.awsPairs and sandbox.ripgrep (the highest source that sets one owns it whole), modelOverrides (the whole map of the highest source that sets it, dropped when that source sits below the one that sets availableModels), managedMcpServers (server names union; a name set by two sources takes the higher source's whole entry), and the keys taken from the highest source only: the auth pins forceLoginOrgUUID, forceLoginMethod, forceLoginGatewayUrl and gatewayInternalNetworks, the credential helpers apiKeyHelper, awsAuthRefresh, awsCredentialExport, gcpAuthRefresh, otelHeadersHelper and proxyAuthHelper, modelPicker, permissions.defaultMode, parentSettingsBehavior and the policyHelper configuration (env keeps its own per-key union). In both modes, a forceLoginOrgUUID, or a forceLoginMethod of claudeai or console, that this machine's own MDM policy or managed settings file sets applies ahead of server-managed settings. Honored only from the highest-priority source present; enable it only when every lower source is admin-controlled, since lower sources then contribute entries such as permissions.allow. HKCU and --managed-settings never take part in the merge.",
        ),
    forceLoginOrgUUID: () =>
      union([stringSchema(), array(stringSchema())])
        .optional()
        .describe(
          "Organization UUID to require for OAuth login. Accepts a single UUID string or an array of UUIDs (any one is permitted). When set in managed settings, login fails if the authenticated account does not belong to a listed organization.",
        ),
    allowedProviders: () =>
      preprocess(
        (providers) => (Array.isArray(providers) ? providers.filter(isApiProviderKind) : providers),
        array(_enum(API_PROVIDER_KINDS)),
      )
        .optional()
        .catch(undefined)
        .describe(
          `Managed settings only (managed-settings.json, MDM, or server-managed). The API providers Claude Code may use on this machine: "anthropic" (the Anthropic API on Anthropic's own host, via a claude.ai or Console sign-in or an API key; pair it with forceLoginMethod / forceLoginOrgUUID to require a sign-in), "bedrock", "vertex", "foundry", "anthropicAws", "mantle" (each meaning that provider's own service: its regional, FIPS, private-endpoint and sovereign-cloud hosts), "customEndpoint" (the ` +
            "Anthropic API or a cloud provider's API sent to some other host \u2014 ANTHROPIC_BASE_URL, that " +
            "provider's ANTHROPIC_*_BASE_URL, a Foundry resource name that is not a bare name, or for " +
            "Bedrock the AWS SDK's AWS_ENDPOINT_URL[_BEDROCK[_RUNTIME]] \u2014 such as an LLM gateway; admitted " +
            `only for the value pinned in the "env" block of the same managed source), or "gateway" (the Cloud gateway sign-in). A session on a provider that is not listed is refused at startup, at login, and when it next contacts the API, with a message naming what selected the provider and the entry that would allow it. Under a list, where first-party traffic goes (ANTHROPIC_BASE_URL, a gateway sign-in) is honored only when the same managed source pins it in "env" (or forceLoginGatewayUrl), and a claude ssh tunnel into the machine is refused. A cloud provider's credential and tenancy variables, and the network path and TLS trust (HTTPS_PROXY, NODE_EXTRA_CA_CERTS, CLAUDE_CODE_CERT_STORE), are not judged by this list; set those for the fleet in the managed "env" block, whose values replace the user's. To route Bedrock through a gateway for a fleet, pin ANTHROPIC_BEDROCK_BASE_URL there (it is what the clients use, ahead of an endpoint_url in ~/.aws/config, which this list does not judge); the AWS SDK's AWS_ENDPOINT_URL* pins only sanction where the SDK's own clients go and never stand in for the "bedrock" entry. Unset allows every provider; an empty array allows none. Only a list in managed-settings.json or MDM is enforcement on the machine: it cannot be widened or hidden by server-managed settings and reaches every session. A list set ` +
            "only in the admin console reaches only sessions that fetch your server-managed settings \u2014 not " +
            "a session on a cloud provider, another organization or a non-Anthropic ANTHROPIC_BASE_URL, one authenticating only with apiKeyHelper or ANTHROPIC_AUTH_TOKEN, a Pro/Max login, --bare without " +
            "an API key, or a first launch before the fetch lands \u2014 all conditions the user controls. " +
            `Versions that predate this setting ignore it; pair it with a minimum-version policy on a mixed fleet. 'claude auth status' reports the Anthropic API as apiProvider "firstParty".`,
        ),
    ...false,
    forceRemoteSettingsRefresh: () =>
      booleanSchema()
        .optional()
        .describe(
          "When set in managed settings, the CLI blocks startup until remote managed settings are freshly fetched, and exits if the fetch fails",
        ),
    otelHeadersHelper: () =>
      stringSchema().optional().describe("Path to a script that outputs OpenTelemetry headers"),
    outputStyle: () =>
      stringSchema().optional().describe("Controls the output style for assistant responses"),
    viewMode: () =>
      _enum(["default", "verbose", "focus"])
        .optional()
        .catch(undefined)
        .describe("Default transcript view mode on startup"),
    language: () =>
      stringSchema()
        .optional()
        .describe(
          'Preferred language for Claude responses and voice dictation (e.g., "japanese", "spanish")',
        ),
    skipWebFetchPreflight: () =>
      booleanSchema()
        .optional()
        .describe(
          "Skip the WebFetch blocklist check for enterprise environments with restrictive security policies",
        ),
    sandbox: () => deferredOptional(() => sandboxFilesystemSettingsSchema()),
    ...false,
    feedbackSurveyRate: () =>
      numberSchema()
        .min(0)
        .max(1)
        .optional()
        .describe(
          "Probability (0\u20131) that the session quality survey appears when eligible. 0.05 is a reasonable starting point.",
        ),
    feedbackDrafts: () =>
      _enum(["notify", "quiet", "off"])
        .optional()
        .describe(
          'Model-drafted feedback (the SendFeedback tool). "notify" (default) shows a one-line notice when a draft is queued; "quiet" shows only the footer counter; "off" disables the tool entirely so drafts are never queued.',
        ),
    spinnerTipsEnabled: () => booleanSchema().optional().describe("Whether to show tips in the spinner"),
    spinnerVerbs: () =>
      objectSchema({
        mode: _enum(["append", "replace"]),
        verbs: array(stringSchema()),
      })
        .optional()
        .describe(
          'Customize spinner verbs. mode: "append" adds verbs to defaults, "replace" uses only your verbs.',
        ),
    spinnerTipsOverride: () =>
      objectSchema({
        excludeDefault: booleanSchema().optional().catch(undefined),
        tips: skillsSettingsSchema().optional(),
        tipsFile: stringSchema()
          .optional()
          .catch(undefined)
          .describe(
            "Absolute or ~/ local path to a JSON file holding an array of tips (same shapes as `tips`); honored from user, --settings and on-disk managed settings only. Read once per CLI process (restart to pick up edits).",
          ),
        label: stringSchema()
          .optional()
          .catch(undefined)
          .describe('Prefix shown before your tips in the spinner (default "Tip")'),
      })
        .passthrough()
        .optional()
        .catch(undefined)
        .describe(
          "Add your organization's own tips to the spinner tip rotation. tips: strings or {id, text, cooldownSessions?, priority?} objects; tipsFile: a JSON file of the same; label: prefix shown before your tips; excludeDefault: if true, only show your tips (default: false).",
        ),
    syntaxHighlightingDisabled: () =>
      booleanSchema().optional().describe("Whether to disable syntax highlighting in diffs"),
    maxProseWidth: () =>
      numberSchema()
        .int()
        .min(40)
        .optional()
        .catch(undefined)
        .describe(
          "Maximum width, in terminal columns, of the prose in Claude's responses (paragraphs, headings, lists, blockquotes). In a wider terminal the prose wraps at this width while tables and code blocks keep the full width; only the display wraps, the response text itself gains no line breaks. Minimum 40. Unset (the default) uses the full terminal width.",
        ),
    spellcheck: () =>
      objectSchema({
        enabled: booleanSchema()
          .optional()
          .catch(undefined)
          .describe("Turn on spell checking of the prompt input (default: false)"),
        checker: stringSchema()
          .optional()
          .catch(undefined)
          .describe(
            `Which spell checker to run: ${SPELLCHECK_PROGRAMS.map((program) => `"${program}"`).join(", ")}, or "auto" (default) for the first of those found on PATH`,
          ),
        language: stringSchema()
          .optional()
          .catch(undefined)
          .describe(
            `Dictionary to use, passed to the checker as-is (aspell --lang, hunspell -d, ispell -d), e.g. "en_GB"; names are checker-specific (letters, digits and _ - . , only). Default: the checker's own default`,
          ),
        color: stringSchema()
          .optional()
          .catch(undefined)
          .describe(
            `Color of misspelled words (they are also underlined): a terminal color name such as "red" or "magenta", "#rrggbb", "rgb(r,g,b)", "ansi256(n)" or "ansi:<name>". Default: the theme's error color`,
          ),
      })
        .passthrough()
        .optional()
        .catch(undefined)
        .describe(
          `Underline misspelled words in the prompt input as you type, using an installed ${SPELLCHECK_PROGRAMS.slice(0, -1).join(", ")} or ${SPELLCHECK_PROGRAMS.at(-1)} (off unless "enabled" is true; does nothing if none is installed). Read from user, flag and managed settings only (the whole block from the highest-precedence of those applies); ignored in project .claude/settings.json and .claude/settings.local.json.`,
        ),
    terminalTitleFromRename: () =>
      booleanSchema()
        .optional()
        .describe(
          "Whether /rename updates the terminal tab title (defaults to true). Set to false to keep auto-generated topic titles.",
        ),
    promptCacheTtl: () =>
      _enum(CACHE_TTL_VALUES)
        .optional()
        .catch(undefined)
        .describe(
          'Prompt cache TTL for the main conversation (interactive, -p and SDK turns, plus the helpers that run inline with it): "5m" or "1h". Unset = automatic: 1 hour on a Claude subscription within its usage limits, 5 minutes on an API key, Bedrock, Vertex or Foundry. 1-hour cache writes are billed at a higher rate; the cache stays warm across longer breaks. The CLAUDE_CODE_PROMPT_CACHE_TTL environment variable takes precedence.',
        ),
    subagentPromptCacheTtl: () =>
      _enum(CACHE_TTL_VALUES)
        .optional()
        .catch(undefined)
        .describe(
          "Prompt cache TTL for everything outside the main conversation \u2014 subagents, workflows, background and helper requests: " +
            '"5m" or "1h". Unset = automatic (5 minutes unless ENABLE_PROMPT_CACHING_1H=1). The CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL environment variable takes precedence.',
        ),
    alwaysThinkingEnabled: () =>
      booleanSchema()
        .optional()
        .describe(
          "When false, thinking is disabled. When absent or true, thinking is enabled automatically for supported models.",
        ),
    effortLevel: () =>
      _enum(["low", "medium", "high", "xhigh"])
        .optional()
        .catch(undefined)
        .describe("Persisted effort level for supported models."),
    maxEffortLevel: () =>
      _enum(EFFORT_LEVELS)
        .optional()
        .catch(undefined)
        .describe(
          "Maximum effort level. Anything above it (an /effort or /model pick, --effort, CLAUDE_CODE_EFFORT_LEVEL, a model default) is clamped to it, on every provider including Bedrock, Vertex and Foundry. Combines with an organization's per-model effort cap by taking the lower of the two; across settings files the lowest value wins, and modelSettings.<model>.maxEffortLevel replaces it per model. Enforced client-side: an effort supplied through CLAUDE_CODE_EXTRA_BODY is not clamped.",
        ),
    modelSettings: () =>
      preprocess(
        (modelSettings) =>
          typeof modelSettings === "object" && modelSettings !== null && !Array.isArray(modelSettings)
            ? import_reject(modelSettings, (value, protoKey) => Object.hasOwn(Object.prototype, protoKey))
            : modelSettings,
        record(
          stringSchema(),
          objectSchema({
            effortLevel: _enum(["low", "medium", "high", "xhigh"])
              .optional()
              .catch(undefined)
              .describe("Persisted effort level for this model."),
            maxEffortLevel: _enum(EFFORT_LEVELS)
              .optional()
              .catch(undefined)
              .describe(
                'Maximum effort level for this model. Within one settings file it replaces the top-level maxEffortLevel for the model ("max" exempts it); across settings files the lowest applicable value wins. Keyed like effortLevel: the canonical model name also matches its dated, [1m], Bedrock and Vertex spellings.',
              ),
            autoCompactWindow: union([literal("auto"), configVariantUnionSchema()]).describe(
              'Auto-compact window for this model, in tokens (100000 to 1000000), or "auto" for the window tuned for the model. Within one settings file it replaces the top-level autoCompactWindow for the model. /autocompact saves here. The canonical model name as key also matches its dated, [1m], Bedrock and Vertex spellings.',
            ),
          })
            .passthrough()
            .optional()
            .catch(undefined),
        ),
      )
        .optional()
        .catch(undefined)
        .describe("Per-model settings keyed by canonical model name."),
    ultracode: () =>
      booleanSchema()
        .optional()
        .catch(undefined)
        .describe(
          "Enable ultracode for the session: standing dynamic-workflow orchestration at any effort level. " +
            "Session-scoped \u2014 typically provided via --settings or the apply_flag_settings control request; " +
            "interactive toggles never persist it. Requires workflows to be enabled and a model that supports ultracode.",
        ),
    autoCompactWindow: () => configVariantUnionSchema().describe("Auto-compact window size"),
    ...false,
    advisorModel: () => stringSchema().optional().describe("Advisor model for the server-side advisor tool."),
    fastMode: () =>
      booleanSchema()
        .optional()
        .describe("When true, fast mode is enabled. When absent or false, fast mode is off."),
    fastModePerSessionOptIn: () =>
      booleanSchema()
        .optional()
        .describe(
          "When true, fast mode does not persist across sessions. Each session starts with fast mode off.",
        ),
    promptSuggestionEnabled: () =>
      booleanSchema()
        .optional()
        .describe(
          "When false, prompt suggestions are disabled. When absent or true, prompt suggestions are enabled.",
        ),
    emojiCompletionEnabled: () =>
      booleanSchema()
        .optional()
        .describe(
          "When false, the :emoji: shortcode typeahead (the suggestion popup and the :name: inline replacement) is disabled. When absent or true, it is enabled.",
        ),
    awaySummaryEnabled: () =>
      booleanSchema()
        .optional()
        .describe(
          "@internal When false, the session recap (shown when you return after being away for 5+ minutes) is disabled. When absent or true, recap is enabled. Hidden from public SDK types until external launch.",
        ),
    responseComparisonEnabled: () =>
      booleanSchema()
        .optional()
        .describe(
          "@internal Set to false to stop Claude Code from showing two answers to one message and asking which is better. When absent or true, it may do so on some turns. Hidden from public SDK types until external launch.",
        ),
    showClearContextOnPlanAccept: () =>
      booleanSchema()
        .optional()
        .describe('When true, the plan-approval dialog offers a "clear context" option. Defaults to false.'),
    askUserQuestionTimeout: () =>
      _enum(["60s", "5m", "10m", "never"])
        .optional()
        .catch(undefined)
        .describe(
          "Idle time before Claude's questions auto-continue with any answers " +
            "selected so far. Defaults to never \u2014 auto-continue only runs " +
            "when explicitly set to 60s/5m/10m.",
        ),
    dialogExpiry: () =>
      _enum(["60s", "5m", "10m", "never"])
        .optional()
        .catch(undefined)
        .describe(
          'Max time a permission/user dialog forwarded to a remote client stays parked awaiting an answer, and how long a HELD cross-session message awaits approval, before either resolves to its safe no-action default (cancelled / dropped-with-denial). Defaults to 5m to match the long-standing remote-dialog deadline; "never" disables the deadline. Local-only permission prompts (no remote client) are unaffected. The CLAUDE_CODE_USER_DIALOG_TIMEOUT_MS env var, when set, overrides this. Read from trusted sources only (never a checked-in repo settings file).',
        ),
    agent: () =>
      stringSchema()
        .optional()
        .describe(
          "Name of an agent (built-in or custom) to use for the main thread. Applies the agent's system prompt, tool restrictions, and model.",
        ),
    modelProposedGoals: () =>
      _enum(CONFIG_BACKEND_LABELS)
        .optional()
        .catch(undefined)
        .describe(
          "@internal Controls the ProposeGoal tool (model-proposed session goals). 'auto' (the default when absent) lets the model choose per proposal whether to ask for approval via its ask_user parameter; 'alwaysAsk' routes every model-proposed goal through the approval dialog; 'disabled' turns the tool off. A typed /goal is unaffected. Consent-affecting, so it is read " +
            "from trusted sources only (user/policy/flag) \u2014 " +
            "workspace-resident project and local settings are ignored.",
        ),
    companyAnnouncements: () =>
      array(stringSchema())
        .optional()
        .describe(
          "Company announcements to display at startup (one will be randomly selected if multiple are provided)",
        ),
    pluginConfigs: () =>
      record(
        stringSchema(),
        objectSchema({
          mcpServers: record(
            stringSchema(),
            record(
              stringSchema(),
              union([stringSchema(), numberSchema(), booleanSchema(), array(stringSchema())]),
            ),
          )
            .optional()
            .describe("User configuration values for MCP servers keyed by server name"),
          options: record(
            stringSchema(),
            union([stringSchema(), numberSchema(), booleanSchema(), array(stringSchema())]),
          )
            .optional()
            .describe(
              "Non-sensitive option values from plugin manifest userConfig, keyed by option name. Sensitive values go to secure storage instead.",
            ),
        }).or(undefinedSchema()),
      )
        .optional()
        .describe(
          "Per-plugin configuration including MCP server user configs, keyed by plugin ID (plugin@marketplace format)",
        ),
    remote: () =>
      objectSchema({
        defaultEnvironmentId: stringSchema()
          .optional()
          .describe("Default environment ID to use for cloud sessions"),
      })
        .optional()
        .describe("Cloud session configuration"),
    autoUpdatesChannel: () =>
      _enum(["latest", "stable", "rc"])
        .optional()
        .describe("Release channel for auto-updates (latest or stable)"),
    minimumVersion: () =>
      stringSchema()
        .optional()
        .describe("Minimum version to stay on - prevents downgrades when switching to stable channel"),
    requiredMinimumVersion: () =>
      stringSchema()
        .optional()
        .describe(
          "Minimum Claude Code version required to start. If the running version is older, Claude Code exits at startup with instructions to update. Only enforced from managed (policy) settings.",
        ),
    requiredMaximumVersion: () =>
      stringSchema()
        .optional()
        .describe(
          "Maximum Claude Code version allowed to start. If the running version is newer, Claude Code exits at startup with instructions to install an approved version. Only enforced from managed (policy) settings.",
        ),
    plansDirectory: () =>
      stringSchema()
        .optional()
        .describe(
          "Custom directory for plan files, relative to project root. If not set, defaults to ~/.claude/plans/",
        ),
    tui: () =>
      _enum(["default", "fullscreen"])
        .optional()
        .describe(
          'Terminal UI renderer. "fullscreen" uses the flicker-free alt-screen renderer with virtualized scrollback (equivalent to CLAUDE_CODE_NO_FLICKER=1). "default" uses the classic main-screen renderer.',
        ),
    ...false,
    voice: () =>
      objectSchema({
        enabled: booleanSchema().optional(),
        mode: _enum(["hold", "tap"])
          .optional()
          .describe("'hold' (default): hold to talk. 'tap': tap to start, tap to stop+submit."),
        autoSubmit: booleanSchema()
          .optional()
          .describe("Submit the prompt when hold-to-talk is released (hold mode only)"),
      })
        .optional()
        .describe("Voice mode settings (hold-to-talk / tap-to-toggle dictation)"),
    channelsEnabled: () =>
      booleanSchema()
        .optional()
        .describe(
          "Managed-org opt-in for channel notifications (MCP servers with the claude/channel capability pushing inbound messages). claude.ai Teams/Enterprise: default off. Console: default on unless managed settings exist. Set true to allow; users then select servers via --channels.",
        ),
    allowedChannelPlugins: () =>
      array(modelPricingSchema())
        .optional()
        .describe(
          "Managed-org allowlist of channel plugins. When set, " +
            "replaces the default Anthropic allowlist \u2014 admins decide which " +
            "plugins may push inbound messages. Undefined falls back to the default. Requires channelsEnabled: true.",
        ),
    prefersReducedMotion: () =>
      booleanSchema()
        .optional()
        .describe("Reduce or disable animations for accessibility (spinner shimmer, flash effects, etc.)"),
    timeFormat: () =>
      union([_enum(AUTO_CONNECT_LABELS), stringSchema()])
        .optional()
        .describe(
          'Clock format for times shown in the UI: "auto" (default, follows the locale), "12-hour", "24-hour", "24-hour-utc" ("18:05Z"), or a strftime pattern such as "%H:%M" (any value containing "%"; other values read as "auto"). A pattern replaces the time everywhere; message timestamps show only the pattern, so include %Y-%m-%d for the date. /config offers the presets; a pattern is set here.',
        ),
    timeZone: () =>
      stringSchema()
        .optional()
        .describe(
          'IANA time zone for times shown in the UI, e.g. "UTC" or "Europe/Dublin". Default: the system time zone. An unknown name falls back to the system time zone.',
        ),
    doneMeansMerged: () =>
      booleanSchema()
        .optional()
        .describe(
          "@internal When true, Claude keeps working until the PR is ready for you to merge, a cron/Monitor is armed to resume later, or it hands you a self-contained next step.",
        ),
    totalTokensReminder: () =>
      _enum(["off", "infinite", "fixed", "countdown", "padded-countdown"])
        .optional()
        .describe(
          "@internal Emit a <total_tokens>N tokens left</total_tokens> block in the system prompt, after each tool result, and (when totalTokensReminderAfterUserTurn is on) after each regular user prompt. 'infinite' uses the literal value Infinite, 'fixed' uses 5000000, 'countdown' uses the live remaining context-window tokens, 'padded-countdown' counts down from totalTokensReminderBudget (re-anchoring to the full budget on each regular user prompt when totalTokensReminderAfterUserTurn " +
            "is on \u2014 task-budget semantics). Defaults to padded-countdown for a " +
            "model with the total_tokens_reminder capability, else off. Env var CLAUDE_CODE_TOTAL_TOKENS_REMINDER overrides.",
        ),
    totalTokensReminderBudget: () =>
      numberSchema()
        .int()
        .positive()
        .optional()
        .describe(
          "@internal Starting budget (tokens) for totalTokensReminder 'padded-countdown' mode. Defaults to 15000000. Server-controlled via GrowthBook; env var CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET overrides.",
        ),
    totalTokensReminderAfterUserTurn: () =>
      booleanSchema()
        .optional()
        .describe(
          "@internal When true, emit the totalTokensReminder block after each regular user prompt and (for 'padded-countdown') re-anchor the task budget to the full configured value at the start of each user turn. When false, the reminder appears only in the system prompt and after each tool-result batch, and 'padded-countdown' counts down over the whole session. Defaults to on. Env var CLAUDE_CODE_TOTAL_TOKENS_REMINDER_AFTER_USER_TURN overrides; server-controlled via GrowthBook tengu_lapis_anchor_user_turn.",
        ),
    autoMemoryEnabled: () =>
      booleanSchema()
        .optional()
        .describe(
          "Enable auto-memory for this project. When false, Claude will not read from or write to the auto-memory directory.",
        ),
    autoMemoryDirectory: () =>
      stringSchema()
        .optional()
        .describe(
          "Custom directory path for auto-memory storage. Supports ~/ prefix for home directory expansion. Ignored if set in projectSettings (checked-in .claude/settings.json) for security. When unset, defaults to ~/.claude/projects/<sanitized-cwd>/memory/.",
        ),
    ...false,
    autoDreamEnabled: () =>
      booleanSchema()
        .optional()
        .describe(
          "Enable background memory consolidation (auto-dream). When set, overrides the server-side default.",
        ),
    showThinkingSummaries: () =>
      booleanSchema()
        .optional()
        .describe(
          "Request API-side thinking summaries and show them in the conversation and in the transcript view (ctrl+o). Set explicitly to override the default for your install.",
        ),
    skipDangerousModePermissionPrompt: () =>
      booleanSchema().optional().describe("Whether the user has accepted the bypass permissions mode dialog"),
    skipWorkflowUsageWarning: () =>
      booleanSchema()
        .optional()
        .describe(
          "@internal Whether the user has accepted the multi-agent workflow usage warning. Until set, auto permission mode prompts before running a workflow.",
        ),
    disableAutoMode: () => _enum(["disable"]).optional().describe("Disable auto mode"),
    remoteTools: () =>
      objectSchema({
        allowUnattendedServing: booleanSchema()
          .optional()
          .describe(
            "@internal When false in managed or user settings, a cloud session in auto mode may not run commands on this computer without a person approving each one, whatever consent the computer has given; a project, local or --settings value is ignored. Default: true.",
          ),
      })
        .optional()
        .describe("@internal How this computer serves tool calls to cloud sessions"),
    sshConfigs: () =>
      array(
        objectSchema({
          id: stringSchema().describe(
            "Unique identifier for this SSH config. Used to match configs across settings sources.",
          ),
          name: stringSchema().describe("Display name for the SSH connection"),
          sshHost: stringSchema().describe(
            'SSH host in format "user@hostname" or "hostname", or a host alias from ~/.ssh/config',
          ),
          sshPort: numberSchema().int().optional().describe("SSH port (default: 22)"),
          sshIdentityFile: stringSchema().optional().describe("Path to SSH identity file (private key)"),
          startDirectory: stringSchema()
            .optional()
            .describe(
              "Default working directory on the remote host. Supports tilde expansion (e.g. ~/projects). If not specified, defaults to the remote user home directory. Can be overridden by the [dir] positional argument in `claude ssh <config> [dir]`.",
            ),
        }),
      )
        .optional()
        .describe(
          "SSH connection configurations for remote environments. Typically set in managed settings by enterprise administrators to pre-configure SSH connections for team members.",
        ),
    sshHostCommands: () =>
      unknown()
        .meta({
          type: "array",
        })
        .optional()
        .describe(
          "SSH connections in Claude Desktop on macOS and Linux whose host comes from a command. A list of entries, each with `id`, `name` and `command`, and optionally `sshIdentityFile` and `startDirectory`. When you ask Desktop to create or replace an entry's host, it runs `command` on this computer: a program name or absolute path, followed by plain arguments. There is no shell, so quotes, pipes, variables and a leading `~` do not work. The command must print only the host on standard output: `host` or `user@host` on one line, or a JSON object with `sshHost` and, optionally, `sshPort` and `startDirectory`. Desktop reads this key only from user settings and from this computer's managed settings. Claude Code itself does not use it.",
        ),
    claudeMd: () =>
      stringSchema()
        .optional()
        .describe(
          "CLAUDE.md-style instructions injected as organization-managed memory. Only honored from managed/policy settings.",
        ),
    claudeMdExcludes: () =>
      array(stringSchema())
        .optional()
        .describe(
          'Glob patterns or absolute paths of CLAUDE.md files to exclude from loading. Patterns are matched against absolute file paths using picomatch. Only applies to User, Project, and Local memory types (Managed/policy files cannot be excluded). Examples: "/home/user/monorepo/CLAUDE.md", "**/code/CLAUDE.md", "**/some-dir/.claude/rules/**"',
        ),
    pluginTrustMessage: () =>
      stringSchema()
        .optional()
        .describe(
          'Custom message to append to the plugin trust warning shown before installation. Only read from policy settings (managed-settings.json / MDM). Useful for enterprise administrators to add organization-specific context (e.g., "All plugins from our internal marketplace are vetted and approved.").',
        ),
    theme: () =>
      union([
        _enum(CONFIG_SOURCE_LABELS),
        stringSchema()
          .startsWith("custom:")
          .transform((value) => value),
      ])
        .optional()
        .catch(undefined)
        .describe("Color theme for the UI"),
    editorMode: () =>
      _enum(EDITOR_MODES).optional().catch(undefined).describe("Key binding mode for the prompt input"),
    keybindingFlavor: () =>
      _enum(["classic", "readline"])
        .optional()
        .catch(undefined)
        .describe(
          "Deprecated: no longer has any effect. The prompt's word-editing keys always follow Bash (readline) conventions.",
        ),
    vimInsertModeRemaps: () =>
      record(stringSchema(), unknown())
        .optional()
        .catch(undefined)
        .describe(
          'Vim INSERT-mode key-sequence remaps, e.g. {"jj": "<Esc>"}. Each key is exactly two printable characters typed in sequence; "<Esc>" (return to NORMAL mode) is the only supported target. Applies when editorMode is "vim".',
        ),
    verbose: () =>
      booleanSchema().optional().describe("Show full tool output instead of truncated summaries"),
    preferredNotifChannel: () =>
      _enum(NOTIFICATION_CHANNELS).optional().catch(undefined).describe("Preferred OS notification channel"),
    autoCompactEnabled: () =>
      booleanSchema().optional().describe("Automatically compact conversation when context fills"),
    precomputeCompactionEnabled: () =>
      booleanSchema()
        .optional()
        .describe(
          "Precompute the compaction summary in the background before it is needed. Only applies when auto-compact is on.",
        ),
    idleCompaction: () =>
      booleanSchema()
        .optional()
        .describe(
          "Set to false to stop Claude Code from compacting a long conversation while the session is idle. Defaults to true.",
        ),
    switchModelsOnFlag: () =>
      booleanSchema()
        .optional()
        .describe(
          "When safeguards flag a message, automatically switch to a different model to keep chatting. When off, your session will pause instead.",
        ),
    autoContinueAtUsageLimit: () =>
      booleanSchema()
        .optional()
        .describe(
          "When a claude.ai usage limit stops your session, wait for the limit to reset and continue the task automatically. When off, the limit dialog offers the wait as a choice instead.",
        ),
    autoScrollEnabled: () =>
      booleanSchema()
        .optional()
        .describe("Auto-scroll the conversation view to bottom (fullscreen mode only)"),
    wheelScrollAccelerationEnabled: () =>
      booleanSchema()
        .optional()
        .describe("Ramp mouse-wheel scroll speed during fast scrolls (fullscreen mode only)"),
    fileCheckpointingEnabled: () =>
      booleanSchema().optional().describe("Snapshot files before edits so /rewind can restore them"),
    showTurnDuration: () =>
      booleanSchema().optional().describe('Show "Cooked for Nm Ns" after each assistant turn'),
    showMessageTimestamps: () =>
      booleanSchema().optional().describe("Stamp each message with its arrival time"),
    terminalProgressBarEnabled: () =>
      booleanSchema().optional().describe("Emit OSC 9;4 progress sequences during long operations"),
    todoFeatureEnabled: () => booleanSchema().optional().describe("Enable the todo / task tracking panel"),
    teammateMode: () =>
      _enum(DISABLE_REASON_LABELS)
        .optional()
        .catch(undefined)
        .describe("How spawned teammates execute (tmux, iterm2, in-process, auto)"),
    remoteControlAtStartup: () =>
      booleanSchema().optional().describe("Start Remote Control bridge automatically each session"),
    remoteControl: () =>
      objectSchema({
        shareHostProfile: _enum(POLICY_HELPER_LOG_LEVELS)
          .optional()
          .catch(undefined)
          .describe(
            "@internal What a Remote Control environment reports about this machine when it registers: 'off' reports nothing, 'basic' the OS, architecture and detected developer tools, 'full' also the names of MCP servers configured on this machine (never a repository's .mcp.json). When unset, the level comes from the feature rollout, which may be any of the three. Managed, --settings and user settings choose the level (the most restrictive wins); project and local settings can only lower it, never raise it. Read when Remote Control starts; lowering it later applies from the next registration, raising it from the next start.",
          ),
      })
        .optional()
        .describe("@internal Remote Control (`claude remote-control`) options"),
    isolatePeerMachines: () =>
      booleanSchema()
        .optional()
        .describe(
          "Require explicit approval before SendMessage can reach a peer session on another machine via Remote Control",
        ),
    daemonColdStart: () =>
      _enum(["transient", "ask"])
        .optional()
        .describe(
          "When no background service is running: 'transient' spawns one for this login session; 'ask' offers to install it persistently",
        ),
    crossSessionInbound: () =>
      _enum(POLICY_HELPER_ON_FAILURE)
        .optional()
        .catch(undefined)
        .describe(
          "Inbound cross-session peer messages (SendMessage from your other sessions): 'accept' delivers them, 'hold' parks them for your review without letting Claude act, 'refuse' opts this session out. An explicit value always wins. Unset (mode parity): a message auto-delivers only when the sending session's permission-mode class matches yours (bypass\u2194bypass or prompting\u2194prompting); a mismatched sender's message is held for your approval; a sender that asserts no class is held only while this session bypasses permission prompts.",
        ),
    autoUploadSessions: () =>
      booleanSchema()
        .optional()
        .describe("Mirror local sessions to claude.ai as view-only (no remote control)"),
    inputNeededNotifEnabled: () =>
      booleanSchema().optional().describe("Push to mobile when a permission prompt or question is waiting"),
    agentPushNotifEnabled: () =>
      booleanSchema().optional().describe("Allow Claude to push proactive mobile notifications"),
    ...import_mapValues(buildSettingsShapeForGroups(featureGroups), (field) => () => field),
  };
}
//@ chunk-dcmhvw5a.js:314583-314643 layout
function buildWholeSettingsSchema(featureGroups, options = {}) {
  let shape = SettingsSchema(featureGroups, options);
  return new PerKeyLazySchema(shape).whole();
}
//@ chunk-dcmhvw5a.js:314643-314724 layout
/**
 * warnedSettingsKeys：已警告过的设置键；perKeySettingsSchema：逐键惰性的设置 schema；wholeSettingsSchema：整份设置 schema（同一声明共 3 个绑定）。
 */
var settingsSchemaWarnedKeys; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var warnedSettingsKeys;
var perKeySettingsSchema;
var wholeSettingsSchema;
deferInit("chunk-dcmhvw5a.js:314643", () => {
  settingsSchemaWarnedKeys = new Set();
  warnedSettingsKeys = new Set();
  perKeySettingsSchema = DoctorLazy(
    () => new PerKeyLazySchema(SettingsSchema(enabledSettingsFeatureGroups()), settingsSchemaWarnedKeys),
  );
  wholeSettingsSchema = DoctorLazy(() => perKeySettingsSchema().whole());
});
//@ chunk-dcmhvw5a.js:314724-314767 layout
function getSettingsSchemaForDocument(rawDocument) {
  return perKeySettingsSchema().forDocument(rawDocument);
}
//@ chunk-dcmhvw5a.js:314767-314818 layout
function getStrippingSettingsSchema(settings) {
  return perKeySettingsSchema().forDocument(settings, "strip");
}
//@ chunk-dcmhvw5a.js:314818-314853 layout
/**
 * isWarnedSettingsKey：该键出现过警告。
 */
function isWarnedSettingsKey(key) {
  return perKeySettingsSchema().has(key);
}
//@ chunk-dcmhvw5a.js:314853-314889 layout
function getSettingsFieldSchema(key) {
  return perKeySettingsSchema().field(key);
}
//@ chunk-dcmhvw5a.js:314889-314949 layout
var INVALID_SERVER_NAME; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:314889", () => {
  INVALID_SERVER_NAME = Object.freeze({
    serverName: "invalid-entry-stripped",
  });
});
//@ chunk-dcmhvw5a.js:314949-315264 layout
/**
 * 递归取 zod 问题列表中第一条有意义的消息（展开 union 分支），带路径前缀。
 */
function firstIssueMessage(issues) {
  for (let issue of issues) {
    let pathPrefix = issue.path.length > 0 ? `${issue.path.map(String).join(".")}: ` : "";
    if (issue.code === "invalid_union") {
      for (let error of issue.errors) {
        let nested = firstIssueMessage(error);
        if (nested !== null) return `${pathPrefix}${nested}`;
      }
      if ("note" in issue && typeof issue.note === "string" && issue.note !== "")
        return `${pathPrefix}${issue.note}`;
    }
    if (issue.message !== "") return `${pathPrefix}${issue.message}`;
  }
  return null;
}
//@ chunk-dcmhvw5a.js:315264-315752 layout
/**
 * RESTRICTIVE_TOP_LEVEL_SETTINGS：受限的顶层设置键（同一声明共 2 个绑定）。
 */
var RESTRICTIVE_TOP_LEVEL_SETTINGS_2; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RESTRICTIVE_TOP_LEVEL_SETTINGS;
var restrictiveTopLevelSettings;
deferInit("chunk-dcmhvw5a.js:315264", () => {
  RESTRICTIVE_TOP_LEVEL_SETTINGS_2 = DoctorLazy(() => {
    let schema = perKeySettingsSchema();
    return MANAGED_RESTRICTION_KEYS().flatMap(({ path, restrictive }) => {
      if (
        path.length !== 1 ||
        path[0] === "strictPluginOnlyCustomization" ||
        path[0] === "disableAllHooks" ||
        (typeof restrictive !== "boolean" && typeof restrictive !== "string")
      )
        return [];
      let topKey = path[0];
      let field = schema.field(topKey);
      if (field === undefined || field instanceof ZodCatch) return [];
      return [
        {
          key: topKey,
          restrictive,
          field,
        },
      ];
    });
  });
  RESTRICTIVE_TOP_LEVEL_SETTINGS = DoctorLazy(() => [
    "strictKnownMarketplaces",
    "blockedMarketplaces",
    "strictPluginOnlyCustomization",
    ...RESTRICTIVE_TOP_LEVEL_SETTINGS_2().map((entry) => entry.key),
  ]);
  restrictiveTopLevelSettings = ["managedSourcesBehavior", "wslInheritsWindowsSettings"];
});
//@ chunk-dcmhvw5a.js:315752-315807 layout
function isDeepEmptyObject(value) {
  return isPlainObject_2(value) && Object.values(value).every(isDeepEmptyObject);
}
//@ chunk-dcmhvw5a.js:315807-315964 layout
function readWslInheritFlag(settings) {
  let wslInheritsWindowsSettings = settings.wslInheritsWindowsSettings;
  if (wslInheritsWindowsSettings === undefined || wslInheritsWindowsSettings === null) return "disarmed";
  let flag = coerceBooleanString(wslInheritsWindowsSettings);
  return flag === true ? "armed" : flag === false ? "disarmed" : "unreadable";
}
//@ chunk-dcmhvw5a.js:315964-316661 layout
function getUnenforceableMarketplaceReason(entry) {
  let pattern =
    entry.source === "hostPattern"
      ? entry.hostPattern
      : entry.source === "pathPattern"
        ? entry.pathPattern
        : null;
  if (pattern !== null && !isValidRegex(pattern))
    return `${entry.source}: regex does not compile; the entry cannot be enforced`;
  if (entry.source === "github" && entry.repo.includes("*") && parseGithubOwnerWildcard(entry.repo) === null)
    return 'github: an owner wildcard must be exactly "<owner>/*"; the entry cannot be enforced';
  if (entry.source === "git" && hasGithubWildcard(entry.url))
    return 'git: wildcards are only supported in github-form entries, as "<owner>/*"; the entry cannot be enforced';
  if (
    (entry.source === "github" || entry.source === "git") &&
    entry.ref !== undefined &&
    entry.ref.includes("*")
  )
    return `${entry.source}: ref contains "*", which git does not allow in ref names; the entry cannot be enforced`;
  return null;
}
//@ chunk-dcmhvw5a.js:316661-317476 layout
/**
 * 宽容解析插件市场列表：逐项校验，无效或不可执行的条目忽略并报告（blockedMarketplaces 中不可执行的保留），全部无效时额外提示。
 */
function tolerantMarketplaceList(key, report) {
  return union([
    nullSchema().transform(() => {
      return;
    }),
    array(unknown()).transform((entries) => {
      let valid = [];
      for (let [index, entry] of entries.entries()) {
        let parsed = (
          key === "blockedMarketplaces" ? MarketplacePolicySourceSchema() : MarketplaceSourceSchemaLazy()
        ).safeParse(entry);
        if (parsed.success) {
          let unenforceableMarketplaceReason = getUnenforceableMarketplaceReason(parsed.data);
          if (unenforceableMarketplaceReason !== null) {
            if (key === "blockedMarketplaces") {
              report({
                path: `${key}[${index}]`,
                message: `Unenforceable entry was kept: ${unenforceableMarketplaceReason}; it can never match a marketplace source, but marketplace restrictions stay active`,
              });
              valid.push(parsed.data);
            } else
              report({
                path: `${key}[${index}]`,
                message: `Invalid entry was ignored: ${unenforceableMarketplaceReason}`,
              });
            continue;
          }
          valid.push(parsed.data);
        } else
          report({
            path: `${key}[${index}]`,
            message: `Invalid entry was ignored: ${firstIssueMessage(parsed.error.issues) ?? "failed validation"}`,
          });
      }
      if (key === "blockedMarketplaces" && entries.length > 0 && valid.length === 0)
        report({
          path: key,
          message:
            'Every entry of "blockedMarketplaces" was invalid; none of them can be enforced until it is fixed.',
        });
      return valid;
    }),
  ]).optional();
}
//@ chunk-dcmhvw5a.js:317476-317674 layout
function tolerantArray(key, entrySchema, report) {
  return array(
    entrySchema.catch((error) => {
      report({
        path: `${key}[]`,
        message: `Invalid entry was ignored: ${error.issues[0]?.message ?? "failed validation"}`,
      });
      return INVALID_SERVER_NAME;
    }),
  )
    .transform((entries) => entries.filter((entry) => entry !== INVALID_SERVER_NAME))
    .optional();
}
//@ chunk-dcmhvw5a.js:317674-317697 layout
/**
 * UNREADABLE_SETTING_MARKER：设置不可读的占位文本。
 */
var UNREADABLE_SETTING_MARKER = "(unreadable)";
//@ chunk-dcmhvw5a.js:317697-318444 layout
/**
 * 宽容解析白名单数组：无效条目忽略并报告，全部无效或整体无效时按空白名单执行并提示。
 */
function tolerantAllowlist(key, entrySchema, report, emptyMeaning, entryNotice, options) {
  return array(unknown())
    .transform((entries) => {
      let valid = [];
      for (let [index, entry] of entries.entries()) {
        let parsed = entrySchema.safeParse(entry);
        if (parsed.success) {
          valid.push(parsed.data);
          let notice = entryNotice?.(entry, parsed.data);
          if (notice !== undefined)
            report({
              path: `${key}[${index}]`,
              message: notice,
              statusOnly: true,
            });
        } else {
          let issue = parsed.error.issues[0];
          let message =
            issue === undefined
              ? "failed validation"
              : issue.path.length
                ? `${issue.path.join(".")}: ${issue.message}`
                : issue.message;
          report({
            path: `${key}[${index}]`,
            message: `Invalid entry was ignored: ${message}`,
            ...(options?.invalidEntryIsStatusOnly && {
              statusOnly: true,
            }),
          });
        }
      }
      if (entries.length > 0 && valid.length === 0)
        report({
          path: key,
          message: `Every entry of "${key}" was invalid; enforcing an empty allowlist (${emptyMeaning}) until it is fixed.`,
        });
      return valid;
    })
    .optional()
    .catch(() => {
      report({
        path: key,
        message: `"${key}" was present but invalid; enforcing an empty allowlist (${emptyMeaning}) until it is fixed.`,
      });
      return [];
    });
}
//@ chunk-dcmhvw5a.js:318444-319177 layout
/**
 * RESTRICTIVE_NESTED_SETTINGS：受限的嵌套设置键；restrictiveNestedSettingsMap：受限嵌套设置映射（同一声明共 3 个绑定）。
 */
var RESTRICTIVE_NESTED_SETTING_VALUES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RESTRICTIVE_NESTED_SETTINGS;
var restrictiveNestedSettings;
var restrictiveNestedSettingsMap;
deferInit("chunk-dcmhvw5a.js:318444", () => {
  RESTRICTIVE_NESTED_SETTING_VALUES = DoctorLazy(
    () =>
      new Map(
        MANAGED_RESTRICTION_KEYS().flatMap(({ path, restrictive }) =>
          path.length > 1 ? [[path.join("."), asArray(restrictive)[0]]] : [],
        ),
      ),
  );
  RESTRICTIVE_NESTED_SETTINGS = ["soft_deny", "hard_deny", "deny"];
  restrictiveNestedSettings = new Map([
    [
      "permissions",
      {
        restrictions: ["deny", "ask"],
        grants: ["allow", "additionalDirectories", "defaultMode"],
      },
    ],
    [
      "autoMode",
      {
        restrictions: RESTRICTIVE_NESTED_SETTINGS,
        grants: ["allow", "environment"],
        withholdOnEntryDrop: true,
      },
    ],
    [
      "sandbox.network",
      {
        restrictions: ["deniedDomains"],
        grants: ["allowedDomains"],
        withholdOnEntryDrop: true,
      },
    ],
    [
      "sandbox.filesystem",
      {
        restrictions: ["denyWrite", "denyRead"],
        grants: ["allowWrite", "allowRead"],
        withholdOnEntryDrop: true,
      },
    ],
  ]);
  restrictiveNestedSettingsMap = new Map([
    [
      "permissions.defaultMode",
      {
        read: (value) => {
          let normalized = normalizePermissionModeAlias(value);
          return [
            ...EXTERNAL_PERMISSION_MODES,
            ...buildPermissionModesForGroups(enabledSettingsFeatureGroups()),
          ].find((mode) => mode === normalized);
        },
        inert: new Set(["default", "dontAsk", "plan"]),
        floor: "default",
      },
    ],
  ]);
});
//@ chunk-dcmhvw5a.js:319177-319962 layout
/**
 * 同一设置块中的限制项不可读或被裁剪时，暂扣该块的授予项（删除或降为下限值）并报告原因，返回被降级的键。
 */
function withholdGrants(path, block, restrictionState, report) {
  let withheld = [];
  let spec = restrictiveNestedSettings.get(path);
  if (spec === undefined) return withheld;
  let flattened = spec.restrictions.flatMap((restriction) => {
    switch (restrictionState(restriction)) {
      case "unreadable":
        return [`"${restriction}"`];
      case "trimmed":
        return spec.withholdOnEntryDrop ? [`an entry of "${restriction}"`] : [];
      case undefined:
        return [];
    }
  });
  if (flattened.length === 0) return withheld;
  let joined = flattened.join(" and ");
  for (let grant of spec.grants) {
    let spec = restrictiveNestedSettingsMap.get(`${path}.${grant}`);
    let value = spec === undefined ? block[grant] : spec.read(block[grant]);
    if (value === undefined || spec?.inert.has(value) === true) continue;
    if (spec === undefined) delete block[grant];
    else {
      block[grant] = spec.floor;
      withheld.push(grant);
    }
    report({
      path: `${path}.${grant}`,
      message:
        spec === undefined
          ? `"${grant}" was withheld because ${joined} in the same block could not be read; it takes effect again once that is fixed.`
          : `"${grant}" was withheld because ${joined} in the same block could not be read; treating it as ${formatValueForMessage(spec.floor)} until that is fixed.`,
      ...(spec !== undefined && {
        substituted: true,
      }),
    });
  }
  return withheld;
}
//@ chunk-dcmhvw5a.js:319962-320045 layout
function hasRestrictiveNestedPath(path) {
  for (let key of RESTRICTIVE_NESTED_SETTING_VALUES().keys()) if (key.startsWith(`${path}.`)) return true;
  return false;
}
//@ chunk-dcmhvw5a.js:320045-320139 layout
/**
 * isRestrictiveNestedPath：路径属于受限嵌套设置。
 */
function isRestrictiveNestedPath(path) {
  return (
    path !== "sandbox.credentials" &&
    !path.startsWith("sandbox.credentials.") &&
    hasRestrictiveNestedPath(path)
  );
}
//@ chunk-dcmhvw5a.js:320139-320289 layout
function unwrapObjectSchema(schema) {
  let current = schema;
  while (
    current instanceof ZodOptional ||
    current instanceof createDeferredOptional ||
    current instanceof ZodPipe
  )
    current = current instanceof ZodPipe ? current.out : current.unwrap();
  return current instanceof ZodObject ? current : undefined;
}
//@ chunk-dcmhvw5a.js:320289-320337 layout
var REMOTE_OWNED_SETTING_PATHS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:320289", () => {
  REMOTE_OWNED_SETTING_PATHS = new Set(["remoteTools", "remoteControl"]);
});
//@ chunk-dcmhvw5a.js:320337-320401 layout
function isObjectInSet(set, value) {
  return typeof value === "object" && value !== null && set.has(value);
}
//@ chunk-dcmhvw5a.js:320401-320606 layout
function restrictiveSkeleton(path, schema, exclude) {
  let skeleton = {};
  for (let [key, value] of Object.entries(schema.shape)) {
    let childPath = `${path}.${key}`;
    if (exclude?.has(childPath)) continue;
    let nestedSpec = RESTRICTIVE_NESTED_SETTING_VALUES().get(childPath);
    let childSchema = unwrapObjectSchema(value);
    if (nestedSpec !== undefined) skeleton[key] = nestedSpec;
    else if (childSchema !== undefined && hasRestrictiveNestedPath(childPath))
      skeleton[key] = restrictiveSkeleton(childPath, childSchema, exclude);
  }
  return skeleton;
}
//@ chunk-dcmhvw5a.js:320606-320749 layout
function nullRemovalNotice(path, key) {
  return {
    path,
    message: `"${key}" was null, which is read as key removal; this source does not set it.`,
    statusOnly: true,
    removal: true,
  };
}
//@ chunk-dcmhvw5a.js:320749-320810 layout
function formatValueForMessage(value) {
  return typeof value === "string" ? `"${value}"` : String(value);
}
//@ chunk-dcmhvw5a.js:320810-321243 layout
/**
 * 把单个 zod 问题描述为简短文字（自定义消息、期望类型或可选值），按路径加前缀或标为嵌套值。
 */
function describeIssue(issue, skipPathSegments = 0) {
  let message =
    issue === undefined || issue.input === undefined
      ? "failed validation"
      : issue.code === "custom" && issue.message !== undefined
        ? issue.message
        : "expected" in issue && typeof issue.expected === "string"
          ? `expected ${issue.expected}`
          : "values" in issue && Array.isArray(issue.values)
            ? `expected ${issue.values.map(formatValueForMessage).join(" or ")}`
            : "failed validation";
  let sliced = (issue?.path ?? []).slice(skipPathSegments);
  if (sliced.length === 0) return message;
  return sliced.every((segment) => typeof segment === "number")
    ? `${sliced.join(".")}: ${message}`
    : `nested value: ${message}`;
}
//@ chunk-dcmhvw5a.js:321243-321285 layout
function isFalsyBooleanString(value) {
  return value === false || value === "false";
}
//@ chunk-dcmhvw5a.js:321285-321417 layout
function isRestrictiveDisable(path, value) {
  if (value === null) return true;
  return (
    (path.includes(".")
      ? RESTRICTIVE_NESTED_SETTING_VALUES().get(path)
      : RESTRICTIVE_TOP_LEVEL_SETTINGS_2().find((entry) => entry.key === path)?.restrictive) === "disable" &&
    isFalsyBooleanString(value)
  );
}
//@ chunk-dcmhvw5a.js:321417-321927 layout
/**
 * 为限制性设置加入宽容预处理：布尔键接受字符串形式并提示，取值只有 disable 的键遇到 false 视为缺省并提示。
 */
function coerceRestrictiveValue(path, restrictive, schema, report) {
  let sliced = path.slice(path.lastIndexOf(".") + 1);
  if (typeof restrictive === "boolean")
    return preprocess((value) => {
      let coerced = coerceBooleanString(value);
      if (coerced !== value)
        report({
          path,
          message: `"${sliced}" holds the string "${String(coerced)}" where a boolean belongs; reading it as ${String(coerced)}. Write it without quotes.`,
          statusOnly: true,
        });
      return coerced;
    }, schema);
  if (restrictive === "disable")
    return preprocess((value) => {
      if (isFalsyBooleanString(value)) {
        report({
          path,
          message: `"${sliced}" was set to false; reading it as absent (the key's only value is "disable"). Remove the key instead.`,
          statusOnly: true,
          removal: true,
        });
        return;
      }
      return value;
    }, schema);
  return schema;
}
//@ chunk-dcmhvw5a.js:321927-323189 layout
/**
 * 宽容解析单个设置字段：无效时优先替换为限制性值或下限值，数组则剔除无效条目后保留其余，否则忽略并报告，同时记录被替换/裁剪/忽略的键。
 */
function tolerantField(path, schema, report, substitutedKeys, ignoredKeys, trimmedKeys, neverSubstitute) {
  let sliced = path.slice(path.lastIndexOf(".") + 1);
  let restrictiveValue = RESTRICTIVE_NESTED_SETTING_VALUES().get(path);
  let substituteValue = neverSubstitute ? undefined : restrictiveValue;
  let floorSpec = restrictiveNestedSettingsMap.get(path);
  let innerSchema = schema instanceof ZodCatch ? schema.unwrap() : undefined;
  let fieldSchema = innerSchema instanceof ZodType ? innerSchema : schema;
  return coerceRestrictiveValue(path, restrictiveValue, fieldSchema, report).catch((error) => {
    if (substituteValue !== undefined) {
      report({
        path,
        message: `"${sliced}" was present but invalid (${describeIssue(error.issues[0])}); treating it as ${formatValueForMessage(substituteValue)}, its restrictive value, until it is fixed.`,
        substituted: true,
      });
      substitutedKeys.add(sliced);
      return substituteValue;
    }
    if (floorSpec !== undefined) {
      report({
        path,
        message: `"${sliced}" was present but invalid (${describeIssue(error.issues[0])}); treating it as ${formatValueForMessage(floorSpec.floor)} until it is fixed.`,
        substituted: true,
      });
      substitutedKeys.add(sliced);
      return floorSpec.floor;
    }
    if (fieldSchema.safeParse([]).success) {
      let input = error.value;
      if (Array.isArray(input)) {
        let badEntries = new Map();
        for (let issue of error.issues) {
          let index = issue.path?.[0];
          if (typeof index === "number" && !badEntries.has(index))
            badEntries.set(index, describeIssue(issue, 1));
        }
        let retry = fieldSchema.safeParse(input.filter((entry, entryIndex) => !badEntries.has(entryIndex)));
        if (badEntries.size > 0 && badEntries.size < input.length && retry.success) {
          for (let [index, reason] of badEntries)
            report({
              path: `${path}[${index}]`,
              message: `Invalid entry was ignored (${reason}); it cannot take effect until it is fixed.`,
            });
          trimmedKeys.add(sliced);
          return retry.data;
        }
      }
    }
    report({
      path,
      message:
        restrictiveValue === undefined
          ? `"${sliced}" was present but invalid (${describeIssue(error.issues[0])}) and was ignored; it cannot take effect until it is fixed.`
          : `"${sliced}" was present but invalid (${describeIssue(error.issues[0])}) and was ignored, not treated as ${formatValueForMessage(restrictiveValue)}; it cannot take effect until it is fixed.`,
    });
    ignoredKeys.add(sliced);
    return;
  });
}
//@ chunk-dcmhvw5a.js:323189-324702 layout
/**
 * 宽容解析设置对象：各字段用宽容规则，不是对象时用限制性骨架代替并报告；null 视为删除；限制项不可读时暂扣同块授予项；结果为空或全部为合成值时据此处理。
 */
function tolerantObjectSchema(path, schema, report, options = {}) {
  let key = path.slice(path.lastIndexOf(".") + 1);
  let substitutedKeys = new Set();
  let unreadableKeys = new Set();
  let trimmedKeys = new Set();
  let fieldSchemas = {};
  for (let [key, value] of Object.entries(schema.shape)) {
    let path_2 = `${path}.${key}`;
    let schema = unwrapObjectSchema(value);
    fieldSchemas[key] =
      options.override?.[path_2] ??
      (schema !== undefined && hasRestrictiveNestedPath(path_2)
        ? tolerantObjectSchema(path_2, schema, report, {
            ...options,
            strictField: value,
          })
        : tolerantField(
            path_2,
            value,
            report,
            substitutedKeys,
            unreadableKeys,
            trimmedKeys,
            options.neverSubstitute?.has(path_2) === true,
          ));
  }
  let excludedKeys = new Set([...(options.skeletonExclude ?? []), ...(options.neverSubstitute ?? [])]);
  let extendedSchema = schema.safeExtend(fieldSchemas);
  return unknown()
    .transform((value) => {
      if (value === null) {
        report(nullRemovalNotice(path, key));
        return;
      }
      substitutedKeys.clear();
      unreadableKeys.clear();
      trimmedKeys.clear();
      let strictParsed =
        isPlainObject_2(value) || options.strictField === undefined
          ? undefined
          : options.strictField.safeParse(value);
      let sourceValue =
        strictParsed?.success === true && isPlainObject_2(strictParsed.data) ? strictParsed.data : value;
      let parsed = isPlainObject_2(sourceValue)
        ? extendedSchema.safeParse(import_reject(sourceValue, (key) => key === null || key === undefined))
        : undefined;
      if (!isPlainObject_2(sourceValue) || parsed?.success !== true) {
        let skeleton = restrictiveSkeleton(path, schema, excludedKeys);
        let keys = Object.keys(skeleton);
        report({
          path,
          message:
            keys.length > 0
              ? `"${key}" was present but not an object; treating its locks as their restrictive values (${keys.join(", ")}) until it is fixed.`
              : `"${key}" was present but not an object and was ignored; it cannot take effect until it is fixed.`,
          ...(keys.length > 0 && {
            substituted: true,
          }),
        });
        if (keys.length === 0) return;
        if (!REMOTE_OWNED_SETTING_PATHS.has(path)) options.synthesized?.add(skeleton);
        return skeleton;
      }
      for (let [key, value] of Object.entries(sourceValue)) {
        let path_2 = `${path}.${key}`;
        if (
          value === null &&
          (RESTRICTIVE_NESTED_SETTING_VALUES().has(path_2) || hasRestrictiveNestedPath(path_2))
        )
          report(nullRemovalNotice(path_2, key));
      }
      let block = {
        ...parsed.data,
      };
      for (let grant of withholdGrants(
        path,
        block,
        (key) => (unreadableKeys.has(key) ? "unreadable" : trimmedKeys.has(key) ? "trimmed" : undefined),
        report,
      ))
        substitutedKeys.add(grant);
      let kept = import_reject(block, (value) => value === undefined);
      if (Object.keys(kept).length === 0)
        return Object.entries(sourceValue).some(
          ([key, value]) => value !== undefined && Object.hasOwn(schema.shape, key),
        )
          ? undefined
          : kept;
      let synthesized = options.synthesized;
      if (
        synthesized !== undefined &&
        !REMOTE_OWNED_SETTING_PATHS.has(path) &&
        Object.entries(kept).every(
          ([key, value]) =>
            substitutedKeys.has(key) || isObjectInSet(synthesized, value) || isDeepEmptyObject(value),
        )
      )
        synthesized.add(kept);
      return kept;
    })
    .optional();
}
//@ chunk-dcmhvw5a.js:324702-348175 layout
/**
 * 托管设置的宽容 schema：逐字段校验，无效值按该字段的限制性取值处理而不是整份失效，并收集警告。
 */
function buildPolicyTolerantSettingsSchema(report, sourceSalt, settingsContext) {
  let perKeySchema = perKeySettingsSchema();
  let isTolerantKey = (key) => warnedSettingsKeys.has(key) || perKeySchema.carries(settingsContext, key);
  let fieldFor = (key) => {
    let fieldSchema = perKeySchema.field(key);
    if (!fieldSchema) throw Error("policyTolerantSettingsSchema: not a settings field of this build");
    return fieldSchema;
  };
  let overrides = new Map();
  let setOverride = (key, overrideSchema) => {
    overrides.set(key, overrideSchema);
  };
  for (let pluginListKey of ["prependPlugins", "appendPlugins"])
    if (perKeySchema.has(pluginListKey))
      setOverride(pluginListKey, () =>
        array(stringSchema())
          .optional()
          .catch((error) => {
            report({
              path: pluginListKey,
              message: `${error.issues[0]?.message ?? "Failed schema validation"}. This field was ignored; read as unset.`,
            });
            return;
          }),
      );
  setOverride("wslInheritsWindowsSettings", () =>
    union([
      nullSchema().transform(() => {
        return;
      }),
      preprocess((value) => {
        let coerced = coerceBooleanString(value);
        if (coerced !== value)
          report({
            path: "wslInheritsWindowsSettings",
            message: `"wslInheritsWindowsSettings" holds the string "${String(coerced)}" where a boolean belongs; reading it as ${String(coerced)}. Write it without quotes.`,
            statusOnly: true,
          });
        return coerced;
      }, fieldFor("wslInheritsWindowsSettings")),
    ])
      .optional()
      .catch(() => {
        report({
          path: "wslInheritsWindowsSettings",
          message: `"wslInheritsWindowsSettings" was present but invalid (it takes true or false), so this source's WSL opt-in cannot be read until it is fixed. WSL fails it closed: in an administrator source it arms the Windows policy chain with no user-writable source (/etc/claude-code, HKCU) read beneath it; in HKCU it leaves HKCU unapplied.`,
        });
        return;
      }),
  );
  setOverride("strictKnownMarketplaces", () =>
    tolerantMarketplaceList("strictKnownMarketplaces", report).catch(() => {
      report({
        path: "strictKnownMarketplaces",
        message:
          '"strictKnownMarketplaces" was present but invalid; enforcing an empty allowlist (no marketplaces admitted) until it is fixed.',
      });
      return [];
    }),
  );
  setOverride("blockedMarketplaces", () =>
    tolerantMarketplaceList("blockedMarketplaces", report).catch(() => {
      report({
        path: "blockedMarketplaces",
        message:
          '"blockedMarketplaces" was present but invalid and was dropped; its entries cannot be enforced until it is fixed.',
      });
      return;
    }),
  );
  setOverride("allowedMcpServers", () =>
    tolerantArray("allowedMcpServers", allowedMcpServersSchema(), report).catch(() => {
      report({
        path: "allowedMcpServers",
        message:
          '"allowedMcpServers" was present but invalid; enforcing an empty allowlist (no MCP servers admitted) until it is fixed.',
      });
      return [];
    }),
  );
  setOverride("deniedMcpServers", () =>
    tolerantArray("deniedMcpServers", deniedMcpServersSchema(), report).catch(() => {
      report({
        path: "deniedMcpServers",
        message:
          '"deniedMcpServers" was present but invalid and was dropped; its entries cannot be enforced until it is fixed.',
      });
      return;
    }),
  );
  setOverride("managedMcpServers", () =>
    unknown()
      .transform((value) =>
        parseManagedMcpServers(value, (serverName, reason) =>
          report({
            path: serverName ? `managedMcpServers.${serverName}` : "managedMcpServers",
            message: serverName ? `Managed MCP server was ignored: ${reason}` : reason,
            statusOnly: true,
          }),
        ),
      )
      .optional(),
  );
  let failClosedKeys = new Set();
  for (let { key, restrictive, field } of RESTRICTIVE_TOP_LEVEL_SETTINGS_2()) {
    let restrictiveText = typeof restrictive === "string" ? `"${restrictive}"` : String(restrictive);
    setOverride(key, () =>
      union([
        nullSchema().transform(() => {
          return;
        }),
        coerceRestrictiveValue(key, restrictive, field, report),
      ])
        .optional()
        .catch(() => {
          report({
            path: key,
            message: `"${key}" was present but invalid; treating it as ${restrictiveText} (its restrictive value) until it is fixed.`,
            substituted: true,
          });
          failClosedKeys.add(key);
          return restrictive;
        }),
    );
  }
  setOverride("strictPluginOnlyCustomization", () =>
    union([
      nullSchema().transform(() => {
        return;
      }),
      filteredSurfacesSchema((unrecognizedCount) =>
        report({
          path: "strictPluginOnlyCustomization",
          message: `"strictPluginOnlyCustomization" lists ${unrecognizedCount} ${plural(unrecognizedCount, "entry", "entries")} this version does not recognize as a surface (known: ${SKILL_OVERRIDE_COMPONENTS.join(", ")}); an unrecognized entry locks nothing, so check it for a typo.`,
          statusOnly: true,
        }),
      ),
    ])
      .optional()
      .catch(() => {
        report({
          path: "strictPluginOnlyCustomization",
          message:
            '"strictPluginOnlyCustomization" was present but invalid; treating it as true (skills, agents, hooks and MCP servers load from managed settings and plugins only) until it is fixed.',
          substituted: true,
        });
        failClosedKeys.add("strictPluginOnlyCustomization");
        return true;
      }),
  );
  setOverride("enabledPlugins", () => {
    let triState = triStateSchema();
    return record(stringSchema(), unknown())
      .transform((plugins) => {
        let keptEntries = [];
        let invalidCount = 0;
        for (let [key, value] of Object.entries(plugins)) {
          let parsed = triState.safeParse(value);
          if (parsed.success) {
            keptEntries.push([key, parsed.data]);
            continue;
          }
          invalidCount++;
          report({
            path: PluginIdSchema().safeParse(key).success
              ? `enabledPlugins.${key}`
              : "enabledPlugins.<invalid id>",
            message:
              "Invalid entry was ignored: the value must be true, false, or a list of version constraints. This plugin is neither force-enabled nor blocked until it is fixed.",
          });
        }
        if (invalidCount > 0 && keptEntries.length === 0) {
          report({
            path: "enabledPlugins",
            message:
              'Every entry of "enabledPlugins" was invalid; no plugin is force-enabled or blocked by it until it is fixed.',
          });
          return;
        }
        return Object.fromEntries(keptEntries);
      })
      .optional()
      .catch(() => {
        report({
          path: "enabledPlugins",
          message:
            '"enabledPlugins" was present but invalid (not a map of plugin ids) and was ignored; no plugin is force-enabled or blocked by it until it is fixed.',
        });
        return;
      });
  });
  setOverride("availableModels", () =>
    array(unknown())
      .transform((models, ctx) => {
        let names = [];
        for (let model of models)
          if (typeof model === "string") names.push(model);
          else
            report({
              path: "availableModels",
              message: `"availableModels" contained a non-string entry (${JSON.stringify(model)}); the entry was ignored.`,
            });
        return names;
      })
      .optional()
      .catch(() => {
        report({
          path: "availableModels",
          message:
            '"availableModels" was present but invalid; enforcing an empty allowlist (only the default model is available) until it is fixed.',
        });
        return [];
      }),
  );
  setOverride("deniedModels", () =>
    array(unknown())
      .transform((models) => {
        let names = [];
        for (let model of models)
          if (typeof model === "string") names.push(model);
          else
            report({
              path: "deniedModels",
              message: `"deniedModels" contained a non-string entry (${model === null ? "null" : typeof model}); the entry was ignored.`,
            });
        return names;
      })
      .optional()
      .catch(() => {
        report({
          path: "deniedModels",
          message:
            '"deniedModels" was present but is not a list of model names, so it was ignored and blocks no models until it is fixed.',
        });
        return;
      }),
  );
  setOverride("allowedHttpHookUrls", () =>
    tolerantAllowlist("allowedHttpHookUrls", stringSchema(), report, "no HTTP hooks may run"),
  );
  setOverride("httpHookAllowedEnvVars", () =>
    tolerantAllowlist(
      "httpHookAllowedEnvVars",
      stringSchema(),
      report,
      "no environment variables may be interpolated into HTTP hook headers",
    ),
  );
  setOverride("allowedChannelPlugins", () =>
    tolerantAllowlist(
      "allowedChannelPlugins",
      sandboxSettingsSchema(),
      report,
      "no channel plugins admitted",
      (entry, parsed) =>
        typeof entry === "string"
          ? `"allowedChannelPlugins" entry "${entry}" was accepted; prefer the documented object form {"plugin": "${parsed.plugin}", "marketplace": "${parsed.marketplace}"}.`
          : undefined,
    ),
  );
  setOverride("gatewayInternalNetworks", () =>
    array(stringSchema())
      .optional()
      .catch(() => {
        report({
          path: "gatewayInternalNetworks",
          message:
            '"gatewayInternalNetworks" was present but invalid; gateway sign-in governed by this source is refused until it is fixed.',
        });
        return [UNREADABLE_SETTING_MARKER];
      }),
  );
  setOverride("forceLoginOrgUUID", () =>
    fieldFor("forceLoginOrgUUID").catch(() => {
      report({
        path: "forceLoginOrgUUID",
        message:
          '"forceLoginOrgUUID" was present but invalid; no organization is permitted to log in until it is fixed.',
      });
      return [];
    }),
  );
  setOverride("allowedProviders", () =>
    tolerantAllowlist(
      "allowedProviders",
      custom(isAnthropicProviderId, {
        message: `not a known provider name (${API_PROVIDER_KINDS.join(", ")})`,
      }),
      report,
      "no API provider may be used, so Claude Code will not start on this machine",
      undefined,
      {
        invalidEntryIsStatusOnly: true,
      },
    ),
  );
  let pathWasNull = false;
  let describeError = (schema, value) => {
    let parsed = schema.safeParse(value);
    if (parsed.success) return;
    return parsed.error.issues
      .slice(0, 3)
      .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
      .join("; ");
  };
  let inputValue;
  setOverride("policyHelper", () =>
    preprocess((value) => {
      pathWasNull = false;
      inputValue = value;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        let record = value;
        for (let field of ["defaultSettings", "default", ...HELPER_ENVELOPE_FIELDS])
          if (record[field] !== undefined && record[field] !== null)
            report({
              path: "policyHelper",
              message: `"${field}" on the singular policyHelper is ignored \u2014 static fallback payloads belong on the policyHelpers per-OS entries ("defaultSettings") or the map's "default" key. The intended fallback will NOT apply from here.`,
              statusOnly: true,
            });
        for (let key of ["policyHelper", "policyHelpers"])
          if (record[key] !== undefined && record[key] !== null)
            report({
              path: "policyHelper",
              message: `"${key}" inside the singular policyHelper is ignored \u2014 "policyHelper" and "policyHelpers" are TOP-LEVEL settings keys; nothing nests inside the singular entry. The nested config will NOT apply from here.`,
              statusOnly: true,
            });
        for (let platform of SUPPORTED_PLATFORMS)
          if (record[platform] !== undefined && record[platform] !== null)
            report({
              path: "policyHelper",
              message: `"${platform}" on the singular policyHelper is ignored \u2014 per-OS entries live on the policyHelpers MAP ("policyHelpers": {"${platform}": ...}), not inside the singular key. The intended per-OS config will NOT apply from here.`,
              statusOnly: true,
            });
        if (record.claudeMd !== undefined && record.claudeMd !== null)
          report({
            path: "policyHelper",
            message: `"claudeMd" on the singular policyHelper is ignored \u2014 "claudeMd" is a managed-settings key: put it at the settings top level or inside a static payload, or emit it from the helper's stdout envelope. The intended instructions will NOT apply from here.`,
            statusOnly: true,
          });
        if (record.outputBehavior !== undefined && record.outputBehavior !== null)
          report({
            path: "policyHelper",
            message: `"outputBehavior" on the singular policyHelper is ignored \u2014 it is only honored on the policyHelpers per-OS entries (policyHelpers.${SUPPORTED_PLATFORMS.join("/")}); this helper's output REPLACES the policy tier whatever the value says.`,
            statusOnly: true,
          });
        if (record.onFailure !== undefined && record.onFailure !== null)
          report({
            path: "policyHelper",
            message: `"onFailure" on the singular policyHelper is ignored \u2014 it is only honored on the policyHelpers per-OS entries (policyHelpers.${SUPPORTED_PLATFORMS.join("/")}); a failure of this helper REFUSES to start Claude Code whatever the value says.`,
            statusOnly: true,
          });
        if (record.retries !== undefined && record.retries !== null)
          report({
            path: "policyHelper",
            message: `"retries" on the singular policyHelper is ignored \u2014 it is only honored on the policyHelpers per-OS entries (policyHelpers.${SUPPORTED_PLATFORMS.join("/")}); this helper is run ONCE per start or refresh, never re-run, whatever the value says.`,
            statusOnly: true,
          });
        if (record.path === null || record.path === undefined) pathWasNull = true;
      }
      return value === null ? undefined : value;
    }, HELPER_BASE_SCHEMA().optional()).catch((error) => {
      report({
        path: "policyHelper",
        message: `${error.issues[0]?.message ?? describeError(HELPER_BASE_SCHEMA(), inputValue) ?? "Failed schema validation"}. This field was ignored.`,
        ...(pathWasNull && {
          statusOnly: true,
        }),
      });
      return;
    }),
  );
  let reportStaticPayloadError = (path, reason) => {
    report({
      path,
      message: `"${path}" is not a valid static settings payload: ${reason ?? "failed validation"}. When delivered from an OS-admin policy source (MDM or the managed settings file), Claude Code will not start until this is fixed.`,
      startupFatal: true,
    });
  };
  let deferredMessages = [];
  let buildEntrySchema = (entryKey) => {
    let defaultSettingsInvalid = false;
    let lastValue;
    let entrySchema = policyHelperEntrySchemaFor(
      entryKey,
      STATIC_PAYLOAD_SCHEMA()
        .optional()
        .catch((error) => {
          defaultSettingsInvalid = true;
          reportStaticPayloadError(
            `policyHelpers.${entryKey}.defaultSettings`,
            error.issues[0]?.message ??
              describeError(
                STATIC_PAYLOAD_SCHEMA(),
                lastValue && typeof lastValue === "object" && !Array.isArray(lastValue)
                  ? lastValue.defaultSettings
                  : undefined,
              ),
          );
          return;
        }),
    );
    return preprocess((value) => {
      defaultSettingsInvalid = false;
      lastValue = value;
      if (entryKey !== "default" && value && typeof value === "object" && !Array.isArray(value)) {
        let record = value;
        for (let field of [...HELPER_ENVELOPE_FIELDS, "claudeMd"])
          if (record[field] !== undefined && record[field] !== null)
            report({
              path: `policyHelpers.${entryKey}`,
              message: `"${field}" on the policyHelpers.${entryKey} entry is ignored \u2014 helper output cannot be pre-seeded on an entry; a static fallback payload goes under this entry's "defaultSettings" (a managed-settings object). The intended content will NOT apply from here.`,
              statusOnly: true,
            });
        for (let key of ["policyHelper", "policyHelpers"])
          if (record[key] !== undefined && record[key] !== null)
            report({
              path: `policyHelpers.${entryKey}`,
              message: `"${key}" on the policyHelpers.${entryKey} entry is ignored \u2014 "policyHelper" and "policyHelpers" are TOP-LEVEL settings keys; nothing nests inside an entry. The nested config will NOT apply from here.`,
              statusOnly: true,
            });
        for (let platform of SUPPORTED_PLATFORMS)
          if (record[platform] !== undefined && record[platform] !== null)
            report({
              path: `policyHelpers.${entryKey}`,
              message: `"${platform}" on the policyHelpers.${entryKey} entry is ignored \u2014 per-OS entries are SIBLINGS on the policyHelpers map, not nested inside each other. The intended ${platform} config will NOT apply from here.`,
              statusOnly: true,
            });
        if (record.default !== undefined && record.default !== null)
          report({
            path: `policyHelpers.${entryKey}`,
            message: `"default" on the policyHelpers.${entryKey} entry is ignored \u2014 the per-entry static payload field is spelled "defaultSettings"; "default" is the MAP's any-platform catch-all key (a sibling of the OS entries). The intended fallback will NOT apply from here.`,
            statusOnly: true,
          });
        let onFailure = record.onFailure;
        if (onFailure !== undefined && onFailure !== null && !isPolicyHelperOnFailure(onFailure)) {
          let shownValue;
          if (typeof onFailure === "string") {
            let replaced = onFailure.replace(/[^\x20-\x7e]/gu, "?");
            shownValue = JSON.stringify(
              replaced.length > MAX_QUOTED_NAME_CHARS
                ? `${replaced.slice(0, MAX_QUOTED_NAME_CHARS - 1)}\u2026`
                : replaced,
            );
          } else if (typeof onFailure === "number" || typeof onFailure === "boolean")
            shownValue = String(onFailure);
          else shownValue = `a non-string value (${Array.isArray(onFailure) ? "array" : typeof onFailure})`;
          report({
            path: `policyHelpers.${entryKey}.onFailure`,
            message: `"onFailure": ${shownValue} on the policyHelpers.${entryKey} entry is not a recognized value ("continue" or "refuse"); it is treated as "refuse" \u2014 a startup failure of this entry's helper with no static payload in its place will not start Claude Code.`,
            statusOnly: true,
          });
        }
        if (isAllNullEntry(value)) return;
      }
      return value === null ? undefined : value;
    }, entrySchema.optional()).catch((error) => {
      if (entryKey === "default") {
        reportStaticPayloadError(
          "policyHelpers.default",
          error.issues[0]?.message ?? describeError(STATIC_PAYLOAD_SCHEMA(), lastValue),
        );
        return;
      }
      if (defaultSettingsInvalid) return;
      let errorText = describeError(policyHelperEntrySchemaFor(entryKey), lastValue) ?? "failed validation";
      let inputValue = lastValue;
      let inputObject =
        inputValue && typeof inputValue === "object" && !Array.isArray(inputValue) ? inputValue : null;
      let onFailure = inputObject?.onFailure;
      let requiresHelper = onFailure !== undefined && onFailure !== null && onFailure !== "continue";
      let reportEntry = (message) => {
        let path = `policyHelpers.${entryKey}`;
        if (requiresHelper)
          deferredMessages.push({
            entryKey,
            message,
          });
        else
          report({
            path,
            message,
            statusOnly: true,
          });
      };
      if (inputObject) {
        let defaultSettings = inputObject.defaultSettings;
        if (defaultSettings !== undefined && defaultSettings !== null) {
          let parsed = STATIC_PAYLOAD_SCHEMA().safeParse(defaultSettings);
          if (parsed.success) {
            let outputBehavior = inputObject.outputBehavior;
            let outputBehaviorParsed =
              outputBehavior === undefined || outputBehavior === null
                ? null
                : outputBehaviorSchema().safeParse(outputBehavior);
            if (outputBehaviorParsed && !outputBehaviorParsed.success) {
              reportEntry(
                `Invalid entry was ignored: ${errorText}. Its "defaultSettings" static payload was NOT kept: "outputBehavior" is unrecognized, so whether the payload replaces or merges over this source's settings is unknown. No policy helper runs on ${entryKey} from this entry.`,
              );
              return;
            }
            report({
              path: `policyHelpers.${entryKey}`,
              message: `Invalid entry: its helper fields were ignored (${errorText}), but its "defaultSettings" static payload was kept. No policy helper runs on ${entryKey} from this entry.`,
              statusOnly: true,
            });
            return {
              defaultSettings: parsed.data,
              ...(outputBehaviorParsed && {
                outputBehavior: outputBehaviorParsed.data,
              }),
            };
          }
        }
      }
      reportEntry(
        `Invalid entry was ignored: ${errorText}. No policy helper runs on ${entryKey} from this entry.`,
      );
      return;
    });
  };
  setOverride("policyHelpers", () =>
    preprocess(
      (value) => {
        deferredMessages = [];
        if (value && typeof value === "object" && !Array.isArray(value)) {
          let record = value;
          for (let field of ["defaultSettings", ...HELPER_ENVELOPE_FIELDS, "claudeMd"])
            if (record[field] !== undefined && record[field] !== null)
              report({
                path: "policyHelpers",
                message: `"${field}" directly on the policyHelpers map is ignored \u2014 static fallback payloads go on a per-OS entry's "defaultSettings" or the map's "default" key (a managed-settings object), and helper-output keys come from the helper's stdout. The intended content will NOT apply from here.`,
                statusOnly: true,
              });
          for (let key of ["policyHelper", "policyHelpers"])
            if (record[key] !== undefined && record[key] !== null)
              report({
                path: "policyHelpers",
                message: `"${key}" inside the policyHelpers map is ignored \u2014 "policyHelper" and "policyHelpers" are TOP-LEVEL settings keys; the map's keys are the per-OS entries and "default". The nested config will NOT apply from here.`,
                statusOnly: true,
              });
          for (let field of HELPER_ENTRY_FIELDS.filter((entryField) => entryField !== "defaultSettings"))
            if (record[field] !== undefined && record[field] !== null) {
              let hint =
                field === "script" || field === "interpreter"
                  ? "; inline scripts are per-OS only (the singular policyHelper key takes a path)"
                  : field === "outputBehavior" || field === "onFailure" || field === "retries"
                    ? ""
                    : ", or on the singular policyHelper key";
              report({
                path: "policyHelpers",
                message: `"${field}" directly on the policyHelpers map is ignored \u2014 helper configs go on a per-OS entry (policyHelpers.${SUPPORTED_PLATFORMS.join("/")})${hint}. No helper runs from this field here.`,
                statusOnly: true,
              });
            }
        }
        return value === null ? undefined : value;
      },
      objectSchema(
        Object.fromEntries(POLICY_HELPER_KEYS.map((entryKey) => [entryKey, buildEntrySchema(entryKey)])),
      )
        .transform((record) => {
          for (let key of Object.keys(record)) if (record[key] === undefined) delete record[key];
          for (let { entryKey, message } of deferredMessages) {
            let path = `policyHelpers.${entryKey}`;
            let found = platformSpellings(entryKey).find(
              (candidate) =>
                record[candidate]?.defaultSettings !== undefined &&
                record[candidate]?.defaultSettings !== null,
            );
            let fallbackPath =
              found !== undefined
                ? `${found}.defaultSettings`
                : record.default !== undefined
                  ? "default"
                  : null;
            report(
              fallbackPath !== null
                ? {
                    path,
                    message: `${message} Its "onFailure" requires the helper; the "policyHelpers.${fallbackPath}" static payload serves in its place.`,
                    statusOnly: true,
                  }
                : {
                    path,
                    message: `${message} Its "onFailure" requires the helper, so when delivered from an OS-admin policy source (MDM or the managed settings file), Claude Code will not start until this is fixed.`,
                    startupFatal: true,
                  },
            );
          }
          deferredMessages = [];
          return record;
        })
        .optional()
        .catch((error) => {
          report({
            path: "policyHelpers",
            message: `"policyHelpers" could not be parsed: expected an object mapping OS keys (${SUPPORTED_PLATFORMS.join(", ")}) to helper entries, plus an optional "default" settings payload (${error.issues[0]?.message ?? "failed schema validation"}). When delivered from an OS-admin policy source (MDM or the managed settings file), Claude Code will not start until this is fixed.`,
            startupFatal: true,
          });
          return {};
        }),
    ),
  );
  let weakSet = new WeakSet();
  for (let key of perKeySchema.keys) {
    if (key === "sandbox" || !isRestrictiveNestedPath(key)) continue;
    setOverride(key, () => {
      let fieldSchema = fieldFor(key);
      let schema = unwrapObjectSchema(fieldSchema);
      if (schema === undefined)
        return fieldSchema.catch((error) => {
          report({
            path: key,
            message: `${error.issues[0]?.message ?? "Failed schema validation"}. This field was ignored.`,
          });
          return;
        });
      return tolerantObjectSchema(key, schema, report, {
        synthesized: weakSet,
        strictField: fieldSchema,
      });
    });
  }
  let denyCredentialRule = Object.freeze({
    mode: "deny",
  });
  let strippedPair = Object.freeze({
    accessKeyIdVar: "_STRIPPED_",
    secretAccessKeyVar: "_STRIPPED_2_",
  });
  let pairSeq = 0;
  let salvagedPairs = [];
  let failClosedGroupNames = new Set();
  let degradedSigv4Flavors = new Set();
  let sentinelSuffix =
    sourceSalt === undefined
      ? ""
      : `${[...sourceSalt]
          .reduce((acc, foldingAcc) => Math.imul(acc ^ foldingAcc.charCodeAt(0), 16777619) >>> 0, 2166136261)
          .toString(16)
          .toUpperCase()
          .padStart(8, "0")}_`;
  let normalizePair = (value, issues) => {
    if (typeof value !== "object" || value === null) return;
    let mentionsVar = (varName) => issues.some((issue) => issue.path?.includes(varName));
    let readVar = (field) => {
      let fieldValue = value[field];
      if (typeof fieldValue === "string") return fieldValue;
      return mentionsVar(field) ? "" : undefined;
    };
    let accessKeyIdVar = readVar("accessKeyIdVar");
    let secretAccessKeyVar = readVar("secretAccessKeyVar");
    let sessionTokenVar = readVar("sessionTokenVar");
    let conventionalVarNames = AWS_CREDENTIAL_ENV_NAMES;
    if (
      ![accessKeyIdVar, secretAccessKeyVar, sessionTokenVar].some(
        (varName) => varName !== undefined && conventionalVarNames.includes(varName),
      )
    )
      return;
    let isValidVarName = (varName) =>
      varName !== undefined && credentialRulePathSchema().safeParse(varName).success;
    pairSeq += 1;
    let strippedVar = (label) => `${INVALID_PAIR_SENTINEL}${label}_${sentinelSuffix}${pairSeq}_`;
    let normalizedKeyId = isValidVarName(accessKeyIdVar) ? accessKeyIdVar : strippedVar("ACCESS_KEY_ID");
    let normalizedSecret =
      isValidVarName(secretAccessKeyVar) && secretAccessKeyVar !== normalizedKeyId
        ? secretAccessKeyVar
        : strippedVar("SECRET_ACCESS_KEY");
    let normalizedSessionToken =
      sessionTokenVar === undefined
        ? undefined
        : isValidVarName(sessionTokenVar) &&
            sessionTokenVar !== normalizedKeyId &&
            sessionTokenVar !== normalizedSecret
          ? sessionTokenVar
          : strippedVar("SESSION_TOKEN");
    let isStripped = (varName) => varName.startsWith(INVALID_PAIR_SENTINEL);
    if (!isStripped(normalizedKeyId) && !isStripped(normalizedSecret)) {
      let secretNameAsKeyId = conventionalVarNames.includes(normalizedSecret) ? normalizedSecret : undefined;
      normalizedSecret = strippedVar("SECRET_ACCESS_KEY");
      if (secretNameAsKeyId !== undefined) {
        let salvagedPair = normalizePair(
          {
            accessKeyIdVar: secretNameAsKeyId,
          },
          [],
        );
        if (salvagedPair !== undefined) salvagedPairs.push(salvagedPair);
      }
    }
    let parsed = credentialEnvRuleSchema().safeParse({
      accessKeyIdVar: normalizedKeyId,
      secretAccessKeyVar: normalizedSecret,
      ...(normalizedSessionToken !== undefined && {
        sessionTokenVar: normalizedSessionToken,
      }),
    });
    return parsed.success ? parsed.data : undefined;
  };
  let credentialListSchema = (fieldName, entrySchema, degradeToDeny) =>
    array(
      entrySchema.catch((error) => {
        let degraded = degradeToDeny(error.value);
        if (degraded !== undefined) {
          report({
            path: `sandbox.credentials.${fieldName}[]`,
            message: `Invalid entry was degraded to mode "deny": ${error.issues[0]?.message ?? "failed validation"}. The credential stays blocked (not masked) until the entry is fixed.${fieldName === "files" ? " Under sandbox.filesystem.disabled, file read-denies are not enforced." : ""}`,
            substituted: true,
          });
          return degraded;
        }
        report({
          path: `sandbox.credentials.${fieldName}[]`,
          message: `Invalid entry was ignored: ${error.issues[0]?.message ?? "failed validation"}. This credential is NOT protected until the entry is fixed.`,
        });
        return denyCredentialRule;
      }),
    )
      .transform((entries) => {
        let filtered = entries.filter((entry) => entry !== denyCredentialRule);
        if (entries.length > 0 && filtered.length === 0) failClosedGroupNames.add(fieldName);
        return filtered;
      })
      .optional()
      .catch((error) => {
        if (typeof error.value === "object" && error.value !== null && !Array.isArray(error.value)) {
          let parsed = entrySchema.safeParse(error.value);
          if (parsed.success) {
            report({
              path: `sandbox.credentials.${fieldName}`,
              message: `"${fieldName}" must be an array; a lone entry object was accepted as a one-element list. Wrap it in [ ] to silence this warning.`,
            });
            return [parsed.data];
          }
          let degraded = degradeToDeny(error.value);
          if (degraded !== undefined) {
            report({
              path: `sandbox.credentials.${fieldName}`,
              message: `"${fieldName}" must be an array; its lone entry object was invalid and was degraded to mode "deny". The credential stays blocked (not masked) until it is fixed.`,
              substituted: true,
            });
            return [degraded];
          }
        }
        report({
          path: `sandbox.credentials.${fieldName}`,
          message: `${error.issues[0]?.message ?? "Invalid value"}. "${fieldName}" was ignored; these credential entries are NOT protected until it is fixed.`,
        });
        failClosedGroupNames.add(fieldName);
        return [];
      });
  setOverride("sandbox", () => {
    let sandboxSchema = objectSchema({
      files: credentialListSchema("files", CredentialRuleSchema(), (value) => {
        if (
          typeof value !== "object" ||
          value === null ||
          !("mode" in value) ||
          (value.mode !== "mask" && value.mode !== "deny") ||
          !("path" in value) ||
          typeof value.path !== "string"
        )
          return;
        let denyParsed = CredentialRuleSchema().safeParse({
          path: value.path,
          mode: "deny",
        });
        return denyParsed.success ? denyParsed.data : undefined;
      }),
      envVars: credentialListSchema("envVars", credentialRuleModeSchema(), (value) => {
        if (
          typeof value !== "object" ||
          value === null ||
          !("mode" in value) ||
          (value.mode !== "mask" && value.mode !== "deny") ||
          !("name" in value) ||
          typeof value.name !== "string"
        )
          return;
        let denyParsed = credentialRuleModeSchema().safeParse({
          name: value.name,
          mode: "deny",
        });
        return denyParsed.success ? denyParsed.data : undefined;
      }),
      allowPlaintextInject: coerceRestrictiveValue(
        "sandbox.credentials.allowPlaintextInject",
        RESTRICTIVE_NESTED_SETTING_VALUES().get("sandbox.credentials.allowPlaintextInject"),
        booleanSchema().optional(),
        report,
      ).catch((error) => {
        report({
          path: "sandbox.credentials.allowPlaintextInject",
          message: `${error.issues[0]?.message ?? "Invalid value"}. "allowPlaintextInject" was degraded to an explicit false; plaintext credential injection stays disabled (lower-precedence values cannot enable it) until it is fixed.`,
          substituted: true,
        });
        failClosedGroupNames.add("allowPlaintextInject");
        return false;
      }),
      awsPairs: array(
        credentialEnvRuleSchema().catch((error) => {
          let normalizedPair = normalizePair(error.value, error.issues);
          if (normalizedPair !== undefined) {
            report({
              path: "sandbox.credentials.awsPairs[]",
              message: `Invalid pair was degraded to a non-functional suppressor: ${error.issues[0]?.message ?? "failed validation"}. It keeps implicit AWS auto-pairing suppressed but re-signs nothing until it is fixed.`,
              substituted: true,
            });
            return normalizedPair;
          }
          report({
            path: "sandbox.credentials.awsPairs[]",
            message: `Invalid pair was ignored: ${error.issues[0]?.message ?? "failed validation"}. SigV4 re-signing stays unconfigured for this pair until it is fixed.`,
          });
          return strippedPair;
        }),
      )
        .transform((pairs) => {
          let filtered = pairs.filter((pair) => pair !== strippedPair);
          if (salvagedPairs.length > 0) {
            filtered.push(...salvagedPairs);
            salvagedPairs.length = 0;
          }
          if (pairs.length > 0 && filtered.length === 0) failClosedGroupNames.add("awsPairs");
          return filtered;
        })
        .optional()
        .catch((error) => {
          let normalizedPair =
            typeof error.value === "object" && error.value !== null
              ? normalizePair(error.value, [])
              : undefined;
          let looksLikePair =
            typeof error.value === "object" &&
            error.value !== null &&
            ("accessKeyIdVar" in error.value ||
              "secretAccessKeyVar" in error.value ||
              "sessionTokenVar" in error.value);
          if (normalizedPair === undefined && looksLikePair) {
            salvagedPairs.length = 0;
            report({
              path: "sandbox.credentials.awsPairs",
              message: `${error.issues[0]?.message ?? "Invalid value"}. "awsPairs" must be an array; its lone pair-shaped entry claimed no conventional AWS name and was ignored. SigV4 re-signing stays unconfigured until it is fixed.`,
            });
            failClosedGroupNames.add("awsPairs");
            return [];
          }
          let pairs =
            normalizedPair !== undefined
              ? [normalizedPair]
              : AWS_CREDENTIAL_ENV_NAMES.flatMap((accessKeyIdVar) => {
                  let normalizedPair = normalizePair(
                    {
                      accessKeyIdVar,
                    },
                    [],
                  );
                  return normalizedPair !== undefined ? [normalizedPair] : [];
                });
          if (salvagedPairs.length > 0) {
            pairs.push(...salvagedPairs);
            salvagedPairs.length = 0;
          }
          if (normalizedPair === undefined) failClosedGroupNames.add("awsPairs");
          report({
            path: "sandbox.credentials.awsPairs",
            message: `${error.issues[0]?.message ?? "Invalid value"}. "awsPairs" was degraded to non-functional suppressor pair(s); implicit AWS auto-pairing stays suppressed but nothing re-signs until it is fixed.`,
            substituted: true,
          });
          return pairs;
        }),
      sigv4: objectSchema(
        Object.fromEntries(
          ["streaming", "presigned", "sigv4a"].map((flavor) => [
            flavor,
            _enum(["deny", "passthrough"])
              .optional()
              .catch((error) => {
                report({
                  path: `sandbox.credentials.sigv4.${flavor}`,
                  message: `${error.issues[0]?.message ?? "Invalid value"}. "${flavor}" was degraded to an explicit deny; this SigV4 request shape stays denied until it is fixed.`,
                  substituted: true,
                });
                degradedSigv4Flavors.add(flavor);
                return "deny";
              }),
          ]),
        ),
      )
        .transform((flavors) => {
          let filtered = Object.entries(flavors).filter(([, value]) => value !== undefined);
          if (filtered.length > 0 && filtered.every(([flavor]) => degradedSigv4Flavors.has(flavor)))
            failClosedGroupNames.add("sigv4");
          degradedSigv4Flavors.clear();
          return flavors;
        })
        .optional()
        .catch((error) => {
          report({
            path: "sandbox.credentials.sigv4",
            message: `${error.issues[0]?.message ?? "Invalid value"}. "sigv4" was degraded to an all-deny block (all shapes stay denied, and lower-precedence sigv4 values cannot take effect) until it is fixed.`,
            substituted: true,
          });
          degradedSigv4Flavors.clear();
          failClosedGroupNames.add("sigv4");
          return {
            streaming: "deny",
            presigned: "deny",
            sigv4a: "deny",
          };
        }),
    })
      .transform((sandbox) => {
        let filtered = Object.entries(sandbox).filter(([, value]) => value !== undefined);
        if (filtered.length > 0 && filtered.every(([key]) => failClosedGroupNames.has(key)))
          weakSet.add(sandbox);
        failClosedGroupNames.clear();
        return sandbox;
      })
      .optional()
      .catch((error) => {
        report({
          path: "sandbox.credentials",
          message: `${error.issues[0]?.message ?? "Failed schema validation"}. The credentials block was degraded to a fail-closed skeleton (all-deny sigv4, implicit AWS auto-pairing suppressed, no masking) until it is fixed.`,
          substituted: true,
        });
        let awsPairs = AWS_CREDENTIAL_ENV_NAMES.flatMap((accessKeyIdVar) => {
          let normalizedPair = normalizePair(
            {
              accessKeyIdVar,
            },
            [],
          );
          return normalizedPair !== undefined ? [normalizedPair] : [];
        });
        salvagedPairs.length = 0;
        failClosedGroupNames.clear();
        degradedSigv4Flavors.clear();
        let defaultCredentials = {
          allowPlaintextInject: false,
          awsPairs,
          sigv4: {
            streaming: "deny",
            presigned: "deny",
            sigv4a: "deny",
          },
        };
        weakSet.add(defaultCredentials);
        return defaultCredentials;
      });
    return tolerantObjectSchema("sandbox", sandboxFilesystemSettingsSchema(), report, {
      override: {
        "sandbox.credentials": sandboxSchema,
      },
      skeletonExclude: new Set(["sandbox.enabled"]),
      neverSubstitute: new Set(["sandbox.failIfUnavailable"]),
      synthesized: weakSet,
    });
  });
  let shape = {};
  for (let key of perKeySchema.keys) {
    if (!isTolerantKey(key)) continue;
    let override = overrides.get(key);
    shape[key] = override
      ? override()
      : fieldFor(key).catch((error) => {
          report({
            path: key,
            message: `${error.issues[0]?.message ?? "Failed schema validation"}. This field was ignored.`,
          });
          return;
        });
  }
  for (let [overrideKey, overrideSchema] of overrides)
    if (!(overrideKey in shape) && isTolerantKey(overrideKey)) shape[overrideKey] = overrideSchema();
  return objectSchema(shape)
    .passthrough()
    .check((ctx) => {
      ctx.issues.push(...perKeySchema.wrongDocumentIssues(ctx.value, shape));
    })
    .transform((value) => {
      for (let key of Object.keys(value)) if (value[key] === undefined) delete value[key];
      let filtered = Object.keys(value).filter(
        (key) =>
          !restrictiveTopLevelSettings.some(
            (restrictiveTopLevelSetting) => restrictiveTopLevelSetting === key,
          ) && !isDeepEmptyObject(value[key]),
      );
      let onlySubstitutes =
        filtered.length > 0 &&
        filtered.every((key) => failClosedKeys.has(key) || isObjectInSet(weakSet, value[key]));
      failClosedKeys.clear();
      if (onlySubstitutes)
        for (let key of filtered)
          report({
            path: key,
            message: `"${key}" holds nothing that could be applied as written and is this source's only policy content; its fail-closed reading binds (beside a lower managed settings source's policy, when one supplies it) until it is fixed.`,
            statusOnly: true,
            onlySubstitutes: true,
          });
      return value;
    });
}
//@ chunk-dcmhvw5a.js:348175-348237 fingerprint (2.1.88 match: isMcpServerNameEntry, 1)
function isMcpServerNameEntry(entry) {
  return "serverName" in entry && entry.serverName !== undefined;
}
//@ chunk-dcmhvw5a.js:348237-348305 fingerprint (2.1.88 match: isMcpServerCommandEntry, 1)
function isMcpServerCommandEntry(entry) {
  return "serverCommand" in entry && entry.serverCommand !== undefined;
}
//@ chunk-dcmhvw5a.js:348305-348365 fingerprint (2.1.88 match: isMcpServerUrlEntry, 1)
function isMcpServerUrlEntry(entry) {
  return "serverUrl" in entry && entry.serverUrl !== undefined;
}
//@ chunk-5nte8cwj.js:1184-1251 fingerprint (2.1.88 match: EnvironmentVariablesSchema, 0.544)
function EnvironmentVariablesSchema(version) {
  let desktopVersion = semverModuleForDesktop.coerce(version);
  return desktopVersion !== null && semverGt(desktopVersion.version, MIN_DESKTOP_VERSION);
}
export {
  isMcpServerUrlEntry,
  isMcpServerCommandEntry,
  isMcpServerNameEntry,
  getSettingsSchemaForDocument,
  buildWholeSettingsSchema,
  POLICY_HELPER_LOG_LEVELS,
  getSettingsFieldSchema,
  getStrippingSettingsSchema,
  PermissionsSettingsSchema,
  EnvironmentVariablesSchema,
  skillsSettingsSchema,
  UNREADABLE_SETTING_MARKER,
  isNetworkOrMacSpecialPath,
  RESTRICTIVE_NESTED_SETTINGS,
  platformSpellings,
  SUPPORTED_PLATFORMS,
  SKILL_OVERRIDE_COMPONENTS,
  wholeSettingsSchema,
  withholdGrants,
  allowedMcpServersSchema,
  deniedMcpServersSchema,
  RESTRICTIVE_TOP_LEVEL_SETTINGS,
  getUnenforceableMarketplaceReason,
  agentsSettingsSchema,
  outputStylesSettingsSchema,
  mcpSettingsSchema,
  hooksSettingsSchema,
  POLICY_HELPER_ON_FAILURE,
  restrictiveTopLevelSettings,
  restrictiveNestedSettingsMap,
  buildPolicyTolerantSettingsSchema,
  isRestrictiveDisable,
  isRestrictiveNestedPath,
  readWslInheritFlag,
  isDeepEmptyObject,
  isPowerShellScript,
  MAX_HELPER_RETRIES,
  MAX_HELPER_MS,
  PATH_OR_SCRIPT_MESSAGE,
  validateInlineHelper,
  POLICY_HELPER_EXECUTABLE_RE,
  hasPowerShellGlobChars,
  PS1_WILDCARD_MESSAGE,
  looksLikeUncPath,
  isKernelPseudoPath,
  isNormalizedHelperPath,
  STATIC_PAYLOAD_SCHEMA,
  isWarnedSettingsKey,
};
