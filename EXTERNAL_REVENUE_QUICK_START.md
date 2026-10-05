# External Revenue API - Quick Start Guide

## 🚀 Quick Setup

### Step 1: Get Your JWT Token

**From Browser (Development):**
1. Log in to your Webwrite dashboard
2. Open browser DevTools (F12)
3. Go to Application/Storage → Cookies
4. Copy the value of `kalp_auth_token`

**From Browser Console:**
```javascript
document.cookie.split('; ').find(row => row.startsWith('kalp_auth_token='))?.split('=')[1]
```

### Step 2: Get Product ID

**Option A: Via API**
```bash
curl -X GET "https://your-domain.com/api/products" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Option B: Via Dashboard**
- Go to Dashboard → Products
- Find your product/service
- Copy the MongoDB ObjectId (e.g., `65f8a1b2c3d4e5f6a7b8c9d1`)

### Step 3: Submit Revenue

**Basic Example (cURL):**
```bash
curl -X POST "https://your-domain.com/api/products/65f8a1b2c3d4e5f6a7b8c9d1/external-revenue" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "INR",
    "date": "2026-02-06T10:00:00Z",
    "source": "stripe",
    "metadata": {
      "transactionId": "txn_123456",
      "customerEmail": "customer@example.com"
    }
  }'
```

## 📝 Code Examples

### JavaScript/Node.js

```javascript
async function submitExternalRevenue(productId, amount, source, metadata = {}) {
  const JWT_TOKEN = 'your_jwt_token_here';
  const API_URL = 'https://your-domain.com/api/products';
  
  const response = await fetch(`${API_URL}/${productId}/external-revenue`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amount,
      currency: 'INR',
      date: new Date().toISOString(),
      source: source,
      metadata: metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit revenue');
  }

  return await response.json();
}

// Usage
try {
  const result = await submitExternalRevenue(
    '65f8a1b2c3d4e5f6a7b8c9d1', // Product ID
    10000,                        // Amount
    'stripe',                     // Source
    {
      transactionId: 'txn_123',
      customerEmail: 'customer@example.com',
    }
  );
  console.log('Revenue submitted:', result);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Python

```python
import requests
from datetime import datetime

def submit_external_revenue(product_id, amount, source, metadata=None):
    JWT_TOKEN = 'your_jwt_token_here'
    API_URL = 'https://your-domain.com/api/products'
    
    headers = {
        'Authorization': f'Bearer {JWT_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'amount': amount,
        'currency': 'INR',
        'date': datetime.utcnow().isoformat() + 'Z',
        'source': source,
        'metadata': metadata or {}
    }
    
    response = requests.post(
        f'{API_URL}/{product_id}/external-revenue',
        headers=headers,
        json=payload
    )
    
    response.raise_for_status()
    return response.json()

# Usage
try:
    result = submit_external_revenue(
        '65f8a1b2c3d4e5f6a7b8c9d1',  # Product ID
        10000,                         # Amount
        'razorpay',                    # Source
        {
            'transaction_id': 'txn_123',
            'customer_email': 'customer@example.com'
        }
    )
    print('Revenue submitted:', result)
except requests.exceptions.HTTPError as e:
    print(f'Error: {e.response.json()}')
```

### PHP

```php
<?php
function submitExternalRevenue($productId, $amount, $source, $metadata = []) {
    $jwtToken = 'your_jwt_token_here';
    $apiUrl = 'https://your-domain.com/api/products';
    
    $data = [
        'amount' => $amount,
        'currency' => 'INR',
        'date' => date('c'), // ISO 8601 format
        'source' => $source,
        'metadata' => $metadata
    ];
    
    $ch = curl_init($apiUrl . '/' . $productId . '/external-revenue');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $jwtToken,
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 201) {
        throw new Exception('Failed to submit revenue: ' . $response);
    }
    
    return json_decode($response, true);
}

// Usage
try {
    $result = submitExternalRevenue(
        '65f8a1b2c3d4e5f6a7b8c9d1', // Product ID
        10000,                        // Amount
        'stripe',                     // Source
        [
            'transactionId' => 'txn_123',
            'customerEmail' => 'customer@example.com'
        ]
    );
    echo 'Revenue submitted: ' . json_encode($result);
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
?>
```

## 🔄 Webhook Integration Examples

### Stripe Webhook

```javascript
// Express.js example
app.post('/webhook/stripe', async (req, res) => {
  const event = req.body;
  
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Map Stripe payment to your product
    const productId = getProductIdFromStripeMetadata(paymentIntent.metadata);
    
    await submitExternalRevenue(
      productId,
      paymentIntent.amount / 100, // Convert cents to currency unit
      'stripe',
      {
        stripePaymentIntentId: paymentIntent.id,
        customerEmail: paymentIntent.receipt_email,
        rawStripeEvent: event
      }
    );
  }
  
  res.json({ received: true });
});
```

### Razorpay Webhook

```javascript
// Express.js example
app.post('/webhook/razorpay', async (req, res) => {
  const webhookData = req.body;
  
  if (webhookData.event === 'payment.captured') {
    const payment = webhookData.payload.payment.entity;
    
    // Map Razorpay payment to your product
    const productId = getProductIdFromRazorpayNotes(payment.notes);
    
    await submitExternalRevenue(
      productId,
      payment.amount / 100, // Convert paise to rupees
      'razorpay',
      {
        razorpayPaymentId: payment.id,
        orderId: payment.order_id,
        customerId: payment.customer_id,
        rawRazorpayEvent: webhookData
      }
    );
  }
  
  res.json({ received: true });
});
```

## 📊 Viewing Revenue in Dashboard

After submitting revenue:
1. Go to Dashboard → Overview
2. External revenue automatically appears in:
   - Total revenue charts
   - Monthly revenue breakdown
   - Product/service revenue comparisons
   - Net P&L calculations

## 🔍 Retrieve Revenue Records

**Get all revenue for a product:**
```bash
curl -X GET "https://your-domain.com/api/products/65f8a1b2c3d4e5f6a7b8c9d1/external-revenue" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by year/month:**
```bash
curl -X GET "https://your-domain.com/api/products/65f8a1b2c3d4e5f6a7b8c9d1/external-revenue?year=2026&month=2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Filter by source:**
```bash
curl -X GET "https://your-domain.com/api/products/65f8a1b2c3d4e5f6a7b8c9d1/external-revenue?source=stripe" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## ⚠️ Common Issues

### 401 Unauthorized
- **Problem**: Invalid or expired JWT token
- **Solution**: Get a fresh token from the dashboard

### 404 Not Found
- **Problem**: Invalid product ID
- **Solution**: Verify product ID using `/api/products` endpoint

### 400 Bad Request
- **Problem**: Missing required fields or invalid data
- **Solution**: Check that `amount`, `date`, and `source` are provided correctly

## 📚 Full Documentation

See `EXTERNAL_REVENUE_API.md` for complete API documentation.
