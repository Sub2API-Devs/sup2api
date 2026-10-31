package mailer

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"mime"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

// severityPrefix marks the subject of urgent notifications.
var severityPrefix = map[string]string{protocol.SeverityWarning: "[Warning] ", protocol.SeverityCritical: "[Critical] "}

// compose builds the RFC 5322 message: UTF-8 plain text, base64 encoded.
func compose(s *Settings, in *pluginv1.DeliverNotificationRequest, now time.Time) []byte {
	var b bytes.Buffer
	header := func(k, v string) { fmt.Fprintf(&b, "%s: %s\r\n", k, v) }
	from := mail.Address{Name: s.FromName, Address: s.FromAddress}
	header("From", from.String())
	header("To", strings.Join(in.GetRecipients(), ",\r\n "))
	header("Subject", encodeSubject(severityPrefix[in.GetSeverity()]+in.GetSubject()))
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

// subjectChunkBytes keeps an encoded word within the 75 characters of
// RFC 2047: 45 bytes are 60 base64 characters plus 12 of "=?utf-8?b?...?=".
const subjectChunkBytes = 45

// encodeSubject B-encodes a subject that needs it, one encoded word per
// subjectChunkBytes bytes (cut between runes) on folded lines, so a long
// non-ASCII subject stays within the line limit of RFC 5322.
func encodeSubject(subject string) string {
	if mime.BEncoding.Encode("utf-8", subject) == subject {
		return subject
	}
	var words []string
	for subject != "" {
		n := 0
		for n < len(subject) {
			_, size := utf8.DecodeRuneInString(subject[n:])
			if n+size > subjectChunkBytes {
				break
			}
			n += size
		}
		words = append(words, mime.BEncoding.Encode("utf-8", subject[:n]))
		subject = subject[n:]
	}
	return strings.Join(words, "\r\n ")
}

func domainOf(address string) string {
	if i := strings.LastIndexByte(address, '@'); i >= 0 {
		return address[i+1:]
	}
	return "localhost"
}
