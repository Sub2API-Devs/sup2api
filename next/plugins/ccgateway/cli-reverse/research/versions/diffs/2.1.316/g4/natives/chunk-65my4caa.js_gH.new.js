function SELF($l0) {
  let $l1 = $l0.find(($l2) => $l2.type === "user" && !$l2.isMeta);
  if (!$l1) return "";
  let $l3 = $l1.message.content;
  if (typeof $l3 === "string") return $l3;
  if (Array.isArray($l3)) {
    let $l4 = $l3.find(($l5) => $l5.type === "text");
    if ($l4 && $l4.type === "text") return $l4.text;
  }
  return "";
}
;
