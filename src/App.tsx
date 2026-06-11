/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Member, Expense } from "./types";
import { MemberManager } from "./components/MemberManager";
import { ExpenseForm } from "./components/ExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { SettlementView } from "./components/SettlementView";
import { Dashboard } from "./components/Dashboard";
import { Settings } from "./components/Settings";
import { 
  PiggyBank, LayoutDashboard, Receipt, RefreshCw, UserCheck, Sliders, Sparkles,
  Database, CloudLightning, CloudOff, Check, AlertCircle, LogOut, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  loadDataFromGoogleSheets, 
  syncDataToGoogleSheets,
  PaymentStatus
} from "./utils/googleSheets";
import { LoginScreen } from "./components/LoginScreen";

// CẤU HÌNH ĐƯỜNG DẪN GOOGLE APPS SCRIPT MẶC ĐỊNH CHO CẢ GIA ĐÌNH TẠI ĐÂY (NẾU DÙNG GITHUB PAGES)
// Bạn dán đường dẫn Web App của bạn vào giữa hai dấu nháy kép, ví dụ: "https://script.google.com/macros/s/xxxx/exec"
const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbRieGY4wugJ7BVy7IiYtIMiLZ0HRaAVMA5AXZtIs6hkNPIwpj2nCxK1duUpUmBlydJ6A/exec";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "expenses" | "settlement" | "members" | "settings">("dashboard");

  // Load database from LocalStorage or start clean and empty, ensuring no duplicate entries
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem("family_members");
    const parsed = saved ? JSON.parse(saved) : [];
    if (Array.isArray(parsed)) {
      const map = new Map<string, Member>();
      parsed.forEach((m) => {
        if (m.id) map.set(m.id, m);
      });
      return Array.from(map.values());
    }
    return [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem("family_expenses");
    const parsed = saved ? JSON.parse(saved) : [];
    if (Array.isArray(parsed)) {
      const map = new Map<string, Expense>();
      parsed.forEach((e) => {
        if (e.id) map.set(e.id, e);
      });
      return Array.from(map.values());
    }
    return [];
  });

  const [payments, setPayments] = useState<PaymentStatus[]>(() => {
    const saved = localStorage.getItem("family_payments");
    const parsed = saved ? JSON.parse(saved) : [];
    if (Array.isArray(parsed)) {
      const map = new Map<string, PaymentStatus>();
      parsed.forEach((p) => {
        if (p.id) {
          map.set(p.id, p);
        } else if (p.month && p.fromId && p.toId) {
          const amountVal = Number(p.amount) || 0;
          const key = `${p.month}:${p.fromId}:${p.toId}:${amountVal}`;
          map.set(key, {
            id: key,
            month: p.month,
            fromId: p.fromId,
            toId: p.toId,
            isSettled: p.isSettled !== false,
            amount: amountVal,
            createdAt: p.createdAt || Date.now(),
          });
        }
      });
      return Array.from(map.values());
    }
    return [];
  });

  const [pageAccessToken, setPageAccessToken] = useState(() => {
    return localStorage.getItem("fb_page_access_token") || "";
  });

  const [pageId, setPageId] = useState(() => {
    return localStorage.getItem("fb_page_id") || "";
  });

  // Google Sheets integration state (shared centrally to enable real-time reading and active synchronization)
  const [gAppsScriptUrl, setGAppsScriptUrl] = useState(() => localStorage.getItem("gg_apps_script_url") || DEFAULT_APPS_SCRIPT_URL);
  const [sheetsSyncStatus, setSheetsSyncStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [sheetsSyncMessage, setSheetsSyncMessage] = useState("");

  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("family_auth_login") === "true";
  });

  // Toast Notification state & trigger
  const [toast, setToast] = useState<{ id: number; message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((prev) => (prev && prev.id === id ? null : prev));
    }, 4000);
  };

  // Fetch shared family configuration on mount or login
  useEffect(() => {
    const fetchFamilyConfig = async () => {
      if (!isLoggedIn) return;
      try {
        const response = await fetch("/api/family-config");
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (data.gAppsScriptUrl) {
              setGAppsScriptUrl(data.gAppsScriptUrl);
              localStorage.setItem("gg_apps_script_url", data.gAppsScriptUrl);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch family configuration from server, using local fallback.", err);
      }
    };

    fetchFamilyConfig();
  }, [isLoggedIn]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("family_auth_login");
    localStorage.removeItem("gg_apps_script_url");
    setGAppsScriptUrl("");
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("family_members", JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem("family_expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("family_payments", JSON.stringify(payments));
  }, [payments]);

  const lastFetchTimeRef = React.useRef<number>(0);

  // Reusable Google Sheets Pull function
  const pullFromSheets = async () => {
    if (!gAppsScriptUrl || !isLoggedIn) return;
    
    // Throttle fetches within 2 seconds to avoid duplicate fetches on mount/double-clicks
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) return;
    lastFetchTimeRef.current = now;
    
    setSheetsSyncStatus("loading");
    setSheetsSyncMessage("Đang tự động nạp dữ liệu từ Google Sheets...");
    try {
      const data = await loadDataFromGoogleSheets(gAppsScriptUrl);
      
      // If sheet is completely empty, keep things empty to match sheets perfectly
      if (data.members.length === 0) {
        setMembers([]);
        setExpenses([]);
        setPayments([]);
        setSheetsSyncStatus("success");
        setSheetsSyncMessage("Đồng bộ thành công! Bảng tính Google Sheets đang trống.");
      } else {
        setMembers(data.members);
        setExpenses(data.expenses);
        if (data.payments !== undefined) {
          setPayments(data.payments);
        }
        setSheetsSyncStatus("success");
        setSheetsSyncMessage(`Đồng bộ Google Sheets thành công! Nạp ${data.members.length} thành viên & ${data.expenses.length} giao dịch.`);
      }
      setTimeout(() => setSheetsSyncStatus("idle"), 4000);
    } catch (err: any) {
      console.warn("Sheets pull error:", err);
      setSheetsSyncStatus("error");
      setSheetsSyncMessage(`Tải tự động thất bại: ${err.message || "Kiểm tra URL Apps Script"}. Hệ thống đang chạy Ngoại tuyến.`);
    }
  };

  // Google Sheets Auto-Pull on initial load, login, or credentials change
  useEffect(() => {
    if (isLoggedIn) {
      pullFromSheets();
    }
  }, [gAppsScriptUrl, isLoggedIn]);

  // Pull from sheets when switching tabs to ensure fresh data (except settings tab to avoid interrupting inputs)
  useEffect(() => {
    if (isLoggedIn && activeTab !== "settings") {
      pullFromSheets();
    }
  }, [activeTab, isLoggedIn]);

  // Write-through helper function to sync to Sheets in background
  const syncWithSheetsInBg = async (
    updatedMembers: Member[], 
    updatedExpenses: Expense[], 
    updatedPayments: PaymentStatus[] = payments
  ) => {
    if (!gAppsScriptUrl) return;
    
    setSheetsSyncStatus("loading");
    setSheetsSyncMessage("Đang tự động ghi đè đồng bộ lên Google Sheets...");
    try {
      await syncDataToGoogleSheets(gAppsScriptUrl, updatedMembers, updatedExpenses, updatedPayments);
      setSheetsSyncStatus("success");
      setSheetsSyncMessage("Tự động lưu dữ liệu lên Google Sheets thành công!");
      setTimeout(() => setSheetsSyncStatus("idle"), 3000);
    } catch (err: any) {
      console.error("Auto-sync back error:", err);
      setSheetsSyncStatus("error");
      setSheetsSyncMessage(`Không thể tự động khóa dữ liệu lên Sheets: ${err.message || err}`);
    }
  };

  // Handle CRUD callbacks
  const handleUpdateMember = (updatedMember: Member) => {
    const updated = members.map((m) => (m.id === updatedMember.id ? updatedMember : m));
    setMembers(updated);
    syncWithSheetsInBg(updated, expenses, payments);
    showToast(`Đã cập nhật thông tin "${updatedMember.name}" thành công!`, "success");
  };

  const handleAddMember = (newMember: Member) => {
    const updated = [...members, newMember];
    setMembers(updated);
    syncWithSheetsInBg(updated, expenses, payments);
    showToast(`Đã thêm thành viên "${newMember.name}" thành công!`, "success");
  };

  const handleDeleteMember = (id: string) => {
    const memberName = members.find((m) => m.id === id)?.name || "thành viên";
    const updated = members.filter((m) => m.id !== id);
    setMembers(updated);
    syncWithSheetsInBg(updated, expenses, payments);
    showToast(`Đã xoá ${memberName} khỏi danh sách gia đình.`, "info");
  };

  const handleAddExpense = (newExp: Omit<Expense, "id" | "createdAt">) => {
    const fresh: Expense = {
      ...newExp,
      id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
    };
    const updated = [fresh, ...expenses];
    setExpenses(updated);
    syncWithSheetsInBg(members, updated, payments);
    showToast(`Ghi nhận khoản chi "${newExp.title}" thành công!`, "success");
  };

  const handleDeleteExpense = (id: string) => {
    const expenseTitle = expenses.find((e) => e.id === id)?.title || "khoản chi";
    const updated = expenses.filter((exp) => exp.id !== id);
    setExpenses(updated);
    syncWithSheetsInBg(members, updated, payments);
    showToast(`Đã xoá khoản chi "${expenseTitle}".`, "info");
  };

  const handleSaveFbConfig = (token: string, id: string) => {
    setPageAccessToken(token);
    setPageId(id);
    localStorage.setItem("fb_page_access_token", token);
    localStorage.setItem("fb_page_id", id);
    showToast("Đã lưu cấu hình API Messenger thành công!", "success");
  };

  const handleAddPayment = (month: string, fromId: string, toId: string, amount: number) => {
    const newPayment: PaymentStatus = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      month,
      fromId,
      toId,
      amount,
      isSettled: true,
      createdAt: Date.now()
    };
    const updated = [...payments, newPayment];
    setPayments(updated);
    syncWithSheetsInBg(members, expenses, updated);
  };

  const handleDeletePayment = (paymentId: string) => {
    const updated = payments.filter((p) => p.id !== paymentId);
    setPayments(updated);
    syncWithSheetsInBg(members, expenses, updated);
  };

  const handleImportData = (
    importedMembers: Member[], 
    importedExpenses: Expense[],
    importedPayments: PaymentStatus[] = []
  ) => {
    // Deduplicate imported members
    const membersMap = new Map<string, Member>();
    importedMembers.forEach((m) => {
      if (m.id) membersMap.set(m.id, m);
    });
    
    // Deduplicate imported expenses
    const expensesMap = new Map<string, Expense>();
    importedExpenses.forEach((e) => {
      if (e.id) expensesMap.set(e.id, e);
    });
    
    // Deduplicate imported payments
    const paymentsMap = new Map<string, PaymentStatus>();
    importedPayments.forEach((p) => {
      const amountVal = Number(p.amount) || 0;
      const key = p.id || `${p.month}:${p.fromId}:${p.toId}:${amountVal}`;
      paymentsMap.set(key, {
        ...p,
        id: key,
        amount: amountVal
      });
    });

    setMembers(Array.from(membersMap.values()));
    setExpenses(Array.from(expensesMap.values()));
    setPayments(Array.from(paymentsMap.values()));
  };

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => {
      setIsLoggedIn(true);
      localStorage.setItem("family_auth_login", "true");
    }} />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-300">
      
      {/* Visual Navigation Header Banner */}
      <header className="bg-[#0F0F0F] border-b border-[#222] sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="bg-emerald-600 text-white p-2 sm:p-2.5 rounded-xl shadow-inner shrink-0">
              <PiggyBank className="w-5 h-5 sm:w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5 uppercase truncate">
                Sổ Thu Chi {members.length > 0 ? `(${members.length} người)` : ""}
                <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">PRO</span>
              </h1>
              <p className="text-[11px] text-gray-500 font-medium font-sans hidden sm:block">
                Bộ máy giải toán phân chia tiền tháng & Nhắc nợ Facebook Messenger AI thông minh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Google Sheets Active Database sync status */}
            {gAppsScriptUrl ? (
              <div id="sheets-sync-header-badge" className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-[10px] sm:text-xs font-semibold">
                {sheetsSyncStatus === "loading" ? (
                  <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                ) : sheetsSyncStatus === "error" ? (
                  <CloudOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
                ) : (
                  <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 animate-pulse" />
                )}
                <span className="max-w-[70px] sm:max-w-[200px] truncate">
                  {sheetsSyncStatus === "loading" ? "Đang đồng bộ..." : sheetsSyncStatus === "error" ? "Lỗi Sheets" : "Google Sheets"}
                </span>
                {sheetsSyncStatus === "success" && (
                  <span className="text-[10px] text-emerald-500 font-normal pl-1 border-l border-emerald-850/40 hidden xs:inline">Cập nhật</span>
                )}
              </div>
            ) : (
              <div id="sheets-offline-header-badge" className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-[#141414] border border-[#222] text-gray-500 text-[10px] sm:text-xs font-medium">
                <CloudOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="max-w-[70px] sm:max-w-[150px] truncate">Ngoại tuyến</span>
              </div>
            )}

            <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500/40 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Hệ thống trực tuyến</span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 py-1.5 px-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-955/20 border border-rose-900/35 hover:bg-rose-955/40 text-rose-450 text-[10px] sm:text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title="Đăng xuất khỏi phiên làm việc"
            >
              <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Stage viewport */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Google Sheets Always Connect banner */}
        {!gAppsScriptUrl && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-950/20 border border-amber-900/40 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse-subtle"
          >
            <div className="flex items-start gap-3">
              <div className="bg-amber-500/10 text-amber-400 p-2.5 rounded-xl border border-amber-800/25 mt-0.5">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Chưa liên kết Google Sheets</h3>
                <p className="text-amber-400/80 text-xs mt-1 leading-relaxed max-w-2xl">
                  Để bảo toàn dữ liệu chi tiêu lâu dài và chia sẻ cùng các liên kết Messenger, hãy cấu hình liên kết Bảng tính Google Sheets. Ứng dụng sẽ đồng bộ mọi cập nhật trực tiếp lên Drive của bạn!
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("settings")}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Database className="w-3.5 h-3.5" /> Kết nối Google Sheets
            </button>
          </motion.div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex border border-[#222] overflow-x-auto whitespace-nowrap scrollbar-none gap-1 bg-[#0F0F0F] p-1.5 rounded-xl shadow-lg">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-[#1A1A1A] text-white border border-emerald-900/30 shadow-inner"
                : "text-gray-400 hover:text-white hover:bg-[#141414]"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Tổng quan & AI Cố vấn
          </button>

          <button
            id="tab-expenses"
            onClick={() => setActiveTab("expenses")}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === "expenses"
                ? "bg-[#1A1A1A] text-white border border-emerald-900/30 shadow-inner"
                : "text-gray-400 hover:text-white hover:bg-[#141414]"
            }`}
          >
            <Receipt className="w-4 h-4" /> Nhật ký chi tiêu
          </button>

          <button
            id="tab-settlement"
            onClick={() => setActiveTab("settlement")}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === "settlement"
                ? "bg-[#1A1A1A] text-white border border-emerald-900/30 shadow-inner"
                : "text-gray-400 hover:text-white hover:bg-[#141414]"
            }`}
          >
            <RefreshCw className="w-4 h-4" /> Chia tiền hàng tháng
          </button>

          <button
            id="tab-members"
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === "members"
                ? "bg-[#1A1A1A] text-white border border-emerald-900/30 shadow-inner"
                : "text-gray-400 hover:text-white hover:bg-[#141414]"
            }`}
          >
            <UserCheck className="w-4 h-4" /> Thành viên gia đình
          </button>

          <button
            id="tab-settings"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === "settings"
                ? "bg-[#1A1A1A] text-white border border-emerald-900/30 shadow-inner"
                : "text-gray-400 hover:text-white hover:bg-[#141414]"
            }`}
          >
            <Sliders className="w-4 h-4" /> Cấu hình API Messenger
          </button>
        </div>

        {/* View switching panel wrapper wrapping motion transitions */}
        <div className="relative min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
              >
                <Dashboard members={members} expenses={expenses} />
              </motion.div>
            )}

            {activeTab === "expenses" && (
              <motion.div
                key="expenses"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                <div className="lg:col-span-5">
                  <ExpenseForm members={members} onAddExpense={handleAddExpense} />
                </div>
                <div className="lg:col-span-7">
                  <ExpenseList 
                    expenses={expenses} 
                    members={members} 
                    onDeleteExpense={handleDeleteExpense} 
                  />
                </div>
              </motion.div>
            )}

            {activeTab === "settlement" && (
              <motion.div
                key="settlement"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
              >
                <SettlementView 
                  members={members} 
                  expenses={expenses} 
                  payments={payments}
                  onAddPayment={handleAddPayment}
                  onDeletePayment={handleDeletePayment}
                  pageAccessToken={pageAccessToken}
                  pageId={pageId}
                  showToast={showToast}
                />
              </motion.div>
            )}

            {activeTab === "members" && (
              <motion.div
                key="members"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
              >
                <MemberManager 
                  members={members} 
                  onUpdateMember={handleUpdateMember} 
                  onAddMember={handleAddMember}
                  onDeleteMember={handleDeleteMember}
                />
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
              >
                <Settings 
                  members={members} 
                  expenses={expenses} 
                  payments={payments}
                  pageAccessToken={pageAccessToken}
                  pageId={pageId}
                  onSaveFbConfig={handleSaveFbConfig}
                  onImportData={handleImportData}
                  gAppsScriptUrl={gAppsScriptUrl}
                  setGAppsScriptUrl={setGAppsScriptUrl}
                  sheetsSyncStatus={sheetsSyncStatus}
                  setSheetsSyncStatus={setSheetsSyncStatus}
                  sheetsSyncMessage={sheetsSyncMessage}
                  setSheetsSyncMessage={setSheetsSyncMessage}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Humble Footer credits */}
      <footer className="bg-[#0F0F0F] border-t border-[#222] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-xs text-gray-500 font-medium font-sans">
            © 2026 Sổ Chi Tiêu Gia Đình • Hỗ trợ hoàn hảo cho việc vun đắp mái ấm gia đình.
          </p>
          <p className="text-[10px] text-gray-600">
            Powered by Google Gemini 3.5-flash & Meta Graph API Send.
          </p>
        </div>
      </footer>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#121212]/95 border border-[#222] backdrop-blur-md px-4 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              toast.type === "success" 
                ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20" 
                : toast.type === "error" 
                ? "bg-rose-500/10 text-rose-450 border border-rose-500/20" 
                : "bg-blue-500/10 text-blue-450 border border-blue-500/20"
            }`}>
              {toast.type === "success" ? (
                <Check className="w-4.5 h-4.5" />
              ) : toast.type === "error" ? (
                <AlertCircle className="w-4.5 h-4.5" />
              ) : (
                <Info className="w-4.5 h-4.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white leading-tight">
                {toast.type === "success" ? "Thành công" : toast.type === "error" ? "Lỗi" : "Thông báo"}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-normal truncate">
                {toast.message}
              </p>
            </div>
            <button 
              onClick={() => setToast(null)} 
              className="text-gray-500 hover:text-white p-1 cursor-pointer transition-colors text-xs font-bold"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
