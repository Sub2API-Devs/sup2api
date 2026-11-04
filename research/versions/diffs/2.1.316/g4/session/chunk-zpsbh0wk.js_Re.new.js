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
  #c = null;
  #l = null;
  #p = null;
  #h = null;
  #a = [];
  #g = null;
  #S = $m_Xe();
  #y = null;
  #v = null;
  #f = null;
  #m = $m_Ye();
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
    return this.#c;
  }
  replaceStatsStore($l6) {
    this.#c = $l6;
  }
  loggerProvider() {
    return this.#l;
  }
  replaceLoggerProvider($l7) {
    this.#l = $l7;
  }
  eventLogger() {
    return this.#p;
  }
  eventLoggerOwner() {
    return this.#h;
  }
  attachEventLogger($l8, $l9) {
    if (this.#p = $l8, this.#h = $l8 ? $l9 : null, !$l8) return;
    let $l10 = this.#a;
    if (this.#a = null, $l10) for (let $l11 of $l10) $l8.emit($l11);
  }
  bufferPendingEvent($l12) {
    if (this.#a === null || this.#a.length >= 100) return false;
    return this.#a.push($l12), true;
  }
  closeWindow($l13) {
    this.#a = null, this.#g = $l13;
  }
  windowCloseCause() {
    return this.#g;
  }
  isWindowOpen() {
    return this.#a !== null;
  }
  hostOtel() {
    return this.#S;
  }
  meterProvider() {
    return this.#y;
  }
  replaceMeterProvider($l14) {
    this.#y = $l14;
  }
  tracerProvider() {
    return this.#v;
  }
  replaceTracerProvider($l15) {
    this.#v = $l15;
  }
  cachedTelemetryResource() {
    return this.#f;
  }
  replaceCachedTelemetryResource($l16) {
    this.#f = $l16;
  }
  cachedOtlpHttpAgentFactory($l17, $l18) {
    return this.#m[$l17 ? "proxied" : "direct"][$l18];
  }
  replaceCachedOtlpHttpAgentFactory($l19, $l20, $l21) {
    this.#m[$l19 ? "proxied" : "direct"][$l20] = $l21;
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
    this.#e = null, this.#t = null, this.#n = null, this.#o = null, this.#r = null, this.#s = null, this.#i = null, this.#d = null, this.#u = null, this.#c = null, this.#l = null, this.#p = null, this.#h = null, this.#a = [], this.#g = null, this.#S = $m_Xe(), this.#y = null, this.#v = null, this.#f = null, this.#m = $m_Ye(), this.#b = null, this.#k = null;
  }
}
;
