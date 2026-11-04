function SELF($l0) {
  let $l1 = $l0.create, $l2 = ($l3, $l4) => ($m_as($l0.name, $l4), $l1.call($l0, $l3)), $l5 = ($l6, $l7, $l8, $l9, $l10) => ({ tool: $l2($m_cKt($l6), $l6?.session), call: { parentMessage: $l8, userModified: $l10?.userModified, globLimits: $l10?.globLimits, userTypedShellDispatch: $l10?.userTypedShellDispatch, pdfRenderSignal: $l10?.pdfRenderSignal, gitDiffRead: $l10?.gitDiffRead, ...false, smallResultAsked: $l10?.smallResultAsked, callerLogsSharedEvents: $l10?.callerLogsSharedEvents, timing: $l10?.timing, runEngine: ($l11, $l12) => $l11({ ...$l12, toolUseContext: $l6.permissionRound === void 0 ? $l6 : { ...$l6, permissionRound: void 0 }, canUseTool: $l9 }), ask: $l9 && $l8 ? ($l13, $l14) => {
    let $l15 = $m_Br($l9, $l16, $l14.withdraw === void 0 ? $l6 : { ...$l6, abortController: $m_A7o($l6.abortController, $l14.withdraw) }, $l8, $l13, $l14);
    return $l14.toolUseId === $l6.toolUseId ? $l15 : $l15.finally(() => $m_Obe($l6.session, $l14.toolUseId));
  } : void 0, get toolUseId() {
    return $l6.toolUseId;
  }, get signal() {
    return $l6.abortController.signal;
  }, get permissionPhase() {
    return $l6.permissionPhase;
  }, get permissionRound() {
    return $l6.permissionRound;
  }, abort: ($l17) => $l6.abortController.abort($l17), abortTurn: ($l18) => $m_zM($l6.abortController).abort($l18), onProgress: $l7, get innerCall() {
    return $l6.innerCall;
  }, get shellWallCapMs() {
    return $l6.shellWallCapMs;
  }, get promptShellPluginId() {
    return $l6.promptShellPluginId;
  }, get fileReadingLimits() {
    return $l6.fileReadingLimits;
  }, get sameTurnToolUses() {
    return $l6.sameTurnToolUses;
  }, get remoteCall() {
    return $l6.remoteCall;
  }, get keptBackgroundShells() {
    return $l6.keptBackgroundShells;
  }, get inputFromAnotherMachine() {
    return $l6.inputFromAnotherMachine;
  }, get permissionSurface() {
    return $l6.toolUseId === void 0 ? void 0 : $l6.toolDecisions.get($l6.toolUseId)?.surface;
  } } }), $l19 = { create: ($l20) => $l2($l20, $l20.session), call: ($l21, $l22, $l23, $l24, $l25, $l26) => {
    let $l27 = $m_fse($l22?.session, $l0.name), $l28 = $l26?.runnerCheckedHere !== void 0 && $l27 !== void 0 && $m_is($l22?.session, $l0.name) ? $l26.runnerCheckedHere : $l27;
    if ($l26?.permissionCheckedFor !== void 0 && $l26.permissionCheckedFor !== $l28) return Promise.reject(new $m_Be(`${$l0.name} was not run: where it runs changed after its permission was checked. Send the call again.`, "NOT_RUN"));
    if ($l28) return $m_us($l0, $l28, $l21, $l22.abortController.signal, $l22, $l26, $l24?.message.model);
    let { tool: $l29, call: $l30 } = $l5($l22, $l25, $l24, $l23, $l26);
    return $l29.call($l21, $l30);
  }, validateInput: async ($l31, $l32) => {
    let $l33 = $m_fse($l32?.session, $l0.name);
    if ($l33) {
      let $l34 = $l33.refusedUnasked?.($l31, $l32);
      return $l34 === void 0 ? $m_ls : { result: false, message: $l34, errorCode: 1 };
    }
    let { tool: $l35, call: $l36 } = $l5($l32);
    return $l35.validateInput ? $l35.validateInput($l31, $l36) : { result: true };
  }, checkPermissions: ($l37, $l38) => {
    let $l39 = $m_fse($l38?.session, $l0.name);
    if ($l39) {
      let $l40 = { behavior: "passthrough", message: `${$l0.name} requires permission.` };
      return $l39.checkPermissions === void 0 || $l38.toolUseId === void 0 ? Promise.resolve($l40) : $l39.checkPermissions($l16, $l37, $l38).then(($l41) => $l41 ?? $l40);
    }
    let { tool: $l42, call: $l43 } = $l5($l38);
    return $l42.checkPermissions ? $l42.checkPermissions($l37, $l43) : Promise.resolve({ behavior: "allow", updatedInput: $l37 });
  }, permissionCheckFailureDecision: ($l44, $l45) => {
    if ($m_fse($l45?.session, $l0.name)) return { behavior: "deny", message: `${$l0.name} was not run: its permission check could not be completed.`, decisionReason: { type: "other", reason: "permission check failed" } };
    if (!$m_ad($l1, "permissionCheckFailureDecision")) return;
    let { tool: $l46, call: $l47 } = $l5($l45);
    return $l46.permissionCheckFailureDecision?.($l44, $l47);
  } }, $l16 = Object.assign(Object.defineProperties({ ...$m_id, userFacingName: () => $l0.name }, Object.getOwnPropertyDescriptors($l0)), $l19);
  return $l16;
}
;
