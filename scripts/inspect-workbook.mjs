import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import CFB from "cfb";

const source = process.argv[2] || "M:\\eFootball_Lig_Yonetim_Sistemi_v228.xlsm";
const output = path.resolve("analysis");
await fs.mkdir(path.join(output, "vba"), { recursive: true });
const bytes = await fs.readFile(source);
const zip = await JSZip.loadAsync(bytes);
const bin = await zip.file("xl/vbaProject.bin").async("nodebuffer");
const ole = CFB.read(bin, { type: "buffer" });
function decompress(data, start) {
  if (data[start++] !== 1) throw Error("signature");
  const out = [];
  while (start + 2 <= data.length) {
    const header = data.readUInt16LE(start),
      end = Math.min(start + (header & 4095) + 3, data.length);
    if (((header >> 12) & 7) !== 3) throw Error("header");
    start += 2;
    const base = out.length;
    if (!(header & 32768)) {
      while (start < end) out.push(data[start++]);
      continue;
    }
    while (start < end) {
      const flags = data[start++];
      for (let bit = 0; bit < 8 && start < end; bit++) {
        if (!(flags & (1 << bit))) out.push(data[start++]);
        else {
          if (start + 2 > end) throw Error("token");
          const token = data.readUInt16LE(start);
          start += 2;
          const bits = Math.max(4, Math.ceil(Math.log2(out.length - base)));
          const length = (token & (65535 >> bits)) + 3;
          const offset = (token >> (16 - bits)) + 1;
          if (offset > out.length - base) throw Error("offset");
          for (let i = 0; i < length; i++) out.push(out[out.length - offset]);
        }
        if (out.length - base > 4096 || out.length > 4000000)
          throw Error("size");
      }
    }
  }
  return new TextDecoder("windows-1254").decode(Uint8Array.from(out));
}
const modules = [];
for (let i = 0; i < ole.FullPaths.length; i++) {
  const name = ole.FullPaths[i],
    entry = ole.FileIndex[i];
  if (
    !name.includes("/VBA/") ||
    !entry.content ||
    /\/(dir|_VBA_PROJECT|__SRP_\d+)$/.test(name)
  )
    continue;
  const data = Buffer.from(entry.content);
  for (let offset = 0; offset < data.length - 3; offset++) {
    if (data[offset] !== 1 || ((data[offset + 2] >> 4) & 7) !== 3) continue;
    try {
      const text = decompress(data, offset);
      if (!/^Attribute VB_Name = /.test(text)) continue;
      const moduleName = name.split("/").pop();
      await fs.writeFile(path.join(output, "vba", moduleName + ".bas"), text);
      modules.push({
        name: moduleName,
        lines: text.split("\n").length,
        procedures: [
          ...text.matchAll(
            /^(?:Public |Private |Friend )?(?:Static )?(Sub|Function)\s+(\w+)/gm,
          ),
        ].map((m) => m[2]),
      });
      break;
    } catch {
      /* Candidate is part of the compiled cache, not source. */
    }
  }
}
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(bytes);
const sheets = wb.worksheets.map((ws) => ({
  name: ws.name,
  state: ws.state,
  rows: ws.actualRowCount,
  columns: ws.actualColumnCount,
  sample: [...Array(Math.min(ws.rowCount < 50 ? 50 : 4, ws.rowCount))].map(
    (_, i) =>
      ws
        .getRow(i + 1)
        .values.map((v) =>
          typeof v === "string" && v.length > 200 ? v.slice(0, 200) + "…" : v,
        ),
  ),
}));
const theme = wb.getWorksheet("DATA_TEMA");
await fs.mkdir(path.resolve("public/themes"), { recursive: true });
for (let i = 2; i <= (theme?.rowCount || 0); i++) {
  const row = theme.getRow(i);
  const image = row.values.slice(2).join("");
  if (image.startsWith("/9j/"))
    await fs.writeFile(
      path.resolve("public/themes", String(row.getCell(1).value) + ".jpg"),
      Buffer.from(image, "base64"),
    );
}
// User accounts, theme binary and audit records stay out of the human-readable report.
await fs.writeFile(
  path.join(output, "workbook.json"),
  JSON.stringify(
    {
      source,
      sheets: sheets.map((s) =>
        /Kullanicilar|Hareketler|TEMA/.test(s.name) ? { ...s, sample: [] } : s,
      ),
      modules,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      sheets: sheets.map(({ name, rows, columns }) => ({
        name,
        rows,
        columns,
      })),
      modules: modules.map(({ name, lines }) => ({ name, lines })),
    },
    null,
    2,
  ),
);
