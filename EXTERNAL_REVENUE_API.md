# External Revenue API Documentation

This API allows external backends and systems to submit product revenue data that will be tracked and displayed in the Webwrite dashboard alongside internal revenue from projects and services.

## Overview

The External Revenue API enables you to:
- Submit revenue transactions from external sources (e.g., payment gateways, third-party platforms, other backends)
- Track revenue by product/service
- View external revenue in the dashboard alongside internal revenue
- Store metadata/raw API responses for audit purposes

## Authentication

All API requests require JWT token authentication. The token must be included in the `Authorization` header.

### Getting a JWT Token

JWT tokens are generated when users log in to the Webwrite dashboard. To use this API from an external system:

1. **Option 1: Use an Admin Account Token**
   - Log in to the Webwrite dashboard as an admin user
   - Extract the JWT token from the browser cookies (`kalp_auth_token`)
   - Use this token in your API requests

2. **Option 2: Generate a Service Account Token** (if implemented)
   - Contact your system administrator to create a service account
   - Use the service account credentials to obtain a JWT token

### Getting Product IDs

To find the product ID for a product/service:

1. **Via API**:
   ```bash
   GET /api/products
   Authorization: Bearer <JWT_TOKEN>
   ```
   
   Response:
   ```json
   {
     "products": [
       {
         "_id": "65f8a1b2c3d4e5f6a7b8c9d1",
         "name": "Premium SaaS Product",
         "slug": "premium-saas",
         "kind": "product"
       }
     ]
   }
   ```

2. **Via Dashboard**:
   - Navigate to Dashboard → Products
   - View the product list
   - Use the product's MongoDB ObjectId as the `productId` in API requests

### Token Format

```
Authorization: Bearer <your_jwt_token_here>
```

## Base URL

```
Production: https://your-domain.com/api/products/{productId}/external-revenue
Development: http://localhost:3000/api/products/{productId}/external-revenue
```

## Endpoints

### 1. Submit External Revenue

**POST** `/api/products/{productId}/external-revenue`

Submit a revenue transaction for a specific product.

#### Path Parameters

- `productId` (string, required): The MongoDB ObjectId of the product/service

#### Request Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body

```json
{
  "amount": 10000,
  "currency": "INR",
  "date": "2026-02-06T10:00:00Z",
  "source": "backend-api",
  "metadata": {
    "transactionId": "txn_123456",
    "customerId": "cust_789",
    "paymentMethod": "credit_card",
    "rawResponse": { /* original API response */ }
  }
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Revenue amount (positive number) |
| `currency` | string | No | Currency code (default: "INR") |
| `date` | string | Yes | ISO 8601 date string of the transaction |
| `source` | string | Yes | Name of the external source (e.g., "stripe", "razorpay", "backend-api") |
| `metadata` | object | No | Additional data to store (e.g., transaction IDs, customer info, raw API responses) |

#### Response (Success - 201)

```json
{
  "success": true,
  "message": "External revenue recorded successfully",
  "revenue": {
    "id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "productId": "65f8a1b2c3d4e5f6a7b8c9d1",
    "productName": "Premium SaaS Product",
    "amount": 10000,
    "currency": "INR",
    "date": "2026-02-06T10:00:00.000Z",
    "month": 2,
    "year": 2026,
    "source": "backend-api"
  }
}
```

#### Response (Error - 400)

```json
{
  "message": "Invalid amount. Must be a positive number."
}
```

#### Response (Error - 401)

```json
{
  "message": "Unauthorized. Valid JWT token required."
}
```

#### Response (Error - 404)

```json
{
  "message": "Product not found"
}
```

### 2. Get External Revenue Records

**GET** `/api/products/{productId}/external-revenue`

Retrieve external revenue records for a specific product.

#### Path Parameters

- `productId` (string, required): The MongoDB ObjectId of the product/service

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | number | No | Filter by year (e.g., 2026) |
| `month` | number | No | Filter by month 1-12 |
| `source` | string | No | Filter by source name |

#### Request Headers

```
Authorization: Bearer <JWT_TOKEN>
```

#### Response (Success - 200)

```json
{
  "revenues": [
    {
      "id": "65f8a1b2c3d4e5f6a7b8c9d0",
      "productId": "65f8a1b2c3d4e5f6a7b8c9d1",
      "amount": 10000,
      "currency": "INR",
      "date": "2026-02-06T10:00:00.000Z",
      "month": 2,
      "year": 2026,
      "source": "backend-api",
      "metadata": {
        "transactionId": "txn_123456"
      },
      "createdAt": "2026-02-06T10:05:00.000Z"
    }
  ]
}
```

## Usage Examples

### Example 1: Submit Revenue from Stripe Webhook

```bash
curl -X POST https://your-domain.com/api/products/65f8a1b2c3d4e5f6a7b8c9d1/external-revenue \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "currency": "INR",
    "date": "2026-02-06T14:30:00Z",
    "source": "stripe",
    "metadata": {
      "stripePaymentIntentId": "pi_1234567890",
      "customerEmail": "customer@example.com",
      "rawStripeEvent": { /* full Stripe event object */ }
    }
  }'
