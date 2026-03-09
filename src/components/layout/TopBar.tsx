"use client";

import { useSession, signOut } from "next-auth/react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Box,
  Menu,
  MenuItem,
  Tooltip,
  Select,
  FormControl,
  SelectChangeEvent,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import { useState } from "react";

interface TopBarProps {
  onMenuToggle: () => void;
  spreadsheetId: string;
  spreadsheets: Array<{ id: string; name: string }>;
  onSpreadsheetChange: (id: string) => void;
}

export function TopBar({
  onMenuToggle,
  spreadsheetId,
  spreadsheets,
  onSpreadsheetChange,
}: TopBarProps) {
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleSpreadsheetChange = (event: SelectChangeEvent) => {
    onSpreadsheetChange(event.target.value);
  };

  return (
    <AppBar
      position="fixed"
      elevation={1}
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuToggle}
          aria-label="toggle navigation"
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
          OpenLedger
        </Typography>

        {spreadsheets.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={spreadsheetId}
              onChange={handleSpreadsheetChange}
              sx={{ color: "white", ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.5)" } }}
            >
              {spreadsheets.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Box>
          <Tooltip title={session?.user?.email ?? "Account"}>
            <IconButton onClick={handleAvatarClick} sx={{ p: 0.5 }}>
              <Avatar
                src={session?.user?.image ?? undefined}
                alt={session?.user?.name ?? "User"}
                sx={{ width: 32, height: 32 }}
              />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem disabled>
              <Typography variant="body2">{session?.user?.email}</Typography>
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleClose();
                signOut({ callbackUrl: "/login" });
              }}
            >
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
