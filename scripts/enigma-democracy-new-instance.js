require('dotenv').config({ path: '../.env' })

const namehash = require('eth-ens-namehash').hash

const networks = require("@aragon/os/truffle-config").networks
const getNetwork = require('./helpers/networks.js')

const globalArtifacts = this.artifacts // Not injected unless called directly via truffle
const globalWeb3 = this.web3 // Not injected unless called directly via truffle

const getEventResult = (receipt, event, param) => receipt.logs.filter(l => l.event == event)[0].args[param]

module.exports = async (
  //truffleExecCallback, TODO: truffle exec doesn't work with callback ??
  {
    artifacts = globalArtifacts,
    web3 = globalWeb3,
    verbose = true
  }
) => {
  const log = (...args) => {
    if (verbose) { console.log(...args) }
  }

  const errorOut = (msg) => {
    console.error(msg)
    throw new Error(msg)
  }

  const networkName = (await getNetwork(web3, networks)).name

  let kitFilename
  if (networkName == 'devnet' || networkName == 'rpc') {
    kitFilename = 'kit_local'
  } else {
    kitFilename = 'kit'
  }
  const kitFile = require('../' + kitFilename)
  const ensAddress = kitFile.environments[networkName].registry
  const ens = artifacts.require('ENS').at(ensAddress)
  const kitEnsName = kitFile.environments[networkName].kitName

  log(`Retrieving kit ${kitEnsName} on network ${networkName} using ENS at ${ensAddress}`)
  const repoAddr = await artifacts.require('PublicResolver').at(await ens.resolver(namehash('aragonpm.eth'))).addr(namehash(kitEnsName))
  const repo = artifacts.require('Repo').at(repoAddr)
  const kitAddress = (await repo.getLatest())[1]
  log(`Kit found at address ${kitAddress}`)
  const kitContractName = kitFile.path.split('/').pop().split('.sol')[0]
  const kit = artifacts.require(kitContractName).at(kitAddress)

  const instanceParams = require('../new_instance_params')
  const receiptInstance = await kit.newInstance(
    instanceParams.name,
    instanceParams.symbol,
    instanceParams.holders,
    instanceParams.stakes,
    instanceParams.supportNeeded,
    instanceParams.minAcceptanceQuorum,
    instanceParams.voteDuration
  )
  const daoAddress = getEventResult(receiptInstance, 'DeployInstance', 'dao')
  log('New instance dao at:', daoAddress)
  const tokenAddress = getEventResult(receiptInstance, 'DeployToken', 'token')
  log('Using token:', tokenAddress)

  /* TODO: truffle exec doesn't work with callback ??
  if (typeof truffleExecCallback === 'function') {
    // Called directly via `truffle exec`
    truffleExecCallback()
  }
   */
}
