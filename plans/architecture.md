# Architecture

## Overview

Open Budget Ledger is a **frontend-only financial PWA** that uses
**Google Sheets as the primary database**.

There is **no custom backend server**. All data operations occur
through:

-   Google OAuth
-   Google Sheets API
-   Optional Google Apps Script

Deployment target: Vercel.

------------------------------------------------------------------------

## High-Level Architecture

User ↓ PWA (Next.js) ↓ Google APIs ↓ Google Sheets (database)

Optional:

Google Apps Script → spreadsheet automations

------------------------------------------------------------------------

## Main Layers

### 1. UI Layer

Responsibilities:

-   Forms
-   Transaction input
-   Budget editing
-   Reports and charts

Stack:

-   React
-   Material UI
-   Next.js App Router

------------------------------------------------------------------------

### 2. Domain Layer

Handles:

-   Transaction validation
-   Double-entry enforcement
-   Import parsing
-   Budget calculations

Core rules:

Sum(entries.amount) must equal **0**.

------------------------------------------------------------------------

### 3. Data Access Layer

Responsible for:

-   Reading sheets
-   Writing rows
-   Batch updates
-   Conflict detection

Uses:

Google Sheets API.

------------------------------------------------------------------------

## Data Flow Example

Create Transaction

User Input ↓ Domain Validation ↓ Generate Entries ↓ Write Transactions
sheet ↓ Write Entries sheet

------------------------------------------------------------------------

## Import Flow

Upload OFX / CSV ↓ Parse ↓ Preview ↓ User mapping ↓ Generate
transactions + entries ↓ Write to spreadsheet

------------------------------------------------------------------------

## Conflict Handling

Before writing:

1.  Fetch latest sheet revision
2.  Compare with local snapshot
3.  If mismatch → warn user

------------------------------------------------------------------------

## Year Separation

Each year is a **separate spreadsheet**.

Example:

OpenBudget_2026\
OpenBudget_2027

Only the active year is loaded in the application.

------------------------------------------------------------------------

## PWA Features

-   Installable
-   Offline UI caching
-   Works on mobile and desktop

Note: Data operations require internet because Sheets is the database.
