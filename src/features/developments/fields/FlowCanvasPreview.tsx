"use client";

import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Zap,
  GitBranch,
  CheckCircle,
  ClipboardList,
  Search,
  Code,
  Workflow,
  Flag,
  Clock,
  Repeat,
  ListChecks,
  Users,
  Settings2,
  X,
} from "lucide-react";
import React, { useState, useMemo, useCallback, type ElementType } from "react";
import type {
  FlowPreviewData,
  FlowPreviewStep,
  FlowPreviewTrigger,
  FlowPreviewStepOutput,
  FlowPreviewStepInput,
  FlowPreviewStepParam,
} from "./FlowPreview";

// ── Action classification ─────────────────────────────────────────────────────

type ActionClass =
  | "trigger" | "approval" | "condition" | "loop" | "lookup"
  | "task" | "wait" | "script" | "catalog_vars" | "user_group"
  | "set_vars" | "end" | "action";

interface ActionStyle {
  border: string;
  bg: string;
  selectedBg: string;
  icon: ElementType;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
}

const STYLES: Record<ActionClass, ActionStyle> = {
  trigger:      { border: "#7c3aed", bg: "#faf5ff", selectedBg: "#ede9fe", icon: Zap,          iconColor: "#6d28d9", badgeBg: "#6d28d9", badgeText: "#fff"    },
  approval:     { border: "#10b981", bg: "#f0fdf4", selectedBg: "#dcfce7", icon: CheckCircle,   iconColor: "#059669", badgeBg: "#dcfce7", badgeText: "#065f46" },
  condition:    { border: "#d97706", bg: "#fffbeb", selectedBg: "#fef3c7", icon: GitBranch,     iconColor: "#b45309", badgeBg: "#d97706", badgeText: "#fff"    },
  loop:         { border: "#6366f1", bg: "#eef2ff", selectedBg: "#e0e7ff", icon: Repeat,        iconColor: "#4338ca", badgeBg: "#e0e7ff", badgeText: "#3730a3" },
  lookup:       { border: "#0ea5e9", bg: "#f0f9ff", selectedBg: "#e0f2fe", icon: Search,        iconColor: "#0369a1", badgeBg: "#e0f2fe", badgeText: "#075985" },
  task:         { border: "#3b82f6", bg: "#eff6ff", selectedBg: "#dbeafe", icon: ClipboardList, iconColor: "#1d4ed8", badgeBg: "#dbeafe", badgeText: "#1e40af" },
  wait:         { border: "#f97316", bg: "#fff7ed", selectedBg: "#ffedd5", icon: Clock,         iconColor: "#c2410c", badgeBg: "#ffedd5", badgeText: "#9a3412" },
  script:       { border: "#8b5cf6", bg: "#f5f3ff", selectedBg: "#ede9fe", icon: Code,          iconColor: "#6d28d9", badgeBg: "#ede9fe", badgeText: "#5b21b6" },
  catalog_vars: { border: "#14b8a6", bg: "#f0fdfa", selectedBg: "#ccfbf1", icon: ListChecks,    iconColor: "#0f766e", badgeBg: "#ccfbf1", badgeText: "#0f4f4a" },
  user_group:   { border: "#64748b", bg: "#f8fafc", selectedBg: "#f1f5f9", icon: Users,         iconColor: "#475569", badgeBg: "#f1f5f9", badgeText: "#334155" },
  set_vars:     { border: "#64748b", bg: "#f8fafc", selectedBg: "#f1f5f9", icon: Settings2,     iconColor: "#475569", badgeBg: "#f1f5f9", badgeText: "#334155" },
  end:          { border: "#94a3b8", bg: "#f8fafc", selectedBg: "#f1f5f9", icon: Flag,          iconColor: "#64748b", badgeBg: "#f1f5f9", badgeText: "#475569" },
  action:       { border: "#64748b", bg: "#f8fafc", selectedBg: "#f1f5f9", icon: Workflow,      iconColor: "#475569", badgeBg: "#f1f5f9", badgeText: "#334155" },
};

function classifyAction(action: string, nodeType: "trigger" | "step" | "end" | "merge", branchType?: string | null): ActionClass {
  if (nodeType === "trigger") return "trigger";
  if (nodeType === "end") return "end";
  if (branchType === "if" || branchType === "else_if" || branchType === "else") return "condition";
  const l = action.toLowerCase();
  if (l === "end" || l.includes("end flow")) return "end";
  if (l.includes("approval") || l.includes("approve") || l.includes("ask for")) return "approval";
  if (l === "if" || /^if\s/.test(l) || l.startsWith("else if") || l.includes(" condition")) return "condition";
  if (l.includes("for each") || l.includes("foreach")) return "loop";
  if (l.includes("look up") || l.includes("lookup") || l.includes("look_up") || l.includes("find record")) return "lookup";
  if (l.includes("catalog task") || l.includes("create task") || l.includes("create record") || l.includes("update record") || l.includes("delete record")) return "task";
  if (l.includes("wait") || l.includes("timer")) return "wait";
  if (l.includes("script") || l.includes("run script")) return "script";
  if (l.includes("catalog variable") || l.includes("get catalog")) return "catalog_vars";
  if (l.includes("business role") || l.includes("get group") || l.includes("user group")) return "user_group";
  if (l.includes("set flow") || l.includes("set variable")) return "set_vars";
  return "action";
}

