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
  Fe,
  Xve,
  Iut,
  xn,
  Qt,
  Ln,
  wMe,
  RR,
  PQt,
  Un,
  jn,
  Kn,
  Mut,
} from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { Ohe, J8e } from "../git/gitSafeEnv.js";
import { lV, ME } from "../../../vendor/lodash-es/toString.js";
import { safeGet } from "../../../vendor/lodash-es/_safeGet.js";
import { mve } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { baseMerge } from "../../../vendor/lodash-es/_baseMerge.js";
import { isIterateeCall } from "../../../vendor/lodash-es/_isIterateeCall.js";
import { createAssigner } from "../../../vendor/lodash-es/_createAssigner.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, o, M, E, Ka, U, pe } from "../../../vendor/zod/v4/classic/schemas.js";
import { I8 } from "../../../vendor/zod/v4/classic/compat.js";
import { errorMessage } from "../errors.js";
import { getIsInteractive } from "../../bootstrap/state.js";
import { isHostManagedProviderSession } from "../entrypointKinds.js";
import { env } from "../env.js";
import { ge } from "../identity.js";

/**
 * 设置来源名。
 */
//@ chunk-dcmhvw5a.js:142544-142574 placement
function settingsSourceName(e) {
  return SETTING_SOURCE_TO_SCOPE[e];
}
//@ chunk-dcmhvw5a.js:142574-142655 placement
function Jy(e, n, r) {
  if ((r !== void 0 && !TMe(e[n], r)) || (r === void 0 && !(n in e))) Ohe(e, n, r);
}
//@ chunk-dcmhvw5a.js:142655-142665 placement
var on = Jy;
//@ chunk-dcmhvw5a.js:142665-142701 placement
function Xy(e) {
  return lV(e) && Phe(e);
}
//@ chunk-dcmhvw5a.js:142701-142711 placement
var dd = Xy;
//@ chunk-dcmhvw5a.js:142819-142829 placement
var rn = safeGet;
//@ chunk-dcmhvw5a.js:142829-142864 placement
function Zy(e) {
  return Fe(e, J8e(e));
}
//@ chunk-dcmhvw5a.js:142864-142874 placement
var ud = Zy;
/**
 * 深度合并（lodash 风格）。
 */
//@ chunk-dcmhvw5a.js:142874-143303 placement
function mergeDeep(e, n, r, s, a, c, g) {
  var m = rn(e, r),
    f = rn(n, r),
    h = g.get(f);
  if (h) {
    on(e, r, h);
    return;
  }
  var y = c ? c(m, f, r + "", e, n, g) : void 0,
    b = y === void 0;
  if (b) {
    var S = ME(f),
      C = !S && Xve(f),
      w = !S && !C && Iut(f);
    if (((y = f), S || C || w))
      if (ME(m)) y = m;
      else if (dd(m)) y = xn(m);
      else if (C) ((b = !1), (y = Qt(f, !0)));
      else if (w) ((b = !1), (y = Ln(f, !0)));
      else y = [];
    else if (mve(f) || wMe(f)) {
      if (((y = m), wMe(m))) y = ud(m);
      else if (!RR(m) || PQt(m)) y = Un(f);
    } else b = !1;
  }
  if (b) (g.set(f, y), a(y, f, s, c, g), g.delete(f));
  on(e, r, y);
}
//@ chunk-dcmhvw5a.js:143303-143313 placement
var pd = mergeDeep;
//@ chunk-dcmhvw5a.js:143493-143503 placement
var md = baseMerge;
//@ chunk-dcmhvw5a.js:143503-143548 placement
function eS(e, n) {
  return jn(Kn(e, n, Mut), e + "");
}
//@ chunk-dcmhvw5a.js:143548-143558 placement
var fd = eS;
//@ chunk-dcmhvw5a.js:143700-143711 placement
var hio = isIterateeCall;
//@ chunk-dcmhvw5a.js:143963-143973 placement
var hd = createAssigner;
//@ chunk-dcmhvw5a.js:143973-144021 placement
var oS = hd(function (e, n, r, s) {
    md(e, n, r, s);
  }),
  fj = oS;
/**
 * 沙箱相关设置的说明文本。
 */
