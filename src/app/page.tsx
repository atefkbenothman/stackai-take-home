import { FileTree } from "@/components/file-tree/file-tree"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <FileTree />
      </div>
    </div>
  )
}
