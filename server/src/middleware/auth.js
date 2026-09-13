import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nexis-assessment-secret-key-2026-secure';

export function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export function signAdminToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username, email: admin.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}
