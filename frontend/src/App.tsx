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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}
