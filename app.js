const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// Get current working directory safely
const currentDir = process.cwd();
console.log('Current directory:', currentDir);

// Enable CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from current directory
app.use(express.static(currentDir));

// Configure multer for file uploads
const uploadsDir = path.join(currentDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept CSV files
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  // Check if index.html exists
  const indexPath = path.join(currentDir, 'index.html');
  const indexExists = fs.existsSync(indexPath);
  
  res.json({ 
    status: 'ok',
    server: 'Sales Analytics Dashboard',
    directory: currentDir,
    indexExists: indexExists,
    timestamp: new Date().toISOString(),
    endpoints: {
      upload: 'POST /upload',
      health: 'GET /health',
      home: 'GET /'
    }
  });
});

// Home route - serve index.html or dashboard
app.get('/', (req, res) => {
  const indexPath = path.join(currentDir, 'index.html');
  
  // Check if index.html exists
  if (fs.existsSync(indexPath)) {
    console.log('Serving index.html from:', indexPath);
    res.sendFile(indexPath);
  } else {
    console.log('index.html not found, serving dashboard template');
    // Serve a fallback dashboard
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title> Analytics Dashboard</title>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <style>
          * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
          }
          
          body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              /* Improved background properties */
              background-image: url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
              background-size: cover; /* Ensures image covers entire viewport */
              background-position: center center; /* Centers the image */
              background-repeat: no-repeat; /* Prevents tiling */
              background-attachment: fixed; /* Creates parallax effect */
              background-color: #667eea; /* Fallback color if image fails to load */
              min-height: 100vh;
              padding: 20px;
              color: white;
              /* Add a dark overlay for better text readability */
              position: relative;
          }
          
          /* Optional: Add overlay for better text contrast */
          body::before {
              content: '';
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0, 0, 0, 0.5); /* Dark overlay */
              z-index: -1; /* Behind content */
          }
          
          .container { 
              max-width: 1200px; 
              margin: 0 auto; 
              background: rgba(255, 255, 255, 0.95);
              border-radius: 20px;
              padding: 40px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              color: #333;
              position: relative; /* Ensures it's above the overlay */
              z-index: 1;
              /* Ensure container doesn't get too tall on small screens */
              max-height: calc(100vh - 40px); /* Account for body padding */
              overflow-y: auto; /* Add scroll if content overflows */
          }
          
          /* Responsive container */
          @media (max-width: 1240px) {
              .container {
                  margin: 0 20px;
                  max-width: calc(100% - 40px);
              }
          }
          
          @media (max-width: 768px) {
              .container {
                  padding: 25px;
                  margin: 0 15px;
                  border-radius: 15px;
              }
          }
          
          @media (max-width: 480px) {
              .container {
                  padding: 20px;
                  margin: 0 10px;
                  border-radius: 12px;
              }
          }
          
          h1 { 
              color: #2c3e50; 
              margin-bottom: 30px;
              text-align: center;
              font-size: 2.5em;
              text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          /* Responsive heading */
          @media (max-width: 768px) {
              h1 {
                  font-size: 2em;
                  margin-bottom: 20px;
              }
          }
          
          @media (max-width: 480px) {
              h1 {
                  font-size: 1.8em;
                  margin-bottom: 15px;
              }
          }
          
          .status-card {
              background: linear-gradient(135deg, #36d1dc 0%, #5b86e5 100%);
              color: white;
              padding: 25px;
              border-radius: 15px;
              margin: 20px 0;
              box-shadow: 0 10px 30px rgba(0,0,0,0.15);
              /* Ensure proper text contrast */
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
          }
          
          .upload-section {
              background: white;
              padding: 30px;
              border-radius: 15px;
              margin: 30px 0;
              border: 2px dashed #667eea;
              text-align: center;
              box-shadow: 0 10px 25px rgba(0,0,0,0.08);
              transition: all 0.3s ease;
          }
          
          /* Add hover effect for upload section */
          .upload-section:hover {
              border-color: #764ba2;
              box-shadow: 0 15px 35px rgba(0,0,0,0.12);
              transform: translateY(-5px);
          }
          
          input[type="file"] {
              padding: 15px;
              margin: 15px;
              border: 2px solid #667eea;
              border-radius: 10px;
              width: 80%;
              font-size: 16px;
              background: white;
              color: #333;
              cursor: pointer;
              transition: all 0.3s ease;
              max-width: 500px; /* Prevent from getting too wide */
          }
          
          input[type="file"]:hover {
              border-color: #764ba2;
          }
          
          input[type="file"]:focus {
              outline: none;
              box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
          }
          
          button {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 15px 30px;
              border-radius: 10px;
              font-size: 18px;
              cursor: pointer;
              transition: all 0.3s;
              margin: 10px;
              font-weight: 600;
              letter-spacing: 0.5px;
              box-shadow: 0 5px 15px rgba(0,0,0,0.1);
              min-width: 200px; /* Consistent button width */
          }
          
          button:hover {
              background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
              transform: translateY(-3px);
              box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          }
          
          button:active {
              transform: translateY(-1px);
              box-shadow: 0 5px 15px rgba(0,0,0,0.15);
          }
          
          .info {
              margin-top: 30px;
              padding: 25px;
              background: #f8f9fa;
              border-radius: 10px;
              border-left: 5px solid #667eea;
              box-shadow: 0 5px 15px rgba(0,0,0,0.05);
          }
          
          code {
              background: #e9ecef;
              padding: 5px 10px;
              border-radius: 5px;
              font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
              color: #d63384;
              font-size: 0.95em;
              display: inline-block;
              margin: 2px 0;
          }
          
          /* Scrollbar styling for container */
          .container::-webkit-scrollbar {
              width: 8px;
          }
          
          .container::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.05);
              border-radius: 10px;
          }
          
          .container::-webkit-scrollbar-thumb {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 10px;
          }
          
          .container::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
          }
          
          /* Loading animation */
          .loading {
              display: none;
              text-align: center;
              margin: 20px 0;
          }
          
          .spinner {
              border: 4px solid rgba(255, 255, 255, 0.3);
              border-radius: 50%;
              border-top: 4px solid #667eea;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 10px;
          }
          
          @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
          }
          
          /* Chart containers */
          .chart-container {
              background: white;
              padding: 20px;
              border-radius: 12px;
              margin: 20px 0;
              box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          }
          
          /* Responsive adjustments */
          @media (max-width: 768px) {
              body {
                  padding: 15px;
              }
              
              input[type="file"] {
                  width: 90%;
                  margin: 10px 0;
                  padding: 12px;
              }
              
              button {
                  padding: 12px 25px;
                  font-size: 16px;
                  min-width: 180px;
              }
              
              .upload-section,
              .status-card,
              .info {
                  padding: 20px;
                  margin: 15px 0;
              }
          }
          
          @media (max-width: 480px) {
              body {
                  padding: 10px;
              }
              
              .container {
                  padding: 15px;
              }
              
              h1 {
                  font-size: 1.6em;
              }
              
              button {
                  padding: 10px 20px;
                  font-size: 15px;
                  min-width: 160px;
                  margin: 5px;
              }
              
              input[type="file"] {
                  width: 95%;
                  padding: 10px;
                  font-size: 14px;
              }
          }
          
          /* Ensure proper text visibility on all backgrounds */
          .text-light-bg {
              color: #333;
          }
          
          .text-dark-bg {
              color: white;
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
          }
          
          /* Utility classes */
          .text-center {
              text-align: center;
          }
          
          .mt-20 {
              margin-top: 20px;
          }
          
          .mb-20 {
              margin-bottom: 20px;
          }
          
          .p-20 {
              padding: 20px;
          }
      </style>
      </head>
      <body>
          <div class="container">
              <h1>📊 Analytics Dashboard</h1>
              
              <div class="status-card">
                  <h2>🚀 Server Running Successfully!</h2>
                  <p>Directory: ${currentDir}</p>
                  <p>Uploads folder: ${uploadsDir}</p>
              </div>
              
              <div class="upload-section">
                  <h3>Upload CSV File</h3>
                  <input type="file" id="csvFile" accept=".csv">
                  <button onclick="uploadFile()">📁 Upload & Analyze</button>
                  <div id="message" style="margin-top: 15px; color: #666;"></div>
              </div>
              
              <div class="info">
                  <h4>CSV Format Required:</h4>
                  <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
