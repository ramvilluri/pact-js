#!/bin/bash -eu
set -e
set -u
set -x

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

npm ci
git checkout native
npm run dist

rustup target add aarch64-apple-darwin
export SDKROOT=$(xcrun -sdk macosx11.1 --show-sdk-path)
export MACOSX_DEPLOYMENT_TARGET=$(xcrun -sdk macosx11.1 --show-sdk-platform-version)
npm run build:v3
