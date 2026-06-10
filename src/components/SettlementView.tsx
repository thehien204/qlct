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

interface SettlementViewProps {
  members: Member[];
  expenses: Expense[];
  pageAccessToken?: string;
  pageId?: string;
}

export const SettlementView: React.FC<SettlementViewProps> = ({
  members,
  expenses,
  pageAccessToken,
  pageId,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [activeRemindIndex, setActiveRemindIndex] = useState<number | null>(null);
  const [tone, setTone] = useState<"funny" | "polite" | "urgent">("funny");

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
  const balances = calculateBalances(members, expenses, selectedMonth);
  const settlements = computeSettlements(balances);

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
      const response = await fetch("/api/gemini/advice", {
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
      const res = await fetch("/api/send-messenger", {
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
              {balances.map((bal) => {
                const m = getMember(bal.memberId);
                if (!m) return null;

                const isCreditor = bal.balance > 0;
                const isDebtor = bal.balance < 0;
                const percent = Math.min(100, Math.max(0, (bal.totalPaid / (expenses.reduce((sum, e) => sum + e.amount, 0) || 1)) * 100));

                return (
                  <div key={bal.memberId} className="border-b border-[#222] last:border-b-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${m.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-inner`}>
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{m.name}</h4>
                          <span className="text-[10px] text-gray-500 font-medium">{m.role}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-extrabold ${isCreditor ? "text-emerald-450" : isDebtor ? "text-rose-400" : "text-gray-500"}`}>
                          {isCreditor ? "+" : ""}{formatVND(bal.balance)}
                        </span>
                        <div className="text-[10px] text-gray-500">
                          Chi: {formatVND(bal.totalPaid)} • Hưởng: {formatVND(bal.totalBenefit)}
                        </div>
                      </div>
                    </div>

                    {/* Progress visual feedback */}
                    <div className="w-full bg-[#0F0F0F] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isCreditor ? "bg-emerald-500" : isDebtor ? "bg-rose-500" : "bg-gray-700"}`}
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
        </div>

        {/* Right settlement calculations action panel */}
        <div className="lg:col-span-5 bg-[#141414] rounded-2xl p-6 border border-[#222] shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <RefreshCw className="text-emerald-500 w-5 h-5" />
              Phương Án Phân Chia Tiền Tối Ưu
            </h3>

            {settlements.length === 0 ? (
              <div id="no-debts" className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-64 gap-2">
                <Smile className="w-10 h-10 text-emerald-500/80 mb-1" />
                <h4 className="font-bold text-white text-xs text-center">Tất cả tài chính đều cân bằng!</h4>
                <p className="text-[10px] text-gray-550 max-w-xs leading-relaxed text-center">
                  Gia đình đã chia đều sòng phẳng toàn bộ chi tiêu của tháng này. Không có ai nợ ai tiền nữa cả.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
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
                    <div key={idx} className="bg-[#0F0F0F] hover:bg-[#181818] border border-[#222] rounded-xl p-3.5 transition-all duration-150">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-rose-450 text-xs shrink-0">{fromM.name}</span>
                            <span className="text-[10px] text-gray-550 shrink-0">trả cho</span>
                            <span className="font-extrabold text-emerald-400 text-xs shrink-0">{toM.name}</span>
                          </div>
                          <div className="font-extrabold text-white text-sm mt-1">{formatVND(set.amount)}</div>
                        </div>

                        <button
                          id={`btn-remind-trigger-${idx}`}
                          onClick={() => {
                            setActiveRemindIndex(isReminding ? null : idx);
                            setSendResult(null);
                          }}
                          className={`text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                            isReminding 
                              ? "bg-slate-800 text-white" 
                              : "bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/35 border border-emerald-900/30"
                          }`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Nhắc nợ
                        </button>
                      </div>

                      {/* Interactive drop down reminder sub-panel */}
                      <AnimatePresence>
                        {isReminding && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-[#222] space-y-3 overflow-hidden text-xs"
                          >
                            {/* Tone Switcher tab */}
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Chọn văn văn phong:</span>
                              <div className="bg-[#0A0A0A] p-0.5 rounded-lg flex gap-1 border border-[#222]">
                                {(["funny", "polite", "urgent"] as const).map((t) => (
                                  <button
                                    key={t}
                                    id={`tone-${idx}-${t}`}
                                    onClick={() => setTone(t)}
                                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition ${
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
                                  <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-500" />
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
                              {/* Option A: Copy clipboard & share link */}
                              <button
                                id={`btn-open-fb-${idx}`}
                                onClick={() => handleCopyAndOpenMessenger(set, idx, customMsgText)}
                                className="bg-[#1A1A1A] hover:bg-[#252525] border border-[#2c2c2c] text-gray-305 font-bold py-2 p-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer text-[10px]"
                                title="Sao chép tin nhắn và mở liên kết chat để dán gửi"
                              >
                                {copiedId === `${idx}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-405 font-bold" /> Đã copy tin
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" /> Nhắc qua Link Chat
                                  </>
                                )}
                              </button>

                              {/* Option B: Direct Page API delivery */}
                              <button
                                id={`btn-send-api-${idx}`}
                                onClick={() => handleSendViaPageAPI(set, idx, customMsgText)}
                                disabled={sendLoading}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 p-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer text-[10px] disabled:opacity-40"
                                title="Gửi tin nhắn tự động 1 click thông qua Page chatbot API"
                              >
                                <Send className="w-3.5 h-3.5" /> Gửi Tự Động (Page API)
                              </button>
                            </div>

                            {/* FB message delivery feedback output status */}
                            {sendResult && sendResult.id === `${idx}` && (
                              <div className={`p-2 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 ${
                                sendResult.success ? "bg-emerald-950/20 border border-emerald-900/30 text-emerald-400" : "bg-rose-950/20 border border-rose-900/30 text-rose-450"
                              }`}>
                                <ShieldAlert className="w-3.5 h-3.5" />
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
        </div>
      </div>
    </div>
  );
};
