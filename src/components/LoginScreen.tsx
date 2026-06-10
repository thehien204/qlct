import React, { useState } from "react";
import { Lock, PiggyBank, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate small latency for premium feels
    setTimeout(() => {
      const cleanPass = password.trim();
      if (cleanPass === "giadinh" || cleanPass === "123456") {
        onLoginSuccess();
      } else {
        setError("Mật khẩu gia đình chưa chính xác. Vui lòng kiểm tra lại!");
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-300 flex items-center justify-center relative overflow-hidden font-sans select-none px-4">
      {/* Premium glowing background blobs with float and pulse animations */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-[120px] pointer-events-none animate-float" />
      
      {/* Atmospheric subtle grid/dot pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-[#121212]/80 border border-[#222] backdrop-blur-xl p-8 rounded-3xl shadow-2xl relative z-10 space-y-6"
      >
        {/* Header/Brand Section */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg shadow-emerald-900/20 relative animate-glimmer">
            <PiggyBank className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1.5 uppercase">
              Sổ Chi Tiêu Gia Đình
              <span className="text-[9px] bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">PRO</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              Đăng nhập để tự động đồng bộ hóa dữ liệu Bảng tính chung của cả gia đình
            </p>
          </div>
        </div>

        {/* Lock Info */}
        <div className="bg-emerald-950/10 border border-emerald-900/20 rounded-2xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
          <p className="text-xs text-emerald-400/80 leading-relaxed">
            Nhập mật khẩu gia đình của bạn để mở khóa. Sau khi đăng nhập, Spreadsheet ID và Access Token sẽ tự động được đồng bộ trực tuyến.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">
              Mật khẩu gia đình
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                disabled={isLoading}
                placeholder="Nhập giadinh hoặc 123456"
                className="w-full text-xs pl-10 pr-4 py-3.5 bg-[#0A0A0A] border border-[#222] rounded-2xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-[#101010] text-white font-mono placeholder-gray-650 transition-all"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-rose-950/20 border border-rose-900/35 rounded-xl text-rose-400 text-xs flex items-start gap-2"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/10 active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang mở khóa...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                Mở khóa Gia Đình <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center">
          <p className="text-[10px] text-gray-650">
            © 2026 Sổ Chi Tiêu Gia Đình • Bảo mật qua kênh máy chủ riêng
          </p>
        </div>
      </motion.div>
    </div>
  );
};
