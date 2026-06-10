/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category } from "../types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "food", name: "Ăn uống & Chợ búa", icon: "Utensils", color: "#10b981" }, // Emerald 500
  { id: "utilities", name: "Điện, Nước & Internet", icon: "Zap", color: "#f59e0b" }, // Amber 500
  { id: "education", name: "Học tập & Giáo dục", icon: "GraduationCap", color: "#3b82f6" }, // Blue 500
  { id: "shopping", name: "Sắm sửa & Đồ gia dụng", icon: "ShoppingBag", color: "#a855f7" }, // Purple 500
  { id: "health", name: "Y tế & Sức khỏe", icon: "HeartPulse", color: "#ef4444" }, // Red 500
  { id: "travel", name: "Xăng xe & Đi lại", icon: "Car", color: "#f97316" }, // Orange 500
  { id: "entertainment", name: "Vui chơi & Giải trí", icon: "Sparkles", color: "#6366f1" }, // Indigo 500
  { id: "others", name: "Chi phí khác", icon: "Coins", color: "#6b7280" } // Gray 500
];

export function getCategoryById(id: string): Category {
  return DEFAULT_CATEGORIES.find((c) => c.id === id) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
}
