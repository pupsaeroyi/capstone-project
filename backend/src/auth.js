import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ ok: false, message: 'Missing token' });
    }

    const token = header.slice("Bearer ".length);

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.sub;
        next();
    } catch {
        return res.status(401).json({ ok: false, message: "Invalid or expired token" });
    }
}