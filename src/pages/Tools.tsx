import { Link } from "react-router";
import { FileText, FilePenLine, Files, Landmark, UserRound, Stethoscope, ImageIcon } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";

const tools = [
  {
    id: "pdf-redact",
    name: "PDF Redaction",
    description: "Permanently remove sensitive text and images from PDFs in your browser.",
    path: "/pdf/redact",
    status: "ready",
    icon: FileText,
  },
  {
    id: "pdf-fill",
    name: "Fill PDF Forms",
    description: "Fill PDF forms in your browser. Your data stays on your device.",
    path: "/pdf/fill",
    status: "ready",
    icon: FilePenLine,
  },
  {
    id: "forms-hub",
    name: "Government Forms",
    description: "Fill W-9, I-9 and other government forms with embedded templates.",
    path: "/forms",
    status: "ready",
    icon: Files,
  },
  {
    id: "heic-to-jpg",
    name: "HEIC to JPG",
    description: "Convert iPhone HEIC photos to JPG or PNG in your browser. Batch, ZIP, no upload.",
    path: "/heic/to-jpg",
    status: "ready",
    icon: ImageIcon,
  },
  {
    id: "redact-bank-statement",
    name: "Redact Bank Statement",
    description: "Remove account numbers, transactions and balances from bank statement PDFs.",
    path: "/pdf/redact-bank-statement",
    status: "ready",
    icon: Landmark,
  },
  {
    id: "redact-ssn",
    name: "Redact SSN",
    description: "Find and permanently remove Social Security Numbers from any PDF.",
    path: "/pdf/redact-ssn",
    status: "ready",
    icon: UserRound,
  },
  {
    id: "redact-medical",
    name: "Redact Medical Records",
    description: "Remove PHI — names, DOB, MRN, diagnoses — from medical PDFs.",
    path: "/pdf/redact-medical-records",
    status: "ready",
    icon: Stethoscope,
  },
];

export default function Tools() {
  return (
    <Layout>
      <SEO
        title="All Tools"
        description="Every PlainFile tool runs 100% in your browser: PDF redaction, HEIC conversion, form filling. Free, unlimited, private by design."
        path="/tools"
      />
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Tools</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              to={tool.path}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
            >
              <div className="mb-4 flex items-center justify-between">
                <Icon className="h-8 w-8 text-[#0066CC]" />
                <Badge variant="secondary">{tool.status}</Badge>
              </div>
              <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">{tool.name}</h3>
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            </Link>
          );
        })}
      </div>
    </Layout>
  );
}
