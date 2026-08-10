export = wrap;
declare function wrap(str: string, options?: wrap.IOptions): string;
declare namespace wrap {
  interface IOptions {
    width?: number;
    indent?: string;
    newline?: string;
    escape?: (str: string) => string;
    trim?: boolean;
    cut?: boolean;
  }
}
