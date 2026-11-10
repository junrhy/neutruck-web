export function getNextSequentialId(prefix: string, items: { id: string }[], defaultStartNum: number = 101): string {
  const existingNums = items
    .map((item) => {
      if (!item.id) return null;
      const match = item.id.match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    })
    .filter((n): n is number => n !== null && !isNaN(n));

  const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : defaultStartNum - 1;
  const nextNum = Math.max(maxNum + 1, defaultStartNum);
  return `${prefix}-${nextNum}`;
}
