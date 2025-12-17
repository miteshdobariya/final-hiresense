import { Loader2 } from "lucide-react";

export default function Loader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] py-8">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
      <span className="text-base text-muted-foreground">{text}</span>
    </div>
  );
} 