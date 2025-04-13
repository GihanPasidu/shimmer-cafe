# Shimmer Cafe Management System

A professional point-of-sale and cafe management solution for Shimmer Cafe with modern UI, animations, and responsive design.

![Shimmer Cafe POS](https://via.placeholder.com/800x400?text=Shimmer+Cafe+POS)

## Features

- **Point of Sale (POS)**: Process customer orders quickly and efficiently with a modern interface
- **Inventory Management**: Track stock levels and get alerts when items need to be reordered
- **Sales Reporting**: View daily, weekly, and monthly sales reports with visual charts
- **Popular Items Analysis**: Identify best-selling menu items with data visualization
- **Settings Management**: Customize cafe name, tax rates, and other settings

## Technical Details

This application uses:
- HTML5, CSS3, and JavaScript for the frontend
- Modern UI with animations and responsive design
- Chart.js for visual data representation
- SweetAlert2 for enhanced dialogs and notifications
- Toastr for non-intrusive notifications
- LocalStorage for data persistence
- Webpack for module bundling (development)

## Installation

### Quick Start (No Build Required)
1. Clone this repository to your local machine
2. Open the `index.html` file in a modern web browser (Chrome, Firefox, Edge, etc.)
3. The system will automatically create sample data on first run

### Development Setup
1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
4. For production build:
   ```
   npm run build
   ```

## Usage Instructions

### POS
- Select items from the menu to add them to the current order
- Adjust quantities or remove items as needed
- Click "Process Payment" to complete the transaction
- Print receipts directly from the application

### Inventory
- View current stock levels of all items with color-coded alerts
- Add new inventory items or update existing ones
- Bulk update stock levels with the update stock feature

### Reports
- View sales data by day, week, or month with interactive charts
- Analyze which menu items are most popular
- Track financial performance over time with visual indicators

### Settings
- Customize cafe name and tax rates
- Backup and restore data for safety

## Data Management

The system stores all data locally in your browser's localStorage. It's recommended to:
- Perform regular backups using the backup feature in Settings
- Restore from backup if needed or when moving to a new computer

## Contributing

This project is maintained by Shimmer Cafe. For suggestions or improvements, please open an issue or submit a pull request.

## License

MIT License

