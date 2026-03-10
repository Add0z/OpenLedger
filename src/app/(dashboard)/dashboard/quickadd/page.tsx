"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Stack,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import AddIcon from "@mui/icons-material/Add";
import { useSpreadsheet } from "@/components/layout/AppLayout";
import { QuickAddRow, Account, Category } from "@/lib/domain/types";
import { formatAmount, parseAmount } from "@/lib/domain/accounting";

export default function QuickAddPage() {
  const { spreadsheetId } = useSpreadsheet();
  const [rows, setRows] = useState<QuickAddRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    date: "", // Start empty to prevent hydration mismatch
    description: "",
    account: "",
    category: "",
    amount: "",
  });
  const [saving, setSaving] = useState(false);

  const loadRows = () => {
    if (!spreadsheetId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/sheets/quickadd?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
      fetch(`/api/sheets/accounts?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
      fetch(`/api/sheets/categories?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
    ])
      .then(([quickAddData, accountData, categoryData]) => {
        setRows(quickAddData.rows ?? []);
        setAccounts(accountData.accounts ?? []);
        setCategories(categoryData.categories ?? []);
      })
      .catch(() => setError("Failed to load QuickAdd data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRows();
    // Set today's date after mount to avoid hydration mismatch
    setForm((prev) => ({
      ...prev,
      date: new Date().toISOString().split("T")[0],
    }));
  }, [spreadsheetId]);

  const handleAdd = async () => {
    setSaving(true);
    setError("");
    try {
      const amount = parseAmount(form.amount);
      const res = await fetch(`/api/sheets/quickadd?spreadsheetId=${spreadsheetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to add row");
        return;
      }
      setForm((prev) => ({
        date: new Date().toISOString().split("T")[0],
        description: "",
        account: prev.account,
        category: prev.category,
        amount: "",
      }));
      loadRows();
    } catch {
      setError("Failed to add row");
    } finally {
      setSaving(false);
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/sheets/quickadd?spreadsheetId=${spreadsheetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process", currency: "USD" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to process");
        return;
      }
      setSuccess(`Processed ${data.processed} expense(s) successfully`);
      loadRows();
    } catch {
      setError("Failed to process rows");
    } finally {
      setProcessing(false);
    }
  };

  const getAccountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  const getAccountCurrency = (id: string) => accounts.find((a) => a.id === id)?.currency ?? "USD";
  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Quick Add
        </Typography>
        <Button
          variant="contained"
          startIcon={processing ? <CircularProgress size={16} /> : <FlashOnIcon />}
          onClick={handleProcess}
          disabled={processing || rows.length === 0 || !spreadsheetId}
          color="secondary"
        >
          Process All ({rows.length})
        </Button>
      </Stack>

      <Alert severity="info" sx={{ mb: 3 }}>
        Add quick entries here. When you click &quot;Process All&quot;, each row is converted into an
        expense and written to the Expenses sheet.
        The QuickAdd sheet is then cleared.
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Add row form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>Add Row</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap">
            <TextField
              label="Date"
              type="date"
              size="small"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="Description"
              size="small"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              sx={{ flexGrow: 1, minWidth: 180 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Account</InputLabel>
              <Select
                label="Account"
                value={form.account}
                onChange={(e) => setForm((f) => ({ ...f, account: e.target.value as string }))}
              >
                {accounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as string }))}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Amount"
              size="small"
              value={form.amount}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, ""); // strip non-digits
                if (!val) {
                  setForm((f) => ({ ...f, amount: "" }));
                  return;
                }
                const num = parseInt(val, 10);
                const formatted = (num / 100).toFixed(2);
                setForm((f) => ({ ...f, amount: formatted }));
              }}
              placeholder="0.00"
              sx={{ minWidth: 140 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              disabled={saving || !form.date || !form.amount}
            >
              {saving ? "Adding…" : "Add"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Pending rows */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box px={2} py={1.5} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Pending Rows{" "}
              <Chip label={rows.length} size="small" color="primary" sx={{ ml: 1 }} />
            </Typography>
          </Box>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" py={2}>
                        No pending rows
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>{getAccountName(row.account)}</TableCell>
                      <TableCell>{getCategoryName(row.category)}</TableCell>
                      <TableCell align="right">
                        {formatAmount(row.amount, getAccountCurrency(row.account))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
