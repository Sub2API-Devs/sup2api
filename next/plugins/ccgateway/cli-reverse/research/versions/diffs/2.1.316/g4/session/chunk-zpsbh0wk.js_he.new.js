class $l0 {
  exchanges = [];
  replace($l1) {
    this.exchanges = $l1;
  }
  append($l2, $l3, $l4, $l5) {
    this.exchanges = [...this.exchanges, { question: $l2, response: $l3, ...$l4 && { fallbackNotice: $l4 }, ...$l5 && { agentId: $l5 } }].slice(-20);
  }
  pendingReopen = null;
  reopenAway = false;
  get reopenPending() {
    return this.pendingReopen !== null;
  }
  armReopen($l6, $l7) {
    if (this.pendingReopen) {
      this.pendingReopen.owners.add($l6);
      return;
    }
    this.pendingReopen = { owners: /* @__PURE__ */ new Set([$l6]), cancel: $l7() };
  }
  clearPendingReopen($l8) {
    let $l9 = this.pendingReopen;
    if (!$l9) {
      this.reopenAway = false;
      return;
    }
    if ($l8 !== void 0) {
      if ($l9.owners.delete($l8), $l9.owners.size > 0) return;
    }
    $l9.cancel(), this.pendingReopen = null, this.reopenAway = false;
  }
  reopener = null;
  setReopener($l10) {
    this.reopener = $l10;
  }
  get hasReopener() {
    return this.reopener !== null;
  }
  reopenNow() {
    return this.reopener?.() ?? false;
  }
  inFlightQuestions = [];
  get inFlight() {
    return this.inFlightQuestions.at(-1) ?? null;
  }
  pendingBesidesTop() {
    return this.inFlightQuestions.slice(0, -1);
  }
  setInFlight($l11) {
    if (!this.inFlightQuestions.includes($l11)) this.inFlightQuestions = [...this.inFlightQuestions, $l11];
  }
  clearInFlight($l12) {
    if (this.inFlightQuestions.includes($l12)) this.inFlightQuestions = this.inFlightQuestions.filter(($l13) => $l13 !== $l12);
  }
}
;
