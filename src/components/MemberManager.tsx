/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Member } from "../types";
import { User, Edit2, Check, Info, Trash2, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MemberManagerProps {
  members: Member[];
  onUpdateMember: (updated: Member) => void;
  onAddMember: (newMember: Member) => void;
  onDeleteMember: (id: string) => void;
}

const COLOR_OPTIONS = [
  { name: "Xanh dương", class: "bg-blue-500", shade: "#3b82f6" },
  { name: "Hồng đào", class: "bg-rose-500", shade: "#f43f5e" },
  { name: "Xanh lá", class: "bg-emerald-500", shade: "#10b981" },
  { name: "Tím nhạt", class: "bg-purple-500", shade: "#a855f7" },
  { name: "Vàng cam", class: "bg-amber-500", shade: "#f59e0b" },
  { name: "Đỏ tươi", class: "bg-red-500", shade: "#ef4444" },
  { name: "Xanh ngọc", class: "bg-teal-500", shade: "#14b8a6" },
  { name: "Xám đá", class: "bg-slate-500", shade: "#64748b" },
];

export const MemberManager: React.FC<MemberManagerProps> = ({
  members,
  onUpdateMember,
  onAddMember,
  onDeleteMember,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editFbId, setEditFbId] = useState("");
  const [editPasscode, setEditPasscode] = useState("");

  // Add Member State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newColor, setNewColor] = useState("bg-blue-500");
  const [newLink, setNewLink] = useState("");
  const [newFbId, setNewFbId] = useState("");
  const [newPasscode, setNewPasscode] = useState("123456");

  const startEdit = (m: Member) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditRole(m.role);
    setEditColor(m.avatarColor);
    setEditLink(m.messengerLink || "");
    setEditFbId(m.messengerId || "");
    setEditPasscode(m.passcode || "");
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdateMember({
      id,
      name: editName.trim(),
      role: editRole.trim() || "Thành viên",
      avatarColor: editColor,
      messengerLink: editLink.trim() || undefined,
      messengerId: editFbId.trim() || undefined,
      passcode: editPasscode.trim() || undefined,
    });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddMember({
      id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newName.trim(),
      role: newRole.trim() || "Thành viên gia đình",
      avatarColor: newColor,
      messengerLink: newLink.trim() || undefined,
      messengerId: newFbId.trim() || undefined,
      passcode: newPasscode.trim() || "123456",
    });
    // Reset fields
    setNewName("");
    setNewRole("");
    setNewColor("bg-blue-500");
    setNewLink("");
    setNewFbId("");
    setNewPasscode("123456");
    setIsAdding(false);
  };

  return (
    <div id="member-manager-view" className="space-y-6">
      <div className="bg-[#141414] rounded-2xl p-6 border border-[#222] shadow-lg">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-2">
          <User className="text-blue-400 w-5 h-5" /> 
          Thành Viên Gia Đình ({members.length} Người)
        </h2>
        <p className="text-sm text-gray-400 mb-6 font-medium">
          Tùy chỉnh thông tin các thành viên trong gia đình để phân chia tiền và gửi nhắc nợ qua Facebook Messenger chính xác.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {members.map((member) => {
              const isEditing = editingId === member.id;

              return (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`relative p-5 rounded-xl border transition-all duration-200 flex flex-col justify-between min-h-[22rem] md:h-80 ${
                    isEditing
                      ? "border-blue-500 bg-[#1e1e1e] shadow-md ring-1 ring-blue-900/30"
                      : "border-[#222] bg-[#0F0F0F] hover:bg-[#141414] hover:shadow-md hover:border-[#333]"
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tên hiển thị</label>
                        <input
                          id={`edit-name-${member.id}`}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full text-xs px-2.5 py-1 bg-[#0a0a0a] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                          placeholder="Ví dụ: Bố Sơn"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vai trò</label>
                        <input
                          id={`edit-role-${member.id}`}
                          type="text"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full text-xs px-2.5 py-1 bg-[#0a0a0a] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                          placeholder="Ví dụ: Bố, Mẹ..."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Mã liên kết</label>
                        <div className="flex gap-2">
                          <input
                            id={`edit-link-${member.id}`}
                            type="text"
                            value={editLink}
                            onChange={(e) => setEditLink(e.target.value)}
                            placeholder="m.me/..."
                            className="w-1/2 text-[10px] px-2 py-1 bg-[#0a0a0a] border border-[#222] rounded focus:outline-none text-white font-mono"
                          />
                          <input
                            id={`edit-fbid-${member.id}`}
                            type="text"
                            value={editFbId}
                            onChange={(e) => setEditFbId(e.target.value)}
                            placeholder="PSID..."
                            className="w-1/2 text-[10px] px-2 py-1 bg-[#0a0a0a] border border-[#222] rounded focus:outline-none text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mật khẩu PIN</label>
                        <input
                          id={`edit-passcode-${member.id}`}
                          type="password"
                          value={editPasscode}
                          onChange={(e) => setEditPasscode(e.target.value)}
                          className="w-full text-xs px-2.5 py-1 bg-[#0a0a0a] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-white font-mono"
                          placeholder="Mặc định: 123456"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Màu đại diện</label>
                        <div className="flex flex-wrap gap-1">
                          {COLOR_OPTIONS.slice(0, 5).map((color) => (
                            <button
                              key={color.class}
                              id={`color-${member.id}-${color.class}`}
                              type="button"
                              onClick={() => setEditColor(color.class)}
                              className={`w-4 h-4 rounded-full transition ${color.class} ${
                                editColor === color.class ? "ring-2 ring-slate-450 ring-offset-1 scale-110" : "opacity-80 hover:opacity-100"
                              }`}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-1.5 mt-1">
                        <button
                          id={`btn-cancel-${member.id}`}
                          onClick={() => setEditingId(null)}
                          className="w-1/3 bg-transparent hover:bg-white/5 border border-[#333] text-gray-400 text-[10px] font-semibold py-1 rounded-lg cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          id={`btn-save-${member.id}`}
                          onClick={() => saveEdit(member.id)}
                          className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold py-1 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Check className="w-3 h-3" /> Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-between h-full flex-1">
                      <div className="flex flex-col items-center text-center mt-2">
                        <div className={`w-14 h-14 rounded-full ${member.avatarColor} text-white flex items-center justify-center font-bold text-xl shadow-inner mb-3`}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <h4 className="font-bold text-white text-base line-clamp-1">{member.name}</h4>
                        <span className="text-xs bg-[#191919] text-gray-300 border border-[#2a2a2a] px-2 py-0.5 rounded-full font-medium mt-1">
                          {member.role}
                        </span>
                      </div>

                      <div className="mt-4 border-t border-[#222] pt-3 space-y-1.5 text-xs text-gray-400">
                        <div className="flex items-center justify-between">
                          <span>FB Link:</span>
                          <span className={`font-mono max-w-[100px] truncate ${member.messengerLink ? "text-emerald-400 font-semibold" : "text-gray-600"}`}>
                            {member.messengerLink ? "Đã cài đặt" : "Chưa có"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>FB PSID:</span>
                          <span className={`font-mono max-w-[100px] truncate ${member.messengerId ? "text-blue-400 font-semibold" : "text-gray-600"}`}>
                            {member.messengerId || "Chưa có"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1.5 mt-3">
                        <button
                          id={`btn-edit-${member.id}`}
                          onClick={() => startEdit(member)}
                          className="flex-1 border border-[#222] hover:border-[#333] hover:bg-[#1A1A1A] text-gray-300 text-xs font-semibold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Sửa
                        </button>
                        <button
                          id={`btn-delete-${member.id}`}
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn xoá thành viên ${member.name} khỏi gia đình không?`)) {
                              onDeleteMember(member.id);
                            }
                          }}
                          className="border border-rose-950/40 hover:border-rose-900/60 hover:bg-rose-950/20 text-rose-450 p-1.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                          title="Xoá thành viên"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* In-place add card dynamically matching layout */}
            {isAdding ? (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative p-5 rounded-xl border border-emerald-500 bg-[#1e1e1e] shadow-md ring-1 ring-emerald-950/30 flex flex-col justify-between min-h-[22rem] md:h-80"
              >
                <div className="space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Họ & Tên</label>
                    <input
                      id="add-member-name"
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full text-xs px-2.5 py-1 bg-[#0a0a0a] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                      placeholder="Ví dụ: Bé Na, Bác Tư..."
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vai trò</label>
                    <input
                      id="add-member-role"
                      type="text"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full text-xs px-2.5 py-1 bg-[#0a0a0a] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                      placeholder="Ví dụ: Em họ, Khách..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mật khẩu PIN</label>
                    <input
                      id="add-member-passcode"
                      type="password"
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      className="w-full text-xs px-2.5 py-1 bg-[#0a0a0a] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white font-mono"
                      placeholder="Mặc định: 123456"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Mã màu</label>
                    <div className="flex flex-wrap gap-1">
                      {COLOR_OPTIONS.slice(0, 5).map((color) => (
                        <button
                          key={color.class}
                          id={`add-color-${color.class}`}
                          type="button"
                          onClick={() => setNewColor(color.class)}
                          className={`w-4 h-4 rounded-full transition ${color.class} ${
                            newColor === color.class ? "ring-2 ring-slate-400 ring-offset-1 scale-110" : "opacity-80 hover:opacity-100"
                          }`}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-1">
                    <button
                      id="btn-add-cancel"
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="flex-1 bg-transparent hover:bg-white/5 text-gray-400 text-[11px] font-semibold py-1.5 px-2 rounded-lg border border-[#333] transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      id="btn-add-submit"
                      type="button"
                      onClick={handleAdd}
                      className="flex-grow bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold py-1.5 px-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Lưu thêm
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.button
                id="btn-show-add-member"
                onClick={() => setIsAdding(true)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="p-5 rounded-xl border border-dashed border-[#333] hover:border-emerald-500/50 hover:bg-emerald-950/5 text-gray-500 hover:text-emerald-400 cursor-pointer flex flex-col items-center justify-center gap-3 transition-all duration-200 min-h-[22rem] md:h-80 group"
              >
                <div className="w-12 h-12 rounded-full border border-dashed border-[#444] group-hover:border-emerald-500 flex items-center justify-center transition-colors">
                  <Plus className="w-6 h-6 text-gray-400 group-hover:text-emerald-400" />
                </div>
                <div className="text-center">
                  <span className="block font-bold text-xs group-hover:text-emerald-400 text-white">Thêm Thành Viên</span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">Mở rộng gia đình của bạn</span>
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Advanced info section */}
      <div className="bg-blue-950/10 rounded-2xl p-5 border border-blue-900/30 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-1 flex justify-center">
          <div className="bg-blue-900/30 text-blue-400 p-2.5 rounded-xl border border-blue-800/20">
            <Info className="w-6 h-6" />
          </div>
        </div>
        <div className="md:col-span-11 space-y-1">
          <h4 className="font-semibold text-white text-sm">Làm thế nào để lấy FB Link & Facebook PSID?</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            <strong>FB Link:</strong> Bạn có thể điền link Messenger cá nhân (dạng <code className="bg-[#0c0c0c] px-1 py-0.5 rounded border border-[#222] text-blue-400">https://m.me/ten_nguoi_dung</code>) để khi click nhắc nợ, ứng dụng sẽ mở thẳng ô chat Messenger của người đó. <br />
            <strong>Facebook PSID:</strong> ID Người Dùng scoped trên Page. Thích hợp cho những gia đình vận hành qua 1 Fanpage Chatbot chung, cho phép gửi tự động 1 chạm từ server qua Messenger. Bạn có thể thiết lập cấu hình Fanpage tại tab Cấu Hình.
          </p>
        </div>
      </div>
    </div>
  );
};

