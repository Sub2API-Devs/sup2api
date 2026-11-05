/**
 * utils/settings/settingsSourceTrust.ts
 *
 * 2.1.316 新增：凭据文件规则 schema；沙箱相关设置的说明文本等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (28)
 * attribution: placement 28
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute } from "path";
import { SETTING_SOURCE_TO_SCOPE } from "../plugins/pluginIdentifier.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  array,
  stringSchema,
  booleanSchema,
  numberSchema,
  preprocess,
  _enum,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { ZodIssueCode } from "../../../vendor/zod/v4/classic/compat.js";
import { errorMessage } from "../errors.js";
import { getIsInteractive } from "../../bootstrap/state.js";
import { isHostManagedProviderSession } from "../entrypointKinds.js";
import { env } from "../env.js";
import { identity as identity_2 } from "../identity.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:142690-142720 placement
/**
 * 设置来源名。
 */
function settingsSourceName(source) {
  return SETTING_SOURCE_TO_SCOPE[source];
}
//@ chunk-z20c443b.js:144205-152116 placement
/**
 * 沙箱相关设置的说明文本。
 */
var SANDBOX_SETTING_DESCRIPTIONS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SANDBOX_DESCRIPTION_PORTAL;
var SANDBOX_DESCRIPTION_DENY_DOMAINS;
var SANDBOX_DESCRIPTION_DENY_READ;
var SANDBOX_DESCRIPTION_PORTAL_2;
var SANDBOX_DESCRIPTION_PROJECT_IGNORED;
var SANDBOX_DESCRIPTION_TRUE_IGNORED;
var SANDBOX_DESCRIPTION_FALSE_IGNORED;
var SANDBOX_DESCRIPTION_MANAGED_ONLY;
var SANDBOX_DESCRIPTION_READ_REOPEN;
var SANDBOX_DESCRIPTION_DENY_WRITE;
var SANDBOX_DESCRIPTION_FILESYSTEM;
var SANDBOX_DESCRIPTION_CREDENTIALS;
deferInit("chunk-z20c443b.js:144205", () => {
  SANDBOX_SETTING_DESCRIPTIONS =
    "When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true";
  SANDBOX_DESCRIPTION_PORTAL =
    "When managed settings or a --settings file set allowUnsandboxedCommands: false, network.deniedDomains " +
    "or a WebFetch(domain:\u2026) deny rule, when managed settings set network.allowManagedDomainsOnly: true, " +
    "or when managed, --settings or user settings set network.strictAllowlist: true";
  SANDBOX_DESCRIPTION_DENY_DOMAINS =
    "When managed settings or a --settings file set allowUnsandboxedCommands: false, filesystem.denyRead, " +
    "a Read(\u2026) deny rule or a credentials.files entry (deny or mask), or managed settings set network.allowManagedDomainsOnly: true";
  SANDBOX_DESCRIPTION_DENY_READ =
    "When managed settings or a --settings file set filesystem.denyRead, a Read(\u2026) deny rule " +
    "or a credentials.files entry (deny or mask)";
  SANDBOX_DESCRIPTION_PORTAL_2 = "project settings (.claude/settings.json and .claude/settings.local.json)";
  SANDBOX_DESCRIPTION_PROJECT_IGNORED = `${SANDBOX_SETTING_DESCRIPTIONS}, values from ${SANDBOX_DESCRIPTION_PORTAL_2} are ignored.`;
  SANDBOX_DESCRIPTION_TRUE_IGNORED = `${SANDBOX_SETTING_DESCRIPTIONS}, true from ${SANDBOX_DESCRIPTION_PORTAL_2} is ignored (false there still applies).`;
  SANDBOX_DESCRIPTION_FALSE_IGNORED = `${SANDBOX_SETTING_DESCRIPTIONS}, and managed, --settings or user settings set true, false from ${SANDBOX_DESCRIPTION_PORTAL_2} is ignored (true there still applies).`;
  SANDBOX_DESCRIPTION_MANAGED_ONLY = `${SANDBOX_DESCRIPTION_PORTAL}, values from ${SANDBOX_DESCRIPTION_PORTAL_2} are ignored. With network.allowManagedDomainsOnly, only managed settings may set it.`;
  SANDBOX_DESCRIPTION_READ_REOPEN = `${SANDBOX_DESCRIPTION_DENY_DOMAINS}, a value from ${SANDBOX_DESCRIPTION_PORTAL_2} that would re-open a path managed, --settings or user settings deny reading is ignored, as is one spelled as a glob or a network path (UNC or automount); one carving out of the project's own denyRead still applies. A value inside a directory sandboxed commands can write is re-checked before every command and dropped once it has been re-pointed into a denied path.`;
  SANDBOX_DESCRIPTION_DENY_WRITE = `${SANDBOX_DESCRIPTION_PROJECT_IGNORED} ${SANDBOX_DESCRIPTION_DENY_READ}, a value from ${SANDBOX_DESCRIPTION_PORTAL_2} under or equal to a denied path, or spelled as a glob or a network path (UNC or automount), is ignored. A value inside a directory sandboxed commands can already write is re-checked before every command and dropped once it has been re-pointed into a denied read path.`;
  SANDBOX_DESCRIPTION_FILESYSTEM = DoctorLazy(() =>
    objectSchema({
      allowedDomains: array(stringSchema())
        .optional()
        .describe(
          "Domains sandboxed commands may reach without a prompt (wildcards such as *.example.com supported). " +
            "Merged with WebFetch(domain:\u2026) allow rules and across settings sources. " +
            SANDBOX_DESCRIPTION_PROJECT_IGNORED +
            " With network.allowManagedDomainsOnly, only managed settings supply it.",
        ),
      deniedDomains: array(stringSchema())
        .optional()
        .describe(
          "Domains that are always blocked, even if matched by allowedDomains. Supports the same wildcard syntax as allowedDomains. Merged from all settings sources regardless of allowManagedDomainsOnly.",
        ),
      strictAllowlist: booleanSchema()
        .optional()
        .describe(
          "When true, the sandbox runtime deterministically denies hosts not in allowedDomains instead of prompting. " +
            "Enforced for sandboxed commands only \u2014 in-process tools such as WebFetch are not gated by this setting. " +
            "Only honored from user, managed/policy, or CLI (--settings) settings \u2014 " +
            `${SANDBOX_DESCRIPTION_PORTAL_2} are ignored, and while it is on their allowedDomains ` +
            "and WebFetch(domain:\u2026) allow rules are left out of the allowlist.",
        ),
      allowManagedDomainsOnly: booleanSchema()
        .optional()
        .describe(
          "When true (and set in managed settings), only allowedDomains and WebFetch(domain:...) allow rules from managed settings are respected. User, project, local, and flag settings domains are ignored. Denied domains are still respected from all sources.",
        ),
      allowUnixSockets: array(stringSchema())
        .optional()
        .describe(
          "macOS only: Unix socket paths to allow. Ignored on Linux (seccomp cannot filter by path). Merged across settings sources. " +
            SANDBOX_DESCRIPTION_PROJECT_IGNORED,
        ),
      allowAllUnixSockets: booleanSchema()
        .optional()
        .describe(
          "If true, allow all Unix sockets (disables blocking on both platforms). " +
            SANDBOX_DESCRIPTION_TRUE_IGNORED,
        ),
      allowLocalBinding: booleanSchema()
        .optional()
        .describe(
          "macOS only: If true, sandboxed commands can bind to localhost ports. " +
            SANDBOX_DESCRIPTION_TRUE_IGNORED,
        ),
      allowMachLookup: array(
        stringSchema().refine(
          (pattern) => !(pattern.endsWith("*") ? pattern.slice(0, -1) : pattern).includes("*"),
          {
            message:
              'Wildcards are only allowed as a single trailing "*" (e.g., "com.example.*" or "*" for all services).',
          },
        ),
      )
        .optional()
        .describe(
          'macOS only: Additional XPC/Mach service names to allow looking up. Supports trailing-wildcard prefix matching (e.g., "com.apple.CoreSimulator.*"). Needed for tools that communicate via XPC such as the iOS Simulator or Playwright. Each entry lets sandboxed commands reach services outside the sandbox, and the sandbox does not confine what those services do for them. Merged across settings sources. ' +
            SANDBOX_DESCRIPTION_PROJECT_IGNORED,
        ),
      httpProxyPort: numberSchema()
        .optional()
        .describe(
          "Local TCP port of your own HTTP proxy for sandboxed traffic, used instead of the proxy Claude Code runs. " +
            SANDBOX_DESCRIPTION_MANAGED_ONLY,
        ),
      socksProxyPort: numberSchema()
        .optional()
        .describe(
          "Local TCP port of your own SOCKS5 proxy for sandboxed traffic, used instead of the proxy Claude Code runs. " +
            SANDBOX_DESCRIPTION_MANAGED_ONLY,
        ),
      tlsTerminate: objectSchema({
        caCertPath: stringSchema().min(1).optional(),
        caKeyPath: stringSchema().min(1).optional(),
      })
        .optional()
        .describe(
          "[EXPERIMENTAL] Enable in-process TLS termination so the per-request filter can see HTTPS request bodies. Provide a CA cert+key, or omit both to have sandbox-runtime generate an ephemeral one for the session. On native Windows an ephemeral CA cannot pass the sandbox trust check, so omitting the paths uses a persistent CA managed by the sandbox runtime (set up and trusted via /sandbox install); configured paths are passed to the sandbox runtime verbatim, which rejects a bad or incomplete pair at sandbox initialization. " +
            "Only honored from user, managed/policy, or CLI (`--settings`) settings \u2014 project settings " +
            "(.claude/settings.json and .claude/settings.local.json) are ignored.",
        ),
    }).optional(),
  );
  SANDBOX_DESCRIPTION_CREDENTIALS = DoctorLazy(() =>
    objectSchema({
      allowWrite: array(stringSchema())
        .optional()
        .describe(
          "Additional paths to allow writing within the sandbox. Merged with paths from Edit(...) allow permission rules. " +
            SANDBOX_DESCRIPTION_DENY_WRITE,
        ),
      denyWrite: array(stringSchema())
        .optional()
        .describe(
          "Additional paths to deny writing within the sandbox. Merged with paths from Edit(...) deny permission rules.",
        ),
      denyRead: array(stringSchema())
        .optional()
        .describe(
          "Additional paths to deny reading within the sandbox. Merged with paths from Read(...) deny permission rules.",
        ),
      allowRead: array(stringSchema())
        .optional()
        .describe(
          "Paths to re-allow reading within denyRead regions. Takes precedence over denyRead for matching paths. " +
            SANDBOX_DESCRIPTION_READ_REOPEN,
        ),
      allowManagedReadPathsOnly: booleanSchema()
        .optional()
        .describe("When true (set in managed settings), only allowRead paths from policySettings are used."),
      disabled: booleanSchema()
        .optional()
        .describe(
          "macOS and Linux/WSL only: skip filesystem isolation entirely while keeping network and seccomp isolation. Ignored on native Windows, where the sandboxed process runs as a separate user with no inherent rights, so skipping the filesystem rules would " +
            "withhold every access grant rather than loosen them \u2014 filesystem isolation stays on there. " +
            "Sandboxed commands get unrestricted read/write access to the host filesystem; network egress is still confined to network.allowedDomains. Intended for deployments whose goal is egress control rather than filesystem containment. Does not change Bash prompting: sandbox.autoAllowBashIfSandboxed is independent and still defaults to true, so set it to false to keep prompting for sandboxed commands. Drops the read protection from filesystem.denyRead and credentials.files deny entries for sandboxed commands, since both are enforced by the filesystem layer this turns off; credentials.files mask entries (sentinel binds) and credentials.envVars deny/mask are unaffected. " +
            "Only honored from user, managed/policy, or CLI (`--settings`) settings \u2014 " +
            "project settings (.claude/settings.json and .claude/settings.local.json) are ignored. If managed settings configure sandbox.filesystem at all, or list any sandbox.credentials.files deny entry, only managed settings can set this: an admin who deployed filesystem restrictions must not have them switched off by a user-writable file. (sandbox.credentials.envVars and credentials.files mask entries " +
            "do not pin it \u2014 env scrubbing and sentinel binds are independent of the filesystem " +
            "layer and survive this setting.) When unset, filesystem isolation stays on.",
        ),
    }).optional(),
  );
});
//@ chunk-z20c443b.js:152116-152537 placement
/**
 * 校验 maskClaims。
 */
