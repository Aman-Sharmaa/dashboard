import mongoose, { Schema, Document, Model } from "mongoose";
import type {
  CompensationContractType,
  CompensationPayment,
  CompensationPhase,
} from "@/lib/compensation";

export interface IEmployee extends Document {
  type: "Intern" | "Employee" | "Part-Time" | "Contract" | "Gig Worker";
  name: string;
  email: string;
  avatarUrl?: string;
  assignedProduct?: string;
  assignedService?: string;
  dateOfHiring?: Date;
  title?: string;
  employeeId?: number;
  department?: string;
  manager?: string;
  location?: string;
  lastLogin?: Date | string;
  /** Contract structure: monthly CTC, single lump sum, or phased milestones */
  compensationContractType?: CompensationContractType;
  /** Total lump-sum contract value when `compensationContractType` is one_time */
  contractOneTimeAmount?: number;
  /** Planned phases/milestones from the hiring contract */
  compensationPhases?: CompensationPhase[];
  /** Log of amounts paid (salary runs, bonuses, phase payouts, etc.) */
  compensationPaymentHistory?: CompensationPayment[];
  annualSalary?: number;
  numberOfBonuses?: number;
  currentAdvanceSalary?: number;
  advanceSalaryEmi?: number;
  casualLeaveBalance?: number;
  casualLeaveTotal?: number;
  sickLeaveBalance?: number;
  sickLeaveTotal?: number;
  /** When true, admin has manually set leave values ~ skip auto-calculation */
  leaveManualOverride?: boolean;
  taxableSalary?: number;
  exemption?: number;
  tdsDeducted?: number;
  prevEmployerTaxableSalary?: number;
  prevEmployerTdsDeducted?: number;
  bankInfo?: {
    ifscCode?: string;
    accountNumber?: string;
    accountHolderName?: string;
  };
  /** If true, employee is opted into EPF/PF and PF deduction applies. If false, no PF deduction. */
  pfOptIn?: boolean;
  statutoryInfo?: {
    pan?: string;
    pfStatus?: string;
    pfUan?: string;
    professionalTax?: string;
    lwfStatus?: string;
    esicStatus?: string;
    esicIpNumber?: string;
  };
  otherInfo?: {
    phoneNumber?: string;
    gender?: string;
    dateOfBirth?: string;
  };
  role?: string;
  isDismissed?: boolean;
  isSalaryStopped?: boolean;
  isLoginDisabled?: boolean;
  /** When true, this person is an external/outsider collaborator ~ they can only see their own tasks */
  isOutsider?: boolean;
  /** Work schedule start time, e.g. "09:00" */
  workStartTime?: string;
  /** Work schedule end time, e.g. "18:00" */
  workEndTime?: string;
  profileSlug?: string;
  /** Total unpaid leave days taken (auto-updated when leaves are approved) */
  unpaidLeaveBalance?: number;
  /** Max WFH days allowed per month */
  wfhAllowedPerMonth?: number;
}

const CompensationPhaseSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    amount: Number,
    dueDate: String,
    sortOrder: { type: Number, default: 0 },
    notes: String,
  },
  { _id: false }
);

const CompensationPaymentSchema = new Schema(
  {
    id: { type: String, required: true },
    paidOn: { type: String, required: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: ["monthly_salary", "bonus", "phase_milestone", "signing", "other"],
      default: "other",
    },
    notes: String,
    phaseId: String,
  },
  { _id: false }
);

const EmployeeSchema: Schema<IEmployee> = new Schema(
  {
    type: { type: String, enum: ["Intern", "Employee", "Part-Time", "Contract", "Gig Worker"], default: "Employee" },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatarUrl: String,
    dateOfHiring: Date,
    title: String,
    employeeId: Number,
    department: String,
    manager: String,
    location: String,
    lastLogin: Schema.Types.Mixed,
    compensationContractType: {
      type: String,
      enum: ["monthly", "one_time", "phases"],
      default: "monthly",
    },
    contractOneTimeAmount: Number,
    compensationPhases: { type: [CompensationPhaseSchema], default: [] },
    compensationPaymentHistory: { type: [CompensationPaymentSchema], default: [] },
    annualSalary: Number,
    numberOfBonuses: Number,
    currentAdvanceSalary: Number,
    advanceSalaryEmi: Number,
    casualLeaveBalance: Number,
    casualLeaveTotal: Number,
    sickLeaveBalance: Number,
    sickLeaveTotal: Number,
    leaveManualOverride: { type: Boolean, default: false },
    taxableSalary: Number,
    exemption: Number,
    tdsDeducted: Number,
    prevEmployerTaxableSalary: Number,
    prevEmployerTdsDeducted: Number,
    pfOptIn: { type: Boolean, default: true },
    bankInfo: {
      ifscCode: String,
      accountNumber: String,
      accountHolderName: String,
    },
    statutoryInfo: {
      pan: String,
      pfStatus: String,
      pfUan: String,
      professionalTax: String,
      lwfStatus: String,
      esicStatus: String,
      esicIpNumber: String,
    },
    otherInfo: {
      phoneNumber: String,
      gender: String,
      dateOfBirth: String,
    },
    assignedProduct: String,
    assignedService: String,
    role: String,
    isDismissed: { type: Boolean, default: false },
    isSalaryStopped: { type: Boolean, default: false },
    isLoginDisabled: { type: Boolean, default: false },
    isOutsider: { type: Boolean, default: false },
    workStartTime: String,
    workEndTime: String,
    profileSlug: { type: String, unique: true, sparse: true },
    unpaidLeaveBalance: { type: Number, default: 0 },
    wfhAllowedPerMonth: { type: Number, default: 2 },
  },
  { timestamps: true }
);

export const Employee: Model<IEmployee> =
  mongoose.models.Employee || mongoose.model<IEmployee>("Employee", EmployeeSchema);

