import { Employee } from "@/models/Employee";

function exact(value: string) {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
}

export async function getEmployeeWorkScope(email: string) {
  const employee = await Employee.findOne({ email: exact(email.trim()) })
    .select("_id name email isOutsider")
    .lean();
  if (!employee) return { employee: null, employeeIds: [] as any[], isManager: false };

  const directReports = await Employee.find({
    isDismissed: { $ne: true },
    manager: {
      $in: [exact(String((employee as any)._id)), exact((employee as any).name || ""), exact((employee as any).email || "")],
    },
  }).select("_id").lean();

  return {
    employee,
    employeeIds: [(employee as any)._id, ...directReports.map((report: any) => report._id)],
    isManager: directReports.length > 0,
  };
}