function validateMaskClaims(maskClaims, decode, context) {
  if (maskClaims.length === 0 || maskClaims.some((claim) => claim.length === 0))
    context.addIssue({
      code: ZodIssueCode.custom,
      path: ["maskClaims"],
      message:
        "maskClaims must name at least one non-empty claim \u2014 omit maskClaims for whole-token masking.",
    });
  if (decode === undefined)
    context.addIssue({
      code: ZodIssueCode.custom,
      path: ["maskClaims"],
      message:
        "maskClaims requires decode \u2014 without a decode format there is no token to read claims from. Set decode, or omit maskClaims.",
    });
}
//@ chunk-z20c443b.js:152537-152934 placement
/**
 * 校验 extract 正则。
 */
function validateExtractPattern(extract, context) {
  let compiled;
  try {
    compiled = new RegExp(extract);
  } catch (error) {
    context.addIssue({
      code: ZodIssueCode.custom,
      path: ["extract"],
      message: `extract is not a valid regular expression: ${errorMessage(error)}`,
    });
    return;
  }
  if (new RegExp(compiled.source + "|").exec("").length - 1 < 1)
    context.addIssue({
      code: ZodIssueCode.custom,
      path: ["extract"],
      message:
        "extract must contain at least one capturing group \u2014 " +
        'group 1 is the credential value to mask (e.g. "token:\\s*(\\S+)").',
    });
}
//@ chunk-z20c443b.js:152934-153627 placement
/**
 * 规范化凭据规则（deny 模式）。
 */
