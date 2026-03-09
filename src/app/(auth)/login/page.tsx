"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import GoogleIcon from "@mui/icons-material/Google";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1976d2 0%, #388e3c 100%)",
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: "100%", borderRadius: 3, boxShadow: 8 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" spacing={2} mb={3}>
            <AccountBalanceIcon sx={{ fontSize: 56, color: "primary.main" }} />
            <Typography variant="h4" fontWeight={700} textAlign="center">
              OpenLedger
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Open-source personal finance with double-entry bookkeeping,
              powered by Google Sheets.
            </Typography>
          </Stack>

          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              fullWidth
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              Sign in with Google
            </Button>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Your data stays in your own Google Sheets. We never store your
              financial data on our servers.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
