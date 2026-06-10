var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var hasGeminiKey = () => !!process.env.GEMINI_API_KEY;
function generateSmartFallbackAdvice(expenses, members, debts, month) {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryMap = {};
  expenses.forEach((e) => {
    categoryMap[e.categoryId] = (categoryMap[e.categoryId] || 0) + e.amount;
  });
  let topCategoryName = "Chi ti\xEAu chung";
  let topCategoryAmount = 0;
  const DEFAULT_CATEGORIES_MAP = {
    "food": "\u0102n u\u1ED1ng & Ch\u1EE3 b\xFAa \u{1F372}",
    "utilities": "\u0110i\u1EC7n, N\u01B0\u1EDBc & Internet \u26A1",
    "education": "H\u1ECDc t\u1EADp & Gi\xE1o d\u1EE5c \u{1F4DA}",
    "shopping": "S\u1EAFm s\u1EEDa & \u0110\u1ED3 gia d\u1EE5ng \u{1F6D2}",
    "health": "Y t\u1EBF & S\u1EE9c kh\u1ECFe \u{1F3E5}",
    "travel": "X\u0103ng xe & \u0110i l\u1EA1i \u{1F697}",
    "entertainment": "Vui ch\u01A1i & Gi\u1EA3i tr\xED \u{1F3AE}",
    "others": "Chi ph\xED kh\xE1c \u{1F4B8}"
  };
  Object.entries(categoryMap).forEach(([catId, amount]) => {
    if (amount > topCategoryAmount) {
      topCategoryAmount = amount;
      topCategoryName = DEFAULT_CATEGORIES_MAP[catId] || catId;
    }
  });
  const formatVND = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " VND";
  };
  let summary = `C\u1EA3 nh\xE0 \u0111\xE3 c\xF9ng nhau chi ti\xEAu t\u1ED5ng c\u1ED9ng ${formatVND(totalAmount)} trong ${month ? `th\xE1ng ${month.substring(5)}/${month.substring(0, 4)}` : "th\u1EDDi gian qua"}. H\xE3y ti\u1EBFp t\u1EE5c \u0111\u1ED3ng l\xF2ng qu\u1EA3n l\xFD t\xE0i ch\xEDnh th\u1EADt t\u1ED1t nh\xE9!`;
  if (totalAmount > 15e6) {
    summary = `Th\xE1ng n\xE0y gia \u0111\xECnh m\xECnh chi ti\xEAu kh\xE1 m\u1EB7n v\u1EDBi t\u1ED5ng c\u1ED9ng ${formatVND(totalAmount)}. Tuy nhi\xEAn nh\u1EDD c\xF9ng nhau san s\u1EBB n\xEAn m\u1ECDi g\xE1nh n\u1EB7ng \u0111\u1EC1u nh\u1EB9 \u0111i r\u1EA5t nhi\u1EC1u, c\u1EA3 nh\xE0 tuy\u1EC7t v\u1EDDi l\u1EAFm! \u2728`;
  } else if (totalAmount > 0) {
    summary = `Gia \u0111\xECnh m\xECnh chi ti\xEAu c\u1EF1c k\u1EF3 khoa h\u1ECDc v\xE0 ti\u1EBFt ki\u1EC7m v\u1EDBi t\u1ED5ng s\u1ED1 ti\u1EC1n ${formatVND(totalAmount)}. H\xE3y duy tr\xEC phong \u0111\u1ED9 \u1EA5m \xE1p v\xE0 s\xF2ng ph\u1EB3ng n\xE0y nh\xE9! \u{1F338}`;
  }
  let categoriesAdvice = `Kho\u1EA3n chi n\u1ED5i b\u1EADt nh\u1EA5t c\u1EE7a gia \u0111\xECnh m\xECnh l\xE0 d\xE0nh cho "${topCategoryName}" v\u1EDBi t\u1ED5ng c\u1ED9ng ${formatVND(topCategoryAmount)}. \u0110\xE2y l\xE0 nhu c\u1EA7u ho\xE0n to\xE0n thi\u1EBFt th\u1EF1c, vi\u1EC7c chia \u0111\u1EC1u s\u1EBD gi\xFAp c\xE1c th\xE0nh vi\xEAn c\u1EA3m gi\xE1c r\u1EA5t tho\u1EA3i m\xE1i v\xE0 b\u1EDBt \xE1p l\u1EF1c h\u01A1n.`;
  if (topCategoryAmount > 5e6) {
    categoriesAdvice = `Gia \u0111\xECnh \u0111ang d\u1ED3n l\u1EF1c kh\xE1 l\u1EDBn cho nh\xF3m "${topCategoryName}" (${formatVND(topCategoryAmount)}). \u0110\u1EC3 t\u1ED1i \u01B0u, c\u1EA3 nh\xE0 c\xF3 th\u1EC3 l\u1EADp k\u1EBF ho\u1EA1ch d\u1EF1 chi c\u1EE5 th\u1EC3 tr\u01B0\u1EDBc m\u1ED7i tu\u1EA7n, \u01B0u ti\xEAn t\u1EF1 n\u1EA5u \u0103n t\u1EA1i nh\xE0 ho\u1EB7c s\u1EAFm s\u1EEDa \u0111\u1ED3 gia d\u1EE5ng theo \u0111\u1EE3t khuy\u1EBFn m\xE3i l\u1EDBn \u0111\u1EC3 ti\u1EBFt gi\u1EA3m t\u1EEB 10-15%.`;
  }
  let debtAdvice = "Hi\u1EC7n t\u1EA1i c\xE1n c\xE2n t\xE0i ch\xEDnh \u0111ang r\u1EA5t \u0111\u1EB9p. Vi\u1EC7c thanh to\xE1n c\xE1c kho\u1EA3n chia ti\u1EC1n s\u1EDBm s\u1EBD gi\xFAp m\u1ECDi ng\u01B0\u1EDDi gi\u1EEF t\xE2m l\xFD \u1EA5m \xE1p v\xE0 s\u1EB5n s\xE0ng cho c\xE1c k\u1EBF ho\u1EA1ch chi ti\xEAu chung ti\u1EBFp theo!";
  if (debts && debts.length > 0) {
    debtAdvice = `Gia \u0111\xECnh ch\xFAng ta \u0111ang c\xF3 ${debts.length} giao d\u1ECBch c\u1EA7n t\u1EA5t to\xE1n \u0111\u1ED1i so\xE1t. \u0110\u1EC1 xu\u1EA5t c\u1EA3 nh\xE0 s\u1EED d\u1EE5ng h\xECnh th\u1EE9c chuy\u1EC3n kho\u1EA3n nhanh qua m\xE3 QR \u0111\u1EC3 gi\u1EA3i quy\u1EBFt d\u1EE9t \u0111i\u1EC3m c\xE1c kho\u1EA3n n\u1EE3 n\u1EA7n vui v\u1EBB tr\u01B0\u1EDBc h\u1EA1n!`;
  }
  const savingTips = `1. **S\u1EAFp x\u1EBFp mua s\u1EAFm s\u1EC9**: N\xEAn mua chung c\xE1c m\u1EB7t h\xE0ng gia d\u1EE5ng, th\u1EF1c ph\u1EA9m kh\xF4 theo l\u1ED1c l\u1EDBn t\u1EA1i si\xEAu th\u1ECB \u0111\u1EC3 \u0111\u01B0\u1EE3c h\u01B0\u1EDFng m\u1EE9c chi\u1EBFt kh\u1EA5u t\u1ED1t.
2. **T\u1EADn d\u1EE5ng c\xE1c g\xF3i \u0111i\u1EC7n gia \u0111\xECnh**: \u0110i\u1EC1u ch\u1EC9nh nhi\u1EC7t \u0111\u1ED9 \u0111i\u1EC1u h\xF2a \u1EDF m\u1EE9c 26 \u0111\u1ED9 C v\xE0 t\u1EAFt h\u1EB3n c\xE1c thi\u1EBFt b\u1ECB \u0111i\u1EC7n khi ra ngo\xE0i \u0111\u1EC3 ti\u1EBFt ki\u1EC7m t\u1ED1i thi\u1EC3u 10% h\xF3a \u0111\u01A1n th\xE1ng n\xE0y.
3. **H\u1ECDp m\u1EB7t gia \u0111\xECnh \u0111\u1ECBnh k\u1EF3**: D\xE0nh kho\u1EA3ng 10 ph\xFAt cu\u1ED1i th\xE1ng \u0111\u1EC3 c\xF9ng nh\xECn l\u1EA1i s\u1ED5 tay chi ti\xEAu n\xE0y, khen ng\u1EE3i th\xE0nh vi\xEAn ti\u1EBFt ki\u1EC7m t\xE0i gi\u1ECFi nh\u1EA5t!`;
  const reminders = (debts || []).map((d) => {
    const fromName = members.find((m) => m.id === d.fromId)?.name || "Th\xE0nh vi\xEAn";
    const toName = members.find((m) => m.id === d.toId)?.name || "Th\xE0nh vi\xEAn";
    const amount = d.amount;
    const amountStr = formatVND(amount);
    return {
      fromName,
      toName,
      amount,
      funnyMessage: `Alo alo ${fromName} th\xE2n y\xEAu! Tr\xE1i \u0110\u1EA5t quay quanh M\u1EB7t Tr\u1EDDi, c\xF2n kho\u1EA3n n\u1EE3 ${amountStr} th\xEC n\xEAn quay v\u1EC1 v\xED c\u1EE7a ${toName} ngay v\xE0 lu\xF4n nh\xE9! Ting ting li\u1EC1n tay, th\u1EAFt ch\u1EB7t t\xECnh th\xE2n n\xE0o! \u{1F618}`,
      politeMessage: `Ch\xE0o ${fromName}. \u0110\xE2y l\xE0 l\u1EDDi nh\u1EAFc t\u1EF1 \u0111\u1ED9ng h\u1ED7 tr\u1EE3 t\xEDnh to\xE1n t\xE0i ch\xEDnh chung trong gia \u0111\xECnh. Kho\u1EA3n \u0111\u1ED1i so\xE1t th\xE1ng n\xE0y c\u1EE7a b\u1EA1n c\u1EA7n chuy\u1EC3n tr\u1EA3 cho ${toName} l\xE0 ${amountStr}. Tr\xE2n tr\u1ECDng c\u1EA3m \u01A1n s\u1EF1 san s\u1EBB \u1EA5m \xE1p c\u1EE7a b\u1EA1n.`,
      urgentMessage: `SOS! \u{1F6A8} ${fromName} \u01A1i, ${toName} \u0111ang r\xE9o g\u1ECDi kho\u1EA3n n\u1EE3 ${amountStr} k\xECa! Tr\u1EA3 ngay k\u1EBBo t\u1ED1i nay c\u01A1m m\u1EA5t th\u1ECBt, canh m\u1EA5t mu\u1ED1i, m\u1EA1ng internet gia \u0111\xECnh \u0111\u1ED9t ng\u1ED9t chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 'm\u1EA5t k\u1EBFt n\u1ED1i' nha! \u{1F372}\u26A1`
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
var adviceCache = null;
var CACHE_TTL_MS = 15 * 60 * 1e3;
app.post("/api/gemini/advice", async (req, res) => {
  const { expenses, members, month, debts } = req.body;
  if (!expenses || !members) {
    return res.status(400).json({ error: "Thi\u1EBFu th\xF4ng tin chi ti\xEAu ho\u1EB7c th\xE0nh vi\xEAn gia \u0111\xECnh." });
  }
  const expensesSum = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const debtsSum = (debts || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const inputSignature = JSON.stringify({
    month: month || "all",
    membersCount: members.length,
    expensesCount: expenses.length,
    expensesSum,
    debtsCount: (debts || []).length,
    debtsSum
  });
  const now = Date.now();
  if (adviceCache && adviceCache.inputSignature === inputSignature && now - adviceCache.timestamp < CACHE_TTL_MS) {
    console.info("Returning fresh cached advice (instant 0ms response).");
    return res.json(adviceCache.data);
  }
  if (!hasGeminiKey()) {
    console.info("Gemini API Key missing, falling back to smart local advice.");
    const fallbackData = generateSmartFallbackAdvice(expenses, members, debts, month);
    fallbackData.summary = "\u{1F4A1} (C\u1ED1 v\u1EA5n C\u1EE5c b\u1ED9) " + fallbackData.summary;
    return res.json(fallbackData);
  }
  try {
    const prompt = `
H\xE3y l\xE0 m\u1ED9t C\u1ED1 v\u1EA5n T\xE0i ch\xEDnh Gia \u0111\xECnh th\xF4ng minh, vui v\u1EBB v\xE0 am hi\u1EC3u v\u0103n h\xF3a gia \u0111\xECnh Vi\u1EC7t Nam.
T\xF4i c\xF3 d\u1EEF li\u1EC7u chi ti\xEAu h\xE0ng th\xE1ng (${month || "t\u1EA5t c\u1EA3 c\xE1c th\xE1ng"}) c\u1EE7a m\u1ED9t gia \u0111\xECnh 5 ng\u01B0\u1EDDi:
C\xE1c th\xE0nh vi\xEAn: ${JSON.stringify(members.map((m) => `${m.name} (Vai tr\xF2: ${m.role})`))}
Chi ti\u1EBFt c\xE1c kho\u1EA3n chi ti\xEAu: ${JSON.stringify(
      expenses.map((e) => ({
        ti\u00EAu_\u0111\u1EC1: e.title,
        s\u1ED1_ti\u1EC1n: e.amount,
        ng\u01B0\u1EDDi_mua: members.find((m) => m.id === e.paidById)?.name || "Kh\xF4ng r\xF5",
        mua_cho_ai: e.beneficiaryIds.map((bId) => members.find((m) => m.id === bId)?.name).join(", "),
        m\u00E3_danh_m\u1EE5c: e.categoryId,
        ng\u00E0y: e.date,
        ghi_ch\u00FA: e.notes || ""
      }))
    )}

C\xE1c kho\u1EA3n n\u1EE3 \u0111ang c\u1EA7n thanh to\xE1n chia ti\u1EC1n th\xE1ng n\xE0y:
${JSON.stringify(
      debts.map((d) => ({
        ng\u01B0\u1EDDi_n\u1EE3: members.find((m) => m.id === d.fromId)?.name || "Kh\xF4ng r\xF5",
        ng\u01B0\u1EDDi_nh\u1EADn: members.find((m) => m.id === d.toId)?.name || "Kh\xF4ng r\xF5",
        s\u1ED1_ti\u1EC1n: d.amount
      }))
    )}

H\xE3y ph\xE2n t\xEDch chi ti\u1EBFt d\u1EEF li\u1EC7u n\xE0y v\xE0 tr\u1EA3 v\u1EC1 ph\u1EA3n h\u1ED3i \u0111\u1ECBnh d\u1EA1ng JSON ch\xEDnh x\xE1c kh\u1EDBp v\u1EDBi schema c\u1EA5u tr\xFAc sau:
{
  "summary": "T\xF3m t\u1EAFt ng\u1EAFn g\u1ECDn (1-2 c\xE2u) v\u1EC1 t\xECnh h\xECnh chi ti\xEAu c\u1EE7a gia \u0111\xECnh trong th\xE1ng n\xE0y, khen ng\u1EE3i ho\u1EB7c \u0111\u1ED9ng vi\xEAn m\u1ED9t c\xE1ch d\xED d\u1ECFm b\u1EB1ng ti\u1EBFng Vi\u1EC7t \u1EA5m \xE1p.",
  "categoriesAdvice": "Ph\xE2n t\xEDch xem danh m\u1EE5c n\xE0o gia \u0111\xECnh chi nhi\u1EC1u nh\u1EA5t (v\xED d\u1EE5: \u0102n u\u1ED1ng, mua s\u1EAFm,...), m\u1EE9c \u0111\u1ED9 h\u1EE3p l\xFD v\xE0 l\u1EDDi khuy\xEAn c\u1EE5 th\u1EC3 \u0111\u1EC3 t\u1ED1i \u01B0u h\xF3a danh m\u1EE5c \u0111\xF3.",
  "debtAdvice": "L\u1EDDi khuy\xEAn gi\u1EA3i quy\u1EBFt c\xE1c kho\u1EA3n chia ti\u1EC1n (n\u1EE3) hi\u1EC7n t\u1EA1i gi\u1EEFa c\xE1c th\xE0nh vi\xEAn sao cho \xEAm th\u1EA5m, vui v\u1EBB nh\u1EA5t.",
  "savingTips": "3 m\u1EB9o ti\u1EBFt ki\u1EC7m ti\u1EC1n thi\u1EBFt th\u1EF1c cho gia \u0111\xECnh 5 ng\u01B0\u1EDDi d\u1EF1a tr\xEAn \u0111\u1EB7c tr\u01B0ng chi ti\xEAu th\u1EF1c t\u1EBF c\u1EE7a h\u1ECD \u1EDF tr\xEAn.",
  "reminders": [
    {
      "fromName": "T\xEAn ng\u01B0\u1EDDi n\u1EE3",
      "toName": "T\xEAn ng\u01B0\u1EDDi nh\u1EADn",
      "amount": 100000,
      "funnyMessage": "Tin nh\u1EAFn nh\u1EAFc n\u1EE3 thi\u1EBFt k\u1EBF ri\xEAng si\xEAu h\xE0i h\u01B0\u1EDBc, d\u1EC5 th\u01B0\u01A1ng, kh\xF4ng g\xE2y c\u0103ng th\u1EB3ng.",
      "politeMessage": "Tin nh\u1EAFn nh\u1EAFc n\u1EE3 l\u1ECBch s\u1EF1, trang tr\u1ECDng, \u1EA5m \xE1p t\xECnh c\u1EA3m gia \u0111\xECnh.",
      "urgentMessage": "Tin nh\u1EAFn nh\u1EAFc n\u1EE3 h\u1ED1i th\xFAc ki\u1EC3u tinh ngh\u1ECBch d\u1ECDa d\u1EABm vui v\u1EBB (v\xED d\u1EE5: kh\xF4ng tr\u1EA3 ti\u1EC1n b\u1ED1 c\u1EAFt c\u01A1m t\u1ED1i)."
    }
  ]
}
`.trim();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "B\u1EA1n l\xE0 chuy\xEAn gia t\u01B0 v\u1EA5n qu\u1EA3n l\xFD t\xE0i ch\xEDnh gia \u0111\xECnh s\u1ED1 1 Vi\u1EC7t Nam. Tr\u1EA3 l\u1EDDi b\u1EB1ng \u0111\u1ECBnh d\u1EA1ng JSON ch\xEDnh x\xE1c \u0111\xFAng schema.",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          required: ["summary", "categoriesAdvice", "debtAdvice", "savingTips", "reminders"],
          properties: {
            summary: { type: import_genai.Type.STRING },
            categoriesAdvice: { type: import_genai.Type.STRING },
            debtAdvice: { type: import_genai.Type.STRING },
            savingTips: { type: import_genai.Type.STRING },
            reminders: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                required: ["fromName", "toName", "amount", "funnyMessage", "politeMessage", "urgentMessage"],
                properties: {
                  fromName: { type: import_genai.Type.STRING },
                  toName: { type: import_genai.Type.STRING },
                  amount: { type: import_genai.Type.NUMBER },
                  funnyMessage: { type: import_genai.Type.STRING },
                  politeMessage: { type: import_genai.Type.STRING },
                  urgentMessage: { type: import_genai.Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    const bodyText = response.text || "{}";
    const data = JSON.parse(bodyText.trim());
    adviceCache = {
      inputSignature,
      data,
      timestamp: Date.now()
    };
    return res.json(data);
  } catch (error) {
    console.log("Local smart advisor activated (Dynamic low-latency logic fallback).");
    const fallbackData = generateSmartFallbackAdvice(expenses, members, debts, month);
    fallbackData.summary = "\u{1F4A1} (C\u1ED1 v\u1EA5n Kh\xF4i ph\u1EE5c C\u1EE5c b\u1ED9) " + fallbackData.summary;
    adviceCache = {
      inputSignature,
      data: fallbackData,
      timestamp: Date.now()
    };
    return res.json(fallbackData);
  }
});
app.post("/api/send-messenger", async (req, res) => {
  try {
    const { message, pageAccessToken, pageId, recipientId, testMode } = req.body;
    if (!message || !recipientId) {
      return res.status(400).json({ error: "Thi\u1EBFu n\u1ED9i dung tin nh\u1EAFn ho\u1EB7c ID ng\u01B0\u1EDDi nh\u1EADn (PSID)." });
    }
    const token = pageAccessToken || process.env.FB_PAGE_ACCESS_TOKEN;
    const page = pageId || process.env.FB_PAGE_ID;
    if (testMode || !token) {
      return res.json({
        success: true,
        simulated: true,
        message: "M\xF4 ph\u1ECFng: G\u1EEDi tin nh\u1EAFn th\xE0nh c\xF4ng qua webhook/FB API!",
        sentMessage: message,
        recipient: recipientId
      });
    }
    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${token}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message }
      })
    });
    const result = await response.json();
    if (response.ok) {
      res.json({
        success: true,
        simulated: false,
        data: result
      });
    } else {
      res.status(response.status).json({
        success: false,
        error: result.error?.message || "L\u1ED7i khi g\u1EEDi y\xEAu c\u1EA7u \u0111\u1EBFn API Facebook.",
        fullError: result
      });
    }
  } catch (error) {
    console.error("Facebook Send API Error:", error);
    res.status(500).json({ error: error.message || "L\u1ED7i h\u1EC7 th\u1ED1ng khi g\u1EEDi tin nh\u1EAFn Facebook." });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
