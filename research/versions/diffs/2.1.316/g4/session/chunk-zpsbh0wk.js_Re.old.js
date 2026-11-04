class $l0 {
  #e = null;
  #t = null;
  #n = null;
  #o = null;
  #r = null;
  #s = null;
  #i = null;
  #d = null;
  #u = null;
  #l = null;
  #c = null;
  #p = null;
  #a = null;
  #h = [];
  #g = null;
  #m = $m_Xe();
  #y = null;
  #S = null;
  #f = null;
  #v = $m_Ye();
  #b = null;
  #k = null;
  installMeter($l1, $l2, { omitUnits: $l3 = false } = {}) {
    this.#e = $l1;
    let $l4 = ($l5) => $l3 ? void 0 : $l5;
    this.#t = $l2("claude_code.session.count", { description: "Count of CLI sessions started" }), this.#n = $l2("claude_code.lines_of_code.count", { description: "Count of lines of code modified, with the 'type' attribute indicating whether lines were added or removed and the 'model' attribute indicating which model made the change" }), this.#o = $l2("claude_code.pull_request.count", { description: "Number of pull requests created" }), this.#r = $l2("claude_code.commit.count", { description: "Number of git commits created" }), this.#s = $l2("claude_code.cost.usage", { description: "Cost of the Claude Code session", unit: $l4("USD") }), this.#i = $l2("claude_code.token.usage", { description: "Number of tokens used", unit: $l4("tokens") }), this.#d = $l2("claude_code.code_edit_tool.decision", { description: "Count of code editing tool permission decisions (accept/reject) for Edit, Write, and NotebookEdit tools" }), this.#u = $l2("claude_code.active_time.total", { description: "Total active time in seconds", unit: $l4("s") });
  }
  meter() {
    return this.#e;
  }
  sessionCounter() {
    return this.#t;
  }
  locCounter() {
    return this.#n;
  }
  prCounter() {
    return this.#o;
  }
  commitCounter() {
    return this.#r;
  }
  costCounter() {
    return this.#s;
  }
  tokenCounter() {
    return this.#i;
  }
  codeEditToolDecisionCounter() {
    return this.#d;
  }
  activeTimeCounter() {
    return this.#u;
  }
  statsStore() {
    return this.#l;
  }
  replaceStatsStore($l6) {
    this.#l = $l6;
  }
  loggerProvider() {
    return this.#c;
  }
  replaceLoggerProvider($l7) {
    this.#c = $l7;
  }
  eventLogger() {
    return this.#p;
  }
  eventLoggerOwner() {
    return this.#a;
  }
  attachEventLogger($l8, $l9) {
    if (this.#p = $l8, this.#a = $l8 ? $l9 : null, !$l8) return;
    let $l10 = this.#h;
    if (this.#h = null, $l10) for (let $l11 of $l10) $l8.emit($l11);
  }
  bufferPendingEvent($l12) {
    if (this.#h === null || this.#h.length >= 100) return false;
    return this.#h.push($l12), true;
  }
  closeWindow($l13) {
    this.#h = null, this.#g = $l13;
  }
  windowCloseCause() {
    return this.#g;
  }
  isWindowOpen() {
    return this.#h !== null;
  }
  hostOtel() {
    return this.#m;
  }
  meterProvider() {
    return this.#y;
  }
  replaceMeterProvider($l14) {
    this.#y = $l14;
  }
  tracerProvider() {
    return this.#S;
  }
  replaceTracerProvider($l15) {
    this.#S = $l15;
  }
  cachedTelemetryResource() {
    return this.#f;
  }
  replaceCachedTelemetryResource($l16) {
    this.#f = $l16;
  }
  cachedOtlpHttpAgentFactory($l17, $l18) {
    return this.#v[$l17 ? "proxied" : "direct"][$l18];
  }
  replaceCachedOtlpHttpAgentFactory($l19, $l20, $l21) {
    this.#v[$l19 ? "proxied" : "direct"][$l20] = $l21;
  }
  inClusterOtlpTrustRoots() {
    return this.#b;
  }
  replaceInClusterOtlpTrustRoots($l22) {
    this.#b = $l22;
  }
  inClusterOtlpAgentFactory() {
    return this.#k;
  }
  replaceInClusterOtlpAgentFactory($l23) {
    this.#k = $l23;
  }
  reset() {
    this.#e = null, this.#t = null, this.#n = null, this.#o = null, this.#r = null, this.#s = null, this.#i = null, this.#d = null, this.#u = null, this.#l = null, this.#c = null, this.#p = null, this.#a = null, this.#h = [], this.#g = null, this.#m = $m_Xe(), this.#y = null, this.#S = null, this.#f = null, this.#v = $m_Ye(), this.#b = null, this.#k = null;
  }
}
;
