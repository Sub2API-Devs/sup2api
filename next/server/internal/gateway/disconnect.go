package gateway

import (
	"context"
	"errors"
	"sync"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// errServerClosing cancels an upstream exchange which was still being read
// after its client left when the server stops waiting for requests in
// flight. The exchange's own timeouts (relay, stream idle) still apply.
var errServerClosing = errors.New("server closing")

// AbandonReads stops every upstream answer that is only still being read for
// its usage, and keeps new ones from starting. Shutdown calls it when it
// stops waiting for requests in flight: a client that left is no reason to
// hold the server open.
func (g *Gateway) AbandonReads() { g.abandonReads() }

// disconnectPolicy is what a request pays when its client hangs up while the
// upstream is answering (settings "billing", CONTRACTS §25.8). One request
// sees one policy: it is read once and kept.
func (c *call) disconnectPolicy(ctx context.Context) string {
	if c.disconnect == "" {
		c.disconnect = c.loadDisconnectPolicy(ctx)
	}
	return c.disconnect
}

// loadDisconnectPolicy asks the balance gate. Without the setting, or when
// it cannot be read, the request gets the pre-charge policy: the one that
// needs nothing kept alive.
func (c *call) loadDisconnectPolicy(ctx context.Context) string {
	if c.g == nil {
		return core.DisconnectPrecharge
	}
	src, ok := c.g.d.Balance.(core.ClientDisconnectSource)
	if !ok {
		return core.DisconnectPrecharge
	}
	// The request's own context may be over by now, so the lookup gets a
	// deadline of its own rather than none.
	lctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), c.gw.platformTimeout())
	defer cancel()
	got, err := src.ClientDisconnectPolicy(lctx)
	if err != nil || got == "" {
		return core.DisconnectPrecharge
	}
	return got
}

// upstreamDrain decides what happens to one upstream exchange when the client
// of its request goes away. The upstream request no longer hangs off the
// client's context: this watcher cancels it instead - at once, or, under the
// "continue" policy and only while forward is relaying an answer, not at
// all: the answer is read to its end with nobody listening, within the
// exchange's own timeouts (relay, stream idle), so the request is billed
// what the upstream reports.
//
// A nil *upstreamDrain is valid and never keeps anything alive.
type upstreamDrain struct {
	cancel context.CancelCauseFunc
	keep   bool // the answer may be read on after the client left
	unhook []func() bool

	mu      sync.Mutex
	armed   bool // forward is relaying an answer worth finishing
	left    bool // the client is gone
	dropped bool // output was withheld from it
	stopped bool
}

// watchClient ties the upstream exchange behind cancel to the client context
// ctx. keep says whether this attempt may be read on after the client left.
func (c *call) watchClient(ctx context.Context, cancel context.CancelCauseFunc, keep bool) *upstreamDrain {
	d := &upstreamDrain{cancel: cancel, keep: keep && c.disconnectPolicy(ctx) == core.DisconnectContinue}
	d.unhook = append(d.unhook, context.AfterFunc(ctx, d.clientLeft))
	if d.keep {
		d.unhook = append(d.unhook, context.AfterFunc(c.g.readsAbandoned, func() { cancel(errServerClosing) }))
	}
	return d
}

// clientLeft runs when the client context ends.
func (d *upstreamDrain) clientLeft() {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.leave()
}

// leave records that the client is gone and cancels the exchange unless its
// answer is being read on. The caller holds mu.
func (d *upstreamDrain) leave() {
	if d.left || d.stopped {
		return
	}
	d.left = true
	if !d.armed {
		d.cancel(context.Canceled)
	}
}

// arm marks the exchange as worth finishing: forward is about to relay a
// successful answer. A client that left before this has already canceled it.
func (d *upstreamDrain) arm() {
	if d == nil || !d.keep {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	d.armed = !d.left
}

// dropOutput reports whether what would be written now goes nowhere: the
// client is already known to be gone from an answer that is being kept.
func (d *upstreamDrain) dropOutput() bool {
	if d == nil || !d.keep {
		return false
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	d.dropped = d.dropped || d.armed && d.left
	return d.dropped
}

// writeFailed is told that a write to the client failed. It reports whether
// the answer is read on regardless, recording the client as gone if its
// context has not yet said so.
func (d *upstreamDrain) writeFailed() bool {
	if d == nil {
		return false
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	if !d.armed {
		return false
	}
	d.leave()
	d.dropped = true
	return true
}

// outputDropped reports whether part of the answer was read with nobody
// receiving it. A client that closes right after the last byte never has
// output dropped: that request was served.
func (d *upstreamDrain) outputDropped() bool {
	if d == nil {
		return false
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.dropped
}

// stop ends the watch; the caller cancels the exchange itself.
func (d *upstreamDrain) stop() {
	if d == nil {
		return
	}
	for _, unhook := range d.unhook {
		unhook()
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	d.stopped = true
}

// clientWriter is the response writer forward relays through. Once output is
// dropped it swallows every write: the upstream is still read and its usage
// extracted, the bytes go nowhere.
type clientWriter struct {
	gin.ResponseWriter
	drain *upstreamDrain
}

func (c *call) relayWriter() *clientWriter {
	return &clientWriter{ResponseWriter: c.c.Writer, drain: c.drain}
}

func (w *clientWriter) Write(p []byte) (int, error) {
	if w.drain.dropOutput() {
		return len(p), nil
	}
	n, err := w.ResponseWriter.Write(p)
	if err != nil && w.drain.writeFailed() {
		return len(p), nil
	}
	return n, err
}

func (w *clientWriter) WriteString(s string) (int, error) {
	return w.Write([]byte(s))
}

func (w *clientWriter) Flush() {
	if !w.drain.outputDropped() {
		w.ResponseWriter.Flush()
	}
}
