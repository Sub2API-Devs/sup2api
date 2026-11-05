/**
 * components/providerSetup/bedrock/bedrockVerify.ts
 *
 * 2.1.316 新增。Bedrock 访问验证与 AWS 错误描述。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3msz77wt.js (21)
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
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../wizard/useWizard.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import {
  init_react_production,
  useState,
  suspenseTypeExport,
  useEffect,
} from "../../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { WizardDialogLayout } from "../../wizard/WizardDialogLayout.js";
import { WorkerBadge } from "../../permissions/WorkerBadge.js";
import { ToolsStep } from "../../agents/new-agent-creation/wizard-steps/ToolsStep.js";
import { StatusIcon } from "../../design-system/StatusIcon.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { ConfirmSelect } from "../../design-system/ConfirmSelect.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-3msz77wt.js:9902-10865 placement
async function testBedrockRequest(wizardData) {
  let [{ AnthropicBedrock }, { getProxyFetchOptions }] = await Promise.all([
    import("../../../../vendor/@anthropic-ai/bedrock-sdk/AnthropicBedrock.lazy.js"),
    import("../../../utils/proxy.js"),
  ]);
  let clientOptions = {
    awsRegion: wizardData.region,
    maxRetries: 0,
    fetchOptions: getProxyFetchOptions({
      url: env.ANTHROPIC_BEDROCK_BASE_URL || `https://bedrock-runtime.${wizardData.region}.amazonaws.com`,
    }),
  };
  let credentials = await bedrockSigningCredentials(wizardData);
  let forwardableEnvHeaders = getForwardableEnvHeaders();
  let credentialOverride = {
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
  switch (credentials.kind) {
    case "bearer":
      return new AnthropicBedrock({
        ...clientOptions,
        apiKey: credentials.token,
        defaultHeaders: {
          ...forwardableEnvHeaders,
          ...clearAuthorizationHeaders(),
          ...filteredCustomBetaHeaders(),
          Authorization: `Bearer ${credentials.token}`,
          ...(!hasCustomApiKeyHeader() && {
            "X-Api-Key": null,
          }),
        },
      });
    case "sigv4":
      return new AnthropicBedrock({
        ...clientOptions,
        ...credentialOverride,
        awsAccessKey: credentials.accessKeyId,
        awsSecretKey: credentials.secretAccessKey,
        awsSessionToken: credentials.sessionToken,
      });
    case "default": {
      let AWS_BEARER_TOKEN_BEDROCK = env.AWS_BEARER_TOKEN_BEDROCK;
      if (AWS_BEARER_TOKEN_BEDROCK)
        return new AnthropicBedrock({
          ...clientOptions,
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
      return new AnthropicBedrock({
        ...clientOptions,
        ...credentialOverride,
        providerChainResolver: () => profileCredentialProvider(wizardData, undefined),
      });
    }
  }
}
//@ chunk-3msz77wt.js:10865-11127 placement
async function bedrockSigningCredentials(wizardData) {
  if (wizardData.authMethod === "bearer")
    return {
      kind: "bearer",
      token: wizardData.bearerToken,
    };
  let provider = await bedrockCredentialProvider(wizardData);
  if (!provider)
    return {
      kind: "default",
    };
  let credentials = await provider();
  return {
    kind: "sigv4",
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };
}
//@ chunk-3msz77wt.js:11127-11982 placement
async function bedrockApiKeyTestResult(wizardData) {
  let fallback = bedrockModelDefaults(wizardData.region).haiku.fallback;
  let result = await renderErrorSpecificGuidance(wizardData, fallback);
  if (result.ok)
    return {
      status: "ok",
      identity: "Bedrock API key",
      profiles: [],
      note: `Test request to ${fallback} succeeded.`,
    };
  switch (result.reason) {
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
        error: `Could not reach Bedrock in region "${wizardData.region}". Check the region name and your network.`,
      };
    case "other":
      return {
        status: "error",
        error: "The test request failed. Check the key and region.",
      };
  }
}
//@ chunk-3msz77wt.js:11982-12250 placement
/**
 * 按 Bedrock 设置向导选择的认证方式返回凭据提供函数：profile 走 AWS 节点凭据链（带代理与超时），accessKey 直接返回密钥，environment 返回 undefined（用默认链）。
 */
