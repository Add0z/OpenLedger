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
import { Account, Entry, Transaction, Budget, Category, Expense } from "@/lib/domain/types";
import { formatAmount, computeAccountBalances } from "@/lib/domain/accounting";

interface ReportData {
  accountBalances: Array<{ account: Account; balance: number }>;
  monthlySpending: Array<{ month: string; amount: number }>;
  categoryBreakdown: Array<{ category: Category; amount: number }>;
  budgetVsActual: Array<{ budget: Budget; category: Category; spent: number }>;
  cashflow: Array<{ month: string; inflow: number; outflow: number; net: number }>;
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
        const [acctData, entryData, txData, budgetData, catData, expenseData] = await Promise.all([
          fetch(`/api/sheets/accounts?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
          fetch(`/api/sheets/entries?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
          fetch(`/api/sheets/transactions?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
          fetch(`/api/sheets/budgets?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
          fetch(`/api/sheets/categories?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
          fetch(`/api/sheets/expenses?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
        ]);
        const accounts: Account[] = acctData.accounts ?? [];
        const entries: Entry[] = entryData.entries ?? [];
        const transactions: Transaction[] = txData.transactions ?? [];
        const budgets: Budget[] = budgetData.budgets ?? [];
        const categories: Category[] = catData.categories ?? [];
        const expenses: Expense[] = expenseData.expenses ?? [];

        // Account balances (initialBalance + entries)
        const balanceMapResult = computeAccountBalances(accounts, entries);
        const accountBalances = accounts
          .filter((a) => a.active)
          .map((account) => ({ account, balance: balanceMapResult.get(account.id) ?? 0 }));

        // Monthly spending (from expenses table, grouped by month)
        const monthlyMap = new Map<string, number>();
        expenses.forEach((e) => {
          const month = e.date.slice(0, 7);
          if (month.startsWith(String(selectedYear))) {
            monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + e.amount);
          }
        });
        const monthlySpending = Array.from(monthlyMap.entries())
          .map(([month, amount]) => ({ month, amount }))
          .sort((a, b) => a.month.localeCompare(b.month));

        // Category breakdown (expenses grouped by category_id)
        const catMap = new Map<string, number>();
        expenses.forEach((e) => {
          if (e.date.startsWith(String(selectedYear))) {
            catMap.set(e.category_id, (catMap.get(e.category_id) ?? 0) + e.amount);
          }
        });
        const categoryBreakdown: Array<{ category: Category; amount: number }> = [];
        catMap.forEach((amount, catId) => {
          const category = categories.find((c) => c.id === catId);
          if (category) categoryBreakdown.push({ category, amount });
        });
        categoryBreakdown.sort((a, b) => b.amount - a.amount);

        // Budget vs Actual (using expenses)
        const budgetVsActual = budgets.map((b) => {
          const category = categories.find((c) => c.id === b.category_id);
          const spent = expenses
            .filter((e) => e.category_id === b.category_id && e.date.startsWith(b.period))
            .reduce((sum, e) => sum + e.amount, 0);
          return { budget: b, category: category ?? { id: b.category_id, name: b.category_id, parent: "", type: "expense" as const }, spent };
        });

        // Cashflow: outflows from expenses by month (income tracking not yet implemented)
        const cashflowMap = new Map<string, { inflow: number; outflow: number }>();
        expenses.forEach((e) => {
          const month = e.date.slice(0, 7);
          if (!month.startsWith(String(selectedYear))) return;
          const bucket = cashflowMap.get(month) ?? { inflow: 0, outflow: 0 };
          bucket.outflow += e.amount;
          cashflowMap.set(month, bucket);
        });
        const cashflow = Array.from(cashflowMap.entries())
          .map(([month, { inflow, outflow }]) => ({ month, inflow, outflow, net: inflow - outflow }))
          .sort((a, b) => a.month.localeCompare(b.month));

        setReportData({ accountBalances, monthlySpending, categoryBreakdown, budgetVsActual, cashflow });
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

          {/* Cashflow */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Cashflow ({selectedYear})
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Month</TableCell>
                      <TableCell align="right">Inflow</TableCell>
                      <TableCell align="right">Outflow</TableCell>
                      <TableCell align="right">Net</TableCell>
                      <TableCell align="right">Cumulative</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.cashflow.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary" variant="body2">No cashflow data</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (() => {
                        let cumulative = 0;
                        return reportData.cashflow.map(({ month, inflow, outflow, net }) => {
                          cumulative += net;
                          return (
                            <TableRow key={month}>
                              <TableCell>{month}</TableCell>
                              <TableCell align="right">
                                <Typography color="success.main">{formatAmount(inflow, "USD")}</Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography color="error.main">{formatAmount(outflow, "USD")}</Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography color={net >= 0 ? "success.main" : "error.main"}>
                                  {formatAmount(net, "USD")}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography fontWeight={600} color={cumulative >= 0 ? "success.main" : "error.main"}>
                                  {formatAmount(cumulative, "USD")}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()
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
