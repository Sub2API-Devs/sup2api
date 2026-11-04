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
  #l = void 0;
  #c = $m_Ne;
  #p = false;
  #a = "idle";
  #h = null;
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
    return this.#l;
  }
  replaceSdkBetas($l10) {
    this.#l = $l10;
  }
  caps() {
    return this.#c;
  }
  replaceCaps($l11) {
    this.#c = $l11;
  }
  markRemote($l12) {
    this.#c = { ...this.#c, workspace: $l12 ? "remote" : "local" };
  }
  cloudCwdOfSession($l13) {
    return this.#c.workspace === "remote" && this.#h?.sessionId === $l13 ? this.#h.cwd : null;
  }
  replaceCloudCwd($l14) {
    this.#h = $l14, this.cloudCwdChanged.emit();
  }
  replBridgeActive() {
    return this.#p;
  }
  replaceReplBridgeActive($l15) {
    if (this.#p === $l15) return;
    this.#p = $l15;
  }
  mainLoopBusy() {
    return this.#a !== "idle";
  }
  mainQueryRunning() {
    return this.#a === "running";
  }
  replaceMainLoopStatus($l16) {
    this.#a = $l16;
  }
  reset() {
    this.#e = false, this.#t = void 0, this.#n = void 0, this.#o = void 0, this.#r = void 0, this.#s = void 0, this.#i = void 0, this.#d = null, this.#l = void 0, this.#c = $m_Ne, this.#p = false, this.#a = "idle", this.#u = false, this.#h = null, this.attacherCapsChanged.clear(), this.rvSupervisorLinkChanged.clear(), this.cloudCwdChanged.clear();
  }
}
;
