/**
 * components/agents/new-agent-creation/wizard-steps/ToolsStep.tsx
 *
 * 向导工具步骤；实际内容为 Google Cloud 认证方式选择（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/ToolsStep.tsx
 * pieces: chunk-3msz77wt.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { useMemoCache } from "../../../../../vendor/react/compiler-runtime.js";
import { use, useState } from "../../../../../vendor/react/cjs/react.production.js";
import { useWizard } from "../../../wizard/useWizard.js";
import {
  MAX_PROFILE_OPTIONS,
  isBedrockProfileName,
  toProfileOption,
  MANUAL_PROFILE_VALUE,
} from "../../../providerSetup/bedrock/bedrockVerify.js";
import { useKeybinding } from "../../../../keybindings/useKeybinding.js";
import { BEDROCK_STEPS } from "../../../providerSetup/bedrock/BedrockCredentialsStep.js";
import { plural } from "../../../../utils/stringUtils.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { ModelSelector } from "../../ModelSelector.js";
import { WizardDialogLayout } from "../../../wizard/WizardDialogLayout.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { TextInput } from "../../../TextInput.js";
import { ErrorText } from "../../../ErrorText.js";

//@ chunk-3msz77wt.js:16242-19292 callgraph-fingerprint (2.1.88 match: ToolsStep, 0.271)
function ToolsStep(props) {
  let $ = useMemoCache(52);
  let { profilesPromise } = props;
  let profiles = use(profilesPromise);
  let { goBack, goToStep, updateWizardData, wizardData } = useWizard();
  let tooManyProfiles = profiles.length > MAX_PROFILE_OPTIONS;
  let missingProfileCached;
  if ($[0] !== profiles || $[1] !== wizardData.awsProfile) {
    missingProfileCached = wizardData.awsProfile && !profiles.includes(wizardData.awsProfile);
    $[0] = profiles;
    $[1] = wizardData.awsProfile;
    $[2] = missingProfileCached;
  } else missingProfileCached = $[2];
  let manualMode = Boolean(missingProfileCached);
  let [isManual, setIsManual] = useState(profiles.length === 0 || tooManyProfiles || manualMode);
  let defaultProfileCached;
  if ($[3] !== profiles || $[4] !== tooManyProfiles) {
    defaultProfileCached = tooManyProfiles ? profiles.find(isBedrockProfileName) : undefined;
    $[3] = profiles;
    $[4] = tooManyProfiles;
    $[5] = defaultProfileCached;
  } else defaultProfileCached = $[5];
  let defaultProfile = defaultProfileCached;
  let [profileName, setProfileName] = useState(wizardData.awsProfile ?? defaultProfile ?? "");
  let [cursorOffset, setCursorOffset] = useState(profileName.length);
  let [errorText, setErrorText] = useState(null);
  let keybindingOptions;
  if ($[6] !== isManual) {
    keybindingOptions = {
      context: "Settings",
      isActive: isManual,
    };
    $[6] = isManual;
    $[7] = keybindingOptions;
  } else keybindingOptions = $[7];
  useKeybinding("confirm:no", goBack, keybindingOptions);
  let chooseProfileCached;
  if ($[8] !== goToStep || $[9] !== updateWizardData) {
    chooseProfileCached = (selectedTools) => {
      updateWizardData({
        awsProfile: selectedTools,
      });
      goToStep(BEDROCK_STEPS.REGION);
    };
    $[8] = goToStep;
    $[9] = updateWizardData;
    $[10] = chooseProfileCached;
  } else chooseProfileCached = $[10];
  let chooseProfile = chooseProfileCached;
  if (!isManual) {
    const profileCount = profiles.length;
    let profileNoun;
    if ($[11] !== profiles.length) {
      profileNoun = plural(profiles.length, "profile");
      $[11] = profiles.length;
      $[12] = profileNoun;
    } else profileNoun = $[12];
    let foundText;
    if ($[13] !== profiles.length || $[14] !== profileNoun) {
      foundText = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Found ", profileCount, " ", profileNoun, " in ~/.aws/config and ~/.aws/credentials."],
      });
      $[13] = profiles.length;
      $[14] = profileNoun;
      $[15] = foundText;
    } else foundText = $[15];
    let options;
    if ($[16] !== profiles) {
      const mapped = profiles.map(toProfileOption);
      let manualOption;
      if ($[18] === MEMO_CACHE_SENTINEL) {
        manualOption = {
          label: "Type a different name\u2026",
          value: MANUAL_PROFILE_VALUE,
        };
        $[18] = manualOption;
      } else manualOption = $[18];
      options = [...mapped, manualOption];
      $[16] = profiles;
      $[17] = options;
    } else options = $[17];
    let defaultValue;
    if ($[19] !== profiles || $[20] !== wizardData.awsProfile) {
      defaultValue =
        wizardData.awsProfile && profiles.includes(wizardData.awsProfile) ? wizardData.awsProfile : undefined;
      $[19] = profiles;
      $[20] = wizardData.awsProfile;
      $[21] = defaultValue;
    } else defaultValue = $[21];
    let onChange;
    if ($[22] !== chooseProfile) {
      onChange = (profileValue) => {
        if (profileValue === MANUAL_PROFILE_VALUE) setIsManual(true);
        else chooseProfile(profileValue);
      };
      $[22] = chooseProfile;
      $[23] = onChange;
    } else onChange = $[23];
    let selectorElement;
    if ($[24] !== goBack || $[25] !== onChange || $[26] !== options || $[27] !== defaultValue) {
      selectorElement = jsxProd_default(ModelSelector, {
        options,
        defaultValue,
        onChange,
        onCancel: goBack,
      });
      $[24] = goBack;
      $[25] = onChange;
      $[26] = options;
      $[27] = defaultValue;
      $[28] = selectorElement;
    } else selectorElement = $[28];
    let listLayout;
    if ($[29] !== selectorElement || $[30] !== foundText) {
      listLayout = jsxProd_default(WizardDialogLayout, {
        subtitle: "AWS profile",
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [foundText, selectorElement],
        }),
      });
      $[29] = selectorElement;
      $[30] = foundText;
      $[31] = listLayout;
    } else listLayout = $[31];
    return listLayout;
  }
  let submitCached;
  if ($[32] !== chooseProfile || $[33] !== profileName) {
    submitCached = () => {
      let trimmed = profileName.trim();
      if (!trimmed) {
        setErrorText("Profile name is required");
        return;
      }
      setErrorText(null);
      chooseProfile(trimmed);
    };
    $[32] = chooseProfile;
    $[33] = profileName;
    $[34] = submitCached;
  } else submitCached = $[34];
  let onSubmit = submitCached;
  let footerText;
  if ($[35] === MEMO_CACHE_SENTINEL) {
    footerText = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "continue",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Settings",
          fallback: "Esc",
          description: "go back",
        }),
      ],
    });
    $[35] = footerText;
  } else footerText = $[35];
  let nameHint;
  if ($[36] === MEMO_CACHE_SENTINEL) {
    nameHint = jsxProd_default(Text, {
      children: "The name from ~/.aws/config (after [profile \u2026]).",
    });
    $[36] = nameHint;
  } else nameHint = $[36];
  let tooManyText;
  if ($[37] !== defaultProfile || $[38] !== profiles.length || $[39] !== tooManyProfiles) {
    tooManyText =
      tooManyProfiles &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "Found ",
          profiles.length,
          " profiles \u2014 too many to list.",
          defaultProfile && ` Prepopulated with "${defaultProfile}".`,
        ],
      });
    $[37] = defaultProfile;
    $[38] = profiles.length;
    $[39] = tooManyProfiles;
    $[40] = tooManyText;
  } else tooManyText = $[40];
  let ssoHint;
  if ($[41] === MEMO_CACHE_SENTINEL) {
    ssoHint = jsxProd_default(Text, {
      dimColor: true,
      children: "If this is an SSO profile, run `aws sso login --profile NAME` first.",
    });
    $[41] = ssoHint;
  } else ssoHint = $[41];
  let inputElement;
  if ($[42] !== cursorOffset || $[43] !== onSubmit || $[44] !== profileName) {
    inputElement = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TextInput, {
        value: profileName,
        onChange: setProfileName,
        onSubmit,
        placeholder: "my-bedrock-profile",
        columns: 60,
        cursorOffset,
        onChangeCursorOffset: setCursorOffset,
        focus: true,
        showCursor: true,
      }),
    });
    $[42] = cursorOffset;
    $[43] = onSubmit;
    $[44] = profileName;
    $[45] = inputElement;
  } else inputElement = $[45];
  let errorElement;
  if ($[46] !== errorText) {
    errorElement =
      errorText &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error: errorText,
        }),
      });
    $[46] = errorText;
    $[47] = errorElement;
  } else errorElement = $[47];
  let manualLayout;
  if ($[48] !== inputElement || $[49] !== errorElement || $[50] !== tooManyText) {
    manualLayout = jsxProd_default(WizardDialogLayout, {
      subtitle: "AWS profile name",
      footerText,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [nameHint, tooManyText, ssoHint, inputElement, errorElement],
      }),
    });
    $[48] = inputElement;
    $[49] = errorElement;
    $[50] = tooManyText;
    $[51] = manualLayout;
  } else manualLayout = $[51];
  return manualLayout;
}
export { ToolsStep };
