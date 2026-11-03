/**
 * components/providerSetup/bedrock/bedrockVerify.ts
 *
 * 2.1.316 新增。Bedrock 访问验证与 AWS 错误描述。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sx9xc5ee.js (20)
 * attribution: placement 20
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
import { bedrockModelDefaults, Ke, Q, verifyBedrockAccess } from "./BedrockSaveStep.js";
import { renderErrorSpecificGuidance } from "../../ResumeTask.js";
import { getAWSProxyRequestHandler, resolveStsEndpointForProxyUrl } from "../../../utils/proxy.js";
import { AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS } from "../../../utils/auth.js";
import { withTimeout } from "../../../utils/sleep.js";
import { getAwsChainResolveTimeoutMs } from "../../../utils/aws.js";
import { bedrockRegionGroup, findFirstMatch } from "../../../utils/model/bedrock.js";
import { mB, ModelPinStep } from "../../ModelPinWizard.js";
import { TIER_LABELS } from "../../../utils/model/thirdPartyDefaultFallbacks.js";
import { plural } from "../../../utils/stringUtils.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../wizard/useWizard.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { j, y, fo, P } from "../../../../vendor/react/cjs/react.production.js";
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
    ]),
    l = {
      awsRegion: o.region,
      maxRetries: 0,
      fetchOptions: c({
        url: env.ANTHROPIC_BEDROCK_BASE_URL || `https://bedrock-runtime.${o.region}.amazonaws.com`,
      }),
    },
    t = await bedrockSigningCredentials(o),
    m = getForwardableEnvHeaders(),
    g = {
      authToken: null,
      defaultHeaders: {
        ...m,
        ...clearAuthorizationHeaders(),
        ...filteredCustomBetaHeaders(),
        Authorization: null,
        ...(!hasCustomApiKeyHeader() && { "X-Api-Key": null }),
      },
      ...CLOUD_AUTH_SLOT,
    };
  switch (t.kind) {
    case "bearer":
      return new d({
        ...l,
        apiKey: t.token,
        defaultHeaders: {
          ...m,
          ...clearAuthorizationHeaders(),
          ...filteredCustomBetaHeaders(),
          Authorization: `Bearer ${t.token}`,
          ...(!hasCustomApiKeyHeader() && { "X-Api-Key": null }),
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
            ...m,
            ...clearAuthorizationHeaders(),
            ...filteredCustomBetaHeaders(),
            Authorization: `Bearer ${AWS_BEARER_TOKEN_BEDROCK}`,
            ...(!hasCustomApiKeyHeader() && { "X-Api-Key": null }),
          },
        });
      return new d({ ...l, ...g, providerChainResolver: () => profileCredentialProvider(o, void 0) });
    }
  }
}
//@ chunk-sx9xc5ee.js:10865-11127 placement
async function bedrockSigningCredentials(o) {
  if (o.authMethod === "bearer") return { kind: "bearer", token: o.bearerToken };
  let d = await bedrockCredentialProvider(o);
  if (!d) return { kind: "default" };
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
  let fallback = bedrockModelDefaults(o.region).haiku.fallback,
    c = await renderErrorSpecificGuidance(o, fallback);
  if (c.ok)
    return {
      status: "ok",
      identity: "Bedrock API key",
      profiles: [],
      note: `Test request to ${fallback} succeeded.`,
    };
  switch (c.reason) {
    case "auth":
      return { status: "error", error: "Invalid Bedrock API key. Check the key and try again." };
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
      return { status: "error", error: "The test request failed. Check the key and region." };
  }
}
/**
 * 按 Bedrock 设置向导选择的认证方式返回凭据提供函数：profile 走 AWS 节点凭据链（带代理与超时），accessKey 直接返回密钥，environment 返回 undefined（用默认链）。
 */
//@ chunk-sx9xc5ee.js:11982-12250 placement
async function bedrockCredentialProvider(o) {
  switch (o.authMethod) {
    case "profile":
      return profileCredentialProvider(o, o.awsProfile);
    case "accessKey":
      return async () => ({
        accessKeyId: o.accessKeyId,
        secretAccessKey: o.secretAccessKey,
        ...(o.sessionToken && { sessionToken: o.sessionToken }),
      });
    case "environment":
      return;
    default:
      return;
  }
}
/**
 * 为指定 AWS profile 创建凭证提供者：动态加载 fromNodeProviderChain，配置经代理的 STS 请求处理器与超时，返回带解析超时的提供者函数。
 */
