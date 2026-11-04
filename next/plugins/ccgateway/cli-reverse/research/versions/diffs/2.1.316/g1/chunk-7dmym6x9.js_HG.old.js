function SELF() {
  let $l0 = $m_Te();
  switch ($l0) {
    case "firstParty":
      if ($m_i.ANTHROPIC_UNIX_SOCKET !== void 0) return $m_i.CLAUDE_CODE_ENTRYPOINT === "ssh-remote" ? "firstParty" : "thirdParty";
      return $m_Pi() ? "firstParty" : "thirdParty";
    case "bedrock":
    case "mantle":
    case "vertex":
    case "foundry":
    case "anthropicAws":
    case "anthropicGoogleCloud":
    case "gateway":
      return "thirdParty";
    default:
      return $l0;
  }
}
;
