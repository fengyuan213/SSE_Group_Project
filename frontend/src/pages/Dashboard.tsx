import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  Rating,
  Tabs,
  Tab,
  Container,
  IconButton,
  Stack,
} from "@mui/material";
import {
  Verified,
  PlayArrow,
  ThumbUp,
  Share,
  BookmarkBorder,
} from "@mui/icons-material";
import { bookingApi, type ServicePackage } from "../lib/api";
import { useNavigate } from "react-router-dom";

interface ServiceCategory {
  id: number;
  name: string;
  count: number;
}

// Mock service images - in a real app, these would come from the API
const getServiceImage = (categoryName: string, packageId: number): string => {
  const imageMap: { [key: string]: string[] } = {
    Plumbing: [
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=320&h=180&fit=crop",
      "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=320&h=180&fit=crop",
    ],
    Electrical: [
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=320&h=180&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&h=180&fit=crop",
    ],
    HVAC: [
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=320&h=180&fit=crop",
      "https://images.unsplash.com/photo-1635748707820-1a3de0a0c3a7?w=320&h=180&fit=crop",
    ],
    "General Maintenance": [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=320&h=180&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&h=180&fit=crop",
    ],
    Cleaning: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&h=180&fit=crop",
      "https://images.unsplash.com/photo-1628177142898-93e36e2b9b7c?w=320&h=180&fit=crop",
    ],
    Landscaping: [
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=320&h=180&fit=crop",
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=320&h=180&fit=crop",
    ],
  };

  const images = imageMap[categoryName] || imageMap["General Maintenance"];
  return images[packageId % images.length];
};

// Mock provider data
const getMockProvider = (packageId: number) => {
  const providers = [
    { name: "ServicePro", rating: 4.8, verified: true, subscribers: "12K" },
    { name: "FixItFast", rating: 4.6, verified: true, subscribers: "8.5K" },
    { name: "HomeExperts", rating: 4.9, verified: true, subscribers: "20K" },
    { name: "QuickFix", rating: 4.7, verified: false, subscribers: "5.2K" },
    {
      name: "ReliableService",
      rating: 4.5,
      verified: true,
      subscribers: "15K",
    },
  ];
  return providers[packageId % providers.length];
};

interface ServiceCardProps {
  service: ServicePackage;
  onBookNow: (service: ServicePackage) => void;
}

function ServiceCard({ service, onBookNow }: ServiceCardProps) {
  const provider = getMockProvider(service.package_id);
  const imageUrl = getServiceImage(service.category_name, service.package_id);

  return (
    <Card
      sx={{
        maxWidth: 320,
        borderRadius: 2,
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 4,
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <CardMedia
          sx={{
            height: 180,
            position: "relative",
            "&:hover .play-overlay": {
              opacity: 1,
            },
          }}
          image={imageUrl}
          title={service.package_name}
        />
        <Box
          className="play-overlay"
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
            opacity: 0,
            transition: "opacity 0.3s",
            cursor: "pointer",
          }}
          onClick={() => onBookNow(service)}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              backgroundColor: "primary.main",
            }}
          >
            <PlayArrow sx={{ fontSize: 32 }} />
          </Avatar>
        </Box>
        <Chip
          label={`${service.duration_minutes} min`}
          size="small"
          sx={{
            position: "absolute",
            bottom: 8,
            right: 8,
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "white",
          }}
        />
      </Box>

      <CardContent sx={{ pb: 1 }}>
        <Typography
          variant="body1"
          fontWeight="bold"
          sx={{
            mb: 1,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.3,
          }}
        >
          {service.package_name}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
            {provider.name[0]}
          </Avatar>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {provider.name}
          </Typography>
          {provider.verified && (
            <Verified sx={{ fontSize: 16, color: "grey.600" }} />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {provider.subscribers} customers • {service.category_name}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Rating
              value={provider.rating}
              precision={0.1}
              size="small"
              readOnly
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
              ({provider.rating})
            </Typography>
          </Box>
          <Typography variant="h6" color="primary.main" fontWeight="bold">
            ${service.base_price}
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {service.description}
        </Typography>
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
          <IconButton size="small">
            <ThumbUp fontSize="small" />
          </IconButton>
          <IconButton size="small">
            <Share fontSize="small" />
          </IconButton>
          <IconButton size="small">
            <BookmarkBorder fontSize="small" />
          </IconButton>
          <Button
            variant="contained"
            size="small"
            sx={{ ml: "auto !important" }}
            onClick={() => onBookNow(service)}
          >
            Book Now
          </Button>
        </Stack>
      </CardActions>
    </Card>
  );
}

export default function Dashboard() {
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const navigate = useNavigate();

  const categories: ServiceCategory[] = [
    { id: 0, name: "All", count: 0 },
    { id: 1, name: "Plumbing", count: 0 },
    { id: 2, name: "Electrical", count: 0 },
    { id: 3, name: "HVAC", count: 0 },
    { id: 4, name: "General Maintenance", count: 0 },
    { id: 5, name: "Cleaning", count: 0 },
    { id: 6, name: "Landscaping", count: 0 },
  ];

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const data = await bookingApi.getPackages();
        setServices(data);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const filteredServices =
    selectedCategory === "All"
      ? services
      : services.filter(
          (service) => service.category_name === selectedCategory
        );

  const handleBookNow = (service: ServicePackage) => {
    // Navigate to booking page with pre-selected service
    navigate(`/booking/general?package=${service.package_id}`);
  };

  const handleCategoryChange = (_: React.SyntheticEvent, newValue: string) => {
    setSelectedCategory(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header section similar to YouTube */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Home Services
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find and book trusted home service professionals
        </Typography>
      </Box>

      {/* Category tabs similar to YouTube channel tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={selectedCategory}
          onChange={handleCategoryChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="service categories"
        >
          {categories.map((category) => (
            <Tab
              key={category.id}
              label={category.name}
              value={category.name}
              sx={{ textTransform: "none", fontWeight: 500 }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Services grid similar to YouTube video grid */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Typography>Loading services...</Typography>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ pb: 4 }}>
          {filteredServices.map((service) => (
            <Grid key={service.package_id} xs={12} sm={6} md={4} lg={3}>
              <ServiceCard service={service} onBookNow={handleBookNow} />
            </Grid>
          ))}
        </Grid>
      )}

      {filteredServices.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No services found in this category
          </Typography>
        </Box>
      )}
    </Container>
  );
}
