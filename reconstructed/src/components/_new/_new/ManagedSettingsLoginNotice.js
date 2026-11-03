/**
 * components/_new/_new/ManagedSettingsLoginNotice.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s5p7fp0c.js (5)
 * attribution: sole-consumer-new 5
 */
import { j, y, P } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { Me } from "../../design-system/ThemeProvider.js";
import { eZ, MANAGED_SETTINGS_NOTICE } from "../../ManagedSettingsNotice.js";
import { markManagedSettingsNoticeSeen } from "../../../services/remoteManagedSettings/loginNotice.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../../ink/components/Text.js";

//@ chunk-s5p7fp0c.js:12637-12641 sole-consumer-new
j();
//@ chunk-s5p7fp0c.js:12641-12920 sole-consumer-new
function ManagedSettingsLoginNotice() {
  let D = w(6),
    { storageV5: storageV5 } = Me(),
    [o] = y(eZ),
    M,
    L;
  if (D[0] !== o || D[1] !== storageV5)
    ((M = () => {
      if (o !== void 0) markManagedSettingsNoticeSeen(o, "login_screen", storageV5);
    }),
      (L = [o, storageV5]),
      (D[0] = o),
      (D[1] = storageV5),
      (D[2] = M),
      (D[3] = L));
  else ((M = D[2]), (L = D[3]));
  P(M, L);
  let W;
  if (D[4] !== o)
    ((W = o === void 0 ? null : e(Text, { children: MANAGED_SETTINGS_NOTICE })), (D[4] = o), (D[5] = W));
  else W = D[5];
  return W;
}
//@ chunk-s5p7fp0c.js:12920-12952 sole-consumer-new
function mn(At) {
  return At.title;
}
//@ chunk-s5p7fp0c.js:12952-13069 sole-consumer-new
function providerOption(Fe) {
  return {
    label: r(Text, { children: [Fe.title, " \xB7 ", e(Text, { dimColor: !0, children: Fe.hint })] }),
    value: Fe.value,
  };
}
//@ chunk-s5p7fp0c.js:13069-13113 sole-consumer-new
function hn(Pt) {
  return Pt.value === "foundry";
}

export { mn, providerOption, hn, ManagedSettingsLoginNotice };
