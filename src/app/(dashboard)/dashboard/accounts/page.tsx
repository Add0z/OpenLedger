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
  Chip,
  Switch,
  FormControlLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useSpreadsheet } from "@/components/layout/AppLayout";
import { Account, AccountType } from "@/lib/domain/types";

const ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "income", "expense", "equity"];

export default function AccountsPage() {
  const { spreadsheetId } = useSpreadsheet();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "asset" as AccountType,
    currency: "USD",
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadAccounts = () => {
    if (!spreadsheetId) return;
    setLoading(true);
    fetch(`/api/sheets/accounts?spreadsheetId=${spreadsheetId}`)
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts ?? []))
      .catch(() => setError("Failed to load accounts"))
      .finally(() => setLoading(false));
  };

  useEffect(loadAccounts, [spreadsheetId]);

  const handleSubmit = async () => {
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/sheets/accounts?spreadsheetId=${spreadsheetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to save account");
        return;
      }
      setDialogOpen(false);
      setForm({ name: "", type: "asset", currency: "USD", active: true });
      loadAccounts();
    } catch {
      setFormError("Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  const typeColor: Record<AccountType, "primary" | "error" | "success" | "warning" | "default"> = {
    asset: "primary",
    liability: "error",
    income: "success",
    expense: "warning",
    equity: "default",
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Accounts
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={!spreadsheetId}
        >
          Add Account
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
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Currency</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary" py={3}>
                        No accounts yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={a.type}
                          size="small"
                          color={typeColor[a.type]}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{a.currency}</TableCell>
                      <TableCell>
                        <Chip
                          label={a.active ? "Active" : "Inactive"}
                          size="small"
                          color={a.active ? "success" : "default"}
                        />
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
        <DialogTitle>Add Account</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Account Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={form.type}
                label="Type"
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Currency (e.g. USD, EUR)"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              fullWidth
              inputProps={{ maxLength: 3 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={saving || !form.name}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
