class $l0 {
  #e = [];
  #t = [];
  #n = [];
  #o = void 0;
  #r = /* @__PURE__ */ new Map();
  #s = /* @__PURE__ */ new Map();
  #i = /* @__PURE__ */ new Map();
  #d = [];
  #u = void 0;
  #l = [];
  #c = false;
  #p = void 0;
  #a = void 0;
  #h = void 0;
  inlinePlugins() {
    return this.#e;
  }
  replaceInlinePlugins($l1) {
    this.#e = $l1;
  }
  inlinePluginsNoMcp() {
    return this.#t;
  }
  replaceInlinePluginsNoMcp($l2) {
    this.#t = $l2;
  }
  inlinePluginUrls() {
    return this.#n;
  }
  replaceInlinePluginUrls($l3) {
    this.#n = $l3;
  }
  syncedPluginDirs() {
    return this.#o ?? [];
  }
  syncedPluginDirsRegistered() {
    return this.#o !== void 0;
  }
  syncedPluginAttestation($l4) {
    return this.#r.get($l4);
  }
  syncedPluginRowId($l5) {
    return this.#s.get($l5);
  }
  replaceSyncedPluginDirs($l6, $l7 = /* @__PURE__ */ new Map(), $l8 = /* @__PURE__ */ new Map()) {
    this.#o = $l6, this.#r = $l7, this.#s = $l8, this.#i = this.#g(this.#i);
  }
  clearSyncedPluginDirs() {
    this.#o = void 0, this.#r = /* @__PURE__ */ new Map(), this.#s = /* @__PURE__ */ new Map(), this.#i = /* @__PURE__ */ new Map();
  }
  attestedOfficialPluginMarketplace($l9) {
    return this.#i.get($l9);
  }
  replaceAttestedOfficialPluginIds($l10) {
    this.#i = this.#g($l10);
  }
  #g($l11) {
    let $l12 = new Set([...this.#r.values()].map(($l13) => `${$l13.pluginName}@${$l13.marketplace}`));
    return new Map([...$l11].filter(([$l14, $l15]) => $l12.has(`${$l14.slice(0, $l14.lastIndexOf("@"))}@${$l15}`)));
  }
  additionalDirectoriesForClaudeMd() {
    return this.#d;
  }
  replaceAdditionalDirectoriesForClaudeMd($l16) {
    this.#d = $l16;
  }
  claudeMdAdditionalDirectoriesAsked() {
    return this.#u;
  }
  askClaudeMdAdditionalDirectories($l17) {
    this.#u = $l17;
  }
  allowedChannels() {
    return this.#l;
  }
  replaceAllowedChannels($l18) {
    this.#l = $l18;
  }
  hasDevChannels() {
    return this.#c;
  }
  replaceHasDevChannels($l19) {
    this.#c = $l19;
  }
  sessionSkillAllowlist() {
    return this.#p;
  }
  replaceSessionSkillAllowlist($l20) {
    this.#p = $l20;
  }
  chromeFlagOverride() {
    return this.#a;
  }
  replaceChromeFlagOverride($l21) {
    this.#a = $l21;
  }
  teammateAgentId() {
    return this.#h;
  }
  replaceTeammateAgentId($l22) {
    this.#h = $l22;
  }
  reset() {
    this.#e = [], this.#t = [], this.#n = [], this.clearSyncedPluginDirs(), this.#d = [], this.#u = void 0, this.#l = [], this.#c = false, this.#p = void 0, this.#a = void 0, this.#h = void 0;
  }
}
;
