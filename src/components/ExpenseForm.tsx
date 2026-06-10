/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Member, Expense } from "../types";
import { DEFAULT_CATEGORIES } from "../utils/categories";
import { PlusCircle, Info, Calendar, DollarSign, Tag, CheckSquare, Square, RefreshCcw } from "lucide-react";
import { motion } from "motion/react";

interface ExpenseFormProps {
  members: Member[];
  onAddExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ members, onAddExpense }) => {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [categoryId, setCategoryId] = useState("food");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [paidById, setPaidById] = useState(() => (members[0] ? members[0].id : ""));
  const [beneficiaryIds, setBeneficiaryIds] = useState<string[]>(() => members.map((m) => m.id));
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleToggleBeneficiary = (mId: string) => {
    setBeneficiaryIds((prev) => {
      if (prev.includes(mId)) {
        return prev.filter((id) => id !== mId);
      } else {
        return [...prev, mId];
      }
    });
  };

  const handleSelectAll = () => {
    setBeneficiaryIds(members.map((m) => m.id));
  };

  const handleClearAll = () => {
    setBeneficiaryIds([]);
  };

  const formatNumberWithDots = (valStr: string) => {
    const clean = valStr.replace(/\D/g, "");
    if (!clean) return "";
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberWithDots(e.target.value);
    setAmount(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Vui lòng nhập mô tả chi tiêu.");
      return;
    }
    const cleanAmount = amount.replace(/\./g, "");
    const parsedAmount = parseFloat(cleanAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Số tiền phải lớn hơn 0.");
      return;
    }
    if (!paidById) {
      setErrorMsg("Vui lòng chọn người thanh toán.");
      return;
    }
    if (beneficiaryIds.length === 0) {
      setErrorMsg("Khoản chi tiêu phải áp dụng cho ít nhất 1 thành viên.");
      return;
    }

    onAddExpense({
      title: title.trim(),
      amount: parsedAmount,
      categoryId,
      date,
      paidById,
      beneficiaryIds,
      notes: notes.trim() || undefined,
    });

    // Reset Form
    setTitle("");
    setAmount("");
    setNotes("");
    setErrorMsg("");
    // keep date and paidById for rapid entry convenience
  };

  return (
    <div className="bg-[#141414] rounded-2xl p-6 border border-[#222] shadow-lg">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
        <PlusCircle className="text-emerald-500 w-5 h-5" />
        Thêm Khoản Chi Tiêu Mới
      </h3>

      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-400 rounded-lg text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Amount Section */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" /> Số tiền (VND) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="exp-amount"
              type="text"
              inputMode="numeric"
              pattern="[0-9.]*"
              value={amount}
              onChange={handleAmountChange}
              className="w-full text-lg font-bold pl-4 pr-14 py-2.5 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-[#141414] text-white"
              placeholder="Ví dụ: 150.000"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">VND</span>
          </div>
        </div>

        {/* Title input */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" /> Mô tả chi tiêu <span className="text-red-500">*</span>
          </label>
          <input
            id="exp-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-[#141414] text-sm text-white"
            placeholder="Ví dụ: Đi siêu thị mỳ tôm trứng giò, Hóa đơn điện..."
            required
          />
        </div>

        {/* Category & Date Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mục chi tiêu</label>
            <select
              id="exp-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-[#141414] text-sm text-white cursor-pointer"
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-[#0A0A0A]">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Ngày thanh toán
            </label>
            <input
              id="exp-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-[#141414] text-sm text-white cursor-pointer"
              required
            />
          </div>
        </div>

        {/* Paid By Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            Người chi trả (Mua) <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const selected = paidById === member.id;
              return (
                <button
                  key={member.id}
                  id={`paym-${member.id}`}
                  type="button"
                  onClick={() => setPaidById(member.id)}
                  className={`py-1.5 px-3 rounded-xl text-center border text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2 ${
                    selected
                      ? "border-emerald-500 bg-emerald-950/20 text-emerald-400 shadow-sm"
                      : "border-[#222] bg-[#0F0F0F] hover:bg-[#1A1A1A] text-gray-400"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full ${member.avatarColor} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
                    {member.name.charAt(0)}
                  </div>
                  <span className="truncate max-w-[140px]">{member.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Beneficiaries checklist ("Mua cho những ai") */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
              Mua cho những ai? (Chia đều) <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                id="btn-select-all"
                onClick={handleSelectAll}
                className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                Tất cả
              </button>
              <span className="text-[10px] text-gray-700">|</span>
              <button
                type="button"
                id="btn-clear-all"
                onClick={handleClearAll}
                className="text-[10px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                Xóa hết
              </button>
            </div>
          </div>

          <div className="bg-[#0F0F0F] p-3 rounded-xl border border-[#222] flex flex-wrap gap-2">
            {members.map((member) => {
              const checked = beneficiaryIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  id={`bene-${member.id}`}
                  type="button"
                  onClick={() => handleToggleBeneficiary(member.id)}
                  className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-left transition text-xs font-semibold cursor-pointer ${
                    checked
                      ? "bg-[#1A1A1A] border border-[#333] text-white shadow-sm"
                      : "bg-transparent text-gray-500 border border-transparent"
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-750 flex-shrink-0" />
                  )}
                  <span className="truncate max-w-[140px]">{member.name}</span>
                </button>
              );
            })}
          </div>
          {beneficiaryIds.length > 0 && amount && (
            <div className="mt-1.5 px-3 flex items-center gap-1 text-[11px] text-gray-500">
              <Info className="w-3.5 h-3.5 text-gray-500" />
              <span>Chia đều: </span>
              <strong className="text-white">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                  parseFloat(amount.replace(/\./g, "")) / beneficiaryIds.length
                )}
              </strong>
              <span>/ người (áp dụng cho {beneficiaryIds.length} người)</span>
            </div>
          )}
        </div>

        {/* Notes text-area */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ghi chú (Không bắt buộc)</label>
          <textarea
            id="exp-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-[#141414] text-xs text-white"
            placeholder="Ví dụ: Nhãn hiệu, mua giúp cô Hải, ăn uống dịp sinh nhật..."
            rows={1.5}
          />
        </div>

        {/* Submit button */}
        <button
          id="btn-add-expense-submit"
          type="submit"
          className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4.5 h-4.5" /> Ghi Nhận Chi Tiêu
        </button>
      </form>
    </div>
  );
};
