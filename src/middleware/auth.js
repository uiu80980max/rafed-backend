import jwt from "jsonwebtoken";

export function authRequired(secret) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "غير مصرح" });
    }

    const token = header.replace("Bearer ", "");

    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ message: "رمز الدخول غير صالح" });
    }
  };
}
