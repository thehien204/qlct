/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Member, Expense, AIInsight } from "../types";
import { getCategoryById, DEFAULT_CATEGORIES } from "../utils/categories";
import { formatVND, getCurrentMonthStr } from "../utils/settlement";
import { 
  TrendingUp, TrendingDown, DollarSign, Award, Clock, Sparkles, AlertCircle, Quote, RefreshCw
} from "lucide-react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from "recharts";

interface DashboardProps {
  members: Member[];
  expenses: Expense[];
}

export const Dashboard: React.FC<DashboardProps> = ({ members, expenses }) => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState("");

  // Filter expenses by selected month
  const monthlyExpenses = expenses.filter((e) => e.date.startsWith(selectedMonth));

  // Compute stats
  const totalSpend = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const averageSpend = members.length > 0 ? totalSpend / members.length : 0;

  // Category breakdown
  const categorySummary = DEFAULT_CATEGORIES.map((cat) => {
    const amount = monthlyExpenses
      .filter((e) => e.categoryId === cat.id)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      name: cat.name,
      value: amount,
      color: cat.color,
    };
  }).filter((c) => c.value > 0);

  // Buyer breakdown
  const buyerSummary = members.map((m) => {
    const amount = monthlyExpenses
      .filter((e) => e.paidById === m.id)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      name: m.name,
      value: amount,
      color: m.avatarColor,
    };
  });

  // Most expensive category
  const topCategory = [...categorySummary].sort((a, b) => b.value - a.value)[0];

  // Top spender
  const topSpender = [...buyerSummary].sort((a, b) => b.value - a.value)[0];

  // Daily spend trend inside selected month
  const getDaysInMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month, 0);
    return date.getDate();
  };

  const daysInMonth = getDaysInMonth();
  const dailyData = Array.from({ length: daysInMonth }, (_, idx) => {
    const dayStr = String(idx + 1).padStart(2, "0");
    const fullDate = `${selectedMonth}-${dayStr}`;
    const dailyTotal = monthlyExpenses
      .filter((e) => e.date === fullDate)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      day: `${idx + 1}`,
      "Số tiền": dailyTotal,
    };
  });

  // Local smart fallback advice generator
  const generateLocalAdvice = (expensesList: Expense[], membersList: Member[], monthStr?: string) => {
    const totalAmount = expensesList.reduce((sum, e) => sum + e.amount, 0);
    
    // Group categories
    const categoryMap: Record<string, number> = {};
    expensesList.forEach((e) => {
      categoryMap[e.categoryId] = (categoryMap[e.categoryId] || 0) + e.amount;
    });
    
    let topCategoryName = "Chi tiêu chung";
    let topCategoryAmount = 0;
    
    const DEFAULT_CATEGORIES_MAP: Record<string, string> = {
      "food": "Ăn uống & Chợ búa 🍲",
      "utilities": "Điện, Nước & Internet ⚡",
      "education": "Học tập & Giáo dục 📚",
      "shopping": "Sắm sửa & Đồ gia dụng 🛒",
      "health": "Y tế & Sức khỏe 🏥",
      "travel": "Xăng xe & Đi lại 🚗",
      "entertainment": "Vui chơi & Giải trí 🎮",
      "others": "Chi phí khác 💸"
    };
    
    Object.entries(categoryMap).forEach(([catId, amount]) => {
      if (amount > topCategoryAmount) {
        topCategoryAmount = amount;
        topCategoryName = DEFAULT_CATEGORIES_MAP[catId] || catId;
      }
    });

    const formatVNDLocal = (num: number) => {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " VND";
    };

    let summary = `Cả nhà đã cùng nhau chi tiêu tổng cộng ${formatVNDLocal(totalAmount)} trong ${monthStr ? `tháng ${monthStr.substring(5)}/${monthStr.substring(0, 4)}` : "thời gian qua"}. Hãy tiếp tục đồng lòng quản lý tài chính thật tốt nhé!`;
    if (totalAmount > 15000000) {
      summary = `Tháng này gia đình mình chi tiêu khá mặn với tổng cộng ${formatVNDLocal(totalAmount)}. Tuy nhiên nhờ cùng nhau san sẻ nên mọi gánh nặng đều nhẹ đi rất nhiều, cả nhà tuyệt vời lắm! ✨`;
    } else if (totalAmount > 0) {
      summary = `Gia đình mình chi tiêu cực kỳ khoa học và tiết kiệm với tổng số tiền ${formatVNDLocal(totalAmount)}. Hãy duy trì phong độ ấm áp và sòng phẳng này nhé! 🌸`;
    }

    let categoriesAdvice = `Khoản chi nổi bật nhất của gia đình mình là dành cho "${topCategoryName}" với tổng cộng ${formatVNDLocal(topCategoryAmount)}. Đây là nhu cầu hoàn toàn thiết thực, việc chia đều sẽ giúp các thành viên cảm giác rất thoải mái và bớt áp lực hơn.`;
    if (topCategoryAmount > 5000000) {
      categoriesAdvice = `Gia đình đang dồn lực khá lớn cho nhóm "${topCategoryName}" (${formatVNDLocal(topCategoryAmount)}). Để tối ưu, cả nhà có thể lập kế hoạch dự chi cụ thể trước mỗi tuần, ưu tiên tự nấu ăn tại nhà hoặc sắm sửa đồ gia dụng theo đợt khuyến mãi lớn để tiết giảm từ 10-15%.`;
    }

    const savingTips = `1. **Sắp xếp mua sắm sỉ**: Nên mua chung các mặt hàng gia dụng, thực phẩm khô theo lốc lớn tại siêu thị để được hưởng mức chiết khấu tốt.\n2. **Tận dụng các gói điện gia đình**: Điều chỉnh nhiệt độ điều hòa ở mức 26 độ C và tắt hẳn các thiết bị điện khi ra ngoài để tiết kiệm tối thiểu 10% hóa đơn tháng này.\n3. **Họp mặt gia đình định kỳ**: Dành khoảng 10 phút cuối tháng để cùng nhìn lại sổ tay chi tiêu này, khen ngợi thành viên tiết kiệm tài giỏi nhất!`;

    return {
      summary: "💡 (Cố vấn cục bộ) " + summary,
      categoriesAdvice,
      savingTips,
      debtAdvice: "",
      reminders: []
    };
  };

  // Fetch AI Insight from server API
  const handleFetchAiInsight = async () => {
    if (expenses.length === 0) return;
    setLoadingAi(true);
    setAiError("");
    try {
      const response = await fetch("/api/gemini/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses,
          members,
          month: selectedMonth,
          debts: [], // not needing specific debts for saving tips
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setAiInsight(data);
      } else {
        const localData = generateLocalAdvice(expenses, members, selectedMonth);
        setAiInsight(localData);
      }
    } catch (err: any) {
      const localData = generateLocalAdvice(expenses, members, selectedMonth);
      setAiInsight(localData);
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    handleFetchAiInsight();
  }, [selectedMonth, expenses.length]);

  return (
    <div id="dashboard-viewport" className="space-y-6">
      {/* Month selection bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Tổng Quan Tài Chính Gia Đình</h2>
          <p className="text-xs text-gray-500">Phân tích biểu đồ và những khoản chi trả trong tháng của 5 thành viên</p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-bold">Tháng:</label>
          <select
            id="dash-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs px-3 py-1.5 bg-[#0F0F0F] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-white font-semibold"
          >
            <option value="2026-06" className="bg-[#0A0A0A]">Tháng 06/2026</option>
            <option value="2026-05" className="bg-[#0A0A0A]">Tháng 05/2026</option>
            <option value="2026-04" className="bg-[#0A0A0A]">Tháng 04/2026</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total spends */}
        <div className="bg-[#141414] rounded-2xl p-5 border border-[#222] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Tổng Chi Trong Tháng</span>
            <h3 className="text-xl font-extrabold text-white mt-1">{formatVND(totalSpend)}</h3>
            <p className="text-[10px] text-gray-600 mt-1">Hết thảy chi phí gia đình</p>
          </div>
          <div className="bg-blue-500/10 text-blue-400 p-3 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Average splits */}
        <div className="bg-[#141414] rounded-2xl p-5 border border-[#222] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Trung Bình / Người</span>
            <h3 className="text-xl font-extrabold text-emerald-400 mt-1">{formatVND(averageSpend)}</h3>
            <p className="text-[10px] text-gray-600 mt-1">Đã chia đều cho {members.length} người</p>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Top category */}
        <div className="bg-[#141414] rounded-2xl p-5 border border-[#222] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Chi Nhiều Nhất Cho</span>
            <h3 className="text-base font-extrabold text-white mt-1 truncate max-w-[150px]">
              {topCategory ? topCategory.name : "Không có"}
            </h3>
            <p className="text-[10px] text-gray-600 mt-1">
              {topCategory ? formatVND(topCategory.value) : "0 VND"}
            </p>
          </div>
          <div className="bg-amber-500/10 text-amber-400 p-3 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Top Buyer paid */}
        <div className="bg-[#141414] rounded-2xl p-5 border border-[#222] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Chi Trả Nhiều Nhất</span>
            <h3 className="text-base font-extrabold text-white mt-1 truncate max-w-[150px]">
              {topSpender && topSpender.value > 0 ? topSpender.name : "Không có"}
            </h3>
            <p className="text-[10px] text-gray-600 mt-1">
              {topSpender && topSpender.value > 0 ? `Đã mua: ${formatVND(topSpender.value)}` : "0 VND"}
            </p>
          </div>
          <div className="bg-purple-500/10 text-purple-400 p-3 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recharts Visual Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Expenditure trend bar chart */}
        <div className="bg-[#141414] p-5 rounded-2xl border border-[#222] shadow-md">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Biểu Đồ Chi Tiêu Theo Ngày
          </h3>
          <div className="h-64 w-full text-xs">
            {totalSpend === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 italic">
                Chưa có chi tiêu ghi nhận trong tháng này.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#4a4a4a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#4a4a4a" fontSize={11} tickLine={false} />
                  <Tooltip 
                    formatter={(value) => [formatVND(Number(value)), "Đã chi"]}
                    contentStyle={{ backgroundColor: '#0F0F0F', borderRadius: '12px', borderColor: '#222', fontSize: '11px', color: '#fff' }}
                  />
                  <Bar dataKey="Số tiền" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Categories allocation pie chart */}
        <div className="bg-[#141414] p-5 rounded-2xl border border-[#222] shadow-md grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Cơ Cấu Chi Tiêu Hạng Mục</h3>
              <p className="text-[11px] text-gray-500 mb-4">Danh sách phân chia theo danh mục chi tiêu lớn nhất</p>
            </div>
            
            <div className="space-y-2">
              {categorySummary.slice(0, 4).map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                    <span className="text-gray-400 font-medium truncate max-w-[120px]">{cat.name}</span>
                  </div>
                  <span className="text-white font-bold">{formatVND(cat.value)}</span>
                </div>
              ))}
              {categorySummary.length > 4 && (
                <div className="text-[10px] text-gray-500 italic text-right">+ {categorySummary.length - 4} danh mục khác</div>
              )}
            </div>
          </div>

          <div className="md:col-span-5 h-48 md:h-full flex items-center justify-center">
            {categorySummary.length === 0 ? (
              <div className="text-gray-500 italic text-xs text-center">Không có dữ liệu chi</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySummary}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categorySummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatVND(Number(value))}
                    contentStyle={{ backgroundColor: '#0F0F0F', borderRadius: '12px', borderColor: '#222', fontSize: '11px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Gemini AI recommendation block */}
      <div className="bg-[#141414] text-gray-300 border border-[#222] rounded-2xl p-6 relative overflow-hidden shadow-lg">
        {/* Soft atmospheric bubble background styling - reduced opacity for elegant dark styling */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4 flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="text-emerald-400 w-5 h-5 animate-pulse" />
            <h3 className="text-base font-bold text-white">Trợ Lý AI Cố Vấn Tiết Kiệm</h3>
          </div>
          <button
            id="btn-ask-ai"
            onClick={handleFetchAiInsight}
            disabled={loadingAi || expenses.length === 0}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-55 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? "animate-spin" : ""}`} /> 
            Phân tích lại
          </button>
        </div>

        {totalSpend === 0 ? (
          <div className="text-gray-500 text-xs italic text-center py-6">
            Vui lòng ghi nhận ít nhất một khoản chi tiêu để kích hoạt trí tuệ nhân tạo Gemini phân tích tiết kiệm cho bạn nhé!
          </div>
        ) : loadingAi ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Sparkles className="w-8 h-8 text-emerald-400 animate-spin" />
            <span className="text-xs text-gray-400">AI Gemini của Google đang nghiên cứu kỹ bảng chi tiêu gia đình...</span>
          </div>
        ) : aiError ? (
          <div className="p-3.5 bg-red-950/20 border border-red-900/40 rounded-xl flex items-start gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{aiError}</p>
          </div>
        ) : aiInsight ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs relative z-10 leading-relaxed text-gray-400">
            {/* Advice col 1 */}
            <div className="space-y-2 bg-[#1A1A1A] p-4 rounded-xl border border-[#222]">
              <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Quote className="w-3.5 h-3.5 text-emerald-400" /> Tóm Tắt Tình Hình
              </h4>
              <p className="italic text-gray-300">"{aiInsight.summary}"</p>
            </div>

            {/* Advice col 2 */}
            <div className="space-y-2 bg-[#1A1A1A] p-4 rounded-xl border border-[#222]">
              <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                📊 Tư Vấn Tiết Kiệm Mục
              </h4>
              <p className="text-gray-300">{aiInsight.categoriesAdvice}</p>
            </div>

            {/* Advice col 3 */}
            <div className="space-y-2 bg-[#1A1A1A] p-4 rounded-xl border border-[#222]">
              <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                💡 Cẩm Nang Chi Tiêu
              </h4>
              <p className="text-gray-300">{aiInsight.savingTips}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <button
              id="btn-trigger-analysis-initial"
              onClick={handleFetchAiInsight}
              className="bg-[#1A1A1A] hover:bg-[#222] border border-[#333] text-gray-300 py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Xem lời khuyên chi tiêu tiết kiệm từ AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
