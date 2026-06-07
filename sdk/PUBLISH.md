# Publish `arbitrum-machine-rwa-sdk` to npm

## Why publish fails with E404

npm often returns **404 Not Found** instead of **401 Unauthorized** when:

- Your npm token in `~/.npmrc` is **expired or invalid**
- You publish to a scope (`@arbitrum-machine/...`) without owning that **npm organization**

The package tarball and tests are fine; auth must be fixed first.

## Publish (current package name)

Package name: **`arbitrum-machine-rwa-sdk`** (unscoped, no org required).

```bash
cd sdk
npm logout
npm login
node scripts/check-npm-auth.mjs
npm publish
```

After publish: https://www.npmjs.com/package/arbitrum-machine-rwa-sdk

```bash
npm install arbitrum-machine-rwa-sdk ethers
```

## Optional: scoped name `@arbitrum-machine/rwa-sdk`

1. Create org: https://www.npmjs.com/org/create → name **`arbitrum-machine`**
2. Set `"name": "@arbitrum-machine/rwa-sdk"` in `package.json`
3. `npm publish --access public`
