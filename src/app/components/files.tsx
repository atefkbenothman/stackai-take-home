"use client"

import { useFile } from "@/hooks/use-file"

export default function Files() {
  const { data, error } = useFile()

  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Files (Instant Load!)</h1>

      {data && (
        <div className="space-y-2">
          {data.files.map((file) => (
            <div key={file.resource_id} className="rounded border p-2">
              <span className="font-mono">
                {file.inode_type === "directory" ? "📁" : "📄"}{" "}
                {file.inode_path.path}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
