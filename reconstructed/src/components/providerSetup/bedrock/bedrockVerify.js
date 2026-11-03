/**
 * components/providerSetup/bedrock/bedrockVerify.ts
 *
 * 2.1.316 新增。Bedrock 访问验证与 AWS 错误描述。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sx9xc5ee.js (21)
 * attribution: placement 21
 */
import { homedir } from "os";
import { join } from "path";
import { readFile } from "fs/promises";
import { env } from "../../../utils/env.js";
import { getForwardableEnvHeaders } from "../../../services/api/requestHeaders.js";
import {
  clearAuthorizationHeaders,
  filteredCustomBetaHeaders,
  hasCustomApiKeyHeader,
  CLOUD_AUTH_SLOT,
} from "../../../services/api/customHeaders.js";
import {
  bedrockModelDefaults,
  bedrockVerificationSignal,
  BEDROCK_VERIFY_TIMEOUT_TEXT,
  verifyBedrockAccess,
} from "./BedrockSaveStep.js";
import { renderErrorSpecificGuidance } from "../../ResumeTask.js";
import { getAWSProxyRequestHandler, resolveStsEndpointForProxyUrl } from "../../../utils/proxy.js";
import { AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS } from "../../../utils/auth.js";
import { withTimeout } from "../../../utils/sleep.js";
import { getAwsChainResolveTimeoutMs } from "../../../utils/aws.js";
import { bedrockRegionGroup, findFirstMatch } from "../../../utils/model/bedrock.js";
import { MODEL_PIN_FAMILIES, ModelPinStep } from "../../ModelPinWizard.js";
import { TIER_LABELS } from "../../../utils/model/thirdPartyDefaultFallbacks.js";
import { plural } from "../../../utils/stringUtils.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../wizard/useWizard.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { init_react_production, y, fo, P } from "../../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { WizardDialogLayout } from "../../wizard/WizardDialogLayout.js";
import { WorkerBadge } from "../../permissions/WorkerBadge.js";
import { MethodStep } from "../../agents/new-agent-creation/wizard-steps/MethodStep.js";
import { StatusIcon } from "../../design-system/StatusIcon.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { ConfirmSelect } from "../../design-system/ConfirmSelect.js";

