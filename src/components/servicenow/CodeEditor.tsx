"use client";

import dynamic from "next/dynamic";

// Monaco must never run on the server — dynamic import with ssr:false is mandatory
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => ({ default: m.Editor })),
  { ssr: false }
);

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
  label?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = "javascript",
  height = "360px",
  readOnly = false,
  label,
}: CodeEditorProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-xs font-medium text-sn-text-muted">{label}</span>
      )}
      <div
        className="rounded overflow-hidden border border-sn-border"
        style={{ height }}
      >
        <MonacoEditor
          height="100%"
          language={language}
          value={value}
          onChange={(v) => onChange(v ?? "")}
          theme="vs-dark"
          loading={
            <div className="h-full bg-[#1e1e1e] flex items-center justify-center">
              <span className="text-gray-400 text-xs font-mono">Loading editor…</span>
            </div>
          }
          options={{
            minimap: { enabled: false },
            automaticLayout: true,
            wordWrap: "on",
            lineNumbers: "on" as const,
            formatOnPaste: true,
            formatOnType: true,
            readOnly,
            scrollBeyondLastLine: false,
            fontSize: 13,
            tabSize: 4,
            insertSpaces: true,
            folding: true,
            renderLineHighlight: "all",
          }}
        />
      </div>
    </div>
  );
}
