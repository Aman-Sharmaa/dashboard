import { requireFeatureAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Expense } from "@/models/Expense";
import { Product } from "@/models/Product";
import { Employee } from "@/models/Employee";
import { ExpensesPageClient } from "@/components/expenses-page-client";

void Product;

export default async function ExpensesPage() {
  await requireFeatureAccess("expenses");
  await connectDB();

  const [expenses, products, employees] = await Promise.all([
    Expense.find({})
      .populate("product", "name kind")
      .sort({ createdAt: -1 })
      .lean(),
    Product.find({}).select("name kind").sort({ name: 1 }).lean(),
    Employee.find({ isDismissed: { $ne: true } })
      .select("name role email annualSalary assignedProduct assignedService")
      .sort({ name: 1 })
      .lean(),
  ]);

  const serializedExpenses = expenses.map((e: any) => ({
    id: String(e._id),
    product: e.product && typeof e.product === "object"
      ? { id: String(e.product._id), name: e.product.name, kind: e.product.kind }
      : null,
    type: e.type || "Other",
    amount: e.amount || 0,
    frequency: e.frequency || "monthly",
    customMonths: e.customMonths || undefined,
    remark: e.remark || "",
    isPaused: Boolean(e.isPaused),
    createdAt: e.createdAt?.toISOString() || new Date().toISOString(),
  }));

  const serializedProducts = products.map((p: any) => ({
    id: String(p._id),
    name: p.name,
    kind: p.kind || "product",
  }));

  const serializedEmployees = employees.map((m: any) => ({
    id: String(m._id),
    name: m.name || "~",
    role: m.role || "",
    email: m.email || "",
    annualSalary: m.annualSalary || 0,
    monthlySalary: Math.round((m.annualSalary || 0) / 12),
    assignedProduct: m.assignedProduct || "",
    assignedService: m.assignedService || "",
  }));

  return (
    <ExpensesPageClient
      expenses={serializedExpenses}
      products={serializedProducts}
      teamMembers={serializedEmployees}
    />
  );
}
