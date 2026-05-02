"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";

interface PdfUploadProps {
  onFileSelect: (text: string) => void;
}

export default function PdfUpload({ onFileSelect }: PdfUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const mounted = useRef(true);
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      const f = acceptedFiles[0];
      if (!f) return;

      if (f.size > MAX_SIZE) {
        setError("File too large. Maximum size is 10MB.");
        return;
      }

      if (f.type !== "application/pdf") {
        setError("Please upload a PDF file.");
        return;
      }

      setFile(f);
      setLoading(true);

      try {
        const text = await extractTextFromPdf(f);
        if (!mounted.current) return;
        
        if (text.trim().length < 10) {
          setError(
            "Could not extract meaningful text from this PDF. The file may be image-based. Try pasting the syllabus text directly."
          );
          setLoading(false);
          return;
        }
        onFileSelect(text);
      } catch {
        if (!mounted.current) return;
        setError("Failed to read PDF. Try pasting the syllabus text directly.");
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div className="pdf-upload-container">
      <div
        {...getRootProps()}
        className={`pdf-dropzone ${isDragActive ? "active" : ""} ${file ? "has-file" : ""} ${error ? "has-error" : ""}`}
        role="button"
        aria-label="Upload PDF file"
        tabIndex={0}
      >
        <input {...getInputProps()} id="pdf-upload-input" />

        {loading ? (
          <div className="dropzone-content">
            <div className="upload-spinner" />
            <p className="dropzone-text">Reading PDF...</p>
          </div>
        ) : file && !error ? (
          <div className="dropzone-content">
            <div className="file-icon">📄</div>
            <p className="dropzone-filename">{file.name}</p>
            <p className="dropzone-size">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            <p className="dropzone-hint">Drop a new file to replace</p>
          </div>
        ) : (
          <div className="dropzone-content">
            <div className="upload-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="dropzone-text">
              {isDragActive
                ? "Drop your PDF here..."
                : "Drag & drop a PDF syllabus"}
            </p>
            <p className="dropzone-hint">or click to browse · Max 10MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="pdf-error" role="alert">
          <span>⚠️</span> {error}
        </div>
      )}
    </div>
  );
}

/**
 * Extract text from a PDF file using pdfjs-dist
 */
async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    
    // Set worker dynamically to avoid Next.js SSR issues
    // Using locally hosted worker file in /public to avoid CDN/CORS network failures
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    
    let fullText = "";
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
        
      fullText += pageText + "\n\n";
    }
    
    const cleanedText = fullText.trim();
    
    if (cleanedText.length < 10) {
      throw new Error("Extracted text is too short or empty.");
    }
    
    return cleanedText;
  } catch (error) {
    console.error("PDF Extraction Error:", error);
    throw new Error("Failed to read PDF. It might be image-based or corrupted.");
  }
}
