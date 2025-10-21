import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  CheckCircle,
  LocalOffer,
  AccessTime,
  AttachMoney,
} from "@mui/icons-material";
import { bookingApi, type BundlePackage } from "../lib/api";

interface BundleDetailsModalProps {
  open: boolean;
  packageId: number | null;
  onClose: () => void;
  onBookNow: (packageId: number) => void;
}

export default function BundleDetailsModal({
  open,
  packageId,
  onClose,
  onBookNow,
}: BundleDetailsModalProps) {
  const [bundle, setBundle] = useState<BundlePackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!open || !packageId) {
      // Reset state when closing
      setBundle(null);
      setError(null);
      return;
    }

    const loadBundleDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await bookingApi.getBundleDetails(packageId);
        setBundle(data);
      } catch (err) {
        console.error("Error loading bundle details:", err);
        setError("Failed to load bundle details");
      } finally {
        setLoading(false);
      }
    };

    loadBundleDetails();
  }, [open, packageId]);

  const handleBookNow = () => {
    if (packageId) {
      onBookNow(packageId);
      onClose();
    }
  };

  const calculateSavings = () => {
    if (!bundle) return 0;
    const originalPrice = bundle.original_total_price ?? 0;
    const bundlePrice = bundle.bundle_price ?? 0;
    return originalPrice - bundlePrice;
  };

  const formatDuration = (minutes: number | undefined) => {
    const validMinutes = minutes ?? 0;
    const hours = Math.floor(validMinutes / 60);
    const mins = validMinutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    return `${mins} min`;
  };
  const rootRef = useRef<HTMLDivElement>(null);
  const getContainer = () => {
    const doc =
      rootRef.current?.ownerDocument ??
      (typeof document !== "undefined" ? document : undefined);
    return doc?.body as HTMLElement;
  };

  if (!mounted || !open || !packageId) return null;
  return (
    <Box ref={rootRef}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
        keepMounted={false}
        container={getContainer}
        disableScrollLock
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {bundle && (
              <>
                <Typography variant="h5" component="span" fontWeight="bold">
                  {bundle.package_name}
                </Typography>
                <Chip
                  label={`Save ${bundle.discount_percentage ?? 0}%`}
                  color="success"
                  size="small"
                  icon={<LocalOffer />}
                />
                {bundle.is_customizable && (
                  <Chip
                    label="Customizable"
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                )}
              </>
            )}
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {loading && (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              py={4}
            >
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {bundle && !loading && (
            <Stack spacing={3}>
              {/* Description */}
              <Box>
                <Typography variant="body1" color="text.secondary">
                  {bundle.description}
                </Typography>
              </Box>

              {/* Pricing Summary */}
              <Box
                sx={{
                  p: 3,
                  bgcolor: "success.50",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "success.200",
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Original Price
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        textDecoration: "line-through",
                        color: "text.secondary",
                      }}
                    >
                      ${(bundle.original_total_price ?? 0).toFixed(2)} AUD
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Bundle Price
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      color="success.dark"
                    >
                      ${(bundle.bundle_price ?? 0).toFixed(2)} AUD
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      You Save
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color="success.main"
                    >
                      ${calculateSavings().toFixed(2)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Divider />

              {/* Included Services */}
              <Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Included Services ({bundle.included_services.length})
                </Typography>
                <List>
                  {bundle.included_services.map((service, index) => (
                    <ListItem
                      key={service.package_id}
                      sx={{
                        bgcolor: index % 2 === 0 ? "grey.50" : "transparent",
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    >
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography variant="body1" fontWeight="medium">
                              {service.package_name}
                            </Typography>
                            {service.is_optional && (
                              <Chip
                                label="Optional"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              {service.description}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                              <Chip
                                icon={<AccessTime sx={{ fontSize: 16 }} />}
                                label={formatDuration(service.duration_minutes)}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                icon={<AttachMoney sx={{ fontSize: 16 }} />}
                                label={`$${(service.base_price ?? 0).toFixed(
                                  2
                                )}`}
                                size="small"
                                variant="outlined"
                              />
                              {service.category_name && (
                                <Chip
                                  label={service.category_name}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                            </Stack>
                          </Stack>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* Total Duration */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: "grey.100",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <AccessTime color="action" />
                <Typography variant="body1">
                  <strong>Total Duration:</strong>{" "}
                  {formatDuration(bundle.total_duration)}
                </Typography>
              </Box>

              {bundle.is_customizable && (
                <Alert severity="info">
                  This bundle is customizable. You can add or remove optional
                  services during booking to adjust the price.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} size="large">
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleBookNow}
            size="large"
            disabled={!bundle}
            sx={{ minWidth: 150 }}
          >
            Book This Bundle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