function normalizeCredentialRule(rule) {
  if (typeof rule !== "object" || rule === null) return rule;
  let ruleObject = rule;
  if (ruleObject.mode !== "deny") return rule;
  let normalized = {
    ...ruleObject,
  };
  if ("extract" in normalized && typeof normalized.extract !== "string") delete normalized.extract;
  if (
    "onExtractNoMatch" in normalized &&
    normalized.onExtractNoMatch !== "warn" &&
    normalized.onExtractNoMatch !== "deny" &&
    normalized.onExtractNoMatch !== "error"
  )
    delete normalized.onExtractNoMatch;
  if ("decode" in normalized && normalized.decode !== "jwt") delete normalized.decode;
  if (
    "maskClaims" in normalized &&
    !(
      Array.isArray(normalized.maskClaims) &&
      normalized.maskClaims.every((maskClaim) => typeof maskClaim === "string")
    )
  )
    delete normalized.maskClaims;
  if ("maskDuplicates" in normalized && typeof normalized.maskDuplicates !== "boolean")
    delete normalized.maskDuplicates;
  if (
    "injectHosts" in normalized &&
    !(
      Array.isArray(normalized.injectHosts) &&
      normalized.injectHosts.every((injectHost) => typeof injectHost === "string")
    )
  )
    delete normalized.injectHosts;
  return normalized;
}
//@ chunk-z20c443b.js:153627-171793 placement
/**
 * 凭据文件规则 schema。
 */
var CredentialRuleSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var credentialRulePathSchema;
var credentialRuleModeSchema;
var AWS_CREDENTIAL_ENV_NAMES;
var SLOT_COLLISION_SENTINEL;
var INVALID_PAIR_SENTINEL;
var PARENT_PAIR_SUPPRESSOR_SENTINEL;
var MERGE_PAIR_SUPPRESSOR_SENTINEL;
var CREDENTIAL_CHILD_SENTINELS;
var credentialRuleRefine;
var credentialEnvRuleSchema;
var envVarNameSchema;
var sandboxNetworkSettingsSchema;
var sandboxFilesystemSettingsSchema;
deferInit("chunk-z20c443b.js:153627", () => {
  CredentialRuleSchema = DoctorLazy(() =>
    preprocess(
      normalizeCredentialRule,
      objectSchema({
        path: stringSchema()
          .min(1)
          .describe(
            "Path to a credential file or directory. Same resolution as sandbox.filesystem.* paths: absolute, ~ expanded, or relative to the settings file root (project root for project settings, ~/.claude for user settings).",
          ),
        mode: _enum(["deny", "mask"]).describe(
          "Access mode for this path. `deny` blocks reads inside the sandbox; `mask` shows sandboxed commands a sentinel-substituted copy (whole-file, or only the spans captured by `extract`) and the " +
            "host proxy swaps sentinel\u2192real on egress to `injectHosts`. " +
            "On macOS and Windows `mask` currently degrades to `deny`.",
        ),
        extract: stringSchema()
          .optional()
          .describe(
            "Optional regex for structured masking when mode is `mask`. Applied globally to the file; capture group 1 of each match is a credential value, and only those captured spans are replaced " +
              "with sentinels \u2014 the rest of the file is preserved so a tool " +
              "that parses it (.netrc, JSON, YAML) still succeeds. Without `extract`, the entire file content is replaced with one sentinel (whole-file masking, suited to single-secret files). If the regex matches nothing, behavior is governed by `onExtractNoMatch` (default `warn`). Accepted but ignored for `deny`.",
          ),
        onExtractNoMatch: _enum(["warn", "deny", "error"])
          .optional()
          .describe(
            "What to do when `extract` matches nothing in the file \u2014 or, " +
              "with `decode`, when no candidate survives verification. `warn` (default) emits a stderr warning and leaves the file readable as-is inside the sandbox (fail-open, for credentials that may be legitimately absent); `deny` degrades the entry to " +
              "mode `deny` so the file is unreadable (fail-closed) \u2014 under " +
              "`sandbox.filesystem.disabled` it is treated as `error`, since read-denies are dropped in that mode; `error` aborts at sandbox setup so nothing runs until the config is fixed. Only meaningful when mode is `mask` and `extract` or `decode` is set; accepted but ignored otherwise.",
          ),
        decode: _enum(["jwt"])
          .optional()
          .describe(
            "Optional encoded-credential format for `mask` mode. `jwt`: candidates are located with a built-in JWT regex (or the explicit `extract` pattern, if set), verified to actually be JWTs before masking, and replaced with a structurally valid fake JWT so client-side token parsing inside the sandbox keeps working. If no candidate verifies, behavior is governed by `onExtractNoMatch` (default `warn`). Accepted but ignored for `deny`.",
          ),
        maskClaims: array(stringSchema())
          .optional()
          .describe(
            "Names of top-level payload claims to mask inside each decoded value, instead of replacing the whole token. Each named claim present with a string value gets its own sentinel and the token is rebuilt around the modified payload; all other claims are preserved so a tool that decodes the token and reads a non-secret claim keeps working. Requires `decode`. If no named claim matches in any verified token, behavior is governed by `onExtractNoMatch` (default `warn`). Only meaningful when mode is `mask`; accepted but ignored for `deny`.",
          ),
        maskDuplicates: booleanSchema()
          .optional()
          .describe(
            "If true, verbatim occurrences of each captured credential value outside the regex-matched spans are also replaced with the " +
              "corresponding sentinel \u2014 for a secret repeated where the regex " +
              "does not reach (e.g. pasted into a comment). Matches raw substrings, so short or common values may corrupt unrelated content; intended for long, high-entropy secrets. Defaults to false. Only meaningful when mode is `mask` and `extract` or `decode` is set; accepted but ignored otherwise.",
          ),
        injectHosts: array(stringSchema())
          .optional()
          .describe(
            "Optional narrowing of where the proxy substitutes this credential. Only meaningful when mode is `mask`; accepted but ignored for `deny`. If unset, defaults to " +
              "`network.allowedDomains` \u2014 the credential is injected at " +
              "every reachable host. Each entry must be reachable via `network.allowedDomains` (sandbox-runtime validates this).",
          ),
      }).superRefine((rule, ctx) => {
        if (rule.mode === "mask" && rule.path.endsWith("/"))
          ctx.addIssue({
            code: ZodIssueCode.custom,
            path: ["path"],
            message:
              'Credential mode "mask" applies to a single file, not a directory. List the specific credential file(s), or use "deny" for the directory.',
          });
        if (rule.mode === "mask" && rule.extract !== undefined) validateExtractPattern(rule.extract, ctx);
        if (rule.mode === "mask" && rule.maskClaims !== undefined)
          validateMaskClaims(rule.maskClaims, rule.decode, ctx);
      }),
    ),
  );
  credentialRulePathSchema = () =>
    stringSchema().regex(
      /^[A-Za-z_][A-Za-z0-9_]*$/,
      "Environment variable name must start with a letter or underscore and contain only letters, digits, and underscores",
    );
  credentialRuleModeSchema = DoctorLazy(() =>
    preprocess(
      normalizeCredentialRule,
      objectSchema({
        name: credentialRulePathSchema().describe("Environment variable name."),
        mode: _enum(["deny", "mask"]).describe(
          "Access mode for this environment variable. `deny` unsets the variable for sandboxed commands; `mask` shows sandboxed commands a sentinel value and the " +
            "host proxy swaps sentinel\u2192real on egress to `injectHosts`.",
        ),
        extract: stringSchema()
          .optional()
          .describe(
            "Optional regex for structured masking when mode is `mask`. Applied globally to the value; capture group 1 of each match is a credential value, and only those captured spans are " +
              "replaced with sentinels \u2014 the rest of the value is preserved " +
              "so a tool that parses it (a `DATABASE_URL` connection string, a composite `KEY:SECRET` pair) still succeeds inside the sandbox. Without `extract`, the entire value is replaced with one sentinel (whole-value masking, suited to bare tokens). If the regex matches nothing, behavior is governed by `onExtractNoMatch` (default `warn`). Cannot be combined with `decode` (the decode path never consults it). Accepted but ignored for `deny`.",
          ),
        onExtractNoMatch: _enum(["warn", "deny", "error"])
          .optional()
          .describe(
            "What to do when `extract` matches nothing in the value. `warn` (default) emits a stderr warning and lets the variable pass through unmasked (fail-open, for credentials that may be legitimately absent); `deny` unsets the variable inside the sandbox (fail-closed); `error` aborts at sandbox setup so nothing runs until the config is fixed. Only meaningful when mode is `mask` and `extract` is set without `decode`. On a mask entry with `decode`, the runtime takes the decode path and never consults this field, so a fail-closed setting " +
              "cannot be honored \u2014 `deny` and `error` are rejected there; " +
              "only `warn` is accepted. In all other shapes the field is accepted but ignored.",
          ),
        decode: _enum(["jwt"])
          .optional()
          .describe(
            "Optional encoded-credential format for `mask` mode. `jwt`: the variable's whole value is verified to actually be a JWT and replaced with a structurally valid fake JWT so client-side token parsing inside the sandbox keeps working; the proxy swaps the whole fake token on egress. If the value does not verify, the variable is left unmasked with a stderr warning " +
              "(fail-open). Cannot be combined with `extract` \u2014 the decode " +
              "path never consults it. Accepted but ignored for `deny`.",
          ),
        maskClaims: array(stringSchema())
          .optional()
          .describe(
            "Names of top-level payload claims to mask inside the decoded value, instead of replacing the whole token. Each named claim present with a string value gets its own sentinel and the token is rebuilt around the modified payload; all other claims are preserved so claim-reading clients keep working. Requires `decode`. If no named claim matches, the variable is left unmasked with a stderr warning (fail-open). Only meaningful when mode is `mask`; accepted but ignored for `deny`.",
          ),
        injectHosts: array(stringSchema())
          .optional()
          .describe(
            "Optional narrowing of where the proxy substitutes this credential. Only meaningful when mode is `mask`; accepted but ignored for `deny`. If unset, defaults to " +
              "`network.allowedDomains` \u2014 the credential is injected at " +
              "every reachable host. Each entry must be reachable via `network.allowedDomains` (sandbox-runtime validates this).",
          ),
      }).superRefine((rule, ctx) => {
        if (rule.mode === "mask" && rule.extract !== undefined) validateExtractPattern(rule.extract, ctx);
        if (rule.mode === "mask" && rule.maskClaims !== undefined)
          validateMaskClaims(rule.maskClaims, rule.decode, ctx);
        if (rule.mode === "mask" && rule.decode !== undefined && rule.extract !== undefined)
          ctx.addIssue({
            code: ZodIssueCode.custom,
            path: ["extract"],
            message:
              "extract cannot be combined with decode on an env entry \u2014 the runtime takes the decode path (whole-value JWT verification) and never consults extract, silently disabling the structured masking. Remove one of the two.",
          });
        if (
          rule.mode === "mask" &&
          rule.decode !== undefined &&
          (rule.onExtractNoMatch === "deny" || rule.onExtractNoMatch === "error")
        )
          ctx.addIssue({
            code: ZodIssueCode.custom,
            path: ["onExtractNoMatch"],
            message:
              "onExtractNoMatch cannot be honored on an env entry with decode \u2014 the runtime takes the decode path (which is unconditionally fail-open on verify failure) and never consults extract or onExtractNoMatch. Remove onExtractNoMatch, or drop decode to use extract-based masking (whose no-match handling does honor it).",
          });
      }),
    ),
  );
  AWS_CREDENTIAL_ENV_NAMES = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"];
  SLOT_COLLISION_SENTINEL = "_SLOT_COLLISION_";
  INVALID_PAIR_SENTINEL = "_INVALID_PAIR_";
  PARENT_PAIR_SUPPRESSOR_SENTINEL = "_PARENT_PAIR_SUPPRESSOR_";
  MERGE_PAIR_SUPPRESSOR_SENTINEL = "_MERGE_PAIR_SUPPRESSOR_";
  CREDENTIAL_CHILD_SENTINELS = [
    SLOT_COLLISION_SENTINEL,
    INVALID_PAIR_SENTINEL,
    PARENT_PAIR_SUPPRESSOR_SENTINEL,
    MERGE_PAIR_SUPPRESSOR_SENTINEL,
  ];
  credentialRuleRefine = (value) => CREDENTIAL_CHILD_SENTINELS.some((sentinel) => value.startsWith(sentinel));
  credentialEnvRuleSchema = DoctorLazy(() =>
    objectSchema({
      accessKeyIdVar: credentialRulePathSchema().describe(
        "Name of the masked env var holding the AWS access key id.",
      ),
      secretAccessKeyVar: credentialRulePathSchema().describe(
        "Name of the masked env var holding the AWS secret access key.",
      ),
      sessionTokenVar: credentialRulePathSchema()
        .optional()
        .describe(
          "Optional name of the masked env var holding the AWS session token (temporary credentials). When set, the proxy sends the real token as x-amz-security-token on re-signed requests and adds it to the signed header set if the client did not.",
        ),
    }).superRefine((pair, ctx) => {
      let slotByVar = new Map();
      for (let [slot, varName] of [
        ["accessKeyIdVar", pair.accessKeyIdVar],
        ["secretAccessKeyVar", pair.secretAccessKeyVar],
        ["sessionTokenVar", pair.sessionTokenVar],
      ]) {
        if (varName === undefined) continue;
        let existingSlot = slotByVar.get(varName);
        if (existingSlot !== undefined)
          ctx.addIssue({
            code: ZodIssueCode.custom,
            path: [slot],
            message: `${slot} names the same env var ('${varName}') as ${existingSlot} \u2014 each pair member must be a distinct variable.`,
          });
        else slotByVar.set(varName, slot);
      }
    }),
  );
  envVarNameSchema = DoctorLazy(() => {
    let policy = _enum(["deny", "passthrough"]);
    return objectSchema({
      streaming: policy
        .optional()
        .describe(
          "Policy for aws-chunked streaming uploads (x-amz-content-sha256: STREAMING-*): per-chunk signatures chain off the seed signature, so re-signing would require rewriting the body. `deny` (default) fails closed with a 403; `passthrough` forwards the request unre-signed (the upstream will reject its signature).",
        ),
      presigned: policy
        .optional()
        .describe(
          "Policy for presigned URLs (X-Amz-Algorithm/X-Amz-Signature in the query, no Authorization header): the signature lives in the URL itself. `deny` (default) or `passthrough`.",
        ),
      sigv4a: policy
        .optional()
        .describe(
          "Policy for SigV4A (AWS4-ECDSA-P256-SHA256) asymmetric signatures: there is no shared-key HMAC to recompute. `deny` (default) or `passthrough`.",
        ),
    });
  });
  sandboxNetworkSettingsSchema = DoctorLazy(() =>
    objectSchema({
      files: array(CredentialRuleSchema())
        .optional()
        .describe(
          "Credential files or directories to protect. `deny` blocks reads inside the sandbox; `mask` substitutes a sentinel inside the sandbox (whole-file, or per-`extract` capture) and injects the real value at the proxy. On macOS and Windows `mask` degrades to `deny`.",
        ),
      envVars: array(credentialRuleModeSchema())
        .optional()
        .describe(
          "Environment variables to protect. `deny` unsets the variable for sandboxed commands; `mask` substitutes a sentinel inside the sandbox and injects the real value at the proxy.",
        ),
      allowPlaintextInject: booleanSchema()
        .optional()
        .describe(
          "Allow sentinel\u2192real substitution on the plain-HTTP proxy path. " +
            "Defaults to false: without TLS termination the upstream identity is unverified and the credential travels in cleartext. Set only for trusted-network test fixtures. Only honored from user, managed/policy, or CLI (`--settings`) " +
            "settings \u2014 project settings (.claude/settings.json and " +
            ".claude/settings.local.json) are ignored.",
        ),
      awsPairs: array(credentialEnvRuleSchema())
        .optional()
        .describe(
          "Explicit groupings of masked env vars into AWS credential pairs for SigV4 re-signing, for non-standard variable names. The conventional AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN trio is paired automatically when masked. Only honored from user, managed/policy, or CLI (`--settings`) " +
            "settings \u2014 project settings (.claude/settings.json and " +
            ".claude/settings.local.json) are ignored. A member is only usable when its env var is forwarded as a whole-value `mask` entry (an entry carrying `extract` or `decode` does not " +
            "qualify \u2014 re-signing needs the whole real value). A pair " +
            "whose key id or secret member is unusable never re-signs: it is dropped, unless it names a conventional AWS variable, in which case it is forwarded as an inert suppressor so implicit auto-pairing stays overridden. A pair whose ONLY unusable member is the session token still re-signs, without an x-amz-security-token (temporary-credential requests fail upstream until the entry is fixed).",
        ),
      sigv4: envVarNameSchema()
        .optional()
        .describe(
          "Policies for AWS SigV4 request shapes the proxy cannot re-sign (streaming, presigned, sigv4a) when they reference a masked credential pair: `deny` (default) or `passthrough`. Only honored from user, managed/policy, or CLI (`--settings`) " +
            "settings \u2014 project settings (.claude/settings.json and " +
            ".claude/settings.local.json) are ignored.",
        ),
    })
      .superRefine((settings, ctx) => {
        let usedVars = new Set();
        for (let [pairIndex, pair] of (settings?.awsPairs ?? []).entries()) {
          let slots = [
            ["accessKeyIdVar", pair.accessKeyIdVar],
            ["secretAccessKeyVar", pair.secretAccessKeyVar],
            ["sessionTokenVar", pair.sessionTokenVar],
          ];
          let pairVars = new Set();
          for (let [slot, varName] of slots) {
            if (varName === undefined) continue;
            if (usedVars.has(varName))
              ctx.addIssue({
                code: ZodIssueCode.custom,
                path: ["awsPairs", pairIndex, slot],
                message: `"${varName}" appears in more than one awsPairs slot (within or across pairs) \u2014 each variable can fill exactly one slot.`,
              });
            pairVars.add(varName);
          }
          for (let varName of pairVars) usedVars.add(varName);
        }
      })
      .optional(),
  );
  sandboxFilesystemSettingsSchema = DoctorLazy(() =>
    objectSchema({
      enabled: booleanSchema()
        .optional()
        .describe(
          "Run Bash commands inside the sandbox. Default: false. " + SANDBOX_DESCRIPTION_FALSE_IGNORED,
        ),
      failIfUnavailable: booleanSchema()
        .optional()
        .describe(
          "Exit with an error at startup if sandbox.enabled is true but the sandbox cannot start (missing dependencies or unsupported platform). When false (default), a warning is shown and commands run unsandboxed. Intended for managed-settings deployments that require sandboxing as a hard gate. " +
            SANDBOX_DESCRIPTION_FALSE_IGNORED,
        ),
      autoAllowBashIfSandboxed: booleanSchema().optional(),
      allowUnsandboxedCommands: booleanSchema()
        .optional()
        .describe(
          `Allow commands to run outside the sandbox via the dangerouslyDisableSandbox parameter. When false, the dangerouslyDisableSandbox parameter is completely ignored and all commands must run sandboxed. Default: true. A false in managed, --settings or user settings holds whatever ${SANDBOX_DESCRIPTION_PORTAL_2} say (false there still applies).`,
        ),
      network: SANDBOX_DESCRIPTION_FILESYSTEM(),
      filesystem: SANDBOX_DESCRIPTION_CREDENTIALS(),
      credentials: sandboxNetworkSettingsSchema(),
      ignoreViolations: record(stringSchema(), array(stringSchema()))
        .optional()
        .describe(
          'Sandbox violations to leave unreported: a map of command patterns ("*" for every command) to the filesystem paths whose violations are ignored. Merged across settings sources. ' +
            SANDBOX_DESCRIPTION_PROJECT_IGNORED,
        ),
      enableWeakerNestedSandbox: booleanSchema()
        .optional()
        .describe(
          "Linux only: Run without the fresh /proc mount, for hosts such as unprivileged Docker containers that cannot create one. " +
            "**Reduces security** \u2014 the host /proc stays readable by sandboxed commands. Default: false. " +
            SANDBOX_DESCRIPTION_TRUE_IGNORED,
        ),
      allowNestedUserNamespaces: booleanSchema()
        .optional()
        .describe(
          "Linux/WSL only: Let sandboxed commands create user namespaces of their own, which the sandbox refuses by default. Needed by tools that sandbox themselves that way, such as Chromium's and Electron's sandbox, a nested bubblewrap, and `unshare`. " +
            "**Removes code-execution isolation** \u2014 in any folder a hostile command may write, it can then bypass filesystem.denyWrite, filesystem.denyRead, credentials.files entries and the paths the sandbox always write-protects (such as .claude/settings.json, git hooks and git config), " +
            "and so plant code that later runs outside the sandbox; while autoAllowBashIfSandboxed is on, the command that plants it needs no approval. Default: false. " +
            "Only honored from user, managed/policy, or CLI (--settings) settings \u2014 " +
            `true from ${SANDBOX_DESCRIPTION_PORTAL_2} is ignored (false there still applies).`,
        ),
      enableWeakerNetworkIsolation: booleanSchema()
        .optional()
        .describe(
          "macOS only: Allow access to com.apple.trustd.agent in the sandbox. Needed for Go-based CLI tools (gh, gcloud, terraform, etc.) to verify TLS certificates when using httpProxyPort with a MITM proxy and custom CA. " +
            "**Reduces security** \u2014 opens a potential data exfiltration vector through the trustd service. Default: false. " +
            SANDBOX_DESCRIPTION_TRUE_IGNORED,
        ),
      allowAppleEvents: booleanSchema()
        .optional()
        .describe(
          "macOS only: Allow sandboxed commands to send Apple Events (and look up the appleeventsd Mach service). Needed for `open`, `osascript`, and browser-based auth flows that open URLs. " +
            "**Removes code-execution isolation** \u2014 sandboxed commands can launch other applications " +
            "unsandboxed with no user prompt, and can script running apps (e.g. Terminal) subject to the user's per-app TCC automation consent. " +
            "Only honored from user, managed/policy, or CLI (--settings) settings \u2014 " +
            "project settings (.claude/settings.json and .claude/settings.local.json) are ignored. Default: false",
        ),
      excludedCommands: array(stringSchema())
        .optional()
        .describe(
          "Command patterns (Bash permission-rule syntax) for commands to run outside the sandbox. An entry takes a call out of the sandbox only when every command in the call matches an entry: in a Bash pipe or a chain such as `a && b`, each part needs its own match. Some calls stay sandboxed whatever the entries, such as one with a `cd`, a command substitution, or a redirect other than a file-descriptor duplication like `2>&1`, a heredoc included. A convenience, not a security boundary: excluded commands still go through the permission flow. Merged across settings sources. " +
            SANDBOX_DESCRIPTION_PROJECT_IGNORED,
        ),
      ripgrep: objectSchema({
        command: stringSchema(),
        args: array(stringSchema()).optional(),
      })
        .optional()
        .describe(
          "Custom ripgrep configuration for bundled ripgrep support. " +
            "Only honored from user, managed/policy, or CLI (--settings) settings \u2014 " +
            "project settings (.claude/settings.json and .claude/settings.local.json) are ignored.",
        ),
      bwrapPath: preprocess(
        (value) => (typeof value === "string" && isAbsolute(value) ? value : undefined),
        stringSchema(),
      )
        .optional()
        .catch(undefined)
        .describe(
          "Linux/WSL only: Absolute path to the bwrap (bubblewrap) binary. Overrides auto-detection via PATH. Only honored from admin-controlled managed settings.",
        ),
      socatPath: preprocess(
        (value) => (typeof value === "string" && isAbsolute(value) ? value : undefined),
        stringSchema(),
      )
        .optional()
        .catch(undefined)
        .describe(
          "Linux/WSL only: Absolute path to the socat binary used for the sandbox network proxy. Overrides auto-detection via PATH. Only honored from admin-controlled managed settings.",
        ),
    }).passthrough(),
  );
});
//@ chunk-z20c443b.js:171822-171894 placement
/**
 * isInteractiveSettingsHost：可交互且非后台托管会话。
 */
