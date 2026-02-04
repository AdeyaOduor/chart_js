const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// Enable CORS for frontend-backend communication
app.use(cors());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Serve static files from current directory
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Sales Analytics Server is running'
  });
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Enhanced CSV upload endpoint with error handling
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded' 
      });
    }

    console.log(`Processing file: ${req.file.originalname}`);
    
    const results = [];
    let hasErrors = false;
    let errorMessages = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        try {
          // Normalize column names (case-insensitive)
          const normalizedData = {};
          
          Object.keys(data).forEach(key => {
            const normalizedKey = key.trim().toLowerCase();
            normalizedData[normalizedKey] = data[key];
          });

          // Extract data with flexible column names
          const date = normalizedData.date || normalizedData.date || '';
          const product = normalizedData.product || normalizedData.product || 'Unknown';
          
          // Parse quantity with fallback
          const quantityStr = normalizedData.quantity || normalizedData.quantity || normalizedData.qty || '0';
          const quantity = parseNumber(quantityStr);
          
          // Parse revenue with fallback
          const revenueStr = normalizedData.revenue || normalizedData.revenue || normalizedData.amount || normalizedData.price || '0';
          const revenue = parseNumber(revenueStr);

          results.push({
            date: date,
            product: product,
            quantity: quantity,
            revenue: revenue,
            unitPrice: quantity > 0 ? revenue / quantity : 0
          });
        } catch (error) {
          hasErrors = true;
          errorMessages.push(`Error parsing row: ${error.message}`);
        }
      })
      .on('end', () => {
        // Clean up the uploaded file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });

        if (results.length === 0) {
          return res.status(400).json({ 
            error: 'No valid data found in CSV file',
            details: errorMessages
          });
        }

        // Sort by date if dates are valid
        const sortedResults = results.sort((a, b) => {
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          return dateA - dateB;
        });

        // Calculate analytics
        const analytics = calculateAnalytics(sortedResults);

        res.json({
          success: true,
          message: `Processed ${sortedResults.length} records successfully`,
          data: sortedResults,
          analytics: analytics,
          metadata: {
            file: req.file.originalname,
            size: req.file.size,
            records: sortedResults.length,
            dateRange: analytics.dateRange,
            hasWarnings: hasErrors,
            warnings: errorMessages
          }
        });
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        res.status(500).json({ 
          error: 'Error parsing CSV file',
          details: error.message 
        });
      });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Server error during file processing',
      details: error.message 
    });
  }
});

// Analytics calculation endpoint
app.post('/analytics', express.json(), (req, res) => {
  try {
    const data = req.body.data;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ 
        error: 'Invalid data format. Expected array of sales records.' 
      });
    }

    const analytics = calculateAnalytics(data);
    
    res.json({
      success: true,
      analytics: analytics
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      error: 'Error calculating analytics',
      details: error.message 
    });
  }
});

// Utility functions
function parseNumber(str) {
  if (!str) return 0;
  // Remove currency symbols, commas, and whitespace
  const cleaned = String(str).replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return new Date(0); // Return epoch for invalid dates
  }
  
  dateStr = dateStr.trim();
  
  // Try multiple date formats
  const formats = [
    // DD/MM/YYYY or DD-MM-YYYY
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/,
    // MM/DD/YYYY or MM-DD-YYYY
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/,
    // YYYY/MM/DD or YYYY-MM-DD
    /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/,
    // DD/MM/YY or DD-MM-YY
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2})$/,
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const parts = match.slice(1);
      
      // Determine format based on part lengths
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else if (parts[2].length === 4) {
        // Try both DD-MM-YYYY and MM-DD-YYYY
        const date1 = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const date2 = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        
        // Return valid date (non-invalid)
        if (date1.getMonth() === parseInt(parts[1]) - 1 && !isNaN(date1.getTime())) {
          return date1;
        }
        return date2;
      } else if (parts[2].length === 2) {
        // DD-MM-YY
        const year = parseInt(parts[2]) + 2000;
        return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
  }
  
  // Fallback to Date.parse
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? new Date(0) : new Date(parsed);
}

