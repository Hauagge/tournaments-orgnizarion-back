export async function generateSubscriptionNumber() {
  const currentYear = new Date().getFullYear();
  const randomNumber = Math.floor(Math.random() * 10000);
  return `${currentYear}-${randomNumber}`;
}
