Write-Host "Starting build"
Write-Host "creating temp directory..."
mkdir build/temp
Write-Host "bundling..."
npx esbuild --format=cjs --target=node20 --platform=node --bundle --outfile=build/temp/bundle.js main.js
Write-Host "creating blob..."
node --experimental-sea-config sea-config.json
Write-Host "creating executable..."
node -e "require('fs').copyFileSync(process.execPath, 'build/wiktionary-downloader.exe')"
Write-Host "removing signature from executable..."
signtool remove /s build/wiktionary-downloader.exe
Write-Host "injecting blob into executable..."
npx postject build/wiktionary-downloader.exe NODE_SEA_BLOB build/temp/sea-prep.blob  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
Write-Host "signing executable..."
signtool sign /fd SHA256 build/wiktionary-downloader.exe
Write-Host "cleaning up..."
rmdir build/temp -r
Write-Host "Build finished!"