//@ chunk-sx9xc5ee.js:9902-10865 placement
async function testBedrockRequest(o) {
  let [{ AnthropicBedrock: d }, { getProxyFetchOptions: c }] = await Promise.all([
    import("./chunk-h87x8cg3.js"),
    import("./chunk-amdegp7s.js"),
  ]);
  let l = {
    awsRegion: o.region,
    maxRetries: 0,
    fetchOptions: c({
      url: env.ANTHROPIC_BEDROCK_BASE_URL || `https://bedrock-runtime.${o.region}.amazonaws.com`,
    }),
  };
  let t = await bedrockSigningCredentials(o);
  let forwardableEnvHeaders = getForwardableEnvHeaders();
  let g = {
    authToken: null,
    defaultHeaders: {
      ...forwardableEnvHeaders,
      ...clearAuthorizationHeaders(),
      ...filteredCustomBetaHeaders(),
      Authorization: null,
      ...(!hasCustomApiKeyHeader() && {
        "X-Api-Key": null,
      }),
    },
    ...CLOUD_AUTH_SLOT,
  };
  switch (t.kind) {
    case "bearer":
      return new d({
        ...l,
        apiKey: t.token,
        defaultHeaders: {
          ...forwardableEnvHeaders,
          ...clearAuthorizationHeaders(),
          ...filteredCustomBetaHeaders(),
          Authorization: `Bearer ${t.token}`,
          ...(!hasCustomApiKeyHeader() && {
            "X-Api-Key": null,
          }),
        },
      });
    case "sigv4":
      return new d({
        ...l,
        ...g,
        awsAccessKey: t.accessKeyId,
        awsSecretKey: t.secretAccessKey,
        awsSessionToken: t.sessionToken,
      });
    case "default": {
      let AWS_BEARER_TOKEN_BEDROCK = env.AWS_BEARER_TOKEN_BEDROCK;
      if (AWS_BEARER_TOKEN_BEDROCK)
        return new d({
          ...l,
          apiKey: AWS_BEARER_TOKEN_BEDROCK,
          defaultHeaders: {
            ...forwardableEnvHeaders,
            ...clearAuthorizationHeaders(),
            ...filteredCustomBetaHeaders(),
            Authorization: `Bearer ${AWS_BEARER_TOKEN_BEDROCK}`,
            ...(!hasCustomApiKeyHeader() && {
              "X-Api-Key": null,
            }),
          },
        });
      return new d({
        ...l,
        ...g,
        providerChainResolver: () => profileCredentialProvider(o, undefined),
      });
    }
  }
}
//@ chunk-sx9xc5ee.js:10865-11127 placement
async function bedrockSigningCredentials(o) {
  if (o.authMethod === "bearer")
    return {
      kind: "bearer",
      token: o.bearerToken,
    };
  let d = await bedrockCredentialProvider(o);
  if (!d)
    return {
      kind: "default",
    };
  let c = await d();
  return {
    kind: "sigv4",
    accessKeyId: c.accessKeyId,
    secretAccessKey: c.secretAccessKey,
    sessionToken: c.sessionToken,
  };
}
//@ chunk-sx9xc5ee.js:11127-11982 placement
async function bedrockApiKeyTestResult(o) {
  let fallback = bedrockModelDefaults(o.region).haiku.fallback;
  let c = await renderErrorSpecificGuidance(o, fallback);
  if (c.ok)
    return {
      status: "ok",
      identity: "Bedrock API key",
      profiles: [],
      note: `Test request to ${fallback} succeeded.`,
    };
  switch (c.reason) {
    case "auth":
      return {
        status: "error",
        error: "Invalid Bedrock API key. Check the key and try again.",
      };
    case "permission":
      return {
        status: "error",
        error:
          "API key was rejected. Your IAM policy may be missing bedrock:CallWithBearerToken or bedrock:InvokeModel.",
      };
    case "model":
      return {
        status: "ok",
        identity: "Bedrock API key",
        profiles: [],
        note: `The key works, but ${fallback} is not enabled in your account. Pin a model you have access to on the next step.`,
      };
    case "network":
      return {
        status: "error",
        error: `Could not reach Bedrock in region "${o.region}". Check the region name and your network.`,
      };
    case "other":
      return {
        status: "error",
        error: "The test request failed. Check the key and region.",
      };
  }
}
//@ chunk-sx9xc5ee.js:11982-12250 placement
/**
 * 按 Bedrock 设置向导选择的认证方式返回凭据提供函数：profile 走 AWS 节点凭据链（带代理与超时），accessKey 直接返回密钥，environment 返回 undefined（用默认链）。
 */
async function bedrockCredentialProvider(o) {
  switch (o.authMethod) {
    case "profile":
      return profileCredentialProvider(o, o.awsProfile);
    case "accessKey":
      return async () => ({
        accessKeyId: o.accessKeyId,
        secretAccessKey: o.secretAccessKey,
        ...(o.sessionToken && {
          sessionToken: o.sessionToken,
        }),
      });
    case "environment":
      return;
    default:
      return;
  }
}
//@ chunk-sx9xc5ee.js:12250-12608 placement
/**
 * 为指定 AWS profile 创建凭证提供者：动态加载 fromNodeProviderChain，配置经代理的 STS 请求处理器与超时，返回带解析超时的提供者函数。
 */
async function profileCredentialProvider(o, profile) {
  let [{ fromNodeProviderChain: c }, awsProxyRequestHandler] = await Promise.all([
    import("./chunk-thwbpw6e.js"),
    getAWSProxyRequestHandler({
      url: resolveStsEndpointForProxyUrl(String(o.region)),
      requestTimeoutMs: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
    }),
  ]);
  let requestHandler =
    awsProxyRequestHandler ??
    new bedrockVerificationSignal.FetchHttpHandler({
      requestTimeout: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
    });
  let m = c({
    profile,
    ignoreCache: true,
    parentClientConfig: {
      region: o.region,
      requestHandler,
    },
    clientConfig: {
      requestHandler,
    },
  });
  return (g) => withTimeout(m(g), getAwsChainResolveTimeoutMs(), BEDROCK_VERIFY_TIMEOUT_TEXT);
}
//@ chunk-sx9xc5ee.js:12608-12738 placement
/**
 * 判断 AWS 错误是否为超时（TimeoutError，或消息以 TimeoutError: 开头的凭证提供者错误）。
 */
