import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database Initialization
const db = new Database("database.sqlite");

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price INTEGER,
    description TEXT,
    modules TEXT,
    files TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    email TEXT,
    phone TEXT,
    country TEXT,
    learning_category TEXT,
    has_youtube_channel TEXT,
    channel_name TEXT,
    channel_link TEXT,
    product_id INTEGER,
    amount INTEGER,
    payment_id TEXT,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT,
    email TEXT,
    message TEXT,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    role TEXT,
    content TEXT,
    rating INTEGER,
    avatar TEXT
  );

  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    answer TEXT
  );
`);

// Seed Admin if not exists (rsbrotherszone342@gmail.com / Raj@885522#)
const adminEmail = "rsbrotherszone342@gmail.com";
const adminExists = db.prepare("SELECT * FROM admins WHERE email = ?").get(adminEmail);
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("Raj@885522#", 10);
  db.prepare("INSERT INTO admins (email, password) VALUES (?, ?)").run(adminEmail, hashedPassword);
} else {
  // Update password if admin already exists to match the request
  const hashedPassword = bcrypt.hashSync("Raj@885522#", 10);
  db.prepare("UPDATE admins SET password = ? WHERE email = ?").run(hashedPassword, adminEmail);
}

// Seed Initial Product
const productExists = db.prepare("SELECT * FROM products WHERE name = ?").get("YouTube Growth & AI Creator System");
if (!productExists) {
  db.prepare("INSERT INTO products (name, price, description, modules) VALUES (?, ?, ?, ?)").run(
    "YouTube Growth & AI Creator System",
    99,
    "Master YouTube growth and AI tools.",
    JSON.stringify(["YouTube Growth", "Documentary Videos", "3D Character Videos", "Website Mastery", "AI Tools"])
  );
}

// Seed Testimonials
const testimonialCount = db.prepare("SELECT COUNT(*) as count FROM testimonials").get() as { count: number };
if (testimonialCount.count === 0) {
  const testimonials = [
    { name: "Rahul Sharma", role: "Verified Indian Creator • Mumbai", content: "This course helped me start my YouTube documentary channel. The AI workflow is a game changer for Indian creators!", rating: 5, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&h=150&auto=format&fit=crop" },
    { name: "Arjun Mehta", role: "Verified Indian Creator • Ahmedabad", content: "Best ₹99 investment for creators. The 3D character section is incredibly detailed yet simple. Highly recommended!", rating: 5, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&h=150&auto=format&fit=crop" },
    { name: "Vikram Singh", role: "Verified Indian Creator • Delhi", content: "The growth strategies are practical and up-to-date. My views increased by 40% in just 2 weeks. Real results!", rating: 5, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&h=150&auto=format&fit=crop" },
    { name: "Prakash Das", role: "Verified Indian Creator • Kolkata", content: "As an educational creator, I found the AI scripting tools extremely useful. It saved me hours of work every week.", rating: 5, avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150&h=150&auto=format&fit=crop" },
    { name: "Amit Verma", role: "Verified Indian Creator • Bangalore", content: "The documentary style editing tips are top-notch. I never thought I could produce such high-quality videos at home.", rating: 5, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&h=150&auto=format&fit=crop" },
    { name: "Sanjay Reddy", role: "Verified Indian Creator • Hyderabad", content: "The bonuses alone are worth 10x the price. The community support is also very active and helpful.", rating: 5, avatar: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&h=150&auto=format&fit=crop" }
  ];
  const insert = db.prepare("INSERT INTO testimonials (name, role, content, rating, avatar) VALUES (?, ?, ?, ?, ?)");
  for (const t of testimonials) {
    insert.run(t.name, t.role, t.content, t.rating, t.avatar);
  }
}

// Seed FAQs
const faqCount = db.prepare("SELECT COUNT(*) as count FROM faqs").get() as { count: number };
if (faqCount.count === 0) {
  const faqs = [
    { question: "Is this beginner friendly?", answer: "Yes! We start from the absolute basics and move to advanced AI-driven workflows. No prior experience needed." },
    { question: "How will I receive the product?", answer: "Immediately after payment, you will be redirected to the dashboard and receive an email with your access credentials." },
    { question: "Is payment secure?", answer: "Absolutely. We use Razorpay, India's most trusted payment gateway, ensuring your transaction is 100% secure." },
    { question: "Can I access it anytime?", answer: "Yes, you get lifetime access to all the materials, including future updates." }
  ];
  const insert = db.prepare("INSERT INTO faqs (question, answer) VALUES (?, ?)");
  for (const f of faqs) {
    insert.run(f.question, f.answer);
  }
}


const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Middleware: Auth Check
  const authenticateAdmin = (req: any, res: any, next: any) => {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.adminId = (decoded as any).id;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- Auth Routes ---
  app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body;
    const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(email) as any;
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: admin.id }, JWT_SECRET, { expiresIn: "1d" });
    res.cookie("admin_token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ success: true, email: admin.email });
  });

  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie("admin_token");
    res.json({ success: true });
  });

  app.get("/api/admin/me", authenticateAdmin, (req: any, res) => {
    const admin = db.prepare("SELECT email FROM admins WHERE id = ?").get(req.adminId) as any;
    res.json(admin);
  });

  // --- Public Purchase Route ---
  app.post("/api/purchase", (req, res) => {
    const { 
      name, email, phone, country, 
      learningCategory, hasYoutubeChannel, 
      channelName, channelLink, productId 
    } = req.body;
    
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId || 1) as any;
    
    const info = db.prepare(`
      INSERT INTO orders (
        customer_name, email, phone, country, 
        learning_category, has_youtube_channel, 
        channel_name, channel_link, 
        product_id, amount, payment_id, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, email, phone, country || '', 
      learningCategory, hasYoutubeChannel, 
      channelName || '', channelLink || '', 
      product.id, product.price, 
      "PAY-" + Math.random().toString(36).substr(2, 9), "Success"
    );

    res.json({ success: true, orderId: info.lastInsertRowid });
  });

  // --- Support Routes ---
  app.post("/api/support/message", (req, res) => {
    const { name, email, message } = req.body;
    db.prepare("INSERT INTO support_messages (user_name, email, message) VALUES (?, ?, ?)").run(name, email, message);
    res.json({ success: true });
  });

  // --- Admin Dashboard Data ---
  app.get("/api/admin/stats", authenticateAdmin, (req, res) => {
    const totalSales = db.prepare("SELECT SUM(amount) as total FROM orders WHERE status = 'Success'").get() as any;
    const totalCustomers = db.prepare("SELECT COUNT(DISTINCT email) as count FROM orders").get() as any;
    const todayRevenue = db.prepare("SELECT SUM(amount) as total FROM orders WHERE date(created_at) = date('now')").get() as any;
    const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders").get() as any;
    const pendingSupport = db.prepare("SELECT COUNT(*) as count FROM support_messages WHERE status = 'Pending'").get() as any;

    const recentOrders = db.prepare(`
      SELECT o.*, p.name as product_name 
      FROM orders o 
      JOIN products p ON o.product_id = p.id 
      ORDER BY o.created_at DESC LIMIT 5
    `).all();

    const recentMessages = db.prepare("SELECT * FROM support_messages ORDER BY created_at DESC LIMIT 5").all();

    // Chart Data (Last 7 days)
    const chartData = db.prepare(`
      SELECT date(created_at) as date, SUM(amount) as revenue, COUNT(*) as sales
      FROM orders
      WHERE created_at >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC
    `).all();

    res.json({
      cards: {
        totalSales: totalSales.total || 0,
        totalCustomers: totalCustomers.count || 0,
        todayRevenue: todayRevenue.total || 0,
        totalOrders: totalOrders.count || 0,
        pendingSupport: pendingSupport.count || 0
      },
      recentOrders,
      recentMessages,
      chartData
    });
  });

  // --- Management Routes ---
  app.get("/api/admin/orders", authenticateAdmin, (req, res) => {
    const orders = db.prepare("SELECT o.*, p.name as product_name FROM orders o JOIN products p ON o.product_id = p.id ORDER BY o.created_at DESC").all();
    res.json(orders);
  });

  app.get("/api/admin/customers", authenticateAdmin, (req, res) => {
    const customers = db.prepare(`
      SELECT 
        customer_name as name, email, phone, country,
        learning_category, has_youtube_channel, 
        channel_name, channel_link,
        MAX(created_at) as last_purchase 
      FROM orders 
      GROUP BY email 
      ORDER BY last_purchase DESC
    `).all();
    res.json(customers);
  });

  app.get("/api/admin/products", authenticateAdmin, (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.post("/api/admin/products", authenticateAdmin, (req, res) => {
    const { name, price, description, modules } = req.body;
    db.prepare("INSERT INTO products (name, price, description, modules) VALUES (?, ?, ?, ?)").run(name, price, description, JSON.stringify(modules));
    res.json({ success: true });
  });

  app.post("/api/admin/products/update", authenticateAdmin, (req, res) => {
    const { id, name, price, description } = req.body;
    db.prepare("UPDATE products SET name = ?, price = ?, description = ? WHERE id = ?").run(name, price, description, id);
    res.json({ success: true });
  });

  app.get("/api/admin/support", authenticateAdmin, (req, res) => {
    const messages = db.prepare("SELECT * FROM support_messages ORDER BY created_at DESC").all();
    res.json(messages);
  });

  app.post("/api/admin/support/status", authenticateAdmin, (req, res) => {
    const { id, status } = req.body;
    db.prepare("UPDATE support_messages SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  // --- Site Settings Routes ---
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM site_settings").all();
    const settingsMap = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.post("/api/admin/settings", authenticateAdmin, (req, res) => {
    const { settings } = req.body; // Object with key-value pairs
    const upsert = db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)");
    const transaction = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        upsert.run(key, value);
      }
    });
    transaction(settings);
    res.json({ success: true });
  });

  // --- Testimonials & FAQs Routes ---
  app.get("/api/testimonials", (req, res) => {
    const testimonials = db.prepare("SELECT * FROM testimonials").all();
    res.json(testimonials);
  });

  app.post("/api/admin/testimonials", authenticateAdmin, (req, res) => {
    const { testimonials } = req.body;
    db.prepare("DELETE FROM testimonials").run();
    const insert = db.prepare("INSERT INTO testimonials (name, role, content, rating, avatar) VALUES (?, ?, ?, ?, ?)");
    const transaction = db.transaction((data) => {
      for (const t of data) {
        insert.run(t.name, t.role, t.content, t.rating, t.avatar);
      }
    });
    transaction(testimonials);
    res.json({ success: true });
  });

  app.get("/api/faqs", (req, res) => {
    const faqs = db.prepare("SELECT * FROM faqs").all();
    res.json(faqs);
  });

  app.post("/api/admin/faqs", authenticateAdmin, (req, res) => {
    const { faqs } = req.body;
    db.prepare("DELETE FROM faqs").run();
    const insert = db.prepare("INSERT INTO faqs (question, answer) VALUES (?, ?)");
    const transaction = db.transaction((data) => {
      for (const f of data) {
        insert.run(f.question, f.answer);
      }
    });
    transaction(faqs);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
