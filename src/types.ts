/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Member {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  messengerLink?: string; // e.g. https://m.me/yourusername
  messengerId?: string;   // Page-Scoped ID (PSID) for real FB messenger sending
  passcode?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  date: string;
  paidById: string;       // ID of the buyer
  beneficiaryIds: string[]; // List of member IDs who share this cost
  notes?: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color: string; // hex or tailwind class
}

export interface Settlement {
  fromId: string;
  toId: string;
  amount: number;
}

export interface FbConfig {
  pageAccessToken: string;
  pageId: string;
  isEnabled: boolean;
}

export interface AIInsight {
  summary: string;
  categoriesAdvice: string;
  debtAdvice: string;
  savingTips: string;
}
