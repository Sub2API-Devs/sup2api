/**
 * commands/bridge/c4eUpsellRegistry.ts
 *
 * 2.1.316 新增：远程控制相关升级提示的登记
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-72dsdd1c.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-72dsdd1c.js:191-341 placement
class C4EUpsellRegistry {
  implementation = null;
  isC4EUpsellCommandEnabled() {
    return this.implementation === null ? false : this.implementation();
  }
  register(implementation) {
    this.implementation = implementation;
  }
}
//@ chunk-72dsdd1c.js:341-355 placement
/**
 * C4E upsell 命令的注册表单例。
 */
var C4E_UPSELL_REGISTRY = new C4EUpsellRegistry();
//@ chunk-72dsdd1c.js:355-413 placement
/**
 * 把某个命令的 isC4EUpsellCommandEnabled 判定注册到注册表。
 */
function registerC4EUpsellGate(gate) {
  C4E_UPSELL_REGISTRY.register(gate.isC4EUpsellCommandEnabled);
}
export { C4E_UPSELL_REGISTRY, registerC4EUpsellGate };
