document.getElementById('uploadBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please upload a CSV file.');
        return;
    }

    try {
        // Option 1: Parse CSV directly in browser (no server needed)
        const csvText = await file.text();
        const salesData = parseCSVText(csvText);
        
        // Visualize the data
        visualizeData(salesData);
        
    } catch (error) {
        alert('Error processing CSV file: ' + error.message);
        console.error('CSV processing error:', error);
    }
});

// Parse CSV text directly in browser
function parseCSVText(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
        throw new Error('CSV file is empty');
    }
    
    // Extract headers
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Parse data rows
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        const rowData = {};
        
        headers.forEach((header, index) => {
            rowData[header] = row[index] ? row[index].trim() : '';
        });
        
        // Convert to proper data types
        const processedRow = {
            date: parseDate(rowData['Date'] || rowData['date']),
            quantity: parseInt(rowData['quantity'] || rowData['Quantity'] || 0),
            revenue: parseInt(rowData['Revenue'] || rowData['revenue'] || 0)
        };
        
        if (processedRow.date && !isNaN(processedRow.date)) {
            data.push(processedRow);
        }
    }
    
    return data.sort((a, b) => a.date - b.date);
}

// Robust date parsing function
function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') {
        console.warn('Empty date string encountered');
        return new Date();
    }
    
    // Clean the date string
    dateStr = dateStr.trim();
    
    // Try multiple date formats
    const dateFormats = [
        // Format: DD/MM/YYYY or D/M/YYYY
        /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
        // Format: DD/MM/YY or D/M/YY
        /^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/,
        // Format: YYYY-MM-DD
        /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/,
    ];
    
    for (const format of dateFormats) {
        const match = dateStr.match(format);
        if (match) {
            if (match[3].length === 4) {
                // YYYY format
                if (match[1].length === 4) {
                    // YYYY-MM-DD format
                    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                } else {
                    // DD/MM/YYYY format
                    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
                }
            } else if (match[3].length === 2) {
                // YY format - assume 2000s
                const year = parseInt(match[3]) + 2000;
                return new Date(year, parseInt(match[2]) - 1, parseInt(match[1]));
            }
        }
    }
    
    // Try standard Date.parse as fallback
    const parsedDate = Date.parse(dateStr);
    if (!isNaN(parsedDate)) {
        return new Date(parsedDate);
    }
    
    console.warn(`Could not parse date: "${dateStr}", using current date`);
    return new Date();
}

function visualizeData(salesData) {
    console.log('Processed data:', salesData);
    
    if (!salesData || salesData.length === 0) {
        alert('No valid data found in CSV file.');
        return;
    }
    
    // Destroy existing charts if they exist
    destroyExistingCharts();
    
    // Create charts
    createQuantityChart(salesData);
    createRevenueChart(salesData);
    createCombinedChart(salesData);
    
    // Display analytics summary
    displayAnalyticsSummary(salesData);
}

// Helper function to destroy existing charts
function destroyExistingCharts() {
    const charts = ['quantityChart', 'revenueChart', 'combinedChart'];
    charts.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas && canvas.chart) {
            canvas.chart.destroy();
            canvas.chart = null;
        }
    });
}

function createQuantityChart(data) {
    const dates = data.map(item => item.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }));
    const quantities = data.map(item => item.quantity);
    
    const ctx = document.getElementById('quantityChart');
    if (!ctx) {
        console.error('quantityChart canvas not found');
        return;
    }
    
    ctx.chart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Quantity Sold',
                data: quantities,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                borderWidth: 3,
                tension: 0.2,
                pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: getChartOptions('Quantity Sold Over Time', 'Date', 'Quantity')
    });
}

function createRevenueChart(data) {
    const dates = data.map(item => item.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }));
    const revenues = data.map(item => item.revenue);
    
    const ctx = document.getElementById('revenueChart');
    if (!ctx) {
        console.error('revenueChart canvas not found');
        return;
    }
    
    ctx.chart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Revenue',
                data: revenues,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                borderWidth: 3,
                tension: 0.2,
                pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                pointRadius: 5,
                pointHoverRadius: 8,
                fill: true
            }]
        },
        options: getChartOptions('Revenue Over Time', 'Date', 'Revenue ($)', true)
    });
}

function createCombinedChart(data) {
    const dates = data.map(item => item.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }));
    const quantities = data.map(item => item.quantity);
    const revenues = data.map(item => item.revenue);
    
    const ctx = document.getElementById('combinedChart');
    if (!ctx) {
        console.error('combinedChart canvas not found');
        return;
    }
    
    ctx.chart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Quantity Sold',
                    data: quantities,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Revenue ($)',
                    data: revenues,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: getCombinedChartOptions()
    });
}

// Helper function for chart options
function getChartOptions(title, xLabel, yLabel, withFill = false) {
    return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            title: {
                display: true,
                text: title,
                color: '#2c3e50',
                font: { size: 16, weight: 'bold' }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toLocaleString();
                            if (yLabel.includes('Revenue')) {
                                label += '$';
                            }
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: xLabel,
                    color: '#666'
                },
                grid: {
                    color: 'rgba(0,0,0,0.05)'
                }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: yLabel,
                    color: '#666'
                },
                grid: {
                    color: 'rgba(0,0,0,0.05)'
                },
                ticks: {
                    callback: function(value) {
                        return value.toLocaleString();
                    }
                }
            }
        }
    };
}

function getCombinedChartOptions() {
    return {
        responsive: true,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        stacked: false,
        plugins: {
            title: {
                display: true,
                text: 'Quantity vs Revenue Comparison',
                color: '#333',
                font: { size: 16, weight: 'bold' }
            }
        },
        scales: {
            x: {
                title: { display: true, text: 'Date', color: '#666' }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Quantity', color: '#666' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'Revenue ($)', color: '#666' },
                grid: {
                    drawOnChartArea: false,
                },
            }
        }
    };
}

function displayAnalyticsSummary(data) {
    const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const avgQuantity = totalQuantity / data.length;
    const avgRevenue = totalRevenue / data.length;
    const minQuantity = Math.min(...data.map(item => item.quantity));
    const maxQuantity = Math.max(...data.map(item => item.quantity));
    
    const summaryDiv = document.getElementById('analyticsSummary');
    if (!summaryDiv) {
        console.error('analyticsSummary div not found');
        return;
    }
    
    summaryDiv.innerHTML = `
        <h3 style="color: #2c3e50; margin-top: 0;">Analytics Summary</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div class="metric-card">
                <div class="metric-label">Total Quantity</div>
                <div class="metric-value">${totalQuantity.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Total Revenue</div>
                <div class="metric-value">$${totalRevenue.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Avg Daily Quantity</div>
                <div class="metric-value">${avgQuantity.toFixed(1)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Avg Daily Revenue</div>
                <div class="metric-value">$${avgRevenue.toFixed(0)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Min Quantity</div>
                <div class="metric-value">${minQuantity}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Max Quantity</div>
                <div class="metric-value">${maxQuantity}</div>
            </div>
        </div>
    `;
}

// Add this CSS to your style section
const style = document.createElement('style');
style.textContent = `
    .metric-card {
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        text-align: center;
    }
    .metric-label {
        font-size: 12px;
        color: #7f8c8d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 5px;
    }
    .metric-value {
        font-size: 24px;
        font-weight: bold;
        color: #2c3e50;
    }
`;
document.head.appendChild(style);