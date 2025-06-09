/**
 * Detects URLs in text and returns an array of objects with the text and whether it's a URL
 * @param {string} text - The text to process
 * @returns {Array<{text: string, isUrl: boolean, href?: string}>} - Array of text segments with URL information
 */
export const linkify = (text) => {
  if (!text) return [];

  // Regular expression to match URLs
  // This regex matches common URL patterns including http, https, ftp, www, and common TLDs
  // It handles URLs with paths, query parameters, and fragments
  const urlRegex = /(https?:\/\/|www\.)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,63}(:[0-9]{1,5})?(\/[^\s]*)?/gi;

  // Find all matches
  const matches = Array.from(text.matchAll(urlRegex));

  // If no URLs found, return the original text
  if (matches.length === 0) {
    return [{ text, isUrl: false }];
  }

  // Process the text to separate URLs from regular text
  const result = [];
  let lastIndex = 0;

  matches.forEach(match => {
    const url = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + url.length;

    // Add text before the URL if there is any
    if (startIndex > lastIndex) {
      result.push({
        text: text.substring(lastIndex, startIndex),
        isUrl: false
      });
    }

    // Clean up the URL and ensure it has a proper protocol
    let cleanUrl = url.trim();
    // Remove trailing punctuation that might have been captured
    cleanUrl = cleanUrl.replace(/[.,;:!?]$/, '');

    // Ensure URL has proper protocol for href
    const href = cleanUrl.startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;

    // Add the URL
    result.push({
      text: cleanUrl,
      isUrl: true,
      href
    });

    lastIndex = endIndex;
  });

  // Add any remaining text after the last URL
  if (lastIndex < text.length) {
    result.push({
      text: text.substring(lastIndex),
      isUrl: false
    });
  }

  return result;
};