async function bedrockCredentialProvider(wizardData) {
  switch (wizardData.authMethod) {
    case "profile":
      return profileCredentialProvider(wizardData, wizardData.awsProfile);
    case "accessKey":
      return async () => ({
        accessKeyId: wizardData.accessKeyId,
        secretAccessKey: wizardData.secretAccessKey,
        ...(wizardData.sessionToken && {
          sessionToken: wizardData.sessionToken,
        }),
      });
    case "environment":
      return;
    default:
      return;
  }
}
//@ chunk-3msz77wt.js:12250-12608 placement
/**
 * 为指定 AWS profile 创建凭证提供者：动态加载 fromNodeProviderChain，配置经代理的 STS 请求处理器与超时，返回带解析超时的提供者函数。
 */
async function profileCredentialProvider(wizardData, profile) {
  let [{ fromNodeProviderChain: fromProviderChain }, awsProxyRequestHandler] = await Promise.all([
    import("../../../../vendor/@aws-sdk/credential-providers/dist-cjs/createCredentialChain.lazy.js"),
    getAWSProxyRequestHandler({
      url: resolveStsEndpointForProxyUrl(String(wizardData.region)),
      requestTimeoutMs: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
    }),
  ]);
  let requestHandler =
    awsProxyRequestHandler ??
    new bedrockVerificationSignal.FetchHttpHandler({
      requestTimeout: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
    });
  let provider = fromProviderChain({
    profile,
    ignoreCache: true,
    parentClientConfig: {
      region: wizardData.region,
      requestHandler,
    },
    clientConfig: {
      requestHandler,
    },
  });
  return (credentials) =>
    withTimeout(provider(credentials), getAwsChainResolveTimeoutMs(), BEDROCK_VERIFY_TIMEOUT_TEXT);
}
//@ chunk-3msz77wt.js:12608-12738 placement
/**
 * 判断 AWS 错误是否为超时（TimeoutError，或消息以 TimeoutError: 开头的凭证提供者错误）。
 */
