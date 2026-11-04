function SELF($l0, $l1) {
  if ($l0.variable === "ANTHROPIC_UNIX_SOCKET") return false;
  if ($l0.envKey?.startsWith("AWS_ENDPOINT_URL")) return false;
  return $l0.envKey !== "CLAUDE_CODE_API_BASE_URL" || $l1 === "files";
}
;
