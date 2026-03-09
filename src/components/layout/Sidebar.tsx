"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PieChartIcon from "@mui/icons-material/PieChart";
import BarChartIcon from "@mui/icons-material/BarChart";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import SettingsIcon from "@mui/icons-material/Settings";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import MenuIcon from "@mui/icons-material/Menu";

const DRAWER_WIDTH = 220;

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
  { label: "Transactions", href: "/dashboard/transactions", icon: <ReceiptIcon /> },
  { label: "Accounts", href: "/dashboard/accounts", icon: <AccountBalanceIcon /> },
  { label: "Budgets", href: "/dashboard/budgets", icon: <PieChartIcon /> },
  { label: "Reports", href: "/dashboard/reports", icon: <BarChartIcon /> },
  { label: "Quick Add", href: "/dashboard/quickadd", icon: <FlashOnIcon /> },
  { label: "Import", href: "/dashboard/import", icon: <UploadFileIcon /> },
  { label: "Settings", href: "/dashboard/settings", icon: <SettingsIcon /> },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  variant: "permanent" | "temporary";
}

export function Sidebar({ open, onToggle, variant }: SidebarProps) {
  const pathname = usePathname();

  const drawerContent = (
    <>
      <Toolbar sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <AccountBalanceIcon color="primary" />
          <Typography variant="h6" fontWeight={700} noWrap>
            OpenLedger
          </Typography>
        </Box>
        {variant === "permanent" && (
          <IconButton onClick={onToggle} size="small">
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List dense>
        {navItems.map((item) => {
          const active = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={active}
                onClick={variant === "temporary" ? onToggle : undefined}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  "&.Mui-selected": {
                    backgroundColor: "primary.main",
                    color: "white",
                    "& .MuiListItemIcon-root": { color: "white" },
                    "&:hover": { backgroundColor: "primary.dark" },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onToggle}
      sx={{
        width: open || variant === "temporary" ? DRAWER_WIDTH : 64,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: open || variant === "temporary" ? DRAWER_WIDTH : 64,
          overflowX: "hidden",
          transition: "width 0.2s",
          boxSizing: "border-box",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
