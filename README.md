# meson-contracts-sui

### Steps for deployment

1. Run `yarn`.
2. Copy and paste a private key to `.env` after `PRIVATE_KEY=`.
3. Run `yarn wallet` to prepare a wallet. Uncomment `SUI_FAUCET_URL` if wish to use the faucet.
4. Run `yarn build` or `yarn test` to build or test.
5. Run `yarn deploy` for deployment. Will automatically run `postdeploy` script to register coins and make pool deposits.

The address of Meson and metadata will be printed in `postdeploy` script. Remember to update them in `@mesonfi/presets`.

### Perform a swap

Just run `yarn swap`.
