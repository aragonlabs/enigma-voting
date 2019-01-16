# Aragon Enigma Voting app

## Instructions to run it

- Download the app:
```
git clone https://github.com/aragonlabs/enigma-voting
```

- Install dependencies and compile contracts
```
cd enigma-voting
npm i
./node_modules/.bin/truffle compile
```
(You can prefix compile command with `node --stack-size=2048 ` if you run into "Maximum call stack size exceeded" error)

- Spin up an IPFS node, with `aragon ipfs`

- Spin up a devchain, using `aragon devchain --reset`

- Deploy the kit:
```
./node_modules/.bin/truffle exec --network rpc scripts/enigma-democracy-deploy-kit.js
```

- Publish dApp:
```
aragon apm publish minor --files app/build
```
You can check published versions with:
```
aragon apm versions
```

- Create a new instance. Make a copy of instance params file:
```
cp new_instance_params.json.template new_instance_params.json
```
and tweak the values as you like. Make sure name in params file is unique.
Then create your new instance with:
```
./node_modules/.bin/truffle exec --network rpc scripts/enigma-democracy-new-instance.js
```

- Start the app. Download it from [here](https://github.com/aragon/aragon) and run:
```
npm install
npm run start:local
```
Then you can navigate to your DAO adding its address to the URL, something like: http://localhost:3000/#/0xdf5159290adbf0b5b00d9b104b437caa953a33f9, getting the DAO address from the output of the new instance script.

- For other networks you can define an environment variable `ENS`, either manually in command line or adding to `.env` file.
