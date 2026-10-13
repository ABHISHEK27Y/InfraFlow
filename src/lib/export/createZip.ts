export async function createExportZip(files: Record<string, string>): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const [filename, content] of Object.entries(files)) {
    zip.file(filename, content);
  }
  return zip.generateAsync({ type: "blob" });
}