//@ chunk-sx9xc5ee.js:12250-12608 placement
async function profileCredentialProvider(o, d) {
  let [{ fromNodeProviderChain: c }, l] = await Promise.all([
      import("./chunk-thwbpw6e.js"),
      getAWSProxyRequestHandler({
        url: resolveStsEndpointForProxyUrl(String(o.region)),
        requestTimeoutMs: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
      }),
    ]),
    t = l ?? new Ke.FetchHttpHandler({ requestTimeout: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS }),
    m = c({
      profile: d,
      ignoreCache: !0,
      parentClientConfig: { region: o.region, requestHandler: t },
      clientConfig: { requestHandler: t },
    });
  return (g) => withTimeout(m(g), getAwsChainResolveTimeoutMs(), Q);
}
/**
 * 判断 AWS 错误是否为超时（TimeoutError，或消息以 TimeoutError: 开头的凭证提供者错误）。
 */
//@ chunk-sx9xc5ee.js:12608-12738 placement
function isAwsTimeoutError(o) {
  return (
    o?.name === "TimeoutError" ||
    (o?.name === "CredentialsProviderError" && (o.message ?? "").startsWith("TimeoutError:"))
  );
}
//@ chunk-sx9xc5ee.js:12738-14252 placement
function describeAwsError(o, d, c) {
  let l = o,
    t = l?.name ?? "Error",
    m = l?.message ?? String(o);
  if (m === Q)
    return {
      error: `Timed out after ${Math.ceil(c / 1000)}s waiting for AWS. Check your network and proxy settings; if a credential helper needs longer to prompt you, raise CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS.`,
    };
  if (isAwsTimeoutError(l))
    return { error: "A request to AWS timed out. Check your network and proxy settings, then try again." };
  let g = d.authMethod === "profile" ? `aws sso login --profile ${d.awsProfile}` : void 0;
  switch (t) {
    case "CredentialsProviderError":
      return d.authMethod === "profile"
        ? {
            error: `Could not load credentials for profile "${d.awsProfile}". If this is an SSO profile, run:`,
            command: g,
          }
        : { error: `No AWS credentials found. ${m}` };
    case "ExpiredTokenException":
    case "TokenRefreshRequired":
      return d.authMethod === "profile"
        ? { error: "SSO session expired. Run:", command: g }
        : { error: `Credentials expired. ${m}` };
    case "ForbiddenException":
      return d.authMethod === "profile"
        ? {
            error: `SSO portal denied access to the role for profile "${d.awsProfile}". The permission set may have been revoked \u2014 check your AWS access portal.`,
          }
        : { error: `Forbidden. ${m}` };
    case "AccessDeniedException":
      return { error: `Access denied. Your IAM role needs bedrock:ListInferenceProfiles permission. ${m}` };
    case "UnrecognizedClientException":
    case "InvalidSignatureException":
      return { error: `Invalid credentials. ${m}` };
    case "UnknownEndpoint":
    case "ENOTFOUND":
      return { error: `Cannot reach AWS in region "${d.region}". Check the region name and your network.` };
    default:
      return { error: `${t}: ${m}` };
  }
}
//@ chunk-sx9xc5ee.js:14252-14343 placement
function He(o, d) {
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
    let d = bedrockModelDefaults(o.region),
      c = bedrockRegionGroup(o.region);
    return Object.fromEntries(
      mB.map((l) => [
        l,
        {
          auto: findFirstMatch(o.discoveredProfiles ?? [], d[l].needle, c) ?? void 0,
          fallback: d[l].fallback,
        },
      ]),
    );
  },
  listTierCandidates: (o, d) => He(d, o).sort().reverse(),
  pickerSubtitle: (o, d) => {
    let c = He(d, o).length;
    return c > 0
      ? `${c} ${TIER_LABELS[o]} ${plural(c, "profile")} in your account \xB7 each tested with a one-token request.`
      : `No ${TIER_LABELS[o]} profiles found in your account.`;
  },
  probe: (o, d) => renderErrorSpecificGuidance(o, d),
};
/**
 * Bedrock 向导中的模型检查步骤，检查结果写回向导数据。
 */
