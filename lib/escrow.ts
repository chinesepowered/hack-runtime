import { createHash } from 'node:crypto';
import { createPublicClient, encodeFunctionData, erc20Abi, http, isAddress, type Hex } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import type { Meal } from './types';

/**
 * Dynamic wallet pattern: SERVER WALLET.
 *
 * The escrow wallet belongs to this application's Dynamic developer account and
 * the agent authenticates with an API token (`authenticateApiToken`). Funds sit
 * with the escrow rather than the giver or the restaurant, which is the whole
 * reason a stranger can be paid without trusting anyone.
 *
 * There is exactly one on-chain action in this product: the RELEASE. A giver
 * funds the escrow wallet, and the agent transfers USDC out of it to the
 * claimer once a Flynet check-in has proven they are in the restaurant
 * (`presenceAt` in lib/flynet.ts). Gating a transfer on real-world presence is
 * the primitive; everything else is bookkeeping.
 *
 * Create and fund the wallet with `pnpm wallet create` / `pnpm wallet status`.
 */
export type Settlement = { txHash: string; live: boolean; note?: string };

const ENV_ID = process.env.DYNAMIC_ENV_ID ?? '';
const API_TOKEN = process.env.DYNAMIC_API_TOKEN ?? '';
const WALLET_PASSWORD = process.env.DYNAMIC_WALLET_PASSWORD ?? '';
const WALLET_METADATA = process.env.DYNAMIC_WALLET_METADATA ?? '';
const FALLBACK_RECIPIENT = process.env.ESCROW_FALLBACK_RECIPIENT ?? '';
const CHAIN_ID = Number(process.env.ESCROW_CHAIN_ID ?? '84532');

const CHAIN = CHAIN_ID === 8453 ? base : baseSepolia;
export const USDC: Record<number, Hex> = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

/**
 * Dynamic's MPC signer ships native binaries for Linux and macOS only, so on
 * Windows a fully configured wallet still cannot sign. Treat that as "not live"
 * so no surface claims on-chain settlement the server cannot produce.
 */
const SIGNER_SUPPORTED = process.platform === 'linux' || process.platform === 'darwin';

export const hasWalletCreds = (): boolean =>
  SIGNER_SUPPORTED &&
  ENV_ID.length > 0 &&
  API_TOKEN.length > 0 &&
  WALLET_METADATA.length > 0 &&
  WALLET_PASSWORD.length > 0;

/**
 * Deterministic placeholder settlement, used whenever credentials or funds are
 * absent. Marked `live: false` so every surface that renders it says so — a demo
 * must never imply a transaction it did not make.
 */
function simulate(seed: string, note?: string): Settlement {
  const hash = createHash('sha256').update(seed).digest('hex').slice(0, 64);
  return { txHash: `0x${hash}`, live: false, note };
}

type WalletMetadata = { accountAddress: string } & Record<string, unknown>;
type EvmClient = {
  authenticateApiToken: (token: string) => Promise<void>;
  signTransaction: (a: {
    walletMetadata: WalletMetadata;
    transaction: Record<string, unknown>;
    password?: string;
  }) => Promise<string>;
};

type Loaded = { client: EvmClient; walletMetadata: WalletMetadata };
let loadedPromise: Promise<Loaded | null> | null = null;

/**
 * Loaded lazily and optionally. `@dynamic-labs-wallet/node-evm` is a native
 * package restricted to the Node runtime, so the app has to boot, render and
 * film correctly when it is not installed at all.
 *
 * The wallet is created with its key shares backed up to Dynamic, so signing
 * needs only the wallet password — no separate share recovery step.
 */
async function load(): Promise<Loaded | null> {
  if (!hasWalletCreds()) return null;
  loadedPromise ??= (async () => {
    try {
      const mod = (await import('@dynamic-labs-wallet/node-evm')) as unknown as {
        DynamicEvmWalletClient: new (o: { environmentId: string }) => EvmClient;
      };
      const client = new mod.DynamicEvmWalletClient({ environmentId: ENV_ID });
      await client.authenticateApiToken(API_TOKEN);
      const walletMetadata = JSON.parse(WALLET_METADATA) as WalletMetadata;
      if (!isAddress(walletMetadata.accountAddress)) throw new Error('wallet metadata has no accountAddress');
      return { client, walletMetadata };
    } catch (err) {
      console.warn('[escrow] Dynamic server wallet unavailable, simulating settlement:', err);
      loadedPromise = null; // allow a retry after the configuration is fixed
      return null;
    }
  })();
  return loadedPromise;
}

