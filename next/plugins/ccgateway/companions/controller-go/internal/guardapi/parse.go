package guardapi

import (
	"errors"
	"strings"

	"ccgateway/controller/internal/pyjson"
)

var errShape = errors.New("guardapi: unexpected answer shape")

func obj(v any) pyjson.Ordered {
	o, _ := v.(pyjson.Ordered)
	return o
}

func get(o pyjson.Ordered, path ...string) any {
	var v any = o
	for _, k := range path {
		m, ok := v.(pyjson.Ordered)
		if !ok {
			return nil
		}
		v, _ = m.Get(k)
	}
	return v
}

func str(v any) string {
	s, _ := v.(string)
	return s
}

func strList(v any) []string {
	list, ok := v.([]any)
	if !ok {
		return nil
	}
	out := make([]string, 0, len(list))
	for _, item := range list {
		if s, ok := item.(string); ok {
			out = append(out, s)
		}
	}
	return out
}

func strMap(v any) map[string]string {
	out := map[string]string{}
	for _, kv := range obj(v) {
		if s, ok := kv.Value.(string); ok {
			out[kv.Key] = s
		}
	}
	return out
}

// ParseContainer reads a raw container inspect (a decoded JSON object).
func ParseContainer(v any) (*Container, error) {
	if v == nil {
		return nil, nil
	}
	raw, ok := v.(pyjson.Ordered)
	if !ok {
		return nil, errShape
	}
	c := &Container{
		Raw:         raw,
		ID:          str(get(raw, "Id")),
		Name:        strings.TrimPrefix(str(get(raw, "Name")), "/"),
		Image:       str(get(raw, "Image")),
		Created:     str(get(raw, "Created")),
		Path:        str(get(raw, "Path")),
		Args:        strList(get(raw, "Args")),
		Status:      str(get(raw, "State", "Status")),
		StartedAt:   str(get(raw, "State", "StartedAt")),
		Labels:      strMap(get(raw, "Config", "Labels")),
		Env:         strList(get(raw, "Config", "Env")),
		User:        str(get(raw, "Config", "User")),
		ConfigImage: str(get(raw, "Config", "Image")),
		NetworkMode: str(get(raw, "HostConfig", "NetworkMode")),
		Networks:    map[string]Endpoint{},
	}
	for _, kv := range obj(get(raw, "NetworkSettings", "Networks")) {
		e := obj(kv.Value)
		c.Networks[kv.Key] = Endpoint{IPAddress: str(get(e, "IPAddress")), NetworkID: str(get(e, "NetworkID"))}
	}
	if list, ok := get(raw, "Mounts").([]any); ok {
		for _, item := range list {
			m := obj(item)
			rw, _ := get(m, "RW").(bool)
			c.Mounts = append(c.Mounts, Mount{Type: str(get(m, "Type")), Name: str(get(m, "Name")),
				Source: str(get(m, "Source")), Destination: str(get(m, "Destination")), Driver: str(get(m, "Driver")),
				Mode: str(get(m, "Mode")), Propagation: str(get(m, "Propagation")), RW: rw})
		}
	}
	return c, nil
}

// ParseNetwork reads a raw network inspect.
func ParseNetwork(v any) (*Network, error) {
	if v == nil {
		return nil, nil
	}
	raw, ok := v.(pyjson.Ordered)
	if !ok {
		return nil, errShape
	}
	n := &Network{Raw: raw, ID: str(get(raw, "Id")), Name: str(get(raw, "Name")), Created: str(get(raw, "Created")),
		Labels: strMap(get(raw, "Labels")), Containers: map[string]NetEndpoint{}}
	if list, ok := get(raw, "IPAM", "Config").([]any); ok {
		for _, item := range list {
			cfg := obj(item)
			n.IPAM = append(n.IPAM, IPAMConfig{Subnet: str(get(cfg, "Subnet")), Gateway: str(get(cfg, "Gateway"))})
		}
	}
	for _, kv := range obj(get(raw, "Containers")) {
		e := obj(kv.Value)
		n.Containers[kv.Key] = NetEndpoint{Name: str(get(e, "Name")), IPv4Address: str(get(e, "IPv4Address"))}
	}
	return n, nil
}

// ParseVolume reads a raw volume inspect.
func ParseVolume(v any) (*Volume, error) {
	if v == nil {
		return nil, nil
	}
	raw, ok := v.(pyjson.Ordered)
	if !ok {
		return nil, errShape
	}
	return &Volume{Raw: raw, Name: str(get(raw, "Name")), Driver: str(get(raw, "Driver")),
		Options: strMap(get(raw, "Options")), Labels: strMap(get(raw, "Labels")), CreatedAt: str(get(raw, "CreatedAt"))}, nil
}

func parseRefs(v any) []ContainerRef {
	list, _ := v.([]any)
	out := make([]ContainerRef, 0, len(list))
	for _, item := range list {
		o := obj(item)
		out = append(out, ContainerRef{ID: str(get(o, "Id")), Name: str(get(o, "Name")), Status: str(get(o, "Status"))})
	}
	return out
}

func parseAccount(v any) (*Account, error) {
	o, ok := v.(pyjson.Ordered)
	if !ok {
		return nil, errShape
	}
	a := &Account{}
	var err error
	if a.App, err = ParseContainer(get(o, "app")); err != nil {
		return nil, err
	}
	if list, ok := get(o, "others").([]any); ok {
		for _, item := range list {
			c, err := ParseContainer(item)
			if err != nil {
				return nil, err
			}
			if c != nil {
				a.Others = append(a.Others, c)
			}
		}
	}
	if a.Network, err = ParseNetwork(get(o, "network")); err != nil {
		return nil, err
	}
	if a.Uplink, err = ParseNetwork(get(o, "uplink")); err != nil {
		return nil, err
	}
	if a.Volume, err = ParseVolume(get(o, "volume")); err != nil {
		return nil, err
	}
	a.VolumeUsers = parseRefs(get(o, "volume_users"))
	a.NetworkForeign = parseRefs(get(o, "network_foreign"))
	a.GatewayAttached, _ = get(o, "gateway_attached").(bool)
	return a, nil
}

func parseInventory(v any) (*Inventory, error) {
	o, ok := v.(pyjson.Ordered)
	if !ok {
		return nil, errShape
	}
	inv := &Inventory{}
	for _, item := range anyList(get(o, "containers")) {
		c, err := ParseContainer(item)
		if err != nil {
			return nil, err
		}
		inv.Containers = append(inv.Containers, c)
	}
	for _, item := range anyList(get(o, "networks")) {
		n, err := ParseNetwork(item)
		if err != nil {
			return nil, err
		}
		inv.Networks = append(inv.Networks, n)
	}
	for _, item := range anyList(get(o, "volumes")) {
		vol, err := ParseVolume(item)
		if err != nil {
			return nil, err
		}
		inv.Volumes = append(inv.Volumes, vol)
	}
	return inv, nil
}

func anyList(v any) []any {
	l, _ := v.([]any)
	return l
}