//@ chunk-sx9xc5ee.js:15228-15360 placement
function BedrockModelCheckStep() {
  let $ = w(2),
    { updateWizardData: updateWizardData } = useWizard(),
    c;
  if ($[0] !== updateWizardData)
    ((c = e(ModelPinStep, { provider: MODEL_CHECK_REASONS, onPins: updateWizardData })),
      ($[0] = updateWizardData),
      ($[1] = c));
  else c = $[1];
  return c;
}
//@ chunk-sx9xc5ee.js:15360-15364 placement
j();
/**
 * 列出本机 AWS profile：解析 ~/.aws/config 与 ~/.aws/credentials 的节名（忽略 sso-session），去重排序。
 */
//@ chunk-sx9xc5ee.js:15463-15790 placement
async function listAwsProfiles() {
  let o = new Set(),
    d = homedir();
  for (let { path: path, re: re } of [
    { path: join(d, ".aws", "config"), re: /^\[(?:profile\s+)?([^\]]+)\]/gm },
    { path: join(d, ".aws", "credentials"), re: /^\[([^\]]+)\]/gm },
  ])
    try {
      for (let t of (await readFile(path, "utf8")).matchAll(re)) {
        let m = t[1]?.trim();
        if (m && !m.startsWith("sso-session ")) o.add(m);
      }
    } catch {}
  return [...o].sort();
}
//@ chunk-sx9xc5ee.js:15790-15813 placement
function Ao() {
  return [];
}
//@ chunk-sx9xc5ee.js:15813-15849 placement
function Eo() {
  return listAwsProfiles().catch(Ao);
}
//@ chunk-sx9xc5ee.js:15849-15909 placement
function Do(Ko) {
  return Ko.toLowerCase().includes("bedrock");
}
//@ chunk-sx9xc5ee.js:15909-15951 placement
function wo(gr) {
  return { label: gr, value: gr };
}
//@ chunk-sx9xc5ee.js:15951-15977 placement
var ee = "__manual__",
  qe = 12;
/**
 * Bedrock 向导中的 AWS profile 步骤：读取 ~/.aws/config 期间显示等待，完成后进入认证方式选择。
 */
//@ chunk-sx9xc5ee.js:15977-16242 placement
function BedrockProfileStep() {
  let $ = w(3),
    [o] = y(Eo),
    c;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((c = e(WizardDialogLayout, {
      subtitle: "AWS profile",
      children: e(WorkerBadge, { message: "Reading ~/.aws/config\u2026" }),
    })),
      ($[0] = c));
  else c = $[0];
  let l;
  if ($[1] !== o)
    ((l = e(fo, { fallback: c, children: e(MethodStep, { profilesPromise: o }) })), ($[1] = o), ($[2] = l));
  else l = $[2];
  return l;
}
//@ chunk-sx9xc5ee.js:19292-19296 placement
j();
/**
 * Bedrock 配置向导的凭据验证步骤：调用 verifyBedrockAccess，显示进行中提示；成功时写入身份与发现的推理 profile 并显示结果，失败时给出错误与返回/重试选项。
 */
