const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const { fromB64 } = require('@mysten/sui.js')
const { utils } = require('ethers')
const { adaptors } = require('@mesonfi/sdk')
const presets = require('@mesonfi/presets').default
const { Meson } = require('@mesonfi/contract-abis')

const parseDeployed = require('./parse_deployed').default

dotenv.config()

const {
  TESTNET_MODE,
  LP_PRIVATE_KEY,
  AMOUNT_TO_DEPOSIT,
} = process.env

const testnetMode = Boolean(TESTNET_MODE)
const networkId = testnetMode ? 'sui-testnet' : 'sui'
presets.useTestnet(testnetMode)

initialize()

async function initialize() {
  const keystore = fs.readFileSync(path.join(__dirname, '../.sui/sui.keystore'))
  const privateKey = utils.hexlify(fromB64(JSON.parse(keystore)[0])).replace('0x00', '0x')

  const network = presets.getNetwork(networkId)
  const client = presets.createNetworkClient(networkId, [network.url])
  const wallet = adaptors.getWallet(privateKey, client)

  const { mesonAddress } = parseDeployed()
  console.log('Deployed to:', mesonAddress)
  let mesonInstance = adaptors.getContract(mesonAddress, Meson.abi, wallet)

  const coins = testnetMode
    ? [{ symbol: 'USDC', tokenIndex: 1 }, { symbol: 'USDT', tokenIndex: 2 }]
    : network.tokens

  for (const coin of coins) {
    const coinAddr = testnetMode ? `${mesonAddress}::${coin.symbol}::${coin.symbol}` : coin.addr
    console.log(`addSupportToken (${coinAddr})`)
    const tx = await mesonInstance.addSupportToken(coinAddr, coin.tokenIndex)
    await tx.wait()
  }

  if (LP_PRIVATE_KEY) {
    const lp = adaptors.getWallet(LP_PRIVATE_KEY, client)
    console.log('LP address:', lp.address)

    const tx = await mesonInstance.call(
      `${mesonAddress}::MesonStates::transferPremiumManager`,
      (txb, metadata) => ({ arguments: [txb.object(lp.address), txb.object(metadata.storeG)] })
    )
    console.log(`transferPremiumManager: ${tx.hash}`)
    await tx.wait()

    mesonInstance = mesonInstance.connect(lp)
  }

  if (!AMOUNT_TO_DEPOSIT) {
    return
  }

  for (const coin of coins) {
    console.log(`Depositing ${AMOUNT_TO_DEPOSIT} ${coin.symbol}...`)
    const value = utils.parseUnits(AMOUNT_TO_DEPOSIT, 6)
    const poolIndex = await mesonInstance.poolOfAuthorizedAddr(lp.address)
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
}
