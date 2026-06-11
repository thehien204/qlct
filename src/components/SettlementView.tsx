/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Member, Expense, Settlement, AIInsight } from "../types";
import { 
  calculateBalances, computeSettlements, formatVND, getCurrentMonthStr 
} from "../utils/settlement";
import { 
  CreditCard, Calendar, AlertTriangle, Send, Copy, 
  Check, RefreshCw, MessageCircle, Sparkles, Smile, ShieldAlert,
  Volume2, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { PaymentStatus } from "../utils/googleSheets";
import { API_BASE } from "../utils/api";

interface SettlementViewProps {
  members: Member[];
  expenses: Expense[];
  payments: PaymentStatus[];
  onAddPayment: (month: string, fromId: string, toId: string, amount: number) => void;
  onDeletePayment: (paymentId: string) => void;
  onUpdatePaymentAmount: (paymentId: string, newAmount: number) => void;
  pageAccessToken?: string;
  pageId?: string;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

export const SettlementView: React.FC<SettlementViewProps> = ({
  members,
  expenses,
  payments,
  onAddPayment,
  onDeletePayment,
  onUpdatePaymentAmount,
  pageAccessToken,
  pageId,
  showToast,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [activeRemindIndex, setActiveRemindIndex] = useState<number | null>(null);
  const [tone, setTone] = useState<"funny" | "polite" | "urgent">("funny");

  // Payment amount inline editing states
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingAmountStr, setEditingAmountStr] = useState("");

  // AI loading and data states
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  
  // Clipboard copy status
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Facebook API message sending status
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState<{ id: string; success: boolean; text: string } | null>(null);

  // Re-calculate splits on month change
  const rawBalances = calculateBalances(members, expenses, selectedMonth);
  const activeBalances = calculateBalances(members, expenses, selectedMonth, payments);
  const settlements = computeSettlements(activeBalances);
  const settledPayments = payments.filter((p) => p.month === selectedMonth && p.isSettled);

  // Available months list helper
  const months = Array.from(new Set(expenses.map((e) => e.date.substring(0, 7)))).sort().reverse();
  if (!months.includes(getCurrentMonthStr())) {
    months.unshift(getCurrentMonthStr());
  }

  // Fetch AI Reminders and Advice via API
  const fetchAiAdvice = async () => {
    if (expenses.length === 0) return;
    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch(`${API_BASE}/api/gemini/advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses,
          members,
          month: selectedMonth,
          debts: settlements,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setAiInsight(data);
      } else {
        setAiError(data.error || "Không thể gọi ý kiến cố vấn từ AI.");
      }
    } catch (err: any) {
      setAiError("Máy chủ không phản hồi hoặc đã quá tải hạn mức API. Đang sử dụng mẫu nhắc nhợ tiêu chuẩn.");
    } finally {
      setAiLoading(false);
    }
  };

  // Automatically fetch advice when settlements list changes or month changes
  useEffect(() => {
    fetchAiAdvice();
    setActiveRemindIndex(null);
    setSendResult(null);
  }, [selectedMonth, expenses.length, members.length]);

  // Generate fallback reminders if Gemini key is missing
  const getFallbackReminder = (fromName: string, toName: string, amount: number, selectedTone: string) => {
    const amountStr = formatVND(amount);
    if (selectedTone === "funny") {
      return `Alo alo ${fromName} ơi! Tiền nong là sòng phẳng nhé, tháng này tiêu chung hết ${amountStr}, mau trả cho ${toName} để gia đình giữ gìn hòa khí nha! 😘`;
    } else if (selectedTone === "polite") {
      return `Gửi thành viên ${fromName} thân yêu. Đây là lời nhắc tự động từ Hệ thống Quản lý Chi tiêu Gia đình. Khoản tiền chung cần hoàn trả cho ${toName} trong tháng này là ${amountStr}. Mong bạn sắp xếp chuyển khoản nhé.`;
    } else {
      return `Cảnh báo đóng băng chế độ ăn uống! 🚨 ${fromName} đang nợ ${toName} số tiền ${amountStr}. Vui lòng thanh toán gấp để tránh nguy cơ cắt internet hoặc rửa bát 3 ngày liên tiếp nhé!`;
    }
  };

  // Trigger Facebook sending through API Route
  const handleSendViaPageAPI = async (settlement: Settlement, index: number, msgText: string) => {
    const debtor = members.find((m) => m.id === settlement.fromId);
    if (!debtor) return;

    setSendLoading(true);
    setSendResult(null);

    const isTest = !pageAccessToken; // Test simulator if PageAccessToken is empty in settings

    try {
      const res = await fetch(`${API_BASE}/api/send-messenger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgText,
          pageAccessToken,
          pageId,
          recipientId: debtor.messengerId || "SIMULATED_PSID",
          testMode: isTest,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSendResult({
          id: `${index}`,
          success: true,
          text: isTest 
            ? "Đã mô phỏng gửi thành công! (Do chưa cài Page Access Token ở tab Cấu Hình)." 
            : "Đã gửi tin nhắn nhắc nợ thực tế đến Messenger thành công!",
        });
      } else {
        setSendResult({
          id: `${index}`,
          success: false,
          text: data.error || "Gửi thất bại qua APi Facebook.",
        });
      }
    } catch (err: any) {
      setSendResult({
        id: `${index}`,
        success: false,
        text: "Không kết nối được server Proxy gửi tin.",
      });
    } finally {
      setSendLoading(false);
    }
  };

  // Direct Messenger deep-link with automatic clipboard copy
  const handleCopyAndOpenMessenger = (settlement: Settlement, index: number, msgText: string) => {
    const debtor = members.find((m) => m.id === settlement.fromId);
    // Copy to clipboard
    navigator.clipboard.writeText(msgText);
    setCopiedId(`${index}`);
    setTimeout(() => setCopiedId(null), 3000);

    // Open link
    if (debtor?.messengerLink) {
      window.open(debtor.messengerLink, "_blank");
    } else {
      window.open("https://www.messenger.com", "_blank");
    }
  };

  const getMember = (id: string) => members.find((m) => m.id === id);

  return (
    <div id="settlement-viewport" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left balance table section */}
        <div className="lg:col-span-7 bg-[#141414] rounded-2xl p-6 border border-[#222] shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <CreditCard className="text-blue-400 w-5 h-5" />
                Cân Đối Thu Chi Tháng {selectedMonth.split("-")[1]}/{selectedMonth.split("-")[0]}
              </h3>

              {/* Month Selector dropdown */}
              <select
                id="settle-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs px-3 py-1.5 bg-[#0F0F0F] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-white font-medium"
              >
                {months.map((m: any) => (
                  <option key={m} value={m} className="bg-[#0A0A0A]">Tháng {m.split("-")[1]}/{m.split("-")[0]}</option>
                ))}
              </select>
            </div>

            {/* List personal balances */}
            <div className="space-y-4">
              {rawBalances.map((rawBal) => {
                const m = getMember(rawBal.memberId);
                if (!m) return null;

                // Find corresponding remaining/active balance
                const activeBal = activeBalances.find((b) => b.memberId === rawBal.memberId) || rawBal;

                const isCreditor = activeBal.balance > 0;
                const isDebtor = activeBal.balance < 0;
                
                // For progress bar, we still show the percentage of raw spending to total expenses
                const percent = Math.min(100, Math.max(0, (rawBal.totalPaid / (expenses.reduce((sum, e) => sum + e.amount, 0) || 1)) * 100));

                return (
                  <div key={rawBal.memberId} className="border-b border-[#222] last:border-b-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${m.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-inner`}>
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{m.name}</h4>
                          <span className="text-[10px] text-gray-550 font-medium">{m.role}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-extrabold ${isCreditor ? "text-emerald-450" : isDebtor ? "text-rose-400" : "text-gray-500"}`}>
                          {isCreditor ? "Còn nhận: +" : isDebtor ? "Còn nợ: " : "Cân bằng: "}{formatVND(activeBal.balance)}
                        </span>
                        <div className="text-[10px] text-gray-550">
                          Chi mua: {formatVND(rawBal.totalPaid)} • Hưởng: {formatVND(rawBal.totalBenefit)}
                        </div>
                      </div>
                    </div>

                    {/* Progress visual feedback */}
                    <div className="w-full bg-[#0F0F0F] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${activeBal.balance > 0 ? "bg-emerald-500" : activeBal.balance < 0 ? "bg-rose-500" : "bg-gray-700"}`}
                        style={{ width: `${percent || 5}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#222] bg-[#0F0F0F] p-4 rounded-xl text-xs text-gray-400 leading-relaxed">
            💡 <strong>Quy tắc phân chia:</strong> Tổng chi tiêu của cả gia đình trong tháng được tính rồi chia đều hoặc áp dụng theo đúng lượng thụ hưởng thực tế được khai báo. Hiệu số chênh lệch giữa tiền mua thực tế và tiền thụ hưởng chính là số dư nợ/nhận.
          </div>
        </div>        {/* Right settlement calculations action panel */}
        <div className="lg:col-span-5 bg-[#141414] rounded-2xl p-6 border border-[#222] shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4 pb-2 border-b border-[#222]/50">
              <RefreshCw className="text-emerald-500 w-5 h-5" />
              Quyết Toán Tiền Gia Đình
            </h3>

            {/* 1. Khoản Nợ Chưa Trả Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Nợ Chưa Thanh Toán ({settlements.length})
              </h4>

              {settlements.length === 0 ? (
                <div id="no-debts" className="p-5 text-center text-gray-500 bg-[#0F0F0F] border border-[#222] rounded-xl flex flex-col items-center justify-center gap-1.5">
                  <Smile className="w-7 h-7 text-emerald-500/85" />
                  <h5 className="font-bold text-white text-[11px]">Không có nợ chưa thanh toán!</h5>
                  <p className="text-[9px] text-gray-500 max-w-xs leading-relaxed">
                    Tất cả chi phí và các khoản nợ của tháng này đã khớp hoặc được hoàn tất.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {settlements.map((set, idx) => {
                    const fromM = getMember(set.fromId);
                    const toM = getMember(set.toId);
                    if (!fromM || !toM) return null;

                    const isReminding = activeRemindIndex === idx;

                    // Find AI specific message draft if loaded
                    let customMsgText = "";
                    if (aiInsight && aiInsight.reminders && aiInsight.reminders[idx]) {
                      const aiDraft = aiInsight.reminders[idx];
                      customMsgText = tone === "funny" ? aiDraft.funnyMessage : tone === "polite" ? aiDraft.politeMessage : aiDraft.urgentMessage;
                    } else {
                      customMsgText = getFallbackReminder(fromM.name, toM.name, set.amount, tone);
                    }

                    return (
                      <div key={`unpaid-${idx}`} className="bg-[#0F0F0F] hover:bg-[#181818] border border-[#222] rounded-xl p-3 flex flex-col gap-2.5 transition-all duration-150">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Checkbox Button to confirm payment */}
                            <button
                              onClick={() => {
                                onAddPayment(selectedMonth, set.fromId, set.toId, set.amount);
                                showToast && showToast(
                                  `Đã ghi nhận ${fromM.name} trả ${formatVND(set.amount)} cho ${toM.name}!`,
                                  "success"
                                );
                              }}
                              className="w-5 h-5 rounded-full border border-[#333] hover:border-emerald-500/50 bg-[#0A0A0A] text-transparent hover:text-emerald-500/40 flex items-center justify-center cursor-pointer transition-all shrink-0"
                              title="Xác nhận đã trả tiền"
                            >
                              <Check className="w-3 h-3 font-bold" />
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-xs text-rose-400">{fromM.name}</span>
                                <span className="text-[10px] text-gray-500">trả cho</span>
                                <span className="font-extrabold text-xs text-emerald-400">{toM.name}</span>
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-955/20 border border-amber-900/30 text-amber-500 uppercase tracking-wider">Chưa trả</span>
                              </div>
                              <div className="font-extrabold text-xs mt-0.5 text-white">{formatVND(set.amount)}</div>
                            </div>
                          </div>

                          {/* Remind Button */}
                          <button
                            id={`btn-remind-trigger-${idx}`}
                            onClick={() => {
                              setActiveRemindIndex(isReminding ? null : idx);
                              setSendResult(null);
                            }}
                            className={`text-[10px] font-semibold py-1 px-2.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                              isReminding 
                                ? "bg-slate-800 text-white" 
                                : "bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/35 border border-emerald-900/30"
                            }`}
                          >
                            <MessageCircle className="w-3 h-3" /> Nhắc nợ
                          </button>
                        </div>

                        {/* Interactive drop down reminder sub-panel */}
                        <AnimatePresence>
                          {isReminding && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-1 pt-3 border-t border-[#222] space-y-3 overflow-hidden text-xs"
                            >
                              {/* Tone Switcher tab */}
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Chọn văn phong:</span>
                                <div className="bg-[#0A0A0A] p-0.5 rounded-lg flex gap-1 border border-[#222]">
                                  {(["funny", "polite", "urgent"] as const).map((t) => (
                                    <button
                                      key={t}
                                      id={`tone-${idx}-${t}`}
                                      onClick={() => setTone(t)}
                                      className={`px-2 py-0.5 rounded-md text-[9px] font-semibold transition ${
                                        tone === t ? "bg-[#222] text-white shadow-xs" : "text-gray-500 hover:text-gray-400"
                                      }`}
                                    >
                                      {t === "funny" ? "Hài hước" : t === "polite" ? "Lịch sự" : "Hối thúc"}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Main draft text box window */}
                              <div className="relative bg-[#080808] p-3 rounded-lg border border-[#222] text-gray-300 italic leading-relaxed text-[11px] select-text">
                                {aiLoading ? (
                                  <div className="flex items-center justify-center py-2 gap-1.5 text-gray-500">
                                    <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-450" />
                                    <span>AI đang thiết kế tin nịnh bợ dễ thương...</span>
                                  </div>
                                ) : (
                                  <>
                                    <p>{customMsgText}</p>
                                    {aiInsight && (
                                      <span className="absolute bottom-1 right-1.5 text-[8px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-1 rounded flex items-center gap-0.5 font-semibold">
                                        <Sparkles className="w-2.5 h-2.5" /> Gemini AI
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Execution trigger buttons */}
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  id={`btn-open-fb-${idx}`}
                                  onClick={() => handleCopyAndOpenMessenger(set, idx, customMsgText)}
                                  className="bg-[#1A1A1A] hover:bg-[#252525] border border-[#2c2c2c] text-gray-300 font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer text-[10px]"
                                >
                                  {copiedId === `${idx}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400 font-bold" /> Đã copy tin
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" /> Nhắc qua Link Chat
                                    </>
                                  )}
                                </button>

                                <button
                                  id={`btn-send-api-${idx}`}
                                  onClick={() => handleSendViaPageAPI(set, idx, customMsgText)}
                                  disabled={sendLoading}
                                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer text-[10px] disabled:opacity-40"
                                >
                                  <Send className="w-3 h-3" /> Page API
                                </button>
                              </div>

                              {sendResult && sendResult.id === `${idx}` && (
                                <div className={`p-2 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 ${
                                  sendResult.success ? "bg-emerald-950/20 border border-emerald-900/30 text-emerald-400" : "bg-rose-950/20 border border-rose-900/30 text-rose-450"
                                }`}>
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>{sendResult.text}</span>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Lịch Sử Thanh Toán Section */}
            <div className="space-y-3 mt-5 pt-4 border-t border-[#222]/50">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Lịch Sử Đã Trả Tháng Này ({settledPayments.length})
              </h4>

              {settledPayments.length === 0 ? (
                <p className="text-[10px] text-gray-600 italic text-center py-2 bg-[#0A0A0A]/40 rounded-xl border border-[#222]/40">
                  Chưa có giao dịch thanh toán nào được ghi nhận trong tháng này.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {settledPayments.map((p) => {
                    const fromM = getMember(p.fromId);
                    const toM = getMember(p.toId);
                    if (!fromM || !toM) return null;

                    return (
                      <div key={p.id} className="bg-[#0F0F0F] border border-[#222] rounded-xl p-2 flex items-center justify-between gap-3 text-xs font-sans">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-rose-400/80 line-through text-[11px]">{fromM.name}</span>
                            <span className="text-[9px] text-gray-555">đã trả</span>
                            <span className="font-bold text-emerald-400/80 line-through text-[11px]">{toM.name}</span>
                            <span className="text-[8px] font-bold bg-emerald-950/20 px-1.5 py-0.5 rounded-full border border-emerald-900/30 text-emerald-400">Đã trả</span>
                          </div>
                          
                          {editingPaymentId === p.id ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="number"
                                value={editingAmountStr}
                                onChange={(e) => setEditingAmountStr(e.target.value)}
                                className="bg-[#050505] border border-[#333] rounded px-2 py-1 text-xs text-white w-24 focus:outline-none focus:border-emerald-500 font-sans"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  const amt = Number(editingAmountStr) || 0;
                                  onUpdatePaymentAmount(p.id, amt);
                                  setEditingPaymentId(null);
                                  showToast && showToast("Đã cập nhật số tiền thanh toán.", "success");
                                }}
                                className="bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/50 border border-emerald-900/40 p-1 rounded-lg cursor-pointer flex items-center justify-center"
                                title="Lưu số tiền"
                              >
                                <Check className="w-3 h-3 font-bold" />
                              </button>
                              <button
                                onClick={() => setEditingPaymentId(null)}
                                className="text-gray-500 hover:text-gray-400 p-1 cursor-pointer text-xs"
                                title="Hủy bỏ"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="font-extrabold text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                              <span>{formatVND(p.amount)}</span>
                              <button
                                onClick={() => {
                                  setEditingPaymentId(p.id);
                                  setEditingAmountStr(String(p.amount));
                                }}
                                className="text-gray-500 hover:text-white hover:scale-105 p-0.5 cursor-pointer transition-all text-[9px] border border-gray-800 rounded bg-[#0A0A0A] px-1"
                                title="Sửa số tiền"
                              >
                                ✏️ Sửa số tiền
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Delete Payment Button */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa lịch sử thanh toán ${formatVND(p.amount)} từ ${fromM.name} sang ${toM.name}? Khoản nợ sẽ được khôi phục.`)) {
                              onDeletePayment(p.id);
                              showToast && showToast(`Đã xóa giao dịch thanh toán & khôi phục nợ.`, "info");
                            }
                          }}
                          className="text-rose-455 hover:text-rose-400 bg-rose-955/15 hover:bg-rose-955/25 border border-rose-900/20 px-2 py-1 rounded-lg transition-colors cursor-pointer text-[10px]"
                          title="Hủy thanh toán & khôi phục lại nợ"
                        >
                          Hủy trả
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
