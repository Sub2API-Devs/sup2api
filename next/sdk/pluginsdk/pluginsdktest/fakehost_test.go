package pluginsdktest

import (
	"context"
	"errors"
	"net"
	"testing"

	"google.golang.org/grpc"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// dialStream is a minimal EgressService_DialServer: it hands out the frames of
// recv and records what the fake host sends back.
type dialStream struct {
	grpc.ServerStream
	recv    []*pluginv1.EgressFrame
	sent    []*pluginv1.EgressFrame
	sendErr error
}

func (s *dialStream) Send(f *pluginv1.EgressFrame) error {
	if s.sendErr != nil {
		return s.sendErr
	}
	s.sent = append(s.sent, f)
	return nil
}

func (s *dialStream) Recv() (*pluginv1.EgressFrame, error) {
	if len(s.recv) == 0 {
		return nil, errors.New("no more frames")
	}
	f := s.recv[0]
	s.recv = s.recv[1:]
	return f, nil
}

func (s *dialStream) Context() context.Context { return context.Background() }

func openStream(address string) *dialStream {
	return &dialStream{recv: []*pluginv1.EgressFrame{{Kind: &pluginv1.EgressFrame_Open{Open: &pluginv1.DialOpen{Network: "tcp", Address: address}}}}}
}

// TestFakeHostDialFailureIsReported: a dial that fails is answered with
// DialResult{ok:false} and ends the stream normally. The regression this pins:
// dialAndOpen used to return (nil, stream.Send(...)), so a successful Send left
// Dial with a nil conn and the deferred conn.Close() panicked, crashing the
// whole test binary.
func TestFakeHostDialFailureIsReported(t *testing.T) {
	fh := NewFakeHost()
	fh.DialFunc = func(context.Context, string, string) (net.Conn, error) {
		return nil, errors.New("connection refused")
	}
	s := openStream("refuse.test:1")
	if err := fh.Dial(s); err != nil {
		t.Fatalf("Dial returned %v, want nil (a failed dial is not a stream error)", err)
	}
	if len(s.sent) != 1 {
		t.Fatalf("sent %d frames, want 1", len(s.sent))
	}
	res := s.sent[0].GetResult()
	if res == nil {
		t.Fatalf("frame = %v, want a DialResult", s.sent[0])
	}
	if res.GetOk() || res.GetError() != "connection refused" {
		t.Fatalf("result = %v", res)
	}
	if dials := fh.Dials(); len(dials) != 1 || dials[0] != "refuse.test:1" {
		t.Fatalf("recorded dials = %v", dials)
	}
}

// TestFakeHostDialSendFailurePropagates: when the failure cannot be delivered
// to the plugin, Dial returns that error instead of swallowing it.
func TestFakeHostDialSendFailurePropagates(t *testing.T) {
	fh := NewFakeHost()
	fh.DialFunc = func(context.Context, string, string) (net.Conn, error) {
		return nil, errors.New("connection refused")
	}
	s := openStream("refuse.test:1")
	s.sendErr = errors.New("stream gone")
	if err := fh.Dial(s); err == nil || err.Error() != "stream gone" {
		t.Fatalf("Dial = %v, want the Send error", err)
	}
}

// TestFakeHostDialRejectsBadFirstFrame: a stream that does not start with an
// open frame is an error of the stream, not a dial failure.
func TestFakeHostDialRejectsBadFirstFrame(t *testing.T) {
	fh := NewFakeHost()
	s := &dialStream{recv: []*pluginv1.EgressFrame{{Kind: &pluginv1.EgressFrame_Data{Data: []byte("x")}}}}
	if err := fh.Dial(s); err == nil {
		t.Fatal("Dial accepted a stream without an open frame")
	}
}
