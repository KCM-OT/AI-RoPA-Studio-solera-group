'use client'

import { useRef, useState } from 'react'
import { FileText, TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { extensionOf, extractTextFromFile, isExtractable } from '@/lib/extract-text'

// Formats the picker accepts. The scannable ones lead; .doc/.pdf/.png are kept
// from the design's list but still need a parser this prototype doesn't have.
const ACCEPTED = ['.docx', '.rtf', '.txt', '.csv', '.md', '.json', '.doc', '.pdf', '.png']

const MAX_BYTES = 64 * 1024 * 1024

const KIND_BY_EXT: Record<string, string> = {
  '.csv': 'Spreadsheet',
  '.doc': 'Word document',
  '.docx': 'Word document',
  '.pdf': 'PDF document',
  '.png': 'Image',
  '.rtf': 'Rich text document',
  '.txt': 'Document',
  '.md': 'Document',
  '.json': 'Document',
}

export interface AttachedFile {
  name: string
  /** False when the format was accepted but its text could not be extracted. */
  extracted: boolean
}

export function FileDropZone({
  attached,
  error,
  onAttach,
  onError,
  onClear,
}: {
  attached: AttachedFile | null
  error: string | null
  onAttach: (file: { name: string; kind: string; text: string }) => void
  onError: (message: string) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file: File) {
    const ext = extensionOf(file.name)

    if (!ACCEPTED.includes(ext)) {
      onError(
        `${ext || 'That file type'} isn’t supported. Accepted formats: .docx, .rtf, .txt, .csv, .doc, .pdf, .png`,
      )
      return
    }
    if (file.size > MAX_BYTES) {
      onError(`“${file.name}” is larger than the 64MB limit.`)
      return
    }

    const kind = KIND_BY_EXT[ext] ?? 'Document'

    if (!isExtractable(file.name)) {
      // Attach it so the interaction is complete, but be explicit that the
      // prototype can't read its text rather than failing the scan silently.
      onAttach({ name: file.name, kind, text: '' })
      return
    }

    try {
      const text = await extractTextFromFile(file)
      if (text.trim().length < 20) {
        onError(`“${file.name}” doesn’t contain enough text to scan.`)
        return
      }
      onAttach({ name: file.name, kind, text })
    } catch {
      onError(`“${file.name}” could not be read. Try pasting its text instead.`)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    // The scan takes one source document at a time — use the first file dropped.
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  if (attached) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded border border-border bg-muted/40 p-3">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{attached.name}</span>
          <Button size="icon-sm" variant="ghost" aria-label="Remove file" onClick={onClear}>
            <X className="size-4" />
          </Button>
        </div>
        {!attached.extracted && (
          <p className="flex items-start gap-1.5 text-xs text-warning-foreground">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            This prototype can’t extract text from {extensionOf(attached.name)} files. Paste the
            document’s text above to scan it.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex min-h-[150px] flex-col items-center justify-center gap-2.5 rounded border border-dashed border-[#0066FF] p-[30px] text-center transition-colors',
          dragOver ? 'bg-[#EEF7FF]' : 'bg-background',
        )}
      >
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-medium leading-5 text-[#1a1a1a]">Drag &amp; Drop files here</p>
          <p className="text-[13px] leading-5 text-[#4d4d4d]">
            Accepted formats: .docx, .rtf, .txt, .csv, .doc, .pdf, .png (max 64MB)
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="border-[#2C6145] font-semibold text-[#2C6145] hover:bg-[#2C6145]/5 hover:text-[#2C6145]"
        >
          Select File
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            // Reset so re-selecting the same file still fires a change event.
            e.target.value = ''
          }}
        />
      </div>
      {error && (
        <p className="flex items-start gap-1.5 text-xs text-danger">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
