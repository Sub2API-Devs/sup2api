package egress

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"sync/atomic"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// echoServer is a minimal host: it echoes data and mirrors close frames.
type echoServer struct {
	pluginv1.UnimplementedEgressServiceServer
	maxFrame   atomic.Int64
	closeFrame atomic.Int32
}

func (s *echoServer) Dial(stream pluginv1.EgressService_DialServer) error {
	f, err := stream.Recv()
	if err != nil {
		return err
	}
	open := f.GetOpen()
	switch open.GetAddress() {
	case "refuse.test:1":
		return stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Result{Result: &pluginv1.DialResult{Ok: false, Error: "connection refused"}}})
	case "hang.test:1":
		<-stream.Context().Done()
		return nil
	}
	if err := stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Result{Result: &pluginv1.DialResult{Ok: true, RemoteAddr: "127.0.0.1:9"}}}); err != nil {
		return err
	}
	for {
		f, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
		switch k := f.Kind.(type) {
		case *pluginv1.EgressFrame_Data:
			if n := int64(len(k.Data)); n > s.maxFrame.Load() {
				s.maxFrame.Store(n)
			}
			if err := stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Data{Data: k.Data}}); err != nil {
				return err
			}
		case *pluginv1.EgressFrame_Close:
			s.closeFrame.Add(1)
			return stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Close{Close: &pluginv1.DialClose{}}})
		}
	}
}

func newClient(t *testing.T) (pluginv1.EgressServiceClient, *echoServer) {
	t.Helper()
	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	es := &echoServer{}
	pluginv1.RegisterEgressServiceServer(srv, es)
	go func() { _ = srv.Serve(lis) }()
	cc, err := grpc.NewClient("passthrough:///bufnet",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = cc.Close(); srv.Stop() })
	return pluginv1.NewEgressServiceClient(cc), es
}

func install(t *testing.T) *echoServer {
	t.Helper()
	c, es := newClient(t)
	oldT, oldR := http.DefaultTransport, net.DefaultResolver
	t.Cleanup(func() {
		http.DefaultTransport, net.DefaultResolver = oldT, oldR
		mu.Lock()
		client = nil
		mu.Unlock()
	})
	if err := Install(c); err != nil {
		t.Fatal(err)
	}
	return es
}

func TestDialBeforeInstall(t *testing.T) {
	_, err := DialContext(context.Background(), "tcp", "example.com:80")
	if !errors.Is(err, ErrNotInstalled) {
		t.Fatalf("want ErrNotInstalled, got %v", err)
	}
	if Install(nil) == nil {
		t.Fatal("nil client accepted")
	}
}

func TestInstallReplacesDefaults(t *testing.T) {
	install(t)
	tr, ok := http.DefaultTransport.(*http.Transport)
	if !ok {
		t.Fatalf("DefaultTransport is %T", http.DefaultTransport)
	}
	if tr.Proxy != nil || tr.DialContext == nil || tr.DialTLSContext != nil {
		t.Fatal("transport not routed through the tunnel")
	}
	if cl := tr.Clone(); cl.DialContext == nil {
		t.Fatal("clone lost the tunnel dialer")
	}
	if !net.DefaultResolver.PreferGo || net.DefaultResolver.Dial == nil {
		t.Fatal("resolver not replaced")
	}
	// The resolver dials the in-core DNS endpoint through the tunnel.
	c, err := net.DefaultResolver.Dial(context.Background(), "udp", "10.0.0.1:53")
	if err != nil {
		t.Fatal(err)
	}
	if c.RemoteAddr().String() != "127.0.0.1:9" {
		t.Fatalf("remote %v", c.RemoteAddr())
	}
	_ = c.Close()
}

