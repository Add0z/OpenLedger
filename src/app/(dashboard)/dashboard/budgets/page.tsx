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
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  LinearProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useSpreadsheet } from "@/components/layout/AppLayout";
import { Budget, Category } from "@/lib/domain/types";
import { formatAmount, parseAmount } from "@/lib/domain/accounting";

export default function BudgetsPage() {
  const { spreadsheetId } = useSpreadsheet();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    category_id: "",
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    amount: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadData = () => {
    if (!spreadsheetId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/sheets/budgets?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
      fetch(`/api/sheets/categories?spreadsheetId=${spreadsheetId}`).then((r) => r.json()),
    ])
      .then(([budgetData, catData]) => {
        setBudgets(budgetData.budgets ?? []);
        setCategories(catData.categories ?? []);
      })
      .catch(() => setError("Failed to load budgets"))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, [spreadsheetId]);

  const handleSubmit = async () => {
    setFormError("");
    setSaving(true);
    try {
      const amount = parseAmount(form.amount);
      const res = await fetch(`/api/sheets/budgets?spreadsheetId=${spreadsheetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to save budget");
        return;
      }
      setDialogOpen(false);
      setForm({ category_id: "", period: new Date().toISOString().slice(0, 7), amount: "" });
      loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Invalid input");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Budgets
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={!spreadsheetId}
        >
          Add Budget
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
                  <TableCell>Category</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Budget Amount</TableCell>
                  <TableCell>Progress</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {budgets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary" py={3}>
                        No budgets yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  budgets.map((b) => (
                    <TableRow key={b.id} hover>
                      <TableCell>{getCategoryName(b.category_id)}</TableCell>
                      <TableCell>{b.period}</TableCell>
                      <TableCell>{formatAmount(b.amount, "USD")}</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>
                        <LinearProgress variant="determinate" value={0} />
                        <Typography variant="caption" color="text.secondary">
                          $0 spent
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Budget</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={form.category_id}
                label="Category"
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Period (YYYY-MM)"
              value={form.period}
              onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
              fullWidth
              helperText="Monthly: YYYY-MM, Annual: YYYY"
            />
            <TextField
              label="Budget Amount (e.g. 500.00)"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={saving || !form.category_id || !form.amount}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
