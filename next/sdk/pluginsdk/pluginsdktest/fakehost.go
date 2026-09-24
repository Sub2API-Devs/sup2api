package pluginsdktest

import (
	"context"
	"errors"
	"io"
	"net"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// LogEntry is one record received through HostService.Log.
type LogEntry struct {
	Level   pluginv1.LogRequest_Level
	Message string
	Attrs   map[string]string
}

// LedgerEntry is one accepted ledger change.
type LedgerEntry struct {
	Credit bool
	Req    *pluginv1.LedgerChangeRequest
	ID     int64
}

// FakeHost is an in-memory HostService + EgressService for plugin tests.
// Zero value is not usable; use NewFakeHost.
type FakeHost struct {
	pluginv1.UnimplementedHostServiceServer
	pluginv1.UnimplementedEgressServiceServer

	mu sync.Mutex
	// DSN returned by GetDSN ("" = FAILED_PRECONDITION).
	DSNValue    string
	SchemaValue string
	// Authz decides AuthzCheck; nil allows everything.
	Authz func(userID int64, permission string) bool
	// DialFunc is used by EgressService.Dial (default net.Dialer).
	DialFunc func(ctx context.Context, network, address string) (net.Conn, error)
	// OnPublish, when set, is called (outside the lock) for every accepted
	// Publish, e.g. to relay it to another Harness with Harness.Deliver and
	// simulate a second node. PublishErr, when set, fails every Publish.
	OnPublish  func(PublishedMessage)
	PublishErr error

	logs      []LogEntry
	kv        map[string]kvItem
	ledger    []LedgerEntry
	ledgerBy  map[string]LedgerEntry
	dials     []string
	published []PublishedMessage
}

// PublishedMessage is one broadcast received through HostService.Publish.
type PublishedMessage struct {
	Topic   string
	Payload []byte
}

type kvItem struct {
	value   []byte
	expires time.Time
}

// NewFakeHost returns an empty fake host.
func NewFakeHost() *FakeHost {
	return &FakeHost{kv: map[string]kvItem{}, ledgerBy: map[string]LedgerEntry{}}
}

// Logs returns a copy of the received log records.
func (f *FakeHost) Logs() []LogEntry {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]LogEntry(nil), f.logs...)
}

// Ledger returns the accepted ledger changes.
func (f *FakeHost) Ledger() []LedgerEntry {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]LedgerEntry(nil), f.ledger...)
}

// Dials returns the addresses requested through EgressService.
func (f *FakeHost) Dials() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.dials...)
}

// Published returns the broadcasts received through Publish.
func (f *FakeHost) Published() []PublishedMessage {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]PublishedMessage(nil), f.published...)
}

// Publish records the broadcast (the real host relays it to the other
// nodes). It enforces the same topic and size limits as the host.
func (f *FakeHost) Publish(_ context.Context, in *pluginv1.PublishRequest) (*pluginv1.PublishResponse, error) {
	if !topicRe.MatchString(in.GetTopic()) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid topic %q", in.GetTopic())
	}
	if len(in.GetPayload()) > 64<<10 {
		return nil, status.Error(codes.InvalidArgument, "payload too large")
	}
	msg := PublishedMessage{Topic: in.GetTopic(), Payload: append([]byte(nil), in.GetPayload()...)}
	f.mu.Lock()
	if err := f.PublishErr; err != nil {
		f.mu.Unlock()
		return nil, err
	}
	f.published = append(f.published, msg)
	hook := f.OnPublish
	f.mu.Unlock()
	if hook != nil {
		hook(msg)
	}
	return &pluginv1.PublishResponse{}, nil
}

var topicRe = regexp.MustCompile(`^[a-z0-9_.-]{1,64}$`)

// SetDSN sets the value returned by GetDSN.
func (f *FakeHost) SetDSN(dsn, schema string) {
	f.mu.Lock()
	f.DSNValue, f.SchemaValue = dsn, schema
	f.mu.Unlock()
}

func (f *FakeHost) Log(_ context.Context, in *pluginv1.LogRequest) (*pluginv1.LogResponse, error) {
	f.mu.Lock()
	f.logs = append(f.logs, LogEntry{Level: in.GetLevel(), Message: in.GetMessage(), Attrs: in.GetAttrs()})
	f.mu.Unlock()
	return &pluginv1.LogResponse{}, nil
}

func kvKey(ns, key string) string { return ns + "\x00" + key }

func (f *FakeHost) KVGet(_ context.Context, in *pluginv1.KVGetRequest) (*pluginv1.KVGetResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	it, ok := f.kv[kvKey(in.GetNamespace(), in.GetKey())]
	if !ok || (!it.expires.IsZero() && time.Now().After(it.expires)) {
		return &pluginv1.KVGetResponse{}, nil
	}
	return &pluginv1.KVGetResponse{Found: true, Value: it.value}, nil
}

func (f *FakeHost) KVSet(_ context.Context, in *pluginv1.KVSetRequest) (*pluginv1.KVSetResponse, error) {
	if len(in.GetValue()) > 64<<10 {
		return nil, status.Error(codes.InvalidArgument, "value too large")
	}
	it := kvItem{value: append([]byte(nil), in.GetValue()...)}
	if in.GetTtlSeconds() > 0 {
		it.expires = time.Now().Add(time.Duration(in.GetTtlSeconds()) * time.Second)
	}
	f.mu.Lock()
	f.kv[kvKey(in.GetNamespace(), in.GetKey())] = it
	f.mu.Unlock()
	return &pluginv1.KVSetResponse{}, nil
}

