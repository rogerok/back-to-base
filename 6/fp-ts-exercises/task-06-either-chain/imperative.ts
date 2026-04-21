// Task 6: Either chaining
// Rewrite using Either with chain to sequence validations and transformations
// Each step can fail — compose them without nested if/else

type AppError =
  | { type: 'ParseError'; message: string }
  | { type: 'ValidationError'; message: string }
  | { type: 'NotFoundError'; message: string };

interface Order {
  id: number;
  userId: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
}

const orders: Order[] = [
  { id: 1, userId: 10, amount: 250, status: 'paid' },
  { id: 2, userId: 10, amount: 80,  status: 'pending' },
  { id: 3, userId: 11, amount: 410, status: 'cancelled' },
];

function parseOrderId(raw: string): number | AppError {
  const id = parseInt(raw, 10);
  if (isNaN(id)) return { type: 'ParseError', message: `"${raw}" is not a valid ID` };
  return id;
}

function findOrder(id: number): Order | AppError {
  const order = orders.find(o => o.id === id);
  if (!order) return { type: 'NotFoundError', message: `Order ${id} not found` };
  return order;
}

function validateOrderStatus(order: Order): Order | AppError {
  if (order.status === 'cancelled') {
    return { type: 'ValidationError', message: 'Cannot process a cancelled order' };
  }
  return order;
}

function applyDiscount(order: Order): { order: Order; discount: number } | AppError {
  if (order.amount < 100) {
    return { type: 'ValidationError', message: 'Order amount too low for discount' };
  }
  return { order, discount: order.amount * 0.1 };
}

function processOrder(rawId: string): string {
  const id = parseOrderId(rawId);
  if ('type' in id) return `Error [${id.type}]: ${id.message}`;

  const order = findOrder(id);
  if ('type' in order) return `Error [${order.type}]: ${order.message}`;

  const validated = validateOrderStatus(order);
  if ('type' in validated) return `Error [${validated.type}]: ${validated.message}`;

  const result = applyDiscount(validated);
  if ('type' in result) return `Error [${result.type}]: ${result.message}`;

  return `Order #${result.order.id} processed. Discount: $${result.discount}`;
}

console.log(processOrder('1'));   // "Order #1 processed. Discount: $25"
console.log(processOrder('2'));   // Error [ValidationError]: Order amount too low for discount
console.log(processOrder('3'));   // Error [ValidationError]: Cannot process a cancelled order
console.log(processOrder('99'));  // Error [NotFoundError]: Order 99 not found
console.log(processOrder('abc')); // Error [ParseError]: "abc" is not a valid ID
