/**
 * components/providerSetup/bedrock/BedrockSaveStep.tsx
 *
 * 2.1.316 新增。Bedrock 设置向导：保存步骤。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sx9xc5ee.js (10)
 * attribution: placement 10
 */
import { j, y, R } from "../../../../vendor/react/cjs/react.production.js";
import { r, e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { Me } from "../../design-system/ThemeProvider.js";
import { useWizard } from "../../wizard/useWizard.js";
import { MEMO_CACHE_SENTINEL, Re } from "../../../../runtime/bun-runtime.js";
import { tildify } from "../../../utils/path.js";
import { getSettingsFilePathForSource, updateSettingsForSource } from "../../../utils/settings/settings.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnumOpt } from "../../../services/analytics/safeMetadata.js";
import { StatusIcon } from "../../design-system/StatusIcon.js";
import { ErrorText } from "../../ErrorText.js";
import { ConfirmSelect } from "../../design-system/ConfirmSelect.js";
import { WizardDialogLayout } from "../../wizard/WizardDialogLayout.js";
import { nke } from "../../../../vendor/@smithy/fetch-http-handler/dist-cjs/index.js";
import { bedrockRegionGroup, withBedrockRegionPrefix } from "../../../utils/model/bedrock.js";
import { No } from "../../../utils/model/modelCatalog.js";
import {
  DEFAULT_3P_SONNET_KEY,
  DEFAULT_BEDROCK_OPUS_KEY,
  DEFAULT_3P_HAIKU_KEY,
  DEFAULT_3P_FABLE_KEY,
} from "../../../utils/model/model.js";
import { bedrockApiKeyTestResult, bedrockCredentialProvider, describeAwsError } from "./bedrockVerify.js";
import { getAwsChainResolveTimeoutMs } from "../../../utils/aws.js";
import { getAWSClientProxyConfig } from "../../../utils/proxy.js";
import { AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS } from "../../../utils/auth.js";
import { withTimeout } from "../../../utils/sleep.js";

//@ chunk-sx9xc5ee.js:5151-5155 placement
j();
//@ chunk-sx9xc5ee.js:5155-5191 placement
function Xr(U) {
  return U[1] !== void 0;
}
//@ chunk-sx9xc5ee.js:5191-5346 placement
function EnvVarRow(o) {
  let [H, F] = o;
  return r(
    Text,
    {
      children: [
        "  ",
        e(Text, { color: "suggestion", children: H }),
        " =",
        " ",
        Ie.has(H) ? e(Text, { dimColor: !0, children: "(hidden)" }) : F,
      ],
    },
    H,
  );
}
//@ chunk-sx9xc5ee.js:5346-6425 placement
function bedrockEnvFromWizard(o) {
  let d = {
    CLAUDE_CODE_USE_BEDROCK: "1",
    CLAUDE_CODE_USE_VERTEX: void 0,
    CLAUDE_CODE_USE_FOUNDRY: void 0,
    CLAUDE_CODE_USE_ANTHROPIC_AWS: void 0,
    CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD: void 0,
    AWS_REGION: o.region,
    AWS_PROFILE: void 0,
    AWS_BEARER_TOKEN_BEDROCK: void 0,
    AWS_ACCESS_KEY_ID: void 0,
    AWS_SECRET_ACCESS_KEY: void 0,
    AWS_SESSION_TOKEN: void 0,
    ANTHROPIC_DEFAULT_SONNET_MODEL: void 0,
    ANTHROPIC_DEFAULT_OPUS_MODEL: void 0,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: void 0,
    ANTHROPIC_DEFAULT_FABLE_MODEL: void 0,
    ANTHROPIC_SMALL_FAST_MODEL: void 0,
  };
  switch (o.authMethod) {
    case "profile":
      d.AWS_PROFILE = o.awsProfile;
      break;
    case "bearer":
      d.AWS_BEARER_TOKEN_BEDROCK = o.bearerToken;
      break;
    case "accessKey":
      if (
        ((d.AWS_ACCESS_KEY_ID = o.accessKeyId), (d.AWS_SECRET_ACCESS_KEY = o.secretAccessKey), o.sessionToken)
      )
        d.AWS_SESSION_TOKEN = o.sessionToken;
      break;
    case "environment":
    case void 0:
      break;
  }
  if (o.pinSonnet) d.ANTHROPIC_DEFAULT_SONNET_MODEL = o.pinSonnet;
  if (o.pinOpus) d.ANTHROPIC_DEFAULT_OPUS_MODEL = o.pinOpus;
  if (o.pinFable) d.ANTHROPIC_DEFAULT_FABLE_MODEL = o.pinFable;
  if (o.pinHaiku) d.ANTHROPIC_DEFAULT_HAIKU_MODEL = o.pinHaiku;
  return d;
}
//@ chunk-sx9xc5ee.js:6425-6514 placement
var Ie = new Set(["AWS_BEARER_TOKEN_BEDROCK", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"]);
//@ chunk-sx9xc5ee.js:6514-8606 placement
function BedrockSaveStep(o) {
  let $ = w(31),
    { onComplete: onComplete } = o,
    { storageV5: storageV5 } = Me(),
    { goBack: goBack, wizardData: wizardData } = useWizard(),
    [m, g] = y(null),
    u;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((u = tildify(getSettingsFilePathForSource("userSettings") ?? "~/.claude/settings.json")), ($[0] = u));
  else u = $[0];
  let B = u,
    p;
  if ($[1] !== wizardData) ((p = bedrockEnvFromWizard(wizardData)), ($[1] = wizardData), ($[2] = p));
  else p = $[2];
  let A = p,
    E;
  if ($[3] !== A) ((E = Object.entries(A).filter(Xr)), ($[3] = A), ($[4] = E));
  else E = $[4];
  let k = E,
    f = R(!1),
    C;
  if (
    $[5] !== A ||
    $[6] !== onComplete ||
    $[7] !== storageV5 ||
    $[8] !== wizardData.authMethod ||
    $[9] !== wizardData.awsProfile ||
    $[10] !== wizardData.pinFable ||
    $[11] !== wizardData.pinHaiku ||
    $[12] !== wizardData.pinOpus ||
    $[13] !== wizardData.pinSonnet ||
    $[14] !== wizardData.verifiedIdentity
  )
    ((C = async () => {
      if (f.current) {
        return;
      }
      f.current = !0;
      let { error: error } = await updateSettingsForSource("userSettings", { env: A }, void 0, storageV5);
      if (error) {
        ((f.current = !1), g(error.message));
        return;
      }
      (logEvent("tengu_bedrock_setup_complete", {
        auth_method: fromEnumOpt(wizardData.authMethod),
        pinned_models: Boolean(
          wizardData.pinSonnet || wizardData.pinOpus || wizardData.pinFable || wizardData.pinHaiku,
        ),
        verified: Boolean(wizardData.verifiedIdentity),
      }),
        onComplete(
          `Bedrock configuration saved to ${B}.${wizardData.authMethod === "profile" ? ` When your SSO session expires (typically 8 hours), run \`aws sso login --profile ${wizardData.awsProfile}\` \u2014 Claude Code picks up refreshed credentials automatically.` : ""}`,
        ));
    }),
      ($[5] = A),
      ($[6] = onComplete),
      ($[7] = storageV5),
      ($[8] = wizardData.authMethod),
      ($[9] = wizardData.awsProfile),
      ($[10] = wizardData.pinFable),
      ($[11] = wizardData.pinHaiku),
      ($[12] = wizardData.pinOpus),
      ($[13] = wizardData.pinSonnet),
      ($[14] = wizardData.verifiedIdentity),
      ($[15] = C));
  else C = $[15];
  let T = C,
    _;
  if ($[16] === MEMO_CACHE_SENTINEL)
    ((_ = r(Text, { children: ["These will be written to ", B, " under env:"] })), ($[16] = _));
  else _ = $[16];
  let D;
  if ($[17] !== k)
    ((D = e(Box, { flexDirection: "column", children: k.map(EnvVarRow) })), ($[17] = k), ($[18] = D));
  else D = $[18];
  let W;
  if ($[19] !== wizardData.verifiedIdentity)
    ((W =
      wizardData.verifiedIdentity &&
      r(Text, {
        dimColor: !0,
        children: [
          e(StatusIcon, { status: "success", withSpace: !0 }),
          "Verified as ",
          wizardData.verifiedIdentity,
        ],
      })),
      ($[19] = wizardData.verifiedIdentity),
      ($[20] = W));
  else W = $[20];
  let G;
  if ($[21] !== m) ((G = e(ErrorText, { error: m })), ($[21] = m), ($[22] = G));
  else G = $[22];
  let X;
  if ($[23] !== goBack || $[24] !== T)
    ((X = e(ConfirmSelect, { confirmLabel: "Save", cancelLabel: "Cancel", onConfirm: T, onCancel: goBack })),
      ($[23] = goBack),
      ($[24] = T),
      ($[25] = X));
  else X = $[25];
  let _e;
  if ($[26] !== D || $[27] !== W || $[28] !== G || $[29] !== X)
    ((_e = e(WizardDialogLayout, {
      subtitle: "Confirm and save",
      children: r(Box, { flexDirection: "column", gap: 1, children: [_, D, W, G, X] }),
    })),
      ($[26] = D),
      ($[27] = W),
      ($[28] = G),
      ($[29] = X),
      ($[30] = _e));
  else _e = $[30];
  return _e;
}
//@ chunk-sx9xc5ee.js:8606-8625 placement
var Ke = Re(nke(), 1);
//@ chunk-sx9xc5ee.js:8625-8670 placement
var Q = "Bedrock setup verification timed out";
/**
 * 按 Bedrock 区域组为 sonnet/opus/haiku 各档生成匹配用的第一方模型 id 与带区域前缀的 Bedrock 回退 id；默认模型配置缺少 bedrock id 时抛错。
 */
//@ chunk-sx9xc5ee.js:8670-8980 placement
function bedrockModelDefaults(o) {
  let d = bedrockRegionGroup(o),
    c = (l) => {
      let bedrock = No[l].bedrock;
      if (bedrock === null)
        throw Error(
          "A DEFAULT_3P_*_KEY points at a model config with bedrock: null \u2014 Bedrock setup has no fallback id for that tier",
        );
      return { needle: No[l].firstParty, fallback: withBedrockRegionPrefix(bedrock, d) };
    };
  return {
    sonnet: c(DEFAULT_3P_SONNET_KEY),
    opus: c(DEFAULT_BEDROCK_OPUS_KEY),
    haiku: c(DEFAULT_3P_HAIKU_KEY),
    fable: c(DEFAULT_3P_FABLE_KEY),
  };
}
//@ chunk-sx9xc5ee.js:8980-9790 placement
async function verifyBedrockAccess(o) {
  if (o.authMethod === "bearer") return bedrockApiKeyTestResult(o);
  let d = getAwsChainResolveTimeoutMs();
  try {
    let c = await bedrockCredentialProvider(o),
      t = {
        ...(await getAWSClientProxyConfig({
          url: `https://bedrock.${o.region}.amazonaws.com`,
          region: o.region,
          requestTimeoutMs: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
        })),
        region: o.region,
        ...(c && { credentials: c }),
      },
      { STSClient: STSClient, GetCallerIdentityCommand: GetCallerIdentityCommand } =
        await import("./chunk-heg39xxp.js"),
      h = await withTimeout(new STSClient(t).send(new GetCallerIdentityCommand({})), d, Q),
      u = h.Arn ?? h.UserId ?? "(unknown)",
      { BedrockClient: BedrockClient, ListInferenceProfilesCommand: ListInferenceProfilesCommand } =
        await import("./chunk-0dmzgg46.js"),
      A = new BedrockClient(t),
      E = [],
      k;
    do {
      let f = await withTimeout(
        A.send(
          new ListInferenceProfilesCommand({ ...(k && { nextToken: k }), typeEquals: "SYSTEM_DEFINED" }),
        ),
        d,
        Q,
      );
      for (let C of f.inferenceProfileSummaries ?? [])
        if (C.inferenceProfileId?.includes("anthropic")) E.push(C.inferenceProfileId);
      k = f.nextToken;
    } while (k);
    return { status: "ok", identity: u, profiles: E };
  } catch (error) {
    return { status: "error", ...describeAwsError(error, o, d) };
  }
}

export { Q, bedrockModelDefaults, Ke, verifyBedrockAccess, BedrockSaveStep };
