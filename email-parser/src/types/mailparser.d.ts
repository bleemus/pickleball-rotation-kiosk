declare module "mailparser" {
  export interface ParsedMail {
    subject?: string;
    text?: string;
    html?: string | false;
    from?: { value: { address: string; name: string }[] };
    to?: { value: { address: string; name: string }[] };
    date?: Date;
  }

  export function simpleParser(source: Buffer | string): Promise<ParsedMail>;
}
