declare const __dirname: string;
declare const process: { env: Record<string,string|undefined>; platform: string; exitCode?: number };
declare function require(path: string): any;
declare module 'bcryptjs' { const bcrypt: { hash(value:string, rounds:number):Promise<string>; compare(value:string, hash:string):Promise<boolean> }; export default bcrypt; }
