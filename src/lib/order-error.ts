// Shared order error type. Lives in its own module so both orders.ts and
// onepay-store.ts can throw/catch it without a circular import. Checkout actions
// surface `OrderError.message` directly to the user (other errors are generic).
export class OrderError extends Error {}
