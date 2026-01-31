const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/upload', upload.single('file'), (req, res) => {
  const results = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      // Process the results to find best sales
      const salesData = results.map(row => ({
        date: row.Date,
        product: row.Product,
        quantity: parseInt(row.Quantity),
        revenue: parseFloat(row.Revenue)
      }));
      // Send processed data back to client
      res.json(salesData);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

