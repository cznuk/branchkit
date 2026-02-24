import React from "react";
import { cn } from "../lib/utils";

/**
 * Avatar color palette map
 * Maps color IDs to their corresponding Tailwind classes for light and dark modes
 */
export const AVATAR_COLORS = {
  emerald: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white",
  blue: "bg-[#1e90ff] text-white dark:bg-[#1a7feb] dark:text-white",
  purple: "bg-purple-600 text-white dark:bg-purple-500 dark:text-white",
  amber: "bg-amber-600 text-white dark:bg-amber-500 dark:text-white",
  indigo: "bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white",
  orange: "bg-[#FF6F00] text-white dark:bg-[#e66400] dark:text-white",
  green: "bg-[#34A853] text-white dark:bg-[#2d9549] dark:text-white",
  red: "bg-red-600 text-white dark:bg-red-500 dark:text-white",
  pink: "bg-pink-600 text-white dark:bg-pink-500 dark:text-white",
  teal: "bg-teal-600 text-white dark:bg-teal-500 dark:text-white",
  cyan: "bg-cyan-600 text-white dark:bg-cyan-500 dark:text-white",
  violet: "bg-violet-600 text-white dark:bg-violet-500 dark:text-white",
  rose: "bg-rose-600 text-white dark:bg-rose-500 dark:text-white",
  other: "bg-gray-600 text-white dark:bg-gray-500 dark:text-white",
  me: "bg-[hsl(150,60%,45%)] text-white dark:bg-[hsl(150,56%,37%)] dark:text-white",
} as const;

export type AvatarColorId = keyof typeof AVATAR_COLORS;

export interface Message {
  id: string;
  user: string;
  avatarColorId: AvatarColorId;
  text: React.ReactNode;
  time: string;
}

export interface ConversationProps {
  messages: Message[];
  hideAvatar?: boolean;
  initialDelay?: number;
}

export function Conversation({ messages, hideAvatar = false, initialDelay = 0 }: ConversationProps & { initialDelay?: number }) {
  return (
    <div
      className={cn(
        "rounded-xl border shadow-[inset_0_0_10px_1px_rgba(0,0,0,0.025)] w-full",
        "bg-stone-50 text-stone-950 border-stone-200 dark:bg-stone-800 dark:text-stone-50 dark:border-stone-800",
      )}
      style={{ fontFamily: "Lato, sans-serif" }}
    >
      <div className="flex flex-col p-2 w-full">
        {messages.map((msg, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : null;
          const isConsecutiveFromSameUser = previousMessage?.user === msg.user;
          const shouldShowAvatar = !hideAvatar && !isConsecutiveFromSameUser;

          return (
            <div
              key={msg.id}
              className={cn("flex gap-3 px-2 pt-2 pb-2 rounded-lg message-fade-in", isConsecutiveFromSameUser ? "pt-0" : "")}
              style={{ animationDelay: `${initialDelay + (index * 500)}ms` }}
            >
              {shouldShowAvatar ? (
                <div
                  className={cn(
                    "w-9 h-9 rounded-md shrink-0 flex items-center justify-center font-medium text-lg",
                    AVATAR_COLORS[msg.avatarColorId],
                  )}
                >
                  {msg.user[0]}
                </div>
              ) : (
                <div className="w-9 shrink-0" />
              )}
              <div className="flex-1 min-w-0 grid">
                {shouldShowAvatar && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-sm tracking-tight leading-none">{msg.user}</span>
                    {true && <span className="text-[11px] text-stone-600 dark:text-stone-400">
                      {msg.time}
                    </span>}
                  </div>    
                )}
                <div className="text-sm leading-relaxed text-stone-900 dark:text-stone-100">
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface FakeMessagesLayoutProps {
  hideAvatar?: boolean;
}

export type FakeMessagesLayoutConfig =
  | { layout: "single"; messages: Message[] }
  | {
      layout: "beforeAfter";
      beforeMessages: Message[];
      afterMessages: Message[];
      beforeLabel?: string;
      afterLabel?: string;
    };

export function FakeMessagesLayout(props: FakeMessagesLayoutProps & FakeMessagesLayoutConfig) {
  const { hideAvatar = false } = props;

  if (props.layout === "single") {
    return <Conversation messages={props.messages} hideAvatar={hideAvatar} />;
  }

  const beforeLabel = props.beforeLabel ?? "Before branchkit";
  const afterLabel = props.afterLabel ?? "After branchkit";

  return (
    <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] flex justify-center my-16 px-4">
      <div className="w-full max-w-[900px] flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">{beforeLabel}</div>
          <Conversation messages={props.beforeMessages} hideAvatar={hideAvatar} />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">{afterLabel}</div>
          <Conversation messages={props.afterMessages} hideAvatar={hideAvatar} initialDelay={2000} />
        </div>
      </div>
    </div>
  );
}
