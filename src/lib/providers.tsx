
import { ReactNode } from "react";
import { ReactFlowProvider } from "@xyflow/react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ReactFlowProvider>
      {children}
    </ReactFlowProvider>
  );
}
