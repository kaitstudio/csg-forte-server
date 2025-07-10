const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// CSG Forte configuration
const CSG_FORTE_CONFIG = {
  merchantId: process.env.CSG_FORTE_MERCHANT_ID,
  locationId: process.env.CSG_FORTE_LOCATION_ID,
  apiKey: process.env.CSG_FORTE_API_KEY,
  apiSecret: process.env.CSG_FORTE_API_SECRET,
  baseUrl: process.env.CSG_FORTE_BASE_URL || 'https://api.forte.net/v3'
};

// Generate signature for CSG Forte
function generateSignature(data) {
  const sortedData = Object.keys(data)
    .sort()
    .reduce((result, key) => {
      result[key] = data[key];
      return result;
    }, {});
  
  const queryString = new URLSearchParams(sortedData).toString();
  const signature = crypto
    .createHmac('sha256', CSG_FORTE_CONFIG.apiSecret)
    .update(queryString)
    .digest('hex');
  
  return signature;
}

// Endpoint to generate payment signature
app.post('/generate-signature', async (req, res) => {
  try {
    const { amount, orderId, customerData } = req.body;
    
    // Prepare data for signature generation
    const signatureData = {
      merchant_id: CSG_FORTE_CONFIG.merchantId,
      location_id: CSG_FORTE_CONFIG.locationId,
      transaction_amount: amount,
      order_number: orderId,
      // Add other required fields based on CSG Forte documentation
    };
    
    const signature = generateSignature(signatureData);
    
    res.json({
      success: true,
      signature: signature,
      merchantId: CSG_FORTE_CONFIG.merchantId,
      locationId: CSG_FORTE_CONFIG.locationId,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error generating signature:', error);
    res.status(500).json({ success: false, error: 'Failed to generate signature' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