function calculateAnalytics(data) {
  if (!data || data.length === 0) {
    return {
      totalQuantity: 0,
      totalRevenue: 0,
      avgQuantity: 0,
      avgRevenue: 0,
      avgPricePerUnit: 0,
      dateRange: { start: null, end: null },
      topProducts: [],
      dailyStats: []
    };
  }

  // Calculate totals
  const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  
  // Calculate date range
  const validDates = data
    .map(item => parseDate(item.date))
    .filter(date => !isNaN(date.getTime()) && date.getTime() > 0);
  
  const dateRange = validDates.length > 0 ? {
    start: new Date(Math.min(...validDates)).toISOString(),
    end: new Date(Math.max(...validDates)).toISOString()
  } : { start: null, end: null };
  
  // Group by product
  const productStats = {};
  data.forEach(item => {
    const product = item.product || 'Unknown';
    if (!productStats[product]) {
      productStats[product] = {
        quantity: 0,
        revenue: 0,
        count: 0
      };
    }
    productStats[product].quantity += item.quantity;
    productStats[product].revenue += item.revenue;
    productStats[product].count++;
  });
  
  // Get top products
  const topProducts = Object.entries(productStats)
    .map(([product, stats]) => ({
      product,
      quantity: stats.quantity,
      revenue: stats.revenue,
      avgRevenuePerUnit: stats.quantity > 0 ? stats.revenue / stats.quantity : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  // Group by date for daily stats
  const dailyStats = {};
  data.forEach(item => {
    const dateStr = parseDate(item.date).toLocaleDateString('en-US');
    if (!dailyStats[dateStr]) {
      dailyStats[dateStr] = {
        date: dateStr,
        quantity: 0,
        revenue: 0,
        transactions: 0
      };
    }
    dailyStats[dateStr].quantity += item.quantity;
    dailyStats[dateStr].revenue += item.revenue;
    dailyStats[dateStr].transactions++;
  });
  
  return {
    totalQuantity,
    totalRevenue,
    avgQuantity: totalQuantity / data.length,
    avgRevenue: totalRevenue / data.length,
    avgPricePerUnit: totalQuantity > 0 ? totalRevenue / totalQuantity : 0,
    dateRange,
    topProducts,
    dailyStats: Object.values(dailyStats).sort((a, b) => 
      parseDate(a.date) - parseDate(b.date)
    ),
    summary: {
      records: data.length,
      products: Object.keys(productStats).length,
      days: Object.keys(dailyStats).length
    }
  };
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 5MB.' 
      });
    }
    return res.status(400).json({ 
      error: `File upload error: ${err.message}` 
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
   Sales Analytics Server started!
   Local: http://localhost:${PORT}
   Health check: http://localhost:${PORT}/health
   Upload endpoint: POST http://localhost:${PORT}/upload
  Analytics endpoint: POST http://localhost:${PORT}/analytics
  `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  process.exit(0);
});


// const express = require('express');
// const multer = require('multer');
// const csv = require('csv-parser');
// const fs = require('fs');
// const bodyParser = require('body-parser');

// const app = express();
// const upload = multer({ dest: 'uploads/' });

// app.use(bodyParser.json());
// app.use(express.static('public'));

// app.post('/upload', upload.single('file'), (req, res) => {
//   const results = [];
  
//   fs.createReadStream(req.file.path)
//     .pipe(csv())
//     .on('data', (data) => results.push(data))
//     .on('end', () => {
//       // Process the results to find best sales
//       const salesData = results.map(row => ({
//         date: row.Date,
//         product: row.Product,
//         quantity: parseInt(row.Quantity),
//         revenue: parseFloat(row.Revenue)
//       }));
//       // Send processed data back to client
//       res.json(salesData);
//     });
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

