#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  VITAL — Deploy React frontend to AWS S3
#
#  Prerequisites:
#    - AWS CLI installed and configured (aws configure)
#    - S3 bucket created with static website hosting enabled
#    - Bucket policy set to public read (see README)
#
#  Usage:
#    chmod +x deploy-s3.sh
#    ./deploy-s3.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e  # exit on any error

# ── CONFIG — edit these ───────────────────────────────────────────────────────
S3_BUCKET="your-bucket-name"           # e.g. vital-app-frontend
AWS_REGION="ap-south-1"               # Mumbai for India; us-east-1 for USA
API_URL="http://YOUR_EC2_IP:3001"     # Your EC2/server public IP
PDF_PROXY_URL="http://YOUR_EC2_IP:3003"
# ─────────────────────────────────────────────────────────────────────────────

echo "→ Building React app..."
cd client

# Write .env with production API URLs
cat > .env << EOF
REACT_APP_API_URL=${API_URL}
REACT_APP_PDF_PROXY_URL=${PDF_PROXY_URL}
EOF

npm ci --legacy-peer-deps
npm run build

echo "→ Uploading to S3 bucket: s3://${S3_BUCKET}..."

# Upload everything with proper cache headers
# HTML files — no cache (so users always get latest)
aws s3 sync build/ s3://${S3_BUCKET} \
  --region ${AWS_REGION} \
  --delete \
  --cache-control "no-cache, no-store, must-revalidate" \
  --exclude "*" \
  --include "*.html"

# Static assets — cache for 1 year (they have hashed filenames)
aws s3 sync build/ s3://${S3_BUCKET} \
  --region ${AWS_REGION} \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html"

echo ""
echo "✅ Deployed!"
echo "   Website URL: http://${S3_BUCKET}.s3-website.${AWS_REGION}.amazonaws.com"
echo ""
echo "   ⚠️  Remember to update CLIENT_URL in your .env file on the server:"
echo "   CLIENT_URL=http://${S3_BUCKET}.s3-website.${AWS_REGION}.amazonaws.com"
echo "   Then restart: docker compose restart api"
