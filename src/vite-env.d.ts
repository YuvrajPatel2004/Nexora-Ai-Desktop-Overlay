/// <reference types="vite/client" />

declare module 'lucide-react' {
  import * as React from 'react';
  export interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    className?: string;
  }
  export type Icon = React.FC<IconProps>;

  export const Copy: Icon;
  export const Check: Icon;
  export const Sparkles: Icon;
  export const Crop: Icon;
  export const Mic: Icon;
  export const MicOff: Icon;
  export const Maximize2: Icon;
  export const ShieldCheck: Icon;
  export const Settings: Icon;
  export const Minus: Icon;
  export const X: Icon;
  export const Sliders: Icon;
  export const MousePointer: Icon;
  export const EyeOff: Icon;
  export const Tv: Icon;
  export const ChevronDown: Icon;
  export const Send: Icon;
  export const Trash2: Icon;
  export const Image: Icon;
  export const Zap: Icon;
  export const Cpu: Icon;
  export const Clock: Icon;
  export const Code2: Icon;
  export const HelpCircle: Icon;
  export const Volume2: Icon;
  export const Bot: Icon;
  export const ArrowRight: Icon;
  export const Radio: Icon;
  export const RotateCcw: Icon;
  export const FileCode: Icon;
  export const Layers: Icon;
  export const Bug: Icon;
  export const GraduationCap: Icon;
  export const Play: Icon;
  export const Pause: Icon;
  export const Key: Icon;
  export const Keyboard: Icon;
  export const Palette: Icon;
  export const ExternalLink: Icon;
  export const Lock: Icon;
  export const Globe: Icon;
  export const Terminal: Icon;
  export const BookOpen: Icon;
  export const Search: Icon;
  export const Star: Icon;
  export const ChevronRight: Icon;
  export const Brain: Icon;
}

interface Window {
  electronAPI?: any;
}
