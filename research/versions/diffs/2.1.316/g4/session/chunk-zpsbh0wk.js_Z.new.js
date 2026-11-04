class $l0 {
  #e = false;
  #t = false;
  #n = false;
  #o = false;
  #r = false;
  #s = false;
  #i = false;
  #d = false;
  #u = false;
  #c = false;
  #l = false;
  #p = void 0;
  #h = false;
  #a = void 0;
  #g = false;
  #S = false;
  #y = null;
  #v = null;
  #f = null;
  #m = false;
  #b = null;
  #k = false;
  #R = false;
  #x = false;
  #C = false;
  #P = false;
  #T = void 0;
  #w = void 0;
  #A = void 0;
  #L = void 0;
  #M = null;
  #O = null;
  onboardingShownThisSession() {
    return this.#e;
  }
  replaceOnboardingShownThisSession($l1) {
    this.#e = $l1;
  }
  lspRecommendationShownThisSession() {
    return this.#t;
  }
  replaceLspRecommendationShownThisSession($l2) {
    this.#t = $l2;
  }
  sessionTrustAccepted() {
    return this.#n;
  }
  replaceSessionTrustAccepted($l3) {
    this.#n = $l3;
  }
  homeTrustDialogAccepted() {
    return this.#o;
  }
  replaceHomeTrustDialogAccepted($l4) {
    this.#o = $l4;
  }
  hasExitedPlanMode() {
    return this.#r;
  }
  replaceHasExitedPlanMode($l5) {
    this.#r = $l5;
  }
  needsPlanModeExitAttachment() {
    return this.#s;
  }
  replaceNeedsPlanModeExitAttachment($l6) {
    this.#s = $l6;
  }
  needsAutoModeExitAttachment() {
    return this.#i;
  }
  replaceNeedsAutoModeExitAttachment($l7) {
    this.#i = $l7;
  }
  memoryToggledOff() {
    return this.#d;
  }
  replaceMemoryToggledOff($l8) {
    this.#d = $l8;
  }
  autoMemoryOffThisSession() {
    return this.#u;
  }
  replaceAutoMemoryOffThisSession($l9) {
    this.#u = $l9;
  }
  memoryPausedByCommand() {
    return this.#l;
  }
  replaceMemoryPausedByCommand($l10) {
    this.#l = $l10;
  }
  accountMemorySessionMode() {
    return this.#p;
  }
  replaceAccountMemorySessionMode($l11, $l12 = false) {
    this.#p = $l11, this.#h = $l12 && $l11 !== void 0;
  }
  accountMemorySessionModeRestored() {
    return this.#h;
  }
  accountMemoryLaunchMode() {
    return this.#a;
  }
  replaceAccountMemoryLaunchMode($l13) {
    this.#a = $l13;
  }
  restoredMemoryPause() {
    return this.#g;
  }
  replaceRestoredMemoryPause($l14) {
    this.#g = $l14;
  }
  restoredAutoMemoryOff() {
    return this.#c;
  }
  replaceRestoredAutoMemoryOff($l15) {
    this.#c = $l15;
  }
  teardownUnwindRequested() {
    return this.#m;
  }
  replaceTeardownUnwindRequested($l16) {
    this.#m = $l16;
  }
  backgroundAutoModeSetupInFlight() {
    return this.#S;
  }
  replaceBackgroundAutoModeSetupInFlight($l17) {
    this.#S = $l17;
  }
  deferredToolStubGateLatch() {
    return this.#y;
  }
  replaceDeferredToolStubGateLatch($l18) {
    this.#y = $l18;
  }
  verifySkillRolloutGateLatch() {
    return this.#v;
  }
  replaceVerifySkillRolloutGateLatch($l19) {
    this.#v = $l19;
  }
  commitSkillRolloutGateLatch() {
    return this.#f;
  }
  replaceCommitSkillRolloutGateLatch($l20) {
    this.#f = $l20;
  }
  memoryToolsShapeLatch() {
    return this.#b;
  }
  replaceMemoryToolsShapeLatch($l21) {
    this.#b = $l21;
  }
  proposeGoalAvailabilityLogged() {
    return this.#k;
  }
  markProposeGoalAvailabilityLogged() {
    this.#k = true;
  }
  activeRoutine() {
    return this.#A;
  }
  replaceActiveRoutine($l22) {
    this.#A = $l22;
  }
  inheritedTeamName() {
    return this.#L;
  }
  replaceInheritedTeamName($l23) {
    this.#L = $l23;
  }
  teleportedSessionInfo() {
    return this.#M;
  }
  replaceTeleportedSessionInfo($l24) {
    this.#M = $l24;
  }
  markFirstTeleportMessageLogged() {
    if (this.#M) this.#M.hasLoggedFirstMessage = true;
  }
  cachedClaudeMdContent() {
    return this.#O;
  }
  replaceCachedClaudeMdContent($l25) {
    this.#O = $l25;
  }
  accountSkillsSyncEnabled() {
    return this.#R;
  }
  replaceAccountSkillsSyncEnabled($l26) {
    this.#R = $l26;
  }
  skillsSyncVetoed() {
    return this.#x;
  }
  replaceSkillsSyncVetoed($l27) {
    this.#x = $l27;
  }
  accountPluginsSyncEnabled() {
    return this.#C;
  }
  replaceAccountPluginsSyncEnabled($l28) {
    this.#C = $l28;
  }
  pluginsSyncVetoed() {
    return this.#P;
  }
  replacePluginsSyncVetoed($l29) {
    this.#P = $l29;
  }
  armPendingContextCompacted($l30, $l31) {
    this.#T = $l30, this.#w = $l31;
  }
  consumePendingContextCompacted() {
    let $l32 = this.#T;
    return this.#T = void 0, $l32;
  }
  forgetPendingContextCompacted() {
    this.#T = void 0, this.#w = void 0;
  }
  responseBeforeCompaction() {
    return this.#w;
  }
  forgetResponseBeforeCompaction() {
    this.#w = void 0;
  }
  reset() {
    this.#R = false, this.#x = false, this.#C = false, this.#P = false, this.#e = false, this.#t = false, this.#n = false, this.#o = false, this.#r = false, this.#s = false, this.#i = false, this.#d = false, this.#u = false, this.#l = false, this.#p = void 0, this.#h = false, this.#a = void 0, this.#g = false, this.#c = false, this.#m = false, this.#S = false, this.#y = null, this.#v = null, this.#f = null, this.#b = null, this.#k = false, this.#A = void 0, this.#L = void 0, this.#M = null, this.#O = null, this.#T = void 0, this.#w = void 0;
  }
}
;
