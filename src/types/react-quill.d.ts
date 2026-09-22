declare module 'react-quill' {
  import { Component } from 'react';
  
  interface ReactQuillProps {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string, delta: any, source: any, editor: any) => void;
    onChangeSelection?: (range: any, source: any, editor: any) => void;
    onFocus?: (range: any, source: any, editor: any) => void;
    onBlur?: (previousRange: any, source: any, editor: any) => void;
    onKeyPress?: (event: any) => void;
    onKeyDown?: (event: any) => void;
    onKeyUp?: (event: any) => void;
    placeholder?: string;
    readOnly?: boolean;
    modules?: any;
    formats?: string[];
    theme?: string;
    style?: React.CSSProperties;
    className?: string;
    id?: string;
    bounds?: string | HTMLElement;
    scrollingContainer?: string | HTMLElement;
    children?: React.ReactElement;
  }

  class ReactQuill extends Component<ReactQuillProps> {}
  
  export default ReactQuill;
}