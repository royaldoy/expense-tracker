/**
 * Skema DDL SQLite untuk Money Tracker
 * Menjaga keselarasan struktur dengan domain types dan Dexie schema:
 * - Nominal uang integer Rupiah (openingBalance, balance, amount, fee, limit)
 * - Timestamps disimpan sebagai integer milliseconds (Unix epoch)
 * - Array dan objek kompleks diserialisasi sebagai JSON string (tagIds, value, template)
 * - Integritas relasional dijamin via Foreign Keys & Indexes
 */

export const SQLITE_PRAGMAS = `
PRAGMA foreign_keys = ON;
`;

export const SQLITE_DDL_WALLETS = `
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('ewallet', 'bank', 'cash')) NOT NULL,
  openingBalance INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  includeInTotal INTEGER NOT NULL DEFAULT 1,
  archivedAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);
CREATE INDEX IF NOT EXISTS idx_wallets_deletedAt ON wallets(deletedAt);
`;

export const SQLITE_DDL_CATEGORIES = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT CHECK(kind IN ('income', 'expense')) NOT NULL,
  parentId TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER,
  FOREIGN KEY (parentId) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_categories_kind_order ON categories(kind, display_order);
CREATE INDEX IF NOT EXISTS idx_categories_deletedAt ON categories(deletedAt);
`;

export const SQLITE_DDL_TRANSACTIONS = `
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT CHECK(type IN ('income', 'expense', 'transfer')) NOT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  walletId TEXT NOT NULL,
  toWalletId TEXT,
  fee INTEGER NOT NULL DEFAULT 0,
  categoryId TEXT,
  date TEXT NOT NULL,
  note TEXT,
  tagIds TEXT NOT NULL DEFAULT '[]',
  attachmentId TEXT,
  recurringId TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER,
  FOREIGN KEY (walletId) REFERENCES wallets(id) ON DELETE RESTRICT,
  FOREIGN KEY (toWalletId) REFERENCES wallets(id) ON DELETE RESTRICT,
  FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_date ON transactions(walletId, date);
CREATE INDEX IF NOT EXISTS idx_transactions_toWalletId ON transactions(toWalletId);
CREATE INDEX IF NOT EXISTS idx_transactions_categoryId ON transactions(categoryId);
CREATE INDEX IF NOT EXISTS idx_transactions_recurringId ON transactions(recurringId);
CREATE INDEX IF NOT EXISTS idx_transactions_deletedAt ON transactions(deletedAt);
`;

export const SQLITE_DDL_RECURRING_RULES = `
CREATE TABLE IF NOT EXISTS recurring_rules (
  id TEXT PRIMARY KEY,
  template TEXT NOT NULL,
  frequency TEXT CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')) NOT NULL,
  nextRunAt TEXT NOT NULL,
  autoPost INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_nextRunAt ON recurring_rules(nextRunAt);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_autoPost ON recurring_rules(autoPost);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_deletedAt ON recurring_rules(deletedAt);
`;

export const SQLITE_DDL_BUDGETS = `
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  categoryId TEXT,
  period TEXT NOT NULL,
  limit_amount INTEGER NOT NULL CHECK(limit_amount >= 0),
  alertAt INTEGER NOT NULL DEFAULT 80,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER,
  FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period);
CREATE INDEX IF NOT EXISTS idx_budgets_category_period ON budgets(categoryId, period);
CREATE INDEX IF NOT EXISTS idx_budgets_deletedAt ON budgets(deletedAt);
`;

export const SQLITE_DDL_SETTINGS = `
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
`;

export const SQLITE_DDL_NOTIFICATIONS = `
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  readAt INTEGER,
  refId TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_refId ON notifications(refId);
CREATE INDEX IF NOT EXISTS idx_notifications_readAt ON notifications(readAt);
CREATE INDEX IF NOT EXISTS idx_notifications_createdAt ON notifications(createdAt);
CREATE INDEX IF NOT EXISTS idx_notifications_type_refId ON notifications(type, refId);
CREATE INDEX IF NOT EXISTS idx_notifications_deletedAt ON notifications(deletedAt);
`;

export const SQLITE_ALL_TABLES = [
	SQLITE_DDL_WALLETS,
	SQLITE_DDL_CATEGORIES,
	SQLITE_DDL_TRANSACTIONS,
	SQLITE_DDL_BUDGETS,
	SQLITE_DDL_RECURRING_RULES,
	SQLITE_DDL_SETTINGS,
	SQLITE_DDL_NOTIFICATIONS
];

export const SQLITE_INIT_SCRIPT = `
${SQLITE_PRAGMAS}
${SQLITE_DDL_WALLETS}
${SQLITE_DDL_CATEGORIES}
${SQLITE_DDL_TRANSACTIONS}
${SQLITE_DDL_BUDGETS}
${SQLITE_DDL_RECURRING_RULES}
${SQLITE_DDL_SETTINGS}
${SQLITE_DDL_NOTIFICATIONS}
`;
