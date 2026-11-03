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
import { init_react_production, y, R } from "../../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../../design-system/ThemeProvider.js";
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
import { require_fetch_http_handler } from "../../../../vendor/@smithy/fetch-http-handler/dist-cjs/index.js";
import { bedrockRegionGroup, withBedrockRegionPrefix } from "../../../utils/model/bedrock.js";
import { catalogEntriesByFirstPartyId } from "../../../utils/model/modelCatalog.js";
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
init_react_production();
//@ chunk-sx9xc5ee.js:5155-5191 placement
function hasProfileSelection(U) {
  return U[1] !== undefined;
}
//@ chunk-sx9xc5ee.js:5191-5346 placement
function EnvVarRow(o) {
  let [H, F] = o;
  return jsxProd_default_2(
    Text,
    {
      children: [
        "  ",
        jsxProd_default(Text, {
          color: "suggestion",
          children: H,
        }),
        " =",
        " ",
        SENSITIVE_BEDROCK_ENV_KEYS.has(H)
          ? jsxProd_default(Text, {
              dimColor: true,
              children: "(hidden)",
            })
          : F,
      ],
    },
    H,
  );
}
//@ chunk-sx9xc5ee.js:5346-6425 placement
function bedrockEnvFromWizard(wizardData) {
  let d = {
    CLAUDE_CODE_USE_BEDROCK: "1",
    CLAUDE_CODE_USE_VERTEX: undefined,
    CLAUDE_CODE_USE_FOUNDRY: undefined,
    CLAUDE_CODE_USE_ANTHROPIC_AWS: undefined,
    CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD: undefined,
    AWS_REGION: wizardData.region,
    AWS_PROFILE: undefined,
    AWS_BEARER_TOKEN_BEDROCK: undefined,
    AWS_ACCESS_KEY_ID: undefined,
    AWS_SECRET_ACCESS_KEY: undefined,
    AWS_SESSION_TOKEN: undefined,
    ANTHROPIC_DEFAULT_SONNET_MODEL: undefined,
    ANTHROPIC_DEFAULT_OPUS_MODEL: undefined,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: undefined,
    ANTHROPIC_DEFAULT_FABLE_MODEL: undefined,
    ANTHROPIC_SMALL_FAST_MODEL: undefined,
  };
  switch (wizardData.authMethod) {
    case "profile":
      d.AWS_PROFILE = wizardData.awsProfile;
      break;
    case "bearer":
      d.AWS_BEARER_TOKEN_BEDROCK = wizardData.bearerToken;
      break;
    case "accessKey":
      d.AWS_ACCESS_KEY_ID = wizardData.accessKeyId;
      d.AWS_SECRET_ACCESS_KEY = wizardData.secretAccessKey;
      if (wizardData.sessionToken) d.AWS_SESSION_TOKEN = wizardData.sessionToken;
      break;
    case "environment":
    case undefined:
      break;
  }
  if (wizardData.pinSonnet) d.ANTHROPIC_DEFAULT_SONNET_MODEL = wizardData.pinSonnet;
  if (wizardData.pinOpus) d.ANTHROPIC_DEFAULT_OPUS_MODEL = wizardData.pinOpus;
  if (wizardData.pinFable) d.ANTHROPIC_DEFAULT_FABLE_MODEL = wizardData.pinFable;
  if (wizardData.pinHaiku) d.ANTHROPIC_DEFAULT_HAIKU_MODEL = wizardData.pinHaiku;
  return d;
}
//@ chunk-sx9xc5ee.js:6425-6514 placement
var SENSITIVE_BEDROCK_ENV_KEYS = new Set([
  "AWS_BEARER_TOKEN_BEDROCK",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
]);
//@ chunk-sx9xc5ee.js:6514-8606 placement
function BedrockSaveStep(props) {
  let $ = w(31);
  let { onComplete } = props;
  let { storageV5 } = useTheme_2();
  let { goBack, wizardData } = useWizard();
  let [m, g] = y(null);
  let u;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    u = tildify(getSettingsFilePathForSource("userSettings") ?? "~/.claude/settings.json");
    $[0] = u;
  } else u = $[0];
  let B = u;
  let p;
  if ($[1] !== wizardData) {
    p = bedrockEnvFromWizard(wizardData);
    $[1] = wizardData;
    $[2] = p;
  } else p = $[2];
  let A = p;
  let E;
  if ($[3] !== A) {
    E = Object.entries(A).filter(hasProfileSelection);
    $[3] = A;
    $[4] = E;
  } else E = $[4];
  let k = E;
  let f = R(false);
  let C;
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
  ) {
    C = async () => {
      if (f.current) {
        return;
      }
      f.current = true;
      let { error } = await updateSettingsForSource(
        "userSettings",
        {
          env: A,
        },
        undefined,
        storageV5,
      );
      if (error) {
        f.current = false;
        g(error.message);
        return;
      }
      logEvent("tengu_bedrock_setup_complete", {
        auth_method: fromEnumOpt(wizardData.authMethod),
        pinned_models: Boolean(
          wizardData.pinSonnet || wizardData.pinOpus || wizardData.pinFable || wizardData.pinHaiku,
        ),
        verified: Boolean(wizardData.verifiedIdentity),
      });
      onComplete(
        `Bedrock configuration saved to ${B}.${wizardData.authMethod === "profile" ? ` When your SSO session expires (typically 8 hours), run \`aws sso login --profile ${wizardData.awsProfile}\` \u2014 Claude Code picks up refreshed credentials automatically.` : ""}`,
      );
    };
    $[5] = A;
    $[6] = onComplete;
    $[7] = storageV5;
    $[8] = wizardData.authMethod;
    $[9] = wizardData.awsProfile;
    $[10] = wizardData.pinFable;
    $[11] = wizardData.pinHaiku;
    $[12] = wizardData.pinOpus;
    $[13] = wizardData.pinSonnet;
    $[14] = wizardData.verifiedIdentity;
    $[15] = C;
  } else C = $[15];
  let onConfirm = C;
  let _;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    _ = jsxProd_default_2(Text, {
      children: ["These will be written to ", B, " under env:"],
    });
    $[16] = _;
  } else _ = $[16];
  let D;
  if ($[17] !== k) {
    D = jsxProd_default(Box, {
      flexDirection: "column",
      children: k.map(EnvVarRow),
    });
    $[17] = k;
    $[18] = D;
  } else D = $[18];
  let W;
  if ($[19] !== wizardData.verifiedIdentity) {
    W =
      wizardData.verifiedIdentity &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          jsxProd_default(StatusIcon, {
            status: "success",
            withSpace: true,
          }),
          "Verified as ",
          wizardData.verifiedIdentity,
        ],
      });
    $[19] = wizardData.verifiedIdentity;
    $[20] = W;
  } else W = $[20];
  let G;
  if ($[21] !== m) {
    G = jsxProd_default(ErrorText, {
      error: m,
    });
    $[21] = m;
    $[22] = G;
  } else G = $[22];
  let X;
  if ($[23] !== goBack || $[24] !== onConfirm) {
    X = jsxProd_default(ConfirmSelect, {
      confirmLabel: "Save",
      cancelLabel: "Cancel",
      onConfirm,
      onCancel: goBack,
    });
    $[23] = goBack;
    $[24] = onConfirm;
    $[25] = X;
  } else X = $[25];
  let _e;
  if ($[26] !== D || $[27] !== W || $[28] !== G || $[29] !== X) {
    _e = jsxProd_default(WizardDialogLayout, {
      subtitle: "Confirm and save",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [_, D, W, G, X],
      }),
    });
    $[26] = D;
    $[27] = W;
    $[28] = G;
    $[29] = X;
    $[30] = _e;
  } else _e = $[30];
  return _e;
}
//@ chunk-sx9xc5ee.js:8606-8625 placement
var bedrockVerificationSignal = Re(require_fetch_http_handler(), 1);
//@ chunk-sx9xc5ee.js:8625-8670 placement
var BEDROCK_VERIFY_TIMEOUT_TEXT = "Bedrock setup verification timed out";
//@ chunk-sx9xc5ee.js:8670-8980 placement
/**
 * 按 Bedrock 区域组为 sonnet/opus/haiku 各档生成匹配用的第一方模型 id 与带区域前缀的 Bedrock 回退 id；默认模型配置缺少 bedrock id 时抛错。
 */
function bedrockModelDefaults(region) {
  let d = bedrockRegionGroup(region);
  let c = (l) => {
    let bedrock = catalogEntriesByFirstPartyId[l].bedrock;
    if (bedrock === null)
      throw Error(
        "A DEFAULT_3P_*_KEY points at a model config with bedrock: null \u2014 Bedrock setup has no fallback id for that tier",
      );
    return {
      needle: catalogEntriesByFirstPartyId[l].firstParty,
      fallback: withBedrockRegionPrefix(bedrock, d),
    };
  };
  return {
    sonnet: c(DEFAULT_3P_SONNET_KEY),
    opus: c(DEFAULT_BEDROCK_OPUS_KEY),
    haiku: c(DEFAULT_3P_HAIKU_KEY),
    fable: c(DEFAULT_3P_FABLE_KEY),
  };
}
//@ chunk-sx9xc5ee.js:8980-9790 placement
async function verifyBedrockAccess(wizardData) {
  if (wizardData.authMethod === "bearer") return bedrockApiKeyTestResult(wizardData);
  let awsChainResolveTimeoutMs = getAwsChainResolveTimeoutMs();
  try {
    let c = await bedrockCredentialProvider(wizardData);
    let t = {
      ...(await getAWSClientProxyConfig({
        url: `https://bedrock.${wizardData.region}.amazonaws.com`,
        region: wizardData.region,
        requestTimeoutMs: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
      })),
      region: wizardData.region,
      ...(c && {
        credentials: c,
      }),
    };
    let { STSClient, GetCallerIdentityCommand } = await import("./chunk-heg39xxp.js");
    let h = await withTimeout(
      new STSClient(t).send(new GetCallerIdentityCommand({})),
      awsChainResolveTimeoutMs,
      BEDROCK_VERIFY_TIMEOUT_TEXT,
    );
    let identity = h.Arn ?? h.UserId ?? "(unknown)";
    let { BedrockClient, ListInferenceProfilesCommand } = await import("./chunk-0dmzgg46.js");
    let A = new BedrockClient(t);
    let E = [];
    let k;
    do {
      let f = await withTimeout(
        A.send(
          new ListInferenceProfilesCommand({
            ...(k && {
              nextToken: k,
            }),
            typeEquals: "SYSTEM_DEFINED",
          }),
        ),
        awsChainResolveTimeoutMs,
        BEDROCK_VERIFY_TIMEOUT_TEXT,
      );
      for (let C of f.inferenceProfileSummaries ?? [])
        if (C.inferenceProfileId?.includes("anthropic")) E.push(C.inferenceProfileId);
      k = f.nextToken;
    } while (k);
    return {
      status: "ok",
      identity,
      profiles: E,
    };
  } catch (error) {
    return {
      status: "error",
      ...describeAwsError(error, wizardData, awsChainResolveTimeoutMs),
    };
  }
}
export {
  BEDROCK_VERIFY_TIMEOUT_TEXT,
  bedrockModelDefaults,
  bedrockVerificationSignal,
  verifyBedrockAccess,
  BedrockSaveStep,
};
