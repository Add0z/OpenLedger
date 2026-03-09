"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Box, Toolbar, useMediaQuery, useTheme, Alert, Snackbar } from "@mui/material";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

interface SpreadsheetContextValue {
  spreadsheetId: string;
  spreadsheets: Array<{ id: string; name: string }>;
  setSpreadsheetId: (id: string) => void;
  refreshSpreadsheets: () => void;
}

export const SpreadsheetContext = createContext<SpreadsheetContextValue>({
  spreadsheetId: "",
  spreadsheets: [],
  setSpreadsheetId: () => {},
  refreshSpreadsheets: () => {},
});

export function useSpreadsheet() {
  return useContext(SpreadsheetContext);
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [spreadsheets, setSpreadsheets] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState("");
  const [loadTrigger, setLoadTrigger] = useState(0);

  const refreshSpreadsheets = useCallback(() => {
    setLoadTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        const res = await fetch("/api/sheets/spreadsheets");
        if (!res.ok) return;
        const data = await res.json();
        const list: Array<{ id: string; name: string }> = data.spreadsheets ?? [];
        setSpreadsheets(list);
        if (list.length > 0 && !spreadsheetId) {
          setSpreadsheetId(list[0].id);
        }
      } catch {
        setError("Failed to load spreadsheets");
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loadTrigger]);

  if (status === "loading" || status === "unauthenticated") {
    return null;
  }

  return (
    <SpreadsheetContext.Provider
      value={{ spreadsheetId, spreadsheets, setSpreadsheetId, refreshSpreadsheets }}
    >
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <TopBar
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          spreadsheetId={spreadsheetId}
          spreadsheets={spreadsheets}
          onSpreadsheetChange={setSpreadsheetId}
        />
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          variant={isMobile ? "temporary" : "permanent"}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            minHeight: "100vh",
            backgroundColor: "grey.50",
          }}
        >
          <Toolbar />
          {children}
        </Box>

        <Snackbar
          open={!!error}
          autoHideDuration={5000}
          onClose={() => setError("")}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </SpreadsheetContext.Provider>
  );
}
