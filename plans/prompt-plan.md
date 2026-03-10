# Open Budget Ledger -- Project Prompt Plan

## 1. Project Overview

Build an open‑source personal finance **PWA** using **React + Next.js**
that uses **Google Sheets as the only database**.

The system must support **double‑entry accounting** and allow both
**spreadsheet‑first and app‑first workflows**.

The spreadsheet is the **source of truth**.

The application should be deployable on Vercel and require **no
traditional backend server**.

------------------------------------------------------------------------

## 2. Core Principles

1.  Spreadsheet is the source of truth
2.  The app must never corrupt ledger integrity
3.  Use double‑entry bookkeeping
4.  The system must remain simple for spreadsheet users
5.  Each year is stored in a separate spreadsheet
6.  The system must work without a traditional backend
7.  Data integrity is more important than UX convenience

------------------------------------------------------------------------

## 3. Tech Stack

Frontend: - React - Next.js - TypeScript - Material UI

Authentication: - Google OAuth

Database: - Google Sheets

Hosting: - Vercel

Format: - Progressive Web App (PWA)

------------------------------------------------------------------------

## 4. Financial Data Rules

Financial data must follow **double‑entry bookkeeping**.

Transactions contain metadata.

Entries contain the actual ledger records.

Rule:

Sum(entries.amount) per transaction must always equal **0**.

All financial values must be stored as **integers in the smallest
currency unit** (cents).

Never use floating point numbers for money.

------------------------------------------------------------------------

## 5. Spreadsheet Structure

Each yearly spreadsheet must contain the following sheets:

-   Accounts
-   Categories
-   Currencies
-   Budgets
-   Transactions
-   Entries
-   QuickAdd
-   Config
-   AuditLog

------------------------------------------------------------------------

## 6. QuickAdd System

The **QuickAdd** sheet allows spreadsheet users to quickly insert
transactions.

If a row is inserted in QuickAdd:

The system must automatically generate:

-   1 Transaction record
-   2 or more Entry records (double entry)

This can be implemented using:

-   Google Apps Script
-   Or logic in the web application

------------------------------------------------------------------------

## 7. Multi‑Year Architecture

Each year is stored in a separate spreadsheet.

Example:

OpenBudget_2025\
OpenBudget_2026\
OpenBudget_2027

When creating a new year:

1.  Copy configuration tables
2.  Copy accounts
3.  Copy categories
4.  Generate opening balance transaction

Example:

Opening Transaction

date: Jan 1\
description: Opening Balance

Entries:

Account balance from previous year\
Opening Equity account

------------------------------------------------------------------------

## 8. Import System

Supported formats:

-   OFX
-   CSV (bank export)

Import flow:

1.  Upload file
2.  Parse transactions
3.  Allow mapping to accounts/categories
4.  Generate transactions and entries

------------------------------------------------------------------------

## 9. Conflict Detection

The system is **online‑first**.

Since users may edit the spreadsheet manually:

The application must:

-   Detect external modifications
-   Warn the user before writing changes
-   Avoid overwriting manual edits

------------------------------------------------------------------------

## 10. Reports

Initial reporting features:

-   Monthly spending
-   Category breakdown
-   Account balances
-   Budget vs Actual
-   Cashflow

Charts should be simple and clear.

------------------------------------------------------------------------

## 11. Constraints

The project must **not use a custom backend server**.

Allowed components:

-   Frontend application
-   Google APIs
-   Google Sheets
-   Optional Google Apps Script

------------------------------------------------------------------------

## 12. Open Source

The project must be open source.

Recommended license:

AGPL‑3.0

Goal:

Prevent closed‑source forks while encouraging contributions.

------------------------------------------------------------------------

## 13. UX Principles

Design priorities:

-   Simplicity
-   Spreadsheet compatibility
-   Minimal friction
-   Clear financial data visualization

------------------------------------------------------------------------

## 14. Data Integrity Rule

Always prioritize **data integrity over UX convenience**.

Financial records must **never be silently modified**.

Every change must be traceable through the **AuditLog** sheet.
