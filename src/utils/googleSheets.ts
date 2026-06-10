/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Member, Expense } from "../types";

// Setup types for sheets integration
export interface GoogleSheetsConfig {
  clientId: string;
  spreadsheetId: string;
  accessToken: string;
}

/**
 * Creates a new Google Spreadsheet on user's Google Drive inside their personal account.
 */
export async function createNewExpenseSpreadsheet(accessToken: string): Promise<string> {
  const url = "https://sheets.googleapis.com/v4/spreadsheets";
  
  const body = {
    properties: {
      title: `Sổ Tay Chi Tiêu Gia Đình - ${new Date().toLocaleDateString("vi-VN")}`,
    },
    sheets: [
      {
        properties: {
          title: "ThanhVien",
          gridProperties: { rowCount: 100, columnCount: 10 }
        }
      },
      {
        properties: {
          title: "ChiTieu",
          gridProperties: { rowCount: 1000, columnCount: 15 }
        }
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Không thể khởi tạo Bảng tính mới: ${errText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  
  // Set up header columns immediately
  await initializeSheetHeaders(accessToken, spreadsheetId);
  
  return spreadsheetId;
}

/**
 * Initialize headers for sheets
 */
async function initializeSheetHeaders(accessToken: string, spreadsheetId: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;

  const body = {
    valueInputOption: "RAW",
    data: [
      {
        range: "ThanhVien!A1:F1",
        values: [
          ["ID Thành Viên", "Họ & Tên", "Vai trò", "Màu đại diện", "Liên kết Messenger", "Facebook PSID"]
        ]
      },
      {
        range: "ChiTieu!A1:I1",
        values: [
          ["ID Khoản Chi", "Nội dung chi tiêu", "Số tiền (VND)", "Mã danh mục", "Ngày chi", "ID Người trả", "IDs Người hưởng thụ (cách nhau bằng dấu phẩy)", "Ghi chú", "Ngày tạo hệ thống (Timestamp)"]
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error("Lỗi khởi tạo hàng đầu danh sách trên Google Sheets:", await response.text());
  }
}

/**
 * Saves current members and expenses to Google Sheet. Overwrites spreadsheets.
 */
export async function syncDataToGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  members: Member[],
  expenses: Expense[]
): Promise<boolean> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;

  // Format members list values
  const memberValues = [
    // Header
    ["ID Thành Viên", "Họ & Tên", "Vai trò", "Màu đại diện", "Liên kết Messenger", "Facebook PSID"],
    // Data
    ...members.map(m => [
      m.id,
      m.name,
      m.role,
      m.avatarColor,
      m.messengerLink || "",
      m.messengerId || ""
    ])
  ];

  // Format expenses list values
  const expenseValues = [
    // Header
    ["ID Khoản Chi", "Nội dung chi tiêu", "Số tiền (VND)", "Mã danh mục", "Ngày chi", "ID Người trả", "IDs Người hưởng thụ (cách nhau bằng dấu phẩy)", "Ghi chú", "Ngày tạo hệ thống (Timestamp)"],
    // Data
    ...expenses.map(e => [
      e.id,
      e.title,
      e.amount,
      e.categoryId,
      e.date,
      e.paidById,
      (e.beneficiaryIds || []).join(","),
      e.notes || "",
      e.createdAt
    ])
  ];

  const body = {
    valueInputOption: "RAW",
    data: [
      {
        range: "ThanhVien!A1:F100", // Clears out old values by using generous range
        values: memberValues
      },
      {
        range: "ChiTieu!A1:I1000",
        values: expenseValues
      }
    ]
  };

  // Before overwriting completely, we clear out the sheets or simply write
  // Clear sheets ranges to avoid trailing old data if count decreased
  await clearSpreadsheetRange(accessToken, spreadsheetId, "ThanhVien!A2:F100");
  await clearSpreadsheetRange(accessToken, spreadsheetId, "ChiTieu!A2:I1000");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Đồng bộ thất bại: ${errorText}`);
  }

  return true;
}

/**
 * Clear existing cells in spreadsheet
 */
async function clearSpreadsheetRange(accessToken: string, spreadsheetId: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    }
  });
}

/**
 * Reads members and expenses from Google Sheet database.
 */
export async function loadDataFromGoogleSheets(
  accessToken: string,
  spreadsheetId: string
): Promise<{ members: Member[]; expenses: Expense[] }> {
  // Fetch both worksheets at once
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=ThanhVien!A2:F100&ranges=ChiTieu!A2:I1000`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Không thể nạp dữ liệu từ Google Sheets: ${errText}`);
  }

  const data = await response.json();
  const valueRanges = data.valueRanges || [];
  
  const memberRows = valueRanges[0]?.values || [];
  const expenseRows = valueRanges[1]?.values || [];

  // Parse Members
  const members: Member[] = memberRows.map((row: any) => ({
    id: row[0] || "",
    name: row[1] || "",
    role: row[2] || "",
    avatarColor: row[3] || "#1e3a8a",
    messengerLink: row[4] || "",
    messengerId: row[5] || "",
  })).filter((m: Member) => m.id && m.name);

  // Parse Expenses
  const expenses: Expense[] = expenseRows.map((row: any) => ({
    id: row[0] || "",
    title: row[1] || "",
    amount: Number(row[2]) || 0,
    categoryId: row[3] || "others",
    date: row[4] || "",
    paidById: row[5] || "",
    beneficiaryIds: row[6] ? String(row[6]).split(",").map(id => id.trim()).filter(Boolean) : [],
    notes: row[7] || "",
    createdAt: Number(row[8]) || Date.now(),
  })).filter((e: Expense) => e.id && e.title && e.amount > 0);

  return { members, expenses };
}
