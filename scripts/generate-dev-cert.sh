#!/bin/bash
# =============================================================================
# Generate Self-Signed SSL Certificate for Local Development
# =============================================================================
#
# Usage:   bash scripts/generate-dev-cert.sh
# Result:  Creates certs/localhost.key and certs/localhost.cert
#
# Then set USE_HTTPS=true in your .env to enable HTTPS locally.
#
# NOTE: Your browser will show a security warning for self-signed certs.
#       This is expected. Click "Advanced" → "Proceed to localhost" to bypass.
# =============================================================================

set -e

CERT_DIR="certs"
KEY_FILE="$CERT_DIR/localhost.key"
CERT_FILE="$CERT_DIR/localhost.cert"
DAYS_VALID=365

echo "🔐 Generating self-signed SSL certificate for local development..."
echo ""

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate the self-signed certificate
openssl req -x509 \
  -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -days "$DAYS_VALID" \
  -nodes \
  -subj "/C=US/ST=Dev/L=Local/O=AeroCast/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo ""
echo "✅ Certificate generated successfully!"
echo ""
echo "   Key:  $KEY_FILE"
echo "   Cert: $CERT_FILE"
echo "   Valid for: $DAYS_VALID days"
echo ""
echo "📋 Next steps:"
echo "   1. Add USE_HTTPS=true to your .env file"
echo "   2. Run: npm run dev"
echo "   3. Open: https://localhost:3000"
echo ""
echo "⚠️  Your browser will show a security warning — this is normal for self-signed certs."