function isAwsTimeoutError(o) {
  return (
    o?.name === "TimeoutError" ||
    (o?.name === "CredentialsProviderError" && (o.message ?? "").startsWith("TimeoutError:"))
  );
}
//@ chunk-sx9xc5ee.js:12738-14252 placement
function describeAwsError(error, d, awsChainResolveTimeoutMs) {
  let l = error;
  let t = l?.name ?? "Error";
  let m = l?.message ?? String(error);
  if (m === BEDROCK_VERIFY_TIMEOUT_TEXT)
    return {
      error: `Timed out after ${Math.ceil(awsChainResolveTimeoutMs / 1000)}s waiting for AWS. Check your network and proxy settings; if a credential helper needs longer to prompt you, raise CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS.`,
    };
  if (isAwsTimeoutError(l))
    return {
      error: "A request to AWS timed out. Check your network and proxy settings, then try again.",
    };
  let command = d.authMethod === "profile" ? `aws sso login --profile ${d.awsProfile}` : undefined;
  switch (t) {
    case "CredentialsProviderError":
      return d.authMethod === "profile"
        ? {
            error: `Could not load credentials for profile "${d.awsProfile}". If this is an SSO profile, run:`,
            command,
          }
        : {
            error: `No AWS credentials found. ${m}`,
          };
    case "ExpiredTokenException":
    case "TokenRefreshRequired":
      return d.authMethod === "profile"
        ? {
            error: "SSO session expired. Run:",
            command,
          }
        : {
            error: `Credentials expired. ${m}`,
          };
    case "ForbiddenException":
      return d.authMethod === "profile"
        ? {
            error: `SSO portal denied access to the role for profile "${d.awsProfile}". The permission set may have been revoked \u2014 check your AWS access portal.`,
          }
        : {
            error: `Forbidden. ${m}`,
          };
    case "AccessDeniedException":
      return {
        error: `Access denied. Your IAM role needs bedrock:ListInferenceProfiles permission. ${m}`,
      };
    case "UnrecognizedClientException":
    case "InvalidSignatureException":
      return {
        error: `Invalid credentials. ${m}`,
      };
    case "UnknownEndpoint":
    case "ENOTFOUND":
      return {
        error: `Cannot reach AWS in region "${d.region}". Check the region name and your network.`,
      };
    default:
      return {
        error: `${t}: ${m}`,
      };
  }
}
//@ chunk-sx9xc5ee.js:14252-14343 placement
function filterProfiles(o, d) {
  return (o.discoveredProfiles ?? []).filter((c) => c.toLowerCase().includes(d));
}
//@ chunk-sx9xc5ee.js:14343-15228 placement
var MODEL_CHECK_REASONS = {
  reasonLabel: {
    auth: "auth failed",
    permission: "no InvokeModel permission",
    model: "not enabled in this account",
    network: "unreachable",
    other: "request failed",
  },
  intro:
    "Without pinning, Claude Code uses its built-in defaults. When a new model ships, your install will try to call it even if your account has not yet enabled it \u2014 Claude Code will fail to connect to Bedrock until you enable the model or pin to one you have.",
  resolveTierDefaults: (o) => {
    let d = bedrockModelDefaults(o.region);
    let c = bedrockRegionGroup(o.region);
    return Object.fromEntries(
      MODEL_PIN_FAMILIES.map((l) => [
        l,
        {
          auto: findFirstMatch(o.discoveredProfiles ?? [], d[l].needle, c) ?? undefined,
          fallback: d[l].fallback,
        },
      ]),
    );
  },
  listTierCandidates: (o, d) => filterProfiles(d, o).sort().reverse(),
  pickerSubtitle: (o, d) => {
    let c = filterProfiles(d, o).length;
    return c > 0
      ? `${c} ${TIER_LABELS[o]} ${plural(c, "profile")} in your account \xB7 each tested with a one-token request.`
      : `No ${TIER_LABELS[o]} profiles found in your account.`;
  },
  probe: (o, d) => renderErrorSpecificGuidance(o, d),
};
//@ chunk-sx9xc5ee.js:15228-15360 placement
/**
 * Bedrock 向导中的模型检查步骤，检查结果写回向导数据。
 */
function BedrockModelCheckStep() {
  let $ = w(2);
  let { updateWizardData } = useWizard();
  let c;
  if ($[0] !== updateWizardData) {
    c = jsxProd_default(ModelPinStep, {
      provider: MODEL_CHECK_REASONS,
      onPins: updateWizardData,
    });
    $[0] = updateWizardData;
    $[1] = c;
  } else c = $[1];
  return c;
}
//@ chunk-sx9xc5ee.js:15360-15364 placement
init_react_production();
//@ chunk-sx9xc5ee.js:15463-15790 placement
/**
 * 列出本机 AWS profile：解析 ~/.aws/config 与 ~/.aws/credentials 的节名（忽略 sso-session），去重排序。
 */
