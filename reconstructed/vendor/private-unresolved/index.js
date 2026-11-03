/**
 * private-unresolved/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: private-unresolved/index.js
 * pieces: chunk-1ny7cxrt.js (65), chunk-ha3km179.js (1)
 * attribution: cjs-unmatched+string-clue 66
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_v3 } from "../zod/v3/index.cjs";

//@ chunk-1ny7cxrt.js:86162-86603 cjs-unmatched+string-clue
var Hu = x(function (RE) {
  Object.defineProperty(RE, "__esModule", {
    value: true,
  });
  RE.TIER_DESCRIPTIONS = RE.EFFORT_LEVELS = RE.ANTHROPIC_TIER_NAMES = undefined;
  RE.ANTHROPIC_TIER_NAMES = ["sonnet", "opus", "haiku", "fable", "mythos"];
  RE.EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"];
  RE.TIER_DESCRIPTIONS = {
    haiku: "Fastest for quick answers",
    sonnet: "Most efficient for everyday tasks",
    opus: "Most capable for ambitious work",
    fable: "For your toughest challenges",
  };
});
//@ chunk-1ny7cxrt.js:86603-89659 cjs-unmatched+string-clue
var __ = x(function (zE) {
  Object.defineProperty(zE, "__esModule", {
    value: true,
  });
  zE._test = zE.TIER_ALIASES = undefined;
  zE.isDefinitelyNotAnthropicModel = nK;
  zE.containsAnthropicToken = rK;
  zE.isLikelyAnthropicModelId = Vf;
  zE.verdictToFallbackReason = oK;
  zE.checkModel = aK;
  var Zf = Hu();
  zE.TIER_ALIASES = new RegExp(`^(${Zf.ANTHROPIC_TIER_NAMES.join("|")})(-[\\d.]+)?$`);
  var ME = ["claude", ...Zf.ANTHROPIC_TIER_NAMES, "anthropic"];
  var jE =
    /ark-code|astron|command-r|deepseek|doubao|gemini|gemma|glm|gpt|grok|hermes|hy3|kimi|lfm|\bling\b|llama|longcat|mimo|minimax|mistral|mixtral|moonshot|nemotron|openai|phi-|qianfan|qwen|tc-code|\bunic\b|yi-|stepfun|step-3|seed-|bytedance|hunyuan|granite|amazon\.nova|nova-|devstral|ministral|ernie|codex|arcee|trinity|abab|phi\d|\bk2\.|\bm2\.|jamba|arctic|solar|mercury|zamba|kat-coder|\bds-|dpsk/;
  function nK(e) {
    return jE.test(e.toLowerCase());
  }
  function rK(e) {
    let lower = e.toLowerCase();
    return ME.some((n) => lower.includes(n));
  }
  function Vf(e) {
    let lower = e.toLowerCase();
    if (jE.test(lower)) return false;
    return zE.TIER_ALIASES.test(lower) || ME.some((n) => lower.includes(n));
  }
  var iK = ["not_in_allowed_models", "model_restricted", "desktop_update_required"];
  function oK(e) {
    var t;
    return (t = iK.find((n) => n === e.reason)) !== null && t !== undefined
      ? t
      : "fails_anthropic_model_check";
  }
  function xE(e) {
    let lower = e.toLowerCase();
    if (/(?:^|\.)anthropic\./.test(lower))
      return {
        ok: true,
      };
    if (/^arn:aws[a-z-]*:bedrock:/.test(lower) && lower.includes("/anthropic."))
      return {
        ok: true,
      };
    if (lower.includes(":application-inference-profile/"))
      return {
        ok: true,
        warn: `Bedrock model "${e}" is an application inference profile; underlying model not verified.`,
      };
    if (lower.includes(":provisioned-model/"))
      return {
        ok: true,
        warn: `Bedrock model "${e}" is a provisioned-throughput ARN; underlying model not verified.`,
      };
    return {
      ok: false,
      reason:
        'expected a Bedrock model ID with the "anthropic." vendor prefix (e.g. anthropic.claude-sonnet-4-5-v1:0) or an inference-profile ARN',
    };
  }
  function LE(e) {
    if (/[/\\?#%\s]/.test(e))
      return {
        ok: false,
        reason: "Vertex model IDs cannot contain '/', '\\', '?', '#', '%' or whitespace",
      };
    if (e.toLowerCase().startsWith("claude-"))
      return {
        ok: true,
      };
    return {
      ok: false,
      reason: 'expected a Vertex Model Garden ID starting with "claude-" (e.g. claude-sonnet-4-5@20250929)',
    };
  }
  function NE(e) {
    if (Vf(e))
      return {
        ok: true,
      };
    return {
      ok: false,
      reason:
        "expected a Foundry deployment name referencing an Anthropic model (e.g. claude-sonnet-4-5). Name deployments to match the underlying model.",
    };
  }
  function sK(e) {
    if (Vf(e))
      return {
        ok: true,
      };
    return {
      ok: false,
      reason: "expected an Anthropic model ID (e.g. claude-sonnet-4-5)",
    };
  }
  function UE(e) {
    if (Vf(e))
      return {
        ok: true,
      };
    return {
      ok: false,
      reason:
        "expected a gateway model route referencing an Anthropic model (e.g. claude-sonnet-4-5, anthropic/claude-*). Name routes to match the underlying model.",
    };
  }
  function aK(e, t) {
    if (e === undefined)
      return {
        ok: true,
      };
    if (zE.TIER_ALIASES.test(t.toLowerCase()))
      return {
        ok: true,
      };
    switch (e) {
      case "anthropic":
        return sK(t);
      case "bedrock":
        return xE(t);
      case "vertex":
        return LE(t);
      case "foundry":
        return NE(t);
      case "gateway":
      case "mantle":
        return UE(t);
    }
  }
  zE._test = {
    isBedrockAnthropicModel: xE,
    isVertexAnthropicModel: LE,
    isFoundryAnthropicModel: NE,
    isGatewayAnthropicModel: UE,
  };
});
//@ chunk-1ny7cxrt.js:658225-658698 cjs-unmatched+string-clue
var gb = x(function (QT) {
  Object.defineProperty(QT, "__esModule", {
    value: true,
  });
  QT.HELPER_ARG_UNSAFE_MESSAGE = QT.HELPER_BREAKOUT_FREE_RE = undefined;
  QT.hasNoHelperBreakoutChars = nee;
  QT.HELPER_BREAKOUT_FREE_RE = /^[^"%\x00-\x1f]+$/;
  function nee(e) {
    return QT.HELPER_BREAKOUT_FREE_RE.test(e);
  }
  QT.HELPER_ARG_UNSAFE_MESSAGE =
    'must be non-empty and must not contain a double quote ("), a percent sign (%) or a control character (in a registry or plist JSON string, write each backslash as \\\\)';
});
//@ chunk-1ny7cxrt.js:658698-663042 cjs-unmatched+string-clue
var Xr = x(function (a$) {
  Object.defineProperty(a$, "__esModule", {
    value: true,
  });
  a$.itemLine =
    a$.replacementOf =
    a$.NO_REPLACEMENT =
    a$.DEPRECATION_CUTOFF_TIME =
    a$.compareCutoff =
    a$.isWholeKeyNotice =
    a$._test =
    a$.DEPRECATION_FINAL_NOTICE_MS =
    a$.BATCH_2026_11 =
    a$.BATCH_2026_09 =
      undefined;
  a$.setDeprecationClock = iee;
  a$.deprecationInstant = ol;
  a$.deprecationDatesParse = see;
  a$.isDeprecationHonoured = bb;
  a$.deprecationApplies = s$;
  a$.applyLegacy = cee;
  a$.deprecationPhase = uee;
  a$.nextDeprecationPhaseChange = dee;
  a$.groupByCutoff = pee;
  a$.formatDeprecationDate = vb;
  a$.consequenceOf = yb;
  a$.cutoffHeading = _ee;
  a$.describeDeprecation = bee;
  a$.deprecationHit = vee;
  a$.BATCH_2026_09 = {
    warnFrom: "2026-09-10",
    supportEnds: "2026-10-07",
  };
  a$.BATCH_2026_11 = {
    warnFrom: "2026-11-03",
    supportEnds: "2026-11-17",
  };
  a$.DEPRECATION_FINAL_NOTICE_MS = 86400000;
  var i$ = /^(\d{4})-(\d{2})-(\d{2})$/;
  var o$ = Symbol.for("@ant/managed-config/deprecationClock");
  var ad = () => {
    var e;
    return ((e = globalThis[o$]) !== null && e !== undefined ? e : Date.now)();
  };
  function iee(e) {
    globalThis[o$] = e === undefined ? undefined : typeof e === "number" ? () => e : e;
  }
  a$._test = {
    CLOCK_PIN: Date.parse("2026-08-25T12:00:00Z"),
  };
  var n$ = new Map();
  function ol(e) {
    let t = n$.get(e);
    if (t !== undefined) return t;
    let match = i$.exec(e);
    if (!match) throw Error(`deprecation dates are YYYY-MM-DD, got "${e}"`);
    let [o, r, s] = [Number(match[1]), Number(match[2]), Number(match[3])];
    let a = Date.UTC(o, r - 1, s, 20, 0, 0);
    let date = new Date(a);
    if (
      Number.isNaN(a) ||
      date.getUTCFullYear() !== o ||
      date.getUTCMonth() !== r - 1 ||
      date.getUTCDate() !== s
    )
      throw Error(`deprecation dates are YYYY-MM-DD, got "${e}"`);
    if (oee(o, r - 1, s)) a -= 3600000;
    n$.set(e, a);
    return a;
  }
  function oee(e, t, n) {
    let o = Date.UTC(e, t, n);
    return o >= r$(e, 2, 8) && o < r$(e, 10, 1);
  }
  function r$(e, t, n) {
    let o = Date.UTC(e, t, n);
    return o + ((7 - new Date(o).getUTCDay()) % 7) * 24 * 60 * 60 * 1000;
  }
  function see(e) {
    try {
      for (let t of [e.warnFrom, e.supportEnds]) if (t !== undefined) ol(t);
      return true;
    } catch (error) {
      return false;
    }
  }
  function bb(e, t = ad()) {
    return e.supportEnds === undefined || t < ol(e.supportEnds);
  }
  var aee = (e) => e === null || e === undefined || e === "";
  var isWholeKeyNotice = (e) => e.match === undefined;
  a$.isWholeKeyNotice = isWholeKeyNotice;
  function s$(e, t, n = {}) {
    return e.match === undefined ? !aee(t) : e.match(t, n);
  }
  function cee(e, t, n = {}, o = ad()) {
    return e.rewrite !== undefined && e.match !== undefined && bb(e, o) && s$(e, t, n) ? e.rewrite(t) : t;
  }
  function uee(e, t = ad()) {
    if (e.supportEnds === undefined) return "admin";
    let n = ol(e.supportEnds);
    if (t >= n) return "expired";
    if (t >= n - a$.DEPRECATION_FINAL_NOTICE_MS) return "final";
    if (e.warnFrom !== undefined && t < ol(e.warnFrom)) return "admin";
    return "notice";
  }
  function dee(e, t = ad()) {
    if (e.supportEnds === undefined) return;
    let n = ol(e.supportEnds);
    let filtered = [
      e.warnFrom !== undefined ? ol(e.warnFrom) : undefined,
      n - a$.DEPRECATION_FINAL_NOTICE_MS,
      n,
    ].filter((r) => r !== undefined && r > t);
    return filtered.length > 0 ? Math.min(...filtered) : undefined;
  }
  var compareCutoff = (e, t) => (e === t ? 0 : e === undefined ? 1 : t === undefined ? -1 : e < t ? -1 : 1);
  a$.compareCutoff = compareCutoff;
  function pee(e, t) {
    let n = new Map();
    for (let o of e) {
      let r = t(o);
      let s = n.get(r);
      if (s === undefined) n.set(r, [o]);
      else s.push(o);
    }
    return [...n.entries()]
      .sort(([o], [r]) => a$.compareCutoff(o, r))
      .map(([o, r]) => ({
        supportEnds: o,
        items: r,
      }));
  }
  var hee = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  function vb(e) {
    let match = i$.exec(e);
    let n = match ? hee[Number(match[2]) - 1] : undefined;
    return match && n ? `${n} ${Number(match[3])}, ${match[1]}` : e;
  }
  a$.DEPRECATION_CUTOFF_TIME = "12:00 PM PT";
  a$.NO_REPLACEMENT = "no longer needed \u2014 safe to remove";
  var mee = (e) => e.charAt(0).toUpperCase() + e.slice(1);
  var replacementOf = (e) => (e.use === undefined ? a$.NO_REPLACEMENT : `use ${e.use}`);
  a$.replacementOf = replacementOf;
  var itemLine = (e, t = (n) => n) =>
    e.use === undefined ? `${t(e.path)}: ${a$.NO_REPLACEMENT}` : `${t(e.path)} \u2192 ${e.use}`;
  a$.itemLine = itemLine;
  function yb(e, t) {
    let n =
      e.supportEnds === undefined
        ? e.effect
        : t
          ? `while it is present, ${e.effect}`
          : `if it is still present after that, ${e.effect}`;
    return mee(n).replace(/[.]?$/, ".");
  }
  function _ee(e, t) {
    if (e === undefined) return "Deprecated with no end date (keeps working)";
    return `${t ? "Stopped" : "Stops"} working ${vb(e)} (${a$.DEPRECATION_CUTOFF_TIME})`;
  }
  function bee(e, t = ad()) {
    if (e.supportEnds === undefined)
      return `${e.path} is deprecated; ${a$.replacementOf(e)}. ${yb(e, false)}`;
    let n = vb(e.supportEnds);
    let o = !bb(e, t);
    return `${e.path} ${o ? `has not been accepted since ${n}` : `is deprecated and stops being accepted on ${n}`} (${a$.DEPRECATION_CUTOFF_TIME}); ${a$.replacementOf(e)}. ${yb(e, o)}`;
  }
  function vee(key, t) {
    return {
      key,
      path: t.path,
      ...(t.use !== undefined
        ? {
            use: t.use,
          }
        : {}),
      effect: t.effect,
      ...(t.warnFrom !== undefined
        ? {
            warnFrom: t.warnFrom,
          }
        : {}),
      ...(t.supportEnds !== undefined
        ? {
            supportEnds: t.supportEnds,
          }
        : {}),
    };
  }
});
//@ chunk-1ny7cxrt.js:663042-670941 cjs-unmatched+string-clue
var gr = x(function (v$) {
  Object.defineProperty(v$, "__esModule", {
    value: true,
  });
  v$.EGRESS_ENTRY_GRAMMAR =
    v$.DEPENDENCY_INSTALL_DOMAINS =
    v$.PYTHON_EXTENSION_RUNTIME_HOSTS =
    v$.AWS_REGION_RE =
    v$.GCP_PROJECT_RE =
    v$.GCP_REGION_RE =
    v$.EGRESS_NOT_PROBED =
    v$.CREDENTIAL_FAMILIES =
    v$.VERTEX_AUTH_HOSTS =
    v$.DATADOG_INTAKE_HOSTS =
    v$.GOOGLE_IAMCRED_HOST =
    v$.GOOGLE_STS_HOST =
    v$.GOOGLE_OAUTH2_HOST =
    v$.GOOGLE_ACCOUNTS_HOST =
    v$.FOUNDRY_RESOURCE_RE =
    v$.MICROSOFT_LOGIN_HOST =
    v$.SENTRY_INGEST_HOST =
    v$.SPELLCHECK_DICTIONARY_WILDCARD =
    v$.SPELLCHECK_DICTIONARY_HOST =
    v$.SENTRY_WILDCARD_HOST =
    v$.ANTHROPIC_ASSETS_HOST =
    v$.MCP_APP_SANDBOX_BASE_HOST =
    v$.MCP_APP_SANDBOX_WILDCARD_HOST =
    v$.FRAME_ARTIFACT_CONTENT_HOSTS =
    v$.ARTIFACT_IFRAME_HOST =
    v$.GSTATIC_WILDCARD =
    v$.FAVICON_PROXY_HOST =
    v$.PLATFORM_CLAUDE_HOST =
    v$.GCS_SIGNED_URL_HOST =
    v$.CLAUDE_AI_HOST =
    v$.ANTHROPIC_API_HOST =
    v$.UPDATE_FEED_HOST =
    v$.VM_BUNDLE_HOST =
    v$.MINIMAL_EGRESS_DOMAINS =
      undefined;
  v$.isAnthropicHost = Uee;
  v$.isAnthropicFirstPartyHost = Fee;
  v$.rawAuthority = Eb;
  v$.credentialFamilyInAuthority = u$;
  v$.safeHostname = Kee;
  v$.egressAddress = Zee;
  v$.isEgressNotProbed = qee;
  v$.egressHostPort = Gee;
  v$.splitEgressAddress = f$;
  v$.vertexInferenceHost = Wee;
  v$.bedrockRuntimeHost = p$;
  v$.mantleRuntimeHost = Yee;
  v$.foundryResourceHost = Jee;
  v$.bedrockControlPlaneHost = h$;
  v$.awsSsoOidcHost = g$;
  v$.awsSsoPortalHost = _$;
  v$.bedrockSsoHosts = b$;
  v$.bedrockHosts = Xee;
  v$.parseEgressHostEntry = Ib;
  v$.stripEgressEntryPort = nte;
  v$.dropPortScopedEgressEntries = rte;
  v$.MINIMAL_EGRESS_DOMAINS = ["*.anthropic.com", "anthropic.com", "claude.com", "*.claude.com"];
  v$.VM_BUNDLE_HOST = "downloads.claude.ai";
  v$.UPDATE_FEED_HOST = "releases.claude.com";
  v$.ANTHROPIC_API_HOST = "api.anthropic.com";
  v$.CLAUDE_AI_HOST = "claude.ai";
  v$.GCS_SIGNED_URL_HOST = "storage.googleapis.com";
  function Uee(e) {
    let lower = e.replace(/\.$/, "").toLowerCase();
    return lower === "anthropic.com" || lower.endsWith(".anthropic.com");
  }
  var zee = ["anthropic.com", "claude.ai", "claude.com"];
  function Fee(e) {
    let lower = e.replace(/\.$/, "").toLowerCase();
    return zee.some((n) => lower === n || lower.endsWith(`.${n}`));
  }
  v$.PLATFORM_CLAUDE_HOST = "platform.claude.com";
  v$.FAVICON_PROXY_HOST = "www.google.com";
  v$.GSTATIC_WILDCARD = "*.gstatic.com";
  v$.ARTIFACT_IFRAME_HOST = "www.claudeusercontent.com";
  v$.FRAME_ARTIFACT_CONTENT_HOSTS = [
    "*.frame.claudeusercontent.com",
    "*.frame.staging.claudeusercontent.com",
  ];
  v$.MCP_APP_SANDBOX_WILDCARD_HOST = "*.claudemcpcontent.com";
  v$.MCP_APP_SANDBOX_BASE_HOST = "sandbox.claudemcpcontent.com";
  v$.ANTHROPIC_ASSETS_HOST = "assets.claude.ai";
  v$.SENTRY_WILDCARD_HOST = "*.sentry.io";
  v$.SPELLCHECK_DICTIONARY_HOST = "redirector.gvt1.com";
  v$.SPELLCHECK_DICTIONARY_WILDCARD = "*.gvt1.com";
  v$.SENTRY_INGEST_HOST = "o1158394.ingest.us.sentry.io";
  v$.MICROSOFT_LOGIN_HOST = "login.microsoftonline.com";
  v$.FOUNDRY_RESOURCE_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;
  v$.GOOGLE_ACCOUNTS_HOST = "accounts.google.com";
  v$.GOOGLE_OAUTH2_HOST = "oauth2.googleapis.com";
  v$.GOOGLE_STS_HOST = "sts.googleapis.com";
  v$.GOOGLE_IAMCRED_HOST = "iamcredentials.googleapis.com";
  v$.DATADOG_INTAKE_HOSTS = [
    "browser-intake-datadoghq.com",
    "browser-intake-us3-datadoghq.com",
    "browser-intake-us5-datadoghq.com",
    "browser-intake-ap1-datadoghq.com",
    "browser-intake-ap2-datadoghq.com",
    "browser-intake-datadoghq.eu",
    "browser-intake-ddog-gov.com",
  ];
  v$.VERTEX_AUTH_HOSTS = [
    v$.GOOGLE_OAUTH2_HOST,
    v$.GOOGLE_STS_HOST,
    v$.GOOGLE_ACCOUNTS_HOST,
    v$.GOOGLE_IAMCRED_HOST,
  ];
  function Eb(e) {
    var t;
    var n;
    let replaced = e.replace(/[\t\n\r]/g, "");
    let r = 0;
    let s = replaced.length;
    while (r < s && replaced.charCodeAt(r) <= 32) r++;
    while (s > r && replaced.charCodeAt(s - 1) <= 32) s--;
    let sliced = replaced.slice(r, s);
    return (n =
      (t = /^(?:https?|wss?):[/\\]*([^/?#]*)/i.exec(sliced)) !== null && t !== undefined
        ? t
        : /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i.exec(sliced)) === null || n === undefined
      ? undefined
      : n[1];
  }
  var rs = "(?<![A-Za-z0-9_])";
  var kb = "(?=[A-Za-z0-9_-]{64})";
  var sl = "[A-Za-z0-9_-]";
  var Ab = [
    ["anthropic", `${rs}${kb}sk-ant-`, true],
    ["openai", `${rs}${kb}sk-(?:proj|svcacct|admin)-`, true],
    ["openrouter", `${rs}${kb}sk-or-v1-`, true],
    ["slack user", `${rs}(?=[A-Za-z0-9-]{64})xoxp-`, true],
    ["slack bot", `${rs}xoxb-\\d{10,}-\\d{10,}-[A-Za-z0-9]{24}(?![A-Za-z0-9-])`, true],
    ["github", `${rs}gh[opusr]_[A-Za-z0-9]{36,}`, true],
    ["github fine-grained", `${rs}github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59}`, true],
    ["stripe", `${rs}[sr]k_(?:live|test)_[A-Za-z0-9]{15,}`, true],
    ["google", `${rs}AIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])`, false],
    [
      "signed token",
      `${rs}eyJ(?:${sl}{9,60}\\.eyJ${sl}{7,60}\\.${sl}{10}|${sl}{9,60}(?:\\.${sl}{0,63}){0,3}\\.${sl}{64}|${sl}{61})`,
      false,
    ],
  ];
  var mapped = Ab.map(([e, t]) => [e, new RegExp(t)]);
  var mapped_2 = Ab.filter(([, , e]) => e).map(([e, t]) => [e, new RegExp(t, "i")]);
  v$.CREDENTIAL_FAMILIES = Ab.map(([e]) => e);
  function u$(e) {
    var t;
    var n;
    let o = Eb(e) === undefined ? `https://${e}` : e;
    let r = Eb(o);
    if (r === undefined) return;
    let s = (t = mapped.find(([, l]) => l.test(r))) === null || t === undefined ? undefined : t[0];
    if (s !== undefined) return s;
    let a;
    try {
      a = new URL(o).hostname;
    } catch (error) {
      return;
    }
    return (n = mapped_2.find(([, l]) => l.test(a))) === null || n === undefined ? undefined : n[0];
  }
  function d$(e) {
    if (typeof e !== "string" || e === "") return;
    let t = /^[a-z][a-z0-9+.-]*:\/\//i.test(e) ? e : `https://${e}`;
    if (u$(t) !== undefined) return;
    try {
      return new URL(t);
    } catch (error) {
      return;
    }
  }
  function Kee(e) {
    var t;
    return ((t = d$(e)) === null || t === undefined ? undefined : t.hostname) || undefined;
  }
  var Pb = "http://";
  function Zee(e) {
    let t = d$(e);
    if (!(t === null || t === undefined ? undefined : t.host)) return;
    return t.protocol === "http:" ? `${Pb}${t.host}` : t.host;
  }
  v$.EGRESS_NOT_PROBED = {
    wildcard: "wildcard",
    ipLiteral: "ip-literal",
    plainHttpViaProxy: "plain http via proxy",
    blockedAddress: "link-local or cloud-metadata address",
  };
  var Vee = new Set(Object.values(v$.EGRESS_NOT_PROBED));
  function qee(e) {
    return e !== undefined && Vee.has(e);
  }
  function Gee(e) {
    let { scheme, host } = f$(e);
    return scheme === "http" && !/:\d+$/.test(host) ? `${host}:80` : host;
  }
  function f$(e) {
    return e.startsWith(Pb)
      ? {
          scheme: "http",
          host: e.slice(Pb.length),
        }
      : {
          scheme: "https",
          host: e,
        };
  }
  v$.GCP_REGION_RE = /^([a-z]+-[a-z]+\d{1,2}|global|eu|us)$/;
  v$.GCP_PROJECT_RE = /^[a-z0-9][a-z0-9.:-]*$/;
  function Wee(e) {
    return e === "global"
      ? "aiplatform.googleapis.com"
      : e === "eu" || e === "us"
        ? `aiplatform.${e}.rep.googleapis.com`
        : `${e}-aiplatform.googleapis.com`;
  }
  function p$(e) {
    return `bedrock-runtime${e.startsWith("us-gov-") ? "-fips" : ""}.${e}.amazonaws.com`;
  }
  function Yee(e) {
    return `bedrock-mantle.${e}.api.aws`;
  }
  function Jee(e) {
    return `${e}.services.ai.azure.com`;
  }
  function h$(e) {
    return `bedrock${e.startsWith("us-gov-") ? "-fips" : ""}.${e}.amazonaws.com`;
  }
  v$.AWS_REGION_RE = /^[a-z]{2,}(-[a-z]+)+-\d{1,2}$/;
  function g$(e) {
    return `oidc.${e}.amazonaws.com`;
  }
  function _$(e) {
    return `portal.sso.${e}.amazonaws.com`;
  }
  function b$(e) {
    return [_$(e), g$(e)];
  }
  function Xee(e, t, n = {}) {
    var o;
    let r = (o = n.inferenceHost) !== null && o !== undefined ? o : p$(e);
    let s = n.includeControlPlane === false ? [] : [h$(e)];
    if (t) return [r, ...s];
    return [r, ...s, "sts.amazonaws.com", `sts.${e}.amazonaws.com`, ...b$(e)];
  }
  v$.PYTHON_EXTENSION_RUNTIME_HOSTS = [
    "github.com",
    "objects.githubusercontent.com",
    "pypi.org",
    "files.pythonhosted.org",
  ];
  v$.DEPENDENCY_INSTALL_DOMAINS = [
    "registry.npmjs.org",
    "npmjs.com",
    "www.npmjs.com",
    "npmjs.org",
    "www.npmjs.org",
    "yarnpkg.com",
    "registry.yarnpkg.com",
    "pypi.org",
    "files.pythonhosted.org",
    "pythonhosted.org",
    "github.com",
    "objects.githubusercontent.com",
    "archive.ubuntu.com",
    "security.ubuntu.com",
    "crates.io",
    "index.crates.io",
    "static.crates.io",
    "playwright.download.prss.microsoft.com",
    "cdn.playwright.dev",
  ];
  var Qee = /^[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/i;
  var ete = /^[1-9][0-9]{0,4}$/;
  function tte(e) {
    if (e === "localhost") return true;
    let t = e.startsWith("*.") ? e.slice(2) : e;
    return Qee.test(t) && t.includes(".");
  }
  v$.EGRESS_ENTRY_GRAMMAR =
    "`*`, `localhost`, `host[:port]`, or `*.host[:port]` (port 1-65535; no port on bare `*`; no scheme, path, or IPv6 literal)";
  function Ib(e) {
    let t = e;
    let n;
    let index = e.lastIndexOf(":");
    if (index !== -1) {
      let sliced = e.slice(index + 1);
      if (!ete.test(sliced)) return null;
      n = Number(sliced);
      if (n > 65535) return null;
      t = e.slice(0, index);
    }
    if (t === "*")
      return n === undefined
        ? {
            host: t,
          }
        : null;
    if (!tte(t)) return null;
    let host = t.toLowerCase();
    return n === undefined
      ? {
          host,
        }
      : {
          host,
          port: n,
        };
  }
  function nte(e) {
    var t;
    var n;
    return (n = (t = Ib(e)) === null || t === undefined ? undefined : t.host) !== null && n !== undefined
      ? n
      : e;
  }
  function rte(e) {
    return e === null || e === undefined
      ? undefined
      : e.filter((t) => {
          let n = Ib(t);
          return n ? n.port === undefined : !t.includes(":");
        });
  }
});
//@ chunk-1ny7cxrt.js:670941-672084 cjs-unmatched+string-clue
var oa = x(function (C$) {
  Object.defineProperty(C$, "__esModule", {
    value: true,
  });
  C$.SIGN_IN_CREDENTIAL_KINDS =
    C$.KIND_PRECEDENCE =
    C$.INFERENCE_CREDENTIAL_KINDS =
    C$.isAnthropicOAuthToken =
    C$.getProviderLabel =
    C$.DEFAULT_INFERENCE_PROVIDER =
    C$.PROVIDERS =
    C$.PROVIDER_DISPLAY =
      undefined;
  C$.legacyCredentialKindAliases = nne;
  C$.legacyCredentialKindAlias = rne;
  C$.PROVIDER_DISPLAY = {
    gateway: "Gateway",
    anthropic: "Claude API",
    bedrock: "Bedrock",
    mantle: "Bedrock Mantle",
    vertex: "Vertex AI",
    foundry: "Foundry",
  };
  C$.PROVIDERS = Object.keys(C$.PROVIDER_DISPLAY);
  C$.DEFAULT_INFERENCE_PROVIDER = "gateway";
  var getProviderLabel = (e) => (e ? C$.PROVIDER_DISPLAY[e] : "");
  C$.getProviderLabel = getProviderLabel;
  var isAnthropicOAuthToken = (e) => e.startsWith("sk-ant-oat");
  C$.isAnthropicOAuthToken = isAnthropicOAuthToken;
  C$.INFERENCE_CREDENTIAL_KINDS = [
    "static",
    "helper-script",
    "interactive",
    "vendor-profile",
    "workforce",
    "external-idp",
  ];
  C$.KIND_PRECEDENCE = [
    "workforce",
    "external-idp",
    "interactive",
    "vendor-profile",
    "helper-script",
    "static",
  ];
  C$.SIGN_IN_CREDENTIAL_KINDS = ["interactive", "workforce", "external-idp"];
  var I$ = new Map([["oauth", "interactive"]]);
  function nne(e) {
    return e === "vertex" ? I$ : new Map();
  }
  function rne(e, t) {
    return e === undefined || e === "vertex" ? I$.get(t) : undefined;
  }
});
//@ chunk-1ny7cxrt.js:672084-688138 cjs-unmatched+string-clue
var yt = x(function (aa) {
  Object.defineProperty(aa, "__esModule", {
    value: true,
  });
  aa.ZodKind =
    aa.LONG_DESCRIPTION_MAX_LENGTH =
    aa.SHORT_DESCRIPTION_MAX_LENGTH =
    aa.TYPED_SLICE_READERS =
    aa.READER_FACTS =
    aa.CONFIG_READERS =
    aa.PROVIDERS =
    aa.PROVIDER_DISPLAY =
    aa.KIND_PRECEDENCE =
    aa.INFERENCE_CREDENTIAL_KINDS =
    aa.getProviderLabel =
    aa.DEFAULT_INFERENCE_PROVIDER =
      undefined;
  aa.inExternalBuild = pne;
  aa.readerLegend = hne;
  aa.isRemoteOnly = mne;
  aa.intakeReportKeepsValue = gne;
  aa.effectiveVisibility = $$;
  aa.compareDesktopVersions = R$;
  aa.min3pAvailableInVersion = yne;
  aa.isUnreleasedVersion = ld;
  aa.supportEntries = $b;
  aa.isFullyUnreleasedSupport = _ne;
  aa.isReleasedFor3p = bne;
  aa.presetForItem = vne;
  aa.shortDescription = wne;
  aa.longDescription = One;
  aa.deriveSubFieldControlType = D$;
  aa.nestedColumnsOf = M$;
  aa.surfaceGrantFor = kne;
  aa.runtimeDefault = Ene;
  aa.displayDefault = Pne;
  aa.annotate = fc;
  aa.annotationsOf = Ui;
  aa.filePath = Ane;
  aa.folderPath = Ine;
  aa.urlString = Cne;
  aa.globPattern = Tne;
  aa.redact = $ne;
  aa.redactPolicyOf = Rne;
  aa.maxLengthOf = Dne;
  aa.pathKindOf = Mne;
  aa.acceptsWildcard = jne;
  aa.isUrlString = xne;
  aa.isNotGatewayServable = Lne;
  aa.isHybridExcluded = Nne;
  aa.readersOf = x$;
  aa.readersDeclared = Une;
  aa.isReadBy = L$;
  aa.isHybridDerived = zne;
  aa.isHybridLoopback = Fne;
  aa.remotePolicyOf = Bne;
  aa.field = Hne;
  aa.offDeviceExecutionTargets = Kne;
  aa.lazySchema = U$;
  aa.isLazySchema = Vne;
  aa.isLazySchemaBuilt = qne;
  aa.fieldMetaForNode = cd;
  aa.subfield = Gne;
  aa.subfieldMetaForNode = lc;
  aa.isUnreleasedMember = Wne;
  aa.variantMeta = Yne;
  aa.variantMetaForNode = Jne;
  aa.localExecSubfieldKeys = Xne;
  aa.openEnumItemsOf = Qne;
  aa.consentRequiringSubfieldKeys = ere;
  aa.hybridOnlySubfieldKeys = tre;
  aa.zodKind = un;
  aa.unwrapStep = cc;
  aa.unwrapZod = Br;
  aa.stripDefaults = is;
  aa.pipeSidesOf = rre;
  aa.unionOptionsOf = Zh;
  aa.arrayElementOf = pc;
  aa.arrayLengthBoundsOf = ire;
  aa.recordKeyTypeOf = ore;
  aa.recordValueTypeOf = sre;
  aa.numberIsInt = are;
  aa.numberBoundsOf = lre;
  aa.findDefaultValue = cre;
  aa.discriminatorArmsOf = dre;
  aa.discriminatorKeyOf = fre;
  aa.literalValueOf = pre;
  aa.dropUndefined = hre;
  aa.enumOptionsOf = hc;
  aa.recordValueEnumOf = H$;
  aa.subFieldsOf = Db;
  var uc = require_v3();
  var dc = oa();
  Object.defineProperty(aa, "DEFAULT_INFERENCE_PROVIDER", {
    enumerable: true,
    get: function () {
      return dc.DEFAULT_INFERENCE_PROVIDER;
    },
  });
  Object.defineProperty(aa, "getProviderLabel", {
    enumerable: true,
    get: function () {
      return dc.getProviderLabel;
    },
  });
  Object.defineProperty(aa, "INFERENCE_CREDENTIAL_KINDS", {
    enumerable: true,
    get: function () {
      return dc.INFERENCE_CREDENTIAL_KINDS;
    },
  });
  Object.defineProperty(aa, "KIND_PRECEDENCE", {
    enumerable: true,
    get: function () {
      return dc.KIND_PRECEDENCE;
    },
  });
  Object.defineProperty(aa, "PROVIDER_DISPLAY", {
    enumerable: true,
    get: function () {
      return dc.PROVIDER_DISPLAY;
    },
  });
  Object.defineProperty(aa, "PROVIDERS", {
    enumerable: true,
    get: function () {
      return dc.PROVIDERS;
    },
  });
  aa.CONFIG_READERS = ["desktop", "m365", "code"];
  aa.READER_FACTS = {
    desktop: {
      name: "Claude Desktop",
      servedSchemaVersion: 2,
      served: true,
      readsBootstrap: true,
    },
    m365: {
      name: "the Claude add-in for Microsoft 365",
      servedSchemaVersion: 2,
      served: true,
      readsBootstrap: true,
      typePrefix: "M365",
    },
    code: {
      name: "the Claude Code CLI signed in to the organization by itself",
      servedSchemaVersion: 2,
      served: false,
      readsBootstrap: false,
      typePrefix: "ClaudeCode",
      inExternalBuild: true,
    },
  };
  aa.TYPED_SLICE_READERS = aa.CONFIG_READERS.filter((e) => "typePrefix" in aa.READER_FACTS[e]);
  function pne(e) {
    return aa.READER_FACTS[e].inExternalBuild === true;
  }
  function hne(e) {
    return e.map((t) => `\`${t}\` = ${aa.READER_FACTS[t].name}`).join(", ");
  }
  var Tb = ["desktop"];
  function mne(e) {
    var t;
    let remotePolicy = e.remotePolicy;
    return (
      (remotePolicy === null || remotePolicy === undefined ? undefined : remotePolicy.type) ===
        "remote-only" ||
      ((t = remotePolicy === null || remotePolicy === undefined ? undefined : remotePolicy.hybrid) === null ||
      t === undefined
        ? undefined
        : t.scope) === "only" ||
      !L$(e, "desktop")
    );
  }
  function gne(e) {
    return e.kind === "clamp" || e.kind === "unknown" || e.kind === "deprecated";
  }
  function $$(e) {
    var t;
    var n;
    return (n = (t = e.support) === null || t === undefined ? undefined : t.visibility) !== null &&
      n !== undefined
      ? n
      : "public";
  }
  function R$(e, t) {
    var n;
    var o;
    let r = (l) =>
      l.split(".").map((c) => {
        let u = Number(c);
        return Number.isFinite(u) ? u : 0;
      });
    let s = r(e);
    let a = r(t);
    for (let j = 0; j < Math.max(s.length, a.length); j++) {
      let c =
        ((n = s[j]) !== null && n !== undefined ? n : 0) - ((o = a[j]) !== null && o !== undefined ? o : 0);
      if (c !== 0) return c < 0 ? -1 : 1;
    }
    return 0;
  }
  function yne(e) {
    return (Array.isArray(e) ? e : [e])
      .filter((n) => n.scopes.includes("3p"))
      .map((n) => n.availableInVersion)
      .sort(R$)[0];
  }
  function ld(availableInVersion) {
    return availableInVersion === "@next";
  }
  function $b(e) {
    let enabled = e.support.enabled;
    return Array.isArray(enabled) ? enabled : [enabled];
  }
  function _ne(e) {
    let t = $b(e);
    return t.length > 0 && t.every((n) => ld(n.availableInVersion));
  }
  function bne(e) {
    return $b(e).some((t) => t.scopes.includes("3p") && !ld(t.availableInVersion));
  }
  function vne(e, t, n) {
    return e === null || e === undefined
      ? undefined
      : e.find((o) =>
          Object.entries(o.item).every(
            ([key, value]) => key === n || (typeof value === "object" && value !== null) || t[key] === value,
          ),
        );
  }
  aa.SHORT_DESCRIPTION_MAX_LENGTH = 160;
  aa.LONG_DESCRIPTION_MAX_LENGTH = 2000;
  function wne(text, t) {
    return {
      text,
      ...t,
    };
  }
  function One(text, t) {
    return {
      text,
      ...t,
    };
  }
  function D$(e, t) {
    if (t.control) return t.control;
    let n = un(Br(e));
    if (n === aa.ZodKind.ZodBoolean) return "bool";
    if (n === aa.ZodKind.ZodNumber) return "int";
    if (n === aa.ZodKind.ZodEnum || n === aa.ZodKind.ZodLiteral) return "select";
    if (n === aa.ZodKind.ZodRecord) return "record";
    if (n === aa.ZodKind.ZodDiscriminatedUnion) return "union";
    if (n === aa.ZodKind.ZodArray && j$(e)) return "enumArray";
    if (n === aa.ZodKind.ZodArray || n === aa.ZodKind.ZodObject) {
      if (M$(e).length === 0) return "json";
      return n === aa.ZodKind.ZodArray ? "objectList" : "object";
    }
    return "text";
  }
  function M$(e) {
    var t;
    let n = Br(e);
    return Db((t = pc(n)) !== null && t !== undefined ? t : n);
  }
  function j$(e) {
    let t = pc(Br(e));
    return t && hc(t);
  }
  var Sne = {
    chat: false,
    fileAnalysis: false,
    cowork: false,
  };
  function kne(e, t) {
    var n;
    if (t === undefined || t === null || t === "") return;
    return (n = typeof t === "string" && Object.hasOwn(e, t) ? e[t] : undefined) !== null && n !== undefined
      ? n
      : Sne;
  }
  function Ene(e) {
    let t = e.default;
    return t === undefined || typeof t === "object" ? undefined : t;
  }
  function Pne(e) {
    let t = e.default;
    return t !== undefined && typeof t === "object" ? t.displayOnly : t;
  }
  function fc(e, t) {
    let n = e;
    n.__antAnn = {
      ...n.__antAnn,
      ...t,
    };
    return e;
  }
  function Ui(e) {
    let t = {};
    let n = new Set();
    let o = (r) => {
      if (n.has(r)) return;
      n.add(r);
      let __antAnn = r.__antAnn;
      if (__antAnn) {
        for (let key of Object.keys(__antAnn)) if (t[key] === undefined) t[key] = __antAnn[key];
      }
      if (un(r) === aa.ZodKind.ZodPipeline) {
        let l = Xn(r);
        let c = cc(r);
        if (c !== r) o(c);
        for (let u of [l.in, l.out]) if (u && u !== c) o(u);
        return;
      }
      let a = cc(r);
      if (a !== r) o(a);
    };
    o(e);
    return t;
  }
  function Ane(e = uc.z.string()) {
    return fc(e, {
      pathKind: "file",
    });
  }
  function Ine(e = uc.z.string()) {
    return fc(e, {
      pathKind: "folder",
    });
  }
  function Cne(e) {
    return fc(e, {
      url: true,
    });
  }
  function Tne(e) {
    return fc(e, {
      glob: true,
    });
  }
  function $ne(e, redact = "drop") {
    return fc(e, {
      redact,
    });
  }
  function Rne(e) {
    return Ui(e).redact;
  }
  function Dne(e) {
    var t;
    let n = Br(e);
    if (un(n) !== aa.ZodKind.ZodString) return;
    return (t = n.maxLength) !== null && t !== undefined ? t : undefined;
  }
  function Mne(e) {
    let pathKind = Ui(e).pathKind;
    if (pathKind) return pathKind;
    let n = Br(e);
    let o = pc(n);
    return o ? Ui(o).pathKind : undefined;
  }
  function jne(e) {
    return Ui(e).glob === true;
  }
  function xne(e) {
    return Ui(e).url === true;
  }
  function Lne(e) {
    return Ui(e).gatewayServable === false;
  }
  function Nne(e) {
    var t;
    var n;
    var o;
    var r;
    var s;
    return (
      ((o =
        (n = (t = cd(e)) === null || t === undefined ? undefined : t.remotePolicy) === null || n === undefined
          ? undefined
          : n.hybrid) === null || o === undefined
        ? undefined
        : o.scope) === "excluded" ||
      ((s = (r = Ui(e).remotePolicy) === null || r === undefined ? undefined : r.hybrid) === null ||
      s === undefined
        ? undefined
        : s.scope) === "excluded"
    );
  }
  function x$(e) {
    var t;
    return (t = e.readers) !== null && t !== undefined ? t : Tb;
  }
  function Une(e) {
    let readers = e.readers;
    return (
      readers !== undefined &&
      !(readers.length === Tb.length && readers.every((reader, o) => reader === Tb[o]))
    );
  }
  function L$(e, t) {
    return t === "all" || x$(e).includes(t);
  }
  function zne(e) {
    var t;
    var n;
    var o;
    return (
      ((o =
        (n = (t = cd(e)) === null || t === undefined ? undefined : t.remotePolicy) === null || n === undefined
          ? undefined
          : n.hybrid) === null || o === undefined
        ? undefined
        : o.derived) === true
    );
  }
  function Fne(e) {
    var t;
    var n;
    var o;
    return (
      ((o =
        (n = (t = cd(e)) === null || t === undefined ? undefined : t.remotePolicy) === null || n === undefined
          ? undefined
          : n.hybrid) === null || o === undefined
        ? undefined
        : o.loopback) === true
    );
  }
  function Bne(e) {
    var t;
    var n;
    var o;
    var r;
    return (r =
      (n = (t = cd(e)) === null || t === undefined ? undefined : t.remotePolicy) !== null && n !== undefined
        ? n
        : (o = lc(e)) === null || o === undefined
          ? undefined
          : o.remotePolicy) !== null && r !== undefined
      ? r
      : Ui(e).remotePolicy;
  }
  function Hne(e, t) {
    e.__antFieldMeta = t;
    let executionTarget = t.support.executionTarget;
    if (executionTarget !== undefined && executionTarget !== "desktop") N$.add(executionTarget);
    return e;
  }
  var N$ = new Set();
  function Kne() {
    return [...N$];
  }
  function U$(e) {
    let t = uc.z.lazy(() => {
      let n = e();
      t.__antLazyBuilt = true;
      return n;
    });
    return t;
  }
  function z$(e) {
    let t = e;
    for (;;) {
      if (un(t) === aa.ZodKind.ZodLazy) return t;
      let n = B$(t);
      if (n === t) return;
      t = n;
    }
  }
  function Vne(e) {
    return z$(e) !== undefined;
  }
  function qne(e) {
    let t = z$(e);
    return (t === null || t === undefined ? undefined : t.__antLazyBuilt) === true;
  }
  function F$(e) {
    return e._zod.innerType;
  }
  function cd(e) {
    return e === null || e === undefined ? undefined : e.__antFieldMeta;
  }
  function Gne(e, t) {
    var n;
    var o;
    let { short, long } = t.description;
    e.__antSubFieldMeta = {
      ...t,
      description: {
        short: {
          ...short,
          docsOnly: (n = short.docsOnly) !== null && n !== undefined ? n : true,
        },
        ...(long
          ? {
              long: {
                ...long,
                docsOnly: (o = long.docsOnly) !== null && o !== undefined ? o : true,
              },
            }
          : {}),
      },
    };
    return e;
  }
  function lc(e) {
    return e === null || e === undefined ? undefined : e.__antSubFieldMeta;
  }
  function Wne(e) {
    var t;
    var n;
    if (
      ld(
        (n = (t = lc(e)) === null || t === undefined ? undefined : t.support) === null || n === undefined
          ? undefined
          : n.availableInVersion,
      )
    )
      return true;
    let o = Br(e);
    if (un(o) !== aa.ZodKind.ZodObject) return false;
    return Object.values(o.shape).some((r) => {
      var s;
      var a;
      var l;
      var c;
      let u = r;
      return (
        ((s = hc(u)) === null || s === undefined ? undefined : s.length) === 1 &&
        ld(
          (c =
            (l = (a = lc(u)) === null || a === undefined ? undefined : a.support) === null || l === undefined
              ? undefined
              : l.availableInVersion) !== null && c !== undefined
            ? c
            : Ui(u).availableInVersion,
        )
      );
    });
  }
  function Yne(e, __antVariantMeta) {
    e.__antVariantMeta = __antVariantMeta;
    return e;
  }
  function Jne(e) {
    return e === null || e === undefined ? undefined : e.__antVariantMeta;
  }
  function Rb(e, t) {
    let n = new Set();
    let o = (r, s) => {
      var a;
      let l = Br(r);
      let c = un(l);
      if (c === aa.ZodKind.ZodObject)
        for (let [key, value] of Object.entries(l.shape)) {
          let h = value;
          let m = s ? `${s}.${key}` : key;
          let remotePolicy = (a = lc(h)) === null || a === undefined ? undefined : a.remotePolicy;
          if (remotePolicy && t(remotePolicy)) n.add(m);
          o(h, m);
        }
      else if (c === aa.ZodKind.ZodUnion || c === aa.ZodKind.ZodDiscriminatedUnion)
        for (let u of Zh(l)) o(u, s);
      else if (c === aa.ZodKind.ZodArray) {
        let u = pc(l);
        if (u) o(u, s);
      }
    };
    o(e, "");
    return n;
  }
  function Xne(e) {
    return Rb(e, (t) => t.type === "remote-disabled");
  }
  function Qne(e) {
    let t = pc(Br(e));
    let openEnum = t ? Ui(t).openEnum : undefined;
    return openEnum
      ? {
          anyOf: [
            {
              type: "string",
              enum: [...openEnum],
            },
            {
              type: "string",
            },
          ],
          description:
            "Known values are listed; a client ignores a value it does not know, so a newer client's vocabulary is storable as is.",
        }
      : undefined;
  }
  function ere(e) {
    return Rb(e, (t) => t.requiresUserConsent === true);
  }
  function tre(e) {
    return Rb(e, (t) => {
      var n;
      return ((n = t.hybrid) === null || n === undefined ? undefined : n.scope) === "only";
    });
  }
  aa.ZodKind = {
    ZodString: "string",
    ZodNumber: "number",
    ZodBoolean: "boolean",
    ZodUndefined: "undefined",
    ZodNever: "never",
    ZodLiteral: "literal",
    ZodEnum: "enum",
    ZodObject: "object",
    ZodArray: "array",
    ZodRecord: "record",
    ZodUnion: "union",
    ZodDiscriminatedUnion: "discriminatedUnion",
    ZodOptional: "optional",
    ZodDefault: "default",
    ZodPrefault: "prefault",
    ZodNullable: "nullable",
    ZodCatch: "catch",
    ZodReadonly: "readonly",
    ZodPipeline: "pipe",
    ZodTransform: "transform",
    ZodLazy: "lazy",
  };
  function Xn(e) {
    return e._zod.def;
  }
  function un(e) {
    var t;
    let def =
      (t = e === null || e === undefined ? undefined : e._zod) === null || t === undefined
        ? undefined
        : t.def;
    if (!(def === null || def === undefined ? undefined : def.type)) return;
    if (def.type === aa.ZodKind.ZodUnion && def.discriminator !== undefined)
      return aa.ZodKind.ZodDiscriminatedUnion;
    return def.type;
  }
  var nre = new Set([
    aa.ZodKind.ZodOptional,
    aa.ZodKind.ZodDefault,
    aa.ZodKind.ZodPrefault,
    aa.ZodKind.ZodNullable,
    aa.ZodKind.ZodCatch,
    aa.ZodKind.ZodReadonly,
  ]);
  function cc(e) {
    if (un(e) === aa.ZodKind.ZodLazy) return F$(e);
    return B$(e);
  }
  function B$(e) {
    var t;
    let n = un(e);
    if (n && nre.has(n)) return (t = Xn(e).innerType) !== null && t !== undefined ? t : e;
    if (n === aa.ZodKind.ZodPipeline) {
      let o = Xn(e);
      if (!o.in || !o.out) return e;
      return un(o.out) === aa.ZodKind.ZodTransform ? o.in : o.out;
    }
    return e;
  }
  function Br(e) {
    let t = e;
    for (;;) {
      let n = cc(t);
      if (!n || n === t) return t;
      t = n;
    }
  }
  function is(e) {
    let t = Xn(e);
    let n = (o) =>
      e.clone({
        ...t,
        ...o,
      });
    switch (un(e)) {
      case aa.ZodKind.ZodDefault:
      case aa.ZodKind.ZodPrefault:
        return is(t.innerType).optional();
      case aa.ZodKind.ZodOptional:
      case aa.ZodKind.ZodNullable:
      case aa.ZodKind.ZodCatch:
      case aa.ZodKind.ZodReadonly:
        return n({
          innerType: is(t.innerType),
        });
      case aa.ZodKind.ZodPipeline:
        return n({
          in: is(t.in),
          out: is(t.out),
        });
      case aa.ZodKind.ZodObject:
        return n({
          shape: Object.fromEntries(Object.entries(t.shape).map(([key, value]) => [key, is(value)])),
        });
      case aa.ZodKind.ZodArray:
        return n({
          element: is(t.element),
        });
      case aa.ZodKind.ZodUnion:
      case aa.ZodKind.ZodDiscriminatedUnion:
        return n({
          options: t.options.map(is),
        });
      case aa.ZodKind.ZodRecord:
        return n({
          valueType: is(t.valueType),
        });
      case aa.ZodKind.ZodLazy:
        return U$(() => is(F$(e)));
      default:
        return e;
    }
  }
  function rre(e) {
    if (un(e) !== aa.ZodKind.ZodPipeline) return;
    let t = Xn(e);
    return t.in && t.out
      ? {
          in: t.in,
          out: t.out,
        }
      : undefined;
  }
  function Zh(e) {
    var t;
    let n = un(e);
    if (n === aa.ZodKind.ZodUnion || n === aa.ZodKind.ZodDiscriminatedUnion)
      return (t = Xn(e).options) !== null && t !== undefined ? t : [];
    return [];
  }
  function pc(e) {
    return un(e) === aa.ZodKind.ZodArray ? Xn(e).element : undefined;
  }
  function ire(e) {
    var t;
    if (un(e) !== aa.ZodKind.ZodArray)
      return {
        min: undefined,
        max: undefined,
      };
    let n;
    let o;
    for (let r of (t = Xn(e).checks) !== null && t !== undefined ? t : []) {
      let def = r._zod.def;
      let a;
      let l;
      switch (def.check) {
        case "min_length":
          a = def.minimum;
          break;
        case "max_length":
          l = def.maximum;
          break;
        case "length_equals":
          a = l = def.length;
          break;
      }
      if (a !== undefined && (n === undefined || a > n)) n = a;
      if (l !== undefined && (o === undefined || l < o)) o = l;
    }
    return {
      min: n,
      max: o,
    };
  }
  function ore(e) {
    return un(e) === aa.ZodKind.ZodRecord ? Xn(e).keyType : undefined;
  }
  function sre(e) {
    return un(e) === aa.ZodKind.ZodRecord ? Xn(e).valueType : undefined;
  }
  function are(e) {
    return un(e) === aa.ZodKind.ZodNumber && e.isInt === true;
  }
  function lre(e) {
    var t;
    if (un(e) !== aa.ZodKind.ZodNumber)
      return {
        min: undefined,
        max: undefined,
      };
    let min;
    let max;
    for (let r of (t = Xn(e).checks) !== null && t !== undefined ? t : []) {
      let def = r._zod.def;
      if (typeof def.value !== "number") continue;
      if (def.check === "greater_than")
        min = {
          value: def.value,
          inclusive: def.inclusive === true,
        };
      else if (def.check === "less_than")
        max = {
          value: def.value,
          inclusive: def.inclusive === true,
        };
    }
    return {
      min,
      max,
    };
  }
  function cre(e) {
    let t = e;
    for (;;) {
      let n = un(t);
      if (n === aa.ZodKind.ZodDefault || n === aa.ZodKind.ZodPrefault) return Xn(t).defaultValue;
      let o = cc(t);
      if (o === t) return;
      t = o;
    }
  }
  function ure(e) {
    let t = e;
    for (;;) {
      if (un(t) === aa.ZodKind.ZodOptional) return true;
      let n = cc(t);
      if (n === t) return false;
      t = n;
    }
  }
  function dre(e) {
    var t;
    let n = Br(e);
    if (un(n) !== aa.ZodKind.ZodDiscriminatedUnion) return [];
    let discriminator = Xn(n).discriminator;
    let r = [];
    if (ure(e))
      r.push({
        id: "",
      });
    for (let s of Zh(n)) {
      let a = s.shape[discriminator];
      for (let id of (t = hc(a)) !== null && t !== undefined ? t : [])
        r.push({
          id,
          schema: s,
        });
    }
    return r;
  }
  function fre(e) {
    let t = Br(e);
    return un(t) === aa.ZodKind.ZodDiscriminatedUnion ? Xn(t).discriminator : undefined;
  }
  function pre(e) {
    var t;
    let n = e ? Br(e) : undefined;
    return n && un(n) === aa.ZodKind.ZodLiteral
      ? (t = Xn(n).values) === null || t === undefined
        ? undefined
        : t[0]
      : undefined;
  }
  function hre(e) {
    let t = {
      ...e,
    };
    for (let key of Object.keys(t)) if (t[key] === undefined) delete t[key];
    return t;
  }
  function hc(e) {
    var t;
    var n;
    let o = Br(e);
    let r = un(o);
    if (r === aa.ZodKind.ZodEnum)
      return Object.values((t = Xn(o).entries) !== null && t !== undefined ? t : {});
    if (r === aa.ZodKind.ZodLiteral) return (n = Xn(o).values) !== null && n !== undefined ? n : [];
    return;
  }
  function H$(e) {
    let t = Br(e);
    let valueType = un(t) === aa.ZodKind.ZodRecord ? Xn(t).valueType : undefined;
    return valueType ? hc(valueType) : undefined;
  }
  function Db(e) {
    var t;
    var n;
    var o;
    var r;
    var s;
    var a;
    if (!e) return [];
    let l = Br(e);
    let c = Zh(l);
    if (c.length > 0) {
      let f = new Map();
      let h = new Map();
      let m = false;
      for (let b of c)
        for (let w of Db(b)) {
          let S = f.get(w.key);
          if (!S) f.set(w.key, w);
          else {
            let filtered = [
              S.shownByOtherArm,
              (t = w.predicates) === null || t === undefined ? undefined : t.show,
              w.shownByOtherArm,
            ].filter((M) => M !== undefined);
            f.set(w.key, {
              ...S,
              ...(((n = S.predicates) === null || n === undefined ? undefined : n.show) && filtered.length > 0
                ? {
                    shownByOtherArm: (M) => filtered.some((N) => N(M)),
                  }
                : {}),
              ...(w.options && w.options.length > 0
                ? {
                    options: [
                      ...new Set([...((o = S.options) !== null && o !== undefined ? o : []), ...w.options]),
                    ],
                  }
                : {}),
              ...(w.optionLabels
                ? {
                    optionLabels: {
                      ...w.optionLabels,
                      ...S.optionLabels,
                    },
                  }
                : {}),
            });
          }
          if ($$(w) === "public") {
            let j = (r = h.get(w.key)) !== null && r !== undefined ? r : new Set();
            for (let M of (s = w.options) !== null && s !== undefined ? s : []) j.add(M);
            h.set(w.key, j);
          } else m = true;
        }
      let y = [...f.values()];
      if (!m) return y;
      return y.map((b) => {
        var w;
        let S = h.get(b.key);
        if (!S) return b;
        let j = (w = b.options) === null || w === undefined ? undefined : w.filter((M) => !S.has(M));
        return {
          ...b,
          support: undefined,
          ...((j === null || j === undefined ? undefined : j.length)
            ? {
                nonPublicOptions: j,
              }
            : {}),
        };
      });
    }
    if (un(l) !== aa.ZodKind.ZodObject) return [];
    let u = [];
    for (let [key, value] of Object.entries(l.shape)) {
      let m = value;
      let y = lc(m);
      if (y) {
        let b = D$(m, y);
        u.push({
          key,
          ...y,
          node: m,
          type: b,
          options: b === "enumArray" ? j$(m) : hc(m),
          ...(b === "record" && {
            valueOptions: (a = y.optionValues) !== null && a !== undefined ? a : H$(m),
          }),
        });
      }
    }
    return u;
  }
});
//@ chunk-1ny7cxrt.js:688138-688316 cjs-unmatched+string-clue
var mn = x(function (Z$) {
  Object.defineProperty(Z$, "__esModule", {
    value: true,
  });
  Z$.STUB_INTL = Z$.msg = undefined;
  var msg = (e) => e;
  Z$.msg = msg;
  Z$.STUB_INTL = {
    formatMessage: (e) => e.defaultMessage,
  };
});
//@ chunk-1ny7cxrt.js:688316-693714 cjs-unmatched+string-clue
var $n = x(function (X$) {
  Object.defineProperty(X$, "__esModule", {
    value: true,
  });
  X$.desktopVersionString =
    X$.DESKTOP_VERSION_RE =
    X$.SHA256_HEX =
    X$._test =
    X$.HOST_LIST_PLACEHOLDER =
    X$.MODELS_GROUP =
    X$.HELPER_SCRIPT_GROUP =
    X$.singleHostEgress =
    X$.credentialHelperCommandOf =
    X$.credentialKindOf =
    X$.activeCredentialOf =
    X$.offDeviceClusterOf =
    X$.activeBootstrapOrigin =
    X$.unreadableActivators =
    X$.hasActiveBootstrap =
    X$.urlWithSchemeCoercion =
    X$.QUERY_OR_FRAGMENT_URL_MESSAGE =
    X$.CREDENTIALED_URL_MESSAGE =
    X$.reportUnknownEnumElements =
    X$.lenientEnumArray =
    X$.kvRecord =
    X$.COWORK_3P_DOCS_BASE =
    X$.canonicalJson =
      undefined;
  X$.legacyKvEncodingNotice = G$;
  X$.hasUserinfo = jb;
  X$.carriesCredential = Vie;
  X$.refuseCredentials = Y$;
  X$.hasQueryOrFragment = qie;
  X$.oidcEgressHosts = Gie;
  X$.withUnreadableActivators = Jie;
  var zn = require_v3();
  var mc = Xr();
  var os = gr();
  var gc = yt();
  var yc = mn();
  var zie = (e, t) =>
    t && typeof t === "object" && !Array.isArray(t)
      ? Object.fromEntries(Object.entries(t).sort(([n], [o]) => (n < o ? -1 : n > o ? 1 : 0)))
      : t;
  var canonicalJson = (e) => JSON.stringify(e, zie);
  X$.canonicalJson = canonicalJson;
  X$.COWORK_3P_DOCS_BASE = "https://claude.com/docs/third-party/claude-desktop";
  function Bie(e) {
    let t = {};
    let n = (o, r) => {
      if (typeof o !== "string") return;
      let index = o.indexOf(r);
      if (index <= 0) return;
      let trimmed = o.slice(0, index).trim();
      let trimmed_2 = o.slice(index + 1).trim();
      if (trimmed && trimmed_2) t[trimmed] = trimmed_2;
    };
    if (Array.isArray(e)) for (let o of e) n(o, ":");
    else if (typeof e === "string") for (let o of e.split(",")) n(o, "=");
    return t;
  }
  function G$(e, t) {
    return {
      path: `${e} as a "Name=value,\u2026" string or a ["Name: value", \u2026] list`,
      use: 'a JSON object such as {"Name": "value"}',
      effect: `a string or list value will be rejected as malformed and ${t}`,
      ...mc.BATCH_2026_09,
      match: (n) => typeof n === "string" || Array.isArray(n),
      rewrite: Bie,
    };
  }
  var kvRecord = (e) =>
    zn.z.preprocess((t) => mc.applyLegacy(e, t), zn.z.record(zn.z.string(), zn.z.string()));
  X$.kvRecord = kvRecord;
  var q$ = (e) =>
    gc.annotate(zn.z.enum(e).catch(undefined), {
      openEnum: e,
    });
  var lenientEnumArray = (e, t = {}) =>
    (t.min === undefined ? zn.z.array(q$(e)) : zn.z.array(q$(e)).min(t.min)).transform((n) =>
      n.filter((o) => o !== undefined),
    );
  X$.lenientEnumArray = lenientEnumArray;
  var reportUnknownEnumElements = (e) => (t, n) => {
    if (!Array.isArray(t)) return;
    t.forEach((o, r) => {
      if (typeof o !== "string") n(`entry [${String(r)}] dropped \u2014 not a string`);
      else if (!e.includes(o))
        n(`entry [${String(r)}] dropped \u2014 not a value this build knows`, "unknown");
    });
  };
  X$.reportUnknownEnumElements = reportUnknownEnumElements;
  X$.CREDENTIALED_URL_MESSAGE = "URL must not contain credentials or a backslash in the authority";
  var W$ = "must not contain what looks like an API key or token in its host, user name or password";
  function jb(e) {
    let t = os.rawAuthority(e);
    if (t !== undefined && /[@\\]/.test(t)) return true;
    try {
      let { username, password } = new URL(e);
      return username !== "" || password !== "";
    } catch (error) {
      return false;
    }
  }
  function Vie(e) {
    return jb(e) || os.credentialFamilyInAuthority(e) !== undefined;
  }
  function Y$(e) {
    return e
      .refine((t) => !jb(t), {
        message: X$.CREDENTIALED_URL_MESSAGE,
      })
      .refine((t) => os.credentialFamilyInAuthority(t) === undefined, {
        message: W$,
      });
  }
  X$.QUERY_OR_FRAGMENT_URL_MESSAGE = "must not carry a query string or fragment";
  function qie(e) {
    let trimmed = e.trim();
    try {
      let { search, hash } = new URL(trimmed);
      return search !== "" || hash !== "" || /[?#]$/.test(trimmed);
    } catch (error) {
      return false;
    }
  }
  X$.urlWithSchemeCoercion = gc.annotate(
    zn.z.preprocess(
      (e) => (typeof e === "string" && e && !/^[a-z][a-z0-9+.-]*:\/\//i.test(e) ? `https://${e}` : e),
      Y$(zn.z.string().url()),
    ),
    {
      url: true,
    },
  );
  function Gie(e) {
    let t = e;
    if (typeof t === "string")
      try {
        t = JSON.parse(t);
      } catch (error) {
        return [];
      }
    if (!t || typeof t !== "object") return [];
    return [t.issuer, t.authorizationUrl, t.tokenUrl].map(os.egressAddress).filter((n) => !!n);
  }
  var hasActiveBootstrap = (e) => {
    var t;
    var n;
    return (
      Boolean((t = e.bootstrap) === null || t === undefined ? undefined : t.url) &&
      ((n = e.bootstrap) === null || n === undefined ? undefined : n.enabled) !== false
    );
  };
  X$.hasActiveBootstrap = hasActiveBootstrap;
  var Mb = Symbol.for("@ant/managed-config/unreadableActivators");
  var unreadableActivators = (e) => {
    var t;
    return (t = e[Mb]) !== null && t !== undefined ? t : [];
  };
  X$.unreadableActivators = unreadableActivators;
  function Jie(e, t) {
    if (t.length > 0)
      return Object.assign(e, {
        [Mb]: t,
      });
    delete e[Mb];
    return e;
  }
  var activeBootstrapOrigin = (e) => {
    var t;
    var n;
    var o;
    var r;
    return X$.hasActiveBootstrap(e) &&
      URL.canParse(
        (n = (t = e.bootstrap) === null || t === undefined ? undefined : t.url) !== null && n !== undefined
          ? n
          : "",
      )
      ? new URL(
          (r = (o = e.bootstrap) === null || o === undefined ? undefined : o.url) !== null && r !== undefined
            ? r
            : "",
        ).origin
      : undefined;
  };
  X$.activeBootstrapOrigin = activeBootstrapOrigin;
  var offDeviceClusterOf = (e) => {
    let t = e;
    return gc.offDeviceExecutionTargets().find((n) => t[n] !== undefined);
  };
  X$.offDeviceClusterOf = offDeviceClusterOf;
  var activeCredentialOf = (e) => {
    var t;
    let n = X$.offDeviceClusterOf(e);
    if (n !== undefined) return e[n].credential;
    return (t = e.inference) === null || t === undefined ? undefined : t.credential;
  };
  X$.activeCredentialOf = activeCredentialOf;
  var credentialKindOf = (e) => {
    var t;
    return (t = X$.activeCredentialOf(e)) === null || t === undefined ? undefined : t.kind;
  };
  X$.credentialKindOf = credentialKindOf;
  var credentialHelperCommandOf = (e) => {
    let t = X$.activeCredentialOf(e);
    return (t === null || t === undefined ? undefined : t.kind) === "helper-script" ? t.command : undefined;
  };
  X$.credentialHelperCommandOf = credentialHelperCommandOf;
  var singleHostEgress = (e) => [os.egressAddress(e)].filter((t) => !!t);
  X$.singleHostEgress = singleHostEgress;
  X$.HELPER_SCRIPT_GROUP = yc.msg({
    defaultMessage: "Helper script",
    id: "DnXPcFgmqb",
  });
  X$.MODELS_GROUP = yc.msg({
    defaultMessage: "Models",
    id: "blWvagsLt7",
  });
  X$.HOST_LIST_PLACEHOLDER = yc.msg({
    defaultMessage: "*.corp.example.com",
    id: "UkBVDCUMyP",
  });
  var coerceKvRecord = (e) => mc.applyLegacy(G$("key", "nothing is applied"), e);
  X$._test = {
    coerceKvRecord,
    CREDENTIAL_AS_HOST_MESSAGE: W$,
  };
  X$.SHA256_HEX = /^[0-9a-fA-F]{64}$/;
  var J$ = String.raw`(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)`;
  X$.DESKTOP_VERSION_RE = new RegExp(`^${J$}$`);
  var desktopVersionString = () =>
    zn.z
      .string()
      .trim()
      .regex(new RegExp(`^[vV]?${J$}$`), "Must be a version in X.Y.Z form, such as 1.2581.0")
      .transform((e) => e.replace(/^[vV]/, ""));
  X$.desktopVersionString = desktopVersionString;
});
//@ chunk-1ny7cxrt.js:693714-694466 cjs-unmatched+string-clue
var zb = x(function (rR) {
  Object.defineProperty(rR, "__esModule", {
    value: true,
  });
  rR.normalizeMcpServerName = qh;
  rR.normalizeMcpUrl = Lb;
  rR.mcpServerNameKey = Ub;
  rR.matchMcpServerIdentity = $oe;
  function qh(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
  function Lb(url) {
    try {
      let t = new URL(url);
      t.pathname = t.pathname.replace(/\/$/, "") || "/";
      return t.href;
    } catch (error) {
      return url;
    }
  }
  function Ub(name) {
    return qh(name).toLowerCase();
  }
  function $oe(e, t, n = () => true) {
    var o;
    var r;
    if (e.url !== undefined) {
      let u = Lb(e.url);
      let found = t.find((h) => h.url && Lb(h.url) === u);
      if (found)
        return {
          match: found,
          by: "url",
        };
    }
    let s = Ub(e.name);
    let filtered = t.filter((u) => Ub(u.name) === s && n(u));
    let l = qh(e.name);
    let c =
      (r =
        (o = filtered.find((u) => u.name === e.name)) !== null && o !== undefined
          ? o
          : filtered.find((u) => qh(u.name) === l)) !== null && r !== undefined
        ? r
        : filtered[0];
    return c
      ? {
          match: c,
          by: "name",
          named: filtered,
        }
      : undefined;
  }
});
//@ chunk-1ny7cxrt.js:694466-698893 cjs-unmatched+string-clue
var Ns = x(function (aR) {
  Object.defineProperty(aR, "__esModule", {
    value: true,
  });
  aR.memberPath =
    aR.namesRefusedMembers =
    aR.reportableName =
    aR.NOT_RECOGNIZED =
    aR.NOT_ACCEPTED =
    aR.isPlainObject =
    aR.coerceJsonString =
      undefined;
  aR.normalizeWinPathJSON = iR;
  aR.reportUnread = Foe;
  var Le = yt();
  function iR(e) {
    return e.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
  }
  var coerceJsonString = (e) => {
    if (typeof e !== "string") return e;
    try {
      return JSON.parse(e);
    } catch (error) {
      try {
        return JSON.parse(iR(e));
      } catch (error) {
        return e;
      }
    }
  };
  aR.coerceJsonString = coerceJsonString;
  var isPlainObject = (e) => e !== null && typeof e === "object" && !Array.isArray(e);
  aR.isPlainObject = isPlainObject;
  aR.NOT_ACCEPTED =
    "dropped: not an accepted value \u2014 fix the spelling, or upgrade if this value was added in a newer Claude Desktop release";
  aR.NOT_RECOGNIZED =
    "ignored: not a recognized sub-key \u2014 check the spelling, or upgrade if it was added in a newer Claude Desktop release";
  var oR = /^[\w$ .:/@+-]{0,48}$/;
  var reportableName = (e) => (oR.test(e) ? e : `<${e.length}-character name>`);
  aR.reportableName = reportableName;
  var namesRefusedMembers =
    (e, t, n = {}) =>
    (o) => {
      var r;
      var s;
      let keys = Object.keys(e);
      let l =
        keys.length > 1
          ? `${keys.slice(0, -1).join(", ")} and ${(r = keys.at(-1)) !== null && r !== undefined ? r : ""}`
          : (s = keys[0]) !== null && s !== undefined
            ? s
            : "no member";
      let flattened = o.issues.flatMap((issue) => {
        var f;
        var h;
        return issue.code === "unrecognized_keys" &&
          ((h = (f = issue.path) === null || f === undefined ? undefined : f.length) !== null &&
          h !== undefined
            ? h
            : 0) === 0
          ? issue.keys
          : [];
      });
      for (let u of flattened)
        o.issues.push({
          code: "custom",
          input: o.value,
          path: [aR.reportableName(u)],
          message: Object.hasOwn(n, u) ? n[u] : `is not a member of ${t} (${t} has ${l})`,
        });
    };
  aR.namesRefusedMembers = namesRefusedMembers;
  var memberPath = (e, t) =>
    !oR.test(t)
      ? `${e}[${aR.reportableName(t)}]`
      : /^[A-Za-z_$][\w$]*$/.test(t)
        ? e
          ? `${e}.${t}`
          : t
        : `${e}[${JSON.stringify(t)}]`;
  aR.memberPath = memberPath;
  var la = (node) => node._zod.def;
  function Foe(e, t, n, o, r = {}) {
    ud(e, t, n, o, r);
  }
  function Fb(e, t, n, o, r, s = false) {
    let a = t;
    let l = n;
    for (;;) {
      let c = Le.pipeSidesOf(a);
      if (c) {
        if (Le.zodKind(c.in) === Le.ZodKind.ZodTransform) {
          try {
            let transform = la(c.in).transform;
            l = transform(l, {
              addIssue: () => {
                return;
              },
              issues: [],
              value: l,
            });
          } catch (error) {
            return;
          }
          a = c.out;
        } else a = c.in;
        continue;
      }
      if (Le.zodKind(a) === Le.ZodKind.ZodCatch) {
        let innerType = la(a).innerType;
        let h = s && typeof l === "string" && l.trim() === "";
        if (r.values && o && !h && !innerType.safeParse(l).success) {
          let m = Le.zodKind(Boe(innerType));
          o(
            `${e} ${aR.NOT_ACCEPTED}`,
            m === Le.ZodKind.ZodEnum || m === Le.ZodKind.ZodLiteral ? "unknown" : "drop",
            e,
          );
          return;
        }
        a = innerType;
        continue;
      }
      let u = Le.unwrapStep(a);
      if (u === a)
        return {
          node: a,
          written: l,
        };
      a = u;
    }
  }
  function Boe(innerType) {
    let t = innerType;
    for (;;) {
      let n = Le.pipeSidesOf(t);
      let o = n
        ? Le.zodKind(n.in) === Le.ZodKind.ZodTransform
          ? n.out
          : n.in
        : Le.zodKind(t) === Le.ZodKind.ZodCatch
          ? la(t).innerType
          : Le.unwrapStep(t);
      if (o === t) return t;
      t = o;
    }
  }
  function Hoe(e, node, written, o) {
    let found = Le.unionOptionsOf(node).find((a) => a.safeParse(written).success);
    if (found !== undefined || !aR.isPlainObject(written)) return found;
    let sorted = sR(e, node, written, o).sort((a, l) => l.matched - a.matched);
    return sorted.length === 1 || (sorted.length > 1 && sorted[0].matched > sorted[1].matched)
      ? sorted[0].arm
      : undefined;
  }
  function sR(e, t, n, o) {
    return Le.unionOptionsOf(t).flatMap((r) => {
      var s;
      let a = Fb(e, r, n, undefined, o);
      let l = Le.zodKind(a === null || a === undefined ? undefined : a.node);
      if (a === undefined) return [];
      if (l === Le.ZodKind.ZodUnion || l === Le.ZodKind.ZodDiscriminatedUnion) return sR(e, a.node, n, o);
      if (l !== Le.ZodKind.ZodObject) return [];
      let shape = la(a.node).shape;
      let written = a.written;
      let f = 0;
      for (let [key, value] of Object.entries(shape)) {
        let node =
          (s = Fb(e, value, written[key], undefined, o)) === null || s === undefined ? undefined : s.node;
        let b =
          Le.zodKind(node) === Le.ZodKind.ZodLiteral
            ? la(node).values
            : Le.zodKind(node) === Le.ZodKind.ZodEnum
              ? Object.values(la(node).entries)
              : undefined;
        if (b === undefined) continue;
        if (written[key] === undefined) {
          if (!value.safeParse(undefined).success) return [];
        } else if (b.includes(written[key])) f++;
        else return [];
      }
      return [
        {
          arm: r,
          matched: f,
        },
      ];
    });
  }
  function ud(e, t, n, o, r, s = false) {
    let a = Fb(e, t, n, o, r, s);
    if (a === undefined) return;
    let { node, written } = a;
    let u = Le.zodKind(node);
    if (u === Le.ZodKind.ZodUnion || u === Le.ZodKind.ZodDiscriminatedUnion) {
      let m = Hoe(e, node, written, r);
      if (m !== undefined) ud(e, m, written, o, r);
      return;
    }
    if (u === Le.ZodKind.ZodObject) {
      if (!aR.isPlainObject(written)) return;
      let shape = la(node).shape;
      let catchall = la(node).catchall;
      let b = catchall !== undefined && Le.zodKind(catchall) !== Le.ZodKind.ZodNever;
      for (let [key, value] of Object.entries(written)) {
        let j = Object.hasOwn(shape, key) ? shape[key] : undefined;
        if (j === undefined) {
          if (!b && value !== undefined) {
            let M = aR.memberPath(e, key);
            o(`${M} ${aR.NOT_RECOGNIZED}`, "unknown", M);
          }
        } else if (value !== undefined && value !== null && !(r.stopAtKeys && Le.fieldMetaForNode(j)))
          ud(aR.memberPath(e, key), j, value, o, r, true);
      }
      return;
    }
    let f = Le.arrayElementOf(node);
    if (f !== undefined) {
      if (Array.isArray(written))
        written.forEach((m, y) => {
          if (m !== undefined && m !== null) ud(`${e}[${y}]`, f, m, o, r);
        });
      return;
    }
    let h = Le.recordValueTypeOf(node);
    if (h !== undefined && aR.isPlainObject(written)) {
      for (let [key, value] of Object.entries(written))
        if (value !== undefined && value !== null) ud(aR.memberPath(e, key), h, value, o, r);
    }
  }
});
//@ chunk-1ny7cxrt.js:698893-700307 cjs-unmatched+string-clue
var Jh = x(function (fR) {
  Object.defineProperty(fR, "__esModule", {
    value: true,
  });
  fR.TOOL_POLICY_EDITOR_VALUES = fR.TOOL_POLICY_VALUES = undefined;
  fR.strictestToolPolicy = Kb;
  fR.isApprovalRequiredToolPolicy = Goe;
  fR.toolPolicyKeyGlobMatch = Yh;
  fR.pluginMcpRulePrefix = dR;
  fR.managedToolPatternMatches = Yoe;
  fR.lookupMcpToolPolicy = Hb;
  fR.strictestOfToolPolicies = Joe;
  fR.TOOL_POLICY_VALUES = ["allow", "ask", "ask-session", "blocked"];
  fR.TOOL_POLICY_EDITOR_VALUES = ["allow", "ask", "blocked"];
  var uR = {
    blocked: 3,
    ask: 2,
    "ask-session": 1,
    allow: 0,
  };
  function Kb(e, t) {
    if (!e) return t;
    if (!t) return e;
    return uR[e] >= uR[t] ? e : t;
  }
  function Goe(e) {
    return e === "ask" || e === "ask-session";
  }
  function Yh(e, t) {
    let n = 0;
    let o = 0;
    let r = -1;
    let s = -1;
    while (o < t.length)
      if (n < e.length && e[n] === "*") {
        r = n;
        s = o;
        n++;
      } else if (n < e.length && e[n] === t[o]) {
        n++;
        o++;
      } else if (r >= 0) {
        s++;
        n = r + 1;
        o = s;
      } else return false;
    while (n < e.length && e[n] === "*") n++;
    return n === e.length;
  }
  function dR(e) {
    return `mcp__plugin_${e}_`;
  }
  var Woe = dR("*");
  function Yoe(e, t) {
    return e.startsWith(Woe) ? Yh(e.toLowerCase(), t.toLowerCase()) : Yh(e, t);
  }
  function Hb(e, t) {
    if (!e) return;
    if (Object.hasOwn(e, t)) return e[t];
    let n;
    for (let [key, value] of Object.entries(e)) if (key.includes("*") && Yh(key, t)) n = Kb(n, value);
    return n;
  }
  function Joe(e, t) {
    if (!e || !t) return e !== null && e !== undefined ? e : t;
    let n = Object.create(null);
    for (let o of new Set([...Object.keys(e), ...Object.keys(t)])) {
      let r = Hb(e, o);
      let s = Hb(t, o);
      let a = Kb(r, s);
      let l = o.includes("*") && a === "allow" && (r === undefined || s === undefined);
      if (a && !l) n[o] = a;
    }
    return n;
  }
});
//@ chunk-1ny7cxrt.js:700307-785246 cjs-unmatched+string-clue
var Ar = x(function (ls) {
  Object.defineProperty(ls, "__esModule", {
    value: true,
  });
  ls.MCP_ENTRY_SOURCE =
    ls.MCP_ENTRY_AUTHORITY_HOST =
    ls.MCP_ENTRY_TRANSPORT_BUILTIN =
    ls.MCP_ENTRY_SCOPES_LIST =
    ls.M365_DEFAULT_DELEGATED_SCOPES =
    ls.M365_ADMIN_CONSENT_SCOPES =
    ls.M365_ALWAYS_REQUESTED_SCOPES =
    ls.M365_WRITE_DELEGATED_SCOPES =
    ls.M365_GRANTABLE_DELEGATED_SCOPES =
    ls.AZURE_CLOUD_HOSTS =
    ls.AZURE_CLOUDS =
    ls.WEB_SEARCH_PROVIDER_HOSTS =
    ls.WEB_SEARCH_PROVIDERS =
    ls.BUILTIN_MCP_SERVERS =
    ls.safeHelperArg =
    ls.vendorId =
    ls.configuredHostPath =
    ls.safeWindowsHelperPath =
    ls.safeHelperPath =
    ls.HELPER_PATH_UNSAFE_MESSAGE =
    ls.RemoteDirectMcpServerConfig =
    ls.McpOauth =
    ls.HostedOauth =
    ls.ByoOauth =
    ls.PLUGIN_MCP_TOOL_POLICY_CHANNEL_NOTE =
    ls.MCP_TRANSPORT_POLICY_ONLY =
    ls.ORG_PLUGIN_SETTINGS_PARSE_FAILED =
    ls.OrgPluginSettings =
    ls.ORG_PLUGIN_PERMISSION_ASK_SESSION =
    ls.ORG_PLUGIN_SETTINGS_RECORD_FORM =
    ls.TOOL_POLICY_LABEL =
    ls.TOOL_POLICY_OPTION_LABELS =
    ls.LenientToolPolicy =
    ls.ToolPolicySchema =
    ls.CALLBACK_HOST_OPTIONS =
    ls.audienceIdentifier =
    ls.httpsUrl =
    ls.CLOUD_METADATA_HOSTS =
    ls.CLOUD_METADATA_IPV6 =
    ls.CLOUD_METADATA_IPV4 =
    ls.CLOUD_METADATA_HOST_NAMES =
    ls.LOOPBACK_HOSTS =
    ls.HELPER_ARG_UNSAFE_MESSAGE =
    ls.hasNoHelperBreakoutChars =
    ls.toolPolicyKeyGlobMatch =
    ls.TOOL_POLICY_VALUES =
    ls.TOOL_POLICY_EDITOR_VALUES =
    ls.strictestToolPolicy =
    ls.lookupMcpToolPolicy =
    ls.isApprovalRequiredToolPolicy =
      undefined;
  ls.GatewayOidc =
    ls.BootstrapFetchOidc =
    ls.BootstrapOidc =
    ls.ManagedMcpServers =
    ls.MANAGED_MCP_SERVERS_PARSE_FAILED =
    ls.GITHUB_IRREVERSIBLE_WRITE_TOOLS =
    ls.M365_IRREVERSIBLE_WRITE_TOOLS =
    ls.BUILTIN_DEFAULT_TOOL_POLICY =
    ls.DirectMcpServerConfig =
    ls.MANAGED_MCP_SERVERS_DEPRECATIONS =
    ls.MCP_ENTRY_TOOL_POLICY_ASK_SESSION =
    ls.MCP_ENTRY_TRANSPORT_MISSING =
    ls.MCP_ENTRY_OAUTH_SCOPES_LIST =
    ls.MCP_ENTRY_OAUTH_SCALAR =
      undefined;
  ls.isLoopbackHost = SR;
  ls.isLinkLocalOrMetadataHost = cse;
  ls.urlSchema = vc;
  ls.isOrgPluginSettingsParseFailed = Wb;
  ls.orgPluginSettingsToPolicyMap = CR;
  ls.orgPluginSettingsFromPolicyMap = gse;
  ls.resolveByoAsSelection = LR;
  ls.byoAsSelectionUrls = NR;
  ls.oauthAsSelectionUrls = Ose;
  ls.isSafeMcpCommand = KR;
  ls.isSafeHelperPath = Xb;
  ls.foldMcpEntryLegacy = rv;
  ls.isConnectableMcpEntry = GR;
  ls.connectableMcpServers = Nse;
  ls.isBuiltinMcpEntry = da;
  ls.hostsForBuiltinMcpEntry = Use;
  ls.findWebSearchBuiltin = zse;
  ls.isBuiltinMcpItem = Fse;
  ls.resolveEffectiveMcpToolPolicy = im;
  ls.builtinWriteToolCoverageGaps = YR;
  ls.unlistedBuiltinWriteTools = Bse;
  ls.isPluginMcpToolPolicyUnreadable = Hse;
  ls.resolvePluginMcpToolPolicy = XR;
  ls.resolveMcpToolPolicies = QR;
  ls.resolvePluginMcpToolPoliciesByName = qse;
  ls.resolveManagedToolPolicy = Gse;
  ls.adaptPluginMcp = Wse;
  ls.hasOAuthConfig = Jse;
  ls.wantsOAuthProvider = Xse;
  ls.relevantMcpEntryIssues = eD;
  ls.checkManagedMcpServersForDrops = nae;
  ls.firstDroppedOrgPluginTool = iae;
  ls.checkOrgPluginSettingsForDrops = sae;
  ls.resolveOidcEndpointSelection = aae;
  ls.oidcEndpointSelectionUrls = lae;
  ls.scopesIncludeResourceScope = fae;
  var I = require_v3();
  var Qh = gb();
  var ct = Xr();
  var vR = gr();
  var E = yt();
  var vi = $n();
  var O = mn();
  var as = zb();
  var wR = Ns();
  var Ut = Jh();
  var bc = Jh();
  Object.defineProperty(ls, "isApprovalRequiredToolPolicy", {
    enumerable: true,
    get: function () {
      return bc.isApprovalRequiredToolPolicy;
    },
  });
  Object.defineProperty(ls, "lookupMcpToolPolicy", {
    enumerable: true,
    get: function () {
      return bc.lookupMcpToolPolicy;
    },
  });
  Object.defineProperty(ls, "strictestToolPolicy", {
    enumerable: true,
    get: function () {
      return bc.strictestToolPolicy;
    },
  });
  Object.defineProperty(ls, "TOOL_POLICY_EDITOR_VALUES", {
    enumerable: true,
    get: function () {
      return bc.TOOL_POLICY_EDITOR_VALUES;
    },
  });
  Object.defineProperty(ls, "TOOL_POLICY_VALUES", {
    enumerable: true,
    get: function () {
      return bc.TOOL_POLICY_VALUES;
    },
  });
  Object.defineProperty(ls, "toolPolicyKeyGlobMatch", {
    enumerable: true,
    get: function () {
      return bc.toolPolicyKeyGlobMatch;
    },
  });
  var OR = gb();
  Object.defineProperty(ls, "hasNoHelperBreakoutChars", {
    enumerable: true,
    get: function () {
      return OR.hasNoHelperBreakoutChars;
    },
  });
  Object.defineProperty(ls, "HELPER_ARG_UNSAFE_MESSAGE", {
    enumerable: true,
    get: function () {
      return OR.HELPER_ARG_UNSAFE_MESSAGE;
    },
  });
  ls.LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
  function SR(hostname) {
    let replaced = hostname.toLowerCase().replace(/\.+$/, "");
    if (replaced === "localhost" || replaced.endsWith(".localhost")) return true;
    let match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(replaced);
    if (match) return match[1] === "127" || match[1] === "0";
    if (replaced.startsWith("[") && replaced.endsWith("]")) {
      let sliced = replaced.slice(1, -1);
      if (sliced === "::1" || sliced === "::") return true;
      let match = /^::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(sliced);
      if (match) {
        let s = parseInt(match[1], 16) >> 8;
        return s === 127 || s === 0;
      }
    }
    return false;
  }
  ls.CLOUD_METADATA_HOST_NAMES = [
    "metadata.google.internal",
    "metadata.goog",
    "metadata",
    "instance-data",
    "instance-data.ec2.internal",
  ];
  ls.CLOUD_METADATA_IPV4 = [
    "169.254.169.254",
    "169.254.170.2",
    "169.254.170.23",
    "169.254.0.23",
    "169.254.42.42",
    "100.100.100.200",
    "100.96.0.96",
    "100.80.80.80",
    "168.63.129.16",
    "192.0.0.192",
  ];
  ls.CLOUD_METADATA_IPV6 = ["[fd00:ec2::254]", "[fd00:ec2::23]", "[fd00:a9fe:a9fe::1]", "[fe80::a9fe:a9fe]"];
  function sse(e) {
    let [t, n, o, r] = e.split(".").map(Number);
    return `[::ffff:${((t << 8) | n).toString(16)}:${((o << 8) | r).toString(16)}]`;
  }
  ls.CLOUD_METADATA_HOSTS = new Set([
    ...ls.CLOUD_METADATA_HOST_NAMES,
    ...ls.CLOUD_METADATA_IPV4,
    ...ls.CLOUD_METADATA_IPV4.map(sse),
    ...ls.CLOUD_METADATA_IPV6,
  ]);
  var ase = new Set(ls.CLOUD_METADATA_HOST_NAMES);
  var hR = new Set(ls.CLOUD_METADATA_IPV4);
  var lse = new Set(ls.CLOUD_METADATA_IPV6);
  function cse(e) {
    var t;
    var n;
    let replaced = e.toLowerCase().replace(/\.+$/, "");
    if (
      ase.has(replaced) ||
      (replaced.startsWith("instance-data.") && replaced.endsWith(".compute.internal"))
    )
      return true;
    let match = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(replaced);
    if (match) return (match[1] === "169" && match[2] === "254") || hR.has(replaced);
    if (!(replaced.startsWith("[") && replaced.endsWith("]"))) return false;
    if (lse.has(replaced)) return true;
    let sliced = replaced.slice(1, -1);
    if (/^fe[89ab][0-9a-f]:/.test(sliced) || sliced.startsWith("fd00:ec2:")) return true;
    if (
      sliced.startsWith("64:ff9b:") ||
      sliced.startsWith("::ffff:0:") ||
      sliced.startsWith("2001:0:") ||
      sliced.startsWith("2001::")
    )
      return true;
    let a =
      (t = /^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})(?::|$)/.exec(sliced)) !== null && t !== undefined
        ? t
        : /^2002:([0-9a-f]{1,4})::/.exec(sliced);
    let l = a !== null && a !== undefined ? a : /^::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(sliced);
    if (l) {
      let c = parseInt(l[1], 16);
      let u = parseInt((n = l[2]) !== null && n !== undefined ? n : "0", 16);
      let f = `${c >> 8}.${c & 255}.${u >> 8}.${u & 255}`;
      return (c >> 8 === 169 && (c & 255) === 254) || hR.has(f);
    }
    return false;
  }
  function vc(e = {}) {
    return E.annotate(
      I.z.preprocess(
        (t) => {
          if (typeof t !== "string") return t;
          let trimmed = t.trim();
          return trimmed && !e.allowHttp && !/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
            ? `https://${trimmed}`
            : trimmed;
        },
        vi
          .refuseCredentials(
            I.z
              .string()
              .trim()
              .url()
              .refine(
                (t) => {
                  try {
                    let { protocol, hostname } = new URL(t);
                    if (protocol === "https:") return !e.rejectLoopback || !SR(hostname);
                    return (
                      protocol === "http:" &&
                      (!!e.allowHttp || (!!e.allowLoopbackHttp && ls.LOOPBACK_HOSTS.has(hostname)))
                    );
                  } catch (error) {
                    return false;
                  }
                },
                {
                  message: e.allowHttp
                    ? "must be an http:// or https:// URL"
                    : e.rejectLoopback
                      ? "must use https with a non-loopback host"
                      : e.allowLoopbackHttp
                        ? "must use https (or http on loopback)"
                        : "must use https",
                },
              ),
          )
          .refine((t) => !e.rejectQueryAndFragment || !vi.hasQueryOrFragment(t), {
            message: vi.QUERY_OR_FRAGMENT_URL_MESSAGE,
          }),
      ),
      {
        url: true,
      },
    );
  }
  ls.httpsUrl = vc({
    allowLoopbackHttp: true,
  });
  ls.audienceIdentifier = I.z.preprocess(
    (e) => {
      let t = ls.httpsUrl.safeParse(e);
      return t.success ? t.data : typeof e === "string" ? e.trim() : e;
    },
    I.z
      .string()
      .min(1)
      .superRefine((e, t) => {
        let n = ls.httpsUrl.safeParse(e);
        if (n.success) return;
        let o = URL.canParse(e) ? new URL(e) : undefined;
        let r = URL.canParse(`https://${e}`);
        if (o && !o.host && !r && !/\s/.test(e)) return;
        let s = /\s/.test(e)
          ? ["must be one value with no spaces"]
          : o || r
            ? n.error.issues.map((issue) => issue.message)
            : ["must be an https URL, a host name, or a URI such as urn:\u2026"];
        for (let message of s)
          t.addIssue({
            code: "custom",
            message,
          });
      }),
  );
  ls.CALLBACK_HOST_OPTIONS = ["127.0.0.1", "localhost"];
  var use = new Set(Ut.TOOL_POLICY_EDITOR_VALUES);
  function pd(e) {
    return use.has(e);
  }
  var mR = "not an accepted value (expected allow, ask or blocked)";
  var dse = I.z
    .enum(Ut.TOOL_POLICY_VALUES, {
      error: () => mR,
    })
    .refine((e) => pd(e), {
      message: mR,
    });
  ls.ToolPolicySchema = I.z.record(I.z.string(), dse);
  var fse = I.z.preprocess(
    (e) => (e === undefined || pd(e) ? e : "blocked"),
    I.z.enum(Ut.TOOL_POLICY_VALUES),
  );
  var kR = (toolPolicy) =>
    Object.fromEntries(
      Object.entries(toolPolicy).map(([key, value]) => [key, value === "ask-session" ? "ask" : value]),
    );
  var ER = (toolPolicy) => Qr(toolPolicy) && Object.values(toolPolicy).some((t) => t === "ask-session");
  function Qr(e) {
    return typeof e === "object" && e !== null && !Array.isArray(e);
  }
  ls.LenientToolPolicy = I.z.preprocess((e) => {
    if (!e || typeof e !== "object") return e;
    return Object.fromEntries(Object.entries(e).map(([key, value]) => [key, pd(value) ? value : "blocked"]));
  }, ls.ToolPolicySchema);
  ls.TOOL_POLICY_OPTION_LABELS = {
    allow: O.msg({
      defaultMessage: "Always allow",
      id: "yj3vT8BAIa",
    }),
    ask: O.msg({
      defaultMessage: "Ask each time",
      id: "IeOHqi8Fbf",
    }),
    "ask-session": O.msg({
      defaultMessage: "Ask once per session",
      id: "MBqBb4XNI5",
    }),
    blocked: O.msg({
      defaultMessage: "Blocked",
      id: "qqZPUhaHMm",
    }),
  };
  ls.TOOL_POLICY_LABEL = O.msg({
    defaultMessage: "Tool policy",
    id: "uSQ/bLKBIp",
  });
  var pse = I.z.object({
    toolPolicy: ls.LenientToolPolicy.optional(),
  });
  var PR = I.z.object({
    mcpServers: I.z.record(I.z.string(), pse.catch({})).optional(),
  });
  function AR(e) {
    var t;
    if (Array.isArray(e)) return e;
    let n = PR.safeParse(e);
    if (!n.success) return e;
    return Object.entries((t = n.data.mcpServers) !== null && t !== undefined ? t : {}).map(
      ([key, value]) => {
        var s;
        return {
          serverName: key,
          tools: Object.entries((s = value.toolPolicy) !== null && s !== undefined ? s : {}).map(
            ([key, value]) => ({
              toolName: key,
              permission: value,
            }),
          ),
        };
      },
    );
  }
  var Gb = I.z.object({
    toolName: E.subfield(I.z.string().min(1), {
      label: O.msg({
        defaultMessage: "Tool",
        id: "FWLX0PGi80",
      }),
      isPrimaryKey: true,
      placeholder: O.msg({
        defaultMessage: "tool name",
        id: "rhPs8UtdHq",
      }),
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage: "MCP tool name as the server reports it.",
            id: "+Vug/ETTGA",
          }),
        ),
      },
    }),
    permission: E.subfield(fse, {
      label: O.msg({
        defaultMessage: "Permission",
        id: "y4JnQ5QsBK",
      }),
      support: {
        values: {
          "ask-session": {
            availableInVersion: "1.21459.0",
          },
        },
      },
      optionLabels: ls.TOOL_POLICY_OPTION_LABELS,
      optionValues: Ut.TOOL_POLICY_EDITOR_VALUES,
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage: "Approval state locked for this tool. Unlisted tools stay user-controlled.",
            id: "Kp2V1d9NfA",
          }),
        ),
      },
    }),
  });
  var IR = I.z.object({
    serverName: E.subfield(I.z.string().min(1), {
      label: O.msg({
        defaultMessage: "Server name",
        id: "SsD9TTwUkB",
      }),
      support: {
        availableInVersion: "1.15200.0",
      },
      isPrimaryKey: true,
      placeholder: O.msg({
        defaultMessage: "server-name",
        id: "EvwX+qKToR",
      }),
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage: "Name of the plugin-delivered MCP server this policy applies to.",
            id: "20oPR1PTqH",
          }),
        ),
      },
    }),
    tools: E.subfield(
      E.annotate(I.z.array(Gb.nullable().catch(null)), {
        maxItems: 200,
      })
        .transform((e) => e.filter((t) => t !== null))
        .default([]),
      {
        label: ls.TOOL_POLICY_LABEL,
        support: {
          availableInVersion: "1.15200.0",
        },
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage: "Per-tool approval locks for this server.",
              id: "6haUENrnRB",
            }),
          ),
        },
      },
    ),
  });
  ls.ORG_PLUGIN_SETTINGS_RECORD_FORM = {
    path: 'orgPluginSettings as a {"mcpServers": {\u2026}} record',
    use: 'the array form [{"serverName": "\u2026", "tools": [{"toolName": "\u2026", "permission": "\u2026"}]}] (read by desktop 1.15200.0 and later; older desktops ignore the array and enforce no tool blocks)',
    effect:
      "the record will be rejected as malformed and the key will fail closed: every plugin-delivered MCP tool will be blocked until the value is rewritten",
    ...ct.BATCH_2026_09,
    match: (e) => typeof e === "object" && e !== null && !Array.isArray(e),
    rewrite: AR,
  };
  var hse = (e) =>
    Qr(e) && Qr(e.mcpServers)
      ? Object.values(e.mcpServers).flatMap((mcpServer) =>
          Qr(mcpServer) && Qr(mcpServer.toolPolicy) ? [mcpServer.toolPolicy] : [],
        )
      : [];
  ls.ORG_PLUGIN_PERMISSION_ASK_SESSION = {
    path: 'orgPluginSettings[].tools[].permission: "ask-session"',
    use: '"ask"',
    effect: 'that tool will be treated as "blocked", like any unrecognized permission',
    ...ct.BATCH_2026_09,
    match: (e) =>
      (Array.isArray(e) &&
        e.some(
          (t) =>
            Qr(t) &&
            Array.isArray(t.tools) &&
            t.tools.some((tool) => Qr(tool) && tool.permission === "ask-session"),
        )) ||
      hse(e).some(ER),
    rewrite: (e) => {
      if (Array.isArray(e))
        return e.map((n) =>
          Qr(n) && Array.isArray(n.tools)
            ? {
                ...n,
                tools: n.tools.map((tool) =>
                  Qr(tool) && tool.permission === "ask-session"
                    ? {
                        ...tool,
                        permission: "ask",
                      }
                    : tool,
                ),
              }
            : n,
        );
      let t = e;
      return {
        ...t,
        mcpServers: Object.fromEntries(
          Object.entries(t.mcpServers).map(([key, value]) => [
            key,
            Qr(value) && Qr(value.toolPolicy)
              ? {
                  ...value,
                  toolPolicy: kR(value.toolPolicy),
                }
              : value,
          ]),
        ),
      };
    },
  };
  function mse(e) {
    return ct.applyLegacy(
      ls.ORG_PLUGIN_SETTINGS_RECORD_FORM,
      ct.applyLegacy(ls.ORG_PLUGIN_PERMISSION_ASK_SESSION, e),
    );
  }
  ls.OrgPluginSettings = I.z.preprocess(
    mse,
    E.annotate(I.z.array(IR.nullable().catch(null)), {
      maxItems: 100,
    }).transform((e) => e.filter((t) => t !== null)),
  );
  ls.ORG_PLUGIN_SETTINGS_PARSE_FAILED = [];
  function Wb(e) {
    return e === ls.ORG_PLUGIN_SETTINGS_PARSE_FAILED;
  }
  function CR(e) {
    var t;
    let n = Object.create(null);
    let o = Array.isArray(e) ? e : AR(e);
    if (!Array.isArray(o)) return n;
    for (let r of o) {
      let s = Object.hasOwn(n, r.serverName) ? n[r.serverName] : Object.create(null);
      for (let tool of r.tools)
        s[tool.toolName] =
          (t = Ut.strictestToolPolicy(s[tool.toolName], tool.permission)) !== null && t !== undefined
            ? t
            : tool.permission;
      n[r.serverName] = s;
    }
    return n;
  }
  function gse(e) {
    return Object.entries(e).map(([key, value]) => ({
      serverName: key,
      tools: Object.entries(value).map(([key, value]) => ({
        toolName: key,
        permission: value,
      })),
    }));
  }
  ls.MCP_TRANSPORT_POLICY_ONLY = "policy-only";
  var Us = (e) => e.server !== undefined;
  var al = (e) => Us(e) && e.server === "microsoft365";
  var ca = (e) => Us(e) && e.server === "github";
  var _c = (e) => e.transport === "stdio";
  var yse = (e) => e.transport === ls.MCP_TRANSPORT_POLICY_ONLY;
  var cl = (e) => !_c(e) && !Us(e) && !yse(e);
  var short = E.shortDescription(
    O.msg({
      defaultMessage:
        "How the app connects: Streamable HTTP, legacy SSE, or a local command (stdio). policy-only connects to nothing; it only sets a plugin server\u2019s tool policy.",
      id: "McpTransportHint2",
    }),
  );
  var long = E.longDescription(
    "An entry with `transport: \"policy-only\"` is not a server: it sets tool permissions for an MCP server that an installed plugin provides, and nothing else. Set `name` to the server's name as the plugin declares it (matched case-insensitively) and `toolPolicy` to the permissions. The plugin keeps launching or connecting to its own server; the app never connects to, launches or lists anything for the entry, so it takes no `url`, `command`, `oauth` or other connection settings (an entry that sets one is rejected). It takes precedence over `orgPluginSettings` for that server in chat, Cowork and Code sessions alike; with no `toolPolicy` the server is left unrestricted. An entry whose name matches no installed plugin server does nothing.\n\nDesktop versions that predate `policy-only` do not recognise it: they drop the entry (listed under Configuration parse errors in the diagnostics report) and apply `orgPluginSettings` to that server instead. If every entry in the list is `policy-only`, those versions cannot read `managedMcpServers` at all: they report a parse error for it and, until they are updated, leave MCP servers that users added themselves, or that a project's `.mcp.json` declares, out of Code sessions. While older versions are still in use, keep the same permissions in `orgPluginSettings` too, and do not deploy a list made only of `policy-only` entries until every desktop has updated.",
  );
  var short_2 = E.shortDescription(
    O.msg({
      defaultMessage:
        "Static headers sent on every request \u2014 routing and tenant headers only. No credentials here; use the headers helper script for tokens and rotating values.",
      id: "McpHeadersHint2",
    }),
  );
  var short_3 = E.shortDescription(
    O.msg({
      defaultMessage:
        "How long the helper\u2019s headers are reused before it runs again, in seconds. Defaults to 300.",
      id: "HtyK0/oE2w",
    }),
  );
  var short_4 = E.shortDescription(
    O.msg({
      defaultMessage:
        "Seconds before the TTL expires at which the helper re-runs mid-session. Defaults to 60. Keep it larger than the helper\u2019s typical runtime.",
      id: "zq1cbZBApQ",
    }),
  );
  var name = E.subfield(I.z.string().min(1), {
    label: O.msg({
      defaultMessage: "Name",
      id: "HAlOn1ZsuY",
    }),
    isPrimaryKey: true,
    placeholder: O.msg({
      defaultMessage: "github",
      id: "Zejj2Gw5fy",
    }),
    description: {
      short: E.shortDescription(
        O.msg({
          defaultMessage:
            "Unique name for this server. Shown to users and used to key tool policy and sign-in state.",
          id: "40I9DtVbWB",
        }),
      ),
    },
  });
  ls.PLUGIN_MCP_TOOL_POLICY_CHANNEL_NOTE = `For a plugin server that Claude Code launches or connects to itself (a marketplace plugin's), the permissions travel on Claude Code's managed-settings channel: another Claude Code [managed-settings source](${vi.COWORK_3P_DOCS_BASE}/code#interaction-with-claude-code%E2%80%99s-own-managed-settings) on the device replaces them unless that source sets \`parentSettingsBehavior\` to \`"merge"\`. \`blocked\` on a server the app connects to itself holds either way.`;
  var toolPolicy = E.subfield(ls.ToolPolicySchema.optional(), {
    label: ls.TOOL_POLICY_LABEL,
    support: {
      values: {
        "ask-session": {
          availableInVersion: "1.21459.0",
        },
      },
    },
    optionValues: Ut.TOOL_POLICY_EDITOR_VALUES,
    placeholder: O.msg({
      defaultMessage: "toolName",
      id: "iFhBHMeCjp",
    }),
    description: {
      short: E.shortDescription(
        O.msg({
          defaultMessage: "Lock the approval state for specific tools. Unlisted tools stay user-controlled.",
          id: "bS7WElxrrh",
        }),
        {
          docsOnly: false,
        },
      ),
      long: E.longDescription(
        "Also governs the same server when an installed plugin provides it. A plugin's MCP server matches an entry by URL, else by name (case-insensitive; a plugin server that runs locally matches by name only), and then follows that entry's `toolPolicy` alone: `orgPluginSettings` is not consulted for it, even when the entry sets no `toolPolicy`. A built-in entry (one with `server`) is the exception: it applies to a plugin's server of the same name only when a `toolPolicy` is written on it, and then carries that `toolPolicy` and the built-in's rule that its send and other irreversible tools cannot be loosened below `ask`, but not the built-in's other default prompts. An `http`, `sse` or `stdio` entry is also a server the app itself connects to or launches. To set permissions for a server that only a plugin runs, without the app connecting to or launching anything, use an entry with `transport: \"policy-only\"`.\n\n" +
          ls.PLUGIN_MCP_TOOL_POLICY_CHANNEL_NOTE,
      ),
    },
  });
  var Jb = {
    server: I.z
      .never({
        error: "server is only valid on built-in entries, which must not set transport/url/command",
      })
      .optional(),
  };
  function DR(e) {
    let t = (n) =>
      I.z
        .never({
          error: `${e} must not set ${n}`,
        })
        .optional();
    return {
      url: t("url"),
      command: t("command"),
      oauth: t("oauth"),
      headers: t("headers"),
      headersHelper: t("headersHelper"),
      headersHelperTtlSec: t("headersHelperTtlSec"),
      headersHelperRefreshBufferSec: t("headersHelperRefreshBufferSec"),
      args: t("args"),
      env: t("env"),
      envHelper: t("envHelper"),
      envHelperTtlSec: t("envHelperTtlSec"),
      startupTimeoutSec: t("startupTimeoutSec"),
    };
  }
  var error =
    'clientId must be a non-empty string (a pre-registered client requires it; for automatic registration use `"oauth": true` or an object with only scope/appendOfflineAccess/additionalRedirectReferrerHosts)';
  var rm = (support) =>
    E.subfield(I.z.string().optional(), {
      support,
      label: O.msg({
        defaultMessage: "Additional redirect referrer hosts",
        id: "sxWy/sz/Fr",
      }),
      mono: true,
      placeholder: O.msg({
        defaultMessage: "(authorization URL host only)",
        id: "7lyDghlOiR",
      }),
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "Space-separated hostnames also accepted as the referrer of the sign-in callback. Only needed when the IdP completes sign-in from a different host.",
            id: "kux1XwHSoN",
          }),
          {
            docsOnly: false,
          },
        ),
        long: E.longDescription(
          "Only needed when the IdP completes sign-in from a host other than the authorization URL\u2019s. When a callback is rejected for a referrer mismatch, the rejected host is named in the app log \u2014 add that hostname here.",
          {
            docsOnly: false,
          },
        ),
      },
    });
  var scopes = I.z
    .never({
      error:
        'write the grant as the space-separated `scope` string (for example "read write") instead of a `scopes` list',
    })
    .optional();
  var scopes_2 = I.z
    .never({
      error: () =>
        `scopes: write the grant as the space-separated \`scope\` string (a list of scope-name strings is the legacy form)${nv(ls.MCP_ENTRY_SCOPES_LIST)}`,
    })
    .optional();
  var em = ["common", "organizations", "consumers"];
  var xR = () => I.z.array(vc()).min(1);
  ls.ByoOauth = I.z.object({
    clientId: E.subfield(
      I.z
        .string()
        .trim()
        .min(1, {
          error,
        })
        .optional(),
      {
        label: O.msg({
          defaultMessage: "Client ID",
          id: "U5+MBCY8VU",
        }),
        mono: true,
        placeholder: O.msg({
          defaultMessage: "From your IdP app registration",
          id: "UBXsZZ/YgR",
        }),
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "OAuth client ID from your IdP app registration. Leave unset to auto-register (dynamic client registration) and only narrow scopes.",
              id: "CasIvHu24B",
            }),
          ),
        },
      },
    ),
    clientSecret: E.subfield(
      E.annotate(I.z.string().trim().min(1).optional(), {
        redact: "presence",
      }),
      {
        label: O.msg({
          defaultMessage: "Client secret",
          id: "B7p2EChIPJ",
        }),
        mono: true,
        predicates: {
          show: (e) => Boolean(e.clientSecret) || !e.clientSecretHelper,
        },
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "Only for IdPs that require one (e.g. Box). Hosted config can store only a Google Desktop-app secret (GOCSPX-\u2026); for other IdPs use the client secret helper.",
              id: "zSswKOZPeO",
            }),
            {
              docsOnly: false,
            },
          ),
        },
      },
    ),
    clientSecretHelper: E.subfield(I.z.string().min(1).optional(), {
      label: O.msg({
        defaultMessage: "Client secret helper script",
        id: "97Wza/xUot",
      }),
      support: {
        availableInVersion: "1.19367.0",
      },
      mono: true,
      remotePolicy: {
        requiresUserConsent: true,
      },
      predicates: {
        show: (e) => Boolean(e.clientSecretHelper) || !e.clientSecret,
      },
      placeholder: O.msg({
        defaultMessage: "Absolute path",
        id: "StnRZmM3Xn",
      }),
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "Executable that prints the client secret on stdout as a JSON object with a single clientSecret key; any other output is rejected. Overrides the inline value.",
            id: "CIKoaKKKI9",
          }),
          {
            docsOnly: false,
          },
        ),
        long: E.longDescription(
          'Claude runs the executable with no arguments whenever that server connects and whenever its sign-in is refreshed in the background (the result is not cached), and reads **stdout**, which must be exactly one JSON object of the form `{"clientSecret": "\u2026"}`: no other keys, and no banner or log lines before or after it (write those to stderr, which is only logged; keep stdout and stderr together under 64 KB). The helper must exit with code `0` within 30 seconds. Any other output stops that server from connecting, with an error that names its `clientSecretHelper`, instead of sending a wrong value to the identity provider. Use this to pull the secret from Keychain, 1Password CLI, or an internal secret broker instead of writing it into the configuration, and prefer a helper that does not prompt the user, since it also runs during background refreshes.',
          {
            docsOnly: false,
          },
        ),
      },
    }),
    authorizationServer: E.subfield(xR().optional(), {
      label: O.msg({
        defaultMessage: "Authorization server",
        id: "la+WYl1g5R",
      }),
      mono: true,
      placeholder: O.msg({
        defaultMessage: '["https://api.box.com"]',
        id: "Kq/aajRMhf",
      }),
      predicates: {
        required: (e) => Boolean(e.clientSecret) || Boolean(e.clientSecretHelper),
      },
      requiredMessage: O.msg({
        defaultMessage:
          'Required when a client secret is configured. For a Google client use ["https://accounts.google.com"]; for mcp.box.com, ["https://api.box.com"].',
        id: "shX8X2aUZU",
      }),
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "Issuer URLs the OAuth sign-in may use, as a JSON array. Pre-filled by presets; ask your IdP admin if unsure.",
            id: "03A87ql5DH",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    authorizationUrl: E.subfield(ls.httpsUrl.optional(), {
      label: O.msg({
        defaultMessage: "Authorization URL",
        id: "uiL7XCPiaV",
      }),
      support: {
        availableInVersion: "1.24012.0",
      },
      mono: true,
      predicates: {
        show: (e) =>
          !e.tenantId && !(Array.isArray(e.authorizationServer) && e.authorizationServer.length > 0),
      },
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "Only for IdPs that don\u2019t serve a .well-known discovery document. Set together with Token URL; requires Client ID.",
            id: "Hf6aQERhbF",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    tokenUrl: E.subfield(ls.httpsUrl.optional(), {
      label: O.msg({
        defaultMessage: "Token URL",
        id: "PJhe0HJqkm",
      }),
      support: {
        availableInVersion: "1.24012.0",
      },
      mono: true,
      predicates: {
        show: (e) =>
          !e.tenantId && !(Array.isArray(e.authorizationServer) && e.authorizationServer.length > 0),
      },
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "Only for IdPs that don\u2019t serve a .well-known discovery document. Set together with Authorization URL; requires Client ID.",
            id: "JZIh/4to9Z",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    tenantId: E.subfield(I.z.union([I.z.guid(), I.z.enum(em)]).optional(), {
      label: O.msg({
        defaultMessage: "Tenant ID",
        id: "VdfqU5wMCX",
      }),
      mono: true,
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "Required for single-tenant Entra apps. Leave blank for multi-tenant or non-Microsoft IdPs.",
            id: "SnxeYJYoto",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    authFlow: E.subfield(I.z.enum(["browser", "broker"]).optional(), {
      label: O.msg({
        defaultMessage: "Sign-in flow",
        id: "nt5Vq+fIlk",
      }),
      support: {
        availableInVersion: "1.25927.0",
      },
      optionLabels: {
        browser: O.msg({
          defaultMessage: "System browser",
          id: "H8jfEPcL/x",
        }),
        broker: O.msg({
          defaultMessage: "OS identity broker (WAM / Company Portal)",
          id: "dkv7ZXazC0",
        }),
      },
      predicates: {
        show: (e) => Boolean(e.tenantId) || Boolean(e.authFlow),
      },
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "How Entra sign-in runs for this server: the system browser (default) or the OS identity broker.",
            id: "GsolzpV43N",
          }),
          {
            docsOnly: false,
          },
        ),
        long: E.longDescription(
          "- **`browser`** (default) \u2014 opens the system browser for an authorization-code (PKCE) sign-in on the loopback redirect URI.\n" +
            "- **`broker`** \u2014 signs in through the OS identity broker (Web Account Manager on Windows, the Company Portal SSO extension on macOS), so it can satisfy Conditional Access policies that require a compliant or managed device or token protection. Requires **Tenant ID**, **Client ID**, and **Scope**. The app registration must list the broker redirect URIs `ms-appx-web://Microsoft.AAD.BrokerPlugin/{client-id}` (Windows) and `msauth.com.anthropic.claudefordesktop://auth` (macOS) under the **Mobile and desktop applications** platform, and the device must be Entra-registered (macOS also needs the Company Portal SSO extension). Not supported on Linux. When the broker is not available on a device, sign-in falls back to the system browser.\n\n" +
            "App versions that predate this key always use the system browser.",
          {
            docsOnly: false,
          },
        ),
      },
    }),
    scope: E.subfield(I.z.string().min(1).optional(), {
      label: O.msg({
        defaultMessage: "Scope",
        id: "nso3MjkMl+",
      }),
      mono: true,
      placeholder: O.msg({
        defaultMessage: "api://\u2026/access_as_user offline_access",
        id: "1fPbl8sb8U",
      }),
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "Space-separated scopes sent on the authorize request. Leave unset to use the scopes the server advertises. Required when Tenant ID is set.",
            id: "/Ulx8QgbNP",
          }),
        ),
      },
      predicates: {
        required: (e) => typeof e.tenantId === "string" && e.tenantId.trim() !== "",
      },
      requiredMessage: O.msg({
        defaultMessage: "Scope is required when Tenant ID is set.",
        id: "EThsmphP7E",
      }),
    }),
    appendOfflineAccess: E.subfield(I.z.boolean().optional(), {
      label: O.msg({
        defaultMessage: "Request offline_access",
        id: "pQQw6aWtUt",
      }),
      support: {
        availableInVersion: "1.13576.0",
      },
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "Adds offline_access to the authorize request so the IdP returns a refresh token for silent renewal.",
            id: "RI6UfcnlXY",
          }),
          {
            docsOnly: false,
          },
        ),
        long: E.longDescription(
          "Leave off if Scope already includes `offline_access` or the server rejects it.\n\nWith explicit endpoints (Authorization URL / Token URL, no discovery) this toggle can\u2019t take effect on its own \u2014 the app can\u2019t confirm the AS advertises `offline_access`, so include `offline_access` in **Scope** instead for silent refresh.",
          {
            docsOnly: false,
          },
        ),
      },
    }),
    callbackHost: E.subfield(I.z.enum(ls.CALLBACK_HOST_OPTIONS).optional(), {
      label: O.msg({
        defaultMessage: "Callback host",
        id: "P+/GQ+gmAe",
      }),
      placeholder: O.msg({
        defaultMessage: "127.0.0.1",
        id: "L4dIq9u0LB",
      }),
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage: "Use localhost only if your IdP\u2019s registered redirect URI specifies it.",
            id: "CncIVWXmvt",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    callbackPort: E.subfield(I.z.number().int().min(1024).max(65535).optional(), {
      label: O.msg({
        defaultMessage: "Callback port",
        id: "XVLCaBkgOo",
      }),
      placeholder: O.msg({
        defaultMessage: "53280",
        id: "RaVP62wW+g",
      }),
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage: "Only set if your IdP requires an exact-match redirect port. Entra accepts any.",
            id: "4hrAYpn2S6",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    additionalRedirectReferrerHosts: rm({
      availableInVersion: "1.24012.0",
    }),
    scopes,
  });
  function LR(e) {
    if (e.tenantId)
      return {
        via: "tenant",
        tenantId: e.tenantId,
      };
    if (e.authorizationServer && e.authorizationServer.length > 0)
      return {
        via: "issuer",
        authorizationServer: e.authorizationServer,
      };
    if (e.authorizationUrl && e.tokenUrl)
      return {
        via: "explicit",
        authorizationUrl: e.authorizationUrl,
        tokenUrl: e.tokenUrl,
      };
    return {
      via: "prm",
    };
  }
  function NR(asSelection) {
    switch (asSelection.via) {
      case "issuer":
        return asSelection.authorizationServer;
      case "explicit":
        return [asSelection.authorizationUrl, asSelection.tokenUrl];
      case "tenant":
      case "prm":
        return [];
    }
  }
  function bse(e, t) {
    var n;
    var o;
    var r;
    var s;
    if (e.authFlow === "broker") {
      if (!e.tenantId)
        t.addIssue({
          code: I.z.ZodIssueCode.custom,
          path: ["tenantId"],
          message:
            'tenantId is required when authFlow is "broker" (OS-brokered sign-in targets the tenant-specific Entra authority of the registered app)',
        });
      if (e.tenantId !== undefined && em.includes(e.tenantId))
        t.addIssue({
          code: I.z.ZodIssueCode.custom,
          path: ["tenantId"],
          message:
            'authFlow "broker" needs a tenant GUID \u2014 the "common"/"organizations"/"consumers" aliases are not a tenant the OS broker can sign in against',
        });
    }
    if (e.tenantId && !e.scope)
      t.addIssue({
        code: I.z.ZodIssueCode.custom,
        path: ["scope"],
        message:
          "scope is required when tenantId is set (a tenant-pinned app must state its resource scopes explicitly; include offline_access if silent refresh is needed)",
      });
    if (
      !e.clientId &&
      (e.clientSecret ||
        e.clientSecretHelper ||
        e.tenantId ||
        e.callbackHost ||
        e.callbackPort !== undefined ||
        e.authFlow ||
        ((o = (n = e.authorizationServer) === null || n === undefined ? undefined : n.length) !== null &&
        o !== undefined
          ? o
          : 0) > 0)
    )
      t.addIssue({
        code: I.z.ZodIssueCode.custom,
        path: ["clientId"],
        message:
          "clientId is required when clientSecret/clientSecretHelper/tenantId/callbackHost/callbackPort/authFlow/authorizationServer is set (only scope/appendOfflineAccess/additionalRedirectReferrerHosts can be configured without a pre-registered client)",
      });
    if (!e.authorizationUrl !== !e.tokenUrl)
      t.addIssue({
        code: I.z.ZodIssueCode.custom,
        path: [e.authorizationUrl ? "tokenUrl" : "authorizationUrl"],
        message:
          "both authorizationUrl and tokenUrl are required when either is set (explicit endpoints replace .well-known discovery as a pair)",
      });
    if ((e.authorizationUrl || e.tokenUrl) && !e.clientId)
      t.addIssue({
        code: I.z.ZodIssueCode.custom,
        path: ["clientId"],
        message:
          "clientId is required when authorizationUrl/tokenUrl are set (dynamic client registration never runs against manually-configured endpoints)",
      });
    if (
      (e.clientSecret || e.clientSecretHelper) &&
      !(
        ((s = (r = e.authorizationServer) === null || r === undefined ? undefined : r.length) !== null &&
        s !== undefined
          ? s
          : 0) > 0
      )
    )
      t.addIssue({
        code: I.z.ZodIssueCode.custom,
        path: ["authorizationServer"],
        message:
          'authorizationServer is required when a client secret is configured (for a Google client use ["https://accounts.google.com"]; for mcp.box.com, ["https://api.box.com"])',
      });
  }
  var Vb = (e) => Array.isArray(e) && e.every((t) => typeof t === "string");
  function UR(e) {
    let { scopes, ...n } = e;
    let o = n;
    if (Vb(o.scope)) o.scope = o.scope.join(" ");
    if (
      (o.scope !== undefined &&
        o.scope !== null &&
        !(typeof o.scope === "string" && o.scope.trim() === "")) ||
      scopes === undefined ||
      scopes === null
    )
      return o;
    if (Vb(scopes)) {
      let joined = scopes.join(" ");
      return joined.trim() === ""
        ? o
        : {
            ...o,
            scope: joined,
          };
    }
    return Array.isArray(scopes)
      ? {
          ...o,
          scopes,
        }
      : {
          ...o,
          scope: scopes,
        };
  }
  function zR(e) {
    if (typeof e !== "object" || e === null)
      return e === false || e === null || e === undefined ? undefined : e;
    let t = {};
    for (let [key, value] of Object.entries(e)) if (value !== null && value !== undefined) t[key] = value;
    delete t.asSelection;
    if (typeof t.scope === "string" && t.scope.trim() === "") delete t.scope;
    if (
      typeof t.additionalRedirectReferrerHosts === "string" &&
      t.additionalRedirectReferrerHosts.trim() === ""
    )
      delete t.additionalRedirectReferrerHosts;
    return t;
  }
  var vse = I.z.strictObject({
    scope: ls.ByoOauth.shape.scope,
    appendOfflineAccess: ls.ByoOauth.shape.appendOfflineAccess,
    scopes: ls.ByoOauth.shape.scopes,
    additionalRedirectReferrerHosts: ls.ByoOauth.shape.additionalRedirectReferrerHosts,
  });
  var wse = ls.ByoOauth.extend({
    clientId: I.z
      .string({
        error,
      })
      .trim()
      .min(1, {
        error,
      }),
    mode: I.z.never().optional(),
  });
  ls.HostedOauth = I.z.object({
    clientId: E.subfield(vc().optional(), {
      label: O.msg({
        defaultMessage: "Client ID",
        id: "U5+MBCY8VU",
      }),
      support: {
        availableInVersion: "1.32885.1",
      },
      mono: true,
      predicates: {
        show: () => false,
      },
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "Set by the Claude.ai control plane when it serves this configuration (the URL of Anthropic\u2019s hosted client-metadata document); not authored.",
            id: "Qo9p3Z8KNm",
          }),
        ),
      },
    }),
    authorizationServer: E.subfield(xR(), {
      label: O.msg({
        defaultMessage: "Authorization server",
        id: "la+WYl1g5R",
      }),
      support: {
        availableInVersion: "1.32885.1",
      },
      mono: true,
      placeholder: O.msg({
        defaultMessage: '["https://auth.example.com"]',
        id: "QnF5L0LVAM",
      }),
      predicates: {
        required: () => true,
      },
      requiredMessage: O.msg({
        defaultMessage:
          "Required: the exact issuer URL(s) this server\u2019s OAuth authorization server advertises. Anthropic signs the client identity only for the servers listed here.",
        id: "dHFF5sr0w5",
      }),
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "The exact issuer string(s) the server\u2019s OAuth authorization server advertises in its metadata, as a JSON array \u2014 matched exactly, including path and any trailing slash. Required: Anthropic signs the client identity only for an authorization server listed here.",
            id: "oU3IPkHXhW",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    scope: ls.ByoOauth.shape.scope,
    scopes,
  });
  var FR = I.z
    .discriminatedUnion("mode", [
      I.z.strictObject({
        mode: E.annotate(I.z.literal("dcr"), {
          availableInVersion: "1.15200.0",
        }),
      }),
      I.z.object({
        mode: E.annotate(I.z.literal("byo"), {
          availableInVersion: "1.15200.0",
        }),
        ...E.unwrapZod(ls.ByoOauth).shape,
      }),
      I.z.object({
        mode: E.annotate(I.z.literal("hosted"), {
          availableInVersion: "1.32885.1",
        }),
        ...E.unwrapZod(ls.HostedOauth).shape,
      }),
    ])
    .superRefine((e, t) => {
      if (e.mode === "byo") bse(e, t);
    });
  var BR = [
    I.z.literal(true).transform(() => ({
      mode: "dcr",
    })),
    vse.transform((e) =>
      e.scope !== undefined ||
      e.appendOfflineAccess !== undefined ||
      e.additionalRedirectReferrerHosts !== undefined
        ? {
            ...e,
            mode: "byo",
          }
        : {
            mode: "dcr",
          },
    ),
    wse.transform((e) => ({
      ...e,
      mode: "byo",
    })),
    FR,
  ];
  ls.McpOauth = I.z.preprocess(zR, I.z.union(BR).pipe(FR).transform(Sse).optional());
  function Ose(e) {
    return e !== undefined && e.mode !== "dcr" ? NR(e.asSelection) : [];
  }
  function Sse(e) {
    return e.mode === "dcr"
      ? e
      : {
          ...e,
          asSelection: LR(e),
        };
  }
  ls.RemoteDirectMcpServerConfig = I.z.object({
    name,
    ...Jb,
    transport: E.subfield(I.z.enum(["http", "sse"]), {
      label: O.msg({
        defaultMessage: "Transport",
        id: "KwHBKRwf8M",
      }),
      optionLabels: {
        http: O.msg({
          defaultMessage: "Streamable HTTP",
          id: "xWvR0pm1jC",
        }),
        sse: O.msg({
          defaultMessage: "SSE (legacy)",
          id: "micfwa1L0h",
        }),
        stdio: O.msg({
          defaultMessage: "Local command (stdio)",
          id: "JJVljnyegG",
        }),
      },
      description: {
        short,
        long,
      },
      predicates: {
        show: (e) => !Us(e),
        required: (e) => !Us(e),
      },
      requiredMessage: O.msg({
        defaultMessage:
          "Choose a transport: Streamable HTTP or SSE for a remote server, or a local command (stdio).",
        id: "NHDyxXOY2g",
      }),
    }),
    url: E.subfield(ls.httpsUrl, {
      label: O.msg({
        defaultMessage: "URL",
        id: "bWjdfaXOzU",
      }),
      mono: true,
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage: "HTTPS endpoint of the remote MCP server.",
            id: "0DxirXa2HE",
          }),
        ),
      },
      predicates: {
        show: cl,
      },
    }),
    oauth: E.subfield(ls.McpOauth, {
      label: O.msg({
        defaultMessage: "OAuth",
        id: "Z9SEbF2UCN",
      }),
      optionLabels: {
        "": O.msg({
          defaultMessage: "None",
          id: "450Fty8ldn",
        }),
        dcr: O.msg({
          defaultMessage: "Auto-register (dynamic client registration)",
          id: "N5hOiMqiZn",
        }),
        byo: O.msg({
          defaultMessage: "Bring your own client",
          id: "SZXkm24sDA",
        }),
        hosted: O.msg({
          defaultMessage: "Anthropic-hosted client identity (requires Claude.ai sign-in)",
          id: "a8rtUEBAoL",
        }),
      },
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "OAuth for a remote server: true to auto-register a client, a pre-registered client ID with tenant and scope, or mode \u201Chosted\u201D for an Anthropic-signed identity.",
            id: "GczcdrMY1b",
          }),
        ),
        long: E.longDescription(
          "**Auto-register**: Claude registers itself as a client with the MCP server\u2019s authorization server the first time a user connects. **Bring your own client**: for a server whose provider requires an OAuth client that you register. Enter its **Client ID**, and add a **Client secret** and **Authorization server** only when the provider also requires the secret. Leave **None** for a server that needs no sign-in or authenticates with headers.",
          {
            docsOnly: false,
            docsUrl: `${vi.COWORK_3P_DOCS_BASE}/mcp-sign-in`,
          },
        ),
      },
      predicates: {
        show: cl,
      },
    }),
    headers: E.subfield(
      E.annotate(I.z.record(I.z.string(), I.z.string()).optional(), {
        redact: "presence",
      }),
      {
        label: O.msg({
          defaultMessage: "Headers",
          id: "Wm+KUdH7c0",
        }),
        placeholder: {
          key: O.msg({
            defaultMessage: "X-Tenant-ID",
            id: "McpHeadersKeyPh",
          }),
          value: O.msg({
            defaultMessage: "value",
            id: "7CyD7ey2Aw",
          }),
        },
        description: {
          short: short_2,
        },
        predicates: {
          show: cl,
        },
      },
    ),
    headersHelper: E.subfield(I.z.string().min(1).optional(), {
      label: O.msg({
        defaultMessage: "Headers helper script",
        id: "x+MG25XWVf",
      }),
      support: {
        availableInVersion: "1.19367.0",
      },
      placeholder: O.msg({
        defaultMessage: "Absolute path",
        id: "StnRZmM3Xn",
      }),
      mono: true,
      remotePolicy: {
        requiresUserConsent: true,
      },
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "Absolute path to an executable that prints a JSON object of HTTP headers on stdout. Merged over static headers; the helper wins on conflict.",
            id: "NM2HHnUt8L",
          }),
        ),
      },
      predicates: {
        show: cl,
      },
    }),
    headersHelperTtlSec: E.subfield(I.z.number().int().positive().optional(), {
      label: O.msg({
        defaultMessage: "Helper cache TTL (sec)",
        id: "HIjCnaQF93",
      }),
      support: {
        availableInVersion: "1.19367.0",
      },
      placeholder: O.msg({
        defaultMessage: "3600",
        id: "knMPP8lqSe",
      }),
      description: {
        short: short_3,
      },
      predicates: {
        show: (e) => Boolean(e.headersHelper),
      },
    }),
    headersHelperRefreshBufferSec: E.subfield(I.z.number().int().positive().optional(), {
      label: O.msg({
        defaultMessage: "Helper refresh buffer (sec)",
        id: "3p+PBJPMTa",
      }),
      support: {
        availableInVersion: "1.21459.0",
      },
      placeholder: O.msg({
        defaultMessage: "60",
        id: "JjROJwgJI2",
      }),
      description: {
        short: short_4,
      },
      predicates: {
        show: (e) => Boolean(e.headersHelper),
      },
    }),
    toolPolicy,
  });
  var kse = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  var HR = /(^|\/)\.\.($|\/)/;
  var Ese = /[\t\n\r\0;|`$<>"]/;
  function KR(e) {
    if (e.length === 0 || e !== e.trim()) return false;
    if (e.startsWith("~")) return false;
    if (kse.test(e)) return true;
    let replaced = e.replace(/\\/g, "/");
    if (replaced.startsWith("//")) return false;
    if (Ese.test(replaced)) return false;
    if (HR.test(replaced)) return false;
    return replaced.startsWith("/") || /^[A-Za-z]:\//.test(replaced);
  }
  var Pse = /["%\r\n\u0000]/;
  var Ase = /[. ]$/;
  function Xb(e) {
    if (e !== e.trim() || e.startsWith("~")) return false;
    if (Pse.test(e) || Ase.test(e)) return false;
    let replaced = e.replace(/\\/g, "/");
    if (replaced.startsWith("//") || replaced.startsWith("/??/")) return false;
    if (HR.test(replaced)) return false;
    return replaced.startsWith("/") || /^[A-Za-z]:\//.test(replaced);
  }
  ls.HELPER_PATH_UNSAFE_MESSAGE =
    'must be a local absolute path (Windows: C:/... or C:\\...) with no ~, .., UNC or \\??\\ prefix, not containing " % CR LF NUL, and not ending with a dot or space';
  ls.safeHelperPath = I.z.string().trim().min(1).refine(Xb, {
    message: ls.HELPER_PATH_UNSAFE_MESSAGE,
  });
  ls.safeWindowsHelperPath = ls.safeHelperPath.regex(/^[A-Za-z]:[\\/]/, {
    message: "must be a Windows drive-letter path (C:\\... or C:/...)",
  });
  ls.configuredHostPath = ls.safeHelperPath
    .regex(/^\/.*[^/]$/, {
      message: "must be a macOS or Linux file path (starts with /, does not end with /)",
    })
    .regex(/^[^\p{C}\p{Zl}\p{Zp}]*$/u, {
      message: "must not contain control, format, private-use or unassigned characters",
    })
    .max(4096)
    .brand();
  ls.vendorId = I.z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{0,31}$/, {
      message: "must be 1 to 32 lower-case letters, digits or hyphens, not starting with a hyphen",
    })
    .brand();
  ls.safeHelperArg = I.z.string().max(1024).regex(Qh.HELPER_BREAKOUT_FREE_RE, {
    message: Qh.HELPER_ARG_UNSAFE_MESSAGE,
  });
  var Ise = I.z.object({
    name,
    ...Jb,
    transport: E.subfield(I.z.literal("stdio"), {
      label: O.msg({
        defaultMessage: "Transport",
        id: "KwHBKRwf8M",
      }),
      support: {
        availableInVersion: "1.19367.0",
      },
      description: {
        short,
      },
    }),
    command: E.subfield(
      I.z.string().min(1).refine(KR, {
        message:
          "must be a bare command name (e.g. npx) or a local absolute path (Windows: C:/... or C:\\...); no ~, .., UNC, or control characters",
      }),
      {
        label: O.msg({
          defaultMessage: "Command",
          id: "9WyylR0I6U",
        }),
        support: {
          availableInVersion: "1.19367.0",
        },
        mono: true,
        placeholder: O.msg({
          defaultMessage: "/usr/local/bin/uvx",
          id: "lKL06F7LOG",
        }),
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage: "Absolute path to the server executable, run on the user\u2019s machine.",
              id: "AjJRgsQw1w",
            }),
            {
              docsOnly: false,
            },
          ),
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        predicates: {
          show: _c,
        },
      },
    ),
    args: E.subfield(
      E.annotate(I.z.array(I.z.string()), {
        maxItems: 100,
      }).optional(),
      {
        label: O.msg({
          defaultMessage: "Arguments",
          id: "nc7BrwYVL+",
        }),
        support: {
          availableInVersion: "1.19367.0",
        },
        mono: true,
        remotePolicy: {
          requiresUserConsent: true,
        },
        placeholder: O.msg({
          defaultMessage: '["mcp-server-fetch"]',
          id: "xtIyoIFEkB",
        }),
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage: "Arguments passed to the command, one per entry.",
              id: "qrGlhlxnhf",
            }),
          ),
        },
        predicates: {
          show: _c,
        },
      },
    ),
    env: E.subfield(
      E.annotate(I.z.record(I.z.string(), I.z.string()).optional(), {
        redact: "drop",
      }),
      {
        label: O.msg({
          defaultMessage: "Environment variables",
          id: "jvB4W9FV2m",
        }),
        support: {
          availableInVersion: "1.19367.0",
        },
        placeholder: {
          key: O.msg({
            defaultMessage: "API_KEY",
            id: "H/zM1IFCUA",
          }),
          value: O.msg({
            defaultMessage: "value",
            id: "7CyD7ey2Aw",
          }),
        },
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage: "Environment variables set for the command.",
              id: "TMkJBKoBoR",
            }),
          ),
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        predicates: {
          show: _c,
        },
      },
    ),
    envHelper: E.subfield(
      I.z
        .string()
        .min(1)
        .refine(Xb, {
          message: ls.HELPER_PATH_UNSAFE_MESSAGE,
        })
        .optional(),
      {
        label: O.msg({
          defaultMessage: "Environment helper script",
          id: "bzigWDMKGz",
        }),
        support: {
          availableInVersion: "1.21459.0",
        },
        placeholder: O.msg({
          defaultMessage: "Absolute path",
          id: "StnRZmM3Xn",
        }),
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "Script that prints environment variables as a JSON object to stdout. Runs when the local server starts (cached for the TTL below).",
              id: "eFAGgyRLfK",
            }),
            {
              docsOnly: false,
            },
          ),
          long: E.longDescription(
            'Absolute path to an executable that prints a single JSON object of environment variables to stdout, e.g. `{"API_KEY": "\u2026"}`. The app runs it before spawning the server and merges the result over `env` (the helper wins on conflict). Use this to pull secrets from a secrets manager instead of storing them inline in `env`.\n\n' +
              "- If the helper fails, the server does not start; the failure names the helper path in the app log and the diagnostics report.\n- A helper with nothing to set must print `{}`. Empty stdout is treated as a failure.\n" +
              "- A helper-emitted `PATH` replaces the static map\u2019s `PATH` and supports the same `${PATH}` placeholder expansion as a static entry.",
            {
              docsOnly: false,
            },
          ),
        },
        mono: true,
        remotePolicy: {
          requiresUserConsent: true,
        },
        predicates: {
          show: _c,
        },
      },
    ),
    envHelperTtlSec: E.subfield(I.z.coerce.number().int().positive().optional(), {
      label: O.msg({
        defaultMessage: "Helper cache TTL (sec)",
        id: "HIjCnaQF93",
      }),
      support: {
        availableInVersion: "1.21459.0",
      },
      default: 300,
      placeholder: O.msg({
        defaultMessage: "300",
        id: "ady/daA2aj",
      }),
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "Maximum age of a cached helper result, in seconds (default 300). Applies when the server starts or restarts.",
            id: "3eavQfVJJd",
          }),
          {
            docsOnly: false,
          },
        ),
        long: E.longDescription(
          "How long the app may reuse the helper's output before running it again. The check happens only when the server process is (re)started. Environment variables are fixed at process creation, and a running server never sees refreshed values until its next restart. Set this at or below your token lifetime: a server that crash-loops because its token expired can be respawned with the same cached environment until the TTL lapses. Default: 300 seconds.",
          {
            docsOnly: false,
          },
        ),
      },
      predicates: {
        show: (e) => Boolean(e.envHelper),
      },
    }),
    startupTimeoutSec: E.subfield(I.z.coerce.number().int().min(5).max(600).optional(), {
      label: O.msg({
        defaultMessage: "Startup timeout",
        id: "BeAzXifBDP",
      }),
      support: {
        availableInVersion: "1.19367.0",
      },
      suffix: O.msg({
        defaultMessage: "seconds",
        id: "8TQoLRh7Ea",
      }),
      default: 120,
      placeholder: O.msg({
        defaultMessage: "120",
        id: "PbcmBNPg4G",
      }),
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage: "Maximum wait in seconds for the server to start and list its tools.",
            id: "msICdyCWVb",
          }),
        ),
      },
      predicates: {
        show: _c,
      },
    }),
    toolPolicy,
  });
  var Cse = I.z.object({
    name,
    ...Jb,
    transport: E.subfield(I.z.literal(ls.MCP_TRANSPORT_POLICY_ONLY), {
      label: O.msg({
        defaultMessage: "Transport",
        id: "KwHBKRwf8M",
      }),
      support: {
        availableInVersion: "2.110.0",
      },
      optionLabels: {
        [ls.MCP_TRANSPORT_POLICY_ONLY]: O.msg({
          defaultMessage: "Tool permissions only (plugin server)",
          id: "McpPolicyOnlyTransportOpt",
        }),
      },
      description: {
        short,
      },
    }),
    ...DR('entries with transport "policy-only"'),
    toolPolicy,
  });
  ls.BUILTIN_MCP_SERVERS = ["microsoft365", "websearch", "github"];
  ls.WEB_SEARCH_PROVIDERS = ["brave", "tavily", "exa", "custom"];
  ls.WEB_SEARCH_PROVIDER_HOSTS = {
    brave: "api.search.brave.com",
    tavily: "api.tavily.com",
    exa: "api.exa.ai",
  };
  ls.AZURE_CLOUDS = ["global", "us-gov-high", "us-gov-dod"];
  ls.AZURE_CLOUD_HOSTS = {
    global: {
      authority: "login.microsoftonline.com",
      graph: "graph.microsoft.com",
    },
    "us-gov-high": {
      authority: "login.microsoftonline.us",
      graph: "graph.microsoft.us",
    },
    "us-gov-dod": {
      authority: "login.microsoftonline.us",
      graph: "dod-graph.microsoft.us",
    },
  };
  var ZR = [
    {
      scope: "User.Read",
      kind: "always",
    },
    {
      scope: "offline_access",
      kind: "always",
    },
    {
      scope: "Mail.Read",
      kind: "read",
    },
    {
      scope: "Mail.Read.Shared",
      kind: "read",
    },
    {
      scope: "Calendars.Read",
      kind: "read",
    },
    {
      scope: "Calendars.Read.Shared",
      kind: "read",
    },
    {
      scope: "Files.Read.All",
      kind: "read",
    },
    {
      scope: "Sites.Read.All",
      kind: "read",
    },
    {
      scope: "Chat.Read",
      kind: "read",
    },
    {
      scope: "ChannelMessage.Read.All",
      kind: "admin",
    },
    {
      scope: "OnlineMeetings.Read",
      kind: "read",
    },
    {
      scope: "OnlineMeetingTranscript.Read.All",
      kind: "admin",
    },
    {
      scope: "MailboxSettings.Read",
      kind: "read",
    },
    {
      scope: "People.Read",
      kind: "read",
    },
    {
      scope: "Team.ReadBasic.All",
      kind: "read",
    },
    {
      scope: "Channel.ReadBasic.All",
      kind: "read",
    },
    {
      scope: "Mail.Send",
      kind: "write",
    },
    {
      scope: "Mail.ReadWrite",
      kind: "write",
    },
    {
      scope: "Calendars.ReadWrite",
      kind: "write",
    },
    {
      scope: "Files.ReadWrite.All",
      kind: "write",
    },
    {
      scope: "Sites.ReadWrite.All",
      kind: "write",
    },
    {
      scope: "ChatMessage.Send",
      kind: "write",
    },
    {
      scope: "ChannelMessage.Send",
      kind: "write",
    },
    {
      scope: "Chat.Create",
      kind: "write",
    },
    {
      scope: "MailboxSettings.ReadWrite",
      kind: "write",
    },
  ];
  function Qb(e) {
    return ZR.filter((t) => t.kind === e).map((t) => t.scope);
  }
  ls.M365_GRANTABLE_DELEGATED_SCOPES = ZR.map((e) => e.scope);
  var gR = new Set(ls.M365_GRANTABLE_DELEGATED_SCOPES);
  ls.M365_WRITE_DELEGATED_SCOPES = Qb("write");
  ls.M365_ALWAYS_REQUESTED_SCOPES = Qb("always");
  ls.M365_ADMIN_CONSENT_SCOPES = Qb("admin");
  ls.M365_DEFAULT_DELEGATED_SCOPES = [
    "User.Read",
    "offline_access",
    "Mail.Read",
    "Calendars.Read",
    "Calendars.Read.Shared",
    "Files.Read.All",
    "Sites.Read.All",
    "Chat.Read",
    "Mail.Read.Shared",
    "OnlineMeetings.Read",
  ];
  var ev = {
    name,
    transport: I.z
      .never({
        error: () =>
          `built-in entries (with \`server\`) must not set transport \u2014 built-in is provenance, not a transport ("builtin" is the legacy value)${nv(ls.MCP_ENTRY_TRANSPORT_BUILTIN)}`,
      })
      .optional(),
    ...DR("built-in entries (with `server`)"),
  };
  function tv(e, t, support) {
    return E.subfield(I.z.literal(e), {
      label: O.msg({
        defaultMessage: "Server",
        id: "McpBuiltinServerLabel",
      }),
      optionLabels: {
        [e]: t,
      },
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "Which bundled connector this entry turns on. Set instead of a transport; each built-in server has its own fields.",
            id: "Y3kHXVbSRV",
          }),
        ),
      },
      predicates: {
        show: Us,
        disabled: Us,
      },
      support,
    });
  }
  function Xh(e) {
    return I.z.preprocess((t) => (typeof t === "string" && t.trim() === "" ? undefined : t), e);
  }
  function qb(e, t, n, o) {
    return (Array.isArray(e) ? e : [])
      .filter((s) => !t(s))
      .slice(0, 5)
      .map((s) => (s.length > n ? `${s.slice(0, o)}\u2026` : s))
      .join(", ");
  }
  var md = (e) => typeof e === "object" && e !== null && !Array.isArray(e);
  var ul =
    "the entry will be rejected as invalid and that connector will be unavailable until the entry is rewritten";
  var VR = (e) => cl(e);
  ls.MCP_ENTRY_SCOPES_LIST = {
    path: "managedMcpServers[].scopes",
    use: 'scope (one space-separated string, for example "Mail.Read Calendars.Read")',
    effect: ul,
    ...ct.BATCH_2026_09,
    match: (e) => (e.server === "microsoft365" || e.server === "github") && Vb(e.scopes),
    rewrite: (e) => {
      let { scopes, ...n } = e;
      let joined = scopes.join(" ");
      return n.scope !== undefined || joined === ""
        ? n
        : {
            ...n,
            scope: joined,
          };
    },
  };
  ls.MCP_ENTRY_TRANSPORT_BUILTIN = {
    path: 'managedMcpServers[].transport: "builtin"',
    effect: ul,
    ...ct.BATCH_2026_09,
    match: (e) => e.transport === "builtin" && e.server !== undefined,
    rewrite: ({ transport, ...t }) => t,
  };
  ls.MCP_ENTRY_AUTHORITY_HOST = {
    path: "managedMcpServers[].authorityHost",
    use: 'azureCloud: "us-gov-high" for a GCC High tenant; otherwise nothing',
    effect: `${ul} \u2014 the Microsoft 365 connector will disappear rather than guess a cloud`,
    ...ct.BATCH_2026_09,
    match: (e) => e.server === "microsoft365" && e.authorityHost !== undefined && e.authorityHost !== null,
    rewrite: ({ authorityHost, ...t }) =>
      t.azureCloud === undefined &&
      typeof authorityHost === "string" &&
      authorityHost.includes("login.microsoftonline.us")
        ? {
            ...t,
            azureCloud: "us-gov-high",
          }
        : t,
  };
  ls.MCP_ENTRY_SOURCE = {
    path: "managedMcpServers[].source",
    effect:
      "it will be treated as any unrecognised entry member \u2014 ignored by the desktop (the connector still loads; the app assigns each connector's provenance itself) and refused by a customer-run Apps Gateway serving the configuration",
    ...ct.BATCH_2026_09,
    match: (e) => e.source === "managed" || e.source === "org-plugin" || e.source === "user",
    rewrite: ({ source, ...t }) => t,
  };
  ls.MCP_ENTRY_OAUTH_SCALAR = {
    path: "managedMcpServers[].oauth as a number or string",
    use: "true (automatic registration) or an oauth object",
    effect: `it will be treated as any wrong-typed member: ${ul}`,
    ...ct.BATCH_2026_09,
    match: (e) => VR(e) && (typeof e.oauth === "number" || typeof e.oauth === "string"),
    rewrite: ({ oauth, ...t }) =>
      oauth
        ? {
            ...t,
            oauth: true,
          }
        : t,
  };
  ls.MCP_ENTRY_OAUTH_SCOPES_LIST = {
    path: "managedMcpServers[].oauth.scopes (or oauth.scope as a list)",
    use: 'oauth.scope as one space-separated string, for example "read write"',
    effect: `it will be treated as any wrong-typed member: ${ul}`,
    ...ct.BATCH_2026_09,
    match: (e) =>
      VR(e) &&
      md(e.oauth) &&
      ((e.oauth.scopes !== undefined && e.oauth.scopes !== null) || Array.isArray(e.oauth.scope)),
    rewrite: (e) => ({
      ...e,
      oauth: UR(e.oauth),
    }),
  };
  ls.MCP_ENTRY_TRANSPORT_MISSING = {
    path: "managedMcpServers[] entry without transport",
    use: 'transport: "http" (or "sse" / "stdio") on every entry that is not a built-in server',
    effect: ul,
    ...ct.BATCH_2026_09,
    match: (e) => e.server === undefined && (e.transport === undefined || e.transport === null),
    rewrite: (e) => ({
      ...e,
      transport: "http",
    }),
  };
  ls.MCP_ENTRY_TOOL_POLICY_ASK_SESSION = {
    path: 'managedMcpServers[].toolPolicy: "ask-session"',
    use: '"ask"',
    effect: ul,
    ...ct.BATCH_2026_09,
    match: (e) => ER(e.toolPolicy),
    rewrite: (e) => ({
      ...e,
      toolPolicy: kR(e.toolPolicy),
    }),
  };
  var Tse = [
    ls.MCP_ENTRY_SCOPES_LIST,
    ls.MCP_ENTRY_TOOL_POLICY_ASK_SESSION,
    ls.MCP_ENTRY_TRANSPORT_BUILTIN,
    ls.MCP_ENTRY_AUTHORITY_HOST,
    ls.MCP_ENTRY_SOURCE,
    ls.MCP_ENTRY_OAUTH_SCALAR,
    ls.MCP_ENTRY_OAUTH_SCOPES_LIST,
    ls.MCP_ENTRY_TRANSPORT_MISSING,
  ];
  ls.MANAGED_MCP_SERVERS_DEPRECATIONS = Tse.map(({ rewrite, match, ...n }) => ({
    ...n,
    match: (o) => Array.isArray(o) && o.some((r) => md(r) && match !== undefined && match(r, {})),
  }));
  function nv(e) {
    if (e.supportEnds === undefined) return "";
    return ct.isDeprecationHonoured(e)
      ? `; the legacy form is accepted only until ${ct.formatDeprecationDate(e.supportEnds)}`
      : "; the legacy form is no longer accepted";
  }
  var authorityHost = I.z
    .never({
      error: () =>
        `authorityHost was removed: set azureCloud ("us-gov-high" for GCC High) instead${nv(ls.MCP_ENTRY_AUTHORITY_HOST)}`,
    })
    .optional();
  var Rse = I.z.preprocess(
    (e) => {
      if (!md(e)) return e;
      if (e.authorityHost === null) {
        let { authorityHost, ...n } = e;
        return n;
      }
      return ct.applyLegacy(ls.MCP_ENTRY_AUTHORITY_HOST, e);
    },
    I.z
      .object({
        ...ev,
        authorityHost,
        server: tv(
          "microsoft365",
          O.msg({
            defaultMessage: "Microsoft 365",
            id: "McpBuiltinServerM365Opt",
          }),
          {
            availableInVersion: "1.19367.0",
          },
        ),
        tenantId: E.subfield(
          I.z.union([
            I.z.string().trim().guid(),
            I.z
              .string()
              .trim()
              .pipe(I.z.enum(em))
              .meta({
                enum: [...em],
              }),
          ]),
          {
            label: O.msg({
              defaultMessage: "Tenant ID",
              id: "McpBuiltinTenantId",
            }),
            support: {
              availableInVersion: "1.19367.0",
              values: {
                common: {
                  availableInVersion: "1.22209.0",
                },
                organizations: {
                  availableInVersion: "1.22209.0",
                },
                consumers: {
                  availableInVersion: "1.22209.0",
                },
              },
            },
            mono: true,
            placeholder: O.msg({
              defaultMessage: "00000000-0000-0000-0000-000000000000",
              id: "McpBuiltinTenantIdPh",
            }),
            description: {
              short: E.shortDescription(
                O.msg({
                  defaultMessage: "Your organization\u2019s Microsoft Entra directory (tenant) ID.",
                  id: "McpBuiltinTenantIdHint",
                }),
              ),
            },
            predicates: {
              show: al,
              required: al,
            },
            requiredMessage: O.msg({
              defaultMessage: "Required for the built-in Microsoft 365 server.",
              id: "McpBuiltinTenantIdReq",
            }),
          },
        ),
        clientId: E.subfield(I.z.string().trim().min(1), {
          label: O.msg({
            defaultMessage: "Client ID",
            id: "McpBuiltinClientId",
          }),
          support: {
            availableInVersion: "1.19367.0",
          },
          mono: true,
          description: {
            short: E.shortDescription(
              O.msg({
                defaultMessage: "OAuth app client ID for this built-in server.",
                id: "McpBuiltinClientIdHint2",
              }),
            ),
          },
          predicates: {
            show: (e) => al(e) || ca(e),
            required: (e) => al(e) || ca(e),
          },
          requiredMessage: O.msg({
            defaultMessage: "Required for this built-in server.",
            id: "McpBuiltinClientIdReq2",
          }),
        }),
        azureCloud: E.subfield(I.z.enum(ls.AZURE_CLOUDS).optional(), {
          label: O.msg({
            defaultMessage: "Azure cloud",
            id: "McpBuiltinAzureCloud",
          }),
          support: {
            availableInVersion: "1.19367.0",
          },
          placeholder: O.msg({
            defaultMessage: "global",
            id: "McpBuiltinAzureCloudPh",
          }),
          description: {
            short: E.shortDescription(
              O.msg({
                defaultMessage:
                  "Microsoft cloud for sign-in and Graph. Leave as global for commercial Microsoft 365; US Government clouds require your own app registration (Client ID).",
                id: "McpBuiltinAzureCloudHint",
              }),
              {
                docsOnly: false,
              },
            ),
          },
          predicates: {
            show: al,
          },
        }),
        continuousAccessEvaluation: E.subfield(
          I.z.preprocess(
            (e) => (e === true || e === "true" ? "enabled" : e === false || e === "false" ? "disabled" : e),
            I.z.enum(["enabled", "disabled"]).optional(),
          ),
          {
            label: O.msg({
              defaultMessage: "Continuous Access Evaluation",
              id: "McpBuiltinM365Cae",
            }),
            support: {
              availableInVersion: "1.49585.0",
            },
            placeholder: O.msg({
              defaultMessage: "enabled",
              id: "McpBuiltinM365CaePh",
            }),
            default: "enabled",
            description: {
              short: E.shortDescription(
                O.msg({
                  defaultMessage:
                    "Request CAE-capable Microsoft Graph tokens: long-lived (up to about 28 hours) but revocable within minutes. Set \u201Cdisabled\u201D to keep standard one-hour tokens.",
                  id: "McpBuiltinM365CaeHint",
                }),
                {
                  docsOnly: false,
                },
              ),
              long: E.longDescription(
                "With Continuous Access Evaluation the server declares the `cp1` client capability, so Microsoft Entra issues access tokens that live up to about 28 hours and are cut off within minutes by a claims challenge when an administrator revokes sessions, disables the account, or the user\u2019s risk changes \u2014 and, where the tenant enforces an IP named-location or Global Secure Access compliant-network Conditional Access policy, when the token is presented from outside that network. Tenants without such a policy get the longer lifetime and the fast revocation but no network-based replay protection; set `disabled` to keep standard one-hour, non-CAE tokens on every sign-in path. A change applies to tokens issued after the connector respawns with it; an already-cached long-lived token is served until it expires (Disconnect \u2192 Connect signs in afresh).",
              ),
            },
            predicates: {
              show: al,
            },
          },
        ),
        scope: E.subfield(
          Xh(
            I.z
              .string()
              .trim()
              .transform((e) => e.split(/\s+/))
              .refine((e) => e.every((t) => gR.has(t)), {
                error: (e) =>
                  `unknown scope(s) ${qb(e.input, (t) => gR.has(t), 40, 40)} \u2014 grantable scopes: ${ls.M365_GRANTABLE_DELEGATED_SCOPES.join(", ")}`,
              })
              .transform((e) => e.join(" "))
              .optional(),
          ),
          {
            label: O.msg({
              defaultMessage: "Access",
              id: "McpBuiltinScope",
            }),
            support: {
              availableInVersion: "1.19367.0",
            },
            control: "m365Scopes",
            description: {
              short: E.shortDescription(
                O.msg({
                  defaultMessage:
                    "What the server may request at sign-in. If blank, Desktop\u2019s default read set is used.",
                  id: "McpBuiltinScopeHint",
                }),
              ),
            },
            predicates: {
              show: al,
            },
          },
        ),
        toolPolicy,
        scopes: scopes_2,
      })
      .superRefine((e, t) => {
        if (e.azureCloud !== undefined && e.azureCloud !== "global" && !e.clientId)
          t.addIssue({
            code: I.z.ZodIssueCode.custom,
            path: ["clientId"],
            message: "clientId is required when azureCloud is a US Government cloud",
          });
      }),
  );
  var ll = (e) => Us(e) && e.server === "websearch";
  var qR = (headers) => headers !== null && typeof headers === "object" && Object.keys(headers).length > 0;
  var required = (e) => ll(e) && e.provider !== "custom" && !qR(e.headers) && !e.headersHelper;
  var Dse = I.z
    .object({
      ...ev,
      server: tv(
        "websearch",
        O.msg({
          defaultMessage: "Web search",
          id: "McpBuiltinServerWebSearchOpt",
        }),
        {
          availableInVersion: "1.19367.0",
        },
      ),
      provider: E.subfield(I.z.enum(ls.WEB_SEARCH_PROVIDERS), {
        label: O.msg({
          defaultMessage: "Search provider",
          id: "McpBuiltinWebSearchProvider",
        }),
        support: {
          availableInVersion: "1.19367.0",
        },
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "Runs search from the desktop, for inference providers without native web search. Supply the provider\u2019s API key through the headers helper script below.",
              id: "McpBuiltinWebSearchProviderHint2",
            }),
            {
              docsOnly: false,
            },
          ),
          long: E.longDescription(
            `For inference providers without native web search (Bedrock, custom gateways). On Anthropic API and Vertex, the model\u2019s built-in web search is available without this.

` +
              "The provider\u2019s API key is a credential \u2014 have the **headers helper script** print its auth header rather than storing it in `headers`:\n" +
              "- **Brave** \u2014 `X-Subscription-Token`\n" +
              "- **Exa** \u2014 `x-api-key`\n" +
              "- **Tavily** \u2014 `Authorization` (Bearer \u2026)\n\n" +
              "To turn web search off entirely, or to require approval for each search, list the bare `WebSearch` name in `disabledBuiltinTools` or `builtinToolPolicy`; it takes no per-host scope.",
            {
              docsOnly: false,
            },
          ),
        },
        predicates: {
          show: ll,
          required: ll,
        },
      }),
      headers: E.subfield(
        E.annotate(I.z.record(I.z.string(), I.z.string()).optional(), {
          redact: "presence",
        }),
        {
          label: O.msg({
            defaultMessage: "Headers",
            id: "Wm+KUdH7c0",
          }),
          support: {
            availableInVersion: "1.19367.0",
          },
          placeholder: {
            key: O.msg({
              defaultMessage: "X-Tenant-ID",
              id: "McpHeadersKeyPh",
            }),
            value: O.msg({
              defaultMessage: "value",
              id: "7CyD7ey2Aw",
            }),
          },
          description: {
            short: short_2,
          },
          predicates: {
            show: (e) => ll(e) || cl(e),
            required,
          },
        },
      ),
      headersHelper: E.subfield(I.z.string().min(1).optional(), {
        label: O.msg({
          defaultMessage: "Headers helper script",
          id: "x+MG25XWVf",
        }),
        support: {
          availableInVersion: "1.19367.0",
        },
        placeholder: O.msg({
          defaultMessage: "Absolute path",
          id: "StnRZmM3Xn",
        }),
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "Script that prints the auth header as a JSON object to stdout. Runs before each request (cached for the TTL below).",
              id: "Qhgv6SfKH6",
            }),
            {
              docsOnly: false,
            },
          ),
          long: E.longDescription(
            'Absolute path to an executable that prints a single JSON object of request headers to stdout, e.g. `{"X-Subscription-Token": "\u2026"}`. The app runs it before each request and caches the result for the TTL below. Use this to pull the key from a secrets manager instead of storing it inline in `headers`.',
            {
              docsOnly: false,
            },
          ),
        },
        mono: true,
        remotePolicy: {
          requiresUserConsent: true,
        },
        predicates: {
          show: (e) => ll(e) || cl(e),
          required,
        },
      }),
      headersHelperTtlSec: E.subfield(I.z.number().int().positive().optional(), {
        label: O.msg({
          defaultMessage: "Helper cache TTL (sec)",
          id: "HIjCnaQF93",
        }),
        support: {
          availableInVersion: "1.19367.0",
        },
        placeholder: O.msg({
          defaultMessage: "3600",
          id: "knMPP8lqSe",
        }),
        description: {
          short: short_3,
        },
        predicates: {
          show: (e) => Boolean(e.headersHelper),
        },
      }),
      headersHelperRefreshBufferSec: E.subfield(I.z.number().int().positive().optional(), {
        description: {
          short: short_4,
        },
        label: O.msg({
          defaultMessage: "Helper refresh buffer (sec)",
          id: "3p+PBJPMTa",
        }),
        support: {
          availableInVersion: "1.21459.0",
        },
        placeholder: O.msg({
          defaultMessage: "60",
          id: "JjROJwgJI2",
        }),
        predicates: {
          show: (e) => Boolean(e.headersHelper),
        },
      }),
      customUrl: E.subfield(vc().optional(), {
        label: O.msg({
          defaultMessage: "Custom URL",
          id: "McpBuiltinWebSearchCustomUrl",
        }),
        support: {
          availableInVersion: "1.19367.0",
        },
        mono: true,
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "POST endpoint accepting {q} JSON and returning a results[] array. Only used when provider is Custom.",
              id: "McpBuiltinWebSearchCustomUrlHint",
            }),
            {
              docsOnly: false,
            },
          ),
        },
        predicates: {
          show: (e) => ll(e) && e.provider === "custom",
          required: (e) => ll(e) && e.provider === "custom",
        },
      }),
      toolPolicy,
    })
    .superRefine((e, t) => {
      if (e.provider === "custom" && !e.customUrl)
        t.addIssue({
          code: I.z.ZodIssueCode.custom,
          path: ["customUrl"],
          message: "customUrl is required when provider is custom",
        });
      if (e.provider !== "custom" && !qR(e.headers) && !e.headersHelper)
        t.addIssue({
          code: I.z.ZodIssueCode.custom,
          path: ["headers"],
          message: `headers or headersHelper is required for provider "${e.provider}"`,
        });
    });
  var _R = /^[a-z_]{1,32}(?::[a-z_]{1,32})?$/;
  var bR = /^[a-z][a-z0-9_]{0,31}$/;
  var Mse = /^[A-Za-z0-9._-]{1,36}$/;
  var jse = I.z.object({
    ...ev,
    server: tv(
      "github",
      O.msg({
        defaultMessage: "GitHub",
        id: "McpBuiltinServerGithubOpt",
      }),
      {
        availableInVersion: "1.25927.0",
      },
    ),
    clientId: E.subfield(
      I.z
        .string()
        .trim()
        .refine((e) => Mse.test(e), {
          error:
            "clientId must be the GitHub app's client ID (letters, digits, or ._- \u2014 at most 36 characters)",
        }),
      {
        label: O.msg({
          defaultMessage: "Client ID",
          id: "McpBuiltinClientId",
        }),
        support: {
          availableInVersion: "1.25927.0",
        },
        mono: true,
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage: "GitHub OAuth app client ID (device flow must be enabled on the app).",
              id: "McpBuiltinGithubClientIdHint",
            }),
          ),
        },
        predicates: {
          show: ca,
          required: ca,
        },
        requiredMessage: O.msg({
          defaultMessage: "Required for this built-in server.",
          id: "McpBuiltinClientIdReq2",
        }),
      },
    ),
    host: E.subfield(
      Xh(
        vc({
          rejectLoopback: true,
        })
          .transform((e, t) => {
            try {
              return new URL(e).origin;
            } catch (error) {
              t.addIssue("must use https with a non-loopback host");
              return I.z.NEVER;
            }
          })
          .optional(),
      ),
      {
        label: O.msg({
          defaultMessage: "GitHub Enterprise Server URL",
          id: "McpBuiltinGithubHost",
        }),
        support: {
          availableInVersion: "1.25927.0",
        },
        mono: true,
        placeholder: O.msg({
          defaultMessage: "https://github.example.com",
          id: "McpBuiltinGithubHostPh",
        }),
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "Leave blank for github.com. For GitHub Enterprise Server, your instance\u2019s base URL.",
              id: "McpBuiltinGithubHostHint",
            }),
            {
              docsOnly: false,
            },
          ),
        },
        predicates: {
          show: ca,
        },
      },
    ),
    scope: E.subfield(
      Xh(
        I.z
          .string()
          .trim()
          .transform((e) => e.split(/\s+/))
          .refine((e) => e.every((t) => _R.test(t)), {
            error: (e) =>
              `invalid GitHub scope token(s) ${qb(e.input, (t) => _R.test(t), 20, 12)} \u2014 expected lowercase scope names like "repo read:org"`,
          })
          .transform((e) => e.join(" "))
          .optional(),
      ),
      {
        label: O.msg({
          defaultMessage: "Access",
          id: "McpBuiltinGithubScope",
        }),
        support: {
          availableInVersion: "1.25927.0",
        },
        mono: true,
        placeholder: O.msg({
          defaultMessage: "repo read:org",
          id: "McpBuiltinGithubScopePh",
        }),
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "Space-separated GitHub OAuth scopes. If blank, Desktop\u2019s default read set is used. Ignored for GitHub Apps (permissions come from the app registration).",
              id: "McpBuiltinGithubScopeHint",
            }),
          ),
        },
        predicates: {
          show: ca,
        },
      },
    ),
    toolsets: E.subfield(
      Xh(
        I.z
          .string()
          .trim()
          .transform((e) =>
            e
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t !== ""),
          )
          .refine((e) => e.length > 0 && e.every((t) => bR.test(t)), {
            error: (e) => {
              if ((Array.isArray(e.input) ? e.input : []).length === 0)
                return "toolsets must name at least one toolset (or be omitted)";
              return `invalid toolset token(s) ${qb(e.input, (n) => bR.test(n), 20, 12)} \u2014 expected comma-separated ids like "repos,issues"`;
            },
          })
          .transform((e) => e.join(","))
          .optional(),
      ),
      {
        label: O.msg({
          defaultMessage: "Toolsets",
          id: "McpBuiltinGithubToolsets",
        }),
        support: {
          availableInVersion: "1.25927.0",
        },
        mono: true,
        placeholder: O.msg({
          defaultMessage: "context,repos,issues,pull_requests",
          id: "McpBuiltinGithubToolsetsPh",
        }),
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "Comma-separated github-mcp-server toolsets to enable. If blank, the bundled server\u2019s default toolsets are used.",
              id: "McpBuiltinGithubToolsetsHint",
            }),
            {
              docsOnly: false,
            },
          ),
        },
        predicates: {
          show: ca,
        },
      },
    ),
    readOnly: E.subfield(
      I.z.preprocess((e) => (e === "true" ? true : e === "false" ? false : e), I.z.boolean().optional()),
      {
        label: O.msg({
          defaultMessage: "Read-only",
          id: "McpBuiltinGithubReadOnly",
        }),
        support: {
          availableInVersion: "1.25927.0",
        },
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage: "Offer only read tools \u2014 the server registers no write tools at all.",
              id: "McpBuiltinGithubReadOnlyHint",
            }),
            {
              docsOnly: false,
            },
          ),
        },
        predicates: {
          show: ca,
        },
      },
    ),
    toolPolicy,
    scopes: scopes_2,
  });
  var xse = I.z.union([Rse, Dse, jse]);
  function Lse(e) {
    let t = ct.applyLegacy(ls.MCP_ENTRY_OAUTH_SCOPES_LIST, ct.applyLegacy(ls.MCP_ENTRY_OAUTH_SCALAR, e));
    return ct.applyLegacy(ls.MCP_ENTRY_TRANSPORT_MISSING, t);
  }
  function rv(e) {
    if (!md(e)) return e;
    let t = ct.applyLegacy(
      ls.MCP_ENTRY_TRANSPORT_BUILTIN,
      ct.applyLegacy(ls.MCP_ENTRY_TOOL_POLICY_ASK_SESSION, ct.applyLegacy(ls.MCP_ENTRY_SOURCE, e)),
    );
    if (t.server !== undefined) {
      if (t.scope === null || (typeof t.scope === "string" && t.scope.trim() === "")) {
        let { scope, ...o } = t;
        t = o;
      }
      if (t.scopes === null) {
        let { scopes, ...o } = t;
        t = o;
      }
      return ct.applyLegacy(ls.MCP_ENTRY_SCOPES_LIST, t);
    }
    return Lse(t);
  }
  ls.DirectMcpServerConfig = I.z.preprocess(
    rv,
    I.z.union([xse, I.z.discriminatedUnion("transport", [ls.RemoteDirectMcpServerConfig, Ise, Cse])]),
  );
  function GR(e) {
    return e.transport !== ls.MCP_TRANSPORT_POLICY_ONLY;
  }
  function Nse(e) {
    return (e !== null && e !== undefined ? e : []).filter(GR);
  }
  function da(e) {
    return e.server !== undefined;
  }
  function Use(e) {
    var t;
    switch (e.server) {
      case "microsoft365": {
        let n = ls.AZURE_CLOUD_HOSTS[(t = e.azureCloud) !== null && t !== undefined ? t : "global"];
        return [n.graph, n.authority];
      }
      case "websearch": {
        if (e.provider === "custom") return vi.singleHostEgress(e.customUrl);
        return [ls.WEB_SEARCH_PROVIDER_HOSTS[e.provider]];
      }
      case "github": {
        let n = typeof e.host === "string" ? e.host.trim() : "";
        if (n === "") return ["github.com", "api.github.com"];
        let o = vR.egressAddress(n);
        if (o === undefined) return [];
        return o === "github.com" ? ["github.com", "api.github.com"] : [o];
      }
    }
  }
  function zse(e) {
    return e === null || e === undefined ? undefined : e.find((t) => da(t) && t.server === "websearch");
  }
  function Fse(e) {
    return !!e && Us(e);
  }
  ls.BUILTIN_DEFAULT_TOOL_POLICY = {
    microsoft365: {
      outlook_send_mail: "ask",
      outlook_forward_mail: "ask",
      outlook_send_draft: "ask",
      outlook_create_draft: "ask",
      outlook_create_reply_draft: "ask",
      outlook_create_reply_all_draft: "ask",
      outlook_update_draft: "ask",
      outlook_delete_draft: "ask",
      outlook_batch_delete_messages: "ask",
      outlook_trash_thread: "ask",
      outlook_untrash_thread: "ask",
      outlook_create_event: "ask",
      outlook_update_event: "ask",
      outlook_delete_event: "ask",
      outlook_respond_to_event: "ask",
      outlook_create_label: "ask",
      outlook_update_label: "ask",
      outlook_delete_label: "ask",
      outlook_modify_labels: "ask",
      outlook_modify_thread_labels: "ask",
      outlook_batch_modify_labels: "ask",
      outlook_create_filter: "ask",
      outlook_delete_filter: "ask",
      outlook_set_vacation: "ask",
      sharepoint_upload_file: "ask",
      sharepoint_update_file: "ask",
      sharepoint_create_folder: "ask",
      sharepoint_rename_item: "ask",
      sharepoint_move_item: "ask",
      sharepoint_copy_item: "ask",
      sharepoint_delete_item: "ask",
      teams_send_chat_message: "ask",
      teams_send_channel_message: "ask",
      teams_reply_channel_message: "ask",
      teams_create_chat: "ask",
    },
    github: {
      create_or_update_file: "ask",
      delete_file: "ask",
      push_files: "ask",
      create_repository: "ask",
      fork_repository: "ask",
      create_branch: "ask",
      create_issue: "ask",
      update_issue: "ask",
      add_issue_comment: "ask",
      add_sub_issue: "ask",
      remove_sub_issue: "ask",
      reprioritize_sub_issue: "ask",
      assign_copilot_to_issue: "ask",
      create_pull_request: "ask",
      update_pull_request: "ask",
      update_pull_request_branch: "ask",
      merge_pull_request: "ask",
      create_and_submit_pull_request_review: "ask",
      create_pending_pull_request_review: "ask",
      add_comment_to_pending_review: "ask",
      submit_pending_pull_request_review: "ask",
      delete_pending_pull_request_review: "ask",
      request_copilot_review: "ask",
      run_workflow: "ask",
      rerun_workflow_run: "ask",
      rerun_failed_jobs: "ask",
      cancel_workflow_run: "ask",
      delete_workflow_run_logs: "ask",
      dismiss_notification: "ask",
      mark_all_notifications_read: "ask",
      manage_notification_subscription: "ask",
      manage_repository_notification_subscription: "ask",
      create_gist: "ask",
      update_gist: "ask",
      add_project_item: "ask",
      delete_project_item: "ask",
    },
  };
  ls.M365_IRREVERSIBLE_WRITE_TOOLS = new Set([
    "outlook_send_mail",
    "outlook_send_draft",
    "outlook_forward_mail",
    "outlook_create_event",
    "outlook_update_event",
    "teams_send_chat_message",
    "teams_send_channel_message",
    "teams_reply_channel_message",
  ]);
  ls.GITHUB_IRREVERSIBLE_WRITE_TOOLS = new Set([
    "merge_pull_request",
    "push_files",
    "create_or_update_file",
    "delete_file",
    "run_workflow",
    "rerun_workflow_run",
    "rerun_failed_jobs",
    "delete_workflow_run_logs",
  ]);
  var WR = {
    microsoft365: ls.M365_IRREVERSIBLE_WRITE_TOOLS,
    github: ls.GITHUB_IRREVERSIBLE_WRITE_TOOLS,
  };
  function im(e) {
    var t;
    var n;
    let o = da(e) ? ls.BUILTIN_DEFAULT_TOOL_POLICY[e.server] : undefined;
    let r = da(e) ? WR[e.server] : undefined;
    if (!o && !e.toolPolicy) return;
    let merged = Object.assign(Object.create(null), e.toolPolicy);
    let a = e.toolPolicy !== undefined && Object.hasOwn(e.toolPolicy, "*");
    for (let [key, value] of Object.entries(o !== null && o !== undefined ? o : {})) {
      let u = e.toolPolicy !== undefined && Object.hasOwn(e.toolPolicy, key);
      let f = Ut.lookupMcpToolPolicy(e.toolPolicy, key);
      if (r === null || r === undefined ? undefined : r.has(key)) {
        let h = (t = Ut.strictestToolPolicy(value, f)) !== null && t !== undefined ? t : value;
        if (u || h !== f) merged[key] = h;
      } else if (!u && !a)
        merged[key] = (n = Ut.strictestToolPolicy(value, f)) !== null && n !== undefined ? n : value;
    }
    return merged;
  }
  function YR(e, t) {
    var n;
    var o;
    var r;
    let s = [];
    let a = [];
    if (!da(e))
      return {
        uncovered: s,
        globAllowOnly: a,
      };
    let l = ls.BUILTIN_DEFAULT_TOOL_POLICY[e.server];
    for (let c of t) {
      if (
        ((n = c.annotations) === null || n === undefined ? undefined : n.readOnlyHint) === true ||
        Object.hasOwn(l !== null && l !== undefined ? l : {}, c.name)
      )
        continue;
      let u = Ut.lookupMcpToolPolicy(e.toolPolicy, c.name);
      if (u === undefined) s.push(c.name);
      else if (
        u === "allow" &&
        !Object.hasOwn((o = e.toolPolicy) !== null && o !== undefined ? o : {}, c.name) &&
        !Object.hasOwn((r = e.toolPolicy) !== null && r !== undefined ? r : {}, "*")
      )
        a.push(c.name);
    }
    return {
      uncovered: s,
      globAllowOnly: a,
    };
  }
  function Bse(e, t) {
    return YR(e, t).uncovered;
  }
  ls.MANAGED_MCP_SERVERS_PARSE_FAILED = [];
  var JR = (managedMcpServers) => managedMcpServers === ls.MANAGED_MCP_SERVERS_PARSE_FAILED;
  function Hse(e) {
    return JR(e.managedMcpServers) || Wb(e.orgPluginSettings);
  }
  var Oc = (e) => (e && Object.keys(e).length > 0 ? e : undefined);
  function Kse(orgPluginSettings) {
    var t;
    if (Wb(orgPluginSettings))
      return {
        names: [],
        policyFor: () => ({
          "*": "blocked",
        }),
      };
    let n = CR(orgPluginSettings);
    let o = new Map();
    for (let [key, value] of Object.entries(n)) {
      let a = as.mcpServerNameKey(key);
      o.set(a, (t = Ut.strictestOfToolPolicies(o.get(a), value)) !== null && t !== undefined ? t : value);
    }
    return {
      names: Object.keys(n),
      policyFor: (r) => Oc(o.get(as.mcpServerNameKey(r))),
    };
  }
  function iv(e) {
    var t;
    return {
      managed: ((t = e.managedMcpServers) !== null && t !== undefined ? t : []).map((n) => ({
        name: n.name,
        url: "url" in n ? n.url : undefined,
        entry: n,
      })),
      org: Kse(e.orgPluginSettings),
      managedUnreadable: JR(e.managedMcpServers),
    };
  }
  function Zse(entry) {
    var t;
    let n = im(entry);
    if (!da(entry) || !n) return n;
    let o = WR[entry.server];
    let r = Object.create(null);
    for (let [key, value] of Object.entries(n))
      if (
        Object.hasOwn((t = entry.toolPolicy) !== null && t !== undefined ? t : {}, key) ||
        (o === null || o === undefined ? undefined : o.has(key))
      )
        r[key] = value;
    return Oc(r);
  }
  var Vse = (entry) => !da(entry) || Oc(entry.toolPolicy) !== undefined;
  function ov(e, t) {
    if (e.managedUnreadable)
      return {
        "*": "blocked",
      };
    let n = as.matchMcpServerIdentity(t, e.managed);
    let o = !n ? [] : (n.by === "url" ? [n.match] : n.named).filter((r) => Vse(r.entry));
    if (o.length > 0) return Oc(o.map((r) => Zse(r.entry)).reduce(Ut.strictestOfToolPolicies, undefined));
    return e.org.policyFor(t.name);
  }
  function XR(freshConfig, t) {
    return ov(iv(freshConfig), t);
  }
  function QR(freshConfig) {
    var t;
    let n = iv(freshConfig);
    let o = new Set(n.managed.map((s) => as.normalizeMcpServerName(s.name)));
    let r = Object.create(null);
    for (let s of n.org.names) {
      if (o.has(as.normalizeMcpServerName(s))) continue;
      let a = ov(n, {
        name: s,
      });
      if (a) r[s] = a;
    }
    for (let s of (t = freshConfig.managedMcpServers) !== null && t !== undefined ? t : []) {
      let a = Oc(im(s));
      if (a) r[s.name] = a;
    }
    return r;
  }
  function qse(e) {
    let t = iv(e);
    let n = Object.create(null);
    for (let o of [...t.org.names, ...t.managed.map((r) => r.name)]) {
      let r = ov(t, {
        name: o,
      });
      if (r) n[o] = r;
    }
    return n;
  }
  function Gse(e, t) {
    let { poolConfig, freshConfig } = t;
    let r = poolConfig ? im(poolConfig) : undefined;
    let s = !freshConfig
      ? undefined
      : (poolConfig === null || poolConfig === undefined ? undefined : poolConfig.origin) === "org-plugin"
        ? XR(freshConfig, {
            name: e,
            url: "url" in poolConfig ? poolConfig.url : undefined,
          })
        : QR(freshConfig)[e];
    if (!r && !s) return;
    let a = r !== null && r !== undefined ? r : {};
    let l = s !== null && s !== undefined ? s : {};
    let c = Object.create(null);
    for (let f of new Set([...Object.keys(a), ...Object.keys(l)])) {
      if (f === "*") continue;
      let h = Ut.strictestToolPolicy(Ut.lookupMcpToolPolicy(a, f), Ut.lookupMcpToolPolicy(l, f));
      if (h) c[f] = h;
    }
    let u = Ut.strictestToolPolicy(a["*"], l["*"]);
    if (u !== undefined && (u !== "allow" || a["*"] !== undefined)) c["*"] = u;
    return Oc(c);
  }
  function Wse(e, name) {
    return {
      name,
      transport: e.type,
      url: e.url,
      headers: e.headers,
      oauth: Yse(e.oauth),
    };
  }
  function Yse(oauth) {
    if (typeof oauth === "number" || typeof oauth === "string") return oauth ? true : undefined;
    return md(oauth) ? UR(oauth) : oauth;
  }
  function Jse(e) {
    return (e.transport === "http" || e.transport === "sse") && Boolean(e.oauth);
  }
  function Xse(e) {
    var t;
    if (e.transport !== "http" && e.transport !== "sse") return false;
    if (e.oauth) return true;
    if (e.headersHelper) return false;
    return !Object.keys((t = e.headers) !== null && t !== undefined ? t : {}).some(
      (key) => key.toLowerCase() === "authorization",
    );
  }
  ls.ManagedMcpServers = E.annotate(I.z.array(ls.DirectMcpServerConfig.nullable().catch(null)), {
    maxItems: 100,
  })
    .transform((e) => e.filter((t) => t !== null))
    .refine((e) => new Set(e.map((t) => t.name)).size === e.length, {
      message: "MCP server names must be unique",
    })
    .refine((e) => e.filter((t) => da(t) && t.server === "websearch").length <= 1, {
      message: "At most one WebSearch built-in entry is allowed",
    });
  var Qse = new Set([
    "clientId",
    "clientSecret",
    "clientSecretHelper",
    "authorizationServer",
    "tenantId",
    "callbackHost",
    "callbackPort",
    "authorizationUrl",
    "tokenUrl",
  ]);
  function eae(e) {
    if (e === null || typeof e !== "object") return 0;
    let t = e;
    if ("mode" in t) return 3;
    return Object.keys(t).some((key) => Qse.has(key)) ? 2 : 1;
  }
  function tae(e) {
    let t = zR(e);
    let n = BR[eae(t)].safeParse(t);
    return n.success ? [] : n.error.issues;
  }
  function eD(error, t) {
    let n = t && typeof t === "object" ? t : undefined;
    let o = n !== undefined && (n.server !== undefined || n.transport === "builtin");
    let r =
      (n === null || n === undefined ? undefined : n.server) === "websearch"
        ? 1
        : (n === null || n === undefined ? undefined : n.server) === "github"
          ? 2
          : 0;
    let s = (f, h) =>
      f.flatMap((m) => {
        var y;
        var b;
        if (m.code !== I.z.ZodIssueCode.invalid_union) return [m];
        let w = (y = m.errors) !== null && y !== undefined ? y : [];
        let j = (b = w[h === 0 ? (o ? 0 : 1) : r]) !== null && b !== undefined ? b : w[0];
        if (!j) return [m];
        let M = s(j, h + 1);
        return m.path.length === 0
          ? M
          : M.map((N) => ({
              ...N,
              path: [...m.path, ...N.path],
            }));
      });
    let a = s(error.issues, 0);
    let index = a.findIndex((f) => f.path[0] === "oauth");
    if (o || index === -1) return a;
    let c = rv(t);
    let u = s(tae(c !== null && typeof c === "object" ? c.oauth : undefined), 1);
    return u.length === 0
      ? a
      : a.flatMap((f, h) =>
          f.path[0] !== "oauth"
            ? [f]
            : h === index
              ? u.map((m) => ({
                  ...m,
                  path: ["oauth", ...m.path],
                }))
              : [],
        );
  }
  function nae(e, t) {
    if (!Array.isArray(e)) return;
    e.forEach((n, o) => {
      let r = ls.DirectMcpServerConfig.safeParse(n);
      if (r.success) return;
      let s = n && typeof n === "object" ? n.name : undefined;
      let a = typeof s === "string" ? `"${s}"` : `[${o}]`;
      let joined = eD(r.error, n)
        .map((c) => `${c.path.join(".") || "."}: ${c.message}`)
        .join("; ");
      t(`managedMcpServers entry ${a} dropped \u2014 ${joined}`);
    });
  }
  var rae = I.z.object({
    toolPolicy: ls.ToolPolicySchema.optional(),
  });
  var tD = I.z.object({
    serverName: I.z.string().min(1),
    tools: I.z.array(Gb).default([]),
  });
  function iae(e) {
    var t;
    let n = nD(e);
    for (let o of Array.isArray(n) ? n : []) {
      let r = tD.safeParse(o);
      let s = r.success ? undefined : r.error.issues.find((issue) => issue.path[0] === "tools");
      let [, a, l] =
        (t = s === null || s === undefined ? undefined : s.path) !== null && t !== undefined ? t : [];
      if (typeof a === "number" && (l === "toolName" || l === "permission")) {
        let c = o;
        let u = c.tools[a];
        return {
          serverName: typeof c.serverName === "string" ? c.serverName : "",
          tool: a + 1,
          toolName:
            typeof (u === null || u === undefined ? undefined : u.toolName) === "string" ? u.toolName : "",
          field: l,
        };
      }
    }
    return;
  }
  function oae(e, t) {
    return `${e}: ${JSON.stringify(t)} is not a recognized permission \u2014 treated as "blocked"`;
  }
  function nD(e) {
    return ct.applyLegacy(ls.ORG_PLUGIN_PERMISSION_ASK_SESSION, e);
  }
  function sae(e, t) {
    let n = nD(e);
    let o = (s, a) => t(oae(s, a), "drop");
    if (Array.isArray(n)) {
      n.forEach((s, a) => {
        var l;
        let serverName = s && typeof s === "object" ? s.serverName : undefined;
        let u = typeof serverName === "string" && serverName ? `"${serverName}"` : `[${a}]`;
        let f = tD.safeParse(s);
        if (!f.success)
          for (let issue of f.error.issues) {
            let joined = issue.path.join(".");
            t(
              joined
                ? `orgPluginSettings entry ${u}.${joined} dropped \u2014 ${issue.message}`
                : `orgPluginSettings entry ${u} dropped \u2014 ${issue.message}`,
            );
          }
        if (!IR.safeParse(s).success) return;
        if (!((l = s.tools) === null || l === undefined))
          l.forEach((h, m) => {
            if (Qr(h) && !pd(h.permission) && Gb.safeParse(h).success)
              o(`orgPluginSettings entry ${u}.tools.${m}.permission`, h.permission);
          });
      });
      return;
    }
    if (!n || typeof n !== "object") return;
    wR.reportUnread("orgPluginSettings", PR, n, t);
    let mcpServers = n.mcpServers;
    if (!mcpServers || typeof mcpServers !== "object") return;
    for (let [key, value] of Object.entries(mcpServers)) {
      if (Qr(value) && Qr(value.toolPolicy)) {
        for (let [key_2, value_2] of Object.entries(value.toolPolicy))
          if (!pd(value_2)) o(`orgPluginSettings.mcpServers["${key}"].toolPolicy.${key_2}`, value_2);
      }
      let l = rae.safeParse(value);
      if (l.success) continue;
      for (let issue of l.error.issues) {
        if (issue.path[0] === "toolPolicy" && issue.path.length === 2) continue;
        let joined = issue.path.join(".");
        if (joined) t(`orgPluginSettings.mcpServers["${key}"].${joined} dropped \u2014 ${issue.message}`);
        else t(`orgPluginSettings.mcpServers["${key}"] reset to {} \u2014 ${issue.message}`, "reset");
      }
    }
  }
  var sv = [
    (e) => !!e.issuer || !!(e.authorizationUrl && e.tokenUrl),
    {
      message: "either issuer, or both authorizationUrl and tokenUrl, required",
    },
  ];
  function aae(e) {
    if (e.issuer)
      return {
        via: "issuer",
        issuer: e.issuer,
      };
    if (e.authorizationUrl && e.tokenUrl)
      return {
        via: "explicit",
        authorizationUrl: e.authorizationUrl,
        tokenUrl: e.tokenUrl,
      };
    return;
  }
  function lae(e) {
    return e.via === "issuer" ? [e.issuer] : [e.authorizationUrl, e.tokenUrl];
  }
  var placeholder = O.msg({
    defaultMessage: "https://login.microsoftonline.com/TENANT/v2.0",
    id: "NUASktdfTk",
  });
  var short_5 = E.shortDescription(
    O.msg({
      defaultMessage:
        "HTTPS issuer with OIDC discovery. Set this, or set the authorization and token URLs instead.",
      id: "DCv1t4qBS8",
    }),
    {
      docsOnly: false,
    },
  );
  var fd = {
    clientId: E.subfield(I.z.string().min(1), {
      label: O.msg({
        defaultMessage: "Client ID",
        id: "U5+MBCY8VU",
      }),
      mono: true,
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage:
              "OAuth client ID of the desktop app registration at your identity provider (public client, PKCE).",
            id: "sBee1uqc2i",
          }),
        ),
      },
    }),
    issuer: E.subfield(ls.httpsUrl.optional(), {
      label: O.msg({
        defaultMessage: "Issuer URL",
        id: "159pClRrG6",
      }),
      mono: true,
      description: {
        short: short_5,
      },
    }),
    authorizationUrl: E.subfield(ls.httpsUrl.optional(), {
      label: O.msg({
        defaultMessage: "Authorization URL",
        id: "uiL7XCPiaV",
      }),
      mono: true,
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage: "HTTPS authorization endpoint. Used with the token URL when no issuer is set.",
            id: "xmuFH0zG0s",
          }),
        ),
      },
      predicates: {
        show: (e) => !e.issuer,
      },
    }),
    tokenUrl: E.subfield(ls.httpsUrl.optional(), {
      label: O.msg({
        defaultMessage: "Token URL",
        id: "PJhe0HJqkm",
      }),
      mono: true,
      description: {
        short: E.shortDescription(
          O.msg({
            defaultMessage: "HTTPS token endpoint. Used with the authorization URL when no issuer is set.",
            id: "wbCy7GEMfA",
          }),
        ),
      },
      predicates: {
        show: (e) => !e.issuer,
      },
    }),
  };
  var issuer = E.subfield(ls.httpsUrl.optional(), {
    label: O.msg({
      defaultMessage: "Issuer URL",
      id: "159pClRrG6",
    }),
    mono: true,
    placeholder,
    description: {
      short: short_5,
    },
  });
  var redirectPort = E.subfield(I.z.number().int().min(1024).max(65535).optional(), {
    label: O.msg({
      defaultMessage: "Redirect port",
      id: "A9/lbJqU6I",
    }),
    placeholder: O.msg({
      defaultMessage: "(ephemeral)",
      id: "ErCpG12/4F",
    }),
    description: {
      short: E.shortDescription(
        O.msg({
          defaultMessage:
            "Fixed loopback port for the sign-in redirect. Leave unset to use a free port each time.",
          id: "l8sJgEPNMT",
        }),
      ),
    },
  });
  var redirectHost = E.subfield(I.z.enum(ls.CALLBACK_HOST_OPTIONS).optional(), {
    label: O.msg({
      defaultMessage: "Redirect host",
      id: "c2ud3LKk3t",
    }),
    placeholder: O.msg({
      defaultMessage: "127.0.0.1",
      id: "L4dIq9u0LB",
    }),
    support: {
      availableInVersion: "2.110.0",
    },
    description: {
      short: E.shortDescription(
        O.msg({
          defaultMessage: "Use localhost only if your IdP\u2019s registered redirect URI specifies it.",
          id: "CncIVWXmvt",
        }),
        {
          docsOnly: false,
        },
      ),
    },
  });
  var omitOfflineAccess = E.subfield(I.z.boolean().optional(), {
    label: O.msg({
      defaultMessage: "Omit offline_access",
      id: "rXMEZQ7FqD",
    }),
    support: {
      availableInVersion: "1.17377.1",
    },
    description: {
      short: E.shortDescription(
        O.msg({
          defaultMessage:
            "Only enable if your IdP rejects the offline_access scope on this client. Without it the app prompts for sign-in each time the token expires.",
          id: "pkUlgTwVU2",
        }),
        {
          docsOnly: false,
        },
      ),
    },
  });
  ls.BootstrapOidc = I.z
    .object({
      ...fd,
      scopes: E.subfield(I.z.string().min(1).optional(), {
        label: O.msg({
          defaultMessage: "Scopes",
          id: "joDyyj/N+j",
        }),
        placeholder: O.msg({
          defaultMessage: "openid profile email offline_access",
          id: "TVC7JJ1/zv",
        }),
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage: "Space-separated scopes. Defaults to openid profile email offline_access.",
              id: "ljYP8yiNNh",
            }),
          ),
        },
      }),
      redirectPort,
      redirectHost,
      omitOfflineAccess,
      additionalRedirectReferrerHosts: rm({
        availableInVersion: "1.20186.0",
      }),
    })
    .refine(...sv);
  ls.BootstrapFetchOidc = I.z
    .object({
      ...fd,
      issuer,
      scopes: E.subfield(I.z.string().min(1).optional(), {
        label: O.msg({
          defaultMessage: "Scopes",
          id: "joDyyj/N+j",
        }),
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "Space-separated; the token\u2019s audience must match what your bootstrap server validates.",
              id: "eWCA/3rEU6",
            }),
            {
              docsOnly: false,
            },
          ),
        },
        placeholder: O.msg({
          defaultMessage: "openid offline_access CLIENT_ID/.default",
          id: "fSKoqI4XSt",
        }),
        predicates: {
          required: (e) => Boolean(e.clientId || e.issuer || e.authorizationUrl || e.tokenUrl),
        },
        requiredMessage: O.msg({
          defaultMessage: "Required. Set the scope your bootstrap server accepts as the token audience.",
          id: "WtkDPX8usa",
        }),
      }),
      redirectPort,
      redirectHost,
      additionalRedirectReferrerHosts: rm({
        availableInVersion: "1.20186.0",
      }),
    })
    .refine(...sv)
    .refine(
      (e) => {
        var t;
        return !!((t = e.scopes) === null || t === undefined ? undefined : t.trim());
      },
      {
        message: "required",
        path: ["scopes"],
      },
    );
  var dae = new Set(["openid", "profile", "email", "address", "phone", "offline_access"]);
  function fae(e) {
    if (typeof e !== "string") return false;
    return e
      .split(/\s+/)
      .filter(Boolean)
      .some((t) => !dae.has(t));
  }
  var scopes_3 = E.subfield(I.z.string().min(1).optional(), {
    label: O.msg({
      defaultMessage: "Scopes",
      id: "joDyyj/N+j",
    }),
    placeholder: O.msg({
      defaultMessage: "openid profile email offline_access",
      id: "TVC7JJ1/zv",
    }),
    description: {
      short: E.shortDescription(
        O.msg({
          defaultMessage:
            "Space-separated scopes. Required in access-token mode: set the gateway or proxy API scope. offline_access is appended automatically unless disabled below.",
          id: "VsPAC2z1YR",
        }),
      ),
    },
    predicates: {
      required: (e) => e.bearerTokenType === "access_token",
    },
    requiredMessage: O.msg({
      defaultMessage:
        "Required for access-token mode. Set the API scope of the gateway or proxy (e.g. api://gateway/.default). offline_access is appended automatically for silent refresh unless disabled below.",
      id: "1h3eSFXQWm",
    }),
  });
  ls.GatewayOidc = I.z
    .object({
      clientId: fd.clientId,
      issuer,
      authorizationUrl: fd.authorizationUrl,
      tokenUrl: fd.tokenUrl,
      bearerTokenType: E.subfield(I.z.enum(["id_token", "access_token"]).default("id_token"), {
        label: O.msg({
          defaultMessage: "Bearer token",
          id: "q3e4cfMU7E",
        }),
        optionLabels: {
          id_token: O.msg({
            defaultMessage: "ID token (default)",
            id: "ECdFElAw3s",
          }),
          access_token: O.msg({
            defaultMessage: "Access token",
            id: "uTSSg3isX7",
          }),
        },
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "Which token to send as the bearer. Use access token for a gateway or proxy that validates as an OAuth resource server.",
              id: "LChYqT/3kH",
            }),
            {
              docsOnly: false,
            },
          ),
          long: E.longDescription(
            "In **access-token** mode the token's audience must be your gateway or proxy. On IdPs where the requested scopes decide the audience (**Entra ID**), include its API resource scope in `scopes` \u2014 `api://<gateway-app-id>/.default`, or a named delegated scope you exposed via *Expose an API*. With only the standard OIDC scopes (`openid profile email offline_access`) Entra returns a v1.0 Microsoft Graph token whose issuer (`https://sts.windows.net/<tenant>/`) doesn't match the v2.0 issuer configured here, so a gateway that validates `iss` rejects it. On IdPs that set the access-token audience out-of-band (Keycloak audience mapper, Auth0 default audience, Okta custom authorization server), a resource scope in `scopes` isn't required \u2014 the audience comes from the IdP-side configuration.",
            {
              docsOnly: false,
            },
          ),
        },
      }),
      scopes: scopes_3,
      appendOfflineAccess: E.subfield(I.z.boolean().default(true), {
        label: O.msg({
          defaultMessage: "Append offline_access",
          id: "aZEuarDLlh",
        }),
        support: {
          availableInVersion: "1.11847.0",
        },
        default: true,
        predicates: {
          show: (e) => e.bearerTokenType === "access_token",
        },
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "Automatically append offline_access to scopes so the IdP returns a refresh token for silent refresh.",
              id: "ojtzwQNuA9",
            }),
            {
              docsOnly: false,
            },
          ),
          long: E.longDescription(
            "Turn off only if your authorization server rejects `offline_access` as an unknown scope; include the server\u2019s own refresh-token scope in **Scopes** instead.",
            {
              docsOnly: false,
            },
          ),
        },
      }),
      resource: E.subfield(ls.audienceIdentifier.optional(), {
        label: O.msg({
          defaultMessage: "Resource indicator (RFC 8707)",
          id: "GvbH4FD2vl",
        }),
        support: {
          availableInVersion: "1.30096.1",
        },
        mono: true,
        predicates: {
          show: (e) => e.bearerTokenType === "access_token" || !!e.resource,
        },
        description: {
          short: E.shortDescription(
            O.msg({
              defaultMessage:
                "Access-token audience of the gateway or proxy: an https URL or an AD FS relying-party identifier, sent as the RFC 8707 resource. Leave unset for Entra ID.",
              id: "qEr2KAluiP",
            }),
          ),
          long: E.longDescription(
            "Set this only for an IdP that implements RFC 8707 resource indicators. The app then sends `resource=<value>` on the authorization, token and refresh requests, so the access token the IdP issues is audience-restricted to the gateway or proxy rather than to the IdP's own APIs. Use it with `bearerTokenType: access_token`; in `id_token` mode the ID token's audience is always `clientId`. Ignored with the OS-broker sign-in flow (the sign-in flow key set to `broker`), which is Entra-only.\n\n**Microsoft Entra ID:** leave unset \u2014 the v2.0 endpoint rejects `resource`; request the API scope in `scopes` instead (`api://<gateway-app-id>/.default`). **AD FS:** enter one of the relying-party trust's identifiers, spelled as it is registered there. A value with no scheme (a host name with or without a port or path, a single name, or a GUID; `name:digits` also reads as a host name with a port) is sent as `https://<value>`; an identifier with a scheme of its own (`urn:\u2026`, or an organization-defined one such as `VENDOR:URI:\u2026`) is sent exactly as written. A trust whose only identifier is a bare name or GUID will not match, because those are sent as `https://<value>`: add an `https://\u2026` or `urn:\u2026` identifier to the trust and enter that one here. With any other identity provider, use an absolute URI without a fragment (RFC 8707 \u2014 the IdP rejects one as `invalid_target`). Changing it signs users in again.",
          ),
        },
      }),
      redirectPort,
      redirectHost,
      additionalRedirectReferrerHosts: rm({
        availableInVersion: "1.20186.0",
      }),
    })
    .refine(...sv)
    .refine(
      (e) => {
        var t;
        return (
          e.bearerTokenType !== "access_token" ||
          !!((t = e.scopes) === null || t === undefined ? undefined : t.trim())
        );
      },
      {
        message: "scopes is required when bearerTokenType is access_token",
        path: ["scopes"],
      },
    );
});
//@ chunk-1ny7cxrt.js:785246-787542 cjs-unmatched+string-clue
var Sc = x(function (ED) {
  Object.defineProperty(ED, "__esModule", {
    value: true,
  });
  ED.credentialHeaderEntry = SD;
  ED.firstCredentialHeader = kD;
  ED.credentialHeadersWarn = wle;
  var um = mn();
  var dle =
    /^(?:authorization|proxy-authorization|cookie|set-cookie|token|secret|password|api-key|x-api-key|x-auth-token|x-amz-security-token|x-goog-api-key|ocp-apim-subscription-key|x-subscription-token|private-token|x-functions-key|x-honeycomb-team)(?:-?v?\d+)?$|(?:^|-)(?:tokens?|secrets?|password|passwd|signature|credentials?|authorization|(?:api|secret|access|private|signing|auth|license|master|encryption|session|client)-?(?:keys?|secrets?))(?:-?v?\d+)?$|(?:token|apikey|secretkey|accesskey|privatekey|signingkey|licensekey|sessionkey|clientsecret|password|passwd|credentials?)(?:-?v?\d+)?$/;
  var fle = /[_.\s]+/g;
  var ple = /^\s*(?:bearer|basic|token|digest)\s+\S/i;
  var hle = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;
  var mle = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/;
  var gle = /\b(?:bearer|basic)\s+(?=[A-Za-z._~+/=-]*\d)[A-Za-z0-9._~+/=-]{16,}/i;
  var yle =
    /\b(?:sk-[A-Za-z0-9_-]{20,}|GOCSPX-[A-Za-z0-9_-]{20,}|(?:ghp_[0-9a-zA-Z]{36}|gh[ours]_[0-9a-zA-Z]{36}|github_pat_\w{82})\b|glpat-[\w-]{20}(?![\w-])|AIza[\w-]{35}(?![\w-]))/;
  function _le(e) {
    let t = [e];
    for (let j = 0; j < 2 && t[t.length - 1].includes("%"); j++)
      try {
        let decoded = decodeURIComponent(t[t.length - 1]);
        if (decoded === t[t.length - 1]) break;
        t.push(decoded);
      } catch (error) {
        break;
      }
    return t.flatMap((n) => [n, n.replace(/\+/g, " ")]);
  }
  function SD(e, t) {
    if (dle.test(e.trim().replace(fle, "-").toLowerCase())) return "name";
    return _le(t).some((o) => ple.test(o) || hle.test(o) || mle.test(o) || gle.test(o) || yle.test(o))
      ? "value"
      : undefined;
  }
  function kD(e) {
    if (!e || typeof e !== "object" || Array.isArray(e)) return;
    for (let [key, value] of Object.entries(e))
      if (key.trim() && typeof value === "string" && SD(key, value) !== undefined) return key;
    return;
  }
  var ble = um.msg({
    defaultMessage:
      "Header \u201C{name}\u201D looks like a credential. Use the headers helper script so the secret isn\u2019t stored in the config file.",
    id: "HdrCredWarnHeadersHelper",
  });
  var vle = um.msg({
    defaultMessage:
      "Header \u201C{name}\u201D looks like a credential. Use the credential helper script (it can print headers) so the secret isn\u2019t stored in the config file.",
    id: "HdrCredWarnCredentialHelper",
  });
  function wle(e, t, n) {
    let o = kD(e);
    if (o === undefined) return null;
    return t.formatMessage(n === "headersHelper" ? ble : vle, {
      name: o,
    });
  }
});
//@ chunk-1ny7cxrt.js:787542-849850 cjs-unmatched+string-clue
var Ir = x(function (UD) {
  var Sv;
  var kv;
  Object.defineProperty(UD, "__esModule", {
    value: true,
  });
  UD.inferenceCredentialKindField =
    UD.providerHasDiscovery =
    UD.PROVIDER_SELECTOR_ENV_FLAGS =
    UD.isBedrockFamily =
    UD.PROVIDER_CLI_FLAG =
    UD.CREDENTIAL_KINDS_FOR_PROVIDER =
    UD.PROVIDER_ARMS =
    UD.InferenceConfig =
    UD.AwsSigV4Credential =
    UD.whereIdpKeysExist =
    UD.GATEWAY_INTERACTIVE_WITH_IDP =
    UD.GATEWAY_IDP_AUTH_FLOW_KEY =
    UD.GATEWAY_IDP_OIDC_KEY =
    UD.IDP_AUTH_FLOW_FLAT_KEY =
    UD.IDP_OIDC_FLAT_KEY =
    UD.idpSignInShape =
    UD.VERTEX_INTERACTIVE_WITH_AUDIENCE =
    UD.VERTEX_OAUTH_CREDENTIAL_KIND =
    UD.GATEWAY_AUTH_SCHEME_AUTO =
    UD.GATEWAY_AUTH_SCHEME_SSO =
    UD.HelperScriptCreds =
    UD.helperScriptLeaves =
    UD.AWS_IAM_ROLE_ARN_RE =
      undefined;
  UD.editorListsGatewayIdpNotices = Ble;
  UD.gatewayIdpMovedKeyPairs = Hle;
  UD.formerGatewayIdpKeyOf = Kle;
  UD.providerCliFlagEnv = oce;
  UD.kindSupportsDiscovery = ND;
  UD.credentialYieldsBearer = sce;
  var K = require_v3();
  var AD = Sc();
  var wi = Xr();
  var zt = gr();
  var P = yt();
  var pe = $n();
  var A = mn();
  var Fn = Ar();
  var pa = oa();
  var Av = K.z.string().trim().regex(zt.AWS_REGION_RE, "must be a valid AWS region (e.g. us-east-1)");
  var Ele = K.z
    .string()
    .trim()
    .regex(zt.GCP_REGION_RE, "must be a GCP region (e.g. us-east5), a multi-region ('eu'/'us'), or 'global'");
  var Ple = K.z
    .string()
    .trim()
    .regex(zt.FOUNDRY_RESOURCE_RE, "must be an Azure resource name (lowercase letters, digits and hyphens)");
  var CD = K.z
    .string()
    .trim()
    .regex(zt.GCP_PROJECT_RE, "must be a GCP project ID or number (e.g. my-gcp-project)");
  UD.AWS_IAM_ROLE_ARN_RE = /^arn:aws[a-z-]*:iam::\d{12}:role\/[\w+=,.@/-]+$/;
  var PD = pe.legacyKvEncodingNotice("inferenceCustomHeaders", "no custom inference headers will be sent");
  var customHeaders = P.field(
    P.annotate(pe.kvRecord(PD).optional(), {
      redact: "presence",
    }),
    {
      flatKey: "inferenceCustomHeaders",
      readers: ["desktop", "m365", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.8089.0",
        },
        executionTarget: "desktop",
      },
      title: A.msg({
        defaultMessage: "Custom inference headers",
        id: "6T78KTXhBM",
      }),
      legacyFlatKey: {
        name: "inferenceGatewayHeaders",
        effect: "no custom inference headers will be sent",
        ...wi.BATCH_2026_09,
      },
      deprecations: [PD],
      category: "connection",
      order: 80,
      addLabel: A.msg({
        defaultMessage: "Add header",
        id: "IxbsWX4wj4",
      }),
      placeholder: {
        key: A.msg({
          defaultMessage: "X-Header-Name",
          id: "+gBb3x0fj/",
        }),
        value: A.msg({
          defaultMessage: "value",
          id: "7CyD7ey2Aw",
        }),
      },
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage:
              "Extra headers on every inference request \u2014 routing and tenant headers only (org IDs, Bedrock Guardrails). No credentials; use the credential helper for tokens.",
            id: "InfCustomHeadersHint2",
          }),
        ),
        long: P.longDescription(
          "Sent on every inference and model-discovery request (joined into the CLI's `ANTHROPIC_CUSTOM_HEADERS`).\n\nUse this for fleet-wide, non-secret constants. **Do not put API keys, bearer tokens or other credentials here** \u2014 this map is stored and distributed as plain configuration. For tokens, and for per-user or per-session values, have the **credential helper script** emit JSON with a `headers` field; those are merged over these static entries (helper wins on conflict).",
        ),
      },
      predicates: {
        warn: (e, t, n) => AD.credentialHeadersWarn(e, n, "credentialHelper"),
      },
    },
  );
  var sessionLifetimeSec = P.field(K.z.coerce.number().int().positive().optional(), {
    flatKey: "inferenceSessionLifetimeSec",
    support: {
      enabled: {
        scopes: ["3p"],
        availableInVersion: "1.14271.0",
      },
      executionTarget: "desktop",
    },
    title: A.msg({
      defaultMessage: "Sign-in session lifetime",
      id: "InfSessLifetime",
    }),
    category: "connection",
    suffix: A.msg({
      defaultMessage: "seconds",
      id: "8TQoLRh7Ea",
    }),
    predicates: {
      show: (e) => {
        var t;
        var n;
        let kind =
          (n = (t = e.inference) === null || t === undefined ? undefined : t.credential) === null ||
          n === undefined
            ? undefined
            : n.kind;
        return kind !== undefined && pa.SIGN_IN_CREDENTIAL_KINDS.includes(kind);
      },
    },
    description: {
      short: P.shortDescription(
        A.msg({
          defaultMessage:
            "How long a sign-in stays valid under your IdP\u2019s session policy. Shows a re-authenticate banner before it expires.",
          id: "InfSessLifeHint",
        }),
      ),
    },
  });
  var Ec = {
    customHeaders,
    sessionLifetimeSec,
  };
  var command = P.field(
    P.annotate(K.z.string().trim().optional(), {
      pathKind: "file",
    }),
    {
      flatKey: "inferenceCredentialHelper",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
      },
      remotePolicy: {
        requiresUserConsent: true,
      },
      title: A.msg({
        defaultMessage: "Helper script",
        id: "DnXPcFgmqb",
      }),
      category: "connection",
      group: pe.HELPER_SCRIPT_GROUP,
      order: -10,
      predicates: {
        required: (e) => !pe.hasActiveBootstrap(e),
      },
      placeholder: A.msg({
        defaultMessage: "/usr/local/bin/corp-cred-helper",
        id: "19vfTFVJFY",
      }),
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage:
              "Absolute path to an executable that prints the credential, optionally with per-request headers.",
            id: "pBgZotXlmX",
          }),
        ),
        long: P.longDescription(
          'Claude runs the executable with the entries of **Helper script arguments** as its arguments (none by default) and reads **stdout** (trimmed). Exit code must be `0`; any output on **stderr** is logged but ignored. **Stdout must contain only one of the formats below** (no banners, prompts, or log lines).\n\n**Output format** is either:\n- a single bare token (the API key / bearer token), or\n- a JSON object `{"token": "...", "headers": {"Name": "Value", ...}}` when per-request headers are needed (merged over **Custom inference headers**, helper wins on conflict)\n\nThe helper receives `CLAUDE_HELPER_CONTEXT` in its environment (`interactive`, `mid-session-refresh`, `background`, `scheduled-task`, `setup-test`) so it can decide whether to prompt the user \u2014 see the credential-helper docs for the full contract.\n\nResult is cached for the TTL below. On TTL expiry the helper is re-invoked transparently (no user prompt, no relaunch).\n\n**Expiry and refresh:** the app checks the active credential\'s expiry before each turn and refreshes silently when possible (re-runs the helper, or uses the stored refresh token for interactive sign-in kinds). If the provider returns HTTP 401 mid-turn, the same silent refresh is attempted before surfacing an error. When silent refresh fails, a prompt appears with a provider-specific action (re-sign-in for interactive kinds; admin-contact for static credentials). Applies to all providers, and to both Cowork and Code.\n\n**Typical use:** a shell script that pulls from Keychain, 1Password CLI, or an internal secret broker. Example:\n\n`security find-generic-password -s anthropic-api -w`\n\nIf this field is set, static credential fields (API key, bearer token) are ignored. The helper always wins.',
        ),
      },
    },
  );
  var ttlSec = P.field(K.z.coerce.number().int().positive().optional(), {
    flatKey: "inferenceCredentialHelperTtlSec",
    readers: ["desktop", "code"],
    support: {
      enabled: {
        scopes: ["3p"],
        availableInVersion: "1.2581.0",
      },
    },
    remotePolicy: {
      requiresUserConsent: true,
    },
    title: A.msg({
      defaultMessage: "Helper script TTL",
      id: "RtLYfLZ2bT",
    }),
    default: 3600,
    category: "connection",
    group: pe.HELPER_SCRIPT_GROUP,
    order: -9,
    suffix: A.msg({
      defaultMessage: "seconds",
      id: "8TQoLRh7Ea",
    }),
    description: {
      short: P.shortDescription(
        A.msg({
          defaultMessage:
            "Helper output is cached for this many seconds; once it expires the helper re-runs without a relaunch (before the next turn when set above 120).",
          id: "Iyb8zIzeLu",
        }),
      ),
    },
    predicates: {
      show: (e) => Boolean(pe.credentialHelperCommandOf(e)),
    },
  });
  var timeoutSec = P.field(K.z.coerce.number().int().positive().max(600).optional(), {
    flatKey: "inferenceCredentialHelperTimeoutSec",
    readers: ["desktop", "code"],
    support: {
      enabled: {
        scopes: ["3p"],
        availableInVersion: "1.8089.0",
      },
    },
    remotePolicy: {
      requiresUserConsent: true,
    },
    title: A.msg({
      defaultMessage: "Credential helper timeout",
      id: "x8r3+rMaHq",
    }),
    default: 60,
    category: "connection",
    group: pe.HELPER_SCRIPT_GROUP,
    order: -8,
    suffix: A.msg({
      defaultMessage: "seconds",
      id: "8TQoLRh7Ea",
    }),
    description: {
      short: P.shortDescription(
        A.msg({
          defaultMessage:
            "Maximum wait for the helper executable to finish. Raise this if the helper opens a browser for interactive sign-in.",
          id: "mWsGjRx48v",
        }),
      ),
    },
    predicates: {
      show: (e) => Boolean(pe.credentialHelperCommandOf(e)),
    },
  });
  var silentRefreshEnabled = P.field(K.z.boolean().optional(), {
    flatKey: "inferenceCredentialHelperSilentRefreshEnabled",
    readers: ["desktop", "code"],
    support: {
      enabled: {
        scopes: ["3p"],
        availableInVersion: "1.10628.0",
      },
    },
    remotePolicy: {
      requiresUserConsent: true,
    },
    title: A.msg({
      defaultMessage: "Re-run helper for silent refresh",
      id: "iLlsz1BLkf",
    }),
    default: true,
    failClosedValue: false,
    category: "connection",
    group: pe.HELPER_SCRIPT_GROUP,
    order: -7,
    description: {
      short: P.shortDescription(
        A.msg({
          defaultMessage:
            "On credential expiry, re-run the helper (CLAUDE_HELPER_CONTEXT=mid-session-refresh) to recover silently. Turn off if the helper can\u2019t run non-interactively.",
          id: "8KuyIP86Pe",
        }),
      ),
    },
    predicates: {
      show: (e) => Boolean(pe.credentialHelperCommandOf(e)),
    },
  });
  var profile = P.field(
    P.annotate(K.z.string().optional(), {
      redact: "hash",
    }),
    {
      flatKey: "inferenceBedrockProfile",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
        executionTarget: "desktop",
      },
      remotePolicy: {
        requiresUserConsent: true,
      },
      title: A.msg({
        defaultMessage: "AWS profile name",
        id: "7vTavgWpok",
      }),
      category: "connection",
      placeholder: A.msg({
        defaultMessage: "default",
        id: "FiXNt10l2f",
      }),
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage: "AWS named profile to use for Bedrock inference credentials.",
            id: "InfBedrockProfileHint",
          }),
          {
            docsOnly: true,
          },
        ),
      },
    },
  );
  var awsDir = P.field(
    P.annotate(K.z.string().optional(), {
      pathKind: "folder",
    }),
    {
      flatKey: "inferenceBedrockAwsDir",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
        executionTarget: "desktop",
      },
      remotePolicy: {
        requiresUserConsent: true,
      },
      title: A.msg({
        defaultMessage: "AWS config directory",
        id: "+/yYn89HLV",
      }),
      category: "connection",
      placeholder: A.msg({
        defaultMessage: "~/.aws",
        id: "pz/AYYggAV",
      }),
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage:
              "Folder with AWS config/credentials. Defaults to ~/.aws when no bearer token is set.",
            id: "+iG8JNhLmB",
          }),
        ),
      },
    },
  );
  var awsCliPath = P.field(
    P.annotate(K.z.string().trim().optional(), {
      pathKind: "file",
    }),
    {
      flatKey: "inferenceBedrockAwsCliPath",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.13576.0",
        },
        executionTarget: "desktop",
      },
      remotePolicy: {
        requiresUserConsent: true,
      },
      title: A.msg({
        defaultMessage: "AWS CLI path",
        id: "tiw5Kg3lNu",
      }),
      category: "connection",
      placeholder: A.msg({
        defaultMessage: "/usr/local/bin/aws",
        id: "r5vv3VwyH+",
      }),
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage: "Absolute path to the aws executable. Leave unset to find it on PATH.",
            id: "aGOycTUbE0",
          }),
        ),
      },
    },
  );
  var region = P.field(
    P.annotate(Av.optional(), {
      redact: "keep",
    }),
    {
      flatKey: "inferenceBedrockRegion",
      readers: ["desktop", "m365", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
        executionTarget: "desktop",
      },
      title: A.msg({
        defaultMessage: "AWS region",
        id: "idJaPSX8EP",
      }),
      egressRequirements: (e, t) => {
        var n;
        var o;
        var r;
        var s;
        if (!e) return [];
        if (((n = t.inference) === null || n === undefined ? undefined : n.provider) === "mantle")
          return [
            (o = zt.egressAddress(t.inference.baseUrl)) !== null && o !== undefined
              ? o
              : zt.mantleRuntimeHost(e),
          ];
        if (((r = t.inference) === null || r === undefined ? undefined : r.provider) !== "bedrock") return [];
        let kind = (s = t.inference.credential) === null || s === undefined ? undefined : s.kind;
        return zt.bedrockHosts(e, kind === "static" || kind === "external-idp", {
          inferenceHost: zt.egressAddress(t.inference.baseUrl),
          includeControlPlane: kind !== "external-idp",
        });
      },
      category: "connection",
      predicates: {
        required: (e) => !pe.hasActiveBootstrap(e),
      },
      placeholder: A.msg({
        defaultMessage: "us-west-2",
        id: "QxWCILUZ/n",
      }),
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage: "AWS region for the Bedrock runtime endpoint.",
            id: "Sijf7QyRi3",
          }),
        ),
      },
    },
  );
  var fm = {
    rejectLoopback: true,
    hybrid: {
      loopback: true,
    },
    originPinned: {
      carries: "local-credential",
    },
    requiresUserConsent: true,
  };
  var baseUrl = P.field(
    P.annotate(Fn.httpsUrl.optional(), {
      redact: "hostname",
    }),
    {
      flatKey: "inferenceBedrockBaseUrl",
      readers: ["desktop", "m365", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
        executionTarget: "desktop",
      },
      remotePolicy: fm,
      title: A.msg({
        defaultMessage: "Bedrock base URL",
        id: "GzwfABozww",
      }),
      category: "connection",
      placeholder: (e, t) => {
        var n;
        return ((n = t.inference) === null || n === undefined ? undefined : n.provider) === "mantle"
          ? e.formatMessage({
              defaultMessage: "https://bedrock-mantle.us-east-1.api.aws/anthropic",
              id: "LpWFX2Ofrj",
            })
          : e.formatMessage({
              defaultMessage: "https://vpce-0123-abcd.bedrock-runtime.us-east-1.vpce.amazonaws.com",
              id: "pl7XHUmb+2",
            });
      },
      description: {
        short: P.shortDescription((e, t) => {
          var n;
          return ((n = t.inference) === null || n === undefined ? undefined : n.provider) === "mantle"
            ? e.formatMessage({
                defaultMessage:
                  "Full SDK base URL including the /anthropic path (replaces bedrock-mantle.REGION.api.aws/anthropic).",
                id: "6XeDArE1XW",
              })
            : e.formatMessage({
                defaultMessage: "For VPC endpoints or gateway proxies. Host origin only.",
                id: "k/mN+Jo2Rg",
              });
        }),
      },
    },
  );
  var bearerToken = P.field(
    P.annotate(K.z.string().optional(), {
      redact: "drop",
    }),
    {
      flatKey: "inferenceBedrockBearerToken",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
        executionTarget: "desktop",
      },
      title: A.msg({
        defaultMessage: "AWS bearer token",
        id: "6eMQjpT3Y9",
      }),
      category: "connection",
      predicates: {
        required: (e) => !pe.hasActiveBootstrap(e),
      },
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage:
              "Static bearer token for inference. For providers that support profile or helper-script credentials, prefer those.",
            id: "InfBedrockBearerHint",
          }),
          {
            docsOnly: true,
          },
        ),
      },
    },
  );
  var Nle = K.z.object({
    profile: P.subfield(K.z.string().optional(), {
      label: A.msg({
        defaultMessage: "AWS profile name",
        id: "7vTavgWpok",
      }),
      flatKey: "inferenceBedrockProfile",
      readers: ["desktop", "code"],
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage: "Passed to the helper script as AWS_PROFILE.",
            id: "6wPhKgqOn6",
          }),
        ),
      },
    }),
    awsDir: P.subfield(K.z.string().optional(), {
      label: A.msg({
        defaultMessage: "AWS config directory",
        id: "+/yYn89HLV",
      }),
      flatKey: "inferenceBedrockAwsDir",
      readers: ["desktop", "code"],
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage:
              "Directory holding the AWS config and credentials files. Passed to the helper script as AWS_CONFIG_FILE and AWS_SHARED_CREDENTIALS_FILE.",
            id: "L1uzgaNLUf",
          }),
        ),
      },
    }),
    awsCliPath: P.subfield(K.z.string().optional(), {
      label: A.msg({
        defaultMessage: "AWS CLI path",
        id: "tiw5Kg3lNu",
      }),
      flatKey: "inferenceBedrockAwsCliPath",
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage:
              "Absolute path to the aws executable, shared with the Bedrock profile setting. Not passed to the helper script.",
            id: "35P0bh+Emr",
          }),
        ),
      },
    }),
    region: P.subfield(Av.optional(), {
      label: A.msg({
        defaultMessage: "AWS region",
        id: "+x+1RE2/ti",
      }),
      flatKey: "inferenceBedrockRegion",
      readers: ["desktop", "code"],
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage: "Passed to the helper script as AWS_REGION.",
            id: "f68mUNmj7g",
          }),
        ),
      },
    }),
  });
  UD.helperScriptLeaves = {
    command,
    commandWindows: P.field(
      P.annotate(Fn.safeWindowsHelperPath.optional(), {
        pathKind: "file",
      }),
      {
        flatKey: "inferenceCredentialHelperWindows",
        readers: ["desktop", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "2.2553.0",
          },
        },
        platformVariant: {
          of: "inferenceCredentialHelper",
          platform: "win32",
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        selectsConnection: true,
        title: A.msg({
          defaultMessage: "Helper script (Windows)",
          id: "xUFWSaPP1w",
        }),
        category: "connection",
        group: pe.HELPER_SCRIPT_GROUP,
        order: -9.9,
        placeholder: A.msg({
          defaultMessage: "C:\\Program Files\\Corp\\cred-helper.exe",
          id: "xUm3tL647e",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "Absolute path of the helper executable on Windows devices, used there instead of Helper script. Leave unset to use Helper script on every operating system.",
              id: "/E7aYcf6cf",
            }),
          ),
          long: P.longDescription(
            "When one configuration serves both Windows and macOS or Linux devices, set **Helper script** to the macOS/Linux path and this to the Windows path (`C:\\...` or `C:/...`). Windows devices run this executable with the same arguments, timeout, TTL and environment as **Helper script**; macOS and Linux devices ignore it. An invalid value here stops the connection on Windows devices only. Desktop releases that predate this setting ignore it and run **Helper script** on every operating system.",
          ),
        },
        predicates: {
          show: (e) => Boolean(pe.credentialHelperCommandOf(e)),
        },
      },
    ),
    args: P.field(
      P.annotate(K.z.array(Fn.safeHelperArg), {
        maxItems: 32,
      }).optional(),
      {
        flatKey: "inferenceCredentialHelperArgs",
        readers: ["desktop", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "2.110.0",
          },
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        selectsConnection: true,
        title: A.msg({
          defaultMessage: "Helper script arguments",
          id: "3FLCLSsNxv",
        }),
        category: "connection",
        group: pe.HELPER_SCRIPT_GROUP,
        order: -9.5,
        mono: true,
        control: "json",
        placeholder: A.msg({
          defaultMessage: '["--environment", "production"]',
          id: "ymzVVGWwhS",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "Arguments passed to the helper script, one per entry, in order. Leave unset to run it with none.",
              id: "1gCf5ARH90",
            }),
          ),
          long: P.longDescription(
            'Each entry reaches the executable as one argument, exactly as written: `["--environment", "production"]` runs `helper --environment production`. Use it to keep one installed script and let the configuration each user receives decide what it does (which environment, tenant or vault to read), instead of packaging a script per case.\n\nEntries may not be empty and may not contain a double quote (`"`), a percent sign (`%`) or control characters, on any platform: a Windows `.cmd`/`.bat` helper receives its arguments through `cmd.exe`, where those characters would change the command. A `.cmd`/`.bat` script sees each argument quoted (`%1` is `"production"`, `%~1` strips the quotes); `.ps1`, `.exe` and POSIX helpers receive them bare. Arguments are visible in the diagnostic report and to other processes on the machine, so do not put secrets in them; the helper exists to fetch the secret.\n\nA changed list takes effect the way a changed path does.',
          ),
        },
        predicates: {
          show: (e) => Boolean(pe.credentialHelperCommandOf(e)),
        },
      },
    ),
    ttlSec,
    timeoutSec,
    silentRefreshEnabled,
  };
  var RD = {
    kind: K.z.literal("helper-script"),
    ...UD.helperScriptLeaves,
    awsEnv: Nle.optional(),
  };
  UD.HelperScriptCreds = K.z.object(RD);
  var pm = (e) =>
    P.annotate(e, {
      remotePolicy: {
        hybrid: {
          scope: "excluded",
        },
      },
    });
  UD.GATEWAY_AUTH_SCHEME_SSO = {
    path: 'inferenceGatewayAuthScheme: "sso"',
    use: 'inferenceCredentialKind: "interactive"',
    effect: "the original spelling will keep working; no end date has been set",
    match: (e) => e === "sso",
    rewrite: () => {
      return;
    },
  };
  UD.GATEWAY_AUTH_SCHEME_AUTO = {
    path: 'inferenceGatewayAuthScheme: "auto"',
    use: '"bearer" (or remove the key \u2014 bearer is the default)',
    effect:
      'the value will be reported as invalid and ignored like any unrecognised scheme; the key will then take its default, "bearer", so the credential will still be sent as an Authorization: Bearer header',
    ...wi.BATCH_2026_09,
    match: (e) => e === "auto",
    rewrite: () => "bearer",
  };
  var DD = (e, t) =>
    (e === null || e === undefined ? undefined : e.bearerTokenType) === "access_token" &&
    !(e.resource && !t) &&
    !Fn.scopesIncludeResourceScope(e.scopes);
  var Ule = (e) => (typeof e.inferenceProvider === "string" ? e.inferenceProvider : undefined);
  var fa = (e) => e !== undefined && e !== null && (typeof e !== "string" || e.trim() !== "");
  UD.VERTEX_OAUTH_CREDENTIAL_KIND = {
    path: 'inferenceCredentialKind: "oauth" (Vertex AI)',
    use: '"interactive" \u2014 the same Google sign-in under its new name (in hosted or nested documents, switch once every desktop is on a release that knows the Vertex "interactive" kind)',
    effect:
      '"oauth" will no longer be a Vertex AI credential kind: the value will be reported as invalid and ignored \u2014 the device will then derive the kind from the credential fields present (Google sign-in when an OAuth client id is set), and the hosted editor will refuse to save the configuration until the kind is changed',
    ...wi.BATCH_2026_09,
    match: (e, t) => typeof e === "string" && pa.legacyCredentialKindAlias(Ule(t), e) !== undefined,
  };
  UD.VERTEX_INTERACTIVE_WITH_AUDIENCE = {
    path: 'inferenceCredentialKind: "interactive" together with inferenceVertexWorkforceAudience (Vertex AI)',
    use: '"workforce" \u2014 or remove inferenceVertexWorkforceAudience if Google sign-in ("interactive") is what is meant',
    effect:
      'the audience will no longer imply Workforce Identity: the kind will stay "interactive" (Google sign-in), which needs inferenceVertexOAuthClientId \u2014 without it the configuration will be reported as incomplete and inference will not start',
    ...wi.BATCH_2026_09,
    match: (e, t) =>
      t.inferenceProvider === "vertex" &&
      typeof e === "string" &&
      (e === "interactive" || pa.legacyCredentialKindAlias("vertex", e) === "interactive") &&
      fa(t.inferenceVertexWorkforceAudience) &&
      !fa(t.inferenceVertexOAuthClientId),
  };
  var authScheme = P.field(
    K.z
      .preprocess(
        (e) => wi.applyLegacy(UD.GATEWAY_AUTH_SCHEME_SSO, wi.applyLegacy(UD.GATEWAY_AUTH_SCHEME_AUTO, e)),
        K.z.enum(["bearer", "x-api-key"]),
      )
      .optional(),
    {
      flatKey: "inferenceGatewayAuthScheme",
      readers: ["desktop", "m365", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.3036.0",
        },
        executionTarget: "desktop",
      },
      title: A.msg({
        defaultMessage: "Gateway auth scheme",
        id: "tmwK1KjFte",
      }),
      deprecations: [UD.GATEWAY_AUTH_SCHEME_SSO, UD.GATEWAY_AUTH_SCHEME_AUTO],
      default: "bearer",
      category: "connection",
      predicates: {
        show: (e) => {
          var t;
          var n;
          let kind =
            (n = (t = e.inference) === null || t === undefined ? undefined : t.credential) === null ||
            n === undefined
              ? undefined
              : n.kind;
          return kind === "static" || kind === "helper-script";
        },
      },
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage:
              "How the gateway credential is sent on the wire (Authorization: Bearer vs x-api-key header).",
            id: "WsT/E/qNoC",
          }),
        ),
      },
    },
  );
  var zle = pm(
    K.z.object({
      kind: K.z.literal("static"),
      apiKey: P.field(
        P.annotate(K.z.string().optional(), {
          redact: "drop",
        }),
        {
          flatKey: "inferenceGatewayApiKey",
          readers: ["desktop", "m365"],
          support: {
            enabled: {
              scopes: ["3p"],
              availableInVersion: "1.2581.0",
            },
            executionTarget: "desktop",
          },
          title: A.msg({
            defaultMessage: "Gateway API key",
            id: "NA4SBfPMeA",
          }),
          category: "connection",
          predicates: {
            required: (e) => !pe.hasActiveBootstrap(e),
          },
          description: {
            short: P.shortDescription(
              A.msg({
                defaultMessage: "API key for the configured inference gateway.",
                id: "InfGatewayApiKeyHint",
              }),
              {
                docsOnly: true,
              },
            ),
          },
        },
      ),
      authScheme,
    }),
  );
  var Fle = K.z.object({
    ...RD,
    authScheme,
  });
  function Iv(e) {
    let t = e.setupNotesKey !== e.oidcKey;
    return P.longDescription(
      `- **\`browser\`** (default) \u2014 opens the system browser for an authorization-code (PKCE) sign-in on a loopback redirect URI. See the **IdP setup** notes on \`${e.setupNotesKey}\` for redirect-URI registration${t ? "; the same rules apply here" : ""}.
` +
        `- **\`broker\`** \u2014 signs in through the OS identity broker (Web Account Manager on Windows, Company Portal on macOS). Requires the ${e.idp} to be **Microsoft Entra ID** \u2014 the \`issuer\` on \`${e.oidcKey}\` must be \`https://login.microsoftonline.com/{tenant-id}/v2.0\`. The broker satisfies Conditional Access policies that require a compliant/managed device or token protection, and needs no loopback redirect. The Entra app registration must include the broker redirect URIs \`ms-appx-web://Microsoft.AAD.BrokerPlugin/{client-id}\` (Windows) and \`msauth.com.anthropic.claudefordesktop://auth\` (macOS) under the **Mobile and desktop applications** platform. Not supported on Linux.` +
        (e.trailing === undefined
          ? ""
          : `

${e.trailing}`),
    );
  }
  UD.idpSignInShape = {
    authFlow: P.field(K.z.enum(["browser", "broker"]).optional(), {
      flatKey: "inferenceIdpAuthFlow",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.7032.0",
        },
      },
      title: A.msg({
        defaultMessage: "Identity provider sign-in flow",
        id: "InfIdpAuthFlow",
      }),
      category: "connection",
      notAPresenceSignal: true,
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage:
              "How the identity-provider sign-in runs: system browser (default) or the OS Microsoft Entra broker.",
            id: "InfIdpAuthFlowShort",
          }),
        ),
        long: Iv({
          oidcKey: "inferenceIdpOidc",
          setupNotesKey: "inferenceIdpOidc",
          idp: "IdP",
          trailing:
            "Broker mode mints a token in the customer's own Entra tenant with the customer-configured `scopes` and forwards it to the customer's own gateway or proxy; both endpoints of that trust relationship are inside the customer's control.",
        }),
      },
    }),
    oidc: P.field(Fn.GatewayOidc.optional(), {
      flatKey: "inferenceIdpOidc",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.7032.0",
        },
      },
      remotePolicy: {
        requiresUserConsent: true,
      },
      selectsConnection: true,
      title: A.msg({
        defaultMessage: "Identity provider (OIDC)",
        id: "InfIdpOidc",
      }),
      predicates: {
        required: (e) => !pe.hasActiveBootstrap(e),
        warn: (e, t) => {
          var n;
          return DD(
            e,
            t !== undefined &&
              pe.credentialKindOf(t) === "external-idp" &&
              ((n = pe.activeCredentialOf(t)) === null || n === undefined ? undefined : n.authFlow) ===
                "broker",
          )
            ? A.msg({
                defaultMessage:
                  "No API resource scope set. On IdPs where the requested scopes decide the access-token audience (e.g. Entra ID), this yields a token for the IdP\u2019s own APIs, not your gateway or proxy. Add its API scope (Entra: api://APP_ID/.default). Ignore this if your IdP sets the token audience out-of-band (Keycloak audience mapper, Auth0 default audience, Okta custom-AS audience).",
                id: "IdpScopeNoResourceWarn",
              })
            : null;
        },
      },
      egressRequirements: (e, t) => (pe.credentialKindOf(t) === "external-idp" ? pe.oidcEgressHosts(e) : []),
      egressRequirementsLabel: A.msg({
        defaultMessage: "Identity provider (OIDC) sign-in hosts",
        id: "InfIdpOidcEgress",
      }),
      category: "connection",
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage:
              "Your organization\u2019s OpenID Connect identity provider. The user\u2019s token is sent as the Bearer credential to the gateway or the Bedrock proxy.",
            id: "InfIdpOidcShort",
          }),
        ),
        long: P.longDescription(
          'Used with `inferenceCredentialKind: "external-idp"`. The app discovers `<issuer>/.well-known/openid-configuration`, runs an OIDC authorization-code (PKCE) sign-in in the browser with `clientId` (or through the OS broker, see `inferenceIdpAuthFlow`) and sends the token as `Authorization: Bearer` on every inference request: to `inferenceGatewayBaseUrl` on the gateway provider, or on Bedrock to `inferenceBedrockBaseUrl`, which is then required: only a proxy that validates the token accepts it, never Amazon Bedrock itself (to sign in straight to Bedrock use `interactive`, AWS IAM Identity Center). On Bedrock this kind has no model discovery: list the models in `inferenceModels`.\n\n**Bearer token type.** `id_token` (the default) sends the OIDC ID token; the receiver validates signature, `iss` and `aud` (the `clientId` here). `access_token` sends the OAuth access token, for gateways and proxies that validate as an OAuth resource server; `scopes` must then name the registered API scope. Either way the receiver must check `aud`, or it accepts any token from your tenant.\n\n**IdP setup.** The callback is `http://127.0.0.1:<port>/callback` (`localhost` with `redirectHost: "localhost"`); register exactly that. **Entra:** a public-client app with a *Mobile and desktop applications* redirect URI `http://127.0.0.1/callback` (omitting the path fails with `AADSTS50011`); in `access_token` mode also grant the API\'s delegated permission, or sign-in fails with `AADSTS65001`. **Okta:** a *Native* app with `http://127.0.0.1:<port>/callback` and that port in `redirectPort`.\n\n**Refresh.** With `offline_access` the app renews the token silently and asks for a browser sign-in only when refresh fails (Google returns no `id_token` on refresh, so `id_token` mode there re-prompts about hourly).\n\n**Older names.** Gateway configurations written before this key use `inferenceGatewayOidc` / `inferenceGatewayOidcAuthFlow` with the `interactive` kind; they stay readable and mean the same sign-in.',
          {
            docsUrl: `${pe.COWORK_3P_DOCS_BASE}/configuration#inferenceidpoidc`,
          },
        ),
      },
    }),
  };
  var jD = K.z.object({
    kind: K.z.literal("external-idp"),
    ...UD.idpSignInShape,
  });
  var idpSignInShape = UD.idpSignInShape;
  UD.IDP_OIDC_FLAT_KEY =
    (Sv = P.fieldMetaForNode(idpSignInShape.oidc)) === null || Sv === undefined ? undefined : Sv.flatKey;
  UD.IDP_AUTH_FLOW_FLAT_KEY =
    (kv = P.fieldMetaForNode(idpSignInShape.authFlow)) === null || kv === undefined ? undefined : kv.flatKey;
  var xD = (e, t) =>
    UD.IDP_OIDC_FLAT_KEY !== undefined &&
    t.inferenceProvider === "gateway" &&
    fa(e) &&
    (!fa(t.inferenceCredentialKind) ||
      t.inferenceCredentialKind === "interactive" ||
      t.inferenceCredentialKind === "external-idp");
  UD.GATEWAY_IDP_OIDC_KEY = {
    path: "inferenceGatewayOidc",
    use: `${UD.IDP_OIDC_FLAT_KEY} with inferenceCredentialKind: "external-idp" once every desktop in the fleet is on a release that reads them`,
    effect: "the original spelling will keep working; no end date has been set",
    editorPreserves: true,
    match: xD,
  };
  UD.GATEWAY_IDP_AUTH_FLOW_KEY = {
    path: "inferenceGatewayOidcAuthFlow",
    use: `${UD.IDP_AUTH_FLOW_FLAT_KEY} together with ${UD.IDP_OIDC_FLAT_KEY} once every desktop in the fleet is on a release that reads them`,
    effect: "the original spelling will keep working; no end date has been set",
    editorPreserves: true,
    match: (e, t) =>
      xD(e, t) &&
      (fa(t.inferenceGatewayOidc) || (UD.IDP_OIDC_FLAT_KEY !== undefined && fa(t[UD.IDP_OIDC_FLAT_KEY]))),
  };
  UD.GATEWAY_INTERACTIVE_WITH_IDP = {
    path: 'inferenceCredentialKind: "interactive" together with inferenceGatewayOidc (gateway)',
    use: '"external-idp" once every desktop in the fleet is on a release that reads it',
    effect:
      'the original spelling will keep working ("interactive" with inferenceGatewayOidc is read as "external-idp"); no end date has been set',
    editorPreserves: true,
    match: (e, t) =>
      UD.IDP_OIDC_FLAT_KEY !== undefined &&
      t.inferenceProvider === "gateway" &&
      e === "interactive" &&
      (fa(t.inferenceGatewayOidc) || fa(t[UD.IDP_OIDC_FLAT_KEY])),
  };
  function Ble() {
    let e = P.fieldMetaForNode(idpSignInShape.oidc);
    return e !== undefined && P.isReleasedFor3p(e);
  }
  function Hle() {
    return UD.IDP_OIDC_FLAT_KEY === undefined || UD.IDP_AUTH_FLOW_FLAT_KEY === undefined
      ? []
      : [
          [UD.GATEWAY_IDP_OIDC_KEY.path, UD.IDP_OIDC_FLAT_KEY],
          [UD.GATEWAY_IDP_AUTH_FLOW_KEY.path, UD.IDP_AUTH_FLOW_FLAT_KEY],
        ];
  }
  function Kle(e) {
    if (UD.IDP_OIDC_FLAT_KEY !== undefined && e === UD.IDP_OIDC_FLAT_KEY) return UD.GATEWAY_IDP_OIDC_KEY.path;
    if (UD.IDP_AUTH_FLOW_FLAT_KEY !== undefined && e === UD.IDP_AUTH_FLOW_FLAT_KEY)
      return UD.GATEWAY_IDP_AUTH_FLOW_KEY.path;
    return;
  }
  var whereIdpKeysExist = (e) => (UD.IDP_OIDC_FLAT_KEY === undefined ? [] : [e]);
  UD.whereIdpKeysExist = whereIdpKeysExist;
  var Vle = K.z.discriminatedUnion("kind", [
    zle,
    K.z.object({
      kind: K.z.literal("interactive"),
      authFlow: P.field(K.z.enum(["browser", "broker"]).optional(), {
        flatKey: "inferenceGatewayOidcAuthFlow",
        readers: ["desktop", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.25927.0",
          },
          executionTarget: "desktop",
        },
        title: A.msg({
          defaultMessage: "Gateway sign-in flow",
          id: "InfGatewayOidcAuthFlow",
        }),
        deprecations: UD.whereIdpKeysExist(UD.GATEWAY_IDP_AUTH_FLOW_KEY),
        category: "connection",
        notAPresenceSignal: true,
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "How the IdP sign-in runs: system browser (default) or the OS Microsoft Entra broker.",
              id: "InfGatewayOidcAuthFlowShort",
            }),
          ),
          long: Iv({
            oidcKey: "inferenceGatewayOidc",
            setupNotesKey: "inferenceGatewayOidc",
            idp: "IdP",
            trailing:
              "Broker mode mints a token in the customer's own Entra tenant with the customer-configured `scopes`, and forwards it to the customer's own gateway; both endpoints of that trust relationship are inside the customer's control. A desktop that has the `external-idp` kind reads this key, together with `inferenceGatewayOidc`, as that kind's sign-in flow; it stays readable.",
          }),
        },
      }),
      oidc: P.field(Fn.GatewayOidc.optional(), {
        flatKey: "inferenceGatewayOidc",
        readers: ["desktop", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.6889.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        selectsConnection: true,
        title: A.msg({
          defaultMessage: "Gateway SSO IdP (OIDC)",
          id: "FcISn6aVjf",
        }),
        deprecations: UD.whereIdpKeysExist(UD.GATEWAY_IDP_OIDC_KEY),
        predicates: {
          warn: (e, t) => {
            var n;
            var o;
            return DD(
              e,
              ((n = t === null || t === undefined ? undefined : t.inference) === null || n === undefined
                ? undefined
                : n.provider) === "gateway" &&
                ((o = t.inference.credential) === null || o === undefined ? undefined : o.kind) ===
                  "interactive" &&
                t.inference.credential.authFlow === "broker",
            )
              ? A.msg({
                  defaultMessage:
                    "No API resource scope set. On IdPs where the requested scopes decide the access-token audience (e.g. Entra ID), this yields a token for the IdP\u2019s own APIs \u2014 not your gateway. Add the gateway\u2019s API scope (Entra: api://GATEWAY_APP_ID/.default). Ignore this if your IdP sets the token audience out-of-band (Keycloak audience mapper, Auth0 default audience, Okta custom-AS audience).",
                  id: "GwScopeNoResourceWarn",
                })
              : null;
          },
        },
        egressRequirements: (e, t) => {
          var n;
          var o;
          return ((n = t.inference) === null || n === undefined ? undefined : n.provider) === "gateway" &&
            ((o = t.inference.credential) === null || o === undefined ? undefined : o.kind) === "interactive"
            ? pe.oidcEgressHosts(e)
            : [];
        },
        egressRequirementsLabel: A.msg({
          defaultMessage: "Gateway sign-in (OIDC)",
          id: "L+geN0DrtO",
        }),
        category: "connection",
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "External IdP for gateway sign-in. The user\u2019s token from this issuer is sent to the gateway as the Bearer credential.",
              id: "pRQIKI2d3D",
            }),
          ),
          long: P.longDescription(
            "**External IdP mode.** The app discovers `<issuer>/.well-known/openid-configuration`, runs an OIDC authorization-code-with-PKCE sign-in in the system browser with `clientId`, and sends the resulting token as `Authorization: Bearer` on every inference request. Leave this unset for a gateway that hosts its own RFC 8414 metadata at `<baseUrl>/.well-known/oauth-authorization-server`. A desktop that has the `external-idp` kind reads this block as that kind's identity-provider key; it stays readable, so a fleet keeps this spelling until every desktop is on such a release.\n\n**Bearer token type.** `id_token` (the default) sends the OIDC ID token; the gateway validates signature, `iss`, and `aud` (the `clientId` configured here). `access_token` sends the OAuth access token, for gateways that validate as a resource server (Portkey, Kong, Envoy JWT filter, AWS API Gateway authorizers); `scopes` must then name the gateway's registered API scope. Either way the gateway must check `aud`, not just signature and issuer, or it accepts any token from your tenant.\n\n**IdP setup.** The callback is `http://127.0.0.1:<port>/callback` by default (`http://localhost:<port>/callback` with `redirectHost: \"localhost\"`); register exactly the one you use and include `/callback`. **Entra:** a public-client app with a *Mobile and desktop applications* redirect URI of `http://127.0.0.1/callback` (any port; omitting the path fails with `AADSTS50011`); in `access_token` mode also grant the gateway API's delegated permission, or sign-in fails with `AADSTS65001`. **Okta:** a *Native* app with the exact URI `http://127.0.0.1:<port>/callback` and that port in `redirectPort`.\n\n**Refresh.** With `offline_access` the app renews the token silently and prompts a browser sign-in only when refresh fails. Google never returns an `id_token` on refresh, so a Google Workspace-backed gateway in `id_token` mode re-prompts about hourly; `access_token` mode is unaffected.",
            {
              docsUrl: `${pe.COWORK_3P_DOCS_BASE}/gateway#single-sign-on-with-your-identity-provider`,
            },
          ),
        },
      }),
    }),
    jD,
    Fle,
  ]);
  var qle = K.z.object({
    provider: K.z.literal("gateway"),
    baseUrl: P.field(
      P.annotate(Fn.httpsUrl.optional(), {
        redact: "hostname",
      }),
      {
        flatKey: "inferenceGatewayBaseUrl",
        readers: ["desktop", "m365", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.2581.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: {
          ...fm,
          originPinned: {
            carries: "server-issued-credential",
          },
        },
        title: A.msg({
          defaultMessage: "Gateway base URL",
          id: "JQs8c3pGcl",
        }),
        egressRequirements: (e, t) => {
          var n;
          return ((n = t.inference) === null || n === undefined ? undefined : n.provider) === "gateway"
            ? pe.singleHostEgress(e)
            : [];
        },
        category: "connection",
        predicates: {
          required: (e) => !pe.hasActiveBootstrap(e),
        },
        placeholder: A.msg({
          defaultMessage: "https://llm-gateway.example.com",
          id: "we1m4ZIlaP",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage: "Full URL of the inference gateway endpoint.",
              id: "6cmRKZgiFv",
            }),
          ),
        },
      },
    ),
    streamIdleTimeoutSec: P.field(K.z.coerce.number().int().min(300).max(1800).optional(), {
      flatKey: "inferenceStreamIdleTimeoutSec",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.44121.1",
        },
        executionTarget: "desktop",
      },
      title: A.msg({
        defaultMessage: "Stream idle timeout",
        id: "1zaCZqzDhD",
      }),
      category: "connection",
      order: 85,
      suffix: A.msg({
        defaultMessage: "seconds",
        id: "8TQoLRh7Ea",
      }),
      placeholder: A.msg({
        defaultMessage: "300",
        id: "ady/daA2aj",
      }),
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage:
              "Extra seconds to wait for model output on a streaming response that is sending only keep-alive pings. Gateway provider only. Default 300.",
            id: "vVjD8kgAio",
          }),
        ),
        long: P.longDescription(
          "Raises how long Cowork, Chat and Code sessions wait for the next model event on an open streaming response (Claude Code's `CLAUDE_STREAM_IDLE_TIMEOUT_MS`). It only helps when the gateway writes SSE keep-alive `ping` events (or `:` comment lines) into the response while the upstream model is silent \u2014 for example a LiteLLM proxy with keep-alive pings enabled in front of Amazon Bedrock. With pings arriving, Claude Code accepts at least about five minutes of keep-alives and then waits this many seconds more for real model output before abandoning the request. Gateway provider only; the other providers keep Claude Code's defaults.\n\nA response on which nothing at all arrives \u2014 no pings \u2014 still fails after about 5 minutes regardless of this key, because at the device a silent connection cannot be told apart from a dead one. If long generations fail behind a gateway that does not send pings, configure the gateway to send them rather than raising this value. A common case is automatic compaction, in which a session sends its whole conversation in one streaming request and waits for a long summary; when that request fails, the error reads `Prompt is too long \xB7 automatic compaction failed:` followed by the cause. While this key is set, the app's value takes precedence over `CLAUDE_STREAM_IDLE_TIMEOUT_MS` in Claude Code's own managed settings for sessions the app starts; when it is unset, that setting still applies. Values outside 300\u20131800 are rejected at parse time (the error is listed in the diagnostics report) and the default applies.",
          {
            docsUrl: `${pe.COWORK_3P_DOCS_BASE}/configuration#inferencestreamidletimeoutsec`,
          },
        ),
      },
    }),
    gatewayManagedClaudeCode: P.field(K.z.boolean().optional(), {
      flatKey: "inferenceGatewayManagedClaudeCode",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.9939.2",
        },
        executionTarget: "desktop",
        visibility: "public-undocumented",
      },
      title: A.msg({
        defaultMessage: "Gateway-managed Claude Code",
        id: "+Mc2p855y7",
      }),
      default: false,
      failClosedValue: false,
      category: "connection",
      order: 86,
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage:
              "When true, sessions for users signed in through the gateway\u2019s own sign-in run Claude Code in its gateway mode. Gateway provider only. Default false.",
            id: "YT+I9m2Ho0",
          }),
        ),
        long: P.longDescription(
          "Set this to `true` to run Claude Code in its gateway mode (`CLAUDE_CODE_USE_GATEWAY`) in Cowork, Chat and Code sessions for users who signed in through the gateway's own sign-in (`inferenceCredentialKind: interactive` with no organization identity provider configured). In gateway mode Claude Code turns off its usage analytics and authenticated calls to Anthropic (the WebFetch tool's hostname-only domain lookup is governed separately by `skipWebFetchPreflight`), and may hide its WebSearch tool. `false` keeps base-URL routing, where those sessions treat the gateway as the Anthropic API at a custom base URL. A change takes effect for sessions started after the next app launch. Other sign-in methods and other providers ignore this key, and in a third-party deployment a `CLAUDE_CODE_USE_GATEWAY` in a user's own environment is ignored for app sessions either way.",
        ),
      },
    }),
    ...Ec,
    credential: Vle.optional(),
  });
  var Gle = K.z.discriminatedUnion("kind", [
    pm(
      K.z.object({
        kind: K.z.literal("static"),
        apiKey: P.field(
          P.annotate(K.z.string().optional(), {
            redact: "drop",
          }),
          {
            flatKey: "inferenceAnthropicApiKey",
            support: {
              enabled: {
                scopes: ["3p"],
                availableInVersion: "1.8089.0",
              },
              executionTarget: "desktop",
            },
            title: A.msg({
              defaultMessage: "Claude API key",
              id: "5ykkZh9itH",
            }),
            category: "connection",
            placeholder: A.msg({
              defaultMessage: "sk-ant-\u2026",
              id: "yWgQU4eQPw",
            }),
            predicates: {
              required: (e) => !pe.hasActiveBootstrap(e),
            },
            description: {
              short: P.shortDescription(
                A.msg({
                  defaultMessage:
                    "Leave blank to fetch a key via browser sign-in, or to supply the key via a credential helper.",
                  id: "LqkJ93Y17Y",
                }),
              ),
            },
          },
        ),
      }),
    ),
    K.z.object({
      kind: K.z.literal("interactive"),
    }),
    UD.HelperScriptCreds,
  ]);
  var Wle = P.annotate(
    K.z.object({
      provider: K.z.literal("anthropic"),
      ...Ec,
      credential: Gle.optional(),
    }),
    {
      remotePolicy: {
        hybrid: {
          scope: "excluded",
        },
      },
    },
  );
  UD.AwsSigV4Credential = K.z.discriminatedUnion("kind", [
    K.z.object({
      kind: K.z.literal("interactive"),
      ssoStartUrl: P.field(pe.urlWithSchemeCoercion.optional(), {
        flatKey: "inferenceBedrockSsoStartUrl",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.6259.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: {
          rejectLoopback: true,
          requiresUserConsent: true,
        },
        title: A.msg({
          defaultMessage: "AWS SSO start URL",
          id: "M1ekod7Ohm",
        }),
        category: "connection",
        predicates: {
          required: (e) => !pe.hasActiveBootstrap(e),
        },
        placeholder: A.msg({
          defaultMessage: "https://d-1234567890.awsapps.com/start",
          id: "RFFH1lyEc7",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "Enables in-app AWS sign-in (no AWS CLI needed). Set with the three SSO fields below.",
              id: "Ahe51s8B/N",
            }),
          ),
        },
      }),
      ssoRegion: P.field(Av.optional(), {
        flatKey: "inferenceBedrockSsoRegion",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.6259.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        title: A.msg({
          defaultMessage: "AWS SSO region",
          id: "fVSO74vxG+",
        }),
        egressRequirements: (e, t) => {
          var n;
          return ((n = t.inference) === null || n === undefined ? undefined : n.provider) === "bedrock" && e
            ? [...zt.bedrockSsoHosts(e)]
            : [];
        },
        category: "connection",
        predicates: {
          required: (e) => !pe.hasActiveBootstrap(e),
        },
        placeholder: A.msg({
          defaultMessage: "us-east-1",
          id: "TR4NZQsAzg",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage: "IAM Identity Center home region.",
              id: "hrhyvgzlp8",
            }),
          ),
        },
      }),
      ssoAccountId: P.field(K.z.string().trim().min(1).optional(), {
        flatKey: "inferenceBedrockSsoAccountId",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.6259.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        title: A.msg({
          defaultMessage: "AWS SSO account ID",
          id: "SM396mPAdJ",
        }),
        category: "connection",
        predicates: {
          required: (e) => !pe.hasActiveBootstrap(e),
        },
        placeholder: A.msg({
          defaultMessage: "123456789012",
          id: "UGEnd0JtKP",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage: "12-digit AWS account ID assigned to users in IAM Identity Center.",
              id: "5ZymBsxYIf",
            }),
          ),
        },
      }),
      ssoRoleName: P.field(K.z.string().trim().min(1).optional(), {
        flatKey: "inferenceBedrockSsoRoleName",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.6259.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        title: A.msg({
          defaultMessage: "AWS SSO role name",
          id: "Us/KWk8ZwZ",
        }),
        category: "connection",
        predicates: {
          required: (e) => !pe.hasActiveBootstrap(e),
        },
        placeholder: A.msg({
          defaultMessage: "BedrockInference",
          id: "vgSQNDrmBi",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "IAM Identity Center permission-set name granting bedrock:InvokeModel* on the account above.",
              id: "vZ6g+h2+rD",
            }),
          ),
        },
      }),
    }),
    K.z.object({
      kind: K.z.literal("vendor-profile"),
      profile,
      awsDir,
      awsCliPath,
    }),
  ]);
  var LD = pm(
    K.z.object({
      kind: K.z.literal("static"),
      bearerToken,
    }),
  );
  var Yle = K.z.discriminatedUnion("kind", [LD, ...UD.AwsSigV4Credential.options, jD, UD.HelperScriptCreds]);
  var Jle = K.z.object({
    provider: K.z.literal("bedrock"),
    region,
    baseUrl,
    serviceTier: P.field(K.z.enum(["flex", "priority"]).optional(), {
      flatKey: "inferenceBedrockServiceTier",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.5186.0",
        },
        executionTarget: "desktop",
      },
      title: A.msg({
        defaultMessage: "Bedrock service tier",
        id: "RcMetnFGHz",
      }),
      category: "connection",
      placeholder: A.msg({
        defaultMessage: "(on-demand)",
        id: "7KENh/cIdm",
      }),
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage: "Sent as the X-Amzn-Bedrock-Service-Tier header. Leave unset for on-demand.",
            id: "/jpohGWrkJ",
          }),
        ),
        long: P.longDescription(
          "Tier availability varies by model and region. Reserved capacity uses a provisioned-throughput ARN as the model ID instead of this setting. Older bundled Claude Code CLI versions ignore this key.",
        ),
      },
    }),
    ...Ec,
    credential: Yle.optional(),
  });
  var Xle = K.z.discriminatedUnion("kind", [LD, UD.HelperScriptCreds]);
  var Qle = K.z.object({
    provider: K.z.literal("mantle"),
    region,
    baseUrl,
    ...Ec,
    credential: Xle.optional(),
  });
  var ece = K.z.discriminatedUnion("kind", [
    K.z.object({
      kind: K.z.literal("interactive"),
      clientId: P.field(K.z.string().trim().min(1).optional(), {
        flatKey: "inferenceVertexOAuthClientId",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.2581.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        title: A.msg({
          defaultMessage: "Vertex OAuth client ID",
          id: "uV5y1u6H7A",
        }),
        category: "connection",
        predicates: {
          required: (e) => !pe.hasActiveBootstrap(e),
        },
        placeholder: A.msg({
          defaultMessage: "NNN.apps.googleusercontent.com",
          id: "p/4qG0gjyQ",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "Desktop-app OAuth client ID. Enables Sign in with Google instead of a credentials file.",
              id: "uksEExpTuY",
            }),
          ),
        },
      }),
      clientSecret: P.field(
        P.annotate(K.z.string().trim().min(1).optional(), {
          redact: "presence",
        }),
        {
          flatKey: "inferenceVertexOAuthClientSecret",
          support: {
            enabled: {
              scopes: ["3p"],
              availableInVersion: "1.2581.0",
            },
            executionTarget: "desktop",
          },
          title: A.msg({
            defaultMessage: "Vertex OAuth client secret",
            id: "SM8Ak39Vjh",
          }),
          category: "connection",
          placeholder: A.msg({
            defaultMessage: "GOCSPX-...",
            id: "2pwaqX5iEv",
          }),
          description: {
            short: P.shortDescription(
              A.msg({
                defaultMessage:
                  "Secret for the Desktop-app OAuth client above. Google classifies installed-app client secrets as non-confidential, so this may be set from hosted config.",
                id: "VertexOAuthSecretHint2",
              }),
            ),
          },
        },
      ),
      scopes: P.field(K.z.string().trim().min(1).optional(), {
        flatKey: "inferenceVertexOAuthScopes",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.2581.0",
          },
          executionTarget: "desktop",
        },
        title: A.msg({
          defaultMessage: "Vertex OAuth scopes",
          id: "Wl626GK45n",
        }),
        category: "connection",
        placeholder: A.msg({
          defaultMessage: "openid email https://www.googleapis.com/auth/cloud-platform",
          id: "1QdLfinpa0",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "Override the Google OAuth scopes (space-separated). Leave blank for the default.",
              id: "6NwjCQmCZB",
            }),
          ),
        },
      }),
      loginHint: P.field(
        P.annotate(K.z.string().trim().min(1).optional(), {
          redact: "presence",
        }),
        {
          flatKey: "inferenceVertexOAuthLoginHint",
          support: {
            enabled: {
              scopes: ["3p"],
              availableInVersion: "1.12603.0",
            },
            executionTarget: "desktop",
          },
          title: A.msg({
            defaultMessage: "Vertex OAuth login hint",
            id: "HhOWSUTxff",
          }),
          category: "connection",
          placeholder: A.msg({
            defaultMessage: "'{username}'@example.com",
            id: "SiQK5/KBQz",
          }),
          description: {
            short: P.shortDescription(
              A.msg({
                defaultMessage:
                  "Pre-fill Google's account chooser and forward to your federated IdP. '{username}' expands to the OS login name.",
                id: "XLMVwXPbz1",
              }),
            ),
          },
        },
      ),
    }),
    K.z.object({
      kind: K.z.literal("workforce"),
      audience: P.field(K.z.string().trim().min(1).optional(), {
        flatKey: "inferenceVertexWorkforceAudience",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.10628.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        title: A.msg({
          defaultMessage: "Workforce Identity audience",
          id: "B9l27BNEGU",
        }),
        egressRequirements: (e, t) => {
          var n;
          var o;
          return ((n = t.inference) === null || n === undefined ? undefined : n.provider) === "vertex" &&
            ((o = t.inference.credential) === null || o === undefined ? undefined : o.kind) === "workforce" &&
            e
            ? [zt.GOOGLE_STS_HOST]
            : [];
        },
        egressRequirementsLabel: A.msg({
          defaultMessage: "Workforce Identity (STS)",
          id: "dKEgofbwpe",
        }),
        category: "connection",
        predicates: {
          required: (e) => !pe.hasActiveBootstrap(e),
        },
        placeholder: A.msg({
          defaultMessage: "//iam.googleapis.com/locations/global/workforcePools/POOL/providers/PROVIDER",
          id: "EBQHEgxMx3",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "Workforce-pool provider audience. When set, sign-in uses your own IdP plus a GCP STS exchange instead of a Google identity.",
              id: "cc4tPynCta",
            }),
          ),
        },
      }),
      userProject: P.field(
        P.annotate(CD.optional(), {
          redact: "hash",
        }),
        {
          flatKey: "inferenceVertexWorkforceUserProject",
          support: {
            enabled: {
              scopes: ["3p"],
              availableInVersion: "1.10628.0",
            },
            executionTarget: "desktop",
          },
          remotePolicy: {
            requiresUserConsent: true,
          },
          title: A.msg({
            defaultMessage: "Workforce Identity billing project",
            id: "T8t7Fu+JhP",
          }),
          category: "connection",
          description: {
            short: P.shortDescription(
              A.msg({
                defaultMessage:
                  "GCP project for STS billing and quota. Defaults to the Vertex project ID above.",
                id: "BCq+xoiDzP",
              }),
            ),
          },
        },
      ),
      authFlow: P.field(K.z.enum(["browser", "broker"]).optional(), {
        flatKey: "inferenceVertexWorkforceAuthFlow",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.25927.0",
          },
          executionTarget: "desktop",
        },
        title: A.msg({
          defaultMessage: "Workforce Identity sign-in flow",
          id: "InfVertexWifAuthFlow",
        }),
        category: "connection",
        notAPresenceSignal: true,
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "How the IdP sign-in runs: system browser (default) or the OS Microsoft Entra broker.",
              id: "InfVertexWifAuthFlowShort",
            }),
          ),
          long: Iv({
            oidcKey: "inferenceVertexWorkforceOidc",
            setupNotesKey: "inferenceGatewayOidc",
            idp: "workforce-pool IdP",
            trailing:
              "The GCP STS token-exchange step is unchanged in either flow; only how the Entra id_token is acquired differs.",
          }),
        },
      }),
      oidc: P.field(Fn.BootstrapOidc.optional(), {
        flatKey: "inferenceVertexWorkforceOidc",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.10628.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        selectsConnection: true,
        title: A.msg({
          defaultMessage: "Workforce Identity IdP (OIDC)",
          id: "8uN+pRpuBV",
        }),
        egressRequirements: (e, t) => {
          var n;
          var o;
          return ((n = t.inference) === null || n === undefined ? undefined : n.provider) === "vertex" &&
            ((o = t.inference.credential) === null || o === undefined ? undefined : o.kind) === "workforce"
            ? pe.oidcEgressHosts(e)
            : [];
        },
        egressRequirementsLabel: A.msg({
          defaultMessage: "Workforce Identity sign-in (OIDC)",
          id: "YfucG+3eg9",
        }),
        category: "connection",
        predicates: {
          required: (e) => !pe.hasActiveBootstrap(e),
        },
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "Your organization\u2019s OIDC IdP. The app runs an authorization-code-with-PKCE flow against this issuer and exchanges the returned ID token at GCP STS.",
              id: "GKRkihdCmn",
            }),
          ),
        },
      }),
    }),
    K.z.object({
      kind: K.z.literal("vendor-profile"),
      credentialsFile: P.field(
        P.annotate(K.z.string().optional(), {
          pathKind: "file",
        }),
        {
          flatKey: "inferenceVertexCredentialsFile",
          readers: ["desktop", "code"],
          support: {
            enabled: {
              scopes: ["3p"],
              availableInVersion: "1.2581.0",
            },
            executionTarget: "desktop",
          },
          remotePolicy: {
            requiresUserConsent: true,
          },
          title: A.msg({
            defaultMessage: "GCP credentials file path",
            id: "vr+XA6xjAJ",
          }),
          category: "connection",
          placeholder: A.msg({
            defaultMessage: "/etc/claude/vertex-sa.json",
            id: "p8Z4FQ25gZ",
          }),
          description: {
            short: P.shortDescription(
              A.msg({
                defaultMessage: "Absolute path to service-account JSON. Leave blank to fall back to ADC.",
                id: "g7d9j8Vr7D",
              }),
            ),
          },
        },
      ),
    }),
    UD.HelperScriptCreds,
  ]);
  var tce = K.z.object({
    provider: K.z.literal("vertex"),
    projectId: P.field(
      P.annotate(CD.optional(), {
        redact: "hash",
      }),
      {
        flatKey: "inferenceVertexProjectId",
        readers: ["desktop", "m365", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.2581.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        title: A.msg({
          defaultMessage: "GCP project ID",
          id: "725LtLiE2E",
        }),
        category: "connection",
        predicates: {
          required: (e) => !pe.hasActiveBootstrap(e),
        },
        placeholder: A.msg({
          defaultMessage: "my-gcp-project",
          id: "BfHrtKLzKn",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage: "Google Cloud project ID for Vertex AI inference.",
              id: "InfVertexProjectIdHint",
            }),
            {
              docsOnly: true,
            },
          ),
        },
      },
    ),
    region: P.field(
      P.annotate(Ele.optional(), {
        redact: "keep",
      }),
      {
        flatKey: "inferenceVertexRegion",
        readers: ["desktop", "m365", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.2581.0",
          },
          executionTarget: "desktop",
        },
        title: A.msg({
          defaultMessage: "GCP region",
          id: "dpoHgMeiUG",
        }),
        egressRequirements: (e, t) => {
          var n;
          var o;
          var r;
          if (((n = t.inference) === null || n === undefined ? undefined : n.provider) !== "vertex" || !e)
            return [];
          let s =
            (o = zt.egressAddress(t.inference.baseUrl)) !== null && o !== undefined
              ? o
              : zt.vertexInferenceHost(e);
          let kind = (r = t.inference.credential) === null || r === undefined ? undefined : r.kind;
          return kind === "helper-script" || kind === "workforce" ? [s] : [s, ...zt.VERTEX_AUTH_HOSTS];
        },
        category: "connection",
        predicates: {
          required: (e) => !pe.hasActiveBootstrap(e),
        },
        placeholder: A.msg({
          defaultMessage: "us-east5",
          id: "r8UhFrWBXI",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage: "GCP region where your Vertex AI Claude models are deployed.",
              id: "YvJKUek0yj",
            }),
          ),
        },
      },
    ),
    baseUrl: P.field(
      P.annotate(Fn.httpsUrl.optional(), {
        redact: "hostname",
      }),
      {
        flatKey: "inferenceVertexBaseUrl",
        readers: ["desktop", "m365", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.2581.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: fm,
        title: A.msg({
          defaultMessage: "Vertex AI base URL",
          id: "TAuycZeIjw",
        }),
        category: "connection",
        placeholder: A.msg({
          defaultMessage: "https://REGION-aiplatform-ENDPOINT_ID.p.googleapis.com",
          id: "NHvtv6jJcx",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage: "PSC endpoint, if using one.",
              id: "xHHO70UFYc",
            }),
          ),
        },
      },
    ),
    ...Ec,
    credential: ece.optional(),
  });
  var nce = K.z.discriminatedUnion("kind", [
    pm(
      K.z.object({
        kind: K.z.literal("static"),
        apiKey: P.field(
          P.annotate(K.z.string().optional(), {
            redact: "drop",
          }),
          {
            flatKey: "inferenceFoundryApiKey",
            readers: ["desktop", "m365"],
            support: {
              enabled: {
                scopes: ["3p"],
                availableInVersion: "1.2581.0",
              },
              executionTarget: "desktop",
            },
            title: A.msg({
              defaultMessage: "Azure AI Foundry API key",
              id: "JqaU0qkb9c",
            }),
            category: "connection",
            predicates: {
              required: (e) => !pe.hasActiveBootstrap(e),
            },
            description: {
              short: P.shortDescription(
                A.msg({
                  defaultMessage: "API key for Azure AI Foundry inference.",
                  id: "InfFoundryApiKeyHint",
                }),
                {
                  docsOnly: true,
                },
              ),
            },
          },
        ),
      }),
    ),
    K.z.object({
      kind: K.z.literal("interactive"),
      tenantId: P.field(K.z.string().trim().min(1).optional(), {
        flatKey: "inferenceFoundryTenantId",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.9255.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        title: A.msg({
          defaultMessage: "Entra ID tenant ID",
          id: "Ah1hvJZNYr",
        }),
        egressRequirements: (e, t) => {
          var n;
          return ((n = t.inference) === null || n === undefined ? undefined : n.provider) === "foundry" && e
            ? [zt.MICROSOFT_LOGIN_HOST]
            : [];
        },
        category: "connection",
        predicates: {
          required: (e) => !pe.hasActiveBootstrap(e),
        },
        placeholder: A.msg({
          defaultMessage: "00000000-0000-0000-0000-000000000000",
          id: "oT3AdLMVZK",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "Directory (tenant) ID of the Entra ID app registration that has the Cognitive Services scope.",
              id: "7sqrf3CZ6B",
            }),
          ),
        },
      }),
      clientId: P.field(K.z.string().trim().min(1).optional(), {
        flatKey: "inferenceFoundryClientId",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.9255.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        title: A.msg({
          defaultMessage: "Entra ID client ID",
          id: "bLvD/3lRxB",
        }),
        category: "connection",
        predicates: {
          required: (e) => !pe.hasActiveBootstrap(e),
        },
        placeholder: A.msg({
          defaultMessage: "11111111-1111-1111-1111-111111111111",
          id: "Ck5uU8xAnb",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "Application (client) ID of the Entra ID app registration. Device-code sign-in requires the app to allow public client flows.",
              id: "InfFoundryClientIdHint",
            }),
          ),
        },
      }),
      authFlow: P.field(K.z.enum(["device-code", "browser", "broker"]).optional(), {
        flatKey: "inferenceFoundryAuthFlow",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.19367.0",
          },
          values: {
            broker: {
              availableInVersion: "1.24012.0",
            },
          },
          executionTarget: "desktop",
        },
        title: A.msg({
          defaultMessage: "Entra ID sign-in flow",
          id: "InfFoundryAuthFlow",
        }),
        category: "connection",
        placeholder: A.msg({
          defaultMessage: "device-code",
          id: "InfFoundryAuthFlowPh",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "How Entra sign-in runs: device code (default), system browser, or the OS identity broker.",
              id: "qCKLNhSFcP",
            }),
          ),
          long: P.longDescription(
            "- **`device-code`** (default) \u2014 shows a code to enter at microsoft.com/devicelogin. The app registration must have **Allow public client flows** enabled.\n" +
              "- **`browser`** \u2014 opens the system browser for an authorization-code (PKCE) sign-in on a loopback redirect URI. The app registration must include `http://127.0.0.1/callback` under the **Mobile and desktop applications** platform (Entra ignores the loopback port, but not the path). Works with **Allow public client flows** disabled, and is unaffected by Conditional Access policies that block device-code authentication.\n" +
              "- **`broker`** \u2014 signs in through the OS identity broker (Web Account Manager on Windows, Company Portal on macOS), so it can satisfy Conditional Access policies that require a compliant/managed device or token protection. The app registration must include the broker redirect URIs `ms-appx-web://Microsoft.AAD.BrokerPlugin/{client-id}` (Windows) and `msauth.com.anthropic.claudefordesktop://auth` (macOS) under the **Mobile and desktop applications** platform. Not supported on Linux.\n\n" +
              "App versions that predate this key always use device code; versions that predate the broker option treat `broker` as unset and use device code.",
          ),
        },
      }),
    }),
    UD.HelperScriptCreds,
  ]);
  var rce = K.z.object({
    provider: K.z.literal("foundry"),
    resource: P.field(Ple.optional(), {
      flatKey: "inferenceFoundryResource",
      readers: ["desktop", "m365", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
        executionTarget: "desktop",
      },
      remotePolicy: {
        requiresUserConsent: true,
      },
      title: A.msg({
        defaultMessage: "Azure AI Foundry resource name",
        id: "tdj4b/xhUV",
      }),
      egressRequirements: (e, t) => {
        var n;
        var o;
        let baseUrl = t.inference && "baseUrl" in t.inference ? t.inference.baseUrl : undefined;
        return ((n = t.inference) === null || n === undefined ? undefined : n.provider) === "foundry" && e
          ? [(o = zt.egressAddress(baseUrl)) !== null && o !== undefined ? o : zt.foundryResourceHost(e)]
          : [];
      },
      category: "connection",
      predicates: {
        required: (e) => !pe.hasActiveBootstrap(e),
      },
      placeholder: A.msg({
        defaultMessage: "my-foundry-resource",
        id: "CWxAZo6MyF",
      }),
      description: {
        short: P.shortDescription(
          A.msg({
            defaultMessage: "Azure AI Foundry resource name used to construct the endpoint URL.",
            id: "XfOmm8BNBA",
          }),
        ),
      },
    }),
    baseUrl: P.field(
      P.annotate(Fn.httpsUrl.optional(), {
        redact: "hostname",
      }),
      {
        flatKey: "inferenceFoundryBaseUrl",
        readers: ["desktop", "m365", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "2.110.0",
          },
          executionTarget: "desktop",
        },
        remotePolicy: fm,
        title: A.msg({
          defaultMessage: "Azure AI Foundry base URL",
          id: "XQ/3430M2Q",
        }),
        category: "connection",
        placeholder: A.msg({
          defaultMessage: "https://llm-gateway.example.com/foundry",
          id: "gatovXuhBm",
        }),
        description: {
          short: P.shortDescription(
            A.msg({
              defaultMessage:
                "Full base URL for a gateway or proxy in front of Foundry, path included (replaces https://RESOURCE.services.ai.azure.com/anthropic).",
              id: "CuSbptYP9V",
            }),
          ),
          long: P.longDescription(
            "Set this only when the app reaches Foundry through a gateway or proxy you run, such as Azure API Management. Requests go to `<value>/v1/messages` instead of `https://<resource>.services.ai.azure.com/anthropic/v1/messages`, carrying the same credential and headers the app would send to Foundry: each user's Entra ID token for the Azure Cognitive Services audience as `Authorization: Bearer` with Entra sign-in, otherwise the API key or the credential helper's output. Claude Code sessions receive the value as `ANTHROPIC_FOUNDRY_BASE_URL`, so use the same value you would give Claude Code in a terminal. `inferenceFoundryResource` is still required and should name the resource behind the gateway; the app sends nothing to the resource directly while this is set. Must be https, or http to a proxy at a loopback address on the device itself (127.0.0.1, localhost or [::1]).",
          ),
        },
      },
    ),
    ...Ec,
    credential: nce.optional(),
  });
  UD.InferenceConfig = K.z.discriminatedUnion("provider", [
    P.variantMeta(qle, {}),
    P.variantMeta(Wle, {
      noBearerFor: ["interactive"],
    }),
    P.variantMeta(Jle, {
      cliFlag: "CLAUDE_CODE_USE_BEDROCK",
      bedrockFamily: true,
      noDiscoveryFor: ["interactive", "vendor-profile", "external-idp"],
      noBearerFor: ["interactive", "vendor-profile"],
      needsBaseUrlFor: ["external-idp"],
    }),
    P.variantMeta(Qle, {
      cliFlag: "CLAUDE_CODE_USE_MANTLE",
      bedrockFamily: true,
      noDiscoveryFor: ["static", "helper-script"],
    }),
    P.variantMeta(tce, {
      cliFlag: "CLAUDE_CODE_USE_VERTEX",
      noDiscoveryFor: ["interactive", "workforce", "helper-script", "vendor-profile"],
      noBearerFor: ["interactive", "vendor-profile"],
    }),
    P.variantMeta(rce, {
      cliFlag: "CLAUDE_CODE_USE_FOUNDRY",
      noDiscoveryFor: ["static", "helper-script", "interactive"],
      noBearerFor: ["static", "helper-script"],
    }),
  ]);
  UD.PROVIDER_ARMS = new Map(
    UD.InferenceConfig.options.map((option) => [option.shape.provider.value, option]),
  );
  var hm = (e) => {
    var t;
    return (t = P.variantMetaForNode(UD.PROVIDER_ARMS.get(e))) !== null && t !== undefined ? t : {};
  };
  UD.CREDENTIAL_KINDS_FOR_PROVIDER = Object.fromEntries(
    P.PROVIDERS.map((e) => [
      e,
      P.discriminatorArmsOf(UD.PROVIDER_ARMS.get(e).shape.credential)
        .filter((t) => t.id)
        .map((t) => t.id),
    ]),
  );
  UD.PROVIDER_CLI_FLAG = Object.fromEntries(
    P.PROVIDERS.flatMap((e) => {
      let cliFlag = hm(e).cliFlag;
      return cliFlag ? [[e, cliFlag]] : [];
    }),
  );
  var isBedrockFamily = (e) => e !== undefined && hm(e).bedrockFamily === true;
  UD.isBedrockFamily = isBedrockFamily;
  UD.PROVIDER_SELECTOR_ENV_FLAGS = [
    ...Object.values(UD.PROVIDER_CLI_FLAG),
    "CLAUDE_CODE_USE_ANTHROPIC_AWS",
    "CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD",
    "CLAUDE_CODE_USE_GATEWAY",
  ];
  function oce(e) {
    let t = {};
    for (let o of UD.PROVIDER_SELECTOR_ENV_FLAGS) t[o] = "";
    let n = e && UD.PROVIDER_CLI_FLAG[e];
    if (n) t[n] = "1";
    return t;
  }
  function ND(e, t) {
    if (!e) return true;
    let n = UD.CREDENTIAL_KINDS_FOR_PROVIDER[e];
    if (n.length === 0) return false;
    let noDiscoveryFor = hm(e).noDiscoveryFor;
    if (t === undefined)
      return n.some(
        (r) =>
          !(noDiscoveryFor === null || noDiscoveryFor === undefined ? undefined : noDiscoveryFor.includes(r)),
      );
    return (
      n.includes(t) &&
      !(noDiscoveryFor === null || noDiscoveryFor === undefined ? undefined : noDiscoveryFor.includes(t))
    );
  }
  function sce(e) {
    var t;
    var n;
    let credential = e.credential;
    if (!credential) return true;
    if (
      (t = hm(e.provider).noBearerFor) === null || t === undefined ? undefined : t.includes(credential.kind)
    )
      return false;
    if ("authScheme" in credential && credential.authScheme === "x-api-key") return false;
    if (
      e.provider === "anthropic" &&
      ((n = e.credential) === null || n === undefined ? undefined : n.kind) === "static" &&
      e.credential.apiKey
    )
      return pa.isAnthropicOAuthToken(e.credential.apiKey);
    return true;
  }
  var providerHasDiscovery = (e) => {
    var t;
    return ND((t = e.inference) === null || t === undefined ? undefined : t.provider, pe.credentialKindOf(e));
  };
  UD.providerHasDiscovery = providerHasDiscovery;
  UD.inferenceCredentialKindField = P.field(K.z.enum(P.INFERENCE_CREDENTIAL_KINDS).optional(), {
    flatKey: "inferenceCredentialKind",
    readers: ["desktop", "m365", "code"],
    deprecations: [
      UD.VERTEX_OAUTH_CREDENTIAL_KIND,
      UD.VERTEX_INTERACTIVE_WITH_AUDIENCE,
      ...UD.whereIdpKeysExist(UD.GATEWAY_INTERACTIVE_WITH_IDP),
    ],
    support: {
      enabled: {
        scopes: ["3p"],
        availableInVersion: "1.8555.0",
      },
      values: {
        workforce: {
          availableInVersion: "1.15200.0",
        },
        oauth: {
          availableInVersion: "1.15200.0",
        },
        "external-idp": {
          availableInVersion: "2.7032.0",
        },
      },
    },
    title: A.msg({
      defaultMessage: "Credential kind",
      id: "g8BMTiGHB6",
    }),
    category: "connection",
    order: 90,
    predicates: {
      required: (e) => pe.credentialKindOf(e) === undefined && !pe.hasActiveBootstrap(e),
    },
    optionLabels: {
      static: A.msg({
        defaultMessage: "Static API key",
        id: "kgHEpmxl05",
      }),
      "helper-script": A.msg({
        defaultMessage: "Helper script",
        id: "DnXPcFgmqb",
      }),
      interactive: A.msg({
        defaultMessage: "Interactive sign-in",
        id: "8c6iN3kiDX",
      }),
      "vendor-profile": A.msg({
        defaultMessage: "Cloud vendor profile",
        id: "4ZsAJlUXHL",
      }),
      workforce: A.msg({
        defaultMessage: "Workforce Identity",
        id: "VtxWorkforceKind",
      }),
      "external-idp": A.msg({
        defaultMessage: "Identity provider sign-in (OIDC)",
        id: "ExtIdpKindLabel",
      }),
    },
    description: {
      short: P.shortDescription(
        A.msg({
          defaultMessage: "Selects the credential source. When set, only that source is used (no fallback).",
          id: "xXr+rGIv+A",
        }),
      ),
    },
  });
});
//@ chunk-1ny7cxrt.js:849850-854405 cjs-unmatched+string-clue
var _m = x(function (tM) {
  Object.defineProperty(tM, "__esModule", {
    value: true,
  });
  tM.SelfHostedConfig = tM.SELF_HOSTED_CREDENTIAL_KINDS = undefined;
  tM.isSelfHostedExecutionConfigured = yce;
  tM.isSelfHostedOnly = eM;
  var Qn = require_v3();
  var Cr = yt();
  var XD = $n();
  var Oi = mn();
  var ym = Ir();
  var QD = Ar();
  var Dv = Oi.msg({
    defaultMessage: "Self-hosted execution",
    id: "SelfHostedGroup",
  });
  function yce(e) {
    var t;
    return Boolean((t = e.selfHosted) === null || t === undefined ? undefined : t.url);
  }
  function eM(e) {
    return e.selfHosted !== undefined;
  }
  tM.SELF_HOSTED_CREDENTIAL_KINDS = ["static", "helper-script", "external-idp"];
  var JD = (e) => (t) => {
    var n;
    var o;
    return (
      ((o = (n = t.selfHosted) === null || n === undefined ? undefined : n.credential) === null ||
      o === undefined
        ? undefined
        : o.kind) === e
    );
  };
  var _ce = Qn.z.object({
    kind: Qn.z.literal("static"),
    bearerToken: Cr.field(
      Cr.annotate(Qn.z.string().trim().min(1).optional(), {
        redact: "drop",
      }),
      {
        flatKey: "selfHostedToken",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "2.16120.0",
          },
          visibility: "public-undocumented",
          executionTarget: "selfHosted",
        },
        betaFeatureKey: "selfHostedSessions",
        remotePolicy: {
          hybrid: {
            scope: "excluded",
          },
        },
        title: Oi.msg({
          defaultMessage: "Self-hosted bearer token",
          id: "SelfHostedToken",
        }),
        category: "connection",
        group: Dv,
        predicates: {
          show: JD("static"),
          required: JD("static"),
        },
        description: {
          short: Cr.shortDescription(
            Oi.msg({
              defaultMessage:
                "Static token sent as Authorization: Bearer. Prefer a helper script or sign-in.",
              id: "SelfHostedTokenHint",
            }),
          ),
        },
      },
    ),
  });
  var bce = Qn.z.object({
    kind: Qn.z.literal("helper-script"),
    ...ym.helperScriptLeaves,
  });
  var vce = Qn.z.object({
    kind: Qn.z.literal("external-idp"),
    ...ym.idpSignInShape,
  });
  var wce = Qn.z.discriminatedUnion("kind", [_ce, bce, vce]);
  var Oce = QD.urlSchema({
    allowLoopbackHttp: true,
    rejectQueryAndFragment: true,
  });
  tM.SelfHostedConfig = Cr.annotate(
    Qn.z.object({
      url: Cr.field(
        Cr.annotate(Oce.optional(), {
          redact: "hostname",
        }),
        {
          flatKey: "selfHostedUrl",
          support: {
            enabled: {
              scopes: ["3p"],
              availableInVersion: "2.16120.0",
            },
            visibility: "public-undocumented",
            executionTarget: "selfHosted",
          },
          betaFeatureKey: "selfHostedSessions",
          remotePolicy: {
            hybrid: {
              scope: "excluded",
            },
            rejectLoopback: true,
            requiresUserConsent: true,
          },
          predicates: {
            required: eM,
          },
          title: Oi.msg({
            defaultMessage: "Self-hosted execution URL",
            id: "SelfHostedUrlTitle",
          }),
          egressRequirements: XD.singleHostEgress,
          egressRequirementsLabel: Dv,
          category: "connection",
          group: Dv,
          placeholder: Oi.msg({
            defaultMessage: "https://claude-sessions.example.com",
            id: "SelfHostedUrlPlaceholder",
          }),
          description: {
            short: Cr.shortDescription(
              Oi.msg({
                defaultMessage: "HTTPS endpoint of the self-hosted session host (beta).",
                id: "SelfHostedUrlHint",
              }),
            ),
            long: Cr.longDescription(
              "Beta. The app sends its session API to this endpoint with the configured credential, and the block's presence makes the whole install self-hosted: no session runs on the device, though the local MCP servers on it (the person's own and the organization's) still start on the device and serve the host's sessions (built-in and remote servers do not; of a plugin's servers, only the local (stdio) MCP servers of a plugin in the organization plugins directory do, unless a managed server has the same name), an inference provider configured beside it is ignored, and every key that only configures on-device sessions (marked `x-executionTarget: desktop`) stops applying \u2014 that policy belongs to the infrastructure the sessions run on. The credential is the inference credential keys, read for the endpoint instead: `inferenceCredentialKind` (`external-idp` with `inferenceIdpOidc` and `inferenceIdpAuthFlow`; `helper-script` with `inferenceCredentialHelper` and its leaves; `static` with `selfHostedToken`). Must be `https://` (plain `http://` is read only for a loopback host, from device management or the local configuration file; a settings server may not name a loopback host), with no query string or fragment. While essential telemetry is not blocked, crash and error reports from this install can carry a mark that its sessions run off the device, and true-or-false values and counts that describe what this endpoint offers. The app counts its starts and its failures by kind (crashes, errors, and failures to read settings, sign in, connect to local tools or update). It hands the numbers to this endpoint, if it accepts them, with words from a fixed list, the app's version, and the operating system's name, version and processor. The numbers hold no message, name, path, address or ID. The endpoint can tell whose app sent them. It adds totals to its usage report for Anthropic, if you set one up; what it passes on names nobody. Blocking essential telemetry stops the counting.",
            ),
          },
        },
      ),
      credential: wce.optional(),
    }),
    {
      remotePolicy: {
        hybrid: {
          scope: "excluded",
        },
      },
    },
  );
});
//@ chunk-1ny7cxrt.js:854405-855754 cjs-unmatched+string-clue
var zi = x(function (rM) {
  Object.defineProperty(rM, "__esModule", {
    value: true,
  });
  rM.GROUP_DESCRIPTIONS =
    rM.BUILTIN_BROWSER_GROUP =
    rM.CODE_SURFACE_GROUP =
    rM.UPDATES_GROUP =
    rM.BOOTSTRAP_GROUP =
    rM.MCP_SERVERS_GROUP =
    rM.ANTHROPIC_TELEMETRY_GROUP =
    rM.TOOLS_GROUP =
    rM.GENERAL_RESTRICTIONS_GROUP =
      undefined;
  var Rn = mn();
  rM.GENERAL_RESTRICTIONS_GROUP = Rn.msg({
    defaultMessage: "General restrictions",
    id: "fHh9zisMLR",
  });
  rM.TOOLS_GROUP = Rn.msg({
    defaultMessage: "Tools",
    id: "nUT0LvZVOx",
  });
  rM.ANTHROPIC_TELEMETRY_GROUP = Rn.msg({
    defaultMessage: "Anthropic telemetry",
    id: "auYj3lyf1+",
  });
  rM.MCP_SERVERS_GROUP = Rn.msg({
    defaultMessage: "MCP servers",
    id: "K9q4XwLJd2",
  });
  rM.BOOTSTRAP_GROUP = Rn.msg({
    defaultMessage: "Bootstrap config URL",
    id: "MPdK0gXvRA",
  });
  rM.UPDATES_GROUP = Rn.msg({
    defaultMessage: "Updates",
    id: "recCg9im82",
  });
  rM.CODE_SURFACE_GROUP = Rn.msg({
    defaultMessage: "Code surface",
    id: "NHwL+4YYfH",
  });
  rM.BUILTIN_BROWSER_GROUP = Rn.msg({
    defaultMessage: "Built-in browser",
    id: "Yx/kiytXbg",
  });
  rM.GROUP_DESCRIPTIONS = {
    [rM.GENERAL_RESTRICTIONS_GROUP.id]: Rn.msg({
      defaultMessage: "These apply regardless of which surfaces are enabled.",
      id: "kTD7aU+1xd",
    }),
    [rM.TOOLS_GROUP.id]: Rn.msg({
      defaultMessage: "Built-in tool restrictions and on-demand MCP tool loading.",
      id: "XVYTn+sJ/a",
    }),
    [rM.CODE_SURFACE_GROUP.id]: Rn.msg({
      defaultMessage: "Settings for Code sessions. These apply only while Code is enabled.",
      id: "R0nTUNCSi6",
    }),
  };
});
//@ chunk-1ny7cxrt.js:855754-880691 cjs-unmatched+string-clue
var wm = x(function (wM) {
  var Mv;
  Object.defineProperty(wM, "__esModule", {
    value: true,
  });
  wM.PluginsConfig =
    wM.AllowedPluginMarketplace =
    wM.marketplaceRepo =
    wM.marketplaceUrl =
    wM.marketplaceRef =
    wM.MARKETPLACE_CREDENTIAL_KINDS =
    wM.MARKETPLACE_INSTALL_PREFS =
      undefined;
  wM.requireHelperForHelperKind = Nv;
  wM.checkAllowedPluginMarketplacesForDrops = vM;
  var mt = require_v3();
  var bm = Xr();
  var mM = gr();
  var re = yt();
  var er = $n();
  var fe = mn();
  var Hn = Ar();
  var vm = zi();
  wM.MARKETPLACE_INSTALL_PREFS = ["available", "auto_install", "required"];
  var gM = ["anonymous", "userGit", "credentialHelper"];
  wM.MARKETPLACE_CREDENTIAL_KINDS = [...gM, "inferenceCredential"];
  var $ce = ["anonymous", "credentialHelper", "inferenceCredential"];
  var yM = /^[^\s/]+\/[^\s/]+$/;
  var Rce = /^[0-9a-f]{40}$/i;
  var section = "Curated by Anthropic";
  var Dce = [
    {
      label: "Cowork plugins",
      section,
      description: "anthropics/knowledge-work-plugins on GitHub",
      item: {
        source: "github",
        repo: "anthropics/knowledge-work-plugins",
      },
    },
    {
      label: "Claude Code plugins",
      section,
      description: "anthropics/claude-plugins-official on GitHub",
      item: {
        source: "github",
        repo: "anthropics/claude-plugins-official",
      },
    },
    {
      label: "Claude for Financial Services",
      section,
      description: "anthropics/financial-services on GitHub",
      item: {
        source: "github",
        repo: "anthropics/financial-services",
      },
    },
    {
      label: "Claude for Legal",
      section,
      description: "anthropics/claude-for-legal on GitHub",
      item: {
        source: "github",
        repo: "anthropics/claude-for-legal",
      },
    },
    {
      label: "Claude for Life Sciences",
      section,
      description: "anthropics/life-sciences on GitHub",
      item: {
        source: "github",
        repo: "anthropics/life-sciences",
      },
    },
  ];
  var lM = (e) => e.source === "github";
  var show = (e) => e.source === "github" || e.source === "git";
  var show_2 = (e) => e.source === "url";
  var cM = (e) => e.source === "git" || e.source === "url";
  var uM = (e) => e.credentialKind === "credentialHelper";
  function Nv(e) {
    return e.refine(
      (t) => {
        var n;
        return (
          (((n = t.credentialKind) !== null && n !== undefined ? n : "anonymous") === "credentialHelper") ===
          (t.credentialHelper !== undefined)
        );
      },
      {
        message: "Credential helper is required when Auth is credentialHelper, and must be empty otherwise",
        path: ["credentialHelper"],
      },
    );
  }
  var dM = (e) => (e.source === "url" ? e.manifestSha256 : e.ref);
  var xv = (e) => {
    var t;
    return e.source === "url"
      ? e.manifestSha256 !== undefined
      : Rce.test((t = e.ref) !== null && t !== undefined ? t : "");
  };
  var bM = (e) => {
    var t;
    return (
      ((t = e.installationPreference) !== null && t !== undefined ? t : "available") !== "available" && !xv(e)
    );
  };
  var fM = (e) => !!e && typeof e === "object" && "source" in e && typeof e.source === "string";
  var pM = (e) => {
    let { [e.source === "url" ? "manifestSha256" : "ref"]: t, ...n } = e;
    return n;
  };
  function jce(e, t) {
    if (!Array.isArray(e) || !Array.isArray(t) || e.length !== t.length) return false;
    return e.every((n, o) => {
      let r = t[o];
      return (
        fM(n) &&
        fM(r) &&
        er.canonicalJson(pM(n)) === er.canonicalJson(pM(r)) &&
        (dM(n) === dM(r) || (xv(n) && xv(r)))
      );
    });
  }
  var Uv = {
    label: fe.msg({
      defaultMessage: "Auth",
      id: "JUCpMnAOZ/",
    }),
    support: {
      values: {
        inferenceCredential: {
          availableInVersion: "1.32352.0",
        },
      },
    },
    description: {
      short: re.shortDescription(
        fe.msg({
          defaultMessage:
            "How fetches authenticate: anonymously, with the user\u2019s git credentials, via a helper executable, or as the app does to its gateway or bootstrap server (url).",
          id: "mktCredKd3",
        }),
      ),
    },
  };
  var zv = {
    expectedName: re.subfield(
      mt.z
        .string()
        .regex(
          /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,126}[A-Za-z0-9_-])?$/,
          "Expected name must start with a letter or number, may contain only letters, numbers, dots, underscores, and hyphens, and must not end with a dot (128 characters max)",
        )
        .optional(),
      {
        label: fe.msg({
          defaultMessage: "Expected name",
          id: "pMktExpNm1",
        }),
        description: {
          short: re.shortDescription(
            fe.msg({
              defaultMessage: "Rejects the marketplace if its manifest name differs.",
              id: "pMktExpNm3",
            }),
            {
              docsOnly: false,
            },
          ),
          long: re.longDescription(
            "When set, each fetch or clone is rejected if the marketplace's `manifest.name` differs, so an upstream rename cannot silently replace another configured marketplace.",
            {
              docsOnly: false,
            },
          ),
        },
      },
    ),
    installationPreference: re.subfield(mt.z.enum(wM.MARKETPLACE_INSTALL_PREFS).optional(), {
      label: fe.msg({
        defaultMessage: "Installation",
        id: "47svuNMHCd",
      }),
      description: {
        short: re.shortDescription(
          fe.msg({
            defaultMessage: "Whether users install plugins themselves or get them automatically.",
            id: "pMktInstD1",
          }),
          {
            docsOnly: false,
          },
        ),
        long: re.longDescription(
          "`available` (the default) lets users install from the Directory's Organization tab. `auto_install` installs automatically once per pin (the commit SHA, or a `url` source's `manifestSha256`); a plugin the user removes stays removed until the pin changes. `required` reinstalls on every sync, so it cannot stay removed. A change that only moves the pin of existing entries, with nothing else in the configuration changed, reaches running apps without a restart once the app's next two configuration checks both return it; any other change to this list asks for a restart. An `auto_install` or `required` entry without that pin (a full 40-character commit SHA in `ref`, or `manifestSha256` for a `url` source) is treated as `available` and reported as a config warning: the marketplace still lists, but the entry installs nothing. Left at (or treated as) `available`, a `url` marketplace served from your inference gateway's or bootstrap server's own origin may instead mark individual plugins `\"installationPreference\": \"auto_install\"` in its `marketplace.json`: those install automatically with no pin (each such archive needs a `sha256`), and a plugin the user removes stays removed. On any other origin those marks are ignored.",
          {
            docsOnly: false,
          },
        ),
      },
    }),
    credentialKind: re.subfield(mt.z.enum(gM).optional(), Uv),
    credentialHelper: re.subfield(mt.z.string().min(1).optional(), {
      label: fe.msg({
        defaultMessage: "Credential helper",
        id: "9bQZ2JN+mX",
      }),
      remotePolicy: {
        requiresUserConsent: true,
      },
      description: {
        short: re.shortDescription(
          fe.msg({
            defaultMessage: "Executable that prints an access token for this marketplace.",
            id: "+x3hZrl+4b",
          }),
          {
            docsOnly: false,
          },
        ),
        long: re.longDescription(
          'Prints to stdout one of: a bare token (sent as the git password for username `x-access-token`, which GitHub, GitLab and Azure DevOps accept, and as `Authorization: Bearer` for `url` sources); git-credential lines `username=<user>` and `password=<token>` when the host needs a particular username (Bitbucket Data Center project or repository access tokens on 9.3+: `x-token-auth`; GitLab deploy tokens: `gitlab+deploy-token-N`) \u2014 sent as HTTP Basic for `url` sources; `authtype=Bearer` and `credential=<token>` to send `Authorization: Bearer <token>` (Bitbucket Data Center HTTP access tokens on any version); or, for `url` sources only, a JSON object of HTTP headers such as `{"Authorization": "Bearer \u2026", "X-Tenant": "acme"}` (the form an MCP server\'s `headersHelper` prints), all sent on every request to that marketplace \u2014 a `git` source refuses this form. Other keys, blank lines and CRLF are ignored in the line forms; output that opens with `{` must be a valid header object or the fetch is refused.',
          {
            docsOnly: false,
          },
        ),
      },
      predicates: {
        show: uM,
        required: uM,
      },
    }),
  };
  wM.marketplaceRef = re.subfield(mt.z.string().min(1).optional(), {
    label: fe.msg({
      defaultMessage: "Ref",
      id: "Yz6RnPXq2r",
    }),
    placeholder: fe.msg({
      defaultMessage: "Branch, tag, or commit SHA",
      id: "r5djcSLDYh",
    }),
    description: {
      short: re.shortDescription(
        fe.msg({
          defaultMessage:
            "Commit SHA, branch, or tag. Leave empty to track the default branch; auto_install and required need a full 40-character commit SHA.",
          id: "pMktRefDs1",
        }),
        {
          docsOnly: false,
        },
      ),
    },
    predicates: {
      show,
    },
  });
  var hM = {
    ref: wM.marketplaceRef,
    path: re.subfield(mt.z.string().min(1).optional(), {
      label: fe.msg({
        defaultMessage: "Subpath",
        id: "Hy0W3kYc6J",
      }),
      description: {
        short: re.shortDescription(
          fe.msg({
            defaultMessage:
              "Folder within the repository that contains the marketplace, when it isn\u2019t at the root.",
            id: "pMktPathD1",
          }),
          {
            docsOnly: false,
          },
        ),
      },
      predicates: {
        show,
      },
    }),
    ...zv,
  };
  var xce = {
    manifestSha256: re.subfield(
      mt.z
        .string()
        .regex(er.SHA256_HEX, "Manifest SHA-256 must be a 64-character hex digest")
        .transform((e) => e.toLowerCase())
        .optional(),
      {
        label: fe.msg({
          defaultMessage: "Manifest SHA-256",
          id: "pMktMfSha1",
        }),
        support: {
          availableInVersion: "1.32352.0",
        },
        placeholder: fe.msg({
          defaultMessage: "64-char hex SHA-256 of marketplace.json",
          id: "pMktMfSha2",
        }),
        description: {
          short: re.shortDescription(
            fe.msg({
              defaultMessage:
                "SHA-256 of the exact marketplace.json to accept. Without it auto_install and required act as available; a served manifest with any other digest is refused.",
              id: "pMktMfSha3",
            }),
            {
              docsOnly: false,
            },
          ),
        },
        predicates: {
          show: show_2,
        },
      },
    ),
    ...zv,
    credentialKind: re.subfield(mt.z.enum(wM.MARKETPLACE_CREDENTIAL_KINDS).optional(), Uv),
  };
  var jv = {
    label: fe.msg({
      defaultMessage: "Source",
      id: "cc9hc4+0K4",
    }),
    support: {
      values: {
        url: {
          availableInVersion: "1.32352.0",
        },
      },
    },
    optionLabels: {
      github: fe.msg({
        defaultMessage: "GitHub",
        id: "SYEyDpPjNk",
      }),
      git: fe.msg({
        defaultMessage: "Git URL",
        id: "TpLDdW3nvS",
      }),
      url: fe.msg({
        defaultMessage: "Marketplace URL",
        id: "PjhC2D2FaO",
      }),
    },
    description: {
      short: re.shortDescription(
        fe.msg({
          defaultMessage:
            "Where the marketplace is fetched from: a GitHub repository (set repo), any Git remote (set url), or a hosted marketplace.json file (set url).",
          id: "l67dEmmDaG",
        }),
      ),
    },
    predicates: {
      required: () => true,
    },
  };
  var Lce = `For \`git\` sources, the HTTPS remote the app clones. For \`url\` sources, the HTTPS address of a \`marketplace.json\` whose plugins are \`archive\` entries (a zip \`url\` plus its \`sha256\`; \`ref\` and \`path\` do not apply). Archive URLs must be same-origin with the manifest URL: that origin is the only host to open on the firewall and the only one a credential is sent to. If any archive fails to download or verify, nothing from that fetch is installed and the next sync retries.

When Installation is \`auto_install\` or \`required\`, set \`manifestSha256\` to the SHA-256 of that exact file and give every archive a \`sha256\`: a served manifest with a different digest is refused and unpinned archives are skipped, so publishing a new manifest means updating \`manifestSha256\`; with no \`manifestSha256\` at all the entry is treated as \`available\` (and a config warning says so). A marketplace served from your inference gateway's or bootstrap server's own origin may instead leave Installation at \`available\` and mark individual plugins \`"installationPreference": "auto_install"\` in the manifest (each with a \`sha256\`); those install with no pin and a new manifest is picked up on the periodic re-fetch. On any other origin the per-plugin marks are ignored.

\`credentialKind\` selects what is sent: \`anonymous\` (the default) nothing, \`userGit\` the user's stored git credential for that host as HTTP Basic, \`credentialHelper\` the helper's output as \`Authorization\` (or, for \`url\` sources, as the HTTP headers it prints as a JSON object), and \`inferenceCredential\` (\`url\` sources only) the credential the app already sends your inference gateway or enabled bootstrap server, so the manifest must be on one of those two origins; when there is nothing to send yet, no request is made and the entry reports why. See [Host the marketplace over HTTPS](${er.COWORK_3P_DOCS_BASE}/extensions#host-the-marketplace-over-https-instead-of-git) for an example manifest and credential details.`;
  wM.marketplaceUrl = re.subfield(
    Hn.urlSchema({
      allowLoopbackHttp: true,
    }),
    {
      label: fe.msg({
        defaultMessage: "URL",
        id: "5M+YdqOWGS",
      }),
      isPrimaryKey: true,
      description: {
        short: re.shortDescription(
          fe.msg({
            defaultMessage:
              "HTTPS Git remote of the marketplace repository (git), or direct HTTPS URL of a hosted marketplace.json file (url).",
            id: "p6oo8hoZ4V",
          }),
        ),
        long: re.longDescription(Lce),
      },
      predicates: {
        show: cM,
        required: cM,
      },
    },
  );
  wM.marketplaceRepo = re.subfield(
    mt.z
      .string()
      .regex(yM, "Repository must be in the form owner/repo, e.g. anthropics/skills")
      .transform((e) => e.toLowerCase()),
    {
      label: fe.msg({
        defaultMessage: "Repository",
        id: "ZHK3DVhcxt",
      }),
      isPrimaryKey: true,
      placeholder: fe.msg({
        defaultMessage: "owner/repo",
        id: "3pZ8Ut7zIL",
      }),
      description: {
        short: re.shortDescription(
          fe.msg({
            defaultMessage: "GitHub repository in owner/repo form. Case-insensitive.",
            id: "2cD0skIoWu",
          }),
        ),
      },
      predicates: {
        show: lM,
        required: lM,
      },
    },
  );
  wM.AllowedPluginMarketplace = Nv(
    mt.z.discriminatedUnion("source", [
      mt.z.object({
        source: re.subfield(mt.z.literal("github"), jv),
        repo: wM.marketplaceRepo,
        ...hM,
      }),
      mt.z.object({
        source: re.subfield(mt.z.literal("git"), jv),
        url: wM.marketplaceUrl,
        ...hM,
      }),
      mt.z.object({
        source: re.subfield(mt.z.literal("url"), jv),
        url: wM.marketplaceUrl,
        ...xce,
      }),
    ]),
  ).transform((e) =>
    bM(e)
      ? {
          ...e,
          installationPreference: "available",
        }
      : e,
  );
  var Nce = re
    .annotate(mt.z.array(wM.AllowedPluginMarketplace.nullable().catch(null)), {
      maxItems: 100,
    })
    .transform((e) => e.filter((t) => t !== null));
  function vM(e, t) {
    if (!Array.isArray(e)) return;
    e.forEach((n, o) => {
      var r;
      let s = wM.AllowedPluginMarketplace.safeParse(n);
      let a = n && typeof n === "object" ? n : undefined;
      let l =
        typeof (a === null || a === undefined ? undefined : a.repo) === "string" && yM.test(a.repo)
          ? `"${a.repo}"`
          : `[${o}]`;
      if (s.success) {
        let installationPreference = a === null || a === undefined ? undefined : a.installationPreference;
        if (
          typeof installationPreference === "string" &&
          installationPreference !==
            ((r = s.data.installationPreference) !== null && r !== undefined ? r : "available")
        ) {
          let f = s.data.source === "url" ? "`manifestSha256`" : "a full 40-character commit SHA in `ref`";
          t(
            `allowedPluginMarketplaces entry ${l}: ${installationPreference} requires ${f}; showing as available instead`,
            "clamp",
          );
        }
        return;
      }
      let joined = s.error.issues
        .map((issue) => `${issue.path.join(".") || "."}: ${issue.message}`)
        .join("; ");
      t(`allowedPluginMarketplaces entry ${l} dropped \u2014 ${joined}`);
    });
  }
  wM.PluginsConfig = mt.z.object({
    remoteUrl: re.field(
      re.annotate(Hn.urlSchema().optional(), {
        redact: "hostname",
      }),
      {
        flatKey: "organizationPluginsUrl",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.10628.0",
          },
          visibility: "public-undocumented",
          executionTarget: "desktop",
        },
        deprecations: [
          {
            path: "organizationPluginsUrl",
            use: 'an allowedPluginMarketplaces entry with "source": "url"',
            effect:
              "plugins will no longer be fetched or updated from that endpoint; the ones it already installed will stay until the key is removed from the configuration, which then retires them",
            ...bm.BATCH_2026_09,
          },
        ],
        remotePolicy: {
          rejectLoopback: true,
          originPinned: {
            carries: "local-credential",
          },
        },
        title: fe.msg({
          defaultMessage: "Organization plugins endpoint",
          id: "OrgPluginsUrl",
        }),
        egressRequirements: (e, t) => {
          var n;
          return ((n = t.bootstrap) === null || n === undefined ? undefined : n.enabled) === false
            ? []
            : er.singleHostEgress(e);
        },
        egressRequirementsLabel: fe.msg({
          defaultMessage: "Organization plugins index",
          id: "OrgPluginsUrlEgress",
        }),
        category: "plugins",
        predicates: {
          show: (e) => {
            var t;
            return ((t = e.plugins) === null || t === undefined ? undefined : t.remoteUrl) !== undefined;
          },
        },
        description: {
          short: re.shortDescription(
            fe.msg({
              defaultMessage:
                "Typically supplied by your bootstrap server. Ignored when bootstrap is disabled.",
              id: "0PDitvSoS4",
            }),
          ),
        },
      },
    ),
    settings: re.field(
      re.annotate(Hn.OrgPluginSettings.optional(), {
        redact: "keep",
      }),
      {
        flatKey: "orgPluginSettings",
        readers: ["desktop", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.8089.0",
          },
        },
        title: fe.msg({
          defaultMessage: "Organization plugin settings",
          id: "hD0T/0cTEY",
        }),
        failClosedValue: Hn.ORG_PLUGIN_SETTINGS_PARSE_FAILED,
        unreadableStandIn: true,
        checkDropped: Hn.checkOrgPluginSettingsForDrops,
        deprecations: [Hn.ORG_PLUGIN_SETTINGS_RECORD_FORM, Hn.ORG_PLUGIN_PERMISSION_ASK_SESSION],
        category: "plugins",
        customRenderer: "orgPluginSettings",
        description: {
          short: re.shortDescription(
            fe.msg({
              defaultMessage: "Admin policy applied to plugin-delivered MCP servers.",
              id: "MW4a5sB6yS",
            }),
          ),
          long: re.longDescription(
            'Locks per-tool permissions on MCP servers provided by any installed plugin \u2014 from the org-plugins directory or a plugin marketplace, remote or run locally \u2014 one entry per server name (compared case-insensitively):\n```json\n[{"serverName": "internal-search", "tools": [{"toolName": "delete_document", "permission": "blocked"}]}]\n```\nThe older record form (`{"mcpServers": {"internal-search": {"toolPolicy": {"delete_document": "blocked"}}}}`) is deprecated and accepted only until ' +
              bm.formatDeprecationDate(
                (Mv = Hn.ORG_PLUGIN_SETTINGS_RECORD_FORM.supportEnds) !== null && Mv !== undefined ? Mv : "",
              ) +
              `. Desktop versions before 1.15200.0 parse only the record form: on those builds an array value is ignored and plugin tool locks are **not enforced**, so update the fleet past 1.15200.0 before deploying the array form.

If a Managed MCP servers entry is for the same server (same URL, else same name), that entry decides alone: its \`toolPolicy\` (if any) applies and the entry here is ignored. A value that cannot be read blocks every tool of every plugin-provided MCP server no Managed MCP servers entry covers.

` +
              Hn.PLUGIN_MCP_TOOL_POLICY_CHANNEL_NOTE,
            {
              docsUrl: `${er.COWORK_3P_DOCS_BASE}/configuration#orgpluginsettings`,
            },
          ),
        },
      },
    ),
    marketplaces: re.field(
      re.annotate(Nce.optional(), {
        redact: "presence",
      }),
      {
        flatKey: "allowedPluginMarketplaces",
        readers: ["desktop", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.17377.1",
          },
        },
        checkDropped: vM,
        remotePolicy: {
          marketplaceUrlHygiene: true,
          hotAppliedWhen: jce,
        },
        title: fe.msg({
          defaultMessage: "Plugin marketplaces",
          id: "SbDWhfly4c",
        }),
        description: {
          short: re.shortDescription(
            fe.msg({
              defaultMessage:
                "Git repositories or hosted marketplace.json URLs to surface as plugin marketplaces in the Directory\u2019s Organization tab. The app re-fetches each periodically.",
              id: "57U/34BfkA",
            }),
          ),
        },
        failClosedValue: [],
        egressRequirements: (e) =>
          Array.isArray(e)
            ? e
                .map((t) => (t.source === "github" ? "github.com" : mM.egressAddress(t.url)))
                .filter((t) => !!t)
            : [],
        egressRequirementsLabel: fe.msg({
          defaultMessage: "Plugin marketplaces",
          id: "SbDWhfly4c",
        }),
        category: "plugins",
        group: fe.msg({
          defaultMessage: "Plugin marketplaces",
          id: "SbDWhfly4c",
        }),
        addLabel: fe.msg({
          defaultMessage: "Add marketplace",
          id: "u1Y1OE1uGp",
        }),
        predicates: {
          warn: (e, t, n) =>
            bM(e)
              ? n.formatMessage(
                  fe.msg({
                    defaultMessage:
                      "Automatic installation needs {source, select, url {a Manifest SHA-256} other {a full 40-character commit SHA in Ref}}. Without one this marketplace is treated as available: it is listed, but this setting installs nothing.",
                    id: "BwpYj08tvc",
                  }),
                  {
                    source: e.source,
                  },
                )
              : null,
        },
        presets: [
          {
            label: "GitHub repo",
            item: {
              source: "github",
              repo: "",
            },
          },
          {
            label: "Git URL",
            item: {
              source: "git",
              url: "",
            },
          },
          {
            label: "Marketplace URL",
            item: {
              source: "url",
              url: "",
            },
          },
          ...Dce,
          {
            label: "Salesforce",
            section: "From partners",
            description: "salesforce/salesforce-skills on GitHub",
            item: {
              source: "github",
              repo: "salesforce/salesforce-skills",
              ref: "claude-prod",
            },
          },
        ],
      },
    ),
    sharingEndpoint: re.field(
      re.annotate(
        Nv(
          mt.z.object({
            url: re.subfield(
              Hn.urlSchema({
                allowLoopbackHttp: true,
                rejectQueryAndFragment: true,
              }),
              {
                label: fe.msg({
                  defaultMessage: "URL",
                  id: "5M+YdqOWGS",
                }),
                mono: true,
                placeholder: fe.msg({
                  defaultMessage: "https://share.example.com/publish",
                  id: "OrgShareUrlPh",
                }),
                description: {
                  short: re.shortDescription(
                    fe.msg({
                      defaultMessage:
                        "HTTPS address each published item is POSTed to, with no query or fragment. Plain http on a loopback host is taken only from device management or the local file.",
                      id: "OrgShareUrlHint",
                    }),
                    {
                      docsOnly: false,
                    },
                  ),
                },
                predicates: {
                  required: () => true,
                },
              },
            ),
            credentialKind: re.subfield(mt.z.enum($ce).optional(), {
              label: Uv.label,
              default: "anonymous",
              description: {
                short: re.shortDescription(
                  fe.msg({
                    defaultMessage:
                      "What each request carries: nothing, a helper executable\u2019s output as Authorization, or the credential the app already sends its gateway or bootstrap server.",
                    id: "OrgShareCredKd",
                  }),
                  {
                    docsOnly: false,
                  },
                ),
              },
            }),
            credentialHelper: zv.credentialHelper,
          }),
        ).optional(),
        {
          redact: "presence",
        },
      ),
      {
        flatKey: "sharingEndpoint",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "2.9939.2",
          },
          visibility: "public-undocumented",
        },
        betaFeatureKey: "organizationSharing",
        exportTemplate: "organizationSharingOpenApi",
        remotePolicy: {
          rejectLoopback: true,
          hybrid: {
            scope: "excluded",
          },
        },
        title: fe.msg({
          defaultMessage: "Organization sharing endpoint",
          id: "OrgShareTitle",
        }),
        egressRequirements: (e) => er.singleHostEgress(e === null || e === undefined ? undefined : e.url),
        category: "plugins",
        group: fe.msg({
          defaultMessage: "Plugin marketplaces",
          id: "SbDWhfly4c",
        }),
        description: {
          short: re.shortDescription(
            fe.msg({
              defaultMessage:
                "HTTPS endpoint that receives the skills and plugins users publish to the organization. When set, users get a Publish to organization action.",
              id: "OrgShareHint",
            }),
          ),
          long: re.longDescription(
            "When set, **Publish to organization** appears on a user's own skills and plugins, and each submission is one HTTPS `POST` of the item to `url`, for your organization's own review pipeline to accept or reject. Nothing is installed from this endpoint: approved items reach members through your plugin marketplaces (`allowedPluginMarketplaces`). The request and response contract is documented separately.\n\n`credentialKind` selects what the request carries: `anonymous` (the default) nothing; `credentialHelper` the output of the `credentialHelper` executable, either as `Authorization` or, when it prints a JSON object of HTTP headers, as those headers (the same helper formats a `url` marketplace entry accepts); `inferenceCredential` the credential the app already sends your inference gateway or enabled bootstrap server, so `url` must be on one of those two origins, and when there is nothing to send yet no request is made and the action says why.\n\nThe app follows no redirects from `url`. A loopback or non-`https` value is dropped when a bootstrap server or the hosted console delivers it (device management and the local configuration file may name a loopback host over plain `http`); a `credentialHelper` delivered by a bootstrap server that was not device-managed is held until the user allows it. Unset: no publish action is shown.",
          ),
        },
      },
    ),
    userPluginMarketplacesEnabled: re.field(mt.z.boolean().optional(), {
      flatKey: "userPluginMarketplacesEnabled",
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.37937.0",
        },
      },
      title: fe.msg({
        defaultMessage: "Allow user-added plugin marketplaces",
        id: "v/P6I/BbB8",
      }),
      default: {
        displayOnly: true,
      },
      failClosedValue: false,
      category: "sandbox",
      group: vm.GENERAL_RESTRICTIONS_GROUP,
      order: 6.6,
      description: {
        short: re.shortDescription(
          fe.msg({
            defaultMessage:
              "Allow users to add plugin marketplaces. When off, marketplaces your organization did not provision are hidden and the app\u2019s sessions do not load their plugins.",
            id: "oqdOf+hjLS",
          }),
        ),
        long: re.longDescription(
          "When on (default), users can add plugin marketplaces from the plugin browser. Set to `false` to restrict plugins to your organization's marketplaces: the add-marketplace surfaces are hidden, and the app refuses adds that still reach it (deep links, stale UI). Any other marketplace present on the device is then hidden in every tab, whether a user added it in the app earlier or something outside the app registered it (for example Claude Code in a terminal, under `~/.claude`): its plugins are not listed, and installs and updates from it are refused. The sessions the app starts load plugins only from your organization's marketplaces, the organization plugins directory, the app's own uploads and the user's own skills folder, enforced through Claude Code's marketplace allowlist (`strictKnownMarketplaces`, passed as the app's managed settings). Nothing is deleted: removing the key or setting it back to `true` restores them. Marketplaces provisioned by your organization (`allowedPluginMarketplaces`) and the organization plugins directory are unaffected, and plugins users uploaded are governed by `userPluginUploadsEnabled`, not this key.\n\nThis is a feature-availability control, not a data boundary. Claude Code in a terminal reads the same `~/.claude` folder and is governed only by its own managed settings, not by this key. Claude Code may ignore this allowlist on a device that deploys its own Claude Code managed settings; restrict marketplaces in those settings as well.\n\nThis key applies only while the app runs in third-party mode. If users could otherwise sign in to Claude.ai on the device, also set `disableDeploymentModeChooser` so the app stays in third-party mode.",
          {
            docsUrl: `${er.COWORK_3P_DOCS_BASE}/configuration#userpluginmarketplacesenabled`,
          },
        ),
      },
    }),
    userPluginUploadsEnabled: re.field(mt.z.boolean().optional(), {
      flatKey: "userPluginUploadsEnabled",
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.37937.0",
        },
      },
      title: fe.msg({
        defaultMessage: "Allow user-added plugins",
        id: "FC6Rd6B6Wv",
      }),
      default: {
        displayOnly: true,
      },
      failClosedValue: false,
      category: "sandbox",
      group: vm.GENERAL_RESTRICTIONS_GROUP,
      order: 6.7,
      description: {
        short: re.shortDescription(
          fe.msg({
            defaultMessage:
              "Allow users to add their own plugins. When off, every in-app option for adding one is hidden and uploads that still reach the app are refused.",
            id: "7AFPPgSJBu",
          }),
        ),
        long: re.longDescription(
          "When on (default), users can upload plugin files and create plugins with Claude. Set to `false` to stop users adding plugins of their own: every in-app option for doing so is hidden, and the app refuses uploads that still reach it.\n\nThis is a feature-availability control enforced in the app, not a data boundary: plugins already installed (or placed on disk outside the app) are not removed or blocked by this key. Plugins from organization-provisioned marketplaces and the organization plugins directory are unaffected.\n\nThis key applies only while the app runs in third-party mode. If users could otherwise sign in to Claude.ai on the device, also set `disableDeploymentModeChooser` so the app stays in third-party mode.",
          {
            docsUrl: `${er.COWORK_3P_DOCS_BASE}/configuration#userpluginuploadsenabled`,
          },
        ),
      },
    }),
  });
});
//@ chunk-1ny7cxrt.js:880691-930804 cjs-unmatched+string-clue
var Cc = x(function (FM) {
  Object.defineProperty(FM, "__esModule", {
    value: true,
  });
  FM.FeatureDiscoveryConfig =
    FM.AutoUpdateConfig =
    FM.ExtensionsConfig =
    FM.SURFACE_GRANT_FIELDS =
    FM.ChatSurfaceConfig =
    FM.CodeSurfaceConfig =
    FM.SSH_CLIENT_UNREADABLE_STAND_IN =
    FM.CoworkSurfaceConfig =
    FM.TokenLimitsConfig =
    FM.DictationConfig =
    FM.OtlpConfig =
    FM.OTLP_CONTENT_CATEGORIES =
      undefined;
  FM.dictationBaseUrl = jM;
  FM.websocketCspSource = Vv;
  FM.dictationCspSource = Hce;
  FM.dictationEndpoints = Kce;
  FM.surfaceOptionLock = Gce;
  FM.isPlainGitBranchName = LM;
  FM.surfaceGrantOf = Gv;
  FM.surfacesOf = Zv;
  var Pe = require_v3();
  var $M = Sc();
  var Ac = Xr();
  var RM = gr();
  var U = yt();
  var Dn = $n();
  var L = mn();
  var DM = Ir();
  var ma = Ar();
  var Tr = zi();
  var Ic = wm();
  var group = L.msg({
    defaultMessage: "OpenTelemetry",
    id: "dYlenA3UP7",
  });
  FM.OTLP_CONTENT_CATEGORIES = [
    "userPrompts",
    "assistantResponses",
    "toolDetails",
    "toolContent",
    "rawApiBodies",
  ];
  function Fce(e) {
    if (!e) return false;
    try {
      let { protocol, hostname } = new URL(e);
      return protocol === "http:" && !ma.LOOPBACK_HOSTS.has(hostname);
    } catch (error) {
      return false;
    }
  }
  var AM = Dn.legacyKvEncodingNotice("otlpHeaders", "no exporter headers will be sent");
  var IM = Dn.legacyKvEncodingNotice(
    "otlpResourceAttributes",
    "no custom resource attributes will be attached",
  );
  FM.OtlpConfig = Pe.z.object({
    endpoint: U.field(
      U.annotate(Dn.urlWithSchemeCoercion.optional(), {
        redact: "hostname",
        gatewayServable: false,
      }),
      {
        flatKey: "otlpEndpoint",
        readers: ["desktop", "m365", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.2581.0",
          },
        },
        remotePolicy: {
          rejectLoopback: true,
        },
        title: L.msg({
          defaultMessage: "OpenTelemetry collector endpoint",
          id: "xovdJlXIM6",
        }),
        egressRequirements: Dn.singleHostEgress,
        category: "telemetry",
        group,
        order: 10,
        placeholder: L.msg({
          defaultMessage: "https://otel.example.com",
          id: "b7vgLij1HS",
        }),
        description: {
          short: U.shortDescription(
            L.msg({
              defaultMessage: "Where OpenTelemetry logs and metrics are sent. Leave blank to disable.",
              id: "Zhe9UuhccO",
            }),
          ),
        },
      },
    ),
    protocol: U.field(
      U.annotate(Pe.z.enum(["http/protobuf", "http/json", "grpc"]).optional(), {
        gatewayServable: false,
      }),
      {
        flatKey: "otlpProtocol",
        readers: ["desktop", "m365", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.2581.0",
          },
        },
        title: L.msg({
          defaultMessage: "OpenTelemetry exporter protocol",
          id: "jETNRIFigw",
        }),
        default: "http/protobuf",
        category: "telemetry",
        group,
        order: 11,
        description: {
          short: U.shortDescription(
            L.msg({
              defaultMessage: "Transport protocol for the OpenTelemetry exporters.",
              id: "OtlpProtocolHint",
            }),
          ),
          long: U.longDescription(
            "Code sessions export over the protocol set here. Chats and Cowork tasks export over `http/protobuf` instead of `grpc` on Windows, and on other platforms whenever the Claude Code engine is given an HTTP proxy (the operating system's proxy, `egressProxyUrl` or `egressProxyPacUrl`, or `HTTPS_PROXY` / `HTTP_PROXY` in a Claude Code settings file); the application log notes the substitution. The desktop application's own events always go over `http/json` to `<endpoint>/v1/logs`. None of this changes the endpoint, so choose `grpc` only for a collector that also serves OTLP/HTTP at the same address; otherwise keep `http/protobuf` and point `otlpEndpoint` at the collector's OTLP/HTTP receiver (conventionally port 4318).",
          ),
        },
        predicates: {
          show: (e) => {
            var t;
            return ((t = e.otlp) === null || t === undefined ? undefined : t.endpoint) !== undefined;
          },
          warn: (e) =>
            e === "grpc"
              ? L.msg({
                  defaultMessage:
                    "Chats and Cowork tasks on Windows or behind an HTTP proxy, and the app\u2019s own events, export over OTLP/HTTP to this same endpoint. Choose grpc only if the collector also accepts OTLP/HTTP there.",
                  id: "OtlpProtocolGrpcWarn",
                })
              : null,
        },
      },
    ),
    headers: U.field(
      U.annotate(Dn.kvRecord(AM).optional(), {
        redact: "presence",
        gatewayServable: false,
      }),
      {
        flatKey: "otlpHeaders",
        readers: ["desktop", "m365", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.2581.0",
          },
        },
        deprecations: [AM],
        title: L.msg({
          defaultMessage: "OpenTelemetry exporter headers",
          id: "fO2poeLmt6",
        }),
        category: "telemetry",
        group,
        order: 12,
        placeholder: {
          key: L.msg({
            defaultMessage: "X-Scope-OrgID",
            id: "OtlpHeadersKeyPh",
          }),
          value: L.msg({
            defaultMessage: "tenant-a",
            id: "OtlpHeadersValuePh",
          }),
        },
        addLabel: L.msg({
          defaultMessage: "Add header",
          id: "IxbsWX4wj4",
        }),
        description: {
          short: U.shortDescription(
            L.msg({
              defaultMessage:
                "Static collector headers \u2014 routing and tenant headers only. No credentials here; use Collector authentication or the headers helper script for tokens.",
              id: "OtlpHeadersHint2",
            }),
          ),
        },
        predicates: {
          show: (e) => {
            var t;
            return ((t = e.otlp) === null || t === undefined ? undefined : t.endpoint) !== undefined;
          },
          warn: (e, t, n) => $M.credentialHeadersWarn(e, n, "headersHelper"),
        },
      },
    ),
    authMode: U.field(
      U.annotate(Pe.z.enum(["none", "inference-credential"]).optional(), {
        gatewayServable: false,
      }),
      {
        flatKey: "otlpAuthMode",
        readers: ["desktop", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.30096.1",
          },
        },
        title: L.msg({
          defaultMessage: "Collector authentication",
          id: "OtlpCollectorAuthTitle",
        }),
        default: {
          displayOnly: "none",
        },
        optionLabels: {
          none: L.msg({
            defaultMessage: "None (static headers only)",
            id: "OtlpCollectorAuthNone",
          }),
          "inference-credential": L.msg({
            defaultMessage: "Reuse the inference credential",
            id: "OtlpCollectorAuthReuse",
          }),
        },
        category: "telemetry",
        group,
        order: 12.3,
        description: {
          short: U.shortDescription(
            L.msg({
              defaultMessage:
                "inference-credential sends the user\u2019s inference bearer token to the collector as Authorization: Bearer.",
              id: "OtlpCollectorAuthHint",
            }),
          ),
          long: U.longDescription(
            "`inference-credential` adds `Authorization: Bearer <token>` to every export, using the token the app currently holds for the inference provider, with no helper script to deploy. The collector must accept that token as issued: an identity-provider sign-in (`external-idp`, gateway or Bedrock proxy) forwards the identity provider\u2019s token, which carries the audience you registered, Microsoft Entra on Foundry issues the Foundry resource\u2019s token, and Vertex workforce identity forwards a Google Cloud access token; static gateway and Bedrock keys are forwarded as-is. Because the token can also call inference as the user, use this only for a collector you operate; for anything else, use the headers helper script with an ingest-scoped credential. Kinds that never produce a bearer (AWS SigV4 kinds on Bedrock, Google ADC / OAuth files on Vertex, API-key kinds) export without it \u2014 use the helper script instead. Cowork tasks pick up the current token each time they start; a Code session keeps the token it started with for as long as it stays open; the desktop\u2019s own event exporter uses the current token on every flush. Before sign-in, exports go out unauthenticated. An `Authorization` header printed by the headers helper script wins over this.",
          ),
        },
        predicates: {
          show: (e) => {
            var t;
            return ((t = e.otlp) === null || t === undefined ? undefined : t.endpoint) !== undefined;
          },
          warn: (e, t) => {
            var n;
            var o;
            if (e !== "inference-credential") return null;
            if (Fce((n = t.otlp) === null || n === undefined ? undefined : n.endpoint))
              return L.msg({
                defaultMessage:
                  "This sends the user\u2019s inference token over plain http to another host. Use an https collector endpoint.",
                id: "OtlpCollectorAuthCleartext",
              });
            if (
              !((o = t.inference) === null || o === undefined ? undefined : o.provider) ||
              DM.credentialYieldsBearer(t.inference)
            )
              return null;
            return L.msg({
              defaultMessage:
                "The configured inference credential is not sent as a bearer token, so telemetry will export without it. Use the headers helper script instead.",
              id: "OtlpCollectorAuthNoBearer",
            });
          },
        },
      },
    ),
    headersHelper: U.field(
      U.annotate(ma.safeHelperPath.optional(), {
        pathKind: "file",
        gatewayServable: false,
      }),
      {
        flatKey: "otlpHeadersHelper",
        readers: ["desktop", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.30096.1",
          },
        },
        remotePolicy: {
          requiresUserConsent: true,
        },
        title: L.msg({
          defaultMessage: "OpenTelemetry headers helper script",
          id: "OtlpHeadersHelperTitle",
        }),
        category: "telemetry",
        group,
        order: 12.6,
        placeholder: L.msg({
          defaultMessage: "/usr/local/bin/otel-headers-helper",
          id: "OtlpHeadersHelperPlaceholder",
        }),
        description: {
          short: U.shortDescription(
            L.msg({
              defaultMessage:
                "Absolute path to an executable that prints a JSON object of collector headers. Merged over the static headers and Collector authentication; the helper wins.",
              id: "OtlpHeadersHelperHint",
            }),
          ),
          long: U.longDescription(
            'Absolute path to an executable that prints a single JSON object of HTTP headers on stdout, e.g. `{"Authorization": "Bearer \u2026"}`. The desktop runs it (no arguments; output cached for a few minutes, and a failure is not retried for 30 seconds) whenever it needs collector headers and merges the result over **OpenTelemetry exporter headers** and the **Collector authentication** header (the helper wins on conflict). Cowork tasks get the current output when they start; Code and Cowork sessions are also given the script as Claude Code\u2019s own `otelHeadersHelper`, so an open session re-runs it as tokens rotate (on Windows this applies to `.exe`, `.cmd` and `.bat` helpers; a `.ps1` helper applies at session start only); the desktop\u2019s own event exporter re-runs it per flush. Session start waits at most two seconds for a slow helper and otherwise proceeds without its headers until it finishes. Use this when the collector needs a credential the inference sign-in cannot provide, when the collector token rotates, or when the config comes from a hosted admin console, which cannot store header values. If the helper fails, telemetry is sent without its headers \u2014 check the app log.',
          ),
        },
        predicates: {
          show: (e) => {
            var t;
            return ((t = e.otlp) === null || t === undefined ? undefined : t.endpoint) !== undefined;
          },
        },
      },
    ),
    resourceAttributes: U.field(
      U.annotate(Dn.kvRecord(IM).optional(), {
        redact: "presence",
        gatewayServable: false,
      }),
      {
        flatKey: "otlpResourceAttributes",
        readers: ["desktop", "m365", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.5354.0",
          },
        },
        deprecations: [IM],
        title: L.msg({
          defaultMessage: "OpenTelemetry resource attributes",
          id: "JgRwRuBWFK",
        }),
        category: "telemetry",
        group,
        order: 13,
        placeholder: {
          key: L.msg({
            defaultMessage: "enduser.id",
            id: "QkbhtcTa4t",
          }),
          value: L.msg({
            defaultMessage: "alice@example.com",
            id: "KER1zNW5fX",
          }),
        },
        addLabel: L.msg({
          defaultMessage: "Add attribute",
          id: "fkzH83T+V/",
        }),
        description: {
          short: U.shortDescription(
            L.msg({
              defaultMessage:
                "Extra resource attributes to attach to every span/metric. A static enduser.id set here always wins over the runtime identity.",
              id: "avoHZ0YdKZ",
            }),
          ),
          long: U.longDescription(
            "Extra resource attributes to attach to every span, metric, and log sent to your collector. When End-user attribution is on and no `enduser.id` is set here, the desktop fills it with the signed-in user's runtime identity; a value you set here always wins. `process.owner` (the OS login name) is always emitted; set it here to override.",
          ),
        },
        predicates: {
          show: (e) => {
            var t;
            return ((t = e.otlp) === null || t === undefined ? undefined : t.endpoint) !== undefined;
          },
        },
      },
    ),
    desktopLogLevel: U.field(Pe.z.enum(["off", "error", "warn", "info", "debug"]).optional(), {
      flatKey: "otlpDesktopLogLevel",
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.9255.0",
        },
      },
      title: L.msg({
        defaultMessage: "Desktop telemetry export level",
        id: "TcONUV0eiZ",
      }),
      default: "error",
      category: "telemetry",
      group,
      order: 14,
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage:
              "Controls the Claude Desktop application\u2019s events, separate from Cowork and Code sessions. Defaults to error.",
            id: "wkZUOJzo5S",
          }),
        ),
      },
      predicates: {
        show: (e) => {
          var t;
          return ((t = e.otlp) === null || t === undefined ? undefined : t.endpoint) !== undefined;
        },
      },
    }),
    contentCapture: U.field(
      U.annotate(Dn.lenientEnumArray(FM.OTLP_CONTENT_CATEGORIES).optional(), {
        redact: "keep",
      }),
      {
        flatKey: "otlpContentCapture",
        readers: ["desktop", "m365", "code"],
        failClosedValue: [],
        support: {
          enabled: {
            scopes: ["3p", "1p"],
            availableInVersion: "1.15962.0",
          },
        },
        title: L.msg({
          defaultMessage: "Content capture categories",
          id: "OtlpContentCaptureTitle",
        }),
        category: "telemetry",
        group,
        order: 15,
        description: {
          short: U.shortDescription(
            L.msg({
              defaultMessage:
                "Content categories the desktop exporter sends unredacted to your collector. Leave empty to redact all content (default).",
              id: "OtlpContentCaptureHint",
            }),
          ),
          long: U.longDescription(
            `Each category enables a class of raw content in OpenTelemetry events sent to your collector (this data never reaches Anthropic):
` +
              "- `userPrompts` \u2014 user-typed prompt text\n" +
              "- `assistantResponses` \u2014 assistant message text\n" +
              "- `toolDetails` \u2014 tool input arguments, e.g. the web-search query string\n" +
              "- `toolContent` \u2014 tool output content, e.g. fetched page text or command stdout\n" +
              "- `rawApiBodies` \u2014 inference API request and response bodies, each cut at 61,440 characters by default\n\n" +
              "These mirror Claude Code's `OTEL_LOG_*` env vars; see the [Claude Code monitoring docs](https://code.claude.com/docs/en/monitoring-usage).",
          ),
        },
        predicates: {
          show: (e) => {
            var t;
            return ((t = e.otlp) === null || t === undefined ? undefined : t.endpoint) !== undefined;
          },
        },
      },
    ),
    tracesEnabled: U.field(Pe.z.boolean().optional(), {
      flatKey: "otlpTracesEnabled",
      readers: ["desktop", "m365", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.22209.0",
        },
      },
      title: L.msg({
        defaultMessage: "Export traces",
        id: "bKPAH/MBRZ",
      }),
      category: "telemetry",
      group,
      order: 16,
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage:
              "Also export OpenTelemetry traces from Cowork tasks and Code sessions. Uses Claude Code\u2019s session tracing.",
            id: "eW1UlMFTJB",
          }),
        ),
        long: U.longDescription(
          "Enables Claude Code's session tracing (`CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1` + `OTEL_TRACES_EXPORTER=otlp`) in spawned Cowork tasks and Code sessions. Each user interaction exports a trace whose spans and events carry `trace_id`/`span_id`, enabling end-to-end correlation in your observability backend (metrics do not carry trace context; correlate those via `session.id`). Traces go to the collector endpoint and protocol configured above. When `otlpEndpoint` is set, this key alone decides whether those sessions export traces: leaving it unset or `false` keeps traces off even if Claude Code's own settings or managed settings (for example a `managed-settings.json` on the device) turn tracing on. Without `otlpEndpoint` it has no effect. The span structure may evolve between Claude Code releases; see the [Claude Code monitoring docs](https://code.claude.com/docs/en/monitoring-usage).",
        ),
      },
      predicates: {
        show: (e) => {
          var t;
          return ((t = e.otlp) === null || t === undefined ? undefined : t.endpoint) !== undefined;
        },
      },
    }),
  });
  FM.DictationConfig = Pe.z.object({
    enabled: U.field(Pe.z.boolean().optional(), {
      flatKey: "dictationEnabled",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.44121.1",
        },
        executionTarget: "desktop",
        visibility: "public-undocumented",
      },
      remotePolicy: {
        hybrid: {
          scope: "excluded",
        },
        hotApplied: true,
      },
      title: L.msg({
        defaultMessage: "Dictation",
        id: "DictationEnabled",
      }),
      category: "connection",
      predicates: {
        show: (e) => {
          var t;
          return ((t = e.dictation) === null || t === undefined ? undefined : t.enabled) !== undefined;
        },
      },
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage: "Typically supplied by your bootstrap server when the gateway offers dictation.",
            id: "DictationEnabledDesc",
          }),
        ),
      },
    }),
  });
  var Bce = "user/dictation";
  function MM(e) {
    let inference = e.inference;
    if (
      (inference === null || inference === undefined ? undefined : inference.provider) !== "gateway" ||
      !inference.baseUrl
    )
      return null;
    let n;
    try {
      n = new URL(inference.baseUrl);
    } catch (error) {
      return null;
    }
    if (n.protocol !== "https:" && !ma.LOOPBACK_HOSTS.has(n.hostname)) return null;
    if (n.hostname.startsWith("[")) return null;
    let credential = inference.credential;
    if ((credential === null || credential === undefined ? undefined : credential.kind) !== "interactive")
      return null;
    let oidc = credential.oidc;
    if (
      (oidc === null || oidc === undefined ? undefined : oidc.issuer) ||
      (oidc === null || oidc === undefined ? undefined : oidc.tokenUrl)
    )
      return null;
    return inference.baseUrl;
  }
  function jM(e) {
    var t;
    if (!((t = e.dictation) === null || t === undefined ? undefined : t.enabled)) return null;
    let n = MM(e);
    if (n === null) return null;
    let o = new URL(n);
    if (!o.pathname.endsWith("/")) o.pathname += "/";
    return new URL(Bce, o).href;
  }
  function Vv(e) {
    let t = new URL(e);
    return {
      host: t.host,
      scheme: t.protocol === "http:" ? "ws://" : "wss://",
    };
  }
  function Hce(e) {
    let t = MM(e);
    return t === null ? null : Vv(t);
  }
  function Kce(e) {
    let t = jM(e);
    if (t === null) return null;
    let n = new URL(`${t}/`);
    let o = new URL("stream", n);
    o.protocol = Vv(t).scheme.slice(0, -2);
    return {
      ticketUrl: new URL("ticket", n).href,
      streamUrl: o.href,
    };
  }
  var CM = (e) => {
    var t;
    return ((t = e.tokenLimits) === null || t === undefined ? undefined : t.maxPerWindow) !== undefined;
  };
  FM.TokenLimitsConfig = Pe.z.object({
    maxPerWindow: U.field(Pe.z.coerce.number().int().positive().optional(), {
      flatKey: "inferenceMaxTokensPerWindow",
      readers: ["desktop", "code"],
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
        executionTarget: "desktop",
      },
      title: L.msg({
        defaultMessage: "Max tokens per window",
        id: "aTTY7rU6Bh",
      }),
      category: "limits",
      suffix: L.msg({
        defaultMessage: "tokens",
        id: "ZON8uMn14w",
      }),
      placeholder: L.msg({
        defaultMessage: "5000000",
        id: "1yRrT11eFX",
      }),
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage:
              "Per-user soft cap, counted client-side over the token cap window. Not a server-enforced quota.",
            id: "DJ6DrJYlMf",
          }),
        ),
        long: U.longDescription(
          "Requires `inferenceTokenWindowHours` to also be set \u2014 without a window length the cap is inert and no limit is enforced.",
        ),
      },
    }),
    windowHours: U.field(Pe.z.coerce.number().int().positive().lte(720).optional(), {
      flatKey: "inferenceTokenWindowHours",
      readers: ["desktop", "code"],
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
        executionTarget: "desktop",
      },
      title: L.msg({
        defaultMessage: "Token cap window",
        id: "FSyyISlTnS",
      }),
      category: "limits",
      suffix: L.msg({
        defaultMessage: "hours",
        id: "4MengK4xQ/",
      }),
      placeholder: L.msg({
        defaultMessage: "24",
        id: "wAM7X1pIFa",
      }),
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage: "Tumbling window length for the token cap. Max 720 hours (30 days).",
            id: "3iLLaW8pc5",
          }),
        ),
        long: U.longDescription(
          "Required when `inferenceMaxTokensPerWindow` is set \u2014 the cap only takes effect once both are configured.",
        ),
      },
      predicates: {
        show: CM,
        required: CM,
      },
    }),
  });
  var group_2 = L.msg({
    defaultMessage: "Allowed surfaces",
    id: "XhBz9JhRHE",
  });
  var group_3 = L.msg({
    defaultMessage: "Chat restrictions",
    id: "Ztk/Zc3utE",
  });
  var Om = {
    coworkSurface: (e) => Zv(e).cowork,
    codeSurface: (e) => {
      var t;
      return ((t = e.codeSurface) === null || t === undefined ? undefined : t.enabled) !== false;
    },
    chatSurface: (e) => Zv(e).chat,
  };
  var Vce = L.msg({
    defaultMessage: "At least one surface must remain enabled.",
    id: "LastSurfaceReason",
  });
  var qce = L.msg({
    defaultMessage: "This choice would leave no surface on. Turn on Code first.",
    description:
      "\u201CCode\u201D is a product name \u2014 keep it untranslated in Latin script; translate the rest naturally.",
    id: "LastSurfaceOptionReason",
  });
  function qv(e, t) {
    let n = t === "codeSurface" ? undefined : zM(e);
    if (n) return n;
    if (!Om[t](e)) return false;
    for (let key of Object.keys(Om)) if (key !== t && Om[key](e)) return false;
    return Vce;
  }
  function Kv(e) {
    return Gv(e) === undefined;
  }
  function Gce(e, t, n) {
    var o;
    if (!e.surfaceGrants || Om.codeSurface(n)) return false;
    let r =
      (o = t === undefined ? undefined : U.surfaceGrantFor(e.surfaceGrants, t)) !== null && o !== undefined
        ? o
        : UM(n);
    return r.chat || r.cowork ? false : qce;
  }
  FM.CoworkSurfaceConfig = Pe.z.object({
    enabled: U.field(Pe.z.boolean().optional(), {
      flatKey: "coworkTabEnabled",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.9659.0",
        },
      },
      title: L.msg({
        defaultMessage: "Allow Cowork",
        description:
          "\u201CCowork\u201D is a product name \u2014 keep it untranslated in Latin script; translate the rest of the sentence naturally.",
        id: "pq8krELyA1",
      }),
      default: true,
      failClosedValue: false,
      remotePolicy: {
        applyUnverified: false,
      },
      category: "sandbox",
      group: group_2,
      label: L.msg({
        defaultMessage: "Cowork",
        description: "[no-translate] Product name; must remain exactly \u201CCowork\u201D in every locale.",
        id: "+MH0VdRCHz",
      }),
      order: 0,
      predicates: {
        show: Kv,
        disabled: (e) => qv(e, "coworkSurface"),
      },
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage:
              "Enable Cowork. Claude works on longer tasks like research, analysis, and documents.",
            description:
              "\u201CCowork\u201D is a product name \u2014 keep it untranslated in Latin script; translate the rest of the sentence naturally.",
            id: "N8nKVnjFDF",
          }),
        ),
      },
    }),
  });
  FM.SSH_CLIENT_UNREADABLE_STAND_IN = "/dev/null/unreadable-ssh-client";
  var Wce = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
  var xM = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
  var Bv = 2048;
  var Yce = /^https:\/\/[^@?#\s]+$/;
  var Jce = /https?:\/\/[^/]+\/([^/]+\/[^/]+?)(?:\.git)?$/;
  function Xce(e) {
    return Wce.test(e) && !e.includes("..") && !e.includes("/-");
  }
  function LM(e) {
    return (
      e !== "HEAD" &&
      !e.endsWith(".") &&
      !/^[0-9a-f]{40}$/i.test(e) &&
      !e.startsWith("refs/") &&
      Xce(`refs/heads/${e}`) &&
      e.split("/").every((t) => t !== "" && !t.startsWith(".") && !t.endsWith(".lock"))
    );
  }
  function Qce(e) {
    var t;
    let n = {
      refused: `Must be at most ${Bv} characters`,
    };
    if (!/^https:\/\//i.test(e))
      return {
        refused: "Must be an https:// address",
      };
    if (e.length > Bv) return n;
    let o;
    try {
      o = new URL(e);
    } catch (error) {
      return {
        refused: "Not a valid URL",
      };
    }
    if (/[?#]/.test(e))
      return {
        refused: "Must not carry a query string or fragment",
      };
    let replaced = o.pathname.replace(/\/+$/, "");
    if (replaced === "")
      return {
        refused: "Must name a repository after the host",
      };
    if (/%(?!20)/.test(replaced))
      return {
        refused: "The path may hold no percent-escape but %20",
      };
    let s = `https://${o.host}${replaced}`;
    if (!Yce.test(s))
      return {
        refused: "The path must not hold an @",
      };
    if (s.length > Bv) return n;
    let a = (t = Jce.exec(s)) === null || t === undefined ? undefined : t[1];
    if (a !== undefined && `/${a}` !== replaced.replace(/\.git$/, ""))
      return {
        refused: "An owner/repo may only be the whole path",
      };
    if (a !== undefined && !xM.test(a))
      return {
        refused:
          "A two-part path is an owner and a repository: letters, numbers and . _ - (100 characters each), starting with a letter or number",
      };
    return {
      url: s,
    };
  }
  FM.CodeSurfaceConfig = Pe.z.object({
    enabled: U.field(Pe.z.boolean().optional(), {
      flatKey: "isClaudeCodeForDesktopEnabled",
      support: {
        enabled: {
          scopes: ["3p", "1p"],
          availableInVersion: "1.2581.0",
        },
      },
      title: L.msg({
        defaultMessage: "Allow Code",
        id: "5fWJP5tZx6",
      }),
      default: true,
      failClosedValue: false,
      remotePolicy: {
        applyUnverified: false,
      },
      category: "sandbox",
      group: group_2,
      label: L.msg({
        defaultMessage: "Code",
        id: "h2vipunVVd",
      }),
      order: 1,
      predicates: {
        disabled: (e) => qv(e, "codeSurface"),
      },
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage: "Enable Code. Claude writes and runs code.",
            id: "/vs1W12TA0",
          }),
        ),
      },
    }),
    sshHostAllowlist: U.field(
      U.annotate(Pe.z.array(Pe.z.string().trim().min(1)).optional(), {
        glob: true,
      }),
      {
        flatKey: "sshHostAllowlist",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.40609.0",
          },
          executionTarget: "desktop",
        },
        betaFeatureKey: "sshRemoteSessions",
        title: L.msg({
          defaultMessage: "SSH host allowlist",
          id: "t3bJrMvGzZ",
        }),
        failClosedValue: [],
        category: "sandbox",
        group: Tr.CODE_SURFACE_GROUP,
        order: 16,
        placeholder: L.msg({
          defaultMessage: "*.dev.example.com",
          id: "KWUwe1EqgP",
        }),
        predicates: {
          show: (e) => {
            var t;
            return ((t = e.codeSurface) === null || t === undefined ? undefined : t.enabled) !== false;
          },
        },
        description: {
          short: U.shortDescription(
            L.msg({
              defaultMessage:
                "SSH hosts users may connect to for Code sessions. Empty or unset: off unless the device\u2019s Claude Code managed-settings allowlist applies. * allows any host.",
              id: "KXzmrLfnUT",
            }),
          ),
          long: U.longDescription(
            "When off, the SSH option is hidden and any connection attempt is refused.\n\nEntries are exact hostnames (`build01.corp.example.com`) or `*.` wildcards (`*.corp.example.com` matches the apex and subdomains at any depth); matching is case-insensitive and ignores a `user@` prefix. The list is compared with the `HostName` that the user's SSH configuration (`~/.ssh/config`) gives for the host they entered, or with the entered host itself when the configuration has no entry for it or cannot be evaluated. So an alias is allowed when the host it points to is listed, whatever the alias is called, and refused when it is not. `ProxyCommand` is permitted when the resolved host matches (this key governs which hosts the app offers, not network egress); `ProxyJump` is permitted likewise on the system-OpenSSH engine (the default on macOS and Linux; see `sshTransport`) and refused, with a message suggesting `ProxyCommand`, by the built-in SSH library.\n\nThis is opt-in because a remote session runs Claude Code on the SSH host and the app forwards the session's inference credential to it, plus your OTLP collector endpoint and auth headers when `otlpEndpoint` is set. List only hosts you trust with those. Token-based credentials are forwarded. File-based credentials (Bedrock IAM Identity Center sign-in or AWS profile, Vertex Google sign-in or a credentials file) are never forwarded, and a session that needs one from the device is refused.\n\nIf this key is unset, an `sshHostAllowlist` in Claude Code's own managed-settings file on the device still applies; when both are set, this key wins where the app's configuration is admin-managed (MDM, the admin console, or a device-managed bootstrap URL) and otherwise applies only while that file sets none. `allowedWorkspaceFolders` still applies on the remote host. Claude Code's managed settings on a host replace the sandbox, network, permission, and MCP rules this app sends unless they set `parentSettingsBehavior` to `\"merge\"`.",
            {
              docsUrl: `${Dn.COWORK_3P_DOCS_BASE}/ssh-remote-sessions`,
            },
          ),
        },
      },
    ),
    sshClientPath: U.field(
      U.annotate(ma.safeHelperPath.optional(), {
        pathKind: "file",
      }),
      {
        flatKey: "sshClientPath",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.46388.1",
          },
          executionTarget: "desktop",
        },
        betaFeatureKey: "sshRemoteSessions",
        remotePolicy: {
          requiresUserConsent: true,
        },
        failClosedValue: FM.SSH_CLIENT_UNREADABLE_STAND_IN,
        unreadableStandIn: true,
        title: L.msg({
          defaultMessage: "SSH client program",
          id: "TnZHycC4Xk",
        }),
        category: "sandbox",
        group: Tr.CODE_SURFACE_GROUP,
        order: 16.5,
        placeholder: L.msg({
          defaultMessage: "/opt/openssh/bin/ssh",
          id: "matzhaiItp",
        }),
        predicates: {
          show: (e) => {
            var t;
            return ((t = e.codeSurface) === null || t === undefined ? undefined : t.enabled) !== false;
          },
        },
        description: {
          short: U.shortDescription(
            L.msg({
              defaultMessage:
                "Absolute path to the OpenSSH ssh program the app runs for SSH sessions. Unset: the first ssh on the user\u2019s PATH.",
              id: "CkU2BFhxiC",
            }),
          ),
          long: U.longDescription(
            "Pins which OpenSSH client the app runs wherever it starts `ssh`: evaluating the user's SSH configuration (`ssh -G`), making the SSH connection and its channels, and the Code tab's terminal. `ssh-keygen` and `ssh-add` are taken from the same directory when they exist there, otherwise from PATH. The program must be OpenSSH 7.6 or newer (on Windows, Win32-OpenSSH 9.4 or newer to carry the connection); on macOS and Linux a wrapper script that ends in one is accepted, on Windows it must be a native `.exe` (not a .cmd, .bat or .ps1 script). When this key is set and the program is missing, cannot be run, or is too old, SSH sessions fail with an error telling the user to ask their IT administrator (the configured path is in its details) \u2014 the app never falls back to another ssh. The connection itself runs through this program on the system-OpenSSH engine, which the SSH connection engine setting's `system-openssh` value selects on every platform, including Windows; when the app's built-in SSH library makes the connection instead, this key still governs configuration evaluation (`ssh -G`), host-key lookups (`ssh-keygen`) and the terminal.",
            {
              docsUrl: `${Dn.COWORK_3P_DOCS_BASE}/ssh-remote-sessions`,
            },
          ),
        },
      },
    ),
    sshTransport: U.field(Pe.z.enum(["auto", "system-openssh", "builtin"]).optional(), {
      flatKey: "sshTransport",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.52386.0",
        },
        executionTarget: "desktop",
      },
      betaFeatureKey: "sshRemoteSessions",
      title: L.msg({
        defaultMessage: "SSH connection engine",
        id: "SshTransportTitle",
      }),
      default: {
        displayOnly: "auto",
      },
      optionLabels: {
        auto: L.msg({
          defaultMessage: "Automatic (the build\u2019s default)",
          id: "SshTransportAuto",
        }),
        "system-openssh": L.msg({
          defaultMessage: "System OpenSSH client",
          id: "SshTransportSystemOpenSsh",
        }),
        builtin: L.msg({
          defaultMessage: "Built-in SSH library",
          id: "SshTransportBuiltin",
        }),
      },
      category: "sandbox",
      group: Tr.CODE_SURFACE_GROUP,
      order: 16.7,
      predicates: {
        show: (e) => {
          var t;
          return ((t = e.codeSurface) === null || t === undefined ? undefined : t.enabled) !== false;
        },
      },
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage:
              "Which SSH engine carries Code sessions: the OpenSSH ssh program on the device, or the app\u2019s built-in SSH library. Unset or auto: the build\u2019s default.",
            id: "SshTransportHint",
          }),
        ),
        long: U.longDescription(
          "`system-openssh`: the app makes every SSH connection by running an OpenSSH `ssh` program \u2014 the one `sshClientPath` names, otherwise the first `ssh` on the user's PATH (on Windows, a Win32-OpenSSH `ssh.exe`: the PATH one, else the in-box or Microsoft-installed client) \u2014 so the organization's own OpenSSH build, with its Kerberos/GSSAPI, certificate and `ssh_config` support, is what authenticates. The program must be OpenSSH 7.6 or newer (Windows: Win32-OpenSSH 9.4 or newer). When `sshClientPath` is set and that program cannot be used, sessions fail with an error telling the user to ask their IT administrator rather than falling back; when it is unset and Windows has no usable client, the built-in library is used.\n\n`builtin`: the app's built-in SSH library makes the connection, whatever the build's default.\n\n`auto` or unset: the build's default engine.\n\nAn explicit value applies to new connections (sessions already connected keep their engine) and overrides the build's default in both directions, including any remote switch-off Anthropic ships for the OpenSSH engine \u2014 so with `system-openssh` set, switching back is done here, by setting `builtin`.",
          {
            docsUrl: `${Dn.COWORK_3P_DOCS_BASE}/ssh-remote-sessions`,
          },
        ),
      },
    }),
    allowedRepositories: U.field(
      U.annotate(
        (() => {
          let e = (s) => s.source === "github";
          let t = (s) => s.source === "git";
          let n = {
            label: L.msg({
              defaultMessage: "Source",
              id: "cc9hc4+0K4",
            }),
            optionLabels: {
              github: L.msg({
                defaultMessage: "GitHub",
                id: "SYEyDpPjNk",
              }),
              git: L.msg({
                defaultMessage: "Git URL",
                id: "TpLDdW3nvS",
              }),
            },
            description: {
              short: U.shortDescription(
                L.msg({
                  defaultMessage:
                    "Where the repository lives: GitHub (set repo) or any other Git host (set url).",
                  id: "CodeRepoSourceHint",
                }),
              ),
            },
            predicates: {
              required: () => true,
            },
          };
          let o = {
            ref: U.subfield(
              Ic.marketplaceRef.transform((s, a) => {
                if (s === undefined) return;
                let replaced = s.trim().replace(/^refs\/heads\//, "");
                if (!LM(replaced)) {
                  a.addIssue("Branch names can only use letters, numbers, and . _ / -");
                  return Pe.z.NEVER;
                }
                return replaced;
              }),
              {
                label: L.msg({
                  defaultMessage: "Branch",
                  id: "CodeRepoBranch",
                }),
                description: {
                  short: U.shortDescription(
                    L.msg({
                      defaultMessage:
                        "Branch a session starts from. Leave it out for the repository\u2019s default branch. The person starting a session may type another.",
                      id: "CodeRepoBranchHint",
                    }),
                    {
                      docsOnly: false,
                    },
                  ),
                },
              },
            ),
            name: U.subfield(Pe.z.string().trim().min(1).max(64).optional(), {
              label: L.msg({
                defaultMessage: "Name",
                id: "CodeRepoName",
              }),
              description: {
                short: U.shortDescription(
                  L.msg({
                    defaultMessage:
                      "Shown in the repository list in place of the address. Up to 64 characters.",
                    id: "CodeRepoNameHint",
                  }),
                  {
                    docsOnly: false,
                  },
                ),
              },
            }),
          };
          let r = Pe.z.discriminatedUnion("source", [
            Pe.z.object({
              source: U.subfield(Pe.z.literal("github"), n),
              repo: U.subfield(
                Ic.marketplaceRepo.refine(
                  (s) => xM.test(s),
                  "Owner and repository names can only use letters, numbers, and . _ - (100 characters each)",
                ),
                {
                  label: L.msg({
                    defaultMessage: "Repository",
                    id: "ZHK3DVhcxt",
                  }),
                  isPrimaryKey: true,
                  placeholder: L.msg({
                    defaultMessage: "owner/repo",
                    id: "3pZ8Ut7zIL",
                  }),
                  description: {
                    short: U.shortDescription(
                      L.msg({
                        defaultMessage: "GitHub repository in owner/repo form. Case-insensitive.",
                        id: "2cD0skIoWu",
                      }),
                    ),
                  },
                  predicates: {
                    show: e,
                    required: e,
                  },
                },
              ),
              ...o,
            }),
            Pe.z.object({
              source: U.subfield(Pe.z.literal("git"), n),
              url: U.subfield(
                Ic.marketplaceUrl.transform((s, a) => {
                  let l = Qce(s);
                  if ("refused" in l) {
                    a.addIssue(l.refused);
                    return Pe.z.NEVER;
                  }
                  return l.url;
                }),
                {
                  label: L.msg({
                    defaultMessage: "URL",
                    id: "5M+YdqOWGS",
                  }),
                  isPrimaryKey: true,
                  description: {
                    short: U.shortDescription(
                      L.msg({
                        defaultMessage:
                          "HTTPS clone URL of the repository, with no user name, password, query string or fragment.",
                        id: "CodeRepoUrlHint",
                      }),
                    ),
                  },
                  predicates: {
                    show: t,
                    required: t,
                  },
                },
              ),
              ...o,
            }),
          ]);
          return U.annotate(Pe.z.array(r.nullable().catch(null)), {
            maxItems: 100,
          }).transform((s) => s.filter((a) => a !== null));
        })().optional(),
        {
          redact: "presence",
        },
      ),
      {
        flatKey: "codeAllowedRepositories",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "2.16120.0",
          },
          visibility: "public-undocumented",
        },
        betaFeatureKey: "selfHostedSessions",
        remotePolicy: {
          hybrid: {
            scope: "excluded",
          },
        },
        title: L.msg({
          defaultMessage: "Allowed repositories",
          id: "CodeReposTitle",
        }),
        failClosedValue: [],
        emptyListIsAuthored: true,
        checkDropped: (e, t) => {
          var n;
          let o = U.unwrapZod(FM.CodeSurfaceConfig.shape.allowedRepositories);
          let r = U.unwrapZod((n = U.arrayElementOf(o)) !== null && n !== undefined ? n : o);
          (Array.isArray(e) ? e : []).forEach((s, a) => {
            let l = r.safeParse(s);
            if (!l.success) {
              let joined = l.error.issues
                .map((issue) => `${issue.path.join(".") || "."}: ${issue.message}`)
                .join("; ");
              t(`codeAllowedRepositories[${a}] dropped: ${joined}`);
            }
          });
        },
        category: "sandbox",
        group: Tr.CODE_SURFACE_GROUP,
        order: 17,
        predicates: {
          show: (e) => {
            var t;
            return ((t = e.codeSurface) === null || t === undefined ? undefined : t.enabled) !== false;
          },
        },
        addLabel: L.msg({
          defaultMessage: "Add repository",
          id: "CodeReposAdd",
        }),
        presets: [
          {
            label: "GitHub repo",
            item: {
              source: "github",
              repo: "",
            },
          },
          {
            label: "Git URL",
            item: {
              source: "git",
              url: "",
            },
          },
        ],
        description: {
          short: U.shortDescription(
            L.msg({
              defaultMessage: "Git repositories Claude Code may work in.",
              id: "CodeReposHint",
            }),
          ),
          long: U.longDescription(
            'The git repositories Claude Code may work in on this install, in the two git forms a plugin marketplace entry takes: `{"source": "github", "repo": "owner/repo"}`, or `{"source": "git", "url": "https://git.example.com/group/project.git"}` for another Git host. Either may add `ref`, the branch a session starts from (a branch name, not a tag or commit; leave it out for the default branch; a person may type another), and `name`, a label shown for the address (up to 64 characters). A `url` is `https://` with no user name, password, query string or fragment (Azure DevOps shows a clone URL with a user name: leave it out); an address written without a scheme is read as `https://`.\n\nBeta. Today: where Code sessions run on a self-hosted session host, people pick a session\'s repository from this list and cannot type an address; with no list, or an empty one, none is offered and a session starts in the environment\'s own workspace. The session host still applies its own policy to what it clones. Where sessions run on the device, the key is accepted and has no effect yet: limiting local folders to those whose `origin` is listed, alongside `allowedWorkspaceFolders`, is planned.\n\nEntries are held to what a session host, the only reader so far, accepts: owner and repository names of letters, numbers and `. _ -` (100 characters each) that must start with a letter or number, a branch name both it and git accept, an address of at most 2048 characters whose path has no percent-escape but `%20`.\n\nUnset: there is no list. Empty, or a value that cannot be read as a list: there are no repositories, so none can be chosen; an unreadable value, or a list with no readable entry, is reported and never treated as unset; an empty list an admin writes stays an empty list on every surface. An entry that cannot be read is left out and reported by its position (the first is 0), with the reason; the other entries, and the rest of the configuration, stand.',
          ),
        },
      },
    ),
  });
  FM.ChatSurfaceConfig = Pe.z.object({
    enabled: U.field(Pe.z.boolean().optional(), {
      flatKey: "chatTabEnabled",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.13576.0",
        },
        executionTarget: "desktop",
      },
      title: L.msg({
        defaultMessage: "Allow Chat",
        id: "0Cc9oG2J04",
      }),
      category: "sandbox",
      group: group_2,
      label: L.msg({
        defaultMessage: "Chat",
        id: "WTrOy36sdu",
      }),
      order: 2,
      predicates: {
        show: Kv,
        disabled: (e) => qv(e, "chatSurface"),
      },
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage: "Enable Chat. Quick questions and drafting.",
            id: "z2x73mCBZ9",
          }),
        ),
      },
    }),
    advancedFileAnalysis: U.field(Pe.z.boolean().optional(), {
      flatKey: "chatAdvancedFileAnalysisEnabled",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.14271.0",
        },
        executionTarget: "desktop",
      },
      title: L.msg({
        defaultMessage: "Advanced file analysis",
        id: "ChatAdvancedFileAnalysisEnabled",
      }),
      category: "sandbox",
      group: group_3,
      order: 20,
      predicates: {
        show: (e) => {
          var t;
          return Kv(e) && ((t = e.chatSurface) === null || t === undefined ? undefined : t.enabled) !== false;
        },
        disabled: (e) => {
          var t;
          return (t = zM(e)) !== null && t !== undefined ? t : false;
        },
      },
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage:
              "Allow Claude to run code in a local sandbox to analyze attached files it can\u2019t read natively \u2014 like Excel and PowerPoint. Off by default.",
            id: "EC49vAdH1s",
          }),
        ),
        long: U.longDescription(
          "Also enables inline data analysis. Of the user's own files, the sandbox can read only those attached to the conversation, plus folders added to the chat's project through the app (read-only). By default it has no network access. Project folders are not available in the sandbox of a chat started while a rule on `Read`, `Grep` or `Glob` is set: in `disabledBuiltinTools`, in `builtinToolPolicy` with a value other than `allow`, or as a deny or ask rule in Claude Code's own managed settings on the device, whether or not the rule covers the folder. They are not available either where those managed settings cannot be read, or where Claude Code takes its managed settings from a gateway. Claude's file tools still read what the rules allow.",
        ),
      },
    }),
    desktopHome: U.field(Pe.z.enum(["standard", "simple", "no-vm", "off"]).optional(), {
      flatKey: "desktopHome",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.52386.0",
        },
        values: {
          "no-vm": {
            availableInVersion: "2.2553.0",
          },
        },
      },
      optionValues: ["standard", "off"],
      failClosedValue: "off",
      remotePolicy: {
        applyUnverified: false,
      },
      title: L.msg({
        defaultMessage: "Desktop home",
        id: "DesktopHome",
      }),
      surfaceGrants: {
        standard: {
          chat: true,
          fileAnalysis: true,
          cowork: true,
        },
        simple: {
          chat: true,
          fileAnalysis: true,
          cowork: false,
        },
        "no-vm": {
          chat: true,
          fileAnalysis: false,
          cowork: false,
        },
        off: {
          chat: false,
          fileAnalysis: false,
          cowork: false,
        },
      },
      surfaceGrantsReason: L.msg({
        defaultMessage: "Desktop home decides this while it is set.",
        description:
          "\u201CDesktop home\u201D is the title of another setting on this page; use the same translation as that title.",
        id: "DesktopHomeDecides",
      }),
      optionLabels: {
        standard: L.msg({
          defaultMessage: "Standard",
          id: "DesktopHomeStandard",
        }),
        simple: L.msg({
          defaultMessage: "Simple: Chat with file analysis",
          description:
            "\u201CChat\u201D is a product name \u2014 keep it untranslated in Latin script; translate the rest naturally.",
          id: "DesktopHomeSimple",
        }),
        "no-vm": L.msg({
          defaultMessage: "No VM: Chat without file analysis",
          description:
            "\u201CChat\u201D is a product name and \u201CVM\u201D abbreviates virtual machine \u2014 keep \u201CChat\u201D untranslated in Latin script; translate the rest naturally.",
          id: "DesktopHomeNoVm",
        }),
        off: L.msg({
          defaultMessage: "Off: Code only",
          description:
            "\u201CCode\u201D is a product name \u2014 keep it untranslated in Latin script; translate the rest naturally.",
          id: "DesktopHomeOff",
        }),
      },
      category: "sandbox",
      group: group_2,
      order: 3,
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage:
              "Unifies Chat and Cowork into one home. When set, it replaces Allow Chat, Advanced file analysis, and Allow Cowork. Leave unset to keep those.",
            description:
              "\u201CChat\u201D and \u201CCowork\u201D are product names \u2014 keep them untranslated in Latin script; translate the rest naturally.",
            id: "DesktopHomeDesc",
          }),
        ),
        long: U.longDescription(
          "`standard` turns on Chat, file analysis, and Cowork together in one home. `off` turns all three off. `isClaudeCodeForDesktopEnabled` still decides Code. Remove the key to hand control back to `chatTabEnabled`, `chatAdvancedFileAnalysisEnabled`, and `coworkTabEnabled`. Values are case-sensitive, so `Standard` is not recognized. A value that the app does not recognize is read as `off`, so update the app on devices before you deploy a value added in a later version.",
        ),
      },
    }),
  });
  FM.SURFACE_GRANT_FIELDS = Object.entries(FM.ChatSurfaceConfig.shape).flatMap(([key, value]) => {
    let n = U.fieldMetaForNode(value);
    return (n === null || n === undefined ? undefined : n.surfaceGrants) && n.flatKey
      ? [
          {
            key,
            flatKey: n.flatKey,
            grants: n.surfaceGrants,
            reason: n.surfaceGrantsReason,
          },
        ]
      : [];
  });
  function NM(e) {
    var t;
    let n = (t = e.chatSurface) !== null && t !== undefined ? t : {};
    for (let o of FM.SURFACE_GRANT_FIELDS) {
      let r = U.surfaceGrantFor(o.grants, n[o.key]);
      if (r)
        return {
          field: o,
          grant: r,
        };
    }
    return;
  }
  function Gv(e) {
    var t;
    return (t = NM(e)) === null || t === undefined ? undefined : t.grant;
  }
  function UM(e) {
    var t;
    var n;
    var o;
    return {
      chat: ((t = e.chatSurface) === null || t === undefined ? undefined : t.enabled) === true,
      fileAnalysis:
        ((n = e.chatSurface) === null || n === undefined ? undefined : n.advancedFileAnalysis) === true,
      cowork: ((o = e.coworkSurface) === null || o === undefined ? undefined : o.enabled) !== false,
    };
  }
  function Zv(e) {
    var t;
    return (t = Gv(e)) !== null && t !== undefined ? t : UM(e);
  }
  function zM(e) {
    var t;
    return (t = NM(e)) === null || t === undefined ? undefined : t.field.reason;
  }
  var group_4 = L.msg({
    defaultMessage: "Extensions",
    id: "nb2FlN/G2m",
  });
  FM.ExtensionsConfig = Pe.z.object({
    enabled: U.field(Pe.z.boolean().optional(), {
      flatKey: "isDesktopExtensionEnabled",
      support: {
        enabled: {
          scopes: ["3p", "1p"],
          availableInVersion: "1.2581.0",
        },
        executionTarget: "desktop",
      },
      title: L.msg({
        defaultMessage: "Allow desktop extensions",
        id: "knHnvzpkOf",
      }),
      default: false,
      legacyFlatKey: {
        name: "isDxtEnabled",
        effect:
          "the old name will be reported as unreadable and the key will read as false: desktop extensions will be disabled until the name is updated",
        ...Ac.BATCH_2026_09,
      },
      failClosedValue: false,
      egressRequirements: (e) => (e === false ? [] : RM.PYTHON_EXTENSION_RUNTIME_HOSTS),
      egressRequirementsLabel: L.msg({
        defaultMessage: "Desktop extensions (Python runtime)",
        id: "8Jc9WEC0S8",
      }),
      category: "connectors",
      group: group_4,
      order: 11,
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage: ".dxt and .mcpb installs.",
            id: "2IB0Hxh1vO",
          }),
        ),
        long: U.longDescription(
          "1P builds default to enabled at runtime unless this is explicitly set. In 3P, enabling this allows loading extensions; local install additionally requires an org policy backend.",
        ),
      },
    }),
    directoryEnabled: U.field(Pe.z.boolean().optional(), {
      flatKey: "isDesktopExtensionDirectoryEnabled",
      support: {
        enabled: {
          scopes: ["1p"],
          availableInVersion: "1.2581.0",
        },
      },
      title: L.msg({
        defaultMessage: "Show extension directory",
        id: "bqOLf0vLQm",
      }),
      default: {
        displayOnly: true,
      },
      legacyFlatKey: {
        name: "isDxtDirectoryEnabled",
        effect:
          "the old name will be reported as unreadable and not read, leaving the key unset: the extension directory will show and no directory-only install restriction will apply until the name is updated",
        ...Ac.BATCH_2026_09,
      },
      category: "connectors",
      group: group_4,
      order: 12,
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage: "The in-app catalogue of installable extensions. Hide to allow sideload only.",
            id: "g8s4jWgsLf",
          }),
        ),
      },
      predicates: {
        show: (e) => {
          var t;
          return ((t = e.extensions) === null || t === undefined ? undefined : t.enabled) !== false;
        },
      },
    }),
    signatureRequired: U.field(Pe.z.boolean().optional(), {
      flatKey: "isDesktopExtensionSignatureRequired",
      support: {
        enabled: {
          scopes: ["3p", "1p"],
          availableInVersion: "1.2581.0",
        },
        executionTarget: "desktop",
      },
      title: L.msg({
        defaultMessage: "Require signed extensions",
        id: "bmP92ZCban",
      }),
      default: false,
      legacyFlatKey: {
        name: "isDxtSignatureRequired",
        effect:
          "the old name will be reported as unreadable and the key will read as true: only signed extensions will load until the name is updated",
        ...Ac.BATCH_2026_09,
      },
      failClosedValue: true,
      category: "connectors",
      group: group_4,
      order: 13,
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage: "Reject desktop extensions that are not signed by a trusted publisher.",
            id: "DY0aw7svrD",
          }),
        ),
      },
      predicates: {
        show: (e) => {
          var t;
          return ((t = e.extensions) === null || t === undefined ? undefined : t.enabled) !== false;
        },
      },
    }),
  });
  FM.AutoUpdateConfig = Pe.z.object({
    disabled: U.field(Pe.z.boolean().optional(), {
      flatKey: "disableAutoUpdates",
      support: {
        enabled: {
          scopes: ["3p", "1p"],
          availableInVersion: "1.2581.0",
        },
      },
      appBehaviorOnly: true,
      title: L.msg({
        defaultMessage: "Block auto-updates",
        id: "OX1+jdVwLL",
      }),
      default: false,
      category: "telemetry",
      group: Tr.UPDATES_GROUP,
      order: 20,
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage:
              "Stop Claude Desktop from fetching updates entirely (no time limit). You\u2019ll need to push new versions yourself.",
            id: "t/LNoeQ72j",
          }),
        ),
        long: U.longDescription(
          "In third-party deployments this also keeps Cowork's workspace image and tools from being fetched ahead of use; they are then fetched when a task first needs them.",
        ),
      },
      predicates: {
        warn: (e) =>
          e === true
            ? L.msg({
                defaultMessage:
                  "Security and compatibility fixes will not install automatically. Make sure IT has another distribution path.",
                id: "1oztgcYddf",
              })
            : null,
      },
    }),
    enforcementHours: U.field(Pe.z.coerce.number().int().gt(0).lte(72).optional(), {
      flatKey: "autoUpdaterEnforcementHours",
      support: {
        enabled: {
          scopes: ["3p", "1p"],
          availableInVersion: "1.2581.0",
        },
      },
      appBehaviorOnly: true,
      title: L.msg({
        defaultMessage: "Auto-update enforcement window",
        id: "jJz20QocAd",
      }),
      category: "telemetry",
      group: Tr.UPDATES_GROUP,
      order: 21,
      suffix: L.msg({
        defaultMessage: "hours",
        id: "4MengK4xQ/",
      }),
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage:
              "Hours before a downloaded update force-installs. Only applies when auto-updates are enabled. Blank = 72-hour default.",
            id: "VyqfjIW6Iv",
          }),
        ),
        long: U.longDescription(
          "Has no effect when `disableAutoUpdates` is in place at launch: the updater never starts, so nothing is downloaded and this timer never arms. If the policy reaches an already-running app after an update has downloaded, that one staged update still installs on this timer; no further updates are fetched.\n\nLeaving it blank uses the 72-hour default *and* then waits for the machine to be idle (10+ minutes without input) before restarting; setting any explicit value (including 72) restarts once the window elapses regardless of user activity. In both cases the restart holds off while Claude is mid-task.",
        ),
      },
      predicates: {
        show: (e) => {
          var t;
          return ((t = e.autoUpdate) === null || t === undefined ? undefined : t.disabled) !== true;
        },
      },
    }),
    viaUpdatesHost: U.field(Pe.z.boolean().optional(), {
      flatKey: "updateViaUpdatesHost",
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.26832.0",
        },
      },
      appBehaviorOnly: true,
      title: L.msg({
        defaultMessage: "Check for updates on releases.claude.com",
        id: "UpdateViaUpdatesHost",
      }),
      default: false,
      category: "telemetry",
      group: Tr.UPDATES_GROUP,
      order: 22,
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage:
              "Read the update feed from releases.claude.com so api.anthropic.com can stay blocked.",
            id: "UpdateViaUpdatesHostShort",
          }),
        ),
        long: U.longDescription(
          "By default the app asks `api.anthropic.com` which version to install. That host also serves the model APIs, so organizations that block un-approved LLM endpoints at the network edge end up blocking updates too.\n\nTurn this on to read the same feed from `releases.claude.com`, a hostname that carries no model API. `api.anthropic.com` can then stay blocked without breaking auto-update. Rollout behavior is unchanged; the installer download still comes from `downloads.claude.ai` as before.",
        ),
      },
      predicates: {
        show: (e) => {
          var t;
          return ((t = e.autoUpdate) === null || t === undefined ? undefined : t.disabled) !== true;
        },
      },
    }),
    dangerousMaxVersion: U.field(Dn.desktopVersionString().optional(), {
      flatKey: "dangerousMaxVersion",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.110.0",
        },
        visibility: "public-undocumented",
      },
      appBehaviorOnly: true,
      title: L.msg({
        defaultMessage: "Maximum version",
        id: "DangerousMaxVersion",
      }),
      category: "telemetry",
      group: Tr.UPDATES_GROUP,
      order: 22.5,
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage:
              "Third-party deployments only. Auto-update stops at this version (X.Y.Z) and devices on newer versions cannot open Claude. Delays security fixes; leave unset.",
            id: "DangerousMaxVersionShort",
          }),
        ),
        long: U.longDescription(
          "Third-party deployments only. Caps the Claude version your devices run. Update checks take the newest release at or below this version and nothing newer. Devices on a version from before this setting existed don't send the cap, so they update past it and are then blocked: move your fleet onto a version that supports this setting, or turn off auto-updates, before you set a cap below the latest release. Use `X.Y.Z` form, e.g. `1.2581.0`; `v1.2581.0` also works.\n\nA device on a newer version, including a fresh install of one, cannot open Claude. It shows a message that names both versions and asks the person to contact their admin, and the only option is to quit. Only a cap your organization delivers blocks: a device-management profile or machine policy, the admin console, or a bootstrap server. A cap set only in the local Setup UI, or in a per-user Windows policy, caps updates but does not block. When a profile that configures the connection also names a configuration server, the served configuration is authoritative once fetched and must restate the cap; the profile's value blocks only while the server can't be reached, and before sign-in it caps updates without blocking. A profile that sets only app-behavior keys wins over a served value. The cap never downgrades or rolls back a device. An update that finished downloading before the cap reached a device can still install, and that device is then blocked too.\n\nWhile it is set, security and compatibility fixes in newer releases do not install, so Anthropic recommends leaving it unset. If you use it, raise it as you approve each new version: devices below the new value update to it on their next update check, and `autoUpdaterEnforcementHours` still restarts them within its window.\n\n`disableAutoUpdates` takes precedence for updates: with both set, nothing updates, and devices on a newer version are still blocked. On Linux, where the package manager (apt) delivers updates, it caps nothing but still blocks newer versions.",
        ),
      },
      predicates: {
        warn: (e) =>
          e
            ? L.msg({
                defaultMessage:
                  "Devices on a newer version cannot open Claude, and security fixes in newer releases do not install, until you raise or remove this cap.",
                id: "DangerousMaxVersionWarn",
              })
            : null,
      },
    }),
  });
  var group_5 = L.msg({
    defaultMessage: "Feature announcements",
    id: "FeatureAnnouncementsGroup",
  });
  FM.FeatureDiscoveryConfig = Pe.z.object({
    disabled: U.field(Pe.z.boolean().optional(), {
      flatKey: "disableFeatureDiscovery",
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.21459.0",
        },
      },
      title: L.msg({
        defaultMessage: "Hide feature announcements",
        id: "DisableFeatureDiscoveryTitle",
      }),
      default: false,
      failClosedValue: true,
      category: "appearance",
      group: group_5,
      order: 10,
      description: {
        short: U.shortDescription(
          L.msg({
            defaultMessage:
              "Suppress unprompted feature-announcement UI: the post-update \u201CWhat\u2019s new\u201D nudge and new-feature tips. Users can still open release notes themselves.",
            id: "DisableFeatureDiscoveryHint",
          }),
        ),
        long: U.longDescription(
          `Covers the version-shipped announcement UI baked into each release: the **What's new** button that appears on its own after an update, and the one-time **New feature** tips (coach-marks) that point out newly shipped capabilities. Useful when your organization gates feature availability and doesn't want the app advertising capabilities you haven't rolled out.

` +
            "User-initiated surfaces stay: the What's-new menu item and header button still open the release notes on demand. Auto-update behavior is unaffected \u2014 that is governed by `disableAutoUpdates` and `autoUpdaterEnforcementHours`.",
        ),
      },
    }),
  });
});
//@ chunk-1ny7cxrt.js:930804-938185 cjs-unmatched+string-clue
var Wv = x(function (WM) {
  Object.defineProperty(WM, "__esModule", {
    value: true,
  });
  WM.BootstrapConfig = undefined;
  var Tc = require_v3();
  var GM = Xr();
  var Ct = yt();
  var ei = $n();
  var At = mn();
  var $c = Ar();
  var Si = zi();
  var show = (e) => {
    var t;
    return Boolean((t = e.bootstrap) === null || t === undefined ? undefined : t.url);
  };
  var qM = ei.legacyKvEncodingNotice(
    "bootstrapHeaders",
    "no bootstrap request headers will be sent (the fetch may then fail to authenticate)",
  );
  WM.BootstrapConfig = Tc.z.object({
    enabled: Ct.field(Tc.z.boolean().optional(), {
      flatKey: "bootstrapEnabled",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.10628.0",
        },
      },
      remotePolicy: {
        type: "remote-disabled",
      },
      title: At.msg({
        defaultMessage: "Use bootstrap config",
        id: "Q6zr1vGzlF",
      }),
      default: true,
      category: "source",
      group: Si.BOOTSTRAP_GROUP,
      description: {
        short: Ct.shortDescription(
          At.msg({
            defaultMessage:
              "Fetch and apply the URL above at launch. Turn off to keep the URL saved but skip the fetch.",
            id: "0Nsvk4xG6E",
          }),
        ),
      },
      predicates: {
        show,
      },
    }),
    url: Ct.field(
      Ct.annotate($c.httpsUrl.optional(), {
        redact: "hostname",
      }),
      {
        flatKey: "bootstrapUrl",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.10628.0",
          },
        },
        remotePolicy: {
          type: "remote-disabled",
        },
        activatesThirdPartyMode: (e, t) => {
          var n;
          var o;
          return (
            (t || Boolean((n = e.bootstrap) === null || n === undefined ? undefined : n.url)) &&
            ((o = e.bootstrap) === null || o === undefined ? undefined : o.enabled) !== false
          );
        },
        title: At.msg({
          defaultMessage: "Bootstrap config URL",
          id: "MPdK0gXvRA",
        }),
        egressRequirements: (e, t) => {
          var n;
          return ((n = t.bootstrap) === null || n === undefined ? undefined : n.enabled) === false
            ? []
            : ei.singleHostEgress(e);
        },
        egressRequirementsLabel: At.msg({
          defaultMessage: "Bootstrap config server",
          id: "qjMZL1XFnR",
        }),
        category: "source",
        group: Si.BOOTSTRAP_GROUP,
        placeholder: At.msg({
          defaultMessage: "https://config.example.com/claude-desktop",
          id: "IHENczwSR2",
        }),
        description: {
          short: Ct.shortDescription(
            At.msg({
              defaultMessage:
                "HTTPS endpoint that returns a per-user JSON config overlay. Values from the response override local settings and become read-only.",
              id: "5SJ4ZG3Kp2",
            }),
          ),
        },
      },
    ),
    oidc: Ct.field($c.BootstrapFetchOidc.optional(), {
      flatKey: "bootstrapOidc",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.10628.0",
        },
      },
      remotePolicy: {
        type: "remote-disabled",
      },
      title: At.msg({
        defaultMessage: "Bootstrap OIDC parameters",
        id: "zS5yI0rzXy",
      }),
      egressRequirements: (e, t) => {
        var n;
        return ((n = t.bootstrap) === null || n === undefined ? undefined : n.enabled) === false
          ? []
          : ei.oidcEgressHosts(e);
      },
      egressRequirementsLabel: At.msg({
        defaultMessage: "Bootstrap sign-in (OIDC)",
        id: "q2PtfeOums",
      }),
      category: "source",
      group: Si.BOOTSTRAP_GROUP,
      description: {
        short: Ct.shortDescription(
          At.msg({
            defaultMessage:
              "When set, the bootstrap request sends a Bearer token from a browser sign-in (authorization-code-with-PKCE).",
            id: "USlfHdFqDQ",
          }),
        ),
        long: Ct.longDescription(
          "Set this to use a separate identity provider (Microsoft Entra ID, Okta, Ping, or any compliant OIDC provider) for the bootstrap sign-in. The app runs an authorization-code-with-PKCE flow in the system browser. Omit to use device-code mode against the bootstrap server's own origin.\n\nThis is an **object-typed key** \u2014 in an MDM profile it is a single JSON-string value, not separate keys with dotted names like `bootstrapOidc.clientId`. Writing the sub-fields as separate registry values causes the app to silently fall through to device-code mode.",
          {
            docsUrl: `${ei.COWORK_3P_DOCS_BASE}/bootstrap`,
          },
        ),
      },
      predicates: {
        show,
      },
    }),
    headers: Ct.field(
      Ct.annotate(ei.kvRecord(qM).optional(), {
        redact: "presence",
      }),
      {
        flatKey: "bootstrapHeaders",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.32885.1",
          },
        },
        deprecations: [qM],
        remotePolicy: {
          type: "remote-disabled",
        },
        title: At.msg({
          defaultMessage: "Bootstrap request headers",
          id: "BootstrapHeadersTitle",
        }),
        category: "source",
        group: Si.BOOTSTRAP_GROUP,
        placeholder: {
          key: At.msg({
            defaultMessage: "Authorization",
            id: "BootstrapHdrKeyPh",
          }),
          value: At.msg({
            defaultMessage: "Basic \u2026",
            id: "BootstrapHdrValPh",
          }),
        },
        addLabel: At.msg({
          defaultMessage: "Add header",
          id: "IxbsWX4wj4",
        }),
        description: {
          short: Ct.shortDescription(
            At.msg({
              defaultMessage:
                "HTTP headers sent on every bootstrap config fetch. Use this instead of embedding user:pass@ in the URL.",
              id: "BootstrapHeadersHint",
            }),
          ),
          long: Ct.longDescription(
            'Static headers sent on every request to the bootstrap config URL \u2014 for a service-account credential (`Authorization: Basic \u2026`, an API key header) or a routing/tenant header. When either this or the headers helper script is set and no separate `bootstrapOidc` provider is configured, the app treats the headers as sufficient auth and does not require a per-user sign-in for the bootstrap fetch. These headers (and the helper script\'s below) also accompany requests to a plugin marketplace this server hosts on its own origin (`allowedPluginMarketplaces` with `credentialKind: "inferenceCredential"`). Header values are masked in diagnostics and telemetry. For a rotating token, use the headers helper script instead.',
            {
              docsUrl: `${ei.COWORK_3P_DOCS_BASE}/bootstrap`,
            },
          ),
        },
        predicates: {
          show,
        },
      },
    ),
    headersHelper: Ct.field(
      Ct.annotate($c.safeHelperPath.optional(), {
        pathKind: "file",
      }),
      {
        flatKey: "bootstrapHeadersHelper",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.32885.1",
          },
        },
        remotePolicy: {
          type: "remote-disabled",
        },
        title: At.msg({
          defaultMessage: "Bootstrap headers helper script",
          id: "BootstrapHeadersHelperTitle",
        }),
        category: "source",
        group: Si.BOOTSTRAP_GROUP,
        placeholder: At.msg({
          defaultMessage: "/usr/local/bin/bootstrap-headers-helper",
          id: "BootstrapHeadersHelperPh",
        }),
        mono: true,
        description: {
          short: Ct.shortDescription(
            At.msg({
              defaultMessage:
                "Absolute path to an executable that prints a JSON object of bootstrap request headers. Merged over the static headers; the helper wins.",
              id: "BootstrapHeadersHelperHint",
            }),
          ),
          long: Ct.longDescription(
            'Absolute path to an executable that prints a single JSON object of HTTP headers on stdout, e.g. `{"Authorization": "Bearer \u2026"}`. The app runs it (no arguments; output cached for a few minutes) before each bootstrap config fetch and merges the result over **Bootstrap request headers** (the helper wins on conflict). Use this instead of embedding `user:pass@` in the bootstrap URL, or when the bootstrap server needs a rotating token from a secrets manager. When either this or the static headers are set and no separate `bootstrapOidc` provider is configured, the app treats them as sufficient auth and does not require a per-user sign-in for the bootstrap fetch. If a per-user sign-in also runs (`bootstrapOidc` or the server\u2019s own device-code flow), that Bearer token wins on `Authorization`.',
            {
              docsUrl: `${ei.COWORK_3P_DOCS_BASE}/bootstrap`,
            },
          ),
        },
        predicates: {
          show,
        },
      },
    ),
    trustBootstrapDelivery: Ct.field(Tc.z.boolean().optional(), {
      flatKey: "trustBootstrapDelivery",
      legacyFlatKey: {
        name: "trustBootstrapLocalExec",
        effect:
          "the key will read as false (its fail-closed value): each user will be asked to consent to bootstrap-delivered sign-in targets, endpoints, helper scripts and connectors, even when the bootstrap URL came from a device-managed profile",
        ...GM.BATCH_2026_09,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.26832.0",
        },
      },
      failClosedValue: false,
      title: At.msg({
        defaultMessage: "Trust bootstrap-delivered settings",
        id: "vRHCNG9xkY",
      }),
      default: false,
      category: "source",
      group: Si.BOOTSTRAP_GROUP,
      remotePolicy: {
        type: "remote-disabled",
      },
      description: {
        short: Ct.shortDescription(
          At.msg({
            defaultMessage:
              "Skip the per-user consent prompt for sign-in targets, inference endpoints, helper scripts, and connectors the bootstrap server delivers.",
            id: "f6Kz1NkBdU",
          }),
        ),
      },
      predicates: {
        show,
      },
    }),
  });
});
//@ chunk-1ny7cxrt.js:938185-945366 cjs-unmatched+string-clue
var Yv = x(function (ej) {
  Object.defineProperty(ej, "__esModule", {
    value: true,
  });
  ej.LifecycleConfig = ej.RELAUNCH_ENFORCEMENT_DEFAULT_HOURS = ej.CONFIG_RELAUNCH_IDLE_MINUTES = undefined;
  var cs = require_v3();
  var tr = yt();
  var $r = mn();
  var Rc = zi();
  ej.CONFIG_RELAUNCH_IDLE_MINUTES = 2;
  ej.RELAUNCH_ENFORCEMENT_DEFAULT_HOURS = 24;
  var JM = 10;
  var XM = 2;
  var QM = 30;
  ej.LifecycleConfig = cs.z.object({
    relaunchEnforcementHours: tr.field(
      cs.z.preprocess(
        (e) => (typeof e === "string" && e.trim() !== "" ? Number(e) : e),
        cs.z.number().int().min(0).lte(336).optional(),
      ),
      {
        flatKey: "relaunchEnforcementHours",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.40609.0",
          },
        },
        appBehaviorOnly: true,
        remotePolicy: {
          hotApplied: true,
        },
        title: $r.msg({
          defaultMessage: "Configuration relaunch window",
          id: "RelaunchEnforcementHoursTitle",
        }),
        default: ej.RELAUNCH_ENFORCEMENT_DEFAULT_HOURS,
        category: "telemetry",
        group: Rc.UPDATES_GROUP,
        order: 23,
        suffix: $r.msg({
          defaultMessage: "hours",
          id: "4MengK4xQ/",
        }),
        description: {
          short: tr.shortDescription(
            $r.msg({
              defaultMessage:
                "Hours a user may keep working on the old configuration after a managed-configuration change is detected. 0 = restart required at once. Blank = 24 hours.",
              id: "RelaunchEnforcementHoursShort",
            }),
          ),
          long: tr.longDescription(
            "Set it via MDM (plist, registry, or file) or serve it from your configuration endpoint (remote bootstrap configuration). When the running app observes a managed-configuration change it cannot apply without restarting, it shows the sidebar relaunch card and starts this window. The window starts at the running app\u2019s next configuration re-check (the re-check interval beside it), so allow up to one re-check interval on top of this value between saving a change and the restart dialog. When the window ends the app blocks with a restart dialog and restarts on its own after " +
              `${ej.CONFIG_RELAUNCH_IDLE_MINUTES} minutes with no activity (no running Claude task and no keyboard or pointer input); the user can also restart right away. Defaults to ${ej.RELAUNCH_ENFORCEMENT_DEFAULT_HOURS} hours. Set a larger value (up to 336 = 14 days) to give users longer; \`0\` shows the dialog at the first observation.

A served value is read from the newest served configuration, so tightening or loosening the window takes effect without a restart once two re-checks in a row have served it, and a change to this key alone never asks for one. Like the update keys beside it, a value from a device-management profile that sets only app-behavior keys applies without making the rest of the configuration device-managed, and takes precedence over a served one. Because the key is grouped with the other app-behavior keys, a profile that sets any of them claims the whole group: set this key in the same profile as the update keys you deploy, or a served value is ignored on those devices and the ${ej.RELAUNCH_ENFORCEMENT_DEFAULT_HOURS}-hour default applies.`,
          ),
        },
      },
    ),
    configRecheckIntervalMinutes: tr.field(cs.z.coerce.number().int().gte(XM).lte(QM).optional(), {
      flatKey: "configRecheckIntervalMinutes",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.46388.1",
        },
      },
      appBehaviorOnly: true,
      remotePolicy: {
        hotApplied: true,
      },
      title: $r.msg({
        defaultMessage: "Configuration re-check interval",
        id: "ConfigRecheckIntervalMinutesTitle",
      }),
      default: JM,
      category: "telemetry",
      group: Rc.UPDATES_GROUP,
      order: 24,
      suffix: $r.msg({
        defaultMessage: "minutes",
        id: "ConfigRecheckIntervalMinutesSuffix",
      }),
      description: {
        short: tr.shortDescription(
          $r.msg({
            defaultMessage:
              "Minutes between the running app\u2019s checks for a changed managed configuration. Blank = 10 minutes.",
            id: "ConfigRecheckIntervalMinutesShort",
          }),
        ),
        long: tr.longDescription(
          `How often the running app re-checks its managed configuration for changes: it re-polls your configuration endpoint with a conditional request, so an unchanged configuration costs one \`304\` round-trip. A detected change shows the sidebar relaunch card and starts the \`relaunchEnforcementHours\` window, so a saved change reaches a running app within roughly one interval. Defaults to ${JM} minutes; each wait is jittered by \xB110% so a fleet does not poll in lockstep. Values outside ${XM}\u2013${QM} are rejected with a parse error and the default applies.

` +
            "Applied without a restart: a new served value re-arms the timer once two checks in a row have served it, and a change to this key alone never asks for a relaunch. Set it via MDM or serve it from your configuration endpoint; like the update keys beside it, a value from a device-management profile that sets only app-behavior keys applies without making the rest of the configuration device-managed, and takes precedence over a served one. Because the key is grouped with the other app-behavior keys, a profile that sets any of them claims the whole group, and every key in it is then read from that profile alone: deploy this key in the same profile as the update keys (`disableAutoUpdates`, `autoUpdaterEnforcementHours`, \u2026). A profile that sets the update keys without it ignores a served interval and the default applies; a profile that sets only this key ignores served update settings, so a served `disableAutoUpdates` no longer holds on those devices. A profile that also manages the connection itself (sets `bootstrapUrl` or the provider keys) follows the normal tier order instead: once a served configuration is in hand it, not the profile, supplies this key.",
        ),
      },
    }),
    disableLocalConfigCache: tr.field(cs.z.boolean().optional(), {
      flatKey: "disableLocalConfigCache",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.7032.0",
        },
      },
      failClosedValue: true,
      remotePolicy: {
        applyUnverified: false,
        hotApplied: true,
        hybrid: {
          scope: "only",
        },
      },
      title: $r.msg({
        defaultMessage: "Keep only your organization ID and restrictions on disk",
        id: "DisableLocalConfigCacheTitle",
      }),
      default: false,
      category: "telemetry",
      group: Rc.UPDATES_GROUP,
      order: 25,
      description: {
        short: tr.shortDescription(
          $r.msg({
            defaultMessage:
              "Don\u2019t keep your organization\u2019s name or any permissive setting on disk between launches; only your organization ID and the restrictions you turn on are kept.",
            id: "DisableLocalConfigCacheShort",
          }),
        ),
        long: tr.longDescription(
          `By default the app keeps on disk, from the last configuration the admin console served, your organization\u2019s ID and name and the few settings a launch applies before the console answers (the telemetry switches, the Microsoft 365 sign-in broker setting, and any restriction you have turned on). When this is on, it keeps only your organization ID and those restrictions (for example telemetry blocked, or local MCP servers off), never the name or anything you have allowed, and cuts an earlier copy down at the next launch that reaches the console, or at once when a running app confirms the change; signing out deletes the kept copy too. While on: crash and performance reports to Anthropic do not start on these devices, and the sign-in screen and account switcher cannot show your organization\u2019s name before the console answers.

` +
            "A running app picks up a change to this setting once two configuration checks in a row have served it; changing it alone never asks for a relaunch. It applies only to organizations managed from the Claude admin console; the setting is ignored when a customer configuration server or a device profile sends it.",
        ),
      },
    }),
  });
});
//@ chunk-1ny7cxrt.js:945366-971611 cjs-unmatched+string-clue
var ew = x(function (ij) {
  Object.defineProperty(ij, "__esModule", {
    value: true,
  });
  ij.ModelsConfig = ij.MODEL_CATALOG_LOCATION_UNREADABLE_STAND_IN = ij.InferenceModel = undefined;
  ij.isBelowMinDesktopVersion = mue;
  ij.modelDiscoveryUrlHint = Xv;
  ij.usageCostEstimateEnabled = Im;
  ij.effectiveModelPricing = _ue;
  ij.dropNonAnthropicModels = bue;
  ij.droppedModelMessage = vue;
  ij.nonAnthropicModelText = rj;
  var ut = require_v3();
  var Cm = __();
  var Dc = gr();
  var Q = yt();
  var et = $n();
  var ie = mn();
  var ga = Ir();
  var Am = Ar();
  var us = Hu();
  function Pm(name) {
    let match = name.match(/^(.+?)\[1m\]$/i);
    return match ? match[1].trim() : name;
  }
  function Jv(e) {
    return ut.z.preprocess((t) => (typeof t === "string" ? t.trim().toLowerCase() : t), ut.z.enum(e));
  }
  function mue(e, t) {
    return (
      t !== undefined &&
      et.DESKTOP_VERSION_RE.test(t) &&
      et.DESKTOP_VERSION_RE.test(e) &&
      Q.compareDesktopVersions(e, t) < 0
    );
  }
  ij.InferenceModel = ut.z.object({
    name: Q.subfield(ut.z.string().trim().min(1), {
      label: ie.msg({
        defaultMessage: "Model ID",
        id: "/m0q/Dre6A",
      }),
      isPrimaryKey: true,
      mono: true,
      placeholder: ie.msg({
        defaultMessage: "claude-opus-4",
        id: "s+j6yEtVLW",
      }),
      description: {
        short: Q.shortDescription(
          ie.msg({
            defaultMessage:
              "Model ID exactly as the provider expects it. The first entry is the default model.",
            id: "1tZVf88rjp",
          }),
        ),
      },
    }),
    labelOverride: Q.subfield(
      ut.z
        .string()
        .trim()
        .transform((e) => e || undefined)
        .optional(),
      {
        label: ie.msg({
          defaultMessage: "Display name",
          id: "dOQCL8n7dZ",
        }),
        placeholder: ie.msg({
          defaultMessage: "Claude Opus 4",
          id: "c1LGvG2F3D",
        }),
        description: {
          short: Q.shortDescription(
            ie.msg({
              defaultMessage: "Shown in the model picker. Leave blank to auto-format from the ID.",
              id: "y8c8KzJEws",
            }),
            {
              docsOnly: false,
            },
          ),
        },
      },
    ),
    supports1m: Q.subfield(ut.z.boolean().optional().catch(undefined), {
      label: ie.msg({
        defaultMessage: "Offer 1M-context variant",
        id: "a87VTwtQw3",
      }),
      description: {
        short: Q.shortDescription(
          ie.msg({
            defaultMessage:
              "Adds a 1M-context variant of this model to the picker. Set only if the deployment accepts 1M-token context for it.",
            id: "Dr5ZeQOODs",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    prefer1m: Q.subfield(ut.z.boolean().optional().catch(undefined), {
      label: ie.msg({
        defaultMessage: "Only show the 1M option",
        id: "MiULGAn5+H",
      }),
      support: {
        availableInVersion: "1.21459.0",
      },
      description: {
        short: Q.shortDescription(
          ie.msg({
            defaultMessage:
              "Shows one option for this model and requests 1M from your provider. Does nothing unless the entry offers 1M.",
            id: "Sv+taooA73",
          }),
          {
            docsOnly: false,
          },
        ),
      },
      predicates: {
        show: (e) => Boolean(e.supports1m),
      },
    }),
    anthropicFamilyTier: Q.subfield(Jv(us.ANTHROPIC_TIER_NAMES).optional().catch(undefined), {
      label: ie.msg({
        defaultMessage: "Tier alias",
        id: "y8qYHNqpeo",
      }),
      support: {
        availableInVersion: "1.13576.0",
      },
      description: {
        short: Q.shortDescription(
          ie.msg({
            defaultMessage:
              "Which Claude tier this model stands in for. Pins the bare alias (e.g. \u2018opus\u2019) and, for opus/fable, the refusal fallback.",
            id: "AJudB3RUvn",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    isFamilyDefault: Q.subfield(ut.z.boolean().optional().catch(undefined), {
      label: ie.msg({
        defaultMessage: "Default for tier",
        id: "0yJnYjaXIK",
      }),
      support: {
        availableInVersion: "1.13576.0",
      },
      description: {
        short: Q.shortDescription(
          ie.msg({
            defaultMessage:
              "When several models share a tier alias, marks this one as the model the alias resolves to. Otherwise the first listed wins.",
            id: "trBeCWLw48",
          }),
        ),
      },
      predicates: {
        show: (e) => Boolean(e.anthropicFamilyTier),
      },
    }),
    maxEffort: Q.subfield(Jv(us.EFFORT_LEVELS).optional().catch("low"), {
      label: ie.msg({
        defaultMessage: "Max effort",
        id: "6cacFh6uvE",
      }),
      support: {
        availableInVersion: "2.110.0",
      },
      description: {
        short: Q.shortDescription(
          ie.msg({
            defaultMessage:
              "Highest effort level offered for this model; higher levels are hidden and never requested by Claude Desktop. An unrecognized value caps the model at low.",
            id: "NsfxwZEink",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    minDesktopVersion: Q.subfield(et.desktopVersionString().optional().catch(undefined), {
      label: ie.msg({
        defaultMessage: "Minimum app version",
        id: "UGoWM49v6Y",
      }),
      support: {
        availableInVersion: "2.19675.0",
        visibility: "public-undocumented",
      },
      predicates: {
        show: (e) => e.minDesktopVersion !== undefined,
      },
      description: {
        short: Q.shortDescription(
          ie.msg({
            defaultMessage:
              "Oldest Claude Desktop version that can use this model, as three numbers like 2.2553.0. Older apps that read this setting grey the model out and ask to update.",
            id: "xkocyM6Lej",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
  });
  function gue(e) {
    var t;
    let mapped = e.map((l) =>
      typeof l === "string"
        ? {
            name: l,
          }
        : l,
    );
    let o = new Map();
    for (let l of mapped) if (Pm(l.name) === l.name && !o.has(l.name)) o.set(l.name, l);
    let r = (l) => l.anthropicFamilyTier !== undefined || l.isFamilyDefault === true;
    let s = new Map();
    for (let l of mapped) {
      let c = Pm(l.name);
      let u = c === l.name ? undefined : o.get(c);
      if (u && !r(u) && !r(l)) {
        let f =
          (t = s.get(u)) !== null && t !== undefined
            ? t
            : {
                plain: u,
                spellings: [],
              };
        f.spellings.push(l);
        s.set(u, f).set(l, f);
      }
    }
    let a = new Set();
    return mapped.flatMap((l) => {
      let c = s.get(l);
      if (!c) {
        let m = Pm(l.name);
        return [
          m === l.name
            ? l
            : {
                ...l,
                name: m,
                supports1m: true,
              },
        ];
      }
      if (a.has(c)) return [];
      a.add(c);
      let u = c.plain.prefer1m === undefined && c.spellings.some((spelling) => spelling.prefer1m === true);
      let f = [c.plain, ...c.spellings]
        .map((m) => m.maxEffort)
        .filter((m) => m !== undefined)
        .sort((m, y) => us.EFFORT_LEVELS.indexOf(m) - us.EFFORT_LEVELS.indexOf(y))[0];
      let last = [c.plain, ...c.spellings]
        .map((m) => m.minDesktopVersion)
        .filter((m) => m !== undefined)
        .sort(Q.compareDesktopVersions)
        .at(-1);
      return [
        {
          ...c.plain,
          supports1m: true,
          ...(u && {
            prefer1m: u,
          }),
          ...(f && {
            maxEffort: f,
          }),
          ...(last && {
            minDesktopVersion: last,
          }),
        },
      ];
    });
  }
  var yue = (e) => {
    var t;
    return (
      ((t = e.inference) === null || t === undefined ? undefined : t.provider) !== undefined &&
      !ga.PROVIDER_CLI_FLAG[e.inference.provider]
    );
  };
  function Xv(e, t) {
    let inference = t.inference;
    switch (inference === null || inference === undefined ? undefined : inference.provider) {
      case "anthropic":
        return `https://${Dc.ANTHROPIC_API_HOST}/v1/models`;
      case "gateway":
        return inference.baseUrl ? `${inference.baseUrl.replace(/\/+$/, "")}/v1/models` : "/v1/models";
      case "bedrock":
        return inference.region
          ? Dc.bedrockControlPlaneHost(inference.region)
          : e.formatMessage({
              defaultMessage: "the Bedrock control-plane",
              id: "+aUKGm2IHp",
            });
      default:
        return e.formatMessage({
          defaultMessage: "the provider",
          id: "QL5gWJ5JBl",
        });
    }
  }
  var Em = () => ut.z.number().min(0).max(1e4);
  ij.MODEL_CATALOG_LOCATION_UNREADABLE_STAND_IN = "https://model-catalog.invalid/unreadable";
  ij.ModelsConfig = ut.z.object({
    discoveryEnabled: Q.field(ut.z.boolean().optional(), {
      flatKey: "modelDiscoveryEnabled",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.8089.0",
        },
        executionTarget: "desktop",
      },
      default: {
        displayOnly: true,
      },
      title: ie.msg({
        defaultMessage: "Model discovery",
        id: "jU4z+3Uk7+",
      }),
      category: "connection",
      group: et.MODELS_GROUP,
      order: -1,
      predicates: {
        show: (e) => ga.providerHasDiscovery(e),
      },
      description: {
        short: Q.shortDescription((e, t) =>
          yue(t)
            ? e.formatMessage(
                {
                  defaultMessage:
                    "Auto-populate the model picker from {url} at launch; when this key isn\u2019t set in the config, discovery is skipped if the model list below makes it unnecessary.",
                  id: "b/YbjgdGIX",
                },
                {
                  url: Xv(e, t),
                },
              )
            : e.formatMessage(
                {
                  defaultMessage: "Auto-populate the model picker from {url} at launch.",
                  id: "xWiIy0pAlB",
                },
                {
                  url: Xv(e, t),
                },
              ),
        ),
        long: Q.longDescription(
          "Auto-populate the model picker from the provider's model-list endpoint at launch. For gateway and Anthropic providers, a config that doesn't set this key skips discovery automatically when the model list below already makes it unnecessary; the toggle here only sets it explicitly on or off. Turn off if the endpoint isn't reachable from your network, or to use a fixed list. When off, the model list below is required and must use full model IDs (aliases like sonnet/opus are resolved via discovery).",
          {
            docsUrl: `${et.COWORK_3P_DOCS_BASE}/configuration#models`,
          },
        ),
      },
    }),
    prefer1mContext: Q.field(ut.z.boolean().optional(), {
      flatKey: "modelPrefer1mContext",
      readers: ["desktop", "code"],
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.28929.0",
        },
      },
      default: {
        displayOnly: false,
      },
      title: ie.msg({
        defaultMessage: "Use 1M wherever it\u2019s available",
        id: "FhHsMUG/nO",
      }),
      category: "connection",
      group: et.MODELS_GROUP,
      order: -0.5,
      description: {
        short: Q.shortDescription(
          ie.msg({
            defaultMessage:
              "Every model that offers 1M, in your list or from your gateway, shows one option and requests 1M.",
            id: "XbCo6omBCD",
          }),
        ),
        long: Q.longDescription(
          "Every model that offers a 1M-token context window shows one option in the model picker, and sessions on it request 1M from your provider. A model offers 1M when its `inferenceModels` entry sets `supports1m` or, under discovery, when your gateway's model list marks it. Equivalent to setting `prefer1m` on each of those entries, but also applies under dynamic discovery. To leave one listed model out, remove its `supports1m`. Beside a model list in which no entry sets `supports1m`, this setting does nothing. Older Claude Desktop versions show both options and only start the default model on its 1M option.",
          {
            docsUrl: `${et.COWORK_3P_DOCS_BASE}/configuration#models`,
          },
        ),
      },
    }),
    list: Q.field(
      Q.annotate(
        Q.annotate(ut.z.array(ut.z.union([ut.z.string().trim().min(1), ij.InferenceModel])).min(1), {
          maxItems: 200,
        })
          .transform(gue)
          .optional(),
        {
          redact: "hash",
          gatewayServable: false,
        },
      ),
      {
        flatKey: "inferenceModels",
        readers: ["desktop", "m365", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.2581.0",
          },
        },
        title: ie.msg({
          defaultMessage: "Model list",
          id: "hv0F38ESRM",
        }),
        groupOverride: "nameSubset",
        category: "connection",
        group: et.MODELS_GROUP,
        order: 0,
        addLabel: ie.msg({
          defaultMessage: "Add model",
          id: "zUO6Ii5EAT",
        }),
        description: {
          short: Q.shortDescription((e, t) => {
            var n;
            return ((n = t.models) === null || n === undefined ? undefined : n.discoveryEnabled) === false ||
              !ga.providerHasDiscovery(t)
              ? e.formatMessage({
                  defaultMessage: "Models to show in the picker. First entry is the default.",
                  id: "i8fSuvZDK/",
                })
              : e.formatMessage({
                  defaultMessage: "Override the auto-discovered model list. First entry is the default.",
                  id: "G/QQvx0Tsd",
                });
          }),
          long: Q.longDescription(
            'Use the **provider\'s exact model ID**: Vertex publisher IDs (`claude-sonnet-5`), Bedrock inference-profile IDs (`us.anthropic.claude-sonnet-5`), or Foundry deployment names. Entries may be plain ID strings or objects.\n\n**Gateway:** the `name` must be the exact ID your gateway\'s `/v1/models` endpoint returns. If you set `supports1m` on an alias (`sonnet`) but discovery returns the full ID, the variant won\'t appear.\n\n**Extended context** (`supports1m`) is a capability assertion you make about your deployment; only set it for models you\'ve confirmed support the 1M-token window:\n```json\n[{"name": "claude-sonnet-5", "supports1m": true}, "claude-opus-4-8"]\n```\n`"claude-sonnet-5[1m]"` is shorthand for the same entry. When an ID is listed both bare and with `[1m]` (as a gateway lists it), the picker shows one model with a 1M variant; put `labelOverride` on the bare entry (a label on the `[1m]` spelling is ignored there); tier-tagged entries are not folded. `prefer1m: true` (no effect without `supports1m`) shows only the 1M variant of the model. Under dynamic discovery (no explicit list), set `modelPrefer1mContext` instead.\n\n**Display label** (`labelOverride`) is for IDs the picker can\'t derive a friendly name from (Bedrock ARNs, gateway routing aliases). Display-only; `name` is still what the app sends:\n```json\n[{"name": "arn:aws:bedrock:us-east-1:123:application-inference-profile/abc", "labelOverride": "Claude Opus (Prod)"}]\n```\n\n**Tier mapping** (`anthropicFamilyTier`) tells the app which Claude tier (`haiku`/`sonnet`/`opus`/`fable`/`mythos`) an entry stands in for, so bare tier aliases (e.g. in Code sessions) resolve to your model. `isFamilyDefault: true` picks the winner when several entries share a tier:\n```json\n[{"name": "us.anthropic.claude-opus-4-8", "anthropicFamilyTier": "opus"}]\n```',
            {
              docsUrl: `${et.COWORK_3P_DOCS_BASE}/configuration#models`,
            },
          ),
        },
        predicates: {
          required: (e) => {
            var t;
            return (
              !et.hasActiveBootstrap(e) &&
              (((t = e.models) === null || t === undefined ? undefined : t.discoveryEnabled) === false ||
                !ga.providerHasDiscovery(e))
            );
          },
          warn: (e, t, n) => wue(e.name, t, n),
        },
      },
    ),
    defaultEffort: Q.field(Jv(us.EFFORT_LEVELS).optional(), {
      flatKey: "defaultModelEffort",
      readers: ["desktop", "code"],
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.110.0",
        },
      },
      title: ie.msg({
        defaultMessage: "Default model effort",
        id: "63NOuwomJM",
      }),
      category: "connection",
      group: et.MODELS_GROUP,
      order: 0.2,
      description: {
        short: Q.shortDescription(
          ie.msg({
            defaultMessage:
              "Effort level the default model (the first listed model) starts at, instead of Anthropic\u2019s recommended level: low, medium, high, xhigh or max.",
            id: "SBjuzIVQAJ",
          }),
        ),
        long: Q.longDescription(
          "The effort level the default model (the first `inferenceModels` entry, or the first model your endpoint returns under discovery) starts at in Chat, Cowork and Code, in place of Anthropic's recommended level for that model: one of `low`, `medium`, `high`, `xhigh`, `max`. It is a starting point, not a lock: a person's own effort choice for that model still applies unless `alwaysStartWithDefaultModel` is on, and other models keep their recommended level. A level the model doesn't offer falls to the nearest level it offers below it (its lowest level when none is lower), and it never exceeds that model's `maxEffort`. In Code sessions a `CLAUDE_CODE_EFFORT_LEVEL` environment variable or an `effortLevel` in Claude Code's own settings still takes precedence, as it does over any picker default.",
          {
            docsUrl: `${et.COWORK_3P_DOCS_BASE}/configuration#models`,
          },
        ),
      },
    }),
    alwaysStartWithDefault: Q.field(ut.z.boolean().optional(), {
      flatKey: "alwaysStartWithDefaultModel",
      readers: ["desktop", "code"],
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.110.0",
        },
      },
      default: {
        displayOnly: false,
      },
      failClosedValue: true,
      title: ie.msg({
        defaultMessage: "Always start with the default model",
        id: "IJXGYyxFSQ",
      }),
      category: "connection",
      group: et.MODELS_GROUP,
      order: 0.3,
      description: {
        short: Q.shortDescription(
          ie.msg({
            defaultMessage:
              "When true, each new conversation or task starts on the default model, and a person\u2019s model and effort changes are no longer saved as their default.",
            id: "dayANLBel0",
          }),
        ),
        long: Q.longDescription(
          "When `true`, each new conversation or task in Chat, Cowork and Code starts on the default model (the first `inferenceModels` entry), and the model and effort choices a person makes are no longer saved as their defaults. When unset or `false`, a person's last model and effort choice is remembered per tab, as before. Choices saved before the setting was turned on are kept and apply again if it is turned off.",
          {
            docsUrl: `${et.COWORK_3P_DOCS_BASE}/configuration#models`,
          },
        ),
      },
    }),
    pricing: ut.z
      .object({
        enabled: Q.field(ut.z.boolean().optional(), {
          flatKey: "inferenceModelPricingEnabled",
          readers: ["desktop", "code"],
          support: {
            enabled: {
              scopes: ["3p"],
              availableInVersion: "1.37937.0",
            },
            executionTarget: "desktop",
          },
          default: {
            displayOnly: false,
          },
          title: ie.msg({
            defaultMessage: "Show estimated cost",
            id: "dqCubkxbYK",
          }),
          category: "connection",
          group: et.MODELS_GROUP,
          order: 1,
          description: {
            short: Q.shortDescription(
              ie.msg({
                defaultMessage:
                  "Show an estimated cost on the Usage page at Anthropic list price; turn on to set a multiplier or per-model rates.",
                id: "O20EMso86S",
              }),
            ),
            long: Q.longDescription(
              "Off unless set: the Usage page shows token counts only, since the app cannot know your negotiated provider rates. `true` turns on a USD estimate priced at Anthropic's published list price and is the only switch that does: `inferenceModelPricingMultiplier` and `inferenceModelPricing` refine the estimate while this is on and are ignored otherwise; turning this off hides them in the config editors without clearing them. Claude Code performs the calculation, so the same figures appear in its own cost reporting for Code sessions. Model IDs Claude Code cannot map to a Claude model (an opaque gateway alias, an inference-profile ARN it cannot resolve) are left out of the estimate until `inferenceModelPricing` gives them a rate. A machine-level Claude Code managed `modelPricing` (MDM / managed-settings.json / server-managed) takes precedence over all three keys.",
              {
                docsUrl: `${et.COWORK_3P_DOCS_BASE}/configuration#models`,
              },
            ),
          },
        }),
        multiplier: Q.field(
          Q.annotate(ut.z.coerce.number().gt(0).lte(1).optional(), {
            redact: "presence",
          }),
          {
            flatKey: "inferenceModelPricingMultiplier",
            readers: ["desktop", "code"],
            support: {
              enabled: {
                scopes: ["3p"],
                availableInVersion: "1.37937.0",
              },
              executionTarget: "desktop",
            },
            title: ie.msg({
              defaultMessage: "Price multiplier",
              id: "BvuzkKM8Bk",
            }),
            category: "connection",
            group: et.MODELS_GROUP,
            order: 1.1,
            predicates: {
              show: Im,
            },
            placeholder: ie.msg({
              defaultMessage: "0.85",
              id: "SyOzaH65Yu",
            }),
            description: {
              short: Q.shortDescription(
                ie.msg({
                  defaultMessage: "Scales every estimated cost (0.85 = 85% of the price); between 0 and 1.",
                  id: "g06VJdp+L7",
                }),
              ),
              long: Q.longDescription(
                "Mirrors Claude Code's managed `modelPricing.multiplier`: a number in (0, 1] applied to every computed cost, whether the model was priced at Anthropic list price or by an `inferenceModelPricing` row; use it for a flat contracted discount. Applies only while `inferenceModelPricingEnabled` is `true`; on its own it does not turn the estimate on. Ignored when a machine-level Claude Code managed `modelPricing` is present.",
                {
                  docsUrl: `${et.COWORK_3P_DOCS_BASE}/configuration#models`,
                },
              ),
            },
          },
        ),
        models: Q.field(
          Q.annotate(
            ut.z
              .array(
                ut.z.object({
                  name: Q.subfield(ut.z.string().trim().min(1), {
                    label: ie.msg({
                      defaultMessage: "Model ID",
                      id: "/m0q/Dre6A",
                    }),
                    isPrimaryKey: true,
                    mono: true,
                    placeholder: ie.msg({
                      defaultMessage: "claude-opus-4",
                      id: "s+j6yEtVLW",
                    }),
                    description: {
                      short: Q.shortDescription(
                        ie.msg({
                          defaultMessage:
                            "A model ID from the list above, or any other ID or alias your provider serves. A built-in Claude ID also covers its dated and provider forms.",
                          id: "usJ91EFnHr",
                        }),
                        {
                          docsOnly: false,
                        },
                      ),
                    },
                  }),
                  inputPerMtok: Q.subfield(Em(), {
                    label: ie.msg({
                      defaultMessage: "Input",
                      id: "it6Ligcq3B",
                    }),
                    description: {
                      short: Q.shortDescription(
                        ie.msg({
                          defaultMessage: "USD per million input tokens.",
                          id: "nQMe9gkLHr",
                        }),
                      ),
                    },
                  }),
                  outputPerMtok: Q.subfield(Em(), {
                    label: ie.msg({
                      defaultMessage: "Output",
                      id: "fio5opLcOZ",
                    }),
                    description: {
                      short: Q.shortDescription(
                        ie.msg({
                          defaultMessage: "USD per million output tokens.",
                          id: "NPC4I65XQU",
                        }),
                      ),
                    },
                  }),
                  cacheReadPerMtok: Q.subfield(Em(), {
                    label: ie.msg({
                      defaultMessage: "Cache read",
                      id: "M4uIq3kw9y",
                    }),
                    description: {
                      short: Q.shortDescription(
                        ie.msg({
                          defaultMessage: "USD per million prompt-cache read tokens.",
                          id: "T5SCPPfeMB",
                        }),
                      ),
                    },
                  }),
                  cacheWritePerMtok: Q.subfield(Em(), {
                    label: ie.msg({
                      defaultMessage: "Cache write",
                      id: "tV/UHxu+ec",
                    }),
                    description: {
                      short: Q.shortDescription(
                        ie.msg({
                          defaultMessage:
                            "USD per million prompt-cache write tokens (5-minute and 1-hour writes alike).",
                          id: "295mSyLyL7",
                        }),
                      ),
                    },
                  }),
                }),
              )
              .optional(),
            {
              redact: "presence",
            },
          ),
          {
            flatKey: "inferenceModelPricing",
            readers: ["desktop", "code"],
            support: {
              enabled: {
                scopes: ["3p"],
                availableInVersion: "1.37937.0",
              },
              executionTarget: "desktop",
            },
            title: ie.msg({
              defaultMessage: "Model pricing",
              id: "Em5X7PlTGI",
            }),
            category: "connection",
            group: et.MODELS_GROUP,
            order: 1.2,
            predicates: {
              show: Im,
            },
            addLabel: ie.msg({
              defaultMessage: "Add price",
              id: "Gk+NyPXeVe",
            }),
            description: {
              short: Q.shortDescription(
                ie.msg({
                  defaultMessage:
                    "Per-model rates replacing Anthropic list price in the Usage page\u2019s estimate.",
                  id: "5Ho1RhYUiz",
                }),
              ),
              long: Q.longDescription(
                'Each row replaces Anthropic list price for one model in the Usage page\'s estimate, in USD per million tokens (`inputPerMtok`, `outputPerMtok`, `cacheReadPerMtok`, `cacheWritePerMtok`, all four required; `cacheWritePerMtok` prices both 5-minute and 1-hour cache writes); rows apply only while `inferenceModelPricingEnabled` is `true` and do not turn the estimate on by themselves. Mirrors Claude Code\'s managed `modelPricing.overrides`, and `name` is matched the same way: a built-in Claude model ID (e.g. `claude-sonnet-4-6`, or its Bedrock, Vertex, or Foundry ID) covers every dated and provider spelling of that model; any other value (a gateway alias, an inference-profile ARN) matches that exact ID only (case-insensitive) and wins over a built-in row. An ID Claude Code cannot map to a Claude model at all gets no estimate until a row here prices it. `inferenceModelPricingMultiplier` still applies on top of a row.\n```json\n{"inferenceModelPricingEnabled": true, "inferenceModelPricingMultiplier": 0.9, "inferenceModelPricing": [{"name": "claude-sonnet-4-6", "inputPerMtok": 2.4, "outputPerMtok": 12, "cacheReadPerMtok": 0.24, "cacheWritePerMtok": 3}]}\n```\nThese are estimates for visibility, not an invoice; your provider bills at its own rates. A machine-level Claude Code managed `modelPricing` (MDM / managed-settings.json / server-managed) takes precedence over this table.',
                {
                  docsUrl: `${et.COWORK_3P_DOCS_BASE}/configuration#models`,
                },
              ),
            },
          },
        ),
      })
      .optional(),
    catalogEnabled: Q.field(ut.z.boolean().optional(), {
      flatKey: "modelCatalogEnabled",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.110.0",
        },
      },
      remotePolicy: {
        hybrid: {
          scope: "excluded",
        },
      },
      default: {
        displayOnly: true,
      },
      failClosedValue: false,
      title: ie.msg({
        defaultMessage: "Model catalog metadata",
        id: "go+bdjd1f9",
      }),
      category: "connection",
      group: et.MODELS_GROUP,
      order: 2,
      description: {
        short: Q.shortDescription(
          ie.msg({
            defaultMessage:
              "Label and describe the model picker\u2019s entries from the published Claude Code model catalog, instead of the app\u2019s built-in table.",
            id: "sikjjWW3Tp",
          }),
        ),
        long: Q.longDescription(
          "When on (the default), the app reads the model catalog Anthropic publishes for Claude Code (a signed document fetched from `downloads.claude.ai`, or from `modelCatalogUrl` when that is set, and verified against a key built into the app; a copy bundled with the app is used until one has been fetched, or when the host is unreachable) and uses it to fill in each picker entry's display name, description, and thinking/effort options in the Chat, Cowork, and Code tabs. It never changes which models are offered, their order, or the default model (the first `inferenceModels` entry): those, 1M-context variants, and `labelOverride` still come from `inferenceModels` / discovery, and a model the catalog does not list keeps the built-in label. Set `modelCatalogEnabled: false` to keep the built-in labels and make no catalog fetch. Applies to deployments configured on the device or by a bootstrap server; an install managed from the Claude admin console takes its model names and options from the console's settings and never fetches the catalog.",
          {
            docsUrl: `${et.COWORK_3P_DOCS_BASE}/configuration#models`,
          },
        ),
      },
    }),
    catalogUrl: Q.field(
      Q.annotate(Am.httpsUrl.optional(), {
        redact: "hostname",
      }),
      {
        flatKey: "modelCatalogUrl",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "2.110.0",
          },
        },
        remotePolicy: {
          hybrid: {
            scope: "excluded",
          },
          rejectLoopback: true,
          applyUnverified: true,
          hotApplied: true,
        },
        failClosedValue: ij.MODEL_CATALOG_LOCATION_UNREADABLE_STAND_IN,
        unreadableStandIn: true,
        title: ie.msg({
          defaultMessage: "Model catalog URL",
          id: "7QWnJvdV6y",
        }),
        egressRequirements: (e, t) => {
          var n;
          if (
            ((n = t.models) === null || n === undefined ? undefined : n.catalogEnabled) === false ||
            e === ij.MODEL_CATALOG_LOCATION_UNREADABLE_STAND_IN
          )
            return [];
          let o = Dc.safeHostname(e);
          return o && !Am.isLinkLocalOrMetadataHost(o) ? et.singleHostEgress(e) : [];
        },
        egressRequirementsLabel: ie.msg({
          defaultMessage: "Model catalog mirror",
          id: "a9epb+yGXN",
        }),
        category: "connection",
        group: et.MODELS_GROUP,
        order: 2.1,
        placeholder: ie.msg({
          defaultMessage: "https://mirror.example.com/model-catalog/v1/catalog.json",
          id: "o9MdHULcKp",
        }),
        predicates: {
          show: (e) => {
            var t;
            return ((t = e.models) === null || t === undefined ? undefined : t.catalogEnabled) !== false;
          },
        },
        description: {
          short: Q.shortDescription(
            ie.msg({
              defaultMessage:
                "Fetch the model catalog and its signature file from this URL (a mirror inside your network serving Anthropic\u2019s published files) instead of downloads.claude.ai.",
              id: "sFZOQNiiWa",
            }),
          ),
          long: Q.longDescription(
            "When set, the app fetches the catalog document and its signature file (the same URL with `.raw-sig.json` appended to the path) from this URL instead of `https://downloads.claude.ai/model-catalog/v1/catalog.json`, for a gateway or mirror inside your network serving Anthropic's two published files byte-for-byte. The document is still verified against the key built into the app, so an edited or re-signed copy is refused and the app keeps its last verified copy (or the bundled one); there is no key to configure. `https://` is required (`http://` only to a loopback address, and only when set on the device itself; a bootstrap server may not deliver a loopback or non-`https://` value); the server must answer the GET directly (redirects are not followed) and may honor `If-None-Match` with `304`, and must serve a document at least as new as the one the install last accepted (or the bundled seed) \u2014 an older one is refused and re-fetched on the retry interval until the mirror catches up. Ignored when `modelCatalogEnabled` is `false`, and on an install managed from the Claude admin console (which never fetches the catalog). A value that is not a valid URL, names a link-local or cloud-metadata host (e.g. `169.254.169.254`, `metadata.google.internal`), or is a loopback / non-`https://` value a bootstrap server delivers, turns the catalog fetch off (no fallback to `downloads.claude.ai`); the last fetched or bundled copy keeps labelling the pickers. On an install configured for a bootstrap server, the default location is not fetched until the server's configuration applies after sign-in, so a device does not poll `downloads.claude.ai` while the server may yet name a mirror; a mirror URL set on the device, cached earlier, or served in a pre-sign-in subset still fetches. Diagnostics report the location only as `hosted`, `custom`, `invalid` or `pending`; the value itself is treated like `bootstrapUrl`: host name only in telemetry, printed in full in the diagnostics bundle.",
            {
              docsUrl: `${et.COWORK_3P_DOCS_BASE}/configuration#models`,
            },
          ),
        },
      },
    ),
  });
  function Im(e) {
    var t;
    var n;
    return (
      ((n = (t = e.models) === null || t === undefined ? undefined : t.pricing) === null || n === undefined
        ? undefined
        : n.enabled) === true
    );
  }
  function _ue(e) {
    var t;
    let pricing = (t = e.models) === null || t === undefined ? undefined : t.pricing;
    if (!pricing || !Im(e)) return;
    let { enabled, ...r } = pricing;
    return r;
  }
  function bue(e, t, n) {
    let { inferenceProvider, inferenceModels } = e;
    if (!inferenceProvider || !Array.isArray(inferenceModels)) return e;
    let filtered = inferenceModels.filter((inferenceModel) => {
      let l = Cm.checkModel(inferenceProvider, inferenceModel.name);
      if (!l.ok) t(inferenceModel.name, l.reason);
      else if ("warn" in l && l.warn) {
        if (!(n === null || n === undefined)) n(l.warn);
      }
      return l.ok;
    });
    if (filtered.length !== inferenceModels.length && filtered.length > 0) e.inferenceModels = filtered;
    return e;
  }
  function vue(e, t) {
    return `inferenceModels: "${e}" is not an Anthropic model and was removed from the list \u2014 ${t}`;
  }
  function wue(name, t, n) {
    var o;
    let r = typeof name === "string" ? Pm(name.trim()) : "";
    if (!r || !((o = t.inference) === null || o === undefined ? undefined : o.provider)) return null;
    let s = Cm.checkModel(t.inference.provider, r);
    return s.ok ? null : rj(n, s.reason);
  }
  function rj(e, reason) {
    return e.formatMessage(
      {
        defaultMessage: "Doesn\u2019t look like an Anthropic model: {reason}",
        id: "3RoY+bkhPc",
      },
      {
        reason,
      },
    );
  }
});
//@ chunk-1ny7cxrt.js:971611-980429 cjs-unmatched+string-clue
var tw = x(function (aj) {
  Object.defineProperty(aj, "__esModule", {
    value: true,
  });
  aj.TelemetryConfig = undefined;
  var ki = require_v3();
  var Ft = yt();
  var Tm = $n();
  var sn = mn();
  var ds = zi();
  aj.TelemetryConfig = ki.z.object({
    orgUuid: Ft.field(
      Ft.annotate(ki.z.string().optional(), {
        redact: "keep",
      }),
      {
        flatKey: "deploymentOrganizationUuid",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.2581.0",
          },
        },
        remotePolicy: {
          hybrid: {
            derived: true,
          },
          applyUnverified: true,
        },
        title: sn.msg({
          defaultMessage: "Organization UUID",
          id: "EATQrlttOw",
        }),
        category: "telemetry",
        group: ds.ANTHROPIC_TELEMETRY_GROUP,
        order: -1,
        placeholder: sn.msg({
          defaultMessage: "00000000-0000-0000-0000-000000000000",
          id: "oT3AdLMVZK",
        }),
        description: {
          short: Ft.shortDescription(
            sn.msg({
              defaultMessage:
                "A UUID you generate. Tags telemetry so Anthropic support can locate your fleet\u2019s events, and namespaces each user\u2019s local data. Not used for auth.",
              id: "gvBRfDvKmN",
            }),
          ),
          long: Ft.longDescription(
            "If unset, the app uses the organization of your Anthropic sign-in, where the connection has one. Otherwise, telemetry is tagged with a value the app derives from your connection settings. Where it cannot derive one, telemetry is tagged with a placeholder UUID shared with other unconfigured deployments. In the last two cases, local data is stored under the placeholder. **Changing this value orphans data** stored under the previous value (sessions, skills, plugins).",
          ),
        },
      },
    ),
    disableEssential: Ft.field(ki.z.boolean().optional(), {
      flatKey: "disableEssentialTelemetry",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
      },
      remotePolicy: {
        default: true,
        applyUnverified: true,
      },
      failClosedValue: true,
      title: sn.msg({
        defaultMessage: "Block essential telemetry",
        id: "rdKIIOydC8",
      }),
      default: false,
      category: "telemetry",
      group: ds.ANTHROPIC_TELEMETRY_GROUP,
      order: 0,
      description: {
        short: Ft.shortDescription(
          sn.msg({
            defaultMessage: "Crash and performance reports to Anthropic.",
            id: "EGOuVJosgc",
          }),
        ),
        long: Ft.longDescription(
          `"Essential" means the signals Anthropic needs to keep your deployment working: **crash stacks**, **startup failure reasons**, **version/OS metadata**, and **crash dumps** (each an unfiltered copy of part of the app's memory). Reports carry a random install ID and an organization ID. The organization ID is the one you set, one the app takes from your Anthropic sign-in or derives from your connection settings, or a placeholder shared with other unconfigured deployments. Reports can also include a summary of your settings, the host names of addresses you configured, text you set for display (such as the display name, subtitle, and banner text and link), and a one-way digest of a session ID.

**What you lose when this is on:** when a Claude Desktop build hits a bug that only reproduces on your OS version or locale, Anthropic can't see it unless a user manually reports. Fixes ship slower.

**Why this is discouraged, not blocked:** some air-gapped environments require zero outbound telemetry as a matter of policy. The switch exists for them. If you don't have that constraint, leave it off.`,
          {
            docsUrl: `${Tm.COWORK_3P_DOCS_BASE}/telemetry#essential-telemetry`,
          },
        ),
      },
      predicates: {
        warn: (e) =>
          e === true
            ? sn.msg({
                defaultMessage:
                  "Crash and error reports are how we diagnose failures specific to your inference setup. Support turnaround will be slower without them.",
                id: "ek/rdG0G9V",
              })
            : null,
      },
    }),
    disableNonessential: Ft.field(ki.z.boolean().optional(), {
      flatKey: "disableNonessentialTelemetry",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
      },
      remotePolicy: {
        default: true,
        applyUnverified: true,
      },
      failClosedValue: true,
      title: sn.msg({
        defaultMessage: "Block nonessential telemetry",
        id: "oo4Av05fBn",
      }),
      default: false,
      category: "telemetry",
      group: ds.ANTHROPIC_TELEMETRY_GROUP,
      order: 1,
      description: {
        short: Ft.shortDescription(
          sn.msg({
            defaultMessage: "Product-usage analytics and diagnostic-report uploads. No message content.",
            id: "0X/lTj2Hvv",
          }),
        ),
        long: Ft.longDescription(
          `"Nonessential" covers two things: **product-usage analytics** (which features get used, navigation patterns; no prompts or completions) and the **Send** action in Help \u2192 Generate Diagnostic Report. Turning this on stops both.

Destinations are listed under Egress Requirements \u2192 Nonessential telemetry.`,
          {
            docsUrl: `${Tm.COWORK_3P_DOCS_BASE}/telemetry#non-essential-telemetry`,
          },
        ),
      },
      predicates: {
        warn: (e) =>
          e === true
            ? sn.msg({
                defaultMessage:
                  "Usage analytics help us prioritize improvements for third-party inference. Diagnostic-report uploads will also be blocked. No message content is included in either.",
                id: "XtXm3euW3d",
              })
            : null,
      },
    }),
    disableNonessentialServices: Ft.field(ki.z.boolean().optional(), {
      flatKey: "disableNonessentialServices",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
      },
      failClosedValue: true,
      title: sn.msg({
        defaultMessage: "Block nonessential services",
        id: "HA2UIzGsaT",
      }),
      default: false,
      category: "telemetry",
      group: ds.ANTHROPIC_TELEMETRY_GROUP,
      order: 2,
      description: {
        short: Ft.shortDescription(
          sn.msg({
            defaultMessage:
              "Connector favicons, artifact-preview and MCP Apps iframes, and the Linux spellcheck dictionary. Connector widgets fall back to text; spellcheck is off on Linux.",
            id: "iwXupWG0F3",
          }),
        ),
        long: Ft.longDescription(`"Nonessential services" covers these outbound fetches the app runs without: **connector favicons** (the icon proxy), the **artifact-preview** iframe origin, the **MCP Apps widget** iframe origin (\`*.claudemcpcontent.com\`), and the **spellcheck dictionary** the built-in spellchecker downloads on Linux. Turning this on blocks all of them. (macOS and Windows use the system spellchecker. Windows still downloads a dictionary for a language it cannot check natively; this key does not stop that download.)

**What you lose when this is on:** connectors show without icons, the hosted artifact preview frame does not load (artifacts still render locally, without the CDN chart libraries they can otherwise load), connectors that return MCP Apps show the text tool result instead of the widget, Excel files in the Code tab preview only through Claude\u2019s workspace (the local VM) instead of that frame, and spellcheck underlines are off on Linux.

Destinations are listed under Egress Requirements \u2192 Nonessential services.`),
      },
      predicates: {
        warn: (e) =>
          e === true
            ? sn.msg({
                defaultMessage:
                  "This disables connector icons, hosted artifact previews and MCP Apps widgets, and also turns spellcheck off on Linux. Artifacts still render locally, without CDN libraries; connectors that return MCP Apps show the text tool result instead of the widget.",
                id: "VinFqhloIq",
              })
            : null,
      },
    }),
    usageMetrics: Ft.field(ki.z.boolean().optional(), {
      flatKey: "usageMetricsEnabled",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.46388.1",
        },
        visibility: "public-undocumented",
      },
      remotePolicy: {
        hybrid: {
          scope: "only",
          derived: true,
        },
        hotApplied: true,
      },
      predicates: {
        show: () => false,
      },
      title: sn.msg({
        defaultMessage: "Report usage metrics to your Claude.ai organization",
        id: "hFaw5XYgDV",
      }),
      category: "telemetry",
      group: ds.ANTHROPIC_TELEMETRY_GROUP,
      order: 3,
      description: {
        short: Ft.shortDescription(
          sn.msg({
            defaultMessage:
              "Set by the control plane from the organization\u2019s Claude Code analytics setting; not editable here. Reports per-user token, cost and session counts (no content).",
            id: "6k4DCNJe7b",
          }),
        ),
        long: Ft.longDescription(`Server-derived: the Claude.ai control plane sets this key, each time it serves the configuration, from the organization's Claude Code analytics setting in Admin settings; it is off until an admin turns that setting on, and off for organizations under HIPAA or customer-managed encryption keys. It is not authored in any form, MDM profile, or bootstrap server, and a value stored anywhere else is ignored.

When on, each signed-in desktop periodically reports usage counters to your Claude.ai organization: per-member **token counts** (input, output, cache read, cache write) by model, the desktop's **cost estimate** for those tokens, and **session counts**, tagged with the member's account, the model name, the app surface (Chat, Cowork or Code), an opaque per-session and per-install identifier, and the app version, operating system and architecture. No prompts, responses, file contents, tool inputs or outputs are included. Sessions and the cost estimate appear in your organization's Claude.ai analytics (Analytics \u2192 Claude Code); the Admin API Claude Code usage report carries those plus per-member, per-model token counts.

This is independent of **Block essential telemetry** and **Block nonessential telemetry**: those govern diagnostics sent to Anthropic, this one populates your own organization's dashboard, and either can be on without the other. Reports go to the same Claude.ai endpoint the desktop fetches its configuration from, so no additional firewall entry is needed. A change takes effect without a relaunch once two configuration syncs in a row have served it.`),
      },
    }),
  });
});
//@ chunk-1ny7cxrt.js:980429-981556 cjs-unmatched+string-clue
var nw = x(function (uj) {
  Object.defineProperty(uj, "__esModule", {
    value: true,
  });
  uj.MANAGED_MCP_PRESETS = undefined;
  uj.isAnthropicM365ConnectorUrl = cj;
  uj.isAnthropicM365Connector = $ue;
  var Cue = "07c030f6-5743-41b7-ba00-0a6e85f37c17";
  var Tue = [".claude.com", ".fedstart.com"];
  function cj(e) {
    if (!e) return false;
    if (!Tue.some((t) => e.hostname.endsWith(t))) return false;
    return e.hostname.startsWith("microsoft365.mcp.") || e.pathname.includes("/m365/");
  }
  function $ue(e) {
    if (!(e === null || e === undefined ? undefined : e.url) || e.custom_oauth_client_id) return false;
    try {
      return cj(new URL(e.url));
    } catch (error) {
      return false;
    }
  }
  uj.MANAGED_MCP_PRESETS = [
    {
      label: "Microsoft 365",
      item: {
        name: "m365",
        url: "https://microsoft365.mcp.claude.com/mcp",
        transport: "http",
        oauth: {
          scope: `api://${Cue}/access_as_user offline_access`,
        },
      },
    },
    {
      label: "Box",
      item: {
        name: "box",
        url: "https://mcp.box.com",
        transport: "http",
        oauth: {
          authorizationServer: ["https://api.box.com"],
        },
      },
    },
    {
      label: "Microsoft 365",
      kind: "builtin",
      item: {
        name: "Microsoft 365",
        server: "microsoft365",
      },
    },
    {
      label: "Web search",
      kind: "builtin",
      item: {
        name: "Web search",
        server: "websearch",
        provider: "brave",
      },
    },
    {
      label: "GitHub",
      kind: "builtin",
      item: {
        name: "GitHub",
        server: "github",
      },
    },
  ];
});
//@ chunk-1ny7cxrt.js:981556-1004122 cjs-unmatched+string-clue
var rw = x(function (yj) {
  Object.defineProperty(yj, "__esModule", {
    value: true,
  });
  yj.McpConfig = undefined;
  yj.isMcpPersistentAlwaysAllowEnabled = jue;
  var wn = require_v3();
  var mj = Sc();
  var Mc = gr();
  var Ve = yt();
  var Rr = $n();
  var Ge = mn();
  var gj = nw();
  var nr = Ar();
  var rr = zi();
  function Mue(e, t) {
    var n;
    let o = typeof t.url === "string" ? t.url.trim() : "";
    let headers = t.headers && typeof t.headers === "object" ? t.headers : undefined;
    let s = [];
    let a;
    try {
      a = o ? new URL(o) : undefined;
    } catch (error) {}
    if ((a === null || a === undefined ? undefined : a.protocol) === "http:") {
      let hostname = a.hostname;
      if (hostname !== "localhost" && hostname !== "127.0.0.1")
        s.push(
          e.formatMessage({
            defaultMessage: "Endpoint is plain HTTP; auth credentials travel in cleartext.",
            id: "sqfi+II5M9",
          }),
        );
    }
    let l = mj.credentialHeadersWarn(headers, e, "headersHelper");
    if (l !== null) s.push(l);
    let c = headers
      ? (n = Object.entries(headers).find(([key]) => key.toLowerCase() === "authorization")) === null ||
        n === undefined
        ? undefined
        : n[1]
      : undefined;
    if (typeof c === "string" && /^Bearer\s+\S{12,}$/i.test(c))
      s.push(
        e.formatMessage({
          defaultMessage: "Shared bearer token: every org member authenticates as the same identity.",
          id: "y4dl3eyfcO",
        }),
      );
    return s.length > 0 ? s.join(" ") : null;
  }
  function fj(e) {
    let t = typeof e.serverUrl === "string" ? e.serverUrl.trim() : "";
    if (t === "" || t === "*" || t.startsWith("*://") || /^(?:https?|wss?):/i.test(t)) return null;
    return Ge.msg({
      defaultMessage:
        "Start the pattern with a scheme such as https://, or *:// for any scheme: Claude Code compares a pattern with the server\u2019s full address.",
      id: "itOI+H+YoF",
    });
  }
  function hj(e) {
    return wn.z.strictObject({
      serverUrl: Ve.subfield(wn.z.string().trim().min(1), {
        label: Ge.msg({
          defaultMessage: "Server URL pattern",
          id: "ruFvKwQ1V2",
        }),
        description: {
          short: Ve.shortDescription(e),
        },
      }),
    });
  }
  yj.McpConfig = wn.z.object({
    managedServers: Ve.field(
      Ve.annotate(nr.ManagedMcpServers.optional(), {
        redact: "presence",
      }),
      {
        flatKey: "managedMcpServers",
        readers: ["desktop", "m365", "code"],
        groupOverride: "nameSubset",
        groupItemOverride: ["toolPolicy"],
        support: {
          enabled: [
            {
              scopes: ["3p"],
              availableInVersion: "1.2581.0",
            },
            {
              scopes: ["1p"],
              availableInVersion: "1.24012.11",
            },
          ],
        },
        remotePolicy: {
          mcpUrlHygiene: true,
        },
        title: Ge.msg({
          defaultMessage: "Managed MCP servers",
          id: "DC+lIM7C8k",
        }),
        checkDropped: nr.checkManagedMcpServersForDrops,
        deprecations: nr.MANAGED_MCP_SERVERS_DEPRECATIONS,
        failClosedValue: nr.MANAGED_MCP_SERVERS_PARSE_FAILED,
        unreadableStandIn: true,
        egressRequirements: (e) =>
          Array.isArray(e)
            ? e
                .flatMap((t) => {
                  if (nr.isBuiltinMcpEntry(t)) return [...nr.hostsForBuiltinMcpEntry(t)];
                  if (t.transport === "stdio" || t.transport === nr.MCP_TRANSPORT_POLICY_ONLY) return [];
                  let n = [Mc.egressAddress(t.url)];
                  if (t.oauth && t.oauth.mode !== "dcr") {
                    let byoAsSelection = nr.resolveByoAsSelection(t.oauth);
                    if (byoAsSelection.via === "tenant") n.push("login.microsoftonline.com");
                    n.push(...nr.byoAsSelectionUrls(byoAsSelection).map(Mc.egressAddress));
                  }
                  return n;
                })
                .filter((t) => !!t)
            : [],
        category: "connectors",
        group: rr.MCP_SERVERS_GROUP,
        order: 0,
        addLabel: Ge.msg({
          defaultMessage: "Add server",
          id: "pOeEMxHCXp",
        }),
        customRenderer: "mcpProbe",
        description: {
          short: Ve.shortDescription(
            Ge.msg({
              defaultMessage:
                "Org-pushed MCP servers: remote (HTTP/SSE) or local (stdio command). May embed bearer tokens.",
              id: "wG2dpZSzTk",
            }),
          ),
          long: Ve.longDescription(
            'For OAuth-authenticated entries, the app builds the redirect URI as `http://<callbackHost>:<callbackPort>/callback`; register that exact value with the OAuth provider. Tokens refresh automatically during a session.\n\n`toolPolicy` locks the per-tool approval state, keyed by tool name: `"blocked"` removes the tool from the session and labels it admin-blocked, `"ask"` requires approval on every call (Allow once / Deny only; no persistent always-allow; a scheduled Cowork task waits at that prompt), `"allow"` pre-approves. Tools **not listed** follow the user\'s choice: the prompt offers a persistent Always allow, except for tools that can modify data, which show a session-scoped **Allow for this task** alongside **Allow for all tasks** with a malicious-instruction warning. In Code sessions, `blocked` and `ask` are forwarded as Claude Code permission rules; `allow` is not.\n\nKeys may contain `*` wildcards (`"read_*"` matches every tool whose name starts with `read_`; anchored, and `*` is the only wildcard). When several wildcard keys match, the strictest applies (blocked > ask > allow). An exact-name key wins over matching wildcards, with two exceptions in the stricter direction: in Code sessions a wildcard `ask`, or a wildcard `blocked` other than the bare `"*"`, beats a less strict exact key (so `"*": "blocked"` plus exact `"allow"` entries still works as deny-by-default there); and in chat approval prompts and always-allow persistence a wildcard `ask` keeps every matching tool behind a per-call prompt even when a more permissive exact key matches, while direct tool invocations such as artifact or widget calls follow the exact key.\n\nFor the bundled Microsoft 365 connector, the send tools (`outlook_send_mail`, `outlook_send_draft`, `outlook_forward_mail`, `outlook_create_event`, `outlook_update_event`, `teams_send_chat_message`, `teams_send_channel_message`, `teams_reply_channel_message`) cannot be loosened below `ask`; an `allow` setting resolves to `ask`.',
            {
              docsUrl: `${Rr.COWORK_3P_DOCS_BASE}/configuration#managedmcpservers`,
            },
          ),
        },
        presets: gj.MANAGED_MCP_PRESETS,
        blankItem: {
          transport: "http",
        },
        predicates: {
          warn: (e, t, n) => Mue(n, e),
        },
      },
    ),
    persistentAlwaysAllowEnabled: Ve.field(wn.z.boolean().optional(), {
      flatKey: "mcpPersistentAlwaysAllowEnabled",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.24012.9",
        },
      },
      title: Ge.msg({
        defaultMessage: "Allow persistent tool approvals",
        id: "OmQqCV/O12",
      }),
      default: true,
      failClosedValue: false,
      category: "connectors",
      group: rr.MCP_SERVERS_GROUP,
      order: 1,
      description: {
        short: Ve.shortDescription(
          Ge.msg({
            defaultMessage:
              "Offer the persistent \u201CAlways allow\u201D approval options for MCP tools. Disable to keep tool approvals per-call or session-scoped only.",
            id: "GXMHY2UvCF",
          }),
        ),
        long: Ve.longDescription(
          "When enabled (the default), approval prompts for tools without a `toolPolicy` entry offer a persistent grant \u2014 **Always allow**, or **Allow for all tasks** for tools that can modify data \u2014 the Tool permissions picker in Connector settings lets users pre-approve tools, and those grants persist across sessions with no expiry.\n\nWhen disabled, the persistent options are hidden from approval prompts and from the Connector settings picker, and previously stored persistent grants stop being honored. Scheduled-task runs also stop offering, recording and replaying the **Allow for all scheduled runs** approval, unless a scheduled-task approval lifetime of one day or more is set. Users can still approve each call. Outside scheduled-task runs they can also choose **Allow for this task**, except for read-only tools on servers they added themselves.\n\nA per-tool `toolPolicy` entry on `managedMcpServers` always takes precedence over this key: `blocked`, `ask`, and `allow` behave exactly as documented there whether this key is enabled or not.\n\nThis key governs the chat and Cowork surfaces. Code sessions use a separate permission path this key does not cover \u2014 govern Code tool approvals with per-tool `toolPolicy` entries, whose `blocked` and `ask` values are forwarded there.",
          {
            docsUrl: `${Rr.COWORK_3P_DOCS_BASE}/configuration#mcppersistentalwaysallowenabled`,
          },
        ),
      },
    }),
    scheduledTaskApprovalLifetimeDays: Ve.field(
      wn.z.preprocess(
        (e) => (typeof e === "string" && e.trim() !== "" ? Number(e) : e),
        wn.z.number().int().gte(0).lte(3650).optional(),
      ),
      {
        flatKey: "mcpScheduledTaskApprovalLifetimeDays",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "2.7032.0",
          },
        },
        title: Ge.msg({
          defaultMessage: "Scheduled-task tool approval lifetime",
          id: "yqgGAUV4YP",
        }),
        failClosedValue: 0,
        remotePolicy: {
          applyUnverified: "asFailClosed",
        },
        category: "connectors",
        group: rr.MCP_SERVERS_GROUP,
        order: 1.5,
        suffix: Ge.msg({
          defaultMessage: "days",
          id: "Bc20laBenW",
        }),
        placeholder: Ge.msg({
          defaultMessage: "30",
          id: "HMv/M+VWJ6",
        }),
        description: {
          short: Ve.shortDescription(
            Ge.msg({
              defaultMessage:
                "How many days a scheduled task may reuse a lasting MCP-tool approval before it asks again. 0 removes the lasting option.",
              id: "au5x3V9PvH",
            }),
          ),
          long: Ve.longDescription(
            "On a scheduled task, the approval prompt for an MCP tool can offer a lasting approval, so later runs use that tool without asking: **Allow for all scheduled runs** in Cowork, **Always allow** in the Code tab. This setting limits how long that approval lasts. With a limit, the button reads **Allow for N days**. Once an approval is older than that, the next run asks again, and approving again renews it. `0` removes the lasting option, and approvals already stored stop being reused. Leave it blank to change nothing. Choose a number comfortably longer than the gap between runs.\n\nThe limit covers MCP tools only, and a `toolPolicy` entry on `managedMcpServers` still takes precedence. If a configuration server delivers the setting, then after each launch scheduled tasks ask instead of reusing stored approvals (as at `0`) until the app has fetched the configuration again.\n\nCowork: if `mcpPersistentAlwaysAllowEnabled` is off, this setting brings the lasting option back for scheduled tasks only, with the time limit.\n\nCode tab: `mcpPersistentAlwaysAllowEnabled` has no effect. The limit covers only lasting approvals given after this setting took effect. An earlier one was usually saved as an allow rule in Claude Code's own settings: for a scheduled task, the project's `.claude/settings.local.json`, under `permissions.allow`. Any allow rule in Claude Code's settings, including one written by hand or by **Always allow** in an ordinary Code session in the same project, keeps allowing the tool without asking, even at `0`, until that entry is removed.",
            {
              docsUrl: `${Rr.COWORK_3P_DOCS_BASE}/configuration#mcpscheduledtaskapprovallifetimedays`,
            },
          ),
        },
      },
    ),
    claudeInChromeEnabled: Ve.field(wn.z.boolean().optional(), {
      flatKey: "claudeInChromeEnabled",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.34493.0",
        },
        executionTarget: "desktop",
        visibility: "public-undocumented",
      },
      remotePolicy: {
        hybrid: {
          scope: "only",
          derived: true,
        },
      },
      predicates: {
        show: () => false,
      },
      title: Ge.msg({
        defaultMessage: "Enable Claude in Chrome",
        id: "q3VdR8mZpL",
      }),
      category: "connectors",
      group: rr.MCP_SERVERS_GROUP,
      order: 3,
      description: {
        short: Ve.shortDescription(
          Ge.msg({
            defaultMessage:
              "Set by the control plane from the organization\u2019s Claude in Chrome admin setting; not editable here. Lets sessions drive the user\u2019s browser via the extension.",
            id: "Hn7tK2cWqs",
          }),
        ),
        long: Ve.longDescription(`Server-derived: the Claude.ai control plane sets this key, each time it serves the configuration, from the organization's Claude in Chrome setting (Admin settings \u2192 Claude in Chrome \u2014 the same switch, site allowlist/blocklist, and per-role access that govern the extension itself) and the signed-in member's role. It is not authored in any form, MDM profile, or bootstrap server, and a value stored anywhere else is ignored.

When on, Cowork and Code sessions can use the Claude in Chrome browser tools (navigate, read page, click, type, screenshot) in the user's Google Chrome or Microsoft Edge. Tool calls travel over the browser's local native-messaging connection between the app and the extension and are encrypted end to end between the two; page content is never relayed through Anthropic servers, and inference stays on the configured provider; the extension's hosted URL-safety check stays on, so the address of each page the agent acts on is checked against the Anthropic API. macOS and Windows only.

Before any tool call, Claude Desktop and the extension each obtain a short-lived signed identity statement from the Anthropic API and pair only when both belong to the same account in your organization, so those two small requests do go to Anthropic. Installed from the Chrome Web Store, the extension runs in third-party mode on its own for members of a hybrid organization \u2014 nothing runs that does not arrive over the verified pairing, and per-site permission prompts are delegated to Claude Desktop \u2014 so no separate Chrome policy is needed. Chrome managed policy stays optional for locked-down fleets: \`forceLoginOrgUUID\` may name the organization(s) allowed to take control of the extension wherever the policy reaches (a Claude Desktop from any other organization is refused), and \`blockedUrlPatterns\` may be added and applies on top of the hosted URL-safety check. Requires \`isLocalDevMcpEnabled\` to remain enabled. Off unless the organization's Claude in Chrome setting is on.`),
      },
    }),
    claudeInChromePasswordManagersEnabled: Ve.field(wn.z.boolean().optional(), {
      flatKey: "claudeInChromePasswordManagersEnabled",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.9939.2",
        },
        executionTarget: "desktop",
        visibility: "public-undocumented",
      },
      remotePolicy: {
        hybrid: {
          scope: "only",
          derived: true,
        },
        hotApplied: true,
      },
      predicates: {
        show: () => false,
      },
      title: Ge.msg({
        defaultMessage: "Enable password managers in Claude in Chrome",
        id: "il2qeFDuRY",
      }),
      category: "connectors",
      group: rr.MCP_SERVERS_GROUP,
      order: 3.1,
      description: {
        short: Ve.shortDescription(
          Ge.msg({
            defaultMessage:
              "Set by the control plane from the organization\u2019s Password managers setting under Claude in Chrome; not editable here. Lets a password manager fill sign-ins.",
            id: "y41oE2cG9U",
          }),
        ),
        long: Ve.longDescription(`Server-derived: the Claude.ai control plane sets this key, each time it serves the configuration, from the organization's Password managers setting (Admin settings \u2192 Claude in Chrome \u2192 Password managers, off until an admin turns it on) and the signed-in member's access. It is not authored in any form, MDM profile, or bootstrap server, and a value stored anywhere else is ignored.

When on, and Claude in Chrome is on, a member on macOS can connect a supported password manager's desktop app in Claude Desktop; sessions that can use Claude in Chrome can then ask that password manager to fill a sign-in form in the user's browser through the Claude in Chrome extension and the password manager's own extension. The user approves each request in the password manager and Claude never receives the credential itself: it passes on the device between the password manager, its browser extension and the page. The app's usage telemetry for the integration (outcomes only; no sites, credentials or item names) follows \`disableNonessentialTelemetry\`, and Claude in Chrome's own checks apply to the page as for any of its actions. A change takes effect without a relaunch once two configuration syncs in a row have served it. Off unless the organization's setting is on; requires \`claudeInChromeEnabled\`.`),
      },
    }),
    localStdioEnabled: Ve.field(wn.z.boolean().optional(), {
      flatKey: "isLocalDevMcpEnabled",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p", "1p"],
          availableInVersion: "1.2581.0",
        },
      },
      title: Ge.msg({
        defaultMessage: "Allow user-added MCP servers",
        id: "1QKV7FS8FM",
      }),
      default: true,
      failClosedValue: false,
      egressRequirements: (e) => (e === false ? [] : Mc.PYTHON_EXTENSION_RUNTIME_HOSTS),
      egressRequirementsLabel: Ge.msg({
        defaultMessage: "User-added MCP (Python runtime)",
        id: "O0zxaLsWs9",
      }),
      category: "connectors",
      group: rr.MCP_SERVERS_GROUP,
      order: 2,
      description: {
        short: Ve.shortDescription(
          Ge.msg({
            defaultMessage:
              "Local stdio servers added via the Developer settings. Remote servers come from the managed list above or organization plugins.",
            id: "1NMgra1xGv",
          }),
        ),
      },
    }),
    allowedPluginServers: Ve.field(
      Ve.annotate(
        wn.z.array(
          hj(
            Ge.msg({
              defaultMessage: "URL pattern a plugin\u2019s remote server must match, with * wildcards.",
              id: "ERRP/7Z11f",
            }),
          )
            .nullable()
            .catch(null),
        ),
        {
          maxItems: 100,
        },
      )
        .transform((e) => e.filter((t) => t !== null))
        .optional(),
      {
        flatKey: "allowedPluginMcpServers",
        readers: ["desktop", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "2.2553.0",
          },
        },
        title: Ge.msg({
          defaultMessage: "Allowed plugin MCP servers",
          id: "vUSpcWJDNG",
        }),
        failClosedValue: [],
        emptyListIsAuthored: true,
        predicates: {
          warn: fj,
        },
        category: "connectors",
        group: rr.MCP_SERVERS_GROUP,
        order: 2.5,
        description: {
          short: Ve.shortDescription(
            Ge.msg({
              defaultMessage:
                "Servers plugins may connect in sessions, beyond the managed list above and organization plugins. An empty list allows none; unset keeps today\u2019s rules.",
              id: "y4jySlHrtX",
            }),
          ),
          long: Ve.longDescription(
            `Unset (default): with managed servers listed, sessions take MCP servers only from plugins and the desktop; with no managed servers listed, nothing is restricted.

When set, Cowork, Chat and Code sessions connect the managed list above and the servers the desktop serves from the administrator's org-plugins directory, plus only servers declared by other plugins (user-installed or marketplace) that match an entry. An entry in the managed list above with \`transport: "policy-only"\` sets a plugin server's tool permissions but does not admit it; to admit that server, list the server's own URL here. Claude Code configuration-file servers (\`~/.claude.json\`, a project's \`.mcp.json\`, \`claude mcp add\`) are never connected. With the key set, the desktop starts no plugin server on the computer itself, whatever the entries say. The one exception is the MCP servers it serves to sessions from the org-plugins directory. Each entry is a URL pattern in Claude Code's form, \`{"serverUrl": "https://*.example.com/*"}\` (\`*\` wildcards; a host \`*\` spans \`a.b\`): a plugin's remote server connects when its URL matches an entry. No entry admits a plugin's local (stdio) server, and an empty list admits no plugin server. Other shapes, the \`serverName\` and \`serverCommand\` forms included, are dropped and reported; a value that is not a list, or has no readable entry, locks sessions to the managed list and the org-plugins directory's servers, and stops every other desktop-started plugin server. User-added local servers and extensions keep their own keys.

Coexistence with another Claude Code managed-settings source on the device: see [managed settings](${Rr.COWORK_3P_DOCS_BASE}/code#interaction-with-claude-code%E2%80%99s-own-managed-settings).`,
            {
              docsUrl: `${Rr.COWORK_3P_DOCS_BASE}/configuration#allowedpluginmcpservers`,
            },
          ),
        },
      },
    ),
    deniedPluginServers: Ve.field(
      Ve.annotate(
        wn.z.array(
          hj(
            Ge.msg({
              defaultMessage: "URL pattern of the remote servers to block, with * wildcards.",
              id: "/Glsg+l7xY",
            }),
          ),
        ),
        {
          maxItems: 100,
        },
      ).optional(),
      {
        flatKey: "deniedPluginMcpServers",
        readers: ["desktop", "code"],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "2.16120.0",
          },
        },
        title: Ge.msg({
          defaultMessage: "Blocked plugin MCP servers",
          id: "nNohigULem",
        }),
        failClosedValue: [
          {
            serverUrl: "*",
          },
        ],
        predicates: {
          warn: fj,
        },
        category: "connectors",
        group: rr.MCP_SERVERS_GROUP,
        order: 2.6,
        description: {
          short: Ve.shortDescription(
            Ge.msg({
              defaultMessage:
                "Remote servers plugins may not connect, even if the allowed list admits them; in Code sessions, configuration-file servers too. Unset or empty blocks none.",
              id: "PHP5kjRTiq",
            }),
          ),
          long: Ve.longDescription(
            `Unset (default) or an empty list: nothing is blocked.

When set, Cowork, Chat and Code sessions do not connect a plugin's remote server whose URL matches an entry. The key works with or without \`allowedPluginMcpServers\`; a server that matches both lists stays blocked. In a Code session that reads Claude Code configuration-file servers (\`~/.claude.json\`, a project's \`.mcp.json\`, \`claude mcp add\`), a matching remote server from those files is refused as well. The managed list above, the servers the desktop serves from the administrator's org-plugins directory, user-added local servers and extensions are not affected: remove those at their own keys. Each entry is a URL pattern in Claude Code's form, \`{"serverUrl": "https://*.example.com/*"}\` (\`*\` wildcards; a host \`*\` spans \`a.b\`). An entry matches an address, not a server: the same server under another host name or an IP address, or behind a plugin's local (stdio) server, which has no URL, is not matched. \`https://*.example.com/*\` does not match \`http://\`, \`wss://\` or the bare \`example.com\`; a pattern such as \`example.com/*\`, which names no scheme, matches nothing, and a lone \`*\` matches every URL. To keep a plugin's servers out whatever address they use, set \`allowedPluginMcpServers\`, which admits only the servers it lists. The desktop reads no other shape, the \`serverName\` and \`serverCommand\` forms included: a value that is not a list, or that holds any entry the desktop cannot read, is reported and blocks every plugin's remote server (and those configuration-file remote servers), because skipping an entry of a block list would let its server connect. The servers named above as not affected still connect.

Coexistence with another Claude Code managed-settings source on the device: see [managed settings](${Rr.COWORK_3P_DOCS_BASE}/code#interaction-with-claude-code%E2%80%99s-own-managed-settings).`,
            {
              docsUrl: `${Rr.COWORK_3P_DOCS_BASE}/configuration#deniedpluginmcpservers`,
            },
          ),
        },
      },
    ),
    toolTimeoutSec: Ve.field(wn.z.coerce.number().int().min(60).max(3600).optional(), {
      flatKey: "mcpToolTimeoutSec",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.37937.0",
        },
        executionTarget: "desktop",
      },
      title: Ge.msg({
        defaultMessage: "MCP tool call timeout",
        id: "yfZOCQ8bcU",
      }),
      category: "connectors",
      group: rr.MCP_SERVERS_GROUP,
      order: 4,
      suffix: Ge.msg({
        defaultMessage: "seconds",
        id: "8TQoLRh7Ea",
      }),
      placeholder: Ge.msg({
        defaultMessage: "180",
        id: "H3SKnBW98K",
      }),
      description: {
        short: Ve.shortDescription(
          Ge.msg({
            defaultMessage: "Per-call timeout for MCP tool calls, in seconds. Default 180 (3 minutes).",
            id: "TKg4Ha2DBx",
          }),
        ),
        long: Ve.longDescription(
          "Sets the per-call timeout the agent applies to every MCP tool call; a call that runs longer fails with a timeout error the model can see. Cowork and chat sessions default to 180 seconds. Code sessions have no desktop-imposed MCP tool timeout today, so setting this key introduces one there as well. The desktop's own request deadlines toward MCP servers \u2014 the managed servers above and, where `isLocalDevMcpEnabled` permits them, user-added local servers \u2014 follow this value so they never cut a call short first; while the key is unset, calls to user-added local servers are additionally limited to 60 seconds by the desktop. Values outside 60\u20133600 are rejected at parse time (the error is listed in the diagnostics report) and the defaults apply.\n\nThe timeout is global (there is no per-server or per-tool form), so size it for the slowest tool you need to complete: long-running tools on one server extend the window during which a stuck call on any server holds its turn. Cowork's built-in shell tool runs under the same cap: a single command's `timeout_ms` (itself limited to 600 seconds) cannot exceed this value.",
          {
            docsUrl: `${Rr.COWORK_3P_DOCS_BASE}/configuration#mcptooltimeoutsec`,
          },
        ),
      },
    }),
  });
  function jue(e) {
    var t;
    return ((t = e.mcp) === null || t === undefined ? undefined : t.persistentAlwaysAllowEnabled) !== false;
  }
});
//@ chunk-1ny7cxrt.js:1004122-1067787 cjs-unmatched+string-clue
var _d = x(function (xj) {
  Object.defineProperty(xj, "__esModule", {
    value: true,
  });
  xj.WorkspaceConfig =
    xj.BUILTIN_TOOL_POLICY_ASK_SESSION =
    xj.BUILTIN_ASK_POLICY_VALUES =
    xj.BUILTIN_TOOL_NAMES =
      undefined;
  xj.builtinToolScope = Bue;
  xj.scanRuleList = Pj;
  xj.parseBuiltinRule = zc;
  xj.builtinRuleToolName = sw;
  xj.canonicalBuiltinRule = dl;
  xj.isScopedBuiltinRule = Kue;
  xj.checkBuiltinToolPolicyForDrops = Tj;
  xj.checkDisabledBuiltinToolsForDrops = $j;
  xj.builtinRuleWarnings = Vue;
  xj.checkEgressHostsForDrops = Rj;
  xj.resolveDisabledBuiltinTools = aw;
  xj.isChatTabEnabled = Gue;
  xj.isCoworkSurfaceEnabled = Wue;
  xj.isSkillCreationEnabled = Yue;
  xj.autoModeSurfaces = Jue;
  xj.isChatAdvancedFileAnalysisEnabled = Xue;
  xj.resolveBuiltinAskTools = Mj;
  xj.toolsCoveredByScopedRule = jj;
  xj.resolveBuiltinAskToolNames = Que;
  var De = require_v3();
  var ya = Xr();
  var ps = gr();
  var B = yt();
  var _t = $n();
  var V = mn();
  var Dm = Ir();
  var fs = Ar();
  var mke = Ns();
  var Ht = zi();
  var Uc = Cc();
  var group = V.msg({
    defaultMessage: "Network proxy",
    id: "wER6775GSj",
  });
  var group_2 = V.msg({
    defaultMessage: "Workspace VM network",
    id: "ko4KhGaz+7",
  });
  var vj = V.msg({
    defaultMessage: "End-user attribution",
    id: "enduserAttrTtl",
  });
  var Nue = De.z.object({
    path: B.subfield(
      B.annotate(De.z.string().min(1), {
        pathKind: "folder",
      }),
      {
        label: V.msg({
          defaultMessage: "Path",
          id: "P6LP7JosNq",
        }),
        support: {
          availableInVersion: "1.14271.0",
        },
        isPrimaryKey: true,
        mono: true,
        placeholder: V.msg({
          defaultMessage: "~/Documents/work",
          id: "/dk65J5QxC",
        }),
        description: {
          short: B.shortDescription(
            V.msg({
              defaultMessage:
                "Absolute folder path. May start with ~ or one of the listed %VAR% tokens, expanded per user. Subfolders are included.",
              id: "tFB6xfvwBv",
            }),
          ),
        },
      },
    ),
    isDefaultSelected: B.subfield(De.z.boolean().optional(), {
      label: V.msg({
        defaultMessage: "Pre-select on new task",
        id: "Dk3pnI8vXq",
      }),
      support: {
        availableInVersion: "1.14271.0",
      },
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Shows as a folder chip on the new-task page and skips the trust prompt. Users can remove it.",
            id: "P3a+4xY9Hb",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    mode: B.subfield(De.z.enum(["rw", "ro"]).optional(), {
      label: V.msg({
        defaultMessage: "Access mode",
        id: "Dt4A+S9duA",
      }),
      support: {
        availableInVersion: "1.26832.0",
      },
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Read-only folders can be viewed and searched but not modified in Cowork. In Code, applies to file tools only. Over SSH, also to Bash in its sandbox.",
            id: "4W27f1A7Ah",
          }),
          {
            docsOnly: false,
          },
        ),
        long: B.longDescription(
          `Read-only folders can be viewed and searched but not modified in Cowork (by Claude or via the UI). Bash runs in Cowork's isolated workspace where the folder is mounted read-only at the OS level; file-tool writes (Edit, Write) are blocked in-process by Claude Desktop.

In local Code sessions, read-only applies to Claude's file tools only; Bash does **not** yet enforce it.

In SSH sessions (earlier versions ignore the mode on the host), read-only is enforced by Claude Code's own permission rules: its file tools cannot modify the folder. A writable folder inside a read-only one is read-only too. Shell commands are stopped only where Claude Code's sandbox runs (Linux needs bubblewrap and socat), and only as far as that sandbox goes: keep read-only folders outside writable ones, and use the operating system's permissions where a folder must not change. The sandbox does not cover a path with \`* ? [ ] ( ) { } | +\` or a double quote. List each folder by its real path: shell commands may not be stopped in a folder listed through a link. Not enforced on Windows hosts, nor on a host with Claude Code managed settings of its own unless they set \`parentSettingsBehavior\` to \`merge\`. Not covered: MCP servers, hooks, the terminal, commands in \`sandbox.excludedCommands\`, and git worktrees, which Claude Desktop and Claude Code still create inside the folder.

A read-only folder that contains Claude's own data directory (for example the home folder; over SSH, \`~/.claude\` on the host) is enforced in Cowork only. Configure narrower folders for Code coverage. Over SSH, keep a Claude Code config folder moved by \`CLAUDE_CONFIG_DIR\` outside read-only folders.`,
          {
            docsOnly: false,
          },
        ),
      },
    }),
  });
  xj.BUILTIN_TOOL_NAMES = [
    "Bash",
    "Read",
    "Write",
    "Edit",
    "Glob",
    "Grep",
    "NotebookEdit",
    "WebFetch",
    "WebSearch",
    "Task",
    "TodoWrite",
    "TaskCreate",
    "TaskUpdate",
    "TaskGet",
    "TaskList",
    "TaskStop",
    "Skill",
    "REPL",
    "JavaScript",
    "AskUserQuestion",
    "ToolSearch",
    "SendUserMessage",
  ];
  var $m = ["WebSearch", "WebFetch"];
  var wj = ["WebFetch"];
  var Uue =
    "a scoped entry reaches Code sessions only, never Cowork; allow specific hosts with the egress host settings (coworkEgressAllowedHosts), one list for Cowork and Code";
  var Lc = {
    Read: ["Read", "Grep", "Glob"],
    Edit: ["Edit", "Write", "NotebookEdit"],
  };
  var Oj = new Map(
    Object.entries(Lc).flatMap(([key, value]) => value.filter((n) => n !== key).map((n) => [n, key])),
  );
  var Sj = "\\((\\S[^\\r\\n]*)\\)";
  var zue = {
    Bash: ["curl *"],
    Read: ["//etc/**", "//**/secrets/**"],
    Edit: ["//**/*.env", "//etc/**"],
  };
  var Fue = ["Bash", "Task", "Skill"];
  function Bue(e) {
    let t = zue[e];
    if (t !== undefined)
      return {
        examples: t,
      };
    let n = Oj.get(e);
    if (n !== undefined)
      return {
        via: n,
      };
    return wj.includes(e)
      ? {
          hostsViaEgress: true,
        }
      : undefined;
  }
  var regExp = new RegExp(
    `^(?:(${xj.BUILTIN_TOOL_NAMES.filter((e) => !$m.includes(e)).join("|")})(?:${Sj})?|(${$m.join("|")}))$`,
  );
  var regExp_2 = new RegExp(`^([^\\s()]+)(?:${Sj})?$`);
  function Pj(e) {
    let t = (s, a) => {
      let index = e.indexOf(e[s], s + 1);
      for (let j = s + 1, u = a; j < index; j++) {
        let f = e[j];
        if (f === "(") u++;
        else if (f === ")" && u > 0) u--;
        else if (f === "," && u === 0) return -1;
      }
      return index;
    };
    let n = [];
    let o = 0;
    let r = "";
    for (let j = 0; j < e.length; j++) {
      let a = e[j];
      if (a === '"' || a === "'") {
        let l = t(j, o);
        if (l !== -1) {
          r += e.slice(j, l + 1);
          j = l;
          continue;
        }
      } else if (a === "(") o++;
      else if (a === ")" && o > 0) o--;
      else if (a === "," && o === 0) {
        n.push(r);
        r = "";
        continue;
      }
      r += a;
    }
    n.push(r);
    return {
      segments: n,
      open: o > 0,
    };
  }
  function Aj(e) {
    return Pj(e).segments.length > 1;
  }
  var Hue = /^[a-z_][a-z0-9_]+:/;
  var Ij = new Map(xj.BUILTIN_TOOL_NAMES.map((e) => [e.toLowerCase(), e]));
  function zc(e) {
    let match = regExp.exec(e);
    if (match === null || Aj(e)) return;
    return match[3] !== undefined
      ? {
          tool: match[3],
        }
      : {
          tool: match[1],
          ...(match[2] !== undefined && {
            content: match[2],
          }),
        };
  }
  function sw(e) {
    var t;
    return (t = zc(e)) === null || t === undefined ? undefined : t.tool;
  }
  function dl(e) {
    let match = regExp_2.exec(e);
    if (match === null || Ij.get(match[1].toLowerCase()) !== match[1]) return e;
    return match[2] === "*" || (match[2] === "**" && match[1] === "Bash") ? match[1] : e;
  }
  function Kue(e) {
    var t;
    return ((t = zc(e)) === null || t === undefined ? undefined : t.content) !== undefined;
  }
  function Cj(e) {
    var t;
    let n = zc(e);
    if (n !== undefined) {
      let { tool, content } = n;
      if (content === undefined) return;
      if (dl(e) !== e) return `"(${content})" means every call; it is applied as the bare name "${tool}"`;
      if (Hue.test(content)) return;
      let l = Oj.get(tool);
      if (l !== undefined)
        return `Claude Code matches file-path patterns only on ${l}(\u2026) rules, which cover ${Lc[l].join("/")}; use "${l}(${content})"`;
      if (!(tool in Lc) && !Fue.includes(tool))
        return `${tool} matches rule content only in Claude Code's ${tool}(<field>:<pattern>) form; use the bare name "${tool}" to cover every call`;
      return;
    }
    if (Aj(e)) return "looks like several rules joined by commas; use one entry per rule";
    let o = (t = regExp_2.exec(e)) === null || t === undefined ? undefined : t[1];
    if (o === undefined) return "malformed rule; expected Tool or Tool(pattern) on one line";
    let r = Ij.get(o.toLowerCase());
    if (r === undefined) return;
    if (r !== o) return `tool names are case-sensitive; use "${r}"`;
    return wj.includes(r) ? `${r} takes the bare name only \u2014 ${Uue}` : `${r} takes the bare name only`;
  }
  var Zue = `Each entry is a Claude Code tool name (\`${xj.BUILTIN_TOOL_NAMES.join("`, `")}\`) or an argument-scoped [permission rule](https://code.claude.com/docs/en/permissions#permission-rule-syntax) such as \`Bash(curl *)\` or \`Edit(//**/*.env)\`. A bare name covers every call (a bare \`Bash\` entry also covers the \`PowerShell\` tool); a scoped rule covers matching calls in every permission mode, including Auto and bypass. Scopes are matched for \`Bash(\u2026)\` (a command pattern) and for file paths written as \`Read(\u2026)\` (covers \`${Lc.Read.join("`, `")}\`) or \`Edit(\u2026)\` (covers \`${Lc.Edit.join("`, `")}\`); other tools take \`Tool(<field>:<pattern>)\`. \`${$m.join("` and `")}\` are bare-name only: per-host web access is \`coworkEgressAllowedHosts\`.

Scoped \`Bash(\u2026)\` rules apply in Code sessions only; Cowork's shell follows only a bare \`Bash\` entry. Start absolute file paths with \`//\`, not \`/\`: a relative pattern such as \`Read(**/.env)\` covers only a Code session's project folder and none of Cowork's connected folders. Scoped rules need fleet-wide build support (\`disableAutoUpdates\` pins builds): an older build passes a scoped entry to Claude Code unchecked. An entry whose pattern contains \`)\` followed by a space or comma is enforced only through Claude Code's managed-settings channel, so another Claude Code [managed-settings source](${_t.COWORK_3P_DOCS_BASE}/code#interaction-with-claude-code%E2%80%99s-own-managed-settings) replaces it unless that source sets \`parentSettingsBehavior\` to \`"merge"\`; every other entry is enforced either way.

An unusable entry (a lowercase tool name, an unbalanced parenthesis, a scoped \`${$m.join("(\u2026)` or `")}(\u2026)\`) is kept, because the deny list is served exactly as written, and raises a configuration warning.`;
  xj.BUILTIN_ASK_POLICY_VALUES = ["allow", "ask"];
  xj.BUILTIN_TOOL_POLICY_ASK_SESSION = {
    path: 'builtinToolPolicy: "ask-session"',
    use: '"ask"',
    effect: 'the entry will be read as "ask" (approval on every call), like any unrecognized value',
    ...ya.BATCH_2026_09,
    match: (e) =>
      typeof e === "object" &&
      e !== null &&
      !Array.isArray(e) &&
      Object.values(e).some((t) => t === "ask-session"),
    rewrite: (e) =>
      Object.fromEntries(
        Object.entries(e).map(([key, value]) => [key, value === "ask-session" ? "ask" : value]),
      ),
  };
  function Tj(e, t) {
    var n;
    let o = ya.applyLegacy(xj.BUILTIN_TOOL_POLICY_ASK_SESSION, e);
    if (!o || typeof o !== "object") return;
    for (let [key, value] of Object.entries(o)) {
      let a = dl(key);
      if (a !== key)
        t(
          `builtinToolPolicy["${key}"]: "${key.slice(a.length)}" means every call; applied as the bare name "${a}"`,
          "clamp",
        );
      if (sw(a) === undefined)
        t(
          `builtinToolPolicy["${key}"] dropped: ${(n = Cj(key)) !== null && n !== undefined ? n : "unknown built-in tool"}`,
          "drop",
        );
      else if (value === "blocked")
        t(
          `builtinToolPolicy["${key}"]: "blocked" is not a built-in tool policy; treated as "ask" (use disabledBuiltinTools to remove the tool)`,
          "drop",
        );
      else if (value !== "allow" && value !== "ask")
        t(
          `builtinToolPolicy["${key}"]: unrecognized policy ${JSON.stringify(value)}; treated as "ask"`,
          "drop",
        );
    }
  }
  function $j(e, t) {
    if (!Array.isArray(e)) return;
    e.forEach((n, o) => {
      if (typeof n !== "string") {
        t(
          `disabledBuiltinTools[${o}] dropped: entries must be strings (got ${n === null ? "null" : Array.isArray(n) ? "array" : typeof n})`,
          "drop",
        );
        return;
      }
      let r = dl(n);
      if (r !== n)
        t(
          `disabledBuiltinTools entry ${JSON.stringify(n)}: "${n.slice(r.length)}" means every call; applied as the bare name "${r}"`,
          "clamp",
        );
    });
  }
  function Vue(e, t) {
    return t.flatMap((n) => {
      let o = Cj(n);
      return o === undefined ? [] : [`${e} entry ${JSON.stringify(n)} is not enforced as written: ${o}`];
    });
  }
  function Rj(e, t) {
    if (!Array.isArray(e)) return;
    for (let n of e)
      if (typeof n !== "string" || ps.parseEgressHostEntry(n) === null)
        t(`coworkEgressAllowedHosts entry ${JSON.stringify(n)} dropped: must be ${ps.EGRESS_ENTRY_GRAMMAR}`);
  }
  xj.WorkspaceConfig = De.z.object({
    disabledBuiltinTools: B.field(
      De.z
        .preprocess(
          (e) => (Array.isArray(e) ? [...new Set(e.filter((t) => typeof t === "string").map(dl))] : e),
          B.annotate(De.z.array(De.z.string()), {
            maxItems: 100,
          }),
        )
        .optional(),
      {
        flatKey: "disabledBuiltinTools",
        readers: ["desktop", "code"],
        failClosedValue: [...xj.BUILTIN_TOOL_NAMES],
        checkDropped: $j,
        support: {
          enabled: {
            scopes: ["3p", "1p"],
            availableInVersion: "1.2581.0",
          },
          executionTarget: "desktop",
        },
        title: V.msg({
          defaultMessage: "Disabled built-in tools",
          id: "iGPHC9Tm20",
        }),
        category: "sandbox",
        group: Ht.TOOLS_GROUP,
        order: 4,
        customRenderer: "builtinToolRules",
        placeholder: V.msg({
          defaultMessage: "WebSearch or Bash(curl *)",
          id: "KHWonN3qfv",
        }),
        description: {
          short: B.shortDescription(
            V.msg({
              defaultMessage:
                "Built-in tools, or argument-scoped permission rules such as Read(//**/.env), denied in Cowork and Code.",
              id: "kMVrXfFbvZ",
            }),
          ),
          long: B.longDescription(Zue),
        },
        predicates: {
          locked: [
            {
              when: (e) => {
                var t;
                return Dm.isBedrockFamily(
                  (t = e.inference) === null || t === undefined ? undefined : t.provider,
                );
              },
              append: ["WebSearch"],
            },
          ],
        },
      },
    ),
    disableBundledSkills: B.field(De.z.boolean().optional(), {
      flatKey: "disableBundledSkills",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p", "1p"],
          availableInVersion: "1.15962.0",
        },
        executionTarget: "desktop",
      },
      failClosedValue: true,
      title: V.msg({
        defaultMessage: "Disable bundled skills and workflows",
        id: "kpCOjtwfPF",
      }),
      category: "sandbox",
      group: Ht.GENERAL_RESTRICTIONS_GROUP,
      order: 6,
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Disables Claude Code\u2019s bundled skills and workflows (deep-research and similar). Use where WebFetch/WebSearch aren\u2019t available.",
            id: "Q90IY9SGu1",
          }),
        ),
      },
    }),
    skillCreationEnabled: B.field(De.z.boolean().optional(), {
      flatKey: "skillCreationEnabled",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.25927.0",
        },
      },
      title: V.msg({
        defaultMessage: "Allow user-created skills",
        id: "y486fMBVj/",
      }),
      default: {
        displayOnly: true,
      },
      failClosedValue: false,
      category: "sandbox",
      group: Ht.GENERAL_RESTRICTIONS_GROUP,
      order: 6.5,
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Allow users to create and upload their own skills. When off, the creation and upload surfaces are hidden and the agent\u2019s skill-creation tools are disabled.",
            id: "Cpqtiix6lD",
          }),
        ),
        long: B.longDescription(
          "When on (default), users can create new skills and upload skill files in the app. Set to `false` to block user skill creation: the skill-creation and upload surfaces are hidden (the `skill_creation` feature is served as blocked by the organization), and the agent's skill-creation tools (saving skills from a conversation, skill proposals) are not offered in sessions \u2014 the same effect as turning off the **User-created skills** organization setting available to claude.ai enterprise admins.\n\nThis is a feature-availability control enforced in the app's UI, not a data boundary: skills are files on the user's machine, and files already present there (or placed there outside the app) are not removed or blocked by this key. Skills themselves remain usable; organization-distributed plugins and bundled skills are unaffected (to disable bundled skills, use `disableBundledSkills`).",
          {
            docsUrl: `${_t.COWORK_3P_DOCS_BASE}/configuration#skillcreationenabled`,
          },
        ),
      },
    }),
    scheduledTasksEnabled: B.field(De.z.boolean().optional(), {
      flatKey: "scheduledTasksEnabled",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.110.0",
        },
      },
      title: V.msg({
        defaultMessage: "Allow scheduled tasks",
        id: "scheduledTasksEnabledTitle",
      }),
      default: {
        displayOnly: true,
      },
      failClosedValue: false,
      category: "sandbox",
      group: Ht.GENERAL_RESTRICTIONS_GROUP,
      order: 6.8,
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Allow scheduled tasks in Cowork and Code. When off, the Scheduled page is hidden, existing tasks stop running, and Claude cannot create new ones.",
            id: "scheduledTasksEnabledShort",
          }),
        ),
        long: B.longDescription(
          "When on (default), users can schedule Cowork tasks and Code sessions to run later or on a recurring schedule, and Claude can create such schedules when asked.\n\nSet to `false` to turn scheduled tasks off for every user. The Scheduled section in Cowork and the routines list in the Code tab are hidden, together with every other place a schedule can be created. Tasks that already exist on a device no longer run; they are kept, not deleted, and run again once the key is removed or set to `true`. Claude is not offered the tools that create, change or run these tasks, and sessions start without Claude Code's own in-session scheduling tools (the `/loop` command, its cron tools and its wake-up timer).\n\nIt does not remove task files already on the user's machine. A change takes effect at the next app launch.",
          {
            docsUrl: `${_t.COWORK_3P_DOCS_BASE}/configuration#scheduledtasksenabled`,
          },
        ),
      },
    }),
    keepAwakeEnabled: B.field(De.z.boolean().optional(), {
      flatKey: "keepAwakeEnabled",
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.7032.0",
        },
      },
      title: V.msg({
        defaultMessage: "Allow keep awake",
        id: "keepAwakeEnabledTitle",
      }),
      default: {
        displayOnly: true,
      },
      failClosedValue: false,
      category: "sandbox",
      group: Ht.GENERAL_RESTRICTIONS_GROUP,
      order: 6.9,
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Let Claude keep the computer awake. When off, Claude never prevents sleep and hides the keep-awake switches in Settings, the Scheduled page and the Code tab.",
            id: "keepAwakeEnabledShort",
          }),
        ),
        long: B.longDescription(
          "When on (default), users can turn on **Keep computer awake** (Settings \u2192 This computer \u2192 System, also shown as **Keep awake** on the Scheduled page in Cowork and the Routines page in Code) so the computer does not idle-sleep while Claude is open and scheduled tasks keep running on an idle machine. The Code tab can also keep the computer awake while a session is working (**Keep computer awake while Claude works** in Settings \u2192 Claude Code, and a session's **Keep computer awake** menu item).\n\nSet to `false` to make sure Claude never prevents the computer from sleeping: those switches are hidden and no part of the app keeps the computer awake. Users' saved choices are kept but ignored, and apply again once the key is removed or set to `true`. Scheduled tasks are unaffected and still run only while the computer is awake and the app is open.\n\nA change takes effect on a running app.",
          {
            docsUrl: `${_t.COWORK_3P_DOCS_BASE}/configuration#keepawakeenabled`,
          },
        ),
      },
    }),
    builtinToolPolicy: B.field(
      B.annotate(
        De.z
          .preprocess(
            (e) => {
              let t = ya.applyLegacy(xj.BUILTIN_TOOL_POLICY_ASK_SESSION, e);
              return t && typeof t === "object" && !Array.isArray(t)
                ? Object.entries(t)
                    .filter(([key]) => sw(dl(key)) !== undefined)
                    .reduce((acc, [o, r]) => {
                      let s = dl(o);
                      let a = r === "allow" ? "allow" : "ask";
                      acc[s] = acc[s] === "ask" ? "ask" : a;
                      return acc;
                    }, {})
                : t;
            },
            De.z.record(De.z.string().regex(regExp), De.z.enum(xj.BUILTIN_ASK_POLICY_VALUES)),
          )
          .optional(),
        {
          redact: "toolRules",
        },
      ),
      {
        flatKey: "builtinToolPolicy",
        readers: ["desktop", "code"],
        support: {
          enabled: {
            scopes: ["3p", "1p"],
            availableInVersion: "1.8089.0",
          },
          values: {
            "ask-session": {
              availableInVersion: "1.40609.0",
            },
          },
        },
        title: V.msg({
          defaultMessage: "Built-in tool policy",
          id: "hhKxQ3MtxT",
        }),
        failClosedValue: Object.fromEntries(xj.BUILTIN_TOOL_NAMES.map((e) => [e, "ask"])),
        deprecations: [xj.BUILTIN_TOOL_POLICY_ASK_SESSION],
        checkDropped: Tj,
        category: "sandbox",
        group: Ht.TOOLS_GROUP,
        order: 3,
        customRenderer: "builtinToolRules",
        placeholder: V.msg({
          defaultMessage: "WebFetch or Bash(curl *)",
          id: "tQLBe0W6Km",
        }),
        addLabel: V.msg({
          defaultMessage: "Add policy",
          id: "6TgDeF8iRs",
        }),
        description: {
          short: B.shortDescription(
            V.msg({
              defaultMessage:
                "Approval policy per built-in tool or argument-scoped rule such as Bash(curl *). \u201Cask\u201D requires user approval before each matching call; \u201Callow\u201D is the default.",
              id: "H4Ea6XAuEf",
            }),
          ),
          long: B.longDescription(
            "Keys use the same tool names and argument-scoped rule syntax as **Disabled built-in tools** (`disabledBuiltinTools`), and scopes apply in the same sessions. A bare `Bash` key also governs Claude Code's `PowerShell` tool (its shell on Windows PCs without Git for Windows); argument-scoped `Bash(\u2026)` keys do not. Scoped **ask** rules reach sessions only through Claude Code's managed-settings channel, so another Claude Code managed-settings source replaces them unless it sets `parentSettingsBehavior` to `\"merge\"` (bare names hold either way). They need the same fleet-wide build support, and an older build drops a scoped **ask** entry as a configuration error (which also blocks WSL sessions on Windows until that client updates), so the tool runs unprompted.\n\nAn **ask** entry, bare or scoped, also turns off the app's remembered \u201Calways allow\u201D choices for that tool, so each prompted call is confirmed individually. **ask** on a file tool (`Read`, `Write`, `Edit`, `Glob`, `Grep`) prompts in Cowork, Chat and Code sessions. Calls that Cowork and Chat always refuse are still refused without a prompt: paths outside the session's connected folders (in Chat, outside its scratch directory and its project's folders) and protected or sensitive files inside them. A scheduled task in Cowork waits at the prompt, which appears in the task's session and, when that session is not in view, as a desktop notification. Code side chats cannot prompt, so they block matching calls. An unusable entry is dropped and recorded as a configuration error; a value other than `allow` or `ask` is treated as `ask` and reported. To remove a tool or deny a rule outright, use **Disabled built-in tools** instead.",
          ),
        },
      },
    ),
    autoModeEnabled: B.field(De.z.boolean().optional(), {
      flatKey: "autoModeEnabled",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.10628.0",
        },
      },
      title: V.msg({
        defaultMessage: "Allow Auto mode",
        id: "0QsHlMb8HD",
      }),
      default: {
        displayOnly: true,
      },
      failClosedValue: false,
      category: "sandbox",
      group: Ht.GENERAL_RESTRICTIONS_GROUP,
      order: 5,
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Offer Auto mode in the Code permission selector (on unless set to false); set to true to also offer it in Cowork. Claude decides which actions need approval.",
            id: "94/7dcRsyP",
          }),
        ),
        long: B.longDescription(
          `Left unset, users can select **Auto mode** in Code and new Code sessions start in it; a mode the user already chose, or a Claude Code settings file's \`permissions.defaultMode\`, takes precedence, and Cowork does not offer it. Set to \`true\` to also offer **Automatically approve** in Cowork (Cowork sessions still start by asking before each action until the user picks it). Set to \`false\` to remove the option from both tabs. In Auto mode Claude runs a safety classifier on each action and only prompts for approval on actions it judges risky, instead of following the static per-tool policy.

Requires a model that supports the safety classifier \u2014 which models qualify depends on the deployment's provider and the app version. With a model that lacks support the option is greyed out and Code sessions do not start in it. \`builtinToolPolicy\` and this key may both be set; Auto mode is a user-selectable option alongside the default policy, not a replacement for it.

In Code sessions, a separately deployed Claude Code [managed-settings](${_t.COWORK_3P_DOCS_BASE}/code#interaction-with-claude-code%E2%80%99s-own-managed-settings) file that sets \`disableAutoMode\` to \`"disable"\` also keeps Auto mode hidden and off, whatever this key says.`,
          {
            docsUrl: `${_t.COWORK_3P_DOCS_BASE}/configuration#automodeenabled`,
          },
        ),
      },
    }),
    disableBypassPermissionsMode: B.field(De.z.boolean().optional(), {
      flatKey: "disableBypassPermissionsMode",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.46388.1",
        },
      },
      title: V.msg({
        defaultMessage: "Disable bypass permissions mode",
        id: "CIeOvXouGu",
      }),
      default: {
        displayOnly: false,
      },
      failClosedValue: true,
      category: "sandbox",
      group: Ht.GENERAL_RESTRICTIONS_GROUP,
      order: 5.5,
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Remove the bypass permissions mode from Code sessions and Cowork tasks, so Claude always follows the permission policy. Off by default.",
            id: "eXwx/L4TgM",
          }),
        ),
        long: B.longDescription(
          `When set to \`true\`, sessions cannot run in bypass permissions mode: the app stops offering the mode in Code and Cowork, and a session that requests it anyway is downgraded. This is the \`disableBypassPermissionsMode\` setting from the \`permissions\` section of Claude Code's [managed settings](${_t.COWORK_3P_DOCS_BASE}/code#interaction-with-claude-code%E2%80%99s-own-managed-settings); a separately deployed Claude Code managed-settings file that sets it to \`"disable"\` also removes the mode, whichever source sets it.

Unset (default): users the deployment otherwise allows can choose bypass permissions mode.`,
          {
            docsUrl: `${_t.COWORK_3P_DOCS_BASE}/configuration#disablebypasspermissionsmode`,
          },
        ),
      },
    }),
    toolSearchEnabled: B.field(De.z.boolean().optional(), {
      flatKey: "toolSearchEnabled",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.21459.0",
        },
        executionTarget: "desktop",
      },
      title: V.msg({
        defaultMessage: "Enable tool search",
        id: "3b6nGnLx6b",
      }),
      default: false,
      category: "sandbox",
      group: Ht.TOOLS_GROUP,
      order: 5,
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Load MCP tool schemas on demand (tool search) instead of inlining every schema into context.",
            id: "jPPLehrZ3d",
          }),
        ),
        long: B.longDescription(
          "When enabled, Cowork, Code, and Chat sessions place only tool names in context up front, and Claude fetches a tool's full schema the first time it needs it. Use this when many MCP tools are configured and their inlined schemas crowd out the context window. If your endpoint does not accept the request shape it then receives, requests fail with HTTP 400.\n\n- **Claude API, Vertex AI, Bedrock, or Bedrock Mantle with no custom base URL**: not needed. The app leaves Claude Code's experimental betas on there, as terminal Claude Code does, so tool search is on by default (on Vertex AI, for Claude 4.5 and newer models). To turn it off in Code, Cowork, and Chat, set `ENABLE_TOOL_SEARCH` to `false` in the `env` block of OS-level Claude Code managed settings (with `parentSettingsBehavior: \"merge\"`). Earlier app versions treat these like the last case.\n- **Gateway provider, app versions bundling Claude Code 2.1.247 or later**: requests add only the tool-search shape (the `tool-search-tool-2025-10-19` `anthropic-beta` value, deferred tool loading, `tool_reference` content blocks); every other experimental Claude Code beta stays suppressed. OS-level Claude Code managed settings that keep that suppression or turn `ENABLE_TOOL_SEARCH` off still win; set `ENABLE_TOOL_SEARCH` to `force` there instead (with `parentSettingsBehavior: \"merge\"`). Sessions the app runs in Claude Code's gateway mode (an opt-in for users on the gateway's own sign-in) get its gateway-safe tool-search shape instead.\n- **Foundry, a custom base URL, and earlier app versions**: the app suppresses Claude Code's experimental betas for the session and the key lifts that, so requests carry the tool-search shape together with Claude Code's other experimental betas for that provider. On Vertex with app versions bundling Claude Code older than 2.1.221, leave this unset while any model older than Claude 4.5 is in use; those engines send the header regardless of model and Vertex's pre-4.5 stacks reject it.",
          {
            docsUrl: `${_t.COWORK_3P_DOCS_BASE}/gateway#mcp-tool-search`,
          },
        ),
      },
    }),
    skipWebFetchPreflight: B.field(De.z.boolean().optional(), {
      flatKey: "skipWebFetchPreflight",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.37937.0",
        },
        executionTarget: "desktop",
      },
      title: V.msg({
        defaultMessage: "Skip WebFetch domain check",
        id: "N2lNsOXNuF",
      }),
      default: {
        displayOnly: false,
      },
      category: "sandbox",
      group: Ht.GENERAL_RESTRICTIONS_GROUP,
      order: 11,
      egressRequirements: (e, t) => {
        var n;
        return e === true ||
          ((n = t.codeSurface) === null || n === undefined ? undefined : n.enabled) === false
          ? []
          : [ps.ANTHROPIC_API_HOST];
      },
      egressRequirementsLabel: V.msg({
        defaultMessage: "WebFetch domain check",
        id: "nZmPQiUhiY",
      }),
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Skip Claude Code\u2019s WebFetch domain lookup against api.anthropic.com in Code sessions. Off by default; turn on when that host is blocked.",
            id: "3dSlpHs3f5",
          }),
        ),
        long: B.longDescription(`Before fetching a page, Claude Code's WebFetch tool asks \`api.anthropic.com\` whether the domain is on Anthropic's content blocklist, and refuses the fetch if that lookup cannot complete. Third-party deployments route inference elsewhere and often block \`api.anthropic.com\` at the firewall; with the lookup on, every WebFetch in Code sessions then fails with "Unable to verify if domain \u2026 is safe to fetch", and where the host is reachable, every fetched hostname is sent to Anthropic. (Cowork sessions fetch through the app's own allowlisted fetch and never run this lookup.)

Off (default): the lookup runs as it does today, so \`api.anthropic.com\` must be reachable from users' machines for Code-session WebFetch to work (listed under Egress Requirements). Set to \`true\` when users' machines cannot reach \`api.anthropic.com\` (corporate firewall, government network) or you do not want fetched hostnames sent there: Code sessions then fetch without the lookup and never contact that host for it. This is the same \`skipWebFetchPreflight\` setting Claude Code reads from its own [managed-settings](${_t.COWORK_3P_DOCS_BASE}/code#interaction-with-claude-code%E2%80%99s-own-managed-settings) file; the app passes it to every session it starts. To restrict which domains Claude may fetch, use \`coworkEgressAllowedHosts\` or \`builtinToolPolicy\` instead.`),
      },
    }),
    allowedFolders: B.field(
      B.annotate(
        B.annotate(De.z.array(De.z.union([De.z.string().min(1), Nue])), {
          maxItems: 200,
        })
          .transform((e) =>
            e.map((t) =>
              typeof t === "string"
                ? {
                    path: t,
                  }
                : t,
            ),
          )
          .optional(),
        {
          pathKind: "folder",
        },
      ),
      {
        flatKey: "allowedWorkspaceFolders",
        readers: ["desktop", "code"],
        support: {
          enabled: {
            scopes: ["3p", "1p"],
            availableInVersion: "1.2581.0",
          },
        },
        title: V.msg({
          defaultMessage: "Allowed workspace folders",
          id: "y3gym+4SMI",
        }),
        failClosedValue: [],
        emptyListIsAuthored: true,
        category: "sandbox",
        group: Ht.GENERAL_RESTRICTIONS_GROUP,
        order: 2,
        addLabel: V.msg({
          defaultMessage: "Add folder",
          id: "kjqTjJbwtK",
        }),
        description: {
          short: B.shortDescription(
            V.msg({
              defaultMessage:
                "Folders where Claude may work. Applies to Cowork and Code sessions and to the project folders a chat reads. Leave unset for unrestricted access.",
              id: "5BMPzic821",
            }),
          ),
          long: B.longDescription(
            "Paths can reference `~` and these environment variables, expanded per user: `%OneDrive%`, `%OneDriveCommercial%`, `%OneDriveConsumer%`, `%APPDATA%`, `%LOCALAPPDATA%`, `%USERNAME%`, `%XDG_DOCUMENTS_DIR%`. The set is fixed; an entry that references any other `%VAR%`, or one that is unset on the device, is ignored.\n\nEach folder is interpreted on the machine the session runs on. For a Code session on an SSH host, `~` means the remote user's home, an entry that references a `%VAR%` is ignored there (environment variables belong to the machine that defines them), and the session's working directory must fall inside one of the folders as they exist on that host. One list serves every machine: `[\"~/work\", \"/srv/work\"]` governs `~/work` for each user, on a managed Mac or a Linux host, and `/srv/work` on a host that has it. A folder that names nothing real on a given machine simply allows nothing there. An empty list allows no folder at all; unset leaves access unrestricted.\n\nA listed folder is one Claude may write as well as read, unless the entry's `mode` (Access mode in Setup) makes it read-only; that field's own description says how far read-only reaches. A Code session can reach every listed folder, not only the one it was opened in. Setting this key also turns on Claude Code's sandbox where it runs (macOS, or Linux and SSH hosts with bubblewrap): there a shell command normally writes in the listed folders without an approval prompt, and its writes to most other places, such as a package cache in the home directory, are refused. A home directory holds shell start-up files and SSH keys, so list work folders, not a whole home directory.\n\nThe list also limits which folders of a project a chat reads.",
            {
              docsUrl: `${_t.COWORK_3P_DOCS_BASE}/configuration#allowedworkspacefolders`,
            },
          ),
        },
      },
    ),
    blockReadsOutsideWorkingDirectories: B.field(De.z.boolean().optional(), {
      flatKey: "blockReadsOutsideWorkingDirectories",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p", "1p"],
          availableInVersion: "1.46388.1",
        },
        executionTarget: "desktop",
      },
      failClosedValue: true,
      title: V.msg({
        defaultMessage: "Block reads outside working directories",
        id: "GQrrmfzD4R",
      }),
      default: {
        displayOnly: false,
      },
      category: "sandbox",
      group: Ht.GENERAL_RESTRICTIONS_GROUP,
      order: 2.5,
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Keep Claude from reading files outside a Code session\u2019s working directories. File tools refuse such reads; sandboxed shell commands lose the home directory.",
            id: "vSpvldmS33",
          }),
        ),
        long: B.longDescription(
          `When set to \`true\`, Code sessions refuse reads outside their working directories (the session folder plus any \`allowedWorkspaceFolders\`). The file tools (Read, Grep, Glob) refuse them in every permission mode; where Claude Code's sandbox runs (macOS, or Linux and SSH hosts with bubblewrap, once \`allowedWorkspaceFolders\` is set or an egress allowlist applies: in third-party deployments one applies unless \`coworkEgressAllowedHosts\` contains \`*\`, in first-party deployments none does) shell commands cannot see the home directory and other user folders (\`/Users\`, \`/home\`, mounted volumes) and a read there is refused with no prompt; elsewhere (Windows, Linux without bubblewrap, or neither folders nor an egress allowlist in effect) such shell reads prompt for approval. The app keeps the user's git configuration files (which may themselves embed credentials such as URL tokens; a symlinked one stays hidden), its own Claude Code installation, and the session's plugin and attachment folders readable (not on a Windows SSH host, where plugin files and attachments stay out of the file tools' reach under the block). An allowed folder that is or contains the home directory leaves it readable.

Users can re-open folders (even their whole home) in their own Claude Code settings with \`sandbox.filesystem.allowRead\` or \`permissions.additionalDirectories\`; settings files tracked in a git repository cannot. The key travels on Claude Code's managed-settings channel: another Claude Code managed-settings source replaces it unless that source sets \`parentSettingsBehavior\` to \`"merge"\`, and one that sets \`sandbox.filesystem.allowManagedReadPathsOnly\` reduces it to approval prompts. This is \`permissions.blockReadsOutsideWorkingDirectories\` in Claude Code's [managed settings](${_t.COWORK_3P_DOCS_BASE}/code#interaction-with-claude-code%E2%80%99s-own-managed-settings).

Unset (default): nothing changes.`,
          {
            docsUrl: `${_t.COWORK_3P_DOCS_BASE}/configuration#blockreadsoutsideworkingdirectories`,
          },
        ),
      },
    }),
    disableWslSessions: B.field(De.z.boolean().optional(), {
      flatKey: "disableWslSessions",
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p", "1p"],
          availableInVersion: "1.19367.0",
        },
        visibility: "public-undocumented",
        executionTarget: "desktop",
      },
      appBehaviorOnly: true,
      title: V.msg({
        defaultMessage: "Block WSL sessions",
        id: "DpHm4YbvWC",
      }),
      category: "sandbox",
      group: Ht.CODE_SURFACE_GROUP,
      order: 15,
      predicates: {
        show: (e) => {
          var t;
          return ((t = e.codeSurface) === null || t === undefined ? undefined : t.enabled) !== false;
        },
      },
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Block Code sessions that run inside a WSL distro. Windows endpoint policy does not reach inside WSL.",
            id: "722/v6Am9J",
          }),
        ),
        long: B.longDescription(
          "Sessions started inside a WSL distro run Claude Code where Windows host endpoint policy (this managed configuration, and Claude Code's own managed-settings.json) does not apply. On a device with any managed configuration present, WSL sessions are blocked unless this key is explicitly set to `false`. Set to `true` to block WSL sessions unconditionally; set to `false` to allow them on managed devices; leave unset to block whenever the device is managed.\n\nThis key is honored only when deployed through machine-scoped management \u2014 MDM on macOS, the HKLM policy hive on Windows, the root-owned `/etc` file on Linux \u2014 never via the in-app Setup panel or user-writable stores; in particular, an explicit `false` written to the user-writable HKCU hive is ignored (and its presence still marks the device as managed). Because the key is grouped with the other app-behavior keys, deploying it claims that whole group: the auto-update keys (`disableAutoUpdates`, `autoUpdaterEnforcementHours`, \u2026) are then resolved from the managed tier alone, and any local- or remote-tier values for them stop applying.",
        ),
      },
    }),
    claudeCodeProcessWrapperEnabled: B.field(De.z.boolean().optional(), {
      flatKey: "claudeCodeProcessWrapperEnabled",
      support: {
        enabled: [
          {
            scopes: ["3p"],
            availableInVersion: "2.7032.0",
          },
          {
            scopes: ["1p"],
            availableInVersion: "2.16120.0",
          },
        ],
        visibility: "public-undocumented",
        executionTarget: "desktop",
      },
      remotePolicy: {
        hotApplied: true,
      },
      appBehaviorOnly: true,
      title: V.msg({
        defaultMessage: "Use Claude Code\u2019s corporate launcher",
        id: "ClaudeCodeProcessWrapperEnabledTitle",
      }),
      default: {
        displayOnly: false,
      },
      failClosedValue: true,
      category: "sandbox",
      group: Ht.CODE_SURFACE_GROUP,
      order: 15.5,
      predicates: {
        show: (e) => {
          var t;
          return ((t = e.codeSurface) === null || t === undefined ? undefined : t.enabled) !== false;
        },
      },
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Start Claude Code through the launcher in Claude Code\u2019s managed settings (processWrapper) \u2014 this device\u2019s, and an SSH host\u2019s for SSH sessions. Off by default.",
            id: "ClaudeCodeProcessWrapperEnabledHint",
          }),
        ),
        long: B.longDescription(
          "When `true` and Claude Code's managed settings name a corporate launcher in `processWrapper` or `env.CLAUDE_CODE_PROCESS_WRAPPER`, the Code tab starts the app's Claude Code through it: on this device (managed-settings file or MDM profile, never server-managed), and, for an SSH session, through the one in the host's managed-settings files (`/etc/claude-code`; `/Library/Application Support/ClaudeCode` on macOS). Either way it is handed none of the app's inference credential (claude.ai sign-in, provider key, token, auth header or credential file) and reads no stored login or ambient cloud credential of this device (over SSH, the host account's own environment still applies); the launcher must put one in its environment \u2014 `ANTHROPIC_BASE_URL` with `ANTHROPIC_AUTH_TOKEN` or `ANTHROPIC_API_KEY`, or, for the Bedrock, Vertex or Foundry routing the app leaves set (`CLAUDE_CODE_USE_*`; override to switch), that provider's keys or credential file \u2014 or the start fails; it makes no non-essential Anthropic calls. The third-party connection test and title generation start directly. An unusable launcher, an unreadable host settings file or another Claude Code version refuses or ends the session with an error. Device launcher: macOS and Linux (ignored on Windows); SSH hosts: Linux or macOS, from any device; never WSL or Cowork; both deployment modes.\n\nUnset or `false` (default): the app never reads that setting and starts Claude Code directly, with its own credential. A change applies at the next Claude Code start on third party (a served value once fetched) and at the next app launch on a claude.ai install (profile or local configuration file).\n\nThe key is in the app-behavior group (`disableAutoUpdates`, \u2026): a profile that sets any group key is the only source read for all of them \u2014 set it in the profile, with every group key you need, when the profile sets any of them or the launcher must hold against the device's own user; else in the admin console or configuration server.",
        ),
      },
    }),
    relocateUncUserData: B.field(De.z.boolean().optional(), {
      flatKey: "relocateUncUserData",
      support: {
        enabled: {
          scopes: ["1p"],
          availableInVersion: "1.32352.0",
        },
      },
      appBehaviorOnly: true,
      title: V.msg({
        defaultMessage: "Move app data off network shares",
        id: "hnH9BhZfMz",
      }),
      category: "sandbox",
      group: Ht.GENERAL_RESTRICTIONS_GROUP,
      order: 7.5,
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Store app data in local AppData on Windows devices where Roaming AppData is redirected to a network share, which Cowork tasks cannot run from.",
            id: "3SHQ+DxHRI",
          }),
        ),
        long: B.longDescription(
          "AD Folder Redirection can point %APPDATA% at a network (UNC) share, where Cowork tasks fail to start. The sandbox cannot mount a network path. With this key set to `true`, the app stores its data in a product-specific `<ProductName>-Data` folder under %LOCALAPPDATA% on such devices instead. The key only takes effect when %APPDATA% actually resolves to a UNC path, so it is a no-op on devices with a local profile and does not move a healthy install.\n\nBecause the key is grouped with the other app-behavior keys, deploying it claims that whole group: the auto-update keys (`disableAutoUpdates`, `autoUpdaterEnforcementHours`, \u2026) are then resolved from the managed tier alone, and any local- or remote-tier values for them stop applying. Deploy it together with any auto-update keys you rely on in the same managed (MDM / HKLM `Policies\\Claude`) tier.\n\nThe relocation is a fresh start, not a move: nothing is carried over from the share. The new local folder begins empty, so users sign in again and re-enter their settings, preferences, and MCP server configuration after the move. Nothing is deleted from the share either; removing the key returns the app to the share with its previous contents (including the previous sign-in state) intact, so the rollback path keeps working.",
        ),
      },
    }),
    allowedEgressHosts: B.field(
      B.annotate(
        De.z.preprocess(
          (e) =>
            Array.isArray(e)
              ? e.filter((t) => typeof t === "string" && ps.parseEgressHostEntry(t) !== null)
              : e,
          B.annotate(De.z.array(De.z.string().min(1)), {
            maxItems: 500,
          }).optional(),
        ),
        {
          glob: true,
        },
      ),
      {
        checkDropped: Rj,
        flatKey: "coworkEgressAllowedHosts",
        readers: ["desktop", "code"],
        failClosedValue: [],
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.2581.0",
          },
          executionTarget: "desktop",
        },
        title: V.msg({
          defaultMessage: "Allowed egress hosts",
          id: "5oTa1gWQsk",
        }),
        egressRequirements: (e) =>
          !Array.isArray(e) ? [] : e.includes("*") ? ps.DEPENDENCY_INSTALL_DOMAINS : e,
        egressRequirementsLabel: V.msg({
          defaultMessage: "Tool egress (Cowork, Code and Chat)",
          id: "pcNPpyq4F7",
        }),
        category: "sandbox",
        group: Ht.GENERAL_RESTRICTIONS_GROUP,
        order: 1,
        placeholder: _t.HOST_LIST_PLACEHOLDER,
        description: {
          short: B.shortDescription(
            V.msg({
              defaultMessage:
                "Hostnames the agent\u2019s tools may reach from Cowork, Code and Chat. Also surfaced under Egress Requirements.",
              id: "JNR06VQqQI",
            }),
          ),
          long: B.longDescription(
            `Applies only to **tool calls**, in Cowork, Code and Chat. In Cowork it covers the sandbox's web fetch, shell commands and package installs. In Chat it covers web fetch, and the file-analysis sandbox only if you open its network. In Code it's [translated into Claude Code's network sandbox allowlist](${_t.COWORK_3P_DOCS_BASE}/code#applied-as-managed-policy), and by default a separately deployed Claude Code managed-settings file takes precedence. It does **not** cover Web Search (which runs at your inference provider), inference, or MCP traffic. A list other than \`*\` also bounds where Claude may browse in the built-in browser. When unset, only the inference endpoint is reachable from the sandbox, so the agent's package installs and web fetches fail with a 403.

Entries are exact hostnames (\`api.github.com\`), wildcards (\`*.corp.com\` matches subdomains at any depth, not \`corp.com\` itself), or \`*\` to allow all. IP addresses match only when listed exactly. Web fetch always blocks \`localhost\` and private-network addresses. Shell commands and package installs run in a network sandbox that can reach only the listed hosts plus, outside Chat, your inference provider. With \`*\`, that sandbox is disabled and web fetch still blocks private addresses.

Any entry except bare \`*\` may carry a \`:port\` suffix (\`*.corp.com:8443\`) restricting it to that port. IPv6 literals are not supported. Invalid entries are dropped with a log warning and the rest still work. An unreadable value counts as an empty list. Ports are enforced for the Cowork sandbox's web fetch, shell, and package-install egress; plugin CLIs ignore port-scoped entries for now, and the Code translation treats them as the bare host. Only deploy port-scoped entries once your whole fleet supports them (\`disableAutoUpdates\` pins builds). On an older build, a single one invalidates the session's whole shell and package-install allowlist.

Open listed hosts on your network firewall too.`,
            {
              docsUrl: `${_t.COWORK_3P_DOCS_BASE}/web-tools#web-fetch`,
            },
          ),
        },
      },
    ),
    egressProxyUrl: B.field(
      B.annotate(
        fs
          .urlSchema({
            allowHttp: true,
          })
          .optional(),
        {
          redact: "hostname",
        },
      ),
      {
        flatKey: "egressProxyUrl",
        support: {
          enabled: {
            scopes: ["3p", "1p"],
            availableInVersion: "1.44121.1",
          },
        },
        appBehaviorOnly: true,
        remotePolicy: {
          type: "remote-disabled",
        },
        title: V.msg({
          defaultMessage: "Proxy server URL",
          id: "A/z9Ko1sje",
        }),
        egressRequirements: _t.singleHostEgress,
        egressRequirementsLabel: V.msg({
          defaultMessage: "Proxy server",
          id: "B/iAs+tICD",
        }),
        category: "connection",
        group,
        order: 1,
        placeholder: V.msg({
          defaultMessage: "http://proxy.example.com:8080",
          id: "F8dd6JjEQu",
        }),
        description: {
          short: B.shortDescription(
            V.msg({
              defaultMessage:
                "Send the app\u2019s and the agent\u2019s traffic through this HTTP proxy instead of the operating system\u2019s proxy settings.",
              id: "XX6zi7GmwV",
            }),
          ),
          long: B.longDescription(
            "Pins the app (sign-in, the connection test, model discovery, MCP servers, plugins), the Claude Code engine behind Chat, Cowork, and Code, and on macOS and Windows the Cowork workspace VM (the agent's shell, package-install, `git`, and plugin commands) to one HTTP proxy. Use it when your gateway or the internet is reachable only through a corporate proxy and you cannot rely on the system proxy. It is a reachability setting, not an egress control.\n\nThe value is an `http://` or `https://` URL, usually with a port. SOCKS proxies and embedded credentials (`user:pass@`) are rejected. Give a local forwarding proxy on the device as `http://127.0.0.1:port`; an `https://` loopback address cannot be verified from inside the Cowork workspace VM. Requests to `localhost`, `127.0.0.1`, `[::1]`, and `*.local` names bypass the proxy so local MCP servers keep working; everything else goes through it, and if the proxy is unreachable requests fail rather than connect directly. The engine receives it as `HTTPS_PROXY` and `HTTP_PROXY` with a matching `NO_PROXY`; if Claude Code managed settings on the device set those variables, they win for the engine on the host. Traffic that never uses this proxy: the Cowork workspace VM on Linux, credential and header helper scripts, the update download, the Windows sign-in broker, and pages opened in the system browser.\n\nRead once at launch from device management (MDM) or the local configuration file only; a configuration server cannot deliver it, because the app may need the proxy to reach that server. A profile that sets only this key (or only the other app-behavior keys, such as `disableAutoUpdates`) does not take over a connection users set up in the app, but those keys are read from one source as a group, so put the proxy in the same profile as your update settings. Changes apply at the next app start. When `egressProxyPacUrl` is also set, the PAC file wins and this key is ignored.",
            {
              docsUrl: `${_t.COWORK_3P_DOCS_BASE}/network-proxy`,
            },
          ),
        },
      },
    ),
    egressProxyPacUrl: B.field(
      B.annotate(
        fs
          .urlSchema({
            allowHttp: true,
          })
          .optional(),
        {
          redact: "hostname",
        },
      ),
      {
        flatKey: "egressProxyPacUrl",
        support: {
          enabled: {
            scopes: ["3p", "1p"],
            availableInVersion: "1.44121.1",
          },
        },
        appBehaviorOnly: true,
        remotePolicy: {
          type: "remote-disabled",
        },
        title: V.msg({
          defaultMessage: "Proxy auto-config (PAC) URL",
          id: "0DhMVtlmyQ",
        }),
        egressRequirements: _t.singleHostEgress,
        egressRequirementsLabel: V.msg({
          defaultMessage: "Proxy auto-config file",
          id: "Gqm6SFn9I2",
        }),
        category: "connection",
        group,
        order: 2,
        placeholder: V.msg({
          defaultMessage: "http://wpad.example.com/proxy.pac",
          id: "E7zJ/trntg",
        }),
        description: {
          short: B.shortDescription(
            V.msg({
              defaultMessage:
                "URL of a PAC file that decides the proxy per request. Wins over the proxy server URL when both are set.",
              id: "dRsQ1NgKdo",
            }),
          ),
          long: B.longDescription(
            "At launch the app downloads the PAC script and asks it which proxy to use for each request, as a browser would, instead of following the operating system's proxy settings. Same value rules, coverage, exclusions, and delivery as `egressProxyUrl`, except that bypassing is the script's decision: `localhost`, `127.0.0.1`, and `[::1]` still never use a proxy, but `*.local` names and everything else follow whatever it returns. If the PAC file cannot be downloaded, the app connects directly rather than failing.\n\nOn macOS and Windows the Cowork workspace VM is handed a copy of the script when it starts and evaluates it for each request itself; there `myIpAddress()` returns the VM's internal address rather than the device's, so a script that chooses by client subnet gives the VM its off-network answer (if that download fails, the VM connects directly). The Claude Code engine behind Chat, Cowork, and Code cannot evaluate a PAC file, so the app hands it one proxy (whichever the script returns for your inference endpoint) plus a bypass for loopback and `*.local` names. If the script answers `DIRECT` or only `SOCKS` for that endpoint, the engine uses no proxy at all, so have it return an HTTP `PROXY host:port` entry there; if the engine needs different rules, set `HTTPS_PROXY` and `NO_PROXY` in Claude Code managed settings, which win for the engine on the host.",
            {
              docsUrl: `${_t.COWORK_3P_DOCS_BASE}/network-proxy`,
            },
          ),
        },
      },
    ),
    edrExtension: B.field(fs.configuredHostPath.optional(), {
      flatKey: "coworkEDRIntegration",
      support: {
        enabled: {
          scopes: ["3p", "1p"],
          availableInVersion: "2.16120.0",
        },
        visibility: "public-undocumented",
        executionTarget: "desktop",
      },
      remotePolicy: {
        type: "remote-disabled",
      },
      appBehaviorOnly: true,
      title: V.msg({
        defaultMessage: "EDR Integration package path",
        id: "IBdsVeIXWe",
      }),
      category: "sandbox",
      predicates: {
        show: () => false,
      },
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Path on the user\u2019s computer to the signed package an endpoint security (EDR) vendor supplies for the Cowork workspace VM. Read from device management only.",
            id: "rhY1Zx/tks",
          }),
        ),
        long: B.longDescription(
          "The path on the user's computer of the signed package your endpoint security (EDR) vendor supplies for the Cowork workspace VM. Put its signature file beside the file this path points to, named as that file plus `.sig`. Keep both, and every folder above them, where ordinary users cannot write. Each time the workspace VM starts, it checks that signature and, only if it is from the vendor named in `coworkEDRIntegrationVendor`, which you must also set, runs the package's `install.sh` as root to install or update the sensor. The signature covers only the package file, `install.sh` included; what the sensor downloads afterwards, including its own updates, is the vendor's and is not checked by Claude. macOS only.\n\nClaude reads this key only from configuration that only an administrator can install: an MDM profile on macOS, or the root-owned file under `/etc/claude-desktop` on Linux. It ignores the key in the in-app Setup panel, in any file the user can edit, and from a configuration server. It is one of the app-behavior keys (`disableAutoUpdates`, `relaunchEnforcementHours`, `egressProxyUrl`, \u2026), which Claude takes as a set: once your profile sets any of them, values for the others from a local file or a configuration server stop applying, so put every one you use in the same profile.\n\nUnset (default): no vendor package is installed in the workspace VM. Removing this key only stops later runs of the package. It does not remove or stop a sensor already installed, which stays on the workspace VM's disk until that VM is deleted or replaced.\n\nNetwork access: `install.sh` and whatever it installs run as root in the workspace VM and are not part of any session, so the network egress allowlist, the proxy keys (`egressProxyUrl`, `egressProxyPacUrl`) and the device's proxy settings do not apply to them. Claude does not otherwise limit which internet hosts they can reach; their connections are ordinary traffic from the device, subject to your own network-layer controls.",
        ),
      },
    }),
    edrExtensionVendor: B.field(fs.vendorId.optional(), {
      flatKey: "coworkEDRIntegrationVendor",
      support: {
        enabled: {
          scopes: ["3p", "1p"],
          availableInVersion: "2.16120.0",
        },
        visibility: "public-undocumented",
        executionTarget: "desktop",
      },
      remotePolicy: {
        type: "remote-disabled",
      },
      appBehaviorOnly: true,
      title: V.msg({
        defaultMessage: "EDR Integration vendor ID",
        id: "/BHf6muvcS",
      }),
      category: "sandbox",
      predicates: {
        show: () => false,
      },
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "The ID of the vendor that signed the package coworkEDRIntegration points to. Required with that key, or nothing is installed. Read from device management only.",
            id: "HBPYbmIcrk",
          }),
        ),
        long: B.longDescription(
          "The ID of the endpoint security (EDR) vendor that signed the package `coworkEDRIntegration` points to: 1 to 32 characters from a to z, 0 to 9 and the hyphen, not starting with a hyphen, for example `example-vendor`. It must be an ID this release of Claude accepts; ask your vendor which ID to use. Required whenever `coworkEDRIntegration` is set. The workspace VM runs the package only if this vendor signed it; a package signed by anyone else is refused, even another vendor this release of Claude accepts. The signature the VM checks is the `.sig` file described under `coworkEDRIntegration`. macOS only.\n\nClaude reads this key only from the configuration described under `coworkEDRIntegration`, and ignores a value from anywhere else. It is one of the app-behavior keys (see `coworkEDRIntegration`), so put it in the same profile as every other app-behavior key you use.\n\nUnset (default): if `coworkEDRIntegration` is set, nothing is installed, and each time the workspace VM starts `cowork_vm_node.log` in the app's logs folder records the reason, `vendor_not_named`. It records `config_invalid` for a value not of the form above and `vendor_unknown` for an ID this release of Claude does not accept; neither installs anything. To turn the feature off without these entries, remove `coworkEDRIntegration`, not this key. Removing either key only stops later runs: a sensor already installed stays on the workspace VM's disk until that VM is deleted or replaced.",
        ),
      },
    }),
    vmIpv6Enabled: B.field(De.z.boolean().optional(), {
      flatKey: "coworkVmIpv6Enabled",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.52386.0",
        },
        executionTarget: "desktop",
      },
      title: V.msg({
        defaultMessage: "Enable IPv6 in the workspace VM",
        id: "JHTnwZf+m3",
      }),
      default: {
        displayOnly: false,
      },
      category: "connection",
      group: group_2,
      order: 1,
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Give the Cowork workspace VM an IPv6 address and route so the agent\u2019s tools can reach IPv6-only hosts through the device. macOS and Windows; off by default.",
            id: "v9YS8eHay0",
          }),
        ),
        long: B.longDescription(
          "When set to `true`, the Cowork workspace VM on macOS and Windows gets a static IPv6 address (a unique local `fd\u2026` address) and an IPv6 default route on its virtual network next to its IPv4 address, and the VM's gateway forwards that traffic over the device's own IPv6 connectivity, as it already does for IPv4. Use it when the tools the agent runs in the VM (shell commands, package installs, `git`, and plugin commands) must reach IPv6-only destinations. The VM's resolver then also returns IPv6 (AAAA) answers. A connection the VM makes over IPv6 succeeds only where the device's own IPv6 does; on a device without working IPv6, destinations that have both keep working over IPv4 and IPv6-only destinations stay unreachable. Because the VM's address is unique-local, most tools in it keep preferring IPv4 for destinations that have both, so IPv6 mostly carries traffic to IPv6-only destinations.\n\nThis is a reachability setting, not an egress control: `coworkEgressAllowedHosts` keeps deciding which hostnames the agent's tools may reach, by name, over either protocol, and IPv6 literals are still not accepted there. Hosts your policies allow must also be reachable, and filtered the way you intend, over IPv6 on your network.\n\nUnset (default): the VM is IPv4-only and its resolver returns no IPv6 answers. A change takes effect the next time the workspace VM starts, typically at the next app launch. Does not apply to the Cowork workspace VM on Linux or to Code sessions, which use the device's own network stack.",
        ),
      },
    }),
    secureVmEnabled: B.field(De.z.boolean().optional(), {
      flatKey: "secureVmFeaturesEnabled",
      support: {
        enabled: {
          scopes: ["1p"],
          availableInVersion: "1.2581.0",
        },
        executionTarget: "desktop",
      },
      failClosedValue: false,
      title: V.msg({
        defaultMessage: "Secure VM features",
        id: "+AQagzW8cG",
      }),
      category: "sandbox",
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage: "Enable additional VM-level isolation for the Cowork sandbox.",
            id: "SecureVmFeaturesHint",
          }),
          {
            docsOnly: true,
          },
        ),
      },
    }),
    hardwareBuddyEnabled: B.field(De.z.boolean().optional(), {
      flatKey: "hardwareBuddyEnabled",
      support: {
        enabled: {
          scopes: ["1p"],
          availableInVersion: "1.18286.0",
        },
        executionTarget: "desktop",
      },
      title: V.msg({
        defaultMessage: "Allow Hardware Buddy devices",
        id: "HardwareBuddyEnabled",
      }),
      default: true,
      failClosedValue: false,
      category: "connectors",
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage: "Allow pairing Hardware Buddy Bluetooth devices in Cowork.",
            id: "HardwareBuddyHint",
          }),
          {
            docsOnly: true,
          },
        ),
      },
    }),
    quickWriteEnabled: B.field(De.z.boolean().optional(), {
      flatKey: "quickWriteEnabled",
      support: {
        enabled: {
          scopes: ["1p"],
          availableInVersion: "2.26454.0",
        },
        visibility: "public-undocumented",
      },
      appBehaviorOnly: true,
      title: V.msg({
        defaultMessage: "Allow Quick Write",
        id: "ae+sNvqJZe",
      }),
      category: "sandbox",
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage: "Off on a managed computer until set to true.",
            id: "ui6EQvL97l",
          }),
        ),
      },
    }),
    requireFullVmSandbox: B.field(De.z.boolean().optional(), {
      flatKey: "requireCoworkFullVmSandbox",
      support: {
        enabled: {
          scopes: ["1p"],
          availableInVersion: "1.2581.0",
        },
        deprecated: {
          scopes: ["3p"],
          availableInVersion: "1.2581.0",
        },
        executionTarget: "desktop",
      },
      title: V.msg({
        defaultMessage: "Require full VM sandbox",
        id: "wQRUBw9rk7",
      }),
      default: false,
      failClosedValue: true,
      category: "sandbox",
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Runs tools inside an isolated VM instead of the host. Stronger isolation; slower file access and no host-process tools.",
            id: "LVgbWJo83E",
          }),
        ),
      },
      predicates: {
        warn: (e) =>
          e === true
            ? V.msg({
                defaultMessage:
                  "The default host-native mode starts faster and works behind restricted networks. Shell commands run inside the VM; file tools run on the host with path-based access control. Enable this only if your security review requires the agent loop itself to run in the VM.",
                id: "05sWumUU1+",
              })
            : null,
      },
    }),
    endUserAttribution: B.field(De.z.boolean().optional(), {
      flatKey: "endUserAttribution",
      readers: ["desktop", "code"],
      legacyFlatKey: {
        name: "enduserAttribution",
        effect:
          "the key will read as false (its fail-closed value): end-user attribution will stay off \u2014 no identity shown, no enduser.id emitted \u2014 whatever the old name said",
        ...ya.BATCH_2026_09,
      },
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.25927.0",
        },
      },
      failClosedValue: false,
      remotePolicy: {
        applyUnverified: false,
      },
      default: {
        displayOnly: true,
      },
      title: vj,
      category: "appearance",
      group: vj,
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Show the signed-in user\u2019s identity-provider identity in the sidebar and account menu, and emit it as the OpenTelemetry enduser.id resource attribute.",
            id: "enduserAttrHnt",
          }),
        ),
        long: B.longDescription(
          "When on (default), the app resolves the signed-in user's identity from the configured credential source (the identity provider claim, or the OS login name when no claim is available) and shows it in the sidebar footer, the account menu, and the Code session greeting. If an OpenTelemetry collector is configured, the same identity is also emitted as the `enduser.id` resource attribute on every span, metric, and log sent to your collector \u2014 unless you have set a static `enduser.id` under OpenTelemetry resource attributes, in which case your static value is kept and the runtime identity is not emitted. When off, no identity is shown in the app and no runtime `enduser.id` is emitted; a static `enduser.id` under OpenTelemetry resource attributes still passes through unchanged. This setting does not gate the `process.owner` resource attribute (the OS login name), which is standard OpenTelemetry process metadata and is always emitted \u2014 set a static `process.owner` under OpenTelemetry resource attributes to override it. Applies to both Cowork tasks and Code sessions.",
        ),
      },
    }),
    userContentRendererUrl: B.field(
      fs
        .urlSchema({
          rejectLoopback: true,
        })
        .optional(),
      {
        flatKey: "userContentRendererUrl",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.24012.0",
          },
        },
        remotePolicy: {
          rejectLoopback: true,
        },
        title: V.msg({
          defaultMessage: "Artifact preview iframe origin",
          id: "ucrUrlTitle",
        }),
        category: "connection",
        egressRequirements: _t.singleHostEgress,
        egressRequirementsLabel: V.msg({
          defaultMessage: "Artifact preview iframe",
          id: "ucrUrlEgrs",
        }),
        description: {
          short: B.shortDescription(
            V.msg({
              defaultMessage:
                "HTTPS origin of the user-content-renderer deployment used for artifact and file previews. Defaults to the commercial host when unset.",
              id: "ucrUrlHint",
            }),
          ),
        },
      },
    ),
    organizationInstructions: B.field(De.z.string().trim().min(1).max(3000).optional(), {
      flatKey: "organizationInstructions",
      readers: ["desktop", "code"],
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.37937.0",
        },
        executionTarget: "desktop",
      },
      title: V.msg({
        defaultMessage: "Organization instructions",
        id: "t2ElSZR3Hy",
      }),
      category: "sandbox",
      group: V.msg({
        defaultMessage: "Organization instructions",
        id: "t2ElSZR3Hy",
      }),
      multiline: true,
      placeholder: V.msg({
        defaultMessage:
          "Always answer in British English. Never include customer account numbers in a response.",
        id: "tevwj/1wDb",
      }),
      description: {
        short: B.shortDescription(
          V.msg({
            defaultMessage:
              "Appended to Claude\u2019s system prompt in Chat, Cowork, and Code. Guidance the model follows, not an enforced control. Up to 3,000 characters.",
            id: "1h3TR2uKST",
          }),
        ),
        long: B.longDescription(`Free-text instructions from your organization that Claude Desktop appends, in a clearly delimited block, after its own system prompt in **Chat**, **Cowork**, and **Code** (every chat, task, and Code session, including the sub-agents they spawn): for example house style, data-handling rules, or topics to decline. The model is told these instructions come from the organization's administrator and take priority over a user's personal preferences.

This is guidance the model follows, not an enforced control: like any system-prompt text it steers the model's behavior and is usually honored, but it does not guarantee an outcome and is not a substitute for the restriction keys (tool policy, egress allowlist, folder allowlist). The app's own system prompt is never replaced or shortened by this key; in Code sessions it is added after Claude Code's own prompt and any \`CLAUDE.md\` instructions still apply.

Read from the app's loaded configuration when a session starts; a changed value generally takes effect for sessions started after the next app launch. Leading and trailing whitespace is trimmed; an empty string is treated as unset. Maximum 3,000 characters; a longer value is rejected (the key is ignored with a configuration error) rather than truncated. Line breaks are preserved when the value is delivered as JSON, a bootstrap response, a \`.mobileconfig\` profile, or a \`.reg\` file; the Group Policy (ADMX) and Intune text box for this setting is single-line.`),
      },
    }),
  });
  var iw = {
    Bash: "mcp__workspace__bash",
    WebFetch: "mcp__workspace__web_fetch",
  };
  var que = {
    Bash: [iw.Bash, "PowerShell"],
    WebFetch: [iw.WebFetch],
  };
  function Dj(e) {
    for (let [key, value] of Object.entries(que)) if (e.has(key)) for (let o of value) e.add(o);
    return [...e];
  }
  function aw(e) {
    var t;
    var n;
    var o;
    let r = new Set(
      (n = (t = e.workspace) === null || t === undefined ? undefined : t.disabledBuiltinTools) !== null &&
        n !== undefined
        ? n
        : [],
    );
    if (Dm.isBedrockFamily((o = e.inference) === null || o === undefined ? undefined : o.provider))
      r.add("WebSearch");
    return Dj(r);
  }
  function Gue(e) {
    return Uc.surfacesOf(e).chat;
  }
  function Wue(e) {
    return Uc.surfacesOf(e).cowork;
  }
  function Yue(e) {
    var t;
    return ((t = e.workspace) === null || t === undefined ? undefined : t.skillCreationEnabled) !== false;
  }
  function Jue(e) {
    var t;
    let autoModeEnabled = (t = e.workspace) === null || t === undefined ? undefined : t.autoModeEnabled;
    return {
      code: autoModeEnabled !== false,
      cowork: autoModeEnabled === true,
    };
  }
  function Xue(e) {
    let t = Uc.surfacesOf(e);
    return t.chat && t.fileAnalysis && !aw(e).includes(iw.Bash);
  }
  function Mj(e) {
    var t;
    var n;
    let o = new Set(aw(e));
    let r = new Set();
    for (let [key, value] of Object.entries(
      (n = (t = e.workspace) === null || t === undefined ? undefined : t.builtinToolPolicy) !== null &&
        n !== undefined
        ? n
        : {},
    ))
      if (value !== "allow" && zc(key) !== undefined) r.add(key);
    return Dj(r).filter((s) => !o.has(s));
  }
  function jj(tool) {
    var t;
    return (t = Lc[tool]) !== null && t !== undefined ? t : [tool];
  }
  function Que(e) {
    let t = new Set();
    for (let n of Mj(e)) {
      let o = zc(n);
      if ((o === null || o === undefined ? undefined : o.content) === undefined) t.add(n);
      else for (let r of jj(o.tool)) t.add(r);
    }
    return [...t];
  }
});
//@ chunk-1ny7cxrt.js:1067787-1080211 cjs-unmatched+string-clue
var bd = x(function (Bj) {
  Object.defineProperty(Bj, "__esModule", {
    value: true,
  });
  Bj.AuthenticationConfig = Bj.ORG_UUID_VALUE = undefined;
  Bj.forceLoginOrgUUIDList = Fj;
  var On = require_v3();
  var Uj = Xr();
  var at = yt();
  var dt = mn();
  var Mm = Ar();
  var _a = zi();
  var lw = On.z.guid();
  function zj(e) {
    let trimmed = e.trim();
    if (trimmed === "") return [];
    let n;
    try {
      n = trimmed.startsWith("[") ? JSON.parse(trimmed) : [trimmed];
    } catch (error) {
      return;
    }
    return Array.isArray(n) && n.every((o) => typeof o === "string")
      ? n.map((o) => o.trim().toLowerCase())
      : undefined;
  }
  function Fj(e) {
    var t;
    let n = (t = zj(e)) === null || t === undefined ? undefined : t.filter((o) => lw.safeParse(o).success);
    return n !== undefined && n.length > 0 ? n : undefined;
  }
  var bde = On.z
    .string()
    .refine((e) => e.trim() === "" || Fj(e) !== undefined, {
      message: 'expected a UUID, or a JSON array of UUIDs such as ["<uuid>","<uuid>"]',
    })
    .optional();
  function vde(e, t) {
    let n = typeof e === "string" ? zj(e) : [];
    for (let o of n !== null && n !== undefined ? n : [])
      if (!lw.safeParse(o).success)
        t(`forceLoginOrgUUID entry ${JSON.stringify(o)} is not a UUID and admits no organization`);
  }
  Bj.ORG_UUID_VALUE = On.z
    .string()
    .trim()
    .toLowerCase()
    .refine((e) => lw.safeParse(e).success, {
      message: "expected an organization UUID",
    });
  var wde = Bj.ORG_UUID_VALUE.optional();
  Bj.AuthenticationConfig = On.z.object({
    disableClaudeAiSignIn: at.field(On.z.boolean().optional(), {
      flatKey: "disableDeploymentModeChooser",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.3834.0",
        },
      },
      remotePolicy: {
        hybrid: {
          scope: "excluded",
        },
        applyUnverified: true,
      },
      failClosedValue: true,
      title: dt.msg({
        defaultMessage: "Disable Claude.ai sign-in",
        id: "DHdnIxD7G9",
      }),
      default: false,
      category: "sandbox",
      group: _a.GENERAL_RESTRICTIONS_GROUP,
      order: 8,
      description: {
        short: at.shortDescription(
          dt.msg({
            defaultMessage:
              "Users see only this provider at the login screen. The option to sign in to Claude.ai is hidden.",
            id: "hesC0E8eFo",
          }),
        ),
      },
    }),
    forceLoginOrgUUID: at.field(bde, {
      flatKey: "forceLoginOrgUUID",
      support: {
        enabled: {
          scopes: ["1p"],
          availableInVersion: "1.2581.0",
        },
      },
      failClosedValue: "[]",
      checkDropped: vde,
      title: dt.msg({
        defaultMessage: "Required organization",
        id: "b6/n7wQhfO",
      }),
      category: "connection",
      description: {
        short: at.shortDescription(
          dt.msg({
            defaultMessage: "Restricts login to specific org UUID(s). Single UUID string or JSON array.",
            id: "Rio+Mmk17s",
          }),
        ),
      },
      placeholder: dt.msg({
        defaultMessage: "00000000-0000-0000-0000-000000000000",
        id: "oT3AdLMVZK",
      }),
    }),
    disableMultiAccount: at.field(On.z.boolean().optional(), {
      flatKey: "disableMultiAccount",
      support: {
        enabled: {
          scopes: ["1p"],
          availableInVersion: "1.46388.1",
        },
        visibility: "public-undocumented",
      },
      failClosedValue: true,
      title: dt.msg({
        defaultMessage: "Single account only",
        id: "kgqT50kiPY",
      }),
      default: false,
      category: "connection",
      description: {
        short: at.shortDescription(
          dt.msg({
            defaultMessage: "Keep Claude Desktop signed in to one account at a time.",
            id: "Q6M73CMjXz",
          }),
        ),
      },
    }),
    ssoOrgDomain: at.field(On.z.string().optional(), {
      flatKey: "loginSsoOrgDomain",
      support: {
        enabled: {
          scopes: ["1p"],
          availableInVersion: "1.10628.0",
        },
      },
      title: dt.msg({
        defaultMessage: "SSO login domain",
        id: "RyA8yzgAlp",
      }),
      category: "connection",
      description: {
        short: at.shortDescription(
          dt.msg({
            defaultMessage:
              "Surfaces one-click SSO for this email domain on the login screen, without restricting login.",
            id: "1fy7qkmmCd",
          }),
        ),
      },
      placeholder: dt.msg({
        defaultMessage: "example.com",
        id: "YKl6sxhgrC",
      }),
    }),
    importThirdPartyHistoryIntoOrgUUID: at.field(wde, {
      flatKey: "importThirdPartyHistoryIntoOrgUUID",
      support: {
        enabled: {
          scopes: ["1p"],
          availableInVersion: "2.2553.0",
        },
        visibility: "public-undocumented",
      },
      title: dt.msg({
        defaultMessage: "Import earlier third-party sessions into this organization",
        id: "x7AG7nw4s/",
      }),
      category: "connection",
      description: {
        short: at.shortDescription(
          dt.msg({
            defaultMessage:
              "After sign-in to this organization, copies this computer\u2019s earlier third-party sessions into the user\u2019s local first-party profile, once per account and org.",
            id: "VVXfXFMXOB",
          }),
        ),
        long: at.longDescription(
          "Set through your device management (MDM or machine policy) to the UUID of the organization your users sign in to; a value in a user's own configuration file is ignored. After a user signs in to that organization in Claude Desktop on a computer where an earlier third-party configuration of Claude Desktop left chats, Cowork tasks or Code sessions, the app copies them into the user's first-party profile on the same computer; once the user resumes a copied session it behaves like any other first-party session. The copy also uploads the skills the user saved in that third-party configuration (under this organization or none) to their own skills in the organization, only where the organization lets members create skills and scans uploaded skills; otherwise nothing is uploaded. A skill whose SKILL.md declares hooks or tool permissions, or whose folder holds plugin files, is never uploaded. Where that configuration has local MCP servers, the app shows one notification offering to review them in Settings \u203A Import; no server is added without the user's confirmation there. If Anthropic has enabled memory import, that configuration's Cowork memory notes come too, unless the user had paused memory: used at once without review, never overwriting a note, synced like other Cowork memory. Chats, tasks and sessions themselves are not uploaded. The copy runs in the background, once per account and organization, and leaves the originals in place. Without this key, the organization's own setting (Admin settings in claude.ai) decides, and a deployed key takes precedence over it. A value that is not a UUID is reported as a configuration error and copies nothing; one that names a different organization than the one signed in copies nothing and is noted in the app's log. Like other first-party keys, deploying it puts the app's configuration under management, so a third-party connection a user set up in the app's own settings no longer applies. Anthropic can switch the copy off remotely.",
        ),
      },
      placeholder: dt.msg({
        defaultMessage: "00000000-0000-0000-0000-000000000000",
        id: "oT3AdLMVZK",
      }),
    }),
    disableDeepLinks: at.field(On.z.boolean().optional(), {
      flatKey: "disableDeepLinkRegistration",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.6889.0",
        },
      },
      failClosedValue: true,
      title: dt.msg({
        defaultMessage: "Disable claude:// deep-link handling",
        id: "CCUxBOb3va",
      }),
      default: false,
      category: "sandbox",
      group: _a.GENERAL_RESTRICTIONS_GROUP,
      order: 9,
      description: {
        short: at.shortDescription(
          dt.msg({
            defaultMessage:
              "Stop external apps and websites from opening Claude Desktop via claude:// links.",
            id: "0I38l/TM7C",
          }),
        ),
      },
    }),
    disableConnectorSignInInApp: at.field(On.z.boolean().optional(), {
      flatKey: "disableConnectorSignInInApp",
      support: {
        enabled: {
          scopes: ["1p"],
          availableInVersion: "2.26454.0",
        },
        visibility: "public-undocumented",
      },
      failClosedValue: true,
      appBehaviorOnly: true,
      title: dt.msg({
        defaultMessage: "Keep connector sign-in in the browser",
        id: "QjCp+5pd3a",
      }),
      default: false,
      category: "connectors",
      description: {
        short: at.shortDescription(
          dt.msg({
            defaultMessage:
              "Finish claude.ai connector (MCP) sign-ins in the browser rather than letting the app finish them from a claude:// link.",
            id: "hPVthk75/t",
          }),
        ),
        long: at.longDescription(
          "When true, a claude.ai connector's (remote MCP server's) OAuth sign-in started from Claude Desktop runs and completes in the system browser, and the claude:// link that then reopens the app only reports the outcome. When false (the default), on accounts where finishing in the app is available (a server-side rollout, not a setting in this configuration), the browser opens only the connector's own sign-in page and the app finishes the sign-in itself. Other claude:// links (chats, projects, Claude Code sessions) are unaffected; in third-party deployments `disableDeepLinkRegistration` turns those off. Set it through device management (MDM or machine policy); it applies from the app's next launch, and a value that cannot be read as true or false counts as true. An app-behavior key like `disableAutoUpdates`: a profile that sets any of them becomes the only source for all of them, so deploy them together; a profile that sets only such keys leaves the rest of the user's configuration in effect.",
        ),
      },
    }),
    microsoftAuthBroker: at.field(On.z.enum(["auto", "disabled", "required"]).optional(), {
      flatKey: "microsoftAuthBroker",
      support: {
        enabled: [
          {
            scopes: ["3p"],
            availableInVersion: "1.19367.0",
          },
          {
            scopes: ["1p"],
            availableInVersion: "1.24012.11",
          },
        ],
        values: {
          required: {
            availableInVersion: "1.49585.0",
          },
        },
      },
      failClosedValue: "disabled",
      remotePolicy: {
        applyUnverified: true,
      },
      title: dt.msg({
        defaultMessage: "Microsoft 365 native sign-in broker",
        id: "1r8dFJPLbj",
      }),
      default: "auto",
      category: "connectors",
      group: _a.MCP_SERVERS_GROUP,
      order: 2,
      predicates: {
        show: (e) => {
          var t;
          var n;
          return (
            (n = (t = e.mcp) === null || t === undefined ? undefined : t.managedServers) !== null &&
            n !== undefined
              ? n
              : []
          ).some((o) => Mm.isBuiltinMcpEntry(o) && o.server === "microsoft365");
        },
      },
      description: {
        short: at.shortDescription(
          dt.msg({
            defaultMessage:
              "\u201Cdisabled\u201D forces browser-based Microsoft 365 sign-in; \u201Crequired\u201D fails sign-in when the OS broker is unavailable, so the refresh token stays broker-held.",
            id: "MicrosoftAuthBrokerHint",
          }),
        ),
        long: at.longDescription(
          "`auto` (default): use the OS sign-in broker where available (WAM on Windows, the Company Portal SSO extension on macOS) and fall back to a browser sign-in otherwise. `disabled`: always use the browser sign-in. `required`: fail sign-in when the broker is unavailable rather than falling back to the browser, so the refresh token stays broker-held. Linux has no broker, so `required` is not supported there. Desktop builds older than the version that introduced `required` treat it as `disabled` (browser-only sign-in) \u2014 the opposite posture \u2014 so gate rollout on client version.",
        ),
      },
    }),
    microsoftAuthDefaultAccount: at.field(On.z.enum(["enabled", "disabled"]).optional(), {
      flatKey: "microsoftAuthDefaultAccount",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.26454.0",
        },
      },
      failClosedValue: "disabled",
      title: dt.msg({
        defaultMessage: "Microsoft 365 sign-in with the Windows account",
        id: "q3TlGsQ/DF",
      }),
      default: "disabled",
      category: "connectors",
      group: _a.MCP_SERVERS_GROUP,
      order: 3,
      predicates: {
        show: (e) => {
          var t;
          var n;
          return (
            (n = (t = e.mcp) === null || t === undefined ? undefined : t.managedServers) !== null &&
            n !== undefined
              ? n
              : []
          ).some((o) => Mm.isBuiltinMcpEntry(o) && o.server === "microsoft365");
        },
      },
      description: {
        short: at.shortDescription(
          dt.msg({
            defaultMessage:
              "\u201Cenabled\u201D: when a user clicks Connect on Windows, Microsoft 365 signs in with the work account already signed in to Windows, without the account picker.",
            id: "ng6kkd2GLe",
          }),
        ),
        long: at.longDescription(
          "`disabled` (default): Connect shows the account picker when no account is connected. `enabled`: on Windows, when `microsoftAuthBroker` is not `disabled`, Connect first signs in silently with the account Windows already uses. The `tenantId` on the `microsoft365` entry in managed MCP servers must be a tenant GUID. With `common`, `organizations` or `consumers`, users always get the picker. Users also get the picker for accounts from another tenant, guest accounts and personal Microsoft accounts, when the silent sign-in fails, and when the computer cannot store credentials securely. A user who already signed in to Microsoft 365 through the browser keeps that account. After a user disconnects Microsoft 365, or a different person signs in to Claude on this computer, Connect always shows the picker for that connector on this computer, including for a disconnect that happened before this setting was turned on. Turning this setting off stops new silent sign-ins and signs nobody out: users already connected keep their account until they disconnect. macOS and Linux are not affected. Third-party deployments only: first-party installs ignore this setting.",
        ),
      },
    }),
    allowOptionalClientAuth: at.field(On.z.boolean().optional(), {
      flatKey: "allowOptionalClientAuth",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.17377.1",
        },
        visibility: "public-undocumented",
      },
      deprecations: [
        {
          path: "allowOptionalClientAuth",
          use: "Claude Desktop 1.49585.0 or later on every device, then remove the key",
          effect:
            "the value will be reported as an unreadable setting and the managed configuration will count as degraded until the key is removed; 1.46388 is the last release that reads it (later releases present TLS client certificates natively through Electron 44)",
          ...Uj.BATCH_2026_11,
        },
      ],
      description: {
        short: at.shortDescription(
          dt.msg({
            defaultMessage: "Allow optional client-certificate fallback for mTLS endpoints.",
            id: "AllowOptionalClientAuthHint",
          }),
          {
            docsOnly: true,
          },
        ),
      },
      title: dt.msg({
        defaultMessage: "Allow optional client-certificate fallback",
        id: "AllowOptionalClientAuthTitle",
      }),
      category: "connection",
    }),
  });
});
//@ chunk-1ny7cxrt.js:1080211-1083595 cjs-unmatched+string-clue
var cw = x(function (Vj) {
  Object.defineProperty(Vj, "__esModule", {
    value: true,
  });
  Vj.AppearanceConfig = undefined;
  var ba = require_v3();
  var Mn = yt();
  var Dr = mn();
  var group = Dr.msg({
    defaultMessage: "Deployment identity",
    id: "dplIdntGrp",
  });
  var group_2 = Dr.msg({
    defaultMessage: "Configuration notices",
    id: "qg0hZsga3q",
  });
  Vj.AppearanceConfig = ba.z.object({
    deploymentDisplayName: Mn.field(
      Mn.annotate(ba.z.string().trim().min(1).max(60).optional(), {
        redact: "keep",
      }),
      {
        flatKey: "deploymentDisplayName",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.24012.0",
          },
        },
        remotePolicy: {
          hybrid: {
            derived: true,
          },
          hotApplied: true,
        },
        title: Dr.msg({
          defaultMessage: "Deployment display name",
          id: "dplDsNmTtl",
        }),
        category: "appearance",
        group,
        description: {
          short: Mn.shortDescription(
            Dr.msg({
              defaultMessage:
                "Overrides the provider label shown in the sidebar footer, user-menu header, and connection-error banner.",
              id: "dplDsNmHnt",
            }),
          ),
          long: Mn.longDescription(
            'Set this to the name users should see for this deployment (for example, "Claude for Government"). When unset, the desktop shows the default provider label. Maximum 60 characters.',
          ),
        },
      },
    ),
    deploymentDisplaySubtitle: Mn.field(
      Mn.annotate(ba.z.string().trim().min(1).max(60).optional(), {
        redact: "keep",
      }),
      {
        flatKey: "deploymentDisplaySubtitle",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.24012.0",
          },
        },
        remotePolicy: {
          hybrid: {
            scope: "excluded",
          },
          hotApplied: true,
        },
        title: Dr.msg({
          defaultMessage: "Deployment display subtitle",
          id: "dplDsSbTtl",
        }),
        category: "appearance",
        group,
        description: {
          short: Mn.shortDescription(
            Dr.msg({
              defaultMessage:
                "Optional detail shown after the deployment display name in the account-menu header.",
              id: "dplDsSbHn2",
            }),
          ),
          long: Mn.longDescription(
            'Optional detail shown after the deployment display name in the account-menu header (for example, "Claude for Veterans Affairs \xB7 Claude for Government"). Shown only when the display name is also set. Maximum 60 characters.',
          ),
        },
        predicates: {
          show: (e) => {
            var t;
            var n;
            return (
              ((n = (t = e.appearance) === null || t === undefined ? undefined : t.deploymentDisplayName) !==
                null && n !== undefined
                ? n
                : ""
              ).trim().length > 0
            );
          },
        },
      },
    ),
    disableConfigDeprecationWarnings: Mn.field(ba.z.boolean().optional(), {
      flatKey: "disableConfigDeprecationWarnings",
      remotePolicy: {
        hotApplied: true,
      },
      support: {
        enabled: {
          scopes: ["3p", "1p"],
          availableInVersion: "1.40609.0",
        },
      },
      title: Dr.msg({
        defaultMessage: "Hide configuration deprecation warnings",
        id: "8SscF6CJAT",
      }),
      default: {
        displayOnly: false,
      },
      category: "appearance",
      group: group_2,
      description: {
        short: Mn.shortDescription(
          Dr.msg({
            defaultMessage:
              "Don\u2019t show users the in-app warning that this configuration uses a deprecated field. The final reminder in the 24 hours before the cut-off still appears.",
            id: "84H2bDOPZR",
          }),
        ),
        long: Mn.longDescription(
          "When the organization's configuration uses a field that is deprecated \u2014 a renamed key, or a legacy value or entry form \u2014 the app shows every user a dismissable warning naming the field, what to use instead, and the date support ends (each field's cut-off is listed in the configuration changelog and takes effect at 12:00 PM Pacific Time on that date). The warning shows from the field's announced warning date until dismissed, and once more in the 24 hours before the cut-off. Set this to `true` to suppress the first showing for your users while you migrate; the final 24-hour reminder is always shown, and the deprecation stays listed in the diagnostic report (Help \u2192 Troubleshooting) and the hosted configuration editor regardless.",
        ),
      },
    }),
  });
});
//@ chunk-1ny7cxrt.js:1083595-1085104 cjs-unmatched+string-clue
var jm = x(function (Yj) {
  Object.defineProperty(Yj, "__esModule", {
    value: true,
  });
  Yj.MAX_BANNER_TEXT_CHARS = Yj.BANNER_DEFAULT_TEXT_COLOR = Yj.BANNER_DEFAULT_BACKGROUND_COLOR = undefined;
  Yj.isValidBannerHexColor = uw;
  Yj.isValidBannerLinkUrl = Wj;
  Yj.resolveBannerConfig = Ede;
  Yj.toRenderableBannerConfig = Pde;
  var Gj = $n();
  Yj.BANNER_DEFAULT_BACKGROUND_COLOR = "#F5F5F5";
  Yj.BANNER_DEFAULT_TEXT_COLOR = "#000000";
  Yj.MAX_BANNER_TEXT_CHARS = 200;
  var kde = /^#[0-9A-Fa-f]{6}$/;
  function uw(e) {
    return typeof e === "string" && kde.test(e);
  }
  function Wj(linkUrl) {
    if (typeof linkUrl !== "string") return false;
    if (!linkUrl.startsWith("https://")) return false;
    if (Gj.carriesCredential(linkUrl)) return false;
    try {
      new URL(linkUrl);
      return true;
    } catch (error) {
      return false;
    }
  }
  function Ede(e) {
    var t;
    var n;
    if (!e || Object.keys(e).length === 0)
      return {
        renders: false,
        reason: "absent",
      };
    if (e.enabled !== true)
      return {
        renders: false,
        reason: "disabled",
      };
    let o = typeof e.text === "string" ? e.text.trim() : "";
    if (o.length === 0 || o.length > Yj.MAX_BANNER_TEXT_CHARS)
      return {
        renders: false,
        reason: "invalid",
        field: "text",
      };
    let r = (t = e.backgroundColor) !== null && t !== undefined ? t : Yj.BANNER_DEFAULT_BACKGROUND_COLOR;
    if (!uw(r))
      return {
        renders: false,
        reason: "invalid",
        field: "backgroundColor",
      };
    let s = (n = e.textColor) !== null && n !== undefined ? n : Yj.BANNER_DEFAULT_TEXT_COLOR;
    if (!uw(s))
      return {
        renders: false,
        reason: "invalid",
        field: "textColor",
      };
    let a = {
      renders: true,
      text: o,
      backgroundColor: r.toUpperCase(),
      textColor: s.toUpperCase(),
    };
    if (Wj(e.linkUrl)) a.linkUrl = e.linkUrl;
    return a;
  }
  function Pde(e) {
    if (!e.renders) return null;
    return {
      text: e.text,
      backgroundColor: e.backgroundColor,
      textColor: e.textColor,
      linkUrl: e.linkUrl,
    };
  }
});
//@ chunk-1ny7cxrt.js:1085104-1097554 cjs-unmatched+string-clue
var pw = x(function (tx) {
  Object.defineProperty(tx, "__esModule", {
    value: true,
  });
  tx.PASSTHROUGH_FIELDS = tx.BannerConfig = undefined;
  tx.claudeAiImportWizardSources = Dde;
  tx.claudeAiImportAdmits = Mde;
  tx.resolveClaudeAiImportArm = ex;
  var Xt = require_v3();
  var Lm = jm();
  var Ei = gr();
  var Te = yt();
  var Ae = mn();
  var Nm = Ar();
  var Qj = bd();
  var vd = (e) => e.enabled === true;
  tx.BannerConfig = Xt.z.object({
    enabled: Te.subfield(Xt.z.boolean().optional(), {
      label: Ae.msg({
        defaultMessage: "Show banner",
        id: "+zZ6KeQPTP",
      }),
      description: {
        short: Te.shortDescription(
          Ae.msg({
            defaultMessage: "Turns the banner on. When false or unset, the other banner fields are ignored.",
            id: "MdEs38x1uM",
          }),
        ),
      },
    }),
    text: Te.subfield(Xt.z.string().optional(), {
      label: Ae.msg({
        defaultMessage: "Banner text",
        id: "Wfk3Mut5XF",
      }),
      placeholder: Ae.msg({
        defaultMessage: "Internal use only",
        id: "xg5Va4c/VJ",
      }),
      description: {
        short: Te.shortDescription(
          Ae.msg({
            defaultMessage: "Single line, truncated on overflow. Maximum 200 characters.",
            id: "47aHGyWFid",
          }),
          {
            docsOnly: false,
          },
        ),
      },
      predicates: {
        show: vd,
        required: vd,
      },
    }),
    backgroundColor: Te.subfield(Xt.z.string().optional(), {
      label: Ae.msg({
        defaultMessage: "Background color",
        id: "CMansqNBPw",
      }),
      control: "color",
      default: Lm.BANNER_DEFAULT_BACKGROUND_COLOR,
      placeholder: Ae.msg({
        defaultMessage: "#F5F5F5",
        description: "Default hex color value \u2014 DO NOT TRANSLATE",
        id: "oqBUnTcd78",
      }),
      description: {
        short: Te.shortDescription(
          Ae.msg({
            defaultMessage: "Six-digit hex (#RRGGBB). Applied exactly as configured; not theme-adapted.",
            id: "WbM+LbvT9p",
          }),
          {
            docsOnly: false,
          },
        ),
      },
      predicates: {
        show: vd,
      },
    }),
    textColor: Te.subfield(Xt.z.string().optional(), {
      label: Ae.msg({
        defaultMessage: "Text color",
        id: "jGi3Y4Pu/z",
      }),
      control: "color",
      default: Lm.BANNER_DEFAULT_TEXT_COLOR,
      placeholder: Ae.msg({
        defaultMessage: "#000000",
        description: "Default hex color value \u2014 DO NOT TRANSLATE",
        id: "mMxRbpUjV1",
      }),
      description: {
        short: Te.shortDescription(
          Ae.msg({
            defaultMessage: "Six-digit hex (#RRGGBB). Applied exactly as configured; not theme-adapted.",
            id: "WbM+LbvT9p",
          }),
          {
            docsOnly: false,
          },
        ),
      },
      predicates: {
        show: vd,
      },
    }),
    linkUrl: Te.subfield(Xt.z.string().optional(), {
      label: Ae.msg({
        defaultMessage: "Link URL",
        id: "1e9zwhbnvk",
      }),
      placeholder: Ae.msg({
        defaultMessage: "https://intranet.example.com/usage-policy",
        id: "7U5OZwbVj5",
      }),
      description: {
        short: Te.shortDescription(
          Ae.msg({
            defaultMessage: "Optional HTTPS URL. The banner text becomes a link when set.",
            id: "HuIg1+BeMP",
          }),
          {
            docsOnly: false,
          },
        ),
      },
      mono: true,
      predicates: {
        show: vd,
      },
    }),
  });
  var $de = (e) => Boolean(e.url || e.oauthIssuer || e.oauthClientId);
  var predicates = {
    show: () => false,
  };
  var remotePolicy = {
    requiresUserConsent: true,
  };
  var Rde = Qj.ORG_UUID_VALUE.catch(undefined);
  function Dde(e) {
    return (
      (e === null || e === undefined ? undefined : e.enabled) === true &&
      e.allowedOrganizationUuids === undefined
    );
  }
  function Mde(e, t) {
    let allowedOrganizationUuids = e === null || e === undefined ? undefined : e.allowedOrganizationUuids;
    return (
      allowedOrganizationUuids === undefined ||
      (t !== undefined && allowedOrganizationUuids.includes(t.toLowerCase()))
    );
  }
  function ex(e) {
    if ((e === null || e === undefined ? undefined : e.url) && e.oauthIssuer && e.oauthClientId) {
      let t = Ei.safeHostname(e.oauthIssuer);
      if (!t || Ei.isAnthropicFirstPartyHost(t)) return;
      return {
        arm: "configured",
        url: e.url,
        oauthIssuer: e.oauthIssuer,
        oauthClientId: e.oauthClientId,
      };
    }
    return (e === null || e === undefined ? undefined : e.enabled)
      ? {
          arm: "direct",
        }
      : undefined;
  }
  var jde = {
    url: Te.subfield(
      Nm.urlSchema({
        allowLoopbackHttp: true,
      }).optional(),
      {
        label: Ae.msg({
          defaultMessage: "Export URL",
          id: "c4gImpUrl0",
        }),
        support: {
          visibility: "public-undocumented",
        },
        remotePolicy,
        mono: true,
        description: {
          short: Te.shortDescription(
            Ae.msg({
              defaultMessage:
                "Endpoint that returns a signed-in user\u2019s Claude.ai conversation history. Only needed for importing directly from Claude.ai.",
              id: "QJZ9eQ3fBa",
            }),
          ),
        },
        predicates,
      },
    ),
    oauthIssuer: Te.subfield(
      Nm.urlSchema({
        allowLoopbackHttp: true,
      }).optional(),
      {
        label: Ae.msg({
          defaultMessage: "OAuth issuer",
          id: "c4gImpIss0",
        }),
        support: {
          visibility: "public-undocumented",
        },
        remotePolicy,
        mono: true,
        description: {
          short: Te.shortDescription(
            Ae.msg({
              defaultMessage:
                "OAuth server users sign in to before importing directly from Claude.ai. Set with the export URL and client ID, or leave all three empty.",
              id: "Pzy8Q9OzN1",
            }),
          ),
        },
        predicates,
      },
    ),
    oauthClientId: Te.subfield(Xt.z.string().trim().min(1).optional(), {
      label: Ae.msg({
        defaultMessage: "OAuth client ID",
        id: "c4gImpCli0",
      }),
      support: {
        visibility: "public-undocumented",
      },
      remotePolicy,
      description: {
        short: Te.shortDescription(
          Ae.msg({
            defaultMessage:
              "OAuth client ID this app presents to the OAuth issuer. Set with the export URL and OAuth issuer, or leave all three empty.",
            id: "3lg1cVoMQs",
          }),
        ),
      },
      predicates,
    }),
    enabled: Te.subfield(Xt.z.boolean().default(false), {
      label: Ae.msg({
        defaultMessage: "Enable import",
        id: "c4gImpEnbl",
      }),
      support: {
        availableInVersion: "1.28929.0",
      },
      description: {
        short: Te.shortDescription(
          Ae.msg({
            defaultMessage:
              "Lets users import a Claude.ai data export and earlier Claude sessions on this computer from Settings \u2192 Import. Doesn\u2019t affect a provisioned sign-in import.",
            id: "OIB3Xj6IhR",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    allowedOrganizationUuids: Te.subfield(
      Xt.z.preprocess(
        (e) => (e === null || (typeof e === "string" && e.trim() === "") ? undefined : e),
        Te.annotate(Xt.z.array(Rde), {
          maxItems: 100,
        })
          .transform((e) => e.filter((t) => t !== undefined))
          .optional()
          .catch([]),
      ),
      {
        label: Ae.msg({
          defaultMessage: "Organizations users may import from",
          id: "JWDj9FZ3tB",
        }),
        support: {
          availableInVersion: "2.26454.0",
        },
        placeholder: Ae.msg({
          defaultMessage: '["00000000-0000-0000-0000-000000000000"]',
          id: "v2GKYTjwD3",
        }),
        description: {
          short: Te.shortDescription(
            Ae.msg({
              defaultMessage:
                "When set, users import by sign-in only, and only from the Claude.ai organizations with these IDs.",
              id: "YIm8r9KgW7",
            }),
            {
              docsOnly: false,
            },
          ),
          long: Te.longDescription(
            "A list of Claude.ai organization IDs (UUIDs). When set, users can import only by signing in to Claude.ai, and only from an organization on the list: a sign-in to any other organization, or to a personal account, is refused before anything is downloaded. Importing from a file and from earlier sessions on this computer is turned off. The list narrows `enabled` and turns nothing on by itself; `automatic3pImport` is not affected. An entry that is not a UUID allows nothing and is reported. An empty list, or one that cannot be read, allows no organization, so no import is offered; a null or blank value is read as not set. A provisioned sign-in import names no organization, so it is not offered while the list is set. Each import is reported to your OpenTelemetry collector as the event `desktop_claude_ai_import`, with the ID of the organization it came from. It is an info-level event: set `otlpDesktopLogLevel` to `info` to receive it.",
            {
              docsOnly: false,
            },
          ),
        },
      },
    ),
    automatic3pImport: Te.subfield(Xt.z.boolean().optional(), {
      label: Ae.msg({
        defaultMessage: "Automatically import earlier third-party sessions",
        id: "c4gImpAuto",
      }),
      support: {
        availableInVersion: "1.40609.0",
      },
      description: {
        short: Te.shortDescription(
          Ae.msg({
            defaultMessage:
              "Copy this computer\u2019s earlier third-party sessions into the app once, in the background. Independent of `enabled`.",
            id: "dVIH5Gg6O5",
          }),
          {
            docsOnly: false,
          },
        ),
        long: Te.longDescription(
          "Under device-delivered configuration (device management, a configuration file or a bootstrap URL) this runs only when set to `true`; for organizations managed from the Claude admin console (the hosted configuration) it is on unless an admin turns it off there. When the app launches under this organization, it copies this computer's earlier third-party sessions into its session store in the background, with Settings \u2192 Import's importer (originals stay in place). It lists the earlier configuration's Cowork artifacts in this organization. Optional plugins the user had on come back if still offered: those from the organization plugins directory are switched on, and those from an optional `allowedPluginMarketplaces` entry on the gateway's or bootstrap server's own origin are installed again without asking. Plugins the user uploaded (unless `userPluginUploadsEnabled` is off; they can run programs on this computer) and skills they saved (unless `skillCreationEnabled` is off) are installed again without asking, on or off as they were; a skill that declares tools, hooks, metadata or unknown settings arrives off. Other marketplaces' plugins stay behind. Earlier Cowork projects are added, their instructions held until the user accepts them. The user's Cowork memory and global instructions are copied and used at once, unreviewed (no memory if it was paused). Earlier scheduled tasks are added, each on or off as it was: one that was on runs at its next scheduled time. Runs at most once per device under device-delivered configuration and once more after it joins the hosted configuration. Under the hosted configuration it takes sessions from any earlier device configuration (including ones a console sign-in created) but never those stored under another organization's hosted configuration; under device-delivered configuration, only those stored while no organization ID was configured, and only once one is. Turn on `enabled` too so users can import sessions it leaves out by hand.",
          {
            docsOnly: false,
          },
        ),
      },
    }),
    exportEnabled: Te.subfield(Xt.z.boolean().default(false), {
      label: Ae.msg({
        defaultMessage: "Enable session export",
        id: "c4gImpExEn",
      }),
      support: {
        availableInVersion: "1.32352.0",
      },
      description: {
        short: Te.shortDescription(
          Ae.msg({
            defaultMessage:
              "Lets users export this computer\u2019s chats, Cowork tasks, and Code sessions as a zip another install can import. No effect unless `enabled` is true.",
            id: "c4gImpExSh",
          }),
          {
            docsOnly: false,
          },
        ),
        long: Te.longDescription(
          "Allows users to write this computer's chats, Cowork tasks, and Code sessions to a portable zip that another install can import from Settings > Import. Transcripts contain conversation content including tool outputs; only session-record metadata is projected to a fixed field allowlist. Treat exported zips as sensitive data.",
          {
            docsOnly: false,
          },
        ),
      },
    }),
    bannerBehavior: Te.subfield(Xt.z.enum(["off", "detect", "show"]).optional().catch(undefined), {
      label: Ae.msg({
        defaultMessage: "Import prompt banner",
        id: "c4gImpBnr0",
      }),
      support: {
        availableInVersion: "1.28929.0",
      },
      description: {
        short: Te.shortDescription(
          Ae.msg({
            defaultMessage:
              "Prompt to import on a new chat or task. Off if unset. `show`: always; needs `enabled` or a sign-in import. `detect`: if `enabled` finds earlier Claude sessions.",
            id: "H9VdpjJA2h",
          }),
          {
            docsOnly: false,
          },
        ),
      },
    }),
    bannerMaxDismissals: Te.subfield(Xt.z.number().int().min(1).max(10).optional().catch(undefined), {
      label: Ae.msg({
        defaultMessage: "Import prompt skip limit",
        id: "qYSrEYqrpG",
      }),
      support: {
        visibility: "public-undocumented",
        availableInVersion: "2.16120.0",
      },
      description: {
        short: Te.shortDescription(
          Ae.msg({
            defaultMessage:
              "Skips allowed before the import prompt stays hidden: 1 to 10, 1 if unset. It returns 3 days after each skip except the last. An import hides it for good.",
            id: "IUTVtr/gtN",
          }),
        ),
      },
      predicates,
    }),
  };
  tx.PASSTHROUGH_FIELDS = {
    claudeAiImport: Te.field(
      Xt.z
        .object(jde)
        .refine((e) => !$de(e) || Boolean(e.url && e.oauthIssuer && e.oauthClientId), {
          message:
            "url, oauthIssuer and oauthClientId are required together (an import endpoint is unusable without all three)",
        })
        .optional(),
      {
        flatKey: "claudeAiImport",
        support: {
          enabled: {
            scopes: ["3p"],
            availableInVersion: "1.10628.0",
          },
        },
        title: Ae.msg({
          defaultMessage: "Claude.ai data import",
          id: "c4gImpTitl",
        }),
        egressRequirements: (e) => {
          let t = ex(e);
          if (!t) return [];
          if (t.arm === "configured") return [t.url, t.oauthIssuer].map(Ei.egressAddress).filter((n) => !!n);
          return [Ei.CLAUDE_AI_HOST, Ei.ANTHROPIC_API_HOST, Ei.GCS_SIGNED_URL_HOST];
        },
        egressRequirementsLabel: Ae.msg({
          defaultMessage: "Claude.ai data import",
          id: "c4gImpEgrs",
        }),
        category: "connectors",
        group: Ae.msg({
          defaultMessage: "Claude.ai data import",
          id: "c4gImpTitl",
        }),
        description: {
          short: Te.shortDescription(
            Ae.msg({
              defaultMessage:
                "Lets users import Claude.ai chats and projects, plus earlier Claude sessions on this computer, when `enabled` is true. `automatic3pImport` is a separate switch.",
              id: "nsQDRMwvNu",
            }),
          ),
        },
      },
    ),
    banner: Te.field(
      Te.annotate(tx.BannerConfig.optional(), {
        redact: "keep",
      }),
      {
        flatKey: "banner",
        remotePolicy: {
          hotApplied: true,
        },
        support: {
          enabled: {
            scopes: ["1p", "3p"],
            availableInVersion: "1.7196.0",
          },
        },
        title: Ae.msg({
          defaultMessage: "Organization banner",
          id: "bU34Yscprn",
        }),
        category: "appearance",
        group: Ae.msg({
          defaultMessage: "Organization banner",
          id: "bU34Yscprn",
        }),
        description: {
          short: Te.shortDescription(
            Ae.msg({
              defaultMessage: "A persistent banner across the top of the app window after sign-in.",
              id: "UQLzOZq7h3",
            }),
          ),
          long: Te.longDescription(
            "Use this for compliance notices, an internal-support link, or to identify the deployment. The banner is shown on every page after sign-in and cannot be dismissed by the user. Colors are six-digit hex (`#RRGGBB`); when `linkUrl` is set the banner text becomes an HTTPS link.",
          ),
        },
      },
    ),
  };
});
//@ chunk-1ny7cxrt.js:1097554-1108842 cjs-unmatched+string-clue
var cx = x(function (ax) {
  Object.defineProperty(ax, "__esModule", {
    value: true,
  });
  ax.BuiltinBrowserConfig = undefined;
  var Pi = require_v3();
  var hs = gr();
  var dn = yt();
  var ti = $n();
  var jn = mn();
  var va = zi();
  var show = (e) => {
    var t;
    return ((t = e.builtinBrowser) === null || t === undefined ? undefined : t.enabled) === true;
  };
  function sx(e, t) {
    if (typeof t !== "string" || t === "")
      return {
        kind: "drop",
        why: "dropped: entries must be non-empty strings",
      };
    if (e === "allowed" && t === "*")
      return {
        kind: "drop",
        why: 'dropped: set builtinBrowserDefaultDomainPolicy to "allow" to let Claude open every site',
      };
    let egressHostEntry = hs.parseEgressHostEntry(t);
    if (egressHostEntry === null)
      return {
        kind: "unknown",
        why: `matches nothing as written: must be ${hs.EGRESS_ENTRY_GRAMMAR}`,
      };
    if (egressHostEntry.host === "localhost")
      return {
        kind: "unknown",
        why: "matches nothing: localhost dev servers are never blocked in the built-in browser",
      };
    return;
  }
  function ix(e) {
    return (t, n) => {
      if (!Array.isArray(t)) return;
      for (let o of t) {
        let r = sx(e, o);
        if (r) n(`built-in browser ${e}-sites entry ${JSON.stringify(o)} ${r.why}`, r.kind);
      }
    };
  }
  var ox = (e) =>
    Pi.z
      .preprocess(
        (t) =>
          Array.isArray(t)
            ? t.filter((n) => {
                var o;
                return ((o = sx(e, n)) === null || o === undefined ? undefined : o.kind) !== "drop";
              })
            : t,
        dn.annotate(Pi.z.array(Pi.z.string().min(1)), {
          maxItems: 500,
        }),
      )
      .optional();
  ax.BuiltinBrowserConfig = Pi.z.object({
    enabled: dn.field(Pi.z.boolean().optional(), {
      flatKey: "builtinBrowserEnabled",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.2553.0",
        },
        executionTarget: "desktop",
      },
      title: jn.msg({
        defaultMessage: "Allow the built-in browser",
        id: "WpkucDWuLT",
      }),
      default: false,
      remotePolicy: {
        hybrid: {
          derived: true,
        },
      },
      egressRequirements: (e) => (e === true ? [hs.UPDATE_FEED_HOST] : []),
      egressRequirementsLabel: jn.msg({
        defaultMessage: "Built-in browser (site safety check)",
        id: "cDGoOjcr2/",
      }),
      category: "sandbox",
      group: va.BUILTIN_BROWSER_GROUP,
      order: 12,
      description: {
        short: dn.shortDescription(
          jn.msg({
            defaultMessage:
              "Offer the built-in browser in Cowork and Code sessions so users and Claude can open and work with web pages. Site sign-ins stay on the device until cleared.",
            id: "GP16g9tMfY",
          }),
        ),
        long: dn.longDescription(
          `When enabled, Cowork and Code sessions get a built-in browser pane. Users can open any site in it; Claude can open, read, and act on pages with its browser tools once the user approves each site (private-network hosts ask again per action unless the user always allows the host). Pages load directly from the user's machine, so your network controls apply; the pane's sign-ins and cookies stay in the app's browser profile on the device until cleared.

Off (default): no browser pane; Code sessions keep the localhost-only dev-server preview. With \`bootstrapUrl\` set, put this key in the served configuration: a device-profile value alone leaves the browser off. On an install managed from the Claude admin console this follows the console's Built-in browser switch.

When a public site opens or is framed in the pane, and before Claude works with it, the app checks its address (query removed) against Anthropic's site safety list on \`${hs.UPDATE_FEED_HOST}\`, signed out, with no account, organization, or device identifier (Claude admin console installs: as the signed-in member on \`api.anthropic.com\`). A site it blocks stays blocked to Claude under every key below. Private addresses, names resolving to them, and internal-suffix or single-label names are never sent (a name under a public domain is checked even if only your VPN resolves it). Allow \`${hs.UPDATE_FEED_HOST}\` through your firewall: if a check fails, users can browse but Claude's page tools stay off for that site.

\`builtinBrowserDefaultDomainPolicy\` and its two site lists restrict where Claude may browse. A separately deployed Claude Code [managed-settings](${ti.COWORK_3P_DOCS_BASE}/code#interaction-with-claude-code%E2%80%99s-own-managed-settings) file still applies: \`disableBrowserExternalNavigation: true\` keeps the browser off even with this key on, and \`browserExternalPageTools: "disabled"\` keeps the pane but turns Claude's page tools off for external sites. Takes effect after the app restarts.`,
          {
            docsUrl: `${ti.COWORK_3P_DOCS_BASE}/configuration#builtinbrowserenabled`,
          },
        ),
      },
    }),
    defaultDomainPolicy: dn.field(Pi.z.enum(["allow", "block"]).optional(), {
      flatKey: "builtinBrowserDefaultDomainPolicy",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.2553.0",
        },
        executionTarget: "desktop",
      },
      title: jn.msg({
        defaultMessage: "Default site policy in the built-in browser",
        id: "UoPPb2U8EW",
      }),
      default: "allow",
      failClosedValue: "block",
      remotePolicy: {
        hybrid: {
          derived: true,
        },
        hotApplied: true,
      },
      predicates: {
        show,
      },
      optionLabels: {
        allow: jn.msg({
          defaultMessage: "Allow all sites except blocked sites",
          id: "QKY/9Ra51f",
        }),
        block: jn.msg({
          defaultMessage: "Block all sites except allowed sites",
          id: "SyVfZ0jYvT",
        }),
      },
      category: "sandbox",
      group: va.BUILTIN_BROWSER_GROUP,
      order: 12.2,
      description: {
        short: dn.shortDescription(
          jn.msg({
            defaultMessage:
              "Whether Claude may open sites in the built-in browser by default; the allowed or blocked list is the exception. Mirrors the Claude in Chrome site policy.",
            id: "+Xd6SuBz42",
          }),
        ),
        long: dn.longDescription(
          "Applies when `builtinBrowserEnabled` is on, in both Cowork and Code sessions, and decides which sites Claude may open, read, or act on with its browser tools; users can still view any site themselves. `allow` (default): every site except entries in `builtinBrowserBlockedDomains`. `block`: no site except entries in `builtinBrowserAllowedDomains`. Under either policy `coworkEgressAllowedHosts`, when set to anything but `*`, is an outer bound: sites outside it are refused to Claude in the browser too. A site Anthropic's site safety list blocks stays blocked to Claude under either policy (see `builtinBrowserEnabled`); for a site the list only flags for confirmation, Claude asks the user before each of its actions under `allow`, and skips that confirmation only when the site matches a `builtinBrowserAllowedDomains` entry under `block`. A value that cannot be read is treated as `block` until it is fixed.\n\nThe policy also limits what pages load: a page in the pane, including one a user opened, cannot load frames, scripts, images, or other content from a site the policy does not admit (a blocked page a user opens still loads content from its own site). Under `block`, or with a `coworkEgressAllowedHosts` list, include the CDN and API hosts your allowed sites depend on.\n\nThis key and the two site lists work the same way as the Claude in Chrome site policy in the admin console. They are set separately here, except on an install managed from the Claude admin console, where they follow your organization's browser site permissions there.",
          {
            docsUrl: `${ti.COWORK_3P_DOCS_BASE}/configuration#builtinbrowserdefaultdomainpolicy`,
          },
        ),
      },
    }),
    allowedDomains: dn.field(ox("allowed"), {
      flatKey: "builtinBrowserAllowedDomains",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.2553.0",
        },
        executionTarget: "desktop",
      },
      title: jn.msg({
        defaultMessage: "Allowed sites in the built-in browser",
        id: "N0mmi7Llpp",
      }),
      failClosedValue: [],
      checkDropped: ix("allowed"),
      remotePolicy: {
        hybrid: {
          derived: true,
        },
        hotApplied: true,
      },
      predicates: {
        show,
      },
      category: "sandbox",
      group: va.BUILTIN_BROWSER_GROUP,
      order: 12.4,
      placeholder: ti.HOST_LIST_PLACEHOLDER,
      description: {
        short: dn.shortDescription(
          jn.msg({
            defaultMessage:
              "Sites Claude may open, read, and act on in the built-in browser when the default site policy is block. Users can still view other sites.",
            id: "Jno9aeMAe8",
          }),
        ),
        long: dn.longDescription(
          "Used when `builtinBrowserDefaultDomainPolicy` is `block`; ignored under `allow`. A site matching an entry is one Claude may open and work with using its browser tools; every other external site is treated as blocked by your organization: Claude cannot open it, cannot read or act on it, and frames, popups, and redirects into it from a page Claude is working on are refused. A user can still type its address and view it themselves. Listing a site here never unblocks a site Anthropic's site safety list blocks (see `builtinBrowserEnabled`); for a site that list only flags for confirmation, an entry here is your organization vouching for it, so Claude works with it without asking before each action.\n\nEntries use the same grammar as `coworkEgressAllowedHosts`, except that bare `*` is dropped: as in Claude in Chrome, no allowed-sites entry opens every site. Set the policy to `allow` for that. A wildcard whose base is a public suffix (`*.co.uk`, `*.github.io`) is likewise ignored so an entry can never open a whole shared registry. Any other entry outside that grammar is kept but matches nothing (the app log and the editor name it); a value that cannot be read at all allows nothing until it is fixed. A plain hostname entry (`example.com`) also covers its `www.` form, and a `www.` entry covers the bare name, but no other subdomain. `localhost` dev servers are always reachable, so listing them changes nothing.\n\nEmpty or unset (default): under `block`, Claude may open no external site. On an install managed from the Claude admin console this follows your organization's browser site permissions there.",
          {
            docsUrl: `${ti.COWORK_3P_DOCS_BASE}/configuration#builtinbrowseralloweddomains`,
          },
        ),
      },
    }),
    blockedDomains: dn.field(ox("blocked"), {
      flatKey: "builtinBrowserBlockedDomains",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "2.2553.0",
        },
        executionTarget: "desktop",
      },
      title: jn.msg({
        defaultMessage: "Blocked sites in the built-in browser",
        id: "BcwtcpU/GS",
      }),
      failClosedValue: ["*"],
      checkDropped: ix("blocked"),
      remotePolicy: {
        hybrid: {
          derived: true,
        },
        hotApplied: true,
      },
      predicates: {
        show,
      },
      category: "sandbox",
      group: va.BUILTIN_BROWSER_GROUP,
      order: 12.6,
      placeholder: ti.HOST_LIST_PLACEHOLDER,
      description: {
        short: dn.shortDescription(
          jn.msg({
            defaultMessage:
              "Sites Claude may not open, read, or act on in the built-in browser when the default site policy is allow. Users can still view them.",
            id: "FQzOgmWpx1",
          }),
        ),
        long: dn.longDescription(
          "Used when `builtinBrowserDefaultDomainPolicy` is `allow` (the default); ignored under `block`. A site matching an entry is treated as blocked by your organization: Claude cannot open it, cannot read or act on it with its browser tools, and frames, popups, and redirects into it from a page Claude is working on are refused. A user can still type its address and view it themselves: the pane shows a \"blocked by your organization's policy\" banner and Claude's tools stay off there. To take the external browser away from users as well, deploy Claude Code's `disableBrowserExternalNavigation` managed setting instead. A blocked site is refused before the site safety check, so its address is never sent to Anthropic.\n\nEntries use the same grammar as `coworkEgressAllowedHosts`; `*` blocks every external site. An entry outside that grammar is kept but matches nothing (the app log and the editor name it); a value that cannot be read at all blocks every external site until it is fixed. As in Claude in Chrome, a plain hostname entry (`example.com`) also covers its `www.` form, and a `www.` entry covers the bare name, but no other subdomain. `localhost` dev servers are never affected.\n\nUse this key for exceptions inside an allowed egress wildcard or when egress is open. Empty or unset (default): no sites beyond the egress list are blocked. On an install managed from the Claude admin console this follows your organization's browser site permissions there.",
          {
            docsUrl: `${ti.COWORK_3P_DOCS_BASE}/configuration#builtinbrowserblockeddomains`,
          },
        ),
      },
    }),
  });
});
//@ chunk-1ny7cxrt.js:1108842-1113255 cjs-unmatched+string-clue
var fx = x(function (ux) {
  Object.defineProperty(ux, "__esModule", {
    value: true,
  });
  ux.SessionRetentionConfig = undefined;
  var wa = require_v3();
  var Kn = yt();
  var fn = mn();
  var group = fn.msg({
    defaultMessage: "Session retention",
    id: "3Pm9sCaKFE",
  });
  var suffix = fn.msg({
    defaultMessage: "days",
    id: "Bc20laBenW",
  });
  var gw = () =>
    wa.z.preprocess(
      (e) => (typeof e === "string" && e.trim() !== "" ? Number(e) : e),
      wa.z.number().int().gte(1).lte(3650).optional(),
    );
  var long = Kn.longDescription(
    "The app deletes whole sessions in the background shortly after it fetches this configuration (at launch and on each re-poll), or some minutes after launch and then daily when the configuration comes from device management alone. Idle time runs from the session's last activity; viewing an old Code session counts as activity, viewing an old chat or Cowork task without continuing it does not durably. A session that is running or open on screen is skipped and checked again on the next pass, as is a chat or Cowork task whose folder changed on disk within the period. Pinned sessions are not exempt. Minimum 1 day; a value that cannot be read as a whole number of days deletes nothing. Set through the served configuration or in the device-management profile that carries the rest of the configuration. What it does not reach: another account's sessions on the device (evaluated when that account signs in), Code sessions on a remote machine (SSH/WSL), Cowork background (dispatch) tasks the sidebar does not list, a chat or Cowork task whose folder cannot be located, and Claude Code files not named by a session id (prompt history, plans, shell snapshots), which keep Claude Code's own retention. Honored only by Claude Desktop configured for a third-party model provider.",
  );
  ux.SessionRetentionConfig = wa.z.object({
    chatDays: Kn.field(gw(), {
      flatKey: "chatSessionRetentionDays",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.52386.0",
        },
      },
      title: fn.msg({
        defaultMessage: "Chat retention period",
        id: "Qmc45WB3Fw",
      }),
      category: "limits",
      group,
      order: 0,
      suffix,
      placeholder: fn.msg({
        defaultMessage: "90",
        id: "YrCav22fKE",
      }),
      description: {
        short: Kn.shortDescription(
          fn.msg({
            defaultMessage:
              "Delete chats, with their files, after this many days without activity. Unset: kept until the user deletes them. Projects and memory stay.",
            id: "rtyAcXYbBI",
          }),
        ),
        long,
      },
    }),
    coworkDays: Kn.field(gw(), {
      flatKey: "coworkSessionRetentionDays",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.52386.0",
        },
      },
      title: fn.msg({
        defaultMessage: "Cowork retention period",
        id: "94H0hll7CE",
      }),
      category: "limits",
      group,
      order: 1,
      suffix,
      placeholder: fn.msg({
        defaultMessage: "90",
        id: "YrCav22fKE",
      }),
      description: {
        short: Kn.shortDescription(
          fn.msg({
            defaultMessage:
              "Delete Cowork tasks, with their uploads and outputs, after this many days without activity. Unset: kept until the user deletes them. Spaces and memory stay.",
            id: "XMgSZ82SVH",
          }),
        ),
        long,
      },
    }),
    codeDays: Kn.field(gw(), {
      flatKey: "codeSessionRetentionDays",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.52386.0",
        },
      },
      title: fn.msg({
        defaultMessage: "Code retention period",
        id: "n8pR7uBR/o",
      }),
      category: "limits",
      group,
      order: 2,
      suffix,
      placeholder: fn.msg({
        defaultMessage: "90",
        id: "YrCav22fKE",
      }),
      description: {
        short: Kn.shortDescription(
          fn.msg({
            defaultMessage:
              "Delete Code sessions, conversation included, after this many days without activity. Unset: kept until the user deletes them. Uncommitted work stays on disk.",
            id: "v1o1JWREP7",
          }),
        ),
        long,
      },
    }),
    legalHold: Kn.field(wa.z.boolean().optional(), {
      flatKey: "sessionRetentionHold",
      support: {
        enabled: {
          scopes: ["3p"],
          availableInVersion: "1.52386.0",
        },
      },
      title: fn.msg({
        defaultMessage: "Suspend session deletion",
        id: "Mm7TNf2YCM",
      }),
      failClosedValue: true,
      category: "limits",
      group,
      order: 3,
      description: {
        short: Kn.shortDescription(
          fn.msg({
            defaultMessage:
              "Suspend all automatic session deletion for these users (legal hold). While on, the retention periods above delete nothing.",
            id: "l86egk4Pyb",
          }),
        ),
        long: Kn.longDescription(
          "Meant to be set per user or group, through the served configuration's group overrides or in the same device-management profile that carries the rest of the configuration (a profile carrying only this key makes the device profile-managed, like any policy key); a hold in the device's profile also counts when the served configuration does not restate it. Deletion stops at the first configuration fetch that carries this value, before it takes effect as configuration at the next relaunch; a device that cannot reach its configuration server deletes nothing.",
        ),
      },
    }),
  });
});
//@ chunk-1ny7cxrt.js:1113255-1116994 cjs-unmatched+string-clue
var fl = x(function (Px) {
  Object.defineProperty(Px, "__esModule", {
    value: true,
  });
  Px.ManagedConfig = Px.DISCRIMINATORS = undefined;
  var Fm = require_v3();
  var zm = gr();
  var ms = yt();
  var Fc = mn();
  var Bm = Ir();
  var px = cw();
  var hx = bd();
  var mx = Wv();
  var gx = cx();
  var yx = Yv();
  var _x = rw();
  var bx = ew();
  var vx = pw();
  var wx = wm();
  var Ox = _m();
  var Sx = fx();
  var ir = Cc();
  var kx = tw();
  var Ex = _d();
  var node = ms.field(Fm.z.enum(ms.PROVIDERS).optional(), {
    flatKey: "inferenceProvider",
    readers: ["desktop", "m365", "code"],
    support: {
      enabled: {
        scopes: ["3p"],
        availableInVersion: "1.2581.0",
      },
      values: {
        mantle: {
          availableInVersion: "1.13576.0",
        },
      },
      executionTarget: "desktop",
    },
    activatesThirdPartyMode: (e, t) => t || e.inference !== undefined,
    title: Fc.msg({
      defaultMessage: "Inference provider",
      id: "QQpUrtO7kr",
    }),
    egressRequirements: (e) => (e === "anthropic" ? [zm.ANTHROPIC_API_HOST, zm.PLATFORM_CLAUDE_HOST] : []),
    egressRequirementsLabel: Fc.msg({
      defaultMessage: "Claude API",
      id: "Fo2tzWOJzu",
    }),
    category: "connection",
    customRenderer: "providerSelect",
    description: {
      short: ms.shortDescription(
        Fc.msg({
          defaultMessage: "Selects the inference backend. Setting this key activates third-party mode.",
          id: "aRuqK/KXrl",
        }),
      ),
      long: ms.longDescription(
        "Setting this key asks for 3P mode. The app opens in 3P mode unless the user chose to sign in to Claude.ai at the login screen, a choice `disableDeploymentModeChooser` removes. In 3P mode, if the selected provider's required credential keys are missing or invalid, the app shows a configuration error. A value the app cannot read (a misspelt, wrongly cased or unknown provider, or a value of the wrong type) still counts as set when machine-wide device management sent it: a macOS configuration profile, Windows policy under `HKLM`, or the root-owned policy file on Linux. The app then asks for 3P mode and, in 3P mode, shows a configuration error whose details name this key. An unreadable `bootstrapUrl` from the same sources counts the same way unless `bootstrapEnabled` is `false`. An unreadable value does not count where the user can write it: the local configuration file, or Windows policy under `HKCU`. Neither does an empty value (a value of only spaces is unreadable, not empty), or a Windows value of type `REG_BINARY`, `REG_MULTI_SZ` or `REG_QWORD`. Each of those reads as not set. When this key is not set, the app launches in standard mode unless another setting asks for 3P mode, such as a `bootstrapUrl` that `bootstrapEnabled` has not turned off. Keys for providers other than the selected one are ignored. Each provider's required keys are documented on its dedicated page under Inference providers.",
      ),
    },
  });
  Px.DISCRIMINATORS = {
    inferenceProvider: {
      node,
      nestedPath: ["inference", "provider"],
      discriminates: "provider",
    },
    inferenceCredentialKind: {
      node: Bm.inferenceCredentialKindField,
      nestedPath: ["inference", "credential", "kind"],
      discriminates: "credentialKind",
    },
  };
  Px.ManagedConfig = Fm.z.object({
    inference: ms.annotate(Bm.InferenceConfig.optional(), {
      gatewayServable: false,
    }),
    selfHosted: Ox.SelfHostedConfig.optional(),
    otlp: ir.OtlpConfig.optional(),
    dictation: ir.DictationConfig.optional(),
    tokenLimits: ir.TokenLimitsConfig.optional(),
    coworkSurface: ir.CoworkSurfaceConfig.optional(),
    codeSurface: ir.CodeSurfaceConfig.optional(),
    chatSurface: ir.ChatSurfaceConfig.optional(),
    sessionRetention: Sx.SessionRetentionConfig.optional(),
    extensions: ir.ExtensionsConfig.optional(),
    autoUpdate: ir.AutoUpdateConfig.optional(),
    featureDiscovery: ir.FeatureDiscoveryConfig.optional(),
    bootstrap: mx.BootstrapConfig.optional(),
    lifecycle: yx.LifecycleConfig.optional(),
    models: bx.ModelsConfig.optional(),
    plugins: wx.PluginsConfig.optional(),
    telemetry: kx.TelemetryConfig.optional(),
    mcp: _x.McpConfig.optional(),
    workspace: Ex.WorkspaceConfig.optional(),
    builtinBrowser: gx.BuiltinBrowserConfig.optional(),
    authentication: hx.AuthenticationConfig.optional(),
    appearance: px.AppearanceConfig.optional(),
    ...vx.PASSTHROUGH_FIELDS,
  });
});
//@ chunk-1ny7cxrt.js:1116994-1119170 cjs-unmatched+string-clue
var Hm = x(function (Cx) {
  Object.defineProperty(Cx, "__esModule", {
    value: true,
  });
  Cx.CREDENTIAL_SPEC = Cx.isFieldSet = undefined;
  Cx.credentialSpecCell = Ix;
  Cx.kindIsPresent = bw;
  Cx.deriveInferenceCredentialKind = Hde;
  Cx.presentCredentialKinds = Kde;
  var Ai = yt();
  var Hc = Ir();
  var isFieldSet = (e) => (typeof e === "string" ? e.trim().length > 0 : e !== undefined && e !== null);
  Cx.isFieldSet = isFieldSet;
  function Bde() {
    var e;
    var t;
    var n;
    var o;
    var r;
    var s;
    var a;
    var l;
    let c = {};
    for (let option of Hc.InferenceConfig.options) {
      let f = option.shape.provider.value;
      let h =
        (t =
          (e = Ai.variantMetaForNode(option)) === null || e === undefined ? undefined : e.needsBaseUrlFor) !==
          null && t !== undefined
          ? t
          : [];
      let m =
        "baseUrl" in option.shape
          ? (n = Ai.fieldMetaForNode(option.shape.baseUrl)) === null || n === undefined
            ? undefined
            : n.flatKey
          : undefined;
      if (h.length > 0 && !m) throw Error(`${f}: needsBaseUrlFor is set but the arm has no baseUrl leaf`);
      let y = {};
      let b = {};
      for (let S of Ai.discriminatorArmsOf(option.shape.credential)) {
        let id = S.id;
        if (!id || !S.schema) continue;
        let M = (o = y[id]) !== null && o !== undefined ? o : (y[id] = new Set());
        let N = (r = b[id]) !== null && r !== undefined ? r : (b[id] = new Set());
        for (let Z of Object.values(S.schema.shape)) {
          let F = Ai.fieldMetaForNode(Z);
          if (!F || F.notAPresenceSignal) continue;
          N.add(F.flatKey);
          if ((s = F.predicates) === null || s === undefined ? undefined : s.required) M.add(F.flatKey);
        }
      }
      let w = {};
      for (let S of Hc.CREDENTIAL_KINDS_FOR_PROVIDER[f]) {
        let j = Hc.kindSupportsDiscovery(f, S);
        w[S] = {
          requiredLeaves: [...((a = y[S]) !== null && a !== undefined ? a : [])],
          presenceLeaves: [...((l = b[S]) !== null && l !== undefined ? l : [])],
          ...(m &&
            h.includes(S) && {
              extraRequiredLeaves: [m],
            }),
          ...(j === false && {
            supportsDiscovery: false,
          }),
        };
      }
      c[f] = w;
    }
    return c;
  }
  Cx.CREDENTIAL_SPEC = Bde();
  function Ix(e, t) {
    let n = Cx.CREDENTIAL_SPEC[e];
    return n === null || n === undefined ? undefined : n[t];
  }
  function bw(e, inferenceProvider, n) {
    let o = Ix(inferenceProvider, n);
    if (!o) return false;
    return o.requiredLeaves.length > 0
      ? o.requiredLeaves.every((requiredLeaf) => Cx.isFieldSet(e[requiredLeaf]))
      : o.presenceLeaves.some((presenceLeaf) => Cx.isFieldSet(e[presenceLeaf]));
  }
  function Hde(e) {
    let inferenceProvider = e.inferenceProvider;
    if (!inferenceProvider) return;
    for (let n of Ai.KIND_PRECEDENCE) if (bw(e, inferenceProvider, n)) return n;
    if (inferenceProvider === "vertex") {
      if (e.inferenceVertexWorkforceAudience !== undefined) return "workforce";
      if (e.inferenceVertexOAuthClientId !== undefined) return "interactive";
      return "vendor-profile";
    }
    if (inferenceProvider === "anthropic") return "interactive";
    return;
  }
  function Kde(e) {
    let inferenceProvider = e.inferenceProvider;
    if (!inferenceProvider) return [];
    return Ai.KIND_PRECEDENCE.filter((n) => bw(e, inferenceProvider, n));
  }
});
//@ chunk-1ny7cxrt.js:1119170-1131674 cjs-unmatched+string-clue
var gs = x(function (Kx) {
  Object.defineProperty(Kx, "__esModule", {
    value: true,
  });
  Kx.isStaticTier3pKey =
    Kx.staticTierKeys =
    Kx.nonBootstrapableKeys =
    Kx.bootstrapableKeys =
    Kx.isBootstrapable =
    Kx.isBootstrapableMeta =
    Kx.isInferenceConnectionKey =
    Kx.isPublished3pKey =
    Kx.allKeys =
    Kx.FlatManagedConfig =
    Kx.FLAT_KEY_TO_NESTED_PATH =
    Kx.fieldProviders =
    Kx.INFERENCE_LEAF_MEMBERSHIP =
    Kx.FORMER_NESTED_PATHS =
    Kx.RETIRED_FLAT_KEYS =
    Kx.FLAT_KEYS =
      undefined;
  Kx.retiredFlatKeyEffect = Jde;
  Kx.requiredProviderLeaves = Qde;
  Kx.assertFieldMetaCoverageBuilt = nfe;
  Kx.getFieldMeta = Mr;
  Kx.tryGetFieldMeta = Km;
  Kx.keepsAuthoredEmptyList = rfe;
  Kx.flatConfigKeys = Fs;
  Kx.enabledScopes = Zm;
  Kx.deprecatedScopes = zx;
  Kx.activatesThirdPartyMode = sfe;
  Kx.materializeDefaults = lfe;
  Kx.defaultedFlatKeys = cfe;
  Kx.keysWithRemotePolicy = dfe;
  Kx.platformVariantKeys = Fx;
  Kx.applyPlatformVariants = ww;
  Kx.changedKeysNeedingRestart = ffe;
  Kx.layHotAppliedKeys = pfe;
  Kx.applyUnverifiedKeys = hfe;
  Kx.unverifiedCacheValue = Hx;
  Kx.unverifiedCacheAdmits = mfe;
  Kx.appliesUnverifiedAsFailClosed = gfe;
  Kx.isFailClosedStandIn = yfe;
  Kx.flatKeysForExecutionTarget = _fe;
  Kx.appBehaviorMdmKeys = bfe;
  Kx.remotePolicyDefaults = kfe;
  var Dx = require_v3();
  var Se = yt();
  var Oa = $n();
  var Ii = fl();
  var Mx = _m();
  var jx = Hm();
  function Wde(e) {
    let t = new Map();
    let n = (o, r, s) => {
      var a;
      var l;
      var c;
      let u = Se.fieldMetaForNode(o);
      if (u) {
        let m =
          (a = t.get(u.flatKey)) !== null && a !== undefined
            ? a
            : t
                .set(u.flatKey, {
                  node: o,
                  path: r,
                  providers: new Set(),
                  credentialKinds: new Set(),
                  kindAgnostic: false,
                })
                .get(u.flatKey);
        if (s === null || s === undefined ? undefined : s.provider) {
          m.providers.add(s.provider);
          if (s.kind) m.credentialKinds.add(s.kind);
          else m.kindAgnostic = true;
        }
        return;
      }
      let f = Se.unwrapZod(o);
      let h = Se.zodKind(f);
      if (h === Se.ZodKind.ZodObject) {
        let shape = f.shape;
        let y =
          (l = Se.literalValueOf(shape.provider)) !== null && l !== undefined
            ? l
            : s === null || s === undefined
              ? undefined
              : s.provider;
        let b =
          (c = Se.literalValueOf(shape.kind)) !== null && c !== undefined
            ? c
            : s === null || s === undefined
              ? undefined
              : s.kind;
        let w =
          y || b
            ? {
                provider: y,
                kind: b,
              }
            : s;
        for (let [key, value] of Object.entries(shape)) n(value, [...r, key], w);
      } else if (h === Se.ZodKind.ZodDiscriminatedUnion || h === Se.ZodKind.ZodUnion)
        for (let m of Se.unionOptionsOf(f)) n(m, r, s);
    };
    n(e, []);
    return new Map(
      [...t].map(([o, r]) => [
        o,
        {
          node: r.node,
          path: r.path,
          armContext:
            r.providers.size > 0
              ? {
                  providers: [...r.providers],
                  credentialKinds: r.kindAgnostic ? [] : [...r.credentialKinds],
                }
              : undefined,
        },
      ]),
    );
  }
  var Od = Wde(Ii.ManagedConfig);
  Kx.FLAT_KEYS = [...Od.keys(), ...Object.keys(Ii.DISCRIMINATORS)];
  var Yde = {
    workspace: [
      {
        name: "disableMobileSimulatorTools",
        nestedPath: "workspace.disableMobileSimulatorTools",
        effect:
          "it is now read from Claude Code managed settings under the same name \u2014 deploy the replacement there",
      },
      {
        name: "coworkVmWindowsShareFallbackEnabled",
        nestedPath: "workspace.vmWindowsShareFallbackEnabled",
        effect:
          "the Windows VM file-share fallback it switched was removed once Microsoft fixed the underlying Windows regression (KB5129195); nothing replaces it",
      },
    ],
    selfHosted: [
      {
        name: "deviceToolsEnabled",
        nestedPath: "workspace.deviceToolsEnabled",
        effect:
          "the session host no longer reads it: a session there gets the tools the person's Claude Desktop serves whenever the organization's policy can be read, and a single tool, or every bridged server, is turned off with a managedMcpServers deny rule (the policy-only remote-devices row), while what the computer itself runs stays governed by isLocalDevMcpEnabled and the plugin server lists, except the local (stdio) MCP servers of plugins in the organization plugins directory, which start while the plugin is switched on unless a managed server has the same name; a session host older than that still reads it and treats absent as off, so remove it only once the session host has updated; nothing replaces it",
      },
      {
        name: "selfHostedOidcTokenStorage",
        nestedPath: "selfHosted.credential.tokenStorage",
        effect:
          "the session host sign-in is always kept in the operating system's secure storage; nothing replaces it",
      },
      ...[
        [
          "selfHostedCredentialKind",
          'inferenceCredentialKind instead (where this was "interactive", write "external-idp")',
        ],
        ["selfHostedOidc", "inferenceIdpOidc instead"],
        ["selfHostedOidcAuthFlow", "inferenceIdpAuthFlow instead"],
        ["selfHostedCredentialHelper", "inferenceCredentialHelper instead"],
        ["selfHostedCredentialHelperTtlSec", "inferenceCredentialHelperTtlSec instead"],
        ["selfHostedCredentialHelperTimeoutSec", "inferenceCredentialHelperTimeoutSec instead"],
        [
          "selfHostedCredentialHelperSilentRefreshEnabled",
          "inferenceCredentialHelperSilentRefreshEnabled instead",
        ],
      ].map(([e, t]) => ({
        name: e,
        effect: `the session host's credential is now read from the inference credential keys: set ${t}`,
      })),
    ],
  };
  var xx = Object.values(Yde).flat();
  Kx.RETIRED_FLAT_KEYS = xx.map((e) => e.name);
  function Jde(e) {
    var t;
    let lower = e.toLowerCase();
    return (t = xx.find((o) => {
      var r;
      return (
        o.name.toLowerCase() === lower ||
        ((r = o.nestedPath) === null || r === undefined ? undefined : r.toLowerCase()) === lower
      );
    })) === null || t === undefined
      ? undefined
      : t.effect;
  }
  Kx.FORMER_NESTED_PATHS = [];
  var Lx = Object.fromEntries(
    Kx.FLAT_KEYS.map((e) => {
      var t;
      var n;
      return [
        e,
        (n = (t = Ii.DISCRIMINATORS[e]) === null || t === undefined ? undefined : t.node) !== null &&
        n !== undefined
          ? n
          : Od.get(e).node,
      ];
    }),
  );
  Kx.INFERENCE_LEAF_MEMBERSHIP = new Map(
    [...Od].filter(([, e]) => e.armContext).map(([e, t]) => [e, t.armContext]),
  );
  var fieldProviders = (e) => {
    var t;
    var n;
    let o =
      (n =
        (t = Kx.INFERENCE_LEAF_MEMBERSHIP.get(e)) === null || t === undefined ? undefined : t.providers) !==
        null && n !== undefined
        ? n
        : [];
    return o.length === Se.PROVIDERS.length ? [] : o;
  };
  Kx.fieldProviders = fieldProviders;
  function Qde(e) {
    var t;
    let n = [];
    for (let [o, r] of Kx.INFERENCE_LEAF_MEMBERSHIP) {
      let s = Mr(o);
      if (
        r.credentialKinds.length === 0 &&
        r.providers.includes(e) &&
        Se.isReadBy(s, "desktop") &&
        ((t = s.predicates) === null || t === undefined ? undefined : t.required)
      )
        n.push(o);
    }
    return n;
  }
  Kx.FLAT_KEY_TO_NESTED_PATH = new Map([
    ...[...Od].map(([e, t]) => [e, t.path]),
    ...Object.entries(Ii.DISCRIMINATORS).map(([key, value]) => [key, value.nestedPath]),
  ]);
  function efe() {
    for (let key of Object.keys(Ii.DISCRIMINATORS))
      if (Od.has(key)) throw Error(`flat schema drift: discriminator "${key}" is also a canonical leaf`);
    for (let [key, value] of Object.entries(Lx)) {
      let n = Se.fieldMetaForNode(value);
      if ((n === null || n === undefined ? undefined : n.flatKey) !== key)
        throw Error(
          `flat schema drift: "${key}" flatKey is "${n === null || n === undefined ? undefined : n.flatKey}"`,
        );
    }
  }
  efe();
  function tfe() {
    Nx({
      buildLazy: false,
    });
  }
  function nfe() {
    return Nx({
      buildLazy: true,
    });
  }
  function Nx(e) {
    let t = [];
    let n = new Set([Se.ZodKind.ZodLiteral, Se.ZodKind.ZodUndefined, Se.ZodKind.ZodNever]);
    let o = new Set([
      Se.ZodKind.ZodObject,
      Se.ZodKind.ZodArray,
      Se.ZodKind.ZodUnion,
      Se.ZodKind.ZodDiscriminatedUnion,
    ]);
    let r = (s, a, l) => {
      if (Se.isLazySchema(s)) {
        if (!e.buildLazy)
          throw Error(
            `field coverage drift: "${a}" is a lazy schema below an eager node \u2014 make the enclosing field()/subfield() value type the lazy one, or keep this node eager`,
          );
        t.push(a);
      }
      let c = Se.unwrapZod(s);
      let u = Se.zodKind(c);
      if (u === Se.ZodKind.ZodArray) {
        let f = Se.arrayElementOf(c);
        if (f) r(f, `${a}[]`, l);
        return;
      }
      if (u === Se.ZodKind.ZodUnion || u === Se.ZodKind.ZodDiscriminatedUnion) {
        for (let f of Se.unionOptionsOf(c)) r(f, a, l);
        return;
      }
      if (u !== Se.ZodKind.ZodObject) return;
      for (let [key, value] of Object.entries(c.shape)) {
        let m = value;
        let y = `${a}.${key}`;
        let b = Se.fieldMetaForNode(m) !== undefined;
        let w = Se.subfieldMetaForNode(m) !== undefined;
        if (Se.isLazySchema(m) && !e.buildLazy) {
          if (!b && !w)
            throw Error(`field coverage drift: "${y}" is a lazy schema with no field()/subfield() metadata`);
          continue;
        }
        let S = Se.zodKind(Se.unwrapZod(m));
        if (l) {
          if (!w && !n.has(S)) throw Error(`subfield coverage drift: "${y}" lacks subfield() metadata`);
        } else if (!b && !w && !n.has(S) && !o.has(S))
          throw Error(`field coverage drift: "${y}" is a primitive leaf with no field()/subfield() metadata`);
        r(m, y, l || b);
      }
    };
    r(Ii.ManagedConfig, "ManagedConfig", false);
    return t;
  }
  tfe();
  Kx.FlatManagedConfig = Dx.z.object(Lx);
  Kx.allKeys = Object.keys(Kx.FlatManagedConfig.shape);
  var Kc = new Map(
    Kx.allKeys.map((key) => {
      let t = Se.fieldMetaForNode(Kx.FlatManagedConfig.shape[key]);
      if (!t) throw Error(`No field() metadata for key: ${key}`);
      return [key, t];
    }),
  );
  function Mr(e) {
    let t = Kc.get(e);
    if (!t) throw Error(`No field() metadata for key: ${String(e)}`);
    return t;
  }
  function Km(e) {
    return Kc.get(e);
  }
  function rfe(e) {
    var t;
    return ((t = Km(e)) === null || t === undefined ? undefined : t.emptyListIsAuthored) === true;
  }
  var filtered = Kx.allKeys.filter((key) => Se.effectiveVisibility(Kc.get(key)) !== "internal-only");
  var Tx = new Map();
  function Fs(e) {
    var t;
    let n = (t = e.reader) !== null && t !== undefined ? t : "desktop";
    let o = `${String(e.includeInternal)}:${n}`;
    let r = Tx.get(o);
    if (r === undefined) {
      r = (e.includeInternal ? Kx.allKeys : filtered).filter((s) => Se.isReadBy(Kc.get(s), n));
      Tx.set(o, r);
    }
    return r;
  }
  var ofe = (e) => (e === undefined ? [] : "scopes" in e ? [e] : e);
  var Ux = (e) => ofe(e).flatMap((t) => t.scopes);
  function Zm(e) {
    return Ux(e.support.enabled);
  }
  function zx(e) {
    return Ux(e.support.deprecated);
  }
  var wd;
  function sfe(e) {
    if (!(wd !== null && wd !== undefined))
      wd = [...Kc.values()].flatMap((t) => {
        var n;
        return (n = t.activatesThirdPartyMode) !== null && n !== undefined ? n : [];
      });
    return wd.some((t) => t(e, false)) || Mx.isSelfHostedOnly(e) || Oa.unreadableActivators(e).length > 0;
  }
  var isPublished3pKey = (e) =>
    Se.effectiveVisibility(e) === "public" && (Zm(e).includes("3p") || zx(e).includes("3p"));
  Kx.isPublished3pKey = isPublished3pKey;
  function lfe(e, t) {
    for (let n of Fs({
      ...t,
      includeInternal: true,
    })) {
      if (e[n] !== undefined || Kx.INFERENCE_LEAF_MEMBERSHIP.has(n)) continue;
      let o = Se.runtimeDefault(Mr(n));
      if (o !== undefined) e[n] = o;
    }
    return e;
  }
  function cfe(e) {
    return Fs({
      ...e,
      includeInternal: true,
    }).filter((t) => !Kx.INFERENCE_LEAF_MEMBERSHIP.has(t) && Se.runtimeDefault(Mr(t)) !== undefined);
  }
  var isInferenceConnectionKey = (e) => {
    var t;
    return (
      ((t = Kx.FLAT_KEY_TO_NESTED_PATH.get(e)) === null || t === undefined ? undefined : t[0]) === "inference"
    );
  };
  Kx.isInferenceConnectionKey = isInferenceConnectionKey;
  function dfe(e) {
    let t = typeof e === "function" ? e : (n) => Boolean(n[e]);
    return Kx.allKeys.filter((key) => {
      let remotePolicy = Mr(key).remotePolicy;
      return remotePolicy !== undefined && t(remotePolicy);
    });
  }
  var $x = new Map();
  function Fx(e) {
    let t = $x.get(e);
    if (!t) {
      t = Kx.allKeys.flatMap((key) => {
        let platformVariant = Mr(key).platformVariant;
        return (platformVariant === null || platformVariant === undefined
          ? undefined
          : platformVariant.platform) === e
          ? [[key, platformVariant.of]]
          : [];
      });
      $x.set(e, t);
    }
    return t;
  }
  function ww(e, t) {
    let n = {
      ...e,
    };
    for (let [o, r] of Fx(t)) if (jx.isFieldSet(n[o])) n[r] = n[o];
    return n;
  }
  function Bx(e, t, n) {
    var o;
    var r;
    var s;
    let remotePolicy = (o = Km(e)) === null || o === undefined ? undefined : o.remotePolicy;
    return (
      (remotePolicy === null || remotePolicy === undefined ? undefined : remotePolicy.hotApplied) === true ||
      ((s =
        (r =
          remotePolicy === null || remotePolicy === undefined ? undefined : remotePolicy.hotAppliedWhen) ===
          null || r === undefined
          ? undefined
          : r.call(remotePolicy, t, n)) !== null && s !== undefined
        ? s
        : false)
    );
  }
  function ffe(e, t, n) {
    var o;
    let [r, s] = n === undefined ? [e, t] : [ww(e, n), ww(t, n)];
    let a = [];
    for (let l of new Set([...Object.keys(r), ...Object.keys(s)])) {
      if (
        Bx(l, r[l], s[l]) ||
        (n !== undefined && ((o = Km(l)) === null || o === undefined ? undefined : o.platformVariant))
      )
        continue;
      if (Oa.canonicalJson(r[l]) !== Oa.canonicalJson(s[l])) a.push(l);
    }
    return a;
  }
  function pfe(e, t, n = {}) {
    let filtered = Kx.allKeys.filter((key) => {
      var u;
      return n.unconditionalOnly
        ? ((u = Mr(key).remotePolicy) === null || u === undefined ? undefined : u.hotApplied) === true
        : Bx(key, e.config[key], t.config[key]);
    });
    let r = new Set(filtered);
    let s = (c, u) => Oa.canonicalJson([c.config[u], c.reports.filter((report) => report.key === u)]);
    let filtered_2 = filtered.filter((c) => s(e, c) !== s(t, c));
    let l = {
      ...e.config,
    };
    for (let c of filtered_2)
      if (t.config[c] === undefined) delete l[c];
      else l[c] = t.config[c];
    return {
      config: l,
      reports: [
        ...e.reports.filter((report) => !r.has(report.key)),
        ...t.reports.filter((report) => r.has(report.key)),
      ],
      moved: filtered_2,
    };
  }
  function hfe(e) {
    return Kx.bootstrapableKeys(e).filter((t) => {
      var n;
      var o;
      let r = Mr(t);
      let applyUnverified = (n = r.remotePolicy) === null || n === undefined ? undefined : n.applyUnverified;
      if (
        ((o = r.remotePolicy) === null || o === undefined ? undefined : o.requiresUserConsent) ||
        applyUnverified === false
      )
        return false;
      return applyUnverified === true || Ow(r.failClosedValue);
    });
  }
  function Hx(e, t) {
    var n;
    let o = Mr(e);
    let applyUnverified = (n = o.remotePolicy) === null || n === undefined ? undefined : n.applyUnverified;
    if (applyUnverified === true) return t;
    if (!Ow(o.failClosedValue) || applyUnverified === false) return;
    return applyUnverified === "asFailClosed" || t === o.failClosedValue ? o.failClosedValue : undefined;
  }
  function mfe(e, t) {
    return Hx(e, t) !== undefined;
  }
  function gfe(e) {
    var t;
    return (
      ((t = Mr(e).remotePolicy) === null || t === undefined ? undefined : t.applyUnverified) ===
      "asFailClosed"
    );
  }
  function yfe(e, t) {
    let n = Mr(e);
    return Ow(n.failClosedValue) && t === n.failClosedValue;
  }
  var Ow = (failClosedValue) =>
    failClosedValue !== undefined && failClosedValue !== null && typeof failClosedValue !== "object";
  var Rx = new Map();
  function _fe(e, t) {
    var n;
    let o = `${e}:${String(t.includeInternal)}:${(n = t.reader) !== null && n !== undefined ? n : "desktop"}`;
    let r = Rx.get(o);
    if (r === undefined) {
      r = Fs(t).filter((s) => Kc.get(s).support.executionTarget === e);
      Rx.set(o, r);
    }
    return r;
  }
  function bfe(e) {
    return new Set(Fs(e).filter((t) => Mr(t).appBehaviorOnly));
  }
  var isBootstrapableMeta = (e) => {
    var t;
    return (
      Zm(e).includes("3p") &&
      ((t = e.remotePolicy) === null || t === undefined ? undefined : t.type) !== "remote-disabled"
    );
  };
  Kx.isBootstrapableMeta = isBootstrapableMeta;
  var isBootstrapable = (e) => Kx.isBootstrapableMeta(Mr(e));
  Kx.isBootstrapable = isBootstrapable;
  var bootstrapableKeys = (e) => Fs(e).filter(Kx.isBootstrapable);
  Kx.bootstrapableKeys = bootstrapableKeys;
  var nonBootstrapableKeys = (e) => Fs(e).filter((t) => !Kx.isBootstrapable(t));
  Kx.nonBootstrapableKeys = nonBootstrapableKeys;
  function kfe(e) {
    var t;
    let n = {};
    for (let o of Fs(e)) {
      let r = (t = Mr(o).remotePolicy) === null || t === undefined ? undefined : t.default;
      if (r !== undefined) n[o] = r;
    }
    return n;
  }
  var staticTierKeys = (e) => Fs(e).filter((t) => !Se.isRemoteOnly(Mr(t)));
  Kx.staticTierKeys = staticTierKeys;
  var isStaticTier3pKey = (e) => {
    let t = Mr(e);
    return Zm(t).includes("3p") && !Se.isRemoteOnly(t);
  };
  Kx.isStaticTier3pKey = isStaticTier3pKey;
});
//@ chunk-1ny7cxrt.js:1131674-1143470 cjs-unmatched+string-clue
var Rw = x(function (uL) {
  Object.defineProperty(uL, "__esModule", {
    value: true,
  });
  uL._test = undefined;
  uL.toBoolean = Iw;
  uL.coerceRawValue = Cw;
  uL.standInFailClosed = Tw;
  uL.assignParsedKey = rL;
  uL.legacyNameNotice = $w;
  uL.resolveLegacyFlatKeys = iL;
  uL.detectDeprecations = ape;
  uL.wholeKeyNotice = oL;
  uL.hybridOnlyDropMessage = sL;
  uL.stripHybridOnlySubfieldPaths = aL;
  uL.parseConfigRecord = cpe;
  uL.stripEmptyKeys = upe;
  uL.parseForceLoginOrgUUIDs = dpe;
  uL.enforceConfigurationValues = fpe;
  uL.configurationWarnings = hpe;
  uL.keyedConfigurationWarnings = cL;
  var Tt = Xr();
  var Jx = gr();
  var xn = yt();
  var Xx = $n();
  var ft = Ir();
  var Qx = oa();
  var eL = Hu();
  var tL = bd();
  var nL = Cc();
  var Vm = _d();
  var Zc = Hm();
  var St = gs();
  var Vc = Ns();
  var Aw = () =>
    St.flatConfigKeys({
      includeInternal: true,
    });
  function Iw(e) {
    if (e === null || e === undefined) return;
    if (typeof e === "boolean") return e;
    if (typeof e === "number") {
      if (e === 1) return true;
      if (e === 0) return false;
      return;
    }
    if (typeof e !== "string") return;
    let lower = e.trim().replace(/\r/g, "").toLowerCase();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
    return;
  }
  function ope(issue) {
    var t;
    var n;
    var o;
    if (issue.code === "invalid_value")
      return ((n = (t = issue.values) === null || t === undefined ? undefined : t.length) !== null &&
      n !== undefined
        ? n
        : 0) === 1
        ? "invalid_literal"
        : "invalid_enum_value";
    if (issue.code === "invalid_format") return "invalid_string";
    if (issue.code === "invalid_union" && issue.discriminator !== undefined)
      return "invalid_union_discriminator";
    return (o = issue.code) !== null && o !== undefined ? o : "unknown";
  }
  function spe(issue) {
    return issue.code === "custom" || (issue.code === "invalid_format" && issue.format === "regex");
  }
  function Cw(e, t) {
    return xn.zodKind(e) === xn.ZodKind.ZodString || xn.zodKind(e) === xn.ZodKind.ZodEnum
      ? t
      : Vc.coerceJsonString(t);
  }
  function Tw(e, t, n) {
    let fieldMeta = St.getFieldMeta(t);
    if ("failClosedValue" in fieldMeta) {
      e[t] = fieldMeta.failClosedValue;
      if (!(n === null || n === undefined)) n();
    }
  }
  function rL(e, t, n, o, r = {}) {
    var s;
    var a;
    var l;
    var c;
    if (n === null || n === undefined) return;
    if (n === "") return;
    let u = (s = r.def) !== null && s !== undefined ? s : St.FlatManagedConfig.shape[t];
    let f = () => Tw(e, t, r.onFailClosed);
    let h = xn.unwrapZod(u);
    if (xn.zodKind(h) === xn.ZodKind.ZodBoolean) {
      let M = Iw(n);
      if (M !== undefined) e[t] = M;
      else {
        o(`Managed config "${t}" is not a valid boolean`);
        f();
      }
      return;
    }
    let m = Cw(h, n);
    if (m instanceof Date || m instanceof Map || m instanceof Set) {
      o(`Failed to parse managed config "${t}": .: invalid_type`);
      f();
      return;
    }
    let y = u.safeParse(m);
    let fieldMeta = St.getFieldMeta(t);
    let w = (M, N) => o(M, N !== null && N !== undefined ? N : "drop");
    let S = () =>
      Vc.reportUnread(t, u, m, w, {
        values: y.success && !fieldMeta.checkDropped,
      });
    if (y.success) {
      e[t] = y.data;
      S();
      if (r.channel !== "hybrid") aL(y.data, lpe(t), (N) => o(sL(t, N), "drop"));
      if (!((a = fieldMeta.checkDropped) === null || a === undefined)) a.call(fieldMeta, m, w);
      let M = Yx(m);
      if (
        "failClosedValue" in fieldMeta &&
        M > 0 &&
        Array.isArray(m) === Array.isArray(y.data) &&
        Yx(y.data) === 0
      ) {
        o(`Failed to parse managed config "${t}": none of its ${M} entries could be read`);
        f();
      }
      return;
    }
    let joined = y.error.issues
      .map((issue) =>
        spe(issue)
          ? `${issue.path.join(".") || "."}: ${issue.message}`
          : `${issue.path.join(".") || "."}: ${ope(issue)}`,
      )
      .join("; ");
    if (!((l = r.onIssues) === null || l === undefined))
      l.call(
        r,
        y.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      );
    o(`Failed to parse managed config "${t}": ${joined}`);
    f();
    S();
    if (!((c = fieldMeta.checkDropped) === null || c === undefined)) c.call(fieldMeta, m, w);
  }
  var Sa = (e) => e === null || e === undefined || e === "";
  function Yx(e) {
    if (Array.isArray(e)) return e.length;
    return e !== null && typeof e === "object" && Object.getPrototypeOf(e) === Object.prototype
      ? Object.keys(e).length
      : -1;
  }
  function $w(e, t = St.getFieldMeta(e)) {
    if (t.legacyFlatKey === undefined) return;
    let { name: n, ...o } = t.legacyFlatKey;
    return {
      path: n,
      use: e,
      ...o,
    };
  }
  function iL(e, t, n = {}) {
    let o = {
      ...e,
    };
    let r =
      o.inferenceCredentialKind === "external-idp" ||
      (ft.IDP_OIDC_FLAT_KEY !== undefined && !Sa(o[ft.IDP_OIDC_FLAT_KEY])) ||
      (ft.IDP_AUTH_FLOW_FLAT_KEY !== undefined && !Sa(o[ft.IDP_AUTH_FLOW_FLAT_KEY]));
    let s = (c) => n.editor === true && c.editorPreserves === true && !r;
    let a = (c) => !s(c) && Tt.isDeprecationHonoured(c);
    for (let key of St.allKeys) {
      let legacyFlatKey = St.getFieldMeta(key).legacyFlatKey;
      if (legacyFlatKey === undefined || !(legacyFlatKey.name in o)) continue;
      if (o[key] === undefined && !Sa(o[legacyFlatKey.name]))
        if (Tt.isDeprecationHonoured(legacyFlatKey)) o[key] = o[legacyFlatKey.name];
        else if (!(t === null || t === undefined)) t(key, Tt.describeDeprecation($w(key)));
      delete o[legacyFlatKey.name];
    }
    if (
      Tt.isDeprecationHonoured(ft.GATEWAY_AUTH_SCHEME_SSO) &&
      Tt.deprecationApplies(ft.GATEWAY_AUTH_SCHEME_SSO, o.inferenceGatewayAuthScheme, o)
    ) {
      if (o.inferenceProvider === "gateway" && o.inferenceCredentialKind === undefined)
        o.inferenceCredentialKind = "interactive";
      delete o.inferenceGatewayAuthScheme;
    }
    let inferenceProvider = typeof o.inferenceProvider === "string" ? o.inferenceProvider : undefined;
    if (
      Tt.isDeprecationHonoured(ft.VERTEX_OAUTH_CREDENTIAL_KIND) &&
      Tt.deprecationApplies(ft.VERTEX_OAUTH_CREDENTIAL_KIND, o.inferenceCredentialKind, o)
    )
      o.inferenceCredentialKind = Qx.legacyCredentialKindAlias(inferenceProvider, o.inferenceCredentialKind);
    if (
      Tt.isDeprecationHonoured(ft.VERTEX_INTERACTIVE_WITH_AUDIENCE) &&
      Tt.deprecationApplies(ft.VERTEX_INTERACTIVE_WITH_AUDIENCE, o.inferenceCredentialKind, o)
    )
      o.inferenceCredentialKind = "workforce";
    if (
      ft.IDP_OIDC_FLAT_KEY !== undefined &&
      a(ft.GATEWAY_IDP_OIDC_KEY) &&
      Tt.deprecationApplies(ft.GATEWAY_IDP_OIDC_KEY, o.inferenceGatewayOidc, o)
    ) {
      if (Sa(o[ft.IDP_OIDC_FLAT_KEY])) o[ft.IDP_OIDC_FLAT_KEY] = o.inferenceGatewayOidc;
      o.inferenceCredentialKind = "external-idp";
      delete o.inferenceGatewayOidc;
    }
    if (
      ft.IDP_AUTH_FLOW_FLAT_KEY !== undefined &&
      a(ft.GATEWAY_IDP_AUTH_FLOW_KEY) &&
      Tt.deprecationApplies(ft.GATEWAY_IDP_AUTH_FLOW_KEY, o.inferenceGatewayOidcAuthFlow, o)
    ) {
      if (Sa(o[ft.IDP_AUTH_FLOW_FLAT_KEY])) o[ft.IDP_AUTH_FLOW_FLAT_KEY] = o.inferenceGatewayOidcAuthFlow;
      delete o.inferenceGatewayOidcAuthFlow;
    }
    if (
      a(ft.GATEWAY_INTERACTIVE_WITH_IDP) &&
      Tt.deprecationApplies(ft.GATEWAY_INTERACTIVE_WITH_IDP, o.inferenceCredentialKind, o)
    )
      o.inferenceCredentialKind = "external-idp";
    return o;
  }
  function ape(e, t = {}) {
    var n;
    let o = [];
    for (let r of (n = t.keys) !== null && n !== undefined ? n : Aw()) {
      let fieldMeta = St.getFieldMeta(r);
      let legacyFlatKey = fieldMeta.legacyFlatKey;
      let l =
        legacyFlatKey !== undefined &&
        e[r] === undefined &&
        Object.hasOwn(e, legacyFlatKey.name) &&
        !Sa(e[legacyFlatKey.name]);
      if (l) o.push(Tt.deprecationHit(r, $w(r, fieldMeta)));
      if (!fieldMeta.deprecations) continue;
      let c = l ? e[legacyFlatKey.name] : e[r];
      if (Sa(c)) continue;
      let u = Cw(xn.unwrapZod(St.FlatManagedConfig.shape[r]), c);
      for (let deprecation of fieldMeta.deprecations) {
        if (t.editor && deprecation.editorPreserves && !ft.editorListsGatewayIdpNotices()) continue;
        if (Tt.deprecationApplies(deprecation, u, e)) o.push(Tt.deprecationHit(r, deprecation));
      }
    }
    return o;
  }
  function oL(fieldMeta) {
    var t;
    return (t = fieldMeta.deprecations) === null || t === undefined ? undefined : t.find(Tt.isWholeKeyNotice);
  }
  function sL(e, t) {
    return `Managed config "${e}.${t}" dropped: "${t}" is only honored when delivered by the Anthropic-hosted control plane`;
  }
  var Ew = new Map();
  function lpe(e) {
    let t = Ew.get(e);
    if (!t) {
      t = xn.hybridOnlySubfieldKeys(St.FlatManagedConfig.shape[e]);
      Ew.set(e, t);
    }
    return t;
  }
  function Pw(e, t) {
    if (Array.isArray(e)) {
      let s = false;
      for (let a of e) s = Pw(a, t) || s;
      return s;
    }
    if (e === null || typeof e !== "object" || t.length === 0) return false;
    let n = e;
    let [o, ...r] = t;
    if (r.length === 0) {
      if (n[o] === undefined) return false;
      delete n[o];
      return true;
    }
    return Pw(n[o], r);
  }
  function aL(e, t, n) {
    for (let o of t) if (Pw(e, o.split("."))) n(o);
  }
  function cpe(e, t) {
    var n;
    var o;
    var r;
    let s =
      (n = t === null || t === undefined ? undefined : t.allowedKeys) !== null && n !== undefined ? n : Aw();
    let a = new Set(s);
    let l = new Set();
    let c = iL(
      e,
      (h, m) => {
        var y;
        if (a.has(h)) {
          if (!((y = t === null || t === undefined ? undefined : t.onInvalid) === null || y === undefined))
            y.call(t, h, m);
          l.add(h);
        }
      },
      {
        editor: t === null || t === undefined ? undefined : t.editor,
      },
    );
    let u = {};
    let f = (h) =>
      Tw(u, h, () => {
        var m;
        return (m = t === null || t === undefined ? undefined : t.onFailClosed) === null || m === undefined
          ? undefined
          : m.call(t, h);
      });
    for (let h of s) {
      if (l.has(h)) {
        f(h);
        continue;
      }
      let m = oL(St.getFieldMeta(h));
      if (m !== undefined && !Tt.isDeprecationHonoured(m) && !Sa(c[h])) {
        if (!((o = t === null || t === undefined ? undefined : t.onInvalid) === null || o === undefined))
          o.call(t, h, Tt.describeDeprecation(m));
        f(h);
        continue;
      }
      rL(
        u,
        h,
        c[h],
        (y, b) => {
          var w;
          var S;
          return b === undefined
            ? (w = t === null || t === undefined ? undefined : t.onInvalid) === null || w === undefined
              ? undefined
              : w.call(t, h, y)
            : (S = t === null || t === undefined ? undefined : t.onInvalid) === null || S === undefined
              ? undefined
              : S.call(t, h, y, b);
        },
        {
          def:
            (r = t === null || t === undefined ? undefined : t.schemaFor) === null || r === undefined
              ? undefined
              : r.call(t, h),
          onFailClosed: () => {
            var y;
            return (y = t === null || t === undefined ? undefined : t.onFailClosed) === null ||
              y === undefined
              ? undefined
              : y.call(t, h);
          },
          onIssues: (y) => {
            var b;
            return (b = t === null || t === undefined ? undefined : t.onIssues) === null || b === undefined
              ? undefined
              : b.call(t, h, y);
          },
          channel: t === null || t === undefined ? undefined : t.channel,
        },
      );
    }
    return u;
  }
  function upe(e, t) {
    let n = {};
    for (let o of Aw()) {
      if (t === null || t === undefined ? undefined : t.scope) {
        let fieldMeta = St.getFieldMeta(o);
        if (!St.enabledScopes(fieldMeta).includes(t.scope)) continue;
        if (xn.isRemoteOnly(fieldMeta)) continue;
      }
      let r = e[o];
      if (r === undefined || r === null || r === "") continue;
      if (Array.isArray(r)) {
        if (r.length === 0 && !St.keepsAuthoredEmptyList(o)) continue;
      } else if (typeof r === "object" && Object.keys(r).length === 0) continue;
      n[o] = r;
    }
    return n;
  }
  function dpe(e) {
    var t;
    if (e === undefined || e.trim() === "") return null;
    return (t = tL.forceLoginOrgUUIDList(e)) !== null && t !== undefined ? t : [];
  }
  function fpe(e, t) {
    let n = {
      ...e,
    };
    if (t === null || t === undefined ? undefined : t.mode) {
      for (let key of St.allKeys)
        if (St.deprecatedScopes(St.getFieldMeta(key)).includes(t.mode) && n[key] !== undefined) delete n[key];
    }
    let o = lL(n, t);
    if (o && "reenable" in o) n[o.reenable] = true;
    return n;
  }
  function ppe(e) {
    for (let t of nL.SURFACE_GRANT_FIELDS) {
      let flatKey = t.flatKey;
      let o = xn.surfaceGrantFor(t.grants, e[flatKey]);
      if (o)
        return {
          key: flatKey,
          grant: o,
        };
    }
    return;
  }
  function lL(e, t) {
    var n;
    var o;
    if (
      (t === null || t === undefined ? undefined : t.mode) === "1p" ||
      e.isClaudeCodeForDesktopEnabled !== false
    )
      return;
    let r = ppe(e);
    if (r !== undefined) {
      if (r.grant.chat || r.grant.cowork) return;
      return ((n = t === null || t === undefined ? undefined : t.stoodIn) === null || n === undefined
        ? undefined
        : n.has("isClaudeCodeForDesktopEnabled")) && !t.stoodIn.has(r.key)
        ? {
            reenable: "isClaudeCodeForDesktopEnabled",
          }
        : {
            noSurface: true,
          };
    }
    if (e.coworkTabEnabled !== false || e.chatTabEnabled === true) return;
    return {
      reenable:
        ((o = t === null || t === undefined ? undefined : t.stoodIn) === null || o === undefined
          ? undefined
          : o.has("isClaudeCodeForDesktopEnabled")) && !t.stoodIn.has("coworkTabEnabled")
          ? "isClaudeCodeForDesktopEnabled"
          : "coworkTabEnabled",
    };
  }
  function hpe(e, t) {
    return cL(e, t).map((n) => n.msg);
  }
  function cL(e, t) {
    var n;
    var o;
    var r;
    let s = [];
    let a = (key, msg) => {
      s.push({
        key,
        msg,
      });
    };
    let l = {
      ...e,
    };
    if (t === null || t === undefined ? undefined : t.mode) {
      for (let key of St.allKeys)
        if (St.deprecatedScopes(St.getFieldMeta(key)).includes(t.mode) && l[key] !== undefined) {
          a(
            key,
            `${key} is deprecated for ${t.mode} mode and is being ignored. Remove it from your configuration.`,
          );
          delete l[key];
        }
    }
    for (let u of Vm.builtinRuleWarnings(
      "disabledBuiltinTools",
      (n = l.disabledBuiltinTools) !== null && n !== undefined ? n : [],
    ))
      a("disabledBuiltinTools", u);
    for (let u of Vm.builtinRuleWarnings(
      "builtinToolPolicy",
      Object.keys((o = l.builtinToolPolicy) !== null && o !== undefined ? o : {}),
    ))
      a("builtinToolPolicy", u);
    if (
      l.modelDiscoveryEnabled === false &&
      ((r = l.inferenceModels) === null || r === undefined
        ? undefined
        : r.some(
            (u) =>
              typeof (u === null || u === undefined ? undefined : u.name) === "string" &&
              eL.ANTHROPIC_TIER_NAMES.some((f) => f === u.name.toLowerCase()),
          ))
    )
      a("inferenceModels", "Aliases like 'sonnet' are resolved via model discovery. Use the full model ID.");
    if (
      l.inferenceCredentialKind &&
      l.inferenceProvider &&
      Zc.credentialSpecCell(l.inferenceProvider, l.inferenceCredentialKind) === undefined
    )
      a(
        "inferenceCredentialKind",
        `inferenceCredentialKind "${l.inferenceCredentialKind}" is not supported for provider "${l.inferenceProvider}" and is being ignored.`,
      );
    if (!l.inferenceCredentialKind && l.inferenceProvider) {
      let u = Zc.presentCredentialKinds(l);
      if (u.length > 1) {
        let f = Zc.deriveInferenceCredentialKind(l);
        a(
          "inferenceCredentialKind",
          `Multiple credential methods configured (${u.join(", ")}); using ${f}. Clear unused fields or set Credential kind explicitly to avoid ambiguity.`,
        );
      }
    }
    if (
      l.inferenceProvider === "gateway" &&
      l.inferenceGatewayAuthScheme !== "x-api-key" &&
      l.inferenceGatewayBaseUrl
    )
      try {
        if (Jx.isAnthropicHost(new URL(l.inferenceGatewayBaseUrl).hostname))
          a(
            "inferenceGatewayBaseUrl",
            "Gateway baseUrl is an anthropic.com host but authScheme is not x-api-key. Consider switching to inferenceProvider: anthropic",
          );
      } catch (error) {}
    let c = lL(l, t);
    if (c && "reenable" in c)
      a(
        c.reenable,
        `At least one surface must remain enabled; ${c.reenable === "coworkTabEnabled" ? "Cowork" : "Code"} has been re-enabled.`,
      );
    else if (c)
      a(
        "isClaudeCodeForDesktopEnabled",
        "No surface is enabled, so the app has nothing to open. Turn on at least one surface.",
      );
    return s;
  }
  uL._test = {
    toBoolean: Iw,
    normalizeWinPathJSON: Vc.normalizeWinPathJSON,
    coerceKvRecord: Xx._test.coerceKvRecord,
    hybridOnlySubfieldPathsMemo: Ew,
  };
});
//@ chunk-1ny7cxrt.js:1143470-1146192 cjs-unmatched+string-clue
var _L = x(function (gL) {
  var qm;
  var Dw;
  var Mw;
  Object.defineProperty(gL, "__esModule", {
    value: true,
  });
  gL.REDACTED = undefined;
  gL.isSensitiveDropped = Lw;
  gL.isRedactedInExports = $pe;
  gL.resolveRedactPolicy = Nw;
  gL.redactedSnapshot = xpe;
  gL.reducedSnapshot = Lpe;
  gL.redactSensitiveKeys = Npe;
  var Gm = gr();
  var jr = yt();
  var fL = _d();
  var Ci = gs();
  function Lw(e) {
    let t = jr.redactPolicyOf(Ci.FlatManagedConfig.shape[e]);
    return t === "drop" || t === "presence";
  }
  function $pe(e) {
    return Lw(e) || Ci.getFieldMeta(e).multiline === true;
  }
  var Rpe =
    ((Mw =
      (Dw = (qm = globalThis.crypto) === null || qm === undefined ? undefined : qm.randomUUID) === null ||
      Dw === undefined
        ? undefined
        : Dw.call(qm)) !== null && Mw !== undefined
      ? Mw
      : String(Math.random())) + ":";
  var Dpe = {
    [jr.ZodKind.ZodBoolean]: (e) => typeof e === "boolean",
    [jr.ZodKind.ZodNumber]: (e) => typeof e === "number",
    [jr.ZodKind.ZodEnum]: (e, t) => {
      var n;
      return (
        typeof e === "string" &&
        ((n = jr.enumOptionsOf(t)) === null || n === undefined ? undefined : n.includes(e)) === true
      );
    },
  };
  function pL(e) {
    let t = jr.zodKind(jr.unwrapZod(e));
    return t && Dpe[t];
  }
  function Nw(e) {
    var t;
    let n = Ci.FlatManagedConfig.shape[e];
    return (t = jr.redactPolicyOf(n)) !== null && t !== undefined ? t : pL(n) ? "keep" : "presence";
  }
  function hL(e, t) {
    if (Array.isArray(e))
      return {
        count: e.length,
      };
    if (t && e && typeof e === "object")
      return {
        keys: Object.keys(e),
      };
    return e !== null && e !== undefined;
  }
  function Mpe(e) {
    let t = 0;
    for (let j = 0; j < e.length; j++) {
      t = (t << 5) - t + e.charCodeAt(j);
      t = t & t;
    }
    return ((t & 4294967295) >>> 0).toString();
  }
  var jw = (e) => Mpe(Rpe + (typeof e === "string" ? e : JSON.stringify(e)));
  var xw = (e, t) => {
    let n = typeof e === "string" ? fL.parseBuiltinRule(e) : undefined;
    if (n === undefined) return `#${String(t + 1)}`;
    return n.content === undefined ? n.tool : `${n.tool}(#${String(t + 1)})`;
  };
  function jpe(e, t) {
    var n;
    switch (e) {
      case "keep":
        return t;
      case "hash":
        return Array.isArray(t) ? t.map(jw) : jw(t);
      case "toolRules":
        if (Array.isArray(t)) return t.map(xw);
        if (t && typeof t === "object")
          return Object.fromEntries(
            Object.entries(t).map(([key, value], s) => [
              xw(key, s),
              value === "allow" || value === "ask" ? value : jw(value),
            ]),
          );
        return xw(t, 0);
      case "hostname":
        return Array.isArray(t)
          ? t.map((o) => {
              var r;
              return (r = Gm.safeHostname(o)) !== null && r !== undefined ? r : null;
            })
          : (n = Gm.safeHostname(t)) !== null && n !== undefined
            ? n
            : null;
      case "presence":
        return hL(t, true);
      case "drop":
        return;
    }
  }
  function mL(e, t) {
    let n = {};
    for (let key of Ci.allKeys) {
      let r = e[key];
      if (r === undefined) continue;
      let s = t(key, r);
      if (s !== undefined) n[key] = s;
    }
    return n;
  }
  function xpe(e) {
    return mL(e, (t, n) => jpe(Nw(t), n));
  }
  function Lpe(e) {
    return mL(e, (t, n) => {
      var o;
      let r = Nw(t);
      if (r === "drop") return;
      let s = Ci.FlatManagedConfig.shape[t];
      if (r === "keep" && ((o = pL(s)) === null || o === undefined ? undefined : o(n, s))) return n;
      return hL(n, false);
    });
  }
  gL.REDACTED = "[redacted]";
  function Npe(e) {
    let t = {
      ...e,
    };
    for (let key of Ci.allKeys) {
      let o = e[key];
      if (o === undefined || !Lw(key)) continue;
      t[key] = Array.isArray(o)
        ? [gL.REDACTED]
        : o && typeof o === "object"
          ? Object.fromEntries(Object.keys(o).map((key) => [key, gL.REDACTED]))
          : gL.REDACTED;
    }
    return t;
  }
});
//@ chunk-1ny7cxrt.js:1146192-1149575 cjs-unmatched+string-clue
var ni = x(function (Ze) {
  var Zpe =
    (Ze && Ze.__createBinding) ||
    (Object.create
      ? function (e, t, n, o) {
          if (o === undefined) o = n;
          var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, n);
          if (
            !ownPropertyDescriptor ||
            ("get" in ownPropertyDescriptor
              ? !t.__esModule
              : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
          )
            ownPropertyDescriptor = {
              enumerable: true,
              get: function () {
                return t[n];
              },
            };
          Object.defineProperty(e, o, ownPropertyDescriptor);
        }
      : function (e, t, n, o) {
          if (o === undefined) o = n;
          e[o] = t[n];
        });
  var yr =
    (Ze && Ze.__exportStar) ||
    function (e, t) {
      for (var key in e)
        if (key !== "default" && !Object.prototype.hasOwnProperty.call(t, key)) Zpe(t, e, key);
    };
  Object.defineProperty(Ze, "__esModule", {
    value: true,
  });
  Ze.MODELS_GROUP =
    Ze.HELPER_SCRIPT_GROUP =
    Ze.hasActiveBootstrap =
    Ze.credentialKindOf =
    Ze.COWORK_3P_DOCS_BASE =
    Ze.canonicalJson =
    Ze.providerHasDiscovery =
    Ze.providerCliFlagEnv =
    Ze.PROVIDER_SELECTOR_ENV_FLAGS =
    Ze.PROVIDER_CLI_FLAG =
    Ze.kindSupportsDiscovery =
    Ze.isBedrockFamily =
    Ze.CREDENTIAL_KINDS_FOR_PROVIDER =
    Ze.PROVIDERS =
    Ze.PROVIDER_DISPLAY =
    Ze.KIND_PRECEDENCE =
    Ze.INFERENCE_CREDENTIAL_KINDS =
    Ze.getProviderLabel =
    Ze.DEFAULT_INFERENCE_PROVIDER =
    Ze.unwrapZod =
      undefined;
  var Ike = Ar();
  var Vpe = yt();
  Object.defineProperty(Ze, "unwrapZod", {
    enumerable: true,
    get: function () {
      return Vpe.unwrapZod;
    },
  });
  var qc = oa();
  Object.defineProperty(Ze, "DEFAULT_INFERENCE_PROVIDER", {
    enumerable: true,
    get: function () {
      return qc.DEFAULT_INFERENCE_PROVIDER;
    },
  });
  Object.defineProperty(Ze, "getProviderLabel", {
    enumerable: true,
    get: function () {
      return qc.getProviderLabel;
    },
  });
  Object.defineProperty(Ze, "INFERENCE_CREDENTIAL_KINDS", {
    enumerable: true,
    get: function () {
      return qc.INFERENCE_CREDENTIAL_KINDS;
    },
  });
  Object.defineProperty(Ze, "KIND_PRECEDENCE", {
    enumerable: true,
    get: function () {
      return qc.KIND_PRECEDENCE;
    },
  });
  Object.defineProperty(Ze, "PROVIDER_DISPLAY", {
    enumerable: true,
    get: function () {
      return qc.PROVIDER_DISPLAY;
    },
  });
  Object.defineProperty(Ze, "PROVIDERS", {
    enumerable: true,
    get: function () {
      return qc.PROVIDERS;
    },
  });
  var hl = Ir();
  Object.defineProperty(Ze, "CREDENTIAL_KINDS_FOR_PROVIDER", {
    enumerable: true,
    get: function () {
      return hl.CREDENTIAL_KINDS_FOR_PROVIDER;
    },
  });
  Object.defineProperty(Ze, "isBedrockFamily", {
    enumerable: true,
    get: function () {
      return hl.isBedrockFamily;
    },
  });
  Object.defineProperty(Ze, "kindSupportsDiscovery", {
    enumerable: true,
    get: function () {
      return hl.kindSupportsDiscovery;
    },
  });
  Object.defineProperty(Ze, "PROVIDER_CLI_FLAG", {
    enumerable: true,
    get: function () {
      return hl.PROVIDER_CLI_FLAG;
    },
  });
  Object.defineProperty(Ze, "PROVIDER_SELECTOR_ENV_FLAGS", {
    enumerable: true,
    get: function () {
      return hl.PROVIDER_SELECTOR_ENV_FLAGS;
    },
  });
  Object.defineProperty(Ze, "providerCliFlagEnv", {
    enumerable: true,
    get: function () {
      return hl.providerCliFlagEnv;
    },
  });
  Object.defineProperty(Ze, "providerHasDiscovery", {
    enumerable: true,
    get: function () {
      return hl.providerHasDiscovery;
    },
  });
  var Gc = $n();
  Object.defineProperty(Ze, "canonicalJson", {
    enumerable: true,
    get: function () {
      return Gc.canonicalJson;
    },
  });
  Object.defineProperty(Ze, "COWORK_3P_DOCS_BASE", {
    enumerable: true,
    get: function () {
      return Gc.COWORK_3P_DOCS_BASE;
    },
  });
  Object.defineProperty(Ze, "credentialKindOf", {
    enumerable: true,
    get: function () {
      return Gc.credentialKindOf;
    },
  });
  Object.defineProperty(Ze, "hasActiveBootstrap", {
    enumerable: true,
    get: function () {
      return Gc.hasActiveBootstrap;
    },
  });
  Object.defineProperty(Ze, "HELPER_SCRIPT_GROUP", {
    enumerable: true,
    get: function () {
      return Gc.HELPER_SCRIPT_GROUP;
    },
  });
  Object.defineProperty(Ze, "MODELS_GROUP", {
    enumerable: true,
    get: function () {
      return Gc.MODELS_GROUP;
    },
  });
  yr(zi(), Ze);
  yr(Cc(), Ze);
  yr(Wv(), Ze);
  yr(Yv(), Ze);
  yr(ew(), Ze);
  yr(wm(), Ze);
  yr(tw(), Ze);
  yr(rw(), Ze);
  yr(_d(), Ze);
  yr(bd(), Ze);
  yr(cw(), Ze);
  yr(pw(), Ze);
  yr(fl(), Ze);
  yr(gs(), Ze);
  yr(Hm(), Ze);
  yr(Rw(), Ze);
  yr(_L(), Ze);
});
//@ chunk-1ny7cxrt.js:1149575-1149886 cjs-unmatched+string-clue
var Wc = x(function (vL) {
  Object.defineProperty(vL, "__esModule", {
    value: true,
  });
  vL.refuseForHybrid = qpe;
  var ka = yt();
  var bL = gs();
  function qpe(e) {
    let t = ka.fieldMetaForNode(e);
    return (
      ka.redactPolicyOf(e) === "drop" ||
      (t !== undefined && (!bL.isBootstrapableMeta(t) || ka.effectiveVisibility(t) === "internal-only")) ||
      ka.isHybridExcluded(e)
    );
  }
});
//@ chunk-1ny7cxrt.js:1149886-1151292 cjs-unmatched+string-clue
var Jm = x(function (OL) {
  Object.defineProperty(OL, "__esModule", {
    value: true,
  });
  OL.FLAT_LIFTED_CLUSTER = undefined;
  OL.effectiveGroupOverride = Ype;
  var Wm = yt();
  var Ym = gs();
  var wL = Wc();
  OL.FLAT_LIFTED_CLUSTER = "models";
  function Wpe(e, t) {
    var n;
    let o = (n = Ym.FLAT_KEY_TO_NESTED_PATH.get(t.flatKey)) === null || n === undefined ? undefined : n[0];
    return (
      wL.refuseForHybrid(e) ||
      Wm.isHybridDerived(e) ||
      o === "inference" ||
      (o === OL.FLAT_LIFTED_CLUSTER && t.groupOverride !== "nameSubset")
    );
  }
  function Ype(e) {
    var t;
    let n = Wm.fieldMetaForNode(e);
    if (!n) return;
    let groupOverride = n.groupOverride;
    if (
      n.groupItemOverride !== undefined &&
      (groupOverride !== "nameSubset" ||
        ((t = Ym.FLAT_KEY_TO_NESTED_PATH.get(n.flatKey)) === null || t === undefined ? undefined : t[0]) ===
          OL.FLAT_LIFTED_CLUSTER)
    )
      throw Error(
        `group-override: "${n.flatKey}" sets groupItemOverride, which only a nameSubset list outside the flat-lifted ${OL.FLAT_LIFTED_CLUSTER} cluster can carry; drop it or fix groupOverride`,
      );
    if (Wpe(e, n)) {
      if (groupOverride !== undefined)
        throw Error(
          `group-override drift: "${n.flatKey}" sets groupOverride but can never be a group entry (refused for hybrid, control-plane derived, an inference leaf, or a sibling of the flat-lifted ${OL.FLAT_LIFTED_CLUSTER} list)`,
        );
      return;
    }
    if (typeof groupOverride === "object") {
      if (!groupOverride.orgOnly.trim())
        throw Error(
          `group-override: "${n.flatKey}" is marked orgOnly without a reason \u2014 state why a per-group value is mechanically meaningless ("it is a restriction" is not one)`,
        );
      return;
    }
    return groupOverride !== null && groupOverride !== undefined ? groupOverride : "verbatim";
  }
});
//@ chunk-1ny7cxrt.js:1151292-1155206 cjs-unmatched+string-clue
var Pd = x(function (kL) {
  Object.defineProperty(kL, "__esModule", {
    value: true,
  });
  kL.pruneSchema = Xpe;
  kL.emitTypeSource = Jc;
  kL.leafPaths = Qm;
  kL.setRequiredFromRuntime = ehe;
  var xr = require_v3();
  var le = yt();
  function Xpe(e, t, n) {
    var o;
    return (o = Xm(e, t, n)) !== null && o !== undefined ? o : xr.z.object({});
  }
  function Xm(e, t, n) {
    var o;
    let r = n === null || n === undefined ? undefined : n(e);
    if (r !== undefined) return Ed(e, r);
    if (t(e)) return;
    let s = le.unwrapZod(e);
    if (s !== e && t(s)) return;
    let a = le.zodKind(s);
    if (a === le.ZodKind.ZodObject) {
      let shape = s.shape;
      let c = {};
      for (let [key, value] of Object.entries(shape)) {
        let h = Xm(value, t, n);
        if (h !== undefined) c[key] = h;
      }
      if (Object.keys(c).length === 0 && Object.keys(shape).length > 0) return;
      return Ed(e, xr.z.object(c));
    }
    if (a === le.ZodKind.ZodDiscriminatedUnion || a === le.ZodKind.ZodUnion) {
      let l = le.discriminatorKeyOf(s);
      let c = [];
      let u = new Set();
      for (let h of le.unionOptionsOf(s)) {
        let m = Xm(h, t, n);
        if (m !== undefined) c.push(m);
        else if (l)
          for (let y of (o = le.enumOptionsOf(h.shape[l])) !== null && o !== undefined ? o : []) u.add(y);
      }
      if (c.length === 0) return;
      let f = l && c.length > 1 ? xr.z.discriminatedUnion(l, c) : c.length === 1 ? c[0] : xr.z.union(c);
      return Ed(e, Qpe(f, l, u, e));
    }
    if (a === le.ZodKind.ZodArray) {
      let l = le.arrayElementOf(s);
      let c = l ? Xm(l, t, n) : undefined;
      if (c === undefined) return;
      let u = SL(s, xr.z.array(c));
      let { min, max } = le.arrayLengthBoundsOf(s);
      let m = le.annotationsOf(u);
      if (min !== undefined && m.minItems === undefined)
        le.annotate(u, {
          minItems: min,
        });
      if (max !== undefined && m.maxItems === undefined)
        le.annotate(u, {
          maxItems: max,
        });
      return Ed(e, u);
    }
    return le.findDefaultValue(e) !== undefined ? Ed(e, le.stripDefaults(e)) : e;
  }
  function Qpe(e, t, n, o) {
    if (!t || n.size === 0 || !eg(o)) return e;
    let r = (s) => typeof s === "object" && s !== null && n.has(s[t]);
    return xr.z.preprocess((s) => (r(s) ? undefined : s), e.optional());
  }
  function Ed(e, t) {
    let n = eg(e) && !eg(t) ? t.optional() : t;
    return SL(e, n);
  }
  function SL(e, t) {
    let n = e;
    let o = t;
    for (let r of ["__antAnn", "__antFieldMeta", "__antSubFieldMeta", "__antVariantMeta"])
      if (n[r] !== undefined) o[r] = n[r];
    return t;
  }
  function eg(e) {
    return xr.z
      .object({
        k: e,
      })
      .safeParse({}).success;
  }
  function Jc(e, t = 0) {
    var n;
    let o = "  ".repeat(t);
    let r = le.unwrapZod(e);
    switch (le.zodKind(r)) {
      case le.ZodKind.ZodString:
        return "string";
      case le.ZodKind.ZodNumber:
        return "number";
      case le.ZodKind.ZodBoolean:
        return "boolean";
      case le.ZodKind.ZodNever:
        return "never";
      case le.ZodKind.ZodUndefined:
        return "undefined";
      case le.ZodKind.ZodLiteral:
        return JSON.stringify(le.literalValueOf(r));
      case le.ZodKind.ZodEnum:
        return (
          ((n = le.enumOptionsOf(r)) !== null && n !== undefined ? n : [])
            .map((l) => JSON.stringify(l))
            .join(" | ") || "never"
        );
      case le.ZodKind.ZodRecord: {
        let a = le.recordKeyTypeOf(r);
        let l = le.recordValueTypeOf(r);
        let c = a ? Jc(a, t) : "string";
        let u = l ? Jc(l, t) : "unknown";
        return a && le.zodKind(le.unwrapZod(a)) === le.ZodKind.ZodEnum
          ? `Partial<Record<${c}, ${u}>>`
          : `Record<${c}, ${u}>`;
      }
      case le.ZodKind.ZodArray: {
        let a = le.arrayElementOf(r);
        return `ReadonlyArray<${a ? Jc(a, t) : "unknown"}>`;
      }
      case le.ZodKind.ZodObject: {
        let shape = r.shape;
        let entries = Object.entries(shape);
        if (entries.length === 0) return "Record<string, never>";
        return `{
${entries.map(([u, f]) => {
  let h = f;
  let m = eg(h) ? "?" : "";
  return `${o}  readonly ${JSON.stringify(u)}${m}: ${Jc(h, t + 1)};`;
}).join(`
`)}
${o}}`;
      }
      case le.ZodKind.ZodDiscriminatedUnion:
      case le.ZodKind.ZodUnion: {
        let mapped = le.unionOptionsOf(r).map((l) => Jc(l, t + 2));
        return `(
${o}    | ${mapped.join(`
${o}    | `)}
${o}  )`;
      }
      default:
        return "unknown";
    }
  }
  function Qm(e, t = []) {
    let n = le.unwrapZod(e);
    let o = le.zodKind(n);
    if (o === le.ZodKind.ZodObject)
      return Object.entries(n.shape).flatMap(([key, value]) => Qm(value, [...t, key]));
    if (o === le.ZodKind.ZodDiscriminatedUnion || o === le.ZodKind.ZodUnion) {
      let r = le.discriminatorKeyOf(n);
      return le.unionOptionsOf(n).flatMap((s) => {
        let a = r ? le.literalValueOf(s.shape[r]) : undefined;
        return Qm(s, typeof a === "string" ? [...t, `<${a}>`] : t);
      });
    }
    if (o === le.ZodKind.ZodArray) {
      let r = le.arrayElementOf(n);
      return r ? Qm(r, [...t, "[]"]) : [t.join(".")];
    }
    return o === le.ZodKind.ZodNever ? [] : [t.join(".")];
  }
  function ehe(e, t) {
    let mapped = Object.entries(e)
      .filter(([key, value]) => {
        var s;
        return (
          ((s = t.properties) === null || s === undefined ? undefined : s[key]) !== undefined &&
          !xr.z
            .object({
              k: value,
            })
            .safeParse({}).success
        );
      })
      .map(([key]) => key);
    if (mapped.length > 0) t.required = mapped;
    else delete t.required;
  }
});
//@ chunk-1ny7cxrt.js:1155206-1157867 cjs-unmatched+string-clue
var zw = x(function (TL) {
  Object.defineProperty(TL, "__esModule", {
    value: true,
  });
  TL.GroupSettings = TL.GroupServableConfig = undefined;
  TL.groupItemOverrideSchema = IL;
  TL.buildGroupServableSchema = CL;
  TL.isDeclaredInGroupEntry = uhe;
  var pn = require_v3();
  var $t = yt();
  var EL = fl();
  var tg = Jm();
  var Ea = Wc();
  var Qc = Pd();
  var she = new Set([
    $t.ZodKind.ZodObject,
    $t.ZodKind.ZodUnion,
    $t.ZodKind.ZodDiscriminatedUnion,
    $t.ZodKind.ZodArray,
  ]);
  var ahe = (e) => {
    var t;
    return !she.has((t = $t.zodKind($t.unwrapZod(e))) !== null && t !== undefined ? t : "");
  };
  var PL = (e) => ($t.zodKind(e) === $t.ZodKind.ZodOptional ? PL($t.unwrapStep(e)) : e);
  var AL = (e) => $t.subFieldsOf($t.arrayElementOf($t.unwrapZod(e)));
  function IL(e) {
    var t;
    var n;
    let o = $t.fieldMetaForNode(e);
    let groupItemOverride = o === null || o === undefined ? undefined : o.groupItemOverride;
    if (!o || !groupItemOverride) return;
    let s = (u) => {
      throw Error(`group-override: "${o.flatKey}" groupItemOverride ${u}`);
    };
    let a = AL(e);
    let l =
      (n = (t = a.find((u) => u.isPrimaryKey)) === null || t === undefined ? undefined : t.key) !== null &&
      n !== undefined
        ? n
        : s("needs the list's element to declare a primary-key (isPrimaryKey) sub-field");
    if (groupItemOverride.length === 0) s("names no members");
    let mapped = [l, ...groupItemOverride].map((u) => {
      var f;
      let h =
        (f = a.find((m) => m.key === u)) !== null && f !== undefined
          ? f
          : s(`names "${u}", which is not a sub-field of the list's element`);
      if (Ea.refuseForHybrid(h.node) || Ea.refuseForHybrid($t.unwrapZod(h.node)))
        s(`names "${u}", which the hosted store refuses`);
      return [u, PL(Qc.pruneSchema(h.node, Ea.refuseForHybrid))];
    });
    return pn.z.object(Object.fromEntries(mapped)).strict();
  }
  function lhe(e) {
    var t;
    var n;
    let o =
      (n = (t = AL(e).find((s) => s.isPrimaryKey)) === null || t === undefined ? undefined : t.key) !==
        null && n !== undefined
        ? n
        : "";
    let r = (s) => (typeof s === "string" ? s : s[o]);
    return (s) => new Set(s.map(r)).size === s.length;
  }
  var che = (e) => {
    switch (tg.effectiveGroupOverride(e)) {
      case "verbatim":
        return Qc.pruneSchema(e, Ea.refuseForHybrid);
      case "nameSubset": {
        let t = IL(e);
        let n = pn.z.string().min(1);
        return pn.z
          .array(t ? pn.z.union([n, t]) : n)
          .max(200)
          .refine(lhe(e), {
            message: "A group names each entry at most once",
          });
      }
      default:
        return;
    }
  };
  function CL() {
    return Qc.pruneSchema(EL.ManagedConfig, ahe, che)
      .extend({
        [tg.FLAT_LIFTED_CLUSTER]: pn.z.array(pn.z.string()).min(1).max(200).optional(),
        tokenLimits: pn.z
          .object({
            maxPerWindow: pn.z.number().int().positive(),
            windowHours: pn.z.number().int().min(1).max(720),
          })
          .optional(),
      })
      .refine((t) => Object.keys(t).length > 0, {
        message: "A group override must state at least one cluster",
      });
  }
  TL.GroupServableConfig = $t.lazySchema(CL);
  function uhe(e) {
    let GroupServableConfig = TL.GroupServableConfig;
    for (let n of e) {
      let o = $t.unwrapZod(GroupServableConfig);
      if ($t.zodKind(o) !== $t.ZodKind.ZodObject) return true;
      let shape = o.shape;
      let s = Object.hasOwn(shape, n) ? shape[n] : undefined;
      if (s === undefined) return false;
      GroupServableConfig = s;
    }
    return true;
  }
  TL.GroupSettings = pn.z.object({
    entries: pn.z
      .array(
        pn.z.object({
          group_id: pn.z.string().uuid(),
          config: TL.GroupServableConfig,
        }),
      )
      .max(100),
  });
});
//@ chunk-1ny7cxrt.js:1157867-1160166 cjs-unmatched+string-clue
var Fw = x(function (jL) {
  Object.defineProperty(jL, "__esModule", {
    value: true,
  });
  jL.admitLegacyCredentialKinds = mhe;
  var ng = yt();
  var Pa = Ir();
  var rg = oa();
  var pi = (e) => typeof e === "object" && e !== null && !Array.isArray(e);
  function RL(e) {
    return e === "vertex" ? Pa.VERTEX_OAUTH_CREDENTIAL_KIND : undefined;
  }
  var DL = new Map([
    ["vertex", new Set([Pa.VERTEX_OAUTH_CREDENTIAL_KIND.path, Pa.VERTEX_INTERACTIVE_WITH_AUDIENCE.path])],
    ["gateway", new Set([Pa.GATEWAY_INTERACTIVE_WITH_IDP.path])],
  ]);
  var hhe = new Set([...DL.values()].flatMap((e) => [...e]));
  function mhe(e) {
    let t = (n) => {
      if (Array.isArray(n)) {
        n.forEach(t);
        return;
      }
      if (!pi(n)) return;
      let properties = pi(n.properties) ? n.properties : undefined;
      if (properties) ghe(properties);
      let r = properties && pi(properties.provider) ? properties.provider.const : undefined;
      if (typeof r === "string" && ng.PROVIDERS.includes(r)) yhe(r, properties);
      for (let s of Object.values(n)) t(s);
    };
    t(e);
  }
  function ghe(properties) {
    let inferenceCredentialKind = properties.inferenceCredentialKind;
    if (!pi(inferenceCredentialKind) || !Array.isArray(inferenceCredentialKind.enum)) return;
    let n = inferenceCredentialKind.enum;
    let o = [];
    for (let r of ng.PROVIDERS) {
      let s = RL(r);
      if (!s) continue;
      for (let [a, l] of rg.legacyCredentialKindAliases(r)) {
        if (!n.includes(l)) continue;
        if (!n.includes(a)) n.push(a);
        o.push(
          ML(a, l, s, {
            provider: r,
          }),
        );
      }
    }
    if (o.length > 0) inferenceCredentialKind["x-deprecatedValues"] = o;
  }
  function ML(value, use, n, o = {}) {
    return {
      value,
      use,
      ...o,
      ...(n.warnFrom !== undefined
        ? {
            warnFrom: n.warnFrom,
          }
        : {}),
      ...(n.supportEnds !== undefined
        ? {
            supportEnds: n.supportEnds,
          }
        : {}),
    };
  }
  function yhe(e, properties) {
    var n;
    let credential = properties.credential;
    _he(e, credential);
    let r = RL(e);
    let s = rg.legacyCredentialKindAliases(e);
    if (!r || s.size === 0) return;
    let a = pi(credential)
      ? (n = credential.oneOf) !== null && n !== undefined
        ? n
        : credential.anyOf
      : undefined;
    if (!Array.isArray(a)) return;
    for (let l of a) {
      let kind = pi(l) && pi(l.properties) && pi(l.properties.kind) ? l.properties.kind : undefined;
      if (!kind || typeof kind.const !== "string") continue;
      let mapped = [...s].filter(([, h]) => h === kind.const).map(([h]) => h);
      if (mapped.length === 0) continue;
      let f = kind.const;
      delete kind.const;
      kind.enum = [f, ...mapped];
      kind["x-deprecatedValues"] = mapped.map((h) => ML(h, f, r));
    }
  }
  function _he(e, credential) {
    var n;
    var o;
    let r = pi(credential)
      ? (n = credential.oneOf) !== null && n !== undefined
        ? n
        : credential.anyOf
      : undefined;
    if (!Array.isArray(r)) return;
    let s = (o = DL.get(e)) !== null && o !== undefined ? o : new Set();
    for (let a of r) {
      let kind = pi(a) && pi(a.properties) && pi(a.properties.kind) ? a.properties.kind : undefined;
      let c = kind === null || kind === undefined ? undefined : kind["x-deprecations"];
      if (!kind || !Array.isArray(c)) continue;
      let filtered = c.filter(
        (f) => !pi(f) || typeof f.path !== "string" || !hhe.has(f.path) || s.has(f.path),
      );
      if (filtered.length === 0) delete kind["x-deprecations"];
      else kind["x-deprecations"] = filtered;
    }
  }
});
//@ chunk-1ny7cxrt.js:1160166-1160947 cjs-unmatched+string-clue
var Bw = x(function (LL) {
  Object.defineProperty(LL, "__esModule", {
    value: true,
  });
  LL.admitLegacyToolPolicyValues = whe;
  var xL = Ar();
  var ig = (e) => typeof e === "object" && e !== null && !Array.isArray(e);
  var og = "ask-session";
  function vhe(properties) {
    let additionalProperties = ig(properties.builtinToolPolicy)
      ? properties.builtinToolPolicy.additionalProperties
      : undefined;
    if (
      ig(additionalProperties) &&
      Array.isArray(additionalProperties.enum) &&
      !additionalProperties.enum.includes(og)
    )
      additionalProperties.enum = [...additionalProperties.enum, og];
  }
  function whe(e) {
    let { warnFrom, supportEnds, use } = xL.MCP_ENTRY_TOOL_POLICY_ASK_SESSION;
    let r = (s) => {
      if (Array.isArray(s)) {
        s.forEach(r);
        return;
      }
      if (!ig(s)) return;
      if (ig(s.properties)) vhe(s.properties);
      if (Array.isArray(s.enum) && s.enum.includes(og))
        s["x-deprecatedValues"] = [
          {
            value: og,
            use: use === undefined ? "ask" : JSON.parse(use),
            ...(warnFrom !== undefined
              ? {
                  warnFrom,
                }
              : {}),
            ...(supportEnds !== undefined
              ? {
                  supportEnds,
                }
              : {}),
          },
        ];
      for (let a of Object.values(s)) r(a);
    };
    r(e);
  }
});
//@ chunk-1ny7cxrt.js:1160947-1171133 cjs-unmatched+string-clue
var qw = x(function (VL) {
  Object.defineProperty(VL, "__esModule", {
    value: true,
  });
  VL.HYBRID_MAX_ITEMS_DEFAULT =
    VL.HYBRID_SERVABLE_PROVIDERS =
    VL.HYBRID_SERVABLE_CREDENTIAL_KINDS =
      undefined;
  VL.buildHybridServableSchema = Hw;
  VL.releasedHybridCredentialKinds = khe;
  VL.emitHybridServableConfigSource = Phe;
  VL.hybridArrayBoundViolations = Ahe;
  VL.buildHybridServableJsonSchema = Kw;
  VL.emitHybridServableJsonSchemaSource = Che;
  VL.emitHybridServablePathLedgerSource = $he;
  var NL = require_v3();
  var ze = yt();
  var eu = Ir();
  var UL = Ar();
  var tu = fl();
  var sg = gs();
  var zL = Jm();
  var ag = zw();
  var nu = Wc();
  var FL = Fw();
  var BL = Bw();
  var Aa = Pd();
  function Hw(e = new Set()) {
    return Aa.pruneSchema(tu.ManagedConfig, (t) => {
      var n;
      let flatKey = (n = ze.fieldMetaForNode(t)) === null || n === undefined ? undefined : n.flatKey;
      return (flatKey !== undefined && e.has(flatKey)) || nu.refuseForHybrid(t);
    });
  }
  function She(credential) {
    return ze
      .discriminatorArmsOf(credential)
      .filter((t) => t.schema !== undefined && !nu.refuseForHybrid(t.schema))
      .map((t) => t.id);
  }
  VL.HYBRID_SERVABLE_CREDENTIAL_KINDS = (() => {
    var e;
    let t = (e = ze.discriminatorKeyOf(eu.InferenceConfig)) !== null && e !== undefined ? e : "provider";
    let n = {};
    for (let o of ze.unionOptionsOf(eu.InferenceConfig)) {
      let shape = o.shape;
      let s = ze.literalValueOf(shape[t]);
      if (nu.refuseForHybrid(o)) continue;
      let a = She(shape.credential);
      if (a.length > 0) n[s] = a;
    }
    return n;
  })();
  VL.HYBRID_SERVABLE_PROVIDERS = Object.keys(VL.HYBRID_SERVABLE_CREDENTIAL_KINDS);
  function khe(e, t) {
    var n;
    var o;
    if (t === undefined)
      t =
        (n = ze.fieldMetaForNode(tu.DISCRIMINATORS.inferenceCredentialKind.node)) === null || n === undefined
          ? undefined
          : n.support.values;
    let r = ze.discriminatorArmsOf(eu.PROVIDER_ARMS.get(e).shape.credential);
    return ((o = VL.HYBRID_SERVABLE_CREDENTIAL_KINDS[e]) !== null && o !== undefined ? o : []).filter((s) => {
      var a;
      return (
        !ze.isUnreleasedVersion(
          (a = t === null || t === undefined ? undefined : t[s]) === null || a === undefined
            ? undefined
            : a.availableInVersion,
        ) && !r.some((l) => l.id === s && l.schema !== undefined && ze.isUnreleasedMember(l.schema))
      );
    });
  }
  var Ehe = `// GENERATED \u2014 do not edit. Run \`yarn workspace @ant/managed-config gen:hybrid-servable\` to regenerate.
// Type only \u2014 for runtime validation use buildHybridServableSchema() from @ant/managed-config/desktop.

`;
  function Phe() {
    let e = Aa.emitTypeSource(Hw());
    let t = Aa.emitTypeSource(ag.buildGroupServableSchema());
    return `${Ehe}export type HybridServableConfig = ${e};

export type GroupServableConfig = ${t};
`;
  }
  VL.HYBRID_MAX_ITEMS_DEFAULT = 500;
  var HL = (e) => {
    var t;
    return (t = ze.annotationsOf(e).maxItems) !== null && t !== undefined ? t : VL.HYBRID_MAX_ITEMS_DEFAULT;
  };
  function Ahe(e, t) {
    let n = [];
    let o = new Set();
    let r = (s, a, l) => {
      let c = ze.unwrapZod(s);
      let u = ze.zodKind(c);
      if (u === ze.ZodKind.ZodArray) {
        if (!Array.isArray(a)) return;
        let f = HL(s);
        if (a.length > f && !o.has(l)) {
          o.add(l);
          n.push({
            path: l,
            length: a.length,
            max: f,
          });
        }
        let h = ze.arrayElementOf(c);
        if (h) a.forEach((m, y) => r(h, m, `${l}[${y}]`));
        return;
      }
      if (a === null || typeof a !== "object" || Array.isArray(a)) return;
      if (u === ze.ZodKind.ZodObject) {
        let shape = c.shape;
        for (let [key, value] of Object.entries(shape)) {
          let y = a[key];
          if (y !== undefined) r(value, y, l ? `${l}.${key}` : key);
        }
        return;
      }
      if (u === ze.ZodKind.ZodUnion || u === ze.ZodKind.ZodDiscriminatedUnion)
        for (let f of ze.unionOptionsOf(c)) r(f, a, l);
    };
    r(sg.FlatManagedConfig.shape[e], t, "");
    return n;
  }
  var description =
    "The subset of Claude Desktop managed configuration an Anthropic-hosted (hybrid) " +
    "config server may store \u2014 generated from buildHybridServableSchema(); regenerate with " +
    "`yarn workspace @ant/managed-config gen:hybrid-servable`, never hand-edit. Structural contract only: objects are closed (unknown keys rejected), except a node marked `x-opaque: true`, whose members its reading client judges (a store keeps that subtree as JSON, not as a string map, and is the only check for a credential in it: none of the rules below reach inside it); enums/union arms are exact, and every array carries the store's `maxItems` bound (a storage limit the device parse does not apply), " +
    "but string-hygiene checks the runtime schema applies through refinements \u2014 URLs carrying " +
    "userinfo, unsafe helper-script paths, secret-shaped values, the loopback/https rules beyond the one marker " +
    "below \u2014 are NOT expressible here and are enforced by the consumers (the desktop intake and the admin form). " +
    `Credentials at rest, 1P-only keys and trust roots are absent by construction. A \`format: uri\` leaf marked \`x-hybridLoopback\` may also point at the member's own machine, as it may from a device-managed tier: a URL whose host, as written in the URL's authority, is literally one of its \`hosts\` (RFC 3986 host; names compared case-insensitively, an IPv6 literal in its brackets), over https or plain http, is applied. Spellings a URL parser merely canonicalises to one of them (a trailing dot, IPv4 shorthand such as \`127.1\`, decimal or hex, IPv4-mapped IPv6) are outside this contract: a store refuses them even though a device may still apply some. Any other loopback host, and plain http anywhere else, is dropped, and every other URL leaf stays https to a non-loopback host. A leaf marked \`x-hybridDerived: true\` is computed by the control plane from the organization and stamped on every serve; the server drops an authored value on write and reads this set from the artifact. A leaf marked \`x-groupOverride\` may also appear in a per-group override entry: \`verbatim\` with this node's own schema (scalars and arrays replace the organization's value for its members; object-valued settings merge key by key, so a group can add or override keys but not remove one), \`nameSubset\` as an array naming a subset of the organization's list at this node, each entry at most once: an element is an entry's name, or, where the node also carries \`x-groupItemOverride\` (an object schema: the entry's name plus the item fields a group may restate), an object of that schema, whose restated fields are laid over the selected entry's own the way a \`verbatim\` leaf is laid over the organization's value (an object-valued field such as \`toolPolicy\` merges key by key: the group adds or changes a key and cannot remove one). \`x-readers\` names the clients that read a leaf (${ze.readerLegend(ze.CONFIG_READERS)}); a leaf without it is read by the desktop only. The marker is per key: which providers or credential arms a client supports is that client's own list (a leaf shared by several arms is marked on each, and so is the \`provider\` or \`kind\` constant that selects each arm). \`generated/hybridReaderSlice.<reader>.schema.json\` is this schema projected on those marks, with the envelope each client is served. \`x-formerPaths\` lists the dotted paths a hosted schema declared and this one no longer does; a store drops a value at one of them from a write instead of refusing the write. \`x-executionTarget\` names the only execution target a leaf applies under (\`desktop\` = the app runs sessions on the device; any other value names the cluster that configures that target); a leaf without it applies under every target.`;
  function KL(e) {
    return NL.z.toJSONSchema(e, {
      target: "draft-2020-12",
      io: "input",
      reused: "inline",
      override: (t) => {
        var n;
        if (t.zodSchema._zod.def.type === "catch") delete t.jsonSchema.default;
        if (ze.isHybridDerived(t.zodSchema)) t.jsonSchema["x-hybridDerived"] = true;
        if (ze.isHybridLoopback(t.zodSchema))
          t.jsonSchema["x-hybridLoopback"] = {
            hosts: [...UL.LOOPBACK_HOSTS],
          };
        let o = zL.effectiveGroupOverride(t.zodSchema);
        if (o) {
          t.jsonSchema["x-groupOverride"] = o;
          let f = ag.groupItemOverrideSchema(t.zodSchema);
          if (f) {
            let { $schema, ...m } = KL(f);
            t.jsonSchema["x-groupItemOverride"] = m;
          }
        }
        let r = ze.fieldMetaForNode(t.zodSchema);
        let s = r !== null && r !== undefined ? r : ze.subfieldMetaForNode(t.zodSchema);
        if (s && ze.readersDeclared(s)) t.jsonSchema["x-readers"] = [...ze.readersOf(s)];
        if (r && ze.annotationsOf(t.zodSchema).opaque) t.jsonSchema["x-opaque"] = true;
        if (r === null || r === undefined ? undefined : r.support.executionTarget)
          t.jsonSchema["x-executionTarget"] = r.support.executionTarget;
        let def = t.zodSchema._zod.def;
        let jsonSchema = t.jsonSchema;
        if (
          jsonSchema.type === "string" &&
          ((n = jsonSchema.minLength) !== null && n !== undefined ? n : 0) >= 1 &&
          jsonSchema.pattern === undefined &&
          jsonSchema.allOf === undefined
        )
          jsonSchema.pattern = "\\S";
        let jsonSchema_2 = t.jsonSchema;
        if (def.type === "array") {
          let zodSchema = t.zodSchema;
          if (jsonSchema_2.maxItems === undefined) jsonSchema_2.maxItems = HL(zodSchema);
          let h = ze.openEnumItemsOf(zodSchema);
          if (h) t.jsonSchema.items = h;
          let minItems = ze.annotationsOf(zodSchema).minItems;
          if (jsonSchema_2.minItems === undefined && minItems !== undefined && minItems > 0)
            jsonSchema_2.minItems = minItems;
        }
        if (def.type !== "object" || !def.shape) return;
        let jsonSchema_3 = t.jsonSchema;
        if (jsonSchema_3.additionalProperties === undefined) jsonSchema_3.additionalProperties = false;
        Aa.setRequiredFromRuntime(def.shape, jsonSchema_3);
      },
    });
  }
  function Kw(e = new Set()) {
    let t = KL(Hw(e));
    FL.admitLegacyCredentialKinds(t);
    BL.admitLegacyToolPolicyValues(t);
    for (let { node, nestedPath } of Object.values(tu.DISCRIMINATORS)) {
      let a = ze.fieldMetaForNode(node);
      if (a && ze.readersDeclared(a)) ZL(t, nestedPath, ze.readersOf(a));
    }
    let { $schema, ...o } = t;
    return {
      $schema,
      title: "HybridServableConfig",
      description,
      "x-formerPaths": sg.FORMER_NESTED_PATHS.map((r) => r.join(".")).sort(),
      ...o,
    };
  }
  function ZL(e, t, n) {
    var o;
    var r;
    if (typeof e !== "object" || e === null) return;
    let s = e;
    let [a, ...l] = t;
    if (a === undefined) {
      s["x-readers"] = [...n];
      return;
    }
    for (let c of [s, ...((o = s.oneOf) !== null && o !== undefined ? o : [])])
      ZL((r = c.properties) === null || r === undefined ? undefined : r[a], l, n);
  }
  function Che() {
    return `${JSON.stringify(Kw(), null, 2)}
`;
  }
  var $comment =
    "Written by `yarn workspace @ant/managed-config gen:hybrid-servable`, which never removes a path: each path that hybridServableConfig.schema.json has declared through `properties`, in every `oneOf` and `anyOf` variant too. FORMER_NESTED_PATHS (schema/flat.ts) must hold exactly the paths here that the schema no longer declares. The rules, the hand edits and the limits are in packages/managed-config/CLAUDE.md, under 'A moved or removed hosted path'.";
  function $he(e) {
    let t;
    let n = "";
    try {
      t = JSON.parse(e);
    } catch (error) {
      n = ` (${String(error)})`;
    }
    let paths = t === null || t === undefined ? undefined : t.paths;
    if (!Array.isArray(paths) || !paths.every((path) => typeof path === "string"))
      throw Error(
        'packages/managed-config/src/desktop/generated/hybridServablePathLedger.json must be JSON with a "paths" list of strings. If it has merge-conflict markers, keep the paths from both sides and delete the markers. Then run `yarn workspace @ant/managed-config gen:hybrid-servable`.' +
          n,
      );
    let r = new Set(paths);
    let s = (l, c) => {
      let { properties, oneOf, anyOf } = l;
      for (let [key, value] of Object.entries(
        properties !== null && properties !== undefined ? properties : {},
      )) {
        let b = c === "" ? key : `${c}.${key}`;
        r.add(b);
        s(value, b);
      }
      for (let m of [
        ...(oneOf !== null && oneOf !== undefined ? oneOf : []),
        ...(anyOf !== null && anyOf !== undefined ? anyOf : []),
      ])
        s(m, c);
    };
    s(Kw(), "");
    let a = {
      $comment,
      paths: [...r].sort(),
    };
    return `${JSON.stringify(a, null, 2)}
`;
  }
});
//@ chunk-1ny7cxrt.js:1171133-1176400 cjs-unmatched+string-clue
var Fi = x(function (XL) {
  Object.defineProperty(XL, "__esModule", {
    value: true,
  });
  XL.CLUSTER_NAMES = XL.CLUSTER_REGISTRY = undefined;
  XL.unflattenInference = Gw;
  XL.flattenInference = WL;
  XL.getAtPath = JL;
  XL.setAtPath = Yw;
  XL.flattenAll = Vhe;
  XL.unflattenAll = qhe;
  var Je = yt();
  var ru = Ir();
  var qL = oa();
  var Ti = ni();
  function lg(e) {
    var t;
    var n;
    var o;
    return (n = (t = Je.fieldMetaForNode(e)) === null || t === undefined ? undefined : t.flatKey) !== null &&
      n !== undefined
      ? n
      : (o = Je.subfieldMetaForNode(e)) === null || o === undefined
        ? undefined
        : o.flatKey;
  }
  var GL = (e, t, n) => {
    var o;
    var r;
    let s = (o = qL.legacyCredentialKindAlias(t, n)) !== null && o !== undefined ? o : n;
    return (r = Je.discriminatorArmsOf(e.shape.credential).find((a) => a.id === s)) === null ||
      r === undefined
      ? undefined
      : r.schema;
  };
  var zhe = (e) => {
    var t;
    return (t = e.inferenceCredentialKind) !== null && t !== undefined
      ? t
      : Ti.deriveInferenceCredentialKind(e);
  };
  function Ad(e, t) {
    let n = {};
    for (let [key, value] of Object.entries(e.shape)) {
      let s = lg(value);
      if (s) {
        let c = t[s];
        if (c !== undefined) n[key] = c;
        continue;
      }
      let a = Je.literalValueOf(value);
      if (a !== undefined) {
        n[key] = a;
        continue;
      }
      let l = Je.unwrapZod(value);
      if (Je.zodKind(l) === Je.ZodKind.ZodObject) {
        let c = Ad(l, t);
        if (Object.keys(c).length > 0) n[key] = c;
      }
    }
    return n;
  }
  function Gw(e) {
    let inferenceProvider = e.inferenceProvider;
    if (inferenceProvider === undefined) return;
    let n = ru.PROVIDER_ARMS.get(inferenceProvider);
    if (!n) return;
    let o = Ad(n, e);
    let r = zhe(e);
    if (r !== undefined) {
      let s = GL(n, inferenceProvider, r);
      if (s) o.credential = Ad(s, e);
    }
    return o;
  }
  function Id(e, t, n) {
    for (let [key, value] of Object.entries(e.shape)) {
      let s = t[key];
      if (s === undefined) continue;
      let a = lg(value);
      if (a) {
        n[a] = s;
        continue;
      }
      let l = Je.unwrapZod(value);
      if (Je.zodKind(l) === Je.ZodKind.ZodObject) Id(l, s, n);
    }
  }
  function WL(e) {
    var t;
    let n = {
      inferenceProvider: e.provider,
      inferenceCredentialKind: (t = e.credential) === null || t === undefined ? undefined : t.kind,
    };
    let o = ru.PROVIDER_ARMS.get(e.provider);
    if (o) {
      Id(o, e, n);
      if (e.credential) {
        let r = GL(o, e.provider, e.credential.kind);
        if (r) Id(r, e.credential, n);
      }
    }
    return Je.dropUndefined(n);
  }
  function YL(e, t = []) {
    return Object.entries(e.shape).flatMap(([key, value]) => {
      var r;
      let s = [...t, key];
      let flatKey = (r = Je.fieldMetaForNode(value)) === null || r === undefined ? undefined : r.flatKey;
      if (flatKey) return [[s, flatKey]];
      let l = Je.unwrapZod(value);
      if (Je.zodKind(l) === Je.ZodKind.ZodObject) return YL(l, s);
      throw Error(`simpleCluster: no flatKey on .${s.join(".")}`);
    });
  }
  function JL(e, t) {
    let n = e;
    for (let o of t) {
      if (n === null || typeof n !== "object") return;
      n = n[o];
    }
    return n;
  }
  function Yw(e, t, n) {
    let [o, ...r] = t;
    if (o === undefined)
      return e === undefined
        ? undefined
        : {
            ...e,
          };
    let s = r.length === 0 ? n : Yw(e === null || e === undefined ? undefined : e[o], r, n);
    let a = Je.dropUndefined({
      ...e,
      [o]: s,
    });
    return Object.keys(a).length === 0 ? undefined : a;
  }
  var Fhe = (e) => {
    let t = YL(e);
    return {
      schema: e,
      propMap: Object.fromEntries(t.map(([n, o]) => [n.join("."), o])),
      flatten: (n) => {
        let o = {};
        for (let [r, s] of t) {
          let a = JL(n, r);
          if (a !== undefined) o[s] = a;
        }
        return o;
      },
      unflatten: (n) => {
        let o;
        for (let [r, s] of t) {
          let a = n[s];
          if (a !== undefined) o = Yw(o, r, a);
        }
        return o;
      },
    };
  };
  var Bhe = (credential) => {
    let t = Je.discriminatorKeyOf(credential);
    let found = Object.entries(Ti.DISCRIMINATORS).find(([, value]) => value.nestedPath.at(-1) === t);
    if (found === undefined) throw Error(`unionCluster: no selector discriminates "${t}"`);
    return found[0];
  };
  var Hhe = (e, t) => {
    var n;
    var o;
    var r;
    let credential = t.shape.credential;
    let a = Bhe(credential);
    let filtered = Je.discriminatorArmsOf(credential).filter((y) => y.schema !== undefined);
    let c = (y) => {
      var b;
      return (b = filtered.find((w) => w.id === y)) === null || b === undefined ? undefined : b.schema;
    };
    let u = new Map();
    let f = (y) => {
      var b;
      return ((b = Ti.FLAT_KEY_TO_NESTED_PATH.get(y)) === null || b === undefined ? undefined : b[0]) === e;
    };
    for (let [key, value] of Object.entries(t.shape)) {
      let w = lg(value);
      if (w !== undefined)
        u.set(w, {
          path: [key],
          own: f(w),
        });
    }
    u.set(a, {
      path: ["credential", Je.discriminatorKeyOf(credential)],
      own: false,
    });
    for (let y of filtered)
      for (let [key, value] of Object.entries(y.schema.shape)) {
        let S = lg(value);
        if (S === undefined) continue;
        let j =
          (n = u.get(S)) !== null && n !== undefined
            ? n
            : {
                path: ["credential", key],
                kinds: [],
                own: f(S),
              };
        if (!((o = j.kinds) === null || o === undefined)) o.push(y.id);
        u.set(S, j);
      }
    let h =
      (r = Object.entries(Ti.DISCRIMINATORS).find(([, value]) => value.discriminates === "provider")) ===
        null || r === undefined
        ? undefined
        : r[0];
    let m = (y) => {
      let b = Ad(t, y);
      let w = y[a];
      if (w !== undefined) {
        let S = c(w);
        if (S) b.credential = Ad(S, y);
        else if (h === undefined || y[h] === undefined)
          b.credential = {
            kind: w,
          };
      }
      return b;
    };
    return {
      schema: t,
      leaves: u,
      credentialKinds: filtered.map((y) => y.id),
      rebuild: m,
      unflatten: (y) => ([...u].some(([b, w]) => w.own && y[b] !== undefined) ? m(y) : undefined),
      flatten: (y) => {
        let b = y;
        let credential = b.credential;
        let S = {
          [a]: credential === null || credential === undefined ? undefined : credential.kind,
        };
        Id(t, b, S);
        if (credential !== undefined) {
          let j = credential.kind === undefined ? undefined : c(credential.kind);
          for (let M of j ? [j] : filtered.map((N) => N.schema)) Id(M, credential, S);
        }
        return Je.dropUndefined(S);
      },
      propMap: Object.fromEntries([...u].map(([y, b]) => [b.path.join("."), y])),
    };
  };
  var Khe = {
    schema: ru.InferenceConfig,
    flatten: WL,
    unflatten: Gw,
    rebuild: Gw,
  };
  XL.CLUSTER_REGISTRY = Object.fromEntries(
    Object.entries(Ti.ManagedConfig.shape).flatMap(([key, value]) => {
      if (Je.fieldMetaForNode(value)) return [];
      if (key === "inference") return [[key, Khe]];
      let n = Je.unwrapZod(value);
      if (Je.zodKind(n) !== Je.ZodKind.ZodObject) return [];
      let shape = n.shape;
      if (
        shape.credential !== undefined &&
        Je.zodKind(Je.unwrapZod(shape.credential)) === Je.ZodKind.ZodDiscriminatedUnion
      )
        return [[key, Hhe(key, n)]];
      return [[key, Fhe(n)]];
    }),
  );
  XL.CLUSTER_NAMES = Object.keys(XL.CLUSTER_REGISTRY);
  var Zhe = new Set(
    [...Ti.FLAT_KEY_TO_NESTED_PATH]
      .filter(([, e]) => e[0] !== undefined && e[0] in XL.CLUSTER_REGISTRY)
      .map(([e]) => e),
  );
  function Vhe(e) {
    let t = {};
    for (let [key, value] of Object.entries(e)) {
      if (value === undefined) continue;
      let r = XL.CLUSTER_REGISTRY[key];
      if (r) Object.assign(t, r.flatten(value));
      else t[key] = value;
    }
    return t;
  }
  function qhe(e) {
    let t = {};
    for (let n of XL.CLUSTER_NAMES) {
      let o = XL.CLUSTER_REGISTRY[n].unflatten(e);
      if (o !== undefined) t[n] = o;
    }
    for (let [key, value] of Object.entries(e)) {
      if (value === undefined || Zhe.has(key)) continue;
      t[key] = value;
    }
    return t;
  }
});
//@ chunk-1ny7cxrt.js:1176400-1180449 cjs-unmatched+string-clue
var ug = x(function (nN) {
  Object.defineProperty(nN, "__esModule", {
    value: true,
  });
  nN.ABSENT_INFERENCE_REASONS = undefined;
  nN.evaluateInference = nme;
  nN.droppedKeyIssue = tN;
  nN.describeDroppedKey = rme;
  var ys = yt();
  var iu = $n();
  var eN = Fi();
  var an = ni();
  nN.ABSENT_INFERENCE_REASONS = new Set(["missing", "no_credential"]);
  var eme = new Set(
    [...an.INFERENCE_LEAF_MEMBERSHIP.keys()].filter(
      (key) =>
        ys.isUrlString(an.FlatManagedConfig.shape[key]) || an.getFieldMeta(key).selectsConnection === true,
    ),
  );
  function tme(key, provider, kind, platform) {
    var r;
    var s;
    if (!eme.has(key)) return false;
    let platform_2 =
      (s = (r = an.tryGetFieldMeta(key)) === null || r === undefined ? undefined : r.platformVariant) ===
        null || s === undefined
        ? undefined
        : s.platform;
    if (platform_2 !== undefined && platform !== undefined && platform_2 !== platform) return false;
    let l = an.INFERENCE_LEAF_MEMBERSHIP.get(key);
    return (
      l !== undefined &&
      l.providers.includes(provider) &&
      (l.credentialKinds.length === 0 || (kind !== undefined && l.credentialKinds.includes(kind)))
    );
  }
  function nme(e, t = {}) {
    var n;
    var o;
    var r;
    var s;
    let a = (n = t.keyedErrors) !== null && n !== undefined ? n : [];
    let inference = e.inference;
    let c = t.remoteApplied === false && iu.hasActiveBootstrap(e);
    if (c && !inference) return;
    let u = [];
    let f = (key) => {
      let Z = tN(key, t);
      if (Z && !u.some((F) => F.key === key)) u.push(Z);
      return Z !== undefined;
    };
    let h = (N, msg, reason = "missing") => {
      if (!f(N))
        u.push({
          key: N,
          reason,
          msg,
        });
    };
    let m =
      ((o = e.bootstrap) === null || o === undefined ? undefined : o.enabled) !== false &&
      !iu.hasActiveBootstrap(e) &&
      a.some((N) => N.key === "bootstrapUrl" && !N.cluster);
    if (!inference) {
      if (m) f("bootstrapUrl");
      if (iu.hasActiveBootstrap(e) && t.providerOptional !== true)
        h("inferenceProvider", "inferenceProvider is not set");
      else f("inferenceProvider");
      return u.length > 0 ? QL(undefined, u) : undefined;
    }
    let { provider } = inference;
    let kind = (r = inference.credential) === null || r === undefined ? undefined : r.kind;
    let w = eN.flattenInference(inference);
    let S = () => {
      let N = u;
      if (m && u.some((Z) => nN.ABSENT_INFERENCE_REASONS.has(Z.reason))) {
        let found = a.find((F) => F.key === "bootstrapUrl" && !F.cluster);
        N = [
          ...(found
            ? [
                {
                  key: "bootstrapUrl",
                  reason: "invalid",
                  msg: Xw("bootstrapUrl", found, t),
                },
              ]
            : []),
          ...u.filter((F) => !nN.ABSENT_INFERENCE_REASONS.has(F.reason)),
        ];
      }
      return N.length > 0
        ? QL(provider, N)
        : {
            ok: true,
            provider,
            kind,
          };
    };
    if (!c) {
      for (let N of an.requiredProviderLeaves(provider)) if (!an.isFieldSet(w[N])) h(N, `${N} is not set`);
    }
    for (let N of a) if (!an.isFieldSet(w[N.key]) && tme(N.key, provider, kind, t.platform)) f(N.key);
    if (c) return S();
    if (kind === undefined) {
      for (let N of a) {
        let Z = an.INFERENCE_LEAF_MEMBERSHIP.get(N.key);
        if (
          Z !== undefined &&
          Z.credentialKinds.length > 0 &&
          Z.providers.includes(provider) &&
          !an.isFieldSet(w[N.key])
        )
          f(N.key);
      }
      h(
        "inferenceCredentialKind",
        `no credential configured for provider "${provider}": set inferenceCredentialKind or one of the credential fields`,
        "no_credential",
      );
      return S();
    }
    let j = an.credentialSpecCell(provider, kind);
    if (!j) {
      u.push({
        key: "inferenceCredentialKind",
        reason: "unsupported_kind",
        msg: `inferenceCredentialKind "${kind}" is not supported for provider "${provider}"`,
      });
      return S();
    }
    let filtered = [
      ...j.requiredLeaves,
      ...((s = j.extraRequiredLeaves) !== null && s !== undefined ? s : []),
    ].filter((N) => !an.isFieldSet(w[N]) && !f(N));
    if (filtered.length > 0) {
      let msg = `inferenceCredentialKind is "${kind}" but ${filtered.join(", ")} ${filtered.length > 1 ? "are" : "is"} not set`;
      for (let key of filtered)
        u.push({
          key,
          reason: "missing",
          msg,
        });
    }
    return S();
  }
  function QL(provider, t) {
    return {
      ok: false,
      provider,
      issues: t,
      msg: [...new Set(t.map((n) => n.msg))].join("; "),
    };
  }
  function tN(e, t = {}) {
    var n;
    var o;
    let filtered = ((n = t.keyedErrors) !== null && n !== undefined ? n : []).filter(
      (a) => a.key === e && !ys.intakeReportKeepsValue(a),
    );
    let s = (o = filtered.find((a) => !a.cluster)) !== null && o !== undefined ? o : filtered[0];
    return (
      s && {
        key: e,
        reason: "invalid",
        msg: Xw(e, s, t),
      }
    );
  }
  function rme(e, t = {}) {
    return Xw(e.key, e, t);
  }
  function Xw(e, t, n) {
    var o;
    var r;
    var s;
    if (t.kind === "unknown") return `${e} (not a recognized key)`;
    let a = t.cluster ? "cluster failed to parse" : "set but invalid";
    if (n.quoteReasons === false) return `${e} (${a})`;
    let l = ((o = t.issues) === null || o === undefined ? undefined : o.length)
      ? t.issues
          .map((issue) => `${issue.path.length > 0 ? `${issue.path.join(".")}: ` : ""}${issue.message}`)
          .join("; ")
      : t.msg;
    let c =
      /(?:^|": |; )(?:\.: )?invalid_type\b/.test(t.msg) ||
      ((s =
        (r = t.issues) === null || r === undefined
          ? undefined
          : r.some((h) => h.path.length === 0 && /expected object/.test(h.message))) !== null &&
      s !== undefined
        ? s
        : false);
    let f =
      e in an.FlatManagedConfig.shape &&
      ys.zodKind(ys.unwrapZod(an.FlatManagedConfig.shape[e])) === ys.ZodKind.ZodObject &&
      c
        ? " \u2014 the value must be a single JSON object string, not separate dotted keys"
        : "";
    return `${e} (${a}: ${l}${f})`;
  }
});
//@ chunk-1ny7cxrt.js:1180449-1180568 cjs-unmatched+string-clue
var iN = x(function (rN) {
  Object.defineProperty(rN, "__esModule", {
    value: true,
  });
  rN.normalize = ame;
  function ame(e, t) {
    return e;
  }
});
//@ chunk-1ny7cxrt.js:1180568-1182018 cjs-unmatched+string-clue
var uN = x(function (cN) {
  Object.defineProperty(cN, "__esModule", {
    value: true,
  });
  cN.normalize = ume;
  var ou = Fi();
  var oN = fl();
  var sN = Ns();
  var aN = (e) => e !== null && typeof e === "object" && !Array.isArray(e);
  var lN = (e) => (Array.isArray(e) ? "array" : e === null ? "null" : typeof e);
  function cme(e, t, n) {
    var o;
    let r = new Set(
      Object.keys((o = ou.CLUSTER_REGISTRY[e].propMap) !== null && o !== undefined ? o : {})
        .filter((key) => key.includes("."))
        .map((key) => key.slice(0, key.indexOf("."))),
    );
    if (r.size === 0) return t;
    let s = {
      ...t,
    };
    for (let a of r) {
      let l = s[a];
      if (l === undefined || l === null) continue;
      if (typeof l === "string")
        try {
          l = JSON.parse(l);
        } catch (error) {}
      if (aN(l)) {
        s[a] = l;
        continue;
      }
      n.push(`Failed to parse bootstrap cluster "${e}.${a}": expected object, got ${lN(l)}`);
      delete s[a];
    }
    return s;
  }
  function ume(e, t, n, o = []) {
    let r = {
      ...e,
    };
    let s = [];
    for (let a of ou.CLUSTER_NAMES) {
      let l = r[a];
      delete r[a];
      if (l === undefined || l === null) continue;
      if (typeof l === "string")
        try {
          l = JSON.parse(l);
        } catch (error) {}
      if (!aN(l)) {
        t.push(`Failed to parse bootstrap cluster "${a}": expected object, got ${lN(l)}`);
        continue;
      }
      s.push(a);
      l = cme(a, l, t);
      sN.reportUnread(a, oN.ManagedConfig.shape[a], l, (c, u, f) => o.push(f), {
        stopAtKeys: true,
      });
      try {
        Object.assign(r, ou.CLUSTER_REGISTRY[a].flatten(l));
      } catch (error) {
        let u = error instanceof Error ? error.message : String(error);
        t.push(`Failed to parse bootstrap cluster "${a}": ${u}`);
        if (!(n === null || n === undefined))
          n("bootstrap nested cluster flatten threw; cluster dropped", {
            key: a,
            message: u,
          });
      }
    }
    if (!(n === null || n === undefined))
      n("bootstrap intake normalized v2 nested response", {
        clusters: s,
      });
    return r;
  }
});
//@ chunk-1ny7cxrt.js:1182018-1183680 cjs-unmatched+string-clue
var Td = x(function (br) {
  var fme =
    (br && br.__createBinding) ||
    (Object.create
      ? function (e, t, n, o) {
          if (o === undefined) o = n;
          var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, n);
          if (
            !ownPropertyDescriptor ||
            ("get" in ownPropertyDescriptor
              ? !t.__esModule
              : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
          )
            ownPropertyDescriptor = {
              enumerable: true,
              get: function () {
                return t[n];
              },
            };
          Object.defineProperty(e, o, ownPropertyDescriptor);
        }
      : function (e, t, n, o) {
          if (o === undefined) o = n;
          e[o] = t[n];
        });
  var pme =
    (br && br.__setModuleDefault) ||
    (Object.create
      ? function (e, value) {
          Object.defineProperty(e, "default", {
            enumerable: true,
            value,
          });
        }
      : function (e, t) {
          e.default = t;
        });
  var dN =
    (br && br.__importStar) ||
    (function () {
      var e = function (t) {
        e =
          Object.getOwnPropertyNames ||
          function (n) {
            var o = [];
            for (var key in n) if (Object.prototype.hasOwnProperty.call(n, key)) o[o.length] = key;
            return o;
          };
        return e(t);
      };
      return function (t) {
        if (t && t.__esModule) return t;
        var n = {};
        if (t != null) {
          for (var o = e(t), r = 0; r < o.length; r++) if (o[r] !== "default") fme(n, t, o[r]);
        }
        pme(n, t);
        return n;
      };
    })();
  Object.defineProperty(br, "__esModule", {
    value: true,
  });
  br.NORMALIZERS = br.CONFIG_DOCUMENT_META_NAMES = undefined;
  br.normalize = _me;
  var fN = Fi();
  var hme = dN(iN());
  var mme = dN(uN());
  br.CONFIG_DOCUMENT_META_NAMES = ["$schemaVersion", "$schema"];
  br.NORMALIZERS = {
    1: hme.normalize,
    2: mme.normalize,
  };
  var gme = (e) => e !== null && typeof e === "object" && !Array.isArray(e);
  function yme(e) {
    let $schemaVersion = e.$schemaVersion;
    if (typeof $schemaVersion === "number" && Number.isInteger($schemaVersion) && $schemaVersion >= 1)
      return $schemaVersion;
    return fN.CLUSTER_NAMES.some((n) => e[n] !== undefined) ? 2 : 1;
  }
  function _me(e, t) {
    var n;
    if (!gme(e))
      return {
        flat: {},
        version: 1,
        warnings: [],
        unread: [],
      };
    let o = {
      ...e,
    };
    for (let c of br.CONFIG_DOCUMENT_META_NAMES) delete o[c];
    let r = yme(e);
    let s =
      (n = br.NORMALIZERS[r]) !== null && n !== undefined
        ? n
        : br.NORMALIZERS[Math.max(...Object.keys(br.NORMALIZERS).map(Number))];
    let a = [];
    let l = [];
    return {
      flat: s(o, a, t, l),
      version: r,
      warnings: a,
      unread: l,
    };
  }
});
//@ chunk-1ny7cxrt.js:1183680-1192775 cjs-unmatched+string-clue
var pg = x(function (fg) {
  Object.defineProperty(fg, "__esModule", {
    value: true,
  });
  fg.nonBootstrapableKeys = fg.bootstrapableKeys = undefined;
  fg.describeUnusableBody = bme;
  fg.unrecognizedKeyMessage = wN;
  fg.parseBootstrapConfig = vme;
  fg.collectConsentTargets = Ame;
  var mN = Xr();
  var Ia = yt();
  var gN = Ir();
  var yN = ug();
  var _s = Ar();
  var _N = Td();
  var lt = ni();
  var bN = Ns();
  var vN = ni();
  Object.defineProperty(fg, "bootstrapableKeys", {
    enumerable: true,
    get: function () {
      return vN.bootstrapableKeys;
    },
  });
  Object.defineProperty(fg, "nonBootstrapableKeys", {
    enumerable: true,
    get: function () {
      return vN.nonBootstrapableKeys;
    },
  });
  function bme(e, t = {}, n = {}) {
    let o = new Set();
    let r = [];
    for (let l of e) {
      if (Ia.intakeReportKeepsValue(l) && lt.tryGetFieldMeta(l.key) !== undefined) continue;
      if (!l.cluster && !(l.key in t) && !o.has(l.key)) {
        o.add(l.key);
        r.push(yN.describeDroppedKey(l, n));
      }
    }
    let s = [
      ...new Set(
        e
          .filter((l) => l.cluster)
          .map((l) => {
            var c;
            return n.quoteReasons === false
              ? `cluster "${((c = lt.FLAT_KEY_TO_NESTED_PATH.get(l.key)) !== null && c !== undefined ? c : [l.key])[0]}" failed to parse`
              : l.msg;
          }),
      ),
    ];
    let filtered = [r.length > 0 ? `every supplied key failed validation: ${r.join(", ")}` : "", ...s].filter(
      Boolean,
    );
    return filtered.length > 0 ? filtered.join("; ") : "no recognized keys";
  }
  function wN(e) {
    let t = lt.retiredFlatKeyEffect(e);
    return t !== undefined
      ? `Bootstrap intake dropped "${e}": this key has been retired \u2014 ${t}`
      : `Bootstrap intake dropped "${e}": not a recognized configuration key (check the spelling; a newer Claude Desktop release may read it)`;
  }
  function vme(
    e,
    trustedOrigin,
    n,
    o = {
      includeInternal: false,
    },
    r,
  ) {
    var s;
    var a;
    var l;
    var c;
    if (!e || typeof e !== "object" || Array.isArray(e))
      return {
        config: {},
        rejected: [],
        warnings: [],
        keyedParseErrors: [],
        sentKeys: [],
        issueDetails: new Map(),
      };
    let { flat, warnings, unread } = _N.normalize(e, n);
    let expiresAt = typeof flat.expiresAt === "number" && flat.expiresAt > 0 ? flat.expiresAt : undefined;
    let y =
      (s = r === null || r === undefined ? undefined : r.allowedKeys) !== null && s !== undefined
        ? s
        : lt.bootstrapableKeys(o);
    let b = new Set(y);
    let w = [];
    let S = lt.detectDeprecations(flat, {
      keys: y,
      editor: r === null || r === undefined ? undefined : r.editor,
    });
    let j = [];
    let M = [];
    let legacyFlatKeys = lt.resolveLegacyFlatKeys(
      flat,
      (ve, msg) => {
        if (b.has(ve)) {
          w.push({
            key: ve,
            msg,
          });
          j.push(ve);
          if (!(n === null || n === undefined))
            n("bootstrap key failed validation", {
              key: ve,
              msg,
            });
        } else M.push(ve);
      },
      {
        editor: r === null || r === undefined ? undefined : r.editor,
      },
    );
    for (let ve of M) if (!(ve in legacyFlatKeys)) legacyFlatKeys[ve] = undefined;
    let Z = new Set();
    let F = (ve) => {
      var Ue;
      Z.add(ve);
      if (!((Ue = r === null || r === undefined ? undefined : r.onFailClosed) === null || Ue === undefined))
        Ue.call(r, ve);
    };
    let X = new Map();
    let he = new Set();
    for (let warning of warnings) {
      let Ue =
        (a = /^Failed to parse bootstrap cluster "([^"]+)"/.exec(warning)) === null || a === undefined
          ? undefined
          : a[1];
      if (!Ue) continue;
      for (let [kt, je] of lt.FLAT_KEY_TO_NESTED_PATH) {
        if (!Ia.isReadBy(lt.getFieldMeta(kt), (l = o.reader) !== null && l !== undefined ? l : "desktop"))
          continue;
        if (`${je.join(".")}.`.startsWith(`${Ue}.`)) {
          w.push({
            key: kt,
            msg: warning,
            cluster: true,
          });
          he.add(kt);
        }
      }
    }
    let configRecord = lt.parseConfigRecord(legacyFlatKeys, {
      allowedKeys: y,
      schemaFor: r === null || r === undefined ? undefined : r.schemaFor,
      onFailClosed: F,
      channel: r === null || r === undefined ? undefined : r.channel,
      editor: r === null || r === undefined ? undefined : r.editor,
      onIssues: (ve, Ue) => X.set(ve, Ue),
      onInvalid: (key, msg, kt) => {
        w.push(
          kt
            ? {
                key,
                msg,
                kind: kt,
              }
            : {
                key,
                msg,
              },
        );
        if (!(n === null || n === undefined))
          n("bootstrap key failed validation", {
            key,
            msg,
          });
      },
    });
    for (let ve of j) lt.standInFailClosed(configRecord, ve, () => F(ve));
    for (let ve of [
      ...Object.keys(legacyFlatKeys)
        .filter((key) => key !== "expiresAt" && lt.tryGetFieldMeta(key) === undefined)
        .map(bN.reportableName),
      ...unread,
    ]) {
      let msg = wN(ve);
      w.push({
        key: ve,
        msg,
        kind: "unknown",
      });
      if (!(n === null || n === undefined))
        n("bootstrap key failed validation", {
          key: ve,
          msg,
        });
    }
    for (let ve of he)
      if (b.has(ve) && configRecord[ve] === undefined && !lt.isInferenceConnectionKey(ve))
        lt.standInFailClosed(configRecord, ve, () => F(ve));
    for (let ve of S)
      w.push({
        key: ve.key,
        msg: mN.describeDeprecation(ve),
        kind: "deprecated",
        deprecation: ve,
      });
    let filtered = Object.keys(legacyFlatKeys).filter((key) => key !== "expiresAt");
    if (n) {
      let keys = Object.keys(configRecord);
      let filtered_2 = filtered.filter((kt) => !keys.includes(kt));
      if (filtered_2.length > 0)
        n("bootstrap intake dropped keys", {
          sentKeys: filtered,
          keptKeys: keys,
          dropped: filtered_2,
        });
    }
    let Ne =
      (c = r === null || r === undefined ? undefined : r.channel) !== null && c !== undefined
        ? c
        : "bootstrap";
    let rejected =
      Ne === "mdm" || Ne === "local"
        ? []
        : wme(configRecord, {
            trustedOrigin,
            allowLoopbackResponseUrls:
              r === null || r === undefined ? undefined : r.allowLoopbackResponseUrls,
            channel: Ne,
            onDebug: n,
            onPolicyError: (key, msg) =>
              w.push({
                key,
                msg,
              }),
            onFailClosed: F,
          });
    for (let [ve, Ue] of w.entries())
      if (Ue.kind === undefined && Z.has(Ue.key))
        w[ve] = {
          ...Ue,
          stoodIn: true,
        };
    if (expiresAt !== undefined) configRecord.expiresAt = expiresAt;
    return {
      config: configRecord,
      rejected,
      warnings,
      keyedParseErrors: w,
      sentKeys: filtered,
      issueDetails: X,
    };
  }
  function wme(e, t) {
    var n;
    var o;
    var r;
    var s;
    var a;
    var l;
    var c;
    var u;
    let f = [];
    for (let h of lt.bootstrapableKeys({
      includeInternal: true,
      reader: "all",
    })) {
      let m = e[h];
      if (m === undefined) continue;
      let fieldMeta = lt.getFieldMeta(h);
      let remotePolicy = fieldMeta.remotePolicy;
      if (
        ((n = remotePolicy === null || remotePolicy === undefined ? undefined : remotePolicy.hybrid) ===
          null || n === undefined
          ? undefined
          : n.scope) === "only" &&
        t.channel !== "hybrid"
      ) {
        delete e[h];
        if (!((o = t.onPolicyError) === null || o === undefined))
          o.call(
            t,
            h,
            `Bootstrap intake dropped "${h}": only honored when delivered by the Anthropic-hosted control plane`,
          );
        continue;
      }
      let w =
        t.allowLoopbackResponseUrls ||
        (t.channel === "hybrid" &&
          ((r = remotePolicy === null || remotePolicy === undefined ? undefined : remotePolicy.hybrid) ===
            null || r === undefined
            ? undefined
            : r.loopback) === true);
      if (
        (remotePolicy === null || remotePolicy === undefined ? undefined : remotePolicy.rejectLoopback) &&
        Ime(m).some((S) => dg(S) && !(w && Cme(S)))
      ) {
        if ("failClosedValue" in fieldMeta)
          lt.standInFailClosed(e, h, () => {
            var S;
            return (S = t.onFailClosed) === null || S === undefined ? undefined : S.call(t, h);
          });
        else delete e[h];
        if (!((s = t.onDebug) === null || s === undefined))
          s.call(t, "bootstrap rejected loopback/non-https URL", {
            key: h,
          });
        if (!((a = t.onPolicyError) === null || a === undefined))
          a.call(t, h, `Bootstrap intake dropped "${h}": loopback or non-https URL`);
        continue;
      }
      if (
        (remotePolicy === null || remotePolicy === undefined ? undefined : remotePolicy.originPinned) &&
        t.trustedOrigin !== undefined &&
        typeof m === "string"
      ) {
        if (!Eme(m, t.trustedOrigin)) {
          delete e[h];
          f.push(h);
          if (!((l = t.onPolicyError) === null || l === undefined))
            l.call(t, h, `Bootstrap intake dropped "${h}": origin does not match the bootstrap server`);
          continue;
        }
      }
      if (
        (remotePolicy === null || remotePolicy === undefined ? undefined : remotePolicy.mcpUrlHygiene) &&
        Array.isArray(m)
      ) {
        let { kept, dropped } = Sme(m, h, t.onDebug);
        if (dropped > 0) {
          if (!((c = t.onPolicyError) === null || c === undefined))
            c.call(
              t,
              h,
              `${dropped} of ${m.length} "${h}" bootstrap entr${m.length === 1 ? "y" : "ies"} dropped for loopback/non-https URL`,
            );
        }
        if (dropped > 0 && kept.length === 0)
          lt.standInFailClosed(e, h, () => {
            var M;
            return (M = t.onFailClosed) === null || M === undefined ? undefined : M.call(t, h);
          });
        else if (dropped > 0) e[h] = kept;
      }
      if (
        (remotePolicy === null || remotePolicy === undefined
          ? undefined
          : remotePolicy.marketplaceUrlHygiene) &&
        Array.isArray(m)
      ) {
        let { kept, dropped } = Ome(m, h, t.onDebug);
        if (dropped > 0) {
          if (!((u = t.onPolicyError) === null || u === undefined))
            u.call(
              t,
              h,
              `${dropped} of ${m.length} "${h}" bootstrap entr${m.length === 1 ? "y" : "ies"} dropped for loopback/non-https URL`,
            );
        }
        e[h] = kept;
      }
    }
    return f;
  }
  function Ome(e, key, onDebug) {
    let o = [];
    let dropped = 0;
    for (let [s, a] of e.entries()) {
      if (!a || typeof a !== "object") continue;
      let l = a;
      if (typeof l.url === "string" && dg(l.url)) {
        dropped += 1;
        if (!(onDebug === null || onDebug === undefined))
          onDebug("bootstrap dropped loopback/non-https marketplace entry", {
            key,
            index: s,
          });
        continue;
      }
      o.push(a);
    }
    return {
      kept: o,
      dropped,
    };
  }
  function Sme(e, key, onDebug) {
    let o = [];
    let r = 0;
    for (let s of e) {
      let a = kme(s);
      if (a !== undefined && dg(a)) {
        r += 1;
        if (!(onDebug === null || onDebug === undefined))
          onDebug("bootstrap dropped loopback-url MCP entry", {
            key,
            name: s.name,
          });
        continue;
      }
      if (!_s.isBuiltinMcpEntry(s) && s.transport !== "stdio" && _s.oauthAsSelectionUrls(s.oauth).some(dg)) {
        r += 1;
        if (!(onDebug === null || onDebug === undefined))
          onDebug("bootstrap dropped MCP entry with loopback OAuth endpoint", {
            key,
            name: s.name,
          });
        continue;
      }
      o.push(s);
    }
    return {
      kept: o,
      dropped: r,
    };
  }
  function kme(e) {
    if (_s.isBuiltinMcpEntry(e)) return "customUrl" in e ? e.customUrl : undefined;
    return e.transport === "stdio" ? undefined : e.url;
  }
  function Eme(e, trustedOrigin) {
    try {
      return new URL(e).origin === trustedOrigin;
    } catch (error) {
      return false;
    }
  }
  function Pme(e) {
    var t;
    return [
      (t = lt.getFieldMeta(e).legacyFlatKey) === null || t === undefined ? undefined : t.name,
      gN.formerGatewayIdpKeyOf(e),
    ].filter((n) => n !== undefined);
  }
  var Qw = (e) => (typeof e === "string" ? e : lt.canonicalJson(e));
  function pN(e, t) {
    let n = {};
    for (let o of t) {
      let reduced = o
        .split(".")
        .reduce((acc, a) => (acc === null || acc === undefined ? undefined : acc[a]), e);
      if (reduced !== undefined) n[o] = reduced;
    }
    return n;
  }
  function Ame(e) {
    var t;
    let n = [];
    for (let o of lt.keysWithRemotePolicy("requiresUserConsent")) {
      let r = e[o];
      let s = Array.isArray(r) && r.length === 0;
      if (r !== undefined && !s && !lt.isFailClosedStandIn(o, r)) {
        let origin =
          typeof r === "string" && Ia.isUrlString(lt.FlatManagedConfig.shape[o])
            ? new URL(r).origin
            : undefined;
        let l = Pme(o);
        n.push({
          label: o,
          value: Qw(r),
          key: o,
          origin,
          ...(l.length > 0
            ? {
                formerLabels: l,
              }
            : {}),
        });
      }
    }
    for (let o of lt.bootstrapableKeys({
      includeInternal: true,
    })) {
      let r = e[o];
      if (r === null || typeof r !== "object") continue;
      let s = Ia.consentRequiringSubfieldKeys(lt.FlatManagedConfig.shape[o]);
      if (s.size === 0) continue;
      if (!Array.isArray(r)) {
        let l = pN(r, s);
        let keys = Object.keys(l);
        if (keys.length > 0)
          n.push({
            label: o,
            value: Qw(l),
            key: o,
            subfields: keys,
          });
        continue;
      }
      let a = new Map();
      for (let [l, c] of r.entries()) {
        let found = [c.name, c.repo, c.url].find((h) => typeof h === "string");
        let f = pN(c, s);
        if (Object.keys(f).length > 0) {
          let h = `${o}[${found !== null && found !== undefined ? found : l}]`;
          let m = ((t = a.get(h)) !== null && t !== undefined ? t : 0) + 1;
          a.set(h, m);
          n.push({
            label: m === 1 ? h : `${h}#${m}`,
            value: Qw(f),
            key: o,
            entryIndex: l,
            entryId: found,
          });
        }
      }
    }
    return n;
  }
  function Ime(e) {
    if (typeof e === "string") return [e];
    if (Array.isArray(e)) return e.flatMap((t) => (typeof t === "string" ? [t] : hN(t)));
    return hN(e);
  }
  function hN(e) {
    let url = typeof e === "object" && e !== null ? e.url : undefined;
    return typeof url === "string" ? [url] : [];
  }
  function dg(e) {
    try {
      let { protocol, hostname } = new URL(e);
      return protocol !== "https:" || _s.isLoopbackHost(hostname);
    } catch (error) {
      return true;
    }
  }
  function Cme(e) {
    try {
      return _s.LOOPBACK_HOSTS.has(new URL(e).hostname);
    } catch (error) {
      return false;
    }
  }
});
//@ chunk-1ny7cxrt.js:1192775-1200241 cjs-unmatched+string-clue
var Dd = x(function (e0) {
  Object.defineProperty(e0, "__esModule", {
    value: true,
  });
  e0.appliesUnder =
    e0.runsSessionsOffDevice =
    e0.FORM_FIELD_BY_ID =
    e0.FORM_FIELDS =
    e0.subFieldsOf =
      undefined;
  e0.targetCluster = $d;
  e0.setInferenceProvider = Nme;
  e0.setInferenceCredentialKind = Ume;
  e0.credentialKindsOffered = zme;
  e0.isFormFieldVisible = AN;
  e0.formFieldsForReader = Bme;
  e0.isFieldRequired = Vme;
  e0.withoutInapplicable = Gme;
  e0.getFormField = Wme;
  e0.elementOf = CN;
  e0.objectColumnsOf = TN;
  e0.itemColumnsOf = $N;
  e0.storageTypeOf = Yme;
  e0.optionValuesOf = Jme;
  e0.recordValueOptionsOf = Xme;
  e0.controlTypeOf = Qme;
  var ke = yt();
  Object.defineProperty(e0, "subFieldsOf", {
    enumerable: true,
    get: function () {
      return ke.subFieldsOf;
    },
  });
  var bs = $n();
  var Sn = Fi();
  var SN = Ir();
  var ri = ni();
  var kN = Jm();
  var jme = new Map(
    [...ri.FLAT_KEY_TO_NESTED_PATH]
      .filter(([, e]) => e[0] !== undefined && e[0] in Sn.CLUSTER_REGISTRY)
      .map(([e, t]) => [e, t[0]]),
  );
  var EN = new Map(
    Object.values(Sn.CLUSTER_REGISTRY)
      .filter((e) => e.rebuild === undefined)
      .flatMap((e) => {
        var t;
        return Object.entries((t = e.propMap) !== null && t !== undefined ? t : {}).map(([key, value]) => [
          value,
          key.split("."),
        ]);
      }),
  );
  function $d(e) {
    let t = bs.offDeviceClusterOf(e);
    return t === undefined
      ? undefined
      : {
          name: t,
          entry: Sn.CLUSTER_REGISTRY[t],
        };
  }
  var hg = (e, id) => {
    var n;
    var o;
    return (o = (n = $d(e)) === null || n === undefined ? undefined : n.entry.leaves) === null ||
      o === undefined
      ? undefined
      : o.get(id);
  };
  function PN(e, t) {
    var n;
    return hg(e, t) === undefined ? jme.get(t) : (n = $d(e)) === null || n === undefined ? undefined : n.name;
  }
  function xme(e, t) {
    let n = PN(e, t);
    if (n === undefined) return e[t];
    let o = e[n];
    if (o === undefined) return;
    let r = EN.get(t);
    if (r) return Sn.getAtPath(o, r);
    return Sn.CLUSTER_REGISTRY[n].flatten(o)[t];
  }
  function Lme(e, t, n) {
    var o;
    var r;
    var s;
    let a = PN(e, t);
    if (a === undefined)
      return {
        ...e,
        [t]: n,
      };
    let l = EN.get(t);
    if (l) {
      let b = e[a];
      return {
        ...e,
        [a]: (o = Sn.setAtPath(b, l, n)) !== null && o !== undefined ? o : {},
      };
    }
    let c = Sn.CLUSTER_REGISTRY[a];
    let u = e[a];
    let h = {
      ...(u === undefined && c.leaves !== undefined && e.inference !== undefined
        ? Object.fromEntries(
            Object.entries(Sn.flattenInference(e.inference)).filter(([key]) => {
              var w;
              var S;
              return (
                key === "inferenceProvider" ||
                ((S = (w = c.leaves) === null || w === undefined ? undefined : w.get(key)) === null ||
                S === undefined
                  ? undefined
                  : S.own) === false
              );
            }),
          )
        : {}),
      ...(u !== undefined ? c.flatten(u) : {}),
      [t]: n,
    };
    let m = ke.dropUndefined({
      ...e,
      [a]: ((r = c.rebuild) !== null && r !== undefined ? r : c.unflatten)(h),
    });
    if (
      !(
        a !== "inference" &&
        m.inference !== undefined &&
        ((s = hg(e, t)) === null || s === undefined ? undefined : s.own) === false
      ) ||
      m.inference === undefined
    )
      return m;
    return ke.dropUndefined({
      ...m,
      inference: Sn.unflattenInference({
        ...Sn.flattenInference(m.inference),
        [t]: n,
      }),
    });
  }
  function Nme(e, t) {
    if (t === undefined)
      return ke.dropUndefined({
        ...e,
        inference: undefined,
      });
    let n = e.inference !== undefined ? Sn.flattenInference(e.inference) : {};
    return ke.dropUndefined({
      ...e,
      inference: Sn.unflattenInference({
        ...n,
        inferenceProvider: t,
      }),
    });
  }
  function Ume(e, t) {
    var n;
    let o = $d(e);
    if (o !== undefined) {
      let s = e;
      let a = Object.fromEntries(
        Object.entries(o.entry.flatten(s[o.name])).filter(([key]) => {
          var u;
          var f;
          return (
            ((f = (u = o.entry.leaves) === null || u === undefined ? undefined : u.get(key)) === null ||
            f === undefined
              ? undefined
              : f.kinds) === undefined
          );
        }),
      );
      let l = ke.dropUndefined({
        ...e,
        [o.name]: ((n = o.entry.rebuild) !== null && n !== undefined ? n : o.entry.unflatten)({
          ...a,
          inferenceCredentialKind: t,
        }),
      });
      return l.inference === undefined
        ? l
        : {
            ...l,
            inference: ke.dropUndefined({
              ...l.inference,
              credential:
                t === undefined
                  ? undefined
                  : {
                      kind: t,
                    },
            }),
          };
    }
    if (!e.inference) return e;
    let credential =
      t === undefined
        ? undefined
        : {
            kind: t,
          };
    return {
      ...e,
      inference: ke.dropUndefined({
        ...e.inference,
        credential,
      }),
    };
  }
  function zme(e) {
    var t;
    var n;
    let credentialKinds = (t = $d(e)) === null || t === undefined ? undefined : t.entry.credentialKinds;
    if (credentialKinds !== undefined) return credentialKinds;
    let provider = (n = e.inference) === null || n === undefined ? undefined : n.provider;
    return provider === undefined ? [] : SN.CREDENTIAL_KINDS_FOR_PROVIDER[provider];
  }
  function AN(e, t) {
    var n;
    var o;
    var r;
    let s = hg(t, e.id);
    if (s !== undefined) {
      if (s.kinds !== undefined && !s.kinds.includes(bs.credentialKindOf(t))) return false;
      let show = (n = e.meta.predicates) === null || n === undefined ? undefined : n.show;
      return !show || show(t);
    }
    if (
      e.providers.length > 0 &&
      e.providers.length < ke.PROVIDERS.length &&
      !e.providers.includes((o = t.inference) === null || o === undefined ? undefined : o.provider)
    )
      return false;
    let a = bs.credentialKindOf(t);
    if (e.credentialKinds.length > 0 && !e.credentialKinds.includes(a)) return false;
    let show = (r = e.meta.predicates) === null || r === undefined ? undefined : r.show;
    return !show || show(t);
  }
  function Fme(e, t, meta) {
    var o;
    var r;
    var s;
    let a = ri.INFERENCE_LEAF_MEMBERSHIP.get(e);
    let discriminates = (o = ri.DISCRIMINATORS[e]) === null || o === undefined ? undefined : o.discriminates;
    let c = kN.effectiveGroupOverride(t);
    return {
      id: e,
      meta,
      node: t,
      providers:
        (r = a === null || a === undefined ? undefined : a.providers) !== null && r !== undefined ? r : [],
      credentialKinds:
        (s = a === null || a === undefined ? undefined : a.credentialKinds) !== null && s !== undefined
          ? s
          : [],
      ...(discriminates && {
        discriminates,
      }),
      ...(c && {
        groupOverride: c,
      }),
      get: (u) => xme(u, e),
      set: (u, f) => Lme(u, e, f),
    };
  }
  function IN(e) {
    let t = ri.FlatManagedConfig.shape[e];
    let meta = ke.fieldMetaForNode(t);
    if (!meta) throw Error(`FORM_FIELDS: no meta for ${e}`);
    return Fme(e, t, meta);
  }
  e0.FORM_FIELDS = ri
    .flatConfigKeys({
      includeInternal: true,
    })
    .map(IN);
  var ON = new Map([["desktop", e0.FORM_FIELDS]]);
  function Bme(e) {
    let t = ON.get(e);
    if (t === undefined) {
      t = ri
        .flatConfigKeys({
          includeInternal: true,
          reader: e,
        })
        .map(IN);
      ON.set(e, t);
    }
    return t;
  }
  e0.FORM_FIELD_BY_ID = new Map(e0.FORM_FIELDS.map((e) => [e.id, e]));
  var Hme = ke.offDeviceExecutionTargets();
  var runsSessionsOffDevice = (e) => {
    let t = e;
    return Hme.some((n) => t[n] !== undefined);
  };
  e0.runsSessionsOffDevice = runsSessionsOffDevice;
  var appliesUnder = (e, t) => {
    let { executionTarget, appliesOffDeviceOnly } = e.meta.support;
    let r = e0.runsSessionsOffDevice(t);
    return appliesOffDeviceOnly === true ? r : executionTarget !== "desktop" || !r;
  };
  e0.appliesUnder = appliesUnder;
  function Vme(e, t) {
    var n;
    var o;
    var r;
    var s;
    var a;
    if (
      !AN(e, t) ||
      !e0.appliesUnder(e, t) ||
      (e.meta.support.executionTarget === undefined &&
        e0.runsSessionsOffDevice(t) &&
        hg(t, e.id) === undefined)
    )
      return false;
    if (
      (o = (n = e.meta.predicates) === null || n === undefined ? undefined : n.required) === null ||
      o === undefined
        ? undefined
        : o.call(n, t)
    )
      return true;
    let provider = (r = t.inference) === null || r === undefined ? undefined : r.provider;
    let c = bs.credentialKindOf(t);
    return (
      provider !== undefined &&
      c !== undefined &&
      !bs.hasActiveBootstrap(t) &&
      ((a =
        (s = ri.credentialSpecCell(provider, c)) === null || s === undefined
          ? undefined
          : s.extraRequiredLeaves) !== null && a !== undefined
        ? a
        : []
      ).includes(e.id)
    );
  }
  var filtered = e0.FORM_FIELDS.filter((e) => e.meta.support.appliesOffDeviceOnly === true);
  function Gme(e) {
    return (e0.runsSessionsOffDevice(e) ? e0.FORM_FIELDS : filtered).reduce(
      (acc, o) => (e0.appliesUnder(o, acc) || o.get(acc) === undefined ? acc : o.set(acc, undefined)),
      e,
    );
  }
  function Wme(e) {
    let t = e0.FORM_FIELD_BY_ID.get(e);
    if (!t) throw Error(`unknown form field: ${e}`);
    return t;
  }
  function CN(node) {
    let t = ke.unwrapZod(node);
    return ke.arrayElementOf(t);
  }
  function TN(e) {
    return ke.subFieldsOf(e.node);
  }
  function $N(e) {
    return ke.subFieldsOf(CN(e.node));
  }
  function Yme(e) {
    let t = ke.unwrapZod(e);
    let n = ke.zodKind(t);
    if (n === ke.ZodKind.ZodBoolean) return "boolean";
    if (n === ke.ZodKind.ZodNumber) return ke.numberIsInt(t) ? "integer" : "real";
    return "string";
  }
  function Jme(e, t) {
    let optionValues = e.meta.optionValues;
    if (optionValues) {
      let l = ke.enumOptionsOf(e.node);
      return typeof t === "string" &&
        !optionValues.includes(t) &&
        (l === null || l === undefined ? undefined : l.includes(t))
        ? l.filter((c) => optionValues.includes(c) || c === t)
        : optionValues;
    }
    let o = ke.unwrapZod(e.node);
    let r = ke.zodKind(o);
    let s = r === ke.ZodKind.ZodArray ? ke.arrayElementOf(o) : undefined;
    let a = r === ke.ZodKind.ZodRecord ? ke.recordKeyTypeOf(o) : undefined;
    return (
      (r === ke.ZodKind.ZodArray
        ? s && ke.enumOptionsOf(s)
        : r === ke.ZodKind.ZodRecord
          ? a && ke.enumOptionsOf(a)
          : ke.enumOptionsOf(e.node)) || undefined
    );
  }
  function Xme(e) {
    var t;
    return (t = e.meta.optionValues) !== null && t !== undefined ? t : ke.recordValueEnumOf(e.node);
  }
  function Qme(e) {
    if (e.meta.control) return e.meta.control;
    let t = ke.zodKind(ke.unwrapZod(e.node));
    if (t === ke.ZodKind.ZodArray) return $N(e).length > 0 ? "objectList" : "stringArray";
    if (t === ke.ZodKind.ZodObject) return TN(e).length > 0 ? "object" : "json";
    if (t === ke.ZodKind.ZodEnum) return "enum";
    if (t === ke.ZodKind.ZodRecord) return "record";
    if (t === ke.ZodKind.ZodBoolean) return "boolean";
    if (t === ke.ZodKind.ZodNumber) return "number";
    return e.meta.multiline ? "textarea" : "string";
  }
});
//@ chunk-1ny7cxrt.js:1200241-1204721 cjs-unmatched+string-clue
var _g = x(function (jN) {
  Object.defineProperty(jN, "__esModule", {
    value: true,
  });
  jN.isEmptyRowValue = jN.isEmptyValue = jN.isEmptySubValue = jN.CONFIGURATION_CATEGORIES = undefined;
  jN.stripHiddenSubFields = gge;
  jN.missingSubFields = vge;
  var sr = Dd();
  var ln = mn();
  var yg = ni();
  jN.CONFIGURATION_CATEGORIES = {
    connection: {
      title: ln.msg({
        defaultMessage: "Connection",
        id: "KtZV9pULgo",
      }),
      description: ln.msg({
        defaultMessage: "Choose where Claude Desktop sends inference requests.",
        id: "Amxb69AvfR",
      }),
    },
    sandbox: {
      title: ln.msg({
        defaultMessage: "Capabilities",
        description:
          "Title of the Claude Desktop deployment settings page that holds what the desktop app may do on the device (tools, built-in browser, coding, files): an entry under Desktop 3P in the organization admin settings navigation, a section of the Desktop setup window, and a heading in the configuration reference. Noun. Use the same word as the organization-wide Capabilities settings page.",
        id: "tJF62KpQGK",
      }),
    },
    connectors: {
      title: ln.msg({
        defaultMessage: "Connectors",
        id: "2mMJRvsAg1",
      }),
    },
    telemetry: {
      title: ln.msg({
        defaultMessage: "Telemetry & updates",
        id: "Ba3MtjwP5h",
      }),
      banner: ln.msg({
        defaultMessage:
          "Prompts, completions, and your data are never sent to Anthropic. Telemetry covers crash and usage signals only.",
        id: "enn6AdQzxk",
      }),
    },
    limits: {
      title: ln.msg({
        defaultMessage: "Limits",
        id: "TDrunp5flH",
      }),
    },
    appearance: {
      title: ln.msg({
        defaultMessage: "Appearance",
        description:
          "Title of the Claude Desktop deployment settings page for how the deployed app presents itself to its users (display name and subtitle, an organization banner, in-app notices): an entry under Desktop 3P in the organization admin settings navigation, a section of the Desktop setup window, and a heading in the configuration reference. Noun meaning look or presentation; not visibility and not a person\u2019s looks.",
        id: "wF3XRBJOtl",
      }),
    },
    plugins: {
      title: ln.msg({
        defaultMessage: "Plugins",
        id: "GVkVQAl/Q1",
      }),
      mountPath: {
        mac: "/Library/Application Support/Claude/org-plugins",
        win: "%ProgramFiles%\\Claude\\org-plugins",
      },
    },
    egress: {
      title: ln.msg({
        defaultMessage: "Egress",
        id: "tUQQ2GOXCS",
      }),
      description: ln.msg({
        defaultMessage:
          "Hosts your network firewall must allow, derived from your current settings. This list is read-only and updates as you make changes. Traffic is HTTPS on port 443 unless an entry shows a port or starts with http://.",
        id: "mdvoDuAMkh",
      }),
      derived: true,
    },
    source: {
      title: ln.msg({
        defaultMessage: "Source",
        id: "aH4De2Y20k",
      }),
      description: ln.msg({
        defaultMessage:
          "Point this configuration at a bootstrap URL to have your organization manage these settings remotely.",
        id: "tQVvCrCxZY",
      }),
      descriptionWhenConfigured: ln.msg({
        defaultMessage:
          "This configuration is fetched from a bootstrap URL at launch. Fields it provides are locked below.",
        id: "JOFb1Tb7WF",
      }),
    },
  };
  function DN(e, t) {
    var n;
    let o;
    for (let r of e)
      if (
        ((n = r.predicates) === null || n === undefined ? undefined : n.show) &&
        !r.predicates.show(t) &&
        r.key in t
      ) {
        if (!(o !== null && o !== undefined))
          o = {
            ...t,
          };
        delete o[r.key];
      }
    return o;
  }
  function gge(e) {
    let t = e;
    for (let n of sr.FORM_FIELDS) {
      if (!yg.enabledScopes(n.meta).includes("3p")) continue;
      let o = n.get(t);
      if (o === undefined) continue;
      if (!sr.isFormFieldVisible(n, e)) {
        t = n.set(t, undefined);
        continue;
      }
      if (!o || typeof o !== "object") continue;
      let r = sr.objectColumnsOf(n);
      if (r.length > 0 && !Array.isArray(o)) {
        let a = DN(r, o);
        if (a) t = n.set(t, Object.keys(a).length === 0 ? undefined : a);
        continue;
      }
      let s = sr.itemColumnsOf(n);
      if (s.length > 0 && Array.isArray(o)) {
        let a = false;
        let mapped = o.map((c) => {
          if (!c || typeof c !== "object") return c;
          let u = DN(s, c);
          if (u) a = true;
          return u !== null && u !== undefined ? u : c;
        });
        if (a) t = n.set(t, mapped);
      }
    }
    return t;
  }
  var isEmptySubValue = (e) => e === undefined || e === null || (typeof e === "string" && e.trim() === "");
  jN.isEmptySubValue = isEmptySubValue;
  var isEmptyValue = (e) =>
    e === undefined ||
    e === null ||
    e === "" ||
    (Array.isArray(e) && e.length === 0) ||
    (typeof e === "object" && Object.keys(e).length === 0);
  jN.isEmptyValue = isEmptyValue;
  var isEmptyRowValue = (e, t) =>
    Array.isArray(t) && t.length === 0 ? !yg.keepsAuthoredEmptyList(e) : jN.isEmptyValue(t);
  jN.isEmptyRowValue = isEmptyRowValue;
  function MN(e, t, n, o) {
    let r = typeof e === "string" ? sr.FORM_FIELD_BY_ID.get(e) : e;
    if (!r) return [];
    let s = n(r);
    if (s.length === 0 || !sr.isFormFieldVisible(r, t) || !sr.appliesUnder(r, t)) return [];
    return o(r.get(t)).flatMap((a) => {
      let l = a && typeof a === "object" ? a : {};
      return s.filter((c) => {
        var u;
        var f;
        var h;
        return (
          (!((u = c.predicates) === null || u === undefined ? undefined : u.show) || c.predicates.show(l)) &&
          ((h = (f = c.predicates) === null || f === undefined ? undefined : f.required) === null ||
          h === undefined
            ? undefined
            : h.call(f, l)) &&
          jN.isEmptySubValue(l[c.key])
        );
      });
    });
  }
  function vge(e, t) {
    return [
      ...MN(e, t, sr.objectColumnsOf, (n) => (n === undefined || n === null ? [] : [n])),
      ...MN(e, t, sr.itemColumnsOf, (n) => (Array.isArray(n) ? n : [])),
    ];
  }
});
//@ chunk-1ny7cxrt.js:1204721-1215284 cjs-unmatched+string-clue
var WN = x(function (qN) {
  Object.defineProperty(qN, "__esModule", {
    value: true,
  });
  qN.STORE_REFUSAL_KINDS = qN.DEVICE_DROP_KINDS = undefined;
  qN.evaluateConfig = Ege;
  qN.issuesToFieldErrors = jge;
  var FN = pg();
  var BN = Sc();
  var vs = yt();
  var Sg = $n();
  var ws = Fi();
  var bg = Dd();
  var HN = ug();
  var KN = Td();
  var gt = ni();
  var vg = gs();
  var kg = Wc();
  var su = qw();
  var wg = _g();
  qN.DEVICE_DROP_KINDS = new Set(["invalid", "narrowed", "refused", "model"]);
  qN.STORE_REFUSAL_KINDS = new Set(["credential-header", "client-secret", "bare-url", "array-bound"]);
  var ZN =
    /^(?:Failed to parse managed config "[^"]+": (?:\.: )?|Bootstrap intake dropped "[^"]+": |Managed config "[^"]+" dropped: |Managed config "[^"]+" is (?=not ))/;
  var t0;
  function Og() {
    if (!t0) {
      let filtered = gt
        .bootstrapableKeys({
          includeInternal: false,
          reader: "all",
        })
        .filter((t) => !kg.refuseForHybrid(gt.FlatManagedConfig.shape[t]));
      t0 = {
        schema: su.buildHybridServableSchema(),
        keys: filtered,
        storable: new Set(filtered),
        lenient: new Map(filtered.map((t) => [t, vs.stripDefaults(gt.FlatManagedConfig.shape[t])])),
      };
    }
    return t0;
  }
  function UN(e) {
    var t;
    var n;
    let o = {
      includeInternal: (t = e.includeInternal) !== null && t !== undefined ? t : false,
      reader: (n = e.reader) !== null && n !== undefined ? n : "desktop",
    };
    switch (e.channel) {
      case "mdm":
      case "local":
        return gt.staticTierKeys(o);
      case "bootstrap":
      case "hybrid":
        return gt.bootstrapableKeys(o);
    }
  }
  function VN(e, t) {
    let filtered = e.filter((o) => typeof o === "string");
    return t.filter((o) => {
      var r;
      let s = (r = gt.FLAT_KEY_TO_NESTED_PATH.get(o)) !== null && r !== undefined ? r : [o];
      let min = Math.min(filtered.length, s.length);
      return filtered.slice(0, min).every((l, c) => s[c] === l);
    });
  }
  function kge(keyedParseError, t, n) {
    let msg = keyedParseError.msg.replace(ZN, "");
    if (keyedParseError.kind === "deprecated")
      return {
        key: keyedParseError.key,
        kind: "advisory",
        severity: "warn",
        msg,
        ...(keyedParseError.deprecation
          ? {
              deprecation: keyedParseError.deprecation,
            }
          : {}),
      };
    if (keyedParseError.kind) {
      let r = keyedParseError.kind === "clamp" || (keyedParseError.kind === "unknown" && !n);
      return {
        key: keyedParseError.key,
        kind: "narrowed",
        severity: r ? "warn" : "error",
        msg,
      };
    }
    return {
      key: keyedParseError.key,
      kind: "invalid",
      severity: "error",
      msg,
      ...(t
        ? {
            issues: t,
          }
        : {}),
      ...(keyedParseError.cluster
        ? {
            cluster: keyedParseError.cluster,
          }
        : {}),
    };
  }
  function Ege(e, t) {
    var n;
    var o;
    var r;
    let s = t.channel === "hybrid";
    let a = (n = t.reader) !== null && n !== undefined ? n : "desktop";
    let l = UN(t);
    let c = new Set(l);
    let allowedKeys = s
      ? UN({
          ...t,
          reader: "all",
        })
      : l;
    let f = (sentKey) =>
      a === "all" ||
      !Object.hasOwn(gt.FlatManagedConfig.shape, sentKey) ||
      vs.isReadBy(gt.getFieldMeta(sentKey), a);
    let h = new Set();
    let m = [];
    let { config, keyedParseErrors, sentKeys, issueDetails } = FN.parseBootstrapConfig(
      e,
      s ? undefined : t.trustedOrigin,
      undefined,
      {
        includeInternal: (o = t.includeInternal) !== null && o !== undefined ? o : false,
        reader: a,
      },
      {
        allowedKeys,
        channel: t.channel,
        allowLoopbackResponseUrls: t.packaged === false,
        ...(s
          ? {
              schemaFor: (ce) => Og().lenient.get(ce),
            }
          : {}),
        editor: t.editor,
        onFailClosed: (ce) => h.add(ce),
      },
    );
    let j = config;
    delete j.expiresAt;
    gt.dropNonAnthropicModels(j, (ce, Ne) => {
      if (f("inferenceModels"))
        m.push({
          key: "inferenceModels",
          kind: "model",
          severity: "error",
          msg: `"${ce}" is not an Anthropic model for this provider \u2014 ${Ne}`,
          model: {
            name: ce,
            reason: Ne,
          },
        });
    });
    let M = Object.fromEntries(Object.entries(j).filter(([key]) => f(key)));
    let N = new Set([...h].filter(f));
    for (let keyedParseError of keyedParseErrors) {
      if (gt.tryGetFieldMeta(keyedParseError.key) === undefined) {
        if (a !== "all" && Age(keyedParseError.key, a)) {
          if (s)
            m.push({
              key: keyedParseError.key,
              kind: "other-reader",
              severity: "warn",
              msg: "a name under another client's settings that this build does not know (left out of this build's copy)",
            });
          continue;
        }
        m.push({
          key: keyedParseError.key,
          kind: "not-accepted",
          severity: s ? "error" : "warn",
          msg: keyedParseError.msg.replace(ZN, ""),
        });
        continue;
      }
      if (!c.has(keyedParseError.key)) continue;
      if (s && vs.isHybridDerived(gt.FlatManagedConfig.shape[keyedParseError.key])) continue;
      m.push(kge(keyedParseError, issueDetails.get(keyedParseError.key), s));
    }
    if (s) {
      for (let sentKey of sentKeys)
        if (
          Object.hasOwn(gt.FlatManagedConfig.shape, sentKey) &&
          f(sentKey) &&
          vs.isHybridDerived(gt.FlatManagedConfig.shape[sentKey])
        )
          m.push({
            key: sentKey,
            kind: "derived",
            severity: "warn",
            msg: "set by the hosted control plane from your organization; the configured value is ignored",
          });
    }
    for (let sentKey of sentKeys)
      if (!c.has(sentKey) && Object.hasOwn(gt.FlatManagedConfig.shape, sentKey) && f(sentKey))
        m.push({
          key: sentKey,
          kind: "not-accepted",
          severity: s ? "error" : "warn",
          msg: s ? "not storable by the hosted control plane" : "not accepted from this configuration source",
        });
    if (s) {
      let { storable } = Og();
      for (let key of Object.keys(M))
        if (!storable.has(key))
          m.push({
            key,
            kind: "refused",
            severity: "error",
            msg: "not storable by the hosted control plane",
          });
      let { inferenceProvider, inferenceCredentialKind } = M;
      let ve = inferenceProvider ? su.HYBRID_SERVABLE_CREDENTIAL_KINDS[inferenceProvider] : undefined;
      if (inferenceProvider && ve === undefined)
        m.push({
          key: "inferenceProvider",
          kind: "refused",
          severity: "error",
          msg: `provider "${inferenceProvider}" is not storable by the hosted control plane`,
        });
      else if (ve && inferenceCredentialKind && !ve.includes(inferenceCredentialKind))
        m.push({
          key: "inferenceCredentialKind",
          kind: "refused",
          severity: "error",
          msg: `credential kind "${inferenceCredentialKind}" is not storable by the hosted control plane`,
        });
    }
    for (let ce of gt.keyedConfigurationWarnings(M, {
      mode: "3p",
      stoodIn: N,
    }))
      m.push({
        key: ce.key,
        kind: "advisory",
        severity: "warn",
        msg: ce.msg,
      });
    let Z = ws.unflattenAll(M);
    if (t.requiredFields) m.push(...Pge(t.requiredFields, Z, m));
    let filtered = [...N].filter((ce) => M[ce] !== undefined);
    let X = s
      ? Ige(
          e,
          j,
          h,
          new Set(keyedParseErrors.map((keyedParseError) => keyedParseError.key)),
          sentKeys,
          f,
          filtered,
          m,
        )
      : undefined;
    let he = X;
    let Me = HN.evaluateInference(he !== null && he !== undefined ? he : Z, {
      keyedErrors: keyedParseErrors,
      remoteApplied: (r = t.remoteApplied) !== null && r !== undefined ? r : true,
    });
    if (Me && !Me.ok)
      for (let issue of Me.issues)
        m.push({
          key: issue.key,
          kind: "inference",
          severity: "error",
          msg: issue.msg,
          inference: {
            reason: issue.reason,
          },
        });
    m.push(...Tge(Z, s));
    if (s) {
      m.push(...Rge(Z));
      for (let ce of Mge(Z))
        for (let Ne of VN(ce, l))
          if (M[Ne] !== undefined)
            m.push({
              key: Ne,
              kind: "bare-url",
              severity: "error",
              msg: Sg.QUERY_OR_FRAGMENT_URL_MESSAGE,
            });
      for (let key of Object.keys(M))
        for (let Ne of su.hybridArrayBoundViolations(key, M[key]))
          m.push({
            key,
            kind: "array-bound",
            severity: "error",
            msg: `${Ne.path ? `${Ne.path}: ` : ""}${Ne.length} entries; the hosted configuration allows at most ${Ne.max}`,
          });
    }
    return {
      config: M,
      issues: m,
      blocking: m.filter((ce) => ce.severity === "error"),
      inference: Me,
      failClosed: filtered,
      ...(s
        ? {
            hosted: X,
          }
        : {}),
    };
  }
  function Pge(requiredFields, t, n) {
    let o = [];
    for (let r of requiredFields) {
      if (!bg.isFormFieldVisible(r, t) || n.some((a) => a.key === r.id && a.severity === "error")) continue;
      let s = wg.missingSubFields(r, t);
      if (s.length > 0)
        o.push({
          key: r.id,
          kind: "required",
          severity: "error",
          msg: `${s.map((a) => a.key).join(", ")} required`,
        });
      else if (bg.isFieldRequired(r, t) && wg.isEmptyRowValue(r.id, r.get(t)))
        o.push({
          key: r.id,
          kind: "required",
          severity: "error",
          msg: "required",
        });
    }
    return o;
  }
  function Age(key, t) {
    var n;
    var o;
    let index = key.indexOf(".");
    if (index <= 0) return false;
    let values = Object.values(
      (o =
        (n = ws.CLUSTER_REGISTRY[key.slice(0, index)]) === null || n === undefined
          ? undefined
          : n.propMap) !== null && o !== undefined
        ? o
        : {},
    );
    return values.length > 0 && values.every((a) => !vs.isReadBy(gt.getFieldMeta(a), t));
  }
  function Ige(e, t, n, o, sentKeys, s, a, l) {
    var c;
    var u;
    var f;
    let { storable } = Og();
    let m = Object.fromEntries(Object.entries(t).filter(([key]) => s(key) || !n.has(key)));
    let y = [];
    let b = [...a];
    let w = Cge(m, b, y);
    for (let F of y) if (s(F.key)) l.push(F);
    for (let F of b) if (s(F) && !a.includes(F)) a.push(F);
    let inferenceProvider = t.inferenceProvider;
    let j = (F) => {
      let X = vg.INFERENCE_LEAF_MEMBERSHIP.get(F);
      return X === undefined || (inferenceProvider !== undefined && X.providers.includes(inferenceProvider));
    };
    let filtered = sentKeys.filter((F) => storable.has(F) && !s(F) && j(F));
    for (let F of sentKeys)
      if (Object.hasOwn(gt.FlatManagedConfig.shape, F) && !j(F)) {
        let X = vg.INFERENCE_LEAF_MEMBERSHIP.get(F);
        l.push({
          key: F,
          kind: "advisory",
          severity: "warn",
          msg: `written for provider ${((c = X === null || X === undefined ? undefined : X.providers) !== null && c !== undefined ? c : []).join("/")}, but the document's provider is ${inferenceProvider !== null && inferenceProvider !== undefined ? inferenceProvider : "unset"}; not part of the document`,
        });
      }
    for (let F of sentKeys)
      if (
        Object.hasOwn(gt.FlatManagedConfig.shape, F) &&
        !s(F) &&
        j(F) &&
        kg.refuseForHybrid(gt.FlatManagedConfig.shape[F])
      )
        l.push({
          key: F,
          kind: "refused",
          severity: "warn",
          msg: "read by another client and not storable by the hosted control plane; left out",
        });
    if (filtered.length === 0) return w;
    let N = ws.flattenAll(w);
    let flat = KN.normalize(e).flat;
    for (let F of filtered) {
      let X = flat[F];
      if (X === undefined || X === null || X === "") continue;
      if (o.has(F) || n.has(F) || t[F] === undefined || N[F] === undefined) {
        w =
          (f = ws.setAtPath(
            w,
            (u = gt.FLAT_KEY_TO_NESTED_PATH.get(F)) !== null && u !== undefined ? u : [F],
            X,
          )) !== null && f !== undefined
            ? f
            : {};
        l.push({
          key: F,
          kind: "other-reader",
          severity: "warn",
          msg: "read by another client, which could not apply it as stored; kept unchanged",
        });
      }
    }
    return w;
  }
  function Cge(e, t, n) {
    let { schema, keys } = Og();
    let s = {};
    for (let key of keys) if (e[key] !== undefined && !t.includes(key)) s[key] = e[key];
    for (let j = 0; j <= keys.length; j++) {
      let l = schema.safeParse(ws.unflattenAll(s));
      if (l.success)
        return Object.fromEntries(Object.entries(l.data).filter(([, value]) => value !== undefined));
      let filtered = keys.filter((key) => s[key] !== undefined);
      let u = new Set(
        l.error.issues.flatMap((issue) => {
          let h = VN(issue.path, filtered);
          if (h.length === 0) {
            let found = issue.path.find((b) => typeof b === "string");
            let filtered_2 = filtered.filter((b) => {
              var w;
              return (
                ((w = gt.FLAT_KEY_TO_NESTED_PATH.get(b)) !== null && w !== undefined ? w : [b])[0] === found
              );
            });
            h = filtered_2.length > 0 ? filtered_2 : filtered;
          }
          for (let key of h)
            n.push({
              key,
              kind: "refused",
              severity: "error",
              msg: issue.message,
            });
          return h;
        }),
      );
      if (u.size === 0) break;
      for (let f of u) {
        delete s[f];
        if ("failClosedValue" in gt.getFieldMeta(f)) t.push(f);
      }
    }
    return {};
  }
  function Tge(e, t) {
    var n;
    var o;
    var r;
    var s;
    let a = [];
    let l = (key, headers, name) => {
      let h = BN.firstCredentialHeader(headers);
      if (h !== undefined)
        a.push({
          key,
          kind: "credential-header",
          severity: t ? "error" : "warn",
          msg: `header "${h}" looks like a credential; use the helper script so the secret isn't stored in the configuration`,
          header:
            name === undefined
              ? {
                  name: h,
                }
              : {
                  name: h,
                  serverName: name,
                },
        });
    };
    l("inferenceCustomHeaders", (n = e.inference) === null || n === undefined ? undefined : n.customHeaders);
    l("otlpHeaders", (o = e.otlp) === null || o === undefined ? undefined : o.headers);
    for (let c of (s = (r = e.mcp) === null || r === undefined ? undefined : r.managedServers) !== null &&
    s !== undefined
      ? s
      : [])
      if (c && typeof c === "object" && "headers" in c) l("managedMcpServers", c.headers, c.name);
    return a;
  }
  var zN = "https://accounts.google.com";
  var $ge = /^GOCSPX-[A-Za-z0-9_-]{20,}$/;
  function Rge(e) {
    var t;
    var n;
    let o = [];
    for (let r of (n = (t = e.mcp) === null || t === undefined ? undefined : t.managedServers) !== null &&
    n !== undefined
      ? n
      : []) {
      let oauth = r && typeof r === "object" && "oauth" in r ? r.oauth : undefined;
      if (!oauth || typeof oauth !== "object") continue;
      let a = oauth;
      let clientSecret = a.clientSecret;
      if (typeof clientSecret !== "string") continue;
      let authorizationServer = a.authorizationServer;
      let f = !(
        Array.isArray(authorizationServer) &&
        authorizationServer.length === 1 &&
        authorizationServer[0] === zN &&
        a.tenantId === undefined &&
        a.authorizationUrl === undefined &&
        a.tokenUrl === undefined
      )
        ? "provider"
        : !$ge.test(clientSecret)
          ? "shape"
          : undefined;
      if (f === undefined) continue;
      o.push({
        key: "managedMcpServers",
        kind: "client-secret",
        severity: "error",
        msg:
          f === "provider"
            ? `server "${r.name}": a client secret is stored only for a Google OAuth client (oauth.authorizationServer exactly ["${zN}"], no tenantId, authorizationUrl or tokenUrl); for any other identity provider use oauth.clientSecretHelper`
            : `server "${r.name}": oauth.clientSecret must be a Google Desktop-app OAuth client secret (GOCSPX-\u2026); for any other client secret use oauth.clientSecretHelper`,
        clientSecret: {
          serverName: r.name,
          reason: f,
        },
      });
    }
    return o;
  }
  var Dge = [
    ["inference", "baseUrl"],
    ["workspace", "userContentRendererUrl"],
  ];
  function Mge(e) {
    let t = [];
    for (let n of Dge) {
      let o = e;
      for (let r of n) o = o && typeof o === "object" ? o[r] : undefined;
      if (typeof o === "string" && Sg.hasQueryOrFragment(o)) t.push(n);
    }
    return t;
  }
  function jge(e, t = (n) => n.msg) {
    var n;
    var o;
    let r = {};
    for (let s of e) if (!((n = r[(o = s.key)]) !== null && n !== undefined)) r[o] = t(s);
    return r;
  }
});
//@ chunk-1ny7cxrt.js:1215284-1215727 cjs-unmatched+string-clue
var JN = x(function (YN) {
  Object.defineProperty(YN, "__esModule", {
    value: true,
  });
  YN.readHybridStoredConfig = Uge;
  var Eg = WN();
  function Uge(e, reader = "desktop") {
    var n;
    let o = Eg.evaluateConfig(e, {
      channel: "hybrid",
      editor: true,
      reader,
    });
    let r = {};
    for (let issue of o.issues)
      if (Eg.DEVICE_DROP_KINDS.has(issue.kind) && issue.severity === "error")
        r[issue.key] = r[issue.key] === undefined ? issue.msg : `${r[issue.key]}; ${issue.msg}`;
    return {
      config: (n = o.hosted) !== null && n !== undefined ? n : {},
      errors: r,
      failClosed: o.failClosed,
    };
  }
});
//@ chunk-1ny7cxrt.js:1215727-1219702 cjs-unmatched+string-clue
var iU = x(function (nU) {
  Object.defineProperty(nU, "__esModule", {
    value: true,
  });
  nU.STORED_HEADER_VALUE_PLACEHOLDER = nU._test = undefined;
  nU.preserveUnreadNames = Hge;
  nU.withoutFormerNames = Kge;
  nU.withoutNames = Zge;
  nU.withoutNulledNames = Vge;
  var cn = yt();
  var Os = Fi();
  var XN = Td();
  var $i = ni();
  var Ln = Ns();
  var Fge = new Set([
    ...Os.CLUSTER_NAMES,
    ...$i.allKeys,
    ...$i.allKeys.flatMap((key) => {
      let legacyFlatKey = $i.getFieldMeta(key).legacyFlatKey;
      return legacyFlatKey ? [legacyFlatKey.name] : [];
    }),
    ...$i.RETIRED_FLAT_KEYS,
    ...XN.CONFIG_DOCUMENT_META_NAMES,
    "expiresAt",
  ]);
  var former = new Set($i.FORMER_NESTED_PATHS.map((e) => e.join(".")));
  var i0 = (e) => e.reduce((acc, n) => Ln.memberPath(acc, n), "");
  function Pg(onDropped, t, n) {
    if (!onDropped) return;
    if (Ln.isPlainObject(n) && Object.keys(n).length > 0) {
      for (let [key, value] of Object.entries(n)) if (value !== undefined) Pg(onDropped, [...t, key], value);
      return;
    }
    onDropped(i0(t), n);
  }
  function Hge(e, t, onKept, onDropped) {
    return QN(e, t, {
      former,
      onKept,
      onDropped,
    });
  }
  function QN(e, t, n) {
    var o;
    if (!Ln.isPlainObject(e)) return t;
    let r = {
      ...t,
    };
    for (let [key, value] of Object.entries(e)) {
      if (value === undefined) continue;
      if (n.former.has(key)) {
        Pg(n.onDropped, [key], value);
        continue;
      }
      let l = Object.hasOwn(Os.CLUSTER_REGISTRY, key) ? Os.CLUSTER_REGISTRY[key] : undefined;
      if (l) {
        let c = n0(l.schema, value, r[key], [key], n);
        if (c !== undefined) Ca(r, key, c);
      } else if (!Fge.has(key) && !Object.hasOwn(r, key)) {
        Ca(r, key, value);
        if (!((o = n.onKept) === null || o === undefined)) o.call(n, i0([key]), value);
      }
    }
    return r;
  }
  var eU = (e) => {
    var t;
    return (
      cn.fieldMetaForNode(e) !== undefined ||
      ((t = cn.subfieldMetaForNode(e)) === null || t === undefined ? undefined : t.flatKey) !== undefined
    );
  };
  function n0(schema, t, n, o, r) {
    var s;
    if (!Ln.isPlainObject(t) || (n !== undefined && !Ln.isPlainObject(n))) return n;
    let a = cn.unwrapZod(schema);
    let l = cn.zodKind(a);
    if (l === cn.ZodKind.ZodDiscriminatedUnion) {
      let f = cn.discriminatorKeyOf(a);
      if (n === undefined || f === undefined || t[f] !== n[f]) return n;
      let found = cn.discriminatorArmsOf(a).find((m) => m.id === n[f]);
      return (found === null || found === undefined ? undefined : found.schema)
        ? n0(found.schema, t, n, o, r)
        : n;
    }
    if (l !== cn.ZodKind.ZodObject) return n;
    let shape = a.shape;
    let u = {
      ...n,
    };
    for (let [key, value] of Object.entries(t)) {
      let m = [...o, key];
      if (value === undefined) continue;
      if (r.former.has(m.join("."))) {
        Pg(r.onDropped, m, value);
        continue;
      }
      let y = Object.hasOwn(shape, key) ? shape[key] : undefined;
      if (y === undefined) {
        if (!Object.hasOwn(u, key)) {
          Ca(u, key, value);
          if (!((s = r.onKept) === null || s === undefined)) s.call(r, i0(m), value);
        }
      } else if (!eU(y)) {
        let b = n0(y, value, Object.hasOwn(u, key) ? u[key] : undefined, m, r);
        if (b !== undefined) Ca(u, key, b);
      }
    }
    return n === undefined && Object.keys(u).length === 0 ? undefined : u;
  }
  function Ca(e, t, value) {
    Object.defineProperty(e, t, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  function Kge(e, t) {
    return o0(e, $i.FORMER_NESTED_PATHS, t);
  }
  function Zge(e, t) {
    return o0(e, t);
  }
  function o0(e, t, n) {
    let o = e;
    for (let r of t) {
      o = tU(o, r, n, []);
      if (o === undefined) return;
    }
    return o;
  }
  function tU(e, t, n, o) {
    let [r, ...s] = t;
    if (r === undefined || !Object.hasOwn(e, r)) return e;
    let a;
    if (s.length > 0) {
      let c = e[r];
      if (!Ln.isPlainObject(c)) return e;
      a = tU(c, s, n, [...o, r]);
      if (a === c) return e;
    } else Pg(n, [...o, r], e[r]);
    let l = {};
    for (let [key, value] of Object.entries(e))
      if (key !== r) Ca(l, key, value);
      else if (a !== undefined) Ca(l, key, a);
    return Object.keys(l).length === 0 ? undefined : l;
  }
  function Vge(e, t) {
    if (!Ln.isPlainObject(e)) return;
    let n = {
      ...e,
    };
    if (!Ln.isPlainObject(t)) return n;
    for (let [key, value] of Object.entries(t)) {
      if (!Object.hasOwn(n, key)) continue;
      if (value === null) {
        delete n[key];
        continue;
      }
      let s = Object.hasOwn(Os.CLUSTER_REGISTRY, key) ? Os.CLUSTER_REGISTRY[key] : undefined;
      let a = s && r0(s.schema, n[key], value);
      if (a) Ca(n, key, a);
    }
    return n;
  }
  function r0(schema, t, n) {
    let o = Ln.coerceJsonString(n);
    if (!Ln.isPlainObject(t) || !Ln.isPlainObject(o)) return;
    let r = cn.unwrapZod(schema);
    let s = cn.zodKind(r);
    if (s === cn.ZodKind.ZodDiscriminatedUnion) {
      let c = cn.discriminatorKeyOf(r);
      let u = c === undefined ? undefined : cn.discriminatorArmsOf(r).find((f) => f.id === t[c]);
      return (u === null || u === undefined ? undefined : u.schema) ? r0(u.schema, t, o) : undefined;
    }
    if (s !== cn.ZodKind.ZodObject) return;
    let shape = r.shape;
    let l = {
      ...t,
    };
    for (let [key, value] of Object.entries(o)) {
      if (!Object.hasOwn(l, key)) continue;
      if (value === null) {
        delete l[key];
        continue;
      }
      let f = Object.hasOwn(shape, key) ? shape[key] : undefined;
      let h = f && !eU(f) && r0(f, l[key], value);
      if (h) Ca(l, key, h);
    }
    return l;
  }
  nU._test = {
    withoutFormerNamesAt: (e) => (t) => o0(t, e),
    preserveUnreadNamesWithFormer: (former) => (t, n, onKept, onDropped) =>
      QN(t, n, {
        former,
        onKept,
        onDropped,
      }),
  };
  nU.STORED_HEADER_VALUE_PLACEHOLDER = "[stored on server - enter a new value to replace]";
});
//@ chunk-1ny7cxrt.js:1219702-1220711 cjs-unmatched+string-clue
var s0 = x(function (cU) {
  Object.defineProperty(cU, "__esModule", {
    value: true,
  });
  cU.gatewayOverlayDropChecks = Xge;
  cU.gatewayRefusedPathPrefixes = aU;
  cU.gatewayServableKeys = lU;
  var Lr = yt();
  var oU = fl();
  var Ta = gs();
  var sU = Ns();
  function Xge(
    e = {
      includeInternal: false,
    },
  ) {
    let t = {};
    for (let n of lU(e)) {
      let checkDropped = Ta.getFieldMeta(n).checkDropped;
      if (checkDropped) t[n] = (r, s) => checkDropped(sU.coerceJsonString(r), s);
    }
    return t;
  }
  function aU() {
    let e = new Set();
    let t = (n, o) => {
      if (Lr.isNotGatewayServable(n)) {
        e.add(o.join("."));
        return;
      }
      let r = Lr.unwrapZod(n);
      let s = Lr.zodKind(r);
      if (s === Lr.ZodKind.ZodObject) for (let [key, value] of Object.entries(r.shape)) t(value, [...o, key]);
      else if (s === Lr.ZodKind.ZodUnion || s === Lr.ZodKind.ZodDiscriminatedUnion)
        for (let a of Lr.unionOptionsOf(r)) t(a, o);
    };
    t(oU.ManagedConfig, []);
    return [...e];
  }
  function lU(e) {
    let t = aU();
    let n = (o) => t.some((r) => o === r || o.startsWith(`${r}.`));
    return Ta.bootstrapableKeys(e).filter((o) => {
      var r;
      if (!Lr.isReleasedFor3p(Ta.getFieldMeta(o))) return false;
      let s = (r = Ta.FLAT_KEY_TO_NESTED_PATH.get(o)) === null || r === undefined ? undefined : r.join(".");
      return s !== undefined && !n(s);
    });
  }
});
//@ chunk-1ny7cxrt.js:1220711-1225778 cjs-unmatched+string-clue
var pU = x(function (fU) {
  Object.defineProperty(fU, "__esModule", {
    value: true,
  });
  fU.asksForExecutionTarget = nye;
  fU.asksForThirdPartyMode = rye;
  fU.holdCluster = iye;
  fU.mergeTiers = oye;
  fU.materializeRaw = sye;
  var au = yt();
  var ii = $n();
  var Nr = Fi();
  var tt = ni();
  var a0 = (e) => Object.keys(e);
  var c0 = (e) => {
    var t;
    var n;
    return new Set(
      Object.values(
        (n = (t = Nr.CLUSTER_REGISTRY[e]) === null || t === undefined ? undefined : t.propMap) !== null &&
          n !== undefined
          ? n
          : {},
      ),
    );
  };
  function uU(e, t, n, o) {
    var r;
    var s;
    let a;
    let l = new Map();
    let c = new Map();
    let u = (m) => {
      var y;
      let b = c.get(m);
      if (b === undefined) {
        b =
          n !== undefined &&
          ((y = Nr.CLUSTER_REGISTRY[m]) === null || y === undefined ? undefined : y.unflatten(n)) !==
            undefined;
        c.set(m, b);
      }
      return b;
    };
    let f = (m) => o === undefined || m.platformVariant === undefined || m.platformVariant.platform === o;
    let h = (key) => au.offDeviceExecutionTargets().find((y) => c0(y).has(key) && u(y));
    for (let m of e) {
      if (au.intakeReportKeepsValue(m)) continue;
      if (!(a !== null && a !== undefined)) a = new Set(tt.flatConfigKeys(t));
      let y = a.has(m.key) ? tt.tryGetFieldMeta(m.key) : undefined;
      let b =
        (r = y === null || y === undefined ? undefined : y.support.executionTarget) !== null &&
        r !== undefined
          ? r
          : y === undefined || !f(y)
            ? undefined
            : h(m.key);
      if (y === undefined || b === undefined || b === "desktop") continue;
      let w =
        (s = l.get(b)) !== null && s !== undefined
          ? s
          : {
              scopes: new Set(),
              reports: [],
            };
      for (let S of tt.enabledScopes(y)) w.scopes.add(S);
      w.reports.push(m);
      l.set(b, w);
    }
    return l;
  }
  function nye(e, t, n, o) {
    return uU(e, t, n, o).size > 0;
  }
  function l0(e, t) {
    var n;
    var o;
    for (let r of t) if (!((n = (o = e)[r]) !== null && n !== undefined)) o[r] = {};
    return e;
  }
  function dU(e, t, n) {
    let o = new Set();
    for (let s of e) if (!au.intakeReportKeepsValue(s)) o.add(s.key);
    if (o.size === 0) return [];
    let r = Nr.unflattenAll(n);
    return tt.flatConfigKeys(t).filter((s) => {
      var a;
      var l;
      return (
        o.has(s) &&
        n[s] === undefined &&
        ((l = (a = tt.getFieldMeta(s)).activatesThirdPartyMode) === null || l === undefined
          ? undefined
          : l.call(a, r, true)) === true
      );
    });
  }
  function rye(e, t, n = {}) {
    return dU(e, t, n).length > 0;
  }
  function iye(e, t, n) {
    e[n] = t[n];
    let o = c0(n);
    return ii.withUnreadableActivators(e, [
      ...ii.unreadableActivators(e).filter((r) => !o.has(r)),
      ...ii.unreadableActivators(t).filter((r) => o.has(r)),
    ]);
  }
  function oye(e, t, n, o) {
    var r;
    var s;
    var a;
    let {
      keyEnumOpts,
      resolveMode,
      platform,
      bootstrapFallback,
      stoodIn,
      dropped,
      staticTierIsDevicePolicy,
      onWarn,
    } = o;
    let w = {};
    let S = new Set();
    let j = new Map();
    let M = (xe, rn, Hr = a0(rn)) => {
      var Cs;
      for (let cr of Hr) {
        if (rn[cr] === undefined) continue;
        w[cr] = rn[cr];
        j.set(cr, xe);
        if (
          (Cs = stoodIn === null || stoodIn === undefined ? undefined : stoodIn[xe]) === null ||
          Cs === undefined
            ? undefined
            : Cs.has(cr)
        )
          S.add(cr);
        else S.delete(cr);
      }
    };
    if (t) {
      M("remoteTier", t);
      M("staticTier", e, tt.nonBootstrapableKeys(keyEnumOpts));
    } else M("staticTier", e);
    let N = uU(
      (r = t
        ? dropped === null || dropped === undefined
          ? undefined
          : dropped.remoteTier
        : dropped === null || dropped === undefined
          ? undefined
          : dropped.staticTier) !== null && r !== undefined
        ? r
        : [],
      keyEnumOpts,
      t !== null && t !== undefined ? t : e,
      platform,
    );
    let Z = new Set([...N.keys()].flatMap((key) => [...c0(key)]));
    for (let xe of a0(w)) {
      let executionTarget =
        (s = tt.tryGetFieldMeta(xe)) === null || s === undefined ? undefined : s.support.executionTarget;
      if ((executionTarget !== undefined && N.has(executionTarget)) || Z.has(xe)) {
        delete w[xe];
        j.delete(xe);
        S.delete(xe);
      }
    }
    let F = [];
    let X = tt.appBehaviorMdmKeys(keyEnumOpts);
    if (n !== undefined) {
      for (let xe of X) {
        if (w[xe] !== undefined) {
          F.push(xe);
          if (n[xe] === undefined) {
            if (!(onWarn === null || onWarn === undefined))
              onWarn(
                `${xe} from the local or server configuration is ignored: a device-management profile sets app-behavior keys (${a0(n).join(", ") || "none readable"}), and those keys are read from that profile as a group. Add ${xe} to the profile.`,
              );
          }
        }
        delete w[xe];
        S.delete(xe);
        j.delete(xe);
      }
      M("managedOverlay", n);
    }
    let he = staticTierIsDevicePolicy
      ? dU(
          (a = dropped === null || dropped === undefined ? undefined : dropped.staticTier) !== null &&
            a !== undefined
            ? a
            : [],
          keyEnumOpts,
          w,
        ).filter((xe) => t === undefined || !tt.isBootstrapable(xe))
      : [];
    let Me = ii.withUnreadableActivators(l0(Nr.unflattenAll(w), N.keys()), he);
    let mode = resolveMode(Me);
    let Ne = mode === "3p" && bootstrapFallback !== undefined;
    let be = Ne && t === undefined;
    let awaitingFirstServedBody = be;
    if (be && typeof bootstrapFallback === "object")
      for (let [key, value] of Object.entries(bootstrapFallback.applied)) {
        if (n !== undefined && X.has(key)) continue;
        w[key] = value;
        S.add(key);
        j.set(key, "remoteTier");
      }
    let Ue = platform ? tt.applyPlatformVariants(w, platform) : w;
    let kt = {
      mode,
      stoodIn: S,
    };
    if (onWarn) for (let xe of tt.configurationWarnings(Ue, kt)) onWarn(xe);
    let je = tt.enforceConfigurationValues(Ue, kt);
    tt.dropNonAnthropicModels(
      je,
      (xe, rn) =>
        onWarn === null || onWarn === undefined ? undefined : onWarn(tt.droppedModelMessage(xe, rn)),
      onWarn,
    );
    for (let xe of tt.flatConfigKeys(keyEnumOpts))
      if (je[xe] !== undefined && !tt.enabledScopes(tt.getFieldMeta(xe)).includes(mode)) delete je[xe];
    for (let xe of S) if (je[xe] === undefined || je[xe] !== w[xe]) S.delete(xe);
    for (let key of j.keys()) if (je[key] === undefined) j.delete(key);
    if (platform)
      for (let [xe, rn] of tt.platformVariantKeys(platform)) {
        let Hr = j.get(xe);
        if (Hr !== undefined && tt.isFieldSet(je[xe])) {
          j.set(rn, Hr);
          if (S.has(xe)) S.add(rn);
          else S.delete(rn);
        }
      }
    let Ur = new Set();
    if (be) {
      for (let [xe, rn] of j) if (rn === "staticTier" && tt.isBootstrapable(xe)) Ur.add(xe);
    }
    if (Ne) {
      let xe = tt.remotePolicyDefaults(keyEnumOpts);
      for (let [key, value] of Object.entries(xe)) if (je[key] === undefined) je[key] = value;
    }
    tt.materializeDefaults(je, keyEnumOpts);
    let flattened = [...N].flatMap(([xe, { scopes: rn }]) => (rn.has(mode) ? [xe] : []));
    return {
      config: ii.withUnreadableActivators(
        l0(Nr.unflattenAll(je), flattened),
        he.filter((xe) => tt.enabledScopes(tt.getFieldMeta(xe)).includes(mode)),
      ),
      raw: Me,
      stoodIn: S,
      groupClaimed: F,
      tierOf: j,
      pendingServed: Ur,
      awaitingFirstServedBody,
      refused: [...N.values()].flatMap((xe) => xe.reports),
    };
  }
  function sye(e, t) {
    return ii.withUnreadableActivators(
      l0(
        Nr.unflattenAll(tt.materializeDefaults(Nr.flattenAll(e), t)),
        Nr.CLUSTER_NAMES.filter((n) => e[n] !== undefined),
      ),
      ii.unreadableActivators(e),
    );
  }
});
//@ chunk-1ny7cxrt.js:1225778-1230564 cjs-unmatched+string-clue
var EU = x(function (SU) {
  Object.defineProperty(SU, "__esModule", {
    value: true,
  });
  SU._test = SU.VALUE_VERSIONS = SU.VALUE_OVERRIDES = SU.OVERRIDE = SU.VALUE_STAMPS = SU.STAMP = undefined;
  SU.walkMembers = uu;
  SU.resolveMemberVersions = mye;
  SU.compactMemberVersions = gye;
  SU.expandMemberVersions = vU;
  SU.memberSites = wU;
  SU.publishedMemberStamps = yye;
  SU.settleStamp = OU;
  SU.reconcileMemberStamps = _ye;
  SU.STAMP = "x-availableInVersion";
  SU.VALUE_STAMPS = "x-valueAvailableInVersion";
  SU.OVERRIDE = "x-availableInVersionOverride";
  SU.VALUE_OVERRIDES = "x-valueAvailableInVersionOverride";
  SU.VALUE_VERSIONS = "__valueVersions";
  var fye = new Set(["default", "const", "enum", "examples", "required"]);
  var $a = (e) => e !== null && typeof e === "object" && !Array.isArray(e);
  var yU = (e) => $a(e.not) && Object.keys(e.not).length === 0;
  var cu = (node) => (Array.isArray(node.enum) ? node.enum : "const" in node ? [node.const] : null);
  var Cg = (node) => (Array.isArray(node[SU.VALUE_STAMPS]) ? node[SU.VALUE_STAMPS] : []);
  var _U = (node) => (Array.isArray(node[SU.VALUE_OVERRIDES]) ? node[SU.VALUE_OVERRIDES] : []);
  var bU = (id, t) => `${id}=${JSON.stringify(t)}`;
  var Ag = (node) => typeof node["x-flatKey"] === "string";
  var hU = "@next";
  var mU = (e) => e.split(".").map((t) => (Number.isFinite(Number(t)) ? Number(t) : 0));
  var d0 = (e, t) => {
    var n;
    var o;
    if (e === t || t === hU) return false;
    if (e === hU) return true;
    let r = mU(e);
    let s = mU(t);
    for (let j = 0; j < Math.max(r.length, s.length); j++) {
      let l =
        ((n = r[j]) !== null && n !== undefined ? n : 0) - ((o = s[j]) !== null && o !== undefined ? o : 0);
      if (l !== 0) return l > 0;
    }
    return false;
  };
  var f0 = (e, t) => (typeof e !== "string" ? t : t !== undefined && !d0(e, t) ? t : e);
  var p0 = (node, t) =>
    Ag(node) && typeof node[SU.STAMP] === "string" ? node[SU.STAMP] : f0(node[SU.STAMP], t);
  var pye = (e) => (e === "additionalProperties" ? ["*"] : e === "items" ? [] : [e]);
  var hye = (e) => {
    if (!$a(e) || !$a(e.properties)) return [];
    let sorted = Object.entries(e.properties)
      .flatMap(([key, value]) => {
        let r = $a(value) ? cu(value) : null;
        return (r === null || r === undefined ? undefined : r.length) === 1
          ? [`${key}=${JSON.stringify(r[0])}`]
          : [];
      })
      .sort();
    return sorted.length > 0 ? [`[${sorted.join("&")}]`] : [];
  };
  function uu(e, t, n) {
    let o = (r, s, a, isProperty, c) => {
      if (!$a(r)) return;
      let u =
        s === null
          ? c
          : n(
              {
                id: `${s}|${a.join(".")}`,
                node: r,
                isProperty,
              },
              c,
            );
      for (let [key, value] of Object.entries(r)) {
        if (fye.has(key) || key.startsWith("x-")) continue;
        if (key === "properties")
          for (let [key, value_2] of Object.entries($a(value) ? value : {})) {
            if (!$a(value_2) || yU(value_2)) continue;
            let b = value_2["x-flatKey"];
            if (typeof b === "string") o(value_2, b, [], true, u);
            else o(value_2, s, [...a, key], true, u);
          }
        else if (key === "anyOf" || key === "oneOf")
          for (let m of Array.isArray(value) ? value : []) o(m, s, [...a, ...hye(m)], false, u);
        else if ($a(value)) o(value, s, [...a, ...pye(key)], false, u);
      }
    };
    o(e, null, [], false, t);
  }
  function mye(e) {
    uu(e, {}, ({ node, isProperty }, { version, values }) => {
      let s = p0(node, version);
      if (isProperty && s !== undefined) node[SU.STAMP] = s;
      let a = node[SU.VALUE_VERSIONS];
      delete node[SU.VALUE_VERSIONS];
      let l = a !== null && a !== undefined ? a : values;
      let c = cu(node);
      if (c && s !== undefined)
        node[SU.VALUE_STAMPS] = c.map((u) => {
          var f;
          return {
            value: u,
            availableInVersion: f0(
              typeof u === "string"
                ? (f = l === null || l === undefined ? undefined : l[u]) === null || f === undefined
                  ? undefined
                  : f.availableInVersion
                : undefined,
              s,
            ),
          };
        });
      return {
        version: s,
        values: l,
      };
    });
  }
  var gU = (node, t, n) => {
    delete node[t];
    if (n !== undefined) node[t] = n;
  };
  function gye(e) {
    vU(e);
    uu(e, undefined, ({ node, isProperty }, o) => {
      let r = p0(node, o);
      if (!Ag(node)) {
        delete node[SU.STAMP];
        gU(node, SU.OVERRIDE, isProperty && r !== o ? r : undefined);
      }
      let s = cu(node);
      if (s) {
        let filtered = Cg(node).filter(
          (l) => s.includes(l.value) && (r === undefined || d0(l.availableInVersion, r)),
        );
        delete node[SU.VALUE_STAMPS];
        gU(node, SU.VALUE_OVERRIDES, filtered.length > 0 ? filtered : undefined);
      }
      return r;
    });
  }
  function vU(e) {
    uu(e, undefined, ({ node, isProperty }, o) => {
      let r = node[SU.OVERRIDE];
      delete node[SU.OVERRIDE];
      if (typeof r === "string" && !Ag(node)) node[SU.STAMP] = r;
      let s = p0(node, o);
      if (isProperty && !Ag(node) && s !== undefined) node[SU.STAMP] = s;
      let a = _U(node);
      let l = SU.VALUE_OVERRIDES in node;
      delete node[SU.VALUE_OVERRIDES];
      let c = cu(node);
      if (c && s !== undefined && (l || node[SU.VALUE_STAMPS] === undefined))
        node[SU.VALUE_STAMPS] = c.map((u) => {
          var f;
          return {
            value: u,
            availableInVersion: f0(
              (f = a.find((h) => h.value === u)) === null || f === undefined
                ? undefined
                : f.availableInVersion,
              s,
            ),
          };
        });
      return s;
    });
  }
  function wU(e) {
    let t = [];
    uu(e, undefined, (n) => {
      t.push(n);
      return;
    });
    return t;
  }
  function yye(e) {
    let t = new Map();
    let n = (o, r) => {
      if (typeof r !== "string") return;
      let s = t.get(o);
      t.set(o, s === undefined || s === r ? r : null);
    };
    for (let { id, node, isProperty } of wU(e)) {
      if (isProperty) n(id, node[SU.STAMP]);
      for (let a of Cg(node)) n(bU(id, a.value), a.availableInVersion);
    }
    return t;
  }
  function OU(e, t, n, o) {
    var r;
    if (e === undefined)
      return typeof t === "string" ? t : (r = t === null ? o : undefined) !== null && r !== undefined ? r : n;
    if (e === n && typeof t === "string" && d0(n, t)) return t;
    return typeof e === "string" ? e : undefined;
  }
  function _ye(e, t, n) {
    let o = [];
    let r = (s, a, l) => {
      let c = OU(a, t.get(s), n, l);
      if (a === n && c !== a) o.push(`${s} (v${String(c)}, not v${n})`);
      return c;
    };
    uu(e, undefined, ({ id, node, isProperty }, c) => {
      var u;
      if (isProperty)
        node[SU.STAMP] = (u = r(id, node[SU.STAMP], c)) !== null && u !== undefined ? u : node[SU.STAMP];
      let f = node[SU.STAMP];
      let h = typeof f === "string" ? f : c;
      let m = cu(node);
      if (m) {
        let y = Cg(node);
        node[SU.VALUE_STAMPS] = m.flatMap((b) => {
          var w;
          let S = r(
            bU(id, b),
            (w = y.find((j) => j.value === b)) === null || w === undefined ? undefined : w.availableInVersion,
            h,
          );
          return S === undefined
            ? []
            : [
                {
                  value: b,
                  availableInVersion: S,
                },
              ];
        });
      }
      return h;
    });
    return o;
  }
  SU._test = {
    isNeverGuard: yU,
    membersOf: cu,
    valueStampsOf: Cg,
    valueOverridesOf: _U,
  };
});
//@ chunk-1ny7cxrt.js:1230564-1243548 cjs-unmatched+string-clue
var GU = x(function (ZU) {
  Object.defineProperty(ZU, "__esModule", {
    value: true,
  });
  ZU._test =
    ZU.BOOTSTRAP_RESPONSE_ENVELOPE =
    ZU.bootstrapJsonSchemaId =
    ZU.BOOTSTRAP_SCHEMA_VERSIONS =
      undefined;
  ZU.bootstrapSchemaKeys = m0;
  ZU.publishedKeys = g0;
  ZU.availabilityOf = y0;
  ZU.availableInVersionOf = CU;
  ZU.executionTargetPublished = TU;
  ZU.executionTargetAxisPublished = _0;
  ZU.executionTargetOf = $U;
  ZU.adminFacts = RU;
  ZU.docsDeprecationsOf = DU;
  ZU.renderHint = Rg;
  ZU.buildBootstrapJsonSchema = KU;
  ZU.buildFlatBootstrapJsonSchema = Lye;
  ZU.buildStructuralSnapshot = Nye;
  var Ri = require_v3();
  var Qe = yt();
  var $g = Fi();
  var du = mn();
  var ar = EU();
  var Kt = ni();
  var PU = Fw();
  var AU = Bw();
  var IU = Pd();
  ZU.BOOTSTRAP_SCHEMA_VERSIONS = [1, 2];
  function m0({ reader: e = "desktop" } = {}) {
    return Kt.bootstrapableKeys({
      includeInternal: false,
      reader: e,
    }).filter((t) => {
      let fieldMeta = Kt.getFieldMeta(t);
      return (
        Qe.effectiveVisibility(fieldMeta) === "public" &&
        y0(fieldMeta) !== "hybrid-only" &&
        !Qe.isUnreleasedVersion(Qe.min3pAvailableInVersion(fieldMeta.support.enabled))
      );
    });
  }
  function g0() {
    return Kt.flatConfigKeys({
      includeInternal: false,
    }).filter((e) => Kt.isPublished3pKey(Kt.getFieldMeta(e)));
  }
  function y0(e) {
    var t;
    var n;
    var o;
    if (
      ((n = (t = e.remotePolicy) === null || t === undefined ? undefined : t.hybrid) === null ||
      n === undefined
        ? undefined
        : n.scope) === "only"
    )
      return "hybrid-only";
    if (Qe.isRemoteOnly(e)) return "bootstrap-only";
    if (((o = e.remotePolicy) === null || o === undefined ? undefined : o.type) === "remote-disabled")
      return "mdm-only";
    return "both";
  }
  function CU(e) {
    for (let t of [e.support.enabled, e.support.deprecated]) {
      let n = t === undefined ? [] : Array.isArray(t) ? t : [t];
      if (n.some((o) => o.scopes.includes("3p"))) return Qe.min3pAvailableInVersion(n);
    }
    return null;
  }
  function TU(e) {
    for (let t of e) {
      let executionTarget = t.support.executionTarget;
      if (executionTarget !== undefined && executionTarget !== "desktop") return true;
    }
    return false;
  }
  var Tg;
  function _0() {
    return Tg !== null && Tg !== undefined ? Tg : (Tg = TU(g0().map(Kt.getFieldMeta)));
  }
  function $U(e) {
    return _0() ? e.support.executionTarget : undefined;
  }
  function RU(e) {
    var t;
    var n;
    var o;
    var r;
    let s = DU(e);
    return {
      availableInVersion: CU(e),
      availability: y0(e),
      deprecated: Kt.deprecatedScopes(e).includes("3p"),
      beta: e.betaFeatureKey !== undefined,
      consentRequired:
        ((t = e.remotePolicy) === null || t === undefined ? undefined : t.requiresUserConsent) === true,
      originPinned:
        (r =
          (o = (n = e.remotePolicy) === null || n === undefined ? undefined : n.originPinned) === null ||
          o === undefined
            ? undefined
            : o.carries) !== null && r !== undefined
          ? r
          : false,
      ...(e.legacyFlatKey
        ? {
            legacyFlatKey: e.legacyFlatKey.name,
          }
        : {}),
      ...(s.length > 0
        ? {
            deprecations: s,
          }
        : {}),
    };
  }
  function DU(e) {
    var t;
    let n = ({ match, rewrite, editorPreserves, ...l }) => l;
    let o = e.flatKey !== undefined ? Kt.legacyNameNotice(e.flatKey, e) : undefined;
    return [...(o ? [n(o)] : []), ...((t = e.deprecations) !== null && t !== undefined ? t : []).map(n)];
  }
  var bootstrapJsonSchemaId = (e) =>
    `https://claude.com/docs/cowork/3p/schemas/bootstrap-config-v${e}.schema.json`;
  ZU.bootstrapJsonSchemaId = bootstrapJsonSchemaId;
  function h0(e) {
    if (e === null || typeof e !== "object") return;
    if (Array.isArray(e)) {
      for (let n of e) h0(n);
      return;
    }
    let t = e;
    if (t.additionalProperties === false) delete t.additionalProperties;
    for (let n of Object.values(t)) h0(n);
  }
  ZU.BOOTSTRAP_RESPONSE_ENVELOPE = {
    $schemaVersion: {
      node: Ri.z.literal(2).optional(),
      hint: "Wire-format marker: `2` for the nested format (bootstrap-config-v2, what the app's own JSON export writes), `1` for the flat format (bootstrap-config-v1). Optional: the client infers the format from the document shape; set it to state the format explicitly.",
      helpBody:
        "Omitted \u2192 the client infers the version from the document shape (any cluster key present \u2192 2, otherwise 1).",
    },
    expiresAt: {
      node: Ri.z.number().positive().optional(),
      hint: "Unix epoch (seconds or milliseconds) after which the client should re-fetch this document. Optional; when absent the client uses its default refresh interval.",
      helpBody: `Omitted \u2192 cache for 1 hour. A number \u2265 10\xB9\xB2 is read as Unix epoch **milliseconds**; below that, **seconds**.

A failed re-fetch keeps the last good response from the current session and retries; the app only enters the degraded state when there has never been a usable response this session.`,
    },
  };
  var Iye = {
    1: "Marks the flat format. Optional: a response with no cluster key is read as flat regardless; set it to state the format explicitly.",
    2: "Marks the nested format. Optional: a response carrying any cluster key is read as nested regardless; set it to state the format explicitly.",
  };
  function MU(e) {
    return Object.fromEntries(
      Object.entries(ZU.BOOTSTRAP_RESPONSE_ENVELOPE).map(([key, value]) => [
        key,
        key === "$schemaVersion"
          ? Ri.z.literal(e).optional().describe(Iye[e])
          : value.node.describe(value.hint),
      ]),
    );
  }
  function jU(e, t, n) {
    var o;
    let r = {};
    let s = (a) => {
      var l;
      var c;
      let flatKey = (l = Qe.fieldMetaForNode(a)) === null || l === undefined ? undefined : l.flatKey;
      return (
        flatKey !== undefined &&
        n.has(flatKey) &&
        ((c = Kt.FLAT_KEY_TO_NESTED_PATH.get(flatKey)) === null || c === undefined ? undefined : c[0]) === e
      );
    };
    for (let [key, value] of Object.entries(t.shape)) {
      let c = value;
      let flatKey = (o = Qe.fieldMetaForNode(c)) === null || o === undefined ? undefined : o.flatKey;
      if (flatKey !== undefined) {
        if (n.has(flatKey)) r[key] = c;
        continue;
      }
      let f = Qe.unwrapZod(c);
      if (Qe.zodKind(f) === Qe.ZodKind.ZodObject) {
        let h = jU(e, f, n);
        if (h) r[key] = h;
      } else if (
        Qe.zodKind(f) === Qe.ZodKind.ZodDiscriminatedUnion &&
        Qe.unionOptionsOf(f).some((h) => Object.values(h.shape).some((m) => s(m)))
      )
        r[key] = c;
    }
    return Object.keys(r).length > 0 ? Ri.z.object(r).optional() : undefined;
  }
  function xU(e) {
    var t;
    let n = MU(2);
    for (let [key, value] of Object.entries(Kt.ManagedConfig.shape)) {
      let s = value;
      let a = Qe.fieldMetaForNode(s);
      if (a) {
        if (e.has(a.flatKey)) n[key] = s;
        continue;
      }
      if ((t = $g.CLUSTER_REGISTRY[key]) === null || t === undefined ? undefined : t.propMap) {
        let l = jU(key, Qe.unwrapZod(s), e);
        if (l) n[key] = l;
        continue;
      }
      if (key in $g.CLUSTER_REGISTRY) n[key] = s;
    }
    return n;
  }
  function LU(e) {
    let t = MU(1);
    for (let n of new Set([...Object.keys(Kt.DISCRIMINATORS), ...Object.keys(Kt.FlatManagedConfig.shape)]))
      if (e.has(n)) t[n] = Kt.FlatManagedConfig.shape[n];
    return t;
  }
  var Cye = {};
  function Rg(e, t) {
    let text = e === null || e === undefined ? undefined : e.text;
    if (!text) return "";
    return typeof text === "function" ? text(t, Cye) : t.formatMessage(text);
  }
  function Tye(e, t, n) {
    var o;
    var r;
    let defaultMessage = t.title.defaultMessage;
    if (typeof defaultMessage === "string") e.title = defaultMessage;
    let a = Rg((o = t.description) === null || o === undefined ? undefined : o.short, n);
    if (a) e.description = a;
    let l = Qe.runtimeDefault(t);
    if (l !== undefined && e.default === undefined && e.const === undefined) e.default = l;
    e["x-flatKey"] = t.flatKey;
    let c = UU(t);
    if (c) e["x-readers"] = c;
    let u = $U(t);
    if (u) e["x-executionTarget"] = u;
    if ("failClosedValue" in t)
      e["x-whenUnreadable"] = t.unreadableStandIn
        ? {
            unusable: true,
          }
        : {
            applies: t.failClosedValue,
          };
    for (let [key, value] of Object.entries(RU(t))) e[`x-${key}`] = value;
    e[ar.VALUE_VERSIONS] = (r = t.support.values) !== null && r !== undefined ? r : {};
  }
  function $ye(e, t, n) {
    var o;
    var r;
    var s;
    var a;
    var l;
    let defaultMessage = t.label.defaultMessage;
    if (typeof defaultMessage === "string") e.title = defaultMessage;
    let u = Rg((o = t.description) === null || o === undefined ? undefined : o.short, n);
    if (u) e.description = u;
    if (t.default !== undefined && e.default === undefined) e.default = t.default;
    e["x-consentRequired"] =
      ((r = t.remotePolicy) === null || r === undefined ? undefined : r.requiresUserConsent) === true;
    if (((s = t.support) === null || s === undefined ? undefined : s.availableInVersion) !== undefined)
      e[ar.STAMP] = t.support.availableInVersion;
    e[ar.VALUE_VERSIONS] =
      (l = (a = t.support) === null || a === undefined ? undefined : a.values) !== null && l !== undefined
        ? l
        : {};
  }
  var Rye = (() => {
    var e;
    let t = new Map();
    for (let [n, o] of Kt.FLAT_KEY_TO_NESTED_PATH) {
      let joined = o.join(".");
      t.set(joined, [...((e = t.get(joined)) !== null && e !== undefined ? e : []), n]);
    }
    return new Map([...t].flatMap(([n, o]) => (o.length === 1 ? [[n, o[0]]] : [])));
  })();
  function Dye(path) {
    let t = [];
    for (let j = 0; j < path.length; j++)
      if (path[j] === "properties" && typeof path[j + 1] === "string") t.push(path[++j]);
    return t;
  }
  function Mye(e, t) {
    var n;
    var o;
    let r = (n = Kt.FLAT_KEY_TO_NESTED_PATH.get(t)) !== null && n !== undefined ? n : [t];
    let s = e;
    for (let a of r) {
      s =
        (o = s === null || s === undefined ? undefined : s.properties) === null || o === undefined
          ? undefined
          : o[a];
      if (!s) return;
    }
    return s;
  }
  function b0(e, t, n) {
    let o = Ri.z.toJSONSchema(Ri.z.object(e), {
      target: "draft-7",
      io: "input",
      reused: "inline",
      override: (s) => {
        var a;
        var l;
        var c;
        var u;
        var f;
        var h;
        let def = s.zodSchema._zod.def;
        if (def.type === "catch") {
          delete s.jsonSchema.default;
          return;
        }
        if (def.type === "array") {
          let b = Qe.openEnumItemsOf(s.zodSchema);
          if (b) s.jsonSchema.items = b;
          return;
        }
        if (def.type !== "object" || !def.shape) return;
        let jsonSchema = s.jsonSchema;
        for (let [key, value] of Object.entries(def.shape)) {
          let S = Qe.fieldMetaForNode(value);
          let j = Qe.subfieldMetaForNode(value);
          if (!S && j && Qe.effectiveVisibility(j) !== "public") {
            if (!((a = jsonSchema.properties) === null || a === undefined)) delete a[key];
            continue;
          }
          let M = (l = jsonSchema.properties) === null || l === undefined ? undefined : l[key];
          if (!M) continue;
          let N =
            (u =
              (c = S === null || S === undefined ? undefined : S.flatKey) !== null && c !== undefined
                ? c
                : j === null || j === undefined
                  ? undefined
                  : j.flatKey) !== null && u !== undefined
              ? u
              : j
                ? undefined
                : Rye.get([...Dye(s.path), key].join("."));
          if (N === undefined) {
            if (j) $ye(M, j, n);
            else {
              let availableInVersion = Qe.annotationsOf(value).availableInVersion;
              if (availableInVersion !== undefined) M[ar.STAMP] = availableInVersion;
            }
            continue;
          }
          if (!t.has(N)) {
            if (!((f = jsonSchema.properties) === null || f === undefined)) delete f[key];
            continue;
          }
          Tye(M, S !== null && S !== undefined ? S : Kt.getFieldMeta(N), n);
          if (!S && j) {
            let Z = UU(j);
            if (Z) M["x-readers"] = Z;
            else delete M["x-readers"];
            let F = Rg((h = j.description) === null || h === undefined ? undefined : h.short, n);
            if (F) M.description = F;
            M["x-alias"] = true;
          }
        }
        IU.setRequiredFromRuntime(def.shape, jsonSchema);
      },
    });
    delete o.$schema;
    let r = {
      $ref: "#/definitions/BootstrapConfig",
      definitions: {
        BootstrapConfig: o,
      },
    };
    h0(r);
    PU.admitLegacyCredentialKinds(r.definitions.BootstrapConfig);
    AU.admitLegacyToolPolicyValues(r.definitions.BootstrapConfig);
    ar.resolveMemberVersions(r.definitions.BootstrapConfig);
    ar.compactMemberVersions(r.definitions.BootstrapConfig);
    return r;
  }
  var filtered = Qe.CONFIG_READERS.filter((e) => Qe.READER_FACTS[e].readsBootstrap);
  function UU(e) {
    let filtered_2 = Qe.readersOf(e).filter((n) => filtered.includes(n));
    return Qe.readersDeclared({
      readers: filtered_2,
    })
      ? filtered_2
      : undefined;
  }
  var jye = `A node marked \`x-readers\` is read by the clients it names (${Qe.readerLegend(filtered)}); an unmarked node is read by Claude Desktop only. The marker is per key; which providers a client supports is that client's own list.`;
  var xye =
    " A key node marked `x-executionTarget` applies only while the desktop's sessions run on that target (`desktop` = the app runs them on the device; any other value names the cluster that configures that target); an unmarked key applies under every target.";
  var zU = () => jye + (_0() ? xye : "");
  var FU =
    `Each key node's \`x-availableInVersion\` is the first Claude Desktop release that reads the key; the app names its version as \`Claude/<version>\` in the User-Agent of the request, so a server can leave out keys the requesting build does not read yet. Below a key, releases are stated by exception: a property node carries \`${ar.OVERRIDE}\` only when it is first read by a later release than the node above it, and an \`enum\` or \`const\` node's \`${ar.VALUE_OVERRIDES}\` lists \`{value, availableInVersion}\` only for the values first read by a later release than the node. The release from which a location in a document is read is the newest one stated on the path from the root to it: the key's \`${ar.STAMP}\`, any override on a property node along the way (array items, map values and union alternatives add no level of their own), ` +
    "the value's own entry, and \u2014 inside a union alternative (a managed MCP " +
    "server, OAuth, marketplace or inference-provider variant) \u2014 the release " +
    "stated on that alternative's discriminator property (`server`, `mode`, " +
    "`transport`, `source`, `provider`, \u2026): its override, or the entry for " +
    "its value; the alternative's other properties and any key repeated inside it are read no earlier than that. A node with `x-legacyFlatKey` was renamed: builds older than its release may read the setting under that earlier name, whose acceptance dates are in `x-deprecations`.";
  var BU =
    "Structural reference for editor autocomplete \u2014 the client applies " +
    "further validation that this schema does not express (https-only and non-loopback URLs, origin-pinning under gateway SSO). Unrecognised keys are ignored.";
  var HU =
    ' A key node\'s `x-whenUnreadable` says what Claude Desktop does when the key is present but its value is invalid (wrong type, malformed, or no usable entry; `null` and a blank string count as not set): `{"applies": value}` means it applies that value; `{"unusable": true}` means it treats the key as set but unusable (an invalid managed MCP server list keeps plugin-provided servers\' tools blocked rather than allowing them), and a server that mirrors the app should do the same. A key node without it is treated as not set in that case.';
  function KU({ keys: e = m0(), intl: t = du.STUB_INTL } = {}) {
    let n = new Set(e);
    let o = b0(xU(n), n, t);
    let BootstrapConfig = o.definitions.BootstrapConfig;
    if (BootstrapConfig.properties)
      BootstrapConfig.description = `Per-user bootstrap configuration response in the nested format (\`$schemaVersion\` 2): a subset of managed configuration grouped into cluster objects (bootstrapable keys only). ${BU} The flat key names of bootstrap-config-v1 are also accepted at top level beside clusters. ${zU()}${HU} ${FU}`;
    return {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: ZU.bootstrapJsonSchemaId(2),
      ...o,
    };
  }
  function Lye({ keys: e = m0(), intl: t = du.STUB_INTL } = {}) {
    let n = new Set(e);
    let o = b0(LU(n), n, t);
    let BootstrapConfig = o.definitions.BootstrapConfig;
    delete BootstrapConfig.required;
    BootstrapConfig.description = `Per-user bootstrap configuration response in the flat format (\`$schemaVersion\` 1): bootstrapable keys by their managed-configuration key names at top level. ${BU} ${zU()}${HU} ${FU}`;
    return {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: ZU.bootstrapJsonSchemaId(1),
      ...o,
    };
  }
  function Nye(intl = du.STUB_INTL) {
    return KU({
      keys: g0(),
      intl,
    });
  }
  ZU._test = {
    nestedBootstrapShape: xU,
    flatBootstrapShape: LU,
    nodeAtNestedPath: Mye,
    emitDocument: b0,
  };
});
//@ chunk-1ny7cxrt.js:1243548-1251060 cjs-unmatched+string-clue
var oz = x(function (tz) {
  Object.defineProperty(tz, "__esModule", {
    value: true,
  });
  tz._test = tz.DOCS_GROUPS = tz.configReferenceUrl = tz.CONFIG_REFERENCE_URL = tz.anchorSlug = undefined;
  tz.typeStringOf = pu;
  tz.docsTableRows = ez;
  tz.buildConfigReferenceData = r_e;
  var ks = GU();
  var Ss = Xr();
  var nt = yt();
  var YU = $n();
  var Ma = Dd();
  var Dg = mn();
  var Da = ni();
  var JU = _g();
  var anchorSlug = (e) => e.toLowerCase();
  tz.anchorSlug = anchorSlug;
  tz.CONFIG_REFERENCE_URL = `${YU.COWORK_3P_DOCS_BASE}/configuration`;
  var configReferenceUrl = (e) =>
    Da.isPublished3pKey(e) && nt.isReadBy(e, "desktop")
      ? `${tz.CONFIG_REFERENCE_URL}#${tz.anchorSlug(e.flatKey)}`
      : undefined;
  tz.configReferenceUrl = configReferenceUrl;
  function pu(node) {
    let t = nt.unwrapZod(node);
    let n = nt.zodKind(t);
    if (n === nt.ZodKind.ZodBoolean) return "boolean";
    if (n === nt.ZodKind.ZodNumber) return nt.numberIsInt(t) ? "integer" : "number";
    if (n === nt.ZodKind.ZodEnum) return "enum";
    if (n === nt.ZodKind.ZodLiteral) {
      let o = nt.literalValueOf(t);
      if (typeof o === "boolean") return "boolean";
      if (typeof o === "number") return Number.isInteger(o) ? "integer" : "number";
      return "string";
    }
    if (n === nt.ZodKind.ZodArray) {
      let o = Ma.elementOf(node);
      return `${o ? pu(o) : "unknown"}[]`;
    }
    if (n === nt.ZodKind.ZodObject || n === nt.ZodKind.ZodRecord) return "object";
    if (n === nt.ZodKind.ZodUnion || n === nt.ZodKind.ZodDiscriminatedUnion)
      return nt
        .unionOptionsOf(t)
        .map(pu)
        .every((s) => s === "string" || s === "enum")
        ? "string"
        : "object";
    return "string";
  }
  function XU(node) {
    return nt.findDefaultValue(node);
  }
  function WU(node, t) {
    let n = nt.unwrapZod(node);
    let o = nt.numberBoundsOf(n)[t];
    if (!o) return;
    if (!o.inclusive && nt.numberIsInt(n)) return t === "min" ? o.value + 1 : o.value - 1;
    return o.value;
  }
  var fu = (e) => `\`${String(e)}\``;
  function w0(node, t, n = "", o = 0) {
    var r;
    let s = (r = Ma.elementOf(node)) !== null && r !== undefined ? r : node;
    return nt.subFieldsOf(s).flatMap((a) => {
      var l;
      var c;
      var u;
      var f;
      var h;
      var m;
      if (nt.effectiveVisibility(a) !== "public") return [];
      let y = n + a.key;
      let b = [];
      let text =
        (c = (l = a.description) === null || l === undefined ? undefined : l.short) === null ||
        c === undefined
          ? undefined
          : c.text;
      if (text) b.push(t.formatMessage(text));
      let nonPublicOptions = a.nonPublicOptions;
      let j = (
        nonPublicOptions === null || nonPublicOptions === undefined ? undefined : nonPublicOptions.length
      )
        ? (u = a.options) === null || u === undefined
          ? undefined
          : u.filter((he) => !nonPublicOptions.includes(he))
        : a.options;
      if (j === null || j === undefined ? undefined : j.length) b.push(`One of: ${j.map(fu).join(", ")}.`);
      let M = (f = a.default) !== null && f !== undefined ? f : XU(a.node);
      let defaultString = M === undefined || typeof M === "object" ? null : String(M);
      let long = (h = a.description) === null || h === undefined ? undefined : h.long;
      let F = {
        name: y,
        typeString: pu(a.node),
        defaultString,
        description: b.join(" "),
        ...((long === null || long === undefined ? undefined : long.text)
          ? {
              helpBody: long.text,
            }
          : {}),
        ...((long === null || long === undefined ? undefined : long.docsUrl)
          ? {
              docsUrl: long.docsUrl,
            }
          : {}),
        ...((j === null || j === undefined ? undefined : j.length)
          ? {
              enumValues: j,
            }
          : {}),
        ...(((m = a.remotePolicy) === null || m === undefined ? undefined : m.requiresUserConsent)
          ? {
              consentRequired: true,
            }
          : {}),
        ...(a.betaFeatureKey
          ? {
              beta: true,
            }
          : {}),
      };
      let X = o < 1 ? w0(a.node, t, `${y}.`, o + 1) : [];
      return [F, ...X];
    });
  }
  tz.DOCS_GROUPS = {
    connection: {
      inference: {
        group: "connection",
        groupLabel: null,
      },
      workspace: {
        group: "connection",
        groupLabel: null,
      },
      dictation: {
        group: "connection",
        groupLabel: null,
      },
      models: {
        group: "connection.models",
        groupLabel: "Models",
      },
      authentication: {
        group: "connection.authentication",
        groupLabel: "Authentication",
      },
      gateway: {
        group: "connection.gateway",
        groupLabel: "Gateway",
      },
      selfHosted: {
        group: "connection.selfHosted",
        groupLabel: "Self-hosted execution",
      },
      anthropic: {
        group: "connection.anthropic",
        groupLabel: "Anthropic",
      },
      bedrock: {
        group: "connection.bedrock",
        groupLabel: "Bedrock",
      },
      mantle: {
        group: "connection.mantle",
        groupLabel: "Mantle",
      },
      vertex: {
        group: "connection.vertex",
        groupLabel: "Vertex",
      },
      foundry: {
        group: "connection.foundry",
        groupLabel: "Foundry",
      },
    },
    sandbox: {
      coworkSurface: {
        group: "sandbox.coworkSurface",
        groupLabel: "Cowork surface",
      },
      codeSurface: {
        group: "sandbox.codeSurface",
        groupLabel: "Code surface",
      },
      chatSurface: {
        group: "sandbox.chatSurface",
        groupLabel: "Chat surface",
      },
      workspace: {
        group: "sandbox.workspace",
        groupLabel: "Workspace",
      },
      builtinBrowser: {
        group: "sandbox.builtinBrowser",
        groupLabel: "Built-in browser",
      },
      plugins: {
        group: "sandbox.workspace",
        groupLabel: "Workspace",
      },
      authentication: {
        group: "sandbox.authentication",
        groupLabel: "Authentication",
      },
    },
    connectors: {
      extensions: {
        group: "connectors.extensions",
        groupLabel: "Extensions",
      },
      mcp: {
        group: "connectors.mcp",
        groupLabel: "MCP",
      },
      workspace: {
        group: "connectors.workspace",
        groupLabel: "Workspace",
      },
      authentication: {
        group: "connectors.authentication",
        groupLabel: "Authentication",
      },
    },
    telemetry: {
      telemetry: {
        group: "telemetry",
        groupLabel: null,
      },
      otlp: {
        group: "telemetry.otlp",
        groupLabel: "OTLP",
      },
      autoUpdate: {
        group: "telemetry.autoUpdate",
        groupLabel: "Auto update",
      },
      lifecycle: {
        group: "telemetry.configUpdates",
        groupLabel: "Configuration updates",
      },
    },
    limits: {
      tokenLimits: {
        group: "limits.tokenLimits",
        groupLabel: "Token limits",
      },
      sessionRetention: {
        group: "limits.sessionRetention",
        groupLabel: "Session retention",
      },
    },
    appearance: {
      appearance: {
        group: "appearance",
        groupLabel: null,
      },
      featureDiscovery: {
        group: "appearance.featureDiscovery",
        groupLabel: "Feature discovery",
      },
      workspace: {
        group: "appearance",
        groupLabel: null,
      },
    },
    plugins: {
      plugins: {
        group: "plugins",
        groupLabel: null,
      },
    },
    source: {
      bootstrap: {
        group: "source.bootstrap",
        groupLabel: "Bootstrap",
      },
    },
  };
  function QU(e) {
    var t;
    let n = Da.FLAT_KEY_TO_NESTED_PATH.get(e.flatKey);
    return (t = Da.fieldProviders(e.flatKey)[0]) !== null && t !== undefined
      ? t
      : n !== undefined && n.length > 1
        ? n[0]
        : undefined;
  }
  function t_e(meta) {
    let t = QU(meta);
    let n = t === undefined ? undefined : tz.DOCS_GROUPS[meta.category][t];
    return n !== null && n !== undefined
      ? n
      : {
          group: meta.category,
          groupLabel: null,
        };
  }
  function n_e(e, t) {
    var n;
    var o;
    var r;
    var s;
    var a;
    var l;
    var c;
    var u;
    let { meta, node } = e;
    let m = [];
    let y = ks.renderHint((n = meta.description) === null || n === undefined ? undefined : n.short, t);
    if (y) m.push(y);
    let b = Ma.elementOf(node);
    let w = b ? nt.enumOptionsOf(b) : nt.enumOptionsOf(node);
    if (w) m.push(`One of: ${w.map(fu).join(", ")}.`);
    let S = (o = nt.runtimeDefault(meta)) !== null && o !== undefined ? o : XU(node);
    let j = S === undefined ? null : String(S);
    if (j !== null) m.push(`Defaults to ${fu(j)}.`);
    let M = WU(node, "min");
    let N = WU(node, "max");
    if (M !== undefined && N !== undefined) m.push(`Range: ${M}\u2013${N}.`);
    let Z =
      M !== undefined || N !== undefined
        ? {
            ...(M !== undefined
              ? {
                  min: M,
                }
              : {}),
            ...(N !== undefined
              ? {
                  max: N,
                }
              : {}),
          }
        : undefined;
    if (meta.legacyFlatKey) {
      let legacyFlatKey = meta.legacyFlatKey;
      m.push(
        legacyFlatKey.supportEnds === undefined
          ? `Previously named ${fu(legacyFlatKey.name)}.`
          : `Previously named ${fu(legacyFlatKey.name)} (the old name is accepted until ${Ss.formatDeprecationDate(legacyFlatKey.supportEnds)}). ${Ss.consequenceOf(legacyFlatKey, false)}`,
      );
    }
    for (let he of ks.docsDeprecationsOf(meta)) {
      if (he.path === ((r = meta.legacyFlatKey) === null || r === undefined ? undefined : r.name)) continue;
      let Me =
        he.supportEnds === undefined ? "" : ` (accepted until ${Ss.formatDeprecationDate(he.supportEnds)})`;
      m.push(`Deprecated: ${fu(he.path)}${Me}; ${Ss.replacementOf(he)}. ${Ss.consequenceOf(he, false)}`);
    }
    let F = w0(node, t);
    let X = ks.executionTargetOf(meta);
    return {
      mdmKey: meta.flatKey,
      label: t.formatMessage(meta.title),
      anchor: tz.anchorSlug(meta.flatKey),
      ...t_e(meta),
      typeString: pu(node),
      defaultString: j,
      description: m.join(" "),
      helpBody:
        (l =
          (a = (s = meta.description) === null || s === undefined ? undefined : s.long) === null ||
          a === undefined
            ? undefined
            : a.text) !== null && l !== undefined
          ? l
          : null,
      ...((
        (u = (c = meta.description) === null || c === undefined ? undefined : c.long) === null ||
        u === undefined
          ? undefined
          : u.docsUrl
      )
        ? {
            docsUrl: meta.description.long.docsUrl,
          }
        : {}),
      ...ks.adminFacts(meta),
      ...(X
        ? {
            executionTarget: X,
          }
        : {}),
      ...(w
        ? {
            enumValues: w,
          }
        : {}),
      ...(Z
        ? {
            range: Z,
          }
        : {}),
      ...(F.length > 0
        ? {
            subfields: F,
          }
        : {}),
    };
  }
  function ez(id, t = Dg.STUB_INTL) {
    return Ma.FORM_FIELDS.filter((n) => n.meta.category === id && Da.isPublished3pKey(n.meta)).map((n) =>
      n_e(n, t),
    );
  }
  function r_e(e = Dg.STUB_INTL) {
    let mapped = Object.entries(JU.CONFIGURATION_CATEGORIES)
      .filter(([, value]) => !value.derived)
      .map(([key, value]) => ({
        id: key,
        label: e.formatMessage(value.title),
      }));
    let rows = mapped
      .flatMap(({ id }) => ez(id, e))
      .filter((r) => !nt.isUnreleasedVersion(r.availableInVersion));
    let bootstrapResponse = Object.entries(ks.BOOTSTRAP_RESPONSE_ENVELOPE).map(([key, value]) => ({
      name: key,
      typeString: pu(value.node),
      hint: value.hint,
      helpBody: value.helpBody,
    }));
    return {
      categoryOrder: mapped,
      rows,
      bootstrapResponse,
    };
  }
  tz._test = {
    clusterOf: QU,
    subfieldRowsOf: w0,
  };
});
//@ chunk-1ny7cxrt.js:1251060-1258174 cjs-unmatched+string-clue
var k0 = x(function (pz) {
  Object.defineProperty(pz, "__esModule", {
    value: true,
  });
  pz.egressServiceKeys = pz.EGRESS_SERVICES = pz.CORE_GROUP_LABEL = undefined;
  pz.asHostContext = dz;
  pz.resolveEndpoints = Mg;
  pz.hostsForService = fz;
  pz.enabledServicesFromConfig = S0;
  pz.firewallHostsForServices = u_e;
  pz.subprocessHostsForServices = d_e;
  pz.rendererEgressRules = f_e;
  pz.serviceLabelForToggleKey = p_e;
  var Zt = gr();
  var it = mn();
  function dz(e) {
    return typeof e === "string"
      ? {
          anthropicHost: e,
        }
      : e;
  }
  pz.CORE_GROUP_LABEL = it.msg({
    defaultMessage: "Core (VM bundle + Claude CLI binary)",
    id: "Qee7joNNug",
  });
  var purpose = it.msg({
    defaultMessage: "Update feed",
    id: "KbnxmPwS+u",
  });
  var purpose_2 = it.msg({
    defaultMessage: "Update binaries",
    id: "kEckiEomWG",
  });
  var purpose_3 = it.msg({
    defaultMessage: "Crash and error reporting",
    id: "KebbKnJWUP",
  });
  var purpose_4 = it.msg({
    defaultMessage: "Connector favicons",
    id: "WD43CRFsX6",
  });
  var purpose_5 = it.msg({
    defaultMessage: "Analytics events",
    id: "dEx3lCin50",
  });
  var purpose_6 = it.msg({
    defaultMessage: "Performance timing",
    id: "/01LkRl6b6",
  });
  pz.EGRESS_SERVICES = {
    "vm-bundle": {
      toggleKey: null,
      label: pz.CORE_GROUP_LABEL,
      endpoints: [
        {
          host: Zt.VM_BUNDLE_HOST,
          origin: "main",
          purpose: it.msg({
            defaultMessage:
              "VM workspace bundle and Claude CLI binary, fetched in the background or at session start",
            id: "KuP75AjRVN",
          }),
        },
      ],
    },
    "model-catalog": {
      toggleKey: null,
      label: pz.CORE_GROUP_LABEL,
      endpoints: [
        {
          host: Zt.VM_BUNDLE_HOST,
          origin: "main",
          purpose: it.msg({
            defaultMessage:
              "Claude Code model catalog (signed picker metadata), polled every 5\u201315 minutes",
            id: "B6i3SyZAU2",
          }),
        },
      ],
    },
    updater: {
      toggleKey: "disableAutoUpdates",
      label: it.msg({
        defaultMessage: "Auto-updates",
        id: "PNFwYup600",
      }),
      endpoints: ({ anthropicHost, updateViaUpdatesHost }) =>
        updateViaUpdatesHost
          ? [
              {
                host: Zt.UPDATE_FEED_HOST,
                path: "/api/desktop/",
                pathSuffix: "/update",
                origin: "main",
                purpose,
              },
              {
                host: Zt.VM_BUNDLE_HOST,
                path: "/releases/",
                followRedirects: true,
                origin: "main",
                purpose: purpose_2,
              },
            ]
          : [
              {
                host: anthropicHost,
                path: "/api/desktop/",
                pathSuffix: "/update",
                origin: "renderer",
                purpose,
              },
              {
                host: Zt.ANTHROPIC_API_HOST,
                path: "/api/desktop/",
                pathSuffix: "/update",
                origin: "renderer",
                purpose: it.msg({
                  defaultMessage: "Update feed (releases.claude.com when updateViaUpdatesHost is set)",
                  id: "jAA6DpK01B",
                }),
              },
              {
                host: Zt.VM_BUNDLE_HOST,
                path: "/releases/",
                followRedirects: true,
                origin: "main",
                purpose: purpose_2,
              },
            ],
    },
    sentry: {
      toggleKey: "disableEssentialTelemetry",
      label: it.msg({
        defaultMessage: "Essential telemetry",
        id: "4tdiEppQ3S",
      }),
      endpoints: [
        {
          host: Zt.SENTRY_WILDCARD_HOST,
          origin: "renderer",
          purpose: purpose_3,
          firewallAlso: ["*.ingest.us.sentry.io"],
        },
        {
          host: "sentry.io",
          origin: "renderer",
          purpose: purpose_3,
        },
      ],
    },
    "datadog-rum": {
      toggleKey: "disableEssentialTelemetry",
      label: it.msg({
        defaultMessage: "Essential telemetry",
        id: "4tdiEppQ3S",
      }),
      endpoints: ({ anthropicHost }) => [
        {
          host: anthropicHost,
          path: "/api/v2/rum",
          exactPath: true,
          origin: "renderer",
          cspDirective: [],
          undeliveredAs503: true,
          purpose: purpose_6,
        },
        ...Zt.DATADOG_INTAKE_HOSTS.map((host) => ({
          host,
          origin: "renderer",
          purpose: purpose_6,
        })),
      ],
    },
    "anthropic-telemetry": {
      toggleKey: "disableNonessentialTelemetry",
      label: it.msg({
        defaultMessage: "Nonessential telemetry",
        id: "UzLHrala3Q",
      }),
      endpoints: ({ anthropicHost }) => [
        {
          host: anthropicHost,
          path: "/api/event_logging/",
          origin: "renderer",
          purpose: purpose_5,
        },
        {
          host: Zt.ANTHROPIC_API_HOST,
          path: "/api/event_logging/",
          origin: "subprocess",
          purpose: it.msg({
            defaultMessage: "Claude Code usage telemetry, sent from inside the agent sandbox",
            id: "nuegL6TUzw",
          }),
        },
      ],
    },
    "connector-favicons": {
      toggleKey: "disableNonessentialServices",
      label: it.msg({
        defaultMessage: "Nonessential services",
        id: "Pc8UzwjRqD",
      }),
      endpoints: [
        {
          host: Zt.FAVICON_PROXY_HOST,
          path: "/s2/favicons",
          followRedirects: true,
          origin: "renderer",
          cspDirective: "img-src",
          purpose: purpose_4,
        },
        {
          host: Zt.GSTATIC_WILDCARD,
          path: "/faviconV2",
          origin: "renderer",
          cspDirective: "img-src",
          purpose: purpose_4,
        },
      ],
    },
    "artifact-sandbox": {
      toggleKey: "disableNonessentialServices",
      label: it.msg({
        defaultMessage: "Nonessential services",
        id: "Pc8UzwjRqD",
      }),
      endpoints: ({ artifactIframeHost }) => [
        {
          host:
            artifactIframeHost !== null && artifactIframeHost !== undefined
              ? artifactIframeHost
              : Zt.ARTIFACT_IFRAME_HOST,
          origin: "renderer",
          cspDirective: "frame-src",
          purpose: it.msg({
            defaultMessage: "Artifact preview iframe",
            id: "e6F+tBnFYh",
          }),
          firewallAlso: ["cdnjs.cloudflare.com", "fonts.googleapis.com", "cdn.jsdelivr.net"],
          firewallAlsoPurpose: it.msg({
            defaultMessage: "Artifact preview asset CDNs",
            id: "F3E8xAmcXF",
          }),
        },
      ],
    },
    "mcp-app-sandbox": {
      toggleKey: "disableNonessentialServices",
      label: it.msg({
        defaultMessage: "Nonessential services",
        id: "Pc8UzwjRqD",
      }),
      endpoints: [
        {
          host: Zt.MCP_APP_SANDBOX_WILDCARD_HOST,
          origin: "renderer",
          cspDirective: "frame-src",
          purpose: it.msg({
            defaultMessage: "MCP App widget iframe",
            id: "1VKIczmlHd",
          }),
          firewallAlso: [Zt.ANTHROPIC_ASSETS_HOST],
          firewallAlsoPurpose: it.msg({
            defaultMessage: "Fonts loaded by MCP App widget iframes",
            id: "KZlBInyqLF",
          }),
        },
      ],
    },
    "spellcheck-dictionary": {
      toggleKey: "disableNonessentialServices",
      label: it.msg({
        defaultMessage: "Nonessential services",
        id: "Pc8UzwjRqD",
      }),
      endpoints: [
        {
          host: Zt.SPELLCHECK_DICTIONARY_HOST,
          origin: "main",
          platforms: ["linux"],
          purpose: it.msg({
            defaultMessage: "Spellcheck dictionary download (Linux)",
            id: "RV5jkrepds",
          }),
          firewallAlso: [Zt.SPELLCHECK_DICTIONARY_WILDCARD],
          firewallAlsoPurpose: it.msg({
            defaultMessage: "Redirect targets of the spellcheck dictionary download (Linux)",
            id: "2PMBhDP0Gf",
          }),
        },
      ],
    },
    dictation: {
      toggleKey: null,
      label: pz.CORE_GROUP_LABEL,
      endpoints: ({ dictationCsp }) =>
        dictationCsp
          ? [
              {
                host: dictationCsp.host,
                origin: "renderer",
                cspDirective: "connect-src",
                cspScheme: dictationCsp.scheme,
              },
            ]
          : [],
    },
  };
  pz.egressServiceKeys = Object.keys(pz.EGRESS_SERVICES);
  function Mg(endpoints, t) {
    let n = dz(t);
    let o = typeof endpoints === "function" ? endpoints(n) : endpoints;
    let { platform } = n;
    return platform === undefined ? o : o.filter((s) => !s.platforms || s.platforms.includes(platform));
  }
  function fz(e, t = "") {
    return Mg(e.endpoints, t).flatMap((n) => {
      var o;
      return [n.host, ...((o = n.firewallAlso) !== null && o !== undefined ? o : [])];
    });
  }
  function c_e(e, toggleKey) {
    var n;
    var o;
    var r;
    var s;
    var a;
    var l;
    var c;
    var u;
    switch (toggleKey) {
      case "disableAutoUpdates":
        return (
          ((o = (n = e.autoUpdate) === null || n === undefined ? undefined : n.disabled) !== null &&
          o !== undefined
            ? o
            : e.disableAutoUpdates) === true
        );
      case "disableEssentialTelemetry":
        return (
          ((s = (r = e.telemetry) === null || r === undefined ? undefined : r.disableEssential) !== null &&
          s !== undefined
            ? s
            : e.disableEssentialTelemetry) === true
        );
      case "disableNonessentialTelemetry":
        return (
          ((l = (a = e.telemetry) === null || a === undefined ? undefined : a.disableNonessential) !== null &&
          l !== undefined
            ? l
            : e.disableNonessentialTelemetry) === true
        );
      case "disableNonessentialServices":
        return (
          ((u = (c = e.telemetry) === null || c === undefined ? undefined : c.disableNonessentialServices) !==
            null && u !== undefined
            ? u
            : e.disableNonessentialServices) === true
        );
    }
  }
  function S0(e) {
    return pz.egressServiceKeys.filter((egressServiceKey) => {
      let { toggleKey } = pz.EGRESS_SERVICES[egressServiceKey];
      return toggleKey === null || !c_e(e, toggleKey);
    });
  }
  function u_e(e, t) {
    return S0(e).flatMap((n) => {
      let o = pz.EGRESS_SERVICES[n];
      return fz(o, t).map((host) => ({
        host,
        toggleKey: o.toggleKey,
      }));
    });
  }
  function d_e(e, t = "") {
    return S0(e).flatMap((n) =>
      Mg(pz.EGRESS_SERVICES[n].endpoints, t)
        .filter((o) => o.origin === "subprocess")
        .map((o) => o.host),
    );
  }
  function f_e(e, t) {
    return e.flatMap((n) =>
      Mg(pz.EGRESS_SERVICES[n].endpoints, t)
        .filter((o) => o.origin === "renderer")
        .map(({ host, path, pathSuffix, exactPath, followRedirects, undeliveredAs503 }) => ({
          host,
          ...(path !== undefined && {
            path,
          }),
          ...(pathSuffix !== undefined && {
            pathSuffix,
          }),
          ...(exactPath !== undefined && {
            exactPath,
          }),
          ...(followRedirects !== undefined && {
            followRedirects,
          }),
          ...(undeliveredAs503 !== undefined && {
            undeliveredAs503,
          }),
        })),
    );
  }
  function p_e(e) {
    if (e === null) return pz.CORE_GROUP_LABEL;
    for (let egressServiceKey of pz.egressServiceKeys) {
      let n = pz.EGRESS_SERVICES[egressServiceKey];
      if (n.toggleKey === e) return n.label;
    }
    return;
  }
});
//@ chunk-1ny7cxrt.js:1258174-1259296 cjs-unmatched+string-clue
var yz = x(function (gz) {
  Object.defineProperty(gz, "__esModule", {
    value: true,
  });
  gz.computeEgressRequirements = S_e;
  gz.egressRequirementLabel = k_e;
  var hz = gr();
  var xg = k0();
  var mz = Fi();
  var ja = ni();
  var O_e = "claude.ai";
  function S_e(e, t, anthropicHost = O_e, platform) {
    var r;
    var s;
    let a = new Set();
    let l = [];
    let c = (f, fieldKey) => {
      if (!f || a.has(f)) return;
      a.add(f);
      l.push({
        host: f,
        fieldKey,
      });
    };
    for (let { host, toggleKey } of xg.firewallHostsForServices(e, {
      anthropicHost,
      artifactIframeHost: hz.egressAddress(
        (r = e.workspace) === null || r === undefined ? undefined : r.userContentRendererUrl,
      ),
      updateViaUpdatesHost: (s = e.autoUpdate) === null || s === undefined ? undefined : s.viaUpdatesHost,
      platform,
    }))
      c(host, toggleKey !== null && toggleKey !== undefined ? toggleKey : "core");
    let u = mz.flattenAll(e);
    for (let f of ja.flatConfigKeys(t)) {
      let fieldMeta = ja.getFieldMeta(f);
      if (!ja.enabledScopes(fieldMeta).includes("3p") || !fieldMeta.egressRequirements) continue;
      let m =
        typeof fieldMeta.egressRequirements === "function"
          ? fieldMeta.egressRequirements(u[f], e)
          : fieldMeta.egressRequirements;
      for (let y of m) c(y, f);
    }
    return l;
  }
  function k_e(e, t) {
    var n;
    let o = xg.serviceLabelForToggleKey(t === "core" ? null : t);
    if (o) return e.formatMessage(o);
    let fieldMeta = ja.getFieldMeta(t);
    return e.formatMessage(
      (n = fieldMeta.egressRequirementsLabel) !== null && n !== undefined ? n : fieldMeta.title,
    );
  }
});
//@ chunk-1ny7cxrt.js:1259296-1305489 cjs-unmatched+string-clue
var wz = x(function (g) {
  var A_e =
    (g && g.__createBinding) ||
    (Object.create
      ? function (e, t, n, o) {
          if (o === undefined) o = n;
          var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, n);
          if (
            !ownPropertyDescriptor ||
            ("get" in ownPropertyDescriptor
              ? !t.__esModule
              : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
          )
            ownPropertyDescriptor = {
              enumerable: true,
              get: function () {
                return t[n];
              },
            };
          Object.defineProperty(e, o, ownPropertyDescriptor);
        }
      : function (e, t, n, o) {
          if (o === undefined) o = n;
          e[o] = t[n];
        });
  var _z =
    (g && g.__exportStar) ||
    function (e, t) {
      for (var key in e)
        if (key !== "default" && !Object.prototype.hasOwnProperty.call(t, key)) A_e(t, e, key);
    };
  Object.defineProperty(g, "__esModule", {
    value: true,
  });
  g.ManagedMcpServers =
    g.M365_WRITE_DELEGATED_SCOPES =
    g.M365_GRANTABLE_DELEGATED_SCOPES =
    g.M365_DEFAULT_DELEGATED_SCOPES =
    g.M365_ALWAYS_REQUESTED_SCOPES =
    g.M365_ADMIN_CONSENT_SCOPES =
    g.LOOPBACK_HOSTS =
    g.isLoopbackHost =
    g.CLOUD_METADATA_IPV6 =
    g.CLOUD_METADATA_IPV4 =
    g.CLOUD_METADATA_HOSTS =
    g.CLOUD_METADATA_HOST_NAMES =
    g.isLinkLocalOrMetadataHost =
    g.isSafeMcpCommand =
    g.HELPER_ARG_UNSAFE_MESSAGE =
    g.hasNoHelperBreakoutChars =
    g.isPluginMcpToolPolicyUnreadable =
    g.isOrgPluginSettingsParseFailed =
    g.isConnectableMcpEntry =
    g.isBuiltinMcpItem =
    g.isBuiltinMcpEntry =
    g.wantsOAuthProvider =
    g.httpsUrl =
    g.hasOAuthConfig =
    g.DirectMcpServerConfig =
    g.connectableMcpServers =
    g.configuredHostPath =
    g.relevantMcpEntryIssues =
    g.CALLBACK_HOST_OPTIONS =
    g.WEB_SEARCH_PROVIDER_HOSTS =
    g.WEB_SEARCH_PROVIDERS =
    g.hostsForBuiltinMcpEntry =
    g.findWebSearchBuiltin =
    g.BUILTIN_MCP_SERVERS =
    g.BUILTIN_DEFAULT_TOOL_POLICY =
    g.GatewayOidc =
    g.BootstrapFetchOidc =
    g.BootstrapOidc =
    g.AZURE_CLOUD_HOSTS =
    g.foldMcpEntryLegacy =
    g.adaptPluginMcp =
    g.TIER_DESCRIPTIONS =
    g.EFFORT_LEVELS =
    g.ANTHROPIC_TIER_NAMES =
    g.verdictToFallbackReason =
    g.TIER_ALIASES =
    g.isLikelyAnthropicModelId =
    g.isDefinitelyNotAnthropicModel =
    g.containsAnthropicToken =
    g.checkModel =
      undefined;
  g.kindSupportsDiscovery =
    g.credentialSpecCell =
    g.CREDENTIAL_SPEC =
    g.isSensitiveDropped =
    g.isRedactedInExports =
    g.keepsAuthoredEmptyList =
    g.tryGetFieldMeta =
    g.getFieldMeta =
    g.deprecatedScopes =
    g.enabledScopes =
    g.ManagedConfig =
    g.retiredFlatKeyEffect =
    g.RETIRED_FLAT_KEYS =
    g.FLAT_KEY_TO_NESTED_PATH =
    g.flatConfigKeys =
    g.FlatManagedConfig =
    g.BannerConfig =
    g.assignParsedKey =
    g.MARKETPLACE_INSTALL_PREFS =
    g.MARKETPLACE_CREDENTIAL_KINDS =
    g.AllowedPluginMarketplace =
    g.surfaceOptionLock =
    g.surfaceGrantOf =
    g.SSH_CLIENT_UNREADABLE_STAND_IN =
    g.isPlainGitBranchName =
    g.SELF_HOSTED_CREDENTIAL_KINDS =
    g.isSelfHostedOnly =
    g.isSelfHostedExecutionConfigured =
    g.normalizeMcpUrl =
    g.normalizeMcpServerName =
    g.matchMcpServerIdentity =
    g.unlistedBuiltinWriteTools =
    g.builtinWriteToolCoverageGaps =
    g.vendorId =
    g.TOOL_POLICY_LABEL =
    g.resolvePluginMcpToolPolicy =
    g.resolvePluginMcpToolPoliciesByName =
    g.resolveMcpToolPolicies =
    g.resolveManagedToolPolicy =
    g.resolveEffectiveMcpToolPolicy =
    g.RemoteDirectMcpServerConfig =
    g.orgPluginSettingsToPolicyMap =
    g.orgPluginSettingsFromPolicyMap =
    g.firstDroppedOrgPluginTool =
    g.oidcEndpointSelectionUrls =
    g.resolveOidcEndpointSelection =
    g.oauthAsSelectionUrls =
    g.byoAsSelectionUrls =
    g.resolveByoAsSelection =
    g.MCP_TRANSPORT_POLICY_ONLY =
      undefined;
  g.providerCliFlagEnv =
    g.PROVIDER_SELECTOR_ENV_FLAGS =
    g.PROVIDER_CLI_FLAG =
    g.requiredProviderLeaves =
    g.fieldProviders =
    g.isBedrockFamily =
    g.parseForceLoginOrgUUIDs =
    g.resolveLegacyFlatKeys =
    g.legacyNameNotice =
    g.detectDeprecations =
    g.standInFailClosed =
    g.parseConfigRecord =
    g.resolveRedactPolicy =
    g.autoModeSurfaces =
    g.isSkillCreationEnabled =
    g.isMcpPersistentAlwaysAllowEnabled =
    g.websocketCspSource =
    g.dictationEndpoints =
    g.dictationCspSource =
    g.dictationBaseUrl =
    g.isCoworkSurfaceEnabled =
    g.isChatTabEnabled =
    g.isChatAdvancedFileAnalysisEnabled =
    g.resolveDisabledBuiltinTools =
    g.checkBuiltinToolPolicyForDrops =
    g.BUILTIN_ASK_POLICY_VALUES =
    g.toolsCoveredByScopedRule =
    g.scanRuleList =
    g.parseBuiltinRule =
    g.isScopedBuiltinRule =
    g.checkDisabledBuiltinToolsForDrops =
    g.canonicalBuiltinRule =
    g.builtinToolScope =
    g.builtinRuleToolName =
    g.BUILTIN_TOOL_NAMES =
    g.resolveBuiltinAskToolNames =
    g.resolveBuiltinAskTools =
    g.reducedSnapshot =
    g.redactedSnapshot =
    g.nonAnthropicModelText =
    g.materializeDefaults =
    g.keyedConfigurationWarnings =
    g.applyPlatformVariants =
    g.enforceConfigurationValues =
    g.configurationWarnings =
    g.isBelowMinDesktopVersion =
    g.presentCredentialKinds =
    g.kindIsPresent =
    g.deriveInferenceCredentialKind =
    g.CREDENTIAL_KINDS_FOR_PROVIDER =
      undefined;
  g.preserveUnreadNames =
    g.readHybridStoredConfig =
    g.evaluateInference =
    g.droppedKeyIssue =
    g.ABSENT_INFERENCE_REASONS =
    g.releasedHybridCredentialKinds =
    g.HYBRID_SERVABLE_PROVIDERS =
    g.HYBRID_SERVABLE_CREDENTIAL_KINDS =
    g.buildHybridServableSchema =
    g.refuseForHybrid =
    g.isDeclaredInGroupEntry =
    g.GroupSettings =
    g.GroupServableConfig =
    g.buildGroupServableSchema =
    g.InferenceConfig =
    g.HelperScriptCreds =
    g.gatewayIdpMovedKeyPairs =
    g.editorListsGatewayIdpNotices =
    g.RELAUNCH_ENFORCEMENT_DEFAULT_HOURS =
    g.CONFIG_RELAUNCH_IDLE_MINUTES =
    g.OTLP_CONTENT_CATEGORIES =
    g.GROUP_DESCRIPTIONS =
    g.flatKeysForExecutionTarget =
    g.activatesThirdPartyMode =
    g.appBehaviorMdmKeys =
    g.isFailClosedStandIn =
    g.unverifiedCacheValue =
    g.unverifiedCacheAdmits =
    g.appliesUnverifiedAsFailClosed =
    g.applyUnverifiedKeys =
    g.layHotAppliedKeys =
    g.changedKeysNeedingRestart =
    g.canonicalJson =
    g.keysWithRemotePolicy =
    g.isStaticTier3pKey =
    g.staticTierKeys =
    g.remotePolicyDefaults =
    g.nonBootstrapableKeys =
    g.isInferenceConnectionKey =
    g.isBootstrapableMeta =
    g.bootstrapableKeys =
    g.stripEmptyKeys =
    g.resolveClaudeAiImportArm =
    g.claudeAiImportWizardSources =
    g.claudeAiImportAdmits =
    g.redactSensitiveKeys =
    g.REDACTED =
    g.usageCostEstimateEnabled =
    g.MODEL_CATALOG_LOCATION_UNREADABLE_STAND_IN =
    g.effectiveModelPricing =
      undefined;
  g.toRenderableBannerConfig =
    g.resolveBannerConfig =
    g.isValidBannerLinkUrl =
    g.isValidBannerHexColor =
    g.BANNER_DEFAULT_TEXT_COLOR =
    g.BANNER_DEFAULT_BACKGROUND_COLOR =
    g.withoutInapplicable =
    g.targetCluster =
    g.subFieldsOf =
    g.setInferenceProvider =
    g.setInferenceCredentialKind =
    g.runsSessionsOffDevice =
    g.recordValueOptionsOf =
    g.optionValuesOf =
    g.objectColumnsOf =
    g.itemColumnsOf =
    g.isFormFieldVisible =
    g.isFieldRequired =
    g.getFormField =
    g.formFieldsForReader =
    g.FORM_FIELDS =
    g.FORM_FIELD_BY_ID =
    g.credentialKindsOffered =
    g.controlTypeOf =
    g.appliesUnder =
    g.normalizeVersionedConfig =
    g.CONFIG_DOCUMENT_META_NAMES =
    g.mergeTiers =
    g.materializeRaw =
    g.holdCluster =
    g.asksForThirdPartyMode =
    g.asksForExecutionTarget =
    g.unflattenInference =
    g.unflattenAll =
    g.flattenInference =
    g.flattenAll =
    g.CLUSTER_REGISTRY =
    g.pruneSchema =
    g.reportUnread =
    g.reportableName =
    g.NOT_RECOGNIZED =
    g.NOT_ACCEPTED =
    g.gatewayServableKeys =
    g.gatewayRefusedPathPrefixes =
    g.gatewayOverlayDropChecks =
    g.credentialHeaderEntry =
    g.withoutNulledNames =
    g.withoutNames =
    g.withoutFormerNames =
    g.STORED_HEADER_VALUE_PLACEHOLDER =
      undefined;
  g.activeBootstrapOrigin =
    g.urlString =
    g.intakeReportKeepsValue =
    g.subfield =
    g.shortDescription =
    g.SHORT_DESCRIPTION_MAX_LENGTH =
    g.runtimeDefault =
    g.remotePolicyOf =
    g.redactPolicyOf =
    g.redact =
    g.readersOf =
    g.readersDeclared =
    g.presetForItem =
    g.pathKindOf =
    g.nestedColumnsOf =
    g.maxLengthOf =
    g.longDescription =
    g.LONG_DESCRIPTION_MAX_LENGTH =
    g.isUrlString =
    g.isUnreleasedMember =
    g.isRemoteOnly =
    g.isReleasedFor3p =
    g.isReadBy =
    g.isHybridLoopback =
    g.isHybridExcluded =
    g.isHybridDerived =
    g.globPattern =
    g.folderPath =
    g.filePath =
    g.fieldMetaForNode =
    g.field =
    g.effectiveVisibility =
    g.displayDefault =
    g.discriminatorKeyOf =
    g.discriminatorArmsOf =
    g.READER_FACTS =
    g.CONFIG_READERS =
    g.annotationsOf =
    g.annotate =
    g.acceptsWildcard =
    g.stripHiddenSubFields =
    g.missingSubFields =
    g.isEmptyValue =
    g.isEmptySubValue =
    g.isEmptyRowValue =
    g.CONFIGURATION_CATEGORIES =
    g.docsTableRows =
    g.configReferenceUrl =
    g.CONFIG_REFERENCE_URL =
    g.anchorSlug =
      undefined;
  g.setDeprecationClock =
    g.nextDeprecationPhaseChange =
    g.isDeprecationHonoured =
    g.formatDeprecationDate =
    g.describeDeprecation =
    g.deprecationPhase =
    g.deprecationInstant =
    g.deprecationHit =
    g.deprecationApplies =
    g.DEPRECATION_FINAL_NOTICE_MS =
    g.BATCH_2026_09 =
    g.applyLegacy =
    g.toolPolicyKeyGlobMatch =
    g.TOOL_POLICY_VALUES =
    g.TOOL_POLICY_EDITOR_VALUES =
    g.strictestToolPolicy =
    g.pluginMcpRulePrefix =
    g.managedToolPatternMatches =
    g.lookupMcpToolPolicy =
    g.isApprovalRequiredToolPolicy =
    g.SIGN_IN_CREDENTIAL_KINDS =
    g.PROVIDERS =
    g.PROVIDER_DISPLAY =
    g.KIND_PRECEDENCE =
    g.isAnthropicOAuthToken =
    g.INFERENCE_CREDENTIAL_KINDS =
    g.getProviderLabel =
    g.DEFAULT_INFERENCE_PROVIDER =
    g.resolveEndpoints =
    g.subprocessHostsForServices =
    g.rendererEgressRules =
    g.hostsForService =
    g.enabledServicesFromConfig =
    g.egressServiceKeys =
    g.EGRESS_SERVICES =
    g.egressRequirementLabel =
    g.computeEgressRequirements =
    g.providerHasDiscovery =
    g.MODELS_GROUP =
    g.HELPER_SCRIPT_GROUP =
    g.hasUserinfo =
    g.hasActiveBootstrap =
    g.CREDENTIALED_URL_MESSAGE =
      undefined;
  var hu = __();
  Object.defineProperty(g, "checkModel", {
    enumerable: true,
    get: function () {
      return hu.checkModel;
    },
  });
  Object.defineProperty(g, "containsAnthropicToken", {
    enumerable: true,
    get: function () {
      return hu.containsAnthropicToken;
    },
  });
  Object.defineProperty(g, "isDefinitelyNotAnthropicModel", {
    enumerable: true,
    get: function () {
      return hu.isDefinitelyNotAnthropicModel;
    },
  });
  Object.defineProperty(g, "isLikelyAnthropicModelId", {
    enumerable: true,
    get: function () {
      return hu.isLikelyAnthropicModelId;
    },
  });
  Object.defineProperty(g, "TIER_ALIASES", {
    enumerable: true,
    get: function () {
      return hu.TIER_ALIASES;
    },
  });
  Object.defineProperty(g, "verdictToFallbackReason", {
    enumerable: true,
    get: function () {
      return hu.verdictToFallbackReason;
    },
  });
  var E0 = Hu();
  Object.defineProperty(g, "ANTHROPIC_TIER_NAMES", {
    enumerable: true,
    get: function () {
      return E0.ANTHROPIC_TIER_NAMES;
    },
  });
  Object.defineProperty(g, "EFFORT_LEVELS", {
    enumerable: true,
    get: function () {
      return E0.EFFORT_LEVELS;
    },
  });
  Object.defineProperty(g, "TIER_DESCRIPTIONS", {
    enumerable: true,
    get: function () {
      return E0.TIER_DESCRIPTIONS;
    },
  });
  var qe = Ar();
  Object.defineProperty(g, "adaptPluginMcp", {
    enumerable: true,
    get: function () {
      return qe.adaptPluginMcp;
    },
  });
  Object.defineProperty(g, "foldMcpEntryLegacy", {
    enumerable: true,
    get: function () {
      return qe.foldMcpEntryLegacy;
    },
  });
  Object.defineProperty(g, "AZURE_CLOUD_HOSTS", {
    enumerable: true,
    get: function () {
      return qe.AZURE_CLOUD_HOSTS;
    },
  });
  Object.defineProperty(g, "BootstrapOidc", {
    enumerable: true,
    get: function () {
      return qe.BootstrapOidc;
    },
  });
  Object.defineProperty(g, "BootstrapFetchOidc", {
    enumerable: true,
    get: function () {
      return qe.BootstrapFetchOidc;
    },
  });
  Object.defineProperty(g, "GatewayOidc", {
    enumerable: true,
    get: function () {
      return qe.GatewayOidc;
    },
  });
  Object.defineProperty(g, "BUILTIN_DEFAULT_TOOL_POLICY", {
    enumerable: true,
    get: function () {
      return qe.BUILTIN_DEFAULT_TOOL_POLICY;
    },
  });
  Object.defineProperty(g, "BUILTIN_MCP_SERVERS", {
    enumerable: true,
    get: function () {
      return qe.BUILTIN_MCP_SERVERS;
    },
  });
  Object.defineProperty(g, "findWebSearchBuiltin", {
    enumerable: true,
    get: function () {
      return qe.findWebSearchBuiltin;
    },
  });
  Object.defineProperty(g, "hostsForBuiltinMcpEntry", {
    enumerable: true,
    get: function () {
      return qe.hostsForBuiltinMcpEntry;
    },
  });
  Object.defineProperty(g, "WEB_SEARCH_PROVIDERS", {
    enumerable: true,
    get: function () {
      return qe.WEB_SEARCH_PROVIDERS;
    },
  });
  Object.defineProperty(g, "WEB_SEARCH_PROVIDER_HOSTS", {
    enumerable: true,
    get: function () {
      return qe.WEB_SEARCH_PROVIDER_HOSTS;
    },
  });
  Object.defineProperty(g, "CALLBACK_HOST_OPTIONS", {
    enumerable: true,
    get: function () {
      return qe.CALLBACK_HOST_OPTIONS;
    },
  });
  Object.defineProperty(g, "relevantMcpEntryIssues", {
    enumerable: true,
    get: function () {
      return qe.relevantMcpEntryIssues;
    },
  });
  Object.defineProperty(g, "configuredHostPath", {
    enumerable: true,
    get: function () {
      return qe.configuredHostPath;
    },
  });
  Object.defineProperty(g, "connectableMcpServers", {
    enumerable: true,
    get: function () {
      return qe.connectableMcpServers;
    },
  });
  Object.defineProperty(g, "DirectMcpServerConfig", {
    enumerable: true,
    get: function () {
      return qe.DirectMcpServerConfig;
    },
  });
  Object.defineProperty(g, "hasOAuthConfig", {
    enumerable: true,
    get: function () {
      return qe.hasOAuthConfig;
    },
  });
  Object.defineProperty(g, "httpsUrl", {
    enumerable: true,
    get: function () {
      return qe.httpsUrl;
    },
  });
  Object.defineProperty(g, "wantsOAuthProvider", {
    enumerable: true,
    get: function () {
      return qe.wantsOAuthProvider;
    },
  });
  Object.defineProperty(g, "isBuiltinMcpEntry", {
    enumerable: true,
    get: function () {
      return qe.isBuiltinMcpEntry;
    },
  });
  Object.defineProperty(g, "isBuiltinMcpItem", {
    enumerable: true,
    get: function () {
      return qe.isBuiltinMcpItem;
    },
  });
  Object.defineProperty(g, "isConnectableMcpEntry", {
    enumerable: true,
    get: function () {
      return qe.isConnectableMcpEntry;
    },
  });
  Object.defineProperty(g, "isOrgPluginSettingsParseFailed", {
    enumerable: true,
    get: function () {
      return qe.isOrgPluginSettingsParseFailed;
    },
  });
  Object.defineProperty(g, "isPluginMcpToolPolicyUnreadable", {
    enumerable: true,
    get: function () {
      return qe.isPluginMcpToolPolicyUnreadable;
    },
  });
  Object.defineProperty(g, "hasNoHelperBreakoutChars", {
    enumerable: true,
    get: function () {
      return qe.hasNoHelperBreakoutChars;
    },
  });
  Object.defineProperty(g, "HELPER_ARG_UNSAFE_MESSAGE", {
    enumerable: true,
    get: function () {
      return qe.HELPER_ARG_UNSAFE_MESSAGE;
    },
  });
  Object.defineProperty(g, "isSafeMcpCommand", {
    enumerable: true,
    get: function () {
      return qe.isSafeMcpCommand;
    },
  });
  Object.defineProperty(g, "isLinkLocalOrMetadataHost", {
    enumerable: true,
    get: function () {
      return qe.isLinkLocalOrMetadataHost;
    },
  });
  Object.defineProperty(g, "CLOUD_METADATA_HOST_NAMES", {
    enumerable: true,
    get: function () {
      return qe.CLOUD_METADATA_HOST_NAMES;
    },
  });
  Object.defineProperty(g, "CLOUD_METADATA_HOSTS", {
    enumerable: true,
    get: function () {
      return qe.CLOUD_METADATA_HOSTS;
    },
  });
  Object.defineProperty(g, "CLOUD_METADATA_IPV4", {
    enumerable: true,
    get: function () {
      return qe.CLOUD_METADATA_IPV4;
    },
  });
  Object.defineProperty(g, "CLOUD_METADATA_IPV6", {
    enumerable: true,
    get: function () {
      return qe.CLOUD_METADATA_IPV6;
    },
  });
  Object.defineProperty(g, "isLoopbackHost", {
    enumerable: true,
    get: function () {
      return qe.isLoopbackHost;
    },
  });
  Object.defineProperty(g, "LOOPBACK_HOSTS", {
    enumerable: true,
    get: function () {
      return qe.LOOPBACK_HOSTS;
    },
  });
  Object.defineProperty(g, "M365_ADMIN_CONSENT_SCOPES", {
    enumerable: true,
    get: function () {
      return qe.M365_ADMIN_CONSENT_SCOPES;
    },
  });
  Object.defineProperty(g, "M365_ALWAYS_REQUESTED_SCOPES", {
    enumerable: true,
    get: function () {
      return qe.M365_ALWAYS_REQUESTED_SCOPES;
    },
  });
  Object.defineProperty(g, "M365_DEFAULT_DELEGATED_SCOPES", {
    enumerable: true,
    get: function () {
      return qe.M365_DEFAULT_DELEGATED_SCOPES;
    },
  });
  Object.defineProperty(g, "M365_GRANTABLE_DELEGATED_SCOPES", {
    enumerable: true,
    get: function () {
      return qe.M365_GRANTABLE_DELEGATED_SCOPES;
    },
  });
  Object.defineProperty(g, "M365_WRITE_DELEGATED_SCOPES", {
    enumerable: true,
    get: function () {
      return qe.M365_WRITE_DELEGATED_SCOPES;
    },
  });
  Object.defineProperty(g, "ManagedMcpServers", {
    enumerable: true,
    get: function () {
      return qe.ManagedMcpServers;
    },
  });
  Object.defineProperty(g, "MCP_TRANSPORT_POLICY_ONLY", {
    enumerable: true,
    get: function () {
      return qe.MCP_TRANSPORT_POLICY_ONLY;
    },
  });
  Object.defineProperty(g, "resolveByoAsSelection", {
    enumerable: true,
    get: function () {
      return qe.resolveByoAsSelection;
    },
  });
  Object.defineProperty(g, "byoAsSelectionUrls", {
    enumerable: true,
    get: function () {
      return qe.byoAsSelectionUrls;
    },
  });
  Object.defineProperty(g, "oauthAsSelectionUrls", {
    enumerable: true,
    get: function () {
      return qe.oauthAsSelectionUrls;
    },
  });
  Object.defineProperty(g, "resolveOidcEndpointSelection", {
    enumerable: true,
    get: function () {
      return qe.resolveOidcEndpointSelection;
    },
  });
  Object.defineProperty(g, "oidcEndpointSelectionUrls", {
    enumerable: true,
    get: function () {
      return qe.oidcEndpointSelectionUrls;
    },
  });
  Object.defineProperty(g, "firstDroppedOrgPluginTool", {
    enumerable: true,
    get: function () {
      return qe.firstDroppedOrgPluginTool;
    },
  });
  Object.defineProperty(g, "orgPluginSettingsFromPolicyMap", {
    enumerable: true,
    get: function () {
      return qe.orgPluginSettingsFromPolicyMap;
    },
  });
  Object.defineProperty(g, "orgPluginSettingsToPolicyMap", {
    enumerable: true,
    get: function () {
      return qe.orgPluginSettingsToPolicyMap;
    },
  });
  Object.defineProperty(g, "RemoteDirectMcpServerConfig", {
    enumerable: true,
    get: function () {
      return qe.RemoteDirectMcpServerConfig;
    },
  });
  Object.defineProperty(g, "resolveEffectiveMcpToolPolicy", {
    enumerable: true,
    get: function () {
      return qe.resolveEffectiveMcpToolPolicy;
    },
  });
  Object.defineProperty(g, "resolveManagedToolPolicy", {
    enumerable: true,
    get: function () {
      return qe.resolveManagedToolPolicy;
    },
  });
  Object.defineProperty(g, "resolveMcpToolPolicies", {
    enumerable: true,
    get: function () {
      return qe.resolveMcpToolPolicies;
    },
  });
  Object.defineProperty(g, "resolvePluginMcpToolPoliciesByName", {
    enumerable: true,
    get: function () {
      return qe.resolvePluginMcpToolPoliciesByName;
    },
  });
  Object.defineProperty(g, "resolvePluginMcpToolPolicy", {
    enumerable: true,
    get: function () {
      return qe.resolvePluginMcpToolPolicy;
    },
  });
  Object.defineProperty(g, "TOOL_POLICY_LABEL", {
    enumerable: true,
    get: function () {
      return qe.TOOL_POLICY_LABEL;
    },
  });
  Object.defineProperty(g, "vendorId", {
    enumerable: true,
    get: function () {
      return qe.vendorId;
    },
  });
  Object.defineProperty(g, "builtinWriteToolCoverageGaps", {
    enumerable: true,
    get: function () {
      return qe.builtinWriteToolCoverageGaps;
    },
  });
  Object.defineProperty(g, "unlistedBuiltinWriteTools", {
    enumerable: true,
    get: function () {
      return qe.unlistedBuiltinWriteTools;
    },
  });
  var P0 = zb();
  Object.defineProperty(g, "matchMcpServerIdentity", {
    enumerable: true,
    get: function () {
      return P0.matchMcpServerIdentity;
    },
  });
  Object.defineProperty(g, "normalizeMcpServerName", {
    enumerable: true,
    get: function () {
      return P0.normalizeMcpServerName;
    },
  });
  Object.defineProperty(g, "normalizeMcpUrl", {
    enumerable: true,
    get: function () {
      return P0.normalizeMcpUrl;
    },
  });
  var A0 = _m();
  Object.defineProperty(g, "isSelfHostedExecutionConfigured", {
    enumerable: true,
    get: function () {
      return A0.isSelfHostedExecutionConfigured;
    },
  });
  Object.defineProperty(g, "isSelfHostedOnly", {
    enumerable: true,
    get: function () {
      return A0.isSelfHostedOnly;
    },
  });
  Object.defineProperty(g, "SELF_HOSTED_CREDENTIAL_KINDS", {
    enumerable: true,
    get: function () {
      return A0.SELF_HOSTED_CREDENTIAL_KINDS;
    },
  });
  var Lg = Cc();
  Object.defineProperty(g, "isPlainGitBranchName", {
    enumerable: true,
    get: function () {
      return Lg.isPlainGitBranchName;
    },
  });
  Object.defineProperty(g, "SSH_CLIENT_UNREADABLE_STAND_IN", {
    enumerable: true,
    get: function () {
      return Lg.SSH_CLIENT_UNREADABLE_STAND_IN;
    },
  });
  Object.defineProperty(g, "surfaceGrantOf", {
    enumerable: true,
    get: function () {
      return Lg.surfaceGrantOf;
    },
  });
  Object.defineProperty(g, "surfaceOptionLock", {
    enumerable: true,
    get: function () {
      return Lg.surfaceOptionLock;
    },
  });
  var oe = ni();
  Object.defineProperty(g, "AllowedPluginMarketplace", {
    enumerable: true,
    get: function () {
      return oe.AllowedPluginMarketplace;
    },
  });
  Object.defineProperty(g, "MARKETPLACE_CREDENTIAL_KINDS", {
    enumerable: true,
    get: function () {
      return oe.MARKETPLACE_CREDENTIAL_KINDS;
    },
  });
  Object.defineProperty(g, "MARKETPLACE_INSTALL_PREFS", {
    enumerable: true,
    get: function () {
      return oe.MARKETPLACE_INSTALL_PREFS;
    },
  });
  Object.defineProperty(g, "assignParsedKey", {
    enumerable: true,
    get: function () {
      return oe.assignParsedKey;
    },
  });
  Object.defineProperty(g, "BannerConfig", {
    enumerable: true,
    get: function () {
      return oe.BannerConfig;
    },
  });
  Object.defineProperty(g, "FlatManagedConfig", {
    enumerable: true,
    get: function () {
      return oe.FlatManagedConfig;
    },
  });
  Object.defineProperty(g, "flatConfigKeys", {
    enumerable: true,
    get: function () {
      return oe.flatConfigKeys;
    },
  });
  Object.defineProperty(g, "FLAT_KEY_TO_NESTED_PATH", {
    enumerable: true,
    get: function () {
      return oe.FLAT_KEY_TO_NESTED_PATH;
    },
  });
  Object.defineProperty(g, "RETIRED_FLAT_KEYS", {
    enumerable: true,
    get: function () {
      return oe.RETIRED_FLAT_KEYS;
    },
  });
  Object.defineProperty(g, "retiredFlatKeyEffect", {
    enumerable: true,
    get: function () {
      return oe.retiredFlatKeyEffect;
    },
  });
  Object.defineProperty(g, "ManagedConfig", {
    enumerable: true,
    get: function () {
      return oe.ManagedConfig;
    },
  });
  Object.defineProperty(g, "enabledScopes", {
    enumerable: true,
    get: function () {
      return oe.enabledScopes;
    },
  });
  Object.defineProperty(g, "deprecatedScopes", {
    enumerable: true,
    get: function () {
      return oe.deprecatedScopes;
    },
  });
  Object.defineProperty(g, "getFieldMeta", {
    enumerable: true,
    get: function () {
      return oe.getFieldMeta;
    },
  });
  Object.defineProperty(g, "tryGetFieldMeta", {
    enumerable: true,
    get: function () {
      return oe.tryGetFieldMeta;
    },
  });
  Object.defineProperty(g, "keepsAuthoredEmptyList", {
    enumerable: true,
    get: function () {
      return oe.keepsAuthoredEmptyList;
    },
  });
  Object.defineProperty(g, "isRedactedInExports", {
    enumerable: true,
    get: function () {
      return oe.isRedactedInExports;
    },
  });
  Object.defineProperty(g, "isSensitiveDropped", {
    enumerable: true,
    get: function () {
      return oe.isSensitiveDropped;
    },
  });
  Object.defineProperty(g, "CREDENTIAL_SPEC", {
    enumerable: true,
    get: function () {
      return oe.CREDENTIAL_SPEC;
    },
  });
  Object.defineProperty(g, "credentialSpecCell", {
    enumerable: true,
    get: function () {
      return oe.credentialSpecCell;
    },
  });
  Object.defineProperty(g, "kindSupportsDiscovery", {
    enumerable: true,
    get: function () {
      return oe.kindSupportsDiscovery;
    },
  });
  Object.defineProperty(g, "CREDENTIAL_KINDS_FOR_PROVIDER", {
    enumerable: true,
    get: function () {
      return oe.CREDENTIAL_KINDS_FOR_PROVIDER;
    },
  });
  Object.defineProperty(g, "deriveInferenceCredentialKind", {
    enumerable: true,
    get: function () {
      return oe.deriveInferenceCredentialKind;
    },
  });
  Object.defineProperty(g, "kindIsPresent", {
    enumerable: true,
    get: function () {
      return oe.kindIsPresent;
    },
  });
  Object.defineProperty(g, "presentCredentialKinds", {
    enumerable: true,
    get: function () {
      return oe.presentCredentialKinds;
    },
  });
  Object.defineProperty(g, "isBelowMinDesktopVersion", {
    enumerable: true,
    get: function () {
      return oe.isBelowMinDesktopVersion;
    },
  });
  Object.defineProperty(g, "configurationWarnings", {
    enumerable: true,
    get: function () {
      return oe.configurationWarnings;
    },
  });
  Object.defineProperty(g, "enforceConfigurationValues", {
    enumerable: true,
    get: function () {
      return oe.enforceConfigurationValues;
    },
  });
  Object.defineProperty(g, "applyPlatformVariants", {
    enumerable: true,
    get: function () {
      return oe.applyPlatformVariants;
    },
  });
  Object.defineProperty(g, "keyedConfigurationWarnings", {
    enumerable: true,
    get: function () {
      return oe.keyedConfigurationWarnings;
    },
  });
  Object.defineProperty(g, "materializeDefaults", {
    enumerable: true,
    get: function () {
      return oe.materializeDefaults;
    },
  });
  Object.defineProperty(g, "nonAnthropicModelText", {
    enumerable: true,
    get: function () {
      return oe.nonAnthropicModelText;
    },
  });
  Object.defineProperty(g, "redactedSnapshot", {
    enumerable: true,
    get: function () {
      return oe.redactedSnapshot;
    },
  });
  Object.defineProperty(g, "reducedSnapshot", {
    enumerable: true,
    get: function () {
      return oe.reducedSnapshot;
    },
  });
  Object.defineProperty(g, "resolveBuiltinAskTools", {
    enumerable: true,
    get: function () {
      return oe.resolveBuiltinAskTools;
    },
  });
  Object.defineProperty(g, "resolveBuiltinAskToolNames", {
    enumerable: true,
    get: function () {
      return oe.resolveBuiltinAskToolNames;
    },
  });
  Object.defineProperty(g, "BUILTIN_TOOL_NAMES", {
    enumerable: true,
    get: function () {
      return oe.BUILTIN_TOOL_NAMES;
    },
  });
  Object.defineProperty(g, "builtinRuleToolName", {
    enumerable: true,
    get: function () {
      return oe.builtinRuleToolName;
    },
  });
  Object.defineProperty(g, "builtinToolScope", {
    enumerable: true,
    get: function () {
      return oe.builtinToolScope;
    },
  });
  Object.defineProperty(g, "canonicalBuiltinRule", {
    enumerable: true,
    get: function () {
      return oe.canonicalBuiltinRule;
    },
  });
  Object.defineProperty(g, "checkDisabledBuiltinToolsForDrops", {
    enumerable: true,
    get: function () {
      return oe.checkDisabledBuiltinToolsForDrops;
    },
  });
  Object.defineProperty(g, "isScopedBuiltinRule", {
    enumerable: true,
    get: function () {
      return oe.isScopedBuiltinRule;
    },
  });
  Object.defineProperty(g, "parseBuiltinRule", {
    enumerable: true,
    get: function () {
      return oe.parseBuiltinRule;
    },
  });
  Object.defineProperty(g, "scanRuleList", {
    enumerable: true,
    get: function () {
      return oe.scanRuleList;
    },
  });
  Object.defineProperty(g, "toolsCoveredByScopedRule", {
    enumerable: true,
    get: function () {
      return oe.toolsCoveredByScopedRule;
    },
  });
  Object.defineProperty(g, "BUILTIN_ASK_POLICY_VALUES", {
    enumerable: true,
    get: function () {
      return oe.BUILTIN_ASK_POLICY_VALUES;
    },
  });
  Object.defineProperty(g, "checkBuiltinToolPolicyForDrops", {
    enumerable: true,
    get: function () {
      return oe.checkBuiltinToolPolicyForDrops;
    },
  });
  Object.defineProperty(g, "resolveDisabledBuiltinTools", {
    enumerable: true,
    get: function () {
      return oe.resolveDisabledBuiltinTools;
    },
  });
  Object.defineProperty(g, "isChatAdvancedFileAnalysisEnabled", {
    enumerable: true,
    get: function () {
      return oe.isChatAdvancedFileAnalysisEnabled;
    },
  });
  Object.defineProperty(g, "isChatTabEnabled", {
    enumerable: true,
    get: function () {
      return oe.isChatTabEnabled;
    },
  });
  Object.defineProperty(g, "isCoworkSurfaceEnabled", {
    enumerable: true,
    get: function () {
      return oe.isCoworkSurfaceEnabled;
    },
  });
  Object.defineProperty(g, "dictationBaseUrl", {
    enumerable: true,
    get: function () {
      return oe.dictationBaseUrl;
    },
  });
  Object.defineProperty(g, "dictationCspSource", {
    enumerable: true,
    get: function () {
      return oe.dictationCspSource;
    },
  });
  Object.defineProperty(g, "dictationEndpoints", {
    enumerable: true,
    get: function () {
      return oe.dictationEndpoints;
    },
  });
  Object.defineProperty(g, "websocketCspSource", {
    enumerable: true,
    get: function () {
      return oe.websocketCspSource;
    },
  });
  Object.defineProperty(g, "isMcpPersistentAlwaysAllowEnabled", {
    enumerable: true,
    get: function () {
      return oe.isMcpPersistentAlwaysAllowEnabled;
    },
  });
  Object.defineProperty(g, "isSkillCreationEnabled", {
    enumerable: true,
    get: function () {
      return oe.isSkillCreationEnabled;
    },
  });
  Object.defineProperty(g, "autoModeSurfaces", {
    enumerable: true,
    get: function () {
      return oe.autoModeSurfaces;
    },
  });
  Object.defineProperty(g, "resolveRedactPolicy", {
    enumerable: true,
    get: function () {
      return oe.resolveRedactPolicy;
    },
  });
  Object.defineProperty(g, "parseConfigRecord", {
    enumerable: true,
    get: function () {
      return oe.parseConfigRecord;
    },
  });
  Object.defineProperty(g, "standInFailClosed", {
    enumerable: true,
    get: function () {
      return oe.standInFailClosed;
    },
  });
  Object.defineProperty(g, "detectDeprecations", {
    enumerable: true,
    get: function () {
      return oe.detectDeprecations;
    },
  });
  Object.defineProperty(g, "legacyNameNotice", {
    enumerable: true,
    get: function () {
      return oe.legacyNameNotice;
    },
  });
  Object.defineProperty(g, "resolveLegacyFlatKeys", {
    enumerable: true,
    get: function () {
      return oe.resolveLegacyFlatKeys;
    },
  });
  Object.defineProperty(g, "parseForceLoginOrgUUIDs", {
    enumerable: true,
    get: function () {
      return oe.parseForceLoginOrgUUIDs;
    },
  });
  Object.defineProperty(g, "isBedrockFamily", {
    enumerable: true,
    get: function () {
      return oe.isBedrockFamily;
    },
  });
  Object.defineProperty(g, "fieldProviders", {
    enumerable: true,
    get: function () {
      return oe.fieldProviders;
    },
  });
  Object.defineProperty(g, "requiredProviderLeaves", {
    enumerable: true,
    get: function () {
      return oe.requiredProviderLeaves;
    },
  });
  Object.defineProperty(g, "PROVIDER_CLI_FLAG", {
    enumerable: true,
    get: function () {
      return oe.PROVIDER_CLI_FLAG;
    },
  });
  Object.defineProperty(g, "PROVIDER_SELECTOR_ENV_FLAGS", {
    enumerable: true,
    get: function () {
      return oe.PROVIDER_SELECTOR_ENV_FLAGS;
    },
  });
  Object.defineProperty(g, "providerCliFlagEnv", {
    enumerable: true,
    get: function () {
      return oe.providerCliFlagEnv;
    },
  });
  Object.defineProperty(g, "effectiveModelPricing", {
    enumerable: true,
    get: function () {
      return oe.effectiveModelPricing;
    },
  });
  Object.defineProperty(g, "MODEL_CATALOG_LOCATION_UNREADABLE_STAND_IN", {
    enumerable: true,
    get: function () {
      return oe.MODEL_CATALOG_LOCATION_UNREADABLE_STAND_IN;
    },
  });
  Object.defineProperty(g, "usageCostEstimateEnabled", {
    enumerable: true,
    get: function () {
      return oe.usageCostEstimateEnabled;
    },
  });
  Object.defineProperty(g, "REDACTED", {
    enumerable: true,
    get: function () {
      return oe.REDACTED;
    },
  });
  Object.defineProperty(g, "redactSensitiveKeys", {
    enumerable: true,
    get: function () {
      return oe.redactSensitiveKeys;
    },
  });
  Object.defineProperty(g, "claudeAiImportAdmits", {
    enumerable: true,
    get: function () {
      return oe.claudeAiImportAdmits;
    },
  });
  Object.defineProperty(g, "claudeAiImportWizardSources", {
    enumerable: true,
    get: function () {
      return oe.claudeAiImportWizardSources;
    },
  });
  Object.defineProperty(g, "resolveClaudeAiImportArm", {
    enumerable: true,
    get: function () {
      return oe.resolveClaudeAiImportArm;
    },
  });
  Object.defineProperty(g, "stripEmptyKeys", {
    enumerable: true,
    get: function () {
      return oe.stripEmptyKeys;
    },
  });
  Object.defineProperty(g, "bootstrapableKeys", {
    enumerable: true,
    get: function () {
      return oe.bootstrapableKeys;
    },
  });
  Object.defineProperty(g, "isBootstrapableMeta", {
    enumerable: true,
    get: function () {
      return oe.isBootstrapableMeta;
    },
  });
  Object.defineProperty(g, "isInferenceConnectionKey", {
    enumerable: true,
    get: function () {
      return oe.isInferenceConnectionKey;
    },
  });
  Object.defineProperty(g, "nonBootstrapableKeys", {
    enumerable: true,
    get: function () {
      return oe.nonBootstrapableKeys;
    },
  });
  Object.defineProperty(g, "remotePolicyDefaults", {
    enumerable: true,
    get: function () {
      return oe.remotePolicyDefaults;
    },
  });
  Object.defineProperty(g, "staticTierKeys", {
    enumerable: true,
    get: function () {
      return oe.staticTierKeys;
    },
  });
  Object.defineProperty(g, "isStaticTier3pKey", {
    enumerable: true,
    get: function () {
      return oe.isStaticTier3pKey;
    },
  });
  Object.defineProperty(g, "keysWithRemotePolicy", {
    enumerable: true,
    get: function () {
      return oe.keysWithRemotePolicy;
    },
  });
  Object.defineProperty(g, "canonicalJson", {
    enumerable: true,
    get: function () {
      return oe.canonicalJson;
    },
  });
  Object.defineProperty(g, "changedKeysNeedingRestart", {
    enumerable: true,
    get: function () {
      return oe.changedKeysNeedingRestart;
    },
  });
  Object.defineProperty(g, "layHotAppliedKeys", {
    enumerable: true,
    get: function () {
      return oe.layHotAppliedKeys;
    },
  });
  Object.defineProperty(g, "applyUnverifiedKeys", {
    enumerable: true,
    get: function () {
      return oe.applyUnverifiedKeys;
    },
  });
  Object.defineProperty(g, "appliesUnverifiedAsFailClosed", {
    enumerable: true,
    get: function () {
      return oe.appliesUnverifiedAsFailClosed;
    },
  });
  Object.defineProperty(g, "unverifiedCacheAdmits", {
    enumerable: true,
    get: function () {
      return oe.unverifiedCacheAdmits;
    },
  });
  Object.defineProperty(g, "unverifiedCacheValue", {
    enumerable: true,
    get: function () {
      return oe.unverifiedCacheValue;
    },
  });
  Object.defineProperty(g, "isFailClosedStandIn", {
    enumerable: true,
    get: function () {
      return oe.isFailClosedStandIn;
    },
  });
  Object.defineProperty(g, "appBehaviorMdmKeys", {
    enumerable: true,
    get: function () {
      return oe.appBehaviorMdmKeys;
    },
  });
  Object.defineProperty(g, "activatesThirdPartyMode", {
    enumerable: true,
    get: function () {
      return oe.activatesThirdPartyMode;
    },
  });
  Object.defineProperty(g, "flatKeysForExecutionTarget", {
    enumerable: true,
    get: function () {
      return oe.flatKeysForExecutionTarget;
    },
  });
  Object.defineProperty(g, "GROUP_DESCRIPTIONS", {
    enumerable: true,
    get: function () {
      return oe.GROUP_DESCRIPTIONS;
    },
  });
  Object.defineProperty(g, "OTLP_CONTENT_CATEGORIES", {
    enumerable: true,
    get: function () {
      return oe.OTLP_CONTENT_CATEGORIES;
    },
  });
  Object.defineProperty(g, "CONFIG_RELAUNCH_IDLE_MINUTES", {
    enumerable: true,
    get: function () {
      return oe.CONFIG_RELAUNCH_IDLE_MINUTES;
    },
  });
  Object.defineProperty(g, "RELAUNCH_ENFORCEMENT_DEFAULT_HOURS", {
    enumerable: true,
    get: function () {
      return oe.RELAUNCH_ENFORCEMENT_DEFAULT_HOURS;
    },
  });
  var Ng = Ir();
  Object.defineProperty(g, "editorListsGatewayIdpNotices", {
    enumerable: true,
    get: function () {
      return Ng.editorListsGatewayIdpNotices;
    },
  });
  Object.defineProperty(g, "gatewayIdpMovedKeyPairs", {
    enumerable: true,
    get: function () {
      return Ng.gatewayIdpMovedKeyPairs;
    },
  });
  Object.defineProperty(g, "HelperScriptCreds", {
    enumerable: true,
    get: function () {
      return Ng.HelperScriptCreds;
    },
  });
  Object.defineProperty(g, "InferenceConfig", {
    enumerable: true,
    get: function () {
      return Ng.InferenceConfig;
    },
  });
  var Ug = zw();
  Object.defineProperty(g, "buildGroupServableSchema", {
    enumerable: true,
    get: function () {
      return Ug.buildGroupServableSchema;
    },
  });
  Object.defineProperty(g, "GroupServableConfig", {
    enumerable: true,
    get: function () {
      return Ug.GroupServableConfig;
    },
  });
  Object.defineProperty(g, "GroupSettings", {
    enumerable: true,
    get: function () {
      return Ug.GroupSettings;
    },
  });
  Object.defineProperty(g, "isDeclaredInGroupEntry", {
    enumerable: true,
    get: function () {
      return Ug.isDeclaredInGroupEntry;
    },
  });
  var I_e = Wc();
  Object.defineProperty(g, "refuseForHybrid", {
    enumerable: true,
    get: function () {
      return I_e.refuseForHybrid;
    },
  });
  var zg = qw();
  Object.defineProperty(g, "buildHybridServableSchema", {
    enumerable: true,
    get: function () {
      return zg.buildHybridServableSchema;
    },
  });
  Object.defineProperty(g, "HYBRID_SERVABLE_CREDENTIAL_KINDS", {
    enumerable: true,
    get: function () {
      return zg.HYBRID_SERVABLE_CREDENTIAL_KINDS;
    },
  });
  Object.defineProperty(g, "HYBRID_SERVABLE_PROVIDERS", {
    enumerable: true,
    get: function () {
      return zg.HYBRID_SERVABLE_PROVIDERS;
    },
  });
  Object.defineProperty(g, "releasedHybridCredentialKinds", {
    enumerable: true,
    get: function () {
      return zg.releasedHybridCredentialKinds;
    },
  });
  var I0 = ug();
  Object.defineProperty(g, "ABSENT_INFERENCE_REASONS", {
    enumerable: true,
    get: function () {
      return I0.ABSENT_INFERENCE_REASONS;
    },
  });
  Object.defineProperty(g, "droppedKeyIssue", {
    enumerable: true,
    get: function () {
      return I0.droppedKeyIssue;
    },
  });
  Object.defineProperty(g, "evaluateInference", {
    enumerable: true,
    get: function () {
      return I0.evaluateInference;
    },
  });
  var C_e = JN();
  Object.defineProperty(g, "readHybridStoredConfig", {
    enumerable: true,
    get: function () {
      return C_e.readHybridStoredConfig;
    },
  });
  var jd = iU();
  Object.defineProperty(g, "preserveUnreadNames", {
    enumerable: true,
    get: function () {
      return jd.preserveUnreadNames;
    },
  });
  Object.defineProperty(g, "STORED_HEADER_VALUE_PLACEHOLDER", {
    enumerable: true,
    get: function () {
      return jd.STORED_HEADER_VALUE_PLACEHOLDER;
    },
  });
  Object.defineProperty(g, "withoutFormerNames", {
    enumerable: true,
    get: function () {
      return jd.withoutFormerNames;
    },
  });
  Object.defineProperty(g, "withoutNames", {
    enumerable: true,
    get: function () {
      return jd.withoutNames;
    },
  });
  Object.defineProperty(g, "withoutNulledNames", {
    enumerable: true,
    get: function () {
      return jd.withoutNulledNames;
    },
  });
  var T_e = Sc();
  Object.defineProperty(g, "credentialHeaderEntry", {
    enumerable: true,
    get: function () {
      return T_e.credentialHeaderEntry;
    },
  });
  var C0 = s0();
  Object.defineProperty(g, "gatewayOverlayDropChecks", {
    enumerable: true,
    get: function () {
      return C0.gatewayOverlayDropChecks;
    },
  });
  Object.defineProperty(g, "gatewayRefusedPathPrefixes", {
    enumerable: true,
    get: function () {
      return C0.gatewayRefusedPathPrefixes;
    },
  });
  Object.defineProperty(g, "gatewayServableKeys", {
    enumerable: true,
    get: function () {
      return C0.gatewayServableKeys;
    },
  });
  var Fg = Ns();
  Object.defineProperty(g, "NOT_ACCEPTED", {
    enumerable: true,
    get: function () {
      return Fg.NOT_ACCEPTED;
    },
  });
  Object.defineProperty(g, "NOT_RECOGNIZED", {
    enumerable: true,
    get: function () {
      return Fg.NOT_RECOGNIZED;
    },
  });
  Object.defineProperty(g, "reportableName", {
    enumerable: true,
    get: function () {
      return Fg.reportableName;
    },
  });
  Object.defineProperty(g, "reportUnread", {
    enumerable: true,
    get: function () {
      return Fg.reportUnread;
    },
  });
  var $_e = Pd();
  Object.defineProperty(g, "pruneSchema", {
    enumerable: true,
    get: function () {
      return $_e.pruneSchema;
    },
  });
  var xd = Fi();
  Object.defineProperty(g, "CLUSTER_REGISTRY", {
    enumerable: true,
    get: function () {
      return xd.CLUSTER_REGISTRY;
    },
  });
  Object.defineProperty(g, "flattenAll", {
    enumerable: true,
    get: function () {
      return xd.flattenAll;
    },
  });
  Object.defineProperty(g, "flattenInference", {
    enumerable: true,
    get: function () {
      return xd.flattenInference;
    },
  });
  Object.defineProperty(g, "unflattenAll", {
    enumerable: true,
    get: function () {
      return xd.unflattenAll;
    },
  });
  Object.defineProperty(g, "unflattenInference", {
    enumerable: true,
    get: function () {
      return xd.unflattenInference;
    },
  });
  var Ld = pU();
  Object.defineProperty(g, "asksForExecutionTarget", {
    enumerable: true,
    get: function () {
      return Ld.asksForExecutionTarget;
    },
  });
  Object.defineProperty(g, "asksForThirdPartyMode", {
    enumerable: true,
    get: function () {
      return Ld.asksForThirdPartyMode;
    },
  });
  Object.defineProperty(g, "holdCluster", {
    enumerable: true,
    get: function () {
      return Ld.holdCluster;
    },
  });
  Object.defineProperty(g, "materializeRaw", {
    enumerable: true,
    get: function () {
      return Ld.materializeRaw;
    },
  });
  Object.defineProperty(g, "mergeTiers", {
    enumerable: true,
    get: function () {
      return Ld.mergeTiers;
    },
  });
  var bz = Td();
  Object.defineProperty(g, "CONFIG_DOCUMENT_META_NAMES", {
    enumerable: true,
    get: function () {
      return bz.CONFIG_DOCUMENT_META_NAMES;
    },
  });
  Object.defineProperty(g, "normalizeVersionedConfig", {
    enumerable: true,
    get: function () {
      return bz.normalize;
    },
  });
  var qn = Dd();
  Object.defineProperty(g, "appliesUnder", {
    enumerable: true,
    get: function () {
      return qn.appliesUnder;
    },
  });
  Object.defineProperty(g, "controlTypeOf", {
    enumerable: true,
    get: function () {
      return qn.controlTypeOf;
    },
  });
  Object.defineProperty(g, "credentialKindsOffered", {
    enumerable: true,
    get: function () {
      return qn.credentialKindsOffered;
    },
  });
  Object.defineProperty(g, "FORM_FIELD_BY_ID", {
    enumerable: true,
    get: function () {
      return qn.FORM_FIELD_BY_ID;
    },
  });
  Object.defineProperty(g, "FORM_FIELDS", {
    enumerable: true,
    get: function () {
      return qn.FORM_FIELDS;
    },
  });
  Object.defineProperty(g, "formFieldsForReader", {
    enumerable: true,
    get: function () {
      return qn.formFieldsForReader;
    },
  });
  Object.defineProperty(g, "getFormField", {
    enumerable: true,
    get: function () {
      return qn.getFormField;
    },
  });
  Object.defineProperty(g, "isFieldRequired", {
    enumerable: true,
    get: function () {
      return qn.isFieldRequired;
    },
  });
  Object.defineProperty(g, "isFormFieldVisible", {
    enumerable: true,
    get: function () {
      return qn.isFormFieldVisible;
    },
  });
  Object.defineProperty(g, "itemColumnsOf", {
    enumerable: true,
    get: function () {
      return qn.itemColumnsOf;
    },
  });
  Object.defineProperty(g, "objectColumnsOf", {
    enumerable: true,
    get: function () {
      return qn.objectColumnsOf;
    },
  });
  Object.defineProperty(g, "optionValuesOf", {
    enumerable: true,
    get: function () {
      return qn.optionValuesOf;
    },
  });
  Object.defineProperty(g, "recordValueOptionsOf", {
    enumerable: true,
    get: function () {
      return qn.recordValueOptionsOf;
    },
  });
  Object.defineProperty(g, "runsSessionsOffDevice", {
    enumerable: true,
    get: function () {
      return qn.runsSessionsOffDevice;
    },
  });
  Object.defineProperty(g, "setInferenceCredentialKind", {
    enumerable: true,
    get: function () {
      return qn.setInferenceCredentialKind;
    },
  });
  Object.defineProperty(g, "setInferenceProvider", {
    enumerable: true,
    get: function () {
      return qn.setInferenceProvider;
    },
  });
  Object.defineProperty(g, "subFieldsOf", {
    enumerable: true,
    get: function () {
      return qn.subFieldsOf;
    },
  });
  Object.defineProperty(g, "targetCluster", {
    enumerable: true,
    get: function () {
      return qn.targetCluster;
    },
  });
  Object.defineProperty(g, "withoutInapplicable", {
    enumerable: true,
    get: function () {
      return qn.withoutInapplicable;
    },
  });
  var mu = jm();
  Object.defineProperty(g, "BANNER_DEFAULT_BACKGROUND_COLOR", {
    enumerable: true,
    get: function () {
      return mu.BANNER_DEFAULT_BACKGROUND_COLOR;
    },
  });
  Object.defineProperty(g, "BANNER_DEFAULT_TEXT_COLOR", {
    enumerable: true,
    get: function () {
      return mu.BANNER_DEFAULT_TEXT_COLOR;
    },
  });
  Object.defineProperty(g, "isValidBannerHexColor", {
    enumerable: true,
    get: function () {
      return mu.isValidBannerHexColor;
    },
  });
  Object.defineProperty(g, "isValidBannerLinkUrl", {
    enumerable: true,
    get: function () {
      return mu.isValidBannerLinkUrl;
    },
  });
  Object.defineProperty(g, "resolveBannerConfig", {
    enumerable: true,
    get: function () {
      return mu.resolveBannerConfig;
    },
  });
  Object.defineProperty(g, "toRenderableBannerConfig", {
    enumerable: true,
    get: function () {
      return mu.toRenderableBannerConfig;
    },
  });
  var Bg = oz();
  Object.defineProperty(g, "anchorSlug", {
    enumerable: true,
    get: function () {
      return Bg.anchorSlug;
    },
  });
  Object.defineProperty(g, "CONFIG_REFERENCE_URL", {
    enumerable: true,
    get: function () {
      return Bg.CONFIG_REFERENCE_URL;
    },
  });
  Object.defineProperty(g, "configReferenceUrl", {
    enumerable: true,
    get: function () {
      return Bg.configReferenceUrl;
    },
  });
  Object.defineProperty(g, "docsTableRows", {
    enumerable: true,
    get: function () {
      return Bg.docsTableRows;
    },
  });
  var gu = _g();
  Object.defineProperty(g, "CONFIGURATION_CATEGORIES", {
    enumerable: true,
    get: function () {
      return gu.CONFIGURATION_CATEGORIES;
    },
  });
  Object.defineProperty(g, "isEmptyRowValue", {
    enumerable: true,
    get: function () {
      return gu.isEmptyRowValue;
    },
  });
  Object.defineProperty(g, "isEmptySubValue", {
    enumerable: true,
    get: function () {
      return gu.isEmptySubValue;
    },
  });
  Object.defineProperty(g, "isEmptyValue", {
    enumerable: true,
    get: function () {
      return gu.isEmptyValue;
    },
  });
  Object.defineProperty(g, "missingSubFields", {
    enumerable: true,
    get: function () {
      return gu.missingSubFields;
    },
  });
  Object.defineProperty(g, "stripHiddenSubFields", {
    enumerable: true,
    get: function () {
      return gu.stripHiddenSubFields;
    },
  });
  var Et = yt();
  Object.defineProperty(g, "acceptsWildcard", {
    enumerable: true,
    get: function () {
      return Et.acceptsWildcard;
    },
  });
  Object.defineProperty(g, "annotate", {
    enumerable: true,
    get: function () {
      return Et.annotate;
    },
  });
  Object.defineProperty(g, "annotationsOf", {
    enumerable: true,
    get: function () {
      return Et.annotationsOf;
    },
  });
  Object.defineProperty(g, "CONFIG_READERS", {
    enumerable: true,
    get: function () {
      return Et.CONFIG_READERS;
    },
  });
  Object.defineProperty(g, "READER_FACTS", {
    enumerable: true,
    get: function () {
      return Et.READER_FACTS;
    },
  });
  Object.defineProperty(g, "discriminatorArmsOf", {
    enumerable: true,
    get: function () {
      return Et.discriminatorArmsOf;
    },
  });
  Object.defineProperty(g, "discriminatorKeyOf", {
    enumerable: true,
    get: function () {
      return Et.discriminatorKeyOf;
    },
  });
  Object.defineProperty(g, "displayDefault", {
    enumerable: true,
    get: function () {
      return Et.displayDefault;
    },
  });
  Object.defineProperty(g, "effectiveVisibility", {
    enumerable: true,
    get: function () {
      return Et.effectiveVisibility;
    },
  });
  Object.defineProperty(g, "field", {
    enumerable: true,
    get: function () {
      return Et.field;
    },
  });
  Object.defineProperty(g, "fieldMetaForNode", {
    enumerable: true,
    get: function () {
      return Et.fieldMetaForNode;
    },
  });
  Object.defineProperty(g, "filePath", {
    enumerable: true,
    get: function () {
      return Et.filePath;
    },
  });
  Object.defineProperty(g, "folderPath", {
    enumerable: true,
    get: function () {
      return Et.folderPath;
    },
  });
  Object.defineProperty(g, "globPattern", {
    enumerable: true,
    get: function () {
      return Et.globPattern;
    },
  });
  Object.defineProperty(g, "isHybridDerived", {
    enumerable: true,
    get: function () {
      return Et.isHybridDerived;
    },
  });
  Object.defineProperty(g, "isHybridExcluded", {
    enumerable: true,
    get: function () {
      return Et.isHybridExcluded;
    },
  });
  Object.defineProperty(g, "isHybridLoopback", {
    enumerable: true,
    get: function () {
      return Et.isHybridLoopback;
    },
  });
  Object.defineProperty(g, "isReadBy", {
    enumerable: true,
    get: function () {
      return Et.isReadBy;
    },
  });
  Object.defineProperty(g, "isReleasedFor3p", {
    enumerable: true,
    get: function () {
      return Et.isReleasedFor3p;
    },
  });
  Object.defineProperty(g, "isRemoteOnly", {
    enumerable: true,
    get: function () {
      return Et.isRemoteOnly;
    },
  });
  Object.defineProperty(g, "isUnreleasedMember", {
    enumerable: true,
    get: function () {
      return Et.isUnreleasedMember;
    },
  });
  Object.defineProperty(g, "isUrlString", {
    enumerable: true,
    get: function () {
      return Et.isUrlString;
    },
  });
  Object.defineProperty(g, "LONG_DESCRIPTION_MAX_LENGTH", {
    enumerable: true,
    get: function () {
      return Et.LONG_DESCRIPTION_MAX_LENGTH;
    },
  });
  Object.defineProperty(g, "longDescription", {
    enumerable: true,
    get: function () {
      return Et.longDescription;
    },
  });
  Object.defineProperty(g, "maxLengthOf", {
    enumerable: true,
    get: function () {
      return Et.maxLengthOf;
    },
  });
  Object.defineProperty(g, "nestedColumnsOf", {
    enumerable: true,
    get: function () {
      return Et.nestedColumnsOf;
    },
  });
  Object.defineProperty(g, "pathKindOf", {
    enumerable: true,
    get: function () {
      return Et.pathKindOf;
    },
  });
  Object.defineProperty(g, "presetForItem", {
    enumerable: true,
    get: function () {
      return Et.presetForItem;
    },
  });
  Object.defineProperty(g, "readersDeclared", {
    enumerable: true,
    get: function () {
      return Et.readersDeclared;
    },
  });
  Object.defineProperty(g, "readersOf", {
    enumerable: true,
    get: function () {
      return Et.readersOf;
    },
  });
  Object.defineProperty(g, "redact", {
    enumerable: true,
    get: function () {
      return Et.redact;
    },
  });
  Object.defineProperty(g, "redactPolicyOf", {
    enumerable: true,
    get: function () {
      return Et.redactPolicyOf;
    },
  });
  Object.defineProperty(g, "remotePolicyOf", {
    enumerable: true,
    get: function () {
      return Et.remotePolicyOf;
    },
  });
  Object.defineProperty(g, "runtimeDefault", {
    enumerable: true,
    get: function () {
      return Et.runtimeDefault;
    },
  });
  Object.defineProperty(g, "SHORT_DESCRIPTION_MAX_LENGTH", {
    enumerable: true,
    get: function () {
      return Et.SHORT_DESCRIPTION_MAX_LENGTH;
    },
  });
  Object.defineProperty(g, "shortDescription", {
    enumerable: true,
    get: function () {
      return Et.shortDescription;
    },
  });
  Object.defineProperty(g, "subfield", {
    enumerable: true,
    get: function () {
      return Et.subfield;
    },
  });
  Object.defineProperty(g, "intakeReportKeepsValue", {
    enumerable: true,
    get: function () {
      return Et.intakeReportKeepsValue;
    },
  });
  Object.defineProperty(g, "urlString", {
    enumerable: true,
    get: function () {
      return Et.urlString;
    },
  });
  var yu = $n();
  Object.defineProperty(g, "activeBootstrapOrigin", {
    enumerable: true,
    get: function () {
      return yu.activeBootstrapOrigin;
    },
  });
  Object.defineProperty(g, "CREDENTIALED_URL_MESSAGE", {
    enumerable: true,
    get: function () {
      return yu.CREDENTIALED_URL_MESSAGE;
    },
  });
  Object.defineProperty(g, "hasActiveBootstrap", {
    enumerable: true,
    get: function () {
      return yu.hasActiveBootstrap;
    },
  });
  Object.defineProperty(g, "hasUserinfo", {
    enumerable: true,
    get: function () {
      return yu.hasUserinfo;
    },
  });
  Object.defineProperty(g, "HELPER_SCRIPT_GROUP", {
    enumerable: true,
    get: function () {
      return yu.HELPER_SCRIPT_GROUP;
    },
  });
  Object.defineProperty(g, "MODELS_GROUP", {
    enumerable: true,
    get: function () {
      return yu.MODELS_GROUP;
    },
  });
  var R_e = Ir();
  Object.defineProperty(g, "providerHasDiscovery", {
    enumerable: true,
    get: function () {
      return R_e.providerHasDiscovery;
    },
  });
  var vz = yz();
  Object.defineProperty(g, "computeEgressRequirements", {
    enumerable: true,
    get: function () {
      return vz.computeEgressRequirements;
    },
  });
  Object.defineProperty(g, "egressRequirementLabel", {
    enumerable: true,
    get: function () {
      return vz.egressRequirementLabel;
    },
  });
  var gl = k0();
  Object.defineProperty(g, "EGRESS_SERVICES", {
    enumerable: true,
    get: function () {
      return gl.EGRESS_SERVICES;
    },
  });
  Object.defineProperty(g, "egressServiceKeys", {
    enumerable: true,
    get: function () {
      return gl.egressServiceKeys;
    },
  });
  Object.defineProperty(g, "enabledServicesFromConfig", {
    enumerable: true,
    get: function () {
      return gl.enabledServicesFromConfig;
    },
  });
  Object.defineProperty(g, "hostsForService", {
    enumerable: true,
    get: function () {
      return gl.hostsForService;
    },
  });
  Object.defineProperty(g, "rendererEgressRules", {
    enumerable: true,
    get: function () {
      return gl.rendererEgressRules;
    },
  });
  Object.defineProperty(g, "subprocessHostsForServices", {
    enumerable: true,
    get: function () {
      return gl.subprocessHostsForServices;
    },
  });
  Object.defineProperty(g, "resolveEndpoints", {
    enumerable: true,
    get: function () {
      return gl.resolveEndpoints;
    },
  });
  _z(gr(), g);
  _z(nw(), g);
  var xa = oa();
  Object.defineProperty(g, "DEFAULT_INFERENCE_PROVIDER", {
    enumerable: true,
    get: function () {
      return xa.DEFAULT_INFERENCE_PROVIDER;
    },
  });
  Object.defineProperty(g, "getProviderLabel", {
    enumerable: true,
    get: function () {
      return xa.getProviderLabel;
    },
  });
  Object.defineProperty(g, "INFERENCE_CREDENTIAL_KINDS", {
    enumerable: true,
    get: function () {
      return xa.INFERENCE_CREDENTIAL_KINDS;
    },
  });
  Object.defineProperty(g, "isAnthropicOAuthToken", {
    enumerable: true,
    get: function () {
      return xa.isAnthropicOAuthToken;
    },
  });
  Object.defineProperty(g, "KIND_PRECEDENCE", {
    enumerable: true,
    get: function () {
      return xa.KIND_PRECEDENCE;
    },
  });
  Object.defineProperty(g, "PROVIDER_DISPLAY", {
    enumerable: true,
    get: function () {
      return xa.PROVIDER_DISPLAY;
    },
  });
  Object.defineProperty(g, "PROVIDERS", {
    enumerable: true,
    get: function () {
      return xa.PROVIDERS;
    },
  });
  Object.defineProperty(g, "SIGN_IN_CREDENTIAL_KINDS", {
    enumerable: true,
    get: function () {
      return xa.SIGN_IN_CREDENTIAL_KINDS;
    },
  });
  var La = Jh();
  Object.defineProperty(g, "isApprovalRequiredToolPolicy", {
    enumerable: true,
    get: function () {
      return La.isApprovalRequiredToolPolicy;
    },
  });
  Object.defineProperty(g, "lookupMcpToolPolicy", {
    enumerable: true,
    get: function () {
      return La.lookupMcpToolPolicy;
    },
  });
  Object.defineProperty(g, "managedToolPatternMatches", {
    enumerable: true,
    get: function () {
      return La.managedToolPatternMatches;
    },
  });
  Object.defineProperty(g, "pluginMcpRulePrefix", {
    enumerable: true,
    get: function () {
      return La.pluginMcpRulePrefix;
    },
  });
  Object.defineProperty(g, "strictestToolPolicy", {
    enumerable: true,
    get: function () {
      return La.strictestToolPolicy;
    },
  });
  Object.defineProperty(g, "TOOL_POLICY_EDITOR_VALUES", {
    enumerable: true,
    get: function () {
      return La.TOOL_POLICY_EDITOR_VALUES;
    },
  });
  Object.defineProperty(g, "TOOL_POLICY_VALUES", {
    enumerable: true,
    get: function () {
      return La.TOOL_POLICY_VALUES;
    },
  });
  Object.defineProperty(g, "toolPolicyKeyGlobMatch", {
    enumerable: true,
    get: function () {
      return La.toolPolicyKeyGlobMatch;
    },
  });
  var Di = Xr();
  Object.defineProperty(g, "applyLegacy", {
    enumerable: true,
    get: function () {
      return Di.applyLegacy;
    },
  });
  Object.defineProperty(g, "BATCH_2026_09", {
    enumerable: true,
    get: function () {
      return Di.BATCH_2026_09;
    },
  });
  Object.defineProperty(g, "DEPRECATION_FINAL_NOTICE_MS", {
    enumerable: true,
    get: function () {
      return Di.DEPRECATION_FINAL_NOTICE_MS;
    },
  });
  Object.defineProperty(g, "deprecationApplies", {
    enumerable: true,
    get: function () {
      return Di.deprecationApplies;
    },
  });
  Object.defineProperty(g, "deprecationHit", {
    enumerable: true,
    get: function () {
      return Di.deprecationHit;
    },
  });
  Object.defineProperty(g, "deprecationInstant", {
    enumerable: true,
    get: function () {
      return Di.deprecationInstant;
    },
  });
  Object.defineProperty(g, "deprecationPhase", {
    enumerable: true,
    get: function () {
      return Di.deprecationPhase;
    },
  });
  Object.defineProperty(g, "describeDeprecation", {
    enumerable: true,
    get: function () {
      return Di.describeDeprecation;
    },
  });
  Object.defineProperty(g, "formatDeprecationDate", {
    enumerable: true,
    get: function () {
      return Di.formatDeprecationDate;
    },
  });
  Object.defineProperty(g, "isDeprecationHonoured", {
    enumerable: true,
    get: function () {
      return Di.isDeprecationHonoured;
    },
  });
  Object.defineProperty(g, "nextDeprecationPhaseChange", {
    enumerable: true,
    get: function () {
      return Di.nextDeprecationPhaseChange;
    },
  });
  Object.defineProperty(g, "setDeprecationClock", {
    enumerable: true,
    get: function () {
      return Di.setDeprecationClock;
    },
  });
});
//@ chunk-1ny7cxrt.js:1305489-1310061 cjs-unmatched+string-clue
var Ez = x(function (kz) {
  Object.defineProperty(kz, "__esModule", {
    value: true,
  });
  kz.findingBlocksServing = T0;
  kz.validateForGatewayServing = N_e;
  var Hg = jm();
  var Sz = pg();
  var Kg = Xr();
  var Mi = gs();
  var Vg = s0();
  var Zg = Rw();
  function T0(e) {
    if (e.kind === "drop-report") return e.dropKind !== "clamp";
    return e.kind !== "intake-warning" && e.kind !== "banner-text-unused" && e.kind !== "deprecated";
  }
  function D_e(e, t) {
    let n = Mi.retiredFlatKeyEffect(e);
    if (n !== undefined)
      return `this key has been retired \u2014 ${n}; current Claude Desktop releases ignore it, so remove it from the overlay`;
    let found = Mi.flatConfigKeys({
      includeInternal: true,
    }).find((r) => {
      var s;
      return ((s = Mi.getFieldMeta(r).legacyFlatKey) === null || s === undefined ? undefined : s.name) === e;
    });
    if (found !== undefined)
      return t.has(found)
        ? `deprecated name for ${found} \u2014 use ${found}`
        : `deprecated name for ${found}, which is not operator-settable here`;
    return "unknown desktop key \u2014 fix the typo, or upgrade the gateway if this key was added in a newer Claude Desktop release";
  }
  function M_e(e) {
    var t;
    var n;
    if (j_e().has(e))
      return "not deliverable via bootstrap \u2014 set it through MDM/local managed configuration instead";
    let o =
      (n = (t = Mi.FLAT_KEY_TO_NESTED_PATH.get(e)) === null || t === undefined ? undefined : t.join(".")) !==
        null && n !== undefined
        ? n
        : e;
    let found = x_e().find((s) => o === s || o.startsWith(`${s}.`));
    if (found !== undefined && (found === "otlp" || found.startsWith("otlp.")))
      return "set by the gateway \u2014 it relays OTLP itself; configure `telemetry.forward_to` instead";
    if (found !== undefined && (found.startsWith("inference") || found === "models.list"))
      return "set by the gateway from its own configuration \u2014 configure `upstreams:`/`models:` instead";
    return "not operator-settable through the gateway desktop: overlay";
  }
  var Nd;
  function j_e() {
    if (!(Nd !== null && Nd !== undefined))
      Nd = new Set(
        Mi.nonBootstrapableKeys({
          includeInternal: true,
        }),
      );
    return Nd;
  }
  var Ud;
  function x_e() {
    if (!(Ud !== null && Ud !== undefined)) Ud = Vg.gatewayRefusedPathPrefixes();
    return Ud;
  }
  var Oz = new Map();
  function L_e(e) {
    let t = Oz.get(e);
    if (t === undefined) {
      let n = Vg.gatewayServableKeys({
        includeInternal: e,
      });
      t = {
        list: n,
        set: new Set(n),
      };
      Oz.set(e, t);
    }
    return t;
  }
  function N_e(e, t = {}) {
    var n;
    var o;
    if (e === null || typeof e !== "object" || Array.isArray(e))
      return [
        {
          key: "",
          kind: "overlay-not-object",
          msg: "expected a mapping of desktop keys",
        },
      ];
    let r = (n = t.includeInternal) !== null && n !== undefined ? n : false;
    let { list, set: a } = L_e(r);
    let l = [];
    let c = () => l.some(T0);
    let u = {};
    for (let [key, value] of Object.entries(e)) {
      if (value === undefined) continue;
      if (a.has(key)) {
        if (value === null || value === "")
          l.push({
            key,
            kind: "explicit-empty",
            msg: `${key}: explicitly empty \u2014 set a value, or remove the key to use the Desktop default`,
          });
        else u[key] = value;
      } else if (Mi.tryGetFieldMeta(key) === undefined)
        l.push({
          key,
          kind: "unknown-key",
          msg: `${key}: ${D_e(key, a)}`,
        });
      else
        l.push({
          key,
          kind: "refused-key",
          msg: `${key}: ${M_e(key)}`,
        });
    }
    for (let y of Zg.detectDeprecations(u, {
      keys: list,
    }))
      l.push({
        key: y.key,
        kind: "deprecated",
        msg: y.path.startsWith(y.key) ? Kg.describeDeprecation(y) : `${y.key}: ${Kg.describeDeprecation(y)}`,
      });
    let f = (key) => (msg, w) => {
      l.push({
        key,
        kind: "drop-report",
        msg,
        dropKind: w !== null && w !== undefined ? w : "drop",
      });
    };
    let h = new Set();
    let configRecord = Zg.parseConfigRecord(u, {
      allowedKeys: list,
      onInvalid: (key, b, w) => {
        if (w === undefined) {
          h.add(key);
          l.push({
            key,
            kind: "parse-error",
            msg: b,
          });
        } else f(key)(b, w);
      },
    });
    for (let key of Object.keys(u)) {
      if (h.has(key)) continue;
      if (configRecord[key] === undefined && !l.some((b) => b.key === key && T0(b)))
        l.push({
          key,
          kind: "not-representable",
          msg: `${key}: value not representable \u2014 the desktop parser dropped it`,
        });
    }
    if (!c()) {
      let bootstrapConfig = Sz.parseBootstrapConfig(configRecord, t.trustedOrigin, undefined, {
        includeInternal: r,
      });
      for (let keyedParseError of bootstrapConfig.keyedParseErrors) {
        if (keyedParseError.kind === "deprecated") continue;
        l.push({
          key: keyedParseError.key,
          kind: "intake-rejection",
          msg: keyedParseError.msg,
        });
      }
      for (let msg of bootstrapConfig.warnings)
        l.push({
          key: "",
          kind: "intake-warning",
          msg,
        });
      if (!c()) {
        let config = bootstrapConfig.config;
        for (let key of Object.keys(configRecord))
          if (config[key] === undefined)
            l.push({
              key,
              kind: "intake-deletion",
              msg: `${key}: every desktop would silently discard this value (the intake deletes it) \u2014 fix the value or remove the key`,
            });
      }
      if (!c() && configRecord.banner !== undefined) {
        let bannerConfig = Hg.resolveBannerConfig(configRecord.banner);
        if (bannerConfig.renders === false && bannerConfig.reason === "invalid")
          l.push({
            key: "banner",
            kind: "banner-suppressed",
            msg: `banner: every desktop would suppress this banner (invalid ${(o = bannerConfig.field) !== null && o !== undefined ? o : "value"} \u2014 colors are six-digit hex; text has a hard length cap)`,
          });
        let linkUrl = configRecord.banner.linkUrl;
        let S = bannerConfig.renders === false && bannerConfig.reason === "disabled";
        if (!S && linkUrl !== undefined && !Hg.isValidBannerLinkUrl(linkUrl))
          l.push({
            key: "banner",
            kind: "banner-link-invalid",
            msg: "banner.linkUrl: every desktop would drop this link (must be an https URL)",
          });
        if (S && configRecord.banner.text !== undefined)
          l.push({
            key: "banner",
            kind: "banner-text-unused",
            msg: "banner.text is set but the banner is not enabled \u2014 it renders nowhere; set banner.enabled: true if it should show",
          });
      }
    }
    return l;
  }
});
//@ chunk-ha3km179.js:7722-8077 cjs-unmatched+string-clue
var Cl = x(function (RT, Tl) {
  var __dirname =
    "/home/runner/work/claude-cli-internal/claude-cli-internal/node_modules/@ant/computer-use-swift/js";
  var kl = importMetaRequire("path");
  throw Error("@ant/computer-use-swift is only available on macOS");
  var sf = importMetaRequire(
    process.env.COMPUTER_USE_SWIFT_NODE_PATH ?? kl.resolve(__dirname, "../prebuilds/computer_use.node"),
  );
  Tl.exports = sf.computerUse;
});
export { wz, pg, Ez };
