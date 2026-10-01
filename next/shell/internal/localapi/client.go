package localapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

type Client struct {
	socket, token string
	http          *http.Client
}

func New(socket, token string) *Client {
	return &Client{socket: socket, token: token, http: &http.Client{Transport: &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", socket)
	}}, Timeout: 30 * time.Second}}
}
func (c *Client) Call(ctx context.Context, method, path string, in, out any) error {
	var body io.Reader
	if in != nil {
		data, err := json.Marshal(in)
		if err != nil {
			return err
		}
		body = bytes.NewReader(data)
	}
	req, err := http.NewRequestWithContext(ctx, method, "http://core"+path, body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("core control %s: HTTP %d", path, res.StatusCode)
	}
	if out != nil {
		return json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(out)
	}
	return nil
}
func (c *Client) Hello(ctx context.Context) (v rc.Hello, err error) {
	err = c.Call(ctx, "GET", rc.HelloPath, nil, &v)
	return
}
func (c *Client) Status(ctx context.Context) (v rc.Status, err error) {
	err = c.Call(ctx, "GET", rc.StatusPath, nil, &v)
	return
}
func (c *Client) Prepare(ctx context.Context, v rc.PrepareRequest) error {
	return c.Call(ctx, "POST", rc.PreparePath, v, nil)
}
func (c *Client) Admit(ctx context.Context, v rc.Admission) error {
	return c.Call(ctx, "POST", rc.AdmissionPath, v, nil)
}
func (c *Client) Drain(ctx context.Context, v rc.DrainRequest) error {
	return c.Call(ctx, "POST", rc.DrainPath, v, nil)
}
func (c *Client) Shutdown(ctx context.Context) error {
	return c.Call(ctx, "POST", rc.ShutdownPath, struct{}{}, nil)
}
