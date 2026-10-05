import { Product } from "@/models/Product";
import { ExternalRevenue } from "@/models/ExternalRevenue";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface ExternalRevenueResponse {
  totalRevenue: number;
  monthlyRevenue: {
    [key: string]: number;
  };
}

/**
 * Fetch revenue data from an external API
 */
async function fetchExternalRevenue(
  apiUrl: string,
  jwtToken: string
): Promise<ExternalRevenueResponse | null> {
  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`External revenue API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data as ExternalRevenueResponse;
  } catch (error) {
    console.error("Error fetching external revenue:", error);
    return null;
  }
}

/**
 * Sync external revenue for a specific product
 */
export async function syncProductExternalRevenue(productId: string): Promise<{
  success: boolean;
  message: string;
  recordsCreated?: number;
}> {
  try {
    const product = await Product.findById(productId).lean();
    if (!product) {
      return { success: false, message: "Product not found" };
    }

    const apiUrl = (product as any).externalRevenueApiUrl;
    const jwtToken = (product as any).externalRevenueJwtToken;

    if (!apiUrl || !jwtToken) {
      return { success: false, message: "API URL or JWT token not configured" };
    }

    const revenueData = await fetchExternalRevenue(apiUrl, jwtToken);
    if (!revenueData) {
      return { success: false, message: "Failed to fetch revenue data from external API" };
    }

    const currentYear = new Date().getFullYear();
    let recordsCreated = 0;

    // Process monthly revenue
    for (const [monthName, amount] of Object.entries(revenueData.monthlyRevenue)) {
      if (typeof amount !== "number" || amount <= 0) continue;

      const monthIndex = MONTH_NAMES.findIndex(
        (m) => m.toLowerCase() === monthName.toLowerCase()
      );
      if (monthIndex === -1) {
        console.warn(`Unknown month name: ${monthName}`);
        continue;
      }

      const month = monthIndex + 1; // Convert 0-11 to 1-12

      // Check if record already exists for this product, year, and month
      const existing = await ExternalRevenue.findOne({
        productId,
        year: currentYear,
        month,
        source: "external-api-sync",
      }).lean();

      if (!existing) {
        // Create new record
        const revenueDate = new Date(currentYear, monthIndex, 1);
        await ExternalRevenue.create({
          productId,
          amount: Math.round(amount * 100) / 100,
          currency: "INR",
          date: revenueDate,
          month,
          year: currentYear,
          source: "external-api-sync",
          metadata: {
            syncedAt: new Date().toISOString(),
            apiUrl,
            totalRevenue: revenueData.totalRevenue,
          },
        });
        recordsCreated++;
      } else {
        // Update existing record if amount changed
        if (Math.abs(existing.amount - amount) > 0.01) {
          await ExternalRevenue.findByIdAndUpdate(existing._id, {
            amount: Math.round(amount * 100) / 100,
            metadata: {
              ...(existing.metadata || {}),
              syncedAt: new Date().toISOString(),
              totalRevenue: revenueData.totalRevenue,
            },
          });
          recordsCreated++;
        }
      }
    }

    return {
      success: true,
      message: `Synced external revenue: ${recordsCreated} records created/updated`,
      recordsCreated,
    };
  } catch (error: any) {
    console.error("Error syncing external revenue:", error);
    return {
      success: false,
      message: error.message || "Failed to sync external revenue",
    };
  }
}

/**
 * Sync external revenue for all products that have API configuration
 */
export async function syncAllExternalRevenue(): Promise<{
  success: boolean;
  message: string;
  syncedProducts: number;
  totalRecordsCreated: number;
}> {
  try {
    const products = await Product.find({
      $and: [
        { externalRevenueApiUrl: { $exists: true, $ne: null } },
        { externalRevenueApiUrl: { $ne: "" } },
        { externalRevenueJwtToken: { $exists: true, $ne: null } },
        { externalRevenueJwtToken: { $ne: "" } },
        { isActive: true },
      ],
    }).lean();

    let syncedProducts = 0;
    let totalRecordsCreated = 0;

    for (const product of products) {
      const result = await syncProductExternalRevenue(String(product._id));
      if (result.success) {
        syncedProducts++;
        totalRecordsCreated += result.recordsCreated || 0;
      }
    }

    return {
      success: true,
      message: `Synced ${syncedProducts} products, ${totalRecordsCreated} records created/updated`,
      syncedProducts,
      totalRecordsCreated,
    };
  } catch (error: any) {
    console.error("Error syncing all external revenue:", error);
    return {
      success: false,
      message: error.message || "Failed to sync external revenue",
      syncedProducts: 0,
      totalRecordsCreated: 0,
    };
  }
}
