class $l0 {
  #e = null;
  #t = null;
  #n = null;
  #o = null;
  #r = null;
  #s = 0;
  #i = null;
  #d = void 0;
  #u = 0;
  #c = void 0;
  #l = null;
  #p = null;
  #h = null;
  #a = null;
  #g = null;
  #S = false;
  #y = null;
  #v = null;
  #f = false;
  lastAPIRequest() {
    return this.#e;
  }
  replaceLastAPIRequest($l1) {
    this.#e = $l1;
  }
  lastCancelledAPIMessageId() {
    return this.#t;
  }
  replaceLastCancelledAPIMessageId($l2) {
    this.#t = $l2;
  }
  lastAPIRequestMessages() {
    return this.#n;
  }
  replaceLastAPIRequestMessages($l3) {
    this.#n = $l3;
  }
  lastClassifierRequests() {
    return this.#o;
  }
  replaceLastClassifierRequests($l4) {
    this.#o = $l4;
  }
  promptId() {
    return this.#r;
  }
  replacePromptId($l5) {
    this.#r = $l5;
  }
  promptIndex() {
    return this.#s;
  }
  replacePromptIndex($l6) {
    this.#s = $l6;
  }
  incrementPromptIndex() {
    return this.#s++, this.#s;
  }
  lastPersonPrompt() {
    return this.#i;
  }
  replaceLastPersonPrompt($l7) {
    this.#i = $l7;
  }
  lastMainRequestId() {
    return this.#d;
  }
  replaceLastMainRequestId($l8, $l9) {
    if (this.#d = $l8, this.#c = $l9, $l8 === void 0) this.#u += 1;
  }
  lastMainResponse() {
    return this.#c;
  }
  mainChainReleaseCount() {
    return this.#u;
  }
  lastMainThreadCacheTtlMs() {
    return this.#l;
  }
  replaceLastMainThreadCacheTtlMs($l10, $l11, $l12 = false) {
    this.#l = $l10, this.#a = Date.now(), this.#h = { ttlMs: $l10, model: $l11, requestAt: this.#a, askedAt: $l12 ? this.#h?.askedAt ?? this.#a : this.#a }, this.#g = this.#a, this.#S = true;
  }
  isLastMainThreadAskLive($l13, $l14) {
    let $l15 = this.#h;
    return $l15 !== null && $l15.requestAt === this.#a && $l15.ttlMs === $l13 && $l15.model === $l14 && Date.now() - $l15.askedAt < $l13;
  }
  adjustLastMainThreadCacheTtlMs($l16) {
    this.#l = $l16;
  }
  recordLastMainThreadCacheRenewal($l17) {
    if (this.#a !== null) this.#p = { requestAt: this.#a, at: Math.max($l17, this.lastMainThreadCacheRenewedAt() ?? -1 / 0) };
  }
  lastMainThreadCacheRenewedAt() {
    let $l18 = this.#p;
    return $l18 !== null && $l18.requestAt === this.#a ? $l18.at : null;
  }
  lastLiveMainThreadRequestAt() {
    return this.#g;
  }
  lastMainThreadRequestAt() {
    return this.#a;
  }
  mainThreadRequestedInProcess() {
    return this.#S;
  }
  recordMainThreadTurnStart() {
    this.#S = true;
  }
  replaceLastMainThreadRequest($l19, $l20) {
    this.#a = $l19, this.#l = $l20;
  }
  lastMainThreadContextTokens() {
    return this.#y;
  }
  replaceLastMainThreadContextTokens($l21) {
    this.#y = $l21;
  }
  stageResumeSeed($l22) {
    this.#m = $l22;
  }
  applyResumeSeed($l23) {
    this.#m = null, this.#l = $l23.ttlMs, this.#a = $l23.requestAt, this.#y = $l23.contextTokens;
  }
  #m = null;
  clearLastMainThreadRequest($l24) {
    let $l25 = $l24 !== void 0 && this.#m?.sessionId === $l24 ? this.#m : null;
    this.#m = null, this.#l = $l25?.ttlMs ?? null, this.#a = $l25?.requestAt ?? null, this.#y = $l25?.contextTokens ?? null, this.#g = null, this.#S = false;
  }
  lastApiCompletionTimestamp() {
    return this.#v;
  }
  replaceLastApiCompletionTimestamp($l26) {
    this.#v = $l26;
  }
  pendingPostCompaction() {
    return this.#f;
  }
  replacePendingPostCompaction($l27) {
    this.#f = $l27;
  }
  reset() {
    this.#e = null, this.#t = null, this.#n = null, this.#o = null, this.#r = null, this.#s = 0, this.#i = null, this.#d = void 0, this.#c = void 0, this.#u += 1, this.#l = null, this.#a = null, this.#g = null, this.#S = false, this.#y = null, this.#m = null, this.#v = null, this.#f = false;
  }
}
;
