/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Member, Expense } from "../types";
import { getCategoryById } from "../utils/categories";
import { formatVND } from "../utils/settlement";
import { 
  Trash2, Search, Filter, Calendar, Users, 
  Utensils, Zap, GraduationCap, ShoppingBag, 
  HeartPulse, Car, Sparkles, Coins, ShoppingCart,
  FileSpreadsheet
} from "lucide-react";
import { downloadFamilyExcel } from "../utils/excel";

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[];
  onDeleteExpense: (id: string) => void;
}

// Icon mapper helper
const getCategoryIconComponent = (iconName: string) => {
  switch (iconName) {
    case "Utensils": return <Utensils className="w-5 h-5" />;
    case "Zap": return <Zap className="w-5 h-5" />;
    case "GraduationCap": return <GraduationCap className="w-5 h-5" />;
    case "ShoppingBag": return <ShoppingBag className="w-5 h-5" />;
    case "HeartPulse": return <HeartPulse className="w-5 h-5" />;
    case "Car": return <Car className="w-5 h-5" />;
    case "Sparkles": return <Sparkles className="w-5 h-5" />;
    default: return <Coins className="w-5 h-5" />;
  }
};

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  members,
  onDeleteExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Extract available months for list filter
  const months = Array.from(new Set(expenses.map((e) => e.date.substring(0, 7)))).sort().reverse();

  // Filter logic
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesMonth = filterMonth ? e.date.startsWith(filterMonth) : true;
    const matchesBuyer = filterBuyer ? e.paidById === filterBuyer : true;
    const matchesCategory = filterCategory ? e.categoryId === filterCategory : true;
    return matchesSearch && matchesMonth && matchesBuyer && matchesCategory;
  });

  // Calculate filtered sum
  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Helper to find member by ID
  const getMember = (id: string) => members.find((m) => m.id === id);

  return (
    <div id="expense-list-container" className="space-y-4">
      {/* Search & Filter Header card */}
      <div className="bg-[#141414] rounded-2xl p-5 border border-[#222] shadow-lg">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 flex-wrap">
            <ShoppingCart className="text-emerald-500 w-5 h-5" />
            Nhật Ký Chi Tiêu Gia Đình
            <span className="text-xs bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded-full font-medium mr-2">
              {filteredExpenses.length} khoản
            </span>
            <button
              id="btn-quick-export-excel"
              onClick={() => downloadFamilyExcel(filteredExpenses, members)}
              className="text-[10px] bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all duration-150 cursor-pointer"
              title="Xuất danh sách chi tiêu đang được lọc sang Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Xuất Excel bản lọc
            </button>
          </h3>

          <div className="text-right w-full md:w-auto">
            <span className="text-xs text-gray-500 block font-medium">Tổng tiền lọc được:</span>
            <span className="text-lg font-extrabold text-emerald-400">{formatVND(totalFiltered)}</span>
          </div>
        </div>

        {/* Filter Toolbar components */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              id="search-input"
              type="text"
              placeholder="Tìm kiếm chi tiêu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-[#141414] text-white placeholder-gray-600"
            />
          </div>

          {/* Month Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 z-10" />
            <select
              id="filter-month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-[#141414] text-white cursor-pointer"
            >
              <option value="" className="bg-[#0A0A0A]">Tất cả các tháng</option>
              {months.map((m: any) => (
                <option key={m} value={m} className="bg-[#0A0A0A]">Tháng {m.split("-")[1]}/{m.split("-")[0]}</option>
              ))}
            </select>
          </div>

          {/* Buyer Filter */}
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 z-10" />
            <select
              id="filter-buyer"
              value={filterBuyer}
              onChange={(e) => setFilterBuyer(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-[#141414] text-white cursor-pointer"
            >
              <option value="" className="bg-[#0A0A0A]">Ai thanh toán?</option>
              {members.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#0A0A0A]">{m.name}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 z-10" />
            <select
              id="filter-category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-[#141414] text-white cursor-pointer"
            >
              <option value="" className="bg-[#0A0A0A]">Lọc theo hạng mục</option>
              <option value="food" className="bg-[#0A0A0A]">Ăn uống & Chợ búa</option>
              <option value="utilities" className="bg-[#0A0A0A]">Điện, Nước & Internet</option>
              <option value="education" className="bg-[#0A0A0A]">Học tập & Giáo dục</option>
              <option value="shopping" className="bg-[#0A0A0A]">Sắm sửa & Đồ gia dụng</option>
              <option value="health" className="bg-[#0A0A0A]">Y tế & Sức khỏe</option>
              <option value="travel" className="bg-[#0A0A0A]">Xăng xe & Đi lại</option>
              <option value="entertainment" className="bg-[#0A0A0A]">Vui chơi & Giải trí</option>
              <option value="others" className="bg-[#0A0A0A]">Chi phí khác</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses list card scroll */}
      <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
        {filteredExpenses.length === 0 ? (
          <div className="bg-[#141414] rounded-2xl p-12 text-center border border-[#222] flex flex-col items-center justify-center space-y-3">
            <div className="bg-[#0F0F0F] p-4 rounded-full text-gray-600">
              <ShoppingCart className="w-10 h-10" />
            </div>
            <h4 className="text-gray-300 font-medium text-sm">Không tìm thấy khoản chi tiêu nào</h4>
            <p className="text-xs text-gray-500 max-w-sm">
              Gia đình chưa có chi tiêu khớp với bộ lọc của bạn. Hãy nhập một khoản chi mới trong ô bên cạnh.
            </p>
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const cat = getCategoryById(exp.categoryId);
            const buyer = getMember(exp.paidById);
            const beneficiaries = exp.beneficiaryIds ? exp.beneficiaryIds.map(getMember).filter(Boolean) : [];

            return (
              <div
                key={exp.id}
                id={`exp-card-${exp.id}`}
                className="bg-[#141414] rounded-xl p-4 border border-[#222] hover:border-[#333] hover:bg-[#191919] transition-all duration-150 flex items-center justify-between gap-4"
              >
                {/* Visual Category logo icon */}
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-inner"
                  style={{ backgroundColor: cat.color }}
                  title={cat.name}
                >
                  {getCategoryIconComponent(cat.icon)}
                </div>

                {/* Core description contents */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span 
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                    >
                      {cat.name}
                    </span>
                    <span className="text-xs text-gray-500 font-medium font-mono">{exp.date}</span>
                  </div>

                  <h4 className="font-bold text-white text-sm mt-1 truncate" title={exp.title}>{exp.title}</h4>
                  
                  {exp.notes && (
                    <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5 italic">Ghi chú: {exp.notes}</p>
                  )}

                  {/* Flow trace of Who paid & Who benefits */}
                  <div className="mt-3 pt-2.5 border-t border-[#1F1F1F] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-gray-500 text-[11px] font-medium shrink-0">Người trả:</span>
                      <span className="bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${buyer?.avatarColor || "bg-gray-500"}`}></span>
                        {buyer?.name || "Không xác định"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-start sm:justify-end">
                      <span className="text-gray-500 text-[11px] font-medium shrink-0">Mua cho:</span>
                      <div className="flex flex-wrap gap-1 max-w-full items-center">
                        {beneficiaries.length === 0 ? (
                          <span className="text-gray-600 text-[11px] italic">Không chia cho ai</span>
                        ) : beneficiaries.length === members.length && members.length > 1 ? (
                          <span className="bg-blue-950/40 text-blue-300 border border-blue-900/45 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                            Cả gia đình ({members.length} người)
                          </span>
                        ) : (
                          beneficiaries.map((b) => (
                            <span 
                              key={b!.id}
                              className="bg-[#1A1A1A] text-gray-300 border border-[#262626] px-1.5 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 shadow-sm"
                              title={`${b!.name} (${b!.role})`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${b!.avatarColor}`}></span>
                              {b!.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price and Action triggers */}
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <span className="font-extrabold text-white text-sm">{formatVND(exp.amount)}</span>
                  <button
                    id={`btn-del-exp-${exp.id}`}
                    onClick={() => {
                      if (window.confirm(`Bạn có chắc chắn muốn xóa chi tiêu "${exp.title}" không?`)) {
                        onDeleteExpense(exp.id);
                      }
                    }}
                    className="p-1.5 text-gray-600 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                    title="Xóa khoản chi tiêu này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
