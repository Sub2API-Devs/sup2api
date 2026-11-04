/**
 * services/announcements/announcementState.ts
 *
 * 2.1.316 新增：公告槽位状态（按宿主）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3w159cb0.js (3)
 * attribution: placement 3
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3w159cb0.js:229-888 placement
class AnnouncementState {
  announcementSlotWinner = null;
  announcementSlotGovernance = null;
  announcementSlotReleased = false;
  countedNoticeImpressions = new Set();
  startupAnnouncementPick = undefined;
  companyAnnouncement = null;
  fotwContent = null;
  ccCeMigrateGroup = undefined;
  savedModelSuccessorDrawnAt = null;
  emergencyTipShown = null;
  voiceFooterHintCounted = false;
  voiceFooterHintUnderCap = undefined;
  isLogoRetired = false;
  reset() {
    this.announcementSlotWinner = null;
    this.announcementSlotGovernance = null;
    this.announcementSlotReleased = false;
    this.countedNoticeImpressions.clear();
    this.startupAnnouncementPick = undefined;
    this.companyAnnouncement = null;
    this.fotwContent = null;
    this.ccCeMigrateGroup = undefined;
    this.savedModelSuccessorDrawnAt = null;
  }
}
//@ chunk-3w159cb0.js:888-914 placement
var announcementStateByHost; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3w159cb0.js:888", () => {
  announcementStateByHost = new SessionRootSlot(() => new AnnouncementState());
});
//@ chunk-3w159cb0.js:914-947 placement
function announcementState() {
  return announcementStateByHost.of(getRootSession());
}
export { announcementState, announcementStateByHost };
