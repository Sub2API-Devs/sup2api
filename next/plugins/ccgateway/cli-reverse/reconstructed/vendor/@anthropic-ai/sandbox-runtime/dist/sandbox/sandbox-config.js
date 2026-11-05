/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-config.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-031g4amx.js (3)
 * attribution: esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, win32, posix } from "path";
import {
  create_2,
  create_16,
  create,
  create_25,
  create_15,
  create_26,
  create_6,
  create_20,
  create_3,
  create_19,
} from "../../../../zod/lib/index.mjs";
import {
  isValidDomainPattern,
  DOMAIN_PATTERN_MESSAGE,
  isValidAllowedDomainEntry,
  ALLOWED_DOMAIN_ENTRY_MESSAGE,
  hasValidIpv6Bracketing,
  splitDomainPatternPort,
  stripDomainPatternPort,
  isInjectHostCoveredByAllowedDomains,
} from "./domain-pattern.js";
import { parseAddressRange } from "./address.js";
import { ZodIssueCode } from "../../../../zod/v3/ZodError.js";
import { custom } from "../../../../zod/v3/types.js";
import { getPlatform } from "../utils/platform.js";
import { containsGlobCharsForPlatform } from "./sandbox-utils.js";

//@ chunk-031g4amx.js:427-23820 esm-fingerprint
var domainPatternSchema = create_2().refine(isValidDomainPattern, {
  message: DOMAIN_PATTERN_MESSAGE,
});
var domainPortPatternSchema = create_2().refine(isValidAllowedDomainEntry, {
  message: ALLOWED_DOMAIN_ENTRY_MESSAGE,
});
var deniedDomainPatternSchema = create_2().refine(
  (val) => {
    if (!hasValidIpv6Bracketing(val)) return false;
    let { hostPattern } = splitDomainPatternPort(val);
    return hostPattern === "*" || isValidDomainPattern(hostPattern);
  },
  {
    message:
      DOMAIN_PATTERN_MESSAGE +
      ' In deniedDomains a bare "*" (deny-all) is also accepted, and an optional ":port" suffix (1-65535) restricts the entry to that port.',
  },
);
var addressRangeSchema = create_2().refine((v) => parseAddressRange(v) !== undefined, {
  message:
    'Invalid IP address or CIDR range. Use an IPv4/IPv6 literal or CIDR, e.g. "10.0.0.0/8", "192.168.1.10", "fc00::/7" (IPv6 unbracketed).',
});
var filesystemPathSchema = create_2().min(1, "Path cannot be empty");
var filesystemPathEntrySchema = create_16(
  [
    filesystemPathSchema,
    create({
      path: filesystemPathSchema,
      literal: create_25(true),
    }).strict(),
  ],
  {
    errorMap: (issue, ctx) =>
      issue.code === ZodIssueCode.invalid_union
        ? {
            message: 'Expected a path, or { "path": "<path>", "literal": true }',
          }
        : {
            message: ctx.defaultError,
          },
  },
);
var binaryPathSchema = create_2()
  .min(1, "Path cannot be empty")
  .refine((val) => isAbsolute(val), {
    message: "Binary path must be absolute",
  });