```

### Example 2: Submit Revenue from Razorpay

```bash
curl -X POST https://your-domain.com/api/products/65f8a1b2c3d4e5f6a7b8c9d1/external-revenue \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25000,
    "currency": "INR",
    "date": "2026-02-06T16:45:00Z",
    "source": "razorpay",
    "metadata": {
      "razorpayPaymentId": "pay_ABC123",
      "orderId": "order_XYZ789",
      "customerId": "cust_456"
    }
  }'
```

### Example 3: Submit Revenue from Custom Backend

```bash
curl -X POST https://your-domain.com/api/products/65f8a1b2c3d4e5f6a7b8c9d1/external-revenue \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 75000,
    "currency": "INR",
    "date": "2026-02-06T18:00:00Z",
    "source": "custom-backend",
    "metadata": {
      "invoiceNumber": "INV-2026-001",
      "clientName": "Acme Corp",
      "paymentMethod": "bank_transfer"
    }
  }'
```

### Example 4: Get Revenue Records for a Product

```bash
curl -X GET "https://your-domain.com/api/products/65f8a1b2c3d4e5f6a7b8c9d1/external-revenue?year=2026&month=2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 5: Node.js/JavaScript Implementation

```javascript
async function submitExternalRevenue(productId, revenueData, jwtToken) {
  const response = await fetch(
    `https://your-domain.com/api/products/${productId}/external-revenue`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: revenueData.amount,
        currency: revenueData.currency || 'INR',
        date: new Date().toISOString(),
        source: revenueData.source,
        metadata: revenueData.metadata || {},
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit revenue');
  }

  return await response.json();
}

// Usage
try {
  const result = await submitExternalRevenue(
    '65f8a1b2c3d4e5f6a7b8c9d1',
    {
      amount: 10000,
      currency: 'INR',
      source: 'stripe',
      metadata: {
        transactionId: 'txn_123',
        customerEmail: 'customer@example.com',
      },
    },
    'YOUR_JWT_TOKEN'
  );
  console.log('Revenue submitted:', result);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Example 6: Python Implementation

```python
import requests
import json
from datetime import datetime

def submit_external_revenue(product_id, revenue_data, jwt_token):
    url = f"https://your-domain.com/api/products/{product_id}/external-revenue"
    
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "amount": revenue_data["amount"],
        "currency": revenue_data.get("currency", "INR"),
        "date": datetime.utcnow().isoformat() + "Z",
        "source": revenue_data["source"],
        "metadata": revenue_data.get("metadata", {})
    }
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

# Usage
try:
    result = submit_external_revenue(
        "65f8a1b2c3d4e5f6a7b8c9d1",
        {
            "amount": 10000,
            "currency": "INR",
            "source": "razorpay",
            "metadata": {
                "transaction_id": "txn_123",
                "customer_email": "customer@example.com"
            }
        },
        "YOUR_JWT_TOKEN"
    )
    print("Revenue submitted:", result)
except requests.exceptions.HTTPError as e:
    print(f"Error: {e.response.json()}")
```

## Dashboard Integration

External revenue is automatically integrated into the dashboard and appears alongside internal revenue from projects:

1. **Total Revenue**: External revenue is added to the total revenue calculations for the current year
2. **Product/Service Revenue**: External revenue is grouped by product/service and included in revenue breakdowns
3. **Monthly Revenue Charts**: External revenue appears in monthly revenue charts (Jan-Dec)
4. **Revenue Breakdown**: External revenue is included in product/service revenue breakdowns
5. **Service vs Product Comparison**: External revenue is included in the service/product comparison metrics
6. **Net P&L Calculations**: External revenue contributes to monthly net profit/loss calculations

### How It Works

- External revenue records are fetched for the current year
- Revenue is attributed to the month based on the `date` field
- Revenue is grouped by product/service name and kind
- All calculations (total revenue, monthly revenue, product/service breakdowns) include external revenue automatically

## Data Storage

- All revenue records are stored in the `ExternalRevenue` collection
- The `metadata` field stores the full API response or additional data for audit purposes
- Revenue is indexed by `productId`, `year`, `month`, and `source` for efficient queries

## Best Practices

1. **Source Naming**: Use consistent source names (e.g., "stripe", "razorpay", "backend-api") to enable filtering and reporting
2. **Date Accuracy**: Use accurate transaction dates to ensure proper monthly/yearly revenue attribution
3. **Metadata**: Store transaction IDs, customer information, and raw API responses in `metadata` for debugging and audit trails
4. **Error Handling**: Implement retry logic for failed API calls
5. **Idempotency**: Consider adding idempotency keys in `metadata` to prevent duplicate submissions

## Error Handling

The API returns standard HTTP status codes:

- `200`: Success (GET requests)
- `201`: Created (POST requests)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid or missing JWT token)
- `404`: Not Found (product doesn't exist)
- `500`: Internal Server Error

Always check the response status and handle errors appropriately in your implementation.

## Security Considerations

1. **JWT Token Security**: Keep your JWT tokens secure. Never commit tokens to version control
2. **HTTPS**: Always use HTTPS in production
3. **Token Expiration**: JWT tokens expire after 7 days by default. Implement token refresh logic if needed
4. **Rate Limiting**: Consider implementing rate limiting on your end to prevent abuse

## Support

For issues or questions:
1. Check the error message in the API response
2. Verify your JWT token is valid and not expired
3. Ensure the product ID exists in the system
4. Contact your system administrator for assistance

## Changelog

- **2026-02-06**: Initial release of External Revenue API
