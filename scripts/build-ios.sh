#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== CHEZ iOS Build Script ===${NC}"
echo ""

# Step 0: Auto-increment build number
echo -e "${YELLOW}[0/6] Incrementing build number...${NC}"
CURRENT_BUILD=$(grep -o 'buildNumber: "[0-9]*"' app.config.ts | grep -o '[0-9]*')
if [ -z "$CURRENT_BUILD" ]; then
  CURRENT_BUILD=0
fi
NEW_BUILD=$((CURRENT_BUILD + 1))
sed -i '' "s/buildNumber: \"[0-9]*\"/buildNumber: \"$NEW_BUILD\"/" app.config.ts
echo -e "Build number: ${CURRENT_BUILD} -> ${NEW_BUILD}"
echo ""

# Configuration
APP_NAME="chez"
SCHEME="Chez"
WORKSPACE="ios/${APP_NAME}.xcworkspace"
ARCHIVE_PATH="build/${APP_NAME}.xcarchive"
EXPORT_PATH="build/export"
EXPORT_OPTIONS_PLIST="scripts/ExportOptions.plist"
API_KEY_PATH="$HOME/.private_keys/AuthKey_${APP_STORE_CONNECT_API_KEY_ID}.p8"

# Check for API credentials
if [ -z "$APP_STORE_CONNECT_API_KEY_ID" ] || [ -z "$APP_STORE_CONNECT_ISSUER_ID" ]; then
  echo -e "${RED}Error: Missing App Store Connect credentials${NC}"
  echo "Please set APP_STORE_CONNECT_API_KEY_ID and APP_STORE_CONNECT_ISSUER_ID"
  exit 1
fi

if [ ! -f "$API_KEY_PATH" ]; then
  echo -e "${RED}Error: API key file not found at $API_KEY_PATH${NC}"
  exit 1
fi

echo -e "Using API Key: ${APP_STORE_CONNECT_API_KEY_ID}"
echo ""

# Step 1: Clean previous builds
echo -e "${YELLOW}[1/6] Cleaning previous builds...${NC}"
rm -rf build/
rm -rf ios/

# Step 2: Generate native project
echo -e "${YELLOW}[2/6] Generating native iOS project...${NC}"
npx expo prebuild --platform ios --clean

# Step 3: Install CocoaPods
echo -e "${YELLOW}[3/6] Installing CocoaPods dependencies...${NC}"
cd ios
pod install --repo-update
cd ..

# Step 4: Build archive
echo -e "${YELLOW}[4/6] Building archive (this may take a few minutes)...${NC}"
mkdir -p build

xcodebuild -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination "generic/platform=iOS" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$API_KEY_PATH" \
  -authenticationKeyID "$APP_STORE_CONNECT_API_KEY_ID" \
  -authenticationKeyIssuerID "$APP_STORE_CONNECT_ISSUER_ID" \
  CODE_SIGN_IDENTITY=- \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  clean archive

# Step 5: Export IPA
echo -e "${YELLOW}[5/6] Exporting IPA...${NC}"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$API_KEY_PATH" \
  -authenticationKeyID "$APP_STORE_CONNECT_API_KEY_ID" \
  -authenticationKeyIssuerID "$APP_STORE_CONNECT_ISSUER_ID"

# Step 6: Upload to App Store Connect (if not already uploaded via export)
if [ -f "${EXPORT_PATH}/${APP_NAME}.ipa" ]; then
  echo -e "${YELLOW}[6/6] Uploading to App Store Connect...${NC}"
  xcrun altool --upload-app \
    --type ios \
    --file "${EXPORT_PATH}/${APP_NAME}.ipa" \
    --apiKey "$APP_STORE_CONNECT_API_KEY_ID" \
    --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID"
else
  echo -e "${GREEN}[6/6] App was uploaded during export step${NC}"
fi

echo ""
echo -e "${GREEN}=== Build Complete! ===${NC}"
echo -e "Check App Store Connect for your build."
