/**
 * utils/settings/settingsSourceTrust.ts
 *
 * 2.1.316 新增：凭据文件规则 schema；沙箱相关设置的说明文本等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (43)
 * attribution: placement 43
 */
import { isAbsolute } from "path";
import { SETTING_SOURCE_TO_SCOPE } from "../plugins/pluginIdentifier.js";
import {
  TMe,
  Phe,
  copyObject_default,
  Xve,
  Iut,
  xn,
  cloneBuffer_default,
  cloneTypedArray_default,
  wMe,
  RR,
  PQt,
  initCloneObject_default,
  jn,
  Kn,
  Mut,
} from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { assignValueRaw, keysInAlias } from "../git/gitSafeEnv.js";
import { lV, ME } from "../../../vendor/lodash-es/toString.js";
import { safeGet } from "../../../vendor/lodash-es/_safeGet.js";
import { mve } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { baseMerge } from "../../../vendor/lodash-es/_baseMerge.js";
import { isIterateeCall } from "../../../vendor/lodash-es/_isIterateeCall.js";
import { createAssigner } from "../../../vendor/lodash-es/_createAssigner.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, array, string, M, E, preprocess, _enum, record } from "../../../vendor/zod/v4/classic/schemas.js";
import { ZodIssueCode } from "../../../vendor/zod/v4/classic/compat.js";
import { errorMessage } from "../errors.js";
import { getIsInteractive } from "../../bootstrap/state.js";
import { isHostManagedProviderSession } from "../entrypointKinds.js";
import { env } from "../env.js";
import { identity as identity_2 } from "../identity.js";

//@ chunk-dcmhvw5a.js:142544-142574 placement
/**
 * 设置来源名。
 */
function settingsSourceName(e) {
  return SETTING_SOURCE_TO_SCOPE[e];
}
//@ chunk-dcmhvw5a.js:142574-142655 placement
function safeSet(e, n, r) {
  if ((r !== undefined && !TMe(e[n], r)) || (r === undefined && !(n in e))) assignValueRaw(e, n, r);
}
//@ chunk-dcmhvw5a.js:142655-142665 placement
/**
 * safeSet_2：safeSet 的别名。
 */
var safeSet_2 = safeSet;
//@ chunk-dcmhvw5a.js:142665-142701 placement
function baseIsEqualWith(e) {
  return lV(e) && Phe(e);
}
//@ chunk-dcmhvw5a.js:142701-142711 placement
var baseIsEqualWith_2 = baseIsEqualWith;
//@ chunk-dcmhvw5a.js:142819-142829 placement
/**
 * safeGet_2：lodash safeGet 的别名。
 */
var safeGet_2 = safeGet;
//@ chunk-dcmhvw5a.js:142829-142864 placement
function cloneDeepWithClone(e) {
  return copyObject_default(e, keysInAlias(e));
}
//@ chunk-dcmhvw5a.js:142864-142874 placement
var cloneDeepWith_2 = cloneDeepWithClone;
//@ chunk-dcmhvw5a.js:142874-143303 placement
/**
 * 深度合并（lodash 风格）。
 */
function mergeDeep(e, n, r, s, a, c, g) {
  var m = safeGet_2(e, r);
  var f = safeGet_2(n, r);
  var h = g.get(f);
  if (h) {
    safeSet_2(e, r, h);
    return;
  }
  var y = c ? c(m, f, r + "", e, n, g) : undefined;
  var b = y === undefined;
  if (b) {
    var S = ME(f);
    var C = !S && Xve(f);
    var w = !S && !C && Iut(f);
    y = f;
    if (S || C || w) {
      if (ME(m)) y = m;
      else if (baseIsEqualWith_2(m)) y = xn(m);
      else if (C) {
        b = false;
        y = cloneBuffer_default(f, true);
      } else if (w) {
        b = false;
        y = cloneTypedArray_default(f, true);
      } else y = [];
    } else if (mve(f) || wMe(f)) {
      y = m;
      if (wMe(m)) y = cloneDeepWith_2(m);
      else if (!RR(m) || PQt(m)) y = initCloneObject_default(f);
    } else b = false;
  }
  if (b) {
    g.set(f, y);
    a(y, f, s, c, g);
    g.delete(f);
  }
  safeSet_2(e, r, y);
}
//@ chunk-dcmhvw5a.js:143303-143313 placement
/**
 * mergeDeep_2：mergeDeep 的别名。
 */
var mergeDeep_2 = mergeDeep;
//@ chunk-dcmhvw5a.js:143493-143503 placement
var baseMerge_2 = baseMerge;
//@ chunk-dcmhvw5a.js:143503-143548 placement
function toKeyString(e, n) {
  return jn(Kn(e, n, Mut), e + "");
}
//@ chunk-dcmhvw5a.js:143548-143558 placement
/**
 * mergeKeys：eS 的别名。
 */
var mergeKeys = toKeyString;
//@ chunk-dcmhvw5a.js:143700-143711 placement
/**
 * isIterateeCall_2：lodash isIterateeCall 的别名。
 */