function isInteractiveSettingsHost() {
  return getIsInteractive() && !(isHostManagedProviderSession() && env.CLAUDE_CODE_SESSION_KIND === "bg");
}
//@ chunk-z20c443b.js:171894-172235 placement
/**
 * 设置相关开关名。
 */
var SETTINGS_GATE_NAMES = "tengu_twinkling_globe";
var TENGU_LOVELY_UMBRELLA = "tengu_lovely_umbrella";
var TENGU_STEADY_MARSHMALLOW = "tengu_steady_marshmallow";
var TENGU_TRANQUIL_CRESCENT = "tengu_tranquil_crescent";
var TENGU_STEADY_SUNBEAM = "tengu_steady_sunbeam";
var TENGU_HASHED_LARK = "tengu_hashed_lark";
var TENGU_VALIDATED_CLOVER = "tengu_validated_clover";
var TENGU_COPPER_KITE = "tengu_copper_kite";
var TENGU_CALM_EAGLE = "tengu_calm_eagle";
var TENGU_SNUG_PLATYPUS = "tengu_snug_platypus";
var TENGU_ASYNC_SNOWGLOBE = "tengu_async_snowglobe";
var TENGU_HUMBLE_FLURRY = "tengu_humble_flurry";
var TENGU_FIZZY_WIDGET = "tengu_fizzy_widget";
//@ chunk-z20c443b.js:172235-172397 placement
class ServedSettingsReader {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
  servedTrue(key) {
    let reader = this.reader;
    if (!reader) return false;
    try {
      return reader(key, false) === true;
    } catch {
      return false;
    }
  }
}
//@ chunk-z20c443b.js:172397-172521 placement
var servedSettingsReader; // deferred: uses ServedSettingsReader of its import cycle while loading; runs once the cycle is complete
var settingsGateState;
deferInit("chunk-z20c443b.js:172397", () => {
  servedSettingsReader = new ServedSettingsReader();
  settingsGateState = identity_2(
    {
      settled: undefined,
      answeredOff: false,
      answeredOn: false,
    },
    (state) => {
      state.settled = undefined;
      state.answeredOff = false;
      state.answeredOn = false;
    },
  );
});
//@ chunk-z20c443b.js:172521-172559 placement
/**
 * registerServedSettingsReader：登记服务端设置读取器。
 */
