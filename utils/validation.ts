
const BLACKLISTED_WORDS = ['badword1', 'badword2', 'inappropriate']; // Example list

export const containsBlacklistedWords = (text: string): boolean => {
  const lowercasedText = text.toLowerCase();
  return BLACKLISTED_WORDS.some(word => lowercasedText.includes(word));
};

export const isValidThaiMobileNumber = (mobile: string): boolean => {
  if (!mobile) return false;
  const cleaned = mobile.replace(/[\s-]/g, ''); // Remove spaces and hyphens
  return /^0[689]\d{8}$/.test(cleaned); // 10 digits, starting 06, 08, 09
};
