class $l0 {
  #e = false;
  #t = void 0;
  #n = void 0;
  #o = void 0;
  #r = void 0;
  #s = void 0;
  #i = void 0;
  #d = null;
  #u = false;
  #c = void 0;
  #l = $m_Ne;
  #p = false;
  #h = "idle";
  #a = null;
  attacherCapsChanged = $m_Me();
  rvSupervisorLinkChanged = $m_Me();
  cloudCwdChanged = $m_Me();
  sdkDialogHostActive() {
    return this.#e;
  }
  markSdkDialogHostActive($l1) {
    this.#e = $l1;
  }
  sdkSupportedDialogKinds() {
    return this.#t;
  }
  sdkSupportedDialogKindsSource() {
    return this.#n;
  }
  declareDialogKinds($l2, $l3) {
    this.#t = $l2, this.#n = $l2 === void 0 ? void 0 : $l3;
  }
  sdkPerTaskStopAffordance() {
    return this.#o;
  }
  declarePerTaskStopAffordance($l4) {
    this.#o = $l4;
  }
  sdkRapidFollowupPreempt() {
    return this.#r;
  }
  declareRapidFollowupPreempt($l5) {
    this.#r = $l5;
  }
  sdkForwardNestedSubagentToolCalls() {
    return this.#s;
  }
  declareForwardNestedSubagentToolCalls($l6) {
    this.#s = $l6;
  }
  hostRendersChromeSetupOffer() {
    return this.#i;
  }
  declareHostRendersChromeSetupOffer($l7) {
    this.#i = $l7;
  }
  attacherCaps() {
    return this.#d;
  }
  replaceAttacherCaps($l8) {
    this.#d = $l8, this.attacherCapsChanged.emit();
  }
  rvSupervisorLinkLive() {
    return this.#u;
  }
  replaceRvSupervisorLinkLive($l9) {
    if (this.#u === $l9) return;
    this.#u = $l9, this.rvSupervisorLinkChanged.emit();
  }
  sdkBetas() {
    return this.#c;
  }
  replaceSdkBetas($l10) {
    this.#c = $l10;
  }
  caps() {
    return this.#l;
  }
  replaceCaps($l11) {
    this.#l = $l11;
  }
  markRemote($l12) {
    this.#l = { ...this.#l, workspace: $l12 ? "remote" : "local" };
  }
  cloudCwdOfSession($l13) {
    return this.#l.workspace === "remote" && this.#a?.sessionId === $l13 ? this.#a.cwd : null;
  }
  replaceCloudCwd($l14) {
    this.#a = $l14, this.cloudCwdChanged.emit();
  }
  replBridgeActive() {
    return this.#p;
  }
  replaceReplBridgeActive($l15) {
    if (this.#p === $l15) return;
    this.#p = $l15;
  }
  mainLoopBusy() {
    return this.#h !== "idle";
  }
  mainQueryRunning() {
    return this.#h === "running";
  }
  replaceMainLoopStatus($l16) {
    this.#h = $l16;
  }
  reset() {
    this.#e = false, this.#t = void 0, this.#n = void 0, this.#o = void 0, this.#r = void 0, this.#s = void 0, this.#i = void 0, this.#d = null, this.#c = void 0, this.#l = $m_Ne, this.#p = false, this.#h = "idle", this.#u = false, this.#a = null, this.attacherCapsChanged.clear(), this.rvSupervisorLinkChanged.clear(), this.cloudCwdChanged.clear();
  }
}
;
