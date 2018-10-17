let x = require("@aragon/os/truffle-config")

x.networks.development = {
  host: 'localhost',
  port: 8545,
  network_id: '*'
}

module.exports = x
