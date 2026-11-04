function SELF($l0, $l1, $l2) {
  let $l3 = $m_Sn(), $l4 = $m_i.NODE_EXTRA_CA_CERTS, $l5 = $l3.includes("bundled"), $l6 = $l3.includes("system"), $l7 = !$l5 && $l0.refusesBundledFallback;
  $m_t(`CA certs: stores=${$l3.join(",")}, extraCertsPath=${$l4}`);
  let $l8 = $m_Be("tls"), $l9 = $l8.getCACertificates;
  if (!$l5 && $l6 && !$l9) {
    if ($m_t(`CA certs: stores=system but system CA API unavailable${$l7 ? "" : ", using bundled roots"}`), $m_z("system_api_unavailable")) $m_f("ca_certs_load", "system_api_unavailable");
  }
  let $l10 = [], $l11 = "every certificate in the system CA store is expired or on the deny list", $l12 = ($l13, $l14) => {
    for (let $l15 of $l14) $l10.push({ pem: $l15, source: $l13 });
  }, $l16 = [], $l17 = false;
  if ($l5) $l12("bundled", $l8.rootCertificates), $m_t(`CA certs: Loaded ${$l8.rootCertificates.length} bundled root certificates`);
  if ($l6) try {
    let $l18 = $l9?.("system");
    if ($l18 && $l18.length > 0) {
      let $l19 = $m_xn($l18);
      $l12("system", $l19), $m_t(`CA certs: Loaded ${$l19.length} system CA certificates`);
    } else if ($m_t(`CA certs: system store ${$l9 ? "returned empty" : "unavailable"}`), $l11 = $l9 ? "the system CA store is empty: check that this process can read its CA files (SSL_CERT_FILE, SSL_CERT_DIR, or the system's default paths)" : "the runtime has no system CA store", !$l5 && !$l7) $l12("bundled", $l8.rootCertificates);
  } catch ($l20) {
    if ($m_t(`CA certs: Failed to load system CA certificates: ${$l20}`, { level: "error" }), $m_z("system_store_failed")) $m_f("ca_certs_load", "system_store_failed");
    if ($l11 = "reading the system CA store failed", !$l5 && !$l7) $l12("bundled", $l8.rootCertificates);
  }
  let $l21 = $m_De($l8.rootCertificates), $l22 = $l7 ? $m_ne($l10, $l21, $l2, $l0.warnedExtraCerts) : $m_vn($l10, $l8.rootCertificates, $l2, $l21, $l0.warnedExtraCerts);
  if ($l22.length === 0) throw new $m_C(`No certificate authority to trust: CLAUDE_CODE_CERT_STORE=system (or NODE_OPTIONS --use-system-ca or --use-openssl-ca) leaves out the runtime's bundled roots, and ${$l11}. NODE_EXTRA_CA_CERTS only adds to the store; it does not count on its own.`, "No certificate authority to trust");
  if ($l4 && $l0.extraCACerts?.path === $l4) {
    let $l23 = $l0.extraCACerts.content, $l24 = new Set($l22.map(($l25) => $l25.trim())), $l26 = $l23.replace(/^\n{1,2}|\n{1,2}$/g, "").split(/\n{1,2}(?=-----BEGIN CERTIFICATE-----)/).every(($l27) => $l24.has($l27));
    $l16 = $l26 ? [] : $m_ne([{ pem: $l23, source: "NODE_EXTRA_CA_CERTS" }], $l21, $l2, $l0.warnedExtraCerts), $l17 = $l26 || $l16.length > 0, $m_t($l17 ? `CA certs: Appended extra certificates from NODE_EXTRA_CA_CERTS (${$l4})${$l26 ? ": all of them were already trusted from the CA store, so each is listed once" : ""}` : `CA certs: Nothing from NODE_EXTRA_CA_CERTS (${$l4}) is left to append`);
  }
  let $l28 = $m_L([...$l22, ...$l16]), $l29 = $l1 ? { kept: $l28, dropped: 0 } : $m__t($l28);
  return { list: $l29.kept, dropped: $l29.dropped, storeCerts: $l22, appendedExtraCerts: $l17, wantsBundled: $l5, wantsSystem: $l6 };
}
;
