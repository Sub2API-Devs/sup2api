class $l0 {
  #e = false;
  #t = null;
  #n = false;
  #o = void 0;
  #r = false;
  #s = false;
  #i = false;
  #d = false;
  #u = void 0;
  #l = false;
  #c = false;
  #p = null;
  #a = null;
  #h = /* @__PURE__ */ new Map();
  #g = "cli";
  #m = "fresh";
  #y = void 0;
  #S = false;
  #f = false;
  #v = [];
  #b = false;
  #k = false;
  #R = false;
  #C = /* @__PURE__ */ new Set();
  #P = false;
  #x = false;
  #M = false;
  #w = "none";
  #A = false;
  #T = false;
  #L = false;
  #O = false;
  #F = false;
  #I = void 0;
  #D = void 0;
  #H = void 0;
  #B = void 0;
  #U = void 0;
  #j = false;
  #q = false;
  #N = false;
  #_ = null;
  #W = null;
  #G = true;
  #V = null;
  #E = false;
  #Z = $m_Me();
  #K = null;
  #J = false;
  #z = false;
  #Q = {};
  #$ = null;
  #Y = "none";
  #X = void 0;
  isInteractive() {
    return this.#e;
  }
  replaceIsInteractive($l1) {
    this.#e = $l1;
  }
  printOutputFormat() {
    return this.#t;
  }
  replacePrintOutputFormat($l2) {
    this.#t = $l2;
  }
  thinkingDisplayExplicit() {
    return this.#n;
  }
  replaceThinkingDisplayExplicit($l3) {
    this.#n = $l3;
  }
  permissionPromptToolName() {
    return this.#o;
  }
  replacePermissionPromptToolName($l4) {
    this.#o = $l4;
  }
  hasStreamingInput() {
    return this.#r;
  }
  replaceHasStreamingInput($l5) {
    this.#r = $l5;
  }
  singleShotPrintSession() {
    return this.#s;
  }
  replaceSingleShotPrintSession($l6) {
    this.#s = $l6;
  }
  printInputClosed() {
    return this.#i;
  }
  markPrintInputClosed() {
    this.#i = true;
  }
  modelOverrideOptOutForSession() {
    return this.#d;
  }
  replaceModelOverrideOptOutForSession($l7) {
    this.#d = $l7;
  }
  rendererMode() {
    return this.#u;
  }
  replaceRendererMode($l8) {
    this.#u = $l8;
  }
  strictToolResultPairing() {
    return this.#l;
  }
  replaceStrictToolResultPairing($l9) {
    this.#l = $l9;
  }
  restrictedSession() {
    return this.#c;
  }
  replaceRestrictedSession($l10) {
    this.#c = $l10;
  }
  workspaceRestrictionState() {
    return this.#p;
  }
  replaceWorkspaceRestrictionState($l11) {
    this.#p = $l11;
  }
  replaceWorkspaceRestrictionUnsubscribe($l12) {
    this.#a?.(), this.#a = $l12;
  }
  restrictedWorkspaceRoots() {
    return this.#h;
  }
  addRestrictedWorkspaceRoot($l13, $l14) {
    this.#h.set($l13, $l14);
  }
  clearRestrictedWorkspaceRoots() {
    this.#h = /* @__PURE__ */ new Map();
  }
  clientType() {
    return this.#g;
  }
  replaceClientType($l15) {
    this.#g = $l15;
  }
  sessionStartType() {
    return this.#m;
  }
  replaceSessionStartType($l16) {
    this.#m = $l16;
  }
  questionPreviewFormat() {
    return this.#y;
  }
  replaceQuestionPreviewFormat($l17) {
    this.#y = $l17;
  }
  extendedQuestionsEnabled() {
    return this.#S;
  }
  replaceExtendedQuestionsEnabled($l18) {
    this.#S = $l18;
  }
  questionOptionDescriptionsOptional() {
    return this.#f;
  }
  replaceQuestionOptionDescriptionsOptional($l19) {
    this.#f = $l19;
  }
  replConfigArgv() {
    return this.#v;
  }
  replaceReplConfigArgv($l20) {
    this.#v = $l20;
  }
  userMsgOptIn() {
    return this.#b;
  }
  replaceUserMsgOptIn($l21) {
    this.#b = $l21;
  }
  searchToolsOptIn() {
    return this.#k;
  }
  replaceSearchToolsOptIn($l22) {
    this.#k = $l22;
  }
  todoToolsOptIn() {
    return this.#R;
  }
  replaceTodoToolsOptIn($l23) {
    this.#R = $l23;
  }
  toolsOmittedByLaunchList() {
    return this.#C;
  }
  replaceToolsOmittedByLaunchList($l24) {
    this.#C = $l24;
  }
  wizardOperatorToolsEnabled() {
    return this.#P;
  }
  replaceWizardOperatorToolsEnabled($l25) {
    this.#P = $l25;
  }
  runnerDeclaredNestedRepositoryDiff() {
    return this.#x;
  }
  replaceRunnerDeclaredNestedRepositoryDiff($l26) {
    this.#x = $l26;
  }
  runnerDeclaredNoRepositoryCheckedOut() {
    return this.#M;
  }
  replaceRunnerDeclaredNoRepositoryCheckedOut($l27) {
    this.#M = $l27;
  }
  pollEventIngress() {
    return this.#w;
  }
  markPollEventIngress($l28) {
    this.#w = $l28;
  }
  ownEventDeliveryRequested() {
    return this.#A && !this.#T;
  }
  replaceOwnEventDeliveryHeld($l29) {
    this.#T = $l29;
  }
  markOwnEventDeliveryRequested() {
    this.#A = true;
  }
  sdkAgentProgressSummariesEnabled() {
    return this.#L;
  }
  replaceSdkAgentProgressSummariesEnabled($l30) {
    this.#L = $l30;
  }
  sessionPersistenceDisabled() {
    return this.#O;
  }
  replaceSessionPersistenceDisabled($l31) {
    this.#O = $l31;
  }
  diskless() {
    return this.#F;
  }
  replaceDiskless($l32) {
    this.#F = $l32;
  }
  ccrSessionUrl() {
    return this.#I;
  }
  replaceCcrSessionUrl($l33) {
    this.#I = $l33;
  }
  ccrDerivedSurface() {
    return this.#D;
  }
  replaceCcrDerivedSurface($l34) {
    this.#D = $l34;
  }
  entrypointOnRequests() {
    return this.#H;
  }
  replaceEntrypointOnRequests($l35) {
    this.#H = $l35;
  }
  coworkEnrollment() {
    return this.#B;
  }
  replaceCoworkEnrollment($l36) {
    this.#B = $l36;
  }
  toolsMachine() {
    return this.#U;
  }
  replaceToolsMachine($l37) {
    this.#U = $l37;
  }
  sessionBypassPermissionsMode() {
    return this.#j;
  }
  replaceSessionBypassPermissionsMode($l38) {
    this.#j = $l38;
  }
  disableSlashCommands() {
    return this.#q;
  }
  replaceDisableSlashCommands($l39) {
    this.#q = $l39;
  }
  disableFileMentions() {
    return this.#N;
  }
  replaceDisableFileMentions($l40) {
    this.#N = $l40;
  }
  sessionUploadsDir() {
    return this.#_;
  }
  replaceSessionUploadsDir($l41) {
    this.#_ = $l41;
  }
  localUploadsRoot() {
    return this.#W;
  }
  replaceLocalUploadsRoot($l42) {
    this.#W = $l42;
  }
  mayForwardHomeSettings() {
    return this.#G;
  }
  replaceMayForwardHomeSettings($l43) {
    this.#G = $l43;
  }
  homeSettingsHostConsent() {
    return this.#V;
  }
  replaceHomeSettingsHostConsent($l44) {
    this.#V = $l44;
  }
  scheduledTasksEnabled() {
    return this.#E;
  }
  replaceScheduledTasksEnabled($l45) {
    let $l46 = $l45 && !this.#E;
    if (this.#E = $l45, $l46) this.#Z.emit();
  }
  onScheduledTasksEnabled($l47) {
    return this.#Z.subscribe($l47);
  }
  initJsonSchema() {
    return this.#K;
  }
  replaceInitJsonSchema($l48) {
    this.#K = $l48;
  }
  cliSessionConfigCarried() {
    return this.#J;
  }
  replaceCliSessionConfigCarried($l49) {
    this.#J = $l49;
  }
  forkRestrictedLaunchConfig() {
    return this.#z;
  }
  replaceForkRestrictedLaunchConfig($l50) {
    this.#z = $l50;
  }
  forkReplayLaunchConfig() {
    return this.#Q;
  }
  spareClaimState() {
    return this.#Y;
  }
  replaceSpareClaimState($l51) {
    this.#Y = $l51;
  }
  spareParkedAtMs() {
    return this.#X;
  }
  replaceSpareParkedAtMs($l52) {
    this.#X = $l52;
  }
  replaceForkReplayLaunchConfig($l53) {
    this.#Q = $l53;
  }
  projectConfigRoot() {
    return this.#$;
  }
  replaceProjectConfigRoot($l54) {
    this.#$ = $l54;
  }
  reset() {
    this.#e = false, this.#t = null, this.#Y = "none", this.#X = void 0, this.#n = false, this.#o = void 0, this.#r = false, this.#s = false, this.#i = false, this.#d = false, this.#u = void 0, this.#l = false, this.#c = false, this.#p = null, this.replaceWorkspaceRestrictionUnsubscribe(null), this.#h = /* @__PURE__ */ new Map(), this.#g = "cli", this.#m = "fresh", this.#y = void 0, this.#S = false, this.#f = false, this.#v = [], this.#b = false, this.#k = false, this.#R = false, this.#C = /* @__PURE__ */ new Set(), this.#P = false, this.#x = false, this.#M = false, this.#w = "none", this.#A = false, this.#T = false, this.#L = false, this.#O = false, this.#F = false, this.#I = void 0, this.#D = void 0, this.#H = void 0, this.#B = void 0, this.#U = void 0, this.#j = false, this.#q = false, this.#N = false, this.#_ = null, this.#W = null, this.#G = true, this.#V = null, this.#E = false, this.#K = null, this.#J = false, this.#z = false, this.#Q = {}, this.#$ = null;
  }
}
;
