function SELF($l0) {
  return $l0.length <= 256 && /^(?:\/(?!\.\.?(?:\/|$))[A-Za-z0-9._+@-]+)+$/.test($l0);
}
;