function isAwsTimeoutError(error) {
  return (
    error?.name === "TimeoutError" ||
    (error?.name === "CredentialsProviderError" && (error.message ?? "").startsWith("TimeoutError:"))
  );
}
//@ chunk-3msz77wt.js:12738-14252 placement
function describeAwsError(error, fallbackModel, awsChainResolveTimeoutMs) {
  let cause = error;
  let errorName = cause?.name ?? "Error";
  let message = cause?.message ?? String(error);
  if (message === BEDROCK_VERIFY_TIMEOUT_TEXT)
    return {
      error: `Timed out after ${Math.ceil(awsChainResolveTimeoutMs / 1000)}s waiting for AWS. Check your network and proxy settings; if a credential helper needs longer to prompt you, raise CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS.`,
    };
  if (isAwsTimeoutError(cause))
    return {
      error: "A request to AWS timed out. Check your network and proxy settings, then try again.",
    };
  let command =
    fallbackModel.authMethod === "profile"
      ? `aws sso login --profile ${fallbackModel.awsProfile}`
      : undefined;
  switch (errorName) {
    case "CredentialsProviderError":
      return fallbackModel.authMethod === "profile"
        ? {
            error: `Could not load credentials for profile "${fallbackModel.awsProfile}". If this is an SSO profile, run:`,
            command,
          }
        : {
            error: `No AWS credentials found. ${message}`,
          };
    case "ExpiredTokenException":
    case "TokenRefreshRequired":
      return fallbackModel.authMethod === "profile"
        ? {
            error: "SSO session expired. Run:",
            command,
          }
        : {
            error: `Credentials expired. ${message}`,
          };
    case "ForbiddenException":
      return fallbackModel.authMethod === "profile"
        ? {
            error: `SSO portal denied access to the role for profile "${fallbackModel.awsProfile}". The permission set may have been revoked \u2014 check your AWS access portal.`,
          }
        : {
            error: `Forbidden. ${message}`,
          };
    case "AccessDeniedException":
      return {
        error: `Access denied. Your IAM role needs bedrock:ListInferenceProfiles permission. ${message}`,
      };
    case "UnrecognizedClientException":
    case "InvalidSignatureException":
      return {
        error: `Invalid credentials. ${message}`,
      };
    case "UnknownEndpoint":
    case "ENOTFOUND":
      return {
        error: `Cannot reach AWS in region "${fallbackModel.region}". Check the region name and your network.`,
      };
    default:
      return {
        error: `${errorName}: ${message}`,
      };
  }
}
//@ chunk-3msz77wt.js:14252-14343 placement
function filterProfiles(discovery, query) {
  return (discovery.discoveredProfiles ?? []).filter((state) => state.toLowerCase().includes(query));
}
//@ chunk-3msz77wt.js:14343-15228 placement
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
  resolveTierDefaults: (wizardData) => {
    let defaults = bedrockModelDefaults(wizardData.region);
    let regionGroup = bedrockRegionGroup(wizardData.region);
    return Object.fromEntries(
      MODEL_PIN_FAMILIES.map((family) => [
        family,
        {
          auto:
            findFirstMatch(wizardData.discoveredProfiles ?? [], defaults[family].needle, regionGroup) ??
            undefined,
          fallback: defaults[family].fallback,
        },
      ]),
    );
  },
  listTierCandidates: (tier, discovery) => filterProfiles(discovery, tier).sort().reverse(),
  pickerSubtitle: (tier, discovery) => {
    let profileCount = filterProfiles(discovery, tier).length;
    return profileCount > 0
      ? `${profileCount} ${TIER_LABELS[tier]} ${plural(profileCount, "profile")} in your account \xB7 each tested with a one-token request.`
      : `No ${TIER_LABELS[tier]} profiles found in your account.`;
  },
  probe: (wizardData, modelId) => renderErrorSpecificGuidance(wizardData, modelId),
};
//@ chunk-3msz77wt.js:15228-15360 placement
/**
 * Bedrock 向导中的模型检查步骤，检查结果写回向导数据。
 */
function BedrockModelCheckStep() {
  let $ = useMemoCache(2);
  let { updateWizardData } = useWizard();
  let updatePins;
  if ($[0] !== updateWizardData) {
    updatePins = jsxProd_default(ModelPinStep, {
      provider: MODEL_CHECK_REASONS,
      onPins: updateWizardData,
    });
    $[0] = updateWizardData;
    $[1] = updatePins;
  } else updatePins = $[1];
  return updatePins;
}
//@ chunk-3msz77wt.js:15360-15364 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3msz77wt.js:15360", () => {
  init_react_production();
});
//@ chunk-3msz77wt.js:15463-15790 placement
/**
 * 列出本机 AWS profile：解析 ~/.aws/config 与 ~/.aws/credentials 的节名（忽略 sso-session），去重排序。
 */
async function listAwsProfiles() {
  let profiles = new Set();
  let home = homedir();
  for (let { path, re } of [
    {
      path: join(home, ".aws", "config"),
      re: /^\[(?:profile\s+)?([^\]]+)\]/gm,
    },
    {
      path: join(home, ".aws", "credentials"),
      re: /^\[([^\]]+)\]/gm,
    },
  ])
    try {
      for (let match of (await readFile(path, "utf8")).matchAll(re)) {
        let trimmed = match[1]?.trim();
        if (trimmed && !trimmed.startsWith("sso-session ")) profiles.add(trimmed);
      }
    } catch {}
  return [...profiles].sort();
}
//@ chunk-3msz77wt.js:15790-15813 placement
function emptyProfiles() {
  return [];
}
//@ chunk-3msz77wt.js:15813-15849 placement
function loadProfilesOrEmpty() {
  return listAwsProfiles().catch(emptyProfiles);
}
//@ chunk-3msz77wt.js:15849-15909 placement (2.1.88 match: getModelBetas, 1)
/**
 * 判断一个 AWS profile 名里是否含 "bedrock"（用来在 profile 过多时预填第一个 bedrock profile），与“区域”无关。
 */
