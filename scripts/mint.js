const fs = require('fs')
const path = require('path')
const { fromB64 } = require('@mysten/sui.js')
const { utils } = require('ethers')
const { adaptors, MesonClient } = require('@mesonfi/sdk')
const presets = require('@mesonfi/presets').default
const { Meson } = require('@mesonfi/contract-abis')

const parseDeployed = require('./parse_deployed').default

const networkId = 'sui-testnet'
presets.useTestnet(true)

mint('1000000')

async function mint(amount, to) {
  const keystore = fs.readFileSync(path.join(__dirname, '../.sui/sui.keystore'))
  const privateKey = utils.hexlify(fromB64(JSON.parse(keystore)[0])).replace('0x01', '0x')

  const network = presets.getNetwork(networkId)
  const client = presets.createNetworkClient(networkId, [network.url])
  const wallet = adaptors.getWallet(privateKey, client)

  const { mesonAddress, treasuryCap } = parseDeployed()
  const mesonInstance = adaptors.getContract(mesonAddress, Meson.abi, wallet)
  const mesonClient = await MesonClient.Create(mesonInstance)

  const mintTo = to || wallet.address
  for (const tokenIndex of [1, 2]) {
    const coinAddr = mesonClient.tokenAddr(tokenIndex)
    const coinContract = mesonClient.getTokenContract(coinAddr)

    const name = await coinContract.name()
    const symbol = await coinContract.symbol()
    const decimals = await coinContract.decimals()

    console.log(`Mint ${amount} ${symbol} to ${mintTo}...`)

    const tx = await mesonClient.mesonInstance.call(
      '0x2::coin::mint_and_transfer',
      txb => ({
        arguments: [
          txb.object(treasuryCap[symbol]),
          txb.pure(utils.parseUnits(amount, decimals)),
          txb.pure(mintTo)
        ],
        typeArguments: [coinAddr],
      })
    )
    await tx.wait()
    console.log(`Current balance:`, utils.formatUnits(await coinContract.balanceOf(mintTo), decimals), symbol)
  }
}