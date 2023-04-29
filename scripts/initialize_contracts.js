const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const { fromB64 } = require('@mysten/sui.js')
const { utils } = require('ethers')
const { adaptors } = require('@mesonfi/sdk')
const presets = require('@mesonfi/presets').default
const { Meson } = require('@mesonfi/contract-abis')

const deployed = require('../deployed.json')

dotenv.config()

const {
  TESTNET_MODE,
  AMOUNT_TO_DEPOSIT: amount,
} = process.env

const testnetMode = Boolean(TESTNET_MODE)
const networkId = testnetMode ? 'sui-testnet' : 'sui'
presets.useTestnet(testnetMode)

initialize()

async function initialize() {
  const keystore = fs.readFileSync(path.join(__dirname, '../.sui/sui.keystore'))
  const privateKey = utils.hexlify(fromB64(JSON.parse(keystore)[0])).replace('0x01', '0x')

  const network = presets.getNetwork(networkId)
  const client = presets.createNetworkClient(networkId, [network.url])
  const wallet = adaptors.getWallet(privateKey, client)

  const [mesonAddress, metadata] = parseDeployed()
  const mesonInstance = adaptors.getContract(mesonAddress, Meson.abi, wallet, metadata)

  const coins = [
    { symbol: 'USDC', tokenIndex: 1 },
    { symbol: 'USDT', tokenIndex: 2 },
  ]
  for (const coin of coins) {
    console.log(`addSupportToken (${coin.symbol})`)
    const coinAddr = `${mesonAddress}::${coin.symbol}::${coin.symbol}`
    const tx = await mesonInstance.addSupportToken(coinAddr, coin.tokenIndex)
    await tx.wait()
  }

  if (!amount) {
    return
  }

  for (const coin of coins) {
    console.log(`Depositing ${amount} ${coin.symbol}...`)
    const value = utils.parseUnits(amount, 6)
    const poolIndex = await mesonInstance.poolOfAuthorizedAddr(wallet.address)
    const needRegister = poolIndex == 0
    const poolTokenIndex = coin.tokenIndex * 2**40 + (needRegister ? 1 : poolIndex)

    let tx
    if (needRegister) {
      tx = await mesonInstance.depositAndRegister(value, poolTokenIndex)
    } else {
      tx = await mesonInstance.deposit(value, poolTokenIndex)
    }
    await tx.wait()
  }

  console.log(JSON.stringify({ mesonAddress, metadata }, null, 2))
}


function parseDeployed() {
  const mesonAddress = deployed.objectChanges.find(obj => obj.type == 'published')?.packageId
  const metadata = {
    storeG: deployed.objectChanges.find(obj => obj.objectType == `${mesonAddress}::MesonStates::GeneralStore`)?.objectId,
    adminCap: deployed.objectChanges.find(obj => obj.objectType == `${mesonAddress}::MesonStates::AdminCap`)?.objectId,
    treasuryCap: {},
  }
  
  const coins = deployed.objectChanges.filter(obj => obj.objectType?.startsWith('0x2::coin::TreasuryCap'))
    .map(obj => {
      const [_, addr] = /0x2::coin::TreasuryCap<(.*)>/.exec(obj.objectType)
      const [p, module, symbol] = addr.split('::')
      return { addr, symbol }
    })
  
  for (const coin of coins) {
    metadata.treasuryCap[coin.symbol] = deployed.objectChanges.find(obj => obj.objectType == `0x2::coin::TreasuryCap<${coin.addr}>`)?.objectId
  }

  return [mesonAddress, metadata]
}
