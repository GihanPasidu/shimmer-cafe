# Shimmer Cafe Data Storage

This folder contains all JSON data files used by the Shimmer Cafe application.

## Files Structure

The application uses the following data files:

- `settings.json` - Stores application settings like cafe name, tax rate, etc.
- `menuItems.json` - Contains all menu items with categories, prices, and ingredients
- `inventory.json` - Tracks inventory items, current stock, and reorder levels
- `orders.json` - Stores all completed orders with transaction details

## Data Backup

The application includes a backup feature that can export all data into a single JSON file. 
These backup files can be stored outside this directory and imported later if data restoration is needed.

## File Format

All files follow standard JSON format. Example of a menu item:

```json
{
  "id": 1,
  "name": "Cappuccino",
  "category": "coffee",
  "price": 4.99,
  "image": "cappuccino.jpg",
  "ingredients": ["espresso", "steamed milk", "milk foam"]
}
```

## Data Initialization

When the application runs for the first time, it automatically creates these files with sample data.
