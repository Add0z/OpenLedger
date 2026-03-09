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
} from "@mui/material";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import AddIcon from "@mui/icons-material/Add";
import { useSpreadsheet } from "@/components/layout/AppLayout";
import { QuickAddRow } from "@/lib/domain/types";
import { formatAmount } from "@/lib/domain/accounting";

export default function QuickAddPage() {
  const { spreadsheetId } = useSpreadsheet();
  const [rows, setRows] = useState<QuickAddRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    account: "",
    category: "",
    amount: "",
  });
  const [saving, setSaving] = useState(false);

  const loadRows = () => {
    if (!spreadsheetId) return;
    setLoading(true);
    fetch(`/api/sheets/quickadd?spreadsheetId=${spreadsheetId}`)
      .then((r) => r.json())
      .then((data) => setRows(data.rows ?? []))
      .catch(() => setError("Failed to load QuickAdd rows"))
      .finally(() => setLoading(false));
  };

  useEffect(loadRows, [spreadsheetId]);

  const handleAdd = async () => {
    setSaving(true);
    setError("");
    try {
      const amount = parseInt(form.amount.replace(/[^0-9-]/g, ""), 10);
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
      setForm({
        date: new Date().toISOString().split("T")[0],
        description: "",
        account: "",
        category: "",
        amount: "",
      });
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
      setSuccess(`Processed ${data.processed} transaction(s) successfully`);
      loadRows();
    } catch {
      setError("Failed to process rows");
    } finally {
      setProcessing(false);
    }
  };

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
        Add quick entries here. When you click &quot;Process All&quot;, each row is converted into a
        double-entry transaction and written to the Transactions and Entries sheets.
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
            <TextField
              label="Account"
              size="small"
              value={form.account}
              onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="Category"
              size="small"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="Amount (cents)"
              size="small"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
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
                      <TableCell>{row.account}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell align="right">
                        {formatAmount(row.amount, "USD")}
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
