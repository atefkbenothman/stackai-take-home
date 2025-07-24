import React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getKnowledgeBaseStatus } from "@/lib/api/knowledge-base"
import type { FileItem, KBResource } from "@/lib/types"

interface UseIndexingStatusProps {
  knowledgeBaseId: string | null
  selectedFiles: FileItem[]
  isActive: boolean
}

interface UseIndexingStatusReturn {
  isPolling: boolean
  allFilesCompleted: boolean
}

// Helper function to update file status in TanStack Query cache
function updateFileStatusInCache(
  queryClient: any,
  resourceId: string,
  status: "not-indexed" | "pending" | "indexing" | "indexed" | "error",
  error?: string,
) {
  // Update root files cache
  queryClient.setQueryData(["files"], (oldData: any) => {
    if (!oldData) return oldData
    
    return {
      ...oldData,
      files: oldData.files.map((file: FileItem) =>
        file.resource_id === resourceId
          ? { ...file, indexingStatus: status, indexingError: error }
          : file,
      ),
    }
  })

  // Update any folder-specific caches that might contain this file
  const queryCache = queryClient.getQueryCache()
  queryCache.getAll().forEach((query: any) => {
    if (query.queryKey[0] === "files" && query.queryKey[1]) {
      queryClient.setQueryData(query.queryKey, (oldData: any) => {
        if (!oldData) return oldData
        
        return {
          ...oldData,
          files: oldData.files.map((file: FileItem) =>
            file.resource_id === resourceId
              ? { ...file, indexingStatus: status, indexingError: error }
              : file,
          ),
        }
      })
    }
  })
}

// Map KB resource status to our IndexingStatus
function mapKBStatusToIndexingStatus(kbStatus?: string): "pending" | "indexing" | "indexed" | "error" {
  switch (kbStatus) {
    case "pending":
      return "pending"
    case "indexing":
      return "indexing"
    case "indexed":
      return "indexed"
    case "error":
      return "error"
    default:
      return "pending"
  }
}

export function useIndexingStatus({
  knowledgeBaseId,
  selectedFiles,
  isActive,
}: UseIndexingStatusProps): UseIndexingStatusReturn {
  const queryClient = useQueryClient()

  console.log('🔍 useIndexingStatus called:', {
    knowledgeBaseId,
    selectedFilesCount: selectedFiles.length,
    selectedFileIds: selectedFiles.map(f => f.resource_id),
    isActive,
  })

  const { data: kbStatusData, isLoading, error } = useQuery({
    queryKey: ['kb-status', knowledgeBaseId],
    queryFn: async () => {
      console.log('📡 Polling KB status for:', knowledgeBaseId)
      if (!knowledgeBaseId) return null
      
      try {
        const result = await getKnowledgeBaseStatus(knowledgeBaseId, "/")
        console.log('📡 KB Status API Response:', result)
        return result
      } catch (err) {
        console.error('📡 KB Status API Error:', err)
        throw err
      }
    },
    enabled: isActive && !!knowledgeBaseId,
    refetchInterval: 3000, // Poll every 3 seconds
    refetchIntervalInBackground: true, // Continue polling in background
    retry: 2,
  })

  if (error) {
    console.error('❌ Status polling query error:', error)
  }

  // Use useEffect to handle status updates when data changes
  React.useEffect(() => {
    console.log('🔄 Status update effect triggered:', {
      hasKBData: !!kbStatusData?.data,
      kbDataLength: kbStatusData?.data?.length,
      selectedFilesCount: selectedFiles.length,
    })

    if (!kbStatusData?.data) {
      console.log('⚠️ No KB status data available')
      return
    }

    console.log('📊 Raw KB Status Data:', kbStatusData.data)

    // Create a map of resource_id to status for quick lookup
    const statusMap = new Map<string, KBResource>()
    kbStatusData.data.forEach((kbResource: KBResource) => {
      statusMap.set(kbResource.resource_id, kbResource)
      console.log('📋 KB Resource:', {
        resource_id: kbResource.resource_id,
        status: kbResource.status,
        path: kbResource.inode_path?.path,
      })
    })

    console.log('🔗 Status Map:', Array.from(statusMap.entries()))
    console.log('📁 Selected Files:', selectedFiles.map(f => ({
      resource_id: f.resource_id,
      path: f.inode_path.path,
    })))

    // Update cache for each selected file based on KB status
    selectedFiles.forEach((file) => {
      const kbResource = statusMap.get(file.resource_id)
      
      console.log(`🔍 Looking up file ${file.resource_id}:`, {
        found: !!kbResource,
        kbStatus: kbResource?.status,
        filePath: file.inode_path.path,
      })
      
      if (kbResource?.status) {
        const indexingStatus = mapKBStatusToIndexingStatus(kbResource.status)
        console.log(`🔄 Updating cache for ${file.resource_id}:`, {
          from: kbResource.status,
          to: indexingStatus,
        })
        updateFileStatusInCache(queryClient, file.resource_id, indexingStatus)
      } else {
        console.log(`⚠️ No KB resource found for file ${file.resource_id}`)
      }
    })
  }, [kbStatusData, selectedFiles, queryClient])

  // Check if all files have reached a final state (indexed or error)
  const allFilesCompleted = selectedFiles.every((file) => {
    if (!kbStatusData?.data) return false
    
    const kbResource = kbStatusData.data.find((kb: KBResource) => kb.resource_id === file.resource_id)
    const isCompleted = kbResource?.status === "indexed" || kbResource?.status === "error"
    
    console.log(`✅ File completion check ${file.resource_id}:`, {
      found: !!kbResource,
      status: kbResource?.status,
      isCompleted,
    })
    
    return isCompleted
  })

  console.log('🏁 Final status:', {
    isPolling: isLoading && isActive,
    allFilesCompleted,
    isLoading,
    isActive,
  })

  return {
    isPolling: isLoading && isActive,
    allFilesCompleted,
  }
}