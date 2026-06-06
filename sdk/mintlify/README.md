# Mintlify documentation

Developer docs for `@arbitrum-machine/rwa-sdk` — installation, workflows, and API reference.

## Local preview

```bash
npm i -g mintlify
cd sdk/mintlify
mintlify dev
```

Open the URL printed in the terminal (default `http://localhost:3000`).

## Deploy to Mintlify

1. Create a project at [mintlify.com](https://mintlify.com)
2. Point the docs root to `sdk/mintlify`
3. Connect your GitHub repo for auto-deploy on push

## Structure

| Path | Content |
|------|---------|
| `docs.json` | Navigation and theme |
| `introduction.mdx` | Product overview |
| `quickstart.mdx` | Install + first read |
| `smart-contracts/guide.mdx` | Hardhat tests, deploy, bootstrap, on-chain verification |
| `sdk-reference/` | API pages (implemented methods only) |
| `maintainers/` | Deploy, sync, verify |

API docs reflect **implemented** SDK methods. Admin writes not yet in the SDK are documented under Maintainers.
