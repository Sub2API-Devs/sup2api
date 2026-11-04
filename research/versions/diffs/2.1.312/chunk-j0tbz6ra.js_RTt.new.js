function SELF($l0) {
  if ($l0.assumedUtc) return $l0.changed ? `The UTC date is now ${$l0.date}. The user's local date can differ. If a system-reminder in a user's message, other than an earlier "Today's date is" line (that was the UTC date), gives a date or time that is not marked UTC, that is the user's local date: treat it as today's date.` : `The UTC date is ${$l0.date}. The user's local date can differ. If a system-reminder in a user's message gives a date or time that is not marked UTC, that is the user's local date: treat it as today's date.`;
  return $l0.changed ? `The date has changed. Today's date is now ${$l0.date}. No need to announce the new date \u2014 the user's own clock shows it.` : `Today's date is ${$l0.date}.`;
}
;
