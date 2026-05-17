declare const __DEV__: boolean;

declare module "*.frag" {
  const source: string;
  export default source;
}

declare module "*.vert" {
  const source: string;
  export default source;
}
