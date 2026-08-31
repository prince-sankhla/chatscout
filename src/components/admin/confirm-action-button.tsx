"use client";

import type { ButtonHTMLAttributes } from "react";

type ConfirmActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  message: string;
};

export function ConfirmActionButton({ message, onClick, ...props }: ConfirmActionButtonProps) {
  return (
    <button
      {...props}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
