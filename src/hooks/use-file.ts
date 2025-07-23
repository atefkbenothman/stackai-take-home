import { useQuery } from "@tanstack/react-query"
import { getFiles } from "@/lib/api/files"

export function useFile(folderId?: string) {
  return useQuery({
    queryKey: folderId ? ["files", folderId] : ["files"],
    queryFn: () => getFiles(folderId),
  })
}
