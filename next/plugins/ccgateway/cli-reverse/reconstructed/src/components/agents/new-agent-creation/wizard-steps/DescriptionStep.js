/**
 * components/agents/new-agent-creation/wizard-steps/DescriptionStep.tsx
 *
 * 向导描述步骤；实际内容为 Bedrock 区域输入（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/DescriptionStep.tsx
 * pieces: chunk-3msz77wt.js (1)
 * attribution: callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../../wizard/useWizard.js";
import { useState } from "../../../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../../../keybindings/useKeybinding.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { TextInput } from "../../../TextInput.js";
import { ErrorText } from "../../../ErrorText.js";
import { WizardDialogLayout } from "../../../wizard/WizardDialogLayout.js";

//@ chunk-3msz77wt.js:19296-20653 callgraph-fingerprint (2.1.88 match: DescriptionStep, 0.579)
function DescriptionStep() {
  let $ = useMemoCache(17);
  let { goBack, goNext, updateWizardData, wizardData } = useWizard();
  let [region, setWhenToUse] = useState(wizardData.region ?? "us-east-1");
  let [cursorOffset, setCursorOffset] = useState(region.length);
  let [error, setError] = useState(null);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t0 = {
      context: "Settings",
    };
    $[0] = t0;
  } else t0 = $[0];
  useKeybinding("confirm:no", goBack, t0);
  let handleSubmit;
  if ($[1] !== goNext || $[2] !== updateWizardData || $[3] !== region) {
    handleSubmit = () => {
      let trimmedValue = region.trim();
      if (!trimmedValue) {
        setError("Region is required");
        return;
      }
      setError(null);
      updateWizardData({
        region: trimmedValue,
      });
      goNext();
    };
    $[1] = goNext;
    $[2] = updateWizardData;
    $[3] = region;
    $[4] = handleSubmit;
  } else handleSubmit = $[4];
  let handleSubmit_2 = handleSubmit;
  let footerText;
  if ($[5] === MEMO_CACHE_SENTINEL) {
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
    $[5] = footerText;
  } else footerText = $[5];
  let introText;
  let regionNote;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    introText = jsxProd_default(Text, {
      children: "Where your Bedrock models are enabled.",
    });
    regionNote = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Claude Code reads this from AWS_REGION, not ~/.aws/config \u2014 set it explicitly even if your profile has a region.",
    });
    $[6] = introText;
    $[7] = regionNote;
  } else {
    introText = $[6];
    regionNote = $[7];
  }
  let t6;
  if ($[8] !== cursorOffset || $[9] !== handleSubmit_2 || $[10] !== region) {
    t6 = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TextInput, {
        value: region,
        onChange: setWhenToUse,
        onSubmit: handleSubmit_2,
        placeholder: "us-east-1",
        columns: 40,
        cursorOffset,
        onChangeCursorOffset: setCursorOffset,
        focus: true,
        showCursor: true,
      }),
    });
    $[8] = cursorOffset;
    $[9] = handleSubmit_2;
    $[10] = region;
    $[11] = t6;
  } else t6 = $[11];
  let errorBox;
  if ($[12] !== error) {
    errorBox =
      error &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error,
        }),
      });
    $[12] = error;
    $[13] = errorBox;
  } else errorBox = $[13];
  let t8;
  if ($[14] !== t6 || $[15] !== errorBox) {
    t8 = jsxProd_default(WizardDialogLayout, {
      subtitle: "AWS region",
      footerText,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [introText, regionNote, t6, errorBox],
      }),
    });
    $[14] = t6;
    $[15] = errorBox;
    $[16] = t8;
  } else t8 = $[16];
  return t8;
}
export { DescriptionStep };
