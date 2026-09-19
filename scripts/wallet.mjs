#!/usr/bin/env node
/**
 * Escrow wallet helper for the Dynamic server wallet.
 *
 *   pnpm wallet create   create the escrow wallet and save it to .env
 *   pnpm wallet status   show the escrow address, balances and faucet links
 *
 * `create` needs DYNAMIC_ENV_ID and DYNAMIC_API_TOKEN in .env. It writes the
 * wallet password and metadata into .env itself rather than printing them, so
 * no secret ends up in a terminal scrollback or a screen recording.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createPublicClient, erc20Abi, formatEther, formatUnits, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';

const CHAIN_ID = Number(process.env.ESCROW_CHAIN_ID ?? '84532');
const CHAIN = CHAIN_ID === 8453 ? base : baseSepolia;
const USDC = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
}[CHAIN_ID];
const EXPLORER = CHAIN_ID === 8453 ? 'https://basescan.org' : 'https://sepolia.basescan.org';

const die = msg => {
  console.error(`\n  ${msg}\n`);
  process.exit(1);
};

function envHas(name) {
  if (process.env[name]) return true;
  if (!existsSync('.env')) return false;
  return new RegExp(`^${name}=.+`, 'm').test(readFileSync('.env', 'utf8'));
}

/**
 * Set keys in .env, filling an existing (possibly empty) `KEY=` line in place
 * rather than appending a duplicate — env loaders disagree on which one wins.
 */
export function writeEnv(updates, file = '.env') {
  let text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(text)) text = text.replace(re, () => line);
    else text = `${text}${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`;
  }
  writeFileSync(file, text);
}

async function create() {
  const { DYNAMIC_ENV_ID, DYNAMIC_API_TOKEN } = process.env;
  if (!DYNAMIC_ENV_ID || !DYNAMIC_API_TOKEN) {
    die('Set DYNAMIC_ENV_ID and DYNAMIC_API_TOKEN in .env first (see README → "Going live with Dynamic").');
  }
  if (envHas('DYNAMIC_WALLET_METADATA')) {
    die('.env already has DYNAMIC_WALLET_METADATA. Refusing to replace a wallet that may hold funds.\n  Remove that line yourself if you really want a new one.');
  }

  const { DynamicEvmWalletClient } = await import('@dynamic-labs-wallet/node-evm');
  const client = new DynamicEvmWalletClient({ environmentId: DYNAMIC_ENV_ID });
  await client.authenticateApiToken(DYNAMIC_API_TOKEN);

  const password = process.env.DYNAMIC_WALLET_PASSWORD || randomBytes(24).toString('hex');
  console.log('Creating escrow wallet (2-of-2 MPC, key shares backed up to Dynamic)…');
  const { walletMetadata } = await client.createWalletAccount({
    thresholdSignatureScheme: 'TWO_OF_TWO',
    password,
    backUpToDynamic: true,
    onError: err => console.error(err),
  });

  const updates = { DYNAMIC_WALLET_METADATA: JSON.stringify(walletMetadata) };
  if (!envHas('DYNAMIC_WALLET_PASSWORD')) updates.DYNAMIC_WALLET_PASSWORD = password;
  writeEnv(updates);

  console.log(`\n  Escrow wallet: ${walletMetadata.accountAddress}`);
  console.log('  Saved password and metadata to .env.\n');
  printFunding(walletMetadata.accountAddress);
}

function printFunding(address) {
  if (CHAIN_ID !== 84532) return;
  console.log('  Fund it on Base Sepolia (both are free):');
  console.log('    USDC  https://faucet.circle.com            → network "Base Sepolia", paste the address');
  console.log('          (20 USDC per request, once every 2 hours — the $25 demo meal needs two requests)');
  console.log('    ETH   https://portal.cdp.coinbase.com/products/faucet   (gas for the release; free Coinbase developer login)');
  console.log(`\n  Then run: pnpm wallet status\n  Explorer:  ${EXPLORER}/address/${address}\n`);
}

async function status() {
  const raw = process.env.DYNAMIC_WALLET_METADATA;
  if (!raw) die('No DYNAMIC_WALLET_METADATA in .env. Run `pnpm wallet create` first.');
  const { accountAddress } = JSON.parse(raw);
  const client = createPublicClient({ chain: CHAIN, transport: http() });
  const [eth, usdc] = await Promise.all([
    client.getBalance({ address: accountAddress }),
    client.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [accountAddress] }),
  ]);

  const ethOk = eth > 0n;
  const usdcOk = usdc >= 25_000_000n; // one $25 meal
  console.log(`\n  Escrow wallet  ${accountAddress}  (${CHAIN.name})`);
  console.log(`  ETH   ${formatEther(eth).padEnd(22)} ${ethOk ? 'ok' : 'needs gas'}`);
  console.log(`  USDC  ${formatUnits(usdc, 6).padEnd(22)} ${usdcOk ? 'ok' : 'needs 25 for the $25 demo meal (request the faucet again in 2h)'}`);

  const recipient = process.env.ESCROW_FALLBACK_RECIPIENT;
  console.log(`  Demo recipient: ${recipient || 'not set (ESCROW_FALLBACK_RECIPIENT) — releases will simulate'}`);

  const ready = ethOk && usdcOk && !!recipient && !!process.env.DYNAMIC_WALLET_PASSWORD;
  console.log(`\n  ${ready ? 'READY — the next claim will be a real on-chain release.' : 'Not ready yet.'}\n`);
  if (!ready) printFunding(accountAddress);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const cmd = process.argv[2];
  if (cmd === 'create') await create();
  else if (cmd === 'status') await status();
  else die('usage: pnpm wallet create | pnpm wallet status');
}
