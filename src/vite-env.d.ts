/// <reference types="vite/client" />

declare module 'framer-motion' {
  import * as React from 'react';

  export interface MotionProps {
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
    variants?: any;
    whileHover?: any;
    whileTap?: any;
    whileInView?: any;
    layout?: boolean | string;
    layoutId?: string;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    onClick?: (event: React.MouseEvent<any>) => void;
    [key: string]: any;
  }

  export type MotionComponent<T extends keyof HTMLElementTagNameMap> = React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLElementTagNameMap[T]> & MotionProps
  >;

  export const motion: {
    [K in keyof HTMLElementTagNameMap]: MotionComponent<K>;
  } & {
    custom: <P extends object>(Component: React.ComponentType<P>) => React.ComponentType<P & MotionProps>;
  };

  export const AnimatePresence: React.FC<{
    children?: React.ReactNode;
    mode?: 'wait' | 'sync' | 'popLayout';
    initial?: boolean;
    onExitComplete?: () => void;
  }>;
}
