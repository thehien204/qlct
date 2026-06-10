/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Member, Expense, Settlement } from "../types";

export interface MemberBalance {
  memberId: string;
  totalPaid: number;
  totalBenefit: number;
  balance: number; // positive = owed money, negative = owes money
}

/**
 * Calculates the total paid, total benefit and net balance for each family member,
 * filtered by a specific month (YYYY-MM format). If no month is provided, calculates all time.
 */
export function calculateBalances(
  members: Member[],
  expenses: Expense[],
  selectedMonth?: string // YYYY-MM
): MemberBalance[] {
  // Initialize balances map
  const balancesMap: Record<string, { totalPaid: number; totalBenefit: number }> = {};
  for (const m of members) {
    balancesMap[m.id] = { totalPaid: 0, totalBenefit: 0 };
  }

  // Filter expenses by month if specify
  const filtered = selectedMonth
    ? expenses.filter((e) => e.date.startsWith(selectedMonth))
    : expenses;

  // Distribute costs
  for (const exp of filtered) {
    const amount = exp.amount;
    const buyerId = exp.paidById;
    const beneficiaries = exp.beneficiaryIds || [];

    // 1. Add to buyer's totalPaid
    if (balancesMap[buyerId]) {
      balancesMap[buyerId].totalPaid += amount;
    }

    // 2. Add proportional share to beneficiaries' totalBenefit
    if (beneficiaries.length > 0) {
      const share = amount / beneficiaries.length;
      for (const bId of beneficiaries) {
        if (balancesMap[bId]) {
          balancesMap[bId].totalBenefit += share;
        }
      }
    }
  }

  // Map to MemberBalance array
  return members.map((m) => {
    const data = balancesMap[m.id] || { totalPaid: 0, totalBenefit: 0 };
    return {
      memberId: m.id,
      totalPaid: data.totalPaid,
      totalBenefit: data.totalBenefit,
      balance: data.totalPaid - data.totalBenefit,
    };
  });
}

/**
 * Greedy algorithm to settle debts with the minimum number of transactions.
 * Returns a list of required credit payments.
 */
export function computeSettlements(balances: MemberBalance[]): Settlement[] {
  // Deep copy raw balances and filter out zero balances to handle rounding error
  const list = balances
    .map((b) => ({ memberId: b.memberId, balance: Math.round(b.balance) }))
    .filter((b) => Math.abs(b.balance) > 0.1);

  const settlements: Settlement[] = [];

  // Separate debtors and creditors
  let debtors = list.filter((x) => x.balance < 0).sort((a, b) => a.balance - b.balance); // most negative first
  let creditors = list.filter((x) => x.balance > 0).sort((a, b) => b.balance - a.balance); // most positive first

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const oweAmount = -debtor.balance;
    const creditAmount = creditor.balance;

    const settledAmount = Math.min(oweAmount, creditAmount);

    if (settledAmount > 0) {
      settlements.push({
        fromId: debtor.memberId,
        toId: creditor.memberId,
        amount: Math.round(settledAmount),
      });
    }

    debtor.balance += settledAmount;
    creditor.balance -= settledAmount;

    if (Math.abs(debtor.balance) < 0.5) {
      dIdx++;
    }
    if (Math.abs(creditor.balance) < 0.5) {
      cIdx++;
    }
  }

  return settlements;
}

/**
 * Returns formatted currency string in Vietnamese Dong (VND)
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

/**
 * Gets local current month string in format YYYY-MM
 */
export function getCurrentMonthStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