function registerServedSettingsReader(getFeatureValue_CACHED_MAY_BE_STALE) {
  return servedSettingsReader.register(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-z20c443b.js:172559-172711 placement
/**
 * 设置开关的结算值。
 */
function isSettingsGateSettled() {
  if (settingsGateState.settled !== undefined) return settingsGateState.settled;
  if (settingsGateState.answeredOff) return false;
  let isServed = servedSettingsReader.servedTrue(TENGU_FIZZY_WIDGET);
  settingsGateState.answeredOff = !isServed;
  settingsGateState.answeredOn ||= isServed;
  return isServed;
}
//@ chunk-z20c443b.js:172711-172754 placement
/**
 * isSettingsGateAnswered：设置闸门已结算或已答复。
 */
function isSettingsGateAnswered() {
  return isSettingsGateSettled() || settingsGateState.answeredOn;
}
//@ chunk-z20c443b.js:172754-172788 placement
/**
 * latchSettingsGateSettled：记录设置闸门已结算。
 */
function latchSettingsGateSettled() {
  settingsGateState.settled ??= isSettingsGateSettled();
}
//@ chunk-z20c443b.js:172788-172828 placement
/**
 * tengu_twinkling_globe 开关。
 */
function isTwinklingGlobeOn() {
  return servedSettingsReader.servedTrue(SETTINGS_GATE_NAMES);
}
//@ chunk-z20c443b.js:172828-172868 placement
/**
 * tengu_lovely_umbrella 开关。
 */
function isLovelyUmbrellaOn() {
  return servedSettingsReader.servedTrue(TENGU_LOVELY_UMBRELLA);
}
//@ chunk-z20c443b.js:172868-172909 placement
/**
 * isSteadyMarshmallowOn：开关 tengu_steady_marshmallow。
 */
function isSteadyMarshmallowOn() {
  return servedSettingsReader.servedTrue(TENGU_STEADY_MARSHMALLOW);
}
//@ chunk-z20c443b.js:172909-172949 placement
/**
 * isValidatedCloverOn：开关 tengu_validated_clover。
 */
function isValidatedCloverOn() {
  return servedSettingsReader.servedTrue(TENGU_VALIDATED_CLOVER);
}
//@ chunk-z20c443b.js:172949-172989 placement
/**
 * isTranquilCrescentOn：开关 tengu_tranquil_crescent。
 */
function isTranquilCrescentOn() {
  return servedSettingsReader.servedTrue(TENGU_TRANQUIL_CRESCENT);
}
//@ chunk-z20c443b.js:172989-173029 placement
/**
 * isSteadySunbeamOn：开关 tengu_steady_sunbeam。
 */
function isSteadySunbeamOn() {
  return servedSettingsReader.servedTrue(TENGU_STEADY_SUNBEAM);
}
//@ chunk-z20c443b.js:173029-173069 placement
/**
 * 服务端开关读取。
 */
function isGateAOn() {
  return servedSettingsReader.servedTrue(TENGU_COPPER_KITE);
}
//@ chunk-z20c443b.js:173069-173109 placement
/**
 * isHashedLarkOn：开关 tengu_hashed_lark。
 */
function isHashedLarkOn() {
  return servedSettingsReader.servedTrue(TENGU_HASHED_LARK);
}
//@ chunk-z20c443b.js:173109-173149 placement
/**
 * isCalmEagleOn：开关 tengu_calm_eagle。
 */
function isCalmEagleOn() {
  return servedSettingsReader.servedTrue(TENGU_CALM_EAGLE);
}
//@ chunk-z20c443b.js:173149-173189 placement
/**
 * 服务端开关读取。
 */
function isGateOOn() {
  return servedSettingsReader.servedTrue(TENGU_SNUG_PLATYPUS);
}
//@ chunk-z20c443b.js:173189-173229 placement
/**
 * isAsyncSnowglobeOn：开关 tengu_async_snowglobe。
 */
function isAsyncSnowglobeOn() {
  return servedSettingsReader.servedTrue(TENGU_ASYNC_SNOWGLOBE);
}
//@ chunk-z20c443b.js:173229-173269 placement
/**
 * isHumbleFlurryOn：开关 tengu_humble_flurry。
 */
function isHumbleFlurryOn() {
  return servedSettingsReader.servedTrue(TENGU_HUMBLE_FLURRY);
}
//@ chunk-z20c443b.js:173306-173468 placement
/**
 * 递归按键排序。
 */
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    let sorted = {};
    for (let key of Object.keys(value).sort()) sorted[key] = sortKeysDeep(value[key]);
    return sorted;
  }
  return value;
}
//@ chunk-z20c443b.js:173468-173695 placement
/**
 * 检查 JSON 值中是否含非有限数、-0 或 __proto__ 键。
 */
