/**
 * Wallet service — thin wrapper over GET /v1/web/wallet.
 *
 * Pure functions (no state); the React state lives in WalletProvider.
 */

import { apiClient } from './apiClient';
import { parseWallet, type Wallet, type WalletDTO } from './money';

export async function fetchWallet(): Promise<Wallet> {
  const dto = await apiClient.get<WalletDTO>('/wallet');
  return parseWallet(dto);
}
