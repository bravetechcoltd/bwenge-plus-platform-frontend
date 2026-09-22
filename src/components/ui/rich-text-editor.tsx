"use client"
import dynamic from "next/dynamic"
import "react-quill-new/dist/quill.snow.css"
import { Card, CardContent } from "@/components/ui/card"

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, false] }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    ["blockquote", "code-block"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    [{ size: ["small", false, "large", "huge"] }],
    ["link"]
  ],
}

const formats = [
  "header",
  "bold",
  "color",
  "background", 
  "italic",
  "underline",
  "blockquote",
  "code-block",
  "list",   
  "align",
  "size",
  "link"
]

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function RichTextEditor({ 
  value, 
  onChange, 
  className, 
  placeholder = "Write something awesome...",
  disabled = false 
}: RichTextEditorProps) {
  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="rich-text-editor-wrapper">
          <ReactQuill
            theme="snow"
            value={value}
            onChange={onChange}
            modules={modules}
            formats={formats}
            placeholder={placeholder}
            readOnly={disabled}
            className="bg-background border-0"
          />
          <style jsx global>{`
            .rich-text-editor-wrapper .quill {
              border-radius: 0.5rem;
              overflow: hidden;
            }
            
            .rich-text-editor-wrapper .ql-toolbar {
              border: none;
              border-bottom: 1px solid hsl(var(--border));
              background: hsl(var(--muted) / 0.3);
              border-radius: 0.5rem 0.5rem 0 0;
              padding: 0.75rem;
            }
            
            .rich-text-editor-wrapper .ql-container {
              border: none;
              font-size: 0.95rem;
              font-family: inherit;
              min-height: 150px;
              max-height: none;
            }
            
            .rich-text-editor-wrapper .ql-editor {
              min-height: 150px;
              max-height: 500px;
              overflow-y: auto;
              padding: 1rem;
              line-height: 1.6;
            }
            
            .rich-text-editor-wrapper .ql-editor.ql-blank::before {
              font-style: normal;
              color: hsl(var(--muted-foreground));
              left: 1rem;
            }
            
            /* Toolbar button styles */
            .rich-text-editor-wrapper .ql-toolbar button {
              transition: all 0.2s ease;
            }
            
            .rich-text-editor-wrapper .ql-toolbar button:hover {
              background: hsl(var(--accent));
              border-radius: 0.25rem;
            }
            
            .rich-text-editor-wrapper .ql-toolbar button.ql-active {
              background: hsl(var(--accent));
              border-radius: 0.25rem;
              color: hsl(var(--accent-foreground));
            }
            
            /* Scrollbar styling */
            .rich-text-editor-wrapper .ql-editor::-webkit-scrollbar {
              width: 8px;
            }
            
            .rich-text-editor-wrapper .ql-editor::-webkit-scrollbar-track {
              background: hsl(var(--muted) / 0.3);
              border-radius: 4px;
            }
            
            .rich-text-editor-wrapper .ql-editor::-webkit-scrollbar-thumb {
              background: hsl(var(--muted-foreground) / 0.3);
              border-radius: 4px;
            }
            
            .rich-text-editor-wrapper .ql-editor::-webkit-scrollbar-thumb:hover {
              background: hsl(var(--muted-foreground) / 0.5);
            }
            
            /* Content styling */
            .rich-text-editor-wrapper .ql-editor p,
            .rich-text-editor-wrapper .ql-editor ol,
            .rich-text-editor-wrapper .ql-editor ul {
              margin-bottom: 0.75rem;
            }
            
            .rich-text-editor-wrapper .ql-editor h1,
            .rich-text-editor-wrapper .ql-editor h2,
            .rich-text-editor-wrapper .ql-editor h3,
            .rich-text-editor-wrapper .ql-editor h4,
            .rich-text-editor-wrapper .ql-editor h5 {
              margin-top: 1rem;
              margin-bottom: 0.5rem;
              font-weight: 600;
            }
            
            /* Disabled state */
            .rich-text-editor-wrapper .ql-container.ql-disabled .ql-editor {
              opacity: 0.6;
              cursor: not-allowed;
            }
          `}</style>
        </div>
      </CardContent>
    </Card>
  )
}