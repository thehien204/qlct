/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Member, Expense } from "../types";

/**
 * Reads members and expenses from Google Sheet database via Apps Script Web App.
 */
export async function loadDataFromGoogleSheets(
  webAppUrl: string
): Promise<{ members: Member[]; expenses: Expense[] }> {
  if (!webAppUrl) {
    throw new Error("Đường dẫn Google Apps Script Web App chưa được cấu hình.");
  }

  const response = await fetch(webAppUrl, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Không thể nạp dữ liệu từ Google Sheets: ${errText}`);
  }

  const data = await response.json();
  
  // Parse members and expenses safely
  const members: Member[] = (data.members || []).map((m: any) => ({
    id: String(m.id || ""),
    name: String(m.name || ""),
    role: String(m.role || ""),
    avatarColor: String(m.avatarColor || "#1e3a8a"),
    messengerLink: String(m.messengerLink || ""),
    messengerId: String(m.messengerId || ""),
  })).filter((m: Member) => m.id && m.name);

  const expenses: Expense[] = (data.expenses || []).map((e: any) => ({
    id: String(e.id || ""),
    title: String(e.title || ""),
    amount: Number(e.amount) || 0,
    categoryId: String(e.categoryId || "others"),
    date: String(e.date || ""),
    paidById: String(e.paidById || ""),
    beneficiaryIds: e.beneficiaryIds ? (Array.isArray(e.beneficiaryIds) ? e.beneficiaryIds.map(String) : String(e.beneficiaryIds).split(",").map(id => id.trim()).filter(Boolean)) : [],
    notes: String(e.notes || ""),
    createdAt: Number(e.createdAt) || Date.now(),
  })).filter((e: Expense) => e.id && e.title && e.amount > 0);

  return { members, expenses };
}

/**
 * Saves current members and expenses to Google Sheet via Apps Script Web App.
 */
export async function syncDataToGoogleSheets(
  webAppUrl: string,
  members: Member[],
  expenses: Expense[]
): Promise<boolean> {
  if (!webAppUrl) {
    throw new Error("Đường dẫn Google Apps Script Web App chưa được cấu hình.");
  }

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
      beneficiaryIds: (e.beneficiaryIds || []).join(","),
      notes: e.notes || "",
      createdAt: e.createdAt || Date.now()
    }))
  };

  // We use Content-Type: text/plain to avoid CORS preflight OPTIONS request
  const response = await fetch(webAppUrl, {
    method: "POST",
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Đồng bộ thất bại: ${errorText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Lỗi đồng bộ từ phía Google Apps Script.");
  }

  return true;
}
