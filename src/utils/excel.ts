/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from "xlsx";
import { Member, Expense } from "../types";
import { getCategoryById } from "./categories";

/**
 * Cleanly format and download full family financial report in .xlsx format
 */
export const downloadFamilyExcel = (expenses: Expense[], members: Member[]) => {
  // 1. Transaction Sheet Rows
  const transactionRows = expenses.map((exp, idx) => {
    const buyer = members.find((m) => m.id === exp.paidById);
    const cat = getCategoryById(exp.categoryId);
    const beneficiaryNames = (exp.beneficiaryIds || [])
      .map((id) => members.find((m) => m.id === id)?.name || "")
      .filter(Boolean)
      .join(", ");

    return {
      "STT": idx + 1,
      "Ngày": exp.date,
      "Hạng mục": cat.name,
      "Nội dung chi tiêu": exp.title,
      "Số tiền (VND)": exp.amount,
      "Người trả tiền": buyer?.name || "Người ngoài",
      "Thành viên hưởng thụ": beneficiaryNames,
      "Ghi chú": exp.notes || "",
    };
  });

  // 2. Member Sheet Rows
  const memberRows = members.map((m, idx) => ({
    "STT": idx + 1,
    "Họ & Tên": m.name,
    "Vai trò": m.role,
    "Liên kết Messenger": m.messengerLink || "Chưa thiết lập",
    "Facebook PSID (ID Tin Nhắn)": m.messengerId || "Chưa thiết lập",
  }));

  // 3. Simple balance statistics grouping by month
  const monthlyStats: any[] = [];
  const uniqueMonths = Array.from(new Set(expenses.map((e) => e.date.substring(0, 7)))).sort().reverse();

  uniqueMonths.forEach((month) => {
    const monthExpenses = expenses.filter((e) => e.date.startsWith(month));
    const totalMonthAmount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate balances for each member in this month
    members.forEach((member) => {
      let totalPaid = 0;
      let totalBenefit = 0;

      monthExpenses.forEach((exp) => {
        // Amount they paid
        if (exp.paidById === member.id) {
          totalPaid += exp.amount;
        }

        // Amount they benefited from
        if (exp.beneficiaryIds && exp.beneficiaryIds.includes(member.id)) {
          const splitCount = exp.beneficiaryIds.length;
          totalBenefit += exp.amount / (splitCount || 1);
        }
      });

      const balance = totalPaid - totalBenefit;

      monthlyStats.push({
        "Tháng": month,
        "Thành viên": member.name,
        "Tổng Chi Tiêu Của Tháng": totalMonthAmount,
        "Đã Thanh Toán (VND)": totalPaid,
        "Lượng Hưởng Thụ (VND)": Math.round(totalBenefit),
        "Cân Đối Số Dư (VND)": Math.round(balance),
        "Trạng thái": balance > 0 
          ? `Nhận lại +${formatNumber(Math.round(balance))}` 
          : balance < 0 
          ? `Cần trả ${formatNumber(Math.abs(Math.round(balance)))}` 
          : "Cân bằng"
      });
    });
  });

  // 4. Create Workbook structure
  const wb = XLSX.utils.book_new();

  // Create & format worksheet for Transactions
  const wsTransactions = XLSX.utils.json_to_sheet(transactionRows);
  // Auto cols width estimation
  wsTransactions["!cols"] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Ngày
    { wch: 22 }, // Hạng mục
    { wch: 35 }, // Nội dung chi tiêu
    { wch: 15 }, // Số tiền
    { wch: 18 }, // Người trả tiền
    { wch: 35 }, // Thành viên hưởng thụ
    { wch: 25 }, // Ghi chú
  ];
  XLSX.utils.book_append_sheet(wb, wsTransactions, "Nhật ký Chi tiêu");

  // Create & format worksheet for Monthly Balance Summary
  const wsStatistics = XLSX.utils.json_to_sheet(monthlyStats);
  wsStatistics["!cols"] = [
    { wch: 10 }, // Tháng
    { wch: 18 }, // Thành viên
    { wch: 22 }, // Tổng Chi Tiêu Của Tháng
    { wch: 20 }, // Đã Thanh Toán
    { wch: 20 }, // Lượng Hưởng Thụ
    { wch: 20 }, // Cân Đối Số Dư
    { wch: 24 }, // Trạng thái
  ];
  XLSX.utils.book_append_sheet(wb, wsStatistics, "Cân đối Tài chính");

  // Create & format worksheet for Family Members
  const wsMembers = XLSX.utils.json_to_sheet(memberRows);
  wsMembers["!cols"] = [
    { wch: 6 },  // STT
    { wch: 18 }, // Họ & Tên
    { wch: 22 }, // Vai trò
    { wch: 30 }, // Liên kết Messenger
    { wch: 30 }, // Facebook PSID
  ];
  XLSX.utils.book_append_sheet(wb, wsMembers, "Thành viên gia đình");

  // 5. Trigger download file
  const fileName = `bao_cao_chi_tieu_gia_dinh_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Help helper for formating inner stats
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
