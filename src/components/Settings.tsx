import React, { useState } from "react";
import { Member, Expense } from "../types";
import { 
  Settings as SettingsIcon, Save, Download, 
  HelpCircle, Link, FileJson, Check, AlertCircle,
  FileSpreadsheet
} from "lucide-react";
import { downloadFamilyExcel } from "../utils/excel";
import { PaymentStatus } from "../utils/googleSheets";

interface SettingsProps {
  members: Member[];
  expenses: Expense[];
  payments: PaymentStatus[];
  pageAccessToken: string;
  pageId: string;
  onSaveFbConfig: (token: string, id: string) => void;
  onImportData: (members: Member[], expenses: Expense[], payments: PaymentStatus[]) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  members,
  expenses,
  payments,
  pageAccessToken,
  pageId,
  onSaveFbConfig,
  onImportData,
}) => {
  const [token, setToken] = useState(pageAccessToken);
  const [pId, setPId] = useState(pageId);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(() => {
    return localStorage.getItem("google_sheets_apps_script_url") || "";
  });
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState("");

  const handleSaveSheetUrl = (url: string) => {
    setSheetUrl(url);
    localStorage.setItem("google_sheets_apps_script_url", url);
  };

  const handleGoogleSheetSync = async () => {
    if (!sheetUrl.trim()) {
      setSyncError("Vui lòng cấu hình URL Google Apps Script Web App trước.");
      return;
    }
    setSyncLoading(true);
    setSyncError("");
    setSyncSuccess(false);

    try {
      const response = await fetch(sheetUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({ members, expenses, payments }),
      });
      const data = await response.json();
      if (data && data.success) {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 4000);
      } else {
        setSyncError(data.error || "Giao thức Google Apps Script trả lỗi không xác định.");
      }
    } catch (err: any) {
      setSyncError("Lỗi kết nối hoặc chặn CORS. Hãy đảm bảo Apps Script của bạn được triển khai đúng quyền truy cập cho 'Bất kỳ ai' (Anyone).");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveFbConfig(token.trim(), pId.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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

          {/* Google Sheets Sync panel */}
          <div className="bg-[#141414] rounded-2xl p-6 border border-[#222] shadow-lg space-y-4 col-span-1 lg:col-span-2 mt-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-500 w-5 h-5" />
              Đồng Bộ Dữ Liệu Lên Google Sheets
            </h3>
            <p className="text-xs text-gray-400">
              Xuất dữ liệu chi tiêu trực tiếp sang Google Spreadsheet trực tuyến thông qua Google Apps Script Web App cá nhân của bạn.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Google Apps Script Web App URL
                </label>
                <input
                  id="cfg-sheet-url"
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => handleSaveSheetUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full text-xs px-3.5 py-2.5 bg-[#0F0F0F] border border-[#222] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-[#141414] text-white font-mono placeholder-gray-650"
                />
              </div>

              <div className="flex gap-2">
                <button
                  id="btn-sync-sheets"
                  onClick={handleGoogleSheetSync}
                  disabled={syncLoading || !sheetUrl}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer flex-1"
                >
                  {syncLoading ? "Đang đồng bộ..." : "Đồng bộ lên Google Sheets"}
                </button>
              </div>

              {syncSuccess && (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Đồng bộ dữ liệu lên Google Sheets thành công!
                </div>
              )}

              {syncError && (
                <div className="p-2.5 bg-rose-950/20 border border-rose-900/30 rounded-lg text-rose-400 text-[10px] font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {syncError}
                </div>
              )}
            </div>
          </div>
        </div>
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

      {/* Instructional guide regarding Google Sheets platform */}
      <div className="bg-[#141414] rounded-2xl p-6 border border-[#222] space-y-3 text-xs leading-relaxed text-gray-400 shadow-lg">
        <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
          <HelpCircle className="w-4 h-4 text-emerald-500" /> Hướng Dẫn Chi Tiết Cách Kết Nối Google Sheets
        </h4>
        <div className="space-y-2">
          <p>
            Để sử dụng tính năng <strong>Đồng Bộ Lên Google Sheets</strong>, bạn có thể tạo một dự án script nhỏ trong trang tính của mình. Các bước như sau:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-gray-400">
            <li>Tạo một file Google Sheets mới hoặc mở file có sẵn của bạn.</li>
            <li>Tại thanh menu, chọn <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
            <li>Xóa toàn bộ mã mặc định và dán đoạn code sau vào dự án:</li>
          </ol>
          <pre className="bg-[#050505] p-3 rounded-lg border border-[#222] text-[10px] text-gray-300 font-mono overflow-x-auto whitespace-pre select-text">
{`function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Ghi Thành Viên
    var sheetMembers = doc.getSheetByName("ThanhVien") || doc.insertSheet("ThanhVien");
    sheetMembers.clear();
    sheetMembers.appendRow(["ID", "Tên", "Vai trò", "Messenger Link", "Messenger ID"]);
    payload.members.forEach(function(m) {
      sheetMembers.appendRow([m.id, m.name, m.role, m.messengerLink || "", m.messengerId || ""]);
    });
    
    // 2. Ghi Chi Tiêu
    var sheetExpenses = doc.getSheetByName("ChiTieu") || doc.insertSheet("ChiTieu");
    sheetExpenses.clear();
    sheetExpenses.appendRow(["ID", "Ngày", "Hạng mục", "Nội dung", "Số tiền", "Người trả", "Hưởng thụ", "Ghi chú"]);
    payload.expenses.forEach(function(exp) {
      sheetExpenses.appendRow([
        exp.id, 
        exp.date, 
        exp.categoryId, 
        exp.title, 
        exp.amount, 
        exp.paidById, 
        exp.beneficiaryIds.join(","), 
        exp.notes || ""
      ]);
    });
    
    // 3. Ghi Thanh Toán
    var sheetPayments = doc.getSheetByName("ThanhToan") || doc.insertSheet("ThanhToan");
    sheetPayments.clear();
    sheetPayments.appendRow(["ID", "Tháng", "Người nợ", "Người nhận", "Số tiền", "Trạng thái", "Ngày tạo"]);
    payload.payments.forEach(function(p) {
      sheetPayments.appendRow([
        p.id, 
        p.month, 
        p.fromId, 
        p.toId, 
        p.amount, 
        p.isSettled ? "TRUE" : "FALSE", 
        p.createdAt ? new Date(p.createdAt).toISOString() : ""
      ]);
    });
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
          </pre>
          <ol className="list-decimal pl-5 space-y-1.5 text-gray-400" start={4}>
            <li>Bấm nút lưu dự án. Sau đó chọn <strong>Triển khai (Deploy)</strong> &gt; <strong>Triển khai mới (New deployment)</strong>.</li>
            <li>Tại loại triển khai, chọn hình răng cưa &gt; <strong>Ứng dụng web (Web app)</strong>.</li>
            <li>Cấu hình: <strong>Thực thi dưới dạng (Execute as): Tôi (Me)</strong> và <strong>Ai có quyền truy cập (Who has access): Bất kỳ ai (Anyone)</strong>.</li>
            <li>Bấm <strong>Triển khai (Deploy)</strong>, cấp quyền truy cập tài khoản khi được yêu cầu, sau đó copy link <strong>Web app URL</strong> dán vào phần cấu hình Google Sheets ở trên.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
