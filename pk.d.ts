declare module "*.png" {
  const value: string;
  export default value;
}

declare module "react-copy-to-clipboard" {
  const CopyToClipboard: any;
  export { CopyToClipboard };
}

declare module "uid" {
  const uid: any;
  export { uid };
}
