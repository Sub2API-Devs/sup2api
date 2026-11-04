function SELF($l0) {
  let $l1 = `${$m_W7}
`;
  return $l1 += $l0.truncatedAtBytes === void 0 ? `Output too large (${$m_Qt($l0.originalSize)}). Full output saved to: ${$l0.filepath}

` : `Output exceeded the ${$m_Qt($l0.truncatedAtBytes)} persist limit; only the first ${$m_Qt($l0.truncatedAtBytes)} were saved to: ${$l0.filepath}

`, $l1 += `Preview (first ${$m_Qt($m_M_e)}):
`, $l1 += $l0.preview, $l1 += $l0.hasMore ? `
...
` : `
`, $l1 += $m_uWt, $l1;
}
;
