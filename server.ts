/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
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

// API Route: Smart financial analysis + localized reminder generator using Gemini
app.post("/api/gemini/advice", async (req, res) => {
  const { expenses, members, month, debts } = req.body;

  if (!expenses || !members) {
    return res.status(400).json({ error: "Thiếu thông tin chi tiêu hoặc thành viên gia đình." });
  }

  // Build a deterministic data signature
  const expensesSum = expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
  const debtsSum = (debts || []).reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
  const inputSignature = JSON.stringify({
    month: month || "all",
    membersCount: members.length,
    expensesCount: expenses.length,
    expensesSum,
    debtsCount: (debts || []).length,
    debtsSum
  });

  // Check if cache exists and is fresh
  const now = Date.now();
  if (adviceCache && adviceCache.inputSignature === inputSignature && (now - adviceCache.timestamp) < CACHE_TTL_MS) {
    console.info("Returning fresh cached advice (instant 0ms response).");
    return res.json(adviceCache.data);
  }

  // If Gemini API Key is missing, fallback gracefully to dynamic advisor
  if (!hasGeminiKey()) {
    console.info("Gemini API Key missing, falling back to smart local advice.");
    const fallbackData = generateSmartFallbackAdvice(expenses, members, debts, month);
    fallbackData.summary = "💡 (Cố vấn Cục bộ) " + fallbackData.summary;
    return res.json(fallbackData);
  }

  try {
    const prompt = `
Hãy là một Cố vấn Tài chính Gia đình thông minh, vui vẻ và am hiểu văn hóa gia đình Việt Nam.
Tôi có dữ liệu chi tiêu hàng tháng (${month || "tất cả các tháng"}) của một gia đình 5 người:
Các thành viên: ${JSON.stringify(members.map((m: any) => `${m.name} (Vai trò: ${m.role})`))}
Chi tiết các khoản chi tiêu: ${JSON.stringify(
      expenses.map((e: any) => ({
        tiêu_đề: e.title,
        số_tiền: e.amount,
        người_mua: members.find((m: any) => m.id === e.paidById)?.name || "Không rõ",
        mua_cho_ai: e.beneficiaryIds.map((bId: any) => members.find((m: any) => m.id === bId)?.name).join(", "),
        mã_danh_mục: e.categoryId,
        ngày: e.date,
        ghi_chú: e.notes || "",
      }))
    )}

Các khoản nợ đang cần thanh toán chia tiền tháng này:
${JSON.stringify(
  debts.map((d: any) => ({
    người_nợ: members.find((m: any) => m.id === d.fromId)?.name || "Không rõ",
    người_nhận: members.find((m: any) => m.id === d.toId)?.name || "Không rõ",
    số_tiền: d.amount,
  }))
)}

Hãy phân tích chi tiết dữ liệu này và trả về phản hồi định dạng JSON chính xác khớp với schema cấu trúc sau:
{
  "summary": "Tóm tắt ngắn gọn (1-2 câu) về tình hình chi tiêu của gia đình trong tháng này, khen ngợi hoặc động viên một cách dí dỏm bằng tiếng Việt ấm áp.",
  "categoriesAdvice": "Phân tích xem danh mục nào gia đình chi nhiều nhất (ví dụ: Ăn uống, mua sắm,...), mức độ hợp lý và lời khuyên cụ thể để tối ưu hóa danh mục đó.",
  "debtAdvice": "Lời khuyên giải quyết các khoản chia tiền (nợ) hiện tại giữa các thành viên sao cho êm thấm, vui vẻ nhất.",
  "savingTips": "3 mẹo tiết kiệm tiền thiết thực cho gia đình 5 người dựa trên đặc trưng chi tiêu thực tế của họ ở trên.",
  "reminders": [
    {
      "fromName": "Tên người nợ",
      "toName": "Tên người nhận",
      "amount": 100000,
      "funnyMessage": "Tin nhắn nhắc nợ thiết kế riêng siêu hài hước, dễ thương, không gây căng thẳng.",
      "politeMessage": "Tin nhắn nhắc nợ lịch sự, trang trọng, ấm áp tình cảm gia đình.",
      "urgentMessage": "Tin nhắn nhắc nợ hối thúc kiểu tinh nghịch dọa dẫm vui vẻ (ví dụ: không trả tiền bố cắt cơm tối)."
    }
  ]
}
`.trim();

    // Generate strict JSON response using responseSchema and system instructions
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "Bạn là chuyên gia tư vấn quản lý tài chính gia đình số 1 Việt Nam. Trả lời bằng định dạng JSON chính xác đúng schema.",
        responseSchema: {
          type: Type.OBJECT,
          required: ["summary", "categoriesAdvice", "debtAdvice", "savingTips", "reminders"],
          properties: {
            summary: { type: Type.STRING },
            categoriesAdvice: { type: Type.STRING },
            debtAdvice: { type: Type.STRING },
            savingTips: { type: Type.STRING },
            reminders: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["fromName", "toName", "amount", "funnyMessage", "politeMessage", "urgentMessage"],
                properties: {
                  fromName: { type: Type.STRING },
                  toName: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  funnyMessage: { type: Type.STRING },
                  politeMessage: { type: Type.STRING },
                  urgentMessage: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const bodyText = response.text || "{}";
    const data = JSON.parse(bodyText.trim());

    // Cache successful response
    adviceCache = {
      inputSignature,
      data,
      timestamp: Date.now()
    };

    return res.json(data);
  } catch (error: any) {
    // Gracefully activate local advisor without writing noisy error/quota text to standard logs
    console.log("Local smart advisor activated (Dynamic low-latency logic fallback).");
    const fallbackData = generateSmartFallbackAdvice(expenses, members, debts, month);
    fallbackData.summary = "💡 (Cố vấn Khôi phục Cục bộ) " + fallbackData.summary;

    // Cache fallback response too to prevent hammering API repeatedly during error states
    adviceCache = {
      inputSignature,
      data: fallbackData,
      timestamp: Date.now()
    };

    return res.json(fallbackData);
  }
});

// API Route: Send message to Facebook Messenger using Meta Graph API
app.post("/api/send-messenger", async (req, res) => {
  try {
    const { message, pageAccessToken, pageId, recipientId, testMode } = req.body;

    if (!message || !recipientId) {
      return res.status(400).json({ error: "Thiếu nội dung tin nhắn hoặc ID người nhận (PSID)." });
    }

    // In local demo or if keys are not provided, we can allow a simulation mode if requested,
    // but we execute a REAL request if the credentials are provided
    const token = pageAccessToken || process.env.FB_PAGE_ACCESS_TOKEN;
    const page = pageId || process.env.FB_PAGE_ID;

    if (testMode || !token) {
      // Simulate successful delivery so the user feels the integration flow without needing real FB approval immediately
      return res.json({
        success: true,
        simulated: true,
        message: "Mô phỏng: Gửi tin nhắn thành công qua webhook/FB API!",
        sentMessage: message,
        recipient: recipientId
      });
    }

    // Real API Request to Facebook Page Send API
    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${token}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
      }),
    });

    const result = await response.json();

    if (response.ok) {
      res.json({
        success: true,
        simulated: false,
        data: result,
      });
    } else {
      res.status(response.status).json({
        success: false,
        error: result.error?.message || "Lỗi khi gửi yêu cầu đến API Facebook.",
        fullError: result,
      });
    }
  } catch (error: any) {
    console.error("Facebook Send API Error:", error);
    res.status(500).json({ error: error.message || "Lỗi hệ thống khi gửi tin nhắn Facebook." });
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