func (f *FakeHost) KVDelete(_ context.Context, in *pluginv1.KVDeleteRequest) (*pluginv1.KVDeleteResponse, error) {
	f.mu.Lock()
	delete(f.kv, kvKey(in.GetNamespace(), in.GetKey()))
	f.mu.Unlock()
	return &pluginv1.KVDeleteResponse{}, nil
}

func (f *FakeHost) KVList(_ context.Context, in *pluginv1.KVListRequest) (*pluginv1.KVListResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var keys []string
	nsPrefix := in.GetNamespace() + "\x00"
	for k := range f.kv {
		if !strings.HasPrefix(k, nsPrefix) {
			continue
		}
		key := strings.TrimPrefix(k, nsPrefix)
		if strings.HasPrefix(key, in.GetPrefix()) && key > in.GetCursor() {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)
	limit := int(in.GetLimit())
	if limit <= 0 || limit > 500 {
		limit = 500
	}
	next := ""
	if len(keys) > limit {
		keys = keys[:limit]
		next = keys[limit-1]
	}
	return &pluginv1.KVListResponse{Keys: keys, NextCursor: next}, nil
}

func (f *FakeHost) GetDSN(context.Context, *pluginv1.GetDSNRequest) (*pluginv1.GetDSNResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.DSNValue == "" {
		return nil, status.Error(codes.FailedPrecondition, "fake host: no DSN configured")
	}
	return &pluginv1.GetDSNResponse{Dsn: f.DSNValue, Schema: f.SchemaValue}, nil
}

func (f *FakeHost) AuthzCheck(_ context.Context, in *pluginv1.AuthzCheckRequest) (*pluginv1.AuthzCheckResponse, error) {
	f.mu.Lock()
	fn := f.Authz
	f.mu.Unlock()
	return &pluginv1.AuthzCheckResponse{Allowed: fn == nil || fn(in.GetUserId(), in.GetPermission())}, nil
}

func (f *FakeHost) ledgerChange(in *pluginv1.LedgerChangeRequest, credit bool) (*pluginv1.LedgerChangeResponse, error) {
	if in.GetIdempotencyKey() == "" || in.GetAmount() == "" {
		return nil, status.Error(codes.InvalidArgument, "amount and idempotency_key are required")
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	if e, ok := f.ledgerBy[in.GetIdempotencyKey()]; ok {
		return &pluginv1.LedgerChangeResponse{LedgerId: e.ID, Duplicate: true}, nil
	}
	e := LedgerEntry{Credit: credit, Req: in, ID: int64(len(f.ledger) + 1)}
	f.ledger = append(f.ledger, e)
	f.ledgerBy[in.GetIdempotencyKey()] = e
	return &pluginv1.LedgerChangeResponse{LedgerId: e.ID}, nil
}

func (f *FakeHost) LedgerCredit(_ context.Context, in *pluginv1.LedgerChangeRequest) (*pluginv1.LedgerChangeResponse, error) {
	return f.ledgerChange(in, true)
}

func (f *FakeHost) LedgerDebit(_ context.Context, in *pluginv1.LedgerChangeRequest) (*pluginv1.LedgerChangeResponse, error) {
	return f.ledgerChange(in, false)
}

// Dial implements a direct (unfiltered) egress tunnel.
func (f *FakeHost) Dial(stream pluginv1.EgressService_DialServer) error {
	first, err := stream.Recv()
	if err != nil {
		return err
	}
	open := first.GetOpen()
	if open == nil {
		return status.Error(codes.InvalidArgument, "first frame must be open")
	}
	f.mu.Lock()
	f.dials = append(f.dials, open.GetAddress())
	dial := f.DialFunc
	f.mu.Unlock()
	if dial == nil {
		d := &net.Dialer{Timeout: 10 * time.Second}
		dial = d.DialContext
	}
	conn, err := dial(stream.Context(), open.GetNetwork(), open.GetAddress())
	if err != nil {
		return stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Result{Result: &pluginv1.DialResult{Ok: false, Error: err.Error()}}})
	}
	defer conn.Close()
	if err := stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Result{Result: &pluginv1.DialResult{Ok: true, RemoteAddr: conn.RemoteAddr().String()}}}); err != nil {
		return err
	}
	var sendMu sync.Mutex
	done := make(chan struct{})
	go func() {
		defer close(done)
		buf := make([]byte, 32<<10)
		for {
			n, rerr := conn.Read(buf)
			if n > 0 {
				sendMu.Lock()
				serr := stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Data{Data: append([]byte(nil), buf[:n]...)}})
				sendMu.Unlock()
				if serr != nil {
					return
				}
			}
			if rerr != nil {
				msg := ""
				if !errors.Is(rerr, io.EOF) {
					msg = rerr.Error()
				}
				sendMu.Lock()
				_ = stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Close{Close: &pluginv1.DialClose{Error: msg}}})
				sendMu.Unlock()
				return
			}
		}
	}()
	for {
		fr, err := stream.Recv()
		if err != nil {
			_ = conn.Close()
			<-done
			return nil
		}
		switch k := fr.GetKind().(type) {
		case *pluginv1.EgressFrame_Data:
			if _, err := conn.Write(k.Data); err != nil {
				_ = conn.Close()
				<-done
				return nil
			}
		case *pluginv1.EgressFrame_Close:
			if cw, ok := conn.(interface{ CloseWrite() error }); ok {
				_ = cw.CloseWrite()
			} else {
				_ = conn.Close()
			}
		}
	}
}
