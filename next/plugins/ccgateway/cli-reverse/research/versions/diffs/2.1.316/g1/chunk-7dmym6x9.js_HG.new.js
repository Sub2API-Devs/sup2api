function SELF() {
  let $l0 = $m_Te();
  switch ($l0) {
    case "firstParty":
      return $NEW_chunk_e6aww6q8_js_GGe() ? "firstParty" : "thirdParty";
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
