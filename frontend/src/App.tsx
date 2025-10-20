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
import Payment from "./pages/Payment.tsx";
import Confirmation from "./pages/Confirmation.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import { ROUTES } from "./lib/routes";
import Dashboard from "./pages/Dashboard.tsx";

export default function App() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    api
      .get("/health")
      .then((r) => setStatus(r.data.status))
      .catch(() => setStatus("down"));
  }, []);

  const apiUp = status === "ok" || status === "up";

  return (
    <BrowserRouter>
      <AppBar
        position="fixed"
        sx={{ backgroundColor: "white", color: "text.primary" }}
        elevation={1}
      >
        <Toolbar>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, fontWeight: "bold", color: "primary.main" }}
          >
            🏠 HomeService Hub
          </Typography>
          <Button color="inherit" component={Link} to={ROUTES.HOME}>
            Home
          </Button>
          <Button color="inherit" component={Link} to={ROUTES.BOOKING_GENERAL}>
            General Booking
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
        <ErrorBoundary>
          <Routes>
            <Route path={ROUTES.HOME} element={<Dashboard />} />
            <Route path={ROUTES.BOOKING_GENERAL} element={<Booking />} />
            <Route path={ROUTES.PAYMENT} element={<Payment />} />
            <Route path={ROUTES.CONFIRMATION} element={<Confirmation />} />
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>
        </ErrorBoundary>
      </Container>
    </BrowserRouter>
  );
}