var isIterateeCall_2 = isIterateeCall;
//@ chunk-dcmhvw5a.js:143963-143973 placement
var createAssigner_2 = createAssigner;
//@ chunk-dcmhvw5a.js:143973-144021 placement
/**
 * mergeWithAssigner：自定义合并器；mergeWithAssigner_2：mergeWithAssigner 的别名（同一声明共 2 个绑定）。
 */
var mergeWithAssigner = createAssigner_2(function (e, n, r, s) {
  baseMerge_2(e, n, r, s);
});
var mergeWithAssigner_2 = mergeWithAssigner;
//@ chunk-dcmhvw5a.js:144056-151967 placement
/**
 * 沙箱相关设置的说明文本。
 */
var SANDBOX_SETTING_DESCRIPTIONS =
  "When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true";
var SANDBOX_DESCRIPTION_PORTAL =
  "When managed settings or a --settings file set allowUnsandboxedCommands: false, network.deniedDomains " +
  "or a WebFetch(domain:\u2026) deny rule, when managed settings set network.allowManagedDomainsOnly: true, " +
  "or when managed, --settings or user settings set network.strictAllowlist: true";
var SANDBOX_DESCRIPTION_DENY_DOMAINS =
  "When managed settings or a --settings file set allowUnsandboxedCommands: false, filesystem.denyRead, " +
  "a Read(\u2026) deny rule or a credentials.files entry (deny or mask), or managed settings set network.allowManagedDomainsOnly: true";
var SANDBOX_DESCRIPTION_DENY_READ =
  "When managed settings or a --settings file set filesystem.denyRead, a Read(\u2026) deny rule " +
  "or a credentials.files entry (deny or mask)";
