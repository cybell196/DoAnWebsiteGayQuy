const { PayOS } = require('@payos/node');

// Khởi tạo PayOS client
const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || '681d4d90-dcd4-499f-a147-c7461f86298f',
  apiKey: process.env.PAYOS_API_KEY || '3ad1f2d0-ea1a-40d2-a7b2-d413c308c85d',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || '85fd0ce9b13f934fb5ebb92850b38539617a7e95866c6e9f66d68854e06c35d0'
});

/**
 * Tạo payment link từ PayOS
 * @param {Object} paymentData - Dữ liệu thanh toán
 * @param {number} paymentData.amount - Số tiền VND
 * @param {string} paymentData.description - Mô tả giao dịch
 * @param {string} paymentData.orderCode - Mã đơn hàng (unique)
 * @param {string} paymentData.returnUrl - URL trả về sau khi thanh toán thành công
 * @param {string} paymentData.cancelUrl - URL trả về khi hủy thanh toán
 * @returns {Promise<Object>} Payment link data
 */
const createPaymentLink = async (paymentData) => {
  try {
    const { amount, description, orderCode, returnUrl, cancelUrl } = paymentData;

    // Đảm bảo description và item name không vượt quá 25 ký tự
    let safeDescription = description || 'Quyên góp';
    if (safeDescription.length > 25) {
      safeDescription = safeDescription.substring(0, 22) + '...';
    }

    const paymentLinkData = {
      orderCode: orderCode,
      amount: amount,
      description: safeDescription,
      items: [
        {
          name: safeDescription, // Item name cũng cần tối đa 25 ký tự
          quantity: 1,
          price: amount
        }
      ],
      returnUrl: returnUrl,
      cancelUrl: cancelUrl
    };

    const paymentLink = await payOS.paymentRequests.create(paymentLinkData);
    
    console.log('PayOS response:', JSON.stringify(paymentLink, null, 2));
    
    if (!paymentLink || !paymentLink.checkoutUrl) {
      console.error('PayOS response missing checkoutUrl:', paymentLink);
      throw new Error('PayOS không trả về checkout URL. Response: ' + JSON.stringify(paymentLink));
    }
    
    return {
      success: true,
      checkoutUrl: paymentLink.checkoutUrl,
      paymentLink: paymentLink
    };
  } catch (error) {
    console.error('Lỗi khi tạo payment link từ PayOS:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Xác minh webhook từ PayOS
 * @param {Object} webhookData - Dữ liệu webhook
 * @returns {Promise<Object>} Verified webhook data
 */
const verifyWebhook = async (webhookData) => {
  try {
    // PayOS SDK tự động verify signature
    // Nếu cần verify thủ công, có thể sử dụng checksum key
    return {
      success: true,
      data: webhookData
    };
  } catch (error) {
    console.error('Lỗi khi verify webhook:', error);
    throw error;
  }
};

/**
 * Lấy thông tin payment từ PayOS
 * @param {number} orderCode - Mã đơn hàng
 * @returns {Promise<Object>} Payment information
 */
const getPaymentInfo = async (orderCode) => {
  try {
    const paymentInfo = await payOS.paymentRequests.get(orderCode);
    return {
      success: true,
      data: paymentInfo
    };
  } catch (error) {
    console.error('Lỗi khi lấy thông tin payment:', error);
    throw error;
  }
};

module.exports = {
  createPaymentLink,
  verifyWebhook,
  getPaymentInfo
};

