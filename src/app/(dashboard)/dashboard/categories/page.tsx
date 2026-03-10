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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useSpreadsheet } from "@/components/layout/AppLayout";
import { Category } from "@/lib/domain/types";

export default function CategoriesPage() {
    const { spreadsheetId } = useSpreadsheet();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<{ name: string; type: "expense" | "income" | "investment"; parent: string }>({
        name: "",
        type: "expense",
        parent: "",
    });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const loadData = () => {
        if (!spreadsheetId) return;
        setLoading(true);
        fetch(`/api/sheets/categories?spreadsheetId=${spreadsheetId}`)
            .then((r) => r.json())
            .then((catData) => {
                setCategories(catData.categories ?? []);
            })
            .catch(() => setError("Failed to load categories"))
            .finally(() => setLoading(false));
    };

    useEffect(loadData, [spreadsheetId]);

    const handleSubmit = async () => {
        setFormError("");
        setSaving(true);
        try {
            const res = await fetch(`/api/sheets/categories?spreadsheetId=${spreadsheetId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                setFormError(data.error ?? "Failed to save category");
                return;
            }
            setDialogOpen(false);
            setForm({ name: "", type: "expense", parent: "" });
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
                    Categories
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setDialogOpen(true)}
                    disabled={!spreadsheetId}
                >
                    Add Category
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
                                    <TableCell>Parent Category</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {categories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center">
                                            <Typography color="text.secondary" py={3}>
                                                No categories found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    categories.map((c) => (
                                        <TableRow key={c.id} hover>
                                            <TableCell>{c.name}</TableCell>
                                            <TableCell sx={{ textTransform: "capitalize" }}>{c.type}</TableCell>
                                            <TableCell>{c.parent ? getCategoryName(c.parent) : "-"}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Category</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} mt={2}>
                        {formError && <Alert severity="error">{formError}</Alert>}
                        <TextField
                            label="Name"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            fullWidth
                            required
                        />
                        <FormControl fullWidth required>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={form.type}
                                label="Type"
                                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
                            >
                                <MenuItem value="expense">Expense</MenuItem>
                                <MenuItem value="income">Income</MenuItem>
                                <MenuItem value="investment">Investment</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Parent Category</InputLabel>
                            <Select
                                value={form.parent}
                                label="Parent Category"
                                onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
                            >
                                <MenuItem value="">
                                    <em>None</em>
                                </MenuItem>
                                {categories.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={saving || !form.name || !form.type}
                    >
                        {saving ? "Saving…" : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
