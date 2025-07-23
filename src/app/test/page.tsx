"use client"

import { useFile } from "@/hooks/use-file"

export default function TestFilesPage() {
  const { data, isLoading, error } = useFile()

  if (isLoading) return <div>Loading files...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Files Test</h1>

      {data && (
        <div>
          <p className="mb-4">
            Connection ID: {data.connection_id}
            <br />
            Org ID: {data.org_id}
            <br />
            Files Count: {data.files.length}
          </p>

          <div className="space-y-2">
            {data.files.map((file) => (
              <div key={file.resource_id} className="rounded border p-2">
                <span className="font-mono">
                  {file.inode_type === "directory" ? "📁" : "📄"}{" "}
                  {file.inode_path.path}
                </span>
                <br />
                <small className="text-gray-600">ID: {file.resource_id}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