//@ chunk-sx9xc5ee.js:20657-23427 placement
function BedrockVerifyStep() {
  let $ = w(39),
    {
      goBack: goBack,
      goNext: goNext,
      updateWizardData: updateWizardData,
      wizardData: wizardData,
    } = useWizard(),
    m;
  if ($[0] === MEMO_CACHE_SENTINEL) ((m = { phase: "checking" }), ($[0] = m));
  else m = $[0];
  let [g, h] = y(m),
    u;
  if ($[1] !== updateWizardData || $[2] !== wizardData)
    ((u = () => {
      let B = !1;
      return (
        verifyBedrockAccess(wizardData).then((p) => {
          if (B) {
            return;
          }
          if (p.status === "ok")
            updateWizardData({ verifiedIdentity: p.identity, discoveredProfiles: p.profiles });
          else updateWizardData({ verifiedIdentity: void 0, discoveredProfiles: void 0 });
          h({ phase: "done", result: p });
        }),
        () => {
          B = !0;
        }
      );
    }),
      ($[1] = updateWizardData),
      ($[2] = wizardData),
      ($[3] = u));
  else u = $[3];
  let A;
  if ($[4] === MEMO_CACHE_SENTINEL) ((A = []), ($[4] = A));
  else A = $[4];
  if ((P(u, A), g.phase === "checking")) {
    const E =
      wizardData.authMethod === "bearer"
        ? "Sending a test request to Bedrock\u2026"
        : "Calling AWS STS and Bedrock\u2026";
    let k;
    if ($[5] !== E)
      ((k = e(WizardDialogLayout, {
        subtitle: "Verifying credentials",
        children: e(WorkerBadge, { message: E, subtitle: "This may take a few seconds." }),
      })),
        ($[5] = E),
        ($[6] = k));
    else k = $[6];
    return k;
  }
  let { result: f } = g;
  switch (f.status) {
    case "ok": {
      let E;
      if ($[7] === MEMO_CACHE_SENTINEL)
        ((E = e(StatusIcon, { status: "success", withSpace: !0 })), ($[7] = E));
      else E = $[7];
      let k;
      if ($[8] !== f.identity)
        ((k = r(Text, { children: [E, "Authenticated as ", e(Text, { bold: !0, children: f.identity })] })),
          ($[8] = f.identity),
          ($[9] = k));
      else k = $[9];
      let C;
      if ($[10] !== f.note || $[11] !== f.profiles)
        ((C =
          f.note ??
          (f.profiles.length > 0
            ? `Found ${f.profiles.length} Anthropic inference ${plural(f.profiles.length, "profile")} in this region.`
            : "No Anthropic inference profiles found in this region. You may still proceed \u2014 model defaults will use the built-in IDs.")),
          ($[10] = f.note),
          ($[11] = f.profiles),
          ($[12] = C));
      else C = $[12];
      let v;
      if ($[13] !== C) ((v = e(Text, { dimColor: !0, children: C })), ($[13] = C), ($[14] = v));
      else v = $[14];
      let T;
      if ($[15] === MEMO_CACHE_SENTINEL) ((T = [{ label: "Continue", value: "continue" }]), ($[15] = T));
      else T = $[15];
      let _;
      if ($[16] !== goNext) ((_ = () => goNext()), ($[16] = goNext), ($[17] = _));
      else _ = $[17];
      let D;
      if ($[18] !== goBack || $[19] !== _)
        ((D = e(ModelSelector, { options: T, onChange: _, onCancel: goBack })),
          ($[18] = goBack),
          ($[19] = _),
          ($[20] = D));
      else D = $[20];
      let W;
      if ($[21] !== k || $[22] !== v || $[23] !== D)
        ((W = e(WizardDialogLayout, {
          subtitle: "Verification",
          children: r(Box, { flexDirection: "column", gap: 1, children: [k, v, D] }),
        })),
          ($[21] = k),
          ($[22] = v),
          ($[23] = D),
          ($[24] = W));
      else W = $[24];
      return W;
    }
    case "error": {
      let E;
      if ($[25] === MEMO_CACHE_SENTINEL)
        ((E = e(StatusIcon, { status: "error", withSpace: !0 })), ($[25] = E));
      else E = $[25];
      let k;
      if ($[26] !== f.error) ((k = r(Text, { children: [E, f.error] })), ($[26] = f.error), ($[27] = k));
      else k = $[27];
      let C;
      if ($[28] !== f.command)
        ((C = f.command && r(Text, { bold: !0, color: "suggestion", children: ["    ", f.command] })),
          ($[28] = f.command),
          ($[29] = C));
      else C = $[29];
      let v;
      if ($[30] !== k || $[31] !== C)
        ((v = r(Box, { flexDirection: "column", children: [k, C] })), ($[30] = k), ($[31] = C), ($[32] = v));
      else v = $[32];
      let T;
      if ($[33] !== goBack || $[34] !== goNext)
        ((T = e(ConfirmSelect, {
          hideIndexes: !0,
          cancelFirst: !0,
          focus: "cancel",
          confirmLabel: "Save anyway (skip verification)",
          cancelLabel: "Go back and fix",
          onConfirm: goNext,
          onCancel: goBack,
        })),
          ($[33] = goBack),
          ($[34] = goNext),
          ($[35] = T));
      else T = $[35];
      let _;
      if ($[36] !== v || $[37] !== T)
        ((_ = e(WizardDialogLayout, {
          subtitle: "Verification failed",
          color: "error",
          children: r(Box, { flexDirection: "column", gap: 1, children: [v, T] }),
        })),
          ($[36] = v),
          ($[37] = T),
          ($[38] = _));
      else _ = $[38];
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
  qe,
  Do,
  wo,
  ee,
  BedrockProfileStep,
  BedrockVerifyStep,
  BedrockModelCheckStep,
};
