"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Development } from "../developments/development.types";
import { useLanguage } from "@/i18n/LanguageProvider";
import { conditionValues, resultValue, archiveNode, decisionGroups, mobileGraph, ordered, references, resolver, text, variables, visibleFields, type Node } from "./archiveModel";

export function ArchiveExplorer({ records }: { records: Development[] }) {
  const { language } = useLanguage();
  const tr = (fr:string,en:string) => language === "fr" ? fr : en;
  const nodes = useMemo(()=>records.map(archiveNode),[records]);
  const decisions = useMemo(()=>decisionGroups(nodes),[nodes]);
  const graph = useMemo(()=>mobileGraph(nodes),[nodes]);
  const [tab,setTab] = useState("decisions");
  const [decisionId,setDecisionId] = useState("");
  const [selectedId,setSelectedId] = useState("");
  const [query,setQuery] = useState("");
  if (!decisions.length && !graph.mobile.length) return null;
  const resolve = resolver(nodes);
  const decision = decisions.find(d=>d.root.record.id===decisionId) ?? decisions[0];
  const selected = graph.mobile.find(n=>n.record.id===selectedId) ?? graph.roots[0] ?? graph.mobile[0];
  const inputs = ordered(decision?.members.filter(n=>n.table==="sys_decision_input") ?? []);
  const outputs = ordered(decision?.members.filter(n=>n.table==="sys_decision_multi_result_element") ?? []);
  const repeatedConditions = decision?.rules.some((n,i,all)=>text(n.fields.condition)!=="" && all.some((other,j)=>i!==j && text(other.fields.condition)===text(n.fields.condition))) ?? false;
  const mobileActive = tab === "mobile" || !decisions.length;
  const url = (n:Node) => `/clients/${n.record.client_id}/stories/${n.record.story_id}/developments/${n.record.id}`;
  const label = (n:Node) => {
    const own = text(n.fields.label || n.fields.name || n.fields.sys_name);
    if (own) return own;
    const embedded = resolve(text(n.fields.embedded_screen), n);
    if (embedded) return text(embedded.fields.name || embedded.fields.sys_name) || embedded.record.title;
    return n.record.title;
  };
  const fieldLabel = (key:string) => key.replace(/^u_/,"").replaceAll("_"," ");
  const card = "rounded-xl border border-sn-border bg-white p-5";
  function provenance(n:Node) { return <p className="mt-2 break-all text-xs text-sn-muted">{n.table} · {n.sysId || tr("Identifiant source absent","Source ID missing")} · {tr("Import","Import")} {n.record.xml_import_id ?? "—"}</p>; }
  function tree(n:Node,path:Set<string>,depth=0): React.ReactNode {
    const key=n.record.id;
    if(path.has(key)) return <p key={key} className="pl-4 text-xs text-sn-muted">↪ {label(n)} ({tr("référence partagée / cycle","shared reference / cycle")})</p>;
    if(depth>12) return <Link key={key} href={url(n)} className="text-sn-accent">{label(n)} ↗</Link>;
    const children = ordered([...new Map(graph.edges.filter(e=>e.parent===n).map(e=>[e.child.record.id,e.child])).values()]);
    const next = new Set(path).add(key);
    return <details key={key} open={depth<1} className="my-1 border-l border-sn-border pl-3"><summary className="cursor-pointer py-1 text-sm"><button type="button" onClick={()=>setSelectedId(key)} className={selected?.record.id===key?"font-semibold text-sn-accent":"text-sn-text"}>{label(n)}{n.table.endsWith("_screen")&&text(n.fields.description)&&<span className="block text-xs font-normal text-sn-muted">{text(n.fields.description)}</span>}</button><span className="ml-2 text-xs text-sn-muted">{n.table.replace("sys_sg_", "").replaceAll("_", " ")} {children.length ? `· ${children.length}` : ""}</span></summary>{children.map(c=>tree(c,next,depth+1))}</details>;
  }
  const reachable = new Set<string>();
  function visit(n:Node) { if(reachable.has(n.record.id))return;reachable.add(n.record.id);for(const e of graph.edges)if(e.parent===n)visit(e.child); }
  graph.roots.forEach(visit);
  const detached = graph.mobile.filter(n=>!reachable.has(n.record.id));
  return <section className="mb-6 overflow-hidden rounded-xl border border-sn-border bg-white shadow-sm" aria-label={tr("Lecture des objets archivés","Archived object explorer")}>
    <header className="border-b border-sn-border bg-sn-surface p-5"><h2 className="text-lg font-semibold">{tr("Objets de l’archive","Archive objects")}</h2><p className="mt-1 text-sm text-sn-muted">{tr("Vue reconstruite depuis les références XML de cette story. Aucun appel à l’instance ServiceNow.","Reconstructed from this story’s archived XML references. No calls to ServiceNow.")}</p><div className="mt-4 flex flex-wrap gap-2">{decisions.length>0&&<button type="button" aria-pressed={!mobileActive} onClick={()=>{setTab("decisions");setQuery("");}} className="rounded-lg border border-sn-border px-4 py-2 text-sm font-semibold text-sn-accent">Decision Tables ({decisions.length})</button>}{graph.mobile.length>0&&<button type="button" aria-pressed={mobileActive} onClick={()=>setTab("mobile")} className="rounded-lg border border-sn-border px-4 py-2 text-sm font-semibold text-sn-accent">Mobile ({graph.mobile.length})</button>}</div></header>
    {!mobileActive && decision ? <div className="space-y-5 p-5">
      <label className="block text-sm font-medium">Decision Table<select value={decision.root.record.id} onChange={e=>{setDecisionId(e.target.value);setQuery("");}} className="mt-2 block w-full rounded-lg border border-sn-border p-3">{decisions.map(d=><option key={d.root.record.id} value={d.root.record.id}>{label(d.root)} ({d.rules.length})</option>)}</select></label>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{label(decision.root)}</h3>{provenance(decision.root)}</div><Link className="text-sm text-sn-accent" href={url(decision.root)}>{tr("Ouvrir la fiche technique","Open technical record")} ↗</Link></div>
      <div className="grid gap-3 md:grid-cols-2">{["sys_decision_input","sys_decision_multi_result_element"].map(table=><div key={table} className={card}><h4 className="mb-2 font-semibold">{table==="sys_decision_input"?tr("Entrées","Inputs"):tr("Définition des résultats","Result definitions")}</h4>{decision.members.filter(n=>n.table===table).map(n=><div key={n.record.id} className="py-1 text-sm"><Link href={url(n)} className="text-sn-accent">{label(n)}</Link> <span className="text-sn-muted">{text(n.fields.element)} · {text(n.fields.internal_type || n.fields.type)}</span></div>)}{!decision.members.some(n=>n.table===table)&&<p className="text-sm text-sn-muted">{tr("Définition absente de cette archive.","Definition missing from this archive.")}</p>}</div>)}</div>
      {repeatedConditions&&<p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{tr("Plusieurs règles ont la même condition dans cette archive. Les variantes sont conservées ; vérifiez leurs fiches sources avant de les réutiliser.","Multiple archived rules share a condition. Variants are preserved; check their source records before reuse.")}</p>}
      <input aria-label={tr("Filtrer les règles","Filter rules")} placeholder={tr("Rechercher une règle ou condition…","Search rules or conditions…")} value={query} onChange={e=>setQuery(e.target.value)} className="w-full rounded-lg border border-sn-border p-3" />
      <div className="overflow-x-auto rounded-lg border border-sn-border"><table className="w-full text-left text-sm"><thead className="bg-sn-surface"><tr>{[tr("Ordre","Order"),...inputs.map(label),...outputs.map(label),tr("Source","Source")].map(h=><th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead><tbody>{decision.rules.filter(n=>(label(n)+JSON.stringify(n.fields)).toLowerCase().includes(query.toLowerCase())).map(n=>{
        const answerId=text(n.fields.answer);const answer=resolve(answerId,n);const values=answer?variables(answer):[];const inputValues=variables(n);const conditions=conditionValues(text(n.fields.condition));
        return <tr key={n.record.id} className="border-t border-sn-border odd:bg-white even:bg-sn-surface"><td className="p-3 align-top">{text(n.fields.order)||"—"}{(n.fields.default_answer===true||n.fields.default_answer==="true")&&<span className="block text-xs">{tr("Par défaut","Default")}</span>}</td>{inputs.map(input=><td key={input.record.id} className="whitespace-nowrap p-3 align-top">{conditions?.[text(input.fields.element)] ?? (conditions ? "—" : tr("Voir condition","See condition"))}</td>)}{outputs.map(output=>{const cell=answer?resultValue(answer,output,outputs):undefined;return <td key={output.record.id} className="p-3 align-top">{cell?<>{cell.value||"—"}{cell.source==="label"&&<span title={tr("Valeur issue du libellé archivé du résultat","Value from the archived result label")} className="ml-1 text-xs text-sn-muted">*</span>}</>:"—"}</td>;})}<td className="p-3 align-top"><details><summary className="cursor-pointer text-sn-accent">{tr("Détails","Details")}</summary><div className="mt-2 min-w-64 max-w-md space-y-2 whitespace-normal"><Link className="text-sn-accent" href={url(n)}>{label(n)} ↗</Link><p className="break-words font-mono text-xs">{text(n.fields.condition)||tr("Condition vide dans l’archive","Empty condition in archive")}</p>{inputValues.map(([k,v])=><p key={k}>{fieldLabel(k)}: {v}</p>)}{answer?<><Link className="block text-sn-accent" href={url(answer)}>{label(answer)}</Link>{values.map(([k,v])=><p key={k}>{fieldLabel(k)}: {v}</p>)}</>:<p className="break-all text-amber-700">{answerId?tr("Référence absente ou ambiguë","Missing or ambiguous reference"):tr("Aucune réponse référencée","No answer reference")} {answerId}</p>}</div></details></td></tr>;
      })}</tbody></table></div>
      <p className="text-xs text-sn-muted">{tr("* Valeur lue dans le libellé archivé du résultat. Les conditions complexes restent consultables dans Détails.","* Value read from the archived result label. Complex conditions remain available under Details.")}</p>
      <details><summary className="cursor-pointer text-sm font-semibold">{tr("Composants techniques associés","Related technical components")} ({decision.members.length})</summary><div className="mt-3 space-y-2">{decision.members.map(n=><p key={n.record.id} className="text-sm"><Link className="text-sn-accent" href={url(n)}>{label(n)}</Link> <span className="text-xs text-sn-muted">{n.table}</span></p>)}</div></details>
    </div> : selected ? <div className="grid gap-5 p-5 lg:grid-cols-[minmax(220px,1fr)_minmax(280px,1.5fr)_minmax(220px,1fr)]">
      <nav aria-label={tr("Arborescence mobile","Mobile hierarchy")} className="max-h-[750px] overflow-auto"><h3 className="mb-3 font-semibold">{tr("Écrans et composants","Screens and components")}</h3>{graph.roots.map(n=>tree(n,new Set()))}{detached.length>0&&<details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">{tr("Autres composants / parents absents","Other components / missing parents")} ({detached.length})</summary>{detached.map(n=>tree(n,new Set()))}</details>}</nav>
      <article className="max-h-[750px] min-w-0 overflow-auto rounded-lg border border-sn-border p-4"><p className="text-xs text-sn-muted">{selected.table}</p><h3 className="mt-1 text-lg font-semibold">{label(selected)}</h3><Link href={url(selected)} className="my-3 inline-block text-sm text-sn-accent">{tr("Ouvrir la fiche technique","Open technical record")} ↗</Link>{provenance(selected)}<dl className="mt-4 divide-y divide-sn-border">{visibleFields(selected).map(([k,v])=><div key={k} className="py-3"><dt className="text-xs font-medium text-sn-muted">{fieldLabel(k)}</dt><dd className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all text-sm">{v}</dd></div>)}</dl><h4 className="mt-5 font-semibold">{tr("Dépendances","Dependencies")}</h4>{references(selected).map(([key,id])=>{const target=resolve(id,selected);return <p key={key} className="mt-2 break-all text-xs">{fieldLabel(key)}: {target?<Link href={url(target)} className="text-sn-accent">{label(target)}</Link>:<span className="text-amber-700">{tr("Absente ou ambiguë dans cette story","Missing or ambiguous in this story")} · {id}</span>}</p>;})}</article>
      <aside><h3 className="mb-3 font-semibold">{tr("Aperçu de structure","Structure preview")}</h3><p className="mb-4 text-xs text-sn-muted">{tr("Représentation de l’archive, sans données métier ni exécution des scripts.","Archive representation, without business data or script execution.")}</p><div className="overflow-hidden rounded-[2rem] border-8 border-slate-800 bg-slate-50 shadow-lg"><div className="bg-sn-accent p-4 text-center text-sm font-semibold text-white">{label(selected)}</div><div className="min-h-80 space-y-3 p-4">{ordered([...new Map(graph.edges.filter(e=>e.parent===selected).map(e=>[e.child.record.id,e.child])).values()]).map(n=><button key={n.record.id} type="button" onClick={()=>setSelectedId(n.record.id)} className="block w-full rounded-lg border border-sn-border bg-white p-3 text-left text-sm"><span className="block font-medium">{label(n)}</span><span className="text-xs text-sn-muted">{n.table.replace("sys_sg_","").replaceAll("_"," ")}</span></button>)}{!graph.edges.some(e=>e.parent===selected)&&<div className="rounded-lg border border-sn-border bg-white p-4 text-sm">{text(selected.fields.data_item_field_name || selected.fields.name)||label(selected)}<div className="mt-3 h-8 rounded border border-sn-border bg-slate-50" /></div>}</div><div className="border-t border-sn-border p-3 text-center text-xs text-sn-muted">SN Dev Hub · {tr("Archive","Archive")}</div></div></aside>
    </div>:null}
    <footer className="border-t border-sn-border p-4 text-xs text-sn-muted">{tr("Les références manquantes ou ambiguës ne sont pas rattachées par nom. La liste technique complète reste accessible ci-dessous.","Missing or ambiguous references are never matched by name. The complete technical list remains available below.")}</footer>
  </section>;
}
