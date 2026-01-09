const crypto = require('crypto');

exports.generateToken = (length = 32) => crypto.randomBytes(length).toString('hex');

exports.hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

exports.calculateAge = (dob) => {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

exports.formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

exports.timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = [
    ['year', 31536000], ['month', 2592000], ['week', 604800],
    ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]
  ];
  for (const [unit, secs] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return count === 1 ? `1 \( {unit} ago` : ` \){count} ${unit}s ago`;
  }
  return 'just now';
};

exports.generateRandomColor = () => {
  const colors = ['#667eea','#764ba2','#f093fb','#f5576c','#4facfe','#00f2fe','#43e97b','#38f9d7'];
  return colors[Math.floor(Math.random() * colors.length)];
};

exports.slugify = (text) => text
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');

exports.generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) otp += digits[Math.floor(Math.random() * 10)];
  return otp;
};

exports.paginate = (page = 1, limit = 10) => {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  return { page: p, limit: l, skip: (p - 1) * l };
};

exports.getPaginationMeta = (total, page, limit) => {
  const pages = Math.ceil(total / limit);
  return {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages,
    hasNext: page < pages,
    hasPrev: page > 1
  };
};

exports.deepClone = (obj) => JSON.parse(JSON.stringify(obj));

exports.removeUndefined = (obj) => JSON.parse(JSON.stringify(obj));
