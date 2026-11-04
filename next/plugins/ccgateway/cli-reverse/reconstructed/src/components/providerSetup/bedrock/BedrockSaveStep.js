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
import { init_react_production, useState, useRef } from "../../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../../design-system/ThemeProvider.js";
import { useWizard } from "../../wizard/useWizard.js";
import { MEMO_CACHE_SENTINEL, __toESM } from "../../../../runtime/bun-runtime.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-sx9xc5ee.js:5151-5155 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sx9xc5ee.js:5151", () => {
  init_react_production();
});
//@ chunk-sx9xc5ee.js:5155-5191 placement
function hasProfileSelection(profileEntry) {
  return profileEntry[1] !== undefined;
}
//@ chunk-sx9xc5ee.js:5191-5346 placement
function EnvVarRow(entry) {
  let [name, value] = entry;
  return jsxProd_default_2(
    Text,
    {
      children: [
        "  ",
        jsxProd_default(Text, {
          color: "suggestion",
          children: name,
        }),
        " =",
        " ",
        SENSITIVE_BEDROCK_ENV_KEYS.has(name)
          ? jsxProd_default(Text, {
              dimColor: true,
              children: "(hidden)",
            })
          : value,
      ],
    },
    name,
  );
}
//@ chunk-sx9xc5ee.js:5346-6425 placement
function bedrockEnvFromWizard(wizardData) {
  let env = {
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
      env.AWS_PROFILE = wizardData.awsProfile;
      break;
    case "bearer":
      env.AWS_BEARER_TOKEN_BEDROCK = wizardData.bearerToken;
      break;
    case "accessKey":
      env.AWS_ACCESS_KEY_ID = wizardData.accessKeyId;
      env.AWS_SECRET_ACCESS_KEY = wizardData.secretAccessKey;
      if (wizardData.sessionToken) env.AWS_SESSION_TOKEN = wizardData.sessionToken;
      break;
    case "environment":
    case undefined:
      break;
  }
  if (wizardData.pinSonnet) env.ANTHROPIC_DEFAULT_SONNET_MODEL = wizardData.pinSonnet;
  if (wizardData.pinOpus) env.ANTHROPIC_DEFAULT_OPUS_MODEL = wizardData.pinOpus;
  if (wizardData.pinFable) env.ANTHROPIC_DEFAULT_FABLE_MODEL = wizardData.pinFable;
  if (wizardData.pinHaiku) env.ANTHROPIC_DEFAULT_HAIKU_MODEL = wizardData.pinHaiku;
  return env;
}
//@ chunk-sx9xc5ee.js:6425-6514 placement
var SENSITIVE_BEDROCK_ENV_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sx9xc5ee.js:6425", () => {
  SENSITIVE_BEDROCK_ENV_KEYS = new Set([
    "AWS_BEARER_TOKEN_BEDROCK",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_SESSION_TOKEN",
  ]);
});
//@ chunk-sx9xc5ee.js:6514-8606 placement
function BedrockSaveStep(props) {
  let $ = useMemoCache(31);
  let { onComplete } = props;
  let { storageV5 } = useTheme_2();
  let { goBack, wizardData } = useWizard();
  let [errorMessage, setErrorMessage] = useState(null);
  let settingsPath;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    settingsPath = tildify(getSettingsFilePathForSource("userSettings") ?? "~/.claude/settings.json");
    $[0] = settingsPath;
  } else settingsPath = $[0];
  let settingsPathValue = settingsPath;
  let env;
  if ($[1] !== wizardData) {
    env = bedrockEnvFromWizard(wizardData);
    $[1] = wizardData;
    $[2] = env;
  } else env = $[2];
  let envValue = env;
  let envEntries;
  if ($[3] !== envValue) {
    envEntries = Object.entries(envValue).filter(hasProfileSelection);
    $[3] = envValue;
    $[4] = envEntries;
  } else envEntries = $[4];
  let envRows = envEntries;
  let isSavingRef = useRef(false);
  let onConfirm;
  if (
    $[5] !== envValue ||
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
    onConfirm = async () => {
      if (isSavingRef.current) {
        return;
      }
      isSavingRef.current = true;
      let { error } = await updateSettingsForSource(
        "userSettings",
        {
          env: envValue,
        },
        undefined,
        storageV5,
      );
      if (error) {
        isSavingRef.current = false;
        setErrorMessage(error.message);
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
        `Bedrock configuration saved to ${settingsPathValue}.${wizardData.authMethod === "profile" ? ` When your SSO session expires (typically 8 hours), run \`aws sso login --profile ${wizardData.awsProfile}\` \u2014 Claude Code picks up refreshed credentials automatically.` : ""}`,
      );
    };
    $[5] = envValue;
    $[6] = onComplete;
    $[7] = storageV5;
    $[8] = wizardData.authMethod;
    $[9] = wizardData.awsProfile;
    $[10] = wizardData.pinFable;
    $[11] = wizardData.pinHaiku;
    $[12] = wizardData.pinOpus;
    $[13] = wizardData.pinSonnet;
    $[14] = wizardData.verifiedIdentity;
    $[15] = onConfirm;
  } else onConfirm = $[15];
  let onConfirm_2 = onConfirm;
  let textElement;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    textElement = jsxProd_default_2(Text, {
      children: ["These will be written to ", settingsPathValue, " under env:"],
    });
    $[16] = textElement;
  } else textElement = $[16];
  let boxElement;
  if ($[17] !== envRows) {
    boxElement = jsxProd_default(Box, {
      flexDirection: "column",
      children: envRows.map(EnvVarRow),
    });
    $[17] = envRows;
    $[18] = boxElement;
  } else boxElement = $[18];
  let verifiedNotice;
  if ($[19] !== wizardData.verifiedIdentity) {
    verifiedNotice =
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
    $[20] = verifiedNotice;
  } else verifiedNotice = $[20];
  let errorTextElement;
  if ($[21] !== errorMessage) {
    errorTextElement = jsxProd_default(ErrorText, {
      error: errorMessage,
    });
    $[21] = errorMessage;
    $[22] = errorTextElement;
  } else errorTextElement = $[22];
  let confirmSelectElement;
  if ($[23] !== goBack || $[24] !== onConfirm_2) {
    confirmSelectElement = jsxProd_default(ConfirmSelect, {
      confirmLabel: "Save",
      cancelLabel: "Cancel",
      onConfirm: onConfirm_2,
      onCancel: goBack,
    });
    $[23] = goBack;
    $[24] = onConfirm_2;
    $[25] = confirmSelectElement;
  } else confirmSelectElement = $[25];
  let wizardDialogLayoutElement;
  if (
    $[26] !== boxElement ||
    $[27] !== verifiedNotice ||
    $[28] !== errorTextElement ||
    $[29] !== confirmSelectElement
  ) {
    wizardDialogLayoutElement = jsxProd_default(WizardDialogLayout, {
      subtitle: "Confirm and save",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [textElement, boxElement, verifiedNotice, errorTextElement, confirmSelectElement],
      }),
    });
    $[26] = boxElement;
    $[27] = verifiedNotice;
    $[28] = errorTextElement;
    $[29] = confirmSelectElement;
    $[30] = wizardDialogLayoutElement;
  } else wizardDialogLayoutElement = $[30];
  return wizardDialogLayoutElement;
}
//@ chunk-sx9xc5ee.js:8606-8625 placement
var bedrockVerificationSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sx9xc5ee.js:8606", () => {
  bedrockVerificationSignal = __toESM(require_fetch_http_handler(), 1);
});
//@ chunk-sx9xc5ee.js:8625-8670 placement
var BEDROCK_VERIFY_TIMEOUT_TEXT = "Bedrock setup verification timed out";
//@ chunk-sx9xc5ee.js:8670-8980 placement
/**
 * 按 Bedrock 区域组为 sonnet/opus/haiku 各档生成匹配用的第一方模型 id 与带区域前缀的 Bedrock 回退 id；默认模型配置缺少 bedrock id 时抛错。
 */
function bedrockModelDefaults(region) {
  let regionGroup = bedrockRegionGroup(region);
  let defaultsForTier = (modelKey) => {
    let bedrock = catalogEntriesByFirstPartyId[modelKey].bedrock;
    if (bedrock === null)
      throw Error(
        "A DEFAULT_3P_*_KEY points at a model config with bedrock: null \u2014 Bedrock setup has no fallback id for that tier",
      );
    return {
      needle: catalogEntriesByFirstPartyId[modelKey].firstParty,
      fallback: withBedrockRegionPrefix(bedrock, regionGroup),
    };
  };
  return {
    sonnet: defaultsForTier(DEFAULT_3P_SONNET_KEY),
    opus: defaultsForTier(DEFAULT_BEDROCK_OPUS_KEY),
    haiku: defaultsForTier(DEFAULT_3P_HAIKU_KEY),
    fable: defaultsForTier(DEFAULT_3P_FABLE_KEY),
  };
}
//@ chunk-sx9xc5ee.js:8980-9790 placement
async function verifyBedrockAccess(wizardData) {
  if (wizardData.authMethod === "bearer") return bedrockApiKeyTestResult(wizardData);
  let awsChainResolveTimeoutMs = getAwsChainResolveTimeoutMs();
  try {
    let credentials = await bedrockCredentialProvider(wizardData);
    let clientConfig = {
      ...(await getAWSClientProxyConfig({
        url: `https://bedrock.${wizardData.region}.amazonaws.com`,
        region: wizardData.region,
        requestTimeoutMs: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
      })),
      region: wizardData.region,
      ...(credentials && {
        credentials,
      }),
    };
    let { STSClient, GetCallerIdentityCommand } =
      await import("../../../../vendor/@aws-sdk/client-sts/dist-cjs/GetCallerIdentityCommand.lazy.js");
    let callerIdentity = await withTimeout(
      new STSClient(clientConfig).send(new GetCallerIdentityCommand({})),
      awsChainResolveTimeoutMs,
      BEDROCK_VERIFY_TIMEOUT_TEXT,
    );
    let identity = callerIdentity.Arn ?? callerIdentity.UserId ?? "(unknown)";
    let { BedrockClient, ListInferenceProfilesCommand } =
      await import("../../../../vendor/@aws-sdk/client-bedrock/dist-cjs/index.js");
    let bedrockClient = new BedrockClient(clientConfig);
    let profiles = [];
    let nextToken;
    do {
      let page = await withTimeout(
        bedrockClient.send(
          new ListInferenceProfilesCommand({
            ...(nextToken && {
              nextToken,
            }),
            typeEquals: "SYSTEM_DEFINED",
          }),
        ),
        awsChainResolveTimeoutMs,
        BEDROCK_VERIFY_TIMEOUT_TEXT,
      );
      for (let summary of page.inferenceProfileSummaries ?? [])
        if (summary.inferenceProfileId?.includes("anthropic")) profiles.push(summary.inferenceProfileId);
      nextToken = page.nextToken;
    } while (nextToken);
    return {
      status: "ok",
      identity,
      profiles,
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
