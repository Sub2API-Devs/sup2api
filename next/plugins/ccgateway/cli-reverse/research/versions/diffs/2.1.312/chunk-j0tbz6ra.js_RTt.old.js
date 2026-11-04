function SELF($l0) {
  return $l0.changed ? `The date has changed. Today's date is now ${$l0.date}. No need to announce the new date \u2014 the user's own clock shows it.` : `Today's date is ${$l0.date}.`;
}
;
