import { Minus, Plus } from "lucide-react";
import { IconButton } from "./IconButton";

export function Stepper({
  onDecrement,
  onIncrement,
}: {
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <IconButton icon={Minus} label="Decrease sets" size="sm" onClick={onDecrement} />
      <IconButton icon={Plus} label="Increase sets" size="sm" onClick={onIncrement} />
    </div>
  );
}
