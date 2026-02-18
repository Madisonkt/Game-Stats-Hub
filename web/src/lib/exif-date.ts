/**
 * Minimal EXIF DateTimeOriginal extractor.
 * Reads only the first 64KB of a File to find the date a photo was taken.
 * Returns a Date or null if not found / not a JPEG.
 */
export async function extractPhotoDate(file: File): Promise<Date | null> {
  try {
    const slice = file.slice(0, 65536);
    const buf = await slice.arrayBuffer();
    const view = new DataView(buf);

    // Check JPEG SOI marker
    if (view.getUint16(0) !== 0xffd8) return null;

    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xffe1) {
        // APP1 — EXIF
        const length = view.getUint16(offset + 2);
        return parseExif(view, offset + 4, length - 2);
      }
      if ((marker & 0xff00) !== 0xff00) break;
      const segLen = view.getUint16(offset + 2);
      offset += 2 + segLen;
    }
    return null;
  } catch {
    return null;
  }
}

function parseExif(view: DataView, start: number, len: number): Date | null {
  // Check "Exif\0\0"
  const end = Math.min(start + len, view.byteLength);
  if (
    view.getUint8(start) !== 0x45 || // E
    view.getUint8(start + 1) !== 0x78 || // x
    view.getUint8(start + 2) !== 0x69 || // i
    view.getUint8(start + 3) !== 0x66 // f
  )
    return null;

  const tiffStart = start + 6;
  const byteOrder = view.getUint16(tiffStart);
  const le = byteOrder === 0x4949; // little-endian

  const g16 = (o: number) => view.getUint16(tiffStart + o, le);
  const g32 = (o: number) => view.getUint32(tiffStart + o, le);

  // IFD0 offset
  const ifd0Off = g32(4);
  let dateStr = readDateFromIFD(view, tiffStart, ifd0Off, g16, g32, end);
  if (dateStr) return parseExifDateStr(dateStr);

  // Check for ExifIFD pointer (tag 0x8769)
  const count0 = g16(ifd0Off);
  for (let i = 0; i < count0; i++) {
    const entryOff = ifd0Off + 2 + i * 12;
    if (tiffStart + entryOff + 12 > end) break;
    const tag = g16(entryOff);
    if (tag === 0x8769) {
      const exifOff = g32(entryOff + 8);
      dateStr = readDateFromIFD(view, tiffStart, exifOff, g16, g32, end);
      if (dateStr) return parseExifDateStr(dateStr);
    }
  }

  return null;
}

function readDateFromIFD(
  view: DataView,
  tiffStart: number,
  ifdOff: number,
  g16: (o: number) => number,
  g32: (o: number) => number,
  end: number
): string | null {
  const count = g16(ifdOff);
  // DateTimeOriginal=0x9003, DateTimeDigitized=0x9004, DateTime=0x0132
  const dateTags = [0x9003, 0x9004, 0x0132];

  for (let i = 0; i < count; i++) {
    const entryOff = ifdOff + 2 + i * 12;
    if (tiffStart + entryOff + 12 > end) break;
    const tag = g16(entryOff);
    if (!dateTags.includes(tag)) continue;
    const dataLen = g32(entryOff + 4);
    const valOff = dataLen > 4 ? g32(entryOff + 8) : entryOff + 8;
    const absOff = tiffStart + valOff;
    if (absOff + 19 > end) continue;
    let str = "";
    for (let j = 0; j < 19; j++) str += String.fromCharCode(view.getUint8(absOff + j));
    return str;
  }
  return null;
}

function parseExifDateStr(s: string): Date | null {
  // "YYYY:MM:DD HH:MM:SS" → Date
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return isNaN(d.getTime()) ? null : d;
}
