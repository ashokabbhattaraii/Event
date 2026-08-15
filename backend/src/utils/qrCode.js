const QRCode = require("qrcode");

/**
 * Generate a QR code as a base64 data URI.
 * @param {string} data - The data to encode in the QR code (e.g., the JWT token)
 * @returns {Promise<string>} - Base64 data URI (data:image/png;base64,...)
 */
const generateQRCodeDataURI = async (data) => {
  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: "M",
      type: "image/png",
      margin: 1,
      width: 300,
      color: {
        dark: "#1f2937",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("[qrCode] Failed to generate QR code:", err.message);
    return null;
  }
};

module.exports = { generateQRCodeDataURI };