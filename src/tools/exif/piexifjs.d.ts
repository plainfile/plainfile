// Минимальная типизация piexifjs (CJS-пакет без bundled types).
// Заявляем только то, что использует EXIF-инструмент.
declare module "piexifjs" {
  export interface PiexifIfd {
    [tag: number]: unknown;
  }

  export interface PiexifDict {
    "0th": PiexifIfd;
    Exif: PiexifIfd;
    GPS: PiexifIfd;
    Interop: PiexifIfd;
    "1st": PiexifIfd;
    thumbnail: unknown;
  }

  const piexif: {
    remove(jpeg: string): string;
    insert(exif: string, jpeg: string): string;
    load(data: string): PiexifDict;
    dump(exifDict: PiexifDict): string;
  };

  export default piexif;
}
