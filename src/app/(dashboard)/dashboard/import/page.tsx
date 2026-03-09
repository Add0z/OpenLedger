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
  Stepper,
  Step,
  StepLabel,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useSpreadsheet } from "@/components/layout/AppLayout";
import { parseOFX, ParsedImportTransaction } from "@/lib/import/ofx";
import { parseCSV, CSVColumnMapping } from "@/lib/import/csv";
import { formatAmount } from "@/lib/domain/accounting";

const STEPS = ["Upload File", "Preview & Map", "Import"];

export default function ImportPage() {
  const { spreadsheetId } = useSpreadsheet();
  const [activeStep, setActiveStep] = useState(0);
  const [fileType, setFileType] = useState<"ofx" | "csv">("ofx");
  const [parsed, setParsed] = useState<ParsedImportTransaction[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);

  // CSV mapping settings
  const [csvMapping, setCsvMapping] = useState<CSVColumnMapping>({
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 2,
    dateFormat: "YYYY-MM-DD",
    delimiter: ",",
    hasHeader: true,
    defaultCurrency: "USD",
    decimalSeparator: ".",
  });

  // Account mapping
  const [debitAccountId, setDebitAccountId] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        let transactions: ParsedImportTransaction[];
        if (fileType === "ofx") {
          transactions = parseOFX(content);
        } else {
          transactions = parseCSV(content, csvMapping);
        }
        setParsed(transactions);
        setActiveStep(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse file");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!spreadsheetId || parsed.length === 0) return;
    setImporting(true);
    let success = 0;
    let errors = 0;

    for (const tx of parsed) {
      try {
        const entries = [
          { account_id: debitAccountId || "unknown", amount: tx.amount, currency: tx.currency },
          { account_id: "equity", amount: -tx.amount, currency: tx.currency },
        ];
        const res = await fetch(`/api/sheets/transactions?spreadsheetId=${spreadsheetId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: tx.date,
            description: tx.description,
            entries,
          }),
        });
        if (res.ok) {
          success++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    setImportResult({ success, errors });
    setImporting(false);
    setActiveStep(2);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Import Transactions
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Upload File</Typography>
            <Stack spacing={3}>
              <FormControl sx={{ maxWidth: 200 }}>
                <InputLabel>File Type</InputLabel>
                <Select
                  value={fileType}
                  label="File Type"
                  onChange={(e) => setFileType(e.target.value as "ofx" | "csv")}
                >
                  <MenuItem value="ofx">OFX / QFX</MenuItem>
                  <MenuItem value="csv">CSV</MenuItem>
                </Select>
              </FormControl>

              {fileType === "csv" && (
                <Stack spacing={2}>
                  <Typography variant="subtitle2">CSV Column Mapping (0-based index)</Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
                    <TextField
                      label="Date Column"
                      type="number"
                      size="small"
                      value={csvMapping.dateColumn}
                      onChange={(e) => setCsvMapping((m) => ({ ...m, dateColumn: parseInt(e.target.value) }))}
                      sx={{ width: 130 }}
                    />
                    <TextField
                      label="Description Column"
                      type="number"
                      size="small"
                      value={csvMapping.descriptionColumn}
                      onChange={(e) => setCsvMapping((m) => ({ ...m, descriptionColumn: parseInt(e.target.value) }))}
                      sx={{ width: 180 }}
                    />
                    <TextField
                      label="Amount Column"
                      type="number"
                      size="small"
                      value={csvMapping.amountColumn}
                      onChange={(e) => setCsvMapping((m) => ({ ...m, amountColumn: parseInt(e.target.value) }))}
                      sx={{ width: 150 }}
                    />
                    <FormControl size="small" sx={{ width: 160 }}>
                      <InputLabel>Date Format</InputLabel>
                      <Select
                        value={csvMapping.dateFormat}
                        label="Date Format"
                        onChange={(e) => setCsvMapping((m) => ({ ...m, dateFormat: e.target.value as CSVColumnMapping["dateFormat"] }))}
                      >
                        <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                        <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                        <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                        <MenuItem value="MM-DD-YYYY">MM-DD-YYYY</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </Stack>
              )}

              <Box>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<UploadFileIcon />}
                >
                  Choose File
                  <input
                    type="file"
                    hidden
                    accept={fileType === "ofx" ? ".ofx,.qfx" : ".csv"}
                    onChange={handleFileUpload}
                  />
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {activeStep === 1 && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Preview — {parsed.length} transactions found
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setActiveStep(0)}>Back</Button>
                <Button
                  variant="contained"
                  onClick={handleImport}
                  disabled={importing || parsed.length === 0}
                >
                  {importing ? <CircularProgress size={20} /> : "Import All"}
                </Button>
              </Stack>
            </Stack>

            <Alert severity="info" sx={{ mb: 2 }}>
              Each transaction will create 2 journal entries (double-entry bookkeeping).
              Assign the target account below.
            </Alert>

            <TextField
              label="Target Account ID (debit)"
              value={debitAccountId}
              onChange={(e) => setDebitAccountId(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              helperText="Enter the account ID to debit/credit for imports"
            />

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Currency</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsed.slice(0, 50).map((tx, i) => (
                  <TableRow key={i}>
                    <TableCell>{tx.date}</TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell align="right">
                      <Typography color={tx.amount >= 0 ? "success.main" : "error.main"}>
                        {formatAmount(tx.amount, tx.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell>{tx.currency}</TableCell>
                  </TableRow>
                ))}
                {parsed.length > 50 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="caption" color="text.secondary">
                        … and {parsed.length - 50} more
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeStep === 2 && importResult && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Import Complete</Typography>
            <Stack spacing={2}>
              <Alert severity={importResult.errors === 0 ? "success" : "warning"}>
                Imported {importResult.success} transactions successfully.
                {importResult.errors > 0 && ` ${importResult.errors} failed.`}
              </Alert>
              <Button
                variant="outlined"
                onClick={() => {
                  setActiveStep(0);
                  setParsed([]);
                  setImportResult(null);
                }}
              >
                Import More
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
