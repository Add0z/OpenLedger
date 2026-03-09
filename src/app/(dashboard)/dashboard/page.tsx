"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import Link from "next/link";
import { useSpreadsheet } from "@/components/layout/AppLayout";
import { Account, Transaction } from "@/lib/domain/types";
import { formatAmount } from "@/lib/domain/accounting";

export default function DashboardPage() {
  const { spreadsheetId, spreadsheets } = useSpreadsheet();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!spreadsheetId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [acctData, txData] = await Promise.all([
          fetch(`/api/sheets/accounts?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
          fetch(`/api/sheets/transactions?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
        ]);
        setAccounts(acctData.accounts ?? []);
        setTransactions(txData.transactions ?? []);
      } catch {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [spreadsheetId]);

  const assetAccounts = accounts.filter((a) => a.type === "asset" && a.active);
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  if (spreadsheets.length === 0 && !loading) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} mb={3}>
          Welcome to OpenLedger
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          You don&apos;t have any spreadsheets yet. Create one for the current year to get started.
        </Alert>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={Link}
          href="/dashboard/settings"
        >
          Create Spreadsheet
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={Link}
          href="/dashboard/transactions"
        >
          Add Transaction
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Account balance cards */}
          {assetAccounts.map((account) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={account.id}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <AccountBalanceIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" color="text.secondary">
                      {account.name}
                    </Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight={700}>
                    {formatAmount(0, account.currency)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {account.currency} · {account.type}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Recent transactions */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight={600}>
                    Recent Transactions
                  </Typography>
                  <Button size="small" component={Link} href="/dashboard/transactions">
                    View all
                  </Button>
                </Stack>
                {recentTransactions.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    No transactions yet. Add your first transaction to get started.
                  </Typography>
                ) : (
                  <Stack divider={<Divider />} spacing={0}>
                    {recentTransactions.map((tx) => (
                      <Box key={tx.id} py={1.5} display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {tx.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tx.date}
                          </Typography>
                        </Box>
                        <TrendingUpIcon fontSize="small" color="success" />
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick actions */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Quick Actions
                </Typography>
                <Stack spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    fullWidth
                    component={Link}
                    href="/dashboard/transactions"
                  >
                    New Transaction
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<TrendingDownIcon />}
                    fullWidth
                    component={Link}
                    href="/dashboard/quickadd"
                  >
                    Quick Add
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<TrendingUpIcon />}
                    fullWidth
                    component={Link}
                    href="/dashboard/import"
                  >
                    Import Transactions
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
