import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { authRequired } from "./middleware/auth.js";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "Rafed ERP Backend",
    version: "1.0.0",
    endpoints: [
      "POST /auth/register",
      "POST /auth/login",
      "GET /me",
      "GET /customers",
      "POST /customers",
      "GET /invoices",
      "POST /invoices",
      "GET /dashboard"
    ]
  });
});

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    res.status(500).json({ ok: false, database: "disconnected", error: error.message });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role = "ADMIN" } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "الاسم والبريد وكلمة المرور مطلوبة" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "هذا البريد مستخدم بالفعل" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role }
    });

    res.status(201).json({
      message: "تم إنشاء المستخدم",
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في إنشاء المستخدم", error: error.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "تم تسجيل الدخول",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في تسجيل الدخول", error: error.message });
  }
});

app.get("/me", authRequired(JWT_SECRET), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });
  res.json(user);
});

app.get("/customers", authRequired(JWT_SECRET), async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: "تعذر جلب العملاء", error: error.message });
  }
});

app.post("/customers", authRequired(JWT_SECRET), async (req, res) => {
  try {
    const { name, phone, email, vatNumber } = req.body;
    if (!name) {
      return res.status(400).json({ message: "اسم العميل مطلوب" });
    }

    const customer = await prisma.customer.create({
      data: { name, phone, email, vatNumber }
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: "تعذر إنشاء العميل", error: error.message });
  }
});

app.get("/invoices", authRequired(JWT_SECRET), async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: "تعذر جلب الفواتير", error: error.message });
  }
});

app.post("/invoices", authRequired(JWT_SECRET), async (req, res) => {
  try {
    const { invoiceNo, customerId, amount, vatAmount = 0, status = "PENDING" } = req.body;
    if (!invoiceNo || !customerId || amount == null) {
      return res.status(400).json({ message: "رقم الفاتورة والعميل والمبلغ مطلوبة" });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        customerId,
        amount: Number(amount),
        vatAmount: Number(vatAmount),
        totalAmount: Number(amount) + Number(vatAmount),
        status
      },
      include: { customer: true }
    });

    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: "تعذر إنشاء الفاتورة", error: error.message });
  }
});

app.get("/dashboard", authRequired(JWT_SECRET), async (req, res) => {
  try {
    const customersCount = await prisma.customer.count();
    const invoicesCount = await prisma.invoice.count();
    const totals = await prisma.invoice.aggregate({
      _sum: { amount: true, vatAmount: true, totalAmount: true }
    });

    res.json({
      customersCount,
      invoicesCount,
      totals: {
        amount: totals._sum.amount || 0,
        vatAmount: totals._sum.vatAmount || 0,
        totalAmount: totals._sum.totalAmount || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: "تعذر تحميل لوحة التحكم", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Rafed ERP Backend running on port ${PORT}`);
});
