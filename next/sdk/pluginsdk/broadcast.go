package pluginsdk

import (
	"context"
	"fmt"
	"regexp"
	"sync"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Cluster broadcasts ("app.broadcast.v1", host permission "broadcast").
//
// Host.Publish sends a small message to the instances of the same plugin on
// every other live node; the host relays it through Redis and calls
// AppService.OnBroadcast there (never on the publishing node). Delivery is
// BEST EFFORT: a message may be lost (node restarting, Redis hiccup,
// instance not running yet), delivered late, twice or out of order, and
// there is no acknowledgement or replay. Use broadcasts as a latency
// optimisation only, e.g. "rules changed, reload now", and keep a periodic
// refresh as the source of truth.

// MaxBroadcastPayload is the largest payload Host.Publish accepts (64 KiB).
const MaxBroadcastPayload = 64 << 10

var broadcastTopicRe = regexp.MustCompile(`^[a-z0-9_.-]{1,64}$`)

// ValidBroadcastTopic reports whether topic matches ^[a-z0-9_.-]{1,64}$.
func ValidBroadcastTopic(topic string) bool { return broadcastTopicRe.MatchString(topic) }

// BroadcastHandler mirrors the broadcast part of pluginv1.AppServiceServer
// ("app.broadcast.v1"). A plugin implementing it must declare the
// capability and the host permission "broadcast" in its manifest (checked
// by Serve). Handlers must tolerate lost, duplicated and reordered messages
// and may be called before Init returned. See BroadcastMux.
type BroadcastHandler interface {
	OnBroadcast(context.Context, *pluginv1.OnBroadcastRequest) (*pluginv1.OnBroadcastResponse, error)
}

// Broadcast is one message received from another node.
type Broadcast struct {
	Topic        string
	Payload      []byte
	SourceNodeID string
}

// BroadcastFunc handles the broadcasts of one topic.
type BroadcastFunc func(ctx context.Context, b Broadcast) error

// BroadcastMux dispatches broadcasts by topic. Embed a *BroadcastMux in the
// plugin (like Router) to implement BroadcastHandler:
//
//	p := &Plugin{BroadcastMux: pluginsdk.NewBroadcastMux()}
//	p.OnTopic("rules.changed", p.onRulesChanged)
//
// Messages for topics without a handler are ignored: a newer version on
// another node (during a rollout) may publish topics this one does not know.
type BroadcastMux struct {
	mu       sync.RWMutex
	handlers map[string]BroadcastFunc
}

// NewBroadcastMux returns an empty mux.
func NewBroadcastMux() *BroadcastMux { return &BroadcastMux{handlers: map[string]BroadcastFunc{}} }

// OnTopic registers fn for topic, replacing any previous handler. It panics
// on an invalid topic (a programming error).
func (m *BroadcastMux) OnTopic(topic string, fn BroadcastFunc) {
	if !ValidBroadcastTopic(topic) {
		panic(fmt.Sprintf("pluginsdk: invalid broadcast topic %q", topic))
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.handlers == nil {
		m.handlers = map[string]BroadcastFunc{}
	}
	m.handlers[topic] = fn
}

// OnBroadcast implements BroadcastHandler.
func (m *BroadcastMux) OnBroadcast(ctx context.Context, in *pluginv1.OnBroadcastRequest) (*pluginv1.OnBroadcastResponse, error) {
	m.mu.RLock()
	fn := m.handlers[in.GetTopic()]
	m.mu.RUnlock()
	if fn == nil {
		return &pluginv1.OnBroadcastResponse{}, nil
	}
	if err := fn(ctx, Broadcast{Topic: in.GetTopic(), Payload: in.GetPayload(), SourceNodeID: in.GetSourceNodeId()}); err != nil {
		if _, ok := status.FromError(err); ok {
			return nil, err
		}
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &pluginv1.OnBroadcastResponse{}, nil
}

// checkBroadcastManifest checks the embedded manifest against the plugin:
// declaring app.broadcast.v1 needs a BroadcastHandler implementation (the
// host will call OnBroadcast) and the host permission "broadcast" (without
// it the host rejects Publish and delivers nothing).
func checkBroadcastManifest(p any, m *manifest.Manifest, declared map[string]bool) error {
	_, implements := p.(BroadcastHandler)
	if !declared[manifest.CapAppBroadcast] {
		return nil
	}
	if !implements {
		return fmt.Errorf("manifest declares capability %s but the plugin does not implement OnBroadcast (embed a *pluginsdk.BroadcastMux)", manifest.CapAppBroadcast)
	}
	for _, hp := range m.HostPermissions {
		if hp.ID == "broadcast" {
			return nil
		}
	}
	return fmt.Errorf("manifest declares capability %s but not host permission \"broadcast\"", manifest.CapAppBroadcast)
}

// publish validates and sends one broadcast (Host.Publish).
func publish(ctx context.Context, c pluginv1.HostServiceClient, topic string, payload []byte) error {
	if !ValidBroadcastTopic(topic) {
		return status.Errorf(codes.InvalidArgument, "pluginsdk: broadcast topic %q must match %s", topic, broadcastTopicRe)
	}
	if len(payload) > MaxBroadcastPayload {
		return status.Errorf(codes.InvalidArgument, "pluginsdk: broadcast payload is %d bytes, max %d", len(payload), MaxBroadcastPayload)
	}
	_, err := c.Publish(ctx, &pluginv1.PublishRequest{Topic: topic, Payload: payload})
	return err
}
