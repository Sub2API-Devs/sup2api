function SELF($l0, $l1) {
  let $l2 = $l1.bodyModel ?? $l1.model, $l3 = $m_$n($l2), $l4 = $l1.keepForeignThinking ?? "none", $l5 = $m_wSn($l0, $l3, $l4), $l6 = $l4 !== "none" && $l0.some(($l7) => $l7.type === "assistant" && $m_QMe($l7, $l3) && $m_gtt($l7, $l3, $l4) && Array.isArray($l7.message.content) && $l7.message.content.some($m_SVn)), $l8 = $m_lnr($l2, void 0) || $m_Hx($l2) || $l1.betas.includes($m_nE) || $m_oEt($l2) !== null || $m_Qtr($l2), $l9 = $m_L$t($l0, $l1.reminderFold), $l10 = $m_XT($l0, $l1.echoWireToolInputs), $l11 = $m_ptt($l5), $l12 = ($l13, $l14) => {
    if (!$l1.useToolSearch) $l13 = $l13.map(($l15) => {
      switch ($l15.type) {
        case "user":
          return $m_ftt($l15);
        case "assistant":
          return $m_SSn($l15);
        default:
          return $l15;
      }
    });
    if ($l13 = $m_TSn($l13, { reminderFold: $l9, textsToFold: $l11, keyedRemindersStaySiblings: $l14 !== void 0 && $m_k9($l14) }), !$l1.advisorModel) $l13 = $m_tT($l13);
    if ($l1.stripWebSearch) $l13 = $m_G2($l13).messages;
    return $m_mSn($l13, Math.min($l8 ? $m_sui : $m_oui, $l1.mediaItemLimit ?? 1 / 0), $m_M7o, $m_okr(), $m_H7o, $m_rkr());
  }, $l16 = $l1.accountMemoryWithheld ?? $m__8n(), $l17 = { accountMemoryWithheld: $l16, preserveTrailingThinking: $l1.resumeIncompleteThinking, onSessionNoticeRender: $m_kEt, onDeclaredRoundRender: $m_eRt, echoWireToolInputs: $l10, ingestPool: $l1.ingestPool, echoApiBlockOrder: $m_bv(), ...$l1.deferredToolReferencePlan && { keptToolNames: new Set($l1.deferredToolReferencePlan.kept.keys()), strippedToolReferenceKeys: $l1.deferredToolReferencePlan.strippedReferenceKeys }, ...$l1.declaredToolNames && { declaredToolNames: $l1.declaredToolNames }, surfaceLateToolAdditions: $l1.betas.includes($m_GS) && $m_XCe($l2), advisorToolChanges: $l1.advisorDeferred === true && $l1.advisorModel !== void 0 && $l1.betas.includes($m_GS) && $m_XCe($l2), deferredWireToolNames: $l1.deferredWireToolNames, nameOnlyAnnouncements: $l1.nameOnlyAnnouncements, inlineToolDefinitions: $l1.byValueNames !== void 0 && $l1.byValueNames.size > 0 && $l1.betas.includes($m_uS) && $m_XCe($l2) ? $l1.byValueNames : void 0, withoutAttachmentHooks: $l1.withoutAttachmentHooks, ...$l1.pollEventsAsText === true && { pollEventsAsText: true }, thinkingStripPlan: $l1.thinkingStripPlan, advisorStripPlan: $l1.advisorStripPlan, keptReminders: $l1.keptReminders === true && $l1.betas.includes($m_GV), reminderFold: $l9 }, $l18 = $l1.midConvLatchedOff ? void 0 : $l2, $l19 = $m_UC($l5, $l1.tools, $l18, $l17);
  $m_y8n($l19, $m_ld($l1.model).maxBase64Size), $m_og("query_message_normalization_end"), $l19 = $m_ARe($l12($l19, $l18), $l17.echoApiBlockOrder, $l17.preserveTrailingThinking);
  let $l20 = $l1.betas.includes($m_Nz), $l21 = $m_Xe($l2), $l22 = { effort: $l20 && $m_n_n($l2, $l21) ? $l1.perTurnEffort : void 0, now: $l20 && $l1.betas.includes($m_M5) && $m_CVr($l2, $l21) ? $l1.perTurnNow : void 0 }, $l23 = ($l24) => $l22.effort === void 0 && $l22.now === void 0 ? $l24 : $m_Ayn($l24, $l22);
  $l19 = $l23($l19);
  let $l25 = null;
  if (!$l1.midConvLatchedOff && ($l1.betas.includes($m_pI) || $l20)) {
    let $l26 = $l19;
    $l25 = $l26.some(($l27) => $l27.type === "api_system") ? () => $m_ARe($l12($m_UC($l5, $l1.tools, void 0, $l17), void 0), $l17.echoApiBlockOrder, $l17.preserveTrailingThinking) : () => $l26;
  }
  let $l28 = null;
  if (($l17.surfaceLateToolAdditions || $l17.advisorToolChanges) && $l19.some(($l29) => $l29.type === "api_system" && (($l29.toolAdditions?.length ?? 0) > 0 || ($l29.toolRemovals?.length ?? 0) > 0))) $l28 = () => $l23($l12($m_UC($l5, $l1.tools, $l18, { ...$l17, surfaceLateToolAdditions: false, advisorToolChanges: false, inlineToolDefinitions: void 0 }), $l18));
  let $l30 = null;
  if ($l17.inlineToolDefinitions !== void 0 && $l19.some(($l31) => $l31.type === "api_system" && $l31.toolDefinitions !== void 0)) $l30 = () => $l23($l12($m_UC($l5, $l1.tools, $l18, { ...$l17, inlineToolDefinitions: void 0, nameOnlyAnnouncements: /* @__PURE__ */ new Set([...$l17.nameOnlyAnnouncements ?? [], ...$l1.byValueAnnouncements ?? []]) }), $l18));
  return { messagesPreNormalize: $l5, messagesForAPI: $l19, accountMemoryEpoch: $m_OFo($l5, $l16, $m__V(() => $l1.tools)).epoch, midConvFallback: $l25, toolChangeFallback: $l28, inlineToolsFallback: $l30, keptForeignSignatures: $l6, blocksEligible: $l17.surfaceLateToolAdditions === true };
}
;
