/**
 * components/skills/_new/SkillsMenu.helpers-00qh.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-00qhwn8e.js (2)
 * attribution: sole-consumer-new 2
 */
import { r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../../ink/components/Text.js";
import { hr } from "../../../utils/invisibleChars.js";

//@ chunk-00qhwn8e.js:17439-17489 sole-consumer-new
function is(Ye) {
  return Ye.workerInventory?.skills;
}
//@ chunk-00qhwn8e.js:17489-17541 sole-consumer-new
function ns(b) {
  return r(Text, { children: ["/", hr(b)] }, b);
}

export { is, ns };
