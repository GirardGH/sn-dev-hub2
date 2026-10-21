import { notFound } from "next/navigation";
import { getXmlImport, getDevelopmentsByXmlImport } from "@/features/xml/xml.actions";
import { XmlImportDetailClient } from "@/features/xml/XmlImportDetail";

interface Props {
  params: Promise<{ xmlImportId: string }>;
}

export default async function XmlImportPage({ params }: Props) {
  const { xmlImportId } = await params;
    const [xmlImport, linkedDevelopments] = await Promise.all([
      getXmlImport(xmlImportId),
      getDevelopmentsByXmlImport(xmlImportId),
    ]).catch(() => notFound());
    return (
      <XmlImportDetailClient
        xmlImport={xmlImport}
        linkedDevelopments={linkedDevelopments}
      />
    );
}
