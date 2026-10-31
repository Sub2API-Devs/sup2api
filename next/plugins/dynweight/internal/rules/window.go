package rules

// CloseGraceSeconds is how long after its end a window is still taking
// observations: the delivery from the gateway and the flush of every node.
const CloseGraceSeconds = 5

// phaseFactor spreads the phases of neighbouring accounts over the window,
// so their evaluations do not all fall in the same second.
const phaseFactor = 7919

// WindowStart is the start (unix seconds) of the window of an account that
// contains now. Windows are not aligned to the epoch: each account rolls on
// its own phase, which depends only on its id and the window length, so
// every node puts an observation in the same window.
func WindowStart(accountID, now int64, windowSeconds int) int64 {
	w := int64(windowSeconds)
	phase := accountID % w * phaseFactor % w
	return (now-phase)/w*w + phase
}

// LatestClosedWindow is the start of the newest window of an account that
// is closed, grace included.
func LatestClosedWindow(accountID, now int64, windowSeconds int) int64 {
	return WindowStart(accountID, now-CloseGraceSeconds, windowSeconds) - int64(windowSeconds)
}
