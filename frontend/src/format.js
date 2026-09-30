const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Prices travel as integer cents; floats would turn 0.1 + 0.2 into 0.30000000000000004.
export const formatPrice = (cents) => usd.format(cents / 100);
