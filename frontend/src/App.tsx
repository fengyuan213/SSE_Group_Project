import { useEffect, useState } from "react";
import { api } from "./lib/api";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  Box,
  Chip,
} from "@mui/material";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Booking from "./pages/Booking.tsx";
import AuditPage from "./pages/AuditPage.tsx";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export default function App() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    api
      .get("/health")
      .then((r) => setStatus((r.data as { status?: string })?.status ?? "down"))
      .catch(() => setStatus("down"));
  }, []);

  // After the administrator logs in, check whether there are any sensitive audit events,
  // and pop up a reminder if there are any.
  useEffect(() => {
    const isAdmin = true;
    if (!isAdmin) return;

    (async () => {
      try {
        const res = await fetch(`/audit.json`);
        const data: unknown = await res.json();

        const itemsUnknown: unknown[] = Array.isArray(data)
          ? data
          : isRecord(data) &&
            Array.isArray((data as { items?: unknown[] }).items)
          ? ((data as { items?: unknown[] }).items as unknown[])
          : [];

        const hasSensitive = itemsUnknown.some((v) => {
          if (!isRecord(v)) return false;
          const s = v.sensitivity;
          return typeof s === "string" && s.toLowerCase() === "sensitive";
        });

        if (hasSensitive) {
          alert("There are sensitive audit events. Please review Audit Logs.");
        }
      } catch {
        // Ignores the error.
      }
    })();
  }, []);

  const apiUp = status === "ok" || status === "up";

  return (
    <BrowserRouter>
      <AppBar position="fixed" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Home Services Booking
          </Typography>

          <Button color="inherit" component={Link} to="/">
            Home
          </Button>
          <Button color="inherit" component={Link} to="/booking/general">
            General Booking
          </Button>

          {/* Navigate to the audit log */}
          <Button color="inherit" component={Link} to="/audit">
            Audit Logs
          </Button>

          <Box sx={{ ml: 2 }}>
            <Chip
              size="small"
              label={`API: ${status}`}
              color={
                apiUp
                  ? "success"
                  : status === "checking..."
                  ? "default"
                  : "error"
              }
              variant={apiUp ? "filled" : "outlined"}
            />
          </Box>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Container sx={{ py: 3 }}>
        <Routes>
          <Route
            path="/"
            element={
              <Box>
                <Typography variant="h4" gutterBottom>
                  Welcome to the Home Services Booking System
                </Typography>
                <Typography color="text.secondary">
                  Use the menu above to navigate to the booking forms.
                </Typography>
              </Box>
            }
          />
          <Route path="/booking/general" element={<Booking />} />
          {/* Audit log routing */}
          <Route path="/audit" element={<AuditPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}
