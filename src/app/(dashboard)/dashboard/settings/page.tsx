"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Stack,
  TextField,
  Divider,
  CircularProgress,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useSpreadsheet } from "@/components/layout/AppLayout";

export default function SettingsPage() {
  const { spreadsheetId, spreadsheets, refreshSpreadsheets } = useSpreadsheet();
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const handleCreateSpreadsheet = async () => {
    setCreating(true);
    setCreateError("");
    setCreateSuccess("");
    try {
      const res = await fetch("/api/sheets/spreadsheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: parseInt(newYear, 10) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Failed to create spreadsheet");
        return;
      }
      setCreateSuccess(`Created spreadsheet with ID: ${data.spreadsheetId}`);
      refreshSpreadsheets();
    } catch {
      setCreateError("Failed to create spreadsheet");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Settings
      </Typography>

      {/* Current spreadsheets */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>Your Spreadsheets</Typography>
          {spreadsheets.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              No spreadsheets found. Create one below.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {spreadsheets.map((s) => (
                <Box key={s.id} display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={s.name}
                    color={s.id === spreadsheetId ? "primary" : "default"}
                    variant={s.id === spreadsheetId ? "filled" : "outlined"}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                    {s.id}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Create new spreadsheet */}
      <Card>
        <CardContent>
          <Typography variant="h6" mb={1}>Create New Year Spreadsheet</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Each year is stored in a separate Google Spreadsheet (e.g., OpenBudget_2026).
            The new spreadsheet will have all required sheets with headers pre-configured.
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          {createSuccess && <Alert severity="success" sx={{ mb: 2 }}>{createSuccess}</Alert>}

          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Year"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              size="small"
              sx={{ width: 100 }}
              inputProps={{ min: 2000, max: 2100 }}
            />
            <Button
              variant="contained"
              startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
              onClick={handleCreateSpreadsheet}
              disabled={creating || !newYear}
            >
              {creating ? "Creating…" : "Create Spreadsheet"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
