"use client";

import { useRouter } from "next/navigation";
import {
  Building2,
  BookOpen,
  Code2,
  FileCode2,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";
import { DEVELOPMENT_TYPE_MAP } from "@/features/developments/developmentTypes";
import { resolveSnLabel } from "@/features/xml/snTableRegistry";

interface Stats {
  clients: number;
  stories: number;
  developments: number;
}

export interface RecentDev {
  id: string;
  title: string;
  development_type: string;
  status: string;
  created_at: string;
  client_id: string;
  story_id: string;
  stories: { title: string } | null;
  clients: { name: string } | null;
}

export interface RecentImport {
  id: string;
  filename: string;
  created_developments_count: number;
  status: string;
  created_at: string;
  clients: { name: string } | null;
}

interface Props {
  stats: Stats;
  recentDevelopments: RecentDev[];
  recentImports: RecentImport[];
}

const statCards = [
  {
    key: "clients" as const,
    label: "Clients",
    icon: Building2,
    href: "/clients",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    key: "stories" as const,
    label: "Stories",
    icon: BookOpen,
    href: "/stories",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    key: "developments" as const,
    label: "Developments",
    icon: Code2,
    href: "/developments",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

export function DashboardClient({ stats, recentDevelopments, recentImports }: Props) {
  const router = useRouter();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-sn-text">Dashboard</h1>
          <p className="text-sm text-sn-text-muted mt-0.5">
            Welcome to SN Dev Hub
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => router.push("/clients/new")}
            data-navigation-feedback="true"
          >
            New Client
          </Button>
          <Button
            size="sm"
            icon={<FileCode2 className="w-3.5 h-3.5" />}
            onClick={() => router.push("/xml-imports/new")}
            data-navigation-feedback="true"
          >
            Import XML
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {statCards.map(({ key, label, icon: Icon, href, color, bg }) => (
          <button
            key={key}
            onClick={() => router.push(href)}
            data-navigation-feedback="true"
            className="bg-white border border-sn-border rounded shadow-sm p-4 flex items-center gap-4 hover:shadow-md hover:border-sn-accent/30 transition-all text-left"
          >
            <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-sn-text">{stats[key]}</p>
              <p className="text-xs text-sn-text-muted">{label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Recent Developments */}
        <div className="bg-white border border-sn-border rounded shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-sn-border">
            <span className="text-sm font-semibold text-sn-text flex items-center gap-2">
              <Code2 className="w-4 h-4 text-sn-accent" />
              Recent Developments
            </span>
            <button
              onClick={() => router.push("/developments")}
              data-navigation-feedback="true"
              className="text-xs text-sn-accent hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-sn-border">
            {recentDevelopments.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-sn-text-muted">
                No developments yet
              </div>
            ) : (
              recentDevelopments.map((dev) => (
                <div
                  key={dev.id}
                  className="px-4 py-3 hover:bg-sn-accent-light transition-colors cursor-pointer"
                  data-navigation-feedback="true"
                  onClick={() =>
                    router.push(
                      `/clients/${dev.client_id}/stories/${dev.story_id}/developments/${dev.id}`
                    )
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-sn-text truncate">{dev.title}</p>
                      <p className="text-xs text-sn-text-muted mt-0.5">
                        {DEVELOPMENT_TYPE_MAP[dev.development_type as keyof typeof DEVELOPMENT_TYPE_MAP]?.label ?? resolveSnLabel(dev.development_type)}
                        {dev.clients ? ` · ${dev.clients.name}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusBadge status={dev.status} />
                      <span className="text-2xs text-sn-text-muted">{formatDateTime(dev.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Imports */}
        <div className="bg-white border border-sn-border rounded shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-sn-border">
            <span className="text-sm font-semibold text-sn-text flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-sn-accent" />
              Recent XML Imports
            </span>
            <button
              onClick={() => router.push("/xml-imports")}
              data-navigation-feedback="true"
              className="text-xs text-sn-accent hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-sn-border">
            {recentImports.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-sn-text-muted">
                No imports yet
              </div>
            ) : (
              recentImports.map((imp) => (
                <div
                  key={imp.id}
                  className="px-4 py-3 hover:bg-sn-accent-light transition-colors cursor-pointer"
                  data-navigation-feedback="true"
                  onClick={() => router.push(`/xml-imports/${imp.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-sn-text truncate">{imp.filename}</p>
                      <p className="text-xs text-sn-text-muted mt-0.5">
                        {imp.created_developments_count} developments
                        {imp.clients ? ` · ${imp.clients.name}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusBadge status={imp.status} />
                      <span className="text-2xs text-sn-text-muted">{formatDateTime(imp.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick access */}
      <div className="mt-4 bg-white border border-sn-border rounded shadow-sm p-4">
        <h3 className="text-xs font-semibold text-sn-text-muted uppercase tracking-wide mb-3">
          Quick Access
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<Building2 className="w-3.5 h-3.5" />} onClick={() => router.push("/clients/new")} data-navigation-feedback="true">New Client</Button>
          <Button variant="secondary" size="sm" icon={<BookOpen className="w-3.5 h-3.5" />} onClick={() => router.push("/clients")} data-navigation-feedback="true">View Clients</Button>
          <Button variant="secondary" size="sm" icon={<Code2 className="w-3.5 h-3.5" />} onClick={() => router.push("/developments")} data-navigation-feedback="true">All Developments</Button>
          <Button variant="secondary" size="sm" icon={<FileCode2 className="w-3.5 h-3.5" />} onClick={() => router.push("/xml-imports/new")} data-navigation-feedback="true">Import XML</Button>
        </div>
      </div>
    </div>
  );
}
