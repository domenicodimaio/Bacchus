/**
 * 🍎 ENDPOINT VALIDAZIONE RECEIPT APPLE
 * 
 * Implementa la logica richiesta da Apple:
 * 1. Prova prima con ambiente di produzione
 * 2. Se fallisce con "Sandbox receipt used in production", riprova con sandbox
 * 
 * Deploy su Vercel, Netlify Functions, o qualsiasi serverless provider
 */

const https = require('https');

// URL Apple per validazione receipt
const PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

/**
 * Valida un receipt con Apple
 */
async function validateReceiptWithApple(receiptData, url, password = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      'receipt-data': receiptData,
      'password': password, // Shared secret per auto-renewable subscriptions
      'exclude-old-transactions': true
    });

    const options = {
      hostname: url.replace('https://', '').split('/')[0],
      port: 443,
      path: '/verifyReceipt',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid JSON response from Apple'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Endpoint principale per validazione receipt
 * Implementa la logica richiesta da Apple
 */
async function validateReceipt(receiptData, sharedSecret = null) {
  try {
    console.log('🍎 Validating receipt with production environment first...');
    
    // STEP 1: Prova prima con ambiente di produzione
    const productionResponse = await validateReceiptWithApple(receiptData, PRODUCTION_URL, sharedSecret);
    
    // Se la validazione di produzione ha successo, ritorna il risultato
    if (productionResponse.status === 0) {
      console.log('✅ Receipt validated successfully in production environment');
      return {
        success: true,
        environment: 'production',
        data: productionResponse
      };
    }
    
    // STEP 2: Se fallisce con errore sandbox, prova con ambiente sandbox
    if (productionResponse.status === 21007) { // "Sandbox receipt used in production"
      console.log('🔄 Production validation failed with sandbox receipt error, trying sandbox...');
      
      const sandboxResponse = await validateReceiptWithApple(receiptData, SANDBOX_URL, sharedSecret);
      
      if (sandboxResponse.status === 0) {
        console.log('✅ Receipt validated successfully in sandbox environment');
        return {
          success: true,
          environment: 'sandbox',
          data: sandboxResponse
        };
      } else {
        console.error('❌ Sandbox validation also failed:', sandboxResponse.status);
        return {
          success: false,
          error: 'Receipt validation failed in both environments',
          productionStatus: productionResponse.status,
          sandboxStatus: sandboxResponse.status
        };
      }
    }
    
    // Altri errori di produzione
    console.error('❌ Production validation failed with status:', productionResponse.status);
    return {
      success: false,
      error: 'Receipt validation failed in production',
      status: productionResponse.status,
      environment: 'production'
    };
    
  } catch (error) {
    console.error('❌ Receipt validation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export per uso come modulo
module.exports = { validateReceipt };

// Handler per Vercel/Netlify Functions
module.exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { receiptData, sharedSecret } = JSON.parse(event.body);
    
    if (!receiptData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Receipt data is required' })
      };
    }

    const result = await validateReceipt(receiptData, sharedSecret);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Handler per Express.js (se usi un server tradizionale)
module.exports.expressHandler = (req, res) => {
  // CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { receiptData, sharedSecret } = req.body;
  
  if (!receiptData) {
    return res.status(400).json({ error: 'Receipt data is required' });
  }

  validateReceipt(receiptData, sharedSecret)
    .then(result => {
      res.json(result);
    })
    .catch(error => {
      console.error('Express handler error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
};
