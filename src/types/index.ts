export type TransactionType = "income" | "expense";

export interface Expense {
  id: string;
  amount: number;
  date: string;
  category_id: string;
  notes: string | null;
  location: string | null;
  payment_method: string | null;
  type: TransactionType;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
}

export interface Budget {
  id: string;
  category_id: string | null;
  amount: number;
  period: string;
  month: string;
  created_at: string;
}

export interface Settings {
  key: string;
  value: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  color: string;
  created_at: string;
}
