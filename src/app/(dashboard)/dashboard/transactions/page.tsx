"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import { useSpreadsheet } from "@/components/layout/AppLayout";
import { Account, Transaction, Entry, Expense } from "@/lib/domain/types";
import { formatAmount, parseAmount } from "@/lib/domain/accounting";

interface TransactionRow extends Transaction {
  entries: Entry[];
}

type MovementRow =
  | { kind: "transaction"; data: TransactionRow }
  | { kind: "expense"; data: Expense };

export default function TransactionsPage() {
  const { spreadsheetId } = useSpreadsheet();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailTx, setDetailTx] = useState<TransactionRow | null>(null);

  // New transaction form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    debitAccountId: "",
    creditAccountId: "",
    amount: "",
    currency: "USD",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [conflictWarning, setConflictWarning] = useState("");

  const loadData = () => {
    if (!spreadsheetId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/sheets/transactions?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
      fetch(`/api/sheets/entries?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
      fetch(`/api/sheets/accounts?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
      fetch(`/api/sheets/expenses?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
    ])
      .then(([txData, entryData, acctData, expenseData]) => {
        const entries: Entry[] = entryData.entries ?? [];
        const txRows: TransactionRow[] = (txData.transactions ?? []).map((tx: Transaction) => ({
          ...tx,
          entries: entries.filter((e) => e.transaction_id === tx.id),
        }));
        setTransactions(txRows);
        setAccounts(acctData.accounts ?? []);
        setExpenses(expenseData.expenses ?? []);
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, [spreadsheetId]);

  // Merge transactions + expenses into a unified sorted list
  const movements: MovementRow[] = [
    ...transactions.map((t): MovementRow => ({ kind: "transaction", data: t })),
    ...expenses.map((e): MovementRow => ({ kind: "expense", data: e })),
  ].sort((a, b) => {
    const dateA = a.kind === "transaction" ? a.data.date : a.data.date;
    const dateB = b.kind === "transaction" ? b.data.date : b.data.date;
    return dateB.localeCompare(dateA);
  });

  const handleSubmit = async () => {
    setFormError("");
    setConflictWarning("");
    try {
      const amount = parseAmount(form.amount);
      const entries = [
        { account_id: form.debitAccountId, amount: amount, currency: form.currency },
        { account_id: form.creditAccountId, amount: -amount, currency: form.currency },
      ];
      setSaving(true);
      const res = await fetch(`/api/sheets/transactions?spreadsheetId=${spreadsheetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, entries }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setConflictWarning(data.error ?? "Conflict detected");
        return;
      }
      if (!res.ok) {
        setFormError(data.error ?? "Failed to save transaction");
        return;
      }
      setDialogOpen(false);
      setForm({
        date: new Date().toISOString().split("T")[0],
        description: "",
        debitAccountId: "",
        creditAccountId: "",
        amount: "",
        currency: "USD",
      });
      loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Invalid input");
    } finally {
      setSaving(false);
    }
  };

  const getAccountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? id;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Movements
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={!spreadsheetId}
        >
          Add Transaction
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Account(s)</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" py={3}>
                        No movements yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m) => {
                    if (m.kind === "expense") {
                      const exp = m.data;
                      const isIncome = exp.amount < 0;
                      return (
                        <TableRow key={exp.id} hover>
                          <TableCell>{exp.date}</TableCell>
                          <TableCell>{exp.description}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={isIncome ? "Income" : "Expense"}
                              color={isIncome ? "success" : "error"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={getAccountName(exp.account_id)} variant="filled" />
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              color={isIncome ? "success.main" : "error.main"}
                              fontWeight={600}
                            >
                              {formatAmount(isIncome ? Math.abs(exp.amount) : -exp.amount, exp.currency)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {/* No actions for expenses yet */}
                          </TableCell>
                        </TableRow>
                      );
                    } else {
                      const tx = m.data;
                      // Find the positive amount (the transferred amount)
                      const transferAmount = tx.entries.find(e => e.amount > 0)?.amount ?? 0;
                      const currency = tx.entries[0]?.currency ?? "USD";

                      return (
                        <TableRow key={tx.id} hover>
                          <TableCell>{tx.date}</TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell>
                            <Chip size="small" label="Transfer" color="primary" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                              {tx.entries.map((e) => (
                                <Chip
                                  key={e.id}
                                  size="small"
                                  label={getAccountName(e.account_id)}
                                  color={e.amount >= 0 ? "success" : "error"}
                                  variant="outlined"
                                />
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={600} color="text.secondary">
                              {formatAmount(transferAmount, currency)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View details">
                              <IconButton
                                size="small"
                                onClick={() => setDetailTx(tx)}
                              >
                                <InfoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    }
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Transaction</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {formError && <Alert severity="error">{formError}</Alert>}
            {conflictWarning && (
              <Alert severity="warning">
                {conflictWarning}
              </Alert>
            )}
            <TextField
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>From Account (Credit)</InputLabel>
              <Select
                value={form.creditAccountId}
                label="From Account (Credit)"
                onChange={(e) => setForm((f) => ({ ...f, creditAccountId: e.target.value }))}
              >
                {accounts.filter((a) => a.active).map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>To Account (Debit)</InputLabel>
              <Select
                value={form.debitAccountId}
                label="To Account (Debit)"
                onChange={(e) => setForm((f) => ({ ...f, debitAccountId: e.target.value }))}
              >
                {accounts.filter((a) => a.active).map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Amount (e.g. 12.50)"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              fullWidth
              helperText="Enter a positive amount. The system will create balanced double entries."
            />
            <TextField
              label="Currency"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              fullWidth
              inputProps={{ maxLength: 3 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={saving || !form.description || !form.debitAccountId || !form.creditAccountId || !form.amount}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!detailTx} onClose={() => setDetailTx(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent>
          {detailTx && (
            <Stack spacing={2} mt={1}>
              <Box>
                <Typography variant="caption" color="text.secondary">Date</Typography>
                <Typography>{detailTx.date}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography>{detailTx.description}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{detailTx.id}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Entries</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Account</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailTx.entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{getAccountName(e.account_id)}</TableCell>
                        <TableCell align="right">
                          <Typography
                            color={e.amount >= 0 ? "success.main" : "error.main"}
                          >
                            {formatAmount(e.amount, e.currency)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailTx(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
