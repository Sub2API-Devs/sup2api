package egress

import (
	"context"
	"errors"
	"io"
	"net"
	"net/netip"
	"os"
	"sync"
	"sync/atomic"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// maxFrameData is the largest data payload per frame.
const maxFrameData = 32 << 10

// closeGrace bounds how long Close waits for the host to finish the
// stream before cancelling it.
const closeGrace = 5 * time.Second

func dial(ctx context.Context, c pluginv1.EgressServiceClient, network, address string) (net.Conn, error) {
	opErr := func(err error) error { return &net.OpError{Op: "dial", Net: network, Addr: strAddr{network, address}, Err: err} }
	switch network {
	case "tcp", "tcp4", "tcp6":
	default:
		return nil, opErr(net.UnknownNetworkError(network))
	}
	if err := ctx.Err(); err != nil {
		return nil, opErr(err)
	}
	// The stream outlives ctx (which only bounds the dial); it is cancelled
	// by Close or a write timeout.
	sctx, cancel := context.WithCancel(context.Background())
	stopWatch := context.AfterFunc(ctx, cancel)
	fail := func(err error) (net.Conn, error) {
		cancel()
		if !stopWatch() && ctx.Err() != nil {
			err = ctx.Err()
		}
		return nil, opErr(err)
	}
	stream, err := c.Dial(sctx)
	if err != nil {
		return fail(err)
	}
	if err := stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Open{
		Open: &pluginv1.DialOpen{Network: network, Address: address},
	}}); err != nil {
		return fail(err)
	}
	f, err := stream.Recv()
	if err != nil {
		return fail(err)
	}
	res := f.GetResult()
	if res == nil {
		return fail(errors.New("egress: protocol error: expected dial result"))
	}
	if !res.GetOk() {
		return fail(errors.New(res.GetError()))
	}
	if !stopWatch() {
		// ctx ended while the result was in flight.
		return fail(ctx.Err())
	}
	var remote net.Addr = strAddr{network, address}
	if ap, err := netip.ParseAddrPort(res.GetRemoteAddr()); err == nil {
		remote = net.TCPAddrFromAddrPort(ap)
	}
	cn := &conn{
		stream: stream, cancel: cancel,
		network: network, local: strAddr{network, "egress-tunnel"}, remote: remote,
		rch: make(chan []byte, 8), closed: make(chan struct{}), recvDone: make(chan struct{}),
		rdl: newDeadline(), wdl: newDeadline(),
	}
	go cn.recvLoop()
	return cn, nil
}

// conn is a net.Conn over one EgressService.Dial stream.
type conn struct {
	stream  pluginv1.EgressService_DialClient
	cancel  context.CancelFunc
	network string
	local   net.Addr
	remote  net.Addr

	rch      chan []byte // data frames; closed at end of the remote stream
	rerr     error       // valid once rch is closed
	recvDone chan struct{}

	readMu sync.Mutex
	rbuf   []byte

	writeMu     sync.Mutex
	writeClosed bool

	closed    chan struct{}
	closeOnce sync.Once
	aborted   atomic.Bool // stream cancelled by a write timeout

	rdl, wdl *deadline
}

var _ net.Conn = (*conn)(nil)

func (c *conn) isClosed() bool {
	select {
	case <-c.closed:
		return true
	default:
		return false
	}
}

func (c *conn) recvLoop() {
	defer close(c.recvDone)
	ended := false
	end := func(err error) {
		if !ended {
			ended = true
			c.rerr = err
			close(c.rch)
		}
	}
	for {
		f, err := c.stream.Recv()
		if err != nil {
			switch {
			case errors.Is(err, io.EOF):
				end(io.EOF)
			case c.aborted.Load():
				end(os.ErrDeadlineExceeded)
			default:
				end(err)
			}
			return
		}
		switch k := f.Kind.(type) {
		case *pluginv1.EgressFrame_Data:
			if ended || c.isClosed() {
				continue // drain until the host finishes the stream
			}
			select {
			case c.rch <- k.Data:
			case <-c.closed:
			}
		case *pluginv1.EgressFrame_Close:
			if msg := k.Close.GetError(); msg != "" {
				end(errors.New("egress: " + msg))
			} else {
				end(io.EOF)
			}
		}
	}
}

func (c *conn) opErr(op string, err error) error {
	return &net.OpError{Op: op, Net: c.network, Source: c.local, Addr: c.remote, Err: err}
}

// Read implements net.Conn.
func (c *conn) Read(p []byte) (int, error) {
	c.readMu.Lock()
	defer c.readMu.Unlock()
	if c.isClosed() {
		return 0, c.opErr("read", net.ErrClosed)
	}
	if c.rdl.expired() {
		return 0, c.opErr("read", os.ErrDeadlineExceeded)
	}
	if len(c.rbuf) > 0 {
		n := copy(p, c.rbuf)
		c.rbuf = c.rbuf[n:]
		return n, nil
	}
	if len(p) == 0 {
		return 0, nil
	}
	select {
	case b, ok := <-c.rch:
		if !ok {
			if errors.Is(c.rerr, io.EOF) {
				return 0, io.EOF
			}
			return 0, c.opErr("read", c.rerr)
		}
		n := copy(p, b)
		c.rbuf = b[n:]
		return n, nil
	case <-c.rdl.wait():
		return 0, c.opErr("read", os.ErrDeadlineExceeded)
	case <-c.closed:
		return 0, c.opErr("read", net.ErrClosed)
	}
}

