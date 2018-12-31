const getNetworkNameFromId = (networks, id) => {
  const defaultNetwork = 'rpc'
  for (let n in networks) {
    if (networks[n].network_id == id) {
      return n
    }
  }
  return defaultNetwork
}
const getNetworkId = (web3) =>
  new Promise(
    (resolve, reject) =>
      web3.version.getNetwork(
        (error, result) => error ? reject(error) : resolve(result)
      )
  )

module.exports = async (web3, networks) => {
  const id = await getNetworkId(web3)
  const name = getNetworkNameFromId(networks, id)
  return { id, name }
}
