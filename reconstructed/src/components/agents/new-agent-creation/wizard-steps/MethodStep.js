/**
 * components/agents/new-agent-creation/wizard-steps/MethodStep.tsx
 *
 * 向导方式步骤；实际内容为 AWS profile 选择（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/MethodStep.tsx
 * pieces: chunk-sx9xc5ee.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { Qr, y } from "../../../../../vendor/react/cjs/react.production.js";
import { useWizard } from "../../../wizard/useWizard.js";
import {
  MAX_PROFILE_OPTIONS,
  isBedrockRegion,
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

//@ chunk-sx9xc5ee.js:16242-19292 callgraph-fingerprint = MethodStep (0.275)
function MethodStep(props) {
  let $ = w(52);
  let { profilesPromise } = props;
  let c = Qr(profilesPromise);
  let { goBack, goToStep, updateWizardData, wizardData } = useWizard();
  let h = c.length > MAX_PROFILE_OPTIONS;
  let B;
  if ($[0] !== c || $[1] !== wizardData.awsProfile) {
    B = wizardData.awsProfile && !c.includes(wizardData.awsProfile);
    $[0] = c;
    $[1] = wizardData.awsProfile;
    $[2] = B;
  } else B = $[2];
  let p = Boolean(B);
  let [A, E] = y(c.length === 0 || h || p);
  let k;
  if ($[3] !== c || $[4] !== h) {
    k = h ? c.find(isBedrockRegion) : undefined;
    $[3] = c;
    $[4] = h;
    $[5] = k;
  } else k = $[5];
  let f = k;
  let [C, v] = y(wizardData.awsProfile ?? f ?? "");
  let [T, _] = y(C.length);
  let [D, W] = y(null);
  let G;
  if ($[6] !== A) {
    G = {
      context: "Settings",
      isActive: A,
    };
    $[6] = A;
    $[7] = G;
  } else G = $[7];
  useKeybinding("confirm:no", goBack, G);
  let X;
  if ($[8] !== goToStep || $[9] !== updateWizardData) {
    X = (awsProfile) => {
      updateWizardData({
        awsProfile,
      });
      goToStep(BEDROCK_STEPS.REGION);
    };
    $[8] = goToStep;
    $[9] = updateWizardData;
    $[10] = X;
  } else X = $[10];
  let U = X;
  if (!A) {
    const H = c.length;
    let F;
    if ($[11] !== c.length) {
      F = plural(c.length, "profile");
      $[11] = c.length;
      $[12] = F;
    } else F = $[12];
    let V;
    if ($[13] !== c.length || $[14] !== F) {
      V = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Found ", H, " ", F, " in ~/.aws/config and ~/.aws/credentials."],
      });
      $[13] = c.length;
      $[14] = F;
      $[15] = V;
    } else V = $[15];
    let options;
    if ($[16] !== c) {
      const mapped = c.map(toProfileOption);
      let I;
      if ($[18] === MEMO_CACHE_SENTINEL) {
        I = {
          label: "Type a different name\u2026",
          value: MANUAL_PROFILE_VALUE,
        };
        $[18] = I;
      } else I = $[18];
      options = [...mapped, I];
      $[16] = c;
      $[17] = options;
    } else options = $[17];
    let defaultValue;
    if ($[19] !== c || $[20] !== wizardData.awsProfile) {
      defaultValue =
        wizardData.awsProfile && c.includes(wizardData.awsProfile) ? wizardData.awsProfile : undefined;
      $[19] = c;
      $[20] = wizardData.awsProfile;
      $[21] = defaultValue;
    } else defaultValue = $[21];
    let onChange;
    if ($[22] !== U) {
      onChange = (value) => {
        if (value === MANUAL_PROFILE_VALUE) E(true);
        else U(value);
      };
      $[22] = U;
      $[23] = onChange;
    } else onChange = $[23];
    let L;
    if ($[24] !== goBack || $[25] !== onChange || $[26] !== options || $[27] !== defaultValue) {
      L = jsxProd_default(ModelSelector, {
        options,
        defaultValue,
        onChange,
        onCancel: goBack,
      });
      $[24] = goBack;
      $[25] = onChange;
      $[26] = options;
      $[27] = defaultValue;
      $[28] = L;
    } else L = $[28];
    let J;
    if ($[29] !== L || $[30] !== V) {
      J = jsxProd_default(WizardDialogLayout, {
        subtitle: "AWS profile",
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [V, L],
        }),
      });
      $[29] = L;
      $[30] = V;
      $[31] = J;
    } else J = $[31];
    return J;
  }
  let H;
  if ($[32] !== U || $[33] !== C) {
    H = () => {
      let trimmed = C.trim();
      if (!trimmed) {
        W("Profile name is required");
        return;
      }
      W(null);
      U(trimmed);
    };
    $[32] = U;
    $[33] = C;
    $[34] = H;
  } else H = $[34];
  let onSubmit = H;
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
  let V;
  if ($[36] === MEMO_CACHE_SENTINEL) {
    V = jsxProd_default(Text, {
      children: "The name from ~/.aws/config (after [profile \u2026]).",
    });
    $[36] = V;
  } else V = $[36];
  let M;
  if ($[37] !== f || $[38] !== c.length || $[39] !== h) {
    M =
      h &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "Found ",
          c.length,
          " profiles \u2014 too many to list.",
          f && ` Prepopulated with "${f}".`,
        ],
      });
    $[37] = f;
    $[38] = c.length;
    $[39] = h;
    $[40] = M;
  } else M = $[40];
  let K;
  if ($[41] === MEMO_CACHE_SENTINEL) {
    K = jsxProd_default(Text, {
      dimColor: true,
      children: "If this is an SSO profile, run `aws sso login --profile NAME` first.",
    });
    $[41] = K;
  } else K = $[41];
  let I;
  if ($[42] !== T || $[43] !== onSubmit || $[44] !== C) {
    I = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TextInput, {
        value: C,
        onChange: v,
        onSubmit,
        placeholder: "my-bedrock-profile",
        columns: 60,
        cursorOffset: T,
        onChangeCursorOffset: _,
        focus: true,
        showCursor: true,
      }),
    });
    $[42] = T;
    $[43] = onSubmit;
    $[44] = C;
    $[45] = I;
  } else I = $[45];
  let L;
  if ($[46] !== D) {
    L =
      D &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error: D,
        }),
      });
    $[46] = D;
    $[47] = L;
  } else L = $[47];
  let J;
  if ($[48] !== I || $[49] !== L || $[50] !== M) {
    J = jsxProd_default(WizardDialogLayout, {
      subtitle: "AWS profile name",
      footerText,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [V, M, K, I, L],
      }),
    });
    $[48] = I;
    $[49] = L;
    $[50] = M;
    $[51] = J;
  } else J = $[51];
  return J;
}
export { MethodStep };
