# Spreadsheet Schema

Each year has one spreadsheet.

Sheets:

Accounts\
Categories\
Currencies\
Budgets\
Transactions\
Entries\
QuickAdd\
Config\
AuditLog

------------------------------------------------------------------------

## Accounts

  column     type      description
  ---------- --------- -----------------------------------
  id         string    unique id
  name       string    account name
  type       string    asset, liability, income, expense
  currency   string    currency code
  active     boolean   account active flag

------------------------------------------------------------------------

## Categories

  column   type
  -------- ----------------
  id       string
  name     string
  parent   string
  type     expense/income

------------------------------------------------------------------------

## Currencies

  column     type
  ---------- --------
  code       string
  name       string
  decimals   number

------------------------------------------------------------------------

## Transactions

  column        type
  ------------- -----------
  id            string
  date          date
  description   string
  created_at    timestamp

------------------------------------------------------------------------

## Entries

  column           type
  ---------------- ---------
  id               string
  transaction_id   string
  account_id       string
  amount           integer
  currency         string

Rule:

Sum(amount) per transaction must equal **0**.

------------------------------------------------------------------------

## Budgets

  column        type
  ------------- ------------
  id            string
  category_id   string
  period        month/year
  amount        integer

------------------------------------------------------------------------

## QuickAdd

  column        type
  ------------- ---------
  date          date
  description   string
  account       string
  category      string
  amount        integer

When a row is added:

Generate:

1 Transaction\
2 Entries

------------------------------------------------------------------------

## Config

Stores system settings.

Examples:

default_currency\
current_year

------------------------------------------------------------------------

## AuditLog

  column      type
  ----------- -----------
  id          string
  timestamp   timestamp
  action      string
  entity      string
  entity_id   string
  user        string
