/**
 * commands/theme/themeWriter.ts
 *
 * 2.1.316 新增。/theme 与设置界面共用的主题写入器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zj72psg9.js (1)
 * attribution: placement 1
 */
import { skt } from "../../utils/theme.js";
import { commitThroughConfigSet } from "../config/configShorthand.js";
import { themeSettingRow } from "../config/configSettings.js";

//@ chunk-zj72psg9.js:269-412 placement
var themeWriter = (t) => (e) => {
    if (!skt(e)) return { error: Error("Theme takes the name of a theme") };
    t(e);
    return;
  },
  commitTheme = (t, e, r) => commitThroughConfigSet(themeSettingRow(e), t, themeWriter(e.setTheme), r);

export { commitTheme, themeWriter };
