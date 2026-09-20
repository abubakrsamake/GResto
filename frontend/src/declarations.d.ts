declare module '*.tsx' {
  import React from 'react';
  const component: React.ComponentType<any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}