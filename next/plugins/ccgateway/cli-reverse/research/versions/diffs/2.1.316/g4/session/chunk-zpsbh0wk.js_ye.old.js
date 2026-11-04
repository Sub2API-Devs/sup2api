class $l0 {
  #e = void 0;
  #t = [];
  #n = [];
  #o = void 0;
  #r = void 0;
  #s = null;
  #i = null;
  #d = false;
  #u = null;
  #l = $m_Qe();
  #c = null;
  #p = false;
  flagSettingsPath() {
    return this.#e;
  }
  replaceFlagSettingsPath($l1) {
    this.#e = $l1;
  }
  flagAgentsFilePaths() {
    return this.#t;
  }
  replaceFlagAgentsFilePaths($l2) {
    this.#t = $l2;
  }
  flagMcpConfigFilePaths() {
    return this.#n;
  }
  replaceFlagMcpConfigFilePaths($l3) {
    this.#n = $l3;
  }
  flagSettingsExpectedContent() {
    return this.#o;
  }
  replaceFlagSettingsExpectedContent($l4) {
    this.#o = $l4;
  }
  flagSettingsFilePinnedContent() {
    return this.#r;
  }
  replaceFlagSettingsFilePinnedContent($l5) {
    this.#r = $l5;
  }
  flagSettingsInline() {
    return this.#s;
  }
  replaceFlagSettingsInline($l6) {
    this.#s = $l6;
  }
  parentManagedSettings() {
    return this.#i;
  }
  replaceParentManagedSettings($l7, $l8 = null) {
    this.#i = $l7, this.#u = $l8;
  }
  parentManagedSettingsInvalid() {
    return this.#d;
  }
  replaceParentManagedSettingsInvalid($l9) {
    this.#d = $l9;
  }
  parentOrganizationSettings() {
    return this.#u;
  }
  allowedSettingSources() {
    return this.#l;
  }
  replaceAllowedSettingSources($l10) {
    this.#l = $l10;
  }
  allowedSettingSourcesWithoutRepoDirSources() {
    let $l11 = this.#l;
    if (this.#c?.of !== $l11) this.#c = { of: $l11, result: $l11.filter(($l12) => $l12 !== "projectSettings" && $l12 !== "localSettings") };
    return this.#c.result;
  }
  useCoworkPlugins() {
    return this.#p;
  }
  replaceUseCoworkPlugins($l13) {
    this.#p = $l13;
  }
  reset() {
    this.#e = void 0, this.#t = [], this.#n = [], this.#o = void 0, this.#r = void 0, this.#s = null, this.#i = null, this.#d = false, this.#u = null, this.#l = $m_Qe(), this.#c = null, this.#p = false;
  }
}
;
