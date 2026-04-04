package jwt

import (
	"crypto/ed25519"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	jwtv5 "github.com/golang-jwt/jwt/v5"
)

type contextKey string

const ContextKeyClaims contextKey = "claims"

// Claims are the JWT claims carried through the request context.
type Claims struct {
	UserID string `json:"sub"`
	Email  string `json:"email"`
	jwtv5.RegisteredClaims
}

// GetClaims extracts claims from a request that passed through the bearer middleware.
func GetClaims(r *http.Request) *Claims {
	claims, _ := r.Context().Value(ContextKeyClaims).(*Claims)
	return claims
}

// LoadPublicKey parses a PEM-encoded public key string (RSA or Ed25519).
func LoadPublicKey(pemContent string) (any, error) {
	if pemContent == "" {
		return nil, fmt.Errorf("JWT_PUBLIC_KEY is not set")
	}

	pemContent = ensurePEMNewlines(pemContent)
	block, _ := pem.Decode([]byte(pemContent))
	if block == nil {
		return nil, fmt.Errorf("public key is not valid PEM")
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse public key: %w", err)
	}
	return pub, nil
}

// LoadPrivateKey parses a PEM-encoded private key string (RSA or Ed25519).
func LoadPrivateKey(pemContent string) (any, error) {
	if pemContent == "" {
		return nil, fmt.Errorf("JWT_PRIVATE_KEY is not set")
	}

	pemContent = ensurePEMNewlines(pemContent)
	block, _ := pem.Decode([]byte(pemContent))
	if block == nil {
		return nil, fmt.Errorf("private key is not valid PEM")
	}

	// x509.ParsePKCS8PrivateKey handles RSA, Ed25519, and others.
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		// Fallback to PKCS#1 for older RSA keys
		if rsaKey, err2 := x509.ParsePKCS1PrivateKey(block.Bytes); err2 == nil {
			return rsaKey, nil
		}
		return nil, fmt.Errorf("parse private key: %w", err)
	}
	return key, nil
}

// SignToken creates a signed JWT with the given user info.
func SignToken(privateKey any, ttl time.Duration, userID, email string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwtv5.RegisteredClaims{
			IssuedAt:  jwtv5.NewNumericDate(now),
			ExpiresAt: jwtv5.NewNumericDate(now.Add(ttl)),
			Subject:   userID,
			Issuer:    "rclone-cloud-api",
			Audience:  jwtv5.ClaimStrings{"rclone-cloud-ui"},
		},
	}

	var method jwtv5.SigningMethod
	switch privateKey.(type) {
	case *rsa.PrivateKey:
		method = jwtv5.SigningMethodRS256
	case ed25519.PrivateKey:
		method = jwtv5.SigningMethodEdDSA
	default:
		return "", fmt.Errorf("unsupported private key type: %T", privateKey)
	}

	token := jwtv5.NewWithClaims(method, claims)
	return token.SignedString(privateKey)
}

// VerifyToken parses and validates a token string against the given public key.
func VerifyToken(raw string, publicKey any) (*Claims, error) {
	claims := &Claims{}
	token, err := jwtv5.ParseWithClaims(raw, claims, func(t *jwtv5.Token) (any, error) {
		switch publicKey.(type) {
		case *rsa.PublicKey:
			if _, ok := t.Method.(*jwtv5.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
		case ed25519.PublicKey:
			if _, ok := t.Method.(*jwtv5.SigningMethodEd25519); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
		}
		return publicKey, nil
	}, jwtv5.WithIssuer("rclone-cloud-api"), jwtv5.WithAudience("rclone-cloud-ui"))

	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func ensurePEMNewlines(pemStr string) string {
	pemStr = strings.TrimSpace(pemStr)
	if !strings.HasPrefix(pemStr, "-----BEGIN") {
		return pemStr
	}
	// If it already has multiple lines, assume it's fine
	if strings.Contains(pemStr, "\n") {
		return pemStr
	}

	// It's a single line. We need to split it at the headers.
	// Find the end of the first header
	firstDashIdx := strings.Index(pemStr[5:], "-----")
	if firstDashIdx == -1 {
		return pemStr
	}
	headerEnd := 5 + firstDashIdx + 5

	// Find the start of the footer
	footerStart := strings.LastIndex(pemStr, "-----END")
	if footerStart == -1 || footerStart <= headerEnd {
		return pemStr
	}

	header := pemStr[:headerEnd]
	content := pemStr[headerEnd:footerStart]
	footer := pemStr[footerStart:]

	return header + "\n" + content + "\n" + footer
}
