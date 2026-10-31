package mailer

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"mime"
	"net/mail"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// severityPrefix marks the subject of urgent notifications.
var severityPrefix = map[string]string{"warning": "[Warning] ", "critical": "[Critical] "}

// compose builds the RFC 5322 message: UTF-8 plain text, base64 encoded.
func compose(s *Settings, in *pluginv1.DeliverNotificationRequest, now time.Time) []byte {
	var b bytes.Buffer
	header := func(k, v string) { fmt.Fprintf(&b, "%s: %s\r\n", k, v) }
	from := mail.Address{Name: s.FromName, Address: s.FromAddress}
	header("From", from.String())
	header("To", strings.Join(in.GetRecipients(), ", "))
	header("Subject", mime.QEncoding.Encode("utf-8", severityPrefix[in.GetSeverity()]+in.GetSubject()))
	header("Date", now.Format(time.RFC1123Z))
	header("Message-ID", fmt.Sprintf("<sub2api-notification-%d@%s>", in.GetId(), domainOf(s.FromAddress)))
	header("MIME-Version", "1.0")
	header("Content-Type", `text/plain; charset="utf-8"`)
	header("Content-Transfer-Encoding", "base64")
	header("X-Sub2API-Source", in.GetSource())
	b.WriteString("\r\n")
	enc := base64.StdEncoding.EncodeToString([]byte(in.GetBody()))
	for len(enc) > 76 {
		b.WriteString(enc[:76] + "\r\n")
		enc = enc[76:]
	}
	b.WriteString(enc + "\r\n")
	return b.Bytes()
}

func domainOf(address string) string {
	if i := strings.LastIndexByte(address, '@'); i >= 0 {
		return address[i+1:]
	}
	return "localhost"
}