// Write implements net.Conn. Data is split into frames of at most 32 KiB.
// If the write deadline passes while the stream is blocked by flow
// control, the connection is aborted.
func (c *conn) Write(p []byte) (int, error) {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	if c.isClosed() {
		return 0, c.opErr("write", net.ErrClosed)
	}
	if c.writeClosed {
		return 0, c.opErr("write", errors.New("egress: write after CloseWrite"))
	}
	if c.wdl.expired() || c.aborted.Load() {
		return 0, c.opErr("write", os.ErrDeadlineExceeded)
	}
	if c.wdl.active() {
		done := make(chan struct{})
		defer close(done)
		wait := c.wdl.wait()
		go func() {
			select {
			case <-wait:
				c.aborted.Store(true)
				c.cancel()
			case <-done:
			}
		}()
	}
	n := 0
	for len(p) > 0 {
		chunk := p[:min(len(p), maxFrameData)]
		data := make([]byte, len(chunk)) // gRPC may read the message after Send returns
		copy(data, chunk)
		if err := c.stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Data{Data: data}}); err != nil {
			if c.aborted.Load() {
				return n, c.opErr("write", os.ErrDeadlineExceeded)
			}
			return n, c.opErr("write", err)
		}
		n += len(chunk)
		p = p[len(chunk):]
	}
	return n, nil
}

// sendCloseLocked sends the close frame and half-closes the stream.
// writeMu must be held.
func (c *conn) sendCloseLocked() error {
	if c.writeClosed {
		return nil
	}
	c.writeClosed = true
	err := c.stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Close{Close: &pluginv1.DialClose{}}})
	if cerr := c.stream.CloseSend(); err == nil {
		err = cerr
	}
	return err
}

// CloseWrite half-closes the connection: the target sees EOF, reads keep
// working.
func (c *conn) CloseWrite() error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	if c.isClosed() {
		return c.opErr("close", net.ErrClosed)
	}
	if err := c.sendCloseLocked(); err != nil {
		return c.opErr("close", err)
	}
	return nil
}

// Close implements net.Conn. It returns immediately; the close frame is
// sent in the background and the stream is cancelled once the host has
// finished it (or after a grace period).
func (c *conn) Close() error {
	first := false
	c.closeOnce.Do(func() {
		first = true
		close(c.closed)
		go func() {
			timer := time.NewTimer(closeGrace)
			defer timer.Stop()
			sent := make(chan struct{})
			go func() {
				c.writeMu.Lock()
				_ = c.sendCloseLocked()
				c.writeMu.Unlock()
				close(sent)
			}()
			select {
			case <-sent:
				select {
				case <-c.recvDone:
				case <-timer.C:
				}
			case <-timer.C:
			}
			c.cancel()
		}()
	})
	if !first {
		return c.opErr("close", net.ErrClosed)
	}
	return nil
}

func (c *conn) LocalAddr() net.Addr  { return c.local }
func (c *conn) RemoteAddr() net.Addr { return c.remote }

func (c *conn) SetDeadline(t time.Time) error {
	c.rdl.set(t)
	c.wdl.set(t)
	return nil
}

func (c *conn) SetReadDeadline(t time.Time) error  { c.rdl.set(t); return nil }
func (c *conn) SetWriteDeadline(t time.Time) error { c.wdl.set(t); return nil }

type strAddr struct{ network, s string }

func (a strAddr) Network() string { return a.network }
func (a strAddr) String() string  { return a.s }

// deadline is a resettable timer whose channel closes when it expires
// (same design as net.Pipe).
type deadline struct {
	mu    sync.Mutex
	timer *time.Timer
	ch    chan struct{}
}

func newDeadline() *deadline { return &deadline{ch: make(chan struct{})} }

func isClosedChan(ch chan struct{}) bool {
	select {
	case <-ch:
		return true
	default:
		return false
	}
}

func (d *deadline) set(t time.Time) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.timer != nil && !d.timer.Stop() {
		<-d.ch // the timer fired; wait for its close
	}
	d.timer = nil
	closed := isClosedChan(d.ch)
	if t.IsZero() {
		if closed {
			d.ch = make(chan struct{})
		}
		return
	}
	if dur := time.Until(t); dur > 0 {
		if closed {
			d.ch = make(chan struct{})
		}
		ch := d.ch
		d.timer = time.AfterFunc(dur, func() { close(ch) })
		return
	}
	if !closed {
		close(d.ch)
	}
}

func (d *deadline) wait() chan struct{} {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.ch
}

func (d *deadline) expired() bool { return isClosedChan(d.wait()) }

// active reports whether a future deadline is pending.
func (d *deadline) active() bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.timer != nil
}
