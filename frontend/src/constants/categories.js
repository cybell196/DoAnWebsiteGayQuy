// Danh sách danh mục chiến dịch
export const CAMPAIGN_CATEGORIES = [
  { value: 'Medical', label: 'Y tế (Medical)', displayName: 'Y tế' },
  { value: 'Animals', label: 'Động vật (Animals)', displayName: 'Động vật' },
  { value: 'Food', label: 'Thực phẩm (Food)', displayName: 'Thực phẩm' },
  { value: 'Humanitarian', label: 'Nhân đạo (Humanitarian)', displayName: 'Nhân đạo' },
  { value: 'Education', label: 'Giáo dục (Education)', displayName: 'Giáo dục' },
  { value: 'Others', label: 'Khác (Others)', displayName: 'Khác' }
];

// Hàm lấy label từ value
export const getCategoryLabel = (value) => {
  const category = CAMPAIGN_CATEGORIES.find(cat => cat.value === value);
  return category ? category.displayName : value || 'Không xác định';
};

// Hàm lấy full label (có tiếng Anh)
export const getCategoryFullLabel = (value) => {
  const category = CAMPAIGN_CATEGORIES.find(cat => cat.value === value);
  return category ? category.label : value || 'Không xác định';
};

