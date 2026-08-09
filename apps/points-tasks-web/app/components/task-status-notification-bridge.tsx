"use client";

import type { TaskDto } from "@ryvra/domain-tasks";
import { mapTaskStatusNotification, useNotificationCenter } from "@ryvra/ui";
import { useEffect } from "react";

interface TaskStatusNotificationBridgeProps {
  tasks: Pick<TaskDto, "taskId" | "taskStatus" | "progressState" | "progressPercent" | "updatedAt">[];
}

export function TaskStatusNotificationBridge({ tasks }: TaskStatusNotificationBridgeProps) {
  const { addNotification } = useNotificationCenter();

  useEffect(() => {
    tasks.forEach((task) => {
      const mapped = mapTaskStatusNotification({
        taskId: task.taskId,
        status: task.taskStatus,
        progressState: task.progressState,
        progressPercent: task.progressPercent,
        eventKey: `task:${task.taskId}:${task.taskStatus}:${task.progressState}:${task.progressPercent}:${task.updatedAt}`,
        timestamp: task.updatedAt,
        routeHref: `/tasks?task_status=${encodeURIComponent(task.taskStatus)}&ref=notification&entity=task`,
      });

      if (mapped) {
        addNotification(mapped);
      }
    });
  }, [addNotification, tasks]);

  return null;
}
