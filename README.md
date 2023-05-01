# meson-contracts-sui

### Steps for deployment

1. Run `yarn`.
2. Copy and paste a private key to `.env` after `PRIVATE_KEY=`.
3. Run `yarn wallet` to prepare a wallet. Uncomment `SUI_FAUCET_URL` if wish to use the faucet.
4. Run `yarn build` or `yarn test` to build or test.
5. Run `yarn deploy` for deployment. Will automatically run `postdeploy` script to register coins and make pool deposits.

The address of Meson will be printed in `postdeploy` script. Remember to update them in `@mesonfi/presets`.

### Perform a swap

Just run `yarn swap`.

### Acknowledgement

Project Author: [wyf-ACCEPT](https://github.com/wyf-ACCEPT)

This project was originally created by wyf-ACCEPT at [wyf-ACCEPT/meson-contracts-sui](https://github.com/wyf-ACCEPT/meson-contracts-sui) and has since been taken over and maintained by [MesonFi](https://github.com/mesonfi). We would like to thank wyf-ACCEPT for his professional assistance in completing the work for Sui. If you have any questions or suggestions, please feel free to contact MesonFi in [discord](https://discord.gg/meson) or [wyf-ACCEPT](https://github.com/wyf-ACCEPT).
