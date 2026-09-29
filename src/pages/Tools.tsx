import { Link } from "react-router";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { TOOL_ROUTES } from "@/routes-manifest";

// Каталог инструментов генерируется из routes-manifest.
// Не добавляйте инструменты вручную — добавьте запись kind: 'tool' в манифест.

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
        {TOOL_ROUTES.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.path}
              to={tool.path}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
            >
              <div className="mb-4 flex items-center justify-between">
                {Icon && <Icon className="h-8 w-8 text-[#0066CC]" />}
                {tool.status && <Badge variant="secondary">{tool.status}</Badge>}
              </div>
              <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">{tool.label}</h3>
              {tool.description && (
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              )}
            </Link>
          );
        })}
      </div>
    </Layout>
  );
}
