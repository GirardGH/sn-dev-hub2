import { notFound } from "next/navigation";
import { getXmlImport } from "@/features/xml/xml.actions";
import { XmlImportDetailClient } from "@/features/xml/XmlImportDetail";

interface Props {
  params: Promise<{ xmlImportId: string }>;
}

export default async function XmlImportPage({ params }: Props) {
  const { xmlImportId } = await params;
  try {
    const xmlImport = await getXmlImport(xmlImportId);
    return <XmlImportDetailClient xmlImport={xmlImport} />;
  } catch {
    notFound();
  }
}
