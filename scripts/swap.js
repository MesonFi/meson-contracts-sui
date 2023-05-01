const dotenv = require('dotenv')
const {
  adaptors,
  MesonClient,
  SignedSwapRequest,
  SignedSwapRelease,
  NonEcdsaRemoteSwapSigner,
} = require('@mesonfi/sdk')
const presets = require('@mesonfi/presets').default
const { Meson } = require('@mesonfi/contract-abis')

const parseDeployed = require('./parse_deployed').default

dotenv.config()

const {
  TESTNET_MODE,
  PRIVATE_KEY,
} = process.env

const testnetMode = Boolean(TESTNET_MODE)
const networkId = testnetMode ? 'sui-testnet' : 'sui'
presets.useTestnet(testnetMode)

swap(PRIVATE_KEY)

async function swap(privateKey) {
  const network = presets.getNetwork(networkId)
  const client = presets.createNetworkClient(networkId, [network.url])
  const wallet = adaptors.getWallet(privateKey, client)
  console.log(`Wallet address: ${wallet.address}`)

  const { mesonAddress } = parseDeployed()
  const mesonInstance = adaptors.getContract(mesonAddress, Meson.abi, wallet)
  const signer = {
    getAddress: () => wallet.address,
    signMessage: async data => wallet.signMessage(data),
    signTypedData: async data => '0x',
  }
  const swapSigner = new NonEcdsaRemoteSwapSigner(signer)
  const mesonClient = await MesonClient.Create(mesonInstance, swapSigner)


  const swapData = {
    amount: '10000000',
    fee: '1000',
    inToken: 1,
    outToken: 2,
    recipient: wallet.address,
    salt: '0x80'
  }
  const swap = mesonClient.requestSwap(swapData, network.shortSlip44)
  const request = await swap.signForRequest(testnetMode)
  const signedRequest = new SignedSwapRequest(request)
  signedRequest.checkSignature(testnetMode)

  const release = await swap.signForRelease(swapData.recipient, testnetMode)
  const signedRelease = new SignedSwapRelease(release)
  signedRelease.checkSignature(testnetMode)


  // postSwap
  const postSwapTx = await mesonClient.postSwap(signedRequest)
  console.log('postSwap', postSwapTx.hash)
  await postSwapTx.wait(1)

  // lock
  const lockTx = await mesonClient.lock(signedRequest, swapData.recipient)
  console.log('lock', lockTx.hash)
  await lockTx.wait(1)

  // release
  const releaseTx = await mesonClient.release(signedRelease)
  console.log('release', releaseTx.hash)

  // executeSwap
  const executeTx = await mesonClient.executeSwap(signedRelease, true)
  console.log('execute', executeTx.hash)
}
