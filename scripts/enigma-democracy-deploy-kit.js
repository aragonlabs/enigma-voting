require('dotenv').config({ path: '../.env' })
const path = require('path')
const fs = require('fs')

const namehash = require('eth-ens-namehash').hash

const deployDAOFactory = require('@aragon/os/scripts/deploy-daofactory.js')
const logDeploy = require('@aragon/os/scripts/helpers/deploy-logger')

const networks = require("@aragon/os/truffle-config").networks
const getNetwork = require('./helpers/networks.js')

// ensure alphabetic order
const apps = ['finance', 'token-manager', 'vault', 'voting-enigma']
const appContractNames = ['Finance', 'TokenManager', 'Vault', 'Voting']
const appIds = apps.map(app => namehash(`${app}.aragonpm.eth`))

const globalArtifacts = this.artifacts // Not injected unless called directly via truffle
const globalWeb3 = this.web3 // Not injected unless called directly via truffle

const defaultOwner = process.env.OWNER || '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7'
const defaultENSAddress = process.env.ENS || '0x5f6f7e8cc7346a11ca2def8f827b7a0b612c56a1'
const defaultDAOFactoryAddress = process.env.DAO_FACTORY
const defaultMinimeTokenFactoryAddress = process.env.MINIME_TOKEN_FACTORY

const kitName = 'enigma-democracy-kit'
const kitContractName = 'EnigmaDemocracyKit'

// Make sure that you have deployed ENS and APM and that you set the first one
// in `ENS` env variable
module.exports = async (
  truffleExecCallback,
  {
    artifacts = globalArtifacts,
    web3 = globalWeb3,
    owner = defaultOwner,
    ensAddress = defaultENSAddress,
    daoFactoryAddress = defaultDAOFactoryAddress,
    minimeTokenFactoryAddress = defaultMinimeTokenFactoryAddress,
    verbose = true,
    returnKit = false
  } = {}
) => {
  const log = (...args) => {
    if (verbose) { console.log(...args) }
  }

  const errorOut = (msg) => {
    console.error(msg)
    throw new Error(msg)
  }

  const network = (await getNetwork(web3, networks)).name

  log(`${kitName} in ${network} network with ENS ${ensAddress}`)

  const kitEnsName = kitName + '.aragonpm.eth'

  const MiniMeTokenFactory = artifacts.require('MiniMeTokenFactory')
  const DAOFactory = artifacts.require('DAOFactory')
  const ENS = artifacts.require('ENS')

  const newRepo = async (apm, name, acc, contract) => {
    log(`Creating Repo for ${contract}...`)
    const c = await artifacts.require(contract).new()
    log(`...at address ${c.address}`)
    return await apm.newRepoWithVersion(name, acc, [1, 0, 0], c.address, '0x1245')
  }

  let kitFileName
  if (!returnKit) {
    if (network != 'rpc' && network != 'devnet') {
      kitFileName = 'kit.json'
    } else {
      kitFileName = 'kit_local.json'
    }
    if (!ensAddress) {
      const betaKit = require('../' + kitFileName)
      ensAddress = betaKit.environments[network].registry
    }
  }

  if (!ensAddress) {
    errorOut('ENS environment variable not passed, aborting.')
  }
  log('Using ENS', ensAddress)
  const ens = ENS.at(ensAddress)

  let daoFactory
  if (daoFactoryAddress) {
    log(`Using provided DAOFactory: ${daoFactoryAddress}`)
    daoFactory = DAOFactory.at(daoFactoryAddress)
  } else {
    daoFactory = (await deployDAOFactory(null, { artifacts, verbose: false })).daoFactory
  }

  let minimeFac
  if (minimeTokenFactoryAddress) {
    log(`Using provided MiniMeTokenFactory: ${minimeTokenFactoryAddress}`)
    minimeFac = MiniMeTokenFactory.at(minimeTokenFactoryAddress)
  } else {
    minimeFac = await MiniMeTokenFactory.new()
    log('Deployed MiniMeTokenFactory:', minimeFac.address)
  }

  const aragonid = await ens.owner(namehash('aragonid.eth'))
  const kit = await artifacts.require(kitContractName).new(daoFactory.address, ens.address, minimeFac.address, aragonid, appIds)

  await logDeploy(kit)

  if (returnKit) {
    return kit
  }

  if (network == 'devnet' || network == 'rpc') { // Useful for testing to avoid manual deploys with aragon-dev-cli
    const apmAddr = await artifacts.require('PublicResolver').at(await ens.resolver(namehash('aragonpm.eth'))).addr(namehash('aragonpm.eth'))
    log('APM', apmAddr);
    const apm = artifacts.require('APMRegistry').at(apmAddr)
    if (!apm) {
      console.error('APM not found')
    }

    for (let i = 0; i < appIds.length; i++) {
      let appOwner = await ens.owner(appIds[i])
      if (appOwner == '0x0000000000000000000000000000000000000000') {
        log(`Deploying ${apps[i]} in local network`)
        await newRepo(apm, apps[i], owner, appContractNames[i])
      } else {
        log(`${apps[i]}'s owner: ${appOwner}`)
      }
    }

    if (await ens.owner(namehash(kitEnsName)) == '0x0000000000000000000000000000000000000000') {
      log(`creating APM package for ${kitName} at ${kit.address}`)
      await apm.newRepoWithVersion(kitName, owner, [1, 0, 0], kit.address, 'ipfs:')
    } else {
      // TODO: update APM Repo?
    }
  }

  const kitFilePath = path.resolve(".") + "/" + kitFileName
  let kitObj = {}
  if (fs.existsSync(kitFilePath))
    kitObj = require(kitFilePath)
  if (kitObj.environments === undefined)
    kitObj.environments = {}
  if (kitObj.environments[network] === undefined)
    kitObj.environments[network] = {}
  kitObj.environments[network].registry = ens.address
  kitObj.environments[network].kitName = kitEnsName
  kitObj.environments[network].address = kit.address
  kitObj.environments[network].network = network
  if (kitObj.path === undefined)
    kitObj.path = "contracts/" + kitContractName + ".sol"
  const kitFile = JSON.stringify(kitObj, null, 2)
  // could also use https://github.com/yeoman/stringify-object if you wanted single quotes
  fs.writeFileSync(kitFilePath, kitFile)
  log(`Kit addresses saved to ${kitFileName}`)

  if (typeof truffleExecCallback === 'function') {
    // Called directly via `truffle exec`
    truffleExecCallback()
  } else {
    return kitObj
  }
}