func TestEchoLargeWriteAndFraming(t *testing.T) {
	es := install(t)
	c, err := DialContext(context.Background(), "tcp", "echo.test:80")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if _, ok := c.RemoteAddr().(*net.TCPAddr); !ok {
		t.Fatalf("remote addr type %T", c.RemoteAddr())
	}
	payload := bytes.Repeat([]byte("0123456789abcdef"), 10000) // 160 KB
	errc := make(chan error, 1)
	go func() { _, err := c.Write(payload); errc <- err }()
	got := make([]byte, len(payload))
	if _, err := io.ReadFull(c, got); err != nil {
		t.Fatal(err)
	}
	if err := <-errc; err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, payload) {
		t.Fatal("payload mismatch")
	}
	if m := es.maxFrame.Load(); m > maxFrameData || m == 0 {
		t.Fatalf("max frame %d", m)
	}
}

func TestReadDeadline(t *testing.T) {
	install(t)
	c, err := DialContext(context.Background(), "tcp", "echo.test:80")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	_ = c.SetReadDeadline(time.Now().Add(50 * time.Millisecond))
	start := time.Now()
	_, err = c.Read(make([]byte, 10))
	var ne net.Error
	if !errors.As(err, &ne) || !ne.Timeout() {
		t.Fatalf("want timeout, got %v", err)
	}
	if time.Since(start) > 2*time.Second {
		t.Fatal("deadline not honoured")
	}
	// Clearing the deadline makes the conn usable again.
	_ = c.SetDeadline(time.Time{})
	if _, err := c.Write([]byte("ping")); err != nil {
		t.Fatal(err)
	}
	buf := make([]byte, 4)
	if _, err := io.ReadFull(c, buf); err != nil || string(buf) != "ping" {
		t.Fatalf("%q %v", buf, err)
	}
	// Past deadline fails immediately.
	_ = c.SetWriteDeadline(time.Now().Add(-time.Second))
	if _, err := c.Write([]byte("x")); !errors.As(err, &ne) || !ne.Timeout() {
		t.Fatalf("write past deadline: %v", err)
	}
}

func TestCloseWriteAndClose(t *testing.T) {
	es := install(t)
	c, err := DialContext(context.Background(), "tcp", "echo.test:80")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := c.Write([]byte("bye")); err != nil {
		t.Fatal(err)
	}
	if err := c.(interface{ CloseWrite() error }).CloseWrite(); err != nil {
		t.Fatal(err)
	}
	if _, err := c.Write([]byte("more")); err == nil {
		t.Fatal("write after CloseWrite")
	}
	all, err := io.ReadAll(c)
	if err != nil || string(all) != "bye" {
		t.Fatalf("%q %v", all, err)
	}
	if es.closeFrame.Load() != 1 {
		t.Fatal("close frame not received")
	}
	if err := c.Close(); err != nil {
		t.Fatal(err)
	}
	if err := c.Close(); err == nil {
		t.Fatal("double close")
	}
	if _, err := c.Read(make([]byte, 1)); !errors.Is(err, net.ErrClosed) {
		t.Fatalf("read after close: %v", err)
	}

	// Close unblocks a pending Read.
	c2, _ := DialContext(context.Background(), "tcp", "echo.test:80")
	done := make(chan error, 1)
	go func() { _, err := c2.Read(make([]byte, 1)); done <- err }()
	time.Sleep(20 * time.Millisecond)
	_ = c2.Close()
	select {
	case err := <-done:
		if !errors.Is(err, net.ErrClosed) {
			t.Fatalf("pending read: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Close did not unblock Read")
	}
}

func TestDialErrors(t *testing.T) {
	install(t)
	if _, err := DialContext(context.Background(), "udp", "x.test:53"); err == nil {
		t.Fatal("udp accepted")
	}
	_, err := DialContext(context.Background(), "tcp", "refuse.test:1")
	if err == nil || !bytes.Contains([]byte(err.Error()), []byte("connection refused")) {
		t.Fatalf("refused: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	start := time.Now()
	_, err = DialContext(ctx, "tcp", "hang.test:1")
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("hang: %v", err)
	}
	if time.Since(start) > 2*time.Second {
		t.Fatal("dial ctx not honoured")
	}
}
