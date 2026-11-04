class $l0 {
  #e = false;
  #t = false;
  #n = false;
  #o = null;
  #r = false;
  #s = void 0;
  #i = false;
  #d = false;
  #u = false;
  #c = false;
  #l = void 0;
  #p = false;
  #h = false;
  #a = null;
  #g = null;
  #S = /* @__PURE__ */ new Map();
  #y = "cli";
  #v = "fresh";
  #f = void 0;
  #m = false;
  #b = false;
  #k = [];
  #R = false;
  #x = false;
  #C = false;
  #P = /* @__PURE__ */ new Set();
  #T = false;
  #w = false;
  #A = false;
  #L = false;
  #M = "none";
  #O = false;
  #F = false;
  #I = false;
  #E = false;
  #H = false;
  #B = void 0;
  #U = void 0;
  #j = void 0;
  #q = void 0;
  #N = void 0;
  #_ = void 0;
  #W = false;
  #G = false;
  #V = false;
  #K = null;
  #J = null;
  #z = true;
  #Q = null;
  #D = false;
  #oe = $m_Me();
  #$ = null;
  #Y = false;
  #X = false;
  #Z = {};
  #ee = null;
  #te = "none";
  #ne = void 0;
  isInteractive() {
    return this.#e;
  }
  isInteractivityDecided() {
    return this.#t;
  }
  isNoDialogLaunch() {
    return this.#n;
  }
  markNoDialogLaunch() {
    this.#n = true;
  }
  replaceIsInteractive($l1) {
    this.#e = $l1, this.#t = true;
  }
  printOutputFormat() {
    return this.#o;
  }
  replacePrintOutputFormat($l2) {
    this.#o = $l2;
  }
  thinkingDisplayExplicit() {
    return this.#r;
  }
  replaceThinkingDisplayExplicit($l3) {
    this.#r = $l3;
  }
  permissionPromptToolName() {
    return this.#s;
  }
  replacePermissionPromptToolName($l4) {
    this.#s = $l4;
  }
  hasStreamingInput() {
    return this.#i;
  }
  replaceHasStreamingInput($l5) {
    this.#i = $l5;
  }
  singleShotPrintSession() {
    return this.#d;
  }
  replaceSingleShotPrintSession($l6) {
    this.#d = $l6;
  }
  printInputClosed() {
    return this.#u;
  }
  markPrintInputClosed() {
    this.#u = true;
  }
  modelOverrideOptOutForSession() {
    return this.#c;
  }
  replaceModelOverrideOptOutForSession($l7) {
    this.#c = $l7;
  }
  rendererMode() {
    return this.#l;
  }
  replaceRendererMode($l8) {
    this.#l = $l8;
  }
  strictToolResultPairing() {
    return this.#p;
  }
  replaceStrictToolResultPairing($l9) {
    this.#p = $l9;
  }
  restrictedSession() {
    return this.#h;
  }
  replaceRestrictedSession($l10) {
    this.#h = $l10;
  }
  workspaceRestrictionState() {
    return this.#a;
  }
  replaceWorkspaceRestrictionState($l11) {
    this.#a = $l11;
  }
  replaceWorkspaceRestrictionUnsubscribe($l12) {
    this.#g?.(), this.#g = $l12;
  }
  restrictedWorkspaceRoots() {
    return this.#S;
  }
  addRestrictedWorkspaceRoot($l13, $l14) {
    this.#S.set($l13, $l14);
  }
  clearRestrictedWorkspaceRoots() {
    this.#S = /* @__PURE__ */ new Map();
  }
  clientType() {
    return this.#y;
  }
  replaceClientType($l15) {
    this.#y = $l15;
  }
  sessionStartType() {
    return this.#v;
  }
  replaceSessionStartType($l16) {
    this.#v = $l16;
  }
  questionPreviewFormat() {
    return this.#f;
  }
  replaceQuestionPreviewFormat($l17) {
    this.#f = $l17;
  }
  extendedQuestionsEnabled() {
    return this.#m;
  }
  replaceExtendedQuestionsEnabled($l18) {
    this.#m = $l18;
  }
  questionOptionDescriptionsOptional() {
    return this.#b;
  }
  replaceQuestionOptionDescriptionsOptional($l19) {
    this.#b = $l19;
  }
  replConfigArgv() {
    return this.#k;
  }
  replaceReplConfigArgv($l20) {
    this.#k = $l20;
  }
  userMsgOptIn() {
    return this.#R;
  }
  replaceUserMsgOptIn($l21) {
    this.#R = $l21;
  }
  searchToolsOptIn() {
    return this.#x;
  }
  replaceSearchToolsOptIn($l22) {
    this.#x = $l22;
  }
  todoToolsOptIn() {
    return this.#C;
  }
  replaceTodoToolsOptIn($l23) {
    this.#C = $l23;
  }
  toolsOmittedByLaunchList() {
    return this.#P;
  }
  replaceToolsOmittedByLaunchList($l24) {
    this.#P = $l24;
  }
  wizardOperatorToolsEnabled() {
    return this.#T;
  }
  replaceWizardOperatorToolsEnabled($l25) {
    this.#T = $l25;
  }
  runnerDeclaredNestedRepositoryDiff() {
    return this.#w;
  }
  replaceRunnerDeclaredNestedRepositoryDiff($l26) {
    this.#w = $l26;
  }
  runnerDeclaredNoRepositoryCheckedOut() {
    return this.#A;
  }
  replaceRunnerDeclaredNoRepositoryCheckedOut($l27) {
    this.#A = $l27;
  }
  runnerDeclaredFreshMachinePerSession() {
    return this.#L;
  }
  replaceRunnerDeclaredFreshMachinePerSession($l28) {
    this.#L = $l28;
  }
  pollEventIngress() {
    return this.#M;
  }
  markPollEventIngress($l29) {
    this.#M = $l29;
  }
  ownEventDeliveryRequested() {
    return this.#O && !this.#F;
  }
  replaceOwnEventDeliveryHeld($l30) {
    this.#F = $l30;
  }
  markOwnEventDeliveryRequested() {
    this.#O = true;
  }
  sdkAgentProgressSummariesEnabled() {
    return this.#I;
  }
  replaceSdkAgentProgressSummariesEnabled($l31) {
    this.#I = $l31;
  }
  sessionPersistenceDisabled() {
    return this.#E;
  }
  replaceSessionPersistenceDisabled($l32) {
    this.#E = $l32;
  }
  diskless() {
    return this.#H;
  }
  replaceDiskless($l33) {
    this.#H = $l33;
  }
  ccrSessionUrl() {
    return this.#B;
  }
  replaceCcrSessionUrl($l34) {
    this.#B = $l34;
  }
  ccrDerivedSurface() {
    return this.#U;
  }
  replaceCcrDerivedSurface($l35) {
    this.#U = $l35;
  }
  autoCompactWindowSurface() {
    return this.#q;
  }
  replaceAutoCompactWindowSurface($l36) {
    this.#q = $l36;
  }
  entrypointOnRequests() {
    return this.#j;
  }
  replaceEntrypointOnRequests($l37) {
    this.#j = $l37;
  }
  coworkEnrollment() {
    return this.#N;
  }
  replaceCoworkEnrollment($l38) {
    this.#N = $l38;
  }
  toolsMachine() {
    return this.#_;
  }
  replaceToolsMachine($l39) {
    this.#_ = $l39;
  }
  sessionBypassPermissionsMode() {
    return this.#W;
  }
  replaceSessionBypassPermissionsMode($l40) {
    this.#W = $l40;
  }
  disableSlashCommands() {
    return this.#G;
  }
  replaceDisableSlashCommands($l41) {
    this.#G = $l41;
  }
  disableFileMentions() {
    return this.#V;
  }
  replaceDisableFileMentions($l42) {
    this.#V = $l42;
  }
  sessionUploadsDir() {
    return this.#K;
  }
  replaceSessionUploadsDir($l43) {
    this.#K = $l43;
  }
  localUploadsRoot() {
    return this.#J;
  }
  replaceLocalUploadsRoot($l44) {
    this.#J = $l44;
  }
  mayForwardHomeSettings() {
    return this.#z;
  }
  replaceMayForwardHomeSettings($l45) {
    this.#z = $l45;
  }
  homeSettingsHostConsent() {
    return this.#Q;
  }
  replaceHomeSettingsHostConsent($l46) {
    this.#Q = $l46;
  }
  scheduledTasksEnabled() {
    return this.#D;
  }
  replaceScheduledTasksEnabled($l47) {
    let $l48 = $l47 && !this.#D;
    if (this.#D = $l47, $l48) this.#oe.emit();
  }
  onScheduledTasksEnabled($l49) {
    return this.#oe.subscribe($l49);
  }
  initJsonSchema() {
    return this.#$;
  }
  replaceInitJsonSchema($l50) {
    this.#$ = $l50;
  }
  cliSessionConfigCarried() {
    return this.#Y;
  }
  replaceCliSessionConfigCarried($l51) {
    this.#Y = $l51;
  }
  forkRestrictedLaunchConfig() {
    return this.#X;
  }
  replaceForkRestrictedLaunchConfig($l52) {
    this.#X = $l52;
  }
  forkReplayLaunchConfig() {
    return this.#Z;
  }
  spareClaimState() {
    return this.#te;
  }
  replaceSpareClaimState($l53) {
    this.#te = $l53;
  }
  spareParkedAtMs() {
    return this.#ne;
  }
  replaceSpareParkedAtMs($l54) {
    this.#ne = $l54;
  }
  replaceForkReplayLaunchConfig($l55) {
    this.#Z = $l55;
  }
  projectConfigRoot() {
    return this.#ee;
  }
  replaceProjectConfigRoot($l56) {
    this.#ee = $l56;
  }
  reset() {
    this.#e = false, this.#t = false, this.#n = false, this.#o = null, this.#te = "none", this.#ne = void 0, this.#r = false, this.#s = void 0, this.#i = false, this.#d = false, this.#u = false, this.#c = false, this.#l = void 0, this.#p = false, this.#h = false, this.#a = null, this.replaceWorkspaceRestrictionUnsubscribe(null), this.#S = /* @__PURE__ */ new Map(), this.#y = "cli", this.#v = "fresh", this.#f = void 0, this.#m = false, this.#b = false, this.#k = [], this.#R = false, this.#x = false, this.#C = false, this.#P = /* @__PURE__ */ new Set(), this.#T = false, this.#w = false, this.#A = false, this.#L = false, this.#M = "none", this.#O = false, this.#F = false, this.#I = false, this.#E = false, this.#H = false, this.#B = void 0, this.#U = void 0, this.#q = void 0, this.#j = void 0, this.#N = void 0, this.#_ = void 0, this.#W = false, this.#G = false, this.#V = false, this.#K = null, this.#J = null, this.#z = true, this.#Q = null, this.#D = false, this.#$ = null, this.#Y = false, this.#X = false, this.#Z = {}, this.#ee = null;
  }
}
;
