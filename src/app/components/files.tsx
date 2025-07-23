"use client"

import { useFile } from "@/hooks/use-file"
import { FileTree } from "@/app/components/file-tree"

export default function Files() {
  const { data, error } = useFile()

  if (error) return <div>Error: {error.message}</div>

  return <div className="p-4">{data && <FileTree files={data.files} />}</div>
}
