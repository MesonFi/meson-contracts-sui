const deployed = require('../deployed.json')

exports.default = function parseDeployed() {
  const mesonAddress = deployed.objectChanges.find(obj => obj.type == 'published')?.packageId
  const treasuryCap = {}
  
  const coins = deployed.objectChanges.filter(obj => obj.objectType?.startsWith('0x2::coin::TreasuryCap'))
    .map(obj => {
      const [_, addr] = /0x2::coin::TreasuryCap<(.*)>/.exec(obj.objectType)
      const [p, module, symbol] = addr.split('::')
      return { addr, symbol }
    })
  
  for (const coin of coins) {
    treasuryCap[coin.symbol] = deployed.objectChanges.find(obj => obj.objectType == `0x2::coin::TreasuryCap<${coin.addr}>`)?.objectId
  }

  return { mesonAddress, treasuryCap }
}