//@ chunk-dcmhvw5a.js:144056-151967 placement
var SANDBOX_SETTING_DESCRIPTIONS =
    "When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true",
  rS =
    "When managed settings or a --settings file set allowUnsandboxedCommands: false, network.deniedDomains " +
    "or a WebFetch(domain:\u2026) deny rule, when managed settings set network.allowManagedDomainsOnly: true, " +
    "or when managed, --settings or user settings set network.strictAllowlist: true",
  sS =
    "When managed settings or a --settings file set allowUnsandboxedCommands: false, filesystem.denyRead, " +
    "a Read(\u2026) deny rule or a credentials.files entry (deny or mask), or managed settings set network.allowManagedDomainsOnly: true",
  iS =
    "When managed settings or a --settings file set filesystem.denyRead, a Read(\u2026) deny rule " +
    "or a credentials.files entry (deny or mask)",
  at = "project settings (.claude/settings.json and .claude/settings.local.json)",
  Ut = `${SANDBOX_SETTING_DESCRIPTIONS}, values from ${at} are ignored.`,
  lo = `${SANDBOX_SETTING_DESCRIPTIONS}, true from ${at} is ignored (false there still applies).`,
  Sd = `${SANDBOX_SETTING_DESCRIPTIONS}, and managed, --settings or user settings set true, false from ${at} is ignored (true there still applies).`,
  bd = `${rS}, values from ${at} are ignored. With network.allowManagedDomainsOnly, only managed settings may set it.`,
  aS = `${sS}, a value from ${at} that would re-open a path managed, --settings or user settings deny reading is ignored, as is one spelled as a glob or a network path (UNC or automount); one carving out of the project's own denyRead still applies. A value inside a directory sandboxed commands can write is re-checked before every command and dropped once it has been re-pointed into a denied path.`,
  lS = `${Ut} ${iS}, a value from ${at} under or equal to a denied path, or spelled as a glob or a network path (UNC or automount), is ignored. A value inside a directory sandboxed commands can already write is re-checked before every command and dropped once it has been re-pointed into a denied read path.`,
  dS = DoctorLazy(() =>
    u({
      allowedDomains: A(o())
        .optional()
        .describe(
          "Domains sandboxed commands may reach without a prompt (wildcards such as *.example.com supported). " +
            "Merged with WebFetch(domain:\u2026) allow rules and across settings sources. " +
            Ut +
            " With network.allowManagedDomainsOnly, only managed settings supply it.",
        ),
      deniedDomains: A(o())
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
            `${at} are ignored, and while it is on their allowedDomains ` +
            "and WebFetch(domain:\u2026) allow rules are left out of the allowlist.",
        ),
      allowManagedDomainsOnly: M()
        .optional()
        .describe(
          "When true (and set in managed settings), only allowedDomains and WebFetch(domain:...) allow rules from managed settings are respected. User, project, local, and flag settings domains are ignored. Denied domains are still respected from all sources.",
        ),
      allowUnixSockets: A(o())
        .optional()
        .describe(
          "macOS only: Unix socket paths to allow. Ignored on Linux (seccomp cannot filter by path). Merged across settings sources. " +
            Ut,
        ),
      allowAllUnixSockets: M()
        .optional()
        .describe("If true, allow all Unix sockets (disables blocking on both platforms). " + lo),
      allowLocalBinding: M()
        .optional()
        .describe("macOS only: If true, sandboxed commands can bind to localhost ports. " + lo),
      allowMachLookup: A(
        o().refine((e) => !(e.endsWith("*") ? e.slice(0, -1) : e).includes("*"), {
          message:
            'Wildcards are only allowed as a single trailing "*" (e.g., "com.example.*" or "*" for all services).',
        }),
      )
        .optional()
        .describe(
          'macOS only: Additional XPC/Mach service names to allow looking up. Supports trailing-wildcard prefix matching (e.g., "com.apple.CoreSimulator.*"). Needed for tools that communicate via XPC such as the iOS Simulator or Playwright. Each entry lets sandboxed commands reach services outside the sandbox, and the sandbox does not confine what those services do for them. Merged across settings sources. ' +
            Ut,
        ),
      httpProxyPort: E()
        .optional()
        .describe(
          "Local TCP port of your own HTTP proxy for sandboxed traffic, used instead of the proxy Claude Code runs. " +
            bd,
        ),
      socksProxyPort: E()
        .optional()
        .describe(
          "Local TCP port of your own SOCKS5 proxy for sandboxed traffic, used instead of the proxy Claude Code runs. " +
            bd,
        ),
      tlsTerminate: u({ caCertPath: o().min(1).optional(), caKeyPath: o().min(1).optional() })
        .optional()
        .describe(
          "[EXPERIMENTAL] Enable in-process TLS termination so the per-request filter can see HTTPS request bodies. Provide a CA cert+key, or omit both to have sandbox-runtime generate an ephemeral one for the session. On native Windows an ephemeral CA cannot pass the sandbox trust check, so omitting the paths uses a persistent CA managed by the sandbox runtime (set up and trusted via /sandbox install); configured paths are passed to the sandbox runtime verbatim, which rejects a bad or incomplete pair at sandbox initialization. " +
            "Only honored from user, managed/policy, or CLI (`--settings`) settings \u2014 project settings " +
            "(.claude/settings.json and .claude/settings.local.json) are ignored.",
        ),
    }).optional(),
  ),
  cS = DoctorLazy(() =>
    u({
      allowWrite: A(o())
        .optional()
        .describe(
          "Additional paths to allow writing within the sandbox. Merged with paths from Edit(...) allow permission rules. " +
            lS,
        ),
      denyWrite: A(o())
        .optional()
        .describe(
          "Additional paths to deny writing within the sandbox. Merged with paths from Edit(...) deny permission rules.",
        ),
      denyRead: A(o())
        .optional()
        .describe(
          "Additional paths to deny reading within the sandbox. Merged with paths from Read(...) deny permission rules.",
        ),
      allowRead: A(o())
        .optional()
        .describe(
          "Paths to re-allow reading within denyRead regions. Takes precedence over denyRead for matching paths. " +
            aS,
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
/**
 * 校验 maskClaims。
 */
//@ chunk-dcmhvw5a.js:151967-152388 placement
function validateMaskClaims(e, n, r) {
  if (e.length === 0 || e.some((s) => s.length === 0))
    r.addIssue({
      code: I8.custom,
      path: ["maskClaims"],
      message:
        "maskClaims must name at least one non-empty claim \u2014 omit maskClaims for whole-token masking.",
    });
  if (n === void 0)
    r.addIssue({
      code: I8.custom,
      path: ["maskClaims"],
      message:
        "maskClaims requires decode \u2014 without a decode format there is no token to read claims from. Set decode, or omit maskClaims.",
    });
}
/**
 * 校验 extract 正则。
 */
//@ chunk-dcmhvw5a.js:152388-152785 placement
function validateExtractPattern(e, n) {
  let r;
  try {
    r = new RegExp(e);
  } catch (error) {
    n.addIssue({
      code: I8.custom,
      path: ["extract"],
      message: `extract is not a valid regular expression: ${errorMessage(error)}`,
    });
    return;
  }
  if (new RegExp(r.source + "|").exec("").length - 1 < 1)
    n.addIssue({
      code: I8.custom,
      path: ["extract"],
      message:
        "extract must contain at least one capturing group \u2014 " +
        'group 1 is the credential value to mask (e.g. "token:\\s*(\\S+)").',
    });
}
/**
 * 规范化凭据规则（deny 模式）。
 */
//@ chunk-dcmhvw5a.js:152785-153478 placement
function normalizeCredentialRule(e) {
  if (typeof e !== "object" || e === null) return e;
  let n = e;
  if (n.mode !== "deny") return e;
  let r = { ...n };
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
/**
 * 凭据文件规则 schema。
 */
//@ chunk-dcmhvw5a.js:153478-171644 placement
var CredentialRuleSchema = DoctorLazy(() =>
    Ka(
      normalizeCredentialRule,
      u({
        path: o()
          .min(1)
          .describe(
            "Path to a credential file or directory. Same resolution as sandbox.filesystem.* paths: absolute, ~ expanded, or relative to the settings file root (project root for project settings, ~/.claude for user settings).",
          ),
        mode: U(["deny", "mask"]).describe(
          "Access mode for this path. `deny` blocks reads inside the sandbox; `mask` shows sandboxed commands a sentinel-substituted copy (whole-file, or only the spans captured by `extract`) and the " +
            "host proxy swaps sentinel\u2192real on egress to `injectHosts`. " +
            "On macOS and Windows `mask` currently degrades to `deny`.",
        ),
        extract: o()
          .optional()
          .describe(
            "Optional regex for structured masking when mode is `mask`. Applied globally to the file; capture group 1 of each match is a credential value, and only those captured spans are replaced " +
              "with sentinels \u2014 the rest of the file is preserved so a tool " +
              "that parses it (.netrc, JSON, YAML) still succeeds. Without `extract`, the entire file content is replaced with one sentinel (whole-file masking, suited to single-secret files). If the regex matches nothing, behavior is governed by `onExtractNoMatch` (default `warn`). Accepted but ignored for `deny`.",
          ),
        onExtractNoMatch: U(["warn", "deny", "error"])
          .optional()
          .describe(
            "What to do when `extract` matches nothing in the file \u2014 or, " +
              "with `decode`, when no candidate survives verification. `warn` (default) emits a stderr warning and leaves the file readable as-is inside the sandbox (fail-open, for credentials that may be legitimately absent); `deny` degrades the entry to " +
              "mode `deny` so the file is unreadable (fail-closed) \u2014 under " +
              "`sandbox.filesystem.disabled` it is treated as `error`, since read-denies are dropped in that mode; `error` aborts at sandbox setup so nothing runs until the config is fixed. Only meaningful when mode is `mask` and `extract` or `decode` is set; accepted but ignored otherwise.",
          ),
        decode: U(["jwt"])
          .optional()
          .describe(
            "Optional encoded-credential format for `mask` mode. `jwt`: candidates are located with a built-in JWT regex (or the explicit `extract` pattern, if set), verified to actually be JWTs before masking, and replaced with a structurally valid fake JWT so client-side token parsing inside the sandbox keeps working. If no candidate verifies, behavior is governed by `onExtractNoMatch` (default `warn`). Accepted but ignored for `deny`.",
          ),
        maskClaims: A(o())
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
        injectHosts: A(o())
          .optional()
          .describe(
            "Optional narrowing of where the proxy substitutes this credential. Only meaningful when mode is `mask`; accepted but ignored for `deny`. If unset, defaults to " +
              "`network.allowedDomains` \u2014 the credential is injected at " +
              "every reachable host. Each entry must be reachable via `network.allowedDomains` (sandbox-runtime validates this).",
          ),
      }).superRefine((e, n) => {
        if (e.mode === "mask" && e.path.endsWith("/"))
          n.addIssue({
            code: I8.custom,
            path: ["path"],
            message:
              'Credential mode "mask" applies to a single file, not a directory. List the specific credential file(s), or use "deny" for the directory.',
          });
        if (e.mode === "mask" && e.extract !== void 0) validateExtractPattern(e.extract, n);
        if (e.mode === "mask" && e.maskClaims !== void 0) validateMaskClaims(e.maskClaims, e.decode, n);
      }),
    ),
  ),
  Ht = () =>
    o().regex(
      /^[A-Za-z_][A-Za-z0-9_]*$/,
      "Environment variable name must start with a letter or underscore and contain only letters, digits, and underscores",
    ),
  uo = DoctorLazy(() =>
    Ka(
      normalizeCredentialRule,
      u({
        name: Ht().describe("Environment variable name."),
        mode: U(["deny", "mask"]).describe(
          "Access mode for this environment variable. `deny` unsets the variable for sandboxed commands; `mask` shows sandboxed commands a sentinel value and the " +
            "host proxy swaps sentinel\u2192real on egress to `injectHosts`.",
        ),
        extract: o()
          .optional()
          .describe(
            "Optional regex for structured masking when mode is `mask`. Applied globally to the value; capture group 1 of each match is a credential value, and only those captured spans are " +
              "replaced with sentinels \u2014 the rest of the value is preserved " +
              "so a tool that parses it (a `DATABASE_URL` connection string, a composite `KEY:SECRET` pair) still succeeds inside the sandbox. Without `extract`, the entire value is replaced with one sentinel (whole-value masking, suited to bare tokens). If the regex matches nothing, behavior is governed by `onExtractNoMatch` (default `warn`). Cannot be combined with `decode` (the decode path never consults it). Accepted but ignored for `deny`.",
          ),
        onExtractNoMatch: U(["warn", "deny", "error"])
          .optional()
          .describe(
            "What to do when `extract` matches nothing in the value. `warn` (default) emits a stderr warning and lets the variable pass through unmasked (fail-open, for credentials that may be legitimately absent); `deny` unsets the variable inside the sandbox (fail-closed); `error` aborts at sandbox setup so nothing runs until the config is fixed. Only meaningful when mode is `mask` and `extract` is set without `decode`. On a mask entry with `decode`, the runtime takes the decode path and never consults this field, so a fail-closed setting " +
              "cannot be honored \u2014 `deny` and `error` are rejected there; " +
              "only `warn` is accepted. In all other shapes the field is accepted but ignored.",
          ),
        decode: U(["jwt"])
          .optional()
          .describe(
            "Optional encoded-credential format for `mask` mode. `jwt`: the variable's whole value is verified to actually be a JWT and replaced with a structurally valid fake JWT so client-side token parsing inside the sandbox keeps working; the proxy swaps the whole fake token on egress. If the value does not verify, the variable is left unmasked with a stderr warning " +
              "(fail-open). Cannot be combined with `extract` \u2014 the decode " +
              "path never consults it. Accepted but ignored for `deny`.",
          ),
        maskClaims: A(o())
          .optional()
          .describe(
            "Names of top-level payload claims to mask inside the decoded value, instead of replacing the whole token. Each named claim present with a string value gets its own sentinel and the token is rebuilt around the modified payload; all other claims are preserved so claim-reading clients keep working. Requires `decode`. If no named claim matches, the variable is left unmasked with a stderr warning (fail-open). Only meaningful when mode is `mask`; accepted but ignored for `deny`.",
          ),
        injectHosts: A(o())
          .optional()
          .describe(
            "Optional narrowing of where the proxy substitutes this credential. Only meaningful when mode is `mask`; accepted but ignored for `deny`. If unset, defaults to " +
              "`network.allowedDomains` \u2014 the credential is injected at " +
              "every reachable host. Each entry must be reachable via `network.allowedDomains` (sandbox-runtime validates this).",
          ),
      }).superRefine((e, n) => {
        if (e.mode === "mask" && e.extract !== void 0) validateExtractPattern(e.extract, n);
        if (e.mode === "mask" && e.maskClaims !== void 0) validateMaskClaims(e.maskClaims, e.decode, n);
        if (e.mode === "mask" && e.decode !== void 0 && e.extract !== void 0)
          n.addIssue({
            code: I8.custom,
            path: ["extract"],
            message:
              "extract cannot be combined with decode on an env entry \u2014 the runtime takes the decode path (whole-value JWT verification) and never consults extract, silently disabling the structured masking. Remove one of the two.",
          });
        if (
          e.mode === "mask" &&
          e.decode !== void 0 &&
          (e.onExtractNoMatch === "deny" || e.onExtractNoMatch === "error")
        )
          n.addIssue({
            code: I8.custom,
            path: ["onExtractNoMatch"],
            message:
              "onExtractNoMatch cannot be honored on an env entry with decode \u2014 the runtime takes the decode path (which is unconditionally fail-open on verify failure) and never consults extract or onExtractNoMatch. Remove onExtractNoMatch, or drop decode to use extract-based masking (whose no-match handling does honor it).",
          });
      }),
    ),
  ),
  V3e = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"],
  Sio = "_SLOT_COLLISION_",
  $In = "_INVALID_PAIR_",
  sn = "_PARENT_PAIR_SUPPRESSOR_",
  Wfs = "_MERGE_PAIR_SUPPRESSOR_",
  uS = [Sio, $In, sn, Wfs],
  wio = (e) => uS.some((n) => e.startsWith(n)),
  po = DoctorLazy(() =>
    u({
      accessKeyIdVar: Ht().describe("Name of the masked env var holding the AWS access key id."),
      secretAccessKeyVar: Ht().describe("Name of the masked env var holding the AWS secret access key."),
      sessionTokenVar: Ht()
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
        if (a === void 0) continue;
        let c = r.get(a);
        if (c !== void 0)
          n.addIssue({
            code: I8.custom,
            path: [s],
            message: `${s} names the same env var ('${a}') as ${c} \u2014 each pair member must be a distinct variable.`,
          });
        else r.set(a, s);
      }
    }),
  ),
  pS = DoctorLazy(() => {
    let e = U(["deny", "passthrough"]);
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
  }),
  gS = DoctorLazy(() =>
    u({
      files: A(CredentialRuleSchema())
        .optional()
        .describe(
          "Credential files or directories to protect. `deny` blocks reads inside the sandbox; `mask` substitutes a sentinel inside the sandbox (whole-file, or per-`extract` capture) and injects the real value at the proxy. On macOS and Windows `mask` degrades to `deny`.",
        ),
      envVars: A(uo())
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
      awsPairs: A(po())
        .optional()
        .describe(
          "Explicit groupings of masked env vars into AWS credential pairs for SigV4 re-signing, for non-standard variable names. The conventional AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN trio is paired automatically when masked. Only honored from user, managed/policy, or CLI (`--settings`) " +
            "settings \u2014 project settings (.claude/settings.json and " +
            ".claude/settings.local.json) are ignored. A member is only usable when its env var is forwarded as a whole-value `mask` entry (an entry carrying `extract` or `decode` does not " +
            "qualify \u2014 re-signing needs the whole real value). A pair " +
            "whose key id or secret member is unusable never re-signs: it is dropped, unless it names a conventional AWS variable, in which case it is forwarded as an inert suppressor so implicit auto-pairing stays overridden. A pair whose ONLY unusable member is the session token still re-signs, without an x-amz-security-token (temporary-credential requests fail upstream until the entry is fixed).",
        ),
      sigv4: pS()
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
            ],
            g = new Set();
          for (let [m, f] of c) {
            if (f === void 0) continue;
            if (r.has(f))
              n.addIssue({
                code: I8.custom,
                path: ["awsPairs", s, m],
                message: `"${f}" appears in more than one awsPairs slot (within or across pairs) \u2014 each variable can fill exactly one slot.`,
              });
            g.add(f);
          }
          for (let m of g) r.add(m);
        }
      })
      .optional(),
  ),
  m_r = DoctorLazy(() =>
    u({
      enabled: M()
        .optional()
        .describe("Run Bash commands inside the sandbox. Default: false. " + Sd),
      failIfUnavailable: M()
        .optional()
        .describe(
          "Exit with an error at startup if sandbox.enabled is true but the sandbox cannot start (missing dependencies or unsupported platform). When false (default), a warning is shown and commands run unsandboxed. Intended for managed-settings deployments that require sandboxing as a hard gate. " +
            Sd,
        ),
      autoAllowBashIfSandboxed: M().optional(),
      allowUnsandboxedCommands: M()
        .optional()
        .describe(
          `Allow commands to run outside the sandbox via the dangerouslyDisableSandbox parameter. When false, the dangerouslyDisableSandbox parameter is completely ignored and all commands must run sandboxed. Default: true. A false in managed, --settings or user settings holds whatever ${at} say (false there still applies).`,
        ),
      network: dS(),
      filesystem: cS(),
      credentials: gS(),
      ignoreViolations: pe(o(), A(o()))
        .optional()
        .describe(
          'Sandbox violations to leave unreported: a map of command patterns ("*" for every command) to the filesystem paths whose violations are ignored. Merged across settings sources. ' +
            Ut,
        ),
      enableWeakerNestedSandbox: M()
        .optional()
        .describe(
          "Linux only: Run without the fresh /proc mount, for hosts such as unprivileged Docker containers that cannot create one. " +
            "**Reduces security** \u2014 the host /proc stays readable by sandboxed commands. Default: false. " +
            lo,
        ),
      allowNestedUserNamespaces: M()
        .optional()
        .describe(
          "Linux/WSL only: Let sandboxed commands create user namespaces of their own, which the sandbox refuses by default. Needed by tools that sandbox themselves that way, such as Chromium's and Electron's sandbox, a nested bubblewrap, and `unshare`. " +
            "**Removes code-execution isolation** \u2014 in any folder a hostile command may write, it can then bypass filesystem.denyWrite, filesystem.denyRead, credentials.files entries and the paths the sandbox always write-protects (such as .claude/settings.json, git hooks and git config), " +
            "and so plant code that later runs outside the sandbox; while autoAllowBashIfSandboxed is on, the command that plants it needs no approval. Default: false. " +
            "Only honored from user, managed/policy, or CLI (--settings) settings \u2014 " +
            `true from ${at} is ignored (false there still applies).`,
        ),
      enableWeakerNetworkIsolation: M()
        .optional()
        .describe(
          "macOS only: Allow access to com.apple.trustd.agent in the sandbox. Needed for Go-based CLI tools (gh, gcloud, terraform, etc.) to verify TLS certificates when using httpProxyPort with a MITM proxy and custom CA. " +
            "**Reduces security** \u2014 opens a potential data exfiltration vector through the trustd service. Default: false. " +
            lo,
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
      excludedCommands: A(o())
        .optional()
        .describe(
          "Command patterns (Bash permission-rule syntax) for commands to run outside the sandbox. An entry takes a call out of the sandbox only when every command in the call matches an entry: in a Bash pipe or a chain such as `a && b`, each part needs its own match. Some calls stay sandboxed whatever the entries, such as one with a `cd`, a command substitution, or a redirect other than a file-descriptor duplication like `2>&1`, a heredoc included. A convenience, not a security boundary: excluded commands still go through the permission flow. Merged across settings sources. " +
            Ut,
        ),
      ripgrep: u({ command: o(), args: A(o()).optional() })
        .optional()
        .describe(
          "Custom ripgrep configuration for bundled ripgrep support. " +
            "Only honored from user, managed/policy, or CLI (--settings) settings \u2014 " +
            "project settings (.claude/settings.json and .claude/settings.local.json) are ignored.",
        ),
      bwrapPath: Ka((e) => (typeof e === "string" && isAbsolute(e) ? e : void 0), o())
        .optional()
        .catch(void 0)
        .describe(
          "Linux/WSL only: Absolute path to the bwrap (bubblewrap) binary. Overrides auto-detection via PATH. Only honored from admin-controlled managed settings.",
        ),
      socatPath: Ka((e) => (typeof e === "string" && isAbsolute(e) ? e : void 0), o())
        .optional()
        .catch(void 0)
        .describe(
          "Linux/WSL only: Absolute path to the socat binary used for the sandbox network proxy. Overrides auto-detection via PATH. Only honored from admin-controlled managed settings.",
        ),
    }).passthrough(),
  );
//@ chunk-dcmhvw5a.js:171673-171745 placement
function vio() {
  return getIsInteractive() && !(isHostManagedProviderSession() && env.CLAUDE_CODE_SESSION_KIND === "bg");
}
/**
 * 设置相关开关名。
 */
//@ chunk-dcmhvw5a.js:171745-172086 placement
var SETTINGS_GATE_NAMES = "tengu_twinkling_globe",
  TENGU_LOVELY_UMBRELLA = "tengu_lovely_umbrella",
  TENGU_STEADY_MARSHMALLOW = "tengu_steady_marshmallow",
  TENGU_TRANQUIL_CRESCENT = "tengu_tranquil_crescent",
  TENGU_STEADY_SUNBEAM = "tengu_steady_sunbeam",
  TENGU_HASHED_LARK = "tengu_hashed_lark",
  TENGU_VALIDATED_CLOVER = "tengu_validated_clover",
  TENGU_COPPER_KITE = "tengu_copper_kite",
  TENGU_CALM_EAGLE = "tengu_calm_eagle",
  TENGU_SNUG_PLATYPUS = "tengu_snug_platypus",
  TENGU_ASYNC_SNOWGLOBE = "tengu_async_snowglobe",
  TENGU_HUMBLE_FLURRY = "tengu_humble_flurry",
  TENGU_FIZZY_WIDGET = "tengu_fizzy_widget";
//@ chunk-dcmhvw5a.js:172086-172248 placement
class ServedSettingsReader {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
  servedTrue(e) {
    let reader = this.reader;
    if (!reader) return !1;
    try {
      return reader(e, !1) === !0;
    } catch {
      return !1;
    }
  }
}
//@ chunk-dcmhvw5a.js:172248-172372 placement
var servedSettingsReader = new ServedSettingsReader(),
  settingsGateState = ge({ settled: void 0, answeredOff: !1, answeredOn: !1 }, (e) => {
    ((e.settled = void 0), (e.answeredOff = !1), (e.answeredOn = !1));
  });
//@ chunk-dcmhvw5a.js:172372-172410 placement
function Sxi(e) {
  return servedSettingsReader.register(e);
}
/**
 * 设置开关的结算值。
 */
//@ chunk-dcmhvw5a.js:172410-172562 placement
function isSettingsGateSettled() {
  if (settingsGateState.settled !== void 0) return settingsGateState.settled;
  if (settingsGateState.answeredOff) return !1;
  let servedTrue = servedSettingsReader.servedTrue(TENGU_FIZZY_WIDGET);
  return (
    (settingsGateState.answeredOff = !servedTrue),
    (settingsGateState.answeredOn ||= servedTrue),
    servedTrue
  );
}
//@ chunk-dcmhvw5a.js:172562-172605 placement
function kio() {
  return isSettingsGateSettled() || settingsGateState.answeredOn;
}
//@ chunk-dcmhvw5a.js:172605-172639 placement
function wxi() {
  settingsGateState.settled ??= isSettingsGateSettled();
}
/**
 * tengu_twinkling_globe 开关。
 */
//@ chunk-dcmhvw5a.js:172639-172679 placement
function isTwinklingGlobeOn() {
  return servedSettingsReader.servedTrue(SETTINGS_GATE_NAMES);
}
/**
 * tengu_lovely_umbrella 开关。
 */
//@ chunk-dcmhvw5a.js:172679-172718 placement
function isLovelyUmbrellaOn() {
  return servedSettingsReader.servedTrue(TENGU_LOVELY_UMBRELLA);
}
//@ chunk-dcmhvw5a.js:172718-172759 placement
function Exi() {
  return servedSettingsReader.servedTrue(TENGU_STEADY_MARSHMALLOW);
}
//@ chunk-dcmhvw5a.js:172759-172799 placement
function vxi() {
  return servedSettingsReader.servedTrue(TENGU_VALIDATED_CLOVER);
}
//@ chunk-dcmhvw5a.js:172799-172839 placement
function kxi() {
  return servedSettingsReader.servedTrue(TENGU_TRANQUIL_CRESCENT);
}
//@ chunk-dcmhvw5a.js:172839-172879 placement
function Txi() {
  return servedSettingsReader.servedTrue(TENGU_STEADY_SUNBEAM);
}
/**
 * 服务端开关读取。
 */
//@ chunk-dcmhvw5a.js:172879-172919 placement
function isGateAOn() {
  return servedSettingsReader.servedTrue(TENGU_COPPER_KITE);
}
//@ chunk-dcmhvw5a.js:172919-172959 placement
function Axi() {
  return servedSettingsReader.servedTrue(TENGU_HASHED_LARK);
}
//@ chunk-dcmhvw5a.js:172959-172999 placement
function Cxi() {
  return servedSettingsReader.servedTrue(TENGU_CALM_EAGLE);
}
/**
 * 服务端开关读取。
 */
//@ chunk-dcmhvw5a.js:172999-173039 placement
function isGateOOn() {
  return servedSettingsReader.servedTrue(TENGU_SNUG_PLATYPUS);
}
//@ chunk-dcmhvw5a.js:173039-173079 placement
function Rxi() {
  return servedSettingsReader.servedTrue(TENGU_ASYNC_SNOWGLOBE);
}
//@ chunk-dcmhvw5a.js:173079-173119 placement
function xxi() {
  return servedSettingsReader.servedTrue(TENGU_HUMBLE_FLURRY);
}
/**
 * 递归按键排序。
 */
//@ chunk-dcmhvw5a.js:173156-173318 placement
function sortKeysDeep(e) {
  if (Array.isArray(e)) return e.map(sortKeysDeep);
  if (e !== null && typeof e === "object") {
    let n = {};
    for (let r of Object.keys(e).sort()) n[r] = sortKeysDeep(e[r]);
    return n;
  }
  return e;
}
/**
 * 检查 JSON 值中是否含非有限数、-0 或 __proto__ 键。
 */
//@ chunk-dcmhvw5a.js:173318-173545 placement
function hasUnsafeJsonValue(e) {
  if (typeof e === "number") return !Number.isFinite(e) || Object.is(e, -0);
  if (Array.isArray(e)) return e.some(hasUnsafeJsonValue);
  if (e === null || typeof e !== "object") return !1;
  return Object.hasOwn(e, "__proto__") || Object.values(e).some(hasUnsafeJsonValue);
}

export {
  isGateOOn,
  isLovelyUmbrellaOn,
  sortKeysDeep,
  isGateAOn,
  hasUnsafeJsonValue,
  fj,
  m_r,
  isSettingsGateSettled,
  isTwinklingGlobeOn,
  vxi,
  Axi,
  Txi,
  kxi,
  V3e,
  Ht,
  $In,
  po,
  CredentialRuleSchema,
  uo,
  kio,
  Exi,
  TENGU_STEADY_MARSHMALLOW,
  wxi,
  Sxi,
  hio,
  vio,
  settingsSourceName,
  pd,
  rn,
  on,
  fd,
  sn,
  xxi,
  wio,
  Wfs,
  Sio,
  Cxi,
  Rxi,
};
