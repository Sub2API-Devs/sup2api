/**
 * ink.ts
 *
 * Ink 对外入口（render/createRoot 包装与默认渲染选项）；本模块里的 qrcode 终端渲染器是误归的 npm qrcode 代码
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink.ts
 * pieces: chunk-ag5x7vhf.js (1)
 * attribution: fingerprint 1
 */
import { oauthExpiryWarning } from "./components/LogoV2/Notices.js";
import { e } from "../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OAuthExpiryStatusRow } from "./utils/statusNoticeDefinitions.js";

//@ chunk-ag5x7vhf.js:105590-105693 fingerprint = createRoot (0.306)
var createRoot = {
  id: "oauth-expiry",
  tier: "warning",
  type: "warning",
  isActive: () => oauthExpiryWarning() !== null,
  render: () => e(OAuthExpiryStatusRow, {}),
};

export { createRoot };
