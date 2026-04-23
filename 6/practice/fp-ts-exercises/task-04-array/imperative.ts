// Task 4: ReadonlyArray
// Rewrite using fp-ts/ReadonlyArray and pipe
// Avoid mutation, use fp-ts array combinators

interface Product {
  category: string;
  id: number;
  inStock: boolean;
  name: string;
  price: number;
}

const products: Product[] = [
  { category: "electronics", id: 1, inStock: true, name: "Laptop", price: 999 },
  { category: "electronics", id: 2, inStock: false, name: "Phone", price: 599 },
  { category: "furniture", id: 3, inStock: true, name: "Desk", price: 299 },
  { category: "furniture", id: 4, inStock: true, name: "Chair", price: 199 },
  { category: "electronics", id: 5, inStock: true, name: "Tablet", price: 449 },
  { category: "electronics", id: 6, inStock: false, name: "Monitor", price: 349 },
];

// Get names of in-stock electronics sorted by price ascending
function getAvailableElectronicsNames(items: Product[]): string[] {
  const electronics = items.filter((p) => p.category === "electronics" && p.inStock);
  const sorted = electronics.sort((a, b) => a.price - b.price);
  return sorted.map((p) => p.name);
}

// Get total price of all in-stock items
function getTotalStockValue(items: Product[]): number {
  let total = 0;
  for (const item of items) {
    if (item.inStock) {
      total += item.price;
    }
  }
  return total;
}

// Group products by category
function groupByCategory(items: Product[]): Record<string, Product[]> {
  const result: Record<string, Product[]> = {};
  for (const item of items) {
    if (!result[item.category]) {
      result[item.category] = [];
    }
    result[item.category].push(item);
  }
  return result;
}

console.log(getAvailableElectronicsNames(products)); // ['Tablet', 'Laptop']
console.log(getTotalStockValue(products)); // 1946
console.log(groupByCategory(products));
