/// <reference types="vite-plugin-svgr/client" />

declare module 'address-rfc2822' {
  export interface Address {
    phrase?: string
    address?: string
    comment?: string
  }

  export function parse(input: string): Address[]
}
