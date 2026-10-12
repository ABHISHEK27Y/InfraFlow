declare module "hcl2json" {
  export function parse(hcl: string): Promise<any>;
  export function parseSync(hcl: string): any;
}