export function calculateTransferAmounts(grossAmount: number, feeBps: number) {
  if (!Number.isFinite(grossAmount) || grossAmount <= 0) throw new Error('Gross amount must be greater than zero.');
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10000) throw new Error('Fee BPS must be between 0 and 10000.');
  const platformFeeAmount = Math.round((grossAmount * feeBps / 10000) * 100) / 100;
  const adminPayoutAmount = Math.round((grossAmount - platformFeeAmount) * 100) / 100;
  if (adminPayoutAmount <= 0) throw new Error('Admin payout amount must be greater than zero.');
  return { grossAmount, feeBps, platformFeeAmount, adminPayoutAmount };
}
