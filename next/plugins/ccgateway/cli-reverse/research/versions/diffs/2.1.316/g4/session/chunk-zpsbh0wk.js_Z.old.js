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
  #l = false;
  #c = false;
  #p = void 0;
  #a = false;
  #h = void 0;
  #g = false;
  #m = false;
  #y = null;
  #S = null;
  #f = null;
  #v = false;
  #b = null;
  #k = false;
  #R = false;
  #C = false;
  #P = false;
  #x = false;
  #M = void 0;
  #w = void 0;
  #A = void 0;
  #T = null;
  #L = null;
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
    return this.#c;
  }
  replaceMemoryPausedByCommand($l10) {
    this.#c = $l10;
  }
  accountMemorySessionMode() {
    return this.#p;
  }
  replaceAccountMemorySessionMode($l11, $l12 = false) {
    this.#p = $l11, this.#a = $l12 && $l11 !== void 0;
  }
  accountMemorySessionModeRestored() {
    return this.#a;
  }
  accountMemoryLaunchMode() {
    return this.#h;
  }
  replaceAccountMemoryLaunchMode($l13) {
    this.#h = $l13;
  }
  restoredMemoryPause() {
    return this.#g;
  }
  replaceRestoredMemoryPause($l14) {
    this.#g = $l14;
  }
  restoredAutoMemoryOff() {
    return this.#l;
  }
  replaceRestoredAutoMemoryOff($l15) {
    this.#l = $l15;
  }
  teardownUnwindRequested() {
    return this.#v;
  }
  replaceTeardownUnwindRequested($l16) {
    this.#v = $l16;
  }
  backgroundAutoModeSetupInFlight() {
    return this.#m;
  }
  replaceBackgroundAutoModeSetupInFlight($l17) {
    this.#m = $l17;
  }
  deferredToolStubGateLatch() {
    return this.#y;
  }
  replaceDeferredToolStubGateLatch($l18) {
    this.#y = $l18;
  }
  verifySkillRolloutGateLatch() {
    return this.#S;
  }
  replaceVerifySkillRolloutGateLatch($l19) {
    this.#S = $l19;
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
    return this.#w;
  }
  replaceActiveRoutine($l22) {
    this.#w = $l22;
  }
  inheritedTeamName() {
    return this.#A;
  }
  replaceInheritedTeamName($l23) {
    this.#A = $l23;
  }
  teleportedSessionInfo() {
    return this.#T;
  }
  replaceTeleportedSessionInfo($l24) {
    this.#T = $l24;
  }
  markFirstTeleportMessageLogged() {
    if (this.#T) this.#T.hasLoggedFirstMessage = true;
  }
  cachedClaudeMdContent() {
    return this.#L;
  }
  replaceCachedClaudeMdContent($l25) {
    this.#L = $l25;
  }
  accountSkillsSyncEnabled() {
    return this.#R;
  }
  replaceAccountSkillsSyncEnabled($l26) {
    this.#R = $l26;
  }
  skillsSyncVetoed() {
    return this.#C;
  }
  replaceSkillsSyncVetoed($l27) {
    this.#C = $l27;
  }
  accountPluginsSyncEnabled() {
    return this.#P;
  }
  replaceAccountPluginsSyncEnabled($l28) {
    this.#P = $l28;
  }
  pluginsSyncVetoed() {
    return this.#x;
  }
  replacePluginsSyncVetoed($l29) {
    this.#x = $l29;
  }
  armPendingContextCompacted($l30) {
    this.#M = $l30;
  }
  consumePendingContextCompacted() {
    let $l31 = this.#M;
    return this.#M = void 0, $l31;
  }
  forgetPendingContextCompacted() {
    this.#M = void 0;
  }
  reset() {
    this.#R = false, this.#C = false, this.#P = false, this.#x = false, this.#e = false, this.#t = false, this.#n = false, this.#o = false, this.#r = false, this.#s = false, this.#i = false, this.#d = false, this.#u = false, this.#c = false, this.#p = void 0, this.#a = false, this.#h = void 0, this.#g = false, this.#l = false, this.#v = false, this.#m = false, this.#y = null, this.#S = null, this.#f = null, this.#b = null, this.#k = false, this.#w = void 0, this.#A = void 0, this.#T = null, this.#L = null, this.#M = void 0;
  }
}
;
