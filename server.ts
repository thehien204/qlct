/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper to check if API key is present
const hasGeminiKey = () => !!process.env.GEMINI_API_KEY;

// Smart local fallback advice generator for fallback when API has quota/auth errors
function generateSmartFallbackAdvice(expenses: any[], members: any[], debts: any[], month?: string) {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Expenses sum grouped by category
  const categoryMap: Record<string, number> = {};
  expenses.forEach((e) => {
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

  const formatVND = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " VND";
  };

  // 1. Warm family-oriented summary
  let summary = `Cả nhà đã cùng nhau chi tiêu tổng cộng ${formatVND(totalAmount)} trong ${month ? `tháng ${month.substring(5)}/${month.substring(0, 4)}` : "thời gian qua"}. Hãy tiếp tục đồng lòng quản lý tài chính thật tốt nhé!`;
  if (totalAmount > 15000000) {
    summary = `Tháng này gia đình mình chi tiêu khá mặn với tổng cộng ${formatVND(totalAmount)}. Tuy nhiên nhờ cùng nhau san sẻ nên mọi gánh nặng đều nhẹ đi rất nhiều, cả nhà tuyệt vời lắm! ✨`;
  } else if (totalAmount > 0) {
    summary = `Gia đình mình chi tiêu cực kỳ khoa học và tiết kiệm với tổng số tiền ${formatVND(totalAmount)}. Hãy duy trì phong độ ấm áp và sòng phẳng này nhé! 🌸`;
  }

  // 2. Custom category analytics and optimization
  let categoriesAdvice = `Khoản chi nổi bật nhất của gia đình mình là dành cho "${topCategoryName}" với tổng cộng ${formatVND(topCategoryAmount)}. Đây là nhu cầu hoàn toàn thiết thực, việc chia đều sẽ giúp các thành viên cảm giác rất thoải mái và bớt áp lực hơn.`;
  if (topCategoryAmount > 5000000) {
    categoriesAdvice = `Gia đình đang dồn lực khá lớn cho nhóm "${topCategoryName}" (${formatVND(topCategoryAmount)}). Để tối ưu, cả nhà có thể lập kế hoạch dự chi cụ thể trước mỗi tuần, ưu tiên tự nấu ăn tại nhà hoặc sắm sửa đồ gia dụng theo đợt khuyến mãi lớn để tiết giảm từ 10-15%.`;
  }

  // 3. Sweet debt settlement strategy
  let debtAdvice = "Hiện tại cán cân tài chính đang rất đẹp. Việc thanh toán các khoản chia tiền sớm sẽ giúp mọi người giữ tâm lý ấm áp và sẵn sàng cho các kế hoạch chi tiêu chung tiếp theo!";
  if (debts && debts.length > 0) {
    debtAdvice = `Gia đình chúng ta đang có ${debts.length} giao dịch cần tất toán đối soát. Đề xuất cả nhà sử dụng hình thức chuyển khoản nhanh qua mã QR để giải quyết dứt điểm các khoản nợ nần vui vẻ trước hạn!`;
  }

  const savingTips = `1. **Sắp xếp mua sắm sỉ**: Nên mua chung các mặt hàng gia dụng, thực phẩm khô theo lốc lớn tại siêu thị để được hưởng mức chiết khấu tốt.\n2. **Tận dụng các gói điện gia đình**: Điều chỉnh nhiệt độ điều hòa ở mức 26 độ C và tắt hẳn các thiết bị điện khi ra ngoài để tiết kiệm tối thiểu 10% hóa đơn tháng này.\n3. **Họp mặt gia đình định kỳ**: Dành khoảng 10 phút cuối tháng để cùng nhìn lại sổ tay chi tiêu này, khen ngợi thành viên tiết kiệm tài giỏi nhất!`;

  // 4. Custom dynamically mapped Vietnamese reminders
  const reminders = (debts || []).map((d: any) => {
    const fromName = members.find((m) => m.id === d.fromId)?.name || "Thành viên";
    const toName = members.find((m) => m.id === d.toId)?.name || "Thành viên";
    const amount = d.amount;
    const amountStr = formatVND(amount);

    return {
      fromName,
      toName,
      amount,
      funnyMessage: `Alo alo ${fromName} thân yêu! Trái Đất quay quanh Mặt Trời, còn khoản nợ ${amountStr} thì nên quay về ví của ${toName} ngay và luôn nhé! Ting ting liền tay, thắt chặt tình thân nào! 😘`,
      politeMessage: `Chào ${fromName}. Đây là lời nhắc tự động hỗ trợ tính toán tài chính chung trong gia đình. Khoản đối soát tháng này của bạn cần chuyển trả cho ${toName} là ${amountStr}. Trân trọng cảm ơn sự san sẻ ấm áp của bạn.`,
      urgentMessage: `SOS! 🚨 ${fromName} ơi, ${toName} đang réo gọi khoản nợ ${amountStr} kìa! Trả ngay kẻo tối nay cơm mất thịt, canh mất muối, mạng internet gia đình đột ngột chuyển sang chế độ 'mất kết nối' nha! 🍲⚡`
    };
  });

  return {
    summary,
    categoriesAdvice,
    debtAdvice,
    savingTips,
    reminders
  };
}

// Simple in-memory cache to prevent repetitive Gemini quota/rate limits exhaustion
interface AdviceCacheEntry {
  inputSignature: string;
  data: any;
  timestamp: number;
}

let adviceCache: AdviceCacheEntry | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // Cache for 15 minutes to save API quotas

// Forward all /api/* requests directly to the Spring Boot backend running on port 8080
app.all("/api/*", async (req, res) => {
  const targetUrl = `http://localhost:8080${req.originalUrl}`;
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    res.status(response.status);
    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });

    const text = await response.text();
    res.send(text);
  } catch (error: any) {
    console.error(`Error proxying request to backend at port 8080 (${targetUrl}):`, error);
    res.status(502).json({
      error: `Không thể kết nối đến Spring Boot backend (cổng 8080): ${error.message}. Hãy chắc chắn rằng bạn đã khởi chạy backend Java.`,
    });
  }
});

// Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
