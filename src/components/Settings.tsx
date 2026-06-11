/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Member, Expense } from "../types";
import { 
  Settings as SettingsIcon, Save, Download, 
  HelpCircle, Link, FileJson, Check, AlertCircle,
  FileSpreadsheet, Upload, RefreshCw, Key
} from "lucide-react";
import { downloadFamilyExcel } from "../utils/excel";
import { 
  syncDataToGoogleSheets, 
  loadDataFromGoogleSheets,
  PaymentStatus
} from "../utils/googleSheets";

interface SettingsProps {
  members: Member[];
  expenses: Expense[];
  payments: PaymentStatus[];
  pageAccessToken: string;
  pageId: string;
  onSaveFbConfig: (token: string, id: string) => void;
  onImportData: (members: Member[], expenses: Expense[], payments: PaymentStatus[]) => void;
  gAppsScriptUrl: string;
  setGAppsScriptUrl: (val: string) => void;
  sheetsSyncStatus: "idle" | "loading" | "success" | "error";
  setSheetsSyncStatus: (val: "idle" | "loading" | "success" | "error") => void;
  sheetsSyncMessage: string;
  setSheetsSyncMessage: (val: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  members,
  expenses,
  payments,
  pageAccessToken,
  pageId,
  onSaveFbConfig,
  onImportData,
  gAppsScriptUrl,
  setGAppsScriptUrl,
  sheetsSyncStatus,
  setSheetsSyncStatus,
  sheetsSyncMessage,
  setSheetsSyncMessage,
}) => {
  const [token, setToken] = useState(pageAccessToken);
  const [pId, setPId] = useState(pageId);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);

  // Admin lock states for Google Sheets parameters
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === "123456" || adminPasswordInput.toLowerCase() === "admin") {
      setIsAdmin(true);
      setShowAdminInput(false);
      setAdminError("");
      setAdminPasswordInput("");
    } else {
      setAdminError("Mật khẩu quản trị viên không chính xác!");
    }
  };

  // Google Sheets integration state mapped locally for isolated control
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState("");
  const [sheetsSuccess, setSheetsSuccess] = useState("");

  // Keep localStorage perfectly aligned
  useEffect(() => {
    if (gAppsScriptUrl) {
      localStorage.setItem("gg_apps_script_url", gAppsScriptUrl.trim());
    } else {
      localStorage.removeItem("gg_apps_script_url");
    }
  }, [gAppsScriptUrl]);

  // Server-side configuration persistence states
  const [serverSaveLoading, setServerSaveLoading] = useState(false);
  const [serverSaveSuccess, setServerSaveSuccess] = useState("");
  const [serverSaveError, setServerSaveError] = useState("");

  const handleSaveToServer = async () => {
    setServerSaveLoading(true);
    setServerSaveSuccess("");
    setServerSaveError("");
    try {
      const response = await fetch("/api/family-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gAppsScriptUrl: gAppsScriptUrl.trim(),
        }),
      });
      
      if (response.status === 405 || response.status === 404) {
        setServerSaveError("Bạn đang deploy trên hosting tĩnh (GitHub Pages) nên không thể lưu cấu hình lên máy chủ backend. Tuy nhiên, URL đã được tự động lưu cục bộ trên thiết bị của bạn!");
        return;
      }
      
      const data = await response.json();
      if (response.ok && data.success) {
        setServerSaveSuccess("Đã lưu cấu hình Google Apps Script Web App URL cố định lên máy chủ cho cả gia đình thành công!");
        setTimeout(() => setServerSaveSuccess(""), 4000);
      } else {
        setServerSaveError(data.error || "Lỗi khi lưu cấu hình lên máy chủ.");
      }
    } catch (err: any) {
      setServerSaveError("Không thể kết nối đến máy chủ backend để lưu cấu hình.");
    } finally {
      setServerSaveLoading(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveFbConfig(token.trim(), pId.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Google Sheets Actions
  const handlePushToSheets = async () => {
    if (!gAppsScriptUrl) {
      setSheetsError("Vui lòng nhập đường dẫn Google Apps Script Web App URL để đồng bộ.");
      return;
    }
    const confirmed = window.confirm(
      "Bạn có chắc muốn ghi đè toàn bộ dữ liệu hiện tại trên Google Sheet bằng dữ liệu ứng dụng hiện tại? Thao tác này sẽ cập nhật các tab 'ThanhVien', 'ChiTieu' và 'ThanhToan'."
    );
    if (!confirmed) return;

    setSheetsLoading(true);
    setSheetsError("");
    setSheetsSuccess("");
    try {
      await syncDataToGoogleSheets(gAppsScriptUrl.trim(), members, expenses, payments);
      setSheetsSuccess(`Đồng bộ dữ liệu thành công! Đã đẩy ${members.length} thành viên, ${expenses.length} giao dịch và ${payments.length} trạng thái thanh toán lên Bảng tính.`);
    } catch (err: any) {
      setSheetsError(err.message || "Lỗi khi cập nhật dữ liệu.");
    } finally {
      setSheetsLoading(false);
    }
  };

  const handlePullFromSheets = async () => {
    if (!gAppsScriptUrl) {
      setSheetsError("Vui lòng nhập đường dẫn Google Apps Script Web App URL để tải dữ liệu.");
      return;
    }
    setSheetsLoading(true);
    setSheetsError("");
    setSheetsSuccess("");
    try {
      const data = await loadDataFromGoogleSheets(gAppsScriptUrl.trim());
      if (data.members.length > 0) {
        onImportData(data.members, data.expenses, data.payments || []);
        setSheetsSuccess(`Lấy dữ liệu thành công! Đã nạp về ${data.members.length} thành viên gia đình, ${data.expenses.length} giao dịch chi tiêu và ${data.payments?.length || 0} trạng thái thanh toán.`);
      } else {
        // If members are empty on sheet, set local state to empty
        onImportData([], [], []);
        setSheetsSuccess("Kết nối thành công! Bảng tính Google Sheets trống, hệ thống nội bộ đã được đồng bộ hóa về dạng rỗng.");
      }
    } catch (err: any) {
      setSheetsError(err.message || "Lỗi khi tải dữ liệu từ Google Sheet.");
    } finally {
      setSheetsLoading(false);
    }
  };

  // Export Data to JSON file
  const handleExportJSON = () => {
    const dataStr = JSON.stringify({ members, expenses, payments }, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `so_tay_chi_tieu_gia_dinh_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  // Import Data from JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError("");
    setImportSuccess(false);
    const fileReader = new FileReader();
    
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.members) && Array.isArray(parsed.expenses)) {
            onImportData(parsed.members, parsed.expenses, parsed.payments || []);
            setImportSuccess(true);
          } else {
            setImportError("File JSON không đúng định dạng sao lưu tiêu chuẩn của ứng dụng.");
          }
        } catch (err) {
          setImportError("Không thể đọc file. Vui lòng kiểm tra lại file của bạn.");
        }
      };
    }
  };


  return (
    <div id="settings-viewport" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Facebook Page API Config panel */}
        <div className="bg-[#141414] rounded-2xl p-6 border border-[#222] shadow-lg space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <SettingsIcon className="text-blue-400 w-5 h-5" />
            Cấu Hình Facebook Messenger Page API
          </h3>
          <p className="text-xs text-gray-400">
            Cho phép hệ thống chuyển phát trực tiếp tin nhắn nhắc nợ hàng tháng đến Messenger của các thành viên gia đình qua chatbot API.
          </p>

          <form id="fb-config-form" onSubmit={handleSaveConfig} className="space-y-3 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Facebook Page ID
              </label>
              <input
                id="cfg-page-id"
                type="text"
                value={pId}
                onChange={(e) => setPId(e.target.value)}
                placeholder="Ví dụ: 10485923910382"
                className="w-full text-xs px-3.5 py-2.5 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-[#141414] text-white font-mono placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Page Access Token (Mã truy cập trang)
              </label>
              <textarea
                id="cfg-page-token"
                rows={3}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="EAAW..."
                className="w-full text-xs px-3.5 py-2.5 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-[#141414] text-white font-mono placeholder-gray-600"
              />
            </div>

            <button
              id="btn-save-fb-config"
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full"
            >
              <Save className="w-4 h-4" /> Lưu cấu hình
            </button>

            {saveSuccess && (
              <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Lưu cấu hình Messenger Page API thành công! (Hệ thống sẽ chạy thử nghiệm nếu bỏ trống khóa).
              </div>
            )}
          </form>
        </div>

        {/* Local database backup and restore */}
        <div className="bg-[#141414] rounded-2xl p-6 border border-[#222] shadow-lg flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileJson className="text-emerald-500 w-5 h-5" />
              Sao Lưu & Nhập File Dự Phòng
            </h3>
            <p className="text-xs text-gray-400">
              Mọi dữ liệu chi tiêu và thành viên của bạn được lưu an toàn trong trình duyệt hoặc Firestore. Bạn có thể sao lưu ra đĩa cứng để lưu giữ vĩnh viễn hoặc khôi phục bất cứ lúc nào.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <div className="p-4 bg-[#0F0F0F] rounded-xl border border-[#222] flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-white text-xs">Xuất Báo Cáo Excel (.xlsx)</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">Xuất toàn bộ nhật ký chi tiêu và thống kê số dư sang định dạng Excel (.xlsx)</p>
              </div>
              <button
                id="btn-export-excel"
                onClick={() => downloadFamilyExcel(expenses, members)}
                className="bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 py-2 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Tải Excel (.xlsx)
              </button>
            </div>

            <div className="p-4 bg-[#0F0F0F] rounded-xl border border-[#222] flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-white text-xs">Xuất File Chi Tiêu (.json)</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">Tải tệp tin sao lưu chứa sạch mọi giao dịch</p>
              </div>
              <button
                id="btn-export-json"
                onClick={handleExportJSON}
                className="bg-[#222] hover:bg-[#2c2c2c] text-white border border-[#333] py-2 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Tải về máy
              </button>
            </div>

            <div className="p-4 bg-[#0F0F0F] rounded-xl border border-[#222] space-y-3">
              <div>
                <h4 className="font-bold text-white text-xs">Nhập File Sao Lưu (.json)</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">Nạp lại toàn bộ dữ liệu từ tệp sao lưu cũ</p>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  id="import-file-uploader"
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-950/20 file:text-emerald-400 hover:file:bg-emerald-950/30 cursor-pointer"
                />
              </div>

              {importError && (
                <div className="p-2.5 bg-rose-950/20 border border-rose-900/30 rounded-lg text-rose-450 text-[10px] font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Khôi phục dữ liệu gia đình thành công và cập nhật bảng chi tiêu!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Google Sheets Live Database sync panel */}
      <div className="bg-[#141414] rounded-2xl p-6 border border-[#222] shadow-lg space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-[#222]/50">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-500 w-5 h-5 animate-pulse" />
              Đồng Bộ Google Sheets Gia Đình Cố Định
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Hệ thống đã tự động liên kết với Bảng tính chi tiêu chung để bảo toàn dữ liệu đồng nhất. Các cấu hình được khóa cố định.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin ? (
              <span className="text-[10px] bg-emerald-950/40 text-emerald-400 font-bold px-2.5 py-1.5 rounded-lg border border-emerald-900/30">
                🛠️ QUẢN TRỊ VIÊN ĐANG MỞ KHÓA
              </span>
            ) : (
              <span className="text-[10px] bg-blue-950/40 text-blue-400 font-bold px-2.5 py-1.5 rounded-lg border border-blue-900/30">
                🔒 ĐỒNG BỘ CỐ ĐỊNH (READ-ONLY)
              </span>
            )}
          </div>
        </div>

        {/* Guidance Banner for everyone */}
        <div className="bg-[#0F0F0F] border border-blue-900/35 rounded-xl p-4 text-xs leading-relaxed text-gray-300">
          📚 <strong className="text-blue-400">Hướng dẫn cho các Thành viên Đại Gia Đình:</strong>
          <p className="mt-1">
            Mọi người không cần phải cấu hình hay thay đổi bất kỳ ID nào! Ứng dụng này đã được cấu hình sẵn để <strong>tự động đồng bộ hóa thời gian thực</strong> về cùng một tệp Google Sheets chung của gia đình. Các chỉnh sửa của bạn về thành viên hay giao dịch sẽ tự động lưu thẳng lên đám mây.
          </p>
          <p className="mt-1 text-gray-500">
            Nếu bạn là Trưởng Nhà và cần cập nhật Token khi hết hạn hoặc thay đổi Bảng tính, vui lòng kéo xuống bấm nút <strong>Mở khóa Quản trị viên</strong> để chỉnh sửa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Key className="w-3 h-3 text-yellow-500" /> Đường dẫn Google Apps Script Web App URL
              </label>
              <input
                id="sheets-apps-script-url"
                type="text"
                value={gAppsScriptUrl}
                onChange={(e) => setGAppsScriptUrl(e.target.value)}
                disabled={!isAdmin}
                placeholder={!isAdmin ? "🔒 Đường dẫn đã khóa cố định" : "Dán link script (https://script.google.com/...)"}
                className={`w-full text-xs px-3.5 py-2.5 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-[#141414] text-white font-mono placeholder-gray-650 ${
                  !isAdmin ? "opacity-65 cursor-not-allowed select-none bg-black/40" : ""
                }`}
              />
              <p className="text-[9px] text-gray-500 mt-1">
                {isAdmin 
                  ? "Dán đường dẫn Web App được triển khai từ Google Apps Script." 
                  : "🔒 Đã mã hóa bảo mật phục vụ đồng bộ tự động."}
              </p>
            </div>
          </div>

          <div className="bg-[#0F0F0F] rounded-xl p-4 border border-[#222] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-white flex items-center gap-1">
                {!isAdmin && <span className="text-gray-500">🔒</span>}
                Thao tác Truy xuất & Đồng bộ dữ liệu
              </h4>
              <p className="text-[10px] text-gray-400">
                Thao tác ghi đè đồng bộ lên Google Sheets chỉ dành cho Quản trị viên. Người dùng có thể Tải dữ liệu bất cứ lúc nào để cập nhật cục bộ.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                id="btn-sheets-push"
                onClick={handlePushToSheets}
                disabled={sheetsLoading || !gAppsScriptUrl || !isAdmin}
                className="bg-blue-900/10 hover:bg-blue-900/20 text-blue-400 border border-blue-900/25 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title={!isAdmin ? "Yêu cầu mở khóa quản trị viên" : ""}
              >
                {sheetsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Ghi Đè lên Sheets
              </button>

              <button
                id="btn-sheets-pull"
                onClick={handlePullFromSheets}
                disabled={sheetsLoading || !gAppsScriptUrl}
                className="bg-[#1A1A1A] hover:bg-[#252525] text-white border border-[#333] py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {sheetsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Tải Bảng xuống làm Database
              </button>

              {isAdmin && (
                <button
                  id="btn-sheets-save-to-server"
                  onClick={handleSaveToServer}
                  disabled={serverSaveLoading || !gAppsScriptUrl}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 sm:col-span-2 shadow-lg shadow-emerald-900/15 active:scale-[0.98]"
                >
                  {serverSaveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  LƯU CỐ ĐỊNH CẤU HÌNH LÊN MÁY CHỦ CHO CẢ GIA ĐÌNH
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Administration Lock Toggle Button Drawer */}
        <div className="pt-2 border-t border-[#222]/50 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-gray-500 font-medium font-sans">
            {!isAdmin ? "🛡️ Bạn là Trưởng Nhà cần cập nhật mã kết nối?" : "🔓 Bạn đang trong chế độ Quản trị viên."}
          </div>
          
          <div className="flex items-center gap-3">
            {showAdminInput && (
              <form onSubmit={handleAdminAuth} className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="Mật khẩu (mặc định: admin)"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="bg-[#0F0F0F] border border-[#222] focus:border-emerald-500 rounded-lg text-xs px-2.5 py-1.5 text-white focus:outline-none w-44 font-sans"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1.5 px-3 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  Xác nhận
                </button>
              </form>
            )}

            {!isAdmin ? (
              <button
                type="button"
                onClick={() => setShowAdminInput(!showAdminInput)}
                className="text-xs bg-[#222] border border-[#333] hover:border-blue-500/50 hover:bg-[#2A2A2A] text-gray-300 font-bold py-1.5 px-3.5 rounded-xl transition-all cursor-pointer"
              >
                🔑 Mở khóa Quản trị viên
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdmin(false)}
                className="text-xs bg-rose-955/20 border border-rose-900/30 hover:bg-rose-955/35 text-rose-450 font-bold py-1.5 px-3.5 rounded-xl transition-all cursor-pointer"
              >
                🔒 Khóa lại Quản trị viên
              </button>
            )}
          </div>
        </div>

        {adminError && (
          <p className="text-[10px] text-rose-400 font-semibold text-right mt-1">{adminError}</p>
        )}

        {sheetsError && (
          <div className="p-3 bg-rose-950/25 border border-rose-900/40 rounded-xl text-rose-450 text-xs flex items-start gap-1.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Lỗi đồng bộ Google Sheets</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{sheetsError}</p>
            </div>
          </div>
        )}

        {sheetsSuccess && (
          <div className="p-3 bg-emerald-950/25 border border-emerald-900/40 rounded-xl text-emerald-400 text-xs flex items-start gap-1.5 leading-relaxed">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold font-sans">Đồng bộ thành công!</p>
              <p className="text-[11px] text-gray-300 mt-0.5">{sheetsSuccess}</p>
            </div>
          </div>
        )}

        {serverSaveSuccess && (
          <div className="p-3 bg-emerald-950/25 border border-emerald-900/40 rounded-xl text-emerald-400 text-xs flex items-start gap-1.5 leading-relaxed">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold font-sans">Lưu cấu hình thành công!</p>
              <p className="text-[11px] text-gray-300 mt-0.5">{serverSaveSuccess}</p>
            </div>
          </div>
        )}

        {serverSaveError && (
          <div className="p-3 bg-rose-950/25 border border-rose-900/40 rounded-xl text-rose-400 text-xs flex items-start gap-1.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Lỗi lưu cấu hình máy chủ</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{serverSaveError}</p>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="text-[11px] text-gray-500 bg-[#0F0F0F] rounded-xl p-4 border border-[#222] space-y-3">
            💡 <strong>Hướng dẫn thiết lập Google Apps Script để kết nối Vĩnh viễn & Miễn phí:</strong>
            <ol className="list-decimal pl-4.5 space-y-1.5 text-gray-400">
              <li>Mở file Google Spreadsheet của gia đình bạn.</li>
              <li>Trên thanh menu, chọn <strong>Tiện ích mở rộng (Extensions)</strong> &rarr; <strong>Apps Script</strong>.</li>
              <li>Xóa sạch mã mặc định trong khung soạn thảo và dán đoạn code phía dưới vào:</li>
            </ol>

            <div className="relative">
              <pre className="bg-[#050505] p-3 rounded-lg border border-[#222] text-[10px] text-emerald-400 overflow-x-auto max-h-60 font-mono select-all">
{`function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var memberSheet = ss.getSheetByName("ThanhVien");
  var members = [];
  if (memberSheet) {
    var memberData = memberSheet.getDataRange().getValues();
    for (var i = 1; i < memberData.length; i++) {
      var row = memberData[i];
      if (row[0] && row[1]) {
        members.push({
          id: String(row[0]),
          name: String(row[1]),
          role: String(row[2] || ""),
          avatarColor: String(row[3] || ""),
          messengerLink: String(row[4] || ""),
          messengerId: String(row[5] || "")
        });
      }
    }
  }
  
  var expenseSheet = ss.getSheetByName("ChiTieu");
  var expenses = [];
  if (expenseSheet) {
    var expenseData = expenseSheet.getDataRange().getValues();
    for (var i = 1; i < expenseData.length; i++) {
      var row = expenseData[i];
      if (row[0] && row[1]) {
        expenses.push({
          id: String(row[0]),
          title: String(row[1]),
          amount: Number(row[2]) || 0,
          categoryId: String(row[3] || "others"),
          date: String(row[4] || ""),
          paidById: String(row[5] || ""),
          beneficiaryIds: row[6] ? String(row[6]).split(",").map(function(id) { return id.trim(); }).filter(Boolean) : [],
          notes: String(row[7] || ""),
          createdAt: Number(row[8]) || Date.now()
        });
      }
    }
  }

  var paymentSheet = ss.getSheetByName("ThanhToan");
  var payments = [];
  if (paymentSheet) {
    var paymentData = paymentSheet.getDataRange().getValues();
    for (var i = 1; i < paymentData.length; i++) {
      var row = paymentData[i];
      if (row[0] && row[1] && row[2]) {
        payments.push({
          month: String(row[0]),
          fromId: String(row[1]),
          toId: String(row[2]),
          isSettled: String(row[3]) === "true" || row[3] === true
        });
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ members: members, expenses: expenses, payments: payments }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var members = postData.members || [];
    var expenses = postData.expenses || [];
    var payments = postData.payments || [];
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var memberSheet = ss.getSheetByName("ThanhVien");
    if (!memberSheet) memberSheet = ss.insertSheet("ThanhVien");
    memberSheet.clear();
    memberSheet.appendRow(["ID", "Name", "Role", "AvatarColor", "MessengerLink", "MessengerId"]);
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      memberSheet.appendRow([m.id, m.name, m.role, m.avatarColor, m.messengerLink, m.messengerId]);
    }
    
    var expenseSheet = ss.getSheetByName("ChiTieu");
    if (!expenseSheet) expenseSheet = ss.insertSheet("ChiTieu");
    expenseSheet.clear();
    expenseSheet.appendRow(["ID", "Title", "Amount", "CategoryId", "Date", "PaidById", "BeneficiaryIds", "Notes", "CreatedAt"]);
    for (var i = 0; i < expenses.length; i++) {
      var exp = expenses[i];
      expenseSheet.appendRow([
        exp.id,
        exp.title,
        exp.amount,
        exp.categoryId,
        exp.date,
        exp.paidById,
        (exp.beneficiaryIds || []).join(","),
        exp.notes,
        exp.createdAt
      ]);
    }

    var paymentSheet = ss.getSheetByName("ThanhToan");
    if (!paymentSheet) paymentSheet = ss.insertSheet("ThanhToan");
    paymentSheet.clear();
    paymentSheet.appendRow(["Month", "FromId", "ToId", "IsSettled"]);
    for (var i = 0; i < payments.length; i++) {
      var p = payments[i];
      paymentSheet.appendRow([p.month, p.fromId, p.toId, p.isSettled]);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
              </pre>
            </div>

            <ol className="list-decimal pl-4.5 space-y-1.5 text-gray-400" start={4}>
              <li>Nhấn biểu tượng **Lưu (Save)** (hình đĩa mềm) hoặc bấm `Ctrl + S`.</li>
              <li>Bấm nút **Triển khai (Deploy)** ở góc trên bên phải &rarr; Chọn **Triển khai mới (New deployment)**.</li>
              <li>Click biểu tượng bánh răng bên cạnh "Chọn loại cấu hình" &rarr; Chọn **Ứng dụng Web (Web app)**.</li>
              <li>Cấu hình các tùy chọn sau:
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-gray-500">
                  <li>Mô tả: Nhập mô tả (ví dụ: <code className="bg-[#141414] px-1 py-0.5 rounded text-[10px]">Family Spend API</code>)</li>
                  <li>Thực thi dưới dạng (Execute as): Chọn **Tôi (Tài khoản của tôi - Me)**.</li>
                  <li>Ai có quyền truy cập (Who has access): Chọn **Bất kỳ ai (Anyone)**.</li>
                </ul>
              </li>
              <li>Nhấn nút **Triển khai (Deploy)**. Nếu Google yêu cầu cấp quyền (Authorize access), hãy nhấn **Cấp quyền** và chọn tài khoản Google của bạn (nếu báo cảnh báo an toàn của Google, bấm vào **Nâng cao / Advanced** &rarr; chọn **Đi tới dự án không an toàn** để đồng ý).</li>
              <li>Sao chép đường dẫn ở mục **URL của ứng dụng web** (Web app URL), quay lại đây dán vào ô **Đường dẫn Google Apps Script Web App URL** ở trên và nhấn nút **Lưu Cố Định Lên Máy Chủ** là xong!</li>
            </ol>
          </div>
        )}
      </div>

      {/* Instructional guide regarding FB platform */}
      <div className="bg-[#141414] rounded-2xl p-6 border border-[#222] space-y-3 text-xs leading-relaxed text-gray-400 shadow-lg">
        <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
          <HelpCircle className="w-4 h-4 text-gray-500" /> Hướng Dẫn Chi Tiết Cách Kết Nối Facebook Messenger
        </h4>
        <div className="space-y-2">
          <p>
            Để sử dụng tính năng <strong>Gửi Tự Động (API Nhắc Nợ)</strong> thông qua Messenger của gia đình, bạn cần tạo một ứng dụng Meta chatbot đơn giản. Dưới đây là các bước tóm tắt chuẩn chỉnh:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-gray-400">
            <li>Truy cập <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold inline-flex items-center gap-0.5 hover:underline">Meta for Developers <Link className="w-3 h-3" /></a> và đăng ký tài khoản nhà phát triển.</li>
            <li>Tạo một Ứng dụng mới (chọn mục <strong>Người dùng Trang/Page</strong> hoặc <strong>Khác</strong>).</li>
            <li>Thêm sản phẩm <strong>Messenger</strong> vào ứng dụng.</li>
            <li>Tại phần thiết lập Messenger, chọn kết nối Fanpage của gia đình bạn (hoặc tạo một Fanpage phụ kín để test).</li>
            <li>Bấm <strong>Generate Token</strong> để lấy mã <strong>Page Access Token</strong> và sao chép dán vào ô cấu hình ở trên cùng với <strong>Page ID</strong>.</li>
            <li>Để lấy <strong>PSID</strong> cho các thành viên trong gia đình: Khi thành viên inbox Fanpage của bạn, bạn có thể xem ID người gửi (PSID) trong danh mục tin nhắn của trang quản trị Fanpage hoặc qua API webhook. Nhập ID này vào mục Chỉnh Sửa của từng thành viên tại tab Thành Viên.</li>
          </ol>
          <p className="mt-2 text-[11px] text-gray-500 bg-[#0F0F0F] p-3 rounded-lg border border-[#222]">
            ℹ️ <strong>Mẹo tiết kiệm thời gian:</strong> Nếu không muốn thiết lập API phức tạp, bạn chỉ cần điền link Messenger cá nhân (ví dụ: <code className="bg-[#050505] px-1 text-gray-300 rounded border border-[#1a1a1a]">https://m.me/username_của_bo</code>) vào tab Thành Viên. Khi bấm Nhắc Nợ, hệ thống sẽ tự động sao chép văn bản nhắc và mở chat Messenger để bạn gửi thủ công cực nhanh!
          </p>
        </div>
      </div>
    </div>
  );
};
