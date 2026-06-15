import { getXmlImports } from "@/features/xml/xml.actions";
import { XmlImportListClient } from "@/features/xml/XmlImportList";

export default async function XmlImportsPage() {
  const imports = await getXmlImports();
  return <XmlImportListClient imports={imports} />;
}