// ── Custom node ───────────────────────────────────────────────────────────────

interface NodeData {
  label: string;
  action: string;
  order?: number;
  nodeType: "trigger" | "step" | "end" | "merge";
  branchType?: string | null;
  isSelected: boolean;
}

const NODE_WIDTH = 260;
const NODE_HEIGHT = 58;
const V_GAP = 30;
const V_STEP = NODE_HEIGHT + V_GAP;
const H_STEP = 360;

type EdgeTone = "default" | "true" | "false" | "merge";

function FlowStepNode({ data }: NodeProps<NodeData>) {
  const cls = classifyAction(data.action, data.nodeType, data.branchType);
  const s = STYLES[cls];
  const Icon = s.icon;

  if (data.nodeType === "merge") {
    return (
      <>
        <Handle id="top" type="target" position={Position.Top} style={{ opacity: 0, width: 1, height: 1 }} isConnectable={false} />
        <Handle id="left" type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1 }} isConnectable={false} />
        <Handle id="bottom" type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} isConnectable={false} />
        <div style={{ width: 1, height: 1, opacity: 0 }} />
      </>
    );
  }

  // Determine badge content
  const badgeLabel =
    data.branchType === "if"      ? "IF"    :
    data.branchType === "else_if" ? "ELIF"  :
    data.branchType === "else"    ? "ELSE"  :
    data.branchType === "for_each"? "EACH"  :
    data.nodeType === "step" && data.order !== undefined ? String(data.order) :
    null;

  const isBranchBadge = !!data.branchType && data.nodeType === "step";

  return (
    <>
      {data.nodeType !== "trigger" && (
        <Handle
          id="top"
          type="target"
          position={Position.Top}
          style={{
            width: 7, height: 7,
            background: data.isSelected ? s.border : "#e2e8f0",
            border: `1.5px solid ${data.isSelected ? s.border : "#cbd5e1"}`,
            transition: "all 0.15s",
          }}
          isConnectable={false}
        />
      )}

      {data.nodeType !== "trigger" && (
        <Handle
          id="left"
          type="target"
          position={Position.Left}
          style={{
            width: 7, height: 7,
            background: "#f8fafc",
            border: "1.5px solid #cbd5e1",
            opacity: data.branchType ? 1 : 0,
          }}
          isConnectable={false}
        />
      )}

      <div
        style={{
          width: NODE_WIDTH,
          minHeight: NODE_HEIGHT,
          background: data.isSelected ? s.selectedBg : s.bg,
          border: `${data.isSelected ? "2px" : "1.5px"} solid ${s.border}`,
          borderRadius: data.branchType === "if" ? "6px 6px 6px 6px" : 8,
          padding: "7px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxSizing: "border-box",
          boxShadow: data.isSelected
            ? `0 0 0 3px ${s.border}33, 0 4px 12px ${s.border}22`
            : "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)",
          transition: "all 0.15s",
          cursor: "pointer",
          fontFamily: "inherit",
          // Condition nodes: left accent bar
          borderLeft: (data.branchType === "if" || data.branchType === "else_if" || data.branchType === "else")
            ? `4px solid ${s.border}`
            : `${data.isSelected ? "2px" : "1.5px"} solid ${s.border}`,
        }}
      >
        {/* Icon */}
        <div style={{ color: s.iconColor, flexShrink: 0, display: "flex", alignItems: "center" }}>
          <Icon size={15} />
        </div>

        {/* Labels */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {data.nodeType !== "step" && (
            <div style={{
              fontSize: 8.5, fontWeight: 700, color: s.iconColor,
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 1.5, opacity: 0.8,
            }}>
              {data.nodeType === "trigger" ? "Trigger" : "End"}
            </div>
          )}
          {(data.branchType === "if" || data.branchType === "else_if" || data.branchType === "else") && (
            <div style={{
              fontSize: 8.5, fontWeight: 700, color: s.iconColor,
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 1.5, opacity: 0.75,
            }}>
              Condition
            </div>
          )}
          <div
            style={{
              fontSize: 11, fontWeight: 600, color: "#1e293b",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3,
            }}
            title={data.label}
          >
            {data.label}
          </div>
        </div>

        {/* Step number / branch badge */}
        {badgeLabel !== null && (
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: isBranchBadge ? s.badgeText : s.badgeText,
            background: isBranchBadge ? s.badgeBg : s.badgeBg,
            borderRadius: 4, padding: "1px 5px", flexShrink: 0,
            minWidth: 22, textAlign: "center",
          }}>
            {badgeLabel}
          </div>
        )}
      </div>

      {data.nodeType !== "end" && (
        <Handle
          id="bottom"
          type="source"
          position={Position.Bottom}
          style={{
            width: 7, height: 7,
            background: data.isSelected ? s.border : "#e2e8f0",
            border: `1.5px solid ${data.isSelected ? s.border : "#cbd5e1"}`,
            transition: "all 0.15s",
          }}
          isConnectable={false}
        />
      )}

      {data.nodeType !== "end" && (
        data.branchType === "if" || data.branchType === "else_if" || data.branchType === "else"
      ) && (
        <Handle
          id="false"
          type="source"
          position={Position.Right}
          style={{
            width: 7, height: 7,
            background: "#fee2e2",
            border: "1.5px solid #ef4444",
          }}
          isConnectable={false}
        />
      )}
    </>
  );
}

