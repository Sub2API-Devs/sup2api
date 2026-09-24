package grpcruntime

import (
	"context"
	"encoding/json"
	"regexp"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Plugin cluster broadcast (CONTRACTS §14.3): HostService.Publish sends a
// BroadcastMessage on channel BroadcastChannel(key); every other node hands
// it to its local instance of the plugin (AppService.OnBroadcast).
const (
	BroadcastChannelPrefix = "plugin:broadcast:"
	BroadcastMaxPayload    = 64 << 10
	BroadcastTimeout       = 2 * time.Second
	// PermBroadcast is the host permission required by HostService.Publish.
	PermBroadcast = "broadcast"
)

var broadcastTopicRE = regexp.MustCompile(`^[a-z0-9_.-]{1,64}$`)

// BroadcastChannel is the bus channel of one plugin's broadcasts.
func BroadcastChannel(pluginKey string) string { return BroadcastChannelPrefix + pluginKey }

// BroadcastMessage is the bus payload of a plugin broadcast.
type BroadcastMessage struct {
	Topic        string `json:"topic"`
	Payload      []byte `json:"payload,omitempty"`
	SourceNodeID string `json:"source_node_id"`
	SourceBootID string `json:"source_boot_id"`
}

// ValidBroadcastTopic reports whether topic matches ^[a-z0-9_.-]{1,64}$.
func ValidBroadcastTopic(topic string) bool { return broadcastTopicRE.MatchString(topic) }

// Publish implements HostService.Publish.
func (h *hostServer) Publish(ctx context.Context, in *pluginv1.PublishRequest) (*pluginv1.PublishResponse, error) {
	if err := h.require(PermBroadcast); err != nil {
		return nil, err
	}
	if !ValidBroadcastTopic(in.GetTopic()) {
		return nil, status.Error(codes.InvalidArgument, "topic must match ^[a-z0-9_.-]{1,64}$")
	}
	if len(in.GetPayload()) > BroadcastMaxPayload {
		return nil, status.Errorf(codes.InvalidArgument, "payload exceeds %d bytes", BroadcastMaxPayload)
	}
	bus := h.i.rt.o.Bus
	if bus == nil {
		return nil, status.Error(codes.Unavailable, "broadcast unavailable")
	}
	node := h.i.rt.o.Node
	b, err := json.Marshal(BroadcastMessage{
		Topic: in.GetTopic(), Payload: in.GetPayload(),
		SourceNodeID: node.NodeID(), SourceBootID: node.BootID(),
	})
	if err != nil {
		return nil, status.Error(codes.Internal, "encode broadcast")
	}
	if err := bus.Publish(ctx, BroadcastChannel(h.key()), b); err != nil {
		h.i.log.Warn("plugin broadcast publish failed", "topic", in.GetTopic(), "err", err)
		return nil, status.Error(codes.Unavailable, "broadcast unavailable")
	}
	return &pluginv1.PublishResponse{}, nil
}

// HandlesBroadcast reports whether the plugin declares app.broadcast.v1.
func (i *Instance) HandlesBroadcast() bool { return i.caps[manifest.CapAppBroadcast] }

// OnBroadcast delivers a broadcast from another node to this instance
// (BroadcastTimeout at most). Plugins without app.broadcast.v1 are skipped.
func (i *Instance) OnBroadcast(ctx context.Context, msg BroadcastMessage) error {
	if !i.HandlesBroadcast() {
		return nil
	}
	return i.call(ctx, BroadcastTimeout, func(ctx context.Context, p *proc) error {
		_, err := p.app.OnBroadcast(ctx, &pluginv1.OnBroadcastRequest{
			Topic: msg.Topic, Payload: msg.Payload, SourceNodeId: msg.SourceNodeID,
		})
		return err
	})
}