var SANDBOX_DESCRIPTION_PORTAL_2 = "project settings (.claude/settings.json and .claude/settings.local.json)";
var SANDBOX_DESCRIPTION_PROJECT_IGNORED = `${SANDBOX_SETTING_DESCRIPTIONS}, values from ${SANDBOX_DESCRIPTION_PORTAL_2} are ignored.`;
var SANDBOX_DESCRIPTION_TRUE_IGNORED = `${SANDBOX_SETTING_DESCRIPTIONS}, true from ${SANDBOX_DESCRIPTION_PORTAL_2} is ignored (false there still applies).`;
var SANDBOX_DESCRIPTION_FALSE_IGNORED = `${SANDBOX_SETTING_DESCRIPTIONS}, and managed, --settings or user settings set true, false from ${SANDBOX_DESCRIPTION_PORTAL_2} is ignored (true there still applies).`;
var SANDBOX_DESCRIPTION_MANAGED_ONLY = `${SANDBOX_DESCRIPTION_PORTAL}, values from ${SANDBOX_DESCRIPTION_PORTAL_2} are ignored. With network.allowManagedDomainsOnly, only managed settings may set it.`;
var SANDBOX_DESCRIPTION_READ_REOPEN = `${SANDBOX_DESCRIPTION_DENY_DOMAINS}, a value from ${SANDBOX_DESCRIPTION_PORTAL_2} that would re-open a path managed, --settings or user settings deny reading is ignored, as is one spelled as a glob or a network path (UNC or automount); one carving out of the project's own denyRead still applies. A value inside a directory sandboxed commands can write is re-checked before every command and dropped once it has been re-pointed into a denied path.`;
var SANDBOX_DESCRIPTION_DENY_WRITE = `${SANDBOX_DESCRIPTION_PROJECT_IGNORED} ${SANDBOX_DESCRIPTION_DENY_READ}, a value from ${SANDBOX_DESCRIPTION_PORTAL_2} under or equal to a denied path, or spelled as a glob or a network path (UNC or automount), is ignored. A value inside a directory sandboxed commands can already write is re-checked before every command and dropped once it has been re-pointed into a denied read path.`;
var SANDBOX_DESCRIPTION_FILESYSTEM = DoctorLazy(() =>
  u({
    allowedDomains: array(string())
      .optional()
      .describe(
        "Domains sandboxed commands may reach without a prompt (wildcards such as *.example.com supported). " +
          "Merged with WebFetch(domain:\u2026) allow rules and across settings sources. " +
          SANDBOX_DESCRIPTION_PROJECT_IGNORED +
          " With network.allowManagedDomainsOnly, only managed settings supply it.",
      ),
    deniedDomains: array(string())
      .optional()
      .describe(
        "Domains that are always blocked, even if matched by allowedDomains. Supports the same wildcard syntax as allowedDomains. Merged from all settings sources regardless of allowManagedDomainsOnly.",
      ),
    strictAllowlist: M()
      .optional()
      .describe(
        "When true, the sandbox runtime deterministically denies hosts not in allowedDomains instead of prompting. " +
          "Enforced for sandboxed commands only \u2014 in-process tools such as WebFetch are not gated by this setting. " +
          "Only honored from user, managed/policy, or CLI (--settings) settings \u2014 " +
          `${SANDBOX_DESCRIPTION_PORTAL_2} are ignored, and while it is on their allowedDomains ` +
          "and WebFetch(domain:\u2026) allow rules are left out of the allowlist.",
      ),
    allowManagedDomainsOnly: M()
      .optional()
      .describe(
        "When true (and set in managed settings), only allowedDomains and WebFetch(domain:...) allow rules from managed settings are respected. User, project, local, and flag settings domains are ignored. Denied domains are still respected from all sources.",
      ),
    allowUnixSockets: array(string())
      .optional()
      .describe(
        "macOS only: Unix socket paths to allow. Ignored on Linux (seccomp cannot filter by path). Merged across settings sources. " +
          SANDBOX_DESCRIPTION_PROJECT_IGNORED,
      ),
    allowAllUnixSockets: M()
      .optional()
      .describe(
        "If true, allow all Unix sockets (disables blocking on both platforms). " +
          SANDBOX_DESCRIPTION_TRUE_IGNORED,
      ),
    allowLocalBinding: M()
      .optional()
      .describe(
        "macOS only: If true, sandboxed commands can bind to localhost ports. " +
          SANDBOX_DESCRIPTION_TRUE_IGNORED,
      ),
    allowMachLookup: array(
      string().refine((e) => !(e.endsWith("*") ? e.slice(0, -1) : e).includes("*"), {
        message:
          'Wildcards are only allowed as a single trailing "*" (e.g., "com.example.*" or "*" for all services).',
      }),
    )
      .optional()
      .describe(
        'macOS only: Additional XPC/Mach service names to allow looking up. Supports trailing-wildcard prefix matching (e.g., "com.apple.CoreSimulator.*"). Needed for tools that communicate via XPC such as the iOS Simulator or Playwright. Each entry lets sandboxed commands reach services outside the sandbox, and the sandbox does not confine what those services do for them. Merged across settings sources. ' +
          SANDBOX_DESCRIPTION_PROJECT_IGNORED,
      ),
    httpProxyPort: E()
      .optional()
      .describe(
        "Local TCP port of your own HTTP proxy for sandboxed traffic, used instead of the proxy Claude Code runs. " +
          SANDBOX_DESCRIPTION_MANAGED_ONLY,
      ),
    socksProxyPort: E()
      .optional()
      .describe(
        "Local TCP port of your own SOCKS5 proxy for sandboxed traffic, used instead of the proxy Claude Code runs. " +
          SANDBOX_DESCRIPTION_MANAGED_ONLY,
      ),
    tlsTerminate: u({
      caCertPath: string().min(1).optional(),
      caKeyPath: string().min(1).optional(),
    })
      .optional()
      .describe(
        "[EXPERIMENTAL] Enable in-process TLS termination so the per-request filter can see HTTPS request bodies. Provide a CA cert+key, or omit both to have sandbox-runtime generate an ephemeral one for the session. On native Windows an ephemeral CA cannot pass the sandbox trust check, so omitting the paths uses a persistent CA managed by the sandbox runtime (set up and trusted via /sandbox install); configured paths are passed to the sandbox runtime verbatim, which rejects a bad or incomplete pair at sandbox initialization. " +
          "Only honored from user, managed/policy, or CLI (`--settings`) settings \u2014 project settings " +
          "(.claude/settings.json and .claude/settings.local.json) are ignored.",
      ),
  }).optional(),
);
var SANDBOX_DESCRIPTION_CREDENTIALS = DoctorLazy(() =>
  u({
    allowWrite: array(string())
      .optional()
      .describe(
        "Additional paths to allow writing within the sandbox. Merged with paths from Edit(...) allow permission rules. " +
          SANDBOX_DESCRIPTION_DENY_WRITE,
      ),
    denyWrite: array(string())
      .optional()
      .describe(
        "Additional paths to deny writing within the sandbox. Merged with paths from Edit(...) deny permission rules.",
      ),
    denyRead: array(string())
      .optional()
      .describe(
        "Additional paths to deny reading within the sandbox. Merged with paths from Read(...) deny permission rules.",
      ),
    allowRead: array(string())
      .optional()
      .describe(
        "Paths to re-allow reading within denyRead regions. Takes precedence over denyRead for matching paths. " +
          SANDBOX_DESCRIPTION_READ_REOPEN,
      ),
    allowManagedReadPathsOnly: M()
      .optional()
      .describe("When true (set in managed settings), only allowRead paths from policySettings are used."),
    disabled: M()
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
//@ chunk-dcmhvw5a.js:151967-152388 placement
/**
 * 校验 maskClaims。
 */
function validateMaskClaims(maskClaims, decode, r) {
  if (maskClaims.length === 0 || maskClaims.some((s) => s.length === 0))
    r.addIssue({
      code: ZodIssueCode.custom,
      path: ["maskClaims"],
      message:
        "maskClaims must name at least one non-empty claim \u2014 omit maskClaims for whole-token masking.",
    });
  if (decode === undefined)
    r.addIssue({
      code: ZodIssueCode.custom,
      path: ["maskClaims"],
      message:
        "maskClaims requires decode \u2014 without a decode format there is no token to read claims from. Set decode, or omit maskClaims.",
    });
}
//@ chunk-dcmhvw5a.js:152388-152785 placement
/**
 * 校验 extract 正则。
 */
function validateExtractPattern(extract, n) {
  let r;
  try {
    r = new RegExp(extract);
  } catch (error) {
    n.addIssue({
      code: ZodIssueCode.custom,
      path: ["extract"],
      message: `extract is not a valid regular expression: ${errorMessage(error)}`,
    });
    return;
  }
  if (new RegExp(r.source + "|").exec("").length - 1 < 1)
    n.addIssue({
      code: ZodIssueCode.custom,
      path: ["extract"],
      message:
        "extract must contain at least one capturing group \u2014 " +
        'group 1 is the credential value to mask (e.g. "token:\\s*(\\S+)").',
    });
}
//@ chunk-dcmhvw5a.js:152785-153478 placement
/**
 * 规范化凭据规则（deny 模式）。
 */
function normalizeCredentialRule(e) {
  if (typeof e !== "object" || e === null) return e;
  let n = e;
  if (n.mode !== "deny") return e;
  let r = {
    ...n,
  };
  if ("extract" in r && typeof r.extract !== "string") delete r.extract;
  if (
    "onExtractNoMatch" in r &&
    r.onExtractNoMatch !== "warn" &&
    r.onExtractNoMatch !== "deny" &&
    r.onExtractNoMatch !== "error"
  )
    delete r.onExtractNoMatch;
  if ("decode" in r && r.decode !== "jwt") delete r.decode;
  if (
    "maskClaims" in r &&
    !(Array.isArray(r.maskClaims) && r.maskClaims.every((maskClaim) => typeof maskClaim === "string"))
  )
    delete r.maskClaims;
  if ("maskDuplicates" in r && typeof r.maskDuplicates !== "boolean") delete r.maskDuplicates;
  if (
    "injectHosts" in r &&
    !(Array.isArray(r.injectHosts) && r.injectHosts.every((injectHost) => typeof injectHost === "string"))
  )
    delete r.injectHosts;
  return r;
}
//@ chunk-dcmhvw5a.js:153478-171644 placement
/**
 * 凭据文件规则 schema。
 */
var CredentialRuleSchema = DoctorLazy(() =>
  preprocess(
    normalizeCredentialRule,
    u({
      path: string()
        .min(1)
        .describe(
          "Path to a credential file or directory. Same resolution as sandbox.filesystem.* paths: absolute, ~ expanded, or relative to the settings file root (project root for project settings, ~/.claude for user settings).",
        ),
      mode: _enum(["deny", "mask"]).describe(
        "Access mode for this path. `deny` blocks reads inside the sandbox; `mask` shows sandboxed commands a sentinel-substituted copy (whole-file, or only the spans captured by `extract`) and the " +
          "host proxy swaps sentinel\u2192real on egress to `injectHosts`. " +
          "On macOS and Windows `mask` currently degrades to `deny`.",
      ),
      extract: string()
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
      maskClaims: array(string())
        .optional()
        .describe(
          "Names of top-level payload claims to mask inside each decoded value, instead of replacing the whole token. Each named claim present with a string value gets its own sentinel and the token is rebuilt around the modified payload; all other claims are preserved so a tool that decodes the token and reads a non-secret claim keeps working. Requires `decode`. If no named claim matches in any verified token, behavior is governed by `onExtractNoMatch` (default `warn`). Only meaningful when mode is `mask`; accepted but ignored for `deny`.",
        ),
      maskDuplicates: M()
        .optional()
        .describe(
          "If true, verbatim occurrences of each captured credential value outside the regex-matched spans are also replaced with the " +
            "corresponding sentinel \u2014 for a secret repeated where the regex " +
            "does not reach (e.g. pasted into a comment). Matches raw substrings, so short or common values may corrupt unrelated content; intended for long, high-entropy secrets. Defaults to false. Only meaningful when mode is `mask` and `extract` or `decode` is set; accepted but ignored otherwise.",
        ),
      injectHosts: array(string())
        .optional()
        .describe(
          "Optional narrowing of where the proxy substitutes this credential. Only meaningful when mode is `mask`; accepted but ignored for `deny`. If unset, defaults to " +
            "`network.allowedDomains` \u2014 the credential is injected at " +
            "every reachable host. Each entry must be reachable via `network.allowedDomains` (sandbox-runtime validates this).",
        ),
    }).superRefine((e, n) => {
      if (e.mode === "mask" && e.path.endsWith("/"))
        n.addIssue({
          code: ZodIssueCode.custom,
          path: ["path"],
          message:
            'Credential mode "mask" applies to a single file, not a directory. List the specific credential file(s), or use "deny" for the directory.',
        });
      if (e.mode === "mask" && e.extract !== undefined) validateExtractPattern(e.extract, n);
      if (e.mode === "mask" && e.maskClaims !== undefined) validateMaskClaims(e.maskClaims, e.decode, n);
    }),
  ),
);
var credentialRulePathSchema = () =>
  string().regex(
    /^[A-Za-z_][A-Za-z0-9_]*$/,
    "Environment variable name must start with a letter or underscore and contain only letters, digits, and underscores",
  );
var credentialRuleModeSchema = DoctorLazy(() =>
  preprocess(
    normalizeCredentialRule,
    u({
      name: credentialRulePathSchema().describe("Environment variable name."),
      mode: _enum(["deny", "mask"]).describe(
        "Access mode for this environment variable. `deny` unsets the variable for sandboxed commands; `mask` shows sandboxed commands a sentinel value and the " +
          "host proxy swaps sentinel\u2192real on egress to `injectHosts`.",
      ),
      extract: string()
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
      maskClaims: array(string())
        .optional()
        .describe(
          "Names of top-level payload claims to mask inside the decoded value, instead of replacing the whole token. Each named claim present with a string value gets its own sentinel and the token is rebuilt around the modified payload; all other claims are preserved so claim-reading clients keep working. Requires `decode`. If no named claim matches, the variable is left unmasked with a stderr warning (fail-open). Only meaningful when mode is `mask`; accepted but ignored for `deny`.",
        ),
      injectHosts: array(string())
        .optional()
        .describe(
          "Optional narrowing of where the proxy substitutes this credential. Only meaningful when mode is `mask`; accepted but ignored for `deny`. If unset, defaults to " +
            "`network.allowedDomains` \u2014 the credential is injected at " +
            "every reachable host. Each entry must be reachable via `network.allowedDomains` (sandbox-runtime validates this).",
        ),
    }).superRefine((e, n) => {
      if (e.mode === "mask" && e.extract !== undefined) validateExtractPattern(e.extract, n);
      if (e.mode === "mask" && e.maskClaims !== undefined) validateMaskClaims(e.maskClaims, e.decode, n);
      if (e.mode === "mask" && e.decode !== undefined && e.extract !== undefined)
        n.addIssue({
          code: ZodIssueCode.custom,
          path: ["extract"],
          message:
            "extract cannot be combined with decode on an env entry \u2014 the runtime takes the decode path (whole-value JWT verification) and never consults extract, silently disabling the structured masking. Remove one of the two.",
        });
      if (
        e.mode === "mask" &&
        e.decode !== undefined &&
        (e.onExtractNoMatch === "deny" || e.onExtractNoMatch === "error")
      )
        n.addIssue({
          code: ZodIssueCode.custom,
          path: ["onExtractNoMatch"],
          message:
            "onExtractNoMatch cannot be honored on an env entry with decode \u2014 the runtime takes the decode path (which is unconditionally fail-open on verify failure) and never consults extract or onExtractNoMatch. Remove onExtractNoMatch, or drop decode to use extract-based masking (whose no-match handling does honor it).",
        });
    }),
  ),
);
var credentialRuleExtractSchema = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"];
var credentialRuleOnNoMatchSchema = "_SLOT_COLLISION_";
var credentialRuleDecodeSchema = "_INVALID_PAIR_";
var credentialRuleMaskClaimsSchema = "_PARENT_PAIR_SUPPRESSOR_";
var credentialRuleExtraSchema = "_MERGE_PAIR_SUPPRESSOR_";
var credentialRuleChildSchema = [
  credentialRuleOnNoMatchSchema,
  credentialRuleDecodeSchema,
  credentialRuleMaskClaimsSchema,
  credentialRuleExtraSchema,
];
var credentialRuleRefine = (e) => credentialRuleChildSchema.some((n) => e.startsWith(n));
var credentialEnvRuleSchema = DoctorLazy(() =>
  u({
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
  }).superRefine((e, n) => {
    let r = new Map();
    for (let [s, a] of [
      ["accessKeyIdVar", e.accessKeyIdVar],
      ["secretAccessKeyVar", e.secretAccessKeyVar],
      ["sessionTokenVar", e.sessionTokenVar],
    ]) {
      if (a === undefined) continue;
      let c = r.get(a);
      if (c !== undefined)
        n.addIssue({
          code: ZodIssueCode.custom,
          path: [s],
          message: `${s} names the same env var ('${a}') as ${c} \u2014 each pair member must be a distinct variable.`,
        });
      else r.set(a, s);
    }
  }),
);
var envVarNameSchema = DoctorLazy(() => {
  let e = _enum(["deny", "passthrough"]);
  return u({
    streaming: e
      .optional()
      .describe(
        "Policy for aws-chunked streaming uploads (x-amz-content-sha256: STREAMING-*): per-chunk signatures chain off the seed signature, so re-signing would require rewriting the body. `deny` (default) fails closed with a 403; `passthrough` forwards the request unre-signed (the upstream will reject its signature).",
      ),
    presigned: e
      .optional()
      .describe(
        "Policy for presigned URLs (X-Amz-Algorithm/X-Amz-Signature in the query, no Authorization header): the signature lives in the URL itself. `deny` (default) or `passthrough`.",
      ),
    sigv4a: e
      .optional()
      .describe(
        "Policy for SigV4A (AWS4-ECDSA-P256-SHA256) asymmetric signatures: there is no shared-key HMAC to recompute. `deny` (default) or `passthrough`.",
      ),
  });
});
var sandboxNetworkSettingsSchema = DoctorLazy(() =>
  u({
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
    allowPlaintextInject: M()
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
    .superRefine((e, n) => {
      let r = new Set();
      for (let [s, a] of (e?.awsPairs ?? []).entries()) {
        let c = [
          ["accessKeyIdVar", a.accessKeyIdVar],
          ["secretAccessKeyVar", a.secretAccessKeyVar],
          ["sessionTokenVar", a.sessionTokenVar],
        ];
        let g = new Set();
        for (let [m, f] of c) {
          if (f === undefined) continue;
          if (r.has(f))
            n.addIssue({
              code: ZodIssueCode.custom,
              path: ["awsPairs", s, m],
              message: `"${f}" appears in more than one awsPairs slot (within or across pairs) \u2014 each variable can fill exactly one slot.`,
            });
          g.add(f);
        }
        for (let m of g) r.add(m);
      }
    })
    .optional(),
);
var sandboxFilesystemSettingsSchema = DoctorLazy(() =>
  u({
    enabled: M()
      .optional()
      .describe("Run Bash commands inside the sandbox. Default: false. " + SANDBOX_DESCRIPTION_FALSE_IGNORED),
    failIfUnavailable: M()
      .optional()
      .describe(
        "Exit with an error at startup if sandbox.enabled is true but the sandbox cannot start (missing dependencies or unsupported platform). When false (default), a warning is shown and commands run unsandboxed. Intended for managed-settings deployments that require sandboxing as a hard gate. " +
          SANDBOX_DESCRIPTION_FALSE_IGNORED,
      ),
    autoAllowBashIfSandboxed: M().optional(),
    allowUnsandboxedCommands: M()
      .optional()
      .describe(
        `Allow commands to run outside the sandbox via the dangerouslyDisableSandbox parameter. When false, the dangerouslyDisableSandbox parameter is completely ignored and all commands must run sandboxed. Default: true. A false in managed, --settings or user settings holds whatever ${SANDBOX_DESCRIPTION_PORTAL_2} say (false there still applies).`,
      ),
    network: SANDBOX_DESCRIPTION_FILESYSTEM(),
    filesystem: SANDBOX_DESCRIPTION_CREDENTIALS(),
    credentials: sandboxNetworkSettingsSchema(),
    ignoreViolations: record(string(), array(string()))
      .optional()
      .describe(
        'Sandbox violations to leave unreported: a map of command patterns ("*" for every command) to the filesystem paths whose violations are ignored. Merged across settings sources. ' +
          SANDBOX_DESCRIPTION_PROJECT_IGNORED,
      ),
    enableWeakerNestedSandbox: M()
      .optional()
      .describe(
        "Linux only: Run without the fresh /proc mount, for hosts such as unprivileged Docker containers that cannot create one. " +
          "**Reduces security** \u2014 the host /proc stays readable by sandboxed commands. Default: false. " +
          SANDBOX_DESCRIPTION_TRUE_IGNORED,
      ),
    allowNestedUserNamespaces: M()
      .optional()
      .describe(
        "Linux/WSL only: Let sandboxed commands create user namespaces of their own, which the sandbox refuses by default. Needed by tools that sandbox themselves that way, such as Chromium's and Electron's sandbox, a nested bubblewrap, and `unshare`. " +
          "**Removes code-execution isolation** \u2014 in any folder a hostile command may write, it can then bypass filesystem.denyWrite, filesystem.denyRead, credentials.files entries and the paths the sandbox always write-protects (such as .claude/settings.json, git hooks and git config), " +
          "and so plant code that later runs outside the sandbox; while autoAllowBashIfSandboxed is on, the command that plants it needs no approval. Default: false. " +
          "Only honored from user, managed/policy, or CLI (--settings) settings \u2014 " +
          `true from ${SANDBOX_DESCRIPTION_PORTAL_2} is ignored (false there still applies).`,
      ),
    enableWeakerNetworkIsolation: M()
      .optional()
      .describe(
        "macOS only: Allow access to com.apple.trustd.agent in the sandbox. Needed for Go-based CLI tools (gh, gcloud, terraform, etc.) to verify TLS certificates when using httpProxyPort with a MITM proxy and custom CA. " +
          "**Reduces security** \u2014 opens a potential data exfiltration vector through the trustd service. Default: false. " +
          SANDBOX_DESCRIPTION_TRUE_IGNORED,
      ),
    allowAppleEvents: M()
      .optional()
      .describe(
        "macOS only: Allow sandboxed commands to send Apple Events (and look up the appleeventsd Mach service). Needed for `open`, `osascript`, and browser-based auth flows that open URLs. " +
          "**Removes code-execution isolation** \u2014 sandboxed commands can launch other applications " +
          "unsandboxed with no user prompt, and can script running apps (e.g. Terminal) subject to the user's per-app TCC automation consent. " +
          "Only honored from user, managed/policy, or CLI (--settings) settings \u2014 " +
          "project settings (.claude/settings.json and .claude/settings.local.json) are ignored. Default: false",
      ),
    excludedCommands: array(string())
      .optional()
      .describe(
        "Command patterns (Bash permission-rule syntax) for commands to run outside the sandbox. An entry takes a call out of the sandbox only when every command in the call matches an entry: in a Bash pipe or a chain such as `a && b`, each part needs its own match. Some calls stay sandboxed whatever the entries, such as one with a `cd`, a command substitution, or a redirect other than a file-descriptor duplication like `2>&1`, a heredoc included. A convenience, not a security boundary: excluded commands still go through the permission flow. Merged across settings sources. " +
          SANDBOX_DESCRIPTION_PROJECT_IGNORED,
      ),
    ripgrep: u({
      command: string(),
      args: array(string()).optional(),
    })
      .optional()
      .describe(
        "Custom ripgrep configuration for bundled ripgrep support. " +
          "Only honored from user, managed/policy, or CLI (--settings) settings \u2014 " +
          "project settings (.claude/settings.json and .claude/settings.local.json) are ignored.",
      ),
    bwrapPath: preprocess((e) => (typeof e === "string" && isAbsolute(e) ? e : undefined), string())
      .optional()
      .catch(undefined)
      .describe(
        "Linux/WSL only: Absolute path to the bwrap (bubblewrap) binary. Overrides auto-detection via PATH. Only honored from admin-controlled managed settings.",
      ),
    socatPath: preprocess((e) => (typeof e === "string" && isAbsolute(e) ? e : undefined), string())
      .optional()
      .catch(undefined)
      .describe(
        "Linux/WSL only: Absolute path to the socat binary used for the sandbox network proxy. Overrides auto-detection via PATH. Only honored from admin-controlled managed settings.",
      ),
  }).passthrough(),
);
//@ chunk-dcmhvw5a.js:171673-171745 placement
/**
 * isInteractiveSettingsHost：可交互且非后台托管会话。
 */
function isInteractiveSettingsHost() {
  return getIsInteractive() && !(isHostManagedProviderSession() && env.CLAUDE_CODE_SESSION_KIND === "bg");
}
//@ chunk-dcmhvw5a.js:171745-172086 placement
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
//@ chunk-dcmhvw5a.js:172086-172248 placement
class ServedSettingsReader {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
  servedTrue(e) {
    let reader = this.reader;
    if (!reader) return false;
    try {
      return reader(e, false) === true;
    } catch {
      return false;
    }
  }
}
//@ chunk-dcmhvw5a.js:172248-172372 placement
var servedSettingsReader = new ServedSettingsReader();
var settingsGateState = identity_2(
  {
    settled: undefined,
    answeredOff: false,
    answeredOn: false,
  },
  (e) => {
    e.settled = undefined;
    e.answeredOff = false;
    e.answeredOn = false;
  },
);
//@ chunk-dcmhvw5a.js:172372-172410 placement
/**
 * registerServedSettingsReader：登记服务端设置读取器。
 */
function registerServedSettingsReader(getFeatureValue_CACHED_MAY_BE_STALE) {
  return servedSettingsReader.register(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-dcmhvw5a.js:172410-172562 placement
/**
 * 设置开关的结算值。
 */
function isSettingsGateSettled() {
  if (settingsGateState.settled !== undefined) return settingsGateState.settled;
  if (settingsGateState.answeredOff) return false;
  let e = servedSettingsReader.servedTrue(TENGU_FIZZY_WIDGET);
  settingsGateState.answeredOff = !e;
  settingsGateState.answeredOn ||= e;
  return e;
}
//@ chunk-dcmhvw5a.js:172562-172605 placement
/**
 * isSettingsGateAnswered：设置闸门已结算或已答复。
 */
function isSettingsGateAnswered() {
  return isSettingsGateSettled() || settingsGateState.answeredOn;
}
//@ chunk-dcmhvw5a.js:172605-172639 placement
/**
 * latchSettingsGateSettled：记录设置闸门已结算。
 */
function latchSettingsGateSettled() {
  settingsGateState.settled ??= isSettingsGateSettled();
}
//@ chunk-dcmhvw5a.js:172639-172679 placement
/**
 * tengu_twinkling_globe 开关。
 */
function isTwinklingGlobeOn() {
  return servedSettingsReader.servedTrue(SETTINGS_GATE_NAMES);
}
//@ chunk-dcmhvw5a.js:172679-172718 placement
/**
 * tengu_lovely_umbrella 开关。
 */
function isLovelyUmbrellaOn() {
  return servedSettingsReader.servedTrue(TENGU_LOVELY_UMBRELLA);
}
//@ chunk-dcmhvw5a.js:172718-172759 placement
/**
 * isSteadyMarshmallowOn：开关 tengu_steady_marshmallow。
 */
function isSteadyMarshmallowOn() {
  return servedSettingsReader.servedTrue(TENGU_STEADY_MARSHMALLOW);
}
//@ chunk-dcmhvw5a.js:172759-172799 placement
/**
 * isValidatedCloverOn：开关 tengu_validated_clover。
 */
function isValidatedCloverOn() {
  return servedSettingsReader.servedTrue(TENGU_VALIDATED_CLOVER);
}
//@ chunk-dcmhvw5a.js:172799-172839 placement
/**
 * isTranquilCrescentOn：开关 tengu_tranquil_crescent。
 */
function isTranquilCrescentOn() {
  return servedSettingsReader.servedTrue(TENGU_TRANQUIL_CRESCENT);
}
//@ chunk-dcmhvw5a.js:172839-172879 placement
/**
 * isSteadySunbeamOn：开关 tengu_steady_sunbeam。
 */
function isSteadySunbeamOn() {
  return servedSettingsReader.servedTrue(TENGU_STEADY_SUNBEAM);
}
//@ chunk-dcmhvw5a.js:172879-172919 placement
/**
 * 服务端开关读取。
 */
function isGateAOn() {
  return servedSettingsReader.servedTrue(TENGU_COPPER_KITE);
}
//@ chunk-dcmhvw5a.js:172919-172959 placement
/**
 * isHashedLarkOn：开关 tengu_hashed_lark。
 */
function isHashedLarkOn() {
  return servedSettingsReader.servedTrue(TENGU_HASHED_LARK);
}
//@ chunk-dcmhvw5a.js:172959-172999 placement
/**
 * isCalmEagleOn：开关 tengu_calm_eagle。
 */
function isCalmEagleOn() {
  return servedSettingsReader.servedTrue(TENGU_CALM_EAGLE);
}
//@ chunk-dcmhvw5a.js:172999-173039 placement
/**
 * 服务端开关读取。
 */
function isGateOOn() {
  return servedSettingsReader.servedTrue(TENGU_SNUG_PLATYPUS);
}
//@ chunk-dcmhvw5a.js:173039-173079 placement
/**
 * isAsyncSnowglobeOn：开关 tengu_async_snowglobe。
 */
function isAsyncSnowglobeOn() {
  return servedSettingsReader.servedTrue(TENGU_ASYNC_SNOWGLOBE);
}
//@ chunk-dcmhvw5a.js:173079-173119 placement
/**
 * isHumbleFlurryOn：开关 tengu_humble_flurry。
 */
function isHumbleFlurryOn() {
  return servedSettingsReader.servedTrue(TENGU_HUMBLE_FLURRY);
}
//@ chunk-dcmhvw5a.js:173156-173318 placement
/**
 * 递归按键排序。
 */
function sortKeysDeep(e) {
  if (Array.isArray(e)) return e.map(sortKeysDeep);
  if (e !== null && typeof e === "object") {
    let n = {};
    for (let key of Object.keys(e).sort()) n[key] = sortKeysDeep(e[key]);
    return n;
  }
  return e;
}
//@ chunk-dcmhvw5a.js:173318-173545 placement
/**
 * 检查 JSON 值中是否含非有限数、-0 或 __proto__ 键。
 */
function hasUnsafeJsonValue(e) {
  if (typeof e === "number") return !Number.isFinite(e) || Object.is(e, -0);
  if (Array.isArray(e)) return e.some(hasUnsafeJsonValue);
  if (e === null || typeof e !== "object") return false;
  return Object.hasOwn(e, "__proto__") || Object.values(e).some(hasUnsafeJsonValue);
}
export {
  isGateOOn,
  isLovelyUmbrellaOn,
  sortKeysDeep,
  isGateAOn,
  hasUnsafeJsonValue,
  mergeWithAssigner_2,
  sandboxFilesystemSettingsSchema,
  isSettingsGateSettled,
  isTwinklingGlobeOn,
  isValidatedCloverOn,
  isHashedLarkOn,
  isSteadySunbeamOn,
  isTranquilCrescentOn,
  credentialRuleExtractSchema,
  credentialRulePathSchema,
  credentialRuleDecodeSchema,
  credentialEnvRuleSchema,
  CredentialRuleSchema,
  credentialRuleModeSchema,
  isSettingsGateAnswered,
  isSteadyMarshmallowOn,
  TENGU_STEADY_MARSHMALLOW,
  latchSettingsGateSettled,
  registerServedSettingsReader,
  isIterateeCall_2,
  isInteractiveSettingsHost,
  credentialRuleRefine,
  credentialRuleExtraSchema,
  credentialRuleOnNoMatchSchema,
  settingsSourceName,
  mergeDeep_2,
  safeGet_2,
  safeSet_2,
  mergeKeys,
  credentialRuleMaskClaimsSchema,
  isHumbleFlurryOn,
  isCalmEagleOn,
  isAsyncSnowglobeOn,
};