Date,Quantity,Revenue
31/1/2026,4,4200
01/02/26,3,3000
02/02/26,2,5500</pre>
                  
                  <h4>API Endpoints:</h4>
                  <ul style="margin-left: 20px; margin-top: 10px;">
                      <li><code>POST /upload</code> - Upload CSV file</li>
                      <li><code>GET /health</code> - Server health check</li>
                  </ul>
                  
                  <p style="margin-top: 15px; color: #666;">
                      <strong>Note:</strong> Place your <code>index.html</code> file in <code>${currentDir}</code> to use the full dashboard.
                  </p>
              </div>
              
              <div id="charts" style="margin-top: 40px;"></div>
          </div>
          
          <script>
              async function uploadFile() {
                  const fileInput = document.getElementById('csvFile');
                  const messageDiv = document.getElementById('message');
                  
                  if (!fileInput.files[0]) {
                      messageDiv.innerHTML = '<span style="color: #dc3545;">Please select a CSV file first.</span>';
                      return;
                  }
                  
                  const formData = new FormData();
                  formData.append('file', fileInput.files[0]);
                  
                  messageDiv.innerHTML = '<span style="color: #007bff;">⏳ Processing file...</span>';
                  
                  try {
                      const response = await fetch('/upload', {
                          method: 'POST',
                          body: formData
                      });
                      
                      const result = await response.json();
                      
                      if (response.ok) {
                          messageDiv.innerHTML = \`<span style="color: #28a745;">✅ Success! Processed \${result.data.length} records.</span>\`;
                          displayCharts(result.data);
                      } else {
                          messageDiv.innerHTML = \`<span style="color: #dc3545;">❌ Error: \${result.error}</span>\`;
                      }
                  } catch (error) {
                      messageDiv.innerHTML = \`<span style="color: #dc3545;">❌ Network error: \${error.message}</span>\`;
                  }
              }
              
              function displayCharts(data) {
                  const chartsDiv = document.getElementById('charts');
                  chartsDiv.innerHTML = '<h3 style="color: #2c3e50; margin-bottom: 20px;">📈 Data Visualization</h3>';
                  
                  // Create chart containers
                  chartsDiv.innerHTML += \`
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                          <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                              <h4 style="color: #2c3e50; margin-bottom: 15px;">Quantity Over Time</h4>
                              <canvas id="quantityChart" height="250"></canvas>
                          </div>
                          <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                              <h4 style="color: #2c3e50; margin-bottom: 15px;">Revenue Over Time</h4>
                              <canvas id="revenueChart" height="250"></canvas>
                          </div>
                      </div>
                  \`;
                  
                  // Prepare data for charts
                  const dates = data.map(item => item.date);
                  const quantities = data.map(item => item.quantity);
                  const revenues = data.map(item => item.revenue);
                  
                  // Create quantity chart
                  new Chart(document.getElementById('quantityChart'), {
                      type: 'line',
                      data: {
                          labels: dates,
                          datasets: [{
                              label: 'Quantity',
                              data: quantities,
                              borderColor: '#36a2eb',
                              backgroundColor: 'rgba(54, 162, 235, 0.1)',
                              borderWidth: 2,
                              tension: 0.3
                          }]
                      },
                      options: {
                          responsive: true,
                          plugins: {
                              legend: { display: true }
                          }
                      }
                  });
                  
                  // Create revenue chart
                  new Chart(document.getElementById('revenueChart'), {
                      type: 'line',
                      data: {
                          labels: dates,
                          datasets: [{
                              label: 'Revenue ($)',
                              data: revenues,
                              borderColor: '#4bc0c0',
                              backgroundColor: 'rgba(75, 192, 192, 0.1)',
                              borderWidth: 2,
                              tension: 0.3
                          }]
                      },
                      options: {
                          responsive: true,
                          plugins: {
                              legend: { display: true }
                          }
                      }
                  });
              }
          </script>
      </body>
      </html>
    `);
  }
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    console.log(`Processing file: ${req.file.originalname}, size: ${req.file.size} bytes`);
    
    const results = [];
    
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        try {
          // Process CSV row
          const row = {
            date: data.Date || data.date || '',
            quantity: parseInt(data.Quantity || data.quantity || '0') || 0,
            revenue: parseInt(data.Revenue || data.revenue || '0') || 0,
            product: data.Product || data.product || 'Unknown'
          };
          
          results.push(row);
        } catch (error) {
          console.log('Error parsing row:', error.message);
        }
      })
      .on('end', () => {
        // Clean up uploaded file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });

        if (results.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No valid data found in CSV file'
          });
        }

        // Calculate summary
        const summary = {
          totalQuantity: results.reduce((sum, item) => sum + item.quantity, 0),
          totalRevenue: results.reduce((sum, item) => sum + item.revenue, 0),
          avgQuantity: results.reduce((sum, item) => sum + item.quantity, 0) / results.length,
          avgRevenue: results.reduce((sum, item) => sum + item.revenue, 0) / results.length,
          records: results.length
        };

        res.json({
          success: true,
          message: `Processed ${results.length} records successfully`,
          data: results,
          summary: summary,
          file: {
            name: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype
          }
        });
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        res.status(500).json({ 
          success: false,
          error: 'Error parsing CSV file',
          details: error.message 
        });
      });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error during file processing',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        error: 'File too large. Maximum size is 5MB.' 
      });
    }
    return res.status(400).json({ 
      success: false,
      error: `File upload error: ${err.message}` 
    });
  }
  
  res.status(500).json({ 
    success: false,
    error: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║    🚀 Sales Analytics Server Started!         ║
  ╠═══════════════════════════════════════════════╣
  ║  📍 Local:    http://localhost:${PORT}        ║
  ║  📍 Network:  http://${getLocalIP()}:${PORT}  ║
  ║  📂 Directory: ${currentDir}                  ║
  ║  📊 Health:   http://localhost:${PORT}/health ║
  ║  📁 Upload:   POST /upload                    ║
  ╚═══════════════════════════════════════════════╝
  `);
});

// Helper to get local IP address
function getLocalIP() {
  try {
    const { networkInterfaces } = require('os');
    const interfaces = networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (error) {
    console.log('Could not get local IP:', error.message);
  }
  return 'localhost';
}

// Handle graceful shutdown
['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal, () => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    process.exit(0);
  });
});

