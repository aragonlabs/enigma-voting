# Aragon Enigma Voting app

## Instructions to run it

- Download the app:
```
git clone https://github.com/aragonlabs/enigma-voting
```
- Install dependencies
```
cd enigma-voting
npm i
```
- Spin up an IPFS node. Make sure you have ports 5001 and 8080 available. An easy way is to use `aragon ipfs`. Alternatively, you can use [this](https://github.com/aragon/dao-kits/tree/master/kits/beta-base) and run:
```
docker-compose up ipfs
```
Make sure that `docker-compose.yml` has port `"8080:8080"` exposed first.
Or of course follow the official instructions from IPFS.

- Spin up a devchain, using `aragon devchain --reset`
- Deploy a token, you can use [this](https://github.com/aragon/dao-kits/tree/master/helpers/test-token-deployer), and run:
```
cd dao-kits/helpers/test-token-deployer
npm i
./node_modules/.bin/truffle migrate --network rpc --reset
grep -A 2 rpc index.js | tail -1 | cut -d '"' -f 2
```
- Start the app:
```
aragon run --files app/build --app-init-args '<your-deployed-token-address>' 500000000000000000 500000000000000000 10000
```
- Give Enigma contract `UPDATE_VOTE_RESULT_ROLE`:
```
aragon dao acl grant <dao-address-generated-on-aragon-run> <voting-app-address> '0x22629989503aacf70e92cfddb625ccf43e72b10328fccbe8da37d3f1e0d5144b' <the-enigma-contract-address>
```
You can get the voting app address from the URL of the app, e.g., from `http://localhost:3000/#/0xCb0FF465e3847606603A51cc946353A41Fea54c0/0x248c17006FA3D551Bd3CAbb98bB3748Af7D1D954` it would be `0x248c17006FA3D551Bd3CAbb98bB3748Af7D1D954`, or going to Settings in the app.
For a real application, the owner/creator of the DAO should have this privilege revoked, but it's fine for now just for testing.
You can manage roles from Permissions menu in app too.
