#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage $0 <ENS address>";
    exit 1;
fi

ENS=$1

mkdir -p /tmp/enigma-voting-tmp/
cd /tmp/enigma-voting-tmp/
if [ ! -d aragon-apps ]; then
    git clone https://github.com/aragon/aragon-apps.git
fi
cd aragon-apps
#npm install

# finance and token-manager
for app in finance token-manager; do
    cd apps/$app;
    ./node_modules/.bin/truffle compile
    sed -i "s/\"registry\": \"0x[a-zA-Z0-9]*\"/\"registry\": \"${ENS}\"/g" arapp.json;
    aragon apm publish minor --files app/build
    cd -
done;

# vault
cd apps/vault;
./node_modules/.bin/truffle compile
sed -i "s/\"registry\": \"0x[a-zA-Z0-9]*\"/\"registry\": \"${ENS}\"/g" arapp.json;
aragon apm publish minor --files assets
cd -
