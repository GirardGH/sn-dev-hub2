import { notFound } from "next/navigation";
import { getXmlImport, getDevelopmentsByXmlImport } from "@/features/xml/xml.actions";
import { XmlImportDetailClient } from "@/features/xml/XmlImportDetail";

interface Props {
  params: Promise<{ xmlImportId: string }>;
}

export default async function XmlImportPage({ params }: Props) {
  const { xmlImportId } = await params;
  try {
    const [xmlImport, linkedDevelopments] = await Promise.all([
      getXmlImport(xmlImportId),
      getDevelopmentsByXmlImport(xmlImportId),
    ]);
    return (
      <XmlImportDetailClient
        xmlImport={xmlImport}
        linkedDevelopments={linkedDevelopments}
      />
    );
  } catch {
    notFound();
  }
}
