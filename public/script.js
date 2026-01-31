document.getElementById('uploadBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please upload a CSV file.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    // Send the CSV file to the server
    const response = await fetch('/upload', {
        method: 'POST',
        body: formData
    });

    const salesData = await response.json();
    createChart(salesData);
});

function createChart(data) {
    const labels = [];
    const quantities = [];

    // Aggregate data by date
    const aggregatedData = data.reduce((acc, sale) => {
        if (!acc[sale.date]) {
            acc[sale.date] = { quantity: 0, revenue: 0 };
        }
        acc[sale.date].quantity += sale.quantity;
        acc[sale.date].revenue += sale.revenue;
        return acc;
    }, {});

    // Prepare data for the chart
    for (const date in aggregatedData) {
        labels.push(date);
        quantities.push(aggregatedData[date].quantity);
    }

    // Create the chart
    const ctx = document.getElementById('salesChart').getContext('2d');
    const salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantity Sold',
                data: quantities,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}