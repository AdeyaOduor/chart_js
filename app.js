// Main application logic
document.addEventListener('DOMContentLoaded', function() {
  // Initialize event listeners
  document.getElementById('uploadBtn').addEventListener('click', handleFileUpload);
  
  // Setup sample CSV download
  document.getElementById('sampleBtn').addEventListener('click', function() {
      const sampleCSV = `Date,Quantity,Revenue
01/01/2026,10,1200
01/02/2026,15,1800
01/03/2026,8,960
01/04/2026,12,1440
01/05/2026,20,2400
01/06/2026,18,2160
01/07/2026,14,1680
01/08/2026,22,2640
01/09/2026,16,1920
01/10/2026,11,1320
01/11/2026,19,2280
01/12/2026,25,3000`;
      
      const blob = new Blob([sampleCSV], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample_sales_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
  });
});

async function handleFileUpload() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  const loadingElement = document.getElementById('loading');
  const summaryElement = document.getElementById('analyticsSummary');
  const chartsContainer = document.getElementById('chartsContainer');

  if (!file) {
      alert('Please select a CSV file first.');
      return;
  }

  // Reset previous displays
  summaryElement.style.display = 'none';
  chartsContainer.style.display = 'none';
  loadingElement.style.display = 'block';

  try {
      // Parse CSV directly in browser
      const csvText = await file.text();
      const salesData = parseCSVText(csvText);
      
      if (salesData.length === 0) {
          throw new Error('No valid data found in CSV file.');
      }
      
      // Visualize the data
      visualizeData(salesData);
      
      // Show containers
      summaryElement.style.display = 'block';
      chartsContainer.style.display = 'grid';
      
  } catch (error) {
      alert('Error: ' + error.message);
      console.error('Error details:', error);
  } finally {
      loadingElement.style.display = 'none';
  }
}
///////////////////////////////////////////////////////////////////////////////////

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