function hasUnsafeJsonValue(value) {
  if (typeof value === "number") return !Number.isFinite(value) || Object.is(value, -0);
  if (Array.isArray(value)) return value.some(hasUnsafeJsonValue);
  if (value === null || typeof value !== "object") return false;
  return Object.hasOwn(value, "__proto__") || Object.values(value).some(hasUnsafeJsonValue);
}
export {
  sortKeysDeep,
  isLovelyUmbrellaOn,
  isSettingsGateSettled,
  isTwinklingGlobeOn,
  isGateAOn,
  isValidatedCloverOn,
  isHashedLarkOn,
  isSteadySunbeamOn,
  isTranquilCrescentOn,
  sandboxFilesystemSettingsSchema,
  settingsSourceName,
  isHumbleFlurryOn,
  isGateOOn,
  AWS_CREDENTIAL_ENV_NAMES,
  credentialRuleRefine,
  MERGE_PAIR_SUPPRESSOR_SENTINEL,
  SLOT_COLLISION_SENTINEL,
  INVALID_PAIR_SENTINEL,
  isCalmEagleOn,
  hasUnsafeJsonValue,
  registerServedSettingsReader,
  latchSettingsGateSettled,
  isAsyncSnowglobeOn,
  isSettingsGateAnswered,
  isSteadyMarshmallowOn,
  TENGU_STEADY_MARSHMALLOW,
  isInteractiveSettingsHost,
  credentialRulePathSchema,
  credentialEnvRuleSchema,
  CredentialRuleSchema,
  credentialRuleModeSchema,
  PARENT_PAIR_SUPPRESSOR_SENTINEL,
};
