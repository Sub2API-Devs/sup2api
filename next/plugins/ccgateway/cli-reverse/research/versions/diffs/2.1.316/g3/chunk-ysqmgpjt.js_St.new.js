function SELF($l0, $l1, $l2) {
  let $l3 = $m_Sn(), $l4 = $m_i.NODE_EXTRA_CA_CERTS, $l5 = $l3.includes("bundled"), $l6 = $l3.includes("system"), $l7 = !$l5 && $l0.refusesBundledFallback;
  $m_t(`CA certs: stores=${$l3.join(",")}, extraCertsPath=${$l4}`);
  let $l8 = $m_Be("tls"), $l9 = $l8.getCACertificates;
  if (!$l5 && $l6 && !$l9) {
    if ($m_t(`CA certs: stores=system but system CA API unavailable${$l7 ? "" : ", using bundled roots"}`), $m_z("system_api_unavailable")) $m_f("ca_certs_load", "system_api_unavailable");
  }
  let $l10 = [], $l11 = "every certificate in the system CA store is expired or on the deny list", $l12 = ($l13, $l14) => {
    for (let $l15 of $l14) $l10.push({ pem: $l15, source: $l13 });
  }, $l16 = [], $l17 = false, $l18 = [], $l19 = /* @__PURE__ */ new Map();
  if ($l5) $l12("bundled", $l8.rootCertificates), $m_t(`CA certs: Loaded ${$l8.rootCertificates.length} bundled root certificates`);
  if ($l6) try {
    let $l20 = $l9?.("system");
    if ($l20 && $l20.length > 0) {
      let $l21 = $m_xn($l20, Date.now(), $l19);
      $l12("system", $l21), $m_t(`CA certs: Loaded ${$l21.length} system CA certificates`);
    } else if ($m_t(`CA certs: system store ${$l9 ? "returned empty" : "unavailable"}`), $l11 = $l9 ? "the system CA store is empty: check that this process can read its CA files (SSL_CERT_FILE, SSL_CERT_DIR, or the system's default paths)" : "the runtime has no system CA store", !$l5 && !$l7) $l12("bundled", $l8.rootCertificates);
  } catch ($l22) {
    if ($m_t(`CA certs: Failed to load system CA certificates: ${$l22}`, { level: "error" }), $m_z("system_store_failed")) $m_f("ca_certs_load", "system_store_failed");
    if ($l11 = "reading the system CA store failed", !$l5 && !$l7) $l12("bundled", $l8.rootCertificates);
  }
  let $l23 = $m_De($l8.rootCertificates), $l24 = $l7 ? $m_ne($l10, $l23, $l2, $l0.warnedExtraCerts) : $m_vn($l10, $l8.rootCertificates, $l2, $l23, $l0.warnedExtraCerts);
  if ($l24.length === 0) throw new $m_C(`No certificate authority to trust: CLAUDE_CODE_CERT_STORE=system (or NODE_OPTIONS --use-system-ca or --use-openssl-ca) leaves out the runtime's bundled roots, and ${$l11}. NODE_EXTRA_CA_CERTS only adds to the store; it does not count on its own.`, "No certificate authority to trust");
  if ($l4 && $l0.extraCACerts?.path === $l4) {
    let $l25 = $l0.extraCACerts.content, $l26 = new Set($l24.map(($l27) => $l27.trim())), $l28 = $l25.replace(/^\n{1,2}|\n{1,2}$/g, "").split(/\n{1,2}(?=-----BEGIN CERTIFICATE-----)/).every(($l29) => $l26.has($l29));
    $l16 = $l28 ? [] : $m_ne([{ pem: $l25, source: "NODE_EXTRA_CA_CERTS" }], $l23, $l2, $l0.warnedExtraCerts), $l18 = $l28 ? [$l25] : $l16, $l17 = $l28 || $l16.length > 0, $m_t($l17 ? `CA certs: Appended extra certificates from NODE_EXTRA_CA_CERTS (${$l4})${$l28 ? ": all of them were already trusted from the CA store, so each is listed once" : ""}` : `CA certs: Nothing from NODE_EXTRA_CA_CERTS (${$l4}) is left to append`);
  }
  let $l30 = $l1 || $m_i.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP ? { list: $l24, alone: $l24 } : $NEW_chunk_hq88884p_js_kn($l24, $l19, $l18), $l31 = $m_L([...$l30.list, ...$l16]), $l32 = 0, $l33 = $l1 ? { kept: $l31, dropped: 0 } : $m__t($l31, ($l34, $l35) => {
    if ($l32++, $l18.some(($l36) => $l36.includes($l34.trim()))) $m_Ct("selfNamed", $l35, $l0.warnedExtraCerts);
  });
  return { list: $l33.kept, dropped: $l33.dropped, selfNamedDropped: $l32, storeCerts: $l30.alone, appendedExtraCerts: $l17, wantsBundled: $l5, wantsSystem: $l6 };
}
;
