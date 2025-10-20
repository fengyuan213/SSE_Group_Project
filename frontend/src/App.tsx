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
          <Button
            color="inherit"
            component={Link}
            to="/"
            sx={{ color: "text.primary" }}
          >
            Home
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/booking/general"
            sx={{ color: "text.primary" }}
          >
            Book Service
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
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/booking/general" element={<Booking />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}