/**
 * Record the giver's commitment. No transfer happens here: the giver funds the
 * escrow wallet, and the money only moves on release.
 */
export async function fundEscrow(meal: Pick<Meal, 'id' | 'amountCents'>): Promise<Settlement> {
  return simulate(`fund:${meal.id}`, 'Escrow commitment recorded; funds move on release.');
}

/**
 * Where the release is paid. The member's own Blackbird wallet (from Flynet
 * `GET /users/me/wallets`) is always preferred; the configured fallback exists
 * only so a live transfer can be demonstrated while member OAuth is unavailable,
 * and the settlement note says when it was used.
 */
function pickRecipient(flynetWallet?: Hex): { to: Hex; note?: string } | null {
  if (flynetWallet && isAddress(flynetWallet)) return { to: flynetWallet };
  if (isAddress(FALLBACK_RECIPIENT)) {
    return { to: FALLBACK_RECIPIENT as Hex, note: 'Paid to the configured demo wallet; no Flynet member wallet was available.' };
  }
  return null;
}

/**
 * Release escrow to the claimer. This is the real payment action: an ERC-20
 * USDC transfer signed by the Dynamic server wallet and broadcast to Base, and
 * only reported live once the network has confirmed it did not revert.
 */
export async function releaseEscrow(meal: Meal, claimer: string, flynetWallet?: Hex): Promise<Settlement> {
  const seed = `release:${meal.id}:${claimer}`;
  const loaded = await load();
  if (!loaded) return simulate(seed, 'No Dynamic server wallet configured.');

  const recipient = pickRecipient(flynetWallet);
  if (!recipient) return simulate(seed, 'No recipient wallet: no Flynet member wallet and no ESCROW_FALLBACK_RECIPIENT.');

  const token = USDC[CHAIN_ID];
  if (!token) return simulate(seed, `No USDC address known for chain ${CHAIN_ID}.`);

  try {
    const from = loaded.walletMetadata.accountAddress as Hex;
    const publicClient = createPublicClient({ chain: CHAIN, transport: http() });

    // USDC is 6dp; amounts are stored in cents, so cents * 10^4 == base units.
    const amount = BigInt(meal.amountCents) * 10_000n;

    // A public demo can drain a testnet escrow. Say so plainly instead of
    // surfacing a raw "transfer amount exceeds balance" revert from gas estimation.
    const balance = await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [from],
    });
    if (balance < amount) {
      return simulate(seed, 'The escrow wallet is low on testnet USDC right now, so this release was simulated.');
    }

    const data = encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [recipient.to, amount] });

    // A signable transaction needs every field the network checks, not just
    // the call: nonce, a gas limit and EIP-1559 fees.
    const [nonce, gas, fees] = await Promise.all([
      publicClient.getTransactionCount({ address: from, blockTag: 'pending' }),
      publicClient.estimateGas({ account: from, to: token, data }),
      publicClient.estimateFeesPerGas(),
    ]);

    const signed = (await loaded.client.signTransaction({
      walletMetadata: loaded.walletMetadata,
      password: WALLET_PASSWORD,
      transaction: {
        type: 'eip1559',
        chainId: CHAIN_ID,
        to: token,
        data,
        value: 0n,
        nonce,
        gas: (gas * 12n) / 10n,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      },
    })) as Hex;

    const txHash = await publicClient.sendRawTransaction({ serializedTransaction: signed });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 45_000 });
    if (receipt.status !== 'success') {
      return { txHash, live: false, note: 'Transaction was mined but reverted; see the explorer.' };
    }
    return { txHash, live: true, note: recipient.note };
  } catch (err) {
    console.warn('[escrow] release failed, simulating:', err);
    return simulate(seed, `Live release failed: ${(err as Error).message?.slice(0, 160)}`);
  }
}

/** The escrow wallet's public address, if one is configured. Safe to show. */
export function escrowAddress(): Hex | null {
  try {
    const address = (JSON.parse(WALLET_METADATA) as WalletMetadata).accountAddress;
    return isAddress(address) ? (address as Hex) : null;
  } catch {
    return null;
  }
}

export const explorerUrl = (txHash: string): string =>
  CHAIN_ID === 8453 ? `https://basescan.org/tx/${txHash}` : `https://sepolia.basescan.org/tx/${txHash}`;

export const chainLabel = (): string => (CHAIN_ID === 8453 ? 'Base' : 'Base Sepolia');
