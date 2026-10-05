const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Load .env or .env.local if present
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [k, ...v] = trimmed.split("=");
          const key = k.trim();
          const val = v.join("=").trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/webwrite";
const ADMIN_EMAIL =
  process.argv[2] || process.env.SEED_ADMIN_EMAIL || "admin@kalp.ltd";
const ADMIN_PASSWORD =
  process.argv[3] || process.env.SEED_ADMIN_PASSWORD || "admin123";
const ADMIN_NAME = process.argv[4] || "Admin";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    role: {
      type: String,
      enum: ["employee", "admin", "client", "lead"],
      default: "admin",
    },
    canManageContent: { type: Boolean, default: true },
    featureAccess: { type: [String], default: [] },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function seed() {
  console.log(`\n🌱 Connecting to MongoDB: ${MONGODB_URI.split("@").pop()}...`);
  await mongoose.connect(MONGODB_URI);
  console.log("✅ MongoDB connected.");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

  const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail });

  if (existing) {
    existing.password = hashedPassword;
    existing.role = "admin";
    existing.name = ADMIN_NAME;
    existing.canManageContent = true;
    await existing.save();
    console.log(`\n✨ Admin user updated successfully!`);
  } else {
    await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      name: ADMIN_NAME,
      role: "admin",
      canManageContent: true,
      featureAccess: [],
    });
    console.log(`\n✨ Admin user created successfully!`);
  }

  console.log(`----------------------------------------`);
  console.log(`🔑 User ID / Email: ${normalizedEmail}`);
  console.log(`🔒 Password        : ${ADMIN_PASSWORD}`);
  console.log(`👑 Role            : admin`);
  console.log(`----------------------------------------\n`);

  await mongoose.disconnect();
  console.log("🔌 MongoDB disconnected.\n");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
