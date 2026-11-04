class $l0 {
  reader;
  holdMs;
  clock;
  held = [];
  heldBytes = 0;
  isBetweenEvents = false;
  holdsNothing = false;
  isReading = false;
  isDue = false;
  ending;
  isCancelled = false;
  cancelHold;
  chunksRead = 0;
  piecesHandedOn = 0;
  chunksNotHeld = 0;
  chunksSplitMidEvent = 0;
  chunksAfterIdleGap = 0;
  lastHandOverAt = Number.NEGATIVE_INFINITY;
  lastHandOverWallAt = Number.NEGATIVE_INFINITY;
  pulling;
  constructor($l1, $l2, $l3) {
    this.reader = $l1;
    this.holdMs = $l2;
    this.clock = $l3;
  }
  pull($l4) {
    return new Promise(($l5) => {
      if (this.pulling = { controller: $l4, done: $l5 }, this.isDue) this.handOver();
      else if (!this.isReading) this.read();
    });
  }
  cancel($l6) {
    return this.isCancelled = true, this.held = [], this.cancelHold?.(), this.cancelHold = void 0, this.pulling?.done(), this.pulling = void 0, this.reportFirstReply(), this.reader.cancel($l6);
  }
  read() {
    this.isReading = true;
    try {
      this.reader.read().then(this.onRead, this.onReadFailed);
    } catch ($l7) {
      this.onReadFailed($l7);
    }
  }
  onRead = ($l8) => {
    if (this.isReading = false, this.isCancelled) return;
    try {
      if ($l8.done) {
        this.ending = { failed: false }, this.handOver();
        return;
      }
      let $l9 = $l8.value;
      if ($l9.byteLength > 0) {
        this.chunksRead++, this.held.push($l9), this.heldBytes += $l9.byteLength;
        let $l10 = Buffer.from($l9.buffer, $l9.byteOffset, $l9.byteLength), $l11 = this.isBetweenEvents && !this.holdsNothing, $l12 = !this.isBetweenEvents && this.chunksRead > 1;
        if (this.isBetweenEvents = $l10.at(-1) === $m_Jp && $l10.at(-2) === $m_Jp, ($l12 || !this.isBetweenEvents) && !$l10.includes($m_Jy)) this.chunksSplitMidEvent++;
        $l11 &&= this.isBetweenEvents && !$l10.includes($m_Jy) && !$l10.includes($m_Qy);
        for (let $l13 = !$l11 ? -1 : $m_Ol($l10, 0, $m_Vy) ? 0 : $m_Zp($l10, 0); $l11 && $l13 !== -1; $l13 = $m_Zp($l10, $l13)) $l11 = $m_Ol($l10, $l13, $m_Ky) || $m_Ol($l10, $l13, $m_jy);
        let $l14 = $l11 && (this.cancelHold === void 0 ? this.clock.monotonicNow() - this.lastHandOverAt > this.holdMs || this.clock.now() - this.lastHandOverWallAt > this.holdMs : this.hasStoodStillSinceHandOver(2));
        if ($l14) this.chunksAfterIdleGap++;
        if (!$l11 || $l14 || this.heldBytes >= $m_Zy) {
          this.chunksNotHeld++, this.handOver();
          return;
        }
        this.cancelHold ??= this.clock.setTimeout(this.onHoldOver, this.holdMs);
      }
      if (this.pulling !== void 0) this.read();
    } catch ($l15) {
      if (this.noteOwnThrow($l15, "chunk_handling_threw"), this.held.length > 0) this.handOver();
      else this.letGoOfBody($l15), this.onReadFailed($l15);
    }
  };
  onReadFailed = ($l16) => {
    this.isReading = false, this.ending = { failed: true, error: $l16 }, this.handOver();
  };
  onHoldOver = () => {
    try {
      if (this.hasStoodStillSinceHandOver(3)) {
        this.cancelHold = void 0;
        return;
      }
    } catch ($l17) {
      this.noteOwnThrow($l17, "hold_timer_threw");
    }
    this.handOver();
  };
  hasStoodStillSinceHandOver($l18) {
    let $l19 = this.clock.monotonicNow() - this.lastHandOverAt;
    return this.clock.now() - this.lastHandOverWallAt - $l19 > this.holdMs || $l19 > $l18 * this.holdMs;
  }
  noteOwnThrow($l20, $l21) {
    if (!this.holdsNothing) {
      this.holdsNothing = true;
      try {
        $m_l($m_N($l20)), $m_f("api_unwatched_reply_hold", $l21);
      } catch {
      }
    }
  }
  reportFirstReply() {
    if ($NEW_chunk_hwmsct5x_js_uh.isSent || this.chunksRead === 0 || this.holdsNothing) return;
    try {
      if ($m_X()) return;
      $NEW_chunk_hwmsct5x_js_uh.isSent = true, $m_g("api_unwatched_reply_hold", { hold_ms: this.holdMs, chunks_read: this.chunksRead, pieces_handed_on: this.piecesHandedOn, chunks_not_held: this.chunksNotHeld, chunks_split_mid_event: this.chunksSplitMidEvent, chunks_after_idle_gap: this.chunksAfterIdleGap });
    } catch ($l22) {
      try {
        $m_l($m_N($l22));
      } catch {
      }
    }
  }
  handOver() {
    let $l23 = this.cancelHold;
    if (this.cancelHold = void 0, $l23?.(), this.isDue = true, this.pulling === void 0) return;
    let { controller: $l24, done: $l25 } = this.pulling;
    this.pulling = void 0;
    try {
      if (this.held.length > 0) {
        let [$l26, ...$l27] = this.held, $l28 = $l26 !== void 0 && $l27.length === 0 ? $l26 : Buffer.concat(this.held);
        this.held = [], this.heldBytes = 0, this.isDue = this.ending !== void 0, $l24.enqueue($l28), this.piecesHandedOn++, this.lastHandOverAt = this.clock.monotonicNow(), this.lastHandOverWallAt = this.clock.now();
      } else if (this.ending?.failed) $l24.error(this.ending.error), this.reportFirstReply();
      else if (this.ending !== void 0) $l24.close(), this.reportFirstReply();
    } catch ($l29) {
      try {
        $l24.error($l29);
      } catch {
      }
      $l25(), this.letGoOfBody($l29), this.noteOwnThrow($l29, "hand_over_threw");
      return;
    }
    $l25();
  }
  letGoOfBody($l30) {
    try {
      this.reader.cancel($l30).catch(() => {
      });
    } catch {
    }
  }
}
;
