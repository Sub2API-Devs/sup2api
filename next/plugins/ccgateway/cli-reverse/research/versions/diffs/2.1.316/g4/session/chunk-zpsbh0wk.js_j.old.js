class $l0 {
  #e = void 0;
  #t = void 0;
  #n = void 0;
  #o = void 0;
  #r = void 0;
  #s = void 0;
  #i = false;
  #d = false;
  #u = void 0;
  #l = false;
  #c = void 0;
  #p = void 0;
  #a = void 0;
  mainLoopModelOverride() {
    return this.#e;
  }
  overrideMainLoopModel($l1) {
    this.#e = $l1;
  }
  mainLoopEffortState() {
    return this.#t;
  }
  replaceMainLoopEffortState($l2) {
    this.#t = $l2;
  }
  initialMainLoopModel() {
    return this.#n;
  }
  replaceInitialMainLoopModel($l3) {
    this.#n = $l3;
  }
  initialModelSettingLayer() {
    return this.#o;
  }
  replaceInitialModelSettingLayer($l4) {
    this.#o = $l4;
  }
  resolvedOrgDefault() {
    return this.#r;
  }
  replaceResolvedOrgDefault($l5) {
    this.#r = $l5;
  }
  initialEnvDefaultModel() {
    return this.#s;
  }
  replaceInitialEnvDefaultModel($l6) {
    this.#s = $l6;
  }
  refusalFallbackOccurred() {
    return this.#i;
  }
  markRefusalFallbackOccurred($l7) {
    this.#i = true, this.#u ??= $l7;
  }
  refusalFallbackHeaderArmed() {
    return this.#d;
  }
  armRefusalFallbackHeader($l8) {
    this.#d = true, this.#u ??= $l8;
  }
  refusalFallbackLatchOriginRequestId() {
    return this.#u;
  }
  silentLaneServerArmed() {
    return this.#l;
  }
  armSilentLaneFromServer() {
    this.#l = true;
  }
  forgetRefusalFallbackOccurred() {
    this.#i = false, this.#d = false, this.#l = false, this.#u = void 0;
  }
  refusalFallbackModelLatch() {
    return this.#c;
  }
  replaceRefusalFallbackModelLatch($l9, $l10 = "superseded") {
    if (this.#c?.carriedEffort !== void 0 && $l9?.carriedEffort === void 0) this.#p = $l10;
    this.#c = $l9;
  }
  unlatchRefusalFallbackModel($l11) {
    this.replaceRefusalFallbackModelLatch(void 0, $l11);
  }
  takeCarriedEffortEnd() {
    let $l12 = this.#p;
    return this.#p = void 0, $l12;
  }
  availabilityFallbackChain() {
    return this.#a;
  }
  replaceAvailabilityFallbackChain($l13) {
    this.#a = $l13;
  }
  reset() {
    this.#e = void 0, this.#t = void 0, this.#n = void 0, this.#o = void 0, this.#r = void 0, this.#s = void 0, this.#i = false, this.#d = false, this.#l = false, this.#u = void 0, this.#c = void 0, this.#p = void 0, this.#a = void 0;
  }
}
;
