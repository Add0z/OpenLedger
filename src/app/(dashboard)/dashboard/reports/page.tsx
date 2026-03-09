"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
  Grid,
} from "@mui/material";
import { useSpreadsheet } from "@/components/layout/AppLayout";
import { Account, Entry, Transaction, Budget, Category } from "@/lib/domain/types";
import { formatAmount } from "@/lib/domain/accounting";

interface ReportData {
  accountBalances: Array<{ account: Account; balance: number }>;
  monthlySpending: Array<{ month: string; amount: number }>;
  categoryBreakdown: Array<{ category: Category; amount: number }>;
  budgetVsActual: Array<{ budget: Budget; category: Category; spent: number }>;
}

export default function ReportsPage() {
  const { spreadsheetId } = useSpreadsheet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!spreadsheetId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [acctData, entryData, txData, budgetData, catData] = await Promise.all([
          fetch(`/api/sheets/accounts?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
          fetch(`/api/sheets/entries?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
          fetch(`/api/sheets/transactions?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
          fetch(`/api/sheets/budgets?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
          fetch(`/api/sheets/categories?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
        ]);
        const accounts: Account[] = acctData.accounts ?? [];
        const entries: Entry[] = entryData.entries ?? [];
        const transactions: Transaction[] = txData.transactions ?? [];
        const budgets: Budget[] = budgetData.budgets ?? [];
        const categories: Category[] = catData.categories ?? [];

        // Build transaction date lookup
        const txDateMap = new Map<string, string>(
          transactions.map((tx) => [tx.id, tx.date])
        );

        // Account balances (sum entries per account)
        const balanceMap = new Map<string, number>();
        entries.forEach((e) => {
          balanceMap.set(e.account_id, (balanceMap.get(e.account_id) ?? 0) + e.amount);
        });
        const accountBalances = accounts
          .filter((a) => a.active)
          .map((account) => ({ account, balance: balanceMap.get(account.id) ?? 0 }));

        // Monthly spending (expense entries grouped by month)
        const expenseAccountIds = new Set(
          accounts.filter((a) => a.type === "expense").map((a) => a.id)
        );
        const monthlyMap = new Map<string, number>();
        entries.forEach((e) => {
          if (!expenseAccountIds.has(e.account_id)) return;
          const date = txDateMap.get(e.transaction_id) ?? "";
          const month = date.slice(0, 7);
          if (month.startsWith(String(selectedYear))) {
            monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + Math.abs(e.amount));
          }
        });
        const monthlySpending = Array.from(monthlyMap.entries())
          .map(([month, amount]) => ({ month, amount }))
          .sort((a, b) => a.month.localeCompare(b.month));

        // Category breakdown (expense entries by category account name)
        const categoryBreakdown: Array<{ category: Category; amount: number }> = [];
        categories.forEach((cat) => {
          const catAccount = accounts.find((a) => a.name === cat.name);
          if (!catAccount) return;
          const spent = entries
            .filter((e) => e.account_id === catAccount.id)
            .reduce((sum, e) => sum + Math.abs(e.amount), 0);
          if (spent > 0) categoryBreakdown.push({ category: cat, amount: spent });
        });

        // Budget vs Actual
        const budgetVsActual = budgets.map((b) => {
          const category = categories.find((c) => c.id === b.category_id);
          const catAccount = accounts.find((a) => a.name === category?.name);
          const spent = catAccount
            ? entries
                .filter((e) => {
                  const date = txDateMap.get(e.transaction_id) ?? "";
                  return e.account_id === catAccount.id && date.startsWith(b.period);
                })
                .reduce((sum, e) => sum + Math.abs(e.amount), 0)
            : 0;
          return { budget: b, category: category ?? { id: b.category_id, name: b.category_id, parent: "", type: "expense" as const }, spent };
        });

        setReportData({ accountBalances, monthlySpending, categoryBreakdown, budgetVsActual });
      } catch {
        setError("Failed to load report data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [spreadsheetId, selectedYear]);

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Reports
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={selectedYear}
            label="Year"
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : reportData ? (
        <Grid container spacing={3}>
          {/* Account Balances */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Account Balances
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Account</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.accountBalances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography color="text.secondary" variant="body2">No data</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.accountBalances.map(({ account, balance }) => (
                        <TableRow key={account.id}>
                          <TableCell>{account.name}</TableCell>
                          <TableCell>{account.type}</TableCell>
                          <TableCell align="right">
                            <Typography color={balance >= 0 ? "success.main" : "error.main"}>
                              {formatAmount(balance, account.currency)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Monthly Spending */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Monthly Spending ({selectedYear})
                </Typography>
                {reportData.monthlySpending.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">No spending data</Typography>
                ) : (
                  <Stack spacing={1} divider={<Divider />}>
                    {reportData.monthlySpending.map(({ month, amount }) => (
                      <Box key={month} display="flex" justifyContent="space-between">
                        <Typography variant="body2">{month}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatAmount(amount, "USD")}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Budget vs Actual */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Budget vs Actual
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell align="right">Budget</TableCell>
                      <TableCell align="right">Spent</TableCell>
                      <TableCell align="right">Remaining</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.budgetVsActual.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary" variant="body2">No budget data</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.budgetVsActual.map(({ budget, category, spent }) => {
                        const remaining = budget.amount - spent;
                        return (
                          <TableRow key={budget.id}>
                            <TableCell>{category.name}</TableCell>
                            <TableCell>{budget.period}</TableCell>
                            <TableCell align="right">{formatAmount(budget.amount, "USD")}</TableCell>
                            <TableCell align="right">{formatAmount(spent, "USD")}</TableCell>
                            <TableCell align="right">
                              <Typography color={remaining >= 0 ? "success.main" : "error.main"}>
                                {formatAmount(remaining, "USD")}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info">Select a spreadsheet to view reports.</Alert>
      )}
    </Box>
  );
}
