/**
 * components/EffortCallout.tsx
 *
 * effort 提示用的 suggestion 色文字组件（另混入一个高亮分段工具函数，见过程文档）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/EffortCallout.tsx
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: affinity 1, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { RECENT_INPUT_GUARD_MS as RECENT_INPUT_GUARD_MS_3 } from "../hooks/useRecentInputGuard.js";
import { sanitizeOneLineLabel, LabelValueRow } from "./EffortMediumNudgeDialog.js";
import { isUnattendedInteractiveSession } from "../utils/concurrentSessions.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { PermissionDialog_2 } from "./permissions/PermissionDialog.js";
import { Box, Text } from "../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "./agents/ModelSelector.js";

//@ chunk-czq1j3j2.js:1143277-1143291 affinity
var DESKTOP_UPSELL_TIMEOUT_MS = 30000;
//@ chunk-czq1j3j2.js:1143291-1145196 callgraph-fingerprint (2.1.88 match: EffortCallout, 0.154)
function EffortCallout(props) {
  let $ = useMemoCache(33);
  let {
    title,
    intro,
    pluginName,
    pluginDescription,
    marketplaceName,
    extraIdentityRow,
    question,
    options,
    unansweredResponse,
    onResponse,
  } = props;
  let onDoneRef = useTimeout(RECENT_INPUT_GUARD_MS_3);
  let identityRows = [
    {
      label: "Plugin:",
      value: pluginName,
      fallback: "(unnamed plugin)",
      suffix: "",
    },
    {
      label: "Marketplace:",
      value: marketplaceName,
      fallback: "(unnamed marketplace)",
      suffix: "",
    },
    ...(extraIdentityRow ? [extraIdentityRow] : []),
  ];
  let descriptionLabelCached;
  if ($[0] !== pluginDescription) {
    descriptionLabelCached =
      pluginDescription === undefined ? undefined : sanitizeOneLineLabel(pluginDescription);
    $[0] = pluginDescription;
    $[1] = descriptionLabelCached;
  } else descriptionLabelCached = $[1];
  let descriptionLabel = descriptionLabelCached;
  let timeoutHandlerCached;
  if ($[2] !== onResponse || $[3] !== unansweredResponse) {
    timeoutHandlerCached = () =>
      onResponse(isUnattendedInteractiveSession() ? "cancelled" : unansweredResponse);
    $[2] = onResponse;
    $[3] = unansweredResponse;
    $[4] = timeoutHandlerCached;
  } else timeoutHandlerCached = $[4];
  let timeoutDeps;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    timeoutDeps = [];
    $[5] = timeoutDeps;
  } else timeoutDeps = $[5];
  useTimeout(timeoutHandlerCached, DESKTOP_UPSELL_TIMEOUT_MS, timeoutDeps);
  let answerCached;
  if ($[6] !== onDoneRef || $[7] !== onResponse) {
    answerCached = function handleAnswer(_unused) {
      if (!onDoneRef) {
        return;
      }
      if (isUnattendedInteractiveSession()) {
        onResponse("cancelled");
        return;
      }
      onResponse(_unused);
    };
    $[6] = onDoneRef;
    $[7] = onResponse;
    $[8] = answerCached;
  } else answerCached = $[8];
  let answer = answerCached;
  const DialogComponent = PermissionDialog_2;
  const BoxComponent = Box;
  const flexDirection = "column";
  const paddingX = 2;
  const paddingY = 1;
  let introElement;
  if ($[9] !== intro) {
    introElement = jsxProd_default(Box, {
      marginBottom: 1,
      children: intro,
    });
    $[9] = intro;
    $[10] = introElement;
  } else introElement = $[10];
  const mapped = identityRows.map(LabelValueRow);
  let descriptionRow;
  if ($[11] !== descriptionLabel) {
    descriptionRow =
      descriptionLabel &&
      jsxProd_default_2(Box, {
        children: [
          jsxProd_default(Box, {
            flexShrink: 0,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: "Description:",
            }),
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            wrap: "truncate-end",
            children: [" ", descriptionLabel],
          }),
        ],
      });
    $[11] = descriptionLabel;
    $[12] = descriptionRow;
  } else descriptionRow = $[12];
  let questionElement;
  if ($[13] !== question) {
    questionElement = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        children: question,
      }),
    });
    $[13] = question;
    $[14] = questionElement;
  } else questionElement = $[14];
  const isDisabled = !onDoneRef;
  let onCancel;
  if ($[15] !== answer) {
    onCancel = () => answer("no");
    $[15] = answer;
    $[16] = onCancel;
  } else onCancel = $[16];
  let selectorElement;
  if ($[17] !== options || $[18] !== answer || $[19] !== isDisabled || $[20] !== onCancel) {
    selectorElement = jsxProd_default(Box, {
      children: jsxProd_default(ModelSelector, {
        options,
        isDisabled,
        onChange: answer,
        onCancel,
      }),
    });
    $[17] = options;
    $[18] = answer;
    $[19] = isDisabled;
    $[20] = onCancel;
    $[21] = selectorElement;
  } else selectorElement = $[21];
  let children;
  if (
    $[22] !== BoxComponent ||
    $[23] !== descriptionRow ||
    $[24] !== questionElement ||
    $[25] !== selectorElement ||
    $[26] !== introElement ||
    $[27] !== mapped
  ) {
    children = jsxProd_default_2(BoxComponent, {
      flexDirection,
      paddingX,
      paddingY,
      children: [introElement, mapped, descriptionRow, questionElement, selectorElement],
    });
    $[22] = BoxComponent;
    $[23] = descriptionRow;
    $[24] = questionElement;
    $[25] = selectorElement;
    $[26] = introElement;
    $[27] = mapped;
    $[28] = children;
  } else children = $[28];
  let dialogElement;
  if ($[29] !== DialogComponent || $[30] !== children || $[31] !== title) {
    dialogElement = jsxProd_default(DialogComponent, {
      title,
      children,
    });
    $[29] = DialogComponent;
    $[30] = children;
    $[31] = title;
    $[32] = dialogElement;
  } else dialogElement = $[32];
  return dialogElement;
}
export { EffortCallout };
