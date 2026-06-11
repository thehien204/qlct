/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Member, Expense } from "../types";
import { API_BASE } from "./api";

export interface PaymentStatus {
  id: string;
  month: string;
  fromId: string;
  toId: string;
  isSettled: boolean;
  amount: number;
  createdAt?: number;
}

/**
 * Helper to parse various date strings into standard YYYY-MM-DD format
 */
export function parseDateToYYYYMMDD(dateStr: string): string {
  if (!dateStr) return "";
  
  // Clean any trailing timezone parentheses like " (Giờ Đông Dương)" or " (Indochina Time)"
  const cleaned = dateStr.replace(/\s*\(.*\)$/, "").trim();
  
  // Check if it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  // Try to parse using Date.parse
  const timestamp = Date.parse(cleaned);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  
  // Fallback for dd/mm/yyyy format
  const dmyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

/**
 * Helper to parse various month strings into standard YYYY-MM format
 */
export function parseMonthToYYYYMM(monthStr: string): string {
  if (!monthStr) return "";
  
  // Clean any trailing timezone parentheses like " (Giờ Đông Dương)" or " (Indochina Time)"
  const cleaned = monthStr.replace(/\s*\(.*\)$/, "").trim();
  
  // Check if it's already YYYY-MM
  if (/^\d{4}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  // If it is YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned.substring(0, 7);
  }
  
  // Try to parse using Date.parse
  const timestamp = Date.parse(cleaned);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  
  return monthStr;
}

/**
 * Reads members, expenses, and payments from Google Sheet database via Apps Script Web App.
 */
export async function loadDataFromDb(): Promise<{ members: Member[]; expenses: Expense[]; payments?: PaymentStatus[] }> {
  const response = await fetch(`${API_BASE}/api/db`, {
    method: "GET"
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Không thể nạp dữ liệu từ máy chủ cục bộ: ${errText}`);
  }

  const data = await response.json();
  
  // Parse members safely and deduplicate by id
  const rawMembers: Member[] = (data.members || []).map((m: any) => ({
    id: String(m.id || ""),
    name: String(m.name || ""),
    role: String(m.role || ""),
    avatarColor: String(m.avatarColor || "#1e3a8a"),
    messengerLink: String(m.messengerLink || ""),
    messengerId: String(m.messengerId || ""),
  })).filter((m: Member) => m.id && m.name);

  const membersMap = new Map<string, Member>();
  rawMembers.forEach(m => membersMap.set(m.id, m));
  const members = Array.from(membersMap.values());

  // Parse expenses safely and deduplicate by id
  const rawExpenses: Expense[] = (data.expenses || []).map((e: any) => ({
    id: String(e.id || ""),
    title: String(e.title || ""),
    amount: Number(e.amount) || 0,
    categoryId: String(e.categoryId || "others"),
    date: parseDateToYYYYMMDD(String(e.date || "")),
    paidById: String(e.paidById || ""),
    beneficiaryIds: e.beneficiaryIds ? (Array.isArray(e.beneficiaryIds) ? e.beneficiaryIds.map(String) : String(e.beneficiaryIds).split(",").map(id => id.trim()).filter(Boolean)) : [],
    notes: String(e.notes || ""),
    createdAt: Number(e.createdAt) || Date.now(),
  })).filter((e: Expense) => e.id && e.title && e.amount > 0);

  const expensesMap = new Map<string, Expense>();
  rawExpenses.forEach(e => expensesMap.set(e.id, e));
  const expenses = Array.from(expensesMap.values());

  // Parse payments safely and deduplicate by id, only if present in response
  let payments: PaymentStatus[] | undefined = undefined;
  if (data.payments) {
    const rawPayments: PaymentStatus[] = data.payments.map((p: any) => {
      const monthVal = parseMonthToYYYYMM(String(p.month || ""));
      const fromIdVal = String(p.fromId || "");
      const toIdVal = String(p.toId || "");
      const amountVal = Number(p.amount) || 0;
      return {
        id: String(p.id || `p-${monthVal}-${fromIdVal}-${toIdVal}-${amountVal}`),
        month: monthVal,
        fromId: fromIdVal,
        toId: toIdVal,
        isSettled: String(p.isSettled) === "true" || p.isSettled === true,
        amount: amountVal,
        createdAt: Number(p.createdAt) || Date.now(),
      };
    }).filter((p: PaymentStatus) => p.month && p.fromId && p.toId);

    const paymentsMap = new Map<string, PaymentStatus>();
    rawPayments.forEach(p => {
      paymentsMap.set(p.id, p);
    });
    payments = Array.from(paymentsMap.values());
  }

  return { members, expenses, payments };
}

/**
 * Saves current members, expenses, and payments to the local database.
 */
export async function syncDataToDb(
  members: Member[],
  expenses: Expense[],
  payments: PaymentStatus[]
): Promise<boolean> {
  const payload = {
    members: members.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role || "",
      avatarColor: m.avatarColor || "",
      messengerLink: m.messengerLink || "",
      messengerId: m.messengerId || ""
    })),
    expenses: expenses.map(e => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      categoryId: e.categoryId || "others",
      date: e.date || "",
      paidById: e.paidById || "",
      beneficiaryIds: Array.isArray(e.beneficiaryIds) ? e.beneficiaryIds : [],
      notes: e.notes || "",
      createdAt: e.createdAt || Date.now()
    })),
    payments: payments.map(p => ({
      id: p.id,
      month: p.month,
      fromId: p.fromId,
      toId: p.toId,
      isSettled: p.isSettled,
      amount: p.amount || 0,
      createdAt: p.createdAt || Date.now()
    }))
  };

  const response = await fetch(`${API_BASE}/api/db`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Đồng bộ thất bại: ${errorText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Lỗi đồng bộ từ phía máy chủ cục bộ.");
  }

  return true;
}