const nodeTypes: NodeTypes = { flowNode: FlowStepNode };

// ── Branch edge builder ───────────────────────────────────────────────────────

interface RawNodeDef {
  id: string;
  label?: string;
  action?: string;
  uuid?: string;
  parentUiId?: string;
  connectedTo?: string;
  order?: number;
  nodeType?: "trigger" | "step" | "end" | "merge";
  branchType?: string | null;
}

function buildEdgesWithBranches(rawNodes: RawNodeDef[]): Edge[] {
  const edges: Edge[] = [];

  // Map each Else/Else If node to its matching If node
  const elseToIf = new Map<string, string>();
  const ifStack: string[] = [];

  for (const node of rawNodes) {
    if (node.branchType === "if") {
      ifStack.push(node.id);
    } else if (node.branchType === "else_if" || node.branchType === "else") {
      if (ifStack.length > 0) {
        const ifId = node.branchType === "else" ? ifStack.pop()! : ifStack[ifStack.length - 1];
        elseToIf.set(node.id, ifId);
      }
    }
  }

  // Sequential edges
  for (let i = 0; i < rawNodes.length - 1; i++) {
    const from = rawNodes[i];
    const to = rawNodes[i + 1];

    const isCondition = from.branchType === "if" || from.branchType === "else_if";
    const isElseTarget = elseToIf.has(to.id);

    // Skip the direct sequential edge to an Else node — it'll get the "false" bypass edge
    if (isElseTarget && isCondition) continue;

    edges.push({
      id: `e-seq-${i}`,
      source: from.id,
      target: to.id,
      type: "smoothstep",
      label: isCondition ? "true" : undefined,
      labelStyle: isCondition ? { fontSize: 9.5, fontWeight: 700, fill: "#16a34a" } : undefined,
      labelBgStyle: isCondition ? { fill: "#f0fdf4", rx: 3 } : undefined,
      labelShowBg: isCondition ? true : undefined,
      style: { stroke: isCondition ? "#22c55e" : "#cbd5e1", strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isCondition ? "#22c55e" : "#94a3b8",
        width: 13, height: 13,
      },
    });
  }

  // "false" bypass edges from If → Else / Else If
  for (const [elseId, ifId] of Array.from(elseToIf.entries())) {
    edges.push({
      id: `e-false-${ifId}-${elseId}`,
      source: ifId,
      target: elseId,
      type: "smoothstep",
      label: "false",
      labelStyle: { fontSize: 9.5, fontWeight: 700, fill: "#7e22ce" },
      labelBgStyle: { fill: "#f3e8ff", rx: 3 },
      labelShowBg: true,
      style: { stroke: "#aeb8c2", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#aeb8c2", width: 13, height: 13 },
    });
  }

  return edges;
}

function makeGraphEdge(
  id: string,
  source: string,
  target: string,
  label?: string,
  tone: EdgeTone = "default",
): Edge {
  const isFalse = tone === "false";
  const isTrue = tone === "true";
  const isFalseLabel = label === "false" || label === "else";
  const color = isTrue ? "#22c55e" : "#aeb8c2";
  const labelColor = isFalseLabel ? "#7e22ce" : "#16a34a";
  const labelBg = isFalseLabel ? "#f3e8ff" : "#f0fdf4";
  return {
    id,
    source,
    target,
    type: "smoothstep",
    sourceHandle: isFalseLabel ? "false" : "bottom",
    targetHandle: isFalse ? "left" : "top",
    label,
    labelStyle: label ? { fontSize: 9.5, fontWeight: 700, fill: labelColor } : undefined,
    labelBgStyle: label ? { fill: labelBg, rx: 3 } : undefined,
    labelShowBg: !!label,
    style: { stroke: color, strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 13, height: 13 },
  };
}

function buildEdgesFromFlowRelations(rawNodes: RawNodeDef[]): Edge[] {
  const edges: Edge[] = [];
  const edgeKeys = new Set<string>();
  const stepNodes = rawNodes.filter((node) => node.nodeType === "step");
  const idByUuid = new Map<string, string>();

  for (const node of stepNodes) {
    if (node.uuid) idByUuid.set(node.uuid, node.id);
  }

  const addEdge = (
    source: string,
    target: string,
    label?: string,
    tone: EdgeTone = "default",
  ) => {
    if (source === target) return;
    const key = `${source}->${target}:${label ?? ""}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push(makeGraphEdge(`e-${edges.length}-${source}-${target}`, source, target, label, tone));
  };

  const roots = stepNodes
    .filter((node) => !node.parentUiId && !node.connectedTo)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (roots[0]) addEdge("trigger", roots[0].id);
  for (let i = 0; i < roots.length - 1; i++) {
    const from = roots[i];
    const to = roots[i + 1];
    if (from.branchType === "if" || from.branchType === "else_if") continue;
    addEdge(from.id, to.id);
  }

  const childrenByParent = new Map<string, RawNodeDef[]>();
  for (const node of stepNodes) {
    if (!node.parentUiId || node.connectedTo) continue;
    const parentId = idByUuid.get(node.parentUiId);
    if (!parentId) continue;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId)!.push(node);
  }

  for (const [parentId, children] of Array.from(childrenByParent.entries())) {
    children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const parent = rawNodes.find((node) => node.id === parentId);
    if (children[0]) {
      const isCondition = parent?.branchType === "if" || parent?.branchType === "else_if";
      addEdge(parentId, children[0].id, isCondition ? "true" : undefined, isCondition ? "true" : "default");
    }
    for (let i = 0; i < children.length - 1; i++) {
      const from = children[i];
      const to = children[i + 1];
      if (from.branchType === "if" || from.branchType === "else_if") continue;
      addEdge(from.id, to.id);
    }
  }

  for (const node of stepNodes) {
    if (!node.connectedTo) continue;
    const sourceId = idByUuid.get(node.connectedTo);
    if (!sourceId) continue;
    addEdge(sourceId, node.id, node.branchType === "else" ? "else" : "false", "false");
  }

  const outgoing = new Set(edges.map((edge) => edge.source));
  const explicitEndNodes = stepNodes.filter(
    (node) => String(node.branchType ?? "") === "end" || node.label?.toLowerCase() === "end",
  );
  const terminalNodes = explicitEndNodes.length > 0
    ? explicitEndNodes
    : stepNodes.filter((node) => !outgoing.has(node.id));
  for (const node of terminalNodes) {
    addEdge(node.id, "end");
  }

  return edges;
}

interface FlowTreeNode {
  raw: RawNodeDef;
  trueBranch: FlowTreeNode[];
  falseBranch: FlowTreeNode[];
}

interface FlowTree {
  main: FlowTreeNode[];
}

interface FlowTreeLayout {
  positions: Map<string, { x: number; y: number }>;
  edges: Edge[];
  mergeNodes: RawNodeDef[];
  maxDepth: number;
  maxRow: number;
}

type FlowTerminal = {
  id: string;
  label?: string;
  tone?: EdgeTone;
};

function isConditionNode(node: RawNodeDef): boolean {
  return node.branchType === "if" || node.branchType === "else_if" || node.branchType === "else";
}

function isEndLogicNode(node: RawNodeDef): boolean {
  const text = `${node.label ?? ""} ${node.action ?? ""}`.trim().toLowerCase();
  return text === "end" || text === "end end";
}

function sortByOrder(nodes: RawNodeDef[]): RawNodeDef[] {
  return [...nodes].sort((a, b) => {
    const orderDelta = (a.order ?? 0) - (b.order ?? 0);
    return orderDelta !== 0 ? orderDelta : a.id.localeCompare(b.id);
  });
}

function buildFlowTree(rawNodes: RawNodeDef[]): FlowTree {
  const stepNodes = rawNodes.filter((node) => node.nodeType === "step");
  const childrenByParent = new Map<string, RawNodeDef[]>();
  const falseBySource = new Map<string, RawNodeDef[]>();

  for (const node of stepNodes) {
    if (node.connectedTo) {
      if (!falseBySource.has(node.connectedTo)) falseBySource.set(node.connectedTo, []);
      falseBySource.get(node.connectedTo)!.push(node);
      continue;
    }
    if (node.parentUiId) {
      if (!childrenByParent.has(node.parentUiId)) childrenByParent.set(node.parentUiId, []);
      childrenByParent.get(node.parentUiId)!.push(node);
    }
  }

  const visited = new Set<string>();
  const toTree = (node: RawNodeDef): FlowTreeNode => {
    visited.add(node.id);
    const trueChildren = node.uuid ? sortByOrder(childrenByParent.get(node.uuid) ?? []) : [];
    const falseChildren = node.uuid ? sortByOrder(falseBySource.get(node.uuid) ?? []) : [];
    return {
      raw: node,
      trueBranch: trueChildren.map(toTree),
      falseBranch: falseChildren.map(toTree),
    };
  };

  const mainRoots = sortByOrder(
    stepNodes.filter((node) => !node.parentUiId && !node.connectedTo),
  ).map(toTree);
  const orphanRoots = sortByOrder(stepNodes.filter((node) => !visited.has(node.id))).map(toTree);

  return {
    main: [...mainRoots, ...orphanRoots].sort((a, b) => (a.raw.order ?? 0) - (b.raw.order ?? 0)),
  };
}

function treeHasExplicitEnd(nodes: FlowTreeNode[]): boolean {
  for (const node of nodes) {
    if (isEndLogicNode(node.raw)) return true;
    if (treeHasExplicitEnd(node.trueBranch) || treeHasExplicitEnd(node.falseBranch)) return true;
  }
  return false;
}

function branchColumnSpan(nodes: FlowTreeNode[]): number {
  let span = 0;

  for (const node of nodes) {
    if (!isConditionNode(node.raw)) continue;

    const trueSpan = branchColumnSpan(node.trueBranch);
    const falseStart = trueSpan + 1;
    const falseSpan = falseStart + branchColumnSpan(node.falseBranch);
    span = Math.max(span, trueSpan, falseSpan);
  }

  return span;
}

function layoutFlowTree(tree: FlowTree): FlowTreeLayout {
  const positions = new Map<string, { x: number; y: number }>();
  const edges: Edge[] = [];
  const mergeNodes: RawNodeDef[] = [];
  const edgeKeys = new Set<string>();
  let row = 1;
  let maxDepth = 0;
  let mergeIndex = 0;

  const addEdge = (
    source: string,
    target: string,
    label?: string,
    tone: EdgeTone = "default",
  ) => {
    if (source === target) return;
    const key = `${source}->${target}:${label ?? ""}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push(makeGraphEdge(`tree-e-${edges.length}-${source}-${target}`, source, target, label, tone));
  };

  const addMergeNode = (depth: number): RawNodeDef => {
    const node: RawNodeDef = {
      id: `merge-${mergeIndex++}`,
      label: "",
      action: "Merge",
      nodeType: "merge",
    };
    mergeNodes.push(node);
    positions.set(node.id, { x: depth * H_STEP + NODE_WIDTH / 2, y: row * V_STEP - V_GAP / 2 });
    return node;
  };

  const uniqueTerminals = (terminals: FlowTerminal[]): FlowTerminal[] => {
    const seen = new Set<string>();
    return terminals.filter((terminal) => {
      const key = `${terminal.id}:${terminal.label ?? ""}:${terminal.tone ?? "default"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const placeBranches = (node: FlowTreeNode, depth: number): FlowTerminal[] => {
    if (!isConditionNode(node.raw)) {
      return isEndLogicNode(node.raw) ? [] : [{ id: node.raw.id }];
    }

    const terminals: FlowTerminal[] = [];
    const branchStartRow = row;
    if (node.trueBranch.length > 0) {
      addEdge(node.raw.id, node.trueBranch[0].raw.id, "true", "true");
      row = branchStartRow;
      terminals.push(...placeSequence(node.trueBranch, depth));
    } else {
      terminals.push({ id: node.raw.id, label: "true", tone: "true" });
    }
    const trueEndRow = row;

    if (node.falseBranch.length > 0) {
      const falseDepth = depth + branchColumnSpan(node.trueBranch) + 1;
      addEdge(
        node.raw.id,
        node.falseBranch[0].raw.id,
        node.falseBranch[0].raw.branchType === "else" ? "else" : "false",
        "false",
      );
      row = branchStartRow;
      terminals.push(...placeSequence(node.falseBranch, falseDepth));
    } else {
      terminals.push({ id: node.raw.id, label: "false", tone: "merge" });
    }
    const falseEndRow = row;
    row = Math.max(trueEndRow, falseEndRow);

    return uniqueTerminals(terminals);
  };

  const placeSequence = (sequence: FlowTreeNode[], depth: number): FlowTerminal[] => {
    const sequenceTerminals: FlowTerminal[] = [];

    for (let i = 0; i < sequence.length; i++) {
      const node = sequence[i];
      const next = sequence[i + 1];
      maxDepth = Math.max(maxDepth, depth);
      positions.set(node.raw.id, { x: depth * H_STEP, y: row * V_STEP });
      row++;

      const nodeTerminals = placeBranches(node, depth);
      if (next) {
        const needsMerge = nodeTerminals.length > 1 || nodeTerminals.some((terminal) => terminal.label || terminal.tone === "merge");
        if (needsMerge) {
          const merge = addMergeNode(depth);
          for (const terminal of nodeTerminals) {
            addEdge(terminal.id, merge.id, terminal.label, terminal.tone);
          }
          addEdge(merge.id, next.raw.id);
          row++;
        } else {
          for (const terminal of nodeTerminals) {
            addEdge(terminal.id, next.raw.id, terminal.label, terminal.tone);
          }
        }
      } else {
        sequenceTerminals.push(...nodeTerminals);
      }
    }

    return sequenceTerminals;
  };

  const hasExplicitEnd = treeHasExplicitEnd(tree.main);
  positions.set("trigger", { x: 0, y: 0 });
  if (tree.main.length > 0) addEdge("trigger", tree.main[0].raw.id);
  const mainTerminals = placeSequence(tree.main, 0);
  const endRow = row;
  if (!hasExplicitEnd) {
    positions.set("end", { x: 0, y: endRow * V_STEP });
    const terminals = mainTerminals.length > 0 ? mainTerminals : [{ id: "trigger" }];
    if (terminals.length > 1 || terminals.some((terminal) => terminal.label || terminal.tone === "merge")) {
      const merge = addMergeNode(0);
      for (const terminal of terminals) addEdge(terminal.id, merge.id, terminal.label, terminal.tone);
      addEdge(merge.id, "end");
    } else {
      for (const terminal of terminals) addEdge(terminal.id, "end", terminal.label, terminal.tone);
    }
  }

  return { positions, edges, mergeNodes, maxDepth, maxRow: Math.max(endRow, row) };
}

// ── Detail panel ─────────────────────────────────────────────────────────────

function DataRow({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{
        fontSize: 9.5, fontWeight: 700, color: "#94a3b8",
        textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 11.5, lineHeight: 1.5, wordBreak: "break-word" as const,
        color: value ? "#1e293b" : "#94a3b8",
        fontFamily: mono ? "ui-monospace, 'Courier New', monospace" : "inherit",
      }}>
        {value || "Not detected"}
      </div>
    </div>
  );
}

function EmptyMsg({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: "center" as const, padding: "20px 8px", color: "#94a3b8", fontSize: 11.5 }}>
      {msg}
    </div>
  );
}

// Type-specific summary for known action types
function TypeSpecificSummary({ step }: { step: FlowPreviewStep }) {
  const params = (step.params ?? []) as FlowPreviewStepParam[];
  const getP = (name: string) =>
    params.find((p) => p.name === name)?.display_value ||
    params.find((p) => p.name === name)?.value;
  const action = (step.action || step.label).toLowerCase();

  if (action.includes("catalog task") || action.includes("create catalog")) {
    return (
      <>
        <DataRow label="Table" value={getP("table") || getP("sys_class_name")} />
        <DataRow label="Short Description" value={getP("short_description")} />
        <DataRow label="Assignment Group" value={getP("assignment_group")} />
        <DataRow label="Description" value={getP("description")} />
        <DataRow label="Template" value={getP("template_id") || getP("template")} />
      </>
    );
  }
  if (action.includes("look up") || action.includes("lookup") || action.includes("look_up")) {
    return (
      <>
        <DataRow label="Table" value={getP("table") || getP("sys_class_name")} />
        <DataRow label="Conditions" value={getP("conditions") || getP("field_conditions") || getP("query")} />
        <DataRow label="Return First" value={getP("return_first")} />
      </>
    );
  }
  if (action.includes("approval") || action.includes("ask for")) {
    return (
      <>
        <DataRow label="Approvers" value={getP("approvers") || getP("approval_user")} />
        <DataRow label="Approval Type" value={getP("approval_type")} />
        <DataRow label="Journal Field" value={getP("journal_field")} />
      </>
    );
  }
  return null;
}

type PanelContent =
  | { kind: "trigger"; trigger: FlowPreviewTrigger }
  | { kind: "step"; step: FlowPreviewStep }
  | { kind: "end" };

const TABS = ["Summary", "Parameters", "Inputs", "Outputs", "Raw"] as const;
type Tab = typeof TABS[number];

function StepDetailPanel({ content, onClose }: { content: PanelContent; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("Summary");

  const headerTitle =
    content.kind === "trigger"
      ? content.trigger.definition || content.trigger.name || "Trigger"
      : content.kind === "step"
      ? content.step.label
      : "End";

  const headerSubtitle =
    content.kind === "step" ? `Step ${content.step.order}` :
    content.kind === "trigger" ? "Trigger" : "End of Flow";

  const hasParams = content.kind === "step" && (content.step.params ?? []).length > 0;
  const hasInputs = content.kind === "step" && (content.step.inputs ?? []).length > 0;
  const hasOutputs = content.kind === "step" && (content.step.outputs ?? []).length > 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" as const, background: "#fff" }}>
      {/* Header — "Action Properties" style */}
      <div style={{
        padding: "9px 12px 7px",
        borderBottom: "1px solid #e2e8f0",
        background: "#f8fafc",
        display: "flex", gap: 6, alignItems: "flex-start", flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#6366f1", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 2 }}>
            {headerSubtitle}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            {headerTitle}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2, display: "flex", alignItems: "center", flexShrink: 0, borderRadius: 4 }} aria-label="Close">
          <X size={14} />
        </button>
      </div>

      {/* Tabs — only for step nodes */}
      {content.kind === "step" && (
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", padding: "0 4px", flexShrink: 0, background: "#fafafa", overflowX: "auto" as const }}>
          {TABS.map((t) => {
            const hasData =
              t === "Parameters" ? hasParams :
              t === "Inputs" ? hasInputs :
              t === "Outputs" ? hasOutputs : true;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "5px 8px", fontSize: 10, fontWeight: tab === t ? 700 : 500,
                  color: tab === t ? "#4f46e5" : hasData ? "#64748b" : "#cbd5e1",
                  background: "none", border: "none",
                  borderBottom: `2px solid ${tab === t ? "#4f46e5" : "transparent"}`,
                  cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap" as const,
                  transition: "color 0.1s",
                }}
              >
                {t}
                {hasData && t !== "Summary" && t !== "Raw" && (
                  <span style={{ marginLeft: 3, fontSize: 8.5, opacity: 0.7 }}>●</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Panel content */}
      <div style={{ flex: 1, overflowY: "auto" as const, padding: "10px 12px" }}>

        {/* Trigger */}
        {content.kind === "trigger" && (
          <>
            <DataRow label="Trigger Type" value={content.trigger.definition || content.trigger.name} />
            {content.trigger.table && <DataRow label="Table" value={content.trigger.table} mono />}
            {content.trigger.catalog_item && <DataRow label="Catalog Item" value={String(content.trigger.catalog_item)} />}
            {content.trigger.comment && <DataRow label="Comment" value={content.trigger.comment} />}
          </>
        )}

        {content.kind === "end" && <EmptyMsg msg="End of Flow" />}

        {/* Step — Summary */}
        {content.kind === "step" && tab === "Summary" && (
          <>
            <DataRow label="Step #" value={String(content.step.order)} />
            <DataRow label="Label" value={content.step.label} />
            {content.step.action && content.step.action !== content.step.label && (
              <DataRow label="Action Type" value={content.step.action} />
            )}
            {content.step.branch_type && (
              <DataRow label="Branch Type" value={String(content.step.branch_type).toUpperCase()} />
            )}
            {content.step.condition && (
              <DataRow label="Condition" value={content.step.condition} />
            )}
            {content.step.parent_ui_id && (
              <DataRow label="Parent UI ID" value={content.step.parent_ui_id} mono />
            )}
            {content.step.connected_to && (
              <DataRow label="Connected To" value={content.step.connected_to} mono />
            )}
            <DataRow label="Instance UUID" value={content.step.uuid} mono />
            <TypeSpecificSummary step={content.step} />
          </>
        )}

        {/* Step — Parameters (sys_variable_value) */}
        {content.kind === "step" && tab === "Parameters" && (() => {
          const params = (content.step.params ?? []) as FlowPreviewStepParam[];
          if (params.length === 0) return <EmptyMsg msg="No parameters detected (re-import the XML)" />;
          return (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
              {params.map((p, i) => (
                <div key={i} style={{ padding: "7px 9px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fafcff" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "#6366f1", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 2 }}>
                    {p.name.replace(/_/g, " ")}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1e293b", wordBreak: "break-word" as const }}>
                    {p.display_value || p.value || <span style={{ color: "#94a3b8" }}>—</span>}
                  </div>
                  {p.display_value && p.value && p.display_value !== p.value && (
                    <div style={{ fontSize: 9.5, color: "#94a3b8", marginTop: 1, fontFamily: "ui-monospace, monospace" }}>
                      {p.value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Step — Inputs (data pills consumed) */}
        {content.kind === "step" && tab === "Inputs" && (() => {
          const inputs = (content.step.inputs ?? []) as FlowPreviewStepInput[];
          if (inputs.length === 0) return <EmptyMsg msg="No data pills detected for this step" />;
          return (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
              {inputs.map((inp, i) => (
                <div key={i} style={{ padding: "7px 9px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fafcff" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "#6366f1", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 2 }}>
                    Step {inp.source_order} — {inp.source_label}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1e293b", wordBreak: "break-word" as const }}>
                    {inp.field || "—"}
                  </div>
                  {inp.usages && inp.usages.length > 0 && (
                    <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 2 }}>
                      Used as: <strong>{inp.usages.join(", ")}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Step — Outputs (data pills produced) */}
        {content.kind === "step" && tab === "Outputs" && (() => {
          const outputs = (content.step.outputs ?? []) as FlowPreviewStepOutput[];
          if (outputs.length === 0) return <EmptyMsg msg="No outputs detected for this step" />;
          return (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
              {outputs.map((o, i) => (
                <div key={i} style={{ padding: "7px 9px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fafcff" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1e293b", marginBottom: 3, wordBreak: "break-word" as const }}>
                    {o.path}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                    {o.type && (
                      <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 3, background: "#e0e7ff", color: "#4338ca", fontWeight: 600 }}>
                        {o.type}
                      </span>
                    )}
                    {o.reference && (
                      <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 3, background: "#e0f2fe", color: "#0369a1", fontWeight: 600 }}>
                        → {o.reference_display || o.reference}
                      </span>
                    )}
                  </div>
                  {o.choices && o.choices.length > 0 && (
                    <div style={{ marginTop: 5 }}>
                      <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 2, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                        Choices ({o.choices.length})
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 3 }}>
                        {o.choices.map((c, ci) => (
                          <span key={ci} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
                            {c.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Step — Raw */}
        {content.kind === "step" && tab === "Raw" && (
          <pre style={{
            fontSize: 9.5, lineHeight: 1.6, color: "#334155", background: "#f8fafc",
            borderRadius: 6, padding: "8px 10px", overflowX: "auto" as const,
            whiteSpace: "pre-wrap" as const, wordBreak: "break-all" as const, margin: 0,
          }}>
            {JSON.stringify(content.step, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ── Main canvas component ─────────────────────────────────────────────────────

interface Props {
  data: FlowPreviewData;
}

export function FlowCanvasPreview({ data }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const { nodes, edges, canvasHeight } = useMemo(() => {
    type RawNode = {
      id: string;
      label: string;
      action: string;
      order?: number;
      uuid?: string;
      parentUiId?: string;
      connectedTo?: string;
      nodeType: "trigger" | "step" | "end" | "merge";
      branchType?: string | null;
    };
    const raw: RawNode[] = [];

    raw.push({
      id: "trigger",
      label: data.trigger?.definition || data.trigger?.name || "Trigger",
      action: data.trigger?.definition || data.trigger?.name || "Trigger",
      nodeType: "trigger",
    });

    (data.steps ?? []).forEach((step, i) => {
      raw.push({
        id: `step-${i}`,
        label: String(step.label || step.action || `Step ${i + 1}`),
        action: String(step.action || step.label || `Step ${i + 1}`),
        order: step.order as number | undefined,
        uuid: step.uuid || step.sys_id || undefined,
        parentUiId: step.parent_ui_id,
        connectedTo: step.connected_to,
        nodeType: "step",
        branchType: (step.branch_type as string | null) ?? null,
      });
    });

    raw.push({ id: "end", label: "End", action: "End", nodeType: "end" });

    const hasStructuralLinks = raw.some((node) => node.parentUiId || node.connectedTo);
    const treeLayout = hasStructuralLinks ? layoutFlowTree(buildFlowTree(raw)) : null;
    const renderedRaw = treeLayout
      ? [...raw.filter((node) => treeLayout.positions.has(node.id)), ...treeLayout.mergeNodes]
      : raw;

    const builtNodes: Node<NodeData>[] = renderedRaw.map((r, i) => ({
      id: r.id,
      type: "flowNode",
      position: treeLayout?.positions.get(r.id) ?? { x: 0, y: i * V_STEP },
      data: {
        label: r.label ?? "",
        action: r.action ?? "",
        order: r.nodeType === "step" ? r.order : undefined,
        nodeType: r.nodeType ?? "step",
        branchType: r.branchType,
        isSelected: r.id === selectedNodeId,
      },
      style: { width: r.nodeType === "merge" ? 1 : NODE_WIDTH, height: r.nodeType === "merge" ? 1 : undefined },
      draggable: false,
      selectable: false,
    }));

    const builtEdges = treeLayout?.edges ?? (hasStructuralLinks ? buildEdgesFromFlowRelations(raw) : buildEdgesWithBranches(raw));

    const totalContent = treeLayout ? (treeLayout.maxRow + 1) * V_STEP + 60 : raw.length * V_STEP + 60;
    return {
      nodes: builtNodes,
      edges: builtEdges,
      canvasHeight: Math.min(600, Math.max(300, totalContent)),
    };
  }, [data, selectedNodeId]);

  const panelContent: PanelContent | null = useMemo(() => {
    if (!selectedNodeId) return null;
    if (selectedNodeId === "trigger") {
      return data.trigger ? { kind: "trigger", trigger: data.trigger } : null;
    }
    if (selectedNodeId === "end") return { kind: "end" };
    const idx = parseInt(selectedNodeId.replace("step-", ""), 10);
    if (isNaN(idx)) return null;
    const step = (data.steps ?? [])[idx];
    return step ? { kind: "step", step } : null;
  }, [selectedNodeId, data]);

  const hasSteps = (data.steps ?? []).length > 0;

  return (
    <div style={{ display: "flex", gap: 10, height: canvasHeight, alignItems: "stretch" }}>
      {/* React Flow canvas */}
      <div style={{ flex: 1, minWidth: 0, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", background: "#fafafa" }}>
        {!hasSteps ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 8, color: "#94a3b8" }}>
            <Workflow size={32} strokeWidth={1.5} />
            <span style={{ fontSize: 13 }}>No flow steps detected in this XML</span>
            <span style={{ fontSize: 11, opacity: 0.7 }}>Re-import the XML to extract steps from label_cache</span>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={1.5}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            zoomOnPinch
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>
        )}
      </div>

      {/* Side detail panel — "Action Properties" */}
      {panelContent && (
        <div style={{
          width: 285, flexShrink: 0,
          borderRadius: 12, border: "1px solid #e2e8f0",
          overflow: "hidden", display: "flex",
          flexDirection: "column" as const,
        }}>
          <StepDetailPanel
            key={selectedNodeId}
            content={panelContent}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>
      )}
    </div>
  );
}
