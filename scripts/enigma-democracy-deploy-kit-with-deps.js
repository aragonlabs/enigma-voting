require('dotenv').config({ path: '../.env' })
const deploy_ens = require('@aragon/os/scripts/deploy-test-ens.js')
const deploy_apm = require('@aragon/os/scripts/deploy-apm.js')
const deploy_id = require('@aragon/id/scripts/deploy-beta-aragonid.js')
const deploy_kit = require('./enigma-democracy-deploy-kit.js')

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

  log(`Deploying Enigma Kit, Owner ${process.env.OWNER}`)

  // ENS
  console.log('ENS')
  const { ens } = await deploy_ens(null, { artifacts, web3, owner })

  // APM
  console.log('APM')
  await deploy_apm(null, {artifacts, web3, ensAddress: ens.address })

  // aragonID
  console.log('id')
  await deploy_id(null, { artifacts, web3, ensAddress: ens.address })

  console.log('Kit')
  await deploy_kit(null, { artifacts, web3, ensAddress: ens.address })
}