async function listAwsProfiles() {
  let o = new Set();
  let d = homedir();
  for (let { path, re } of [
    {
      path: join(d, ".aws", "config"),
      re: /^\[(?:profile\s+)?([^\]]+)\]/gm,
    },
    {
      path: join(d, ".aws", "credentials"),
      re: /^\[([^\]]+)\]/gm,
    },
  ])
    try {
      for (let t of (await readFile(path, "utf8")).matchAll(re)) {
        let trimmed = t[1]?.trim();
        if (trimmed && !trimmed.startsWith("sso-session ")) o.add(trimmed);
      }
    } catch {}
  return [...o].sort();
}
//@ chunk-sx9xc5ee.js:15790-15813 placement
function emptyProfiles() {
  return [];
}
//@ chunk-sx9xc5ee.js:15813-15849 placement
function loadProfilesOrEmpty() {
  return listAwsProfiles().catch(emptyProfiles);
}
//@ chunk-sx9xc5ee.js:15849-15909 placement
function isBedrockRegion(Ko) {
  return Ko.toLowerCase().includes("bedrock");
}
//@ chunk-sx9xc5ee.js:15909-15951 placement
function toProfileOption(gr) {
  return {
    label: gr,
    value: gr,
  };
}
//@ chunk-sx9xc5ee.js:15951-15977 placement
var MANUAL_PROFILE_VALUE = "__manual__";
var MAX_PROFILE_OPTIONS = 12;
//@ chunk-sx9xc5ee.js:15977-16242 placement
/**
 * Bedrock 向导中的 AWS profile 步骤：读取 ~/.aws/config 期间显示等待，完成后进入认证方式选择。
 */
function BedrockProfileStep() {
  let $ = w(3);
  let [o] = y(loadProfilesOrEmpty);
  let fallback;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(WizardDialogLayout, {
      subtitle: "AWS profile",
      children: jsxProd_default(WorkerBadge, {
        message: "Reading ~/.aws/config\u2026",
      }),
    });
    $[0] = fallback;
  } else fallback = $[0];
  let l;
  if ($[1] !== o) {
    l = jsxProd_default(fo, {
      fallback,
      children: jsxProd_default(MethodStep, {
        profilesPromise: o,
      }),
    });
    $[1] = o;
    $[2] = l;
  } else l = $[2];
  return l;
}
//@ chunk-sx9xc5ee.js:19292-19296 placement
init_react_production();
//@ chunk-sx9xc5ee.js:20653-20657 placement
init_react_production();
//@ chunk-sx9xc5ee.js:20657-23427 placement
/**
 * Bedrock 配置向导的凭据验证步骤：调用 verifyBedrockAccess，显示进行中提示；成功时写入身份与发现的推理 profile 并显示结果，失败时给出错误与返回/重试选项。
 */