var MitmProxyConfigSchema = create({
  socketPath: create_2().min(1).describe("Unix socket path to the MITM proxy"),
  domains: create_15(domainPatternSchema)
    .min(1)
    .describe('Domains to route through the MITM proxy (e.g., ["api.example.com", "*.internal.org"])'),
});
var ParentProxyConfigSchema = create({
  http: create_2().url().optional().describe("Upstream proxy URL for plain HTTP traffic"),
  https: create_2()
    .url()
    .optional()
    .describe("Upstream proxy URL for HTTPS/CONNECT traffic (falls back to http if unset)"),
  noProxy: create_2()
    .optional()
    .describe(
      "Comma-separated NO_PROXY list (hostname suffixes and CIDR ranges). Matching destinations connect directly instead of via the parent proxy.",
    ),
});
var credentialModeSchema = create_26(["deny", "mask"]);
var envVarNameSchema = create_2().regex(
  /^[A-Za-z_][A-Za-z0-9_]*$/,
  "Environment variable name must start with a letter or underscore and contain only letters, digits, and underscores",
);
var extractPatternSchema = create_2().superRefine((val, ctx) => {
  let re;
  try {
    re = new RegExp(val);
  } catch (err) {
    ctx.addIssue({
      code: ZodIssueCode.custom,
      message: `extract is not a valid regular expression: ${err.message}`,
    });
    return;
  }
  if (new RegExp(re.source + "|").exec("").length - 1 < 1)
    ctx.addIssue({
      code: ZodIssueCode.custom,
      message:
        "extract must contain at least one capturing group \u2014 group 1 is " +
        'the credential value to mask (e.g. "token:\\s*(\\S+)").',
    });
});
var CredentialFileConfigSchema = create({
  path: filesystemPathSchema.describe(
    "Path to a credential file or directory. Supports the same path forms as a string in filesystem.denyRead (absolute paths and ~ expansion).",
  ),
  mode: credentialModeSchema.describe("Access mode for this path"),
  extract: extractPatternSchema
    .optional()
    .describe(
      'Optional regex for structured masking. Applied globally; capture group 1 of each match is masked, the rest of the file is preserved. If the pattern matches nothing, behaviour is governed by onExtractNoMatch (default "warn"). Only meaningful when mode is "mask"; accepted but ignored for "deny".',
    ),
  onExtractNoMatch: create_26(["warn", "deny", "error"])
    .optional()
    .describe(
      "What to do when extract matches nothing (or, with decode, no " +
        'candidate verifies): "warn" (default \u2014 stderr warning, file left ' +
        'readable), "deny" (degrade to mode "deny" \u2014 file unreadable), or ' +
        '"error" (throw at wrap time). Only meaningful with mode "mask" and extract or decode set.',
    ),
  decode: create_26(["jwt"])
    .optional()
    .describe(
      'Optional encoded-credential format. "jwt": decodes recognized JWTs so masking can target fields inside them (see maskClaims). Candidates are located with a built-in JWT regex (or the explicit extract pattern, if set) and verified to actually be JWTs before masking. Without maskClaims, the whole decoded value is treated as the credential and replaced with a structurally valid fake JWT, so client-side token parsing keeps working. If no candidate verifies, behaviour is governed by onExtractNoMatch (default "warn"). Only meaningful when mode is "mask"; accepted but ignored for "deny".',
    ),
  maskClaims: create_15(create_2().min(1))
    .optional()
    .describe(
      'Names of top-level payload claims to mask inside each decoded value, instead of replacing the whole token. Each named claim present with a string value gets its own sentinel; all other claims are preserved so claim-reading clients keep working. Requires decode. If no named claim matches in any verified token, behaviour is governed by onExtractNoMatch (default "warn"). Only meaningful when mode is "mask"; accepted but ignored for "deny".',
    ),
  maskDuplicates: create_6()
    .optional()
    .describe(
      "If true, verbatim occurrences of each captured credential value outside the regex-matched spans are also replaced with the " +
        "corresponding sentinel \u2014 for a secret repeated where the regex " +
        `does not reach (e.g. in a comment). Matches raw substrings: short or common credential values may corrupt unrelated content, so this is intended for long, high-entropy secrets. With decode, only values that passed verification are scanned; duplicates reuse the verified value's fake without re-verification. Defaults to false. Only meaningful with mode "mask" and extract or decode set; accepted but ignored otherwise.`,
    ),
  injectHosts: create_15(domainPatternSchema)
    .optional()
    .describe(
      "Optional narrowing of where the proxy substitutes this credential. " +
        "If unset, defaults to network.allowedDomains \u2014 the credential is " +
        'injected at every reachable host. Only meaningful when mode is "mask"; accepted but ignored for "deny".',
    ),
});
var environmentSchema = create({
  name: envVarNameSchema.describe("Environment variable name"),
  mode: credentialModeSchema.describe("Access mode for this environment variable"),
  extract: extractPatternSchema
    .optional()
    .describe(
      'Optional regex for structured masking. Applied globally; capture group 1 of each match is masked, the rest of the value is preserved. If the pattern matches nothing, behaviour is governed by onExtractNoMatch (default "warn"). Only meaningful when mode is "mask"; accepted but ignored for "deny".',
    ),
  onExtractNoMatch: create_26(["warn", "deny", "error"])
    .optional()
    .describe(
      'What to do when extract matches nothing: "warn" (default \u2014 stderr ' +
        'warning, variable passes through unmasked), "deny" (variable unset inside the sandbox), or "error" (throw at wrap time). Only meaningful with mode "mask" and extract set.',
    ),
  decode: create_26(["jwt"])
    .optional()
    .describe(
      `Optional encoded-credential format. "jwt": the variable's whole value is verified to actually be a JWT and replaced with a structurally valid fake JWT so client-side token parsing keeps working; the proxy swaps the whole fake token on egress. If the value does not verify, the variable is left unmasked with a stderr warning (fail-open). Only meaningful when mode is "mask"; accepted but ignored for "deny".`,
    ),
  maskClaims: create_15(create_2().min(1))
    .optional()
    .describe(
      'Names of top-level payload claims to mask inside the decoded value, instead of replacing the whole token. Each named claim present with a string value gets its own sentinel; all other claims are preserved so claim-reading clients keep working. Requires decode. If no named claim matches, the variable is left unmasked with a stderr warning (fail-open). Only meaningful when mode is "mask"; accepted but ignored for "deny".',
    ),
  injectHosts: create_15(domainPatternSchema)
    .optional()
    .describe(
      "Optional narrowing of where the proxy substitutes this credential. " +
        "If unset, defaults to network.allowedDomains \u2014 the credential is " +
        'injected at every reachable host. Only meaningful when mode is "mask"; accepted but ignored for "deny".',
    ),
});
var AwsPairConfigSchema = create({
  accessKeyIdVar: envVarNameSchema.describe("Name of the masked env var holding the AWS access key id."),
  secretAccessKeyVar: envVarNameSchema.describe(
    "Name of the masked env var holding the AWS secret access key.",
  ),
  sessionTokenVar: envVarNameSchema
    .optional()
    .describe(
      "Optional name of the masked env var holding the AWS session token (temporary credentials). When set, the proxy sends the real token as x-amz-security-token on re-signed requests and adds it to the signed header set if the client did not.",
    ),
}).strict();
var sigv4PolicySchema = create_26(["deny", "passthrough"]);
var Sigv4ConfigSchema = create({
  streaming: sigv4PolicySchema
    .optional()
    .describe(
      'Policy for aws-chunked streaming uploads (x-amz-content-sha256: STREAMING-*): per-chunk signatures chain off the seed signature, so re-signing would require rewriting the body. Default "deny".',
    ),
  presigned: sigv4PolicySchema
    .optional()
    .describe(
      'Policy for presigned URLs (X-Amz-Algorithm/X-Amz-Signature in the query, no Authorization header): the signature lives in the URL itself. Default "deny".',
    ),
  sigv4a: sigv4PolicySchema
    .optional()
    .describe(
      'Policy for SigV4A (AWS4-ECDSA-P256-SHA256) asymmetric signatures: there is no shared-key HMAC to recompute. Default "deny".',
    ),
}).strict();
var CredentialsConfigSchema = create({
  files: create_15(CredentialFileConfigSchema)
    .optional()
    .describe("Credential files or directories to protect"),
  envVars: create_15(environmentSchema).optional().describe("Environment variables to protect"),
  allowPlaintextInject: create_6()
    .optional()
    .describe(
      "Allow sentinel\u2192real substitution on the plain-HTTP proxy path. " +
        "Defaults to false: without TLS termination the upstream identity is unverified and the credential travels in cleartext. Set only for trusted-network test fixtures.",
    ),
  awsPairs: create_15(AwsPairConfigSchema)
    .optional()
    .describe(
      "Explicit groupings of masked env vars into AWS credential pairs for SigV4 re-signing, for non-standard variable names. The conventional AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN trio is paired automatically when masked.",
    ),
  sigv4: Sigv4ConfigSchema.optional().describe(
    'Policies for AWS SigV4 request shapes the proxy cannot re-sign (streaming, presigned, sigv4a) when they reference a masked credential pair: "deny" (default) or "passthrough".',
  ),
}).strict();
var NetworkConfigSchema = create({
  allowedDomains: create_15(domainPortPatternSchema).describe(
    'List of allowed domains (e.g., ["github.com", "*.npmjs.org", "api.example.com:443"]). An optional ":port" suffix restricts the entry to that destination port.',
  ),
  deniedDomains: create_15(deniedDomainPatternSchema).describe(
    'List of denied domains. Unlike allowedDomains, a bare "*" is accepted here (deny-all). An optional ":port" suffix (e.g., "*:22") restricts the entry to that destination port.',
  ),
  deniedDomainReasons: create_20(create_2(), create_2().min(1))
    .optional()
    .describe(
      'Optional model-facing reason keyed by the exact deniedDomains entry it explains (e.g., {"github.com:22": "SSH pushes to GitHub are blocked; use an https remote"}). Reported in the <sandbox_violations> line when that entry denies a connection, and to the sandboxed client as the status phrase of the 403 that answers its CONNECT; entries without one use a generic reason. Keys are matched by exact entry string, so a key with no matching deniedDomains entry never fires.',
    ),
  strictAllowlist: create_6()
    .optional()
    .describe(
      "If true, hosts not in allowedDomains are denied without consulting the ask callback, and a per-command allow list (registerCommandNetworkLists) is ignored. Set this when allowedDomains is policy enforcement, not a prompt-suppression hint.",
    ),
  deniedResolvedAddresses: create_15(addressRangeSchema)
    .optional()
    .describe(
      'IP addresses / CIDR ranges (IPv4 or IPv6, unbracketed) that an allowed HOSTNAME must not resolve to, in addition to the built-in set (see README "Resolved-address check") and any IP literal listed in deniedDomains. A permitted name that resolves only into these is refused instead of dialed. A name may resolve to a denied address only if that IP literal (and port) is itself in allowedDomains. Not evaluated for connections routed through parentProxy (including one taken from HTTP_PROXY/HTTPS_PROXY) or mitmProxy (that hop resolves the name).',
    ),
  allowUnixSockets: create_15(create_2())
    .optional()
    .describe("macOS only: Unix socket paths to allow. Ignored on Linux (seccomp cannot filter by path)."),
  allowAllUnixSockets: create_6()
    .optional()
    .describe(
      "If true, allow all Unix sockets (disables blocking on both platforms). On Linux this also unblocks VM sockets (AF_VSOCK).",
    ),
  allowLocalBinding: create_6()
    .optional()
    .describe(
      "Whether sandboxed commands may use local ports directly (default: false). macOS: allows binding and accepting on any local port and connecting to localhost on any port. Windows: allows connecting to loopback addresses (127.0.0.0/8, ::1) on any TCP or UDP port; it is part of the machine-wide filter set, so it MUST match how `srt-win install` was run (`--allow-loopback` or not) and a session that " +
        "differs from the install is refused. Linux: ignored \u2014 the " +
        "sandbox has its own network namespace, whose loopback is always usable and is not the host one. Every service listening on localhost becomes reachable, including any local proxy or forwarder that would carry traffic off the machine.",
    ),
  allowMachLookup: create_15(
    create_2().refine((val) => !(val.endsWith("*") ? val.slice(0, -1) : val).includes("*"), {
      message:
        'Wildcards are only allowed as a single trailing "*" (e.g., "com.example.*" or "*" for all services).',
    }),
  )
    .optional()
    .describe(
      'macOS only: Additional XPC/Mach service names to allow looking up. Supports trailing-wildcard prefix matching (e.g., "2BUA8C4S2C.com.1password.*"). Needed for tools like 1Password CLI, Playwright, or the iOS Simulator that communicate via XPC.',
    ),
  httpProxyPort: create_3()
    .int()
    .min(1)
    .max(65535)
    .optional()
    .describe(
      "Port of an external HTTP proxy to use instead of starting a local one. When provided, the library will skip starting its own HTTP proxy and use this port. The external proxy must handle domain filtering.",
    ),
  socksProxyPort: create_3()
    .int()
    .min(1)
    .max(65535)
    .optional()
    .describe(
      "Port of an external SOCKS proxy to use instead of starting a local one. When provided, the library will skip starting its own SOCKS proxy and use this port. The external proxy must handle domain filtering.",
    ),
  mitmProxy: MitmProxyConfigSchema.optional().describe(
    "Optional MITM proxy configuration. Routes matching domains through an upstream proxy via Unix socket while SRT still handles allow/deny filtering.",
  ),
  filterRequest: custom((v) => typeof v === "function", {
    message: "filterRequest must be a function",
  })
    .optional()
    .describe(
      "Per-request filter callback. Receives the parsed HTTP request (web-standard Request) and request details, and returns {action, reason?, status?} or, for an allow, header edits (removeHeaders, setHeaders) and an onResponse observer. Denied requests get the status (403 by default) with the reason. If the callback throws, the request is denied. Applies to plain HTTP through the proxy and, when tlsTerminate is configured, to terminated HTTPS. SRT does not provide a policy language; library consumers own matching. This and the five options after it are read when the proxy starts; updateConfig does not change them.",
    ),
  allowPlaintextHeaderSet: create_6()
    .optional()
    .describe(
      "Let a filterRequest allow set headers on plain-HTTP requests. Off by default: a header set there travels in cleartext, so while it is off an allow that carries setHeaders is refused with 403 for every request the proxy receives in cleartext, an absolute https:// URI included. An allow without setHeaders is unaffected and removals always apply.",
    ),
  stripResponseHeaders: create_15(create_2().min(1))
    .optional()
    .describe(
      'Response headers never passed back to the sandboxed client, matched case-insensitively with "-", "_" and "." folded (e.g. ["set-cookie"]).',
    ),
  refuseOpaqueTunnels: create_6()
    .optional()
    .describe(
      "Refuse every tunnel filterRequest cannot see into: an HTTP CONNECT that would not be TLS-terminated or carries no TLS, and every SOCKS CONNECT (refused at the handshake). Requires tlsTerminate to serve HTTPS at all, and stops CONNECT-carried SSH such as GIT_SSH_COMMAND through the proxy. Refusals are recorded as violations.",
    ),
  requireHostMatch: create_6()
    .optional()
    .describe(
      "Answer 421 to a request whose Host header, TLS server name or absolute-form authority does not name the host and port it is sent to, before filterRequest is asked. Refusals are recorded as violations.",
    ),
  ambiguousRequestTarget: create_26(["refuse", "asSpelled", "normalize"])
    .optional()
    .describe(
      'While filterRequest is set: what becomes of a request whose target names another path once normalized than as the client spelled it (a dot segment, "%2e" included, leading slashes or "\\"), so that the upstream may act on another resource than the callback judged. "refuse" (default): 400 before filterRequest is asked, recorded as a violation. "asSpelled": forwarded as spelled; the callback has to hold for every reading of it, and gets requestTarget, normalizedRequestTarget and requestTargetIsAmbiguous. "normalize": forwarded normalized, which breaks a signature over the path and names another resource to an upstream that takes the path literally.',
    ),
  tlsTerminate: create({
    caCertPath: create_2()
      .min(1)
      .optional()
      .describe(
        "Path to a PEM-encoded CA certificate. The sandboxed child is configured to trust this CA, and the TLS-terminating proxy uses it to sign per-host certificates. If omitted, on Windows SRT generates-if-absent a persistent CA under %ProgramData%\\sandbox-runtime\\ca\\ and trusts it in the sandbox user's Root store; on other platforms SRT generates an ephemeral CA into a temp directory for the lifetime of the session.",
      ),
    caKeyPath: create_2().min(1).optional().describe("Path to the PEM-encoded private key for caCertPath."),
    excludeDomains: create_15(domainPatternSchema)
      .optional()
      .describe(
        "Domain patterns (same syntax as allowedDomains) whose HTTPS connections are NOT terminated. Matching CONNECTs are opaque byte tunnels: still subject to the allow/deny domain lists, but the sandboxed client completes its own TLS handshake with the upstream, so filterRequest and credential injection do not apply to their HTTPS traffic (plain-HTTP requests to the same hosts keep the normal request pipeline). Use for hosts the proxy must not re-originate: mTLS upstreams (only the client holds the client certificate) and clients that pin the upstream certificate and would reject the MITM CA. Hosts still need to be reachable via allowedDomains; this list only changes how they are tunnelled.",
      ),
    extraCaCertPaths: create_15(create_2().min(1))
      .optional()
      .describe(
        "Paths to PEM CA certificate files appended to the trust bundle the sandboxed child is pointed at, after the MITM CA and the host's regular roots. Use for site-local roots (e.g. an internal mTLS CA) presented by excluded/passthrough hosts, so the child can verify them itself. Only the CERTIFICATE blocks of each file are copied; files that are missing, unreadable, or contain no PEM CERTIFICATE block are skipped (with a debug log), so paths that exist on only some hosts are safe to list.",
      ),
    maxTunnels: create_3()
      .int()
      .min(1)
      .max(65536)
      .optional()
      .describe(
        'At most this many CONNECT tunnels are TLS-terminated at once (default 256); past it a CONNECT is answered 503 with "X-Proxy-Error: too-many-tunnels", and the refusal is recorded as a violation, once per command until half the slots are free again. A tunnel holds its slot from its CONNECT until it closes, so idle keep-alive tunnels count until they are closed (6 s after a response); one that turns out not to carry TLS frees it. The slot is taken before the first bytes are seen, so at the cap a non-TLS CONNECT (SSH, say) to a host that would be terminated is refused too. Hosts in excludeDomains do not count. Read at each CONNECT, so updateConfig changes it for the tunnels that follow.',
      ),
    handshakeTimeoutMs: create_3()
      .int()
      .min(100)
      .max(600000)
      .optional()
      .describe(
        "A tunnel to be TLS-terminated must finish its TLS handshake within this many milliseconds of its CONNECT (default 10000), or it is closed and its slot freed. A tunnel past its handshake is never timed out by it. Read at each CONNECT, so updateConfig changes it for the tunnels that follow.",
      ),
  })
    .refine((o) => !o.caCertPath === !o.caKeyPath, {
      message: "caCertPath and caKeyPath must be provided together",
    })
    .optional()
    .describe(
      "[EXPERIMENTAL] Enable in-process TLS termination so HTTPS request/response bodies are visible to SRT. Provide a CA cert+key, or omit both to have SRT generate an ephemeral one. Needs Node, or Bun 1.4 or later: SandboxManager.initialize throws on an older runtime.",
    ),
  parentProxy: ParentProxyConfigSchema.optional().describe(
    "Upstream HTTP proxy for outbound connections. When set, SRT's proxy tunnels non-mitmProxy traffic through this parent instead of connecting directly. Falls back to HTTP_PROXY/HTTPS_PROXY/NO_PROXY env vars if unset.",
  ),
});
var filesystemSchema = create({
  disabled: create_6()
    .optional()
    .describe(
      "Disable all filesystem policy enforcement. When true, no read or write rules are emitted: denyRead/allowRead/allowWrite/denyWrite are ignored, and the built-in mandatory write protections (.git/hooks, .git/config, shell rc files, .mcp.json, .vscode/.idea, .claude/commands, .claude/agents) are NOT applied. Use only when the sandboxed process is trusted with full host filesystem access. Network and credential-env restrictions still apply. On Linux, /dev is still replaced by the bwrap minimal devtmpfs.",
    ),
  denyRead: create_15(filesystemPathEntrySchema).describe("Paths denied for reading"),
  allowRead: create_15(filesystemPathEntrySchema)
    .optional()
    .describe(
      "Paths to re-allow reading within denied regions (takes precedence over denyRead). Use with denyRead to deny a broad region then allow back specific subdirectories.",
    ),
  allowWrite: create_15(filesystemPathEntrySchema).describe("Paths allowed for writing"),
  denyWrite: create_15(filesystemPathEntrySchema).describe(
    "Paths denied for writing (takes precedence over allowWrite)",
  ),
  allowGitConfig: create_6()
    .optional()
    .describe(
      "Allow writes to .git/config files (default: false). Enables git remote URL updates while keeping .git/hooks protected.",
    ),
});
var IgnoreViolationsConfigSchema = create_20(create_2(), create_15(create_2())).describe(
  'Map of command patterns to filesystem paths to ignore violations for. Use "*" to match all commands',
);
var RipgrepConfigSchema = create({
  command: create_2().describe("The ripgrep command to execute"),
  args: create_15(create_2()).optional().describe("Additional arguments to pass before ripgrep args"),
  argv0: create_2()
    .optional()
    .describe("Override argv[0] when spawning (for multicall binaries that dispatch on argv[0])"),
});
var GitConfigSchema = create({
  safeDirectories: create_15(create_2())
    .default([])
    .describe(
      "Directories git should treat as safe (`safe.directory`) even though they're owned by a different user inside the sandbox. Use for the repo top-level when launching from a subdirectory. Does NOT grant write.",
    ),
});
var SrtWinConfigSchema = create({
  path: create_2()
    .min(1)
    .describe(
      "Path to the srt-win binary. Pass the exported VENDORED_SRT_WIN_EXE constant to use the packaged vendor/srt-win/<arch>/srt-win.exe (see its WARNING: in a dev checkout that file may sit inside your sandbox write grant). The binary is spawned with the `--srt-win` argv[1] sentinel so a multicall dispatcher can route to srt-win's CLI.",
    ),
});
var WindowsConfigSchema = create({
  sandboxUser: create_2()
    .min(1)
    .max(20, "Windows local usernames are limited to 20 characters")
    .optional()
    .describe(
      "Name for the dedicated sandbox user account that `srt-win install` creates and the sandboxed child runs as. Default: `srt-sandbox`. Install refuses if an account by this name already exists and srt-win did not create it (it will not rotate the password of an account it does not own). Must match what `srt-win install --sandbox-user` was run with.",
    ),
  sublayerGuid: create_2()
    .uuid()
    .optional()
    .describe(
      "WFP sublayer GUID under which the filters were installed. Omit to use the srt-win compile-time default. Set this when filters were installed by enterprise tooling under a custom sublayer.",
    ),
  wfpSublayerGuid: create_2().uuid().optional().describe("Deprecated alias for sublayerGuid."),
  proxyPortRange: create_19([create_3().int().min(1), create_3().int().max(65535)])
    .refine(([lo, hi]) => lo <= hi && hi - lo <= 64, {
      message: "low must be \u2264 high and range width \u2264 64",
    })
    .optional()
    .describe(
      "Inclusive [low, high] port range the JS mux proxy listeners bind inside. MUST match the range passed to `srt-win install " +
        "--proxy-port-range` (default 60080\u201360089) \u2014 the WFP loopback " +
        "permit only covers ports in that range.",
    ),
  srtWin: SrtWinConfigSchema.optional().describe(
    "How to locate/invoke the srt-win helper binary. `srtWin.path` is " +
      "required to use the Windows sandbox \u2014 your own (multicall) binary, " +
      "or the exported VENDORED_SRT_WIN_EXE constant for the packaged exe.",
  ),
});
var SeccompConfigSchema = create({
  applyPath: create_2().optional().describe("Path to the apply-seccomp binary"),
  argv0: create_2()
    .optional()
    .describe(
      "Invoke apply-seccomp as a multicall binary that dispatches on the ARGV0 environment variable. When set, applyPath is used verbatim (no existence check) and the invocation inside bwrap is prefixed with ARGV0=<this value>. The caller is responsible for ensuring applyPath resolves inside the bwrap namespace and that the target binary implements the apply-seccomp interface when ARGV0 matches.",
    ),
});
//@ chunk-031g4amx.js:23820-24244 esm-fingerprint
function addInertSlashedDenyGlobIssue(value, path, ctx) {
  let onWindows = getPlatform() === "windows";
  let trailingSeparator = onWindows ? /[\\/]+$/ : /\/+$/;
  if (!trailingSeparator.test(value)) return;
  if (!containsGlobCharsForPlatform(value)) return;
  if (!(onWindows ? win32.isAbsolute(value) : posix.isAbsolute(value)) && !value.startsWith("~")) return;
  ctx.addIssue({
    code: ZodIssueCode.custom,
    path,
    message: `Deny glob "${value}" ends in a separator, so as a pattern it can match no path. Write "${value.replace(trailingSeparator, "")}", which is also read as the path of that name where it exists, or add a "**" segment to match at any depth.`,
  });
}
//@ chunk-031g4amx.js:24244-32390 esm-fingerprint
var SandboxRuntimeConfigSchema = create({
  network: NetworkConfigSchema.describe("Network restrictions configuration"),
  filesystem: filesystemSchema.describe("Filesystem restrictions configuration"),
  credentials: CredentialsConfigSchema.optional().describe(
    "Credential handling configuration. Only the explicitly declared files and environment variables are restricted.",
  ),
  ignoreViolations: IgnoreViolationsConfigSchema.optional().describe(
    "Optional configuration for ignoring specific violations",
  ),
  enableWeakerNestedSandbox: create_6()
    .optional()
    .describe("Enable weaker nested sandbox mode (for Docker environments)"),
  allowNestedUserNamespaces: create_6()
    .optional()
    .describe(
      "Let the sandboxed command create user namespaces of its own (Linux only), as a browser sandbox, rootless podman or a nested bubblewrap does. This gives up the write denies against a hostile command, which can then take the read-only binds that enforce denyWrite and the mandatory denies out of its own view. Default: false.",
    ),
  enableWeakerNetworkIsolation: create_6()
    .optional()
    .describe(
      "Enable weaker network isolation to allow access to com.apple.trustd.agent (macOS only). This is needed for Go programs (gh, gcloud, terraform, kubectl, etc.) to verify TLS certificates when using httpProxyPort with a MITM proxy and custom CA. Enabling this opens a potential data exfiltration vector through the trustd service. Only enable if you need Go TLS verification.",
    ),
  allowAppleEvents: create_6()
    .optional()
    .describe(
      "Allow sending Apple Events and Launch Services open requests from the sandbox (macOS only). Needed for open, osascript, and anything that opens URLs or scripts other apps via AppleScript. This removes code-execution isolation: sandboxed commands can launch other applications unsandboxed with no user prompt (launched apps are not subject to the sandbox filesystem or network restrictions), and can script running apps subject to TCC automation consent. Default: false.",
    ),
  ripgrep: RipgrepConfigSchema.optional().describe(
    'Custom ripgrep configuration (default: { command: "rg" })',
  ),
  mandatoryDenySearchDepth: create_3()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe(
      "How deep below the working directory dangerous names are looked for on Linux (default: 3): a dangerous file down to this depth, and a dangerous directory, or the hooks and config of a repository, one level higher up. Higher values provide more protection but slower performance.",
    ),
  allowPty: create_6().optional().describe("Allow pseudo-terminal (pty) operations (macOS only)"),
  seccomp: SeccompConfigSchema.optional().describe("Custom seccomp binary paths (Linux only)."),
  bwrapPath: binaryPathSchema
    .optional()
    .describe(
      'Linux only: absolute path to the bwrap (bubblewrap) binary. When set, this path is used directly instead of resolving "bwrap" via PATH.',
    ),
  socatPath: binaryPathSchema
    .optional()
    .describe(
      'Linux only: absolute path to the socat binary. When set, this path is used directly instead of resolving "socat" via PATH.',
    ),
  javaAgentJarPath: binaryPathSchema
    .optional()
    .describe(
      "macOS/Linux: absolute path to srt-proxy-agent.jar, the JVM agent injected via JAVA_TOOL_OPTIONS so Java tools honor the proxy. When set, used instead of looking under vendor/java-proxy-agent/. For consumers that bundle sandbox-runtime and ship the jar separately.",
    ),
  windows: WindowsConfigSchema.optional().describe(
    "Windows-specific settings (WFP sublayer, proxy port range).",
  ),
  git: GitConfigSchema.optional().describe(
    "Git configuration to inject via GIT_CONFIG_* env vars (cross-platform). `safeDirectories` marks paths as `safe.directory` without adding them to `filesystem.allowWrite`.",
  ),
}).superRefine((cfg, ctx) => {
  let fsEnforced = !cfg.filesystem.disabled;
  if (fsEnforced) {
    for (let [idx, p] of cfg.filesystem.denyRead.entries()) {
      if (typeof p !== "string") continue;
      addInertSlashedDenyGlobIssue(p, ["filesystem", "denyRead", idx], ctx);
    }
    for (let [idx, p] of cfg.filesystem.denyWrite.entries()) {
      if (typeof p !== "string") continue;
      addInertSlashedDenyGlobIssue(p, ["filesystem", "denyWrite", idx], ctx);
    }
  }
  let creds = cfg.credentials;
  if (!creds) return;
  let allowedHosts = cfg.network.allowedDomains.map(stripDomainPatternPort);
  let checkSubset = (hosts, path) => {
    for (let [i, host] of hosts.entries())
      if (!isInjectHostCoveredByAllowedDomains(host, allowedHosts))
        ctx.addIssue({
          code: ZodIssueCode.custom,
          path: [...path, i],
          message:
            `injectHosts entry "${host}" is not reachable via ` +
            `network.allowedDomains \u2014 add "${host}" (or a covering wildcard) to allowedDomains, or remove it from injectHosts.`,
        });
  };
  let hasMasked = false;
  let checkMaskedEntry = (entry, path) => {
    if (entry.injectHosts) checkSubset(entry.injectHosts, [...path, "injectHosts"]);
    if (entry.mode !== "mask") return;
    hasMasked = true;
    let exclude = cfg.network.tlsTerminate?.excludeDomains;
    if (exclude?.length) {
      if (entry.injectHosts) {
        for (let [i_2, host] of entry.injectHosts.entries())
          if (isInjectHostCoveredByAllowedDomains(host, exclude))
            ctx.addIssue({
              code: ZodIssueCode.custom,
              path: [...path, "injectHosts", i_2],
              message: `injectHosts entry "${host}" is entirely covered by network.tlsTerminate.excludeDomains. Credential injection only runs on TLS-terminated connections, so this host would receive the placeholder instead of the credential. Remove it from one of the two lists.`,
            });
      } else if (
        allowedHosts.length > 0 &&
        allowedHosts.every((p) => isInjectHostCoveredByAllowedDomains(p, exclude))
      )
        ctx.addIssue({
          code: ZodIssueCode.custom,
          path,
          message:
            "This masked credential has no injectHosts, so it defaults " +
            "to network.allowedDomains \u2014 but " +
            "network.tlsTerminate.excludeDomains covers every allowed domain, so it could never be injected anywhere. Credential injection only runs on TLS-terminated connections.",
        });
    }
    if (entry.injectHosts !== undefined && entry.injectHosts.length === 0)
      ctx.addIssue({
        code: ZodIssueCode.custom,
        path,
        message:
          "injectHosts is explicitly empty \u2014 the credential would be " +
          "masked but never injected. Omit injectHosts to default to network.allowedDomains, or list the intended hosts.",
      });
  };
  for (let [idx, v] of (creds.envVars ?? []).entries()) {
    checkMaskedEntry(v, ["credentials", "envVars", idx]);
    if (v.maskClaims !== undefined && v.decode === undefined)
      ctx.addIssue({
        code: ZodIssueCode.custom,
        path: ["credentials", "envVars", idx, "maskClaims"],
        message:
          "maskClaims requires decode \u2014 it names claims inside the " +
          'decoded payload. Set decode (e.g. "jwt"), or remove maskClaims to mask the whole value.',
      });
    if (v.maskClaims !== undefined && v.maskClaims.length === 0)
      ctx.addIssue({
        code: ZodIssueCode.custom,
        path: ["credentials", "envVars", idx, "maskClaims"],
        message:
          "maskClaims is explicitly empty \u2014 no claim would ever be " +
          "masked. Omit maskClaims to mask the whole token, or list the claims to protect.",
      });
  }
  for (let [idx, f] of (creds.files ?? []).entries()) {
    checkMaskedEntry(f, ["credentials", "files", idx]);
    if (f.maskClaims !== undefined && f.decode === undefined)
      ctx.addIssue({
        code: ZodIssueCode.custom,
        path: ["credentials", "files", idx, "maskClaims"],
        message:
          "maskClaims requires decode \u2014 it names claims inside the " +
          'decoded payload. Set decode (e.g. "jwt"), or remove maskClaims to mask the extracted value whole.',
      });
    if (f.maskClaims !== undefined && f.maskClaims.length === 0)
      ctx.addIssue({
        code: ZodIssueCode.custom,
        path: ["credentials", "files", idx, "maskClaims"],
        message:
          "maskClaims is explicitly empty \u2014 no claim would ever be " +
          "masked. Omit maskClaims to mask the whole token, or list the claims to protect.",
      });
    if (f.mode === "mask" && f.path.endsWith("/"))
      ctx.addIssue({
        code: ZodIssueCode.custom,
        path: ["credentials", "files", idx, "path"],
        message: `Credential mode "mask" applies to a single file, not a directory. Use mode "deny" for "${f.path}", or point at the credential file inside it.`,
      });
    if (fsEnforced && f.mode === "deny")
      addInertSlashedDenyGlobIssue(f.path, ["credentials", "files", idx, "path"], ctx);
  }
  let seenPairVars = new Set();
  for (let [idx, pair] of (creds.awsPairs ?? []).entries()) {
    let vars = [
      ["accessKeyIdVar", pair.accessKeyIdVar],
      ["secretAccessKeyVar", pair.secretAccessKeyVar],
    ];
    if (pair.sessionTokenVar !== undefined) vars.push(["sessionTokenVar", pair.sessionTokenVar]);
    for (let [field, name] of vars) {
      let path = ["credentials", "awsPairs", idx, field];
      if (seenPairVars.has(name)) {
        ctx.addIssue({
          code: ZodIssueCode.custom,
          path,
          message:
            `"${name}" appears in more than one awsPairs slot (within ` +
            "or across pairs) \u2014 each variable can fill exactly one slot.",
        });
        continue;
      }
      seenPairVars.add(name);
      let entry = (creds.envVars ?? []).find((v) => v.name === name);
      if (entry === undefined || entry.mode !== "mask")
        ctx.addIssue({
          code: ZodIssueCode.custom,
          path,
          message:
            `"${name}" does not reference a credentials.envVars entry ` +
            'with mode "mask" \u2014 an AWS pair links already-masked ' +
            "variables; add the entry (masking is the opt-in for SigV4 re-signing).",
        });
      else if (entry.extract !== undefined || entry.decode !== undefined)
        ctx.addIssue({
          code: ZodIssueCode.custom,
          path,
          message: `"${name}" uses extract/decode, but an AWS pair member must be masked whole-value: the SigV4 trigger is an exact match of the fake access key id, and the signer needs the entire real value.`,
        });
    }
  }
  if (hasMasked && cfg.network.tlsTerminate === undefined && !creds.allowPlaintextInject)
    ctx.addIssue({
      code: ZodIssueCode.custom,
      path: ["credentials"],
      message:
        "Credential masking requires network.tlsTerminate so substitution runs only over a verified TLS connection. Enable tlsTerminate, or set credentials.allowPlaintextInject to opt out (not recommended).",
    });
});
export { NetworkConfigSchema };
