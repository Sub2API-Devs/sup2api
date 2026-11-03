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

//@ chunk-3w159cb0.js:229-888 placement
class AnnouncementState {
  announcementSlotWinner = null;
  announcementSlotGovernance = null;
  announcementSlotReleased = !1;
  countedNoticeImpressions = new Set();
  startupAnnouncementPick = void 0;
  companyAnnouncement = null;
  fotwContent = null;
  ccCeMigrateGroup = void 0;
  savedModelSuccessorDrawnAt = null;
  emergencyTipShown = null;
  voiceFooterHintCounted = !1;
  voiceFooterHintUnderCap = void 0;
  isLogoRetired = !1;
  reset() {
    ((this.announcementSlotWinner = null),
      (this.announcementSlotGovernance = null),
      (this.announcementSlotReleased = !1),
      this.countedNoticeImpressions.clear(),
      (this.startupAnnouncementPick = void 0),
      (this.companyAnnouncement = null),
      (this.fotwContent = null),
      (this.ccCeMigrateGroup = void 0),
      (this.savedModelSuccessorDrawnAt = null));
  }
}
//@ chunk-3w159cb0.js:888-914 placement
var announcementStateByHost = new SessionRootSlot(() => new AnnouncementState());
//@ chunk-3w159cb0.js:914-947 placement
function announcementState() {
  return announcementStateByHost.of(getRootSession());
}

export { announcementState, announcementStateByHost };
