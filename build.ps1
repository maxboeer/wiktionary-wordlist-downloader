Write-Host "Starting multi-platform build"

# creating temp directory
Write-Host "creating temp directory..."
mkdir build/temp

# Bundling code using esbuild
Write-Host "bundling..."
npx esbuild --format=cjs --target=node20 --platform=node --bundle --outfile=build/temp/bundle.js main.js

# Win64 Build
Write-Host "Building for Windows 64-bit..."
node --experimental-sea-config sea-config.json
Copy-Item "build/binaries/node-v20.17.0-win-x64/node.exe" "build/out/wiktionary-downloader-win64.exe"
signtool remove /s build/out/wiktionary-downloader-win64.exe
npx postject build/out/wiktionary-downloader-win64.exe NODE_SEA_BLOB build/temp/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
# signtool sign /fd SHA256 build/out/wiktionary-downloader-win64.exe

# Win32 Build
Write-Host "Building for Windows 32-bit..."
Copy-Item "build/binaries/node-v20.17.0-win-x86/node.exe" "build/out/wiktionary-downloader-win32.exe"
signtool remove /s build/out/wiktionary-downloader-win32.exe
npx postject build/out/wiktionary-downloader-win32.exe NODE_SEA_BLOB build/temp/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
# signtool sign /fd SHA256 build/out/wiktionary-downloader-win32.exe

# Linux64 Build
Write-Host "Building for Linux 64-bit..."
Copy-Item "build/binaries/node-v20.17.0-linux-x64/bin/node" "build/out/wiktionary-downloader-linux64"
node --experimental-sea-config sea-config.json
npx postject build/out/wiktionary-downloader-linux64 NODE_SEA_BLOB build/temp/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# Linux ARM64 Build
Write-Host "Building for Linux ARM64..."
Copy-Item "build/binaries/node-v20.17.0-linux-arm64/bin/node" "build/out/wiktionary-downloader-linux-arm64"
node --experimental-sea-config sea-config.json
npx postject build/out/wiktionary-downloader-linux-arm64 NODE_SEA_BLOB build/temp/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
# Kein Signieren nötig für Linux ARM

# macOS x64 Build
Write-Host "Building for macOS 64-bit..."
Copy-Item "build/binaries/node-v20.17.0-darwin-x64/bin/node" "build/out/wiktionary-downloader-macos64"
node --experimental-sea-config sea-config.json
npx postject build/out/wiktionary-downloader-macos64 NODE_SEA_BLOB build/temp/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
# Optional: macOS code signing
# codesign --sign "Developer ID Application: Your Name" build/out/wiktionary-downloader-macos64

# macOS ARM64 Build
Write-Host "Building for macOS ARM64..."
Copy-Item "build/binaries/node-v20.17.0-darwin-arm64/bin/node" "build/out/wiktionary-downloader-macos-arm64"
node --experimental-sea-config sea-config.json
npx postject build/out/wiktionary-downloader-macos-arm64 NODE_SEA_BLOB build/temp/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
# Optional: macOS code signing
# codesign --sign "Developer ID Application: Your Name" build/out/wiktionary-downloader-macos-arm64

# Cleanup
Write-Host "cleaning up..."
rmdir build/temp -r

Write-Host "Build finished for all platforms!"