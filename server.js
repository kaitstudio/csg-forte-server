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
  baseUrl: process.env.CSG_FORTE_BASE_URL || 'https://sandbox.forte.net/api/v3'
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'CSG Forte Server is running!',
    endpoints: {
      health: '/health',
      generateSignature: '/generate-signature (POST)'
    },
    status: 'online'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    config: {
      merchantId: CSG_FORTE_CONFIG.merchantId ? 'Set' : 'Missing',
      locationId: CSG_FORTE_CONFIG.locationId ? 'Set' : 'Missing',
      apiKey: CSG_FORTE_CONFIG.apiKey ? 'Set' : 'Missing',
      apiSecret: CSG_FORTE_CONFIG.apiSecret ? 'Set' : 'Missing'
    }
  });
});

// Endpoint to generate payment signature
app.post('/generate-signature', async (req, res) => {
  try {
    const { amount, orderId, customerData } = req.body;
    
    // Validate required fields
    if (!amount || !orderId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Amount and orderId are required' 
      });
    }

    // Check if required config is present
    if (!CSG_FORTE_CONFIG.merchantId || !CSG_FORTE_CONFIG.apiSecret) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration missing' 
      });
    }
    
    // Prepare data for signature generation
    const signatureData = {
      merchant_id: CSG_FORTE_CONFIG.merchantId,
      location_id: CSG_FORTE_CONFIG.locationId,
      transaction_amount: amount,
      order_number: orderId,
      api_access_id: CSG_FORTE_CONFIG.apiKey,
      version_number: '2.0',
      method: 'sale',
      utc_time: new Date().toISOString()
    };
    
    const signature = generateSignature(signatureData);
    
    res.json({
      success: true,
      signature: signature,
      merchantId: CSG_FORTE_CONFIG.merchantId,
      locationId: CSG_FORTE_CONFIG.locationId,
      apiAccessId: CSG_FORTE_CONFIG.apiKey,
      utcTime: signatureData.utc_time,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error generating signature:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate signature',
      details: error.message 
    });
  }
});

// Handle 404s
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /generate-signature'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment check:');
  console.log('- Merchant ID:', CSG_FORTE_CONFIG.merchantId ? 'Set' : 'Missing');
  console.log('- Location ID:', CSG_FORTE_CONFIG.locationId ? 'Set' : 'Missing');
  console.log('- API Key:', CSG_FORTE_CONFIG.apiKey ? 'Set' : 'Missing');
  console.log('- API Secret:', CSG_FORTE_CONFIG.apiSecret ? 'Set' : 'Missing');
});
