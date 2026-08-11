import React from "react";
import { Badge } from "./badge";

function SuccessBadge({ children = "สำเร็จ" }) {
  return (
    <Badge 
      variant="outline" 
      className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900"
    >
      {children}
    </Badge>
  );
}

function PendingBadge({ children = "รอดำเนินการ" }) {
  return (
    <Badge 
      variant="outline" 
      className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900"
    >
      {children}
    </Badge>
  );
}

function FailBadge({ children = "ล้มเหลว" }) {
  return (
    <Badge 
      variant="outline" 
      className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
    >
      {children}
    </Badge>
  );
}

export { SuccessBadge, PendingBadge, FailBadge };