function isBedrockProfileName(region) {
  return region.toLowerCase().includes("bedrock");
}
//@ chunk-3msz77wt.js:15909-15951 placement
function toProfileOption(profileName) {
  return {
    label: profileName,
    value: profileName,
  };
}
//@ chunk-3msz77wt.js:15951-15977 placement
var MANUAL_PROFILE_VALUE = "__manual__";
var MAX_PROFILE_OPTIONS = 12;
//@ chunk-3msz77wt.js:15977-16242 placement
/**
 * Bedrock 向导中的 AWS profile 步骤：读取 ~/.aws/config 期间显示等待，完成后进入认证方式选择。
 */
function BedrockProfileStep() {
  let $ = useMemoCache(3);
  let [profiles] = useState(loadProfilesOrEmpty);
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
  let profilesElement;
  if ($[1] !== profiles) {
    profilesElement = jsxProd_default(suspenseTypeExport, {
      fallback,
      children: jsxProd_default(ToolsStep, {
        profilesPromise: profiles,
      }),
    });
    $[1] = profiles;
    $[2] = profilesElement;
  } else profilesElement = $[2];
  return profilesElement;
}
//@ chunk-3msz77wt.js:19292-19296 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3msz77wt.js:19292", () => {
  init_react_production();
});
//@ chunk-3msz77wt.js:20653-20657 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3msz77wt.js:20653", () => {
  init_react_production();
});
//@ chunk-3msz77wt.js:20657-23427 placement
/**
 * Bedrock 配置向导的凭据验证步骤：调用 verifyBedrockAccess，显示进行中提示；成功时写入身份与发现的推理 profile 并显示结果，失败时给出错误与返回/重试选项。
 */
