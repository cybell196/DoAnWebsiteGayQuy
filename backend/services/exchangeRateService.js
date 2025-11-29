const axios = require('axios');

/**
 * Lấy tỷ giá USD/VND từ CoinGecko API (ưu tiên)
 * Có fallback sang ExchangeRate-API nếu CoinGecko không khả dụng
 * @returns {Promise<number>} Tỷ giá USD/VND
 */
const getUSDToVNDRate = async () => {
  // Ưu tiên: Thử CoinGecko API trước
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=vnd',
      {
        timeout: 5000
      }
    );
    
    if (response.data && response.data.usd && response.data.usd.vnd) {
      const rate = parseFloat(response.data.usd.vnd);
      console.log('✅ Tỷ giá USD/VND từ CoinGecko:', rate);
      return rate;
    }
  } catch (error) {
    console.warn('⚠️ CoinGecko API không khả dụng, thử ExchangeRate-API...', error.message);
  }

  // Fallback: Thử ExchangeRate-API (free, không cần API key)
  try {
    const response = await axios.get(
      'https://api.exchangerate-api.com/v4/latest/USD',
      {
        timeout: 5000
      }
    );
    
    if (response.data && response.data.rates && response.data.rates.VND) {
      const rate = parseFloat(response.data.rates.VND);
      console.log('✅ Tỷ giá USD/VND từ ExchangeRate-API:', rate);
      return rate;
    }
  } catch (error) {
    console.warn('⚠️ ExchangeRate-API không khả dụng...', error.message);
  }

  // Fallback cuối cùng: dùng tỷ giá mặc định
  console.warn('⚠️ Tất cả API không khả dụng, sử dụng tỷ giá mặc định 25,000 VND/USD');
  return 25000;
};

/**
 * Chuyển đổi USD sang VND
 * @param {number} usdAmount - Số tiền USD
 * @param {number} exchangeRate - Tỷ giá (mặc định null sẽ tự động lấy)
 * @returns {Promise<{vndAmount: number, exchangeRate: number}>}
 */
const convertUSDToVND = async (usdAmount, exchangeRate = null) => {
  const rate = exchangeRate || await getUSDToVNDRate();
  const vndAmount = Math.round(usdAmount * rate);
  
  return {
    vndAmount,
    exchangeRate: rate
  };
};

module.exports = {
  getUSDToVNDRate,
  convertUSDToVND
};

