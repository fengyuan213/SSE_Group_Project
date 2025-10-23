import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material";
import { Add, Edit, Delete, CheckCircle, Schedule } from "@mui/icons-material";
import dayjs from "dayjs";
import {
  inspectionApi,
  bookingApi,
  type Inspection,
  type UrgentWorkItem,
  type ServicePackage,
} from "../lib/api";

export default function ProviderDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tabValue, setTabValue] = useState(0);

  // Provider selection (mock auth)
  const [providerId, setProviderId] = useState<number>(
    parseInt(searchParams.get("provider_id") || "1")
  );

  // Data
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [selectedInspection, setSelectedInspection] =
    useState<Inspection | null>(null);
  const [workItems, setWorkItems] = useState<UrgentWorkItem[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Work item modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UrgentWorkItem | null>(null);
  const [itemDescription, setItemDescription] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState<
    "critical" | "high" | "medium"
  >("medium");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [recommendedPackageId, setRecommendedPackageId] = useState<number | "">(
    ""
  );
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [inspectionsData, packagesData] = await Promise.all([
        inspectionApi.getInspections(undefined, providerId),
        bookingApi.getPackages(),
      ]);
      setInspections(inspectionsData);
      setPackages(packagesData.filter((pkg) => pkg.package_type === "single"));
      setError(null);
    } catch (err) {
      console.error("Failed to load data:", err);
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  const loadInspectionWorkItems = useCallback(async () => {
    if (!selectedInspection) return;

    try {
      const details = await inspectionApi.getInspectionDetails(
        selectedInspection.inspection_id
      );
      setWorkItems(details.work_items);
    } catch (err) {
      console.error("Failed to load work items:", err);
    }
  }, [selectedInspection]);

  useEffect(() => {
    setSearchParams({ provider_id: providerId.toString() });
    loadData();
  }, [providerId, setSearchParams, loadData]);

  useEffect(() => {
    if (selectedInspection) {
      loadInspectionWorkItems();
    }
  }, [selectedInspection, loadInspectionWorkItems]);

  const handleSelectInspection = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setTabValue(1); // Switch to manage tab
  };

  const handleAddWorkItem = () => {
    setEditingItem(null);
    setItemDescription("");
    setUrgencyLevel("medium");
    setDiscountPercentage("0");
    setRecommendedPackageId("");
    setModalOpen(true);
  };

  const handleEditWorkItem = (item: UrgentWorkItem) => {
    setEditingItem(item);
    setItemDescription(item.item_description);
    setUrgencyLevel(item.urgency_level);
    setDiscountPercentage(item.discount_percentage.toString());
    setRecommendedPackageId(item.recommended_package_id || "");
    setModalOpen(true);
  };

  const handleSubmitWorkItem = async () => {
    if (!selectedInspection || !itemDescription || !recommendedPackageId) {
      return;
    }

    try {
      setSubmitting(true);

      const data = {
        item_description: itemDescription,
        urgency_level: urgencyLevel,
        discount_percentage: discountPercentage
          ? parseFloat(discountPercentage)
          : 0,
        recommended_package_id:
          typeof recommendedPackageId === "number"
            ? recommendedPackageId
            : undefined,
      };

      if (editingItem) {
        // Update existing
        await inspectionApi.updateWorkItem(
          selectedInspection.inspection_id,
          editingItem.urgent_item_id,
          data
        );
      } else {
        // Create new
        await inspectionApi.createWorkItem(
          selectedInspection.inspection_id,
          data
        );
      }

      setModalOpen(false);
      loadInspectionWorkItems();
    } catch (err) {
      console.error("Failed to save work item:", err);
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || "Failed to save work item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWorkItem = async (itemId: number) => {
    if (!selectedInspection) return;

    if (!confirm("Are you sure you want to delete this work item?")) {
      return;
    }

    try {
      await inspectionApi.deleteWorkItem(
        selectedInspection.inspection_id,
        itemId
      );
      loadInspectionWorkItems();
    } catch (err) {
      console.error("Failed to delete work item:", err);
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || "Failed to delete work item");
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedInspection) return;

    try {
      await inspectionApi.updateInspection(selectedInspection.inspection_id, {
        inspection_status: "completed",
      });
      alert("Inspection marked as completed!");
      loadData();
      setSelectedInspection(null);
      setTabValue(0);
    } catch (err) {
      console.error("Failed to complete inspection:", err);
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || "Failed to complete inspection");
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Loading provider dashboard...
        </Typography>
      </Box>
    );
  }

  const scheduledInspections = inspections.filter(
    (i) => i.inspection_status === "scheduled"
  );

  return (
    <Box sx={{ maxWidth: 1200, margin: "0 auto", mt: 4 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Provider Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your inspections and work items
          </Typography>
        </Box>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Provider</InputLabel>
          <Select
            value={providerId}
            onChange={(e) => setProviderId(Number(e.target.value))}
            label="Provider"
          >
            <MenuItem value={1}>Provider #1</MenuItem>
            <MenuItem value={2}>Provider #2</MenuItem>
            <MenuItem value={3}>Provider #3</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
        >
          <Tab
            label={`Scheduled Inspections (${scheduledInspections.length})`}
          />
          <Tab label="Manage Inspection" disabled={!selectedInspection} />
        </Tabs>
      </Box>

      {/* Tab 0: Scheduled Inspections */}
      {tabValue === 0 && (
        <Box>
          {scheduledInspections.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: "center", py: 6 }}>
                <Schedule
                  sx={{ fontSize: 80, color: "text.secondary", mb: 2 }}
                />
                <Typography variant="h6" gutterBottom>
                  No Scheduled Inspections
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You don't have any upcoming inspections assigned.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={2}>
              {scheduledInspections.map((inspection) => (
                <Card key={inspection.inspection_id}>
                  <CardContent>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      spacing={2}
                    >
                      <Box>
                        <Typography variant="h6">
                          Inspection #{inspection.inspection_id}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {dayjs(inspection.inspection_date).format(
                            "MMMM D, YYYY [at] h:mm A"
                          )}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          User ID: {inspection.user_id}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        onClick={() => handleSelectInspection(inspection)}
                      >
                        Manage
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* Tab 1: Manage Inspection */}
      {tabValue === 1 && selectedInspection && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography variant="h5">
                      Inspection #{selectedInspection.inspection_id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {dayjs(selectedInspection.inspection_date).format(
                        "MMMM D, YYYY [at] h:mm A"
                      )}
                    </Typography>
                  </Box>
                  <Chip
                    label={selectedInspection.inspection_status}
                    color="warning"
                    sx={{ textTransform: "capitalize" }}
                  />
                </Stack>

                <Divider />

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleAddWorkItem}
                  >
                    Add Work Item
                  </Button>
                  {selectedInspection.inspection_status === "scheduled" && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={handleMarkComplete}
                    >
                      Mark Inspection Complete
                    </Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Work Items Table */}
          <Typography variant="h6" gutterBottom>
            Work Items ({workItems.length})
          </Typography>

          {workItems.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No work items added yet. Click "Add Work Item" to create one.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell>Urgency</TableCell>
                    <TableCell>Recommended Package</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workItems.map((item) => {
                    const packagePrice =
                      item.recommended_package?.base_price || 0;
                    const discount = item.discount_percentage || 0;
                    const finalPrice = packagePrice * (1 - discount / 100);

                    return (
                      <TableRow key={item.urgent_item_id}>
                        <TableCell>{item.item_description}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.urgency_level}
                            color={
                              item.urgency_level === "critical"
                                ? "error"
                                : item.urgency_level === "high"
                                ? "warning"
                                : "info"
                            }
                            size="small"
                            sx={{ textTransform: "capitalize" }}
                          />
                        </TableCell>
                        <TableCell>
                          {item.recommended_package?.package_name || "—"}
                        </TableCell>
                        <TableCell align="right">
                          {discount > 0 ? (
                            <Box>
                              <Typography
                                variant="caption"
                                sx={{ textDecoration: "line-through" }}
                              >
                                ${packagePrice.toFixed(2)}
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                                color="success.main"
                              >
                                ${finalPrice.toFixed(2)} ({discount}% off)
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2">
                              ${packagePrice.toFixed(2)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditWorkItem(item)}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              handleDeleteWorkItem(item.urgent_item_id)
                            }
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Work Item Dialog */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingItem ? "Edit Work Item" : "Add Work Item"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Description"
              required
              fullWidth
              multiline
              rows={3}
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              helperText="Describe the issue found (e.g., 'Loose wiring in living room outlet')"
            />

            <FormControl fullWidth required>
              <InputLabel>Urgency Level</InputLabel>
              <Select
                value={urgencyLevel}
                onChange={(e) =>
                  setUrgencyLevel(
                    e.target.value as "critical" | "high" | "medium"
                  )
                }
                label="Urgency Level"
              >
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Recommended Service Package</InputLabel>
              <Select
                value={recommendedPackageId}
                onChange={(e) =>
                  setRecommendedPackageId(e.target.value as number)
                }
                label="Recommended Service Package"
              >
                <MenuItem value="">
                  <em>Select a package</em>
                </MenuItem>
                {packages.map((pkg) => (
                  <MenuItem key={pkg.package_id} value={pkg.package_id}>
                    {pkg.package_name} (${pkg.base_price})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Discount Percentage (Optional)"
              fullWidth
              type="number"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value)}
              InputProps={{ endAdornment: "%" }}
              helperText="Optional discount from package price (0-100%)"
              inputProps={{ min: 0, max: 100, step: 1 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitWorkItem}
            variant="contained"
            disabled={submitting || !itemDescription || !recommendedPackageId}
          >
            {submitting ? "Saving..." : editingItem ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