function BedrockVerifyStep() {
  let $ = useMemoCache(39);
  let { goBack, goNext, updateWizardData, wizardData } = useWizard();
  let initialState;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialState = {
      phase: "checking",
    };
    $[0] = initialState;
  } else initialState = $[0];
  let [state, setState] = useState(initialState);
  let verifyEffect;
  if ($[1] !== updateWizardData || $[2] !== wizardData) {
    verifyEffect = () => {
      let cancelled = false;
      verifyBedrockAccess(wizardData).then((result) => {
        if (cancelled) {
          return;
        }
        if (result.status === "ok")
          updateWizardData({
            verifiedIdentity: result.identity,
            discoveredProfiles: result.profiles,
          });
        else
          updateWizardData({
            verifiedIdentity: undefined,
            discoveredProfiles: undefined,
          });
        setState({
          phase: "done",
          result,
        });
      });
      return () => {
        cancelled = true;
      };
    };
    $[1] = updateWizardData;
    $[2] = wizardData;
    $[3] = verifyEffect;
  } else verifyEffect = $[3];
  let deps;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    deps = [];
    $[4] = deps;
  } else deps = $[4];
  useEffect(verifyEffect, deps);
  if (state.phase === "checking") {
    const message =
      wizardData.authMethod === "bearer"
        ? "Sending a test request to Bedrock\u2026"
        : "Calling AWS STS and Bedrock\u2026";
    let checkingDialog;
    if ($[5] !== message) {
      checkingDialog = jsxProd_default(WizardDialogLayout, {
        subtitle: "Verifying credentials",
        children: jsxProd_default(WorkerBadge, {
          message,
          subtitle: "This may take a few seconds.",
        }),
      });
      $[5] = message;
      $[6] = checkingDialog;
    } else checkingDialog = $[6];
    return checkingDialog;
  }
  let { result } = state;
  switch (result.status) {
    case "ok": {
      let successIcon;
      if ($[7] === MEMO_CACHE_SENTINEL) {
        successIcon = jsxProd_default(StatusIcon, {
          status: "success",
          withSpace: true,
        });
        $[7] = successIcon;
      } else successIcon = $[7];
      let identityText;
      if ($[8] !== result.identity) {
        identityText = jsxProd_default_2(Text, {
          children: [
            successIcon,
            "Authenticated as ",
            jsxProd_default(Text, {
              bold: true,
              children: result.identity,
            }),
          ],
        });
        $[8] = result.identity;
        $[9] = identityText;
      } else identityText = $[9];
      let children;
      if ($[10] !== result.note || $[11] !== result.profiles) {
        children =
          result.note ??
          (result.profiles.length > 0
            ? `Found ${result.profiles.length} Anthropic inference ${plural(result.profiles.length, "profile")} in this region.`
            : "No Anthropic inference profiles found in this region. You may still proceed \u2014 model defaults will use the built-in IDs.");
        $[10] = result.note;
        $[11] = result.profiles;
        $[12] = children;
      } else children = $[12];
      let noteText;
      if ($[13] !== children) {
        noteText = jsxProd_default(Text, {
          dimColor: true,
          children,
        });
        $[13] = children;
        $[14] = noteText;
      } else noteText = $[14];
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
      let selector;
      if ($[18] !== goBack || $[19] !== onChange) {
        selector = jsxProd_default(ModelSelector, {
          options,
          onChange,
          onCancel: goBack,
        });
        $[18] = goBack;
        $[19] = onChange;
        $[20] = selector;
      } else selector = $[20];
      let successDialog;
      if ($[21] !== identityText || $[22] !== noteText || $[23] !== selector) {
        successDialog = jsxProd_default(WizardDialogLayout, {
          subtitle: "Verification",
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [identityText, noteText, selector],
          }),
        });
        $[21] = identityText;
        $[22] = noteText;
        $[23] = selector;
        $[24] = successDialog;
      } else successDialog = $[24];
      return successDialog;
    }
    case "error": {
      let errorIcon;
      if ($[25] === MEMO_CACHE_SENTINEL) {
        errorIcon = jsxProd_default(StatusIcon, {
          status: "error",
          withSpace: true,
        });
        $[25] = errorIcon;
      } else errorIcon = $[25];
      let errorText;
      if ($[26] !== result.error) {
        errorText = jsxProd_default_2(Text, {
          children: [errorIcon, result.error],
        });
        $[26] = result.error;
        $[27] = errorText;
      } else errorText = $[27];
      let commandText;
      if ($[28] !== result.command) {
        commandText =
          result.command &&
          jsxProd_default_2(Text, {
            bold: true,
            color: "suggestion",
            children: ["    ", result.command],
          });
        $[28] = result.command;
        $[29] = commandText;
      } else commandText = $[29];
      let errorBox;
      if ($[30] !== errorText || $[31] !== commandText) {
        errorBox = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [errorText, commandText],
        });
        $[30] = errorText;
        $[31] = commandText;
        $[32] = errorBox;
      } else errorBox = $[32];
      let confirmSelect;
      if ($[33] !== goBack || $[34] !== goNext) {
        confirmSelect = jsxProd_default(ConfirmSelect, {
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
        $[35] = confirmSelect;
      } else confirmSelect = $[35];
      let errorDialog;
      if ($[36] !== errorBox || $[37] !== confirmSelect) {
        errorDialog = jsxProd_default(WizardDialogLayout, {
          subtitle: "Verification failed",
          color: "error",
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [errorBox, confirmSelect],
          }),
        });
        $[36] = errorBox;
        $[37] = confirmSelect;
        $[38] = errorDialog;
      } else errorDialog = $[38];
      return errorDialog;
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
  isBedrockProfileName,
  toProfileOption,
  MANUAL_PROFILE_VALUE,
  BedrockProfileStep,
  BedrockVerifyStep,
  BedrockModelCheckStep,
};
