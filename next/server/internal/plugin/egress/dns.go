package egress

import (
	"context"
	"encoding/binary"
	"errors"
	"io"
	"net"
	"time"

	"golang.org/x/net/dns/dnsmessage"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

const (
	dnsIdleTimeout   = 30 * time.Second
	dnsLookupTimeout = 5 * time.Second
	dnsAnswerTTL     = 30
)

// serveDNS answers DNS-over-TCP queries (RFC 7766 framing) on conn until
// the peer closes it or it is idle for 30 s.
func (p *Provider) serveDNS(ctx context.Context, conn net.Conn, pluginKey string, pol core.EgressPolicy) {
	defer conn.Close()
	var lb [2]byte
	for {
		_ = conn.SetReadDeadline(time.Now().Add(dnsIdleTimeout))
		if _, err := io.ReadFull(conn, lb[:]); err != nil {
			return
		}
		msg := make([]byte, binary.BigEndian.Uint16(lb[:]))
		if _, err := io.ReadFull(conn, msg); err != nil {
			return
		}
		resp := p.answerDNS(ctx, pluginKey, pol, msg)
		if resp == nil {
			return
		}
		out := make([]byte, 2+len(resp))
		binary.BigEndian.PutUint16(out, uint16(len(resp)))
		copy(out[2:], resp)
		_ = conn.SetWriteDeadline(time.Now().Add(dnsIdleTimeout))
		if _, err := conn.Write(out); err != nil {
			return
		}
	}
}

// answerDNS builds the response for one query; nil means the query could
// not be parsed at all and the connection should be dropped.
func (p *Provider) answerDNS(ctx context.Context, pluginKey string, pol core.EgressPolicy, msg []byte) []byte {
	start := time.Now()
	var parser dnsmessage.Parser
	h, err := parser.Start(msg)
	if err != nil {
		return nil
	}
	hdr := dnsmessage.Header{
		ID: h.ID, Response: true, OpCode: h.OpCode,
		RecursionDesired: h.RecursionDesired, RecursionAvailable: true,
	}
	q, err := parser.Question()
	if err != nil {
		hdr.RCode = dnsmessage.RCodeFormatError
		return buildDNS(hdr, nil, nil)
	}
	name := normalizeHost(q.Name.String())
	entry := logEntry{
		PluginKey: pluginKey, NodeID: p.opts.NodeID, Network: "dns",
		Host: truncate(name, 255), Port: DNSPort, StartedAt: start, BytesOut: int64(len(msg)),
	}
	var answers []dnsmessage.Resource
	result, errMsg := ResultOK, ""

	switch {
	case q.Class != dnsmessage.ClassINET || (q.Type != dnsmessage.TypeA && q.Type != dnsmessage.TypeAAAA):
		hdr.RCode = dnsmessage.RCodeNotImplemented
		result, errMsg = ResultDenied, "unsupported query type "+q.Type.String()
	case !AllowedHost(pol, name):
		hdr.RCode = dnsmessage.RCodeRefused
		result, errMsg = ResultDenied, "blocked by egress policy"
	default:
		lctx, cancel := context.WithTimeout(ctx, dnsLookupTimeout)
		ips, err := p.opts.LookupIP(lctx, name)
		cancel()
		var dnsErr *net.DNSError
		switch {
		case err != nil && errors.As(err, &dnsErr) && dnsErr.IsNotFound:
			hdr.RCode = dnsmessage.RCodeNameError
			errMsg = "nxdomain"
		case err != nil:
			hdr.RCode = dnsmessage.RCodeServerFailure
			result, errMsg = ResultDialError, err.Error()
		default:
			rh := dnsmessage.ResourceHeader{Name: q.Name, Class: dnsmessage.ClassINET, TTL: dnsAnswerTTL}
			for _, ip := range ips {
				ip = ip.Unmap()
				switch {
				case q.Type == dnsmessage.TypeA && ip.Is4():
					rh.Type = dnsmessage.TypeA
					answers = append(answers, dnsmessage.Resource{Header: rh, Body: &dnsmessage.AResource{A: ip.As4()}})
				case q.Type == dnsmessage.TypeAAAA && ip.Is6():
					rh.Type = dnsmessage.TypeAAAA
					answers = append(answers, dnsmessage.Resource{Header: rh, Body: &dnsmessage.AAAAResource{AAAA: ip.As16()}})
				}
			}
			// No address of the requested family: NOERROR with no answers.
		}
	}
	resp := buildDNS(hdr, &q, answers)
	entry.BytesIn = int64(len(resp))
	entry.Result, entry.Error = result, errMsg
	entry.DurationMS = int(time.Since(start).Milliseconds())
	p.logs.add(entry)
	return resp
}

func buildDNS(hdr dnsmessage.Header, q *dnsmessage.Question, answers []dnsmessage.Resource) []byte {
	b := dnsmessage.NewBuilder(make([]byte, 0, 512), hdr)
	b.EnableCompression()
	if q != nil {
		if err := b.StartQuestions(); err != nil {
			return nil
		}
		if err := b.Question(*q); err != nil {
			return nil
		}
	}
	if len(answers) > 0 {
		if err := b.StartAnswers(); err != nil {
			return nil
		}
		for _, a := range answers {
			var err error
			switch body := a.Body.(type) {
			case *dnsmessage.AResource:
				err = b.AResource(a.Header, *body)
			case *dnsmessage.AAAAResource:
				err = b.AAAAResource(a.Header, *body)
			}
			if err != nil {
				return nil
			}
		}
	}
	out, err := b.Finish()
	if err != nil {
		return nil
	}
	return out
}