function BedrockVerifyStep() {
  let $ = w(39);
  let { goBack, goNext, updateWizardData, wizardData } = useWizard();
  let m;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    m = {
      phase: "checking",
    };
    $[0] = m;
  } else m = $[0];
  let [g, h] = y(m);
  let u;
  if ($[1] !== updateWizardData || $[2] !== wizardData) {
    u = () => {
      let B = false;
      verifyBedrockAccess(wizardData).then((p) => {
        if (B) {
          return;
        }
        if (p.status === "ok")
          updateWizardData({
            verifiedIdentity: p.identity,
            discoveredProfiles: p.profiles,
          });
        else
          updateWizardData({
            verifiedIdentity: undefined,
            discoveredProfiles: undefined,
          });
        h({
          phase: "done",
          result: p,
        });
      });
      return () => {
        B = true;
      };
    };
    $[1] = updateWizardData;
    $[2] = wizardData;
    $[3] = u;
  } else u = $[3];
  let A;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    A = [];
    $[4] = A;
  } else A = $[4];
  P(u, A);
  if (g.phase === "checking") {
    const message =
      wizardData.authMethod === "bearer"
        ? "Sending a test request to Bedrock\u2026"
        : "Calling AWS STS and Bedrock\u2026";
    let k;
    if ($[5] !== message) {
      k = jsxProd_default(WizardDialogLayout, {
        subtitle: "Verifying credentials",
        children: jsxProd_default(WorkerBadge, {
          message,
          subtitle: "This may take a few seconds.",
        }),
      });
      $[5] = message;
      $[6] = k;
    } else k = $[6];
    return k;
  }
  let { result: f } = g;
  switch (f.status) {
    case "ok": {
      let E;
      if ($[7] === MEMO_CACHE_SENTINEL) {
        E = jsxProd_default(StatusIcon, {
          status: "success",
          withSpace: true,
        });
        $[7] = E;
      } else E = $[7];
      let k;
      if ($[8] !== f.identity) {
        k = jsxProd_default_2(Text, {
          children: [
            E,
            "Authenticated as ",
            jsxProd_default(Text, {
              bold: true,
              children: f.identity,
            }),
          ],
        });
        $[8] = f.identity;
        $[9] = k;
      } else k = $[9];
      let children;
      if ($[10] !== f.note || $[11] !== f.profiles) {
        children =
          f.note ??
          (f.profiles.length > 0
            ? `Found ${f.profiles.length} Anthropic inference ${plural(f.profiles.length, "profile")} in this region.`
            : "No Anthropic inference profiles found in this region. You may still proceed \u2014 model defaults will use the built-in IDs.");
        $[10] = f.note;
        $[11] = f.profiles;
        $[12] = children;
      } else children = $[12];
      let v;
      if ($[13] !== children) {
        v = jsxProd_default(Text, {
          dimColor: true,
          children,
        });
        $[13] = children;
        $[14] = v;
      } else v = $[14];
      let options;
      if ($[15] === MEMO_CACHE_SENTINEL) {
        options = [
          {
            label: "Continue",
            value: "continue",
          },
        ];
        $[15] = options;
      } else options = $[15];
      let onChange;
      if ($[16] !== goNext) {
        onChange = () => goNext();
        $[16] = goNext;
        $[17] = onChange;
      } else onChange = $[17];
      let D;
      if ($[18] !== goBack || $[19] !== onChange) {
        D = jsxProd_default(ModelSelector, {
          options,
          onChange,
          onCancel: goBack,
        });
        $[18] = goBack;
        $[19] = onChange;
        $[20] = D;
      } else D = $[20];
      let W;
      if ($[21] !== k || $[22] !== v || $[23] !== D) {
        W = jsxProd_default(WizardDialogLayout, {
          subtitle: "Verification",
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [k, v, D],
          }),
        });
        $[21] = k;
        $[22] = v;
        $[23] = D;
        $[24] = W;
      } else W = $[24];
      return W;
    }
    case "error": {
      let E;
      if ($[25] === MEMO_CACHE_SENTINEL) {
        E = jsxProd_default(StatusIcon, {
          status: "error",
          withSpace: true,
        });
        $[25] = E;
      } else E = $[25];
      let k;
      if ($[26] !== f.error) {
        k = jsxProd_default_2(Text, {
          children: [E, f.error],
        });
        $[26] = f.error;
        $[27] = k;
      } else k = $[27];
      let C;
      if ($[28] !== f.command) {
        C =
          f.command &&
          jsxProd_default_2(Text, {
            bold: true,
            color: "suggestion",
            children: ["    ", f.command],
          });
        $[28] = f.command;
        $[29] = C;
      } else C = $[29];
      let v;
      if ($[30] !== k || $[31] !== C) {
        v = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [k, C],
        });
        $[30] = k;
        $[31] = C;
        $[32] = v;
      } else v = $[32];
      let T;
      if ($[33] !== goBack || $[34] !== goNext) {
        T = jsxProd_default(ConfirmSelect, {
          hideIndexes: true,
          cancelFirst: true,
          focus: "cancel",
          confirmLabel: "Save anyway (skip verification)",
          cancelLabel: "Go back and fix",
          onConfirm: goNext,
          onCancel: goBack,
        });
        $[33] = goBack;
        $[34] = goNext;
        $[35] = T;
      } else T = $[35];
      let _;
      if ($[36] !== v || $[37] !== T) {
        _ = jsxProd_default(WizardDialogLayout, {
          subtitle: "Verification failed",
          color: "error",
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [v, T],
          }),
        });
        $[36] = v;
        $[37] = T;
        $[38] = _;
      } else _ = $[38];
      return _;
    }
  }
}
export {
  testBedrockRequest,
  isAwsTimeoutError,
  bedrockApiKeyTestResult,
  bedrockCredentialProvider,
  describeAwsError,
  MAX_PROFILE_OPTIONS,
  isBedrockRegion,
  toProfileOption,
  MANUAL_PROFILE_VALUE,
  BedrockProfileStep,
  BedrockVerifyStep,
  BedrockModelCheckStep,
};
